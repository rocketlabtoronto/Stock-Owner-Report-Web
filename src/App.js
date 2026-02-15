import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Sidenav from "ui/Sidenav";
import Footer from "ui/Footer";
import theme from "assets/theme";
import themeDark from "assets/theme-dark";
import routes from "routes";
import { useCustomController } from "context";
import { useAuthStore } from "stores/useAuthStore";
import { supabase } from "./supabaseClient";
import brand from "assets/images/logo-ct.png";
import brandDark from "assets/images/logo-ct-dark.png";

export default function App() {
  const [controller] = useCustomController();
  const { layout, sidenavColor, darkSidenav, darkMode, miniSidenav } = controller;
  const { pathname } = useLocation();
  const setUser = useAuthStore((state) => state.setUser);
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  useEffect(() => {
    // Check current session
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
    };

    getSession();

    // Listen for auth changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setUser(session.user);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const getRoutes = (allRoutes) =>
    allRoutes.map((route) => {
      if (route.collapse) {
        return getRoutes(route.collapse);
      }
      if (route.route) {
        return <Route exact path={route.route} element={route.component} key={route.key} />;
      }
      return null;
    });

  return (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background: "#27ae60",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {layout === "dashboard" && (
          <Sidenav
            color={sidenavColor}
            brand={darkSidenav || darkMode ? brand : brandDark}
            routes={routes}
          />
        )}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Routes>
            {getRoutes(routes)}
            <Route path="/" element={<Navigate to="/brokeragesAndAccounts" />} />
            <Route path="*" element={<Navigate to="/brokeragesAndAccounts" />} />
          </Routes>
        </Box>
        {/* Always visible sticky footer */}
        <Box
          sx={({ breakpoints, functions: { pxToRem } }) => ({
            background: "#27ae60",
            py: 2,
            px: 3,
            mt: "auto",
            // Add left margin to avoid being covered by sidenav
            [breakpoints.up("xl")]: {
              marginLeft: layout === "dashboard" ? (miniSidenav ? pxToRem(120) : pxToRem(274)) : 0,
              transition: "margin-left 0.3s ease",
            },
          })}
        >
          <Footer />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
