# Spending habits: CEO brief (2026-10-09)

Founder request, 2026-10-09: a Pro "Spending habit tracker" next to the Loan calculator. The Founder supplied a
wireframe (Dashboard, Pick a habit 1/3, Weekly limit 2/3, Confirm 3/3, Back on dashboard with toast "Habit added")
and one hi-fi dashboard (copies: `.claude/team/design/reference/spending-habits/`). The hi-fi is the visual
reference; its "saved / avoided" semantics are superseded by the decisions below.

## Founder decisions (final)

1. **Entry:** a "Spending habits" tool card beside the Loan calculator under *Go further* on Home
   (`src/components/dashboard/tool-cards.tsx`). It opens `/habits`, a full pushed page (no sheets, app-wide rule).
2. **Pro feature.** Free account with no habits: the tool card carries a PRO badge and opens
   `/pro-feature?id=habits`. Pro gates verbs, never nouns: a lapsed account keeps its cards, sees the dashboard and
   can still tap days; only *creating* a habit (the + button, "Start tracking") goes to the explainer.
   DB: `habits` INSERT requires `is_pro` (BEFORE INSERT trigger, skip when `auth.uid() is null`). Taps are not gated.
3. **Tap amount:** a habit has a set **price**. Tapping an empty day circle creates ONE receipt for that day at that
   price, charged to the habit's Paid with (card / account / Skip). It shows on that card's activity, in Activity,
   Home Recent, Receipts, with the habit's **icon, name and price** everywhere.
4. **Saved = skipped days x price.** Every past day (from the habit's start to *yesterday*; today does not count
   until it is over) with no receipt saves one price. The hero's "Saved" is all-time across active habits;
   "Spent this week" sums the habit receipts dated in the shown week (their real amounts, edits included).
5. **Undo:** tapping a filled circle asks "Remove Monday's Coffee ($5)?" (confirm dialog), deletes that receipt,
   red toast. A circle is filled iff a receipt with that `habit_id` exists on that date, so deleting or re-dating
   the receipt anywhere else updates the circle.
6. **Delete a card:** the receipts stay (real money spent). Soft delete (`archived_at`) so they keep the habit's
   icon and name. Archived habits leave the dashboard and the Saved total.
7. **Colours:** the user picks one of 6 per card. Icon circle background = the habit colour's tint (as in the hi-fi).
8. **Icons:** all 100 from `~/Desktop/Skip Budget Icons - 100 Categorized` (13 categories). The icon picker groups
   them by category, each group with a heading and its own soft background tint.
9. **Presets:** 10 ready-made habits. Step 1 shows 6, then two buttons at the bottom: **More** (reveals the other 4)
   and **Add my own** (always there; name + icon picker). No "type your own habit" text box.
10. **Edit:** tapping a card body opens a habit detail page (bill/receipt detail style, header pencil, per the
    rows-open-detail-pages rule). The pencil opens the same final page in edit mode with Delete.
11. **Weeks** run Monday-Sunday (M T W T F S S, localized). Future days are inert. A new habit starts on the
    **Monday of the week it was created** ("Starts: This week"), so this week's earlier days can be back-filled.
12. One receipt per habit per day.

## Defaults the CEO set (tell the Founder; change if they object)

- Price or Paid with edits apply to future taps only; past receipts keep their amounts and cards.
- Renaming a habit renames its receipts (`merchant`) so rows stay in step; the icon and colour are read by join.
- A habit receipt's spend category comes from its icon (stored on the habit as `category_id`).
- Saved uses the habit's current price.
- Archived habits' receipts still render with the habit's icon.

## Colours (light values sampled from the hi-fi; dark values: Pia)

| id | fill | light tint |
|---|---|---|
| caramel | #C8894E | #F4E8DC |
| coral | #F2795B | #FDE9E3 |
| green | #3DB07D | #E2F4EA |
| blue | #4C7CF3 | #E4ECFD |
| violet | #8B6CE6 | #EDE8FC |
| pink | #E2679B | #FBE6EF |

Hero = accent `#905479` card, "Saved" inner tile. Missed/empty circle: line colour; a day before the start: faded.

## Presets (Pia may refine names, subtitles, prices)

| id | name | subtitle | icon | colour | price | chips |
|---|---|---|---|---|---|---|
| coffee | Coffee | Café runs | food-dining/coffee | caramel | 5 | 3 / 5 / 7 |
| breakfast | Breakfast out | Mornings out | food-dining/breakfast | coral | 10 | 8 / 10 / 15 |
| lunch | Lunch out | Eating out | food-dining/lunch-out | green | 15 | 10 / 15 / 20 |
| delivery | Food delivery | Takeout apps | food-dining/fast-food | blue | 25 | 15 / 25 / 35 |
| snacks | Snacks & sweets | Treats on the go | food-dining/snacks-sweets | pink | 4 | 2 / 4 / 6 |
| rides | Taxi & rides | Rides & fares | transport/taxi-rides | violet | 15 | 10 / 15 / 25 |
| shopping (More) | Online shopping | Impulse buys | shopping/online-shopping | blue | 30 | 20 / 30 / 50 |
| drinks (More) | Drinks out | Bars & nights out | food-dining/alcohol-nightlife | violet | 20 | 10 / 20 / 30 |
| soda (More) | Soft drinks | Sodas & energy drinks | food-dining/soft-drinks | coral | 3 | 2 / 3 / 5 |
| dinner (More) | Dinner out | Restaurants | food-dining/dinner-out | green | 40 | 30 / 40 / 60 |

