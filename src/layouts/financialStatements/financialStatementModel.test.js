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
    "Shares Owned": "10",
    "Ownership Share": "~ 1 in 1,000 shares",
    Assets: "$20",
    Equity: "$0",
    "Cash & Equivalents": "N/A",
    Liabilities: "-$2",
  });
});

test("income statement maps all report fields and writes large ownership ratios in full", () => {
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
    "Shares Owned": "10",
    "Ownership Share": "~ 1 in 2,000,000 shares",
    Revenue: "$10",
    "Gross Profit": "$5",
    "Operating Profit": "$3",
    "Net Income": "$0",
  });
});

test.each([balanceSheet, incomeStatement])(
  "both reports show shares owned and ownership share as separate columns with one rounding rule",
  (report) => {
    const outstanding = [financial("SharesOutstanding", 1_000_000)];
    expect(report.columns.slice(0, 3).map(({ name }) => name)).toEqual([
      "Company",
      "Shares Owned",
      "Ownership Share",
    ]);
    expect(createFinancialRow({ Symbol: "A", Quantity: "250" }, outstanding, report)).toMatchObject({
      "Shares Owned": "250",
      "Ownership Share": "~ 1 in 4,000 shares",
    });
    // A fractional holding is shown as a whole number but calculated on the exact quantity.
    expect(createFinancialRow({ Symbol: "A", Quantity: "8.5" }, outstanding, report)).toMatchObject({
      "Shares Owned": "9",
      "Ownership Share": "~ 1 in 117,647 shares",
    });
    // Shares owned is known even when the company's data is not.
    expect(createFinancialRow({ Symbol: "A", Quantity: "1250" }, null, report)).toMatchObject({
      "Shares Owned": "1,250",
      "Ownership Share": "N/A",
    });
  }
);

test.each([0, -1, null, "invalid"])(
  "invalid shares %s retain the holding with N/A fields",
  (shares) => {
    const row = createFinancialRow(
      holding,
      [financial("SharesOutstanding", shares), financial("Assets", 20000)],
      balanceSheet
    );
    expect(row.Company).toBe("TEST (TEST)");
    expect(row["Shares Owned"]).toBe("10");
    expect(Object.values(row).slice(2)).toEqual(Array(5).fill("N/A"));
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
        holdings: [{ Market: "LSE" }, { market: "lse" }],
      },
      { Account: "Supported - 456", bank: "RBC", holdings: [{ ...holding, Market: " nasdaq " }] },
      { Account: "Unknown market", holdings: [{ Symbol: "NONE" }] },
    ],
    getLogo
  );
  expect(accounts).toHaveLength(3);
  expect(accounts[0]).toMatchObject({
    isAvailable: false,
    disallowedMarkets: ["LSE"],
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
  expect(getFinancials).toHaveBeenCalledWith({ ticker: "TEST", exchange: "US" });
  expect(rows.map((row) => row.Assets)).toEqual(["$20", "$40", "N/A", "N/A", "N/A"]);
});

test("each account is its own report, even for the same ticker at the same institution and exchange", () => {
  const accounts = getFinancialAccounts(
    [
      { Account: "Questrade - Personal TFSA", holdings: [{ Symbol: "RY", Quantity: "25", Market: "TSX" }] },
      { Account: "Questrade - Spousal RRSP", holdings: [{ Symbol: "RY", Quantity: "10", Market: "TSX" }] },
      { Account: "Questrade - TFSA - Joint", holdings: [{ Symbol: "RY", Quantity: "5", Market: "NASDAQ" }] },
    ],
    () => "/logo.png"
  );
  expect(accounts.map(({ accountNumber, isAvailable }) => [accountNumber, isAvailable])).toEqual([
    ["Personal TFSA", true],
    ["Spousal RRSP", true],
    ["TFSA - Joint", true],
  ]);
  expect(getAccountHoldings(accounts, "Questrade - Spousal RRSP")).toEqual([
    { Symbol: "RY", Quantity: "10", Market: "TSX" },
  ]);
});

test("company data is requested for the holding's exchange, so a shared ticker is not mixed up", async () => {
  const getFinancials = jest.fn(({ exchange }) =>
    Promise.resolve(
      exchange === "US" ? [financial("SharesOutstanding", 10000), financial("Assets", 20000)] : []
    )
  );
  const rows = await loadFinancialRows(
    [
      { Symbol: "T", Quantity: "10", Market: "NYSE" },
      { Symbol: "T", Quantity: "10", Market: "TSX" },
      { Symbol: "T", Quantity: "10" },
    ],
    balanceSheet,
    getFinancials
  );
  expect(getFinancials.mock.calls.map(([filter]) => filter)).toEqual([
    { ticker: "T", exchange: "US" },
    { ticker: "T", exchange: "TSX" },
    { ticker: "T" },
  ]);
  expect(rows.map((row) => row.Assets)).toEqual(["$20", "N/A", "N/A"]);
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
