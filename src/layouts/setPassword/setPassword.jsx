import { useEffect, useState } from "react";
import AuthPageLayout from "components/AuthPageLayout";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { encrypt } from "../../services/encryptionService";

export default function SetPassword() {
  // Disable menu/sidebar when this page is active
  useEffect(() => {
    // Hide left menu bar and top navbar if present
    const sidebar = document.getElementById("sidenav-main");
    const navbar = document.getElementById("navbar-main");
    if (sidebar) sidebar.style.display = "none";
    if (navbar) navbar.style.display = "none";
    return () => {
      if (sidebar) sidebar.style.display = "";
      if (navbar) navbar.style.display = "";
    };
  }, []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const inputStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #e0e0e0",
  };

  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) {
      setError("Missing or invalid token.");
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("password_reset_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (error || !data || new Date(data.expires_at) < new Date()) {
        setError("Token is invalid or expired.");
      } else {
        setEmail(data.email);
      }
    })();
  }, [token]);

  const handleSetPassword = async () => {
    // Password strength validation
    const passwordErrors = [];
    if (password.length < 8) passwordErrors.push("Password must be at least 8 characters.");
    if (!/[A-Z]/.test(password))
      passwordErrors.push("Password must contain at least one uppercase letter.");
    if (!/[a-z]/.test(password))
      passwordErrors.push("Password must contain at least one lowercase letter.");
    if (!/[0-9]/.test(password)) passwordErrors.push("Password must contain at least one number.");
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password))
      passwordErrors.push("Password must contain at least one special character.");

    if (passwordErrors.length > 0) {
      setError(passwordErrors.join("\n"));
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);

    const passwordHash = await encrypt(password);
    console.log("Password:", password);
    console.log("EncryptedPassword:", passwordHash);

    if (!email)
    {
      setError("Missing email associated with this token.");
      return;
    }
    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("email", email);

      if (!token) {
        setError("Missing reset token.");
        return;
      }
      if (updateError) {
        setError(updateError.message);
      } else {
        await supabase.from("password_reset_tokens").delete().eq("token", token);
        setSuccess(true);
        setTimeout(() => navigate("/login"), 2000);
      }
    setLoading(false);
  };

  const showForm = !error && !!email;
  // Only show info/error page if token is invalid/expired (i.e. no email)
  const showInfoPage = !email;
  return (
    <AuthPageLayout logoPosition="outside" logoStyle={{ border: "2px solid #eee" }}>
      {showInfoPage ? (
        <div
          style={{
            marginBottom: 16,
            textAlign: "left",
            padding: "24px 20px 20px 20px",
            borderRadius: 12,
            background: "#f6f9fc",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            border: "1px solid #e0e5ec",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ marginRight: 10 }}>
              <circle cx="12" cy="12" r="12" fill="#f44336" />
              <path d="M12 7v5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1" fill="#fff" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: 18, color: "#222" }}>
              {error || "Invalid or expired password reset link."}
            </span>
          </div>
          <div style={{ fontSize: 15, color: "#344767", lineHeight: 1.7, marginBottom: 8 }}>
            You have reached this page because you clicked a password setup or activation link.
            <br />
            This may be for setting your password for the first time, or for resetting your
            password.
            <br />
            <br />
            <span style={{ color: "#d32f2f", fontWeight: 500 }}>
              For your security, password setup and reset links are valid for 30 minutes and can
              only be used once. If your link is missing, invalid, or expired, you will need to
              request a new one.
            </span>
            <br />
            <br />
            <span style={{ fontWeight: 600, color: "#222" }}>What to do next</span>
            <br />
            <br />
            Please use the&nbsp;
            <a
              href="/send-password-reset"
              style={{ color: "#5e72e4", textDecoration: "underline", fontWeight: 500 }}
            >
              Send Password Reset
            </a>
            &nbsp;link to request a new password setup or reset link. If you need assistance,
            please contact our support team at:<br></br>
            <a href="mailto:support@stockownerreport.com" style={{ textDecoration: "underline" }}>
              support@stockownerreport.com
            </a>
            .<br />
            <br />
            <span style={{ fontWeight: 500 }}>
              Thank you for helping us keep your account secure.
            </span>
          </div>
        </div>
      ) : (
        <>
          <h2
            style={{
              fontWeight: "bold",
              color: "#344767",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            Set Your Password
          </h2>
          {success ? (
            <div style={{ color: "#388e3c", textAlign: "center" }}>
              Password set successfully! Redirecting to login...
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  style={inputStyle}
                />
              </div>
              {error && (
                <div
                  style={{
                    color: "#d32f2f",
                    marginBottom: 12,
                    textAlign: "left",
                    fontSize: 14,
                    whiteSpace: "pre-line",
                  }}
                >
                  {error}
                </div>
              )}
              <button
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  background: "#5e72e4",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "16px",
                  border: "none",
                  cursor: loading || !email ? "not-allowed" : "pointer",
                }}
                onClick={handleSetPassword}
                disabled={loading || !email}
              >
                {loading ? "Saving..." : "Set Password"}
              </button>
            </>
          )}
        </>
      )}
    </AuthPageLayout>
  );
}
