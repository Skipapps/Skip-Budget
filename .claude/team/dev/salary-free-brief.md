# Salary for everyone: CEO brief (2026-10-09)

Founder decisions (final):
1. **Salary is no longer Pro.** Every plan can add as many salary sources as they like. Remove the free
   one-income limit in the app (`FREE_LIMITS.incomeSources` in `src/lib/wall.ts`, the Add source / frequency-change
   gates in `src/app/salary.tsx` that push `/pro-feature?id=unlimited`, and any other client guard) AND in the
   database (the `salary_sources_free_allowance` BEFORE INSERT trigger: drop only that trigger; cards and accounts
   keep their free limits). Founder approved pushing the migration after Dmitri's review.
2. **Remove the "One-off pay" button** from the Salary page. "Just this time" STAYS as a choice in How often, and
   one-off pays already saved stay exactly as they are (counted in their month, editable, deletable; earlier months'
   one-offs still behind their row).
3. **Pro "Unlimited" explainer:** the point "Every income counted" becomes "Move money between accounts"
   (en/es/fr; `pro.unlimited.b`). Check the Pro page's compare rows and FAQ for any "income" / "salary" Pro claim
   and remove it.
4. **Salary page look** (`.claude/team/design/reference/salary/salary-page.png`, the Founder's screenshot): matches
   today's page except the "Total per month" card shows the salary gradient icon (the Cards redesign's light/dark
   pair in `src/theme/gradient-icons.ts`). With One-off pay gone, "+ Add source" is a single full-width pill.
