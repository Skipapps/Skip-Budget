-- 800001 · "Payment went out" notices can be turned off in Skip
--
-- The scheduler (send-push) announces each charge it records to every phone the account signed up
-- for reminders, and until now only the phone's own Settings could stop that. One switch per
-- account, on the profile beside the receipts reminder's. On by default: every account that gets
-- these notices today keeps getting them until the person says otherwise.

alter table public.profiles
  add column if not exists payment_notices boolean not null default true;

comment on column public.profiles.payment_notices is
  'Whether send-push may tell this account a bill or subscription payment went out. On unless '
  'the person turns "Payment notices" off on the Reminders page.';
