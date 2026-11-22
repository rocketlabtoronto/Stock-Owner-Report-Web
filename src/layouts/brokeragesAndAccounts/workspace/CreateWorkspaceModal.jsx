import React, { useState } from "react";
import PropTypes from "prop-types";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import CircularProgress from "@mui/material/CircularProgress";

const WORKSPACE_TYPE_OPTIONS = [
  {
    value: "upload_portfolio",
    label: "Upload Portfolio",
    body: "Import holdings from an Excel file and edit share counts yourself.",
  },
  {
    value: "connect_brokerage",
    label: "Connect to Brokerage",
    body: "Link a brokerage account; holdings are shown read-only, kept in sync by the connection.",
  },
];

// Shown once, for a brand-new sign-in with no existing workspace. The user
// can change the pre-selected type (based on which button they clicked)
// before confirming; each email owns exactly one workspace going forward.
export default function CreateWorkspaceModal({ open, email, provider, defaultType, onCreate }) {
  const [workspaceType, setWorkspaceType] = useState(defaultType);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onCreate(workspaceType);
    } catch (e) {
      setError(e?.message || "Could not create your workspace. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth disableEscapeKeyDown>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>Create your workspace</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography sx={{ fontSize: 13.5, color: "#4B5563", mb: 0.5 }}>
          Signed in as
        </Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#0d1b2a", mb: 2 }}>
          {email}
          {provider && (
            <Typography component="span" sx={{ fontSize: 12.5, color: "#9ca3af", ml: 1 }}>
              via {provider}
            </Typography>
          )}
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: "#4B5563", mb: 1 }}>
          Choose your workspace type. You can change this selection now; it cannot be changed
          after the workspace is created.
        </Typography>
        <RadioGroup
          value={workspaceType}
          onChange={(event) => setWorkspaceType(event.target.value)}
        >
          {WORKSPACE_TYPE_OPTIONS.map((option) => (
            <Box
              key={option.value}
              sx={{
                border: "1px solid",
                borderColor: workspaceType === option.value ? "#0d1b2a" : "#d6d9de",
                borderRadius: 1,
                px: 1.5,
                py: 1,
                mb: 1,
              }}
            >
              <FormControlLabel
                value={option.value}
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                      {option.label}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: "#6b7280" }}>
                      {option.body}
                    </Typography>
                  </Box>
                }
              />
            </Box>
          ))}
        </RadioGroup>
        {error && (
          <Typography sx={{ fontSize: 12.5, color: "#b91c1c", mt: 1 }}>{error}</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #d6d9de" }}>
        <Button
          variant="contained"
          disabled={submitting}
          onClick={handleCreate}
          startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{
            backgroundColor: "#0d1b2a",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
            borderRadius: 0,
            "&:hover": { backgroundColor: "#1a3a5c" },
          }}
        >
          Create Workspace
        </Button>
      </DialogActions>
    </Dialog>
  );
}

CreateWorkspaceModal.propTypes = {
  open: PropTypes.bool.isRequired,
  email: PropTypes.string.isRequired,
  provider: PropTypes.string,
  defaultType: PropTypes.oneOf(["upload_portfolio", "connect_brokerage"]).isRequired,
  onCreate: PropTypes.func.isRequired,
};
