import React, { useState, useEffect } from "react";
import { useAppStore } from "stores/store";
import supabaseService from "services/supabaseService";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Checkbox from "@mui/material/Checkbox";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import Button from "@mui/material/Button";
import CustomBox from "components/CustomBox";
import DashboardLayout from "ui/LayoutContainers/DashboardLayout";
import DashboardNavbar from "ui/Navbars/DashboardNavbar";
import AddBrokerageDialog from "./AddBrokerageDialog";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { bankLogoMap, logoFromBank } from "utils/brokerageLogos";

// Function to calculate balance using current stock prices
async function calculateBalanceFromStockPrices(holdings) {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return 0;
  }

  console.log(`DEBUG: Total holdings received: ${holdings.length}`);
  console.log(`DEBUG: Holdings data:`, holdings);

  let totalBalance = 0;
  let processedCount = 0;

  for (const holding of holdings) {
    const symbol = holding.Symbol || holding.symbol;
    const quantity = parseFloat(holding.Quantity || holding.shares || 0);

    console.log(`DEBUG: Processing holding - Symbol: ${symbol}, Quantity: ${quantity}`);

    if (!symbol || isNaN(quantity) || quantity <= 0) {
      console.log(`DEBUG: Skipping holding - Symbol: ${symbol}, Quantity: ${quantity} (invalid)`);
      continue;
    }

    processedCount++;
    console.log(`DEBUG: Valid holding #${processedCount} - ${symbol}: ${quantity} shares`);

    try {
      // Fetch current stock price from the stock_prices table
      const stockPrices = await supabaseService.getStockPrices({ symbol: symbol });

      console.log(`DEBUG: Stock prices response for ${symbol}:`, stockPrices);

      if (!Array.isArray(stockPrices) || stockPrices.length === 0) {
        console.log(
          `❌ No stock price found for ${symbol} - this holding will be excluded from balance`
        );
        continue;
      }

      // Get the most recent price (assuming the API returns the latest price first)
      const latestPriceData = stockPrices[0];
      const currentPrice = parseFloat(latestPriceData.price || 0);

      console.log(`DEBUG: ${symbol} price data:`, latestPriceData);
      console.log(`DEBUG: ${symbol} parsed price: ${currentPrice}`);

      if (!isNaN(currentPrice) && currentPrice > 0) {
        const holdingValue = quantity * currentPrice;
        totalBalance += holdingValue;

        console.log(
          `✅ ${symbol}: ${quantity} shares × $${currentPrice.toFixed(2)} = $${holdingValue.toFixed(
            2
          )}`
        );
      } else {
        console.log(
          `❌ Invalid price data for ${symbol}: ${currentPrice} - this holding will be excluded from balance`
        );
      }
    } catch (error) {
      console.error(`Error fetching stock price for ${symbol}:`, error);
    }
  }

  console.log(`DEBUG: Processed ${processedCount} valid holdings out of ${holdings.length} total`);
  console.log(`Total calculated balance: $${totalBalance.toFixed(2)}`);
  return totalBalance;
}

