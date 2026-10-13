# Past and upcoming on edit and delete: build plan (Dmitri, 2026-10-12)

Brief: `past-and-upcoming-brief.md`. Read-only plan. Habit files belong to the habits session. They reuse the shared piece in §3.

## What the code does today (facts the plan rests on)
- A charge copies label / amount / card / account from its plan when it is recorded (`record_due_charges`, the app recorder).
  The recorders cap at `least(today, ends_on)` and skip a bill with `next_due_on` null and a subscription with `active` false.
- `reminders_due`: a bill reminder is dropped once `next_due_on > ends_on`; a subscription reminder joins `s.active`. No local notifications for plans.
- **Ledger gap (pre-existing):** `ledgerEntries` (`src/api/queries.ts` ~874/899) lists charges only for plans still running
  (subscription `active && next_renewal_on`, bill `next_due_on`). A cancelled subscription's (or a `next_due_on`-null bill's) past
  charges therefore vanish from Activity, Home months, Insights and the Bills total. `bookFlows` still counts them through its
  leftover loop, so balances and savings are right. "Keep past" for subscriptions is unusable until this is fixed.
- `bills_period_order`: `ends_on >= starts_on`. After an edit, `floorAfterCharges` (and update_loan's floor) can put `starts_on`
  in the next cycle, after today. So a plain `ends_on = today` can be refused (23514).
- `update_loan` always rewrites `ends_on` / `next_due_on` from the terms. Editing a loan stopped by "keep past" would restart it
  and back-fill the months since the stop.
- The loan "stopped" state already exists: `loanBillEnded` (`ends_on <= today` or no next date), `loanEnding` → 'stopped',
  `endedOn = ends_on`, `loanPricingDay` freezes figures at `ends_on`. "Stopped on {date} · {amount} left" keys exist (`loan.list.stoppedOn`).
  Removing a payoff on a stopped loan already sends null (`loan/[id].tsx:92`), so it stays stopped.
- Subscriptions have no end date, only `active` (the "Active / Cancelled" chip on the edit form).

## 1. Edit loan → past and upcoming
- **When it asks:** on Save from Review in `/add-loan?id=`. It asks if the name (`loanName(form).trim()`), the monthly payment
  (`priced.save.monthlyPayment`, compared in cents to the stored `bill.amount`) or Paid from changed, **and** the loan's bill has
  ≥1 recorded charge. Payoffs are not counted for this question. It asks **before anything is written**; backing out writes nothing.
  It waits for the charges read (`ready`/`retry`, as bills do).
- **Reuse:** `usePastCharges('loan', billId)`. `'loan'` is a new kind: column `bill_id`, noun "payments". Its dialog comes from the
  shared `usePastChoice` (§3).
- **"Past and upcoming" rewrites** every charge with `bill_id = loan bill`: `label = coalesce(nullif(name,''),'Bill')`, `amount`
  (= new monthly payment), `card_id`, `bank_account_id`. The values are read from the bill row after the update, the same copy the
  recorder makes. Dates are never touched.
- **Payoffs are not touched.** They carry their own amount, source and date. Their ledger label is read live from the bill, so a
  rename shows on payoffs whichever choice is made (accepted; a payoff is part of the loan, not a charge).
- **Atomic: yes, one server function.** Recommended: migration `20261012100004_update_loan_and_charges.sql` adds
  `update_loan_and_charges(<update_loan's 18 args, same names/defaults>) returns bills`. It is security invoker,
  `search_path=public`, revoked from public/anon and granted to authenticated. It does `perform update_loan(...)` (unchanged,
  still byte-identical to C), then rewrites that bill's charges from the updated bill row, in one transaction.
  - "Upcoming only" calls plain `update_loan` (no change).
  - Any refusal or failure means nothing is written, and it gets the same refusal lines / one failure line (`refusedLoanSave`).
  - Then the reminder write, with the existing `writtenId` retry.
  - Without D live, "Past and upcoming" fails with the failure line (PGRST202) and writes nothing. Upcoming only works.
  - Fallback if the CEO/Founder refuse a migration: update_loan, then the client rewrite, holding a pending 'all' so the next Save
    re-runs the rewrite alone. This can be left half-applied if the person walks away.
- **Money check:** the engine prices from `loans` terms, never from charges. A rewrite changes spending history only. Months with
  a payment override already carry the level amount today (R6 backlog), so no new error, and no statement match for those months either.

## 2. Delete: keep past / remove everything (bills, subscriptions, loans)
**When "Keep past" is offered:** the plan is running (bill: not `billStopped`; subscription: `active`; loan: `loanEnding` null)
**and** it has a past (charges ≥1; for loans charges + payoffs ≥1). It waits for the charges read, as edit does.
- No past means today's one-step confirm, unchanged in effect.
- An already stopped/finished plan with a past gets only "Remove everything"; Cancel reads as the keep label (it is already kept).

**Keep past, in data (no migration):**
- **Bill and loan:** pure helper `stopBillValues(bill, today)` in new `src/lib/plan-stop.ts`:
  - `starts_on` null or ≤ today: `{ ends_on: today }`. `next_due_on` stays, so today's due is recorded the same way whatever the
    cron timing, and nothing after today is charged, projected (ledger window ends at ends_on) or reminded (`next_due_on > ends_on`).
  - `starts_on` > today: `{ starts_on: today, ends_on: today, next_due_on: null }`. Nothing was due before that floor anyway.
    Null stops both recorders and the roll. This needs the ledger fix below so its history still lists.
  - Written by a new `useStopBill()`. It is a direct update, NOT through `useUpdateBill`'s `guardBillDates`, which would put back
    the loan's `starts_on` and trip 23514. It is one row, one call, atomic.
  - **Loans:** the result is the existing stopped state. It moves to Finished as "Stopped on {today} · $X left", figures frozen by
    `loanPricingDay`, Pay off hidden (`view.ending`), payoff removal sends null.
- **Subscription:** `{ active: false }` through new `useStopSubscription()` (the existing "Cancelled" state). Recorder, roll,
  projections and reminders already skip it. There is no stop date (no column): it shows "Cancelled" plus its last charge date.
- **Reminder rows are left in place:** the server already sends nothing (above). The Reminders page must hide stopped bills
  (subscriptions are already filtered). "Remove everything" cascades as today.

**Where a kept plan lives and how its history is found:**
- It leaves the active lists and totals:
  - Bills page and Subscriptions page: a section at the bottom, "Stopped" (bills) / "Cancelled" (subscriptions), with no date
    groups and no totals.
  - Loans: the Finished section (exists).
  - `bills.tsx` plan count skips stopped bills.
- Its charges stay in Activity, Home's months, Insights, card/account pages, balances and savings. Each row opens the plan's page
  (`ledgerHref` via `planId`). That page shows "Stopped on {date}" (bill) / "Cancelled" (subscription) / Finished (loan).
- **Ledger fix (required):** `ledgerEntries` also lists the recorded charges of plans that are not running, in window, with
  `planId`, kind, category and icon, and the same in_spending rule as now. `bookFlows` keeps its leftover loop but skips charge ids
  already in `entries`, so balances and savings come out identical.
  - Visible effect: Home/Activity/Insights months gain cancelled subscriptions' and stopped loans' charges that were missing (a
    correction; Home then agrees with savings).
- **A stopped plan is read-only (CEO default):** no pencil on `/bill/[id]`, `/subscription/[id]`, `/loan/[id]` when stopped, and a
  "Delete" action on that page. This closes every restart path:
  - update_loan's restart and back-fill.
  - A bill recurrence switch clearing `ends_on`.
  - The subscription chip flipping back to Active over a stale `next_renewal_on`, which back-fills the gap.
- Closed months stay frozen (R7). Remove everything changes Activity/Home history going back, as delete does today, and the dialog says so.

## 3. Shared dialog and wording (bills, subscriptions, loans, habits)
**`src/components/ui/past-choice.ts`**: `usePastChoice()` returns:
```ts
export type PastNoun = 'charges' | 'payments' | 'days';
askChange(o: { name: string; noun: PastNoun; count: number }): Promise<'all' | 'upcoming' | null>
askDelete(o: { name: string; noun: PastNoun; count: number; stopped?: boolean }): Promise<'keep' | 'everything' | null>
```
- Pure UI over `useDialog`, with no data.
- The caller asks `askChange` only when a copied field changed (name included) and count ≥ 1.
- `askDelete` rules:
  - count 0 → the plain confirm ([Delete] destructive + Cancel) → 'everything' | null.
  - count ≥ 1, running → [keep (filled), Remove everything (destructive)] + Cancel.
  - count ≥ 1, `stopped` → [Remove everything] + Cancel labelled with the keep words.
- null always means backed out, with nothing written.
- The "maybe already charged" keys go: every screen waits for the read (`ready`) before asking, so they are unreachable.

Keys in `src/i18n/messages/ui.ts` (Dana adds all, the `days` set included, so the habits session edits no shared file):

| key | en | es | fr |
|---|---|---|---|
| ui.past.change.title.charges | Change past charges too? | ¿Cambiar también los cargos anteriores? | Modifier aussi les prélèvements passés ? |
| ui.past.change.title.payments | Change past payments too? | ¿Cambiar también los pagos anteriores? | Modifier aussi les paiements passés ? |
| ui.past.change.title.days | Change past days too? | ¿Cambiar también los días anteriores? | Modifier aussi les jours passés ? |
| ui.past.change.body.charges (one) | {name} has already been charged once. Change that charge as well, or only the ones still to come? | Ya hubo un cargo de {name}. ¿Cambiar también ese cargo o solo los próximos? | Un prélèvement a déjà eu lieu pour {name}. Modifier aussi ce prélèvement, ou seulement ceux à venir ? |
| (other) | {name} has already been charged {count} times. Change those as well, or only the ones still to come? | Ya hubo {count} cargos de {name}. ¿Cambiarlos también o solo los próximos? | {count} prélèvements ont déjà eu lieu pour {name}. Les modifier aussi, ou seulement ceux à venir ? |
| ui.past.change.body.payments (one) | {name} already has 1 payment recorded. Change that payment as well, or only the ones still to come? | Ya hay un pago registrado de {name}. ¿Cambiar también ese pago o solo los próximos? | Un paiement a déjà été enregistré pour {name}. Modifier aussi ce paiement, ou seulement ceux à venir ? |
| (other) | {name} already has {count} payments recorded. Change those as well, or only the ones still to come? | Ya hay {count} pagos registrados de {name}. ¿Cambiarlos también o solo los próximos? | {count} paiements ont déjà été enregistrés pour {name}. Les modifier aussi, ou seulement ceux à venir ? |
| ui.past.change.body.days (one) | {name} already has 1 day logged. Change that day as well, or only the days still to come? | Ya hay un día registrado en {name}. ¿Cambiar también ese día o solo los próximos? | Un jour a déjà été noté pour {name}. Modifier aussi ce jour, ou seulement ceux à venir ? |
| (other) | {name} already has {count} days logged. Change those as well, or only the days still to come? | Ya hay {count} días registrados en {name}. ¿Cambiarlos también o solo los próximos? | {count} jours ont déjà été notés pour {name}. Les modifier aussi, ou seulement ceux à venir ? |
| ui.past.change.all | Past and upcoming | Anteriores y próximos | Passés et à venir |
| ui.past.change.upcoming | Upcoming only | Solo los próximos | Seulement ceux à venir |
| ui.past.delete.title | Delete {name}? | ¿Eliminar {name}? | Supprimer {name} ? |
| ui.past.delete.none | This can’t be undone. | Esto no se puede deshacer. | Cette action est irréversible. |
| ui.past.delete.body.charges (one) | {name} has 1 past charge. Keep it in your history, or remove it from past months too? Either way, nothing after today is recorded. | {name} tiene un cargo anterior. ¿Conservarlo en tu historial o quitarlo también de los meses pasados? En ambos casos, no se registra nada después de hoy. | {name} a un prélèvement passé. Le garder dans ton historique, ou le retirer aussi des mois passés ? Dans les deux cas, rien n’est enregistré après aujourd’hui. |
| (other) | {name} has {count} past charges. Keep them in your history, or remove them from past months too? Either way, nothing after today is recorded. | {name} tiene {count} cargos anteriores. ¿Conservarlos en tu historial o quitarlos también de los meses pasados? En ambos casos, no se registra nada después de hoy. | {name} a {count} prélèvements passés. Les garder dans ton historique, ou les retirer aussi des mois passés ? Dans les deux cas, rien n’est enregistré après aujourd’hui. |
| ui.past.delete.body.payments (one / other) | as charges, with "1 past payment" / "{count} past payments" | "un pago anterior" / "{count} pagos anteriores" | "un paiement passé" / "{count} paiements passés" |
| ui.past.delete.body.days (one / other) | as charges, with "1 past day" / "{count} past days" | "un día anterior" / "{count} días anteriores" | "un jour passé" / "{count} jours passés" |
| ui.past.delete.keep.charges | Keep past charges | Conservar los cargos anteriores | Garder les prélèvements passés |
| ui.past.delete.keep.payments | Keep past payments | Conservar los pagos anteriores | Garder les paiements passés |
| ui.past.delete.keep.days | Keep past days | Conservar los días anteriores | Garder les jours passés |
| ui.past.delete.everything | Remove everything | Eliminar todo | Tout supprimer |

French plural 'one' also covers 0. Count 0 never reaches a body (the plain confirm takes it). The `api.pastCharges.*` keys and the
per-screen `bills.add.deleteTitle/Message`, `subscriptions.add.deleteTitle/Message` and `loanFlow.edit.deleteTitle/Message` keys are removed once unused.

**Toasts differ:** keep → success look (green check); remove everything → the existing `toast.<kind>.deleted` (red X, 'deleted').
New keys in `toast.ts`:

| key | en | es | fr |
|---|---|---|---|
| toast.bill.stopped | Bill stopped | Factura detenida | Facture arrêtée |
| toast.subscription.stopped | Subscription cancelled | Suscripción cancelada | Abonnement annulé |
| toast.loan.stopped | Loan stopped | Préstamo detenido | Prêt arrêté |
| toast.habit.stopped | Habit stopped | Hábito detenido | Habitude arrêtée |

The subscription toast matches the "Cancelled" it then shows. The dialog itself never says stopped or cancelled.

## 4. Split, order, ownership
**Step 1, in parallel:**
- **Dana (UI):**
  - `src/components/ui/past-choice.ts` (new).
  - `ui.past.*` in `src/i18n/messages/ui.ts`.
  - The 4 `toast.*.stopped` keys in `src/i18n/messages/toast.ts`.
  - Test: `src/__tests__/components/past-choice.test.tsx`, covering every branch and es/fr plural one/other.
  - **Hand the habits session the import as soon as it lands.**
- **Diego (data):**
  - `supabase/migrations/20261012100004_update_loan_and_charges.sql` and `supabase/checks/update_loan_and_charges.sql`. Checks:
    - Rewrite on all; untouched on refusal.
    - RLS/anon.
    - update_loan byte-identical.
    - Mutants.
    - Docker scratch run as for C.
  - `src/lib/plan-stop.ts` (`billStopped`, `stopBillValues`).
  - The ledger fix in `src/api/queries.ts`, with a fixture month:
    - A cancelled sub and a stopped loan charge.
    - Home's ledger month total equals bookFlows spending for that month, to the cent.
    - bookFlows / moneyBook / savings close identical before and after.
  - `src/__tests__/api/ledger-stopped-plans.test.ts`, `src/__tests__/lib/plan-stop.test.ts`.
  - Scratch check: `reminders_due` returns nothing for a stopped bill (both shapes) and a cancelled sub.

**Step 2:**
- **Diego:**
  - `src/api/past-charges.ts`: kind 'loan'; `count`; `chooseDelete(name, { stopped, extra })` over `usePastChoice`; dialog strings
    gone. Update `src/api/past-charges.test.tsx` in place.
  - `src/api/mutations.ts`: `useStopBill`, `useStopSubscription`; `useUpdateLoan({ ..., past })` → `update_loan_and_charges`
    when `past`, invalidating 'charges' and 'dashboard' too.
  - Remove `api.pastCharges.*`.

**Step 3 (Dana):**
- `src/app/add-loan.tsx`: edit ask + delete choice. Keep → `/loan/[id]`; everything → `finishFlowOn('/loans')` as today.
- `src/app/add-bill.tsx`, `src/app/add-subscription.tsx`: delete choice.
- Detail pages, read-only when stopped + Delete:
  - `src/app/bill/[id].tsx`, `src/app/subscription/[id].tsx`.
  - `src/app/loan/[id].tsx` + `src/components/loans/view/loan-view-footer.tsx`.
- Bottom sections: `src/app/bill-plans.tsx`, `src/app/subscription-plans.tsx`.
- `src/app/bills.tsx` count; `src/app/reminders.tsx` filter.
- Removal of the now-unused delete keys.
- Screen tests under `src/__tests__/app/` (never `src/app`).
- Should-fix while in add-bill/add-subscription: a failed rewrite keeps the pending 'all', so the next Save retries it without
  re-asking (today it silently drops it).

**Drew (loan maths, tests only):**
- `src/__tests__/lib/loan-stop.test.ts`: a fixture loan stopped on 12 Oct 2026 (with and without a partial payoff), and one with
  `starts_on` after today. It proves:
  - "Stopped on 12 Oct 2026 · $X left", with $X to the cent from the schedule balance after the last payment on or before the stop.
  - Upcoming is empty; the Loans summary and Cards Loans tile treat it as finished.
  - `loanStatus` is unchanged by a charges rewrite.
- No src change expected; flag at once if one is needed.

**Step 4:** Dmitri review (gates, both the C+D scratch runs) → CEO → Founder go to apply D live → push → Release build, Founder
tests on the 13 Pro Max.

**Shared-file cautions:**
- The habits session imports `past-choice.ts`, `ui.past.*` and `toast.habit.stopped`, and must not edit them; ask Dana for any new word.
- `src/api/queries.ts` (ledger, habit marks) may also be in the habits session's set. Diego checks their file list before
  touching it. Migration numbers: ours 20261012100004; theirs 20261012200001.

## Risks
1. **Ledger fix moves numbers people see.** Home/Activity/Insights past months grow by previously missing cancelled-sub /
   stopped-loan charges. Balances and savings must not move; the fixture must prove both.
2. `bills_period_order` on stop: handled by `stopBillValues`, but it must never go through `guardBillDates`.
3. **Restart paths are closed only by read-only:** if the Founder wants restart, extra work is needed:
   - Loans: a stop-aware edit (Drew + Dana).
   - Subscriptions: reactivation counts from the picked renewal, no back-fill (Diego).
4. Existing cancelled subscriptions (demo data) become read-only and move to the Cancelled section.
5. "Past and upcoming" on a loan flattens every past instalment to the new level payment (override months were already level, R6).
6. D not live yet: "Past and upcoming" on loans fails safely until applied.

## CEO defaults (apply unless the Founder says otherwise)
- Migration D (atomic loan edit + rewrite) yes; no migration for delete.
- Stop is inclusive of today (today's due is recorded); reminder rows left, inert.
- A stopped plan is read-only, with Delete on its page.
- Stopped/Cancelled section at the bottom of Bills and Subscriptions.
- Subscriptions show "Cancelled" plus last charge date, no stop date.
- Delete with no past stays one step.

## Founder only
1. May a stopped bill / subscription / loan be restarted, or is stopped final ("add it again")?
2. Subscriptions: is "Cancelled" plus last charge date enough, or show "Stopped on {date}"? That needs one column (a migration).
3. Stopped bills and subscriptions: a section at the bottom of their pages (default), or hidden and reached only from history?
4. On the stop day, is a payment due that same day still recorded (default yes)?
5. Home/Activity/Insights past months will start showing cancelled subscriptions' charges (a correction): OK?

## Founder answers (2026-10-12) — override the defaults above
1. **Stopped is final.** A stopped bill, subscription or loan is read-only (view + Delete); to pay again, add it fresh.
2. **Stopped bills and cancelled subscriptions get a section at the bottom** of Bills / Subscriptions (loans keep Finished).
3. **Subscriptions show "Cancelled · last charged {date}"**; no new stop-date column.
**CEO:** migration 20261012100004 for the atomic loan edit: yes. A payment due on the stop day is still recorded: yes.
Past months gaining the missing cancelled-subscription / stopped-plan charges in Activity, Home and Insights is a
correction (balances and savings must not move): tell the Founder.
Habits: the "Spending habits page redesign" session builds the habit side with `usePastChoice` and owns migration
20261012200001; don't touch habit files.
