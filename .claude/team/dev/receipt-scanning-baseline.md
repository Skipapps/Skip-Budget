# Receipt scanning: baseline accuracy of the current pipeline

2026-10-07, Theo (testing). Branch `receipt-scanning`, worktree `SkipBudget-scan`. Nothing in
`src/lib/receipt-parser.ts`, `src/api/scan.ts` or the native module was changed.

## Headline

On 300 synthetic-but-realistic receipt photos (5 markets, 6 market-languages, 12 MP), the shipped
camera path (`flat` = `normalised` + `flattened` + Vision + `parseReceiptFromLines`) is right on:

| field                            | raw (upload path) | **flat (camera path)** | fixed (candidate) |
| -------------------------------- | ----------------- | ---------------------- | ----------------- |
| merchant, all 300                | 42.7%             | **59.3%**              | 59.0%             |
| merchant, 273 with a printed name | 46.9%            | 64.8%                  | 64.5%             |
| merchant, 27 with no printed name (correct = returned nothing) | 0.0% | 3.7%      | 3.7%              |
| total, to the cent               | 73.3%             | **89.3%**              | 89.3%             |
| date, exact                      | 63.3%             | **62.3%**              | 62.3%             |
| all three right                  | 18.7%             | 33.3%                  | 33.3%             |
| last four digits (extra)         | 83.7%             | 81.3%                  | 80.7%             |

Wrong rather than blank: of the 300 flat merchants, 118 are confidently wrong and 4 blank; of the
totals, 20 wrong and 12 blank; of the dates, 66 wrong and 47 blank. The app fills a wrong store
without any signal.

**Your Founder's "about zero" is not reproduced.** On this corpus the store name is right 59% of
the time on the camera path. Whatever drives the real-world result is not something the corpus
models; see "What this bench cannot tell you".

## Where the accuracy is lost

Honest ranking, biggest first (flat path unless said):

1. **The parser, for the merchant.** Vision read the printed name in 94.9% of the 273 receipts
   that print one, and the parser then picked it only 68.3% of those times. Of the 122 flat
   merchant failures: 38 are plain header misses (name read at the top, another line chosen), 27
   are receipts whose name is only in the legal line, a web address or "thank you for shopping
   at" (the parser reads only the top 35 percent of the page), 26 are names split over two lines
   (`THE HOME` / `DEPOT`, 0 of 26 correct), 26 are receipts that print no name at all (the parser
   never says "unknown": 26 of 27 got a confident wrong store), and only **5 are Vision not
   reading the name**. Vision is about 4 percent of the merchant loss.
2. **The parser, for the date.** Vision read the date in 97% of receipts; the parser is right on
   64% of those. Numeric day-first dates that are ambiguous (day and month both 12 or below, 67
   receipts, all of UK/MX/AU and some Canadian): **0 of 67** because it reads 07/10 as 10 July.
   Month names: 34% (see the date table). `YYYY/MM/DD`: 0 of 10. The only strong cell is US-style
   numeric dates (96.7% in the US).
3. **The upload path (`raw`) geometry, not Vision.** `recognizeReceipt` hands Vision `cgImage`
   with orientation `.up` and no `normalised`. A phone portrait photo is stored sideways with
   EXIF 6; Vision still reads the words but reports geometry in the sideways frame (`height`
   becomes line length, `y` stays constant). On the 113 sideways photos raw merchant is 28.3%
   against 62.8% flat, raw total 62.8% against 92.0%. Rotation and perspective hurt the row
   logic even when upright (upright photos: raw total 78.3% against flat 91.6%). This is a defect
   in the upload path as written; whether the file the image picker hands back keeps the EXIF
   flag was **not verified**.
4. **Totals.** Flat is 89.3%. Vision read the total in 96.0%; the parser is right on 93.1% of
   those. The 32 misses: French amounts (10 of 32 are CA_fr: `$` read as its own observation
   beside `12,97`, or `$ 31,47` with the dollar sign first), a 9.7 million dollar total built from
   digits in noise (`au-255`), item-line amounts taken for the total. In the raw pass totals of
   5.56 trillion (`us-053`) and 771 billion (`us-010`) come out of the `max amount` fallback.
5. **`flattened`.** It helps far more than it hurts (see below).
6. **Vision's language list.** No effect (59.0% against 59.3%); see below.

