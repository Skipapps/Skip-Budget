# Wave 2: legal and faq (Mia)

## 2026-10-07 — Mia — privacy, terms, common questions, legal document shell (done)

**Outcome:** The four files now read every word through t(); Spanish (Mexico, "tú") and French
(Canada, "tu") sit beside the English in `src/i18n/messages/legal.ts` (77 keys) and `faq.ts`
(44 keys). English is character for character what it was (checked against HEAD). Nothing committed.

**What changed**
- `src/app/privacy.tsx`, `src/app/terms.tsx`: `SECTIONS` constants became `sections()` functions
  called on render; one message per heading, paragraph, bullet and note, same order.
- `src/components/ui/legal-document.tsx`: "Last updated" through `legal.lastUpdated`; a courtesy
  notice box under it for Spanish and French only (nothing renders in English). No numeric
  maxFontSizeMultiplier added (the box uses TEXT_CAP.reading); the existing 7 stay.
- `src/app/faq.tsx`: `GROUPS` became `faqGroups()`; title, intro, button and the two accessibility
  hints translated. The Pro answer takes `{monthly}` / `{yearly}`: the store's `priceString` from
  `useProPrices()`, else the dollar fallback taken from `proMonthlyLabel()` / `proYearlyLabel()`
  with their "/mo" "/yr" suffix removed (the sentence says "a month" itself).
- Tests: `src/__tests__/app/faq-languages.test.tsx`, `src/__tests__/app/legal.test.tsx`,
  `src/__tests__/components/legal-document.test.tsx`, `src/i18n/legal-faq-messages.test.ts`
  (figures, addresses and names kept; French spacing; no English left). The existing
  `faq.test.tsx` gained one line, a mock of `@/api/pro`, because the screen now reads store prices.

**Left alone on purpose:** the contact route string, the "•" glyph, the voice examples inside
the policy ("Netflix $15.99 every month", "spot a fly"), which stay English with "en inglés" /
"en anglais" added because dictation only understands English.

**Open:** see the report that went with this entry (legal terms for review, clauses that differ
across languages, English issues found).
