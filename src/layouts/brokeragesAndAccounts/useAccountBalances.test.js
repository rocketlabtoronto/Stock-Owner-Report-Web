import { act, renderHook, waitFor } from "@testing-library/react";
import supabaseService from "services/supabaseService";
import useAccountBalances from "./useAccountBalances";

jest.mock("services/supabaseService", () => ({ getStockPrices: jest.fn() }));

const account = (symbol) => [{ Account: symbol, holdings: [{ Symbol: symbol, Quantity: "2" }] }];

test("ignores late quotes after switching accounts and clears removed accounts", async () => {
  let finishOld;
  supabaseService.getStockPrices.mockImplementation(({ symbol }) =>
    symbol === "OLD"
      ? new Promise((resolve) => {
          finishOld = resolve;
        })
      : Promise.resolve([{ price: 5 }])
  );
  const { result, rerender } = renderHook(({ accounts }) => useAccountBalances(accounts), {
    initialProps: { accounts: account("OLD") },
  });
  await waitFor(() => expect(finishOld).toBeDefined());
  rerender({ accounts: account("NEW") });
  await waitFor(() => expect(result.current.balances).toEqual({ NEW: 10 }));
  await act(async () => {
    finishOld([{ price: 999 }]);
  });
  expect(result.current.balances).toEqual({ NEW: 10 });
  rerender({ accounts: [] });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.balances).toEqual({});
});
