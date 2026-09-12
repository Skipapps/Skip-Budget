# Design team log

Newest entry at the bottom. Each entry: date, name, outcome, what changed, open questions.

---

## 2026-09-11 — Priya (Product Design lead)

**Outcome:** Done. Full UI audit of all 54 screens on `almost-done-all-pages`, delivered as a
prioritised list of 10 approvable updates plus 8 runner-ups. No screen code edited. Two findings are
blockers rather than polish: the Pro paywall ships debug output to users, and `insights.tsx` renders
money figures that are wrong when a fetch fails.

**What changed**
- Wrote `.claude/team/design/ui-audit-2026-09-11.md` (full findings, contrast tables, file:line refs).
- No source files touched.
- Audit split by charter: Pia — onboarding, auth, transactions, bills, subscriptions, splits, cards,
  home. Paulo — loans, schedule, savings, insights, settings, appearance, notifications, paywall.

**Top 10, by impact**
1. Four controls hardcode white/`surface` on the accent instead of `onControl` (tab bar, dashboard
   FAB, source FAB, multi-choice chips). Default accent apricot gives a 2.11:1 tab icon beside a
   near-black label in the same pill; the FAB fails on 11 of 12 accents in at least one mode. S
2. `pro.tsx:195-199` prints `[offerings=0 current=none pkgs=0 fetchErr=…]` and raw store errors on
   the revenue screen. Leftover from commits 5343150 / 2409e0b. S — BLOCKER
3. `insights.tsx` reads `isError` on none of its 8 queries; `?? []` fallbacks mean a failed cards
   fetch shows net worth inflated by the user's entire card debt. M — BLOCKER
4. `queries.ts:169` — `useLedger.isError` omits `salary` and `charges`, so those failures are
   invisible on every ledger screen while balances render wrong. S — BLOCKER, data layer (Dmitri)
5. `cards.tsx` — `data?.length === 0` is false when data is undefined, so an error renders a blank
   region with no empty state, no error and no retry. S
6. `ml-13` is not on Tailwind's scale and `spacing` is not extended, so row dividers are dead classes
   on 4 screens (home, bills, subscriptions, source/[id]). Intent was 52pt; use `ml-[52px]`. S
7. Dashboard loading state is the bare word "Loading" while every other list uses `SkeletonList`;
   `home.tsx` also reads no `isError` anywhere. S/M
8. Destructive `#DC2626` is hardcoded in 7 files, is not a token, and fails AA in dark mode
   (3.05:1 on card). Theme's own dark `moneyOut` scores 5.38. Needs a `danger` token. S
9. No shared `SectionHeading`: same element is 15/16/17/19/20/21px across screens — Home 17, Cards 20,
   Insights 19. `<Title>` margins drift mt-1…mt-16. Propose 17px semibold + `Screen` owning the offset. M
10. `hello.tsx:34` calls `router.replace` during render with no `isLoading` guard; returning users
    flash the name form. S

**In good shape, no work:** `loan-schedule.tsx` (best screen in the app — per-row accessibility
labels reading the full payment split), `appearance.tsx` (correct `onColor`, radio roles — the
reference for finding 1), `transactions.tsx` (four states incl. filtered-empty), bills /
subscriptions / receipts / savings / splits, the `ui` primitives, and `palette.ts` + `tone.ts`, which
are the strongest work in the repo. `Switch` is consistent in all 4 uses. Dynamic type is effectively
complete (349 caps vs 119 raw `<Text>`) — I checked this expecting a gap and found none.

**Could not verify:** nothing rendered on device — this is a static read. Contrast figures are
computed with the project's own `contrast()` from `src/lib/tone.ts`, not estimated. Tia should
confirm findings 1 and 8 visually in dark mode on a pale accent.

**Open questions for the Founder**
1. Currency: `$` is hardcoded across 39 files and `mutations.ts:116` says USD-fixed, yet
   `profiles.currency` / `groups.currency` columns exist unused. Ship USD-only or wire them up?
2. Fixing finding 1 makes the focused tab icon and label both near-black on 10 of 12 accents —
   correct, but lighter than the current mock. Confirm before respec.
3. Section heading at 17px changes the weight of the Cards (20px) and Insights (19px) tabs. Approve?
4. `welcome.tsx` "Track / …" copy needs rewriting, not patching — Mia or Pia?
5. A `danger` token shifts the destructive red slightly in light mode too. Acceptable?

**Cross-team:** `expo-glass-effect`, `expo-symbols`, `expo-blur`, `expo-linear-gradient` are
dependencies used in zero source files — for Dmitri/Dilip to confirm before release.

---

## 2026-09-11 — Priya (Product Design lead) — UI refresh specs

**Outcome:** Done. Two specs written and ready to build: a one-page design language for the refresh,
and a full screen spec for a new, more minimal Home dashboard. No screen code edited. Presentation
only — every block in the dashboard spec names the existing variable or hook it reads, and no route,
figure or query changes.

**What changed**
- Wrote `.claude/team/design/design-direction-2026-09-11.md` — spacing scale (4pt, 7 allowed steps),
  four radii (24 hero / 16 card / 12 control / full pill), flat-and-tonal elevation (borders replace
  `shadows.card` and `shadows.raised`; `shadows.floating` survives on the FAB and tab bar only), one
  `SectionHeading` at 17px, number scale (40/34/28 hero, 20 block, 15 row, 13 caption), accent used
  only on hero/FAB/tab pill/progress/PRO/selected, lucide at `strokeWidth` 1.8 (2 for chevrons),
  one list-row style with a `ml-[52px]` divider, pill buttons, dark-mode rules, and an explicit
  do-not-touch list (`src/api`, `src/lib` hooks, stores, supabase, ios, palette maths, money maths).
- Wrote `.claude/team/design/dashboard-redesign-2026-09-11.md` — text wireframe, nine blocks each
  with data source, component, loading/empty/error, full copy and a11y labels, plus the Pia/Paulo
  polish split at a maximum of three changes per screen.
- No source files touched.

**The one structural change:** the horizontal carousel of illustrated square `AmountTile`s is
replaced by a single flat card of five full-width destination rows (tonal lucide icon well, label,
right-aligned amount). A carousel hides three of five destinations behind a gesture and spends a
150×150 box on a drawing to show one figure; a list shows all five with their amounts in one
comparable column and matches the transaction rows below it. `tile_order` still drives the order via
the same `orderByIds` memo, so `tiles.tsx` needs no logic change. New component:
`src/components/dashboard/destination-list.tsx`, exporting `DESTINATION_ICONS` so the Arrange screen
can use the same glyphs. Icon names verified against the installed lucide-react-native 1.33.0:
CalendarDays, ReceiptText, Repeat, Landmark, Users.

**Kept exactly as-is:** header, hero "Left this month" with `RollingNumber`, income/expenses, all five
destinations with the PRO rule for the two calculators when not pro, Insights entry, GettingStarted,
date selector with Recent/Coming up, pull-to-refresh, FAB.

**Audit quick wins folded in:** `onControl` on the FAB, tab bar, source FAB and chips; `ml-13` →
`ml-[52px]` on four screens plus `settings-row`'s `ml-8`; dashboard "Loading" → `SkeletonList rows={3}`
plus the first `isError` branches Home has ever had; `danger` token (Paulo); shared `SectionHeading`
(Pia, lands first).

**Could not verify:** nothing rendered — this is a spec pass, no Simulator check. The new figures I
introduce are presentational only; no money maths is restated anywhere in either document. Checked
https://docs.expo.dev/versions/v57.0.0/ SDK module list: the refresh needs no new Expo module, and
does not adopt `expo-blur` / `expo-glass-effect` / `expo-linear-gradient`, which remain installed and
unused.

**Open questions for the Founder**
1. `Button` to `rounded-full` changes the primary button on every screen at once — approve?
2. `SectionHeading` at 17px lightens Cards (20px) and Insights (19px) — approve?
3. Dashboard illustrations move off Home to empty states/onboarding — gone, or shrunk into the icon wells?
4. Section caption "5 categories" → "This month" — keep the count instead?
5. The `danger` token shifts the destructive red slightly in light mode too — acceptable?

---

## 2026-09-11 — Paulo (Product Designer) — refresh applied to the money screens

**Outcome:** Done. Both blockers on my screens are fixed, the `danger` token exists and is used
everywhere the hardcoded red was, and the polish pass landed on eleven screens at no more than three
changes each. `npx tsc --noEmit` and `npx expo lint` are both clean. Presentation only — no figure,
hook, route or money calculation changed.

**What changed**
- `src/app/pro.tsx` — BLOCKER: the `[offerings=… fetchErr=…]` line and the raw `error.message` are
  gone from the paywall. One `storeNote` maps the three real causes (no billing in this build /
  store unreachable / store has no products yet) to copy a reader can act on; the raw reason is kept
  as `devNote` behind `__DEV__`. Polish: feature rows get lucide glyphs in tonal wells instead of
  emoji, tick is a lucide `Check`, plan and feature cards `rounded-[14px]` → `rounded-[16px]`.
  `src/api/pro.ts` untouched.
