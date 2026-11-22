import React from "react";
import PropTypes from "prop-types";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import workspaceService from "services/workspaceService";
import { setPendingWorkspaceAction } from "./workspaceActions";

const PROVIDER_BUTTONS = [
  { key: "google", label: "Continue with Google (Gmail)" },
  { key: "microsoft", label: "Continue with Microsoft (Outlook)" },
  { key: "linkedin", label: "Continue with LinkedIn" },
];

// Shown when the signed-out user clicks Upload a Portfolio or Connect a
// Brokerage. The chosen action resumes automatically once sign-in completes
// (see workspaceActions.js and AuthCallback.jsx).
export default function SignInModal({ open, onClose, pendingAction }) {
  const [error, setError] = React.useState("");
  const [loadingKey, setLoadingKey] = React.useState("");

  const handleProviderClick = async (providerKey) => {
    setError("");
    setLoadingKey(providerKey);
    setPendingWorkspaceAction(pendingAction);
    try {
      const { error: signInError } = await workspaceService.signInWithProvider(
        providerKey,
        `${window.location.origin}/auth/callback`
      );
      if (signInError) throw signInError;
      // On success the browser navigates away to the provider; nothing else to do here.
    } catch (e) {
      setLoadingKey("");
      setError(e?.message || "Sign-in failed. Please try again.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
        Sign in to continue
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 10, color: "#9CA3AF" }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5, pb: 3 }}>
        <Typography sx={{ fontSize: 13.5, color: "#4B5563", mb: 2.5, lineHeight: 1.6 }}>
          Sign in to create or return to your workspace. We use your email to keep your accounts
          and holdings saved across sessions.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {PROVIDER_BUTTONS.map(({ key, label }) => (
            <Button
              key={key}
              variant="outlined"
              disabled={Boolean(loadingKey)}
              onClick={() => handleProviderClick(key)}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                fontWeight: 600,
                fontSize: 13.5,
                py: 1.1,
                borderColor: "#d6d9de",
                color: "#0d1b2a",
                borderRadius: 0,
                "&:hover": { borderColor: "#0d1b2a", backgroundColor: "#f9fafb" },
              }}
            >
              {loadingKey === key ? "Redirecting…" : label}
            </Button>
          ))}
        </Box>
        {error && (
          <Typography sx={{ fontSize: 12.5, color: "#b91c1c", mt: 2 }}>{error}</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

SignInModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  pendingAction: PropTypes.oneOf(["upload", "brokerage"]).isRequired,
};
