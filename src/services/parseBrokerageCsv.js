import Papa from "papaparse";

const NUMERIC_FIELDS = new Set(["Cash", "Investments", "Total Value"]);
const ALLOWED_FIELDS = new Set([
  "As of Date",
  "Account",
  "Cash",
  "Investments",
  "Total Value",
  "Margin",
]);
const trimCell = (value) => String(value || "").trim();
const isEmptyRow = (row = []) => row.every((cell) => trimCell(cell) === "");
const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export function parseBrokerageCsv(file, callback) {
  Papa.parse(file, {
    skipEmptyLines: false,
    complete: (results) => {
      const data = Array.isArray(results?.data) ? results.data : [];
      const separatorIndex = data.findIndex((row) => isEmptyRow(row));
      const firstTableRows = separatorIndex >= 0 ? data.slice(0, separatorIndex) : data;
      const secondTableRows = separatorIndex >= 0 ? data.slice(separatorIndex + 1) : [];
      const [secondTableHeaders = [], ...secondTableData] = secondTableRows;

      const firstTableResults = firstTableRows.reduce((acc, row) => {
        const key = trimCell(row?.[0]);
        if (!ALLOWED_FIELDS.has(key)) return acc;

        const value = trimCell(row?.[1]);
        acc[key] = NUMERIC_FIELDS.has(key) ? toNumber(value) : key === "Margin" ? value || null : value;
        return acc;
      }, {});

      const secondTableResults = secondTableData.map((row) => {
        const rowObj = {};
        secondTableHeaders.forEach((key, index) => {
          rowObj[trimCell(key)] = trimCell(row?.[index]);
        });
        return {
          Symbol: rowObj.Symbol,
          Market: rowObj.Market,
          Quantity: rowObj.Quantity,
        };
      });

      callback({
        firstTable: firstTableResults,
        secondTable: secondTableResults,
      });
    },
    error: (err) => {
      console.error("CSV parse error:", err);
      callback(null, err);
    },
  });
}
