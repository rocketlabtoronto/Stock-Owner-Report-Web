import { useEffect } from "react";

// react-router-dom components
import { useLocation } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// Custom Dashboard 2 MUI components
import CustomBox from "components/CustomBox";

// Custom Dashboard 2 MUI context
import { useCustomController, setLayout } from "context";

function DashboardLayout({ bgColor, children, ...rest }) {
  const [controller, dispatch] = useCustomController();
  const { miniSidenav, darkMode } = controller;
  const { pathname } = useLocation();

  useEffect(() => {
    setLayout(dispatch, "dashboard");
  }, [pathname]);

  const background = darkMode && !bgColor ? "transparent" : bgColor;

  return (
    <CustomBox
      sx={({ breakpoints, transitions, functions: { pxToRem } }) => ({
        p: 2,
        pb: 1, // Add bottom padding to prevent content from being hidden behind sticky footer

        [breakpoints.up("xl")]: {
          marginLeft: miniSidenav ? pxToRem(120) : pxToRem(274),
          transition: transitions.create(["margin-left", "margin-right"], {
            easing: transitions.easing.easeInOut,
            duration: transitions.duration.standard,
          }),
        },
      })}
    >
      {/* Removed header background that created the top gap */}
      <CustomBox sx={{ display: "none" }} />
      {children}
    </CustomBox>
  );
}

// Typechecking props for the DashboardLayout
DashboardLayout.propTypes = {
  bgColor: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default DashboardLayout;
