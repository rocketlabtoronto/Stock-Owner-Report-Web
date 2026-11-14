import { Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Sidenav from "ui/Sidenav";
import Footer from "ui/Footer";
import theme from "assets/theme";
import routes from "routes";
import { useCustomController } from "context";

export default function App() {
  const [controller] = useCustomController();
  const { miniSidenav } = controller;
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background: "#f7f7f5",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Sidenav routes={routes} />
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Suspense
            fallback={
              <Box role="status" p={3}>
                Loading...
              </Box>
            }
          >
            <Routes>
              {routes.map((route) => (
                <Route path={route.route} element={route.component} key={route.key} />
              ))}
              <Route path="*" element={<Navigate to="/brokeragesAndAccounts" />} />
            </Routes>
          </Suspense>
        </Box>
        <Box
          sx={({ breakpoints, functions: { pxToRem } }) => ({
            background: "#f7f7f5",
            borderTop: "1px solid #d6d9de",
            py: 2,
            px: 3,
            mt: "auto",
            [breakpoints.up("xl")]: {
              marginLeft: miniSidenav ? pxToRem(120) : pxToRem(274),
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
