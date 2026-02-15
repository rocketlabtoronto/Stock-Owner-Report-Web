import Card from "@mui/material/Card";
import DashboardLayout from "ui/LayoutContainers/DashboardLayout";
import DashboardNavbar from "ui/Navbars/DashboardNavbar";

// @mui material components
// import Button from '@mui/material/Button';

// Custom Dashboard 2 MUI components
import CustomBox from "components/CustomBox";

// Custom Dashboard 2 MUI components

// Billing page components
import BillingInformation from "layouts/billing/components/BillingInformation";
import { useAppStore } from "../../stores/store";

function Billing() {
  const userSession = useAppStore((state) => state.session);
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <CustomBox py={3}>
        <CustomBox display="flex" justifyContent="center">
          <Card
            sx={{
              p: 3,
              background: "#fff",
              overflow: "visible",
              borderRadius: 3,
              boxShadow: 3,
              maxWidth: 400,
              width: "100%",
            }}
          >
            <BillingInformation
              userSession={userSession}
            />
          </Card>
        </CustomBox>
      </CustomBox>
    </DashboardLayout>
  );
}

export default Billing;
