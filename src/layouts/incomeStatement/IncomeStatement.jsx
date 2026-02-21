import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
} from "@mui/material";
import Box from "@mui/material/Box";

import CustomTypography from "components/CustomTypography";
import CustomBox from "components/CustomBox";
import ProRataTable from "../balanceSheet/ProRataTable";
import useAggregatedIncomeStatement from "../incomeStatement/useAggregatedIncomeStatement";
import DashboardLayout from "ui/LayoutContainers/DashboardLayout";
import DashboardNavbar from "ui/Navbars/DashboardNavbar";
import { useAuthStore } from "stores/useAuthStore";
import { exportFinancialReportToPdf } from "services/pdfExportService";

function IncomeStatement() {
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const { loading, aggregatedData, allAccountsWithLogos } =
    useAggregatedIncomeStatement(selectedAccountId);
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = Boolean(user?.email);

  // Auto-select first account when available
  useEffect(() => {
    if (!selectedAccountId && Array.isArray(allAccountsWithLogos) && allAccountsWithLogos.length) {
      const firstAvailable = allAccountsWithLogos.find((acc) => acc.isAvailable !== false);
      setSelectedAccountId(firstAvailable ? firstAvailable.id : allAccountsWithLogos[0].id);
    }
  }, [allAccountsWithLogos, selectedAccountId]);

  const handleSelect = (id) => setSelectedAccountId(id);
  const hasAccounts = Array.isArray(allAccountsWithLogos) && allAccountsWithLogos.length > 0;
  const hasRows = Array.isArray(aggregatedData?.rows) && aggregatedData.rows.length > 0;
  const selectedAccount = allAccountsWithLogos.find((account) => account.id === selectedAccountId);
  const selectedAccountLabel = selectedAccount
    ? `${selectedAccount.brokerageName}${selectedAccount.accountNumber ? ` #${selectedAccount.accountNumber}` : ""}`
    : "All accounts";

  const handleExportPdf = () => {
    exportFinancialReportToPdf({
      title: "Income Statement",
      subtitle: "Proportionate share of each company’s income statement from your holdings.",
      accountLabel: selectedAccountLabel,
      columns: aggregatedData?.columns || [],
      rows: aggregatedData?.rows || [],
    });
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <CustomBox py={1}>
        <Card
          sx={{
            p: 3,
            background: "#ffffff",
            overflow: "hidden",
            borderRadius: 0,
            boxShadow: "none",
            border: "none",
            borderTop: "3px solid #0d1b2a",
            borderBottom: "1px solid #d6d9de",
            width: "100%",
            maxWidth: "100%",
            height: "calc(100vh - 120px)",
            maxHeight: "calc(100vh - 120px)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <Box sx={{ pb: 1.5, mb: 1.5, borderBottom: "1px solid #d6d9de", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <CustomTypography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#9ca3af", textTransform: "uppercase" }}>
              Income Statement
            </CustomTypography>
            <Button
              variant="outlined"
              onClick={handleExportPdf}
              disabled={loading || !hasRows}
              sx={{
                borderRadius: 0,
                borderColor: "#d6d9de",
                color: "#0d1b2a",
                textTransform: "none",
                fontSize: 12,
                fontWeight: 600,
                px: 1.5,
                py: 0.35,
                minWidth: 108,
                "&:hover": { borderColor: "#9ca3af", backgroundColor: "#f9fafb" },
              }}
            >
              Export to PDF
            </Button>
          </Box>

          {hasAccounts && (
            <CustomBox mb={1}>
              <Box display="flex" flexWrap="wrap" gap={0.75}>
                {allAccountsWithLogos.map((acc) => {
                  const isAvailable = acc.isAvailable !== false;
                  const unsupportedMessage = !isAvailable
                    ? `Unsupported market: ${
                        acc.disallowedMarkets?.length
                          ? acc.disallowedMarkets.join(", ")
                          : "Unsupported market"
                      }`
                    : null;
                  return (
                    <Box
                      key={acc.id}
                      onClick={() => (isAvailable ? handleSelect(acc.id) : null)}
                      display="flex"
                      alignItems="center"
                      gap={0.75}
                      sx={{
                        border: "none",
                        borderRadius: 0,
                        px: 1,
                        py: 0.45,
                        minHeight: 34,
                        minWidth: { xs: "100%", md: 220 },
                        maxWidth: { xs: "100%", md: 420 },
                        backgroundColor: selectedAccountId === acc.id ? "#f0f2f5" : "#ffffff",
                        boxShadow: selectedAccountId === acc.id ? "inset 0 -2px 0 #0d1b2a" : "none",
                        cursor: isAvailable ? "pointer" : "not-allowed",
                        opacity: isAvailable ? 1 : 0.6,
                      }}
                      title={`${acc.brokerageName} #${acc.accountNumber}`}
                    >
                      <img src={acc.logo} alt={`${acc.brokerageName} logo`} style={{ height: 14 }} />
                      <Box display="flex" alignItems="center" gap={0.45} sx={{ minWidth: 0 }}>
                        <CustomTypography
                          variant="button"
                          color="text"
                          sx={{
                            fontWeight: 600,
                            fontSize: 13,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: { xs: "100%", md: 180 },
                          }}
                        >
                          {acc.brokerageName}
                        </CustomTypography>
                        {acc.accountNumber && (
                          <CustomTypography
                            variant="caption"
                            color="text"
                            sx={{ fontSize: 11.5, whiteSpace: "nowrap" }}
                          >
                            #{acc.accountNumber}
                          </CustomTypography>
                        )}
                        {unsupportedMessage && (
                          <CustomTypography
                            variant="caption"
                            color="text"
                            sx={{
                              color: "text.secondary",
                              fontSize: 11,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: { xs: "100%", md: 165 },
                            }}
                          >
                            {unsupportedMessage}
                          </CustomTypography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </CustomBox>
          )}

          <CustomTypography
            variant="body2"
            sx={{ mb: 2, display: "block", fontSize: 13, fontWeight: 400, color: "#4B5563", lineHeight: 1.7 }}
          >
            This table shows your proportionate share of each company’s income statement.
            Proportionate Share of the Income Statement shows the portion of a company’s revenue,
            expenses, and profits you effectively own based on your shareholding. For example, if
            you own 1% of a company, we calculate 1% of its revenue, gross profit, operating
            profit, and net income—so you can see exactly what earnings and costs your investment
            represents, just as if you personally owned that fraction of the entire business.
          </CustomTypography>

          <Box sx={{ flex: 1, height: 0, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <ProRataTable
              loading={loading}
              data={aggregatedData}
              paywall={{ enabled: hasRows && !isLoggedIn, registerPath: "/billing" }}
            />
          </Box>
        </Card>
      </CustomBox>
    </DashboardLayout>
  );
}

export default IncomeStatement;
