# Receipt corpus: a measurable bench for receipt scanning

Synthetic but realistic receipt photographs, their ground truth, and what Apple Vision makes of
them, so a change to `src/lib/receipt-parser.ts` or `modules/receipt-scanner` is judged by a number.

```
generate.py      draws N receipts as photos (PNG) + <id>.expected.json         (Python 3 + Pillow, no numpy)
ocr-batch.swift  runs Vision over them the way the app does, four ways          (xcrun swiftc, macOS)
build-fixtures.py  folds both into src/__tests__/fixtures/receipts/<id>.json    (compact, committed)
src/__tests__/receipts/accuracy.test.ts  scores the parser, per set; writes numbers only when asked
```

Images and raw Vision output live in `out/` (git-ignored, about 3.3 GB for 300 receipts). Only the
compact fixtures (a few MB) are committed.

## Regenerate everything

```sh
# 1. images + ground truth. Deterministic: same seed, same pixels. ~8 min with --jobs 10.
python3 scripts/receipt-corpus/generate.py --count 300 --seed 20261007 --jobs 12 \
  --sheet scripts/receipt-corpus/out/sheet.png        # optional contact sheet to eyeball

# 2. Vision, up to four passes per image (the fixtures keep three: raw, flat, next). Serial on purpose: the per-pass times are only honest with
#    nothing else running (about 4 s per image, 20 to 50 min for 300). --jobs N exists but spoils the timings.
#    --passes legacy (raw, flat, fixed) or --passes next runs one group; each group is skipped where its
#    files exist, so adding `next` to an old corpus leaves the other three untouched.
xcrun swiftc -O scripts/receipt-corpus/ocr-batch.swift -o scripts/receipt-corpus/out/ocr-batch
scripts/receipt-corpus/out/ocr-batch scripts/receipt-corpus/out/images          # --force to redo

# 3. fixtures: raw, flat and next of each image (`fixed` is not stored; --with-fixed keeps it)
python3 scripts/receipt-corpus/build-fixtures.py

# 4. score the parser
npx jest --ci src/__tests__/receipts
```

`generate.py --only us-004,mx-120` redraws single receipts (each draws from its own seeded
generator, so the rest never change). Re-running step 2 after a macOS update shows what a new
Vision does to the same pixels.

The passes (what the file name means). `raw` and `flat` keep measuring the module as it was before
2026-10-07 so earlier numbers stay comparable; `next` is the module as it is now. `fixed` is still
written by `ocr-batch` but not stored in the fixtures: it matched `flat` to within one receipt (merchant
59.0 against 59.3 on the training set) and `next` replaced it.

| pass    | request                                                                                                        | the app path                        |
| ------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `raw`   | `VNRecognizeTextRequest` as `ReceiptScannerModule.recognize`, languages `en-US,en-CA,fr-CA`, no flattening     | upload (`recognizeReceipt`), before |
| `flat`  | `normalised` + `flattened` (rectangle detection + `CIPerspectiveCorrection`), then the same request            | camera (`captureReceipt`), before   |
| `fixed` | the flattened page with `en-US,fr-FR,es-ES` and `automaticallyDetectsLanguage` (not stored in the fixtures)    | a candidate fix, dropped            |
| `next`  | `read(photo:)`: upright decode, guarded flatten, languages `en-US,es-ES,fr-FR`, lines in reading order (below) | camera and upload (photos), now     |

