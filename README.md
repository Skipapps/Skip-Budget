# Skip Budget

A budgeting app for iOS built with Expo (SDK 57), expo-router and NativeWind, on Supabase, with RevenueCat for Pro and Sentry for crash reports.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the public keys
npm run ios                  # builds and launches the development client
npm start                    # Metro only, once a dev client is installed
```

`.env.example` documents every variable. Everything prefixed `EXPO_PUBLIC_` ships inside the app bundle, so never put a secret in it.

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run check        # all four, in order
```

## Layout

| Path                 | What lives there                                                                   |
| -------------------- | ---------------------------------------------------------------------------------- |
| `src/app`            | Screens, one file per route (expo-router). No test files here.                     |
| `src/components`     | Shared UI, grouped by feature.                                                     |
| `src/api`            | Supabase queries and mutations (TanStack Query).                                   |
| `src/lib`            | Pure logic: loan maths, receipt and voice parsing, dates, formatting.              |
| `src/data`           | Static catalogues: bill categories, card networks, glyphs, Pro features.           |
| `src/i18n`           | Languages, currencies and every on-screen string (`messages/`).                    |
| `src/providers`      | App-wide React providers: session, data, realtime, theme, preferences, dialogs.    |
| `src/theme`          | Palette, colours, fonts, artwork and avatar registries.                            |
| `src/__tests__`      | Screen tests and cross-screen suites. Unit tests sit next to the code they cover.  |
| `assets`             | Illustrations, avatars, app icons and the launch video.                            |
| `supabase`           | Migrations, edge functions (Deno, excluded from the app typecheck), seeds, checks. |
| `modules`, `targets` | Native receipt scanner and the notification extensions.                            |
| `plugins`            | Expo config plugin for code signing.                                               |
| `scripts`            | One-off tools: Apple client secret, brand seed, receipt test corpus.               |