## The 15 most common merchant failure modes (flat path)

Counts out of 300 receipts (122 failures in all). "OCR top" are Vision's first lines in reading
order. Full examples for flat, raw and fixed are in `baseline.json` (`merchantFailureModes`).

| # | n | failure mode | example: expected, parser returned, OCR top |
| - | - | ------------ | ------------------------------------------- |
| 1 | 22 | Name split over two lines; only one returned | `au-272` Dan Murphy's, got `MURPHY'S`; `TAX INVOICE / DAN / MURPHY'S / 403 Victoria Rd`. `mx-212` Farmacias Guadalajara, got `FARMACIAS` |
| 2 | 14 | Name read at the top; an address or city line chosen | `au-296` BP, got `HOBART TAS 7000`; `TAX INVOICE / BP / 94 Burke Rd / HOBART TAS 7000`. `mx-232` 7-Eleven, got `Puebla, Pue.`. When name and address are printed the same size the parser takes the taller box, and a line with commas and descenders has one |
| 3 | 10 | Nothing printed as a name; an address or city line returned | `au-277` (none), got `SYONEY NSW 2000`; `mx-233` (none), got `Merida, Yuc.` |
| 4 | 6 | Name read; an item or price line chosen | `au-274` Coles, got `1.96 N`; `uk-150` Tesco, got `2 e 2.76`. Long receipts: the top 35 percent of a tall page holds items |
| 5 | 5 | Logo only, name only in a web address; address returned | `ca-en-077` Loblaws, got `Fredericton NB E2B 4G4` (the name is in `www.loblaws.ca` in the footer) |
| 6 | 5 | Name read; another multi-word line (slogan, item) chosen | `au-253` Woolworths, got `Potato Chips 175G`; `ca-fr-100` Walmart, got `9676, chemin Sainte-Foy` |
| 7 | 5 | Name read; other text chosen | `au-260` Woolworths, got `BLOCK 500G`; `uk-128` asda, got `HMN` |
| 8 | 5 | Logo only, name only in "thank you for shopping at"; address returned | `ca-fr-108` Super C, got `4107, rue Saint-Denis`; `mx-235` Pemex, got `Tijuana, B.C.` |
| 9 | 4 | Nothing printed; an item line returned | `au-256` (none), got `0.906 kg @ 6.02/kg` |
| 10 | 4 | Name misread by Vision, parser returned the misreading | `au-291` Big W, got `BIG` (read as `BIG` / `W`); `mx-237` Office Depot, got `OFFICE DEPOI` |
| 11 | 4 | Logo only, name only in the footer; nothing returned | `ca-fr-118` Jean Coutu, `uk-141` Wagamama: the flattening cropped to a small inner rectangle and Vision returned no lines |
| 12 | 3 | Name read; a till or register line chosen | `au-271` BP, got `TILL 15`; `uk-126` BP, got `183 Mill Lane` (BP is two letters, the parser needs 3) |
| 13 | 3 | Nothing printed; a multi-word line returned | `au-281` (none), got `DATE: 10 Feb 2026`; `ca-en-081` (none), got `3275 Lake Bivd` |
| 14 | 3 | Name read; a date or time line chosen | `ca-en-074` Tim Hortons, got `Apr 06, 2026 - 1:55 PM` |
| 15 | 3 | Name read; a store-number line chosen | `ca-fr-099` St-Hubert, got `#52307 LUCAS` (`ST-HUBERT` matches the parser's street words, `st`); `ca-fr-116` RONA, got `#56995 AVA` (a taller box) |

Two more that fall outside the top 15: a logo graphic read as letters (`OIII`, `IIIO`, `O11I`) is
the tallest line at the top and is returned as the store in 5 receipts (`au-267`, `ca-en-080`,
`uk-134`, `uk-164`, `us-009`); and Vision sometimes returns Cyrillic look-alikes (`РЕMEX`, `BР`):
59 of 14,351 flat lines contain Cyrillic letters, and one was returned as the store in 3 receipts
(`mx-185`, `mx-240`, `uk-152`), which can never match a catalogue name.

On the raw path the order changes (item and date lines dominate because geometry is sideways):
19 "other text", 17 split, 16 date or time, 15 item or price, 12 multi-word, 10 address.

## Merchant accuracy by header style (flat / raw)

| header style | n | flat | raw |
| ------------ | - | ---- | --- |
| big centred name | 54 | 96.3% | 77.8% |
| slogan or "welcome" above | 30 | 90.0% | 53.3% |
| store number or tax id above | 30 | 90.0% | 43.3% |
| name in a box | 35 | 85.7% | 65.7% |
| lower or mixed case | 35 | 77.1% | 57.1% |
| same size as the address | 35 | **37.1%** | 34.3% |
| split over two lines | 26 | **0.0%** | 0.0% |
| logo only | 55 | **3.6%** | 3.6% |
|  - name printed nowhere (expected null) | 27 | 3.7% | 0.0% |
|  - name in the legal line | 7 | 14.3% | 28.6% |
|  - name in a thank-you line | 11 | 0.0% | 0.0% |
|  - name in a web address | 10 | 0.0% | 0.0% |

Without logo-only and split names, flat accuracy on the 219 "ordinary" headers is 80.4% (raw
57.5%).

## Other slices (flat: merchant / total / date)

- Country: US 63.3 / 90.0 / 96.7; AU 63.3 / 95.0 / 56.7; UK 58.3 / 86.7 / 56.7; CA 58.3 / 81.7 /
  53.3; MX 53.3 / 93.3 / 48.3. Quebec French (30): 53.3 / **66.7** / 43.3.
- Total layout: next-line 96.3; inline 87.8; dotted leaders 88.0. No "TOTAL" word (34): 100.0
  (the largest-amount fallback lands on it). With the word: 88.0.
- Distortion: clean scans 43.2 / 75.0 / 61.4 (flatten hurts, below); light 61.1 / 96.7 / 63.3;
  medium 69.8 / 90.6 / 66.0; heavy 50.0 / 86.7 / 55.0.
- Kind: fuel merchant 43.3; long (60+ items) 45.0; pharmacy 50.0; retail 70.0.
- Date by kind: ISO `YYYY-MM-DD` 100%; `YYYY/MM/DD` 0%; `DD/MM/YYYY` with day above 12 98%;
  numeric month-first ambiguous 93%; **numeric day-first ambiguous 0%**; month name 34%
  (`DD-MMM-YYYY` 0%, `DD Mon YYYY` 46%, `Mon DD, YYYY` 67%, French `6 févr. 2026` 50%).

The named-month misses are a real parser bug, not Vision: the regex's `\s` spans lines, so the
joined text matches junk first (`ABN 94 651`, `01\nCURRYS\n193`) and `parseDate` never tries the real
`25 Jul 2026` (it returns undefined for `au-249` although `parseDate('25 Jul 2026')` works alone).

## What `flattened` does

- It finds a page in 96.5% of the 256 photographs (247). By geometry it cut the header in 1 photo,
  the footer in 0, a side in 1; no crop was under 60% of the paper.
- Compared with `raw`, a name that Vision read in raw is missing from flat for 10 receipts: 5
  photographs and 5 clean scans; the reverse (flat reads it, raw does not) happens 4 times. The
  total is lost the same way for 7 receipts (2 photographs, 5 clean scans) and gained 3 times.
  Photographs where the name was lost: `mx-198`, `mx-215`, `mx-240`, `uk-140`, `us-035` (`us-035` is
  a nonsense quad on a heavy fuel slip: a 6043 x 2737 crop of a 3024 x 5385 photo). Most of the
  rest are Vision reading the warped crop differently, not the crop cutting the line off.
- On clean scans or screenshots it finds a page in only 23 of 44, and 6 of those (13.6%) crop to a
  small inner rectangle (a box or barcode) and leave Vision 0 or 1 lines (`ca-fr-118`, `mx-231`,
  `uk-141`, `us-013`, `us-037`, `au-267`). That only matters if the camera path is ever applied to a
  picked file or a scan.
- Net effect on the 256 photographs: total +20 points (71.5% to 91.8%), merchant +19 (43.4% to
  62.1%); on the 143 upright ones alone total +13 (78.3% to 91.6%) and merchant +6 (55.2% to
  61.5%). The rest of the raw-to-flat gap is the EXIF rotation. It is the part of the pipeline
  that is working.

## Vision language list (`fixed` pass)

`en-US,fr-FR,es-ES` with `automaticallyDetectsLanguage` changes almost nothing (merchant 59.0 vs
59.3, total identical, date identical; French merchant 50.0 vs 53.3). It is not a lever.
`en-CA` and `fr-CA` are not supported tags, but they are **not an error**: on macOS 26.7 and in
an iOS 26.5 Simulator process Vision accepts `["en-US","en-CA","fr-CA"]` silently and returns the
same lines as `["en-US"]` (a probe compiled for `x86_64-apple-ios17.0-simulator`, run in a
throwaway device that was deleted afterwards). On a physical iPhone this was not run.

## OCR time per pass (12 MP images, one at a time)

Measured on an Intel Mac (macOS 26.7.1) that other sessions were also using (load average 4 to
48), so read them as ratios, not as iPhone numbers. 300 images, mean / median / p95 / max in ms:

| pass | mean | median | p95 | max |
| ---- | ---- | ------ | --- | --- |
| raw (Vision only) | 1414 | 1279 | 2606 | 4286 |
| flat (normalise + flatten + Vision) | 1087 | 960 | 2067 | 5257 |
| of which flatten alone | 155 | 150 | 319 | 462 |
| of which normalise (only EXIF-rotated photos) | 27 | 0 | 107 | 233 |
| fixed (same flat page, other languages) | 1151 | 1013 | 2300 | 5120 |

`raw` is slower than `flat` because it reads the larger uncropped image and also pays the lazy
decode of the PNG (the flat pass reuses the decoded pixels). A 40-image re-time with the machine
quieter gave raw 1197, flat 916, fixed 993 mean. The parser takes 0.1 ms on average and 1 ms at
most (6 ms once, in an earlier run).

## What this bench cannot tell you

- **It is synthetic.** Fonts are macOS fonts, paper is flat, there is no glare, curl, folded
  paper, handwriting, thermal speckle at real intensity, or a finger. Real accuracy will be
  lower; the distance to "about zero" is unexplained. The most useful next step is a few dozen
  real receipts (with a label each) dropped into the same harness.
- **Logo share.** 18 percent of the corpus is logo-only. If most real receipts a Founder meets
  (big chains) print a graphic mark, the real share is higher and the ceiling for any
  top-of-page rule is lower.
- **macOS Vision, not iOS on a device.** Same framework, same request, but different hardware
  and possibly different model builds.
- **PNG decode and EXIF.** Photographs are PNG with an eXIf chunk; 40 percent are stored sideways
  (EXIF 6) as an iPhone stores a portrait shot. The camera path undoes that; the share is a
  modelling choice.
- The labels were checked by hand on a sample (tip totals, a no-"TOTAL" retail receipt, French
  amounts); the generator also refuses to write a receipt marked "no name" if the brand's name
  appears in any printed line (this caught a Mexican "facturar" web address).

## Deviations from the brief, and why

- **Rounding.** Fixtures keep x and width at 3 decimals but y and height at 5. At 3 decimals the
  parser answered differently on 38 of 900 receipt-passes (all merchant) than on full precision,
  because it compares line heights within 15 percent and a height is only about 0.01. 3 and 5
  decimals reproduce full precision exactly. Corpus size is 5.8 MB, still under 6.
- **Image size** is 3024 px wide (a 12 MP iPhone shot), not the 1800 px first drawn; at 1800 the
  glyphs were 1.7x too small and the timings meaningless. Long receipts get a taller canvas (up
  to 1:2.2) and so come out narrower than 40 percent of the width; 88 percent of photographs are
  inside 40 to 90 percent.
- **`.prettierignore`** gained `src/__tests__/fixtures/receipts/` and `scripts/receipt-corpus/out/`:
  generated one-line JSON would otherwise fail `npm run format:check`.
- Two harness assertions were widened after the data showed they were wrong, not the data: Vision
  boxes may overhang the frame by up to 0.1 (a bad crop gave `y = -0.024`), and a name match must
  ignore spaces (`BESTBUY`, `MACY 'S`). A `y`-is-top-down check was added so the range check
  cannot hide a flipped axis.

## Reproduce

```sh
python3 scripts/receipt-corpus/generate.py --jobs 10                     # 8 min, deterministic
xcrun swiftc -O scripts/receipt-corpus/ocr-batch.swift -o scripts/receipt-corpus/out/ocr-batch
scripts/receipt-corpus/out/ocr-batch scripts/receipt-corpus/out/images   # 17 min, serial
python3 scripts/receipt-corpus/build-fixtures.py
npx jest --ci src/__tests__/receipts      # prints the tables, writes fixtures/receipts/baseline.json
```

`RECEIPT_RESULTS_OUT=/tmp/results.json npx jest src/__tests__/receipts` also dumps every
receipt's parsed merchant, total, date and failure reason.

## Starting point for the next agent

Measured gains on offer, in the order the numbers say: (1) make the merchant parser abstain when
it is unsure and look beyond the top of the page for "thank you for shopping at X", a legal line
or a web address; (2) join split names; (3) stop trusting box height, which is glyph-dependent,
as font size; (4) fix `parseDate` (region, month names with hyphens or French and Spanish
abbreviations, `YYYY/MM/DD`, line-spanning `\s`); (5) French `$ 31,47` and a separate `$`
observation; (6) normalise the image on the upload path. A Vision language change and the
flattening step are not where the loss is.

---

# Addendum 2026-10-07: the holdout and hard sets

Two new sets sit beside the 300 (training). The training images and ground truth are byte-identical to
before (all 300 regenerated and compared). All numbers below are the ORIGINAL parser, commit `c7a607c`
(`git show c7a607c:src/lib/receipt-parser.ts`), because the parser in the tree has since been changed:
run `RECEIPT_PARSER=<that file, inside the repo tree, e.g. scripts/receipt-corpus/out/parser-v0/receipt-parser.ts>`.
They are frozen in `src/__tests__/fixtures/receipts/baseline.json` (see the later addendum: a normal test run no
longer rewrites it; it used to live in `scripts/receipt-corpus/baseline-v0.json`, now removed).

## What was added

- **holdout, 151 receipts** (`hold-*`): seed 20261108 against 20261007; 13 new layout families (fast-food kiosk,
  coffee shop, pharmacy with Rx lines and coupons, fuel pump slip, restaurant check with a blank tip line, card slip
  with a handwritten tip and signature, department store with multi-line discounts and returns, hardware with SKU
  columns, taxi or rail, ATM, card terminal, supermarket savings, Canadian bilingual) instantiated per market with its
  own fonts, column widths (24 to 56), 58 or 80 mm paper and total style (plain, bold, boxed, inverse, double rule):
  12 frames per market, 13 in Canada; about 20 new brands per market, none in the training set (the test checks
  that no template and no shop is shared); store names in large sans-serif type; 26 digital receipts (email, app
  screen, PDF page; proportional fonts) in all five markets and three languages. A test asserts all of this.
- **hard, 80 receipts** (`hard-*`): half on training layouts, half on holdout layouts. One to three stressors each:
  `small` (receipt 20 to 40 percent of the width), `glare`, `crease`, `fold`, heavy `shadow`, `motion` blur, very
  `faded` print, `two` receipts overlapping, `bgtext` (a newspaper or handwritten notes behind), `angle25`; 45 receipts
  stored sideways (32 with EXIF 6, 13 with 8). Each stressor appears on 10 to 18 receipts. Glare and folds are kept
  off the name and the total, so a miss is not a hidden answer.
- Fixtures: 3.3 MB for both sets (whole folder 9.1 MB). Pass definitions are the same three; Vision was run with the
  same compiled binary as the first 300.

## Numbers, original parser (percent correct: raw / flat / fixed)

| set | n | merchant | total | date | all three (flat) |
| --- | - | -------- | ----- | ---- | ---------------- |
| training | 300 | 42.7 / **59.3** / 59.0 | 73.3 / **89.3** / 89.3 | 63.3 / **62.3** / 62.3 | 33.3 |
| holdout | 151 | 51.7 / **70.9** / 70.9 | 73.5 / **78.1** / 78.1 | 71.5 / **70.2** / 70.2 | 41.1 |
| hard | 80 | 28.7 / **53.8** / 53.8 | 50.0 / **75.0** / 75.0 | 55.0 / **53.8** / 53.8 | 17.5 |

Holdout: Vision read the printed name in 97.8% of the 139 receipts that print one and the parser picked it 78.7% of
those times; it read the total in 96.0% and was right on 81.4%; the date 98.7% and 71.1%. Hard (flat): name read 96.0%,
right 60.6%; total read 91.3%, right 82.2%; date read 88.8% (the faded and motion receipts cost real reads), right 60.6%.

**Surprise: the holdout merchant number is higher than the training one (70.9 against 59.3), the total lower
(78.1 against 89.3).** It is the mix, not luck: the holdout has far fewer split names and logo-only receipts (5% and 16%
against 9% and 18%) and a large-sans header that is easy (36 receipts, 97.2% merchant), while its new layouts hurt
totals. Do not compare a headline across sets; compare slices.

## Holdout by layout family (flat: merchant / total / date)

| family | n | merchant | total | date | what happens |
| ------ | - | -------- | ----- | ---- | ------------ |
| digital (email, app, PDF) | 26 | 100 | 100 | 76.9 | name is in "Your receipt from X" and the header; dates like `Oct 6, 2026` and `6 oct. 2026` lose 23 points |
| transport | 10 | 90 | 90 | 80 | |
| bilingual Canadian | 4 | 100 | 100 | 50 | |
| terminal | 11 | 63.6 | 90.9 | 90.9 | |
| market2 (savings summary) | 10 | 60 | 90 | 80 | |
| check, blank tip line | 10 | 50 | 90 | 80 | expected is the printed total before tip |
| coffee | 11 | 63.6 | 81.8 | 63.6 | |
| dept (discounts, returns) | 9 | 66.7 | 77.8 | 66.7 | |
| pump | 10 | 70 | 70 | 50 | |
| hardware (SKU columns) | 10 | 70 | 70 | 50 | |
| kiosk | 10 | **40** | 70 | 50 | 3 of the 6 misses are the receipts that print no name (`Kiosk 19`, `Kiosk 32`, a logo read as `O\|II`); the rest `PARA LLEVAR`, a Cyrillic `КFC` and one name lost |
| check, signed (handwritten tip) | 10 | 70 | **50** | 70 | Vision read the handwritten total on 6 of 10; the parser got 5 |
| rx | 10 | 50 | 70 | 80 | a `FSA/HSA ELIGIBLE TOTAL` line printed after the real total wins "last labelled total" in 2 of the 3 misses (the third is a French receipt with no amount found) |
| ATM | 10 | 70 | **20** | 70 | the available balance is larger than the withdrawal and wins the largest-amount fallback |

By header: sans-large 97.2 (36), boxed 90.0, slogan 100, store-id 100, big-centred 73.3, lowercase 70.0, same-size 60.0,
split 0 (8), logo-only 4.2 (24); the 12 receipts that print no name at all scored 0 (all 12 got a confident wrong
store). By country (merchant / total / date): US 70.0 / 86.7 / 93.3, CA 83.9 / 71.0 / 64.5, UK 66.7 / 83.3 / 73.3,
AU 76.7 / 76.7 / 60.0, MX 56.7 / 73.3 / 60.0. Day-first ambiguous numeric dates: 0 of 17 again. Stored sideways (EXIF 6):
raw merchant 25.4 against 62.7 flat, as in the training set.

Top holdout merchant failures (flat; 44 in all, 12 of them receipts that print no name): 8 one line of a split name
(`HOG'S BREATH`); 5 an address chosen over a name that was read (`El Fogoncito` -> `Leon, Gto.`); 6 receipts that print no
name returning `Kiosk 19` or a logo read as `O|II`; 3 a check or store-number line (`Boston Pizza` -> `Check #55618`); 4 logo-only receipts whose name is
in a footer.

## Hard by stressor (flat: merchant / total / date, n)

| stressor | n | merchant | total | date | raw merchant / total |
| -------- | - | -------- | ----- | ---- | -------------------- |
| shadow (heavy) | 17 | 64.7 | **88.2** | 52.9 | 29.4 / 52.9 |
| small (20 to 40% of the width) | 16 | 62.5 | 81.3 | 56.3 | 50.0 / 56.3 |
| bgtext | 14 | 57.1 | 85.7 | 50.0 | 28.6 / 64.3 |
| fold | 14 | 50.0 | 78.6 | 50.0 | 14.3 / 35.7 |
| glare | 10 | 50.0 | 70.0 | 50.0 | 40.0 / 40.0 |
| angle25 | 12 | 41.7 | 66.7 | 66.7 | 25.0 / 25.0 |
| crease | 12 | **33.3** | 66.7 | 83.3 | 25.0 / 41.7 |
| faded (very faint print) | 18 | 83.3 | 61.1 | **27.8** | 38.9 / 38.9 |
| motion blur | 10 | 50.0 | 60.0 | **30.0** | 30.0 / 50.0 |
| two receipts | 13 | **38.5** | **53.8** | 38.5 | 7.7 / 46.2 |

- **Faded print is read for the name (big type survives) but not for amounts and dates**: merchant 83.3, date 27.8.
  Motion blur the same way: date 30.0.
- **Two overlapping receipts** are the worst case for totals (53.8): the second receipt's lines are in the output, and
  the parser can return the other shop (`hard-uk-004`: Barclays expected, `Shell` returned).
- **Page detection**: `flattened` finds a page in only 63 of 80 hard photos (78.8%, against 96.5% in the training set), and
  3 crops are much larger than the paper. It still helps (raw to flat: merchant 28.7 to 53.8, total 50.0 to 75.0).
- **Background text** adds noise lines (a newspaper behind the receipt): the parser once returned a line of newsprint
  (`weather ... winter`) as the store.
- EXIF 8: raw merchant 7.7% against 76.9% flat (same hazard as EXIF 6, the other way round).
- Training-frame receipts on a hard photo: merchant 47.5, total 77.5, date 67.5; holdout-frame: 60.0 / 72.5 / 40.0.

## Does `minimumTextHeight = 0.008` lose text lines? No.

`ocr-min-text-height.swift` re-reads photos with 0.008, 0.003 and 0.001 (raw and flattened). On the 16 hard photos with the
receipt at 22 to 39 percent of the frame width: **26.4 lines on average at 0.003 and 0.001, 26.2 at 0.008 (raw)**; flat 31.9
at all three. The printed total is found on 13 of 16 at 0.003 and 12 at 0.008 (raw), 14 of 16 at all three (flat); the name
on 12 of 15 at all three (raw), 14 of 15 (flat). The 1 receipt difference and a few lines of text in either direction are
Vision's run-to-run variation, not the threshold. On the training set's 20 long receipts: raw 152.4 lines at 0.003 and
0.001 against 152.7 at 0.008, flat 168.1 against 167.3, and 4 (raw) and 7 (flat) receipts have more lines at 0.008 than
at 0.001. The setting is not a cut on box height: at 0.008 Vision still returns lines with boxes as small as 0.0029, and
83% of the flattened long-receipt lines are below 0.008.

What does lose lines on small receipts is pixels, not the threshold, and flattening repairs it: on the tiniest photos raw
reads 7 to 9 lines where the flattened crop reads 22 to 23 (`hard-us-070`, `hard-us-072`, `hard-ca-fr-069`: 8 raw, 39
flat). The module's 0.008 can be left alone.

## What was checked and what was not

- The first 300 are unchanged: images md5-identical, `expected.json` identical, same baseline numbers (42.7 / 59.3 / 59.0).
- Mistakes of mine that the harness caught and I fixed: a US holdout brand (McDonald's) that is in the training set under
  Australia; a department-store receipt whose return and coupon netted to a negative total (three more department-store receipts changed once the amounts were capped);
  a tip computed 100 times too large on digital and taxi receipts; a pharmacy "FSA/HSA eligible total" larger than the
  receipt's own total (capped); baseline files loading as fixtures.
- The timing check ("each parse under 50 ms") now takes the best of three runs: one 147 ms sample appeared once under a
  whole suite running in parallel, on a receipt that parses in under 1 ms; a parser that is really slow stays slow.
- Not verified on a device; handwriting is a handwriting font (Bradley Hand, Noteworthy, Marker Felt), which is
  more regular than a pen; the stress effects (glare, folds) are drawn, not photographed.

## Snapshot of the parser in the tree, for scale (a moving target)

Measured on 2026-10-07 at about 11:00 against the same fixtures (not part of the baseline):

| set | merchant raw / flat | total | date |
| --- | ------------------- | ----- | ---- |
| training | 95.3 / 96.0 | 91.3 / 97.0 | 98.0 / 97.0 |
| holdout | 92.0 / 96.0 | 92.0 / 96.0 | 97.4 / 96.0 |
| hard | 63.7 / 76.3 | 73.8 / 86.3 | 80.0 / 86.3 |

The in-progress parser generalises to the holdout (96.0 against 96.0 on training, flat merchant); the hard set is where it
still loses most, with `two` receipts, creases, motion and faded print the likely culprits.

---

# Addendum 2026-10-07 (later): harness follow-ups

- **One frozen baseline.** `src/__tests__/fixtures/receipts/baseline.json` is the frozen baseline of the ORIGINAL parser
  (commit `c7a607c`), with a header (`_about`) saying so; it is the only copy (the duplicate in `scripts/receipt-corpus/`
  is gone). `npm test` no longer writes anything. Numbers are written only on request: `RECEIPT_BASELINE_OUT=<file>`, or
  `RECEIPT_BASELINE_WRITE=1` to refreeze over `baseline.json`. Verified: a full default run leaves its md5 unchanged.
- **`today` pinned** to 2026-10-07: passed to the parser as `{ today }` and `Date` is held there while it runs (the original
  parser has no such option and asks the clock). The raw and flat numbers did not move (the real clock reads the same day).
- **Parse-time limit** is 250 ms best of three (it was 50 ms). A parse takes a few ms (slowest in the bench under 10); busy
  machines add tens of ms of noise (147 ms once), a quadratic or backtracking pattern on a 300-line receipt costs seconds.
- **`next` pass in the fixtures**, the three passes now being `raw`, `flat`, `next` (`build-fixtures.py` reads
  `<id>.next.json` and `<id>.next-timing.json`; `meta.next` keeps what the pass did). The old `fixed` pass is no longer stored
  (it matched `flat` to within one receipt, merchant 59.0 against 59.3; nothing else read it: the parser's accuracy test reads
  raw and flat only). Fixture size was 8.94 MB and is 9.09 MB, because `next` takes about the space `fixed` freed; the
  baseline file is 0.9 MB. `raw`, `flat` and the ground truth of all 531 fixtures are byte-identical to before.
- **Two hand-written adversarial receipts** in `fixtures/receipts/adversarial/` (a folder the parser's own accuracy test
  does not read, so its numbers do not move): `adv-card-app` (an app screen on a bordered card: the page title
  "Purchase details" and a promo line are taller than the shop's name inside the card; the flattened crop is the card alone) and
  `adv-gift-card` (a till that labels its total BALANCE, paid with a gift card whose remaining balance 174.84, a loyalty balance
  and a rewards balance print below it, with BALANCE DUE 0.00). Written from the one-line descriptions I was given, not from
  the reviewer's own text. The original parser fails both (the title as the shop on the raw pass; 174.84 as the total on all
  three); the parser in the tree reads every field on every pass, so nothing is marked known-failing. Assertions run as
  `it.failing` when marked, so a mark that outlives its fix fails.

## Numbers by set, passes raw / flat / next (percent correct)

| set | parser | merchant | total | date |
| --- | ------ | -------- | ----- | ---- |
| training (300) | original, frozen | 42.7 / 59.3 / 60.3 | 73.3 / 89.3 / 90.7 | 63.3 / 62.3 / 64.0 |
| holdout (151) | original, frozen | 51.7 / 70.9 / 72.2 | 73.5 / 78.1 / 76.8 | 71.5 / 70.2 / 71.5 |
| hard (80) | original, frozen | 28.7 / 53.8 / 52.5 | 50.0 / 75.0 / 75.0 | 55.0 / 53.8 / 52.5 |
| training | the tree, 14:20 | 95.3 / 96.0 / **97.0** | 89.3 / 96.0 / **97.0** | 98.0 / 97.0 / **99.0** |
| holdout | the tree, 14:20 | 93.4 / 96.7 / **96.7** | 90.7 / 95.4 / **96.0** | 97.4 / 96.0 / **97.4** |
| hard | the tree, 14:20 | 63.7 / 76.3 / **75.0** | 65.0 / 77.5 / **76.3** | 80.0 / 86.3 / **85.0** |

The tree's parser is Drew's work in progress and was being edited while this was measured (its own hard-set total floor, 82%,
failed at 77.5% at that moment, and one of its rule tests failed): treat those three rows as a snapshot. `next` equals
`flat` on photographs (original parser, training total 91.8 on the 256 photographs for both) and recovers the clean scans (total 75.0 to
84.1 on the 44 scans), which is where its training gain (89.3 to 90.7) comes from.
