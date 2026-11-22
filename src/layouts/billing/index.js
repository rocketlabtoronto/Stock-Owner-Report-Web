import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import DashboardLayout from "ui/LayoutContainers/DashboardLayout";
import DashboardNavbar from "ui/Navbars/DashboardNavbar";

import CustomBox from "components/CustomBox";
import CustomTypography from "components/CustomTypography";
import PaymentSuccessModal from "./PaymentSuccessModal";

function Billing() {
  const pricingTableId = process.env.REACT_APP_STRIPE_PRICING_TABLE_ID;
  const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
  const location = useLocation();
  const navigate = useNavigate();

  // Stripe's Pricing Table redirects back here with ?session_id={CHECKOUT_SESSION_ID}
  // once "Confirmation page" is set to redirect to this page (see README). Gate the
  // user behind a confirmation modal before sending them on to log in.
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(
    () => new URLSearchParams(location.search).get("session_id") !== null
  );

  const handlePaymentSuccessOk = () => {
    setShowPaymentSuccess(false);
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    document.body.appendChild(script);

    const style = document.createElement("style");
    style.innerHTML = `
      stripe-pricing-table .PricingTableSelector__Select,
      stripe-pricing-table .PricingTableSelector__Button {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.body.removeChild(script);
      document.head.removeChild(style);
    };
  }, []);

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
            <div
              dangerouslySetInnerHTML={{
                __html: `<stripe-pricing-table pricing-table-id="${pricingTableId}" publishable-key="${publishableKey}"></stripe-pricing-table>`,
              }}
            />
          </Card>
        </CustomBox>
      </CustomBox>
      <PaymentSuccessModal open={showPaymentSuccess} onOk={handlePaymentSuccessOk} />
    </DashboardLayout>
  );
}

export default Billing;
