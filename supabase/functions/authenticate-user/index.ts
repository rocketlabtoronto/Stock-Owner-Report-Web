import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createCorsHeaders, createJsonResponder, parseBody } from "../_shared/http.ts";
import { decryptPassword } from "../_shared/encryption.ts";
import { computeSubscriptionExpiry } from "../_shared/subscription.ts";

// Business purpose: verify an email/password login against public.users on the
// server, using the service role key. public.users has RLS enabled with no
// policies and no anon/authenticated grants (see the lock_down_public_tables
// migration), so the browser can no longer read it directly.

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

const buildCorsHeaders = createCorsHeaders(ALLOWED_ORIGINS, {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

const INVALID_CREDENTIALS = { success: false, error: "Invalid email or password." };

serve(async (req: Request) => {
  const logger = createStructuredLogger("authenticate-user");
  const json = createJsonResponder({
    ...buildCorsHeaders(req),
    "Content-Type": "application/json",
  });

  logger.info("S0", "Receive login submission", {
    method: req.method,
    origin: req.headers.get("origin") ?? "",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const originHeader = req.headers.get("origin") ?? "";
  if (originHeader && !ALLOWED_ORIGINS.has(originHeader)) {
    logger.error("S1", "Block login from origin outside allowlist", { originHeader });
    return json(403, { error: "Origin not allowed" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    logger.error("S2", "Stop login because server config is incomplete", {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
    });
    return json(500, { error: "Missing server configuration" });
  }

  const body = await parseBody(req);
  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    logger.warn("S3", "Reject login because email or password is missing", {
      hasEmail: Boolean(email),
      hasPassword: Boolean(password),
    });
    return json(400, { error: "Missing email or password" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: "public" },
    auth: { persistSession: false },
  });

  logger.info("S4", "Look up user record for login attempt", { email });

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("email, phone, subscription_interval, last_payment_at, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (userError) {
    logger.error("S5", "User lookup failed during login", {
      email,
      message: userError.message,
    });
    return json(500, { error: "Login failed. Please try again." });
  }

  if (!userRow || !userRow.password_hash) {
    logger.warn("S6", "Reject login because no matching account was found", { email });
    return json(200, INVALID_CREDENTIALS);
  }

  let decryptedPassword = "";
  try {
    decryptedPassword = await decryptPassword(userRow.password_hash);
  } catch (error: unknown) {
    logger.error("S7", "Stored password hash could not be decrypted", {
      email,
      message: String((error as { message?: string })?.message ?? error),
    });
    return json(200, INVALID_CREDENTIALS);
  }

  if (decryptedPassword !== password) {
    logger.warn("S8", "Reject login because password did not match", { email });
    return json(200, INVALID_CREDENTIALS);
  }

  const expiry = computeSubscriptionExpiry(
    userRow.subscription_interval,
    userRow.last_payment_at
  );

  if (expiry && new Date() > expiry) {
    logger.warn("S9", "Reject login because subscription has expired", {
      email,
      expiry: expiry.toISOString(),
    });
    // The client formats expiresAt with toLocaleDateString using the viewer's own
    // locale/timezone, matching the message the prior client-side check produced.
    return json(200, {
      success: false,
      subscriptionExpired: true,
      expiresAt: expiry.toISOString(),
    });
  }

  logger.info("S10", "Login succeeded", { email });

  const { password_hash: _passwordHash, ...safeUser } = userRow;
  return json(200, { success: true, user: safeUser });
});
