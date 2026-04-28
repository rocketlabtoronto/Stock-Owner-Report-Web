-- ============================================================
-- LookThroughProfits / The Stock Owner Report
-- Remote schema (portable) - owned objects only
-- Includes: schemas, extensions you use, tables, functions, indexes, triggers
-- Excludes: Supabase internal storage triggers and storage schema plumbing
-- ============================================================

-- ---------- Session defaults ----------
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- ---------- Schemas ----------
CREATE SCHEMA IF NOT EXISTS "dashboard";

-- ---------- Extensions (only what your schema needs) ----------
-- Required for citext email columns
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";
-- Commonly useful; safe if already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- ---------- Functions ----------
-- Trigger: maintain updated_at
CREATE OR REPLACE FUNCTION "public"."password_reset_tokens_set_updated_at"()
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Utility: generic set_updated_at (you had it)
CREATE OR REPLACE FUNCTION "public"."set_updated_at"()
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Resolve ticker (you had it)
CREATE OR REPLACE FUNCTION "public"."resolve_ticker"(
  "p_alias" "text",
  "p_exchange" "text" DEFAULT 'US'::"text"
)
RETURNS TABLE(
  "canonical_ticker" "text",
  "simfin_id" integer,
  "econ_factor" numeric,
  "votes_per_share" numeric
)
LANGUAGE "sql"
STABLE
AS $$
  SELECT sa.canonical_ticker, sa.simfin_id, sa.econ_factor, sa.votes_per_share
  FROM public.security_aliases sa
  WHERE sa.alias_ticker = UPPER(p_alias)
    AND sa.alias_exchange = COALESCE(p_exchange,'US')
  ORDER BY sa.updated_at DESC
  LIMIT 1;
$$;

-- Auth trigger function (SAFE with your current users table: no id column)
-- If you don't use Supabase Auth, you can omit the trigger creation at the bottom.
CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
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

