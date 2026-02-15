import React from "react";
import LegalDocumentLayout from "components/LegalDocumentLayout";
import CustomTypography from "components/CustomTypography";
import Link from "@mui/material/Link";

export default function Privacy() {
  const effectiveDate = "August 18, 2025";
  return (
    <LegalDocumentLayout title="Privacy Policy" effectiveDate={effectiveDate}>
      {/* 1. Introduction */}
      <CustomTypography
        id="introduction"
        variant="h6"
        fontWeight={700}
        color="text"
        gutterBottom
      >
        1. Introduction
      </CustomTypography>
      <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
        LookThroughProfits, Inc. (&quot;LookThroughProfits,&quot; &quot;we,&quot;
        &quot;our,&quot; or &quot;us&quot;) respects your privacy and is committed to
        protecting your personal information. This Privacy Policy explains what information we
        collect, how we use it, and the rights you have with respect to that information.
      </CustomTypography>
      <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
        By using LookThroughProfits.com or any of our services (the &quot;Service&quot;), you
        consent to this Privacy Policy.
      </CustomTypography>

            {/* 2. Information We Collect */}
            <CustomTypography
              id="information-we-collect"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              2. Information We Collect
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              We collect the following categories of information:
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              <i>Account Information:</i> Name, email address, login credentials, and subscription
              details.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              <i>Payment Information:</i> Processed securely by our third-party payment provider
              (Stripe). We do not store credit card numbers.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              <i>Usage Data:</i> Pages visited, features used, browser type, device type, IP
              address, and similar analytics data.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              <i>Communications:</i> Messages you send us through email or support.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              <i>Business Customer Data:</i> If you are an organization, we may process limited
              personal data on your behalf (e.g., user login details).
            </CustomTypography>

            {/* 3. How We Use Information */}
            <CustomTypography
              id="how-we-use"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              3. How We Use Information
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              We use collected information to:
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Provide, operate, and improve the Service.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Process payments and manage subscriptions.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Communicate with you about updates, features, and support.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Monitor system performance and prevent misuse or fraud.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Comply with legal and regulatory obligations.
            </CustomTypography>

            {/* 4. Sharing of Information */}
            <CustomTypography
              id="sharing"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              4. Sharing of Information
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              We do not sell or rent personal data. We may share information with:
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              <i>Service Providers:</i> Such as Stripe (payments), Supabase (database/hosting),
              cloud providers, analytics tools, and email delivery services.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              <i>Legal Authorities:</i> When required to comply with applicable law, regulation, or
              legal process.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              <i>Corporate Transactions:</i> If LookThroughProfits is involved in a merger,
              acquisition, or sale of assets, information may be transferred as part of that
              transaction.
            </CustomTypography>

            {/* 5. Data Retention */}
            <CustomTypography
              id="retention"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              5. Data Retention
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              We retain personal information only for as long as necessary to provide the Service,
              comply with legal obligations, and resolve disputes.
            </CustomTypography>

            {/* 6. Security */}
            <CustomTypography
              id="security"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              6. Security
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              We implement technical and organizational measures (encryption in transit/at rest,
              access controls, monitoring) to protect your data. However, no method of transmission
              or storage is 100% secure, and we cannot guarantee absolute security.
            </CustomTypography>

            {/* 7. International Transfers */}
            <CustomTypography
              id="international"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              7. International Transfers
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              Your information may be stored and processed in the United States and accessed from
              other jurisdictions. By using the Service, you consent to such transfers.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              For Canadian users, we comply with PIPEDA. For European users, we apply safeguards
              consistent with the GDPR.
            </CustomTypography>

            {/* 8. Your Rights */}
            <CustomTypography
              id="rights"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              8. Your Rights
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              Depending on your jurisdiction, you may have the right to:
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Access, correct, or delete your personal data.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Withdraw consent to processing.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7 }}>
              Request data portability.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" sx={{ lineHeight: 1.7, mb: 1 }}>
              File a complaint with a supervisory authority.
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              Requests can be made to{" "}
              <Link href="mailto:support@stockownerreport.com">
                support@stockownerreport.com
              </Link>
              .
            </CustomTypography>

            {/* 9. Children's Privacy */}
            <CustomTypography
              id="children"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              9. Children&rsquo;s Privacy
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              The Service is not directed at children under 18, and we do not knowingly collect
              personal information from children.
            </CustomTypography>

            {/* 10. Changes */}
            <CustomTypography
              id="changes"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              10. Changes
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              We may update this Privacy Policy from time to time. Material changes will be
              communicated by email or a notice on our website.
            </CustomTypography>

            {/* 11. Contact Us */}
            <CustomTypography
              id="contact"
              variant="h6"
              fontWeight={700}
              color="text"
              gutterBottom
              sx={{ mt: 2 }}
            >
              11. Contact Us
            </CustomTypography>
            <CustomTypography variant="caption" color="text" paragraph sx={{ lineHeight: 1.7 }}>
              If you have any questions or concerns about this Privacy Policy, contact us at:{" "}
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
