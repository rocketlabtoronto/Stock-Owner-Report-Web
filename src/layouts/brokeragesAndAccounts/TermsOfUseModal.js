import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import PropTypes from "prop-types";

const TERMS = [
  {
    heading: "Effective Date",
    body: "July 29, 2024",
  },
  {
    heading: "Agreement",
    body: "By using LookThroughProfits.com, you agree to the following terms and conditions.",
  },
  {
    heading: "Eligibility",
    body: "You must be at least 18 years old and capable of entering a legally binding agreement.",
  },
  {
    heading: "Data Access Authorization",
    body: "You authorize LookThroughProfits.com to access your brokerage data in read-only mode via SnapTrade, only upon your explicit consent and only for the current session.",
  },
  {
    heading: "Not a Registered Advisor",
    body: "LookThroughProfits.com is not a registered investment advisor (RIA) in the United States or a licensed securities dealer in Canada. The information provided is for informational purposes only and does not constitute financial advice, legal advice, or a recommendation to buy or sell securities.",
  },
  {
    heading: "Responsibility",
    body: "You assume full responsibility for all actions based on information presented by this platform.",
  },
  {
    heading: "Indemnification",
    body: "You agree to indemnify and hold harmless LookThroughProfits.com and its affiliates from any and all claims, damages, or liabilities arising from your use of the service.",
  },
  {
    heading: "Jurisdiction",
    body: "All data is processed in and subject to the laws of the United States and Canada. The service is not available to residents of the European Union or any jurisdictions outside the United States and Canada.",
  },
  {
    heading: "Changes to Terms",
    body: "We may modify these terms at any time by posting an updated version. Continued use constitutes acceptance of the new terms.",
  },
  {
    heading: "Contact",
    body: "For questions, contact us at: privacy@lookthroughprofits.com",
  },
];

export default function TermsOfUseModal({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper"
      PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 4px 24px rgba(13,27,42,0.12)" } }}
    >
      <DialogTitle sx={{
        fontWeight: 700,
        fontSize: 18,
        color: "#0d1b2a",
        borderBottom: "1px solid #d6d9de",
        pb: 1.5,
      }}>
        Terms of Use
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 10, color: "#9CA3AF", "&:hover": { color: "#0d1b2a", background: "none" } }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {TERMS.map(({ heading, body }, i) => (
            <Box key={heading}>
              {i > 0 && <Divider sx={{ mb: 2, borderColor: "#d6d9de" }} />}
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#111827", mb: 0.5, textTransform: "uppercase", letterSpacing: 0.8 }}>
                {heading}
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: "#4B5563", lineHeight: 1.7 }}>
                {body}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #d6d9de" }}>
        <Button
          onClick={onClose}
          sx={{
            backgroundColor: "#0d1b2a",
            color: "#fff",
            fontWeight: 600,
            px: 3.5,
            py: 1,
            fontSize: 13,
            borderRadius: 0,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            boxShadow: "none",
            "&:hover": { backgroundColor: "#1a3a5c", boxShadow: "none" },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

TermsOfUseModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
