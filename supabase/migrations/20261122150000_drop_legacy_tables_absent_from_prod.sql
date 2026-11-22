-- Prod is the schema reference and has none of these tables; only the early baseline snapshot created them.
-- No-op on Prod and Dev, where they do not exist. Their owned sequences are dropped with them.
DROP TABLE IF EXISTS public.security_aliases;
DROP TABLE IF EXISTS public.class_shares;
DROP TABLE IF EXISTS public.symbol_availability;
DROP TABLE IF EXISTS public.extracted_data;
DROP TABLE IF EXISTS public.instrument_meta;
DROP TABLE IF EXISTS public.tmx_issuers;
