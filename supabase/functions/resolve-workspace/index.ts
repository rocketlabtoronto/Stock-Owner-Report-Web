import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createCorsHeaders, createJsonResponder, parseAllowedOrigins } from "../_shared/http.ts";
import { resolveAuthenticatedCaller } from "../_shared/workspace-auth.ts";

// Business purpose: let a returning user land on the same workspace regardless
// of which OAuth provider they used this time, by looking up public.workspaces
// (locked down to the service role) by the signed-in email from their Supabase
// Auth session.
const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const buildCorsHeaders = createCorsHeaders(ALLOWED_ORIGINS, {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

serve(async (req: Request) => {
  const logger = createStructuredLogger("resolve-workspace");
  const json = createJsonResponder({
    ...buildCorsHeaders(req),
    "Content-Type": "application/json",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    logger.error("S0", "Stop because server config is incomplete", {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
    });
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

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, email, workspace_type, auth_provider, created_at")
    .eq("email", caller.email)
    .maybeSingle();

  if (error) {
    logger.error("S2", "Workspace lookup failed", { message: error.message });
    return json(500, { error: "Could not look up workspace" });
  }

  logger.info("S3", "Resolved caller workspace", {
    email: caller.email,
    hasWorkspace: Boolean(workspace),
  });

  return json(200, {
    email: caller.email,
    provider: caller.provider,
    workspace: workspace ?? null,
  });
});
