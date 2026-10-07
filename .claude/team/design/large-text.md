# Large text: nothing hidden, one size per group

Date: 2026-10-06 · Author: Priya (Design lead) · Build: Dmitri's team (tab bar: Dana) · Walk: Tia
Read against HEAD of the `logo-service` worktree. While I worked, an uncommitted change in the same
tree moved the typeface from Poppins to Montserrat (`src/theme/fonts.ts`, with `font-poppins-*`
renamed to `font-app-*`). The rules do not depend on the face; where a measurement does, both
figures are given. Presentation only: no string, figure, route or data changes. **No copy
changes.** Every word stays as written. Only size and layout move.

## 0. What the Founder saw, and why

- **Quick add.** Each label has its own `adjustsFontSizeToFit minimumFontScale={0.75}`
  (`src/components/dashboard/quick-actions.tsx:64-70`), so only the label that overflows shrinks.
  Measured from the font files' advance widths, "Subscription" needs 75.8pt at 12pt in Poppins
  (HEAD) and 77.2pt in Montserrat (the uncommitted typeface change in this tree). A quarter tile
  leaves 72pt for text at 428pt, 62.5pt at 390pt and 58.75pt at 375pt. So it is already smaller than
  its siblings **at the default text size** on every iPhone, in either face. At 1.3x it needs 98.5pt
  (Poppins) or 100.3pt (Montserrat).
- **Where it goes.** The label is `numberOfLines={1}` and the amount is `shrink-0 min-w-[96px]`
  (`src/components/dashboard/destination-list.tsx:93-143`), so the amount always gets its room first.
  At 428pt and 1.4x the label gets about 133 to 139pt, and "Subscriptions" needs 144 to 146pt.

## 1. The rules

### 1.1 What scales, and how far

**Today.** `src/` has 388 `<Text>` elements. 348 set their own `maxFontSizeMultiplier`, and the
values are chosen one call site at a time: 1.2 (69 uses), 1.3 (151), 1.4 (120), 1.5 (8), 1.6 (3),
and 1.1 and 1.0 once each. 31 set `allowFontScaling={false}`. 9 set neither:
`typography.tsx:121` (`Strong`), `date-picker.tsx:176,190`, `add-bill.tsx:640`, `salary.tsx:513`,
`subscription-plans.tsx:141`, `logo-choices.tsx:172`, and the bill and subscription filter sheets.
Nested ones such as `Strong` inherit their parent's ceiling. The rest grow to 3.57x while the text
around them stops. iOS's largest standard size (XXXL) is 1.353x, so nearly all text
has stopped growing by XXXL, and AX1 to AX5 look the same as XXXL. The same role gets different caps
in different places:
- `SectionHeading` is 1.3 but its caption is 1.2.
- `Title` is 1.4 but the `PageHeader` title is 1.2.
- `Button` is 1.5, `DialogButton` 1.4, and `ActionPill` and the chips 1.2.
- The 13pt muted caption is 1.3 on Subscriptions and 1.4 on Add receipt.

On top of that, 16 files use `adjustsFontSizeToFit` and 80 elements are `numberOfLines={1}`. Those
two habits cause everything the Founder reported.

**Rule: one ceiling per role, defined once** as `TEXT_CAP` in a new `src/theme/text-scale.ts`. The
effective size is design size × min(iOS multiplier, ceiling).

| Role | Used for | Ceiling |
|---|---|---|
| `reading` | `Body`, `Subtitle`, dialog messages, the `FAILURE_MESSAGE` line, field hints, FAQ and legal text | 1.6 |
| `row` | list-row titles, subtitles, dates and amounts; field labels and values; `Button`, `TextLink`, `DialogButton`, `ActionPill` labels | 1.4 |
| `control` | labels in fixed-width tiles, chips, toggles, tab bar, stat labels | 1.3 |
| `heading` | `Title`, `PageHeader` title, `SectionHeading` and its caption | 1.3 |
| `figure` | hero and stat figures | 1.2 |

