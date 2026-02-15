// Custom Dashboard 2 MUI Base Styles
import colors from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";

// Soft UI Dashboard PRO helper functions
import pxToRem from "assets/theme/functions/pxToRem";

const { inputColors } = colors;
const { borderWidth, borderRadius } = borders;

const input = {
  styleOverrides: {
    root: {
      display: "flex !important",
      padding: `${pxToRem(10)} ${pxToRem(14)}`,
  border: `${borderWidth[1]} solid rgba(148, 163, 184, 0.35)`,
      borderRadius: `${borderRadius.lg} !important`,

      "& fieldset": {
        border: "none",
      },

      "&:focus-within": {
        borderColor: inputColors.borderColor.focus,
        boxShadow: "0 0 0 4px rgba(45, 108, 223, 0.12)",
      },
    },

    input: {
      height: pxToRem(22),
      width: "max-content !important",
    },

    inputSizeSmall: {
      height: pxToRem(14),
    },
  },
};

export default input;
