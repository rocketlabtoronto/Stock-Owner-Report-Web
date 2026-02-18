/**
 * SecurityDetailsModal (Modal B) — Informational "Privacy & Security Details" modal.
 *
 * Opened from the Security & Data Handling card via "Learn more".
 * Read-only; no checkboxes required.
 */
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Divider,
  Link,
} from "@mui/material";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import PropTypes from "prop-types";

const SECTIONS = [
  {
    title: "Local device storage",
    body: "When you connect a brokerage, certain account and portfolio data is stored in your browser's localStorage to power the dashboard. This data stays on your device and is not transmitted to The Stock Owner's Report servers beyond what is needed to load the dashboard. It will persist across sessions until you Sign Out or manually clear your browser storage.",
  },
  {
    title: "How to remove local data",
    body: 'You can remove all locally stored dashboard data at any time by clicking the "Clear local data" button on this page. You can also sign out, which clears session data. Clearing browser storage through your browser settings will also remove this data.',
  },
  {
    title: "Brokerage credentials",
    body: "The Stock Owner's Report never sees or stores your brokerage username or password. When you connect a brokerage, you authenticate directly through SnapTrade's secure connection portal. SnapTrade manages credential handling independently under its own security practices.",
  },
  {
    title: "Data access",
    body: "The Stock Owner's Report retrieves read-only portfolio data (accounts, holdings, balances, transactions) via SnapTrade based on the permissions you grant. No trades or transfers can be made through this platform. You can revoke access by disconnecting your brokerage at any time.",
  },
  {
    title: "Relationship with financial institutions",
    body: "The Stock Owner's Report is an independent analytics platform and is not affiliated with, sponsored by, or endorsed by any brokerage, bank, or financial institution. Connectivity and data availability depend on SnapTrade and your individual brokerage.",
  },
];

export default function SecurityDetailsModal({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper"
      PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 4px 24px rgba(13,27,42,0.12)" } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: 18, color: "#0d1b2a", borderBottom: "1px solid #d6d9de", pb: 1.5 }}>
        Privacy &amp; Security Details
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SECTIONS.map(({ title, body }, i) => (
            <Box key={title}>
              {i > 0 && <Divider sx={{ mb: 2, borderColor: "#d6d9de" }} />}
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#111827", mb: 0.5, textTransform: "uppercase", letterSpacing: 0.8 }}>
                {title}
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: "#4B5563", lineHeight: 1.7 }}>
                {body}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ mt: 3, mb: 1.5, borderColor: "#d6d9de" }} />
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Link href="/privacy" sx={{ fontSize: 12.5, fontWeight: 600, color: "#0d1b2a" }}>
            Privacy Policy
          </Link>
          <Link href="/terms" sx={{ fontSize: 12.5, fontWeight: 600, color: "#0d1b2a" }}>
            Terms of Use
          </Link>
        </Box>
        <Typography sx={{ fontSize: 12, color: "#9CA3AF", display: "block", mt: 0.75 }}>
          Last updated: 2026-02-18
        </Typography>
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
            minWidth: 100,
            "&:hover": { backgroundColor: "#1a3a5c", boxShadow: "none" },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

SecurityDetailsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
