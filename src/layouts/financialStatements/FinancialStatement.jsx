import { useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, Card, Menu, MenuItem } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CustomBox from "components/CustomBox";
import CustomTypography from "components/CustomTypography";
import DashboardLayout from "ui/LayoutContainers/DashboardLayout";
import DashboardNavbar from "ui/Navbars/DashboardNavbar";
import { useAuthStore } from "stores/useAuthStore";
import {
  exportFinancialReportToHtml,
  exportFinancialReportToPdf,
  exportFinancialReportToWord,
} from "services/pdfExportService";
import AccountSelector from "./AccountSelector";
import ProRataTable from "./ProRataTable";
import useFinancialStatement from "./useFinancialStatement";

const exporters = {
  Word: exportFinancialReportToWord,
  HTML: exportFinancialReportToHtml,
  PDF: exportFinancialReportToPdf,
};

export default function FinancialStatement({ report }) {
  const [exportAnchor, setExportAnchor] = useState(null);
  const { loading, aggregatedData, allAccountsWithLogos, selectedAccount, selectAccount } =
    useFinancialStatement(report);
  const user = useAuthStore((state) => state.user);
  const hasRows = aggregatedData.rows.length > 0;
  const closeExportMenu = () => setExportAnchor(null);
  const exportReport = (exporter) => {
    exporter({
      title: report.title,
      subtitle: report.subtitle,
      accountLabel: selectedAccount
        ? `${selectedAccount.brokerageName}${
            selectedAccount.accountNumber ? ` #${selectedAccount.accountNumber}` : ""
          }`
        : "All accounts",
      ...aggregatedData,
    });
    closeExportMenu();
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
          <Box
            sx={{
              pb: 1.5,
              mb: 1.5,
              borderBottom: "1px solid #d6d9de",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <CustomTypography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                color: "#9ca3af",
                textTransform: "uppercase",
              }}
            >
              {report.title}
            </CustomTypography>
            <Button
              variant="outlined"
              onClick={(event) => setExportAnchor(event.currentTarget)}
              disabled={loading || !hasRows}
              endIcon={<KeyboardArrowDownIcon />}
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
              Export
            </Button>
            <Menu
              anchorEl={exportAnchor}
              open={Boolean(exportAnchor)}
              onClose={closeExportMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              {Object.entries(exporters).map(([format, exporter]) => (
                <MenuItem key={format} onClick={() => exportReport(exporter)}>
                  Export to {format}
                </MenuItem>
              ))}
            </Menu>
          </Box>
          {allAccountsWithLogos.length > 0 && (
            <AccountSelector
              accounts={allAccountsWithLogos}
              selectedAccountId={selectedAccount?.id}
              onSelect={selectAccount}
            />
          )}
          <CustomTypography
            variant="body2"
            sx={{
              mb: 2,
              display: "block",
              fontSize: report.fontSize,
              fontWeight: 400,
              color: "#4B5563",
              lineHeight: 1.7,
            }}
          >
            {report.explanation}
          </CustomTypography>
          <Box
            sx={{
              flex: 1,
              height: 0,
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <ProRataTable
              loading={loading}
              data={aggregatedData}
              paywall={{ enabled: hasRows && !user?.email, registerPath: "/billing" }}
            />
          </Box>
        </Card>
      </CustomBox>
    </DashboardLayout>
  );
}

FinancialStatement.propTypes = { report: PropTypes.object.isRequired };