`next` decodes the photo upright with ImageIO (EXIF orientation applied; past 25 MP it is halved or
quartered, so a 48 MP photo reads at 12 MP; a transparent image is put on white) and flattens it
whenever a page is found. A doubtful crop (the page under 10 percent of the frame, or fewer than 5
lines read from it) also gets the whole photo read, and the whole reading is kept only with more
than 1.5 times the legible characters. When the file records no exposure (a screenshot, a download, a
scan) and the page is square to the frame (every edge within 0.6 degrees: an interface card or a
page border), the whole image is read first and the page is cropped only when no more than 24 legible characters lie
outside it (a clock, a title and a Done button are 14 to 16; a shop and a date above an item card
are 60 or more). The corpus PNGs record no exposure, so every corpus image takes that branch;
photographed pages are never that square (0.74 degrees at the least), so only clean scans and app
receipts read differently from a camera file, and they pay a second Vision pass.
`<name>.next-timing.json` says how many Vision passes ran, which image was kept (`flat`, `whole`,
`flat-checked`, `whole-checked`, and for square pages `whole-square`, `flat-square`,
`whole-square-checked`), `fromCamera`, `skewDegrees` and `outsideCharacters`. `nextMs` includes
the decode; `readMs` leaves it out and is the one to compare with the legacy `flatMs`.

`ocr-batch.swift` copies the module's request settings and its image functions statement for
statement (CGImage/CIImage in place of UIImage; the upload path's ImageIO decode is the same call on
both); a difference between iOS and macOS Vision models is the one thing it cannot reproduce, so
re-measure on a device before trusting an absolute number.

## Reading the results

`npx jest --ci src/__tests__/receipts` prints percent-correct tables (overall, then by country,
language, market, header style, distortion, kind, total layout, total word, date format, date kind
and stored orientation) for each pass and set. **It writes nothing by default.** Ask for the numbers:

- `RECEIPT_BASELINE_OUT=/tmp/numbers.json` writes them there: the tables plus how often Vision read
  the answer at all and the parser then picked it (`funnel`), what `flattened` did to the page
  (`flatten`), what `next` did (`nextPass`), the 15 most common merchant failure modes with example OCR
  lines (`merchantFailureModes`), OCR milliseconds and parse time.
- `RECEIPT_BASELINE_WRITE=1` writes them over `src/__tests__/fixtures/receipts/baseline.json`. That
  file is the **frozen baseline of the original parser** (commit `c7a607c`, header in its `_about`)
  and the only copy; refreeze it on purpose, never as a side effect of `npm test`.
- `RECEIPT_RESULTS_OUT=/tmp/each.json` also dumps every receipt's parsed merchant, total, date and
  failure reason. `RECEIPT_FIXTURES` points the bench at another fixture folder, and
  `RECEIPT_PARSER` at another version of the parser (below).

The first describe never fails on accuracy; the others keep the harness honest (fixtures load, ground
truth is complete, no parse throws, each under 250 ms best of three, scoring rules behave). The parser
is told `today` is 2026-10-07 and `Date` is held there while it runs, so date numbers do not move with
the calendar. The written baseline is in `.claude/team/dev/receipt-scanning-baseline.md`.

## What is in the corpus

300 receipts: US 60 (English), Canada 30 English + 30 Quebec French (some bilingual, GST/HST/PST,
TPS/TVQ, postal codes, `12,99 $`), UK 60 (GBP, VAT, DD/MM/YYYY), Mexico 60 (Spanish, IVA, RFC, day
first), Australia 60 (GST included, ABN, `TAX INVOICE`). About 17 brands per market, real names as
test data; streets, phone numbers (fiction ranges), tax ids and card digits are invented.

Twenty frames (four per market, each its own paper width, font, column count, header, item format,
tender style and footer) times eight receipt kinds (grocery, restaurant with tip variants, fuel,
pharmacy, retail, card slip, long with 60-84 items, short) times item/price/date/store data.
All money is integer cents; tax is rounded half-up per line group, so every printed total is the
sum of its parts.

Header styles (`headerStyle`): `big-centred`, `same-size` (name no bigger than the address),
`split-two-lines` (`THE HOME` / `DEPOT`), `slogan-above`, `store-id-above`, `lowercase-mixed`,
`boxed-name`, and `logo-only` (a drawn graphic, not text; the name is in the legal-entity line, a
web address or a thank-you line in about half and printed nowhere in the rest).

