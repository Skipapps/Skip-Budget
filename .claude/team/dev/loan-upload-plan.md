# Loan file upload (phase C): build plan for the Founder's approval

Dmitri (development lead), 2026-10-09. **This is a plan. Nothing gets built until the Founder approves it.**
It covers decision 4 of `.claude/team/dev/loan-redesign-brief.md`.

What I read for it:
- `modules/receipt-scanner/*`, `src/api/scan.ts`, and the upload path in `src/app/add-receipt.tsx`;
- `src/lib/{loan,apr,money,typed-amount,receipt-parser,voice-draft,wall,pro-status}.ts`;
- the three loan screens, the `loans` migration, the receipt-scanning baseline, and the team log.

Every Expo call below was checked twice: in docs.expo.dev/versions/v57.0.0 (document-picker, imagepicker, and the
Modules API page), and against the installed types (expo-document-picker 57.0.1, expo-image-picker 57.0.14,
expo-modules-core 57.0.12).

## 0. In one paragraph

A Pro-only card at the bottom of the loan calculator opens a full page. There the person picks a PDF from Files or
photos from Photos. The phone reads the file itself: a PDF's own text layer through PDFKit, and scanned pages or
photos through Apple Vision, as the receipt reader does.

Fixed rules then find the loan figures. There is no AI and no server. The figures are:
- the amount;
- the rate and the APR;
- the number of payments and the payment;
- the first payment date and the date the money was received;
- the fees.

The rules check these figures against each other and against Skip's own loan engine. A review page then shows each
number, where it was found, and whether it was checked. Nothing reaches the calculator until the person has seen it.
A number that fails a check is never filled without a visible flag. The file is never uploaded or kept.

**Order:** PDFs with a text layer ship first (C1). Scans and photos follow (C2) once they pass their accuracy targets.

## 1. What the person sees, screen by screen

Every step is a full pushed page: no sheets and no popovers. The `ask` dialog that add-receipt uses to choose
Photos or Files is replaced here by two choices on a page. Primary buttons sit in `Screen`'s pinned `footer`.

**1.1 Calculator card** (Dana L, within her phase A rewrite)
- Placed below "Payment schedule", above the pinned Save.
- Title "Upload your loan file". Hint "Upload the loan file you received from your bank".
- Free account: shows a PRO pill and opens `/pro-feature?id=loanUpload`.
- Pro not yet known (`ready` false): drawn but inert, like `VoiceFab`.
- Pro account: opens `/loan-upload`.
- Hidden on a native build that has no `readDocument`.
- It has no design yet (question 6), and needs a light and a dark gradient icon pair.

**1.2 `/loan-upload`**
- Two big choices: **Choose a PDF**, and **Choose photos** (C2).
- One line on what reads best: the loan agreement or disclosure, ideally a PDF from the bank's website.
- The privacy line: "Your file is read on this phone. It is never uploaded or saved."
- From C2, photo tips: flat, four corners in view, one page per photo, up to 10 pages in order.
- `useProGate('loanUpload')` covers deep links.

