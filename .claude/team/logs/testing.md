# Testing team log

Newest entry at the bottom. Each entry: date, name, outcome, what changed, open questions.

---

## 2026-09-11 — Theo (Tester)

**Outcome:** Done. Quality gates are green on the `almost-done-all-pages` UI refresh: `tsc` clean,
lint clean, 251/251 Jest tests pass (242 baseline + 9 new), and the do-not-touch data layer
(`src/api`, `src/lib`, `src/stores`, `supabase`) is confirmed untouched. Two render test files added
for the new dashboard components. No source files edited, nothing committed.

**Command-by-command**
1. `git status --short` / `git diff --stat` — 74 tracked files modified, 2 new components
   (`destination-list.tsx`, `quick-actions.tsx`), matching Pia/Paulo/Priya's log entries. Untracked
   `.claude/agents/`, `.claude/team/`, `TEAM.md` are agent scaffolding, not app code.
2. `npx tsc --noEmit` — 0 errors.
3. `npx expo lint` — 0 errors, 0 warnings (after I fixed 7 warnings my own new test files introduced;
   see below).
4. `npm run test` (`jest`) baseline, before adding tests: **15 suites / 242 tests, all pass** (all in
   `src/lib/*.test.ts` — this is where the money-maths fixtures live: `loan.test.ts`,
   `card-ledger.test.ts`, `charges.test.ts`, `split.test.ts`, etc.). None of these files are in the
   diff, so no money maths was at risk.
5. `npm run check` cannot be run start-to-finish: `npm run format:check` (`prettier --check .`) exits
   1 on 30 files — all `.claude/**` docs, `TEAM.md`, and **`app.json`**. `app.json` is the only one
   that looks like app config, but `git diff --stat -- app.json` is empty and
   `git status --short -- app.json` shows nothing — it is pre-existing drift, not something this
   refresh touched, and it silently swallows the `test` step because `check` chains with `&&`. Ran
   `npx jest --ci` directly instead to get a real result (see next point). Flagging for whoever owns
   `check`/CI: today it cannot report a pass/fail on tests at all once `format:check` is red.
6. `npx jest --ci` (full suite, after adding tests): **17 suites / 251 tests, all pass.**
7. `git diff --stat -- src/api src/lib src/stores supabase` — **empty.** Confirms no money-maths, hook,
   query or store file changed anywhere in the refresh.
8. Spot-checked the two blockers the design log claims fixed: `pro.tsx` — `offerings=`/`fetchErr=`
   strings are gone; `insights.tsx` — `isError` now aggregates seven queries (ledger, cards, salary,
   savings, subscriptions, groups, categories) and gates rendering. Log's own caveat (misses
   `useSourceBalances`, "eight" was really seven) matches what's in the file.

**Tests added**
- `src/components/dashboard/destination-list.test.tsx` — 4 tests: renders rows in the given order
  (not fixture order, standing in for `tile_order`); PRO pill shows only on the two calculators and
  only when `pro={false}`; skeleton + "amount loading" a11y label per money row while `loading`; "—"
  per money row plus "Amounts are unavailable right now." and a working "Try again" → `onRetry` while
  `error`.
- `src/components/dashboard/quick-actions.test.tsx` — 5 tests: exactly four actions render; each of
  the four (`Receipt`/`Bill`/`Subscription`/`Salary`) calls `onPress` with its real destination
  (`/add-receipt`, `/add-bill`, `/add-subscription`, `/salary`), matching how `home.tsx` wires
  `onPress={(href) => router.push(href)}`.

**Infrastructure notes (no source/config file edited, but worth knowing for the next test author)**
- `@testing-library/react-native` is on v14, whose `render()` is now `async` and must be awaited —
  every existing usage pattern I could find online for older RTL breaks silently here (destructuring
  off the un-awaited return gives an empty object, not an error).
- `lucide-react-native` ships ESM only and is outside jest-expo's default `transformIgnorePatterns`,
  so any component importing it needs `jest.mock('lucide-react-native', ...)` per test file — every
  screen in the app imports it, so every future component test will need this same line.
- `react-native-reanimated`'s own recommended mock (`react-native-reanimated/mock`) is broken in this
  install (4.5.1 with the split-out `react-native-worklets` package): requiring it still pulls in the
  real native module and throws `Cannot read properties of undefined (reading 'loadUnpackers')`
  outside a device. I could not get the official mock to work at all. Worked around it by mocking the
  app's own `Skeleton` leaf component in `destination-list.test.tsx` instead — fine for this test, but
  any future test on a screen that renders `Skeleton`/animated UI needs the same workaround or a real
  fix to the reanimated mock (likely a `moduleNameMapper` entry, which is a config change I did not
  make).
- No jest setup file exists yet, so `useColors`/`useMoneyColor` (real `ThemeProvider`) pull in
  `AsyncStorage` and `expo-system-ui`, which also need mocking. Both tests here mock
  `@/providers/theme-provider` directly instead of wrapping in a real `ThemeProvider`, trading theme
  fidelity for isolation — reasonable for two presentational components with no dark-mode logic of
  their own, but not a pattern for anything that reads `scheme`.

**Not touched:** no non-test source file, no jest/babel/package.json config, nothing committed.

**Open questions**
1. `npm run check` cannot currently reach the test step because `format:check` is red on pre-existing
   files outside this refresh (`app.json` plus agent scaffolding docs). Someone should either fix
   `app.json`'s formatting or scope `format:check`'s globs — right now a green `npm test` is invisible
   behind an unrelated failure.
