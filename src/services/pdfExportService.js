import jsPDF from "jspdf";
import { buildTotalRows } from "utils/reportCurrency";

const NAVY = [13, 27, 42];
const BODY = [31, 41, 55];
const MUTED = [75, 85, 99];

const PAGE_MARGIN = 40;
const REPEATED_PAGE_START_Y = 34;
const PDF_RENDER_SCALE = 2;

const TABLE_FONT_SIZE = 9.5;
const TABLE_ROW_HEIGHT = 19;
const HEADER_ROW_HEIGHT = 20;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const createReportFileName = (title, extension) =>
  `${(title || "report").toLowerCase().replace(/\s+/g, "-")}-${new Date()
    .toISOString()
    .slice(0, 10)}.${extension}`;

const getCellValue = (row, columnName) => {
  const value = row?.[columnName];
  return value == null ? "" : String(value);
};

// The company name, ownership sentence and currency code are text; other columns are numbers.
const TEXT_COLUMNS = new Set(["Ownership Share", "Currency"]);
const COLUMN_WEIGHTS = { "Shares Owned": 0.9, "Ownership Share": 1.9, Currency: 0.7 };
const isNumericColumn = (column, columnIndex) =>
  columnIndex > 0 && !TEXT_COLUMNS.has(column?.name);

