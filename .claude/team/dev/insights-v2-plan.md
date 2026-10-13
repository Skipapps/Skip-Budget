# Insights v2: build plan (Dmitri, 2026-10-13), with the CEO's answers

The brief is `.claude/team/dev/logic-fixes-insights-brief.md`, Part 6. The design is in `.claude/team/design/reference/insights-v2/`.

## CEO answers (binding; the Founder may change them later)
- **Q1 Hero income:** use the brief's definition, the actual paydays in this calendar month: recorded, projected and one-offs. Weekly pay of $1,000 shows $5,000 in a five-Friday month. What comes in keeps "Every month" (normalised), and the two are labelled differently.
- **Q2 Coming up:** count by billing cycle, in cents.
  - A year is the amount × 52 / 12 / 4 / 1 for weekly / monthly / quarterly / yearly plans.
  - A month is the year ÷ 12, rounded half up.
  - This fixes a bug: a yearly plan used to read as monthly.
- **Q3 Where it goes:** yes. Look up each receipt's and subscription's category from `useReceipts` and `useSubscriptions`. Do not edit queries.ts.
- **Q4 Loans:** yes. Move `priceLoans` and the summary chain UNCHANGED out of `src/app/loans.tsx` into `src/components/loans/priced-loans.ts`, and have loans.tsx import them. Add a parity test. The CEO tells the Loans session.
- **Q5:** yes. Rewrite or retire `src/__tests__/app/insights.test.tsx` and `insights-i18n.test.tsx` as the plan says. Keep the key-prefix guard and the large-text and owe tests, re-pointed.
- **Q6 Savings:**
  - "Moved this month" is the pot that reached savings this month (the 1 Oct wrap-up of September) plus any savings added with a date this month.
  - "Total in savings" is the same headline figure the Savings page and the Cards tile show (`summary.readyToUse`), so the three agree.
  - The % line is moved ÷ hero income; it is hidden when there is no income.
- **Q7 Where you spend most:** order by amount, with ties broken by number of times. Subtitle: "Places you spend the most". The design's "most often" contradicts its own amount order; the Founder can flip this.

## 1. Where each section gets its figures (reuse; nothing is recomputed)
- **Which entries:** every figure reads the ledger's `allEntries` (queries.ts:1117-1146), never `entries`, which is the free 90-day list.
- **Today:** comes from `useToday()` (src/lib/use-today.ts:14), not a frozen `new Date()`.
- **Cents:** every sum is done in integer cents.

| Section | Reuse | New (Drew) |
|---|---|---|
| Hero | `useLedger(monthBounds(thisMonth), today)` over the WHOLE current month. **in** = all income entries in the month; **out** = spending dated on or before today. | `heroFigures`, `wholePercent` |
| What comes in | `useSalarySources`, `scheduledPerMonth` / `oneOffsInMonth` (pay.ts). See all goes to /salary. | none |
| What goes out | `useLedger(insightsRange(period, today), today)`, `periodBuckets` (period.ts:112). See all goes to /(tabs)/transactions. | `insightsRange`, `insightsBuckets`, `spendByBucket`, `spendSummary` |
| Where it goes | Category labels from today's insights.tsx, plus the Q3 lookups | `categoryTotals` |
| Where you spend most | Today's grouping and logo rules (pinned by insights.test.tsx:326) | `merchantTotals` (in cents, Q7 order) |
| What you owe | `useCards` + `useSourceBalances(today)`. Owed = `max(balance, 0)`. Avatar = card colour with the holder's initial. See all goes to /(tabs)/cards. | none |
| Loans | The chain in loans.tsx: `useLoans(today)` → `loanTermsOf` → `loanStatus(terms, loanPricingDay(...))` → `loanEnding` → `loansSummary`. Rows open /loan/[id]. | `priced-loans.ts` (Q4) |
| Bills & subscriptions | `usePlanMonth('bill' or 'subscription', monthOf(today), today)` (payment-ledger.ts:247): `view.total`, `view.planCount`. Rows open `row.href`. | `nextDue(bills, subs, 2)` |
| Coming up | `useSubscriptions` | `subscriptionCost` (Q2) |
| Habits | `useHabits`, `useHabitTaps`, `habitMaths`; `skippedDaysInWeek` / `savedInWeek` / `savedAllTime` (habit-week.ts), as habit-card and habits.tsx do. Up to 3 rows. | `habitsSummary` + parity test |
| Goals | `useGoals()`: `summary.saved`, `.target`, `.active.length`; the first 3 active goals | none |
| Savings | `useSavingsCore()`, `summary.readyToUse` | `movedThisMonth` (Q6) |

**Empty lines with an action:**
- No loans: Add a loan → /add-loan
- No habits: Start a habit → /habit-new
- No goals: Add a goal → /save-goal
- Nothing in savings: link to /savings

The other sections hide when empty, as today.

## 2. Choose month and Choose year
- **Route:** one route, `src/app/insights-period.tsx?kind=month|year&owner=<useId>&selected=yyyy-mm|yyyy`. It sits behind `useProGate('insights')`.
- **What it lists:** `periodChoices(dates, today, floor)`, built from the dates of the cached receipts, charges, pay and payoffs.
  - Months: newest first, plus the current month. Years: plus the current year. Nothing after today.
  - Floor = `paymentFloor(today)`.
