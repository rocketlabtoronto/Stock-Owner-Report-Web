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
import CircularProgress from "@mui/material/CircularProgress";
import workspaceService from "services/workspaceService";
import { setPendingWorkspaceAction } from "./workspaceActions";

const PROVIDER_BUTTONS = [
  { key: "google", label: "Sign in with Google", logo: "/logos/gmail.svg" },
  { key: "microsoft", label: "Sign in with Microsoft", logo: "/logos/microsoft-outlook.png" },
  { key: "linkedin", label: "Sign in with LinkedIn", logo: "/logos/linkedin.svg" },
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="workspace-sign-in-title"
      aria-describedby="workspace-sign-in-description"
      PaperProps={{
        sx: {
          m: 2,
          width: "calc(100% - 32px)",
          maxWidth: 480,
          borderRadius: 2,
          border: "1px solid #e2e8f0",
          boxShadow: "0 24px 64px rgba(13, 27, 42, 0.18)",
          backgroundImage: "none",
        },
      }}
    >
      <DialogTitle
        sx={{
          px: { xs: 2.5, sm: 3.5 },
          pt: 3.5,
          pb: 1,
          pr: 7,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: "-0.4px",
          lineHeight: 1.3,
          color: "#0d1b2a",
        }}
      >
        <Box component="span" id="workspace-sign-in-title">Sign in to continue</Box>
        <IconButton
          aria-label="Close sign-in"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 14,
            top: 14,
            p: 0.75,
            color: "#64748b",
            "&:hover": { color: "#0d1b2a", backgroundColor: "#f1f5f9" },
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 0.5, pb: 3.5 }}>
        <Typography
          id="workspace-sign-in-description"
          sx={{ fontSize: 14, color: "#64748b", mb: 3, lineHeight: 1.7 }}
        >
          Sign in to create or return to your workspace. We use your email to keep your accounts
          and holdings saved across sessions.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {PROVIDER_BUTTONS.map(({ key, label, logo }) => (
            <Button
              key={key}
              variant="outlined"
              disabled={Boolean(loadingKey)}
              aria-busy={loadingKey === key}
              onClick={() => handleProviderClick(key)}
              startIcon={
                <Box
                  component="img"
                  src={logo}
                  alt=""
                  aria-hidden="true"
                  sx={{ width: 24, height: 24, objectFit: "contain", display: "block" }}
                />
              }
              endIcon={loadingKey === key ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{
                minHeight: 56,
                justifyContent: "flex-start",
                textAlign: "left",
                textTransform: "none",
                fontWeight: 600,
                fontSize: { xs: 12.5, sm: 13.5 },
                lineHeight: 1.5,
                px: 2,
                py: 1.5,
                borderColor: "#dbe2ea",
                backgroundColor: "#ffffff",
                color: "#0d1b2a",
                borderRadius: 1,
                boxShadow: "0 1px 2px rgba(13, 27, 42, 0.03)",
                transition: "background-color 150ms ease, border-color 150ms ease",
                "& .MuiButton-startIcon": { m: 0, mr: 1.75, flexShrink: 0 },
                "& .MuiButton-endIcon": { ml: "auto", mr: 0, pl: 1 },
                "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" },
                "&.Mui-focusVisible": { outline: "2px solid #2563eb", outlineOffset: 3 },
                "&.Mui-disabled": { borderColor: "#e2e8f0", color: "#94a3b8" },
              }}
            >
              {loadingKey === key ? "Redirecting…" : label}
            </Button>
          ))}
        </Box>
        {error && (
          <Typography role="alert" sx={{ fontSize: 12.5, color: "#b91c1c", mt: 2 }}>{error}</Typography>
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
