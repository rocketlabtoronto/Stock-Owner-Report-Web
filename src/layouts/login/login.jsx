import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import { supabase } from "../../supabaseClient";
import { useAuthStore } from "../../stores/useAuthStore";
import { useNavigate } from "react-router-dom";
import AuthPageLayout from "components/AuthPageLayout";
import CustomTypography from "components/CustomTypography";
const logo = "/logos/logo_image.jpg";
const EMAIL_MAX_LENGTH = 36;
const PASSWORD_MAX_LENGTH = 36;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  useEffect(() => {
    setEmail("");
    setPassword("");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSubscriptionExpired(false);
    try {
      // public.users has RLS enabled with no anon/authenticated grants, so
      // credential verification happens server-side via a service-role Edge
      // Function rather than a direct table query from the browser.
      const { data, error } = await supabase.functions.invoke("authenticate-user", {
        body: { email, password },
      });

      if (error || !data) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      if (!data.success) {
        if (data.subscriptionExpired) {
          // Subscription has lapsed. Tell the user when it expired and give them
          // a clear path to renew. The dialog state renders the billing CTA.
          const formattedExpiry = new Date(data.expiresAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          setError(`Your subscription expired on ${formattedExpiry}.\nPlease renew to continue.`);
          setSubscriptionExpired(true);
        } else {
          setError(data.error || "Invalid email or password.");
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
      setUser(data.user);
      navigate("/brokeragesAndAccounts");
    } catch (err) {
      setError("Login failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <AuthPageLayout logoSrc={logo} cardStyle={{ padding: 16 }}>
      <CustomTypography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#6b7280", textTransform: "uppercase", mb: 0.5, textAlign: "center" }}>
        Investor Dashboard
      </CustomTypography>
      <CustomTypography sx={{ fontSize: 16, fontWeight: 600, color: "#0d1b2a", mb: 2, textAlign: "center" }}>
        Sign In to Your Account
      </CustomTypography>
      {success ? (
        <CustomTypography variant="caption" color="success" sx={{ textAlign: "center", display: "block" }}>
          Login successful! Redirecting...
        </CustomTypography>
      ) : (
        <>
          <form onSubmit={handleLogin} autoComplete="off">
            <TextField
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, EMAIL_MAX_LENGTH))}
              autoComplete="off"
              inputProps={{ maxLength: EMAIL_MAX_LENGTH, autoComplete: "off", name: "login-email-input" }}
              required
              fullWidth
              variant="outlined"
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  minHeight: 46,
                  borderRadius: 0,
                  "& fieldset": { borderColor: "#d6d9de" },
                  "&:hover fieldset": { borderColor: "#9ca3af" },
                  "&.Mui-focused fieldset": { borderColor: "#0d1b2a", borderWidth: 1.5 },
                },
                "& .MuiInputBase-input": {
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                  py: 1.3,
                },
              }}
            />
            <TextField
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, PASSWORD_MAX_LENGTH))}
              autoComplete="new-password"
              inputProps={{
                maxLength: PASSWORD_MAX_LENGTH,
                autoComplete: "new-password",
                name: "login-password-input",
              }}
              required
              fullWidth
              variant="outlined"
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  minHeight: 46,
                  borderRadius: 0,
                  "& fieldset": { borderColor: "#d6d9de" },
                  "&:hover fieldset": { borderColor: "#9ca3af" },
                  "&.Mui-focused fieldset": { borderColor: "#0d1b2a", borderWidth: 1.5 },
                },
                "& .MuiInputBase-input": {
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                  py: 1.3,
                },
              }}
            />
            {error && (
              <CustomTypography
                variant="caption"
                color="error"
                sx={{ mb: subscriptionExpired ? 0.5 : 1.5, textAlign: "left", whiteSpace: "pre-line", display: "block" }}
              >
                {error}
              </CustomTypography>
            )}
            {subscriptionExpired && (
              <Button
                variant="outlined"
                fullWidth
                href="/billing"
                sx={{ mb: 1.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, borderRadius: 0, borderColor: "#0d1b2a", color: "#0d1b2a", fontSize: 12 }}
              >
                Renew Subscription
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ py: 1.2, fontWeight: 700, borderRadius: 0, backgroundColor: "#0d1b2a", boxShadow: "none", textTransform: "uppercase", letterSpacing: 1.5, fontSize: 13, "&:hover": { backgroundColor: "#1a3a5c", boxShadow: "none" }, "&:disabled": { backgroundColor: "#9ca3af", color: "#fff" } }}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <CustomTypography variant="caption" color="text" sx={{ textAlign: "center", mt: 2.25 }}>
            Forgot your password?&nbsp;
            <Link href="/send-password-reset" sx={{ color: "primary.main", textDecoration: "underline", fontWeight: 600 }}>
              Send Password Reset
            </Link>
          </CustomTypography>
          <CustomTypography
            variant="caption"
            color="text"
            sx={{ textAlign: "center", mt: 1.5, display: "block" }}
          >
            Don&apos;t have an account?
          </CustomTypography>
          <CustomTypography variant="caption" color="text" sx={{ textAlign: "center", mt: 0.5, display: "block" }}>
            <Link href="/billing" sx={{ color: "primary.main", textDecoration: "underline", fontWeight: 600 }}>
              Sign Up
            </Link>
          </CustomTypography>
        </>
      )}
    </AuthPageLayout>
  );
}

export default Login;
