import { useState, useEffect } from "react";

// react-router components
import { useLocation } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui core components
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
// import Menu from "@mui/material/Menu"; // Removed duplicate import


// Custom styles for DashboardNavbar



// Custom Dashboard 2 MUI context
import {
  useCustomController,
  setTransparentNavbar,
  setMiniSidenav,
  setOpenConfigurator,
} from "context";
// User info imports
import { useAuthStore } from "stores/useAuthStore";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

function DashboardNavbar({ absolute, light, isMini }) {
  const [navbarType, setNavbarType] = useState();
  const [controller, dispatch] = useCustomController();
  const { miniSidenav, transparentNavbar, fixedNavbar, openConfigurator } = controller;
  const [openMenu, setOpenMenu] = useState(false);
  const location = useLocation();
  let route = [];
  if (location && typeof location.pathname === "string" && location.pathname != null) {
    try {
      route = location.pathname.split("/").slice(1);
    } catch (e) {
      route = [];
    }
  }

  // Get logged-in user from Zustand
  const user = useAuthStore((state) => state.user);
  const [anchorEl, setAnchorEl] = useState(null);
  const handleAvatarClick = (event) => setAnchorEl(event.currentTarget);
  const clearUser = useAuthStore((state) => state.clearUser);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => {
    clearUser();
    setAnchorEl(null);
    window.location.href = "/login";
  };

  useEffect(() => {
    // Setting the navbar type
    if (fixedNavbar) {
      setNavbarType("sticky");
    } else {
      setNavbarType("static");
    }

    // A function that sets the transparent state of the navbar.
    function handleTransparentNavbar() {
      setTransparentNavbar(dispatch, (fixedNavbar && window.scrollY === 0) || !fixedNavbar);
    }

    /** 
     The event listener that's calling the handleTransparentNavbar function when 
     scrolling the window.
    */
    window.addEventListener("scroll", handleTransparentNavbar);

    // Call the handleTransparentNavbar function to set the state with the initial value.
    handleTransparentNavbar();

    // Remove event listener on cleanup
    return () => window.removeEventListener("scroll", handleTransparentNavbar);
  }, [dispatch, fixedNavbar]);

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);
  const handleOpenMenu = (event) => setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(false);

  // Render the notifications menu
  const renderMenu = () => <></>;

  return (
    <AppBar
      position={absolute ? "absolute" : navbarType}
      color="inherit"
      elevation={0}
      sx={{ zIndex: 1201, background: "#27ae60 !important" }}
    >
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 64,
        }}
      >
        {/* Spacer to push user info to the right */}
        <Box sx={{ flexGrow: 1 }} />
        {/* Right: User Info */}
        {user ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, height: 48 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: "#344767",
                  textAlign: "right",
                  fontSize: 13,
                  lineHeight: 1.2,
                }}
              >
                {user.email}
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <span
                  style={{
                    background: "#e3eafc",
                    color: "#1976d2",
                    fontWeight: 500,
                    fontSize: 11,
                    borderRadius: 8,
                    padding: "2px 8px",
                    boxShadow: "0 1px 4px rgba(25,118,210,0.08)",
                    letterSpacing: 0.5,
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                >
                  Logged in
                </span>
              </Box>
            </Box>
            <IconButton onClick={handleAvatarClick} sx={{ p: 0, alignSelf: "center" }}>
              <Avatar
                alt={user.name || user.email}
                src={user.avatar || user.profile_image || undefined}
              >
                {!(user.avatar || user.profile_image) && (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <radialGradient id="faceGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#eafaf1" />
                        <stop offset="60%" stopColor="#81c784" />
                        <stop offset="100%" stopColor="#27ae60" />
                      </radialGradient>
                      <linearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a5d6a7" />
                        <stop offset="100%" stopColor="#27ae60" />
                      </linearGradient>
                      <radialGradient id="shine" cx="60%" cy="40%" r="40%">
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#27ae60" stopOpacity="0" />
                      </radialGradient>
                      <linearGradient id="shadow" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#27ae60" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <circle cx="16" cy="16" r="16" fill="#eafaf1" />
                    <ellipse cx="16" cy="12" rx="6.5" ry="6.5" fill="url(#faceGradient)" />
                    <ellipse cx="16" cy="22" rx="9.5" ry="7" fill="url(#bodyGradient)" />
                    <ellipse cx="16" cy="12" rx="6.5" ry="6.5" fill="url(#shine)" />
                    <ellipse cx="16" cy="22" rx="9.5" ry="7" fill="url(#shine)" />
                    <ellipse cx="16" cy="22" rx="9.5" ry="7" fill="url(#shadow)" />
                    <ellipse
                      cx="16"
                      cy="12"
                      rx="6.5"
                      ry="6.5"
                      fill="none"
                      stroke="#81c784"
                      strokeWidth="1.5"
                    />
                  </svg>
                )}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <Box sx={{ px: 2, py: 1, minWidth: 180 }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, fontSize: 13, lineHeight: 1.2 }}
                  >
                    {user.email}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <span
                      style={{
                        background: "#e3eafc",
                        color: "#1976d2",
                        fontWeight: 500,
                        fontSize: 11,
                        borderRadius: 8,
                        padding: "2px 8px",
                        boxShadow: "0 1px 4px rgba(25,118,210,0.08)",
                        letterSpacing: 0.5,
                        display: "inline-block",
                        verticalAlign: "middle",
                      }}
                    >
                      Logged in
                    </span>
                  </Box>
                </Box>
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" sx={{ color: "#8392ab" }}>
              Not logged in
            </Typography>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

// Setting default values for the props of DashboardNavbar
DashboardNavbar.defaultProps = {
  absolute: false,
  light: true,
  isMini: false,
};

// Typechecking props for the DashboardNavbar
DashboardNavbar.propTypes = {
  absolute: PropTypes.bool,
  light: PropTypes.bool,
  isMini: PropTypes.bool,
};

export default DashboardNavbar;
