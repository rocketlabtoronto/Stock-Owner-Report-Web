import React, { useCallback, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { AgGridReact } from "ag-grid-react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
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

function parseMoney(str) {
  // Parses strings like "$1,234" to 1234 (number)
  if (typeof str !== "string") return 0;
  const num = Number(str.replace(/[^\d.-]+/g, ""));
  return isNaN(num) ? 0 : num;
}

function ProRataTable({ loading, data, height = 400, paywall }) {
  const gridApiRef = useRef(null);
  const columnApiRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
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
  // Format Ownership Share values: replace M/K, round to integer, add units
  function formatOwnershipShare(value) {
    if (typeof value !== "string") return value;
    // Match patterns like '1 in 91.40M' or '1 in 30.90K'
    const match = value.match(/(\d+) in ([\d,.]+)([MK])/i);
    if (match) {
      const prefix = match[1];
      let num = parseFloat(match[2].replace(/,/g, ""));
      const unit = match[3].toUpperCase();
      if (unit === "M") num = Math.round(num);
      if (unit === "K") num = Math.round(num);
      let unitText = unit === "M" ? " million" : unit === "K" ? " thousand" : "";
      return `~ ${prefix} in ${num.toLocaleString()}${unitText}`;
    }
    return value;
  }
  const columns = Array.isArray(data?.columns) ? data.columns : [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const hasValidData = columns.length > 0 && Array.isArray(data?.rows);

  // Define the preferred column order
  const preferredOrder = [
    "Company",
    "Ownership Share",
    "Assets",
    "Cash & Equivalents",
    "Liabilities",
    "Equity",
  ];

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
          col.name !== "Company" &&
          col.name !== "Ownership Share" &&
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
      sortable: col.name !== "Company" && col.name !== "Ownership Share",
      filter: false,
      resizable: true,
      minWidth:
        col.name === "Company" ? 220 : col.name === "Ownership Share" ? 200 : 140,
      lockPosition: col.name === "Company" || col.name === "Ownership Share",
      suppressMovable: col.name === "Company" || col.name === "Ownership Share",
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

  // Calculate totals for all numeric columns except Company and Ownership Share
  const totalRow = useMemo(() => {
    const row = {};
    columns.forEach((col) => {
      if (col.name === "Company" || col.name === "Ownership Share") {
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

  // Map rows to format Ownership Share
  const rowData = useMemo(
    () => rows.map((row) => {
      if (row["Ownership Share"]) {
        return {
          ...row,
          ["Ownership Share"]: formatOwnershipShare(row["Ownership Share"]),
        };
      }
      return row;
    }),
    [rows]
  );
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

      <div
        className="ag-theme-alpine"
        style={{ flex: 1, minHeight: 0, width: "100%", height: "100%" }}
      >
        <AgGridReact
          domLayout="normal"
          rowData={rowData}
          columnDefs={columnDefs}
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
      </div>
    </Box>
  );
}

ProRataTable.propTypes = {
  loading: PropTypes.bool.isRequired,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
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
};

export default ProRataTable;
