import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY."
  );
}

// Workspace sign-in (Google/Microsoft/LinkedIn) uses Supabase Auth directly, so
// the session must persist and the OAuth redirect must be parsed from the URL.
// This is additive: the pre-existing subscription login (useAuthStore,
// authenticate-user Edge Function) does not read this session and is unaffected.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "dashboard" },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});