**1.3 Pickers** (the system's own screens)
- PDF: `DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true,
  multiple: false })`. The cache copy gives PDFKit a local file and downloads iCloud files.
- Photos (C2): `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true,
  selectionLimit: 10, orderedSelection: true, quality: 1 })`. `orderedSelection` needs iOS 15+; the app's floor is
  15.1.
- No permission request: the v57 docs say images need none. Unlike add-receipt, this skips
  `requestMediaLibraryPermissionsAsync`, so there is no prompt and no receipt-only permission string.
- Cancel returns to 1.2 silently.

**1.4 `/loan-upload-password`** (locked PDFs only)
- "This file is locked with a password", a secure field, and **Open**.
- The password lives only in component state and is passed to native once. It is never stored, logged or put in
  route params.
- After 3 wrong tries: "Open it in Files and save a copy without a password."

**1.5 `/loan-upload-reading`**
- "Reading your file…" with "Page 2 of 6", from native progress events.
- A pinned **Stop**; Stop or Back cancels between pages.
- When reading finishes, the review page *replaces* this one, so Back from review goes to 1.2.
- VoiceOver announces "Found 6 of 8 numbers". Reduce Motion is honoured.

**1.6 `/loan-upload-review`, "Check the numbers"**

*Summary.* "Found 6 of 8 · 5 checked against your document's own totals". The strong form, "Matches your bank's
figures to the cent", appears only when the engine replay passes (3.8, check 5).

*Warnings*, as they apply: variable rate; not paid monthly; Canadian half-yearly compounding; Mexican IVA on
interest; a monthly statement or credit card; another currency (shown, never converted); pages left unread by the
cap.

*Rows*, in calculator order: Loan amount, Interest rate, Number of payments, Monthly payment, First payment, Money
received, and Fees (the prepaid finance charge). Two more lines serve only as checks: APR (the document's against
Skip's) and Total of payments. Each row shows:
- the found value beside the calculator's current one: "$25,000 → $27,450.00";
- where it was found: "Page 1 · next to “Amount Financed” · printed $27,450.00", quoted in the document's language;
- a mark;
- a pencil that opens 1.7.

*Marks* always pair an icon with a word, never colour alone:
- **Checked**: it passed an arithmetic check.
- **Check this**: it was read, but nothing could check it or a check failed.
- **Not found**.
- **Assumed**: for example, money received taken as one month before the first payment, as the calculator does today.

An ambiguous value shows both readings as choices: "3 Apr 2026" / "4 Mar 2026".

*Footer.* **Fill the calculator** applies the Checked and confirmed fields. Each "Check this" row needs **Use this**
or an edit first; until then the button lists what still needs a look, as Save lists what is missing. A Not found
field leaves the calculator's value alone, and the page says so. **Not now** changes nothing.

**1.7 `/loan-upload-edit?draft=<id>&field=<f>`**
- One field per full page, with the app's own controls: the keypad step for amounts and rate, a number page for the
  count, `InlineCalendar` for dates.
- Done marks the field "Confirmed by you". Back writes nothing (the `/voice-edit` pattern).

**1.8 Apply**
- The draft travels in an in-memory slot (3.11). `router.dismissTo('/loan-calculator')`, and the calculator takes the
  draft on focus, then clears it.
- Toast: "Filled in from your file".
- A printed payment that differs from Skip's becomes the phase B bank payment. A different first payment becomes a
  per-payment override, once Drew's API exists.
- Nothing is saved: Save stays the person's own step.

**1.9 Empty and failure states.** Each offers **Try another file** and **Enter it yourself**.

| Case | What the page says |
| --- | --- |
| No text (blank, handwriting, too dark) | "We couldn't read any text in this file" + tips |
| Text but no loan numbers | "We couldn't find loan numbers. Is this your loan agreement or disclosure?" |
| Credit card or other revolving statement | "This looks like a credit card statement. The calculator needs a loan with fixed payments." |
| Scanned PDF, or image from Files, in C1 | "This file is a scan. Reading scans is coming soon." (removed in C2) |
| Over 50 MB, or not a PDF or image | Says which, in its own words: a fact the person can fix, not a failure |
| Native or parser error | `FAILURE_MESSAGE` (one-failure rule); the cause goes to Sentry without document text |

## 2. Native work (Dilip)

**2.1 Where.** Extend the `ReceiptScanner` module rather than add a sibling. Its Vision, EXIF-upright, flatten and
reading-order code is tuned and measured, and a sibling would duplicate it.
- New file: `modules/receipt-scanner/ios/DocumentReader.swift`. The podspec's `**/*.swift` glob picks it up.
- `ReceiptScannerModule.swift` changes in two ways only:
  - it registers the new functions and the event;
  - `recognize(in:)`, `read(photo:fromCamera:)` and `uprightPhoto` go from `fileprivate` to `internal`, because a new
    file cannot see `fileprivate`.
- `recognize(in:)` gains an options parameter (minimum text height, languages) whose defaults equal today's values.
  **Gate:** Theo's receipt bench output stays byte-identical.
- The module keeps its name. Renaming would break `requireOptionalNativeModule('ReceiptScanner')` and the pod.

**2.2 API** (`modules/receipt-scanner/index.ts`)
```ts
type DocumentLine = TextLine & { page: number; source: 'text' | 'ocr' };   // TextLine as today: 0–1, top-left
type DocumentRead = {
  pages: { index: number; source: 'text' | 'ocr' | 'skipped'; width: number; height: number }[];
  lines: DocumentLine[];   pageCount: number;   truncated: boolean;          // page or time cap hit
};
readDocument(uris: string[], options: { password?: string; ocr: boolean }): Promise<DocumentRead>;
cancelDocumentRead(): void;
hasDocumentReading(): boolean;   // typeof native.readDocument === 'function'
// Event 'onDocumentProgress' { page, of }: Events() + sendEvent, per the Modules API "Sending events" section.
```
Rejections are fixed codes with fixed English text: `ERR_LOCKED`, `ERR_WRONG_PASSWORD`, `ERR_UNREADABLE`,
`ERR_TOO_LARGE`, `ERR_CANCELLED`. They never carry file text, a file name or a path.

**2.3 Text PDFs (PDFKit)**
- Open with `PDFDocument(url:)`. If `isLocked`, call `unlock(withPassword:)`, or reject with `ERR_LOCKED`.
- Per page, use `PDFPage.string`. (`PDFDocument.string` is the whole file; "per page" means `PDFPage`.)
- Tables need positions, so lines are built from `characterBounds(at:)`:
  - characters sharing a baseline band form a run;
  - a run splits at a gap over about 1.5 average glyph widths, so the four columns of a TILA box become four cells;
  - runs come back in Vision's `TextLine` shape, ordered by the existing `inReadingOrder`.
- If that is slow on a 60-page file, fall back to `selectionsByLine()`.
- Use `.cropBox`, apply `page.rotation`, and normalise with NFKC (ligatures, U+00A0, the French thousands space
  U+202F).
- **Quality test, per page.** A page is "text" only with at least 200 characters and no more than 5% U+FFFD,
  private-use or control characters. Any other page is a scan page: skipped in C1, sent to OCR in C2.
- In C2, a text page whose numbers fail every check is also OCR'd, and the reading that passes wins. Scanner apps
  write invisible OCR layers, and those can be wrong.

**2.4 Scans and photos (Vision)**
- **PDF pages** render one at a time, each inside an `autoreleasepool`, at about 300 dpi (`format.scale = 1`). A Letter
  page is then 2550 × 3300, about 34 MB. The receipt render, at 2× device scale, makes about 17 MP from the same
  page.
- **Photos** go through the existing `read(photo:fromCamera:)`: EXIF upright, a 25 MP cap, flatten, and the
  whole-photo fallback. A Letter page's 0.77 aspect sits inside its 0.15–1.0 window.
- **Minimum text height.** The receipt value, 0.008 of the image height, is about 6.3 pt on a Letter page, and loan
  fine print runs 6–7 pt. Benchmark 0.008, 0.004 and 0. If small print is still lost, test two overlapping
  half-pages.
- **Everything else** stays as for receipts: `.accurate`, revision 3, en-US/es-ES/fr-FR, and language correction off
  (in Dilip's bench it rewrote 231 digit lines).

**2.5 Limits** (starting values, to be tuned on the phone)

| Limit | Value | Over it |
| --- | --- | --- |
| File size | 50 MB (`asset.size` and native) | `ERR_TOO_LARGE` |
| Text pages | 200 (milliseconds each) | `truncated` + warning |
| OCR pages | 10 PDF pages or photos, in order; stop early once every key field is checked | `truncated` |
| Time | text 5 s; OCR 30 s in all | stop, return what was read, `truncated` |
| Memory | one page bitmap at a time; peak under 300 MB on the iPhone 13 Pro Max | — |
| Cancel | flag checked between pages and between Vision requests | `ERR_CANCELLED` (JS treats it as a back-out) |

**2.6 Owner-password PDFs** (`isEncrypted` but not `isLocked`, `allowsCopying` false) open without a password.
Whether PDFKit still returns their text is **not verified**. If it does not, C2 sends them to OCR. No Info.plist
string changes.

**2.7 Clean-up.** After every read (success, failure or cancel), native deletes each input file, but only if its
path lies inside the app's Caches directory, where both pickers put their copies. Nothing is written anywhere else.

**2.8 Build**
- No `app.json` change, so **no prebuild**. A new Swift file in a local pod needs only `pod install`, using
  `~/.gem/ruby/2.6.0/bin/pod` with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`.
- Check the artefact, not the exit code: `ios/Podfile.lock`, `strings` on the binary for `readDocument`, and
  `** BUILD SUCCEEDED **` in the log.
- If a prebuild is ever needed:
  1. Back up `ios/.xcode.env.local` to the scratchpad.
  2. Run a **clean** prebuild. `--no-clean` crashes in `@bacons/apple-targets` 5.0.0.
  3. Restore the file.
  4. Run `pod install`. Expect about 15 minutes.
- Release builds need the Sentry token; device builds need `-allowProvisioningUpdates`.
- Aim for **one native build** that carries both the text and the OCR paths: C1's JS uses text only, and C2 turns
  OCR on. Budget a second build in case C2 tuning moves a native threshold.
- PDFKit and Vision run in the Simulator, so the Founder can review there by dragging PDFs into Files.

**2.9 Bench parity.** The receipt bench used a macOS port of the reader, and the port drifted from the app. This time
the reading core compiles unchanged for both iOS and macOS: PDFKit text, page render via `CGContext` (not
`UIGraphicsImageRenderer`), the Vision request, and reading order. `scripts/loan-corpus/read-batch.swift` links that
same file.

## 3. The parser (Diego and Drew; pure TypeScript, no React, no network)

**3.1 Layout and owners.** All in `src/lib/loan-doc/`.
- **Diego:** `types`, `normalise`, `layout` (rows, columns, tables), `labels` (per document kind), `classify`, and
  `locate` (label → value candidates).
- **Drew:** `numbers` (money, percent, count, term), `dates`, `checks` (identities, engine replay, rate solving), and
  `decide` (statuses, warnings, the calculator contract).
- `index.ts` exports `readLoanDocument(read, options): LoanDocResult`. **It never throws:** bad input gives Not found
  fields plus a warning.
- `receipt-parser.ts` stays untouched. Its readers are internal and tuned to receipts, and its baseline must not move.
- Reused: `toCents`, `sumMoney`, `roundMoney` (`money.ts`); `solvePayment`, `amortise`, `addMonths`, `daysBetween`
  (`loan.ts`); `truthInLending` (`apr.ts`); `getLocaleSnapshot()` for the region default, as `receiptParseOptions`
  uses it.
- `date.ts` has no parser, so `dates.ts` is new code with its own fixtures.

**3.2 Documents.** Dictionaries are keyed by document **kind**, not just language, because the same words mean
different things in different countries. In Australia, "annual percentage rate" is the interest rate and the
"comparison rate" includes fees; in the US the APR includes fees.

| Kind | Recognised by | Key labels | Traps |
| --- | --- | --- | --- |
| US TILA box (auto RISC, personal; Reg Z §1026.18, model form H-2) | ANNUAL PERCENTAGE RATE, FINANCE CHARGE, Amount Financed, Total of Payments | those four; "Your payment schedule will be": Number / Amount / When Payments Are Due; Itemization; Contract date | four side-by-side columns with values in a row below; schedule "59 · $443.21 · Monthly beginning 01/15/2026" + "1 · $443.18"; Total Sale Price and the down payment are not the loan |
| US mortgage LE / CD (§1026.37/.38) | "Closing Disclosure", "Loan Terms", "Projected Payments" | Loan Amount, Interest Rate, Monthly Principal & Interest, Loan Term, Disbursement Date; page 5: APR, Finance Charge, Amount Financed, Total of Payments | "Estimated Total Monthly Payment" includes escrow and is **never** the payment; "Can this amount increase after closing? YES" means a variable rate |
| Bank amortisation table | columns No. / Date / Payment / Interest / Principal / Balance | first row, row count, opening balance | best case: every row replays to the cent |
| Canada, English | "cost of borrowing" | Principal amount, Annual interest rate, APR, Term, Amortization period, Payment amount and frequency | **term is not amortisation** (5-year term, 25-year mortgage = 300 months); "compounded semi-annually"; bi-weekly payments |
| Quebec | "taux de crédit", "frais de crédit", "obligation totale" | capital net, taux d'intérêt annuel, taux de crédit (works like an APR), nombre et montant des versements, date du premier versement | "25 000,00 $", "7,49 %", ISO dates |
| Mexico (carátula, tabla de amortización) | "CAT", "Costo Anual Total", "Monto del crédito" | Monto del crédito, Tasa de interés anual ordinaria, Plazo, Pago mensual/quincenal, Comisión por apertura, Fecha de disposición, Monto total a pagar | **CAT is never the rate**, nor is the tasa moratoria; IVA on interest; quincenal payroll loans |
| UK SECCI / agreement | "Total amount of credit", "Duration of the credit agreement" | Borrowing rate, APR, Instalments, Total amount payable | "Representative APR" is advertising; dates are day-first |
| Australia financial table | "Amount of credit", "Comparison rate" | Annual percentage rate (= interest rate), Repayments, Total interest charges, Credit fees and charges | see above |
| Monthly statement | Statement Date, Payment Due Date, Principal Balance | rate, regular payment, balance, maturity | "Amount Due" can include late fees; there is no original amount (question 2) |

A document of unknown kind gets a generic label search at lower strength. Its fields are never Checked unless one of
the 3.8 identities holds.

**3.3 Normalise.** NFKC, then case and accents folded. Cyrillic and Greek look-alikes are mapped to Latin with a copy
of the receipt parser's table (copied, not imported). Hyphenated breaks are re-joined, and so are labels split over
two lines of one column ("Total of" / "Payments"). The document's language is detected from its labels, whatever
language the app is set to.

**3.4 Layout.** Rows group by centre within half a line height, then split at gaps. A label owns a value, in this
order of preference:
1. in its own cell: "Amount Financed: $27,450.00";
2. the nearest typed cell to its right, stopping at the next label;
3. the cell below in its column (50%+ x-overlap, within 4 rows, stopping at a label) — the TILA box case;
4. in a table, headers found by their words and data cells by column overlap (schedules, amortisation tables).

Prose templates per language catch sentences:
- "60 monthly payments of $443.21 beginning 01/15/2026"
- "48 pagos mensuales de $5,432.10 a partir del 15/01/2026"
- "60 versements mensuels de 443,21 $ à compter du 15 janvier 2026"

Candidates score on geometry, type fit and label strength, minus anti-labels on the same row: maximum, late,
penalty, default, moratoria, estimated total, minimum, representative, comparison, CAT. A value printed twice gains
strength. Two different values at equal strength make the field **Check this**, offering both.

**3.5 Reading values (Drew)**

*Money* becomes integer cents through `toCents`, on the matched digits.
- The decimal mark is decided per document, from its unambiguous tokens. A bare "25,000" in a French document stays
  ambiguous until a check settles it.
- Accepted marks: `$`, `US$`, `MXN`, `M.N.`, `CAD`, `£`, a sign written after the figure, and parentheses for
  negatives.
- **There is no largest-amount fallback:** a loan amount needs a label.

*Percent*: "7.49%", "7,49 %", "6.875%". Every printed decimal is kept (3.11).

*Counts and terms*: "60", "sixty (60)", "sesenta (60)", "60 months", "5 years", "30-year", "48 meses", "60 mois".
Frequency words are read in all three languages: quincenal, catorcenal, bi-weekly, aux deux semaines, and the rest.

*Dates*: "01/15/2026", "January 15, 2026", "15 January 2026", "15 de enero de 2026", "15-ene-2026",
"15 janvier 2026", "2026-01-15". Day/month order is settled, in turn, by:
1. the document itself: its kind and country, any day above 12, month names;
2. the checks (3.8, check 6);
3. the phone's region, only as a last resort.

A date still ambiguous after all three stays **Check this**, with both readings offered. The original receipt parser
got 0 of 67 ambiguous day-first dates right; that must not happen here.

*OCR candidates*: Vision's top three readings per line are kept. When a check fails, a runner-up that satisfies it
wins.

**3.6 Field rules**

*Loan amount* is the note amount the schedule is built on. It is the first of these that exists: "Loan Amount",
"Principal amount", "Monto del crédito" or "Capital"; then Amount Financed plus the prepaid finance charge; then
Amount Financed alone, when no prepaid charge is shown (the usual auto RISC). It is never Total Sale Price, Cash
Price or Total of Payments.

*Fees* (the calculator's `fees`) are prepaid finance charges only: origination fee, points, comisión por apertura. A
documentation fee financed inside the Amount Financed is not one. Any other fees are listed as "found, not used".

*Number of payments* is the sum of the schedule rows; failing that, "Number of Payments" or a term in months; failing
that, years × 12, marked Assumed.

*Payment* is the regular schedule row, or "Monthly Principal & Interest" on a mortgage. A first or last row that
differs is kept separately (1.8).

*First payment* comes from "beginning <date>", "First payment due", "Fecha del primer pago" or "Date du premier
versement".

*Money received* is the disbursement, funding, contract or loan date ("Fecha de disposición", "Date du contrat").
When none is printed, it is Assumed to be a month before the first payment.

*Interest method* is set only when the document says so:
- "simple interest" or "per diem" → actual/365;
- "365/360" → actual/360;
- a US mortgage → monthly;
- "precomputed" or "Rule of 78" → a warning, as unsupported.

Otherwise the replay (3.8, check 5) may choose the method.

**3.7 Interest rate or APR (Drew).** The calculator's rate is the note rate, and the calculator derives its own APR
from the rate and the fees. So:
1. **A labelled note rate** is used. That means Interest Rate, Contract or Simple Interest Rate, Tasa ordinaria, Taux
   d'intérêt, Borrowing rate, or the Australian "annual percentage rate". The printed APR then becomes a check.
2. **No note rate, but the amount, schedule and dates are present:** solve the rate by bisection on `amortise` until
   it reproduces the schedule. The result is Checked only if the replay hits Total of Payments to the cent at the
   rate rounded to 3 decimals; the row then says "worked out from your document's payments".
3. **APR only, no prepaid charge, and no solve possible:** rate = APR, marked Check this, with the note "Your document
   gives the APR only. With no fees it is usually the interest rate."
4. **APR only, with fees above 0:** the rate is **not filled**. The APR shows on its own line.

The rate is never taken from a CAT, a comparison rate, a representative APR, a maximum rate or a penalty rate.

**3.8 Cross-checks.** Each is exact to the cent unless a tolerance is given.
1. Amount Financed + Finance Charge = Total of Payments. This holds for TILA, Quebec, and the Mexican "monto total".
2. The schedule rows, count × amount each, sum to Total of Payments.
3. Number of payments = the sum of the schedule counts = the term in months.
4. Skip's APR (`truthInLending`) against the printed APR:
   - within 0.01 point: Checked;
   - within 0.125 point (the Reg Z tolerance): Check this;
   - beyond that: Check this, with both figures shown.
5. **Engine replay.** For each interest method — the document's own first, then actual/365, monthly, 30/360,
   actual/360 — compare `solvePayment` with the printed payment. Then run `amortise` at the printed payment (phase B)
   and compare the final payment and Total of Payments.
   - Both match to the cent: "Matches your bank's figures to the cent", and that method is set.
   - Within 1%: Check this, with "Skip will use your bank's payment".
   - Beyond 1%: whichever field the other identities point to becomes Check this.
6. **Dates.** Money received ≤ first payment ≤ money received + 75 days. When a final date is printed, the last payment
   must equal `addMonths(first, n − 1)`; this check is also what settles day/month order.
7. **Ranges.** Rate above 0 and at most 100, with "unusually high" above 36. Number of payments from 1 to 480. Nothing
   is clamped (3.11).
8. **Sale totals.** Total Sale Price = Total of Payments + down payment, and the itemisation lines sum to the Amount
   Financed.

**3.9 "Wrong is worse than blank."** These are rules in `decide.ts`, each with its own test.
- **Checked:** read under a known label, of the right type, *and* inside at least one identity that passes.
- **Check this:** any of these:
  - in no identity;
  - an identity failed;
  - OCR confidence under 0.5 (a starting value);
  - two candidates tied;
  - the date is ambiguous;
  - the value was derived (APR as the rate, years × 12).

  A Check this value is never applied until confirmed or edited.
- **Not found:** a value without a label, even one that position or size suggests; there is no largest-number guess.
  A Not found field keeps the calculator's value. Defaults only ever appear as **Assumed**.
- **Nothing is filled** from a document that is not an instalment loan.

**3.10 Loans the engine cannot price exactly** are detected and warned, and never get "to the cent".
- Not monthly: amount and rate only.
- Canadian half-yearly compounding: everything is filled, using the bank's payment, with a warning that balances can
  drift by cents a month.
- Mexican IVA on interest: the bank's payment, with a warning.
- Variable rate: the current rate, with a warning.
- Precomputed or Rule of 78: the amount only.

Exact maths for all of these is C3 engine work.

**3.11 Contract with the calculator.** Drew writes the type now, and Dana L consumes it in phases A and B. The type
is `CalculatorInputs { principal, annualRatePercent, months, firstPaymentOn, fundedOn, fees, basis?, payment?,
paymentOverrides? }`. It is carried by `src/lib/loan-upload-draft.ts`, an in-memory slot keyed by an id and
re-validated on every read and write, like `voice-draft.ts`. Numbers never go in route params, so a crafted link
cannot pre-fill the calculator.

**The calculator clamps today, silently.** Typed amounts are held to 500–1,000,000 and rates to 0–30. A 45% Mexican
loan or a 2,500,000-peso mortgage would be changed without a word. Applying must never clamp: either the caps rise
(question 3), or the row says "The calculator goes up to …".

**The database keeps 3 decimals of rate** (`loans.annual_rate numeric(6,3)`, at most 100). Read and solved rates are
rounded to 3 decimals *before* the replay, so what is saved is what was checked. Real documents that print 4 decimals
would need a migration (Diego). That is not decided.

## 4. Test corpus and accuracy

**4.1 Sets.** Theo builds them with a seeded generator in `scripts/loan-corpus/`, like `scripts/receipt-corpus/`.
- **Training: 200 documents** across the kinds in 3.2. The mix is US 40%, MX 20%, CA-en 15%, QC 10%, UK 8%, AU 7%. Each
  is rendered as a text PDF, as an image-only PDF (200 or 300 dpi, with skew and noise), and in C2 as phone photos
  with the receipt corpus's stressors.
- **Holdout: 100 documents** with new templates, fonts and seeds. A test proves none is shared with training.
- **Hard: 60 photo sets**: angled, shadowed, glare, folded, small text, two pages in one shot, pages out of order.
- **Odd PDFs**: a password copy, an owner-password-only copy, a rotated page, ligatures and per-glyph text, a scan
  with a wrong invisible OCR layer, a 150-page package with the disclosure on page 40.
- **Decoys**: a maximum rate, a 5% late charge, Total Sale Price, Estimated Total Monthly Payment, CAT, comparison
  rate, representative APR, two loans in one file, a credit card statement.
- **Expected values** come from an independent Python decimal implementation, never from `loan.ts`, so the engine is
  not checked against itself.
- **Public real templates**: the CFPB sample Loan Estimate and Closing Disclosure, Reg Z model form H-2, and FCAC and
  CONDUSEF examples where they exist. Each is downloaded into its own directory and read with `python3 -I`.
- **Real documents** (question 5). Above all the Founder's agreement for the 72-month loan; its statement is already
  the ground-truth fixture in `src/lib/loan.test.ts`, so that one file proves the whole path to the cent. Real files
  are anonymised on this Mac and never committed raw.

**4.2 Harness.**
- `read-batch.swift` (2.9) writes one `DocumentRead` JSON per document into `src/__tests__/fixtures/loan-docs/`, which
  goes in `.prettierignore`. Jest then runs without Vision.
- `src/__tests__/loan-docs/accuracy.test.ts` prints tables by field and by slice: kind, country, language, source,
  stressor.
- It freezes the baseline only when `LOAN_BASELINE_WRITE=1` is set, as the receipt harness does.
- Each field is scored right, blank, **wrong but flagged**, or **wrong and not flagged**.
- Speed and memory are measured on the 13 Pro Max.

**4.3 Targets** (holdout set; "right" means exact to the cent, to the day, or to the printed rate)

| Field | Text PDF (C1) | Scanned PDF (C2) | Photo (C2) |
| --- | --- | --- | --- |
| Loan amount; number of payments | 98% | 95% | 90% |
| Rate (read or solved); payment | 97% | 93% | 88% |
| First payment date | 95% | 90% | 80% |
| Money received | 90% | 85% | 75% |
| Fees | 85% | 75% | 65% |

**4.4 Hard gates.** A phase does not ship if any of these fails:
- **Not one wrong value marked Checked**, in any set.
- **Wrong and not flagged:** at most 0.5% per field on text PDFs, and 1% on scans and photos.
- **Receipt bench:** byte-identical.
- **The Founder's own loan,** if supplied, matches its statement to the cent through upload, review, apply and the
  schedule.
- **Speed and memory:** a 10-page text PDF reads in under 1 s; OCR p95 stays under 3 s per page; memory peaks under
  300 MB.

Synthetic results are reported apart from real ones. The receipt bench's synthetic numbers ran well ahead of real
use, so none of these targets says anything about real files until the real set holds at least 20 documents.

## 5. Pro, storage, logs, accessibility, languages

**Pro in the app.** `PRO_FEATURES.loanUpload` gets an icon, the example "Amount financed $27,450.00 · 7.49% · 60
payments", a title, a line, and three points: read on your phone, every number to check, your file is never
uploaded. `useProGate('loanUpload')` sits on every route. A loan filled from a file and saved stays fully usable if
Pro lapses: the wall gates verbs, not nouns.

**Pro on the server: nothing.** Nothing reaches the server before Save, and Save stays free and unchanged. So there is
no count and no migration, and the upload does not use the receipts' 15 uploads a month.

**Storage: the file is not kept** (recommended; the plan assumes it).
- Native code deletes the picker copies (2.7).
- Text and lines exist only inside the read call and the parser.
- The draft holds numbers and printed labels only. It is cleared on Apply, on Not now, and when the flow unmounts.
- Nothing goes to AsyncStorage, the TanStack cache or route params.
- The saved loan has no "from a file" mark and no file name.

**Sentry.**
- Native errors are fixed strings (2.2), and the parser never throws.
- The boundary passes `failureMessage` a fixed `Error('loan-doc-read')`, never the cause's message.
- Nothing is written to `console.*` (text, numbers, file names), because Sentry keeps console breadcrumbs in release
  builds.
- A sentinel-string test runs a document through every failure point and asserts the Sentry mock never receives it.
- No analytics in v1; the app has none.

**Accessibility.**
- Each row is one label, e.g. "Loan amount, $27,450.00, checked against your document's totals, found on page 1".
- Marks are an icon plus a word.
- Figures use `TEXT_CAP` and FitGroup; rows wrap; buttons are pinned.
- Touch targets are at least 44 pt.
- Focus moves and an announcement plays when reading ends. Reduce Motion is honoured.
- Large-text tests as in phase 2b.

**Languages (en/es/fr).**
- New copy goes in a new area, `src/i18n/messages/loan-upload.ts`. Its one-line registration in `messages/index.ts`
  is done by that file's owner.
- `loan.ts` stays with Dana L. Explainer keys go in `pro.ts` once the salary work is committed; the toast key goes in
  `toast.ts`.
- Label dictionaries are data, never `t()`. Printed labels are quoted in the document's own language.

## 6. Phases, owners, estimates, risks

**6.1 Phases** (developer-days; elapsed time assumes parallel work)

| Phase | Scope | Owners (days) | Elapsed |
| --- | --- | --- | --- |
| C0 prep | Founder answers; page designs; corpus generator and harness skeleton; phases A/B land | Theo 4, Paulo 2 | alongside A/B |
| **C1 text PDFs, ships first** | native `readDocument` (text **and** OCR, one build); parser for US TILA, amortisation tables, MX, CA, QC; pages 1.1–1.9 incl. password; explainer; scans say "coming soon" | Dilip 3 + 1 (build, both phones), Diego 4, Drew 4, Dana P 4, Dana L 1, Theo 2, Dmitri 1.5 | 8–10 working days after A/B |
| **C2 scans and photos** | OCR on in JS; Choose photos (up to 10, in order); confidence and candidates; fallback for text layers that lie; mortgage CD; UK and AU; hard set | Dilip 2 (maybe a second build), Diego 3, Drew 3, Dana P 1.5, Theo 3, Dmitri 1 | 6–8 working days |
| C3 later, separate approval | statement balance anchor (`statement_on`/`statement_principal` columns already exist); exact non-monthly, half-yearly and IVA maths; per-row schedule overrides; page crops for "where found"; Scan paper | sized when asked | — |

**6.2 File ownership** (no two people in one file)

| Owner | Files |
| --- | --- |
| Dilip | `modules/receipt-scanner/ios/*`, `modules/receipt-scanner/index.ts` + test, `scripts/loan-corpus/read-batch.swift` |
| Diego | `src/lib/loan-doc/{types,normalise,layout,labels,classify,locate}.ts` + tests, `src/lib/loan-upload-draft.ts`, `src/api/loan-upload.ts` (picker → native → parser → draft) |
| Drew | `src/lib/loan-doc/{numbers,dates,checks,decide,index}.ts` + tests, the `CalculatorInputs` type |
| Dana P | `src/app/loan-upload*.tsx` (5 routes), `src/components/loan-upload/*`, `src/i18n/messages/loan-upload.ts`, `src/__tests__/app/loan-upload-*.test.tsx` (never under `src/app`) |
| Dana L | `loan-calculator.tsx` (card, draft intake), the `PRO_FEATURES` entry, keys in `pro.ts` |
| Theo | `scripts/loan-corpus/*.py`, `src/__tests__/loan-docs/*`, fixtures |

**6.3 Dependencies.**
- **Drew's phase B API.** The replay and "use your bank's payment" need its payment and per-payment overrides.
- **Dana L's phase A calculator.** The design's line "Interest is worked out monthly…" must not remove the
  interest-method choice, because the replay sets it. Keep it under More options; to confirm with Dana L.
- **The salary work.** It must be committed before `pro.ts` is touched.

**6.4 Risks**

| Risk | Mitigation |
| --- | --- |
| A wrong number filled silently | status rules (3.9), the apply gate (1.6), the zero-wrong-Checked gate (4.4) |
| Synthetic accuracy overstates real use (the receipt lesson) | real and public sets reported apart; the Founder's own loan; no accuracy claims in copy |
| Silent calculator clamping; 3-decimal rate in the database | never clamp; replay at 3 decimals; migrate only if real documents need it (3.11) |
| Loans the engine cannot price | detect and warn (3.10); never "to the cent" |
| Receipt-scanner regression from shared code | separate file, unchanged defaults, receipt bench byte-identical as a gate |
| Native build traps | no prebuild; verify Podfile.lock, `strings` and the log; back up `.xcode.env.local` if a prebuild ever happens |
| Memory or time on big files | one page at a time, 300 dpi, page and time caps, Stop |
| A text layer that lies | per-page quality test; OCR fallback when checks fail (C2) |
| Document text leaking to Sentry | fixed error strings, the sentinel test, a review rule |
| Phases A and B still moving | contract type written first (3.11); C1 pages start after A lands |
| Not yet seen on a phone | owner-password PDFs, Vision on full iOS pages, HEIC from Photos: checked on both phones |

## 7. Open questions for the Founder (only those that change the build)

1. **Release order.** Should C1 ship alone (PDFs with a text layer; scans say "coming soon"), or wait for photos and
   scans (C2)? I recommend shipping C1 first.
2. **Monthly statements.** Should a statement fill only the rate and payment, and say the agreement is needed for the
   rest (my recommendation for now)? Or should the calculator also get a "balance on [date]" field? The database
   already has the columns; that would be C3 work.
3. **Calculator limits.** May typed and uploaded values go past the sliders, to amounts over 1,000,000 and rates over
   30%? Mexican personal loans often run 40–90% a year. I recommend yes: the sliders keep their range, and typed
   values go up to what the database allows.
4. **Loans Skip can't price exactly** (paid every two weeks, Canadian half-yearly compounding, Mexican IVA, a variable
   rate). Fill what is safe with a clear warning (my recommendation), or refuse these files?
5. **Real documents.** Can you share your agreement for the 72-month loan, and any others you can collect? They would
   be anonymised on this Mac and never committed raw. Without them every accuracy figure is synthetic.
6. **Design.** Will you design the upload, reading and review pages and the card, as you did for phase A? Or should
   Paulo draft them from section 1 for your approval?
7. **Scan paper pages.** Should there be a third choice that uses Apple's multi-page scanner, already in the app, for
   paper contracts? It would be a small addition to C2.

## Founder approval (2026-10-09)

- **Plan approved.** Ship in two steps: **C1 = text PDFs** as soon as it passes its targets (scans and photos say
  "coming soon"), then **C2 = scanned PDFs and photos** once they pass their own.
- **Typed and uploaded numbers may go beyond the sliders** (amounts over 1,000,000, rates over 30%): sliders keep
  their range; typing or a document can exceed it. The calculator's silent clamps must go (Dana L / Drew).
- **Loans Skip can't price exactly** (bi-weekly, Canadian half-yearly compounding, Mexican tax on interest, variable
  rate): **fill what's safe + a clear warning** that the schedule is an estimate; never refuse.
- **Paulo drafts the upload screens** from this plan in the new loan style; the Founder approves before building.
- CEO defaults (Founder may override): monthly statements fill only the rate and payment for now (no "balance on"
  field until C3); "Scan paper pages" with Apple's document scanner is added in C2.


> **CANCELLED by the Founder, 2026-10-09:** no PDF/scan upload in the loan section; people edit loan numbers directly (payment overrides). Kept for the record only. Do not build.
