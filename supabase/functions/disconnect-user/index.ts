import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";
import { createStructuredLogger } from "../_shared/logging.ts";

serve(async (req: Request) => {
  const logger = createStructuredLogger("disconnect-user");
  const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, content-profile, accept-profile",
    "Content-Type": "application/json",
  };

  logger.info("S0", "Receive disconnect request and initialize dependencies", {
    method: req.method,
  });

  if (req.method === "OPTIONS") {
    logger.info("S1", "Handle browser preflight request without changing user state");
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    logger.warn("S2", "Reject unsupported HTTP method before processing disconnect flow", {
      receivedMethod: req.method,
      expectedMethod: "POST",
    });
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (!SNAPTRADE_CLIENT_ID || !SNAPTRADE_CONSUMER_KEY) {
    logger.error("S3", "Stop disconnect flow because server credentials are missing", {
      hasSnaptradeClientId: Boolean(SNAPTRADE_CLIENT_ID),
      hasSnaptradeConsumerKey: Boolean(SNAPTRADE_CONSUMER_KEY),
    });
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
    logger.warn("S4", "Reject request because disconnect payload cannot be parsed", {
      expectedFields: ["userId", "userSecret"],
    });
    return new Response(JSON.stringify({ error: "Missing or invalid request body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!userId || !userSecret) {
    logger.warn("S5", "Reject disconnect request because required customer identifiers are missing", {
      hasUserId: Boolean(userId),
      hasUserSecret: Boolean(userSecret),
    });
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
    logger.info("S6", "Load existing brokerage authorizations to determine disconnect scope", {
      userId,
    });
    const authorizationsResponse = await snaptrade.connections.listBrokerageAuthorizations({
      userId,
      userSecret,
    });
    const authorizations = authorizationsResponse.data ?? [];

    logger.info("S7", "Disconnect all active brokerage authorizations for user", {
      userId,
      authorizationCount: authorizations.length,
    });
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
    logger.error("S8", "Disconnect flow failed while calling SnapTrade APIs", {
      userId,
      error: message,
    });
    return new Response(JSON.stringify({ error: message || "Failed to disconnect SnapTrade user" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});