# Loan file upload (C1): screen spec

Paulo (product design), 2026-10-09. **This is a draft for the Founder's approval. Nothing is built from it until he
approves.**

- **Mock:** `.claude/team/design/loan-upload-mock.html`. It has 29 phone frames (5 of them dark, 1 at large text).
  It opens in any browser and needs no network.
- **Plan:** `.claude/team/dev/loan-upload-plan.md`, approved 2026-10-09. This spec follows its section 1 and the
  Founder's approval notes.
- **Look:** the Founder's loan designs in `.claude/team/design/reference/loan-redesign/`. The cards, radii, plum accent,
  gradient icons and type are all taken from them.
- **Mock source:** `.claude/team/design/loan-upload-assets/`. It holds `build.py`, which regenerates the mock, and the
  draft icon SVGs.

Every loan figure in this spec and in the mock was produced by Skip's own engine (section 16). None was typed by hand.

---

## 0. What the Founder is approving

1. **Seven new full pages and one card.**
   - The card sits at the bottom of the calculator.
   - The pages are:
     - Upload your loan file
     - the iOS Files picker (the system's own page)
     - Locked file
     - Reading your file
     - Check the numbers
     - one field per page
     - a page for each problem
   - There are no sheets and no popovers. The only overlay is the house discard dialog.
2. **The card keeps the Founder's words.**
   - Title: "Upload your loan file".
   - Hint: "Upload the loan file you received from your bank".
   - Free accounts see the PRO pill and go to the explainer.
3. **"Upload" never sits beside "never uploaded".**
   - The plan's privacy line said "It is never uploaded", which contradicts the card's own verb.
   - Every privacy line now says the file **never leaves your phone**. See question 1.
4. **Check the numbers is laid out like the calculator.**
   - Rows sit under the calculator's own headings and gradient icons: The loan, Dates, More options.
   - Each row shows the calculator's value now, then → the file's value, then where the value was found.
   - Each row has a mark, which is always an icon plus a word.
5. **Five marks.**
   - The plan has four: Checked, Check this, Not found and Assumed.
   - I added **Confirmed by you**, which the plan's edit page already names. It is the mark a "Check this" row turns
     into once the person acts on it.
6. **An eighth row: "How interest is charged".**
   - Filling can change the calculator's interest method. That is how Example A reaches "to the cent".
   - The plan says nothing reaches the calculator unseen, so the method gets a row of its own.
7. **A "How Skip checked" card.**
   - It lists each check: the file's figure beside Skip's (APR, payment, last payment, finance charge, total of
     payments).
   - This is the evidence behind "Matches your bank's figures to the cent".
8. **"Fill the calculator" is never greyed out.**
   - This is the house rule from the entry forms.
   - A tap with rows still open shows "To fill the calculator, check: Interest rate, First payment." and moves
     VoiceOver focus to the first open row.
9. **A new colour pair, `attention`, for "Check this" and the warnings.**
   - Light #93600A, dark #F0B44C.
   - The palette has no amber. The alternatives are all spoken for: `danger` is kept for destructive actions, and
     `moneyOut` for money going out.
10. **A draft icon family.**
    - There is no Founder icon for this feature. I drew one in his palette: an orange page, a blue box and a navy
      badge.
    - The badge comes in four versions: an up arrow (card), a magnifier (reading), a check (all checked) and "!"
      (needs a look or a problem).
    - He should redraw it. Question 2.
11. **A sixth route for problems.**
    - The route is `/loan-upload-problem?kind=…`.
    - The plan budgets five routes. Question for Dmitri (9).

---

## 1. Shared look

### 1.1 Colour tokens

Every colour is an existing token from `src/theme/palette.ts`, except the two marked **new**.

| Token | Light | Dark | Used for here |
| --- | --- | --- | --- |
| `surface` | #FBF9F7 | #1B181F | page, footer, slider value chips |
| `card` | #FFFFFF | #2A2634 | cards, back circle, field, date tiles |
| `ink` | #111111 | #F8F6FB | titles, new values |
| `body` | #2F2F2F | #E4E0EA | notes, hero lines, warning text |
| `muted` | #6F6F6F | #A7A1B2 | labels, old values, sources, hints |
| `line` | #E5E1DC | #3E3949 | card borders, dividers, footer hairline, slider track |
| `accent` / `control` | #905479 | #905479 | Fill, Choose a PDF, PRO pill, selected tile border |
| `accent` at 10% | on card | on card | selected tile fill (as `SourceTiles` does) |
| `moneyIn` | #2F7A55 | #7FD6A0 | the **Checked** mark |
| `danger` | #B0453A | #F08A86 | the missing-rows line, the wrong-password hint, the destructive "Yes" in the dialog |
| **`attention`** (new) | **#93600A** | **#F0B44C** | the **Check this** mark, the warning block's icon |
| **`accentOnTint`** (new) | #905479 | **#C79AB6** | **Confirmed by you** text. `accentInk` in dark is 3.14:1 on the plum tint. |

Contrast was computed with the app's own `contrast()` from `src/lib/tone.ts`. Every mark is at 12pt semibold.

| Mark | Light | Dark |
| --- | --- | --- |
| Checked, on 8% green | 4.67:1 | 6.17:1 |
| Check this, on 8% amber | 4.80:1 | 5.90:1 |
| Confirmed by you, on 10% plum | 4.92:1 | 5.27:1 |
| Assumed, on 5% ink | 4.53:1 | 4.97:1 |

Warning text is `body` on the amber tint (12.0:1 light). It is never `muted`, which only reaches 4.50:1 there.

"Check this" rows get **no row tint**. A tinted row would have pulled the amber mark down to 4.41:1.

### 1.2 Type

The app's Montserrat is embedded in the mock. Sizes are points; caps are `TEXT_CAP` roles.

| Role | Size / weight | Cap |
| --- | --- | --- |
| Page title (header) | 17 / 600, as drawn in the Founder's PNGs | heading 1.3 |
| Hero title | 20 / 700, line height 26 | heading |
| Centred state title (reading, password, problems) | 22 / 700, line height 29 | heading |
| Section heading (with 26pt gradient icon) | 17 / 600 | heading |
| Card title | 15 / 600 | row 1.4 |
| Row label | 13 / 400 `muted` | row |
| Old value | 15 / 400 `muted` | row |
| New value | 17 / 600 `ink` | row |
| Source line | 12 / 400 `muted` | row |
| Note under a row | 13 / 400 `body`, line height 18 | reading 1.6 |
| Mark (icon 14 + word) | 12 / 600 | control 1.3 |
| Subtitle, hint, info line | 12–13 / 400 `muted` | reading |
| Primary button | 17 / 500 on `control` | row |
| Text button ("Not now", "Enter it yourself") | 14 / 400 `muted` | row |

### 1.3 Page shell

- **Screen** with `showBack`. Its gutter is `px-6`, which is 21pt (the designs draw 20).
- **Header.** It is 52pt tall. The back button is a 40pt circle on `card` with a 1pt `line` border, as drawn, with a
  44pt touch box (`BackButton` already has it). The title is centred.
- **Footer.** Always `Screen`'s `footer` prop, pinned, with a 1pt `line` hairline above it as drawn. The padding is
  14pt top and 8pt bottom plus the safe area.
  - The primary button is `Button`: 56pt minimum, full width, pill.
  - A text button sits under it at 44pt minimum.
  - The hint line sits above the button, centred.
- **Sizes in code.** Use arbitrary values (`h-[44px]`), not rem steps. NativeWind's rem is 14, so `h-11` is 38.5pt, not
  44.

### 1.4 Cards and rows

- **Cards.** The same as `LoanCard`: 20pt radius, 1pt `line` border, `card` fill, no shadow.
- **Rows.** Rows inside a card have 16pt vertical and 18pt horizontal padding, with a 1pt `line` divider between them
  (none above the first).
- **Link cards.** "Payment schedule", "More options" and the new upload card are one row: a 38pt gradient icon,
  then a 14pt gap, then the text, then the end mark.

### 1.5 Icons

**The Founder's gradient icons** (light and dark pairs, already in `src/theme/loan-icons.ts`):
- `details` and `dates` head The loan and Dates on Check the numbers.
- `moreOptions` heads More options there.
- `result` stays on the calculator.

**Draft icons** (mine, in `.claude/team/design/loan-upload-assets/`): one page drawn four ways.
- The page is the home-redesign receipt shape in the orange gradient.
- It carries a cyan box, for the disclosure box, and white-silver lines.
- A navy badge sits bottom-right. Its four versions:
  - `loan-file`: an up arrow. Used on the calculator card and the upload page hero.
  - `loan-file-reading`: a magnifier. Used on the reading page. An up arrow there would say "uploading", which is
    false.
  - `loan-file-checked`: a check. Used on the review hero when everything is checked or confirmed.
  - `loan-file-problem`: "!". Used on the review hero when something needs a look or a warning applies, on the password
    page, and on every problem page.
- Each dark file lifts the navy stops #273a9b/#202f65/#021e2f to #6274D4/#4F5FB0/#3E4C93, as the brief asks.
- The gradients are already flattened (no `xlink:href`), ready for react-native-svg.

**Lucide glyphs** at 2pt stroke:
- in `muted`: ChevronRight, Pencil, Lock, Info, FileText, Landmark, Camera, Eye/EyeOff;
- the marks' glyphs: CircleCheck, CircleAlert, CircleDashed, UserRoundCheck.

### 1.6 The five marks

A mark is always the icon **and** the word, in a pill tinted with its own colour. Colour is never the only signal.

| Mark | Icon | Colour | Means | On Fill |
| --- | --- | --- | --- | --- |
| **Checked** | CircleCheck | `moneyIn` on 8% | read under a known label and inside a check that passed (plan 3.9) | applied |
| **Check this** | CircleAlert | `attention` on 8% | read, but no check covers it, a check failed, it is ambiguous, or it was derived | **blocks Fill** until "Use this", a date tile, or an edit |
| **Confirmed by you** | UserRoundCheck | `accentOnTint` on plum 10% | the person tapped "Use this", picked a reading, or changed it | applied |
| **Assumed** | Info | `muted` on ink 5% | Skip's default, shown (money received = a month before the first payment; an interest method chosen because it gives the bank's payment) | applied |
| **Not found** | CircleDashed | `muted`, 1pt `line` outline | not in the file | the calculator keeps its own value |

