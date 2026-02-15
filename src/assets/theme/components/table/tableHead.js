// Custom Dashboard 2 MUI base styles
import borders from "assets/theme/base/borders";
import colors from "assets/theme/base/colors";

// Custom Dashboard 2 MUI helper functions
import pxToRem from "assets/theme/functions/pxToRem";

const { borderRadius } = borders;
const { light } = colors;

const tableHead = {
  styleOverrides: {
    root: {
      display: "block",
      padding: `${pxToRem(14)} ${pxToRem(16)} ${pxToRem(8)}  ${pxToRem(16)}`,
      borderRadius: `${borderRadius.xl} ${borderRadius.xl} 0 0`,
      backgroundColor: light.main,
    },
  },
};

export default tableHead;
