-- Public tables are reachable only through Edge Functions using the service role:
-- RLS is on with no policies, and anon/authenticated hold no table privileges.
BEGIN;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snaptrade_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.users,
  public.password_reset_tokens,
  public.snaptrade_users,
  public.ingest_logs
FROM PUBLIC, anon, authenticated;

COMMIT;
