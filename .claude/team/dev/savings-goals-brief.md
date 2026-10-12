# Savings & Goals: CEO brief (2026-10-11)

Founder designs (6), in `.claude/team/design/reference/savings-goals/`:
`1-savings.png`, `2-month-detail.png`, `3-send-to-goals.png`, `4-sent.png`, `5-wrap-up.png`, `6-goals.png`.
"Follow the design and make modifications if required." Savings has been a "fresh start" placeholder since
2026-10-08 (`src/app/savings.tsx`); this replaces it and builds Goals (the Cards tab tile says "Coming soon").

## How it works (Founder)
- When a month ends, on the 1st, the person gets a **month wrap-up**: what came in last month, what went out, and
  the left over. The left over **goes to Savings by default**.
- From Savings they can send money to any **goal** they created. No goals → invite them to create one, or just
  leave it in Savings.
- On Savings they have **full control**: edit any month's amount, remove a month from savings, and **add savings
  that are not income or spending** (a gift, cash found, anything).
- **Goals page** from design 6. Creating a goal follows **the same kind of flow as creating a loan** (calculator
  page → save page with a type grid → land on the list with a toast).
- **Gradient icons everywhere, with proper light and dark pairs.**

## Founder answers (2026-10-11)
1. **Overspent month** (left over ≤ 0): **nothing moves.** The wrap-up says kindly "You spent $X more than you
   earned"; Savings is untouched; By month lists the month as "Overspent" with $0 moved.
2. **Past months: fill them in.** Every finished month since the person started using Skip (max 12) is worked out
   and moved to savings as Ready. Never a month before the account existed (the old 0006 lesson: a savings page
   that invents a past is not a record). Only the most recent month gets a wrap-up page; older filled-in months
   arrive already "seen".
3. **All free.** Wrap-ups, savings, sending, any number of goals. No Pro gate anywhere in this feature.
4. **Notification + page.** A local notification on the 1st at 9:00 ("Your September wrap-up is ready"), and the
   full wrap-up page shows the first time they open Skip that month.

## Money rules (Drew): pure, cent-exact, `src/lib/savings.ts` + `src/lib/goals.ts`
- **Earned** for a month = pay that landed in it (recorded `pay_received` rows dated in the month; for the month in
  progress, recorded pay plus what the sweep has not recorded yet up to today, exactly as Home counts pay).
  **Spent** = receipts + bill and subscription charges (loan bills included) dated in the month.
  **Not counted:** card payments, moves between the person's accounts, "Add money" / "New money".
  **Left over** = Earned − Spent. One rule, shared by the wrap-up, the closed month and "October so far".
  Nothing dated before the account was created counts; the account's first month counts from that day.
  Check `recordDuePay` (src/api/pay.ts): pay recorded "at the salary's amount on the first run" may predate the
  account. Document the rule you pick in one line and prove it on the demo account's shape.
- **Moving:** left over > 0 → a month pot of that amount, status Ready. ≤ 0 → a month row with $0 moved,
  "Overspent". Figures are frozen when the month closes (a raise today must not rewrite September).
- **Ready to use** = Σ pots (months kept + added savings) − Σ money in goals that came from savings. Never < 0.
- **Which pot money leaves:** oldest first (by month / added date). Each pot's status is derived, not stored:
  **Ready** (nothing sent), **"$X left"** (part sent), **Sent to goals** (all sent), **Overspent**.
  The Send page header lists pots with money left: "September $640 · July $210".
- **Edit / remove a pot** is refused when Σ pots would drop below what is already in goals
  ("$X of this is already in your goals. Take it out of a goal first.").
- **Goals:** saved = already-saved-at-start + Σ sent − Σ taken back. Whole percent, never 100% while short.
  Done when saved ≥ target → Completed, "reached Aug 2026" = month of the send that crossed it.
  "About $37 a week to get there" = (target − saved) ÷ weeks to the target date, **rounded up to whole dollars**
  (following it gets you there). Date passed and short → "Target date passed · $X to go". No date → no line.
- **Send page amounts:** total ≤ Ready to use; each goal ≤ what it still needs ("Fill goal" = that, capped by what
  is left). Stepper ±$10, "+$50" chip, tap the amount to type cents. **Split evenly** = available ÷ active goals in
  cents, each capped at its need, leftover cents to the first goal, overflow re-split among goals still short.
