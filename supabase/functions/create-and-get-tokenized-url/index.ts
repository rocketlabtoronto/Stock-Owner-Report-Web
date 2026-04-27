// Supabase Edge Function: CreateAndGetTokenizedURL
// ------------------------------------------------
// Business purpose:
// Create a short-lived token for a user email, store it, and email the user a link
// that includes the token (a "tokenized URL") so they can set/reset their password.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";

// One day (24 hours multipled by 60 minutes)
const TOKEN_EXPIRY_MINUTES = 24 * 60;

const APP_BASE_URL = Deno.env.get("APP_BASE_URL").replace(/\/$/, "");
// If you call this from the browser, CORS is required.
const ALLOWED_ORIGINS = new Set(APP_BASE_URL ? [APP_BASE_URL] : []);

function buildCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  // BA note: Only allow your known front-end sites.
  // If origin is not allowed, we simply don't set Allow-Origin and the browser blocks it.
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function inferRequestChannel(req: Request): string {
  const origin = (req.headers.get("origin") ?? "").toLowerCase();
  if (!origin) return "internal-service";
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) return "local-development";
  if (origin.includes("stockownerreport.com")) return "production-web";
  return "external-web";
}

serve(async (req: Request) => {
  const logger = createStructuredLogger("create-and-get-tokenized-url");

  try {
    const origin = req.headers.get("origin") ?? "";
    logger.info("S0", "Receive request to issue a password setup/reset token link", {
      channel: inferRequestChannel(req),
      method: req.method,
      originAllowed: !origin || ALLOWED_ORIGINS.has(origin),
    });

    // Step 1: Handle browser CORS preflight
    if (req.method === "OPTIONS") {
      logger.info("S1", "Handle browser preflight without changing customer records", {
        channel: inferRequestChannel(req),
      });
      return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
    }

    // Step 2: Enforce POST only
    if (req.method !== "POST") {
      logger.warn("S2", "Reject request that is not a token generation submission", {
        expectedMethod: "POST",
        receivedMethod: req.method,
      });
      return json(req, 405, { error: "Method not allowed" });
    }
    logger.info("S3", "Request accepted for token generation workflow", {
      requestType: "create-tokenized-password-link",
    });

    // Step 3: Load configuration (secrets come from environment variables)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const POSTMARK_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN") ?? "";

    // Where the user lands in your front-end
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL").replace(/\/$/, "");
    const SET_PASSWORD_PATH = "/set-password";
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL");

    logger.info("S4", "Validate required integrations before token generation", {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
      hasPostmarkToken: Boolean(POSTMARK_TOKEN),
      hasAppBaseUrl: Boolean(APP_BASE_URL),
      hasFromEmail: Boolean(FROM_EMAIL),
    });

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !POSTMARK_TOKEN) {
      logger.error("S5", "Stop workflow because server configuration is incomplete", {
        hasSupabaseUrl: Boolean(SUPABASE_URL),
        hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
        hasPostmarkToken: Boolean(POSTMARK_TOKEN),
      });
      return json(req, 500, {
        error:
          "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / POSTMARK_SERVER_TOKEN",
      });
    }

    logger.info("S6", "Validate customer identifier payload for link issuance");
    const body = (await req.json().catch((e: unknown) => {
      logger.warn("S7", "Reject request because payload JSON is invalid", {
        message: String((e as { message?: string })?.message ?? e),
      });
      return null;
    })) as { email?: unknown } | null;

    const email = String(body?.email ?? "").trim();
    if (!email) {
      logger.warn("S8", "Reject request because customer email is missing", {
        hasEmail: Boolean(email),
      });
      return json(req, 400, { error: "Missing email" });
    }
    logger.info("S9", "Customer identifier validated for token issuance", {
      customer: email,
      emailDomain: email.includes("@") ? email.split("@")[1] : "unknown",
    });

    logger.info("S10", "Generate one-time token and expiry policy for account setup", {
      tokenValidityPolicyMinutes: TOKEN_EXPIRY_MINUTES,
    });
    const token = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const expires_at = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString(); // 1 day
    logger.info("S11", "Token generated for customer link", {
      token,
      expires_at,
    });

    logger.info("S12", "Persist token in password_reset_tokens table", {
      customer: email,
      persistenceMode: "upsert-by-email",
    });
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // IMPORTANT: This is simplest if password_reset_tokens.email is UNIQUE.
    const existingTokenRes = await supabase
      .from("password_reset_tokens")
      .select("expires_at")
      .eq("email", email)
      .maybeSingle();

    const hadExistingToken = Boolean(existingTokenRes.data);
    if (existingTokenRes.error && existingTokenRes.error.code !== "PGRST116") {
      logger.warn("S13", "Could not read prior token state; continue with upsert fallback", {
        message: existingTokenRes.error.message,
        customer: email,
      });
    }

    const upsertRes = await supabase
      .from("password_reset_tokens")
      .upsert({ email, token, expires_at }, { onConflict: "email" });

    if (upsertRes.error) {
      logger.error("S14", "Token persistence failed; cannot issue link", {
        customer: email,
        message: upsertRes.error.message,
      });
      return json(req, 500, { error: "Could not save token" });
    }
    logger.info("S15", "Token record stored successfully", {
      customer: email,
      tokenLifecycle: hadExistingToken ? "replaced-existing-token" : "created-new-token",
      expiresAtUtc: expires_at,
    });

    logger.info("S16", "Construct customer-facing password setup URL with token parameter", {
      customer: email,
    });
    const tokenizedUrl = `${APP_BASE_URL}${SET_PASSWORD_PATH}?token=${encodeURIComponent(token)}`;
    logger.info("S17", "Password setup URL generated", {
      customer: email,
      destinationPath: SET_PASSWORD_PATH,
      tokenizedUrl,
    });

    logger.info("S18", "Return tokenized URL so downstream email workflow can notify customer", {
      customer: email,
      nextBusinessAction: "email service sends activation/reset message",
    });
    return json(req, 200, { success: true, tokenizedUrl });
  } catch (e: unknown) {
    logger.error("S99", "Unhandled exception during token generation workflow", {
      message: String((e as { message?: string })?.message ?? e),
      stack: (e as { stack?: string })?.stack,
    });
    return json(req, 500, { error: "Unhandled server error" });
  }
});
