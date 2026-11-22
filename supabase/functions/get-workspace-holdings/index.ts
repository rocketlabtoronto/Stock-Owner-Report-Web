import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createCorsHeaders, createJsonResponder, parseAllowedOrigins } from "../_shared/http.ts";
import { resolveAuthenticatedCaller } from "../_shared/workspace-auth.ts";
import { loadWorkspaceHoldings } from "../_shared/workspace-holdings.ts";

// Business purpose: load a signed-in user's saved accounts/holdings when they
// return to their workspace (sign-in, refresh, or switching between the
// Balance Sheet and Income Statement), so both reports read the same
// server-persisted record rather than relying on browser storage alone.
const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const buildCorsHeaders = createCorsHeaders(ALLOWED_ORIGINS, {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

serve(async (req: Request) => {
  const logger = createStructuredLogger("get-workspace-holdings");
  const json = createJsonResponder({
    ...buildCorsHeaders(req),
    "Content-Type": "application/json",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
  }

  if (req.method !== "GET") {
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

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? "";
  if (!workspaceId) {
    return json(400, { error: "Missing workspaceId" });
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, email, workspace_type")
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspaceError || !workspace || workspace.email !== caller.email) {
    logger.warn("S2", "Reject holdings lookup for a workspace the caller does not own");
    return json(403, { error: "Workspace not found for this account" });
  }

  const accounts = await loadWorkspaceHoldings(supabase, workspaceId);
  logger.info("S3", "Loaded workspace holdings", { workspaceId, accountCount: accounts.length });

  return json(200, { workspace, accounts });
});
