# Spending habits v2: new cards + View details (CEO brief, 2026-10-12)

Founder design: the new habits page (cards with a spent figure, spend limit, saved line, bar, "Day N of 7",
circles, View details, pencil, dashed "Add a habit"). Mock of record:
`.claude/team/design/spending-habits-v2-mock.html` (set on Fri Oct 16; every figure is computed from the rules
below). The Founder chose the recommended answer to every open question.

## Founder decisions

1. **Spend limit = price x days tracked in the week.** No new field, no migration. A full week is price x 7; the
   habit's first week counts only from its creation day (`countsFrom`), so Breakfast made on a Wednesday has a
   $4 x 5 = $20 first week. Current price, like Saved.
2. **Saved on a card = this week's skipped finished days x price** (`savedInWeek`, unchanged). Today saves nothing
   until it is over. When a week ends, Spent + Saved = the limit (unless a receipt's amount was edited).
3. **Weeks stay Monday-Sunday** on every card (M T W T F S S). The design's per-habit letters are not used.
4. **Pencil = edit** (`/habit-new?id=`; Delete lives there). **View details = `/habit/[id]`, rebuilt** as the
   week-by-week history. The card body no longer opens anything; only the pencil, the circles and View details
   press.

## Habits page (`/habits`)

- Hero: always stacked as in the design: label ("Spent this week" / "Spent that week"), big figure, then the
  full-width "Saved so far" tile (piggy bank). All-time saved across active habits, as now.
- Week selector unchanged.
- Card, top to bottom:
  - Header row: HabitIcon 44, name (wraps), price, pencil (40pt ring button like the week arrows, 44pt hit area,
    label "Edit {name}"). The price drops ".00" only when it is whole: `formatCurrency(price, { cents: hasCents })`
    (`cents: false` floors, so never pass it for $4.50).
  - Big figure: this habit's spent in the shown week (receipts' own amounts), 40pt bold, FitFigure.
  - "Out of {limit} spend limit", then "{saved} saved" (both muted 14).
  - Bar: spent / limit, 8pt, accent fill on a line-coloured track, clamped at 100%.
  - Pill (full width, soft fill): current week "Day {n} of {tracked}" (n = days from the first tracked day to
    today, inclusive); a past week "Week complete".
  - Week before the habit's first week: no figures, bar or pill; one muted line "Starts {Wed, Oct 14}"; circles
    faded (already 'before').
  - DayRow: circles 40pt with a soft fill (`ink/4%`); rings as now (open = muted, today = habit colour, future =
    line, before faded). Tapping still files / removes that day's receipt.
  - "View details": `Button size="compact"` (same as the Loans cards), label read as "View details, {name}".
- After the cards: a dashed "+ Add a habit" button (same Pro gate as the header +).
- VoiceOver: the card's figures are read as one summary (name, price, spent, limit, saved, day N), then the
  pencil, the seven days and View details.
- Create flow Step 3 (Confirm) previews a `HabitCard` with `interactive={false}`: the preview shows no pencil and
  no View details, and a new habit reads "$0.00 / Out of $35.00 spend limit / $0.00 saved / Day 1 of 7".

## View details (`/habit/[id]`, replaces the current page)

