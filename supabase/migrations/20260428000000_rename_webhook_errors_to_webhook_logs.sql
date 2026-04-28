ALTER TABLE dashboard.webhook_errors RENAME TO webhook_logs;
ALTER SEQUENCE dashboard.webhook_errors_id_seq RENAME TO webhook_logs_id_seq;
ALTER TABLE dashboard.webhook_logs RENAME CONSTRAINT webhook_errors_pkey TO webhook_logs_pkey;
