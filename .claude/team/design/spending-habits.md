# Spending habits: screen spec

Pia, 2026-10-09. This builds on the CEO brief `.claude/team/dev/spending-habits-brief.md`, whose Founder decisions are
final, and on the mocks in `reference/spending-habits/`. The hi-fi sets the look. The wireframe's "weekly limit" is now
a per-tap **price**. Wherever this spec departs from a mock, it says why.

## Conventions (every screen)

- **Strings.** Each string is written as a `key` and its "English". All keys are new unless marked *(existing)*: every
  `habits.*`, `pro.habits.*` and `toast.habit.*` key, plus `home.tool.spendingHabits`, `home.tool.habitsLocked` and
  `receipts.detail.fromHabit*`. New keys get en/es/fr in `src/i18n/messages/habits.ts` or their own namespace file.
- **Money.** Use `formatCurrency` with cents everywhere ("$5.00"); the hi-fi's "$18" drops them. Never use
  `cents: false` on a computed figure, because it floors ($13.50 becomes "$13"). The only exception is the chip
  values, which are whole numbers by construction.
- **Pages.** Every step is a full page, and only `useConfirm` dialogs overlay.
- **Toasts.** `toast.habit.added` "Habit added", `toast.habit.updated` "Habit updated" and `toast.habit.deleted`
  "Habit deleted" (tone `deleted`). Day taps use `toast.receipt.added` / `toast.receipt.deleted` *(existing)*.
- **Failures.** A failure shows `failureText()` only; form hints keep their own words.
- **Large text.** Use the `TEXT_CAP` roles. Never use `numberOfLines`, never shrink a lone label, and render figures
  with `FitFigure` so they are never cut. When two things cannot share a line, the layout changes (FitGroup), as each
  screen states.
- **Weekdays.** `weekdayInitials()` in `src/i18n/calendar.ts` is Sunday-first. Rotate it to Monday-first: en
  M T W T F S S, es/fr L M M J V S D.

## 0. Shared pieces (`src/components/habits/`)

**HabitIcon** (exists). Size 40 in rows, 44 on cards and tiles, 52 on detail cards, 24 inline.

**Day circle.** Each day is a `flex-1` column across the card's full inner width: 44pt at 390pt, 42pt at 375pt. The
whole column (initial plus circle, min-h 52) is the Pressable.
- **Initial.** 11pt `font-app-medium` `muted`, cap `control`. Today's initial is `ink`, `font-app-bold`.
- **Circle.** 34pt. Its state decides the look and the tap:

| state | look | tap |
|---|---|---|
| tapped (receipt that day) | habit fill, `Check` 16 white, stroke 3 | confirm, then remove (section 2) |
| today, not tapped | 2pt ring in the habit fill | add a receipt for today |
| open (past, not tapped) | 1.5pt ring in `muted` | add a receipt for that day |
| future | 1.5pt ring in `line` | inert (`disabled`) |
| before start | no ring, disc `ink/5`, initial at 40% | inert |

- **Adding.** The circle fills optimistically, with a `success()` haptic, a 0.92 → 1 press scale and the "Receipt
  added" toast. The receipt uses the habit's price on its Paid with, `source: 'habit'`.
- **Failure.** The circle reverts and the page's failure line shows. A circle ignores taps while its request is in
  flight.
- **Rings.** The hi-fi greys every empty circle the same. An open past day is tappable, so it uses `muted` (5.0:1
  light, 5.9:1 dark, WCAG 1.4.11). A future day is inert, so it keeps the faint `line`.
- **VoiceOver** (`{day}` is the full date, "Monday, October 5"; `{amount}` is the receipt amount, else the price):
  `habits.day.bought` "{day}, bought, {amount}" (hint `habits.day.boughtHint` "Removes this receipt.");
  `habits.day.open` "{day}, not bought" (hint `habits.day.openHint` "Records {amount} spent on this day.");
  `habits.day.today` "{day}, today, not bought yet" (same hint); `habits.day.future` "{day}, still to come";
  `habits.day.before` "{day}, before this habit started".

