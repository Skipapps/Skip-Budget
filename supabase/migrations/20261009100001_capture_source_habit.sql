-- 20261009100001 · A receipt can say it was tapped in from a habit
--
-- Tapping a day on a spending habit's card files one receipt for that day,
-- with source 'habit', so how receipts arrive can still be told apart.
--
-- Alone in its file on purpose: Postgres refuses to *use* an enum value added
-- by ALTER TYPE … ADD VALUE until that transaction commits, and the CLI
-- applies each migration file as one transaction.
-- 20261009100003_receipt_reminder_ignores_habits.sql names the value, so it
-- must run after this file has committed.
--
-- `if not exists` makes a re-run a no-op. An enum value cannot be dropped, so
-- there is no down migration; an unused 'habit' is harmless.

alter type public.capture_source add value if not exists 'habit';
