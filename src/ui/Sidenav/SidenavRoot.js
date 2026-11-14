import Drawer from "@mui/material/Drawer";
import { styled } from "@mui/material/styles";

export default styled(Drawer)(({ theme, ownerState: { miniSidenav } }) => {
  const {
    palette,
    transitions,
    breakpoints,
    functions: { pxToRem },
  } = theme;

  return {
    "& .MuiDrawer-paper": {
      boxShadow: "none",
      border: "none",
      borderRight: "1px solid #d6d9de",
      backgroundColor: "#ffffff",
      backgroundImage: "none",
      borderRadius: 0,
      margin: 0,
      overflow: "hidden",
      transform: miniSidenav ? `translateX(${pxToRem(-320)})` : "translateX(0)",
      transition: transitions.create("transform", {
        easing: transitions.easing.sharp,
        duration: transitions.duration.shorter,
      }),
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: pxToRem(2),
        background: "#0d1b2a",
        pointerEvents: "none",
      },
      [breakpoints.up("xl")]: {
        backgroundColor: palette.white.main,
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.10)",
        marginBottom: "inherit",
        left: "0",
        width: miniSidenav ? pxToRem(96) : 284,
        ...(miniSidenav && { overflowX: "hidden" }),
        transform: "translateX(0)",
        transition: transitions.create(["width", "background-color"], {
          easing: transitions.easing.sharp,
          duration: miniSidenav
            ? transitions.duration.shorter
            : transitions.duration.enteringScreen,
        }),
      },
    },
  };
});
