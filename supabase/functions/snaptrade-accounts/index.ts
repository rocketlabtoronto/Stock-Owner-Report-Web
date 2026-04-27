// === SnapTrade Accounts Edge Function ===
// This function receives a POST request with userId and userSecret, fetches all SnapTrade accounts for the user,
// and for each account, fetches holdings and account details. Returns a combined data model.
// Import Deno HTTP server, Supabase client (not used here, but available), and SnapTrade SDK
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";
import { createStructuredLogger } from "../_shared/logging.ts";

serve(async (req: Request) => {
  const logger = createStructuredLogger("snaptrade-accounts");
  logger.info("S0", "Receive request to aggregate customer account and holdings data", {
    method: req.method,
    origin: req.headers.get("origin") ?? "",
  });

  // === Environment Variables ===
  // These are set in the Supabase Edge Function environment
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");

  // === CORS Headers ===
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, content-profile, accept-profile",
    "Content-Type": "application/json",
  };

  const logWebhookError = async (eventType: string, step: number, errorMsg: string) => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      logger.error("S1", "Cannot persist diagnostic event because logging DB config is missing", {
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceRoleKey: !!SERVICE_ROLE_KEY,
      });
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/webhook_errors`, {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: eventType,
          email: "unknown",
          timestamp: new Date().toISOString(),
          error_message: errorMsg,
          step,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        logger.error("S2", "Failed writing diagnostic row to webhook_errors table", {
          status: res.status,
          body: text,
        });
      }
    } catch (error) {
      logger.error("S3", "Exception while writing diagnostic row to webhook_errors", {
        error,
      });
    }
  };

  // === Handle CORS Preflight ===
  if (req.method === "OPTIONS") {
    logger.info("S4", "Handle preflight request without querying SnapTrade");
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // === Parse and Validate Request Body ===
  // Expecting a JSON body with userId and userSecret
  let userId, userSecret;
  try {
    const body = await req.json();
    userId = body.userId;
    userSecret = body.userSecret;
  } catch (e) {
    logger.warn("S5", "Reject request because payload JSON is invalid", {
      expectedFields: ["userId", "userSecret"],
    });
    return new Response(
      JSON.stringify({ error: "Missing or invalid userId/userSecret in request body" }),
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }

  if (!userId || !userSecret) {
    logger.warn("S6", "Reject request because SnapTrade credentials are missing", {
      hasUserId: Boolean(userId),
      hasUserSecret: Boolean(userSecret),
    });
    return new Response(JSON.stringify({ error: "Missing userId or userSecret in request body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // === Validate required environment variables ===
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SNAPTRADE_CLIENT_ID || !SNAPTRADE_CONSUMER_KEY) {
    logger.error("S7", "Stop account aggregation because server configuration is incomplete", {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceRoleKey: !!SERVICE_ROLE_KEY,
      hasSnaptradeClientId: !!SNAPTRADE_CLIENT_ID,
      hasSnaptradeConsumerKey: !!SNAPTRADE_CONSUMER_KEY,
    });
    return new Response(
      JSON.stringify({ error: "Missing server configuration" }),
      { status: 500, headers: corsHeaders }
    );
  }

  // === Initialize SnapTrade SDK ===
  const snaptrade = new Snaptrade({
    clientId: SNAPTRADE_CLIENT_ID,
    consumerKey: SNAPTRADE_CONSUMER_KEY,
  });

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const getErrorStatus = (err: unknown): number | undefined => {
    const anyErr = err as any;
    return (
      anyErr?.response?.status ??
      anyErr?.response?.statusCode ??
      anyErr?.status ??
      anyErr?.statusCode
    );
  };

  const withRetry = async <T>(
    label: string,
    fn: () => Promise<T>,
    opts: { retries: number; baseDelayMs: number; retryOn: number[] }
  ): Promise<T> => {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (err) {
        const status = getErrorStatus(err);
        const shouldRetry = status != null && opts.retryOn.includes(status);
        if (!shouldRetry || attempt >= opts.retries) {
          throw err;
        }

        const delay = opts.baseDelayMs * Math.pow(2, attempt);
          logger.warn("S8", "Retry SnapTrade call after transient upstream error", {
            label,
            attempt: attempt + 1,
            delayMs: delay,
            status,
          });
        await sleep(delay);
        attempt += 1;
      }
    }
  };

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
    await logWebhookError(
      "snaptrade-accounts-debug",
      200,
      `Accounts: ${JSON.stringify(accountSample.slice(0, 5))}`
    );

    // === Step 2: For each account, get holdings and details ===
    // Process accounts sequentially to avoid burst concurrency against SnapTrade.
    logger.info("S11", "Fetch holdings and account details for each connected account", {
      userId,
      accountCount: accounts.length,
      processingMode: "sequential accounts, parallel per-account calls",
    });
    const accountsWithData = [];
    for (const account of accounts) {
        const fetchHoldings = async () => {
          try {
            const holdingsRes = await withRetry(
              `holdings:${account.id}`,
              () =>
                snaptrade.accountInformation.getUserHoldings({
                  userId,
                  userSecret,
                  accountId: account.id,
                }),
              { retries: 6, baseDelayMs: 1000, retryOn: [425, 429, 500, 502, 503, 504] }
            );
            return holdingsRes.data;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await logWebhookError(
              "snaptrade-accounts-account",
              2,
              `Holdings failed for ${account.id} (${account.name}): ${message}`
            );
            return null;
          }
        };

        const fetchDetails = async () => {
          try {
            const detailsRes = await withRetry(
              `details:${account.id}`,
              () =>
                snaptrade.accountInformation.getUserAccountDetails({
                  userId,
                  userSecret,
                  accountId: account.id,
                }),
              { retries: 4, baseDelayMs: 800, retryOn: [425, 429, 500, 502, 503, 504] }
            );
            return detailsRes.data;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await logWebhookError(
              "snaptrade-accounts-account",
              3,
              `Details failed for ${account.id} (${account.name}): ${message}`
            );
            return null;
          }
        };

        // Keep per-account parallel fetch, but process accounts one-by-one.
        const [holdingsData, detailsData] = await Promise.all([
          fetchHoldings(),
          fetchDetails(),
        ]);
        /*
         * Purpose: Build a unified data object for each SnapTrade account.
         *
         * - id: Unique identifier for the account (used for further API calls)
         * - name: Human-readable account name (e.g., "My Brokerage Account")
         * - type: Account type (e.g., "CASH", "MARGIN", etc.)
         * - details: All metadata/details about the account (from getUserAccountDetails)
         * - holdings: Array of all holdings/assets in the account (from getUserHoldings)
         *
         * This structure makes it easy for the frontend to display all relevant account info
         * and holdings in a single, organized object per account.
         */
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
    return new Response(JSON.stringify({ accounts: accountsWithData }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    // === Error Handling ===
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("S99", "Unhandled exception during account aggregation workflow", {
      message: errorMessage,
      userId,
    });
    await logWebhookError(
      "snaptrade-accounts",
      500,
      `User: ${userId || "unknown"} | ${errorMessage}`
    );
    return new Response(
      JSON.stringify({ error: errorMessage || "Failed to fetch SnapTrade account data" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