`allowFontScaling={false}` is allowed **only** for:
- keypad digits (`amount-keypad.tsx`, `calculator-pad.tsx`);
- `RollingNumber` wheels, which are sized by glyph count;
- `InlineCalendar` weekday initials and day numbers;
- the card-face watermark and network mark;
- chart and slider tick labels (`flow-chart.tsx`, `slider-row.tsx`);
- stickers whose words are already in the parent's `accessibilityLabel` (PRO, BEST VALUE, filter counts).

Everything else scales. That includes the "N days left" pill (`balance-summary.tsx:66-73`) and the
Activity range pill (`ledger-summary.tsx:33-38`), which become `control`. An ESLint
`no-restricted-syntax` rule rejects a numeric `maxFontSizeMultiplier` anywhere except
`text-scale.ts`.

### 1.2 Nothing is hidden

Labels, names, amounts, dates and buttons never use an ellipsis, a cutting `numberOfLines`,
`adjustsFontSizeToFit`, `minimumFontScale` or `ellipsizeMode`. The one exception is the live voice
transcript, which may show only its newest lines because the full text is on the next page.

- **(a) Rows grow.** Text in a row wraps at word boundaries and the row gets taller (`min-h-*`, never
  `h-*`). If the **longest single word** of a label does not fit beside the trailing value, the row
  switches to its stacked layout: the label line or lines first, then the value on its own line,
  left-aligned with the label and at the same size. The chevron stays right and centred. **Every row
  in one card switches together.** Web addresses and email addresses are the only text allowed to
  break mid-word.
- **(b) Tiles share one size.** A single word in a fixed-width tile cannot wrap. Every member of the
  group gets one shared size, lowered uniformly until the longest member fits. Labels never shrink one
  at a time.
- **(c) Amounts are whole.** An amount is never truncated, never rounded to fit, and always printed
  with its cents. In rows, amounts follow (a). In tiles and stat pairs, they shrink with their group
  as in (b). A lone hero figure is a group of one. The existing glyph-count steps stay as they are:
  `amount-figure.tsx`, `calculator-pad.tsx`, and `RollingNumber` in `balance-summary.tsx`.
- **(d) Floor, then a new layout.** Shrinking may only take back part of the user's increase. It
  never takes a group below its design size (its size at the default text setting), and never below
  **11pt**. When a group would have to go smaller than that, its layout changes:
  - a row of N tiles becomes 2 columns, then 1 column;
  - a side-by-side pair (stats, dialog buttons, plan name and price) stacks;
  - chips wrap onto more lines, as `ChoiceChips` already does.

  A lone figure has no second layout, so it alone may shrink below its design size, down to 11pt.
- **Also:**
  - `Button` labels wrap to two lines inside `min-h-16` (remove the shrink at `button.tsx:57-63`).
  - Page titles wrap to two lines and the header grows.
  - A page's one action stays in `Screen`'s `footer` (house rule).

### 1.3 What a group is

A group is text that sits side by side, or repeats down one container, in the same role, so the eye
compares it. Members share design size, weight and role, so they render at **one size at every text
setting**. If one member changes, they all change. A group never spans two cards.

1. **Home Quick add**: the four labels (`quick-actions.tsx`).
2. **Home Where it goes**: the label column, the amount column and "Open" (`destination-list.tsx`).
3. **Home balance card**: the Income/Expenses labels form one group, and their figures form another
   (`balance-summary.tsx` `Stat`).
4. **Activity summary**: the Income/Expenses labels and figures (`ledger-summary.tsx` `Stat`).
5. **Cards tab money tiles**: labels, and figures (`AmountTile` pair in `(tabs)/cards.tsx`).
6. **Tab bar labels** (`skip-tab-bar.tsx`, Dana): one shared size and no ellipsis. This rule is the
   only part of this spec that applies to the tab bar.
