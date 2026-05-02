BEGIN;

-- Pin function search_path for advisor warning remediation.
ALTER FUNCTION public.password_reset_tokens_set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.resolve_ticker(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- Restrict direct execution of SECURITY DEFINER helper from API roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Ensure extension is not in public schema.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'citext') THEN
    EXECUTE 'ALTER EXTENSION citext SET SCHEMA extensions';
  END IF;
END $$;

COMMIT;
