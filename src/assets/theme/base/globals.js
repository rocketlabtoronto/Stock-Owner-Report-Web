import colors from "assets/theme/base/colors";

const { info, dark, background } = colors;

const globals = {
  html: {
    scrollBehavior: "smooth",
  },
  body: {
    backgroundColor: background.default,
    color: dark.main,
  },
  "*, *::before, *::after": {
    margin: 0,
    padding: 0,
  },
  "a, a:link, a:visited": {
    textDecoration: "none !important",
  },
  "a.link, .link, a.link:link, .link:link, a.link:visited, .link:visited": {
    color: `${dark.main} !important`,
    transition: "color 150ms ease-in !important",
  },
  "a.link:hover, .link:hover, a.link:focus, .link:focus": {
    color: `${info.main} !important`,
  },
  ".ag-theme-alpine, .ag-theme-alpine .ag-root-wrapper": {
    fontFamily: '"Poppins", "Helvetica", "Arial", sans-serif',
  },
  ".ag-theme-alpine": {
    "--ag-font-family": '"Poppins", "Helvetica", "Arial", sans-serif',
    "--ag-header-background-color": "#f8fafc",
    "--ag-header-foreground-color": "#1f2937",
    "--ag-header-column-separator-color": "#e2e8f0",
    "--ag-row-hover-color": "rgba(45, 108, 223, 0.08)",
    "--ag-border-color": "#e2e8f0",
    "--ag-odd-row-background-color": "#ffffff",
    "--ag-row-border-color": "#eef2f7",
    "--ag-cell-horizontal-padding": "16px",
    "--ag-header-height": "48px",
    "--ag-row-height": "44px",
    "--ag-font-size": "14px",
    "--ag-header-font-weight": "600",
  },
  ".ag-theme-alpine .ag-root-wrapper": {
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
  },
  hr: {
    borderBottom: 0,
    borderLeft: 0,
    borderRight: 0,
  },
};

export default globals;
