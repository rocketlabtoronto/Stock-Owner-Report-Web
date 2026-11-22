import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createCorsHeaders, createJsonResponder, parseAllowedOrigins, parseBody } from "../_shared/http.ts";
import { resolveAuthenticatedCaller } from "../_shared/workspace-auth.ts";
import {
  resolveExchangeAlias,
  resolveInstitutionAlias,
  tickerExistsForExchange,
} from "../_shared/portfolio-directory.ts";

// Business purpose: validate an Excel portfolio upload before import — resolve
// brokerage/exchange aliases against SOR's canonical tables, check tickers per
// exchange, and flag rows that need a user correction in the Review Upload
// Issues modal (unrecognized institution/exchange, invalid ticker/quantity,
// blank account name, or a worksheet spanning more than one exchange).
const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const buildCorsHeaders = createCorsHeaders(ALLOWED_ORIGINS, {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

type UploadRow = {
  rowNumber?: number;
  ticker?: string;
  quantity?: string | number;
  accountName?: string;
  financialInstitution?: string;
  exchange?: string;
};

export async function validateRows(
  publicClient: any,
  dashboardClient: any,
  rows: UploadRow[]
) {
  const resolvedRows = await Promise.all(
    rows.map(async (row) => {
      const issues: string[] = [];
      const ticker = String(row.ticker ?? "").trim().toUpperCase();
      const quantity = Number.parseFloat(String(row.quantity ?? ""));
      const accountName = String(row.accountName ?? "").trim();

      if (!ticker) issues.push("ticker_missing");
      if (!Number.isFinite(quantity) || quantity <= 0) issues.push("quantity_invalid");
      if (!accountName) issues.push("account_name_missing");

      const institution = await resolveInstitutionAlias(publicClient, String(row.financialInstitution ?? ""));
      if (!institution) issues.push("institution_unrecognized");

      const exchange = await resolveExchangeAlias(publicClient, String(row.exchange ?? ""));
      if (!exchange) issues.push("exchange_unrecognized");

      let tickerValid = false;
      if (ticker && exchange) {
        tickerValid = await tickerExistsForExchange(publicClient, dashboardClient, exchange.code, ticker);
        if (!tickerValid) issues.push("ticker_invalid");
      }

      return {
        rowNumber: row.rowNumber ?? null,
        ticker,
        quantity: Number.isFinite(quantity) ? quantity : null,
        accountName,
        financialInstitution: {
          raw: row.financialInstitution ?? "",
          code: institution?.code ?? null,
          displayName: institution?.displayName ?? null,
          matched: Boolean(institution),
        },
        exchange: {
          raw: row.exchange ?? "",
          code: exchange?.code ?? null,
          displayName: exchange?.displayName ?? null,
          matched: Boolean(exchange),
        },
        tickerValid,
        issues,
      };
    })
  );

  const exchangeCodeCounts = new Map<string, number>();
  for (const row of resolvedRows) {
    if (row.exchange.code) {
      exchangeCodeCounts.set(row.exchange.code, (exchangeCodeCounts.get(row.exchange.code) ?? 0) + 1);
    }
  }
  const distinctExchangeCodes = [...exchangeCodeCounts.keys()];
  let majorityExchangeCode: string | null = null;
  let majorityCount = -1;
  for (const [code, count] of exchangeCodeCounts) {
    if (count > majorityCount) {
      majorityCount = count;
      majorityExchangeCode = code;
    }
  }

  const finalRows = resolvedRows.map((row) => {
    const issues = [...row.issues];
    if (distinctExchangeCodes.length > 1 && row.exchange.code && row.exchange.code !== majorityExchangeCode) {
      issues.push("exchange_mismatch");
    }
    return { ...row, issues };
  });

  const status = finalRows.every((row) => row.issues.length === 0) && distinctExchangeCodes.length <= 1
    ? "valid"
    : "needs_review";

  return { status, distinctExchangeCodes, rows: finalRows };
}

serve(async (req: Request) => {
  const logger = createStructuredLogger("validate-portfolio-upload");
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
  const rows: UploadRow[] = Array.isArray(body?.rows) ? body.rows : [];

  if (!workspaceId || rows.length === 0) {
    return json(400, { error: "Missing workspaceId or rows" });
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, email, workspace_type")
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspaceError || !workspace || workspace.email !== caller.email) {
    logger.warn("S2", "Reject validation for a workspace the caller does not own");
    return json(403, { error: "Workspace not found for this account" });
  }

  if (workspace.workspace_type !== "upload_portfolio") {
    return json(400, { error: "Only Upload Portfolio workspaces accept Excel uploads" });
  }

  const result = await validateRows(supabase, dashboardClient, rows);
  logger.info("S3", "Validated portfolio upload rows", {
    rowCount: rows.length,
    status: result.status,
  });

  return json(200, result);
});
