import { useEffect } from "react";
import { useLocation, NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import List from "@mui/material/List";
import Button from "@mui/material/Button";
import SidenavItem from "ui/Sidenav/SidenavItem";
import SidenavRoot from "ui/Sidenav/SidenavRoot";
import { useCustomController, setMiniSidenav } from "context";
import { useAuthStore } from "stores/useAuthStore";
import { useAppStore } from "stores/store";

function Sidenav({ routes }) {
  const [{ miniSidenav }, dispatch] = useCustomController();
  const { pathname } = useLocation();
  const itemName = pathname.split("/")[1];
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const hasBrokerageConnected = useAppStore(
    (state) => Array.isArray(state.accounts) && state.accounts.length > 0
  );

  useEffect(() => {
    const handleResize = () => setMiniSidenav(dispatch, window.innerWidth < 1200);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch, pathname]);

  const handleSignOut = () => {
    clearUser();
    window.location.href = "/login";
  };

  return (
    <SidenavRoot variant="permanent" ownerState={{ miniSidenav }}>
      <List sx={{ mt: 1, px: 1 }}>
        {routes
          .filter((route) => !route.hidden)
          .map(({ key, route, name, icon }) => (
            <NavLink to={route} key={key}>
              <SidenavItem name={name} icon={icon} active={key === itemName} />
            </NavLink>
          ))}
      </List>
      <div style={{ flexGrow: 1 }} />
      {(user || hasBrokerageConnected) && (
        <div style={{ padding: "12px 16px", marginTop: "auto" }}>
          <Button
            onClick={handleSignOut}
            variant="contained"
            fullWidth
            sx={{
              py: 1.1,
              fontWeight: 700,
              borderRadius: 0,
              backgroundColor: "#0d1b2a",
              boxShadow: "none",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              fontSize: 12,
              "&:hover": { backgroundColor: "#1a3a5c", boxShadow: "none" },
            }}
          >
            Sign Out
          </Button>
        </div>
      )}
    </SidenavRoot>
  );
}

Sidenav.propTypes = { routes: PropTypes.arrayOf(PropTypes.object).isRequired };

export default Sidenav;
