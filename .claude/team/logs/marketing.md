# Marketing team log

Newest entry at the bottom. Each entry: date, name, outcome, what changed, open questions.

---

## 2026-10-01 — Mia — voice input privacy copy (draft, done)

**Outcome:** Drafted all three deliverables the CEO asked for; nothing published, no app code
touched.

**What changed:** New file `.claude/team/marketing/2026-10-01-voice-privacy.md`, containing:
(1) a new privacy-policy section "Adding things by voice" for `src/app/privacy.tsx`'s `SECTIONS`
array, placed after "What never leaves your phone" and before "Who else sees it", plus one new
bullet for "Who else sees it" (Apple's speech service, off-device case) — read the full existing
file first, quoted every sentence I checked, found no existing "we don't access your microphone"
line that needed reversing; (2) the two Info.plist purpose strings — kept the mic one close to the
brief's draft (86 chars, already correct not to promise on-device since that's sometimes false),
tightened the speech one from two sentences/178 chars to one sentence/151 chars; (3) reasoning for
the App Store privacy label: no "Audio Data" row needed in any of the three buckets, in either the
on-device or Apple-server path, since Skip's code never receives raw audio either way — only
recognised text. Flagged one thing I can't verify from the repo: whether the existing App Store
Connect label already declares a Usage Data category that `capture_source` (adding `voice`) would
fall under.

**Open questions:** Founder sign-off needed on the section text, the two permission strings, and
whether to also fold "learned voice corrections stay on the phone" into the existing appearance/
haptics/app-lock bullet (I kept it inside the new voice section instead, flagged as a judgment
call). Whoever owns App Store Connect should confirm the capture_source/Usage Data point against
the live listing, not this draft.

---

## 2026-10-07 — Mia — wave 2 legal and FAQ translation (done, in the i18n worktree)

**Outcome:** Privacy policy, terms of service, common questions and the shared legal-document
component now read through the message system; Spanish (Mexico) and French (Canada) written
clause for clause beside the English, which is unchanged.

**What changed:** `src/app/privacy.tsx`, `terms.tsx`, `faq.tsx`, `src/components/ui/legal-document.tsx`,
`src/i18n/messages/legal.ts` and `faq.ts`, five new test files, one mock line in `faq.test.tsx`.
A courtesy-translation notice sits on top of the translated policy and terms. Detail in
`.claude/team/logs/wave2/legal-faq.md`.

**Open questions:** a lawyer must review the Spanish and French and four clauses that depend on
local consumer law (English-prevails notice, warranty disclaimer, liability carve-out, changing
the terms by notice). The English Terms "Money" section says Skip has no in-app purchases or
subscriptions, which Skip Pro contradicts; the privacy policy does not name RevenueCat.
