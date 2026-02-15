import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import PropTypes from "prop-types";

export default function PrivacyPolicyModal({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Privacy Policy
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ fontWeight: 400, fontSize: 15, color: "#444" }}>
        <div style={{ fontWeight: 400, fontSize: 15, color: "#444" }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontWeight: 600 }}>Effective Date:</span> July. 29, 2024
          </div>
          <div style={{ marginBottom: 12 }}>
            LookThroughProfits.com is committed to protecting your privacy. We comply with the
            California Consumer Privacy Act (CCPA) and Canada&apos;s Personal Information Protection
            and Electronic Documents Act (PIPEDA). We do not operate in or serve users from the
            European Union or other jurisdictions outside the United States and Canada.
            LookThroughProfits.com is committed to protecting your privacy. We comply with the
            California Consumer Privacy Act (CCPA) and Canada&apos;s Personal Information Protection
            and Electronic Documents Act (PIPEDA). We do not operate in or serve users from the
            European Union or other jurisdictions outside the United States and Canada.
          </div>
          <div style={{ marginBottom: 12 }}>
            We do not store personally identifiable information (PII) or collect login credentials
            for any brokerage account. We only access your investment data through SnapTrade, a
            secure and regulated third-party API, and only with your explicit consent.
          </div>
          <div style={{ marginBottom: 12 }}>
            We do not store personally identifiable information (PII) or collect login credentials
            for any brokerage account. We only access your investment data through SnapTrade, a
            secure and regulated third-party API, and only with your explicit consent.
          </div>
          <div style={{ marginBottom: 12 }}>
            We do not sell, trade, or share your data. Your information is used solely to provide
            you with portfolio insights and analytics.
          </div>
          <div style={{ marginBottom: 12 }}>
            All data is securely hosted in the United States and accessed only with your
            authorization for that session.
          </div>
          <div style={{ marginBottom: 0 }}>
            You may request deletion of your session data or access logs at any time by contacting
            us at privacy@lookthroughprofits.com.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

PrivacyPolicyModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
