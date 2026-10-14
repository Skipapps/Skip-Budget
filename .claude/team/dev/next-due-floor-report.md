# Next due inside a charged cycle: Drew's findings (read-only, 2026-10-13)

Founder bug (via Jay): moving a bill's due date after this month's payment shows Next due 15 Oct instead
of 15 Nov, and a reminder can fire that day. Founder answers (all as recommended): calendar quarters and
years; an edit on the charge day moves Next to the next cycle; the edit form says "October is already
paid · next payment 15 Nov"; the bill page's "Started" shows the first payment's date.

Scratch reproduction (real app functions, today = 2026-10-12):
`/private/tmp/claude-501/-Users-sampathchowdi-Desktop-SkipBudget/dde426a1-ad91-4ed8-b3e0-b7305e93e002/scratchpad/drew-nextdue/`

Live read-only count (Founder OK): 0 bills with `next_due_on < starts_on`, 0 active subscriptions with
`next_renewal_on < started_on`. The fix is preventive; the one-off update is a no-op today.

## Cause

A running plan's stored next date can sit before its own floor (`starts_on` / `started_on`).

- Bill save: `src/api/entry-values.ts:152` writes `next_due_on: start` (the picked date). `:155` writes
  `starts_on: floorAfterCharges(start, lastChargedOn)` (`src/lib/charges.ts:108-116`). `lastChargedOn` is
  the newest cached charge (`src/api/past-charges.ts:87-96`), passed at `src/app/add-bill.tsx:474`.
  `useUpdateBill` (`mutations.ts:368-387`) applies only `guardLoanBillDates`, then a plain update.
  Founder's case: `next_due_on = 2026-10-15`, `starts_on = 2026-11-01`.
- Subscription save: `entry-values.ts:232` writes `next_renewal_on = renewal`. `:235-239` write
  `started_on = floorAfterCharges(countFromAfterPick(...))`, called at `add-subscription.tsx:380-382`.
  Same bug.
- Loans are already right: `update_loan` (`20261012100003_loan_payoffs.sql:500-512`) floors past the
  newest charge, then `v_from := greatest(v_starts_on, v_today)`.
- Second route in: a date picked in an earlier charged month (15 Sep). The save writes 15 Sep with
  starts_on 1 Nov. Then both rollers (`src/api/refresh.ts:28-37` and `roll_schedules_forward`) store
  15 Oct, because neither looks at `starts_on`.

## Readers

Wrong (print the stored column):
- `src/app/bill/[id].tsx:86` "Next due" (and `:95` "Started 1 Nov 2026" for a bill paid since Sep).
- `src/app/subscription/[id].tsx:79-81` Next renewal.
- `src/app/reminders.tsx:161-165` (bills) and `:178-182` (subscriptions) captions.
- `src/app/add-bill.tsx:289-299` and `src/app/add-subscription.tsx:220-222`: the form reopens on 15 Oct.
- `src/app/setup-bills.tsx:32`, `setup-subscriptions.tsx:41`.
- `src/api/queries.ts:314`, `:580` (list order only).
- Server reminder: `reminders_due` (`20261012100001_loan_add_flow.sql:298-302`) `due_on = b.next_due_on` /
  `s.next_renewal_on`; `:344` fires when `due_on - lead_days = local_date`; `send-push/index.ts:575`.
- The app schedules no local bill reminders (`src/api/reminders.ts` only stores lead_days / remind_at).

Already right (walk the schedule from the floor): `planOccurrences` (`card-ledger.ts`) and
`ledgerEntries` (`queries.ts`) feeding Home Coming up, Activity, the plan-detail Upcoming list and the
payment pages; `bill-month.ts` `nextDueAfter`, `planMonth` and `owedDates`, `notDueStatus`;
`insights-sections.ts:99-100`; the loan pages (own schedule); the recorders (`unrecordedDates`,
`record_due_charges`, `charges_one_per_cycle`) and `savings.ts:823-845`.

## Fix (agreed: SQL, in the month-end session's series)

Rule: for a non-period plan, the stored next date is never before its floor; if it is, it becomes the
first date of the schedule on or after the floor.

- BEFORE INSERT OR UPDATE triggers `bills_next_due_floor` / `subscriptions_next_due_floor`, named to fire
  after `*_anchor_day`: if recurrence/cycle <> 'period' and next and floor are not null and next < floor,
  then next := `coalesce(min(plan_occurrences(next, recurrence, floor, floor + 5 years, new.anchor_day)), next)`.
- One-off in the same migration: `update bills set next_due_on = next_due_on where recurrence <> 'period'
  and next_due_on < starts_on` (and the same for active subscriptions, `next_renewal_on < started_on`).
  The no-op update keeps the anchor (case b), then the guard moves the date, so a 31st stays 31.
- Why SQL, not the client save: after the anchor-day triggers, case (f) makes a moved date's day the new
  anchor, so a client writing 30 Nov for a 31st pick would store anchor 30 for good. The trigger still
  knows the picked day. It also covers every writer (forms, voice review, old builds, both rollers, the
  bill-form edit of a loan bill) and `reminders_due` with no change.
- `save_loan` / `update_loan` already store next >= starts_on, so the trigger is a no-op for them.
  `stopBillValues` writes ends_on only, or next = null, so it is unaffected.

## SQL check cases (`supabase/checks/next_due_floor.sql`)

1. Founder's case: monthly, charged 1 Oct, edited to the 15th → next 15 Nov, anchor 15.
2. A 31st pick in a charged October → 30 Nov, anchor 31, then 31 Dec.
3. Weekly: charged this week, moved → first weekday after the charged week (e.g. writes 15 Oct, starts
   19 Oct → 22 Oct).
4. Quarterly: charged 1 Oct, moved to 15 Nov → 15 Feb 2027 (calendar quarter, Founder-confirmed).
5. Yearly moved within its charged year → the same day next year.
6. Subscription: the same as case 1 on `next_renewal_on` / `started_on`.
7. The roller writing 15 Oct over a stale 15 Sep (floor 1 Nov) → 15 Nov.
8. Unchanged: a 'period' bill; a next date already >= floor; both stop shapes (`ends_on` only;
   `next_due_on = null`); `save_loan` and `update_loan` results.
9. Planted stale rows corrected by the one-off, anchors kept.
10. Rerun the `month_end_anchor`, `update_loan` and `loan_payoffs` checks.

Jest, on our side, after the migration lands: a parity table shared with the SQL check; a
reader-agreement test that bill/[id] and subscription/[id] "Next due" equal the first Upcoming date,
`nextDueAfter` and `planMonth` next; the reminders.tsx caption; the add-bill / add-subscription hint
"October is already paid · next payment 15 Nov"; and "Started" = the first payment's date.

## Open (lower risk)

- The client's floor comes from cached charges, so a charge the server records after that read is missed
  and `starts_on` can still land inside a charged cycle. The SQL guard catches the date. Hardening the floor
  itself can come later.
