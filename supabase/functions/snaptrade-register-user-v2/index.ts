import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");

  if (!SNAPTRADE_CLIENT_ID || !SNAPTRADE_CONSUMER_KEY) {
    return new Response(
      JSON.stringify({
        error: "Missing SnapTrade credentials",
        hasClientId: Boolean(SNAPTRADE_CLIENT_ID),
        hasConsumerKey: Boolean(SNAPTRADE_CONSUMER_KEY),
      }),
      { status: 500, headers: corsHeaders }
    );
  }

  let userId: string | undefined;
  try {
    const body = await req.json();
    userId = body?.userId;
  } catch {
    return new Response(JSON.stringify({ error: "Missing or invalid request body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const snaptrade = new Snaptrade({
      clientId: SNAPTRADE_CLIENT_ID,
      consumerKey: SNAPTRADE_CONSUMER_KEY,
    });

    const response = await snaptrade.authentication.registerSnapTradeUser({ userId });

    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
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
