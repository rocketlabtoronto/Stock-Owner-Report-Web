const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

const buildFilterQuery = (filter = {}) => {
  const params = Object.entries(filter)
    .map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`)
    .join("&");
  return params ? `?${params}` : "";
};

const buildEdgeRequest = ({ method = "GET", body } = {}) => ({
  method,
  headers,
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});

const readErrorText = async (res) => {
  try {
    return await res.text();
  } catch {
    return "";
  }
};

const readErrorBody = async (res) => {
  try {
    return await res.json();
  } catch {
    const text = await readErrorText(res);
    return text ? { error: text } : null;
  }
};

const fetchJson = async (url, config, errorPrefix) => {
  const res = await fetch(url, config);
  if (!res.ok) throw new Error(`${errorPrefix}: ${res.status}`);
  return res.json();
};

const supabaseService = {
  async getFinancials(filter = {}) {
    return fetchJson(
      `${SUPABASE_URL}/rest/v1/financials${buildFilterQuery(filter)}`,
      { method: "GET", headers },
      "Supabase error"
    );
  },

  async getStockPrices({ symbol }) {
    return fetchJson(
      `${SUPABASE_URL}/rest/v1/stock_prices?symbol=eq.${encodeURIComponent(
        symbol
      )}&order=latest_day.desc,inserted_at.desc`,
      { method: "GET", headers },
      "Supabase error"
    );
  },

  async getSnapTradeLoginLink(userId, userSecret, redirectURI, options = {}) {
    const broker = options?.broker;
    if (!broker) {
      throw new Error(
        `SnapTrade broker slug missing or not allowlisted (requested: ${options?.broker || "none"}).`
      );
    }
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/login-user`,
      buildEdgeRequest({
        method: "POST",
        body: {
        userId,
        userSecret,
        redirectURI,
        connectionPortalVersion: options?.connectionPortalVersion || "v4",
          broker,
        },
      })
    );
    if (!res.ok) {
      const bodyText = await readErrorText(res);
      throw new Error(
        `SnapTrade login link error: ${res.status}${bodyText ? ` - ${bodyText}` : ""}`
      );
    }
    return res.json();
  },

  async registerUser(userId) {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/snaptrade-register-user-v2`,
      buildEdgeRequest({ method: "POST", body: { userId } })
    );
    if (!res.ok) {
      const errorBody = await readErrorBody(res);
      const message =
        errorBody?.error || `SnapTrade register user error: ${res.status} ${res.statusText}`;
      const err = new Error(message);
      err.status = res.status;
      err.body = errorBody;
      throw err;
    }
    return res.json();
  },

  async insertFinancialRecord(data) {
    return fetchJson(
      `${SUPABASE_URL}/rest/v1/financials`,
      { method: "POST", headers, body: JSON.stringify(data) },
      "Insert failed"
    );
  },
};

export default supabaseService;
