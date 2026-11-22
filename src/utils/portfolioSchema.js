// The portfolio schema shared by every import path (SnapTrade, brokerage CSV, Excel upload):
//   { Account: "<Financial Institution> - <Account>", bank, holdings: [{ Symbol, Market, Quantity }] }
// One account is one report. Market is the holding's exchange code.
const ACCOUNT_LABEL_SEPARATOR = " - ";

export const SUPPORTED_MARKETS = ["NASDAQ", "NYSE", "TSX"];
const supportedMarkets = new Set(SUPPORTED_MARKETS);

// dashboard.financials and dashboard.stock_prices file every NASDAQ and NYSE listing under "US".
const DATA_EXCHANGE_BY_MARKET = { NASDAQ: "US", NYSE: "US", TSX: "TSX" };

export const marketOf = (holding) =>
  String(holding?.Market || holding?.market || "")
    .trim()
    .toUpperCase();

export const unsupportedMarketsOf = (holdings) =>
  holdings.map(marketOf).filter((market) => !supportedMarkets.has(market));

// Tickers repeat across exchanges (T is AT&T in the US and TELUS on TSX), so company data is
// looked up by exchange as well as ticker. Unrecognized markets have no data exchange.
export const dataExchangeOf = (holding) => DATA_EXCHANGE_BY_MARKET[marketOf(holding)];

export const buildAccountLabel = (institutionName, accountName) =>
  `${institutionName}${ACCOUNT_LABEL_SEPARATOR}${accountName}`;

// Splits on the first separator only, so an account named "TFSA - Joint" keeps its full name.
export function splitAccountLabel(label) {
  const raw = String(label || "");
  const index = raw.indexOf(ACCOUNT_LABEL_SEPARATOR);
  if (index < 0) return [raw.trim(), ""];
  return [raw.slice(0, index).trim(), raw.slice(index + ACCOUNT_LABEL_SEPARATOR.length).trim()];
}
