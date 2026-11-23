import { dataExchangeOf, splitAccountLabel, unsupportedMarketsOf } from "utils/portfolioSchema";
import { UNAVAILABLE, formatMoney } from "utils/reportCurrency";

// dashboard.financials holds U.S. listings, which report in U.S. dollars.
const US_DATA_CURRENCY = "USD";

export function getFinancialAccounts(accounts, getLogo) {
  return (Array.isArray(accounts) ? accounts : [])
    .filter((account) => Array.isArray(account.holdings) && account.holdings.length > 0)
    .map((account) => {
      const id = String(account.Account || "");
      const [name, number] = splitAccountLabel(id);
      const unsupported = unsupportedMarketsOf(account.holdings);
      return {
        id,
        brokerageName: name || "Unknown Brokerage",
        accountNumber: number,
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

const wholeNumberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// `source` says what the financials are denominated in and, when known, the company's name
// and whether it reports the way a bank does.
export function createFinancialRow(
  { Symbol, Quantity },
  financials,
  report,
  source = { currency: US_DATA_CURRENCY }
) {
  const { currency, companyName, isBank } = source;
  const quantity = parseFloat(Quantity);
  const row = Object.fromEntries(report.columns.map(({ name }) => [name, UNAVAILABLE]));
  // Row metadata, not a column: lets the table explain a bank's missing profit lines.
  if (isBank) row.__bank = true;
  row.Company = `${companyName || Symbol} (${Symbol})`;
  if (isNaN(quantity) || quantity <= 0) return row;
  row["Shares Owned"] = wholeNumberFormatter.format(quantity);
  // Amounts cannot be shown truthfully without knowing their currency.
  if (!Array.isArray(financials) || !currency) return row;
  row.Currency = currency;

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
  // X = shares outstanding / shares held in this account, rounded to a whole number.
  const sharesPerShareOwned = Math.max(1, Math.round(shares / quantity));
  row["Ownership Share"] = `~ 1 in ${wholeNumberFormatter.format(sharesPerShareOwned)} shares`;
  for (const [name, tag] of Object.entries(report.fields)) {
    row[name] = formatMoney((Number(tags[tag]?.value) / shares) * quantity, currency);
  }
  return row;
}

// U.S. data arrives as a plain list of financials. Other sources return
// { financials, currency, companyName } so the row is labelled with its own currency.
const toCompanyData = (result) =>
  Array.isArray(result) ? { financials: result, currency: US_DATA_CURRENCY } : result || {};

export async function loadFinancialRows(holdings, report, getFinancials) {
  const requests = new Map();
  return Promise.all(
    holdings.map(async (holding) => {
      const quantity = parseFloat(holding.Quantity);
      if (isNaN(quantity) || quantity <= 0) return createFinancialRow(holding, null, report);
      const exchange = dataExchangeOf(holding);
      const requestKey = `${exchange || ""}:${holding.Symbol}`;
      try {
        if (!requests.has(requestKey)) {
          const filter = exchange
            ? { ticker: holding.Symbol, exchange }
            : { ticker: holding.Symbol };
          requests.set(
            requestKey,
            Promise.resolve().then(() => getFinancials(filter))
          );
        }
        const { financials, currency, companyName, isBank } = toCompanyData(
          await requests.get(requestKey)
        );
        return createFinancialRow(holding, financials, report, { currency, companyName, isBank });
      } catch (error) {
        console.error(`Error loading financials for ${holding.Symbol}:`, error);
        // Marked so the report can say the figures failed to load rather than do not exist.
        return { ...createFinancialRow(holding, null, report), __loadFailed: true };
      }
    })
  );
}
