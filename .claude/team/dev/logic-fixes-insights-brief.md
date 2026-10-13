# Logic fixes + Insights v2 — CEO brief (2026-10-13)

The Founder sent six problems at once, with screenshots, and asked that they be split into small parts,
built properly with no bugs, then committed, pushed and installed on the 13 Pro Max once every other
session is done.

Screenshots:
- Problems: `.claude/team/design/reference/logic-fixes-2026-10-13/` (1 card page, 2–3 add loan, 4 pro explainer, 5 habit failure)
- Insights design: `.claude/team/design/reference/insights-v2/` (1 dark month, 2 light month, 3 light year, 4 Choose month)

## Shared tree: other sessions are live (read before touching anything)

Six other Claude sessions share this working tree. Edit ONLY the paths listed under each part.

**Never touch:**
- **Quick add session:** `src/app/{receipts,notifications}.tsx`, `src/app/(tabs)/cards.tsx`, `src/components/cards/money-tile.tsx`, `src/components/dashboard/**`, `src/theme/home-icons.ts`, `src/i18n/messages/{home,cards,reminders}.ts` and their tests. Two exceptions are agreed with them; see part 4.
- **Add bill retry session:** `src/app/add-bill.tsx`, `src/__tests__/app/add-bill-save.test.tsx`
- **Month-end drift session** (works in `.claude/worktrees/clever-lehmann-57d6b2`):
  - `src/lib/{date,payday,pay,card-ledger,charges,bill-month,month-step}.ts`
  - `src/api/{queries,charges,savings,refresh,pay,anchor-day}.ts`
  - migrations `2026101330000N`
  - `save_loan` and `update_loan`: do NOT recreate either without telling the CEO first.
- **Ask Sam session:** `src/lib/ask-sam/**`, `src/components/ask-sam/**`, `scripts/ask-sam/**`
- **Bills/subs (committed):**
  - Its payment-history pieces may be READ and imported, but never edited: `src/lib/payment-years.ts`, `src/components/payments/*`, `src/api/payment-labels.ts`.
  - If a prop needs to change, ask the CEO.

**House rules:**
- Migrations, if any, use `2026101340000N`.
- Tests never go under `src/app`.
- Mutation testing only on scratch COPIES in a per-agent scratchpad folder, never on real `src/` files.
- Every failure says `failureMessage()` / `failureText()` ([[one-failure-message]]).
- No sheets or popovers: every step is a full page.
- Toast after every add/edit/delete.
- Money is cent-exact.
- Every string gets en/es/fr in the area's messages file (`.claude/team/dev/i18n-playbook.md`).

## Part 1 — Card/account page: transactions grouped by month

**Where:** `src/app/source/[id].tsx` (the page in screenshot 1), plus new files under `src/components/cards/source-*` and keys in `src/i18n/messages/accounts.ts`.

**Problem:** the Transactions list runs every month together (Oct and Sep rows mixed, no break).

**CEO default:**
- Group the list into month sections, newest first, the same way Payment history groups months.
- Reuse its pure grouping helpers (`monthGroups` in `src/lib/payment-years.ts`) and section-header look where they fit.
- Each header shows the month ("October 2026", with no year for the current year if Payment history does that) and that month's net change for this card or account. Dana and Dmitri pick in/out vs net to match Payment history.
- Search and the filter keep working: filter first, then group.
- Months with no rows are not shown.
- The free 90-day window still applies (HistoryNotice).
- The balance card at the top is unchanged.

## Part 2+3 — Add loan: the first payment date

**Problem (screenshots 2–3):**
- With a start date of 30 Nov 2025, the details step shows "First payment 30 Dec 2025" and a strip of payment-day chips.
- The Founder asks how someone whose first payment is **14 Jan** would set that, because the default reads as "next month only".
- Tapping 15 then shows "First payment 15 Jan 2026" (the F4 rule: a day before the start day jumps a month), which "doesn't make any sense to the user".

**CEO decision:** let people pick the first payment DATE directly.
- Replace the payment-day chip strip (`DayStrip` in `src/components/loans/add/loan-details-view.tsx`) with a **"First payment"** date field, built like the Start date field (same full-page date picker).
- Default: one month after the start date, on the start date's day (month-end clamp, anchored).
- Under it, one muted line: "Then every month on the 14th" (localised ordinal or "day 14", whatever the i18n layer supports).
- **Allowed:**
  - Any date after the start date.
  - `loanReview` already refuses a first payment that isn't after the start ('startDate'); keep that.
  - Upper bound: Drew proposes one, e.g. ≤ 12 months after the start.
