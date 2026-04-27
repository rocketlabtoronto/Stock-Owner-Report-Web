/**
 * Stripe → Supabase Webhook (Edge Function)
 *
 * Business workflow (plain English):
 * 1) Stripe sends us a webhook when an invoice payment succeeds.
 * 2) We verify the webhook signature so we only trust messages from Stripe.
 * 3) We read the invoice to get: customer email, phone (if present), and the plan interval (month/year/etc.).
 * 4) We UPSERT (insert-or-update) a row in `public.users` keyed by email:
 *      - If the email is new → insert a new user row.
 *      - If the email already exists → update phone/interval + last payment timestamp.
 * 5) We send the customer an activation email with an activation link.
 *
 * Notes:
 * - Stripe may deliver the same webhook more than once (retries). The UPSERT keeps the database safe.
 * - Email sending can still duplicate on retries; if that matters, store processed Stripe event IDs.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";

// -------------------- Config (set as Supabase Edge Function Secrets) --------------------
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_DB_SCHEMA = Deno.env.get("SUPABASE_DB_SCHEMA") ?? "public";
const POSTMARK_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN") ?? "";
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
const APP_BASE_URL = Deno.env.get("APP_BASE_URL").replace(/\/$/, "");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL");
// If you call this from the browser, CORS is required.
const ALLOWED_ORIGINS = new Set(APP_BASE_URL ? [APP_BASE_URL] : []);

function buildCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const isAllowed = origin && ALLOWED_ORIGINS.has(origin);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (isAllowed) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

// The internal function may return JSON { tokenizedUrl: "..." } or plain text "..."
function extractResetUrl(raw: string): string {
  try {
    const parsed = JSON.parse(raw);

    // Support the actual response shape you're getting:
    const candidate =
      parsed?.tokenizedUrl ??
      parsed?.resetUrl ??
      parsed?.url;

    if (candidate) return String(candidate).trim();

    // It was JSON, but not the expected shape
    return "";
  } catch {
    // Not JSON (plain text URL)
    return raw.trim();
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}




// -------------------- Small utilities --------------------
function safeJson(v: unknown) {
  try {
    return JSON.stringify(v);
  } catch {
    return "[unstringifiable]";
  }
}

/**
 * Stripe line item descriptions include words like "Monthly", and sometimes "(... / month)".
 * Example: "1 × Owner’s Stock Report — Monthly (at $29.00 / month)"
 *
 * We normalize to: "day" | "week" | "month" | "quarter" | "year" (or "missing" if we can't determine).
 */
function deriveIntervalFromDescription(description: unknown): string {
  if (typeof description !== "string" || !description.trim()) return "missing";

  const labelMatch = description.match(/[–—-]\s*(monthly|annual|yearly|weekly|quarterly|daily)\b/i);
  const label = labelMatch?.[1]?.toLowerCase();

  if (label === "monthly") return "month";
  if (label === "annual" || label === "yearly") return "year";
  if (label === "weekly") return "week";
  if (label === "quarterly") return "quarter";
  if (label === "daily") return "day";

  const slashMatch = description.match(/\/\s*(day|week|month|year)\b/i);
  const unit = slashMatch?.[1]?.toLowerCase();

  return unit ?? "missing";
}