-- ---------- Tables (dashboard schema) ----------
CREATE TABLE IF NOT EXISTS "dashboard"."financials" (
  "id" integer NOT NULL,
  "ticker" "text",
  "exchange" "text",
  "fy_end_date" "date",
  "stmt_type" "text",
  "tag" "text",
  "value" numeric,
  "unit" "text",
  "source" "text",
  "inserted_at" timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS "dashboard"."financials_id_seq"
  AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE "dashboard"."financials_id_seq" OWNED BY "dashboard"."financials"."id";
ALTER TABLE ONLY "dashboard"."financials"
  ALTER COLUMN "id" SET DEFAULT nextval('"dashboard"."financials_id_seq"'::regclass);

ALTER TABLE ONLY "dashboard"."financials"
  ADD CONSTRAINT "financials_pkey" PRIMARY KEY ("id");

CREATE TABLE IF NOT EXISTS "dashboard"."stock_prices" (
  "id" integer NOT NULL,
  "symbol" "text" NOT NULL,
  "exchange" "text" DEFAULT 'US'::"text" NOT NULL,
  "open" numeric,
  "high" numeric,
  "low" numeric,
  "price" numeric,
  "volume" bigint,
  "latest_day" "date",
  "previous_close" numeric,
  "change" numeric,
  "change_percent" "text",
  "inserted_at" timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS "dashboard"."stock_prices_id_seq"
  AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE "dashboard"."stock_prices_id_seq" OWNED BY "dashboard"."stock_prices"."id";
ALTER TABLE ONLY "dashboard"."stock_prices"
  ALTER COLUMN "id" SET DEFAULT nextval('"dashboard"."stock_prices_id_seq"'::regclass);

ALTER TABLE ONLY "dashboard"."stock_prices"
  ADD CONSTRAINT "stock_prices_pkey" PRIMARY KEY ("id");

-- Unique constraint you had as index; define as constraint for portability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stock_prices_unique'
      AND conrelid = 'dashboard.stock_prices'::regclass
  ) THEN
    ALTER TABLE "dashboard"."stock_prices"
      ADD CONSTRAINT "stock_prices_unique" UNIQUE ("symbol","latest_day","exchange");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "dashboard"."webhook_logs" (
  "id" integer NOT NULL,
  "event_type" "text" NOT NULL,
  "email" "text",
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
  "error_message" "text" NOT NULL,
  "step" integer NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS "dashboard"."webhook_logs_id_seq"
  AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE "dashboard"."webhook_logs_id_seq" OWNED BY "dashboard"."webhook_logs"."id";
ALTER TABLE ONLY "dashboard"."webhook_logs"
  ALTER COLUMN "id" SET DEFAULT nextval('"dashboard"."webhook_logs_id_seq"'::regclass);

ALTER TABLE ONLY "dashboard"."webhook_logs"
  ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");

-- NOTE: Intentionally NOT creating dashboard.password_reset_tokens
-- because your Edge Functions use the PUBLIC version.

-- ---------- Tables (public schema) ----------
CREATE TABLE IF NOT EXISTS "public"."users" (
  "email" "public"."citext",
  "phone" "text",
  "subscription_interval" "text",
  "last_payment_at" timestamp without time zone,
  "password_hash" "text",
  CONSTRAINT "users_email_uk" UNIQUE ("email")
);

CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
  "email" "public"."citext" NOT NULL,
  "token" "uuid" NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "used_at" timestamp with time zone,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("email"),
  CONSTRAINT "password_reset_tokens_expires_after_created"
    CHECK (("expires_at" > "created_at"))
);

-- You rely on lookups by token; keep token unique
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_uidx"
  ON "public"."password_reset_tokens" USING btree ("token");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx"
  ON "public"."password_reset_tokens" USING btree ("expires_at");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_used_at_idx"
  ON "public"."password_reset_tokens" USING btree ("used_at");

CREATE TABLE IF NOT EXISTS "public"."security_aliases" (
  "alias_ticker" "text" NOT NULL,
  "alias_exchange" "text" DEFAULT 'US'::"text" NOT NULL,
  "canonical_ticker" "text" NOT NULL,
  "simfin_id" integer NOT NULL,
  "company_name" "text" NOT NULL,
  "econ_factor" numeric DEFAULT 1.0 NOT NULL,
  "votes_per_share" numeric,
  "source" "text" DEFAULT 'auto:simfin'::"text" NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "security_aliases_pk" PRIMARY KEY ("alias_ticker", "alias_exchange"),
  CONSTRAINT "security_aliases_econ_factor_check" CHECK (("econ_factor" > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS "public"."class_shares" (
  "simfin_id" integer NOT NULL,
  "alias_ticker" "text" NOT NULL,
  "shares_outstanding" numeric NOT NULL,
  "as_of_date" "date" NOT NULL,
  "source" "text" DEFAULT 'sec'::"text" NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_shares_pk" PRIMARY KEY ("simfin_id", "alias_ticker", "as_of_date")
);

CREATE TABLE IF NOT EXISTS "public"."symbol_availability" (
  "id" integer NOT NULL,
  "ticker" "text" NOT NULL,
  "has_info" boolean DEFAULT false,
  "has_price" boolean DEFAULT false,
  "has_market_cap" boolean DEFAULT false,
  "has_news" boolean DEFAULT false,
  "has_any_data" boolean DEFAULT false,
  "error_message" "text",
  "tested_at" timestamp without time zone DEFAULT now(),
  "source" "text" DEFAULT 'defeatbeta'::"text",
  CONSTRAINT "symbol_availability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "symbol_availability_ticker_key" UNIQUE ("ticker")
);

CREATE SEQUENCE IF NOT EXISTS "public"."symbol_availability_id_seq"
  AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE "public"."symbol_availability_id_seq" OWNED BY "public"."symbol_availability"."id";
ALTER TABLE ONLY "public"."symbol_availability"
  ALTER COLUMN "id" SET DEFAULT nextval('"public"."symbol_availability_id_seq"'::regclass);

CREATE TABLE IF NOT EXISTS "public"."extracted_data" (
  "id" integer NOT NULL,
  "ticker" "text" NOT NULL,
  "data_type" "text" NOT NULL,
  "method_name" "text" NOT NULL,
  "raw_data" "jsonb",
  "metadata" "jsonb",
  "extracted_at" timestamp without time zone DEFAULT now(),
  "source" "text" DEFAULT 'defeatbeta'::"text",
  CONSTRAINT "extracted_data_pkey" PRIMARY KEY ("id")
);

CREATE SEQUENCE IF NOT EXISTS "public"."extracted_data_id_seq"
  AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE "public"."extracted_data_id_seq" OWNED BY "public"."extracted_data"."id";
ALTER TABLE ONLY "public"."extracted_data"
  ALTER COLUMN "id" SET DEFAULT nextval('"public"."extracted_data_id_seq"'::regclass);

CREATE TABLE IF NOT EXISTS "public"."ingest_logs" (
  "id" bigint NOT NULL,
  "script" "text" NOT NULL,
  "status" "text" NOT NULL,
  "message" "text",
  "details" "jsonb",
  "started_at" timestamp with time zone DEFAULT now(),
  "ended_at" timestamp with time zone,
  "duration_ms" integer,
  CONSTRAINT "ingest_logs_pkey" PRIMARY KEY ("id")
);

CREATE SEQUENCE IF NOT EXISTS "public"."ingest_logs_id_seq"
  START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE "public"."ingest_logs_id_seq" OWNED BY "public"."ingest_logs"."id";
ALTER TABLE ONLY "public"."ingest_logs"
  ALTER COLUMN "id" SET DEFAULT nextval('"public"."ingest_logs_id_seq"'::regclass);

CREATE TABLE IF NOT EXISTS "public"."instrument_meta" (
  "symbol" "text" NOT NULL,
  "exchange" "text",
  "yahoo_symbol" "text",
  "quote_type" "text",
  "asset_type" "text",
  "is_etf" boolean,
  "is_mutual_fund" boolean,
  "is_closed_end_fund" boolean,
  "is_trust" boolean,
  "is_index" boolean,
  "category" "text",
  "fund_family" "text",
  "legal_type" "text",
  "currency" "text",
  "underlying_symbol" "text",
  "nav_price" numeric,
  "expense_ratio" numeric,
  "total_assets" numeric,
  "yield" numeric,
  "ytd_return" numeric,
  "three_year_avg_return" numeric,
  "five_year_avg_return" numeric,
  "beta_3y" numeric,
  "long_name" "text",
  "attributes" "jsonb",
  "updated_at" timestamp without time zone DEFAULT now(),
  CONSTRAINT "instrument_meta_pkey" PRIMARY KEY ("symbol")
);

CREATE TABLE IF NOT EXISTS "public"."tmx_issuers" (
  "id" integer NOT NULL,
  "symbol" "text" NOT NULL,
  "root_ticker" "text",
  "co_id" "text",
  "exchange" "text",
  "name" "text",
  "market_cap" numeric,
  "os_shares" numeric,
  "source_sheet" "text",
  "inserted_at" timestamp without time zone DEFAULT now(),
  "type" "text",
  CONSTRAINT "tmx_issuers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "idx_tmx_issuers_symbol_unique" UNIQUE ("symbol")
);

CREATE SEQUENCE IF NOT EXISTS "public"."tmx_issuers_id_seq"
  AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE "public"."tmx_issuers_id_seq" OWNED BY "public"."tmx_issuers"."id";
ALTER TABLE ONLY "public"."tmx_issuers"
  ALTER COLUMN "id" SET DEFAULT nextval('"public"."tmx_issuers_id_seq"'::regclass);

-- ---------- Indexes ----------
CREATE INDEX IF NOT EXISTS "idx_financials_core"
  ON "dashboard"."financials" USING btree ("ticker","fy_end_date","stmt_type");

CREATE INDEX IF NOT EXISTS "idx_financials_ticker_stmt_tag"
  ON "dashboard"."financials" USING btree ("ticker","stmt_type","tag");

CREATE INDEX IF NOT EXISTS "idx_stock_prices_exchange"
  ON "dashboard"."stock_prices" USING btree ("exchange");

CREATE INDEX IF NOT EXISTS "idx_stock_prices_exchange_symbol"
  ON "dashboard"."stock_prices" USING btree ("exchange","symbol");

CREATE INDEX IF NOT EXISTS "idx_stock_prices_symbol"
  ON "dashboard"."stock_prices" USING btree ("symbol");

CREATE INDEX IF NOT EXISTS "idx_stock_prices_symbol_date"
  ON "dashboard"."stock_prices" USING btree ("symbol","latest_day");

CREATE INDEX IF NOT EXISTS "idx_avail_has_any"
  ON "public"."symbol_availability" USING btree ("has_any_data");

CREATE INDEX IF NOT EXISTS "idx_avail_ticker"
  ON "public"."symbol_availability" USING btree ("ticker");

CREATE INDEX IF NOT EXISTS "idx_class_shares_simfin"
  ON "public"."class_shares" USING btree ("simfin_id");

CREATE INDEX IF NOT EXISTS "idx_extract_method"
  ON "public"."extracted_data" USING btree ("method_name");

CREATE INDEX IF NOT EXISTS "idx_extract_ticker"
  ON "public"."extracted_data" USING btree ("ticker");

CREATE INDEX IF NOT EXISTS "idx_ingest_logs_script_started"
  ON "public"."ingest_logs" USING btree ("script","started_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_ingest_logs_status_started"
  ON "public"."ingest_logs" USING btree ("status","started_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_sec_aliases_canon"
  ON "public"."security_aliases" USING btree ("canonical_ticker");

CREATE INDEX IF NOT EXISTS "idx_sec_aliases_simfin"
  ON "public"."security_aliases" USING btree ("simfin_id");

-- ---------- Triggers ----------
-- Keep password_reset_tokens updated_at correct
DROP TRIGGER IF EXISTS "trg_password_reset_tokens_updated_at" ON "public"."password_reset_tokens";
CREATE TRIGGER "trg_password_reset_tokens_updated_at"
BEFORE UPDATE ON "public"."password_reset_tokens"
FOR EACH ROW
EXECUTE FUNCTION "public"."password_reset_tokens_set_updated_at"();

-- OPTIONAL: If you use Supabase Auth and want a users row created when auth.users is inserted:
-- If you do NOT use Supabase Auth, comment out the following two lines.
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
AFTER INSERT ON "auth"."users"
FOR EACH ROW
EXECUTE FUNCTION "public"."handle_new_user"();

-- ============================================================
-- IMPORTANT: DO NOT create storage.* triggers here.
-- Supabase manages storage schema internally.
-- ============================================================