// @mui material components
import Drawer from "@mui/material/Drawer";
import { styled } from "@mui/material/styles";

export default styled(Drawer)(({ theme, ownerState }) => {
  const { palette, boxShadows, transitions, breakpoints, functions } = theme;
  const { darkSidenav, miniSidenav, layout } = ownerState;

  const sidebarWidth = 284;
  const { white, background, transparent } = palette;
  const { xxl } = boxShadows;
  const { pxToRem } = functions;
  const softShadow = "0 18px 48px rgba(15, 23, 42, 0.12)";

  let bgColor;

  if ((darkSidenav && layout === "landing") || (!darkSidenav && layout === "landing")) {
    bgColor = transparent.main;
  } else if (darkSidenav) {
    bgColor = background.dark;
  } else {
    bgColor = white.main;
  }

  // styles for the sidenav when miniSidenav={false}
  const drawerOpenStyles = () => ({
    transform: "translateX(0)",
    transition: transitions.create("transform", {
      easing: transitions.easing.sharp,
      duration: transitions.duration.shorter,
    }),

    [breakpoints.up("xl")]: {
      backgroundColor: bgColor,
      boxShadow: darkSidenav ? "none" : softShadow,
      marginBottom: darkSidenav ? 0 : "inherit",
      left: "0",
      width: sidebarWidth,
      transform: "translateX(0)",
      transition: transitions.create(["width", "background-color"], {
        easing: transitions.easing.sharp,
        duration: transitions.duration.enteringScreen,
      }),
    },
  });

  // styles for the sidenav when miniSidenav={true}
  const drawerCloseStyles = () => ({
    transform: `translateX(${pxToRem(-320)})`,
    transition: transitions.create("transform", {
      easing: transitions.easing.sharp,
      duration: transitions.duration.shorter,
    }),

    [breakpoints.up("xl")]: {
      backgroundColor: bgColor,
      boxShadow: darkSidenav ? "none" : softShadow,
      marginBottom: darkSidenav ? 0 : "inherit",
      left: "0",
      width: pxToRem(96),
      overflowX: "hidden",
      transform: "translateX(0)",
      transition: transitions.create(["width", "background-color"], {
        easing: transitions.easing.sharp,
        duration: transitions.duration.shorter,
      }),
    },
  });

  return {
    "& .MuiDrawer-paper": {
      boxShadow: softShadow,
      border: "none",
      backgroundColor: bgColor,
      borderRadius: pxToRem(20),
      margin: `${pxToRem(16)} 0 ${pxToRem(16)} ${pxToRem(16)}`,

      ...(miniSidenav ? drawerCloseStyles() : drawerOpenStyles()),
    },
  };
});
