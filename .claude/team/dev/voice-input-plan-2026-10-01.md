# Voice input — wave 2 engineering plan (Dana + Diego)

Dmitri, 2026-10-01. Reads with `.claude/team/dev/voice-input-brief.md` (the brief wins over the PDF;
this plan wins over neither — where I disagree with the brief it is listed in §8 for the CEO to rule).
Line numbers are against the working tree on `almost-done-all-pages` at the time of writing.

---

## 1. Save path — decision

**Decision: (a) as a hybrid.** The review page saves NEW items directly through pure value-builders
extracted from the three forms (one function per kind, the forms refactored to call them). When the
builder refuses the draft, or the person wants a field the review page does not offer, the review page
hands off to the existing add form pre-filled (c), and the form's own Save runs.
(b) is rejected. The "direct only when the date is today-or-future" hybrid is rejected too; the reason is below.

### 1.1 What the code says a NEW item's save actually does

| Rule | Where | For a new item (`id` undefined) |
|---|---|---|
| Past-charges question | `src/api/past-charges.ts:102` | `choose()` returns `'upcoming'` **before any dialog** (`!planId`). Never asks, past date or future. |
| Past-charges readiness | `past-charges.ts:139` | `ready: !planId \|\| …` → always `true`. Never blocks. |
| `lastChargedOn` | `past-charges.ts:87-95` | `mine = []` → `null`. |
| `floorAfterCharges` | `src/lib/charges.ts:143` | `if (!lastCharged) return start;` → identity. |
| `countFromAfterPick` | `charges.ts:75-77` | `current` is `null` (BLANK `countsFrom`) → returns the picked renewal, or `null`. |
| `pastCharges.apply` | `add-bill.tsx:399`, `add-subscription.tsx:278` | only on scope `'all'`, which a new item never gets. |
| Reminder | `src/api/reminders.ts:202-217`, `:226-245` | no row → choice `'off'` → `choiceToLead('off')` = `null` → `removeReminder` = a DELETE matching nothing. |
| Already pinned by tests | `src/api/past-charges.test.tsx:46` ("saves a new bill without a question"), `:135` ("never holds up a new bill") | |

So for a new item, all of the forms' orchestration (ready → choose → create → apply → reminder) collapses
to **`create(values)`**. Every rule that still matters lives in **how `values` is built**:
- validation and its exact hint words (`add-receipt.tsx:456-463`, `add-bill.tsx:311-332`, `add-subscription.tsx:210-218`);
- bill `icon_id` only for the custom category (`add-bill.tsx:345-348`, itself a past bug fix);
- `'period'` mapping and `starts_on` (`add-bill.tsx:349-361`);
- subscription `started_on` (`add-subscription.tsx:236-240`);
- category fallbacks (`|| 'other'`), card/account split by source kind, note trimming, name trimming.

