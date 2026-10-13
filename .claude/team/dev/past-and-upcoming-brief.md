# Past and upcoming on edit and delete: CEO brief (2026-10-12)

Founder: "when user update or edit loan it needs to ask for future bills or previous too same like bills and for
habit tracker too, old will be saved or removed or edit upcoming or old one too."

## Today
- **Edit a bill / subscription:** when a copied field (name, amount, card/account) changes and the plan has
  charges, `usePastCharges` (`src/api/past-charges.ts`) asks "Change past charges too?" → **Past and upcoming**
  (rewrites every recorded charge) or **Upcoming only**.
- **Edit a loan** (`/add-loan?id=` → `update_loan`): never asks. Past charges keep their copied name/amount/card.
- **Delete** a bill, subscription or loan: one confirm, hard delete; charges (and loan payoffs, reminder) cascade.

## Founder answers (2026-10-12)
1. **Edit loan asks like bills.** When the name, monthly payment or paid-from changes and the loan has recorded
   charges: "Change past payments too?" → **Past and upcoming** / **Upcoming only**. Same look and wording family
   as bills (reuse `usePastCharges('bill', billId)` or its dialog; loan words say "payments").
2. **Delete loan asks: keep past or remove past.**
   - **Keep past payments:** the loan stops today; its recorded payments (and payoffs) stay in spending history;
     it moves to the Loans page's Finished section as "Stopped on {today}" (the existing stopped state).
   - **Remove everything:** as today: the loan, every past payment, payoff and reminder are deleted.
3. **Same delete choice for bills and subscriptions** (and habits, by the habits session): keep past (it stops
   today and leaves the lists of active plans, its past charges stay in history) or remove everything.

## Rules
- One wording family across bills, subscriptions, loans (and habits): the Founder wants it to work one way.
- "Keep past" never deletes or rewrites a recorded charge; nothing after today is charged, projected or reminded.
- Months already wrapped up stay frozen (savings R7): neither choice re-opens a closed month's figures. (Remove
  everything changes history going back, as delete does today; say so in the confirm.)
- en/es/fr, one-failure-message, toasts on every action, comment style, tests under `src/__tests__/`, no commits
  until Dmitri's GO, Founder tests on the 13 Pro Max.
- Habits files belong to the "Spending habits page redesign" session; don't touch them.
