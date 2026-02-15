import React from "react";
import PropTypes from "prop-types";

const baseWrapperStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "#27ae60",
};

const baseCardStyle = {
  background: "white",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  padding: 32,
  maxWidth: 400,
  width: "100%",
};

const baseLogoStyle = {
  maxWidth: 150,
  height: "auto",
  border: "0px solid #eee",
  background: "#fff",
  borderRadius: 8,
  display: "inline-block",
};

export default function AuthPageLayout({
  logoSrc,
  logoAlt,
  children,
  wrapperStyle,
  cardStyle,
  logoStyle,
  logoPosition,
  showLogo,
}) {
  const logo = showLogo ? (
    <div style={{ marginBottom: 24, textAlign: "center" }}>
      <img
        src={logoSrc}
        alt={logoAlt}
        style={{ ...baseLogoStyle, ...logoStyle }}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = "https://via.placeholder.com/180x50?text=Logo+Not+Found";
        }}
      />
    </div>
  ) : null;

  return (
    <div style={{ ...baseWrapperStyle, ...wrapperStyle }}>
      {logoPosition === "outside" && logo}
      <div style={{ ...baseCardStyle, ...cardStyle }}>
        {logoPosition === "inside" && logo}
        {children}
      </div>
    </div>
  );
}

AuthPageLayout.propTypes = {
  logoSrc: PropTypes.string,
  logoAlt: PropTypes.string,
  children: PropTypes.node.isRequired,
  wrapperStyle: PropTypes.object,
  cardStyle: PropTypes.object,
  logoStyle: PropTypes.object,
  logoPosition: PropTypes.oneOf(["inside", "outside"]),
  showLogo: PropTypes.bool,
};

AuthPageLayout.defaultProps = {
  logoSrc: "/logos/logo_image.png",
  logoAlt: "LookThroughProfits Logo",
  wrapperStyle: {},
  cardStyle: {},
  logoStyle: {},
  logoPosition: "inside",
  showLogo: true,
};
