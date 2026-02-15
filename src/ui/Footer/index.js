// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Link from "@mui/material/Link";

// Custom Dashboard 2 MUI components
import CustomBox from "components/CustomBox";
import CustomTypography from "components/CustomTypography";

// Custom Dashboard 2 MUI base styles
import typography from "assets/theme/base/typography";

function Footer({ company = { href: "#", name: "Company" }, links = [] }) {
  const { href, name } = company;
  const { size } = typography;

  return (
    <CustomBox
      width="100%"
      display="flex"
      justifyContent="center"
      alignItems="center"
      px={1.5}
      py={1}
      flexWrap="wrap"
      gap={1}
    >
      <CustomTypography variant="button" fontWeight="regular" color="white" sx={{ lineHeight: 1 }}>
        © {new Date().getFullYear()} LookThroughProfits, Inc. | 169 Madison Ave STE 38180, New York,
        NY 10016 | support@stockownerreport.com
      </CustomTypography>

      {[
        { name: "Privacy", href: "/privacy" },
        { name: "Terms", href: "/terms" },
      ].map((link) => (
        <Link
          key={link.name}
          href={link.href}
          rel="noreferrer"
          sx={{
            ml: 2,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <CustomTypography
            variant="button"
            fontWeight="regular"
            color="white"
            sx={{ lineHeight: 1 }}
          >
            {link.name}
          </CustomTypography>
        </Link>
      ))}
    </CustomBox>
  );
}

// Setting default values for the props of Footer
Footer.defaultProps = {
  company: { href: "https://lookthroughprofits.com/", name: "LookThroughProfits" },
};

// Typechecking props for the Footer
Footer.propTypes = {
  company: PropTypes.objectOf(PropTypes.string),
  links: PropTypes.arrayOf(PropTypes.object),
};

export default Footer;
