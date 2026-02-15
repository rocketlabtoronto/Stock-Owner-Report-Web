// Custom Dashboard 2 MUI Base Styles
import typography from "assets/theme/base/typography";
import borders from "assets/theme/base/borders";

// Custom Dashboard 2 MUI Helper Functions
import pxToRem from "assets/theme/functions/pxToRem";

const { fontWeightMedium, size } = typography;
const { borderRadius } = borders;

const root = {
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: size.sm,
  fontWeight: fontWeightMedium,
  borderRadius: borderRadius.lg,
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
};

export default root;