// -------------------- Email (Activation) --------------------
async function sendActivationEmail(
  logger: ReturnType<typeof createStructuredLogger>,
  to: string,
  interval: string,
) {
  
    const adminHeaders: HeadersInit = {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    };

    const linkResp = await fetch(
    `${SUPABASE_URL}/functions/v1/create-and-get-tokenized-url`,
    {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ email: to })
    },
    ).catch((e) => {
      logger.error("S20", "Token link generation call failed due to network/runtime issue", {
        message: String(e?.message ?? e),
      });
      throw e; // jump to catch so we get one consistent failure path
    });

    logger.info("S21", "Token link service responded", {
      status: linkResp.status,
      ok: linkResp.ok,
    });

    const linkText = await linkResp.text().catch((e) => {
      logger.error("S22", "Failed reading token link service response body", {
        message: String(e?.message ?? e),
      });
      throw e;
    });

    if (!linkResp.ok) {
      logger.error("S23", "Token link service returned failure status", {
        status: linkResp.status,
        bodyPreview: linkText.slice(0, 300),
      });
    }

    // Step 6: Parse and validate reset URL
    logger.info("S24", "Parse activation URL returned by token link service", { to });
    const activationUrl = extractResetUrl(linkText);

    if (!activationUrl || !isHttpUrl(activationUrl)) {
      logger.error("S25", "Activation URL from token link service is invalid", {
        activationUrl,
        bodyPreview: linkText.slice(0, 300),
      });
    }

    logger.info("S26", "Activation URL extracted for subscription onboarding email", {
      to,
      activationUrl,
    });

  // Append mode=activation so the set-password page can distinguish a first-time
  // account activation from a subsequent password reset. The set-password page reads
  // this query parameter and renders appropriate verbiage to the user.
  let activationUrlWithMode = activationUrl;
  try {
    const urlObj = new URL(activationUrl);
    urlObj.searchParams.set("mode", "activation");
    activationUrlWithMode = urlObj.toString();
  } catch {
    // If URL parsing fails, fall back to simple string append. We check for an
    // existing '?' to avoid malforming the URL.
    activationUrlWithMode = activationUrl.includes("?")
      ? `${activationUrl}&mode=activation`
      : `${activationUrl}?mode=activation`;
  }
  logger.info("S27", "Activation URL annotated with onboarding mode parameter", {
    to,
    activationUrlWithMode,
  });

  const safeInterval = (typeof interval === "string" && interval.trim() ? interval.trim() : "selected").toLowerCase();
  const subject = "Activate your subscription — The Stock Owner Report";

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
    <style>
      body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; background:#f5f8fa; margin:0; padding:0; color:#1f2937; }
      .container { max-width:600px; margin:40px auto; background:#fff; border-radius:10px; box-shadow:0 6px 18px rgba(0,0,0,0.06); padding:36px; }
      .brand { font-size:14px; letter-spacing:.02em; color:#6b7280; margin-bottom:10px; }
      h1 { font-size:22px; margin:0 0 12px 0; color:#111827; }
      p { font-size:15px; line-height:1.6; margin:14px 0; }
      .button { display:inline-block; padding:12px 18px; background:#1a73e8; color:#fff !important; text-decoration:none; font-weight:600; border-radius:8px; }
      .muted { color:#6b7280; font-size:13px; }
      .footer { border-top:1px solid #eef2f7; margin-top:22px; padding-top:16px; color:#6b7280; font-size:12.5px; line-height:1.5; }
      code { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size:12.5px; background:#f3f4f6; padding:2px 6px; border-radius:6px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="brand">The Stock Owner Report</div>
      <h1>Confirm your email to activate your subscription</h1>
      <p>Hi,</p>
      <p>We received your payment for the <strong>${safeInterval}</strong> plan. To finish setting up your account, please confirm your email:</p>
      <p><a class="button" href="${activationUrlWithMode}" target="_blank" rel="noopener noreferrer">Activate Subscription</a></p>
      <p class="muted">If the button doesn't work, copy and paste this link into your browser:<br /><code>${activationUrlWithMode}</code></p>
      <p>Regards,<br /><strong>Howard Lin</strong><br />Founder, The Stock Owner Report</p>
      <div class="footer">You’re receiving this email because a subscription was started using this address. If you did not request this, you can safely ignore this message.</div>
    </div>
  </body>
</html>`;

  try {

  if (!to || !subject || !html) {
    return new Response("Missing to/subject/html", { status: 400 });
  }

  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": POSTMARK_TOKEN,
    },
    body: JSON.stringify({
      From: FROM_EMAIL,
      To: to,
      Subject: subject,
      HtmlBody: html,
      MessageStream: "outbound",
    }),
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("S28", "Activation email delivery failed in Postmark call", {
      to,
      message: msg,
    });
    throw err;
  }
}

// -------------------- Main webhook handler (business logic) --------------------
async function processStripeEvent(
  logger: ReturnType<typeof createStructuredLogger>,
  event: any,
) {
  // Only act on successful invoice payments
  if (event?.type !== "invoice.payment_succeeded") {
    logger.info("S10", "Ignore non-payment Stripe event because it does not change subscriber access", {
      eventType: event?.type,
    });
    return;
  }

  const invoice = event?.data?.object;
  const emailRaw = invoice?.customer_email;
  const phoneRaw = invoice?.customer_phone;
  const lineDescription = invoice?.lines?.data?.[0]?.description;

  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  const phone = typeof phoneRaw === "string" && phoneRaw.trim() ? phoneRaw.trim() : null;

  if (!email) {
    logger.error("S11", "Cannot onboard subscriber because invoice has no customer email", {
      eventType: event.type,
      invoiceId: invoice?.id,
    });
    return;
  }

  const interval = deriveIntervalFromDescription(lineDescription);

  // Only log as an error if we couldn't derive it (we can still proceed safely)
  if (interval === "missing") {
    logger.warn("S12", "Subscription interval could not be inferred from Stripe description", {
      eventType: event.type,
      email,
      description: typeof lineDescription === "string" ? lineDescription : "missing",
      invoiceId: invoice?.id ?? "missing",
      subscriptionId: invoice?.subscription ?? "none",
    });
  }

  logger.info("S13", "Prepare customer subscription payload for users table upsert", {
    email,
    phone,
    subscriptionInterval: interval,
  });

  // Insert or update the user record in Supabase
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      db: { schema: SUPABASE_DB_SCHEMA }, // default "public"
      auth: { persistSession: false },
    });

    const payload = {
      email,
      phone,
      subscription_interval: interval === "missing" ? null : interval,
      last_payment_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "email" }) // requires a UNIQUE constraint on email for best results
      .select()
      .single();

    if (error) {
      logger.error("S14", "Users table upsert failed; cannot finalize payment onboarding", {
        email,
        error: error.message,
      });
      throw error;
    }

    logger.info("S15", "Users table upsert succeeded after successful payment", {
      email,
      userRow: safeJson(data),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("S16", "Customer onboarding database step failed after payment webhook", {
      eventType: event.type,
      email,
      message: msg,
    });
    throw err;
  }

  // Send activation email (non-fatal if email fails)
  try {
    logger.info("S17", "Trigger activation email so subscriber can set account password", {
      email,
      interval,
    });
    await sendActivationEmail(logger, email, interval);
    logger.info("S18", "Activation email workflow completed", {
      email,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("S19", "Activation email workflow failed after successful payment upsert", {
      eventType: event.type,
      email,
      message: msg,
    });
  }
}

// -------------------- HTTP entry point --------------------
serve(async (req: Request) => {
  const logger = createStructuredLogger("stripe-webhook");
  logger.info("S0", "Receive Stripe webhook request for subscription billing workflow", {
    method: req.method,
    hasStripeSignature: Boolean(req.headers.get("stripe-signature")),
  });

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    logger.error("S1", "Reject webhook because Stripe signature header is missing", {
      headerName: "stripe-signature",
    });
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();

  try {
    // Verify the signature so we only process real Stripe events
    const event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
    logger.info("S2", "Stripe webhook signature verified; proceeding with business event processing", {
      eventType: event?.type,
      eventId: event?.id,
    });

    await processStripeEvent(logger, event);

    logger.info("S3", "Stripe webhook processing completed successfully", {
      eventType: event?.type,
      eventId: event?.id,
    });
    return new Response("ok", { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("S99", "Stripe webhook processing failed", {
      message: msg,
    });
    // 400 tells Stripe the payload/signature was invalid (or we failed to process). Stripe may retry depending on status.
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }
});