import { supabase } from "../supabaseClient";
import { useAppStore } from "../stores/store";
import { mapWorkspaceAccountsToSpreadsheet } from "./workspaceMappingService";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const WORKSPACE_PROVIDERS = {
  google: "google",
  microsoft: "azure",
  linkedin: "linkedin_oidc",
};

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || SUPABASE_ANON_KEY;
}

async function callFunction(name, { method = "POST", params, body } = {}) {
  const token = await getAccessToken();
  const url = new URL(`${SUPABASE_URL}/functions/v1/${name}`);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url.toString(), {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const error = new Error(payload?.error || `${name} failed: ${res.status}`);
    error.status = res.status;
    error.body = payload;
    throw error;
  }
  return payload;
}

const workspaceService = {
  // Full-page redirect to the provider; the session is established on return
  // to redirectTo (see src/layouts/AuthCallback.jsx) because detectSessionInUrl
  // is enabled on the shared supabase client.
  signInWithProvider(providerKey, redirectTo) {
    const provider = WORKSPACE_PROVIDERS[providerKey];
    if (!provider) throw new Error(`Unsupported sign-in provider: ${providerKey}`);
    return supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  },

  getSession() {
    return supabase.auth.getSession();
  },

  signOut() {
    return supabase.auth.signOut();
  },

  resolveWorkspace() {
    return callFunction("resolve-workspace", { method: "GET" });
  },

  createWorkspace(workspaceType) {
    return callFunction("create-workspace", { body: { workspaceType } });
  },

  getReferenceData() {
    return callFunction("get-reference-data", { method: "GET" });
  },

  validatePortfolioUpload(workspaceId, rows) {
    return callFunction("validate-portfolio-upload", { body: { workspaceId, rows } });
  },

  importPortfolio(workspaceId, rows) {
    return callFunction("import-portfolio", { body: { workspaceId, rows } });
  },

  getWorkspaceHoldings(workspaceId) {
    return callFunction("get-workspace-holdings", { method: "GET", params: { workspaceId } });
  },

  updateHoldingQuantity(workspaceId, holdingId, quantity) {
    return callFunction("update-holding-quantity", { body: { workspaceId, holdingId, quantity } });
  },

  saveBrokerageConnection(workspaceId, accounts) {
    return callFunction("save-brokerage-connection", { body: { workspaceId, accounts } });
  },
};

// Stores a workspace's saved accounts in the same shape, and through the same
// store action, as a brokerage connection (see SnapTradeRedirect), so both
// sources produce their reports through one pipeline.
export function applyWorkspaceAccountsToStore(accounts) {
  const { upsertAccount } = useAppStore.getState();
  mapWorkspaceAccountsToSpreadsheet(accounts).mappedItems.forEach((item) => {
    upsertAccount({ Account: item.accountRaw, bank: item.bank, holdings: item.holdings });
  });
}

export default workspaceService;
