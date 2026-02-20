

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "dashboard";


ALTER SCHEMA "dashboard" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RAISE NOTICE '[TRIGGER] New auth user ID: %', NEW.id;

  BEGIN
    INSERT INTO public.users (id, email, last_payment_at)
    VALUES (NEW.id, NEW.email, now());
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '[TRIGGER ERROR] %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."password_reset_tokens_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."password_reset_tokens_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_ticker"("p_alias" "text", "p_exchange" "text" DEFAULT 'US'::"text") RETURNS TABLE("canonical_ticker" "text", "simfin_id" integer, "econ_factor" numeric, "votes_per_share" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  select sa.canonical_ticker, sa.simfin_id, sa.econ_factor, sa.votes_per_share
  from public.security_aliases sa
  where sa.alias_ticker = upper(p_alias) and sa.alias_exchange = coalesce(p_exchange,'US')
  order by sa.updated_at desc
  limit 1;
$$;


ALTER FUNCTION "public"."resolve_ticker"("p_alias" "text", "p_exchange" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


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
    "inserted_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "dashboard"."financials" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "dashboard"."financials_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "dashboard"."financials_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "dashboard"."financials_id_seq" OWNED BY "dashboard"."financials"."id";



CREATE TABLE IF NOT EXISTS "dashboard"."password_reset_tokens" (
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "dashboard"."password_reset_tokens" OWNER TO "postgres";


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
    "inserted_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "dashboard"."stock_prices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "dashboard"."stock_prices_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "dashboard"."stock_prices_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "dashboard"."stock_prices_id_seq" OWNED BY "dashboard"."stock_prices"."id";



CREATE TABLE IF NOT EXISTS "dashboard"."webhook_errors" (
    "id" integer NOT NULL,
    "event_type" "text" NOT NULL,
    "email" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "error_message" "text" NOT NULL,
    "step" integer NOT NULL
);


ALTER TABLE "dashboard"."webhook_errors" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "dashboard"."webhook_errors_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "dashboard"."webhook_errors_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "dashboard"."webhook_errors_id_seq" OWNED BY "dashboard"."webhook_errors"."id";



CREATE TABLE IF NOT EXISTS "public"."class_shares" (
    "simfin_id" integer NOT NULL,
    "alias_ticker" "text" NOT NULL,
    "shares_outstanding" numeric NOT NULL,
    "as_of_date" "date" NOT NULL,
    "source" "text" DEFAULT 'sec'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."class_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."extracted_data" (
    "id" integer NOT NULL,
    "ticker" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "method_name" "text" NOT NULL,
    "raw_data" "jsonb",
    "metadata" "jsonb",
    "extracted_at" timestamp without time zone DEFAULT "now"(),
    "source" "text" DEFAULT 'defeatbeta'::"text"
);


ALTER TABLE "public"."extracted_data" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."extracted_data_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."extracted_data_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."extracted_data_id_seq" OWNED BY "public"."extracted_data"."id";



CREATE TABLE IF NOT EXISTS "public"."ingest_logs" (
    "id" bigint NOT NULL,
    "script" "text" NOT NULL,
    "status" "text" NOT NULL,
    "message" "text",
    "details" "jsonb",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "duration_ms" integer
);


ALTER TABLE "public"."ingest_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ingest_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ingest_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ingest_logs_id_seq" OWNED BY "public"."ingest_logs"."id";



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
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."instrument_meta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "email" "public"."citext" NOT NULL,
    "token" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "used_at" timestamp with time zone,
    CONSTRAINT "password_reset_tokens_expires_after_created" CHECK (("expires_at" > "created_at"))
);


ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_aliases" (
    "alias_ticker" "text" NOT NULL,
    "alias_exchange" "text" DEFAULT 'US'::"text" NOT NULL,
    "canonical_ticker" "text" NOT NULL,
    "simfin_id" integer NOT NULL,
    "company_name" "text" NOT NULL,
    "econ_factor" numeric DEFAULT 1.0 NOT NULL,
    "votes_per_share" numeric,
    "source" "text" DEFAULT 'auto:simfin'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "security_aliases_econ_factor_check" CHECK (("econ_factor" > (0)::numeric))
);


ALTER TABLE "public"."security_aliases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."symbol_availability" (
    "id" integer NOT NULL,
    "ticker" "text" NOT NULL,
    "has_info" boolean DEFAULT false,
    "has_price" boolean DEFAULT false,
    "has_market_cap" boolean DEFAULT false,
    "has_news" boolean DEFAULT false,
    "has_any_data" boolean DEFAULT false,
    "error_message" "text",
    "tested_at" timestamp without time zone DEFAULT "now"(),
    "source" "text" DEFAULT 'defeatbeta'::"text"
);


