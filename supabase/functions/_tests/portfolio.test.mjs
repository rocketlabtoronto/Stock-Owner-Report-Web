import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeKey, slugify, resolveInstitutionAlias, resolveExchangeAlias, resolveOrCreateInstitution, resolveOrCreateExchange, tickerExistsForExchange } from "../_shared/portfolio-directory.ts";
import { resolveAuthenticatedCaller } from "../_shared/workspace-auth.ts";
import { loadWorkspaceHoldings } from "../_shared/workspace-holdings.ts";

// Minimal fake Supabase table client: enough chainable surface for the shared
// helpers (select/eq/ilike/in/maybeSingle/upsert) without a live database.
function makeTable(rows, { onUpsert } = {}) {
  function query(initialRows) {
    let result = initialRows;
    const builder = {
      select: () => builder,
      eq: (column, value) => {
        result = result.filter((row) => String(row[column]) === String(value));
        return builder;
      },
      ilike: (column, value) => {
        result = result.filter(
          (row) => String(row[column]).toLowerCase() === String(value).toLowerCase()
        );
        return builder;
      },
      in: (column, values) => {
        result = result.filter((row) => values.includes(row[column]));
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => ({ data: result[0] ?? null, error: null }),
      single: async () => ({ data: result[0] ?? null, error: result[0] ? null : { message: "not found" } }),
      then: (resolve) => resolve({ data: result, error: null }),
    };
    return builder;
  }
  return {
    from: (table) => ({
      select: () => query([...(rows[table] ?? [])]),
      upsert: (value) => {
        onUpsert?.(table, value);
        const values = Array.isArray(value) ? value : [value];
        rows[table] = rows[table] ?? [];
        rows[table].push(...values);
        return { select: () => query(values), ...query(values) };
      },
    }),
  };
}

test("normalizeKey/slugify collapse spelling, casing, and spacing differences", () => {
  assert.equal(normalizeKey("  BOFA  "), "bofa");
  assert.equal(normalizeKey("Bank   of   America"), "bank of america");
  assert.equal(slugify("Bank of America"), "bank_of_america");
  assert.equal(slugify("   "), "institution");
});

test("resolveInstitutionAlias matches via alias table or display name, never invents rows", async () => {
  const supabase = makeTable({
    financial_institution_aliases: [{ alias: "bofa", institution_code: "merrill_edge" }],
    financial_institutions: [{ code: "merrill_edge", display_name: "Merrill Edge" }],
  });
  const viaAlias = await resolveInstitutionAlias(supabase, "BOFA");
  assert.deepEqual(viaAlias, { code: "merrill_edge", displayName: "Merrill Edge", matched: true });

  const viaDisplayName = await resolveInstitutionAlias(supabase, "merrill edge");
  assert.equal(viaDisplayName.code, "merrill_edge");

  const unmatched = await resolveInstitutionAlias(supabase, "Totally Unknown Bank");
  assert.equal(unmatched, null);
});

test("resolveExchangeAlias resolves NYSE/New York Stock Exchange to the same code", async () => {
  const supabase = makeTable({
    exchange_aliases: [
      { alias: "nyse", exchange_code: "NYSE" },
      { alias: "new york stock exchange", exchange_code: "NYSE" },
    ],
    exchanges: [{ code: "NYSE", display_name: "New York Stock Exchange" }],
  });
  const first = await resolveExchangeAlias(supabase, "NYSE");
  const second = await resolveExchangeAlias(supabase, "New York Stock Exchange");
  assert.equal(first.code, "NYSE");
  assert.equal(second.code, "NYSE");
});

test("resolveOrCreateInstitution registers an unrecognized brokerage instead of rejecting it", async () => {
  const rows = { financial_institution_aliases: [], financial_institutions: [] };
  const upserts = [];
  const supabase = makeTable(rows, { onUpsert: (table, value) => upserts.push({ table, value }) });

  const result = await resolveOrCreateInstitution(supabase, "Brand New Brokerage Inc.");
  assert.equal(result.matched, false);
  assert.equal(result.code, "brand_new_brokerage_inc");
  assert.equal(result.displayName, "Brand New Brokerage Inc.");
  assert.ok(upserts.some((u) => u.table === "financial_institutions"));
  assert.ok(upserts.some((u) => u.table === "financial_institution_aliases"));
});

test("tickerExistsForExchange checks dashboard data for NASDAQ/NYSE and ticker_directory elsewhere", async () => {
  const publicClient = makeTable({
    ticker_directory: [{ exchange_code: "TSX", ticker: "RY" }],
  });
  const dashboardClient = makeTable({
    financials: [{ ticker: "AAPL" }],
    stock_prices: [{ symbol: "MSFT" }],
  });

  assert.equal(await tickerExistsForExchange(publicClient, dashboardClient, "NASDAQ", "AAPL"), true);
  assert.equal(await tickerExistsForExchange(publicClient, dashboardClient, "NYSE", "MSFT"), true);
  assert.equal(await tickerExistsForExchange(publicClient, dashboardClient, "NASDAQ", "NOPE"), false);
  assert.equal(await tickerExistsForExchange(publicClient, dashboardClient, "TSX", "RY"), true);
  assert.equal(await tickerExistsForExchange(publicClient, dashboardClient, "TSX", "ZZZ"), false);
});

test("resolveAuthenticatedCaller requires a bearer token that Supabase Auth accepts", async () => {
  const supabase = {
    auth: {
      getUser: async (jwt) =>
        jwt === "good-token"
          ? { data: { user: { id: "u1", email: "user@example.test", app_metadata: { provider: "google" } } }, error: null }
          : { data: null, error: new Error("invalid") },
    },
  };
  const withAuth = new Request("https://functions.example.test", {
    headers: { authorization: "Bearer good-token" },
  });
  const caller = await resolveAuthenticatedCaller(withAuth, supabase);
  assert.deepEqual(caller, { userId: "u1", email: "user@example.test", provider: "google" });

  const noHeader = new Request("https://functions.example.test");
  assert.equal(await resolveAuthenticatedCaller(noHeader, supabase), null);

  const badToken = new Request("https://functions.example.test", {
    headers: { authorization: "Bearer bad-token" },
  });
  assert.equal(await resolveAuthenticatedCaller(badToken, supabase), null);
});

test("loadWorkspaceHoldings groups holdings under their account in the app's Account/bank/holdings shape", async () => {
  const supabase = {
    from: (table) => {
      if (table === "workspace_accounts") {
        return {
          select: () => ({
            eq: async () => ({
              data: [
                {
                  id: "acct-1",
                  account_name: "Personal TFSA",
                  institution_code: "questrade",
                  financial_institutions: { display_name: "Questrade" },
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "workspace_holdings") {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: "holding-1",
                  account_id: "acct-1",
                  exchange_code: "TSX",
                  ticker: "RY",
                  quantity: 25,
                  source: "excel_upload",
                },
              ],
              error: null,
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };

  const accounts = await loadWorkspaceHoldings(supabase, "workspace-1");
  assert.deepEqual(accounts, [
    {
      Account: "Questrade - Personal TFSA",
      bank: "questrade",
      accountId: "acct-1",
      accountName: "Personal TFSA",
      institutionCode: "questrade",
      holdings: [
        {
          Symbol: "RY",
          Market: "TSX",
          Quantity: "25",
          workspaceHoldingId: "holding-1",
          source: "excel_upload",
        },
      ],
    },
  ]);
});
