const statements = (overrides = {}) => ({
  available: true,
  ticker: "RY",
  period: "annual",
  name: "Royal Bank Of Canada",
  currency: "CAD",
  fiscalYear: 2025,
  periodEnd: "2025-10-31",
  values: {
    total_assets: 2000,
    total_liabilities: 1500,
    total_equity: 500,
    cash_and_equivalents: 100,
    revenue: 800,
    gross_profit: null,
    operating_income: null,
    net_income: 200,
    market_cap: 20000,
    share_price: 50,
  },
  ...overrides,
});

const respondWith = (body, ok = true, status = 200) =>
  Promise.resolve({ ok, status, json: () => Promise.resolve(body) });

// A page refresh keeps sessionStorage but starts the module, and its in-memory state, afresh.
const loadServiceAfterPageLoad = () => {
  jest.resetModules();
  return require("./atlantisService");
};

// jest.resetModules() clears mock functions stored on the global object, so the mock is kept
// here and global.fetch only forwards to it.
const fetchMock = jest.fn();

beforeEach(() => {
  window.sessionStorage.clear();
  fetchMock.mockImplementation(() => respondWith(statements()));
  global.fetch = (...args) => fetchMock(...args);
});

test("fetches an issuer once and reuses it for other accounts, tabs, edits and page refreshes", async () => {
  let service = loadServiceAfterPageLoad();
  const [first, second] = await Promise.all([
    service.getTsxStatements("ry"),
    service.getTsxStatements(" RY "),
  ]);
  expect(second).toEqual(first);
  await service.getTsxStatements("RY");
  // A brokerage connection reports the same issuer as "RY.TO".
  await service.getTsxStatements("RY.TO");
  expect(service.atlantisCacheKey("RCI-B.TO")).toBe(service.atlantisCacheKey("RCI.B"));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toMatch(/atlantis-financials\?ticker=RY&period=annual$/);
  expect(JSON.parse(window.sessionStorage.getItem(service.atlantisCacheKey("RY", "annual")))).toEqual(
    statements()
  );

  service = loadServiceAfterPageLoad();
  expect(await service.getTsxStatements("RY")).toEqual(statements());
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await service.getTsxStatements("TD");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("a failed request is not cached, and an issuer Atlantis does not cover is remembered", async () => {
  const service = loadServiceAfterPageLoad();
  fetchMock.mockImplementationOnce(() => respondWith({ error: "rate limited" }, false, 429));
  await expect(service.getTsxStatements("RY")).rejects.toThrow("429");
  expect(window.sessionStorage.length).toBe(0);
  await expect(service.getTsxStatements("RY")).resolves.toEqual(statements());

  const notCovered = { available: false, reason: "not_covered", ticker: "ZZZ", period: "annual" };
  fetchMock.mockImplementation(() => respondWith(notCovered));
  expect(await service.default.getFinancials({ ticker: "ZZZ" })).toEqual({ financials: [] });
  await service.getTsxStatements("ZZZ");
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test("maps statement lines to report tags and derives shares outstanding from market cap and price", () => {
  const { toCompanyFinancials } = loadServiceAfterPageLoad();
  const { financials, currency, companyName } = toCompanyFinancials(statements());
  expect({ currency, companyName }).toEqual({ currency: "CAD", companyName: "Royal Bank Of Canada" });
  expect(Object.fromEntries(financials.map(({ tag, value }) => [tag, value]))).toEqual({
    Assets: 2000,
    Liabilities: 1500,
    Equity: 500,
    CashAndEquivalents: 100,
    Revenue: 800,
    NetIncome: 200,
    SharesOutstanding: 400,
  });
  expect(financials.every(({ fy_end_date }) => fy_end_date === "2025-10-31")).toBe(true);

  const withoutPrice = statements({ values: { ...statements().values, share_price: null } });
  expect(toCompanyFinancials(withoutPrice).financials.map(({ tag }) => tag)).not.toContain(
    "SharesOutstanding"
  );
});

test("a company is treated as a bank only when interest earned exceeds revenue and it reports neither profit line", () => {
  const { toCompanyFinancials } = loadServiceAfterPageLoad();
  const withValues = (values) =>
    toCompanyFinancials(statements({ values: { ...statements().values, ...values } })).isBank;
  // Revenue 800, no gross profit or operating income (the fixture's defaults).
  expect(withValues({ interest_income: 1200 })).toBe(true);
  expect(withValues({})).toBe(false);
  expect(withValues({ interest_income: 600 })).toBe(false);
  expect(withValues({ interest_income: 1200, operating_income: 300 })).toBe(false);
  expect(withValues({ interest_income: 1200, gross_profit: 300 })).toBe(false);
});
