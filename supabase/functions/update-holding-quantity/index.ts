import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createCorsHeaders, createJsonResponder, parseAllowedOrigins, parseBody } from "../_shared/http.ts";
import { resolveAuthenticatedCaller } from "../_shared/workspace-auth.ts";

// Business purpose: save an edited "Number of Shares" value from the Balance
// Sheet or Income Statement Edit row. Only Excel-imported holdings in the
// caller's own Upload Portfolio workspace can be edited; brokerage-connected
// holdings stay read-only.
const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const buildCorsHeaders = createCorsHeaders(ALLOWED_ORIGINS, {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

serve(async (req: Request) => {
  const logger = createStructuredLogger("update-holding-quantity");
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
  const holdingId = String(body?.holdingId ?? "");
  const quantity = Number.parseFloat(String(body?.quantity ?? ""));

  if (!workspaceId || !holdingId) {
    return json(400, { error: "Missing workspaceId or holdingId" });
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return json(400, { error: "Number of shares must be a positive number" });
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, email, workspace_type")
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspaceError || !workspace || workspace.email !== caller.email) {
    logger.warn("S2", "Reject edit for a workspace the caller does not own");
    return json(403, { error: "Workspace not found for this account" });
  }

  if (workspace.workspace_type !== "upload_portfolio") {
    return json(400, { error: "Only Upload Portfolio workspaces support editing share counts" });
  }

  const { data: holding, error: holdingError } = await supabase
    .from("workspace_holdings")
    .select("id, workspace_id, source")
    .eq("id", holdingId)
    .maybeSingle();

  if (holdingError || !holding || holding.workspace_id !== workspaceId) {
    logger.warn("S3", "Reject edit for a holding outside this workspace");
    return json(404, { error: "Holding not found in this workspace" });
  }

  if (holding.source !== "excel_upload") {
    return json(400, { error: "Only Excel-imported holdings can be edited" });
  }

  const { data: updated, error: updateError } = await supabase
    .from("workspace_holdings")
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq("id", holdingId)
    .select("id, account_id, exchange_code, ticker, quantity, source")
    .single();

  if (updateError || !updated) {
    logger.error("S4", "Failed to update holding quantity", { message: updateError?.message });
    return json(500, { error: "Could not save the new quantity" });
  }

  logger.info("S5", "Updated holding quantity", { workspaceId, holdingId });
  return json(200, {
    holding: {
      workspaceHoldingId: updated.id,
      Symbol: updated.ticker,
      Market: updated.exchange_code,
      Quantity: String(updated.quantity),
      source: updated.source,
    },
  });
});
