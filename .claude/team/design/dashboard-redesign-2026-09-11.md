# Dashboard redesign — `src/app/(tabs)/home.tsx`

Date: 2026-09-11 · Author: Priya · Builder: **Pia** · Reviewer: Priya
Follows `.claude/team/design/design-direction-2026-09-11.md`. Presentation only: every value below
names the variable it already comes from in `home.tsx`. No hook, query, route or figure changes.

## The one structural change

**Out:** the full-bleed horizontal `ScrollView` of square `AmountTile`s with 55%-opacity
illustrations ("Where it goes").
**In:** one flat card holding five full-width destination rows — tonal icon well, label, amount.

Justification, as asked, in two: a horizontal carousel hides three of the five destinations behind a
gesture and spends a 150×150 box on a drawing to show one number, while a vertical list puts all five
on screen with their amounts in a single right-aligned column that can be compared at a glance —
which is the whole job of "where it goes". It also keeps the amounts in the same visual grammar as
the Recent and Coming up rows directly below, so the dashboard reads as one screen instead of three
unrelated widgets stacked.

`tile_order` keeps working unchanged: the same `orderByIds(spendingCategories, profile.data?.tile_order)`
memo now sets **row order** instead of carousel order. `src/app/tiles.tsx` needs no logic change.

---

## Wireframe, top to bottom

```
┌─────────────────────────────────────────────────────┐  Screen  px-6, pull-to-refresh
│ (•) Sam                                         🔔  │  DashboardHeader        mt-2
│                                                     │
│ ┌─ hero · bg-control · rounded-[24px] · flat ─────┐ │                         mt-6
│ │ Left this month              [ 19 days left ]   │ │
│ │                                                 │ │
│ │ $2,713.00                                       │ │  RollingNumber 40/34/28
│ │                                                 │ │
│ │ ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ 28% of this month's income is spoken for        │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ one card, split by a hairline ─────────────────┐ │                         mt-3
│ │  ↙  Income          │  ↗  Expenses              │ │
│ │  $3,760.00          │  -$1,047.00               │ │  20px semibold
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ Getting started (until dismissed/complete) ────┐ │                         mt-6
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Where it goes                          This month   │  SectionHeading         mt-8
│ ┌─ one card · border-line · flat ─────────────────┐ │                         mt-3
│ │ [▤]  Monthly Bills                  -$1,030.00  │ │
│ │ ─────────────────────────────────── ml-[52px] ─ │ │
│ │ [▤]  Receipts                          -$17.00  │ │
│ │ ───────────────────────────────────────────────  │ │
│ │ [▤]  Subscriptions                    -$64.99   │ │
│ │ ───────────────────────────────────────────────  │ │
│ │ [▤]  Loan calculator          [PRO]  Open  ›    │ │
│ │ ───────────────────────────────────────────────  │ │
│ │ [▤]  Split manager            [PRO]  Open  ›    │ │
│ └─────────────────────────────────────────────────┘ │   order = tile_order
│                                                     │
│ ┌─ Insights · flat row card ──────────────────────┐ │                         mt-3
│ │ [◹]  Insights                               ›   │ │
│ │      See the story behind your spending         │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ ‹   Monday                  ›  ─────────────────┐│  DateSelector           mt-8
│ │     12 September          📅                     ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ Recent                            6 – 12 September  │  SectionHeading         mt-8
│   YESTERDAY                              -$39.75    │  DateGroupHeader
│   (◎) Supermarket                        -$35.00    │  TransactionRow
│       Receipt                                       │
│   ──────────────────────── ml-[52px] ──────────     │
│   (◎) Coffee shop                         -$4.75    │
│                                                     │
│ Coming up                        13 – 19 September  │  SectionHeading         mt-8
│   SATURDAY                              -$120.00    │
│   (◎) Rent                              -$120.00    │
│       Bill                                          │
│                                              ( + )  │  AddButton (FAB)
└─────────────────────────────────────────────────────┘
```

---

## Block by block

### 1. Header — `DashboardHeader` (unchanged component)

