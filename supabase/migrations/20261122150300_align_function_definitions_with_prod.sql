-- Re-states the four public functions exactly as they run on Prod.
-- resolve_ticker still references public.security_aliases, which no longer exists; that mirrors Prod.
BEGIN;

SET LOCAL check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.password_reset_tokens_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_ticker(p_alias text, p_exchange text DEFAULT 'US'::text)
RETURNS TABLE(canonical_ticker text, simfin_id integer, econ_factor numeric, votes_per_share numeric)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT sa.canonical_ticker, sa.simfin_id, sa.econ_factor, sa.votes_per_share
  FROM public.security_aliases sa
  WHERE sa.alias_ticker = UPPER(p_alias)
    AND sa.alias_exchange = COALESCE(p_exchange,'US')
  ORDER BY sa.updated_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Upsert a row for the user based on email
  INSERT INTO public.users (email, last_payment_at)
  VALUES (NEW.email, NOW())
  ON CONFLICT (email) DO UPDATE
    SET last_payment_at = EXCLUDED.last_payment_at;

  RETURN NEW;
END;
$$;

COMMIT;