- `src/app/insights.tsx` — BLOCKER: aggregates `isError` from the seven queries that expose one and
  returns `PageState` (error art, "We could not load your insights", "Try again" → refetch of all
  eight) before any figure renders. Local `Heading` now wraps `SectionHeading`; all ten
  `rounded-[14px]` → `rounded-[16px]`; Prompt action is a pill.
- `src/theme/palette.ts` — `danger` added to both ramps and to `Tokens`/`buildTokens`. Light
  `#B0453A` (5.59:1 on card, 5.32 on surface), dark `#F08A86` (6.09 on card, 7.26 on surface),
  measured with the project's own `contrast()`. Replaces `#DC2626`, which scored 3.05 on the dark card.
- `tailwind.config.js` — `danger: rgb(var(--color-danger) / <alpha-value>)`.
- `src/global.css` — `--color-danger` in the first-frame seed.
- `src/components/settings/settings-row.tsx` — `colors.danger` / `text-danger`; icon moves into a
  40×40 `rounded-[12px] bg-ink/5` well; divider `ml-8` → `ml-[52px]`, which now lines up because the
  leading slot is 40pt.
- `src/components/settings/settings-section.tsx` — 20px bold title → `SectionHeading`.
- `src/app/(tabs)/settings.tsx` — "Preference" → "Preferences". Nothing else.
- `src/app/add-bill.tsx`, `add-receipt.tsx`, `add-expense.tsx`, `add-account.tsx`, `add-card.tsx`,
  `add-subscription.tsx` — colour swap only: `Trash2` takes `colors.danger` at `strokeWidth` 1.8 and
  the delete label beside it goes `text-red-600` → `text-danger`. Three of them needed a
  `useColors()` call added in the form component; no other line touched.
- `src/app/loan-calculator.tsx` — cards `rounded-[10px]` → `rounded-[16px]`, `mt-7` onto the scale,
  and "Interest paid" moves off `text-accent-ink` onto `text-money-out`. No maths, formatting or
  rounding touched; the payment stays at 40px (see deviations).
- `src/app/loan-schedule.tsx` — one line: the ProportionBar card to `rounded-[16px] bg-card`, `mt-6`.
  Every `accessibilityLabel` verbatim.
- `src/app/savings.tsx` — hero card radius/spacing; month row type to the row scale (15px); the
  amount moves off the accent onto `text-money-in` / `text-money-out`.
- `src/app/savings-month.tsx` — card radius/spacing, secondary actions to pills, `text-danger`.
- `src/app/save-loan.tsx` — summary card `rounded-[16px] bg-card`, row figure 16 → 15px, `text-danger`.
- `src/app/salary.tsx` — total and source cards `rounded-[16px] bg-card`, total figure 24px bold →
  20px semibold (block scale), the small controls and the add-source row to pills, `text-danger`.
- `src/app/appearance.tsx` — spacing onto the scale (`gap-3.5`/`mb-2.5`) and the title offset only.
  Radii were already correct; nothing restructured.
- `src/app/notifications.tsx` — title offset, "Clear all" pill spacing, `strokeWidth` to 1.8.
- `src/app/reminders.tsx` — group heading 18px bold → 17px semibold, `hitSlop={8}` on the 32pt remove
  control and on the clock pill, footnote card to `rounded-[16px]`, strokes to 1.8.
- `src/app/pro-feature.tsx` — radii to the scale, pill dismiss, lucide `Check` for the ✓ glyph.
- `src/components/ui/select-field.tsx`, `src/components/calculators/slider-row.tsx` — inputs to
  `rounded-[12px]`; the slider's value control becomes a pill with `hitSlop={8}`.
- `src/components/transactions/filter-sheet.tsx`, `src/components/receipts/receipt-filter-sheet.tsx`
  — the missing `maxFontSizeMultiplier` caps.

**Deviations from the spec, and why**
1. The loan calculator's monthly payment stays at 40px. The polish table said "result figure to 20px
   semibold per the number scale", but the direction doc's own scale keeps the hero figure at
   40/34/28 and 20px is the *block* figure. That number is the entire output of the screen; shrinking
   it to the size of a row label would be a regression. Priya to confirm.
2. `loan-schedule`'s year heading is left as its own element rather than `SectionHeading`. It is
   already 17px semibold, and `SectionHeading` holds its caption to one line — the year total there
   is long enough to squeeze "2026" to "20…" at large text. No visual gain, real downside.
3. `reminders.tsx`'s group heading keeps inline classes for the same reason: it has an icon beside
   the title and `SectionHeading` owns the whole row.
4. I swapped the `text-red-600` label sitting next to each `#DC2626` trash icon as well. Leaving it
   would have put two different reds on the same control. The other 20 `text-red-600` uses across the
   app are untouched and still mode-blind — a separate sweep.
5. `insights.tsx` aggregates seven flags, not eight: `useSourceBalances` returns
   `{ balances, isSettled, refetch }` and exposes no `isError`. Its cards/bills/subs/charges failures
   are covered by `useLedger` + `useCards`, but a failure of `payments` or `bank_accounts` alone is
   still invisible. That is a data-layer change (Dmitri), like `queries.ts:169`.
6. Settings rows were not wrapped in a single card container as §8 suggests for grouped rows: the
   Profile section has a `TextField` and a Save button among its rows, and boxing those looked wrong.
   Rows stay flat on the page with 52pt-inset dividers.

**Could not verify**
- Nothing rendered on device or Simulator by me; all contrast figures are computed with the
  project's own `contrast()` from `src/lib/tone.ts`, not eyeballed. Tia should check `text-danger`
  and the settings icon wells in dark mode on plum and slate.
- **Metro needs a restart for `text-danger` to appear.** `tailwind.config.js` changed, and NativeWind
  compiles the CSS at bundle time — hot reload alone will leave the delete labels uncoloured.
- I could not test the paywall's error copy against a live store failure; the three branches are
  reachable but I only reasoned about which one fires when.

**Open questions**
1. The purchase/restore path still puts a raw store `message` on screen (`pro.tsx`, the `message`
   state). The audit only covered `prices.error`, so I left it. Map it too?
2. `pro-feature.tsx`'s secondary line reads "or $19.99/yr · Not now" — a price welded to a dismiss
   action. Copy, so Mia rather than me, but it is on a paywall and worth a look for App Store review.
3. Deviation 1 above: loan calculator hero figure, 40px or 20px?

---

## 2026-09-11 — Pia (Product Designer) — dashboard build

**Outcome:** Done. The new Home dashboard and the shared foundations are in code and bundling
cleanly through the running Metro instance. `npx tsc --noEmit` and `npx expo lint` are both clean on
everything I introduced. Presentation only: no hook, query, route, figure, `tile_order` handling or
PRO rule changed.

**What changed**

Foundations (landed first, as Priya ordered)
- `src/components/ui/typography.tsx` — new `SectionHeading` (17px semibold + optional 13px caption,
  baseline-aligned row).
- `src/components/ui/button.tsx` — `rounded-[10px]` → `rounded-full`, app-wide pill.
- `src/components/ui/screen.tsx` — `RefreshControl tintColor="#9A9A9A"` → `tintColor={colors.muted}`.

Dashboard
- `src/components/dashboard/destination-list.tsx` — NEW. Five full-width rows replacing the
  `AmountTile` carousel; exports `DESTINATION_ICONS` (CalendarDays / ReceiptText / Repeat / Landmark
  / Users, all verified in lucide-react-native 1.33.0) and `DESTINATION_FALLBACK_ICON`. Loading
  skeleton per amount, error "—" plus "Amounts are unavailable right now." + Try again, inline PRO
  pill, `ml-[52px]` dividers, per-row value-bearing a11y labels.
- `src/app/(tabs)/home.tsx` — carousel, `GUTTER`, `AmountTile`, `useArtwork` and the absolute PRO
  badge gone; `DestinationList`, `QuickActions`, `SectionHeading`, `SkeletonList`, `TextLink` in;
  first `isError` reads on `month`, `recent`, `upcoming`; "Loading" → `SkeletonList rows={3}`;
  `ml-13` → `ml-[52px]`; the `h-px bg-line` rule above the date selector replaced by `mt-8`.
- `src/components/dashboard/balance-summary.tsx` — hero flattened to `rounded-[24px]`, no shadow,
  and **Income / Expenses moved inside its bottom edge** (prototype pattern) instead of the separate
  pair of cards; `error` prop renders "—" and "We could not load this month."; loading skeleton;
  progressbar role with `accessibilityValue`.
- `src/components/dashboard/quick-actions.tsx` — NEW. Four one-tap logging shortcuts under the hero
  (Receipt, Bill, Subscription, Salary) in `bg-accent/10` circles, existing routes only.