Data: `profile.data?.display_name ?? 'Welcome'`, `profile.data?.avatar_id`. Actions: `/avatar`,
`/notifications`. **Polish only:** bell button `rounded-[10px]` → `rounded-[12px]`, `strokeWidth`
1.8 (already correct).
States: while `profile.isLoading` the name falls back to "Welcome" as today — do not add a skeleton
here, a one-frame name swap is quieter than a flashing block.
A11y: unchanged, both labels are already correct.

### 2. Hero — `BalanceSummary` (restyle in place)

Data: `leftThisMonth={payday - expensesThisMonth}`, `payday={month.totals.in}`,
`expenses={month.totals.out}`, `loading={month.isLoading}`. All unchanged.
Changes:
1. `rounded-[20px]` → `rounded-[24px]`; delete `style={shadows.card}`; padding `p-5` stays.
2. Keep `bg-control`, `text-on-control`, the days-left pill, the progress bar and its caption —
   this block already is the Wise idea and only needed flattening.
3. Loading: replace the em-dash with `<Skeleton className="mt-3 h-[52px] w-2/3 rounded-[12px] bg-on-control/15" />`.
   The days-left pill and label stay visible, so nothing jumps when the figure lands.
Copy (unchanged): "Left this month" · "{n} days left" / "Last day" ·
"{n}% of this month's income is spoken for".
Error (new): pass `error={month.isError}` from `home.tsx`. When set, the figure renders as "—" and
the caption becomes "We could not load this month. Pull down to try again." Never render a computed
figure from a failed query.
A11y: the card is one `accessibilityLabel` — "Left this month, {formatCurrency(leftThisMonth)},
{n} days left". Progress bar: `accessibilityRole="progressbar"` with
`accessibilityValue={{ min: 0, max: 100, now: Math.round(spentShare * 100) }}`.

### 3. Income and Expenses — `BalanceSummary`'s `Stat` (merge into one card)

Data: `payday` and `-expenses`, exactly as today.
Changes: the two `Stat` cards become one `rounded-[16px] border border-line bg-card` card,
`flex-row`, each half `flex-1 p-4`, separated by `<View className="w-px self-stretch bg-line" />`.
Icon well `h-8 w-8 rounded-full bg-ink/5`, `ArrowDownLeft` / `ArrowUpRight` at `size={18} strokeWidth={1.8}`.
Figure 18px → **20px** semibold, colour `colors.moneyIn` / `colors.moneyOut`.
Copy: "Income", "Expenses" — unchanged.
States: loading → `<Skeleton className="mt-4 h-5 w-24" />` in place of each figure; error → "—".
A11y: each half is a non-interactive group with `accessibilityLabel="Income, $3,760.00"`.

### 4. `GettingStartedCard` — unchanged behaviour, three polish edits

Data/logic from `useGettingStarted()` — untouched, including `visible`, `dismiss`, `askForReminders`.
1. `rounded-[14px]` → `rounded-[16px]`, drop `style={shadows.card}`, keep `border border-line`.
2. Title uses the new `SectionHeading` (17px — it already is 17px, so this is a swap not a resize).
3. `mt-6` stays on the card so a dismissed card still leaves no gap.
Copy unchanged: "Getting started" · "{done} of {total} done" · step titles.

### 5. Destinations — NEW `src/components/dashboard/destination-list.tsx`

Replaces the `ScrollView` + `AmountTile` block and the `GUTTER = 24` negative-margin trick (delete
the constant). `AmountTile` itself stays in the repo — `tiles.tsx` still previews with it until Pia
does that screen.

**Heading row:** `<SectionHeading caption="This month">Where it goes</SectionHeading>`.
The old right-hand caption "{tiles.length} categories" goes: a list makes the count visible, and
"This month" tells the user what window the amounts cover, which the tiles never said.

**Data, unchanged:** `tiles` (from `orderByIds(spendingCategories, profile.data?.tile_order)`),
`tileAmounts` (`{'monthly-bills': -monthlyBillsTotal, receipts: -receiptsTotal, subscriptions: -subscriptionsTotal}`),
`pro` from `usePro()`, and the same five `router.push` targets:
`/bills`, `/receipts`, `/subscriptions`, `/loan-calculator`, `/splits`.

**Props:** `{ items, amounts, pro, loading, error, onPress(id), onRetry }` — `home.tsx` keeps owning
the routing map exactly as it does now.

**Container:** `rounded-[16px] border border-line bg-card overflow-hidden py-1`. No shadow.

