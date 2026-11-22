-- Guarded so the chain also runs on a fresh database, where the baseline already creates dashboard.webhook_logs.
DO $$
BEGIN
  IF to_regclass('dashboard.webhook_errors') IS NOT NULL
     AND to_regclass('dashboard.webhook_logs') IS NULL THEN
    ALTER TABLE dashboard.webhook_errors RENAME TO webhook_logs;
    ALTER SEQUENCE dashboard.webhook_errors_id_seq RENAME TO webhook_logs_id_seq;
    ALTER TABLE dashboard.webhook_logs RENAME CONSTRAINT webhook_errors_pkey TO webhook_logs_pkey;
  END IF;
END
$$;