- **Handing the pick back:** the pick bus in `src/lib/payment-pick.ts` (`pickPayment` / `onPaymentPicked`), keyed by the opener's `useId()`. Then `goBack()` inside `useNavigateOnce`.
- **Reuse:** `ChoiceList` from components/payments, and the titles `payments.picker.monthTitle` and `payments.year.title`.

## 3. Period state
- **The hook:** `use-insights-period.ts` holds `{ mode, month|null, year|null }`. Null means "current".
- **Ranges:**
  - `insightsRange` gives Month = `monthBounds`, Year = Jan 1 to Dec 31.
  - The end is capped at today, so past periods are whole and the current one stops at today.
- **Buckets:** `insightsBuckets` uses `periodBuckets` with an anchor date and always spans the whole period.
  - Year bars are labelled with `monthInitial`.
  - The period label is "This month" or "This year", else the month and year, or the year.
  - `yearHighlight` marks the picked or current month in Year mode.
  - In Month mode every bar with money is labelled.

## 4. Tasks
**Drew** writes pure functions in integer cents, with no hooks.
- `src/lib/insights.ts`: `InsightsPeriod`, `insightsRange`, `insightsBuckets`, `periodChoices`, `yearHighlight`, `wholePercent`, `spendSummary`, `spendByBucket`, `heroFigures`, `categoryTotals`, `merchantTotals`.
- `src/lib/insights-sections.ts`: `nextDue`, `habitsSummary`, `movedThisMonth`, `subscriptionCost`. The priced-loans move (Q4) also belongs to Drew.
- **Fixtures F1–F16** go in `src/__tests__/insights/`:
  - F1–F2: ranges and buckets, including a leap-year February and the edges.
  - F3: the hero. $10,000 in and $1,599.99 out gives $8,400.01 and 16%. Weekly pay gives $5,000. Also the "over" case and the no-pay case.
  - F4: three $0.10 receipts plus one $0.20 total exactly $0.50.
  - F5: hero.out equals out.
  - F6: payoff and not-counted bills.
  - F7–F8: categories and merchants.
  - F9: months with money.
  - F10: highlight.
  - F11: next due.
  - F12: habits parity.
  - F13: savings.
  - F14: loans equal the Loans page to the cent (the real-lender fixture is untouched).
  - F15: subscription cost by cycle.
  - F16: percent rounding.

**Dana** builds in `src/components/insights/`:
- `section.tsx`: heading, subtitle, See all, and the loading / failure + Try again / empty + action / ready states.
- `rows.tsx`: the row components lifted unchanged from insights.tsx.
- `insights-hero.tsx`: uses `PlumCard` from components/payments.
- `period-switch.tsx`, `spend-chart.tsx` (new; do not edit FlowChart), `spend-card.tsx`.
- `{income,categories,merchants,owe,loans,plans,coming-up,habits,goals,savings}-section.tsx`.
- `use-insights-period.ts`.
- Routes: rewrite `src/app/insights.tsx` and add `src/app/insights-period.tsx`.

**Keys in insights.ts** (en/es/fr; never under `insights.stand.*` or `insights.keep.*`):
- `hero.{left, over, inOut, spentShare, a11y}`
- `seeAll`, `seeAllA11y`
- `in.{subtitle, salary, everyMonthSources}`
- `out.subtitle`
- `period.{month, year, chooseMonthA11y, chooseYearA11y}`
- `goes.subtitle`, `most.subtitle`, `owe.subtitle`, `coming.subtitle`
- `loans.*`, `plans.*`, `habits.*`, `goals.*`, `savings.*`

Drop `out.thisWeek` and `out.allTime` once nothing uses them.

**Order:**
1. Drew T1: types, range, buckets, choices, highlight, percent.
2. Dana D1, in parallel: section, rows, hero, switch, chart, spend card, all on literal props.
3. Dana D2: the picker route and the period hook.
4. Drew T2: spending and hero.
5. Drew T3: the section functions.
6. Dana D3: the section components, stubbed on Drew's exported types.
7. Dana D4: wiring.
8. Screen tests, then the gates, then Dmitri's review, then the section list goes to the Ask Sam session.

## 5. Risks
- **Speed and loading:**
  - All hooks are called at the top level. Never chain `enabled`, and never mount a section after another one loads.
  - Changing the period recomputes only the period ledger.
- **Per-section errors:**
  - The spending block (hero, out, goes, most) shows no figure until all its reads answer.
  - A failed balance read hides What you owe.
  - Pull-to-refresh uses `useRefreshAll`. Figures stay up while it refetches, and a failure affects only the section that failed.
- **Tests that pin today's page:**
  - `insights.test.tsx`: retire 177-275 (savings is no longer left out), rewrite 292 for per-section errors, and keep the owe, logo, large-text and money-in tests.
  - `insights-i18n.test.tsx`: rewrite the es/fr sections and the failure test; keep the key-prefix guard.
  - `large-text-guard.test.ts:45`: new files must pass it.
