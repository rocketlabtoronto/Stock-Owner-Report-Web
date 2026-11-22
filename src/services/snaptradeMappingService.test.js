import { mapSnapTradeAccountsToSpreadsheet } from "./snaptradeMappingService";
import { mapWorkspaceAccountsToSpreadsheet } from "./workspaceMappingService";

test("an Excel-uploaded account maps to the same schema and bank identifier as a brokerage connection", () => {
  const holdings = [
    { Symbol: "TD", Market: "TSX", Quantity: "8.5", workspaceHoldingId: "h1", source: "excel_upload" },
  ];
  const [uploaded] = mapWorkspaceAccountsToSpreadsheet([
    { Account: "TD Direct Investing - Personal RRSP", bank: "td_direct_investing", holdings },
  ]).mappedItems;
  const [connected] = mapSnapTradeAccountsToSpreadsheet([
    { id: "a1", details: { institution_name: "TD Direct Investing", number: "Personal RRSP" } },
  ]).mappedItems;
  expect(uploaded).toEqual({ ...connected, holdings });
  expect(uploaded.bank).toBe("TD");
  expect(mapWorkspaceAccountsToSpreadsheet(null).mappedItems).toEqual([]);
});

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
