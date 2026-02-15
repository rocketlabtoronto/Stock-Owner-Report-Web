// Custom Dashboard 2 MUI base styles
import borders from "assets/theme/base/borders";
import colors from "assets/theme/base/colors";

// Custom Dashboard 2 MUI helper functions
import pxToRem from "assets/theme/functions/pxToRem";

const { borderWidth } = borders;
const { light } = colors;

const tableCell = {
  styleOverrides: {
    root: {
      padding: `${pxToRem(14)} ${pxToRem(18)}`,
      borderBottom: `${borderWidth[1]} solid rgba(148, 163, 184, 0.2)`,
    },
  },
};

export default tableCell;