**Row:** `px-4 py-3.5 min-h-14 flex-row items-center gap-3 active:opacity-60`.
- Icon well: `h-10 w-10 items-center justify-center rounded-[12px] bg-ink/5`, lucide at
  `size={20} strokeWidth={1.8} color={colors.body}`. Verified present in lucide-react-native 1.33.0:

      monthly-bills    CalendarDays
      receipts         ReceiptText
      subscriptions    Repeat
      loan-calculator  Landmark
      split-calculator Users

  Export the map as `DESTINATION_ICONS: Record<string, LucideIcon>` with a `FileText` fallback, so an
  id added later never renders an empty well and `tiles.tsx` can import the same map.
  Do **not** add an icon field to `src/data/dashboard-mock.ts` — that file is shared with `tiles.tsx`.
- Label: `font-poppins-medium text-[15px] text-ink`, `numberOfLines={1}`, cap 1.4. Copy is
  `category.label`, untouched: "Monthly Bills", "Receipts", "Subscriptions", "Loan calculator",
  "Split manager".
- Trailing, money rows (`amounts[id] !== undefined`): `formatCurrency(amount)` at
  `font-poppins-semibold text-[15px]`, colour `useMoneyColor()(amount)`. Values stay signed exactly
  as `tileAmounts` builds them.
- Trailing, tool rows: muted "Open" at `font-poppins text-[13px] text-muted`, then
  `<ChevronRight size={18} color={colors.muted} strokeWidth={2} />`.
- PRO badge: when `!pro && (id === 'loan-calculator' || id === 'split-calculator')`, an inline pill
  before "Open" — `rounded-full bg-accent px-2 py-0.5`, text `font-poppins-bold text-[9px]
  text-on-control allowFontScaling={false}`, copy `PRO`. Inline, not the old absolute corner pin, so
  it cannot overlap the label at large type. The row still navigates; the destination screen keeps
  doing the actual gating, exactly as today.
- Divider: `<View className="ml-[52px] h-px bg-line/60" />` between rows only (40pt well + 12pt gap).

**States**
- Loading (`month.isLoading`): rows render in full with the icon and label; each money row's amount
  is `<Skeleton className="h-3.5 w-20" />`. Tool rows show "Open" immediately — they never wait on
  data. No layout shift when amounts arrive.
- Error (`month.isError`): money amounts render "—" in `text-muted`, and one line sits under the
  card: "Amounts are unavailable right now." plus a `TextLink` "Try again" wired to the existing
  `refresh` from `useRefreshAll()`. Rows stay tappable — the destination screens load their own data.
- Empty: there is no empty state. The five destinations are shipped constants; a zero month shows
  `$0.00`, which is a true and useful figure.

**A11y:** each row `accessibilityRole="button"`. Labels:
- money row: `"Monthly Bills, -$1,030.00, this month"`
- tool row: `"Loan calculator. Opens the calculator."`
- locked tool: `"Loan calculator. Pro feature. Opens the calculator."`
- loading: `"Monthly Bills, amount loading"` · error: `"Monthly Bills, amount unavailable"`
The PRO pill itself is `accessibilityElementsHidden` — it is already in the row's label.

### 6. Insights — `InsightBanner` (restyle)

Data: none. Action: `router.push('/insights')` — unchanged.
Changes:
1. Drop `style={shadows.raised}`; add `border border-line`; `rounded-[16px]` stays.
2. Replace the 76×76 artwork with the one accented well on this screen:
   `h-10 w-10 rounded-[12px] bg-accent/10` holding `<TrendingUp size={20} color={colors.accentInk} strokeWidth={1.8} />`.
   `artwork.insights` stays in the registry for the Insights screen's own empty state.
3. Title 17px → **15px medium** so it reads as a row rather than competing with the "Where it goes"
   heading above it; caption stays 13px muted.
Copy unchanged: "Insights" / "See the story behind your spending".
A11y: unchanged — `accessibilityLabel="Insights. See the story behind your spending."`, and keep the
existing rule that without `onPress` it is a `View` with no button role.

### 7. Date selector — `DateSelector` (polish)