- `src/components/dashboard/insight-banner.tsx` — 76pt artwork → 40pt icon well with `TrendingUp`,
  flat + `border-line`, title 17 → 15px medium.
- `src/components/dashboard/getting-started-card.tsx` — `rounded-[16px]`, shadow dropped,
  `SectionHeading`, dead `border-line-strong` fixed.
- `src/components/dashboard/date-selector.tsx` — `rounded-[12px]`, pill steppers, `hitSlop={8}`.
- `src/components/dashboard/add-button.tsx` — `colors.surface` → `colors.onControl`, stroke 2.5 → 2.
- `src/components/dashboard/dashboard-header.tsx` — bell `rounded-[12px]`.

Audit fixes and everyday polish
- `src/components/navigation/skip-tab-bar.tsx` — focused icon `#FFFFFF` → `colors.onControl`.
- `src/components/ui/multi-choice-chips.tsx` — check `#FFFFFF` → `colors.onControl`, stroke 1.8.
- `src/app/source/[id].tsx` — FAB plus `#FFFFFF` → `colors.onControl`; `ml-[52px]`; `SectionHeading`;
  summary card `rounded-[16px]`.
- `src/app/(tabs)/cards.tsx` — headings 20px → `SectionHeading`; `EmptyNote` → `ListNote` with the
  missing error branch (`data?.length === 0` is false when data is undefined — blank region today)
  and a Try again; action pill flattened.
- `src/app/bills.tsx`, `src/app/subscriptions.tsx` — `ml-13` → `ml-[52px]`, tiles flattened to
  border-only, stroke 1.8.
- `src/app/(tabs)/transactions.tsx` — period stepper to `rounded-[12px]` / pill steppers / hitSlop;
  filter button `rounded-[12px]`; filter badge `text-ink` → `text-on-control` on the accent.
- `src/app/receipts.tsx` — filter button `rounded-[12px]`, stroke 1.8, hairline rule dropped.
- `src/app/splits.tsx` — "Groups" → `SectionHeading`; GroupCard flattened, 21/22px → 17/20px;
  friends row to the shared row style.
- `src/app/tiles.tsx` — artwork preview → `DESTINATION_ICONS`, `rounded-[12px]` steppers, subtitle
  corrected (it claimed "the first two are the ones you see without scrolling", untrue now).
- `src/app/hello.tsx` — `router.replace` during render → `<Redirect href="/home" />` plus a skeleton
  while `profile.isLoading`, so returning users no longer flash the name form.
- `text-red-600` → `text-danger` in 18 files, now that Paulo's token has landed.
- Radius sweep to the four-step scale in `src/components/ui/*` and `src/app/add-*.tsx`
  (`rounded-[8px]`/`[10px]` → `[12px]`, dialog shells → `[16px]`); `amount-tile.tsx` and
  `action-pill.tsx` flattened; `source-tiles.tsx` `border-black/10` → `border-line` (invisible in
  dark mode).

**Where I deviated from the spec, and why**
1. **Hero carries Income and Expenses** (prototype pattern) rather than the separate merged card in
   block 3. One card for one sentence — income, less expenses, leaves this. The two figures are in
   `text-on-control`, not `moneyIn`/`moneyOut`: that pair is tuned to be read on the page, not on the
   control surface. The labels and the minus sign carry the direction, and `formatCurrency` output is
   untouched. Copy stays "Income" / "Expenses" — our figures are recorded, not planned, so the
   prototype's "Monthly income / Planned & recorded" would have misdescribed them.
2. **Quick-action row adopted**, with the four things people record. The accent budget therefore went
   to that row and the Insights well is neutral `bg-ink/5` instead of `bg-accent/10` (block 6.2).
3. **Cards empty/error uses a compact `ListNote`, not `PageState`** — two 220pt illustrations stacked
   on one scrolling tab was worse than the problem. The error branch, which was the actual bug, is in.
4. Tool-row a11y reads "Opens the tool." rather than "Opens the calculator." — "Split manager. Opens
   the calculator." was plainly wrong.
5. Bill / subscription / receipt leading marks 44 → 40pt, so the shared `ml-[52px]` divider lands
   exactly at the text column on every screen.
6. Did **not** make `Screen` own the `mt-2` title offset. That touches every screen's `<Title>` at
   once, including Paulo's open files. Left for a later pass.
7. `welcome.tsx` untouched: its "Track /…" copy needs rewriting, not patching — for Mia.

**Could not verify:** nothing was seen rendered — I have no eyes on the Simulator. What I do have:
`npx tsc --noEmit` clean, `npx expo lint` clean, and every touched screen requested from the running
Metro (`localhost:8081`) as a module bundle, all HTTP 200, with the new copy and `ml-[52px]` present
in the compiled Home module. Dark mode, the twelve accents, and the contrast of the two figures
inside the hero still need a human look — Tia. No money maths was touched anywhere.

**Open questions**
1. Fourth quick action is "Salary" → `/salary`, while the other three are add-forms. Right choice, or
   should it be Insights / Savings? (Priya, Founder)
2. `tiles.tsx` is still titled "Dashboard tiles" and there are no tiles any more. Rename — Mia?
3. The hero's Income / Expenses are no longer green/red. Confirm that reads right on device before
   this is locked. (Tia, Founder)

---

## 2026-09-12 — Priya (Product Design lead) — stepped add flows + pills sweep

**Outcome:** Done. Two specs written for the Founder's number-pad direction: a shared stepped "add"
shell (Amount → Details → When) applied across the add flows, and an app-wide pill rule. Spec only —
no screen code touched, no mutation or saved record affected.

**What changed**
- NEW `.claude/team/design/add-flows-2026-09-12.md` — `StepFlow` shell (title, 3-dot indicator with a
  40×10 current pill, back behaviour, one full-width pill per step); Step 1 Amount (per-flow question
  line, 28px `$` + 64px figure, 3×4 tonal keypad at `bg-ink/5`/`rounded-[16px]`/no border, 64pt
  tiles, `tap()` per key, the existing decimal/backspace rules kept verbatim, new 9-digit whole-part
  display cap, `percent` variant for the loan rate); Step 2 Details (field-by-field map per flow,
  `SegmentedControl` → pill `ChoiceChips`, `SelectField` gains `variant="pill"`); Step 3 When (new
  `InlineCalendar` — month grid, today ring, filled selected pill, chevrons, "Today" pill — folded
  back into `date-picker.tsx` so modal and step share one grid; `time-picker.tsx` dial kept, AM/PM
  becomes a pill toggle; reminder and repeat pills). Plus states, dark-mode tokens, accessibility,
  build order split Pia/Paulo.
- NEW `.claude/team/design/pills-sweep-2026-09-12.md` — pill anatomy (chip 40, primary 52/`min-h-16`,
  radius full, `bg-ink/5` unselected, `bg-control` + `text-on-control` selected, border **off**,
  optional 1.8 icon), the replace/do-not-replace list, and a screen-by-screen checklist split Pia
  (everyday) / Paulo (loans, insights, settings, paywall, appearance, notifications, reminders).
- Both files open with the hard constraint: presentation and screen flow only; the flows may be split
  into steps but call the same mutation with the same fields at the end.

**Decisions made**
1. Per-flow shape: 3 steps for add-expense, add-bill (behind its existing category chooser),
   add-subscription, add-receipt, add-card, add-account; 2 steps for add-group; single screen for
   add-member, salary, save-loan, loan-calculator.
2. `add-bill`'s category chooser stays a pre-step outside the dots — it pre-fills the bill name, so it
   has to run first, and folding it in would make bills a four-dot flow.
3. **Deviation from the brief:** `add-member` stays a single screen. It is three parallel ways to add
   somebody, each complete on its own; stepping it would bury the share link that is the answer for
   the empty list which opens the screen most of the time. It gets the pills sweep only.
4. `amount-pad.tsx` survives as a modal for secondary amounts (exact shares, expected income, rate);
   the keypad and figure are extracted to `flow/amount-keypad.tsx` + `flow/amount-figure.tsx` so the
   step and the modal cannot drift. Its props are unchanged, so its six call sites compile untouched.
5. The keypad's 9-digit cap applies to appended keystrokes only — a longer existing value is always
   displayed in full. No money is ever truncated, rounded or pre-filled.
6. Existing validation copy kept verbatim in all eleven flows; a `handleSave` failure for a field on
   an earlier step jumps back to that step rather than reporting an invisible field.
7. Borders come off keypad tiles, chips and pill select fields inside these flows, against the
   direction doc's default — separation there is the tonal fill. Cards elsewhere keep their borders.

**Could not verify**
- Nothing rendered. No Simulator, no device, no screenshot of the new shapes. Every contrast claim in
  both specs is an instruction to check with `contrast()` from `src/lib/tone.ts`, not a measurement I
  made.
