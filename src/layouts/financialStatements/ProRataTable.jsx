import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";
import { AgGridReact } from "ag-grid-react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import CloudOffOutlined from "@mui/icons-material/CloudOffOutlined";
import InsertChartOutlined from "@mui/icons-material/InsertChartOutlined";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import ReportEmptyState from "./ReportEmptyState";
import {
  HOLDING_COLUMNS,
  UNAVAILABLE,
  buildTotalRows,
  describeReportCurrencies,
  describeUnavailableHoldings,
  isMoneyColumn,
  isUnavailableRow,
} from "utils/reportCurrency";
ModuleRegistry.registerModules([AllCommunityModule]);

const agGridOverrides = {
  "& .ag-header-cell-text": { fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#374151" },
  "& .ag-header-cell": { paddingLeft: "12px", paddingRight: "12px" },
  "& .ag-cell": { paddingLeft: "12px", paddingRight: "12px", fontSize: 12.5 },
  "& .ag-row": { borderColor: "#f0f2f5" },
  "& .ag-header": { borderBottom: "2px solid #0d1b2a", background: "#f8f9fb" },
  "& .ag-pinned-bottom-floating-bottom": { borderTop: "2px solid #0d1b2a" },
  // A holding with no figures recedes, and a missing figure is a quiet dash instead of "N/A".
  "& .sor-row-unavailable .ag-cell": { background: "#fafbfc", color: "#6b7280" },
  "& .ag-cell.sor-unavailable": { color: "#a3abb8" },
};

// Shown in place of the model's "N/A"; the tooltip says what is missing.
const DASH = "—";
const NO_STATEMENTS_TOOLTIP =
  "No company figures are available for this holding. This is expected for ETFs and other funds.";
const LOAD_FAILED_TOOLTIP = "Figures for this holding could not be loaded just now.";
// When no holding in the account has figures, the table lists the holdings and nothing else.
const HOLDINGS_ONLY_COLUMNS = new Set(["Company", "Shares Owned"]);

// Why a bank's row has no figure in these columns; shown in a bubble over the dash.
const BANK_EXPLANATIONS = {
  "Gross Profit": {
    title: "Banks do not report gross profit",
    body: "A bank's main cost is the interest it pays on deposits and borrowings. That is already deducted within its revenue, so there is no separate cost of sales to subtract.",
  },
  "Operating Profit": {
    title: "Banks do not report operating profit",
    body: "Operating profit is profit before interest costs. For a bank, interest is the business, so its income statement goes from revenue straight to pre-tax income.",
  },
};
const bankExplanationFor = (columnName, row, value) =>
  row?.__bank && value === UNAVAILABLE ? BANK_EXPLANATIONS[columnName] : undefined;

const emptyList = [];
const preferredOrder = [
  ...HOLDING_COLUMNS,
  "Assets",
  "Cash & Equivalents",
  "Liabilities",
  "Equity",
];
// Columns that describe the holding rather than a prorated amount: not totaled or sorted.
const holdingColumns = new Set(HOLDING_COLUMNS);
const minWidthByColumn = {
  Company: 250,
  "Shares Owned": 130,
  "Ownership Share": 220,
  Currency: 105,
  "Cash & Equivalents": 175,
};

// Edit/Save/Cancel state lives in ProRataTable. The grid renders cells inside this React
// tree, so the cell renderers read that state live through context.
const EditStateContext = createContext(null);

// A holding with no figures keeps its name and gets a tag saying why its row is empty.
function CompanyCellRenderer(params) {
  const tag = params.node?.rowPinned ? "" : params.tagFor?.(params.data);
  if (!tag) return <span>{params.value}</span>;
  return (
    <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {params.value}
      </Box>
      <Box
        component="span"
        sx={{
          flexShrink: 0,
          px: 0.75,
          borderRadius: "9px",
          background: "#e8ebef",
          color: "#4b5563",
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: "18px",
          whiteSpace: "nowrap",
        }}
      >
        {tag}
      </Box>
    </Box>
  );
}

// A bank's missing Gross Profit or Operating Profit carries a bubble explaining the dash.
function ExplainedAmountCellRenderer(params) {
  const text = params.valueFormatted ?? params.value;
  const explanation = params.node?.rowPinned
    ? undefined
    : bankExplanationFor(params.colDef?.field, params.data, params.value);
  if (!explanation) return <span>{text}</span>;
  return (
    <Tooltip
      arrow
      placement="top"
      enterDelay={100}
      title={
        <Box sx={{ p: 0.5 }}>
          <Box sx={{ fontWeight: 700, mb: 0.5 }}>{explanation.title}</Box>
          <Box>{explanation.body}</Box>
        </Box>
      }
      componentsProps={{
        tooltip: {
          sx: { maxWidth: 300, fontSize: 12, lineHeight: 1.5, textAlign: "left", bgcolor: "#0d1b2a" },
        },
        arrow: { sx: { color: "#0d1b2a" } },
      }}
    >
      <Box
        component="span"
        tabIndex={0}
        aria-label={`${explanation.title}. ${explanation.body}`}
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, cursor: "help" }}
      >
        {text}
        <InfoOutlined sx={{ fontSize: 14 }} />
      </Box>
    </Tooltip>
  );
}

