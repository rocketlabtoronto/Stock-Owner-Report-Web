import { createTheme } from "@mui/material/styles";
import colors from "assets/theme/base/colors";
import typography from "assets/theme/base/typography";
import boxShadows from "assets/theme/base/boxShadows";
import borders from "assets/theme/base/borders";
import globals from "assets/theme/base/globals";
import components from "assets/theme/components";
import { boxShadow, hexToRgb, linearGradient, pxToRem, rgba } from "assets/theme/functions";

const inputTypography = {
  fontFamily: `${typography.fontFamily} !important`,
  fontSize: `${typography.size.md} !important`,
  fontWeight: `${typography.fontWeightRegular} !important`,
  lineHeight: "1.5 !important",
};

export default createTheme({
  breakpoints: {
    values: { xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 },
  },
  palette: colors,
  typography,
  boxShadows,
  borders,
  functions: { boxShadow, hexToRgb, linearGradient, pxToRem, rgba },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ...globals,
        "input, textarea": inputTypography,
        "input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, textarea:-webkit-autofill, textarea:-webkit-autofill:hover, textarea:-webkit-autofill:focus":
          {
            ...inputTypography,
            WebkitTextFillColor: `${colors.grey[700]} !important`,
            caretColor: `${colors.grey[700]} !important`,
            WebkitBoxShadow: `0 0 0 1000px ${colors.white.main} inset !important`,
            boxShadow: `0 0 0 1000px ${colors.white.main} inset !important`,
            transition: "background-color 9999s ease-out 0s",
          },
      },
    },
    ...components,
  },
});
