// Business purpose: resolve the signed-in caller's email/provider from the
// Authorization bearer token issued by Supabase Auth (Google/Microsoft/LinkedIn
// sign-in), using the service role so public.workspaces* tables stay locked down
// to anon/authenticated (no direct browser access).
export type AuthenticatedCaller = {
  userId: string;
  email: string;
  provider: string | null;
};

type SupabaseAuthClient = {
  auth: { getUser: (jwt: string) => Promise<{ data: { user: any } | null; error: unknown }> };
};

export async function resolveAuthenticatedCaller(
  req: Request,
  supabase: SupabaseAuthClient
): Promise<AuthenticatedCaller | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  const user = data?.user;
  if (error || !user?.email) return null;

  const provider = (user.app_metadata as { provider?: string } | undefined)?.provider ?? null;
  return { userId: user.id, email: user.email, provider };
}
