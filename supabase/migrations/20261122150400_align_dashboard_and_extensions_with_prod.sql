-- On Prod, dashboard.stock_prices holds its uniqueness as a named constraint and the dashboard schema is
-- read-only for anon/authenticated with no service_role access. Idempotent: no-op where already aligned.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dashboard.stock_prices'::regclass AND conname = 'stock_prices_unique'
  ) THEN
    IF to_regclass('dashboard.idx_stock_prices_unique') IS NOT NULL THEN
      -- Promotes the existing index and renames it to the constraint name.
      ALTER TABLE dashboard.stock_prices
        ADD CONSTRAINT stock_prices_unique UNIQUE USING INDEX idx_stock_prices_unique;
    ELSE
      ALTER TABLE dashboard.stock_prices
        ADD CONSTRAINT stock_prices_unique UNIQUE (symbol, latest_day, exchange);
    END IF;
  END IF;
END
$$;

REVOKE ALL ON SCHEMA dashboard FROM service_role;
REVOKE ALL ON TABLE dashboard.financials, dashboard.stock_prices
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA dashboard FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA dashboard TO anon, authenticated;
GRANT SELECT ON TABLE dashboard.financials, dashboard.stock_prices TO anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA dashboard REVOKE ALL ON TABLES FROM service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA dashboard REVOKE ALL ON SEQUENCES FROM service_role;

-- Extensions enabled on Prod. The cross-project dev_db foreign server on Prod is intentionally not
-- reproduced: it holds credentials and links Prod to the Dev database.
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgres_fdw') THEN
    CREATE EXTENSION IF NOT EXISTS postgres_fdw WITH SCHEMA extensions;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron not enabled: %', SQLERRM;
    END;
  END IF;
END
$$;

COMMIT;
