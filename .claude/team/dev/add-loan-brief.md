# Add Loan flow: CEO brief (2026-10-12)

Founder wireframes (grey placeholders, layout only), in `.claude/team/design/reference/add-loan/`:
`1-monthly-payment.png`, `2-loan-details.png`, `3-review.png`. "Design it according to our app": real gradient icons,
theme tokens, our components. Built **after** the Loans page v2 (`loans-page-v2-brief.md`) lands and is reviewed.
Loans are free on every plan (no Pro wall).

## Founder answers (2026-10-12)
1. **"Add to monthly bills" switch** (Review page), starts ON. **OFF = the loan stays on the Loans page with its
   schedule and reminder, but its payments do not count toward monthly spending and it does not show in Bills.**
   Needs a small DB change.
2. **First payment = the month after the start date, on the payment day** (clamped to month end: start 31 Jan, day
   31 → 28/29 Feb). Shown under the day chips as "First payment 27 Jan 2025". Payment day defaults to the start
   date's day.
3. **All 8 loan types** (`LOAN_TYPES`), 4×2 grid with their gradient icons (existing `LoanTypeGrid`).
4. **The calculator's Save opens these pages, pre-filled** (page 2 with the calculator's numbers, then Review).
   Today's `/save-loan` page is retired. Payments changed one by one in the calculator (`payment_overrides`) and its
   other saved terms carry over to the save.
5. Back arrow on every page, no tab bar (as for the Loans page).

## Pages
**1. Monthly payment** (keypad): back; "How much do you pay each month?" / "Enter your monthly installment.";
big amount; the app's amount keypad (`src/components/flow/amount-step.tsx` / `amount-keypad.tsx`, as Add bill uses);
pinned footer Continue (disabled or "Enter an amount" until > 0). Entry: Loans page **Add Loan** tile.