- **Payment day:**
  - It comes from the picked date.
  - **Month-end ambiguity (Loans and month-end sessions both flagged this):** a pick on the last day of a month shorter than 31 days, e.g. 28 Feb or 30 Apr, could mean "the 28th" or "month end".
  - In that case only, show two choice chips under the field: "On the 28th" / "Last day of each month".
  - The default matches the start date's day when the date is the untouched default; otherwise it is the literal day.
  - The stored `payment_day` (31 for month end) feeds the engine exactly as today: `save.paymentDay` is null unless the first payment's day differs from the anchor.
- **F4:** the rule in `src/lib/loan-first-payment.ts` stays only as the DEFAULT generator, or is replaced by "start + 1 month". Drew decides.
  - Update its tests and `.claude/team/dev/add-loan-plan.md` with a line saying the Founder replaced the chips on 2026-10-13.
- **Every pre-fill path must keep working:**
  - Calculator hand-off: `loanFormFromCalculator` in `src/components/loans/add/loan-form.ts`, `route.paymentDay`.
  - Edit mode: `loanFormFromSaved` must show the saved first payment, and an edit that changes nothing must save nothing.
  - `/loan-schedule` and Review's schedule link pass `day` through `src/lib/loan-route.ts`.
  - Review page figures.
- **The real-lender fixture in `src/lib/loan.test.ts` must not move.**
  - Add fixtures: a first payment 15 days after funding, one 45 days after, and a 31 Jan start with month-end.
  - For each, check the first-period interest is what the engine already does for `funded_on` → first payment, and say what that is.
- **No migration expected:** `first_payment_on` / `payment_day` already flow through `save_loan` / `update_loan`. If one IS needed, stop and tell the CEO (month-end session conflict).
- **Paths:**
  - `src/app/add-loan.tsx`
  - `src/components/loans/add/**`
  - `src/lib/{loan-review,loan-first-payment,loan-route}.ts` (+ `loan.ts` only if unavoidable)
  - `src/i18n/messages/loan-flow.ts`
  - tests `src/__tests__/app/add-loan*.test.tsx`, `src/__tests__/components/add-loan-form.test.ts`, `src/lib/loan-*.test.ts`

## Part 4 — After buying Pro, go straight into the feature

**Problem (screenshot 4):**
- The flow: tap Voice (free) → `/pro-feature?id=voice` → Get Skip Pro → `/pro` → purchase → `goBack()` lands on the explainer again.
- The person must go back and open Voice a second time. The Founder says it happens "everywhere" and feels like a glitch.

**CEO decision:** the explainer never shows to someone who has Pro.
- `/pro-feature` takes an optional `next` param (an href string). When it is focused and `usePro().pro` is true:
  - with `next`: `router.replace(next)`;
  - otherwise: `router.back()`, which returns to the page that asked (e.g. the habit form mid-save, add-receipt mid-scan, payment history).
- Use `useIsFocused` so nothing fires while `/pro` or `/pro-offer` is on top.
- Default `next` per feature lives in `src/data/pro-features.ts`, e.g. voice → `/voice`, insights → `/insights`. Keep the `export` explainer and its test (Bills session asked).
- Callers pass `next` where the person was trying to OPEN something:
  - `src/components/voice/voice-fab.tsx` → `/voice`
  - `src/app/habits.tsx:76` → `/habit-new`
  - `src/components/dashboard/tool-cards.tsx:36` → `/habits`
  - `src/app/(tabs)/cards.tsx:222/244/276/294` → `/add-card` or `/add-account` per line
  - `src/components/pro/pro-gate.tsx` Redirect → its own route
  - `src/app/add-card.tsx:65` → `/add-card`
  - `src/app/add-account.tsx:110` → `/add-account`
  - `src/app/add-receipt.tsx` and `src/app/receipts.tsx` scan gates: decide per call; mid-flow gates stay on back().
  - `src/components/payments/use-export.ts`: export → the export page.
  - `src/components/payments/pro-footer.tsx` and `src/components/pro/history-notice.tsx` (history): back().
  - `src/app/voice-review.tsx:334`: read it first.
  - `src/app/habit-new.tsx:416` is mid-save: back() to the filled form. It must then save without a second "Something went wrong"; see part 5.
- **Agreed with the Quick add session:**
  - We may add `next` to cards.tsx 222/244/276/294 and tool-cards.tsx:36 now, those lines only.
  - Tests pinning those objects need the same one-line update: `src/components/dashboard/tool-cards.test.tsx`, `src/__tests__/habits/habit-card.test.tsx`, `src/__tests__/app/cards.test.tsx`, `src/__tests__/app/home.test.tsx`.
  - Those files hold the Quick add session's other uncommitted edits. Change ONLY your lines, and list every hunk you touched in your report.
- Restore on `/pro` and a purchase on `/pro-offer` must reach the same end state.
- `/pro` opened from Settings, with no explainer underneath, behaves as today.

## Part 5 — "Something went wrong": find the real causes