2. The reanimated mock gap above will hit the very next person who tries to render-test any screen
   that shows a `Skeleton` (most of them, per the design log's `SkeletonList` rollout). Worth a
   deliberate fix (likely `moduleNameMapper` in `package.json`'s jest config) rather than a per-test
   workaround each time — that's a config change, so it needs sign-off, not something I did here.
3. Confirms Pia/Paulo's "presentation only" claim: `src/api`, `src/lib`, `src/stores`, `supabase` all
   show zero diff. Ready for Tara/visual review as far as the automated gates go.

---

## 2026-09-11 — Tia (Tester) — UI refresh walkthrough, `almost-done-all-pages`

**Outcome:** Done. Walked the new dashboard and every reachable screen on iPhone 17 Pro
(CF94A123-74A3-4E85-9606-336F696A984E) plus a quick pass on a smaller device (SkipBudget-SE,
375×667pt). Signed in as Sam, no sign-out, no code edits, no real payment/credentials entered. Found
one reproducible minor visual bug and confirmed Paulo's paywall-debug blocker fix is correctly
`__DEV__`-gated (verified in `src/app/pro.tsx:89,234`, not just by eye). Four sizeable chunks of the
test plan (dark mode, accent switching, Insights, Splits, Loan calculator/schedule) could not be
exercised because those screens are Pro-gated (`useProGate`, pre-existing on this app, not introduced
by this branch — confirmed via `git log -p` on `appearance.tsx`) and the test account is not Pro; I do
not purchase or sign into a Pro account per the house rules.

**Bugs**
1. Minor — Home dashboard: the FAB overlaps the "Subscriptions" row in "Where it goes" at first paint
   (no scroll needed), hiding its amount and part of the row's tap target behind the "+" circle.
   Steps: open Home fresh (or scroll to top) → look at the third destination row. Expected: FAB floats
   clear of list content, or the list reserves bottom clearance the way the last section on the page
   does (`pb-24`). Actual: "+" button sits directly over "Subscriptions … $0.00". This is not a fresh
   regression — the design team's own `dashboard-after-top.png` reference shows the identical overlap
   — but it still reads as broken on device and is worth a deliberate fix (bottom padding on the
   destination-list card, or FAB reposition). Screenshot:
   `.claude/team/testing/screenshots/home-fab-overlaps-subscriptions-row.png`.
2. Low-confidence, not filed as a bug — typing a store name fast into Add receipt's "Store" field once
   showed only "Test Store" instead of "Test Store QA" typed. Only reproduced once; plausibly an
   artifact of the automated typing tool outrunning the live-search field's re-renders rather than a
   real user-facing bug. Flagging for Tara to spot-check manually rather than reporting as a finding.

**What passed**
- Home: hero (flat `rounded-[24px]`, Income/Expenses inside, white-on-control figures per Pia's
  documented deviation), four quick actions (Receipt/Bill/Subscription/Salary) all navigate correctly,
  all five destination rows navigate and their amounts match Bills (-$1,030.00), Receipts (-$17.00)
  and Subscriptions ($0.00) to the cent, PRO pills correctly show on Loan calculator and Split manager
  and correctly gate to the pro-feature screen, Insights row navigates, notification bell and avatar
  open their screens, date selector prev/next and the date-picker modal all work, FAB opens
  `/add-receipt`, pull-to-refresh did not error.
- Bills, Receipts, Subscriptions, Transactions (Week/Month/Year/All + filter sheet), Cards (card
  detail, "Make a payment" amount pad, empty states), Settings ("Preferences" plural, `text-danger` on
  Delete account, 40×40 icon wells), Reminders, Tiles/Arrange (reorder + reset-to-original + save-order
  gating all work, icons match `DESTINATION_ICONS`), Salary, Savings (empty state), add-receipt/
  add-bill/add-subscription forms (AmountPad digits/delete/Done all work, `Delete bill` correctly
  `text-danger` with a matching icon), and the pro-feature lock screens all rendered cleanly with no
  clipped text, no untinted icons, and no missing states that I could find.
- Confirmed in source (not just on screen): `pro.tsx`'s raw store-debug line only renders behind
  `__DEV__` (line 234), so it will not ship to real users; the line visible in this dev-client build is
  expected.

**Could not test**
- Dark mode and accent switching (test plan §3): `appearance.tsx` requires Pro (`useProGate('theming')`)
  and the signed-in account is not Pro. Pre-existing gate, unrelated to this refresh.
- Insights, Splits, Loan calculator, Loan schedule: all Pro-gated at the route level; could only see
  their pro-feature lock screens, not Paulo's `insights.tsx` error-state fix or the loan-calculator
  polish.
- Small device (SkipBudget-SE) Home/Paywall: fresh install has no session, and I do not enter real
  credentials to sign in — only the pre-auth Welcome screen was checked there (fits cleanly at
  375×667pt, pill buttons, no clipping).
- Dynamic Type: no in-app control found; the iOS Settings deep link surfaced a real Apple Account
  password prompt for the Founder's own Apple ID, which I dismissed with "Not Now" without entering
  anything, per the credentials rule. Not tested.
- False leads I chased and ruled out: I initially misread the FAB and Cards "Make a payment" pill as
  completely unresponsive to taps. Both were my own device-point/screenshot-pixel conversion error
  (used the wrong scale factor for a few taps) — retested with corrected coordinates and both work
  correctly. Mentioning this so nobody else loses time on it.

**Reset:** Appearance was never touched (still Light · Plum, matching the required end state). No data
was changed — the tile-order experiment was reset via "Original order" without saving, and the
accidental category tap on the real "Housing" bill was left un-saved and confirmed unchanged after.

**Open questions**
1. Should Home dashboard testing (and this whole test plan) get a Pro-unlocked test account, since
   half the test plan's screens (Insights, Splits, Loan calculator/schedule, Appearance/dark mode/
   accents) are unreachable as Free?
2. Is the FAB/Subscriptions-row overlap (bug 1) worth fixing now, or tracked separately — it predates
   this branch's screenshots but still reads as broken on device.

---

## 2026-09-12 — Tara (Testing Team Lead) — ship decision, `almost-done-all-pages`

**Outcome:** Done. **SHIP WITH NOTES.** I re-ran all three gates myself and they are green
(`tsc` 0 errors, lint 208 files / 0 errors / 0 warnings, Jest 17 suites / 251 tests). The tree is
clean of both earlier scratch files. The presentation-only guarantee holds mechanically — `src/api`,
`src/lib`, `src/stores`, `supabase/`, `ios/` and `app.json` all show a literally empty diff — so no
money maths could have moved. What I cannot sign off on is visual: twelve of the thirteen Pro-gated
screens are modified and **not one has been seen rendered**, because the test account is not Pro.

**Gates I ran myself**
- `npx tsc --noEmit` — exit 0, zero output lines.
- `npx expo lint` — exit 0. Verified coverage rather than trusting the exit code: `npx eslint src` in
  JSON reports **208 files linted, 0 errors, 0 warnings**, matching Dmitri's 09-11 number.
- `npx jest --ci` — **17 suites / 251 tests passed**, 2.7s. Money-maths subset re-run on its own
  (`loan`, `card-ledger`, `charges`, `split`, `format`): **115 tests pass**, and none of those files
  appear in the diff.
- `npm run check` — **exits 1, and this is a real process problem, not a code problem.** It dies at
  `format:check` on 32 files: 31 are agent scaffolding (`.claude/**`, `TEAM.md`) and one is `app.json`.
  I confirmed `app.json` is untouched by this branch (`git diff` and `git status` both empty for it),
  so it is pre-existing drift. Because `check` chains with `&&`, **the `test` step never executes** —
  the gate cannot report a pass or fail on tests today. Scoped prettier on the real source
  (`src/**/*.{ts,tsx,css}` + `tailwind.config.js`) is **clean, exit 0**. Theo's open question 1 stands
  and I am escalating it: a green suite is currently invisible behind an unrelated failure.
- `git status --short` — **78 modified tracked files, 4 untracked under `src/`** (the 2 declared
  components + Theo's 2 test files). Grepped for `smoke|probe|scratch|__`: **none**. Both leftovers
  (`__smoke.test.tsx`, `__hello_probe.test.tsx`) are gone.

**Fixes verified in the files, not taken on trust**
Blocker 1 (`destination-list.tsx:146` now carries `text-ink`); finding 4 (all four hero labels at
`/85`); finding 5 (zero `colors.surface` left in the four pickers, all now `colors.onControl`);
finding 6 (`Record<string, Href>`, both `as never` casts gone); finding 8 (swatch on `border-ink/10`);
`hello.tsx:57` `isError` branch ordered loading → error → redirect → form; `pro.tsx:234` debug line
behind `__DEV__`; `insights.tsx:103` aggregating seven flags.

**I reproduced the contrast maths independently** with the project's own `contrast()`/`onColor()`, and
it matches Dmitri exactly: at `/70` **coral 4.39, rose 4.12, lavender 4.27, taupe 3.67** fail the 4.5
floor; at `/85` all twelve pass, **worst taupe 4.72**. So finding 4's fix is measured, not asserted.

**One thing I checked that nobody flagged, and it is fine.** The diff changes the hero's figure line
from `loading ? '—'` to `error ? '—'` (`balance-summary.tsx:220`). Read alone that looks like a
loading state rendering `$0.00` as though it were real money. It is not: `:206` returns a `Skeleton`
whenever `loading && !error`, so the `formatCurrency` line is unreachable until the read lands, and
the a11y label covers both states. Verified by code; worth recording because it is the one hunk in
this refresh that could have put a false money figure on screen.

**Coverage, stated honestly**
- *Verified on device (Tia, iPhone 17 Pro):* Home dashboard, Bills, Receipts, Subscriptions,
  Transactions, Cards, Settings, Reminders, Tiles/Arrange, Salary, Savings, the three add-forms, the
  pro-feature lock screens. Three figures confirmed to the cent against their screens.
- *Verified by code and/or unit test only:* the `hello.tsx` error branch (Diego rendered it under a
  throwaway probe, never on a phone), `insights.tsx`'s new error gate, the four picker `onControl`
  swaps, the hero's loading/error path, all twelve accents' contrast.
- *Not tested at all:* dark mode; eleven of twelve accents; Insights; Splits; Loan calculator; Loan
  schedule; Dynamic Type; small-device post-login. **Twelve of thirteen `useProGate` screens are
  modified on this branch and none was rendered.**

**Why I am not treating that blind spot as a blocker.** I checked the size of what is unseen:
`add-group` 4 lines, `add-member` 4, `appearance` 4, `friends` 2, `group-settings` 2, `settle-up` 2,
`save-loan` 6, `loan-schedule` 5, `loan-calculator` 10, `splits` 24, `add-expense` 17 — token, radius
and spacing swaps, the same edits already seen rendering correctly on the eleven Free screens.
`insights.tsx` at 96 lines is the single outlier and the only one I would call untested risk, because
its new early-return gates the whole page.

**Data-layer gaps: confirmed, and confirmed pre-existing.** I verified all of Diego's findings in
`queries.ts` myself — `useLedger:966` omits `salary`/`charges`; `useSourceLedger:690` is
`cards || accounts || payments`; `useSourceBalances` returns no `isError` at all; `isSettled` is read
nowhere in the tree. All sit in a file with **zero diff**, so this refresh neither introduces nor
worsens them. Note the honest caveat: `insights.tsx`'s new comment claims "nothing here renders a
figure until every source it subtracts from has actually answered", which is not quite true —
`owedOnCards` still falls back to `card.balance` through `useSourceBalances`. The branch improves the
screen from zero error coverage to seven of eight; it does not finish the job.

**Tia's two findings, adjudicated**
1. *FAB over the "Subscriptions" row* — real as observed, **cosmetic, not a blocker, and not a
   regression.** I re-did Dana's arithmetic: the FAB occupies the bottom 84pt (`absolute bottom-5` +
   64pt), while `home.tsx:245` `pb-24` (96pt) plus `screen.tsx:51` `paddingBottom: 16` gives 112pt, so
   the page end clears it by 28pt and no row can come to rest underneath. What Tia saw is a mid-page
   row under an overlay at scroll offset 0 — inherent to any floating FAB. Any real fix moves the FAB,
   which is the Founder's call.
2. *Add-receipt "Store" fast-typing* — **closing as no-mechanism-found, correctly not filed as a bug.**
   `brand-field.tsx` is a plain controlled `TextInput` (`value={query}` / `onChangeText={setQuery}`);
   the debounce at :30-32 feeds only the *search*, never the field's value, and the only two
   `setQuery('')` calls (:76, :82) fire on explicit brand selection, never mid-typing. No code path can
   truncate text while a human types. Consistent with Tia's own read that the automation tool outran
   the JS thread. A 10-second manual type is the cheap confirmation; keeping it as a backlog
   spot-check, not a risk.

**Recommendation: SHIP WITH NOTES** — merge to `main` after Founder approval, subject to the two
conditions and the Pro-account walk in my report to the CEO.

**Open questions**
1. A Pro test account is the single highest-value thing anyone can hand this team. It unlocks twelve
   modified screens, dark mode and the twelve accents in one pass — the entire remaining blind spot.
   Who can provision one (RevenueCat sandbox or a DB-flipped `is_pro`)?
2. `npm run check` cannot reach its own test step. Fix `app.json`'s formatting or scope
   `format:check`'s globs — until then the project's own gate is not trustworthy as a merge signal.
3. The hero's Income/Expenses are no longer green/red, and the FAB position, both still want a Founder
   eye. Neither is an engineering fault.

---

## 2026-09-12 — Tia (Tester) — stepped add flows + pills sweep, `almost-done-all-pages`

**Outcome:** Partial / blocked mid-session. Walked the new stepped add flows (Amount → Details →
When) on iPhone 17 Pro (CF94A123-74A3-4E85-9606-336F696A984E), signed in as Sam (Free). Found one
reproducible blocker in the flow chrome itself, one reproducible data-integrity bug, one intermittent
silent-save-loss, and confirmed the keypad/calendar/time-picker rules all work. Session was cut short
by an unrelated **environment blocker**: the shared Metro dev server (localhost:8081) started failing
to bundle the app entirely partway through my walk, and is still broken as I write this. I did not
edit any code, sign out, or enter real credentials/payment details.

**Bugs, ranked**

1. **Blocker (environment, not app code) — Metro cannot bundle the app for anyone on :8081 right
   now.** `src/app/receipts.test.tsx`, `src/app/reminders.test.tsx`, `src/app/insights.test.tsx` and
   `src/app/__loan_probe.test.tsx` are untracked files sitting directly inside `src/app` (expo-router's
   route directory). Router's `require.context` picks up every file there, including `.test.tsx`
   ones, which drags `@testing-library/react-native` → `node_modules/@testing-library/react-native/
   dist/helpers/logger.js` → `require("console")` into the real app bundle. Node's `console` module
   doesn't exist in the RN runtime, so bundling fails outright: **"Unable to resolve module console
   from .../logger.js."** I confirmed this is not a stale-cache artifact — killed and restarted Metro
   with `--clear`, relaunched the app fresh, identical failure both times, and the log shows the exact
   import stack (`receipts.test.tsx` / `reminders.test.tsx` → `@testing-library/react-native` →
   `logger.js` → `console`). These four files are untracked (`git status`), so this is very likely a
   teammate's in-progress scratch work landing in the wrong directory while I was testing, not
   something on this branch's diff. I did not delete or move them — that's a code-tree edit, and I
   was told not to make those. **Whoever owns those four files needs to move them to `__tests__` (or
   delete the probe one) before anyone can use the dev client again.**
   Screenshot: `.claude/team/testing/screenshots/metro-syntax-error-console-logger.png`.

2. **Blocker (app) — the step-flow header back button (‹) does not work on any step after the
   first, in every context I tried, and the only working "back" (the OS edge-swipe) discards the
   whole flow instead of stepping back once.** Reproduced 4+ times on fresh navigation: Add a receipt
   step 2 → back → nothing. Step 3 → back → nothing (tried multiple exact-coordinate retries with
   screenshots between each, ruled out mis-tapping — the same tap position reliably operates the
   identical-looking back button on plain (non-flow) screens). Edit receipt, opened correctly on step
   2 per spec → back → nothing. The **only** thing that moves you off a step >0 is the iOS edge-swipe
   gesture, and per spec (`add-flows-2026-09-12.md` §1.3) that gesture should decrement one step and
   keep all typed data; instead it does a raw stack pop that exits the entire flow and **loses every
   field typed so far** — one edge-swipe from Add-receipt step 3 popped not just the flow but past
   Home, landing on a previously-open Splits pro-feature screen. This fails test plan item 5 outright
   (back-a-step-and-forward-again cannot be tested because back-a-step does not exist) and is a real
   data-loss risk for anyone who taps ‹ expecting normal back behaviour.
   Steps to reproduce: Home → Receipt quick action → type an amount → Continue → fill Store →
   Continue (now on step 3, the calendar) → tap the ‹ at top-left. Expected: return to step 2 with the
   store still filled. Actual: nothing happens; the calendar stays on screen indefinitely.
   Not saved to disk (the crash in bug 1 hit before I could re-capture cleanly); trivially
   reproducible from the steps above once Metro is fixed. This is shared chrome
   (`components/flow/step-flow.tsx` per Pia's 09-12 build log) used by all seven stepped flows, so I
   expect it affects add-bill/add-subscription/add-card/add-account/add-group identically — I only
   confirmed it on add-receipt before the environment blocker hit.

3. **Major — "end date before start date" is not dropped or rejected.** Add a bill → Recurring
   → Specific period, with the start date set to 12 Sep 2026: the "To" date picker lets you pick 5
   Sep 2026 (five days *before* the start date) and accepts it with no validation message and no
   correction. The field then reads "5 Sep 2026" with the "Clear — make it ongoing" link underneath,
   as if it were a normal, valid end date. Test plan explicitly calls out that this must be dropped.
   Steps: Add a bill → any category → any amount → Continue → step 3 → select day 12 as the start
   date → Recurring: Specific period → tap the "To" field → in the date picker, page/select a day
   before the 12th → OK. Expected: the earlier date is rejected or silently dropped back to "Ongoing."
   Actual: it is accepted and displayed. Not saved to disk (session crashed before I could re-capture);
   trivially reproducible from the steps above.

4. **Major, intermittent — one Add-receipt save reported success but the record was never
   persisted.** Filled amount $18.49, store "Tia QA Store," date today, tapped Save on step 3, saw
   the success haptic/animation and landed back on the list — but the Receipts list stayed at
   exactly -$77.00 / 3 receipts both immediately and after switching the period filter to "All" and
   pull-to-refreshing. A second, cleaner attempt in the same session with a different amount ($9.63,
   "QA Retry Store") saved correctly, showed -$86.63 / 4 receipts to the cent, and deleted cleanly
   back to -$77.00 / 3. The first attempt happened in a navigation context the CEO had already left
   messy from an earlier walk (a stray "◀ Settings" system indicator was present, suggesting the
   add-receipt screen was pushed on top of an unusual stack), so I can't rule that out as a
   contributing factor, and I could not force a second repro. Flagging as a real, witnessed
   silent-failure rather than a confirmed deterministic bug — someone should try to reproduce
   deliberately from a clean navigation stack.
   Screenshot: `.claude/team/testing/screenshots/add-receipt-save-silently-lost-record.png`.

5. **Minor, low-confidence — Store/Company text fields occasionally drop characters when typed
   quickly.** "Tia QA Store" landed as "Tia QA Store" once and "QA Retry Store" landed as "QA Retry"
   once (both times the tail of the string was dropped). This is the same class of issue Tia logged on
   09-11 ("Test Store QA" → "Test Store") which Tara's team investigated and closed as
   no-plausible-mechanism (the field is a plain controlled `TextInput`, no truncation path in code) —
   most likely the automated typing tool outrunning the JS thread rather than a real user-facing bug.
   Recording the repro again for the pattern; recommend a manual 10-second type as a spot-check, not a
   filed defect.

**What passed**
- **Keypad (Add receipt step 1), all rules confirmed:** decimal accepted once (second `.` tap
  ignored), two-decimal cap (third digit after `.` ignored), leading zero replaced on next digit,
  backspace removes one character down to empty with Continue correctly disabled at `$0`, 9-digit
  whole-part cap holds (`$123,456,789` displays fully grouped and fits the screen; a 10th digit is
  silently ignored, matching spec — never truncates).
- **Inline calendar:** December → January year-boundary paging works cleanly; the Today pill jumps
  back to the current month and re-selects today; tapping any day selects it (filled pill) while an
  unselected today shows as a ring only; add-bill's optional/null date state correctly shows nothing
  pre-selected (per Pia's documented deviation) while add-receipt correctly defaults to today selected.
- **Time picker:** set 11:30 PM (toggled the AM/PM pill, dragged the hour dial to 11, tapped the
  minute dial at 30), confirmed the fields read "11 : 30" with PM highlighted before confirming — the
  round-trip test plan item 4 asks for.
- **Add-bill category pre-step:** "What is this bill for?" grid works, pre-fills the Name field on
  step 2 correctly (e.g. picking Internet pre-filled "Internet"), and the Category `ChoiceChips` row
  on step 2 shows the right pill selected with no clipping.
- **Add-bill "Specific period"** correctly reveals the "To" field and the "Clear — make it ongoing"
  link; question line correctly switches to "When does it start?" for period recurrence.
- **Editing:** opening an existing receipt lands correctly on step 2 (Details) with Store prefilled,
  matching spec. "Delete receipt" (red, trash icon) is present under the primary button on **every**
  step including step 3, opens a proper confirm dialog ("Delete this receipt? / This cannot be
  undone."), and correctly removes the record (list total returned to exactly -$77.00 / 3 receipts
  after deleting a $9.63 test entry).
- **Amounts saved and confirmed to the cent, then cleaned up:** $9.63 "QA Retry Store" receipt —
  showed as -$9.63 on the Receipts list (today, correct date), pushed the list total to -$86.63 / 4
  receipts, then deleted, returning the list to -$77.00 / 3 receipts exactly.
- Pills I did reach (Category `ChoiceChips`, Recurring `ChoiceChips`, Reminder `ChoiceChips` on
  add-bill) all render with the spec's filled/unfilled anatomy, no clipped labels, no wrapping issues
  at default text size.

**Could not test — cut short by the Metro blocker (bug 1)**
- add-subscription, add-card, add-account full save/delete flows (cycle, reminder, expected income,
  pay frequency, last pay day) — not reached.
- Editing an existing bill or subscription (only receipt-editing was verified).
- The `percent` variant of `AmountPad` (loan calculator rate, salary).
- Back-button behaviour on any flow besides add-receipt — but bug 2 is in shared chrome
  (`step-flow.tsx`) per Pia's build log, so it is very likely present on all seven stepped flows, not
  receipt-specific.
- The rest of the pills sweep: Transactions period tabs, the four filter sheets, Reminders lead-time
  chips, Notifications "Clear all," Salary add-source pill, Settings/Appearance save pills, Pro
  paywall footer link readability, Friends, Settle up, Group settings, Tour.
- Dark mode / accents: confirmed still Pro-gated on this account per the brief — skipped, not tested.
- Add-group / add-member: Pro-gated (splits) — skipped, not tested.

**Unresolved cleanup risk — please check before this branch ships.** I was mid-way through saving a
test bill (category Transportation, $45.00, monthly, due 12 Sep) when the Metro crash (bug 1) hit
right as I tapped Save. **I cannot confirm whether that bill was actually persisted to Sam's account**
— the app has been unusable since, so I could not check the Bills list or delete it if it landed.
Whoever picks this back up: please check Sam's Bills list for a "Transportation" bill at $45.00 and
delete it if present, since I was not able to close that loop myself. Everything else I created
during this session (the receipts) was confirmed deleted before the crash.

**Open questions**
1. Who owns `src/app/receipts.test.tsx`, `reminders.test.tsx`, `insights.test.tsx` and
   `__loan_probe.test.tsx`? They need to move out of `src/app` (a `__tests__` directory, or wherever
   the project's Jest config already looks) before the dev client works again for anyone.
2. Is the step-flow back button (bug 2) really broken on all seven flows, or receipt-specific? I could
   not check the other six before Metro went down — worth a deliberate re-test the moment it's fixed,
   since it's a shell-level component shared by every add flow.
3. Please verify/delete the possible stray "Transportation $45.00" bill noted above.

---

## 2026-09-12 — Theo (Tester) — automated-quality picture, `almost-done-all-pages` (Phase 2 complete)

**Outcome:** Done. `npm run check` is green end to end: **36 suites / 457 tests pass, exit 0** (typecheck,
lint, format:check, test all pass in the chain). No flake in 6 total `--ci` runs. Found and fixed the
worker-leak Dana handed over — it was two test files, not one, both mine to fix since both are test
files. Coverage reviewed for Phase 2; two exported loan functions had zero tests and now have seven.
Wrote the route-guard test the brief asked for and proved it actually catches the failure mode it
guards against. No non-test source file touched, nothing committed.

**Command-by-command**
1. `rm -rf .expo/cache/eslint && npm run check` — **exit 0**. `tsc --noEmit` silent, `expo lint` 0
   errors/0 warnings, `prettier --check .` clean, `jest` **35 suites / 449 tests pass** (this was the
   baseline before my two test-file edits below; after them, 36/457 — see "Tests added").
2. `npx jest --ci` **three more times, baseline**: 35/35 suites, 449/449 tests, every run — no flake.
   But every run printed **"A worker process has failed to exit gracefully… Active timers can also
   cause this, ensure that .unref() was called on them"** — the warning Dana handed over undiagnosed on
   09-11 (her entry, "second, independent way for one run in seven to look different").
3. **Root-caused it with per-suite `--detectOpenHandles`, not with the whole-suite flag** (which just
   hangs — Jest waits for the handle instead of naming it). Bisected `src/api/*` one file at a time:
   `auth.test.ts`, `push.test.ts`, `queries.test.tsx` all exit in under a second with the flag on.
   `src/api/mutations.test.tsx` and `src/api/reminders.test.tsx` each **hang for minutes** with the flag
   on, though their own tests finish in ~1s. Cause: both files build a `new QueryClient({ defaultOptions:
   { queries: { retry: false, gcTime: 0 } } })` but never set `gcTime: 0` on the **mutations** side.
   TanStack Query v5 gives a mutation-cache entry its own garbage-collection timer — default 5 minutes —
   independent of the query cache's. Every `mutateAsync` call in those two files (8 in mutations.test.tsx,
   4 in reminders.test.tsx) left a real, un-`.unref()`'d `setTimeout` referencing the process, which is
   exactly what the Jest warning names. Proved it two ways: (a) adding `mutations: { retry: false,
   gcTime: 0 }` to both files' `defaultOptions` made `--detectOpenHandles` exit in ~4s instead of hanging;
   (b) a full-suite `--detectOpenHandles` after the fix finished clean in 12s with no warning, where the
   unfixed tree either hung indefinitely or force-exited with the warning every time.
   **Fixed in both test files** (`src/api/mutations.test.tsx:89`, `src/api/reminders.test.tsx:72`) since
   both are test files, per the brief's "fix it only if it is in a test file" rule — no source file was
   touched, the leak was entirely in how the tests built their `QueryClient`.
4. **Confirmed fixed**: `npx jest --ci` three more times post-fix — 36/36 suites, 457/457 tests, **no
   worker warning any run**. A full `npx jest --detectOpenHandles` (no path filter) now completes in
   ~9–12s with a clean exit, where it used to hang past two minutes and get force-backgrounded by the
   harness. This is a real fix, not a suppression — I did not add `--forceExit` or `--detectOpenHandles`
   to the npm scripts; the timers themselves are gone.
5. `npx jest --ci --coverage --collectCoverageFrom='src/lib/**' --collectCoverageFrom='src/api/**'` —
   36 suites / 457 tests pass, coverage table below. Left no `coverage/` directory behind (it was
   untracked and would have failed `format:check`'s HTML output otherwise — deleted after each run).
6. `npx expo-doctor` — **2 checks failed, both pre-existing and already reported by Dilip on 09-12**:
   CocoaPods not resolvable on this shell's PATH, and 31 SDK packages sitting on older patch versions
   (`expo`, `@expo/ui`, `expo-router`, etc. — `npx expo install --check` territory). Nothing new.
7. `npx tsc --noEmit --strict` — **exit 0, no output.** `tsconfig.json:4` already has `"strict": true`,
   so this is the same check `npm run check` already runs; reporting as asked, no daylight between them.
8. `grep -rn "console.log" src` — **zero matches.** (One exists outside `src`, for completeness:
   `supabase/functions/revenuecat-webhook/index.ts:52` — not in scope for this grep, not touched.)

**Flake analysis**
Six full `--ci` runs (3 before my fix, 3 after) and one `--detectOpenHandles` run before and after: test
*counts* never varied — 449/449 then 457/457, always green. The only instability was the worker-exit
warning, which is now gone and was never a false pass/fail, just an unclean shutdown. No other flake
found.

**Coverage lowlights** (`src/lib/**` + `src/api/**`, `--ci --coverage`)
- **Zero statement coverage in `src/api`:** `brands.ts`, `contact.ts`, `oauth.ts`, `onboarding.ts`,
  `pro.ts`, `refresh.ts`, `scan.ts`, `splits.ts`.
- **Zero statement coverage in `src/lib`:** `app-lock.ts`, `supabase.ts` (and `wall.ts`, which is 0%
  stmts/lines but 100% branch/funcs — a trivial file with no branches to miss).
- **Lowest non-zero in `src/api`:** `charges.ts` 24.32%, `auth.ts` 33.33%, `reminders.ts` 37.2%
  (the receipts-reminder reads/writes `receiptReminderFrom` covers; the rest of the file — bill/
  subscription/card/account reminder plumbing — is not exercised here, only through the app-level
  `reminders.test.tsx` render test), `mutations.ts` 40.32%, `push.ts` 41.48%, `queries.ts` 51.47%.
- **Lowest non-zero in `src/lib`:** `haptics.ts` 37.5%, `date.ts` 56.17%, `use-today.ts` 70.58%,
  `pro-bypass.ts` 76.31%, `press.ts` 80%.
- **Money-maths files (`loan.ts`, `money.ts`, `apr.ts`, `card-ledger.ts`, `charges.ts`, `split.ts`,
  `group.ts`) — checked every exported function against the test file:**
  - `money.ts` — **100%** statements/branches/functions/lines. Every export tested.
  - `split.ts`, `group.ts`, `card-ledger.ts`, `charges.ts`, `apr.ts` — every exported function has at
    least one direct test; the handful of uncovered lines in each are single untaken branches inside an
    otherwise-tested function (e.g. `card-ledger.ts:378-380` one arm of a Map lookup, `apr.ts:107-183`
    one arm of the bisection's early-exit), not a missing function.
  - **`loan.ts` — two exported functions had zero tests: `payoffDate` and `formatTerm`.** Every other
    export (`calculateLoan`, `amortisationSchedule`, `scheduleByYear`, `daysBetween`, `accruedInterest`,
    `paymentDates`, `amortise`, `solvePayment`, `monthsAndDaysBetween`, `addMonths`, `interestFraction`,
    `payoffQuote`, `comparePrepayment`, `termsFromStored`) is exercised by Drew's fixtures. These two are
    the ones the loan-calculator screen actually displays ("1 yr 7 mo", "$1,683.24 saved" per Drew's
    09-12 render-probe log) and had never been asserted against on their own. Now tested — see below.

**Tests added** (all in test files; no source file edited)
- `src/lib/loan.test.ts` — **+7 tests**, two new `describe` blocks:
  - `payoffDate`: matches `paymentDates`'s own last entry; holds the anchor day through a short month
    (31 Jan → 28 Feb → 31 Mar all resolve to the 31st, not dragged down by February); falls back to the
    start date at zero months.
  - `formatTerm`: months alone under a year (`0`, `7`, `11`); years alone on an exact multiple of twelve
    (`12` → "1 yr", `24` → "2 yrs"); singular "yr" holds through `19` → "1 yr 7 mo" while `30` → "2 yrs
    6 mo" pluralises; combines years and months.
  - Caught my own mistake while writing these: my first draft asserted `formatTerm(23)` pluralises
    (it doesn't — 23 months is "1 yr 11 mo", years stays at 1) — fixed the test data, not the assertion,
    once I'd actually read what the function does.
- `src/__tests__/no-route-test-files.test.ts` — **new file**, the guard the brief asked for. Walks
  `src/app` recursively with `fs.readdirSync` (no new dependency — `glob` is only a transitive one, not
  in `package.json`, so I didn't lean on it from a test file) and asserts zero `*.test.*` files anywhere
  under it. **Falsified it before trusting it**: dropped a scratch `src/app/__scratch_probe.test.ts`,
  confirmed the guard fails and names the exact file, deleted the probe, confirmed it passes again. This
  is the same failure mode Tia hit on 09-12 (four stray `.test.tsx` files in `src/app` broke Metro
  bundling) and Dana's 09-12 entry flagged as worth a house rule — this is that rule, enforced.
- `src/api/mutations.test.tsx`, `src/api/reminders.test.tsx` — **no new test cases**, one line each
  (`mutations: { retry: false, gcTime: 0 }` added to the `QueryClient` `defaultOptions`) — this is the
  worker-leak fix from item 3 above, not a feature test.

**What I did not add, and why**
- **`group.ts` `sortByDateAscending` edge cases** — already complete. `src/lib/group.test.ts:82-124`
  (Dana's 09-12 work) covers oldest-to-newest, a shared day broken by id ascending, undated rows trailing
  in id order among themselves, no mutation of the input, and an empty list. Equal dates, empty and
  undated are all there; nothing to add.
- **`receiptReminderFrom` parsing/formatting** — already complete. `src/api/reminders.test.tsx:84-108`
  (Diego's 09-12 work) covers no profile row, trimming Postgres's seconds, the null-column-falls-back-to-
  default case, and a non-time-string treated as unset. No gap.
- **Render test for the Reminders screen's error branch and cards.tsx `PageState` error** — already
  complete, both by Dana on 09-12. `src/__tests__/app/reminders.test.tsx:183-230` has one
  `it.each` case per of the seven reads (`receipts`, `reminders`, `bills`, `subscriptions`, `cards`,
  `accounts`, `salary`) proving the error page replaces the switches and the retry re-reads all seven,
  and `src/__tests__/app/cards.test.tsx` has the three cases the brief asked for almost verbatim: lists
  when reads land, replaces the wallet with the error rather than showing the stale typed-at-setup
  balance, and the retry calls `refetch` once. Writing these again would have been the same test twice.

**Static checks**
- `npx expo-doctor` — 2 pre-existing failures, both already filed (CocoaPods PATH, 31 outdated SDK
  patches). Nothing new.
- `npx tsc --noEmit --strict` — exit 0. Redundant with `npm run check`'s `tsc --noEmit`, since
  `tsconfig.json` is already `"strict": true` project-wide.
- `grep -rn "console.log" src` — zero matches in application code. One outside `src`
  (`supabase/functions/revenuecat-webhook/index.ts:52`), out of the grep's stated scope, flagging only
  for completeness.

**Open questions**
1. `src/api/reminders.test.tsx` and `src/api/mutations.test.tsx` still print `console.error` "An update
   … was not wrapped in act(...)" pointing at TanStack Query's `notifyManager` — a *different*, cosmetic
   issue from the timer leak I fixed (this one doesn't leave a handle open or cause flake; it's a mutation
   observer settling after the test body already returned). Tests still pass and the suite exits clean,
   so I left it — restructuring the assertions to `waitFor` the settled state is a real fix but touches
   test logic I don't own, not the one-line `gcTime` leak the brief sent me after.
2. `src/api/reminders.ts` sits at 37.2% coverage in this collection — mostly the bill/subscription/card/
   account reminder plumbing that predates this branch, only reachable today through the app-level
   `reminders.test.tsx` render test rather than direct unit tests. Not money maths and not in my brief's
   six files, flagging as a coverage gap for whoever owns that file next.
3. Confirms the branch is in the same state Tara/Dmitri/Dana's 09-12 entries describe: `npm run check`
   fully green, no source-file diff from me anywhere, `src/app` clean of test files (now mechanically
   guarded). Nothing outstanding on the automated side that I can see.

---

## 2026-09-12 — Tia (Tester) — full screen-by-screen walk, `almost-done-all-pages`

**Outcome:** Done (partial coverage by design — see "Could not test"). Metro's earlier blocker is
resolved (the stray `.test.tsx` files are now correctly under `src/__tests__/`). Walked Home, the
add-receipt and add-bill stepped flows end to end (save + delete), Transactions/Receipts/Bills/Cards
lists, Settings, Appearance in dark mode with two accents (Butter, Plum), Insights, Loan calculator,
Loan schedule, the Pro paywall, and Reminders, on iPhone 17 Pro (CF94A123-74A3-4E85-9606-336F696A984E),
signed in as Sam. Found **four blockers** and one carried-over major. Did not sign out, edit code, or
enter real credentials/payment.

**Bugs, ranked**

1. **Blocker — the primary CTA (`Continue`/`Save`, the `StepFlow` shell's bottom button) and the
   inactive tab-bar icons have a touch hit-box that sits ~30-35pt *above* their visual position, so a
   tap on the visible button/icon (especially its lower half, which is most of it) silently does
   nothing.** Reproduced on Add-receipt step 1 (new and edit) and Add-bill step 2/3: tapping the
   visually centred "Continue"/"Save bill" pill at its drawn position did nothing across 10+ attempts,
   varied x, with/without a duration modifier; tapping ~30pt higher — inside the gap between the
   keypad and the button, well above the drawn pill — worked every time. Same pattern on the custom
   bottom tab bar: tapping "Cards"/"Receipts" at the icon's drawn position did nothing; tapping ~33pt
   higher worked. Regular in-flow controls (list rows, the "Delete receipt" text link, system alert
   buttons) do **not** show this offset — only elements pinned to the bottom via safe-area insets
   (the floating tab bar, the StepFlow's `mb-2` bottom button) do. This means, on a real device, a
   user tapping the visible centre of "Continue" or a tab icon (the natural target) will very often
   get no response and conclude the app is frozen. This blocks test-plan item 2 outright for anyone
   who doesn't discover the workaround. Likely a safe-area inset applied twice — once to the
   layout/hit-test box, once to the paint position — on bottom-pinned elements only.
2. **Blocker — Settings `Switch` controls (confirmed on "Fake Pro" and "Haptics") cannot be turned
   OFF by tapping.** With either switch ON, a plain tap anywhere in its bounds (7+ coordinates tried
   on Fake Pro, including left edge/right edge/centre/whole-row) leaves it ON; a horizontal swipe
   across the switch turns it off in one try, immediately and correctly (confirmed via the "Skip
   Pro — active" text correctly reverting to showing the price). Turning a switch ON did work via a
   plain tap. Real users tap switches, they do not swipe them — this will read as a stuck/broken
   toggle for anyone trying to turn off Fake Pro, Haptics, or (by extension) any other Settings
   switch.
3. **Blocker — raw debug text is visible on the live Pro paywall.** With Fake Pro off, `pro.tsx`
   shows `offerings=1 current=yes pkgs=2` in small grey type directly above the "Start 1 week free"
   button, on both plan cards' section — this is exactly the "no debug text" the test plan calls out.
   Screenshot: `.claude/team/testing/screenshots/paywall-debug-text.png`. Matches the recent commit
   "Surface the raw store result on the Pro page while debugging" — needs to come out before ship.
4. **Blocker — the "Reminders" row in Settings does not navigate on tap, and the screen itself fails
   to load even when reached directly.** Tapped the "Reminders" row under Settings → Preferences at
   7 different coordinates spanning its full width/height (icon, label, chevron, whole-row) over
   several minutes; none navigated, while the rows immediately above and below it ("App lock" switch,
   "Dashboard tiles") worked fine at analogous coordinates. Opening the route directly via
   `skipbudget://reminders` confirms the screen exists but shows an immediate, non-recoverable error:
   **"Could not load your reminders / Nothing has changed. Check your connection and try again — until
   this loads, Skip cannot tell you what it is set to send."** — persists after tapping "Try again."
   Screenshot: `.claude/team/testing/screenshots/reminders-could-not-load.png`. This is consistent
   with the brief's warning that the new receipts-reminder migration may not be applied yet, but the
   failure is a full list-load error, not just a persist-on-toggle error, so the new "Daily receipts
   reminder" section (switch, time picker, AM/PM pill) could not be reached or tested at all this
   session, and the dead Settings row means no user can reach Reminders from the UI regardless.
5. **Major (carried over from the 09-12 session before mine, still present) — "end date before start
   date" is accepted with no validation in Add Bill's Specific-period recurrence.** Add a bill → any
   category → any amount → Continue → step 3 → start date 12 Sep 2026 → Recurring: Specific period →
   "To" field → date picker → select 5 Sep 2026 (before the start date) → OK. Expected: rejected or
   dropped back to Ongoing. Actual: accepted and displayed as "5 Sep 2026" with the "Clear — make it
   ongoing" link underneath, as if valid.

**What passed**
- **Home:** hero, quick actions, "Where it goes" destination list, Insights row, date selector,
  Recent (ascending, today last)/Coming up all render correctly and update to the cent after data
  changes (confirmed across three receipt/bill deletions).
- **Add-receipt and Add-bill, full save + delete round trip** (workaround applied for bug 1): amount
  keypad, category chooser pre-filling the bill name, Details step field pre-fill on edit (Store
  correctly seeded), inline calendar (today ring vs. selected fill, month header, Today pill,
  cross-month day selection), recurring/reminder pills, Delete confirm dialog, and list totals to the
  cent before and after (-$77.00/3 → -$17.00/1 receipts; -$1,032.00/2 → -$1,030.00/1 bills).
- **Back navigation within a stepped flow works and preserves typed data** — confirmed step 2 → step 1
  on Add-receipt edit keeps the amount; this was a blocker in my 09-12 (earlier) session and is now
  fixed.
- **Transactions:** period pills (Week/Month/Year/All), range-dropdown sheet, ascending order (oldest
  group first, today's group last, confirmed across two months), search/filter chrome present. Opens
  scrolled to the latest entry with the period tabs/summary card off-screen above — this reads fine
  once you know it, but a first-time user landing mid-list with no visible controls could reasonably
  wonder where the header went; worth a Founder look, not a defect.
- **Dark mode + two accents (Butter, Plum):** Appearance, Home, Insights, an edit-receipt screen
  (including the red "Delete receipt" text, clearly legible), Loan calculator, and Loan schedule all
  render with correct contrast and `onControl` flips. Screenshots:
  `.claude/team/testing/screenshots/appearance-dark-plum.png`,
  `appearance-dark-butter.png`, `home-dark-butter.png`, `edit-receipt-dark-delete-red.png`.
- **Loan calculator:** three interest-convention chips (Daily·365/Monthly rests/30·360), borrowed vs.
  interest bar, APR line, "Where each payment goes" card all present and correctly styled.
- **Loan schedule:** per-payment table, year grouping, progress bars all correct.
- **Paywall (aside from bug 3):** feature list, Yearly/Monthly cards, "2 MONTHS FREE" badge, and the
  Restore/Terms/Privacy row read exactly right — Restore purchases is plain text, Terms and Privacy
  are underlined links, which is the correct affordance split.
- **Cards:** "New card"/"Add account" ActionPills, card detail preview (blue card, "Skip" watermark)
  render well.

**Could not test**
- add-subscription, add-card, add-account, add-group, add-member full save/delete flows — not
  individually exercised this session (time), though the bug-1 workaround makes them very likely
  mechanically fine.
- Test-plan item 3 (editing an *existing* record, changing a field, confirming persistence) — only
  exercised creating new records this session; did not specifically re-open a saved record, change a
  field, and confirm the change stuck.
- The new "Daily receipts reminder" switch/time-picker/AM-PM pill — completely blocked by bug 4.
- Splits, Settle up, Group settings, Friends, Savings, Savings month, Salary, Tour, Contact/FAQ/
  Privacy/Terms detail text — not walked this session.
- Insights error state via airplane mode — `xcrun simctl status_bar` cannot cut network, as flagged
  in the brief; skipped.
- iPhone SE-class simulator / pre-auth screens, and Dynamic Type — not attempted this session
  (effort/time), unlike prior instructions which called these out explicitly; flagging as an honest
  gap for whoever picks this up next.

**Test data created and deleted**
- Deleted pre-existing **Kroger $5.00** and **Walmart $55.00** receipts (dated today) from Sam's
  account — confirmed test data per the brief. Receipts list returned to exactly **-$17.00 / 1
  receipt** (Desi Bits, a real-looking entry, left untouched) after both deletions; confirmed via the
  "All" period filter that no further stray test receipts (e.g. "Test Store") exist anywhere in the
  account.
- Created and deleted one test bill: **Internet, $2.00, Monthly** (used deliberately to reproduce bug
  5, then cleared to Ongoing before saving) — Bills list returned to exactly **-$1,030.00 / 1 bill**
  (Housing, real data, left untouched) after deletion.
- The prior session's open question about a possible stray "Transportation $45.00" bill is resolved:
  no such bill exists in the current Bills list.
- Reset Appearance to Light/Plum and turned Fake Pro off before finishing (had to use the swipe
  workaround for bug 2 to turn Fake Pro off).

**Open questions**
1. Bug 1 (bottom-pinned hit-box offset) is the highest-priority item for engineering — it affects
   every stepped add flow's forward progress and the tab bar app-wide. Worth checking whether it's a
   double-counted safe-area inset in `Screen`/`step-flow.tsx`/the tab bar component.
2. Bug 4 (Reminders unreachable + erroring) — is the load failure the receipt-reminder migration not
   being applied yet (per the brief's expectation), or a separate regression? The Settings row not
   navigating at all is a second, distinct problem from the load error and should be looked at
   separately.
3. Given bugs 1-4, my read for Tara's ship call is **not ready** — bug 1 alone would make the new
   add-flow release unusable for a meaningful share of real taps.

---

## 2026-09-12 — Tara (Testing Team Lead) — final ship call, `almost-done-all-pages` (full working tree)

**Outcome.** Done, read-only, nothing edited or committed. **Two different answers for two
different targets.** (a) Installing this build on the Founder's own two iPhones: **SHIP WITH
CONDITIONS.** (b) Merging to `main` and moving to App Store deployment as one step:
**DO NOT SHIP** — not because of a defect in the code, but because two migrations and one edge
function have never been executed anywhere, and four whole feature areas have never been opened by
anybody, on a device or in a test.

**Gates, re-run by me from clean (`rm -rf .expo/cache/eslint; npm run check`) — exit 0, whole chain**
- `tsc --noEmit` — exit 0, no output.
- `expo lint` — 0 errors / 0 warnings. Verified coverage rather than the exit code: `npx eslint src`
  in JSON reports **235 files linted, 0 errors, 0 warnings** (up from 208 on 09-11 — the new flow,
  money and switch files).
- `prettier --check .` — "All matched files use Prettier code style!", exit 0. This is the first time
  the chain has reached its own test step; Dilip's `app.json` format fix closed the hole Theo and I
  both escalated on 09-11.
- `jest` — **39 suites / 472 tests passed**, 8.8s. Money-maths subset re-run on its own
  (`loan`, `money`, `apr`, `card-ledger`, `charges`, `split`, `group`, `format`): **8 suites /
  192 tests pass**.
- `git status --short src/app | grep test` — **empty** (grep exit 1). `find src/app -name '*.test.*'`
  — nothing. Theo's `src/__tests__/no-route-test-files.test.ts` passes, so the Metro-bundling failure
  Tia hit cannot come back silently.
- 135 changed paths, 27 untracked — **every one is declared work**, no scratch or probe files. HEAD
  is still `4afb0f0`; nothing is committed.
- `docker` — **not installed** (`docker not found`). The migration blocker is real on this machine.

**Verified in the files myself, not taken from a log**
- **Money maths did move this phase and the old figures did not.** `src/lib/loan.ts` is +349/−34
  (conventions, overpayments, Reg Z APR; `round2`/`toCents` lifted into the new `src/lib/money.ts`).
  Against that, `git diff --numstat src/lib/loan.test.ts` is **727 insertions and 0 deletions** — the
  45 pre-existing fixtures, the real lender statement among them, are byte-identical and green. That
  is the strongest evidence available that no saved loan's figures moved, and it is why I am content
  with a refactor this size in the one file the house rules protect.
- Blocker 2 fixed: `src/components/ui/switch-control.tsx` exists; `grep -rn '<Switch' src` returns
  exactly one line, inside `SwitchControl`. All five call sites converted.
- Blocker 3: `src/app/pro.tsx:235` is `{__DEV__ && devNote ? (` — the debug line cannot reach a
  Release bundle. `src/lib/pro-bypass.ts:73` is `if (!__DEV__) return false`.
- End-date bug fixed at **three** layers in `src/app/add-bill.tsx`: `minDate` on the picker (`:566`),
  the "To" silently cleared when the start moves past it (`:510`, `:572`), and a save-time refusal
  (`:269`) comparing ISO days with no clock and no timezone.
- Blocker 1 (hit-box): I found no evidence against the CEO's non-reproduction. The only structural
  candidate left is `skip-tab-bar.tsx:40`'s `paddingBottom: Math.max(insets.bottom, 12)` under a tab
  screen whose `Screen` (`screen.tsx:120`) also asks for the bottom edge — but padding moves paint
  and hit box together, so it would read as extra space, not an offset target, and the CEO saw the
  bar respond where drawn. Closing it as a tester coordinate artefact.

**The migration dependency, stated precisely.** Two files, neither ever executed:
`supabase/migrations/20260912100001_receipt_reminder.sql` and `…20260912100002_monthly_rests.sql`.
There is a **third** dependency nobody has been calling out: `supabase/functions/send-push/index.ts`
is +88 lines on this branch and the deployed version is **7** (Dilip's live `supabase functions
list`). Applying the migration without redeploying the sender gives a silent no-op — the columns
exist, nothing reads them.
- *On the Founder's phone, installed before the push:* the Reminders screen **loads**. Dana split the
  page-level failure, so six of the seven reads carry the page and only the receipts card degrades:
  the caption becomes "Skip could not check whether this one is on.", a "Try again" `TextLink`
  replaces the switch, and the reminder drops out of the "N of M will let you know" count instead of
  being guessed at (`reminders.tsx:147,308,316`). Tia's full-page error was the pre-fix behaviour.
  The daily receipts reminder simply cannot be turned on, and never fires.
- *Also before `…100002`:* saving a monthly-rest loan raises `loans_day_count_basis_check` and the
  raw Postgres message lands in `save-loan.tsx:117`'s error line. Nothing is written and no figure is
  corrupted — but where the app used to refuse politely it now shows database text. One path, one
  ugly string, reversible the moment the migration lands.
- *To the App Store before the push:* every user's Reminders screen ships with a permanently broken
  card advertising a feature that can never be switched on. That is the line I will not cross.

**Coverage, honestly**
- *Device-verified* (Tia's 09-12 walk, iPhone 17 Pro, plus the CEO's spot checks): Home end to end;
  add-receipt and add-bill save + delete round trips with list totals to the cent
  (−$77.00/3 → −$17.00/1 receipts; −$1,032.00/2 → −$1,030.00/1 bills); back-a-step preserving typed
  data; Transactions ascending across two months; Bills/Receipts/Cards lists; Settings; dark mode
  with Butter and Plum; Insights; Loan calculator; Loan schedule; the paywall. CEO: Continue and the
  tab bar respond where drawn, Haptics toggles off and on by tap.
- *Unit-tested only, never rendered:* every money figure in the branch, including Drew's monthly-rest
  stub fixture ($502.38 payment, $228.17 first posting, $24,725.79 owed, $5,142.83 term interest,
  $502.41 final — hand-computed in Decimal before the engine was run); Reg Z APR; `payoffDate`;
  `formatTerm`; the seven-read reminders error page; the Cards wallet `PageState`; the keyed
  savings-month form; `NOTHING_UPDATED`; `useSalaryAccountIds.isError`; `forgetDevice` on sign-out;
  the notification-tap allow-list; the scanner degrade path; `SwitchControl`; the date-picker floor.
- *Untested by anyone, on a device or in a test:* add-subscription / add-card / add-account /
  add-group / add-member end to end; **edit persistence** (reopen a saved record, change a field,
  confirm it stuck) — and with it the `NOTHING_UPDATED` message, which has never been on a screen;
  the receipts reminder end to end; Splits, Settle up, Group settings, Friends, Savings,
  Savings month, Salary, Tour; small-device post-login; Dynamic Type; the `percent` variant of
  `AmountPad`; the Settings → Reminders row after Dana's haptics fix (the CEO adjudicated the load
  error, not Tia's separate dead-row report); a real notification tap; VisionKit on a real receipt;
  sign-out actually deleting a `device_tokens` row.

**One stray I found that nobody has flagged:** `supabase/.temp/cli-latest` is a tracked file and is
modified in this working tree — a Supabase CLI temp artefact caught in the diff. Revert it or
gitignore it before any merge commit. Cosmetic, but it does not belong in the branch's history.

**Recommendation**
- **(a) Founder's two iPhones, for their own use: SHIP WITH CONDITIONS.** Conditions: know that
  Reminders' receipts card will sit in its degraded state until the migrations are pushed; do not
  save a monthly-rest loan with an odd first period until `…100002` lands; if it is a dev-client
  build, the Fake Pro switch and the paywall debug line are expected and are dev-only. The Founder's
  real financial data is on that account, so the untested edit-persistence path is the one to treat
  gently — but `useUpdate` now fails loudly rather than lying, which is strictly safer than what is
  on their phone today.
- **(b) Merge to `main` + App Store deployment: DO NOT SHIP** as one step. Gate list, in order:
  apply both migrations against a real database with a transcript; redeploy `send-push`; run N6/N7
  from the audit file; then a device pass on the five untested add flows, edit persistence, and the
  receipts reminder end to end. Merging to `main` on its own is defensible as a separate, earlier
  step once the migrations are pushed in the same window — it is the App Store half that is blocked.

**Backlog, with owners**
1. **Tia** — the five untested add flows end to end (subscription, card, account, group, member);
   edit persistence on a saved record; the Settings → Reminders row re-tap; Splits, Settle up, Group
   settings, Friends, Savings, Savings month, Salary, Tour; iPhone SE post-login; Dynamic Type; the
   `percent` `AmountPad`. Needs a Pro account for the splits half.
2. **Theo** — `src/api` zero-coverage files (`brands`, `contact`, `oauth`, `onboarding`, `pro`,
   `refresh`, `scan`, `splits`); `reminders.ts` at 37.2%; `charges.ts` at 24.3%; tests for
   `settle-up.tsx` and `group-settings.tsx` (Dana's open question 1); the cosmetic `act(...)` warnings
   in `mutations.test.tsx` / `reminders.test.tsx`.
3. **Founder / CEO** — install Docker or authorise the push; apply `20260912100001` and
   `20260912100002` in that order with a transcript; redeploy `send-push`; run the read-only `cron.job`
   and 401 checks (audit §Checks 1–2). Nothing else on this branch can be finished without it.
4. **Founder** — the receipt-images decision (N20): a live bucket with zero objects and no writer,
   against a published promise that the photo never leaves the phone. Either the bucket, column and
   delete-account cleanup go, or the promise changes.
5. **Dilip** — remove `expo-blur` and `expo-linear-gradient` only (N22; the other two are
   expo-router's own dependencies); needs `pod install` under a UTF-8 locale and one clean device
   build, verified in the built `.app` rather than by exit code.
6. **Dilip** — `ios/SkipBudget/SkipBudget.entitlements` hardcodes `aps-environment = development`
   (confirmed by me at `:5-6`) and `push.ts` registers every token as `development`. Whether an App
   Store export rewrites it is unproven. One check before any TestFlight build.
7. **Priya** — `SwitchControl` gives up the iOS thumb drag (Dana's open question 1); the FAB position
   over the destination list; Transactions/Receipts opening scrolled to the bottom with the controls
   off-screen; the `BASIS_FOOTNOTES.monthly` silence about the opening stub; the revoked-permission
   copy (N4).

**Open questions**
1. A Pro test account is still the single highest-value thing anyone can hand this team — it is now
   the only thing standing between Tia and the Splits half of the backlog.
2. Who re-taps the Settings → Reminders row? Dana could not reproduce the dead row and fixed the one
   mechanism she found (`haptics.ts` throwing synchronously before `router.push`), but the CEO's
   adjudication covered the load error, not the dead row. It is one tap and it closes Tia's blocker 4
   completely.
3. `supabase/.temp/cli-latest` — revert or gitignore before the merge commit.

## 2026-09-12 — Tia (Tester) — rough test sweep (post-migration), `almost-done-all-pages`

**Outcome.** Partial. Confirmed the three fixes the brief called out are real (Reminders end-to-end,
monthly-rest loan save, Settings switches toggle off by tap), found one solid code-verified BLOCKER
(transaction rows have no tap handler at all in two of the app's list views), and one reproducible
but not-fully-root-caused navigation glitch (taps near the tab bar sometimes activate the tab bar
instead of the content row above it). A large share of this session's time went into re-deriving the
screenshot-to-device-point scale factor after my own early taps used unconverted pixel coordinates —
several things I nearly filed as bugs (the step-flow/tab-bar "hit-box offset", dead Settings rows)
turned out to be my own coordinate error once I recalibrated properly (native screenshots are
1206×2622px, exactly 3× the 402×874pt device space; the tool's rendered preview is ~920px wide, so
preview-pixel/2.286 ≈ device point). Recording that scale factor here since it cost real time. Did not
sign out, edit app code, or enter real credentials/payment.

**Bugs, ranked**

1. **Major (confirmed in source, not a tap-coordinate issue) — receipts, bills, subscriptions and
   income entries cannot be opened, edited, or deleted from either place a user naturally sees them.**
   `src/app/(tabs)/transactions.tsx:319` renders `<LedgerRow key={entry.id} entry={entry}
   sourceLabel={...} kindLabel={...} />` — no `onPress`. `src/components/transactions/ledger-row.tsx`
   explicitly accepts and wires an `onPress?: () => void` prop (`:15`, `:34`), so the row is a
   `Pressable` with nothing to call. Same pattern at `src/app/(tabs)/home.tsx:348` — `<TransactionRow
   label=... amount=... />` with no `onPress`, even though
   `src/components/dashboard/transaction-row.tsx:20` defines the prop identically. I tapped, long-
   pressed (1.2s) and swiped a real "Tia QA Store" receipt row on both the Transactions tab and Home's
   "Recent" list, at pixel-measured coordinates confirmed correct by cropping the native screenshot
   (device (200, 660) on Transactions, (200, 434) and (100, 434) on Home) — no response, no swipe
   action, nothing, which matches the missing prop exactly. **The dedicated `receipts.tsx` and
   `bill-plans.tsx` screens do wire `onPress` correctly** (`receipts.tsx:261` →
   `router.push('/add-receipt?id=...')`, `bill-plans.tsx:209` → `router.push('/add-bill?id=...')`), and
   are reachable from Home's "Where it goes" list (see bug 2) or `skipbudget://receipts` — so the fix
   is either wiring `onPress` on the two combined-ledger views, or accepting that the combined views
   are read-only and documenting it. As shipped, a user who taps a transaction from the two most
   prominent lists in the app (Home and the Transactions tab) gets no feedback at all.

2. **Major, reproducible, not fully root-caused — taps aimed at the last row of a scrollable list
   sometimes land on the floating tab bar instead.** On Home's "Where it goes" card, tapping the
   "Insights" row (its own full-width bordered card, not part of the "Where it goes" list) at
   pixel-measured device coordinates (250, 808) and (250, 827) — both comfortably on the visible
   "Insights" label — instead activated the **Home** tab and then the **Transactions** tab
   respectively (confirmed via the resulting screenshots, including one that showed my stale "Tia"
   search text on the Transactions screen). The floating tab bar's own hit area sits at device
   y≈782–827 (measured by cropping the native 1206×2622 screenshot and dividing by 3). When a content
   row's true tap target falls inside or very close to that band, the tab bar wins. I could not isolate
   the exact mechanism (z-order vs. hitSlop vs. absolute positioning) in the time available, and I
   want to flag that my own coordinate mistakes account for a lot of apparent unresponsiveness this
   session (see Outcome) — but this specific case was measured carefully, twice, with two different
   observable wrong destinations, so I'm reporting it as real. Likely candidates: `skip-tab-bar.tsx`'s
   `paddingBottom`/hitSlop, or the `DestinationList`/`Insights` card's own bottom margin interacting
   with the floating bar's absolute position.

3. **Major, transient — raw exception text surfaced to the user on an Add Receipt save.** First Save
   attempt on step 3 of Add Receipt (amount $12.34, store "Tia QA Store", today) returned:
   `Error: fetch failed: UnexpectedException: The network connection was lost. (at
   ExpoModulesCore/Promise.swift:56)` in place of the normal success flow. A second, identical tap on
   Save one screenshot later succeeded normally (receipt saved, list total updated to the cent). Could
   not force a second repro; flagging as a real, witnessed failure mode rather than a confirmed
   deterministic bug — the underlying transient network hiccup is plausible on a simulator, but the raw
   Swift/Promise text reaching the screen is not acceptable user-facing copy regardless of cause.
   Screenshot: `.claude/team/testing/screenshots/add-receipt-raw-network-error.png`.

**What passed (all previously-reported blockers from earlier 09-12 sessions, re-verified)**
- **Reminders screen (item 3): fully fixed.** Reached via Settings row and via
  `skipbudget://reminders` — loads instantly, no error, no dead row. The bills reminder card and lead-
  time chips render correctly. Daily receipts reminder switch toggled ON by a single tap, defaulted to
  8:00 PM without needing the time picker, left the screen (edge-swipe back) and returned — still ON
  at 8:00 PM, confirming persistence — then toggled back OFF by a single tap. This closes the earlier
  "Reminders row does not navigate + screen errors" blocker completely.
- **Loan calculator, Monthly rests + odd first period (item 5): fixed.** Set convention to "Monthly
  rests", money received 12 Aug 2026, first payment moved to 25 Sep 2026 (a 44-day first period, well
  off the 30/31-day norm) — "44% of your first payment is interest" banner rendered, Save opened the
  payment schedule with no error and no raw Postgres text. Confirmed via the Bills list afterward that
  saving the loan did **not** create a stray bill (still exactly "1 recurring bill" / Housing /
  −$1,030.00), so no extra cleanup was needed for this test.
- **Settings switches toggle off by tap (item 4): fixed.** Fake Pro and Haptics both went ON and then
  OFF with a single plain tap each, no swipe workaround needed (this was a filed blocker in an earlier
  09-12 session).
- **Add Bill, Specific period end-date validation (item 2): fixed.** Start date 12 Sep 2026, switched
  to "Specific period", opened the "To" date picker — days 1–11 render visibly greyed and are
  unresponsive to tap (tried day 5 explicitly; header stayed on "12 Sep 2026", no selection changed).
  This closes a Major bug carried over from two earlier 09-12 sessions.
- **Add Receipt / Add Bill stepped flows:** keypad entry, Continue, back-chevron across steps
  preserving typed values (amount, store, category) all worked correctly on both flows. Add Bill's
  category pre-step correctly pre-filled the Name field and Category chip (picked "Internet").
  Cancelling an in-progress Add Bill (back to step 0, then exit) left no stray data — Bills list
  unchanged before and after.
- **Receipts screen** (`skipbudget://receipts`, also reachable from Home's "Where it goes" list away
  from the tab-bar interference zone in bug 2): search, Add, filter icon, edit (tap a row → prefilled
  Edit receipt with Store chip and Delete link), delete confirmation dialog ("Delete this receipt? /
  This cannot be undone."), and list totals all correct to the cent.
- **Dashboard order** (Settings → Dashboard order): opens correctly, shows all 5 destinations
  (Monthly Bills, Receipts, Subscriptions, Loan calculator, Split manager) numbered 1–5 with working
  up/down arrows, first/last correctly disabled at the ends.
- **Appearance:** Dark mode + Coral and Dark + Plum both rendered with correct contrast; reset to
  Light + Plum at the end confirmed correctly (screenshot not needed, visually unambiguous).
- **Settings row navigation**, once tapped at pixel-verified coordinates: Bills, Terms of service,
  Appearance, Dashboard order, Reminders all navigated correctly on the first properly-aimed tap —
  several earlier apparent failures this session were my own coordinate math, not the app (see
  Outcome).
- **Money to the cent:** Tia QA Store $12.34 receipt pushed Receipts from −$17.00/1 to −$29.34/2,
  then deleting it returned the list to exactly **−$17.00 / 1 receipt (Desi Bits)** — the pre-existing
  baseline, confirmed unchanged throughout.

**Could not test this session (time)**
- add-subscription, add-card, add-account, add-group, add-member full save/delete flows.
- Edit-persistence proper (reopen a saved record, change a field, save, reopen, confirm the change
  stuck) — I only verified open → view → delete on the receipt, not open → edit-a-field → save →
  reopen.
- Splits, Settle up, Group settings, Friends, Savings, Savings month, Salary, Tour.
- iPhone SE / small screen, Dynamic Type, pre-auth Welcome copy.
- Pull-to-refresh on Home; Transactions ascending-order re-check (confirmed in an earlier 09-12
  session, not re-verified this time).
- Home quick actions (Receipt/Bill/Subscription/Salary icons) and "Add a card or account" checklist
  row — reached the stepped flows via a different path (Home destination tiles) after an unrelated
  detour; did not specifically re-confirm the four quick-action icons route correctly this session.

**Test data created and deleted**
- Created and deleted one test receipt: **Tia QA Store, $12.34, today (12 Sep 2026)**. Confirmed
  Receipts list returned to exactly **−$17.00 / 1 receipt (Desi Bits)** — the real, pre-existing entry
  — after deletion.
- Started but **cancelled without saving** one test bill (category Internet, $60.00, Specific period)
  used only to verify the date-picker fix; Bills list unchanged (−$1,030.00 / 1 bill / Housing)
  throughout and after.
- Ran one Loan calculator scenario (Monthly rests, $25,000, 25 Sep 2026 first payment) through to the
  schedule screen; confirmed no bill was created as a side effect.
- **Reset before finishing:** Fake Pro switched back OFF (Settings → Developer); Appearance reset to
  Light · Plum. Both confirmed via screenshot.

**Open questions**
1. Bug 1 (missing `onPress` on `LedgerRow`/`TransactionRow`) is a one-line-per-callsite fix and the
   highest-value item on this list — it currently makes the two most-used transaction lists in the
   app inert to touch.
2. Bug 2 (tab-bar vs. last-row hit-testing) needs an engineer with access to the layout tree; I could
   only confirm it happens, not why. Worth checking `skip-tab-bar.tsx` and whether the floating bar's
   touchable area is z-ordered above sibling scroll content near the bottom of the screen.
3. I would not re-litigate the earlier "hit-box offset" and "dead Settings row" bugs from prior 09-12
   sessions without a fresh, pixel-measured repro — several of my own early taps this session looked
   identical to those reports and turned out to be my coordinate math, not the app.


## 2026-09-12 — Tia (Tester) — round 2, coverage sweep (amount figure, 5 add-flows, bill date validation, Fake-Pro screens), `almost-done-all-pages`

**Outcome.** Partial pass. Covered every item in the brief. The amount-figure fix, all five add-flow
lifecycles (subscription/card/account fully to persistence; group/member blocked), the bill
date-order validation, and the Fake-Pro screen sweep are all done. One environment-level finding
blocked the Splits half of item 4: the account's real Supabase `entitlements` row has no Pro grant,
and `Fake Pro` is a client-only display toggle (`src/api/pro.ts:172`, `bypass || sdkPro === true ||
server.data === true`) that does not touch that row — so every server-enforced free-tier wall
(`supabase/migrations/20260831100007_pro_wall.sql`, `20260831100008_splits_are_pro.sql`) still fires
exactly as it would for a real free user. Did not sign out, edit app code, or enter real
credentials/payment. Coordinates below are device points (0–402 × 0–874) unless marked "pixel"
(919-wide preview, ÷2.286) or "native" (1206-wide, ÷3).

**Bugs, ranked**

1. **Major, environment/UX — Fake Pro does not unlock server-enforced Pro walls, and the resulting
   database exception text is confusing next to Settings' own claim.** With Fake Pro ON and Settings
   reading "Skip Pro — active", tapping **Create group** in Add Group (name "Tia QA Group", airplane
   icon, step 2 defaults) at device (201, 769) returned inline red text **"The split manager is part
   of Skip Pro."** — the literal string raised by `supabase/migrations/20260831100008_splits_are_pro.sql:19`.
   Reproduced twice, deterministically. The same pattern hit **Salary** independently: adding a second
   income source ("Tia QA Salary", $2,000/mo, last payday 5 Sep 2026) and tapping Save returned **"Free
   keeps one — Skip Pro removes the limit."** from `enforce_free_allowance` in the same migration file.
   Both are legitimate, readable database messages (not raw stack traces like the prior session's
   network error), and `saveErrorMessage` (`src/lib/save-error.ts`) is working as designed by passing
   them through untouched — but a screen that says "Skip Pro — active" one tap away from a screen that
   says "is part of Skip Pro" is a contradiction a real user could hit too, any time the client's SDK
   cache briefly disagrees with the server (lapsed subscription, webhook lag). This also meant **Splits,
   Settle up, Group settings, and a real Add Member save could not be exercised this round** — group
   creation is the entry point for all of them. Screenshot:
   `.claude/team/testing/screenshots/add-group-fake-pro-blocked-raw-sql-error.png`.

2. **Minor, transient, twice-reproduced — reopening Edit immediately after a successful Save can show
   one stale pre-edit render.** After editing the test Account's colour (orange → blue) and Save,
   the Cards list correctly showed "Savings" + blue immediately. Tapping Edit again the very next time
   showed **Checking + orange** — the pre-edit values — for that one open; back out and Edit again showed
   the correct Savings + blue. Reproduced identically on the test Card (network Visa → Mastercard):
   the immediate next Edit open showed Visa again, next one after that showed Mastercard correctly. Not
   reproduced on Subscription (status change reflected immediately and consistently on every reopen). The
   underlying data was never wrong — only the Edit form's very first read right after its own successful
   write flashed the old value once. Likely a query-cache race between the mutation's optimistic update
   and the refetch that backs the Edit screen's initial state.

3. **Minor, cosmetic, single observation — Subscriptions list icon-matching can assign an unrelated
   real-brand logo to a custom service name.** The test subscription, typed as "Tia QA Streaming" via
   the "Add '...'" custom-service option, showed a purple **EA-style angle logo** on the Subscriptions
   list, while the Edit screen for the same record correctly showed a generic "TQ" monogram avatar. Low
   confidence / not re-verified a second time — flagging for someone with source access to `brand-field.tsx`
   or the brand-matching lookup to confirm whether a fuzzy match against real brands is firing on
   custom-typed names.

**Passed**

- **Amount figure fix (item 1, Pia's fix) — confirmed fixed, all three bands.** Add Account: typed
  3000 → "$3,000" rendered at hero size (64px band) correctly cap-aligned beside "$"; Continue to step 2
  showed the same figure; **back chevron to step 1 preserved the correct hero rendering** — this was
  the Founder's exact reported bug (small number dropping below the "$") and it did not reproduce.
  Cleared and typed 12345678 (8 glyphs) → correctly dropped to the second band (48px), still aligned.
  Screenshot: `add-account-8glyphs-12345678.png`. Cleared and typed 123456789.99 (14 glyphs) → correctly
  in the third band (36px), still aligned. Screenshot: `add-account-14glyphs-123456789-99.png`.
- **Add Subscription — full lifecycle.** $45 (typed via keypad — see note below on my own coordinate
  slip that produced $45 instead of an intended $15, harmless for this test), custom service "Tia QA
  Streaming" via the "Add '...'" option, Monthly billing, saved → appeared correctly in
  Subscriptions ($45.00/mo, 1 plan). Reopened, changed Status from Active to Cancelled (a later-step
  field) — Monthly-total banner updated live to $0.00 with no extra navigation needed, confirming the
  edit persisted without even needing to leave the screen. Deleted via the row → confirmation dialog →
  list returned to "No subscriptions yet" / 0 subscriptions.
- **Add Card — full lifecycle.** $100, "Tia QA Card" + auto-suffixed digits from a tool text-entry
  quirk (see note), •••• 2468, Visa default, saved → appeared on Cards ($100 owed). Reopened, changed
  Network from Visa to Mastercard (a later-step field), Save → detail immediately read "Mastercard".
  Left and returned via deep link → still Mastercard (edit persistence confirmed past the transient
  blip in bug 2). Deleted → confirmation dialog → "No cards yet."
- **Add Account — full lifecycle.** $500 Checking, bank/account-name fields, •••• 4321, saved →
  appeared on Cards ($500). Reopened, changed Card colour (orange → blue, correctly requiring the
  colour-picker's actual device coordinates rather than my first, wrong guess — see note) and Account
  type (Checking → Savings), Save → detail read "Savings" + blue. Left and returned → still Savings +
  blue (past the bug-2 blip). Deleted → confirmation dialog → "No bank accounts yet."
- **Add Bill, Specific period "To before From" (item 3) — confirmed impossible, still fixed.** From
  date defaulted to today (12 Sep 2026). Opened the "To" date picker (a month/day two-step native-style
  dialog, distinct from the grid picker in the last session's note) and tried day 5 (before From) —
  no selection, header stayed "12 Sep 2026". Tried day 20 (after From) — selected immediately, header
  updated to "20 Sep 2026", OK committed it, and the form showed "To: 20 Sep 2026" with a "Clear — make
  it ongoing" link. Exited the flow without saving (test only, no bill created).
- **Fake-Pro screen sweep (item 4), everything reachable without a group.** **Friends**: code, Share my
  code, Add a friend by code, empty state all correct. **Savings**: correct "Nothing yet" empty state
  with an honest explanation (first month not finished). **Savings month** (no id): "That month is not
  on your savings" — handled gracefully rather than erroring. **Salary**: added a second source via
  "+ Add salary source", used the dedicated **AmountPad** screen (typed $2,000 cleanly on the second
  attempt once I found its keypad sits ~33pt lower than the flow's own keypad — see note), set Last
  payday via the calendar (5 Sep 2026 → correctly computed "Next payday 5 Oct 2026"), then removed the
  unsaved source via the trash icon → "Remove Tia QA Salary?" confirmation → "Remove", leaving the
  pre-existing "Komal Pay" $1,880/twice-a-month source completely untouched throughout. Hit the same
  Pro-wall pattern as bug 1 when attempting to Save with two sources present (expected, not a new bug).
  **Tour** ("What Skip can do"): six cards render fully, nothing clipped. **Contact**: pre-fills real
  name "Sam" and email from the signed-in account; did not tap Send (no real support ticket created).
  **FAQ**: accordion expand/collapse works correctly (verified on "Why doesn't Skip connect to my
  bank?"). **Privacy** and **Terms**: both render fully with no clipping, dated 28 August 2026.
  **Split manager list, Group settings (no id)**: both handle the no-group state gracefully — the list
  shows "No groups yet" / "Create a group", and a bad group-settings deep link shows a clear "That
  group is not here" empty state with a "Back to splits" button, rather than erroring.
- **Reset (item 5) — confirmed.** Fake Pro toggled OFF; Settings' Skip Pro row reverted from
  "active" to the real "$1.99/mo or $19.99/yr" pricing, confirming the account is genuinely free-tier
  and the toggle's OFF state is honoured. Tapping Appearance afterward correctly redirected to the
  Pro-feature paywall explainer (client-side gate working as intended once Fake Pro is off) rather than
  opening the picker — did not purchase. Appearance was **already** Light · Plum both before and after
  this session; no change was needed and none was made.

**Test data created and deleted**

- Add Account: "Tia QA BankEverydayEveryday" (see note), $500, Checking → edited to Savings + blue,
  •••• 4321 — created, edited, reopened to confirm, **deleted**; Cards screen confirmed "No bank
  accounts yet." afterward.
- Add Card: "Tia QA Card" + auto-suffixed digits, $100, Visa → edited to Mastercard, •••• 2468 —
  created, edited, reopened to confirm, **deleted**; Cards screen confirmed "No cards yet." afterward.
- Add Subscription: "Tia QA Streaming", $45.00/mo, Other category → edited to Cancelled — created,
  edited, **deleted**; Subscriptions confirmed "No subscriptions yet" / $0.00 afterward.
- Add Group: "Tia QA Group" — form-only, never persisted (blocked by bug 1); nothing to delete.
- Add Member: "Tia QA Friend" typed into a groupless Add Member screen — form-only, never persisted;
  nothing to delete.
- Add Bill: Internet / $60 / Specific period 12–20 Sep 2026 — used only for date-picker validation,
  exited without saving; Bills confirmed unchanged at 1 recurring bill / Housing / −$1,030.00 throughout
  and after.
- Salary: "Tia QA Salary", $2,000/mo, last payday 5 Sep 2026 — added, then removed via the trash-icon
  confirmation before ever saving; "Komal Pay" ($1,880, twice a month) confirmed untouched, total
  confirmed unchanged at $3,760.00/month before, during, and after.
- **Could not create, so nothing to delete:** a real Splits group, a real group member, a saved
  Specific-period bill.
- **Reset confirmed:** Fake Pro OFF (Settings shows real pricing, not "active"); Appearance Light ·
  Plum (unchanged throughout — never needed a reset).

**Notes on my own coordinate/tooling mistakes this session (recorded so the next session doesn't
re-litigate them as app bugs)**

1. The screenshot preview the control tool shows is **919px wide**, i.e. pixel/2.286 = device point —
   confirmed again this session, but I repeatedly slipped and used a screenshot's raw pixel value
   directly as a device-point coordinate (no division), which produced several early "unresponsive
   button" moments (Cards tab, Skip Pro row, the Bill date-picker "Next"/"OK" buttons, the Salary
   amount-pad) that were entirely my own math, not the app. Native `simctl` screenshots are 1206px
   wide, i.e. pixel/3 = device point — most reliable when precision actually mattered (colour swatches,
   Save-button rows), and worth reaching for immediately rather than eyeballing a preview.
2. **The floating tab bar did not respond to taps this session either** (Cards/Home icons, both at
   correctly-converted coordinates) right after an Add Account save landed on Settings unexpectedly —
   this matches the tab-bar issue Dana is already fixing per the brief, so I did not investigate further
   and used `skipbudget://` deep links to navigate instead for the rest of the session.
3. The dedicated **Salary AmountPad** screen (`src/components/ui/amount-pad.tsx`, used from
   `salary.tsx`) has its keypad centred about 33pt lower (device y-centres 510/585/660/734) than the
   stepped-flow's own keypad (`amount-keypad.tsx`, y-centres 477/552/626/701) — same three x-columns
   (77/201/324) in both. Cost real time before I measured it directly; worth remembering as a genuine
   layout difference between the two components, not a bug.
4. Typed multi-word text (`"Tia QA Bank"`, `"Everyday"`) into TextFields intermittently arrived missing
   its last word, or landed in the wrong (previously-focused, off-screen-scrolled) field after a
   keyboard-driven auto-scroll — worked around with Select-All-and-retype rather than filing as an app
   bug, since it was inconsistent, and Card and Account editing/name fields function correctly by
   direct inspection (`text-field.tsx` has no length or word-count logic that would explain a dropped
   word). The one deliberate $45-instead-of-$15 amount in the Subscription test was my own row
   miscount, not a repeat of this issue.

**Open questions**

1. Bug 1 needs a Founder/CEO-level decision, not a code fix: either grant the Sam test account a real
   `entitlements` row (`pro = true`) so Fake Pro's client-side promise matches the server for testing
   Splits, or accept that Splits/Settle up/Group settings/Add Member's real save path cannot be verified
   under this test setup and needs its own Pro-provisioned account.
2. Bug 2 (stale Edit-reopen render) is real but light — worth a quick look at whether the Edit screens'
   initial state comes from a query that hasn't invalidated by the time the very next navigation reads
   it, right after that same screen's own successful mutation.
3. Bug 3 (EA-style logo on a custom subscription name) is a single observation, not re-verified twice —
   flagging rather than asserting; someone with time to check the brand-matching source should confirm
   before treating it as confirmed.