- Header: back, the habit's name, pencil (tonal, as now) to the edit page.
- Hero (accent card like the habits hero): HabitIcon 36 + "{price} each time · since {Sep 28}"; "Spent so far" with
  the all-time spent (every receipt of the habit); the "Saved so far" tile (this habit's all-time saved).
- Muted line under it: "{n} days bought · {n} days skipped".
- "Week by week" heading with "{n} weeks" on the right. One card per week, newest first, from the later of this
  week and the latest receipt's week back to the earlier of the start week and the earliest receipt's week:
  - Header (one button, toggles open): "This week" / "Last week" label over the range, a chevron.
  - Two soft tiles: Spent (ink) and Saved (moneyIn above 0).
  - Bar + "Out of {limit} spend limit" left, "Day N of 7" / "Week complete" right.
  - Open: the days, newest first, from min(Sunday, today) back to the first tracked day, plus any receipt day
    outside that range (re-dated receipts are never hidden):
    - Bought: filled circle (habit colour), "Fri, Oct 16", "Bought" ("Today · Bought"), the receipt's amount,
      a chevron; the row opens `/receipt/[id]`.
    - Skipped: empty circle, "Skipped", "+$5.00" in moneyIn with "saved" under it.
    - Today not bought: today ring, "Today · not bought yet", a dash.
    - Future days and days before the creation day are not listed.
  - This week starts open; several weeks can be open at once.
- Free plan: weeks that end before the 90-day floor are not listed; days before the floor in the boundary week are
  not listed; the usual HistoryNotice follows the list when anything is hidden. Totals still count everything.
- "About this habit": Price ("$5.00 each time"), Paid with, Category, Colour, Started (DetailCard rows).
- The old interactive DayRow, the receipts list (ChargeSection) and the Spent/Saved tiles go: the weeks replace
  them.
- Deleted habit: steps back as now.

## Work split (same tree as the Loans session; touch only these files)

**Drew, maths** (`src/lib/habit-week.ts` + `src/lib/habit-week.test.ts`), cents-exact, pure:
- `trackedDaysInWeek(habit, weekStart): number` (0 for a week before `countsFrom`'s week)
- `weekLimit(habit, weekStart): number` = price x tracked days, via cents
- `weekProgress(habit, weekStart, today)`: `{ kind: 'notStarted', startsOn } | { kind: 'current', day, of } |
  { kind: 'complete' }` (a future week, which the UI never shows, returns 'notStarted' or 'current' sensibly;
  document which)
- `habitHistory(habit, taps, today, floor?)`: `HabitWeek[]` newest first, each `{ weekStart, spent, saved, limit,
  progress, days: HabitHistoryDay[] }` with `HabitHistoryDay = { day, kind: 'bought' | 'skipped' | 'today',
  amount, receiptId? }`, newest first, per the listing rules above (floor hides days and whole weeks, never
  changes the figures).
- Fixtures: full week, first partial week (Wed start), today tapped / untapped, a receipt re-dated before the
  start, a future-dated receipt, an edited amount, a DST week, the floor cutting a week.

**Dana, UI**: `src/components/habits/habit-card.tsx`, `habits-hero.tsx`, `day-row.tsx`, `src/app/habits.tsx`,
`src/app/habit/[id].tsx`, new `src/components/habits/habit-week-card.tsx` (+ day row inside it),
`src/app/habit-new.tsx` (only if the preview needs a prop), copy in `src/i18n/messages/habits.ts` (en/es/fr).
Dana starts on the habits page right away against the signatures above and wires the maths when Drew lands.

**Theo, tests**: update `src/__tests__/habits/habit-card*.test.tsx`, `src/__tests__/app/habits.test.tsx`,
`src/__tests__/app/habit-detail.test.tsx`, `habit-new*.test.tsx`; new week-card tests. Only habit test files.

**Dmitri**: reviews the whole diff before the CEO.

## Rules

- Tests under `src/__tests__/` only. Run only your own tests (`npx jest --ci <paths>`); never prettier --write or
  eslint --fix on the repo. Clear `.expo/cache/eslint` before linting your files.
- The Loans session owns `src/app/loan*`, `src/components/loans/**`, `src/api/{loans,mutations,queries}.ts`,
  `src/lib/{ledger-link,active-loans}.ts`, `src/i18n/messages/{loan,loan-flow,toast}.ts`,
  `src/__tests__/large-text-guard.test.ts`. Do not edit those. If you need one, stop and tell the CEO.
- Comments: only the non-obvious why. No history, dates or names.
- Large text: follow `src/theme/text-scale.ts` (FitText / FitFigure, TEXT_CAP); one-line figures never clip.
- No commits. No migrations (none needed).

## Contract: exact maths signatures (Drew writes, Dana imports from `@/lib/habit-week`)

```ts
export type WeekProgress =
  | { kind: 'notStarted'; startsOn: string } // a week that ends before countsFrom(habit); startsOn = countsFrom
  | { kind: 'current'; day: number; of: number } // the week holding today: day = today - firstTracked + 1, of = tracked days
  | { kind: 'complete' } // a week that ended before today
  | { kind: 'upcoming' }; // a week after today's week (only reachable through a future-dated receipt)

export type HabitHistoryDay = {
  day: string; // yyyy-mm-dd
  kind: 'bought' | 'skipped' | 'today';
  amount: number; // bought: the receipt's own amount; skipped: the price saved; today: 0
  receiptId?: string; // bought only
};

export type HabitWeek = {
  weekStart: string; // the Monday
  spent: number; // spentInWeek for this habit
  saved: number; // savedInWeek
  limit: number; // weekLimit
  progress: WeekProgress;
  days: HabitHistoryDay[]; // newest first, see the listing rules in "View details"
};

export function trackedDaysInWeek(habit: HabitMaths, weekStart: string): number;
export function weekLimit(habit: HabitMaths, weekStart: string): number;
export function weekProgress(habit: HabitMaths, weekStart: string, today: string): WeekProgress;
export function habitHistory(
  habit: HabitMaths,
  taps: readonly HabitTap[], // any habits' taps; only this habit's are used
  today: string,
  floor?: string, // a free account's first shown day: earlier days and weeks ending before it are left out
): HabitWeek[]; // newest first; floor never changes spent/saved/limit
```

New copy keys are already in `src/i18n/messages/habits.ts` (CEO): `habits.card.{limit,savedLine,dayOf,
weekComplete,startsOn,viewDetails,viewDetailsA11y,summary}` and `habits.detail.{eachTimeSince,shortDate,dayDate,
daysBought,daysSkipped,weeks,weekCount,week.*,day.*,about,price,priceEach}`. Add a key only in your own section;
remove keys your change leaves unused (grep the whole of `src` first).
