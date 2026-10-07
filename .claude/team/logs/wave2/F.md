# Wave 2, area F (voice): log

## 2026-10-07 — Dana (agent F) — voice screens and components onto the message system

**Outcome:** Done. Every word the voice pages and components write goes through t(); English is
unchanged character for character (the existing voice suites pass untouched). The sentences a
person is told to say stay English exactly as in `src/data/voice-examples.ts`, and in Spanish and
French a muted line above them says Skip understands spoken English only for now. Pro badge, mic,
hold-to-talk flow, `src/lib/speech.ts`, `src/lib/voice/**` and the data file are untouched.

**What changed**
- `src/i18n/messages/voice.ts`: 97 `voice.*` keys (kinds, per-kind titles/close prompts/saves/field
  names/questions, record page, mic, hints note, review, review row, edit pages, stale draft, FAB).
- Reused: `common.yes/change/done`, `common.failure` via `failureText()`, `dates.weekly/monthly`,
  `bills.recurrence.quarterly/yearly`, `subscriptions.cycle.quarterly/yearly`,
  `ui.flow.discardMessage/stay` (the review's back dialog is the header close dialog's twin) and
  `billCategoryLabel()` from `components/bills/bill-row.tsx`, so the category row and the category
  picker always agree.
- Converted: `app/voice.tsx`, `app/voice-review.tsx`, `app/voice-edit.tsx`,
  `components/voice/{mic-button,review-row,stale-draft,voice-fab,voice-hints}.tsx`.
  `own-merchants.ts` has no text.
- `FAILURE_MESSAGE` on screen and in announcements is now `failureText()`.
- `VoiceFab` calls `useLocale()` (it lives in the tab bar, outside the screens' remount).
- Module-level label tables became message-key tables translated at render, or lazy `get label()`.
- Wording aligned with the add forms (receipts, bills, subscriptions) where the English is the same.
- Stored values left alone: the bill's default name is still the category's English label
  (`categoryLabel`/`labelOf`), as add-bill does; kind, cycle and category ids; routes.
- Tests (new): `src/__tests__/app/voice-languages.test.tsx`, `voice-review-languages.test.tsx`,
  `voice-edit-languages.test.tsx`, `src/__tests__/components/voice-languages.test.tsx` (es and fr,
  no raw keys, no `{param}`, 1234.56 typed on the keypad stored as 1234.56 in en/es/fr, the FAB
  following a live language switch).
- No large-text site added or removed; the new note uses `TEXT_CAP.heading`.

**Open questions**
- Bills with no name of their own are saved (and shown on review) under the English category label
  in every language. Same as add-bill; a product call.
- The English hints say "$12.50" whatever the currency (data file and parser untouched by brief).