ALTER TABLE "public"."symbol_availability" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."symbol_availability_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."symbol_availability_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."symbol_availability_id_seq" OWNED BY "public"."symbol_availability"."id";



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
    "inserted_at" timestamp without time zone DEFAULT "now"(),
    "type" "text"
);


ALTER TABLE "public"."tmx_issuers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."tmx_issuers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tmx_issuers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tmx_issuers_id_seq" OWNED BY "public"."tmx_issuers"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "email" "public"."citext",
    "phone" "text",
    "subscription_interval" "text",
    "last_payment_at" timestamp without time zone,
    "password_hash" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "dashboard"."financials" ALTER COLUMN "id" SET DEFAULT "nextval"('"dashboard"."financials_id_seq"'::"regclass");



ALTER TABLE ONLY "dashboard"."stock_prices" ALTER COLUMN "id" SET DEFAULT "nextval"('"dashboard"."stock_prices_id_seq"'::"regclass");



ALTER TABLE ONLY "dashboard"."webhook_errors" ALTER COLUMN "id" SET DEFAULT "nextval"('"dashboard"."webhook_errors_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."extracted_data" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."extracted_data_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ingest_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ingest_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."symbol_availability" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."symbol_availability_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tmx_issuers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tmx_issuers_id_seq"'::"regclass");



ALTER TABLE ONLY "dashboard"."financials"
    ADD CONSTRAINT "financials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "dashboard"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "dashboard"."stock_prices"
    ADD CONSTRAINT "stock_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "dashboard"."webhook_errors"
    ADD CONSTRAINT "webhook_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_shares"
    ADD CONSTRAINT "class_shares_pk" PRIMARY KEY ("simfin_id", "alias_ticker", "as_of_date");



ALTER TABLE ONLY "public"."extracted_data"
    ADD CONSTRAINT "extracted_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingest_logs"
    ADD CONSTRAINT "ingest_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instrument_meta"
    ADD CONSTRAINT "instrument_meta_pkey" PRIMARY KEY ("symbol");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."security_aliases"
    ADD CONSTRAINT "security_aliases_pk" PRIMARY KEY ("alias_ticker", "alias_exchange");



ALTER TABLE ONLY "public"."symbol_availability"
    ADD CONSTRAINT "symbol_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."symbol_availability"
    ADD CONSTRAINT "symbol_availability_ticker_key" UNIQUE ("ticker");



ALTER TABLE ONLY "public"."tmx_issuers"
    ADD CONSTRAINT "tmx_issuers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_uk" UNIQUE ("email");



CREATE INDEX "idx_financials_core" ON "dashboard"."financials" USING "btree" ("ticker", "fy_end_date", "stmt_type");



CREATE INDEX "idx_financials_ticker_stmt_tag" ON "dashboard"."financials" USING "btree" ("ticker", "stmt_type", "tag");



CREATE INDEX "idx_stock_prices_exchange" ON "dashboard"."stock_prices" USING "btree" ("exchange");



CREATE INDEX "idx_stock_prices_exchange_symbol" ON "dashboard"."stock_prices" USING "btree" ("exchange", "symbol");



CREATE INDEX "idx_stock_prices_symbol" ON "dashboard"."stock_prices" USING "btree" ("symbol");



CREATE INDEX "idx_stock_prices_symbol_date" ON "dashboard"."stock_prices" USING "btree" ("symbol", "latest_day");



CREATE UNIQUE INDEX "idx_stock_prices_unique" ON "dashboard"."stock_prices" USING "btree" ("symbol", "latest_day", "exchange");



CREATE INDEX "idx_avail_has_any" ON "public"."symbol_availability" USING "btree" ("has_any_data");



CREATE INDEX "idx_avail_ticker" ON "public"."symbol_availability" USING "btree" ("ticker");



CREATE INDEX "idx_class_shares_simfin" ON "public"."class_shares" USING "btree" ("simfin_id");



CREATE INDEX "idx_extract_method" ON "public"."extracted_data" USING "btree" ("method_name");



CREATE INDEX "idx_extract_ticker" ON "public"."extracted_data" USING "btree" ("ticker");



CREATE INDEX "idx_ingest_logs_script_started" ON "public"."ingest_logs" USING "btree" ("script", "started_at" DESC);