- `bg-ink/5` tiles on `#1B181F` at minimum brightness is the one visual risk I cannot settle on paper.
  Tia should look at it before the keypad is signed off.
- The Founder's screenshot itself — I worked from Pia's element-by-element description in
  `.claude/team/design/reference/founder-numberpad-reference.md`, not the image.

**Open questions**
1. `add-member` as a single screen rather than the 2 steps the brief asked for — accept? (Founder)
2. `salary.tsx` keeps its multi-source list screen. Should **adding a new source from the empty
   state** open the 3-step flow instead? (Founder)
3. The question line is left-aligned, not centred as in the screenshot. Confirm. (Founder)
4. `Haptics.selectionAsync()` is the idiomatic keypad tick and exists in SDK 57, but adding a
   `selection()` export touches `src/lib/haptics.ts`, which is outside the spec's scope. Spec says use
   the existing `tap()`. Allow the one-line addition? (CEO)
5. Long-press backspace to clear the amount — deliberately out of this pass. Wanted? (Founder)
6. `segmented-control.tsx` is deleted by the sweep — I checked, its only importers are `add-expense`,
   `add-account` and `add-subscription`. Flagging it only so Dmitri knows a shared component leaves.

---

## 2026-09-12 — Paulo (Product Designer) — pills sweep on the money screens

