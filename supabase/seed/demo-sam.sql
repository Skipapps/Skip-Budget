-- Demo data for the Founder's own account (Sam, sampath.chowdi@gmail.com).
--
-- Purpose: give the live app something realistic to show — eight weeks of
-- receipts, a household's worth of bills and subscriptions, three months of
-- recorded charges, a car loan with a real schedule, and one split group.
--
-- Scope and safety
-- ----------------
--   * Every row is written for one user id and nothing else is touched.
--   * Nothing pre-existing is deleted or updated. The account already has a
--     "Housing" bill (with its own charge and reminder), a "Desi Bits" receipt
--     and the "Komal Pay" salary source; this file adds alongside them.
--   * Re-runnable. Every id is derived from a fixed key —
--         md5('skip-demo-2026-09:' || key)::uuid
--     so a second apply conflicts with itself and inserts nothing. Every
--     statement carries `on conflict do nothing`, so the counts do not move.
--   * `supabase/seed/demo-sam-cleanup.sql` recomputes the same ids and removes
--     exactly these rows.
--
-- The marker is the id derivation, not a text tag: notes are visible to whoever
-- is being shown the app, so they are left reading like real notes.
--
-- Apply:  npx supabase db query --linked -f supabase/seed/demo-sam.sql
-- Remove: npx supabase db query --linked -f supabase/seed/demo-sam-cleanup.sql
--
-- Written against the schema as of 20260912100002_monthly_rests.sql.
-- Figures are dated around 2026-09-16, which is "today" for this data set.

-- ---------------------------------------------------------------------------
-- 1 · Payment sources
-- ---------------------------------------------------------------------------
--
-- One card and one bank account, which is all the free plan allows
-- (`enforce_free_allowance`, 20260831100007_pro_wall.sql: one card, one
-- account, one income per non-Pro account). This account has no entitlement
-- row, so a SECOND card raises "Free keeps one" no matter who is writing —
-- the trigger asks about the row's owner, not about the connection. There was
-- no Amex on this account to pair the new Visa with either: the account held
-- no card at all before this file ran. So the receipts below are split
-- between this card and the checking account rather than between two cards.
--
-- `balance_as_of` is 2026-09-01 on both: the stated figure is what was true on
-- the 1st, and everything charged since accrues on top of it, which is what
-- makes the cards screen show a live balance rather than a typed one.

-- The `where not exists` is what makes these two re-runnable, and it is not
-- decoration: `enforce_free_allowance` is a BEFORE INSERT trigger, so it
-- raises before `on conflict` is ever consulted. A second apply of a plain
-- upsert would abort the whole file on "Free keeps one".

insert into public.cards (id, user_id, holder, network, last4, color, balance, balance_as_of, bill_due_day)
select md5('skip-demo-2026-09:card:chase-sapphire')::uuid,
       'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid,
       'Chase Sapphire', 'VISA', '4821', '#7BC4F5', 412.30, '2026-09-01'::date, 18
where not exists (
  select 1 from public.cards where id = md5('skip-demo-2026-09:card:chase-sapphire')::uuid
);

insert into public.bank_accounts (id, user_id, bank_name, nickname, account_type, last4, color, balance, balance_as_of)
select md5('skip-demo-2026-09:account:chase-checking')::uuid,
       'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid,
       'Chase', 'Chase Checking', 'checking', '7730', '#2E6E5B', 7900.00, '2026-09-01'::date
where not exists (
  select 1 from public.bank_accounts where id = md5('skip-demo-2026-09:account:chase-checking')::uuid
);

-- ---------------------------------------------------------------------------
-- 2 · Bills
-- ---------------------------------------------------------------------------
--
-- `starts_on` is deliberately the date of the first charge recorded below, not
-- the date the household first had the service. It is the floor the ledger and
-- the catch-up recorder both read (`planFloor` in src/lib/card-ledger.ts), so
-- setting it earlier would have the app back-fill months of charges nobody
-- entered the moment the app is opened.
--
-- `next_due_on` is the next occurrence that has NOT been recorded yet. Anything
-- earlier is read from `charges`; anything later is projected from the plan.

