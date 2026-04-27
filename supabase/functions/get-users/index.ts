import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";
import { createStructuredLogger } from "../_shared/logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  const logger = createStructuredLogger("get-users");

  logger.info("S0", "Receive request to list SnapTrade users for operations visibility", {
    method: req.method,
  });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    logger.info("S1", "Handle preflight request without querying upstream systems");
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const snaptrade = new Snaptrade({
    clientId: Deno.env.get("SNAPTRADE_CLIENT_ID")!,
    consumerKey: Deno.env.get("SNAPTRADE_CONSUMER_KEY")!,
  });

  try {
    logger.info("S2", "Call SnapTrade to retrieve current user registry", {
      hasClientId: Boolean(Deno.env.get("SNAPTRADE_CLIENT_ID")),
      hasConsumerKey: Boolean(Deno.env.get("SNAPTRADE_CONSUMER_KEY")),
    });
    const response = await snaptrade.authentication.listSnapTradeUsers();
    logger.info("S3", "Return upstream user list to caller", {
      userCount: Array.isArray(response.data) ? response.data.length : undefined,
    });
    return new Response(JSON.stringify(response.data), { status: 200, headers: corsHeaders });
  } catch (error: any) {
    logger.error("S4", "Listing SnapTrade users failed due to upstream/API error", {
      upstreamStatus: error?.response?.status,
      upstreamData: error?.response?.data,
      message: error?.message,
    });
    return new Response(JSON.stringify({ error: error.response?.data || error.message }), {
      status: error.response?.status || 500,
      headers: corsHeaders,
    });
  }
});
