# Wave 2, agent D (Dana): receipts, insights, savings

## 2026-10-07, Dana

**Outcome.** Done. Every line a person reads or hears on Receipts, Add receipt (scan and upload
flow, scan report, review step, delete), the receipt row and filter sheet, Insights, Savings and
the savings month page goes through t(), with Spanish (Mexico, tú) and French (Canada, tu) beside
the English. Amounts through formatCurrency, dates through formatFullDate and monthLong(). English
is unchanged; every existing test passes untouched.

**Files changed.** src/app/: add-receipt, insights, receipts, savings, savings-month.
src/components/receipts/: receipt-filter-sheet, receipt-row. Messages: receipts (85 keys),
insights (43), savings (33). New tests: src/__tests__/app/{add-receipt-i18n, insights-i18n,
receipts-i18n, savings-i18n}.test.tsx and src/__tests__/components/receipts-i18n.test.tsx (28).

**Decisions.**
- Stored values stay: spend and bill category ids, capture source, route params, ISO dates.
  Category names are mapped from the id for display (receipts.category.*, insights.billCategory.*);
  an id with no message keeps its stored label. The words match subscriptions.spendCategory.* and
  bills.category.* exactly; one shared set would remove the duplication.
- Scan report ("Read the store, date and amount."): field words carry their article in Spanish
  and French ("la tienda, el importe"), joined by a "{first} and {last}" message.
- Month names ("August 2026") are built from monthLong() and savings.monthYear ("agosto de 2026"),
  capitalised at the start of a line, lower-case inside a sentence ("¿Dejar fuera agosto de 2026?").
- Filter sheet Reset is "Borrar" / "Effacer": the third-width button fits about seven letters.
- FAILURE_MESSAGE on screen switched to failureText(). The "PRO" sticker stays as written.
- No large-text site added or removed; Insights keeps [22, 7, 3].

**Verified.** tsc clean for my files; eslint and prettier clean on my files; my 17 suites 125/125;
whole suite 173/176 suites, 2477/2522 tests, the failures all in Drew's amount-entry and loan
language tests in progress (one passes on rerun).
