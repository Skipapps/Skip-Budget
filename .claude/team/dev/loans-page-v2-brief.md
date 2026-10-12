# Loans page v2: CEO brief (2026-10-12)

Founder design, light + dark: `.claude/team/design/reference/loans-page-v2/loans-light.png`, `loans-dark.png`.
"Follow the design and edit it if needed to match my app theme." Replaces the 2026-10-09 page
(`src/app/loans.tsx`, `src/components/loans/*`). The Add-loan form is a separate, later design: **main page only**.

## Founder answers (2026-10-12)
1. **Back arrow, no tab bar.** The tab bar in the design is decoration. Keep `Screen` with `showBack`, like Savings
   and Goals. No header "+" any more (the tiles replace it).
2. **Keep the navy/blue summary card** (navy in dark, pale blue with navy figures in light).
3. **Add Loan opens the calculator for now** (`/loan-calculator`, same as Loan Calculator). The Founder will send an
   Add-loan form design next; don't build a form.

## Page, top to bottom
- Header: back, title "Loans", subtitle "Everything you owe, in one place" (centred under the title, muted). Add an
  optional `subtitle` to the shared header if it has none; other pages unchanged.
- **Two tiles, side by side, equal width** (~130pt tall, radius 20):
  - **Loan Calculator**: card surface + line border; calculator gradient icon top-left (the existing
    `useLoanIcons().details`, light/dark pair); label bottom-left "Loan Calculator" (semibold, may wrap to two
    lines); bottom-right a 40pt plum (`control`) circle with a white chevron. Whole tile is one button →
    `/loan-calculator`.
  - **Add Loan**: plum (`control`) fill; document-and-pen icon top-left (new asset from
    `reference/loans-page-v2/add-loan-icon-source.svg` = Gradient-Icons-Vol-2 `document-signing-approval-icon`; one
    drawing for both modes since it sits on plum; flatten any gradient href chain, react-native-svg ignores them);
    label "Add Loan" in white; bottom-right a 40pt white circle with a plum "+". One button → `/loan-calculator`.
  - Large text: labels wrap, never cut; the tiles grow in height. At the largest sizes stack them full-width.
- **"Your loans" summary card** (radius 20; light bg `#EFF7FF` with navy type `#10245A`, a soft shadow like the
  design; dark bg `#16213F` with off-white type; check every text pair ≥ 4.5:1 and adjust the muted line until it
  does):
  - Row: the round orange "hand and $" icon (40pt) + "Your loans" (semibold).
    **Founder: use their file as-is, don't redraw** — `~/Desktop/updated gradient icons/Loan Icon new.png`
    (80px PNG, copy in `reference/loans-page-v2/your-loans-icon.png`), RN `Image`, same file in light and dark.
  - Big total: Σ amount left of open loans ("$35,328.93", hero size, figures never cut: `adjustsFontSizeToFit` or
    the TEXT_CAP hero rule already used for hero figures).
  - "Total balance across {count} loans" (plural rules en/es/fr; 1 → "across 1 loan").
  - Divider; "Monthly" left, Σ monthly payments right; a 6pt bar (light: navy `#062554` fill on white track; dark:
    `#8EA2E8` fill on a dark track) = summary percent paid; caption
    "{percent} paid off · {paid} of {base}" ("18% paid off · $7,671.07 of $43,000").
  - Three rows split by hairlines, each with a 7pt dot: **Base** (dot `#905479`) Σ amount borrowed of open loans;
    **Rate** (dot `#C39BB4`) "6.25% – 7.50%" (lowest – highest, `loanRateText`, en dash with spaces; one value when
    all the same); **Active** (dot `#E4D3DE`) "{n} loans" (plural). Dots are decoration (hidden from VoiceOver).
- "Your loans" section heading, caption "{n} active" (open loans only).
- **One card per open loan** (card surface, line border, radius 20):
  - Row 1: loan-type icon (existing `LoanTypeIcon`, Other for untyped), name (semibold), muted line
    "{term} · started {Mon yyyy}" ("4 yrs · started Dec 2024"); right side "Next" (muted) over the next payment's
    "27 Oct" (semibold). No chevron.
  - Row 2: "$10,673.63" (large, bold) + "left" (muted) on the left; "$424.80/mo" on the right. Large text: the
    right figure drops under the left one rather than cutting either.
  - Plum bar (6pt, `accent` fill, `ink/10` track) and "41% paid off" under it.
  - Hairline-divided rows with the same three dots: **Base** amount borrowed; **Rate** `loanRateText`;
    **Left** "27 of 48 payments".
  - **View details**: full-width plum `Button` → `/bill/[id]` (rows-open-detail-pages rule). The card itself is not
    a second button; give the button an accessibility label that names the loan ("View details, Car loan").
- **Finished loans** (paid off or stopped; not in the design): keep the "Finished" section below, restyled to the
  same card language (icon, name, "{term} · started …", the existing "Paid off on …" / "Stopped on … · $X left"
  line, View details). Out of every total, as today.
- **No loans**: tiles stay; the summary card becomes the existing empty invitation, restyled to sit in the page.
  **Only finished loans**: summary card stays with zeros (as today: "not no loans").
- Removed: header "+", the info line, the "+ New loan calculation" pill, the summary's "Next payment".
- Loading / error states as today (skeleton, PageState with FAILURE text and Try again).

## Maths (Drew): pure, cent-exact, `src/lib/loan-status.ts`
- `loanStatus` gains `startedOn` (yyyy-mm-dd): the schedule's funding date (`funded_on`, else the implied funding a
  month before the first payment, the same date `amortise` uses). "started Dec 2024" is its month.
- `loansSummary` gains, over **open** loans only: `totalBorrowed` (Σ principal), `totalPaid` (= totalBorrowed −
  totalOwed, in cents), `percentPaid` (whole percent half up, never 100 while a cent is owed, never negative: the
  same rule as `loanStatus`), `rateRange` ({ min, max } of `annual_rate`, null with no open loans).
- Check against the design's own numbers: 18,000 + 25,000 = 43,000; 43,000 − 35,328.93 = 7,671.07; 17.84% → 18%.
- Tests next to the lib file. No change to the schedule engine.

## Rules
- en/es/fr for every new string; remove keys nothing uses any more.
- Light/dark from the app's own Light/Dark/System choice (`useTheme().scheme`), not the phone's.
- Large text: nothing cut, figures never truncated; VoiceOver reads each card as one sensible summary.
- Comments: only the non-obvious why. Tests under `src/__tests__/` or next to lib files, never in `src/app`.
- No commits. Founder tests on the iPhone 13 Pro Max after Dmitri's review (no Simulator walk).
