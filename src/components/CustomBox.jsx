import { forwardRef } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

const CustomBoxRoot = styled(Box)(({ theme, ownerState }) => {
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

const CustomBox = forwardRef(
  ({ variant, bgColor, color, opacity, borderRadius, shadow, ...rest }, ref) => (
    <CustomBoxRoot
      {...rest}
      ref={ref}
      ownerState={{ variant, bgColor, color, opacity, borderRadius, shadow }}
    />
  )
);

CustomBox.defaultProps = {
  variant: "contained",
  bgColor: "transparent",
  color: "dark",
  opacity: 1,
  borderRadius: "none",
  shadow: "none",
};

CustomBox.propTypes = {
  variant: PropTypes.oneOf(["contained", "gradient"]),
  bgColor: PropTypes.string,
  color: PropTypes.string,
  opacity: PropTypes.number,
  borderRadius: PropTypes.string,
  shadow: PropTypes.string,
};

export default CustomBox;