**HabitCard.** `rounded-[16px] border border-line bg-card px-4 pt-3.5 pb-3`, 12pt apart.
- **Header row.** One Pressable that opens `/habit/[id]`.
  - Left: HabitIcon 44.
  - Middle (`flex-1 min-w-0`): the name (16pt semibold `ink`, cap `row`) over the sub-line (13pt, cap `row`).
  - Right: the figure (17pt semibold FitFigure; `moneyIn` when above 0, otherwise `ink`) over `habits.card.saved`
    "saved" (12pt `muted`).
  - If a word of the name or the figure stops fitting, the right column drops under the sub-line.
- **Day row.** `mt-3`, full width. The circles are their own buttons and never sit inside the header.
- **The one change from the hi-fi.** The hi-fi indents the day row under the name. That leaves 36pt columns at 390pt
  and 35pt at 375pt; full width gives 44pt and 42pt.

## 1. Home tool card (`tool-cards.tsx`)

- **Entry.** Add `{ id: 'spending-habits', label: 'home.tool.spendingHabits', icon: CalendarCheck, href: '/habits' }`
  after the loan calculator. The label is "Spending Habits", Title Case like "Loan Calculator". The icon is lucide
  `CalendarCheck` (ticking off a day), 20pt `accentInk` in the same `bg-accent/10` circle. Both names share one size
  and stack when they cannot (the existing FitGroup).
- **PRO badge.** Show it only when the account is not Pro **and** its active habit count is known to be 0. While the
  count loads, keep it hidden, so a lapsed account with habits never sees it flash.
  - It is the InsightBanner / voice FAB pill, absolute `right-2.5 top-2.5`: `rounded-full bg-accent px-2 py-0.5`,
    "PRO" in 9pt bold `on-control`, `allowFontScaling={false}`, hidden from VoiceOver.
- **Tap.** With the badge, open `/pro-feature?id=habits`. In every other case, loading included, open `/habits`.
- **Accessibility label.** `home.tool.opens` *(existing)*. When locked, `home.tool.habitsLocked` "Spending Habits.
  Pro feature. See what skipping saves."

## 2. Dashboard `/habits`

**Header.** `showBack`, title `habits.title` "Spending habits", `onRefresh`. Action: `Plus`, label `habits.add` "Add
a habit". It opens `/habit-new` for Pro and `/pro-feature?id=habits` for free or lapsed accounts.
- The header uses the app's centred title and tonal + circle (as on Bills and Receipts), not the hi-fi's left-aligned
  title and black circle.

**Page, top to bottom**
1. **Hero** (`mt-3`, `bg-accent rounded-[20px] p-5`, the same in dark mode).
   - **Spent.** `habits.hero.spentThisWeek` "Spent this week", or `habits.hero.spentThatWeek` "Spent that week" for
     older weeks (14pt white), over a 40pt bold white FitFigure. The figure sums the shown week's receipts of
     **active** habits, so it matches the cards.
   - **Saved tile** (`bg-white/10 rounded-[14px] px-4 py-3`). `PiggyBank` 16 and `habits.hero.saved` "Saved so far"
     (13pt), over 22pt bold `savedAllTime` across active habits.
   - **Contrast.** All type is white: 5.6:1 on the accent, 4.57:1 on the tile.
   - **Fit.** If either figure cannot fit whole side by side, the tile drops full width below (`mt-4`).
   - **VoiceOver.** One element: `habits.hero.spoken` "{label}, {spent}. Saved so far, {saved}."
2. **Week selector** (`mt-5`).
   - **Arrows.** 40pt circles, `border border-line bg-card`, chevrons 20 `ink`. Labels: `habits.week.previous`
     "Previous week", `habits.week.next` "Next week". Disabled arrows are `opacity-30` and flagged disabled.
   - **Centre.** Line 1, 12pt `muted`: `habits.week.this` "This week", `habits.week.last` "Last week", or nothing.
     Line 2, 15pt semibold `ink`: `formatWeekRange` ("Oct 5 – 11"). On any other week the centre is a button back
     to this week, hint `habits.week.backToThis` "Goes back to this week".
   - **Limits.** Back stops at the earliest active habit's start week. For free or lapsed accounts it also stops at
     the week holding the 90-day floor (`useHistoryFloor`). Totals stay whole, as on Bills. Forward stops at this
     week.
3. **Failure line.** Shown only after a failed tap: 13pt `danger`, centred, `failureText()`. It clears on the next
   success or a week change.
