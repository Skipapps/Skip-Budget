# Voice input — CEO brief (2026-10-01)

Source plan (Founder's PDF, extracted): `.claude/team/dev/voice-input-plan-source.txt`.
Read it, but where it disagrees with this brief, **this brief wins** — the CEO's feasibility review
corrected it against the codebase.

## Founder decisions (final)

1. **Scope:** receipts, bills, subscriptions. **Salary is out** for now.
2. **Pro only.** Voice is a verb, so it sits behind the wall (`src/lib/wall.ts`) like receipt scan.
   A free user tapping the mic lands on the `/pro-feature?id=voice` explainer via `useProGate('voice')`.
3. **Recognition:** on-device when the phone supports it; otherwise **allow Apple's servers** and the
   privacy policy says so.
4. **Entry point:** a **floating mic button on the Home dashboard, bottom-right, just above the tab
   bar.** Use `Screen`'s existing `floating` prop (`src/components/ui/screen.tsx`).
5. **Every step of the flow is its own full page**, pushed with the app's standard transition
   (`slide_from_right`, already the Stack default in `src/app/_layout.tsx`; back slides right).
   **No bottom sheets, no slide-up panels, no popovers, no hover cards.** The only overlays allowed
   are the existing confirm dialogs (`useConfirm`, e.g. "Cancel this?").
6. The first voice page teaches with **a few examples each for receipts, bills and subscriptions**.
7. **Nothing saves without the user confirming** on a review page.
8. **Brand theme:** Poppins, the palette tokens (`src/theme/palette.ts`, Tailwind classes like
   `bg-surface bg-card bg-control text-ink text-muted bg-accent text-on-control border-line`),
   `shadows` from `src/theme/shadows.ts`, Lucide icons, existing UI components in
   `src/components/ui/`. Light and dark both. Accent is the user's chosen accent (Pro can theme).

## Stability plan (Founder approved — follow it)

- **Voice can never crash the app.** The speech native module is loaded optionally (same pattern as
  `modules/receipt-scanner/index.ts` → `requireOptionalNativeModule`). Missing module, denied
  permission, or no recognizer → the mic is hidden or the page explains, never a crash.
- **The parser is plain code, fixture-tested.** A table of 100+ messy sentences → exact expected
  result (kind, amount in cents, merchant, date, cycle, category), run in jest on every build.
  Model it on `src/lib/receipt-parser.ts` + its test.
- **Nothing saves without a tap.** Unclear input still reaches the review page with whatever was
  caught; anything not understood can be finished in the normal add form, pre-filled.
- **One save path.** Voice must not duplicate the add forms' business rules (past charges,
  reminders, `floorAfterCharges`, validation). Dmitri decides how, with evidence.
- Ships in a native build (new native module → not an OTA update).

## Corrections to the PDF plan (do these, not the PDF)

1. **No Fuse.js, no chrono-node.** Reuse: `src/lib/search.ts` (`matchesSearch`, Sellers fuzzy),
   `src/api/brands.ts` (`useBrandDirectory`, `matchBrand`, `guessCategory`, brands have `aliases`),
   `src/lib/date.ts` + date-fns, `src/lib/money.ts` (`toCents`, `roundMoney`). Own words-to-numbers.
2. **Score a date only when one was spoken.** No `?? new Date()` inside the score.
3. **Self-correction is slot-wise.** "Comcast forty, no, fifty" → $50 *and* Comcast. Replace only
   the corrected value. Triggers: "no wait", "actually", "I mean", "sorry", "no" only **between two
   values of the same kind** — never a bare "no" ("No Frills" is a store).
4. **Ambiguous amounts are never guessed.** "twelve fifty" = $12.50 or $1,250. Return both choices
   and let the review page ask. Same for "fifteen hundred" style only when genuinely ambiguous.
5. **iOS usually writes numbers as digits** ("$15.99", "1,800", "45 bucks"). Digits are the main
   path; spoken words are the fallback. Handle `$`, commas, "bucks/dollars/cents", "k"/"grand".
6. **Bills need a category and a first due date.** Map words → `BILL_CATEGORIES` ids in
   `src/data/bills-mock.ts` (housing, energy, water, internet, mobile, insurance, loans, transport,
   family, other).
