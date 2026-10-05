# Voice input: lead code review

Dmitri, 2026-10-01. Reviewed against the brief, my plan, Pia's spec and the Founder's later decisions
(PRO badge on the FAB, save goes to Home, copy approved, Xfinity/Hulu examples). Line numbers are for the
working tree on `almost-done-all-pages` as of 16:35. Out of scope and not reviewed: `src/app/auth.tsx`,
`signup.tsx`, `verify-otp.tsx`, `src/api/push*`, `sign-in-handoff.test.tsx`, plus Drew's separate
money-rounding ticket (`format.ts`, `split.ts`, `account-card.tsx`, `payment-card.tsx`). I edited no code.
I wrote the probes below only in scratchpad copies of the tree.

## Verdict

**Not approved yet for the Founder's build review.** There are two blocking defects, both small and contained:
**B1** (a learned correction can permanently turn one real store into another) and **B2** (a figure
with more than two decimals is rounded and shown as if it were heard). Once those land with fixtures and I've
re-read the diffs, I would approve. The should-fix items (S1–S4) are a few lines each and can come with them,
but I would not hold the build for them. Separately, the build itself has two non-code gates (G1 Sentry token,
G2 migrations).

The rest is in good shape. The save path matches the forms, the golden tests prove the refactor did not
change what the forms write, the mic stops on every exit I could trace, nothing can show $0 or NaN, and the
voice pages have no overlays except the confirm dialog.

---

## Blocking

### B1. One changed store poisons every later entry, and correcting it back never heals it (Drew + Dana)

- `src/app/voice-review.tsx:246-256` learns `(draft.merchantHeard → chosen)` whenever the merchant was
  changed. That includes when the heard words were an **exact** catalog match.
- `src/lib/voice/parse.ts:101-104` checks learned aliases **before** exact catalog names.
- `src/lib/voice/aliases.ts:46`: `learnAlias` returns the pairs unchanged when the heard words equal the new
  name, so it never removes the bad pair.

**Scenario (proven with a probe through the real `parseVoice` and `learnAlias`):** "spent $5 at Target"
parses as Target. The person meant Walmart, so they change it and save, and `["target","Walmart"]` is stored.
From then on, every "…at Target" opens as **Walmart, confidence high**. When they correct it back to
Target, `learnAlias('target','Target')` is a no-op, so the pair stays until sign-out or until 200 newer
pairs push it out. Probe output: `after one change: Walmart … conf high`; `pairs after correcting back:
[["target","Walmart"]] unchanged object: true`; `third time: Walmart`. The same happens with catalog
aliases: "Comcast" changed to AT&T teaches `comcast → AT&T`. Nothing saves without a tap, but a
high-confidence wrong store on a page people learn to trust is how wrong receipts get filed.

**Fix:**
- (Drew) A correction that maps the heard words back to themselves must **delete** any pair for that key.
- (Drew) Put the match source on the draft, e.g. `merchantSource: 'alias' | 'exact' | 'fuzzy' | 'typed' |
  null`. Diego validates it in `validateVoiceDraft`.
- (Dana) Learn only when the source was `fuzzy`, `typed` or `alias`, never `exact`. A changed exact match
  means the person changed their mind, not that Skip misheard.
- Fixture: the three-step Target → Walmart → Target sequence above.

### B2. Figures with more than two decimals are rounded and shown as heard (Drew)

- `src/lib/voice/clean.ts:135`: `readNumber` sends every digit literal through `toCents`.
- `src/lib/voice/numbers.ts:285-293` does the same for spoken decimals ("point nine nine nine").

**Scenario (probe):**

| Sentence | Result |
|---|---|
| "Paid $3.459 at Shell" | amount **$3.46**, no choices, confidence **high** |
| "spent $12.345 at Target" | **$12.35** |
| "spent 1.005 at Target" | **$1.01** |
| "Starbucks twelve point nine nine nine" | **$13.00** |

Each one reaches review looking exactly like a clearly heard amount (no "Pick the amount" prompt), one tap
from Save. `validateVoiceDraft`'s cent check cannot catch it, because the rounding has already happened. Gas
prices are said to three decimals, so this is a realistic receipt sentence. It breaks the house rule that
money is never approximated, and the brief's "never guessed". No fixture covers more than two decimals.

