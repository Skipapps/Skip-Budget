# Wave 2, agent A (Dana): auth, onboarding, home, pro

## 2026-10-07, Dana

**Outcome.** Done. Every line a person reads or hears on the sign-in, sign-up, code and password
pages, the welcome pitch, the tour and the walk-in, Home and its cards, and the Pro page and
feature explainer goes through t(), with Spanish (Mexico, tú) and French (Canada, tu) beside the
English. Amounts go through formatCurrency, the spent share through percent().

**Files changed.** src/app/: (tabs)/home, account-offer, auth, avatar, forgot-password, hello,
login, pro-feature, pro, reset-password, setup, setup-bills, setup-subscriptions, signup, tour,
verify-otp, welcome, what-skip-can-do. src/components/: dashboard/{balance-summary,
dashboard-header, date-selector, destination-list, getting-started-card, insight-banner,
quick-actions, tool-cards}, setup/setup-collection. Messages: auth (39 keys), onboarding (55),
home (49), pro (+36). index.tsx, pro-gate.tsx and transaction-row.tsx have no words of their own.

**Decisions.**
- Sentences with a bold word or a link inside (welcome, code page, login agreement) are one
  message cut around the token, never glued fragments.
- SetupCollection takes `addLabel` / `addAnotherLabel` instead of a `noun` it glued into
  "Add a …".
- Home words the "Where it goes" tiles by id; data/dashboard-mock stays as stored values.
- BalanceSummary's fit-slot ids are fixed ("Income", "Expenses") so they do not move with the
  language.
- Pro prices: the store's priceString with the period from pro.price.*, else proMonthlyLabel() /
  proYearlyLabel(); "per month" on the yearly card is the store's pricePerMonthString, else $1.67.
  pro-feature now reads useProPrices() too.
- No large-text counts changed in any of these files.

**Deliberate English changes.** "1 days left" now reads "1 day left" (balance-summary.test regex
widened to `/days? left|Last day/`). The Pro page's fallback price read "$19.99/yr/yr" and
"$1.99/mo/mo" (the label already carried its period); it now reads "$19.99/yr" and "$1.99/mo".

**Tests.** New: src/__tests__/app/{auth,onboarding,home,pro}-languages.test.tsx,
src/__tests__/components/dashboard-languages.test.tsx.
