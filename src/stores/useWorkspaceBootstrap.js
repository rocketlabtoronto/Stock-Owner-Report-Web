import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "./useWorkspaceStore";
import workspaceService, { applyWorkspaceAccountsToStore } from "../services/workspaceService";

// Lets a returning user land on their existing workspace without re-clicking a
// sign-in button, as long as their Supabase Auth session (OAuth) is still
// valid in this browser. Runs once per app load from App.js.
export default function useWorkspaceBootstrap() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);
  const hasHydrated = useWorkspaceStore((state) => state.hasHydrated);
  const attempted = useRef(false);

  useEffect(() => {
    if (!hasHydrated || attempted.current) return;
    attempted.current = true;

    (async () => {
      try {
        const { data } = await workspaceService.getSession();
        if (!data?.session) return;

        const result = await workspaceService.resolveWorkspace();
        if (!result?.workspace) return;

        setWorkspace(result.workspace);
        const holdings = await workspaceService.getWorkspaceHoldings(result.workspace.id);
        applyWorkspaceAccountsToStore(holdings?.accounts);
      } catch (error) {
        console.error("Workspace bootstrap failed:", error);
      }
    })();
  }, [hasHydrated, setWorkspace]);

  return workspace;
}