**2. Loan details**: back; title (CEO default "Your loan").
- Loan type: 4×2 `LoanTypeGrid`, required.
- One card of fields, wireframe order:
  - Loan name: defaults to the type's name ("Car loan") until typed in; required.
  - Monthly payment "$424.80 · Edit" → the keypad page for that amount.
  - Amount borrowed "$18,000 · Edit" → the keypad page ("How much did you borrow?"). Empty → "Add".
  - APR: decimal field with "%" (stored as `annual_rate`, as the calculator's rate; DB range 0–100).
  - Term: number + Years / Months segmented control.
  - Start date: date picker (past allowed: people add loans they already have); = `funded_on`.
  - Payment day: horizontal chips 1–31, scrolled to the chosen one; "First payment {date}" under them.
- Paid from: `SourceTiles` with the Skip tile (the app-wide Paid-from rule), required.
- Pinned footer Continue. Missing items: Continue lists what is missing (the one-final-page rule).

**3. Review your loan**: back; "Review your loan".
- Card: loan-type icon, name, "Next payment {date}" (or "First payment {date}" if none made yet), big amount
  borrowed + "Amount borrowed", rows Monthly / APR / Term ("4 years · 48 payments", the schedule's real count) /
  Total interest / Total you'll pay — all from the same schedule the Loans page and bill page use, with the bank's
  payment as entered (last payment absorbs the gap). Balloon (payment too small to clear the loan in the term):
  allowed with the calculator's clear warning; a payment that never clears the loan: refused with the existing
  wording. Interest: the app default (daily, Actual/365) unless the calculator passed another basis.
- "Add to monthly bills" switch + "Counts toward your monthly spending" (ON by default).
- "Remind me" switch with the reminder gradient icon, "{date}, {n} days before it's due", chips On the day / 1 day
  / 3 days / 1 week; ON at 3 days by default (as new cards/accounts). Uses the existing reminders table for the
  loan's bill.
- "Payment schedule" row (schedule gradient icon) "See where all {n} payments go" → `/loan-schedule` with these
  terms.
- Pinned footer: "Save loan" (busy label while saving) and a "Back to edit" text button (back to page 2).
- Save → `save_loan` + reminder → land on `/loans` with the saved toast; the flow's pages must not be reachable by
  Back afterwards (nav one-way doors: `resetTo`/dismiss, not `replace`).

## Data (Diego)
- A bill-level flag for "counts toward spending" (e.g. `bills.in_spending boolean not null default true`),
  `save_loan` gains the parameter (keep every existing argument; recreate with grants as in 0007), and **every place
  that counts bills or lists Bills** skips bills with it off: Bills list, Home current balance and "Where your money
  went", monthly totals, insights, wrap-up/savings month figures, setup/bill counts, push reminders still fire.
  Map them all before changing anything; Loans page and the bill page still show the loan.
- Missing-column fallback like `payment_overrides` until the migration is live. Migration pushed only after a
  Docker scratch test + Dmitri review (as 0007/0008).

## Maths (Drew)
- `firstPaymentOn(startDate, paymentDay)` (month after start, clamped), tests with month ends and leap years.
- Review figures from the existing engine (`amortise` / `termsFromStored` path), with the entered payment as the bank
  payment. No new money maths beyond the date rule.

## Rules
en/es/fr; light/dark from `useTheme().scheme`; large text never cuts figures; VoiceOver labels; comment only the
non-obvious why; tests under `src/__tests__/` or next to lib files, never in `src/app`; no commits. Founder tests on the
iPhone 13 Pro Max after Dmitri's review.

---

# View loan page (Founder wireframe, 2026-10-12)

The wireframe came as a chat image only (not on disk); described here exactly. Layout only (grey placeholders):
"make it to our app design with the new wireframe style".

**Founder answers**
1. Monthly payments stay automatic: on each payment date the instalment is charged through the loan's bill (as
   today). The wireframe's "Make payment" is **renamed "Pay off"**: a **full or partial payoff, any amount the person
   wants**.
2. **Every loan opens this page**: Loans page View details, the Bills list, Home, search, anywhere a loan bill is
   tapped (`ledgerHref`/rows-open-detail-pages). Other bills keep the bill page.
3. **Pencil (header) and "Edit loan" (bottom) both open the Add Loan details page filled in** → Review → Save.
   **"Delete loan"** sits at the bottom of that details page, with a confirm (deleting removes/ends the loan as it
   does today).

**Page, top to bottom (wireframe)**
- Header: back, title = loan name ("Car loan"), round pencil action on the right.
- Card: loan-type icon, name, "Next payment 27 Oct"; big "$10,673.63" + "Left to pay"; bar (plum) + "41% paid off";
  rows Monthly $424.80 / Rate 6.25% / Payments left "27 of 48" / Paid from "Chase ••4821" (Skip when none).
- "Payment schedule" card, "See all" → `/loan-schedule` for this loan: the next 4 payments, each "27 Oct" /
  "$369.21 principal · $55.59 interest" / "$424.80", from the same schedule as the Loans page (cent-exact).
- "History" card: the most recent payments already made (dated ≤ today), newest first, each "27 Sep" /
  "Paid from Chase ••4821" / "$424.80", plus any payoffs ("Paid off $X" / "Partial payoff"). Show 3, "See all" when
  more. No history yet → a short line ("Your first payment is on 27 Jan").
- Footer: "Pay off" (plum, primary) and "Edit loan" (outlined).
- Finished loan: no Pay off; the card says "Paid off on …" / "Stopped on … · $X left".
- Row icons (grey squares in the wireframe): CEO default — upcoming rows a small date tile (day over month, tint),
  history rows the paid-from source's colour chip (as SourceTiles); designers may refine.

**Pay off (CEO defaults, confirm with Drew/Dmitri)**
- A page: keypad amount + date (default today, not before the start date, not in the future) + Paid from.
  "Pay it all" fills the **payoff amount on that date** = balance after the last payment made + interest accrued
  since, on the loan's basis (daily Actual/365 by default), cent-exact.
- **Full** (amount = payoff amount): the loan is paid off on that date; later scheduled payments stop; the loan moves
  to Finished ("Paid off on …"); its bill ends.
- **Partial** (less): it goes to the balance on that date; **the monthly payment stays and the loan finishes
  sooner** (the last payment absorbs the gap), schedule and figures follow.
- More than the payoff amount: refused with the amount it takes to clear the loan.
- A payoff counts as spending on its date from the chosen source, only if the loan's "Add to monthly bills" is on
  (same rule as its instalments). Several partial payoffs over time must all be stored and counted.
- Storage (Diego + Drew): a list of payoffs on the loan (date, amount, source), honoured by the schedule engine
  everywhere (Loans page, this page, schedule, Cards tile, bills), with the missing-column fallback.