Data/actions unchanged: `weekday`, `date` from `formatDayLabel(selectedDate)`, `onPrevious`,
`onNext`, `onPickDate`, `atLatest`, and `DatePicker` on `pickerOpen`.
1. Container `rounded-[10px]` → `rounded-[12px]`; steppers `rounded-[8px]` → `rounded-full`.
2. `hitSlop={8}` on both steppers (40pt visual, 44pt target).
3. Preceded by `mt-8` whitespace instead of the `h-px bg-line` rule above it — delete that divider.
Copy unchanged. A11y: existing labels are already correct, including `accessibilityState={{ disabled: atLatest }}`.

### 8. Recent / Coming up — the local `Section` in `home.tsx`

Data unchanged: `recent = useLedger({from: addDays(selectedDate,-6), to: selectedDate}, today)` and
`upcoming = useLedger({from: +1, to: +7}, today)`; rows via `groupByDate`, `DateGroupHeader`,
`TransactionRow`; `direction` desc/asc as today.
1. Heading → `SectionHeading` with `caption={range}` (`formatDateRange(...)`). Section spacing
   `mt-7` → `mt-8`.
2. Loading → `<SkeletonList rows={3} />`, replacing the bare word "Loading" (audit finding 7).
3. Error → new branch on `recent.isError` / `upcoming.isError`, already exposed by `useLedger`:
   a muted line "We could not load this week." with a `TextLink` "Try again" calling `refresh`.
4. Divider `ml-13` → `ml-[52px]` (audit finding 6 — the class does nothing today).
Copy: "Recent" · "Coming up" · empty "Nothing in this week." · empty "Nothing due in the week ahead."
— all unchanged. New: "We could not load this week." / "Try again".
A11y: `SkeletonList` already carries `accessibilityLabel="Loading"`; keep `TransactionRow`'s
value-bearing labels untouched.

### 9. FAB and pull-to-refresh

`AddButton` → `/add-receipt`, `Screen`'s `onRefresh={refresh}` / `refreshing={refreshing}` from
`useRefreshAll()`, and `useKeepSchedulesCurrent()` all stay exactly as they are.
One fix: `<Plus size={28} color={colors.surface} …>` → `color={colors.onControl}` and
`strokeWidth={2.5}` → `2`. `colors.surface` fails on 11 of 12 accents in at least one mode.
Keep `shadows.floating` — this one really does float.
Also `screen.tsx:57`: `tintColor="#9A9A9A"` → `tintColor={colors.muted}`.
Bottom padding `pb-24` on the last section stays so the FAB never covers a row.

---

## What `home.tsx` gains and loses

Loses: `GUTTER`, the horizontal `ScrollView`, `AmountTile` + `useArtwork()` imports, the absolute PRO
badge block, the `h-px bg-line` divider.
Gains: `DestinationList`, `SectionHeading`, `SkeletonList`, `TextLink`, and three `isError` reads
(`month`, `recent`, `upcoming`) from hooks it already calls.
Unchanged: every `useState`, `useMemo`, `useEffect`, `useRef`, the midnight-rollover effect,
`handleConfirmDate`, `spentOn`, `tileAmounts`, and all five `router.push` targets.

---

## Polish split for the rest of the app

Max three changes per screen. Both designers apply the direction doc; nobody invents a new pattern.

**Land first, in this order, to avoid collisions — Pia, before anything else:**
1. `typography.tsx` — add `SectionHeading`.
2. `button.tsx` — `rounded-[10px]` → `rounded-full` (pending Founder sign-off, open question 1).
3. `screen.tsx` — `tintColor={colors.muted}`; `Screen` owns the `mt-2` title offset.
Then Paulo adds the `danger` token to `palette.ts` (RAMPS + Tokens + `text-danger`) and both work on.

### Pia — everyday