4. **Cards** (`mt-4 gap-3 pb-10`), in `useHabits()` order. A new habit gets the lowest `sort_order`, so it sits on top.

**Card figure.** `savedInWeek` for the shown week. Today counts only once it is over.

**Sub-line.** The first matching row wins. "Habit ink" is the colour's `ink` from section 9.

| when | sub-line | colour |
|---|---|---|
| shown week is before the habit's start | `habits.card.notYet` "Not tracking yet" (figure hidden) | muted |
| this week, today tapped | `habits.card.boughtToday` "Bought today" | muted |
| this week, started this week, no receipts yet | `habits.card.new` "New · tap the days you bought it" | muted |
| this week, skip streak ≥ 1 (`skipStreak`, ends yesterday) | `habits.card.skipped` {one "{count} day skipped", other "{count} days skipped"} | habit ink |
| this week, otherwise (yesterday tapped) | `habits.card.boughtYesterday` "Bought yesterday" | muted |
| past week, no receipts | `habits.card.skippedWeek` "Skipped all week" | habit ink |
| past week, some receipts | `habits.card.boughtDays` {one "Bought on {count} day", other "Bought on {count} days"} | muted |

**Card label.** `habits.card.opens` "{name}, {status}, {saved} saved. Opens the habit."

**Remove dialog** (tap on a tapped circle). `{amount}` is the receipt's real amount.
- **Title.** This week: `habits.remove.title` "Remove {weekday}'s {name} ({amount})?", for example "Remove Monday's
  Coffee ($5.00)?". Today: `habits.remove.titleToday` "Remove today's {name} ({amount})?". Older weeks:
  `habits.remove.titleDate` "Remove {name} on {date} ({amount})?".
- **Body.** Message `habits.remove.message` "This deletes the receipt."; `common.remove` *(existing)*, destructive,
  and the default Cancel. On confirm: `useUntapHabitDay`, then the red toast.

**States**
- **Loading.** A hero-shaped skeleton over `SkeletonList rows={3}`.
- **Error** (either query, missing table included). `PageState art=error` with `failureText()`. `common.tryAgain`
  *(existing)* refetches both. An error is never shown as empty.
- **Empty** (no active habits). No hero and no week selector. `PageState art=emptyWallet`, title `habits.empty.title`
  "Track a spending habit", message `habits.empty.message` "Pick something you buy often, like coffee. Tap the days
  you buy it, and Skip adds up what the other days save.", action `habits.add` (Pro to `/habit-new`, free to the
  explainer).
- **Lapsed or free with habits.** Everything works: view, browse, tap, open, edit, delete. Only + and the empty
  action lead to the explainer.
- **Dark mode.** Cards are `bg-card` #2A2634 and the tints use their dark values (section 9). The hero is unchanged.

## 3. Create flow `/habit-new`

One route whose pages are views over one state, as in `add-receipt`. Title `habits.new.title` "New habit"; close
prompt `habits.new.close` "Cancel adding this habit?".

### Step 1 of 3: Pick
`StepFlow steps=3 current=0`. Question `habits.pick.question` "What do you want to track?", then
`habits.pick.subtitle` "Pick one, or add your own." (14pt `muted`, centred).
- **Grid.** 2 columns, gap 12, the first 6 presets (section 10).
- **Tile.** `rounded-[16px] border border-line bg-card p-3.5`.
  - Top row: HabitIcon 44 on the left, a 22pt radio on the right. Unselected, the radio is a 1.5pt `muted` ring.
    Selected, it is a `bg-control` disc with `Check` 14 white, and the tile gets `border-2 border-control`.
  - Below: the name (15pt semibold `ink`, `mt-3`) over the subtitle (12pt `muted`).
  - If the preset is already an active habit, the subtitle reads `habits.pick.tracking` "Already tracking". The tile
    stays tappable.
  - Role `radio`, label `habits.pick.spoken` "{name}, {subtitle}, {price} each time".
- **One tap answers.** The radio fills, and Step 2 opens 150ms later. There is no Continue, since StepFlow omits it
  where the tap is the answer. Back shows the tile still selected.
