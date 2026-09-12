# Development team log

Newest entry at the bottom. Each entry: date, name, outcome, what changed, open questions.

---

## 2026-09-11 — Dmitri (Development Team Lead) — engineering gate on the design refresh

**Outcome:** Partial — **ready after fixes**. The "no backend change" guarantee holds exactly: nothing
under `src/api`, `src/lib`, `src/stores`, `supabase/`, `ios/` or `app.json` is modified, and the only
untracked source files are the two declared new components plus one undeclared leftover. Every route,
hook, figure and prop the old dashboard passed is still wired in the new one, `tile_order` still
drives the order and PRO gating is unchanged — I proved all three by rendering the components rather
than reading them. Two blockers, six should-fixes.

**Blockers**
1. `src/components/dashboard/destination-list.tsx:146` — a destination row worth `$0.00` renders with
   no colour at all. Rendered proof: zero row `style = {}`, non-zero row `style = {"color":"#B85040"}`;
   the className carries no `text-*` either. `useMoneyColor()` returns `undefined` at zero and the
   house pattern (`transaction-row.tsx:82`) pairs it with `text-ink` — this one dropped the fallback,
   so the figure falls to the platform default black and is invisible on the dark card. Every new
   account sees three such rows. Fix: add `text-ink` to the className. — Dana
2. `src/components/dashboard/__smoke.test.tsx` — undeclared leftover scratch file. It breaks
   `npm run check`: `npm test` 1 suite failed / 242 tests passed, `npm run format:check` fails on it.
   Both designers reported "tsc and lint clean" and neither ran the project's own gate. Fix: delete
   it. — Dmitri

**Should-fix**
3. No component in this repo can be rendered under jest, which is why the smoke test above never
   worked. Four separate causes, all reproduced: lucide ships `.mjs` on the `react-native` export
   condition and is outside `transformIgnorePatterns`; reanimated 4 pulls `react-native-worklets`,
   which wants a native module; AsyncStorage needs its own mock; and NativeWind's babel preset injects
   `_ReactNativeCSSInterop` into any `jest.mock` factory that builds elements, making the obvious
   workaround illegal. 242 tests pass and every one is pure logic. The "presentation only" guarantee
   therefore has no automated backing. ~half a day for a `jest.setup.js`. — Dilip
4. `src/components/dashboard/balance-summary.tsx` — `text-on-control/70` on the Income/Expenses labels
   and the "% spoken for" caption fails AA on 4 of 12 accents (coral 4.39, rose 4.12, lavender 4.27,
   taupe 3.67; floor 4.5), measured with the project's own `contrast()`. New exposure: those labels
   moved off `text-muted` on `bg-card`, which passed. `/85` clears it on all twelve (worst taupe 4.72). — Dana
5. Audit finding 1 is 4 of 8 fixed. Still hardcoding `colors.surface` on an accent fill:
   `ui/date-picker.tsx:76,84`, `bills/category-picker.tsx:43`, `bills/icon-picker.tsx:33`,
   `splits/group-icon-picker.tsx:31`. Fix: `colors.surface` → `colors.onControl`. — Dana
6. Typed routes defeated. `(tabs)/home.tsx:37` `Record<string, string>` + `router.push(href as never)`
   at :184 and :207; `quick-actions.tsx:14` `href: string`. The old screen passed literals that
   expo-router checked at compile time. Fix: type both as `Href` and drop the cast. — Dana
7. `src/app/hello.tsx` — the new `isLoading` guard has no `isError` sibling, so a failed profile fetch
   drops through to the name form and asks a returning user their name again. — Diego
8. `src/components/ui/source-tiles.tsx:43` — `border-black/10` → `border-line` on a swatch filled with
   the user's own `source.color`, not a theme surface. `border-line` is invisible against a pale
   swatch; the old value was invisible against a dark one. `border-ink/10` follows the mode. — Dana

**Nits:** no haptic on the new destination rows (`destination-list.tsx:101`) while `QuickActions` has
one; `multi-choice-chips.tsx:48` check dropped to `strokeWidth 1.8` at 14px while
`getting-started-card.tsx:78` keeps 3; the radius sweep is partial by design (~25 files outside
`ui/*` and `add-*` still on `[8px]`/`[10px]`/`[14px]`); `spendingCategories[].artwork` is now read by
nothing and `dashboard-mock` still exports four dead symbols. `AmountTile` is **not** dead —
`(tabs)/cards.tsx:231` still uses it, so it correctly survives.

**Assessed, not implemented (the two escalations)**
- `src/api/queries.ts` `useLedger` — `isError: receipts || subscriptions || bills` omits `salary` and
  `charges`. Higher impact now that Home advertises error states it cannot always reach: a `salary`
  failure zeroes `totals.in`, so the hero shows "Left this month" as a large negative with no error
  and no progress bar; a `charges` failure makes every past bill and subscription occurrence
  *projected* instead of read off the record, so historical figures silently become scheduled amounts
  rather than what was actually charged — the bank-statement rule broken by a network blip. The other
  ledger aggregate has the mirror gap (`cards || accounts || payments`, omitting receipts/bills/
  subscriptions/charges), and `useSourceBalances` (:701) exposes no `isError` at all, which is why
  `insights.tsx` can only aggregate seven of eight. Cost: ~half a day — Diego for the hooks, Drew for
  a fixture proving projected ≠ recorded on a month with a recorded charge. After this merge.
- Four unused native deps: `expo-glass-effect@57.0.1`, `expo-symbols@57.0.2`, `expo-blur@57.0.2`,
  `expo-linear-gradient@57.0.1`. Zero source imports, none in `app.json` plugins, but all four are
  compiled pods in `ios/Podfile.lock` — autolinking only. Confirmed against the SDK 57 module list
  that all four are genuine SDK 57 modules, so this is dead weight, not version drift. Cost: ~1 hour
  plus one clean device build. — Dilip, after this merge.

**Checks I ran myself:** `npx tsc --noEmit` clean (exit 0). `npx expo lint` clean — verified it really
covers the tree, 208 files / 0 errors / 0 warnings. `npx prettier --check .` fails only on the
leftover smoke test (plus `app.json` and the `.claude/` docs, both pre-existing). `npx jest` 242 tests
pass, 1 suite fails — the leftover. Verified against https://docs.expo.dev/versions/v57.0.0/: SDK 57 =
RN 0.86 / React 19.2.3, the refresh adds no Expo module, and `Redirect` is the documented expo-router
API for the `hello.tsx` fix. All 22 lucide names used are present in the installed 1.33.0. Paulo's
`danger` token contrast reproduces exactly with the project's own `contrast()` (5.59 / 5.32 light,
6.09 / 7.26 dark, vs 3.05 for the `#DC2626` it replaces), and `tokenVars` picks it up generically, so
it follows the mode correctly.

**Could not verify:** nothing on a device or Simulator — no eyes on the render. Dark mode, the twelve
accents and the hero's two figures still need Tia. I did not check the paywall against a live store.

**Open questions**
1. Finding 4 — `/85` is a measured fix, but it lightens the hero's supporting labels slightly on the
   pale accents. Confirm with Priya before Dana applies it?
2. The hero's Income/Expenses are no longer green/red (Pia's deviation 1). That is a deliberate
   design call, not an engineering fault, but it is the one place this refresh changes how a money
   figure is read. Founder sign-off.
3. Finding 3 is the real risk in this review: a 54-screen presentation refresh landed with no way to
   render a single component in CI. Do we take the half day now, before the next refresh?


---

## 2026-09-12 — Dana (Developer, UI and navigation) — Dmitri's review fixes on `almost-done-all-pages`

**Outcome:** Done. Applied the seven items assigned to me from Dmitri's 2026-09-11 gate (blocker 1,
findings 4, 5, 6, 8, Tia's bug 1, and two of the three nits). Final gates: `npx tsc --noEmit` clean, `npx expo lint`
0 errors / 0 warnings, `npx jest --ci` 17 suites / 251 tests pass, prettier clean on every file I
touched. Nothing committed.

**What changed**
- `src/components/dashboard/destination-list.tsx` — added `text-ink` to the row amount's className, so
  a `$0.00` destination is no longer uncoloured when `useMoneyColor()` returns undefined. Now matches
  `transaction-row.tsx:82` exactly (blocker 1).