const getColumnWidths = (availableWidth, columns) => {
  if (!columns.length) {
    return [];
  }

  if (columns.length === 1) {
    return [availableWidth];
  }

  const weights = columns.map((column, index) =>
    index === 0 ? 1.7 : COLUMN_WEIGHTS[column?.name] || 1
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  return weights.map((weight) => (availableWidth * weight) / totalWeight);
};

const rgb = (color) => `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

const truncateToCanvasWidth = (context, text, maxWidth) => {
  const raw = String(text || "");
  if (!raw) {
    return "";
  }

  if (context.measureText(raw).width <= maxWidth) {
    return raw;
  }

  const ellipsis = "...";
  let candidate = raw;
  while (candidate.length > 0 && context.measureText(`${candidate}${ellipsis}`).width > maxWidth) {
    candidate = candidate.slice(0, -1);
  }

  return candidate ? `${candidate}${ellipsis}` : ellipsis;
};

const paginateRowsForPdf = (rows, firstPageStartY, pageHeight) => {
  const bottomLimit = pageHeight - 32;
  const firstPageCapacity = Math.max(
    1,
    Math.floor((bottomLimit - (firstPageStartY + HEADER_ROW_HEIGHT + 2)) / TABLE_ROW_HEIGHT)
  );
  const repeatedPageCapacity = Math.max(
    1,
    Math.floor((bottomLimit - (REPEATED_PAGE_START_Y + HEADER_ROW_HEIGHT + 2)) / TABLE_ROW_HEIGHT)
  );

  const pages = [];
  let cursor = 0;
  let isFirstPage = true;

  while (cursor < rows.length) {
    const capacity = isFirstPage ? firstPageCapacity : repeatedPageCapacity;
    pages.push(rows.slice(cursor, cursor + capacity));
    cursor += capacity;
    isFirstPage = false;
  }

  return pages.length ? pages : [[]];
};

const createPdfCanvas = (pageWidth, pageHeight) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(pageWidth * PDF_RENDER_SCALE);
  canvas.height = Math.round(pageHeight * PDF_RENDER_SCALE);

  const context = canvas.getContext("2d");
  context.scale(PDF_RENDER_SCALE, PDF_RENDER_SCALE);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, pageWidth, pageHeight);

  return { canvas, context };
};

const drawCanvasPageHeader = (
  context,
  pageWidth,
  { title, subtitle, accountLabel, generatedAt }
) => {
  context.fillStyle = rgb(NAVY);
  context.fillRect(0, 0, pageWidth, 62);

  context.fillStyle = "#ffffff";
  context.font = "bold 18px Helvetica, Arial, sans-serif";
  context.fillText(title || "Report", PAGE_MARGIN, 38);

  context.fillStyle = rgb(BODY);
  context.font = "11px Helvetica, Arial, sans-serif";
  if (subtitle) {
    context.fillText(subtitle, PAGE_MARGIN, 88);
  }

  context.fillStyle = rgb(MUTED);
  context.font = "10px Helvetica, Arial, sans-serif";
  context.fillText(`Generated: ${generatedAt}`, PAGE_MARGIN, 106);
  if (accountLabel) {
    context.fillText(`Account: ${accountLabel}`, PAGE_MARGIN, 121);
  }

  return accountLabel ? 138 : 123;
};

const drawCanvasTableHeader = (context, columns, startX, startY, columnWidths) => {
  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  context.fillStyle = rgb(NAVY);
  context.fillRect(startX, startY, totalWidth, HEADER_ROW_HEIGHT);

  context.fillStyle = "#ffffff";
  context.font = `bold ${TABLE_FONT_SIZE}px Helvetica, Arial, sans-serif`;

  let cursorX = startX;
  columns.forEach((column, index) => {
    const text = truncateToCanvasWidth(context, column?.name || "", columnWidths[index] - 8);
    context.fillText(text, cursorX + 4, startY + 13);
    cursorX += columnWidths[index];
  });
};

const drawCanvasTableRows = (context, columns, rows, startX, startY, columnWidths) => {
  let currentY = startY + HEADER_ROW_HEIGHT + 2;

  rows.forEach((row) => {
    const isTotalRow = Boolean(row?.__total);
    context.fillStyle = rgb(BODY);
    context.font = `${
      isTotalRow ? "bold" : "normal"
    } ${TABLE_FONT_SIZE}px Helvetica, Arial, sans-serif`;

    let cursorX = startX;
    columns.forEach((column, columnIndex) => {
      const rawText = getCellValue(row, column.name);
      const text = truncateToCanvasWidth(context, rawText, columnWidths[columnIndex] - 8);

      if (isNumericColumn(column, columnIndex)) {
        const textWidth = context.measureText(text).width;
        const textX = Math.max(cursorX + 4, cursorX + columnWidths[columnIndex] - textWidth - 4);
        context.fillText(text, textX, currentY + 13);
      } else {
        context.fillText(text, cursorX + 4, currentY + 13);
      }

      cursorX += columnWidths[columnIndex];
    });

    currentY += TABLE_ROW_HEIGHT;
  });
};

const buildRasterizedPdfPages = ({
  pageWidth,
  pageHeight,
  title,
  subtitle,
  accountLabel,
  columns,
  rows,
}) => {
  if (!Array.isArray(columns) || !columns.length) {
    return [];
  }

  const generatedAt = new Date().toLocaleString();
  const firstPageStartY = accountLabel ? 138 : 123;
  const rowsWithTotal = addTotalRow(columns, rows);
  const pagedRows = paginateRowsForPdf(rowsWithTotal, firstPageStartY, pageHeight);
  const startX = PAGE_MARGIN;
  const availableWidth = pageWidth - PAGE_MARGIN * 2;
  const columnWidths = getColumnWidths(availableWidth, columns);

  return pagedRows.map((pageRows, pageIndex) => {
    const { canvas, context } = createPdfCanvas(pageWidth, pageHeight);
    const tableStartY =
      pageIndex === 0
        ? drawCanvasPageHeader(context, pageWidth, { title, subtitle, accountLabel, generatedAt })
        : REPEATED_PAGE_START_Y;

    drawCanvasTableHeader(context, columns, startX, tableStartY, columnWidths);
    drawCanvasTableRows(context, columns, pageRows, startX, tableStartY, columnWidths);

    return canvas.toDataURL("image/png");
  });
};

// Appends one total row per currency, matching the on-screen report.
const addTotalRow = (columns = [], rows = []) => {
  if (!Array.isArray(columns) || !columns.length || !Array.isArray(rows) || !rows.length) {
    return Array.isArray(rows) ? rows : [];
  }
  if (rows.some((row) => row?.__total)) {
    return rows;
  }
  return [...rows, ...buildTotalRows(columns, rows)];
};

const buildDocumentHtml = ({
  title,
  subtitle,
  accountLabel,
  columns = [],
  rows = [],
  wordCompatible = false,
}) => {
  const rowsWithTotal = addTotalRow(columns, rows);
  const headerCells = columns
    .map((column) => `<th>${escapeHtml(column?.name || "")}</th>`)
    .join("");

  const bodyRows = rowsWithTotal
    .map((row) => {
      const isTotalRow = Boolean(row?.__total);
      const cells = columns
        .map((column, columnIndex) => {
          const alignClass = isNumericColumn(column, columnIndex) ? "num" : "text";
          return `<td class="${alignClass}${isTotalRow ? " total-cell" : ""}">${escapeHtml(
            getCellValue(row, column.name)
          )}</td>`;
        })
        .join("");

      return `<tr class="${isTotalRow ? "total-row" : "body-row"}">${cells}</tr>`;
    })
    .join("");

  const htmlTag = wordCompatible
    ? '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
    : '<html lang="en">';

  const wordHeadMarkup = wordCompatible
    ? `<!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->`
    : "";

  return `<!doctype html>
${htmlTag}
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title || "Report")}</title>
  ${wordHeadMarkup}
  <style>
    body {
      font-family: Calibri, Arial, sans-serif;
      color: #1f2937;
      margin: 24px;
      font-size: 11pt;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 18pt;
      color: #0d1b2a;
    }
    .meta {
      margin: 0 0 6px;
      color: #4b5563;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
      margin-top: 14px;
    }
    th, td {
      border: none;
      padding: 6px 8px;
      vertical-align: top;
      word-wrap: break-word;
    }
    th {
      background: #0d1b2a;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
    }
    td.text {
      text-align: left;
    }
    td.num {
      text-align: right;
    }
    tr.total-row td {
      font-weight: 700;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title || "Report")}</h1>
  ${subtitle ? `<p class="meta">${escapeHtml(subtitle)}</p>` : ""}
  <p class="meta">Generated: ${escapeHtml(new Date().toLocaleString())}</p>
  ${accountLabel ? `<p class="meta">Account: ${escapeHtml(accountLabel)}</p>` : ""}
  <table>
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
</body>
</html>`;
};

export function exportFinancialReportToPdf({
  title,
  subtitle,
  accountLabel,
  columns = [],
  rows = [],
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pages = buildRasterizedPdfPages({
    pageWidth,
    pageHeight,
    title,
    subtitle,
    accountLabel,
    columns,
    rows,
  });

  if (!pages.length) {
    return;
  }

  pages.forEach((pageImage, index) => {
    if (index > 0) {
      doc.addPage();
    }

    doc.addImage(pageImage, "PNG", 0, 0, pageWidth, pageHeight);
  });

  const fileName = createReportFileName(title, "pdf");
  doc.save(fileName);
}

export function exportFinancialReportToWord({
  title,
  subtitle,
  accountLabel,
  columns = [],
  rows = [],
}) {
  const html = buildDocumentHtml({
    title,
    subtitle,
    accountLabel,
    columns,
    rows,
    wordCompatible: true,
  });
  const blob = new Blob([html], { type: "application/msword" });
  downloadBlob(blob, createReportFileName(title, "doc"));
}

export function exportFinancialReportToHtml({
  title,
  subtitle,
  accountLabel,
  columns = [],
  rows = [],
}) {
  const html = buildDocumentHtml({ title, subtitle, accountLabel, columns, rows });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, createReportFileName(title, "html"));
}
