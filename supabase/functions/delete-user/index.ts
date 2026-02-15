// ----- FILE: supabase/functions/delete-user/index.ts -----
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const userId = url.pathname.split("/").pop();
  if (!userId)
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 400,
      headers: corsHeaders,
    });

  const snaptrade = new Snaptrade({
    clientId: Deno.env.get("SNAPTRADE_CLIENT_ID")!,
    consumerKey: Deno.env.get("SNAPTRADE_CONSUMER_KEY")!,
  });

  try {
    await snaptrade.authentication.deleteSnapTradeUser({ userId });
    await supabase.from("users").delete().eq("id", userId);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.response?.data || error.message }), {
      status: error.response?.status || 500,
      headers: corsHeaders,
    });
  }
});
