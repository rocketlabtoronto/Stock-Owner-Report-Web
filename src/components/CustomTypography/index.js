import { forwardRef } from "react";
import PropTypes from "prop-types";

// Custom styles for CustomTypography
import CustomTypographyRoot from "components/CustomTypography/CustomTypographyRoot";

// Custom Dashboard 2 MUI context
import { useCustomController } from "context";

const CustomTypography = forwardRef(
  (
    { color, fontWeight, textTransform, verticalAlign, textGradient, opacity, children, ...rest },
    ref
  ) => {
    const [controller] = useCustomController();
    const { darkMode } = controller;

    // Remove verticalAlign from props passed to DOM
    const { verticalAlign: _omit, ...cleanRest } = rest;

    return (
      <CustomTypographyRoot
        {...cleanRest}
        ref={ref}
        ownerState={{
          color,
          fontWeight,
          textTransform,
          verticalAlign, // ✅ only used by styled component
          textGradient,
          opacity,
          darkMode,
        }}
      >
        {children}
      </CustomTypographyRoot>
    );
  }
);

// Default props
CustomTypography.defaultProps = {
  color: "dark",
  fontWeight: false,
  textTransform: "none",
  verticalAlign: "unset",
  textGradient: false,
  opacity: 1,
};

// PropTypes
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
