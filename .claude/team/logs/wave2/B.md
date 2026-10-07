# Wave 2, agent B (Dana): cards, accounts, transactions

## 2026-10-07 — Dana

**Outcome.** Done. Every line a person reads or hears on the Cards tab, add-card, add-account,
the card/account page (source/[id]), the Transactions tab, the card faces, the ledger summary and
the filter page now goes through t(), with Spanish (Mexico, tú) and French (Canada, tu) beside the
English. English is unchanged character for character; no existing test was edited.

**Files changed.** src/app/(tabs)/cards.tsx, src/app/(tabs)/transactions.tsx,
src/app/add-account.tsx, src/app/add-card.tsx, src/app/source/[id].tsx,
src/components/cards/account-card.tsx, src/components/cards/payment-card.tsx,
src/components/transactions/filter-sheet.tsx, src/components/transactions/ledger-summary.tsx,
src/i18n/messages/cards.ts (42 keys), accounts.ts (58), transactions.ts (33).
No change needed: card-face.tsx (its words come from its callers; "Skip" watermark is the brand),
network-picker.tsx (network names and MC/AMEX/DISC marks are brands), ledger-row.tsx (labels come
from the screen; amounts already formatCurrency).

**New tests (all es + fr, no raw key, no leftover {param}).**
src/components/cards/card-faces-i18n.test.tsx, src/__tests__/components/ledger-i18n.test.tsx,
src/__tests__/app/cards-i18n.test.tsx, transactions-i18n.test.tsx, add-card-i18n.test.tsx,
add-account-i18n.test.tsx, source-detail-i18n.test.tsx.

**Decisions.**
- Stored values untouched: account type "Checking"/"Savings" (lowercased to the column), pay
  frequency codes (labels via PAY_FREQUENCIES), ledger kind values, money bucket ids, card network.
  Labels are mapped at display (AccountCard meta, TYPE_OPTIONS lazy getters, ledgerKindLabel()
  exported from filter-sheet.tsx, BUCKET_LABELS in cards.tsx).
- The ledger names a payment with no note "Payment" (English, in src/lib/card-ledger.ts, not mine);
  source/[id] draws that one name translated, searches the drawn name and asks "Remove payment?"
  through its own key. A typed note still shows as typed.
- add-card's balance warning is now one plural message ({count}); add-account's "X lands here" is a
  plural on the number of salary sources; the "A and B" join is a message, with the Spanish "e"
  before an i sound ("Acme e IBM").
- FAILURE_MESSAGE on screen switched to failureText() in all five screens.
- French gender: separate keys for a locked card (verrouillée) and a locked account (verrouillé),
  same English.
- Shared words reused across my three areas (cards.form.goBack/saving/deleting/saveChanges/
  cardColour/last4, accounts.type.*, transactions.kind.*, transactions.search/filtersActive/
  filterButton/noMatchTitle/title).

**Large text.** No numberOfLines, adjustsFontSizeToFit or numeric maxFontSizeMultiplier added or
removed; counts unchanged.

**Could not verify.** On device: the places below that may wrap. Lint: add-card.tsx and
add-account.tsx carry 4 pre-existing react-hooks/refs errors each (the `walled` ref), present at
HEAD, not touched.
