import { useEffect } from "react";

// react-router-dom components
import { useLocation, NavLink } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Button from "@mui/material/Button";

// Custom Dashboard 2 MUI components
import CustomTypography from "components/CustomTypography";

// Custom Dashboard 2 MUI example components
import SidenavItem from "ui/Sidenav/SidenavItem";

// Custom styles for the Sidenav
import SidenavRoot from "ui/Sidenav/SidenavRoot";

// Custom Dashboard 2 MUI context
import { useCustomController, setMiniSidenav } from "context";
import { useAuthStore } from "stores/useAuthStore";
import { useAppStore } from "stores/store";

function Sidenav({ color, brand, brandName, routes, ...rest }) {
  const [controller, dispatch] = useCustomController();
  const { miniSidenav, darkSidenav, layout } = controller;
  const location = useLocation();
  const { pathname } = location;
  const itemName = pathname.split("/").slice(1)[0];

  const closeSidenav = () => setMiniSidenav(dispatch, true);

  useEffect(() => {
    // A function that sets the mini state of the sidenav.
    function handleMiniSidenav() {
      setMiniSidenav(dispatch, window.innerWidth < 1200);
    }

    /** 
     The event listener that's calling the handleMiniSidenav function when resizing the window.
    */
    window.addEventListener("resize", handleMiniSidenav);

    // Call the handleMiniSidenav function to set the state with the initial value.
    handleMiniSidenav();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, location]);

  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);
  const brokeragesAndAccounts = useAppStore((s) => s.brokeragesAndAccounts);
  const snapTradeAccounts = useAppStore((s) => s.snapTradeAccounts);
  const hasBrokerageConnected =
    (Array.isArray(brokeragesAndAccounts) && brokeragesAndAccounts.length > 0) ||
    (Array.isArray(snapTradeAccounts) && snapTradeAccounts.length > 0);

  const handleSignOut = () => {
    clearUser();
    window.location.href = "/login";
  };

  // Render all the routes from the routes.js (All the visible items on the Sidenav)
  const renderRoutes = routes
    .filter((route) => !route.hidden)
    .map(({ type, name, icon, title, key, href, route }) => {
      let returnValue;

      if (type === "route") {
        if (href) {
          returnValue = (
            <Link href={href} key={key} target="_blank" rel="noreferrer">
              <SidenavItem
                name={name}
                icon={icon}
                active={key === itemName}
                noCollapse={noCollapse}
              />
            </Link>
          );
        } else {
          returnValue = (
            <NavLink to={route} key={key}>
              <SidenavItem name={name} icon={icon} active={key === itemName} />
            </NavLink>
          );
        }
      } else if (type === "title") {
        returnValue = (
          <CustomTypography
            key={key}
            color={darkSidenav ? "white" : "dark"}
            display="block"
            variant="caption"
            fontWeight="bold"
            textTransform="uppercase"
            opacity={0.6}
            pl={3}
            mt={2}
            mb={1}
            ml={1}
          >
            {title}
          </CustomTypography>
        );
      } else if (type === "divider") {
        returnValue = <Divider key={key} light={darkSidenav} />;
      }

      return returnValue;
    });

  return (
    <SidenavRoot {...rest} variant="permanent" ownerState={{ darkSidenav, miniSidenav, layout }}>
      <List sx={{ mt: 1, px: 1 }}>{renderRoutes}</List>
      <div style={{ flexGrow: 1 }} />
      {(user || hasBrokerageConnected) && (
        <div style={{ padding: "12px 16px", marginTop: "auto" }}>
          <Button
            onClick={handleSignOut}
            variant="contained"
            fullWidth
            sx={{ py: 1.1, fontWeight: 700, borderRadius: 1.5 }}
          >
            Sign Out
          </Button>
        </div>
      )}
    </SidenavRoot>
  );
}

// Setting default values for the props of Sidenav
Sidenav.defaultProps = {
  color: "info",
  brand: "",
};

// Typechecking props for the Sidenav
Sidenav.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  brand: PropTypes.string,
  brandName: PropTypes.string.isRequired,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default Sidenav;
