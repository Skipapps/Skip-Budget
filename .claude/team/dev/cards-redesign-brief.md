# Cards page redesign: CEO brief (2026-10-09)

Founder request: a new design for the Cards tab (`src/app/(tabs)/cards.tsx`) from their Figma
(`.claude/team/design/reference/cards-redesign/figma-cards.png`), using the four gradient icons from
`~/Desktop/updated gradient icons` (copies in the same reference folder: salary, savings, loans, goals).
The Founder's design is the approved design; build it as drawn except where this brief says otherwise.

## Founder decisions (final)

1. **No "Net balance" card.** The Founder removed it from the design. The page starts with the title.
2. **Header:** large centred title "Cards" with the subtitle "All your money in one place." under it.
3. **Credit cards** section: heading + the "+ Add" pill (existing `ActionPill`), then each card face as drawn:
   card name, network mark (AMEX / VISA …), "Owed", the owed figure, and — **only when the card has a credit
   limit** — a progress bar plus "$4,050 of $10,000 limit"; "•••• 6334" bottom right. The "Skip" watermark stays.
4. **Credit limit (new, optional):** a new nullable `cards.credit_limit numeric(14,2) check (> 0)`; an optional
   "Credit limit" field on Add/Edit card. Bar = owed ÷ limit, clamped 0…1 (a card in credit shows an empty bar;
   over the limit shows a full bar). No limit → no bar and no "of … limit" line.
5. **Bank accounts** section: heading + "+ Add", then each account face as drawn: bank name, a type badge
   ("Checking" / "Savings" from `account_type`), "Available", the balance, "Updated {when}" bottom left and
   "•••• 7010" bottom right.
6. **Money** section: four tiles, 2 × 2, each with its gradient icon top left and a chevron top right:
   - **Salary:** the monthly pay figure and "Monthly" (the pay's frequency word); none → an "Add salary" pill
     and "Add your pay". Opens `/salary`.
   - **Savings:** an "Open" pill and "Start saving" (savings is still being redesigned; it opens the existing
     `/savings` page, unchanged).
   - **Loans:** none → an "Add a loan" pill and "Track what you owe", opening `/loan-calculator`.
     With loans → "{n} active" and the loan names joined with " · " (like the Goals tile in the design);
     one loan opens its bill page, several open `/bills`.
   - **Goals:** "Coming soon" — drawn as designed with the gradient icon, but inert (no chevron, no press),
     until the Goals feature exists.
7. Tab bar unchanged (already "Cards"; the voice button's PRO badge already exists for free accounts).

## CEO defaults (tell the Founder if one looks wrong)

- "Updated {when}" = the later of the account's typed balance date (`balance_as_of`) and its latest
  transaction that has happened (not projected): "Updated today", "Updated yesterday", else a short date.
- Card and account faces keep today's figure rules (whole dollars on the face, as now; cents on the detail page).
- Empty states keep today's notes ("No cards yet" etc.) under each section.
- Free plan: unchanged (the existing one-card / one-account allowances and their explainers).

## Work split

- **Diego:** migration `supabase/migrations/20261009100005_card_credit_limit.sql` (additive, re-run safe),
  `credit_limit` on the card row type, reads and writes; a missing column must not break card reads before
  the push (follow the logo-columns fallback pattern only if needed — the CEO will push the migration before
  the app ships). No push; the CEO pushes after review.
- **Dana:** the page, card and account faces (`src/components/cards/*`), the Money tiles, the Add/Edit card
  "Credit limit" field (optional, amount input like the balance field), the gradient icons as assets.
  **react-native-svg does not follow `xlink:href` between gradients**: the four SVGs chain gradients that way,
  so flatten each reference into a full gradient in the asset copies (originals untouched) and check they
  render. Light and dark mode; large text (nothing cut, the 2 × 2 tiles stack when they must).
- Copy in en / es / fr. Toasts unchanged. Tests under `src/__tests__/` or next to lib files, never `src/app`.
- No commits, no pushes. The Founder reviews it live in the Simulator.

## Phase 2: Add card / Add account flow, steps 2 and 3 + a new final page (Founder, 2026-10-09)

Designs (light and dark): `add-card-step2-*.png`, `add-card-step3-*.png`, `card-added-*.png` in the reference
folder; the new bell icon `reminder.svg` (gradient, same flattening rule). Step 1 (the balance keypad) is unchanged.
The Founder asked us to "follow the design and make improvements if needed".

**Card, step 2 (details), top to bottom:** live preview card face; Card name; Network pills (VISA, Mastercard,
AMEX, Discover); Last 4 digits; Card limit; Card colour swatches (8, as drawn); Continue.
**Card, step 3:** "When is the bill due?" / "Pick the day it's due each month."; a horizontal strip of day chips
1-31 (selected = plum); a summary card (calendar glyph): "Due every month on the 22nd" / "Next due: 22 Oct 2026";
a "Remind me" card (gradient bell, toggle, "19 Oct, 3 days before it's due", segmented On the day / 1 day /
3 days / 1 week); the note "You can change these anytime in card settings."; primary "Add card".
**Final page "Card added"** (create only): check in a soft plum circle, "Card added", "We'll remind you 3 days
before it's due." (or a no-reminder line), the card face, rows Due / Next due / Reminder, primary "Done"
(back to Cards), link "Add another card" (fresh add flow), close X top right.

**CEO improvements (apply):**
- The preview face says "Owed" (the design's "Balance next" is a slip) and shows the live limit line:
  "Limit not set" until a limit is typed, then "$500 of $10,000 limit" with the bar.
- Card limit is an inline currency field (decimal pad), not a pop-up pad: no overlays (app-wide rule).
- The day strip scrolls the chosen day into view; 29-31 add "or the last day in shorter months" in the summary.
- The reminder keeps today's default time silently (the design drops the time picker).
- Edit mode keeps the same steps, "Save changes" instead of "Add card", no final page (toast + back as today).
- On create, the final page IS the confirmation: no toast on top of it.
- Nav: the final page replaces the flow (back/swipe must not return into the finished flow).

**Bank account:** same visual language. Step 2 = live account face; Bank name; Nickname; Account type pills
(Checking / Savings); Last 4; colour. Step 3 = the payday question (when pay already lands here: last payday as
a date strip or the existing calendar, plus frequency pills) and the same "Remind me" card; primary "Add account".
Final page "Account added": the account face + rows (Type, Next payday / Reminder when set), Done, "Add another
account". Use the card designs' components; don't fork them.

## Dark-mode icons (Founder, 2026-10-09)

The Founder made dark-mode versions of all five gradient icons: `<name>-dark-icon.svg` (salary, savings, goals,
loans, reminder) in `~/Desktop/updated gradient icons` (copies in the reference folder). Use them in dark mode and
the originals in light mode, as a light/dark pair the way `src/theme/artwork.ts` pairs artwork. The change in each:
the navy gradient `#273a9b → #202f65 → #021e2f` becomes `#6274D4 → #4F5FB0 → #3E4C93` (goals also lightens one
fill to `#F3EEF2`). **savings-dark-icon.svg came through unchanged** (an oversight), so in the app's copy apply
the same three-stop replacement; the Desktop originals stay untouched. Same flattening rule for `xlink:href`.
