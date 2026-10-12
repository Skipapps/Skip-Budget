# Add Loan flow + View loan page + Pay off: build plan (Dmitri, 2026-10-12)

Read-only plan, from `add-loan-brief.md` (both parts), the three PNGs, and the code at HEAD + Dana's uncommitted
Loans page v2. Nothing in `src/` or `supabase/` was edited. expo-router is 57.0.15. `router.dismissTo`, `Redirect`
and `Stack.Screen options.gestureEnabled` exist in its types and are already used in the app. Each developer still
checks the v57 docs before using them (house rule; I had no web access in this run).

Three pieces, three migrations, built in this order: **P1 Add Loan flow + "counts toward spending"**, **P2 View
loan page + routing + edit/delete**, **P3 Pay off**. Each piece gets my review before the next starts.

---

## 1. "Counts toward spending" flag

### Column and the rule
`bills.in_spending boolean not null default true` (name as in the brief). It goes on the bill because spending is
counted per bill.

**Rule (one sentence, used everywhere):** with the flag off, the bill **records nothing new and projects nothing**.
Charges already recorded stay counted, because they happened.
- A loan saved with the flag off therefore never counts.
- A loan switched off later keeps its past and stops from today.
- Payoffs (P3) store their own `counted` snapshot, as charges keep their own copy.

### Every place bills are counted or listed (file:line)

**Must skip a flag-off bill**

| Place | File:line | Change |
|---|---|---|
| Server recorder `record_due_charges()` | `supabase/migrations/20260829100013_server_side_charges.sql:135` | `and b.in_spending` in the bills branch (recreate in migration A) |
| Client recorder `recordDueCharges` | `src/api/charges.ts:79-84` | select `in_spending` (with fallback), skip false. Without the fallback a DB lacking the column records **no charges at all** (`:94` returns 0 on error) |
| Ledger projection `ledgerEntries` | `src/api/queries.ts:864-865` | flag off: keep only `occurrence.recorded` rows from `planOccurrences`. This one change covers every row below |
| Bills list (entries, total) | `src/app/bills.tsx:39`, total `:20-23` | via ledger |
| Bills list plan count / empty state | `src/app/bills.tsx:38`, `:64` | filter `useBills` |
| Bill plans list | `src/app/bill-plans.tsx:40` (rows `:55`) | filter |
| Home "Where your money went" + monthly bills total | `src/app/(tabs)/home.tsx:84`, `:96` | via ledger |
| Home Recent / Coming up | `home.tsx:126`, `:133` | via ledger (CEO default: a flag-off loan is not in Coming up; its reminder still fires) |
| Home Current balance | `home.tsx:87` → `queries.ts:1277` → `useBookFlows :1136` | via ledger |
| Cards tab balances | `src/app/(tabs)/cards.tsx:109` → `useSourceBalances queries.ts:1246` | via ledger |
| Card/account page + its ledger | `src/app/source/[id].tsx:90`, `src/app/add-card.tsx:162` | via ledger |
| Activity tab | `src/app/(tabs)/transactions.tsx:83` | via ledger |
| Insights (totals, balances) | `src/app/insights.tsx:90`, `:99` | via ledger |
| Savings "so far" | `src/api/savings.ts:258` | via ledger |
| Savings month close (wrap-up figures) | `savings.ts:887` (ledgerEntries), `:900` (bookFlows); bills read `:853` | via ledger; the read needs the fallback, or the close stops |
| **`unwrittenDatesIn`** | `src/api/savings.ts:793` | **MUST skip flag-off bills.** A bill with past charges that stops recording would look "unwritten" for ever, and **no month would close again** |
| Setup bills list (onboarding) | `src/app/setup-bills.tsx:12` | filter (CEO default) |
| Getting started "bill" tick | `src/api/onboarding.ts:66` | count counted bills only (CEO default) |
| `v_monthly_expenses` view | `supabase/migrations/20260827100006_dashboard.sql:57-66` | unused by the app; add `and in_spending` for consistency (optional) |

