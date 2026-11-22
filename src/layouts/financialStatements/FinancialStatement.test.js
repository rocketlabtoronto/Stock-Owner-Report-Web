/* eslint-disable react/prop-types -- Component mocks only forward test content. */
import { fireEvent, render, screen } from "@testing-library/react";
import {
  exportFinancialReportToHtml,
  exportFinancialReportToPdf,
  exportFinancialReportToWord,
} from "services/pdfExportService";
import FinancialStatement from "./FinancialStatement";
import ProRataTable from "./ProRataTable";
import { balanceSheet, incomeStatement } from "./reports";

let mockUser;
let mockStatement;
jest.mock("./useFinancialStatement", () => () => mockStatement);
jest.mock("stores/useAuthStore", () => ({
  useAuthStore: (selector) => selector({ user: mockUser }),
}));
jest.mock("services/pdfExportService", () => ({
  exportFinancialReportToHtml: jest.fn(),
  exportFinancialReportToPdf: jest.fn(),
  exportFinancialReportToWord: jest.fn(),
}));
jest.mock("./ProRataTable", () => jest.fn(() => null));
jest.mock("ui/LayoutContainers/DashboardLayout", () => ({ children }) => <div>{children}</div>);
jest.mock("ui/Navbars/DashboardNavbar", () => () => null);
jest.mock("components/CustomBox", () => ({ children }) => <div>{children}</div>);
jest.mock("components/CustomTypography", () => ({ children }) => <span>{children}</span>);
jest.mock("@mui/material", () => ({
  ...jest.requireActual("@mui/material"),
  Menu: ({ open, children }) => (open ? <div role="menu">{children}</div> : null),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = null;
  const selectedAccount = {
    id: "Broker - 123",
    brokerageName: "Broker",
    accountNumber: "123",
    logo: "/logo.png",
    isAvailable: true,
  };
  mockStatement = {
    loading: false,
    aggregatedData: {
      columns: balanceSheet.columns,
      rows: [{ Company: "TEST (TEST)", Assets: "$20" }],
    },
    allAccountsWithLogos: [selectedAccount],
    selectedAccount,
    selectAccount: jest.fn(),
  };
});

test.each([
  [balanceSheet, "Word", exportFinancialReportToWord],
  [balanceSheet, "HTML", exportFinancialReportToHtml],
  [balanceSheet, "PDF", exportFinancialReportToPdf],
  [incomeStatement, "Word", exportFinancialReportToWord],
  [incomeStatement, "HTML", exportFinancialReportToHtml],
  [incomeStatement, "PDF", exportFinancialReportToPdf],
])("exports the report payload through the selected format", (report, format, exporter) => {
  mockStatement.aggregatedData.columns = report.columns;
  render(<FinancialStatement report={report} />);
  fireEvent.click(screen.getByRole("button", { name: "Export" }));
  fireEvent.click(screen.getByText(`Export to ${format}`));
  expect(exporter).toHaveBeenCalledWith({
    title: report.title,
    subtitle: report.subtitle,
    accountLabel: "Broker #123",
    ...mockStatement.aggregatedData,
  });
  expect(screen.queryByRole("menu")).toBeNull();
});

test.each([null, { email: "owner@example.com" }])("preserves the guest paywall rule", (user) => {
  mockUser = user;
  render(<FinancialStatement report={balanceSheet} />);
  const tableProps = ProRataTable.mock.calls[0][0];
  expect(tableProps.data).toBe(mockStatement.aggregatedData);
  expect(tableProps.paywall).toEqual({ enabled: !user?.email, registerPath: "/billing" });
});

test.each([true, false])("disables exports while loading or when no rows exist", (loading) => {
  mockStatement.loading = loading;
  if (!loading) mockStatement.aggregatedData.rows = [];
  render(<FinancialStatement report={balanceSheet} />);
  expect(screen.getByRole("button", { name: "Export" }).disabled).toBe(true);
});

test("account selection enables supported accounts and disables unsupported accounts", () => {
  mockStatement.allAccountsWithLogos.push({
    id: "Unsupported - 456",
    brokerageName: "Unsupported",
    accountNumber: "456",
    logo: "/logo.png",
    isAvailable: false,
    disallowedMarkets: ["LSE"],
  });
  render(<FinancialStatement report={balanceSheet} />);
  fireEvent.click(screen.getByTitle("Broker #123"));
  expect(mockStatement.selectAccount).toHaveBeenCalledWith("Broker - 123");
  const unsupported = screen.getByTitle("Unsupported #456");
  expect(unsupported.disabled).toBe(true);
  fireEvent.click(unsupported);
  expect(mockStatement.selectAccount).toHaveBeenCalledTimes(1);
});
