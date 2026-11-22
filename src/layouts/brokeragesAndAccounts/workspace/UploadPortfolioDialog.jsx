import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import CircularProgress from "@mui/material/CircularProgress";
import workspaceService, { applyWorkspaceAccountsToStore } from "services/workspaceService";
import {
  REQUIRED_COLUMNS,
  downloadPortfolioTemplate,
  parsePortfolioWorkbook,
} from "services/excelPortfolioService";
import ReviewUploadIssuesModal from "./ReviewUploadIssuesModal";

const EXAMPLE_ROWS = [
  ["RY", "25", "Personal TFSA", "Questrade", "TSX"],
  ["RY", "10", "Spousal RRSP", "Questrade", "TSX"],
  ["TD", "8.5", "Personal RRSP", "TD Direct Investing", "TSX"],
];

const UNREADABLE_MESSAGES = {
  unreadable: "This file could not be read. Please save it as a .xlsx file and try again.",
  no_rows: "No holdings were found in this file. Add at least one row and try again.",
};

export default function UploadPortfolioDialog({ open, onClose, workspace, onImported }) {
  const fileInputRef = useRef();
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reviewData, setReviewData] = useState(null);

  const resetState = () => {
    setSelectedFile(null);
    setError("");
    setUploading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setError("");
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    try {
      const parsed = await parsePortfolioWorkbook(selectedFile);
      if (!parsed.ok) {
        if (parsed.reason === "missing_columns") {
          setError(
            `This file is missing required column(s): ${parsed.missingColumns.join(", ")}. Download the template and try again.`
          );
        } else {
          setError(UNREADABLE_MESSAGES[parsed.reason] || "This file could not be processed.");
        }
        return;
      }

      const validation = await workspaceService.validatePortfolioUpload(workspace.id, parsed.rows);

      if (validation.status === "valid") {
        const importRows = validation.rows.map((row) => ({
          ticker: row.ticker,
          quantity: row.quantity,
          accountName: row.accountName,
          institutionCode: row.financialInstitution.code,
          exchangeCode: row.exchange.code,
        }));
        const result = await workspaceService.importPortfolio(workspace.id, importRows);
        applyWorkspaceAccountsToStore(result.accounts);
        onImported();
        handleClose();
        return;
      }

      setReviewData(validation);
    } catch (e) {
      setError(e?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleReviewImported = (accounts) => {
    applyWorkspaceAccountsToStore(accounts);
    setReviewData(null);
    onImported();
    handleClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
          Upload a Portfolio
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: "absolute", right: 12, top: 10, color: "#9CA3AF" }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0d1b2a", mb: 1 }}>
            How to prepare your worksheet
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: "#4B5563", lineHeight: 1.7, mb: 1 }}>
            Use one stock exchange per upload. You can include multiple accounts and financial
            institutions in the same file. If you hold stocks on different exchanges, upload a
            separate file for each exchange into this workspace.
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: "#4B5563", lineHeight: 1.7, mb: 1.5 }}>
            Enter one holding per row. If you own the same stock in two accounts, enter a separate
            row for each account.
          </Typography>
          <Box component="ul" sx={{ fontSize: 13.5, color: "#4B5563", pl: 2.5, mb: 2 }}>
            <li>
              <b>Stock Ticker Symbol</b> — the stock&apos;s trading symbol on the specified
              exchange.
            </li>
            <li>
              <b>Number of Shares</b> — the quantity held in that account. Fractional shares are
              supported.
            </li>
            <li>
              <b>Account Name</b> — use a consistent name for each account.
            </li>
            <li>
              <b>Financial Institution</b> — the brokerage that holds the account.
            </li>
            <li>
              <b>Exchange</b> — the exchange where the holding is listed.
            </li>
          </Box>
          <Table size="small" sx={{ mb: 2, border: "1px solid #e5e7eb" }}>
            <TableHead>
              <TableRow>
                {REQUIRED_COLUMNS.map((column) => (
                  <TableCell key={column} sx={{ fontWeight: 700, fontSize: 12 }}>
                    {column}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {EXAMPLE_ROWS.map((row) => (
                <TableRow key={row.join("-")}>
                  {row.map((cell, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <TableCell key={index} sx={{ fontSize: 12.5 }}>
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography sx={{ fontSize: 12.5, color: "#9ca3af", mb: 2 }}>
            Save the completed template as an .xlsx file and select Upload Excel File.
          </Typography>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <Button
              variant="outlined"
              onClick={() => downloadPortfolioTemplate()}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 0 }}
            >
              Download Excel Template
            </Button>
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 0 }}
            >
              Choose File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {selectedFile && (
              <Typography sx={{ fontSize: 12.5, color: "#4B5563" }}>
                Selected file: {selectedFile.name}
              </Typography>
            )}
          </Box>
          {error && (
            <Typography sx={{ fontSize: 12.5, color: "#b91c1c", mt: 1.5 }}>{error}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #d6d9de" }}>
          <Button onClick={handleClose} sx={{ textTransform: "none", fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!selectedFile || uploading}
            onClick={handleUpload}
            startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{
              backgroundColor: "#0d1b2a",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
              borderRadius: 0,
              "&:hover": { backgroundColor: "#1a3a5c" },
            }}
          >
            Upload Excel File
          </Button>
        </DialogActions>
      </Dialog>

      {reviewData && (
        <ReviewUploadIssuesModal
          open
          workspace={workspace}
          validation={reviewData}
          onClose={() => setReviewData(null)}
          onImported={handleReviewImported}
        />
      )}
    </>
  );
}

UploadPortfolioDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  workspace: PropTypes.shape({ id: PropTypes.string.isRequired }),
  onImported: PropTypes.func.isRequired,
};
