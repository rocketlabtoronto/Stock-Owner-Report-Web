import { useState, useEffect, useMemo } from "react";
import supabaseService from "services/supabaseService";
import { useAppStore } from "../../stores/store";
import { logoFromBank } from "../../utils/brokerageLogos";

const columns = [
  { name: "Company", align: "left" },
  { name: "Ownership Share", align: "right" },
  { name: "Assets", align: "right" },
  { name: "Equity", align: "right" },
  { name: "Cash & Equivalents", align: "right" },
  { name: "Liabilities", align: "right" },
];

const allowedMarkets = new Set(["NASDAQ", "NYSE"]);
const normalizeMarket = (market) => String(market || "").trim().toUpperCase();
const getDisallowedMarkets = (holdings) =>
  (Array.isArray(holdings) ? holdings : [])
    .map((holding) => normalizeMarket(holding.Market || holding.market))
    .filter((market) => !allowedMarkets.has(market));
const resolveAvailability = (holdings) => {
  const disallowed = getDisallowedMarkets(holdings);
  return {
    isAvailable: disallowed.length === 0 && Array.isArray(holdings) && holdings.length > 0,
    disallowedMarkets: Array.from(new Set(disallowed.filter(Boolean))),
  };
};

function useAggregatedFinancials(selectedAccountId = null) {
  const [aggregatedData, setAggregatedData] = useState({
    columns,
    rows: [],
    brokerageAccounts: [],
  });
  const [loading, setLoading] = useState(true);

  const accounts = useAppStore((state) => state.accounts) || [];
  const resolveHoldings = (item) => item.holdings || [];

  const accountEntries = useMemo(
    () => (Array.isArray(accounts) ? accounts : []).map((item) => {
      const accountRaw = String(item.Account || "");
      const holdings = resolveHoldings(item);
      return { item, accountRaw, holdings };
    }),
    [accounts]
  );

  const allAccountsWithLogos = useMemo(
    () => accountEntries
      .filter(({ holdings }) => Array.isArray(holdings) && holdings.length > 0)
      .map(({ item, accountRaw, holdings }) => {
        const [namePart, numberPart] = accountRaw.split(" - ");
        const brokerageName = (namePart || "Unknown Brokerage").trim();
        const accountNumber = (numberPart || "").trim();
        const availability = resolveAvailability(holdings);
        return {
          id: accountRaw,
          brokerageName,
          accountNumber,
          logo: logoFromBank(item.bank),
          isAvailable: availability.isAvailable,
          disallowedMarkets: availability.disallowedMarkets,
          holdings,
        };
      }),
    [accountEntries]
  );

  // Derive a flattened portfolio view from the canonical accounts collection.
  const defaultHoldings = useMemo(
    () => allAccountsWithLogos
      .filter((account) => account.isAvailable)
      .flatMap((account) => account.holdings || []),
    [allAccountsWithLogos]
  );

  useEffect(() => {
    async function loadAggregatedFinancials() {
      try {
        const firstAvailableAccount =
          allAccountsWithLogos.find((account) => account.isAvailable && (account.holdings || []).length > 0) ||
          allAccountsWithLogos.find((account) => (account.holdings || []).length > 0) ||
          null;

        const resolvedAccountId = selectedAccountId || firstAvailableAccount?.id || null;

        const targetHoldings = resolvedAccountId
          ? allAccountsWithLogos.find((account) => account.id === resolvedAccountId)?.holdings ||
            []
          : defaultHoldings;

        if (!targetHoldings || targetHoldings.length === 0) {
          setAggregatedData({
            columns,
            rows: [],
            brokerageAccounts: allAccountsWithLogos,
          });
          setLoading(false);
          return;
        }

        const rows = await Promise.all(
          (targetHoldings || []).map(async ({ Symbol, Quantity }) => {
            const quantity = parseFloat(Quantity);
            if (isNaN(quantity) || quantity <= 0) {
              // Return a row with N/A values instead of null
              return {
                Company: `${Symbol} (${Symbol})`,
                "Ownership Share": "N/A",
                Assets: "N/A",
                Equity: "N/A",
                "Cash & Equivalents": "N/A",
                Liabilities: "N/A",
              };
            }
            try {
              const financials = await supabaseService.getFinancials({ ticker: Symbol });

              // If no financials found, still return a row with N/A values
              if (!Array.isArray(financials) || financials.length === 0) {
                return {
                  Company: `${Symbol} (${Symbol})`,
                  "Ownership Share": "N/A",
                  Assets: "N/A",
                  Equity: "N/A",
                  "Cash & Equivalents": "N/A",
                  Liabilities: "N/A",
                };
              }

              const requiredTags = [
                "Assets",
                "Equity",
                "CashAndEquivalents",
                "Liabilities",
                "SharesOutstanding",
              ];

              const tagMap = {};
              for (const row of financials) {
                const { tag, value, fy_end_date } = row;
                if (!requiredTags.includes(tag) || value == null) continue;
                const isNewer =
                  !tagMap[tag] || new Date(fy_end_date) > new Date(tagMap[tag].fy_end_date);
                if (isNewer) tagMap[tag] = row;
              }

              const sharesOutstanding = Number(tagMap["SharesOutstanding"]?.value);
              const hasValidShares =
                sharesOutstanding && !isNaN(sharesOutstanding) && sharesOutstanding > 0;

              const prorated = (tag) => {
                if (!hasValidShares) return null; // Can't calculate without shares outstanding
                const val = Number(tagMap[tag]?.value);
                return isNaN(val) ? null : (val / sharesOutstanding) * quantity;
              };

              const formatMoney = (num) =>
                num !== null
                  ? "$" + Number(num).toLocaleString("en-US", { maximumFractionDigits: 0 })
                  : "N/A";

              const formatOwnership = (q, s) => {
                if (!hasValidShares) return "N/A";
                const ratio = s / q;
                const units =
                  ratio >= 1_000_000
                    ? `${(ratio / 1_000_000).toFixed(2)}M`
                    : `${(ratio / 1_000).toFixed(2)}K`;
                return `1 in ${units}`;
              };

              // Always return a row, even if we can't calculate ownership
              return {
                Company: `${Symbol} (${Symbol})`,
                "Ownership Share": formatOwnership(quantity, sharesOutstanding),
                Assets: formatMoney(prorated("Assets")),
                Equity: formatMoney(prorated("Equity")),
                "Cash & Equivalents": formatMoney(prorated("CashAndEquivalents")),
                Liabilities: formatMoney(prorated("Liabilities")),
              };
            } catch (err) {
              console.error(`Error loading financials for ${Symbol}:`, err);
              // Return a row with N/A values instead of null
              return {
                Company: `${Symbol} (${Symbol})`,
                "Ownership Share": "N/A",
                Assets: "N/A",
                Equity: "N/A",
                "Cash & Equivalents": "N/A",
                Liabilities: "N/A",
              };
            }
          })
        );

        const filteredRows = rows.filter(Boolean);

        setAggregatedData({
          columns,
          rows: filteredRows,
          brokerageAccounts: allAccountsWithLogos,
        });
      } catch (error) {
        console.error("Failed to load aggregated financials:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAggregatedFinancials();
  }, [defaultHoldings, accounts, selectedAccountId]);

  return { loading, aggregatedData, allAccountsWithLogos };
}

export default useAggregatedFinancials;
