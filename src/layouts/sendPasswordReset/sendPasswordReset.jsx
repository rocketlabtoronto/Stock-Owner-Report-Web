import { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import AuthPageLayout from "components/AuthPageLayout";
import CustomTypography from "components/CustomTypography";
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const headers = {
  apikey: SUPABASE_ANON_KEY,
  authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "content-type": "application/json",
};

export default function SendPasswordReset() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    // Simple regex for email validation
    return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
  };

  const parseResponse = async (res) => {
    const responseText = await res.text();
    let data = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.warn("Response JSON parse failed:", parseError);
    }
    return { responseText, data };
  };

  const handleSend = async () => {
    setError(null);
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setError("Missing Supabase environment variables.");
      return;
    }
    setLoading(true);
    try {
      const url = `${SUPABASE_URL}/functions/v1/send-password-reset-link-email`;
      const requestConfig = {
        method: "POST",
        headers,
        body: JSON.stringify({ email }),
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
      };

      const res = await fetch(url, requestConfig);
      const { data } = await parseResponse(res);

      if (!res.ok || (data && data.error)) {
        setError((data && data.error) || `Supabase error: ${res.status}`);
        setSuccess(false);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      const isFailedToFetch = err?.message?.includes("Failed to fetch");

      setError(
        isFailedToFetch
          ? "Network error. This is often caused by CORS or a blocked request. Please check the Edge Function CORS settings."
          : "Network error. Please try again later." + err
      );
      setSuccess(false);
    }
    setLoading(false);
  };

  return (
    <AuthPageLayout showLogo={false}>
      <CustomTypography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 3,
          color: "#6b7280",
          textTransform: "uppercase",
          mb: 1,
        }}
      >
        Password Reset
      </CustomTypography>
      <CustomTypography sx={{ fontSize: 15, fontWeight: 600, color: "#0d1b2a", mb: 1.5 }}>
        Request a Password Reset
      </CustomTypography>
      <CustomTypography
        variant="caption"
        color="text"
        sx={{
          fontSize: 13,
          mb: 2.5,
          color: "#5a6473",
          textAlign: "left",
          lineHeight: 1.7,
          display: "block",
        }}
      >
        Enter the email address associated with your account. If an account exists, we’ll send you
        an email with a link to reset your password. Please check your inbox and follow the
        instructions provided.
        <br />
        <br />
        If you’re setting your password for the first time, use the same process. For assistance,
        contact <b>howard@stockownerreport.com</b>.
      </CustomTypography>
      <TextField
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value.slice(0, 36))}
        inputProps={{ maxLength: 36 }}
        fullWidth
        variant="outlined"
        sx={{
          mb: 1.5,
          "& .MuiOutlinedInput-root": {
            minHeight: 44,
            borderRadius: 0,
            "& fieldset": { borderColor: "#d6d9de" },
            "&:hover fieldset": { borderColor: "#8c98a8" },
            "&.Mui-focused fieldset": { borderColor: "#0d1b2a", borderWidth: 1.5 },
          },
          "& .MuiInputBase-input": {
            fontSize: "1.1rem",
            lineHeight: 1.5,
            py: 1.1,
          },
        }}
      />
      {error && (
        <CustomTypography
          variant="caption"
          color="error"
          sx={{ mb: 1.5, textAlign: "left", display: "block" }}
        >
          {error}
        </CustomTypography>
      )}
      {success ? (
        <CustomTypography
          variant="caption"
          color="success"
          sx={{ mb: 1.5, textAlign: "left", display: "block" }}
        >
          If your email is registered, a password reset link has been sent. Please check your inbox.
        </CustomTypography>
      ) : (
        <Button
          variant="contained"
          fullWidth
          sx={{
            py: 1.2,
            fontWeight: 700,
            borderRadius: 0,
            backgroundColor: "#0d1b2a",
            boxShadow: "none",
            textTransform: "uppercase",
            letterSpacing: 1.5,
            fontSize: 12,
            "&:hover": { backgroundColor: "#1a3a5c", boxShadow: "none" },
            "&:disabled": { backgroundColor: "#9ca3af", color: "#fff" },
          }}
          onClick={handleSend}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Password Reset"}
        </Button>
      )}
    </AuthPageLayout>
  );
}
