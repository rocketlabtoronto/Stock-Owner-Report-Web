import { supabase } from "../supabaseClient";
import workspaceService from "./workspaceService";

jest.mock("../supabaseClient", () => ({
  supabase: { auth: { signInWithOAuth: jest.fn() } },
}));

const redirectTo = "https://app.stockownerreport.com/auth/callback";

beforeEach(() => {
  supabase.auth.signInWithOAuth.mockReset();
});

test("Microsoft requests the email scope required to create a workspace", async () => {
  const result = { data: { url: "https://login.microsoftonline.com/" }, error: null };
  supabase.auth.signInWithOAuth.mockResolvedValue(result);

  await expect(workspaceService.signInWithProvider("microsoft", redirectTo)).resolves.toBe(result);
  expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
    provider: "azure",
    options: { redirectTo, scopes: "email" },
  });
});

test.each([
  ["google", "google"],
  ["linkedin", "linkedin_oidc"],
])("%s keeps its existing provider and redirect options", (key, provider) => {
  workspaceService.signInWithProvider(key, redirectTo);

  expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
    provider,
    options: { redirectTo },
  });
});

test("unsupported providers are rejected before starting OAuth", () => {
  expect(() => workspaceService.signInWithProvider("unknown", redirectTo)).toThrow(
    "Unsupported sign-in provider"
  );
  expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
});
