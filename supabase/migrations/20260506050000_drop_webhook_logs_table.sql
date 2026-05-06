-- Drop legacy diagnostics table now that function runtime logs are the source of truth.
DROP TABLE IF EXISTS dashboard.webhook_logs;

-- Defensive cleanup in case the sequence was detached from table ownership.
DROP SEQUENCE IF EXISTS dashboard.webhook_logs_id_seq;
