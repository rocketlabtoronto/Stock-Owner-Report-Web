import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import workspaceService, { applyWorkspaceAccountsToStore } from "services/workspaceService";
import { useWorkspaceStore } from "stores/useWorkspaceStore";
import { ACTION_TO_WORKSPACE_TYPE, takePendingWorkspaceAction } from "./brokeragesAndAccounts/workspace/workspaceActions";
import CreateWorkspaceModal from "./brokeragesAndAccounts/workspace/CreateWorkspaceModal";

// Lands here after Google/Microsoft/LinkedIn sign-in. Resolves the caller's
// existing workspace (by email) or collects the workspace type for a new one,
// then returns to the dashboard and resumes whichever action (Upload a
// Portfolio / Connect a Brokerage) started the sign-in.
export default function AuthCallback() {
  const navigate = useNavigate();
  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [newUser, setNewUser] = useState(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const { data } = await workspaceService.getSession();
        if (!data?.session) {
          throw new Error("Sign-in did not complete. Please try again.");
        }

        const result = await workspaceService.resolveWorkspace();
        const pendingAction = takePendingWorkspaceAction();

        if (result.workspace) {
          setWorkspace(result.workspace);
          const holdings = await workspaceService.getWorkspaceHoldings(result.workspace.id);
          applyWorkspaceAccountsToStore(holdings?.accounts);
          navigate("/brokeragesAndAccounts", { replace: true, state: { continueAction: pendingAction } });
          return;
        }

        setNewUser({
          email: result.email,
          provider: result.provider,
          pendingAction,
          defaultType: ACTION_TO_WORKSPACE_TYPE[pendingAction] || "upload_portfolio",
        });
        setStatus("needs-workspace");
      } catch (e) {
        setStatus("error");
        setError(e?.message || "Sign-in failed.");
      }
    })();
  }, [navigate, setWorkspace]);

  const handleCreateWorkspace = async (workspaceType) => {
    const result = await workspaceService.createWorkspace(workspaceType);
    setWorkspace(result.workspace);
    navigate("/brokeragesAndAccounts", {
      replace: true,
      state: { continueAction: newUser?.pendingAction },
    });
  };

  if (status === "needs-workspace" && newUser) {
    return (
      <CreateWorkspaceModal
        open
        email={newUser.email}
        provider={newUser.provider}
        defaultType={newUser.defaultType}
        onCreate={handleCreateWorkspace}
      />
    );
  }

  return (
    <Backdrop open sx={{ color: "#0f172a", zIndex: (theme) => theme.zIndex.modal + 20 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          px: 4,
          py: 3,
          borderRadius: 3,
          background: "#ffffff",
          minWidth: 320,
          textAlign: "center",
        }}
      >
        {status === "error" ? (
          <>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Sign-in failed
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(71, 85, 105, 0.9)" }}>
              {error}
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 1, textTransform: "none", fontWeight: 600 }}
              onClick={() => navigate("/brokeragesAndAccounts")}
            >
              Go back
            </Button>
          </>
        ) : (
          <>
            <CircularProgress size={36} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Finishing sign-in…
            </Typography>
          </>
        )}
      </Box>
    </Backdrop>
  );
}
