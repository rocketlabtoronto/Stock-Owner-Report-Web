import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import PropTypes from "prop-types";

export default function TermsOfUseModal({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Terms of Use
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
            By using LookThroughProfits.com, you agree to the following terms and conditions:
          </div>
          <ul
            style={{
              paddingLeft: 24,
              marginBottom: 12,
              fontWeight: 400,
              fontSize: 15,
              color: "#444",
            }}
          >
            <li>
              You must be at least 18 years old and capable of entering a legally binding agreement.
            </li>
            <li>
              You authorize LookThroughProfits.com to access your brokerage data in read-only mode
              via SnapTrade, only upon your explicit consent and only for the current session.
            </li>
            <li>
              LookThroughProfits.com is not a registered investment advisor (RIA) in the United
              States or a licensed securities dealer in Canada.
            </li>
            <li>
              The information provided is for informational purposes only and does not constitute
              financial advice, legal advice, or a recommendation to buy or sell securities.
            </li>
            <li>
              You assume full responsibility for all actions based on information presented by this
              platform.
            </li>
            <li>
              You agree to indemnify and hold harmless LookThroughProfits.com and its affiliates
              from any and all claims, damages, or liabilities arising from your use of the service.
            </li>
            <li>
              All data is processed in and subject to the laws of the United States and Canada. The
              service is not available to residents of the European Union or any jurisdictions
              outside the United States and Canada.
            </li>
            <li>
              We may modify these terms at any time by posting an updated version. Continued use
              constitutes acceptance of the new terms.
            </li>
          </ul>
          <div style={{ marginBottom: 0 }}>
            For questions, contact us at: privacy@lookthroughprofits.com
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

TermsOfUseModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
