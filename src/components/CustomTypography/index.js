import { forwardRef } from "react";
import PropTypes from "prop-types";
import CustomTypographyRoot from "components/CustomTypography/CustomTypographyRoot";

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
