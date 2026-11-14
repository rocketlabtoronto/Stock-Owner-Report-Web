import Card from "@mui/material/Card";
import DashboardLayout from "ui/LayoutContainers/DashboardLayout";
import DashboardNavbar from "ui/Navbars/DashboardNavbar";

// @mui material components
// import Button from '@mui/material/Button';

// Custom Dashboard 2 MUI components
import CustomBox from "components/CustomBox";
import CustomTypography from "components/CustomTypography";

// Custom Dashboard 2 MUI components

// Billing page components
import BillingInformation from "layouts/billing/components/BillingInformation";

function Billing() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <CustomBox py={1}>
        <CustomBox display="flex" justifyContent="center">
          <Card
            sx={{
              p: 3,
              backgroundColor: "#ffffff",
              overflow: "visible",
              borderRadius: 0,
              boxShadow: "none",
              border: "1px solid #d6d9de",
              borderTop: "2px solid #0d1b2a",
              maxWidth: 480,
              width: "100%",
              position: "relative",
            }}
          >
            <CustomTypography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                color: "#6b7280",
                textTransform: "uppercase",
                mb: 2,
                fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
              }}
            >
              Billing
            </CustomTypography>
            <BillingInformation />
          </Card>
        </CustomBox>
      </CustomBox>
    </DashboardLayout>
  );
}

export default Billing;
