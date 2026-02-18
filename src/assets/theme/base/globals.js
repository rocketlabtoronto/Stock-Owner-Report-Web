import colors from "assets/theme/base/colors";

const { dark, background } = colors;
// GS UI font: clean sans-serif. Serif kept as CSS var for document/report pages.
const gsFontFamily = '"Inter", "Helvetica Neue", "Arial", sans-serif';
const gsDocFontFamily = '"Source Serif 4", "Baskerville", "Georgia", "Times New Roman", serif';

const globals = {
  html: {
    scrollBehavior: "smooth",
    "--gs-font-ui": gsFontFamily,
    "--gs-font-doc": gsDocFontFamily,
    "--gs-navy": "#0d1b2a",
    "--gs-navy-mid": "#1a3a5c",
    "--gs-border": "#d6d9de",
    "--gs-bg": "#f7f7f5",
    "--gs-gold": "#c8a96e",
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
    color: "#1a3a5c !important",
  },
  // AG Grid — Goldman Sachs data-table styling
  ".ag-theme-alpine, .ag-theme-alpine .ag-root-wrapper": {
    fontFamily: gsFontFamily,
  },
  ".ag-theme-alpine": {
    "--ag-font-family": gsFontFamily,
    "--ag-header-background-color": "#f7f7f5",
    "--ag-header-foreground-color": "#0d1b2a",
    "--ag-header-column-separator-color": "#d6d9de",
    "--ag-row-hover-color": "rgba(13, 27, 42, 0.04)",
    "--ag-border-color": "#d6d9de",
    "--ag-odd-row-background-color": "#ffffff",
    "--ag-row-border-color": "#eaecef",
    "--ag-cell-horizontal-padding": "16px",
    "--ag-header-height": "48px",
    "--ag-row-height": "44px",
    "--ag-font-size": "14px",
    "--ag-header-font-weight": "600",
    "--ag-selected-row-background-color": "rgba(13, 27, 42, 0.06)",
  },
  ".ag-theme-alpine .ag-root-wrapper": {
    borderRadius: "0",
    border: "1px solid #d6d9de",
    borderTop: "2px solid #0d1b2a",
    boxShadow: "none",
    overflow: "hidden",
  },
  ".ag-theme-alpine .ag-root-wrapper, .ag-theme-alpine .ag-root, .ag-theme-alpine .ag-root-wrapper-body": {
    height: "100%",
  },
  ".ag-theme-alpine .ag-header": {
    borderBottom: "1px solid #d6d9de",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontSize: "12px",
  },
  hr: {
    borderBottom: 0,
    borderLeft: 0,
    borderRight: 0,
    borderTop: "1px solid #d6d9de",
  },
};

export default globals;
