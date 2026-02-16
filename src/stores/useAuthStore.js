import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      snapTradeUserId: null,
      snapUserSecret: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null, snapTradeUserId: null, snapUserSecret: null }),
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