- **Under the grid** (`mt-5`). Two `Button variant="outline"`, side by side or stacked. There is no text box.
  - `habits.pick.more` "More" (`ChevronDown`) fades in the other 4 tiles in place and moves VoiceOver focus to the
    first of them. Then it hides itself, and stays hidden after Back.
  - `habits.pick.own` "Add my own" (`Plus`) opens the Name page.
- **Preset values.** A preset sets the name (localized and copied in), icon, colour and price. If an active habit
  already wears that colour, use the first unused colour instead. Choosing another preset resets the price draft.

### Add my own: Name, then Icon
- **Name page.** `StepFlow steps=3 current=0`. Question `habits.name.question` "What do you want to call it?".
  - `TextField` labelled `habits.name.label` "Name", placeholder `habits.name.placeholder` "e.g. Bubble tea".
    Autofocus, sentence caps, max 40 characters, `avoidKeyboard`.
  - `common.continue` *(existing)* is disabled while the name is blank, then opens the icon picker.
- **Icon picker** (section 4). A tap picks the icon and goes **on to Step 2**. There the price is empty, the chips
  are 5 / 10 / 20 and the colour is the first unused one.

### Step 2 of 3: Price
`StepFlow steps=3 current=1`. Question `habits.price.question` "How much does it cost each time?".
- **Habit.** HabitIcon 24 and the name (15pt medium), centred, as in the wireframe.
- **Amount.** `AmountFigure`, then `habits.price.helper` "Each day you tap records this amount." (13pt `muted`).
- **Chips.** `SegmentedChips` with the preset's 3 chips (`formatCurrency(n, {cents:false})`). A chip lights when it
  equals the draft, and tapping one sets it.
- **Keypad.** `AmountKeypad` at the bottom.
- **Continue.** `common.continue` stays enabled when empty: Confirm shows the gap, as receipts do.

### Step 3 of 3: Confirm (also the edit page, section 6)
`EntryReview` with `root={false}`, so Back goes to Step 2. Dana adds two props:
- `progress={{steps:3,current:2}}`: draws StepFlow's exported `StepIndicator` under `FlowHeader`.
- `reassurance`: replaces the `entry.editLater` line.

**Above the rows.**
- **topSlot:** `habits.confirm.question` "Ready to track", in StepFlow's question style.
- **amountSlot:** `FieldLabel` `habits.confirm.preview` "Preview", over a non-interactive HabitCard for this week. It
  shows exactly what the dashboard will, saved figure included (open question 1).

| row | leading | label | value | tap |
|---|---|---|---|---|
| Habit | HabitIcon 40 | `habits.field.habit` "Habit" | name | Name page, edit variant (section 4) |
| Price | GlyphWell `Tag` | `habits.field.price` "Price" | `habits.field.priceValue` "{price} each time"; required gap | price page |
| Colour | field row | `habits.field.colour` "Colour" | 6 swatches inline | swatch |
| Paid with | field row | `habits.field.paidWith` "Paid with" | `SourceTiles` + skip pill `receipts.add.skipSource` "Skip" *(existing)*; required | pill |
| Starts | GlyphWell `CalendarDays` | `habits.field.starts` "Starts" | `habits.starts.thisWeek` "This week" | none (no chevron) |

- **Swatches.** 40pt fill circles, gap 12, so all 6 fit one line at 310pt.
  - Selected: a 2pt `ink` ring 4pt outside, with `Check` 18 white.
  - Role `radio`. Labels: `habits.color.caramel` "Caramel", `.coral` "Coral", `.green` "Green", `.blue` "Blue",
    `.violet` "Violet", `.pink` "Pink".
- **Footer.**
  - Reassurance: `habits.confirm.reassure` "You can change this anytime." These are the Founder's wireframe words, in
    the slot where the house line sits.
  - Primary: `habits.confirm.start` "Start tracking". While busy it reads `receipts.add.saving` *(existing)*
    "Saving…". It is never greyed out for a gap.
  - Missing hint: `habits.confirm.missingNew` "To start tracking, fill in: {fields}.", using the row labels.
- **Success.** `success()` haptic, the "Habit added" toast, then `router.back()` to the dashboard, with the new card
  on top.
- **Refusal.** If the DB trigger refuses because Pro has lapsed, push `/pro-feature?id=habits`. Back returns to the
  filled page.
