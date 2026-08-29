-- 0020 · What time of day a reminder arrives
--
-- Lead days said which day to send on and nothing about when, so every
-- reminder would have landed whenever the scheduler happened to run. That is
-- the difference between "your rent is due tomorrow" arriving over breakfast
-- and arriving at 3am.
--
-- Stored as a bare `time`, deliberately without a zone. It means "nine in the
-- morning where the user is", which is what somebody setting it has in mind —
-- and a timestamptz would pin it to a moment that drifts across the clock the
-- first time they travel.

alter table public.reminders
  add column if not exists remind_at time not null default '09:00';

comment on column public.reminders.remind_at is
  'Local time of day the reminder is sent, on the day worked out from lead_days. '
  'No zone: it is nine in the morning wherever the user is.';
