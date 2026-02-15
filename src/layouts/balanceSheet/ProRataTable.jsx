import React, { useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

function parseMoney(str) {
  // Parses strings like "$1,234" to 1234 (number)
  if (typeof str !== "string") return 0;
  const num = Number(str.replace(/[^\d.-]+/g, ""));
  return isNaN(num) ? 0 : num;
}

function ProRataTable({ loading, data, height = 400 }) {
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
  if (loading) return <p>Loading...</p>;
  if (!data || !data.columns || !Array.isArray(data.rows))
    return <p>No financial data available.</p>;

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
  const orderedColumns = [
    ...preferredOrder.map((name) => data.columns.find((col) => col.name === name)).filter(Boolean),
    ...data.columns.filter((col) => !preferredOrder.includes(col.name)),
  ];

  const moneyColumnNames = orderedColumns
    .filter(
      (col) =>
        col.name !== "Company" &&
        col.name !== "Ownership Share" &&
        data.rows.some((row) => typeof row[col.name] === "string" && row[col.name].startsWith("$"))
    )
    .map((col) => col.name);

  const columnDefs = orderedColumns.map((col) => ({
    headerName: col.name,
    field: col.name,
    headerTooltip: col.name,
    sortable: col.name !== "Company" && col.name !== "Ownership Share", // lock first two columns
    filter: false,
    resizable: true,
    minWidth:
      col.name === "Company" ? 220 : col.name === "Ownership Share" ? 200 : 140,
    lockPosition: col.name === "Company" || col.name === "Ownership Share", // lock first two columns
    suppressMovable: col.name === "Company" || col.name === "Ownership Share", // prevent moving
    suppressMenu: true,
    tooltipValueGetter: (params) => (params.value == null ? "" : String(params.value)),
    cellStyle: (params) => {
      if (params.node.rowPinned) {
        return {
          background: "#fff9c4",
          fontWeight: "bold",
          textAlign: moneyColumnNames.includes(col.name) ? "right" : undefined,
          fontSize: 12,
        };
      }
      if (moneyColumnNames.includes(col.name)) {
        return { textAlign: "right", fontSize: 12 };
      }
      return { fontSize: 12 };
    },
  }));

  // Calculate totals for all numeric columns except Company and Ownership Share
  const totalRow = {};
  data.columns.forEach((col) => {
    if (col.name === "Company" || col.name === "Ownership Share") {
      totalRow[col.name] = col.name === "Company" ? "Total" : "";
    } else {
      totalRow[col.name] = data.rows.reduce((sum, row) => sum + parseMoney(row[col.name]), 0);
      // Format as money if at least one row is formatted as money
      const hasMoney = data.rows.some(
        (row) => typeof row[col.name] === "string" && row[col.name].startsWith("$")
      );
      if (hasMoney) {
        totalRow[col.name] =
          "$" + totalRow[col.name].toLocaleString("en-US", { maximumFractionDigits: 0 });
      }
    }
  });

  // Map rows to format Ownership Share
  const rowData = data.rows.map((row) => {
    if (row["Ownership Share"]) {
      return {
        ...row,
        ["Ownership Share"]: formatOwnershipShare(row["Ownership Share"]),
      };
    }
    return row;
  });

  return (
    <div className="ag-theme-alpine" style={{ height, width: "100%" }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        pagination={false}
        pinnedBottomRowData={[totalRow]}
        rowHeight={32}
        tooltipShowDelay={200}
        tooltipHideDelay={2000}
        enableBrowserTooltips
        onGridReady={(params) => {
          gridApiRef.current = params.api;
          columnApiRef.current = params.columnApi;
          autoSizeAllColumns();
          sizeColumnsToFit();
        }}
        onFirstDataRendered={autoSizeAllColumns}
        onGridSizeChanged={scheduleResize}
        headerHeight={32}
        defaultColDef={{
          wrapHeaderText: false,
          autoHeaderHeight: false,
          suppressMenu: true,
          cellStyle: { fontSize: 12 },
        }}
      />
    </div>
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
};

export default ProRataTable;