## Contracts (parallel work, same tree, strict file ownership)

### `src/data/habit-colors.ts` (CEO wrote it; Dana may add dark values)
`HabitColor` union, `HABIT_COLORS` list.

### Icons (Dana): `assets/habit-icons/<category-id>/<icon-id>.svg`, `src/data/habit-icons.ts`
- Icon id = `<category-id>/<name-slug>`, e.g. `food-dining/coffee`. Category ids: kebab-case of the folder prefix
  (`entertainment, family-pets, finance, fitness, food-dining, goals, health, home-bills, learning-growth,
  relationships, shopping, transport, wellness`).
- Exports: `HABIT_ICON_CATEGORIES: { id, label: MessageKey, tint: {light, dark}, icons: HabitIconDef[] }[]`,
  `HabitIconDef = { id, label: MessageKey, Svg: React.FC<SvgProps>, spendCategory: string }`,
  `habitIcon(id): HabitIconDef | undefined`, `FALLBACK_HABIT_ICON`.
- `src/components/habits/habit-icon.tsx`: `<HabitIcon iconId color size? />`: the tinted circle with the SVG.
- spendCategory map (spend_categories ids): food-dining → dining except groceries → groceries; transport →
  transport; shopping → shopping except clothes/shoes/accessories/jewelry → clothing and personal-care/hair-care →
  beauty; entertainment → entertainment except books → news; health → pharmacy except gym-membership → fitness;
  fitness, wellness → fitness; family-pets/pets → pets; home-bills → home; learning-growth → news; else other.

### Maths (Drew): `src/lib/habit-week.ts` (pure, cents-exact, local ISO dates `YYYY-MM-DD`)
`weekStartOf(day)`, `weekDays(weekStart)` (7 dates Mon..Sun), `shiftWeek(weekStart, by)`,
`dayState(habit, day, tapped, today): 'tapped'|'open'|'today'|'future'|'before'`,
`spentInWeek(taps, weekStart, habitIds?)`, `savedInWeek(habit, tappedDays, weekStart, today)`,
`savedAllTime(habits, taps, today)`, `skipStreak(habit, tappedDays, today)`,
`formatWeekRange(weekStart)` ("Oct 5 – 11", "Sep 28 – Oct 4", localized month names).
Types: `HabitMaths = { id, price, startedOn }`, `HabitTap = { habitId, day, amount, receiptId }`.

