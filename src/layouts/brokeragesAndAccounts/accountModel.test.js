import { groupBrokerageAccounts, loadAccountBalances } from "./accountModel";

const holding = (extra = {}) => ({ Symbol: "AAPL", Quantity: "2", Market: "NASDAQ", ...extra });
const account = (holdings, name = "Fidelity - 123") => ({
  Account: name,
  bank: "fidelity",
  holdings,
});

test("groups accounts, excludes empty accounts, and retains the richer duplicate", () => {
  const groups = groupBrokerageAccounts([
    account([]),
    account([holding()]),
    account([holding(), holding({ Symbol: "MSFT" })]),
    account([holding()], "Fidelity - 456"),
  ]);
  expect(groups).toHaveLength(1);
  expect(groups[0].accounts).toHaveLength(2);
  expect(groups[0].accounts[0]).toMatchObject({ accountNumber: "123", validHoldingsCount: 2 });
  expect(groups[0].logo).toBe("/logos/fidelity.png");
});

test("market availability requires every holding to be supported", () => {
  const groups = groupBrokerageAccounts([
    account([holding({ Market: " nyse " })], "Broker - 1"),
    account([holding(), holding({ Market: "TSX" }), holding({ Market: "TSX" })], "Broker - 2"),
    account([holding({ Market: "" })], "Broker - 3"),
  ]);
  expect(groups[0].accounts.map(({ included }) => included)).toEqual([true, false, false]);
  expect(groups[0].accounts[1].disallowedMarkets).toEqual(["TSX"]);
});

test("uses stored prices until quotes arrive and respects a calculated zero balance", () => {
  const items = [account([holding({ currentPrice: 10 }), holding({ marketValue: 5 })])];
  expect(groupBrokerageAccounts(items)[0].accounts[0].equitiesValue).toBe(25);
  expect(groupBrokerageAccounts(items, { "Fidelity - 123": 0 })[0].accounts[0].equitiesValue).toBe(
    0
  );
  expect(groupBrokerageAccounts([account([holding()])])[0].accounts[0].equitiesValue).toBeNull();
});

test("shares quote requests across accounts and skips invalid quantities", async () => {
  const prices = jest.fn().mockResolvedValue([{ price: "10" }, { price: "999" }]);
  const balances = await loadAccountBalances(
    [
      account([holding(), holding({ Quantity: "0" }), holding({ Quantity: "bad" })]),
      account([holding({ Quantity: "3" })], "Fidelity - 456"),
    ],
    prices
  );
  expect(prices).toHaveBeenCalledTimes(1);
  expect(balances).toEqual({ "Fidelity - 123": 20, "Fidelity - 456": 30 });
});

test("isolates failed and missing quotes without dropping other holdings", async () => {
  const prices = jest.fn(({ symbol }) =>
    symbol === "AAPL" ? Promise.resolve([{ price: 10 }]) : Promise.reject(new Error("Unavailable"))
  );
  await expect(
    loadAccountBalances([account([holding(), holding({ Symbol: "MSFT" })])], prices)
  ).resolves.toEqual({ "Fidelity - 123": 20 });
});
