import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "stores/useAuthStore";
import { useAppStore } from "stores/store";
import { supabase } from "../supabaseClient";
import { mapSnapTradeAccountsToSpreadsheet } from "services/snaptradeMapping";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

async function fetchSnapTradeAccounts(userId, userSecret) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase configuration for snaptrade-accounts");
  }

  const { data, error } = await supabase.functions.invoke("snaptrade-accounts", {
    body: { userId, userSecret },
  });

  if (error) {
    console.error("SnapTrade accounts invoke error:", error);
    throw new Error(`SnapTrade accounts fetch error: ${error.message || error}`);
  }

  return data;
}

export default function SnapTradeRedirect() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const userSecret = useAuthStore((state) => state.snapUserSecret);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const setSnapTradeAccounts = useAppStore((state) => state.setSnapTradeAccounts);
  const setSnapTradeHoldings = useAppStore((state) => state.setSnapTradeHoldings);
  const upsertBrokerageAccount = useAppStore((state) => state.upsertBrokerageAccount);
  const setAccountHoldings = useAppStore((state) => state.setAccountHoldings);
  const setAccountHoldingsForAccount = useAppStore((state) => state.setAccountHoldingsForAccount);

  useEffect(() => {
    async function load() {
      try {
        setStatus("loading");
        setError("");

        if (window.self !== window.top) {
          window.parent?.postMessage(
            { status: "SNAPTRADE_REDIRECT" },
            window.location.origin
          );
          window.top.location.assign("/snapTradeRedirect");
          return;
        }

        let snapTradeUserId = user?.email || null;
        let resolvedUserSecret = userSecret;

        if (!snapTradeUserId) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          snapTradeUserId = session?.user?.email || null;
        }

        if (snapTradeUserId && !resolvedUserSecret) {
          const { data: userRow, error: userError } = await supabase
            .from("users")
            .select("snapusersecret")
            .eq("email", snapTradeUserId)
            .single();
          if (userError) {
            throw new Error(`Failed to fetch SnapTrade secret: ${userError.message}`);
          }
          resolvedUserSecret = userRow?.snapusersecret;
        }

        if (!snapTradeUserId || !resolvedUserSecret) {
          throw new Error("Missing user or SnapTrade secret");
        }

        const result = await fetchSnapTradeAccounts(snapTradeUserId, resolvedUserSecret);

        const allHoldings = result.accounts.flatMap((acct) => acct.holdings || []);
        setSnapTradeHoldings(allHoldings);

        const { mappedItems, holdingsByAccount, flatHoldings, displayAccounts } =
          mapSnapTradeAccountsToSpreadsheet(result.accounts);

        setSnapTradeAccounts(displayAccounts);

        mappedItems.forEach((item) => {
          upsertBrokerageAccount({ Account: item.accountRaw, bank: item.bank, holdings: item.holdings });
        });

        Object.entries(holdingsByAccount).forEach(([accountId, holdings]) => {
          setAccountHoldingsForAccount(accountId, holdings);
        });

        if (flatHoldings.length > 0) {
          setAccountHoldings(flatHoldings);
        }

        setStatus("success");
        setTimeout(() => navigate("/brokeragesAndAccounts"), 500);
      } catch (e) {
        console.error("SnapTradeRedirect error:", e);
        setStatus("error");
        setError(e?.message || "Failed to load SnapTrade accounts.");
      }
    }
    load();
  }, [user, userSecret, setSnapTradeAccounts, setSnapTradeHoldings]);

  const showOverlay = status === "loading" || status === "success" || status === "error";
  const title =
    status === "loading"
      ? "Loading your SnapTrade accounts…"
      : status === "success"
      ? "SnapTrade connection complete"
      : "We couldn’t finish loading your SnapTrade accounts";
  const subtitle =
    status === "loading"
      ? "Hang tight while we sync your accounts."
      : status === "success"
      ? "Redirecting you back to Brokerages & Accounts…"
      : "Please try again or return to your accounts page.";

  return (
    <Backdrop
      open={showOverlay}
      sx={{
        color: "#0f172a",
        zIndex: (theme) => theme.zIndex.modal + 20,
        backgroundColor: "rgba(248, 250, 252, 0.92)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          px: 4,
          py: 3,
          borderRadius: 3,
          background: "#ffffff",
          boxShadow: "0 18px 48px rgba(15, 23, 42, 0.15)",
          border: "1px solid rgba(226, 232, 240, 0.9)",
          minWidth: 320,
          maxWidth: 420,
          textAlign: "center",
        }}
      >
        {status !== "error" ? (
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "4px solid rgba(148, 163, 184, 0.35)",
              borderTopColor: "#38bdf8",
              borderRightColor: "#22c55e",
              animation: "snaptrade-spin 1s linear infinite",
              "@keyframes snaptrade-spin": {
                to: { transform: "rotate(360deg)" },
              },
            }}
          />
        ) : (
          <CircularProgress size={36} color="error" />
        )}
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(71, 85, 105, 0.9)" }}>
          {subtitle}
        </Typography>
        {status === "error" && (
          <Box sx={{ mt: 1, width: "100%" }}>
            <Typography variant="caption" sx={{ color: "#fda4af" }}>
              {error}
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 2, textTransform: "none", fontWeight: 600 }}
              onClick={() => navigate("/brokeragesAndAccounts")}
            >
              Go back
            </Button>
          </Box>
        )}
      </Box>
    </Backdrop>
  );
}
