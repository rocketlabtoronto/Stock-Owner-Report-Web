import React, { useState, useEffect } from "react";
import { Card } from "@mui/material";
import Box from "@mui/material/Box";
import CustomBox from "components/CustomBox";
import CustomTypography from "components/CustomTypography";
import DashboardLayout from "ui/LayoutContainers/DashboardLayout";
import DashboardNavbar from "ui/Navbars/DashboardNavbar";
import { useAuthStore } from "stores/useAuthStore";
import { supabase } from "../../supabaseClient";

import FinancialExplanation from "./FinancialExplanation";
import ProRataTable from "./ProRataTable";
import useAggregatedFinancials from "./useAggregatedFinancials";

function BalanceSheet() {
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const { loading, aggregatedData, allAccountsWithLogos } =
    useAggregatedFinancials(selectedAccountId);
  const user = useAuthStore((state) => state.user);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const hasRows = Array.isArray(aggregatedData?.rows) && aggregatedData.rows.length > 0;

  useEffect(() => {
    let active = true;

    const loadSubscriptionStatus = async () => {
      const email = user?.email;
      if (!email) {
        if (active) setIsSubscribed(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("is_subscribed")
        .eq("email", email)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setIsSubscribed(false);
        return;
      }

      setIsSubscribed(Boolean(data?.is_subscribed));
    };

    loadSubscriptionStatus();

    return () => {
      active = false;
    };
  }, [user?.email]);

  // Auto-select first account when available
  useEffect(() => {
    if (!selectedAccountId && Array.isArray(allAccountsWithLogos) && allAccountsWithLogos.length) {
      const firstAvailable = allAccountsWithLogos.find((acc) => acc.isAvailable !== false);
      setSelectedAccountId(firstAvailable ? firstAvailable.id : allAccountsWithLogos[0].id);
    }
  }, [allAccountsWithLogos, selectedAccountId]);

  const selectedAcc = (allAccountsWithLogos || []).find((a) => a.id === selectedAccountId);
  const handleSelect = (id) => setSelectedAccountId(id);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <CustomBox py={1}>
        <Card
          sx={{
            p: 3,
            background: "#fff",
            overflowX: "hidden",
            overflowY: "auto",
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
              Balance Sheet
            </CustomTypography>

            {/* Account selector */}
            {allAccountsWithLogos.length > 0 && (
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
                        <img
                          src={acc.logo}
                          alt={`${acc.brokerageName} logo`}
                          style={{ height: 22 }}
                        />
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
                          <CustomTypography variant="caption" color="text" sx={{ color: "text.secondary" }}>
                            {marketMessage}
                          </CustomTypography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </CustomBox>
            )}

            <FinancialExplanation />
            <ProRataTable
              loading={loading}
              data={aggregatedData}
              height="calc(100vh - 420px)"
              paywall={{ enabled: hasRows, isSubscribed, registerPath: "/billing" }}
            />
        </Card>
      </CustomBox>
    </DashboardLayout>
  );
}

export default BalanceSheet;