7. **Chips and segments**:
   - `ChoiceChips`: Appearance (Light/Dark/System), Insights periods, bill and subscription cycles;
   - `MultiChoiceChips` in the four filter sheets;
   - `SourceTiles`, `ReminderField`, `CategoryPicker` and `NetworkPicker`;
   - `TogglePill` in `time-picker.tsx`.
8. **Paywall plan cards**: both plan names, and both prices (`pro.tsx` `PlanCard`).
9. **Dialog button pair** (`confirm-dialog.tsx`).
10. **Key-value rows in one card**:
    - Insights `StandRow` ("Put aside" / "Owed on credit cards");
    - `plan-detail.tsx` rows;
    - one `SettingsSection`'s rows.

### 1.4 VoiceOver, Bold Text, fixed heights

- **VoiceOver.** Size never changes a string or an `accessibilityLabel`. The measuring copies (§2)
  are hidden from accessibility. Stacked layouts keep the reading order: label, then value.
- **Bold Text.** The app font is loaded by family name, and React Native 0.86's iOS text layout has
  no Bold Text path (checked in `RCTAttributedTextUtils.mm`). So **today Bold Text changes nothing
  in the app.** Recommendation (Q3): at launch, load each weight one step heavier under the same
  family names. That happens in `useFonts` in `src/app/_layout.tsx`, or in `APP_FONTS` in
  `src/theme/fonts.ts` in the uncommitted typeface change.
  - 400 loads Medium, 500 loads SemiBold and 600 loads Bold;
  - 700 loads 800 ExtraBold, which ships in both `@expo-google-fonts/poppins` and `/montserrat`.

  expo-font v57 has no unload, so a change made mid-session applies at the next launch. The heavier
  weight widens text by about 2% (Montserrat "Subscription" goes from 77.2pt to 78.4pt), which is
  why groups measure their text instead of guessing.
- **Fixed heights to fix** (from most to least likely to clip):
  - `PageHeader` `h-[52px]` (every page, add-flow headers included) becomes `min-h-[52px]`.
  - `AmountTile`'s `aspect-square`: 84pt of artwork plus the label and figure outgrow a 157pt square
    at 375pt. The tile becomes `min-height` = its width.
  - The `source/[id].tsx:156` floating pill `h-14` becomes `min-h-14`.
  - The `step-flow.tsx:121` question has `numberOfLines={2}`, which goes.
  - `SettingsRow` title and subtitle have `numberOfLines={1}`, which goes.
  - `CardFace` keeps its card ratio, but Tia must confirm that no text touches the edge at 375pt.

  The filter-count badges (`h-5`) hold fixed text and may stay.

## 2. The mechanism: `FitGroup`, built once

**Files.**
- `src/theme/text-scale.ts`, next to `colors.ts` and `shadows.ts`: holds `TEXT_CAP` and
  `MIN_TEXT_SIZE = 11`.
- `src/components/ui/fit-group.tsx`, next to `typography.tsx`: holds `useFitGroup`, `FitGroup` and
  `FitText`.
- `src/components/ui/fit-group.test.tsx`: the tests. It must not go under `src/app`.
- `typography.tsx` takes its ceilings from `TEXT_CAP`.

```tsx
const g = useFitGroup({ mode: 'shrink' | 'switch' }); // -> { scale, fits }
<FitGroup group={g}>
  <FitText id="subscription" role="control" size={12} lineHeight={16}
           className="text-center font-app-medium text-ink">Subscription</FitText>  {/* font-poppins-medium at HEAD */}
</FitGroup>
```

1. **Register.** Each `FitText` draws its visible `Text` in its slot. It also draws a copy in the
   group's measuring layer: absolute, 4000pt wide, `opacity: 0`, `pointerEvents="none"`,
   `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"`, one line, with
   the same family, size and ceiling. The copy's width is the natural width at the current text size
   and font files, so Dynamic Type and Bold Text are already included. The slot width is the member's
   box less its padding.
