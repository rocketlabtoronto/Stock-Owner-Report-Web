import Link from "@mui/material/Link";
import CustomBox from "components/CustomBox";
import CustomTypography from "components/CustomTypography";

const textStyle = { lineHeight: 1, fontSize: 12, color: "#6b7280" };
const links = [
  { name: "Privacy", href: "/privacy" },
  { name: "Terms", href: "/terms" },
  { name: "Our Principles", href: "/our-principles" },
];

export default function Footer() {
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
      <CustomTypography variant="button" fontWeight="regular" color="secondary" sx={textStyle}>
        &copy; {new Date().getFullYear()} LookThroughProfits, Inc. | 169 Madison Ave STE 38180, New York,
        NY 10016 | howard@stockownerreport.com
      </CustomTypography>
      {links.map(({ name, href }) => (
        <Link
          key={name}
          href={href}
          rel="noreferrer"
          sx={{ ml: 2, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          <CustomTypography variant="button" fontWeight="regular" color="secondary" sx={textStyle}>
            {name}
          </CustomTypography>
        </Link>
      ))}
    </CustomBox>
  );
}
