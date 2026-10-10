# Loan calculator redesign, editable payments, loan-document upload, Paid-with tiles: CEO brief (2026-10-09)

Founder designs: `.claude/team/design/reference/loan-redesign/` — `loan-calculator.png`, `payment-schedule.png`,
`save-loan.png`, and 14 light/dark gradient icon pairs (`<name>-icon.svg` / `<name>-dark-icon.svg`): loan-result,
loan-details, loan-dates, more-options, payment-schedule, loan-type-{personal,car,student,home,business,medical,
credit-card,other}. Originals: `~/Desktop/updated gradient icons/loan calculator icons/` (never modify).
Rules as before: flatten `xlink:href` gradients in app copies; light/dark follows the theme provider; check each dark
file actually differs where the light one has the navy stops (#273a9b/#202f65/#021e2f → #6274D4/#4F5FB0/#3E4C93) and
apply that swap if a dark copy came through unchanged.

## Founder decisions (final)

1. **Loan calculator, schedule and save pages follow the designs** (phase A).
2. **"Paid with / Paid from" uses the save-loan tile design everywhere** a card or account is chosen: bills,
   subscriptions, receipts (typed, scan, upload, voice), habits, card payments, save-loan. Two-column tiles: colour
   swatch, name, ••last4, a radio that becomes a plum check; selected tile plum border + soft plum fill. **A "Skip"
   tile in the same style stays** wherever Skip exists today ('' = Skip, null = unanswered; still required where it
   is required now). Implement by restyling the shared `src/components/ui/source-tiles.tsx` so every caller follows.
3. **Full control of the numbers before saving** (phase B): the person can type the bank's monthly payment (e.g.
   $554.23 when the app works out $553.21) and the whole schedule follows it, the last payment taking up the
   difference; and on the schedule page any single payment can be changed (e.g. a bigger first payment), every
   balance after it recomputed. Overrides are saved with the loan. Cent-exact (loan-maths accuracy standard).
4. ~~**Upload the bank's loan document**~~ **CANCELLED by the Founder (2026-10-09): no upload in the loan section; editing replaces it.** (phase C — PLAN FIRST, Founder approves the plan before any build): an upload
   option at the bottom of the loan calculator with the hint "Upload the loan file you received from your bank".
   **PDFs and photos**, read **on the phone** with **no AI**: a PDF's own text layer read directly; photos and scanned
   PDFs through Apple's on-device text recognition (the receipt scanner's Vision path); deterministic rules find the
   loan amount, rate/APR, term, payment, dates, fees. Every number is shown to check and edit before it fills the
   calculator. **Pro only** (free: PRO badge → explainer).

## Phase A notes (from the designs)

- Calculator: result card (loan-result icon, "Monthly payment", figure, "60 payments · last on 9 Sep 2031", the
  borrowed/interest bar, Borrowed / Interest rows with dots, "Total you repay"); "The loan" section (loan-details
  icon) with Loan amount / Interest rate / Term sliders and value chips; "Dates" (loan-dates icon): Money received,
  First payment rows with chevrons; "More options" card (more-options icon, "Extra payments & fees", "Optional",
  expands in place — no sheets); the info line "Interest is worked out monthly on what you still owe."; a "Payment
  schedule" card (payment-schedule icon, "See where all 60 payments go") → the schedule page; pinned Save.
- Schedule page: summary card (Monthly payment; Rate "7.50% APR"; Term "5 years · 60"; Total interest; Total you
  repay); year sections with "N payments · $X interest"; numbered rows (date, "$P principal · $I interest", amount,
  "$L left"); first rows then "Show all 60 payments".
- Save page: "Save this loan" / "It'll show under Loans as a monthly bill."; summary card (/ month; Borrowed, Rate,
  Term, Payments "60 monthly", First payment, Total interest); Name ("e.g. Car loan"); **Loan type** 4 × 2 grid with
  the 8 icons (selected: plum border + tint); Paid from tiles (+ Skip); "Save to Loans". Store the loan type without a
  migration if the bill's existing icon/category fields can carry it (the loan is saved as a bill); say if a column is
  truly needed.

## Work split

- **Dana P:** restyle `SourceTiles` (+ Skip tile) and check every caller in light/dark/large text.
- **Dana L:** the three loan screens (phase A), then wire Drew's overrides (phase B UI: edit the monthly payment from
  the result card; a full page per schedule row to change that payment).
- **Drew:** phase B maths in `src/lib/loan.ts` (or a new module): overrides model, schedule with a fixed payment and
  per-payment overrides, cent-exact, fixtures against real statements; tell Dana L the API.
- **Dmitri:** phase C plan (`.claude/team/dev/loan-upload-plan.md`) for the Founder's approval.
- No commits. Tests never under src/app. en/es/fr. Founder reviews in the Simulator.
