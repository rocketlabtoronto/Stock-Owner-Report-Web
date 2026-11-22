// Business purpose: normalize brokerage/exchange names from Excel uploads and
// brokerage connections against SOR's canonical financial_institutions/exchanges
// tables, so both import paths use the same identifiers (e.g. "BOFA" and
// "Bank of America" resolve to the same institution code).
type QueryClient = {
  from: (table: string) => any;
};

export const normalizeKey = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const slugify = (value: unknown): string => {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "institution";
};

export type ResolvedDirectoryEntry = {
  code: string;
  displayName: string;
  matched: boolean;
};

// Strict lookup used for Excel upload review: only resolves against the
// curated alias/canonical tables, never invents new institutions so the
// Review Upload Issues dropdown stays a bounded, supported list.
export async function resolveInstitutionAlias(
  supabase: QueryClient,
  raw: string
): Promise<ResolvedDirectoryEntry | null> {
  const key = normalizeKey(raw);
  if (!key) return null;

  const { data: alias } = await supabase
    .from("financial_institution_aliases")
    .select("institution_code")
    .eq("alias", key)
    .maybeSingle();

  const code = alias?.institution_code;
  if (code) {
    const { data: institution } = await supabase
      .from("financial_institutions")
      .select("code, display_name")
      .eq("code", code)
      .maybeSingle();
    if (institution) return { code: institution.code, displayName: institution.display_name, matched: true };
  }

  const { data: direct } = await supabase
    .from("financial_institutions")
    .select("code, display_name")
    .ilike("display_name", raw.trim())
    .maybeSingle();
  if (direct) return { code: direct.code, displayName: direct.display_name, matched: true };

  return null;
}

export async function resolveExchangeAlias(
  supabase: QueryClient,
  raw: string
): Promise<ResolvedDirectoryEntry | null> {
  const key = normalizeKey(raw);
  if (!key) return null;

  const { data: alias } = await supabase
    .from("exchange_aliases")
    .select("exchange_code")
    .eq("alias", key)
    .maybeSingle();

  const code = alias?.exchange_code;
  if (code) {
    const { data: exchange } = await supabase
      .from("exchanges")
      .select("code, display_name")
      .eq("code", code)
      .maybeSingle();
    if (exchange) return { code: exchange.code, displayName: exchange.display_name, matched: true };
  }

  const { data: direct } = await supabase
    .from("exchanges")
    .select("code, display_name")
    .ilike("display_name", raw.trim())
    .maybeSingle();
  if (direct) return { code: direct.code, displayName: direct.display_name, matched: true };

  return null;
}

// Lenient lookup used for brokerage connections (SnapTrade / manual CSV):
// these already come from a vetted integration rather than free-text entry,
// so an unrecognized institution/exchange is registered instead of rejected.
export async function resolveOrCreateInstitution(
  supabase: QueryClient,
  raw: string
): Promise<ResolvedDirectoryEntry> {
  const found = await resolveInstitutionAlias(supabase, raw);
  if (found) return found;

  const displayName = String(raw || "").trim() || "Unknown Brokerage";
  const code = slugify(displayName);

  await supabase
    .from("financial_institutions")
    .upsert({ code, display_name: displayName }, { onConflict: "code", ignoreDuplicates: true });
  await supabase
    .from("financial_institution_aliases")
    .upsert(
      { alias: normalizeKey(displayName), institution_code: code },
      { onConflict: "alias", ignoreDuplicates: true }
    );

  return { code, displayName, matched: false };
}

export async function resolveOrCreateExchange(
  supabase: QueryClient,
  raw: string
): Promise<ResolvedDirectoryEntry> {
  const found = await resolveExchangeAlias(supabase, raw);
  if (found) return found;

  const displayName = String(raw || "").trim() || "Unknown Exchange";
  const code = slugify(displayName).toUpperCase();

  await supabase
    .from("exchanges")
    .upsert({ code, display_name: displayName }, { onConflict: "code", ignoreDuplicates: true });
  await supabase
    .from("exchange_aliases")
    .upsert(
      { alias: normalizeKey(displayName), exchange_code: code },
      { onConflict: "alias", ignoreDuplicates: true }
    );

  return { code, displayName, matched: false };
}

// NASDAQ/NYSE tickers are validated against the existing dashboard.financials /
// dashboard.stock_prices data (both exchanges share the same "US" ticker pool
// today); other exchanges (e.g. TSX) use the dedicated public.ticker_directory
// table, since dashboard and public are separate schemas/clients.
export async function tickerExistsForExchange(
  publicClient: QueryClient,
  dashboardClient: QueryClient,
  exchangeCode: string,
  ticker: string
): Promise<boolean> {
  const symbol = String(ticker || "")
    .trim()
    .toUpperCase();
  if (!symbol) return false;

  if (exchangeCode === "NASDAQ" || exchangeCode === "NYSE") {
    const { data: financial } = await dashboardClient
      .from("financials")
      .select("ticker")
      .eq("ticker", symbol)
      .limit(1)
      .maybeSingle();
    if (financial) return true;

    const { data: price } = await dashboardClient
      .from("stock_prices")
      .select("symbol")
      .eq("symbol", symbol)
      .limit(1)
      .maybeSingle();
    return Boolean(price);
  }

  const { data: directoryEntry } = await publicClient
    .from("ticker_directory")
    .select("ticker")
    .eq("exchange_code", exchangeCode)
    .eq("ticker", symbol)
    .maybeSingle();
  return Boolean(directoryEntry);
}
