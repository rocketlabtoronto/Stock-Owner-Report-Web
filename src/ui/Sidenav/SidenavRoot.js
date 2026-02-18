// @mui material components
import Drawer from "@mui/material/Drawer";
import { styled } from "@mui/material/styles";

export default styled(Drawer)(({ theme, ownerState }) => {
  const { palette, boxShadows, transitions, breakpoints, functions } = theme;
  const { darkSidenav, miniSidenav, layout } = ownerState;

  const sidebarWidth = 284;
  const { white, background, transparent, dark, info } = palette;
  const { xxl } = boxShadows;
  const { pxToRem } = functions;
  const softShadow = "0 10px 28px rgba(15, 23, 42, 0.10)";

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
      border: `1px solid ${darkSidenav ? "transparent" : "rgba(15, 23, 42, 0.08)"}`,
      backgroundColor: bgColor,
      backgroundImage: darkSidenav
        ? "none"
        : `linear-gradient(180deg, ${white.main} 0%, rgba(236, 242, 255, 0.45) 100%)`,
      borderRadius: pxToRem(14),
      margin: `${pxToRem(16)} 0 ${pxToRem(16)} ${pxToRem(16)}`,
      overflow: "hidden",

      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: pxToRem(3),
        background: darkSidenav
          ? "transparent"
          : `linear-gradient(90deg, ${info.main}, rgba(46, 125, 50, 0.8))`,
        pointerEvents: "none",
      },

      ...(miniSidenav ? drawerCloseStyles() : drawerOpenStyles()),
    },
  };
});
