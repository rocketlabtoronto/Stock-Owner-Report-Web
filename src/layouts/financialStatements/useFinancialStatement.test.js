import { act, renderHook, waitFor } from "@testing-library/react";
import supabaseService from "services/supabaseService";
import { balanceSheet } from "./reports";
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
    expect(supabaseService.getFinancials).toHaveBeenCalledWith({ ticker: "FIRST" })
  );

  act(() => result.current.selectAccount("Second - 2"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.aggregatedData.rows[0].Company).toBe("SECOND (SECOND)");
  await act(async () => {
    resolveFirst([]);
  });
  expect(result.current.aggregatedData.rows[0].Company).toBe("SECOND (SECOND)");
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
