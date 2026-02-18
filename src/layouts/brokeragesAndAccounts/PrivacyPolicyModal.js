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

const SECTIONS = [
  {
    heading: "Effective Date",
    body: "July 29, 2024",
  },
  {
    heading: "Our Commitment",
    body: "LookThroughProfits.com is committed to protecting your privacy. We comply with the California Consumer Privacy Act (CCPA) and Canada's Personal Information Protection and Electronic Documents Act (PIPEDA). We do not operate in or serve users from the European Union or other jurisdictions outside the United States and Canada.",
  },
  {
    heading: "Data We Collect",
    body: "We do not store personally identifiable information (PII) or collect login credentials for any brokerage account. We only access your investment data through SnapTrade, a secure and regulated third-party API, and only with your explicit consent.",
  },
  {
    heading: "Data Sharing",
    body: "We do not sell, trade, or share your data. Your information is used solely to provide you with portfolio insights and analytics.",
  },
  {
    heading: "Data Hosting",
    body: "All data is securely hosted in the United States and accessed only with your authorization for that session.",
  },
  {
    heading: "Your Rights",
    body: "You may request deletion of your session data or access logs at any time by contacting us at privacy@lookthroughprofits.com.",
  },
];

export default function PrivacyPolicyModal({ open, onClose }) {
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
        Privacy Policy
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
          {SECTIONS.map(({ heading, body }, i) => (
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

PrivacyPolicyModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
