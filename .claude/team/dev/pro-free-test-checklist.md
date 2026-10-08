# Pro / Free — Founder's device test checklist

Before testing: the database change `20261007100001_free_capture_allowance.sql` must be live
(Founder approval), or free scans are still refused by the database and the one-time offer never
appears. Switch plans with Settings → Developer → **Fake Pro** / **Fake Free** (development builds).

Fake Pro / Fake Free change only what the app draws. The database still goes by the account's real
`entitlements` row (set with `supabase/seed/pro-state-{pro,lapsed,free}.sql`, relaunch after). So with
Fake Pro on an account the server thinks is free, the 16th scan saves with the failure line: that is
the database wall working, not a bug. To test the 15-a-month wall itself, use an account the server
thinks is free (pro-state-free.sql, or a second test account), not Fake Free.

## 1. Free scans and uploads (Fake Free on)
- [ ] Add receipt → Scan and Upload have no PRO badge; under them: "Free this month: N scans and N uploads left".
- [ ] Scan a receipt and save → the scans number drops by one; uploads unchanged.
- [ ] Upload a photo and save → the uploads number drops by one.
- [ ] Typing a receipt changes neither number.
- [ ] At 0 scans left: Scan wears PRO and opens "Every receipt, read for you"; Upload still works.
- [ ] Receipts list → the scan icon at top follows the same rule.
- [ ] Fake Pro on → no numbers, no badges, unlimited.

## 2. 90-day history (Fake Free on)
- [ ] Activity → Month → Earlier stops at the month holding the day 90 days ago; Year shows from that day.
- [ ] Where older entries exist, the list shows "Older history is saved" → opens "Seven years of your money".
- [ ] Receipts (Year), Bills and Subscriptions (Year), a bill/subscription page, a receipt page's store history,
      a card/account page and Savings all stop at 90 days with the same line.
- [ ] Card and account BALANCES, Savings' "Saved so far", and the headings of Receipts/Bills/Subscriptions/
      Activity (a Year's totals) are the same with Fake Free and Fake Pro; only the rows stop at 90 days.
- [ ] Home day stepper ← stops at 90 days back; the date picker cannot go earlier.
- [ ] Fake Pro on → everything back, up to 7 years.

## 3. Logos (Fake Free on)
- [ ] Every list, detail page and search shows initials (bills show their icon) instead of logos.
- [ ] Cold start: logo spots show a plain grey circle for a moment, never a logo that turns into initials.
- [ ] A store added on free is listed first next time you search.
- [ ] Adding a new store never asks "Looks like …?" and shows no "Change logo".
- [ ] Tapping the pencil on a receipt/bill/subscription logo opens "Every store, its own logo".
- [ ] Fake Pro on → logos return at once.

## 4. Loan calculator
- [ ] Home → Loan Calculator card has no PRO badge and opens for free accounts, schedule and Save included.

## 5. The Pro page
- [ ] Settings → Skip Pro: matches the design in light and dark: table, Yearly (Most Popular) selected, Monthly.
- [ ] Sandbox account that never had a trial: button "Try Pro free for 14 days", "Then $19.99/year. Cancel anytime."
- [ ] Choosing Monthly changes the button to that plan (trial only if Monthly has one in App Store Connect).
- [ ] A sandbox account that already used the trial: "Get Pro for $19.99/year" (no trial promised).
- [ ] Restore purchase, Terms and Privacy work; the small "Renews automatically…" line sits at the bottom.
- [ ] App Store Connect's "2 weeks" free trial reads "Try Pro free for 14 days".
- [ ] Spanish and French (Settings → Preferences) read correctly.

## 6. The one-time offer (needs the database change AND the RevenueCat `exit_offer` offering)
- [ ] Free account: open Skip Pro, tap back → the half-price page replaces it; swipe-back on the Pro page is off before that.
- [ ] Timer counts down from 10:00; leave the app for a minute and return → it has moved on.
- [ ] X or No thanks closes it; open Skip Pro again and tap back → plain back, no offer (never again).
- [ ] Reinstall or a second phone with the same account → still no offer.
- [ ] Settings → Developer → "Show the one-time offer again" lets you repeat the test.
- [ ] Let the timer reach 0 → "This offer has ended.", button "Offer ended" does nothing.
- [ ] Change the phone's text size while the offer is open → the timer keeps its place.
- [ ] `skipbudget:///pro-offer` typed as a link → closes at once (only a claim opens it).
- [ ] Restore purchase on the offer page works.
- [ ] Buying the offer in sandbox → Pro is active.

## 7. Lapse (Pro → free)
- [ ] With Pro, add 3 cards and scan 20 receipts; switch to Fake Free → all cards still listed and editable,
      balances unchanged, "Add card" opens the explainer, scanning follows this month's free count.
