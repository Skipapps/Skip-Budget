#!/usr/bin/env python3
"""Deterministic synthetic receipt photos with ground truth, for measuring Skip Budget's scanner.

    python3 scripts/receipt-corpus/generate.py [--count 300] [--seed 20261007] [--jobs 4]
                                               [--out scripts/receipt-corpus/out/images] [--only id,id]

Writes <id>.png and <id>.expected.json per receipt, plus index.json. The same seed gives the same
images byte for byte on one machine; each receipt draws from its own generator, so --only and --jobs
never change what a given id looks like.
"""

import argparse
import datetime
import json
import os
import random
import sys
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

import catalog  # noqa: E402
from frames import compose, make_ctx  # noqa: E402
from photo import apply_ink, photograph  # noqa: E402
from render import render  # noqa: E402

# Receipts per 60 in each market group; scaled to --count.
GROUPS = [("US", 60), ("CA_en", 30), ("CA_fr", 30), ("UK", 60), ("MX", 60), ("AU", 60)]
KINDS = {"grocery": 12, "restaurant": 9, "fuel": 6, "pharmacy": 6, "retail": 12, "card-slip": 6, "long": 4, "short": 5}
HEADERS = {"big-centred": 11, "same-size": 7, "split-two-lines": 5, "slogan-above": 6, "store-id-above": 6, "lowercase-mixed": 7, "logo-only": 11, "boxed-name": 7}
DISTORTIONS = {"clean": 9, "light": 18, "medium": 21, "heavy": 12}
LAYOUTS = {"inline": 39, "leaders": 10, "nextline": 11}
MARKS = {"before": 24, "after": 12, "none": 24}
MARKS_FR = {"before": 8, "after": 40, "none": 12}
KIND_CATS = {
    "grocery": ["grocery"], "long": ["grocery"], "restaurant": ["restaurant", "coffee"], "fuel": ["fuel"],
    "pharmacy": ["pharmacy"], "retail": ["electronics", "hardware", "department", "discount"],
    "card-slip": None, "short": ["coffee", "convenience", "pharmacy", "discount"],
}
# Share of photographs (not scans) stored the way an iPhone stores a portrait shot.
SIDEWAYS_SHARE = 0.4
FIRST_DAY = datetime.date(2026, 1, 1)
LAST_DAY = datetime.date(2026, 10, 6)


def apportion(weights, n, rng):
    """Largest-remainder split of n over weights, returned as a shuffled list of keys."""
    total = float(sum(weights.values()))
    exact = {k: n * w / total for k, w in weights.items()}
    counts = {k: int(v) for k, v in exact.items()}
    leftovers = sorted(exact, key=lambda k: (exact[k] - counts[k], rng.random()), reverse=True)
    for k in leftovers[: n - sum(counts.values())]:
        counts[k] += 1
    items = [k for k, c in counts.items() for _ in range(c)]
    rng.shuffle(items)
    return items


def brand_pool(market, kind):
    key = "CA" if market.startswith("CA") else market
    brands = catalog.BRANDS[key]
    if market == "CA_fr":
        brands = [b for b in brands if b["lang"] in ("fr", "both")]
    if market == "CA_en":
        brands = [b for b in brands if b["lang"] in ("en", "both")]
    cats = KIND_CATS[kind]
    if cats is None:
        return brands
    pool = [b for b in brands if b["cat"] in cats]
    if kind == "fuel" and key == "CA":
        pool += [b for b in brands if b["cat"] == "convenience"]
    if kind == "short" and not pool:
        pool = [b for b in brands if b["cat"] == "grocery"]
    return pool


def splittable(brand):
    return bool(brand["split"])


class _Line:
    def __init__(self, text):
        self.text, self.cells = text, []


def legal_names_brand(brand):
    return name_leak([_Line(brand["legal"])], brand["name"]) is not None


