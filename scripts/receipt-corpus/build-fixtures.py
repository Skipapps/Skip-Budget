#!/usr/bin/env python3
"""Folds the generator's ground truth and the OCR batch's Vision output into one compact JSON per receipt.

    python3 scripts/receipt-corpus/build-fixtures.py [--images out/images] [--out src/__tests__/fixtures/receipts]

Each fixture is {id, expected, meta, raw, flat, fixed}: raw/flat/fixed are the lines the native
module would hand the parser (text, candidates, confidence, x, y, width, height; y top-down), with
at most two candidates kept and geometry rounded so the whole corpus stays a few MB. y and height
keep more digits than x and width because the parser compares line heights within 15 percent and a
height is only about 0.01: at 3 decimals about 4 percent of merchant answers changed against full
precision.
"""

import argparse
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))


def squeeze(lines, decimals, size_decimals):
    """x and width are rounded to `decimals`; y and height (what the parser compares) to `size_decimals`."""
    out = []
    for line in lines:
        candidates = line.get("candidates") or [line["text"]]
        out.append({
            "text": line["text"],
            "candidates": candidates[:2],
            "confidence": round(line.get("confidence", 0), 2),
            "x": round(line["x"], decimals),
            "y": round(line["y"], size_decimals),
            "width": round(line["width"], decimals),
            "height": round(line["height"], size_decimals),
        })
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--images", default=os.path.join(HERE, "out", "images"))
    parser.add_argument("--out", default=os.path.join(REPO, "src", "__tests__", "fixtures", "receipts"))
    parser.add_argument("--decimals", type=int, default=3, help="decimals kept for x and width")
    parser.add_argument("--size-decimals", type=int, default=5, help="decimals kept for y and height")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    ids = sorted(name[: -len(".expected.json")] for name in os.listdir(args.images) if name.endswith(".expected.json"))
    written, missing = 0, []
    for rid in ids:
        base = os.path.join(args.images, rid)
        parts = {}
        try:
            for key in ("raw", "flat", "fixed", "timing"):
                with open("%s.%s.json" % (base, key)) as handle:
                    parts[key] = json.load(handle)
        except FileNotFoundError:
            missing.append(rid)
            continue
        with open(base + ".expected.json") as handle:
            expected = json.load(handle)
        timing = parts["timing"]
        meta = {
            "imageWidth": timing["width"],
            "imageHeight": timing["height"],
            "ms": {"raw": timing["rawMs"], "flat": timing["flatMs"], "fixed": timing["fixedMs"], "flatten": timing["flattenMs"]},
            "flattened": timing["flattened"],
            "flattenQuad": [[round(x, 3), round(y, 3)] for x, y in timing["quadTopDown"]],
            "cropWidth": timing["cropWidth"],
            "cropHeight": timing["cropHeight"],
        }
        fixture = {
            "id": rid,
            "expected": expected,
            "meta": meta,
            "raw": squeeze(parts["raw"], args.decimals, args.size_decimals),
            "flat": squeeze(parts["flat"], args.decimals, args.size_decimals),
            "fixed": squeeze(parts["fixed"], args.decimals, args.size_decimals),
        }
        with open(os.path.join(args.out, rid + ".json"), "w") as handle:
            json.dump(fixture, handle, ensure_ascii=False, separators=(",", ":"))
        written += 1

    total = sum(os.path.getsize(os.path.join(args.out, n)) for n in os.listdir(args.out) if n.endswith(".json"))
    print("wrote %d fixtures to %s (%.2f MB)" % (written, args.out, total / 1e6))
    if missing:
        print("no OCR output yet for: %s" % ", ".join(missing))


if __name__ == "__main__":
    main()
