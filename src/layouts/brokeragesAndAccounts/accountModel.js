import { logoFromBank } from "utils/brokerageLogos";
import { dataExchangeOf, splitAccountLabel, unsupportedMarketsOf } from "utils/portfolioSchema";

const holdingsOf = (account) => (Array.isArray(account?.holdings) ? account.holdings : []);
const symbolOf = (holding) => holding.Symbol || holding.symbol;
const quantityOf = (holding) => parseFloat(holding.Quantity || holding.shares || 0);
const isValidHolding = (holding) => symbolOf(holding) && quantityOf(holding) > 0;

function fallbackBalance(holdings) {
  const hasPrices = holdings.some((holding) => holding.currentPrice > 0 || holding.marketValue > 0);
  if (!hasPrices) return null;
  return holdings.reduce((sum, holding) => {
    const quantity = parseFloat(holding.Quantity ?? holding.shares ?? 0);
    const price = parseFloat(holding.currentPrice ?? holding.price ?? 0);
    const value =
      holding.marketValue != null
        ? parseFloat(holding.marketValue)
        : price > 0
        ? quantity * price
        : 0;
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);
}

export function groupBrokerageAccounts(accounts = [], balances = {}) {
  const deduped = new Map();
  for (const [index, item] of (Array.isArray(accounts) ? accounts : []).entries()) {
    const holdings = holdingsOf(item);
    if (!holdings.length) continue;
    const raw = String(item.Account || "");
    const [name, accountNumber] = splitAccountLabel(raw);
    const brokerageName = name || "Unknown Brokerage";
    const disallowed = unsupportedMarketsOf(holdings);
    const equitiesValue = balances[raw] ?? fallbackBalance(holdings);
    const account = {
      id: accountNumber || raw || `brokerage_${index}`,
      brokerageName,
      brokerageLogo: logoFromBank(item.bank),
      accountType: "Account",
      accountNumber,
      // Workspace uploads carry a source. Untagged accounts come from Connect a Brokerage.
      source: holdings.some((holding) => holding.source === "excel_upload")
        ? "excel_upload"
        : "brokerage_connection",
      equitiesValue,
      holdings,
      validHoldingsCount: holdings.filter(isValidHolding).length,
      included: disallowed.length === 0,
      isAvailable: disallowed.length === 0,
      disallowedMarkets: [...new Set(disallowed.filter(Boolean))],
    };
    const key = `${brokerageName}::${accountNumber || account.id}`;
    const existing = deduped.get(key);
    if (
      !existing ||
      holdings.length > existing.holdings.length ||
      (equitiesValue || 0) > (existing.equitiesValue || 0)
    )
      deduped.set(key, account);
  }
  const groups = new Map();
  for (const account of deduped.values()) {
    const name = account.brokerageName;
    if (!groups.has(name)) groups.set(name, { name, logo: account.brokerageLogo, accounts: [] });
    groups.get(name).accounts.push(account);
  }
  return [...groups.values()];
}

// Share each quote request across every account holding that symbol for this load.
export async function loadAccountBalances(accounts, getStockPrices) {
  const quotes = new Map();
  const pairs = await Promise.all(
    accounts.map(async (account) => {
      const values = await Promise.all(
        holdingsOf(account)
          .filter(isValidHolding)
          .map(async (holding) => {
            const symbol = symbolOf(holding);
            const exchange = dataExchangeOf(holding);
            const quoteKey = `${exchange || ""}:${symbol}`;
            if (!quotes.has(quoteKey))
              quotes.set(
                quoteKey,
                Promise.resolve()
                  .then(() => getStockPrices(exchange ? { symbol, exchange } : { symbol }))
                  .catch(() => [])
              );
            const rows = await quotes.get(quoteKey);
            const price = parseFloat(rows?.[0]?.price || 0);
            return price > 0 ? quantityOf(holding) * price : null;
          })
      );
      const priced = values.filter((value) => value !== null);
      // No quote for any holding means the value is unknown, not zero.
      const balance =
        values.length > 0 && priced.length === 0
          ? null
          : priced.reduce((sum, value) => sum + value, 0);
      return [String(account.Account || ""), balance];
    })
  );
  return Object.fromEntries(pairs);
}