2. **Compute in `useLayoutEffect`.** Read the host refs with `getBoundingClientRect()`. In RN 0.86
   Fabric, host refs are `ReactNativeElement` (checked in `ReactFabricPublicInstance.js`), and that
   read plus the `setState` that follows land in one commit, so **the first painted frame is already
   right**.
   - **shrink:** `s = min(1, min over members of (slotᵢ − 1) / naturalᵢ)`, rounded down to 0.01.
     `rendered = size × min(fontScale, cap) × s`. `fits` means `s = 1`, or
     `rendered ≥ max(11, size × min(fontScale, 1))`. That way a user who picked a smaller text size
     is never pushed into the fallback. A group of one uses 11pt as its only floor.
   - **switch** (rows, dialog buttons, plan cards): no scaling. `fits` means every natural width
     (for a row: the label's longest word plus the value block) is within its slot.
3. **Apply.** Every member gets `style={{ fontSize: size × s, lineHeight: lineHeight × s }}` plus its
   role ceiling. React Native applies the Dynamic Type factor itself, so all members end at the
   identical size. In `__DEV__`, `FitGroup` throws if members differ in size, line height, family or
   role.
4. **Fall back.** When `fits` is false, the owner renders its next layout and the group measures
   again. The decision is cached by (fontScale, window width, member strings) and only changes when
   one of those changes, so the layout never flip-flops.
5. **Changes on the device.**
   - **Text size:** `RootNavigator` already remounts the Stack on `fontScale` (the
     `fontscale-${fontScale}` key in `src/app/_layout.tsx`), so groups measure fresh on mount. `fontScale` and window width are
     also in the group's dependencies, so the group stays correct without the remount.
   - **Display Zoom:** iOS restarts the phone, so the app opens at the new width.
   - **Rotation:** none on iPhone (`app.json` sets `portrait`). Split View width changes on iPad reach
     the slots and re-run step 2.
   - Layout changes are a reflow, with no animation.
6. **NativeWind.** Members keep weight, colour and alignment in `className`. Size and line height are
   props, never `text-[..]` or `leading-*` on a `FitText`.
7. **Tests.** Jest has no layout, so missing measurements mean `s = 1` and `fits = true`, and
   existing screen tests keep passing. Unit-test the pure `fitScale()` in `fit-group.test.tsx`.

This removes every `adjustsFontSizeToFit` and `minimumFontScale` in the 16 files. Two iOS bugs with
it are already documented in comments (`amount-figure.tsx:33`, `ledger-summary.tsx:95`).

**Adoption order.**
1. **Home Quick add**, shrink mode: a 2×2 grid of wide tiles, `gap-3`, each `min-h-14 px-3` with the
   22pt icon beside the label (`gap-2`), and the same border, fill and radius. In that grid
   "Subscription" fits at 1.3x even at 375pt (100.5pt available; 98.5pt needed in Poppins, 100.3pt in
   Montserrat). With Bold Text it shrinks a little, staying above 12pt. One column comes in only if
   the group still fails.
2. **Home Where it goes**, switch mode: labels wrap, and the card stacks when a word cannot fit.
3. **Balance `Stat`, Activity `LedgerSummary` `Stat`, Cards `AmountTile`**: labels and figures are
   two shrink groups. If they still do not fit, the pair stacks.
4. **Rows:**
   - `transaction-row`, `ledger-row`, `bill-row`, `subscription-row`, `receipt-row`;
   - `settings-row`, the `logo-choices` rows;
   - Insights `StandRow`/`Row`, `plan-detail` rows.
5. **Shared controls:**
   - `PageHeader` and `Button` wrap.
   - `ConfirmDialog` uses switch mode in place of the 12-character guess at `confirm-dialog.tsx:44`.
   - `TogglePill`; `SourceTiles`, whose labels wrap inside the chip; `PlanCard`.
6. **Hero figures** on Insights, Loan calculator, Bills, Subscriptions, Savings and Salary each become
   a group of one. Drop the `StepFlow` question's line limit.
7. **Tab bar** (Dana): the group rule only.

## 3. Acceptance walk (Tia)

**Widths:**
- 375pt: create "iPhone SE (3rd generation)" or "iPhone 13 mini" with `xcrun simctl create`.
- 390pt: "iPhone 14" or "iPhone 16e".
- 428pt: "iPhone 13 Pro Max" or "iPhone 14 Plus", plus the Founder's own 13 Pro Max.

**Text sizes:** Large (default), XXXL, AX1, AX2, AX3, and AX3 with Bold Text on. AX5 on Home only.
VoiceOver at AX3 on Home and in Add bill. Switch sizes with `xcrun simctl ui booted content_size`
and one of:
- `large`
- `extra-extra-extra-large`
- `accessibility-medium` (AX1)
- `accessibility-large` (AX2)
- `accessibility-extra-large` (AX3)

Set Bold Text in Settings › Accessibility › Display & Text Size, then relaunch the app. Reach the Pro
screens with the Fake Pro switch. Under the ceiling table, AX1 to AX3 render the same; a difference
between them means a ceiling was missed, and that is a fail.

**Every screen, every width and every size must pass all of these:**
- **P1:** no "…", no clipped glyph and no word broken mid-word (web addresses excepted).
- **P2:** each group on the screen renders at one size. Compare cap heights on a zoomed screenshot.
- **P3:** every control can be reached, the footer action is visible, and the page scrolls to its end.
- **P4:** fallback layouts appear exactly as listed below.
- **P5:** VoiceOver reads full words, once.
- **P6:** every figure is identical, to the cent, to the default-size figure.

| Screen | Groups to check | Expected at AX3 |
|---|---|---|
| Home | Quick add, Where it goes, Income/Expenses, section heading + caption, Go further, transaction rows | Quick add 2×2 at every width (Q1); Where it goes stacked; stats side by side or stacked, at one size |
| Cards | `AmountTile` labels and figures; card face | tiles taller, nothing past the card edge |
| Activity | month header, Income/Expenses, filter badge, ledger rows | names wrap; amounts whole |
| Settings | row titles and subtitles, Appearance chips, delete-account dialog | "Everything unlocked · manage in the App Store" and the Fake Pro subtitle wrap; dialog buttons stacked |
| Add receipt / bill / subscription / salary | header, question, amount figure, cycle, reminder and "Paid with" chips, calendar, footer button | chips wrap onto more lines; footer stays in view |
| Subscriptions, Bills | hero total, range dropdown, rows, filter sheets | rows stack when a name's word cannot fit |
| Insights | three hero figures, Where you stand rows, period chips, category rows | key-value rows stacked |
| Loan calculator | Monthly payment, slider labels and readouts, schedule card | figure whole, to the cent |
| Change logo | choice rows (name + domain), match header | names wrap; domains may break mid-address |
| Pro paywall | plan names, plan prices, feature rows | each price under its name if needed; both cards alike |

## 4. Founder decisions

1. **Quick add becomes a 2×2 grid on every iPhone, at every text size.** "Subscription" does not fit
   a quarter-width tile at its 12pt design size on any iPhone, even at default text: it needs 75.8pt
   in Poppins or 77.2pt in Montserrat, and the 440pt Pro Max gives 75pt. Home grows by about 32pt. *Recommend yes.* The alternative is a 10pt floor, which we reject.
2. **Ceilings stay at most 1.6x for this pass.** Raising reading text to 2x+, so the App Store
   accessibility label can claim Larger Text, comes later. *Recommend yes; do 2x as a follow-up.*
3. **Honour Bold Text**: one weight heavier everywhere, from the next launch. *Recommend yes.*
