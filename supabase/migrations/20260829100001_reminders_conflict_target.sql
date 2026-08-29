-- 0019 · One reminder per thing, in a form ON CONFLICT can actually use
--
-- The four partial unique indexes enforced the rule correctly and could not be
-- used to resolve it. PostgreSQL infers a partial index for ON CONFLICT only
-- when the statement repeats the index predicate, and PostgREST has nowhere to
-- put one — so every upsert from the reminders page failed at planning with
-- 42P10, before it ever reached a row. The rule was right; it was unusable.
--
-- One constraint across all four columns says the same thing and is inferable.
-- NULLS NOT DISTINCT is what makes it mean anything: by default two rows of
-- (bill, NULL, NULL, NULL) count as different, because a NULL never equals
-- another NULL, so the plain form would enforce nothing at all.

drop index if exists public.reminders_bill_once;
drop index if exists public.reminders_subscription_once;
drop index if exists public.reminders_card_once;
drop index if exists public.reminders_account_once;

alter table public.reminders drop constraint if exists reminders_one_per_target;

alter table public.reminders
  add constraint reminders_one_per_target
  unique nulls not distinct (bill_id, subscription_id, card_id, bank_account_id);

comment on constraint reminders_one_per_target on public.reminders is
  'One reminder per bill, subscription, card or account. Spans all four columns '
  'so ON CONFLICT can infer it; the check constraint keeps exactly one non-null.';
