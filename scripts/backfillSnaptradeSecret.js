#!/usr/bin/env node

const args = process.argv.slice(2);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
};

const email = getArgValue("--email");
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!email) {
  console.error("Missing --email argument.");
  console.error("Usage: node scripts/backfillSnaptradeSecret.js --email user@example.com");
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase env vars.");
  console.error("Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const endpoint = `${supabaseUrl}/functions/v1/snaptrade-register-user`;

const run = async () => {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ userId: email, force: true }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Backfill failed:", res.status, res.statusText);
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log("Backfill succeeded:");
  console.log(JSON.stringify(body, null, 2));
};

run().catch((err) => {
  console.error("Backfill failed:", err?.message || err);
  process.exit(1);
});
