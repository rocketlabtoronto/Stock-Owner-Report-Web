import { create } from "zustand";
import { persist } from "zustand/middleware";

const FAKE_EQUITY_ENABLED =
  String(process.env.REACT_APP_FAKE_EQUITY || process.env.REACT_FAKE_EQUITY || "").toLowerCase() ===
  "true";
const FAKE_EQUITY_SYMBOLS = ["MSFT", "AMZN", "TSLA", "AAPL", "GS"];
const PERSISTED_KEYS = [
  "accounts",
  "snapTradeLastConnectedAt",
];

const normalizeLower = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const asArray = (value) => (Array.isArray(value) ? value : []);
const resolveHoldings = (account) => asArray(account?.holdings);
const createEmptyStoreData = () => ({
  accounts: [],
  snapTradeLastConnectedAt: null,
});
const pickPersistedState = (state) =>
  Object.fromEntries(PERSISTED_KEYS.map((key) => [key, state[key]]));
const resolveAccountKey = (account) => {
  const key =
    account?.Account ||
    account?.id ||
    account?.accountId ||
    account?.accountID ||
    account?.number ||
    account?.accountNumber ||
    "";

  if (String(key).trim()) return String(key);

  const brokerage =
    account?.brokerageName ||
    account?.institutionName ||
    account?.brokerage ||
    account?.institution ||
    "";
  const type = account?.accountType || account?.type || "";
  const name = account?.name || account?.accountName || "";

  return [brokerage, type, name]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("::");
};
const isUsMarketHolding = (holding) =>
  ["NASDAQ", "NYSE"].includes(String(holding?.Market || holding?.market || "").toUpperCase());
const addFakeEquitiesToHoldings = (holdings) => {
  const list = [...asArray(holdings)];
  const existing = new Set(
    list
      .map((holding) => String(holding?.Symbol || holding?.symbol || "").toUpperCase())
      .filter(Boolean)
  );
  FAKE_EQUITY_SYMBOLS.forEach((symbol) => {
    if (!existing.has(symbol)) {
      list.push({
        Symbol: symbol,
        symbol,
        Market: "NYSE",
        market: "NYSE",
        Quantity: "100",
        shares: 100,
      });
    }
  });
  return list;
};
const pickTargetAccountKey = (accounts) => {
  const candidates = asArray(accounts).map((account) => ({
    key: resolveAccountKey(account),
    holdings: resolveHoldings(account),
  }));

  const withHoldings = candidates.filter((entry) => entry.holdings.length > 0);
  if (withHoldings.length === 0) return "";

  const usMarket = withHoldings.filter((entry) => entry.holdings.some(isUsMarketHolding));
  const pool = usMarket.length > 0 ? usMarket : withHoldings;

  return pool.reduce((best, current) => {
    if (!best) return current;
    return current.holdings.length > best.holdings.length ? current : best;
  }, null)?.key;
};
const applyFakeEquitiesToAccounts = (accounts) => {
  if (!Array.isArray(accounts) || !FAKE_EQUITY_ENABLED) return accounts;
  const targetKey = pickTargetAccountKey(accounts);
  if (!targetKey) return accounts;
  return accounts.map((account) => {
    if (resolveAccountKey(account) !== targetKey) return account;
    const augmented = addFakeEquitiesToHoldings(resolveHoldings(account));
    return { ...account, holdings: augmented };
  });
};
const mergeAccountWithIncomingHoldings = (base, item) => {
  const merged = { ...base, ...item };
  const holdings = resolveHoldings(item);
  return holdings.length ? { ...merged, holdings } : merged;
};
const ensureAccountHoldingsFields = (item) => {
  const holdings = asArray(item?.holdings);
  return { ...item, holdings };
};
const manualBrokerageName = (item) => String(item?.Account || "").split(" - ")[0];

export const useAppStore = create(
  persist(
    (set) => ({
      accounts: [],
      setAccounts: (data) =>
        set({ accounts: applyFakeEquitiesToAccounts(data) }),
      addAccounts: (items) =>
        set((state) => ({
          accounts: applyFakeEquitiesToAccounts([
            ...asArray(state.accounts),
            ...items,
          ]),
        })),
      upsertAccount: (item) =>
        set((state) => {
          const list = [...asArray(state.accounts)];
          const accountKey = resolveAccountKey(item);
          const idx = list.findIndex((x) => resolveAccountKey(x) === accountKey);
          if (idx >= 0) {
            list[idx] = mergeAccountWithIncomingHoldings(list[idx], item);
          } else {
            list.push(ensureAccountHoldingsFields(mergeAccountWithIncomingHoldings({}, item)));
          }
          return { accounts: applyFakeEquitiesToAccounts(list) };
        }),
      snapTradeLastConnectedAt: null,
      setSnapTradeLastConnectedAt: (timestamp) => set({ snapTradeLastConnectedAt: timestamp }),

      clearData: () => set(createEmptyStoreData()),

      resetStorage: () => {
        localStorage.removeItem("app-storage");
        set(createEmptyStoreData());
      },

      unlinkBrokerage: (brokerageName) =>
        set((state) => {
          const target = normalizeLower(brokerageName);
          const isUnknownTarget = target === "unknown brokerage";
          const shouldRemoveBrokerage = (value) => {
            const normalized = normalizeLower(value);
            return isUnknownTarget ? !normalized || normalized === target : normalized === target;
          };
          const shouldKeepBrokerage = (value) => {
            const normalized = normalizeLower(value);
            return !shouldRemoveBrokerage(value) && (!isUnknownTarget || Boolean(normalized));
          };

          const originalAccounts = asArray(state.accounts);
          const accounts = originalAccounts.filter((item) =>
            shouldKeepBrokerage(manualBrokerageName(item))
          );

          return {
            accounts,
          };
        }),
    }),
    {
      name: "app-storage",
      getStorage: () => localStorage,
      partialize: pickPersistedState,
    }
  )
);
