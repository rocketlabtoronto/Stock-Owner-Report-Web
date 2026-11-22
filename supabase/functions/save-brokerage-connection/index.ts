import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createCorsHeaders, createJsonResponder, parseAllowedOrigins, parseBody } from "../_shared/http.ts";
import { resolveAuthenticatedCaller } from "../_shared/workspace-auth.ts";
import { resolveOrCreateExchange, resolveOrCreateInstitution } from "../_shared/portfolio-directory.ts";
import { loadWorkspaceHoldings } from "../_shared/workspace-holdings.ts";

// Business purpose: persist SnapTrade/manual brokerage-connected holdings into
// a Connect to Brokerage workspace, using the same institution/exchange
// identifiers as Excel uploads, so the Balance Sheet and Income Statement show
// them (read-only) after sign-in and across sessions.
const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const buildCorsHeaders = createCorsHeaders(ALLOWED_ORIGINS, {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

type IncomingHolding = { Symbol?: string; Market?: string; Quantity?: string | number };
type IncomingAccount = { accountRaw?: string; Account?: string; holdings?: IncomingHolding[] };

// Mirrors the "BrokerageName - AccountLabel" convention already used by
// accountModel.js / financialStatementModel.js for CSV/SnapTrade accounts.
function splitAccountRaw(accountRaw: string) {
  const [namePart = "", numberPart = ""] = accountRaw.split(" - ");
  return {
    brokerageName: namePart.trim() || "Unknown Brokerage",
    accountLabel: numberPart.trim() || namePart.trim() || "Account",
  };
}

serve(async (req: Request) => {
  const logger = createStructuredLogger("save-brokerage-connection");
  const json = createJsonResponder({
    ...buildCorsHeaders(req),
    "Content-Type": "application/json",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    logger.error("S0", "Stop because server config is incomplete");
    return json(500, { error: "Missing server configuration" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const caller = await resolveAuthenticatedCaller(req, supabase);
  if (!caller) {
    logger.warn("S1", "Reject request without a valid signed-in session");
    return json(401, { error: "Not signed in" });
  }

  const body = await parseBody(req);
  const workspaceId = String(body?.workspaceId ?? "");
  const incomingAccounts: IncomingAccount[] = Array.isArray(body?.accounts) ? body.accounts : [];

  if (!workspaceId || incomingAccounts.length === 0) {
    return json(400, { error: "Missing workspaceId or accounts" });
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, email, workspace_type")
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspaceError || !workspace || workspace.email !== caller.email) {
    logger.warn("S2", "Reject save for a workspace the caller does not own");
    return json(403, { error: "Workspace not found for this account" });
  }

  if (workspace.workspace_type !== "connect_brokerage") {
    return json(400, { error: "Only Connect to Brokerage workspaces accept brokerage connections" });
  }

  for (const incomingAccount of incomingAccounts) {
    const raw = String(incomingAccount.accountRaw ?? incomingAccount.Account ?? "");
    const holdings = Array.isArray(incomingAccount.holdings) ? incomingAccount.holdings : [];
    if (!raw || holdings.length === 0) continue;

    const { brokerageName, accountLabel } = splitAccountRaw(raw);
    const institution = await resolveOrCreateInstitution(supabase, brokerageName);

    const { data: account, error: accountError } = await supabase
      .from("workspace_accounts")
      .upsert(
        { workspace_id: workspaceId, account_name: accountLabel, institution_code: institution.code },
        { onConflict: "workspace_id,account_name,institution_code" }
      )
      .select("id")
      .single();

    if (accountError || !account) {
      logger.error("S3", "Failed to upsert brokerage-connected account", {
        message: accountError?.message,
      });
      return json(500, { error: "Could not save brokerage account" });
    }

    const holdingRows = [];
    for (const holding of holdings) {
      const ticker = String(holding.Symbol ?? "").trim().toUpperCase();
      const quantity = Number.parseFloat(String(holding.Quantity ?? ""));
      if (!ticker || !Number.isFinite(quantity) || quantity <= 0) continue;
      const exchange = await resolveOrCreateExchange(supabase, String(holding.Market ?? ""));
      holdingRows.push({
        workspace_id: workspaceId,
        account_id: account.id,
        exchange_code: exchange.code,
        ticker,
        quantity,
        source: "brokerage_connection",
        updated_at: new Date().toISOString(),
      });
    }

    if (holdingRows.length > 0) {
      const { error: holdingsError } = await supabase
        .from("workspace_holdings")
        .upsert(holdingRows, { onConflict: "account_id,exchange_code,ticker" });
      if (holdingsError) {
        logger.error("S4", "Failed to upsert brokerage-connected holdings", {
          message: holdingsError.message,
        });
        return json(500, { error: "Could not save brokerage holdings" });
      }
    }
  }

  const accounts = await loadWorkspaceHoldings(supabase, workspaceId);
  logger.info("S5", "Saved brokerage connection", { workspaceId, accountCount: accounts.length });

  return json(200, { accounts });
});
