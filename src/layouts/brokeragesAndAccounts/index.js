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
  const unlinkBrokerage = useAppStore((state) => state.unlinkBrokerage);

  const [open, setOpen] = useState(false);
  const [snapTradeSuccess, setSnapTradeSuccess] = useState(false);
  const [calculatedBalances, setCalculatedBalances] = useState({});
  const [balancesLoading, setBalancesLoading] = useState(false);

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
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.primary.main}08, ${theme.palette.primary.dark}10)`,
              }}
            >
              {/* subtle background accent */}
              <Box
                sx={{
                  position: "absolute",
                  top: -60,
                  right: -80,
                  width: 300,
                  height: 300,
                  borderRadius: "50%",
                  background: (theme) => `${theme.palette.primary.main}14`,
                  filter: "blur(6px)",
                }}
              />
              <Stack spacing={4} position="relative">
                <Typography
                  variant="body2"
                  color="text.secondary"
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
          brokerages.map((brokerage, index) => {
            const { linkedCount, totalCount, linkedBalance } = computeSummary(brokerage.accounts);
            return (
              <Accordion key={`${brokerage.name}-${index}`}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" flexDirection="column" width="100%">
                    <Box display="flex" alignItems="center" gap={1}>
                      <img
                        src={brokerage.logo}
                        alt={`${brokerage.name} logo`}
                        style={{ height: 48 }}
                      />
                      <Typography variant="h6">{brokerage.name}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {linkedCount} of {totalCount} accounts linked
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
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
                            backgroundColor: isAvailable ? "transparent" : "#f7f7f7",
                            borderRadius: 2,
                          }}
                        >
                          <Checkbox
                            checked={account.included}
                            onChange={() => toggleInclude(account.id)}
                            disabled={!isAvailable}
                          />
                          <ListItemText
                            primary={`${account.accountType} | #${
                              account.accountNumber || "N/A"
                            }`}
                            primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                            secondary={
                              <Box display="flex" flexDirection="column" gap={0.4}>
                                <Typography variant="caption" color="text.secondary">
                                  Equities Value (Stocks & ETFs Only):{" "}
                                  {balancesLoading
                                    ? "Calculating..."
                                    : account.equitiesValue != null
                                    ? `$${Math.round(account.equitiesValue).toLocaleString()}`
                                    : "N/A"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Holdings: {account.validHoldingsCount || account.holdings?.length || 0} (
                                  {account.holdings?.length || 0} total)
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color={isAvailable ? "text.secondary" : "text.secondary"}
                                  fontWeight={500}
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
                  <Box mt={1} display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => unlinkBrokerage(brokerage.name)}
                      sx={{
                        backgroundColor: "#fff",
                        color: "#000",
                        borderColor: "#000",
                        fontWeight: 500,
                        "&:hover": {
                          backgroundColor: "#f5f5f5",
                          borderColor: "#000",
                          color: "#000",
                        },
                      }}
                    >
                      Unlink Brokerage
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
        {brokerages.length > 0 && (
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={handleOpen}
              sx={{
                backgroundColor: "#fff",
                color: "#000",
                borderColor: "#000",
                fontWeight: 500,
                fontSize: 16,
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                  borderColor: "#000",
                  color: "#000",
                },
                minWidth: 200,
              }}
            >
              Connect Another Brokerage
            </Button>
          </Box>
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
