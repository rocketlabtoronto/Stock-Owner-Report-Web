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
import "ag-grid-community/styles/ag-theme-alpine.css";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

const agGridOverrides = {
  "& .ag-header-cell-text": { fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#374151" },
  "& .ag-header-cell": { paddingLeft: "12px", paddingRight: "12px" },
  "& .ag-cell": { paddingLeft: "12px", paddingRight: "12px", fontSize: 12.5 },
  "& .ag-row": { borderColor: "#f0f2f5" },
  "& .ag-header": { borderBottom: "2px solid #0d1b2a", background: "#f8f9fb" },
  "& .ag-pinned-bottom-floating-bottom": { borderTop: "2px solid #0d1b2a" },
};

const emptyList = [];
const preferredOrder = [
  "Company",
  "Shares Owned",
  "Ownership Share",
  "Assets",
  "Cash & Equivalents",
  "Liabilities",
  "Equity",
];
// Columns that describe the holding rather than a prorated dollar amount: not totaled or sorted.
const holdingColumns = new Set(["Company", "Shares Owned", "Ownership Share"]);
const minWidthByColumn = { Company: 220, "Shares Owned": 130, "Ownership Share": 220 };

function parseMoney(str) {
  // Parses strings like "$1,234" to 1234 (number)
  if (typeof str !== "string") return 0;
  const num = Number(str.replace(/[^\d.-]+/g, ""));
  return isNaN(num) ? 0 : num;
}

// Edit/Save/Cancel state lives in ProRataTable. The grid renders cells inside this React
// tree, so the cell renderers read that state live through context.
const EditStateContext = createContext(null);

// Shares Owned is displayed as a whole number; editing it works on the exact saved quantity.
function SharesOwnedCellRenderer(params) {
  const edit = useContext(EditStateContext);
  const holding = params.data?.__holding;
  if (!holding?.id || edit?.editingHoldingId !== holding.id) {
    return <span>{params.value}</span>;
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

function ActionsCellRenderer(params) {
  const edit = useContext(EditStateContext);
  const holding = params.data?.__holding;
  if (!edit || !holding?.id || holding.source !== "excel_upload") return null;
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

function ProRataTable({ loading, data, paywall, editable, onSaveQuantity }) {
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

  // Sort columns according to preferred order, then any others
  const orderedColumns = useMemo(
    () => [
      ...preferredOrder.map((name) => columns.find((col) => col.name === name)).filter(Boolean),
      ...columns.filter((col) => !preferredOrder.includes(col.name)),
    ],
    [columns]
  );

  const moneyColumnNames = useMemo(
    () => orderedColumns
      .filter(
        (col) =>
          !holdingColumns.has(col.name) &&
          rows.some((row) => typeof row[col.name] === "string" && row[col.name].startsWith("$"))
      )
      .map((col) => col.name),
    [orderedColumns, rows]
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
      tooltipValueGetter: (params) => (params.value == null ? "" : String(params.value)),
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
    [orderedColumns, moneyColumnNames]
  );

  // An Upload Portfolio report adds only the row's Edit action, which turns that row's Shares
  // Owned cell into an input. Account, institution, and exchange stay row metadata.
  const allColumnDefs = useMemo(() => {
    if (!editable) return columnDefs;
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
  }, [columnDefs, editable]);

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

  // Total the prorated dollar columns; the holding columns have no meaningful sum.
  const totalRow = useMemo(() => {
    const row = {};
    columns.forEach((col) => {
      if (holdingColumns.has(col.name)) {
        row[col.name] = col.name === "Company" ? "Total" : "";
      } else {
        row[col.name] = rows.reduce((sum, item) => sum + parseMoney(item[col.name]), 0);
        const hasMoney = rows.some(
          (item) => typeof item[col.name] === "string" && item[col.name].startsWith("$")
        );
        if (hasMoney) {
          row[col.name] =
            "$" + row[col.name].toLocaleString("en-US", { maximumFractionDigits: 0 });
        }
      }
    });
    return row;
  }, [columns, rows]);

  const pinnedBottomRowData = useMemo(() => [totalRow], [totalRow]);

  const shouldApplyPaywall = Boolean(paywall?.enabled);

  if (loading) return <p>Loading...</p>;
  if (!hasValidData) return <p>No financial data available.</p>;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, height: 0, minHeight: 0, width: "100%", ...agGridOverrides }}>
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

      {editError && (
        <Typography variant="caption" sx={{ color: "#b91c1c", mb: 1, flexShrink: 0 }}>
          {editError}
        </Typography>
      )}

      <div
        className="ag-theme-alpine"
        style={{ flex: 1, minHeight: 0, width: "100%", height: "100%" }}
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
};

ProRataTable.defaultProps = {
  editable: false,
  onSaveQuantity: () => Promise.resolve(),
};

export default ProRataTable;
