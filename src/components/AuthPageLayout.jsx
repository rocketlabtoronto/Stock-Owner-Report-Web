import React from "react";
import PropTypes from "prop-types";

const baseWrapperStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: 24,
  background: "#f4f5f7",
};

const baseCardStyle = {
  borderRadius: 0,
  padding: 40,
  maxWidth: 420,
  width: "100%",
  background: "#ffffff",
  border: "none",
  borderTop: "3px solid #0d1b2a",
  borderBottom: "1px solid #d6d9de",
  boxShadow: "none",
  position: "relative",
  overflow: "hidden",
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
        <div
          style={{
            height: 3,
            width: "100%",
            background: "#0d1b2a",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />
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
