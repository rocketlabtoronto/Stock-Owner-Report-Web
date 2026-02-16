import { create } from "zustand";
import { persist } from "zustand/middleware";

const FAKE_EQUITY_ENABLED =
  String(process.env.REACT_APP_FAKE_EQUITY || process.env.REACT_FAKE_EQUITY || "").toLowerCase() ===
  "true";
const FAKE_EQUITY_SYMBOLS = ["MSFT", "AMZN", "TSLA", "AAPL", "GS"];
const PERSISTED_KEYS = [
  "brokeragesAndAccounts",
  "accountHoldings",
  "accountHoldingsByAccount",
  "accounts",
  "snapTradeAccounts",
  "snapTradeHoldings",
  "snapTradeLastConnectedAt",
];

const normalizeLower = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const asArray = (value) => (Array.isArray(value) ? value : []);
const resolveHoldings = (account) => {
  const accountHoldings = asArray(account?.accountHoldings);
  return accountHoldings.length ? accountHoldings : asArray(account?.holdings);
};
const createEmptyStoreData = () => ({
  accounts: [],
  accountHoldings: [],
  accountHoldingsByAccount: {},
  brokeragesAndAccounts: [],
  snapTradeAccounts: [],
  snapTradeHoldings: [],
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
    return { ...account, accountHoldings: augmented, holdings: augmented };
  });
};
const mergeAccountWithIncomingHoldings = (base, item) => {
  const merged = { ...base, ...item };
  const accountHoldings = resolveHoldings(item);
  return accountHoldings.length ? { ...merged, accountHoldings, holdings: accountHoldings } : merged;
};
const ensureAccountHoldingsFields = (item) => {
  const accountHoldings = asArray(item?.accountHoldings);
  const holdings = asArray(item?.holdings).length ? item.holdings : accountHoldings;
  return { ...item, accountHoldings, holdings };
};
const manualBrokerageName = (item) => String(item?.Account || "").split(" - ")[0];

export const useAppStore = create(
  persist(
    (set) => ({
      brokeragesAndAccounts: [],
      accountHoldings: [],
      accountHoldingsByAccount: {},
      setBrokeragesAndAccounts: (data) =>
        set({ brokeragesAndAccounts: applyFakeEquitiesToAccounts(data) }),
      addBrokeragesAndAccounts: (items) =>
        set((state) => ({
          brokeragesAndAccounts: applyFakeEquitiesToAccounts([
            ...asArray(state.brokeragesAndAccounts),
            ...items,
          ]),
        })),
      upsertBrokerageAccount: (item) =>
        set((state) => {
          const list = [...asArray(state.brokeragesAndAccounts)];
          const accountKey = resolveAccountKey(item);
          const idx = list.findIndex((x) => resolveAccountKey(x) === accountKey);
          if (idx >= 0) {
            list[idx] = mergeAccountWithIncomingHoldings(list[idx], item);
          } else {
            list.push(ensureAccountHoldingsFields(mergeAccountWithIncomingHoldings({}, item)));
          }
          return { brokeragesAndAccounts: applyFakeEquitiesToAccounts(list) };
        }),
      setAccountHoldings: (holdings) => set({ accountHoldings: holdings }),
      setAccountHoldingsForAccount: (accountId, holdings) =>
        set((state) => {
          const accountIdKey = String(accountId);
          const list = applyFakeEquitiesToAccounts(
            asArray(state.brokeragesAndAccounts).map((x) => {
              if (resolveAccountKey(x) === accountIdKey) {
                return { ...x, accountHoldings: holdings, holdings };
              }
              return x;
            })
          );

          const targetKey = FAKE_EQUITY_ENABLED ? pickTargetAccountKey(list) : "";
          const target = targetKey ? list.find((x) => resolveAccountKey(x) === targetKey) : null;
          return {
            brokeragesAndAccounts: list,
            accountHoldingsByAccount: {
              ...(state.accountHoldingsByAccount || {}),
              [accountIdKey]: holdings,
              ...(target ? { [targetKey]: resolveHoldings(target) } : {}),
            },
          };
        }),

      accounts: [],
      setAccounts: (accounts) => set({ accounts: applyFakeEquitiesToAccounts(accounts) }),

      snapTradeAccounts: [],
      snapTradeHoldings: [],
      snapTradeLastConnectedAt: null,
      setSnapTradeAccounts: (accounts) =>
        set({ snapTradeAccounts: applyFakeEquitiesToAccounts(accounts) }),
      setSnapTradeHoldings: (holdings) => set({ snapTradeHoldings: holdings }),
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

          const originalManual = asArray(state.brokeragesAndAccounts);
          const removedAccountIds = new Set(
            originalManual
              .filter((item) => shouldRemoveBrokerage(manualBrokerageName(item)))
              .map((item) => String(item.Account || item.id || ""))
          );

          const brokeragesAndAccounts = originalManual.filter((item) =>
            shouldKeepBrokerage(manualBrokerageName(item))
          );

          const accountHoldingsByAccount = Object.fromEntries(
            Object.entries(state.accountHoldingsByAccount || {}).filter(
              ([accountId]) => !removedAccountIds.has(String(accountId))
            )
          );

          const accounts = asArray(state.accounts).filter((a) => shouldKeepBrokerage(a.brokerageName));
          const snapTradeAccounts = asArray(state.snapTradeAccounts).filter((a) =>
            shouldKeepBrokerage(a.brokerageName)
          );

          const accountHoldings = brokeragesAndAccounts.length > 0 ? state.accountHoldings : [];

          return {
            brokeragesAndAccounts,
            accountHoldingsByAccount,
            accounts,
            snapTradeAccounts,
            accountHoldings,
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
