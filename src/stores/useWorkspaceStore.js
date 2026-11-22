import { create } from "zustand";
import { persist } from "zustand/middleware";

// Workspace sign-in (Google/Microsoft/LinkedIn) is independent of the
// subscription login in useAuthStore. A workspace belongs to exactly one
// email and has a fixed type: "upload_portfolio" or "connect_brokerage".
export const useWorkspaceStore = create(
  persist(
    (set) => ({
      workspace: null,
      hasHydrated: false,
      setWorkspace: (workspace) => set({ workspace }),
      clearWorkspace: () => set({ workspace: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "workspace-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({ workspace: state.workspace }),
    }
  )
);
