-- 0003 · Remembering that somebody said "enough"
--
-- The Getting Started card derives every tick from the data the step creates —
-- a salary row means pay is set, a receipt with source 'scan' means the
-- scanner was tried — so none of that is stored, and the card can never
-- disagree with reality. The one fact with no row of its own is dismissal:
-- "stop showing me this" is a choice about the card, not about the money.
--
-- On the profile rather than the device, for the same reason tile order is:
-- waving the guide away on a phone and meeting it again on the iPad would read
-- as the app forgetting, not the iPad asking fresh.

alter table public.profiles
  add column if not exists getting_started_dismissed_at timestamptz;

comment on column public.profiles.getting_started_dismissed_at is
  'When the Getting Started card was hidden by hand. Null shows the card '
  'until its five steps are done; the steps themselves are derived, not stored.';
