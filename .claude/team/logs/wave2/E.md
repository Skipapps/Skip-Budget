# Wave 2, agent E (Dana): settings, reminders, support, brands

## 2026-10-07, Dana

**Outcome.** Done. All on-screen text in the Settings tab, About, Support, Your money, Reminders, Notifications, Contact, "Why Skip is different", Change logo and the brand components now goes through `t()`. Spanish (Mexico, tú) and French (Canada, tu) sit beside the English. The English is unchanged character for character.

**Messages.** settings.ts has 76 keys, reminders.ts 34, support.ts 38. Brands and logo choices live under `settings.logo.*` / `settings.store.*`. Notifications are under `reminders.news.*`, Contact and "Why Skip is different" under `support.contact.*` / `support.why.*`. Reused: `common.continue/save/done/tryAgain`, `pro.price.monthly/yearly` (for the store price), `api.reminders.*` (through LEAD_OPTIONS and REMINDER_CAPTION).

**Decisions.**
- `plural(count, thing)` in use-money-counts.ts now takes an id (`'card'`, `'bankAccount'`…) and returns `t('settings.count.*', { count })`. The message holds the one/other forms (French: 0 is singular).
- The Settings Pro line takes `{monthly}`/`{yearly}` from `useProPrices()` and falls back to `proMonthlyLabel()`/`proYearlyLabel()`.
- `LOGO_COPY` is now lazy getters. `looksLike` is gone: MatchHeader splits `settings.logo.looksLike` around `{name}`, so the bold name lands where each language puts it.
- PAGES (Settings) and KINDS (Notifications) use lazy labels. Contact's COPY became `copyFor(topic)`.
- `FAILURE_MESSAGE` is replaced by `failureText()` on every screen in my files.
- Stored `account_type` shown raw in Reminders now maps to `reminders.account.checking/savings`, with the English still lower case. Card network stays as stored (a brand name).
- The Spanish time sentences end on the time ("…Hora de envío: 8:00 p. m.") to avoid "p. m.." and the "a la/a las" problem.

**Tests.** I added 7 suites, 45 tests (es and fr render, no raw key, no leftover `{param}`): src/__tests__/app/{settings,reminders,notifications,contact,message,change-logo}-languages.test.tsx and src/__tests__/components/brand-languages.test.tsx.

I changed two existing tests:
- settings.test.tsx: added `useProPrices` to the `@/api/pro` mock. No assertion changed.
- tour.test.tsx: it read support.tsx's source for the literal English subtitle, so it now checks the row uses `support.tourDetail` and that its English counts the stops.

**Left in English on purpose.**
- The `__DEV__`-only Developer section (Fake Pro / Fake Free).
- "Skip Pro" (brand), `example.com` placeholder, `•••• 1234`, `{n} / 4000` counter (digits read the same in all three).
- Announcement titles and bodies (database).

**Not done / not mine.** No lockCapability/authenticate use in my files (only in preferences.tsx and the app-lock gate). No large-text sites added or removed.
