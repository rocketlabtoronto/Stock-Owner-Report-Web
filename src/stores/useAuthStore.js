import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      snapTradeUserId: null,
      snapUserSecret: null,
      hasHydrated: false,
      setUser: (user) => set({ user }),
      setSnapTradeContext: (snapTradeUserId, snapUserSecret) =>
        set({ snapTradeUserId, snapUserSecret }),
      clearSnapTradeContext: () => set({ snapTradeUserId: null, snapUserSecret: null }),
      clearUser: () => set({ user: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "auth-storage",
      getStorage: () => localStorage,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        snapTradeUserId: state.snapTradeUserId,
        snapUserSecret: state.snapUserSecret,
      }),
    }
  )
);
