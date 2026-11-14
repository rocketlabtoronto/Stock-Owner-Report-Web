// Business purpose: fetch a full account + holdings snapshot for one SnapTrade user.
// Caller provides userId + userSecret from browser auth-storage.
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createJsonResponder, snaptradeCorsHeaders as corsHeaders } from "../_shared/http.ts";
import { withRetry } from "../_shared/retry.ts";

const json = createJsonResponder(corsHeaders);
const retryOn = [425, 429, 500, 502, 503, 504];

serve(async (req: Request) => {
  const logger = createStructuredLogger("snaptrade-accounts");
  logger.info("S0", "Receive request to aggregate customer account and holdings data", {
    method: req.method,
    origin: req.headers.get("origin") ?? "",
  });

  // Server configuration is required for SnapTrade API access.
  const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");

  if (req.method === "OPTIONS") {
    logger.info("S4", "Handle preflight request without querying SnapTrade");
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // Input contract: request body must include userId + userSecret.
  let userId, userSecret;
  try {
    const body = await req.json();
    userId = body.userId;
    userSecret = body.userSecret;
  } catch (e) {
    logger.warn("S5", "Reject request because payload JSON is invalid", {
      expectedFields: ["userId", "userSecret"],
    });
    return json(400, { error: "Missing or invalid userId/userSecret in request body" });
  }

  if (!userId || !userSecret) {
    logger.warn("S6", "Reject request because SnapTrade credentials are missing", {
      hasUserId: Boolean(userId),
      hasUserSecret: Boolean(userSecret),
    });
    return json(400, { error: "Missing userId or userSecret in request body" });
  }

  if (!SNAPTRADE_CLIENT_ID || !SNAPTRADE_CONSUMER_KEY) {
    logger.error("S7", "Stop account aggregation because server configuration is incomplete", {
      hasSnaptradeClientId: !!SNAPTRADE_CLIENT_ID,
      hasSnaptradeConsumerKey: !!SNAPTRADE_CONSUMER_KEY,
    });
    return json(500, { error: "Missing server configuration" });
  }

  // === Initialize SnapTrade SDK ===
  const snaptrade = new Snaptrade({
    clientId: SNAPTRADE_CLIENT_ID,
    consumerKey: SNAPTRADE_CONSUMER_KEY,
  });

  try {
    // === Step 1: Get all accounts for the user ===
    logger.info("S9", "Fetch connected brokerage accounts for customer", { userId });
    const accountsRes = await snaptrade.accountInformation.listUserAccounts({
      userId,
      userSecret,
    });
    const accounts = accountsRes.data || [];
    const accountSample = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      institution_name: account?.institution_name,
      brokerage_authorization_id: account?.brokerage_authorization_id,
      brokerage: account?.brokerage,
    }));
    logger.info("S10", "Received account list from SnapTrade", {
      userId,
      count: accounts.length,
      sample: accountSample,
    });

    // === Step 2: For each account, get holdings and details ===
    // Process accounts sequentially to avoid burst concurrency against SnapTrade.
    logger.info("S11", "Fetch holdings and account details for each connected account", {
      userId,
      accountCount: accounts.length,
      processingMode: "sequential accounts, parallel per-account calls",
    });
    const accountsWithData = [];
    for (const account of accounts) {
      const fetchData = async (kind: "holdings" | "details") => {
        const holdings = kind === "holdings";
        const credentials = { userId, userSecret, accountId: account.id };
        try {
          const response = await withRetry<{ data: unknown }>(
            () =>
              holdings
                ? snaptrade.accountInformation.getUserHoldings(credentials)
                : snaptrade.accountInformation.getUserAccountDetails(credentials),
            { retries: holdings ? 6 : 4, baseDelayMs: holdings ? 1000 : 800, retryOn },
            (retry) =>
              logger.warn("S8", "Retry SnapTrade call after transient upstream error", {
                label: `${kind}:${account.id}`,
                ...retry,
              })
          );
          return response.data;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(
            holdings ? "S13" : "S14",
            holdings ? "Failed to fetch holdings for account" : "Failed to fetch account details",
            {
              userId,
              accountId: account.id,
              accountName: account.name,
              message,
            }
          );
          return null;
        }
      };

      // Keep per-account parallel fetch, but process accounts one-by-one.
      const [holdingsData, detailsData] = await Promise.all([
        fetchData("holdings"),
        fetchData("details"),
      ]);
      accountsWithData.push({
        id: account.id,
        name: account.name,
        type: account.type,
        details: detailsData,
        holdings: holdingsData,
      });
    }

    // === Step 3: Return the combined data model ===
    logger.info("S12", "Account aggregation completed; returning consolidated account model", {
      userId,
      accountsReturned: accountsWithData.length,
    });
    return json(200, { accounts: accountsWithData });
  } catch (err) {
    // === Error Handling ===
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("S99", "Unhandled exception during account aggregation workflow", {
      message: errorMessage,
      userId,
    });
    return json(500, { error: errorMessage || "Failed to fetch SnapTrade account data" });
  }
});
