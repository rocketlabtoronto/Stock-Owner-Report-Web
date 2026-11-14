const allowedMarkets = new Set(["NASDAQ", "NYSE"]);
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function getFinancialAccounts(accounts, getLogo) {
  return (Array.isArray(accounts) ? accounts : [])
    .filter((account) => Array.isArray(account.holdings) && account.holdings.length > 0)
    .map((account) => {
      const id = String(account.Account || "");
      const [name = "", number = ""] = id.split(" - ");
      const unsupported = account.holdings
        .map((holding) =>
          String(holding.Market || holding.market || "")
            .trim()
            .toUpperCase()
        )
        .filter((market) => !allowedMarkets.has(market));
      return {
        id,
        brokerageName: (name || "Unknown Brokerage").trim(),
        accountNumber: number.trim(),
        logo: getLogo(account.bank),
        isAvailable: unsupported.length === 0,
        disallowedMarkets: [...new Set(unsupported.filter(Boolean))],
        holdings: account.holdings,
      };
    });
}

export const getDefaultAccount = (accounts) =>
  accounts.find((account) => account.isAvailable) || accounts[0];

export function getAccountHoldings(accounts, selectedAccountId) {
  const id = selectedAccountId || getDefaultAccount(accounts)?.id;
  return id
    ? accounts.find((account) => account.id === id)?.holdings || []
    : accounts.filter((account) => account.isAvailable).flatMap((account) => account.holdings);
}

function formatMoney(value) {
  if (value === null || isNaN(value)) return "N/A";
  const rounded = Math.round(value);
  return usdFormatter.format(Object.is(rounded, -0) ? 0 : rounded);
}

export function createFinancialRow({ Symbol, Quantity }, financials, report) {
  const quantity = parseFloat(Quantity);
  const row = Object.fromEntries(report.columns.map(({ name }) => [name, "N/A"]));
  row.Company = `${Symbol} (${Symbol})`;
  if (isNaN(quantity) || quantity <= 0 || !Array.isArray(financials)) return row;

  // Each reported tag uses its latest non-null fiscal-year value independently.
  const requiredTags = new Set(["SharesOutstanding", ...Object.values(report.fields)]);
  const tags = {};
  for (const financial of financials) {
    const { tag, value, fy_end_date } = financial;
    if (!requiredTags.has(tag) || value == null) continue;
    if (!tags[tag] || new Date(fy_end_date) > new Date(tags[tag].fy_end_date)) {
      tags[tag] = financial;
    }
  }

  const shares = Number(tags.SharesOutstanding?.value);
  if (!shares || isNaN(shares) || shares <= 0) return row;
  const ratio = shares / quantity;
  row["Ownership Share"] = `1 in ${
    ratio >= 1_000_000 ? `${(ratio / 1_000_000).toFixed(2)}M` : `${(ratio / 1_000).toFixed(2)}K`
  }`;
  for (const [name, tag] of Object.entries(report.fields)) {
    row[name] = formatMoney((Number(tags[tag]?.value) / shares) * quantity);
  }
  return row;
}

export async function loadFinancialRows(holdings, report, getFinancials) {
  const requests = new Map();
  return Promise.all(
    holdings.map(async (holding) => {
      const quantity = parseFloat(holding.Quantity);
      if (isNaN(quantity) || quantity <= 0) return createFinancialRow(holding, null, report);
      try {
        if (!requests.has(holding.Symbol)) {
          requests.set(
            holding.Symbol,
            Promise.resolve().then(() => getFinancials({ ticker: holding.Symbol }))
          );
        }
        return createFinancialRow(holding, await requests.get(holding.Symbol), report);
      } catch (error) {
        console.error(`Error loading financials for ${holding.Symbol}:`, error);
        return createFinancialRow(holding, null, report);
      }
    })
  );
}
