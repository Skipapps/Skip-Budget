#!/usr/bin/env python3
"""Two hand-written fixtures for cases a review found, as the lines Vision would hand the parser.

    python3 scripts/receipt-corpus/adversarial-fixtures.py [--out src/__tests__/fixtures/receipts]

There are no images behind them: each line is written out with the position and printed height a
till or an app would give it, label and amount as separate observations on one row (Vision does
that), y top-down. They live in src/__tests__/fixtures/receipts/adversarial/ (a folder the flat
loaders of the receipt parser's accuracy test never open) with ids adv-...; the bench's measured sets
(training, holdout, hard) leave them out, and it checks each one on its own, marking the fields that
fail today as known failing.

  adv-card-app    an app's order screen: a bordered white card on a grey page. The page
                       title above the card ("Purchase details") and a promo line below it are
                       bigger than the shop's name inside the card; the flattened crop is the
                       card alone.
  adv-gift-card   a till receipt that labels its total BALANCE (as some tills do), paid with a
                       gift card whose remaining balance, a loyalty balance and a rewards balance
                       all print below it and are larger than the total, beside "BALANCE DUE 0.00".

The shops, addresses and numbers are invented.
"""

import argparse
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))


class Page:
    """Lines on a page, in fractions of its width and height. aspect = height / width in pixels."""

    def __init__(self, aspect):
        self.aspect = aspect
        self.lines = []

    def width_of(self, text, h):
        return min(0.96, len(text) * 0.5 * h * self.aspect)

    def put(self, text, x, y, h, bold=False):
        self.lines.append(dict(text=text, x=x, y=y, h=h, w=self.width_of(text, h)))

    def center(self, text, y, h, mid=0.5):
        w = self.width_of(text, h)
        self.put(text, mid - w / 2.0, y, h)

    def row(self, left, right, y, h, left_x, right_x):
        """A label and its amount on one row: two observations, the amount right-aligned."""
        self.put(left, left_x, y, h)
        w = self.width_of(right, h)
        self.put(right, right_x - w, y, h)


def lines_from(page, crop=None):
    """Vision-shaped lines. crop = (x0, y0, x1, y1) keeps what is inside and re-measures it."""
    out = []
    for ln in sorted(page.lines, key=lambda l: (round(l["y"], 2), l["x"])):
        x, y, h, w = ln["x"], ln["y"], ln["h"], ln["w"]
        if crop:
            x0, y0, x1, y1 = crop
            if not (x0 <= x <= x1 and y0 <= y <= y1):
                continue
            x, y = (x - x0) / (x1 - x0), (y - y0) / (y1 - y0)
            h, w = h / (y1 - y0), w / (x1 - x0)
        out.append({
            "text": ln["text"], "candidates": [ln["text"]], "confidence": 1,
            "x": round(x, 3), "y": round(y, 5), "width": round(w, 3), "height": round(h, 5),
        })
    return out


def fixture(rid, expected, raw, flat, nxt, meta_extra):
    return {
        "id": rid,
        "expected": expected,
        "meta": {
            "imageWidth": meta_extra["w"], "imageHeight": meta_extra["h"],
            "ms": {"raw": 0, "flat": 0, "next": 0, "flatten": 0},
            "next": {"kept": "flat", "passes": 1, "found": True, "pageShare": meta_extra["share"], "loadMs": 0, "detectMs": 0, "flattenMs": 0, "recognizeMs": 0},
            "flattened": True, "flattenQuad": meta_extra["quad"], "cropWidth": 0, "cropHeight": 0,
        },
        "raw": raw, "flat": flat, "next": nxt,
    }


def base_expected(rid, merchant, total_cents, date, printed_total, date_printed, date_format, name_rows, notes, known, header, last4):
    return {
        "id": rid, "set": "adversarial", "merchant": merchant, "total": total_cents / 100.0, "totalCents": total_cents, "date": date,
        "country": "US", "language": "en", "headerStyle": header, "distortion": "clean", "notes": notes, "kind": "adversarial",
        "market": "US", "brandCategory": "restaurant", "template": "hand-written", "font": "n/a", "totalLayout": "inline", "totalMark": "before",
        "totalWord": "BALANCE", "totalLabelPrinted": "Total", "wordless": False, "dateFormat": date_format, "datePrinted": date_printed,
        "totalPrinted": printed_total, "last4": last4, "bilingual": False, "logoHint": None, "nameRows": name_rows, "exifOrientation": 1,
        "knownFailing": known,
    }


