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

---

## 2026-10-13 — Mia — new English Terms of service, draft (done, draft file only)

**Outcome:** Drafted the full English Terms (summary plus sections 1 to 17) for Founder approval through Jay. Nothing is in the app; no source file touched.

**What changed:** New file `.claude/team/dev/legal-draft-terms.md`: app text with KEEP / UPDATE / NEW tags, a "Why:" line per section for Dmitri, a Before-to-after list, a Placeholders and ALTs list, and eight checks for Dmitri. Placeholders: `[DATE]`, `[LEGAL NAME]`, `[POSTAL ADDRESS]`, `[GOVERNING LAW: state/province, country]`. No price typed; Buy Me a Coffee assumed removed (ALT kept); age 18+; Apple's standard EULA linked. One departure from "KEEP": section 15 now says deleting the account removes "what you saved in Skip" (with a pointer to the Privacy policy) because the old "your data permanently" overclaims against the fact sheet; the original is kept as an ALT. Added one unrequested sentence in section 11 (Pro-only extras stop being available) and flagged it.

**Open questions:** Does the one-time offer screen show the renewal price (section 9)? What exactly happens to Pro-only features on lapse (section 11)? How are renewals stopped if Pro is withdrawn (section 12)? Does the Privacy draft list what survives account deletion (section 15)? "licence" or "license" spelling. Apple's Schedule 2 not read.

---

## 2026-10-13 — Marcus — Terms/Privacy for Skip Pro: research and outline (done)

**Outcome:** Researched what Apple requires for subscriptions (3.1.2, Schedule 2 §3.8), privacy policies (5.1.1(i)), the App Privacy label and account deletion (5.1.1(v)), plus the wording traps around "free", refunds and "cancel anytime". Delivered a checklist for each document, keep/update/new outlines and nine Founder decisions with recommendations. No files edited at the time; the CEO asked for no repo edits during that step.

**What changed:** nothing in the repo. Flagged for others:
- The delete-account flow gives no Skip Pro notice.
- The Buy Me a Coffee row is a 3.1.1 risk.
- The offer copy says "a one-time price" and "Was".
- Revoking Apple sign-in on deletion is unconfirmed.
- The renewal line is 10.5px.

**Open questions:** went to the Founder through Jay. Dmitri's fact sheet (`.claude/team/dev/legal-facts-2026-10-13.md`) answers the fact questions.

---

## 2026-10-13 — Marcus — new English Privacy policy draft (done, awaiting Founder and lawyer)

**Outcome:** Wrote the new English Privacy policy, sections 0-13, each tagged KEEP/UPDATE/NEW with a "Why:" line. It follows Dmitri's fact sheet and its drafting assumptions:
- 7-year deletion switched on;
- Splits leftovers removed;
- Buy Me a Coffee removed;
- the subscriber warning built;
- Sentry carries the account id with web addresses stripped, and no "never your IP" promise;
- minimum age 18.

**What changed:** new file `.claude/team/dev/legal-draft-privacy.md`, holding the policy text with suggested message keys, a before → after list for the Founder, the placeholders and ALTs, and the App Privacy label rows with privacy-manifest keys. Nothing else touched; `legal.ts` is unchanged.

**Open questions:**
- New placeholder `[SENTRY DAYS]` alongside `[REGION]`.
- The delete-account counts leave out loans, habits, goals, savings, card payments, pay and books. I dropped "exactly" rather than claim it; completing the counts would let it come back.
- The logo voter tag is a one-way hash of the account id. That is pseudonymous rather than anonymous, so I didn't call it anonymous. Lawyer to check.
- "They must protect it at least as well" depends on each service's data-processing terms being accepted.
- Label judgement calls for the Founder: Payment Info, Device ID, Product Interaction, Other Data, Search History No, and Coarse Location until Sentry's IP setting is on.
- "Messages stay in our inbox until you ask us to delete them" is a new promise the Founder must be willing to keep.

---

## 2026-10-13 (later) — Mia — Terms draft revised with Dmitri's corrections

