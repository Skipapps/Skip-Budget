# Monthly bills, Subscriptions and Payment history — brief (CEO, 2026-10-12)

Founder's designs (read every one before planning or building):
`/private/tmp/claude-501/-Users-sampathchowdi-Desktop-SkipBudget/dde426a1-ad91-4ed8-b3e0-b7305e93e002/images/`
1.png Monthly bills · 2.png All years · 3.png Payment history · 4.png Search (empty) · 5.png Search (results) ·
6.png Subscriptions · 7.png Choose year.

Build from the designs, adapted to the app's rules below. Light and dark, en/es/fr, large text (onboarding-style
pinned footers where a page has a primary button), VoiceOver labels. Full pages only, never sheets.

## Founder answers (2026-10-12)

1. **Free history stays 90 days.** Same rule as the rest of the app (`useKnownFree`, `historyFloor`,
   `useLedger().entries/allEntries/hidden`, `HistoryNotice`): figures (totals, counts, bars, avg) sum the WHOLE
   window on free; only rows stop at the floor. Any year wholly older than the floor gets the "Pro" badge (so 2025
   is Pro on free today). A Pro-badged year still opens on free: figures shown, rows replaced by the
   HistoryNotice. "See up to 7 years with Pro · Learn more" footer shows on free only → `/pro-feature?id=history`.
2. **No "Paid late".** Charges are recorded on the due date, so every past payment says "Paid".
3. **Export CSV or PDF is Pro, built now.** Free → a new `/pro-feature?id=export` explainer. PDF needs `expo-print`
   (new native module: Dilip, pod install, Release build). CSV via `expo-file-system` + `expo-sharing` (both installed).
4. **The month figure is what's due in the picked month**: each plan's real dates in that month (weekly bill 4–5
   times, yearly only in its month). Label "Due in October" (not "Every month"). Figure, paid and coming up agree.

## Rules from other work (do not break)

- **Loans session owns** (uncommitted, do not edit): src/app/bills.tsx, bill-plans.tsx, subscription-plans.tsx,
  bill/[id].tsx, subscription/[id].tsx, add-bill.tsx, add-subscription.tsx, add-loan.tsx, reminders.tsx,
  components/bills/bill-row.tsx, components/subscriptions/subscription-row.tsx, components/plans/plan-detail.tsx,
  components/ui/past-choice.tsx, lib/plan-stop.ts, src/api/{queries,mutations,past-charges}.ts, messages
  bills/subscriptions/toast/ui/reminders/loan/loan-flow, migration 20261012100004. Read them, import them, never edit.
- **Habits session owns** habit files; **Quick add session owns** receipts.tsx, notifications.tsx, cards.tsx,
  dashboard tiles, messages home/cards.
- **Ours (new files only until the swap):** `src/app/payment-*.tsx`, `src/components/payments/*`,
  `src/lib/payment-*.ts`, `src/lib/bill-month*.ts`, `src/api/payment-*.ts`, `src/i18n/messages/payments.ts` (+ one
  line in `src/i18n/messages/index.ts`), `src/data/pro-features.ts` + `src/i18n/messages/pro.ts` (export explainer
  only), tests in `src/__tests__/payments/`. Migration numbers if ever needed: 2026101230000N.
- **The swap** (last step, only after the Loans session says its hunks are committed): new bodies for
  `src/app/bills.tsx` and `src/app/subscriptions.tsx`; Settings → Your money links to `/bills` / `/subscriptions`;
  `bill-plans` / `subscription-plans` retired (redirect) once nothing links to them.
- **Stopped/cancelled (Founder, via Loans session):** stopped is final (read-only, Delete only). Stopped bills and
  cancelled subscriptions sit in a bottom section under All bills / All subscriptions, never in a total. Bills use
  `billStopped(bill, today)`; subscriptions show "Cancelled · last charged {date}". Their past charges ARE history
  (the ledger lists them via `listRecorded`).