**Fix:** a number with more than two decimal places is not money. Drop it as an amount candidate, so the
amount falls to "Tap to add" or to the other number. Fixtures:
- "$3.459 at Shell" → no amount
- "45 bucks for gas at Shell, 3.459 a gallon" → $45, with no $3.46 choice
- "$12.345" → no amount
- "twelve point nine nine nine" → no amount

---

## Should fix (not blocking)

### S1. A double tap on an edit page pops the review page too (Dana)

`src/app/voice-edit.tsx:107-118` (`useCommit` → `router.back()`) and `:348-353` (a category tap commits and
pops at once). In expo-router 57, `router.back()` is a global `GO_BACK` with no source screen
(`node_modules/expo-router/build/global-state/router.js:89-95`). Two taps before the page leaves send two
pops: `/voice-edit` **and** `/voice-review`, landing on `/voice`, idle. Nothing is saved twice. The draft
is still in memory, but no page shows it, so the person has to speak again. The category grid is the likely
trigger. This comes from reading the code; I did not reproduce it on a device. **Fix:** a `left` ref in
`useCommit`, so only the first commit pops.

### S2. Validation can turn an unsettled amount into a settled one (Diego)

`src/lib/voice-draft.ts:120-124` (`cleanChoices`) and `:161` keep `amount` when cleaning drops choices below
two, and `missingFor` then drops `'amount'`.

**Scenario (probe):** alternatives `["Target $40", "Target $4,000,000,000,000"]`. The parser says
"unsettled: $40 or $4T" (`missing: ["amount"]`). The out-of-range choice is dropped, and the review page
opens on **$40, settled**. The trigger is contrived, but it breaks the "never guessed" rule, and the fix is
one line: if the parser offered two or more choices and fewer than two survive, null the amount.

### S3. A marked number silently beats a bare number right next to it (Drew)

`src/lib/voice/amount.ts:301-306`, with the pair logic at `:194-233`. "Target twelve fifty thousand" →
**$50,000**, settled. The "twelve" is discarded because "fifty thousand" carries a money marker. "rent
twelve fifty million" → $50,000,000. The phrasing is rare, but the rule "a marked number beats a bare one"
was written for "2 pizzas for $20", not for numbers next to each other. **Fix:** a bare 1–99 number
directly before a marked group makes the amount unsettled (offer both, or no amount). Add fixtures.

### S4. The draft outlives a hand-off save and sign-out; hand-off saves never learn (Diego)

