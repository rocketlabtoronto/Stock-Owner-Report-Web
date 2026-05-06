import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";
import { createStructuredLogger } from "../_shared/logging.ts";

// Business purpose: generate a SnapTrade portal link from browser-supplied credentials only.
// This function intentionally does not look up fallback credentials in the database.
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

const normalizeLink = (link: string | undefined, redirectURI: string) => {
  if (!link) return link;

  try {
    const url = new URL(link);
    if (!url.searchParams.get("redirect_uri")) url.searchParams.set("redirect_uri", redirectURI);
    if (!url.searchParams.get("redirectURI")) url.searchParams.set("redirectURI", redirectURI);
    return url.toString();
  } catch {
    return link;
  }
};

serve(async (req: Request) => {
  const logger = createStructuredLogger("login-user");
  logger.info("S0", "Receive request to generate SnapTrade login link", {
    method: req.method,
    origin: req.headers.get("origin") ?? "",
  });

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");

  if (!SNAPTRADE_CLIENT_ID || !SNAPTRADE_CONSUMER_KEY) {
    logger.error("S1", "Missing SnapTrade server configuration", {
      hasClientId: Boolean(SNAPTRADE_CLIENT_ID),
      hasConsumerKey: Boolean(SNAPTRADE_CONSUMER_KEY),
    });
    return json(500, { error: "Missing server configuration" });
  }

  const body = (await parseBody(req)) as
    | {
        userId?: string;
        userSecret?: string;
        redirectURI?: string;
        connectionPortalVersion?: string;
        broker?: string;
      }
    | null;

  if (!body) {
    return json(400, { error: "Invalid request body" });
  }

  const userId = String(body.userId || "").trim();
  const userSecret = String(body.userSecret || "").trim();
  const broker = body.broker;
  const connectionPortalVersion = body.connectionPortalVersion || "v4";
  const redirectURI =
    String(body.redirectURI || "").trim() ||
    Deno.env.get("SNAPTRADE_REDIRECT_URI") ||
    "http://localhost:3000/snapTradeRedirect";

  if (!userId || !userSecret) {
    return json(400, { error: "Missing userId or userSecret" });
  }

  const snaptrade = new Snaptrade({
    clientId: SNAPTRADE_CLIENT_ID,
    consumerKey: SNAPTRADE_CONSUMER_KEY,
  });

  try {
    const login = await snaptrade.authentication.loginSnapTradeUser({
      userId,
      userSecret,
      redirectURI,
      customRedirectUrl: redirectURI,
      connectionPortalVersion,
      broker,
    });

    const rawLink =
      login.data?.redirectURI ||
      (login.data as { redirectUri?: string })?.redirectUri ||
      (login.data as { redirectURL?: string })?.redirectURL ||
      (login.data as { link?: string })?.link;

    const normalizedLink = normalizeLink(rawLink, redirectURI);
    if (rawLink && rawLink !== normalizedLink) {
      logger.info("S2", "Normalized SnapTrade redirect link parameters", { userId });
    }

    return json(200, {
      ...login.data,
      redirectURI: normalizedLink || login.data?.redirectURI,
      redirectURIUsed: redirectURI,
    });
  } catch (error: any) {
    logger.error("S3", "SnapTrade login failed", {
      userId,
      upstreamStatus: error?.response?.status,
      message: error?.message,
    });

    return json(error?.response?.status || 500, {
      error: "Failed to get login link",
      status: error?.response?.status || 500,
      snaptradeError: JSON.stringify(error?.response?.data || error?.message || "Unknown error"),
    });
  }
});