Total layouts (`totalLayout`): `inline` (label left, amount right), `leaders` (dotted), `nextline`
(label, then the amount on the next line); the mark is before, after or absent; 34 receipts carry
no "TOTAL" word at all (`AMOUNT`, `PAID`, `VISA`, `EFTPOS`, `À PAYER`, `IMPORTE`...); 49 totals are
1,000 or more.

Photos: 3024 px wide like a 12 MP iPhone shot (`--width` changes it; blur and shadow scale with
it). Paper on wood, dark cloth, coloured or light surfaces, rotation up to 6 degrees, mild
perspective, blur 0-1.5 px (at 1800 px), grain, JPEG 30-96, faded thermal print, soft shadow and
lighting gradient. `clean` (15 percent) is a flat scan or screenshot at 1-2x the printed raster.
40 percent of the photographs are stored the way an iPhone stores a portrait shot: a landscape
pixel buffer plus EXIF orientation 6 (`exifOrientation`). The camera path undoes that
(`normalised`); the upload path (`recognizeReceipt`) does not, and Vision then reports the
geometry in the sideways frame, so the `raw` pass shows what an uploaded photo does to the parser.
The canvas grows taller (up to 1:2.2) for long receipts so the whole slip stays in frame, which
also means long receipts come out narrower than the 40-90 percent of width the rest fill (see
`photo.fill`).

## Holdout and hard sets

Two more sets sit beside the 300 (the training set; its images are byte-identical to before). Ids
start `hold-` and `hard-`, the fixture format and labelling rules are the same, and the parser must
not be tuned against them: they exist to show how much of a gain is real.

**holdout** (151): a different seed, and layouts, brands and fonts the training set never had.
Thirteen hand-built layout families (fast-food kiosk slip, coffee shop with order number and loyalty
lines, pharmacy with Rx lines and coupons, fuel pump slip, restaurant check with itemised modifiers
and a blank tip line, card slip with a handwritten tip and signature, department store with
multi-line discounts and returns, hardware with SKU columns, taxi or rail, ATM, card terminal,
supermarket with a savings summary, and a Canadian bilingual till), each instantiated per market with
its own fonts, column width, paper width (58 or 80 mm) and total style (plain, bold, boxed,
inverse, double rule), so every market has at least twelve frames of its own. About twenty new brands
per market, none in the training set. Large sans-serif store names, and 26 digital receipts (an
email, an app screen, a PDF-like page; white page, "Your receipt from X", "Order #", proportional
fonts, dates such as "Oct 6, 2026", "6 oct. 2026", "06/10/2026") in all five markets and three
languages.

**hard** (80): photographs under stress, half from the training layouts and half from the holdout
ones. Each carries one to three of `small` (receipt 20-40 percent of the width), `glare`, `crease`,
`fold` (a band of items hidden), `shadow` (heavy), `motion` (blur), `faded` (very faint thermal
print), `two` (a second receipt behind it, partly overlapping), `bgtext` (a newspaper or handwritten
notes behind the paper) and `angle25` (held at about 25 degrees), and 55 percent are stored
sideways with EXIF 6 or 8. Glare and folds are kept off the name and the total.

```sh
python3 scripts/receipt-corpus/generate_sets.py --set holdout --jobs 10     # out/holdout, about 6 min
python3 scripts/receipt-corpus/generate_sets.py --set hard --jobs 10        # out/hard, about 3 min
scripts/receipt-corpus/out/ocr-batch scripts/receipt-corpus/out/holdout     # serial, about 10 min
scripts/receipt-corpus/out/ocr-batch scripts/receipt-corpus/out/hard
python3 scripts/receipt-corpus/build-fixtures.py --images scripts/receipt-corpus/out/holdout
python3 scripts/receipt-corpus/build-fixtures.py --images scripts/receipt-corpus/out/hard
```

