import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

export default styled(Box)(({ theme, ownerState }) => {
  const { palette, functions, borders, boxShadows } = theme;
  const { variant, bgColor, color, opacity, borderRadius, shadow } = ownerState;
  const resolveColor = (value) =>
    palette[value]?.main ??
    (value?.startsWith("grey-") ? palette.grey[value.slice(5)] : undefined) ??
    value;
  const gradient = palette.gradients[bgColor];

  return {
    opacity,
    background:
      variant === "gradient"
        ? gradient
          ? functions.linearGradient(gradient.main, gradient.state)
          : palette.white.main
        : resolveColor(bgColor),
    color: resolveColor(color),
    borderRadius: borders.borderRadius[borderRadius] ?? borderRadius,
    boxShadow: boxShadows[shadow] ?? shadow,
  };
});
