#!/usr/bin/env python3
"""Does VNRecognizeTextRequest.minimumTextHeight = 0.008 cost receipt text?

Reads <name>.mth.json (from ocr-min-text-height.swift) next to <name>.expected.json and compares, per
height, how many lines Vision returned and whether the printed total and the shop's name are in them.

    python3 scripts/receipt-corpus/compare-min-text-height.py out/hard [out/images ...] [--subset small|all|long]
"""

import json
import os
import re
import sys
import unicodedata


def fold(text):
    return unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode().lower()


def squash(text):
    return re.sub(r"[^a-z0-9]", "", fold(text).replace("&", "and"))


def core_name(name):
    words = re.sub(r"[^a-z0-9]+", " ", re.sub(r"[.'`-]", "", fold(name).replace("&", " and "))).split()
    if words and words[0] == "the":
        words = words[1:]
    return "".join(words)


def has_amount(lines, printed):
    base = re.sub(r"\s", "", printed or "")
    swapped = base.translate(str.maketrans(".,", ",."))
    patterns = [re.compile(r"(?<!\d)" + re.escape(v) + r"(?!\d)") for v in (base, swapped)]
    return any(p.search(re.sub(r"\s", "", line["text"])) for line in lines for p in patterns)


def has_name(lines, merchant):
    if not merchant:
        return None
    needle = core_name(merchant)
    ordered = sorted(lines, key=lambda l: (round(l["y"], 2), l["x"]))
    return needle in "".join(squash(l["text"]) for l in ordered) or any(needle in squash(l["text"]) for l in lines)


def main():
    dirs = [a for a in sys.argv[1:] if not a.startswith("--")]
    subset = "all"
    if "--subset" in sys.argv:
        subset = sys.argv[sys.argv.index("--subset") + 1]
        dirs = [d for d in dirs if d != subset]
    rows = []
    for directory in dirs:
        for name in sorted(os.listdir(directory)):
            if not name.endswith(".mth.json"):
                continue
            rid = name[: -len(".mth.json")]
            with open(os.path.join(directory, name)) as handle:
                mth = json.load(handle)
            with open(os.path.join(directory, rid + ".expected.json")) as handle:
                expected = json.load(handle)
            small = "small" in expected.get("stress", [])
            if subset == "small" and not small:
                continue
            if subset == "long" and expected.get("kind") != "long":
                continue
            rows.append((rid, expected, mth))
    if not rows:
        print("nothing to compare")
        return
    heights = list(rows[0][2]["raw"].keys())
    base = heights[0]
    for path in ("raw", "flat"):
        print("\n== %s pass, %d receipts (subset: %s)" % (path, len(rows), subset))
        print("minimumTextHeight  mean lines  total found  name found   receipts with more lines than %s" % base)
        for h in heights:
            lines = [len(m[path][h]) for _, _, m in rows]
            total = sum(has_amount(m[path][h], e.get("totalPrinted")) for _, e, m in rows)
            named = [has_name(m[path][h], e.get("merchant")) for _, e, m in rows]
            known = [n for n in named if n is not None]
            more = sum(1 for _, _, m in rows if len(m[path][h]) > len(m[path][base]))
            print("%-17s  %9.1f  %5d/%d    %5d/%d    %d" % (h, sum(lines) / float(len(rows)), total, len(rows), sum(known), len(known), more))
    print("\nper receipt (raw lines at each height; total/name found at the lowest height vs the first):")
    for rid, e, m in rows:
        counts = [len(m["raw"][h]) for h in heights]
        flat = [len(m["flat"][h]) for h in heights]
        gain = has_amount(m["raw"][heights[-1]], e.get("totalPrinted")) and not has_amount(m["raw"][base], e.get("totalPrinted"))
        print("  %-14s fill %.2f  raw %s  flat %s%s" % (rid, e.get("photo", {}).get("fill", 0), counts, flat, "   total only found at %s" % heights[-1] if gain else ""))


if __name__ == "__main__":
    main()