Trap: **never drop flag-off bills from the `bills` passed to `bookFlows`** (`queries.ts:1097-1103`). A bill missing
from `running` has all its recorded charges counted by the "plans no longer running" loop. Keep passing every bill
and filter inside `ledgerEntries` only.

**Must still show a flag-off loan (no change)**
- Loans page: `src/api/loans.ts:94` `useLoans` (`bills!inner`).
- Cards tab Loans tile: `loans.ts:42` `useActiveLoans`.
- Bill page: `src/app/bill/[id].tsx:18` finds its bill through `useBills()`, so **`useBills` stays unfiltered**.
  Filter at the consumers.
- `src/components/plans/plan-detail.tsx:91`: give `useLedger` an opt-in `{ uncounted: 'show' }` so a flag-off
  loan's bill page still lists its payments until P2 sends loans to their own page.
- Reminders page: `src/app/reminders.tsx:77`.
- Push reminders: `reminders_due` `20260829100010_reminders_due.sql:135-156`, plus `send-push/index.ts:340`. They
  fire on `next_due_on`, which still rolls (`refresh.ts:49`, `roll_schedules_forward :207`).
- Voice vocabulary: `src/app/voice.tsx:145` (names only, no money).
- "Your money" / Delete account tally: `src/components/settings/use-money-counts.ts:40`. Keep every bill, because
  delete removes them all (CEO default).

### Migration A: `2026101210000N_loan_add_flow.sql` (Diego)
1. `bills.in_spending boolean not null default true` + comment.
2. `loans.payment_day smallint null check (payment_day between 1 and 31)`. Null means "the first payment's day", as
   today. See risk R1: without it, payment day 31 with a first payment on 28 Feb moves every later payment to the
   28th.
3. `drop function if exists public.save_loan(` the 17-argument signature from 0007 `)`. Then `create or replace
   function public.save_loan(` the same 17 parameters, plus `p_in_spending boolean default true`, `p_payment_day
   smallint default null`, `p_counts_from date default null` `)`. Keep every existing argument, name and default.
   Body changes:
   - Write `in_spending` and `payment_day`.
   - `starts_on = greatest(p_first_payment_on, coalesce(p_counts_from, p_first_payment_on))`. This is the charge
     floor; see Founder F1. `next_due_on` stays the first payment, and the sweep rolls it.
   - Compute `v_term_ends_on` **on the payment day, clamped to each month's end**, not
     `first + interval (n-1) months`. Postgres would anchor on 28 Feb, cut the bill 3 days early and refuse a valid
     `p_last_payment_on`.
4. Grants exactly as 0007:169-177: `revoke all … from public, anon; grant execute … to authenticated` on the new
   20-argument signature.
5. `create or replace function public.record_due_charges()`: add `and b.in_spending`. The signature is unchanged,
   so its grants are kept.