- `src/components/dashboard/balance-summary.tsx` — all four `text-on-control/70` → `/85` ("Left this
  month", the error line, the "% spoken for" caption, and the Income/Expenses labels). CEO-approved
  (finding 4).
- `src/components/ui/date-picker.tsx` — year stepper ChevronUp/ChevronDown `colors.surface` →
  `colors.onControl`.
- `src/components/bills/category-picker.tsx`, `src/components/bills/icon-picker.tsx`,
  `src/components/splits/group-icon-picker.tsx` — selected-state glyph `colors.surface` →
  `colors.onControl`. Finding 1 of the audit is now 8 of 8 (finding 5).
- `src/app/(tabs)/home.tsx` — `DESTINATION_ROUTES: Record<string, Href>` (`import { router, type Href }
  from 'expo-router'`), both `router.push(href as never)` casts removed. Proved the type bites:
  changing `'/receipts'` to `'/reciepts'` gives `TS2820 ... Did you mean "/receipts"?`; reverted.
- `src/components/dashboard/quick-actions.tsx` — `QuickAction.href` and `onPress` typed `Href` (finding 6).
  `Href` is exported from the package root: `expo-router/build/types.d.ts:60` re-exports
  `./typed-routes/types`, where it is declared. `app.json` already has `experiments.typedRoutes: true`
  and `.expo/types/router.d.ts` is generated, so the union is the app's real route list.
- `src/components/ui/source-tiles.tsx` — swatch `border-line` → `border-ink/10` (finding 8).
- `src/components/dashboard/getting-started-card.tsx` — done-step `Check` `strokeWidth={3}` → `1.8`,
  matching `multi-choice-chips.tsx:48` and design rule §7 (1.8 everywhere; 2 only for chevrons/steppers).
- `src/data/dashboard-mock.ts` — removed the dead `artwork` field from `SpendingCategory` and the five
  `spendingCategories` literals, plus the now-unused `ArtworkName` import. Grepped first: only
  `home.tsx` and `tiles.tsx` consume `spendingCategories` and neither reads `artwork` (tiles uses
  `DESTINATION_ICONS`).
- `src/components/dashboard/destination-list.test.tsx` — dropped the same five `artwork:` keys from
  Theo's fixture; it set the field but never read it, and the literal would not typecheck otherwise.
  Test logic untouched, all 4 tests still pass. Flagging because it is the testing team's file.

**Tia's bug 1 (FAB over the "Subscriptions" row) — investigated, deliberately not changed**
The overlap is transient, not a trapped card, so per the brief I left the FAB and the layout alone.
Measured: `Screen` renders the floating slot as `absolute bottom-5 right-5` inside the `SafeAreaView`
(`screen.tsx:90-94`), so the 64pt FAB occupies the bottom 84pt of the scroll viewport. `home.tsx:245`
wraps the last section in `pb-24` (96pt) and `screen.tsx:51` adds `paddingBottom: 16`, giving 112pt of
clearance at full scroll — the end of the page clears the FAB by 28pt and no row can come to rest under
it. What Tia saw is a mid-page row sitting under the overlay at scroll offset 0; confirmed on the booted
iPhone 17 Pro that the destination card is clipped by the viewport at that offset, i.e. there is more
page below and the row scrolls clear. Any real fix (move the FAB, hide it on scroll, or shrink the hero)
changes the FAB's position, which is the Founder's call. `source/[id].tsx` is the only other screen
using `floating` and it reserves `pb-28`, so it is clear too.

**Skipped**
- Haptic on destination rows: `transaction-row.tsx:46` passes `onPress` straight through with **no**
  `withTap`, so the destination rows already match the transaction rows. `src/lib/press.ts`'s own
  doc-comment says a row that opens a detail page is navigation and should opt out, while `QuickActions`
  buzzes because it creates something. Adding a haptic would have broken that distinction, not restored
  it. Dmitri's nit compared the rows against `QuickActions` rather than against `TransactionRow`.
- `date-picker.tsx:55` also uses `text-on-control/70` on a small label over `bg-control`. Same contrast
  exposure as finding 4 but outside the brief's scope, so I left it. One-line fix if Priya wants it.

**Could not verify:** dark mode and the other eleven accents — Appearance is Pro-gated and the signed-in
account is not Pro (same wall Tia hit). The four picker/date-picker `onControl` fixes were verified by
code and by the gates, not on screen, because those screens need navigation I cannot drive.

**Open questions**
1. Mid-run, an untracked `src/app/__hello_probe.test.tsx` existed alongside Diego's `hello.tsx` work and
   was the only thing lint complained about (3 warnings) — it disappeared before my final pass, so the
   gates above are clean. Worth confirming no such scratch file is left in the tree at merge time; this
   is the second leftover probe/smoke file on this branch.
2. Should `date-picker.tsx:55`'s `/70` label move to `/85` too, for consistency with the hero?
---

## 2026-09-12 — Diego (Developer, data and backend) — should-fix 7: error branch on `hello.tsx`

**Outcome:** Done. `src/app/hello.tsx` now has an `isError` branch between the loading skeleton and the
redirect, so a failed profile read shows the house `PageState` error with a "Try again" that refetches
instead of dropping through to "What should friends call you?". Only that one file changed. No data-layer
change was needed: `useProfile` goes through `useOwnerQuery`, which returns the full TanStack v5 result,
so `isError` and `refetch` were already there.

**What changed**
- `src/app/hello.tsx` — added `PageState` + `useArtwork`; new `if (profile.isError)` branch
  (`art={artwork.error}`, "Could not load your profile", `onAction={() => void profile.refetch()}`,
  matching `pro.tsx:256`'s `() => void prices.refetch()` rather than passing `refetch` bare and feeding
  the press event in as `RefetchOptions`, which is what `transactions.tsx:255` does). Doc comment extended
  to say why. Ordering is loading → error → redirect → form, so the form is reachable only when the read
  succeeded and the name is genuinely empty.
- Proved by rendering, not reading: a throwaway probe rendered all four states — loading shows the
  skeleton and not the question, error shows the retry state and not the question and one press calls
  `refetch` exactly once, a named profile redirects, an empty profile shows the question. Probe deleted;
  `git status` clean of it. Getting it to run needed five mocks (AsyncStorage, theme-provider,
  keyboard-controller's own `/jest` entry, reanimated via the Skeleton, and `@/theme/avatars`) — the last
  because jest's `@/` mapper points at `src/` only and `@/assets/*` resolves to the repo root in tsconfig
  and metro but nowhere in jest. Worth folding into the `jest.setup.js` of should-fix 3.
- Checks: `npx tsc --noEmit` exit 0, `npx expo lint` exit 0 (and `npx eslint src/app/hello.tsx` exit 0),
  `npx prettier --check src/app/hello.tsx` clean, `npm test` 17 suites / 251 tests pass — component tests
  now run, so should-fix 3 has moved since the 09-11 entry.
- Observation, not a change: no route sends an Apple or Google user to `/hello`. `auth.tsx:37` replaces to
  `/home` for both providers; only `signup.tsx:49` and `verify-otp.tsx:44` reach `/hello`. The header
  comment on the file claims otherwise. The guard is still right, but the finding's "returning Apple or
  Google user" reaches this screen only if that routing changes.

**Assessed, not implemented**
- **`useLedger` / `useSourceLedger` `isError` gaps** (now `queries.ts:966` and `:690`; line numbers moved).
  Confirmed both. `useLedger` omits `salary.isError` and `charges.isError`; `useSourceLedger` omits
  receipts, bills, subscriptions and charges. The charges omission is the one that breaks the
  bank-statement rule: past occurrences fall back to the *projected* plan amount when the charges read
  fails, so a bill that was actually charged $61.40 shows its scheduled $59.99 with no error anywhere.
  The hook edit is two lines, but the cost is the fallout: six screens start erroring where they used to
  show wrong figures, and `source/[id].tsx:54` currently answers any error with "It may have been deleted.
  Go back and pick another." — wrong words for a network blip, and `useSourceLedger` exposes no `refetch`
  to offer a retry with. Plan: one `anyError([...])` helper in `queries.ts`, add the missing flags, add
  `refetch` to `useSourceLedger`, split the source screen's "deleted" case from its "failed" case.
  **~half a day** for me, plus **~1 hour** for Drew's fixture proving projected ≠ recorded on a month with
  a recorded charge — cheaper than estimated on 09-11 now that components render under jest.
- **`useSourceBalances` has no `isError`** (`queries.ts:700`). Worse than a missing flag: consumers read
  `balances.get(id) ?? card.balance`, so a failed receipts/charges read silently falls back to the figure
  typed when the card was added and presents it as the live balance. `cards.tsx` guards only
  `cards.isError` and `accounts.isError` (:162, :214), which are exactly the two queries that do not move
  a balance. `insights.tsx:103` aggregates seven flags and cannot see this one, so net worth can be wrong
  with no error. The hook already computes `isSettled` from five of the loading flags and **nothing in the
  tree reads it** — dead since it was written. Plan: return `isError` over all seven queries, wire it into
  `insights.tsx`'s existing `isError` (one line, retry already calls `refetchBalances`), and either delete
  `isSettled` or have `cards.tsx` use it so a balance is not shown before the lists behind it land.
  `cards.tsx` needs a design call — stale-with-a-warning or a page-level error — so that part is not mine.
  **~2-3 hours** for the hook and `insights.tsx`; the `cards.tsx` treatment is extra and needs Priya/Dana.

**Could not verify:** nothing on a device or Simulator. Metro is live but I did not drive the app, so the
error state has not been seen rendered on a phone — only under jest. I did not test against a genuinely
failing Supabase; the probe forces `isError` rather than producing it.

**Open questions**
1. The error branch is a dead end by design: a user whose profile will not load can retry but cannot get
   past this screen. Do we want a quiet secondary "Continue" that goes to Home (Home has its own error
   states), or is being held here correct? I kept it to the brief.
2. Both assessments change what several screens do on a bad network — wrong-but-silent becomes an error
   page. That is the right trade for money figures, but it is a visible behaviour change across six
   screens. CEO to confirm before I pick it up.
3. Should the `hello.tsx` header comment be corrected, or should `auth.tsx` actually route Apple/Google
   through `/hello` so a provider signup is asked its name once? One of the two is a bug.

---

## 2026-09-12 — Dmitri (Development Team Lead) — second engineering gate: stepped add flows + pills sweep

**Outcome:** Partial — **ready after fixes**, and not mergeable in today's state because the branch is
still being written to under review (finding 1). The hard guarantee holds: for all ten flows the
mutation is called with a byte-identical payload, every edit prefill is byte-identical, and no money,
date, id, cadence or reminder offset is transformed differently than before. No blockers in the code.
Fifteen findings: two blocker-class (both process), six should-fix, seven nits.

### The hard guarantee — holds, with evidence

- **Payloads.** Extracted `handleSave` from `git show HEAD:src/app/<file>` and from the working tree
  for all ten. `add-expense` `values` (groupId, paidBy, amount, description, shares, `toIsoDate(spentOn)`,
  splitMode), `add-receipt` (ten keys incl. `purchased_on`, `card_id`/`bank_account_id` split,
  `note.trim() || null`, `image_path: null`), `add-bill` `BillValues` (incl. the `period` → `'period'`
  translation and `next_due_on` = `starts_on`), `add-subscription`, `add-card` (incl.
  `balance_as_of: balance ? toIsoDate(new Date()) : null` and `bill_due_day: dueDate.getDate()`),
  `add-account` (incl. the salary side effect and `setSalaryAccounts`) — **all identical, line for
  line.** `applyReminder(kind, id, choiceToLead(reminder), remindAt)` is unchanged in all four flows
  that write one, including `add-card`'s `dueDate ? … : null` and `add-account`'s `payLandsHere ? … : null`
  guards. `add-member`, `salary` and `save-loan` are presentation-only diffs (radius, `text-danger`,
  `variant="pill"`) with no handler touched.
- **Edit prefill.** Diffed every `useState` initializer old vs new across all ten. The only additions
  are `step` and the widened `error` shape; **not one seed expression changed.** The
  `key={existing?.id ?? 'new'}` remount-to-seed pattern is identical in all five screens that use it.
  Scripted a check that every declared setter is still called somewhere in the new file — zero orphans,
  so no field became read-only or invisible.
- **Keypad rules.** Reimplemented HEAD's `amount-pad.tsx` `press` beside the new `applyAmountKey` and
  ran both over 202 structurally distinct drafts × 12 keys = **2,424 transitions**. 150 divergences,
  and *every one* is the 9-digit cap refusing a single appended digit on a draft that already has ≥9
  whole digits and no fraction (shortest diverging draft: `111111111`). Nothing else moved: never two
  decimal points, the fraction never exceeds 2, the cap returns `current` rather than slicing it, and
  every other key is a pure append. The cap is genuinely keystroke-only.
- **Calendar maths.** Ran `InlineCalendar`'s `step()`, `getDaysInMonth`, `getFirstWeekday` and the
  `new Date(y,m,d)` → `toIsoDate` → `new Date(iso+'T00:00:00')` round trip over every day of 2024–2030
  in six timezones (New York, Santiago, Beirut, Lord Howe, Apia, UTC). **Zero mismatches** — 2,557 days
  × 6 zones. Dec→Jan and Jan→Dec cross the year correctly, Feb 2024 = 29, Feb 2100 = 28. `toIsoDate`
  uses local getters, so the spring-forward-at-midnight zones cannot shift a date by a day.
- **Validation copy.** Every string is verbatim. But see finding 7: most of it is no longer reachable.

### Nothing under the guarded paths changed — confirmed

`git status --porcelain -- src/api supabase ios app.json package.json package-lock.json` is empty,
tracked and untracked. `src/stores` does not exist in this repo at all — worth knowing, since the
brief names it. `src/lib` is `haptics.ts` only, +5 lines, the `selection()` wrapper, and
`Haptics.selectionAsync()` is present in the SDK 57 haptics docs. Also changed but from the first
batch and already reviewed on 09-11: `src/theme/palette.ts`, `src/global.css`, `tailwind.config.js`
(the `danger` token) and `src/data/dashboard-mock.ts`. `SegmentedControl` is gone — renamed to
`toggle-pill.tsx`, zero stale importers, `tsc` proves it. No stray probe/smoke/scratch files:
`git ls-files --others` lists only the six declared `flow/` files, the two dashboard components and
their tests, and the `.claude/` docs.

### Findings

**1. Blocker (process) — the tree moved four times during this review.** Between 01:20 and 01:31 the
working tree changed under me: `segmented-control.tsx` → `toggle-pill.tsx` (a *staged* `git mv`),
`text-link.tsx` + `pro.tsx:265` (a new `underline` variant, which cleared two prettier errors
mid-run), `(tabs)/cards.tsx:25` (unused `useColors` removed, clearing the one lint warning) and a new
`src/components/flow/amount-figure.test.tsx`. Two of my own gate runs disagreed with each other for
that reason, and every line number below is from the 01:35 state. Nothing can be certified against a
moving branch. Fix: freeze it, then one confirming `npm run check`. — Dmitri / CEO

**2. Blocker (process) — the index is not empty.** `git status` reports
`RM src/components/ui/segmented-control.tsx -> src/components/ui/toggle-pill.tsx`: the rename is
*staged*, everything else is not. A `git commit` without `-A` would commit only the rename, landing a
branch where `segmented-control.tsx` is deleted, `toggle-pill.tsx` has no content and `time-picker.tsx`
imports a file that does not exist. Fix: `git add -A` before committing. — whoever commits (CEO)

**3. Should-fix — `npm run check` is red.** `typecheck`, `lint` and `test` pass; `format:check` fails
on 35 files — all of `.claude/**`, `TEAM.md`, and `app.json` (pre-existing). No source file is
involved, but the project's own gate not passing is exactly how the last leftover reached me. Fix:
add `.claude/` and `TEAM.md` to `.prettierignore`. — Dilip

**4. Should-fix — `src/components/flow/step-flow.tsx:4,75-76` uses a deprecated a11y API on a
pre-Fabric path, with the New Architecture on.** Hard evidence, not memory: the installed RN's own
source, `node_modules/react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo.js:448`,
carries `@deprecated Use 'sendAccessibilityEvent' with eventType 'focus' instead` and routes to
`legacySendAccessibilityEvent`, whose file comment reads "exposed to the React Renderer that can be
used by the **pre-Fabric** renderer to emit accessibility events to **pre-Fabric nodes**".
`ios/SkipBudget/Info.plist:82` has `RCTNewArchEnabled` = `true`. reactnative.dev/docs/accessibilityinfo
marks `setAccessibilityFocus()` 🗑️ Deprecated with the same replacement. The `.d.ts` omits the tag,
which is why `tsc` and lint are silent. Net: the per-step VoiceOver focus move that §6 of the spec
requires is most likely a silent no-op on device — which is consistent with Pia not being able to
confirm it landed. Fix, two lines: `AccessibilityInfo.sendAccessibilityEvent(questionRef.current, 'focus')`
and drop the `findNodeHandle` import. — Dana

**5. Should-fix — the iOS edge swipe and Android hardware back leave the whole flow from any step.**
`src/app/_layout.tsx:119` is a bare `<Stack>`, so `gestureEnabled` is on for every `add-*` route, and
`step-flow.tsx` registers no back interception anywhere (`grep -rn BackHandler\|usePreventRemove src/`
is empty). The header chevron goes back one step; the edge swipe on the same screen pops the route and
discards three steps of typing. The old single screens had one back behaviour, so this is a new split.
Fix: `<Stack.Screen options={{ gestureEnabled: step === 0 }} />` inside each flow (expo-router 57
exports `Stack` and `useNavigation`; the vendored react-navigation still has the `beforeRemove`
machinery for the Android half). — Dana, with Dilip confirming the native-stack option against the
SDK 57 docs

**6. Should-fix — the 44pt floor is missed on three shared pills, against the sweep's own
"Non-negotiable" §6.** `src/components/ui/action-pill.tsx:40`, `src/components/ui/range-dropdown.tsx:34`
and `src/components/ui/reminder-field.tsx:70` are all `min-h-10` with no `hitSlop`. `ActionPill` has
eleven call sites, including the receipt Scan/Upload pair, the bill Calculator and the calendar's
Today. `ChoiceChips`, `MultiChoiceChips` and `SourceTiles` all got this right, so it is an oversight,
not a decision. Fix: `hitSlop={{ top: 4, bottom: 4 }}`. — Dana

**7. Should-fix — most required-field validation copy is now unreachable at runtime.**
`primaryDisabled={!stepValid}` gates each step on exactly the field its message is about, so the
person gets a dimmed Continue and no reason given. Unreachable: `add-expense.tsx:191,195,199,203`
(all four), `add-receipt.tsx:470` gates both, `add-bill.tsx:324` gates two, `add-subscription.tsx:225`
gates two, `add-card.tsx:208`, `add-account.tsx:233`, `add-group.tsx:99`. Still reachable and working:
the exact-split remainder pair, "Pick the first due date." / "Pick the date it starts.", and every
mutation failure. The spec says "step gating is a courtesy, not the validation" — the courtesy has
eaten the validation, and a disabled button with no explanation is worse for a screen reader than the
sentence it replaced. Fix: leave the primary enabled and let `onPrimary` call the existing `fail(…)`
for the current step; the machinery is already there. — Dana, with Priya on the pattern change

**8. Should-fix — `src/components/ui/collapsible-section.tsx` is dead, and took product copy with
it.** Zero importers since `add-card` and `add-account` dropped it; deleting it also orphans
`src/components/ui/info-dialog.tsx`, its only consumer. Gone with it: the "More setup / Recommended /
Why add these?" `MORE_SETUP_INFO` explanation. And `add-account`'s pay frequency, last payday and
reminder — previously collapsed behind "More setup" — are now an unconditional third step, so somebody
adding a plain bank account with no income is walked through a payday question that does nothing.
Fix: delete the component if the copy is genuinely retired, otherwise put the "why" back on step 3.
(`src/data/receipts-mock.ts` is also dead, but was dead at HEAD too — not this batch.) — Dana + Mia

**9. Nit — three doc comments contradict their own code.** `step-flow.tsx:63` documents `scrollable`
as "Off for the keypad step, which must not scroll under a finger", but no caller passes it and Pia's
deviation 3 says every step scrolls — the prop is dead. `inline-calendar.tsx:57` says "Pass null to
draw no today marker (the modal does not)", but `date-picker.tsx:143` passes `today={new Date()}`.
`amount-keypad.tsx:50` declares `className` on the props type and never applies it. — Pia/Dana

**10. Nit — `border-red-500` survives on the two field error borders** (`src/components/ui/text-field.tsx:75`,
`src/components/brands/brand-field.tsx:119`) while the error text beside them is now `text-danger`.
That is the same mode-blind red the `danger` token replaced everywhere else. Fix: `border-danger`. — Dana

**11. Nit — `step-flow.tsx:74` early-returns when there is no `question`,** so the details step — the
one with the most to announce — gets no focus move at all and VoiceOver stays on the button that was
just replaced. — Dana

**12. Nit — the big figure may ellipsise a money amount.** `amount-figure.tsx:58-66` is
`numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}` at 64px. The longest draft the keypad
itself allows is `999,999,999.99`, 14 glyphs; at the 38px floor that is close to the 327pt of usable
width on a 375pt screen and over it on a 320pt one, where iOS ellipsises rather than shrinking
further. An ellipsised money figure is a wrong figure. Could not reproduce without a device. — Tia to
look, Dana to lower `minimumFontScale` if it clips

**13. Nit — `add-account.tsx:413`:** the income pad's caption reads the pay frequency ("Each month")
from `payFrequency`, whose chips now live on step 3, so on step 2 it always states the default. — Dana

**14. Nit — copy that now sits behind the decision it explains.** `add-group.tsx`'s "For the flat, the
trip, the thing that keeps going…" was the subtitle above the name field and is now under the switch
on step 2. `add-receipt`'s "Check the {store, date} below — it will save either way." sits on step 1
while both fields are on later steps (Pia flagged this one herself). — Mia

**15. Nit — the twelve keys are written twice:** `AMOUNT_KEYS` at `amount-keypad.tsx:7` and the 4×3 row
literal at :63, which does not read the exported list. — Pia

### Checks I ran myself

`npx tsc --noEmit` exit 0. `npx expo lint` 0 errors / 0 warnings (it was 2 errors + 1 warning 8
minutes earlier — see finding 1). `npx prettier --check src` clean. `npx jest --ci` **19 suites / 266
tests pass** — up from 251, and the new `amount-keypad.test.ts` and `amount-figure.test.tsx` are the
first money-rule tests this refresh has produced, which is the right instinct. `npm run check` fails
at `format:check` only, on `.claude/**`, `TEAM.md` and `app.json`. Verified against
docs.expo.dev/versions/v57.0.0: `Haptics.selectionAsync()` is in SDK 57; expo-router 57.0.15 exports
`Stack`, `useNavigation` and `useFocusEffect`; no new Expo module is introduced by either batch.
RN 0.86.2 confirmed from `node_modules`.

### Could not verify

Nothing on a device or Simulator — no eyes on a render, again. Specifically unverified: the `bg-ink/5`
keypad tiles on `#1B181F`, whether VoiceOver actually lands on the question line (finding 4 says it
probably does not), whether the 64px figure clips at 320pt (finding 12), dark mode and the eleven
other accents, and the `SourceTiles` pill row that replaced the two-column grid. No contrast figure in
this pass was measured by me. I also did not drive a single flow end to end against a real Supabase —
the payload guarantee above is proved by source comparison and by executing the pure rules, not by
watching a row land.

### Open questions

1. Finding 7 is the one I would most like overruled or confirmed rather than guessed at. A disabled
   Continue with no reason is a real accessibility regression, but re-enabling it changes the feel of
   every add flow. Priya and the Founder.
2. Finding 8: is the "Why add these?" copy retired on purpose, or did it fall out with the component?
   If it is retired, `collapsible-section.tsx` and `info-dialog.tsx` should both go in this merge
   rather than linger.
3. Editing is still linear — opening an edit on step 2 means Continue → Save changes, two taps to fix
   one field (Pia's open question 2). I have no engineering objection either way, but it is the change
   most likely to be felt by somebody correcting a figure.
4. Still unanswered from 09-11, and now more relevant since components render under jest: the
   `useLedger` / `useSourceBalances` `isError` gaps Diego scoped. A charges failure still presents a
   projected amount as a recorded one. That is the only open item on this branch that can put a wrong
   number in front of somebody.

---

## 2026-09-12 — Dmitri (Development Team Lead) — Phase 2 plan and audit skeleton

**Outcome:** Done, planning only. Phase 2 is split across Dana, Diego and Dilip with one owner per
file, written up in `.claude/team/dev/phase2-plan-2026-09-12.md`, plus the audit skeleton at
`.claude/team/dev/logic-audit-2026-09-12.md`. Nothing implemented; no source file, migration or
edge function touched. Drew (item 4) and Dilip (item 5) were already running, so I recorded what I
will reject their work for rather than re-briefing them.

**What changed**
- NEW `.claude/team/dev/phase2-plan-2026-09-12.md` — file-ownership table, ordered tasks with
  acceptance criteria and expected tests per developer, and nine decisions for the Founder.
- NEW `.claude/team/dev/logic-audit-2026-09-12.md` — 15 data rows (Diego), 23 notification/camera/
  storage/native rows (Dilip), 14 UI rows (Dana), pre-seeded with the gaps I could establish while
  planning.

**Decisions I made, with the evidence**
1. **The receipts reminder is server-sent, not locally scheduled.** Traced it: pg_cron
   `skip-send-push` at `*/15` (`20260829100012`) → `send-push` → `reminders_due()`, which decides
   everything in `(now() at time zone coalesce(p.timezone,'UTC'))` and stamps `last_sent_on` only on
   a successful delivery. `grep` for `scheduleNotificationAsync` / `SchedulableTriggerInputTypes`
   across `src`, `modules` and `supabase` returns **nothing** — there is no local scheduling in this
   app at all. I checked `DailyTriggerInput` exists in SDK 57 and rejected it anyway: two delivery
   paths, per-device rather than per-account, and it cannot answer "was a receipt already logged
   today" without a network read at fire time.
2. **It cannot live in the `reminders` table.** `reminders_one_target` is
   `num_nonnulls(bill_id, subscription_id, card_id, bank_account_id) = 1`, and the upsert resolves
   against all four columns. A receipts reminder points at nothing. Recommended three columns on
   `profiles` (`receipt_reminder_enabled`, `_at time default '20:00'`, `_last_sent_on`) plus a new
   `receipt_reminders_due()` RPC mirroring `reminders_due()`'s semantics. I pinned that signature in
   the plan so Diego and Dilip can work in parallel.
3. **Ascending is smaller than it looks, and must be done at the call sites.** Every sort in the app
   already tie-breaks same-day rows *ascending by id* and only runs the **day** descending
   (`queries.ts:940`, `card-ledger.ts:419`, `transactions.tsx:137`). So flipping the day order alone
   gives the Founder's rule and nothing inside a day moves. I forbade flipping `groupByDate`'s
   default — a silent default change is invisible in review — and froze `src/lib/card-ledger.ts`
   and `src/api/queries.ts` for Dana, so `source/[id].tsx` and `savings.tsx` sort for display in the
   screen through one new tested helper instead.
4. **"Coming up" needs no change.** Home's upcoming week (`home.tsx:255`), `bill-plans.tsx:97` and
   `subscription-plans.tsx:84` are already `asc`. Flagged for the Founder anyway.
5. **`insights.tsx:244` is the trap in item 2.** `(savings.data ?? []).slice(0, 3)` means "the three
   most recent months" only because the query returns newest-first. Flip savings anywhere upstream
   and insights silently shows the three *oldest* months with no error. Made it a blocking
   acceptance criterion with a required fixture.
6. **The receipt-images bucket is dead infrastructure, and must not be "fixed".** The bucket, its
   RLS and the delete-account cleanup all exist; `add-receipt.tsx:431` writes `image_path: null` and
   nothing in `src` ever calls `storage.from('receipt-images')`. `privacy.tsx:55` and `pro.tsx:33`
   both promise the photo never leaves the phone. Implementing an upload would break a published
   privacy claim. Filed as a Founder decision, explicitly out of bounds for Dilip.
7. **Corrected the brief on one point:** this app does not use `expo-camera` — it is not in
   `package.json`. Scanning is a local Expo module, `modules/receipt-scanner`, wrapping VisionKit
   `VNDocumentCameraViewController`, compiled as the `ReceiptScanner` pod
   (`ios/Podfile.lock:2309`), loaded through `requireOptionalNativeModule` so a build without it
   degrades to upload-only.
8. Carried both of Diego's escalations into the plan as work, per the CEO's note that the Founder's
   "make sure logic is perfect" is the approval — with the warning attached: six screens move from
   *wrong-but-silent* to *an error page* on a bad network.

**Checks I ran myself:** read-only. Traced the reminder path through five migrations, the edge
function and `src/api/push.ts`; grepped every `groupByDate`, `.sort(` and `.order(` call in the
tree; confirmed `queries.ts:690`, `:966` and `:701` still hold Diego's three gaps; confirmed
`image_path` is written null and never read from storage; confirmed the four unused pods are still
in `Podfile.lock`. Verified against <https://docs.expo.dev/versions/v57.0.0/sdk/notifications/>:
`SchedulableTriggerInputTypes.DAILY` / `DailyTriggerInput { hour, minute, type }`,
`scheduleNotificationAsync`, `cancelScheduledNotificationAsync`, `getAllScheduledNotificationsAsync`,
`getNextTriggerDateAsync` and the `IosAuthorizationStatus` values the app already uses all exist in
SDK 57 — so the local-scheduling option was rejected on design grounds, not availability.

**Could not verify**
- Nothing run: no migration applied, no edge function invoked, no device, no Simulator. Whether
  `send-push` and the other two functions are actually *deployed*, and whether the `cron.job` row
  matches the migration, is an audit row for Dilip — I read the migrations, which is not the same
  as reading the live schedule.
- Whether the 15-minute cron granularity is acceptable to the Founder for an 8pm reminder (it
  delivers 20:00–20:14). Already true of every bill reminder.
- Drew's and Dilip's in-flight work: `git status` shows no change yet to `src/lib/loan.ts` or
  `src/api/pro.ts`, so I have reviewed nothing of items 4 and 5 — only written what I expect.

**Open questions** (full list, with my recommendations, in §6 of the plan)
1. Does "ascending everywhere" reach the Savings months list, the Notifications list and the Splits
   groups list? My default: flip the first two, leave groups alone.
2. Ascending puts today below the fold. Do list screens scroll to the end on open? That is a design
   call (Priya/Pia) and it changes how every list feels.
3. Should the receipts reminder skip a day when a receipt was already logged? I recommend yes, on
   *created today* rather than *dated today*.
4. Receipt images: drop the dead bucket, column and cleanup, or change the privacy promise?
5. If Drew's day-count correction moves the figures on loans people have already saved, are those
   recalculated or grandfathered? Needs answering before he finishes, not after.

---

## 2026-09-12 — Dilip (Developer, native and platform) — dev-only Pro bypass for the testing team

**Outcome:** Done. `usePro()` can now report `pro=true` without a subscription, but only in a
development build and only after an explicit opt-in. Gates: `npx tsc --noEmit` exit 0, `npx expo lint`
exit 0 (and `npx eslint` on each touched file, exit 0), `npx jest --ci` 20 suites / 275 tests pass,
prettier clean on every file I touched. Nothing committed.

**What changed**
- **New `src/lib/pro-bypass.ts`** — the whole switch, in one file nothing else depends on. Two locks:
  `__DEV__` first (every exported function returns before it reads anything else), then an explicit
  opt-in — `EXPO_PUBLIC_PRO_BYPASS=1` or the Settings toggle, stored in AsyncStorage under
  `skip.dev.proBypass`. State is a module-level store read through `useSyncExternalStore`, so flipping
  the switch updates every gated screen on the next render with no provider added to the root layout.
  Turning it on logs a loud `PRO BYPASS IS ON …` `console.warn` naming the source (env var, switch, or
  restored from a previous run). The env read is written as a literal `process.env.EXPO_PUBLIC_…`
  property access, which the Expo environment-variables guide says is the only form Metro inlines.
- **`src/api/pro.ts`** — entitlement read only: `pro: bypass || …` and `ready: bypass || …` in the
  return of `usePro()`, plus the hook call and a comment. `ready` is included because a gate renders
  nothing until it is true, so a tester with no server answer would otherwise sit on a blank screen.
  `ensureConfigured`, the customer-info listener, `useProPrices`, `usePurchasePro` and `restore` are
  untouched — the bypass cannot reach offerings, a purchase, or the server row.
- **`src/app/(tabs)/settings.tsx`** — a `{__DEV__ ? … : null}` "Developer" section under Skip Pro with
  one `SettingsRow` ("Fake Pro", `FlaskConical`, `toggle={{…}}`), in Paulo's existing
  SettingsSection/SettingsRow/Switch idiom. The hook is called unconditionally at the top; only the
  render is conditional. (The Save-button and "Preference"→"Preferences" hunks in that file's diff are
  the UI refresh already in the working tree, not mine.)
- **`.env.example`** — documents `EXPO_PUBLIC_PRO_BYPASS=`, left blank, with the Release caveat.
- **New `src/lib/pro-bypass.test.ts`** — 9 tests. Four of them set `__DEV__` to false and prove the
  override is inert there: the env var is ignored, the stored key is ignored *and never even read*
  (`AsyncStorage.getItem` not called), the setter writes nothing and warns nothing, and a switch
  flipped while `__DEV__` was true stops answering the moment it goes false. The other five prove it
  still works in a dev build.
- **New `.claude/team/dev/pro-bypass.md`** — two lines: how Tia enables it, how to confirm it is off in
  Release.

**Proof it cannot activate in Release** (artifact, not exit code). Exported a production iOS bundle
with the opt-in deliberately set — `EXPO_PUBLIC_PRO_BYPASS=1 npx expo export --platform ios
--no-bytecode` — and read the output. The prelude carries exactly one `__DEV__=false` and no `=true`.
The bypass module compiles down to `proBypassActive(){return!1}`, `setProBypass=function(e){return}`,
`hydrateProBypass(){}`: the env check, the AsyncStorage calls and the warning are all gone. The strings
`EXPO_PUBLIC_PRO_BYPASS`, `PRO BYPASS IS ON` and `Fake Pro` do not appear anywhere in the 9.8 MB
bundle, so the Settings row does not exist in it either. In the same bundle `usePro` still reads
`v=(0,o.useProBypass)()` and `pro:v||!0===p||!0===U.data` — with `v` permanently false, that is the
original expression, and the RevenueCat listener, `getCustomerInfo`, offerings and purchase paths are
all still there intact. Mechanically this holds because `react-native-xcode.sh` passes `--dev false`
for every Xcode configuration that is not `*Debug*`.

**Could not verify:** I did not run the bypassed app on a simulator or device, so no Pro-gated screen
has been seen opening through it — that is Tia's next step. I did not test against a live store; real
purchases are unchanged by inspection and by the bundle above, not by a sandbox purchase. `npx
expo-doctor` still reports its two pre-existing failures (CocoaPods not on this shell's PATH, and 31
SDK packages at older patch versions); I added no dependency, so neither is from this change.

**Open questions**
1. Should the bypass also be reachable from the dev menu, or is the Settings row enough? I kept it to
   one surface deliberately — fewer places to forget about.
2. The bypass makes `ready` true immediately. If Tia tests the *gate's* loading behaviour (the blank
   frame before an answer lands), she must turn it off first. Worth a line in the test plan.
3. `.env.local` is untouched, so the switch is the only way in today. If the testing team would rather
   every dev build start bypassed, that is a one-line `.env.local` change on their machines — but it
   is a Founder/CEO call whether we want dev builds defaulting to Pro.

**Late addition (same day):** Drew and Dilip landed files while I was writing. `git status` now also
shows `src/lib/money.ts` + test, `src/lib/apr.ts` (Drew) and `src/lib/pro-bypass.ts` + test
(Dilip). I added all five to the ownership table, plus `src/app/(tabs)/settings.tsx` to Dilip —
his bypass needs a `__DEV__`-only switch there, and nobody else may open that file this phase.
First read of both is promising and neither is reviewed yet: `money.ts` argues half-away-from-zero
over banker's rounding and avoids the `Math.round(value * 100)` half-point error; `apr.ts` cites
Reg Z Appendix J including the simple-interest odd first period and the 30-day unit month;
`pro-bypass.ts` gates on `__DEV__` first and only then on `EXPO_PUBLIC_PRO_BYPASS`, and warns loudly
when active. I still want the release-bundle grep before I pass item 5, and a statement-matched
fixture before I pass item 4.

---

## 2026-09-12 — Drew (Developer, money maths) — loan engine: conventions, overpayments, Reg Z APR

**Outcome:** Done. The loan maths now covers the three conventions mainstream lenders actually bill
on, overpayments (recurring and one-off), odd first periods, non-drifting month-end due dates and a
Reg Z APR. Every one of the 45 pre-existing loan fixtures still passes **unchanged**. Gates:
`npx tsc --noEmit` exit 0, `npx expo lint` exit 0, `npx jest --ci` 30 suites / 401 tests pass
(loan 79, apr 12, money 8). Nothing committed.

**What changed**
- `src/lib/money.ts` (new) + `money.test.ts` — integer-cent helpers with one documented rounding
  rule: **round half away from zero**, decided on the decimal rather than on the float.
  `Math.round(1.005 * 100)` is 100 because the product is `100.49999999999999`; `toCents` clips to 12
  significant digits first and posts $1.01, the way a lender does. `loan.ts` now rounds through it.
- `src/lib/loan.ts` — added `AccrualBasis` (`'monthly'` alongside the three day counts), `addMonths`,
  `monthsAndDaysBetween`, `interestFraction`, `Prepayment`/`LumpSum` on `LoanTerms`, an `extra` column
  on `ScheduleRow`, `payoffOn` on `Amortisation`, and `comparePrepayment`. `runSchedule` now credits
  lump sums, applies a recurring overpayment, and stops the schedule when the balance reaches zero.
- `src/lib/apr.ts` (new) + `apr.test.ts` — `truthInLending` / `annualPercentageRate`, Appendix J to
  12 CFR 1026: simple interest on the odd first period `(1 + f·i)`, a 30-day monthly unit period,
  bisected because the present value is monotone in the rate.
- `src/app/loan-calculator.tsx` — four new inputs in the existing pill language: a `ChoiceChips` row
  for the convention (Daily · 365 default / Monthly rests / 30 / 360), and `SelectField variant="pill"`
  + `AmountPad` for extra each month, a one-off overpayment (with its date), and fees paid upfront. New
  savings card and an APR line that only appears when it has something to say. 40px hero untouched and
  still the contract payment; the overpayment is stated beside it, not folded into it.
- `src/app/loan-schedule.tsx` — takes `basis`, `payment`, `extra`, `lump`, `lumpOn`; the footnote now
  describes the convention actually shown instead of always claiming daily accrual; rows show the extra.
- `src/app/save-loan.tsx` — files the chosen convention instead of hardcoding `actual/365`.
- `src/app/add-bill.tsx` — **one params object**, no style change: the "where each payment goes" link
  now passes the stored `day_count_basis` and `monthly_payment`. The card above the link was already
  built from the saved row while the full schedule re-solved from scratch, so the two could disagree
  by a cent on the same loan.

**The maths decisions**
1. *Rounding.* Half away from zero, once per posting. A period split by a lump sum still posts one
   interest line, so the cents are decided on the sum of the segments, not on each segment.
2. *Monthly rests as a first-class convention.* Over whole months it is exactly the textbook annuity
   formula and exactly 30/360; it differs only across a stub, where it charges per diem on
   actual/365. A scheduled period is one rest whatever the calendar did to the due dates — otherwise
   a 30th-of-the-month loan bills thirteen rests a year (28 Feb → 30 Mar is "a month and two days").
3. *Overpayments shorten the term, not the payment*, and both sides of `comparePrepayment` run at the
   same contract payment, because that is the comparison the borrower is making.
4. *APR is for the contract, not the plan.* Prepayments are not disclosed; fees are prepaid finance
   charges deducted from the advance, so they move the APR and not the payment.

**Fixtures added** (all sources stated in the test names/comments)
- $200,000 at 6% over 30 years, monthly rests — the canonical mortgage table: $1,199.10, first row
  $1,000.00 interest / $199.10 principal / $199,800.90; checked row by row against an independent
  amortiser written from the recursion, and $231,677.04 of interest against the idealised $231,676.38.
- $10,000 at 5% over 60 months — $188.71, and proof monthly rests ≡ 30/360 to the cent over whole months.
- £10,000 at 5.9% over 60 months, UK personal loan — £192.86, month-end due dates that do not drift.
- $200/month extra on the 30-year mortgage — 108 payments and $79,800.86 saved, again row by row.
- $100,000 at 7% with $2,000 of fees — APR 7.20136%, with the root bracketed by the last reported digit.
- The existing real lender statement, disclosed: APR 8.13592% on an 8.14% note.
- Property sweep: 250 seeded random loans across all four conventions, with and without overpayments —
  principal column sums to the cent, balance never negative, every loan closes at exactly 0.00.

**Verified by rendering, not by reading:** the calculator mounts, the three chips repice the loan
($501.03 daily / $500.95 monthly rests / $500.95 on 30/360 for the default $25k at 7.5% over 60), a
$200 extra entered through the pad gives 41 payments, "$1,683.24 saved", "1 yr 7 mo" early, and Save
pushes `basis` through to `/save-loan`. Probe deleted; it needed six mocks, which is the `jest.setup.js`
of should-fix 3 all over again.

**Could not verify:** nothing on a device or Simulator — no eyes on the new controls. The Pro gate,
dark mode and the twelve accents on the new card and chips still need Tia/Dana.

**For Diego (persistence gaps — I added no field, as instructed)**
1. `loans.day_count_basis` has no `'monthly'` value, and `SaveLoanValues.dayCountBasis` in
   `mutations.ts` is the same three-value union. Monthly rests over whole months are filed as
   `'30/360'` (identical arithmetic, no figure moves). Monthly rests **across an odd first period**
   are refused — the calculator says so before navigating and `save-loan.tsx` refuses again as a
   backstop — because filing it would silently change the figures the user just read. One enum value
   plus one union member fixes it.
2. Overpayments and fees are not persisted at all. A saved loan is the contract payment, which is
   right for a monthly bill, but it means a user's overpayment plan is lost on Save. Needs
   `loans.extra_monthly`, a lump-sum table and `loans.fees` before it can round-trip.

**Open questions**
1. The rate slider is now labelled "Interest rate" rather than "Interest rate (APR)", because with a
   fee input on the screen the two are different numbers and the APR has its own line. Copy change —
   Priya/Founder to confirm.
2. The APR line appears whenever it differs from the note rate by half a basis point, which on the
   default daily basis happens with no fees at all (7.51% vs 7.50%). Correct, but it is one more
   figure on a busy screen. Keep, or only show it once a fee is entered?
3. `add-bill.tsx` — I changed only the params object on the schedule link. Flagging it because that
   file belongs to this branch's UI refresh.

---

## 2026-09-12 — Diego (Developer, data and backend) — Phase 2 items 1 and 3: receipts reminder schema + hooks, the `isError` fixes, 15 audit rows

**Outcome:** Partial — everything the plan asked for is written, tested and green
(`npx tsc --noEmit` exit 0, `npx expo lint` exit 0 with `.expo/cache/eslint` deleted first,
`npx jest --ci` 30 suites / 401 tests pass, prettier clean on every file I touched), **except that the
SQL has never been executed**. There is no Docker and no Postgres on this machine, so acceptance
criterion 2.2/2 — the query transcript — cannot be produced by me. The four proof queries are written
out below for whoever has a local stack. Nothing committed, nothing pushed, nothing deployed, and no
remote database touched.

**What changed**
- **NEW `supabase/migrations/20260912100001_receipt_reminder.sql`** — three `add column if not exists`
  on `profiles` (`receipt_reminder_enabled boolean not null default false`, `receipt_reminder_at time
  not null default '20:00'`, `receipt_reminder_last_sent_on date`) with a `comment on column` each,
  plus `receipt_reminders_due()` exactly as the plan pinned it, `language sql security definer set
  search_path = public`, `revoke all … from public, anon, authenticated`. `reminders` is untouched and
  its `num_nonnulls(...) = 1` constraint is not relaxed. The skip clause is **implemented, not
  commented out**: the CEO relayed the Founder's decision, so a day on which a receipt was *created*
  (not dated) stays quiet — one `and not exists (select 1 from public.receipts r where r.user_id =
  ctx.user_id and (r.created_at at time zone ctx.zone)::date = ctx.local_date)`.
- **`src/api/reminders.ts`** — `DEFAULT_RECEIPT_REMIND_AT = '20:00'`, a pure `receiptReminderFrom(row)`,
  `useReceiptReminder()` (own query key `['receipt-reminder', userId]`, `withTimeout`, returns
  `{ enabled, remindAt, isLoading, isError, refetch }`) and `useSetReceiptReminder()`
  (`{ enabled, remindAt? }` → `update profiles … eq('id', userId)`, calling `enableReminders(userId)`
  first when enabling, invalidating only its own key so the dashboard's `useProfile` is left alone).
  The time is written only when one is given, so toggling the switch cannot reset a chosen time.
- **`src/api/queries.ts`** — one `anyError([...])` helper; `useLedger.isError` now covers salary and
  charges; `useSourceLedger.isError` covers all seven reads and the hook **exposes `refetch`**, which it
  did not; `useSourceBalances` gains `isError` over all seven; `isSettled` deleted.
- **NEW `src/api/queries.test.tsx`** — 26 tests. Each underlying read is failed **on its own** (5 for
  `useLedger`, 7 each for the other two), plus the retry case and a test that `isSettled` is gone.
- **NEW `src/api/reminders.test.tsx`** — 9 tests for the receipts-reminder setting.
- **`src/data/dashboard-mock.ts`** — five dead exports removed (`account`, `transactions`,
  `initialDate`, `dayTotal`, the `Transaction` type). `spendingCategories` and `SpendingCategory` stay,
  which is exactly what `home.tsx`, `tiles.tsx` and `destination-list.tsx` import.
- **`.claude/team/dev/logic-audit-2026-09-12.md`** — my 15 rows filled in; three cross-cutting
  questions added (5, 6, 7). I did not touch Dilip's or Dana's rows.

**The money fixture, because this is the point of item 3.** A bill scheduled at **$59.99** and actually
charged at **$61.40** on 2026-09-01: with every read landing, `useLedger` renders **-61.40** and
`totals.out` is **61.40**; with only the `charges` read failing it renders **-59.99** — the projection,
$1.41 short — and `isError` is now true, where before it was false. Falsified rather than assumed: with
the old boolean chains restored, the same suite fails on exactly the omitted queries (`salary_sources`,
`charges` for `useLedger`; `receipts`, `bills`, `subscriptions`, `charges` for `useSourceLedger`) and
passes everywhere else. `src/lib/card-ledger.test.ts:340-372` already pinned recorded-beats-projected at
the library level, so Drew's hour is not needed for this one; what was missing was the hook-level proof
that the fallback is now visible, and that is in my suite.

**Behaviour change, plainly:** six screens move from *wrong-but-silent* to *an error page* on a bad
network. That is the right trade for money figures and it is Founder-visible. It is also partly
unrealised until Dana wires the new `useSourceBalances.isError` into `insights.tsx` — the flag exists
now but nothing reads it.

**Applying the migration.** Local only, and **not by me**:
```
npx supabase start            # needs Docker; not installed on this machine
npx supabase migration up --local     # or: npx supabase db reset  (rebuilds from every migration)
```
**Do not run `npx supabase db push`** from this repo without meaning it: `npx supabase status` reports
the project is linked to `jwnsdszstqlpkzwehtmq` ("Skip Budget"), so a bare push goes to the real
database. That is the CEO's command to run, after the Founder approves.

**The acceptance queries I could not run.** Paste against a local stack with one signed-in user's id:
```sql
-- 1 · disabled account
select count(*) from public.receipt_reminders_due();                     -- expect 0

-- 2 · enabled, before its local time
update public.profiles set receipt_reminder_enabled = true, timezone = 'UTC',
       receipt_reminder_last_sent_on = null,
       receipt_reminder_at = ((now() at time zone 'UTC')::time + interval '1 hour')
 where id = '<user>';
select count(*) from public.receipt_reminders_due();                     -- expect 0

-- 3 · enabled, after its local time
update public.profiles
   set receipt_reminder_at = ((now() at time zone 'UTC')::time - interval '1 hour')
 where id = '<user>';
select * from public.receipt_reminders_due();
-- expect exactly 1 row: title 'Receipts', body 'Any receipts from today? Log them before you forget.'

-- 4 · not twice on the same local date
update public.profiles set receipt_reminder_last_sent_on = (now() at time zone 'UTC')::date
 where id = '<user>';
select count(*) from public.receipt_reminders_due();                     -- expect 0

-- 5 · the skip: a receipt CREATED today, dated years ago
update public.profiles set receipt_reminder_last_sent_on = null where id = '<user>';
insert into public.receipts (user_id, merchant, amount, purchased_on)
values ('<user>', 'Test', 1.00, '2020-01-01');
select count(*) from public.receipt_reminders_due();                     -- expect 0

-- 6 · the zone bites: two accounts, same 20:00, different instants
--     one on 'Pacific/Auckland', one on 'America/New_York'
select p.id, p.timezone, (now() at time zone coalesce(p.timezone,'UTC'))::time as local_time,
       exists (select 1 from public.receipt_reminders_due() d where d.user_id = p.id) as due
  from public.profiles p where p.receipt_reminder_enabled;
-- expect `due` to differ whenever one zone is past 20:00 and the other is not

-- 7 · the grant
set role authenticated;
select * from public.receipt_reminders_due();   -- expect: permission denied for function
reset role;
```

**Audit rows (my 15).** `fixed`: D1, D2, D4, D13, and D15 on the app side. `fixed` at the hook with the
consumer still open: D3. `gap`: D7 (Dana's one line), and one new gap inside D12. `verified (static)`:
D5, D6, D8, D9, D10, D11, D12, and D14 re-verified by reading the branch it lives on. "Static" is
deliberate wording: I traced every hop name-by-name against the migrations and can name each one, but
with no database on this machine I did not execute them, and I am not going to call that the same thing.
Evidence per row is in the audit file.

**For Dilip**
- The RPC is exactly the pinned signature: `receipt_reminders_due()` returning
  `(user_id uuid, local_date date, title text, body text)`. Use the `local_date` it hands back as the
  stamp for `profiles.receipt_reminder_last_sent_on` — it is the date the function tested against, so
  the sender needs no zone logic of its own.
- Copy is inside the function, not in your code: title `Receipts`, body
  `Any receipts from today? Log them before you forget.`
- The function is revoked from `authenticated`; the edge function's service-role client is the only
  caller.
- The skip is already in the SQL, so a day with a receipt logged returns no row at all — your counters
  should read that as a quiet run, not a broken one.
- I confirmed your point 4: my mutation calls `enableReminders(userId)` before it stores an enabled
  setting, so permission, token registration and `reminders_enabled_at` all go through your existing
  path. No second prompt anywhere.

**For Dana**
- `useReceiptReminder()` returns `{ enabled, remindAt, isLoading, isError, refetch }` flat —
  `remindAt` is `'20:00'` from `DEFAULT_RECEIPT_REMIND_AT` before anything is stored, never hardcode it.
  `useSetReceiptReminder().mutate({ enabled, remindAt? })`; leave `remindAt` off to keep the stored time.
  (You have already wired both into `reminders.tsx:93,101` — the names match.)
- `useSourceBalances(today)` now returns `isError`. `insights.tsx:93` still destructures `{ balances }`
  only, so the seven-flag aggregate at `:103` is still blind to the query that moves net worth. One
  line, your file: add `balances.isError` to `isError` — `retry` already calls `refetchBalances`.
- `useSourceLedger` now exposes `refetch`, so `source/[id].tsx` can offer a retry. Wording for the copy
  split you own at `:54`, since I am not opening your file: keep "It may have been deleted. Go back and
  pick another." **only** when the id resolves to no card and no account while the reads succeeded; when
  `ledger.isError`, say "Could not load this card." / "Could not load this account." with a "Try again"
  calling `ledger.refetch()`.
- `isSettled` is gone from `useSourceBalances`. Nothing read it.

**Could not verify**
- **Any SQL.** The migration has not been applied to anything — no Docker, no Postgres, no `psql` on
  this machine (`npx supabase status` fails on "docker: command not found"). Acceptance 2.2/1–4
  (idempotency on a fresh database, the four due/not-due cases, the two-zone case, the revoke) are all
  unproven by me. The function mirrors `reminders_due()`'s structure clause for clause, including the
  qualified-reference pattern that keeps `user_id` unambiguous against the `returns table` name, but
  structural similarity is not a transcript.
- Nothing on a device or Simulator. The hooks are proven under jest against a fake Supabase client, not
  against a failing server: the tests force a read to answer with an error rather than producing one.
- `npx jest --ci` prints "A worker process has failed to exit gracefully" on the **full** run. Not mine:
  `npx jest src/api` and `npx jest src/lib` are both clean, so it comes from the component suites under
  parallel workers. Flagging it, not chasing it.

**Expo SDK 57 page checked:** <https://docs.expo.dev/versions/v57.0.0/sdk/notifications/>. Nothing I
wrote calls an Expo API directly, but `useSetReceiptReminder` depends on `enableReminders`, so I
confirmed on that page that `getPermissionsAsync`, `requestPermissionsAsync`,
`IosAuthorizationStatus` (including `PROVISIONAL`), `getDevicePushTokenAsync` and `setBadgeCountAsync`
all still exist in SDK 57 as `src/api/push.ts` uses them.

**Open questions**
1. **Who runs the migration, and when?** It is written and unapplied. Somebody with Docker has to run
   the seven queries above before this goes anywhere near the real database — I would rather that be a
   gate than a hope.
2. **`useSalaryAccountIds` has no `isError`** (`queries.ts:288`). A failed read becomes an empty set, so
   `add-account.tsx:163`'s `payLandsHere` goes false and the payday reminder silently disappears. Same
   family as D1–D3, but the fix needs two of Dana's screens. Do I take the hook now and leave the flag
   unread, or wait? I left it, because I have just deleted one unread flag for exactly that reason.
3. **`zod` is a dependency and is imported nowhere in `src`.** My own standard is to validate external
   data at the boundary with it; the house pattern is a cast. I used a tested pure parser for the new
   hook rather than introduce a library to one file. Dmitri's call whether that becomes a pattern or the
   dependency goes.
4. **`src/data/receipts-mock.ts` is imported by nothing at all.** I trimmed `dashboard-mock.ts` as the
   brief said; deleting a whole file was not asked for. CEO's call.
5. D14's routing question still stands and is still unanswered: no route sends an Apple or Google user
   to `/hello`, so either that file's header comment or `auth.tsx:37` is a bug.

---

## 2026-09-12 — Dana (Developer, UI and navigation) — Phase 2 items 1, 2 and the fourteen UI audit rows

**Outcome:** Done. Item 2 (ascending order everywhere) is applied on all nine screens the plan lists,
with the two screen-level sorts behind one tested helper; item 1's Reminders section is built against
Diego's hooks, which landed while I was working; my fourteen audit rows are filled in with what I
actually ran. Gates on my final pass: `npx tsc --noEmit` silent, `npx expo lint` 0 errors / 0 warnings
with `.expo/cache/eslint` cleared first, `npx prettier --check src` clean, `npx jest --ci` **30 suites
/ 401 tests pass** (up from 266 — 16 of the new ones are mine). `src/lib/card-ledger.ts` is untouched:
`git status --porcelain src/lib/card-ledger.ts` is empty. Nothing committed.

**What changed**

- `src/lib/group.ts` — added `sortByDateAscending(items, dateOf, idOf)`. `groupByDate`'s default
  direction is **unchanged**, as the plan requires; every call site now states its direction.
- `src/lib/group.test.ts` — +7 tests: "today sorts last" pinned explicitly (not just "asc works"),
  same-day rows proved unmoved in **both** directions, and the new helper covered for the id
  tiebreak, undated rows trailing, not mutating its input, and empty.
- `src/components/ui/screen.tsx` — new opt-in `startAtEnd` prop (default off). See the ownership note
  below; this is the one file I touched that the plan assigns to nobody.
- `src/app/(tabs)/home.tsx` — Recent `direction="desc"` → `"asc"`; corrected the `direction` prop's
  doc comment, which described the old split.
- `src/app/(tabs)/transactions.tsx` — row sort flipped to day-ascending (id tiebreak untouched) and
  the `.reverse()` **removed** rather than left meaning its opposite: `periodBuckets` already returns
  oldest-first for all four period keys, which I checked in `src/lib/period.ts:105-170`. Comment
  rewritten.
- `src/app/bills.tsx`, `subscriptions.tsx` — implicit `desc` → explicit `direction: 'asc'`.
- `src/app/receipts.tsx`, `notifications.tsx`, `split-group.tsx` — `'desc'`/implicit → `'asc'`.
- `src/app/source/[id].tsx` — sorts `ledger.entries` for display **in the screen** with the new
  helper. `card-ledger.ts` not opened.
- `src/app/savings.tsx` — months reversed **in the screen**; `queries.ts`'s `.order('month', desc)`
  untouched.
- `src/app/insights.tsx` — `recentMonths` is now order-independent (sort by date, `slice(-3)`), and
  the seven-flag error aggregate became **eight**: `useSourceBalances` now returns `isError` since
  Diego's D3 fix, so I wired it in. That closes the second half of U7.
- `src/app/reminders.tsx` — the Receipts section, the counter, and the empty-state branch (below).
- NEW `src/__tests__/app/{reminders,receipts,transactions,insights}.test.tsx` — 12 tests.

**Where each screen now opens (the CEO's scroll decision)**

There is no `FlatList` anywhere in this app — every list screen is a `ScrollView` inside
`src/components/ui/screen.tsx`, so "the list's initial scroll" had to be a `Screen` prop. `startAtEnd`
is opt-in, defaults off, and calls `scrollToEnd({ animated: false })` from `onContentSizeChange` **at
most once per mount**, guarded on a `jumped` ref. Two details worth knowing:

- The screen passes `startAtEnd` only when the *real* rows are up (`!isLoading && !isError &&
  rows > 0`), never while a skeleton is on screen — otherwise the one jump is spent on the skeleton's
  height and the page ends up near the top when the data lands.
- `RefreshControl` is untouched, so pull-to-refresh still works, and a refresh or a filter change
  does not re-jump.
- `KeyboardAwareScrollView` returns the underlying ScrollView through `useImperativeHandle`
  (`react-native-keyboard-controller/lib/commonjs/components/KeyboardAwareScrollView/index.js:385`),
  so `scrollToEnd` is real on the `avoidKeyboard` screens too; I still guard on
  `typeof node?.scrollToEnd === 'function'` because that handle falls back to a stand-in object
  before the inner view mounts.

| Screen | Technique |
| --- | --- |
| `(tabs)/transactions.tsx` | `Screen startAtEnd` on `!isLoading && !isError && groups.length > 0` |
| `bills.tsx`, `subscriptions.tsx` | same, on `charges.length > 0` |
| `receipts.tsx` | same, on `visible.length > 0` |
| `source/[id].tsx` | same, on `entries.length > 0` (already past the loading and error guards) |
| `(tabs)/home.tsx` | **not applied** — see the open question. Recent runs ascending; the page still opens at the top |
| `notifications.tsx`, `savings.tsx`, `split-group.tsx` | ascending, no auto-scroll (not on the CEO's list) |

**Item 1 — the Reminders screen**

Diego's hooks were not in the tree when I started and were by the time I got here, so this is built
against the real `useReceiptReminder` / `useSetReceiptReminder` / `DEFAULT_RECEIPT_REMIND_AT` rather
than against the pinned names. Section at the top above Bills, `ReceiptText` at 18, caption *Every
day, so nothing gets forgotten.*, one card on the exact row anatomy
(`rounded-[16px] border border-line bg-card px-4 py-3.5`), the same `Switch` colours and
`toggleFeedback()`, the §2.3 time pill with the clock at 18 and `hitSlop={8}`, no lead chips. Three
decisions worth flagging:

1. **The counter folds it into both numbers**, as asked: `available` is `1 + (unblocked targets)` and
   `on` adds the receipts reminder. On an account with nothing else remindable it reads *0 of 1*.
2. **The empty state is gone, not hidden.** `total === 0` used to render "Nothing to remind you
   about", which would now contradict the card sitting under it. The guidance it carried moved into
   the subtitle, which appends "Add a bill, a subscription, a card or an account and Skip can remind
   you about those too." when there are no targets. `PageState` and `useArtwork` are no longer
   imported by that file. The footer note about phone settings is no longer gated on `total > 0`
   either — there is now always something that arrives as a notification.
3. **The switch sends `{ enabled: next }` with no time**, so turning it off and on again cannot reset
   an hour somebody chose. The time pill sends `{ enabled: true, remindAt }`. Pull-to-refresh now
   refetches the receipts query by name as well as `reminders`.

The accessibility label reads `Sent at 8:00 PM. Change the time for the daily receipts reminder.` —
**uppercase meridiem**, because `formatClock` (`src/lib/date.ts:252`) renders `AM`/`PM` and every
other reminder on the page says `9:00 AM`. The plan's "8:00 pm" is prose; hardcoding a lowercase copy
would have made this the one row that disagrees with the other four. Say the word if the Founder
wants the whole page lowercased — that is a one-line change in `formatClock` and it moves five
screens, so I did not make it.

**Tests, and proof they bite**

- `src/__tests__/app/transactions.test.tsx` (2) — renders the tab: headings come out
  `7 Sep 2026 → 8 Sep 2026 → Today`, and the three rows sharing 8 September keep their id tiebreak.
  Restoring the old `b.date.localeCompare(a.date)` **and** the `.reverse()` fails both cases; I ran
  that, then reverted.
- `src/__tests__/app/receipts.test.tsx` (2) — the cheapest grouped screen, per the plan: first
  heading oldest, `Today` last, same-day rows unmoved.
- `src/__tests__/app/insights.test.tsx` (3) — the fixture acceptance 6 blocks on. The same six
  months are handed over newest-first, oldest-first and shuffled; the card renders June, July,
  August every time. Restoring `slice(0, 3)` fails all three.
- `src/__tests__/app/reminders.test.tsx` (5) — off by default, the switch calls the mutation with
  exactly `{ enabled: true }`, the pill shows `8:00 PM` before anything is stored, the empty state is
  gone, and the counter reads `0 of 1` then `1 of 1`.
- `src/lib/group.test.ts` (+7).

**Ownership note, and a file somebody moved**

- `src/components/ui/screen.tsx` is assigned to nobody in the plan's table and I edited it, because
  the CEO's scroll decision cannot be implemented anywhere else without giving six screens their own
  nested `ScrollView`. The change is additive and opt-in: no existing caller passes `startAtEnd`, so
  every other screen behaves exactly as before. Dmitri, this is the one edit of mine that needs your
  sign-off rather than your review.
- My four render tests were written to `src/app/*.test.tsx` and somebody moved them to
  `src/__tests__/app/` while I was working. That was the right call and I have kept it — a
  `.test.tsx` under `src/app/` is a **route** to expo-router, so those four files would have shipped
  as four navigable screens. Worth writing into the house rules.

**Could not verify**

- **Nothing seen rendered on a device or Simulator.** What I have instead: 12 render assertions under
  jest, and all thirteen changed modules requested from the live Metro as their own bundle — every
  one HTTP 200, with `startAtEnd` present four times in the compiled `bills` bundle and `scrollToEnd`
  thirteen times in the compiled `screen` bundle.
- **The scroll jump itself is unproven.** `onContentSizeChange` does not fire under jest's renderer,
  so the guard logic is reviewed, not executed. Somebody with a Simulator needs to open Transactions,
  Bills, Subscriptions, Receipts and a card and confirm each lands on the newest row, that pull-to-
  refresh still works, and that changing a filter does not yank the page.
- **Dynamic Type on the receipts card** (acceptance 2). It has no chips, so it is the easy case Paulo
  predicted, but I could not measure it. Same for dark mode and the other eleven accents.
- I did not drive the receipts reminder against a real Supabase — the mutation is asserted by its
  arguments, not by watching a row change.

**Audit rows** — all fourteen filled in at `.claude/team/dev/logic-audit-2026-09-12.md`.
`verified` U1, U2, U6, U10, U12; `fixed` U7, U11 (U11 with a remaining gap); `gap` U3, U4, U5, U8,
U9, U13, U14. Where I could only read a branch rather than render it, the evidence column says so in
those words. Three new cross-cutting questions added as 11–13.

**Open questions**

1. **Home does not auto-scroll, and this is a deliberate deviation from the CEO's decision.** The
   dashboard's last section is "Coming up", not "Recent", so `scrollToEnd` would land below both and
   hide the balance hero — the screen's primary figure and the reason people open the app. Recent
   covers one week, so today is at most six headings down a page somebody is already scrolling to
   reach. Confirm or overrule; if overruled it is one prop.
2. Transactions and Receipts now open at the **bottom**, which puts the period stepper, the search
   field and the filter button off screen on arrival. That is the honest consequence of the decision
   and it is the thing a tester will report first. Priya should look at it before the Founder does.
3. `formatClock`'s uppercase `AM`/`PM` versus the plan's lowercase copy (above). Five screens.
4. The Reminders screen has **no error branch** (U11). Both its hooks expose `isError` and nothing
   reads it, so a failed read draws every switch off — which reads as "you turned these off". It is
   outside item 1's acceptance, so I rowed it rather than building it. It is a small change and it is
   my file; say the word.
5. `savings-month.tsx`, `settle-up.tsx` and `group-settings.tsx` have no loading or error state at
   all and seed forms from a query with no keyed remount (U8, U9). None of the three is assigned this
   phase.

---

## 2026-09-12 — Dilip (Developer, native and platform) — item 1 delivery, push audit, 23 native rows

**Outcome:** Done. The receipts reminder now has a delivery path in `send-push`, written so it runs
today against a database where Diego's RPC does not exist yet; notification taps now open a screen
for the first time in this app's life; and my 23 audit rows are filled in with evidence separated
into *live*, *run* and *static*. Gates: `npx tsc --noEmit` exit 0, `npx expo lint` 0 errors /
0 warnings with the cache cleared, `npx jest --ci` **30 suites / 401 tests pass**, prettier clean on
every file I touched. `npm run check` now reaches `format:check` and fails on **`app.json` alone** —
one whitespace hunk, see open question 1. Nothing committed, nothing deployed, no migration applied.

### What changed

- **`supabase/functions/send-push/index.ts`** — a fourth block after the split notices, calling
  `receipt_reminders_due()` and stamping `profiles.receipt_reminder_last_sent_on` only on a
  delivery. Its own counters `receipts` / `receiptsSent` rather than folding into `due` / `sent`.
  The RPC failure is `console.error` + continue, **not** the `return 500` that `reminders_due` uses:
  this block ships before Diego's migration is applied, and a missing function must not take the
  bill reminders down with it. Copy is the plan's, verbatim — title `Receipts`, body
  `Any receipts from today? Log them before you forget.` (The brief offered different words but
  deferred to the plan where the plan specifies; §2.2 does.)
- **`supabase/functions/send-push/index.ts`, the sender** — `pushOnce`/`push` take an optional tap
  payload. **The key is `body`, at the top level beside `aps`.** That reads like a mistake and is
  not: expo-notifications takes a *remote* notification's `content.data` from `userInfo["body"]` and
  from nowhere else — `expo-notifications@57.0.13`,
  `ios/ExpoNotifications/Notifications/NotificationRecords.swift:328-334`, read in `node_modules`,
  not remembered. Any other custom key is carried by APNs and dropped by the client. With no payload
  the JSON is byte-identical to HEAD's; proved by running both expressions side by side and by an
  assertion in the harness below.
- **`src/api/push.ts`** — new `useNotificationRouting()`, called from `useRegisterPush()` so
  `_layout.tsx` is untouched. `Notifications.useLastNotificationResponse()` → `DEFAULT_ACTION_IDENTIFIER`
  only → **an allow-list**, `TAP_ROUTES`, mapping the one route the server may ask for. The pushed
  string is data, never an instruction: anything not on the list opens nothing. It waits for
  `useNavigationContainerRef().isReady()` before pushing, because expo-router 57 queues actions and
  then **drops** them when the container has not mounted (`global-state/routingQueue.js` `run()`) —
  which is exactly the cold-start-from-a-tap case — and gives up after 10s rather than polling for
  the rest of the session. Clears the response after use so a reload cannot replay a tap.
- **New `src/api/push.test.ts`** — 13 tests. The interesting ones are the refusals: `/settings`,
  `https://example.com/pay`, `skipbudget://add-receipt`, `/add-receipt/../delete-account` and a
  non-string all open nothing. Plus: a tap that arrives before the session is honoured once it
  lands rather than dropped, and the navigator wait both fires and stops.
- **New `modules/receipt-scanner/index.test.ts`** — 5 tests running the module with the native side
  absent.
- **`.prettierignore`** — `.claude/` and `TEAM.md`. This is finding 3 from Dmitri's 2026-09-12 gate,
  assigned to me there. It takes `npm run check` from 37 failing files to 1.

### Evidence, since none of this has a device behind it

`deno` and Docker are not on this machine, so `deno check` and `supabase functions serve` were both
out. Instead I transpiled the edge function, stubbed Postgres and APNs, and **ran it**. Harness kept
in the session scratchpad, not in the repo. Ten assertions, all green:

- one due account → exactly one APNs post, `{"receipts":1,"receiptsSent":1}`, stamped
  `receipt_reminder_last_sent_on = '2026-09-12'` on `id = user-A` — the RPC's own `local_date`, so
  the sender never computes a date in its own zone (UTC), which would mark tomorrow done for anybody
  east of it;
- already stamped → zero posts, zero stamps;
- **APNs refuses** → one attempt, **no stamp**, `receiptsSent: 0`; the day stays due;
- **RPC absent** → `console.error('receipt_reminders_due failed', …)`, `receipts: 0`, and the bill
  reminder in the same run still went out;
- the bill reminder's payload has exactly one key, `aps` — the three existing blocks are provably
  unchanged.

Typecheck of the edge function: with a Deno shim it produces **one** error, a `Uint8Array`/`dom`-lib
variance artefact at the `importKey` call. `git show HEAD:` of the same file produces the identical
error. Zero new type errors from my edit.

Live, read-only, against the real project (the `supabase` CLI is a devDependency and was already
authenticated — I ran nothing that writes):
- `supabase functions list` — all three functions `ACTIVE`. `send-push` v7 `verify_jwt: false`
  (correct, pg_cron has no session), `send-message` v5 `verify_jwt: true`, `revenuecat-webhook` v1
  `verify_jwt: false`.
- `supabase secrets list` — `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `RC_WEBHOOK_SECRET`,
  `RESEND_API_KEY` all present.
- `supabase migration list --linked` — all 55 committed migrations applied remotely; Diego's
  `20260912100001` is local only, as expected.
- `supabase storage ls --experimental` — both buckets exist and **both are empty**, including
  `brand-logos`, which the audit had down as "the one bucket actually read".

### Verified in the SDK 57 docs, not from memory

<https://docs.expo.dev/versions/v57.0.0/sdk/notifications/> — `useLastNotificationResponse()`,
`DEFAULT_ACTION_IDENTIFIER`, `clearLastNotificationResponseAsync()`, `setBadgeCountAsync()`,
`getDevicePushTokenAsync()` all exist in SDK 57, and the page's own example for "responding to a
notification tap" is the shape I used, with the allow-list where it has `Linking.openURL`. Everything
else about the payload came out of the installed module's Swift, cited above, because the docs do not
say which key a direct-to-APNs payload must use. `app.json` needed no change: `expo-notifications` is
already in `plugins`, both usage descriptions are in `app.json` **and** in `ios/SkipBudget/Info.plist`
and they agree, and Android already declares `POST_NOTIFICATIONS`.

### The three findings I would not want lost

1. **There was no notification-response routing at all.** The brief said to route "via the existing
   notification-response routing"; it did not exist. `src/api/push.ts` was the only file in the tree
   importing `expo-notifications` and it never read a response. Every notification this app has ever
   sent opened wherever the app was last left. Now built, but it is new code nobody asked for in the
   plan — please review it as such.
2. **Signing out does not unregister the phone.** Nothing in `src` deletes a `device_tokens` row.
   After a sign-out, that account's reminders keep arriving on the handset until some *other*
   account registers the same token, which needs `reminders_enabled_at` **and** iOS permission. One
   person's bill and payday notices on a phone they no longer use is a privacy problem. Three lines
   in `src/api/auth.ts`, which nobody owns this phase — I did not touch it.
3. **Two of the four "unused" native deps are not ours to remove.** `expo-symbols` and
   `expo-glass-effect` are direct dependencies of `expo-router@57.0.15` and are imported by its
   `createNativeStackNavigator` and `native-tabs` code. Dropping them from `package.json` changes
   nothing: npm installs them anyway, autolinking still compiles them, `Podfile.lock` does not move.
   **Only `expo-blur` and `expo-linear-gradient` are genuinely removable** — nothing else depends on
   either. Cost for those two: `npm uninstall`, `pod install` under a UTF-8 locale, one clean device
   build, and a check that the built `.app` actually lost both pods. ~1 hour plus the build. Not
   done — it moves `Podfile.lock` and needs Founder approval.

### Could not verify

- **Nothing on a device or Simulator.** Not the tap opening `/add-receipt`, not a real receipt
  through VisionKit, not the badge clearing, not an actual APNs delivery. The camera path is verified
  as far as jest can take it — the optional-module fallback, the older-build fallback, and that
  `applyScan` really calls `setAmount` — but no photograph has been through it.
- **The live `cron.job` row.** The migration that schedules it is applied remotely, which proves the
  statement ran once; it does not prove the row still says `*/15` or is still active. `supabase db
  dump` needs Docker. SQL for the CEO is in the audit file.
- **That deployed `send-push` v7 is the same source as this repo.** `supabase functions download`
  would answer it but **overwrites the working file**, which holds unreviewed work.
- **The 401 on the live function.** I was not permitted to make that request from this session and
  did not work around it. The command is in the audit file; the positive case must not be run by
  hand, it dispatches real pushes.
- **Whether a TestFlight export rewrites `aps-environment` to `production`.** The entitlements file
  hardcodes `development`. If it does not get rewritten, every TestFlight push fails once and
  succeeds on the retry — but only because of the correction block at `send-push:156-188`.
- `npx expo-doctor` still reports the same two pre-existing failures (CocoaPods not on this shell's
  PATH; 31 SDK packages at older patch versions). I added no dependency.

### Open questions

1. **`app.json` is the only thing left failing `npm run check`.** The hunk is one line of
   whitespace: `"permissions": ["POST_NOTIFICATIONS", "SCHEDULE_EXACT_ALARM"]` on one line instead
   of four. Zero semantic change. I did not do it, because "the branch has an `app.json` diff" is
   the kind of thing that stops a reviewer, and the plan says an `app.json` change is a conversation.
   One word from the CEO and it is done.
2. **Is the tap routing wanted at all this phase?** It is the right behaviour and it is tested, but
   it is unplanned work in a file the plan froze to item 1 and item 3. If Dmitri would rather it
   landed on its own, `src/api/push.ts`'s routing hook and `src/api/push.test.ts` lift out cleanly —
   the edge function's payload is additive and harmless without them.
3. **Finding 2 above — the sign-out hole.** Who takes `src/api/auth.ts`? It should not wait for
   Phase 3.
4. **Permission revoked in iOS Settings is invisible** (audit N4). Detecting it is easy; deciding
   what the Reminders screen *says* is Priya/Pia. The plan told me to report and not build.
5. `.prettierignore` now hides `.claude/` from `format:check`. That was Dmitri's instruction, but it
   also means these logs are never format-checked again. Confirm that is what he wanted.

---

## 2026-09-12 — Dana (Developer, UI and navigation) — Tia's blocker + Dmitri's fix batch on `almost-done-all-pages`

**Outcome:** Done. Tia's blocker (bug 2) is root-caused and fixed, bug 3 is closed, Dmitri's findings
4, 6 and 8 and nits 10–13 and 15 are in, and bug 4 has a mechanism I can name. Gates, after
`rm -rf .expo/cache/eslint`: `npx tsc --noEmit` exit 0, `npx expo lint` 0 errors / 0 warnings,
`npx prettier --check src` clean, `npx jest --ci` **31 suites / 407 tests pass** (including the other
session's new files — nothing of theirs failed, nothing of theirs was touched). Nothing committed.

**Root cause of the dead back chevron (Tia bug 2).** Not the handler — every screen wires `onBack`
correctly. The centred title in `step-flow.tsx` is a normal-flow child laid out across the *whole*
header row, rendered after the absolutely-positioned chevron, so it sits on top of it. A plain
`<Text>` is still a hit target on Fabric: `RCTParagraphComponentView` inherits
`RCTViewComponentView`'s `hitTest`, whose inner `RCTParagraphTextView` returns nil but the paragraph
view itself returns `self` (`node_modules/react-native/React/Fabric/.../RCTViewComponentView.mm:772`,
`RCTParagraphComponentView.mm:387`). The tap therefore landed on the title, which has no responder,
and the chevron — a *sibling*, not an ancestor — never saw it. That is also why the identical-looking
back button on plain screens worked: `Screen`'s `BackButton` has nothing over it. Step 0 was broken
too; it just looked like "back left the flow", which is what it does there anyway.

**What changed**
- `src/components/flow/step-flow.tsx` — title gets `pointerEvents="none"` (and the chevron `z-10` +
  `hitSlop={8}`) so the tap reaches the button; `<Stack.Screen options={{ gestureEnabled: current === 0 }} />`
  rendered from inside the flow, so an edge swipe on a later step is off rather than popping the route
  and three steps of typing; `BackHandler` under expo-router's `useFocusEffect` returns `true` and
  steps back on Android when `current > 0`, `false` on step 0; `AccessibilityInfo.sendAccessibilityEvent(ref, 'focus')`
  replaces the deprecated `setAccessibilityFocus` + `findNodeHandle` (finding 4), and now also fires on
  steps with no question line by focusing the title (nit 11). `options` is memoised because expo-router's
  `Screen` calls `navigation.setOptions` on every identity change. Verified against
  docs.expo.dev/versions/v57.0.0/sdk/router (`gestureEnabled`, iOS only) and the installed
  `expo-router/build/layouts/stack-utils/StackScreen.js` ("Can be used in the `_layout.tsx` files, or
  directly in page components").
- **New `src/components/flow/step-flow.test.tsx`** — 6 tests: the back control on step 2 steps back and
  `router.back` is *not* called; step 0 does call it; the title carries `pointerEvents="none"` (the
  regression test for the real bug); `gestureEnabled` is true on step 0 and false on step 1; the
  hardware-back handler returns `true` and steps back on a later step, `false` on step 0.
- `src/app/add-bill.tsx` (Tia bug 3) — the "To" picker's `onConfirm` now refuses an end date before the
  start instead of accepting it, compared as ISO days (`toIsoDate(a) < toIsoDate(b)`, no clock in it),
  and reports it through the screen's existing `fail(…, 'when')` machinery: **"The end date cannot be
  before the start date."** A valid pick clears the message. The start-side guard (drop an end that is
  now earlier) was already wired to the inline calendar and is unchanged.
- `src/components/ui/action-pill.tsx`, `range-dropdown.tsx`, `reminder-field.tsx` (finding 6) —
  `hitSlop={{ top: 4, bottom: 4 }}` on the three 40pt pills, so the target is 44pt.
- **Deleted** `src/components/ui/collapsible-section.tsx` and `src/components/ui/info-dialog.tsx`
  (finding 8, CEO decision). Grepped first: zero importers, only a comment in `confirm-dialog.tsx`
  mentions InfoDialog by name. **The "Why add these?" copy went with them** — `MORE_SETUP_INFO`,
  "Adding more details helps Skip calculate accurate balances and predict future transactions made with
  this card/account." Mia to decide whether it returns as a one-line caption on the details step.
- `src/components/ui/text-field.tsx`, `src/components/brands/brand-field.tsx` (nit 10) — the last two
  `border-red-500` → `border-danger`.
- `src/components/flow/inline-calendar.tsx` (nit 9) — doc comment no longer claims the modal draws no
  today marker; it does. `src/components/flow/amount-keypad.tsx` (nits 9, 15) — dead `className` prop
  removed from the props type, and the 4×3 layout is now sliced from `AMOUNT_KEYS` instead of being
  written a second time (the cast at the call site went with it).
- `src/app/add-account.tsx` (nit 13) — the income pad's caption is the neutral "Each pay period"; the
  pay-frequency chips live on the step *after* it, so naming a cycle there stated a choice nobody had
  made. `frequencyMeta` was then unused and is gone.
- `src/components/flow/amount-figure.tsx` (nit 12, one-liner) — `minimumFontScale` 0.6 → 0.5, so the
  longest figure the keypad allows (`999,999,999.99`, 14 glyphs) still shrinks rather than hitting the
  floor and ellipsising on a 320pt screen. Still unverified on a device; it only lowers the floor, so it
  cannot make anything worse.
- `src/app/add-receipt.tsx` (bug 4, partial) — see below.
- `src/app/(tabs)/cards.tsx` — the unused `useColors` was already gone; lint is clean.

**Bug 4 hypothesis — a save that reports success and writes nothing can only be an *update*.** The
create path cannot do it: `useCreate` ends `.insert(...).select('id').single()`, and `single()` throws
when no row comes back, so a failed insert reaches the `catch` and shows a message. `handleSave` awaits
`mutateAsync` *before* `success()` and `router.back()`, so the screen cannot navigate away early; there
is no optimistic update anywhere in `mutations.ts` (`onSuccess` only invalidates); and the "Add 'X'"
brand path sets `brandId: null` with the typed name, which is a perfectly valid row (a truly unset store
is caught loudly by "Pick a store first."). What is left is `useUpdate`: `.update(values).eq('id', id)`
with **no `.select()`** — PostgREST returns 204 and no error when the filter matches zero rows, so a
mutation against a row that is gone (or invisible to RLS) resolves happily, the haptic fires, the flow
pops and nothing was written. The screen can enter that state because `editing` is derived from the URL
param alone: `const { id } = useLocalSearchParams()` → `editing = Boolean(id)`, while `useReceipt(id)`
uses `.maybeSingle()` and returns null for a row that no longer exists. That matches Tia's report
exactly — success, and the list still reading -$77.00 / 3 to the cent — and it matches the messy stack
she describes (an earlier `/add-receipt?id=…` edit instance for a receipt that was later deleted).
**Applied in the screen:** `missing = Boolean(id) && isFetched && !existing` and the form is handed
`id={missing ? undefined : id}` — once the lookup has actually run and come back empty the screen is a
new receipt, not an edit of a row that is not there, so Save creates instead of silently no-op'ing. An
id that has not been read yet (or a query disabled because the session is not up) is still an edit, so
no real edit changes behaviour. **For Diego (src/api, untouched):** the definitive fix is in
`useUpdate` — `.update(values).eq('id', id).select('id')` and throw when nothing came back. Every
update in the app shares that helper, so every edit screen in the app has the same silent-no-op hole,
not just receipts. I could not reproduce Tia's instance; this is a mechanism that fits, not a
confirmed repro.

**Could not verify:** nothing on a device or Simulator — Metro was down, per the CEO's note.
Specifically unverified by eye: that the chevron now responds on all seven flows (the fix is in shared
chrome and unit-tested, but a render is a render), that VoiceOver actually lands on the question/title
under the New Architecture, the 64px figure on a 320pt screen, and the hardware-back path on a real
Android build.

**Open questions**
1. `add-bill`'s category chooser is a pre-step *outside* `StepFlow`, so on the amount step `dot === 0`
   and the edge swipe is therefore still enabled there — a swipe leaves the route instead of returning
   to the chooser, losing the typed amount. Every other flow is exact. Fixable with an optional
   `gestureEnabled` prop on `StepFlow`; I kept to the brief's one-liner instead. Dmitri's call.
2. The edit-skeleton branches (`add-receipt`, `add-bill`) render `StepFlow` at `current={1}`, so the
   edge swipe is off for the second or two the row is loading, where the chevron still works. Harmless,
   but it is a deliberate trade rather than an oversight.
3. Finding 7 (validation copy unreachable behind `primaryDisabled`) is untouched — still waiting on
   Priya/the Founder, and it is the one item that changes the feel of every add flow.
4. Mia: does "Why add these?" come back as a caption on the details step, or is it retired?

---

## 2026-09-12 — Dmitri (Development Team Lead) — Phase 2 engineering gate

**Outcome:** **Ready after fixes.** Phase 2 is the strongest work this team has produced on this
branch — the money maths is fixture-backed, the RPC contract held across three developers without a
seam defect, and every frozen file is provably untouched. It is not ready to merge as it stands for
two reasons: `npm run check` is red, and the whole of item 1 rests on SQL that has never been
executed anywhere.

**Gates I ran myself**, with `rm -rf .expo/cache/eslint` first:
- `npx tsc --noEmit` — exit 0.
- `npx expo lint` — exit 0, 0 errors / 0 warnings.
- `npx prettier --check src supabase modules` — **clean**, all matched files.
- `npx prettier --check .` (inside `npm run check`) — **fails on `app.json` alone**, exit 1, so
  `npm run check` never reaches jest. Established something Dilip's entry did not: `git status
  --short app.json` is **empty** and `git show HEAD:app.json` fails prettier too. The file is not a
  Phase 2 change; it has been unformatted since before this branch. The whole delta is the Android
  `permissions` array on four lines instead of one. **Approved** — run `npx prettier --write
  app.json`, zero semantic change, and `git diff app.json` must show only that collapse.
- `npx jest --ci` — **31 suites / 407 tests**, not the 30/401 the entries claim; the count moved
  because a parallel session landed `src/components/flow/*` and its tests in the same tree. Green on
  runs 2–7, including after `npx jest --clearCache`. **Run 1 failed**: 2 tests in
  `src/components/flow/step-flow.test.tsx:116`. Passes in isolation. Recorded as a flake, not
  dismissed.

**Verified myself rather than taken from a log**
- SDK 57, from <https://docs.expo.dev/versions/v57.0.0/sdk/notifications/> and from the installed
  `expo-notifications@57.0.13`: `useLastNotificationResponse`, `DEFAULT_ACTION_IDENTIFIER`,
  `clearLastNotificationResponseAsync`, `getDevicePushTokenAsync`, `setBadgeCountAsync` all present.
  `Haptics.selectionAsync` present in expo-haptics 57.
- **Dilip's `body` payload key is right, and I read the source, not the log.**
  `node_modules/expo-notifications/ios/ExpoNotifications/Notifications/NotificationRecords.swift:329-334`
  — `serializedNotificationData` returns `request.content.userInfo["body"]` for a remote trigger and
  the whole `userInfo` otherwise. Any other custom key would have shipped a tap that did nothing.
- **The RPC contract held.** Diego's `receipt_reminders_due()` returns exactly the pinned
  `(user_id, local_date, title, body)`; Dilip's block consumes exactly that and stamps the RPC's own
  `local_date` rather than computing a date in the server's zone. The `revoke all … from public,
  anon, authenticated` with no explicit grant matches `reminders_due()` and `split_notices_due()`
  byte for byte, and those are live and delivering, so the grant model is precedent, not a guess.
  `receipts.created_at timestamptz not null` exists (`20260827100009:38`), so the skip clause is
  valid SQL against the real schema.
- **Frozen files are frozen.** `git status --porcelain src/lib/card-ledger.ts src/api/charges.ts
  src/api/splits.ts src/api/mutations.ts` is empty. `src/lib/group.ts`'s default direction is
  unchanged; the only deletion in `group.test.ts` is an import line. `src/lib/loan.test.ts` has
  **568 insertions and zero deletions** — the 45 pre-existing fixtures, including the real lender
  statement, are literally untouched and still pass, which is the strongest available evidence that
  no saved loan's figures moved.
- **No figure can move on the reordered screens.** `ledgerForSource` returns `charged`, `paid` and
  `balance` as aggregates (`card-ledger.ts:432`), never a per-row running balance, so sorting
  `entries` for display in `source/[id].tsx` cannot shift a cent. Same for `savings.tsx` totals.
- Nothing committed, nothing deployed, no migration applied, HEAD still `4afb0f0`. No scratch files:
  every untracked path is declared work.

**Findings** (full numbered list with severity, file:line, fix and owner is in my report to the CEO).
Two blockers: the unexecuted migration, and the red `npm run check`. Eight should-fixes, of which the
three I care most about are not Phase 2 regressions at all — `useUpdate` (`mutations.ts:79-82`) has
no `.select()`, so **every edit screen in the app can report success and write nothing**; `signOut`
(`auth.ts:109`) never deletes the `device_tokens` row; and `auth.tsx:37` sends Apple and Google users
straight to `/home`, so they are never asked for a display name — `src/api/auth.ts:73` sets
`display_name` on email signup only. That last one settles D14: **`auth.tsx` is the bug, not
`hello.tsx`'s comment.**

**Sign-offs asked of me**
- `src/components/ui/screen.tsx` `startAtEnd` (Dana, unowned file) — **approved.** Additive, opt-in,
  default off, guarded on a `jumped` ref and on a real `scrollToEnd`. One note: the same diff also
  swaps `RefreshControl tintColor="#9A9A9A"` for `colors.muted`. Right change, undeclared — say it
  next time.
- `useNotificationRouting` (Dilip, unplanned) — **approved, keep it in this phase.** The allow-list
  is the correct shape: the pushed route is data and is never handed to `router.push` or
  `Linking.openURL` raw. Lifting it out would leave a payload key nothing reads.
- Dana's Home deviation (no `scrollToEnd`, because the last section is "Coming up" and the jump would
  hide the balance hero) — **upheld.** Her open question 2 is the real risk: Transactions and
  Receipts now open at the bottom with the period stepper, search field and filter button off screen.
  Priya before the Founder.
- `formatClock`'s uppercase `AM`/`PM` versus the plan's lowercase prose — **Dana is right.** The plan
  was prose; one row disagreeing with the other four on the same page is worse.
- `zod` — **the dependency goes.** A tested pure parser at the boundary is the house pattern and
  Diego used it.
- `src/data/receipts-mock.ts` — delete it, zero importers confirmed.

**Commands for the CEO, after the Founder approves** — in this order, and the first is a gate on the
rest: a local `supabase db reset` + Diego's seven acceptance queries; then `npx supabase db push`;
then `npx supabase functions deploy send-push`; then the read-only `cron.job` check and the 401 check
from the audit file. Nothing here is safe to run out of order — deploying the sender before the
migration is applied is survivable (the block logs and continues), but pushing the migration without
a transcript is not.


---

## 2026-09-12 — Dilip (Developer, native and platform) — Dmitri's Phase 2 findings 2, 5 and 13

**Outcome:** Done. All three items are in, and **`npm run check` now reaches jest and exits 0** —
`tsc --noEmit`, `expo lint` (0 errors / 0 warnings), `prettier --check .` (all matched files) and
`jest` **33 suites / 431 tests passed**. Gates re-run from clean after `rm -rf .expo/cache/eslint`.
`npx expo-doctor`: 19/21, the same two pre-existing failures as before my change (patch-version
drift across 31 Expo packages, and no CocoaPods on this shell's PATH) — neither is touched by
anything here. Nothing committed, nothing deployed, no migration run.

**Finding 2 — `app.json` (blocker, and it was the whole reason `npm run check` never reached jest).**
`npx prettier --write app.json`. `git diff app.json` is exactly the four-line Android `permissions`
array collapsing to one line and nothing else — 1 insertion, 4 deletions, no key added, removed,
renamed or reordered. Dmitri's reading holds: the file was unformatted before this branch existed,
so this is not a Phase 2 change being tidied. Repo-wide `prettier --check .` is now clean.

**Finding 5 — sign-out never unregistered the phone (`src/api/auth.ts`, `src/api/push.ts`).**
New `forgetDevice(userId)` in `push.ts`, the mirror of `registerDevice`, called from `signOut()`
**before** `supabase.auth.signOut()`.
- *Which row.* By **token**, not by user. `device_tokens.token` is unique and is what the upsert
  conflicts on (`20260829100009:37`), i.e. one row per device — so `delete().eq('user_id', …)`
  alone, which is what the audit originally sketched, would also silence the same account's other
  handsets. The delete carries `user_id` **and** `token`.
- *Why before.* The delete policy is `auth.uid() = user_id`. After the session is cleared the row is
  unreachable from the client forever, and until something deletes it the 15-minute job keeps
  pushing that account's bill, payday and receipts reminders at a phone nobody is signed in on.
- *Failure is tolerated.* `console.warn` and sign out anyway. Reading the device token throws on a
  simulator, the network can be down, and none of that is a reason to keep somebody signed in to an
  account they asked to leave. `getSession()` (stored session, no round trip) supplies the user id,
  so the signature did not change and no screen needed editing — Dana's `settings.tsx:414` is
  untouched.
- *The account-delete path already did it.* `delete_my_account()` ends `delete from auth.users`
  (`20260827100013:36`) and `device_tokens.user_id` is `on delete cascade`, so the row goes with the
  account; a client delete there would match nothing. Said so in the function's doc comment rather
  than adding a second, redundant call.
- *Permission is not required to read the token.* iOS registers with APNs even where the user
  refused the alert, so a permission revoked in Settings does not strand the row.
- *Tests.* **New `src/api/auth.test.ts`** — 5 cases: the order is pinned as `['forget','signOut']`;
  it still signs out when the delete throws, when the session cannot be read and when there is no
  session; and a genuine sign-out failure still comes back as a sentence. 6 more in
  `src/api/push.test.ts`: the filters are exactly `user_id` then `token`, nothing is attempted on a
  simulator or with an empty/non-string token, and a refused delete throws so the caller can log it.
  **Falsified** — with the `forgetThisDevice()` call removed, 3 of the 5 auth cases fail; restored
  and re-run green.

**Finding 13 — `zod` removed.** Confirmed zero imports first: `grep -rn zod` across `src`,
`supabase`, `modules` and `plugins` (excluding `node_modules`) returns nothing but `package.json`
and prose in these logs. `npm uninstall zod`. The entire diff is one line out of `package.json` and
two in `package-lock.json` — zod stays *installed* as a transitive dep of
`eslint-plugin-react-hooks`, so the lock re-marks it `devOptional` instead of dropping the entry.
**Nothing under `ios/` moved**, as required: `ios/Podfile.lock` hashes `db96f8ea…` before and after,
and `find ios -mmin -15` is empty. No `pod install`, no build, no signing or bundle id near it.

**Audit file** (`.claude/team/dev/logic-audit-2026-09-12.md`) — my rows only. N1 is now `fixed` for
(a) with the implementation, the tests and the falsification; (b) — a *rotated* token leaving a
stale row — stays a self-healing gap. N6 and N7 now carry, inline, the exact thing for the CEO to
run and what a wrong answer means: N6 is the read-only `select … from cron.job where jobname =
'skip-send-push'` (expect `*/15 * * * *`, `active = true`), N7 is the unauthenticated `curl -i -X
POST …/functions/v1/send-push -d '{}'` expecting `401 {"error":"Not for you."}` — **and never the
positive case, which dispatches real pushes to real phones**. Cross-cutting questions 7 (zod) and 8
(sign-out) closed with dates.

**Could not verify:** nothing on hardware. Specifically, no real sign-out has been watched deleting
a real row — `device_tokens` cannot be read from this session without a live query, and the token
read needs a device. The one-account, two-devices case is argued from the unique constraint and
pinned in tests, not observed.

**Open questions**
1. Rows stranded *before* today are not reached by this fix. A phone that signed out last week still
   holds a row, and the sender only drops it when APNs answers `Unregistered` — which needs the app
   deleted from that handset. If the CEO wants those cleared, it is a one-off `delete from
   device_tokens where user_id = …` per affected account, and somebody has to decide who is
   affected. Not something I would run from here.
2. `@hookform/resolvers@5.9.1` is imported nowhere either, and `react-hook-form` is not a dependency
   at all — the same finding as zod, outside this brief, and pure JS so it costs no build.
3. `.claude/agents/diego.md:14` still tells Diego to "validate all external data with zod at the
   boundary", which is now false. Dmitri's file, not mine to edit.
4. N14 still stands and it is the one that bites at TestFlight:
   `ios/SkipBudget/SkipBudget.entitlements` hardcodes `aps-environment = development` and `push.ts`
   registers every token as `development`. Whether an App Store export rewrites it is unproven from
   this machine. Worth one check before any TestFlight build.

---

## 2026-09-12 — Diego (Developer, data and backend) — Dmitri's findings 3, 4, 6 (hook) and 12 on `almost-done-all-pages`

**Outcome:** Done, with one half of finding 3 left deliberately undone because it lives in a file I
was not given. Monthly rests can now be stored as themselves, every edit in the app can no longer
report success while writing nothing, `useSalaryAccountIds` can say a read failed, and the dead
receipts mock is gone. Gates after `rm -rf .expo/cache/eslint`: `npx tsc --noEmit` exit 0,
`npx expo lint` 0 errors / 0 warnings, `npx prettier --check src supabase` clean,
`npx jest --ci` **33 suites / 431 tests pass** — 32 suites / 418 tests before my 13 new cases (8 in
the new `src/api/mutations.test.tsx`, 4 in `queries.test.tsx`, 1 in `reminders.test.tsx`); nothing of
Dana's or Dilip's was touched or failed. Nothing committed, nothing pushed, no migration applied — HEAD is
still `4afb0f0`.

**Migrations to apply, in this order**

1. `supabase/migrations/20260912100001_receipt_reminder.sql` — mine from the previous batch, still
   unapplied anywhere.
2. `supabase/migrations/20260912100002_monthly_rests.sql` — **new.** Drops and re-adds
   `loans_day_count_basis_check` as
   `check (day_count_basis in ('actual/365','actual/360','30/360','monthly'))`. The shipped
   `20260829100014_loan_accrual.sql` is untouched. **No data change on purpose**: every existing
   `'30/360'` row is either someone's deliberate choice or a whole-month monthly-rest loan that
   prices identically under both conventions, and rewriting any of them would reprice a loan that
   has already been checked against a statement. Neither file has been executed — there is still no
   Docker and no Postgres on this machine.

**Finding 3 — monthly rests are now a storable convention.** The engine has priced four conventions
since Phase 1 (`AccrualBasis`, `src/lib/loan.ts:63`) but the column allowed three, so `save-loan.tsx`
filed 'monthly' as '30/360' and refused outright when the opening period was odd — which is the one
case where the two genuinely disagree (monthly rests charge the stub as per diem on actual/365;
30/360 counts it as thirtieths of a month, so filing it would have moved the figures the user had
just read). Beyond the migration: `LoanRow.day_count_basis` (`src/api/queries.ts:1051`),
`SaveLoanValues.dayCountBasis` (`src/api/mutations.ts:383`) and `StoredLoan.day_count_basis`
(`src/lib/loan.ts:779`) are all `AccrualBasis` now — the third was required, not optional:
`add-bill.tsx:208` hands a `LoanRow` straight to `termsFromStored`, so widening only the API type
would not have compiled. `storableBasis` and the refusal are gone from `save-loan.tsx`; it sends the
basis it priced with. **No money figure moves for any loan already on file** — `loan.test.ts`'s 45
fixtures, the real lender statement among them, are untouched and still green.

**Read-only check Dmitri asked for: `loan-schedule.tsx` needs no change.** `add-bill.tsx:464` passes
the stored `loan.day_count_basis` through as the `basis` route param, `parseBasis`
(`loan-schedule.tsx:20`) already whitelists 'monthly', and `BASIS_FOOTNOTES` (`:31`) already has
monthly copy. A stored monthly-rest loan renders with the right arithmetic and the right footnote.

**The half I did not do, and it blocks the feature.** The same refusal exists a second time at
`src/app/loan-calculator.tsx:174-182`, with its own dialog and its own copy ("Monthly rests with an
odd first period cannot be saved yet — your bills can only hold the daily and 30/360
conventions…"). Until that guard and `oddOpeningDays` (`:159`) go, a monthly-rest loan with an odd
first period never reaches `save-loan.tsx` at all, so end to end nothing has changed for that case.
`loan-calculator.tsx` is a screen and was not on my file list while Dana works in parallel, so I left
it. It is a delete of the `if` block, the now-unused `oddOpeningDays`, and the `monthsAndDaysBetween`
import if nothing else uses it. **Dmitri to assign it.** Note also the release ordering: the app
must not ship ahead of `20260912100002`, or saving a monthly-rest loan raises a raw check-constraint
error into the screen's catch.

**Finding 4 — an edit can no longer report success and write nothing.** Dana's mechanism was right.
`useUpdate` (`src/api/mutations.ts:99`) ran `.update(values).eq('id', id)` with no `.select()`;
PostgREST answers an update whose filter matches zero rows with 204 and **no error**, so an edit of a
row that had been deleted — or that RLS will not show this account — resolved happily, the haptic
fired and the flow popped. Every edit screen in the app shares that helper. `useUpdateProfile`
(`:161`) and `useSetReceiptReminder` (`src/api/reminders.ts:373`) had the identical shape and are
fixed the same way; I took the two extra ones because they are the same bug in the same two files I
was given, and leaving them would have left "display name saved" and "receipts reminder on" able to
lie. All three now `.select('id')` — the minimal column, since the caller already has the values it
sent — and throw the new exported `NOTHING_UPDATED`: *"That is no longer there to update. Go back and
open it again from the list."*

**New `src/api/mutations.test.tsx`** — 8 cases: an ordinary edit still sends the values and the
filter it was given; the select asks for `id` and nothing wider; zero rows back **rejects** with
`NOTHING_UPDATED`; a failed write invalidates **nothing** (an eager refresh would repeat the same lie
one layer up); a real edit still invalidates `receipts` and `dashboard`; a genuine database error
still propagates unchanged; and `useUpdateProfile` on both sides. The fake client is deliberately
still awaitable *without* a select, so reverting to the old chain fails these tests rather than
passing them silently. One more case in `src/api/reminders.test.tsx` for the receipts switch, whose
existing mock I had to widen to the new chain.

**Finding 6, hook half — `useSalaryAccountIds` (`src/api/queries.ts:288`).** It now returns
`{ ids, isLoading, isError, refetch }`. **For Dana: the field names are `isError` and `refetch`, and
the change is purely additive** — `ids` and `isLoading` mean exactly what they did, so
`add-account.tsx:158` and `reminders.tsx:94` compile and behave unchanged until you wire them. The
reason it matters is that an empty set is what both screens use to decide the payday reminder does
not apply, so a failed read currently removes that setting from the page with no explanation. 4 new
cases in `src/api/queries.test.tsx` pin it, including a refetch that re-reads the table and then
answers with the new account.

**Finding 12 — `src/data/receipts-mock.ts` deleted.** Grepped first, whole repo minus `node_modules`
and `.git`: the only hits are this log and the audit file. No importer in `src`, `supabase` or
`modules`; its `Receipt` type was exported to nobody. tsc and the full suite are green after it.

**Audit file** — `.claude/team/dev/logic-audit-2026-09-12.md`: D12 and D13 updated, **D16** (monthly
rests, `fixed` app / **unapplied** SQL) and **D17** (the `useUpdate` hole, `fixed`) added,
cross-cutting questions 5 and 6 closed, and **question 14** added for the calculator guard above. I
did not touch anyone else's rows.

**Could not verify**
- Neither migration has been run anywhere. The widened constraint, and therefore any monthly-rest
  loan actually reaching the `loans` table, is static evidence only.
- The `NOTHING_UPDATED` message has never been seen on a screen — I could not reproduce Tia's
  instance, and Metro is still down.
- That no *other* caller of `useUpdate` relied on a no-op succeeding. Nothing in the tree suggests
  one does, but the helper is used by six tables and every add/edit flow.

**Open questions**
1. Dmitri: who removes the `loan-calculator.tsx` guard? Finding 3 is not delivered to the user until
   it goes, and it is a screen file.
2. `NOTHING_UPDATED`'s wording is mine, not Priya's or Mia's. It is the first error copy in the app
   that says a row vanished; if there is a house phrasing for that, the string is in one place
   (`src/api/mutations.ts:26`) and is cheap to change.
3. Should a zero-row update also be reported to Sentry? It now throws, so the screen tells the user,
   but nobody is told it happened — and it is a symptom of a stale cache or an RLS surprise, both of
   which are worth knowing about. Not built; it is a decision, not a line.

---

## 2026-09-12 — Drew (Developer, money maths) — the second monthly-rests refusal, in `loan-calculator.tsx`

**Outcome:** Done. The calculator no longer refuses to file a monthly-rest loan with an odd first
period; it prices it as the engine prices it (one whole rest plus per diem on the leftover days) and
hands that basis to `/save-loan` untouched, so Diego's finding 3 is now delivered end to end. Gates
after `rm -rf .expo/cache/eslint`: `npx tsc --noEmit` exit 0, `npx expo lint` exit 0 with no errors
or warnings, `npx prettier --check src` clean, `npx jest --ci` exit 0 — **33 suites / 435 tests**,
against Diego's 33 / 431, which is exactly my 4 new cases and nothing else. Nothing committed.

**What changed**

`src/app/loan-calculator.tsx` — five edits, no other screen touched:
1. The refusal is gone: the `if (basis === 'monthly' && oddOpeningDays > 0)` block, its dialog copy,
   the now-unused `ask`/`useDialog`, and the stale `// Saving waits on the data layer.` line above
   `handleSave`. `handleSave`'s doc now states why the basis passes through untouched and names the
   migration the column depends on.
2. `oddOpeningDays` is replaced by `stubDays`, which describes the first period instead of blocking
   it: `basis === 'monthly' ? monthsAndDaysBetween(fundedOn, startDate).days : 0`. The comment next
   to it carries the formula and where it lives (`interestFraction`, `@/lib/loan`).
3. The opening-period callout is now `oddOpening`. **The old condition was wrong under monthly
   rests and the new one is not**: funding on 1 Feb with a first payment on 1 Mar is 28 days, so the
   old test (`openingDays !== 30 && openingDays !== 31`) fired and said "First payment covers 28
   days, not a month" on a period that is exactly one rest and is billed as one twelfth. Monthly
   rests now reads "First payment covers a month plus 14 days — $228.17 of it is interest", and only
   when there really is a stub. **The daily conventions render the identical sentence they did
   before** — same condition, same wording.
4. `BASIS_NOTES.monthly` gains the stub: "…Any odd days before the first payment are charged on top,
   by the day." Without it the footnote described a loan the screen can now price but not the price
   it shows.

`src/lib/loan.test.ts` — one new fixture, **684 insertions and 0 deletions across the whole file
diff, so no existing fixture moved a character**. `describe('fixture: $25,000 at 7.5% over 60
months, monthly rests with a 14-day stub')`, 4 cases, every expected figure hand-computed in Decimal
from the conventions in the module *before* the engine was run, not read back off it:

- i = 7.5%/12 = 0.00625; f₀ = i + 14 × 7.5%/365 = 0.00912671232876712.
- payment = P(1+f₀)(1+i)⁵⁹ i / ((1+i)⁶⁰ − 1) = 502.38084939… → **$502.38**.
- first posting = 156.25 (rest) + 71.91780822 (stub) = 228.16780822 → **$228.17**, leaving $274.21
  off the balance and **$24,725.79** owed; term interest **$5,142.83**; final payment **$502.41**.
- The same terms funded a whole month before the first payment are the textbook **$500.95** — which
  is the figure `calculateLoan` has been pinned to since Phase 1, so the stub case is anchored to an
  existing known-good number rather than only to itself.
- **Why the migration matters, pinned:** the same loan on '30/360' counts 46 days and posts
  **$239.58** on a **$502.61** payment. Filing monthly rests in the '30/360' column would have moved
  the first statement line by $11.41 and every payment by $0.23. That is the old mapping, now a
  failing expectation if anyone reinstates it.
- The fourth case is the round trip: `comparePrepayment(...).base` (what the calculator shows) ===
  `amortise(...)` (what `/save-loan` files) === `amortise(termsFromStored({ day_count_basis:
  'monthly', monthly_payment: 502.38, … }))` (what `/loan-schedule` renders), row for row via
  `toEqual`, not just on the totals. `termsFromStored` had no test before this.

**Read-only check Diego asked for: `loan-schedule.tsx` needs no change, confirmed a second way.**
`add-bill.tsx:453-467` passes the stored `day_count_basis` **and** the stored `monthly_payment`,
`parseBasis` whitelists 'monthly', `BASIS_FOOTNOTES.monthly` exists, and the round-trip case above
proves the rows are identical to the calculator's. The calculator's own schedule push sends `basis`
with no payment and re-solves the same terms, which lands on the same $502.38.

**Could not verify**
- Nothing rendered. There is no test suite for `loan-calculator.tsx` or `loan-schedule.tsx`, so the
  new callout string and the removed dialog are verified by reading and by tsc, not by a render. The
  arithmetic behind them is fixture-pinned; the JSX is not.
- Nothing saved. `20260912100002_monthly_rests.sql` is still unapplied, so a monthly-rest loan has
  never actually reached the `loans` table. **The release ordering Diego flagged now bites for real**:
  ship this app build ahead of that migration and the first monthly-rest save raises a raw
  check-constraint error into `save-loan.tsx`'s catch.

**Open questions**
1. `BASIS_FOOTNOTES.monthly` on `loan-schedule.tsx` says "February costs the same as March" and says
   nothing about the opening stub, so on a stub loan row 1 shows "45d" next to an interest figure
   that is a rest plus fourteen days. The figures are right and the row is honest; the footnote is
   just silent about the one period it does not describe. One sentence would close it — Dana's file
   this week, and copy is Priya's call, so I left it.
2. The em dash in the callout is now `{' — '}` between two branches rather than baked into one
   string. Reads identically; flagging it only because it is the kind of thing a copy review sees.
3. `BASIS_CHOICES` offers three of the four conventions and 'actual/360' has a note but no chip.
   Deliberate as far as I can tell, but it means a loan stored as 'actual/360' (possible through the
   API type) can be shown and never re-selected on this screen. Not in my brief; worth a decision.

---

## 2026-09-12 — Dana (Developer, UI and navigation) — Dmitri's Phase 2 findings 6–11, 15, 16

**Outcome:** Done. Findings 6, 7, 8, 9, 10, 11, 15 and 16 are in; 14 left alone as decided. Gates,
after `rm -rf .expo/cache/eslint`: `npx tsc --noEmit` exit 0, `npx expo lint` exit 0 (0 errors / 0
warnings), `npx prettier --check src` clean, `npx jest --ci` **35 suites / 449 tests green nine runs
in a row** (three for the gate, six more for finding 11). Nothing under `src/api`, `src/stores`,
`supabase`, `ios` or `app.json` was opened. Nothing committed.

**The auth routing choice (finding 10): every provider sign-in goes through `/hello`.** Not a
profile read inside `auth.tsx` and a branch. `hello.tsx` already holds all four answers — loading
skeleton, `isError` with a Try again, `Redirect` to `/home` when `display_name` is set, the question
when it is not — and it is the file whose own header comment already claimed Apple and Google users
land there. Branching in `auth.tsx` would mean reading the profile in two places and keeping two
copies of the same rule in step; the CEO's note allows the simpler one, and this is it. The cost is
one skeleton frame for a returning provider user before the redirect, which is the same frame
`/hello` already shows them today when they arrive from `verify-otp`.

**What changed**
- `src/app/(tabs)/cards.tsx` (finding 8) — `useSourceBalances` is destructured for `isError` and
  `refetch`, and a failed walk returns the house `PageState`: "Could not load your wallet", Try again,
  pull-to-refresh still live. Not stale-with-a-warning, per the CEO. The two per-list error
  `ListNote`s are **deleted**: `cards` and `accounts` are both inside the hook's aggregate, so those
  branches were unreachable the moment the page-level one existed. `ListNote` is now empty-state only
  and lost its `onRetry`.
- `src/app/reminders.tsx` (findings 7 and 6) — an error branch over **all seven** reads, not the two
  the finding named: `bills`, `subscriptions`, `cards`, `accounts`, `reminders`, `receipts` and
  `useSalaryAccountIds`. Any failure takes the page to a `PageState` whose Try again re-reads all
  seven, and the "N of M will let you know" count is withheld with it. `salaryAccounts.isLoading`
  joined the loading gate so no account row draws "No pay lands here yet" off a read that has not
  landed. Pull-to-refresh now refetches all seven instead of two.
- `src/app/add-account.tsx` (finding 6, the other screen) — built against Diego's `isError`/`refetch`,
  which landed while I worked. **A second bug fell out of it, and it wrote to the database:** with a
  failed (or still-running) link read, `payLandsHere` goes false, and `handleSave` then called
  `applyReminder('account', id, null, …)` — which is `useRemoveReminder`, so saving an unrelated edit
  silently **deleted** a payday reminder set weeks ago, from a step that was not even showing the
  controls. The reminder write is now skipped while the link is unknown; the caption says Skip could
  not check; `ReminderField` grew an optional `onRetry` that renders the house Try again under it.
- `src/app/savings-month.tsx`, `src/app/settle-up.tsx`, `src/app/group-settings.tsx` (finding 9) —
  loader + keyed form, following `add-expense.tsx`: skeleton while loading, `PageState` + Try again on
  error, then the form mounted under a key so its `useState` seeds from the loaded row.
  `savings-month` keeps "That month is not on your savings" for the case it is actually true — the
  read landed and the row is not there. `group-settings` splits the same two: a failed read offers Try
  again, a missing group offers Back to splits. Keys are the record, not the data
  (`key={row.month}`, `key={groupId}`, `key={group.id}`), so a background refetch cannot remount a
  form over what somebody is typing.
- `src/app/auth.tsx` (finding 10) — `router.replace('/hello')` after both providers, plus a header
  comment saying why. The stale "these are intentionally inert for now" comment above the handlers is
  gone; it has not been true since OAuth was wired.
- `src/components/flow/step-flow.test.tsx` (finding 11) — **root cause: `render` and `fireEvent` in
  `@testing-library/react-native@14` are `async`.** `render` calls `await act(() => renderer.render(…))`
  (`dist/render.js:41`), and with a React 19 concurrent root the commit and its passive effects are
  flushed when that thenable is awaited, not when the callback returns. I proved it in the tree: drop
  the `await` in front of `render` and the mocked `Stack.Screen` has been called **zero** times on the
  next line. Both hardware-key cases then read `add.mock.calls.at(-1)` — `undefined` — and called it,
  which is a `TypeError` at `:116` and `:131`: exactly the two failures and the exact line Dmitri
  recorded. The file now mounts through one helper that awaits `render`, then an empty
  `await act(async () => {})`, then *asserts* exactly one `hardwareBackPress` registration instead of
  taking whichever call landed last — so the same condition would now fail as a legible count rather
  than as "not a function". The gesture case no longer keeps two flows mounted at once while asserting
  on "last called with": each is rendered, asserted and unmounted, with the spy cleared between.
  `jest.restoreAllMocks()` in `afterEach` so a failed assertion cannot leave a spy on `BackHandler`.
  The same un-awaited `fireEvent` was in three other suites (`reminders`, `quick-actions`,
  `destination-list`) and is awaited now.
- **New tests.** `src/__tests__/app/cards.test.tsx` (3) — the wallet lists when the reads land, a
  failed balances walk replaces both sections with the error rather than showing the figure typed at
  setup, and the retry calls `refetch` once. `src/__tests__/app/savings-month.test.tsx` (3) — the
  correction seeds from a row that lands *after* the first render (`$47.50` and the note on screen),
  a failed read is an error with a retry rather than "not on your savings", and the not-there case
  still says so. **Falsified**: restoring the old shape — no loading gate, no key — fails the seeding
  case and only that case. `src/__tests__/app/reminders.test.tsx` grew from 5 to 13: one per read
  asserting the error page appears with no switch and no count, plus one proving the retry re-reads
  all seven sources.
- `.claude/team/dev/logic-audit-2026-09-12.md` — U3, U8, U9, U11, U12 and U13 moved to `fixed` with
  the evidence above. **U14 was stale (finding 15) and is corrected**: `collapsible-section.tsx` and
  `info-dialog.tsx` were deleted hours before that row was read back, and `src/data/receipts-mock.ts`
  has gone too. `grep -rn 'InfoDialog\|CollapsibleSection\|receipts-mock' src` across the whole tree
  now returns one line — the prose mention in `confirm-dialog.tsx:31`.

**Declared, as asked (finding 16).** The `RefreshControl` change in `src/components/ui/screen.tsx` was
mine, in the `startAtEnd` diff, and undeclared: `tintColor="#9A9A9A"` → `tintColor={colors.muted}`.
The hardcoded grey was invisible against the dark surface it was spinning on. It is one prop on one
control, it moves no figure, and it is unchanged since.

**Could not verify**
- Nothing on a device or a Simulator. Specifically unseen by eye: the wallet error page on the Cards
  tab, the reminders error page, the three loader/error states in finding 9, and the `/hello` frame a
  returning Apple user now passes through.
- Finding 11 is fixed as a mechanism I can demonstrate, not as a failure I reproduced. Dmitri's run-1
  failure did not come back in 21 full runs here (12 before the change, 9 after). What I can show is
  that the file depended on awaited async APIs in a way that yields precisely his symptom, and that
  the dependency is gone. One thing I could not chase and am handing over: `npx jest --ci` still
  prints "A worker process has failed to exit gracefully", so something in the suite leaks a timer or
  a promise. That is a second, independent way for one run in seven to look different from the others,
  and it is not in a file I own.

**Open questions**
1. `settle-up.tsx` and `group-settings.tsx` have no test. They are the two screens in finding 9 where
   the failure is cosmetic-plus (a lost suggestion, an empty name box) rather than a wrong figure, and
   both need a `useProGate` mock and three query mocks to render. Worth the file, or is read-and-tsc
   enough for these two?
2. Every provider sign-in now costs one `/hello` render before `/home`. If the Founder wants the
   returning-user path to be seamless, the alternative is prefetching the profile in `auth.tsx` — which
   is `src/api` work and Dilip's file, so it is a decision before it is a change.
3. The Cards tab's money tiles (Salary, Savings) disappear with the rest of the page when the balances
   fail, even though their own reads may be fine. That follows from "page-level error", and I think it
   is right — a wallet with two tiles and no cards is a stranger screen than an error — but it is a
   visible consequence of finding 8 that nobody has seen yet.
4. `add-account.tsx`'s silent reminder deletion (above) is the same family as the `useUpdate` hole I
   logged this morning: a mutation that means "remove" reached from a screen that never asked for one.
   Diego or Dilip may want to look for other `applyReminder(…, null)` call sites driven by a read.

## 2026-09-12 — Dana (Developer, UI and navigation) — the Settings switch blocker, the bill "To" date, the Reminders page

**Outcome.** Done, on `almost-done-all-pages`, uncommitted. Item 1 (switches that would
not turn off) is fixed by taking the touch off the platform control; item 2 (a bill period
ending before it starts) is now impossible to compose and refused at save; item 3's page-level
failure is split so the receipts read fails alone. Item 4 is a report: nothing there to fix.
`rm -rf .expo/cache/eslint; npm run check` exits 0 — 39 suites, 472 tests.

**Root cause of item 1, as far as it can be established here.** Not the JavaScript. I proved
that first, because two of the three hypotheses in the brief were about it: rendering a real
`SettingsRow` inside a real controlled parent and firing one change event produces exactly one
call carrying `false`, and the drawn value follows it — no double toggle, no ignored `false`,
no stale controlled value. `usePreferences.setHaptics` and `lib/pro-bypass.setProBypass` are
both plain, symmetric setters, and `settings-row.tsx` never wrapped a toggle row in a
`Pressable` (`isInteractive = Boolean(onPress) && !toggle`), so there was never a second press
target to fire. Two more candidates fell out on inspection: a synchronous throw from
`toggleFeedback()` would have eaten the change, but it would also have left the switch drawn
*off* rather than on, which is not what was seen; and NativeWind's interop, which does wrap
every `Switch` (`react-native-css-interop/dist/runtime/components.js` registers one, and
`wrap-jsx` swaps the type whether or not there is a `className`), passes `value` and
`onValueChange` through untouched.

What is left is the platform control, and the evidence fits it: a `UISwitch` owns its own
gestures — a tap on the track, a drag on the thumb — and only reports through
`UIControlEventValueChanged` once it has decided which gesture finished. A touch it takes for
the start of a drag and then loses ends with the switch unchanged and no event at all, which is
exactly "nothing happened". On a switch that is **on**, the thumb sits under a finger aiming at
the middle; on one that is **off**, the same aim lands on bare track. That is the asymmetry Tia
and the CEO both saw, it is why a deliberate horizontal swipe worked, and it is why two switches
over two unrelated stores behaved identically. I could not reproduce it here — no simulator in
this session — so I am calling that a hypothesis, not a finding.

The fix does not depend on which recogniser was at fault. `SwitchControl` takes the touch one
level up, where it is a plain press, and the platform switch becomes a picture of the value
behind `pointerEvents="none"`: one press in, one `onValueChange(!value)` out, and the only thing
that can move it is the `value` prop coming back down. A refused change — the app lock failing
its scan — now never moves at all instead of flicking over and snapping back. The trade is the
thumb drag, which iOS supports and this does not.

**What changed**
- **`src/components/ui/switch-control.tsx` (new).** The app's switch. `Pressable` with
  `accessibilityRole="switch"`, the checked state and a 44pt target; inside it a `View` with
  `pointerEvents="none"` + `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`
  holding the platform `Switch`. VoiceOver finds one switch, not two — asserted in the test. It
  also collects the `trackColor`/`thumbColor`/`ios_backgroundColor` trio and the `toggle()`
  haptic that were copy-pasted at all five call sites.
- **Every `Switch` in the app now goes through it** — there are five and they are all converted:
  `src/components/settings/settings-row.tsx` (Haptics, App lock, Fake Pro and any future row),
  `src/app/reminders.tsx` (×2: the daily receipts reminder and the per-item reminders),
  `src/app/group-settings.tsx` (Simplify who pays whom, which keeps `disabled={!isOwner}`) and
  `src/app/add-group.tsx`. `grep -rn '<Switch' src` now returns one line, inside `SwitchControl`.
- **`src/lib/haptics.ts`** — `fire()` wraps the call in `try/catch`. The existing `.catch` only
  covers a rejected promise; a missing native module throws on the call itself, and because
  `withTap` and the switch both buzz *before* they act, one synchronous throw turns a row into a
  row that does nothing. Three lines, declared here because it is outside the four files the
  brief named.
- **Item 2, `src/components/flow/inline-calendar.tsx` + `src/components/ui/date-picker.tsx`.**
  `DayGrid` — the grid shared by the inline calendar and the modal picker, so the rule lands in
  one place — grew `minDate`: earlier days are dimmed, `disabled`, and carry
  `accessibilityState.disabled`. `DatePicker` passes it down, dims whole months that finish
  below the floor, and holds OK back when the draft drifts below it by a route that skips the
  grid (stepping the year keeps the day number and moves the date — that is a real hole and it
  has a test).
- **Item 2, `src/app/add-bill.tsx`.** The "To" picker opens with `minDate={startDate}`, so a day
  before the start is never offered. The existing on-confirm refusal stays as the backstop for
  the one path that skips the grid, and `handleSave` now refuses `ends_on < starts_on` outright —
  the only check that sees an *edited* bill whose stored dates were already the wrong way round.
  Compared as ISO days: no clock, no timezone.
- **Item 3, `src/app/reminders.tsx`.** `failed` now covers six reads; `receipts.isError` is its
  own `receiptsFailed`. A failed receipts read leaves the page standing and takes only its own
  card: the caption becomes "Skip could not check whether this one is on.", the switch is
  replaced by the house `TextLink` "Try again" that re-reads *only* receipts, and the reminder
  drops out of both halves of the "N of M will let you know" count rather than being guessed at.
  When that leaves nothing to count, the sentence becomes the invitation alone instead of
  "0 of 0". Pull-to-refresh and the page-level retry still re-read all seven. This is finding 7
  half walked back, deliberately: the receipts reminder is one column on `profiles` behind a
  migration that is not applied yet, and the bill/subscription/card/account reminders come from
  other tables and are fine.
- **Tests (+13).** `src/components/settings/settings-row.test.tsx` (7): a press while on calls
  the handler once with `false` and the row redraws off; the same on; three presses alternate
  rather than sticking; a handler that refuses leaves the switch where it was drawn; a toggle row
  exposes no second press target and the row-level `onPress` never fires; and — for item 3's
  first half — a `Reminders`-shaped row is a button with the right label that fires exactly once.
  `src/components/ui/switch-control.test.tsx` (3): the platform switch is under `pointerEvents:
  none`, there is one accessibility element and not two, and `disabled` swallows the press.
  `src/components/ui/date-picker.test.tsx` (3): a blocked day is inert and OK still confirms the
  day it opened on, OK is held back when the year steps below the floor, and with no floor every
  day is live. `src/__tests__/app/reminders.test.tsx` went 13 → 16: `receipts` left the
  "any read takes the page" table and got its own three — the page survives, the section says
  what it could not do, the retry re-reads receipts *alone*, and the count withholds it.

**Item 3, first half — the Settings → "Reminders" row.** Wiring is correct and I could not
reproduce a dead row. It is `onPress={() => router.push('/reminders')}` with no `toggle`, so
`isInteractive` is true and it renders the `Pressable` with the chevron; nothing overlays it
(`DialogProvider` renders `null` when idle, `FriendRequestPopup` returns `null` with no request,
and `Screen`'s only overlay is the `floating` slot, which Settings does not use). There is now a
render test that the row is a button and fires once. The one latent way that press could have
been eaten is the `withTap` haptic throwing before `router.push` ever ran, which is the hole I
closed in `lib/haptics.ts`. Unproven, but it is the only mechanism I found that swallows a press
on that row without swallowing everything else on the page.

**Item 4 — the "30–35pt hit-box offset". Nothing found, nothing changed.** The premise does not
hold: the Continue button in `step-flow.tsx` is **not pinned**. It is the last block in the
scrolling content column (`mt-8 w-full gap-3 pb-2`), inside `Screen`'s `ScrollView`, so there is
no pinned footer to carry a `translateY` and none exists — `grep` for `translate|transform` in
`step-flow.tsx`, `screen.tsx` and `button.tsx` returns nothing. The safe area is applied exactly
once, by the single `SafeAreaView edges={['top','bottom']}` that is `Screen`'s outermost box; it
becomes padding on a container, which moves the drawing and the hit box together. No screen
nests a second one — `useSafeAreaInsets` appears only in the four filter sheets, the two pads
and the tab bar, none of which are inside a `StepFlow`. The only place two inset sources meet is
the tab bar's `paddingBottom: Math.max(insets.bottom, 12)` under a tab screen whose `Screen`
also asks for the bottom edge; whether that double-pads depends on react-navigation's inset
context, it would show as extra space rather than as an offset target, and the CEO found the bar
responding correctly — so I am flagging it, not touching it. Worth recording for whoever sees
this again: `step-flow.tsx` already carries a fixed bug of exactly Tia's shape — the title `Text`
was laid over the whole header row and swallowed every tap on the back chevron until it was given
`pointerEvents="none"`. A `Text` or a decorative `View` over a control is the pattern to look for.

**Could not verify.** Nothing was seen on a simulator or a device: not the switches, not the
dimmed days in the bill's "To" picker, not the receipts section's own error. Item 1's root cause
is a hypothesis that fits every data point, not a reproduction — what I can show is that the fix
removes the app's dependence on `UISwitch`'s gesture handling altogether, and that the JS path is
provably correct either way. The receipts card's own error state cannot be seen until the
`20260912100001_receipt_reminder` migration is applied — which is the failure it was written for.

**Open questions**
1. `SwitchControl` gives up the thumb drag. It is a real iOS affordance and a deliberate trade;
   Priya should say whether she is happy with it, or whether she wants the whole settings row to
   toggle as well (which is a bigger interaction change and needs the double-toggle care above).
2. `reminders.tsx` still holds the *whole* page in skeleton while `receipts.isLoading` is true,
   so a receipts read that hangs rather than fails still blocks the sections that are fine. The
   comment argues for it — a switch that snaps on a beat late reads as the app changing its mind.
   Now that the card can carry its own state, the alternative is a skeleton in that one card.
3. The bill's start-date calendar still *silently clears* a "To" date when the new start is
   later than it. It is correct, but it is a value disappearing without a word; a note under the
   field would be kinder.
4. `add-bill.tsx` accepts a To equal to the From — a one-day period. I left it: it is a real
   thing somebody might mean. Worth a word from the Founder if it is not.

---

## 2026-09-12 — Dmitri (Development Team Lead) — final engineering gate before the device build and the merge

**Outcome: ship the Release build to the two iPhones (a) — yes. Commit and merge (b) — yes, after
the two migrations are applied, and not before.** The fix batches land: 15 of my 16 Phase 2 findings
are fixed, 1 is partially fixed, none regressed. `npm run check` is green from clean. The branch is
not blocked on code. It is blocked on two things that are not code: two migrations that have never
been executed anywhere, and Tia's bug 1 — the ~30–35pt hit-box offset on bottom-pinned controls —
which Dana investigated and could not find, and which nobody has reproduced on hardware. The device
build is the right way to settle bug 1; the merge should wait for the migrations.

**Gate numbers**, `rm -rf .expo/cache/eslint` first, run twice:
- `npm run check` — **exit 0**. `tsc --noEmit` silent; `expo lint` 0 errors / 0 warnings;
  `prettier --check .` "All matched files use Prettier code style!"; `jest` **39 suites / 472 tests
  passed, 0 failed**, 8.6s. No "worker process failed to exit gracefully" — Theo's `gcTime` fix holds.
- `npx jest --ci src/components/flow` **three times: 3 suites / 21 tests, green every run.** Dana's
  root cause (un-awaited `render`/`fireEvent` in @testing-library/react-native 14) is the right one
  and finding 11 is closed.
- `git status --short` — **135 lines**; `-uall` — 196. 104 tracked modified, 3 deleted, 1 staged
  rename, 88 untracked files (50 of them under `.claude/`, 38 real work).
- **No stray files.** `find src/app -name '*.test.*'` → 0, and `src/__tests__/no-route-test-files.test.ts`
  now enforces it mechanically. No probe/smoke/scratch/.orig/.rej anywhere outside ignored `ios/Pods`.
  Every untracked path is declared work.

**Per-finding status.** Fixed: 1 (app-side), 2, 3, 4 (partial, below), 5, 6, 7, 8, 9, 10, 11, 12, 13,
15, 16. Deferred by decision: 14. Verified myself rather than read off a log:
- **Finding 4 — `useUpdate` — partially.** `mutations.ts:104-110`, `mutations.ts:168-176` and
  `reminders.ts:388-400` all `.select('id')` and throw `NOTHING_UPDATED`. **Two callers were missed,
  in a file Diego was not given:** `useUpdateGroup` (`src/api/splits.ts:475`) and `useArchiveGroup`
  (`:495`) are still `.update(patch).eq('id', …)` with no select. The `groups` policy is owner-only,
  so a non-owner's rename returns 204 with no error and Group settings pops with a success haptic
  having written nothing. Same bug, same shape, one file over. Not a ship blocker — the UI disables
  those controls for non-owners — but it is finding 4 still open. `useRemove` (`mutations.ts:117`)
  has the same silence; lower severity, because a delete that matched nothing leaves the end state
  the user asked for.
- **Finding 5 — ordering, confirmed.** `auth.ts:126-131`: `await forgetThisDevice()` then
  `supabase.auth.signOut()`, pinned as `['forget','signOut']` in `auth.test.ts`. The only other
  `supabase.auth.signOut()` in the tree is `auth.ts:185`, the account-delete path, where
  `device_tokens.user_id` cascades — correctly not duplicated.
- **Finding 3 — 'monthly' end to end, confirmed at every hop.** Migration `20260912100002` widens
  `loans_day_count_basis_check` to four values and changes no data; `AccrualBasis` is the type on
  `LoanRow` (`queries.ts:1051`), `SaveLoanValues` (`mutations.ts:383`) and `StoredLoan`
  (`loan.ts:779`); `BASES` in both `save-loan.tsx:19` and `loan-schedule.tsx:20` contains 'monthly';
  both refusals are gone (`grep storableBasis|oddOpeningDays` → nothing); the RPC passes
  `p_day_count_basis` straight through, so the constraint is the only gate.
  **The money is fixture-backed and the file proves it: `src/lib/loan.test.ts` is +727 / −0.** Not one
  existing fixture moved a character, including the real lender statement at `:236`. Drew's stub
  fixture asserts `toBe` on cents, not `toBeCloseTo`: payment $502.38, first posting $228.17, balance
  $24,725.79, term interest $5,142.83, final $502.41, and the old '30/360' mapping pinned as $239.58
  / $502.61 so reinstating it fails.
- **SwitchControl — all five sites converted, no double toggle.** `grep '<Switch' src` returns one
  line, inside `switch-control.tsx`. The inner `Switch` is given `value` and `disabled` and **no**
  `onValueChange`, under `pointerEvents="none"`, so there is exactly one event path.
  `accessibilityRole="switch"` with `{checked, disabled}` on the `Pressable`;
  `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` on the wrapper,
  so VoiceOver finds one element.
- **minDate — correct, with one gap that does not bite today.** `DayGrid` dims and `disabled`s days
  below the floor with `accessibilityState.disabled`; `DatePicker` passes it down, deadens whole
  months below the floor, and holds OK back via `belowFloor` for the year-step route that skips the
  grid. `add-bill.tsx:566` passes `minDate={datePicker === 'end' ? startDate : null}`.
  **`InlineCalendar` does not forward `minDate` to its own `DayGrid` (`inline-calendar.tsx:304`)** —
  the prop exists on the grid but is not plumbed through the inline wrapper. Nothing needs it today;
  the next flow that wants an inline floor will find it missing.
- **reminders.tsx split — confirmed.** `failed` is the other six reads (`:138-146`); `receiptsFailed`
  is `receipts.isError` alone (`:147`); the count withholds the receipts row on both sides
  (`:238`, `:241`) rather than guessing. The receipt-reminder read has its own `['receipt-reminder']`
  key, so a 42703 on those columns cannot touch the dashboard's profile query.
- **auth.tsx — confirmed.** One shared `run()` serves both providers and ends `router.replace('/hello')`.

**Release readiness**
- `git diff --stat -- ios app.json package.json package-lock.json`: **app.json 5 lines (the Android
  `permissions` array collapsing to one — prettier only, no key added, removed or reordered),
  package.json −1 (`zod`), package-lock.json ±1 (`zod` re-marked `devOptional`, still present as a
  transitive dep of eslint-plugin-react-hooks). `ios` — nothing.**
- **Important correction to how we have been evidencing `ios/`: `/ios` is in `.gitignore:42` and
  `git ls-files ios` returns zero files.** The native project is not in the repo. `git diff -- ios`
  being empty proves nothing, and we should stop citing it. The real evidence, which does hold:
  `ios/Podfile.lock` sha1 is `db96f8ea…` (matching Dilip's digest exactly) and its mtime is 1 Sep;
  `project.pbxproj` 1 Sep; `SkipBudget.entitlements` 27 Aug; `find ios -maxdepth 3 -mtime -1` outside
  Pods/build is empty. Nothing native moved. It also means the merge carries no native change and the
  device build depends on this machine's untracked `ios/` being in a good state.
- **Release bundle is clean — re-proved, not taken from the doc.**
  `EXPO_PUBLIC_PRO_BYPASS=1 npx expo export --platform ios --no-bytecode` to a scratch dir, then
  grepped the 9.8MB bundle. The bypass module compiles to `proBypassActive` → `function s(){return!1}`,
  `setProBypass` → `function(e){return}`, `hydrateProBypass` → `function c(){}`, server snapshot
  `p(){return!1}`. `PRO BYPASS IS ON` 0 hits, `EXPO_PUBLIC_PRO_BYPASS` 0 hits, `Fake Pro` 0 hits.
  (`skip.dev.proBypass` survives as an exported constant string — inert, no code reads it.)
  **Tia's bug 3 is closed for Release:** the `__DEV__ && devNote` node is gone entirely — the
  `text-[10px] leading-[14px] text-muted` className is absent and `devNote` collapsed to a discarded
  comma-expression `V=(S.error?S.error.message:S.data, …)`. The `offerings=…` string is still
  *computed* in `src/api/pro.ts` because it is a field on the query result; it is never rendered.
  It will still show on the dev build the testers use, which is the intent.
- **aps-environment — answered by the docs, not by a build.**
  <https://docs.expo.dev/versions/v57.0.0/sdk/notifications/>: *"The iOS APNs entitlement is always
  set to 'development'. Xcode automatically changes this to 'production' in the archive generated by
  a release build."* So `SkipBudget.entitlements` holding `development` is expected and is not a
  TestFlight blocker. Belt and braces on top: `send-push/index.ts:165-180` retries a `BadDeviceToken`
  against the other environment and persists the correction to the row, so a token registered as
  `development` by `push.ts:99` self-corrects on first send. **N14 can be closed.** Unproven from
  here: that this specific Xcode project's archive step does the rewrite — worth one look at the
  `.ipa`'s embedded entitlements before the first TestFlight upload, not before the device build.

**Behaviour on a device whose database has NOT had the two migrations** — traced, not assumed.
- **Reminders screen: the receipts card errors, alone.** `reminders.ts:335` selects
  `receipt_reminder_enabled, receipt_reminder_at`, which PostgREST answers 42703. Dana's split means
  the page stands, the other six reads render, the receipts caption becomes "Skip could not check
  whether this one is on.", a Try again re-reads receipts only, and the "N of M" count drops it.
  With `retry: 1` on the query client the whole page holds skeleton for roughly a second first,
  because `receipts.isLoading` is still in the page-level loading gate — Dana's open question 2.
- **Saving a monthly-rest loan errors.** `save_loan` inserts 'monthly' into a column still checked
  against three values; the raw check-constraint message lands in `save-loan.tsx`'s catch. Reachable
  now that both refusals are removed: pricing, the schedule and the calculator all work, only the
  save fails. This is a *new* failure this branch introduces — before it, that case was refused with
  an explanation.
- **Everything else is unaffected.** `grep receipt_reminder` over `src` returns only `api/reminders.ts`
  and the edge function; no `select *` on profiles anywhere near it; `20260829100014` is untouched so
  every existing loan reads and prices exactly as before. The edge function is not deployed, and when
  it is, a missing `receipt_reminders_due()` logs and continues (`index.ts:288-294`) — the bill,
  payday and split pushes keep working.

**Two residuals I am recording because neither is in anyone's fix batch**
1. **`splits.ts` `useUpdateGroup` / `useArchiveGroup`** — finding 4, one file over. Owner: Diego.
2. **The edit path of the add flows has a loading gate but no error gate.** `add-bill.tsx:93`,
   `add-subscription.tsx:68`, `add-account.tsx:68`, `add-card.tsx:50` all read
   `if (id && isLoading && !existing)`. On a *failed* read `isLoading` goes false and `existing` stays
   undefined, so the form mounts `key='new'` with blank fields while `id` still makes it an edit —
   Save then writes blanks over a real record, and in `add-card.tsx:194` `dueDate` is null so
   `applyReminder('card', id, null, …)` deletes that card's reminder too. Same family as the
   `add-account` bug Dana already fixed and flagged as her open question 4.
   `add-receipt.tsx:139` is the one that handles it, via `missing = Boolean(id) && isFetched && !existing`
   — though on an error that turns an edit into a create, so the failure there is a duplicate row
   rather than a blanked one. Finding 9's loader-plus-error pattern should be applied to these four.
   Needs a read to fail at exactly that moment; not a ship blocker, is a data-loss path.

**Commit plan — proposed, nothing run.** The full plan with per-commit `git add` lists is in my
report to the CEO. Three things it has to say and I will repeat here: the staged rename
`segmented-control.tsx → toggle-pill.tsx` means **`git add -A` (or `git add` on both paths) is
required** or the rename becomes an unrelated add and delete; the working tree is **not cleanly
splittable by path** — `src/app/reminders.tsx` alone carries the receipts feature, the SwitchControl
conversion, the error split and the styling sweep across 12 interleaved hunks, and the five add
screens are the same — so a themed split needs `git add -p` or an honest admission that some commits
are mixed; and `.claude/` and `TEAM.md` are untracked, with `.prettierignore` already amended to
exclude them.

**Could not verify**
- Nothing on hardware. No migration executed anywhere — still no Docker or Postgres on this machine,
  so the unapplied-migration behaviour above is traced from the SQL and the client code, not observed.
- **Tia's bug 1 (the ~30–35pt hit-box offset on the StepFlow primary button and the tab bar) is
  unresolved.** Dana looked for it properly — no `translate`/`transform` anywhere in `step-flow.tsx`,
  `screen.tsx` or `button.tsx`, one `SafeAreaView` at the root, no nested inset source inside a
  StepFlow — and found nothing. So we have a tester who reproduced it 10+ times on a simulator and a
  developer who can find no mechanism. One of those is wrong and I cannot tell which from here. It is
  the single best reason to put the build on a real phone.
- Whether an App Store archive really rewrites `aps-environment` on *this* project.

**Open questions**
1. Who takes the two residuals above — `splits.ts` is Diego's, the four add screens are Dana's.
   Both are small; neither blocks the device build.
2. `.claude/team/testing/screenshots/` contains screenshots of the Founder's real account
   (`home-dark-butter.png`, `home-fab-overlaps-subscriptions-row.png` and others show real bills and
   real balances). If the team folder is committed, those figures are in git history permanently.
   My recommendation is to commit the logs and the dev/design documents and to leave the screenshots
   and `design/reference/chatgpt-prototype/` out.
3. `.claude/agents/diego.md:14` still tells Diego to validate external data with zod, which was
   removed today. My file; I have not edited it, because changing agent configuration is not
   something I will do off the back of a task message.

---

## 2026-09-12 — Diego (data/backend): finding 4 residual, the message split, receipts push copy

**Outcome.** Done. The two `groups` updates now refuse to succeed quietly, the "nothing was written"
copy is two messages instead of one, and the receipts push body is the Founder's line. `npm run check`
exits 0 with the eslint cache cleared: 42 suites, 492 tests. Nothing committed, no migration pushed.

**What changed**
- `src/api/splits.ts` — `useUpdateGroup` and `useArchiveGroup` both `.select('id')` and throw
  `NOTHING_UPDATED` on an empty array, matching `useUpdate`. The `groups` policy shows a group to
  every member and lets only the owner write it, so a member's rename was a filter matching nothing,
  which PostgREST answers 204 with no error. `group-settings.tsx:173` and `:227` already wrap both in
  try/catch and set the error banner, so the throw lands somewhere visible; the two `.mutate()` call
  sites (icon `:255`, simplify `:274`) are owner-gated in the JSX and so unreachable for a non-owner.
- `src/api/mutations.ts` — `NOTHING_UPDATED` re-worded for records and a second export added:
  - records (`useUpdate`, both splits mutations): *"That is no longer there — it may have been
    deleted on another device. Open the list again."*
  - settings (`useUpdateProfile`, `useSetReceiptReminder`): **`NOTHING_SAVED`** — *"Skip could not
    save that. Close this and open it again."* A profile is one row per account; nobody deleted it on
    another device and there is no list to re-open, so the record copy was wrong on both counts.
- `src/api/reminders.ts:4,401` — `useSetReceiptReminder` now throws `NOTHING_SAVED`.
- **`useRemove` (`mutations.ts:117`): deliberately left silent**, with the reasoning written into the
  file. An update that wrote nothing has left the user's intent unfulfilled; a delete has not — the
  row they wanted gone is gone, and erroring would put a banner in front of a double tap or a row
  already deleted on another device. The case that gives up is a delete RLS refuses, which also
  answers 204; no screen can reach one, because every delete is dispatched from a row the same
  account just read and the only owner-only table, `groups`, is archived rather than deleted. The
  comment names the condition under which to revisit it.
- `supabase/migrations/20260912100001_receipt_reminder.sql:83` — body is now
  *"Add today's receipts while they are still in your pocket."*, title still `'Receipts'`. Editing the
  migration rather than adding one is correct here and only here: the file is untracked, has never
  been committed and has never been applied. **`send-push/index.ts` does not hardcode the copy** —
  it reads `title`/`body` straight off the `receipt_reminders_due()` rows (`:293-300`), so Dilip's
  file needed no change and got none. `grep` for the old body across the repo now returns only the
  three `.claude/` documents that quote it.
- Tests. New `src/api/splits.test.tsx` (9 tests) pins both group writes from both sides: payload and
  `selected: 'id'`, `false`/`null` surviving the `!== undefined` patch build, the empty-array throw,
  no invalidation on a failed write, and the database error still surfacing. Its fake client still
  resolves a bare `await` without `select`, so reverting the fix fails here rather than passing.
  `mutations.test.tsx` gains a side-by-side test that a profile failure says `NOTHING_SAVED` while a
  receipt failure in the same run says `NOTHING_UPDATED`, plus two copy tests (records points at a
  list, settings does not; neither message leaks "error/failed/null/row/PGRST").
  `reminders.test.tsx` asserts `NOTHING_SAVED` instead of the old `/no longer there/i`.

**Could not verify**
- No database anywhere to run against, so the migration edit is verified by reading only. The
  0-row behaviour is exercised through a fake PostgREST client, not a real 204.
- `splits.test.tsx` adds ~6 `act(...)` warnings, the same ones `mutations.test.tsx` and
  `reminders.test.tsx` already emit from a settled mutation notifying after the await. Left matching
  the existing suites rather than wrapping only my file.

**Open questions**
1. **`group-settings.tsx:239` renders the Name `TextField` for everyone, owner or not.** A member can
   type in it, and on blur they now get *"That is no longer there — it may have been deleted on
   another device"* for what is actually a permission refusal. The client cannot tell the two apart —
   both are zero rows — so the fix belongs on the screen: `editable={isOwner}`, matching how the icon
   picker and the simplify switch are already gated. Screen file, so not mine. Pia or Dana.
2. Is `NOTHING_SAVED` wanted anywhere else? Today it is only the profile and the receipts reminder.
   Any future one-row-per-account setting should take it rather than `NOTHING_UPDATED`.
3. The eslint/prettier gate tripped twice mid-run on other people's in-flight files
   (`src/__tests__/app/add-bill.test.tsx` was caught half-written). Nothing wrong with it now — worth
   knowing that a red `npm run check` on this branch may just be a parallel edit landing.

## 2026-09-12 — Dana (Developer, UI and navigation) — Dmitri's §6 residual 2: the edit path of the five add flows, and `InlineCalendar`'s `minDate`

**Outcome — done.** The four screens that mounted a blank create form over a real record when the
edit read failed now refuse to, `add-receipt` no longer turns a failed read into a duplicate, and
`InlineCalendar` forwards `minDate` to its grid. 19 new tests across six files; `npm run check` exits
0 (46 suites, 507 tests) after `rm -rf .expo/cache/eslint`. Nothing committed.

### What changed, per screen

The pattern is the same in all five, applied at the loader component that sits above the keyed form,
so **no payload, validation or mutation call was touched**. When `id` is set and no record is in
hand, in this order:

1. `isError` → `Screen showBack` + the house `PageState` with `artwork.error`, "Try again" wired to
   `refetch()` and a quieter "Go back". **Never a fall back to create.**
2. `!isFetched` → the existing skeleton shell, unchanged (same `StepFlow` title, dots and blocks).
3. fetched and empty → `PageState` "That … is not here", one way out.

Only a loaded record reaches the form, so `key={existing?.id ?? 'new'}` now only ever keys on a real
row or a genuine create. Two side effects of the ordering worth naming: a cached row plus a failed
background refetch still renders the form (the error branch is inside `if (id && !existing)`, so a
record in hand always wins), and a query that is disabled because the session has not landed yet now
holds the skeleton instead of mounting a blank edit — the same bug by a different route.

- `src/app/add-bill.tsx` — gate at the top of `AddBillScreen`; `useBill(id)` held whole rather than
  destructured. Copy: "Could not open this bill" / "That bill is not here".
- `src/app/add-subscription.tsx` — same, around the `initial` derivation, which still runs only on a
  loaded row.
- `src/app/add-account.tsx` — in `AddAccountScreenInner`; the Pro deep-link wrapper above it is
  untouched. The field this used to blank is a balance, which every figure on home is walked from.
- `src/app/add-card.tsx` — the one with teeth: without a record there is no due day either, so Save
  also called `applyReminder('card', id, null, …)` and deleted the card's reminder. The test asserts
  `useApplyReminder` is never even called in the error state.
- `src/app/add-receipt.tsx` — `missing` is gone. It did stop the blank edit, but by dropping the
  `id`, which on a *failed* read filed a second copy. Now `id` is passed through unconditionally and
  the three states are answered above the form. Scan-param entry (no `id`) is unaffected.

`src/components/flow/inline-calendar.tsx` — `InlineCalendar` takes `minDate?: Date | null` and hands
it to `DayGrid`, which has understood the floor since the bill-period fix. One thing beyond the
one-liner: the "Today" pill is hidden when today is below the floor, because a shortcut that picks a
day the grid beside it has greyed out is a trap. No current caller passes `minDate`, so behaviour on
screen today is identical.

### Tests added

- `src/__tests__/app/add-bill.test.tsx`, `add-subscription.test.tsx`, `add-account.test.tsx`,
  `add-card.test.tsx`, `add-receipt.test.tsx` — four cases each: read failed, still loading, record
  in hand, record gone. The write hooks are mocked as `jest.fn()` *factories*, so the assertion is
  that `useUpdateX`/`useCreateX` were never called at all — proof the form never mounted, which is
  stronger than "nobody pressed Save". Each also asserts the flow title is absent, so a stale shell
  cannot pass. Mocked the way the existing `src/__tests__/app/*` tests do; SVG-importing modules
  (`@/data/bills-mock`), the reanimated `ColorPicker` and the native `modules/receipt-scanner` are
  stubbed because Jest has no Metro transformer for them.
- `src/components/flow/inline-calendar.test.tsx` — days below the floor are dimmed, dead and do not
  fire `onChange`; the day above it does; the "Today" pill disappears under a future floor and is
  back when there is none. Clock pinned to 1 June 2026.

### Could not verify

Nothing on a device or in the simulator — Metro is live for the others and I stayed out of it. The
error and gone states are proved by render tests, not by eyes on a screen; the copy in particular
has not been read by Priya's team.

### Open questions

1. The "Try again" retries only the record read. If the connection is properly out, the retry looks
   like a no-op for a second. Every other page in the app behaves the same way, so I left it.
2. Copy check wanted on the six new strings ("Could not open this bill/subscription/account/card/
   receipt", "That … is not here") — mine, written to match `group-settings.tsx`, not Priya's.
3. The hidden "Today" pill is a judgement call one line past Dmitri's brief. If it should stay
   visible and simply be disabled instead, say so and it is a two-line change.

## 2026-09-12 — Dana (Developer, UI and navigation) — Tia's three majors: dead rows, the tab bar's touch band, raw network errors

**Outcome — done.** Every row in the Transactions tab and in Home's Recent and Coming up now opens
the record behind it; the tab bar only takes touches on the pill it paints; a save that fails because
the connection dropped says so in English. `npm run check` exits 0 (51 suites, 551 tests) after
`rm -rf .expo/cache/eslint`. Nothing committed.

### 1. The two combined ledgers now navigate

The hard part was not the handler, it was working out *which record* a row belongs to. Rows in these
lists are `useLedger` entries, which are **occurrences**, not records, and their ids come in four
shapes: `receipt-<id>`, `bill-<id>@<date>` / `subscription-<id>@<date>` (projected from a plan),
`charge-<id>` (an occurrence that was written down at the time) and `income-<id>@<date>`. Only the
first three carry a record id, and the `charge-` one carries none at all — a charge row names its
plan through `bill_id`/`subscription_id`, which is on the row and nowhere in the ledger entry.

So the mapping lives in one pure file, `src/lib/ledger-link.ts`:

- `ledgerHref(entry, owners)` → typed `Href` or **null**. Receipt → `/add-receipt?id=`, bill →
  `/add-bill?id=`, subscription → `/add-subscription?id=` (the object form, the same routes
  `receipts.tsx:261`, `bill-plans.tsx:209` and `subscription-plans.tsx:205` already push), income →
  `/salary`, which edits every source at once and takes no id.
- `chargeOwners(rows)` keys charge rows as `charge-<id>` → the plan's record id, which is what makes
  a *recorded* bill or subscription row openable. Both screens read `useCharges()` — the very query
  `useLedger` already reads, so it costs no fetch and no `src/api` file was touched.
- Null means "nothing to open". `LedgerRow` and `TransactionRow` now render inert in that case:
  `accessibilityRole` is `text` rather than `button`, `disabled`, and no `active:opacity-60`. A row
  that dims under a thumb and then does nothing is the bug being fixed, not the fix.

**Kinds with no edit screen:** none, in practice. `useLedger` produces exactly four kinds and all
four now route. Card *payments* are deliberately not in this ledger at all (`queries.ts:823` — a
payment moves money between two things you already own, so counting it beside the charge it settles
would double the spending), so the `source/[id]` case in the brief does not arise on these two
screens; that screen already handles its own payment rows. The only inert case left is an id of a
shape nothing produces today, which is asserted rather than assumed.

**Not wired, deliberately:** `bills.tsx`, `subscriptions.tsx` (the per-window charge lists) and the
non-payment rows on `source/[id].tsx` still render `TransactionRow` with no handler. They were
already inert; they are now *honestly* inert. Say the word and they take three lines each.

### 2. The tab bar's touch band — root cause

`SkipTabBar` renders **in the layout flow**, not absolutely: `BottomTabView` puts the screens
container (`flex: 1`) above it and the bar after it, so page content is never underneath the bar.
What *is* true is that the bar's touchable box is bigger than the control it draws. On a 402×874
device with a 34pt home-indicator inset the outer view is `8 (pt-2) + 86 (pill) + 34 (paddingBottom)`
= 128pt tall and owns y≈746–874, while the pill it paints spans y≈754–840. The 8pt above it, the
34pt below it and the 16pt gutter either side are painted `bg-surface` — *the page's own colour* —
so that band is indistinguishable from empty page and, until now, counted as a touch on the bar.

Fix: `pointerEvents="box-none"` on that outer view (`skip-tab-bar.tsx:41`). It still paints exactly
as before — padding, insets and colours are untouched, and a test asserts `paddingBottom` is still
`Math.max(insets.bottom, 12)` — but only the pill and its four buttons receive touches now; anything
aimed at the band goes through to whatever is behind it. `src/components/navigation/skip-tab-bar.test.tsx`
covers the band, the pill, and that pressing a button still navigates (and that the open tab does not).

**What I could not make the geometry agree with.** Tia's repro taps at device (250, 808) and
(250, 827) are *inside* the drawn pill (754–840), not above it, and on a bar that is in flow no
content can be drawn there. Either the page had scrolled between the screenshot she measured and
the tap that followed, or the tap coordinates and the screenshot are not in the same space — the
same class of error she flagged herself elsewhere in that session. Worth one fresh repro with the
screenshot taken immediately before the tap; if content really is visible at y≈808 on a tab screen,
the cause is something other than this component and I want to see that frame.

### 3. Network failures no longer show their guts

`src/lib/save-error.ts`, pure and tested (18 cases):

- `saveErrorMessage(thrown, fallback)` → the network sentence when the failure is the connection,
  the thrown message when there is one, the screen's own fallback when there is not (which the old
  `(thrown as Error).message ?? '…'` never actually reached: an `Error` with no message has `''`,
  not `undefined`).
- Network-shaped means the message contains `network`, `fetch failed`, `failed to fetch`,
  `connection`, `timed out` or `offline`, **or** it is a `TypeError` that mentions fetching — which
  is what `fetch` itself throws, and on some platforms it says only "Load failed". Tia's exact
  string, `Error: fetch failed: UnexpectedException: The network connection was lost`, is a test case.
- `NOTHING_UPDATED`, `NOTHING_SAVED` and every validation line pass through whole; both are asserted.

Used at every save and delete error line in the eight `src/app/add-*.tsx` screens. `src/api` is
untouched, so the real error text still reaches logs and anything that needs to tell two failures
apart. The two device errors in `add-receipt` (camera, file read) are left as they were.

### Tests added

`src/lib/save-error.test.ts` (18), `src/lib/ledger-link.test.ts` (9),
`src/components/navigation/skip-tab-bar.test.tsx` (4), `src/__tests__/app/home.test.tsx` (1, new
file), and a routing case added to `src/__tests__/app/transactions.test.tsx` whose ledger fixtures
now carry realistic ids. The two screen routing tests press every kind inside **one** mount on
purpose: a test per row made both files order-dependent — six mounts of a screen that size under
fake timers left the last one with nothing queryable.

### Could not verify

Nothing on a device. Metro is live for Tia and I stayed out of the simulator beyond one passive
screenshot. Item 2 in particular is proved structurally, not by a thumb on glass.

### Open questions

1. Item 2 needs Tia's re-test with a fresh, immediately-before-the-tap screenshot (see above). If it
   still reproduces, the next suspect is outside this component.
2. On a tab screen the bottom inset is counted twice — `Screen` (`screen.tsx:120`) asks for the
   `bottom` edge and the bar adds `Math.max(insets.bottom, 12)` again — so ~34pt of dead page sits
   between the last row and the pill. Harmless to touch handling, but it is the gap that makes the
   bar look like it is floating over nothing. Priya's call, not mine.
3. Should `bills.tsx`, `subscriptions.tsx` and `source/[id]`'s non-payment rows open their records
   too? Same helper, three lines each, but it was outside the brief.