insert into public.bills (id, user_id, brand_id, name, amount, category_id, icon_id, recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id, note)
select md5('skip-demo-2026-09:bill:' || v.key)::uuid,
       'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid,
       v.brand_id, v.name, v.amount, v.category_id, null, v.recurrence::public.bill_recurrence,
       v.next_due_on::date, v.starts_on::date, v.ends_on::date,
       case when v.paid_with = 'card' then md5('skip-demo-2026-09:card:chase-sapphire')::uuid end,
       case when v.paid_with = 'bank' then md5('skip-demo-2026-09:account:chase-checking')::uuid end,
       v.note
from (values
  -- key            brand          name                 amount   category     recurrence  next due      starts on     ends on       paid with  note
  ('con-edison',   'con-edison',  'Electricity',        118.42, 'energy',    'monthly', '2026-10-08', '2026-07-08', null,          'bank', 'Budget billing kicks in next summer'),
  ('verizon-fios', 'verizon',     'Internet',            79.99, 'internet',  'monthly', '2026-09-18', '2026-07-18', null,          'bank', null),
  ('t-mobile',     't-mobile',    'Phone',               65.00, 'mobile',    'monthly', '2026-09-22', '2026-07-22', null,          'card', 'Two lines'),
  ('geico',        'geico',       'Car insurance',      142.00, 'insurance', 'monthly', '2026-09-27', '2026-07-27', null,          'bank', null),
  -- The car loan. Filed as a bill under 'loans' exactly the way save_loan()
  -- files one, with its detail row in public.loans below. ends_on is the last
  -- of the 60 payments: first payment + 59 months.
  ('toyota-loan',  null,          'Car loan',           493.85, 'loans',     'monthly', '2026-10-15', '2026-07-15', '2031-02-15',  'bank', 'Toyota Financial · 2024 RAV4')
) as v(key, brand_id, name, amount, category_id, recurrence, next_due_on, starts_on, ends_on, paid_with, note)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3 · The loan behind the car bill
-- ---------------------------------------------------------------------------
--
-- $25,000 at 6.9% over 60 months, first payment 2026-03-15, funded a month
-- earlier, monthly rests ('monthly' — allowed since 20260912100002).
--
-- payment and total interest are NOT invented here: they are what
-- `amortise()` in src/lib/loan.ts returns for exactly these terms —
-- payment 493.85, final payment 493.95, total interest 4,631.10, payoff
-- 2031-02-15. Row 1 is 143.75 interest / 350.10 principal / 24,649.90
-- outstanding; row 7 (2026-09-15) is 131.50 / 362.35 / 22,506.63. Filing any
-- other figure would put the schedule screen at odds with the bill beside it.
--
-- Note the deliberate gap: the loan's first payment is 2026-03-15 while the
-- bill's starts_on is 2026-07-15. The loan is real from March; Skip has only
-- been told about it since July, and the ledger must not claim to have
-- recorded payments it never saw.

