import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createStructuredLogger } from "../_shared/logging.ts";
import { createCorsHeaders, createJsonResponder, parseAllowedOrigins } from "../_shared/http.ts";

// Business purpose: fetch one TSX issuer's latest annual financial statements from Atlantis
// Data Solutions for the Balance Sheet and Income Statement reports. The Atlantis API key
// stays here. Nothing is read from or written to the database; the browser caches the result.
const ATLANTIS_BASE_URL = "https://atlantisdatasolutions.com/v1/ca/company";
const SUPPORTED_PERIOD = "annual";
const TICKER_PATTERN = /^[A-Z0-9]{1,8}([.-][A-Z0-9]{1,3})?$/;

const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const buildCorsHeaders = createCorsHeaders(ALLOWED_ORIGINS, {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

// Atlantis resolves "<symbol>.TO" only for companies it lists under their TSX symbol. It files
// other TSX-listed companies under a US ticker, and a bare ticker can be ambiguous (MGA is both
// Magna and Mega Uranium), so those are matched by LEI or page slug and confirmed by name.
const TSX_ALIASES: Record<string, { id: string; name: string }> = {
  ABX: { id: "0O4KBQCJZX82UKGCBV73", name: "Barrick Gold" },
  AQN: { id: "549300K5VIUTJXQL7X75", name: "Algonquin Power & Utilities" },
  BCE: { id: "5493001I9203PRB5KR45", name: "BCE Inc." },
  CNR: { id: "3SU7BEP7TH9YEQOZCS77", name: "Canadian National Railway" },
  K: { id: "254900O9KHF2A1ZXPT47", name: "Kinross Gold" },
  MG: { id: "95RWVLFZX6VGDZNNTN43", name: "Magna International" },
  OTEX: { id: "OTEX", name: "OpenText" },
  QSR: { id: "5299009RXTX9DN9AKJ98", name: "Restaurant Brands International" },
  "RCI.A": { id: "5493000M6Z4XFIP6PF03", name: "Rogers Communications" },
  "RCI.B": { id: "5493000M6Z4XFIP6PF03", name: "Rogers Communications" },
  T: { id: "894500TX134IMF6NW757", name: "Telus" },
  "TECK.A": { id: "T8KI5SQ2JRWHL7XY0E11", name: "Teck Resources" },
  "TECK.B": { id: "T8KI5SQ2JRWHL7XY0E11", name: "Teck Resources" },
};

// The statement lines both reports use, the two values shares outstanding is derived from, and
// interest income, which tells the app when a company reports the way a bank does.
const VALUE_KEYS = [
  "total_assets",
  "total_liabilities",
  "total_equity",
  "cash_and_equivalents",
  "revenue",
  "gross_profit",
  "operating_income",
  "net_income",
  "interest_income",
  "market_cap",
  "share_price",
] as const;

type AtlantisPeriod = {
  period_type?: string;
  period_end?: string;
  fiscal_year?: number;
  currency?: string;
  values?: Record<string, unknown>;
};

function latestAnnualPeriod(periods: AtlantisPeriod[]): AtlantisPeriod | null {
  return (
    periods
      .filter((period) => period?.period_type === SUPPORTED_PERIOD && period.period_end)
      .sort((a, b) => String(b.period_end).localeCompare(String(a.period_end)))[0] ?? null
  );
}

const toNumberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

serve(async (req: Request) => {
  const logger = createStructuredLogger("atlantis-financials");
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

  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") ?? "").trim().toUpperCase();
  const period = (url.searchParams.get("period") ?? SUPPORTED_PERIOD).trim().toLowerCase();

  if (!TICKER_PATTERN.test(ticker)) {
    return json(400, { error: "A valid TSX ticker is required" });
  }
  if (period !== SUPPORTED_PERIOD) {
    return json(400, { error: "Only the annual reporting period is supported" });
  }

  const apiKey = Deno.env.get("ATLANTIS_API_KEY") ?? "";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["X-API-Key"] = apiKey;

  const alias = TSX_ALIASES[ticker];
  const companyId = alias ? alias.id : `${ticker.replace(".", "-")}.TO`;

  let upstream: Response;
  try {
    upstream = await fetch(
      `${ATLANTIS_BASE_URL}/${encodeURIComponent(companyId)}/ratios?period=${SUPPORTED_PERIOD}`,
      { headers }
    );
  } catch (error: unknown) {
    logger.error("S0", "Atlantis request failed before a response", {
      ticker,
      message: String((error as { message?: string })?.message ?? error),
    });
    return json(502, { error: "Could not reach Atlantis Data Solutions" });
  }

  const notCovered = { available: false, reason: "not_covered", ticker, period };

  if (upstream.status === 404) {
    logger.info("S1", "Atlantis does not cover this issuer", { ticker });
    return json(200, notCovered);
  }

  if (!upstream.ok) {
    logger.error("S2", "Atlantis returned an error", { ticker, status: upstream.status });
    const retryAfter = upstream.headers.get("retry-after");
    return new Response(JSON.stringify({ error: "Atlantis Data Solutions request failed" }), {
      status: upstream.status === 429 ? 429 : 502,
      headers: {
        ...buildCorsHeaders(req),
        "Content-Type": "application/json",
        ...(retryAfter ? { "Retry-After": retryAfter } : {}),
      },
    });
  }

  let body: { name?: string; currency?: string; periods?: AtlantisPeriod[] } | null = null;
  try {
    body = await upstream.json();
  } catch {
    body = null;
  }
  if (!body) {
    logger.error("S3", "Atlantis returned a body that is not JSON", { ticker });
    return json(502, { error: "Atlantis Data Solutions returned an unreadable response" });
  }

  if (alias && String(body.name ?? "").toLowerCase() !== alias.name.toLowerCase()) {
    logger.warn("S4", "Alias resolved to a different company than expected", {
      ticker,
      expected: alias.name,
      received: body.name ?? null,
    });
    return json(200, notCovered);
  }

  const latest = latestAnnualPeriod(Array.isArray(body.periods) ? body.periods : []);
  if (!latest) {
    logger.info("S5", "Atlantis has no annual period for this issuer", { ticker });
    return json(200, { ...notCovered, reason: "no_annual_period" });
  }

  const values = Object.fromEntries(
    VALUE_KEYS.map((key) => [key, toNumberOrNull(latest.values?.[key])])
  );

  logger.info("S6", "Returned Atlantis financial statements", {
    ticker,
    periodEnd: latest.period_end,
  });

  return json(200, {
    available: true,
    ticker,
    period,
    name: body.name ?? null,
    currency: latest.currency ?? body.currency ?? null,
    fiscalYear: latest.fiscal_year ?? null,
    periodEnd: latest.period_end,
    values,
    source: "Atlantis Data Solutions",
  });
});