### 1.7 How numbers are written

| What | Format | Example |
| --- | --- | --- |
| Money | `formatCurrency`, always with cents, on both sides of the arrow | $25,000.00 → $27,450.00 |
| Rate | `loanRateText`: at least 2 decimals, never rounded | 7.49%, 6.875% |
| Number of payments | "{count} payments" | 60 payments |
| Dates | `formatFullDate` | 15 Oct 2026 |
| What the file printed | verbatim, in the file's own language, in the language's quotes | “Monthly beginning 10/15/2026” |
| APR, Skip's side | `percent(apr, 2)` | 8.19% |

- **Money.** The calculator's chip shows "$27,450". The review shows cents because the page is about the cent.
- **Printed text** is shown only when it differs from how Skip writes the value: "printed 09/15/2026" yes, "printed
  $27,450.00" no.
- **APR comparison.** The check uses the unrounded APR (8.19117) with the plan's 0.01-point rule. The screen shows the
  rounded figure.
- **Signs.** No figure on these pages has a sign. None is ever cut or ellipsised; figures wrap instead.

---

## 2. Flow and routes

```
Calculator card ── free ──▶ /pro-feature?id=loanUpload ──▶ /pro
      │ Pro
      ▼
/loan-upload ──Choose a PDF──▶ iOS Files picker ──cancel──▶ (back, no message)
      │                               │ picked
      │ too big / not PDF             ▼
      ├──────────────────▶ /loan-upload-problem?kind=…
      │                    locked? ──▶ /loan-upload-password ──3rd wrong──▶ problem (replace)
      ▼                               │ opened
/loan-upload-reading ◀────────────────┘
      │ done (replace)                 │ unreadable / no loan / card / scan / failure (replace)
      ▼                                ▼
/loan-upload-review ◀──▶ /loan-upload-edit?draft=…&field=…        /loan-upload-problem?kind=…
      │ Fill
      ▼
router.dismissTo('/loan-calculator') + toast "Filled in from your file"
```

| From | Back goes to | Notes |
| --- | --- | --- |
| Upload your loan file | calculator | |
| Locked file | Upload your loan file | the password is dropped |
| Reading your file | Upload your loan file | the same as Stop; it cancels between pages |
| Check the numbers | Upload your loan file | the reading page was replaced; asks first if anything was confirmed or changed (8.9) |
| One field | Check the numbers | writes nothing (the `/voice-edit` pattern) |
| A problem page | Upload your loan file | "Enter it yourself" goes to the calculator |

**Route parameters.**
- They carry ids and kinds only, never a number or a password (plan 3.11).
- `kind` is one of: `unreadable`, `noLoan`, `creditCard`, `scan`, `tooBig`, `notPdf`, `password`, `failure`.

**Deep links.** Every route runs `useProGate('loanUpload')`. If a review or edit route opens with no draft in the slot,
it shows the `failure` problem page.

---

## 3. The card on the calculator

