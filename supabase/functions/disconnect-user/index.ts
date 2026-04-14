import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";

serve(async (req: Request) => {
  const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, content-profile, accept-profile",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (!SNAPTRADE_CLIENT_ID || !SNAPTRADE_CONSUMER_KEY) {
    return new Response(JSON.stringify({ error: "Missing server configuration" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  let userId: string | undefined;
  let userSecret: string | undefined;
  try {
    const body = await req.json();
    userId = body.userId;
    userSecret = body.userSecret;
  } catch {
    return new Response(JSON.stringify({ error: "Missing or invalid request body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!userId || !userSecret) {
    return new Response(JSON.stringify({ error: "Missing userId or userSecret in request body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const snaptrade = new Snaptrade({
    clientId: SNAPTRADE_CLIENT_ID,
    consumerKey: SNAPTRADE_CONSUMER_KEY,
  });

  try {
    const authorizationsResponse = await snaptrade.connections.listBrokerageAuthorizations({
      userId,
      userSecret,
    });
    const authorizations = authorizationsResponse.data ?? [];

    for (const authorization of authorizations) {
      await snaptrade.connections.deleteConnection({
        connectionId: authorization.id,
        userId,
        userSecret,
      });
    }

    return new Response(
      JSON.stringify({
        disconnected: authorizations.length,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message || "Failed to disconnect SnapTrade user" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});