import colors from "assets/theme/base/colors";
import { pxToRem } from "assets/theme/functions";

const { grey } = colors;

const borders = {
  borderColor: grey[300],

  borderWidth: {
    0: 0,
    1: pxToRem(1),
    2: pxToRem(2),
    3: pxToRem(3),
    4: pxToRem(4),
    5: pxToRem(5),
  },

  // Goldman Sachs: minimal/sharp radius
  borderRadius: {
    xs: 0,
    sm: pxToRem(2),
    md: pxToRem(4),
    lg: pxToRem(4),
    xl: pxToRem(4),
    xxl: pxToRem(4),
    section: pxToRem(4),
  },
};

export default borders;
