import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function parseAllowedOrigins(): Set<string> {
  const defaults = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://www.stockownerreport.com",
  ];

  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s: string) => normalizeOrigin(s))
    .filter(Boolean);

  return new Set([...defaults, ...configured]);
}

const ALLOWED_ORIGINS = parseAllowedOrigins();

function buildCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const isAllowed = origin && ALLOWED_ORIGINS.has(origin);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (isAllowed) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

serve(async (req: Request) => {
  const logger = createStructuredLogger("set-password-with-token");

  logger.info("S0", "Receive password activation/reset submission", {
    method: req.method,
    origin: req.headers.get("origin") ?? "",
  });

  if (req.method === "OPTIONS") {
    logger.info("S1", "Handle browser preflight without changing account records");
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    logger.warn("S2", "Reject request that is not a password update submission", {
      expectedMethod: "POST",
      receivedMethod: req.method,
    });
    return json(req, 405, { error: "Method not allowed" });
  }

  const originHeader = req.headers.get("origin") ?? "";
  if (originHeader && !ALLOWED_ORIGINS.has(originHeader)) {
    logger.error("S3", "Block password update from origin outside allowlist", { originHeader });
    return json(req, 403, { error: "Origin not allowed" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    logger.error("S4", "Stop password update because server config is incomplete", {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
    });
    return json(req, 500, { error: "Missing server configuration" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let token = "";
  let passwordHash = "";
  try {
    const body = await req.json();
    token = String(body?.token ?? "").trim();
    passwordHash = String(body?.passwordHash ?? "").trim();
  } catch {
    logger.warn("S5", "Reject password update due to invalid payload JSON", {
      expectedFields: ["token", "passwordHash"],
    });
    return json(req, 400, { error: "Invalid request body" });
  }

  if (!token || !passwordHash) {
    logger.warn("S6", "Reject password update because required credentials are missing", {
      hasToken: Boolean(token),
      hasPasswordHash: Boolean(passwordHash),
    });
    return json(req, 400, { error: "Missing token or passwordHash" });
  }

  logger.info("S7", "Validate submitted token against password reset token store", {
    token,
  });

  const { data: tokenRow, error: tokenError } = await supabase
    .from("password_reset_tokens")
    .select("email, expires_at")
    .eq("token", token)
    .single();

  if (tokenError || !tokenRow) {
    logger.warn("S8", "Token validation failed because token was not found", {
      token,
      tokenError: tokenError?.message ?? null,
    });
    return json(req, 400, { error: "Token is invalid or expired" });
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    await supabase.from("password_reset_tokens").delete().eq("token", token);
    logger.warn("S9", "Token has expired; cleanup executed to prevent reuse", {
      email: tokenRow.email,
      token,
      expiresAt: tokenRow.expires_at,
    });
    return json(req, 400, { error: "Token is invalid or expired" });
  }

  logger.info("S10", "Apply new password hash to customer account", {
    email: tokenRow.email,
  });

  const { error: updateError } = await supabase
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("email", tokenRow.email);

  if (updateError) {
    logger.error("S11", "Failed to persist new password hash in user record", {
      email: tokenRow.email,
      updateError: updateError.message,
    });
    return json(req, 500, { error: "Could not update password" });
  }

  await supabase.from("password_reset_tokens").delete().eq("token", token);

  logger.info("S12", "Password update complete and token invalidated", {
    email: tokenRow.email,
    token,
  });

  return json(req, 200, { success: true });
});