**Founder:** "Sometimes some of the things say something went wrong, why. Is there any problem with code or supabase … I want the app to perform quick and fast with no bugs."

**Lead (screenshot 5):**
- New habit, Paid with = card "Hh", "Start tracking" → failure line.
- `habit-new.tsx` shows the failure when the DB's Pro wall refuses and the app thinks the person has Pro (`refusedForPro && pro`).
- The Founder had just bought Pro (sandbox), so the likely cause: the SDK says Pro before the RevenueCat webhook has written `entitlements`, so `is_pro()` is still false for a while. Sandbox subscriptions also expire after a few renewals.
- **Prove or disprove before fixing.**

**Known false failures to check (CEO saw these in code):**
- `habit-new.tsx` save and delete show `failureText()` when `pastDays` hasn't finished loading. That is a "not ready yet", not a failure.
- The same pattern likely sits in every past-choice caller: bills, subs, loans, salary.

**Ask:**
1. Audit every place the failure line can appear without a thrown cause, or from a cause that is really "not ready / retry would succeed".
2. Rank the causes by how often a normal person hits them.
3. Fix the clear ones:
   - await the read instead of failing;
   - after a purchase, wait for the server to agree before a Pro write, e.g. poll an `is_pro` read for up to ~10 s with "One moment", or retry once, then save;
   - make writes idempotent where a retry can double-file. The Add bill session flagged that a create succeeding on the server but throwing on the client still double-inserts; scope the fix, client-generated ids or similar.
4. Report what needs the Founder (deploys, RevenueCat/Sentry settings).
- **Speed:** name the slowest screens and queries, e.g. waterfalls, refetch storms, missing indexes, with evidence. Fix only what is safe and small.
- **Sentry:** the org:ci token cannot read issues (403 is expected). Say whether the Founder should look at Sentry or make a read token, and which issues to look at.
- **Paths:** to be agreed per fix with the CEO. Avoid the month-end session's `src/api/*` files.

## Part 6 — Insights v2 (Founder's full design)

**Design:** `.claude/team/design/reference/insights-v2/`, light + dark, Month view, Year view, Choose month. Back arrow; title "Insights".

**Sections, in this order:**
1. **Plum hero:**
   - "Left this month $X"; "$in in · $out out"; "You've spent N% of your income so far."
   - Always the CURRENT month, whatever period is picked below.
   - in = pay due this calendar month, recorded or scheduled, plus one-offs landed this month.
   - out = spending recorded so far this month (the same figure as "What goes out" for this month).
   - left = in − out; can go negative (say "over" in that case, Drew + copy).
   - No income: hide the % line.
2. **What comes in · "Money you receive"**: salary rows, as today ("Every month · 1 source"). See all → /salary.
3. **What goes out · "Money you spend in this period"**:
   - Segmented control. Month mode = [Oct 2026 ▾][Year]; Year mode = [Month][2026 ▾]. The selected side is plum.
   - Tapping the selected side's chevron opens **Choose month** (screenshot 4) or **Choose year**, full pages.
   - Choose month lists, under year headings, newest first, ONLY months with any recorded money, plus the current month; tick on the selected month.
   - **Card:**
     - "This month" / "This year", or the month name when not current.
     - Total and bar chart: Month = day buckets 1–3 / 4–10 / 11–17 / 18–24 / 25–31, as today; Year = J…D.
     - The selected or current month's bar is dark plum, the others light; compact labels on bars with money.
     - Rows: Shop receipts / Bills / Subscriptions with amounts, then "Recorded in this period".
4. **Where it goes · "Spending by category"**: category rows with bars, for the period.
5. **Where you spend most · "Places you pay most often"**: merchants with logo, bar and "N times", for the period.
6. **What you owe:**
   - Cards owed, as today's owe section. Avatar = card face colour / initial.
   - Subtitle "Money you owe on cards"; the design's "to people" is a mock leftover, since Splits left the app.
7. **Loans · "Money you owe on loans":**
   - Total you owe, N loans, bar "X% paid off".
   - A row per loan: "Car loan · next 27 Oct" and its payment.
   - "Monthly payments" total.
   - Reuse the Loans page summary maths (`src/lib/active-loans.ts` and friends) so both pages agree to the cent. Rows open `/loan/[id]`.
8. **Bills & subscriptions · "What you pay every month":**
   - "Bills · 4" monthly total and "Subscriptions · 3" monthly total, using the same figures as the Monthly bills / Subscriptions pages.
   - "Next due": the next 2 by date with logos.
   - Rows open /bills, /subscriptions and the item pages.
9. **Coming up · "Regular costs ahead"**: Subscriptions $X/mo, $Y over a year, as today.
10. **Habits · "What you saved by skipping":**
    - Per habit: "Skipped N times this week" and that week's saving.
    - "Saved so far" all-time.
    - Same rules as the habit cards (skipped finished days × price).