**Where.** In the calculator's scroll, last, straight above the pinned Save: under "Payment schedule", 12pt below it
(Dana L's `loan-upload-slot`). Bottom margin 16pt.

**Layout.** It follows `ScheduleCard` exactly.
- **Icon:** `loan-file`, 38pt.
- **Title:** `loanUpload.card.title` "Upload your loan file", 15/600.
- **Hint:** `loanUpload.card.hint` "Upload the loan file you received from your bank", 12/400 `muted`. It wraps to two
  lines at 390pt.
- **End mark:** ChevronRight 20 in `muted`.

**States**

| State | Looks | Tap |
| --- | --- | --- |
| Pro | chevron | pushes `/loan-upload` |
| Free (known) | **PRO** pill (the `ToolCards` sticker: `accent` fill, 9pt bold white, 7pt by 2pt padding), then the chevron at 55% opacity | pushes `/pro-feature?id=loanUpload` |
| Pro not known yet (`ready` false) | drawn as Pro, no pressed state, ignores taps | — |
| Native build without `readDocument` | not drawn | — |

- **Tap target.** The whole card is one `Pressable`, at least 70pt tall. Pressed state is `active:bg-ink/5`.
- **VoiceOver.**
  - Pro: label = the title, hint = the hint text.
  - Free: label `loanUpload.card.lockedLabel` "Upload your loan file, a Skip Pro feature".
- **Dark.** Uses the `loan-file` dark file. The card is on `card`.
- **Large text.**
  - Title and hint wrap.
  - The pill and chevron stay at the right, vertically centred.
  - The pill does not scale (`allowFontScaling={false}`, as on Home).

---

## 4. Upload your loan file (`/loan-upload`)

Header title: `loanUpload.title` "Upload your loan file". Back goes to the calculator.

**Top to bottom**

1. **Hero card.** Padding 18pt, with `loan-file` at 52pt and then:
   - kicker `loanUpload.hero.kicker` "From your bank’s loan file" (12 `muted`);
   - title `loanUpload.hero.title` "Skip fills in the calculator" (20/700);
   - line `loanUpload.hero.line` "You check every number before anything changes." (13 `muted`).
2. **"What works best" card**, 24pt below. A title row `loanUpload.best.title` (15/600, padding 16pt by 18pt), then
   three rows, each a 20pt `muted` glyph, a 15/600 line and a 12pt `muted` note:
   - FileText: "Your loan agreement or disclosure" / "The part that shows the amount, rate and payments"
   - Landmark: "A PDF from your bank" / "From online banking, an email or Files"
   - Lock: "Locked PDFs are fine" / "Skip asks for the password"
3. **"Photos and scans" card**, 12pt below.
   - It is not a button: no pressed state, and VoiceOver reads it as one text element, "Photos and scans, coming soon".
   - Camera glyph in a 38pt `surface` square with a `line` border, then "Photos and scans" and the note "Paper copies
     and photos of your loan file".
   - At the right, a **Coming soon** pill: 1pt `line` outline, 11/600 `muted`.
   - It goes away in C2 (see question 4).
4. **Privacy line**, 16pt below. Info-line style: Lock 14 and 12pt `muted`. `loanUpload.privacy` "Your file is read on
   this phone and never leaves it. Skip doesn’t keep a copy."

**Footer:** `loanUpload.choosePdf` "Choose a PDF".

**Interactions**
- Choose a PDF opens `DocumentPicker.getDocumentAsync` (plan 1.3).
  - **Cancel** returns here silently.
  - **Over 50 MB** (`asset.size`) replaces nothing; it pushes the `tooBig` problem page.
  - **Picked** pushes Reading, or Locked file when native rejects with `ERR_LOCKED`.
- **No permission prompt** (v57 docs; plan 1.3).

**Dark.** As tokens. **Large text.** Every line wraps. The Coming soon pill drops under the text when it no longer fits
beside it (FitGroup switch).

---

## 5. The Files picker

This is the system's own page and nothing of ours is drawn on it.

**For C1 I recommend the type list `['application/pdf']` only, not the plan's `['application/pdf', 'image/*']`.**
- With images allowed, a person can pick a photo from a button that says "Choose a PDF" and then be told it is a scan.
- With PDFs only, Files greys out what can't be read.
- C2 adds `image/*` when photos are real. Question 9 for Dmitri.

---

## 6. Locked file (`/loan-upload-password`)

Header title: `loanUpload.password.title` "Locked file".

**Top to bottom**
1. A centred block:
   - `loan-file-problem` at 64pt;
   - `loanUpload.password.heading` "This file is locked" (22/700, 16pt below the icon);
   - `loanUpload.password.body` "Enter its password to open it." (15 `muted`).
2. Label `loanUpload.password.label` "Password" (14/600), 22pt below.
3. **The field.**
   - 56pt tall, 16pt radius, `card`, 1pt `line` border, 16pt text.
   - Placeholder `loanUpload.password.placeholder` "Enter the file’s password".
   - An eye button at the right, 44 by 44pt. Its VoiceOver label is `loanUpload.password.show` / `.hide`.
4. Info line with Lock 14: `loanUpload.password.kept` "Skip uses it once to open the file and doesn’t keep it."

**Footer:** `loanUpload.password.open` "Open". It sits above the keyboard (`avoidKeyboard`).

**The field's settings**
- Focused on arrival. Secure entry.
- `textContentType="none"`, `autoComplete="off"`, autocorrect and autocapitalise off, return key "go" (it acts as
  Open).
- **Check on a phone that iOS does not offer "Save password?"**. This is a single field with no username, so it should
  not, but nothing about this field may be kept.

**States**
- **Empty and Open tapped:** the hint `loanUpload.password.empty` "Enter the password." This is a form hint, not
  greyed.
- **Wrong** (1st or 2nd try):
  - the field border becomes 1.5pt `danger`;
  - under it, 13pt `danger`: `loanUpload.password.wrong` "That password didn’t open the file.";
  - VoiceOver announces it and the field keeps focus with its text selected.
- **Third wrong try:** replace with the `password` problem page.

The password lives in component state only and is passed to native once (plan 1.4).

---

## 7. Reading your file (`/loan-upload-reading`)

Header title: `loanUpload.reading.title` "Reading your file". Back is the same as Stop.

**Top to bottom** (the centre block is vertically centred in the space above the privacy card)
1. `loan-file-reading` at 96pt.
2. `loanUpload.reading.page` "Page {page} of {count}" (22/700). Before the first progress event it reads
   `loanUpload.reading.opening` "Opening your file".
3. A progress bar 20pt below: 260pt wide, 8pt tall, full radius. The track is `line` and the fill `accent` at
   page ÷ count.
4. `loanUpload.reading.looking` "Looking for the amount, rate, payments and dates" (14 `muted`).
5. **Privacy card** at the bottom of the scroll. A Lock glyph in a 38pt `surface` square, then:
   - `loanUpload.reading.privateTitle` "Nothing leaves your phone";
   - `loanUpload.reading.privateBody` "Skip reads your file here and forgets it when you’re done."

**Footer:** `loanUpload.reading.stop` "Stop", the outline `Button`. Stop cancels between pages and returns to the
upload page with no message (plan 2.5).

**Behaviour**
- **No artificial delay.** A 10-page text PDF reads in under a second, so most people will see this page only briefly.
  Faking work would be dishonest.
- **When it ends**, Check the numbers *replaces* this page. VoiceOver then announces
  `loanUpload.reading.done` "Found {found} of {total} numbers" and focus moves to the review's title.
- **Errors** replace this page with the matching problem page.
- **Motion.** The bar animates its width over 200ms. Under Reduce Motion it jumps.

**VoiceOver.** The bar is `accessibilityRole="progressbar"` with the value text "Page 2 of 6".

---

## 8. Check the numbers (`/loan-upload-review`)

Header title: `loanUpload.review.title` "Check the numbers". Subtitle under the header (13 `muted`, centred):
`loanUpload.review.subtitle` "Nothing changes until you fill the calculator."

### 8.1 Top to bottom

1. **Hero card** (8.2).
2. **The loan** section, with the `details` gradient heading (`loan.calculator.theLoan`). Its rows:
   - Loan amount
   - Interest rate
   - Term
   - Monthly payment
3. **Dates** section, with the `dates` heading. Its rows, in the calculator's own order:
   - Money received
   - First payment
4. **More options** section, with the `moreOptions` heading. Its rows:
   - Fees paid upfront
   - How interest is charged
5. **How Skip checked** card, 30pt below (8.6).
6. Info line: `loanUpload.review.nothingSaved` "Filling only changes the calculator. Nothing is saved until you tap Save."

Sections are 30pt apart, as on the calculator. A heading sits 12pt above its card.

### 8.2 Hero card

The hero card has 18pt padding. Its parts:
- the badge icon at 44pt;
- kicker `loanUpload.review.from` "From your loan file · {pages}" (12 `muted`), where pages is "1 page" / "4 pages";
- the title (20/700);
- a hairline;
- status lines, each a 17pt mark icon with 13pt `body` text (zero-count lines are left out);
- the warning block, if any.

| Condition | Badge | Title | Lines | Block |
| --- | --- | --- | --- | --- |
| Engine replay passes to the cent (plan 3.8 check 5), every row Checked, nothing edited, no warning | checked | `loanUpload.review.matches` "Matches your bank’s figures to the cent" | ✓ `allChecked` "8 of 8 found and checked against your file’s own totals" | — |
| Some rows still "Check this" | problem | `found` "Found 5 of 8" | ✓ "3 checked", ⚠ `needLook` "2 need a look" | warning if any |
| Nothing left to look at, but not the strong case | checked | "Found 5 of 8" | ✓ "3 checked", 👤 `confirmed` "2 confirmed by you" | — |
| A loan Skip can't price exactly (plan 3.10) | problem | "Found 8 of 8" | ✓ "8 checked" | estimate warning (8.7) |
| A monthly statement | problem | "Found 2 of 8" | ⚠ "2 need a look" | statement warning |

- **The strong title** shows only while every row is Checked and unedited and no warning applies.
- **Losing it.** The moment the person edits a row it drops to the count form: "Found 8 of 8", "7 checked", "1
  confirmed by you". A loan with an estimate warning **never** shows it, even when every check passes (Example C).
- **Found** counts the rows whose value came from the file. **Total** is the 8 rows.

### 8.3 Row anatomy

Each row has 15pt top and 16pt bottom padding, and 18pt sides.

```
Loan amount                                  [✓ Checked]
$25,000.00  →  $27,450.00                          ✎
▤ Page 1 · “Loan Amount”
(note, 13 body)                       — only when there is one
[Use this]  or  [date tile] [date tile] — only when it needs an answer
```

- **Line 1.** The label on the left, using the calculator's own keys:

  | Row | Key | English |
  | --- | --- | --- |
  | Loan amount | `loan.amount` | Loan amount |
  | Interest rate | `loan.interestRate` | Interest rate |
  | Term | `loan.termLabel` | Term |
  | Monthly payment | `loan.monthlyPayment` | Monthly payment |
  | Money received | `loan.calculator.moneyReceived` | Money received |
  | First payment | `loan.firstPayment` | First payment |
  | Fees paid upfront | `loan.fees` | Fees paid upfront |
  | How interest is charged | `loan.calculator.howInterestCharged` | How interest is charged |

  The mark sits on the right.
- **Line 2.** The value line (8.4), with the **pencil** at the right.
  - The pencil is an 18pt `muted` glyph in a 44 by 44pt button that opens 9.
  - Its VoiceOver label is `loanUpload.review.edit` "Change {label}".
  - The values wrap inside their own box, so the pencil never drops to a line of its own.
- **Line 3.** The source: a FileText 13 glyph, then 12pt `muted` text joined with " · ". Its pieces:
  - `loanUpload.source.page` "Page {page}";
  - a place: Truth-in-Lending box / payment schedule / itemization / amortization table;
  - the file's own label in quotes;
  - optionally "printed {text}", "{first} + {last} payments" or "last one {amount}".

  Rows with nothing from the file show a sentence instead (8.5).
- **Note.** 13pt `body`, 10pt above (8.5).
- **Answer.** Two kinds:
  - **Use this.** An outline pill, 36pt tall with 4pt hit slop (44pt to touch), 16pt sides, 14/600 `ink`. Tapping it
    sets the mark to Confirmed by you, plays the selection haptic, and VoiceOver says "{label} confirmed". The button
    goes away.
  - **Date tiles.** Two tiles side by side with a 12pt gap, in the save-loan tile style: 54pt minimum, 16pt radius, a
    15/600 date, and a 22pt radio at the right. A selected tile gets a 1.5pt plum border, a 10% plum fill and a white
    check in a plum circle. **Nothing is preselected.** Tapping one confirms the date (mark: Confirmed by you).
    "Money received", if Assumed, recomputes from it.

### 8.4 The value line, by case

| Case | Drawn as |
| --- | --- |
| The file's value differs | old (15 `muted`) → new (17/600 `ink`) |
| The file's value equals the calculator's | new (17/600) · `loanUpload.value.sameAsNow` "same as now" (15 `muted`) |
| Not found | the calculator's value (17/600) · `loanUpload.value.unchanged` "unchanged" |
| Money received, Assumed, first payment not yet chosen | old → `loanUpload.value.monthBefore` "a month before the first payment" (15 `ink`, regular) |
| An ambiguous date not yet chosen | old → "?". VoiceOver reads `loanUpload.value.unchosen` "not chosen yet". |
| After an edit | old → the person's value, mark Confirmed by you |

### 8.5 Notes and source sentences

| When | Key | English |
| --- | --- | --- |
| Rate is the APR, no fees (plan 3.7 rule 3) | `note.aprOnly` | Your file gives the APR only. With no fees it is usually the interest rate. |
| APR only, fees above 0 (rule 4): rate Not found | `note.aprOnlyFees` | Your file gives the APR only, and it includes fees, so the interest rate can’t be worked out. Enter it yourself. |
| Rate solved from the payments (rule 2) | `note.solved` | Worked out from your file’s payments. |
| A date that reads both ways | `note.twoReadings` | This date can be read two ways. Which is it? |
| Two different values tied | `note.twoValues` | Your file shows two different figures here. Which is it? (two tiles, as dates) |
| APR within 0.125 point but not 0.01 | `note.aprDiffers` | Your file says {file}. Skip works out {skip}. |
| Payment within 1% (plan 3.8 check 5) | `note.bankPayment` | Skip will use your bank’s payment. |
| Rate above 36% | `note.high` | This rate is unusually high. Check it against your file. |
| Variable rate | `note.variable` | Today’s rate. It can change. |
| C2: OCR confidence low | `note.hardToRead` | This part was hard to read. Check it against your file. |
| Source: Money received, Assumed | `note.assumedFunded` | Not in your file. Skip uses a month before the first payment, as the calculator does. |
| Source: method chosen by replay | `note.assumedMethod` | Not stated in your file. {method} gives your bank’s payment, {payment}. |
| Source: Not found | `note.keeps` | Not in your file. The calculator keeps what it has. |
| Source: statement, loan amount | `note.statementAmount` | A statement shows what’s left to pay, not what you borrowed. |

### 8.6 How Skip checked

A card with 16pt by 18pt padding. Its title `loanUpload.checks.title` "How Skip checked" is 15/600.

Each line is a 17pt mark glyph, then a 14/600 name, then a 13 `muted` comparison, `checks.compare` "Your file {file} ·
Skip {skip}". A check the file can't support uses CircleDashed and `checks.notInFile` "Not in your file".

| Line | Key | Shown when |
| --- | --- | --- |
| APR | `checks.apr` "APR" (a disclosure term, kept as written in every language, as the result card does) | an APR is printed |
| Monthly payment | `loan.monthlyPayment` | a payment is printed |
| Last payment | `checks.lastPayment` "Last payment" | a different final payment is printed |
| Finance charge | `checks.financeCharge` "Finance charge" | printed |
| Total of payments | `checks.totalOfPayments` "Total of payments" | always; "Not in your file" when absent |

This card describes **the file against Skip's maths**. It does not change when the person edits a row; the hero and
the marks do.

### 8.7 Warning block

The block sits inside the hero, 14pt below the lines. It has a 14pt radius, an 8% `attention` fill and 12pt by 14pt
padding. In it: a CircleAlert 18 in `attention` (Info for the statement), a title (14/600 `ink`) and a body (13 `body`).

| Case (plan) | Title key / English | Body key / English |
| --- | --- | --- |
| Variable rate | `warn.estimateTitle` Skip’s schedule will be an estimate | `warn.variable` Your rate can change. Skip uses today’s rate, {rate}, so later payments and balances may differ from your bank’s. |
| Not monthly | same title | `warn.notMonthly` Your loan is paid {frequency}. The calculator works in monthly payments, so Skip fills the amount and rate only. (`freq.biweekly` every two weeks, `freq.semimonthly` twice a month, `freq.weekly` every week) |
| Canadian half-yearly | same title | `warn.halfYearly` Your rate is compounded half-yearly. Skip uses your bank’s payment, {payment}. Balances may drift from your bank’s by a few cents a month. |
| Mexican IVA on interest | same title | `warn.iva` Your payments include IVA on the interest. Skip uses your bank’s payment, {payment}, but works out the interest without the tax. |
| Precomputed / Rule of 78 | same title | `warn.precomputed` Your loan’s interest is worked out upfront. Skip fills the amount only. |
| Monthly statement | `warn.statementTitle` This looks like a monthly statement | `warn.statement` A statement fills the rate and payment only. For the rest, upload your loan agreement. |
| Another currency | `warn.currencyTitle` Amounts in {currency} | `warn.currency` Shown as your file prints them. Skip doesn’t convert them. |
| Pages left unread | `warn.truncatedTitle` Skip read the first {count} pages | `warn.truncated` If your loan’s numbers come later in the file, try the loan agreement on its own. |

When more than one applies, the blocks stack 8pt apart, estimate first.

### 8.8 Footer and Fill

**Footer:** `loanUpload.review.fill` "Fill the calculator" (primary), then "Not now" (`common.notNow`, a text button).

**Fill with "Check this" rows still open**
- The button is not greyed.
- The `danger` line `loanUpload.review.missing` "To fill the calculator, check: {fields}." appears above the button.
  `{fields}` lists the row labels in page order, joined as the bill form joins them.
- The warning haptic plays.
- The page scrolls to the first open row, and VoiceOver focus moves there after the line is announced.
- The line goes away as soon as the last row is answered (the `settle()` pattern).

**Fill when nothing is open**
- Write the draft (plan 1.8):
  - Checked, Confirmed and Assumed values are applied.
  - Not found rows keep the calculator's values.
  - A payment equal to Skip's own solve sets **no** override. A different one becomes phase B's bank payment.
- Then `router.dismissTo('/loan-calculator')`. The calculator scrolls to the top so the new payment is in view, and
  the toast `toast.loan.filled` "Filled in from your file" appears (done tone).
- **Nothing is saved.**

**Not now** goes to the calculator (`dismissTo`), changing nothing.

### 8.9 Leaving

Back and Not now ask first, but **only** if the person confirmed or changed something on this page. The dialog is the
house discard dialog (`useConfirm`):
- title `loanUpload.leave.title` "Leave without filling the calculator?";
- message `ui.flow.discardMessage` "Nothing you have entered here will be saved.";
- the destructive "Yes" (`common.yes`);
- "Go back" (`ui.flow.stay`).

Leaving an untouched page asks nothing: re-reading a file takes a second.

### 8.10 The four examples in the mock

**Example A: all checked.**
- The file: a personal loan agreement, 4 pages, simple interest.
- The pages: page 1 note terms, page 2 Truth-in-Lending box and schedule, page 3 itemization.

| Row | Value line | Source | Mark |
| --- | --- | --- | --- |
| Loan amount | $25,000.00 → $27,450.00 | Page 1 · “Loan Amount” | Checked |
| Interest rate | 7.50% → 7.49% | Page 1 · “Interest Rate” | Checked |
| Term | 60 payments · same as now | Page 2 · payment schedule · 59 + 1 payments | Checked |
| Monthly payment | $500.95 → $549.94 | Page 2 · payment schedule · last one $549.66 | Checked |
| Money received | 9 Sep 2026 → 15 Sep 2026 | Page 1 · “Date of Note” · printed 09/15/2026 | Checked |
| First payment | 9 Oct 2026 → 15 Oct 2026 | Page 2 · “Monthly beginning 10/15/2026” | Checked |
| Fees paid upfront | None → $450.00 | Page 3 · itemization · “Prepaid Finance Charge” | Checked |
| How interest is charged | Monthly rests → Daily · 365 | Page 1 · “Simple Interest” | Checked |

The checks:

| Check | Your file | Skip |
| --- | --- | --- |
| APR | 8.19% | 8.19% |
| Monthly payment | $549.94 | $549.94 |
| Last payment | $549.66 | $549.66 |
| Finance charge | $5,996.12 | $5,996.12 |
| Total of payments | $32,996.12 | $32,996.12 |

**Example B: partial.**
- The file: a credit-union offer letter, 2 pages, of unknown kind.
- What it prints: "Amount of loan $12,000.00", "Annual percentage rate 9.99%", "36 monthly payments of $387.15", and
  "First payment due 05/11/2026".
- What it does not print: a funding date, fees, or an interest method.

| Row | Mark | Why |
| --- | --- | --- |
| Loan amount | Checked | in the payment replay |
| Interest rate (9.99%) | Check this | `note.aprOnly`: APR only, no total of payments to solve against (rule 3), so it is derived |
| Term (36 payments) | Checked | in the payment replay |
| Monthly payment ($387.15) | Checked | in the payment replay |
| Money received | Assumed | a month before the first payment |
| First payment | Check this | two tiles, "11 May 2026" and "5 Nov 2026" |
| Fees paid upfront | Not found | "None · unchanged" |
| How interest is charged | Assumed | "Monthly rests · same as now": monthly rests gives $387.15 to the cent; daily 365 gives $387.23 or $387.20 |

The checks:

| Check | Your file | Skip |
| --- | --- | --- |
| APR | 9.99% | 9.99% |
| Monthly payment | $387.15 | $387.15 |
| Total of payments | Not in your file | — |

After "Use this" and a tap on 5 Nov 2026:
- both rows become Confirmed by you;
- Money received becomes 5 Oct 2026, still Assumed;
- the hero shows the check badge and the lines "3 checked" and "2 confirmed by you".

**Example C: estimate.**
- The file: a variable-rate loan, 3 pages.
- What it prints: $40,000.00 at a current 8.25%, 120 payments (119 × $490.61 + 1 × $490.71), received 20 Sep 2026,
  first payment 20 Oct 2026, and "Prepaid Finance Charge $0.00". It does not state an interest method.
- All 8 rows are Checked. The interest method is monthly rests: the replay matches the payment, the last payment and
  the total of payments with it.
- The hero shows "Found 8 of 8", "8 checked" and the variable-rate estimate block, never "to the cent".
- The interest rate row carries `note.variable`.

**Example D: monthly statement** (the CEO default).
- The file: a statement for the loan in Example A, printing "Interest Rate 7.49%" and "Regular Payment $549.94".
- Interest rate and Monthly payment are both Check this, with "Use this": a statement has no totals to check
  against.
- Loan amount is Not found, with `note.statementAmount`. Everything else is Not found.
- The hero shows "Found 2 of 8", "2 need a look" and the statement block. See question 5.

---

## 9. One field (`/loan-upload-edit?draft=<id>&field=<f>`)

This is the `EditShell` from `voice-edit.tsx`:
- `FlowHeader`, whose title is the row label;
- a question (20 `muted`, centred, 24pt below the header);
- the control;
- **Done** (`common.done`) pinned.

**Back writes nothing.** **Done** writes the value, sets the mark to Confirmed by you, and pops. There is no toast:
the row's new mark is the feedback, and a toast would land on the review's footer.

Under the figure or above the control is the file's own text: `loanUpload.edit.fromFile` "Your file: {text} · page
{page}" (12 `muted`, centred), or `edit.notInFile` "Not in your file".

| Field | Question key / English | Control | Starts with |
| --- | --- | --- | --- |
| Loan amount | `edit.amount` What’s the loan amount? | `AmountStep` (currency) | the file's value |
| Interest rate | `edit.rate` What rate does your loan charge? | `AmountStep` unit percent | the file's value, every printed decimal |
| Term | `edit.count` How many payments are there? | `AmountStep` with no decimal key | the count |
| Monthly payment | `edit.payment` What’s the monthly payment? | `AmountStep` (currency) | the file's value |
| Money received | `edit.funded` When did you get the money? | `InlineCalendar` (as the voice edit page) | the date, or the assumed date |
| First payment | `edit.first` When is the first payment? | `InlineCalendar` | the date, or the first reading when ambiguous (nothing ticked) |
| Fees paid upfront | `edit.fees` What fees did you pay upfront? | `AmountStep` (currency) | the file's value or 0 |
| How interest is charged | `edit.method` How is interest charged? | the calculator's three choice chips, plus the engine's fourth convention when the file set it; **tapping a chip is the answer** (no Done) | the current method |

- **No clamps.** Typed values may go past the sliders (Founder, 2026-10-09).
- **Rates over 36%** keep `note.high` on the review.
- **A date after the first payment.** Money received may not be after the first payment. The calendar's `minDate` and
  `maxDate` follow from the other date. The reason is shown as a 13pt `muted` line under the calendar:
  `edit.dateOrder` "Money received has to be before the first payment."

**Keypad.** Keys 64pt tall, 16pt radius, ink 5%, 26pt digits, 10.5pt gaps, not scaled (as today).

---

## 10. Back on the calculator

- After Fill, the calculator draws the filled values exactly as if they had been typed.
- **The mock's last frame is Example A applied.** These are the engine's figures:
  - Monthly payment **$549.94**, "60 payments · last on 15 Sep 2031";
  - Borrowed $27,450.00, Interest $5,546.12, Fees at closing $450.00;
  - Total you repay **$32,996.12**, APR 8.19%, with today's APR note;
  - the amount slider at 52.7% on its log scale, chip "$27,450".
- **The toast** sits 92pt above the bottom inset, clear of the footer.
- **Values past a slider's end** (Founder's ruling): the chip shows the value and the thumb rests at the end. That is
  for Dana L.

---

## 11. When it can't be read (`/loan-upload-problem?kind=…`)

Every problem page has one layout:
- header title "Upload your loan file";
- `loan-file-problem` at 88pt, 56pt from the top;
- the title (22/700, centred);
- the body (15 `muted`, centred);
- an optional tips card, 20pt below, in the tip row style of section 4;
- the footer: the primary button, then the text button `problem.enterYourself` "Enter it yourself", which goes to the
  calculator by `dismissTo`.

**Back** goes to Upload your loan file. The primary button is `problem.tryAnother` "Try another file", which opens the
Files picker again, except where the table says otherwise.

| Kind | When (plan) | Title | Body |
| --- | --- | --- | --- |
| `unreadable` | no text (C2: blank, handwriting, too dark; C1: the PDF can't be opened) | We couldn’t read any text in this file | It may be blank, handwritten or too dark to read. **Tips card:** "Use the PDF your bank sent / Or the one in your online banking"; "Ask your bank for a copy / Most can email the loan agreement" |
| `noLoan` | text, but no loan numbers; also the empty result | We couldn’t find loan numbers | Is this your loan agreement or disclosure? That’s the part with the amount, the rate and the payments. |
| `creditCard` | revolving statement | This looks like a credit card statement | The calculator needs a loan with fixed payments, like a car, personal or student loan. |
| `scan` | C1 only: image-only PDF (or an image, if images stay in the picker) | This file is a scan | Reading scans is coming soon. A PDF from your bank’s website or email will work now. |
| `tooBig` | over 50 MB | This file is too big | Skip reads files up to {size}. If your bank sent a long package, try the loan agreement on its own. ({size} = "50 MB", "50 Mo" in French) |
| `notPdf` | not a PDF or image | This file isn’t a PDF | Skip reads PDFs for now. Photos and scans are coming soon. |
| `password` | third wrong password | The password didn’t work | The file is still locked after 3 tries. Check the password with your bank, or ask them for a copy without one. |
| `failure` | native or parser error | **Something went wrong. Please try again.** (`common.failure`, word for word; no body) | — Primary is `common.tryAgain` "Try again", which reopens the picker because the copy was already deleted. The cause goes to Sentry as the fixed `Error('loan-doc-read')`. |

- **The one-failure rule.** Only `failure` uses the house line. The rest are facts the person can act on, so they
  keep their own words, as the rule allows.
- **The plan's password line is changed.** The plan said "Open it in Files and save a copy without a password." I
  could not confirm that iOS Files can save an unlocked copy (it can *lock* a PDF), so I did not put an instruction on
  screen that might not work. Question 6.

---

## 12. The explainer for free accounts

This is the existing `/pro-feature` page with a new `PRO_FEATURES.loanUpload` entry (Dana L, in `pro.ts`). The footer,
price and "Not now" are unchanged: the price is the App Store's, with the `$1.99/mo` fallback. The paywall it leads to
(`/pro`) already shows the price, the term and Restore.

| Part | Key | English |
| --- | --- | --- |
| Icon | — | `FileText` in the 104pt plum circle |
| Example chip | `pro.loanUpload.example` | $27,450.00 · 7.49% · 60 payments (figures formatted by `@/i18n`, not typed into the sentence) |
| Title | `pro.loanUpload.title` | Upload your loan file |
| Subtitle | `pro.loanUpload.subtitle` | Skip reads your bank’s loan file and fills in the calculator, with every number shown for you to check. |
| Point a (FileText) | `pro.loanUpload.a` | Fills in the calculator for you |
| Point b (ListChecks) | `pro.loanUpload.b` | Every number shown for you to check |
| Point c (Smartphone) | `pro.loanUpload.c` | Your file never leaves your phone |

The plan's example read "Amount financed $27,450.00". In Example A the amount financed is $27,000.00 and the loan amount
is $27,450.00, so the chip shows the figures with no label.

---

## 13. Light and dark

- Every page uses tokens only. The mock has dark frames for the card, the upload page, reading, the review and a
  problem page.
- **Gradient icons** switch through `useLoanIcons` / the new pair loader, following the app's Light/Dark/System choice,
  not the phone's.
- **Tints.** In dark, the marks' tints are 14% (green, amber) and 18% (plum). The plum text is `accentOnTint`
  #C79AB6.
- **Toast.** Off-white on dark, as house.
- **Dialog scrim.** 40% black (55% in dark, as drawn).

## 14. Large text

These follow `.claude/team/design/large-text.md`: no ellipsis, no shrinking a single label, and the layout changes
instead. The mock's "Large text" frame is drawn at the ceilings (row 1.4, control 1.3, reading 1.6, heading 1.3).

- **Review row.** One `FitRows` per card.
  - When the label and mark no longer fit on one line, the mark drops under the label, for every row in that card.
  - When old → new no longer fits, the new value takes its own line, led by "→".
  - The pencil stays on the new value's line, top-aligned.
  - "Use this" goes full width, 48pt tall.
  - The two date tiles stack.
- **Hero.** The title wraps. The lines wrap under their icons.
- **Footer.** The missing-rows line wraps. The buttons grow (minimum height, never fixed).
- **Upload page.** The Coming soon pill moves under its text.
- **Card.** Text wraps. The PRO pill does not scale.
- **Edit page.** `AmountFigure`'s bands. The keypad does not scale (as today).

## 15. VoiceOver and motion

- **Review row.** One accessibility element, read as "{label}, {new}, was {old}, {mark phrase}, {where}".
  - Example: "Loan amount, $27,450.00, was $25,000.00, checked against your file, page 1".
  - Custom actions: "Change {label}", plus "Use this" when it applies.
  - Mark phrases: Checked "checked against your file"; Check this "needs a look"; Confirmed "confirmed by you";
    Assumed "assumed"; Not found "not in your file, the calculator keeps {value}". They are
    `loanUpload.a11y.checked` and the rest.
- **Date tiles.** A `radiogroup`. Each tile reads "{date}, one reading of {printed}".
- **Reading.** A progress bar with a value. On finish: the announcement, and focus on the review's title.
- **Fill with gaps.** The line is announced and focus moves to the first open row.
- **Motion.** Under Reduce Motion the progress bar jumps. Page changes use the system defaults.

---

## 16. Where the example figures come from

- **The engine.** I ran `amortise`, `solvePayment` and `truthInLending` through `sucrase-node` on copies of
  `src/lib/{loan,money,apr}.ts`, with the `@/lib` alias rewritten, in the scratchpad.
- **Contrast.** I ran `src/lib/tone.ts` `contrast()` and `src/theme/palette.ts` `buildTokens()` the same way.

| Example | Terms | Engine output |
| --- | --- | --- |
| Calculator "before" (the Founder's PNG) | $25,000, 7.50%, 60, funded 9 Sep 2026, first 9 Oct 2026, monthly rests | payment **$500.95**, last $500.91, interest **$5,056.96**, total $30,056.96. This matches the design to the cent. Under daily 365 it would be $500.97. |
| A | $27,450, 7.49%, 60, funded 15 Sep 2026, first 15 Oct 2026, actual/365, prepaid $450 | 59 × **$549.94** + **$549.66**, last 15 Sep 2031, interest $5,546.12, total of payments **$32,996.12**, amount financed $27,000.00, finance charge **$5,996.12**, APR 8.19117 → **8.19%** |
| B | $12,000, 9.99%, 36, monthly rests; either date reading | 35 × **$387.15** + $387.14, APR 9.98997 → 9.99%. Daily 365 gives $387.23 (11 May) or $387.20 (5 Nov), so only monthly rests reproduces the letter. |
| C | $40,000, 8.25%, 120, funded 20 Sep 2026, first 20 Oct 2026, monthly rests | 119 × **$490.61** + $490.71, interest $18,873.30, total $58,873.30, APR 8.25% (daily 365 would give $490.69) |
| D | statement for A | rate 7.49%; payment $549.94 |

The slider positions use `Slider`'s own log mapping, ln(v/min)/ln(max/min): $25,000 → 51.5% and $27,450 → 52.7%.

---

## 17. Strings

New keys go in `src/i18n/messages/loan-upload.ts`, Dana P's file per the plan. English only here; es and fr follow
from the translator.

- **Explainer keys** (`pro.loanUpload.*`) are in section 12.
- **The toast** is `toast.loan.filled` in `toast.ts`.
- **Reused keys** are named in place: `common.notNow`, `common.done`, `common.yes`, `common.tryAgain`,
  `common.failure`, `ui.flow.stay`, `ui.flow.discardMessage`, `loan.*` labels, and `loan.basis.*` values ("Daily ·
  365", "Monthly rests", "30 / 360").
- **Quotes.** The file's own labels are quoted with `loanUpload.source.quote`: “{text}” in en and es, « {text} » in
  fr.

| Key (`loanUpload.` omitted) | English |
| --- | --- |
| card.title | Upload your loan file |
| card.hint | Upload the loan file you received from your bank |
| card.lockedLabel | Upload your loan file, a Skip Pro feature |
| title | Upload your loan file |
| hero.kicker | From your bank’s loan file |
| hero.title | Skip fills in the calculator |
| hero.line | You check every number before anything changes. |
| best.title | What works best |
| best.agreement / best.agreementNote | Your loan agreement or disclosure / The part that shows the amount, rate and payments |
| best.pdf / best.pdfNote | A PDF from your bank / From online banking, an email or Files |
| best.locked / best.lockedNote | Locked PDFs are fine / Skip asks for the password |
| soon.title / soon.note / soon.pill | Photos and scans / Paper copies and photos of your loan file / Coming soon |
| soon.a11y | Photos and scans, coming soon |
| privacy | Your file is read on this phone and never leaves it. Skip doesn’t keep a copy. |
| choosePdf | Choose a PDF |
| password.title | Locked file |
| password.heading / password.body | This file is locked / Enter its password to open it. |
| password.label / password.placeholder | Password / Enter the file’s password |
| password.show / password.hide | Show password / Hide password |
| password.kept | Skip uses it once to open the file and doesn’t keep it. |
| password.open | Open |
| password.empty | Enter the password. |
| password.wrong | That password didn’t open the file. |
| reading.title | Reading your file |
| reading.opening | Opening your file |
| reading.page | Page {page} of {count} |
| reading.looking | Looking for the amount, rate, payments and dates |
| reading.privateTitle / reading.privateBody | Nothing leaves your phone / Skip reads your file here and forgets it when you’re done. |
| reading.stop | Stop |
| reading.done | Found {found} of {total} numbers |
| review.title / review.subtitle | Check the numbers / Nothing changes until you fill the calculator. |
| review.from | From your loan file · {pages} |
| review.pages | {count} page / {count} pages |
| review.matches | Matches your bank’s figures to the cent |
| review.allChecked | {count} of {total} found and checked against your file’s own totals |
| review.found | Found {found} of {total} |
| review.checked | {count} checked |
| review.needLook | {count} needs a look / {count} need a look |
| review.confirmed | {count} confirmed by you |
| review.useThis | Use this |
| review.useThisDone (announcement) | {label} confirmed |
| review.edit | Change {label} |
| review.chooseReading | {date}, one reading of {printed} |
| review.fill | Fill the calculator |
| review.missing | To fill the calculator, check: {fields}. |
| review.nothingSaved | Filling only changes the calculator. Nothing is saved until you tap Save. |
| leave.title | Leave without filling the calculator? |
| status.checked / .check / .confirmed / .assumed / .notFound | Checked / Check this / Confirmed by you / Assumed / Not found |
| a11y.checked / .check / .confirmed / .assumed / .notFound | checked against your file / needs a look / confirmed by you / assumed / not in your file, the calculator keeps {value} |
| value.payments | {count} payment / {count} payments |
| value.sameAsNow / value.unchanged | same as now / unchanged |
| value.monthBefore | a month before the first payment |
| value.unchosen | not chosen yet |
| source.page | Page {page} |
| source.where.tila / .schedule / .itemization / .table | Truth-in-Lending box / payment schedule / itemization / amortization table |
| source.printed | printed {text} |
| source.split | {first} + {last} payments |
| source.lastOne | last one {amount} |
| source.quote | “{text}” |
| note.* | see the table in 8.5 |
| checks.title | How Skip checked |
| checks.apr / .lastPayment / .financeCharge / .totalOfPayments | APR / Last payment / Finance charge / Total of payments |
| checks.compare | Your file {file} · Skip {skip} |
| checks.notInFile | Not in your file |
| warn.* / freq.* | see the table in 8.7 |
| edit.amount … edit.method | see the table in 9 |
| edit.fromFile / edit.notInFile | Your file: {text} · page {page} / Not in your file |
| edit.dateOrder | Money received has to be before the first payment. |
| problem.tryAnother / problem.enterYourself | Try another file / Enter it yourself |
| problem.unreadable.title / .body | We couldn’t read any text in this file / It may be blank, handwritten or too dark to read. |
| problem.tip.bankPdf / .bankPdfNote | Use the PDF your bank sent / Or the one in your online banking |
| problem.tip.ask / .askNote | Ask your bank for a copy / Most can email the loan agreement |
| problem.noLoan.title / .body | We couldn’t find loan numbers / Is this your loan agreement or disclosure? That’s the part with the amount, the rate and the payments. |
| problem.creditCard.title / .body | This looks like a credit card statement / The calculator needs a loan with fixed payments, like a car, personal or student loan. |
| problem.scan.title / .body | This file is a scan / Reading scans is coming soon. A PDF from your bank’s website or email will work now. |
| problem.tooBig.title / .body | This file is too big / Skip reads files up to {size}. If your bank sent a long package, try the loan agreement on its own. |
| problem.notPdf.title / .body | This file isn’t a PDF / Skip reads PDFs for now. Photos and scans are coming soon. |
| problem.password.title / .body | The password didn’t work / The file is still locked after 3 tries. Check the password with your bank, or ask them for a copy without one. |
| `toast.loan.filled` (toast.ts) | Filled in from your file |

---

## 18. Open questions

**For the Founder**

1. **"Upload" against "never leaves your phone".**
   - I kept your card words and changed only the privacy lines.
   - If "upload" still feels like "send", there is an alternative: "Add your loan file" with the hint "Add the loan
     file you received from your bank". It removes the tension completely.
2. **The icon.** The four-badge page is my stand-in in your palette. Will you draw the real one (light and dark, the
   same four badges)?
3. **The fifth mark, "Confirmed by you".**
   - The alternative is to flip a "Check this" row to "Checked" once the person taps "Use this".
   - I advise against it. "Checked" means Skip's arithmetic agreed, and the person's say-so is a different thing.
4. **The C2 upload page.**
   - With photos and "Scan paper pages" added, there are three ways in. They won't fit one pinned button.
   - My proposal: the footer keeps "Choose a PDF", and "Choose photos" and "Scan paper pages" become two link cards
     where the "Coming soon" card is now. Approve the direction now and I'll draw it with C2.
5. **Monthly statements (the CEO default).**
   - Filling only the rate and payment leaves the calculator's own $25,000 and 60 months beside the bank's $549.94.
   - The schedule then ends early or late until the person enters the original amount and dates.
   - Keep it as is (the block says "For the rest, upload your loan agreement"), or have Fill open the calculator with
     a line asking for the amount?
6. **Locked files after 3 tries.** The plan's "Open it in Files and save a copy without a password" may not be
   possible on iOS. Should Dilip check it on a phone, or keep my wording (ask the bank)?

**For Drew (through Priya)**

7. **Example B's marks.**
   - Amount, term and payment are Checked because the payment replay at the APR matches $387.15. The rate itself
     stays "Check this" (rule 3).
   - Is a field allowed to be Checked by an identity whose rate is still unconfirmed? If not, all four become "Check
     this", and so would Example D-like letters.
8. **The interest method marks.**
   - When the replay picks the method from the payment alone (Example B), I mark it Assumed. When the payment, last
     payment and totals all match (Example C), I mark it Checked.
   - When an auto contract prints no prepaid charge, I'd show fees as "None" Checked if the finance charge equals the
     interest. Confirm both.

**For Dmitri**

9. **Routes and the picker.**
   - A sixth route, `/loan-upload-problem?kind=`, for the problem pages. Or should they be states of the reading
     route?
   - C1's picker type list: `['application/pdf']` only (section 5)?

**For Dana L**

10. **What the calculator shows after Fill.**
    - The review assumes the calculator shows the APR line and note when the rate differs (today's result card).
    - Values past a slider's end show in the chip with the thumb at the end.
    - The interest-method choice must survive phase A under More options (plan 6.3).


> **CANCELLED by the Founder, 2026-10-09:** no PDF/scan upload in the loan section; people edit loan numbers directly (payment overrides). Kept for the record only. Do not build.
