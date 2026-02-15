// Edge Function HTTP server.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Supabase admin client for server-side writes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// SnapTrade SDK for user registration.
import { Snaptrade } from "npm:snaptrade-typescript-sdk";

// CORS for browser calls.
function corsHeaders() {
  return {
    // Allow browser access from any origin.
    "Access-Control-Allow-Origin": "*",
    // Allow POST for actual work, OPTIONS for preflight.
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    // Let the client send auth and content headers.
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };
}

// Flow: validate -> creds -> (optional delete) -> register -> save secret -> respond.
// Business goal: create a trusted link between an app user and their brokerage data.
serve(async (req) => {
  // SnapTrade user registration entrypoint.
  // Business goal: issue a SnapTrade userSecret so the app can fetch holdings later.

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    // Business goal: let the browser confirm it is allowed to call this endpoint.
    // Preflight returns immediately with CORS headers.
    return new Response("ok", { headers: corsHeaders() });
  }

  // Require auth header.
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    // Business goal: block anonymous calls that could create orphan SnapTrade users.
    // Reject unauthenticated calls.
    return new Response(JSON.stringify({ code: 401, message: "Missing authorization header" }), {
      status: 401,
      headers: corsHeaders(),
    });
  }

  // Load integration secrets.
  // SnapTrade credentials (used to talk to SnapTrade).
  const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");
  // Supabase credentials (used to store user secrets).
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Fail fast if config is missing.
  if (!SNAPTRADE_CLIENT_ID || !SNAPTRADE_CONSUMER_KEY) {
    // Business goal: fail loudly so onboarding catches missing vendor setup.
    // Configuration error: cannot call SnapTrade.
    return new Response(
      JSON.stringify({
        error: "Missing SnapTrade credentials in Edge Function environment",
        hasClientId: !!SNAPTRADE_CLIENT_ID,
        hasConsumerKey: !!SNAPTRADE_CONSUMER_KEY,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    // Business goal: avoid creating a SnapTrade user without saving the secret.
    // Configuration error: cannot write to database.
    return new Response(
      JSON.stringify({
        error: "Missing Supabase service role credentials in Edge Function environment",
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      }
    );
  }

  // Read inputs: userId (email). Force is always on.
  // userId maps the app user to a SnapTrade user.
  let userId = null;
  // force controls delete + re-register.
  let force = true;
  try {
    // Parse JSON body.
    const body = await req.json();
    // Extract required + optional fields.
    userId = body.userId;
  } catch {
    // Business goal: require a structured request before doing any vendor calls.
    // Body must be valid JSON.
    return new Response(JSON.stringify({ error: "Missing or invalid request body" }), {
      status: 400,
      headers: corsHeaders(),
    });
  }
  // userId is required.
  if (!userId) {
    // Business goal: ensure we can tie the SnapTrade account to a real user.
    // Missing required identifier.
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 400,
      headers: corsHeaders(),
    });
  }

  // DB client (service role).
  // Service role is required to update the users table.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Register user + persist secret.
  try {
    // Initialize SnapTrade SDK.
    const snaptrade = new Snaptrade({
      clientId: SNAPTRADE_CLIENT_ID,
      consumerKey: SNAPTRADE_CONSUMER_KEY,
    });

    if (force) {
      // Business goal: recover from a broken or stale SnapTrade link.
      // Force re-register by deleting the existing SnapTrade user.
      // If force=true, reset the SnapTrade user so a fresh secret is generated.
      try {
        // Ignore if the user does not exist.
        await snaptrade.authentication.deleteSnapTradeUser({ userId });
      } catch (deleteError) {
        // Non-404 failures should abort the flow.
        const deleteStatus = deleteError?.response?.status;
        const deleteData = deleteError?.response?.data;
        if (deleteStatus && deleteStatus !== 404) {
          // Business goal: surface vendor failure so support can resolve it.
          return new Response(
            JSON.stringify({
              error: "Failed to delete existing SnapTrade user before re-registering",
              code: "USER_DELETE_FAILED",
              deleteStatus,
              deleteData,
            }),
            {
              status: deleteStatus,
              headers: { "Content-Type": "application/json", ...corsHeaders() },
            }
          );
        }
        if (!deleteStatus) {
          // Business goal: avoid silent failures on vendor delete.
          // No upstream status means an unexpected SDK error.
          return new Response(
            JSON.stringify({
              error: "Failed to delete existing SnapTrade user before re-registering",
              code: "USER_DELETE_FAILED",
              deleteData,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders() },
            }
          );
        }
      }
    }

    // Register with SnapTrade -> userSecret.
    // SnapTrade returns a userSecret needed for future API calls.
    // Business goal: obtain the credential that unlocks brokerage data access.
    const response = await snaptrade.authentication.registerSnapTradeUser({ userId });

    // Find app user row.
    // We store the secret in the app's users table.
    // Business goal: persist the secret so the app can reconnect later.
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("id")
      .eq("email", userId)
      .maybeSingle();

    if (selectError) {
      // Business goal: stop to prevent a partially-onboarded user.
      // Query failed; stop to avoid losing the secret.
      return new Response(
        JSON.stringify({
          error: "Failed to lookup user row before saving snapusersecret",
          details: selectError,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        }
      );
    }

    // Save secret on existing row.
    if (existingUser?.id) {
      // Business goal: keep the user in one record, update the secret in place.
      // Update path: user row already exists.
      // If the user row exists, update it with the SnapTrade secret.
      const { error: updateError } = await supabase
        .from("users")
        .update({ snapusersecret: response.data.userSecret })
        .eq("id", existingUser.id);

      if (updateError) {
        // Business goal: signal that onboarding is incomplete despite vendor success.
        // SnapTrade succeeded but database update failed.
        return new Response(
          JSON.stringify({
            error: "Registered user but failed to update snapusersecret",
            details: updateError,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
          }
        );
      }
    } else {
      // Create user row if missing.
      // Insert path: user row does not exist yet.
      // If no user row exists, fetch the auth user and insert a new row.
      // Business goal: keep auth + profile data aligned.
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(
        userId
      );

      if (authError || !authUser?.user?.id) {
        // Business goal: avoid a profile row without a valid auth identity.
        // We cannot insert a user row without an auth user id.
        return new Response(
          JSON.stringify({
            error: "Registered user but could not find auth user to insert row",
            details: authError,
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
          }
        );
      }

      // Insert a new row with the secret.
      // Business goal: establish the first user profile record.
      const { error: insertError } = await supabase.from("users").insert({
        id: authUser.user.id,
        email: userId,
        snapusersecret: response.data.userSecret,
      });

      if (insertError) {
        // Business goal: alert support to data integrity issues.
        // SnapTrade succeeded but insert failed.
        return new Response(
          JSON.stringify({
            error: "Registered user but failed to insert snapusersecret",
            details: insertError,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
          }
        );
      }
    }

    // Return SnapTrade data.
    // Client can proceed with SnapTrade flow using this response.
    // Business goal: let the UI immediately guide the user into brokerage linking.
    return new Response(JSON.stringify(response.data), {
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  } catch (err) {
    // Normalize SnapTrade errors.
    // SnapTrade SDK wraps axios errors with response metadata.
    // Business goal: return consistent errors the UI can interpret.
    const e = err as any;
    const upstreamStatus = e?.response?.status;
    const upstreamData = e?.response?.data;
    const upstreamHeaders = e?.response?.headers;

    if (upstreamStatus === 400) {
      // Conflict: user exists unless forced.
      // Treat this as a 409 conflict for the client.
      // Business goal: let the UI decide between retry, force, or support.
      return new Response(
        JSON.stringify({
          error: e?.message || "User already exists",
          code: force ? "USER_REGISTER_FAILED" : "USER_ALREADY_EXISTS",
          upstreamStatus,
          upstreamData,
          upstreamHeaders,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        }
      );
    }

    // Any other upstream error becomes a 5xx (or upstream status).
    // Business goal: surface vendor instability while preserving diagnostics.
    return new Response(
      JSON.stringify({
        error: e?.message || String(e),
        upstreamStatus,
        upstreamData,
        upstreamHeaders,
      }),
      {
        status: upstreamStatus || 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      }
    );
  }
});
