// Custom Dashboard 2 MUI base styles
import boxShadows from "assets/theme/base/boxShadows";
import typography from "assets/theme/base/typography";
import colors from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";

// Custom Dashboard 2 MUI helper functions
import pxToRem from "assets/theme/functions/pxToRem";

const { lg } = boxShadows;
const { size } = typography;
const { text, white, transparent, light, dark, gradients } = colors;
const { borderRadius } = borders;

const autocomplete = {
  styleOverrides: {
    popper: {
      boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
      padding: pxToRem(8),
      fontSize: size.sm,
      color: text.main,
      textAlign: "left",
      backgroundColor: `${white.main} !important`,
      borderRadius: borderRadius.lg,
    },

    paper: {
      boxShadow: "none",
      backgroundColor: transparent.main,
    },

    option: {
      padding: `${pxToRem(6)} ${pxToRem(16)}`,
      borderRadius: borderRadius.md,
      fontSize: size.sm,
      color: text.main,
      transition: "background-color 300ms ease, color 300ms ease",

      "&:hover, &:focus, &.Mui-selected, &.Mui-selected:hover, &.Mui-selected:focus": {
        backgroundColor: "rgba(45, 108, 223, 0.08)",
        color: dark.main,
      },

      '&[aria-selected="true"]': {
        backgroundColor: "rgba(45, 108, 223, 0.12) !important",
        color: `${dark.main} !important`,
      },
    },

    noOptions: {
      fontSize: size.sm,
      color: text.main,
    },

    groupLabel: {
      color: dark.main,
    },

    loading: {
      fontSize: size.sm,
      color: text.main,
    },

    tag: {
      display: "flex",
      alignItems: "center",
      height: "auto",
      padding: pxToRem(4),
      backgroundColor: gradients.dark.state,
      color: white.main,

      "& .MuiChip-label": {
        lineHeight: 1.2,
        padding: `0 ${pxToRem(10)} 0 ${pxToRem(4)}`,
      },

      "& .MuiSvgIcon-root, & .MuiSvgIcon-root:hover, & .MuiSvgIcon-root:focus": {
        color: white.main,
        marginRight: 0,
      },
    },
  },
};

export default autocomplete;
