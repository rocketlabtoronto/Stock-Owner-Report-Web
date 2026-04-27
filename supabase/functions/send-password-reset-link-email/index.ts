import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createStructuredLogger } from "../_shared/logging.ts";

/**
 * Purpose:
 * Send a password setup/reset email to a user.
 *
 * Flow:
 * 1) Browser calls this function with { email }.
 * 2) This function calls an internal function to generate a one-time setup link.
 * 3) This function emails the link via Postmark.
 */

const APP_BASE_URL = Deno.env.get("APP_BASE_URL").replace(/\/$/, "");
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

serve(async (req: Request) => {
  const logger = createStructuredLogger("send-password-reset-link-email");

  // Try/catch over the entire handler (including preflight).
  try {
    logger.info("S0", "Receive request to generate and send password reset/setup email", {
      method: req.method,
      origin: req.headers.get("origin") ?? "",
    });

    // Step 0.1: Handle CORS preflight (browser requirement)
    if (req.method === "OPTIONS") {
      logger.info("S1", "Handle browser preflight without sending any email");
      return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
    }

    // Step 1: Block calls from unapproved websites
    const originHeader = req.headers.get("origin") ?? "";
    if (originHeader && !ALLOWED_ORIGINS.has(originHeader)) {
      logger.error("S2", "Reject reset-email request from unapproved web origin", {
        origin: originHeader,
      });
      return json(req, 403, { error: "Origin not allowed" });
    }
    logger.info("S3", "Origin validation passed for reset-email request", {
      origin: originHeader,
    });

    // Step 2: Enforce POST only
    if (req.method !== "POST") {
      logger.warn("S4", "Reject request with unsupported HTTP method", {
        expectedMethod: "POST",
        receivedMethod: req.method,
      });
      return json(req, 405, { error: "Method not allowed" });
    }
    logger.info("S5", "Method validation passed for reset-email workflow");

    // Step 3: Load required environment variables (do NOT log secret values)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const POSTMARK_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN") ?? "";
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL");

    logger.info("S6", "Validate dependencies for token generation and email delivery", {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
      hasPostmarkToken: Boolean(POSTMARK_TOKEN),
      fromEmail: FROM_EMAIL,
    });

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !POSTMARK_TOKEN) {
      logger.error("S7", "Stop workflow because required server configuration is missing", {
        hasSupabaseUrl: Boolean(SUPABASE_URL),
        hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
        hasPostmarkToken: Boolean(POSTMARK_TOKEN),
      });

      return json(req, 500, {
        error:
          "Server misconfiguration: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / POSTMARK_SERVER_TOKEN",
      });
    }

    // Step 4: Parse request body and validate email
    logger.info("S8", "Validate inbound customer email payload");
    const payload = (await req.json().catch((e: unknown) => {
      logger.warn("S9", "Reject request because JSON payload is invalid", {
        message: String((e as { message?: string })?.message ?? e),
      });
      return null;
    })) as { email?: unknown } | null;

    const email = String(payload?.email ?? "").trim();
    if (!email) {
      logger.warn("S10", "Reject request because email is missing", {
        hasEmail: Boolean(email),
      });
      return json(req, 400, { error: "Missing email" });
    }
    logger.info("S11", "Customer email validated for password reset delivery", { email });

    // Calling internal function to generate and retrieve tokenized url
    logger.info("S12", "Request tokenized password link from internal function", { email });

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
        body: JSON.stringify({ email }),
      },
    ).catch((e: unknown) => {
      logger.error("S13", "Internal token service call failed due to network/runtime issue", {
        message: String((e as { message?: string })?.message ?? e),
      });
      throw e; // jump to catch so we get one consistent failure path
    });

    logger.info("S14", "Internal token service responded", {
      status: linkResp.status,
      ok: linkResp.ok,
    });

    const linkText = await linkResp.text().catch((e: unknown) => {
      logger.error("S15", "Unable to read internal token response body", {
        message: String((e as { message?: string })?.message ?? e),
      });
      throw e;
    });

    if (!linkResp.ok) {
      logger.error("S16", "Internal token generation failed; cannot proceed to email delivery", {
        status: linkResp.status,
        bodyPreview: linkText.slice(0, 300),
      });
      return json(req, 500, { error: "Failed to generate password reset link" });
    }

    // Step 6: Parse and validate reset URL
    logger.info("S17", "Parse tokenized URL returned by internal token function", { email });
    const resetUrl = extractResetUrl(linkText);

    if (!resetUrl || !isHttpUrl(resetUrl)) {
      logger.error("S18", "Internal token response did not provide a valid reset URL", {
        resetUrl,
        bodyPreview: linkText.slice(0, 300),
      });
      return json(req, 500, { error: "Invalid reset link returned" });
    }

    logger.info("S19", "Valid reset URL prepared for outbound email", {
      email,
      url: resetUrl,
    });

    // Step 7: Send email via Postmark
    logger.info("S20", "Send password reset/setup email via Postmark", { to: email });

    const postmarkResp = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_TOKEN,
      },
body: JSON.stringify({
  From: FROM_EMAIL,
  To: email,
  Subject: "Action required: Set your Stock Owner Report password",
  HtmlBody: `
    <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111;">
      <p>Dear Customer,</p>

      <p>
        We received a request to create or reset the password for your Stock Owner Report account.
        To proceed, please use the secure link below:
      </p>

      <p>
        <a href="${resetUrl}" target="_blank" rel="noreferrer">Set your password</a>
      </p>

      <p>
        If you did not initiate this request, you may disregard this email. No changes will be made
        unless the link is used.
      </p>

      <p>Sincerely,<br/>Stock Owner Report Support</p>
    </div>
  `,
  TextBody:
    `Dear Customer,\n\n` +
    `We received a request to create or reset the password for your Stock Owner Report account.\n` +
    `To proceed, please use the secure link below:\n\n` +
    `${resetUrl}\n\n` +
    `If you did not initiate this request, you may disregard this email. No changes will be made unless the link is used.\n\n` +
    `Sincerely,\n` +
    `Stock Owner Report Support`,
  MessageStream: "outbound",
}),
    }).catch((e: unknown) => {
      logger.error("S21", "Postmark API call failed due to network/runtime issue", {
        message: String((e as { message?: string })?.message ?? e),
      });
      throw e;
    });

    logger.info("S22", "Postmark API responded to email send request", {
      status: postmarkResp.status,
      ok: postmarkResp.ok,
    });

    const postmarkText = await postmarkResp.text().catch((e: unknown) => {
      logger.error("S23", "Unable to read Postmark response payload", {
        message: String((e as { message?: string })?.message ?? e),
      });
      throw e;
    });

    if (!postmarkResp.ok) {
      logger.error("S24", "Postmark rejected email delivery request", {
        status: postmarkResp.status,
        bodyPreview: postmarkText.slice(0, 300),
      });
      return json(req, 500, { error: "Email delivery failed" });
    }

    // Step 8: Success
    logger.info("S25", "Reset email workflow completed successfully", {
      email,
    });
    return json(req, 200, { success: true });
  } catch (err: unknown) {
    // Catch-all failure (ensures we always return CORS-safe JSON)
    logger.error("S99", "Unhandled exception in reset-email workflow", {
      message: String((err as { message?: string })?.message ?? err),
      // stack can be useful; if undefined, it won’t show
      stack: (err as { stack?: string })?.stack,
    });

    return json(req, 500, { error: "Unhandled server error" });
  }
});