**Outcome:** Done. Every control on my checklist in `pills-sweep-2026-09-12.md` is now a pill of the
right anatomy, applied either through a shared primitive or with the spec's classes inline where the
screen owned its own markup. `npx tsc --noEmit` clean; `npx expo lint` clean on my files (the only
two errors in the repo are prettier nits in Pia's in-flight `src/components/flow/inline-calendar.tsx`).
Presentation only — no figure, rounding, hook, query, route or mutation touched.

**What changed**
- `src/app/insights.tsx` — the `rounded-full border` full-width CTA inside `Prompt` (the audit's
  `:688`) is now an `ActionPill` with a leading `ArrowRight`, sized to its label and `self-start`.
  The range `ChoiceChips` row inherits Pia's restyle. Nothing else.
- `src/app/loan-calculator.tsx` — both date `SelectField`s take `variant="pill"`. The rate pad
  already passed `unit="percent"` and the amount pad already passes a plain currency value, so the
  add-flows keypad treatment arrives through `AmountPad` with no call-site change and no new keypad.
  Sliders left alone (a slider is not a pill). No maths, rate, term or schedule line touched.
- `src/components/calculators/slider-row.tsx` — the value readout becomes a proper §2.3 pill:
  `min-h-10 rounded-full bg-ink/5`, border off, `hitSlop={8}` kept.
- `src/components/calculators/schedule-card.tsx` — `rounded-[10px]` → `rounded-[16px]`. It is a card
  and was the last off-scale radius on the calculator.
- `src/app/salary.tsx` — Amount and Last-payday `SelectField`s take `variant="pill"`; the dashed
  "Add salary source" row becomes a full-width tonal pill (`min-h-14 rounded-full bg-ink/5`, no
  border, label to 14 medium). Frequency `ChoiceChips` and the accounts `MultiChoiceChips` inherit
  Pia's restyle.
- `src/app/savings-month.tsx` — "Back to Skip's figure" loses its border for `bg-ink/5` /
  `active:bg-ink/10`. "Leave this month out" stays a borderless destructive text action.
- `src/app/notifications.tsx` — "Clear all" is a §2.3 pill: 40 tall, `bg-ink/5`, no border, icon 18
  at 1.8 in `colors.ink`, label 14 medium, `hitSlop={{ top: 4, bottom: 4 }}` so the target clears 44.
- `src/app/reminders.tsx` — `LEAD_OPTIONS` chips move to §2.1 metrics (40 tall, `px-4`, 14px,
  `bg-ink/5` unselected / `bg-control` selected, border off, vertical hitSlop). The "at 9:00 am"
  trigger becomes a §2.3 pill with the clock at 18. `LEAD_OPTIONS` itself untouched — it is data.
  The 32pt remove control keeps its `hitSlop={8}`.
- `src/app/(tabs)/settings.tsx`, `src/app/appearance.tsx` — the two `bg-control` save pills
  normalised to ActionPill metrics: `min-h-10`, `px-4`, 14 medium, `active:bg-control-pressed`,
  vertical hitSlop. They stay filled, because they are the affirmative action, not a chooser.
- `src/app/pro.tsx` — the local underlined `FooterLink` is deleted; Restore purchases / Terms /
  Privacy are `TextLink variant="subtle"`, wrapped in a `flex-wrap` row. Restore grows 12px → 14px
  with a 44pt target, which is better for App Store review, not worse. Plan cards stay cards, the
  "2 MONTHS FREE" badge stays a badge, the purchase button is unchanged, price and term copy
  untouched.
- Untouched by design: `loan-schedule.tsx` (no inline action exists; table, figures and per-row a11y
  labels off limits), `savings.tsx` (rows stay rows, no range dropdown on it), `save-loan.tsx`
  (its only sweep item is `SourceTiles`, which is shared), `pro-feature.tsx` (the dismiss line is
  already a borderless text action, and its price-plus-dismiss copy is Mia's open question),
  `src/components/settings/*` (rows stay rows).

**Inline pills that should later swap to a shared component**
1. `notifications.tsx` "Clear all" — would be `ActionPill` except that `ActionPill` derives its
   `accessibilityLabel` from `label`, and this control must read "Clear all notices". An optional
   `accessibilityLabel` prop on `ActionPill` would let it swap.
2. `salary.tsx` "Add salary source" and `savings-month.tsx` "Back to Skip's figure" — full-width
   secondary pills; `ActionPill` is inline-width only. Either a `block` variant or a second
   component would take both.
3. `reminders.tsx` lead-time chips — the values come from `LEAD_OPTIONS` (`{value: number}`), and
   `ChoiceChips` is generic over `T extends string`. They are a `ChoiceChips` the day it accepts a
   non-string value, or the day a `numeric` overload exists. I did not touch the data to force it.
4. `slider-row.tsx` readout — an `ActionPill` with no icon and a 18px semibold label; it needs an
   icon-less variant first.

**Could not verify**
- Nothing seen rendered. What I have: `tsc` clean, lint clean on my files, and every one of my
  thirteen screens requested from the running Metro as its own module bundle — all HTTP 200, with
  the new classes present in the compiled output. Dark mode and the `bg-ink/5` unselected chip
  against `bg-card` on apricot, butter, plum and slate still need Tia's eyes; the pills sweep §6
  calls that the tightest contrast pair in the app.
- The reminders row is now taller: 40pt chips plus a 40pt time pill wrap onto more lines on a narrow
  screen than the old 28pt ones did. That is what §2.1 asks for, but it is the one layout change a
  human should confirm.

**Skipped, as instructed**
- `src/components/ui/date-picker.tsx:55` — `text-on-control/70` → `/85` (Dmitri's one-liner). Still
  `/70`; the file is Pia's this pass.
- `src/components/ui/source-tiles.tsx` → pills (sweep §3, the item on `save-loan.tsx`). Shared
  component, five of its six call sites are Pia's flows, so it is not mine to change mid-pass.
- `SegmentedControl` retirement and the `choice-chips` / `multi-choice-chips` / `action-pill`
  restyles — Pia's, and my screens pick them up for free.

**Open questions**
1. `pro.tsx`'s footer links lost their underline when they became `TextLink`. At 14px muted, do
   Terms and Privacy still read as links? If not, `TextLink` wants an `underline` variant rather
   than each paywall re-inventing one. (Priya, Tia)
2. `save-loan.tsx` gets nothing this pass until `SourceTiles` becomes pills. Should I take that
   component, or does it stay with whoever lands the add flows? (CEO)
3. The two `bg-control` save pills (settings, appearance) are filled, not `bg-ink/5`. The sweep says
   "ActionPill metrics", which I read as size and type only — confirm the fill stays. (Priya)
4. Still open from 2026-09-11 and unanswered: the loan calculator's monthly payment at 40px vs 20px.
   It is untouched and still 40px.

---

## 2026-09-12 — Pia (Product Designer) — stepped add flows + shared pills, built

**Outcome:** Done. All seven add flows are stepped and running on the Simulator's Metro, the shared
pill primitives and the new `flow/` components are in, and the pills checklist for the everyday
screens is applied. `npx tsc --noEmit`, `npx expo lint` and `npx jest --ci` (258 tests, 18 suites)
are all clean. Presentation and screen flow only — every mutation is called with the same fields and
the same values as before, and no money is rounded, defaulted or re-derived anywhere.

**What changed**

New — `src/components/flow/`
- `step-flow.tsx` — the shell: back (44pt), optically centred 17px title, 3-dot indicator with the
  40×10 current pill (`progressbar`, "Step 2 of 3"), optional centred 20px question line that takes
  VoiceOver focus on every step change, `headerSlot`, full-width pill primary, `error` slot,
  `footerSlot`. Renders its own `Screen`, so gutter/safe-area/keyboard handling stays in one place.
- `amount-keypad.tsx` — the 12 tonal tiles (`h-[64px] rounded-[16px] bg-ink/5`, no border) plus
  `applyAmountKey`, the press rules lifted verbatim from `amount-pad.tsx` and given the new 9-digit
  whole-part cap. The cap refuses *keystrokes* only; a longer loaded figure is never truncated.
- `amount-figure.tsx` — 28px affix + 64px figure, `displayAmount` grouping, `$`/`%` variants, one
  money-shaped a11y label ("Amount, $12.50") on a polite live region.
- `amount-step.tsx` — figure, spacer, pad.
- `inline-calendar.tsx` — `InlineCalendar` (chevron paging, pressable month header opening a
  month/year grid, Today pill) and `DayGrid`, the grid the modal now shares. Today = ring, selected =
  fill, `value` accepts null so a form with no date yet shows nothing selected.
- `amount-keypad.test.ts` — 7 cases pinning the keystroke rules, including "never truncates a longer
  figure that was loaded rather than typed".

Shared pills (props and callbacks unchanged everywhere)
- `choice-chips.tsx` — 40pt, `px-4`, `rounded-full`, `bg-ink/5` → `bg-control`, **border off**, 14px,
  `hitSlop` 4, `radiogroup`/`radio` roles, `selection()` haptic.
- `multi-choice-chips.tsx` — same anatomy, `checkbox` role, check stays `onControl` at 1.8.
- `segmented-control.tsx` — **kept, not deleted**: rebuilt as the §2.4 toggle pill (one `bg-ink/5`
  track, filled half, 44pt halves). Its three old call sites moved to `ChoiceChips`; the clock's
  AM/PM now uses it, so the primitive earns its keep instead of leaving.
- `action-pill.tsx` — `bg-ink/5`, no border, 40pt.
- `select-field.tsx` — new `variant?: 'field' | 'pill'`, default `field`, so nothing outside the
  flows moves.
- `range-dropdown.tsx` — trigger to 40pt tonal pill, sheet `rounded-[14px]` → `[16px]`.
- `source-tiles.tsx` — 47.5%-wide bordered tiles → wrapping pills with a 24pt colour dot that keeps
  its own colour when selected.
- `amount-pad.tsx` — rebuilt on `AmountFigure`/`AmountKeypad`; **props untouched**, six call sites
  compile as they were.
- `date-picker.tsx` — day grid is now `DayGrid`; footer to pills (`OK` filled). Props unchanged.
- `time-picker.tsx` — AM/PM stack → the toggle pill on its own row, hour/minute fields to
  `rounded-[16px]`, footer to pills. Dial, `MINUTE_STEP` and its haptics untouched.
- `reminder-field.tsx` — the "at 9:00 AM" trigger to a 40pt tonal pill.
- `src/lib/haptics.ts` — the one permitted line: `selection()` wrapping `Haptics.selectionAsync()`
  (confirmed present in SDK 57's haptics docs). Used by keys, chips, day cells.

Flows
- `add-expense.tsx` — 3 steps (How much did you spend? / what-for, paid by, split, who / When was
  it?). Payer list and exact-share pads kept; split `SegmentedControl` → `ChoiceChips`.
- `add-receipt.tsx` — 3 steps; Scan/Upload are two `ActionPill`s in the step-1 `headerSlot`, above the
  question, with the reading spinner and the scan report beside them. `CaptureButton` deleted.
- `add-bill.tsx` — category chooser (now titled "What is this bill for?") then 3 steps; the
  calculator survives as an `ActionPill` on step 1; "More setup" no longer exists to collapse.
- `add-subscription.tsx` — 3 steps; both `SegmentedControl`s → `ChoiceChips`.
- `add-card.tsx` — 3 steps; the live `PaymentCard` heads step 2 and reads the balance typed on step 1;
  `NetworkPicker` and `ColorPicker` untouched; `CollapsibleSection` gone.
- `add-account.tsx` — 3 steps; type `SegmentedControl` → `ChoiceChips`; expected income keeps
  `AmountPad` + calculator behind a pill `SelectField`; the salary-source side effect is untouched.
- `add-group.tsx` — 2 steps (name + icon / simplify-debts).
- `add-member.tsx` — single screen, pills only: "Add a friend by code" → `ActionPill`, friend check
  circles tonal.
- Editing opens on step 2 in every flow, and the edit-loading state is the shell with skeletons —
  never a `$0` figure for a record that has not landed.
- A `handleSave` check for a field on an earlier step now jumps back to that step and shows the
  message there; every validation string is verbatim.

Pills checklist (everyday screens)
- `(tabs)/transactions.tsx` — period band → `rounded-full bg-ink/5`; filter button → 44pt tonal circle.
- `receipts.tsx` — filter button → 44pt tonal circle.
- The four `*-filter-sheet.tsx` — close button, Reset and "Clear date" to `rounded-full`; their facet
  chips were already `MultiChoiceChips` and inherit the new anatomy.
- `friends.tsx`, `add-member.tsx` — bordered round controls → tonal.
- `settle-up.tsx` — the two payer pickers → pills, the member list → `rounded-[16px] bg-ink/5`.
- `group-settings.tsx` — "Share code" → `ActionPill`, "Leave group" → `Button variant="outline"` with
  its icon, switch card to `rounded-[16px]`.
- `split-group.tsx`, `tour.tsx` — stray `rounded-[10px]`/`[14px]` cards onto the four-step scale.

**Deviations from the spec, and why**
1. **The question line and figure are centred** on every step, per the Founder's decision, overriding
   §2.2's left-aligned note. Step 3's question is centred too, for consistency within a flow.
2. **`segmented-control.tsx` was not deleted.** The sweep retires it as a *chooser*, and all three of
   those call sites moved; rebuilt as the toggle pill it is the right primitive for AM/PM, which
   would otherwise be two chips pretending to be one control.
3. **Every step scrolls** (`ScrollView` with `flexGrow: 1`), including the keypad step. Nothing
   scrolls until content exceeds the viewport, which is exactly the large-Dynamic-Type case where a
   pinned keypad would clip.
4. **`InlineCalendar` accepts `value={null}`.** Three flows have a genuinely optional or unset date
   (bill start, subscription renewal, last pay day); drawing today as selected would be the screen
   answering its own question and would make "Pick the first due date." look like a lie.
5. `add-card`'s title "Adding New credit card" → "Add a card", `add-account`'s "Adding New bank
   account" → "Add an account", and the bill category screen's "Add a bill" → "What is this bill
   for?" (the spec names that one). The two card/account titles read as placeholders; flagging as
   copy for Mia to confirm rather than assuming.
6. `MONTHS_FULL` / `WEEKDAYS_FULL` are local to `inline-calendar.tsx`. They are read aloud and read
   at a glance, never stored or printed into a record, and `src/lib/date.ts` is out of scope.
7. `add-bill`'s step-3 question is "When does it start?" when the recurrence is a period and "When is
   it due?" otherwise, mirroring the existing From / First due date labels.
8. Primary labels follow §1.6 ("Save expense"), so add-expense loses `Add to {group name}`. The group
   name now sits under the calendar on step 3 as "Adding to {group}." so the context is not lost.

**Could not verify**
- I have no eyes on the Simulator. What I have: `tsc`, `expo lint`, `prettier --check` and
  `jest --ci` all clean, and every touched screen requested from the running Metro on
  `localhost:8081` as a module bundle — all HTTP 200, with the new copy present in the compiled
  add-expense and add-receipt modules.
- Dark mode, and `bg-ink/5` tiles on `#1B181F` at minimum brightness, still need a human look (Tia).
  Same for the four accents where `onControl` flips. No contrast figure in this pass was measured by
  me.
- `findNodeHandle` + `AccessibilityInfo.setAccessibilityFocus` for the per-step focus move is present
  in RN 0.86 and compiles, but I could not confirm VoiceOver actually lands on the question line.
- The scan report's "Check the store, date and amount below — it will save either way." now sits on
  step 1 while two of those fields are on later steps. Still true of the flow; worth Mia's eye.

**Open questions**
1. `add-card` / `add-account` titles — confirm "Add a card" / "Add an account"? (Mia, Founder)
2. Editing is linear: opening an edit on step 2 means Continue → Save changes, two taps to save a
   one-field correction. Accept, or should the last-step primary appear on every step when editing?
   (Priya, Founder)
3. Delete sits under the primary on **every** step when editing, to keep it as reachable as it is
   today. Confirm, or restrict it to the last step? (Priya)
4. `source-tiles.tsx` is now a wrapping pill row rather than a two-column grid — it is on Paulo's
   `save-loan.tsx` too. Worth a look before it is locked. (Paulo, Tia)

---

## 2026-09-12 — Pia (Product Designer) — stepped add flows finished + everyday pills

**Outcome:** Done. All seven stepped flows are built, audited field-by-field against their `HEAD`
versions, and every mutation payload is byte-identical to today. `npx tsc --noEmit` clean,
`npx expo lint` clean, `npx prettier --check src/**` clean, `npx jest --ci` 266 passing (19 suites,
up from 258/18). Every touched module requested from the live Metro as its own bundle — all HTTP 200.

**What the interrupted session had already landed** (verified, not re-done): `src/components/flow/`
in full (`amount-figure`, `amount-keypad` + its test, `amount-step`, `inline-calendar`, `step-flow`);
`amount-pad.tsx` rebuilt on the extracted figure and keypad with its six-call-site props unchanged;
`date-picker.tsx` taking `DayGrid` from `inline-calendar`; the §2.1/§2.3 restyles of `choice-chips`,
`multi-choice-chips`, `action-pill`, `range-dropdown`, `reminder-field`, `select-field`'s
`variant="pill"`, `source-tiles` → pills; the `selection()` one-liner in `src/lib/haptics.ts`; and —
further than the brief assumed — **all seven flows already rewired**: add-expense, add-receipt,
add-bill, add-subscription, add-card, add-account, add-group, plus add-member's pills. The prettier
complaints in `inline-calendar.tsx` were already gone.

**Audit result on the seven flows.** I diffed every `values`/`mutateAsync` block against
`git show HEAD:…` and walked every `useState` in both versions. All identical: expense
(`groupId/paidBy/amount/description/shares/spentOn/splitMode`), receipt (10 fields incl.
`source` and `image_path: null`), bill (`BillValues`, incl. the `period` → `recurrence` mapping and
`starts_on`/`next_due_on` both from `startDate`), subscription (incl. `next_renewal_on` still
optional), card (incl. `balance_as_of` and `bill_due_day: dueDate.getDate()`), account (incl. the
salary-source side effect and `setSalaryAccounts`), group. No field dropped, none defaulted, no money
re-derived. Validation copy is verbatim; a check for an earlier step jumps back to it; the save error
sits above the primary button, which returns to its own label and stays pressable as the retry.

**What I changed**
- `src/app/add-expense.tsx` — the one real gap the audit found. It read `editing` out of
  `useGroupExpenses` with no wait, so opening an edit before that query resolved produced a blank
  **create** form that would have saved a *second* expense — and, now that step 0 is a keypad, a `$0`
  figure for a record still loading, which spec §5.1 refuses. Split into a loader plus a keyed
  `ExpenseForm`, the pattern the other five already use: skeleton shell while `members` or (when
  editing) `expenses` are loading, then remount on the record. Also fixes new expenses opening with
  nobody ticked when members had not landed. Payload untouched.
- `src/components/ui/segmented-control.tsx` → `src/components/ui/toggle-pill.tsx` — the sweep retires
  `SegmentedControl`; its last importer is the clock's AM/PM, which is precisely sweep §2.4's toggle
  pill. Renamed the file and the export rather than deleting a component the spec also asks for.
  `TimePicker` is the only call site.
- `src/components/ui/time-picker.tsx` — AM/PM now the `TogglePill` track; dropped the `tap()` in
  `setPeriod`, which was firing a second haptic on top of the toggle's own `selection()`.
- `src/app/(tabs)/cards.tsx` — the two header actions were still an inline `border border-line
  bg-card` pill; now `ActionPill`. Dropped the `useColors` import it no longer needs.
- `src/app/bill-plans.tsx`, `src/app/subscription-plans.tsx` — the bills and subscriptions filter
  buttons (they live here, not on `bills.tsx`/`subscriptions.tsx`): `min-h-12 w-12 rounded-[10px]
  border` → 44 circle `bg-ink/5`, stroke 1.8, count badge untouched.
- `src/app/source/[id].tsx` — edit control to a `bg-ink/5` circle, stroke 1.9 → 1.8.
- `src/app/tiles.tsx` — "Original order" to §2.3 metrics (40 tall, `bg-ink/5`, icon 18 at 1.8),
  keeping its fuller `accessibilityLabel`.
- `src/app/friends.tsx` — code card and the "Add your name first" notice `rounded-[10px]` →
  `rounded-[16px]`. Rows stay rows; "Send request" stays a `Button` (§3: the screen's own action).
- `src/app/hello.tsx` — "Skip for now" `rounded-[10px]` Pressable → `TextLink variant="subtle"`.
- `src/components/ui/text-link.tsx` — new optional `underline` prop, default off.
- `src/app/pro.tsx` — **only** change: Terms and Privacy take `underline`. Restore deliberately does
  not: it is an action, not a document link, and App Store review looks for the two legal ones.
- `src/components/ui/date-picker.tsx` — `text-on-control/70` → `/85` (Dmitri's contrast one-liner;
  Paulo left it because the file was mine this pass).
- `src/components/flow/step-flow.tsx` — corrected the `scrollable` doc comment (see deviation 2).
- NEW `src/components/flow/amount-figure.test.tsx` — 8 tests. `displayAmount` never rounds, pads or
  completes a draft, groups only the whole part, keeps a trailing point, and shows a figure longer
  than the keypad cap in full; the figure's a11y label reads as money (`"Amount, $1,234.50"`) and as
  a rate in the percent variant. No existing assertion weakened.

**Deviations, and why**
1. `SegmentedControl` renamed rather than deleted. The pills sweep §3 says delete it once its three
   importers move; they have. But §2.4 then asks for a toggle pill for AM/PM, which is the same
   component. Deleting one file to write an identical one is churn. The name no longer lies.
2. The amount step stays scrollable. `step-flow.tsx`'s own comment said the keypad step must not
   scroll. The pad's type never scales, so the step normally fits exactly and does not scroll — but
   the question line does scale, and on a 4.7" screen at the largest type the difference is a
   Continue button you can reach versus one clipped off the bottom. A page that can bounce is a
   smaller price than a page that hides its only action. The prop is kept as the escape hatch.
3. The four filter sheets' "Reset" stays an inline outline pill beside `Apply` rather than becoming
   `ActionPill`. Sweep §3 puts a screen's own action on `Button variant="outline"`, and that is the
   shape it already has (`min-h-16`, `rounded-full`, `border-control`). Swapping to the component
   itself is a tidy-up, not a fix.
4. `friends.tsx` "Add your name first" stays a card, not a pill — sweep §4.1: a full-width pill reads
   as a button you cannot press, and this one is two lines of explanation.
5. `CollapsibleSection` is now dead: `add-card` and `add-account` were its only importers and both
   are stepped. Left in the tree — removing a shared component is Dmitri's call, flagged here the way
   Priya flagged `segmented-control`.

**Could not verify**
- **Nothing seen rendered.** No Simulator eyes. What I have is tsc/lint/prettier/jest clean and every
  touched module served by the running Metro at HTTP 200.
- `npx expo lint` caches into `.expo/cache/eslint` and served me stale results twice — a clean run
  needs `rm -rf .expo/cache/eslint` first. Worth knowing: earlier "clean" reports in this log may
  have been cached. Every gate above was run against a cleared cache.
- Contrast unchecked by eye: `bg-ink/5` keypad tiles and unselected chips on `bg-card` are still the
  tightest pair in the app (sweep §6), and the new `underline` on pro's Terms/Privacy at 14px muted
  is exactly what Tia was asked to judge.
- The stepped flows were not walked on device, so step-to-step focus movement
  (`setAccessibilityFocus` on the question line) and the keypad's feel under a thumb are unproven.

**Open questions**
1. `pro.tsx`: Terms and Privacy are underlined, Restore is not — deliberate, but confirm that reads
   right rather than looking like two of three links are broken. (Tia, Priya)
2. `CollapsibleSection` is dead code. Delete it, or is something planned for it? (Dmitri, CEO)
3. add-expense now waits for `useGroupMembers` before the form mounts, so the group screen's "Add
   expense" shows a skeleton for a beat on a cold cache where it used to show an empty form. Right
   trade? I think yes — the old behaviour could save a duplicate expense. (Priya)
4. Still unanswered from this morning: `add-member` as a single screen, and the loan calculator's
   40px vs 20px payment figure. Both untouched. (Founder)

---

## 2026-09-12 — Priya (Product Design lead) — consistency review of the final state + open design questions closed

**Outcome:** Done, read-only. Reviewed every screen the developers touched after my specs
(`loan-calculator`, `reminders`, `cards`, `insights`, `add-bill`, `add-account`, `savings-month`,
`settle-up`, `group-settings`, `auth`/`hello`, `step-flow`, the new `switch-control`, `screen`'s
`startAtEnd`, `date-picker`/`inline-calendar`) against `design-direction-2026-09-11.md` and the two
09-12 specs, and closed all fifteen open design questions with a recommendation each. The work holds
the direction well: the error copy is one voice across fourteen `PageState`s, `text-red-600` and
`ml-13` are gone from the tree, the dividers are 52pt everywhere, and nothing in the fix batches
reintroduced a hardcoded accent foreground. Seventeen concrete deviations remain, all small, six of
them worth doing before the Founder's phone install. No screen code edited.

**Deviations** (file, one-line fix, owner) — full list in my report to the CEO. The six that matter
before the install: `welcome.tsx`'s orphan "Track" subtitle (first screen on a fresh install, and its
copy has never been rewritten); the Home FAB overlaying the last row of the Getting started card and
repeating quick action 1 (`home.tsx:155`); Transactions opening scrolled to the bottom with the
period control, totals card, chart and search all off screen; "Dashboard tiles" naming a thing that
no longer exists (`tiles.tsx:73`, `(tabs)/settings.tsx:306`); the receipts push body, free to change
only while `20260912100001_receipt_reminder.sql` is unapplied; and `NOTHING_UPDATED`
(`src/api/mutations.ts:26`), which tells a profile save and a reminder toggle to "open it again from
the list" when neither has a list. The rest — the title offset drift (mt-1/2/4/6/10 across nine
screens), the 1.9/2.2/2.4/2.6/3 icon strokes on the splits screens, the retired `[10px]`/`[8px]`
radii still inside `brand-field`, `category-picker`, `icon-picker` and `card-face`, the loan
calculator's nine unlabelled inputs, `step-flow.tsx:150`'s off-scale `mt-10`, `settings-row`'s
`bg-line/70` divider, `tiles.tsx`'s `mb-2.5 px-3.5 py-3` rows and Cards' "Select Card" heading — is a
polish pass for Pia/Paulo, not a gate.

**Two questions closed with measurements rather than taste**, using the project's own `contrast()`:
- Hero Income/Expenses stay `text-on-control`. `moneyIn`/`moneyOut` score **1.50–4.08:1** on the
  twelve accent fills — every accent fails AA in at least one mode, butter's 4.08 is the best case.
  Green and red are tuned for the page, not for the control surface. No change.
- The `/85` label alpha inside the hero is right: worst case **4.72:1** (taupe), all twelve pass AA.
  The old `/70` scores 3.67 (taupe), 4.12 (rose), 4.27 (lavender), 4.39 (coral) — four failures.
  Dmitri's one-liner was correct and is now applied in `date-picker.tsx` too.

**Decisions, in one line each:** keep Salary as quick action #4 (fix its a11y hint, which promises an
add form); drop the FAB from Home only; Transactions opens at the top, Receipts/Bills/Subscriptions/
source keep `startAtEnd`, sticky headers deferred; accept `SwitchControl` losing the thumb drag;
keep "Interest rate" and keep the APR line on its ≥0.005 rule; keep Terms/Privacy underlined with
Restore plain; rewrite `welcome.tsx`; rename to "Dashboard order"; keep uppercase AM/PM; append the
calculator's stub sentence to `BASIS_FOOTNOTES.monthly`; add the missing `actual/360` chip (defer);
receipts push body becomes a statement, not a question; `NOTHING_UPDATED` splits in two. Also, still
unanswered from 09-11: the loan calculator's payment **stays 40px** (it is the hero figure, the block
scale is for summary lines), and `add-member` as a single screen is accepted.

**Could not verify:** nothing rendered by me. The contrast figures are computed from `palette.ts`'s
own accent values with `tone.ts`'s `contrast()`; the layout deviations are read from source and from
Tia's five screenshots. I did not see the stepped flows, the switches or the Reminders receipts card
on a device — Tia's walk is the only eyes any of this has had, and her bugs 1 and 4 are engineering,
not design.

**Open questions for the CEO/Founder**
1. The paywall's `__DEV__` debug line (`pro.tsx:235`) is correctly gated, but Tia saw it because a
   Metro build has `__DEV__` true. If the Founder's phone install is a Debug configuration it will
   show there too — Release build, or cut the line entirely.
2. The title-offset sweep (`<Title>` owning `mt-2`) touches ~20 screens at once and was deferred on
   09-11 for exactly that reason. Do it now while the whole branch is already uncommitted, or leave it?
3. `actual/360` as a fourth convention chip: a loan filed with that basis renders on the schedule and
   can never be re-selected in the calculator. It is unreachable from today's UI, so I deferred it —
   confirm that is acceptable for the install.

## 2026-09-12 — Paulo (Product Designer) — loan calculator sectioning + three one-line fixes

**Outcome:** Done. The loan calculator's nine controls are now three announced groups, the monthly
footnote on the schedule matches the calculator's own sentence, and the two one-liners are applied.
`npm run check` does **not** exit 0, but every failure is in files owned by the agents working in
parallel, not in mine.

**What changed**
- `src/app/loan-calculator.tsx`: added `SectionHeading` to the typography import and three headings —
  "The loan" above the amount/rate/term sliders, "Dates" above Money received + First payment, and
  "Overpayments and fees" with `caption="Optional"` above Extra each month / One-off overpayment /
  Overpayment lands / Fees paid upfront. The one `mt-6 gap-5` View that held dates and optional money
  together is now two Views, so the heading sits with its own fields; group top margins moved to the
  heading (`mb-4 mt-8`), which keeps the same rhythm as the rest of the app (`settings-section`,
  `insights`). The overpayment savings card gained the title "If you overpay", set in the same
  `font-poppins-semibold text-[15px] text-ink` / `maxFontSizeMultiplier={1.3}` as `ScheduleCard`'s
  card title. No input, chip, figure, default, handler or prop passed to `/save-loan` or
  `/loan-schedule` was touched, and the hero payment is still 40px.
- One deviation from the brief, spacing only: the "How interest is charged" block now sits under the
  "Overpayments and fees" heading, and at `mt-6` it read as a fifth optional field — the basis is not
  optional and moves every figure on the page. Raised to `mt-8` so it detaches as its own block. It
  was not reordered; nothing else about it changed.
- `src/app/loan-schedule.tsx`: `BASIS_FOOTNOTES.monthly` now ends "…so February costs the same as
  March. Any odd days before the first payment are charged on top, by the day." — the calculator's
  sentence verbatim, closing Priya's 09-12 decision.
- `src/components/settings/settings-row.tsx:115`: divider `bg-line/70` → `bg-line/60`.
- `src/components/ui/switch-control.tsx`: `thumbColor="#FFFFFF"` kept, with the comment "The iOS
  platform thumb, white in both light and dark mode." above it.

**Gates:** `rm -rf .expo/cache/eslint` then `npm run check` — `tsc --noEmit` clean; lint fails with
three `prettier/prettier` errors in `(tabs)/home.tsx:151`, `(tabs)/transactions.tsx:161` and
`dashboard/quick-actions.tsx:43`; `npm test` 472/475 with `reminders.test.tsx`,
`quick-actions.test.tsx` and `cards.test.tsx` failing. None of those files import or are imported by
my four, and all of them are being edited right now by Pia/Diego/Dana. My four pass `eslint` and
`prettier --check` individually, and `settings-row.test.tsx`, `switch-control.test.tsx` and
`loan.test.ts` all pass. Nothing committed.

**Could not verify:** not rendered on a device or simulator — Metro is live but I did not look at the
screen, so the heading rhythm and the "If you overpay" title are read from source only.

**Open questions**
1. The basis chips really belong under "The loan", not after the optional group. Moving that block up
   (between the Term slider and "Dates") is a pure reorder with no prop change — worth doing before
   the install, or leave the `mt-8` mitigation?
2. "Overpayments and fees" groups four fields, but a closing fee is not an overpayment. If the group
   ever grows, split it into "Overpayments" and "Fees".
3. The gate cannot go green from inside my four files. Someone has to re-run `npm run check` once
   the parallel batch lands.

---

## 2026-09-12 — Pia (Product Designer) — Priya's must-fix batch + the Title offset sweep

**Outcome:** Done. All eight must-fix/cheap items applied, plus the deferrable ninth (the `<Title>`
offset sweep). `npm run check` exits 0 against a cleared `.expo/cache/eslint`; Metro serves every
touched module at 200. Nothing under `src/api`, `src/lib`, `supabase`, `ios` or `app.json` touched,
and no file owned by Paulo, Diego or Dana was edited by hand. Nothing committed.

**What changed**
- `src/app/welcome.tsx` — the orphan "Track" `Subtitle` is gone and both feature rows are rewritten
  to Priya's copy: "Track spending, bills, subscriptions and card balances — all in one place." and
  "No bank login, ever. You decide what Skip knows, and nothing else." Button is "Get started".
  Each row keeps one `<Strong>` (the closing phrase, then the opening sentence) so the pair still
  has the emphasis the layout was drawn around; the words themselves are exactly as specified.
- `src/app/(tabs)/home.tsx` — `floating={<AddButton …/>}` and its import removed. **Grep result:
  `src/components/dashboard/add-button.tsx` now has no importers anywhere.** `source/[id].tsx`
  builds its own floating `Pressable`, so it never used it. File left in the tree as instructed —
  deleting a component is Dmitri's call (same status as `CollapsibleSection`, `SegmentedControl`).
- `src/app/(tabs)/transactions.tsx` — `startAtEnd` removed; the page opens at the top with the
  period chips, totals, chart and search visible. Row order is unchanged (still oldest-first).
- "Dashboard tiles" → "Dashboard order" in `tiles.tsx:74` and the settings row title
  (`(tabs)/settings.tsx:306`). Subtitle untouched; nothing else in that file touched by hand.
- `src/components/flow/step-flow.tsx` — question line `mt-10` → `mt-8`.
- `src/components/dashboard/quick-actions.tsx` — Salary hint "Add your salary" → "Your salary and
  where it lands" (it promised an add form that screen does not have).
  `quick-actions.test.tsx` asserted the old string; updated.
- `src/app/(tabs)/cards.tsx` — `SectionHeader` "Select Card" → "Cards".
  `src/__tests__/app/cards.test.tsx` asserted the old string twice; updated.
- `src/app/tiles.tsx` row — `mb-2.5 … px-3.5 py-3` → `mb-3 … px-4 py-3.5`.
- **Title offset sweep.** `src/components/ui/typography.tsx`: `Title` now owns `mt-2`, with a new
  `flush` prop to drop it. The offset had to be a prop rather than a class the caller overrides for
  the reason already written in that file about `align` — NativeWind will not reliably let a passed
  `mt-6` beat a built-in `mt-2`, and `cn()` is a plain join with no tailwind-merge. 38 screens had
  their per-screen `mt-1/2/4/5/6/10` stripped. Six headings that are not the top of a page take
  `flush`: the five row headers that sit beside an action pill (`receipts`, `splits`, `bill-plans`,
  `subscription-plans`, `source/[id]`) and `split-group`'s group name; plus `contact`'s "Sent"
  (inside a centred `gap-2` block) and `pro`'s "You have Skip Pro" (`flush` + its own `mt-5` under
  the crown badge), which would otherwise have drifted 8 and 12pt.

