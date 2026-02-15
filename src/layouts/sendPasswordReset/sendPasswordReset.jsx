import { useState } from "react";
import AuthPageLayout from "components/AuthPageLayout";
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
  const [debugInfo, setDebugInfo] = useState(null);
  const inputStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #e0e0e0",
    marginBottom: 12,
    fontSize: 15,
  };

  const functionUrl = SUPABASE_URL
    ? `${SUPABASE_URL}/functions/v1/send-password-reset-link-email`
    : null;

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
      setDebugInfo({
        stage: "preflight",
        message: "SUPABASE_URL or SUPABASE_ANON_KEY is missing.",
        SUPABASE_URL,
        SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.slice(0, 8)}...` : null,
      });
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

      console.log("🚀 Edge Function Call - sendPasswordReset:");
      console.log("URL:", url);
      console.log("Config:", requestConfig);
      console.log("SUPABASE_URL:", SUPABASE_URL);
      console.log("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY);

      setDebugInfo({
        stage: "request",
        url,
        requestConfig,
        functionUrl,
        origin: window?.location?.origin,
        online: navigator?.onLine,
      });

      const res = await fetch(url, requestConfig);
      const { responseText, data } = await parseResponse(res);

      const debugPayload = {
        status: res.status,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries()),
        rawBody: responseText,
        parsedBody: data,
      };
      setDebugInfo(debugPayload);

      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));
      console.log("Response raw body:", responseText);
      console.log("Response parsed body:", data);

      if (!res.ok || (data && data.error)) {
        setError((data && data.error) || `Supabase error: ${res.status}`);
        setSuccess(false);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      const isFailedToFetch = err?.message?.includes("Failed to fetch");
      let probe = null;
      if (isFailedToFetch) {
        try {
          await fetch(`${SUPABASE_URL}/auth/v1/health`, { mode: "no-cors", cache: "no-store" });
          probe = "no-cors probe succeeded (opaque response)";
        } catch (probeErr) {
          probe = `no-cors probe failed: ${probeErr?.message || probeErr}`;
        }
      }

      setError(
        isFailedToFetch
          ? "Network error. This is often caused by CORS or a blocked request. Please check the Edge Function CORS settings."
          : "Network error. Please try again later." + err
      );
      setSuccess(false);
      setDebugInfo({
        stage: "fetch-error",
        error: {
          name: err?.name,
          message: err?.message,
          stack: err?.stack,
        },
        request: {
          url: `${SUPABASE_URL}/functions/v1/send-password-reset-link-email`,
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
        },
        origin: window?.location?.origin,
        online: navigator?.onLine,
        probe,
        hint:
          "If this is local dev, ensure the Edge Function sets Access-Control-Allow-Origin and handles OPTIONS.",
      });
    }
    setLoading(false);
  };

  return (
    <AuthPageLayout>
      <h4 style={{ fontWeight: "bold", color: "#344767", marginBottom: 16 }}>
        Request a Password Reset
      </h4>
      <div style={{ fontSize: 15, color: "#344767", marginBottom: 18, textAlign: "left" }}>
        Enter the email address associated with your account. If an account exists, we’ll send you an
        email with a link to reset your password. Please check your inbox and follow the instructions
        provided.
        <br />
        <br />
        If you’re setting your password for the first time, use the same process. For assistance,
        contact <b>support@stockownerreport.com</b>.
      </div>
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />
      {error && (
        <div style={{ color: "#d32f2f", marginBottom: 12, textAlign: "left", fontSize: 14 }}>
          {error}
        </div>
      )}
      {success ? (
        <div style={{ color: "#388e3c", marginBottom: 12, textAlign: "left", fontSize: 14 }}>
          If your email is registered, a password reset link has been sent. Please check your
          inbox.
        </div>
      ) : (
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
            cursor: loading ? "not-allowed" : "pointer",
          }}
          onClick={handleSend}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Password Reset"}
        </button>
      )}
      {functionUrl && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          Debug URL:{" "}
          <a href={functionUrl} target="_blank" rel="noreferrer">
            {functionUrl}
          </a>
        </div>
      )}
      {debugInfo && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: "#f6f8fa",
            borderRadius: 6,
            fontSize: 12,
            color: "#344767",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      )}
    </AuthPageLayout>
  );
}
