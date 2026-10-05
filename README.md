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

| Path                 | What lives there                                                       |
| -------------------- | ---------------------------------------------------------------------- |
| `src/app`            | Screens, one file per route (expo-router). No test files here.         |
| `src/__tests__`      | Screen tests. Unit tests sit next to the code they cover.              |
| `src/api`            | Supabase queries and mutations (TanStack Query).                       |
| `src/lib`            | Pure logic: loan and split maths, voice parsing, formatting.           |
| `src/components`     | Shared UI, grouped by feature.                                         |
| `src/theme`          | Palette, colours, artwork and avatar registries.                       |
| `assets`             | Illustrations, avatars, app icons and the launch video.                |
| `supabase`           | Migrations and edge functions (Deno, excluded from the app typecheck). |
| `modules`, `targets` | Native receipt scanner and the notification extensions.                |
| `design`             | Wireframe and hi-fi generator used by the design team.                 |
