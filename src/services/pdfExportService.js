import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const NAVY = [13, 27, 42];
const BODY = [31, 41, 55];
const MUTED = [75, 85, 99];

const PAGE_MARGIN = 40;

const TOTAL_ROW_FILL = [238, 242, 247];

const buildTableHead = (columns = []) => [columns.map((column) => String(column.name || ""))];

const buildTableBody = (columns = [], rows = []) =>
  rows.map((row) =>
    columns.map((column) => {
      const value = row?.[column.name];
      return value == null ? "" : String(value);
    })
  );

const parseCurrencyValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  if (!value.includes("$") || !/\d/.test(value)) {
    return null;
  }

  const normalized = value.replace(/[$,\s]/g, "").replace(/\((.*)\)/, "-$1");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCurrency = (value) => {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

const addTotalRow = (columns = [], rows = []) => {
  if (!Array.isArray(columns) || !columns.length || !Array.isArray(rows) || !rows.length) {
    return Array.isArray(rows) ? rows : [];
  }

  const firstColumnName = columns[0]?.name;
  const lastRowFirstCell = rows[rows.length - 1]?.[firstColumnName];
  if (String(lastRowFirstCell || "").trim().toLowerCase() === "total") {
    return rows;
  }

  const totalRow = {};
  if (firstColumnName) {
    totalRow[firstColumnName] = "Total";
  }

  columns.slice(1).forEach((column) => {
    let sum = 0;
    let hasValue = false;

    rows.forEach((row) => {
      const parsed = parseCurrencyValue(row?.[column.name]);
      if (parsed !== null) {
        sum += parsed;
        hasValue = true;
      }
    });

    totalRow[column.name] = hasValue ? formatCurrency(sum) : "";
  });

  return [...rows, totalRow];
};

function drawPageHeader(doc, title, subtitle, accountLabel) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 62, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title || "Report", PAGE_MARGIN, 38);

  doc.setTextColor(...BODY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  if (subtitle) {
    doc.text(subtitle, PAGE_MARGIN, 88);
  }

  doc.setTextColor(...MUTED);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE_MARGIN, 106);
  if (accountLabel) {
    doc.text(`Account: ${accountLabel}`, PAGE_MARGIN, 121);
  }

  return accountLabel ? 138 : 123;
}

function drawFinancialTable(doc, { columns = [], rows = [], startY }) {
  const rowsWithTotal = addTotalRow(columns, rows);

  autoTable(doc, {
    startY,
    head: buildTableHead(columns),
    body: buildTableBody(columns, rowsWithTotal),
    theme: "grid",
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontSize: 9.5,
      fontStyle: "bold",
      halign: "left",
    },
    bodyStyles: {
      textColor: BODY,
      fontSize: 9.5,
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      lineColor: [226, 229, 234],
      lineWidth: 0,
      overflow: "linebreak",
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 35 },
    didParseCell(data) {
      const isLastColumn = data.column.index === data.table.columns.length - 1;
      data.cell.styles.lineWidth = {
        top: 0.5,
        bottom: 0.5,
        left: 0.5,
        right: isLastColumn ? 0.5 : 0,
      };

      if (data.section === "body" && data.column.index > 1) {
        data.cell.styles.halign = "right";
      }

      if (data.section === "body" && data.row.index === data.table.body.length - 1) {
        data.cell.styles.fillColor = TOTAL_ROW_FILL;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
}

export function exportFinancialReportToPdf({ title, subtitle, accountLabel, columns = [], rows = [] }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const startY = drawPageHeader(doc, title, subtitle, accountLabel);
  drawFinancialTable(doc, { columns, rows, startY });

  const fileName = `${(title || "report").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

export function exportFinancialStatementsToPdf({
  title = "Financial Statements",
  subtitle = "Proportionate share from your holdings.",
  accountLabel,
  sections = [],
}) {
  const validSections = (Array.isArray(sections) ? sections : []).filter(
    (section) =>
      section &&
      Array.isArray(section.columns) &&
      section.columns.length > 0 &&
      Array.isArray(section.rows) &&
      section.rows.length > 0
  );

  if (!validSections.length) {
    return;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  validSections.forEach((section, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const sectionStartY = drawPageHeader(
      doc,
      `${title} - ${section.title || `Section ${index + 1}`}`,
      index === 0 ? subtitle : section.subtitle,
      accountLabel
    );

    drawFinancialTable(doc, {
      columns: section.columns,
      rows: section.rows,
      startY: sectionStartY,
    });
  });

  const fileName = `${title.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
