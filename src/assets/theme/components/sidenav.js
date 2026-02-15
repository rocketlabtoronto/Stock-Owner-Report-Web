// Custom Dashboard 2 MUI base styles
import colors from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";

// Custom Dashboard 2 MUI helper functions
import pxToRem from "assets/theme/functions/pxToRem";

const { white } = colors;
const { borderRadius } = borders;

const sidenav = {
  styleOverrides: {
    root: {
  width: pxToRem(284),
      whiteSpace: "nowrap",
      border: "none",
    },

    paper: {
  width: pxToRem(284),
      backgroundColor: white.main,
      height: `calc(100vh - ${pxToRem(32)})`,
      margin: `${pxToRem(16)} 0 ${pxToRem(16)} ${pxToRem(16)}`,
  borderRadius: pxToRem(20),
      border: "none",
    },

    paperAnchorDockedLeft: {
      borderRight: "none",
    },
  },
};

export default sidenav;
