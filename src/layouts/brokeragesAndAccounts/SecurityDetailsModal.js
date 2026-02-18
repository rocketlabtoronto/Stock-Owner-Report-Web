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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 700, fontSize: 20, pb: 0.5 }}>
        Privacy &amp; Security Details
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {SECTIONS.map(({ title, body }, i) => (
            <Box key={title}>
              {i > 0 && <Divider sx={{ mb: 2.5 }} />}
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                {body}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ mt: 3, mb: 1.5 }} />
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Link href="/privacy" variant="caption" sx={{ fontWeight: 600 }}>
            Privacy Policy
          </Link>
          <Link href="/terms" variant="caption" sx={{ fontWeight: 600 }}>
            Terms of Use
          </Link>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.75 }}>
          Last updated: 2026-02-18
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ fontWeight: 600, textTransform: "none", minWidth: 100 }}
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
