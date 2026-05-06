import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createStructuredLogger } from "../_shared/logging.ts";

// Business purpose: request a one-time reset link and send it to the customer by email.
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "").replace(/\/$/, "");
const ALLOWED_ORIGINS = new Set(APP_BASE_URL ? [APP_BASE_URL] : []);

const buildCorsHeaders = (req: Request): HeadersInit => {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
};

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });

const parseBody = async (req: Request) => {
  try {
    return await req.json();
  } catch {
    return null;
  }
};

const readTextSafe = async (res: Response) => {
  try {
    return await res.text();
  } catch {
    return "";
  }
};

const extractResetUrl = (raw: string): string => {
  try {
    const parsed = JSON.parse(raw);
    return String(parsed?.tokenizedUrl ?? parsed?.resetUrl ?? parsed?.url ?? "").trim();
  } catch {
    return raw.trim();
  }
};

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

serve(async (req: Request) => {
  const logger = createStructuredLogger("send-password-reset-link-email");
  logger.info("S0", "Receive request to send password reset email", {
    method: req.method,
    origin: req.headers.get("origin") ?? "",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
  }

  const originHeader = req.headers.get("origin") ?? "";
  if (originHeader && !ALLOWED_ORIGINS.has(originHeader)) {
    return json(req, 403, { error: "Origin not allowed" });
  }

  if (req.method !== "POST") {
    return json(req, 405, { error: "Method not allowed" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const POSTMARK_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN") ?? "";
  const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !POSTMARK_TOKEN || !FROM_EMAIL) {
    logger.error("S1", "Missing server configuration for password reset email", {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
      hasPostmarkToken: Boolean(POSTMARK_TOKEN),
      hasFromEmail: Boolean(FROM_EMAIL),
    });
    return json(req, 500, {
      error: "Server misconfiguration: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / POSTMARK_SERVER_TOKEN / FROM_EMAIL",
    });
  }

  const body = await parseBody(req);
  const email = String(body?.email ?? "").trim();
  if (!email) {
    return json(req, 400, { error: "Missing email" });
  }

  const adminHeaders: HeadersInit = {
    "Content-Type": "application/json",
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  };

  let tokenResp: Response;
  try {
    tokenResp = await fetch(`${SUPABASE_URL}/functions/v1/create-and-get-tokenized-url`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ email }),
    });
  } catch (error: unknown) {
    logger.error("S2", "Tokenized URL request network failure", {
      email,
      message: String((error as { message?: string })?.message ?? error),
    });
    return json(req, 500, { error: "Failed to generate password reset link" });
  }

  const tokenText = await readTextSafe(tokenResp);
  if (!tokenResp.ok) {
    logger.error("S3", "Tokenized URL request failed", {
      email,
      status: tokenResp.status,
      bodyPreview: tokenText.slice(0, 300),
    });
    return json(req, 500, { error: "Failed to generate password reset link" });
  }

  const resetUrl = extractResetUrl(tokenText);
  if (!resetUrl || !isHttpUrl(resetUrl)) {
    logger.error("S4", "Tokenized URL payload is invalid", {
      email,
      bodyPreview: tokenText.slice(0, 300),
    });
    return json(req, 500, { error: "Invalid reset link returned" });
  }

  let postmarkResp: Response;
  try {
    postmarkResp = await fetch("https://api.postmarkapp.com/email", {
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
    });
  } catch (error: unknown) {
    logger.error("S5", "Postmark request network failure", {
      email,
      message: String((error as { message?: string })?.message ?? error),
    });
    return json(req, 500, { error: "Email delivery failed" });
  }

  const postmarkText = await readTextSafe(postmarkResp);
  if (!postmarkResp.ok) {
    logger.error("S6", "Postmark rejected reset email request", {
      email,
      status: postmarkResp.status,
      bodyPreview: postmarkText.slice(0, 300),
    });
    return json(req, 500, { error: "Email delivery failed" });
  }

  return json(req, 200, { success: true });
});