### Data (Diego): migrations + `src/api/habits.ts` + ledger/receipt joins
- `20261009100001_capture_source_habit.sql`: `alter type capture_source add value 'habit'` alone.
- `20261009100002_habits.sql`: `habits(id, user_id, name, icon_id, color, price numeric(14,2) > 0, category_id →
  spend_categories default 'other', card_id, bank_account_id (at most one; on delete set null), preset_id,
  started_on date, sort_order, archived_at, created_at, updated_at)`, RLS owner-only, Pro INSERT trigger,
  `receipts.habit_id → habits on delete set null`, unique (habit_id, purchased_on) where habit_id is not null,
  rename trigger (habit name → its receipts' merchant), updated_at trigger like the other tables.
- Hooks: `useHabits()` (active, sorted), `useHabit(id)`, `useHabitTaps()` (all `HabitTap`s for the user's habits),
  `useCreateHabit`, `useUpdateHabit`, `useArchiveHabit`, `useTapHabitDay()` ({habit, day} → inserts the receipt,
  `source: 'habit'`), `useUntapHabitDay()` (receiptId → delete). Invalidate receipts, dashboard, habits.
- `LedgerEntry.habit?: { iconId: string; color: HabitColor }` for receipts with a habit; `ReceiptRow` gains
  `habit_id` and the joined `habit { name, icon_id, color }`.
- A missing table (42P01) must surface as an error, not as "no habits".

### UI (Dana, after the Founder approves the gap screens)
Screens `/habits`, `/habit-new` (Pick → Price → Confirm; Add my own → name → icon picker), `/habit/[id]` detail,
edit mode, Pro explainer `habits`, tool card + PRO badge, habit icon in the six receipt row renderers
(`transaction-row`, `transactions/ledger-row`, `receipts/receipt-row`, `receipt/[id]`, `source/[id]`, home).
Toasts: Habit added / updated / deleted, Receipt added / deleted. Copy in `src/i18n/messages/habits.ts` (en/es/fr).

## Rules for everyone
- Tests live under `src/__tests__/`, never under `src/app`.
- Other agents edit this tree at the same time: touch only your files; run only your own tests
  (`npx jest --ci <paths>`); never run prettier --write or eslint --fix on the whole repo.
- No commits. The CEO commits after Founder approval. Migrations are not pushed until the Founder says so.
- Comments: only the non-obvious why; no history, dates or names.

## Founder design review (2026-10-09, after Pia's spec and the CEO mock `.claude/team/design/spending-habits-mock.html`)

Approved: Home tool card + Pro explainer, Step 3 Confirm, habit page, Activity rows + habit receipt page, the
app-style centred dashboard header, tap-a-tile-goes-straight-on in Step 1. Changes (these override the spec):

1. **Habit cards show BOTH figures** on the right: "$10.00 saved" (moneyIn above 0, else ink) over
   "$10.00 spent" (ink; this habit's receipts in the shown week, real amounts). Small muted words after each figure.
2. **Step progress = the app's standard StepIndicator** (small centred dots, current one a wide pill), never full-width
   bars. Questions use StepFlow's standard centred question style ("Ready to track" too).
3. Step 1 has nothing under More / Add my own (the mock's note was annotation only).
4. **Icon picker: every icon sits on its own circle** (48pt, its category's tint); no tinted panel behind a group.
   The group heading stays.
5. Step 2 (Price) as in the updated mock: question, habit icon + name, amount hero with
   "Each day you tap records this amount.", 3 chips, Continue, keypad.
6. **Saved counts from the day the habit is created**, not the Monday. The week's earlier days stay tappable
   (back-fill). New column `saved_from date not null` (the app sends today's local date); Drew's maths takes
   `savedFrom` (Saved and the skip streak start at max(startedOn, savedFrom)).

CEO calls on the open questions: reassurance line = the house "You can edit this later." (drop the `reassurance`
prop); MXN preset prices and chips x10; habit receipts in `/add-receipt?id=` show Store read-only (HabitIcon + name)
and a day already tapped gives "{name} already has a receipt on that day."; habit taps do not silence the daily
"add today's receipts" reminder; spend categories use utilities / telecom / insurance / finance where they fit
(Dana's mapping); `habits` joins the realtime provider only after the migration is live.

## HabitCard contract (Dana A)

`import { HabitCard, type HabitCardHabit } from '@/components/habits/habit-card';` (compiles; tsc clean)

```ts
export type HabitCardHabit = Pick<
  HabitRow,
  'id' | 'name' | 'icon_id' | 'color' | 'price' | 'started_on' | 'saved_from'
>;

export type HabitCardProps = {
  habit: HabitCardHabit;
  /** Every habit's taps, or only this one's: the card keeps its own (by habit.id). */
  taps: readonly HabitTap[];
  /** Any day of the week shown; the card draws Monday to Sunday. */
  weekStart: string;
  /** The local day, yyyy-mm-dd. */
  today: string;
  /** False draws a preview: nothing presses, VoiceOver reads the card as one line. Default true. */
  interactive?: boolean;
  onOpen?: () => void;
  onTapDay?: (day: string) => void;
  onUntapDay?: (tap: HabitTap) => void;
  /** Days whose request is in flight; they ignore taps. */
  busyDays?: ReadonlySet<string>;
  /** Free 90-day floor: earlier days are inert and drawn as 'before' (review fix, optional). */
  floor?: string;
};
```

Card face (Founder, after the Simulator): icon | name | the habit's price only. No pills, no sub-line;
Spent and Saved live on the hero. The VoiceOver label carries the price, the status and both figures. Preview on Confirm (build B): `<HabitCard interactive={false} habit={{ id: 'preview', name, icon_id, color,
price: price ?? 0, started_on: weekStartOf(today), saved_from: today }} taps={[]} weekStart={today}
today={today} />`. A new habit with no taps shows "New · tap the days you bought it", $0.00 saved, $0.00
spent, today ringed in the habit fill. The card reads `useTheme()` and `useColors()`/`useMoneyColor()`
from theme-provider, so a test that mocks theme-provider must give `useTheme: () => ({ scheme, colors })`.
Also in `habit-card.tsx`: `habitStatus(maths, tappedDays, weekStart, today)` (the sub-line); in
`day-row.tsx`: `DayRow`, `spokenDay(iso)`. Colour names on the habit page reuse B's `habitFlow.color.*`
and `habitFlow.field.colour`. `src/data/habit-colors.ts` now carries Pia's section 9 fills and `ink`.

## Founder changes after the Simulator test (2026-10-09, later)

- **Cards show only the price** ("$5.00") on the right of the name: no sub-line, no saved or spent on cards.
  Spent and Saved live only on the purple hero.
- **No taps before a habit's creation day.** On the creation day only today can be tapped; the next day, yesterday
  and today; and so on: every day from creation through today stays open. Days before creation are 'before'
  (faded, inert). This supersedes decision 11's back-fill of the week's earlier days. A receipt edit can't move a
  habit receipt before the creation day. Taps made before this rule still show and can be removed.
- Confirm's "Starts" row says "Today".
