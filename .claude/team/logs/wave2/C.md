# Wave 2, agent C (Dana): bills, subscriptions

## 2026-10-07, Dana

**Outcome.** Done. Every line a person reads or hears on the bill and subscription lists, the
charged pages, the add/edit flows, the detail pages (plan-detail), the filter sheets, the rows and
the category and icon pickers goes through t(), with Spanish (Mexico, tú) and French (Canada, tu)
beside the English. Amounts through formatCurrency, dates through formatFullDate. English is
unchanged except the icon picker's spoken labels (below).

**Files changed.** src/app/: add-bill, add-subscription, bill-plans, bill/[id], bills,
subscription-plans, subscription/[id], subscriptions. src/components/: bills/{bill-filter-sheet,
bill-row, category-picker, icon-picker}, plans/plan-detail, subscriptions/{subscription-filter-sheet,
subscription-row}. bill-mark.tsx has no words. Messages: bills (112 keys), subscriptions (84).
New tests: src/__tests__/app/{bills-i18n, add-bill-i18n, subscriptions-i18n,
add-subscription-i18n}.test.tsx (24 tests).

**Decisions.**
- Stored values stay: bill category ids, recurrence and cycle values, spend category ids. Display
  goes through `recurrenceLabel()`, `billCategoryLabel()`, `billCategoryHint()` (exported from
  bill-row.tsx, replacing `RECURRENCE_LABELS`) and `cycleLabel()` (subscription-row.tsx, replacing
  `CYCLE_LABELS`). Weekly/Monthly reuse dates.weekly/dates.monthly.
- A new bill's default name stays the category's English label (`category.label` in
  add-bill handleSelectCategory, prefillName → defaultBillName). Not changed; reported to the CEO.
- "Filed under" maps the spend category id to subscriptions.spendCategory.*, same words as
  receipts.category.*; an id this build does not know shows the database label.
- Bill search matches the category name read on screen.
- Company-name placeholders (AEP, Xfinity, T-Mobile, Geico, Chase lists) stay as written.
- category-picker: dropped `numberOfLines={2}` on the label and hint so longer Spanish/French hints
  wrap instead of being cut (not counted by the guard). No guard counts changed.

**Deliberate English change.** The icon picker's accessibilityLabel was the raw id ("other",
"tv"); it is now a label ("Other", "TV", "Education"...). No test depended on it.

**Verified.** tsc clean; eslint clean on my files (require() warnings in the new tests match the
existing pattern); prettier on my files; my 15 suites 115/115; whole suite 2520/2522, the two
failures in settings.test (passes alone) and loan-schedule-languages (Drew's, in progress).
