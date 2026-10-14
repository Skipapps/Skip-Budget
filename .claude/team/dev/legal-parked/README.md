# Parked: new Terms of service and Privacy policy (2026-10-13)

The Founder paused all legal, policy and email work until they have filed an LLC (via Jay, 2026-10-13). This folder holds the finished-but-unshipped work so it can be picked up without redoing it. Nothing here is in the app; the files it touches are back to HEAD.

## What's in it

- `legal-terms-privacy.patch` — the new Terms of service and Privacy policy in English, Spanish and French, ready to apply on top of the commit it was cut from (`git apply --check` clean on 973a12d's successors up to d436456 + later commits that don't touch these files). Touches:
  - `src/i18n/messages/legal.ts` — every legal string (182 keys: 108 new, 31 changed, 43 kept; `legal.terms.money.*` and `legal.terms.law.note` removed).
  - `src/app/terms.tsx`, `src/app/privacy.tsx` — section lists (Terms: summary + 17 sections; Privacy: summary + 13).
  - `src/components/ui/legal-document.tsx` — new `link` block (opens Apple's licence and refund pages in the in-app browser, one failure line if it can't) and `subheading` block; `summary` may be a list of blocks.
  - Tests: `src/__tests__/app/legal.test.tsx`, `src/__tests__/components/legal-document.test.tsx`, `src/i18n/legal-faq-messages.test.ts` (brand names; placeholders and URLs kept exactly and exempt from the French colon rule).
- `remove-buy-me-a-coffee.patch` — removes the "Buy a coffee for team" row from Settings and its `support.coffee*` strings. The matching Settings test changes are not in it; re-derive them when this is picked up (the tests to drop are the two coffee ones and COFFEE in the button order).
- `ask-sam-answers.patch`: Ask Sam answers for the new legal text (Skip Budget run by an individual, Ohio law, Canada storage, the 7-year nightly delete, the full stored-data list, "a figure can be wrong") and for the coffee row being removed, in en/es/fr. Apply it with the legal patch; afterwards, run `node scripts/ask-sam/build-prepared.mjs`, then the Ask Sam checkers and `npx jest src/lib/ask-sam`.
- The approved wording and its sources: `../legal-draft-terms.md`, `../legal-draft-privacy.md`, `../legal-facts-2026-10-13.md`. Phone-readable copy: https://claude.ai/artifact/88uSy5LjaWePYe7Hv6N9ei

## Decided (Founder, "all as recommended", plus L1/L2)

18+; Apple's standard licence; Apple handles refunds; 7-year deletion on; Splits data removed; no Buy Me a Coffee; seller "Skip Budget", run by [LEGAL NAME], an individual; governing law the State of Ohio, United States, with local consumer protections kept and no arbitration or class-action waiver.

## Still pending before it can ship

- **Legal name** — `[LEGAL NAME]` (likely the new LLC, which changes "an individual" too).
- **Postal address** — `[POSTAL ADDRESS]` (home address vs P.O. box/mailbox service).
- **Contact email** — the text still says admin@skipapps.net in four places; an @skipbudget.com address is being considered.
- **Logo host** — the Privacy policy names `logos.skipapps.net`, the logo service's real image server. Changing it to skipbudget.com is only true if the logo host moves.
- **`[SENTRY DAYS]`** — Sentry's retention, from its dashboard. **`[DATE]`** — set on the day it goes live, in each language's date format.
- **Two gated lines left out on purpose**: the Sentry line "carries your account id… doesn't include what you typed" (waits on the logic chat's scrubber, native network breadcrumbs off, and `setUser`), and the Delete-account reminder sentence, which IS in the patch ("If you have Skip Pro, Skip asks you to cancel it before you delete.") because that warning shipped in the app.
- **Founder dashboard to-dos**: data processing agreements (Supabase, RevenueCat, Resend, Sentry, Cloudflare), confirm Resend sends sign-in mail, Sentry IP storage setting, App Store Connect check of the leaving-offer product.
- **Lawyer review** of the final English, then redo es/fr to match.
- **After it ships**: the Ask Sam answers that quote the policy, web copies on skipbudget.com, the iOS privacy manifest and App Store privacy label (table in `../legal-draft-privacy.md`).

## To pick it up

1. `git apply .claude/team/dev/legal-parked/legal-terms-privacy.patch` (and the coffee patch if still wanted). If HEAD has moved, `git apply --3way`.
2. Fill the placeholders, update `legal.test.tsx`'s placeholder checks to match, run the legal and i18n suites, then show the Founder the final text before committing.
