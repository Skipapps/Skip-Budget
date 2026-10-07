#!/usr/bin/env python3
"""The holdout and hard receipt sets, with ground truth, for measuring the parser on what it was not tuned on.

    python3 scripts/receipt-corpus/generate_sets.py --set holdout [--jobs 10] [--out out/holdout]
    python3 scripts/receipt-corpus/generate_sets.py --set hard    [--jobs 10] [--out out/hard]

holdout: 151 receipts from layouts, brands, fonts and a seed the first 300 never used, 26 of them
digital (email, app screen, PDF page). hard: 80 photographs under stress (glare, creases, folds,
heavy shadow, motion blur, two receipts overlapping, writing behind the paper, a steep angle, a
receipt filling a fifth of the frame, EXIF 6 and 8). Ids are hold-... and hard-...; same fixture
format, same labelling rules as the first corpus. Each receipt draws from its own seeded generator.
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
import digital  # noqa: E402
import generate  # noqa: E402
import hardphoto  # noqa: E402
import holdout_catalog as hc  # noqa: E402
import holdout_frames as hf  # noqa: E402
from frames import compose as compose_training, make_ctx as make_training_ctx  # noqa: E402
from photo import LEVELS, apply_ink, photograph  # noqa: E402
from render import render  # noqa: E402

HOLD_SEED = 20261108
HARD_SEED = 20261109
# (market, paper receipts, digital receipts)
HOLD_MARKETS = [("US", 25, 5), ("CA_en", 13, 3), ("CA_fr", 12, 3), ("UK", 25, 5), ("MX", 25, 5), ("AU", 25, 5)]
HOLD_HEADERS = {"sans-large": 30, "big-centred": 14, "same-size": 10, "boxed-name": 9, "lowercase-mixed": 9, "slogan-above": 6,
                "store-id-above": 6, "split-two-lines": 8, "logo-only": 22}
HOLD_DISTORTION = {"clean": 10, "light": 30, "medium": 38, "heavy": 22}
DIGITAL_CATS = ("restaurant", "coffee", "pharmacy", "department", "hardware", "grocery", "transport")
HARD_MARKETS = [("US", 16), ("CA_en", 8), ("CA_fr", 8), ("UK", 16), ("MX", 16), ("AU", 16)]
SLUG = {"US": "us", "CA_en": "ca-en", "CA_fr": "ca-fr", "UK": "uk", "MX": "mx", "AU": "au"}


def brands_for(market, family):
    key = "CA" if market.startswith("CA") else market
    pool = [b for b in hc.HOLDOUT_BRANDS[key] if family in b["fams"]]
    if market == "CA_fr":
        pool = [b for b in pool if b["lang"] in ("fr", "both")]
    if market == "CA_en":
        pool = [b for b in pool if b["lang"] in ("en", "both")]
    return pool


def plan_holdout(seed=HOLD_SEED):
    rng = random.Random(seed)
    specs = []
    usage = {}
    hint_cycle = ["legal", None, "url", None, "thanks", None]
    hint_i = rng.randrange(len(hint_cycle))
    for market, n_paper, n_digital in HOLD_MARKETS:
        key = "CA" if market.startswith("CA") else market
        frames = hf.frames_for(market)
        families = [f["family"] for f in frames]
        by_family = {f["family"]: f for f in frames}
        fam_slots = generate.apportion({f: (2.5 if f == "bilingual" else 1) for f in families}, n_paper, rng)
        headers = generate.apportion(HOLD_HEADERS, n_paper, rng)
        dist = generate.apportion(HOLD_DISTORTION, n_paper, rng)
        layouts = generate.apportion({"inline": 70, "leaders": 15, "nextline": 15}, n_paper + n_digital, rng)
        marks = generate.apportion({"before": 20, "after": 60, "none": 20} if market == "CA_fr" else {"before": 40, "after": 20, "none": 40}, n_paper + n_digital, rng)
        words = generate.apportion({"word": 88, "noword": 12}, n_paper + n_digital, rng)
        for i in range(n_paper):
            family, header = fam_slots[i], headers[i]
            pool = brands_for(market, family)
            if header == "split-two-lines":
                pool = [b for b in pool if b["split"]] or pool
                if not any(b["split"] for b in pool):
                    header = "sans-large"
            least = min(usage.get((market, b["name"]), 0) for b in pool)
            brand = rng.choice([b for b in pool if usage.get((market, b["name"]), 0) == least])
            usage[(market, brand["name"])] = usage.get((market, brand["name"]), 0) + 1
            hint = None
            if header == "logo-only":
                hint = hint_cycle[hint_i % len(hint_cycle)]
                hint_i += 1
                if hint == "legal" and not generate.legal_names_brand(brand):
                    hint = "thanks"
            day = generate.FIRST_DAY + datetime.timedelta(days=rng.randint(0, (generate.LAST_DAY - generate.FIRST_DAY).days))
            specs.append(dict(set="holdout", market=market, family=family, brand=brand, header=header, logo_hint=hint, total_layout=layouts[i], mark=marks[i],
                              word_mode=words[i], distortion=dist[i], date=day, frame=by_family[family]))
        for j in range(n_digital):
            pool = [b for b in hc.HOLDOUT_BRANDS[key] if b["cat"] in DIGITAL_CATS]
            if market == "CA_fr":
                pool = [b for b in pool if b["lang"] in ("fr", "both")]
            if market == "CA_en":
                pool = [b for b in pool if b["lang"] in ("en", "both")]
            least = min(usage.get((market, b["name"]), 0) for b in pool)
            brand = rng.choice([b for b in pool if usage.get((market, b["name"]), 0) == least])
            usage[(market, brand["name"])] = usage.get((market, brand["name"]), 0) + 1
            day = generate.FIRST_DAY + datetime.timedelta(days=rng.randint(0, (generate.LAST_DAY - generate.FIRST_DAY).days))
            specs.append(dict(set="holdout", market=market, family="digital", brand=brand, header="digital", logo_hint=None, total_layout=layouts[n_paper + j],
                              mark=marks[n_paper + j], word_mode="word", distortion="clean", date=day, frame=digital.digital_spec_frame(market)))
    for index, spec in enumerate(specs):
        spec["index"] = index
        spec["id"] = "hold-%s-%03d" % (SLUG[spec["market"]], index + 1)
        spec["seed"] = seed * 100003 + index * 7919
    return specs


def plan_hard(seed=HARD_SEED):
    rng = random.Random(seed)
    training = generate.plan(300, seed)  # a fresh seed: same generator, receipts the first corpus never drew
    holdout = plan_holdout(seed + 17)
    specs = []
    for market, n in HARD_MARKETS:
        t = [s for s in training if s["market"] == market and s["kind"] != "long"][: n // 2 + n % 2]
        h = [s for s in holdout if s["market"] == market and s["family"] != "digital"][: n // 2]
        for s in t:
            s = dict(s)
            s.update(set="hard", source="training-frame", distortion="stress")
            specs.append(s)
        for s in h:
            s = dict(s)
            s.update(set="hard", source="holdout-frame", distortion="stress")
            specs.append(s)
    rng.shuffle(specs)
    primary = []
    while len(primary) < len(specs):
        cycle = list(hardphoto.STRESSORS)
        rng.shuffle(cycle)
        primary += cycle
    for index, spec in enumerate(specs):
        stress = [primary[index]]
        for _ in range(rng.choices([0, 1, 2], weights=[45, 40, 15])[0]):
            extra = rng.choice([x for x in hardphoto.STRESSORS if x not in stress])
            stress.append(extra)
        spec["stress"] = stress
        spec["orientation"] = rng.choices([1, 6, 8], weights=[45, 40, 15])[0]
        spec["index"] = index
        spec["id"] = "hard-%s-%03d" % (SLUG[spec["market"]], index + 1)
        spec["seed"] = seed * 100003 + index * 7919
    return specs


def row_text(row):
    return (row.text or "") + "".join(cell[0] for cell in row.cells)


def expected_for(ctx, spec, level, meta, orientation, name_texts, template, rows_checked=True):
    merchant = ctx.brand["name"]
    if ctx.hs == "logo-only" and ctx.logo_hint is None:
        merchant = None
    notes = list(ctx.notes)
    if ctx.hs == "logo-only":
        notes.append("logo is a drawn graphic; name %s" % ({"legal": "in the legal entity line", "url": "in a web address", "thanks": "in the thank-you line", None: "printed nowhere"}[ctx.logo_hint]))
    if ctx.word_mode == "noword":
        notes.append("no TOTAL word on the amount line")
    last4 = ctx.card["last4"] if ctx.card_printed else None
    expected = dict(
        id=spec["id"], set=spec["set"], merchant=merchant, total=round(ctx.final_total / 100.0, 2), totalCents=ctx.final_total,
        date=ctx.date.isoformat(), country=ctx.loc.country, language=ctx.loc.lang, headerStyle=ctx.hs, distortion=level, notes="; ".join(notes),
        kind=spec.get("family", ctx.kind), market=ctx.loc_key, brandCategory=ctx.brand["cat"], template=template, font=ctx.font,
        totalLayout=ctx.total_layout, totalMark=ctx.mark, totalWord=("(none)" if ctx.word_mode == "noword" else ctx.total_word),
        totalLabelPrinted=(ctx.noword if ctx.word_mode == "noword" else ctx.total_word), wordless=ctx.word_mode == "noword",
        dateFormat=getattr(ctx, "date_fmt", None), datePrinted=getattr(ctx, "date_printed", None), totalPrinted=getattr(ctx, "total_printed", None),
        last4=last4, bilingual=ctx.bilingual, logoHint=ctx.logo_hint, nameRows=name_texts, exifOrientation=orientation, photo=meta,
    )
    if spec["set"] == "hard":
        expected["stress"] = spec["stress"]
        expected["source"] = spec["source"]
    return expected


def prints_name(rows, name):
    """Whether the brand's name is printed as whole words, even when a narrow slip wraps it over two lines."""
    needle = [w for w in generate._words(name) if w != "the"]
    words = []
    for row in rows:
        for text in [row.text] + [cell[0] for cell in row.cells]:
            words += generate._words(text)
    return any(words[i : i + len(needle)] == needle for i in range(len(words) - len(needle) + 1))