- Fixtures: the design's numbers (Sep 3,700 − 3,060 = 640; Aug 520; Jul 410 with 210 left; send 400 + 300 from
  850 leaves 150; Trip 300→700 of 1,200; Emergency 420→720 of 1,000; goals total 720 of 2,200).

## Data (Diego): migration `20261011100001_savings_goals.sql`, hooks in `src/api/savings.ts` + `src/api/goals.ts`
Leave the old `monthly_savings` table and its functions alone (old maths; already unhooked). New:
- `savings_pots`: id, user_id, kind `'month' | 'added'`, month (first of month, kind month only), label (added only,
  ≤ 60), earned / spent (frozen, month only), amount (moved; editable; ≥ 0), added_on date, note (≤ 200),
  wrap_up_seen_at, removed_at (soft: a removed month is never re-created by closing), created_at.
  Unique (user_id, month) for kind month, removed rows included.
- `goals`: id, user_id, name (≤ 40), icon_id, target (> 0), target_date (nullable), start_amount (≥ 0),
  created_at.
- `goal_moves`: id, user_id, goal_id (FK **on delete cascade**, so deleting a goal returns its money to
  savings), amount (+ to the goal, − back to savings), batch_id, created_at.
- RPCs (security definer or invoker + RLS, anon revoked, **explicit GRANT EXECUTE to authenticated**: new functions
  are not exposed by default after 2026-10-30):
  - `close_savings_month(p_month, p_earned, p_spent, p_seen)`: insert-if-absent; refuses the current or a future
    month and months before the account existed; computes amount = greatest(earned − spent, 0) server-side.
    The client computes earned/spent with Drew's function **after the sweep** (src/api/refresh.ts) from fresh
    reads, so there is one maths rule.
  - `send_to_goals(p_items jsonb)` → batch id: atomic, re-checks Ready to use and each goal's need in SQL,
    goals must be the caller's.
  - `take_from_goal(p_goal, p_amount)`, `save_savings_pot(...)` (add / edit, enforces the Σ rule),
    `remove_savings_pot(p_id)`, `save_goal(...)`, `delete_goal(p_id)`, `mark_wrap_up_seen(p_month)`.
