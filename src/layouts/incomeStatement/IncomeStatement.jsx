import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
} from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import CustomTypography from "components/CustomTypography";
import CustomBox from "components/CustomBox";
import ProRataTable from "../balanceSheet/ProRataTable";
import useAggregatedIncomeStatement from "../incomeStatement/useAggregatedIncomeStatement";
import DashboardLayout from "ui/LayoutContainers/DashboardLayout";
import DashboardNavbar from "ui/Navbars/DashboardNavbar";

function IncomeStatement() {
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const { loading, aggregatedData, allAccountsWithLogos } =
    useAggregatedIncomeStatement(selectedAccountId);
  const navigate = useNavigate();

  // Auto-select first account when available
  useEffect(() => {
    if (!selectedAccountId && Array.isArray(allAccountsWithLogos) && allAccountsWithLogos.length) {
      const firstAvailable = allAccountsWithLogos.find((acc) => acc.isAvailable !== false);
      setSelectedAccountId(firstAvailable ? firstAvailable.id : allAccountsWithLogos[0].id);
    }
  }, [allAccountsWithLogos, selectedAccountId]);

  const selectedAcc = (allAccountsWithLogos || []).find((a) => a.id === selectedAccountId);
  const handleSelect = (id) => setSelectedAccountId((prev) => (prev === id ? null : id));
  const hasAccounts = Array.isArray(allAccountsWithLogos) && allAccountsWithLogos.length > 0;
  const hasRows = Array.isArray(aggregatedData?.rows) && aggregatedData.rows.length > 0;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <CustomBox py={1}>
        <Card
          sx={{
            p: 3,
            background: "#fff",
            overflow: "hidden",
            borderRadius: 3,
            boxShadow: 3,
            width: "100%",
            maxWidth: "100%",
            height: "calc(100vh - 180px)",
            maxHeight: "calc(100vh - 180px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CustomTypography variant="h4" fontWeight="bold" gutterBottom>
            Income Statement
          </CustomTypography>

          {hasAccounts && (
            <CustomBox mb={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <CustomTypography variant="h6" fontWeight="medium">
                  Accounts
                </CustomTypography>
                {selectedAcc && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <img src={selectedAcc.logo} alt="selected account" style={{ height: 18 }} />
                    <CustomTypography variant="caption" color="text">
                      Viewing: {selectedAcc.brokerageName}
                    </CustomTypography>
                    {selectedAcc.accountNumber && (
                      <CustomTypography variant="caption" color="text">
                        #{selectedAcc.accountNumber}
                      </CustomTypography>
                    )}
                  </Box>
                )}
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1.5}>
                {allAccountsWithLogos.map((acc) => {
                  const isAvailable = acc.isAvailable !== false;
                  const marketMessage = isAvailable
                    ? "Supported by The Stock Owner Report (NYSE/NASDAQ)"
                    : `Unsupported market: ${
                        acc.disallowedMarkets?.length
                          ? acc.disallowedMarkets.join(", ")
                          : "Unsupported market"
                      }`;
                  return (
                    <Box
                      key={acc.id}
                      onClick={() => (isAvailable ? handleSelect(acc.id) : null)}
                      display="flex"
                      alignItems="center"
                      gap={1}
                      sx={{
                        border:
                          selectedAccountId === acc.id ? "2px solid #344767" : "1px solid #eee",
                        borderRadius: 2,
                        px: 1.5,
                        py: 1,
                        backgroundColor: selectedAccountId === acc.id ? "#eef2ff" : "#fafbfc",
                        cursor: isAvailable ? "pointer" : "not-allowed",
                        opacity: isAvailable ? 1 : 0.6,
                      }}
                      title={`${acc.brokerageName} #${acc.accountNumber}`}
                    >
                      <img src={acc.logo} alt={`${acc.brokerageName} logo`} style={{ height: 22 }} />
                      <Box display="flex" flexDirection="column">
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <CustomTypography variant="button" color="text" sx={{ fontWeight: 600 }}>
                            {acc.brokerageName}
                          </CustomTypography>
                          {acc.accountNumber && (
                            <CustomTypography variant="caption" color="text">
                              #{acc.accountNumber}
                            </CustomTypography>
                          )}
                        </Box>
                        <CustomTypography variant="caption" color="text.secondary">
                          {marketMessage}
                        </CustomTypography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </CustomBox>
          )}

          <CustomTypography
            variant="caption"
            color="text"
            sx={{ mb: 1.5, display: "block", lineHeight: 1.35 }}
          >
            This table shows your proportionate share of each company’s income statement.
            Proportionate Share of the Income Statement shows the portion of a company’s revenue,
            expenses, and profits you effectively own based on your shareholding. For example, if
            you own 1% of a company, we calculate 1% of its revenue, gross profit, operating
            profit, and net income—so you can see exactly what earnings and costs your investment
            represents, just as if you personally owned that fraction of the entire business.
          </CustomTypography>

          {!loading && (!hasAccounts || !hasRows) && (
            <CustomBox mb={2}>
              <CustomTypography variant="body2" color="text" sx={{ mb: 2 }}>
                There isn&apos;t enough data to build your income statement yet. Connect a brokerage
                or upload holdings to get started.
              </CustomTypography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate("/brokeragesAndAccounts")}
                sx={{ textTransform: "none" }}
              >
                Go to Brokerages & Accounts
              </Button>
            </CustomBox>
          )}

          {hasRows ? (
            <ProRataTable
              loading={loading}
              data={aggregatedData}
              height="calc(100vh - 420px)"
            />
          ) : (
            !loading && (
              <CustomTypography variant="body2" color="text" sx={{ mt: 2 }}>
                No income statement rows to display yet.
              </CustomTypography>
            )
          )}
        </Card>
      </CustomBox>
    </DashboardLayout>
  );
}

export default IncomeStatement;
