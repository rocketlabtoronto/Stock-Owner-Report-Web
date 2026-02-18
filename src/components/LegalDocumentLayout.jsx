import React from "react";
import PropTypes from "prop-types";
import DashboardLayout from "ui/LayoutContainers/DashboardLayout";
import DashboardNavbar from "ui/Navbars/DashboardNavbar";
import CustomBox from "components/CustomBox";
import CustomTypography from "components/CustomTypography";
import Divider from "@mui/material/Divider";
import Card from "@mui/material/Card";
import Link from "@mui/material/Link";

const COMPANY_NAME = "LookThroughProfits, Inc.";
const COMPANY_ADDRESS = "169 Madison Ave STE 38180, New York, NY 10016, USA";
const SUPPORT_EMAIL = "howard@stockownerreport.com";

export default function LegalDocumentLayout({ title, effectiveDate, children }) {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <CustomBox py={4} px={{ xs: 2, md: 4 }}>
        <CustomBox display="flex" justifyContent="center">
          <Card
            sx={{
              p: { xs: 3, md: 4 },
              background: "#fff",
              borderRadius: 0,
              boxShadow: "0 2px 12px rgba(13,27,42,0.08)",
              border: "1px solid #d6d9de",
              borderTop: "3px solid #0d1b2a",
              maxWidth: 960,
              width: "100%",
              "& .MuiTypography-caption": {
                fontSize: "0.9375rem",
                lineHeight: 1.55,
                color: "#4B5563",
              },
              "& .MuiTypography-h6": {
                fontSize: "1.1rem",
                lineHeight: 1.3,
                color: "#0d1b2a",
              },
            }}
          >
            <CustomTypography variant="h4" fontWeight="bold" color="text" gutterBottom
              sx={{ color: "#0d1b2a", fontSize: "1.6rem", letterSpacing: "-0.5px" }}
            >
              {title}
            </CustomTypography>

            <CustomTypography variant="caption" color="text" display="block" sx={{ lineHeight: 1.7, color: "#4B5563", fontSize: 13.5 }}>
              Effective Date: {effectiveDate}
            </CustomTypography>
            <CustomTypography variant="caption" color="text" display="block" sx={{ lineHeight: 1.7, color: "#4B5563", fontSize: 13.5 }}>
              Company: {COMPANY_NAME}
            </CustomTypography>
            <CustomTypography variant="caption" color="text" display="block" sx={{ lineHeight: 1.7, color: "#4B5563", fontSize: 13.5 }}>
              Address: {COMPANY_ADDRESS}
            </CustomTypography>
            <CustomTypography variant="caption" color="text" display="block" sx={{ lineHeight: 1.7, color: "#4B5563", fontSize: 13.5, mb: 1 }}>
              Contact: <Link href={`mailto:${SUPPORT_EMAIL}`} sx={{ color: "#0d1b2a", fontWeight: 600 }}>{SUPPORT_EMAIL}</Link>
            </CustomTypography>

            <Divider sx={{ my: 2, borderColor: "#d6d9de" }} />

            {children}
          </Card>
        </CustomBox>
      </CustomBox>
    </DashboardLayout>
  );
}

LegalDocumentLayout.propTypes = {
  title: PropTypes.string.isRequired,
  effectiveDate: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