// Shares Owned is displayed as a whole number; editing it works on the exact saved quantity.
function SharesOwnedCellRenderer(params) {
  const edit = useContext(EditStateContext);
  const holding = params.data?.__holding;
  if (!holding?.id || edit?.editingHoldingId !== holding.id) {
    return <span>{params.valueFormatted ?? params.value}</span>;
  }
  return (
    <input
      type="number"
      step="any"
      min="0"
      aria-label="Number of Shares"
      defaultValue={holding.quantity}
      disabled={edit.savingHoldingId === holding.id}
      onChange={(event) => edit.setDraftQuantity(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") edit.onSave(holding.id);
        if (event.key === "Escape") edit.onCancel();
      }}
      style={{ width: "85%", fontSize: 12.5 }}
      autoFocus
    />
  );
}

// Only holdings imported from an Excel upload can be edited; brokerage-supplied ones are read-only.
const isEditableHolding = (holding) => Boolean(holding?.id) && holding.source === "excel_upload";

function ActionsCellRenderer(params) {
  const edit = useContext(EditStateContext);
  const holding = params.data?.__holding;
  if (!edit || !isEditableHolding(holding)) return null;
  const isEditing = edit.editingHoldingId === holding.id;
  const isSaving = edit.savingHoldingId === holding.id;
  if (isEditing) {
    return (
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Button
          size="small"
          variant="contained"
          disabled={isSaving}
          onClick={() => edit.onSave(holding.id)}
          sx={{ textTransform: "none", minWidth: 0, px: 1 }}
        >
          {isSaving ? <CircularProgress size={12} color="inherit" /> : "Save"}
        </Button>
        <Button
          size="small"
          disabled={isSaving}
          onClick={edit.onCancel}
          sx={{ textTransform: "none", minWidth: 0, px: 1 }}
        >
          Cancel
        </Button>
      </Box>
    );
  }
  return (
    <Button
      size="small"
      onClick={() => edit.onEdit(holding.id, holding.quantity)}
      sx={{ textTransform: "none", minWidth: 0, px: 1 }}
    >
      Edit
    </Button>
  );
}

