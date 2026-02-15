import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ✅ CORS (dev). Reflect origin to avoid local CORS failures.
const getCorsHeaders = (req?: Request) => {
  const origin = req?.headers?.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "false",
  };
};

// Minimal inline UUID v4 generator
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
}

const supabaseHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

// Helper to return JSON with CORS always applied
function json(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

// --- Error Logging Service ---
const logWebhookError = async (
  eventType: string,
  email: string | null,
  step: number,
  errorMsg: string,
) => {
  // best-effort logging; never throw from logging
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/webhook_errors`, {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify({
        event_type: eventType,
        email,
        timestamp: new Date().toISOString(),
        error_message: errorMsg,
        step,
      }),
    });
  } catch (_) {
    // swallow
  }
};

serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, req);
  }

  // ✅ Safe JSON parse
  let email: string | undefined;
  try {
    const body = await req.json();
    email = body?.email;
  } catch {
    return json({ error: "Invalid JSON" }, 400, req);
  }

  if (!email) return json({ error: "Missing email" }, 400, req);

  const token = uuidv4();
  const expires_at = new Date(Date.now() + 1000 * 60 * 30).toISOString();

  await logWebhookError(
    "send-password_setup_link",
    email,
    0,
    `called. email: ${email}, token: ${token}, expires_at: ${expires_at}`,
  );

  try {
    // 1) Check if email exists in public.users
    const userRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}`,
      { method: "GET", headers: supabaseHeaders },
    );

    const userArr = userRes.ok ? await userRes.json() : null;

    if (!userArr || !Array.isArray(userArr) || userArr.length === 0) {
      await logWebhookError(
        "send-password_setup_link UserNotFound",
        email,
        1,
        `No user found for email: ${email}`,
      );
      // ✅ Return with CORS
      return json({ error: "No user found for this email" }, 404, req);
    }

    // 2) Check if token already exists
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/password_reset_tokens?email=eq.${encodeURIComponent(email)}`,
      { method: "GET", headers: supabaseHeaders },
    );

    const existing = checkRes.ok ? await checkRes.json() : [];
    const exists = Array.isArray(existing) && existing.length > 0;

    let res: Response;
    let resText = "";

    if (exists) {
      // Update
      res = await fetch(
        `${SUPABASE_URL}/rest/v1/password_reset_tokens?email=eq.${encodeURIComponent(email)}`,
        {
          method: "PATCH",
          headers: supabaseHeaders,
          body: JSON.stringify({ token, expires_at }),
        },
      );
      resText = await res.text();
      await logWebhookError(
        "send-password_setup_link Update",
        email,
        2,
        `Status: ${res.status}, Body: ${resText}`,
      );
    } else {
      // Insert
      res = await fetch(`${SUPABASE_URL}/rest/v1/password_reset_tokens`, {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify({ email, token, expires_at }),
      });
      resText = await res.text();
      await logWebhookError(
        "send-password_setup_link Insert",
        email,
        2,
        `Status: ${res.status}, Body: ${resText}`,
      );
    }

    if (!res.ok) throw new Error(resText || `HTTP ${res.status}`);

    // ✅ Return the link with CORS (text/plain still needs CORS)
    return new Response(
      `https://www.lookthroughprofits.com/set-password?token=${token}`,
      {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "text/plain" },
      },
    );
  } catch (err) {
    await logWebhookError(
      "send-password_setup_link Error",
      email,
      999,
      err instanceof Error ? err.message : String(err),
    );
    // ✅ Return with CORS
    return json({ error: "Could not create password reset token" }, 500, req);
  }
});
