import React from "react";
import LegalDocumentLayout from "components/LegalDocumentLayout";
import CustomTypography from "components/CustomTypography";
import Link from "@mui/material/Link";

export default function Terms() {
  const effectiveDate = "August 18, 2025";
  return (
    <LegalDocumentLayout title="Terms of Use" effectiveDate={effectiveDate}>
      {/* 1. Acceptance of Terms */}
      <CustomTypography
        id="acceptance"
        variant="h6"
        fontWeight={700}
        color="text"
        gutterBottom
      >
        1. Acceptance of Terms
      </CustomTypography>
      <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
        By accessing or using LookThroughProfits.com or any related services (the
        &quot;Service&quot;), you agree to be bound by these Terms of Use (&quot;Terms&quot;).
        If you do not agree, do not use the Service.
      </CustomTypography>

            {/* 2. Service Provided */}
            <CustomTypography
              id="service"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              2. Service Provided
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              LookThroughProfits, Inc. provides subscription software that analyzes and presents
              data from public company filings and other financial information. The Service is
              intended for informational and educational purposes only.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              We are not a registered investment adviser, broker-dealer, financial institution, or
              fiduciary.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Nothing in the Service constitutes investment, financial, tax, or legal advice.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Users are solely responsible for their own investment and financial decisions.
            </CustomTypography>

            {/* 3. Accounts */}
            <CustomTypography
              id="accounts"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              3. Accounts
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              To access certain features, you must create an account. You agree to:
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Provide accurate and complete information.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Maintain the confidentiality of your login credentials.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Be responsible for all activity under your account.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              We may suspend or terminate your account if you violate these Terms.
            </CustomTypography>

            {/* 4. Payments & Subscriptions */}
            <CustomTypography
              id="payments"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              4. Payments &amp; Subscriptions
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Fees are charged via Stripe.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              All payments are due in advance and are non-refundable unless required by law.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              We may change pricing with prior notice; continued use constitutes acceptance of new
              fees.
            </CustomTypography>

            {/* 5. Acceptable Use */}
            <CustomTypography
              id="acceptable-use"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              5. Acceptable Use
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              You agree not to:
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Reverse engineer, copy, resell, or misuse the Service.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Use the Service for unlawful, fraudulent, or harmful purposes.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              Interfere with the operation or security of the Service.
            </CustomTypography>

            {/* 6. Intellectual Property */}
            <CustomTypography
              id="ip"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              6. Intellectual Property
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              All content, software, and branding provided through the Service are owned by
              LookThroughProfits, Inc. You are granted a limited, non-exclusive, non-transferable
              license to use the Service for personal or internal business purposes only.
            </CustomTypography>

            {/* 7. Disclaimers */}
            <CustomTypography
              id="disclaimers"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              7. Disclaimers
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              The Service is provided on an &quot;as-is&quot; and &quot;as-available&quot; basis. We
              make no warranties, express or implied, regarding:
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Accuracy, completeness, or reliability of the information.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Availability or uninterrupted access.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              Suitability of the Service for any investment decision.
            </CustomTypography>

            {/* 8. Limitation of Liability */}
            <CustomTypography
              id="liability"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              8. Limitation of Liability
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              To the maximum extent permitted by law, LookThroughProfits, Inc. and its officers,
              directors, employees, and affiliates are not liable for any indirect, incidental, or
              consequential damages, including but not limited to loss of profits, arising out of or
              related to the use of the Service.
            </CustomTypography>

            {/* 9. Indemnification */}
            <CustomTypography
              id="indemnification"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              9. Indemnification
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              You agree to indemnify and hold harmless LookThroughProfits, Inc. from any claims,
              liabilities, damages, or expenses resulting from your use of the Service or violation
              of these Terms.
            </CustomTypography>

            {/* 10. Governing Law & Disputes */}
            <CustomTypography
              id="law"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              10. Governing Law &amp; Disputes
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              These Terms are governed by the laws of the State of Delaware, United States, without
              regard to conflict-of-law principles. Any disputes shall be resolved in the courts
              located in Delaware.
            </CustomTypography>

            {/* 11. Changes */}
            <CustomTypography
              id="changes"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              11. Changes
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              We may update these Terms from time to time. Material changes will be communicated via
              email or a notice on the website. Continued use of the Service after changes take
              effect constitutes acceptance.
            </CustomTypography>

            {/* 12. Contact Us */}
            <CustomTypography
              id="contact"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              12. Contact Us
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              Questions about these Terms may be directed to:{" "}
              <Link href="mailto:support@stockownerreport.com">
                support@stockownerreport.com
              </Link>
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              LookThroughProfits, Inc.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              169 Madison Ave STE 38180
            </CustomTypography>
      <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
        New York, NY 10016, USA
      </CustomTypography>
    </LegalDocumentLayout>
  );
}
