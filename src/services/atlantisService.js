// Fetches a TSX issuer's financial statements from Atlantis Data Solutions on demand, through
// the atlantis-financials Edge Function (the API key stays on the server). Nothing is saved to
// Supabase. Each answer is cached in sessionStorage by issuer and reporting period, so page
// refreshes, account tabs, and share-count edits reuse it without another Atlantis call.
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const REPORTING_PERIOD = "annual";
// Bump this when the function's answer gains a field, after the function is deployed, so
// answers cached from the older function are not reused. v3: answers include interest income.
const CACHE_PREFIX = "sor:atlantis:v3";

// Atlantis statement line -> the tag the report model reads (same tags as the U.S. data).
const TAG_BY_ATLANTIS_FIELD = {
  total_assets: "Assets",
  total_equity: "Equity",
  cash_and_equivalents: "CashAndEquivalents",
  total_liabilities: "Liabilities",
  revenue: "Revenue",
  gross_profit: "GrossProfit",
  operating_income: "OperatingProfit",
  net_income: "NetIncome",
};

const pendingRequests = new Map();
const memoryCache = new Map();

// Brokerage connections report TSX listings with a ".TO" suffix and may write class shares with
// a dash ("RY.TO", "RCI-B.TO"); uploads use the plain symbol ("RY", "RCI.B"). Both are one issuer.
const issuerOf = (ticker) =>
  String(ticker || "")
    .trim()
    .toUpperCase()
    .replace(/\.TO$/, "")
    .replace(/-/g, ".");

export const atlantisCacheKey = (ticker, period = REPORTING_PERIOD) =>
  `${CACHE_PREFIX}:${issuerOf(ticker)}:${period}`;

function readCache(key) {
  if (memoryCache.has(key)) return memoryCache.get(key);
  try {
    const stored = window.sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function writeCache(key, statements) {
  // Kept in memory as well, so the cache still works when sessionStorage is full or blocked.
  memoryCache.set(key, statements);
  try {
    window.sessionStorage.setItem(key, JSON.stringify(statements));
  } catch {
    // Reuse for this page load only.
  }
}

async function requestStatements(issuer, period) {
  const query = `ticker=${encodeURIComponent(issuer)}&period=${encodeURIComponent(period)}`;
  const response = await fetch(`${SUPABASE_URL}/functions/v1/atlantis-financials?${query}`, {
    method: "GET",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  // Only a completed answer is cached. A failed request is retried the next time it is needed.
  if (!response.ok) throw new Error(`Atlantis financial statements error: ${response.status}`);
  return response.json();
}

// Returns the Atlantis answer for one issuer and reporting period, from the cache when present.
export function getTsxStatements(ticker, period = REPORTING_PERIOD) {
  const issuer = issuerOf(ticker);
  const key = atlantisCacheKey(issuer, period);
  const cached = readCache(key);
  if (cached) return Promise.resolve(cached);

  // The same issuer in several accounts or rows shares one request.
  if (!pendingRequests.has(key)) {
    pendingRequests.set(
      key,
      requestStatements(issuer, period)
        .then((statements) => {
          writeCache(key, statements);
          return statements;
        })
        .finally(() => pendingRequests.delete(key))
    );
  }
  return pendingRequests.get(key);
}

// Atlantis has no industry field. A bank (or other lender) is recognised by its statement:
// interest earned exceeds total revenue, which is only possible when revenue is already net of
// the interest it pays, and it reports neither gross profit nor operating income.
export const reportsLikeABank = (values = {}) =>
  values.interest_income > 0 &&
  values.revenue > 0 &&
  values.interest_income > values.revenue &&
  values.gross_profit == null &&
  values.operating_income == null;

// Converts an Atlantis answer into what the report model consumes. Shares outstanding is not a
// statement line, so it is the period's market capitalisation divided by its share price; both
// are in the reporting currency. A missing value is left out and reported as unavailable.
export function toCompanyFinancials(statements) {
  if (!statements?.available) return { financials: [] };
  const { values = {}, periodEnd, currency, name } = statements;
  const financials = Object.entries(TAG_BY_ATLANTIS_FIELD)
    .filter(([field]) => values[field] != null)
    .map(([field, tag]) => ({ tag, value: values[field], fy_end_date: periodEnd }));
  if (values.market_cap > 0 && values.share_price > 0) {
    financials.push({
      tag: "SharesOutstanding",
      value: values.market_cap / values.share_price,
      fy_end_date: periodEnd,
    });
  }
  return {
    financials,
    currency: currency || undefined,
    companyName: name || undefined,
    isBank: reportsLikeABank(values),
  };
}

const atlantisService = {
  async getFinancials({ ticker }) {
    return toCompanyFinancials(await getTsxStatements(ticker));
  },
};

export default atlantisService;
