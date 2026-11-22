import React, { useEffect, useMemo, useState } from "react";
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
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import workspaceService from "services/workspaceService";

const ISSUE_LABELS = {
  ticker_missing: "Ticker is missing.",
  ticker_invalid: "The ticker does not exist or cannot be found on the specified exchange.",
  quantity_invalid: "The share quantity is missing or invalid.",
  account_name_missing: "The account name is blank.",
  institution_unrecognized: "The financial institution is missing or unrecognized.",
  exchange_unrecognized: "The exchange is missing, incorrect, or unrecognized.",
  exchange_mismatch: "This row's exchange differs from the rest of the worksheet.",
};

const describeIssues = (issues) => issues.map((issue) => ISSUE_LABELS[issue] || issue);

const isRowClean = (row) => row.issues.length === 0;

export default function ReviewUploadIssuesModal({
  open,
  workspace,
  validation,
  onClose,
  onImported,
}) {
  const [rows, setRows] = useState(validation.rows);
  const [reference, setReference] = useState({ exchanges: [], institutions: [] });
  const [editingRowNumber, setEditingRowNumber] = useState(null);
  const [draft, setDraft] = useState(null);
  const [savingRowNumber, setSavingRowNumber] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    workspaceService
      .getReferenceData()
      .then(setReference)
      .catch(() => setReference({ exchanges: [], institutions: [] }));
  }, []);

  const distinctExchangeCodes = useMemo(
    () => [...new Set(rows.map((row) => row.exchange.code).filter(Boolean))],
    [rows]
  );
  const allClean = rows.every(isRowClean) && distinctExchangeCodes.length <= 1;

  const startEdit = (row) => {
    setEditingRowNumber(row.rowNumber);
    setDraft({
      ticker: row.ticker,
      quantity: row.quantity ?? "",
      accountName: row.accountName,
      financialInstitution: row.financialInstitution.displayName || row.financialInstitution.raw,
      exchange: row.exchange.displayName || row.exchange.raw,
    });
    setImportError("");
  };

  const cancelEdit = () => {
    setEditingRowNumber(null);
    setDraft(null);
  };

  const saveEdit = async (rowNumber) => {
    setSavingRowNumber(rowNumber);
    try {
      const result = await workspaceService.validatePortfolioUpload(workspace.id, [
        { rowNumber, ...draft },
      ]);
      const [updatedRow] = result.rows;
      setRows((previous) =>
        previous.map((row) => (row.rowNumber === rowNumber ? updatedRow : row))
      );
      setEditingRowNumber(null);
      setDraft(null);
    } catch (e) {
      setImportError(e?.message || "Could not validate this row. Please try again.");
    } finally {
      setSavingRowNumber(null);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportError("");
    try {
      const importRows = rows.map((row) => ({
        ticker: row.ticker,
        quantity: row.quantity,
        accountName: row.accountName,
        institutionCode: row.financialInstitution.code,
        exchangeCode: row.exchange.code,
      }));
      const result = await workspaceService.importPortfolio(workspace.id, importRows);
      onImported(result.accounts);
    } catch (e) {
      setImportError(e?.message || "Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
        Review Upload Issues
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 10, color: "#9CA3AF" }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        <Typography sx={{ fontSize: 13.5, color: "#4B5563", mb: 2 }}>
          Fix the rows below, then select Import Portfolio. Use Save and Cancel within a row to
          apply or discard a correction.
        </Typography>
        {distinctExchangeCodes.length > 1 && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              backgroundColor: "#fff7ed",
              border: "1px solid #fdba74",
              fontSize: 13,
              color: "#9a3412",
            }}
          >
            This worksheet contains more than one exchange ({distinctExchangeCodes.join(", ")}).
            Correct mislabeled rows, or cancel and split the file by exchange.
          </Box>
        )}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Row</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Ticker</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Shares</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Account Name</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Financial Institution</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Exchange</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Issue</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Correction</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const isEditing = editingRowNumber === row.rowNumber;
              const isSaving = savingRowNumber === row.rowNumber;
              return (
                <TableRow key={row.rowNumber} sx={{ backgroundColor: isRowClean(row) ? "transparent" : "#fef2f2" }}>
                  <TableCell sx={{ fontSize: 12.5 }}>{row.rowNumber}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        value={draft.ticker}
                        onChange={(e) => setDraft({ ...draft, ticker: e.target.value })}
                      />
                    ) : (
                      row.ticker
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        value={draft.quantity}
                        onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                      />
                    ) : (
                      row.quantity ?? ""
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        value={draft.accountName}
                        onChange={(e) => setDraft({ ...draft, accountName: e.target.value })}
                      />
                    ) : (
                      row.accountName
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {isEditing ? (
                      <TextField
                        select
                        size="small"
                        value={draft.financialInstitution}
                        onChange={(e) =>
                          setDraft({ ...draft, financialInstitution: e.target.value })
                        }
                        sx={{ minWidth: 160 }}
                      >
                        {reference.institutions.map((institution) => (
                          <MenuItem key={institution.code} value={institution.display_name}>
                            {institution.display_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      row.financialInstitution.displayName || row.financialInstitution.raw
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {isEditing ? (
                      <TextField
                        select
                        size="small"
                        value={draft.exchange}
                        onChange={(e) => setDraft({ ...draft, exchange: e.target.value })}
                        sx={{ minWidth: 120 }}
                      >
                        {reference.exchanges.map((exchange) => (
                          <MenuItem key={exchange.code} value={exchange.display_name}>
                            {exchange.display_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      row.exchange.displayName || row.exchange.raw
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: "#b91c1c", maxWidth: 220 }}>
                    {describeIssues(row.issues).join(" ")}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Box sx={{ display: "flex", gap: 0.75 }}>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={isSaving}
                          onClick={() => saveEdit(row.rowNumber)}
                          sx={{ textTransform: "none", minWidth: 0, px: 1.25 }}
                        >
                          {isSaving ? <CircularProgress size={12} color="inherit" /> : "Save"}
                        </Button>
                        <Button
                          size="small"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          sx={{ textTransform: "none", minWidth: 0, px: 1.25 }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    ) : (
                      <Button
                        size="small"
                        onClick={() => startEdit(row)}
                        sx={{ textTransform: "none", minWidth: 0, px: 1.25 }}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {importError && (
          <Typography sx={{ fontSize: 12.5, color: "#b91c1c", mt: 1.5 }}>{importError}</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #d6d9de" }}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!allClean || importing}
          onClick={handleImport}
          startIcon={importing ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{
            backgroundColor: "#0d1b2a",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
            borderRadius: 0,
            "&:hover": { backgroundColor: "#1a3a5c" },
          }}
        >
          Import Portfolio
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ReviewUploadIssuesModal.propTypes = {
  open: PropTypes.bool.isRequired,
  workspace: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
  validation: PropTypes.shape({
    rows: PropTypes.array.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onImported: PropTypes.func.isRequired,
};