11. **Goals · "Progress toward what you're saving for":**
    - "Saved toward goals $X of $Y · N active".
    - Per goal: % and "$a of $b".
12. **Savings · "Money set aside":**
    - "Moved this month" (this month's pot) and "Total in savings".
    - "About N% of this month's income".

**Every section:**
- A heading, a muted subtitle and "See all ›" to its own page, where one exists.
- Sections 7, 10, 11 and 12 with no data show one muted line with an action ("No loans yet · Add a loan"), not a hidden gap: the Founder wants everything visible in one place.
- Section-level errors: a failed loans/habits/goals/savings read shows the failure line in THAT card with a retry. The spending figures keep today's rule: no figure until all their sources answered.
- Insights stays Pro (ProGate). Habits figures are fine to show, since Insights is Pro anyway.

**Paths:**
- `src/app/insights.tsx`, new `src/app/insights-month.tsx` + `src/app/insights-year.tsx`, or one route with a param; Dmitri decides.
- New `src/components/insights/**`.
- New `src/lib/insights*.ts`.
- `src/i18n/messages/insights.ts`.
- Tests in `src/__tests__/insights/**`.

**When done:** send the final section list to the Ask Sam session (it owns the `home.insights.*` answers).

## Gates before the CEO
- `npx tsc --noEmit` 0
- `rm -rf .expo/cache/eslint && npx expo lint`: no new findings
- `npx jest --ci --testPathIgnorePatterns .claude/worktrees`: green
- Dmitri GO

## Round plan and round-2 backlog (Founder via Jay, 2026-10-13)

**Round 1** (iPhone, ~3–4 pm EDT; built by the Loans chat): Parts 1–5. Insights v2 is kept unwired: new files only, no route, old tests kept.

**Round 2:**
- **Insights v2:** wiring.
- **Idempotency migrations** (Founder approved; final OK given in chat before applying), numbered 20261013400001..3:
  - `record_loan_payoff` p_id
  - `save_loan` p_id (coordinate with the month-end session)
  - `save_goal` / `save_savings_pot` ids
- **Add bill:** the Add bill chat applies `pastCharges.load()` and the client id itself.
- **Sentry `setUser({ id })`:** Founder said yes, once the Privacy line is approved. `setUser(null)` on sign-out and on account delete.
- **Privacy manifest** (Dilip): app.json `ios.privacyManifests` plus the generated PrivacyInfo.xcprivacy, matching the App Store label. Data types: User ID, Purchase History, Crash Data, diagnostics, Email, financial info.
- **Terms line** (Dana): "By continuing you agree…" on signup.tsx and auth.tsx, as on login.tsx.
- **Month-end session's files, after they commit:** sweep parallelism (refresh.ts), unpaged reads past 1,000 rows, and `subscribed: isFocused`.
- **Later:** a Sentry read token, and RevenueCat REST verification in the webhook (needs an RC secret key).
- **Round 2: a failed background reload must not blank the screen** in other pages' hooks: `usePlanMonth` reads (src/api/payment-ledger.ts, Bills session), `useGoals`, and `useSavingsCore` (savings.ts, month-end session). Use the same `isError && data === undefined` rule as the 2026-10-13 Home fix, once the owners agree.
- **Round 2: `useSourceBalances` needs a loading flag** (queries.ts, after month-end commits), so What you owe never shows the typed balance while the real one loads.
- **Round 2 (Dmitri, Part 5 review):**
  - S4: scrub the messages of unhandled errors in `beforeSend`, done together with setUser.
  - RevenueCat REST verification in the webhook, early, to close out-of-order TRANSFERs (needs an RC secret key).
  - `is_pro(uuid)` lets any signed-in user check any uuid. Consider limiting it to `auth.uid()` (migration).
  - Founder: check RevenueCat → Project settings → Restore behaviour = "Transfer to new App User ID", plus the sandbox override toggle.
- **Round 2: Founder-approved via Jay, "All as recommended"**
  - **#32:** a small grey note, "Couldn't refresh · showing your last figures" (wording approved), next to the balance and month figures whenever any part of them failed to refresh.
  - **#33:** the other screens (Bills, Subscriptions, etc.) follow the same rule: keep the last figures and show the note, instead of the error page.
  - **L17:** when Pro ends, extra cards and accounts still open, edit and delete for free; only picking them for NEW spending needs Pro.
    - Today cards.tsx sends taps on locked card/account rows to `/pro-feature?id=unlimited&next=/source/{id}`. Under L17 those rows must open `/source/{id}` directly.
  - **L24:** "Payment went out" notices follow an in-app switch in Skip, or stop when every reminder is off. Today only iOS Settings stops them.
