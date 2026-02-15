// Custom Dashboard 2 MUI Base Styles
import colors from "assets/theme/base/colors";
import typography from "assets/theme/base/typography";
import boxShadows from "assets/theme/base/boxShadows";

// Custom Dashboard 2 MUI Helper Functions
import pxToRem from "assets/theme/functions/pxToRem";

const { transparent, light, info, secondary, text } = colors;
const { size } = typography;
const { buttonBoxShadow } = boxShadows;

const outlined = {
  base: {
    minHeight: pxToRem(42),
    color: text.main,
    borderColor: "rgba(15, 23, 42, 0.15)",
    padding: `${pxToRem(10)} ${pxToRem(20)}`,

    "&:hover": {
      opacity: 0.9,
      backgroundColor: "rgba(45, 108, 223, 0.08)",
    },

    "&:focus:not(:hover)": {
      boxShadow: buttonBoxShadow.stateOfNotHover,
    },

    "& .material-icon, .material-icons-round, svg": {
      fontSize: `${pxToRem(16)} !important`,
    },
  },

  small: {
    minHeight: pxToRem(34),
    padding: `${pxToRem(8)} ${pxToRem(32)}`,
    fontSize: size.xs,

    "& .material-icon, .material-icons-round, svg": {
      fontSize: `${pxToRem(12)} !important`,
    },
  },

  large: {
    minHeight: pxToRem(49),
    padding: `${pxToRem(14)} ${pxToRem(64)}`,
    fontSize: size.sm,

    "& .material-icon, .material-icons-round, svg": {
      fontSize: `${pxToRem(22)} !important`,
    },
  },

  primary: {
    backgroundColor: transparent.main,
    borderColor: info.main,
    color: info.main,

    "&:hover": {
      backgroundColor: "rgba(45, 108, 223, 0.12)",
    },

    "&:focus:not(:hover)": {
      boxShadow: buttonBoxShadow.stateOfNotHover,
    },
  },

  secondary: {
    backgroundColor: transparent.main,
    borderColor: secondary.main,

    "&:hover": {
      backgroundColor: transparent.main,
    },

    "&:focus:not(:hover)": {
      boxShadow: buttonBoxShadow.stateOfNotHover,
    },
  },
};

export default outlined;
