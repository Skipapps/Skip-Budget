"""Stress photographs for the `hard` set: glare, creases, folds, heavy shadow, motion blur, two receipts
overlapping, writing behind the paper, a steep angle, and a receipt that fills a fifth of the frame.

Built on photo.py's helpers (homography, noise, lighting) without changing them.
"""

import io
import math
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

import photo
import render

STRESSORS = ["small", "glare", "crease", "fold", "shadow", "motion", "faded", "two", "bgtext", "angle25"]

WORDS = ("market council river budget season weather station growth company village energy library harbour summit policy garden winter "
         "yellow bridge letter engine factory theatre mountain cabinet journal orchard pattern kitchen planet quarter silver teacher window "
         "morning evening central county school program report annual review sports league finance travel forecast schedule election "
         "reading notes meeting call back monday tuesday friday rent milk bread pay invoice check later ask maria tom lunch ").split()


def _words(rng, n):
    return " ".join(rng.choice(WORDS) for _ in range(n))


def newspaper(size, rng):
    w, h = size
    img = Image.new("RGB", size, rng.choice([(228, 224, 210), (222, 218, 204), (236, 232, 220)]))
    d = ImageDraw.Draw(img)
    head = render._font("timesold", True, 130)
    body = render._font("timesold", False, 36)
    small = render._font("timesold", True, 44)
    d.text((w // 2, 190), _words(rng, 2).upper(), font=head, fill=(40, 40, 38), anchor="ms")
    d.line([60, 230, w - 60, 230], fill=(50, 50, 48), width=5)
    cols = 6
    cw = (w - 120) // cols
    for c in range(cols):
        x = 60 + c * cw
        y = 300
        while y < h - 40:
            if rng.random() < 0.12:
                d.text((x + 6, y + 40), _words(rng, 3).upper(), font=small, fill=(40, 40, 38), anchor="ls")
                y += 76
            elif rng.random() < 0.06:
                g = rng.randint(120, 170)
                d.rectangle([x + 4, y, x + cw - 20, y + rng.randint(160, 340)], fill=(g, g, g - 6))
                y += 380
            else:
                d.text((x + 6, y), _words(rng, 5), font=body, fill=(60, 58, 54), anchor="ls")
                y += 46
        d.line([x + cw - 8, 280, x + cw - 8, h - 40], fill=(120, 118, 110), width=2)
    return img.filter(ImageFilter.GaussianBlur(0.7))


def notes_table(size, rng):
    w, h = size
    if rng.random() < 0.5:
        img = Image.new("RGB", size, (250, 248, 238))
        d = ImageDraw.Draw(img)
        for y in range(120, h, 78):
            d.line([0, y, w, y], fill=(150, 175, 215), width=3)
        d.line([180, 0, 180, h], fill=(215, 120, 120), width=4)
    else:
        img = photo._wood(size, rng)
        d = ImageDraw.Draw(img)
    hand = [render._font(k, False, rng.choice([64, 76, 88])) for k in ("bradley", "noteworthy", "markerfelt")]
    for _ in range(int(h / 190)):
        font = rng.choice(hand)
        x, y = rng.randint(60, w // 2), rng.randint(140, h - 80)
        d.text((x, y), _words(rng, rng.randint(2, 5)) + ("  %d.%02d" % (rng.randint(2, 90), rng.randint(0, 99)) if rng.random() < 0.4 else ""), font=font, fill=(35, 40, 90), anchor="ls")
    return img


def motion_blur(img, length, angle_deg):
    n = max(2, min(14, int(length)))
    dx, dy = math.cos(math.radians(angle_deg)), math.sin(math.radians(angle_deg))
    acc = img
    for i in range(1, n):
        shift = (i - (n - 1) / 2.0) * (length / float(n))
        shifted = ImageChops.offset(img, int(round(dx * shift)), int(round(dy * shift)))
        acc = Image.blend(acc, shifted, 1.0 / (i + 1))
    return acc


def crumple(paper, rng, amount):
    """Low-frequency blotchy shading, like paper that has been in a pocket."""
    w, h = paper.size
    small = photo._noise((max(8, w // 40), max(8, h // 40)), 60, rng, half=False).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))
    lut = [int(255 * (1 - amount) + 255 * amount * (v / 255.0)) for v in range(256)]
    return ImageChops.multiply(paper, Image.merge("RGB", [small.point(lut)] * 3))


def add_creases(paper, rng):
    w, h = paper.size
    overlay = Image.new("L", (w, h), 0)
    light = Image.new("L", (w, h), 0)
    d, dl = ImageDraw.Draw(overlay), ImageDraw.Draw(light)
    for _ in range(rng.randint(1, 3)):
        y0 = rng.uniform(0.15, 0.85) * h
        slope = rng.uniform(-0.25, 0.25)
        pts = [(0, y0), (w, y0 + slope * w)]
        d.line(pts, fill=255, width=max(2, w // 260))
        dl.line([(0, y0 + 7), (w, y0 + 7 + slope * w)], fill=255, width=max(2, w // 300))
    overlay = overlay.filter(ImageFilter.GaussianBlur(1.4))
    light = light.filter(ImageFilter.GaussianBlur(1.6))
    paper = ImageChops.multiply(paper, Image.merge("RGB", [overlay.point([255 - int(v * 0.34) for v in range(256)])] * 3))
    paper = ImageChops.add(paper, Image.merge("RGB", [light.point([int(v * 0.12) for v in range(256)])] * 3))
    return paper


def fold_strip(paper, mask, spans, protect, rng):
    """Hides a band of items as if the paper were folded over itself; returns (paper, mask, done, (y, height))."""
    w, h = paper.size
    lo = max([y1 for y0, y1, row in spans if row.tag == "name"] + [0.2 * h]) + 20
    for _ in range(40):
        y0 = rng.uniform(lo, 0.58 * h)
        strip = rng.uniform(0.05, 0.09) * h
        if _clear(protect, y0, y0 + strip):
            break
    else:
        return paper, mask, False, False
    y0, y1 = int(y0), int(y0 + strip)
    top = paper.crop((0, 0, w, y0))
    bottom = paper.crop((0, y1, w, h))
    jitter = rng.choice([-9, -6, 6, 9])
    out = Image.new("RGB", (w, h - (y1 - y0)), (244, 242, 236))
    out.paste(top, (0, 0))
    out.paste(bottom, (jitter, y0))
    mtop, mbottom = mask.crop((0, 0, w, y0)), mask.crop((0, y1, w, h))
    mout = Image.new("L", out.size, 255)
    mout.paste(mtop, (0, 0))
    mout.paste(mbottom, (0, y0))
    # a fold shadow along the seam
    shade = Image.new("L", out.size, 0)
    sd = ImageDraw.Draw(shade)
    sd.rectangle([0, y0 - 3, w, y0 + 9], fill=255)
    shade = shade.filter(ImageFilter.GaussianBlur(7))
    out = ImageChops.multiply(out, Image.merge("RGB", [shade.point([255 - int(v * 0.5) for v in range(256)])] * 3))
    return out, mout, True, (y0, y1 - y0)


def _clear(protect, y0, y1):
    return all(y1 + 10 < p0 or y0 - 10 > p1 for p0, p1 in protect)


def glare_blobs(size, centres, rng, protect_pts, extent):
    """White hot-spots on glossy paper, kept away from the points that must stay readable."""
    w, h = size
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    placed = 0
    x0, x1, y0, y1 = extent
    for _ in range(80):
        if placed >= rng.randint(1, 2):
            break
        cx, cy = rng.uniform(x0, x1), rng.uniform(y0, y1)
        rx, ry = rng.uniform(0.07, 0.17) * (x1 - x0), rng.uniform(0.05, 0.12) * (y1 - y0)
        ok = all(((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 > 1.9 for px, py in protect_pts)
        if ok:
            d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
            placed += 1
    return mask.filter(ImageFilter.GaussianBlur(max(20, w // 60))), placed


def forward(coeffs_fn, x, y):
    a, b, c, d, e, f, g, h = coeffs_fn
    den = g * x + h * y + 1
    return (a * x + b * y + c) / den, (d * x + e * y + f) / den


def compose(paper, mask, spans, protect_rows, stress, rng, second=None, width=3024, orientation=1):
    """Returns (RGB image, meta). protect_rows: indexes of rows whose text must stay visible."""
    meta = {"level": "stress", "stress": list(stress)}
    cw = width
    pw, ph = paper.size
    protect = [(spans[i][0], spans[i][1]) for i in protect_rows]

    if "crease" in stress:
        paper = add_creases(paper, rng)
        paper = crumple(paper, rng, 0.10)
    folded = False
    if "fold" in stress:
        new_paper, new_mask, done, folded = fold_strip(paper, mask, spans, protect, rng)
        if done:
            paper, mask = new_paper, new_mask
            pw, ph = paper.size
    meta["folded"] = bool(folded)

    fill = rng.uniform(0.20, 0.40) if "small" in stress else rng.uniform(0.42, 0.78)
    tw = int(cw * fill)
    th = int(tw * ph / pw)
    ch = int(max(cw * 4 / 3.0, th / rng.uniform(0.72, 0.9)))
    ch = min(ch, int(cw * 2.2))
    if th > ch * 0.92:
        tw = int(tw * ch * 0.92 / th)
        th = int(ch * 0.92)
    fill = tw / float(cw)
    meta["fill"] = round(fill, 3)
    paper_r = paper.resize((tw, th), Image.LANCZOS)
    mask_r = mask.resize((tw, th), Image.LANCZOS)

    # background
    if "bgtext" in stress:
        bg_kind = "newspaper" if rng.random() < 0.6 else "notes"
        bg = newspaper((cw, ch), rng) if bg_kind == "newspaper" else notes_table((cw, ch), rng)
    else:
        bg_kind = rng.choice(["wood", "dark", "colour", "light"])
        bg = photo._background((cw, ch), rng, bg_kind)
    meta["bg"] = bg_kind

    angle_mag = rng.uniform(22, 28) if "angle25" in stress else rng.uniform(0.0, 7.0)
    angle = rng.choice([-1, 1]) * angle_mag
    meta["rotation"] = round(angle, 2)
    persp = 0.03 if "angle25" in stress else 0.02
    cx = cw / 2.0 + rng.uniform(-0.05, 0.05) * cw
    cy = ch / 2.0 + rng.uniform(-0.04, 0.04) * ch
    other = None
    if second is not None:
        # the second receipt sits behind, offset so a good part of it shows
        side = rng.choice([-1, 1])
        cx -= side * 0.2 * tw
        cy += rng.uniform(-0.05, 0.05) * ch
        other = (side * rng.uniform(0.5, 0.62) * tw, rng.uniform(-0.18, 0.18) * th)

    def quad_for(center_x, center_y, w_, h_, ang, jitter):
        rad = math.radians(ang)
        corners = [(-w_ / 2.0, -h_ / 2.0), (w_ / 2.0, -h_ / 2.0), (w_ / 2.0, h_ / 2.0), (-w_ / 2.0, h_ / 2.0)]
        out = []
        key = rng.uniform(-1, 1) * jitter * 2.0
        for x, y in corners:
            x += rng.uniform(-1, 1) * jitter * w_ + key * w_ * (1 if x > 0 else -1) * (-1 if y > 0 else 1)
            y += rng.uniform(-1, 1) * jitter * h_
            out.append((center_x + x * math.cos(rad) - y * math.sin(rad), center_y + x * math.sin(rad) + y * math.cos(rad)))
        return out

    def place(img_p, img_m, quad, base):
        w_, h_ = img_p.size
        co = photo.solve_homography(quad, [(0, 0), (w_, 0), (w_, h_), (0, h_)])
        warped = img_p.transform((cw, ch), Image.PERSPECTIVE, co, Image.BICUBIC)
        wm = img_m.transform((cw, ch), Image.PERSPECTIVE, co, Image.BICUBIC)
        hard = wm.point([255 if v > 127 else 0 for v in range(256)])
        opacity = rng.uniform(0.4, 0.6)
        dx, dy = int(rng.randint(10, 34) * cw / 1800.0), int(rng.randint(14, 44) * cw / 1800.0)
        shade = Image.new("L", (cw, ch), 0)
        shade.paste(hard, (dx, dy))
        shade = shade.filter(ImageFilter.GaussianBlur(rng.uniform(18, 44) * cw / 1800.0))
        base = ImageChops.multiply(base, Image.merge("RGB", [shade.point([255 - int(v * opacity) for v in range(256)])] * 3))
        return Image.composite(warped, base, wm), co

    if second is not None:
        p2, m2, tw2 = second
        s = tw * rng.uniform(0.85, 1.1) / p2.size[0]
        p2 = p2.resize((int(p2.size[0] * s), int(p2.size[1] * s)), Image.LANCZOS)
        m2 = m2.resize(p2.size, Image.LANCZOS)
        q2 = quad_for(cx + other[0], cy + other[1], p2.size[0], p2.size[1], angle + rng.choice([-1, 1]) * rng.uniform(10, 30), persp)
        bg, _ = place(p2, m2, q2, bg)
    quad = quad_for(cx, cy, tw, th, angle, persp)
    img, co = place(paper_r, mask_r, quad, bg)
    fco = photo.solve_homography([(0, 0), (tw, 0), (tw, th), (0, th)], quad)  # paper -> canvas
    meta["paperQuad"] = [[round(x / cw, 4), round(y / ch, 4)] for x, y in quad]
    meta["canvas"] = [cw, ch]

    # glare, kept off the name and total
    if "glare" in stress:
        scale_y = th / float(ph)
        pts = []
        for i in protect_rows:
            y0, y1, _ = spans[i]
            ym = (y0 + y1) / 2.0
            if folded and ym > folded[0]:
                ym -= folded[1]
            ym *= th / float(ph)
            pts.append(forward(fco, tw / 2.0, ym))
        xs = [p[0] for p in quad]
        ys = [p[1] for p in quad]
        gm, placed = glare_blobs((cw, ch), None, rng, pts, (min(xs), max(xs), min(ys), max(ys)))
        meta["glare"] = placed
        strength = rng.uniform(0.7, 0.92)
        white = Image.new("RGB", (cw, ch), (255, 255, 252))
        img = Image.composite(white, img, gm.point([int(v * strength) for v in range(256)]))

    # heavy shadow across part of the frame
    if "shadow" in stress:
        shade = Image.new("L", (cw, ch), 0)
        sd = ImageDraw.Draw(shade)
        a = rng.uniform(0.25, 0.75)
        pts = [(0, 0), (cw, 0), (cw, ch * a), (0, ch * (a + rng.uniform(0.2, 0.5)))]
        if rng.random() < 0.5:
            pts = [(cw - x, y) for x, y in pts]
        sd.polygon(pts, fill=255)
        shade = shade.filter(ImageFilter.GaussianBlur(cw / 22.0))
        depth = rng.uniform(0.45, 0.62)
        img = ImageChops.multiply(img, Image.merge("RGB", [shade.point([255 - int(v * depth) for v in range(256)])] * 3))
        meta["shadow"] = round(depth, 2)

    light = photo._lighting((cw, ch), rng.uniform(0.2, 0.32), rng)
    if light is not None:
        img = ImageChops.multiply(img, Image.merge("RGB", [light] * 3))

    blur = rng.uniform(0.4, 1.1) * cw / 1800.0
    img = img.filter(ImageFilter.GaussianBlur(blur))
    meta["blur"] = round(blur, 2)
    if "motion" in stress:
        length = rng.uniform(10, 26) * cw / 3024.0 * 1.4
        ang = rng.uniform(0, 180)
        img = motion_blur(img, length, ang)
        meta["motion"] = [round(length, 1), round(ang, 0)]
    sigma = rng.uniform(6, 12)
    img = photo._add_noise(img, sigma, rng)
    meta["noise"] = round(sigma, 1)
    quality = rng.randint(38, 72)
    buffer = io.BytesIO()
    img.save(buffer, "JPEG", quality=quality)
    buffer.seek(0)
    img = Image.open(buffer).convert("RGB")
    meta["jpeg"] = quality
    if orientation == 6:
        img = img.rotate(90, expand=True)
    elif orientation == 8:
        img = img.rotate(-90, expand=True)
    return img, meta
