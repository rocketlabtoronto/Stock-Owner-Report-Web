import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import PropTypes from "prop-types";

export const NAVY = "#0d1b2a";
const BODY = "#1f2937";
export const SUBTLE = "#4b5563";
const RULE = "#e2e5ea";
const ACCENT = "#c9a84c";
export const FS = 13.5;

export const P = (props) => (
  <Box
    component="p"
    sx={{ fontSize: FS, lineHeight: 1.85, color: BODY, fontFamily: "inherit", m: 0, mb: "0.75rem" }}
    {...props}
  />
);

export const Bullets = ({ items }) => (
  <Box component="ul" sx={{ m: 0, pl: "1.5rem", mb: "0.9rem" }}>
    {items.map((item, i) => (
      <Box
        component="li"
        key={i}
        sx={{ fontSize: FS, lineHeight: 1.85, color: BODY, fontFamily: "inherit", mb: "0.3rem" }}
      >
        {item}
      </Box>
    ))}
  </Box>
);
Bullets.propTypes = { items: PropTypes.arrayOf(PropTypes.node).isRequired };

export const SectionHeading = ({ children }) => (
  <Box sx={{ mt: "2rem", mb: "0.75rem" }}>
    <Box
      component="h3"
      sx={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.18em",
        color: SUBTLE,
        fontFamily: "inherit",
        m: 0,
        mb: "0.45rem",
      }}
    >
      {children}
    </Box>
    <Box sx={{ height: "1px", background: RULE, width: "100%" }} />
  </Box>
);
SectionHeading.propTypes = { children: PropTypes.node.isRequired };

export const SubHeading = ({ children }) => (
  <Box
    component="h4"
    sx={{
      fontSize: FS,
      fontWeight: 700,
      color: NAVY,
      fontFamily: "inherit",
      m: 0,
      mt: "1.1rem",
      mb: "0.4rem",
    }}
  >
    {children}
  </Box>
);
SubHeading.propTypes = { children: PropTypes.node.isRequired };

export const D = () => <Box sx={{ mt: "0.25rem" }} />;

export const A = ({ href, children }) => (
  <Link
    href={href}
    sx={{
      color: NAVY,
      fontWeight: 600,
      fontSize: FS,
      textDecoration: "none",
      borderBottom: `1px solid ${ACCENT}`,
      pb: "1px",
      "&:hover": { borderBottomColor: NAVY },
    }}
  >
    {children}
  </Link>
);
A.propTypes = { href: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