def check_names(rows, ctx, spec):
    if ctx.hs == "logo-only" and ctx.logo_hint is None:
        if prints_name(rows, ctx.brand["name"]):
            raise RuntimeError("%s: expected no merchant, but the receipt prints %r" % (spec["id"], ctx.brand["name"]))
    if ctx.hs == "logo-only" and ctx.logo_hint in ("legal", "thanks"):
        if not prints_name(rows, ctx.brand["name"]):
            raise RuntimeError("%s: expected %r in the %s line, but it is not printed" % (spec["id"], ctx.brand["name"], ctx.logo_hint))


def save(image, path, orientation, fmt="png"):
    exif = Image.Exif()
    exif[0x0112] = orientation
    if fmt == "png":
        image.save(path + ".png", compress_level=1, exif=exif)
    else:
        image.save(path + ".jpg", quality=92, exif=exif)


def render_holdout(task):
    spec, out_dir, width = task
    rng = random.Random(spec["seed"])
    ctx = hf.make_hold_ctx(spec, rng)
    path = os.path.join(out_dir, spec["id"])
    if spec["family"] == "digital":
        image, template = digital.build_digital(ctx, rng)
        meta = dict(level="clean", bg="screen", fill=1.0, canvas=list(image.size), paperQuad=[[0, 0], [1, 0], [1, 1], [0, 1]])
        expected = expected_for(ctx, spec, "clean", meta, 1, [ctx.brand["name"]], template)
        save(image, path, 1)
    else:
        rows = hf.compose_hold(ctx)
        check_names(rows, ctx, spec)
        paper, mask, ink, boxes = render(rows, ctx.style, rng)
        level = spec["distortion"]
        fade = rng.uniform(*LEVELS[level]["fade"])
        printed = apply_ink(paper, ink, mask, ctx.style, fade, rng)
        image, meta = photograph(printed, mask, level, rng, width=width)
        orientation = 1
        if level != "clean" and rng.random() < generate.SIDEWAYS_SHARE:
            orientation = 6
            image = image.rotate(90, expand=True)
        names = [row.text for _, _, row in boxes if row.tag == "name" and row.text]
        expected = expected_for(ctx, spec, level, meta, orientation, names, spec["frame"]["id"])
        save(image, path, orientation)
    with open(path + ".expected.json", "w") as handle:
        json.dump(expected, handle, indent=1, ensure_ascii=False)
    return expected