**Past vs future first date.** The CEO asked about this specifically. The dialog never appears for a
new item either way. The real difference is downstream and identical for form and voice: a past
`starts_on`/`started_on` makes the recorders (`useKeepSchedulesCurrent`, `src/api/refresh.ts:182`, and
the server's `record_due_charges`) backfill one charge per due date up to today via `unrecordedDates`
(`charges.ts:46-66`), and each newly written charge pushes a notice. A future date records nothing
until it falls due. Gating direct save on "today-or-future" would make voice behave **differently**
from the form, not more safely. It is also moot for spoken dates: brief rule 7 makes bill and
subscription dates today-or-future. A past date only appears if the person picks one on the review page,
and then the form would have done the same thing.

### 1.2 Why not (c) alone

- **It breaks the product.** The brief's promise is "review it on its own page, save". Hand-off-only
  makes the review page a second review in front of a three-step form. That is about 4 taps after the
  review page instead of 1, and the person re-checks the same fields twice.
- **It doesn't avoid touching the forms.** `add-bill` and `add-subscription` take no params today
  (`add-bill.tsx:102`, `add-subscription.tsx:82`). Prefill, skipping the category step, and post-save
  navigation are edits to the forms either way.
- **It has a double-save trap.** All three forms leave with `router.back()` (`add-receipt.tsx:487`,
  `add-bill.tsx:405`, `add-subscription.tsx:283`). After a hand-off that lands back on `/voice-review`,
  which still shows the draft and a live Save button, so a second tap files a duplicate. This must be
  fixed in any option that hands off (see 1.4).

### 1.3 Why not (b)

Equivalence cannot be proven today. **No test anywhere pins what a form's Save writes.**
`src/__tests__/app/add-{bill,subscription,receipt}.test.tsx` only cover the edit-load gate
(error/skeleton/missing). A second copy of the values code would drift silently. The icon rule at
`add-bill.tsx:345-348` is exactly the kind of fix a re-implementation misses.

### 1.4 The plan, step by step (order matters)

1. **Golden tests first, on the current code (Diego).** Before any form line moves, new screen tests
   drive each form to Save and assert the exact object passed to `create/update.mutateAsync`. They
   must be green on today's code and stay green, unchanged, after the refactor. Cases (minimum):
   - receipt: new via scan params (`scannedStore` + `scannedAmount` + `scannedDate`, source `'scan'`);
     edit of an existing row (source preserved; card vs account split).
   - bill: edit of a monthly bill with `usePastCharges` mocked to `lastChargedOn: '2026-09-01'` and a
     moved due date → `starts_on` floored to `'2026-10-01'`; a `'period'` bill (starts_on = start,
     ends_on set); category `'other'` with icon → `icon_id` kept; category `'housing'` → `icon_id: null`;
     new bill through category → amount → details → date.
   - subscription: edit with `started_on` later than a newly picked renewal → moves earlier; edit with
     `lastChargedOn` → floored; new with no renewal date → `next_renewal_on: null, started_on: null`.
   Amounts in fixtures: `'1100'`, `'15.99'`, `'0.10'`, `'1030.5'`, asserted as numbers to the cent.
2. **Pure builders (Diego)**: `src/api/entry-values.ts`, with signatures in §1.5 and unit tests in
   `src/api/entry-values.test.ts` that reuse the golden fixtures.
3. **Forms call the builders (Diego, same person as steps 1–2, see §3)**. These are mechanical
   replacements of the inline validation and the `values` literal. Orchestration (ready/choose/apply/reminder)
   is **not touched**. Golden tests must pass with zero edits.
4. **Review page saves (Dana)**: `build…Values(entry→input, { sources, lastChargedOn: null, countsFrom: null })`
   → if `ok`, `create…​.mutateAsync(values)` → (bills/subs only, and only if Pia's spec has a reminder
   row) `applyReminder(kind, id, choiceToLead(choice), remindAt)` exactly as the forms do → `success()`
   → `clearVoiceDraft()` → `router.dismissTo('/home')`. If `!ok`, show `message` on the field (form
   hints keep their words). `catch` → `failureMessage(thrown)` (= `FAILURE_MESSAGE`).
   Save disabled while pending (double tap = one row).
5. **Hand-off (Dana calls it, Diego's forms receive it)**: `router.push({ pathname, params })` with the
   **edited** review state (not the raw draft), plus `from=voice`. The form's success branch does
   `from === 'voice' ? router.dismissTo('/home') : router.back()`. Back/cancel from the form still
   returns to the review page, which is intended.

### 1.5 Builder signatures (Diego owns; Dana consumes)

```ts
// src/api/entry-values.ts — pure: no hooks, no supabase, no '@/data/bills-mock' (pulls lucide into jest).
import type { BrandSelection } from '@/components/brands/brand-field'; // precedent: src/api/scan.ts:5
import type { BillValues, CaptureSource, ReceiptValues, SubscriptionValues } from '@/api/mutations';
import { countFromAfterPick, floorAfterCharges } from '@/lib/charges';

type SourceRef = { id: string; kind: 'card' | 'account' };
export type Built<T, F extends string> = { ok: true; values: T } | { ok: false; field: F; message: string };

export function buildReceiptValues(
  input: { store: BrandSelection | null; amount: string; date: Date; sourceId: string; note: string; captureSource: CaptureSource },
  sources: readonly SourceRef[],
): Built<ReceiptValues, 'store' | 'amount'>;          // 'Pick a store first.' | 'Enter how much you spent.' (store checked first)

export function buildBillValues(
  input: { name: string; amount: string; issuer: BrandSelection | null; categoryId: string; iconId: string;
           recurrence: 'weekly'|'monthly'|'quarterly'|'yearly'|'period'; startDate: Date | null; endDate: Date | null;
           sourceId: string; note: string },
  ctx: { sources: readonly SourceRef[]; lastChargedOn: string | null },
): Built<BillValues, 'details' | 'amount' | 'when'>; // same four messages, same order as add-bill.tsx:311-332

export function buildSubscriptionValues(
  input: { service: BrandSelection | null; amount: string; cycle: 'weekly'|'monthly'|'quarterly'|'yearly';
           renewsOn: Date | null; sourceId: string; note: string; active: boolean },
  ctx: { sources: readonly SourceRef[]; lastChargedOn: string | null; countsFrom: string | null },
): Built<SubscriptionValues, 'service' | 'amount'>;   // 'Pick a service first.' | 'Enter what it costs.'

/** The name a bill gets when nobody typed one: the company, else the category label ('' for 'other'). */
export function defaultBillName(categoryId: string, categoryLabel: string, issuer: BrandSelection | null): string;
```

Rules for the extraction: keep the amount check **exactly** `Number.isFinite(v) && v > 0`, with no
cent check and no rounding added. The keypad (`amount-keypad.tsx:38-44`) and calculator already settle at two
decimals, and anything stricter would be a behaviour change in the forms. Cent-exactness for voice is
enforced on arrival (§2), not in the shared builder. A bill's `category_id` is the BILL_CATEGORIES id,
**never** `merchant.categoryId` (that is a spend category; see `add-bill.tsx:189-193`).

### 1.6 Exact existing lines that change

| File | Lines | Change |
|---|---|---|
| `src/api/mutations.ts` | 280 | `source: CaptureSource`; add `export type CaptureSource = 'manual' \| 'scan' \| 'upload' \| 'voice'` |
| `src/api/queries.ts` | 401 | `ReceiptRow.source: CaptureSource` |
| `src/app/add-receipt.tsx` | 63 | `captureSource: CaptureSource` |
| | 77-86, 133 | `ScanParams` gains `scannedVia?: string`, `from?: string` |
| | 96-123 | `fromScanParams`: `captureSource = scannedVia === 'voice' ? 'voice' : 'scan'`; `result: null` for voice (the "Read the …" scan report is camera wording); line 115 date read through a validated ISO reader (today on garbage. Today a bad `scannedDate` deep link gives an Invalid Date) |
| | 453-478 | validation + `values` → `buildReceiptValues`; `!ok` → `fail(message, field === 'store' ? 1 : 0)` |
| | 487 | `router.back()` → `leave()` |
| `src/app/add-bill.tsx` | 102, 165 | read prefill params (+`from`) through Diego's reader; pass `prefill` to `BillForm` |
| | 179 | initial step `editing \|\| prefill?.categoryId ? 'amount' : 'category'` |
| | 182-215 | seed `categoryId/issuer/name/amount/startDate/recurrence` from `prefill` when `!existing` |
| | 253-258 | `handleSelectCategory` keeps the name when it equals `issuer?.name` (otherwise a prefilled "Comcast" becomes "Internet"; only reachable with an issuer set before the category, i.e. prefill or back-navigation) |
| | 309-366 | validation + `values` → `buildBillValues`; `!ok` → `fail(message, field)` |
| | 369-374 | `carried.amount` reads `values.amount` |
| | 405 | `router.back()` → `leave()` |
| `src/app/add-subscription.tsx` | 82, 138-157 | prefill params → `initial` when `!existing` (else `BLANK`, unchanged) |
| | 207-246 | validation + `values` → `buildSubscriptionValues` |
| | 250-255 | `carried.amount` reads `values.amount` |
| | 283 | `router.back()` → `leave()` |

Nothing else in the forms moves: not the past-charges orchestration, not the reminder code, not the step UI.

---

## 2. How the draft travels

**`/voice` → `/voice-review`: a single-slot in-memory store. Not route params.**
- The draft carries arrays (`amountChoices`, `missing`), a nested merchant and the transcript. As URL
  strings that means a hand-rolled encoder plus a decoder, and the person's spoken words end up in navigation state.
- `/voice-review` should not be deep-linkable with content. With params, `skipbudget://voice-review?kind=subscription&amount=999…`
  opens a pre-filled Save page from any link. With the store, a cold deep link (or the navigator
  remount on a text-size change, `_layout.tsx:137`) finds no draft and shows a "Start again" state
  that `router.replace('/voice')`s.
- Zustand is installed (5.0.15) but **no file in `src/` imports it**. One value passed once does not
  need a new pattern. A plain module is enough:

```ts
// src/lib/voice-draft.ts (Diego)
export function putVoiceDraft(draft: VoiceDraft): string;      // returns a fresh id; replaces the slot
export function readVoiceDraft(id: string | undefined): VoiceDraft | null; // null unless id matches; re-validates
export function clearVoiceDraft(): void;                         // after a successful save
export function validateVoiceDraft(input: unknown): VoiceDraft | null;
```
  `/voice` pushes `/voice-review?draft=<id>`. The review page reads once, into `useState`
  initialisers, and edits its own copy.
- **Re-validate on arrival anyway** (the parser is a module boundary). `validateVoiceDraft` rejects
  or nulls out: `kind ∉ {receipt,bill,subscription}`; `amount` not finite, `<= 0`, not cent-exact
  (`toCents(a) / 100 !== a`, from `src/lib/money.ts:42`), or above `999999999.99` (keypad's 9 whole digits);
  any bad `amountChoices` entry (and fewer than 2 → `[]`); `date` not `^\d{4}-\d{2}-\d{2}$` or not
  round-tripping (`2026-02-30`); `cycle` outside the enum; `billCategoryId` outside the ten ids; a
  merchant with non-string fields. It recomputes `missing` rather than trusting it.

**`/voice-review` → add form: route params**, because that is how the forms already take input
(`add-receipt.tsx:77-123`) and a form must survive as plain strings. Diego owns both directions in
`src/lib/voice-draft.ts` (pure, round-trip tested):
```ts
export type VoiceEntry = { kind: VoiceKind; amount: number | null; merchant: VoiceMerchant | null;
  date: string | null; cycle: VoiceCycle | null; billCategoryId: string | null; sourceId: string | null };
export function entryToForm(entry: VoiceEntry): { pathname: '/add-receipt' | '/add-bill' | '/add-subscription'; params: Record<string, string> };
export function readBillPrefill(params: Record<string, string | string[] | undefined>): BillPrefill | null;
export function readSubscriptionPrefill(params: …): SubscriptionPrefill | null;
// receipts reuse ScanParams keys + scannedVia=voice (draftToParams shape, src/api/scan.ts:115-127)
export function entryToBuilderInput(entry: VoiceEntry, …): …; // so Dana never maps fields by hand
```
New param names for bills and subscriptions: `prefillName, prefillBrandId, prefillDomain, prefillCategory,
prefillAmount, prefillDate, prefillCycle`, plus `from=voice`. Readers apply the same checks as
`validateVoiceDraft`. Anything invalid is dropped to blank, never coerced.

---

## 3. File ownership (wave 2)

**One change to the CEO's suggested split.** The three add forms go to **Diego**, not Dana. The
refactor there is data in (prefill), data out (builders) and save navigation, all gated on golden
tests that Diego writes. Two people in `add-bill.tsx` at once would collide. Dana's share is
already the bigger UI job.

| Owner | Files | Notes |
|---|---|---|
| **Dana** | NEW `src/app/voice.tsx`, `src/app/voice-review.tsx` | both open with `const gate = useProGate('voice'); if (gate) return gate;` |
| | NEW `src/components/voice/*` (FAB, listening visual, examples, review rows) | new dir, Dana only |
| | EDIT `src/app/(tabs)/home.tsx` | line 51 → `const { pro, ready } = usePro();`; line 179 `Screen` gets `floating` |
| | EDIT `src/data/pro-features.ts` | `voice` entry: copy from Pia, Founder approves |
| | EDIT `src/lib/wall.ts` | `voice: 'pro'`. **Note:** `WALL` is read nowhere; the gate id is the `PRO_FEATURES` key. Documentation-only, keep it in step anyway |
| | EDIT `src/app/privacy.tsx` | blocked on Founder-approved copy |
| | NEW `src/__tests__/app/voice.test.tsx`, `voice-review.test.tsx`, `home-voice-fab.test.tsx` | edit `home.test.tsx` only if the FAB breaks it |
| **Diego** | NEW `supabase/migrations/20261001100001_capture_source_voice.sql` | `alter type public.capture_source add value if not exists 'voice';`, **alone in its file** |
| | NEW `supabase/migrations/20261001100002_voice_is_pro.sql` | `create or replace function public.enforce_scan_is_pro()` with `new.source in ('scan','upload','voice')` (see §5 R3) |
| | EDIT `src/api/mutations.ts` (280), `src/api/queries.ts` (401) | `CaptureSource`. **Land first**, because it unblocks typing everywhere |
| | NEW `src/api/entry-values.ts` + `.test.ts` | §1.5 |
| | NEW `src/__tests__/app/add-{receipt,bill,subscription}-save.test.tsx` | golden tests, **before** step 3 |
| | EDIT `src/app/add-receipt.tsx`, `add-bill.tsx`, `add-subscription.tsx` | §1.6 lines only |
| | NEW `src/lib/voice-draft.ts` + `.test.ts` | §2 |
| | NEW `src/api/voice-aliases.ts` + `.test.ts` | §4.5 |
| | EDIT `src/api/auth.ts` (`signOut` 134-139, `deleteAccount` 173-192) + `auth.test.ts` | clear aliases. **Coordinate:** another session is on sign-in screens (`auth.tsx`, not `auth.ts`), so check `git diff src/api/auth.ts` is empty before starting |
| Read-only for both | `src/lib/voice/*` (Drew), `src/lib/speech.ts`, `app.json`, `package.json` (Dilip) | ask the owner; do not patch |
| Do not touch | `src/app/auth.tsx`, `signup.tsx`, `verify-otp.tsx`, `src/api/push*`, `src/__tests__/app/sign-in-handoff.test.tsx` | other session |

**Shared seams (one owner each):** `CaptureSource` type (Diego, Dana imports); `voice-draft.ts`
(Diego, Dana imports); builder signatures (Diego, Dana imports); route names `/voice`, `/voice-review`
and the `from=voice` contract (Dana defines the routes, Diego honours `from`).

**Sequencing:** Diego: `CaptureSource` → golden tests → builders → form wiring → `voice-draft.ts`
→ aliases → migrations (any time; DB-only). Dana: FAB, `/voice` and the review page UI against the
contracts (stub the builders' types if Diego is not there yet); wire Save once `entry-values.ts`
lands. Dana must not wire Save against a hand-written stand-in builder.

---

## 4. Integration details for Dana

### 4.1 Brand directory and contextual strings
- Directory: `useBrandDirectory()` (`src/api/brands.ts:99-112`), rank-ordered, ~300 rows, `aliases`
  included, `staleTime` 1h. Home does not load it, so `/voice` must call it on mount. It
  loads while the person is speaking. Parse with whatever is there (`data ?? []`). An error means
  unmatched merchants, not a blocked mic.
- The user's own merchants are **free from cache**: Home's `useLedger` (`src/api/queries.ts:877-882`) already
  reads `useReceipts()` (`merchant`), `useBills()` (`name`) and `useSubscriptions()` (`name`). On `/voice`,
  call the same three hooks. De-duplicate case-insensitively, receipts by frequency first.
- `contextualStrings`: Drew's `voiceVocabulary` is **not in the brief's contract**. Assume
  `voiceVocabulary(directory: BrandRow[], own: string[]): string[]` and confirm with Drew. Ask him to cap
  at 100, own merchants first. Memoise on the three query `data` references. `useSpeechCapture`
  receives it as `{ contextualStrings }`.
- `parseVoice(alternatives, { today, directory, aliases })`: `today` from `useToday().today`
  (`src/lib/use-today.ts`, same as Home); `aliases` from Diego's `useVoiceAliases().aliases` (`{}` until loaded).

### 4.2 Showing the FAB
- `isSpeechAvailable()` is synchronous and never throws (Dilip's contract). Call it in render. It is
  false in Jest, so existing Home tests keep passing without a mock.
- Render it only when `ready && isSpeechAvailable()`. `usePro().ready` (`src/api/pro.ts:183`) is
  "safe to show a gate"; before that `pro` is `false`, and a PRO badge or a paywall push would flash at a
  paying user. Home already calls `usePro()` (line 51), so in practice it is ready by the first tap.
- Press: `if (!pro) router.push({ pathname: '/pro-feature', params: { id: 'voice' } }); else router.push('/voice')`.
  This mirrors `add-receipt.tsx:354-357` and `receipts.tsx:67-70`. `useProGate('voice')` on both voice pages
  covers deep links (`src/components/pro/pro-gate.tsx:16-21`: blank until ready, `Redirect` when free).
- Placement: `Screen`'s `floating` is `absolute bottom-10 right-5` (`screen.tsx:112-118`). The tab bar is in
  normal flow (`skip-tab-bar.tsx:48-49`), so this sits 40pt above it. Precedent: `src/app/source/[id].tsx:155-172`.
  It will overlap right-aligned amounts while scrolling. Home ends with `pb-24` (line 279), so the last
  row can clear it. Pia's call whether that is acceptable.
- Missing permission is **not** a reason to hide the FAB. `/voice` explains `denied` and links to
  Settings (`Linking.openSettings()`); `unavailable` (Siri & Dictation off, no recogniser) is explained too.

### 4.3 The `/voice` page lifecycle
- The page stays mounted under `/voice-review` (it is a stack). **Cancel recognition on blur**:
  `useFocusEffect(() => () => cancel())`, and on `AppState` → background. Otherwise the mic can keep
  running under the review page. On re-focus, reset to idle.
- iOS gives final results only after recognition stops (`expo-speech-recognition` types,
  `interimResults` doc). The page needs an obvious Stop/Done, and silence ends it (3 s on iOS 17; until
  `isFinal` on 18+).
- When `alternatives` turns non-empty: `parseVoice` → `putVoiceDraft` → `router.push({ pathname:
  '/voice-review', params: { draft: id } })`, **once per session** (guard with a ref; effects can fire twice).
- **Do not auto-start the mic on mount from a deep link.** If Pia wants "tap FAB, already listening",
  the FAB sets a one-shot in-memory flag that `/voice` consumes on mount. `skipbudget://voice` then lands idle.

### 4.4 Leaving the flow (no walking back into it)
- `resetTo` (`src/lib/nav.ts:13-16`) is for auth boundaries (`dismissAll` + `replace`). Do **not** use it here.
- **Use `router.dismissTo('/home')`** after a successful save, both on the review page and in a form
  reached with `from=voice`. Expo Router 57 docs and the installed types (`expo-router` 57.0.15,
  `build/global-state/router.d.ts`) agree: "Dismisses screens until the provided href is reached. If the
  href is not found, it will instead replace the current screen." Precedent: `save-loan.tsx:116`
  (`router.dismissTo('/bills')`). The root stack is `[(tabs)]` once signed in (`index.tsx:11`
  redirects; auth uses `resetTo`), so `(tabs)/home` is always found. **Unverified on device:** that
  `dismissTo` resolves the nested `(tabs)/home` without replacing. Tia checks it. The fallback is `router.dismiss(2)` /
  `dismiss(3)`, which is brittle.
- Back from the review page → `/voice` (listen again). X/close on the review page → `useConfirm` "Discard
  what Skip heard?" → `dismissTo('/home')`. Both are Pia's to confirm.

### 4.5 Learned aliases (Diego builds, Dana calls)
- **How other local stores handle sign-out: none of them clear.** `src/api/news.ts:22` keys per user
  (`skip.news.seenThrough.${userId}`), reads through `useQuery(['news-seen', userId])` and survives
  sign-out. `preferences-provider.tsx:23-24` is device-wide. `signOut()` (`auth.ts:134-139`) clears only the push row.
- Aliases are personal (the person's spoken merchant names), so do both: a **per-user key**
  `skip.voice.aliases.${userId}` (house pattern) **and** an explicit clear in `signOut()` and
  `deleteAccount()` (best-effort, never blocks sign-out, same as `forgetThisDevice`).
- `src/api/voice-aliases.ts`: `useVoiceAliases(): { aliases: Record<string,string>; ready: boolean }`,
  `useLearnVoiceAlias(): (heard: string, canonical: string) => void` (best-effort, errors swallowed),
  `forgetVoiceAliases(userId)`.
- **Persist an ordered array of pairs, not an object.** JS reorders integer-like keys ("711", "24")
  ahead of the rest, which silently breaks oldest-first eviction at the cap (200). Corrupt JSON gives an empty map.
- **When to learn:** only after a successful save, and only when the person changed the merchant from
  what was heard. This needs the heard span, which the contract lacks. See §8 item 1.

---

## 5. Risks

| # | Risk | Mitigation / owner |
|---|---|---|
| R1 | Refactoring three save paths with **zero** tests on their payloads | Golden tests first, unchanged after (Diego); reviewer rejects any golden-test edit in the refactor diff (me) |
| R2 | Hand-off then form `router.back()` lands on a live review page, so a duplicate save | `from=voice` → `dismissTo('/home')`; `clearVoiceDraft()` on save; Save disabled while pending |
| R3 | `enforce_scan_is_pro` (`20260831100007_pro_wall.sql:148-165`) walls only `('scan','upload')`, so a `voice` receipt would pass the server wall | second migration adds `'voice'`. Bills and subscriptions have no source column, so they are client-walled only. That's acceptable: typing them is free anyway |
| R4 | `alter type … add value`: Postgres 17 (`config.toml:42`) allows it in a transaction but refuses to **use** the new value before commit, and the CLI applies a file as one transaction | value in its own file; function in the next file. No migration in this repo has done this before. Diego verifies with a local `supabase db reset` if Docker is up, otherwise flags it unverified |
| R5 | App build ships before the migration, so every voice receipt insert fails the enum | **Deploy the DB migration before the native build reaches anyone.** CEO and Founder gate |
| R6 | Fake Pro override (client `pro: true`, server free) gets refused by the trigger for voice receipts, as scan already is | Tia tests on the real sandbox entitlement; Fake Pro failure is expected |
| R7 | New routes and `typedRoutes: true` (`app.json`): `.expo/types/router.d.ts` is stale until Metro restarts, so `tsc` fails on `'/voice'` | `npm run start:clear` once before `npm run typecheck` |
| R8 | Mic left running under the review page or in the background | §4.3 blur and background cancel; Tia watches the orange indicator |
| R9 | Contract gaps with Drew (§8) | CEO routes to Drew now, before Dana wires parsing |
| R10 | Plugin added with no options (`app.json` diff): Info.plist gets "Allow $(PRODUCT_NAME) to use the microphone." / "…speech recognition." and the plugin also adds Android `RECORD_AUDIO` | Dilip sets `microphonePermission` / `speechRecognitionPermission` from Founder-approved copy |
| R11 | Spoken past-tense renewals ("renewed on the 10th") become the *next* 10th under rule 7, so September's renewal goes uncounted | Drew fixture; review page shows the date prominently |
| R12 | VoiceOver's own speech picked up by the mic; audio session ducking VoiceOver | device check (Tia); announce state changes sparingly |

---

## 6. Test plan hooks (Tara's team)

**Theo — unit:**
- `entry-values`: golden fixtures per kind; every validation message and its field; `icon_id` rule;
  `'period'`; `floorAfterCharges` with and without `lastChargedOn`; `countFromAfterPick` with and without `countsFrom`.
- `validateVoiceDraft` and prefill readers: kind outside the enum; amount `0`, `-1`, `NaN`, `12.345`,
  `1e12`; dates `2026-02-30`, `2026-13-01`, `1/10/2026`; cycle and category outside their enums; one
  amount choice → `[]`; round trip `entry → params → read` is identity; garbage params → blank.
- Aliases: per-user key isolation; cap 200 with oldest-first eviction including integer-like keys;
  corrupt storage → `{}`; `signOut` and `deleteAccount` clear; a learn failure never throws.
- Parser (Drew's 100+ table): include the integer-key merchants ("7-Eleven", "24 Hour Fitness") and "No Frills".

**Theo — screen (`src/__tests__/app/`, never `src/app/`):**
- Golden save tests (Diego writes, Theo reviews).
- `voice-review`, per kind: Save calls `create` **once** with the exact payload (`source: 'voice'` for
  receipts), then `dismissTo('/home')` and `clearVoiceDraft`. A double tap gives one create. A failure
  shows `FAILURE_MESSAGE` and stays. Missing fields → Save disabled plus the form's hint words. Amount
  choices → Save disabled until one is picked. Empty or stale draft id → "Start again". Free user →
  redirect to `/pro-feature?id=voice`. Hand-off pushes the right pathname, the edited values and `from=voice`.
- `voice`: each `SpeechStatus` renders its state; final alternatives → `parseVoice` called with
  `{ today, directory, aliases }` → exactly one push; blur → `cancel()`; mount without the FAB flag
  does not `start()`.
- Home FAB: hidden when `isSpeechAvailable()` is false; hidden while `!ready`; free → pushes
  pro-feature `voice`; Pro → pushes `/voice`.
- Forms: prefill seeds the fields; the category step is skipped with a valid `prefillCategory`; `from=voice` →
  `dismissTo('/home')`; no `from` → `back()` (unchanged); `scannedVia=voice` → `source: 'voice'`, no scan report.

**Tia — device (physical iPhone; the Simulator's mic is not a fair test):**
- Speak the PDF examples and digit forms ("$15.99", "1,800", "45 bucks"). Check the `onDevice` flag. In
  airplane mode, on-device should work where supported and otherwise show the page's explanation,
  never a crash.
- Permissions: first-run prompts (mic, speech); deny each → explanation plus Settings link; revoke mid-session;
  Siri & Dictation off.
- Interruptions: incoming call, Siri, music playing, backgrounding while listening, lock screen. The orange
  mic indicator turns off on leaving `/voice` and on reaching review.
- Back gesture: after a direct save, swiping back from Home goes nowhere and the Home tab is selected;
  same after a form hand-off save; back from the form returns to the review page. (This verifies §4.4 `dismissTo`.)
- VoiceOver: FAB label and hint, listening state announced, VoiceOver's speech not transcribed, review
  fields and Save reachable.
- Dark mode and a non-default accent (Pro theming): FAB, listening visual, review page.
- Large text (AX5): examples wrap, Save pinned in `Screen`'s footer, the FAB clear of the tab bar. A
  text-size change mid-flow resets the navigator and the review page shows "Start again", no crash.
- Free account (and the Fake Free switch): FAB → explainer; `skipbudget://voice` → explainer.
  Real Pro sandbox: a voice receipt saves. Fake Pro on a free server account: receipt save fails (expected, R6).
- Results: a voice receipt appears in Receipts and Home Recent; a voice bill shows under Coming up on the right
  date, with no backfilled charges for a future date and reminder off.

---

## 7. Found along the way (not voice scope; for the owners)

1. **`CalculatorPad` rounds cents differently from `money.ts`.** `calculator-pad.tsx:62-64` uses
   `Math.round(v*100)/100`: `1.005 → 1.00`, `10.075 → 10.07` (so `20.15 ÷ 2` gives `$10.07`), where
   `toCents` (`money.ts:42-48`) gives `1.01`, `10.08`. This is a money-maths duplicate that is off by a cent. **Drew**,
   separate ticket with a fixture.
2. **The brief's premise about receipts is out of date.** `receipts.tsx:54-78` no longer files complete scans directly. Since
   `c123a72` (2026-08-31) every scan lands on the form "and the look is the point". `ScanDraft.complete`
   (`scan.ts:26-33, 100`) is computed and read nowhere; the comments at `scan.ts:36-42` and
   `add-receipt.tsx:88-95` still describe the old behaviour. It's harmless, but it misled the brief. This is a
   precedent for voice: the team removed a no-look save. The review page *is* the look, which is why
   direct save from it is consistent with that decision.
3. `src/__tests__/app/add-bill.test.tsx:25` says the category vocabulary is "drawn from SVG files".
   `bills-mock.ts` → `glyphs.ts` imports `lucide-react-native` (no `.svg`), but the mock is still needed
   in jest. Drew should keep `src/lib/voice/` free of `@/data/bills-mock`: hard-code the ten ids, with
   one test asserting they equal `BILL_CATEGORIES` ids.

---

## 8. Where I disagree with, or need more from, the brief

1. **`VoiceDraft` needs `merchantHeard: string | null`**: the raw span the parser treated as the merchant.
   Without it, "spot a fly" → "Spotify" cannot be learned, because the draft only carries the matched name.
2. **`learnAlias` / `applyAliases` / `voiceVocabulary` are named by the CEO but not in the brief's contract.**
   Proposed signatures: `learnAlias(pairs, heard, canonical, cap = 200): pairs` (pure, ordered pairs);
   `applyAliases(text, map): string`; `voiceVocabulary(directory, own): string[]` (≤ 100).
3. **Changing kind on the review page** ("that was a bill, not a receipt") flips date direction and
   category mapping. Either `VoiceContext` gets `forceKind?: VoiceKind` and the review page re-parses
   the same alternatives, or the person re-checks the date by hand. I recommend `forceKind`.
4. **Ownership:** the add forms go to Diego, not Dana (§3).
5. **"Usage can be measured"** covers receipts only. Bills and subscriptions have no `source` column. Adding
   one is a bigger migration and a second wall surface. My recommendation is not to in v1. The Founder
   should know the metric is receipts-only.
6. `WALL.voice` changes nothing at runtime (`WALL` has no readers). The gate is `PRO_FEATURES.voice` +
   `useProGate('voice')`. We'll add it for the record, but the brief should not treat it as the gate.
