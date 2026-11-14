import PropTypes from "prop-types";
import CustomBox from "components/CustomBox";
import { useCustomController } from "context";

function DashboardLayout({ children }) {
  const [{ miniSidenav }] = useCustomController();

  return (
    <CustomBox
      sx={({ breakpoints, transitions, functions: { pxToRem } }) => ({
        p: 2,
        pb: 1,
        pt: 1,
        minHeight: "100vh",
        backgroundColor: "#f7f7f5",
        [breakpoints.up("xl")]: {
          marginLeft: miniSidenav ? pxToRem(120) : pxToRem(284),
          transition: transitions.create(["margin-left", "margin-right"], {
            easing: transitions.easing.easeInOut,
            duration: transitions.duration.standard,
          }),
        },
      })}
    >
      {children}
    </CustomBox>
  );
}

DashboardLayout.propTypes = { children: PropTypes.node.isRequired };

export default DashboardLayout;
