import React, { useState } from "react";
import ConsentModal from "./ConsentModal";
import { brokerages, isIntegrationAvailable } from "./brokerageData";
import ManualUploadInstructionsModal from "./ManualUploadInstructionsModal";
import SnapTradeConnectModal from "./SnapTradeConnectModal";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Typography from "@mui/material/Typography";
import PropTypes from "prop-types";
import { parseBrokerageCsv } from "services/parseBrokerageCsvService";
import { useAppStore } from "../../stores/store";
import { SNAPTRADE_BROKER_ALLOWLIST } from "services/snaptradeBrokerAllowlistService";

export default function AddBrokerageDialog({ open, onClose, onSnapTradeSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [country, setCountry] = useState("Canada");
  const [consentOpen, setConsentOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualBrokerage, setManualBrokerage] = useState("");
  const [snapTradeModalOpen, setSnapTradeModalOpen] = useState(false);
  const [snapTradeBrokerage, setSnapTradeBrokerage] = useState("");
  const [snapTradeBrokerSlug, setSnapTradeBrokerSlug] = useState("");
  const [snapTradeError, setSnapTradeError] = useState("");
  const [snapTradeLoading, setSnapTradeLoading] = useState(false);

  // Read global flag to disable SnapTrade integrations
  // CRA exposes only REACT_APP_* env vars to the client.
  const isSnapTradeDisabled = String(process.env.REACT_APP_DISABLE_SNAPTRADE).toLowerCase() === "true";

  // For manual upload modal, handle file selection
  const handleManualFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const storeParsed = (result) => {
    const first = result.firstTable || {};
    const accountRaw = String(first.Account || "");
    const [namePart] = accountRaw.split(" - ");
    const brokerageName = (namePart || "").trim();
    const bank = inferBankFromName(brokerageName);
    const accountId = accountRaw; // use full string as ID; can refine if needed

    const holdings = result.secondTable || [];

    // Persist on the element itself
    useAppStore.getState().upsertBrokerageAccount({ Account: accountRaw, bank, holdings });

    // Also maintain per-account and flat legacy stores for backward compatibility
    useAppStore.getState().setAccountHoldingsForAccount(accountId, holdings);
    useAppStore.getState().setAccountHoldings(holdings);
  };

  // For manual upload modal, handle upload
  const handleManualUpload = () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }
    parseBrokerageCsv(selectedFile, (result) => {
      storeParsed(result);
    });
    setManualModalOpen(false);
    setSnapTradeModalOpen(false);
    setSelectedFile(null);
    onClose();
  };

  // For SnapTrade flow file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    parseBrokerageCsv(file, (result) => {
      storeParsed(result);
    });
  };

  // Infer short bank code from the brokerage display name for logo mapping
  const inferBankFromName = (name) => {
    const n = String(name || "").toLowerCase();
    if (n.includes("td")) return "TD";
    if (n.includes("rbc")) return "rbc";
    if (n.includes("questrade")) return "questrade";
    if (n.includes("wealthsimple")) return "wealthsimple";
    if (n.includes("cibc")) return "cibc";
    if (n.includes("national bank")) return "nbdb";
    if (n.includes("scotia")) return "scotia";
    if (n.includes("bmo")) return "bmo";
    if (n.includes("schwab")) return "charles";
    if (n.includes("chase")) return "chase";
    if (n.includes("etrade") || n.includes("e*trade")) return "etrade";
    if (n.includes("fidelity")) return "fidelity";
    if (n.includes("interactive brokers")) return "ibkr";
    if (n.includes("merrill")) return "merrill";
    if (n.includes("robinhood")) return "robinhood";
    if (n.includes("vanguard")) return "vanguard";
    if (n.includes("wells fargo")) return "fargo";
    return "logo_image"; // default fallback
  };

  const handleConsent = () => {
    setConsentOpen(false);
    onClose();
  };

  // Handle tile click
  const handleBrokerageTileClick = (broker) => {
    console.log("Clicked broker:", broker);
    const allowlistEntry = SNAPTRADE_BROKER_ALLOWLIST.find(
      (entry) => entry.label.toLowerCase() === String(broker.name || "").toLowerCase()
    );
    const resolvedSlug = allowlistEntry?.enabled === false ? null : allowlistEntry?.broker;
    console.log("resolvedSlug: ", resolvedSlug);
    const requiresManual =
      broker.integration === isIntegrationAvailable.notAvailable ||
      (broker.integration === isIntegrationAvailable.snapTrade && isSnapTradeDisabled) ||
      (broker.integration === isIntegrationAvailable.snapTrade && !resolvedSlug);

    if (requiresManual) {
      setManualBrokerage(broker.name);
      setManualModalOpen(true);
      setSelectedFile(null);
    } else if (broker.integration === isIntegrationAvailable.snapTrade) {
      setSnapTradeBrokerage(broker.name);
      setSnapTradeBrokerSlug(resolvedSlug);
      setSnapTradeModalOpen(true);
    }
  };

  // SnapTrade iframe connection handles the portal, so these callbacks are passed to the modal
  const handleSnapTradeSuccess = (authorizationId) => {
    setSnapTradeModalOpen(false);
    setSnapTradeError("");
    setSnapTradeLoading(false);
    if (onSnapTradeSuccess) onSnapTradeSuccess(authorizationId);
  };
  const handleSnapTradeError = (error) => {
    setSnapTradeError(error?.detail || "Failed to connect to SnapTrade.");
    setSnapTradeLoading(false);
  };
  const handleSnapTradeExit = () => {
    setSnapTradeModalOpen(false);
    setSnapTradeLoading(false);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 4px 24px rgba(13,27,42,0.12)" } }}
      >
        <DialogTitle sx={{
          fontWeight: 700,
          fontSize: 18,
          color: "#0d1b2a",
          borderBottom: "1px solid #d6d9de",
          pb: 1.5,
        }}>
          Connect a Brokerage
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 12,
              top: 10,
              color: "#9CA3AF",
              "&:hover": { color: "#0d1b2a", background: "none" },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          <Typography sx={{ fontSize: 13, color: "#4B5563", mb: 2, lineHeight: 1.6 }}>
            Select your country and brokerage:
          </Typography>
          {isSnapTradeDisabled && (
            <Typography sx={{ fontSize: 12.5, color: "#9CA3AF", mb: 1.5, lineHeight: 1.6 }}>
              Direct brokerage connections are temporarily unavailable. Please use manual upload.
            </Typography>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{
                fontSize: 13,
                padding: "6px 10px",
                borderRadius: 0,
                border: "1px solid #d6d9de",
                color: "#0d1b2a",
                fontWeight: 600,
                background: "#fff",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="Canada">Canada</option>
              <option value="United States">United States</option>
            </select>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 24,
              justifyContent: "center",
            }}
          >
            {brokerages[country].map((broker) => {
              const allowlistEntry = SNAPTRADE_BROKER_ALLOWLIST.find(
                (entry) => entry.label.toLowerCase() === String(broker.name || "").toLowerCase()
              );
              const resolvedSlug = allowlistEntry?.enabled === false ? null : allowlistEntry?.broker;
              const requiresManual =broker.integration === isIntegrationAvailable.notAvailable;
              return (
                <div
                  key={broker.name}
                  onClick={() => handleBrokerageTileClick(broker)}
                  style={{
                    width: 120,
                    height: 120,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #d6d9de",
                    borderRadius: 0,
                    background: requiresManual ? "#F9FAFB" : "#fff",
                    cursor: "pointer",
                    opacity: requiresManual ? 0.7 : 1,
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0d1b2a"; e.currentTarget.style.background = "#F9FAFB"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d6d9de"; e.currentTarget.style.background = requiresManual ? "#F9FAFB" : "#fff"; }}
                  title={requiresManual ? "Manual upload required" : "Connect via API"}
                >
                  <img
                    src={broker.logo}
                    alt={broker.name}
                    style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 4 }}
                  />
                  <span style={{ fontSize: 11, textAlign: "center", color: "#4B5563", fontWeight: 500 }}>
                    {broker.name}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Only show file input for SnapTrade brokerages (if needed) */}
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {selectedFile && (
            <Typography sx={{ fontSize: 12.5, color: "#4B5563", mt: 1 }}>
              Selected file: {selectedFile.name}
            </Typography>
          )}
          {parsedData.length > 0 && (
            <Typography sx={{ fontSize: 12.5, color: "#4B5563", mt: 1 }}>
              Parsed {parsedData.length} rows.
            </Typography>
          )}
        </DialogContent>
        {/* No Cancel or Upload buttons needed here anymore */}
      </Dialog>
      <SnapTradeConnectModal
        open={snapTradeModalOpen}
        onClose={() => setSnapTradeModalOpen(false)}
        brokerageName={snapTradeBrokerage}
        brokerSlug={snapTradeBrokerSlug}
        error={snapTradeError}
        loading={snapTradeLoading}
        onSuccess={handleSnapTradeSuccess}
        onError={handleSnapTradeError}
        onExit={handleSnapTradeExit}
        onFileChange={handleManualFileChange}
        onUpload={handleManualUpload}
        selectedFile={selectedFile}
      />
      <ConsentModal open={consentOpen} onConsent={handleConsent} />
      <ManualUploadInstructionsModal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        brokerageName={manualBrokerage}
        onFileChange={handleManualFileChange}
        onUpload={handleManualUpload}
        selectedFile={selectedFile}
      />
    </>
  );
}

AddBrokerageDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSnapTradeSuccess: PropTypes.func,
};
