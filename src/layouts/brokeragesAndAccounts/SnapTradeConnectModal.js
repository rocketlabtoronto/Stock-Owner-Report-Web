import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import supabaseService from "../../services/supabaseService";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import PropTypes from "prop-types";

import axios from "axios";

export default function SnapTradeConnectModal({
  open,
  onClose,
  brokerageName,
  brokerSlug,
  error,
  loading,
  onSuccess,
  onError,
  onExit,
  onFileChange,
  onUpload,
  selectedFile,
}) {
  // State for the embedded SnapTrade flow
  const [loginLink, setLoginLink] = useState(null); // URL loaded in the iframe portal
  const [localError, setLocalError] = useState(null); // Errors specific to this modal
  const [snapTradeReady, setSnapTradeReady] = useState(false); // When true, we show SnapTrade instead of manual upload
  const [debugLogs, setDebugLogs] = useState([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [fallbackTimerExpired, setFallbackTimerExpired] = useState(false);
  const [snapTradeCompleted, setSnapTradeCompleted] = useState(false);

  // Manual upload template lives under /public/template.csv
  const templateUrl = "/template.csv";

  // Hidden file input for the manual upload fallback
  const fileInputRef = React.useRef();

  const handleChooseFile = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const redactSecret = (value) => {
    if (!value || typeof value !== "string") return "[missing]";
    if (value.length <= 6) return "[redacted]";
    return `${value.slice(0, 3)}...${value.slice(-3)}`;
  };

  const safeStringify = (value) => {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return `[unserializable: ${err?.message || "unknown"}]`;
    }
  };

  const addDebugLog = (level, message, data) => {
    const timestamp = new Date().toISOString();
    const payload = data === undefined ? "" : ` | data=${safeStringify(data)}`;
    const entry = `[${timestamp}] [${level}] ${message}${payload}`;
    setDebugLogs((prev) => [...prev, entry]);
    if (level === "error") {
      console.error(entry);
    } else if (level === "warn") {
      console.warn(entry);
    } else {
      console.log(entry);
    }
  };

  const handleCopyLogs = async () => {
    if (!debugLogs.length) return;
    try {
      await navigator.clipboard.writeText(debugLogs.join("\n"));
      setCopyStatus("Copied debug logs.");
    } catch (err) {
      setCopyStatus("Copy failed. Please select and copy manually.");
      addDebugLog("error", "Failed to copy debug logs", { message: err?.message });
    }
  };

  // Small helper to surface a consistent, user-friendly error message
  const formatError = (err) => {
    if (!err) return "An unexpected error occurred. Please try again later.";

    if (err?.body) {
      const code = err.body.code ? ` (${err.body.code})` : "";
      const detail = err.body.error || err.body.message;
      const status = err.status ? ` (${err.status})` : "";
      return `SnapTrade request failed${status}${code}${detail ? `: ${detail}` : ""}`;
    }

    if (axios.isAxiosError?.(err)) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.response?.data?.message;
      let message = `SnapTrade request failed${status ? ` (${status})` : ""}`;
      if (detail) message += `: ${detail}`;
      return message;
    }

    return err.message || "An unexpected error occurred. Please try again later.";
  };

  const createTransientUserId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  /**
   * Core SnapTrade flow (Workflow #3):
   * 1. Generate a transient GUID as SnapTrade userId.
   * 2. Register this one-time user via v2 registration Edge Function.
   * 3. Keep userId + userSecret in local persisted store only.
   * 4. Get the SnapTrade login link and load the portal.
   */
  useEffect(() => {
    if (!open) {
      setLoginLink(null);
      setLocalError(null);
      setSnapTradeReady(false);
      setDebugLogs([]);
      setCopyStatus("");
      setShowDebugLogs(false);
      setIsConnecting(false);
      setFallbackTimerExpired(false);
      setSnapTradeCompleted(false);
      return;
    }

    const handleKeydown = (event) => {
      const isCtrlD = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d";
      if (isCtrlD) {
        event.preventDefault();
        setShowDebugLogs((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    setIsConnecting(true);
    setFallbackTimerExpired(false);
    const fallbackTimeout = setTimeout(() => {
      setFallbackTimerExpired(true);
      setIsConnecting(false);
    }, 5000);

    const handleSnapTradeAuth = async () => {
      const userId = createTransientUserId();

      // Reset state each time the modal (re)opens
      setLocalError(null);
      setLoginLink(null);
      setSnapTradeReady(false);
      setDebugLogs([]);
      setCopyStatus("");
  setSnapTradeCompleted(false);
    setIsConnecting(true);

      addDebugLog("info", "SnapTrade modal opened", {
        userId,
        brokerageName,
        brokerSlug: brokerSlug || "missing",
      });

      if (!brokerSlug) {
        addDebugLog("warn", "Missing brokerSlug; falling back to manual upload");
        setLocalError(
          `Direct connection is not available for ${brokerageName}. Please use manual upload.`
        );
        setIsConnecting(false);
        setSnapTradeReady(false);
        return;
      }

      try {
        addDebugLog("info", "Registering transient SnapTrade user", { userId });

        const regResult = await supabaseService.registerUser(userId);
        let userSecret = null;
        userSecret = regResult?.userSecret || null;

        if (!userSecret) {
          addDebugLog("error", "SnapTrade registration failed", { userSecret });
          setLocalError("Failed to register with SnapTrade. Please try again later.");
          setIsConnecting(false);
          return;
        }

        addDebugLog("info", "Registered SnapTrade userSecret", {
          userSecret: redactSecret(userSecret),
        });

        // Persist transient SnapTrade auth context client-side only.
        addDebugLog("info", "SnapTrade auth context ready", {
          userId,
          userSecret: redactSecret(userSecret),
        });
        useAuthStore.setState({ snapTradeUserId: userId, snapUserSecret: userSecret });

        // 5. Fetch login link via Supabase Edge Function to avoid CORS and keep secrets server-side.
        const frontendRedirectUri =
          window.location.origin.includes("localhost")
            ? "http://localhost:3000/snapTradeRedirect"
            : "https://www.stockownerreport.com/snapTradeRedirect";
        addDebugLog("info", "Requesting SnapTrade login link via Edge Function", {
          redirectURI: frontendRedirectUri,
        });

        const loginResult = await supabaseService.getSnapTradeLoginLink(
          userId,
          userSecret,
          frontendRedirectUri,
          {
            broker: brokerSlug,
            connectionPortalVersion: "v4",
          }
        );
        const redirectURI =
          loginResult?.redirectURI ||
          loginResult?.redirectUri ||
          loginResult?.redirectURL ||
          loginResult?.link;
        let normalizedRedirectURI = redirectURI;
        if (redirectURI) {
          try {
            const url = new URL(redirectURI);
            url.searchParams.set("redirect_uri", frontendRedirectUri);
            url.searchParams.set("redirectURI", frontendRedirectUri);
            normalizedRedirectURI = url.toString();
          } catch (normalizeError) {
            addDebugLog("warn", "Failed to normalize redirect URI", {
              message: normalizeError?.message,
            });
          }
        }
        addDebugLog("info", "SnapTrade login link response", {
          hasRedirectURI: Boolean(redirectURI),
          redirectURIUsed: loginResult?.redirectURIUsed,
        });
        addDebugLog("info", "SnapTrade login link resolved", {
          redirectURI: normalizedRedirectURI,
        });
        if (!normalizedRedirectURI) {
          setLocalError("Failed to retrieve SnapTrade login link. Please try again later.");
          setLoginLink(null);
          setSnapTradeReady(false);
          setIsConnecting(false);
          return;
        }

        setLoginLink(normalizedRedirectURI);
        setSnapTradeReady(true);
        setIsConnecting(false);
        addDebugLog("info", "SnapTrade login link stored", {
          linkLength: normalizedRedirectURI?.length || 0,
        });
      } catch (err) {
        // Catch-all error handler
        addDebugLog("error", "SnapTrade modal error", {
          message: err?.message,
          details: err?.body || err?.response?.data,
          status: err?.status || err?.response?.status,
        });

        // Surface the most useful message we can (KISS)
        setLocalError(formatError(err));
        setLoginLink(null);
        setSnapTradeReady(false);
        setIsConnecting(false);
      }
    };

    handleSnapTradeAuth();

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      clearTimeout(fallbackTimeout);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !loginLink) return;

    const isSnapTradeOrigin = (origin) => {
      if (!origin) return false;
      return origin.includes("snaptrade.com") || origin.includes("snaptrade.io");
    };

    const parseMessageData = (data) => {
      if (!data) return null;
      if (typeof data === "object" && data.status) return data;
      if (typeof data === "string") {
        if (data.startsWith("SUCCESS:")) {
          return { status: "SUCCESS", authorizationId: data.split(":")[1] };
        }
        if (data.startsWith("ERROR:")) {
          return { status: "ERROR", statusCode: data.split(":")[1] };
        }
        if (data === "CLOSED" || data === "CLOSE_MODAL" || data === "ABANDONED") {
          return { status: data };
        }
      }
      return null;
    };

    const handleMessageEvent = (event) => {
      if (event.origin && !isSnapTradeOrigin(event.origin) && event.origin !== window.location.origin) {
        return;
      }

      const data = parseMessageData(event.data);
      if (!data) return;

      if (data.status === "SUCCESS") {
        const authorizationId = data.authorizationId || data.authorization_id;
        addDebugLog("info", "SnapTrade iframe success", { authorizationId });
        setSnapTradeCompleted(true);
        if (onSuccess) onSuccess(authorizationId);
        window.location.assign("/snapTradeRedirect");
        return;
      }

      if (data.status === "SNAPTRADE_REDIRECT") {
        addDebugLog("info", "SnapTrade redirect loaded in iframe");
        window.location.assign("/snapTradeRedirect");
        return;
      }

      if (data.status === "ERROR") {
        const detail = data.detail || data.error || "Failed to connect to SnapTrade.";
        addDebugLog("error", "SnapTrade iframe error", {
          errorCode: data.errorCode,
          statusCode: data.statusCode,
          detail,
        });
        if (onError) onError(data);
        setLocalError(detail);
        setSnapTradeReady(false);
        setIsConnecting(false);
        return;
      }

      if (data.status === "CLOSED" || data.status === "CLOSE_MODAL" || data.status === "ABANDONED") {
        addDebugLog("info", "SnapTrade iframe closed", { status: data.status });
        if (onExit) onExit();
        if (onClose) onClose();
      }
    };

    window.addEventListener("message", handleMessageEvent, false);
    return () => {
      window.removeEventListener("message", handleMessageEvent, false);
    };
  }, [open, loginLink, onClose, onError, onExit, onSuccess]);

  // When SnapTrade isn't ready (or errors), we show the manual CSV upload path instead
  const showManualFallback = !snapTradeReady && (!isConnecting || fallbackTimerExpired);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 4px 24px rgba(13,27,42,0.12)" } }}
    >
      <DialogTitle sx={{
        fontWeight: 700,
        fontSize: 18,
        color: "#0d1b2a",
        borderBottom: "1px solid #d6d9de",
        pb: 1.5,
      }}>
        Connect to {brokerageName}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 10, color: "#9CA3AF", "&:hover": { color: "#0d1b2a", background: "none" } }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        {(localError || error) && (
          <Typography sx={{ fontSize: 13.5, color: "#b91c1c", mb: 2, lineHeight: 1.6 }}>
            {localError || error}
          </Typography>
        )}

        {!snapTradeReady && isConnecting && !fallbackTimerExpired && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <CircularProgress size={18} sx={{ color: "#0d1b2a" }} />
            <Typography sx={{ fontSize: 13.5, color: "#4B5563" }}>
              Connecting to {brokerageName}...
            </Typography>
          </Box>
        )}

        {!showManualFallback && loginLink && (
          <>
            <Box
              sx={{
                borderRadius: 0,
                border: "1px solid #d6d9de",
                overflow: "hidden",
                height: 560,
              }}
            >
              <iframe
                id="snaptrade-connection-portal"
                src={loginLink}
                title="SnapTrade Connection Portal"
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="clipboard-read; clipboard-write; fullscreen"
              />
            </Box>
          </>
        )}

        {showManualFallback && (
          <>
            <Box
              sx={{
                borderRadius: 0,
                border: "1px solid #d6d9de",
                backgroundColor: "#F9FAFB",
                p: 2.5,
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0d1b2a", mb: 0.75 }}>
                We couldn&apos;t start the direct connection to <strong>{brokerageName}</strong>…
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: "#4B5563", lineHeight: 1.7, mb: 2 }}>
                Please download your transactions or holdings file from your brokerage and upload it
                here. This keeps your report up to date while we retry the direct connection.
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: "#4B5563", lineHeight: 1.7, mb: 1 }}>
                Use our template to match the required format:{" "}
                <a href={templateUrl} download style={{ color: "#0d1b2a", fontWeight: 600 }}>
                  download template
                </a>
                .
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: "#4B5563", lineHeight: 1.7, mb: 2 }}>
                <strong>CSV structure:</strong> Account row, blank row, header row (Symbol, Market, Quantity),
                then holdings rows.
              </Typography>
              <Button
                variant="outlined"
                onClick={handleChooseFile}
                sx={{
                  color: "#0d1b2a",
                  borderColor: "#0d1b2a",
                  borderRadius: 0,
                  fontWeight: 600,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
                  boxShadow: "none",
                  "&:hover": { backgroundColor: "#F9FAFB", borderColor: "#0d1b2a", boxShadow: "none" },
                  minWidth: 160,
                }}
              >
                Choose File
              </Button>
              <Typography sx={{ fontSize: 12, color: "#9CA3AF", display: "block", mt: 1 }}>
                Need help? Contact support and we&apos;ll assist right away.
              </Typography>
            </Box>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={onFileChange}
              style={{ display: "none" }}
            />
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected file: {selectedFile.name}
              </Typography>
            )}
          </>
        )}

        {showDebugLogs && (
          <Box sx={{ mt: 3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#111827", mb: 1 }}>
              Debug logs
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCopyLogs}
                disabled={!debugLogs.length}
                sx={{ borderRadius: 0, borderColor: "#d6d9de", color: "#4B5563", textTransform: "none", fontSize: 12 }}
              >
                Copy logs
              </Button>
              {copyStatus && (
                <Typography sx={{ fontSize: 12, color: "#9CA3AF" }}>
                  {copyStatus}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 1.5,
        px: 3,
        py: 2,
        borderTop: "1px solid #d6d9de",
      }}>
        <Button
          onClick={onClose}
          sx={{
            fontWeight: 600,
            textTransform: "none",
            color: "#6b7280",
            fontSize: 13,
            px: 2,
            "&:hover": { background: "none", color: "#0d1b2a" },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onUpload}
          variant="contained"
          disabled={!showManualFallback || !selectedFile}
          sx={{
            backgroundColor: "#0d1b2a",
            color: "#fff",
            fontWeight: 600,
            px: 3.5,
            py: 1.1,
            fontSize: 13,
            borderRadius: 0,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            boxShadow: "none",
            "&:hover": { backgroundColor: "#1a3a5c", boxShadow: "none" },
            "&:disabled": { backgroundColor: "#9ca3af", color: "#fff" },
          }}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}

SnapTradeConnectModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  brokerageName: PropTypes.string.isRequired,
  brokerSlug: PropTypes.string,
  error: PropTypes.string,
  loading: PropTypes.bool,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  onExit: PropTypes.func,
  onFileChange: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  selectedFile: PropTypes.oneOfType([
    PropTypes.instanceOf(File),
    PropTypes.shape({ name: PropTypes.string }),
  ]),
};