The forms' `leave()` (`add-receipt.tsx:478`, `add-bill.tsx:352`, `add-subscription.tsx:243`) does
`dismissTo('/home')` but never `clearVoiceDraft()`, and `signOut()` (`src/api/auth.ts`) does not clear it
either. The transcript (the person's words) stays in memory until the next voice session or a cold start.
Corrections made in the full form are also never learned, unlike the review page's Save.

**Fix:** `if (fromVoice) clearVoiceDraft()` in each `leave()`, and `clearVoiceDraft()` in `signOut()`.
Learning from the form needs `merchantHeard` passed through the params. That can wait.

---

## Low

- **L1 (Drew)** `amount.ts:120-131`: `readTime` accepts minutes above 59, so "99:99" is offered as $99.99 /
  $9,999. Junk input, and the person picks anyway. Reject minutes over 59.
- **L2 (Diego)** `add-bill.tsx:474-479`: in a voice hand-off where the category is already known, back from
  the first step goes to the category chooser, not to the review page as spec §1 says. A second back
  leaves the form.
- **L3 (Dana)** Double pushes: the review rows (`voice-review.tsx:188-189`), "More options" (`:310`) and
  the Home FAB (`(tabs)/home.tsx:184-192`) stack two pages on a fast double tap. This happens across the
  app. There is no duplicate save, because the form leaves with `dismissTo('/home')`.
- **L4 (Dilip)** `package.json`: `"expo-speech-recognition": "^57.1.0"`. A caret on a native module; the
  house style is `~`. The lock pins 57.1.0 today. Pin `~57.1.0`.
- **L5 (Dana/Drew)** The nine "Try saying" sentences exist twice: in `example-card.tsx` and as string
  literals in `parse.test.ts`/`catalog.test.ts`. Nothing in code ties them together, so the "each example
  is a fixture" promise can drift. Add one test that joins `VOICE_EXAMPLES` parts and parses each.

---

## Gates that are not code

- **G1. Release builds are blocked (Dilip incident; the Founder holds the token).** I checked key
  presence only, not values. `ios/.xcode.env.local` has `NODE_BINARY` but **no `SENTRY_AUTH_TOKEN`,
  `SENTRY_ORG` or `SENTRY_PROJECT`**. A Release or TestFlight build will fail at "Upload Debug Symbols to
  Sentry". Debug dev-client builds are unaffected. Restore them before any Release build for the review,
  and always use `prebuild --no-clean`.
- **G2. Migrations: verified only by reading.**
  - `20261001100001` adds the enum value on its own.
  - `20261001100002` replaces `enforce_scan_is_pro`. Its body is identical to `20260831100007_pro_wall.sql`
    apart from adding `'voice'` and a voice message, and the trigger stays BEFORE INSERT.
  - Neither file has run on any Postgres. Whether the CLI applies each file in its own transaction is still
    unverified (R4).
  - Apply to a staging or branch DB first, then production, **before the native build reaches anyone** (R5).
    If this is missed, every voice receipt save shows `FAILURE_MESSAGE`. It does not crash.
- **G3. Device checks for Tia** (on top of plan §6):
  - after either save path, `[tabs]` with Home selected and no swipe back into the flow;
  - the mic indicator goes off on push, back and background;
  - the new "Voice" pill FAB with the PRO badge: geometry, plus dark plum/navy and the AX sizes;
  - a double tap on Done and on the category grid (S1);
  - VoiceOver's own speech not transcribed.

---

## In flux (reviewed as they stand; re-check when the owners land)

- **Dilip, interruptions.** These already changed. A call now ends the session as `idle` with the words
  heard so far, and `/voice` takes them to review (`speech.ts` `'interrupted'`, pinned by `voice.test.tsx`
  "takes the words to review when a call ends the session quietly"). Spec §4.3 says an interruption
  returns the page to idle silently. CEO/Pia: choose one, and the test follows.
- **Dilip, permission re-read.** `refreshPermission` is in and only reads, never prompts. Note for Tia:
  changing a privacy toggle in iOS Settings usually terminates the app. So "back from Settings" will often be
  a cold start to Home rather than a return to `/voice`. Not a bug, but don't expect that path to be the
  common one.
- **Dana.** The `TextLink accessibilityHint` prop landed (additive, used on "More options"). The `__DEV__`
  test sentence landed too: it is guarded at the component, the handler and the render, so it folds out of
  Release. The FAB became a "Voice" pill with the AudioLines icon at 16:34, after my first read. I re-read it
  and re-ran `home-voice-fab`, `home` and `voice-review` (24/24).
- **Overlays behind "More options".** The voice routes contain no Modal, sheet or popover; the only overlay
  is `useConfirm`. "More options" opens the classic `add-bill`, which still has its slide-up `CalculatorPad`
  and the period end-date `DatePicker`. Those belong to the form, not to voice, but the Founder should know
  that the hand-off lands there.
- **Privacy policy date.** `privacy.tsx:165` still says `updated="28 August 2026"`, while the policy now
  describes a new sharing path (Apple speech). Founder/CEO call at release.

---

## Checked and clean

- **Money**
  - Integer cents throughout the parser.
  - An unsettled pair is never pre-selected on review: `entryFromDraft` nulls the amount, and Save is
    disabled until a chip is picked.
  - Never $0: `amountText` returns '' for anything invalid, and the not-heard block has no figure.
  - `amountFromText`/`isVoiceAmount` are strict: cent-exact, positive and ≤ 999,999,999.99.
  - No NaN path: `toCents` maps non-finite input to 0, and every reader is regex-guarded.
  - The keypad edit's Done is disabled for 0.
  - CalculatorPad now uses `roundMoney` (half away from zero, matching `money.ts`).
- **Saving**
  - Review Save goes through the forms' own builders. For a new item, `lastChargedOn` and `countsFrom` are
    null, which is what the form passes, and the reminder default is Off, the same as an untouched form.
  - Bill `category_id` is the BILL_CATEGORIES id, never the brand's spend category.
  - One row per tap: the `busy` ref plus the disabled button, and a test covers it.
  - The review page clears the draft before `dismissTo('/home')`.
  - `source: 'voice'` on both receipt paths (direct, and `scannedVia=voice`), with tests.
- **Navigation**
  - `dismissTo('/home')` becomes a POP_TO for `(tabs)` on the root stack. The bundled StackRouter finds the
    existing route and pops to it, with no replace. Tia still confirms the tab selection on a device.
  - "Say it again" uses a one-shot flag; nothing auto-starts otherwise.
  - "Start again" pops to `/voice` and never stacks a second one.
  - Back is disabled once the review page has been edited, and asks first.
- **Mic**
  - Cancelled on blur (the focus effect's `cancel` is a stable callback), on going to the background while
    asking or listening, and on unmount.
  - A start that resolves after a cancel is closed: the `stale()` checks sit after every await.
  - `requiresOnDeviceRecognition` is applied natively only when the en-US recogniser supports it
    (`ExpoSpeechRecognizer.swift:588-589`), and `onDevice` only claims on-device for an en-US phone, so the
    privacy line never over-claims.
- **Crash paths**
  - Nothing imports the speech package as a value. `speech.ts` uses
    `requireOptionalNativeModule('ExpoSpeechRecognition')` and imports types only.
  - Each recogniser guess is parsed inside its own try/catch, and the page has a second catch around the
    whole parse.
  - Empty, emoji and garbage input, a null context and non-string alternatives all parse without throwing.
  - Bad route params open blank: `field`, `draft` as an array, bad amounts and dates, and `2026-02-30`
    opens as today.
  - A stale or cold draft gets the "Nothing to check yet" page.
- **Pro gating.** All three voice routes open with `useProGate('voice')`. The FAB is hidden until `ready`,
  and a free account goes to `/pro-feature?id=voice`. The server walls `'voice'` receipts once G2 is
  deployed; bills and subscriptions are client-walled only, as planned.
- **Regressions in the three forms**
  - I read all three diffs line by line against HEAD. `isCustom`, `hasPeriod` and `PERIOD` match the
    builder's rules exactly.
  - The scan params now go through strict readers. I checked every brand id, category id and domain in the
    catalog migrations against them: all pass, so no scan loses its logo or brand.
- **Golden tests**
  - They are byte-identical to Diego's recorded hashes (`shasum -c`: OK on all three), and their mtimes
    (15:29–15:35) predate the hash record (15:37).
  - Independently, I extracted HEAD with `git archive` and ran the three goldens against the **old** forms:
    43/43. They pass on the refactored forms too.
  - They do not mock `entry-values`, so they exercise the real builders.
- **House rules**
  - Every failure on the voice pages shows `FAILURE_MESSAGE`; form hints keep their own words.
  - Primary actions sit in `Screen`'s footer, with no `mt-auto`.
  - No tests under `src/app`.
  - No `console.*` in the voice code; the Sentry reports carry engine codes, not transcripts.
- **Gate:** `tsc --noEmit` 0 errors; eslint 0 problems on the 18 changed source files; prettier clean; full
  `jest --ci` 83 suites / 1252 tests passed (a scratch copy of the working tree at 16:25). The targeted
  voice, form, golden, speech and auth suites passed in the real tree (24 suites / 592 tests).

## How I checked

- `git archive HEAD` into the scratchpad, with the goldens copied in: 43/43 on the HEAD forms.
- `shasum -a 256 -c` against Diego's `golden-before.sha`: OK.
- Probe tests (scratchpad copy only) through `parseVoice`, `validateVoiceDraft`, `entryFromDraft` and
  `learnAlias` for B1, B2, S2 and S3.
- Read the expo-router 57 `goBack`, `dismissTo` and StackRouter `POP_TO` code, and the native
  `ExpoSpeechRecognitionModule.swift` / `ExpoSpeechRecognizer.swift` error and on-device paths.

---

# Re-review (2026-10-01, 16:51–16:58)

## Verdict

**Approved for the Founder's build review.** Every finding from the first pass is fixed. Each fix was
checked by reading its diff (against my 16:25 snapshot of the tree) and by my own probes, not only the
authors' tests. Two conditions carry over, and neither is code:

- **G1** is still open. `ios/.xcode.env.local` still has no `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` or
  `SENTRY_PROJECT` (I checked key names only). If the Founder's build is a Release or TestFlight build,
  restore them first. A Debug dev-client build is unaffected.
- **G2** still applies. Neither migration has run on any Postgres. Deploy to staging, then production,
  before the native build reaches anyone. G3 (Tia's device list) is unchanged.

One new non-blocking finding, N1, came out of the B1 fix (below).

## What I checked, per finding

| Finding | Owner | Verified by | Result |
|---|---|---|---|
| **B1** learned alias poisons Target → Walmart | Drew, Diego, Dana | Read the diffs: `preferCatalog` and the new rank (`merchant.ts`), `learnAlias` un-learning, `merchantSource` through `validateVoiceDraft`/`rederiveVoiceEntry`, `lessonFrom` (`voice-review.tsx`). Probe on the real 371-row catalog, plus an end-to-end probe through the real review page with real parser drafts. | **Fixed.** "spent $5 at Target" → `catalog`. Changing it to Walmart and saving calls `learnAlias` **0** times. A stale `target → Walmart` pair still parses as Target. Correcting back → `[]`. A longer learned phrase still wins ("target optical" → Target Optical). A `heard` store changed and saved is learned once; untouched, it is not. |
| **B2** figures past the cent rounded into amounts | Drew | Read the `clean.ts`/`numbers.ts`/`amount.ts` diffs. Probe. | **Fixed.** `$3.459`, `3.459`, `$12.345`, `1.005`, "twelve point nine nine nine" and `$0.004` → no amount. "45 bucks … 3.459 a gallon" → $45. "$3.459 a gallon, $45.20 total" → $45.20. `$3.450` → $3.45. `$1.2345k` and "1.2345 thousand" → $1,234.50 (the old code gave $1,230.00 for the second; Drew's extra find). `$1.23456k` → $1,234.56. `$1.234567k` → none. No choice ever has sub-cent digits. |
| **S3** "twelve fifty thousand" settled at $50,000 | Drew | Probe | **Fixed.** That sentence, "rent twelve fifty million", "Target twelve $50" and "bought 3 $5 coffees" all give amount null with `missing: amount`. |
| **S2** $40 / $4T settled at $40 | Diego | Read the `validateVoiceDraft` diff. Probe. | **Fixed.** Validated amount null, choices `[]`, `missing: ["amount"]`, entry amount null. |
| **S4** draft kept after a hand-off save and on sign-out | Diego | Read the three `leave()` diffs and `forgetThisPersonsVoice` | **Fixed.** `clearVoiceDraft()` runs after `dismissTo('/home')` on a `from=voice` save, and on `signOut`/`deleteAccount`, best-effort. Learning from the full form is deferred (CEO), because it would need the goldens edited. |
| **S1** double tap on an edit page pops the review page | Dana | Read the `useCommit` diff. My own probe (two presses in one `act`) against the current code **and** my pre-fix snapshot. | **Fixed.** Double Done, double Back, Done then Back, and two category taps all pop **once**, and the first category wins. The same probe fails **4/4 on the pre-fix code**, so it measures the real bug. |
| **L1** clock readings past :59 | Diego | Probe | **Fixed.** 99:99, 12:60 and 24:30 → none; 12:50 still asks $12.50 / $1,250. |
| **L2** bill hand-off back goes to the chooser | Diego | Read `add-bill.tsx` | **Fixed.** With `from=voice` and a known category, back from the amount step returns to the review page. Unchanged otherwise. |
| **L3** double pushes | Dana | Read the `go()` + `useFocusEffect` diffs (review page, FAB). Probes. Read Dana's FAB test (same-frame presses). | **Fixed.** Row ×2, More options ×2, a row then More options in one frame, Back ×2 → one move each. Re-focus re-opens. Two Save taps in one frame → one row and one `dismissTo('/home')`. |
| **L4** caret on a native module | CEO | `package.json`, lock root entry, `npm ls` | **Fixed.** `~57.1.0` in both places; resolved and installed 57.1.0; integrity unchanged. |
| **L5** examples not tied to fixtures | Drew | Read the imports | **Fixed.** The page (`voice.tsx` via `example-card.tsx`) and `catalog.test.ts` both read `src/data/voice-examples.ts`. |

**Theo's `src/__tests__/app/voice-review-extra.test.tsx`:** compared with my 16:25 copy, there are exactly
two hunks:

- a `useFocusEffect` stub in the `expo-router` mock (`useEffect(effect, [effect])`);
- `merchantSource: 'catalog'` on the `RECEIPT` fixture.

The four `it(...)` blocks and every `expect(...)` line are byte-identical. My copy is Theo's original:
line 115 is `const RECEIPT: VoiceDraft = {`, the exact line Diego's log reports `tsc` failing on before
the type landed. `'catalog'` is the honest value for a Starbucks exact match. The file has no learning
assertion it could change.

**Golden tests:** `shasum -a 256 -c` against Diego's `golden-before.sha`: OK on all three. Their mtimes
are unchanged (15:29–15:35), and they are byte-identical (`cmp`) to the copies I ran 43/43 against the
HEAD forms.

**Gate on the real tree (16:55–16:58):**

- `tsc --noEmit` exit 0;
- `eslint --no-cache` exit 0 on the 19 changed source files;
- `prettier --check` clean;
- `jest --ci` **84/84 suites, 1319/1319 tests**.

My probes ran in a scratchpad snapshot taken at 16:54:36. `diff -rq` shows `src/`, `supabase/`,
`package.json` and the lockfile unchanged between that snapshot and the live tree at 16:58. No probe files
are in the repo.

## New, non-blocking

### N1. A card or wallet brand said as the payment method beats the store (Drew)

`merchant.ts` `pickMerchant` ranks `catalog` above everything else, and the B1 fix moved `learned`
below `catalog`.

**Probe (real catalog):**
- "paid $20 at spot a fly on my Amex" (with `spot a fly → Spotify` learned) → **American Express**
- "…with Apple Pay" → **Apple**
- "spot a fly $11.99 a month on my Chase card" → **Chase**

Against the pre-fix code the first two gave Spotify. For typed stores this was **already true before the
fix**: "paid $20 at Joe's Diner on my Amex" → American Express in both versions. So this is an old parser
weakness that B1 widened, not a regression B1 introduced.

**Impact:** the wrong store is shown on the review page, in plain sight, before anything saves. It is not
money. Correcting it cannot teach a bad alias, because the source is `catalog`.

**Fix (follow-up):** a merchant introduced with "at"/"from" outranks a catalog brand that comes after
"with", "on my", "using" or "paid with". Add fixtures for the three sentences above, plus "at Starbucks with
Apple Pay" (already Starbucks; keep it).

### N2. Accepted by design: a change of mind on a non-catalog store is learned (no owner)

"spent $5 at Joe's Diner" (`heard`) changed to Walmart and saved teaches `joe's diner → Walmart`. Next
time it opens as Walmart (`learned`). Correcting it back to "Joe's Diner" removes the pair, and the third
parse is Joe's Diner again (probe). Skip cannot tell a mishearing from a change of mind on a store it has
never seen. The damage is now visible, self-healing and limited to non-catalog names, so I accept it.

### N3. Residual of the L3 guard (Dana, low)

The review page's `moving` ref is only released on focus. If a guarded move ever failed to navigate, the
rows would stay locked until the page lost and regained focus. Every guarded call is a plain
`push`/`back`/`dismissTo` that navigates, so I have no failing case. Noted, not filed.

## Decisions recorded

- **Interruptions:** the CEO kept the built behaviour (words heard before a call go to review). Spec §4.3's
  "silent idle" is superseded. Pia should update her spec line.
- **Learning from the full add form:** deferred. It needs the goldens to change, which the CEO must
  explicitly allow first.
- **Still open from the first pass:** the privacy policy `updated` date (`privacy.tsx:165`, 28 August 2026).
