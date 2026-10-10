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

---

## 2026-09-16 — Diego (Developer, data and backend) — demo data seeded into the live project

**Outcome:** Done. `supabase/seed/demo-sam.sql` is written and applied three times to the linked
project (ref `jwnsdszstqlpkzwehtmq`) for the Founder's account only; counts are identical after every
apply, so it is genuinely idempotent. `supabase/seed/demo-sam-cleanup.sql` is written and **not** run.
Home now reads income **$3,760.00**, expenses **$2,616.33**, **left this month $1,143.67**. Gates:
`npm run typecheck` exit 0, `npm test` 51 suites / 551 tests pass. Nothing committed.

**What was inserted** (user `bdb18bea-…c2020`, all ids derived from `md5('skip-demo-2026-09:' || key)`)
cards 1 (Chase Sapphire · VISA · 4821 · sky, stated $412.30 as of 01 Sep → shows **$635.55**);
bank_accounts 1 (Chase Checking · 7730, stated $7,900.00 as of 01 Sep → shows **$7,193.90**);
bills 5 (Electricity/Con Edison $118.42 varying, Internet/Verizon $79.99, Phone/T-Mobile $65.00,
Car insurance/GEICO $142.00, Car loan $493.85); loans 1; subscriptions 5 (Netflix 15.49, Spotify
10.99, iCloud+ 2.99, Equinox 185.00, Amazon Prime 139.00 yearly, renews 2026-11-07); receipts 36 over
eight weeks (2 today, 2 yesterday, $5.95–$174.28); charges 23 (Jul–Sep); payments 1; reminders 5;
savings_pots 1; groups 1 + 3 members (two of them placeholders with no account) + 3 expenses + 9
splits + 1 settlement; monthly_savings 1 (Aug 2026, computed by `close_savings_for`, not typed).

**Decisions worth knowing**
- **The car loan is the app's own arithmetic, not a plausible number.** $25,000 at 6.9% over 60
  months, first payment 2026-03-15, funded 2026-02-15, `day_count_basis 'monthly'` → payment
  **$493.85**, final $493.95, total interest **$4,631.10**, payoff 2031-02-15, and the 2026-09-15 row
  is 131.50 interest / 362.35 principal / 22,506.63 outstanding. Taken from `amortise()` in
  `src/lib/loan.ts` by executing it, so the schedule screen and the bill beside it agree to the cent.
- **`starts_on` / `started_on` are set to each plan's first recorded charge.** The catch-up recorder
  (`src/lib/charges.ts`) walks from that floor, so a looser value would have the app write months of
  charges nobody entered the first time it is opened. Checked plan by plan: opening the app writes
  **no** new charge and rolls **no** due date.
- **The loan bill's `starts_on` (2026-07-15) deliberately differs from the loan's first payment
  (2026-03-15).** The loan is real from March; Skip has only known about it since July, and the
  ledger must not claim to have recorded what it never saw.
- **Cards are capped at one.** `enforce_free_allowance` (0007 pro wall) is BEFORE INSERT, so it fires
  ahead of `on conflict` — which is also why the card and account inserts are guarded with
  `where not exists` instead. The account holds no entitlement row, and there was **no Amex on it**
  (the brief assumed one); receipts are therefore split between the Visa and the checking account.
- **`enforce_scan_is_pro`** means every receipt is `source = 'manual'`.
- **One stray push suppressed.** `notify_added_to_group` queues a notice for any member who is not
  the actor, and a seed has no actor, so Sam was told he had been added to his own group. The seed
  deletes that unsent notice.

**Could not verify:** nothing on a device or Simulator — no eyes on Home, Insights, Cards or Splits
with this data in them. The figures above are computed from the database with the same arithmetic the
hooks use, not read off a screen. Splits is Pro-gated in the app and this account is not Pro, so the
group needs Dilip's dev bypass to be seen at all.

**Open questions**
1. Sam is not Pro, so Splits, Appearance and scanning are walled in the demo. Do we add an
   `entitlements` row for the demo account (a product decision, so not mine to take), or is the dev
   bypass enough for a stakeholder walk-through?
2. Only **August 2026** appears on Savings. `close_savings_for` will not close a month before the
   account existed (0006 savings-start-at-birth) and the profile was created 2026-08-31, so July's
   eight weeks of receipts are counted nowhere. Correct by the rule, surprising in a demo.
3. Cleanup has not been run, so it is verified by matching its predicates as counts (36 receipts,
   23 charges, 5 bills, 5 subs, 5 reminders, 3 expenses, 9 splits, 3 members, 1 of each singleton —
   and the four pre-existing rows matched by none of them), not by executing it.

## 2026-09-17 — Dana (Developer, UI and navigation) — design kit: Cards tab, the money screens, Transactions

**Outcome:** done. 56 frames across 8 new specs in `design/`, drawn from the routes' own source and
the kit's components. `node design/build.mjs` renders 247 screens with no `✗`.

**What changed** (new files, nothing else touched; nothing under `design/kit/` edited):
- `design/screens/20-cards.mjs` — `cards`, `cards-empty`, `cards-free-plan`, `cards-error`.
- `design/screens/21-add-card.mjs` — `add-card-amount`, `-details`, `-due`, `-due-no-date`, `-edit`,
  `-save-error`, `-delete-confirm`, `-balance-confirm`, `-loading`, `-error`, `-missing`.
- `design/screens/22-add-account.mjs` — `add-account-amount`, `-details`, `-payday`,
  `-payday-no-income`, `-payday-unknown`, `-edit`, `-delete-confirm`, `-loading`, `-error`, `-missing`.
- `design/screens/23-source.mjs` — `source-card`, `source-account`, `source-empty`, `source-loading`,
  `source-error`, `source-pay-pad`.
- `design/screens/24-salary.mjs` — `salary`, `salary-two-sources`, `salary-empty`, `salary-error`,
  `salary-loading`, `salary-amount-pad`.
- `design/screens/25-savings.mjs` — `savings`, `savings-excluded`, `savings-empty`,
  `savings-loading`, `savings-error`.
- `design/screens/26-savings-month.mjs` — `savings-month`, `-plain`, `-excluded`, `-exclude-confirm`,
  `-loading`, `-error`, `-missing`.
- `design/screens/27-transactions.mjs` — `transactions`, `transactions-month`, `transactions-filter`,
  `transactions-no-results`, `transactions-empty`, `transactions-loading`, `transactions-error`.

**Composed locally** (the kit has no component for them; measurements copied from the source):
NetworkPicker, ReminderField, the delete/reset/exclude footer rows, salary's source card and
"Add salary source" pill, savings' MonthRow and "Saved so far" card, savings-month's "What Skip
worked out" card, source's SummaryLine block, header row and floating pill, the transactions period
stepper, the filter button's count badge, the AmountPad modal, and a ring standing in for
`ActivityIndicator`.

**Sample figures, all reconciled to the cent:** card ledger $178.00 on 1 Sep + $384.30 charged −
$150.00 paid = $412.30 owed; account $234.27 + $4,200.00 in − $1,594.15 out = $2,840.12; savings
months 687.14 / −261.30 / 881.28 / 960.88 (corrected to 840.00) → Savings tile $2,268.00 (raw, as
`cards.tsx` sums it) and "Saved so far" $2,147.12 (corrected, as `savings.tsx` sums it).

**Two deviations from the brief, both to stay faithful to the source:**
1. The Transactions tab has **no range dropdown** — it uses `ChoiceChips(PERIODS)` plus a stepper
   pill (`periodLabel`). `RangeDropdown` lives on bills/subscriptions/receipts. So instead of a
   `RangeMenu` overlay there is a second frame, `transactions-month`, showing the Month period.
2. `FilterSheet` is a **full-screen `Modal`**, not a bottom sheet, so `transactions-filter` is a
   full frame (X, centred "Filter", Reset/Apply footer) rather than `C.Sheet`.

**Two real defects the faithful drawing exposed** (app bugs, not kit artefacts):
- `src/components/cards/network-picker.tsx`: the selected circle is `bg-ink` with `text-on-control`.
  With the apricot accent `onControl` is `#111111`, so in light mode the mark is black on black —
  invisible. Visible in dark mode only. See `design/out/hifi/add-card-details.svg`.
- The "This balance becomes the starting point" dialog puts "Leave it as it was" and "Update the
  balance" side by side in a 326pt card at `numberOfLines={1}`; the primary label clips to
  "Update the…". Three or more actions stack, two do not.

**Could not verify:** nothing on a device — the frames are estimated Poppins metrics, so the two
clipped strings above (and "Monthly Bills · Chase Checking ••1180" in `transactions-month`) are
marginal and want checking on hardware.

---

## 2026-09-17 — Dilip (Developer, native and platform) — design kit: support, legal, reminders, notifications, tiles

**Outcome:** Done. Seven specs, 24 frames, under `design/screens/60..66`. `node design/build.mjs`
renders every screen in the kit (263 at the time of my last run) with **no `✗` lines**, and I
sanity-checked eight of my hi-fi SVGs as rasterised images (headless Chrome, light and dark) rather
than trusting the exit code.

