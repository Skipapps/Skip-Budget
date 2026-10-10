# Loans page: CEO brief (2026-10-09)

Founder design: `.claude/team/design/reference/loans-page/loans.png`. Founder asks: (1) every loan saved from the
loan calculator shows here; (2) people can create loans from this page, and the monthly payment is added to Bills
and counted as an expense (that is what `save_loan` already does: it creates the loan's monthly bill).

## Page `/loans`, top to bottom (as designed)
- Header: back, "Loans", a soft-plum "+" (→ `/loan-calculator`).
- Summary card: loan-result gradient icon, "Total you owe" (Σ of every open loan's amount left, e.g. 10,673.63 +
  24,655.30 = 35,328.93), divider, "Monthly payments" (Σ monthly payments of open loans) and "Next payment"
  ("15 Oct · Car loan": the soonest next due date and that loan's name).
- "Your loans" + "N saved".
- One card per loan: its loan-type icon (`bills.icon_id = 'loan-<type>'`, `src/theme/loan-icons.ts`), name, a muted
  line "$18,000 · 6.25% · 4 yrs" (amount borrowed · rate · term in whole words), then three columns: "Monthly"
  (its payment), "Payments left" ("27 of 48"), "Next" (next due date), a plum progress bar and
  "41% paid off · $10,673.63 left"; a chevron. Tap → the loan's bill page (`/bill/[id]`), per the
  rows-open-detail-pages rule.
- Info line: "Saved loans from the calculator show up here."
- Pill button "+ New loan calculation" → `/loan-calculator`.
- Empty state (no loans): the summary card is replaced by a short invitation and the same button.

## Maths (Drew): one pure function, cent-exact
`loanStatus(terms, today)` from the saved loan (`termsFromStored(row)`, so payment overrides and statements are
honoured): payments made = scheduled payments dated ≤ today; payments left = the rest ("27 of 48" uses the
schedule's real payment count); amount left = the schedule balance after the last payment made (principal only, as the
design's figures show); paid off % = (borrowed − left) / borrowed, rounded to a whole percent, never 100% while
anything is left; next payment = the first scheduled payment after today (and its amount). A loan whose last
payment has passed counts as paid off: it stays listed under a "Paid off" heading below the open ones and is left
out of the totals.

## Data (Diego)
`useLoans()`: every loan of the person with its bill (name, icon_id, archived/ended state) in one read, honouring the
missing-column fallback already used for `payment_overrides`. Invalidate on save_loan, bill edit and bill delete.
Deleting the bill already removes or ends the loan as today: don't change that behaviour, only list what exists.

## Entry points
- Cards tab → Money → Loans tile opens `/loans` (any count; the tile keeps its "Add a loan" / "{n} active" text).
- After "Save to Loans" in the calculator, land on `/loans` with the toast, instead of where it lands now
  (check the nav one-way-door rules; Back from /loans must not return into the finished save page).

Rules: light/dark, large text (figures never cut; the three columns stack when they must), en/es/fr, tests under
`src/__tests__/` or next to lib files, comment style, no commits. Founder reviews in the Simulator.