6. `create or replace function public.reminders_due()`: a bill's `due_on` becomes null once `next_due_on >
   ends_on`. Today **every ended bill keeps reminding** (the roll-forward ignores `ends_on`). That is a live bug for
   saved loans past their term, and a full payoff (P3) would hit it at once. Keep its revokes.
7. Test it the way 0007/0008 were tested: Docker scratch copy, applied twice, as `postgres`. Then extend
   `supabase/checks/loans.sql`, assert the signature and grants in `src/__tests__/supabase/loan-migrations.test.ts`,
   and get my review before it is pushed.

### Missing-column fallback (until A is live)
- **Reads:** on a 42703 that names `in_spending`, re-read without the column and treat it as true. Same pattern as
  `withPaymentOverrides` (`queries.ts`), composed with `withLogoColumns`. Applies to `useBills` (`queries.ts:295`),
  `useBill` (`:611`), the recorder (`charges.ts:79`) and the savings close read (`savings.ts:853`). The same for
  `payment_day` in `LOAN_COLUMNS` reads.
- **Writes:** `useSaveLoan` (`mutations.ts:487`) names `p_in_spending` only when it is false, `p_payment_day` only
  when the first payment was clamped, and `p_counts_from` only when the first payment is before today. A loan that
  needs none of them is the old call. One that needs them is refused on an old database (PGRST202 → the one failure
  line), never saved wrong. This is 0007's principle.
- One shared helper, `countsInSpending(bill) = bill.in_spending !== false`, in `src/lib/bill-spending.ts`, with
  tests. `BillRow` gains `in_spending?: boolean`.

---

## 2. Flow state, the calculator hand-off, `/save-loan`, navigation

### One route with a view state machine (not a store, not a route per page)
`src/app/add-loan.tsx`, with views `amount → details → review`, plus `paymentEdit` and `principalEdit`, which are
the keypad view reused with the brief's two titles.

Why:
- It is how add-bill, add-receipt and add-subscription already work (one-final-page rule). Local state only, so
  there is no draft store and no param drift.
- A cold link cannot open a half-filled page.
- Header back steps through the views. `gestureEnabled` is on only on the root view (the `EntryReview` / `StepFlow`
  pattern, `entry-review.tsx:138`), so a swipe never skips a step.
- The calculator's `loan-draft.ts` is untouched. Its changes already travel as params.

Opening points:
- **Loans page Add Loan tile** → `/add-loan` (view `amount`).
- **Calculator Save** → `/add-loan?view=details&…` (the payment is already known).
- **Edit** (P2) → `/add-loan?id=<billId>` (view `details`, filled in from the saved loan).
- **Review "Payment schedule"** → `/loan-schedule` with these terms. No draft id, so it is read-only.

### Calculator hand-off (Dana, `src/app/loan-calculator.tsx:251-275`)
`router.push({ pathname: '/add-loan', params: { view: 'details', ...loanParams, ...overrideParams(overrides) } })`,
read with `readLoanRoute` (`src/lib/loan-route.ts:53`), which gains `day` and later `payoffs`. Pre-fill:

| Page 2 field | Comes from |
|---|---|
| Amount borrowed / APR / basis | `amount` / `rate` / `basis` (basis has no field; Review notes it only when not daily 365) |
| Term | `months`, shown in years when divisible by 12 |
| **Start date** (= `funded_on`) | the calculator's `funded` |
| **Payment day** | the day of the calculator's `start` (its first payment) |
| First payment | the rule from `firstPaymentOn(funded, day)`. If that differs from the calculator's `start`, the calculator's date is **pinned** and shown until the person changes Start date or Payment day |
| Monthly payment | `monthly` (the bank's payment) if typed, else the payment the calculator showed. Treated as typed from here on (CEO default) |
| Changed single payments | `overrides` → `payment_overrides`, re-checked on Review with `scheduleWithOverrides` |
| Extras, lump sum, fees | **not carried**. They are what-ifs, and `/save-loan` never saved them either (`save-loan.tsx:53`). Keep the calculator's confirm only when extras are set, because it says so |

### What replaces `/save-loan`, and what is reused
`src/app/save-loan.tsx` is retired: archived to `~/Desktop/SkipBudget-design-archive/<date>/`, its tests moved to
add-loan suites, typed routes regenerated. Reused as they are:
- `LoanTypeGrid` (`components/calculators/loan-type-grid.tsx`), all 8 `LOAN_TYPES`.
- `SourceTiles` with the Skip tile (`null` = unanswered, `''` = Skip).
- `useSaveLoan`, extended.
- `refusedLoanSave` → payments / lastPayment / rate wording (`save-loan.tsx:119-131`).
- `rateSavable` and `SAVABLE_RATE_MAX`; `fixLine`.
- The `lastPaymentOn` rule (`save-loan.tsx:113-114`).
- `AmountStep`/keypad; `DayStrip` (`components/flow/day-strip.tsx`) for 1–31 with scroll-to-chosen, needing a
  "required" mode so tapping the chosen day doesn't clear it; `DateBox` + `InlineCalendar` with past dates allowed.
- `RemindMeCard` (`components/flow/remind-me-card.tsx`) with `LEAD_OPTIONS`; `useSetReminder` after `save_loan`
  returns the bill id.

### After Save
- **New loan:** `finishFlowOn('/loans')` (`src/lib/nav.ts:31`, dismissAll then push, reviewed 2026-10-09) with
  `toast.loan.saved`. Back from /loans goes to the tab. The flow and the calculator are gone, so Back cannot
  re-enter them.
- **Edit:** `router.back()` to `/loan/[id]` (the flow is one route above it), with `toast.loan.updated`.
- **Delete (edit, details view):** confirm, `useDeleteBill`, the deleted toast, then `router.back()`. `/loan/[id]`
  then pops itself because its loan is gone, only while focused (the goal page's MUST from 2026-10-11).
- **Failed reminder write after a successful save:** keep the saved loan and land as normal. Do not roll back.
  Follow add-bill.

---

## 3. View loan page, routing, edit, Pay off

### Routing: every loan opens `/loan/[id]`
`id` is the **bill id**, because everything that lists a loan knows the bill.
- `src/lib/ledger-link.ts:71`: `categoryId === 'loans'` → `/loan/[id]`. `LedgerLinkEntry` gains `categoryId` and
  `planId`. This covers Home `home.tsx:146`, Activity `transactions.tsx:96` and the card/account page
  `source/[id].tsx:354`. P3 adds `payoff-<id>` entries → `/loan/[planId]`.
- `src/app/bills.tsx:154`, `src/app/bill-plans.tsx:209`: same check.
- `src/app/loans.tsx:112` (Dana's v2 file): View details → `/loan/${billId}`.
- `src/app/bill/[id].tsx`: if `useLoanForBill` finds a loan → `<Redirect>` / replace to `/loan/[id]`. This catches
  push taps (`src/api/push.ts:219` `ITEM_ROUTES['/bill']`) and old links. `/loan/[id]` with no loan row (an old
  manual "Loans & Credit" bill) redirects to `/bill/[id]`. Both use the same read, and each redirects only on a
  successful read, so they cannot loop.
- `src/app/setup-bills.tsx:55`: a loan bill opens `/add-loan?id=`.
- add-bill's loan card (`add-bill.tsx:306-309`, `:778-795`) becomes unreachable. Leave it until P2 is reviewed,
  then archive it.

### Page data (Diego)
`useLoanDetail(billId)` returns the loan (with `payment_day`, overrides), its bill (name, icon, source, dates,
`in_spending`) and, in P3, its payoffs. A failed read is an error, never "no loan".

Card, schedule and history come from Drew's helpers on the same terms as the Loans page (`loanTermsOf`):
- `loanStatus` for the card.
- `upcomingPayments(terms, today, 4)` for the next payments (date, principal, interest, payment).
- `loanHistory(terms, today)`: rows dated ≤ today, newest first, plus payoff rows. History amounts are the
  schedule's.
- "Paid from" is the bill's current source, or the payoff's own.

### Edit (P2, migration B, Diego)
`update_loan(p_bill_id, …save_loan's loan fields…, p_in_spending, p_payment_day, p_payment_overrides,
p_last_payment_on, p_next_due_on)`: SECURITY INVOKER, one transaction, the same checks and grants as save_loan.
**Not `save_loan`**: that inserts a second bill and loses the history, the reminder and the charges. **Not
`useUpdateBill` plus a loans update**: two writes, not atomic.

The bill's `starts_on` keeps the floor-after-charges rule (`src/lib/charges.ts:108`), so moving the payment day
cannot charge a month twice. Switching the flag off → on sets the floor to today (no back-fill). Changed single
payments that no longer fit the new terms are dropped, and Review says so (CEO default).

### Pay off (P3, migration C)
**Storage:** table `loan_payoffs`:

| Column | Definition |
|---|---|
| `id` | uuid pk |
| `user_id` | default `auth.uid()`, RLS own |
| `loan_id` | → loans, on delete cascade |
| `paid_on` | date |
| `amount` | numeric(14,2) > 0, whole cents |
| `kind` | 'full' \| 'partial' |
| `card_id`, `bank_account_id` | on delete set null |
| `counted` | bool: the bill's `in_spending` at that moment |
| `created_at` | |

Also add it to the realtime publication, and make it invalidate 'loans' and the ledger.

RPCs:
- `record_loan_payoff(p_bill_id, p_paid_on, p_amount, p_kind, p_card_id, p_bank_account_id, p_last_payment_on)`:
  inserts and sets `bills.ends_on`, in one transaction. A full payoff ends the bill on `paid_on`. A partial one ends
  it on the schedule's new last payment.
- `delete_loan_payoff(p_id, p_last_payment_on)`: see Founder F3.

Checks: date ≤ the user's today (`profiles.timezone`) and ≥ `funded_on`; whole cents. Grants as 0007.

**Engine (Drew):** `LoanTerms.payoffs?: { on: Date; amount: number; full: boolean }[]`. It is **part of the
contract**: `applyOverrides`'s contract and `withExtras: false` keep it, unlike extras. `termsFromStored` /
`loanTermsForBill` / `loanTermsOf` take the payoff rows. The only callers today are `add-bill.tsx:309`,
`loans.ts:147` and `loans.tsx:28`.

Posting:
- On the payoff day, interest accrued since the last posting (exact BigInt path) posts once. The payoff pays that
  interest, then principal.
- A **full** payoff pays exactly what is owed, and the schedule ends with a `payoff` row on that date.
- A **partial** payoff lowers the balance. The level payment is unchanged (it is the stored `monthly_payment`),
  later rows accrue on the new balance, and the last payment absorbs the gap, so the loan ends sooner.
- The calculator's existing lump sums (principal-only, interest posting at the due date) stay as they are; they are
  what-ifs. See F2.

Functions:
- `payoffQuote` (`src/lib/loan.ts:712`) learns earlier payoffs; its `.payoff` is "Pay it all".
- `checkPayoff(terms, payoff, today, lastPaymentMade)` refuses, with words: not whole cents, zero, more than owed
  (with the amount it takes), before the start, after today, the loan already finished, or a full payoff before an
  instalment already made (R5).

Monthly-rests loans need one written rule. Use per diem since the last posting, as `payoffQuote` already does.

Fixtures: a Python decimal reference, plus a real statement (F2).

**Spending:** neither a charge nor a receipt.
- **Not a charge:** charges are unique per `(bill_id, charged_on)` and `charges_one_per_cycle`
  (`20260928100003:33`) refuses a second charge for a bill in one month. The recorders treat charges as plan
  occurrences.
- **Not a receipt:** it would land in Receipts and books, with a store and the free-allowance wording.

Instead `ledgerEntries` takes `payoffs` and emits `{ id: 'payoff-<id>', kind: 'bill', planId: billId, categoryId:
'loans', date: paid_on, amount: -amount, sourceId }` when `counted`. Balances, Home, Activity, Insights, the Bills
total and savings follow from that. `closingFlows` (`savings.ts:853`) reads `loan_payoffs` fresh, and a missing
table (42P01/PGRST205) reads as no payoffs.

**Page (Dana):** `/loan-payoff?id=` on the one-route view pattern:
- Keypad amount with "Pay it all".
- Date (default today; limits from `checkPayoff`).
- Paid from with Skip.
- Save, then `router.back()` with a toast. A full payoff shows the Finished state.

---

## 4. Split, ownership, order

| Who | P1 (Add flow + flag) | P2 (View loan + edit) | P3 (Pay off) |
|---|---|---|---|
| **Drew** | `src/lib/loan-first-payment.ts` (`firstPaymentOn`, tests: month ends, 29 Feb 2024 vs 28 Feb 2025, day < start day); `paymentDay` anchor in `src/lib/loan.ts` `paymentDates`/`solvePayment`/`termsFromStored`; `src/lib/loan-review.ts` (fields → terms → `scheduleWithOverrides` → payment, real count, total interest, total paid, balloon, refusal, next/first payment, `lastPaymentOn`), fixture = the wireframe loan on the engine, cross-checked in Python | `upcomingPayments`, `loanHistory` (`src/lib/loan-status.ts`, after Dana's v2 review lands) | payoffs in `loan.ts` / `loan-overrides.ts`, `payoffQuote`, `src/lib/loan-payoff.ts` `checkPayoff`, fixtures |
| **Diego** | migration A + scratch + checks; `src/lib/bill-spending.ts`; `queries.ts` (fallbacks, `ledgerEntries`, `useLedger` option), `charges.ts`, `savings.ts`, `onboarding.ts`, `mutations.ts` `useSaveLoan`; the one-line filters in `bills.tsx`, `bill-plans.tsx`, `setup-bills.tsx` | migration B `update_loan`; `useUpdateLoan`; `useLoanDetail` (`src/api/loans.ts`) | migration C; `useLoanPayoffs`, `useRecordPayoff`, `useDeletePayoff`; payoffs in `ledgerEntries` and `closingFlows`; realtime |
| **Dana** | `src/app/add-loan.tsx`, `src/components/loans/add/*`, `src/i18n/messages/loan-flow.ts` (+ one line in `messages/index.ts`); calculator hand-off; Add Loan tile; retire `save-loan.tsx`; tests in `src/__tests__/app/` | `src/app/loan/[id].tsx`, `src/components/loans/view/*`; routing in `ledger-link.ts`, `bills.tsx:154`, `bill-plans.tsx:209`, `loans.tsx:112`, `bill/[id].tsx`, `setup-bills.tsx:55`; edit mode + Delete in `add-loan.tsx` | `src/app/loan-payoff.tsx`; History payoff rows |
| **Dilip** | none | none | measure payoff posting on the 13 Pro Max if Drew's node timings grow (as for 0007) |

Rules for the table:
- New strings go in `loan-flow.ts`, **not** `messages/loan.ts`, which Dana is editing for v2.
- Diego's P1 edits in `bills.tsx`, `bill-plans.tsx` and `setup-bills.tsx` must be reviewed before Dana's P2
  routing edits touch the same files.

**Can start now, alongside Dana's v2 work (no shared files):**
- Drew's P1: `loan-first-payment.ts`, the anchor in `loan.ts`, `loan-review.ts`. Not `loan-status.ts`, which is in
  review.
- Diego's P1: migration A and the flag filters. Not `src/api/loans.ts` until v2 is reviewed.

**Waits for the v2 review GO:** all of Dana's work, `loans.tsx` / `loan-tiles.tsx`, and Drew's `loan-status.ts`
helpers.

**Gate before the Founder's device build:** migration A live (and B/C for their pieces), as with 0007/0008.

---

## 5. Risks, conflicts, CEO defaults

| # | Risk / conflict | CEO default |
|---|---|---|
| R1 | Payment day 29–31: `paymentDates` anchors on the first payment's day, so the Founder's own example (start 31 Jan, day 31 → 28 Feb) puts every later payment on the 28th: wrong interest days, not cent-exact | Store `loans.payment_day`; the engine anchors on it (Drew + Diego, P1) |
| R2 | The same case on the **bill** side: bill occurrences step from `next_due_on`, and the roll-forward rewrites it (`refresh.ts:32`, `card-ledger.ts:153`). Charges and reminders land on the 28th/30th. This already happens to every bill due on the 29th–31st. Amounts and months are right; only the day drifts | Out of scope; separate ticket (bills anchored on a day of month) |
| R3 | `reminders_due` ignores `ends_on`, so finished loans and ended bills keep reminding | Fix in migration A (step 6) |
| R4 | A past start date back-fills charges for every instalment since the first payment (`starts_on` is the charge floor) | `p_counts_from` = today: counts from the next payment on (F1) |
| R5 | A full payoff dated before an instalment already charged leaves that charge counted after the loan ended | Full: not before the day after the last payment made. Partial: any date from the start to today (this narrows the brief's "not before the start date" for full only) |
| R6 | Bills always charge the level `amount`; changed payments, a shorter last payment and the tail after a partial payoff are not reflected in spending (pre-existing; the Founder put "bills follow per-payment amounts" on the backlog 2026-10-09) | Unchanged in this work; flagged to the Founder |
| R7 | A payoff date in a month already wrapped up does not change that month (months are frozen by design) | As designed |
| R8 | Delete loan is a hard delete: the bill, loan, charges, reminder and payoffs cascade, and past months' history loses them (today's behaviour, which the Founder chose) | As today |
| R9 | Loan maths: no real-statement fixture covers payoffs (or overrides) | Ask the Founder (F2); until then, engine + Python reference only, marked as such in the review |
| C1 | One-final-page rule ("never a stepper") vs a 3-page flow | The Founder's newer, explicit wireframe wins. Built on the same one-route view machine; edit opens straight on page 2 |
| C2 | Paid from: the wireframe has no Skip tile | Skip tile, required (app-wide rule) |
| C3 | Reminder "required": the switch is always answered (on at 3 days, or off) | Holds as is |
| C4 | Rows open detail pages: loans now open `/loan/[id]`, and the pencil leads to edit | Matches the rule |
| C5 | Wireframe numbers are placeholders and disagree: "48 payments" vs "all 60 payments"; "19 Oct, 3 days before" a 27 Oct payment; $18,000 + $2,390.26 ≠ $20,390.40; start 27 Dec but chip 22; 6 types in 3×2 | Every figure comes from the engine; payment day defaults to the start day; 8 types 4×2; switch ON drawn in plum |
| C6 | Calculator first payment not on the rule's date | Pinned until Start date or Payment day changes |
| C7 | Calculator extras/fees | Not saved (as today) |

### Only the Founder can answer
- **F1.** For a loan you already have, should payments made **before you added it** count as past spending
  (filling earlier months, Activity and Insights)? Or only from the next payment on? *Default: from the next
  payment on.*
- **F2.** For a partial payoff, does your bank take the interest built up since the last payment first, or put the
  whole amount on the balance? A real statement or payoff letter showing one would let us prove it to the cent.
  *Default: interest first, then the balance (one rule for full and partial).*
- **F3.** Can a payoff be removed if typed wrong? *Default: yes, from its History row, with a confirm.*
- **F4.** If the payment day comes earlier in the month than the start day, is the first payment still the very
  next month? Start 28 Dec, day 2 → 2 Jan, only 5 days of interest; many banks skip to February. *Default: as you
  wrote it (next month).*
- **F5.** (Backlog check.) Should loan payments in spending follow the schedule's real amounts (last payment,
  changed payments, after a payoff) rather than always the monthly figure? *Default: unchanged for now (R6).*

### Founder answers (2026-10-12) — these override the defaults above
- **F1: from the next payment on.** Payments made before the loan was added don't count as past spending
  (`p_counts_from` = today); the Loans page and History still show them.
- **F2: interest first, then the balance**, for full and partial payoffs.
- **F3 (CEO):** yes, a payoff can be removed from its History row, with a confirm.
- **F4: the month after next when the payment day is earlier than the start day.** First payment = the payment day
  of the month after the start date when that day ≥ the start date's day (27 Dec + 27 → 27 Jan; 28 Dec + 28 →
  28 Jan); otherwise the payment day of the month after that (28 Dec + 2 → 2 Feb). Days 29–31 clamp to month end;
  compare on the requested day, not the clamped one (31 Jan + 31 → 28/29 Feb).
- **F5 (CEO):** unchanged for now (backlog R6).
- **Plan approved by the CEO.** Order P1 → P2 → P3, Dmitri's review between each. Migrations are pushed to the live
  database only with the Founder's go, after the Docker scratch test and Dmitri's review.
