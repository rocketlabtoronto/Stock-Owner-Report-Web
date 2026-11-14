import { balanceSheet, incomeStatement } from "./reports";
import {
  createFinancialRow,
  getAccountHoldings,
  getDefaultAccount,
  getFinancialAccounts,
  loadFinancialRows,
} from "./financialStatementModel";

const financial = (tag, value, fy_end_date = "2025-12-31") => ({ tag, value, fy_end_date });
const holding = { Symbol: "TEST", Quantity: "10", Market: "NASDAQ" };

test("balance sheet uses each tag's latest non-null value and preserves money rounding", () => {
  expect(
    createFinancialRow(
      holding,
      [
        financial("SharesOutstanding", 10000),
        financial("Assets", 10000, "2024-12-31"),
        financial("Assets", 20000),
        financial("Assets", null, "2026-12-31"),
        financial("Equity", -100),
        financial("Liabilities", -1600),
        financial("UnrelatedTag", 999999),
      ],
      balanceSheet
    )
  ).toEqual({
    Company: "TEST (TEST)",
    "Ownership Share": "1 in 1.00K",
    Assets: "$20",
    Equity: "$0",
    "Cash & Equivalents": "N/A",
    Liabilities: "-$2",
  });
});

test("income statement maps all report fields and uses millions for large ownership ratios", () => {
  expect(
    createFinancialRow(
      holding,
      [
        financial("SharesOutstanding", 20_000_000),
        financial("Revenue", 20_000_000),
        financial("GrossProfit", 10_000_000),
        financial("OperatingProfit", 6_000_000),
        financial("NetIncome", 0),
      ],
      incomeStatement
    )
  ).toEqual({
    Company: "TEST (TEST)",
    "Ownership Share": "1 in 2.00M",
    Revenue: "$10",
    "Gross Profit": "$5",
    "Operating Profit": "$3",
    "Net Income": "$0",
  });
});

test.each([0, -1, null, "invalid"])(
  "invalid shares %s retain the holding with N/A fields",
  (shares) => {
    const row = createFinancialRow(
      holding,
      [financial("SharesOutstanding", shares), financial("Assets", 20000)],
      balanceSheet
    );
    expect(row.Company).toBe("TEST (TEST)");
    expect(Object.values(row).slice(1)).toEqual(Array(5).fill("N/A"));
  }
);

test.each([[], null, undefined])("missing financial data retains an N/A row", (financials) => {
  expect(createFinancialRow(holding, financials, incomeStatement).Revenue).toBe("N/A");
});

test("account selection normalizes markets, excludes empty holdings, and prefers supported accounts", () => {
  const getLogo = jest.fn((bank) => `/logos/${bank}.png`);
  const accounts = getFinancialAccounts(
    [
      { Account: "Empty", holdings: [] },
      {
        Account: "Unsupported - 123",
        bank: "TD",
        holdings: [{ Market: "TSX" }, { market: "tsx" }],
      },
      { Account: "Supported - 456", bank: "RBC", holdings: [{ ...holding, Market: " nasdaq " }] },
      { Account: "Unknown market", holdings: [{ Symbol: "NONE" }] },
    ],
    getLogo
  );
  expect(accounts).toHaveLength(3);
  expect(accounts[0]).toMatchObject({
    isAvailable: false,
    disallowedMarkets: ["TSX"],
    logo: "/logos/TD.png",
  });
  expect(accounts[1]).toMatchObject({
    brokerageName: "Supported",
    accountNumber: "456",
    isAvailable: true,
  });
  expect(accounts[2].isAvailable).toBe(false);
  expect(getDefaultAccount(accounts)).toBe(accounts[1]);
  expect(getAccountHoldings(accounts)).toBe(accounts[1].holdings);
  expect(getAccountHoldings(accounts, "Unsupported - 123")).toBe(accounts[0].holdings);
  expect(getAccountHoldings(accounts, "missing")).toEqual([]);
  expect(getDefaultAccount([accounts[0]])).toBe(accounts[0]);
  expect(getAccountHoldings([])).toEqual([]);
});

test("loading preserves holding order, skips invalid quantities, and reuses each ticker request", async () => {
  const getFinancials = jest
    .fn()
    .mockResolvedValue([financial("SharesOutstanding", 10000), financial("Assets", 20000)]);
  const rows = await loadFinancialRows(
    [
      holding,
      { ...holding, Quantity: "20" },
      { Symbol: "ZERO", Quantity: 0 },
      { Symbol: "SHORT", Quantity: -10 },
      { Symbol: "INVALID", Quantity: "unknown" },
    ],
    balanceSheet,
    getFinancials
  );
  expect(getFinancials).toHaveBeenCalledTimes(1);
  expect(getFinancials).toHaveBeenCalledWith({ ticker: "TEST" });
  expect(rows.map((row) => row.Assets)).toEqual(["$20", "$40", "N/A", "N/A", "N/A"]);
});

test("a failed ticker produces an N/A row without discarding successful holdings", async () => {
  const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
  const getFinancials = jest.fn(({ ticker }) =>
    ticker === "FAIL"
      ? Promise.reject(new Error("network unavailable"))
      : Promise.resolve([financial("SharesOutstanding", 10000), financial("Assets", 20000)])
  );
  try {
    const rows = await loadFinancialRows(
      [holding, { ...holding, Symbol: "FAIL" }],
      balanceSheet,
      getFinancials
    );
    expect(rows.map((row) => row.Assets)).toEqual(["$20", "N/A"]);
    expect(rows[1].Company).toBe("FAIL (FAIL)");
  } finally {
    errorLog.mockRestore();
  }
});