**What changed** (new files only; nothing under `design/kit/` or anyone else's screens touched)
- `design/screens/60-faq.mjs` — `faq`, `faq-expanded`. All eight groups and eighteen questions from
  `GROUPS` in `src/app/faq.tsx`, verbatim; the open card carries the first answer in full.
- `design/screens/61-contact.mjs` — `contact`, `contact-idea`, `contact-filled`, `contact-error`,
  `contact-sending`, `contact-sent`. Both `COPY` topics, the read-only email block, the 160pt message
  box with its `n / 4000` counter, the disabled "Sending…" pill and the sent confirmation.
- `design/screens/62-privacy.mjs` — `privacy`. All nine sections, every paragraph, bullet and note.
- `design/screens/63-terms.mjs` — `terms`. All twelve sections, same.
- `design/screens/64-reminders.mjs` — `reminders`, `reminders-empty`, `reminders-loading`,
  `reminders-error`, `reminders-receipts-error`, `reminders-time-picker` (the `TimePicker` Modal as an
  `overlay`). Captions from `REMINDER_CAPTION`, chips from `LEAD_OPTIONS`, the counts computed the way
  the screen computes them.
- `design/screens/65-notifications.mjs` — `notifications`, `notifications-empty`,
  `notifications-loading`, `notifications-error`, `notifications-clear-all` (the confirm dialog).
- `design/screens/66-tiles.mjs` — `tiles`, `tiles-moved`, `tiles-saving`.

**Composed locally, because the kit has no component for them** (README rule 3)
- `LegalDocument` (numbered heading, paragraph, bullet list, tinted note) — duplicated in 62 and 63.
- The `TimePicker` dialog, including the 240pt clock face as a `raw` node with its own SVG and HTML
  bodies (hand, centre dot, 22pt marker, twelve numbers). Colours resolve through the kit's `color()`,
  so dark mode is correct — verified on screen.
- The reminder card, group header, lead-chip row, "Clear all" and "Original order" pills, the tile
  step buttons, and a left-aligned `Subtitle` (the kit's helper hardcodes centre).

**Found while drawing — for whoever owns these files**
1. `src/app/reminders.tsx` has **no "permission not granted" state**. `enableReminders()` asks iOS at
   the moment a switch goes on and the page never reflects a refusal; the only in-app acknowledgement
   is the standing Bell note. Nothing to draw, so I drew nothing.
2. `reminders.tsx:187` `<Title align="left" className="mt-1 …">` — the `mt-1` is dead for the same
   reason the `Title` doc comment gives for `text-left`: NativeWind resolves by CSS order, and the
   component's own `mt-2` is generated after `mt-1`. Every other page's title is `mt-2`; I drew 8pt.
3. The same mechanism means `Subtitle className="text-left"` (faq, contact, reminders, notifications,
   tiles) may be rendering **centred** on device. I drew it left, which is plainly the intent, and
   flagged it — one of the two (the class or the component) is wrong and it is a one-line fix either
   way: give `Subtitle` an `align` prop like `Title` has.
4. `notifications.tsx:150` — "Deducted from Chase Checking ••1180" clips at `numberOfLines={1}` on a
   row whose amount is five digits ($120.00). Reproduced in the frame. Real, not a kit artefact.
5. `tiles.tsx` has no drag handles — it is two chevron steppers per row, deliberately (see the file's
   own comment). The brief called them drag handles; the frames show what the code does.

**Could not verify:** nothing on a device or Simulator; the frames use the kit's estimated Poppins
metrics, so finding 4 and the wrapped question cards are close calls that want hardware. I did not run
the app, and nothing outside `design/screens/` was modified.

---

## 2026-09-17 — Diego (Developer, data and backend) — design kit: bills, subscriptions and receipts screens

**Outcome:** Done. Eight new spec files under `design/screens/` (orders 30–37), 66 frames, every state each
route actually has. `node design/build.mjs` prints no `✗`; all 66 render in all five variants
(wireframes / hifi / hifi-dark / html / html-dark). Nothing under `design/kit/` was touched and no other
designer's screen file was opened. Nothing committed.

**What changed** (all new files)
- `design/screens/30-bills.mjs` — `bills`, `bills-range`, `bills-loading`, `bills-empty`,
  `bills-window-empty`, `bills-error`.
- `design/screens/31-add-bill.mjs` — `add-bill-category`, `add-bill-amount`, `add-bill-amount-empty`,
  `add-bill-details`, `add-bill-details-icon`, `add-bill-when`, `add-bill-when-period`, `add-bill-edit`,
  `add-bill-edit-delete`, `add-bill-edit-loading`, `add-bill-missing`, `add-bill-read-error`.
- `design/screens/32-bill-plans.mjs` — `bill-plans`, `-loading`, `-empty`, `-no-results`, `-error`, `-filter`.
- `design/screens/33-subscriptions.mjs` — `subscriptions`, `-range`, `-loading`, `-empty`,
  `-window-empty`, `-error`.
- `design/screens/34-add-subscription.mjs` — `-amount`, `-amount-empty`, `-details`, `-search`, `-when`,
  `-edit`, `-edit-delete`, `-edit-loading`, `-missing`, `-read-error`.
- `design/screens/35-subscription-plans.mjs` — `subscription-plans`, `-loading`, `-empty`, `-no-results`,
  `-error`, `-filter`.
- `design/screens/36-receipts.mjs` — `receipts`, `-loading`, `-empty`, `-no-results`, `-error`,
  `-scan-error`, `-filter`.
- `design/screens/37-add-receipt.mjs` — `-amount`, `-reading`, `-scanned`, `-scan-failed`,
  `-upload-where`, `-no-camera`, `-details`, `-when`, `-edit`, `-edit-delete`, `-edit-loading`,
  `-missing`, `-read-error`.

**Two corrections to the brief, made against the source**
1. `bills.tsx` and `subscriptions.tsx` have **no filter sheet** — they carry a `RangeDropdown`, whose open
   state is a centred `RangeMenu` over a scrim. Drawn as `bills-range` / `subscriptions-range`. The three
   filter sheets belong to `bill-plans.tsx`, `subscription-plans.tsx` and `receipts.tsx`.
2. Those three filter sheets are **full-screen `Modal`s over `bg-card`**, not bottom sheets. Drawn as their
   own frames (full-bleed panel, `w: 390` with `ml: -24`) rather than `screen({ sheet })`, so the pinned
   Reset/Apply row and the scrolling body land where they really are.
   Cancelled subscription rows at 0.5 opacity live on `subscription-plans`, not `subscriptions`.

**Composed locally (the kit has no equivalent)**
`bills`/`subscriptions` `Tile`, the "Bills charged"/"Renewals charged" figure block, the filter button with
its count badge, `CategoryPicker`, `IconPicker`, `BrandField` (empty, chosen, and mid-search),
`ReminderField`, the Delete row, the scan report card, the filter modal shell, and a ring standing in for
`ActivityIndicator`.

**Could not represent**
- The ten bill-category glyphs are custom SVGs in `assets/bill-icons/`; the kit draws lucide only, so the
  nearest lucide name stands in for each (`00-home.mjs` already does this for the Rent row).
- `BrandLogo`/`BrandMark` fall back to the monogram in the kit, so Electricity reads "EL" and T-Mobile "T-".
- `C.SubscriptionRow` prints `-$15.49`; `subscription-row.tsx` prints `$15.49` coloured money-out. Kit
  deviation, not mine to fix — `design/kit/` is off limits.
- Payment-source labels are `network ••last4` (`queries.ts:338`), so `Chase ••4421` is shorthand: the real
  label would be the *network*, e.g. `VISA ••4421`.

**Two real-app observations for Priya/Dana, found while copying the source**
1. `bills.tsx`, `subscriptions.tsx` and `bill-plans.tsx` show a **real-looking `$0.00`** beside the
   skeletons while loading — the figure block and the count row are not gated on the query.
   `subscription-plans.tsx` and `receipts.tsx` withhold the figure while loading, so the four pages
   disagree with each other. See `bills-loading` / `bill-plans-loading` vs `receipts-loading`.
2. `subscription-plans.tsx`'s title wraps to two lines: `Title flush align="left" className="flex-1"` has
   no `numberOfLines`, and "Your subscriptions" at 28px does not fit beside the Add pill. Visible in
   `subscription-plans`. "Your bills" and "Receipts" fit.

**Checks I ran myself:** `node design/build.mjs` — 0 `✗`, 270 screens. Verified all 66 of my ids are unique
across the whole `screens/` directory and that each produced all five outputs. Read the SVGs as text: the
only `…` anywhere in my frames is the literal one in "Reading the receipt…", and no rect or text lands
outside the 390pt frame. Checked the dark variant of the full-bleed filter panel keeps `card` over
`surface`, and that the HTML variant reproduces the same full-bleed geometry.

**Could not verify:** nothing rendered visually — I read the SVG/HTML as text, I did not look at a picture.
Colour, weight and optical spacing still need Priya/Pia's eyes on `design/out/index.html`.

**Open questions**
1. Observation 1 above: should the loading state of these five list pages be made consistent — and in which
   direction, blank or `$0.00`?
2. Is the two-line title on `subscription-plans` intended, or should the Title get `numberOfLines={1}`?
3. `design/build.mjs` no longer wipes `design/out/` (the `rmSync` was removed while I was working). That is
   good for parallel work but means deleted screens leave stale files behind — worth one clean rebuild
   before the kit is handed over.

---

## 2026-09-17 — Drew (Developer, money maths) — design kit: the seven Splits screens

**Outcome:** Done. Seven new spec files under `design/screens/` (orders 50–56, section `Splits`)
covering `splits`, `split-group`, `add-group`, `add-member`, `group-settings`, `settle-up` and
`friends` — **43 frames**, every state each source renders. `node design/build.mjs` prints no `✗`
(281 screens on the last run, the other 238 being other people's). No file under `design/kit/` and no
other designer's screen file was touched, and nothing under `src/` or `supabase/` changed.

**What changed** (all new, all untracked with the rest of `design/`)
- `design/screens/50-splits.mjs` — `splits`, `splits-empty`, `splits-loading`, `splits-error`,
  `splits-friend-request` (the popup drawn as a modal overlay over the loaded list).
- `design/screens/51-split-group.mjs` — `split-group`, `split-group-empty`, `split-group-loading`,
  `split-group-error`.
- `design/screens/52-add-group.mjs` — `add-group-name`, `-name-empty`, `-name-carried`,
  `add-group-settle`, `-settle-off`, `add-group-saving`, `add-group-error`.
- `design/screens/53-add-member.mjs` — `add-member`, `-no-friends`, `-all-in`, `-error`.
- `design/screens/54-group-settings.mjs` — `group-settings`, `-member` (not the owner), `-leave`,
  `-close`, `-remove` (three ConfirmDialog overlays), `-loading`, `-error`, `-missing`.
- `design/screens/55-settle-up.mjs` — `settle-up`, `-picking`, `-amount` (the full-screen AmountPad,
  a frame of its own because it is a Modal), `-date` (DatePicker on its month step), `-note`,
  `-invalid`, `-saving`, `-loading`, `-error`.
- `design/screens/56-friends.mjs` — `friends`, `-empty`, `-requests`, `-added`, `-error`, `-loading`.

**The figures are the real arithmetic, not decoration.** Lake house has two members (Sam, Priya) and
`src/lib/split.ts` splits in integer cents: Fuel $52.00 paid by Priya → 2600/2600 (you $26.00);
Groceries $86.20 paid by Sam → 4310/4310 (you $43.10); Priya then settles $5.00. Sam
86.20 − 69.10 − 5.00 = **+12.10**; Priya 57.00 − 69.10 = **−12.10**; the pair sums to zero, so the hero
reads "You are owed $12.10", `simplifyDebts()` has exactly one payment to suggest (Priya → Sam
$12.10), the group-settings members read "owed $12.10" / "owes $12.10", and the Splits card reads
"you are owed $12.10" — the same cent everywhere. The brief's "Priya owes Sam $12.10" only closes
with two members, which is why Lake house is "2 people" rather than three.

**Composed locally (the kit has no version)** — friend-request popup, GroupIconPicker (20 tiles),
the AmountPad screen, the DatePicker month step, the two half-width group buttons, the unlabelled
name field on `add-member`, the zero-total day heading, the friends ActivityIndicator.

**One kit bug found, worked around rather than fixed** (I may not edit `design/kit/`):
`render.mjs` gives an `icon()` node the full width of the box it sits in, so `align: 'center'` cannot
move it and every glyph hugs the left edge of its well — a 26pt glyph lands 11pt off-centre in a 48pt
`GroupIcon`, and the same goes for `IconWell`, `BillMark` and the kit's tab bar. Verified in the SVG:
`<rect x="40" width="48">` with the glyph at `translate(40 …)`. My frames pass `hug: true` on every
boxed icon, which is documented and gives the right position. One-line kit fix: centre an icon on
`x + (w - size)/2` in `toSvg`/`toHtml`, or pass `hug: true` inside `IconWell`/`GroupIcon`/`BillMark`.
Until then every other designer's wells are off-centre in the handoff.

**Checks I ran myself:** `node design/build.mjs` clean, all 43 ids present in `wireframes/`, `hifi/`,
`hifi-dark/` and `html/`; ids confirmed unique across all 281 screens (the apparent `splits`/`insights`
collisions with `45-pro-feature.mjs` are entries in its FEATURES data, not screen ids). Read the SVGs
as text and rasterised eight of them through `qlmanage` to look at them: geometry, centring and
stacking check out and nothing overlaps (keypad ends 710, Done 730–794 in an 844 frame). The only `…`
in my frames are the literal "Creating…"/"Saving…" labels plus the Note placeholder, which the kit's
TextField truncates — the app's TextInput clips the same string, so it is honest either way.
`npm test` — **51 suites / 551 tests pass** (I changed nothing under `src/`; run as the standing gate).

**Could not verify / deviations**
- The app's group glyphs are its own drawings under `@/assets/bill-icons`, which the kit cannot load;
  each of the 20 is paired with the nearest lucide glyph, so count, order and geometry are right but
  four or five drawings differ in detail.
- `split-group`'s "2 people" line is centred, not left-aligned. That is what the app does —
  `Subtitle` carries `text-center` in `typography.tsx` and the screen only passes `mt-1`. Drawn
  faithfully; worth Priya's eye on whether the app should pass an alignment there.
- `group-icons.ts` tints are `rgba()` literals, so they render identically in both modes, exactly as
  the app intends. Not checked against the real dark surface by eye.

**Open questions**
1. `design/screens/48-add-expense.mjs` declares `section = 'Settings'`. `src/app/add-expense.tsx` is a
   Splits screen and its 11 frames land in the wrong gallery group. Not my file — whoever owns it.
2. `design/build.mjs` no longer wipes `design/out/`, so a renamed or deleted frame leaves a stale file
   in the gallery. One clean rebuild before the handoff.
3. `design/**` is not prettier-clean — `kit/components.mjs` and every screen file fail
   `npx prettier --check`, mine included, because the kit's house style is one long line per
   component. If `npm run check` is ever meant to be green, `design/` wants a `.prettierignore` line.

---

## 2026-10-01 — Dmitri (Development Team Lead) — voice input: wave 2 plan and save-path decision

**Outcome:** Done. The plan is at `.claude/team/dev/voice-input-plan-2026-10-01.md`. No code was
edited, nothing was run that writes, and nothing was committed.

**Decision: save path (a), as a hybrid.** The review page saves NEW items directly through pure
value-builders extracted from the three add forms (`src/api/entry-values.ts`; the forms are refactored to call them).
When a builder refuses the draft, the review page hands off to the add form pre-filled, with `from=voice`,
and the form's own Save runs.
- Evidence that a new item's orchestration collapses to `create(values)`: `past-charges.ts:102`
  (`choose` returns before any dialog when there's no planId), `:139` (always ready), `charges.ts:143`
  (`floorAfterCharges` is identity with no charge), `reminders.ts:213/237` (no row → 'off' → a delete
  of nothing). Already pinned by `past-charges.test.tsx:46, 135`.
- Past vs future first date: the dialog never appears for a new item either way. A past date makes the
  recorders backfill charges, exactly as the form does, so a "today-or-future only" gate was rejected
  because it would *diverge* from the form.
- (b) rejected: **no test pins what any form's Save writes.** The existing add-form screen tests only
  cover the edit-load gate. Golden save tests on the current code are therefore a hard gate before any
  form line moves.
- (c)-only rejected: about 4 extra taps, a redundant review, and the forms' `router.back()` after save
  lands on a live review page (a duplicate-save trap). Fixed in the hybrid with `dismissTo('/home')`.

**Other calls:** draft `/voice` → `/voice-review` goes through a single-slot in-memory module
(`src/lib/voice-draft.ts`), not route params, with re-validation on arrival. Review → form goes through route params with
strict readers. The add forms go to **Diego**, not Dana (one owner per file; data-in/data-out refactor
behind his golden tests). Migration split into two files (enum value alone; then `enforce_scan_is_pro`
gains `'voice'`, because today the server wall only knows `scan`/`upload`).

**Found:** `CalculatorPad` rounds `1.005 → 1.00` and `10.075 → 10.07` where `money.ts` gives
`1.01`/`10.08` (a cent off; Drew ticket). `receipts.tsx` stopped direct-filing scans in `c123a72`;
`ScanDraft.complete` is dead and two comments are stale. `WALL` in `src/lib/wall.ts` has no readers.
Dilip's plugin entry has no permission strings, so the defaults are "Allow $(PRODUCT_NAME) to use the microphone."

**Could not verify:** that `router.dismissTo('/home')` pops to the nested `(tabs)/home` without
replacing. The docs and types agree on the API, and `save-loan.tsx:116` is precedent for a root route
only, so this is a device check for Tia. I didn't run the Supabase CLI, so the transaction behaviour of
`alter type … add value` is reasoned from Postgres 17 semantics.

**Open questions:** (1) Drew's contract needs `merchantHeard` (for learning aliases) and probably `forceKind`
(re-parse when the kind is changed on review); `learnAlias`/`applyAliases`/`voiceVocabulary` signatures
are not in the brief. (2) Voice usage is measurable for receipts only; bills and subscriptions have no source column.
(3) Founder copy is needed for `PRO_FEATURES.voice`, the two Info.plist strings and `privacy.tsx`.
(4) The DB migration must deploy before the native build ships.

---

## 2026-10-01 — Drew (Developer, money maths) — voice parser (`src/lib/voice/`)

**Outcome:** Done. `parseVoice(alternatives, ctx): VoiceDraft` plus `learnAlias`, `applyAliases`,
`voiceVocabulary`, all pure TypeScript (no React, no native, no network), with the CEO's contract additions
(`merchantHeard`, `forceKind`, ordered-pair `learnAlias`, past tense on bills/subscriptions, integer-named
merchants) and Pia's nine "Try saying" sentences as fixtures. Nothing outside `src/lib/voice/` touched.

**What changed (all new):** `src/lib/voice/` — `types.ts`, `clean.ts` (tokenizer, fillers), `numbers.ts`
(one number group → exact cents), `amount.ts` (which number, ambiguity rule), `date.ts` (spoken dates,
direction by kind and tense), `cycle.ts`, `merchant.ts` (aliases → exact → fuzzy via `matchesSearch` →
typed "at X"), `kind.ts`, `bill-category.ts` (ten ids hard-coded), `corrections.ts` (slot-wise),
`score.ts`, `aliases.ts`, `vocabulary.ts`, `words.ts`, `parse.ts`, `index.ts`, `test-fixtures.ts`; tests
`parse.test.ts` (202-sentence table + invariants), `aliases.test.ts`, `vocabulary.test.ts`,
`bill-category.test.ts`, `catalog.test.ts` (runs against the real 371-row catalog read from the migration).

**Decisions:**
- Ambiguity: any 1–99 number followed straight by a two-digit number ("twelve fifty", "fifteen ninety
  nine", "nine ninety nine", "twelve oh five", iOS "12:50"/"15 99") returns both readings; `amount` is
  pre-selected (bill → hundreds, else dollars-and-cents) and `missing` keeps `amount`. Settled only by a unit
  ("twelve dollars fifty", "twelve fifty cents", "a buck fifty") or a scale ("eighteen hundred"). Digits are
  taken as iOS wrote them. Tied alternatives that heard different amounts → all offered.
- `confidence: 'high'` additionally requires `missing` empty.
- A known biller suggests the bill category (Comcast → internet) only where unambiguous; spoken words win.
- Fuzzy merchant matching needs 2–3 words (iOS writes real words; one-word fuzzy turned "safety" into
  Safeway). Everyday-word brands (Shell, Medium, Lemonade, "office", "max") need "at/to/with" or a word like
  "insurance/card/app" next to them.
- Month ends: forward clamps (31st → 28 Feb), backward skips to a month that has the day.

**Checks:** `npx jest --ci src/lib/voice` 6 suites / 337 (my 5 suites 278, plus Diego's `voice-draft` 59);
`npx tsc --noEmit` no errors in `src/lib/voice` (3 in `src/app/voice.tsx` / `src/components/voice/` —
other owners, stale typed routes + a module not yet written); `rm -rf .expo/cache/eslint && npx eslint
src/lib/voice` clean; prettier clean. Full `npx jest --ci`: 1129/1132 — `quick-actions.test.tsx` fails on
the committed tree ("Receipt" vs "Receipts"), the other two passed when run alone (files mid-edit by others).

**Open for the Founder/CEO:** "fifteen ninety nine" is asked, not settled (contradicts the CEO note; Apple
says "nine ninety nine" for $999); "Comcast" shows as Xfinity and "Amazon Prime" as Amazon (catalog
aliases); brand → bill category pre-fill vs migration 0021; "spent 15.49 on Netflix" is a receipt;
`guessCategory` duplicated (pinned by test) until it moves out of `src/api/brands.ts`.

---

## 2026-10-01 — Diego (Developer, data and backend) — voice input wave 2, data side

**Outcome:** Done, apart from verification of the two migrations. Docker isn't running, the Supabase CLI
isn't installed and there's no local Postgres, so they are written but **unverified**. Nothing was applied to
any database and nothing was committed.

**Golden tests first (plan §1.4 step 1).** There are 43 tests in `src/__tests__/app/add-{receipt,bill,subscription}-save.test.tsx`
(14, 16 and 13). They pin the exact create/update payload, every hint and the step it sends you to, the bill
icon rule, `'period'`, `starts_on` through `floorAfterCharges`, `started_on` through
`countFromAfterPick`/`floorAfterCharges`, the `carried` values for past charges, and amounts
`1100 / 15.99 / 0.10 / 1030.5`. All 43 were green on the untouched forms (`git diff` of the forms was empty at
that point), with their sha256 recorded. After the refactor `shasum -c` still matches and all 43 pass, with zero
edits to them. A mutation check (three regressions injected into the builder) failed 13 of them, then I
restored the builder. The primary-button stub accepts a press while disabled, because that's the only way
to reach the checks inside Save.

**What changed**
- `CaptureSource = 'manual' | 'scan' | 'upload' | 'voice'` in `src/api/mutations.ts`, used by `ReceiptValues`
  and `ReceiptRow` (`src/api/queries.ts`).
- NEW `src/api/entry-values.ts` (+ 24 tests): `buildReceiptValues`, `buildBillValues`,
  `buildSubscriptionValues` and `defaultBillName`, with the signatures from plan §1.5. The amount rule is unchanged
  (`isFinite && > 0`).
- The forms call the builders. Past charges and reminders are untouched. `from=voice` (new items only) →
  `router.dismissTo('/home')`, otherwise `router.back()`. add-receipt: `scannedVia=voice` gives `source:'voice'`
  and no scan report, and the params go through strict readers. add-bill/add-subscription: strict `prefill*`
  params; a bill with a known category skips the chooser; `handleSelectCategory` keeps a name that is the
  company's or one typed on review.
- NEW `src/lib/voice-draft.ts` (+ 59 tests): a single slot holding the parsed draft **and the review page's
  working copy** (the CEO's /voice-edit addition): `putVoiceDraft`, `readVoiceDraft`, `readVoiceEntry`,
  `updateVoiceEntry` (validated, all or nothing), `rederiveVoiceEntry` (forceKind re-parse that keeps
  hand edits), `useVoiceSession` (useSyncExternalStore, so no focus effect is needed), `clearVoiceDraft`,
  `validateVoiceDraft`/`validateVoiceEntry`, `amountText` (two decimals from cents), `voiceSaveBlocker`,
  `entryTo{Receipt,Bill,Subscription}Input`, `entryToForm`, `readBillPrefill`/`readSubscriptionPrefill`.
  The parser round trip is checked: `validateVoiceDraft(parseVoice(…))` equals the parse for 8 sentences.
- NEW `src/api/voice-aliases.ts` (+ 16 tests): `useVoiceAliases`, `useLearnVoiceAlias` (serialised, never
  rejects) and `forgetVoiceAliases`. The key is per user, `skip.voice.aliases.<id>`, holding ordered pairs, using
  Drew's `learnAlias`, capped at 200. `gcTime: 0` because the QueryClient is never cleared on sign-out.
- `src/api/auth.ts`: `signOut()` and `deleteAccount()` (only after a verified deletion) clear aliases on a
  best-effort basis and never block. `auth.test.ts` has 5 new tests and the existing ones are unchanged.
- NEW `src/__tests__/app/add-forms-from-voice.test.tsx` (12): prefill, voice source, `dismissTo`, bad params blank.
- NEW migrations `20261001100001_capture_source_voice.sql` (the enum value alone in the file) and
  `20261001100002_voice_is_pro.sql` (`enforce_scan_is_pro` now walls `'voice'`, still before insert only).
  Nothing else in SQL or the client switches on `receipts.source`.

**Gate:** `npx tsc --noEmit` is clean, including Dana's voice pages. eslint on my files: 0 errors, 13 warnings,
all in test files (`require()` in mock factories as `setup.test.tsx` does, plus an unused disable line in the
goldens that I left so they stay byte-identical). `npx jest --ci`, whole suite: 1167/1168. The one failure is
`quick-actions.test.tsx` › "routes Receipt", which fails at HEAD (the component says "Receipts") and is not mine.
On the first run `calculator-pad.test.tsx` (modified by someone else) and `voice.test.tsx` (Dana's, new) also
failed; both passed on the re-run.

**Open questions:** zod is only a transitive dependency (not in package.json), so validation is hand-rolled.
Should it become a declared dependency? Deploying the DB before the native build (R5) is a Founder gate. Scan params now
go through the same strict readers, so a `'0'` or garbage amount opens blank, and a bad date opens as today
rather than Invalid Date.

---

## 2026-10-01 — Drew (Developer, money maths) — voice example swap + CalculatorPad cent fix

**Outcome:** Done, both. No commits.

**1. "Try saying" swap** (Pia's rule: change the example, not the parser). The two examples that read back
under a different name are replaced by ones that round-trip exactly against the real catalog:
- Bills: "**Xfinity** **$79.99**, due **on the 20th** **every month**" → bill, $79.99, Xfinity, 2026-10-20
  (today 2026-10-01), monthly, internet, high.
- Subscriptions: "**Hulu** **$99.99** **a year**" → subscription, $99.99, Hulu, yearly, high.
`parse.test.ts` TRY_SAYING updated; the old Comcast / Amazon Prime sentences moved to the merchant section
as catalog-alias cases. `catalog.test.ts` now checks all nine examples against the real 371-row catalog
(kind, amount, no choices, merchant = bold brand, date, cycle, category). Dana's files untouched.

**2. CalculatorPad** (`src/components/ui/calculator-pad.tsx`). The local helper `toCents` (which returned
dollars) used `Math.round(v * 100) / 100`: 20.15 ÷ 2 posted $10.07, 2.01 ÷ 2 posted $1.00, and negative
halves rounded toward zero (−10.075 → −10.07). Replaced by `roundMoney` from `src/lib/money.ts` at the four
operator lines; helper deleted, one import added. Fixtures in `calculator-pad.test.tsx` (press-through,
real component): 20.15÷2 = 10.08, 2.01÷2 = 1.01, 10.05×0.5 = 5.03, 0.01÷2 = 0.01, 100÷3 = 33.33,
0.1+0.2 = 0.3, Done with a pending ÷, −10.075 → −10.08, −1.005 → −1.01, −0.005 → −0.01, and four zero results
that must read "0". Before the fix 4 of these failed (10.07, 1, 10.07, −10.07); after, 18/18 pass.

**Other money rounding in src/ (reported, not fixed):**
- `src/lib/format.ts:16` `formatCurrency` uses `Math.abs(amount).toFixed(2)`: 1.005 → "1.00", 10.075 →
  "10.07". Right for cent-exact inputs, a cent off for any sub-cent value it is handed. 115 call sites.
- `src/lib/split.ts:11` local `toCents = Math.round(value * 100)`: exact for 2-decimal inputs, wrong on a
  sub-cent half and on negative halves. Should import `toCents` from money.ts.
- `src/components/cards/account-card.tsx:22` `Math.round(balance) < 0`: an overdraft up to $0.50 reads
  "Available". `payment-card.tsx:17` same pattern: a $0.40 card balance reads "Nothing owed".
- `src/lib/apr.ts:198` `roundTo` (APR percent to 5 dp): same half flaw, rate not currency, negligible.
- `src/lib/voice-draft.ts:465` `amountText` builds "d.cc" with `Math.floor(cents/100)` / `cents % 100`;
  breaks for negative cents but unreachable (amounts validated > 0). Diego's file.
Not money: `speech.ts:395` (audio level), `flow-chart.tsx` axis labels, percent and layout `Math.round`s.

**Checks:** `npx tsc --noEmit` 0 errors; `rm -rf .expo/cache/eslint && npx eslint src/lib/voice
src/components/ui/calculator-pad.tsx src/components/ui/calculator-pad.test.tsx` clean; prettier clean;
`npx jest --ci src/lib/voice/ src/components/ui/calculator-pad.test.tsx` 6 suites / 307 passed (twice).
One earlier parallel run timed out a 3-calculation test under load; split into one row per calculation.

---

## 2026-10-01 — Dilip (Developer, native and platform) — voice input: speech recognition on iOS

**Outcome:** Done, with one incident I caused (below). `expo-speech-recognition` 57.1.0 is installed and
configured, `src/lib/speech.ts` implements the brief's speech contract plus the CEO's three additions, 38
jest tests pass, and a Debug simulator build was verified from the artifact. Nothing committed.

**INCIDENT (my fault): `ios/` was wiped and regenerated; the Sentry upload token is gone.** In the SDK 57
CLI, `npx expo prebuild` cleans by default (`clean: !args['--no-clean']`). Keeping `ios/` needs
`--no-clean`. The unversioned docs page still says the opposite. I also ran it with `CI=1`, which skipped
the git-status prompt. Lost: `ios/.xcode.env.local` (SENTRY_AUTH_TOKEN plus SENTRY_ORG/PROJECT, git-ignored,
not backed up), the old `ios/sentry.properties`, Pods/, the workspace and an old build/ folder. Restored or
regenerated: Podfile.lock (restored from my backup, so only the new pod differs), Pods, workspace,
PrivacyInfo.xcprivacy. Signing (team 2YDDY7H6XP, Automatic), bundle id, entitlements, the Sentry build
phases, AppDelegate and the storyboard are all identical to before. `.xcode.env.local` now holds only
`export NODE_BINARY=…`, rewritten by pod install. **Debug builds are fine (Sentry skips Debug); the next
Release build will fail at "Upload Debug Symbols to Sentry"** until someone re-adds SENTRY_AUTH_TOKEN
(the org:ci token), SENTRY_ORG=skip-budget and SENTRY_PROJECT=react-native to that file.
**Rule for everyone: always `npx expo prebuild --platform ios --no-install --no-clean`.**
Also synced from app.json by the regeneration: the Face ID string (it was still the plugin default), the
stale `expo.icon` resource dropped (app.json uses icon.png), and the `RCTNewArchEnabled` plist key dropped
(the SDK 57 template no longer writes it).

**What changed**
- `package.json` / lockfile: `"expo-speech-recognition": "^57.1.0"` (chosen by `npx expo install`; the lock pins 57.1.0).
- `app.json`: one plugin entry, `["expo-speech-recognition", { microphonePermission, speechRecognitionPermission }]`
  with the Founder-approved copy (U+2014 dash, U+2019 apostrophe, exact).
- `src/lib/speech.ts`: `SpeechStatus`, `isSpeechAvailable()`, `supportsOnDevice(): boolean | null`, and
  `useSpeechCapture({ contextualStrings })` returning `{ status, interim, alternatives, onDevice, level, start, stop, cancel }`.
- `src/lib/speech.test.ts`: 38 tests, fake engine, isolated registry per test.

**Key behaviour**
- The package's own entry calls `requireNativeModule` at import (it throws without the pod). The wrapper
  imports types only and resolves the module through `requireOptionalNativeModule('ExpoSpeechRecognition')`,
  iOS only, so importing it is safe in Jest, on web and in old builds.
- en-US, interim results, 3 alternatives (tidied, de-duplicated case-insensitively, best first),
  contextualStrings de-duplicated and capped at 100, non-continuous, `iosTaskHint: 'dictation'`, a 15s hard
  cap, and a 4s settle timer if the engine never says `end`. The previous session's `end` must land before
  a new one starts, because the engine's reset can emit a stray `end`.
- Audio: the library never deactivates the session, so on every `end` the wrapper restores the old category
  and calls `setActive(false, notifyOthersOnDeactivation)` so paused music can resume.
- Errors: not-allowed → denied; service-not-allowed / language-not-supported → unavailable; no-speech and
  nomatch → idle (interim words kept if any); interrupted → error (not reported); others → error and
  reported via `failureMessage`. Raw engine text never reaches state.
- `onDevice` and `supportsOnDevice()` claim on-device only when the module says so *and* the phone's first
  language is en-US. The module asks about the phone-language recogniser, not en-US. This can under-claim,
  never over-claim.
- `level` comes from the library's separate volume tap (100ms), normalised from -2..10, fast attack and slow
  release, and only re-renders on a change of 0.02 or more. Not verified on hardware.
- `unavailableReason` not added: the library folds offline, Dictation off and missing assets into
  `service-not-allowed`, and en-US is never "unsupported" on iOS.

**Verified:** Podfile.lock has `ExpoSpeechRecognition (57.1.0)`. ExpoModulesProvider registers
`ExpoSpeechRecognitionModule`. The built `SkipBudget.debug.dylib` (x86_64 + arm64) contains
`_TtC21ExpoSpeechRecognition27ExpoSpeechRecognitionModule` and links Speech.framework and AVFAudio. The
built Info.plist carries both usage strings, byte-identical to app.json. The app is at
`~/Library/Developer/Xcode/DerivedData/SkipBudget-dbbmmmikbvksngagjcqfkpxjgues/Build/Products/Debug-iphonesimulator/SkipBudget.app`.
tsc is clean apart from `src/app/add-receipt.tsx` (another agent's `captureSource: 'voice'`, mid-edit).
eslint and prettier are clean on my files. expo-doctor fails 2 checks, both pre-existing (no `pod` on PATH;
31 SDK-57 patch updates). Full jest: 1201/1202. The one failure, `quick-actions.test.tsx` ("Receipt" vs
"Receipts"), was already failing at HEAD and is not mine.

**Not verified:** nothing ran on the Simulator or a device (no voice page existed yet). The task hint,
level feel, audio hand-back and on-device behaviour all need a real iPhone.

---

## 2026-10-01 — Dana (Developer, UI and navigation) — voice input: FAB, /voice, /voice-review, /voice-edit

**Outcome:** Done. Built to Pia's spec, Dmitri's plan and the Founder's three decisions that came in mid-task, against the real code from Drew, Dilip and Diego (all landed before the end). Gate: `tsc` 0 errors (typed routes are regenerated now), eslint and prettier clean on my files, `jest --ci`: 1231 pass, 1 fail. The failure is `src/components/dashboard/quick-actions.test.tsx` and it is pre-existing: it expects "Receipt" and the committed `quick-actions.tsx` says "Receipts". Neither file is touched in the tree. No commits.

**What changed**
- New: `src/app/voice.tsx`, `voice-review.tsx`, `voice-edit.tsx`. Each opens with `useProGate('voice')`.
- New: `src/components/voice/` (`voice-fab`, `listening-card`, `review-row` + `GlyphWell`, `example-card`, `stale-draft`, `listen-again`, `own-merchants`).
- Additive edits: `Screen.floatingPlacement` (default 'page', unchanged); `FlowHeader` gets optional `closePrompt` (no ✕ without it) and `onClose`; `BrandField` gets `initialQuery` and `autoFocus` (spec §6/§13). Home: `{ pro, ready }` and the FAB, nothing else. `PRO_FEATURES.voice` (Pia §9) and `WALL.voice`.
- Privacy (Founder approved): Mia's "Adding things by voice" section goes between "What never leaves your phone" and "Who else sees it", plus the Apple speech bullet as the last item of "Who else sees it". Summary unchanged.
- Tests: `src/__tests__/app/home-voice-fab`, `voice`, `voice-review`, `voice-edit` (44 tests). The review tests run through the real voice-draft store, the real builders and the real parser (for `forceKind`).

**Decisions / deviations**
- FAB carries the PRO pill for free accounts (Founder, overrides spec §2.3). There is no shared PRO component (three inline copies on the dashboard), so I used the same classes. I added a 2pt `border-surface` ring, because the pill's fill is the disc's own colour. It sits at `-top-1 -right-1`, inside the 4pt hit slop.
- "Tap to add" and "Tap to add the amount" are drawn in `text-ink`, per Pia §10's own fallback. Measured with `contrast()`: accent-ink fell under 4.5:1 on 7 of 16 accent/mode pairs on `accent/10`, and on 4 pairs on the card. Dark plum (the default accent) measured 4.31 and 3.82. The tint and the accent plus stay.
- Unavailable body copy is Dilip's: "Check that you’re online and Dictation is on, or add it by hand below."
- Two examples were replaced (CEO): Xfinity $79.99… and Hulu $99.99 a year.
- "Start again" uses `router.dismissTo('/voice')`, not `replace`, so the stack never holds two `/voice` pages.
- `level` re-renders the page about 10×/s: the examples, privacy line and by-hand pills are memoised. The ring follows `level` once the first sound arrives, with a calm breath until then (no level means no ring otherwise).
- iOS head truncation only affects a multi-line Text's last line, so the live transcript is trimmed to its newest ~90 chars instead.

**Not verifiable without a device (for Tia):** FAB geometry (12pt over the pill, flush right; this assumes a 0 bottom inset in the tab scene); the ring and badge on dark plum and navy, light pistachio and apricot; `dismissTo('/home')` leaving `[tabs]` with Home selected; VoiceOver: the announce-then-start, whether its speech gets transcribed, focus staying on the footer button as it turns into Done; AX text sizes; the mic indicator going off on blur and background.

**Open questions**
1. `TextLink` has no `accessibilityHint`, so "More options" lacks the spec's hint. It needs a one-line additive prop in a shared UI file (not mine).
2. `Title` has no header role, so "Just say it" isn't announced as a header (true of every page).
3. Back from Settings goes to idle whether or not access was granted. `speech.ts` has no permission read, so the next tap finds out.
4. An interruption (a call) arrives as `error`, so the page shows `FAILURE_MESSAGE`, where the spec wants silent idle. That would need Dilip to tell the two apart.
5. Privacy policy `updated` date is still 28 August 2026. The policy itself promises the date changes when sharing changes. That's the CEO's or Founder's call at release.

---

## 2026-10-01 — Drew (Developer, money maths) — money-rounding ticket (format, split, card captions)

**Outcome:** Done, all three; self-contained (separate from voice). No commits.

1. `src/lib/format.ts` `formatCurrency`: `Math.abs(amount).toFixed(2)` → `toCents(amount)` from money.ts, then
   whole/fraction built from integer cents. Before: 1.005 "$1.00", 10.075 "$10.07", 2.675 "$2.67",
   −1.005 "-$1.00". After: "$1.01", "$10.08", "$2.68", "-$1.01". Cent-exact inputs format identically.
   5 tests added (half-cent, negatives, −0, large to $9,999,999,999.99, posted-then-truncated); the 6
   existing ones unchanged. Limit noted in the doc comment: exact to $9,999,999,999.99 (toCents decides on
   12 significant digits).
2. `src/lib/split.ts`: local `toCents`/`toDollars` replaced by money.ts `toCents`/`fromCents`. Callers:
   `simplifyDebts` gets balances from the `group_balances` view (sums of numeric(14,2)); `equalShares` and
   `exactRemainder` get amounts typed through `applyAmountKey` (≤ 2 decimals). All whole cents, so no
   real output changes. 4 tests added that would fail under the old rule (−1.005/1.005 settles $1.01 not
   $1.00; 10.075 splits [5.04, 5.04] not [5.04, 5.03]; remainder 0.08 not 0.07; float dust still nothing).
3. `account-card.tsx` / `payment-card.tsx`: caption decided on `toCents(balance)` instead of
   `Math.round(balance)`. Before: −$0.01…−$0.50 read "Available"; ±$0.01…$0.50 on a card read "Nothing
   owed". After: "Overdrawn" / "Owed" / "In credit"; float dust (±1e-12) and sub-cent values still read
   "Available" / "Nothing owed". New `src/components/cards/card-captions.test.tsx` (21 rows): 7 fail on the
   committed code, all pass with the fix. The figure stays whole dollars, truncated, so a sub-dollar balance
   shows "Overdrawn $0" / "Owed $0" (figure unchanged; flagged).

**Checks:** `npx tsc --noEmit` 0 errors; `rm -rf .expo/cache/eslint && npx eslint` on the 7 files clean;
prettier clean. Full `npx jest --ci`: before 1201/1202, after 1231/1232. The 30 added tests are exactly
these; zero existing tests changed status. The one failure both times is the pre-existing
`quick-actions.test.tsx` ("Receipt" vs "Receipts"). `apr.ts` and Diego's `amountText` left alone as
instructed.

**Follow-up, same day (Dilip), `src/lib/speech.ts` + its test only, no native work:**
- `interrupted` (a call, Siri, an alarm) now ends the session as `idle`, keeping words already heard as the
  single alternative, and reports nothing. That includes a failed audio-session hand-back during the call.
  `error` is now only for real failures.
- New on the hook: `refreshPermission(): Promise<void>`. It only reads permission and never prompts. It
  moves `denied` → `idle` when mic and speech are both granted and leaves every other state alone. It never
  throws; a rejected read is reported and the state stays put.
- 44/44 tests; both new behaviours mutation-checked. eslint, prettier and tsc are clean (whole project).

### 2026-10-01 — Dana — voice follow-ups (CEO items 1–4)

**Outcome:** Done. Gate: `tsc` 0; eslint and prettier clean on my files; `jest --ci` 83 suites, 1252 tests, all passing.
- **TextLink:** additive optional `accessibilityHint`. "More options" now says "Opens the full form with what Skip heard filled in." TextLink has no test of its own; every screen test that uses it still passes.
- **Dev-only test sentence on `/voice`:** a `TextField` plus "Use this sentence" at the bottom of the scroll, below the examples. The text becomes a session that heard exactly those words, so it goes down the same road as speech: `parseVoice([text], ctx)` → `putVoiceDraft(draft, [text])` → one push. Both the component and the handler body sit behind `__DEV__`; so does `avoidKeyboard` on the page, because Release has no input there.
- **Back from Settings:** `refreshPermission()` is called on AppState → 'active' while the status is `denied`, replacing my reset-to-idle. It reads through a ref, so the listener never resubscribes.
- **Interruptions:** listening → idle with words goes to review once; with none, it shows "nothing heard". Tested.
- **Order dependency for Tia:** if iOS backgrounds the app *before* the interruption's idle arrives, the background rule cancels first and the words are dropped. That's a device-order question.

### 2026-10-01 — Dana — Home voice button becomes the "Voice" pill (Founder)

**Outcome:** Done. Gate: `tsc` 0; eslint (cache cleared) and prettier clean on my files; `jest --ci` 83 suites, 1253 tests, all passing.
- **`voice-fab.tsx`:** the 56pt `Mic` disc is now an extended pill: `AudioLines` (22, `onControl`, stroke 2, absolute) plus "Voice" (`font-poppins-medium text-[15px] text-on-control`, one line, cap 1.2, no `adjustsFontSizeToFit`). It's `h-14 rounded-full px-5 gap-2`, the size of the tab bar's selected pill.
- **Unchanged:** fill/pressed, `shadows.floating`, the dark ring rule, `floatingPlacement="tabBar"`, `hitSlop={4}` (64pt tall to the finger), the label "Add by voice" and both hints.
- **Label hidden from VoiceOver:** the visible "Voice" Text is hidden from VoiceOver, so it isn't read twice.
- **PRO pill:** stays at `-top-1 -right-1` with its surface ring. It ends about 16.6pt down; the label's line box starts at 17.5pt, and its caps at about 22pt at the default size (about 21.7pt at 1.2×). So it clears the word without clipping or leaving the hit slop.
- **`/voice` stays on `Mic`:** its disc and "Start talking" are untouched.
- **Tests:** the lucide mock in `home-voice-fab.test.tsx` now draws a `testID` per icon. A new test asserts `AudioLines` (not `Mic`), "Voice", that "Voice" is hidden from VoiceOver, and the accessibility label.
- **For Tia:** the pill's width (about 115pt) next to the tab bar's own pill, the badge against "Voice" on a real screen, and the dark plum/navy ring.

---

## 2026-10-01 — Dmitri (Development Team Lead) — voice input: lead code review

**Outcome:** Partial. Review written to `.claude/team/dev/voice-input-review-2026-10-01.md`. **Not
approved yet for the Founder's build review:** two blocking defects (B1, B2), both small. I would approve once
they land with fixtures and I've re-read the diffs. No code edited; probes ran only in scratchpad copies.

**Blocking**
- **B1 (Drew + Dana):** a learned alias can turn a real store into another, permanently. Changing an
  exact-matched "Target" to Walmart learns `target → Walmart` (`voice-review.tsx:246-256`). Aliases are
  checked before exact names (`parse.ts:101-104`). Correcting back is a no-op (`aliases.ts:46`), so every
  later "Target" opens as Walmart at high confidence. Proven by probe. Fix: delete the pair on a correction
  back; never learn from an exact match (the parser exposes `merchantSource`).
- **B2 (Drew):** any figure with more than two decimals is rounded and shown as heard (`clean.ts:135`,
  `numbers.ts:292`). "Paid $3.459 at Shell" → $3.46, high confidence, no choice. "$12.345" → $12.35. "twelve
  point nine nine nine" → $13.00. Fix: not money; fixtures.

**Should fix (not blocking)**
- S1 (Dana): a double tap on Done, or on the category grid, on `/voice-edit` sends two global `GO_BACK`s and
  pops the review page too (`voice-edit.tsx:107-118, 348-353`).
- S2 (Diego): `validateVoiceDraft` can settle an unsettled amount when it drops an out-of-range choice
  (`voice-draft.ts:120-124, 161`; probe: $40 or $4T → $40, settled).
- S3 (Drew): "twelve fifty thousand" → $50,000, settled; the adjacent "twelve" is silently dropped
  (`amount.ts:301-306`).
- S4 (Diego): the draft is not cleared after a hand-off save or on sign-out, and hand-off saves never learn.
- Lows: `readTime` accepts ":99" (L1); bill hand-off back goes to the chooser first (L2); double pushes
  (L3); the speech package uses a caret range, so pin `~57.1.0` (L4); example sentences are not tied to
  fixtures in code (L5).

**Gates:**
- G1: `ios/.xcode.env.local` has no `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` (checked keys only),
  so Release builds fail at the Sentry upload.
- G2: the migrations have never run on Postgres. Staging first, then production, before the native build
  ships.
- G3: Tia's device list.

**Verified clean:**
- The save path matches the forms for new items, with `source: 'voice'` on both receipt paths and one row
  per tap.
- `dismissTo('/home')` becomes a POP_TO on `(tabs)` (pops, no replace; I read the router code).
- The mic stops on blur, background and unmount.
- No $0 and no NaN path.
- The optional native module cannot crash a build without it.
- All three routes are Pro-gated, and the server walls `'voice'`.
- The voice routes have no overlays.
- Goldens: `shasum -c` OK, and 43/43 against the **HEAD** forms (via `git archive`) as well as against the
  refactored ones.
- `tsc` 0, eslint 0, prettier clean, full jest 1252/1252 (scratch copy), FAB suites re-run after Dana's
  16:34 pill change.

**Could not verify:** S1 on a device (the second tap might be absorbed during the pop animation); the
migrations on a database; anything audio-related on hardware.

**Open questions:** (1) Interruptions: send the partial words to review (what is built and tested) or
return silently to idle (spec §4.3)? (2) The privacy policy's `updated` date (`privacy.tsx:165`) is still
28 August. (3) Does the Founder's build review use a Release build? If so, G1 must be fixed first.

---

## 2026-10-01 — Diego (Developer, data and backend) — voice review fixes (B1 passthrough, S2, S4, L1, L2)

**Outcome:** Done. Every item from Dmitri's review that the CEO routed to me is fixed and has fixtures, except
learning aliases from the full form, which I left out on purpose (reason below). Nothing committed, no database touched.

**What changed**
- **B1 passthrough** (`src/lib/voice-draft.ts`). `validateVoiceDraft` carries Drew's
  `VoiceMerchantSource` (imported from `@/lib/voice`, where it landed during this work). It accepts the four values
  only, gives null when there is no merchant, and gives null for anything unknown, so an unknown source is never
  treated as safe to learn from. A hand change to the merchant lands on `entry` while
  `draft.merchant/merchantHeard/merchantSource` stay the parse's own. `rederiveVoiceEntry` keeps those three
  together: from the re-parse when the merchant was untouched, from the original parse when it was changed by
  hand. Dana reads `session.draft.merchantSource` together with `touched`/`edited`.
- **S2.** If the parser offered amount choices and any of them fails validation (or fewer than 2 remain),
  the amount is null and stays missing. Surviving choices (2 or more) are still offered. Fixtures:
  `$40 / $4T` → unsettled; one of three dropped → amount null, two choices left; and a property check through the
  real parser ("unsettled stays unsettled"). A mutation check (fix disabled) failed both.
- **S4.** Each form's `leave()` on a `from=voice` save now does `dismissTo('/home')` and then `clearVoiceDraft()`.
  `signOut()` and `deleteAccount()` (after a verified deletion) clear the draft too, best-effort, even when the
  session can't be read. **Learning from the full form: left out.** `useLearnVoiceAlias` needs a QueryClient,
  and the golden tests render the forms without one. A hook-free write would pull AsyncStorage and the real
  Supabase client into the forms' module graph. Either route would make me edit the goldens, and it's only
  safe after Drew's B1 "correcting back deletes the pair" fix. The evidence can come from the slot
  (`readVoiceDraft`), so no words need to go into params, which makes this a small follow-up once the goldens may change.
- **L1** (`src/lib/voice/amount.ts`, Drew's file, a one-line Edit on the CEO's assignment). `readTime` rejects hours
  above 23 and minutes above 59. The fixture is in a new file, `src/lib/voice/clock-amount.test.ts`, so it can't
  collide with Drew's `parse.test.ts`: 99:99, 12:60 and 24:30 give no amount; 12:50, 1:00 and 23:59 still give both
  readings. Drew edited `amount.ts` afterwards and my line survived.
- **L2** (`add-bill.tsx`). With `from=voice` and a prefilled category, back from the amount step is `router.back()`
  (to the review page). Without `from`, it still steps to the chooser.
- Tests: voice-draft 67 (+8), add-forms-from-voice 19 (+7), auth 15 (+1 and draft assertions), clock-amount 5.

**Gate:** golden sha256 `shasum -c` OK on all three files. `npx jest --ci`, whole suite: **84/84 suites,
1319/1319**. eslint (cache cleared) on my files: 0 errors (the same 13 test-file warnings). prettier --check:
clean, including `amount.ts`. `tsc`: none of the errors are in my files. The remaining ones are in other agents' in-progress
tests: `voice-review-extra.test.tsx:115` (fixture missing `merchantSource` since Drew's type landed) and
`voice-review.test.tsx:367` (`brandId: null` against the test's own helper type). An earlier syntax error in
`voice-review.test.tsx` was hiding every semantic error, so I typechecked through a scratch tsconfig that excluded it.

---

## 2026-10-01 — Drew (Developer, money maths) — review fixes B1, B2, S3, L5 (Dmitri's review)

**Outcome:** Done. No commits.

- **B1, `merchantSource`** on `VoiceDraft` (type `VoiceMerchantSource`, exported): `learned` (through
  `ctx.aliases`), `catalog` (exact catalog name or alias), `fuzzy` (near miss of a catalog name, 2–3 words),
  `heard` (no brand; the words after "at"/"from"), null iff `merchant` is null. The parser itself now keeps
  catalog names: learned and catalog matches over the same words → the longer span wins, a tie goes to the
  catalog (`preferCatalog`). So a stale `target → Walmart` pair can no longer hijack Target, while a longer
  learned phrase ("target optical" → Target Optical) still applies. `pickMerchant` now ranks catalog >
  learned > fuzzy > heard. `learnAlias`: correcting back to the heard words (normalised like the parser's
  text) removes the pair. Same array back if there was nothing to remove. A spelling-only correction
  ("joes diner" → "Joe's Diner") is learned. Caller rule documented: never learn when `merchantSource` is
  `catalog`. My old test "star bucks → Starbucks is a no-op" changed to "is learned" (spacing is not "the
  same words" any more); it can't happen through the caller rule anyway (that's a catalog match).
- **B2:** a figure with a non-zero digit past the cent (after any scale) is never an amount: dropped with its
  unit. "$3.459 at Shell" / "$12.345" / "1.005" / "twelve point nine nine nine" → no amount;
  "$3.459 a gallon, $45.20 total at Shell" → $45.20. "$3.450", "$1.2345k" ($1,234.50) stay. Fixed a latent
  bug found on the way: "1.2345 thousand" multiplied the already-rounded cents ($1,230.00), now $1,234.50.
- **S3:** a bare 1–99 straight before a marked figure ("twelve fifty thousand", "twelve $50") → neither
  offered → amount null, `missing` has amount.
- **L1** was already done by Diego in `amount.ts` `readTime` (+ his `clock-amount.test.ts`) on the CEO's
  assignment; left as is.
- **L5:** the nine sentences moved verbatim to `src/data/voice-examples.ts` (pure data + `sentenceText`;
  verified line-identical to Dana's). `example-card.tsx` imports it, maps icons by id, re-exports for
  `voice.tsx` (untouched); render code unchanged. `catalog.test.ts` iterates the module: the page's set must
  equal the pinned set, each must read back exactly, the brand shown must be a bold word, and the amount must
  be the one bold figure that reads as money. Mutation check: putting "Amazon Prime $139 a year" back → 2
  failures.

**Checks:** `npx tsc --noEmit` 0 errors; `rm -rf .expo/cache/eslint && npx eslint src/lib/voice
src/data/voice-examples.ts src/components/voice/example-card.tsx` clean; prettier clean; full `npx jest --ci`
84/84 suites, 1319/1319 tests (parse 246, catalog 55, aliases 14, voice screen 15, voice-draft 67).

### 2026-10-01 — Dana — Dmitri's review: B1 (review side), S1, L3

**Outcome:** Done. Gate: `tsc --noEmit` 0 errors repo-wide; eslint (cache cleared) and prettier clean on my files; `jest --ci` 84 suites, 1319 tests, all passing.
- **B1, `voice-review.tsx`:** after a save, the page teaches a correction only through `lessonFrom(draft, entry, touched)`.
  - Never when `draft.merchantSource` is `'catalog'` or null.
  - For `'fuzzy'`, `'heard'` and `'learned'`, only when the merchant was touched and the saved name differs from the parsed one.
  - A learned name changed back to the person's own words is taught too, which is how Drew's `learnAlias` removes the pair.
  - Tests cover catalog (no), fuzzy (yes), heard (yes), learned-changed-back (yes), unchanged name (no) and untouched merchant (no).
- **S1, `voice-edit.tsx`:** `useCommit` holds a `left` ref. After the first leave, nothing writes or pops again. The back chevron (`EditShell onBack`) goes through the same `leave()`, because `router.back()` is a global GO_BACK. Tests: double Done, two quick category taps (the first wins), double back.
- **L3, review page:** a `moving` ref, reset by `useFocusEffect`, wraps the rows, "More options", back, "Say it again" and ✕. Tests: a double tap pushes once, and it opens again after re-focus; a double back goes back once.
- **L3, `voice-fab.tsx`:** the same guard, reset on Home's focus. `tap()` now fires inside the guarded handler (a ref-reading handler can't go through `withTap` in render), so a swallowed tap gives no haptic. Test: double tap pushes once, and it opens again after re-focus.
- **Theo's `voice-review-extra.test.tsx`, two edits:**
  - The fixture gains `merchantSource: 'catalog'` (now required).
  - Its `expo-router` mock gains a `useFocusEffect` stub. Without it all 10 money checks crash on the page's new focus reset.

---

## 2026-10-01 — Dmitri (Development Team Lead) — voice input: re-review of the fixes

**Outcome:** **Approved for the Founder's build review.** All first-pass findings (B1, B2, S1–S4, L1–L5)
are fixed and verified. Two non-code conditions carry over:
- **G1:** `ios/.xcode.env.local` still lacks the Sentry keys. Restore them before any Release or TestFlight
  build.
- **G2:** the migrations have still never run on any database. Deploy them before the native build ships.

The re-review section is appended to `.claude/team/dev/voice-input-review-2026-10-01.md`. No code edited;
probes ran only in scratchpad snapshots.

**How I checked:**
- Diffed every changed file against my 16:25 snapshot.
- Re-ran my probes on a 16:54 snapshot of the live tree, confirmed unchanged at 16:58:
  - Target→Walmart: the parse is `catalog`; changing it and saving through the real review page makes 0
    `learnAlias` calls; a stale pair no longer overrides Target; correcting back → `[]`.
  - `$3.459`, `$12.345`, `1.005` and "twelve point nine nine nine" give no amount; "$3.459 a gallon, $45.20
    total" gives $45.20.
  - "twelve fifty thousand" gives null.
  - "$40 / $4T" gives null with `missing: amount`.
  - Double Done, double Back and two category taps each pop once. The same probe fails 4/4 on the pre-fix
    code.
  - Row, More options, Back and Save double taps → one move each.
- Theo's `voice-review-extra.test.tsx`: exactly two hunks (the `useFocusEffect` stub and
  `merchantSource: 'catalog'`); assertions byte-identical.
- Goldens: `shasum -c` OK, byte-identical to the copies run 43/43 against the HEAD forms.
- Real tree: `tsc` 0, eslint 0, prettier clean, jest 84/84 suites, 1319/1319.

**New (non-blocking):**
- **N1 (Drew):** a card or wallet brand said as the payment method wins over the store. "paid $20 at spot a
  fly on my Amex" → American Express. This was already true for typed stores before the fix; B1's re-rank
  extends it to learned ones. It's visible on review, not money, and cannot teach a bad alias.
- N2: accepted by design.
- N3: low, not filed.

**Open:**
1. Is the Founder's build a Release build? If so, G1 first.
2. The privacy policy `updated` date is still 28 August.
3. Pia should update spec §4.3 to match the CEO's interruption decision.

---

## 2026-10-01 — Drew (Developer, money maths) — N1: a payment card or wallet is never the merchant

**Outcome:** Done. No commits.

**Rule (`isPaymentMethod` in `src/lib/voice/merchant.ts`, applied in `parse.ts` after all merchant passes,
before corrections):** a matched brand is how the person paid, not who they paid, when
(a) it is followed by "pay" ("Apple Pay", "Google Pay"), or
(b) payment words lead into it (with / using / via / through / by / on, "my"/"the" allowed between) AND it is
a bank or card issuer (`finance`) or a card word follows it (card, credit, debit, visa, mastercard, account,
checking, savings).
Such a span keeps its words claimed but is never the merchant, even when it is the only brand heard:
"$20 on my Amex" → merchant null, `missing: ['merchant']`, so the person fills in the store.
Payment words alone are not enough. "insurance with GEICO", "subscription with Netflix", "paid 300 to Chase",
"Chase card payment 300 due on the 25th" and "amex 300 due on the 15th" keep their company as the merchant.

**Fixtures:** 15 rows in `parse.test.ts` (`PAID_WITH`: the four review examples with learned and fuzzy
Spotify, Joe's Diner on my Amex, Apple Store with my Visa / with Apple Pay → Apple catalog, card/wallet
alone → null, and the five not-a-payment cases), 8 in `catalog.test.ts` against the real catalog.
American Express and Google added to the fixture directory, as in the catalog. With the filter disabled,
10 of them fail. B1 holds: learned and fuzzy Spotify still win over the card, and no existing row changed.

**Checks:** tsc 0 errors; eslint (cache cleared) clean; prettier clean; full `npx jest --ci` 84/84 suites,
1342/1342 tests.

### 2026-10-01 — Dana — Tia's QA: Voice pill gap, dev sentence autocorrect

**Outcome:** Done. Gate: `tsc` 0; eslint (cache cleared) and prettier clean on my files; `jest --ci` 84 suites, 1342 tests, all passing. `speech.ts` untouched.
- **Gap, measured not assumed:** I read the iPhone 17 Pro screenshots pixel by pixel (1206px wide, 3×).
  - On the bar's straight top edge the pill-to-bar clear space was **10.33pt**, not 17: in 01/24/25/26 (light) and from the box edge in 02/03/04 (dark). Screenshot 00 still shows the old disc.
  - The flat edge was taken at x=900–1000. Further right, the bar's rounded end and the dev client's floating gear push the edge down by 15–50pt, which may be where 17 came from.
- **Cause:** NativeWind's native rem is 14 (no override in the repo). So `bottom-1` = 3.5pt, the bar's `pt-2` band = 7pt, `right-4` = `px-4` = 14pt, and `h-14` = 49pt (measured 48.7).
- **Fix:** `src/components/ui/screen.tsx` 'tabBar' is now `bottom-[5px] right-4`, giving 5 + 7 = 12pt; the comment explains why. That lifts the pill 1.5pt rather than lowering it 5pt. 'page' is unchanged.
- **Right edge:** both the pill and the bar measure 14pt from their screen edges, so the right edge stays flush.
- **Hit target:** the 49pt pill plus `hitSlop={4}` is 57pt, so it's still ≥56.
- **Dev test sentence:** `autoCorrect={false}` and `autoCapitalize="none"`. `TextField` doesn't pass `spellCheck`, but on iOS it follows `autoCorrect`, so there was no shared-file change. The test asserts both props.
- **Seen, not changed:** in light mode the pill's `shadows.floating` is cut flat at the Home scene's bottom edge, a hard line just under the pill. It's for Pia/Tia to judge.

## 2026-10-01 — Dilip (Developer, native and platform) — voice: the first-start Simulator crash (Tia)

**Outcome:** Root cause found, and it is the Mac, not the app. JS-only guard added in `src/lib/speech.ts`;
no native change, no prebuild, no rebuild. Nothing committed.

**Root cause (evidence):** the macOS unified log shows `coreaudiod` asking TCC for the microphone on behalf of
`com.apple.CoreSimulator.SimulatorTrampoline`. macOS showed "Simulator would like to access the microphone"
(`AUTHREQ_PROMPTING`, msgID 230.188) at 16:44:15.129. The app aborted at 16:44:24.3, and the prompt was
answered Allow (`authValue=2`) only at 16:45:01.564. In the .ips, thread 15 is blocked in
`HALC_ShellDevice::CreateIOProcID` → mach_msg to coreaudiod. Thread 14 (the in-process `AURemoteIO_server`) waits on
the AQIONodeManager lock, and the crashing thread (`inputNode` → `AURemoteIO::Initialize`) hits the RPC timeout → `abort()`.
It only happens while that macOS prompt is unanswered, which is why the relaunch did not crash.
- Volume metering is not involved: it is installed after `inputNode` (line 350) and is the same engine, not a second one.
- Session activation had already succeeded, and the library never checks `isInputAvailable`, but that would read
  `true` on the Simulator anyway. Fixes a/b/c from the brief could not have prevented it.
- 27 public GitHub reports of `_ReportRPCTimeout`; the readable recent ones (incl. another expo-speech-recognition
  app, orca, Cue on Xcode Cloud) are all Simulator or CI virtual Mac.

**Measured (host prompt now answered):** baseline 0/10 cold-start crashes, metering off 0/10, using a CDP harness that
calls the native module with the wrapper's exact options. The original trigger cannot be re-run without resetting
macOS privacy, which I did not do.

**Fix:** `start()` returns `unavailable` on the Simulator (`Device.isDevice` false, verified in-app) before any
permission or audio call, unless `EXPO_PUBLIC_SIMULATOR_VOICE=1`. Public API unchanged. 3 tests (mutation-checked).
Gates: eslint clean, tsc clean, full jest 1345/1345.

**Also found:** on this Simulator (Intel Mac, iOS 26.5), recognition never emits `start`/`result`/`end`;
`recognitionTask` appears to block the library's actor. The wrapper's 15s cap + 4s settle end it as "nothing heard".
The library's route-change restart touches `inputNode` a second time.

### 2026-10-01 — Dana — /voice redesign: "Record a transaction", hold to talk (Founder)

**Outcome:** Done, against Dilip's landed API (`continuous`, `permissionGranted`, `requestPermission`). Gate: `tsc` 0; eslint (cache cleared) and prettier clean on my files; `jest --ci` 85 suites, 1365 tests, all passing.

**Built**
- **Page layout:** `Screen showBack` with the left-aligned "Record a transaction", then a flexible live-text area. Idle shows nothing. Holding shows "Listening…" and then the live words (24px medium ink, newest ~140 chars kept). After release the words stay with a spinner.
- **Short lines for the other states:** nothing heard or quick tap, first grant, denied (plus an Open Settings pill), unavailable (plus "Add it by hand" pills), and error (`FAILURE_MESSAGE`).
- **Pinned footer:** `VoiceHints` (new), a 2×2 grid of the four hints from `src/data/voice-examples.ts`. Below it `MicButton` (new): 92pt (`h-[92px]`, since NativeWind's rem is 14), Mic 36, `shadows.floating`, and the dark hairline-ring rule. It grows to 1.06× while held, with a level-driven ring (Reanimated, reduce-motion respected). The caption reads "Hold to talk" / "Release when you’re done".
- **Interaction:** `continuous: true`. Press-in either asks for permission (and starts nothing) or fires `toggle()` and `start()`. Release calls `stop()`; a release before the mic is live shows "Hold the button while you talk." Final words are parsed, the draft is stored, and review is pushed once.
  - The 15s cap or a call while still held is treated as a release.
  - A mic that opens after release is cancelled.
  - `cancel()` runs on blur and on background; `refreshPermission()` runs on 'active' while denied. Nothing ever starts the mic automatically.
- **VoiceOver:** a double-tap toggles. It says "Listening" before the mic opens and "Stopped" after. The label is "Record" and the hint follows the state.
- **Dev field:** the `__DEV__` test sentence is kept.
- **Data module:** `src/data/voice-examples.ts` is reduced to the four hints, as a flat list of `{ kind, parts }` with the bold parts kept. `catalog.test.ts` builds SHOWN from it, the five dropped rows are removed from PINNED, and the count is 4. No other parser test was touched.
- **"Say it again":** now `dismissTo('/voice')`, which lands idle. `listen-again.ts` is deleted, along with `listening-card.tsx` and `example-card.tsx`; nothing else used them.
- **Tests:** `voice.test.tsx` is rewritten (15 tests). `voice-review.test.tsx` has two new "Say it again" tests.

**Doesn't quite fit the brief**
- The dev field sits at the foot of the scrolling area, not under the hints in the pinned footer, so the keyboard can scroll it into view.
- Hints are hidden by fading out (and hidden from VoiceOver), not removed, so the mic doesn't jump under a held thumb.
- In VoiceOver mode the hold wording would be wrong, so the caption reads "Tap to talk" / "Tap when you’re done" and the nothing-heard line reads "Skip didn’t hear anything. Double-tap Record, then talk."
- VoiceOver also hears each outcome once (nothing heard, all set, denied, unavailable, failure), because there is no other feedback.
- The Pro explainer is still titled "Just say it" (Founder-approved copy), while the page is now "Record a transaction".

## 2026-10-01 — Dilip (Developer, native and platform) — speech wrapper for hold-to-talk

**Outcome:** Done. `src/lib/speech.ts` + test only, JS only; no prebuild, no native build, nothing committed.

**Final API (additive to the brief's contract):**
`useSpeechCapture({ contextualStrings, continuous?: boolean })` →
`{ status, interim, alternatives, onDevice, level, permissionGranted: boolean | null, start, stop, cancel, refreshPermission, requestPermission: () => Promise<boolean> }`.
- **`continuous: true`** passes through to the engine. iOS 18 splits the sentence into segments at each pause, marks each
  final, and sends later words alone with a leading space. The wrapper joins segments (best combinations first, at most 3)
  and settles only on `end`, after stop, the 15s cap or an error. `nomatch` mid-session is ignored. A segment that
  repeats earlier words replaces them rather than doubling them. Earlier iOS sends cumulative text; handled too.
  Default `false` is unchanged.
- **`start()` never prompts now** (simplified; the only caller, Dana's page, already calls `requestPermission()` first).
  Without permission → `denied` with `permissionGranted: false`; no module or the Simulator → `unavailable`.
- **Quick tap:** a `stop()`/`cancel()` before the engine's `start` event ends at once in `idle` with nothing, and no
  report. Before the native start, the engine is never started. After it, the abort is sent when `start` arrives,
  because an earlier abort can be overtaken by the queued start and leave the mic on. The settle timer covers an
  engine that never opens.
- **`requestPermission()`:** reads, prompts only if iOS can ask (`asking` meanwhile), resolves granted, never listens,
  never throws. Outside a session it sets `idle`/`denied` (`unavailable` with no module). `permissionGranted` is read on
  mount and updated by refresh/request/start and by an engine `not-allowed`.
- **Kept:** Simulator guard, quiet interruptions, audio restore, 100-phrase cap, `level`.

**Gates:** 65/65 speech tests (four mutations of the new logic each caught). eslint, prettier and tsc clean.
Full jest 1365/1365.
**Not verified on a phone:** iOS 18 segment behaviour is from the library's code comments and source, not a device run.

### 2026-10-01 — Dana — /voice: centred title, 20% placeholder, three quiet hints, "more than one"

**Outcome:** Done. Gate:
- eslint (cache cleared) and prettier clean on my files.
- `jest --ci` 85 suites, 1398 tests, all passing.
- `tsc`: 2 errors, both type-only and in Diego's test fixtures. Drew's newly required `VoiceDraft.multiple` is missing from `add-forms-from-voice.test.tsx:222` and `src/api/auth.test.ts:21`; `multiple: false` fixes each. Left for Diego (his files). They don't affect the app bundle.

**Changes**
- **Title:** "Record a transaction" is centred (`Title` default).
- **Speech area:** with no words (idle, or held before the first word) it shows "Listening…" in the words' own 24px Poppins Medium at `text-ink/20` (theme variable with alpha, so both modes), hidden from VoiceOver. The first word replaces it in full ink. Status lines still replace it, and the spinner stays after release.
  - The area is now centred to match the title and hints.
  - Live words appear only once this hold's mic is live. Before, the hook's last-session `interim` could flash at the start of the next hold.
- **Hints:** `voice-hints.tsx` is now plain text, with no cards: a centred stack, `text-[15px] text-ink/40`, `gap-2.5`, not tappable. It still fades while held, keeping its space.
- **Three hints:** Starbucks / Electric bill / Netflix; Rent is dropped. `src/data/voice-examples.ts` and `catalog.test.ts` PINNED are updated, count = 3.
- **More than one:** when `parseVoice(...)` says `multiple`, nothing is parked or pushed. The heard words stay in full ink, with "Looks like more than one. Add them one at a time." under them, one `warn()`, and a single VoiceOver announcement. The hints come back and the mic is ready; the next hold clears it all. Now that Drew's field has landed, I read `draft.multiple` directly.
- **Fixtures:** `multiple: false` added to mine and to Theo's `voice-review-extra.test.tsx`.
- **Tests:** the placeholder (present with no words, gone once words arrive), the centred title, 3 hints at 40%, and multiple-vs-single.

---

## 2026-10-01 — Drew (Developer, money maths) — `VoiceDraft.multiple` (several transactions in one sentence)

**Outcome:** Done in my files; tsc is 2 one-liners short in files I may not touch (below). No commits.

**Rule, as built (`src/lib/voice/multiple.ts`, `describesSeveral`; runs after corrections and the
payment-method filter):** count the amounts that stand on their own, leaving out add-ons ("plus $5", "$5
tip", "$1.60 tax", "50 late fee", "$10 off"), unit prices ("$3.45 a gallon", "$20 each", "$150 a night") and
counts ("3 coffees", "300 megabits"). With two or more such amounts, `multiple` is true when (1) two or more
different merchants survive, or (2) two or more different bill categories, or (3) a merchant and a bill word of
different kinds (subscription/receipt brand, or a name heard after "at", alongside a bill word). Otherwise
false: one merchant or one bill with two figures (amount choices ask), corrections, a payment card,
"twelve fifty", dates and cycles. Same-category pairs ("water and sewer 60 and 40", "electric 85 and gas
40") deliberately read as one: conservative. Other draft fields are unchanged when `multiple` is true and
describe the first thing heard; the page must not save them.

**Files:** new `src/lib/voice/multiple.ts`; `types.ts` (required `multiple: boolean`), `parse.ts` (set on
every draft; false on empty); `parse.test.ts`: 11 several + 19 single rows (single ones also pin amount,
choices, merchant) + an empty case + an invariant that every main-table row is a boolean `false`. No existing
row read as multiple. With the rule forced off, the 11 several rows fail.
Diego's `src/lib/voice-draft.ts`: one line, `multiple: raw.multiple === true` in `validateVoiceDraft`;
`voice-draft.test.ts`: `multiple: false` in the `draft()` helper (needed for the required field) + one test
(true passes, anything but exactly `true` → false).

**Checks:** eslint (cache cleared) and prettier clean; full `npx jest --ci` 85/85 suites, 1398/1398.
`npx tsc --noEmit`: 2 errors, both TS2741 "multiple missing" in VoiceDraft literals in files outside my
permission: `src/__tests__/app/add-forms-from-voice.test.tsx:222` and `src/api/auth.test.ts:21` (each needs
`multiple: false,`). Three others with the same gap (`voice-edit`, `voice-review`, `voice-review-extra`
tests) were fixed by their owners while I worked.

**Follow-up (same day):** the two remaining tsc errors are closed. Diego added `multiple: false` to both
fixtures (`add-forms-from-voice.test.tsx`, `auth.test.ts`) at the moment I added mine, which made duplicate
keys. I removed only my lines, so my net change to those files is nil. `npx tsc --noEmit` 0 errors repo-wide;
eslint 0 errors (2 existing `require()` warnings in add-forms-from-voice.test.tsx); prettier clean; full
`npx jest --ci` 85/85 suites, 1398/1398.

---

## 2026-10-01 — Drew (Developer, money maths) — unit prices left out of the amount pick (Founder-approved)

**Outcome:** Done. No commits. Ready for the phone build.

**Rule:** `isUnitPrice` (now in `src/lib/voice/amount.ts`, the one definition; `multiple.ts` imports it) — a
figure followed by each / apiece / ea, or by a / an / per + a unit (gallon, litre, pound, lb, kg, oz, hour,
night, day, item, piece, unit, pack, box, ticket, person, head). `chooseAmount` drops unit prices first; the
existing rules (marked beats bare, counts drop out) run on what is left.
- Beside a total: the total settles. "$3.45 a gallon, $45.20 total at Shell" → $45.20, no choices, Shell,
  high. Same reversed, "$12 each for 3 tickets, $36 total" → $36, "$4 a pound, $10.40 at Whole Foods" →
  $10.40, "hotel $150 per night, $450 total" → $450.
- **Alone (my call): no amount.** "$3.45 a gallon at Shell" → amount null, `missing: ['amount']`, low.
  One figure cannot be "offered but unsettled" (`amountChoices` needs two or more, and `validateVoiceDraft`
  recomputes `missing`, so a lone amount would come out settled), and a per-gallon price is not what was
  paid. Before this, that sentence settled $3.45 at high confidence.
- Over two decimals still never an amount: "$3.459 a gallon, $45.20 total" → $45.20.
- Tips/tax unchanged (Founder's call): "$40 plus $5 tip at Olive Garden" still $40 with choices [5, 40].

**Fixtures:** 10 rows (`UNIT_PRICES` in `parse.test.ts`). With the filter disabled, 8 fail (the
over-two-decimals and tip rows pass either way, as they should). **One existing row changed, as intended:** the
"several transactions" block row "$3.45 a gallon, $45.20 total at Shell", which I added in the previous task
to record the old pick ($3.45, choices [3.45, 45.2]), now reads $45.20 settled, which is exactly this change.
No main-table row changed.

**Checks:** `npx tsc --noEmit` 0 errors; eslint (cache cleared) clean; prettier clean; full `npx jest --ci`
85/85 suites, 1408/1408 tests.

---

## 2026-10-06 — Diego (Developer, data and backend) — Phase 7 C1 (profile reads name the signed-in row) and C2 (detach Splits from layout, realtime, push)

**Outcome:** Done, in the remove-splits worktree only. Nothing committed. C1 and C2 touch disjoint files and
each is green on its own against a pristine b4cb0a1 copy: C1 = tsc 0, 92/1461, eslint 19 (= baseline);
C1+C2 = tsc 0, 93/1465, eslint 19 (= baseline). Typed routes were present for every tsc run.

**C1:** `src/api/queries.ts` `useProfile` and `src/api/reminders.ts` `useReceiptReminder` add
`.eq('id', userId!)` before `.maybeSingle()`, because the profiles select policy also returns friends' and
groupmates' rows. `src/api/reminders.test.tsx`: `eq` added to the select builder. NEW
`src/api/own-profile.test.tsx` (2 tests; its mock answers like PostgREST: two visible rows, `eq` filters, an
unknown column → 42703, more than one row left → PGRST116). Red first, on unfixed code: both failed with PGRST116
(useProfile error `{"code":"PGRST116",…}`; useReceiptReminder `isError: true, enabled: false, remindAt: "20:00"`).
Green after the fix. Audit (`grep -rn -A6 "from('profiles')" src`): every non-Splits read and write now names
the row. The only other reads without an owner filter are splits.ts's three `.in('id', …)` reads of other
people's profiles (deleted in C6). The only other read of a widened table was realtime's `group_members` (gone in C2).

**C2:** `_layout.tsx` drops FriendRequestPopup (it had no side effects beyond its modal).
`realtime-provider.tsx` keeps only the `skip:<userId>` channel (L2-64 byte-identical to b4cb0a1) and returns
`<>{children}</>`. `push.ts` drops the `/splits` allow-list entry. `push.test.ts`: refusal row + Splits tap/Open
Splits test (+2). NEW `src/providers/realtime-provider.test.tsx` (+2). Mutation-proved on a scratch copy:
b4cb0a1's provider, group channel only, and `user:` channel only all fail the suite, and `/splits` back on the
allow-list fails both new push tests. The invalidated keys (groups, group-*, friends, friend-requests) have no
reader outside the Splits files, except Insights' useMyBalances (`group-balances`), which C3 removes.

**Not verified:** `expo export` (left to the CEO at C6); runtime on a simulator (Tia).

---

## 2026-10-06 — Drew (Developer, money maths) — Phase 7 C3 (Insights net worth = savings less card debt) and C4 (a $0.00 headline is not red)

**Outcome:** Done in the remove-splits worktree only, nothing committed. C4 was proven (the fixture failed on the
C3 code) and fixed. Final state: tsc 0; full jest 97/1477 green (baseline worker-leak warning only); eslint src
19 findings = baseline, none new; prettier clean on the three files.

**C3:** `src/app/insights.tsx` drops useMyBalances, splitPosition, the friends StandRow and the "Shared with
others" section (the Row that pushed `/splits`); `worth = savedTotal - owedOnCards`; isError/retry lose the groups
query. `src/data/pro-features.ts`: the insights "Where you stand, honestly" sentence loses "plus what friends owe
you" (prettier joins it onto the `detail:` line, so the diff is 2 lines → 1). `src/__tests__/app/insights.test.tsx`
(3 → 6): drops the `@/api/splits` mock; adds the to-the-cent fixture ($3,300.00 put aside − $1,234.63 owed =
$2,065.37, each figure pinned beside its own label, card A's walked balance 1,234.56 beating its typed 1,200.00,
card B unwalked at 0.07), a no-friends/no-groups check (text and accessibility labels), and a failure-page test
that fails each of the 7 remaining sources in turn and checks "Try again" refetches all 7. Fixture balances are
positive because a card balance is debt (`card-ledger.ts` L381); the plan's negative values only passed through
Math.abs.

**C4 (proven):** on the C3 code the headline drew `$0.00` in money-out red (saved 0.30 less cards 0.10 + 0.20 →
worth -5.55e-17). Fix: `toCents(worth) < 0` (import from `@/lib/money`), the same sign rule as formatCurrency.
The test also renders one cent more of debt and requires `-$0.01` red, so a never-red rule fails. Test 6 → 7.

**Mutation proof (scratchpad copies only, redirected by a jest moduleNameMapper):** b4cb0a1's page fails the
friends test; dropping `cards.isError` / `balancesError` / `cards.refetch()` fails the failure-page test; using the
typed card balance or subtracting card debt twice fails the to-the-cent test; the unfixed C3 page and a never-red
page fail the C4 test.

**Raised, not changed:** Insights takes `Math.abs` of each card balance, so a card in credit (negative balance,
"In credit" on its face) is counted as debt on the headline and in "What you owe". Needs a Founder ruling.

---

## 2026-10-06 — Diego (Developer, data and backend) — Phase 7 C6: wall.ts and the useRemove comment

**Outcome:** Done in the remove-splits worktree only, nothing committed. Both edits are comment/constant only;
my two files are clean on tsc, eslint (`--no-cache`, exit 0) and prettier; `jest src/lib src/api` 39/39 suites,
1040/1040 tests. The one tsc error in the tree (`bill-icons.test.ts` L15, deleted `@/data/group-icons`) is
Theo's in-flight file.

**`src/lib/wall.ts` (plan item 23):** the doc block ends at "switches off."; the sentence on splitting and
`FREE_LIMITS.openGroups` is gone, as is the `openGroups` key and its comment. `FREE_LIMITS` keeps `cards`,
`bankAccounts`, `incomeSources`, `as const`. Proof: before Dana's deletions the only reader was
`add-group.tsx` L29; after them `openGroups` has 0 hits repo-wide (src, supabase, tests, scripts, design) and
`FREE_LIMITS` has no reader in `src` (decision 6). No test pins `WALL` or `FREE_LIMITS`.

**`src/api/mutations.ts` (plan item 27):** the useRemove doc now says no screen reaches an RLS-refused delete
"since every table the app deletes from shows each person only their own rows". Worded slightly differently from
the plan ("holds only"), which is literally false: the tables hold every account's rows; RLS shows each
person theirs. Checked in the migrations: cards, bank_accounts, bills, salary_sources, receipts,
subscriptions, payments (`*_all_own`), salary_source_accounts (via its own salary source), reminders and
device_tokens (`*_own` select/delete) are owner-only, and no later migration (Splits ones included) touches
their policies. `NOTHING_UPDATED` still has readers: `mutations.ts` L91 and `mutations.test.tsx`.

**Sweep of src/api, src/lib, src/providers:** every split/friend/group/settle/invite hit is either unrelated
(`.split()` calls, speech/voice "settle", `settleWithin`, `groupByDate`, loan maths "splits every payment",
receipt `SPLIT_COLUMNS`, Sentry "group") or deliberate and still true (C1's "friends' and groupmates' rows"
comments in `queries.ts` L128 / `reminders.ts` L293 and `own-profile.test.tsx`, because the server policy is unchanged;
C2's `push.test.ts` and `realtime-provider.test.tsx` refusal cases). Raised, not changed: `wall.ts` L7 still
lists "settling" as a wind-down verb; outside the deleted files no screen settles anything.

---

## 2026-10-06 — Dana (Developer, UI and navigation) — Phase 7 C6: delete the 17 Splits files; pro-features, artwork, glyphs

**Outcome:** Done in the remove-splits worktree only, nothing committed or staged (deleted with plain `rm`). My
three edited files are clean on tsc, eslint (`--no-cache`) and prettier. The only red left in the tree is Theo's
in-flight `bill-icons.test.ts` L15 (its `@/data/group-icons` import).

**Proof before deleting:** the plan's module greps (`@/api/splits'`, `@/lib/split'`, `@/data/group-icons'`,
`@/components/splits/`, plus relative imports and any-quote jest.mock/require) found importers only inside the
delete set, plus `bill-icons.test.ts` L15. All 47 exports of the non-route files were checked with `grep -rlw`:
the only outside hits were `Person` (fixture text 'A Person' in add-card/cards tests: false positive) and
`groupIconFor` (bill-icons.test, Theo's). Nothing outside `src` refers to the files. 17 files, 3,525 lines.

**Deleted:** `src/app/{splits,split-group,add-group,add-member,group-settings,settle-up,friends,add-expense}.tsx`,
`src/components/splits/{friend-request-popup,group-icon-picker,group-icon,person}.tsx` (the directory is gone),
`src/api/splits.ts`, `src/api/splits.test.tsx`, `src/lib/split.ts`, `src/lib/split.test.ts`, `src/data/group-icons.ts`.

**Edited:** `src/data/pro-features.ts`: the `splits` entry is gone; a stale `/pro-feature?id=splits` falls back to
`PRO_FEATURES.unlimited` (`pro-feature.tsx` L19): emptyWallet art, "All your credit cards. All your accounts.".
`src/theme/artwork.ts`: `TileSplitCalculator` import and the `tileSplitCalculator` key are gone (0 hits in src);
the SVG stays on disk for the design kit. `src/data/glyphs.ts`: the two comments no longer mention groups.

**Checks:** typed routes regenerated in the worktree (`expo customize tsconfig.json`; no tracked file changed);
the 8 removed routes appear 0 times in `router.d.ts`; tsc: one error, bill-icons.test.ts L15. Full jest: 94/95
suites, 1420 tests pass; the failing suite is bill-icons (fails to load). ESLint src: 20 = baseline 19 +
bill-icons L15 `import/no-unresolved`. Section 10: G2 and G5 empty; G1/G3 only bill-icons.test; G4 hits
`src/__tests__/app/insights.test.tsx` L209, Drew's negative assertion (`queryAllByText(/shared with
others|settled up/i)` must be empty). Correct, but the plan's "must print nothing" needs an exception for it.

**Not verified:** `expo export` and the simulator walk (CEO/Tia, after Theo finishes).

---

## 2026-10-06 — Diego (Developer, data and backend) — Skip Logos: per-row logo columns, client, push thumbnails

**Outcome:** Done in the logo-service worktree only. Nothing committed, staged or applied to any database.
The contract Dana builds against is exactly as briefed (additive extras only, listed below). tsc 0
repo-wide; full jest 104/104 suites, 1625/1625; eslint `--no-cache` clean on my files except the
pre-existing `jsr:` import/no-unresolved in send-push/index.ts (HEAD has it too); prettier clean.

**Migration** `supabase/migrations/20261006100001_logo_overrides.sql` (written, NOT applied):
`logo_domain text` + `logo_hidden boolean not null default false` on receipts, subscriptions, bills, with
column comments; plus a check constraint per table (`<table>_logo_domain_check`: null, or a bare host
name ≤253 chars, case-insensitive `^[a-z0-9-]+(\.[a-z0-9-]+)+$`). Proved on in-memory PGlite (scratchpad,
no real database): runs twice clean, existing rows read null/false, 11 accept/refuse cases each table.
Audit: the only policies are `*_all_own` (whole-row); triggers are `set_updated_at` and
`receipts_scan_is_pro` (insert, source column only); no view, RPC return type or column grant names these
tables' columns; realtime publishes them without a column list (replica identity full). Nothing else to
update.

**App:** `src/lib/logo-domain.ts` (`logoDomainOf`: hidden → null, else trimmed lower-case logo_domain,
else brands.domain). `src/api/logos.ts`: `resolveLogo` (optional 3rd `signal` arg), `useLogoMatch`,
`reportWrongLogo`, `logoImageUrl` as briefed. Response validated by hand at the boundary (zod is only an
extraneous transitive in node_modules, not a dependency). One 10 s deadline covers headers and body;
never throws; key header only when set, never logged. `useLogoMatch` keeps a real answer 30 min and a
failed (null) one only until the next mount/focus; `retry: false`. `queries.ts`: the six
bill/subscription/receipt selects read `logo_domain, logo_hidden`; row types gain both as optional; the
six ledger `domain:` fields now use `logoDomainOf(row)` (custom-store logos reach card and transaction
ledgers). Reads fall back to the old select on 42703, like useSalaryDetails, so an unmigrated database
still loads every list. `mutations.ts`: optional `LogoValues` on Bill/Receipt/Subscription values;
`useSetRowLogo` updates only the two columns, filters `id` AND `user_id`, throws NOTHING_UPDATED on 0
rows, invalidates the table (+dashboard) and `[kind, id]`.

**Push:** `card.ts` gains `LogoSource`, `logoDomainOf` (held to the app's by a parity test) and
`thumbnailUrl`; `reminderPayload`/`chargePayload` take an optional 3rd `logoCdnUrl`. With LOGO_CDN_URL:
`${cdn}/${domain}`. Without: today's bucket file, except hidden, or a chosen domain different from the
brand's, which get the glyph. `index.ts` selects `logo_domain, logo_hidden, brands(domain, logo_path)`
with the same 42703 fallback. Typechecked with a Deno shim: same 7 pre-existing errors as HEAD, none new.

**Tests:** new `logos.test.tsx` (35), `logo-columns.test.tsx` (21), `logo-domain.test.ts` (8);
`mutations.test.tsx` +12; `push-card.test.ts` +33. 12 mutants on scratchpad copies (jest moduleNameMapper
redirect, tree untouched) all fail their suites; unmodified controls pass.

**Raised:** `logos.skipapps.net` does not resolve yet, but `.env.local` sets EXPO_PUBLIC_LOGO_CDN_URL to
it, so every dev-build logo falls to letters; the Worker's `/v1/logo` serves 200 today. Deploy order:
migration, then app/function; LOGO_CDN_URL only once the domain answers. Dana's `src/lib/logo-columns.ts`
sits in my directory; it composes with my contract and I left it alone.

---

## 2026-10-06 — Dana (Developer, UI and navigation) — logos from Skip Logos, the add-store check, Change logo

**Outcome:** Done in the logo-service worktree only, nothing committed or staged. Coded against Diego's contract
(`logoDomainOf`, `useLogoMatch`, `reportWrongLogo`, `logoImageUrl`, `useSetRowLogo`), which landed while I worked.
Gates: tsc 0; full `jest --ci` 104/104 suites, 1625/1625; prettier clean on my 31 files; eslint `--no-cache` on
src = 19 findings (= baseline: 8 errors in add-account/add-card, all pre-existing). Mutation-checked: hidden ignored
by BrandMark, logo columns always written, stale receipt edit state, report sending the suggestion: each fails a test.

**Built**
- `brand-logo.tsx` loads `logoImageUrl(domain)`; the directory lookup and `logoPath` are gone (the old co-located
  test is replaced by `src/__tests__/components/brand-logo.test.tsx`). `brand-mark.tsx` takes `hidden`: no name match.
- Every `row.brands?.domain` read now goes through `logoDomainOf` (lists, plans, setup, detail pages, edit forms);
  receipt and subscription rows also pass `logoHidden` to BrandMark.
- Add-store check (`logo-choices.tsx`, inline in `brand-field.tsx`): only for a store added by typing. Card "Looks
  like **X**" + website + Yes / Not this one (candidates) / Use the website instead (looked up on Find) / No logo,
  use letters ("use the icon" for a bill's company). Nothing chosen until answered. Unsure or failed: no card, a
  quiet "Add a website". After an answer: a quiet "Change logo" reopens it. Off on voice-edit (the draft keeps no logo).
- Saving: `src/lib/logo-columns.ts` writes the two columns only when the field made a choice that differs from what
  the row holds, so an edit never undoes a Change logo choice and an ordinary save doesn't need the columns. Goldens
  unchanged. Clearing a bill's company clears its logo.
- `src/app/change-logo.tsx` (kind, id, name): current logo + the same choices as radio rows, pinned "Save logo"
  (via `useSetRowLogo`, then back), "Report this logo" thanked in place. Entry: the logo on subscription/bill pages
  (pencil badge); receipts have no page, so a quiet "Change logo" link under Store on the receipt edit form.

**Gaps raised:** LedgerEntry/card-ledger entries carry no `logoHidden`, so Home, Transactions, Subscriptions charges,
the card page and Insights can still name-match a logo the owner turned off (Diego/Drew: add it; I wire 5 call
sites). BrandSelection's logo fields are optional (required would break VoiceMerchant). No country on the profile,
so it is omitted. `brands.ts` still selects `logo_path` (must go before step 6). iOS SVG arc caveat (SDK 57 docs).

**Not verified:** simulator/device walk (Tia): light/dark, large text, keyboard on the website field, SVG logos.

---

## 2026-10-06 — Dmitri (Development Lead) — review of the logo-service worktree (review only)

**Outcome:** FIX-FIRST. One code fix (hidden flag on ledger entries) and two pre-build ops steps. Everything else
is non-blocking. I edited nothing except this log; nothing staged, committed or applied.

**Checks (mine, in the worktree):** tsc 0. Full jest 104/104 suites, 1625/1625. Prettier clean on the 42 changed TS/TSX
files. ESLint `--no-cache` after clearing .expo/cache/eslint: changed files 1 error + 8 warnings, all pre-existing
(jsr: import in send-push; require() in old lines of the save tests). Full src 19 problems = baseline. tsconfig.json
unchanged, no tests under src/app. Babel (metro caller, dev and release) inlines the three `EXPO_PUBLIC_LOGO_*?.trim()` reads.

**Blocking:** (1) A: `logoDomainOf` returns null for "letters", ledger entries carry no hidden flag, so BrandMark
name-matches the logo back on Home, Transactions, Subscriptions charges, the card page and Insights. Diego: `logoHidden`
on card-ledger Charge/RecurringCharge/LedgerEntry (copy at L324/L352) and queries.ts LedgerEntry, set beside the six
`domain: logoDomainOf(row)`. Dana: home:320, subscriptions:127, source/[id]:284, ledger-row:60, insights:174-190/395.
(2) Ops: 9 catalog brands with logos in today's bucket 404 on the CDN (microsoft, openai, wellsfargo, popeyes,
malwarebytes, one.google, fi.google, fiber.google, gem.cbc.ca). Upload the curated PNGs first. (3) Ops: build from this
worktree. The main tree's .env.local has no EXPO_PUBLIC_LOGO_* vars, so a build from there would show letters for every logo.

**Rulings:** B country: not blocking for this build, needed before public. One helper in useLogoMatch (Diego).
C, E, F, G: non-blocking. D: keep optional (undefined means no choice). H: keep the constraint. Migration: safe and
idempotent. 42703 fallback: correct, not masking. Pre-existing: useUpdate never invalidates single-row keys (30 s stale
edit form), which logoColumns now trusts. One-line fix recommended.

**Side effect to disclose:** my live /v1/resolve probe for "Microsoft" made the service store a 128px favicon for
microsoft.com on the CDN. The curated upload in (2) replaces it. The key was read from .env.local and never printed.

---

## 2026-10-06 — Diego (Developer, data and backend) — Skip Logos round 2 (Dmitri FIX-FIRST)

**Outcome:** All three listed items done in the logo-service worktree (the brief said four, listed three).
Nothing committed, staged or applied. tsc 0; prettier clean; eslint `--no-cache` on my files: only the
pre-existing `jsr:` import in send-push/index.ts. Full jest 105/106 suites, 1701/1703: the 2 failures are
Dana's in-flight `src/__tests__/app/change-logo.test.tsx` (it mocks `@/api/logos` wholesale and asserts the
hints her page passes; `src/app/change-logo.tsx` was edited minutes before the run). Not my code.

**1. Hidden logos on ledgers:** `src/lib/card-ledger.ts`: `logoHidden?: boolean | null` on `Charge`,
`RecurringCharge`, `LedgerEntry`, copied through at the two entry builders. Passthrough only, no arithmetic;
`card-ledger.test.ts` green. `src/api/queries.ts`: `logoHidden?: boolean` on `LedgerEntry`;
`logoHidden: Boolean(row.logo_hidden)` beside all six `domain: logoDomainOf(row)`. `logo-columns.test.tsx`:
a hidden subscription and a recorded September charge added; both the main and the card ledger prove the flag
(true on the three hidden rows, false elsewhere, recorded charge included, amount still -81.20), and all-false
on an unmigrated database.

**2. Country hint:** `src/api/logos.ts` `deviceCountry()` = `getLocales()[0]?.regionCode` only when
`/^[A-Z]{2}$/`, else undefined (also on a throw). `useLogoMatch` sends `hints.country || deviceCountry()` (read
once per mount) and keys the cache by the effective country; `resolveLogo` itself unchanged. SDK 57
Localization docs checked: regionCode is the device Region setting, nullable. Tests: region present, null,
lower-case, '419', 'USA', empty, throwing module; caller's country wins; new region = new key.

**3. Single-row cache:** `useUpdate` also invalidates `[receipt|subscription|bill, id]`; test per kind.

**Mutants:** 6 on scratch copies (flag dropped in queries / each card-ledger builder, hook ignoring the
device, no shape check, no single-row invalidation) all fail their suites.

**Raised:** cards and bank accounts have the same single-row exposure (`useCard` `['card', id]`,
`useBankAccount` `['bank_account', id]`); left out per scope, one map entry each if wanted.

### 2026-10-06 — Dana — logos round 2 (Dmitri's FIX-FIRST)

**Outcome:** Done in the logo-service worktree, nothing committed. tsc 0; full `jest --ci` 106/106 suites,
1703/1703; prettier clean on my files; eslint `--no-cache` src = 19 (= baseline). Mutation-checked: each change
below, undone, fails a test.

1. **Hidden logos on ledger lists:** `logoHidden={entry.logoHidden}` on Home, Subscriptions and the card page's
   TransactionRow, `hidden={entry.logoHidden}` in LedgerRow (Transactions), and Insights' top merchants carry a
   group flag: letters only when every row is hidden and none has a website. bills.tsx untouched (bill marks never
   name-match). Diego's `logoHidden` landed in queries.ts and card-ledger.ts (forwarded into the card page's
   entries). Tests: real BrandMark + catalog match, a hidden Netflix entry draws "NE" in LedgerRow and TransactionRow,
   a visible one the catalog logo; Insights grouping incl. a hidden row that still carries a website.
2. **Category mapping:** `src/lib/logo-lookup.ts` `logoCategory`/`logoHints`: same-name spend ids pass through;
   mobile/internet → telecom, loans/finance → banking, energy and spend `utilities` → energy, insurance → insurance;
   housing, water, family, other → nothing. Test asserts every app id maps only to a service name.
3. **Website input:** `websiteHost` trims, lower-cases, strips http(s)://, www., port, path/query/fragment and a
   trailing dot; anything not a plausible host (labels, a letter TLD or xn--) sends nothing and shows "No logo found
   for that website."
4. **Failed-image memo:** module-level Set in brand-logo.tsx; a failed URL is not requested again this session; the
   per-row failedUrl state stays for recycled rows; rows with no website still request nothing.

**Noted:** the memo cannot tell a 404 from an offline blip (expo-image's onError gives no status), so a logo that
failed while offline shows letters until relaunch. The Change logo fixture's `wellness` category was not a real id;
now `fitness`.
- 2026-10-06 Dana: the failed-logo memo (brand-logo.tsx) now forgets a failed URL after FAILED_LOGO_RETRY_MS (10 min) via a small external store read with useSyncExternalStore, replacing the session Set and the per-row failedUrl state, so an offline blip heals itself, rows already on screen included; a 404 is asked for at most once per 10 min per URL (fake-timer tests both ways; tsc 0, jest 106/106 suites, prettier and eslint clean).

---

## 2026-10-06 — Dmitri (Development Lead) — second review of the logo-service branch (review only)

**Outcome:** SHIP-TO-PHONE. The blocking items from the first review are closed. The branch was committed as 8612279 while
I reviewed, and I re-ran everything on that commit with a clean tree. Edited nothing but this log.

**Checks on 8612279:** tsc 0. Full jest 106/106 suites, 1704/1704. card-ledger.test.ts unchanged, 41/41. Prettier clean on
the 52 changed TS/TSX files. ESLint `--no-cache` on those files: 1 error + 8 warnings, all pre-existing (jsr: import, old
require() lines). The "worker failed to exit" notice is unchanged since the first run.

**Verified:** (1) Every place that draws a receipt or subscription row honours logo_hidden: home, subscriptions,
source/[id], ledger-row (transactions tab), insights (letters only when every row chose them and none has a website),
receipts, setup-subscriptions, subscription-plans, subscription/[id], change-logo. bills.tsx needs nothing because
BillMark never name-matches. (2) brand-logo store: holds only URLs that failed in the last 10 min, each with its own
timer. Listeners are one per mounted logo. A failure re-renders only the rows showing that URL, and a URL already
remembered is ignored. onError still falls back to letters or the glyph, and no website means no Image and no request.
The compiler-safe pattern holds: state changes only in onError and the timer. (3) card-ledger diff adds only logoHidden
type fields and two copy lines, with no arithmetic. (4) deviceCountry is wrapped in try/catch and accepts only
`^[A-Z]{2}$`. (5) utilities->energy is fine: the service's energy words include "utility", and there is no penalty
unless a description matches another category. Ops: the 9 curated CDN logos now 200 image/png, the Mac's DNS resolves
logos.skipapps.net, and the main tree's .env.local now has the 3 LOGO vars.

**Non-blocking:** useSyncExternalStore has no getServerSnapshot (only matters if web static output is ever built).
"No logo found for that website." also shows for input that is not a website. The jest worker-exit notice.

### 2026-10-06 — Dana — scanned receipts land on review-and-save (Founder's device report)

**Outcome:** Done in the logo-service worktree, nothing committed. tsc 0; full `jest --ci` 108/108 suites,
1734/1734; prettier clean on the 9 files; eslint `--no-cache` src = 19 (= baseline). Mutation-checked: route scan
starting at the amount, in-page scan not moving, no wait for `ready`, refusal not routed, impossible day kept,
landing on Save with no store: each fails a test.

- **Landing:** a scan (route params from the receipts list, or Scan/Upload on the form via applyScan) opens on the
  last step when it has a usable amount and a store; no amount opens the amount, no store the store. A voice
  hand-off and an edit still open on the amount. Back from the last step goes to the store step as before.
- **Review:** on the last step of a new scanned/uploaded receipt, the scan report then a card of three ReviewRows
  (reused from voice review) above "When was it?": Amount (Banknote well), Store (BrandMark with the selection's
  logo, `hidden` honoured), Paid with (CreditCard well, optional). Each opens its step. Typed receipts unchanged.
- **Pro:** in-page Scan/Upload ignore a tap until `usePro().ready` (as the voice button does), then send a free
  account to /pro-feature?id=scan before the camera or picker; the PRO badge shows only once known. A save refused
  by the database's Pro wall (`refusedForPro`, new src/lib/pro-refusal.ts) pushes /pro-feature (scan, or voice for
  a voice capture) instead of FAILURE_MESSAGE, in add-receipt and in voice-review's receipt save.
- **Save path:** payload checked for scan and upload (source, image_path null, brand null for a custom store, a
  valid category, card from the last four, no logo columns). Fixed: the parser allows day 31 in any month, and
  "02/30" went into `new Date()` unchecked on the in-page path (V8 rolls it into March; NaN would be refused). Both
  scan paths now read the day through `readDayParam` and drop an impossible one (report no longer claims it).

**Not verified:** on a device (Founder): camera and photo-library paths end to end, and the save once his server
Pro row exists. Raised: the parser's `isoDate` itself should reject impossible days (receipt-parser, not mine).

---

## 2026-10-06 — Dmitri (Development Lead) — review of Dana's scan-landing / Pro-refusal fix (uncommitted, on 0ccd23c)

**Outcome:** FIX-FIRST, one small blocking item. Edited nothing but this log.

**Checks:** tsc 0. Full jest 108/108 suites, 1734/1734 (the "worker failed to exit" notice is unchanged). Prettier clean
on the 9 changed TS/TSX files. ESLint `--no-cache` on them: 0 errors, 4 warnings, all pre-existing require() lines.
src total 19 = baseline.

**Blocking:** the refused-save routing sends a client-Pro user to the paywall. Both save paths are only reachable when
the client already believes the person is Pro: in-page scan checks `pro`, the list scan checks `pro`, and voice-review
is behind useProGate. So a server "part of Skip Pro" refusal there is almost always an entitlement desync, which is the
Founder's own bug. The change shows that person "See Skip Pro" and sends Sentry nothing. Fix (Dana):
`refusedForPro(thrown) && !pro` in add-receipt.tsx (save catch) and voice-review.tsx (add `usePro()` in Review); else
fall through to failureMessage. Add a test for "client Pro, server refuses -> FAILURE_MESSAGE, no push".

**Verified fine:** Landing step: comes from params only for a new route-param scan; edit, voice hand-off and typed
receipts start at 0; no remount race, because the key stays 'new' for new receipts. In-page scan lands on the first
missing step. The review card shows only on new scan/upload. The free user is stopped before the camera and picker,
and typing stays free. The message match is exact (only Pro-wall messages contain it, and the trigger is
before-insert). The explainer is pushed, so Back keeps the form and there is no loop. Voice vs scan id is right. The
date guard (isIsoDay UTC round-trip) keeps leap days and month ends, and amounts are untouched.

**Non-blocking:** receipts.tsx:52 list Scan has no `ready` wait (pre-existing). The capture buttons should be
`disabled` while !ready. usePro's `ready` is true once the server answers even if the SDK has not. The root cause in
receipt-parser.ts isoDate (day <= 31 for any month) can be fixed later, owner Diego, with a fixture (both consumers are
now guarded).
- 2026-10-06 Dana: Pro-wall refusal now opens the explainer only when the app also thinks the person is free (add-receipt and voice-review); a payer the server refuses gets the failure line, reported as before. Receipts-list Scan waits for Pro status; the form's Scan/Upload are dimmed until it is known. Tests for each (incl. new receipts-scan.test.tsx); tsc 0, jest 109/109 suites, prettier and eslint clean (src 19 = baseline).
- 2026-10-06 Dana: tab bar can no longer overflow (skip-tab-bar.tsx): selected pill shrink + min-w-0 with an ellipsizing label, px 12 / gap 6, plain icons flex-1 to 48pt with a 36pt floor + 4pt hit slop (44pt target). Laid out in Yoga 3.2 with Poppins SemiBold widths: old bar overflowed 7pt at 375pt x1.2; new bar 0pt at 320-428pt, every label whole at 375pt up to the 1.2 cap (Settings worst: icons 40.7pt, ~14pt left before any ellipsis). tsc 0, jest 109/109, prettier/eslint clean.

---

## 2026-10-06 — Dmitri (Development Lead) — review of Dana's tab-bar overflow fix (uncommitted, on f7bf5bb)

**Outcome:** SHIP-TO-PHONE. No blocking issues. Edited nothing but this log.

**Checks:** tsc 0. Full jest 109/109 suites, 1742/1742. Prettier and ESLint `--no-cache` clean on skip-tab-bar.tsx and its
test.

**Verified:** The old pill was `shrink-0`, which was the root cause: it could not shrink, so it overflowed. Now it is
`shrink`: the icons sit at their 36pt floor and the pill takes the rest, with the label shrinking and ending in
ellipsis. The icon tabs have no width of their own (flex-1), a 36pt floor and a 48pt cap, so they size equally and
never collapse unevenly. role/state/label, theme tokens, VoiceFab, safe area and navigation are unchanged. Nothing
else renders beside VoiceFab. Both new layout tests fail against HEAD: `shrink-0` is present there, and icon tabs had
no style.minWidth. They pin the classes as written, not real layout, and say so.

**Non-blocking:** When the row is tight (375pt, 1.2x text, Settings selected) adjacent tabs touch. Hit slop then only
shifts each target, because the later sibling wins the overlap, so icon targets are about 36pt wide, not 44. Before,
the floor was 40pt (and it overflowed). A test that runs the Yoga layout engine could pin the arithmetic later.
- 2026-10-06 Dana: tab bar widths are now fixed from the window width (new pure tab-layout.ts tabLayout(width, routes); voice-fab takes ROW_HEIGHT from it): icons 32..48pt with slop to 44, pill 128pt (98 at 320pt), label capped at the pill's room with adjustsFontSizeToFit instead of an ellipsis; same style keys selected or not. Yoga 3.2 did not reproduce the shipped glitch (so it lies outside flexbox, unconfirmed on device); new layout: 0 overflow in all 12 transitions x3 at 320-430pt, Settings whole at 1.2x from 360pt, 11pt at 320pt. tsc 0, jest 110/110 (1931), prettier/eslint clean.

---

## 2026-10-06 — Dmitri (Development Lead) — review of Dana's fixed-geometry tab bar (uncommitted, on 9e18275)

**Outcome:** SHIP-TO-PHONE. No blocking issues. Edited nothing but this log.

**Checks:** tsc 0. Full jest 110/110 suites, 1931/1931. Prettier and ESLint `--no-cache` clean on tab-layout.ts, its test,
skip-tab-bar.tsx and its test, and voice-fab.tsx.

**Verified:** tabLayout's constants match the real layout: px-4 = 16 each side, gap-[14px], the Voice button at 64, and a
1pt border + px-[7px] = 8 each side, so inner = W - 126. The sum is always <= inner (icon <= floor(inner/4)). The
widths are integers except on windows under ~350pt, so there is no sub-pixel overflow. 375 gives 40/128 (1pt spare),
393 gives 46/128, 402.33 and 428 give 48/128, 320 gives 32/98. The label widths come from the shipped
Poppins_600SemiBold.ttf: Settings 62.46pt at 15pt and 74.95pt at 18pt, against 76pt of room at 128. In RN 0.86 Fabric
iOS, adjustsFontSizeToFit scales down to `minimumFontSize` (default 4pt); minimumFontScale is not read on iOS. So the
label shrinks rather than ellipsizing (an ellipsis is only possible below 4pt). No stale state: useWindowDimensions is
read every render. role/state/label are unchanged.

**Non-blocking:** The geometry constants are duplicated as class strings and no test ties them together. Packed rows
(375/360pt) let hit slop overlap, so icon targets are about 40/35pt wide. active:opacity-60 now also dims the selected
pill. Home and Cards sit with about 15pt of air each side in the fixed 128pt pill. If speech is unavailable the
VoiceFab renders nothing, so the bar only gets wider.

### 2026-10-06 — Dana — the app font is Montserrat (Founder's request)

**Outcome:** Done except the tab bar's two files, held for the coordinator's go (patch prepared and verified in a
scratch copy). Nothing committed. tsc 0; full `jest --ci` 111/111 suites, 1936/1936; prettier clean on the 111
changed files; eslint `--no-cache` src = 19 (= baseline; the 8 errors are add-account/add-card refs, unchanged).

- **Font:** `@expo-google-fonts/montserrat` 0.4.2 (static faces; variable fonts need SDK 58). New
  `src/theme/fonts.ts` (APP_FONTS) is what `_layout.tsx` loads, `useFonts` now from `expo-font`; same splash gating
  and error fallback. Poppins dropped from package.json and the lock with `--package-lock-only` (lock diff: those
  two packages only). npm replaced this worktree's node_modules symlink with a real install (1.1 GB); the live
  tree's node_modules was not touched and has no Montserrat.
- **Tokens:** `font-app`, `font-app-medium`, `font-app-semibold`, `font-app-bold` (not `font-body`: the app has a
  `text-body` colour). Codemod over 103 files, 420 tokens; every file proven equal to the committed one with only
  the tokens swapped, after removing whitespace (prettier re-wrapped some shortened lines). `src/__tests__/theme/fonts.test.ts`
  pins the map against the loaded faces and fails on any family class the map lacks (a PENDING entry holds the
  tab bar until the go, and fails once it has moved).
- **Metrics (measured from the TTFs):** iOS line box 1.219em vs 1.500em (text without an explicit line height is
  about 19% shorter); cap line 0.268em below line top vs 0.345em, so the "$" levelling in AmountFigure and the
  calculator pad was off by up to 2.5pt: affixTop recomputed (64pt band 12 → 9.5, etc.). Strings a median 2-3%
  wider. Nothing clips at 375/390/428: figure bands max 311pt of 333; destination labels, money tiles fit; Quick
  add "Subscription" now also uses its shrink-to-fit at 428pt (77.2 vs 76.1pt room). Tab bar: "Settings" 64.2pt
  (77.0 at 1.2x) > 76pt room, so PILL_MAX 128 → 130 is proposed (whole at the cap from 360pt; 0 overflow in Yoga).

**Not verified:** on a device: the look of the shorter line boxes, the "$" alignment, Metro needs `--clear`.

---

## 2026-10-06 — Dmitri (Development Lead) — review of 17990fe "Montserrat for the whole app"

**Outcome:** SHIP-TO-PHONE. No blocking issues. Edited nothing but this log.

**Checks (tree clean at 17990fe while they ran):** tsc 0. Full jest 111/111 suites, 1936/1936. Prettier clean on all 113
TS/TSX/JS files the commit touches. ESLint `--no-cache` on the same 113: 8 errors, all the known react-hooks/refs in
add-account/add-card on lines the commit did not change; 0 warnings.

**Verified:** No Poppins reference in tracked code outside design/ and .md. The tokens font-app/-medium/-semibold/-bold
map to Montserrat_400Regular/500Medium/600SemiBold/700Bold, which are exactly the useFonts keys (expo-font registers
by key). The splash hold and the error fallback are unchanged. The TTFs are static (no fvar) and are bundled by Metro
through require() assets. No config plugin and no native rebuild are needed. package.json and the lockfile change
only the font package. Metrics read from the installed TTFs: upem 1000, hhea 968/-251/0, which gives the 1.219em line
box; cap 700, which puts the cap line 0.268em below the top. affixTop values are 0.268 x (size - affix), rounded to
the half point. The calculator is exact because its digits have no lineHeight. AmountFigure assumes the same
top-anchored placement the Poppins values relied on, and the set lineHeights are within 2pt of Montserrat's natural
box, so the worst case is about 2pt at the 64pt band. Tab bar: Settings is 64.23/77.08pt, with 78pt of room in a 130pt
pill. Sums: 375 gives 39/130 (247 of 249), 360 gives 34/130, 393 gives 45/130, 430 gives 48/130, 320 gives 32/98.
Slop keeps targets at 44pt or more. The notification extensions use system fonts.

**Non-blocking:** brand-logo.tsx:100 monogram uses `font-app font-semibold` (a weight on a one-face family; use
font-app-semibold). The package root import bundles all 18 Montserrat TTFs, as Poppins did; per-weight subpaths would
ship only 4. The amount-figure comment ("no line height taller than the font's own") is off for the 36pt band by
0.06pt. fonts.test has an empty PENDING scaffold. node_modules still holds poppins (extraneous). The design/ kit still
says Poppins.

### 2026-10-06 — Dana — Settings split into four pages (Founder's request)

**Outcome:** Done in the logo-service worktree, nothing committed or staged. tsc 0; full `jest --ci` 114/114 suites,
1970/1970 (3 new suites, 34 tests); prettier clean on the 15 changed files; eslint `--no-cache` changed files 0,
src 19 (= baseline). tsconfig.json and package.json unchanged (typed routes regenerated into .expo/types only).

- **Main page:** Skip Pro, Developer (dev only), Profile and Account unchanged; between Profile and Account one
  heading-less group of four rows, title + chevron, no subtitle: Preferences (SlidersHorizontal), Your money (Wallet),
  About (Info), Support (LifeBuoy). `SettingsSection.title` is now optional.
- **Routes:** `src/app/settings/{preferences,your-money,about,support}.tsx` → `/settings/preferences` etc. No
  `settings/index`, so `/settings` is still only the tab; pushed on the root stack above the tabs, `Screen showBack`
  (shared shell `components/settings/settings-page.tsx`). Items, small lines, controls, counts and handlers moved
  verbatim; app-lock handler and mode chips moved into preferences.tsx (one copy); `useMoneyCounts` + `plural`
  shared by Your money and the delete-account tally.
- **Tabs from a pushed page:** "Cards and accounts" and "Getting started" now `router.dismissTo('/cards' | '/home')`.
  `push` from above the tabs would have stacked a second tab navigator; from the old tab page it switched tabs.
- **Also:** SettingsRow title/subtitle lose `numberOfLines={1}` (large-text §1.4, all settings rows wrap now). FAQ
  answer now says "Settings → Support → Getting started". Coffee SVG behind `components/settings/coffee-mark.ts`
  so a test can stand it in. "Buy a coffee for team" stays on Support (it was in that section).
- **Tests:** settings.test.tsx (main page order, no subtitle, each row's push, Pro/Profile/Sign out/delete tally;
  each page's exact text top to bottom; every row's target), settings-preferences.test.tsx (real Theme and
  Preferences providers over fake storage: chip, haptics and app lock persist across remount; unavailable dialog;
  failed scan), settings-routes.test.tsx (renderRouter over the real src/app tree: /settings is the tab, each page
  pushes and backs to it, cold links, dismissTo leaves no stack). Mutants (push instead of dismissTo, a
  `settings/index` route) fail.

**Not verified:** on a device. Pre-existing, left as is: Your money says "None yet" while loading and on a failed
read (no FAILURE_MESSAGE); PageHeader titles still shrink-to-fit rather than wrap.

---

## 2026-10-06 — Dmitri (Development Lead) — review of 9c35463 "Settings: four rows, each opening its own page"

**Outcome:** SHIP-TO-PHONE. No blocking issues. Edited nothing but this log.

**Checks (tree clean at 9c35463 while they ran):** tsc 0. Full jest 114/114 suites, 1970/1970. Prettier and ESLint
`--no-cache` clean on the 15 changed TS/TSX files.

**Verified:** settings-routes.test runs expo-router's real route resolution over the real src/app file tree:
/settings opens (tabs)/settings, /settings/<page> is pushed in the root Stack, back returns to the tab, a cold link
works, and dismissTo leaves no second tab bar. `.expo/types/router.d.ts` has the new routes. The root Stack's
screenOptions apply, as for every other detail page; no Stack.Screen entry is needed. dismissTo, in expo-router
57.0.15, is POP_TO: pop to the nearest (tabs) route below, then switch the tab through params.screen, or replace if
there is none. It is the same pattern add-bill/add-receipt/add-subscription/voice-review already ship with, and it
cannot pop past (tabs). The main page keeps Skip Pro, the dev-only Developer switches, Profile with avoidKeyboard and
the save check, Account, and the delete tally through useMoneyCounts (same queries). Moved logic exists exactly once:
app lock, mode chips, plural, coffee, getting-started. SettingsRow has no fixed height, so the wrap cannot clip. Every
"Settings ->" phrase still points somewhere that exists.

**Non-blocking:** Back on a cold-opened /settings/<page> falls back to /home, not /settings (goBack's general
fallback). privacy.tsx says "Settings -> Delete account" where the FAQ says "Settings -> Account -> Delete account".
use-money-counts.ts is a hook living in components/.

---

## 2026-10-06 — Dana — large text, phase 1: TEXT_CAP, FitGroup, Home (Founder's request)

**Outcome:** Done in the logo-service worktree, nothing committed or staged. tsc 0; full `jest --ci` 119/119 suites,
2008/2008 (5 new suites, 2 extended); prettier clean on the 24 changed TS/TSX files; eslint `--no-cache` changed
files 0, src 19 (= baseline). No device or simulator run.

- **Shared pieces:** `src/theme/text-scale.ts` (TEXT_CAP reading 1.6 / row 1.4 / control 1.3 / heading 1.3 /
  figure 1.2, MIN_TEXT_SIZE 11, `renderedSize`). `src/components/ui/fit-group.tsx` (`fitScale`, `useFitGroup`,
  `FitGroup`, `FitText`), per large-text.md section 2. Measured in useLayoutEffect via `getBoundingClientRect`;
  checked in RN 0.86.2: Fabric refs are ReactNativeElement (ReactFabricPublicInstance.js:37), completeSurface
  lays out in the commit and updates the revision JS reads at once (UIManager.cpp:188-213, ShadowTree.cpp:409),
  and React commits only mount at the end of the JS task (Scheduler.cpp scheduleRenderingUpdate,
  RuntimeScheduler_Modern.cpp:322), so the corrected size is the first frame. onLayout catches late passes.
  The decision is keyed by fontScale, window width, the group box's width and each member's text and measured
  width, so a size made against a passing width is redone (the tab bar lesson); a fallback holds until the key
  changes, so it cannot flip-flop.
- **Deviations:** the measuring copy sits in each member's slot (absolute, 4000pt, opacity 0, hidden from
  accessibility) and draws one word per line, so its width is the widest word. Added `hug` (an amount beside a
  label: keyed, not checked), `before`/`after` + `reserve` (an icon or chevron beside a centred label). Switch
  mode's dev check compares role only. Tests in src/__tests__ (the two co-located dashboard tests extended in
  place). A guard test instead of the ESLint rule while 316 numeric ceilings remain.
- **Home:** Quick add is a 2x2 grid of wide tiles (icon beside label), the four labels one group at 15pt
  (control), one column only below the 15pt floor (320pt Display Zoom). Where it goes is a switch group: labels
  wrap, amounts whole with cents, and all three rows put the amount under the label once one word cannot fit
  (428pt at 1.4x: "Subscriptions" 145.6pt vs about 137pt; 375pt even at default). Hero card: the days pill
  scales (control), Income/Expenses labels and figures are two shrink groups, the pair stacks below the floor.
  Go further: tool names a group, label wraps beside the chevron. TransactionRow: per-row switch group (also on
  bills, subscriptions, source/[id]). Header name, Insights banner, getting-started titles wrap; caps from TEXT_CAP.
- **Shared controls:** typography (ceilings from TEXT_CAP; Title 1.4 -> 1.3; SectionHeading wraps and the caption
  drops under it), Button wraps (1.5 -> 1.4), PageHeader title wraps in min-h-[52px] (a single word too wide
  shrinks, group of one), DateGroupHeader wraps, TextLink 1.5 -> 1.4.
- **Guard:** src/__tests__/large-text-guard.test.ts: per-file allowance of numeric maxFontSizeMultiplier,
  numberOfLines={1} and adjustsFontSizeToFit (316 / 60 / 14 in 87 files); counts may only go down and the
  adopted files must be clean. Mutants (a new ceiling in quick-actions, a one-line cut in action-pill, a removed
  site left on the list) each fail.

**Not verified:** on a device: the first-frame claim is from the RN source, not a trace; Montserrat kerning (my
widths are advance sums). Phase 2 list in the report. Note: I ran one `git stash` / `stash pop` to compare test
console output with the baseline; restored at once, stash list empty, Dmitri's uncommitted entry intact.

## 2026-10-07 — Diego (Developer, data and backend) — i18n wave 1: src/lib, src/data, src/api text into the message system

**Outcome:** Done in the `i18n-currency-language` worktree only, nothing committed. tsc 0; eslint clean on every
touched file (cache cleared); prettier clean; full jest 109/109 suites, 1552 tests green.

**Keys:** `lib` 14, `api` 43, `pro` 46 (103 total; `common.cancel` and `common.failure` reused). French has U+00A0
before `? ; :` and inside « » (the Write tool turns it into a plain space, so it was put in by script afterwards).

**Converted:** `failure.ts` (failureMessage now returns `t('common.failure')`), `app-lock.ts`, `hourly-pay.ts`,
`voice-draft.ts` (voiceSaveBlocker), `wall.ts`, `data/pro-features.ts` (lazy getters), `api/auth.ts` readable(),
`oauth.ts`, `entry-values.ts`, `past-charges.ts` (whole sentences per case), `onboarding.ts`, `reminders.ts` (lazy
labels/captions), `pro.ts` (trial text worded in `select`, so a cached answer follows the language).

**Shims kept (English, frozen at import):** `FAILURE_MESSAGE` → `failureText()`; `PRO_MONTHLY_LABEL` /
`PRO_YEARLY_LABEL` → `proMonthlyLabel()` / `proYearlyLabel()`. Lazy in place (no screen change needed):
`PRO_FEATURES`, `OVERTIME_RATES`, `LEAD_OPTIONS`, `REMINDER_CHOICES`, `REMINDER_CAPTION`; `ProPrices.trialText`.

**Left English on purpose:** withTimeout/contact/pro.ts thrown causes (screens show the failure line; dev note
only); `api/charges.ts` 'Bill'/'Subscription' (stored in `charges.label`); push category buttons (native
extension and server text are English); `data/voice-examples.ts` (the parser contract). Not touched (logo branch):
`queries.ts` L973 'Income', `card-ledger.ts` L363 'Payment'.

**Tests:** new `src/lib/{app-lock,wall}.test.ts`, `src/data/pro-features.test.ts`, `src/api/{oauth,pro,onboarding}.test.*`;
es/fr blocks added to failure, hourly-pay, voice-draft, auth, entry-values, past-charges, reminders tests.
Glossary rows added to the playbook.

---

## 2026-10-07 — Drew (Developer, money maths) — receipt parser reads Canadian-French money

**Outcome:** Done in the `i18n-currency-language` worktree only, nothing committed. Only `src/lib/receipt-parser.ts`
and its test touched. tsc 0; eslint clean (cache cleared); prettier clean; parser suite 79/79 (35 existing,
unchanged, + 44); full jest 109/109 suites, 1596/1596.

**Accepted:** a comma figure with exactly two decimals and no digit after (`1,299` and `9,975 %` never read),
grouped thousands by space / U+00A0 / U+202F, counted only when (a) "$" follows after at most one space and no digit
follows the "$", or (b) it is the figure of a French money label: the line minus its figures is exactly total,
grand total, total à payer/dû, sous-total, montant (total/dû/à payer), solde (dû/à payer) or à payer, or it stands
alone on the next line / is the whole next row / is a lone cell on the label's row. A figure must start a word
(`A1,23`, the `42` of `15:42`, the `06` of `2026-10-06` cannot). French total hints: montant dû, solde dû,
à payer (+ total). Non-totals: sous-total, total partiel, avant taxes, des taxes, taxe, TPS, TVQ, TVH, pourboire,
monnaie, rendu, remise, rabais, escompte, économies. Labels matched on accent-folded text.

**English unchanged, proven:** `MONEY` byte-identical; any line with a dot amount is read by `MONEY` alone. Same test
file run against HEAD's parser via moduleNameMapper: all 35 old tests + the 6 English and 5 never-guess tests pass
there; the 32 French tests fail there. Differential fuzz old vs new (scratchpad): 2,700-text label×bait grid and
100,000 English receipts with comma bait on item lines and under labels: 0 differences (flat and positioned). With
bait deliberately on total lines: 310 differences, all positioned, all from a cell reading exactly like a French
total. Mutation: 11/12 guards caught by a test; the 12th (no digit after the cents) is redundant behind the
"$"/whole-label rules (0/200,000 French-shaped texts differ) and is kept as the stated rule.

**Raised, not changed:** "TOTAL TAXES" (plural, no "des") counts as a total in both languages, as English
"TOTAL TAXES 1.57" already does (`\btax\b` misses TAXES); fixing it changes an English result. A 1–3-digit number
one space before a 3-digit comma figure reads as thousands ("2 123,45 $" → 2123.45). A line with a dot figure and
a comma one (e.g. "TVQ 9.975 % 2,97 $") reads only the dot figure. `parseDate` reads 06/10/2026 US-first and has
no French month names.

---

## 2026-10-07 — Drew (Developer, money maths) — receipt parser: store, total and date across five markets

**Outcome:** Done in the `SkipBudget-scan` worktree (branch `receipt-scanning`), nothing committed. Camera path (`flat`) on
the 300 training receipts: merchant 64.8 -> 95.6 % named and 3.7 -> 100 % abstain on no-name receipts, total 89.3 -> 97.0,
date 62.3 -> 97.0, all three 33.3 -> 94.3. Held-out set (151, other shops/layouts/fonts/seed): 95.7 / 100 / 96.0 / 96.0 /
90.1, within five points of training. Hard set (80, stressed photos): 77.0 / 66.7 / 86.3 / 86.3 / 58.8. tsc 0; eslint 0
(cache cleared) and prettier clean on my 6 files; parser suites 79 + 157 + 6, receipt bench 38; full jest 135/135 suites,
2353/2353.

**Changed:** `src/lib/receipt-parser.ts` rewritten as one engine for both entry points (rows by reading order; sideways
photos turned upright; tilt levelled by price/label slope votes; scored header with address/phone/web/date/till/tax-id/
paperwork exclusions in en/fr/es and five postal systems; split names joined; clues from thanks / "receipt from" /
legal-entity / web lines; brand hints with accent/case/space-blind matching, exact for names of 4 letters or fewer;
dates per row only, en/fr/es months, region inference then `dayFirst` then nearest-past; totals as integer cents with
leading-zero/digit-run/mask/ceiling rejection, French "$" before or as its own cell, tips, and the receipt's arithmetic
(subtotal + taxes + tips + fees - discounts, cash - change, card line) to choose between readings). New
`ParseOptions { brands?, today?, dayFirst? }` on parseReceipt / parseReceiptFromLines (and the single-field exports).
`src/api/scan.ts`: `receiptParseOptions(directory)` (brand directory + dayFirst from the chosen currency: USD false,
CAD undecided, GBP/MXN/AUD true), used by `useReceiptScan` and both parse calls in `src/app/add-receipt.tsx`.
Tests: `receipt-parser.rules.test.ts` (157, one rule each), `receipt-parser.accuracy.test.ts` (floors on all three sets,
`today` pinned). Two pinned expectations changed with reasons in the test: `TIM HORTONS #4021` -> `TIM HORTONS` (store
number stripped), HARDWARE without TOTAL 20 -> 10.82 (cash handed over is not the charge; two sums agree on 10.82).
Per-step table in `.claude/team/logs/scan-parser.md`.

**Not verified / caveats:** held-out numbers after my first look are no longer blind (first look and every later rule
are logged); parse time is 2-5 ms in Node/Jest for 225-line receipts on a quiet machine, not measured on a phone
(Hermes); the hard set's main loss is newspaper text behind the receipt; G500-style names (one letter + digits) are
excluded on purpose because order numbers ("H187") look the same.

---

## 2026-10-07 — Dilip (Developer, native and platform) — receipt reader (Apple Vision) hardened, camera and upload

**Outcome:** Done in the `SkipBudget-scan` worktree (branch `receipt-scanning`), nothing committed, no xcodebuild, no
`ios/` touched. Swift parses and typechecks against the iOS 26.5 SDK with a stub ExpoModulesCore (arm64 iOS 16.4 and
15.1, x86_64 simulator; Swift 5 mode as the pod builds: 0 errors, 0 warnings; Swift 6 mode shows only the camera
controller's existing diagnostics). tsc 0, eslint clean (cache cleared), prettier clean, module tests 7/7.

**Changed:** `modules/receipt-scanner/ios/ReceiptScannerModule.swift`, `modules/receipt-scanner/index.ts` (docs only),
`index.test.ts` (+2 tests), `scripts/receipt-corpus/ocr-batch.swift` (new `next` pass, `--passes legacy,next`; raw /
flat / fixed untouched), its README section. `next.json` + `next-timing.json` written beside the images in
`out/images`, `out/hard`, `out/holdout`; fixtures not rebuilt.
- Upload path: photos decoded upright with ImageIO (EXIF applied, capped at 25 MP) and read like a camera shot; PDFs keep
  their 2x render (capped at 25 MP, standard colour range).
- One `read(photo:)` for camera and upload: flatten when a page is found; a doubtful crop (page under 10% of the frame
  or fewer than 5 lines) also gets the whole photo read, whole kept only with >1.5x the legible characters.
- Languages `en-US, es-ES, fr-FR`; auto-detect and language correction stay off; minimumTextHeight stays 0.008.
- Lines returned in reading order (rows by centre within half a line height, then left to right).

**Measured (300 training receipts, parser frozen at HEAD; merchant / total / date / all three):** raw 42.7 / 73.3 /
63.3 / 18.7, flat 59.3 / 89.3 / 62.3 / 33.3, next 60.3 / 90.7 / 64.0 / 33.7. Clean scans: total 75.0 to 84.1, date 61.4
to 72.7 (6 bad crops now fall back). Photos: next = flat within 1-2 receipts (decode-layout noise in Vision, not a
rule). Holdout 151: flat 70.9 / 76.8 / 70.2 / 39.7, next 72.2 / 76.8 / 71.5 / 41.1. Theo's hard 80: next = flat within
one receipt. Language list: byte-identical text on all 300; auto-detect -1 merchant; language correction rewrote 231
digit lines ("GST (10%)" to "GST (108)"). minimumTextHeight 0 / 0.004: no gain on small receipts, 0 is -2 merchants on
training. Cap 12-48 MP on 48 MP small-receipt shots: non-monotonic, within 3 of 60. Second Vision pass on 6/300,
6/80, 2/151. Time: read without decode 1027 ms vs legacy flat 1095 (interleaved, 40 images, Intel Mac).

**Not verified:** anything on a device (HEIC decode, memory, Vision model on iOS), PDFs (no PDF corpus), the camera
path's own decode (UIImage + `normalised`, unchanged) against the bench's ImageIO decode.

## 2026-10-07 — Dana (agent H, UI) — a new bill is pre-named in the language on screen

**Outcome:** Done in the `i18n-currency-language` worktree only, nothing committed. tsc 0; eslint clean on my
files (cache cleared; 2 pre-existing require() warnings in the test's mocks); prettier on my files only; bills/voice
suites 17/17 (297 tests); full jest 179/179 suites, 2565 tests green.

**Changed:** `src/app/add-bill.tsx`: one `categoryName(id)` (billCategoryLabel over BILL_CATEGORIES) feeds the
category-tile pre-fill, `prefillName` (voice hand-off) and the `handleIssuer` "nobody typed it" compare, so they
always match. `src/app/voice-edit.tsx` `labelOf` and `src/app/voice-review.tsx` `categoryLabel` use the same
translated name (so `voiceBillName` / `entryToBillInput` save it); voice-review's own RECURRENCE_LABELS map replaced by
`recurrenceLabel()`. Comments only: `voice-draft.ts` (entryToBillInput), `bill-row.tsx` (billCategoryLabel said new
bills were named in English). English unchanged: a test pins billCategoryLabel(id) === BILL_CATEGORIES label in en.
Category ids and existing bills' names untouched (edit test: a bill saved as "Vivienda" stays so in French).

**Tests:** add-bill-i18n (Spanish pre-fill now "Vivienda"; the saved-object test is identical except the name; new:
Housing/Vivienda/Logement pre-fill + saved name + id, typed name kept even after a company, company replaces the
untyped name, voice hand-off pre-fill, English identity, no rename on edit). voice-edit-languages (Spanish name now
"Vivienda"; new per-language unchanged/typed name, category follow in Spanish). voice-review-languages (French row
now "Nom, Électricité et gaz"; new: saved bill identical across languages except name, typed name kept). Mutation:
English compare in add-bill alone fails 2 tests; English labels in all three screens fail 10.

**Stays English:** `carried.label: values.name || 'Bill'` in add-bill (stored in charges.label; unreachable, a bill
cannot save without a name). Pre-existing, not changed: going back to the category grid and picking again
overwrites a hand-typed name (only a company's or the voice page's name counts as real), in every language.

---

## 2026-10-06 — Dmitri (Development Lead) — review of f453724 "Large text, phase 1"

**Outcome:** SHIP-TO-PHONE. No blocking issues. Edited nothing but this log.

**Checks (tree clean at f453724 while they ran):** tsc 0. Full jest 119/119 suites, 2008/2008. Prettier and ESLint
`--no-cache` clean on the 24 changed TS/TSX files.

**Verified:** Measuring copies are absolute and opacity 0, with pointerEvents none, aria-hidden,
accessibilityElementsHidden and no-hide-descendants. iOS RCTRecursiveAccessibilityLabel skips hidden subviews, and
opacity plus the a11y props stop Fabric flattening the layer. Absolute children do not change parent or scroll size.
The copies are excluded from default RNTL queries. Fabric host refs are ReactNativeElement in RN 0.86, so
getBoundingClientRect works in the layout effect. The decision key covers font scale, window, container and texts, a
late width change re-judges in the first layout, the fallback holds until the key changes (no flapping), and
MAX_PASSES caps updates. Nothing on Home is cut: the only overflow-hidden are the progress tracks and rounded cards
with growing heights. Amounts keep cents. Quick add drops to one column only below the floor. No code assumes a
52pt header. The guard test's allow-list is exact (both directions are tested).

**Non-blocking:** Each TransactionRow now mounts with about 3 renders and 3 hidden Text nodes. source/[id] and the
charges lists are not virtualised, so check a long card history on the phone. The React Compiler is on, which limits
BrandMark re-render cost. A two-line PageHeader keeps back and actions centred. Side-by-side buttons can differ in
height. Hitting MAX_PASSES fails silently, and a dev warning would help.

---

## 2026-10-07 — Dana (Developer, UI and navigation) — large text, phase 2a: Activity, Cards, rows, hero figures

**Outcome:** Done in the logo-service worktree on e4f65d5, nothing committed or staged. tsc 0; full `jest --ci` 184/184
suites, 2637 tests (baseline 180 / 2582; 4 new suites, 55 new tests, none removed); prettier and ESLint `--no-cache`
(cache cleared) clean on the 40 changed TS/TSX files. No device or simulator run.

- **Core (`fit-group.tsx`):** measuring copies split only at breakable spaces, so a French amount ("1 234,56 $",
  no-break spaces) is measured whole (phase 1 measured "234,56" alone, which under-shrank French figures on Home).
  Mount cost per group: no re-render for members registering before the group's first pass, the decision key kept in
  a ref (a key change alone draws nothing), hug slots noted so their onLayout is not news; a fitting row now mounts
  in 1 render (was about 3). Hug members draw no measuring copy (TransactionRow 3 hidden Texts -> 2). Dev
  `console.warn` once when a group hits MAX_PASSES. New `FitFigure` (lone figure, group of one), `FitRows` + `useGroupFits()`
  (a card of label/value rows that stack together).
- **Adopted (guard -> 0, moved to ADOPTED):** (tabs)/transactions, (tabs)/cards, ledger-summary (count pill now
  `control`), ledger-row, amount-tile (square is a minimum via percent padding; pair stacks below the floor),
  card-face (card ratio is a minimum; name and caption wrap; network mark stays fixed, account type scales), bill-row,
  subscription-row, receipt-row, plan-detail, logo-choices, brand-field, brand-logo (monogram kept unscaled, numeric 1
  removed), bills, subscriptions, savings, salary, loan-calculator, insights, source/[id] (floating pill h-14 ->
  min-h-14). pro.tsx: the "2 MONTHS FREE" sticker now scales (control): its words are not in the card's label.
  Guard allowances 87 files 316/57/14 -> 67 files 202/15/1 (the 1 is the tab bar).
- **Test edits to existing suites:** transaction-row and destination-list helpers lay out the amount's slot instead
  of its removed copy; insights `beside` compares the text's own box past the `fit-*` boxes. Assertions unchanged.

**Not verified:** on a device: percent padding resolving against the parent's width is from Yoga's source
(Style.h computePadding with widthSize), not a trace. Card faces keep whole dollars (`cents: false`, pinned by tests),
which the spec's "always with cents" contradicts: a product call. salary and loan-calculator keep Save at the end of
the scroll (`mt-auto`), not in Screen's footer.

---

## 2026-10-07 — Dmitri (Development Lead) — review of cbe48d8 "Large text, phase 2a"

**Outcome:** SHIP-TO-PHONE. No blocking issues. Edited nothing but this log.

**Checks (tree clean at cbe48d8 while they ran):** tsc 0. Full jest 184/184 suites, 2637/2637. Prettier and ESLint
`--no-cache` clean on the 40 changed TS/TSX files.

**Verified:** The Phase 1 guarantees hold. The decision key is now in a ref, so a layout pass that only confirms the
decision draws nothing. Hug members key by text, so a new amount or date re-registers, changes the key and is judged
again. Members register before the group's first effect, so a fitting row mounts with one render; TransactionRow
draws 2 copies, for label and kind. BREAKABLE_SPACE keeps NBSP, U+2007 and U+202F inside a word, which matches what
iOS will not break at. Yoga (RN 0.86 BoundAxis.h, CalculateLayout.cpp) resolves percentage padding on both axes
against ownerWidth, so a 100% spacer gives a square tile and 56.18% gives the old 1.78 face, the same as the old
aspect ratio at default text. Card faces have had cents:false since the initial commit (20f0d89), now applied through
FitFigure. No new English (APR is a pre-existing disclosure term), no catalogue change, no module-scope t(). The edits
to existing tests are helpers only: boxOf skips fit- wrappers, and the layout events go to fit-slot instead of the
removed hug copy. Every assertion is kept. The guard only moves files from allowances to adopted.

**Non-blocking:** In Cards' two-up row, the wrapper stretches but the tile inside does not fill it, so at large text a
tile whose label wraps more ends taller than its neighbour. Give the Pressable and tile flex-1/h-full in the row.
A single-word figure below the 11pt floor would break mid-character (only at an extreme width and amount).

**2026-10-07 — Dana — follow-up to Dmitri's review of cbe48d8:** side-by-side money tiles now grow to their row's height (Pressable and surface `grow`), and a lone figure that would need to go under 11pt scrolls sideways at 11pt instead of breaking between digits (`FitText scrollWhenTooWide`, used by `FitFigure`); tsc 0, jest 184/184 suites, 2638 tests, prettier and ESLint `--no-cache` clean; pinned by the stretch-chain test in cards-large-text (Jest has no layout engine) and the 11pt test in fit-group.

---

## 2026-10-07 — Drew (Developer, money maths) — receipt parser: fixes from Dmitri's review of 29068c7

**Outcome:** Done in `SkipBudget-scan` (branch `receipt-scanning`), not committed. The review's wrong answers are fixed and each
has a unit test using the reviewer's exact input. As shipped (`next` pass, real catalogue, phone region), the confident wrong
answers fell on training (stores 11 -> 6, totals 4 -> 2) and stayed level on held-out; merchant accuracy with the catalogue rose
(training 95.6 -> 97.1). Hard-set totals fell 86.3 -> 76.3 because the largest-amount guess now needs a repeat (CEO's decision);
those are blanks, and wrong totals fell 9 -> 6. M3 (`src/api/brands.ts`) skipped on the Founder's instruction. tsc 0, eslint 0 (cache
cleared), prettier clean; parser 79 + 193 + 4, Theo's bench 58; full jest 135/135 suites, 2407/2407.

**Behaviour changed on purpose:** card/gift/new/remaining/rewards/loyalty/stored-value balances, "balance left/restant", "nouveau
solde", "solde restant", "saldo restante/disponible" are never the total; a tip row with %, "guide" or "sugg" is never added;
"PAYMENT" without a card named is money handed over; "T0TAL"/"CA5H" read as words; a total printed as a credit (refund) gives a
blank total; with nothing labelled, the largest figure only when a second row prints it. Dates: strong evidence (£, VAT, ABN,
EFTPOS, AU postcode, RFC, C.P., MXN, TPS, TVQ, (QC) / US state + ZIP, sales tax, USD) decides; then the phone; then Spanish or
French words; strong evidence both ways, or the chosen reading lying after today, leaves an ambiguous date blank (no flip); an
ambiguous pair never reads as tomorrow; DOB, birth, exchange, thru/through and "before" lines are never the purchase date.
Merchant: postcodes need a real digit, the UK shape only on a page with £ or VAT, a street word at the start needs a number (PHO BAR,
TAQUERIA EL SOL, BOULEVARD BURGER are names again). Catalogue: aliases and domains match only a whole line; a brand name inside a
longer line only from 6 letters; one-letter tolerance only against brand names of 7+ letters; no 1-character brand; footer clues
only under a weak header. Lines capped at 300 characters (a 50,000-digit line was 14.9 s, now about 9 ms) and 2000 lines;
missing text or candidates are tolerated. `ScanDraft.complete` (read by nothing) removed. Tests changed with reasons: 4 pinned
largest-amount tests (M1), 2 French "$" tests and 1 positioned "$" test now put the figure on a card line or a repeated row so they
still test the "$" rule; UK postcode test moved to a British receipt; "flip to the other reading" test now expects blank (B5).
New: `src/lib/__fixtures__/brand-catalogue.json` (372 rows of the newest brand sync migration, directory order) and the floors test
rewritten for the shipping combination with ceilings on wrong answers.

**Not done:** the add-receipt upload fallback to `recognizeText` "only on a build lacking recognizeReceipt": the module returns `[]`
for both that and "no text found", so the call site cannot tell them apart without a change in `modules/receipt-scanner` (Dilip's).

---

## 2026-10-07 — Dilip (Developer, native and platform) — review fixes B1, M6 and minors on 29068c7

**Outcome:** Done in `SkipBudget-scan`, nothing committed, no xcodebuild, no `ios/`. Swift parses; typechecks against
the iOS 26.5 SDK (stub ExpoModulesCore) with 0 diagnostics in Swift 5 mode at iOS 16.4 and 15.1; Swift 6 mode shows the
same 2 errors / 24 warnings as HEAD, all in the untouched camera controller. A Mac Catalyst build of the real module
(UIKit, stub Expo) reproduces the bench port line for line. tsc 0, eslint clean, prettier clean, full jest 135/135
suites, 2408 tests; baseline.json untouched.

**B1 (screenshots cropped to a card):** a file that records no exposure (no EXIF ExposureTime/FNumber: screenshots,
downloads, scans) whose found page is square to the frame (every edge within 0.6 degrees; cards and scans 0.06-0.45,
photographed receipts never under 0.74) is read whole first, and cropped only when no more than 24 legible characters
lie outside the page (app chrome 14-16; shop and date above an item card 60+). Camera captures and in-app camera:
unchanged. Dmitri's prototype (1.5x character test for every non-camera file) fixed his card but kept the crop on
large cards (whole/card ratio 1.32-1.34): s4/s7 lost store and date, s5 read total 18.00 for 93.63. Result: s1/s2/s3
22 lines, Blue Bottle Coffee / 23.45 / 2026-10-03 (committed and working parser); s4-s7 all right.
Bench before/after (committed parser, Theo's harness, his build-fixtures into scratch): training, holdout, hard: 0
outcome flips on next, raw/flat identical; same with Drew's working parser. Second passes: training 6 to 22, holdout
2 to 13, hard 6 to 6 (the 27 square scans and app receipts, +0.3-0.6 s each); photos unchanged.

**M6 (big JPEG decode):** past 25 MP the decode is halved or quartered (ImageIO decodes a JPEG at reduced size only for
half or less). Catalyst peak RSS / wall: 48 MP JPEG 501 MB / 2.9 s to 315 MB / 1.9 s; 80 MP 740 MB / 2.7 s to 404 MB /
1.7 s; 12 and 24 MP JPEG and all HEIC unchanged (314 / 448 MB, 165-171 MB). 48 MP small-in-frame receipts read at
12 MP: 96.7 / 98.3 / 98.3 / 93.3 vs 25 MP 93.3 / 95.0 / 100.0 / 90.0 and full 95.0 / 91.7 / 98.3 / 86.7 (lines 2779 /
2807 / 2773).

**Minors:** transparent PNG put on white (0 to 28 lines). Temp JPEG no longer written by the camera or the document
scanner (50-170 ms and a 0.7-2.3 MB file per scan, read by nothing in src); `imageUri` stays in the result as null.
New `hasLayoutRecognition()` in modules/receipt-scanner/index.ts (+ test) for the add-receipt fallback.

**Not verified:** a device; whether real photos picked from Photos keep ExposureTime (iPhone files do; a photo whose
EXIF was stripped takes the non-camera branch, which only differs for square pages); 12 and 24 MP JPEG uploads still
peak at 314 / 448 MB on the Mac (the shipping camera path peaks at 408 MB on a 12 MP shot there).

---

## 2026-10-07 — Dana (Developer, UI and navigation) — voice review on the shared final page

**Outcome:** Done in the main tree (branch almost-done-all-pages), nothing committed or staged. `/voice-review` now renders
`EntryReview` and reads like the add forms' final page; every behaviour kept. Owned suites 7/7 green (238 tests:
voice-review 58, voice-review-extra 10, voice-review-languages 14, voice-edit 26, voice-edit-languages 22, voice-draft 79,
add-forms-from-voice 29); with the voice/lib/guard set 16 suites, 656 tests. Neighbours untouched by me still green: i18n,
all add-receipt/bill/subscription suites, components (42 suites, 900). tsc 0 (whole project), ESLint clean (cache cleared),
prettier clean. No simulator (not mine).

- **Page:** topSlot = question (VoiceOver focus kept; runs after EntryReview's title focus so it wins), "You said", "Add as"
  chips, "guessed" hint. Ambiguous amount = amountSlot chooser (never guessed); unset amount = EntryReview's gap. Rows per
  kind with the forms' own labels: receipt Store / Date (+Today, Yesterday, Pick date) / Paid with / Note; bill Name /
  Category / Due on / Recurring (+chips) / Paid with / Note; subscription Service / Billing cycle (+chips) / Next renewal /
  Charged to / Note. No reminder row (voice saves none). LogoConfirm = bottomSlot. Footer: blocker or failure line as
  `error`, Save, then Say it again + More options. `root={!edited}`. A chip already lit writes nothing (back does not ask).
- **Draft:** `VoiceEntry.note` (trimmed, <=200, empty -> null, refused whole past 200), kept through a kind change, into
  all three builders; `scannedNote` / `prefillNote` out, `readNoteParam` in (bad -> '', never cut); the three forms seed
  their note from it (one-line edits in add-receipt, add-bill, add-subscription).
- **/voice-edit:** `field=source` (PaidWithEditPage) and `field=note` (NoteEditPage); other four pages unchanged except the
  date page title follows its row ("Date", "Next renewal"). EditShell on TEXT_CAP roles; both route files moved to ADOPTED
  in the large-text guard. `FieldPage`/`PaidWithEditPage`/`NoteEditPage` gained an optional `error` (additive) so a failed
  Done still says FAILURE_MESSAGE.
- **Removed:** 6 voice strings nothing uses now (receipt/subscription date labels, the old amount block's four lines).
- **Tests:** voice-edit stale test now awaits `unmount()` (RNTL 14 is async; un-awaited it broke every later render).

**Not verified:** on a device. Open: hint text now draws in danger red via `error`; `components/voice/review-row.tsx`
(`ReviewRow`) is dead code (only `GlyphWell` is used); the source/note voice pages have the edge swipe off (FieldPage),
the other voice-edit pages keep it.

**2026-10-07 — Dana — follow-up for the inline store fields:** tests only. `add-forms-from-voice` now reads the store /
service / company as the inline box on the final page ("Change store, currently <name>", logo, "Filed under", empty box
for nothing heard; the receipt store is searched for in place after a focus, no page). The bill's logo now shows twice
(company box and Name mark). `voice-review` pins the blocker as Save's accessibility hint with no failure line. `jest voice
add-forms-from-voice large-text` 23/23 suites, 717 tests; tsc 0; ESLint and prettier clean. Suspected copy bug: BrandField's
clear button says "Change store, currently …" on a subscription's Service and a bill's Company too.

---

## 2026-10-07 — Dmitri (Development Lead) — adversarial review of the Pro/Free upgrade (b2a6dcd..b02eefa + uncommitted caption removal)

**Outcome:** FIX-FIRST. Read-only review; no code touched. tsc 0; touched suites 34/34 (475 tests); full jest 202/202
(3617); ESLint `--no-cache` and prettier clean on the 72 changed files. SQL, device and RevenueCat sandbox not run.

**Fix before the phone build:** (1) Savings "Saved so far" and "across N months" sum only the free window
(src/app/savings.tsx:46-51) while the Cards tab Savings tile sums every month ((tabs)/cards.tsx:96): two savings
totals, and a lapse shrinks one. (2) Pro page exit: `claim_pro_offer` has no deadline while the edge swipe is off, so a
stalled network leaves the chevron dead (pro.tsx:110-123). (3) `ready` turns true on the SDK's "no" alone
(api/pro.ts:181), so a payer whose Pro is only on the server row can flash initials, cut lists and paywalls.
**Founder ruling needed:** period totals labelled Year/All (Activity, Bills, Subscriptions, Receipts) are 90-day sums on
free. **Also open:** free still gets brand logos in rich pushes (send-push/card.ts:84-100); free no longer remembers added
stores (brand-field.tsx:200-210); offer timer anchored on mount and deep-linkable; offer page lacks Restore; DB wall
is insert-only; migration must be live before the build; Fake Free never exercises the DB wall.

## 2026-10-07 — CEO — Dmitri's FIX-FIRST findings resolved

Savings total counts every month (list cut only). Period headings (Activity, Bills, Subscriptions, Receipts) sum the
whole window as Pro sees it; rows stop at 90 days (useLedger exposes `allEntries`; Founder can flip this). Offer claim
has a 3 s ceiling; a lone SDK "no" now waits for the entitlements row (8 s ceiling). Offer deadline travels as `until`
(remount-safe, typed links close), Restore + "renews automatically" line on both purchase pages, "half price" only when
the store's prices are about half, no dollar guess beside a store price, Stack.Screen also on the Pro view. Logos: a
grey circle while the plan is unknown (no fetch, no flash); free remembers added stores; the pencil goes straight to the
logos explainer. A refused capture recounts the month. Migration: receipts_keep_origin freezes source/created_at on
update; count repeats the partial-index predicate (26 local checks, fresh `db reset` clean). Week trials read in days.
Free window is exactly 90 days. Open for the Founder: logos in rich pushes (send-push deploy); keeping a refused scan
as a typed receipt.

**2026-10-07 — Dmitri — re-review of a388394 (fixes from the review):** FIX-FIRST on one small item, then
ship to the phone (migration live first). Read-only; tsc 0, full jest 203/203 (3633), ESLint `--no-cache` and prettier
clean on the commit's files. Verified fixed: Savings total, whole-window headings (Activity, Bills, Subscriptions,
Receipts), 3 s claim ceiling, ready waits on a lone SDK "no", offer `until`/Restore/renews/half-price, grey logo circle,
free remembers stores, recount after refusal, 90-day floor, week trials in days, receipts_keep_origin (no app path
changes source on edit). Remaining: (1) period-labelled sub-figures still sum only listed rows on free (plan-detail
"Paid" caption, receipt detail store-history caption, Activity bucket that straddles the floor); (2) entitlement query
inherits retry 1, so a hung network holds every free gate ~17 s (offline fails fast); (3) LogoConfirm still looks up
while the plan is unknown; (4) `hidden` ignores income; nits on `until` trust, isHalf default, inline Stack.Screen options.

## 2026-10-08 — Dmitri (Development Lead) — review of 6a914ce (one-off pay, "Just this time")

**Outcome:** FIX-FIRST on two small items. Read-only; no source touched. pay/date/salary-one-off jest 34/34;
supabase/checks/one_off_pay.sql ALL CHECKS PASSED; lapsed-Pro path exercised as `authenticated` on the local DB
(rolled back); 7,000-case fuzz of `incomeForMonth` vs `public.income_for_month` vs exact rational arithmetic.

- **Fix 1 (money):** server rounds a half cent down when 2+ weekly/biweekly schedules sum to exactly x.xx5,
  because each `monthly_from_salary` term is a separately rounded numeric division. App matches exact maths in
  every case; SQL was 1 cent low in 23 of 7,000 (about 1 in 300 two-schedule users). Fixture: weekly 0.17 +
  biweekly 5,723.39 -> exact 12,401.415 -> app 12,401.42, server 12,401.41. Fix: sum amount x pays-per-year and
  divide by 12 once in income_for_month (and v_monthly_income); add the fixture to the checks.
- **Fix 2 (Pro rule):** salary.tsx changeFrequency gates on the frequency on screen, not the saved one. A
  lapsed Pro with 2+ schedules who taps "Just this time" on a saved schedule cannot tap back (sent to
  /pro-feature). If they Save, the DB refuses the reverse change and the schedule's income goes from every past
  month's savings record (local: Aug 6,766.67 -> 2,000.00). Gate only rows saved as one-off or new.
- **Founder question:** earlier one-off pays cannot be corrected or deleted: hidden from the editor, and the
  Activity row links to /salary where they are not shown (breaks ledgerHref's "never route somewhere
  approximate").
- **Low:** Save order can refuse a legal swap on free; 168 h/week cap applies to a one-off's hours worked;
  link-all-salaries links one-offs to a new account; Settings "Payday: Not set up" and the delete tally ignore
  one-off pays; next_payday still has no pinned search_path. Ops: apply 100001 and 100002 as separate
  transactions, and make them live before the build.
- **Verified OK:** savedIds holds shown rows only (hidden one-offs never deleted, month-rollover remount safe);
  local yyyy-mm month logic matches server ranges; next_payday/getNextPayday/paydaysInRange for 'once';
  privileges on income_for_month and the trigger; enum split recorded by the CLI; lapsed-Pro edits and one-off
  adds pass the trigger.

---

## 2026-10-08 — Dana (Developer, UI and navigation) — large text, phase 2b-1 finished: tests in three languages, gates

**Outcome:** Done on `almost-done-all-pages` (048ca72), uncommitted, on top of the 2b-1 work the CEO carried over. No
bug in component behaviour found; two comments corrected. tsc 0; `rm -rf .expo/cache/eslint && npx expo lint` 0 errors
(1 known warning, setup.test.tsx); `npx prettier --check .` clean; full `jest --ci` 212/212 suites, 4031 tests (was
206 / 3726: 6 new suites, 1 extended, +305 tests). No device or simulator run.

- **Conflict check (CEO's merge):** salary.tsx footer holds the error line above Save; "Add another source" (mt-4) and
  "Add a one-off" (mb-4 mt-3) end the scroll; loan-calculator Save in the footer, schedule card last with mb-4;
  category-picker import path fine; guard ADOPTED list matches (review-row gone, entry-review already clean). All OK.
- **New suites** (widths summed from the Montserrat TTFs' advance widths, by a scratch script, no kerning):
  `filter-actions-large-text` (56): all four filter pages x en/es/fr x 1/1.4/3.1x at 375pt. Activity stacks at 1.4x in
  es/fr only ("Borrar todo" 139pt, "Tout effacer" 145pt vs 105pt), Apply first; holds stacked; returns beside when the
  text size drops; label measured whole; both buttons press. `category-picker-large-text` (19): two-up/one-column and
  one shared size per group, en/es/fr at 375/320pt: at 375pt 1.3x English names shrink together to 0.9
  ("Transportation"), es/fr unshrunk; at 320pt English goes one column while es/fr stay two-up (es hints 0.79,
  "estacionamiento"). `settings-row-large-text` (16): real About page in 3 languages (version stays beside), value
  moves under the title per language's widest word (fr at 120pt, es at 100pt), holds, switch rows never move.
  `app/loan-calculator-large-text` (12): Save outside the scroll and saves; sliders beside in all three (French
  "25 000 $" pill counted); all rows stack together and hold through a keypad change to 900,000; readouts unbroken
  (no-break spaces). `app/salary-large-text` (6): Save and the "why not" line in the footer, Add a one-off last in
  the scroll. `shared-controls-large-text` (180): all 33 adopted components and the 4 sheets x en/es/fr at 1.4x: no
  line limit/shrink/ellipsis, every ceiling a TEXT_CAP value, role spot checks, no fixed height around growing text,
  no raw key or {param}, and nothing left in English on es/fr screens beyond listed names, figures and shared words.
- **Extended:** `ui-dialogs-language` (+16): ConfirmDialog pair x en/es/fr x 1/1.2/1.4/3.1x (fr stacks from 1.2x,
  es from 1.4x, en never); AppLockGate in es and fr, live language change while locked.
- **Mutations** (each restored byte-for-byte): one-line cut on chips, hard-coded "Unlock", numeric ceiling, OTP back
  to h-14, Reset not measured whole, dialog back to the 12-character guess, grid ignoring the label group, labels
  never shrinking, sliders/settings value never stacking, Save back in the scroll (salary, loan): every one fails.
- **Fixed:** date-picker and inline-calendar comments said the widest short month is French "sept." at 49pt; it is
  "mars" when chosen, 50.6pt (still inside the 56pt circle and the 52pt pill). Comment only.
- **Translations:** none missing; every 2b-1 line comes from t() (catalogue enforces en/es/fr at compile time).
  Same-word lines allowed after checking: fr "Minute", "Date", "Version", "OK"; "Internet" in es/fr; voice hints
  stay English by design.
- **Not verified / notes:** no device. Font widths are advance sums, so French Activity Reset at default size fits
  its third by about 1pt and could stack on a phone; stacked is the safe side. Side-by-side Reset has no horizontal
  padding (as before 2b-1), so a near-full label runs close to the pill's ends: for Tia's walk. SettingsRow switches
  per row, not per section (only About › Version has a value). "Worker failed to exit" appears in the full run
  without the new suites too (pre-existing, e.g. salary-languages' Sentry timer); the new suites mock Sentry.
- **2026-10-08 — Dana — Dmitri's two test fixes (SHIP review):** shared-controls' same-word allowlists are now per language (names and figures in both; "Date", "Version", "Minute", "OK" French only; "7.50%" Spanish only), and the VoiceHints note must be translated in es/fr while the English examples stay allowed; mutations (English "Date", "Minute", "Version", note hard-coded or left English in es) now fail and passed under the old lists; filter-actions padding left for the Founder; tsc 0, lint 0 errors, prettier clean, jest 212/212 suites, 4033 tests.

---

## 2026-10-08 — Dmitri (Development Lead) — review of large text phase 2b-1 (uncommitted on 048ca72)

**Outcome:** SHIP. No blocking issues. One es/fr layout risk is worth fixing before Tia's walk; it is a design call (Priya), and the layout it comes from was already there before 2b-1. Edited nothing but this log.

**Gates (on the working tree as handed over):** tsc 0. `rm -rf .expo/cache/eslint && npx expo lint`: 0 errors, 1 known warning (setup.test.tsx). Prettier clean. Full `jest --ci`: 212/212 suites, 4031/4031. The "worker failed to exit" warning was already there before 2b-1: the six new suites run on their own without it.

**Verified:**
- Carry-over matches Dana's paused work in logo-service. I compared patch lines, not files. The only differences are prettier reflow, her two comment fixes, and the salary conflict.
- Salary: Save and the error line are in Screen's footer. "Add another source" keeps mt-4, and "Add a one-off" (mb-4 mt-3) ends the scroll. salary-one-off.test.tsx (add a one-off, the earlier one-offs row, saving and deleting) passes with Save in the footer.
- Guard: 32 files removed from ALLOWED and 33 added to ADOPTED (the 32 plus filter-actions.tsx). review-row was dropped because the file is gone. Its replacement, entry-review.tsx, has no line limits and uses only TEXT_CAP.
- Nothing is cut. In the 2b-1 files, allowFontScaling={false} is left only on spec-listed text (slider tick labels, the network mark, calendar initials and days). The remaining h-* boxes hold icons or bars, not text. TEXT_CAP roles match the spec table, with one exception (VoiceHints, below). Accessibility labels are intact; FilterActions' Reset gained a translated label.
- Font widths: I checked Dana's widths with my own reader of the Montserrat TTFs. They are exact advance sums: "Tout effacer" 103.55, "Borrar todo" 99.53, "Supprimer" 82.29, "Transportation" 105.35, "mars" SemiBold 38.92 (50.6 at 1.3x), "p. m." 34.47, "confidentialité" 110.53.
- French money is formatted by hand in src/i18n/number.ts with a literal no-break space, so the phone draws what the tests check.
- First frame inside a Modal: RN 0.86.2 ModalHostViewState() takes ModalHostViewScreenSize() synchronously, so the dialog and the filter pages measure correctly on their first layout.
- Mutations, run in a scratch copy with the real tree untouched; every one was caught:
  - Reset measured by its widest word: 2 failures (es, fr).
  - SettingsRow never stacking: 4.
  - The dialog back on the 12-character guess: 6.
  - "Reset" left in English on screen: 14.

**Non-blocking:**
1. `src/components/ui/filter-actions.tsx:28-29`: when the buttons sit side by side, Reset has no horizontal padding, so its fit is judged against the full width of a rounded pill. On a 375pt phone at default text, French Activity's "Tout effacer" fits its third by about 1pt and sits about 1pt from the border, touching the curve at cap height. Spanish "Borrar todo" has about 3pt. The text is whole, not cut.
   - Suggested fix: 'min-w-0 flex-1 px-2'. In the test, set ROOM.beside.reset to 89.67 and expect Activity es/fr 'stacked' at 1x. Jest injects slot widths, so the test cannot see padding by itself.
   - Effect: es/fr Activity stacks on phones up to about 393pt. Nothing else changes ("Effacer" at 1.4x is 84.9pt, under 88.67).
2. `src/components/voice/voice-hints.tsx:42-47`: the example sentences take TEXT_CAP.heading. The 1.3 value is deliberate (they sit in the pinned footer), but the role label is wrong: the spec puts sentences under `reading`. Priya should sign off on it. Also, the shared-controls test allows every VoiceHints line (`same: /./`), so the translated "English only" note on es/fr is not asserted.
3. The shared-controls same-word allowlists (Date, Version, Minute) apply to both es and fr. Those words are French only, so a Spanish leak of "Date" or "Version" would pass. Make the lists per language.
4. Small changes outside the brief, all harmless:
   - hitSlop 10 on the clear-date link (two filter pages);
   - min-h-11 on DatePicker's "back to months";
   - the dialog's Cancel link changed from Medium to SemiBold. The comment explains why: the measured width must not change between layouts.
5. SettingsRow measures every row, including switch and chevron rows that have no second layout. That is wasted layout work on Settings. It could skip the FitGroup when there is no value.

**Ruling on SettingsRow per row vs per section:** leave it for later and do not change it in this commit. Today the result is identical: About › Version is the only row with a value, and About is a single card with no SettingsSection. A section-level group would pull switch and chevron rows into a decision they cannot act on.
- Trigger: the first time a card gets a second row with a value. Then wrap the card in FitRows and have SettingsRow read useGroupFits() (the SliderRow pattern). Decide the stacked order then too: today it is title, value, subtitle.
- Record it in large-text.md as a known deviation.

**Device only (Tia):**
- The French Activity filter pair at 375pt and default text (item 1).
- No visible jump from side by side to stacked when the dialog or a filter page opens in fr at 1.2x or larger.
- AmountPad keys inside the new ScrollView: fast taps at default text, and scrolling at AX3 on an SE with Done in view.
- Salary with the keyboard up: the field scrolls clear of the keyboard with the footer present.
- Dragging the loan amount slider in fr at AX3: the rows stack at most once and then stay.
- "mars" selected in the date circles at AX3.
- The longest dialog (delete account) in fr at AX3 on an SE fits on screen; the card does not scroll.
- All widths are advance sums without kerning, so real labels run slightly narrower.

---

## 2026-10-09 — Drew (Developer, money maths) — spending habits week maths (`src/lib/habit-week.ts`)

**Outcome:** Done, uncommitted. I wrote the pure module and its tests. Only my two files were touched. jest `src/lib/habit-week.test.ts`: 58/58 passed. The same suite also passed 58/58 under 12 timezones (New York, Los Angeles, London, Paris, Sydney, Chatham, Santiago, Sao Paulo, Beirut, Kolkata, Kiritimati, Pago Pago). Prettier and eslint are clean on both files. tsc reports 113 errors, all in `src/data/habit-icons.ts` (another agent's work in progress: habits message keys not registered yet). None are in my files. Per the CEO I ran only my own suite, not the full `npm test`.

- **Files:** `src/lib/habit-week.ts` and `src/lib/habit-week.test.ts`. The tests sit next to the code, like the other 30+ lib tests (there is no `src/__tests__/lib`).
- **Exports:** `weekStartOf`, `weekDays`, `shiftWeek`, `isCurrentWeek`, `earliestWeek` (null when there are no habits), `dayState`, `tapsForHabit` (an extra: one habit's taps by day, for the circles and the undo), `savedInWeek`, `savedAllTime`, `spentInWeek`, `skipStreak`, `formatWeekRange`. Types: `HabitMaths`, `HabitTap`, `DayState`.
- **How it works:**
  - Dates are counted as whole days, using UTC only as a calendar (no DST), so the device timezone never moves a day.
  - Money is added up in whole cents with `toCents` and converted back once at the end with `fromCents`. Results are in currency units (like `sumMoney`), not cents.
  - Anything that is not a real `YYYY-MM-DD` date throws a RangeError. That includes timestamps and "2026-02-30".
- **Semantic edges I decided:**
  - A tapped day is always 'tapped', even before the start, today or in the future.
  - 'future' takes priority over 'before'.
  - Any day of a week stands for that week in every week function.
  - Saved counts each tapped day once.
  - Spent counts every distinct receipt, but a receipt listed twice counts once.
  - savedAllTime ignores taps whose habit is not in the list, and counts a habit listed twice once.
  - The streak ignores taps made today, in the future, or before the start.
  - In formatWeekRange, no-break spaces keep each end and the dash together, so the label can only wrap after the dash. es/fr put the day first; the code branches on the current language.
- **Mutations** (each restored byte-for-byte): 14 tried, all caught. They were: week starting on Sunday, today counted in saved and in the all-time total, float sums for spent and for saved, no receipt dedupe, today counted in the streak, the start ignored by the streak, 'tapped' not checked first, plain spaces, French with the month first, local-time day maths, no date validation, and a habit listed twice counted twice.
- **Open:**
  1. Should the hero's "Spent this week" include receipts of archived habits? `spentInWeek(taps, week)` counts every tap passed in; `spentInWeek(taps, week, activeIds)` counts only the active habits.
  2. "Saved uses the current price" means a price edit restates all past saved figures.
  3. UI tests must match the no-break spaces in the range label, not plain "Oct 5 – 11".
  4. Diego: pass `purchased_on` and `started_on` as plain dates; a timestamp throws.

---

## 2026-10-09 — Dana (Developer, UI and navigation) — spending habits: 100 icons, registry, HabitIcon, names in 3 languages

**Outcome:** Done, uncommitted. All 100 Founder icons are app assets with a typed registry, `<HabitIcon>`, and en/es/fr names. Pia's 13 category tints and her 6 dark habit tints are applied. No screens were built (they wait for the Founder). Gates: tsc has 0 errors in my files; the only 3 errors are in Diego's in-progress `src/__tests__/api/habits.test.tsx` and `habit-receipts.test.tsx`. eslint 0 and prettier clean on my files. jest `src/__tests__/habits` 2 suites, 20/20; `src/i18n` 10/10 suites; the no-splits, large-text-guard and no-route-test-files guards pass. No device or simulator run.

- **Assets:** `assets/habit-icons/<category>/<slug>.svg`: 13 folders, 100 files, 370,569 bytes (362 KB; 520 KB on disk). The originals were 411,170 bytes. Every original was already clean: viewBox `0 0 96 96`, and only path, rect, circle, ellipse and g. There is no `<style>`, filter, mask, gradient, `<use>` or CSS class. No icon needed fixing. The copies went through svgo 3.3.5 (already in node_modules) with the transformer's own config, which keeps the viewBox. That saved 9.9%. Quick Look renders at 384px are identical, with at most 3/255 per channel of anti-aliasing. All 100 go through react-native-svg-transformer/expo plus Expo's Babel transformer cleanly. The Desktop originals were not touched.
- **Registry:** `src/data/habit-icons.ts` exports `HABIT_ICON_CATEGORIES`, `HABIT_ICONS` (flat), `habitIcon(id)`, `FALLBACK_HABIT_ICON` (goals/other, "Other"), `HabitIconDef`, `HabitIconCategory` and `HabitIconCategoryId`. `HabitIconDef.id` is typed `HabitIconId`, the union of the 100 ids, so a preset table with a typo in an icon id fails tsc.
  - Category order puts spending first: food-dining, transport, shopping, entertainment, health, fitness, wellness, home-bills, family-pets, relationships, learning-growth, finance, goals. Icons in each group are alphabetical. Pia's tints were assigned in this order.
  - spendCategory follows the brief's map exactly.
- **Art module:** `src/data/habit-icon-art.ts` was generated. It imports by relative path because Jest's `@/` mapping stops at src/. Jest therefore resolves every file, and a missing drawing fails the suite. It is a separate module so component tests can stand the drawings in.
- **HabitIcon:** `src/components/habits/habit-icon.tsx`: `<HabitIcon iconId color size={44} />`. The circle uses `habitColor(color).tint[scheme]` (from useTheme) and the SVG is at 60%. An unknown id draws the fallback. It is hidden from accessibility (`accessible={false}`, elements hidden).
- **i18n:** `src/i18n/messages/habits.ts` has 113 keys: `habits.category.<camelId>` and `habits.icon.<camelGroup>.<camelName>`. It is registered in `messages/index.ts`. No area-count test existed (messages.test counts keys and passes).
  - English uses the file names. Category headings keep the Founder's Title Case, like the existing category labels.
  - Spanish is Mexican (Botanas, Refrescos, Renta, Plan de celular). French is Canadian: Magasinage, Stationnement, and meals Déjeuner (breakfast), Dîner au resto (lunch out), Souper au resto (dinner out).
- **habit-colors.ts:** only the 6 dark tints were changed, to Pia's section 9 values (the brief allows Dana to add dark values).
- **Tests:** `src/__tests__/habits/habit-icons.test.ts` (14) and `habit-icon.test.tsx` (6).
  - They check: 13 groups in order, 100 unique ids, every id resolves, and the 10 preset icons.
  - Labels follow the id, exist in en/es/fr, and no two icons share a name in any language.
  - Every spendCategory is in the migrations' spend_categories inserts, and the brief's map is pinned.
  - Files on disk match the ids one to one. Each art entry imports its own file. The SVG rules: viewBox, plain shapes, no CSS.
  - HabitIcon: light and dark tint, size 44 with art 26, size 56 with art 34, fallback, and hidden from accessibility.
  - 9 mutations, each restored byte for byte, were all caught: swapped drawings, groceries filed as dining, an unknown spend id, a `<style>` in a file, the light tint in dark mode, a duplicate French name, no fallback, the drawing at full size, and a missing file.
- **Open:**
  1. The brief files Finance, Goals, Relationships and Family (except pets) under `other`. The DB also has utilities, telecom, insurance and finance, which fit electricity/water, internet/phone, insurance/health insurance and bank fees/credit card. I followed the brief; this is a CEO/Founder call.
  2. Pia's section 9 also darkens the caramel, coral and green fills and adds `HabitColorDef.ink`. Neither is applied (the CEO owns the file).
  3. In dark mode the navy outlines (#39426a) fade on dark tints: bike and cycling wheels, the meditate stones, the workout plates and dental. They are still recognisable. This is for Pia and Tia.
  4. The preset names on screens should use the same meal words. Suggest adding them to the playbook glossary.
  5. Pia's `habits.icon.question` shares the `habits.icon.` prefix with the labels. There is no collision.

---

## 2026-10-09 — Diego (Developer, data and backend) — Spending habits: data layer

**Outcome:** Done, uncommitted, not pushed. Migrations are local files only. Both migrations were applied to a scratch copy of the local DB. `supabase/checks/habits.sql` ran there as `authenticated` with RLS on and printed ALL CHECKS PASSED; the copy was then dropped, and the real local DB was never changed. tsc: 0 errors across the whole tree. eslint is clean on my files. New suites: 2 suites, 41 tests. Affected existing suites: 36 suites, 997 tests, all passing.

- **Migrations:**
  - `20261009100001_capture_source_habit.sql`: the enum value only.
  - `20261009100002_habits.sql`:
    - The `habits` table, with checks: name trimmed and non-empty, icon present, colour one of the 6, price > 0, at most one of card or account. The card and account FKs are `on delete set null`.
    - `started_on` is NOT NULL with no default. The server does not know the person's week, so the phone must send `weekStartOf(today)`.
    - Owner-only RLS, plus explicit grants to authenticated and service_role. Default privileges no longer reach new tables (see auto_expose_new_tables in config.toml).
    - updated_at trigger, and a trigger that only the person's own card or account can be named.
    - Pro INSERT trigger with the message "Tracking spending habits is part of Skip Pro." It is skipped when auth.uid() is null.
    - New column `receipts.habit_id` (FK, `on delete set null`) with a partial unique index `receipts_habit_once_a_day`, and a check that a receipt can only name the person's own habit.
    - A rename trigger, AFTER UPDATE OF name: the new name is written to that habit's receipts as `merchant`.
    - `habits` is added to supabase_realtime.
  - `enforce_scan_is_pro` passes 'habit', and `keep_receipt_origin` keeps it on edit. Both were checked on the DB.
- **`src/api/habits.ts`:** `useHabits`, `useHabit`, `useHabitTaps`, `useCreateHabit`, `useUpdateHabit`, `useArchiveHabit`, `useTapHabitDay`, `useUntapHabitDay`, plus the pure helpers `habitTapValues`, `readHabit` and `habitMaths`.
  - Taps are cached under `['receipts', uid, 'habit-taps']`, so any receipt write refreshes the circles.
  - Taps are read in pages using the exact count, because PostgREST caps a response at 1,000 rows.
  - A 23505 on a tap resolves to `{ alreadyTapped: true }` together with the existing receipt's id.
  - Any read error is thrown, 42P01 included.
- **Joins:**
  - `ReceiptRow` gets optional `habit_id` and `habit`.
  - Receipt reads embed `habit:habits(name, icon_id, color)`. If the habit read fails with PGRST200, or with 42703 naming habit, they read again without it, the same way the logo columns fall back.
  - `LedgerEntry.habit` (type `HabitMark` in `src/lib/card-ledger.ts`) is set on receipt entries and carried through the money book, so the card activity page gets it too.
  - `CaptureSource` gains 'habit'. `DEPENDENTS` for cards and accounts gains 'habits'.
- **Not verified:** the PostgREST embed against a live PostgREST (only mocked), and no device run.
- **Open:**
  - The realtime provider line `habits: ['habits']` is left out on purpose. A binding to a table that does not exist may fail the whole channel, so add it only once the migration is live.
  - The receipt reminder treats a habit tap as "a receipt added today".
  - `useReceipts` itself is still capped at 1,000 rows, and taps fill that cap faster.
  - Re-dating a habit receipt onto a day that is already tapped gets 23505, and the edit page shows the generic failure.
  - zod is not a dependency, so the boundary checks are written by hand.
- **2026-10-09 — Diego — follow-ups after the Founder's design review:**
  - `habits.saved_from date not null` added to `20261009100002_habits.sql` (edited in place; it has not been pushed). A new check, `habits_saved_after_start` (saved_from >= started_on), backs it.
  - `HabitRow`, `HabitValues` (required on create), `readHabit` and the select now carry `saved_from`. `habitMaths(row)` maps it to Drew's `HabitMaths.savedFrom`; the name matches, so tsc reports 0 errors across the tree.
  - New migration `20261009100003_receipt_reminder_ignores_habits.sql`: `receipt_reminders_due()` is re-created, adding one line (`and r.source <> 'habit'`), checked by diff. Privileges are restated. It goes after the enum file because the SQL body names 'habit'.
  - `habits` stays out of the realtime provider for now.
  - `supabase/checks/habits.sql` was updated for saved_from and the reminder, but **not run**: Docker stays off on the CEO's instruction, and there is no Postgres outside Docker. The SQL was reviewed by hand only.
  - jest: habits 34 tests, habit-receipts 9; with logo-columns, ledger-window and money-book-hooks, 161 of 161 pass. Prettier and eslint are clean on my files.
- **2026-10-09 — Drew — Saved counts from the creation day (Founder design review, item 6):**
  - **Change:** `HabitMaths` gains `savedFrom` (the local day the habit was created). savedInWeek, savedAllTime and skipStreak now count from max(startedOn, savedFrom) to yesterday.
  - **Unchanged:** dayState still uses only startedOn, so Monday up to the creation day stays 'open' and can be back-filled. spentInWeek is unchanged.
  - **New fixtures (9 tests):** a habit created Thursday saves 0 until Thursday is over. A back-filled Tuesday adds 5.50 to spent but nothing to saved. Thursday to Sunday saves 20, and with a second habit the all-time total is 55. The streak starts on Thursday. Also covered: a creation week that crosses the year end; a creation day before the start (counting begins at the start); a creation day after today (saves 0); and an invalid creation day (throws).
  - **Results:** jest 67/67, and 67/67 under 7 timezones. 6 new mutations, all caught. tsc exit 0, with no errors in any file. Prettier and eslint are clean on both files.
  - **Integration:** Diego's `habitMaths(row)` already maps saved_from, and his check constraint (saved_from >= started_on) matches the max.

---

## 2026-10-09 — Dana (Developer, UI and navigation) — spending habits, build B: /habit-new (create + edit), presets, icon picker

**Outcome:** Done, uncommitted. `/habit-new` covers Pick → Price → Confirm, Add my own (name → icon → Price), and edit mode `/habit-new?id=` with Delete. The Confirm preview is build A's real `HabitCard` (interactive={false}). Gates: tsc has 0 errors in my files; the only 4 errors in the tree are in build A's `src/__tests__/habits/habit-card.test.tsx` (TS2339 on `never`, lines 90/183/202/265). Prettier is clean and eslint (cache cleared) is clean on all 16 files I touched. My 5 suites plus the guards (large-text, no-route-test-files, no-splits) and `src/i18n/messages.test.ts`: 9 suites, 81/81. Existing suites for the shells I touched (step-flow, add-receipt, add-receipt-save, add-bill, add-subscription, source-payment, voice-review, ui-fields-language, shared-controls-large-text): 9 suites, 756/756. Mutations: 22 tried and 22 caught, each file restored byte for byte. No device or simulator run.

- **New:**
  - `src/app/habit-new.tsx`
  - `src/data/habit-presets.ts`: 10 presets, `presetPrice`, `presetChips`, `habitPreset`, `OWN_HABIT_CHIPS`; MXN is x10.
  - `src/components/habits/habit-preset-grid.tsx`
  - `src/components/habits/habit-icon-picker.tsx`: also exports `iconColumns`.
  - `src/components/habits/habit-color-swatches.tsx`: also exports `habitColorName`.
  - `src/i18n/messages/habit-flow.ts`: area `habitFlow`, en/es/fr. The catalogue test requires each key to start with its area's name.
  - Tests: `src/__tests__/app/habit-new.test.tsx` (34), `habit-new-languages.test.tsx` (7), `src/__tests__/habits/habit-presets.test.ts` (7), `habit-icon-picker.test.tsx` (11), `habit-preset-grid.test.tsx` (7).
- **Edited (all backward compatible):**
  - `step-flow.tsx`: `StepIndicator` is exported. New optional `root` prop, defaulting to `current === 0`, so Add my own's name and icon pages (step 1, but not the first page) do not let a swipe drop the flow.
  - `entry-review.tsx`: new `progress` prop, which draws the dots under the header.
  - `text-field.tsx`: `autoFocus` passes through.
  - `messages/index.ts`: registers `habitFlow`.
  - `messages/toast.ts`: `toast.habit.added/updated/deleted`.
- **Save payload:**
  - name is trimmed.
  - `category_id` is the icon's spendCategory. On edit it is sent only when the icon changed, so an icon unknown to this build keeps its category.
  - The card goes to `card_id` and the account to `bank_account_id`; Skip sets neither.
  - On edit, an unchanged Paid with keeps the saved columns, so a card a lapsed plan no longer lists is not dropped.
  - `preset_id` is null for Add my own.
  - `started_on` = `weekStartOf(today)` and `saved_from` = today.
  - `sort_order` = lowest active - 1, so the new habit sits on top.
- **Pro:** a refusal pushes `/pro-feature?id=habits` only when the app also thinks the account is free (the add-receipt rule). If the app thinks the account is Pro, the refusal shows the failure line. Edit and delete are never gated.
- **Deviations:**
  1. Step 1 has no "Pick one, or add your own." subtitle, following the approved mock. It is one line to add back.
  2. On the Price page, Continue (and Done on the Price line's page) sits above the keypad, as in the mock and the brief. add-receipt's amount step has it below.
  3. Add my own's chips are x10 in pesos too (50/100/200).
  4. The edit-mode preview shows the habit's real days (`useHabitTaps`).
  5. The Habit line's page does not autofocus, so the keyboard does not cover its Icon row. The create path's name page does autofocus.
  6. The swatches share the row width (justify-between) instead of a fixed 12pt gap. 6x40 + 5x12 = 300pt does not fit the 295pt inside a card at 375pt.
- **Open:**
  - A lapsed account editing a habit paid with a card it can no longer list sees no pill selected; the saved card is kept.
  - Spanish and French are my own (playbook glossary words; Canadian déjeuner/dîner/souper matched to the icon names). New words not yet in the glossary: es "Antojos", "Botanas", "energizantes"; fr "Gâteries", "Restos", "Applis".
- **2026-10-09 — Dana — CEO call, the create path is gated at its start:**
  - `habit-new.tsx` calls `useProGate('habits')` and applies it only when there is no `id`. A free account redirects to `/pro-feature?id=habits` before Pick. While Pro is unknown nothing is drawn, as `useProGate` does. Edit mode stays open to every plan.
  - The Save-time refusal handling stays as the backstop. With the gate in front, it is reachable only if the gate lets a free account through.
  - New tests (habit-new.test, now 39):
    - free + create → explainer;
    - unknown → nothing drawn, then Pick;
    - Pro + create → Pick;
    - free + edit → edit page;
    - a lapse partway through → explainer;
    - the backstop test now opens the gate on purpose.
  - Two mutations of the gate line (removed; applied to edit too): both caught.
  - My 5 suites plus the guards and messages.test: 9 suites, 86/86. tsc: the only errors are build A's 4 in `habit-card.test.tsx`. Prettier and eslint clean.

---

## 2026-10-09 — Dana (Developer, UI and navigation), build A — Spending habits: dashboard, card, habit page, receipts, tool card, explainer

**Outcome:** Done, uncommitted. Built the HabitCard (first, contract appended to the brief), `/habits`, `/habit/[id]`, the Home tool card with its PRO pill, the `habits` Pro explainer and compare row, habit icons in every receipt list and on the receipt page, and the read-only Store plus day-taken hint in `/add-receipt`. Gates: tsc 0. ESLint 0 on my 35 files, run with the cache cleared. Prettier is clean. My run: 85 suites, 1677 tests, all pass (my 7 new suites hold 61 tests; the run includes the guards and the affected existing suites). Diego's API suites and build B's habit-new suites: 6 suites, 229 tests, all pass. 30 mutations, each restored byte for byte, were all caught. No device or simulator run.

- **New:** `src/components/habits/{habit-card,day-row,use-habit-days,habits-hero,week-selector}`; `src/app/habits.tsx`; `src/app/habit/[id].tsx`.
- **Changed:**
  - `tool-cards.tsx`, `transaction-row.tsx`, `ledger-row.tsx`, `receipt-row.tsx`, `(tabs)/home.tsx`, `source/[id].tsx`, `receipts.tsx`, `receipt/[id].tsx`, `add-receipt.tsx`, `pro.tsx`, `pro-features.ts`.
  - Messages: `habits.ts`, `home.ts`, `pro.ts`, `receipts.ts`.
  - `habit-colors.ts`: Pia's section 9 fills and `ink`.
  - Tests: home, home-languages, receipt-detail, pro and pro-features updated for the second tool card, the tenth compare row and the new hook mocks.
- **Decisions:**
  - `busyDays: ReadonlySet<string>`, because several days can be in flight at once.
  - Optimistic fill: `useHabitDays` keeps its own pending list. A filled day stays drawn until a re-read shows it, and is dropped after a second read that still lacks it. The hooks do not wait for their refetch, so a fill read from `variables` alone would blink empty after each answer.
  - Card label: "{name}, {status}, {saved} saved, {spent} spent.", plus the hint "Opens the habit.".
  - Figures: 15pt figure with a 12pt word.
  - The habit page reuses B's `habitFlow.color.*` keys. Its skipped count is Saved in cents divided by the price in cents, which is exact.
  - The Pro features test allows the approved habits title and subtitle to wrap to two lines.
  - Typed routes: I regenerated the git-ignored `.expo/types/router.d.ts` with Expo's own generator. Only the three new routes changed.
- **Open:**
  - Day labels do not name the habit, so two cards' open Thursdays read the same to VoiceOver.
  - Until the migration is live, Home's `useHabits` fails on every mount: no pill is drawn, and the card opens the error page.
  - "Skipped all week" overstates a habit's partial first week.
  - The pro-offer highlight list is unchanged.
  - Device walk for Tia: hero and card figures stacking at AX3, the PRO pill corner, 375pt day columns, dark tints.

---

## 2026-10-09 — Dmitri (Development Lead) — review of the uncommitted Spending habits feature

**Outcome:** APPROVE WITH FIXES. The money wiring is correct. A tap files one receipt: habit price, local day, card first (else the account, else Skip), the habit's category, source 'habit' and habit_id. The hero's Saved counts active habits only and starts at savedFrom. Spent uses the receipts' real amounts. Habit receipts reach the money book once, as plain receipts. `useHabitTaps` feeds only the habit screens, so nothing is counted twice. tsc exit 0; 26 targeted suites / 335 tests pass; eslint is clean on the habit files. Read-only review: no code was edited.

- **MUST:**
  1. Dana A: the CEO's spend-category call is not applied in `src/data/habit-icons.ts`. Home-bills and finance still file under home/other. Update the test that pins the map.
  2. Diego: run migrations 1-3 and `supabase/checks/habits.sql` on a scratch DB, and prove the `lacksHabits` fallback against a real PostgREST that lacks habits. This gates the push.
- **SHOULD:**
  - Dana A: name the habit in each day's VoiceOver label.
  - Drew + Dana A: export skipped-day counts and replace "Skipped all week" on a partial first week.
  - Dana A: make days before the free floor inert.
  - Dana A: a failed refetch that still has data shows the inline line, not the error page.
  - Diego: dedupe the paged taps by receipt id.
- **Rulings:** the hero's Spent counts active habits only, matching the cards. The one-time-offer page is unchanged in this build; it is a Founder call.
- **Risk:** the migrations must be live before any build or device run against prod. Until then, `/habits` errors and the Home card leads to an error page.
- **2026-10-09 — Dana — Dmitri's three fixes:**
  - The Price-body comment now gives only the why: the button sits next to the figure it confirms.
  - `handleDelete`'s catch now calls `warn()`, like the file's other catches. A new test checks a failed delete shows the failure line with the haptic and stays.
  - `@/api/push` is mocked in habit-new.test and habit-new-languages.test, and no notifications warning is left in the run.
  - My suites plus the guards: 9 suites, 87/87. tsc: 0 errors across the tree. Prettier and eslint clean.
- **2026-10-09 — Drew — skipped-day counts (Dmitri's ruling):** The UI never has to divide money by a price now.
  - **New exports:** `countsFrom(habit): string` (the later of startedOn and savedFrom); `skippedDaysInWeek(habit, tappedDays, weekStart, today): number`; `skippedDaysAllTime(habit, tappedDays, today): number`. Both counts use the same window as Saved.
  - **Saved re-expressed:** savedInWeek and savedAllTime are now count x price in cents. All earlier fixtures pass unchanged.
  - **New tests (6):** a partial first week (0, 1, then 4 days; whole weeks after); back-filled days, today and the future ignored; repeated taps counted once; a year boundary (5, 4, 10, 6); and a sweep over 4 prices checking count x price equals Saved and the weeks add up to all-time.
  - **Results:** jest 73/73, also 73/73 under Chatham, Santiago and Pago Pago. tsc exit 0. Prettier and eslint are clean. 4 mutations, all caught. Only my two files were touched.
- **2026-10-09 — Dana (build A) — Dmitri's review fixes:**
  - (1) The CEO's spend map is in `habit-icons.ts`. Electricity and water bill file under utilities, internet and phone bill under telecom, both insurance icons under insurance, and bank fees and credit card under finance. All four ids are seeded. The test's live parse now checks they exist, and the pinned map includes them.
  - (2) Every day's VoiceOver label starts with the habit's name, through the new `habits.day.named` key.
  - (3) A past first week that began mid-week says "{count} days skipped" (`countsFrom`, `skippedDaysInWeek`); it says "Skipped all week" only when the whole week counted. The habit page's tally uses `skippedDaysAllTime`.
  - (4) HabitCard and DayRow take `floor`. On a free account, days before it are drawn as 'before', read "kept but not shown on Free" (`habits.day.hidden`) and are inert, so no hidden receipt is filed or removed. The habit page passes it too, though its this-week row never reaches the floor.
  - (5) A failed read shows the error page only when there is nothing to show. A failed refresh keeps the data on screen and adds the shared `FailureLine` with Try again. The habit page now decides it is gone from what was read, so a failed refresh never steps out.
  - Gates: tsc is clean except for `habit-gaps-api.test.tsx` (not mine, being written). ESLint and prettier are clean on my 38 files. 79 suites, 1648 tests, all pass. 11 new mutations were all caught. Theo's dashboard and home gap suites pass.
- **2026-10-09 — Diego — the Docker run the Founder approved, and Dmitri's review items:**
  - **Docker:**
    - `n8n` and `cloudflared` were stopped (`docker stop` only) about 1s after the daemon answered.
    - All work ran on a scratch copy, `habits_check`, and a throwaway PostgREST v14.5 container (the live project's version, read from `supabase/.temp/rest-version`) bound to 127.0.0.1. Container, image and scratch DB were all removed afterwards.
    - Real local DB unchanged: still at 20261008100002, original enum, no `habits` table.
    - Docker Desktop was stopped with `docker desktop stop`, and no Docker process remains.
    - Correction: my earlier "quit" via osascript left the Desktop app and back-end running for 3 hours with no VM. The check only tested whether the daemon answered, which is a bad test.
  - **Real-PostgREST proof:** the app's actual hooks ran through supabase-js against the scratch PostgREST, from a jest test kept in the scratchpad.
    - Without habits:
      - The habit embed returns 400 PGRST200 ("Could not find a relationship between 'receipts' and 'habits'…"). The `useReceipts`/`useReceipt` fallback retries without the habit and gets 200.
      - `habit_id` alone returns 42703.
      - `/habits` returns 404 PGRST205, not 42P01.
      - The fallback needed no change.
    - With habits, all 7 pass:
      - The embed answers in one request.
      - `useHabitTaps` reads 2,500 taps in 3 keyset pages (206/200/200), each once, cents exact.
      - Tap, then tap again: 201, then 409 23505, which resolves as already tapped with the same id. Untap returns 204.
      - Untap leaves a non-habit receipt alone.
      - Rename and archive behave as the migration intends.
      - Pro create is 201; free create is P0001, which `refusedForPro` matches; `saved_from` before `started_on` is 23514.
  - **Migrations:** 100001, 100002 and 100003 each ran in their own transaction, in order, twice. All six runs exit 0, and the re-runs only skip with NOTICEs.
  - **Checks:** `supabase/checks/habits.sql` printed ALL CHECKS PASSED (42 checks), including the reminder: a habit tap leaves it due, any other receipt silences it.
  - **Dmitri's items:**
    - (2) Taps are now paged by key on (`purchased_on`, `id`), deduplicated by receipt id; the later read wins for a receipt re-dated between pages. 3 tests added.
    - (4) Each page now has its own 12 s timeout.
    - (3) The migration comments now say only 100003 names 'habit'.
  - **Gates:** tsc 0 errors. Prettier and eslint clean on my files. jest: 6 suites, 188 tests pass, no act() warnings in mine.
  - **Seen for real:** `useReceipts` returned 1,000 of 2,502 receipts (the PostgREST row cap). `pay.ts` `missingTable` checks 42P01, but PostgREST 14.5 answers PGRST205.
- **2026-10-09 — Dana (build A) — Founder card change (pills):**
  - HabitCard no longer draws the sub-line; VoiceOver still reads the status in the card's label.
  - Two pills sit on the right of the header row, next to the name: icon | name (flex-1, wraps) | [saved][spent], centred. Each is the figure (14pt semibold) over its word (11pt), `rounded-[12px] px-2.5 py-1.5`, 6pt apart.
  - Saved above 0: money-in tint with money-in type. At 0, and Spent always: neutral `bg-ink/5`, ink figure, muted word.
  - Tints per mode, each 4.5:1 or better: light money 10% (12% would be 4.44:1), dark money 14%, dark neutral 8%.
  - A switch FitGroup keeps the pills beside the name while every word of the name fits. Otherwise they drop under the name, side by side, and wrap whole only if even that is too narrow.
  - Weeks before the start have no pills.
  - Gates: tsc clean (Theo's api gap file aside, as before). ESLint and prettier clean. Habit suites, Theo's gap suites, B's habit-new suites, the guards and Home: 33 suites, 563 tests, all pass. 4 new mutations were all caught. No edits were needed in Theo's or B's tests: they assert the VoiceOver labels, which keep the status.
- **2026-10-09 — Drew — taps start on the creation day (Founder, after testing):**
  - **Change:** `dayState` returns 'before' for days earlier than countsFrom (the later of startedOn and savedFrom), so there is no back-fill before creation. Order is unchanged: tapped, future, before, today, open.
  - **Old taps:** a tap made before this rule still shows as 'tapped' and can be removed.
  - **Unchanged:** startedOn stays the Monday (week selector, earliestWeek). Saved, Spent and the counts are unchanged.
  - **Fixtures, habit created Thursday:**
    - On Thursday: Monday–Wednesday 'before', Thursday 'today'.
    - On Friday: Thursday 'open', Friday 'today'.
    - On the following Monday: Thursday–Sunday 'open'.
    - Next week: Monday and Tuesday open, Wednesday today.
    - An old Tuesday tap is still 'tapped'.
    - A sweep over all 7 creation days x 14 days shows a day is open or today exactly when it falls between countsFrom and today.
    - A creation day after today makes even today 'before'.
  - **Results:** jest 76/76, also 76/76 under Chatham, Santiago and Pago Pago. tsc exit 0. Prettier and eslint are clean. 4 mutations, all caught.
  - **For Dana:** `components/habits/day-row.tsx` gets the rule via dayState. I did not run the habit UI suites (habits, habit-card, habit-gaps-*, habit-detail); any test that back-fills a day before saved_from must change.
- **2026-10-09 — Dana — Founder rule: a habit can be tapped only from the day it is made:**
  - Confirm's last row now reads "Starts · Today" on create. On edit it reads "Started · {saved_from}", formatted with `formatFullDate`.
  - New keys `habitFlow.field.started` (Started / Inicio / Début, matching the detail page) and `habitFlow.starts.today` (Today / Hoy / Aujourd’hui). `habitFlow.starts.thisWeek` and `habitFlow.starts.weekOf` are removed.
  - No other create-flow copy implied back-filling. The price helper "Each day you tap records this amount." stays.
  - The save payload is unchanged.
  - The preview test now checks only what the page hands HabitCard (this habit's name and price, nothing to press). Build A's card sentence changed and is A's to pin.
  - Two mutations of the row (started_on on edit; the label in place of Today): both caught.
  - 9 suites, 87/87 with the guards. tsc 0 across the tree. Prettier and eslint clean.
- **2026-10-09 — Dana (build A) — Founder card change 2 (price only) and creation-day rules:**
  - HabitCard has no pills and no sub-line. The header row is icon | name | the habit's price, 16pt semibold ink. The price is a whole "hug" member of the header's switch group, so it is never cut. It drops under the name when a word of the name cannot sit beside it, and it shows in weeks before the start.
  - The VoiceOver label is now "{name}, {price} each time, {status}, {saved} saved, {spent} spent." (en/es/fr). The hero is unchanged.
  - Drew's `dayState` now treats days before `countsFrom` as 'before'. The dashboard and habit page follow it with no code change. A receipt filed before creation still shows filled and can be removed.
  - `/add-receipt?id=` for a habit receipt: a small wrapper reads the habit (`useHabit`) for `saved_from`, so ordinary receipts never load habit data. The calendar blocks earlier days (`minDate`). Save refuses a move before the creation day with "{name} started on {date}." (`habits.receipt.startedOn`). A receipt already dated earlier still saves where it is.
  - Theo's `habit-gaps-dashboard`: the price was inserted into its 8 label assertions; nothing else changed. B's preview assertion is a regex and still passes.
  - Gates: tsc clean (Theo's api gap file aside). ESLint and prettier clean. 66 suites, 1569 tests, all pass. 5 new mutations were all caught.
- **2026-10-09 — Diego — habit receipts not dated before the habit was made (DB lock, Founder-approved):**
  - **Migration:** new `20261009100004_habit_receipt_not_before_creation.sql`.
    - `receipts_habit_not_before_creation` is a BEFORE INSERT OR UPDATE OF purchased_on, habit_id trigger on receipts. It refuses when `habit_id` is set and `purchased_on < habits.saved_from`.
    - On UPDATE it checks only when `purchased_on` or `habit_id` is distinct from the old value, so edits to amount, note or card, the rename trigger, the card's on-delete-set-null and deletes all pass.
    - It is invoker, not security definer: like `receipts_own_habit`, it reads only the person's own habits through RLS.
    - Re-run safe.
  - **Error contract (verified through PostgREST v14.5):** HTTP 400 with `{"code":"23514","details":"<saved_from yyyy-mm-dd>","hint":null,"message":"A habit receipt cannot be dated before the habit started."}`, the same for a tap and for a re-date. The app matches it with `refusedBeforeHabitStart(thrown)` from `src/api/habits.ts`: code 23514 plus the words "before the habit started". 23514 alone is not enough, because other receipt checks use it too.
  - **`useTapHabitDay`:** now `retry: false`, so the refusal fails once with no retry, even under an app-wide mutation retry default.
  - **Scratch run:**
    - n8n and cloudflared were already stopped, and `docker stop` was a no-op.
    - 100001 to 100004 each ran in their own transaction, in order, twice: 8 of 8 exit 0.
    - `supabase/checks/habits.sql`: ALL CHECKS PASSED, 54 checks. The fixtures now use saved_from = started_on, except the new Breakfast cases.
    - The scratch DB, the PostgREST container and its image were removed. The real local DB is unchanged. Docker Desktop is stopped with no process left.
  - **Gates:** tsc 0 errors. Prettier and eslint clean. jest: 6 suites, 191 tests pass. habits.test.tsx has 37 tests and habit-receipts 12 cases; my earlier "9" counted `it` blocks, not cases.
- **2026-10-09 — Dana — Founder's Pick changes (from the Simulator):**
  - **Tiles:** the radio is gone. The icon sits centred on top, with the name and subtitle centred under it. The chosen tile shows only the `border-2 border-control` outline, with no check mark. VoiceOver still hears a radio with selected/checked.
  - **More and Add my own:** both are filled plum pills (`bg-control`, `active:bg-control-pressed`, rounded-full) with white words and white ChevronDown/Plus icons. They have equal widths and a 12pt gap.
  - **Pill size:** the pills are smaller than the page's primary button (15pt SemiBold, px-3.5, min-h-12). That is what lets them sit side by side at default text on a 375pt phone in all three languages: each label has 103.5pt, measured from Montserrat advance widths with a scratch TTF reader.
  - **Stacking:** labels are measured whole, so the pair stacks when a label cannot fit on one line at its size (at 1.4x in every language). A label is never cut.
  - **Copy:**
    - es "Agregar el mío" → "Crear el mío" (93.6pt).
    - fr "Ajouter le mien" → "Autre chose" (93.3pt). "Le mien" did not agree with the feminine "habitude", and "Créer la mienne" (123pt) does not fit.
  - **Tests:** new grid tests check no check mark, centred content, filled pills with white words and icons, and side by side in en/es/fr at 375pt but stacked at 1.4x, using the measured widths. Four mutations: outline pill, label not white, wider icon room, tile not centred. The outline pill first got through because `bg-control` matched inside `active:bg-control-pressed`; the class check now compares whole class names, and all four are caught.
  - 9 suites, 92/92 with the guards. tsc 0. Prettier and eslint clean.
- **2026-10-09 — Dana (build A) — card and account page: newest first, rows open their pages (Founder reversal):**
  - `src/app/source/[id].tsx` lists newest first through the new pure `src/lib/ledger-order.ts` `newestFirst`. Within a day, receipts go latest-created first (`created_at` from `useReceipts`, the receipts list's tiebreak). Rows with no creation time follow in the money book's order. The free-plan notice moved to the end of the list.
  - Rows open through `ledgerHref` + `chargeOwners` (from `useCharges`), as on Home: receipt, bill (projected or charge), subscription, and pay (`/salary`, where Home and Activity send it). They carry the Receipts rows' role and press feedback, plus hints: the existing receipts/subscriptions hints and new `accounts.source.billHint` / `payHint`. TransactionRow gained an optional `hint`. A charge with no known plan stays inert.
  - Payments keep their press: it opens "Remove payment?". `source-payment.tsx` only creates a payment (it takes the card or account id, has no edit mode), so no page exists for one, and this press is the only way to remove a payment.
  - Tests: new `src/lib/ledger-order.test.ts` (4) and `src/__tests__/app/source-detail-rows.test.tsx` (7: order, same-day tiebreak, every kind's destination, hints and feedback, inert unknown charge, payment removal kept, search on the new order, account page). Three existing source tests got the two new hook mocks. `source-detail-i18n`'s pay row now opens `/salary` (it pinned "opens nothing").
  - Gates: tsc clean (Theo's api gap file aside). ESLint and prettier clean. 67 affected suites, 1188 tests, all pass. 5 mutations were all caught.
- **2026-10-09 — Dana (build A) — Quick add plus badge (Founder option 2):**
  - Each Quick add icon now sits in a 22×22 box with a 13pt `bg-control` badge (1.5pt `border-card` ring, white `Plus` 9pt, stroke 3) on its top-right corner. The badge is absolute, decorative and hidden from VoiceOver.
  - The tile's labels, hints, routes and FitGroup are unchanged, and so is the label's room. A trailing plus was measured first: it would have sent Quick add to one column at the default text size on phones up to 402pt.
  - Test added in `quick-actions.test.tsx` (badge present, decorative, label slot unchanged). Quick add, dashboard-languages, Home, the Home gap suite, the shared-controls large-text suite and the large-text guard: 251 tests, all pass. tsc and ESLint clean.

- 2026-10-09 (CEO): the Quick add plus badge was tried and removed at the Founder's request; quick-actions.tsx and its test are back to HEAD.

---

## 2026-10-09 — Diego (Developer, data and backend) — Cards redesign: optional credit limit, data layer

**Outcome:** Done, uncommitted, not pushed. No Docker was used. tsc: 0 errors across the tree. Prettier and eslint are clean on my files. jest: 16 suites, 426 tests pass: the new `card-credit-limit` suite (12), the api, money-book and habit suites, and the cards, add-card and Home screen suites.

- **Migration:** `supabase/migrations/20261009100005_card_credit_limit.sql`.
  - Adds `cards.credit_limit numeric(14,2)`, nullable, with `add column if not exists`.
  - Constraint `cards_credit_limit_positive` (null or > 0), added inside a duplicate_object guard so a re-run is a no-op.
  - Column comment. No other schema change.
- **Reads (`src/api/queries.ts`):**
  - `CardRow.credit_limit: number | null`. `useCards` and `useCard` ask for it and map it: a number or numeric string becomes a number; null or absent becomes null.
  - **Fallback chosen:** on a 42703 that names credit_limit, the read is retried without it, and every card comes back with `credit_limit: null`. Cards feed every balance and Home's Current balance, so a build reaching a database before the push must still load. Any other error is still an error.
- **Writes (`src/api/mutations.ts`):**
  - `CardValues.credit_limit?: number | null`.
  - New pure helper `creditLimitValue(typed: string): number | null`. Typed amounts above 0 are kept to the cent, not rounded. Empty, 0, negative or not a number becomes null.
  - Writes have no fallback: a database without the column refuses a save that names it, so the migration must be live before the form sends the field. That is louder than silently dropping a limit.
- **For Dana:** in add-card.tsx `values`, add `credit_limit: creditLimitValue(creditLimitText)` on create and on edit. Null clears the limit. Read the limit from `card.credit_limit`.

## 2026-10-09 — Dana — Cards tab redesign, phase 1 (DONE, ready for the Founder in the Simulator)

- **Page** (`src/app/(tabs)/cards.tsx`): centred "Cards" title (header role) and "All your money in one place."; no net balance card; Credit cards and Bank accounts headings with white "+ Add" pills (ActionPill gained `tone="card"` and an optional `accessibilityLabel`, so VoiceOver still says "New credit card" / "Add account"); free-plan walls unchanged.
- **Faces** (`card-face.tsx`, `payment-card.tsx`, `account-card.tsx`): measured from the PNG: 10pt radius, 20pt padding, content height (no fixed ratio), "Owed"/"Available" 12pt, 31pt figure, right-hand "Skip" watermark hidden from VoiceOver, uppercase tracked wordmark (AMEX, VISA, MASTERCARD), account type badge, bottom "•••• 6334". Limit bar (owed ÷ limit in cents, clamped) and "$4,050 of $10,000 limit" only with a limit; accounts read "Updated today / yesterday / 4 Oct". Fixed a pre-existing dark-mode bug: light faces (sky, lime, sand, snow) drew near-white type in dark mode; they now keep the fixed ink.
- **Money tiles** (`components/cards/money-tile.tsx`): 2×2, gradient icon + chevron, name, figure or pill, note; Goals "Coming soon" is inert. Four fit groups (names, figures, pills measured whole, notes); the grid stacks one per row when any cannot fit.
- **Icons** (`assets/money-icons/*.svg`): every xlink:href gradient flattened per SVG 1.1 inheritance (coordinates, units, gradientTransform, stops) into <defs>. Quick Look renders of original vs copy: pixel-identical. svgr/svgo (the transformer's own config) keeps all gradients. On the iPhone 17 Pro Simulator the four icons match the WebKit renders to ~1/255 mean colour difference.
- **Data**: new `src/api/loans.ts` `useActiveLoans(today)` (reads `loans.bill_id` only, names from the cached `useBills`, pure rule in `src/lib/active-loans.ts`); `useSourceBalances` gained an additive `updated` map (pure `src/lib/source-updated.ts`). Credit limit wired to Diego's `credit_limit` / `creditLimitValue` on Add/Edit card and both pages' faces.
- **Gates**: tsc clean; eslint + prettier clean on my 28 files; 37 suites / 799 tests pass incl. large-text guard, no-route-test-files, i18n messages; 4 of 5 mutations caught (the fifth was a redundant clamp, now removed).
- Phase 2 (Add card/account steps 2–3 and the "added" pages) starts next.

## 2026-10-09 — Dana — Cards redesign phase 2 (Add card / Add account steps 2–3, "added" pages) + dark gradient icons (DONE)

- **Card flow** (`src/app/add-card.tsx`): step 2 = live face ("Owed", "Limit not set" until a limit is typed, then "$500 of $10,000 limit" with the bar), Card name, Network pills (VISA, Mastercard, AMEX, Discover; Amex still stored as "Amex"), Last 4, Card limit (inline currency field, decimal pad, no pop-up), Card colour (the design's 8). Step 3 = "When is the bill due?" + day strip 1–31 (chosen day scrolled into view, pressed again to clear), summary card ("Due every month on the 22nd", "…or the last day in shorter months" for 29–31, "Next due: 22 Oct 2026"), "Remind me" card (gradient bell, switch, On the day / 1 day / 3 days / 1 week, date line), the change-later note (create only), "Add card". Reminder keeps its saved time (09:00 when new). Edit: same steps, "Save changes", toast + back, no final page. Walk-in (from=setup): unchanged (toast, on to /account-offer).
- **Final page** (`components/flow/added-page.tsx`, shared): check in a plum circle, "Card added" + reminder line (or "No reminder set…"), the face, rows Due / Next due / Reminder, Done, "Add another card", close X. No toast on it. It replaces the flow in the same route; Done/close/swipe all leave to the opener (Cards), "Add another" is a router.replace to a fresh /add-card (so the free wall is re-checked).
- **Account flow** (`src/app/add-account.tsx`): same parts (face, fields, card-tone type pills, colour, pay link switch, expected income as an inline currency field with the calculator button; step 3 last payday calendar + frequency pills + the same Remind me card, dated from the next payday when pay is typed here, by lead alone for linked pay); "Account added" page with Type / Next payday / Reminder rows.
- **Shared parts**: ChoiceChips `tone="card"`, TextField `filled` + `leading`, new `CurrencyField`, `DayStrip`, `FlowSummary`, `RemindMeCard`, `AddedPage`; ColorPicker restyled to one row of 8 with a ring. Pure helpers: `lib/typed-amount.ts` (keystrokes replayed through the keypad's own rule, moved to `lib/amount-keys.ts` and re-exported by the keypad), `lib/due-day.ts` (mirrors `next_month_day` and `due − lead = today`; a year-long sweep proves it), `lib/reminder-words.ts`.
- **Palette**: `CARD_COLORS` is also the monogram palette mirrored by the push server, so it is unchanged; faces now offer `FACE_COLORS` (blue, violet, plum, teal, slate, sand, rose, black). Faces draw white type where white reaches 3.8:1 (blue and teal, as drawn), and outline a face too close to the page (black in dark mode).
- **Dark icons**: `assets/gradient-icons/<name>.svg` + `<name>-dark.svg` for salary, savings, loans, goals, reminder, all flattened; savings-dark derived from the light file with the three navy stops lifted (Desktop originals untouched). Quick Look renders: every copy pixel-identical to its source. `src/theme/gradient-icons.ts` pairs them by the theme provider's scheme.
- **Gates**: tsc clean; eslint + prettier clean on 55 files; whole suite 253 suites / 5,386 tests green. New suites: add-card-flow (20), add-account-flow (8), typed-amount (11), due-day (10), gradient-icons-dark (4), money-icons (35). Seen on the iPhone 17 Pro Simulator in light, dark and AX-XL (edit and create walked to step 3, nothing saved).
- **2026-10-09 — Dana — Founder decisions on the Cards work:**
  - New card / new account: "Remind me" starts on at 3 days before; edit opens on what is saved; an account with no pay landing keeps it off and disabled.
  - White-type face colours now clear 4.5:1 for the name and the captions as drawn: captions 80% → 90% white; blue #4F7DBA → #426EA8, teal #3F8A86 → #367672, violet #6A5FC9 → #695EC9 (margin only). Plum, slate and black unchanged. The special 3.8:1 white rule is gone; faces use isLightColor as before.
  - Tests: palette check reads each rendered caption colour; on-by-default and switched-off cases for both flows. 3 mutations caught. tsc clean; 95 suites / 2,461 tests incl. guards; eslint + prettier clean.

## 2026-10-09 — Dmitri (Development Lead) — review of the uncommitted Cards redesign (phases 1–2, credit limit, dark icons)

**Verdict: approve with fixes.** Reviewed the tree as of 16:20, after Dana's Founder-decision pass at 16:17 (reminders start on; blue, teal and violet darkened). tsc: 0 errors. eslint is clean on the changed files. 29 suites / 674 tests pass (23 targeted, plus the i18n, large-text and no-route guards).
- **MUST-FIX (Diego):** `SINGLE_ROW_KEY` (src/api/mutations.ts:81) is missing `cards: 'card'` and `bank_accounts: 'bank_account'`. Edit pages mount on the cached `['card', id]` and `['bank_account', id]`. Re-opening Edit after a save shows the old values, and Save writes them back. That clears a new limit and reverts the balance and balance_as_of. Add both keys and a reopen test.
- **MUST-FIX (Dana):** add-account.tsx:661 puts the calculator's `String(result)` straight into the draft. The field shows "1,233.3333333333333" while the database saves 1233.33. Round to cents and turn it into a keypad draft first, and add a fixture.
- **SHOULD-FIX:**
  - Diego: the account reminder date does not match the scheduler. `getNextPayday` skips today's payday. With weekly pay and a 1-week lead, the reminder never fires on the server.
  - Diego: `useReminderChoice` reads as 'off' while loading or after a failed read, so saving an edit then deletes the card's reminder.
  - Dana: archive the dead code (amount-tile, network-picker, money-buckets, tileSalary, moneyTone).
  - Dana: the "Add another" wall reads a card list that may still be refetching.
  - Dana: a card with a legacy colour shows no selected swatch.
- **Verified:** limit bar maths in cents, clamped; credit_limit reads (with the 42703 fallback) and writes; typed-amount in en, es and fr; due-day matches next_month_day; no change to the money book, Home or Current balance; navigation matches the SDK 57 docs. All 10 icon copies match their references with gradients resolved.
- **Open:** default-on reminders now raise the iOS notification permission prompt on save, including in the walk-in. "Updated" counts scheduled pay as something that happened.
- **2026-10-09 — Dana — Dmitri's Cards review fixes:**
  - **MUST:** the add-account calculator result now goes in through `draftFromAmount` (lib/typed-amount.ts): rounded with `toCents`, trailing zeros dropped, empty when ≤ 0 or not a number. Fixtures: 3700/3 → "1233.33" (field "1,233.33", saved 1233.33); 0.1+0.2 → "0.3"; −40 → empty.
  - **SHOULD:**
    - Both free-plan walls also wait for `!existing.isFetching`.
    - An older colour is offered as a first "Current colour" swatch, chosen, and can be picked again (`ColorPicker saved=`).
    - Archived to `~/Desktop/SkipBudget-design-archive/2026-10-09/` with their relative paths, then removed from the tree: amount-tile.tsx, network-picker.tsx, money-buckets.ts, tile-salary.svg (+ the `tileSalary` artwork entry), and `moneyTone` with its helpers. tone.ts and tone.test.ts were archived whole before trimming. Test references, the guard's adopted entries and the AmountTile / NetworkPicker cases in two shared suites are gone.
  - **Nits:**
    - data/cards.ts comment.
    - `leaveFlow` now lives in lib/nav.ts; `asDate` became due-day's exported `dayDate`.
    - The Loans tile ignores presses while loading.
    - The DayStrip gutter is measured (half the bled width less the column), and the strip is hidden until known.
  - **Gates:** tsc clean; eslint + prettier clean on 64 files; whole suite 254/255 suites pass. The one failure is Diego's in-progress edit-reopen test.

## 2026-10-09 — Dana — Home redesign: Quick add, Where your money went, Go further (DONE, uncommitted)

- **Quick add** (`components/dashboard/quick-actions.tsx` and the new shared `home-tile.tsx`): it is always 2×2. Each tile is a bordered card (`rounded-[20px] border-line bg-card p-[16px]`, no shadow, as in the PNG). It has a 42pt gradient icon, a decorative 28pt `bg-accent/10` plus (accentInk glyph, hidden from VoiceOver), the name (15 semibold) and a note (12 muted): "Snap or type it", "Rent, phone, power", "Netflix, Spotify", "Add a payday" (es/fr added). Routes and VoiceOver labels are unchanged. The rows are `flex-row` with no `items-*`, so the two tiles in a row stretch to the taller one.
- **2×2 at large text:** the names and the notes are two shrink FitGroups. New opt-in `useFitGroup({ mode, onlyLayout: true })` (with `fitScale`'s `onlyLayout`): the owner has no fallback layout, so only the 11pt floor applies, as for a group of one. The default behaviour of every other group is unchanged. Measured from Montserrat advance widths, the names stay at full size or shrink only slightly (e.g. 19.1pt at 375pt and 1.3x). They go under 15pt only at 320pt Display Zoom, at about 14–14.8pt. Notes wrap between words. The large-text guard passes: no numeric ceilings, no `numberOfLines`, no shrink-to-fit.
- **Where your money went** (en/es/fr: "A dónde se fue tu dinero", "Où est passé ton argent"): the rows draw the bill, receipt and subscription gradient icons in the same 44pt slot. An unknown id keeps the old document glyph. Nothing else changed.
- **Go further** (heading kept): Loan calculator ("See a monthly cost") and Spending habits ("Spot your patterns") are HomeTiles with the chevron at 0.55 opacity. The PRO pill now sits in the top row, before the chevron. Insights (`insight-banner.tsx`) is the full-width bordered card: bulb, name, note, PRO pill, chevron. The pill logic and routes are unchanged. The tools still stack only if a name or note would go under its design size; that never happens on an iPhone width.
- **Copy:** `home.tool.loanCalculator` and `spendingHabits` are now sentence case in en ("Loan calculator", "Spending habits"), to match the design and the pages' own titles. The habitsLocked label follows. The Home, habit-card and habit-gaps-home tests were updated to match.
- **Icons:** new flattened copies in `assets/gradient-icons/`: `home-{receipt,bill,subscription,spending-habits,insights}{,-dark}.svg`. subscription-dark carries the Founder's navy swap. The designer's salary and loan-calculator drawings are byte-identical to the Cards `salary`/`loans` pairs once flattened, so the new registry `src/theme/home-icons.ts` (`useHomeIcons`) reuses those files. Quick Look renders match the originals pixel for pixel (subscription-dark checked against a hand-swapped original).
- **Tests:** new `home-icons.test.ts` (49), `home-icons-dark.test.tsx` (8), `tool-cards.test.tsx` (6) and `insight-banner.test.tsx` (5). Rewrote `quick-actions.test.tsx` (15). Added icon cases to `destination-list.test.tsx` and an `onlyLayout` case to `fit-group.test.tsx`. Mocked the registry in the Home, languages and habit suites. 9 of 9 mutations caught.
- **Gates:** tsc 0, and eslint and prettier are clean on all 21 files. 23 targeted suites (292 tests) pass, guards included. Full jest: 260/262 suites. The 2 failures (`add-source-wall`, `add-account-i18n`: `LEAD_OPTIONS` undefined) come from another session's 16:45 edit to `add-account.tsx`/`remind-me-card.tsx`, not from this work.
- **Simulator:** Quick add was seen in light at the default size, XXXL and AX-XL, and stays 2×2 with equal rows. Text size was restored to `large`. The lower sections were not seen, because the Simulator window is on another Space and I did not drive the mouse.
- **Left unused:** `shadows.raised` in `src/theme/shadows.ts` has no caller now.

---

## 2026-10-09 — Diego (Developer, data and backend) — Dmitri's Cards review: stale Edit cache, payday mirror, reminder guard

**Outcome:** Done, uncommitted. tsc 0 errors. eslint and prettier are clean on every file I touched. jest: 56 affected suites, 1,454 tests pass, and the three guard suites pass. No migration.

- **MUST (stale Edit cache):**
  - `SINGLE_ROW_KEY` (src/api/mutations.ts) gains `cards: 'card'` and `bank_accounts: 'bank_account'`.
  - New `src/__tests__/api/edit-reopen.test.tsx` uses a stateful fake DB with the app's 30 s staleTime. It covers: save a limit, reopen, see the new limit; and the same for an account balance and its date. Both failed before the fix and pass after.
- **SHOULD 1 (payday dates): app-side fix, no migration.**
  - New `src/lib/payday.ts`:
    - `nextPaydayOn(last, frequency, from)` mirrors `public.next_payday`: today counts, monthly pay keeps its own day after a short month, and a one-off pay is null once past.
    - `paydayReminderOn(last, frequency, lead, today)` mirrors reminders_due for an account. It returns null when the reminder never fires.
    - `leadCanFire(lead, frequencies)`.
  - `src/lib/payday.test.ts` sweeps a year of days against a separate step-by-step transcription of next_payday and against the scheduler's firing rule, for every frequency, lead and tricky anchor (month ends, leap day, off-grid semimonthly, stale).
  - `getNextPayday` is rebuilt on `nextPaydayOn`, so the salary page and the account form agree with the server. It used to skip today's payday, and monthly pay drifted from the 31st to the 28th after February.
  - add-account.tsx: the reminder preview now comes from `paydayReminderOn`, counted from the last payday. The form offers only leads that can fire for the pay it knows (typed, or linked on a new account), so "1 week" is hidden for weekly pay. A week already chosen falls back to 3 days.
  - RemindMeCard gains an optional `leadFits` predicate.
  - New screen test `src/__tests__/app/account-reminder-schedule.test.tsx`.
  - Not covered: the account edit page with linked pay (the form does not know its frequency), and the Reminders page. There, weekly pay with "1 week" still never sends. The complete fix would be server-side: one line in reminders_due (`next_payday(…, local_date + lead_days)`).
- **SHOULD 2 (reminder deleted on edit):**
  - `useReminderChoice` now returns `unknown`: true for a saved item until the reminders read succeeds. It is inverted so that existing screen-test mocks still read as known.
  - One-line guards (`if (!savedReminder.unknown)`) at the four Save call sites: add-card, add-account, add-bill, add-subscription. Bill and subscription had the same bug.
  - Tests: `src/__tests__/api/reminder-choice.test.tsx` and `src/__tests__/app/edit-reminder-unknown.test.tsx`.
  - Gap: a reminder change the person makes while the saved one is unknown is not saved either. Showing the reminder card as unavailable with Try again while unknown would be clearer (Dana).
- **2026-10-09 — Diego — full gate before the commit:** the add-source-wall and add-account-i18n break was already gone (add-account.tsx no longer imports LEAD_OPTIONS; it passes a `leadFits` predicate). Both suites pass, 21 tests. tsc: exit 0, 0 errors. Full `npx jest --ci`: 263 of 263 suites, 5,499 of 5,499 tests, exit 0.

---

## 2026-10-09 — Diego (Developer, data and backend) — salary free on every plan: database and lib

**Outcome:** Done, uncommitted, not pushed. No Docker used. tsc 0 errors. eslint and prettier clean on my files. 41 suites, 805 tests pass: salary, pro and add-source screens, supabase, api, wall, allowance and pay.

- **Migration `20261009100006_salary_sources_free.sql`:**
  - `drop trigger if exists salary_sources_free_allowance on public.salary_sources;` and `drop function if exists public.enforce_income_allowance();`. That function was salary-only: one_off_pay swapped the trigger onto it.
  - The shared `enforce_free_allowance()` stays; the cards and bank_accounts free-allowance triggers still use it. The lock-extras trigger and function were already dropped in 20260928100001.
  - Nothing else on the server limits income.
- **`supabase/checks/one_off_pay.sql`** updated (not run: no Docker). Free accounts now keep a second schedule, and can turn a one-off into a schedule beside it. The trigger and function are gone, and a second card is still refused.
- **Client:** `FREE_LIMITS.incomeSources` removed from `src/lib/wall.ts`; nothing read it. No other income guard exists in src/api or src/lib. The remaining gates are in src/app/salary.tsx (Dana).
- **Tests:**
  - `src/lib/wall.test.ts`: the free plan counts cards, accounts, scans and uploads, never pay.
  - New `src/__tests__/supabase/free-allowance-triggers.test.ts` replays every migration's trigger creates and drops in order:
    - salary_sources ends with no limit trigger, and the function is gone;
    - cards and bank_accounts keep `enforce_free_allowance`;
    - the salary trigger is found live just before 100006, which proves the replay itself.

## 2026-10-09 — Dana — Salary for everyone: the page, the Pro copy and the total card (DONE, uncommitted)

- **Salary page** (`src/app/salary.tsx`): every Pro gate is gone. That covers Add source, a one-off turned into a regular frequency, the `usePro` read, and the once-first save order that freed the free plan's slot; sources now save in page order. The "One-off pay" button is removed. "Just this time" stays in How often, and saved one-offs work as before: this month's line, earlier months behind their row, edit and delete. "Add salary source" is now one full-width outlined pill with plum text, as in the screenshot, and it ends the scroll.
- **Total per month** is a card: the salary gradient icon (48pt) from `useGradientIcons`, light or dark by the app's theme, hidden from VoiceOver. The label, a 30pt bold FitFigure, and this month's one-off line sit beside it.
- **Copy:**
  - `pro.unlimited.b` now reads "Move money between accounts" / "Mueve dinero entre tus cuentas" / "Transfère de l'argent entre tes comptes". Its icon changed from Banknote to ArrowRightLeft.
  - `faq.pro.include.a` no longer lists incomes (en/es/fr).
  - The compare rows had no income claim.
  - Removed key: `salary.addOneOff` (en/es/fr). No keys added.
- **Other walls:** none found for income. Quick add Salary, the Cards Salary tile, Getting Started, Settings > Your money and Insights' link all go straight to /salary. The add-account pay field has no gate. The Cards tab walls are for cards and accounts only.
- **Tests:**
  - New `salary-free` (3): a free account adds a 2nd and 3rd source and saves them; no Pro page with 3 saved; one full-width add button and no One-off button.
  - New `salary-total-card` (3): light and dark icon, hidden from VoiceOver; the one-off line sits in the card.
  - New `pro-copy-salary-free` (4): no Pro copy or FAQ Pro answer names income in any language. Run against HEAD's copy, its regex flags exactly the six old claims.
  - Rewrote the Pro cases in `salary-one-off`. `salary-past-pay` and `salary-paid-into` add through Add source plus "Just this time", and the order is now page order. In `salary-large-text`, Add source ends the scroll.
  - The other suites swap their `@/api/pro` mock for a `@/theme/gradient-icons` mock. `pro-features.test` pins the new point.
  - 6 of 6 mutants were caught (run from scratch copies, so the served file was never touched).
- **Gates:** tsc 0. ESLint (cache cleared) and prettier are clean on all 15 files. The full jest run passes: 267 suites, 5,511 tests.
- **Simulator:** seen in light at the default size (card and icon). Not seen: dark mode (the app's theme is set to Light), the bottom pill (it needs a scroll) and large text. All three are pinned by tests. The Simulator was left on /salary, opened by deep link; nothing was saved.
- **Open:**
  - The migration must be live before or with this build, or a free second schedule gets the failure line on Save.
  - The screenshot has more than the brief asks for: a "Next payday · 1 source" footer on the card, and a redesigned source card. Not built.
  - The label stays "Add salary source"; the screenshot says "Add source".
  - Moving money is not walled on any plan.

## 2026-10-09 — Dmitri (Development Lead) — loan file upload (phase C): plan for the Founder's approval

**Outcome:** Done, as a plan only. I wrote `.claude/team/dev/loan-upload-plan.md` (559 lines, over the 250–400 asked for). Nothing was built, and no code was touched.

**What changed and what was decided:**
- Release in two steps. C1 reads PDFs that have a text layer, through PDFKit. C2 adds scans and photos through Vision, once they pass the corpus targets. One native build carries both paths, and JS switches OCR on in C2.
- Dilip extends the `ReceiptScanner` module with a new file, `DocumentReader.swift`, and a `readDocument` call.
  - No prebuild: `pod install` is enough.
  - `fileprivate` becomes `internal` on three functions.
  - The receipt bench output must stay byte-identical.
- The parser goes in a new `src/lib/loan-doc/`:
  - Diego: layout, labels, document kind, locating values.
  - Drew: numbers, dates, cross-checks, the engine replay, rate solving, the status rules.
  - `receipt-parser.ts` is not touched.
- Each field gets one of four statuses: Checked, Check this, Not found, Assumed.
  - A value is Checked only when an arithmetic identity holds.
  - A "Check this" value is never applied until the person confirms it.
  - There is no largest-number guess.
- The file is never kept, and nothing about the upload is stored on the server.
- Pro is gated on the client only.

**Found while reading:**
- The calculator silently clamps typed amounts to 500–1,000,000 and rates to 0–30. Uploaded values would be clamped the same way.
- `loans.annual_rate` is `numeric(6,3)`, so the saved rate keeps only 3 decimals.
- `statement_on` and `statement_principal` already exist in the database.
- The current receipt upload reads only page 1 of a PDF, and only by OCR. I left that alone.
- The loan design's line "Interest is worked out monthly" must not remove the interest-method choice. Dana L to confirm.

**Not verified:**
- Whether PDFKit returns text from owner-password PDFs.
- Full-page Vision reading on an iPhone.
- The PDFKit API names. They come from Apple's framework, not Expo docs; Dilip checks them when building.

**Open questions for the Founder (7):**
1. Ship C1 first?
2. What to do with monthly statements.
3. Raise the calculator caps.
4. Fill-and-warn or refuse loans the calculator can't price exactly.
5. Supply real loan documents.
6. Who designs the pages.
7. A "Scan paper pages" choice.

## 2026-10-09 — Dana — Salary page rebuilt to the Founder's screenshot (DONE, uncommitted)

- **Founder decision (via CEO):** match `.claude/team/design/reference/salary/salary-page.png` in full. "Move money between accounts" is approved. The DB change goes live before the build.
- **Total card** (`components/salary/salary-total-card.tsx`): the salary icon, the total and this month's one-off line. Under a divider: "Next payday 15 Oct · 1 source". That is the soonest next payday of any schedule (`getNextPayday`, `shortDay`) and the count of schedules; one-off pays are neither. It reads "N sources" while no schedule has a payday, and the line is hidden when there are only one-offs.
- **Source card** (`app/salary.tsx`):
  - "Source 1" (or "One-off pay") sits over the bold name. The pencil renames in place (the field autofocuses and becomes the title again on blur or Done); a source with no name shows its Name field, optional for a one-off. The trash asks as before. Earlier months' one-offs open folded, with a chevron to unfold them; the collapse button is gone otherwise.
  - Fixed pay / Hourly is `TogglePill tone="segment"`, a new tone on the shared control; time-picker keeps `fill`.
  - The Amount box (`components/salary/amount-box.tsx`) opens the full-page keypad, and its calculator glyph opens the calculator. Hourly sources use the same box for the rate.
  - Rows (`components/salary/pay-row.tsx`) wrap so the value drops under the label at large text. How often opens chips inline and closes on a pick. Last payday opens InlineCalendar inline (the DatePicker popover is no longer used here), and its note gives the next payday or "Counts once…".
  - Paid into shows the account's colour swatch and "Name ••last4", or "No account" plus the hint. It opens the new full page `app/salary-paid-into.tsx` (radio rows with swatch and check, "No account" last). The unsaved pick comes back through `lib/paid-into-pick.ts`, a listener keyed by the editor's `useId`. Nothing is stored, so a pick made with no editor listening goes nowhere.
  - Only one inline control is open at a time. Save, the past-pay question and the save order are unchanged.
- **Keys:** `salary.addSource` is now "Add source" / "Agregar fuente" / "Ajouter une source".
  - Added: `salary.total.next`, `salary.total.count`, `salary.rename`, `salary.showChoices`, `salary.showCalendar`, `salary.paidIntoHint`.
  - Removed: `salary.collapseSource`, `salary.unnamed`, `salary.howPaid`.
- **Tests:**
  - New `salary-source-card` (11) and `paid-into-pick` (2). `salary-total-card` has 5 more footer cases. `salary-paid-into` is rewritten for the row, the page and the hand-off (42).
  - The other salary suites use helpers to open How often, rename with the pencil, pick the payday on the inline calendar and hand back an account. Their queries mocks carry `accountLabel`, because the real module starts Supabase.
  - The languages sweep now also reads hints and row values.
  - 6 of 6 redesign mutants were caught once the empty-name test was extended.
- **Gates:**
  - ESLint (cache cleared) and prettier are clean on all 23 of my files, and tsc shows no error in them.
  - The tree's 11 tsc errors are all in other sessions' loan-redesign and source-tiles tests.
  - Full jest: 266/271 suites pass. The 5 failures are the loan redesign's `useLoanIcons` / loan keys (4 loan suites plus add-bill-save), not Salary.
- **Simulator (light, default size):** Salary and Paid into were seen and match the screenshot. Not seen: dark mode (the app is set to Light) and large text; tests cover them. The Simulator was left on the Paid into page, opened by link; nothing was saved.
- **Open:** no bank logos exist for accounts, so Paid into shows the account's colour swatch, not the Chase mark. The shared BackButton is a bare chevron, not the screenshot's white circle; that was left alone because it is app-wide.

## 2026-10-09 — Dana P — "Paid with / Paid from" tiles in the save-loan design, everywhere (DONE, uncommitted)

**Outcome:** done. The shared `src/components/ui/source-tiles.tsx` now draws the save-loan tiles, so add-bill, add-subscription, add-receipt (typed, scan, upload, voice), habit-new, source-payment, save-loan and the entry edit pages (edit and voice) all follow. No caller changed. The props API is unchanged.
- **Tile:** a 28×18 swatch in the card's or account's own colour, the name (14 semibold ink), `••last4` under it (12 muted), and a 20pt radio at the right (1.5px muted/40 ring). The tile is `rounded-[16px]`, 54pt min height, with a 1.5px border either way so choosing one moves nothing. Unselected: card fill + line border. Selected: plum border, an `accent/10` tint laid over the card (the design's #F5EBF1, not tinted by the page), and a filled plum check (white Check). These match the PNG's measures and sampled colours.
- **Skip tile:** same tile, a dashed muted swatch, the existing wording (Skip / Omitir / Passer, Somewhere else, New money), no last4. Semantics unchanged: '' = Skip, null = unanswered; still required where it was.
- **Grid:** two to a row in equal columns; the tiles in a row stretch to the taller. An odd last tile keeps its column's width (a spacer fills the other half). One per row from the text size where the tiles' type hits its ceiling (`fontScale ≥ TEXT_CAP.control`, i.e. xxxL and the AX sizes), or when any name's widest word would not fit beside the swatch and radio (a FitGroup in `switch` mode). Names wrap between words and are never cut. The radio's left gap is 6pt, not 8, so "Checking" fits a half tile inside the entry pages' form card on a 402pt phone.
- **Dark/light:** a swatch under 1.5:1 against the card (black/ink on dark, white/lime on light) gets a 1px muted outline.
- **VoiceOver:** each tile is a radio labelled with the full label ("VISA ••4821", unchanged), with selected + checked state.
- **Data (Diego's file, additive only):** `PaymentSourceRow` gains optional `name` and `last4`, filled by `usePaymentSources` (card: network; account: nickname or bank). `label` is unchanged, so every other "Paid with" line and the existing test queries are untouched. Without `name`, the tile shows the label.
- **Tests:**
  - New `src/__tests__/components/source-tiles.test.tsx` (18): parts, sizes and ceilings; selection (border, tint, check, a11y state); tap + haptic; label fallback; no-digits card; Skip tile (style, unanswered vs Skip, own handler, absent without `skip`); grid (2 + odd spacer, xxL stays 2, xxxL/AX1/AX5 stack, a too-wide word stacks); outlines in dark and light; swatch kept on selection.
  - New `src/__tests__/api/payment-sources.test.tsx` (1).
  - The SourceTiles case in `shared-controls-large-text` now draws name + last4 + Skip in en/es/fr.
  - 16 caller suites had `card` added to their `useColors` mock (one line each); no assertion changed, since none asserted the old pills.
  - 13 of 13 mutants caught (scratch copies via moduleNameMapper; the served file was never touched).
- **Gates:** tsc exit 0. ESLint (cache cleared) and prettier are clean on all 21 files. Full jest: 267/271 suites, 5,526/5,550 tests. The 4 failures are the loan redesign in progress: `useLoanIcons` → `useTheme` missing from the loan-calculator-languages, loan-schedule-languages and add-bill-save mocks, and the deleted `bills/icon-picker` still mocked in save-loan-languages. None renders SourceTiles. The callers' 30 suites pass (1,374 tests, the same as before the change).
- **Simulator (iPhone 17 Pro, light, default size):** the receipt final page, opened by link (nothing saved), shows the new tiles. The Founder's own sources go one per row there: a name below the fold has a word too wide for a half tile inside the form card. I could not scroll to see which (no input tooling). Not seen: dark mode (the app is set to Light), large text, and the Skip tile; tests cover them. The Simulator was left on Home.
- **Open:** (1) Should a card tile show the card's own name (`holder`, e.g. "Chase Sapphire") rather than the network? The design's "Chase" suggests so; I kept the network, to match every other Paid with line. (2) save-loan needs no change for the restyle. The brief's "Paid from tiles (+ Skip)" would need Dana L to pass `skip` and add a null (unanswered) state: today '' means none. (3) VoiceOver reads "••" as bullets app-wide; an "ending in 4821" label would be an app-wide copy change.
- **2026-10-09 — Dana P — CEO calls on the tiles:**
  - A card tile is named by the card's own name (`holder`, trimmed), falling back to the network; line 2 stays "••4821". Accounts are unchanged. The change is in `usePaymentSources`; `label` is untouched.
  - VoiceOver reads each tile as `ui.source.endingIn`: "{name}, ending in {last4}" / "{name}, terminada en {last4}" / "{name}, se terminant par {last4}". Tiles without digits read the name alone. The "••" reading elsewhere in the app stays.
  - Stacking one per row on a too-wide word is accepted as is.
  - Tests: spoken label in en/es/fr (3 new cases); hook test for holder, a blank holder and a spaces-only holder. 2 of 2 new mutants caught.
  - Gates: tsc 0; 32 suites / 1,391 tests (SourceTiles, the callers and the guards); eslint + prettier clean on the 5 files.

## 2026-10-09 — Dmitri (Development Lead) — review of the uncommitted Salary for everyone + Salary page redesign

**Outcome:** Approve after one small MUST-FIX on the Paid into page. The migration is safe to push now. Read-only review; no code edited.

- **Gates run:** `npx tsc --noEmit` passes for the whole tree with 0 errors, including the loan files. Suites: 21 (394 tests) for salary, pro copy, wall, trigger replay, paid-into-pick, pro-features, shared controls and settings; plus pay/payday, supabase/api/allowance and ui-pickers-language. All pass. ESLint (`--no-cache`) and prettier are clean on the salary files.
- **Money:** the total and this month's one-offs use the same `scheduledPerMonth`/`oneOffsInMonth` as before. The next-payday line leaves one-offs out, and payday maths is untouched. The past-pay comparison is unchanged. Deletes still run first, then saves in page order. Cleared names still block Save on a saved schedule, and hourly fields are kept.
- **Free plan:** no salary gate is left in the client or the DB. Cards and accounts keep theirs (cards.tsx, add-card/add-account, `enforce_free_allowance`). Every salary key is still used, and the removed keys are not referenced anywhere. The `fill` path of TogglePill is the same class for class, so TimePicker is unaffected.
- **MUST-FIX (Dana):** `salary-paid-into.tsx:30` `choose` has no guard to make the page leave only once. `router.back()` is global in expo-router 57 (see voice-edit.tsx:137), so a second tap pops /salary and loses every unsaved edit.
- **SHOULD-FIX:** VoiceOver does not read the PayRow note (pay-row.tsx:53; Dana). The SQL check leaves its test card behind and has never been run (Diego). The migration must be live before the build ships (CEO).
- **Open:** the Pro page promises "Move money between accounts", which is free on every plan. The account swatch stands in for a bank logo. With no accounts, the Paid into page offers only "No account".
- **2026-10-09 — Diego — Dmitri's salary review notes:** one_off_pay.sql now deletes the card it adds for the refusal check (and checks it is gone). free-allowance-triggers.test.ts uses one shared parser that reads `create [or replace] [constraint] trigger`, `drop trigger [if exists]` and `create [or replace] function` / `drop function [if exists]`, applied in statement order, with five synthetic cases. 8 of 8 pass. tsc: only error is in another agent's new, untracked src/__tests__/app/loan-calculator-design.test.tsx (TS2352 at 112:34).

## 2026-10-09 — Dana — Salary: Dmitri's review fixes, the CEO's "Add an account", and the Unlimited explainer (DONE, uncommitted)

- **MUST (leave once):** new `src/lib/use-navigate-once.ts` allows one navigation per visit and resets on `useFocusEffect`. The Paid into page's `choose` runs through it, so two presses give one pick and one back. **NIT:** the Salary page's Paid into row uses it too, so a double tap opens one page and the row works again on return.
- **SHOULD:** PayRow reads its note with the label (`Last payday, Next payday 15 Oct 2026`).
- **CEO (Add an account):** the Paid into page ends with an "Add an account" pill (`salary.addAccount` / `addAccountHint`, en/es/fr). It opens `/add-account?from=salary`, the free wall applies as usual, and the new account is listed on return, ready to pick.
  - add-account gained a `from=salary` mode: no pay switch, no expected income, no salary created and nothing linked. Otherwise the open Salary editor would refetch, remount and lose its edits. "Add another" keeps the mode.
- **NITS:**
  - The total card's count uses Save's own rule (`keptOnSave`, now shared with handleSave), so a blank new source is not counted.
  - The paycheck is worked out once per card.
  - `accountLabel` moved to `src/lib/account-label.ts`, which queries.ts imports (Diego's file: only the import and the removed function changed). The salary suites now use the real helper, not a copy.
- **Founder (via CEO):** the Unlimited explainer drops its middle point. `pro.unlimited.b` is removed in en/es/fr and the icon import is gone. `feature()` now takes the icons keyed by message part (`a`, optional `b`, `c`), so Unlimited keeps `a` and `c` and every other feature is unchanged. The Pro feature page draws the two points in its gap column.
- **Tests:**
  - New `add-account-from-salary` (3) and `account-label` (3). `salary-paid-into` gains the leave-once, double-tap/refocus and add-an-account cases. `salary-source-card` gains the spoken note, and `salary-total-card` the blank-source count.
  - The pro-features test now expects two or three points, with Unlimited's two in en/es/fr. `pro-feature` checks the two-point layout.
  - The copy guard now also rejects moving-money claims, and checks that `pro.unlimited.b` is gone.
  - The salary suites mock `useFocusEffect`; the two that open Paid into simulate the return.
  - 6 of 6 mutants were caught.
- **Gates:** tsc is clean for the whole tree. ESLint (cache cleared) and prettier are clean on all 31 files. 64 affected suites (1,138 tests, guards included) pass, plus the Pro and FAQ suites (86).
- **Simulator:** not checked this round, because the loan session was using it.

## 2026-10-09 — Dana L (Developer, UI and navigation) — Loan redesign, phase A: calculator, schedule, save (DONE, uncommitted)

**Outcome:** Done. The three loan screens match the Founder's PNGs. Every figure is the engine's, untouched. Also folded in, at the coordinator's request: the Founder's no-silent-clamp decision, and Dana P's call-site change (Paid from required, null/''). No commits.

- **Calculator** (`src/app/loan-calculator.tsx`):
  - Result card: payment headline, "N payments · last on", the extra and first-period notes, the borrowed/interest bar (hidden from VoiceOver), dotted rows, fees, the APR line and its note, "Total you repay".
  - "The loan": three slider rows in one card.
  - "Dates": two chevron rows.
  - More options (`more-options-card.tsx`): opens in place, no sheet. It holds extra, lump sum and date, fees, and the interest chips with their note.
  - Then the overpay card, an info line that follows the chosen convention, and the Payment schedule card.
  - A marked empty slot (`loan-upload-slot`) for phase C, straight above the pinned Save.
- **Schedule** (`src/app/loan-schedule.tsx`):
  - Summary card with a 2×2 grid. The rate reads "7.50% APR" only when fees are known and `truthInLending` agrees with the rate. Otherwise it reads "7.50%", plus an APR cell when the two differ.
  - Year headings show whole-year "N payments · $X interest".
  - Numbered rows show the first 8, then "Show all N payments". Days stay in the spoken label.
- **Save** (`src/app/save-loan.tsx`):
  - "Save this loan"; summary card with "/ month" and a 3-column grid; Name ("e.g. Car loan").
  - Loan type: a 4×2 grid (`loan-type-grid.tsx`, two columns when a name cannot fit); Personal is chosen by default.
  - Paid from: Dana P's tiles plus a Skip tile. Null means unanswered and '' means Skip. Save lists what is missing ("To save this loan, fill in: Name, Paid from."). The line sits above the button in the footer.
  - "Save to Loans".
- **Loan type, no migration:** `icon_id = 'loan-<type>'` (`src/data/loan-types.ts`); `save_loan` passes it straight into the free-text `bills.icon_id`. BillMark and BillRow draw the type's gradient icon, light or dark. Any other icon id keeps its glyph.
- **Icons:** 24 flattened copies in `assets/gradient-icons/loan-*.svg` (flattener in scratch; Desktop originals untouched).
  - Quick Look renders are pixel-identical to the originals (0 differing pixels, all 24).
  - Every dark original already carried the navy lift. Home has no navy, so its pair is identical.
  - Personal is byte-identical to loan-result, so the registry `src/theme/loan-icons.ts` reuses that pair.
- **No silent clamps (Founder):**
  - Typed amounts and rates are kept as typed past the slider ends (the thumb waits at the end).
  - The pad refuses an amount ≤ 0 or an empty rate, with a visible reason (new optional `check` on AmountPad).
  - Save refuses a rate the `loans` table cannot hold: its CHECK caps it at 0–100, numeric(6,3). The reason shows from the start, and the rate is never rounded.
  - The keypad already stops at 2 decimals and 9 whole digits.
- **Phase B hooks:**
  - `PaymentHeadline onEdit` (the figure becomes a button: "Monthly payment, $X. Edit").
  - `PaymentRow onPress(row)`.
  - Both pages read their params through `src/lib/loan-route.ts` (`readLoanRoute`), so new params land in one place. The calculator now also sends `fees` to the schedule.
- **Copy (en/es/fr):**
  - Terms are whole words in English ("5 years"), as drawn.
  - Rates have at least 2 decimals, never rounded ("7.50%", "6.125%").
  - Old keys retired: scheduleCard title/summary/a11y, proportion.*, save.icon/ratePerYear/termPayments/interestOverTerm/addToBills/needName, bills.icon.*, interestPaid, overpaymentsAndFees.
- **Archived** to `~/Desktop/SkipBudget-design-archive/2026-10-09/` and removed from the tree: proportion-bar.tsx, bills/icon-picker.tsx, illustrations/loan-schedule.svg. Before trimming, artwork.ts, bill-categories.ts (BILL_ICON_CHOICES) and messages/bills.ts were archived whole.
- **Tests:**
  - New suites: loan-icons (110), loan-icons-dark (13), loan-route (15), loan-calculator-design (11), loan-schedule-design (7), save-loan-design (21), components/loan-cards (13).
  - Updated suites: the calculator, schedule and save languages tests, calculator large-text, loan-parts-languages, shared-controls-large-text (loan cases only), add-bill-save (schedule card), large-text guard (loan-schedule and save-loan adopted).
  - 18 of 18 mutants caught, run from a scratch copy.
- **Gates:**
  - tsc 0.
  - eslint (cache cleared) and prettier are clean on my files. `npm run lint`'s only findings are in other sessions' in-progress files.
  - Full jest: 282 suites, 5,821 tests green. Loan-maths fixtures green.
- **Simulator (iPhone 17 Pro, light):**
  - Calculator top, schedule and save page seen at default size; the calculator also at AX-XL (text size restored to large).
  - Figures match the PNGs: $500.95, $5,056.96, $462.28 / $1,649.02, row 1.
  - Row captions set to the design's 11pt after the check.
  - Not seen: dark mode (the app is set to Light), and the calculator below the sliders (no scroll without driving the mouse); both are covered by tests.
- **Open:**
  - `buildBillValues` (src/api/entry-values.ts:139) saves `icon_id: null` for any non-Other bill, so editing a saved loan's bill erases its type. One-line fix for Diego: keep a `loan-*` id when the category is `loans`.
  - The loans CHECK caps rates at 100%. Rates up to 999.999% need a migration (Diego).
  - `SliderRow` never passed `scale="log"` to `Slider` (pre-existing), so the amount slider is linear, as the PNG also draws it. Passing it through is one line; it is the Founder's call.
  - The default convention stays daily actual/365 ($500.97). The PNG's $500.95 is the monthly-rests figure.

---

## 2026-10-09 — Diego (Developer, data and backend) — loan type kept when a loan's bill is edited

**Outcome:** Done, uncommitted. tsc 0 errors; eslint clean. 16 suites, 626 tests pass: entry-values, voice-draft, and the add-bill, voice-review and loan screens.

- **`buildBillValues` (src/api/entry-values.ts):**
  - A bill that is a loan (category `loans`, or the new optional `ctx.hasLoan`) keeps its icon id when that id names a known loan type (`loanTypeOf` from src/data/loan-types.ts, e.g. `loan-car`).
  - Every other bill is unchanged: an Other bill keeps its picked icon, and the rest get null.
- **`src/app/add-bill.tsx`:** one line, passing `hasLoan: Boolean(loan)` (`useLoanForBill` was already read there).
- **Tests (src/api/entry-values.test.ts):**
  - an edited loan bill keeps loan-car, with or without its loan read;
  - it keeps it after a move to another category while a loan stands behind it, and has none without one;
  - unknown `loan-boat` and the picker's `other` are dropped;
  - a normal bill is exactly as before.
- **Noted for later, no action:** `loans.annual_rate` has CHECK (0..100) (20260827100005_loans.sql), so rates over 100% cannot be saved. Waiting on the Founder.

## 2026-10-09 — Dmitri (Development Lead) — review of the restyled shared Paid with / Paid from tiles (uncommitted)

**Outcome:** Approved with no MUST-FIX items. Read-only review; no code edited.

- **Gates run:** `npx tsc --noEmit` exits 0 for the whole tree. 32 suites (1,434 tests) pass: SourceTiles, payment-sources, shared-controls-large-text, large-text-guard, account-label, and every caller (add-bill/-subscription/-receipt incl. scan, voice and habit, source-payment, voice-edit, voice-review, habit-new, the bill/receipt/subscription/habit detail pages, save-loan). The i18n guards pass too (9 suites). ESLint (`--no-cache`) and prettier are clean on the 5 in-scope files.
- **Semantics:** no caller file changed. The props contract is the same: `value`, `onChange(source.id)`, and `skip.selected`/`skip.onPress`. So '' = Skip, null = unanswered, required-ness, the Save "fill in" lists and the written ids are unchanged. The save suites still assert `card_id`/`bank_account_id`. `label` is byte-identical, and the `accountLabel` move is the same function body.
- **SHOULD:** no caller suite feeds rows that have `name`/`last4`. The production VoiceOver label ("X, ending in 1234") is never pressed through a save path. Add one caller case that does (e.g. add-receipt-save).
- **NITS:** `source-tiles.tsx:51` uses `??`, so an empty name shows a blank tile. Account `name` is not trimmed (queries.ts:440), but card `name` is. The selected border is 2.6:1 on the dark card (the check carries the state). Sand #E9CF9B sits at 1.51:1 on white, just above the 1.5 outline threshold, and contrast is measured against the card colour rather than the tinted selected background.
- **Not verified:** dark mode, large text and the Skip tile have still not been seen in the Simulator.
- **2026-10-09 — Diego — note:** the Founder keeps the 0–100% cap on `loans.annual_rate`, so no migration. Closed.
- **2026-10-09 — Dana P — Dmitri's review items on the tiles (approved, no must-fix):**
  - SHOULD: add-receipt-save gains "files the card picked by its spoken name and last four". Its sources carry name/last4 (Chase Sapphire ••4821, Chase Checking ••7730). It taps "Chase Sapphire, ending in 4821" and checks `card_id: 'card-9'`, account null.
  - Nit 1: a blank name now falls back to the label (`||`).
  - Nit 2: account names are trimmed (nickname, then bank).
  - Nit 3: the chosen border is `border-accent-ink`. Light is unchanged (#905479); dark goes from 2.6:1 to over 3:1 against the card.
  - Nit 4: the swatch outline is measured against what is behind it: the card, or the card plus the 10% plum when chosen (`mix`, now exported from theme/palette.ts). The threshold is 1.6, so Sand #E9CF9B (1.51:1 on white) is outlined.
  - Tests: blank-name fallback; border contrast checked from the real tokens; sand outlined; a grey outlined only on the tinted tile. The SourceTiles suite now uses `buildTokens`. 17 caller mocks gained `accent`. 4 of 4 new mutants caught.
  - Gates: tsc 0; 33 suites / 1,417 tests (SourceTiles, the callers, the guards); eslint + prettier clean on 22 files.
- **2026-10-09 — Dana L — Founder answers folded in (curved amount slider, no upload):**
  - **Amount slider is curved.** `SliderRow` now passes `scale` to `Slider`, and only the amount asks for `log`; rate and term stay linear.
    - The slider's maths moved, unchanged, into `src/lib/slider-scale.ts` (`sliderRatio` / `sliderValue`).
    - $25,000 now sits mid-track. Typed values past either end still park the thumb at that end.
    - New `src/__tests__/slider-scale.test.ts` (9) checks every half-point on 242, 297 and 324pt tracks. Drag → value → thumb → value has no drift. 500 and 1,000,000 are exact at the ends. Values never go backwards, and snap to whole numbers with 2 significant figures. Every rate to the hundredth and every term to the month round-trips.
    - The calculator test drags the real responder (0 → $500, 150/300 → $22,000, 300 → $1,000,000) and checks the thumb lands on the value.
    - 3 of 4 mutants caught. The fourth (dropping the `max(value, min)` guard) is equivalent, because the final clamp already handles any amount above 0.
  - **Upload removed (phase C cancelled).** The reserved slot and its comment are gone from the calculator, and the large-text test no longer looks for it. No i18n key had been added.
    - New test: nothing on the calculator (More options open), in en/es/fr, mentions an upload, a file, a PDF, a photo or a scan.
  - Daily interest stays the default; the 100% cap and its Save message stay. Diego has the bill-edit icon_id fix.
  - `save-loan-languages` now uses a full-palette colour mock, because Dana P's tiles read `colors.card` since 19:08.
  - **Gates:**
    - tsc 0; eslint (cache cleared) and prettier clean on the changed files.
    - Full jest: 284 suites, 5,855 tests green. That was the second run; the first overlapped Dana P's 19:11 test edits, and those 17 suites pass when re-run.
    - Simulator: the curved thumb was seen at $25,000.

---

## 2026-10-09 — Drew (Developer, money maths) — loan phase B: overrides maths, exact interest, high values, rate precision

**Outcome:** Done, uncommitted, nothing pushed. Two migrations are written as files only. tsc 0 errors. ESLint and prettier are clean on the 8 files. Full jest: 284 suites, 5,858 tests pass. Loan, APR and money suites: 196 tests. 26 of 27 mutants were caught; the survivor is an equivalent double guard.

- **API (`src/lib/loan-overrides.ts`, new):**
  - `PaymentOverrides { monthlyPayment?; payments?: Record<number, number> }`.
  - `scheduleWithOverrides(terms, overrides)` returns `OverriddenSchedule`: the `Amortisation`, plus `contract` (the schedule without extras, i.e. what is saved), `solvedPayment`, `applied` (what to save), `problems`, `unused`, `paymentCount`, `termMonths` and `balloon`.
  - Also `applyOverrides`, `checkOverride(terms, overrides, 'monthly' | n, amount)`, `paymentChoice(terms, overrides, n)` (for the per-payment page) and `paymentOverridesJson`.
  - The engine (`loan.ts`) takes `LoanTerms.paymentOverrides`. Rows gain `owed` and `overridden`. `termsFromStored` reads `payment_overrides`, so `amortise`, `comparePrepayment` and `payoffQuote` all follow saved changes.
- **Rules:**
  - Refused: an amount that is not whole cents, or is ≤ 0; a single payment below its period's interest (or below the regular payment, where that is lower); a monthly payment below principal × rate ÷ 12; the term's last payment.
  - A change above what is owed becomes the last payment and is saved as exactly what is owed. Changes after it are reported as `unused`.
  - Nothing re-solves the level payment; the last payment takes up the difference.
  - Validation always runs on the contract: extras are what-ifs and are never saved.
- **Engine fixes:**
  - Interest now posts as an exact BigInt fraction, rounded half up once. The old float path decided halves at 12 significant digits, which can misround postings from about $100 up. Every committed fixture is unchanged, but about 1 typical saved loan in 20,000 (1 large one in 3,000) moves by 1¢ from some row on, to the exact figure. (Corrected after Dmitri's review; the first version said every figure was unchanged.)
  - `solvePayment` no longer leaves a rounding balloon on loans that barely shrink. Example: 90% over 40 years had a final payment of $17.5 trillion; it now ends after 173 payments. Normal loans keep the published payment.
  - The `apr.ts` cap comment now says 120,000% (it said 1200%).
- **Fixtures (each cross-checked by an exact-integer reference and an independent Python decimal amortiser):**
  - $32,001 at 7.5% over 72 months: the app shows $553.21, the bank $554.23. With the bank's payment: final payment $462.11, 72 payments, interest $7,811.44. On the bank's own dates: final $554.29.
  - Real lender ($31,394.33): the default dates give $552.64 against the bank's $554.34. Payoff $28,787.75 and maturity 2031-12-14 are kept.
  - Bank's odd first payment ($536.28 = $478.83 + $57.45 odd days): from payment 2 on, every row is the textbook schedule's, with final $478.97.
  - $10,000 as payment 12: ends after 49 payments. Below interest: refused, minimum $243.30.
  - Cents: a final payment of $0.01; a half cent posts up ($5.005 → $5.01).
  - $2.5M at 6.875%: payment $16,423.22, final $16,423.89. MXN 50,000 at 60% (actual/360): payment $3,643.23, APR 60.66925%.
- **Storage:**
  - `20261009100007_loan_overrides.sql`: `loans.payment_overrides jsonb` with a check function. `save_loan` gains `p_payment_overrides` and `p_last_payment_on` (both default null; old clients still resolve).
  - `20261009100008_loan_rate_precision.sql`: `annual_rate` goes from numeric(6,3) to numeric(12,9). Three decimals is not enough: 7.4995% stored as 7.500% moves the first posting by $1.04 on a $2.5M mortgage, and its last payment by $1,153.33.
- **Not verified:** BigInt and timings on Hermes (measured in node: about 3.7 ms per calculator step at 480 months, the same as HEAD's comparePrepayment). Not run against Postgres (no Docker); the migration test reads the files.
- **Note:** another agent in this session uses `scratchpad/mut`. My first mutant run collided with it around 18:57–19:00, and their copy of loan.ts briefly held a mutant before it was restored. I now use `scratchpad/drew-loan-mutants`.

---

## 2026-10-09 — Diego (Developer, data and backend) — scratch run of Drew's loan migrations (0007 overrides, 0008 rate precision)

**Outcome:** Both migrations do what they say. One defect: 0007 is not re-run safe; the one-word fix is verified. New `supabase/checks/loans.sql`: ALL CHECKS PASSED, 30 checks. habits.sql (54) and one_off_pay.sql (34) also passed on the same copy.

**Docker:**
- n8n and cloudflared were already stopped; `docker stop` was a no-op.
- The scratch copy, `loans_check`, was owned by postgres to match the real DB. Every migration was applied as `postgres`, as the CLI does.
- The throwaway PostgREST v14.5 was bound to 127.0.0.1. Container, image, scratch DB and tokens were removed afterwards.
- Real local DB unchanged: 20261008100002, numeric(6,3). Docker was stopped with `docker desktop stop`; no process is left.

**Migrations:**
- 20261008100003–005 (which the copy lacked) and today's 0001–0008 were each applied in order, in their own transaction, twice.
- 20261008100003 needed a stand-in `cron` schema on the copy: pg_cron lives only in `postgres`, and the migration only unschedules a job.
- Second pass: all exit 0 except 0007 ("function save_loan already exists with same argument types"). It drops only the old 15-argument signature, then `create function`s the 17-argument one. With `create or replace function`, verified on a patched copy, it runs twice and the function is identical.

**save_loan:**
- Diff against 0014: security invoker, search_path=public, owner postgres, ACL {postgres, authenticated, service_role} (no anon, no public), volatile, returns bills, plpgsql are all unchanged. Only the two new defaulted parameters and the body additions differ. One overload.
- The app's HEAD call (13 named params, through real PostgREST) returns 200 on both the old and the new function, with byte-identical bill and loan rows. payment_overrides is null.
- The new call stores `{"1": 612.40, "14": 1000}` exactly and ends the bill on the last payment day.
- Refused (23514 `loans_payment_overrides_valid`):
  - keys 0, 01, x, 1.5, and = term;
  - amounts given as a string, 0, negative, 3 decimals, or > 999999999999.99;
  - an array instead of an object;
  - row updates that break the rule.
- Allowed: key term−1, amount 999999999999.99, last payment on the term's end.
- A last payment outside the term is refused with P0001. A refused call leaves no bill.

**Rate precision:**
- Widening keeps every stored value (7.500 reads 7.500000000; 6.063 and 100.000 unchanged).
- 7.4995 → 7.499500000; 6.0625, 8.139865, 0.000000001 and 99.999999999 are exact.
- 100.000000001 is refused (`loans_annual_rate_check`).
- 10+ decimals are silently rounded: 7.12345678949 → 7.123456789, and 100.0000000001 → 100 is accepted.
- PostgREST returns the rate as a JSON number with nine decimals; JS parses it exactly enough for loan.ts's billionths.
- Nothing else in the DB uses annual_rate (no views or rules; only save_loan).

**For Dmitri:**
1. 0007: `create function public.save_loan(` → `create or replace function`.
2. `rateSavable` (src/lib/loan-route.ts:139) still allows only 3 decimals (`Math.round(rate*1000)/1000`, comment "to its three decimals"), so Save refuses 7.4995 although the DB now keeps it. It should allow 9 decimals, tested the way loan.ts `exactRate` does (toPrecision), and refuse more than 9 (the column would round).
3. useSaveLoan does not send overrides or last payment yet. When it does:
   - keys are payment numbers 1…term−1 as strings;
   - amounts are cent-exact (fromCents(toCents(x)));
   - out of range is refused with 23514 or P0001, so map those for the form;
   - useLoanForBill does not select payment_overrides yet.
4. The 0008 ALTER rewrites the loans table under an exclusive lock: tiny table, negligible.

## 2026-10-09 — Dmitri (Development Lead) — review of Drew's loan phase B (maths + migrations 0007/0008, uncommitted)

**Outcome:** Changes requested. The maths is sound and verified independently. One MUST in 0007: the CHECK function has no grant, which could block every loan save.

- **Verified:** tsc 0. Loan/APR/money/migration suites: 7 suites, 196 tests pass. ESLint (no cache) and prettier clean on the 8 files. Committed loan/apr/money tests untouched. 9 pinned fixtures recomputed with a Python decimal amortiser that shares nothing with the app (own calendar): all match to the cent.
- **MUST (Diego/Drew):** `20261009100007_loan_overrides.sql:33-66`: `loan_payment_overrides_valid` has no `grant execute`. A CHECK's function runs with the inserting role's EXECUTE privilege (save_loan is SECURITY INVOKER, so that role is `authenticated`). config.toml says new public functions are not auto-exposed (always-revoked from 2026-10-30). Grant it to authenticated and service_role. Test the insert as `authenticated`, and assert the grant in loan-migrations.test.ts.
- **SHOULD:**
  - 0007:77 `create function` fails on a re-run; use `create or replace`.
  - The monthly floor ignores the basis. On actual/360, P×r/12 is below the interest: $25k at 24.99% over 30y ends with a $645,822.90 last payment, and 100% over 40y passes 2^53 cents.
  - A payoff change is saved cut to what is owed. After an earlier payment is lowered it leaves a $302.84 tail; the typed amount would still end the loan.
  - "Every figure unchanged" holds for the fixtures, not for every saved loan. About 1 in 20,000 (large loans 1 in 3,000) moves 1 cent, and the new figure is the exact one (146,049.4999997¢ is $1,460.49, not .50). The comment's "tens of thousands" threshold is wrong.
  - Diego: select `payment_overrides` only after 0007 is live, and relax rateSavable to 9 decimals only after 0008.
  - Each period computes both the float and the BigInt posting; it needs only one.
- **NITS:** wholeCents silently rounds amounts of $1B and over. The floor is computed through float toCents. 0008 and the high-values header still cite the cancelled upload. The BALLOON_STEPS comment.
- **Performance (node, not Hermes):** each calculator step at 480 months, HEAD to new: 4.5→4.8 ms with the JIT, 6.7→7.1 ms with `--jitless`. In the round-up region it is 4.1→9.3 ms with `--jitless`. Dilip should measure on a device. Fallback: float posting, with BigInt only near a half cent.
- **Open:** Founder: the round-up rule ends small, high-rate, long loans 2–39 payments early instead of a balloon. No real-statement fixture covers overrides yet.

---

## 2026-10-09 — Diego (Developer, data and backend) — loans phase B, data side

**Outcome:** Done, uncommitted. tsc 0 errors; eslint clean on my files. New tests: 17 of 17 pass. 47 related suites: 43 pass. The 4 that fail (loan-calculator-design, loan-schedule-design, loan-schedule-languages, save-loan-design: 6 tests) are Dana L's in-flight screen work: save-loan.tsx now passes `paymentOverrides: null, lastPaymentOn: null`, loan-calculator adds a `draft` route param, and the rate hint no longer says "three decimals". Her test files are older than those edits.

- **`useSaveLoan`** (src/api/mutations.ts): `SaveLoanValues` gains `paymentOverrides?: Record<string, number> | null` (from `paymentOverridesJson`) and `lastPaymentOn?: string | null`.
  - Sent as `p_payment_overrides` and `p_last_payment_on` only when set and non-empty.
  - Otherwise the call is exactly the old 13 named params, which a database without 0007 still accepts.
  - Someone had added and then reverted a version of this mid-task; this is the full one.
- **`useLoanForBill`** (src/api/queries.ts): selects `payment_overrides` and returns it as `LoanRow.payment_overrides: Record<string, number> | null`. On a 42703 naming the column it reads again without it and returns null. `termsFromStored(row)` follows the saved edits.
- **New `src/lib/loan-refusal.ts`:** `refusedLoanSave(thrown): 'payments' | 'rate' | 'lastPayment' | null`.
  - 'payments': 23514 naming loans_payment_overrides_valid.
  - 'rate': 23514 naming loans_annual_rate_check.
  - 'lastPayment': P0001 "the last payment must fall within the term".
  - Anything else is null, which means the house failure line.
- **Tests:** `src/lib/loan-refusal.test.ts` (uses the exact PostgREST bodies from the scratch run) and `src/__tests__/api/loan-save.test.tsx`.

## 2026-10-09 — Dana L (Developer, UI and navigation) — Loan phase B UI: the bank's payment, changed payments, Save with changes (DONE, uncommitted)

**Outcome:** Done on Drew's API (`src/lib/loan-overrides.ts`, including his review changes) and Diego's data side (`SaveLoanValues.paymentOverrides`/`lastPaymentOn`, `refusedLoanSave`, `LoanRow.payment_overrides`). Nothing committed. Save sends the new fields only when set, so a loan with changes waits for migrations 20261009100007/0008.

- **Flow:**
  - The calculator opens a draft: `src/lib/loan-draft.ts`, one in-memory slot read through `useSyncExternalStore`, the same pattern as voice-draft.
  - The payment pages write the draft on Done; back writes nothing.
  - The calculator and the schedule underneath read it live.
  - Forward, the changes travel as params through `loan-route.ts` (`monthly`, `overrides` as `paymentOverridesJson`, `draft`). New helpers there: `overrideParams`, `termsFromRoute`, `baseParams`.
  - A link without the open draft is read-only.
- **`/loan-payment`** (`src/app/loan-payment.tsx`, a full page, no sheet):
  - **Monthly:** Skip's figure, the bank's payment if set, a field for the bank's payment, "Use this payment", and "Use Skip's figure" when one is set. Skip's own figure typed back counts as no change.
  - **Single payment:** `paymentChoice` figures (regular, interest, the least it can be, what pays it off), a field that starts on `typed ?? current`, and "Back to the regular payment" when the payment is changed. The regular amount typed back counts as no change.
  - **Read-only states:** the last payment shows with its reason. "Paid off before this payment", "no such payment" and "this loan isn't open any more" have their own messages.
  - **Refusals:** `checkOverride` reasons in plain words, en/es/fr, with the minimum quoted and announced to VoiceOver. The monthly reason reads "can't keep up with this loan's interest", to match Drew's steady-payment floor.
- **Calculator:**
  - One `scheduleWithOverrides` per step, priced from `useDeferredValue` inputs: the thumb and its value follow the finger, and the figures catch up when it stops.
  - "Your bank's payment" label, plus "Skip works it out as $X".
  - Danger lines for the balloon ("Your last payment would be $X") and for changes that stopped fitting.
  - A muted note for unused changes. They stay in the draft, so a drag cannot destroy them, but they are not saved.
  - Save is held with "To save this loan, fix: …". It sends the TYPED draft to the save page (Drew's review point).
  - The headline's pencil opens the monthly page.
- **Schedule:**
  - Prices with the changes.
  - "Changed" tag on changed rows, spoken as "Changed by you."
  - Rows open their payment page only on the open draft, with a hint.
  - Bank label, balloon line, problem lines and the unused note.
  - A saved loan's changes come from add-bill's link, which now passes `payment_overrides`.
- **Save:**
  - Prices the contract with the changes and labels the bank's payment.
  - The payment count is the actual one (for example "49 monthly").
  - Saves `monthlyPayment`, the contract's total interest, `paymentOverridesJson(applied.payments)` (as typed), and the contract's payoff date only when it falls before the term.
  - Changes the loan no longer takes are shown from the start and block Save.
  - `refusedLoanSave` reasons are put into words: changed payments, last payment, and rate (the range line). Anything else gets the house failure line.
- **Rates:** `rateSavable` allows nine decimals, read as the engine reads them (×1e9, 15 significant digits), with 0–100. The message now says "nine decimals".
- **Tests:**
  - New suites: `loan-draft` (3), `app/loan-payment` (19), `app/loan-overrides-flow` (17). Figures are Drew's fixtures or the engine's own; floors come from `checkOverride`, so they follow his rules.
  - Updated suites: `loan-route` (18), `loan-cards` (Changed tag, hint), and the calculator and save design tests.
  - Large-text guard: `loan-payment.tsx` adopted.
  - 17 of 17 mutants caught.
  - The mutants ran in my own `scratchpad/danal-loan-mutants`; another agent is using `scratchpad/mut`.
- **Gates:** tsc 0; eslint (cache cleared) and prettier clean; full jest 289 suites, 5,932 tests green.
- **Not verified:**
  - Slider smoothness on a device: no Hermes runtime here, and I can't drag in the Simulator without driving the mouse. The deferred pricing is the mitigation.
  - The payment pages in the Simulator: opening one needs the live draft id. Tests cover them.
  - Seen: the calculator's headline pencil.

## 2026-10-09 — Drew (Developer, money maths) — Dmitri's phase B review fixes

**Outcome:** All items done, uncommitted, nothing pushed. tsc 0 errors. ESLint and prettier are clean. Full jest: 289 suites, 5,932 tests pass.

- **M1:** 0007 now revokes `loan_payment_overrides_valid(jsonb, integer)` from public and anon, and grants it to authenticated and service_role, before the constraint. `loan-migrations.test.ts` checks the grant, the revoke and their order. Not run on Postgres (no Docker).
- **S2:** the monthly floor is now `steadyPayment(terms)` (new, in loan.ts).
  - It is the least m with posting(max(P, P + opening − m), costliest scheduled period) ≤ m. That uses the exact posting, on the loan's own calendar and convention (31/365, 31/360, a 33-day 30/360 month-end period, one monthly rest). The cent is found by bisection.
  - A typed payment is taken when it is at or above min(steady, the app's own payment), or below that if it still closes the loan without a balloon (a bank's figure a cent under the app's).
  - Where the regular payment is under the steady one, single payments may be raised but not lowered.
  - Fixtures:
    - $32,001 car loan: steady $203.84; with the bank's 37-day opening, $204.09 (the balance never passes $32,040.21).
    - $25,000 at 24.99% over 30 years, actual/360: $520.63 used to pass with a $664,264.78 last payment; it is now refused, minimum $528.18.
    - 100% over 40 years: the old floor's last payment was over 2^53 cents; now refused.
  - New sweep: 300 adversarial loans (100%, 480 months, 75-day openings, $10B principals). Every figure stays a safe integer. No last payment exceeds principal + opening interest + 2 payments. At or above steady, no balance passes what payment 1 leaves.
- **S3:** a change above what is owed is saved as typed ($50,000 stays $50,000). Lowering payment 3 afterwards still ends the loan at payment 30. Saved cut to $20,970.80, it would leave a 31st payment of $302.84, and a test pins both. `PaymentChoice.typed` added.
  - Dana L: Save needs no change (it files `applied.payments`). The payment page can open on `choice.typed ?? choice.current`.
- **S4:** corrected the loan.ts comment and my earlier log line. About 1 typical loan in 20,000 (1 large loan in 3,000) moves 1¢, to the exact figure.
- **S6:** each period computes only the posting it uses.
- **Nits:**
  - `wholeCents` now judges float noise (4 ulps) instead of 12 significant digits, and caps at numeric(14,2). Direct tests were added in money.test.ts.
  - The upload mentions are gone from 0008 and the high-values header.
  - The balloon round-up is one step, with the reason in the comment (rule unchanged, pending the Founder).
- **Found while mutating:** `steadyPayment` first walked a cent at a time from its estimate, so a poor estimate on a $10B loan could walk for ever. It now bisects (O(log)).
- **Also:** `AppliedOverrides.steadyPayment` (computed once per check; `paymentChoice` reuses it).
- **Mutation testing:** 9 new mutants on the floor, typed amounts and wholeCents, all caught. The earlier set: all caught but the known equivalent (the last payment is guarded twice). Loan suites: 213 tests.
- **Cost:** about 0.9 ms more per calculator step when a monthly payment is typed (node). Dilip should still measure on a device.

## 2026-10-09 — Dmitri (Development Lead) — final pre-push check, loans phase B: GO, provided 0007 and 0008 are live first. tsc 0; 31 loan/money/apr/save suites, 989 tests pass; Drew's M1/S2/S3/S4/S6/wholeCents/bisection fixes confirmed. Risk: unchanged loans the 1-cent round-up ends early send p_last_payment_on (save-loan.tsx:113), 74 of 1,344 realistic loans in a sweep, so they need 0007; rateSavable's nine decimals need 0008.

## 2026-10-09 — Drew (Developer, money maths) — Loans page maths: loanStatus and loansSummary

**Outcome:** Done, uncommitted. New `src/lib/loan-status.ts` with 20 tests in `loan-status.test.ts`. All 9 mutants caught. My files are lint, prettier and tsc clean. Loan suites: 233 tests.

- **API:**
  - `loanStatus(terms: LoanTerms, today: string /* yyyy-mm-dd */): LoanStatus`, giving borrowed, monthlyPayment, paymentCount, paymentsMade, paymentsLeft, amountLeft, percentPaid, nextPayment {number, date, amount} | null, lastPaymentOn and paidOff.
  - `loansSummary<L extends { status: LoanStatus }>(loans): LoansSummary<L>`, giving totalOwed, monthlyPayments, nextPayment (with its loan; the first listed wins a tie), openCount and paidOffCount.
  - It is built on `amortise`, so changed payments and statements count, and its rules follow the brief: a payment day counts as made; principal only; a half percent rounds up; 99% at most while a cent is left, and 0%, not less, when the balance is above the amount borrowed.
- **Design reproduced to the cent** on monthly rests, with each loan funded a month before its first payment and today = 9 Oct 2026:
  - Car: first payment 15 Jan 2025, $424.80, 27 of 48, $10,673.63, 41%, next 15 Oct.
  - Personal: first payment 9 Oct 2026, $500.95, 59 of 60, $24,655.30, 1%, next 9 Nov.
  - Totals: $35,328.93 owed and $925.75 a month.
  - On the calculator's default (actual/365) the same loans would show $10,673.67 and $24,653.14.
  - Cross-checked by Python decimal and by referenceSchedule.
- **Other fixtures:**
  - Not yet started: 60 of 60, $25,000, 0%.
  - Paid off on the last payment's day: left out of the totals.
  - Changed payments read back from a saved row: 18 of 39, $9,535.20, next $3,000.
  - Statement: $28,698.15 on the statement day, then $28,342.21.
  - $0.01 left reads 99%.
- **For the others:** the full suite currently fails in `cards.test.tsx` and `save-loan-design.test.tsx`, and tsc fails in `loans-list.test.tsx`. All three are in-flight work by Dana L and Diego, not these files.
  - `loans.tsx` uses `bill.next_due_on` as termsFromStored's fallback first payment. It should be `bills.starts_on`: next_due_on moves forward, so a row without first_payment_on would restart at 0 made.

## 2026-10-09 — Dana L (Developer, UI and navigation) — Loans page (DONE, uncommitted)

**Outcome:** `/loans` built to the Founder's PNG on Drew's `loanStatus`/`loansSummary` and Diego's `useLoans`/`loanTermsOf` (first payment falls back to the bill's `starts_on`). The entry points are rewired. Not seen in the Simulator: Metro is stopped by the Founder.

- **Page** (`src/app/loans.tsx`, with `src/components/loans/`):
  - Header: back, "Loans", "+" (→ /loan-calculator).
  - Summary card: the loan-result icon, "Total you owe", then Monthly payments and "Next payment" ("9 Nov · Personal loan").
  - "Your loans" with "N saved".
  - One card per loan:
    - its type icon from `bills.icon_id` (Other for a loan saved before types), the name, and "$25,000 · 7.50% · 5 years" (term in whole words per the brief; the PNG has "yrs");
    - a 3-column SummaryGrid (Monthly / Payments left "59 of 60" / Next "9 Nov") that stacks when a word cannot fit;
    - a progress bar and "1% paid off · $24,655.30 left".
    - The card is one VoiceOver control with a hint, and it opens /bill/[id].
  - "Paid off" section: listed, out of the totals, and opens its bill.
  - Info line and "+ New loan calculation".
  - States: empty invitation; skeleton while reading; failure page with Try again (a failed read is never "no loans").
- **Decisions:**
  - A loan whose bill has stopped running (`billEnded`) is listed under Paid off and left out of the totals, so the page agrees with the Cards tab's "{n} active". Its card reads the bill's end date.
  - With only paid-off loans, the summary card stays (owing $0.00) instead of "No loans yet".
- **Navigation:**
  - New `finishFlowOn(href)` in `src/lib/nav.ts`: dismissAll, then push; replace when nothing is beneath. `resetTo` would leave /loans as the only screen.
  - After "Save to Loans" the person lands on /loans with the toast, and Back returns to the tab underneath, never into the calculator or the finished save page.
  - The Cards tab's Loans tile opens /loans for any count, including while loading; its text is unchanged.
  - Typed routes were regenerated without Metro, through the CLI's own generator (`regenerateDeclarations`). Only `/loans` was added.
- **Copy:** `loan.list.*` in en/es/fr.
- **Tests:**
  - New `app/loans.test.tsx` (14), on real schedules: the design's personal loan reproduces its card exactly ($500.95, 59 of 60, 9 Nov, 1%, $24,655.30). It also covers the totals that leave out the paid-off and ended loans, the soonest next payment, type icons, VoiceOver, empty/loading/error, es/fr, large-text ceilings and the columns stacking.
  - `loan-icons-dark` gains the loan card.
  - Updated: the Cards tile cases and the save-landing cases (dismissAll then push, or replace).
  - Large-text guard: three files adopted.
  - 9 of 9 mutants caught.
- **Gates:** tsc 0; eslint (cache cleared) and prettier clean; full jest 292 suites, 5,978 tests green.

---

## 2026-10-09 — Diego (Developer, data and backend) — useLoans for the Loans page

**Outcome:** Done, uncommitted. eslint and prettier clean on my files. 44 related suites, 1,109 tests pass. tsc: my files are clean. The only error is in Dana L's new `src/__tests__/app/loans.test.tsx:100`: her `loan()` fixture's `bill` default needs `starts_on: null` because the field is required.

- **`useLoans(today)`** (src/api/loans.ts) returns `{ loans: LoanListRow[]; isPending; isError; refetch }`.
  - One read: `loans` with `bill:bills!inner(id, name, icon_id, starts_on, next_due_on, ends_on)`, plus `payment_overrides` with the same 42703 fallback as `useLoanForBill`. The fallback now lives in shared `withPaymentOverrides` and `readLoanRow` in queries.ts, which turn figures into numbers.
  - Order: oldest saved first.
  - `billEnded` uses the exact rule `activeLoans` uses, now exported as `loanBillEnded`. Bills have no archived state, so ended is the only one.
- **`loanTermsOf(row)`** = `termsFromStored(row, row.bill.starts_on)`. A loan without its own first payment date counts from the bill's first due date, not its next one (Drew).
- **Invalidation:**
  - The cache key is under 'loans', so `useSaveLoan` already refreshes it.
  - `DEPENDENTS.bills = ['loans']`, so every bill edit, delete and logo change refreshes it.
  - The realtime provider's `bills` entry now also invalidates 'loans'.
  - Deleting a bill still cascades to its loan (unchanged).
- **Tests:** `src/__tests__/api/loans-list.test.tsx`, 9 tests on a stateful fake DB:
  - one read with the embed and overrides;
  - the starts_on fallback;
  - billEnded as today moves;
  - the missing-column fallback;
  - an error is not an empty list;
  - empty;
  - refreshed by save_loan, a bill edit, and a bill delete that cascades.

## 2026-10-09 — Dmitri (Development Lead) — Loans page review: GO, no MUST. tsc 0; loan-status, loans, loans-list, cards, save-loan, loan-overrides-flow, loan-icons-dark, large-text-guard: 11 suites, 145 tests pass. Totals, amount left, payments left, next payment and paid-off exclusion are summed in cents; bill_id is unique, so no loan is listed twice; a failed read shows Try again. dismissAll then push run in order through expo-router 57.0.15's routing queue. Risks for the Founder: a loan whose bill was stopped early reads "Paid off on <end date>" with money left, or "Paid off on —" when it has no end date (loans.tsx:29, :49); on the last payment day /loans says paid off while the Cards tile still counts it active; landing not yet seen on a device.
- **2026-10-09 — Diego — Dmitri's Loans note:** add-bill.tsx now builds a loan's terms with the new shared `loanTermsForBill` (src/lib/loan-start.ts), the same as `loanTermsOf`: a loan without its own first payment date counts from the bill's `starts_on`, not `next_due_on`. Its Payment schedule link now passes the start the card used (`toIsoDate(terms.firstPaymentOn)`) instead of `first_payment_on ?? ''`. Tests: src/lib/loan-start.test.ts (3), plus one case in add-bill-save.test.tsx. tsc 0, eslint clean; 6 suites, 334 tests pass. loans.tsx and active-loans.ts untouched.
- **2026-10-09 — Dana L — Loans page, Dmitri's two fixes:**
  - **One rule for finished:** `loanFinished(bill, today, lastPaymentOn?)` in `src/lib/active-loans.ts`. A loan is finished once its last payment is dated on or before today, or once its bill has stopped running (`loanBillEnded`, now `ends_on <= today`).
    - The Cards tile (`activeLoans`) and `/loans` both call it, so on a loan's last payment day neither counts it as active.
    - Test: the last-payment day, the day before, and a stopped bill.
  - **Finished section:** the lower section is now called "Finished" (Terminados / Terminés).
    - A loan the schedule has paid off reads "Paid off on {date}".
    - A loan whose bill stopped with money still owed reads "Stopped on {ends_on} · $X left", or "Stopped · $X left" when it has no end date. VoiceOver says the same.
    - Both stay out of the totals.
  - The test fixtures carry `starts_on`, and the page and its test both build schedules with `loanTermsOf`.
  - **Gates:** tsc 0; eslint and prettier clean; the loans, cards, loan-status and active-loans suites, guards and i18n all pass (12 suites, 123 tests).

---

## 2026-10-09 — Diego (Developer, data and backend) — bill categories: Health & Medical, Education; family and loans retired from new bills

**Outcome:** Done, uncommitted, not pushed. No Docker used. tsc and eslint are clean on my files. My new and changed suites pass. In the wider run, 24 tests fail in 5 suites, all with `useTheme is not a function` from Dana L's new src/theme/bill-icons.ts (those screen tests' theme mocks lack useTheme). tsc errors remain in her in-flight files.

- **Migration `20261009100009_bill_categories_health_education.sql`:**
  - Upserts `health` (Health & Medical, "Doctor, dental, meds", 8) and `education` (Education, "Tuition and courses", 9).
  - Re-sorts: transport 7, other 10, loans 11, family 12.
  - `update bills set category_id = 'health' where category_id = 'family'`.
  - The family and loans rows stay. Re-run safe. Only the updated_at trigger is on bills.
- **Voice (`src/lib/voice/bill-category.ts`):**
  - Ids are now the picker's 10 (no loans, no family).
  - Medical, hospital, doctor and dental bills → health; tuition and school fees → education.
  - Childcare words, loan words and card-payment words → other (still a bill).
  - A finance brand no longer suggests a category, so the review page asks.
  - parse.test: 6 rows updated (category only; brand-only rows add 'category' to missing).
  - bill-category.test now checks the fixed picker order, and that every id is drawable through `getBillCategory`.
- **Reads:** new `src/lib/retired-bill-categories.ts` (`currentBillCategory`: family → health). useBills and useBill fold on read, so the ledger, money book, insights totals, the bill page, filters and the add-bill edit all see health, and an edit saves health.
- **Unchanged on purpose:** `loans` in entry-values (loan icon), save_loan, the demo seed's car loan (`'loans'`), and logo-lookup `loans: 'banking'` (only its comment changed). No edge function or report SQL uses the ids.
- **Tests:** retired-bill-categories (2), api/bill-categories-read (3), supabase/bill-categories-migration (3), voice (309).

## 2026-10-10 — Dana L (Developer, UI and navigation) — Add a bill: the category page and bill icons everywhere (DONE, uncommitted)

**Outcome:** Done on Diego's data side (migration, `retired-bill-categories`, voice ids). The first page of Add a bill matches the PNGs. Every bill renderer draws the new gradient icons, light or dark.

- **Page** (`src/app/add-bill.tsx`, `src/components/bills/category-picker.tsx`):
  - Header "Add a bill" with back and close; left-aligned "What’s this bill for?" and "Pick one. You can change it later."
  - The ten tiles, two to a row, in the brief's order and words.
  - Each tile: 40pt gradient icon, name (15 semibold), hint (12).
  - Selected: a plum border, a soft plum fill and a check badge top right. They use `accent-ink`, so dark mode gets the lighter plum and a dark check, as drawn.
  - A tap goes straight on (no Continue). Back shows the tile still selected.
  - Large text: names and hints shrink together, one column once either would go under its size.
  - The review page's category row shows the category's icon; a loan's bill shows its loan type.
- **Data** (`src/data/bill-categories.ts`):
  - `BILL_CATEGORIES` is the ten pickable categories.
  - `LISTED_BILL_CATEGORIES` adds Loans & Credit (filters, Insights labels).
  - `getBillCategory` folds family → health.
  - `billIconOf(bill)` is the one rule: a loan type via `icon_id` (Other for an untyped loan), else the category's gradient icon, else null. Null means a spending category keeps its glyph, as Insights uses it.
- **Icons:**
  - 20 copies in `assets/gradient-icons/bill-<id>{,-dark}.svg`, with gradients moved into `<defs>`.
  - Quick Look renders are pixel-identical to the originals once their intrinsic 48px size is set aside.
  - Every dark copy already had the navy lift; housing, water and other have no navy.
  - Registry: `src/theme/bill-icons.ts`; drawing: `src/components/bills/bill-icon.tsx`.
  - BillMark and BillRow use it, so bill rows, the bill page, Home, Activity, Bills, card activity, Change logo, Insights and Voice review all follow. A logo still wins.
- **Copy (en/es/fr):**
  - New names and hints for every category, Health & Medical and Education, and the subtitle.
  - "Other bill" → "Other" (Insights keeps its own "Other bill").
  - Name-box hints for Health and Education replace Family's.
  - Family's keys are gone; the label map still reads `family` as Health & Medical, as a fallback behind Diego's fold.
- **Diego's follow-ups:**
  - Insights uses `LISTED_BILL_CATEGORIES` and has health/education labels.
  - The filter offers Loans & Credit.
  - The bill page and voice edit/review use `getBillCategory`.
  - Editing a loan's bill keeps `loans` and its `loan-<type>` (test added).
- **Tests:**
  - New: `bill-icons` (94: files, svgr, dark lift with id prefixes normalised, registry) and `bill-icons-dark` (10).
  - `bill-icons.test.ts` (data) gains the order, words, retired categories and `billIconOf`.
  - `category-picker-large-text` is re-measured from Montserrat's advance widths (SemiBold 15 / Regular 12); its outcomes come from replaying the fit rules.
  - add-bill: the ten tiles in order, no Loans or Family, the check badge on Back, a loan bill keeping `loans`.
  - 12 suites gained a registry mock; 3 had their categories mock updated.
- **Gates:**
  - tsc 0; eslint (cache cleared) and prettier clean on 43 changed files.
  - Full jest 298 suites, 6,118 tests green.
  - Two earlier full runs timed out in the long i18n suites under load; those pass alone and in this run.
- **Simulator:** the page was seen in light mode as designed. Not seen: the selected state and dark mode (no taps; the app is set to Light). Both are covered by tests.

## 2026-10-10 — Dmitri (Development Lead) — Add a bill categories + bill icons review: GO, no MUST. tsc 0; 32 suites / 1,218 tests pass (bills, add-bill, insights, voice, bill-icons, retired-bill-categories, bill-categories). family folds to health on read in useBills/useBill, so Insights totals, bill filters and the money book group it under Health and an edit saves health; Home "Where your money went" groups by kind, not category. Voice ids exclude family/loans. Loan bills keep loan-<type> (billIconOf checks it first; buildBillValues unchanged); a logo still wins in BillMark; unknown ids fall back to the glyph and the stored label. Tap goes straight on, Back shows the check. Risks: an Other bill with an old picked glyph now wears the Other gradient icon; Insights receipt categories that share an id (transport, insurance, other) now show the bill gradient icon; dark mode and the selected state not seen on a device.
