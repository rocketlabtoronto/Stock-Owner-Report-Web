const createReport = (title, fields, explanation, fontSize) => ({
  title,
  fields,
  columns: ["Company", "Ownership Share", ...Object.keys(fields)].map((name) => ({
    name,
    align: name === "Company" ? "left" : "right",
  })),
  subtitle: `Proportionate share of each company’s ${title.toLowerCase()} from your holdings.`,
  explanation,
  fontSize,
});

export const balanceSheet = createReport(
  "Balance Sheet",
  {
    Assets: "Assets",
    Equity: "Equity",
    "Cash & Equivalents": "CashAndEquivalents",
    Liabilities: "Liabilities",
  },
  "This table shows your proportionate share of each company’s balance sheet. Proportionate Share " +
    "of the Balance Sheet shows the portion of a company’s assets, liabilities, and equity you " +
    "effectively own based on your shareholding. For example, if you own 1% of a company, we " +
    "calculate 1% of its assets, cash, liabilities, and equity. and other balance sheet items—so " +
    "you can see exactly what resources and obligations your investment represents, just as if you " +
    "personally owned that fraction of the entire business.",
  14
);

export const incomeStatement = createReport(
  "Income Statement",
  {
    Revenue: "Revenue",
    "Gross Profit": "GrossProfit",
    "Operating Profit": "OperatingProfit",
    "Net Income": "NetIncome",
  },
  "This table shows your proportionate share of each company’s income statement. " +
    "Proportionate Share of the Income Statement shows the portion of a company’s revenue, " +
    "expenses, and profits you effectively own based on your shareholding. For example, if " +
    "you own 1% of a company, we calculate 1% of its revenue, gross profit, operating " +
    "profit, and net income—so you can see exactly what earnings and costs your investment " +
    "represents, just as if you personally owned that fraction of the entire business.",
  13
);
