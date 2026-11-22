import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createCorsHeaders, createJsonResponder, parseAllowedOrigins, parseBody } from "../_shared/http.ts";
import { resolveAuthenticatedCaller } from "../_shared/workspace-auth.ts";
import { tickerExistsForExchange } from "../_shared/portfolio-directory.ts";
import { loadWorkspaceHoldings } from "../_shared/workspace-holdings.ts";

// Business purpose: persist a validated Excel portfolio upload into the
// signed-in user's Upload Portfolio workspace, using the same
// workspace_accounts/workspace_holdings tables (and institution/exchange
// identifiers) as brokerage-connected holdings.
const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const buildCorsHeaders = createCorsHeaders(ALLOWED_ORIGINS, {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

type ImportRow = {
  ticker?: string;
  quantity?: string | number;
  accountName?: string;
  institutionCode?: string;
  exchangeCode?: string;
};

serve(async (req: Request) => {
  const logger = createStructuredLogger("import-portfolio");
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
    db: { schema: "public" },
    auth: { persistSession: false },
  });
  const dashboardClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: "dashboard" },
    auth: { persistSession: false },
  });

  const caller = await resolveAuthenticatedCaller(req, supabase);
  if (!caller) {
    logger.warn("S1", "Reject request without a valid signed-in session");
    return json(401, { error: "Not signed in" });
  }

  const body = await parseBody(req);
  const workspaceId = String(body?.workspaceId ?? "");
  const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];

  if (!workspaceId || rows.length === 0) {
    return json(400, { error: "Missing workspaceId or rows" });
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, email, workspace_type")
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspaceError || !workspace || workspace.email !== caller.email) {
    logger.warn("S2", "Reject import for a workspace the caller does not own");
    return json(403, { error: "Workspace not found for this account" });
  }

  if (workspace.workspace_type !== "upload_portfolio") {
    return json(400, { error: "Only Upload Portfolio workspaces accept Excel imports" });
  }

  // Re-validate server-side; the client already walked the user through
  // Review Upload Issues, but import must never trust unchecked input.
  for (const row of rows) {
    const quantity = Number.parseFloat(String(row.quantity ?? ""));
    const ticker = String(row.ticker ?? "").trim().toUpperCase();
    const accountName = String(row.accountName ?? "").trim();
    if (!ticker || !accountName || !row.institutionCode || !row.exchangeCode) {
      return json(400, { error: "Every row needs a ticker, account name, institution, and exchange" });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return json(400, { error: `Invalid share quantity for ${ticker}` });
    }
    const tickerValid = await tickerExistsForExchange(supabase, dashboardClient, row.exchangeCode, ticker);
    if (!tickerValid) {
      return json(400, { error: `${ticker} could not be validated on ${row.exchangeCode}` });
    }
  }

  const accountGroups = new Map<string, { accountName: string; institutionCode: string; rows: ImportRow[] }>();
  for (const row of rows) {
    const accountName = String(row.accountName ?? "").trim();
    const institutionCode = String(row.institutionCode ?? "");
    const key = `${institutionCode}::${accountName}`;
    if (!accountGroups.has(key)) accountGroups.set(key, { accountName, institutionCode, rows: [] });
    accountGroups.get(key)!.rows.push(row);
  }

  for (const group of accountGroups.values()) {
    const { data: account, error: accountError } = await supabase
      .from("workspace_accounts")
      .upsert(
        {
          workspace_id: workspaceId,
          account_name: group.accountName,
          institution_code: group.institutionCode,
        },
        { onConflict: "workspace_id,account_name,institution_code" }
      )
      .select("id")
      .single();

    if (accountError || !account) {
      logger.error("S3", "Failed to upsert workspace account", {
        message: accountError?.message,
        accountName: group.accountName,
      });
      return json(500, { error: "Could not save account" });
    }

    const holdingRows = group.rows.map((row) => ({
      workspace_id: workspaceId,
      account_id: account.id,
      exchange_code: row.exchangeCode,
      ticker: String(row.ticker).trim().toUpperCase(),
      quantity: Number.parseFloat(String(row.quantity)),
      source: "excel_upload",
      updated_at: new Date().toISOString(),
    }));

    const { error: holdingsError } = await supabase
      .from("workspace_holdings")
      .upsert(holdingRows, { onConflict: "account_id,exchange_code,ticker" });

    if (holdingsError) {
      logger.error("S4", "Failed to upsert workspace holdings", { message: holdingsError.message });
      return json(500, { error: "Could not save holdings" });
    }
  }

  const accounts = await loadWorkspaceHoldings(supabase, workspaceId);
  logger.info("S5", "Imported portfolio upload", { workspaceId, rowCount: rows.length });

  return json(200, { accounts });
});