def plan(count, seed):
    """One spec per receipt, balanced over market, language, kind, header style, layout and distortion."""
    rng = random.Random(seed)
    scale = count / 300.0
    specs = []
    usage = {}
    for market, per in GROUPS:
        n = max(1, int(round(per * scale)))
        kinds = apportion(KINDS, n, rng)
        headers = apportion(HEADERS, n, rng)
        layouts = apportion(LAYOUTS, n, rng)
        marks = apportion(MARKS_FR if market == "CA_fr" else MARKS, n, rng)
        words = apportion({"word": 88, "noword": 12}, n, rng)
        dist = apportion(DISTORTIONS, n, rng)

        # Split-name receipts need a brand with a natural break: swap styles until each has one.
        for i in range(n):
            if headers[i] == "split-two-lines" and not any(splittable(b) for b in brand_pool(market, kinds[i])):
                for j in range(n):
                    if headers[j] != "split-two-lines" and any(splittable(b) for b in brand_pool(market, kinds[j])):
                        headers[i], headers[j] = headers[j], headers[i]
                        break

        hint_cycle = ["legal", None, "url", None, "thanks", None]
        hint_i = rng.randrange(len(hint_cycle))
        for i in range(n):
            kind, header = kinds[i], headers[i]
            pool = brand_pool(market, kind)
            if header == "split-two-lines":
                pool = [b for b in pool if splittable(b)] or pool
            least = min(usage.get((market, b["name"]), 0) for b in pool)
            choice = rng.choice([b for b in pool if usage.get((market, b["name"]), 0) == least])
            usage[(market, choice["name"])] = usage.get((market, choice["name"]), 0) + 1

            hint = None
            if header == "logo-only":
                hint = hint_cycle[hint_i % len(hint_cycle)]
                hint_i += 1
                # a legal entity such as "LOBLAW COMPANIES LIMITED" does not say "Loblaws": only use it
                # where the line really carries the name, or the label would be wrong
                if hint == "legal" and not legal_names_brand(choice):
                    hint = "thanks"
            day = FIRST_DAY + datetime.timedelta(days=rng.randint(0, (LAST_DAY - FIRST_DAY).days))
            specs.append(dict(
                market=market, kind=kind, brand=choice, header=header, logo_hint=hint, total_layout=layouts[i], mark=marks[i],
                word_mode=words[i], distortion=dist[i], date=day, big=False,
            ))
    # Thousands separators: half of the retail receipts are big-ticket.
    retail = [s for s in specs if s["kind"] == "retail"]
    rng.shuffle(retail)
    for s in retail[: len(retail) // 2]:
        s["big"] = True
    for index, spec in enumerate(specs):
        spec["index"] = index
        spec["id"] = "%s-%03d" % (spec["market"].lower().replace("_", "-"), index + 1)
        spec["seed"] = seed * 100003 + index * 7919
    return specs


def _words(text):
    import re
    import unicodedata

    folded = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", re.sub(r"[.'`-]", "", folded.replace("&", " and "))).split()


def name_leak(rows, brand_name):
    """The first printed line that contains the brand's name as whole words, else None."""
    needle = [w for w in _words(brand_name) if w != "the"]
    for row in rows:
        texts = [row.text] + [cell[0] for cell in row.cells]
        for text in texts:
            words = _words(text)
            for i in range(len(words) - len(needle) + 1):
                if words[i : i + len(needle)] == needle:
                    return text
    return None


def render_one(task):
    spec, out_dir, width, fmt = task
    rng = random.Random(spec["seed"])
    ctx = make_ctx(spec, rng)
    rows = compose(ctx)
    paper, mask, ink, boxes = render(rows, ctx.style, rng)

    level = spec["distortion"]
    from photo import LEVELS
    fade = rng.uniform(*LEVELS[level]["fade"])
    printed = apply_ink(paper, ink, mask, ctx.style, fade, rng)
    image, meta = photograph(printed, mask, level, rng, width=width)

    # An iPhone stores a portrait shot as a landscape pixel buffer plus an orientation flag (6).
    # Camera-path code resolves the flag (`normalised`); the upload path does not.
    exif_orientation = 1
    if level != "clean" and rng.random() < SIDEWAYS_SHARE:
        exif_orientation = 6
        image = image.rotate(90, expand=True)

    if ctx.hs == "logo-only" and ctx.logo_hint is None:
        leak = name_leak(rows, ctx.brand["name"])
        if leak:
            raise RuntimeError("%s: expected no merchant, but the receipt prints %r" % (spec["id"], leak))

    if ctx.hs == "logo-only" and ctx.logo_hint in ("legal", "thanks"):
        if not name_leak(rows, ctx.brand["name"]):
            raise RuntimeError("%s: expected %r in the %s line, but it is not printed" % (spec["id"], ctx.brand["name"], ctx.logo_hint))

    name_texts = [row.text for _, _, row in boxes if row.tag == "name" and row.text]
    merchant = ctx.brand["name"]
    if ctx.hs == "logo-only" and ctx.logo_hint is None:
        merchant = None
    notes = list(ctx.notes)
    if ctx.hs == "logo-only":
        notes.append("logo is a drawn graphic; name %s" % ({"legal": "in the legal entity line", "url": "in a web address", "thanks": "in the thank-you line", None: "printed nowhere"}[ctx.logo_hint]))
    if ctx.kind == "restaurant" and ctx.tip_mode != "none":
        notes.append("tip: %s" % ctx.tip_mode)
    if ctx.word_mode == "noword":
        notes.append("no TOTAL word: the amount sits on a %s line" % ctx.noword)
    if ctx.big:
        notes.append("big-ticket purchase, thousands separator")

    last4 = ctx.card["last4"] if ctx.card_printed else None
    expected = dict(
        id=spec["id"],
        merchant=merchant,
        total=round(ctx.final_total / 100.0, 2),
        totalCents=ctx.final_total,
        date=ctx.date.isoformat(),
        country=ctx.loc.country,
        language=ctx.loc.lang,
        headerStyle=ctx.hs,
        distortion=level,
        notes="; ".join(notes),
        kind=ctx.kind,
        market=ctx.loc_key,
        brandCategory=ctx.brand["cat"],
        template=ctx.frame["id"],
        font=ctx.font,
        totalLayout=ctx.total_layout,
        totalMark=ctx.mark,
        totalWord=("(none)" if ctx.word_mode == "noword" else ctx.total_word),
        totalLabelPrinted=(ctx.noword if ctx.word_mode == "noword" else ctx.total_word),
        wordless=ctx.word_mode == "noword",
        dateFormat=getattr(ctx, "date_fmt", None),
        datePrinted=getattr(ctx, "date_printed", None),
        totalPrinted=getattr(ctx, "total_printed", None),
        last4=last4,
        bilingual=ctx.bilingual,
        logoHint=ctx.logo_hint,
        nameRows=name_texts,
        exifOrientation=exif_orientation,
        photo=meta,
    )
    path = os.path.join(out_dir, spec["id"])
    exif = Image.Exif()
    exif[0x0112] = exif_orientation
    if fmt == "png":
        image.save(path + ".png", compress_level=1, exif=exif)
    else:
        image.save(path + ".jpg", quality=92, exif=exif)
    with open(path + ".expected.json", "w") as handle:
        json.dump(expected, handle, indent=1, ensure_ascii=False)
    return expected


def contact_sheet(out_dir, ids, target, cols=8, cell=300):
    from PIL import ImageDraw

    rows = (len(ids) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * (int(cell * 1.4) + 18)), (255, 255, 255))
    draw = ImageDraw.Draw(sheet)
    for i, rid in enumerate(ids):
        path = os.path.join(out_dir, rid + ".png")
        if not os.path.exists(path):
            continue
        im = Image.open(path)
        im.thumbnail((cell - 6, int(cell * 1.4)))
        x, y = (i % cols) * cell, (i // cols) * (int(cell * 1.4) + 18)
        sheet.paste(im, (x + 3, y + 16))
        draw.text((x + 3, y + 2), rid, fill=(0, 0, 0))
    sheet.save(target)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--count", type=int, default=300)
    parser.add_argument("--seed", type=int, default=20261007)
    parser.add_argument("--out", default=os.path.join(HERE, "out", "images"))
    parser.add_argument("--only", default="", help="comma-separated ids to (re)generate")
    parser.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2) // 2))
    parser.add_argument("--width", type=int, default=3024, help="canvas width of photographs in pixels (3024 = a 12 MP iPhone shot)")
    parser.add_argument("--format", choices=["png", "jpg"], default="png")
    parser.add_argument("--sheet", default="", help="also write a contact sheet of the generated images to this path")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    specs = plan(args.count, args.seed)
    if args.only:
        wanted = set(args.only.split(","))
        specs = [s for s in specs if s["id"] in wanted]
    tasks = [(s, args.out, args.width, args.format) for s in specs]
    if args.jobs > 1 and len(tasks) > 1:
        with Pool(args.jobs) as pool:
            results = []
            for done, result in enumerate(pool.imap(render_one, tasks, chunksize=1), 1):
                results.append(result)
                if done % 10 == 0 or done == len(tasks):
                    print("%d/%d" % (done, len(tasks)), file=sys.stderr, flush=True)
    else:
        results = [render_one(t) for t in tasks]

    if not args.only:
        with open(os.path.join(args.out, "index.json"), "w") as handle:
            json.dump(results, handle, indent=1, ensure_ascii=False)
    if args.sheet:
        contact_sheet(args.out, [r["id"] for r in results], args.sheet)
    print("wrote %d receipts to %s" % (len(results), args.out))


if __name__ == "__main__":
    main()
