import { useAuthStore } from "stores/useAuthStore";
import supabaseService from "./supabaseService";

const isNonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
let registration;

// Share registration while requests overlap; rejected stored credentials are never replaced here.
export async function getSnapTradeContext() {
  const { snapTradeUserId, snapUserSecret } = useAuthStore.getState();
  if (isNonEmpty(snapTradeUserId) && isNonEmpty(snapUserSecret)) {
    return { userId: snapTradeUserId.trim(), userSecret: snapUserSecret.trim() };
  }
  if (!registration) {
    registration = (async () => {
      const userId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const result = await supabaseService.registerUser(userId);
      if (!isNonEmpty(result?.userSecret)) {
        throw new Error("Failed to register with SnapTrade. Please try again later.");
      }
      useAuthStore.getState().setSnapTradeContext(userId, result.userSecret);
      return { userId, userSecret: result.userSecret };
    })().finally(() => {
      registration = undefined;
    });
  }
  return registration;
}
