# Pro / Free upgrade — plan (Founder-approved 2026-10-07)

Source: the Founder's four screens (Pro page light/dark, one-time offer light/dark) plus their answers.

## The tiers

| | Free | Pro |
|---|---|---|
| Track spending & bills | yes | yes |
| Scan receipts (camera) | 15 a month | unlimited |
| Upload a bill/receipt (photo or file) | 15 a month (separate from scans) | unlimited |
| Cards / bank accounts | 1 each (unchanged) | unlimited |
| Income sources | 1 (unchanged, not in the design) | unlimited |
| Money history | last 90 days shown | 7 years |
| Voice entry | no | yes |
| Insights | no | yes |
| Brand logos | letters (monograms) | yes |
| Loan calculator | **free now** (was Pro) | yes |
| New features first, Priority support | no | yes |

Trial: 14 days, shown only to people still eligible (RevenueCat intro eligibility check).
One-time offer: $9.99/yr, separate product in the same subscription group, real 10-minute timer,
shown the first time a free person closes the Pro page without buying, never again on that account
(server flag). Hidden entirely when the store has no offer product.

## Rules that do not change

- The wall gates verbs, never nouns. Nothing is locked or deleted on lapse.
- History beyond 90 days is HIDDEN for free, never deleted; it returns on upgrade. Balances always
  walk the full history.
- Month for the scan caps = calendar month in the person's own timezone (profiles.timezone).
- Every limit enforced twice: client guard to the explainer, database trigger as the wall.

## Design adjustments (agreed in the plan)

- "Voice entry with" → "Voice entry".
- Small Terms · Privacy links beside "Restore purchase" (App Review 3.1.2).
- Trial CTA only when eligible; otherwise "Get Pro for <price>".
- All prices from the store (pricePerMonthString for "/mo"), US$ fallbacks only.
- Offer timer is real: at zero the offer is gone.

## Tasks (one commit each, gates after each: tsc, jest, eslint vs baseline, dry run)

1. Pro status read once for the app (cheap `usePro()` everywhere). No visible change.
2. New rules in `src/lib/wall.ts` + pure helpers (scan allowance per kind, history floor) + tests.
   Loan calculator leaves the wall.
3. Migration: free scan cap 15/month and upload cap 15/month (voice stays Pro), new refusal
   message, `profiles.pro_offer_seen_at`. Tested on local Supabase (Docker). Live only with the
   Founder's OK, and BEFORE the new app build.
4. Scan and upload for free with caps, "N left this month" line, explainer copy.
5. 90-day history window: Transactions, Receipts, card/account pages, Savings, plan histories;
   "Older history is saved" row → 'history' explainer.
6. Logos Pro: monograms for free; no logo questions / Change logo for free; sure matches still saved.
7. Loan calculator free (remove useProGate from loan screens, Home tool card, explainer).
8. New Pro page per design (light/dark, en/es/fr, trial eligibility, Terms/Privacy).
9. One-time offer page + dev reset switch.
10. Lapse pass on every gate, full gates, Dmitri review, commit with Founder OK.

Then: App Store Connect (14-day intro offer, $9.99 offer product), RevenueCat (attach product,
`exit_offer` offering, verify webhook writes entitlements), Release build for the Founder's phone.

## Status

- [ ] 1  - [ ] 2  - [ ] 3  - [ ] 4  - [ ] 5  - [ ] 6  - [ ] 7  - [ ] 8  - [ ] 9  - [ ] 10
