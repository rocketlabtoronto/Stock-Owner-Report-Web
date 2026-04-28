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
  const { transparentNavbar, fixedNavbar } = controller;
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

  return (
    <AppBar
      position={absolute ? "absolute" : navbarType}
      color="inherit"
      elevation={0}
      sx={{ zIndex: 1201, background: "#ffffff !important", borderBottom: "1px solid #d6d9de", boxShadow: "none !important" }}
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
                  color: "#0d1b2a",
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
                    background: "#eaecef",
                    color: "#0d1b2a",
                    fontWeight: 600,
                    fontSize: 10,
                    borderRadius: 0,
                    padding: "2px 8px",
                    boxShadow: "none",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    display: "inline-block",
                    verticalAlign: "middle",
                    border: "1px solid #d6d9de",
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
                sx={{
                  width: 36,
                  height: 36,
                  backgroundColor: "#0d1b2a",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  borderRadius: 0,
                  border: "1px solid #d6d9de",
                }}
              >
                {!(user.avatar || user.profile_image) && (
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em" }}>
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </span>
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
                        background: "#eaecef",
                        color: "#0d1b2a",
                        fontWeight: 600,
                        fontSize: 10,
                        borderRadius: 0,
                        padding: "2px 8px",
                        boxShadow: "none",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        display: "inline-block",
                        verticalAlign: "middle",
                        border: "1px solid #d6d9de",
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
        ) : null}
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
