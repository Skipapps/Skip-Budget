# Ask Sam: handoff

Built 2026-10-13. In the app at `/ask-sam`, opened from the Ask Sam button at the bottom of **Settings**, in English, Spanish and French.

## What it is

A help chat that answers from a written library, with no AI. The library has 876 answers (858 about the app, 18
small talk), asked 10,736 ways in English, with every answer also written in Spanish and French (`knowledge/es`, `knowledge/fr`). If Sam has no good answer, it offers a contact form.

**How it was built and checked:**
- 10 writers read every screen and wrote the answers.
- 5 reviewers checked them against the code and made about 65 fixes.
- A coverage audit compared the library with all 2,386 app strings and added 28 answers.
- 13 duplicate pairs were merged, several of which contradicted each other.

**Accuracy on 1,391 questions written by testers who never saw the library:**
- Overall: 75% get the right answer first, and 89% have it on screen (first, or offered under "Not quite? Did you mean").
- On the half nothing was tuned against: 68% first and 84% on screen.
- 12 of 14 off-topic questions are declined.

- **Test page:** https://claude.ai/artifact/2fVgFTLH7NRVpXBTKWBkKq (private). It has three tabs:
  - **Chat**
  - **All answers:** every answer, searchable.
  - **Your notes:** answers flagged while testing, plus every question Sam couldn't answer, saved automatically.
- The page runs the same engine and answers that the app will ship, built by `scripts/ask-sam/build-web.mjs`.

## Files

| Path | What |
|---|---|
| `src/lib/ask-sam/knowledge/*.ts` | The library, one file per area. `chat.ts` is Sam's small talk. |
| `src/lib/ask-sam/matcher.ts`, `text.ts`, `synonyms.ts` | Matching: spelling fixes, phrases and synonyms, weighted similarity over questions, answer text and keywords. |
| `src/lib/ask-sam/conversation.ts` | The chat itself: follow-ups, "did you mean", alternatives, two questions in one message, handover to a person. |
| `src/lib/ask-sam/eval/*` | 1,391 questions written by testers who never saw the library, used to measure accuracy. |
| `src/lib/ask-sam/knowledge/es/*.ts`, `fr/*.ts` | Each answer's Spanish and French words, laid over the English by id (`library.ts`). |
| `src/lib/ask-sam/language.ts` | Per-language rules: yes/no, follow-up words, corrections, and Sam's own lines. |
| `src/lib/ask-sam/prepared/*.ts` | Search terms prepared at build time. Regenerate with `node scripts/ask-sam/build-prepared.mjs` after any knowledge edit; the library test fails while they are stale. |
| `src/components/ask-sam/*` | The React Native screen (`AskSamChat`), answer text, contact card, the Open-link screen names. |
| `src/app/ask-sam.tsx` | The route: prices, email, name, opening a screen, sending the contact form. |
| `scripts/ask-sam/check-translation.mjs` | Checks a Spanish or French file against the English: same ids, enough questions, placeholders kept, no English left. |
| `scripts/ask-sam/check-knowledge.mjs` | Format checker. Run it after any edit. |
| `scripts/ask-sam/eval.mjs` | Accuracy report: `--misses`, `--split dev|test`, `--topic loans`. |
| `scripts/ask-sam/edit-intents.mjs` | Safe edits from a JSON plan: merge, set answer, add or remove questions, add an intent. |
| `scripts/ask-sam/overlap.mjs` | Finds answers that compete for the same questions. |

## How it's wired

- `src/app/ask-sam.tsx` renders `AskSamChat` with the store's prices (US dollar fallback), the account email, the profile name, `router.push` for "Open {screen} ›", and `useSendMessage` for the contact form, followed by the usual toast.
- The screen's words are in `src/i18n/messages/ask-sam.ts`. The library follows the app's language: `matcherFor(language)` is built once per language per app run, after the page first draws.
- The FAQ's link is to be swapped for Ask Sam later; for now the only way in is the Settings button.

## Keeping it right

- **The code is the truth.** When a feature changes, update its knowledge file in the same change.
- Run `node scripts/ask-sam/check-knowledge.mjs`, `node scripts/ask-sam/check-translation.mjs es` and `fr`, `node scripts/ask-sam/build-prepared.mjs`, then `npx jest src/lib/ask-sam`. The library test fails if accuracy drops below its floor, if a link breaks, or if an answer names a technical service.
- Never add a held-out question to the library word for word. Improve the library using the `dev` half and measure on the `test` half.