**Deviations, and why**
1. Three screens put their Title directly under artwork — `welcome` (`mt-4`), `auth` (`mt-6`),
   `pro-feature` (`mt-6`). Priya's list says strip `mt-4/6/10`, so they are now `mt-2` like every
   other page. That is a real 8–16pt tightening under an illustration and it is the one part of
   this pass I would most want eyes on. If it reads cramped, the fix is `flush` plus the old class
   on those three, not a change to the default.
2. `reminders.tsx` (Dana/Paulo) keeps its `mt-1`, and `add-bill`, `loan-calculator`,
   `loan-schedule` keep their `mt-2`, per the do-not-touch list. The three `mt-2`s are now exact
   duplicates of the default and render identically. `reminders`' `mt-1` is the only live conflict
   in the tree: it resolves to 4 or 8pt depending on how NativeWind orders the two rules, and both
   values are acceptable — but it should be stripped whenever that file is next open.

**Could not verify**
- Nothing seen rendered. No Simulator. Gates are tsc/lint/prettier/jest clean plus Metro 200s.
- I ran `npx prettier --write src/app src/components` while Dana, Paulo and Diego had files open in
  the same directories. It only reformats, never rewrites content, but a write that landed inside
  another agent's read-modify-write could in principle have cost them a keystroke. One jest run
  mid-pass showed `add-bill.test.tsx` failing on a missing `useFocusEffect` mock that was present
  seconds later — a race with a teammate, not a fault. Full suite is green now.