The extra fields on `expected.json` of the new sets are `set`, and for hard `stress` (the list above),
`source` (`training-frame` or `holdout-frame`) and `fade`. The test reports the three sets separately
(`training`, `holdout`, `hard`) and, when asked, writes the training numbers to the top of the baseline file as
before, with `holdout`, `hard` and a `sets` summary beside them. To measure another version of the
parser, for example the original, put it inside the repo tree (module resolution needs
`node_modules` above it) and set `RECEIPT_PARSER`:

```sh
mkdir -p scripts/receipt-corpus/out/parser-v0
git show c7a607c:src/lib/receipt-parser.ts > scripts/receipt-corpus/out/parser-v0/receipt-parser.ts
RECEIPT_PARSER=scripts/receipt-corpus/out/parser-v0/receipt-parser.ts RECEIPT_BASELINE_OUT=/tmp/v0.json \
  npx jest --ci src/__tests__/receipts
```

**Hand-written adversarial receipts.** `adversarial-fixtures.py` writes two receipts that are lines, not
images, into `src/__tests__/fixtures/receipts/adversarial/` (a folder the flat loaders of the parser's own
accuracy test never open; ids `adv-...`): an app's order screen on a bordered card whose page title is
taller than the shop's name, and a gift-card receipt that labels its total `BALANCE` beside a larger gift
card balance. They are assertions, not measurements: every field on every pass must be read. A field that
fails today is listed in the fixture's `knownFailing` as `field:pass` and runs as `it.failing`, which
passes while it is wrong and fails the day it is fixed (remove the mark with the fix). The original
parser fails both (the app title as the shop; the 174.84 balance as the total); the parser in the tree
reads both correctly, so nothing is marked today.

**minimumTextHeight.** `ocr-min-text-height.swift` re-reads photographs with different
`minimumTextHeight` values (raw and flattened) and `compare-min-text-height.py` tabulates the line
counts and whether the printed total and name are still found:

```sh
xcrun swiftc -O scripts/receipt-corpus/ocr-min-text-height.swift -o scripts/receipt-corpus/out/ocr-mth
scripts/receipt-corpus/out/ocr-mth scripts/receipt-corpus/out/hard --heights 0.008,0.003,0.001
python3 scripts/receipt-corpus/compare-min-text-height.py scripts/receipt-corpus/out/hard --subset small
```

## Labelling rules (expected.json)

- `merchant`: the trading name as a person would write it ("The Home Depot", "Réno-Dépôt"), or
  `null` when the receipt prints no name as text anywhere (a drawn logo and nothing else).
  Scoring: case, accent and punctuation insensitive; a leading THE and trailing legal or
  store-type words (INC, LTD, CORPORATION, STORES, SUPERCENTER, S.A. DE C.V....) are ignored; a
  bare web address counts as the shop. "THE HOME" or "DEPOT" alone is wrong. For `null`, correct
  means the parser returned nothing: a confident wrong name is a failure.
- `total`, `totalCents`: the amount actually charged. After a printed tip, the second TOTAL. For a
  slip with the tip and total lines left blank (`tip: blank`) or only suggested tips, the printed
  total before tip. Scored to the cent.
- `date` (`yyyy-mm-dd`): the purchase date, always 2026-01-01 to 2026-10-06. A footer "RETURN BY"
  date is a decoy (see `notes`). Day-first and month-first numeric dates are judged against the
  expected value, so `07/10/2026` on a Mexican receipt is 7 October.
- `last4`: card digits printed, else `null` (extra, not in the headline).
- `country` (US CA UK MX AU), `language` (en fr es), `market` (CA is split `CA_en`/`CA_fr`),
  `headerStyle`, `distortion` (clean light medium heavy), `kind`, `template`, `totalLayout`,
  `totalMark`, `wordless`, `dateFormat`, `datePrinted`, `totalPrinted` (the amount as printed, for
  checking whether Vision read it), `nameRows` (the printed lines that carry the name), `notes`,
  `photo` (canvas, fill, rotation, blur, noise, JPEG quality, paper corners).

Fixtures round geometry to 3 decimals and keep two candidates per line. `y` is top-down as the
module returns it.
