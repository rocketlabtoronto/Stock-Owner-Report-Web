import LegalDocumentLayout from "components/LegalDocumentLayout";
import Box from "@mui/material/Box";
import { P, Bullets, SectionHeading, D, A, NAVY, FS, SUBTLE } from "components/LegalDocumentContent";

export default function Privacy() {
  return (
    <LegalDocumentLayout title="Privacy Policy" effectiveDate="February 18, 2026" hideMetadata>

      <SectionHeading>Overview</SectionHeading>
      <P>This Privacy Policy explains how LookThroughProfits, Inc. collects, uses, discloses, and protects personal information when you visit our website or use The Stock Owner&rsquo;s Report (the &ldquo;Service&rdquo;). The Service provides portfolio analytics that translate your brokerage holdings into an owner&rsquo;s view of underlying business fundamentals, including look-through, pro-rata estimates derived from your holdings and public or licensed financial data sources. By accessing or using the Service, you acknowledge that you have read and understood this Privacy Policy.</P>

      <D />
      <SectionHeading>Definitions</SectionHeading>
      <Bullets items={[
        <><strong>&ldquo;Personal Information&rdquo;</strong> &mdash; information that identifies, relates to, or could reasonably be linked (directly or indirectly) with you, your household, or your device.</>,
        <><strong>&ldquo;Brokerage Data&rdquo;</strong> &mdash; account and portfolio data made available through your authorized brokerage connection (including holdings/positions and related account details).</>,
        <><strong>&ldquo;Sensitive Personal Information&rdquo;</strong> &mdash; categories of personal information treated as sensitive under applicable laws. We treat Brokerage Data as sensitive as a matter of best practice regardless of jurisdiction.</>,
      ]} />

      <D />
      <SectionHeading>Scope</SectionHeading>
      <P>This Privacy Policy applies to our website and associated pages and forms (the &ldquo;Website&rdquo;), and the Service, including any web app, authenticated product experience, and customer support interactions. It does not apply to third-party websites, brokerages, or integrations you access through the Service — those are governed by their own policies.</P>

      <D />
      <SectionHeading>Information We Collect</SectionHeading>
      <P><strong>Information you provide:</strong></P>
      <Bullets items={[
        "Account and profile information — name, email address, password, and basic account preferences.",
        "Subscription and billing information — plan selection, billing contact, and billing status. Payments processed by Stripe; we do not store full card numbers.",
        "Communications — support requests, email content, and feedback.",
      ]} />
      <P><strong>Information collected automatically:</strong></P>
      <Bullets items={[
        "Device and usage data — IP address, device identifiers, browser type, operating system, pages viewed, time spent, referring URLs, and feature interactions.",
        "Cookies and similar technologies — cookies, SDKs, pixels, local storage, and similar technologies to operate the Website and improve the Service.",
      ]} />
      <P><strong>Brokerage Data you authorize:</strong> The brokerage connection flow is handled by SnapTrade. We do not request or store your brokerage username or password. Once authorized, we may receive:</P>
      <Bullets items={[
        "Account identifiers and metadata (e.g., institution name, account type, masked account number, and account-level status);",
        "Holdings and positions (e.g., tickers/symbols, quantities, and descriptions);",
        "Balance and valuation data (e.g., cash balance, total account value, currency);",
        "Limited activity data if needed for Service functionality and if available.",
      ]} />
      <P><strong>Information from third parties:</strong></P>
      <Bullets items={[
        "Service providers (hosting, email delivery, analytics, customer support, payment processors);",
        "Public sources and licensed data providers used to compute business-level fundamentals or generate analytics — these generally provide company-level information, not personal data.",
      ]} />

      <D />
      <SectionHeading>How We Use Information</SectionHeading>
      <Bullets items={[
        <><strong>Provide and operate the Service</strong> — account creation, brokerage connections, report generation, and product features.</>,
        <><strong>Secure the Service</strong> — authentication, access control, monitoring, fraud detection, and abuse prevention.</>,
        <><strong>Improve and develop the Service</strong> — analytics, performance measurement, and feature development.</>,
        <><strong>Customer support and communications</strong> — inquiries, service notices, receipts, security alerts, and administrative messages.</>,
        <><strong>Billing and accounting</strong> — subscriptions, invoices, confirmations, and dispute handling.</>,
        <><strong>Legal and compliance</strong> — complying with applicable law, responding to lawful requests, and enforcing our terms.</>,
      ]} />

      <D />
      <SectionHeading>Legal Bases for Processing</SectionHeading>
      <P>Where required by law, we process personal information on one or more of the following bases:</P>
      <Bullets items={[
        "Contract performance — to provide the Service you requested;",
        "Legitimate interests — securing and improving the Service, preventing fraud;",
        "Consent — where required for certain cookies or marketing communications;",
        "Legal obligation — to comply with laws, regulations, or lawful requests.",
      ]} />

      <D />
      <SectionHeading>How We Disclose Information</SectionHeading>
      <P>We do not sell or rent personal information.</P>
      <P><strong>Service providers</strong> — vendors performing services on our behalf (payment processing, cloud hosting, security monitoring, customer support, email delivery, analytics), permitted to process personal information only for those services under applicable contracts.</P>
      <P><strong>Brokerage connection provider</strong> — SnapTrade facilitates brokerage connections. Its processing is governed by its own terms and privacy policy.</P>
      <P><strong>Legal and compliance</strong> — If necessary to comply with applicable law, legal process, or lawful governmental request; or to protect the rights, security, and safety of our users, our business, or others.</P>
      <P><strong>Business transactions</strong> — In connection with a merger, acquisition, restructuring, or sale of assets, subject to standard confidentiality protections.</P>
      <P><strong>At your direction</strong> — When you expressly request that we share information with a third party.</P>

      <D />
      <SectionHeading>Cookies and Similar Technologies</SectionHeading>
      <P>We use cookies and similar technologies for:</P>
      <Bullets items={[
        "Strictly necessary purposes — authentication, security, and session management;",
        "Preferences — language and settings;",
        "Analytics — performance and feature usage.",
      ]} />
      <P>You can manage cookies through your browser settings, but disabling certain cookies may limit Service functionality.</P>

      <D />
      <SectionHeading>Data Retention</SectionHeading>
      <P>We retain personal information only as long as reasonably necessary for:</P>
      <Bullets items={[
        "Maintaining your account and delivering the Service;",
        "Maintaining a historical record of reports, if you choose to retain them;",
        "Complying with legal, tax, accounting, and regulatory obligations;",
        "Resolving disputes and enforcing agreements.",
      ]} />
      <P>Retention periods vary by data type. We may retain certain records for longer where required or permitted by law.</P>

      <D />
      <SectionHeading>Disconnection and Deletion</SectionHeading>
      <P>You may disconnect your brokerage connection through available product controls or by contacting us. Upon account deletion, we will take reasonable steps to delete or de-identify your personal information, subject to lawful exceptions, including any deletion workflow supported by our brokerage connection provider (which is described as deleting a registered user and all associated data, and being irreversible).</P>

      <D />
      <SectionHeading>Security</SectionHeading>
      <P>We implement administrative, technical, and physical safeguards to protect personal information against unauthorized access, disclosure, alteration, or destruction. No security program is perfect. You are responsible for maintaining the confidentiality of your login credentials and for using appropriate security measures on your devices and accounts.</P>

      <D />
      <SectionHeading>International Transfers</SectionHeading>
      <P>We are based in the United States and may process and store information in the U.S. and other jurisdictions where we or our service providers operate. Data protection laws in those jurisdictions may differ from those in your location. Where required by applicable law, we apply appropriate safeguards for international data transfers.</P>

      <D />
      <SectionHeading>Your Rights and Choices</SectionHeading>
      <P>Depending on your jurisdiction, you may have the right to:</P>
      <Bullets items={[
        "Request access to personal information we hold about you;",
        "Request correction of inaccurate or incomplete personal information;",
        "Request deletion of personal information (subject to lawful exceptions);",
        "Object to or restrict certain processing;",
        "Request portability of certain personal information;",
        "Withdraw consent where processing is based on consent.",
      ]} />
      <P>To submit a request, contact <A href="mailto:howard@stockownerreport.com">howard@stockownerreport.com</A>. We may verify your identity before responding.</P>

      <D />
      <SectionHeading>California and Certain U.S. Privacy Rights</SectionHeading>
      <P>California residents may have rights under California privacy law, including rights to know, delete, correct, opt out of sale/sharing (including via a user-enabled global privacy control), non-discrimination, and — under CPRA amendments — rights to limit use/disclosure of sensitive personal information. If we are required to recognize an opt-out preference signal (such as the Global Privacy Control), we will treat it as a valid opt-out request for the browser/device that sends the signal.</P>

      <D />
      <SectionHeading>Canada</SectionHeading>
      <P>Canadian users have rights of access and correction under PIPEDA and applicable provincial law. If a breach of security safeguards creates a real risk of significant harm, mandatory reporting and notification obligations may apply. For Qu&eacute;bec residents, our Privacy Officer can be reached at <A href="mailto:howard@stockownerreport.com">howard@stockownerreport.com</A>.</P>

      <D />
      <SectionHeading>United Kingdom</SectionHeading>
      <P>If you are in the United Kingdom, privacy rights and notice expectations arise under the UK GDPR and the Data Protection Act 2018. Applicable personal data breaches must be notified to the relevant regulator within required timeframes (e.g., within 72 hours where required).</P>

      <D />
      <SectionHeading>Marketing Communications</SectionHeading>
      <P>If we send promotional communications, you may opt out via the unsubscribe link in any message or by contacting us. We will continue to send non-promotional service messages. For Canadian users, our email practices are designed to comply with applicable commercial electronic messaging requirements.</P>

      <D />
      <SectionHeading>Children&rsquo;s Privacy</SectionHeading>
      <P>The Service is not directed to individuals under 18. We do not knowingly collect personal information from children. If you believe a child has provided information, contact us and we will take appropriate steps.</P>

      <D />
      <SectionHeading>Changes to This Privacy Policy</SectionHeading>
      <P>We may update this Privacy Policy from time to time. The &ldquo;Last Updated&rdquo; date reflects the most recent revision. We will provide reasonable notice of material changes, such as by Website notice or email to account holders.</P>

      <D />
      <SectionHeading>Contact Us</SectionHeading>
      {/* Formal address block */}
      <Box
        sx={{
          mt: "1rem",
          p: "1.25rem 1.5rem",
          background: "#f8f9fb",
          border: "1px solid #dde1e7",
          borderLeft: `4px solid ${NAVY}`,
          fontStyle: "normal",
        }}
      >
        <Box sx={{ fontSize: FS - 0.5, fontWeight: 700, color: NAVY, letterSpacing: "0.02em", mb: "0.35rem" }}>
          LookThroughProfits, Inc. &mdash; Privacy Officer
        </Box>
        <Box sx={{ fontSize: FS - 0.5, color: SUBTLE, lineHeight: 1.8 }}>
          169 Madison Ave STE 38180<br />
          New York, NY 10016, United States
        </Box>
        <Box sx={{ mt: "0.6rem" }}>
          <A href="mailto:howard@stockownerreport.com">howard@stockownerreport.com</A>
        </Box>
      </Box>
    </LegalDocumentLayout>
  );
}