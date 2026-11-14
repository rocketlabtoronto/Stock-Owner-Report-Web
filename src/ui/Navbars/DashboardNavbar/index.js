import { useState } from "react";
import PropTypes from "prop-types";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useAuthStore } from "stores/useAuthStore";

function UserSummary({ email, textSx }) {
  return (
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
        sx={{ fontWeight: 500, fontSize: 13, lineHeight: 1.2, ...textSx }}
      >
        {email}
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
  );
}

UserSummary.propTypes = { email: PropTypes.string, textSx: PropTypes.object };

function DashboardNavbar({ absolute = false }) {
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [anchorEl, setAnchorEl] = useState(null);
  const closeMenu = () => setAnchorEl(null);
  const handleLogout = () => {
    clearUser();
    closeMenu();
    window.location.href = "/login";
  };

  return (
    <AppBar
      position={absolute ? "absolute" : "static"}
      color="inherit"
      elevation={0}
      sx={{
        zIndex: 1201,
        background: "#ffffff !important",
        borderBottom: "1px solid #d6d9de",
        boxShadow: "none !important",
      }}
    >
      <Toolbar sx={{ display: "flex", alignItems: "center", minHeight: 64 }}>
        <Box sx={{ flexGrow: 1 }} />
        {user && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, height: 48 }}>
            <UserSummary email={user.email} textSx={{ color: "#0d1b2a", textAlign: "right" }} />
            <IconButton
              onClick={(event) => setAnchorEl(event.currentTarget)}
              sx={{ p: 0, alignSelf: "center" }}
            >
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
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={closeMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <Box sx={{ px: 2, py: 1, minWidth: 180 }}>
                <UserSummary email={user.email} />
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

DashboardNavbar.propTypes = { absolute: PropTypes.bool };

export default DashboardNavbar;
