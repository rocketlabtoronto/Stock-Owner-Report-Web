import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3001",
  "http://localhost:3000",
  "https://www.stockownerreport.com",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // Always answer preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const origin = req.headers.get("origin") ?? "";
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(req, 403, { error: "Origin not allowed" });
  }

  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      return json(req, 500, {
        error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY",
      });
    }

    const body = await req.json().catch(() => null);
    const email = (body?.email ?? "").toString().trim();
    if (!email) return json(req, 400, { error: "Missing email" });

    const adminHeaders = {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    };

    // Get reset link from your other function
    const linkResp = await fetch(`${SUPABASE_URL}/functions/v1/send_password_setup_link`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ email }),
    });

    const linkText = await linkResp.text();
    let resetUrl = linkText.trim();
    try {
      const parsed = JSON.parse(linkText);
      if (parsed?.resetUrl) resetUrl = String(parsed.resetUrl);
    } catch {
      // plain text is fine
    }

    if (!linkResp.ok || !resetUrl) {
      return json(req, 500, { error: `Failed to get reset link`, details: linkText });
    }

    // Send via Resend HTTP API (NO resend SDK, NO mailparser)
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "howard@lookthroughprofits.com",
        to: email,
        subject: "Password Reset Request - Look Through Profits",
        html: `
          <div style="font-family: Arial, sans-serif; line-height:1.5">
            <h2>Password reset</h2>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetUrl}" target="_blank">Reset my password</a></p>
            <p>If you didn’t request this, ignore this email.</p>
          </div>
        `,
      }),
    });

    const resendText = await resendResp.text();
    if (!resendResp.ok) {
      return json(req, 500, { error: "Resend failed", details: resendText });
    }

    return json(req, 200, { success: true });
  } catch (err) {
    // Critical: return CORS even on crash
    return json(req, 500, { error: `Unhandled: ${err?.message ?? String(err)}` });
  }
});