def card_app(known):
    p = Page(2532 / 1170.0)
    right = 0.90
    p.put("9:41", 0.08, 0.012, 0.011)
    p.center("Purchase details", 0.043, 0.019)
    p.put("Help", 0.82, 0.045, 0.013)
    p.put("S", 0.485, 0.105, 0.020)
    p.center("Saigon Noodle House", 0.135, 0.016)
    p.center("Order #A-48213", 0.160, 0.011)
    p.center("Tue, Oct 6, 2026 · 7:42 PM", 0.178, 0.011)
    y = 0.225
    for left, amount in (("1x Pho Tai", "$14.50"), ("2x Spring Rolls", "$9.90"), ("1x Thai Iced Tea", "$5.25"), ("1x Bun Cha", "$15.00")):
        p.row(left, amount, y, 0.012, 0.10, right)
        y += 0.027
    y += 0.012
    for left, amount in (("Subtotal", "$44.65"), ("Delivery fee", "$2.99"), ("Service fee", "$1.49"), ("Tax", "$3.96"), ("Tip", "$4.00")):
        p.row(left, amount, y, 0.011, 0.10, right)
        y += 0.025
    y += 0.012
    p.row("Total", "$57.09", y, 0.016, 0.10, right)
    y += 0.05
    p.put("Paid with Visa ending 4821", 0.10, y, 0.011)
    p.center("Need help with this order?", 0.835, 0.011)
    p.center("Contact support", 0.870, 0.013)
    p.center("Get 20% off your next order", 0.915, 0.017)
    card = (0.05, 0.085, 0.95, 0.80)
    raw = lines_from(p)
    crop = lines_from(p, card)
    expected = base_expected(
        "adv-card-app", "Saigon Noodle House", 5709, "2026-10-06", "57.09", "Tue, Oct 6, 2026", "DDD, Mon D, YYYY", ["Saigon Noodle House"],
        "a bordered card on a grey app page: the page title above the card is taller than the shop's name inside it; the flattened crop is the card alone",
        known, "digital", "4821")
    expected["photo"] = {"level": "clean", "bg": "screen", "fill": 0.9, "canvas": [1170, 2532],
                         "paperQuad": [[card[0], card[1]], [card[2], card[1]], [card[2], card[3]], [card[0], card[3]]]}
    return fixture("adv-card-app", expected, raw, crop, crop, dict(w=1170, h=2532, share=0.64,
                   quad=[[card[0], card[1]], [card[2], card[1]], [card[2], card[3]], [card[0], card[3]]]))


def gift_card(known):
    p = Page(2.2)
    left, right = 0.08, 0.92
    p.center("CEDAR HILL MARKET", 0.040, 0.024)
    p.center("1520 Orchard Lane", 0.075, 0.012)
    p.center("Madison, WI 53703", 0.090, 0.012)
    p.center("(608) 555-0114", 0.105, 0.012)
    p.center("09/18/2026  2:05 PM", 0.135, 0.012)
    y = 0.175
    for name, amount in (("ORG BANANAS 3LB", "1.49"), ("OAT MILK 64OZ", "4.99"), ("GRN ONION", "0.99"),
                         ("ROTISSERIE CHICKEN", "7.99"), ("SOURDOUGH BREAD", "5.49"), ("BASIL PLANT", "3.99")):
        p.row(name, amount, y, 0.012, left, right)
        y += 0.026
    y += 0.01
    p.row("SUBTOTAL", "24.94", y, 0.012, left, right)
    y += 0.026
    p.row("TAX", "0.22", y, 0.012, left, right)
    y += 0.03
    p.row("BALANCE", "25.16", y, 0.016, left, right)
    y += 0.036
    p.row("GIFT CARD ***7731", "25.16", y, 0.012, left, right)
    y += 0.026
    p.row("GIFT CARD BALANCE", "174.84", y, 0.012, left, right)
    y += 0.026
    p.row("LOYALTY POINTS BALANCE", "1,204", y, 0.012, left, right)
    y += 0.026
    p.row("REWARDS BALANCE", "$12.50", y, 0.012, left, right)
    y += 0.026
    p.row("BALANCE DUE", "0.00", y, 0.012, left, right)
    y += 0.026
    p.row("POINTS EARNED", "25", y, 0.012, left, right)
    y += 0.04
    p.center("THANK YOU FOR SHOPPING", y, 0.012)
    flat = lines_from(p)
    # the same lines as photographed: the paper fills the middle of the frame
    photo = Page(4 / 3.0)
    for ln in p.lines:
        photo.lines.append(dict(text=ln["text"], x=0.2 + 0.6 * ln["x"], y=0.05 + 0.9 * ln["y"], h=0.9 * ln["h"], w=0.6 * ln["w"]))
    raw = lines_from(photo)
    expected = base_expected(
        "adv-gift-card", "Cedar Hill Market", 2516, "2026-09-18", "25.16", "09/18/2026", "MM/DD/YYYY", ["CEDAR HILL MARKET"],
        "the till labels its total BALANCE; paid with a gift card, whose remaining balance (174.84), a loyalty balance and a rewards balance all print below it, with a zero BALANCE DUE",
        known, "big-centred", None)
    expected["brandCategory"] = "grocery"
    expected["photo"] = {"level": "clean", "bg": "screen", "fill": 0.6, "canvas": [3024, 4032],
                         "paperQuad": [[0.2, 0.05], [0.8, 0.05], [0.8, 0.95], [0.2, 0.95]]}
    return fixture("adv-gift-card", expected, raw, flat, flat, dict(w=3024, h=4032, share=0.54,
                   quad=[[0.2, 0.05], [0.8, 0.05], [0.8, 0.95], [0.2, 0.95]]))


# "field:pass" entries that fail on the parser in the tree today and must keep failing until fixed.
KNOWN_FAILING = {
    "adv-card-app": [],
    "adv-gift-card": [],
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=os.path.join(REPO, "src", "__tests__", "fixtures", "receipts", "adversarial"))
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)
    for build, rid in ((card_app, "adv-card-app"), (gift_card, "adv-gift-card")):
        data = build(KNOWN_FAILING[rid])
        with open(os.path.join(args.out, rid + ".json"), "w") as handle:
            json.dump(data, handle, ensure_ascii=False, separators=(",", ":"))
        print("wrote %s: %d raw / %d flat lines" % (rid, len(data["raw"]), len(data["flat"])))


if __name__ == "__main__":
    main()
