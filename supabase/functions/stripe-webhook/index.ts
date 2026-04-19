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

// Avoid dumping full email into logs; keep it useful but safer.
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return "***";
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

// Avoid dumping full URLs (tokens) into logs; log only host + path.
function safeUrlForLogs(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "(invalid-url)";
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
async function sendActivationEmail(to: string, interval: string) {

    const log = (step: string, message: string, meta?: Record<string, unknown>) => {
      if (meta) console.log(`${step} - ${message}`, meta);
      else console.log(`${step} - ${message}`);
    };

    const error = (
      step: string,
      message: string,
      meta?: Record<string, unknown>,
    ) => {
      if (meta) console.error(`${step} - ${message}`, meta);
      else console.error(`${step} - ${message}`);
    };
  
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
      error("Step 5", "Network error calling internal reset-link function", {
        message: String(e?.message ?? e),
      });
      throw e; // jump to catch so we get one consistent failure path
    });

    log("Step 5", "Internal function responded", {
      status: linkResp.status,
      ok: linkResp.ok,
    });

    const linkText = await linkResp.text().catch((e) => {
      error("Step 5", "Failed reading internal function response body", {
        message: String(e?.message ?? e),
      });
      throw e;
    });

    if (!linkResp.ok) {
      // Log full details server-side; do NOT send internal details to browser.
      error("Step 5", "Internal reset-link function returned non-OK", {
        status: linkResp.status,
        bodyPreview: linkText.slice(0, 300),
      });
    }

    // Step 6: Parse and validate reset URL
    log("Step 6", "Extracting reset URL from internal response");
    const activationUrl = extractResetUrl(linkText);

    if (!activationUrl || !isHttpUrl(activationUrl)) {
      error("Step 6", "Invalid activation URL returned", {
        activationUrlPreview: safeUrlForLogs(activationUrl),
        bodyPreview: linkText.slice(0, 300),
      });
    }

    log("Step 6", "Activation URL extracted", { url: safeUrlForLogs(activationUrl) });

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
  log("Step 6", "Activation URL with mode param ready", { url: safeUrlForLogs(activationUrlWithMode) });

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
    console.error("Postmark error:", to, msg);
    throw err;
  }
}

// -------------------- Main webhook handler (business logic) --------------------
async function processStripeEvent(event: any) {
  // Only act on successful invoice payments
  if (event?.type !== "invoice.payment_succeeded") return;

  const invoice = event?.data?.object;
  const emailRaw = invoice?.customer_email;
  const phoneRaw = invoice?.customer_phone;
  const lineDescription = invoice?.lines?.data?.[0]?.description;

  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  const phone = typeof phoneRaw === "string" && phoneRaw.trim() ? phoneRaw.trim() : null;

  if (!email) {
    console.error(event.type, "", 10, "No customer email on invoice.");
    return;
  }

  const interval = deriveIntervalFromDescription(lineDescription);

  // Only log as an error if we couldn't derive it (we can still proceed safely)
  if (interval === "missing") {
    console.error(
      "interval_missing:",
      event.type,
      email,
      11,
      `desc=${typeof lineDescription === "string" ? lineDescription : "missing"}; invoice.id=${invoice?.id ?? "missing"}; subscription=${invoice?.subscription ?? "none"}`
    );
  }

  // What we plan to write to the database (useful for troubleshooting)
  console.log("user_upsert_payload:", { email, phone, subscription_interval: interval });

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
      console.error("upsert_user_error:", email, error.message);
      throw error;
    }

    console.log("user_upsert_ok:", email, `user=${safeJson(data)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(event.type, email, 13, msg);
    throw err;
  }

  // Send activation email (non-fatal if email fails)
  try {
    await sendActivationEmail(email, interval);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(event.type, email, 16, msg);
  }
}

// -------------------- HTTP entry point --------------------
serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature header", { status: 400 });

  const body = await req.text();

  try {
    // Verify the signature so we only process real Stripe events
    const event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);

    await processStripeEvent(event);

    return new Response("ok", { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("webhook_error:", msg);
    // 400 tells Stripe the payload/signature was invalid (or we failed to process). Stripe may retry depending on status.
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }
});