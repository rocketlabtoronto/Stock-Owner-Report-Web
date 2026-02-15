// ----- FILE: supabase/functions/register-user/index.ts -----
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

  const { userId } = await req.json();
  if (!userId)
    return new Response(JSON.stringify({ error: "userId required" }), {
      status: 400,
      headers: corsHeaders,
    });

  const snaptrade = new Snaptrade({
    clientId: Deno.env.get("SNAPTRADE_CLIENT_ID")!,
    consumerKey: Deno.env.get("SNAPTRADE_CONSUMER_KEY")!,
  });

  try {
    const users = await snaptrade.authentication.listSnapTradeUsers();
    if (users.data.includes(userId)) {
      return new Response(JSON.stringify({ error: "User already exists" }), {
        status: 409,
        headers: corsHeaders,
      });
    }

    const response = await snaptrade.authentication.registerSnapTradeUser({ userId });
    await supabase.from("users").upsert({ id: userId, snapUserSecret: response.data.userSecret });
    return new Response(JSON.stringify(response.data), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.response?.data || error.message }), {
      status: error.response?.status || 500,
      headers: corsHeaders,
    });
  }
});
