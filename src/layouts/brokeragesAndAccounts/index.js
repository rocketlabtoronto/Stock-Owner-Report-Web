import SecurityDataPanel from "./SecurityDataPanel";
import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "stores/store";
import { useWorkspaceStore } from "stores/useWorkspaceStore";
import { groupBrokerageAccounts } from "./accountModel";
import useAccountBalances from "./useAccountBalances";
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
import Divider from "@mui/material/Divider";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import Button from "@mui/material/Button";
import CustomBox from "components/CustomBox";
import DashboardLayout from "ui/LayoutContainers/DashboardLayout";
import DashboardNavbar from "ui/Navbars/DashboardNavbar";
import AddBrokerageDialog from "./AddBrokerageDialog";
import ConsentModal from "./ConsentModal";
import SecurityDetailsModal from "./SecurityDetailsModal";
import { bankLogoMap } from "utils/brokerageLogos";
import { SUPPORTED_MARKETS } from "utils/portfolioSchema";
import SignInModal from "./workspace/SignInModal";
import UploadPortfolioDialog from "./workspace/UploadPortfolioDialog";
import { ACTION_TO_WORKSPACE_TYPE, setPendingWorkspaceAction } from "./workspace/workspaceActions";

const CONSENT_STORAGE_KEY = "brokerage_consent";

