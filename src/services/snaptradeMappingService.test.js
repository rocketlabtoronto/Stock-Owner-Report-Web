import { mapSnapTradeAccountsToSpreadsheet } from "./snaptradeMappingService";

test("maps SnapTrade positions to the canonical stored account without unused derived copies", () => {
  const source = [
    {
      id: "a1",
      details: { institution_name: "Fidelity", number: "123" },
      holdings: {
        positions: [
          {
            units: 3,
            price: 10,
            symbol: {
              symbol: { symbol: "AAPL", exchange: { code: "NASDAQ" } },
            },
          },
        ],
      },
    },
  ];
  expect(mapSnapTradeAccountsToSpreadsheet(source).mappedItems).toEqual([
    {
      accountRaw: "Fidelity - 123",
      bank: "fidelity",
      holdings: [
        { Symbol: "AAPL", Market: "NASDAQ", Quantity: "3", currentPrice: 10, marketValue: 30 },
      ],
    },
  ]);
});

test("keeps the latest copy of duplicate accounts and handles empty input", () => {
  const source = { id: "a1", details: { institution_name: "Fidelity", number: "123" } };
  expect(mapSnapTradeAccountsToSpreadsheet([source, source]).mappedItems).toHaveLength(1);
  expect(mapSnapTradeAccountsToSpreadsheet(null).mappedItems).toEqual([]);
  expect(mapSnapTradeAccountsToSpreadsheet([{}]).mappedItems[0].accountRaw).toBe(
    "Unknown Brokerage - account-1"
  );
});
