// Custom Dashboard 2 MUI Base Styles
import colors from "assets/theme/base/colors";
import typography from "assets/theme/base/typography";
import boxShadows from "assets/theme/base/boxShadows";

// Custom Dashboard 2 MUI Helper Functions
import pxToRem from "assets/theme/functions/pxToRem";

const { white, text, info, secondary } = colors;
const { size } = typography;
const { buttonBoxShadow } = boxShadows;

const contained = {
  base: {
    backgroundColor: white.main,
    minHeight: pxToRem(40),
    color: text.main,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
    padding: `${pxToRem(10)} ${pxToRem(20)}`,

    "&:hover": {
      backgroundColor: white.main,
      boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
    },

    "&:focus": {
      boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
    },

    "&:active, &:active:focus, &:active:hover": {
      opacity: 0.9,
      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.12)",
    },

    "&:disabled": {
      boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)",
    },

    "& .material-icon, .material-icons-round, svg": {
      fontSize: `${pxToRem(16)} !important`,
    },
  },

  small: {
    minHeight: pxToRem(32),
    padding: `${pxToRem(8)} ${pxToRem(32)}`,
    fontSize: size.xs,

    "& .material-icon, .material-icons-round, svg": {
      fontSize: `${pxToRem(12)} !important`,
    },
  },

  large: {
    minHeight: pxToRem(47),
    padding: `${pxToRem(14)} ${pxToRem(64)}`,
    fontSize: size.sm,

    "& .material-icon, .material-icons-round, svg": {
      fontSize: `${pxToRem(22)} !important`,
    },
  },

  primary: {
    backgroundColor: info.main,
    color: white.main,
    boxShadow: "0 12px 28px rgba(45, 108, 223, 0.35)",

    "&:hover": {
      backgroundColor: info.focus,
      boxShadow: "0 14px 32px rgba(45, 108, 223, 0.4)",
    },

    "&:focus:not(:hover)": {
      backgroundColor: info.focus,
      boxShadow: "0 12px 28px rgba(45, 108, 223, 0.35)",
    },
  },

  secondary: {
    backgroundColor: secondary.main,

    "&:hover": {
      backgroundColor: secondary.main,
    },

    "&:focus:not(:hover)": {
      backgroundColor: secondary.focus,
      boxShadow: buttonBoxShadow.stateOfNotHover,
    },
  },
};

export default contained;