CREATE INDEX "idx_ingest_logs_status_started" ON "public"."ingest_logs" USING "btree" ("status", "started_at" DESC);



CREATE INDEX "idx_sec_aliases_canon" ON "public"."security_aliases" USING "btree" ("canonical_ticker");



CREATE INDEX "idx_sec_aliases_simfin" ON "public"."security_aliases" USING "btree" ("simfin_id");



CREATE UNIQUE INDEX "idx_tmx_issuers_symbol_unique" ON "public"."tmx_issuers" USING "btree" ("symbol");



CREATE INDEX "password_reset_tokens_expires_at_idx" ON "public"."password_reset_tokens" USING "btree" ("expires_at");



CREATE UNIQUE INDEX "password_reset_tokens_token_uidx" ON "public"."password_reset_tokens" USING "btree" ("token");



CREATE INDEX "password_reset_tokens_used_at_idx" ON "public"."password_reset_tokens" USING "btree" ("used_at");



CREATE OR REPLACE TRIGGER "trg_password_reset_tokens_updated_at" BEFORE UPDATE ON "public"."password_reset_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."password_reset_tokens_set_updated_at"();





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "dashboard" TO "anon";
GRANT USAGE ON SCHEMA "dashboard" TO "authenticated";
GRANT USAGE ON SCHEMA "dashboard" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(character) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"("inet") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "anon";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."password_reset_tokens_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."password_reset_tokens_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."password_reset_tokens_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_ticker"("p_alias" "text", "p_exchange" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_ticker"("p_alias" "text", "p_exchange" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_ticker"("p_alias" "text", "p_exchange" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "service_role";



GRANT ALL ON TABLE "dashboard"."financials" TO "anon";
GRANT ALL ON TABLE "dashboard"."financials" TO "authenticated";
GRANT ALL ON TABLE "dashboard"."financials" TO "service_role";



GRANT ALL ON SEQUENCE "dashboard"."financials_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "dashboard"."financials_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "dashboard"."financials_id_seq" TO "service_role";



GRANT ALL ON TABLE "dashboard"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "dashboard"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "dashboard"."password_reset_tokens" TO "service_role";



GRANT ALL ON TABLE "dashboard"."stock_prices" TO "anon";
GRANT ALL ON TABLE "dashboard"."stock_prices" TO "authenticated";
GRANT ALL ON TABLE "dashboard"."stock_prices" TO "service_role";



GRANT ALL ON SEQUENCE "dashboard"."stock_prices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "dashboard"."stock_prices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "dashboard"."stock_prices_id_seq" TO "service_role";



GRANT ALL ON TABLE "dashboard"."webhook_errors" TO "anon";
GRANT ALL ON TABLE "dashboard"."webhook_errors" TO "authenticated";
GRANT ALL ON TABLE "dashboard"."webhook_errors" TO "service_role";



GRANT ALL ON SEQUENCE "dashboard"."webhook_errors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "dashboard"."webhook_errors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "dashboard"."webhook_errors_id_seq" TO "service_role";









GRANT ALL ON TABLE "public"."class_shares" TO "anon";
GRANT ALL ON TABLE "public"."class_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."class_shares" TO "service_role";



GRANT ALL ON TABLE "public"."extracted_data" TO "anon";
GRANT ALL ON TABLE "public"."extracted_data" TO "authenticated";
GRANT ALL ON TABLE "public"."extracted_data" TO "service_role";



GRANT ALL ON SEQUENCE "public"."extracted_data_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."extracted_data_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."extracted_data_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ingest_logs" TO "anon";
GRANT ALL ON TABLE "public"."ingest_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ingest_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ingest_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ingest_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ingest_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."instrument_meta" TO "anon";
GRANT ALL ON TABLE "public"."instrument_meta" TO "authenticated";
GRANT ALL ON TABLE "public"."instrument_meta" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."security_aliases" TO "anon";
GRANT ALL ON TABLE "public"."security_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."security_aliases" TO "service_role";



GRANT ALL ON TABLE "public"."symbol_availability" TO "anon";
GRANT ALL ON TABLE "public"."symbol_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."symbol_availability" TO "service_role";



GRANT ALL ON SEQUENCE "public"."symbol_availability_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."symbol_availability_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."symbol_availability_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tmx_issuers" TO "anon";
GRANT ALL ON TABLE "public"."tmx_issuers" TO "authenticated";
GRANT ALL ON TABLE "public"."tmx_issuers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tmx_issuers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tmx_issuers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tmx_issuers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "dashboard" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "dashboard" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


