import { useState, useEffect } from "react";
import supabaseService from "services/supabaseService";
import { useAppStore } from "../../stores/store";
import { logoFromBank } from "../../utils/brokerageLogos";

const columns = [
  { name: "Company", align: "left" },
  { name: "Ownership Share", align: "right" },
  { name: "Revenue", align: "right" },
  { name: "Gross Profit", align: "right" },
  { name: "Operating Profit", align: "right" },
  { name: "Net Income", align: "right" },
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

function useAggregatedIncomeStatement(selectedAccountId = null) {
  const [aggregatedData, setAggregatedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const portfolioHoldings = useAppStore((state) => state.accountHoldings) || [];
  const holdingsByAccount = useAppStore((state) => state.accountHoldingsByAccount) || {};
  const brokeragesAndAccounts = useAppStore((state) => state.brokeragesAndAccounts) || [];

  // Build account list with logos for selector
  const accountsWithHoldings = (Array.isArray(brokeragesAndAccounts) ? brokeragesAndAccounts : [])
    .map((item) => {
      const accountRaw = String(item.Account || "");
      const holdings = holdingsByAccount[accountRaw] || item.holdings || item.accountHoldings || [];
      return { item, accountRaw, holdings };
    })
    .filter(({ holdings }) => holdings.length > 0);

  const allAccountsWithLogos = accountsWithHoldings.map(({ item, accountRaw, holdings }) => {
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
  });

  // Flatten nested holdings if top-level is empty
  const availableHoldings = allAccountsWithLogos
    .filter((account) => account.isAvailable)
    .flatMap((account) => account.holdings || []);
  const defaultHoldings = portfolioHoldings?.length ? portfolioHoldings : availableHoldings;

  useEffect(() => {
    async function loadAggregatedIncomeStatement() {
      try {
        const targetHoldings = selectedAccountId
          ? holdingsByAccount[selectedAccountId] || []
          : defaultHoldings;

        if (!Array.isArray(targetHoldings) || targetHoldings.length === 0) {
          setAggregatedData({ columns, rows: [] });
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
                Revenue: "N/A",
                "Gross Profit": "N/A",
                "Operating Profit": "N/A",
                "Net Income": "N/A",
              };
            }

            try {
              const financials = await supabaseService.getFinancials({ ticker: Symbol });

              // If no financials found, still return a row with N/A values
              if (!Array.isArray(financials) || financials.length === 0) {
                return {
                  Company: `${Symbol} (${Symbol})`,
                  "Ownership Share": "N/A",
                  Revenue: "N/A",
                  "Gross Profit": "N/A",
                  "Operating Profit": "N/A",
                  "Net Income": "N/A",
                };
              }

              const requiredTags = [
                "Revenue",
                "GrossProfit",
                "OperatingProfit",
                "NetIncome",
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
                Revenue: formatMoney(prorated("Revenue")),
                "Gross Profit": formatMoney(prorated("GrossProfit")),
                "Operating Profit": formatMoney(prorated("OperatingProfit")),
                "Net Income": formatMoney(prorated("NetIncome")),
              };
            } catch (err) {
              console.error(`Error loading financials for ${Symbol}:`, err);
              // Return a row with N/A values instead of null
              return {
                Company: `${Symbol} (${Symbol})`,
                "Ownership Share": "N/A",
                Revenue: "N/A",
                "Gross Profit": "N/A",
                "Operating Profit": "N/A",
                "Net Income": "N/A",
              };
            }
          })
        );

        setAggregatedData({
          columns,
          rows: rows.filter(Boolean),
        });
      } catch (error) {
        console.error("Failed to load aggregated income statement:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAggregatedIncomeStatement();
  }, [defaultHoldings, holdingsByAccount, brokeragesAndAccounts, selectedAccountId]);

  return { loading, aggregatedData, allAccountsWithLogos };
}

export default useAggregatedIncomeStatement;
