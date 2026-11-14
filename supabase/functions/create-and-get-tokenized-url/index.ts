import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createCorsHeaders, createJsonResponder, parseBody } from "../_shared/http.ts";

// Business purpose: issue a time-limited tokenized URL used by password setup/reset email workflows.
const TOKEN_EXPIRY_MINUTES = 24 * 60;
const SET_PASSWORD_PATH = "/set-password";
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "").replace(/\/$/, "");
const ALLOWED_ORIGINS = new Set(APP_BASE_URL ? [APP_BASE_URL] : []);

const buildCorsHeaders = createCorsHeaders(ALLOWED_ORIGINS, undefined, "");

serve(async (req: Request) => {
  const logger = createStructuredLogger("create-and-get-tokenized-url");
  const json = createJsonResponder({
    ...buildCorsHeaders(req),
    "Content-Type": "application/json",
  });
  logger.info("S0", "Receive request to create password tokenized URL", {
    method: req.method,
    origin: req.headers.get("origin") ?? "",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const POSTMARK_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN") ?? "";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !POSTMARK_TOKEN) {
    logger.error("S1", "Missing server configuration for token generation", {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
      hasPostmarkToken: Boolean(POSTMARK_TOKEN),
    });
    return json(500, {
      error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / POSTMARK_SERVER_TOKEN",
    });
  }

  if (!APP_BASE_URL) {
    logger.error("S2", "APP_BASE_URL is required to build customer reset links");
    return json(500, { error: "Missing APP_BASE_URL" });
  }

  const body = await parseBody(req);
  const email = String(body?.email ?? "").trim();
  if (!email) {
    return json(400, { error: "Missing email" });
  }

  const token = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const expires_at = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { error: upsertError } = await supabase
    .from("password_reset_tokens")
    .upsert({ email, token, expires_at }, { onConflict: "email" });

  if (upsertError) {
    logger.error("S3", "Failed to store password reset token", {
      email,
      message: upsertError.message,
    });
    return json(500, { error: "Could not save token" });
  }

  const tokenizedUrl = `${APP_BASE_URL}${SET_PASSWORD_PATH}?token=${encodeURIComponent(token)}`;
  return json(200, { success: true, tokenizedUrl });
});
