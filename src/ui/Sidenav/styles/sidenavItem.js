/* eslint-disable no-nested-ternary */

function item(theme, ownerState) {
  const { palette, transitions, breakpoints, functions } = theme;
  const { active, miniSidenav } = ownerState;

  const { dark, transparent } = palette;
  const { pxToRem } = functions;

  return {
    background: active ? "#f0f2f5" : transparent.main,
    color: dark.main,
    display: miniSidenav ? "block" : "flex",
    alignItems: "center",
    width: "100%",
    padding: `${pxToRem(8)} ${pxToRem(14)}`,
    margin: `${pxToRem(1)} ${pxToRem(6)}`,
    borderRadius: 0,
    borderLeft: `${pxToRem(3)} solid ${active ? "#0d1b2a" : "transparent"}`,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    boxShadow: "none",
    transform: "none",
    transition: transitions.create(["background-color", "border-color"], {
      easing: transitions.easing.easeInOut,
      duration: transitions.duration.shorter,
    }),

    "&:hover": {
      background: "#f0f2f5",
      transform: "none",
      boxShadow: "none",
    },

    [breakpoints.up("xl")]: {
      boxShadow: "none",
    },
  };
}

function itemIconBox(theme, ownerState) {
  const { transitions, functions } = theme;
  const { active } = ownerState;

  const { pxToRem } = functions;

  return {
    color: active ? "#0d1b2a" : "#6b7280",
    minWidth: pxToRem(30),
    minHeight: pxToRem(30),
    background: "transparent",
    borderRadius: 0,
    display: "grid",
    placeItems: "center",
    transition: transitions.create(["color"], {
      easing: transitions.easing.easeInOut,
      duration: transitions.duration.standard,
    }),

    "& svg, svg g": {
      fill: "currentColor",
    },

    "& i": {
      color: "inherit",
    },

    "&:hover": {
      transform: "none",
    },
  };
}

const itemIcon = ({ palette: { white, dark } }, { active }) => ({
  color: active ? white.main : dark.main,
});

function itemText(theme, ownerState) {
  const { typography, transitions, breakpoints, functions } = theme;
  const { miniSidenav, active } = ownerState;

  const { fontWeightMedium } = typography;
  const { pxToRem } = functions;

  return {
    color: "inherit",
    marginLeft: pxToRem(4),

    [breakpoints.up("xl")]: {
      opacity: miniSidenav ? 0 : 1,
      maxWidth: miniSidenav ? 0 : "100%",
      marginLeft: miniSidenav ? 0 : pxToRem(4),
      transition: transitions.create(["opacity", "margin"], {
        easing: transitions.easing.easeInOut,
        duration: transitions.duration.standard,
      }),
    },

    "& span": {
      color: "inherit",
      fontWeight: active ? 700 : fontWeightMedium,
      fontSize: pxToRem(15.5),
      fontFamily: typography.fontFamily,
      letterSpacing: "0.1px",
      lineHeight: 1.35,
    },
  };
}

export { item, itemIconBox, itemIcon, itemText };
