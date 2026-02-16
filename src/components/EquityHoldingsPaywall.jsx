import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "stores/store";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

const resolveHoldings = (account) => {
  if (Array.isArray(account?.holdings)) return account.holdings;
  if (Array.isArray(account?.accountHoldings)) return account.accountHoldings;
  return [];
};

const resolveBrokerageName = (account) =>
  account?.brokerageName || account?.details?.institution_name || "Unknown Brokerage";

const resolveAccountNumber = (account) => {
  if (account?.accountNumber) return String(account.accountNumber);
  const accountRaw = String(account?.Account || "");
  if (accountRaw.includes(" - ")) return accountRaw.split(" - ")[1] || "";
  return String(account?.id || accountRaw || "");
};

const parseHoldingQuantity = (holding) => {
  const value = parseFloat(holding?.Quantity ?? holding?.shares ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const parseHoldingMarketValue = (holding) => {
  const explicit = parseFloat(
    holding?.marketValue ?? holding?.market_value ?? holding?.value ?? holding?.amount ?? NaN
  );
  if (Number.isFinite(explicit)) return explicit;

  const qty = parseHoldingQuantity(holding);
  const price = parseFloat(holding?.price ?? holding?.currentPrice ?? 0);
  if (Number.isFinite(price) && Number.isFinite(qty)) return qty * price;
  return 0;
};

export default function EquityHoldingsPaywall({ sx = {} }) {
  const navigate = useNavigate();
  const brokeragesAndAccounts = useAppStore((state) => state.brokeragesAndAccounts);
  const accounts = useAppStore((state) => state.accounts);
  const snapTradeAccounts = useAppStore((state) => state.snapTradeAccounts);

  const allAccounts = [
    ...(Array.isArray(brokeragesAndAccounts) ? brokeragesAndAccounts : []),
    ...(Array.isArray(accounts) ? accounts : []),
    ...(Array.isArray(snapTradeAccounts) ? snapTradeAccounts : []),
  ].filter((account) => resolveHoldings(account).length > 0);

  const dedupedAccounts = Array.from(
    allAccounts.reduce((map, account) => {
      const key = `${resolveBrokerageName(account)}::${resolveAccountNumber(account)}`;
      if (!map.has(key)) {
        map.set(key, account);
        return map;
      }

      const existing = map.get(key);
      const existingHoldings = resolveHoldings(existing).length;
      const incomingHoldings = resolveHoldings(account).length;
      if (incomingHoldings > existingHoldings) {
        map.set(key, account);
      }

      return map;
    }, new Map())
  ).map((entry) => entry[1]);

  const allPositions = dedupedAccounts
    .flatMap((account) =>
      resolveHoldings(account).map((holding) => ({
        symbol: String(holding?.Symbol ?? holding?.symbol ?? "").trim(),
        market: String(holding?.Market ?? holding?.market ?? "").trim().toUpperCase(),
        quantity: parseHoldingQuantity(holding),
        marketValue: parseHoldingMarketValue(holding),
      }))
    )
    .filter((position) => position.symbol && position.quantity > 0)
    .sort((a, b) => b.marketValue - a.marketValue);

  if (allPositions.length === 0) return null;

  const visiblePositions = allPositions.slice(0, 5);
  const lockedPositions = allPositions.slice(5);

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        ...sx,
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        Equity Holdings
      </Typography>

      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          backgroundColor: "rgba(25,118,210,0.08)",
          border: "1px solid rgba(25,118,210,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Want to see all equity holdings? Get Started and register.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/billing")}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Get Started
        </Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 1, mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Symbol
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Market
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Quantity
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "right" }}>
          Market Value
        </Typography>
      </Box>

      {visiblePositions.map((position, idx) => (
        <Box
          key={`position-visible-${position.symbol}-${idx}`}
          sx={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 1,
            py: 0.75,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="body2">{position.symbol}</Typography>
          <Typography variant="body2">{position.market || "-"}</Typography>
          <Typography variant="body2">{position.quantity.toLocaleString()}</Typography>
          <Typography variant="body2" sx={{ textAlign: "right" }}>
            ${Math.round(position.marketValue).toLocaleString()}
          </Typography>
        </Box>
      ))}

      {lockedPositions.length > 0 && (
        <>
          {lockedPositions.map((position, idx) => (
            <Box
              key={`position-locked-${position.symbol}-${idx}`}
              sx={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr",
                gap: 1,
                py: 0.75,
                borderTop: "1px solid",
                borderColor: "divider",
                filter: "blur(6px)",
                userSelect: "none",
              }}
            >
              <Typography variant="body2">{position.symbol}</Typography>
              <Typography variant="body2">{position.market || "-"}</Typography>
              <Typography variant="body2">{position.quantity.toLocaleString()}</Typography>
              <Typography variant="body2" sx={{ textAlign: "right" }}>
                ${Math.round(position.marketValue).toLocaleString()}
              </Typography>
            </Box>
          ))}
        </>
      )}
    </Paper>
  );
}

EquityHoldingsPaywall.propTypes = {
  sx: PropTypes.object,
};