function ProRataTable({ loading, data, paywall, editable, onSaveQuantity, onRetry }) {
  const gridApiRef = useRef(null);
  const columnApiRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const [editingHoldingId, setEditingHoldingId] = useState(null);
  const [savingHoldingId, setSavingHoldingId] = useState(null);
  const [draftQuantity, setDraftQuantity] = useState("");
  const [editError, setEditError] = useState("");
  const autoSizeAllColumns = useCallback(() => {
    if (!columnApiRef.current) return;
    const allColumns = columnApiRef.current.getAllColumns() || [];
    if (!allColumns.length) return;
    columnApiRef.current.autoSizeColumns(
      allColumns.map((column) => column.getId()),
      false
    );
  }, []);
  const sizeColumnsToFit = useCallback(() => {
    if (!gridApiRef.current) return;
    gridApiRef.current.sizeColumnsToFit();
  }, []);
  const scheduleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(() => {
      sizeColumnsToFit();
    }, 120);
  }, [sizeColumnsToFit]);
  useEffect(() => {
    const handleResize = () => scheduleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [scheduleResize]);
  const columns = Array.isArray(data?.columns) ? data.columns : emptyList;
  const rows = Array.isArray(data?.rows) ? data.rows : emptyList;
  const hasValidData = columns.length > 0 && Array.isArray(data?.rows);

  // Holdings with no figure in any money column (funds, or companies the data sources lack).
  const unavailableRows = useMemo(
    () => new Set(rows.filter((row) => isUnavailableRow(columns, row))),
    [columns, rows]
  );
  // No holding in the account has figures: show an explanation and just list the holdings.
  const holdingsOnly = rows.length > 0 && unavailableRows.size === rows.length;
  const loadFailed = holdingsOnly && rows.some((row) => row.__loadFailed);

  // Sort columns according to preferred order, then any others
  const orderedColumns = useMemo(() => {
    const shown = holdingsOnly
      ? columns.filter((col) => HOLDINGS_ONLY_COLUMNS.has(col.name))
      : columns;
    return [
      ...preferredOrder.map((name) => shown.find((col) => col.name === name)).filter(Boolean),
      ...shown.filter((col) => !preferredOrder.includes(col.name)),
    ];
  }, [columns, holdingsOnly]);

  const moneyColumnNames = useMemo(
    () => orderedColumns.filter(isMoneyColumn).map((col) => col.name),
    [orderedColumns]
  );

  const columnDefs = useMemo(
    () => orderedColumns.map((col) => ({
      headerName: col.name,
      field: col.name,
      headerTooltip: col.name,
      sortable: !holdingColumns.has(col.name),
      filter: false,
      resizable: true,
      minWidth: minWidthByColumn[col.name] || 140,
      lockPosition: holdingColumns.has(col.name),
      suppressMovable: holdingColumns.has(col.name),
      suppressMenu: true,
      ...(col.name === "Company"
        ? {
            cellRenderer: CompanyCellRenderer,
            cellRendererParams: {
              tagFor: (row) => {
                if (row?.__loadFailed) return "Couldn't load";
                // The panel above a holdings-only table already explains every row.
                return !holdingsOnly && unavailableRows.has(row) ? "No statements" : "";
              },
            },
          }
        : {}),
      ...(BANK_EXPLANATIONS[col.name] ? { cellRenderer: ExplainedAmountCellRenderer } : {}),
      valueFormatter: (params) => (params.value === UNAVAILABLE ? DASH : params.value ?? ""),
      cellClassRules: { "sor-unavailable": (params) => params.value === UNAVAILABLE },
      tooltipValueGetter: (params) => {
        if (params.value == null) return "";
        if (params.node?.rowPinned) {
          return params.value === UNAVAILABLE ? "No amounts to total" : String(params.value);
        }
        // The bubble explains this cell; a second, native tooltip would repeat it.
        if (bankExplanationFor(col.name, params.data, params.value)) return "";
        if (params.data?.__loadFailed) return LOAD_FAILED_TOOLTIP;
        if (holdingsOnly) return String(params.value);
        if (unavailableRows.has(params.data)) return NO_STATEMENTS_TOOLTIP;
        return params.value === UNAVAILABLE
          ? "Not available for this company"
          : String(params.value);
      },
      cellStyle: (params) => {
        if (params.node.rowPinned) {
          return {
            background: "#fff9c4",
            fontWeight: "bold",
            textAlign: moneyColumnNames.includes(col.name) ? "right" : undefined,
            fontSize: 12.5,
          };
        }
        if (moneyColumnNames.includes(col.name)) {
          return { textAlign: "right", fontSize: 12.5 };
        }
        return { fontSize: 12.5 };
      },
    })),
    [orderedColumns, moneyColumnNames, unavailableRows, holdingsOnly]
  );

  const rowClassRules = useMemo(
    () => ({
      "sor-row-unavailable": (params) =>
        !holdingsOnly && !params.node?.rowPinned && unavailableRows.has(params.data),
    }),
    [unavailableRows, holdingsOnly]
  );

  // An Upload Portfolio report adds only the row's Edit action, which turns that row's Shares
  // Owned cell into an input. Account, institution, and exchange stay row metadata. An account
  // that came from a brokerage connection has nothing to edit, so it gets no Actions column.
  const hasEditableRows = editable && rows.some((row) => isEditableHolding(row.__holding));
  const allColumnDefs = useMemo(() => {
    if (!hasEditableRows) return columnDefs;
    const pinnedAwareStyle = (params) =>
      params.node.rowPinned
        ? { background: "#fff9c4", fontWeight: "bold", fontSize: 12.5 }
        : { fontSize: 12.5 };
    return [
      ...columnDefs.map((colDef) =>
        colDef.field === "Shares Owned"
          ? {
              ...colDef,
              cellRenderer: SharesOwnedCellRenderer,
              // Keep typing and arrow keys inside the quantity input while a row is edited.
              suppressKeyboardEvent: (params) => params.event?.target?.tagName === "INPUT",
            }
          : colDef
      ),
      {
        headerName: "Actions",
        colId: "actions",
        cellRenderer: ActionsCellRenderer,
        // Pinned so Edit/Save/Cancel stay in view when the table scrolls sideways.
        pinned: "right",
        width: 150,
        minWidth: 150,
        resizable: false,
        suppressMovable: true,
        sortable: false,
        filter: false,
        suppressMenu: true,
        cellStyle: pinnedAwareStyle,
      },
    ];
  }, [columnDefs, hasEditableRows]);

  const editState = useMemo(
    () => ({
      editingHoldingId,
      savingHoldingId,
      setDraftQuantity,
      onEdit: (holdingId, quantity) => {
        setEditError("");
        setEditingHoldingId(holdingId);
        setDraftQuantity(String(quantity ?? ""));
      },
      onCancel: () => {
        setEditError("");
        setEditingHoldingId(null);
      },
      onSave: async (holdingId) => {
        setSavingHoldingId(holdingId);
        setEditError("");
        try {
          await onSaveQuantity(holdingId, draftQuantity);
          setEditingHoldingId(null);
        } catch (error) {
          setEditError(error?.message || "Could not save the new quantity.");
        } finally {
          setSavingHoldingId(null);
        }
      },
    }),
    [editingHoldingId, savingHoldingId, draftQuantity, onSaveQuantity]
  );

  // A pending edit belongs to the rows it was started on; drop it when the report changes.
  useEffect(() => {
    setEditingHoldingId(null);
  }, [rows]);

  // One total row per currency, so Canadian and U.S. dollar amounts are never added together.
  const pinnedBottomRowData = useMemo(() => {
    if (holdingsOnly) return emptyList;
    const totals = buildTotalRows(columns, rows);
    if (totals.length) return totals;
    // Nothing to add up: keep the Total row, with a dash under each amount column.
    return [
      Object.fromEntries(
        columns.map((column) => {
          if (column.name === "Company") return [column.name, "Total"];
          return [column.name, isMoneyColumn(column) ? UNAVAILABLE : ""];
        })
      ),
    ];
  }, [columns, rows, holdingsOnly]);

  const unavailableNote = useMemo(
    () => (holdingsOnly ? "" : describeUnavailableHoldings(columns, rows)),
    [columns, rows, holdingsOnly]
  );

  const currencyNote = useMemo(() => {
    const note = describeReportCurrencies(rows);
    const tsxRows = rows.filter(
      (row) => String(row.__holding?.exchange || "").toUpperCase() === "TSX"
    );
    const tsxWithData = tsxRows.filter((row) => row.Currency && row.Currency !== UNAVAILABLE);
    return [
      note,
      tsxWithData.some((row) => row.Currency !== "CAD")
        ? "A TSX company that reports in another currency is shown in that currency."
        : "",
      tsxWithData.length ? "TSX company data: Atlantis Data Solutions." : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [rows]);

  const shouldApplyPaywall = Boolean(paywall?.enabled);

  if (loading) {
    return (
      <Box
        role="status"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
        }}
      >
        <CircularProgress size={26} thickness={4} sx={{ color: "#0d1b2a" }} />
        <Typography sx={{ fontSize: 13, color: "#6b7280" }}>Loading report…</Typography>
      </Box>
    );
  }

  if (!hasValidData || rows.length === 0) {
    return (
      <ReportEmptyState
        icon={AccountBalanceWalletOutlined}
        title="No holdings to report yet"
        description="Connect a brokerage or upload a portfolio, and this report will show your share of each company's figures."
        action={
          <Button
            variant="contained"
            component="a"
            href="/brokeragesAndAccounts"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Add your portfolio
          </Button>
        }
      />
    );
  }

  const oneHolding = rows.length === 1;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: 0,
        minHeight: 0,
        width: "100%",
        overflowY: holdingsOnly ? "auto" : undefined,
        ...agGridOverrides,
      }}
    >
      {shouldApplyPaywall && (
        <Box
          sx={{
            mb: 1.5,
            p: 1.5,
            borderRadius: 0,
            backgroundColor: "#eaecef",
            border: "1px solid #d6d9de",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Want to see all equity holdings? Register for full access or log in to your account.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
            <Button
              variant="outlined"
              component="a"
              href="/login"
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Log In
            </Button>
            <Button
              variant="contained"
              component="a"
              href={paywall?.registerPath || "/billing"}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Get Started
            </Button>
          </Box>
        </Box>
      )}

      {unavailableNote && (
        <Box
          data-testid="unavailable-note"
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            mb: 1,
            px: 1.5,
            py: 1,
            background: "#f4f6f9",
            borderLeft: "3px solid #8b97a8",
            flexShrink: 0,
          }}
        >
          <InfoOutlined sx={{ fontSize: 16, color: "#5b6676", mt: "1px" }} />
          <Typography sx={{ fontSize: 12.5, color: "#374151", lineHeight: 1.45 }}>
            {unavailableNote}
          </Typography>
        </Box>
      )}

      {holdingsOnly && !loadFailed && (
        <ReportEmptyState
          compact
          icon={InsertChartOutlined}
          title="No company financials for this account"
          description={`This report prorates company financial statements by the shares you own. ${
            oneHolding
              ? "The holding in this account is a fund, such as an ETF, or a security"
              : "The holdings in this account are funds, such as ETFs, or securities"
          } our data sources do not cover, so there are no company statements to show.`}
        />
      )}

      {loadFailed && (
        <ReportEmptyState
          compact
          icon={CloudOffOutlined}
          title="Company figures could not be loaded"
          description="We could not reach our company data source just now. Your holdings are safe and are listed below. Please try again in a moment."
          action={
            onRetry && (
              <Button
                variant="contained"
                onClick={onRetry}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Try again
              </Button>
            )
          }
        />
      )}

      {holdingsOnly && (
        <Typography
          sx={{
            mb: 1,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#6b7280",
            flexShrink: 0,
          }}
        >
          {oneHolding ? "Holding in this account" : "Holdings in this account"}
        </Typography>
      )}

      {editError && (
        <Typography variant="caption" sx={{ color: "#b91c1c", mb: 1, flexShrink: 0 }}>
          {editError}
        </Typography>
      )}

      <div
        className="ag-theme-alpine"
        style={
          holdingsOnly
            ? {
                // A short list sized to its rows. On a short window it keeps a few rows visible
                // and the area scrolls, instead of the list being squeezed to nothing.
                flex: "0 1 auto",
                minHeight: Math.min(36 + rows.length * 34 + 4, 176),
                width: "100%",
                maxWidth: 640,
                height: 36 + rows.length * 34 + 4,
              }
            : { flex: 1, minHeight: 0, width: "100%", height: "100%" }
        }
      >
        <EditStateContext.Provider value={editState}>
        <AgGridReact
          domLayout="normal"
          rowData={rows}
          columnDefs={allColumnDefs}
          pagination={false}
          pinnedBottomRowData={pinnedBottomRowData}
          rowHeight={34}
          tooltipShowDelay={200}
          tooltipHideDelay={2000}
          enableBrowserTooltips
          rowClassRules={rowClassRules}
          getRowStyle={(params) => {
            if (params?.node?.rowPinned) return null;
            if (shouldApplyPaywall && (params?.node?.rowIndex ?? -1) >= 5) {
              return {
                filter: "blur(6px)",
                userSelect: "none",
              };
            }
            return null;
          }}
          onGridReady={(params) => {
            gridApiRef.current = params.api;
            columnApiRef.current = params.columnApi;
            autoSizeAllColumns();
            sizeColumnsToFit();
          }}
          onFirstDataRendered={autoSizeAllColumns}
          onGridSizeChanged={scheduleResize}
          headerHeight={36}
          defaultColDef={{
            wrapHeaderText: false,
            autoHeaderHeight: false,
            suppressMenu: true,
            cellStyle: { fontSize: 12.5 },
          }}
        />
        </EditStateContext.Provider>
      </div>

      {currencyNote && (
        <Typography
          data-testid="currency-note"
          sx={{ mt: 0.75, fontSize: 10, lineHeight: 1.4, color: "#6b7280", flexShrink: 0 }}
        >
          {currencyNote}
        </Typography>
      )}
    </Box>
  );
}

ProRataTable.propTypes = {
  loading: PropTypes.bool.isRequired,
  data: PropTypes.shape({
    columns: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        align: PropTypes.string,
      })
    ),
    rows: PropTypes.arrayOf(PropTypes.object),
  }),
  paywall: PropTypes.shape({
    enabled: PropTypes.bool,
    registerPath: PropTypes.string,
  }),
  editable: PropTypes.bool,
  onSaveQuantity: PropTypes.func,
  onRetry: PropTypes.func,
};

ProRataTable.defaultProps = {
  editable: false,
  onSaveQuantity: () => Promise.resolve(),
};

export default ProRataTable;
