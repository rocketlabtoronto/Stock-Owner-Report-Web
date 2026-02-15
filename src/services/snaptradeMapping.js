const inferBankFromName = (name) => {
  const n = String(name || "").toLowerCase();
  if (n.includes("td")) return "TD";
  if (n.includes("rbc")) return "rbc";
  if (n.includes("questrade")) return "questrade";
  if (n.includes("wealthsimple")) return "wealthsimple";
  if (n.includes("cibc")) return "cibc";
  if (n.includes("national bank")) return "nbdb";
  if (n.includes("scotia")) return "scotia";
  if (n.includes("bmo")) return "bmo";
  if (n.includes("schwab")) return "charles";
  if (n.includes("chase")) return "chase";
  if (n.includes("etrade") || n.includes("e*trade")) return "etrade";
  if (n.includes("fidelity")) return "fidelity";
  if (n.includes("interactive brokers")) return "ibkr";
  if (n.includes("merrill")) return "merrill";
  if (n.includes("robinhood")) return "robinhood";
  if (n.includes("vanguard")) return "vanguard";
  if (n.includes("wells fargo")) return "fargo";
  return "logo_image";
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};
const asArray = (value) => (Array.isArray(value) ? value : []);

const resolveSymbol = (position) =>
  position?.symbol?.symbol?.symbol ||
  position?.symbol?.symbol?.raw_symbol ||
  position?.symbol?.symbol?.id ||
  position?.symbol?.id ||
  "";

const resolveMarket = (position) =>
  position?.symbol?.symbol?.exchange?.code ||
  position?.symbol?.symbol?.exchange?.mic_code ||
  position?.symbol?.symbol?.exchange?.name ||
  "";

const mapPositionsToHoldings = (positions = []) =>
  positions.map((position) => {
    const units = Number(position?.units ?? 0);
    const price = Number(position?.price ?? 0);
    const marketValue = Number.isFinite(units) && Number.isFinite(price) ? units * price : 0;

    return {
      Symbol: resolveSymbol(position),
      Market: resolveMarket(position),
      Quantity: String(position?.units ?? ""),
      currentPrice: Number.isFinite(price) ? price : null,
      marketValue: Number.isFinite(marketValue) ? marketValue : null,
    };
  });

const resolveAccountNumber = (details = {}) =>
  details?.meta?.accountNumberActual || details?.number || details?.id || "";

const resolveAsOfDate = (details = {}) =>
  details?.sync_status?.holdings?.last_successful_sync || new Date().toISOString();

const resolveCash = (balances = []) => {
  if (!Array.isArray(balances) || balances.length === 0) return 0;
  return balances.reduce((sum, bal) => sum + (toNumber(bal?.cash) || 0), 0);
};

const toDisplayAccount = ({
  account,
  accountRaw,
  safeBrokerageName,
  bank,
  details,
  accountNumber,
  totalValue,
  mappedHoldings,
}) => ({
  id: account?.id || accountRaw,
  brokerageName: safeBrokerageName,
  brokerageLogo: null,
  accountType: details?.meta?.type || details?.raw_type || "Account",
  accountNumber,
  equitiesValue: totalValue,
  balance: totalValue,
  included: true,
  holdings: mappedHoldings,
  bank,
});

export const mapSnapTradeAccountsToSpreadsheet = (accounts = []) => {
  const mappedItems = [];
  const holdingsByAccount = {};
  const flatHoldings = [];
  const displayAccounts = [];
  const seenAccounts = new Map();

  asArray(accounts).forEach((account, index) => {
    const details = account?.details || {};
    const holdings = account?.holdings || {};
    const accountNumber = resolveAccountNumber(details);
    const brokerageName =
      details?.institution_name ||
      details?.meta?.institution_name ||
      account?.institution_name ||
      account?.brokerage ||
      "";
    const safeBrokerageName = brokerageName || "Unknown Brokerage";
    const accountLabel =
      accountNumber ||
      account?.name ||
      details?.name ||
      account?.id ||
      details?.id ||
      `account-${index + 1}`;
    const accountRaw = `${safeBrokerageName} - ${accountLabel}`;
    const dedupeKey = `${safeBrokerageName}::${accountLabel}::${account?.id || index}`;

    const mappedHoldings = mapPositionsToHoldings(asArray(holdings?.positions));
    const bank = inferBankFromName(safeBrokerageName);

    const cash = resolveCash(holdings?.balances || []);
    const equitiesValue = mappedHoldings.reduce((sum, holding) => {
      const qty = Number(holding?.Quantity ?? 0);
      const price = Number(holding?.currentPrice ?? 0);
      const positionValue = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
      return sum + positionValue;
    }, 0);
    const totalValue = Number.isFinite(equitiesValue) ? equitiesValue : 0;
    const investments = totalValue - cash;

    const firstTable = {
      "As of Date": resolveAsOfDate(details),
      Account: accountRaw,
      Cash: cash,
      Investments: investments,
      "Total Value": totalValue,
      Margin: details?.meta?.type || null,
    };

    const secondTable = mappedHoldings;

    const mappedItem = {
      firstTable,
      secondTable: mappedHoldings,
      accountRaw,
      bank,
      holdings: mappedHoldings,
    };

    const displayAccount = toDisplayAccount({
      account,
      accountRaw,
      safeBrokerageName,
      bank,
      details,
      accountNumber,
      totalValue,
      mappedHoldings,
    });
    const existingIndex = seenAccounts.get(dedupeKey);

    if (existingIndex !== undefined) {
      mappedItems[existingIndex] = mappedItem;
      displayAccounts[existingIndex] = displayAccount;
    } else {
      seenAccounts.set(dedupeKey, mappedItems.length);
      mappedItems.push(mappedItem);
      displayAccounts.push(displayAccount);
    }

    holdingsByAccount[accountRaw] = mappedHoldings;
    flatHoldings.push(...mappedHoldings);
  });

  return { mappedItems, holdingsByAccount, flatHoldings, displayAccounts };
};