- The `flush` judgement calls (which headings are "not the top of a page") were made from source,
  not from a screenshot.

**Open questions**
1. Deviation 1 above: welcome/auth/pro-feature titles now sit 8pt under their artwork. Keep, or
   give those three `flush` + their old offset? (Priya, Tia)
2. `add-button.tsx` is now dead code, like `CollapsibleSection` and the renamed
   `SegmentedControl`. Three orphans is a tidy-up worth one commit. (Dmitri, CEO)
3. `reminders.tsx:246`'s `mt-1` is the last un-swept title offset. Whoever next owns that file
   should delete the class. (Paulo/Dana)

---

## 2026-09-12 — Pia (Product Designer)

**Outcome**
Fixed: the hero amount figure no longer asks iOS to size itself. `AmountFigure` and the calculator
pad's figure now pick a font size from the display string, so a step remounted with a value renders
exactly as a fresh one does. `npm run check` exits 0 (518 tests, no lint warnings). Not seen on a
device — the CEO verifies on the Simulator.

**What changed**
- `src/components/flow/amount-figure.tsx` — `adjustsFontSizeToFit` and `minimumFontScale` gone,
  `shrink` gone from the number, size chosen by `amountFigureBand(display)` (exported for tests).
  Bands, by glyph count of the grouped string: **≤7 → 64px/76**, **8–10 → 48/58**, **11–14 → 36/44**,
  **15+ → 28/34**. The $ and % scale with the number (28/21/16/12) and their `marginTop` is
  `0.345 × (size − affixSize)` — Poppins' ascender 1.05em less its cap 0.705em — which reproduces
  today's `mt-3` at 64/28 to within half a point and holds the caps level at every other size.