export default function BrokeragesAndAccounts() {
  // Get accounts from Zustand store
  const accounts = useAppStore((state) => state.accounts);
  const setAccounts = useAppStore((state) => state.setAccounts);
  const resetStorage = useAppStore((state) => state.resetStorage);
  const brokeragesAndAccounts = useAppStore((state) => state.brokeragesAndAccounts);
  const accountHoldingsByAccount = useAppStore((state) => state.accountHoldingsByAccount);
  const snapTradeAccounts = useAppStore((state) => state.snapTradeAccounts);
  const snapTradeLastConnectedAt = useAppStore((state) => state.snapTradeLastConnectedAt);
  const unlinkBrokerage = useAppStore((state) => state.unlinkBrokerage);

  const [open, setOpen] = useState(false);
  const [snapTradeSuccess, setSnapTradeSuccess] = useState(false);
  const [calculatedBalances, setCalculatedBalances] = useState({});
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [canConnectBrokerage, setCanConnectBrokerage] = useState(false);

  // Clear old dummy data from localStorage on component mount
  useEffect(() => {
    if (accounts.length > 0 && brokeragesAndAccounts.length === 0) {
      // Only clear if we have accounts but no brokeragesAndAccounts (likely dummy data)
      resetStorage();
    }
  }, []);

  // Calculate balances from financial data
  useEffect(() => {
    async function loadBalances() {
      if (!Array.isArray(brokeragesAndAccounts) || brokeragesAndAccounts.length === 0) {
        return;
      }

      setBalancesLoading(true);
      const newBalances = {};

      for (const item of brokeragesAndAccounts) {
        const accountRaw = String(item.Account || "");
        const holdings = Array.isArray(item.accountHoldings)
          ? item.accountHoldings
          : Array.isArray(item.holdings)
          ? item.holdings
          : [];

        if (holdings.length > 0) {
          try {
            const balance = await calculateBalanceFromStockPrices(holdings);
            newBalances[accountRaw] = balance;
            console.log(`Calculated balance for ${accountRaw}: $${balance.toFixed(2)}`);
          } catch (error) {
            console.error(`Error calculating balance for ${accountRaw}:`, error);
            newBalances[accountRaw] = null;
          }
        } else {
          newBalances[accountRaw] = 0;
        }
      }

      setCalculatedBalances(newBalances);
      setBalancesLoading(false);
    }

    loadBalances();
  }, [brokeragesAndAccounts]);

  // Note: Removed auto-loading of dummy data - users start with empty state

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const getBrokerageAccountCount = (brokerageName) => {
    const normalize = (value) => String(value || "").trim().toLowerCase();
    const target = normalize(brokerageName);
    const manualCount = Array.isArray(useAppStore.getState().brokeragesAndAccounts)
      ? useAppStore
          .getState()
          .brokeragesAndAccounts.filter((item) => normalize(String(item?.Account || "").split(" - ")[0]) === target)
          .length
      : 0;
    const accountsCount = Array.isArray(useAppStore.getState().accounts)
      ? useAppStore.getState().accounts.filter((item) => normalize(item?.brokerageName) === target).length
      : 0;
    const snapCount = Array.isArray(useAppStore.getState().snapTradeAccounts)
      ? useAppStore.getState().snapTradeAccounts.filter((item) => normalize(item?.brokerageName) === target).length
      : 0;
    return manualCount + accountsCount + snapCount;
  };

  const handleUnlinkBrokerage = (brokerageName) => {
    const beforeCount = getBrokerageAccountCount(brokerageName);
    unlinkBrokerage(brokerageName);
    const afterCount = getBrokerageAccountCount(brokerageName);
    if (beforeCount > afterCount) {
      setCanConnectBrokerage(true);
    }
  };

  const allowedMarkets = new Set(["NASDAQ", "NYSE"]);
  const normalizeMarket = (market) => String(market || "").trim().toUpperCase();
  const resolveHoldings = (account) =>
    Array.isArray(account?.holdings)
      ? account.holdings
      : Array.isArray(account?.accountHoldings)
      ? account.accountHoldings
      : [];
  const getDisallowedMarkets = (holdings) => {
    if (!Array.isArray(holdings) || holdings.length === 0) return ["UNKNOWN"];
    return holdings
      .map((holding) => normalizeMarket(holding.Market || holding.market))
      .filter((market) => !allowedMarkets.has(market));
  };
  const resolveAvailability = (holdings) => {
    const disallowed = getDisallowedMarkets(holdings);
    return {
      isAvailable: disallowed.length === 0,
      disallowedMarkets: Array.from(new Set(disallowed.filter(Boolean))),
    };
  };

  const toggleInclude = (accountId) => {
    // Check if this is from the accounts array
    const accountIndex = accounts.findIndex((acc) => acc.id === accountId);
    if (accountIndex !== -1) {
      const updatedAccounts = accounts.map((account) =>
        account.id === accountId ? { ...account, included: !account.included } : account
      );
      setAccounts(updatedAccounts);
    }
    // Note: For brokeragesAndAccounts and snapTradeAccounts,
    // you might need separate update functions
  };

  // Build accounts list purely from brokeragesAndAccounts array
  const manualAccounts = Array.isArray(brokeragesAndAccounts)
    ? brokeragesAndAccounts.map((item) => {
        const accountRaw = String(item.Account || "");
        const [namePart, numberPart] = accountRaw.split(" - ");
        const brokerageName = (namePart || "Unknown Brokerage").trim();
        const accountNum = (numberPart || "").trim();
        const holdings = Array.isArray(item.accountHoldings)
          ? item.accountHoldings
          : Array.isArray(item.holdings)
          ? item.holdings
          : [];

        console.log(`DEBUG: Account ${accountRaw} - Raw holdings count: ${holdings.length}`);
        console.log(`DEBUG: Holdings structure:`, holdings);

        // Use calculated balance from financial data, fallback to price-based calculation
        const calculatedBalance = calculatedBalances[accountRaw];
  let equitiesValue = calculatedBalance;

        // Count only holdings with valid symbols and quantities > 0 for display
        const validHoldingsCount = holdings.filter((h) => {
          const symbol = h.Symbol || h.symbol;
          const quantity = parseFloat(h.Quantity || h.shares || 0);
          return symbol && !isNaN(quantity) && quantity > 0;
        }).length;

        console.log(
          `DEBUG: Account ${accountRaw} - Valid holdings (with symbol & quantity > 0): ${validHoldingsCount} out of ${holdings.length} total`
        );

        // If no calculated balance and we have price data, use price-based calculation
        if (calculatedBalance == null) {
          const priceBasedBalance = holdings.reduce((sum, h) => {
            const qty = parseFloat(h.Quantity ?? h.shares ?? 0);
            const price = parseFloat(h.currentPrice ?? h.price ?? 0);
            const mv =
              h.marketValue != null ? parseFloat(h.marketValue) : price > 0 ? qty * price : 0;
            return sum + (isNaN(mv) ? 0 : mv);
          }, 0);

          const hasBalanceData = holdings.some(
            (h) =>
              (h.currentPrice != null && h.currentPrice > 0) ||
              (h.marketValue != null && h.marketValue > 0)
          );

          equitiesValue = hasBalanceData ? priceBasedBalance : null;
        }
        const availability = resolveAvailability(holdings);
        return {
          id: accountNum || accountRaw || `brokerage_${Math.random()}`,
          brokerageName,
          brokerageLogo: logoFromBank(item.bank),
          accountType: "Account",
          accountNumber: accountNum,
          equitiesValue: equitiesValue, // Stocks & ETFs value from holdings
          balance: equitiesValue, // Backward compatibility
          included: availability.isAvailable,
          holdings,
          validHoldingsCount, // Add the count of valid holdings
          isAvailable: availability.isAvailable,
          disallowedMarkets: availability.disallowedMarkets,
        };
      })
    : [];

  const hasHoldings = (account) => {
    const key = String(account?.Account || account?.id || "");
    const h = accountHoldingsByAccount?.[key];
    if (Array.isArray(h)) return h.length > 0;
    const embedded = account?.holdings || account?.accountHoldings;
    return Array.isArray(embedded) && embedded.length > 0;
  };

  const allAccounts = [...manualAccounts, ...(accounts || []), ...(snapTradeAccounts || [])]
    .filter((account) => account && (account.brokerageName || account.Account))
    .filter(hasHoldings);

  const resolveBrokerageName = (account) =>
    account?.brokerageName || account?.details?.institution_name || "Unknown Brokerage";

  const resolveAccountNumber = (account) => {
    if (account?.accountNumber) return String(account.accountNumber);
    const accountRaw = String(account?.Account || "");
    if (accountRaw.includes(" - ")) {
      return accountRaw.split(" - ")[1] || "";
    }
    return String(account?.id || accountRaw || "");
  };

  const dedupedAccounts = Array.from(
    allAccounts.reduce((map, account) => {
      const brokerageName = resolveBrokerageName(account);
      const accountNumber = resolveAccountNumber(account);
      const key = `${brokerageName}::${accountNumber}`;

      if (!map.has(key)) {
        map.set(key, account);
        return map;
      }

      const existing = map.get(key);
      const existingHoldings = existing?.holdings?.length || 0;
      const nextHoldings = account?.holdings?.length || 0;
      const existingBalance = existing?.balance || 0;
      const nextBalance = account?.balance || 0;

      if (nextHoldings > existingHoldings || nextBalance > existingBalance) {
        map.set(key, account);
      }

      return map;
    }, new Map())
  ).map((entry) => entry[1]);

  const accountsWithAvailability = dedupedAccounts.map((account) => {
    const holdings = resolveHoldings(account);
    const availability = resolveAvailability(holdings);
    return {
      ...account,
      included: availability.isAvailable ? account.included : false,
      isAvailable: availability.isAvailable,
      disallowedMarkets: availability.disallowedMarkets,
    };
  });

  // Group accounts by brokerage (use fallback logo if missing)
  const groupedByBrokerage = accountsWithAvailability.reduce((acc, account) => {
    const brokerageName = resolveBrokerageName(account);
    if (!acc[brokerageName]) {
      acc[brokerageName] = {
        name: brokerageName,
        logo: account.brokerageLogo || logoFromBank(account.bank || brokerageName),
        accounts: [],
      };
    }
    acc[brokerageName].accounts.push(account);
    return acc;
  }, {});

  const brokerages = Object.values(groupedByBrokerage);

  const formattedConnectedAt = snapTradeLastConnectedAt
    ? new Date(snapTradeLastConnectedAt).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const relativeConnectedAt = snapTradeLastConnectedAt
    ? (() => {
        const connectedDate = new Date(snapTradeLastConnectedAt);
        const diffMs = Date.now() - connectedDate.getTime();
        if (Number.isNaN(diffMs) || diffMs < 0) return "Just now";
        const minutes = Math.floor(diffMs / 60000);
        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes} min ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? "s" : ""} ago`;
      })()
    : null;

  const computeSummary = (accounts) => {
    const linked = accounts.filter((a) => a.included);
    const linkedCount = linked.length;
    const totalCount = accounts.length;
    const linkedBalance = linked.reduce(
      (sum, a) => sum + (a.equitiesValue ?? a.balance ?? 0),
      0
    );
    return { linkedCount, totalCount, linkedBalance };
  };

  // Logos that are roughly square and need a visual scale boost
  const squareLogoBoost = new Set([
    "/logos/CIBC.png",
    "/logos/TD.png",
    "/logos/rbc.png",
    "/logos/bmo.png",
    "/logos/nbdb.png",
    "/logos/scotia.png",
    "/logos/ibkr.png",
    "/logos/fidelity.png",
    "/logos/etrade.png",
    "/logos/robinhood.png",
    "/logos/vanguard.png",
    "/logos/merrill.png",
    "/logos/charles.png",
    "/logos/chase.png",
    "/logos/questrade.png",
  ]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <CustomBox py={3}>
        {/* Main Content */}
        {brokerages.length === 0 ? (
          // Enhanced Empty State
          <Box px={{ xs: 1, md: 2 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, md: 6 },
                mb: 4,
                borderRadius: 4,
                position: "relative",
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: 4,
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.primary.main}08, ${theme.palette.primary.dark}10)`,
              }}
            >
              <Stack spacing={4} position="relative">
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{ maxWidth: 960, lineHeight: 1.55 }}
                >
                  Connect your brokerage to instantly unify holdings across accounts, and see your
                  proportional share of revenue and profit, and focus decisions on business
                  value—not stock price volatility. This is your look‑through profits dashboard:
                  invest like a business owner, not a speculator.
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2.5}
                  alignItems={{ xs: "stretch", sm: "center" }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleOpen}
                    sx={{
                      background: "linear-gradient(90deg,#2e7d32,#43a047)",
                      fontWeight: 600,
                      px: 4,
                      py: 1.8,
                      fontSize: 16,
                      borderRadius: 3,
                      textTransform: "none",
                      letterSpacing: 0.3,
                      boxShadow: "0 6px 18px rgba(46,125,50,0.35)",
                      transition: "all .25s",
                      color: "#fff",
                      "& .MuiButton-startIcon svg": { color: "#fff" },
                      "&:hover": {
                        background: "linear-gradient(90deg,#25662a,#378a39)",
                        boxShadow: "0 10px 26px rgba(46,125,50,0.45)",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    Connect Brokerage
                  </Button>
                  <Stack direction="row" spacing={1} alignItems="center" color="success.main">
                    <CheckCircleOutlineIcon fontSize="small" />
                    <Typography variant="body2" color="success.main">
                      Your financial data remains private and is never stored on external servers.
                    </Typography>
                  </Stack>
                </Stack>
                {/* Logos grid */}
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                    SUPPORTED INSTITUTIONS
                  </Typography>
                  <Grid container spacing={2} mt={0.5}>
                    {Array.from(new Set(Object.values(bankLogoMap)))
                      .slice(0, 12)
                      .map((src) => (
                        <Grid item xs={4} sm={3} md={2} key={src}>
                          <Paper
                            variant="outlined"
                            sx={{
                              px: 1,
                              py: 1,
                              borderRadius: 3,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: "background.paper",
                              transition: "all .25s",
                              height: 90,
                              position: "relative",
                              overflow: "hidden",
                              "&:hover": {
                                boxShadow: 3,
                                transform: "translateY(-3px)",
                              },
                            }}
                          >
                            <Box
                              component="img"
                              src={src}
                              alt="brokerage logo"
                              sx={{
                                height: 56,
                                width: "auto",
                                maxWidth: "100%",
                                objectFit: "contain",
                                display: "block",
                                // Removed transform scaling to keep all within outline
                              }}
                            />
                          </Paper>
                        </Grid>
                      ))}
                  </Grid>
                </Box>
              </Stack>
            </Paper>
          </Box>
        ) : (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2.5,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: (theme) => `0 12px 28px ${theme.palette.grey[300]}40`,
              overflow: "hidden",
              backgroundColor: "background.paper",
            }}
          >
            {formattedConnectedAt && (
              <>
                <Box
                  sx={{
                    px: { xs: 1.5, sm: 2.25 },
                    py: 0.85,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.25,
                    flexWrap: "wrap",
                    background: (theme) =>
                      `linear-gradient(90deg, ${theme.palette.primary.main}08, ${theme.palette.common.white})`,
                    borderLeft: "4px solid",
                    borderLeftColor: "primary.main",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: "primary.light",
                        color: "primary.main",
                      }}
                    >
                      <AccessTimeOutlinedIcon sx={{ fontSize: 14 }} />
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          letterSpacing: 0.8,
                          textTransform: "uppercase",
                          fontWeight: 700,
                          lineHeight: 1.1,
                          fontSize: 11,
                        }}
                      >
                        SnapTrade Sync
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "text.primary", fontWeight: 500, lineHeight: 1.15, fontSize: 12.5 }}
                      >
                        Last connected {relativeConnectedAt}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontWeight: 600, fontSize: 11, letterSpacing: 0.2 }}
                  >
                    {formattedConnectedAt}
                  </Typography>
                </Box>
                <Divider />
              </>
            )}

            {brokerages.map((brokerage, index) => {
              const { linkedCount, totalCount, linkedBalance } = computeSummary(brokerage.accounts);
              return (
                <Accordion
                  key={`${brokerage.name}-${index}`}
                  disableGutters
                  elevation={0}
                  square
                  sx={{
                    "&:before": { display: "none" },
                    borderTop: index === 0 ? "none" : "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      px: { xs: 1.5, sm: 2.25 },
                      py: 0.1,
                      minHeight: 46,
                      "& .MuiAccordionSummary-content": { my: 0 },
                    }}
                  >
                    <Box display="flex" flexDirection="column" width="100%">
                      <Box display="flex" alignItems="center" gap={0.75}>
                        <img
                          src={brokerage.logo}
                          alt={`${brokerage.name} logo`}
                          style={{ height: 34 }}
                        />
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700, lineHeight: 1.15, letterSpacing: 0.08 }}
                        >
                          {brokerage.name}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1} flexWrap="wrap" mt={0.1}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600, lineHeight: 1.1 }}
                        >
                          {linkedCount} of {totalCount} accounts linked
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 700, lineHeight: 1.1 }}
                        >
                          Linked value: ${Math.round(linkedBalance).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: { xs: 1.5, sm: 2.25 }, pb: 0.4, pt: 0 }}>
                    <List sx={{ py: 0 }}>
                      {brokerage.accounts.map((account) => {
                        const isAvailable = account.isAvailable !== false;
                        const marketMessage = isAvailable
                          ? "Supported by The Stock Owner Report (NYSE/NASDAQ)"
                          : `Unsupported market: ${
                              account.disallowedMarkets?.length
                                ? account.disallowedMarkets.join(", ")
                                : "Unsupported market"
                            }`;
                        return (
                          <ListItem
                            key={account.id}
                            divider
                            sx={{
                              opacity: isAvailable ? 1 : 0.6,
                              backgroundColor: isAvailable ? "background.paper" : "grey.100",
                              borderRadius: 1.5,
                              border: "1px solid",
                              borderColor: "divider",
                              mb: 0.25,
                              px: 0.75,
                              py: 0.2,
                            }}
                          >
                            <Checkbox
                              checked={account.included}
                              onChange={() => toggleInclude(account.id)}
                              disabled={!isAvailable}
                              size="small"
                              sx={{ mr: 0.35, p: 0.5 }}
                            />
                            <ListItemText
                              primary={`${account.accountType} | #${
                                account.accountNumber || "N/A"
                              }`}
                              primaryTypographyProps={{ variant: "body2", fontWeight: 700, fontSize: 14 }}
                              secondaryTypographyProps={{ component: "div" }}
                              secondary={
                                <Box display="flex" flexDirection="column" gap={0}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: 11.5, lineHeight: 1.25 }}
                                  >
                                    Equities Value (Stocks & ETFs Only):{" "}
                                    {balancesLoading
                                      ? "Calculating..."
                                      : account.equitiesValue != null
                                      ? `$${Math.round(account.equitiesValue).toLocaleString()}`
                                      : "N/A"}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: 11.5, lineHeight: 1.25 }}
                                  >
                                    Holdings: {account.validHoldingsCount || account.holdings?.length || 0} (
                                    {account.holdings?.length || 0} total)
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color={isAvailable ? "text.secondary" : "text.secondary"}
                                    fontWeight={600}
                                    sx={{ fontSize: 11.5, lineHeight: 1.25 }}
                                  >
                                    {marketMessage}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                    <Box mt={0.15} display="flex" gap={0.75}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleUnlinkBrokerage(brokerage.name)}
                        sx={{
                          textTransform: "none",
                          borderRadius: 1.5,
                          backgroundColor: "background.paper",
                          color: "text.primary",
                          borderColor: "divider",
                          fontWeight: 600,
                          fontSize: 11.5,
                          px: 1.2,
                          py: 0.2,
                          "&:hover": {
                            backgroundColor: "grey.100",
                            borderColor: "text.secondary",
                            color: "text.primary",
                          },
                        }}
                      >
                        Unlink Brokerage
                      </Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}

            <Box
              mt={0.25}
              pt={0.4}
              pb={1.2}
              px={{ xs: 1.5, sm: 2.25 }}
              display="flex"
              justifyContent="flex-end"
            >
              <Button
                variant="contained"
                onClick={handleOpen}
                disabled={!canConnectBrokerage}
                sx={{
                  background: (theme) =>
                    `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "none",
                  borderRadius: 1.5,
                  px: 2,
                  py: 0.6,
                  "&:hover": {
                    background: (theme) =>
                      `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                  },
                  minWidth: 175,
                  "&.Mui-disabled": {
                    background: "#c4c9d4",
                    color: "#ffffff",
                    opacity: 0.85,
                  },
                }}
              >
                Connect Brokerage
              </Button>
            </Box>
          </Paper>
        )}
      </CustomBox>
      <AddBrokerageDialog
        open={open}
        onClose={() => setOpen(false)}
        onSnapTradeSuccess={() => {
          setSnapTradeSuccess(true);
          setTimeout(() => setSnapTradeSuccess(false), 4000);
        }}
      />
      {snapTradeSuccess && (
        <Box mt={2}>
          <Typography color="success.main">SnapTrade connection successful!</Typography>
        </Box>
      )}
    </DashboardLayout>
  );
}
