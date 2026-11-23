// Money in a report is in each company's reporting currency. U.S. listings are in USD; a TSX
// listing is usually in CAD but some TSX companies report in USD, so the currency always comes
// from the data and amounts in different currencies are never added together.
export const UNAVAILABLE = "N/A";

// Columns that describe the holding. Every other report column is a prorated money amount.
export const HOLDING_COLUMNS = ["Company", "Shares Owned", "Ownership Share", "Currency"];
const holdingColumns = new Set(HOLDING_COLUMNS);

const CURRENCY_NAMES = { CAD: "Canadian dollars", USD: "U.S. dollars", EUR: "euros" };
const formatters = new Map();

function formatterFor(currency) {
  if (!formatters.has(currency)) {
    formatters.set(
      currency,
      new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 })
    );
  }
  return formatters.get(currency);
}

// USD prints as "$1,234" and CAD as "CA$1,234", so a cell is unambiguous on its own.
export function formatMoney(value, currency = "USD") {
  if (value === null || isNaN(value)) return UNAVAILABLE;
  const rounded = Math.round(value);
  return formatterFor(currency).format(Object.is(rounded, -0) ? 0 : rounded);
}

export function parseMoney(text) {
  if (typeof text !== "string" || !/\d/.test(text)) return null;
  const amount = Number(text.replace(/[^\d.-]+/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

const currencyOf = (row) => (row?.Currency && row.Currency !== UNAVAILABLE ? row.Currency : null);

export const isMoneyColumn = (column) => !holdingColumns.has(column?.name);

// One total row per currency that has at least one amount, e.g. "Total (CAD)" and "Total (USD)".
export function buildTotalRows(columns = [], rows = []) {
  const moneyColumns = columns.filter(isMoneyColumn);
  const firstColumn = columns[0]?.name;
  const currencies = [...new Set(rows.map(currencyOf).filter(Boolean))].sort();

  return currencies.flatMap((currency) => {
    const total = Object.fromEntries(columns.map(({ name }) => [name, ""]));
    let hasAmount = false;
    for (const { name } of moneyColumns) {
      const amounts = rows
        .filter((row) => currencyOf(row) === currency)
        .map((row) => parseMoney(row[name]))
        .filter((amount) => amount !== null);
      if (!amounts.length) continue;
      hasAmount = true;
      total[name] = formatMoney(
        amounts.reduce((sum, amount) => sum + amount, 0),
        currency
      );
    }
    if (!hasAmount) return [];
    total[firstColumn] = `Total (${currency})`;
    return [{ ...total, Currency: currency, __total: true }];
  });
}

const nameOf = (currency) =>
  CURRENCY_NAMES[currency] ? `${CURRENCY_NAMES[currency]} (${currency})` : currency;

// The sentence shown above a report so the reader knows what the amounts are denominated in.
export function describeReportCurrencies(rows = []) {
  const currencies = [...new Set(rows.map(currencyOf).filter(Boolean))].sort();
  if (!currencies.length) return "";
  if (currencies.length === 1) return `All amounts are in ${nameOf(currencies[0])}.`;
  const names = currencies.map(nameOf);
  const list = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Amounts are in each company's reporting currency, shown in the Currency column: ${list}. Totals are kept separate by currency.`;
}

// A holding with no figure in any money column: a fund, or a company the data sources lack.
export function isUnavailableRow(columns = [], row) {
  const moneyColumns = columns.filter(isMoneyColumn);
  return moneyColumns.length > 0 && moneyColumns.every(({ name }) => row?.[name] === UNAVAILABLE);
}

// The notice shown above a report when some of its holdings have no figures, so the reader
// knows whether that is expected (a fund) or temporary (the data could not be loaded).
export function describeUnavailableHoldings(columns = [], rows = []) {
  const unavailable = rows.filter((row) => isUnavailableRow(columns, row));
  const failed = unavailable.filter((row) => row.__loadFailed).length;
  const missing = unavailable.length - failed;
  const count = (number) => `${number} of ${rows.length} holdings in this account`;
  return [
    missing
      ? `Company figures are not available for ${count(missing)}. This is expected for ETFs and other funds, which have no company statements to prorate, and for companies our data sources do not cover. They are marked "No statements" and are left out of the totals.`
      : "",
    failed
      ? `Figures for ${count(failed)} could not be loaded just now. Reload the page to try again.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}
