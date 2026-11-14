export const inferBankFromName = (name) => {
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

// Map once into the canonical account shape stored by the dashboard.
export const mapSnapTradeAccountsToSpreadsheet = (accounts = []) => {
  const mappedItems = [];
  const seenAccounts = new Map();
  asArray(accounts).forEach((account, index) => {
    const details = account?.details || {};
    const accountNumber = resolveAccountNumber(details);
    const brokerageName =
      details.institution_name ||
      details.meta?.institution_name ||
      account?.institution_name ||
      account?.brokerage ||
      "Unknown Brokerage";
    const accountLabel =
      accountNumber ||
      account?.name ||
      details.name ||
      account?.id ||
      details.id ||
      `account-${index + 1}`;
    const dedupeKey = `${brokerageName}::${accountLabel}::${account?.id || index}`;
    const item = {
      accountRaw: `${brokerageName} - ${accountLabel}`,
      bank: inferBankFromName(brokerageName),
      holdings: mapPositionsToHoldings(asArray(account?.holdings?.positions)),
    };
    const existingIndex = seenAccounts.get(dedupeKey);
    if (existingIndex !== undefined) mappedItems[existingIndex] = item;
    else {
      seenAccounts.set(dedupeKey, mappedItems.length);
      mappedItems.push(item);
    }
  });
  return { mappedItems };
};