7. **Date direction depends on kind.** Receipt "on the 5th" = the most recent 5th (today or past).
   Bill/subscription "due on the first" = the next 1st (today or future).
8. **USD only** (profile currency is fixed to USD — `src/api/mutations.ts`). `lang: 'en-US'`.
9. **Learned corrections stay on the phone** (AsyncStorage, capped, e.g. 200 pairs). No new table.
10. **iOS only** until release. No Android work.
11. Receipts' `capture_source` enum is `manual | scan | upload` → add `voice` (migration) so usage
    can be measured.
12. Info.plist needs `NSMicrophoneUsageDescription` + `NSSpeechRecognitionUsageDescription`; the
    privacy page (`src/app/privacy.tsx`) and App Store label need updating (copy → Founder approves).

## Interface contracts (so work can run in parallel)

### Parser — Drew owns `src/lib/voice/` (pure TS, no React, no native)

```ts
export type VoiceKind = 'receipt' | 'bill' | 'subscription';
export type VoiceCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** Structurally the same as BrandSelection in src/components/brands/brand-field.tsx. */
export type VoiceMerchant = { brandId: string | null; name: string; domain: string | null; categoryId: string };

export type VoiceDraft = {
  kind: VoiceKind;
  /** True when a keyword decided the kind; false when it fell back to receipt. */
  kindSure: boolean;
  /** Dollars, cent-exact (via money.ts). Null when no amount was heard. */
  amount: number | null;
  /** Two or more when the amount is ambiguous; the review page asks. Otherwise empty. */
  amountChoices: number[];
  merchant: VoiceMerchant | null;
  /** yyyy-mm-dd, only when a date was actually spoken. Direction depends on kind. */
  date: string | null;
  /** Bills and subscriptions only. Null when not said. */
  cycle: VoiceCycle | null;
  /** Bills only: a BILL_CATEGORIES id, or null when nothing mapped. */
  billCategoryId: string | null;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  /** What the review page should highlight as still needed. */
  missing: Array<'amount' | 'merchant' | 'date' | 'cycle' | 'category'>;
  /** The alternative that won, as heard (for "You said: …"). */
  transcript: string;
};

export type VoiceContext = {
  /** yyyy-mm-dd, injected so tests are deterministic. */
  today: string;
  directory: BrandRow[]; // from src/api/brands.ts
  /** Learned corrections, heard phrase → canonical merchant/brand name. */
  aliases: Record<string, string>;
};

export function parseVoice(alternatives: string[], ctx: VoiceContext): VoiceDraft;
```

### Speech — Dilip owns `src/lib/speech.ts` (+ native install/config)

```ts
export type SpeechStatus = 'idle' | 'asking' | 'listening' | 'denied' | 'unavailable' | 'error';
/** False in any build without the native module (web, Jest, old builds). Never throws. */
export function isSpeechAvailable(): boolean;
export function useSpeechCapture(options: { contextualStrings: string[] }): {
  status: SpeechStatus;
  /** Live words while listening. */
  interim: string;
  /** Final alternatives, best first, at most 3. Empty until a final result. */
  alternatives: string[];
  /** Whether the finished session ran on-device (false = Apple's servers). */
  onDevice: boolean;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
};
```

## House rules (every agent)

- Expo 57 docs are the source of truth: https://docs.expo.dev/versions/v57.0.0/
- Every failure shows `FAILURE_MESSAGE` (`src/lib/failure.ts`); form hints keep their own words.
- A page's primary action goes in `Screen`'s `footer` prop, never `mt-auto` in the scroll.
- **Tests never go under `src/app/`** (they become routes). Screen tests → `src/__tests__/app/`.
- Clear `.expo/cache/eslint` before trusting lint; run `npx jest --ci` directly.
- Work only in the files you own. Several agents share this working tree today; uncommitted
  changes in `src/app/auth.tsx`, `signup.tsx`, `verify-otp.tsx`, `src/api/push*` belong to another
  session — **do not touch them**.
- No commits, pushes or merges. Append a short report to your team log when done.
