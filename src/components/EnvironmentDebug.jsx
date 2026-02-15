import React from "react";

export default function EnvironmentDebug() {
  return (
    <div style={{ padding: "20px", backgroundColor: "#f5f5f5", margin: "20px" }}>
      <h3>Environment Variables Debug</h3>
      <p>
        <strong>NODE_ENV:</strong> {process.env.NODE_ENV}
      </p>
      <p>
        <strong>REACT_APP_SUPABASE_URL:</strong> {process.env.REACT_APP_SUPABASE_URL || "UNDEFINED"}
      </p>
      <p>
        <strong>REACT_APP_SUPABASE_ANON_KEY:</strong>{" "}
        {process.env.REACT_APP_SUPABASE_ANON_KEY ? "DEFINED" : "UNDEFINED"}
      </p>
      <p>
        <strong>All REACT_APP_ vars:</strong>
      </p>
      <pre>
        {JSON.stringify(
          Object.keys(process.env)
            .filter((key) => key.startsWith("REACT_APP_"))
            .reduce((obj, key) => {
              obj[key] = key.includes("KEY") ? "HIDDEN" : process.env[key];
              return obj;
            }, {}),
          null,
          2
        )}
      </pre>
    </div>
  );
}
