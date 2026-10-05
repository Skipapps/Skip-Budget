-- 20261001100001 · A receipt can say it was spoken
--
-- Voice input files receipts with source 'voice', so how receipts arrive can
-- be measured beside 'manual', 'scan' and 'upload'.
--
-- Alone in its file on purpose. Postgres (17, config.toml) runs
-- ALTER TYPE … ADD VALUE inside a transaction but refuses to *use* the new
-- value until that transaction commits, and the CLI applies each migration
-- file as one transaction. The value is added here; the next file
-- (20261001100002_voice_is_pro.sql) is the first to use it.
--
-- `if not exists` makes a re-run a no-op. An enum value cannot be dropped, so
-- there is no down migration; an unused 'voice' is harmless.

alter type public.capture_source add value if not exists 'voice';