- **Price page** (from the Price row). A `FieldPage` titled `habits.field.price`, with Step 2's body and
  `common.done` *(existing)*.

## 4. Name page (edit variant) and icon picker

**Name page, edit variant** (from the Habit row). A `FieldPage` titled `habits.field.habit`, with section 3's
question and field.
- **Icon row.** Below the field, an EntryRow-style row: HabitIcon 40, label `habits.field.icon` "Icon", value = the
  icon's label. It opens the picker.
- **Done.** `common.done` is disabled while the name is blank, then returns to Confirm.

**Icon picker.** On the create path it is `StepFlow steps=3 current=0` with question `habits.icon.question` "Pick an
icon" and no primary. Otherwise it is a `FieldPage` titled `habits.field.icon`.
- **Sections.** 13, in `HABIT_ICON_CATEGORIES` order, 16pt apart. Each is a `rounded-[20px] px-3 pt-3 pb-2` panel in
  its category tint, headed by the category label (13pt semibold `ink`, `accessibilityRole="header"`).
- **Grid.** 4 columns of `rounded-[14px]` cells, min-h 76. Each cell holds the SVG at 40pt, with no circle (the panel
  is the tint). Under it sits the label: 11pt `body`, centred, cap `control`, wrapping freely. If any label's longest
  word cannot fit a column, every section drops to 3 columns, then 2. No word is ever cut.
- **Selection.** The picked cell gets a 2pt `ink` ring and `accessibilityState.selected`.
- **Tap.** `selection()` haptic, then pick. On the create path, continue to Step 2. Otherwise, return to the Name
  page.

**Category tints** (these replace Dana's placeholders).
- **Method.** 13 evenly spaced OKLCH hues: L 0.955 / C 0.032 light, L 0.305 / C 0.04 dark. Hues are assigned so that
  neighbouring sections are at least 83° apart (adjacent ΔE_ok ≥ 0.034 light, ≥ 0.051 dark).
- **Contrast.** `body` on the light tints is ≥ 11.5:1. #E4E0EA on the dark tints is ≥ 10.1:1. The `ink` ring is ≥ 12:1.

| category | light | dark | category | light | dark |
|---|---|---|---|---|---|
| food-dining | #FFEBDC | #3F2A1B | home-bills | #E0F3FF | #1F3142 |
| transport | #DAF6FF | #15343E | family-pets | #FFE9E4 | #412724 |
| shopping | #FEE9FA | #3B2838 | relationships | #F5EBFF | #342A3F |
| entertainment | #FBEFD9 | #392D16 | learning-growth | #F1F3DA | #303119 |
| health | #D9F7F6 | #123535 | finance | #FFE8EF | #40262E |
| fitness | #EAEFFF | #2A2D43 | goals | #DDF7EB | #1A362A |
| wellness | #E6F6E1 | #253420 | | | |

## 5. Habit detail `/habit/[id]` (tap on a card's header)

**Header.** `showBack`, title = the habit name, `onRefresh`. The `Pencil` action (`habits.detail.edit` "Edit {name}")
opens `/habit-new?id=…` (section 6).
1. **`DetailCard`.** HabitIcon 52, the price, and subtitle `habits.detail.eachTime` "Each time". Rows: Paid with
   (`receipts.field.paidWith`, or `receipts.detail.noPaymentMethod` when unset, both *(existing)*); Category
   (`receipts.field.category` *(existing)*); Colour (`habits.field.colour`, the colour's name); Started
   (`habits.detail.started` "Started", `formatFullDate(started_on)`).
2. **This week.** `SectionHeading` `habits.week.this`, caption `formatWeekRange`, over a `bg-card border-line
   rounded-[16px]` card holding the dashboard's day row. The row is live, as in section 2, with the failure line under
   the card.
3. **Totals.** Two tiles (`rounded-[16px] bg-ink/[0.035] p-4`), stacked when a figure cannot fit:
   `habits.detail.spent` "Spent so far" (all of this habit's receipts, `ink`) and `habits.hero.saved` (`moneyIn`
   above 0). Underneath: `habits.detail.tally` "{bought} bought · {skipped} skipped" (13pt `muted`).
4. **Receipts.** `ChargeSection` with `receipts.detail.history` *(existing)* "Receipts from {store}", newest first.
   Status line = the source label; rows open `/receipt/[id]`; a free account sees 90 days plus `HistoryNotice`.
   Empty: `habits.detail.empty` "No receipts yet. Tap a day you bought it."

**States.** Loading: `SkeletonList rows={4}`. Error: PageState error with Try again. Not found or archived: `goBack()`,
as `receipt/[id]` does. A lapsed account can edit; only creating is gated.

## 6. Edit mode (`/habit-new?id=…`, opens on the Confirm page)

Section 3's Step 3, with these differences:
- **Header.** Title `habits.edit.title` "Edit habit"; close prompt `habits.edit.close` "Cancel editing this habit?".
- **Chrome.** No dots and no topSlot. `root={true}`, so Back pops to the detail page.
- **Starts.** Read-only `habits.starts.weekOf` "Week of {date}" (the Monday, `formatFullDate`).
- **Primary.** `habits.edit.save` "Save changes". Missing hint: `habits.edit.missing` "To save this habit, fill in:
  {fields}."
- **bottomSlot.** Shown only once Price or Paid with differs from the saved value: `habits.edit.futureOnly` "New taps
  use the new price and card. Past receipts keep theirs." (13pt `muted`).
- **Save.** The "Habit updated" toast, then `router.back()`.
- **Delete.** footerSlot `habits.edit.delete` "Delete habit", in the receipts' Delete style (`Trash2` 17, 15pt
  `danger`, `min-h-12`).
  - Dialog: `habits.delete.title` "Delete {name}?", message `habits.delete.message` "Its receipts stay in your
    spending.", with `common.delete` *(existing)*, destructive.
  - Then: `useArchiveHabit`, the "Habit deleted" toast, `router.back()`. The detail page sees the habit is archived
    and steps back again, so the person lands on the dashboard.

## 7. Habit receipts elsewhere

**Rows.** In `transaction-row` (Home Recent, `source/[id]`), `transactions/ledger-row` (Activity) and
`receipts/receipt-row`, when `entry.habit` is set, draw `<HabitIcon iconId color size={40} />` in BrandMark's place.
The name is the merchant (the habit name) and the amount is the receipt's. Sub-lines do not change (Home still says
"Receipt"), and a tap still opens `/receipt/[id]`.

