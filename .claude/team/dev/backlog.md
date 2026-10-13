# Backlog (Founder-approved, not started)

- 2026-10-09: Bank logos for accounts (account faces, Paid into rows) using the existing logo service; colour swatch until then. Start after the loan/salary/Paid-from redesigns land.
- 2026-10-09: Bills follow each loan payment's exact amount (odd first payment, smaller last payment, typed overrides), so Current balance and reminders are right to the cent. Next task after the loan-redesign push (Founder approved).
- 2026-10-12 (found, CEO-logged, Founder not yet asked): a bill/subscription due TODAY has no ledger row until `recordDueCharges` runs on app open (pull-to-refresh doesn't run it); `ledgerEntries`/`planOccurrences` project only from tomorrow once a plan has a charge, so Home shows it as next month for a while. Fix in `planOccurrences` (project today when today's charge isn't recorded yet).
- 2026-10-12 (found): on the free plan `usePaymentSources()` returns only the first card + first account, so existing Bills/Subscriptions/Activity rows label a charge on a locked second card "No payment method". The bills redesign reads labels via `src/api/payment-labels.ts`; fix the old screens or retire them in the swap.
- 2026-10-12: leaving the edit page after a failed bill/subscription past-charge rewrite leaves charges unrewritten (the plan is saved); a server function like `update_loan_and_charges` would close it.
- 2026-10-12: bills ownership trigger (card/account must belong to the bill's user); clamp `update_loan`/payoff `p_today` to the profile's day.