def render_hard(task):
    spec, out_dir, width = task
    rng = random.Random(spec["seed"])
    if spec["source"] == "training-frame":
        ctx = make_training_ctx(spec, rng)
        rows = compose_training(ctx)
        template = ctx.frame["id"]
    else:
        ctx = hf.make_hold_ctx(spec, rng)
        rows = hf.compose_hold(ctx)
        template = spec["frame"]["id"]
    check_names(rows, ctx, spec)
    paper, mask, ink, boxes = render(rows, ctx.style, rng)
    stress = spec["stress"]
    fade = rng.uniform(0.62, 0.85) if "faded" in stress else rng.uniform(0.08, 0.35)
    printed = apply_ink(paper, ink, mask, ctx.style, fade, rng)
    spans = ctx.style.row_spans
    total_text = (getattr(ctx, "total_printed", None) or "").replace(" ", "")
    protect = [i for i, (y0, y1, row) in enumerate(spans)
               if row.tag == "name" or (total_text and total_text in row_text(row).replace(" ", ""))]
    second = None
    if "two" in stress:
        rng2 = random.Random(spec["seed"] + 1)
        other = dict(random.Random(spec["seed"] + 2).choice(generate.plan(60, spec["seed"] % 997 + 1)))
        other_ctx = make_training_ctx(other, rng2)
        other_rows = compose_training(other_ctx)
        p2, m2, ink2, _ = render(other_rows, other_ctx.style, rng2)
        printed2 = apply_ink(p2, ink2, m2, other_ctx.style, rng2.uniform(0.1, 0.4), rng2)
        second = (printed2, m2, 0)
    image, meta = hardphoto.compose(printed, mask, spans, protect, stress, rng, second, width, spec["orientation"])
    names = [row.text for _, _, row in boxes if row.tag == "name" and row.text]
    expected = expected_for(ctx, spec, "stress", meta, spec["orientation"], names, template)
    expected["fade"] = round(fade, 2)
    path = os.path.join(out_dir, spec["id"])
    save(image, path, spec["orientation"])
    with open(path + ".expected.json", "w") as handle:
        json.dump(expected, handle, indent=1, ensure_ascii=False)
    return expected


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--set", choices=["holdout", "hard"], required=True)
    parser.add_argument("--out", default="")
    parser.add_argument("--only", default="")
    parser.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2) // 2))
    parser.add_argument("--width", type=int, default=3024)
    parser.add_argument("--sheet", default="")
    args = parser.parse_args()
    out = args.out or os.path.join(HERE, "out", args.set)
    os.makedirs(out, exist_ok=True)
    specs = plan_holdout() if args.set == "holdout" else plan_hard()
    if args.only:
        wanted = set(args.only.split(","))
        specs = [s for s in specs if s["id"] in wanted]
    worker = render_holdout if args.set == "holdout" else render_hard
    tasks = [(s, out, args.width) for s in specs]
    if args.jobs > 1 and len(tasks) > 1:
        with Pool(args.jobs) as pool:
            results = []
            for done, result in enumerate(pool.imap(worker, tasks, chunksize=1), 1):
                results.append(result)
                if done % 10 == 0 or done == len(tasks):
                    print("%d/%d" % (done, len(tasks)), file=sys.stderr, flush=True)
    else:
        results = [worker(t) for t in tasks]
    if not args.only:
        with open(os.path.join(out, "index.json"), "w") as handle:
            json.dump(results, handle, indent=1, ensure_ascii=False)
    if args.sheet:
        generate.contact_sheet(out, [r["id"] for r in results], args.sheet)
    print("wrote %d receipts to %s" % (len(results), out))


if __name__ == "__main__":
    main()
