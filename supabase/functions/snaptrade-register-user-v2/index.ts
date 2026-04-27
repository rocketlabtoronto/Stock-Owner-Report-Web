import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";
import { createStructuredLogger } from "../_shared/logging.ts";

const ALLOWED_ORIGINS = new Set([
  "https://app.stockownerreport.com",
  "https://stockownerreport.com",
  "https://www.stockownerreport.com",
  "http://localhost:3000",
]);

const getCorsHeaders = (origin: string | null) => {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://app.stockownerreport.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, content-profile, accept-profile",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
};

serve(async (req: Request) => {
  const logger = createStructuredLogger("snaptrade-register-user-v2");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  logger.info("S0", "Receive request to register or refresh SnapTrade user context", {
    method: req.method,
    origin: req.headers.get("origin") ?? "",
  });

  if (req.method === "OPTIONS") {
    logger.info("S1", "Handle preflight request without mutating customer records");
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    logger.warn("S2", "Reject unsupported method before registration flow", {
      receivedMethod: req.method,
      expectedMethod: "POST",
    });
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SNAPTRADE_CLIENT_ID || !SNAPTRADE_CONSUMER_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    logger.error("S3", "Cannot register SnapTrade user because server config is incomplete", {
      hasClientId: Boolean(SNAPTRADE_CLIENT_ID),
      hasConsumerKey: Boolean(SNAPTRADE_CONSUMER_KEY),
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
    });
    return new Response(
      JSON.stringify({
        error: "Missing required server configuration",
        hasClientId: Boolean(SNAPTRADE_CLIENT_ID),
        hasConsumerKey: Boolean(SNAPTRADE_CONSUMER_KEY),
        hasSupabaseUrl: Boolean(SUPABASE_URL),
        hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
      }),
      { status: 500, headers: corsHeaders }
    );
  }

  let userId: string | undefined;
  try {
    const body = await req.json();
    userId = body?.userId;
  } catch {
    logger.warn("S4", "Reject request because registration payload is invalid JSON", {
      expectedField: "userId",
    });
    return new Response(JSON.stringify({ error: "Missing or invalid request body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!userId) {
    logger.warn("S5", "Reject request because userId is missing", {
      hasUserId: Boolean(userId),
    });
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    logger.info("S6", "Register customer with SnapTrade and capture returned user secret", {
      userId,
    });
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      db: { schema: "public" },
    });

    const snaptrade = new Snaptrade({
      clientId: SNAPTRADE_CLIENT_ID,
      consumerKey: SNAPTRADE_CONSUMER_KEY,
    });

    const response = await snaptrade.authentication.registerSnapTradeUser({ userId });
    const userSecret = response?.data?.userSecret;

    if (!userSecret) {
      logger.error("S7", "SnapTrade registration returned without required user secret", {
        userId,
        hasResponseData: Boolean(response?.data),
      });
      return new Response(
        JSON.stringify({ error: "SnapTrade registration succeeded but userSecret is missing" }),
        { status: 502, headers: corsHeaders }
      );
    }

    const { error: persistError } = await supabase
      .from("snaptrade_users")
      .upsert(
        {
          snaptrade_user_id: userId,
          snaptrade_user_secret: userSecret,
        },
        { onConflict: "snaptrade_user_id" }
      );

    if (persistError) {
      logger.error("S8", "Failed to persist SnapTrade credentials in database", {
        userId,
        persistError: persistError.message,
      });
      return new Response(
        JSON.stringify({
          error: "Failed to persist SnapTrade user context",
          persistError: persistError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    logger.info("S9", "SnapTrade user registration workflow completed successfully", {
      userId,
      persistedInTable: "snaptrade_users",
    });

    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    logger.error("S10", "SnapTrade registration workflow failed due to upstream or DB exception", {
      userId,
      message: error?.message,
      upstreamStatus: error?.response?.status,
      upstreamData: error?.response?.data,
    });
    return new Response(
      JSON.stringify({
        error: error?.message || "SnapTrade registration failed",
        upstreamStatus: error?.response?.status,
        upstreamData: error?.response?.data,
      }),
      {
        status: error?.response?.status || 500,
        headers: corsHeaders,
      }
    );
  }
});