**Outcome:** `.claude/team/dev/legal-draft-terms.md` revised in place; still a draft, nothing in the app.

**What changed:** Sections 1, 5, 6, 7, 8, 9, 10, 11, 12 reworded per Dmitri's fact-check (Apple Account wording, trial and special-offer text, cancel and restore paths, When Skip Pro ends rewritten, Pro withdrawal wording). Why lines, Before to after, Placeholders and ALTs, and Checks updated. British spelling kept.

**Open questions:** The "take it off sale so it stops renewing" mechanism could not be confirmed from Apple's own pages (developer forum posts disagree); fallback wording is in Checks item 3. The legal page needs a link block for the two Apple addresses.

---

## 2026-10-13 (later still) — Mia — Pro page, leaving offer and delete-account copy, draft (done, draft file only)

**Outcome:** Replacement copy in English, Spanish and French for the Pro page, Settings pitch, leaving offer and delete-account flow, so the app stops contradicting the new Terms and Privacy. Draft file only; no source file touched. Dana implements after the Pro files are committed.

**What changed:** new file `.claude/team/dev/pro-settings-copy-draft.md`. Per key: where it shows, current en/es/fr, new en/es/fr, why.
- Delete: `pro.compare.early`, `pro.compare.support`.
- New keys: `pro.offer.renews`, `settings.delete.proTitle`, `settings.delete.proMessage`, `settings.delete.proContinue`. The Manage button reuses `pro.page.manage`.
- Changed values: `pro.history.b`, `pro.unlimited.c` (today's truth, plus an ALT for after L17), `pro.compare.upload`, `settings.pro.pitch`, `pro.offer.titleSpecial`, `pro.offer.wasPrice`, `pro.offer.badge` (ONE-TIME CHANCE recommended), `settings.delete.held`, `settings.delete.nothingHeld`, and `settings.delete.finalMessage` (not asked: "no copy kept" contradicts the Privacy draft).
- Delete-account counts: keep the eight counts; add a closing "everything else, such as loans, savings, goals and spending habits". Four of the missing counts would be too low (archived habits, closed goals, removed pots, a private payments hook).
- Also drafted `faq.pro.include.a` and `faq.pro.cancelled.a`, which make the same false claims. Listed the tests and Ask Sam entries that read the old text.

**Open questions:** Does the one-time offer renew at the price it shows (decides "half price", the renewal line and Terms section 9; ALT written)? Should "Usually $X a year" be visible, not just a screen-reader label? What exactly does L17 let lapsed people do? Hide the subscriber warning for people who already cancelled? The `LockOpen` icon on "Add them all" no longer fits. Spanish and French have had no native read.

---

## 2026-10-13 (evening) — Mia — Spanish and French for the new legal text (done, legal.ts only, not committed)

**Outcome:** Translated all 137 keys that carried English in es/fr (Dana's 139 minus the two `updated` dates, which stay `[DATE]`). `npx prettier --check` passes; the i18n and legal tests pass except two checks in `src/i18n/legal-faq-messages.test.ts` that the exact URLs, the `[GOVERNING LAW: ...]` placeholder and `[DATE]` cannot satisfy.

**What changed:** `src/i18n/messages/legal.ts` only. One English change in all three languages: `legal.privacy.deleting.note2` now ends "If you have Skip Pro, Skip asks you to cancel it before you delete." `legal.terms.ending.p3` reuses the old es/fr sentence from the previous `ending.p1`. Quoted buttons match pro.ts ("Administrar en el App Store", "Restaurar compra", "Gérer dans l’App Store", "Restaurer l’achat"). "Remind me in 1 hour" stays in English with a short gloss, because the notification button is English-only.

**Open questions:** the test exceptions above (CEO); "cuenta de Apple (ID de Apple)" and "compte Apple (identifiant Apple)" are Apple's own terms, not yet used elsewhere in the app; iOS menu names for Sign in with Apple not checked on a device; a lawyer still needs to review es/fr.
