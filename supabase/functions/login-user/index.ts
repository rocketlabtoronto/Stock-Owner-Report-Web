import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";
import { createStructuredLogger } from "../_shared/logging.ts";

serve(async (req: Request) => {
  const logger = createStructuredLogger("login-user");
  logger.info("S0", "Receive request to generate SnapTrade login redirect", {
    method: req.method,
    origin: req.headers.get("origin") ?? "",
  });

  // === ENVIRONMENT VARIABLES ===
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");

  // === HEADERS FOR SUPABASE REST API ===
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, content-profile, accept-profile",
    "Content-Type": "application/json",
  };

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: "dashboard" },
    auth: { persistSession: false },
  });

  /**
   * LoginUserStep: Enumerates steps for login-user Edge Function error logging.
   * 90s are reserved for login-user steps.
   */
  enum LoginUserStep {
    ENTRYPOINT = 90,
    MISSING_USERID = 91,
    ENV_CHECK = 92,
    FETCH_USER_SECRET = 93,
    PRE_REGISTER = 94,
    PRE_LOGIN = 95,
    POST_LOGIN = 96,
    SNAPTRADE_LOGIN_API = 97,
    MISSING_USERSECRET = 98,
  }

  // --- Error Logging Service ---
  const logWebhookError = async (
    eventType: string,
    email: string,
    step: number,
    errorMsg: string
  ) => {
    const headers = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/webhook_logs`, {
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

    if (!res.ok) {
      const text = await res.text();
      logger.error("S11", "Failed writing login diagnostic row to webhook_logs table", {
        status: res.status,
        body: text,
      });
    }
  };

  // === CALL LOGGING IMMEDIATELY ON ENTRY ===
  try {
    const url = new URL(req.url);
    await logWebhookError(
      "login-user",
      "unknown",
      LoginUserStep.ENTRYPOINT,
      `Method: ${req.method}, Path: ${url.pathname}`
    );
  } catch (e) {
    logger.error("S12", "Failed to write entrypoint diagnostic event", {
      error: e,
    });
  }

  // === HANDLE CORS ===
  if (req.method === "OPTIONS") {
    logger.info("S1", "Handle preflight request without customer authentication changes");
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  let userId = undefined;
  let userSecret = undefined;
  let redirectURI = undefined;
  let connectionPortalVersion: string | undefined = undefined;
  let broker: string | undefined = undefined;
  try {
    const body = await req.json();
    userId = body.userId;
    userSecret = body.userSecret;
    redirectURI = body.redirectURI;
    connectionPortalVersion = body.connectionPortalVersion;
    broker = body.broker;
  } catch (e) {
    logger.warn("S2", "Reject login request because payload JSON is invalid", {
      expectedFields: ["userId", "userSecret", "redirectURI", "connectionPortalVersion", "broker"],
    });
    // If parsing fails, log and return error
    await logWebhookError(
      "login-user",
      "unknown",
      LoginUserStep.MISSING_USERID,
      "Failed to parse JSON body or missing userId"
    );
    return new Response(JSON.stringify({ error: "Missing or invalid userId in request body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // === VALIDATE USER ID ===
  if (!userId) {
    logger.warn("S3", "Reject login request because user identifier is missing");
    await logWebhookError(
      "login-user",
      "unknown",
      LoginUserStep.MISSING_USERID,
      "userId not found in request body"
    );
    return new Response(JSON.stringify({ error: "Missing userId in request body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // === USERSECRET CHECK ===
  // Workflow #3 provides userSecret directly from transient registration.

  // === ENV CHECK ===
  const fallbackRedirectUri =
    Deno.env.get("SNAPTRADE_REDIRECT_URI") || "http://localhost:3000/snapTradeRedirect";
  if (!redirectURI) {
    redirectURI = fallbackRedirectUri;
  }

  logger.info("S4", "Resolved redirect URI policy for brokerage connection journey", {
    userId,
    redirectURI,
    usedFallbackRedirectUri: redirectURI === fallbackRedirectUri,
  });

  await logWebhookError(
    "login-user",
    userId,
    LoginUserStep.ENV_CHECK,
    `SNAPTRADE_CLIENT_ID: ${SNAPTRADE_CLIENT_ID}, SNAPTRADE_CONSUMER_KEY: ${SNAPTRADE_CONSUMER_KEY}, redirectURI: ${redirectURI}`
  );
  const snaptrade = new Snaptrade({
    clientId: SNAPTRADE_CLIENT_ID,
    consumerKey: SNAPTRADE_CONSUMER_KEY,
  });

  let secret = userSecret;
  if (!secret) {
    logger.info("S5", "Load stored SnapTrade secret because caller did not provide one", {
      userId,
    });
    const { data, error } = await supabase
      .from("users")
      .select("snapusersecret")
      .eq("email", userId)
      .single();

    if (error || !data?.snapusersecret) {
      logger.error("S6", "Cannot continue login flow because SnapTrade secret is unavailable", {
        userId,
        error: error?.message,
      });
      await logWebhookError(
        "login-user",
        userId,
        LoginUserStep.FETCH_USER_SECRET,
        error?.message || "User secret not found"
      );
      return new Response(JSON.stringify({ error: "User secret not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    secret = data.snapusersecret;
  }
  // Validate all required fields for SnapTrade login
  if (!userId || !secret) {
    logger.warn("S7", "Reject login flow because required SnapTrade credentials are missing", {
      hasUserId: Boolean(userId),
      hasUserSecret: Boolean(secret),
    });
    await logWebhookError(
      "login-user",
      userId || "unknown",
      LoginUserStep.SNAPTRADE_LOGIN_API,
      `Missing required login fields: userId: ${userId}, userSecret: ${secret}`
    );
    return new Response(
      JSON.stringify({
        error: `Missing required login fields. userId: ${userId}, userSecret: ${secret}`,
        status: 400,
      }),
      { status: 400, headers: corsHeaders }
    );
  }
  try {
    logger.info("S8", "Call SnapTrade login API to obtain brokerage connection link", {
      userId,
      redirectURI,
      connectionPortalVersion: connectionPortalVersion || "v4",
      broker,
    });
    await logWebhookError(
      "login-user",
      userId,
      LoginUserStep.PRE_LOGIN,
      "snaptrade.authentication.loginSnapTradeUser called"
    );

    const login = await snaptrade.authentication.loginSnapTradeUser({
      userId: userId,
      userSecret: secret,
      redirectURI,
      customRedirectUrl: redirectURI,
      connectionPortalVersion: connectionPortalVersion || "v4",
      broker: broker
    });

    let loginLink =
      login.data?.redirectURI ||
      (login.data as { redirectUri?: string })?.redirectUri ||
      (login.data as { redirectURL?: string })?.redirectURL ||
      (login.data as { link?: string })?.link;

    if (loginLink && redirectURI) {
      try {
        const url = new URL(loginLink);
        if (!url.searchParams.get("redirect_uri")) {
          url.searchParams.set("redirect_uri", redirectURI);
        }
        if (!url.searchParams.get("redirectURI")) {
          url.searchParams.set("redirectURI", redirectURI);
        }
        loginLink = url.toString();
      } catch {
        // If URL parsing fails, keep original loginLink
      }
    }

    await logWebhookError(
      "login-user",
      userId,
      LoginUserStep.POST_LOGIN,
      `loginLink=${loginLink || "missing"} | redirectURI=${redirectURI || "missing"}`
    );

    logger.info("S9", "SnapTrade login link generated and normalized for front-end redirect", {
      userId,
      loginLink,
      redirectURIUsed: redirectURI,
    });

    return new Response(
      JSON.stringify({
        ...login.data,
        redirectURI: loginLink || login.data?.redirectURI,
        redirectURIUsed: redirectURI,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    const msg = err?.response?.data || err?.message || "Unknown error";
    logger.error("S10", "SnapTrade login API failed; unable to produce redirect link", {
      userId,
      upstreamStatus: err?.response?.status,
      upstreamData: err?.response?.data,
      message: err?.message,
    });
    await logWebhookError(
      "login-user",
      userId,
      LoginUserStep.SNAPTRADE_LOGIN_API,
      typeof msg === "string" ? msg : JSON.stringify(msg)
    );

    return new Response(
      JSON.stringify({
        error: `Failed to get login link. userId: ${userId}, userSecret: ${secret}`,
        status: err?.response?.status || 500,
        snaptradeError: JSON.stringify(msg),
      }),
      {
        status: err?.response?.status || 500,
        headers: corsHeaders,
      }
    );
  }
});
