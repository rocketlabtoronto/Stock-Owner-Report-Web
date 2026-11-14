import { forwardRef } from "react";
import PropTypes from "prop-types";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";

const CustomTypographyRoot = styled(Typography)(({ theme, ownerState }) => {
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

const CustomTypography = forwardRef(
  (
    { color, fontWeight, textTransform, verticalAlign, textGradient, opacity, children, ...rest },
    ref
  ) => (
    <CustomTypographyRoot
      {...rest}
      ref={ref}
      ownerState={{ color, fontWeight, textTransform, verticalAlign, textGradient, opacity }}
    >
      {children}
    </CustomTypographyRoot>
  )
);

CustomTypography.defaultProps = {
  color: "dark",
  fontWeight: false,
  textTransform: "none",
  verticalAlign: "unset",
  textGradient: false,
  opacity: 1,
};

CustomTypography.propTypes = {
  color: PropTypes.oneOf([
    "inherit",
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
    "light",
    "dark",
    "text",
    "white",
  ]),
  fontWeight: PropTypes.oneOf([false, "light", "regular", "medium", "bold"]),
  textTransform: PropTypes.oneOf(["none", "capitalize", "uppercase", "lowercase"]),
  verticalAlign: PropTypes.oneOf([
    "unset",
    "baseline",
    "sub",
    "super",
    "text-top",
    "text-bottom",
    "middle",
    "top",
    "bottom",
  ]),
  textGradient: PropTypes.bool,
  opacity: PropTypes.number,
  children: PropTypes.node.isRequired,
};

export default CustomTypography;
