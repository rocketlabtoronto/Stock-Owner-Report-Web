import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createCorsHeaders, createJsonResponder, parseAllowedOrigins } from "../_shared/http.ts";

// Business purpose: supply the canonical exchange/financial institution lists
// (public tables, locked down to the service role) for the Review Upload
// Issues dropdowns, so corrections map to the same identifiers SOR already
// uses for brokerage-connected holdings.
const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const buildCorsHeaders = createCorsHeaders(ALLOWED_ORIGINS, {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

serve(async (req: Request) => {
  const logger = createStructuredLogger("get-reference-data");
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

  const [{ data: exchanges, error: exchangesError }, { data: institutions, error: institutionsError }] =
    await Promise.all([
      supabase.from("exchanges").select("code, display_name, country").order("display_name"),
      supabase
        .from("financial_institutions")
        .select("code, display_name, country")
        .order("display_name"),
    ]);

  if (exchangesError || institutionsError) {
    logger.error("S1", "Failed to load reference data", {
      exchangesError: exchangesError?.message,
      institutionsError: institutionsError?.message,
    });
    return json(500, { error: "Could not load reference data" });
  }

  return json(200, { exchanges: exchanges ?? [], institutions: institutions ?? [] });
});
