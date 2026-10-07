## 2026-10-07 — Drew (Developer, money maths) — wave 2: loan, salary, amount entry

**Outcome:** Done in the `i18n-currency-language` worktree, nothing committed. The loan calculator,
schedule, save-loan, salary page, the calculator parts and the whole amount-entry stack now speak
Spanish (MX, tú) and French (CA, tu). Every figure goes through formatCurrency / percent /
compactMoney. `src/lib/loan.ts` is untouched; the real-statement fixture in `src/lib/loan.test.ts`
passes unchanged. tsc 0; eslint clean (cache cleared); prettier on my files only.

**Amount entry:** the draft stays ASCII with "." from keypad to parser in every language. Only the
drawing changed: `displayAmount` groups with `numberMarks()` ("1 234,56" with U+00A0 in French),
the currency mark sits on `currencyMark()`'s side, and the French "$"/"%" after the figure is set
apart by a margin equal to Montserrat Bold's no-break space (0.283em, measured from the TTF). The
keypad's decimal key keeps its identity '.' and is drawn and labelled with the language's mark. Band
widths re-checked for French: the widest string in each band still fits 327pt with the gap.
CalculatorPad works on ASCII strings, so 20.15 ÷ 2 posts 10.08 in every language. RollingNumber
needed no logic change; its doc and a test pin the comma, both no-break spaces and the trailing mark
as still faces. FlowChart's hand-built `$…k` is now compactMoney (English output identical).

**Loan text:** `formatTerm` (English, tested in loan.test.ts) gets a localized twin `loanTermText`
in `components/calculators/schedule-card.tsx`, equal to formatTerm in English for 0–480 months.
`loanRateText` writes a rate to exactly the decimals it was given (English equals `${rate}%`).
`${rate.toFixed(2)}%` and the APR became percent(x, 2).

**Keys:** 89 loan.*, 44 salary.* (amount-entry keys live under loan.* because the key prefix must
match the area I own). English unchanged character for character.

**Tests added (6 suites, 85 tests):** amount entry in en/es/fr (typing 1234.56 → "1,234.56" /
"1 234,56" with U+00A0, identical "1234.56" handed back; calculator 20.15 ÷ 2 = 10.08 in every
language), loan parts, and the four screens. The schedule test runs the real statement's terms in
en/USD, es/MXN, fr/CAD, en/GBP, fr/GBP: every row is the engine's row to the cent and every figure on
the page is the same cents in all five. Text queries fold U+00A0 into a space by default, so the
tests compare raw characters (identity normalizer); a probe proved the default would pass a plain space.

**Whole suite (once, at the end):** 179 suites, 176 passed, 3 failed; 2,540 tests, 2,537 passed. The
three are other areas mid-edit: two voice suites on bill-category names, and add-bill-i18n, which
passes on its own.

**Raised, not changed:** The schedule row and year-header lines run longer in French and wrap. Calculator "AC"
is read as letters in every language.

**Follow-up (CEO approved):** English now says "1 payment" / "1 day" at a count of one; two or more
unchanged. Five messages: calculator summary, the calculator's "First payment covers N days", schedule
card ("see the 1 payment"), save-loan term row, schedule row spoken label (with and without extra). No
existing test pinned the old wording; singular and plural pinned in loan-parts-languages and
loan-schedule-languages. The CEO removed the AmountPad title's one-line limit; left as is. Whole suite:
179/179 suites, 2,572/2,572 tests.
