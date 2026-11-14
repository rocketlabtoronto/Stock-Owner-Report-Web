import { logoFromBank } from "utils/brokerageLogos";

const holdingsOf = (account) => (Array.isArray(account?.holdings) ? account.holdings : []);
const symbolOf = (holding) => holding.Symbol || holding.symbol;
const quantityOf = (holding) => parseFloat(holding.Quantity || holding.shares || 0);
const isValidHolding = (holding) => symbolOf(holding) && quantityOf(holding) > 0;
const allowedMarkets = new Set(["NASDAQ", "NYSE"]);

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
    const [name, number = ""] = raw.split(" - ");
    const brokerageName = (name || "Unknown Brokerage").trim();
    if (!brokerageName) continue;
    const accountNumber = number.trim();
    const markets = holdings.map((holding) =>
      String(holding.Market || holding.market || "")
        .trim()
        .toUpperCase()
    );
    const disallowed = markets.filter((market) => !allowedMarkets.has(market));
    const equitiesValue = balances[raw] ?? fallbackBalance(holdings);
    const account = {
      id: accountNumber || raw || `brokerage_${index}`,
      brokerageName,
      brokerageLogo: logoFromBank(item.bank),
      accountType: "Account",
      accountNumber,
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
            if (!quotes.has(symbol))
              quotes.set(
                symbol,
                Promise.resolve()
                  .then(() => getStockPrices({ symbol }))
                  .catch(() => [])
              );
            const rows = await quotes.get(symbol);
            const price = parseFloat(rows?.[0]?.price || 0);
            return price > 0 ? quantityOf(holding) * price : 0;
          })
      );
      return [String(account.Account || ""), values.reduce((sum, value) => sum + value, 0)];
    })
  );
  return Object.fromEntries(pairs);
}
