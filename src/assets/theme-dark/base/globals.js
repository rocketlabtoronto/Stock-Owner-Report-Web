// Custom Dashboard 2 MUI Base Styles
import colors from "assets/theme-dark/base/colors";

const { dark, background } = colors;
const gsFontFamily = '"Inter", "Helvetica Neue", "Arial", sans-serif';
const gsDocFontFamily = '"Source Serif 4", "Baskerville", "Georgia", "Times New Roman", serif';

const globals = {
  html: {
    scrollBehavior: "smooth",
    "--gs-font-ui": gsFontFamily,
    "--gs-font-doc": gsDocFontFamily,
    "--gs-navy": "#0d1b2a",
    "--gs-gold": "#c8a96e",
    "--gs-border": "#2c3f54",
    "--gs-bg": "#0d1b2a",
  },
  body: {
    backgroundColor: background.default,
    color: dark.main,
    fontFamily: gsFontFamily,
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
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
    color: "#c8a96e !important",
  },
  // AG Grid — Goldman Sachs dark data-table styling
  ".ag-theme-alpine, .ag-theme-alpine .ag-root-wrapper": {
    fontFamily: gsFontFamily,
  },
  ".ag-theme-alpine": {
    "--ag-font-family": gsFontFamily,
    "--ag-background-color": "#0d1b2a",
    "--ag-header-background-color": "#08111a",
    "--ag-header-foreground-color": "#e8edf2",
    "--ag-header-column-separator-color": "#2c3f54",
    "--ag-row-hover-color": "rgba(200, 169, 110, 0.08)",
    "--ag-border-color": "#2c3f54",
    "--ag-odd-row-background-color": "#0d1b2a",
    "--ag-data-color": "#e8edf2",
    "--ag-row-border-color": "#1e2d3d",
    "--ag-cell-horizontal-padding": "16px",
    "--ag-header-height": "48px",
    "--ag-row-height": "44px",
    "--ag-font-size": "14px",
    "--ag-header-font-weight": "600",
    "--ag-selected-row-background-color": "rgba(200, 169, 110, 0.12)",
  },
  ".ag-theme-alpine .ag-root-wrapper": {
    borderRadius: "0",
    border: "1px solid #2c3f54",
    borderTop: "2px solid #c8a96e",
    boxShadow: "none",
    overflow: "hidden",
  },
  ".ag-theme-alpine .ag-root-wrapper, .ag-theme-alpine .ag-root, .ag-theme-alpine .ag-root-wrapper-body": {
    height: "100%",
  },
  ".ag-theme-alpine .ag-header": {
    borderBottom: "1px solid #2c3f54",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontSize: "12px",
  },
  hr: {
    borderBottom: 0,
    borderLeft: 0,
    borderRight: 0,
    borderTop: "1px solid #2c3f54",
  },
};

export default globals;
