// Custom Dashboard 2 MUI base styles
import colors from "assets/theme/base/colors";
import boxShadows from "assets/theme/base/boxShadows";
import borders from "assets/theme/base/borders";

const { white } = colors;
const { cardBoxShadow } = boxShadows;
const { borderRadius } = borders;

const tableContainer = {
  styleOverrides: {
    root: {
      backgroundColor: white.main,
      boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
      borderRadius: borderRadius.xxl,
    },
  },
};

export default tableContainer;
