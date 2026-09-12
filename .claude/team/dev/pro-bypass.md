# Dev-only Pro bypass

**Enable on the simulator:** open Settings → Developer → **Fake Pro** and turn it on (the row only
exists in a debug build); every `useProGate` screen — Appearance, Insights, Splits, Loan calculator,
Loan schedule — opens immediately, no rebuild and no sign-out needed, and the choice is remembered
under the AsyncStorage key `skip.dev.proBypass`. To start already bypassed instead, put
`EXPO_PUBLIC_PRO_BYPASS=1` in `.env.local` and restart Metro. Either way the console prints a loud
`PRO BYPASS IS ON` warning, nothing is purchased, and the server still sees a free account.

**Confirm it is off in Release:** `__DEV__` is `false` in every non-Debug bundle, so the switch, the
key and the env var are all inert there — proved by exporting a production bundle with
`EXPO_PUBLIC_PRO_BYPASS=1` set (`npx expo export --platform ios --no-bytecode`) and grepping it: the
whole module compiles to `proBypassActive(){return false}`, the strings `Fake Pro`,
`PRO BYPASS IS ON` and `EXPO_PUBLIC_PRO_BYPASS` do not appear at all, and `src/lib/pro-bypass.test.ts`
fails if any of that stops being true.