export default function BrokeragesAndAccounts() {
  const accounts = useAppStore((state) => state.accounts);
  const snapTradeLastConnectedAt = useAppStore((state) => state.snapTradeLastConnectedAt);
  const handleUnlinkBrokerage = useAppStore((state) => state.unlinkBrokerage);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [securityDetailsOpen, setSecurityDetailsOpen] = useState(false);
  const [snapTradeSuccess, setSnapTradeSuccess] = useState(false);
  const [signInAction, setSignInAction] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const { balances: calculatedBalances, loading: balancesLoading } = useAccountBalances(accounts);

  // Opens the consent gate; after acceptance, opens AddBrokerageDialog
  const handleOpen = () => setConsentOpen(true);

  // Both entry points require sign-in and a matching workspace type before
  // starting their own workflow (Upload Portfolio modal, or the existing
  // SnapTrade/manual-CSV Connect a Brokerage flow).
  const openForAction = (action) => {
    setWorkspaceMessage("");
    const requiredType = ACTION_TO_WORKSPACE_TYPE[action];
    if (workspace) {
      if (workspace.workspace_type !== requiredType) {
        setWorkspaceMessage(
          workspace.workspace_type === "upload_portfolio"
            ? "Your workspace is set up for Upload Portfolio. Connect a Brokerage isn't available here."
            : "Your workspace is set up for Connect a Brokerage. Upload Portfolio isn't available here."
        );
        return;
      }
      if (action === "upload") setUploadDialogOpen(true);
      else handleOpen();
      return;
    }
    setPendingWorkspaceAction(action);
    setSignInAction(action);
  };

  useEffect(() => {
    const continueAction = location.state?.continueAction;
    if (continueAction && workspace) {
      openForAction(continueAction);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, workspace]);

  const handleConsentAccept = (record) => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch (_) {
      // localStorage unavailable — proceed anyway
    }
    setConsentOpen(false);
    setOpen(true);
  };

  const brokerages = useMemo(
    () => groupBrokerageAccounts(accounts, calculatedBalances),
    [accounts, calculatedBalances]
  );

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
    const linkedBalance = linked.reduce((sum, a) => sum + (a.equitiesValue ?? 0), 0);
    const hasLinkedValue = linked.some((a) => a.equitiesValue != null);
    return { linkedCount, totalCount, linkedBalance, hasLinkedValue };
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <CustomBox py={1}>
        {/* Main Content */}
        {brokerages.length === 0 ? (
          // ── Goldman-tier empty state ──
          <Box>
            {/* ── Primary panel ── */}
            <Paper
              elevation={0}
              sx={{
                mb: 0,
                borderRadius: 0,
                border: "none",
                borderTop: "3px solid #0d1b2a",
                borderBottom: "1px solid #d6d9de",
                backgroundColor: "#fff",
                overflow: "hidden",
              }}
            >
              {/* ── Section header ── */}
              <Box
                sx={{
                  px: { xs: 4, md: 6 },
                  pt: 4,
                  pb: 3.5,
                  borderBottom: "1px solid #d6d9de",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 3,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 3,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      mb: 1,
                    }}
                  >
                    Brokerage Connection
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: "#0d1b2a",
                      letterSpacing: -0.5,
                      lineHeight: 1.2,
                    }}
                  >
                    Connect Your Investment Accounts
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1.5,
                      fontSize: 14,
                      color: "#4b5563",
                      lineHeight: 1.75,
                      maxWidth: 580,
                    }}
                  >
                    Aggregate holdings across all brokerages. View proportional earnings, revenue,
                    and profit — analysed the way institutional investors approach portfolio
                    construction.
                  </Typography>
                </Box>

                {/* SnapTrade trust badge */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 0.75,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 3,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                    }}
                  >
                    Connectivity Powered By
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 2,
                      py: 1,
                      border: "1px solid #d6d9de",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <Box
                      component="img"
                      src="https://snaptrade.com/images/snaptrade-logo.svg"
                      alt="SnapTrade"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextSibling.style.display = "inline";
                      }}
                      sx={{ height: 22, width: "auto" }}
                    />
                    <Typography
                      sx={{
                        display: "none",
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: 1,
                        color: "#0d1b2a",
                      }}
                    >
                      SnapTrade
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 10, color: "#9ca3af" }}>
                    Bank-grade secure connection
                  </Typography>
                </Box>
              </Box>

              {/* ── Three pillars ── */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                  borderBottom: "1px solid #d6d9de",
                }}
              >
                {[
                  {
                    num: "01",
                    heading: "Unified Portfolio View",
                    body: "All accounts — RRSP, TFSA, margin, IRA, 401(k) — consolidated into a single analytical view.",
                  },
                  {
                    num: "02",
                    heading: "Read-Only Access",
                    body: "No trades or transfers can be initiated. Your credentials never leave SnapTrade's secure portal.",
                  },
                  {
                    num: "03",
                    heading: "Institution-Grade Security",
                    body: "Encrypted in transit. Revoke access and disconnect any brokerage at any time.",
                  },
                ].map(({ num, heading, body }, i) => (
                  <Box
                    key={num}
                    sx={{
                      px: { xs: 4, md: 6 },
                      py: 3.5,
                      borderRight: i < 2 ? "1px solid #d6d9de" : "none",
                      borderRightWidth: { xs: 0, sm: i < 2 ? 1 : 0 },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#9ca3af",
                        letterSpacing: 2,
                        mb: 1,
                      }}
                    >
                      {num}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0d1b2a",
                        mb: 0.75,
                        letterSpacing: 0.1,
                      }}
                    >
                      {heading}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.7 }}>
                      {body}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* ── CTA ── */}
              <Box
                sx={{
                  px: { xs: 4, md: 6 },
                  py: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  flexWrap: "wrap",
                  borderBottom: "1px solid #d6d9de",
                  backgroundColor: "#f9fafb",
                }}
              >
                <Button
                  variant="contained"
                  onClick={() => openForAction("brokerage")}
                  sx={{
                    backgroundColor: "#0d1b2a",
                    color: "#fff",
                    fontWeight: 600,
                    px: 4,
                    py: 1.3,
                    fontSize: 13,
                    borderRadius: 0,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    boxShadow: "none",
                    "&:hover": {
                      backgroundColor: "#1a3a5c",
                      boxShadow: "none",
                    },
                  }}
                >
                  Connect a Brokerage
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => openForAction("upload")}
                  sx={{
                    backgroundColor: "#fff",
                    color: "#0d1b2a",
                    borderColor: "#0d1b2a",
                    fontWeight: 600,
                    px: 4,
                    py: 1.3,
                    fontSize: 13,
                    borderRadius: 0,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    boxShadow: "none",
                    "&:hover": {
                      backgroundColor: "#f9fafb",
                      borderColor: "#0d1b2a",
                      boxShadow: "none",
                    },
                  }}
                >
                  Upload a Portfolio
                </Button>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: "1px", height: 22, backgroundColor: "#d6d9de" }} />
                  <Typography sx={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
                    Authorization terms will be presented before connecting.
                  </Typography>
                </Box>
              </Box>
              {workspaceMessage && (
                <Box sx={{ px: { xs: 4, md: 6 }, py: 1.5, backgroundColor: "#fef2f2" }}>
                  <Typography sx={{ fontSize: 12.5, color: "#b91c1c" }}>
                    {workspaceMessage}
                  </Typography>
                </Box>
              )}

              {/* ── Supported institutions ── */}
              <Box sx={{ px: { xs: 4, md: 6 }, py: 3 }}>
                <Typography
                  sx={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 3,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    mb: 2,
                  }}
                >
                  Supported Institutions
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, alignItems: "center" }}>
                  {Array.from(new Set(Object.values(bankLogoMap)))
                    .slice(0, 14)
                    .map((src) => (
                      <Box
                        key={src}
                        sx={{
                          height: 52,
                          width: 96,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid #e5e7eb",
                          backgroundColor: "#fff",
                          p: 1,
                        }}
                      >
                        <Box
                          component="img"
                          src={src}
                          alt="institution"
                          sx={{ height: 32, width: "auto", maxWidth: 82, objectFit: "contain" }}
                        />
                      </Box>
                    ))}
                </Box>
              </Box>
            </Paper>

            <SecurityDataPanel onDetails={() => setSecurityDetailsOpen(true)} />
          </Box>
        ) : (
          <>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: (theme) => `0 12px 28px ${theme.palette.grey[300]}40`,
                overflow: "hidden",
                backgroundColor: "background.paper",
              }}
            >
              {formattedConnectedAt && workspace?.workspace_type !== "upload_portfolio" && (
                <>
                  <Box
                    sx={{
                      px: { xs: 1.5, sm: 2.25 },
                      py: 0.35,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 0.6,
                      flexWrap: "nowrap",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          display: "grid",
                          placeItems: "center",
                          color: "#9CA3AF",
                        }}
                      >
                        <ScheduleRoundedIcon sx={{ fontSize: 12.5 }} />
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "#111827", fontWeight: 600, lineHeight: 1.2, fontSize: 12.5 }}
                      >
                        SnapTrade Sync • Last connected {relativeConnectedAt}
                      </Typography>
                    </Box>

                    <Typography
                      variant="caption"
                      sx={{
                        color: "#6B7280",
                        fontWeight: 600,
                        fontSize: 10.5,
                        letterSpacing: 0.06,
                      }}
                    >
                      {formattedConnectedAt}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 0 }} />
                </>
              )}

              {brokerages.map((brokerage, index) => {
                const { linkedCount, totalCount, linkedBalance, hasLinkedValue } = computeSummary(
                  brokerage.accounts
                );
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
                      "&.Mui-expanded": { margin: 0 },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        px: { xs: 1.5, sm: 2.25 },
                        py: 0,
                        minHeight: 34,
                        "&.Mui-expanded": { minHeight: 34 },
                        "& .MuiAccordionSummary-content": { my: 0 },
                        "& .MuiAccordionSummary-content.Mui-expanded": { my: 0 },
                      }}
                    >
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={0.7}
                        width="100%"
                        sx={{ minWidth: 0 }}
                      >
                        <img
                          src={brokerage.logo}
                          alt={`${brokerage.name} logo`}
                          style={{ height: 16 }}
                        />
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 700,
                            lineHeight: 1.2,
                            letterSpacing: 0.03,
                            fontSize: 16,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: { xs: 120, sm: "none" },
                          }}
                        >
                          {brokerage.name}
                        </Typography>
                        <Box display="flex" gap={0.75} flexWrap="wrap" sx={{ minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600, lineHeight: 1.1, fontSize: 12 }}
                          >
                            {linkedCount} of {totalCount} linked
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 700, lineHeight: 1.1, fontSize: 12 }}
                          >
                            Value:{" "}
                            {hasLinkedValue || linkedCount === 0
                              ? `$${Math.round(linkedBalance).toLocaleString()}`
                              : "N/A"}
                          </Typography>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 1.5, sm: 2.25 }, pb: 0.2, pt: 0 }}>
                      <List sx={{ py: 0 }}>
                        {brokerage.accounts.map((account) => {
                          const isAvailable = account.isAvailable !== false;
                          const marketMessage = isAvailable
                            ? `Supported by The Stock Owner Report (${SUPPORTED_MARKETS.join("/")})`
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
                                mb: 0.2,
                                px: 0.75,
                                py: 0.12,
                                minHeight: 0,
                              }}
                            >
                              <Checkbox
                                checked={account.included}
                                readOnly
                                disabled={!isAvailable}
                                size="small"
                                sx={{ mr: 0.35, p: 0.5 }}
                              />
                              <ListItemText
                                primary={`${account.accountType} | #${
                                  account.accountNumber || "N/A"
                                }`}
                                primaryTypographyProps={{
                                  variant: "body2",
                                  fontWeight: 700,
                                  fontSize: 14,
                                }}
                                secondaryTypographyProps={{ component: "div" }}
                                sx={{ my: 0 }}
                                secondary={
                                  <Box display="flex" flexDirection="column" gap={0}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontSize: 12, lineHeight: 1.25 }}
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
                                      sx={{ fontSize: 12, lineHeight: 1.25 }}
                                    >
                                      Holdings:{" "}
                                      {account.validHoldingsCount || account.holdings?.length || 0}{" "}
                                      ({account.holdings?.length || 0} total)
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      fontWeight={600}
                                      sx={{ fontSize: 12, lineHeight: 1.25 }}
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
                    </AccordionDetails>
                  </Accordion>
                );
              })}

              <Box
                mt={0.15}
                pt={0.2}
                pb={0.75}
                px={{ xs: 1.5, sm: 2.25 }}
                display="flex"
                justifyContent="flex-end"
              >
                <Button
                  variant="outlined"
                  onClick={() => handleUnlinkBrokerage(brokerages[0]?.name)}
                  disabled={!brokerages.length}
                  sx={{
                    textTransform: "none",
                    borderRadius: 1.5,
                    backgroundColor: "background.paper",
                    color: "text.primary",
                    borderColor: "divider",
                    fontWeight: 600,
                    fontSize: 11,
                    px: 1.2,
                    py: 0.1,
                    minWidth: 175,
                    "&:hover": {
                      backgroundColor: "grey.100",
                      borderColor: "text.secondary",
                      color: "text.primary",
                    },
                    "&.Mui-disabled": {
                      opacity: 0.6,
                    },
                  }}
                >
                  Unlink Brokerage
                </Button>
              </Box>
            </Paper>

            <SecurityDataPanel mt={2} onDetails={() => setSecurityDetailsOpen(true)} />
          </>
        )}
      </CustomBox>
      <ConsentModal
        open={consentOpen}
        onAccept={handleConsentAccept}
        onCancel={() => setConsentOpen(false)}
      />
      <SecurityDetailsModal
        open={securityDetailsOpen}
        onClose={() => setSecurityDetailsOpen(false)}
      />
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
      {signInAction && (
        <SignInModal
          open={Boolean(signInAction)}
          onClose={() => setSignInAction(null)}
          pendingAction={signInAction}
        />
      )}
      <UploadPortfolioDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        workspace={workspace}
        onImported={() => setUploadDialogOpen(false)}
      />
    </DashboardLayout>
  );
}