| Screen | Up to 3 changes |
|---|---|
| `(tabs)/home.tsx` + `components/dashboard/*` | The whole spec above |
| `(tabs)/transactions.tsx` | `SectionHeading`; flat cards (drop `shadows.card`); row divider `ml-[52px]` |
| `(tabs)/cards.tsx` | Headings 20 → `SectionHeading`; retire local `EmptyNote` for `PageState`; add the missing error branch (`data?.length === 0` is false when data is undefined — blank region today) |
| `bills.tsx` | Divider `ml-13` → `ml-[52px]`; card radius/flatten; `SectionHeading` |
| `subscriptions.tsx` | Same three |
| `receipts.tsx` | Flatten cards; `SectionHeading`; row spacing to the 4pt scale |
| `splits.tsx` | Collapse its 15/17/21px headings to `SectionHeading`; flatten; pill buttons |
| `source/[id].tsx` | FAB `colors.surface` → `colors.onControl`; divider `ml-[52px]`; `SectionHeading` |
| `tiles.tsx` | Swap the artwork preview for `DESTINATION_ICONS` so Arrange matches the dashboard; `rounded-[16px]`; keep the move-by-a-step model exactly |
| `hello.tsx` | Skeleton while `profile.isLoading`; move the redirect out of render (`<Redirect href="/home" />`); no visual change otherwise |
| `welcome.tsx` | Pill buttons; spacing to the scale; flag the "Track /…" copy to Mia rather than patching it |
| `components/navigation/skip-tab-bar.tsx` | Focused icon `colors.onControl` (not white) — one line |
| `components/ui/multi-choice-chips.tsx` | `text-on-control`; `rounded-full`; `strokeWidth` 1.8 |
| `add-*.tsx` (6 screens, as one pass) | `text-danger` token in place of `#DC2626`; inputs `rounded-[12px]`; primary action to the pill button |

### Paulo — loans, insights, settings, paywall

| Screen | Up to 3 changes |
|---|---|
| `palette.ts` | Add the `danger` token (light `#B85040` family / dark `#ED7A7A` family) + `text-danger` |
| `insights.tsx` | **Blocker:** aggregate the 8 `isError` flags → `PageState` "We could not load your insights." / "Something went wrong fetching your figures. Nothing is lost." / "Try again". Never render a derived total from a failed query; local `Heading` → `SectionHeading`; flatten cards |
| `pro.tsx` | **Blocker:** delete the `debug` line from the render and map raw store errors to "We could not reach the App Store. Check your connection and tap Check again."; plan cards flat + `rounded-[16px]`; pill CTA |
| `pro-feature.tsx` | `SectionHeading`; flatten; pill CTA |
| `loan-calculator.tsx` | Result figure to 20px semibold per the number scale; flatten cards; `rounded-[12px]` inputs. **No maths, no formatting, no rounding changes** |
| `loan-schedule.tsx` | Chrome only: `SectionHeading`, flatten rows, `ml-[52px]` divider. Keep every `accessibilityLabel` verbatim. (Virtualising 360 rows is a separate ticket for Dmitri) |
| `savings.tsx` / `savings-month.tsx` / `save-loan.tsx` | `SectionHeading` (16/20 → 17); flatten; spacing to the scale |
| `salary.tsx` | 24px heading → `SectionHeading`; flatten; pill buttons |
| `settings.tsx` | `SectionHeading`; "Preference" → "Preferences"; `settings-row.tsx` divider `ml-8` → `ml-[52px]` and `#DC2626` → `text-danger` |
| `appearance.tsx` | Radii to the 4-step scale only — this screen is the reference implementation for `onColor`, do not restructure it |
| `notifications.tsx` / `reminders.tsx` | `SectionHeading`; `hitSlop={8}` on the 32pt remove control in `reminders.tsx:354`; flatten |
| `components/ui/slider-row.tsx`, `filter-sheet.tsx`, `receipt-filter-sheet.tsx` | Add the three missing `maxFontSizeMultiplier` caps |

Not in this pass, tracked for Dmitri: `queries.ts:169` (`useLedger.isError` omits `salary` and
`charges`), and `loan-schedule` virtualisation.

## Open questions for the Founder

1. `Button` to `rounded-full` changes the primary button on every screen in one commit. Approve, or
   keep `rounded-[10px]` and only round the small pills?
2. `SectionHeading` at 17px lightens the Cards tab (20px) and Insights (19px). Approve?
3. The dashboard illustrations move off Home to empty states and onboarding. Confirm you want them
   gone from the destinations rather than shrunk to 24pt inside the icon wells.
4. The section caption changes from "5 categories" to "This month". Keep the count instead?
5. The `danger` token shifts the destructive red slightly in light mode as well (`#DC2626` → a warmer
   brick matching `moneyOut`). Acceptable?
