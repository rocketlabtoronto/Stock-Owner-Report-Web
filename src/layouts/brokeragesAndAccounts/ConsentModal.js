/**
 * ConsentModal (Modal A) — Required acceptance gate before SnapTrade connection.
 *
 * All five checkboxes must be checked before "I Accept & Continue" is enabled.
 * On acceptance the caller receives { accepted_at, acceptance_version }.
 */
import { useState } from "react";
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
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import PropTypes from "prop-types";

// Bump this string whenever the consent text changes materially.
export const ACCEPTANCE_VERSION = "connect_v1_2026-02-18";

const CHECKBOXES = [
  {
    key: "localStorage",
    label: "Local device storage",
    body: "I understand that The Stock Owner's Report may store certain account and portfolio details locally in my browser (localStorage) to operate the dashboard. This local data remains on my device unless I Sign Out or clear browser storage.",
  },
  {
    key: "credentials",
    label: "Brokerage credentials",
    body: "I understand that brokerage authentication is completed directly through SnapTrade, and that The Stock Owner's Report does not receive, store, or have access to my brokerage username or password.",
  },
  {
    key: "dataAccess",
    label: "Data access authorization",
    body: "I authorize SnapTrade to retrieve the brokerage data I permit and share it with The Stock Owner's Report to provide dashboard features (for example: accounts, positions/holdings, balances, and transactions), subject to the permissions I grant.",
  },
  {
    key: "noAffiliation",
    label: "No affiliation with financial institutions",
    body: "I understand that The Stock Owner's Report is not affiliated with, sponsored by, or endorsed by any brokerage or financial institution, and that connectivity and data availability depend on SnapTrade and my brokerage.",
  },
  {
    key: "notAdvice",
    label: "Informational use / not investment advice",
    body: "I understand that information shown in The Stock Owner's Report is for informational purposes only and is not investment advice.",
  },
];

export default function ConsentModal({ open, onAccept, onCancel }) {
  const initialChecked = Object.fromEntries(CHECKBOXES.map((c) => [c.key, false]));

  const [checked, setChecked] = useState(initialChecked);

  const allChecked = Object.values(checked).every(Boolean);

  const handleChange = (key) => (e) => {
    setChecked((prev) => ({ ...prev, [key]: e.target.checked }));
  };

  const reset = () => {
    setChecked(Object.fromEntries(CHECKBOXES.map((c) => [c.key, false])));
  };

  const handleAccept = () => {
    if (!allChecked) return;
    onAccept({
      accepted_at: new Date().toISOString(),
      acceptance_version: ACCEPTANCE_VERSION,
    });
    reset();
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 700, fontSize: 20, pb: 0.5 }}>
        Before you connect a brokerage
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Typography variant="body2" sx={{ mb: 2.5, lineHeight: 1.65 }}>
          To connect your brokerage account, you will be redirected to SnapTrade to authenticate
          and authorize data access. Please review the items below. You must accept all of them
          to continue.
        </Typography>

        {/* Five required checkboxes */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {CHECKBOXES.map(({ key, label, body }) => (
            <Box
              key={key}
              sx={{
                border: "1px solid",
                borderColor: checked[key] ? "primary.main" : "divider",
                borderRadius: 2,
                p: 1.5,
                transition: "border-color .2s",
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 1,
                cursor: "pointer",
              }}
              onClick={() => setChecked((prev) => ({ ...prev, [key]: !prev[key] }))}
            >
              <Checkbox
                checked={checked[key]}
                onChange={handleChange(key)}
                onClick={(e) => e.stopPropagation()}
                sx={{ p: 0, mt: "2px", flexShrink: 0 }}
              />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.5 }}>
                  {label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Full terms - always visible */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Full terms for connecting a brokerage
          </Typography>

          <Box>
            <Box
              sx={{
                mt: 1.5,
                p: 2,
                borderRadius: 2,
                backgroundColor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                By selecting &ldquo;I Accept &amp; Continue&rdquo;, you acknowledge and agree that:
              </Typography>
              {[
                [
                  "Third-party connection provider.",
                  "Brokerage connection and authentication are provided by SnapTrade. Your interaction with SnapTrade may be governed by SnapTrade's own terms and privacy practices.",
                ],
                [
                  "Credentials handling.",
                  "The Stock Owner's Report does not collect or store brokerage login credentials. Authentication occurs within SnapTrade's connection flow.",
                ],
                [
                  "Authorization scope.",
                  "You control which brokerages you connect and the permissions granted. The Stock Owner's Report uses authorized data solely to provide product functionality.",
                ],
                [
                  "Data availability and accuracy.",
                  "Data availability, timeliness, and completeness may vary by brokerage and are dependent on SnapTrade and brokerage systems. The Stock Owner's Report does not guarantee uninterrupted access or error-free data.",
                ],
                [
                  "Local device storage.",
                  "Certain dashboard data may be stored locally in your browser to support performance and session continuity and may persist until you sign out or clear browser storage.",
                ],
                [
                  "No affiliation.",
                  "The Stock Owner's Report is not affiliated with, sponsored by, or endorsed by any brokerage or financial institution.",
                ],
                [
                  "No investment advice.",
                  "The Stock Owner's Report provides informational analytics and does not provide investment, tax, or legal advice.",
                ],
              ].map(([title, text]) => (
                <Box key={title} sx={{ mb: 1.25 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {title}
                  </Typography>{" "}
                  <Typography variant="caption" color="text.secondary">
                    {text}
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Link href="/privacy" variant="caption" sx={{ fontWeight: 600 }}>
                  Privacy Policy
                </Link>
                <Link href="/terms" variant="caption" sx={{ fontWeight: 600 }}>
                  Terms of Use
                </Link>
              </Box>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: "block", mt: 0.75 }}
              >
                Last updated: 2026-02-18
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{ flexDirection: "column", alignItems: "stretch", gap: 0.5, px: 3, py: 2 }}
      >
        <Button
          variant="contained"
          disabled={!allChecked}
          onClick={handleAccept}
          sx={{ fontWeight: 700, py: 1.1, textTransform: "none" }}
          fullWidth
        >
          I Accept &amp; Continue
        </Button>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: "center", lineHeight: 1.5 }}
        >
          You can disconnect at any time. Local dashboard data can be cleared from your device.
        </Typography>
        <Button
          variant="text"
          onClick={handleCancel}
          sx={{ fontWeight: 600, textTransform: "none", color: "text.secondary" }}
          fullWidth
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ConsentModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onAccept: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
