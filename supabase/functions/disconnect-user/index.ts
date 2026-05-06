import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";
import { createStructuredLogger } from "../_shared/logging.ts";

// Business purpose: disconnect all active brokerage authorizations for a SnapTrade user.
// This is a mandatory cleanup step after account import workflows.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-profile, accept-profile",
  "Content-Type": "application/json",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const parseBody = async (req: Request) => {
  try {
    return await req.json();
  } catch {
    return null;
  }
};

serve(async (req: Request) => {
  const logger = createStructuredLogger("disconnect-user");
  const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");

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
    return json(405, { error: "Method not allowed" });
  }

  if (!SNAPTRADE_CLIENT_ID || !SNAPTRADE_CONSUMER_KEY) {
    logger.error("S3", "Stop disconnect flow because server credentials are missing", {
      hasSnaptradeClientId: Boolean(SNAPTRADE_CLIENT_ID),
      hasSnaptradeConsumerKey: Boolean(SNAPTRADE_CONSUMER_KEY),
    });
    return json(500, { error: "Missing server configuration" });
  }

  const body = await parseBody(req);
  if (!body) {
    logger.warn("S4", "Reject request because disconnect payload cannot be parsed", {
      expectedFields: ["userId", "userSecret"],
    });
    return json(400, { error: "Missing or invalid request body" });
  }

  const userId = String(body?.userId || "").trim();
  const userSecret = String(body?.userSecret || "").trim();

  if (!userId || !userSecret) {
    logger.warn("S5", "Reject disconnect request because required customer identifiers are missing", {
      hasUserId: Boolean(userId),
      hasUserSecret: Boolean(userSecret),
    });
    return json(400, { error: "Missing userId or userSecret in request body" });
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

    return json(200, { disconnected: authorizations.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("S8", "Disconnect flow failed while calling SnapTrade APIs", {
      userId,
      error: message,
    });
    return json(500, { error: message || "Failed to disconnect SnapTrade user" });
  }
});