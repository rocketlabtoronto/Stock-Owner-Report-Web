import { act, renderHook, waitFor } from "@testing-library/react";
import supabaseService from "services/supabaseService";
import { useReportAccountStore } from "stores/useReportAccountStore";
import { balanceSheet, incomeStatement } from "./reports";
import useFinancialStatement from "./useFinancialStatement";

let mockAccounts;
jest.mock("stores/store", () => ({
  useAppStore: (selector) => selector({ accounts: mockAccounts }),
}));
jest.mock("services/supabaseService", () => ({ getFinancials: jest.fn() }));

const account = (id, symbol) => ({
  Account: id,
  holdings: [{ Symbol: symbol, Quantity: "10", Market: "NYSE" }],
});

beforeEach(() => {
  mockAccounts = [account("First - 1", "FIRST"), account("Second - 2", "SECOND")];
  supabaseService.getFinancials.mockReset();
  useReportAccountStore.setState({ selectedAccountId: null });
});

test("the selected account tab applies to both the balance sheet and the income statement", async () => {
  supabaseService.getFinancials.mockResolvedValue([]);
  const { result: balance, unmount } = renderHook(() => useFinancialStatement(balanceSheet));
  act(() => balance.current.selectAccount("Second - 2"));
  await waitFor(() =>
    expect(balance.current.aggregatedData.rows[0]?.Company).toBe("SECOND (SECOND)")
  );
  unmount();

  const { result: income } = renderHook(() => useFinancialStatement(incomeStatement));
  expect(income.current.selectedAccount.id).toBe("Second - 2");
  await waitFor(() => expect(income.current.loading).toBe(false));
  expect(income.current.aggregatedData.rows.map((row) => row.Company)).toEqual([
    "SECOND (SECOND)",
  ]);
});

test("a slow previous account cannot replace the selected account's financial results", async () => {
  let resolveFirst;
  supabaseService.getFinancials.mockImplementation(({ ticker }) =>
    ticker === "FIRST"
      ? new Promise((resolve) => {
          resolveFirst = resolve;
        })
      : Promise.resolve([])
  );
  const { result } = renderHook(() => useFinancialStatement(balanceSheet));
  await waitFor(() =>
    expect(supabaseService.getFinancials).toHaveBeenCalledWith({ ticker: "FIRST", exchange: "US" })
  );

  act(() => result.current.selectAccount("Second - 2"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.aggregatedData.rows[0].Company).toBe("SECOND (SECOND)");
  await act(async () => {
    resolveFirst([]);
  });
  expect(result.current.aggregatedData.rows[0].Company).toBe("SECOND (SECOND)");
});

test("reload fetches the selected account's figures again after a failed load", async () => {
  supabaseService.getFinancials.mockRejectedValueOnce(new Error("unreachable")).mockResolvedValue([]);
  jest.spyOn(console, "error").mockImplementation(() => {});
  const { result } = renderHook(() => useFinancialStatement(balanceSheet));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.aggregatedData.rows[0].__loadFailed).toBe(true);

  act(() => result.current.reload());
  await waitFor(() => expect(result.current.aggregatedData.rows[0]?.__loadFailed).toBeUndefined());
  expect(supabaseService.getFinancials).toHaveBeenCalledTimes(2);
  console.error.mockRestore();
});

test("removing a selected account falls back to an available account and empty portfolios finish loading", async () => {
  supabaseService.getFinancials.mockResolvedValue([]);
  const { result, rerender } = renderHook(() => useFinancialStatement(balanceSheet));
  act(() => result.current.selectAccount("Second - 2"));
  await waitFor(() => expect(result.current.loading).toBe(false));

  mockAccounts = [mockAccounts[0]];
  rerender();
  await waitFor(() => expect(result.current.aggregatedData.rows[0]?.Company).toBe("FIRST (FIRST)"));
  expect(result.current.selectedAccount.id).toBe("First - 1");

  mockAccounts = [];
  rerender();
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.aggregatedData.rows).toEqual([]);
});
