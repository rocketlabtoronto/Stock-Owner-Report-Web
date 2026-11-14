import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";

export default styled(Typography)(({ theme, ownerState }) => {
  const {
    palette,
    typography,
    functions: { linearGradient },
  } = theme;
  const { color, textTransform, verticalAlign, fontWeight, opacity, textGradient } = ownerState;
  const fontWeights = {
    light: typography.fontWeightLight,
    regular: typography.fontWeightRegular,
    medium: typography.fontWeightMedium,
    bold: typography.fontWeightBold,
  };
  const gradient = palette.gradients[color] ?? palette.gradients.dark;

  return {
    opacity,
    textTransform,
    verticalAlign,
    textDecoration: "none",
    color: color === "inherit" || !palette[color] ? "inherit" : palette[color].main,
    fontWeight: fontWeights[fontWeight],
    ...(textGradient && {
      backgroundImage: linearGradient(gradient.main, gradient.state),
      display: "inline-block",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: palette.transparent.main,
      position: "relative",
      zIndex: 1,
    }),
  };
});
