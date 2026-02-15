import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      snapUserSecret: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      clearUser: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage", // name of the item in storage
      getStorage: () => localStorage, // (optional) by default, 'localStorage' is used
      partialize: (state) => ({
        user: state.user,
        snapUserSecret: state.snapUserSecret,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