**`receipt/[id]` for a habit receipt.**
- **Mark.** HabitIcon 52, with no `ChangeLogoButton`.
- **Habit link.** Under the card (`mt-3`), a `TextLink` with a chevron: `receipts.detail.fromHabit` "From your habit:
  {name}", opening `/habit/[habit_id]`. For an archived habit, show plain `muted` text instead:
  `receipts.detail.fromDeletedHabit` "From a deleted habit: {name}".
- **History and edit.** The history list is filtered by `habit_id`, not merchant. The pencil still opens
  `/add-receipt?id=`. In dark mode, `HabitIcon` already switches its tint.

## 8. Pro explainer `habits` (`PRO_FEATURES`)

`habits: feature('habits', CalendarCheck, [CircleCheck, PiggyBank, ReceiptText])`

| key | English |
|---|---|
| `pro.habits.example` | "Coffee · 3 days skipped · $15.00 saved" |
| `pro.habits.title` | "See what skipping saves" |
| `pro.habits.subtitle` | "Tap the days you buy it. Skip adds up the days you don't." |
| `pro.habits.a` (CircleCheck) | "One tap records what you spent" |
| `pro.habits.b` (PiggyBank) | "Every day you skip counts as saved" |
| `pro.habits.c` (ReceiptText) | "Counts in your receipts and balance" |

## 9. Habit colours (final, for `src/data/habit-colors.ts`)

- **Fills.** One per colour, for both modes. Caramel, coral and green are slightly darker than the hi-fi samples,
  because white checks on them only reached 2.94, 2.74 and 2.73:1.
