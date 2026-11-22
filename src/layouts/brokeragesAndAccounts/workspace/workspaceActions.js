const PENDING_ACTION_KEY = "sor_pending_workspace_action";

export const ACTION_TO_WORKSPACE_TYPE = {
  upload: "upload_portfolio",
  brokerage: "connect_brokerage",
};

export function setPendingWorkspaceAction(action) {
  try {
    sessionStorage.setItem(PENDING_ACTION_KEY, action);
  } catch {
    // sessionStorage unavailable — the user simply lands on the dashboard after sign-in.
  }
}

export function takePendingWorkspaceAction() {
  try {
    const value = sessionStorage.getItem(PENDING_ACTION_KEY);
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    return value;
  } catch {
    return null;
  }
}
