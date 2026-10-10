# Add a bill, first page + bill icons everywhere: CEO brief (2026-10-09)

Designs: `.claude/team/design/reference/add-bill/add-bill-{light,dark}.png`; 10 light/dark icon pairs
(`<name>-icon.svg` / `<name>-dark-icon.svg`) in the same folder (originals `~/Desktop/updated gradient icons/Add bill icons/`).

## Founder decisions (final)
1. **The grid (10 tiles, 2 columns), in this order, with these words:** Housing "Rent, mortgage, HOA" · Electricity & Gas
   "Power, heating, gas" · Water & Waste "Water, sewer, trash" · Internet "Broadband and Wi-Fi" · Mobile Phone "Plans and
   devices" · Insurance "Car, health, home, life" · Transportation "Fuel, transit, tolls" · **Health & Medical** "Doctor,
   dental, meds" (NEW id `health`) · **Education** "Tuition and courses" (NEW id `education`) · Other "Anything else".
   Header "Add a bill" with back and close; title "What's this bill for?"; subtitle "Pick one. You can change it later."
   Tiles: gradient icon top left, name, hint; selected = plum border + soft plum fill + a filled check badge top right.
2. **Tap goes straight on** (no Continue button, despite the design); coming Back shows the tile still selected.
3. **Loans & Credit and Family & Healthcare leave the picker.** `loans` stays valid for loan bills (save_loan) and old ones,
   never offered for new bills (loans come from the Loans page). **Existing `family` bills move to `health`** (data
   migration on live, Founder-approved after review). Keep the `family` row in `bill_categories` so older app builds
   that still offer it don't fail on save; the new app maps any `family` bill to Health & Medical for display.
4. **The new gradient icons are used everywhere bills appear** (bill rows, bill pages, Home, Activity, Bills list,
   card activity, Change logo, Insights): the category's gradient icon in place of today's plum line glyph, light/dark
   by the theme. Loan bills keep their loan-type icon (`icon_id = 'loan-<type>'`); a bill with a brand logo keeps the logo.
   Flatten `xlink:href` gradients in the copies; check dark pairs for the navy stops (apply the navy → blue swap if a dark
   copy came through unchanged).

## Split
- **Diego:** migration `20261009100009_bill_categories_health_education.sql`: insert `health` and `education` into
  `bill_categories` (same columns/sort style as the others), update `bills` set `category_id = 'health'` where
  `category_id = 'family'`; re-run safe. Grep the app and SQL for the old ids (`family`, `loans`) in parsers (voice),
  insights, logo-service category maps and reports; tell Dana what changes. No push: the CEO pushes after review.
- **Dana L:** the picker page in `src/app/add-bill.tsx`, the categories data (`src/data/bill-categories.ts`) and the
  icon registry; BillMark/BillRow and every bill renderer use the new icons; en/es/fr; tests; guards; tsc.