- `countsInSpending(bill)`: a loan saved with "Add to monthly bills" off is not a bill here. A loan with it on IS (the
  design's "Car loan"). Loan payoffs come through the ledger as kind 'bill' with `payoff` set: list them in payment
  history with their own status word, never as a projected bill.
- Rows open detail pages (`billPageHref`, `/subscription/[id]`), never an /add-* form. "Add a card" (plum) is a
  separate tap target for a plan with no Paid with: Dmitri decides where it lands (edit form via the same route the
  detail page's pencil uses is the CEO default).
- Toast on every action, one FAILURE_MESSAGE, comments only for the non-obvious why, tests never under src/app.

## Pages

### /bills → "Monthly bills" (6.png is the same shape for /subscriptions)
Header: back · title · round Search (→ `/payment-search?kind=bill`) · round plus (→ `/add-bill`).
Plum card: "Due in {Month}" · month chip "Oct 2026 ▾" (→ choose-month page) · figure · "{n} bills · {p} paid ·
{c} coming up" · divider · "Next: {name} · {d MMM}" (hidden when nothing is left to come in that month).
- **Coming up {count}**: each occurrence still to come in the picked month (from today for this month; all for a
  future month; none, section hidden, for a past month). Row: logo/icon, name, "{d MMM} · {source}", amount, pill
  "in N days" / "Tomorrow" / "Today".
- **All bills {count}**: every running bill in day-of-month order. Row: name, "{Recurrence} · {source}" or
  "{Recurrence} · Add a card", amount, status: "✓ Paid" (green, all of its dates in the picked month done), "Next
  {d MMM}" (one still to come that month) or "Next {d MMM yyyy}" when not due in the picked month.
- Stopped section at the bottom (rule above).
- "See payment history ›" → `/payment-history?kind=bill`.
- Counts: n = plans due in the month, p = those with every date in the month done, c = those with one still to come.
  p + c = n. Past month: all paid. Future month: all coming up.
- Month picker: full page, months from the free floor month (free) or the 7-year kept floor (Pro) up to 12 months
  ahead; current month ticked; footer on free "See older months with Pro". No Pro badges inside the month list.
- Empty state: no bills yet → existing art + "Add a bill".

### /payment-history?kind=all|bill|subscription&year=YYYY
Header: back · "Payment history" · round export (Pro). Year chip "This year ▾" (→ /payment-year). "Export CSV or
PDF" link (same action). Tabs All / Bills / Subscriptions (start on the kind it was opened with). Search field (tap
→ /payment-search). Plum card: "Paid in {year}" figure, Payments {count}, Avg / month, 12 bars J–D (current month
white, future months flat). Month groups newest first, month total on the right; rows: logo, name, "{d MMM} ·
{source or 'Card not set'}", amount, "Paid". Only payments that happened (date ≤ today), never projections.
Avg / month = year total ÷ months elapsed in that year (design: 18,548.81 ÷ 10 = 1,854.88); Drew defines the rule
for a past year and for the first year with data, with fixtures.

### /payment-year — "Choose year"
This year (YYYY) ✓ · each earlier year with any payment in the kept window (Pro badge per rule 1) · All years
(first – last). Footer on free: "See up to 7 years with Pro · Learn more".

### /payment-years — "All years"
Plum card "Paid since {first year}", "{n} payments · {y} years". One card per year: year (+ Pro badge), "{n}
payments", total, › → /payment-history?year=YYYY. Footer on free. Header export (Pro).

### /payment-search
Autofocused field + Cancel. Tabs All / Bills / Subscriptions. Empty query: **Recent** (stored on the phone, newest
first, × removes one), **Filters**: Date range (Any time), Amount (Any amount), Paid from (All accounts), each a
full page; footer "Search across up to 7 years of payments." (free: words matching the 90-day rule). With a query:
"{n} results · {first} – {last}" + "Date range" link; groups by year, newest first, year total · count; matching
name in plum; the two newest years listed in full, older years folded into one row "{y1} – {y2} · {n} more" that
opens them. Free: only rows inside the floor, plus HistoryNotice when older matches exist. "No matches? Try a
shorter word or another year." under results.

### Export (Pro)
Full page or direct share: CSV and PDF of what the current history view shows (kind tab, year or all years, filters).
Columns: date, name, kind, amount, paid from. Currency formatted per the app's currency; plain numbers in CSV.

## Definition of done
Each task: tsc 0, eslint (cache cleared) and prettier clean on its files, jest green, en/es/fr keys, Dmitri review.
Then the Founder tests a Release build on the iPhone 13 Pro Max (no Simulator walks).
