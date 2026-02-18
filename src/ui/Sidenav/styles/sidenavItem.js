/* eslint-disable no-nested-ternary */

function item(theme, ownerState) {
  const { palette, transitions, breakpoints, boxShadows, borders, functions } = theme;
  const { active, darkSidenav, sidenavColor, miniSidenav } = ownerState;

  const { dark, transparent, white } = palette;
  const { xxl } = boxShadows;
  const { borderRadius } = borders;
  const { pxToRem, rgba } = functions;
  const accentColor = palette[sidenavColor ?? "info"].main;

  return {
    background: active
      ? `linear-gradient(90deg, ${rgba(accentColor, darkSidenav ? 0.42 : 0.22)} 0%, ${rgba(
          accentColor,
          darkSidenav ? 0.18 : 0.1
        )} 100%)`
      : transparent.main,
    color: () => {
      let result = dark.main;

      if ((active && sidenavColor) || (active && darkSidenav) || darkSidenav) {
        result = white.main;
      } else if (active) {
        result = dark.main;
      }

      return result;
    },
    display: miniSidenav ? "block" : "flex",
    alignItems: "center",
    width: "100%",
    padding: `${pxToRem(9)} ${pxToRem(16)}`,
    margin: `${pxToRem(1)} ${pxToRem(10)}`,
    borderRadius: borderRadius.md,
    borderLeft: `${pxToRem(3)} solid ${active ? accentColor : "transparent"}`,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    boxShadow: active ? (darkSidenav ? xxl : `0 8px 20px ${rgba(accentColor, 0.2)}`) : "none",
    transform: "translateX(0)",
    transition: transitions.create(["background-color", "box-shadow", "transform", "border-color"], {
      easing: transitions.easing.easeInOut,
      duration: transitions.duration.shorter,
    }),

    "&:hover": {
      background: `linear-gradient(90deg, ${rgba(accentColor, darkSidenav ? 0.34 : 0.16)} 0%, ${rgba(
        accentColor,
        darkSidenav ? 0.16 : 0.08
      )} 100%)`,
      transform: "translateX(2px)",
      boxShadow: darkSidenav ? xxl : `0 8px 18px ${rgba(accentColor, 0.16)}`,
    },

    [breakpoints.up("xl")]: {
      boxShadow: () => {
        if (active) {
          return darkSidenav ? xxl : "none";
        }

        return "none";
      },
    },
  };
}

function itemIconBox(theme, ownerState) {
  const { transitions, borders, functions, palette } = theme;
  const { darkSidenav, sidenavColor, active } = ownerState;

  const { borderRadius } = borders;
  const { pxToRem, rgba } = functions;
  const accentColor = palette[sidenavColor ?? "info"].main;

  return {
    color: "inherit",
    minWidth: pxToRem(32),
    minHeight: pxToRem(32),
    background: active ? rgba(accentColor, darkSidenav ? 0.36 : 0.2) : rgba(accentColor, 0.08),
    borderRadius: borderRadius.md,
    display: "grid",
    placeItems: "center",
    transition: transitions.create(["margin", "background-color", "transform"], {
      easing: transitions.easing.easeInOut,
      duration: transitions.duration.standard,
    }),

    "& svg, svg g": {
      fill: "currentColor",
    },

    "& i": {
      color: active && (darkSidenav || sidenavColor) ? "inherit" : null,
    },

    "&:hover": {
      transform: "scale(1.04)",
    },
  };
}

const itemIcon = ({ palette: { white, dark } }, { active }) => ({
  color: active ? white.main : dark.main,
});

function itemText(theme, ownerState) {
  const { typography, transitions, breakpoints, functions } = theme;
  const { miniSidenav, active } = ownerState;

  const { size, fontWeightMedium, fontWeightRegular } = typography;
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
