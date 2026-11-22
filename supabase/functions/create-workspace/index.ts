import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createCorsHeaders, createJsonResponder, parseAllowedOrigins, parseBody } from "../_shared/http.ts";
import { resolveAuthenticatedCaller } from "../_shared/workspace-auth.ts";

// Business purpose: create the one workspace that belongs to the signed-in
// email, of the type the user picked (Upload Portfolio or Connect to
// Brokerage). Idempotent: a second call for the same email returns the
// existing workspace instead of erroring, since each email owns exactly one.
const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const buildCorsHeaders = createCorsHeaders(ALLOWED_ORIGINS, {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

const VALID_WORKSPACE_TYPES = new Set(["upload_portfolio", "connect_brokerage"]);

serve(async (req: Request) => {
  const logger = createStructuredLogger("create-workspace");
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
  const workspaceType = String(body?.workspaceType ?? "");
  if (!VALID_WORKSPACE_TYPES.has(workspaceType)) {
    return json(400, { error: "workspaceType must be upload_portfolio or connect_brokerage" });
  }

  const { data: existing, error: existingError } = await supabase
    .from("workspaces")
    .select("id, email, workspace_type, auth_provider, created_at")
    .eq("email", caller.email)
    .maybeSingle();

  if (existingError) {
    logger.error("S2", "Workspace lookup failed", { message: existingError.message });
    return json(500, { error: "Could not look up workspace" });
  }

  if (existing) {
    logger.info("S3", "Workspace already exists for this email", { email: caller.email });
    return json(200, { workspace: existing, created: false });
  }

  const { data: created, error: insertError } = await supabase
    .from("workspaces")
    .insert({ email: caller.email, workspace_type: workspaceType, auth_provider: caller.provider })
    .select("id, email, workspace_type, auth_provider, created_at")
    .single();

  if (insertError) {
    // A concurrent request may have created the workspace first (email is
    // unique); treat that race as success and return the winning row.
    if (insertError.code === "23505") {
      const { data: raceWinner } = await supabase
        .from("workspaces")
        .select("id, email, workspace_type, auth_provider, created_at")
        .eq("email", caller.email)
        .maybeSingle();
      if (raceWinner) return json(200, { workspace: raceWinner, created: false });
    }
    logger.error("S4", "Failed to create workspace", { message: insertError.message });
    return json(500, { error: "Could not create workspace" });
  }

  logger.info("S5", "Created workspace", { email: caller.email, workspaceType });
  return json(201, { workspace: created, created: true });
});
