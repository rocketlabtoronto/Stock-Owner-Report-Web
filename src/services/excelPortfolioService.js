import * as XLSX from "xlsx";

export const REQUIRED_COLUMNS = [
  "Stock Ticker Symbol",
  "Number of Shares",
  "Account Name",
  "Financial Institution",
  "Exchange",
];

const TEMPLATE_ROWS = [
  REQUIRED_COLUMNS,
  ["RY", 25, "Personal TFSA", "Questrade", "TSX"],
  ["RY", 10, "Spousal RRSP", "Questrade", "TSX"],
  ["TD", 8.5, "Personal RRSP", "TD Direct Investing", "TSX"],
];

export function downloadPortfolioTemplate(
  filename = "stock-owner-report-portfolio-template.xlsx"
) {
  const worksheet = XLSX.utils.aoa_to_sheet(TEMPLATE_ROWS);
  worksheet["!cols"] = REQUIRED_COLUMNS.map(() => ({ wch: 22 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Portfolio");
  XLSX.writeFile(workbook, filename);
}

const normalizeHeader = (value) => String(value || "").trim().toLowerCase();
const HEADER_KEYS = {
  "stock ticker symbol": "ticker",
  "number of shares": "quantity",
  "account name": "accountName",
  "financial institution": "financialInstitution",
  exchange: "exchange",
};

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsArrayBuffer(file);
  });
}

const isBlankRow = (row = []) => row.every((cell) => String(cell ?? "").trim() === "");

// Parses an uploaded .xlsx file into row objects, or explains what must be
// fixed when the workbook is unreadable or missing a required column.
export async function parsePortfolioWorkbook(file) {
  let workbook;
  try {
    const buffer = await readFileAsArrayBuffer(file);
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  const sheetName = workbook.SheetNames?.[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;
  if (!sheet) return { ok: false, reason: "unreadable" };

  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false });
  if (!grid.length) return { ok: false, reason: "unreadable" };

  const [headerRow, ...dataRows] = grid;
  const headerKeyByIndex = headerRow.map((cell) => HEADER_KEYS[normalizeHeader(cell)] || null);
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !headerKeyByIndex.includes(HEADER_KEYS[normalizeHeader(column)])
  );
  if (missingColumns.length) {
    return { ok: false, reason: "missing_columns", missingColumns };
  }

  const rows = dataRows
    .filter((row) => !isBlankRow(row))
    .map((row, index) => {
      const record = { rowNumber: index + 2 }; // header is row 1
      headerKeyByIndex.forEach((key, columnIndex) => {
        if (!key) return;
        record[key] = String(row[columnIndex] ?? "").trim();
      });
      return record;
    });

  if (!rows.length) return { ok: false, reason: "no_rows" };

  return { ok: true, rows };
}