- **Dark tints.** Redone. The current ones are 1.05–1.13:1 on the dark card, effectively invisible (violet #2E2840 on
  #2A2634). The new ones are about 1.3:1, matching the light tints on white (1.14–1.21).
- **Ink.** New `ink: {light, dark}` for the coloured sub-line, ≥ 4.6:1 on each mode's card.
- **Both cards.** On the white card, a fill's contrast equals its white-check figure. So every fill clears 3:1 on both
  cards, and that covers the today rings and swatches too.

| id | fill | white check on fill | fill on dark card | tint light | tint dark | ink light | ink dark |
|---|---|---|---|---|---|---|---|
| caramel | #C38449 (was #C8894E) | 3.13 | 4.71 | #F4E8DC | #4D341E | #A4672A | #C38449 |
| coral | #E66E51 (was #F2795B) | 3.13 | 4.71 | #FDE9E3 | #513129 | #C44F33 | #E66E51 |
| green | #2FA573 (was #3DB07D) | 3.11 | 4.74 | #E2F4EA | #214332 | #008656 | #2FA573 |
| blue | #4C7CF3 | 3.83 | 3.85 | #E4ECFD | #2E3A55 | #3F6DE3 | #678EE7 |
| violet | #8B6CE6 | 3.90 | 3.78 | #EDE8FC | #3B3653 | #7F5FD8 | #9782E2 |
| pink | #E2679B | 3.16 | 4.66 | #FBE6EF | #4F2F3B | #C1497F | #E2679B |

## 10. Presets (10: the first 6 show, the last 4 sit behind More)

- **Keys.** `habits.preset.<id>.name` and `.subtitle`. The name is copied into the habit when it is created.
- **Prices.** In the account currency's units (open question 2).
- **Changes from the brief.** Clearer subtitles for breakfast, lunch and rides, and the More four ordered commonest
  first.
- **Add my own.** No default price; its chips are 5 / 10 / 20.

| # | id | name | subtitle | icon | colour | price | chips |
|---|---|---|---|---|---|---|---|
| 1 | coffee | Coffee | Café runs | food-dining/coffee | caramel | 5 | 3 / 5 / 7 |
| 2 | breakfast | Breakfast out | Morning treats | food-dining/breakfast | coral | 10 | 8 / 10 / 15 |
| 3 | lunch | Lunch out | Workday lunches | food-dining/lunch-out | green | 15 | 10 / 15 / 20 |
| 4 | delivery | Food delivery | Takeout apps | food-dining/fast-food | blue | 25 | 15 / 25 / 35 |
| 5 | snacks | Snacks & sweets | Treats on the go | food-dining/snacks-sweets | pink | 4 | 2 / 4 / 6 |
| 6 | rides | Taxi & rides | Cabs & ride apps | transport/taxi-rides | violet | 15 | 10 / 15 / 25 |
| 7 | dinner | Dinner out | Restaurants | food-dining/dinner-out | green | 40 | 30 / 40 / 60 |
| 8 | drinks | Drinks out | Bars & nights out | food-dining/alcohol-nightlife | violet | 20 | 10 / 20 / 30 |
| 9 | shopping | Online shopping | Impulse buys | shopping/online-shopping | blue | 30 | 20 / 30 / 50 |
| 10 | soda | Soft drinks | Sodas & energy drinks | food-dining/soft-drinks | coral | 3 | 2 / 3 / 5 |

## Open questions

1. **First-week credit (Founder).** A habit starts on the Monday of the week it is created. Created on a Thursday,
   Mon–Wed count as skipped straight away ($15.00 saved on a $5 coffee) unless they are back-filled. I kept the
   brief's rule and added the nudge "New · tap the days you bought it". The alternative is to count Saved from the
   creation day while still allowing back-fill.
2. **MXN prices (Priya/Founder).** A "$5 coffee" in pesos is off by roughly 10×. Proposal: multiply the MXN presets
   and chips by 10 (coffee 50, chips 30 / 50 / 70); the other currencies stay as listed.
3. **Editing a habit receipt (Dana/Diego).** In `/add-receipt?id=`, typing a different Store name splits the receipt
   from its habit, and moving it to a day that already has one hits the unique index. Proposal: make Store read-only
   (HabitIcon and name) for habit receipts, and add the hint `habits.receipt.dayTaken` "{name} already has a receipt
   on that day."
4. **Reassurance line (Founder).** Confirm uses the wireframe's "You can change this anytime.", while every other
   final page says "You can edit this later." To keep one voice, drop the new string and the `reassurance` prop.