- `src/components/ui/calculator-pad.tsx` — same bug, same shape ($ at a fixed size beside a
  shrink-to-fit number), and it opens as a modal over a field that already holds a value, which is
  the mount-with-text case. Bands `≤7 → 48px`, `≤10 → 40`, `≤14 → 32`, `≤18 → 26`, `19+ → 20`,
  affix at half and `affixTop` by the same rule (48/24 → 8pt, the `mt-2` it has today). Exported
  `calculatorFigureBand`.
- `src/components/flow/amount-figure.test.tsx` — seven new rendered cases: each band edge, the
  over-cap figure, the $ and % proportions, and the Founder's case both ways (render `''` then
  rerender `'3000'`, and back), asserting `fontSize` off the rendered style.
- `src/components/ui/calculator-pad.test.tsx` (new) — band edges plus a render of the pad opened
  with `value="3000"` asserting 48px and no `adjustsFontSizeToFit`.

**How the bands were chosen (not by eye)**
Parsed `hmtx` out of `Poppins_700Bold.ttf` in `node_modules`: unitsPerEm 1000, digits are *not*
tabular — widest is "4" at 0.677em, narrowest "1" at 0.376 — comma 0.287, point 0.282, $ 0.658,
cap height 0.705, ascender 1.05. Each band's worst-case string (all 4s) was checked against the
narrowest screen the app supports: iOS deployment target is 16.4, so the smallest is a 375pt SE,
less `Screen`'s `px-6` = 327pt. Widest case in any band is 14 glyphs at 36px = 309pt. Nothing
shrinks, so nothing needs to.

`affixTop` is arithmetic, not taste: RN only applies its centring baseline offset when the line
height asked for is *taller* than the font's own (`RCTAttributedTextUtils.mm` returns early
otherwise), and every band here is shorter, so cap-top offset is `0.345 × fontSize`. Both existing
figures — `mt-3` at 64/28 and `mt-2` at 48/24 — land on cap-level alignment under that rule, which
is presumably how they were tuned by eye.

**Checked and deliberately left alone**
The other 16 `adjustsFontSizeToFit` uses. The Founder's symptom needs a fixed-size affix as a
sibling of a shrink-to-fit number; the rest (`bills`, `subscriptions`, `savings`, `salary`,
`loan-calculator`, `split-group`, `friends`, `insights` ×3, `amount-tile`, `ledger-summary`,
`card-face`, `balance-summary`:217, `button`, `friend-request-popup`) are single Texts filling
their own block at 20–40px, where the worst case is a figure a little smaller than it needs to be,
never a broken one. Taking shrink-to-fit off those without a band table would risk ellipsising real
money in a 26px slot, which is worse than the thing being fixed. `balance-summary`'s 40px hero
already does exactly this — `digits > 12 ? 28 : digits > 10 ? 34 : 40` — and needs nothing.

**Could not verify**
Nothing seen rendered. The Metro dev bundle lazy-loads routes, so a 200 from `entry.bundle` does
not prove these two modules transformed; Fast Refresh will carry them to the Simulator. The glyph
widths are measured, but the fit was computed rather than photographed.

**Open questions**
1. At the 36px band the "$" is 16px. That is the right proportion, but a nine-figure amount is the
   one case where the currency mark could read as an afterthought. Worth a look on device. (Tia)
2. The calculator pad has no digit cap, so past ~18 digits its figure ellipsises rather than
   shrinking further. Real money never gets there and `Number` goes exponential before it does, but
   if that bothers anyone the answer is a cap on the pad, not another band. (Priya)
3. `AmountFigure` and the calculator pad now hold two band tables tuned to two different hero
   sizes. They are each documented against the other; if a third figure ever needs this, it should
   become one helper that takes a base size. (Dmitri)
