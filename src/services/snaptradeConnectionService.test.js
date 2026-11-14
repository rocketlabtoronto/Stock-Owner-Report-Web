import { useAuthStore } from "stores/useAuthStore";
import supabaseService from "./supabaseService";
import { getSnapTradeContext } from "./snaptradeConnectionService";

jest.mock("./supabaseService", () => ({ registerUser: jest.fn() }));

beforeEach(() => {
  useAuthStore.setState({ snapTradeUserId: null, snapUserSecret: null });
  supabaseService.registerUser.mockReset();
});

test("reuses stored credentials without registering or replacing them", async () => {
  useAuthStore.setState({ snapTradeUserId: " user-123 ", snapUserSecret: " stored-secret " });
  await expect(getSnapTradeContext()).resolves.toEqual({
    userId: "user-123",
    userSecret: "stored-secret",
  });
  expect(supabaseService.registerUser).not.toHaveBeenCalled();
  expect(useAuthStore.getState().snapUserSecret).toBe(" stored-secret ");
});

test("shares registration across concurrent calls and persists the resulting context", async () => {
  let complete;
  supabaseService.registerUser.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    })
  );
  const first = getSnapTradeContext();
  const second = getSnapTradeContext();
  expect(supabaseService.registerUser).toHaveBeenCalledTimes(1);
  complete({ userSecret: "new-secret" });
  const context = await first;
  await expect(second).resolves.toEqual(context);
  expect(context.userSecret).toBe("new-secret");
  expect(useAuthStore.getState()).toMatchObject({
    snapTradeUserId: context.userId,
    snapUserSecret: context.userSecret,
  });
});

test("leaves existing state intact after registration fails and allows a later retry", async () => {
  useAuthStore.setState({ snapTradeUserId: "incomplete" });
  supabaseService.registerUser
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ userSecret: "ok" });
  await expect(getSnapTradeContext()).rejects.toThrow("Failed to register");
  expect(useAuthStore.getState().snapTradeUserId).toBe("incomplete");
  await expect(getSnapTradeContext()).resolves.toMatchObject({ userSecret: "ok" });
});
