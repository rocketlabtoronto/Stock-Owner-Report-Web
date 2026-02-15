// Directory structure:
// supabase/functions/
// ├── get-users/index.ts
// ├── register-user/index.ts
// ├── delete-user/index.ts
// └── login-user/index.ts

// ----- FILE: supabase/functions/get-users/index.ts -----
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { Snaptrade } from "npm:snaptrade-typescript-sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const snaptrade = new Snaptrade({
    clientId: Deno.env.get("SNAPTRADE_CLIENT_ID")!,
    consumerKey: Deno.env.get("SNAPTRADE_CONSUMER_KEY")!,
  });

  try {
    const response = await snaptrade.authentication.listSnapTradeUsers();
    return new Response(JSON.stringify(response.data), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.response?.data || error.message }), {
      status: error.response?.status || 500,
      headers: corsHeaders,
    });
  }
});