- RLS own rows on all three tables. Checks in `supabase/checks/savings_goals.sql`.
- **Realtime:** do not add these tables to the shared `skip:<user>` channel unless a missing table cannot break
  the channel (Dmitri's receipt-books note); fall back cleanly on PGRST205 / 42P01 everywhere ("no savings yet").
- Hooks: `useSavings()` (pots + moves + Drew's derived figures + "so far"), `useGoals()`, `useGoal(id)`, mutations
  invalidating both. **Do not push the migration.** The CEO asks the Founder first.

## Icons (Dana, first)
Copy into `assets/gradient-icons/` with every gradient flattened (react-native-svg ignores href chains) and a dark
twin (lift navy: #273a9b/#202f65/#021e2f → #6274D4/#4F5FB0/#3E4C93; check the Vol-2 files' own navy hexes):
from `~/Desktop/Gradient-Icons-Vol-2-SVG/`: `blue-globe-planet-global-icon.svg` (Trip, as designed),
`home-security-safety-protection-icon.svg` (Emergency fund, as designed), `award-medal-badge-icon.svg` (the medal
on the wrap-up and on completed goals). Already in the app: `savings` (pig), `goals` (target, Goals summary).
**Goal types** (`src/data/goal-types.ts`, stored as `goals.icon_id`), 12 tiles, 4 × 3 like the loan type grid:
Trip (globe), Emergency fund (shield-house), Home (loan-type-home), Car (loan-type-car), Education
(bill-education), Wedding (book-wedding), Phone & gadgets (bill-mobile), Gifts (book-gifts), Health (bill-health),
Family & kids (book-kids-family), Pets (book-pets), Other (goals target). Founder may swap any of these later.

## Screens (Dana), from the designs; full pages only, CTAs in `Screen`'s footer
1. **`/savings`** (design 1): "Ready to use" card (pig, $850 with smaller cents, "What's left after each month
   moves here.", Send to my goals; hidden at $0). "{Month} so far · In progress" card ("Earned · Spent", "Moves to
   savings on 1 Nov"; overspending so far reads "Over by $X so far"). "By month" grouped by year, year on the
   right; rows: month, "Earned $ · Spent $", amount, status pill; added savings rows sit in the same list by date
   ("Birthday gift" / "Added 3 Oct"). **Modification:** header "+" = Add to savings. New account: $0.00 card with
   "Your first wrap-up arrives on 1 Nov".
2. **Month detail** `/savings-pot/[id]` (design 2), title "September 2026", header pencil: Left over + status pill +
   "Moved to savings on 1 Oct"; Earned / Spent / Left over; "Where your $3,700 went" bar (Spent % / Left over %);
   status card (Waiting in savings / "$210 left in savings · $430 went to your goals" / All sent to goals); footer
   Send to my goals + Keep it in savings (back). Overspent: "You spent $X more than you earned", no send. Added
   pot: title = its label, "Added on 3 Oct", no Earned/Spent block.
3. **Add / edit savings** `/savings-entry` (new = name, amount, date; edit of a month = amount + note; edit page has
   "Remove from savings" with a confirm). Toasts: "Added to savings", "Savings updated", red "Removed from savings".
4. **Send to goals** `/send-to-goals` (design 3, optional `goal` param to preselect) → **Sent** `/goals-sent`
   (design 4): Done (back to where the flow began, via the finish-flow helper) / View goals. No goals: the page
   invites "Create a goal and start collecting for it" with New goal, and Keep it in savings.
5. **Wrap-up** `/wrap-up?month=2026-09` (design 5): close X, confetti, pig + medal badge, "SEPTEMBER WRAP-UP",
   "Congrats, you saved $640!", earned / spent / "Moving to savings", Send to my goals / Maybe later. Overspent
   variant: no confetti, "You spent $X more than you earned", "Nothing moved to savings. October is a fresh start.",
   one "Got it". Marks seen when shown. Shown once on the first open after the sweep closes the month (from the
   root layout / Home, not over auth or setup screens).
6. **Goals** `/goals` (design 6): header "+"; summary (target icon, "Saved toward goals $720.00 of $2,200",
   "2 active · 1 done"); Active cards (icon, name, "by Mar 2027", %, "$300 of $1,200", bar, weekly line);
   Completed (medal, muted, check, "$600 · reached Aug 2026"); "+ New goal" dashed button; empty invitation.
7. **New goal**, loan-style: `/goal-calculator` (target amount with the curved slider like the loan amount, "By
   when" month picker, optional "Already saved", result card "About $37 a week · $160 a month") → `/save-goal`
   (name + 12-tile goal type grid) → lands on `/goals` with toast "Goal added" (back must not reopen the flow).
8. **Goal detail** `/goal/[id]` (**modification**, not designed): icon, name, by date, "$700 of $1,200", bar, %,
   weekly line, list of moves ("+$400 from savings · 11 Oct"); footer "Add from savings" (→ send page, preselected)
   and "Take money out" (amount → back to savings); header pencil → edit name / type / target / date and
   **Delete goal** (confirm says "$700 goes back to your savings").
9. **Cards tab Money tiles:** Savings shows the Ready to use figure (note "Ready to use"); Goals goes live: none →
   pill "Add a goal" + "Save for something", else "{n} active" + names → `/goals`.

## Notification (Dilip)
Local notification for the 1st of next month at 9:00 local, re-scheduled on every app open (one pending, stable
id): "Your {Month} wrap-up is ready" / "See how {Month} went." Tap → `/wrap-up?month=`. Never prompts for
permission on its own; skip silently without it. If Settings → Notifications has per-kind switches, add "Monthly
wrap-up" (on by default).

## Rules for everyone
Light/dark (gradient pairs via `useGradientIcons`-style hook), large text (figures never cut, CTAs pinned in the
footer), en/es/fr, a toast after every save/send/remove (`toast.*` keys in 3 languages), the one failure message,
comment-only-the-why, tests under `src/__tests__/` or next to lib files (never in `src/app`), no commits, no
`db push`. Own your files: Drew `src/lib/savings*.ts`, `src/lib/goals*.ts`; Diego `supabase/**`,
`src/api/savings.ts`, `src/api/goals.ts`, refresh.ts close step; Dana screens, components, icons, i18n, cards.tsx;
Dilip notification files + app.json if needed.
