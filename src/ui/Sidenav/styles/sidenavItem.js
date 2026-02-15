/* eslint-disable no-nested-ternary */

function item(theme, ownerState) {
  const { palette, transitions, breakpoints, boxShadows, borders, functions } = theme;
  const { active, darkSidenav, sidenavColor, miniSidenav } = ownerState;

  const { dark, text, transparent, white } = palette;
  const { xxl } = boxShadows;
  const { borderRadius } = borders;
  const { pxToRem, rgba } = functions;

  return {
    background: active
      ? rgba(palette[sidenavColor ?? "info"].main, sidenavColor ? 1 : 0.14)
      : transparent.main,
    color: () => {
      let result = text.main;

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
    padding: `${pxToRem(12)} ${pxToRem(18)}`,
    margin: `${pxToRem(4)} ${pxToRem(12)}`,
    borderRadius: borderRadius.lg,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    boxShadow: active && darkSidenav ? xxl : "none",
    transition: transitions.create(["background-color", "transform"], {
      easing: transitions.easing.easeInOut,
      duration: transitions.duration.shorter,
    }),

    "&:hover": {
      background: rgba(palette[sidenavColor ?? "info"].main, 0.08),
      transform: "translateY(-1px)",
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
  const { transitions, borders, functions } = theme;
  const { darkSidenav, sidenavColor, active } = ownerState;

  const { borderRadius } = borders;
  const { pxToRem } = functions;

  return {
    color: "inherit",
    minWidth: pxToRem(32),
    minHeight: pxToRem(32),
    borderRadius: borderRadius.md,
    display: "grid",
    placeItems: "center",
    transition: transitions.create("margin", {
      easing: transitions.easing.easeInOut,
      duration: transitions.duration.standard,
    }),

    "& svg, svg g": {
      fill: "currentColor",
    },

    "& i": {
      color: active && (darkSidenav || sidenavColor) ? "inherit" : null,
    },
  };
}

const itemIcon = ({ palette: { white, gradients } }, { active }) => ({
  color: active ? white.main : gradients.dark.state,
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
      fontWeight: active ? fontWeightMedium : fontWeightRegular,
      fontSize: size.sm,
      letterSpacing: "0.2px",
      lineHeight: 0,
    },
  };
}

export { item, itemIconBox, itemIcon, itemText };
