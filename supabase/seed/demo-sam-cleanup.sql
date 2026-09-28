-- Removes the demo data added by supabase/seed/demo-sam.sql, and nothing else.
--
-- Every row is identified by the same derivation the seed used —
--     md5('skip-demo-2026-09:' || key)::uuid
-- so this cannot reach a row the seed did not write. The account's own rows
-- (the "Housing" bill with its charge and reminder, the "Desi Bits" receipt,
-- the "Komal Pay" salary source) are matched by none of these predicates and
-- are left exactly as they are.
--
-- Run:  npx supabase db query --linked -f supabase/seed/demo-sam-cleanup.sql
--
-- Order matters: expenses point at members with `on delete restrict`, so the
-- group cannot simply be cascaded away.

-- ---------------------------------------------------------------------------
-- 1 · The split group
-- ---------------------------------------------------------------------------

delete from public.settlements
 where id = md5('skip-demo-2026-09:settlement:rahul-sam')::uuid;

delete from public.expense_splits
 where expense_id in (
   select md5('skip-demo-2026-09:expense:' || key)::uuid
     from (values ('groceries'), ('utilities'), ('dinner')) as v(key)
 );

delete from public.expenses
 where id in (
   select md5('skip-demo-2026-09:expense:' || key)::uuid
     from (values ('groceries'), ('utilities'), ('dinner')) as v(key)
 );

delete from public.group_members
 where id in (
   select md5('skip-demo-2026-09:member:' || key)::uuid
     from (values ('sam'), ('komal'), ('rahul')) as v(key)
 );

delete from public.groups
 where id = md5('skip-demo-2026-09:group:flat-3b')::uuid;

-- Anything the group's own triggers queued and the sender has not taken yet.
delete from public.split_notices
 where user_id = 'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid
   and sent_at is null
   and title = 'Flat 3B';

-- ---------------------------------------------------------------------------
-- 2 · Reminders, the payment, the pot
-- ---------------------------------------------------------------------------
--
-- The pre-existing Housing reminder has a different id and is untouched.

delete from public.reminders
 where id in (
   select md5('skip-demo-2026-09:reminder:' || key)::uuid
     from (values ('con-edison'), ('geico'), ('toyota-loan'), ('netflix'), ('chase-sapphire')) as v(key)
 );

delete from public.payments
 where id = md5('skip-demo-2026-09:payment:visa-2026-09-06')::uuid;

delete from public.savings_pots
 where id = md5('skip-demo-2026-09:pot:emergency')::uuid;

-- ---------------------------------------------------------------------------
-- 3 · Charges
-- ---------------------------------------------------------------------------
--
-- By plan rather than by charge id, deliberately. The app's own catch-up
-- recorder writes charges for a seeded bill or subscription the moment it is
-- opened after a due date passes, and those rows carry ids this file cannot
-- predict. Scoped to the seeded plans, so the pre-existing Housing charge —
-- which belongs to a bill this seed never created — is not in the set.

delete from public.charges
 where bill_id in (
   select md5('skip-demo-2026-09:bill:' || key)::uuid
     from (values ('con-edison'), ('verizon-fios'), ('t-mobile'), ('geico'), ('toyota-loan')) as v(key)
 )
    or subscription_id in (
   select md5('skip-demo-2026-09:sub:' || key)::uuid
     from (values ('netflix'), ('spotify'), ('icloud'), ('equinox'), ('amazon-prime')) as v(key)
 );

-- ---------------------------------------------------------------------------
-- 4 · Receipts
-- ---------------------------------------------------------------------------

delete from public.receipts
 where id in (
   select md5('skip-demo-2026-09:receipt:' || to_char(n, 'FM000'))::uuid
     from generate_series(1, 36) as n
 );

-- ---------------------------------------------------------------------------
-- 5 · Subscriptions, the loan, the bills
-- ---------------------------------------------------------------------------
--
-- public.loans cascades from its bill, but it is deleted explicitly first so
-- this file says out loud what it removes.

delete from public.subscriptions
 where id in (
   select md5('skip-demo-2026-09:sub:' || key)::uuid
     from (values ('netflix'), ('spotify'), ('icloud'), ('equinox'), ('amazon-prime')) as v(key)
 );

delete from public.loans
 where id = md5('skip-demo-2026-09:loan:toyota')::uuid;

delete from public.bills
 where id in (
   select md5('skip-demo-2026-09:bill:' || key)::uuid
     from (values ('con-edison'), ('verizon-fios'), ('t-mobile'), ('geico'), ('toyota-loan')) as v(key)
 );

-- ---------------------------------------------------------------------------
-- 6 · Payment sources
-- ---------------------------------------------------------------------------

delete from public.cards
 where id = md5('skip-demo-2026-09:card:chase-sapphire')::uuid;

delete from public.bank_accounts
 where id = md5('skip-demo-2026-09:account:chase-checking')::uuid;

-- ---------------------------------------------------------------------------
-- 7 · The months the seed closed
-- ---------------------------------------------------------------------------
--
-- monthly_savings has no id of its own — a month is its own key — so these two
-- are named outright. They are the only months the seeded history could close:
-- the account was created on 2026-08-31, and `close_savings_for` will not
-- close a month before that (20260831100006_savings_start_at_birth.sql). In
-- practice only 2026-08 exists. A month closed later, from the Founder's real
-- use, is a different month and is left alone.
--
-- Nothing recreates them: with the demo receipts and charges gone, the
-- earliest record on the account is back inside the current month.

delete from public.monthly_savings
 where user_id = 'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid
   and month in ('2026-07-01'::date, '2026-08-01'::date);
