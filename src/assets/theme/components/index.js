import colors from "assets/theme/base/colors";
import typography from "assets/theme/base/typography";
import borders from "assets/theme/base/borders";
import boxShadows from "assets/theme/base/boxShadows";
import { pxToRem, rgba, linearGradient } from "assets/theme/functions";

const input = {
  styleOverrides: {
    root: {
      display: "flex !important",
      padding: `${pxToRem(9)} ${pxToRem(12)}`,
      border: `1px solid #d6d9de`,
      borderRadius: `0 !important`,
      backgroundColor: "#ffffff",
      transition: "border-color 150ms ease",
      "& fieldset": {
        border: "none",
      },
      "&:focus-within": {
        border: `1px solid #0d1b2a`,
        boxShadow: "none",
        outline: "none",
      },
      "&:hover:not(:focus-within)": {
        borderColor: "#8c98a8",
      },
    },
    input: {
      height: pxToRem(22),
      width: "100% !important",
      fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
      fontSize: pxToRem(14),
      color: "#0d1b2a",
      "&::placeholder": {
        color: "#8c98a8",
        opacity: 1,
      },
    },
    inputSizeSmall: {
      height: pxToRem(14),
    },
  },
};

// Overrides for the MUI components used by this application.
const components = {
  MuiDrawer: {
    styleOverrides: {
      root: {
        width: pxToRem(284),
        whiteSpace: "nowrap",
        border: "none",
      },
      paper: {
        width: pxToRem(284),
        backgroundColor: colors.white.main,
        height: "100vh",
        margin: 0,
        borderRadius: 0,
        border: "none",
        borderRight: "1px solid #d6d9de",
      },
      paperAnchorDockedLeft: {
        borderRight: "none",
      },
    },
  },
  MuiList: {
    styleOverrides: {
      padding: {
        paddingTop: 0,
        paddingBottom: 0,
      },
    },
  },
  MuiListItem: {
    defaultProps: {
      disableGutters: true,
    },
    styleOverrides: {
      root: {
        paddingTop: 0,
        paddingBottom: 0,
      },
    },
  },
  MuiListItemText: {
    styleOverrides: {
      root: {
        marginTop: 0,
        marginBottom: 0,
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        display: "flex",
        flexDirection: "column",
        position: "relative",
        minWidth: 0,
        wordWrap: "break-word",
        backgroundColor: colors.white.main,
        backgroundClip: "border-box",
        border: `1px solid #d6d9de`,
        borderTop: `2px solid #0d1b2a`,
        borderRadius: 0,
        boxShadow: "none",
      },
    },
  },
  MuiButton: {
    defaultProps: {
      disableRipple: true,
    },
    styleOverrides: {
      root: {
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: typography.size.sm,
        fontWeight: typography.fontWeightMedium,
        borderRadius: borders.borderRadius.lg,
        padding: `${pxToRem(12)} ${pxToRem(24)}`,
        lineHeight: 1.4,
        textAlign: "center",
        textTransform: "none",
        letterSpacing: "0.2px",
        userSelect: "none",
        backgroundSize: "150% !important",
        backgroundPositionX: "25% !important",
        transition: `all 180ms ease`,
        "&:hover": {
          transform: "translateY(-1px)",
        },
        "&:disabled": {
          pointerEvent: "none",
          opacity: 0.65,
        },
        "& .material-icons": {
          fontSize: pxToRem(15),
          marginTop: pxToRem(-2),
        },
      },
      contained: {
        backgroundColor: colors.white.main,
        minHeight: pxToRem(38),
        color: colors.text.main,
        boxShadow: "none",
        padding: `${pxToRem(9)} ${pxToRem(20)}`,
        borderRadius: 0,
        border: "1px solid #d6d9de",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontSize: pxToRem(12),
        fontWeight: 700,
        "&:hover": {
          backgroundColor: "#f7f7f5",
          boxShadow: "none",
          borderColor: "#0d1b2a",
        },
        "&:focus": {
          boxShadow: "none",
          outline: "2px solid #0d1b2a",
          outlineOffset: 1,
        },
        "&:active, &:active:focus, &:active:hover": {
          opacity: 0.9,
          boxShadow: "none",
        },
        "&:disabled": {
          boxShadow: "none",
          opacity: 0.45,
        },
        "& .material-icon, .material-icons-round, svg": {
          fontSize: `${pxToRem(16)} !important`,
        },
      },
      containedSizeSmall: {
        minHeight: pxToRem(30),
        padding: `${pxToRem(6)} ${pxToRem(16)}`,
        fontSize: pxToRem(11),
        "& .material-icon, .material-icons-round, svg": {
          fontSize: `${pxToRem(12)} !important`,
        },
      },
      containedSizeLarge: {
        minHeight: pxToRem(44),
        padding: `${pxToRem(12)} ${pxToRem(32)}`,
        fontSize: pxToRem(13),
        "& .material-icon, .material-icons-round, svg": {
          fontSize: `${pxToRem(22)} !important`,
        },
      },
      containedPrimary: {
        backgroundColor: "#0d1b2a",
        color: colors.white.main,
        border: "1px solid #0d1b2a",
        boxShadow: "none",
        "&:hover": {
          backgroundColor: "#1a3a5c",
          border: "1px solid #1a3a5c",
          boxShadow: "none",
        },
        "&:focus:not(:hover)": {
          backgroundColor: "#1a3a5c",
          boxShadow: "none",
        },
      },
      containedSecondary: {
        backgroundColor: "#f7f7f5",
        color: "#0d1b2a",
        border: "1px solid #d6d9de",
        "&:hover": {
          backgroundColor: "#eaecef",
          border: "1px solid #0d1b2a",
        },
        "&:focus:not(:hover)": {
          backgroundColor: "#eaecef",
          boxShadow: "none",
        },
      },
      outlined: {
        minHeight: pxToRem(42),
        color: colors.text.main,
        borderColor: "rgba(15, 23, 42, 0.15)",
        padding: `${pxToRem(10)} ${pxToRem(20)}`,
        "&:hover": {
          opacity: 0.9,
          backgroundColor: "rgba(45, 108, 223, 0.08)",
        },
        "&:focus:not(:hover)": {
          boxShadow: boxShadows.buttonBoxShadow.stateOfNotHover,
        },
        "& .material-icon, .material-icons-round, svg": {
          fontSize: `${pxToRem(16)} !important`,
        },
      },
      outlinedSizeSmall: {
        minHeight: pxToRem(34),
        padding: `${pxToRem(8)} ${pxToRem(32)}`,
        fontSize: typography.size.xs,
        "& .material-icon, .material-icons-round, svg": {
          fontSize: `${pxToRem(12)} !important`,
        },
      },
      outlinedSizeLarge: {
        minHeight: pxToRem(49),
        padding: `${pxToRem(14)} ${pxToRem(64)}`,
        fontSize: typography.size.sm,
        "& .material-icon, .material-icons-round, svg": {
          fontSize: `${pxToRem(22)} !important`,
        },
      },
      outlinedPrimary: {
        backgroundColor: colors.transparent.main,
        borderColor: colors.info.main,
        color: colors.info.main,
        "&:hover": {
          backgroundColor: "rgba(45, 108, 223, 0.12)",
        },
        "&:focus:not(:hover)": {
          boxShadow: boxShadows.buttonBoxShadow.stateOfNotHover,
        },
      },
      outlinedSecondary: {
        backgroundColor: colors.transparent.main,
        borderColor: colors.secondary.main,
        "&:hover": {
          backgroundColor: colors.transparent.main,
        },
        "&:focus:not(:hover)": {
          boxShadow: boxShadows.buttonBoxShadow.stateOfNotHover,
        },
      },
      text: {
        backgroundColor: colors.transparent.main,
        height: "max-content",
        color: colors.info.main,
        boxShadow: "none",
        padding: `${pxToRem(6)} ${pxToRem(14)}`,
        "&:hover": {
          backgroundColor: "rgba(45, 108, 223, 0.08)",
          boxShadow: "none",
          color: colors.info.focus,
        },
        "&:focus": {
          boxShadow: "none",
          color: colors.info.focus,
        },
        "&:active, &:active:focus, &:active:hover": {
          opacity: 0.85,
          boxShadow: "none",
        },
        "&:disabled": {
          color: colors.grey[600],
          boxShadow: "none",
        },
        "& .material-icons, .material-icons-round, svg, span": {
          fontSize: `${pxToRem(16)} !important`,
        },
      },
      textSizeSmall: {
        fontSize: typography.size.xs,
        "& .material-icons, .material-icons-round, svg, span": {
          fontSize: `${pxToRem(12)} !important`,
        },
      },
      textSizeLarge: {
        fontSize: typography.size.sm,
        "& .material-icons, .material-icons-round, svg, span": {
          fontSize: `${pxToRem(22)} !important`,
        },
      },
      textPrimary: {
        color: colors.info.main,
        backgroundColor: colors.transparent.main,
        "&:hover": {
          color: colors.info.focus,
          backgroundColor: colors.transparent.main,
        },
        "&:focus:not(:hover)": {
          color: colors.info.focus,
          backgroundColor: colors.transparent.focus,
          boxShadow: "none",
        },
      },
      textSecondary: {
        color: colors.secondary.focus,
        backgroundColor: colors.transparent.main,
        "&:hover": {
          color: colors.secondary.focus,
          backgroundColor: colors.transparent.main,
        },
        "&:focus:not(:hover)": {
          color: colors.secondary.focus,
          backgroundColor: colors.transparent.focus,
          boxShadow: "none",
        },
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        "&:hover": {
          backgroundColor: colors.transparent.main,
        },
      },
    },
  },
  MuiInputBase: {
    styleOverrides: {
      root: {
        display: "flex !important",
        alignItems: "center !important",
        width: "100% !important",
        height: "auto !important",
        padding: `${pxToRem(10)} ${pxToRem(14)}`,
        fontFamily: `${typography.fontFamily} !important`,
        fontSize: `${typography.size.sm} !important`,
        fontWeight: `${typography.fontWeightRegular} !important`,
        lineHeight: "1.4 !important",
        color: `${colors.grey[700]} !important`,
        backgroundColor: `${colors.white.main} !important`,
        backgroundClip: "padding-box !important",
        border: `${borders.borderWidth[1]} solid rgba(148, 163, 184, 0.35)`,
        appearance: "none !important",
        borderRadius: borders.borderRadius.lg,
        transition: "box-shadow 150ms ease, border-color 150ms ease, padding 150ms ease !important",
        "&:focus-within": {
          border: `${borders.borderWidth[1]} solid rgba(148, 163, 184, 0.35)`,
          boxShadow: "none",
        },
      },
      input: {
        width: "100% !important",
        height: pxToRem(22),
        fontFamily: `${typography.fontFamily} !important`,
        paddingTop: "0 !important",
        paddingRight: "0 !important",
        paddingBottom: "0 !important",
        paddingLeft: pxToRem(6),
        "&::-webkit-input-placeholder": {
          fontFamily: `${typography.fontFamily} !important`,
          color: `${colors.dark.main} !important`,
        },
        "&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus": {
          WebkitTextFillColor: `${colors.grey[700]} !important`,
          fontFamily: `${typography.fontFamily} !important`,
        },
      },
    },
  },
  MuiMenu: {
    defaultProps: {
      disableAutoFocusItem: true,
    },
    styleOverrides: {
      paper: {
        minWidth: pxToRem(160),
        boxShadow: boxShadows.lg,
        padding: `${pxToRem(16)} ${pxToRem(8)}`,
        fontSize: typography.size.sm,
        color: colors.text.main,
        textAlign: "left",
        backgroundColor: `${colors.white.main} !important`,
        borderRadius: borders.borderRadius.md,
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        minWidth: pxToRem(160),
        minHeight: "unset",
        padding: `${pxToRem(4.8)} ${pxToRem(16)}`,
        borderRadius: borders.borderRadius.md,
        fontSize: typography.size.sm,
        color: colors.text.main,
        transition: "background-color 300ms ease, color 300ms ease",
        "&:hover, &:focus, &.Mui-selected, &.Mui-selected:hover, &.Mui-selected:focus": {
          backgroundColor: colors.light.main,
          color: colors.dark.main,
        },
      },
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: {
        backgroundColor: colors.transparent.main,
        backgroundImage: `linear-gradient(to right, ${rgba(colors.dark.main, 0)}, ${rgba(
          colors.dark.main,
          0.4
        )}, ${rgba(colors.dark.main, 0)}) !important`,
        height: pxToRem(1),
        margin: `${pxToRem(16)} 0`,
        borderBottom: 0,
        borderLeft: 0,
        borderRight: 0,
        opacity: 0.25,
      },
      vertical: {
        backgroundColor: colors.transparent.main,
        backgroundImage: `linear-gradient(180deg, ${rgba(colors.dark.main, 0)}, ${rgba(
          colors.dark.main,
          0.4
        )}, ${rgba(colors.dark.main, 0)}) !important`,
        width: pxToRem(1),
        height: "100%",
        margin: `0 ${pxToRem(16)}`,
        borderRight: "unset",
      },
      light: {
        backgroundColor: colors.transparent.main,
        backgroundImage: `linear-gradient(to right, ${rgba(colors.white.main, 0)}, ${
          colors.white.main
        }, ${rgba(colors.white.main, 0)}) !important`,
        "&.MuiDivider-vertical": {
          backgroundImage: `linear-gradient(180deg, ${rgba(colors.white.main, 0)}, ${
            colors.white.main
          }, ${rgba(colors.white.main, 0)}) !important`,
        },
      },
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: {
        transition: "all 200ms ease-in-out",
      },
      rounded: {
        borderRadius: borders.borderRadius.lg,
      },
      img: {
        height: "auto",
      },
    },
  },
  MuiAppBar: {
    defaultProps: {
      color: "transparent",
    },
    styleOverrides: {
      root: {
        boxShadow: "none",
      },
    },
  },
  MuiFormLabel: {
    styleOverrides: {
      root: {
        color: colors.dark.main,
      },
    },
  },
  MuiCheckbox: {
    styleOverrides: {
      root: {
        backgroundPosition: "center",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        width: pxToRem(20),
        height: pxToRem(20),
        marginRight: pxToRem(6),
        padding: 0,
        color: colors.transparent.main,
        border: `${borders.borderWidth[1]} solid ${borders.borderColor}`,
        borderRadius: pxToRem(5.6),
        transition: "all 250ms ease",
        "&:hover": {
          backgroundColor: colors.transparent.main,
        },
        "& .MuiSvgIcon-root": {
          fill: colors.transparent.main,
        },
        "&.Mui-focusVisible": {
          border: `${borders.borderWidth[2]} solid ${colors.info.main} !important`,
        },
      },
      colorPrimary: {
        backgroundColor: colors.transparent.main,
        "&.Mui-checked": {
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 -1 22 22'%3e%3cpath fill='none' stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M6 10l3 3l6-6'/%3e%3c/svg%3e"), ${linearGradient(
            colors.gradients.info.main,
            colors.gradients.info.state
          )}`,
          borderColor: colors.gradients.info.state,
        },
        "&:hover": {
          backgroundColor: colors.transparent.main,
        },
      },
      colorSecondary: {
        backgroundColor: colors.transparent.main,
        "&.Mui-checked": {
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 -1 22 22'%3e%3cpath fill='none' stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M6 10l3 3l6-6'/%3e%3c/svg%3e"), ${linearGradient(
            colors.gradients.info.main,
            colors.gradients.info.state
          )}`,
          borderColor: colors.gradients.info.state,
        },
        "&:hover": {
          backgroundColor: colors.transparent.main,
        },
      },
    },
  },
  MuiInput: input,
  MuiOutlinedInput: input,
  MuiFilledInput: input,
  MuiPopover: {
    styleOverrides: {
      paper: {
        backgroundColor: colors.transparent.main,
        boxShadow: boxShadows.lg,
        padding: pxToRem(8),
        borderRadius: borders.borderRadius.lg,
      },
    },
  },
  MuiButtonBase: {
    defaultProps: {
      disableRipple: true,
    },
  },
  MuiIcon: {
    defaultProps: {
      baseClassName: "material-icons-round",
      fontSize: "inherit",
    },
    styleOverrides: {
      fontSizeInherit: {
        fontSize: "inherit !important",
      },
      fontSizeSmall: {
        fontSize: `${pxToRem(20)} !important`,
      },
      fontSizeLarge: {
        fontSize: `${pxToRem(36)} !important`,
      },
    },
  },
  MuiSvgIcon: {
    defaultProps: {
      fontSize: "inherit",
    },
    styleOverrides: {
      fontSizeInherit: {
        fontSize: "inherit !important",
      },
      fontSizeSmall: {
        fontSize: `${pxToRem(20)} !important`,
      },
      fontSizeLarge: {
        fontSize: `${pxToRem(36)} !important`,
      },
    },
  },
  MuiLink: {
    defaultProps: {
      underline: "none",
      color: "inherit",
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: borders.borderRadius.lg,
        boxShadow: boxShadows.xxl,
      },
      paperFullScreen: {
        borderRadius: 0,
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        padding: pxToRem(16),
        fontSize: typography.size.xl,
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: pxToRem(16),
        fontSize: typography.size.md,
        color: colors.text.main,
      },
      dividers: {
        borderTop: `${borders.borderWidth[1]} solid ${borders.borderColor}`,
        borderBottom: `${borders.borderWidth[1]} solid ${borders.borderColor}`,
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: pxToRem(16),
      },
    },
  },
};

export default components;
