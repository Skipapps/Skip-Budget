# Home sections redesign: CEO brief (2026-10-09)

Founder request: restyle three Home sections (`src/app/(tabs)/home.tsx`) from their designs
(`.claude/team/design/reference/home-redesign/quick-add.png`, `tools-go-further.png`) with the gradient icons in
`~/Desktop/updated gradient icons/quick add icons/` (copies in the same reference folder): `<name>-icon.svg` (light)
and `<name>-dark-icon.svg` (dark) for receipt, bill, subscription, salary, loan-calculator, spending-habits, insights.

## Founder decisions (final)

1. **Quick add** (`src/components/dashboard/quick-actions.tsx`): four cards, **always 2 × 2 on every screen size
   and text size** (the Founder's rule; no one-column fallback). Each card: gradient icon top left, a round soft-plum
   "+" button top right (decorative; the whole card is the button), the name, and a one-line note under it:
   Receipt "Snap or type it", Bill "Rent, phone, power", Subscription "Netflix, Spotify", Salary "Add a payday".
   At large text the name and note WRAP inside the card (never cut, never shrunk below the app's floor); the cards
   grow taller, row by row, so both cards in a row stay the same height. Routes and VoiceOver hints unchanged.
2. **"Where it goes" becomes "Where your money went"** (en/es/fr), same list layout, figures and "This month"
   caption; the Monthly Bills, Receipts and Subscriptions rows use the bill / receipt / subscription gradient icons
   in place of today's plum outline circles.
3. **"Go further" keeps its heading** (the design's "Tools" was declined). Below it, as designed: Loan calculator
   ("See a monthly cost") and Spending habits ("Spot your patterns") side by side, each a card with its gradient icon
   top left, a chevron top right, the name and the note; Insights ("See the story behind your spending") full width
   under them with the bulb icon, name, note and chevron. Keep today's PRO pill logic (Spending habits: free with no
   habits; Insights: free) and routes.
4. Light and dark: dark icons in dark mode (follow the theme provider's scheme). **subscription-dark-icon.svg came
   through identical to the light one** while it carries the navy stops the others lighten: in the app's dark copy
   replace `#273a9b / #202f65 / #021e2f` with `#6274D4 / #4F5FB0 / #3E4C93` (the Founder's dark rule). receipt's pair
   is identical too, but it has no navy, so it's fine as is. Flatten `xlink:href` gradient chains in the copies
   (react-native-svg ignores them), exactly as `assets/gradient-icons/` did for the Cards icons.

## Constraints

- The Cards redesign is uncommitted and under review: do NOT edit `src/theme/gradient-icons.ts`, `src/components/
  cards/*`, `src/app/(tabs)/cards.tsx`, `add-card.tsx`, `add-account.tsx` or `src/components/flow/*`. Put the Home
  icon registry in its own module (e.g. `src/theme/home-icons.ts`) following the same pattern; new asset files may go
  in `assets/gradient-icons/` (new names only).
- Tests under `src/__tests__/` or next to lib/component files, never `src/app`. en/es/fr. No commits.
