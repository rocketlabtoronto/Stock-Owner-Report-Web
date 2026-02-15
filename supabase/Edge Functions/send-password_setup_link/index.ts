import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

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

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};
// --- Error Logging Service ---
const logWebhookError = async (eventType, email, step, errorMsg) =>
  fetch(`${SUPABASE_URL}/rest/v1/webhook_errors`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      event_type: eventType,
      email,
      timestamp: new Date().toISOString(),
      error_message: errorMsg,
      step,
    }),
  });

serve(async (req) => {
  const { email } = await req.json();
  if (!email) return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 });
  const token = uuidv4();
  const expires_at = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  await logWebhookError(
    "send-password_setup_link",
    email,
    0,
    `called. email: ${email}, token: ${token}, expires_at: ${expires_at}`
  );
  try {
    // Check if the email exists in the public.users table and if not then throw an error
    const headers = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };
    // Check if email exists in public.users
    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${email}`, {
      method: "GET",
      headers,
    });
    const userArr = userRes.ok ? await userRes.clone().json() : null;
    if (!userArr || !Array.isArray(userArr) || userArr.length === 0) {
      await logWebhookError(
        "send-password_setup_link UserNotFound",
        email,
        0,
        `No user found for email: ${email}`
      );
      return new Response(JSON.stringify({ error: "No user found for this email" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Check if password reset token already exists
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/password_reset_tokens?email=eq.${encodeURIComponent(email)}`,
      { method: "GET", headers }
    );
    const exists =
      checkRes.ok &&
      Array.isArray(await checkRes.clone().json()) &&
      (await checkRes.clone().json()).length > 0;
    let res, resText;
    if (exists) {
      // Update
      res = await fetch(
        `${SUPABASE_URL}/rest/v1/password_reset_tokens?email=eq.${encodeURIComponent(email)}`,
        { method: "PATCH", headers, body: JSON.stringify({ token, expires_at }) }
      );
      resText = await res.text();
      await logWebhookError(
        "send-password_setup_link Update",
        email,
        0,
        `Status: ${res.status}, Body: ${resText}`
      );
    } else {
      // Insert
      res = await fetch(`${SUPABASE_URL}/rest/v1/password_reset_tokens`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, token, expires_at }),
      });
      resText = await res.text();
      await logWebhookError(
        "send-password_setup_link Insert",
        email,
        0,
        `Status: ${res.status}, Body: ${resText}`
      );
    }
    if (!res.ok) throw new Error(resText);
    return new Response(`https://www.lookthroughprofits.com/set-password?token=${token}`, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    await logWebhookError("send-password_setup_link Error", email, 0, err.message);
    return new Response(JSON.stringify({ error: "Could not create password reset token" }), {
      status: 500,
    });
  }
});