insert into public.loans (id, user_id, bill_id, principal, annual_rate, term_months, monthly_payment, total_interest, first_payment_on, funded_on, day_count_basis, statement_on, statement_principal)
values (
  md5('skip-demo-2026-09:loan:toyota')::uuid,
  'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid,
  md5('skip-demo-2026-09:bill:toyota-loan')::uuid,
  25000.00, 6.900, 60, 493.85, 4631.10,
  '2026-03-15'::date, '2026-02-15'::date, 'monthly', null, null
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4 · Subscriptions
-- ---------------------------------------------------------------------------
--
-- Same rule as bills: `started_on` is the floor, `next_renewal_on` is the first
-- occurrence not yet recorded. Amazon Prime is the yearly one; its previous
-- renewal (Nov 2025) is deliberately below its floor so the recorder does not
-- reach back a year and invent a charge — and so the savings page does not
-- open on ten empty months.

insert into public.subscriptions (id, user_id, brand_id, name, amount, cycle, next_renewal_on, started_on, category_id, card_id, bank_account_id, note, active)
select md5('skip-demo-2026-09:sub:' || v.key)::uuid,
       'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid,
       v.brand_id, v.name, v.amount, v.cycle::public.billing_cycle,
       v.next_renewal_on::date, v.started_on::date, v.category_id,
       case when v.paid_with = 'card' then md5('skip-demo-2026-09:card:chase-sapphire')::uuid end,
       case when v.paid_with = 'bank' then md5('skip-demo-2026-09:account:chase-checking')::uuid end,
       v.note, true
from (values
  ('netflix',      'netflix', 'Netflix',      15.49, 'monthly', '2026-10-12', '2026-07-12', 'entertainment', 'card', 'Standard with ads'),
  ('spotify',      'spotify', 'Spotify',      10.99, 'monthly', '2026-10-05', '2026-07-05', 'entertainment', 'card', null),
  ('icloud',       'apple',   'iCloud+',       2.99, 'monthly', '2026-09-21', '2026-07-21', 'software',      'card', '200 GB'),
  ('equinox',      'equinox', 'Equinox',     185.00, 'monthly', '2026-10-02', '2026-07-02', 'fitness',       'card', null),
  ('amazon-prime', 'amazon',  'Amazon Prime', 139.00, 'yearly', '2026-11-07', '2026-07-01', 'memberships',   'bank', 'Billed once a year')
) as v(key, brand_id, name, amount, cycle, next_renewal_on, started_on, category_id, paid_with, note)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5 · Receipts — eight weeks, 36 of them
-- ---------------------------------------------------------------------------
--
-- $5.95 to $174.28, weekly totals ranging from $123 to $310 so the bars on
-- Insights have shape. Two today (2026-09-16) and two yesterday.
--
-- source is 'manual' on every row: 'scan' and 'upload' are refused for a
-- non-Pro account by `enforce_scan_is_pro`.

insert into public.receipts (id, user_id, brand_id, merchant, amount, purchased_on, category_id, card_id, bank_account_id, note, source, image_path)
select md5('skip-demo-2026-09:receipt:' || v.key)::uuid,
       'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid,
       v.brand_id, v.merchant, v.amount, v.purchased_on::date, v.category_id,
       case when v.paid_with = 'card' then md5('skip-demo-2026-09:card:chase-sapphire')::uuid end,
       case when v.paid_with = 'bank' then md5('skip-demo-2026-09:account:chase-checking')::uuid end,
       v.note, 'manual', null
from (values
  -- Week of 21 Jul
  ('001', 'trader-joe-s',        'Trader Joe''s',       68.42, '2026-07-22', 'groceries', 'card', null),
  ('002', 'shell',               'Shell',               52.10, '2026-07-25', 'fuel',      'card', null),
  ('003', 'costco',              'Costco',             174.28, '2026-07-26', 'groceries', 'card', 'Big shop'),
  ('004', 'chipotle',            'Chipotle',            14.75, '2026-07-28', 'dining',    'bank', null),
  -- Week of 28 Jul
  ('005', null,                  'Blue Bottle Coffee',   9.40, '2026-07-29', 'dining',    'bank', null),
  ('006', 'amazon',              'Amazon',              38.99, '2026-07-31', 'shopping',  'card', null),
  ('007', 'whole-foods-market',  'Whole Foods Market',  82.13, '2026-08-02', 'groceries', 'card', null),
  ('008', 'uber',                'Uber',                23.60, '2026-08-04', 'transport', 'bank', null),
  -- Week of 4 Aug
  ('009', 'trader-joe-s',        'Trader Joe''s',       61.07, '2026-08-07', 'groceries', 'card', null),
  ('010', 'cvs',                 'CVS',                 27.31, '2026-08-08', 'pharmacy',  'bank', null),
  ('011', null,                  'Sweetgreen',          16.20, '2026-08-09', 'dining',    'bank', null),
  ('012', 'shell',               'Shell',               48.73, '2026-08-11', 'fuel',      'card', null),
  -- Week of 11 Aug
  ('013', 'amazon',              'Amazon',             112.44, '2026-08-13', 'shopping',  'card', 'Desk lamp and cables'),
  ('014', 'whole-foods-market',  'Whole Foods Market',  74.66, '2026-08-15', 'groceries', 'card', null),
  ('015', 'starbucks',           'Starbucks',            7.10, '2026-08-16', 'dining',    'bank', null),
  ('016', 'uber',                'Uber',                18.95, '2026-08-18', 'transport', 'bank', null),
  -- Week of 18 Aug
  ('017', 'trader-joe-s',        'Trader Joe''s',       55.88, '2026-08-19', 'groceries', 'card', null),
  ('018', 'chipotle',            'Chipotle',            13.40, '2026-08-21', 'dining',    'bank', null),
  ('019', 'costco',              'Costco',             158.92, '2026-08-22', 'groceries', 'card', null),
  ('020', 'shell',               'Shell',               44.19, '2026-08-25', 'fuel',      'card', null),
  -- Week of 25 Aug
  ('021', 'cvs',                 'CVS',                 12.86, '2026-08-27', 'pharmacy',  'bank', null),
  ('022', 'whole-foods-market',  'Whole Foods Market',  69.34, '2026-08-29', 'groceries', 'card', null),
  ('023', null,                  'Sweetgreen',          15.85, '2026-08-30', 'dining',    'bank', null),
  ('024', 'amazon',              'Amazon',              24.99, '2026-09-01', 'shopping',  'card', null),
  -- Week of 1 Sep
  ('025', 'trader-joe-s',        'Trader Joe''s',       72.15, '2026-09-03', 'groceries', 'card', null),
  ('026', 'starbucks',           'Starbucks',            6.35, '2026-09-04', 'dining',    'bank', null),
  ('027', 'shell',               'Shell',               51.44, '2026-09-05', 'fuel',      'card', null),
  ('028', 'uber',                'Uber',                21.30, '2026-09-07', 'transport', 'bank', null),
  ('029', 'chipotle',            'Chipotle',            15.60, '2026-09-08', 'dining',    'bank', null),
  -- This week
  ('030', 'whole-foods-market',  'Whole Foods Market',  88.21, '2026-09-10', 'groceries', 'card', null),
  ('031', 'cvs',                 'CVS',                 34.78, '2026-09-12', 'pharmacy',  'bank', 'Prescription and sunscreen'),
  ('032', 'amazon',              'Amazon',              42.60, '2026-09-14', 'shopping',  'card', null),
  ('033', 'trader-joe-s',        'Trader Joe''s',       64.93, '2026-09-15', 'groceries', 'card', null),
  ('034', null,                  'Blue Bottle Coffee',   9.85, '2026-09-15', 'dining',    'bank', null),
  ('035', 'starbucks',           'Starbucks',            5.95, '2026-09-16', 'dining',    'bank', null),
  ('036', null,                  'Sweetgreen',          17.45, '2026-09-16', 'dining',    'card', null)
) as v(key, brand_id, merchant, amount, purchased_on, category_id, paid_with, note)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 6 · Charges — what actually went out
-- ---------------------------------------------------------------------------
--
-- A charge is one occurrence that landed, carrying the label, amount and
-- source it had at the time. These are what make Insights show recorded
-- figures instead of projected ones, and they are why the electricity reads
-- $131.74 in July and $118.42 in September rather than one flat number.
--
-- Only occurrences on or before 2026-09-16 are here. Anything later in
-- September (Fios on the 18th, the phone on the 22nd, iCloud+ on the 21st,
-- Geico on the 27th) is still a forecast and is left to the plan to project.
--
-- The loan is recorded from 2026-07-15 because that is the bill's starts_on;
-- its March–June payments predate the app knowing about it.

insert into public.charges (id, user_id, bill_id, subscription_id, label, amount, charged_on, card_id, bank_account_id)
select md5('skip-demo-2026-09:charge:' || v.plan_kind || ':' || v.plan_key || ':' || v.charged_on)::uuid,
       'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid,
       case when v.plan_kind = 'bill' then md5('skip-demo-2026-09:bill:' || v.plan_key)::uuid end,
       case when v.plan_kind = 'sub'  then md5('skip-demo-2026-09:sub:'  || v.plan_key)::uuid end,
       v.label, v.amount, v.charged_on::date,
       case when v.paid_with = 'card' then md5('skip-demo-2026-09:card:chase-sapphire')::uuid end,
       case when v.paid_with = 'bank' then md5('skip-demo-2026-09:account:chase-checking')::uuid end
from (values
  -- Electricity, which is the one that moves month to month.
  ('bill', 'con-edison',   'Electricity',   131.74, '2026-07-08', 'bank'),
  ('bill', 'con-edison',   'Electricity',   138.60, '2026-08-08', 'bank'),
  ('bill', 'con-edison',   'Electricity',   118.42, '2026-09-08', 'bank'),
  -- Internet
  ('bill', 'verizon-fios', 'Internet',       79.99, '2026-07-18', 'bank'),
  ('bill', 'verizon-fios', 'Internet',       79.99, '2026-08-18', 'bank'),
  -- Phone
  ('bill', 't-mobile',     'Phone',          65.00, '2026-07-22', 'card'),
  ('bill', 't-mobile',     'Phone',          65.00, '2026-08-22', 'card'),
  -- Car insurance
  ('bill', 'geico',        'Car insurance', 142.00, '2026-07-27', 'bank'),
  ('bill', 'geico',        'Car insurance', 142.00, '2026-08-27', 'bank'),
  -- Car loan — the contract payment, to the cent.
  ('bill', 'toyota-loan',  'Car loan',      493.85, '2026-07-15', 'bank'),
  ('bill', 'toyota-loan',  'Car loan',      493.85, '2026-08-15', 'bank'),
  ('bill', 'toyota-loan',  'Car loan',      493.85, '2026-09-15', 'bank'),
  -- Subscriptions
  ('sub',  'equinox',      'Equinox',       185.00, '2026-07-02', 'card'),
  ('sub',  'equinox',      'Equinox',       185.00, '2026-08-02', 'card'),
  ('sub',  'equinox',      'Equinox',       185.00, '2026-09-02', 'card'),
  ('sub',  'spotify',      'Spotify',        10.99, '2026-07-05', 'card'),
  ('sub',  'spotify',      'Spotify',        10.99, '2026-08-05', 'card'),
  ('sub',  'spotify',      'Spotify',        10.99, '2026-09-05', 'card'),
  ('sub',  'netflix',      'Netflix',        15.49, '2026-07-12', 'card'),
  ('sub',  'netflix',      'Netflix',        15.49, '2026-08-12', 'card'),
  ('sub',  'netflix',      'Netflix',        15.49, '2026-09-12', 'card'),
  ('sub',  'icloud',       'iCloud+',         2.99, '2026-07-21', 'card'),
  ('sub',  'icloud',       'iCloud+',         2.99, '2026-08-21', 'card')
) as v(plan_kind, plan_key, label, amount, charged_on, paid_with)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 7 · A card payment
-- ---------------------------------------------------------------------------
--
-- Payments are deliberately absent from the spending ledger (paying a card
-- moves money between two things you already own), so this shows on the card
-- and changes its balance without touching "Left this month".

insert into public.payments (id, user_id, card_id, bank_account_id, amount, paid_on, note)
values (
  md5('skip-demo-2026-09:payment:visa-2026-09-06')::uuid,
  'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid,
  md5('skip-demo-2026-09:card:chase-sapphire')::uuid,
  null, 350.00, '2026-09-06'::date, 'Card payment'
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 8 · Reminders
-- ---------------------------------------------------------------------------
--
-- One row per thing, which is what the table enforces. The pre-existing
-- Housing reminder is left exactly as it is.

insert into public.reminders (id, user_id, bill_id, subscription_id, card_id, bank_account_id, enabled, lead_days, remind_at)
select md5('skip-demo-2026-09:reminder:' || v.key)::uuid,
       'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid,
       case when v.target = 'bill' then md5('skip-demo-2026-09:bill:' || v.key)::uuid end,
       case when v.target = 'sub'  then md5('skip-demo-2026-09:sub:'  || v.key)::uuid end,
       case when v.target = 'card' then md5('skip-demo-2026-09:card:' || v.key)::uuid end,
       case when v.target = 'bank' then md5('skip-demo-2026-09:account:' || v.key)::uuid end,
       true, v.lead_days::smallint, v.remind_at::time
from (values
  ('con-edison',     'bill', 2, '09:00'),
  ('geico',          'bill', 3, '09:00'),
  ('toyota-loan',    'bill', 5, '08:30'),
  ('netflix',        'sub',  1, '19:00'),
  ('chase-sapphire', 'card', 3, '09:00')
) as v(key, target, lead_days, remind_at)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 9 · A savings pot
-- ---------------------------------------------------------------------------
--
-- `savings_pots` is read by useSavingsPots() and, as of this branch, rendered
-- by no screen — the Savings page is driven by monthly_savings below. Seeded
-- anyway so the table is not empty if a tile starts reading it.

insert into public.savings_pots (id, user_id, name, amount)
values (
  md5('skip-demo-2026-09:pot:emergency')::uuid,
  'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid,
  'Emergency fund', 4200.00
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 10 · A split group, with two people who are not Skip accounts
-- ---------------------------------------------------------------------------
--
-- The schema supports this directly: group_members.user_id is nullable and
-- display_name stands in (20260829100017), and every split points at a member
-- rather than a user, so a placeholder can owe money.
--
-- Note for whoever demos it: splitting is Pro-gated in the app, and this
-- account has no entitlement, so the Splits tab needs the dev Pro bypass
-- (src/lib/pro-bypass.ts) to open. The rows themselves are valid either way —
-- the database's Pro trigger only questions a signed-in writer.
--
-- Balances these rows produce: Sam +37.40, Komal +58.60, Rahul -96.00.

insert into public.groups (id, name, currency, created_by, simplify_debts, icon_id, invite_code)
values (
  md5('skip-demo-2026-09:group:flat-3b')::uuid,
  'Flat 3B', 'USD',
  'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid,
  true, 'housing', 'DEMO3B'
)
on conflict do nothing;

insert into public.group_members (id, group_id, user_id, display_name, role)
select md5('skip-demo-2026-09:member:' || v.key)::uuid,
       md5('skip-demo-2026-09:group:flat-3b')::uuid,
       v.user_id::uuid, v.display_name, v.role
from (values
  ('sam',   'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020', 'Sam',   'owner'),
  ('komal', null,                                   'Komal', 'member'),
  ('rahul', null,                                   'Rahul', 'member')
) as v(key, user_id, display_name, role)
on conflict do nothing;

-- `notify_added_to_group` queues a push for any member who is not the person
-- adding them, and this seed has no signed-in actor for it to compare against,
-- so Sam is told he was added to his own group. Dropped here rather than sent:
-- the queue is drained every quarter hour and a demo should not open with a
-- notification about itself. Finds nothing on a second apply.
delete from public.split_notices
 where user_id = 'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid
   and sent_at is null
   and title = 'Flat 3B'
   and body  = 'You have been added to this group on Skip.';

insert into public.expenses (id, group_id, paid_by, amount, description, category_id, spent_on, split_mode, created_by)
select md5('skip-demo-2026-09:expense:' || v.key)::uuid,
       md5('skip-demo-2026-09:group:flat-3b')::uuid,
       md5('skip-demo-2026-09:member:' || v.paid_by)::uuid,
       v.amount, v.description, null, v.spent_on::date, v.split_mode,
       'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid
from (values
  ('groceries', 'sam',   148.20, 'Groceries run',        '2026-08-30', 'equal'),
  ('utilities', 'komal', 210.00, 'Internet + utilities', '2026-09-05', 'equal'),
  ('dinner',    'sam',    96.75, 'Dinner at Laut',       '2026-09-13', 'exact')
) as v(key, paid_by, amount, description, spent_on, split_mode)
on conflict do nothing;

-- Shares. The database checks these sum to the expense exactly — deferred to
-- the end of the transaction, which is why all three land in one statement.
insert into public.expense_splits (id, expense_id, member_id, share)
select md5('skip-demo-2026-09:split:' || v.expense || ':' || v.member)::uuid,
       md5('skip-demo-2026-09:expense:' || v.expense)::uuid,
       md5('skip-demo-2026-09:member:' || v.member)::uuid,
       v.share
from (values
  ('groceries', 'sam',    49.40),
  ('groceries', 'komal',  49.40),
  ('groceries', 'rahul',  49.40),
  ('utilities', 'sam',    70.00),
  ('utilities', 'komal',  70.00),
  ('utilities', 'rahul',  70.00),
  ('dinner',    'sam',    38.75),
  ('dinner',    'komal',  32.00),
  ('dinner',    'rahul',  26.00)
) as v(expense, member, share)
on conflict do nothing;

-- One debt handed over in cash, so the group shows both states.
insert into public.settlements (id, group_id, from_member, to_member, amount, settled_on, note, created_by)
values (
  md5('skip-demo-2026-09:settlement:rahul-sam')::uuid,
  md5('skip-demo-2026-09:group:flat-3b')::uuid,
  md5('skip-demo-2026-09:member:rahul')::uuid,
  md5('skip-demo-2026-09:member:sam')::uuid,
  49.40, '2026-09-08'::date, 'Cash for the groceries run',
  'bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 11 · Close the finished months
-- ---------------------------------------------------------------------------
--
-- monthly_savings is computed, never typed: this is the same function the
-- Savings page calls on open, so the figures it writes are exactly the ones
-- the app would have produced by itself. July and August 2026 are the only
-- finished months with any record in them; September is still running and is
-- deliberately not closed.
--
-- Idempotent: re-running updates the computed columns and inserts no new row.

select public.close_savings_for('bdb18bea-c7e9-4f25-bcfd-8ca2d9cf2020'::uuid);
