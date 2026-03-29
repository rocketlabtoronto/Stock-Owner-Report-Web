import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      snapTradeUserId: null,
      snapUserSecret: null,
      setUser: (user) => set({ user }),
      setSnapTradeContext: (snapTradeUserId, snapUserSecret) =>
        set({ snapTradeUserId, snapUserSecret }),
      clearSnapTradeContext: () => set({ snapTradeUserId: null, snapUserSecret: null }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "auth-storage", // name of the item in storage
      getStorage: () => localStorage, // (optional) by default, 'localStorage' is used
      partialize: (state) => ({
        user: state.user,
        snapTradeUserId: state.snapTradeUserId,
        snapUserSecret: state.snapUserSecret,
      }),
    }
  )
);
