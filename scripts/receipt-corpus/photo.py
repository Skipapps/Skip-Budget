"""Turns a flat paper image into a believable phone photo (or a clean flat scan).

Pillow only (no numpy). Noise comes from the receipt's own seeded generator, never from Pillow's C
random state, so one receipt renders identically however many are generated beside it.
"""

import io
import math

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

LEVELS = {
    #            rot   persp  blur        noise     jpeg        fade        shadow       light
    "light": dict(rot=2.0, persp=0.005, blur=(0.0, 0.5), noise=(1, 4), jpeg=(82, 95), fade=(0.0, 0.12), shadow=(0.15, 0.30), light=(0.05, 0.10)),
    "medium": dict(rot=4.0, persp=0.015, blur=(0.5, 1.0), noise=(3, 8), jpeg=(55, 85), fade=(0.10, 0.30), shadow=(0.25, 0.45), light=(0.10, 0.20)),
    "heavy": dict(rot=6.0, persp=0.030, blur=(0.9, 1.5), noise=(7, 14), jpeg=(30, 60), fade=(0.25, 0.50), shadow=(0.40, 0.60), light=(0.20, 0.35)),
    "clean": dict(rot=0.4, persp=0.0, blur=(0.0, 0.3), noise=(0, 2), jpeg=(90, 96), fade=(0.0, 0.08), shadow=(0.0, 0.0), light=(0.0, 0.0)),
}


def _uniform(rng, pair):
    return rng.uniform(pair[0], pair[1])


def _noise(size, sigma, rng, half=True):
    """Gaussian-ish grain as an L image centred on 128 (three uniforms averaged)."""
    w, h = (max(1, size[0] // 2), max(1, size[1] // 2)) if half else size
    layers = [Image.frombytes("L", (w, h), rng.randbytes(w * h)) for _ in range(3)]
    mix = Image.blend(Image.blend(layers[0], layers[1], 0.5), layers[2], 1.0 / 3.0)
    scale = sigma / 42.5
    mix = mix.point([max(0, min(255, int(round(128 + (v - 128) * scale)))) for v in range(256)])
    if half:
        mix = mix.resize(size, Image.BICUBIC)
    return mix


def _add_noise(img, sigma, rng):
    if sigma <= 0:
        return img
    lum = _noise(img.size, sigma, rng)
    chroma = [_noise(img.size, sigma * 0.35, rng) for _ in range(3)]
    mixed = Image.merge("RGB", [Image.blend(lum, c, 0.35) for c in chroma])
    return ImageChops.add(img, mixed, 1.0, -128)


def solve_homography(src, dst):
    """Eight coefficients mapping each point of src onto the matching point of dst."""
    rows = []
    for (x, y), (u, v) in zip(src, dst):
        rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
        rows.append([0, 0, 0, x, y, 1, -v * x, -v * y, v])
    n = 8
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(rows[r][col]))
        rows[col], rows[pivot] = rows[pivot], rows[col]
        base = rows[col][col]
        rows[col] = [value / base for value in rows[col]]
        for r in range(n):
            if r != col:
                factor = rows[r][col]
                rows[r] = [a - factor * b for a, b in zip(rows[r], rows[col])]
    return [rows[i][n] for i in range(n)]


def _wood(size, rng):
    """Planks with fine grain: stripes at several scales, slightly wandering, low contrast."""
    w, h = size
    img = None
    for freq_lo, freq_hi, weight in ((0.004, 0.02, 0.35), (0.03, 0.2, 0.45), (0.25, 0.9, 0.2)):
        waves = [(rng.uniform(freq_lo, freq_hi), rng.uniform(0, 6.28), rng.uniform(0.3, 1.0)) for _ in range(7)]
        profile = [sum(a * math.sin(f * x + p) for f, p, a in waves) for x in range(w)]
        lo, hi = min(profile), max(profile)
        row = Image.new("L", (w, 1))
        row.putdata([int(255 * (v - lo) / (hi - lo + 1e-9)) for v in profile])
        layer = row.resize((w, h), Image.NEAREST)
        img = layer.point([int(v * weight) for v in range(256)]) if img is None else ImageChops.add(img, layer.point([int(v * weight) for v in range(256)]))
    wavy = Image.new("L", (w + 80, h))
    shift = 40.0
    for y in range(0, h, 16):
        shift = max(0.0, min(80.0, shift + rng.uniform(-2, 2)))
        wavy.paste(img.crop((0, y, w, min(h, y + 16))), (int(shift), y))
    wavy = wavy.crop((40, 0, 40 + w, h)).filter(ImageFilter.GaussianBlur(0.8))
    wavy = ImageOps.autocontrast(wavy, cutoff=2).point([60 + int(v * 0.55) for v in range(256)])
    dark = rng.choice([(70, 46, 28), (88, 60, 38), (104, 74, 50)])
    light = rng.choice([(150, 108, 72), (176, 132, 90), (198, 156, 112)])
    img = ImageOps.colorize(wavy, dark, light)
    draw = ImageDraw.Draw(img)
    x = rng.randint(200, 500)
    while x < w:
        draw.line([x, 0, x, h], fill=(38, 24, 14), width=rng.randint(2, 4))
        x += rng.randint(380, 620)
    return _add_noise(img, 6, rng)


def _fabric(size, rng, colour):
    img = Image.new("RGB", size, colour)
    return _add_noise(img, 9, rng)


def _background(size, rng, kind):
    if kind == "wood":
        return _wood(size, rng)
    if kind == "dark":
        base = rng.choice([(24, 24, 28), (34, 32, 30), (18, 22, 26)])
        img = _fabric(size, rng, base)
    elif kind == "colour":
        base = rng.choice([(48, 112, 122), (34, 52, 98), (52, 112, 72), (112, 44, 54), (194, 152, 56), (122, 128, 134), (176, 92, 60), (88, 70, 120)])
        img = _fabric(size, rng, base)
    elif kind == "light":
        base = rng.choice([(226, 222, 216), (214, 214, 212), (232, 226, 214)])
        img = Image.new("RGB", size, base)
        draw = ImageDraw.Draw(img)
        for _ in range(26):
            x0, y0 = rng.randint(0, size[0]), rng.randint(0, size[1])
            draw.line([x0, y0, x0 + rng.randint(-500, 500), y0 + rng.randint(-500, 500)], fill=tuple(c - rng.randint(8, 22) for c in base), width=rng.randint(1, 4))
        img = img.filter(ImageFilter.GaussianBlur(3))
        img = _add_noise(img, 3, rng)
    else:  # white / scanner
        img = Image.new("RGB", size, rng.choice([(252, 252, 252), (244, 244, 244), (236, 236, 238)]))
    return img


def _lighting(size, amp, rng):
    """A multiplier image in [1 - amp, 1]: a directional gradient plus a vignette."""
    if amp <= 0:
        return None
    grad = Image.linear_gradient("L").rotate(rng.uniform(0, 360), resample=Image.BICUBIC, expand=True)
    side = min(grad.size)
    left, top = (grad.size[0] - side) // 2, (grad.size[1] - side) // 2
    grad = grad.crop((left + side // 6, top + side // 6, left + side - side // 6, top + side - side // 6)).resize(size, Image.BICUBIC)
    vignette = Image.radial_gradient("L").resize(size, Image.BICUBIC)
    low = int(255 * (1 - amp))
    g = grad.point([low + int((255 - low) * v / 255) for v in range(256)])
    vv = vignette.point([255 - int(v * amp * 0.45) for v in range(256)])
    return ImageChops.multiply(g, vv)


def apply_ink(paper, ink, mask, style, fade, rng):
    """Prints the ink layer on the paper at the given fading; adds thermal banding and dropouts."""
    strength = 1.0 - fade
    size = paper.size
    tint = rng.choice([(247, 245, 238), (243, 241, 232), (250, 249, 245), (240, 242, 244)])
    paper = Image.new("RGB", size, tint)
    paper = _add_noise(paper, 2.5, rng)
    layer = ink.point([int(v * strength) for v in range(256)])
    if fade > 0.2:
        # thermal heads leave horizontal streaks and uneven density
        bands = Image.new("L", (1, size[1]))
        bands.putdata([rng.randint(150, 255) if rng.random() < 0.18 else 255 for _ in range(size[1])])
        layer = ImageChops.multiply(layer, bands.resize(size, Image.NEAREST).filter(ImageFilter.GaussianBlur(0.8)))
        spots = _noise(size, 60, rng, half=True).point([255 if v < 150 else 150 for v in range(256)])
        layer = ImageChops.multiply(layer, spots)
    ink_colour = style.ink
    printed = Image.composite(Image.new("RGB", size, ink_colour), paper, layer)
    # curl: soft vertical shading bands across the roll
    curl = Image.linear_gradient("L").rotate(90, expand=True).resize(size, Image.BICUBIC)
    amp = rng.uniform(0.01, 0.05)
    curl = curl.point([int(255 * (1 - amp * abs(v - 128) / 128.0)) for v in range(256)])
    printed = ImageChops.multiply(printed, Image.merge("RGB", [curl] * 3))
    return printed


def photograph(paper_rgb, mask, level, rng, width=1800, force_bg=None):
    """Returns (image, meta) where meta holds the distortion parameters and the paper's corners."""
    p = LEVELS[level]
    # blur and shadow radii are defined for an 1800 px wide frame; a 12 MP photo gets them scaled
    scale = width / 1800.0
    pw, ph = paper_rgb.size
    clean = level == "clean"
    meta = {"level": level}

    if clean:
        # a scanner or a screenshot: the sheet is cropped close, at 1x to 2x of the printed raster
        tw = int(pw * rng.uniform(1.0, 2.0))
        th = int(tw * ph / pw)
        margin = rng.choice([0, 0, int(tw * 0.02), int(tw * 0.05)])
        cw, ch = tw + 2 * margin, th + 2 * margin
        bg_kind = "white"
    else:
        fill = rng.uniform(0.40, 0.90)
        if ph / float(pw) > 2.6:
            fill = rng.uniform(0.30, 0.50)
        tw = int(width * fill)
        th = int(tw * ph / pw)
        vfill = rng.uniform(0.72, 0.93)
        cw = width
        ch = int(max(width * 4 / 3.0, th / vfill))
        ch = min(ch, int(width * 2.2))
        if th > ch * 0.93:
            tw = int(tw * ch * 0.93 / th)
            th = int(ch * 0.93)
            fill = tw / float(cw)
        bg_kind = force_bg or rng.choice(["wood", "wood", "dark", "colour", "colour", "light"] if level != "heavy" else ["wood", "dark", "dark", "colour", "light"])
    meta["bg"] = bg_kind
    meta["fill"] = round(tw / float(cw), 3)

    paper = paper_rgb.resize((tw, th), Image.LANCZOS)
    pmask = mask.resize((tw, th), Image.LANCZOS)

    bg = _background((cw, ch), rng, bg_kind)

    # Where the four corners of the paper land on the canvas.
    cx = cw / 2.0 + (rng.uniform(-0.04, 0.04) * cw if not clean else 0)
    cy = ch / 2.0 + (rng.uniform(-0.03, 0.03) * ch if not clean else 0)
    angle = rng.choice([-1, 1]) * rng.uniform(0.35 * p["rot"], p["rot"]) if not clean else rng.uniform(-p["rot"], p["rot"])
    meta["rotation"] = round(angle, 2)
    rad = math.radians(angle)
    corners = [(-tw / 2.0, -th / 2.0), (tw / 2.0, -th / 2.0), (tw / 2.0, th / 2.0), (-tw / 2.0, th / 2.0)]
    quad = []
    persp = p["persp"]
    keystone = rng.uniform(-1, 1) * persp * 2.0
    jitter_x = [rng.uniform(-1, 1) * persp * tw for _ in range(4)]
    jitter_y = [rng.uniform(-1, 1) * persp * th for _ in range(4)]
    for i, (x, y) in enumerate(corners):
        # keystone: the top edge comes out wider than the bottom one, or the other way round
        x += jitter_x[i] + keystone * tw * (1 if x > 0 else -1) * (-1 if y > 0 else 1)
        y += jitter_y[i]
        quad.append((cx + x * math.cos(rad) - y * math.sin(rad), cy + x * math.sin(rad) + y * math.cos(rad)))
    meta["perspective"] = round(persp, 4)

    coeffs = solve_homography(quad, [(0, 0), (tw, 0), (tw, th), (0, th)])
    warped = paper.transform((cw, ch), Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    wmask = pmask.transform((cw, ch), Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    hard = wmask.point([255 if v > 127 else 0 for v in range(256)])

    shadow_opacity = _uniform(rng, p["shadow"])
    meta["shadow"] = round(shadow_opacity, 2)
    if shadow_opacity > 0:
        dx, dy = int(rng.randint(8, 30) * scale), int(rng.randint(12, 40) * scale)
        shade = Image.new("L", (cw, ch), 0)
        shade.paste(hard, (dx, dy))
        shade = shade.filter(ImageFilter.GaussianBlur(rng.uniform(16, 42) * scale))
        factor = shade.point([255 - int(v * shadow_opacity) for v in range(256)])
        bg = ImageChops.multiply(bg, Image.merge("RGB", [factor] * 3))

    img = Image.composite(warped, bg, wmask)

    light_amp = _uniform(rng, p["light"])
    meta["lighting"] = round(light_amp, 2)
    light = _lighting((cw, ch), light_amp, rng)
    if light is not None:
        img = ImageChops.multiply(img, Image.merge("RGB", [light] * 3))

    blur = _uniform(rng, p["blur"])
    meta["blur"] = round(blur, 2)
    if blur * scale > 0.05:
        img = img.filter(ImageFilter.GaussianBlur(blur * scale))
    sigma = _uniform(rng, p["noise"])
    meta["noise"] = round(sigma, 1)
    img = _add_noise(img, sigma, rng)

    quality = int(_uniform(rng, p["jpeg"]))
    meta["jpeg"] = quality
    buffer = io.BytesIO()
    img.save(buffer, "JPEG", quality=quality)
    buffer.seek(0)
    img = Image.open(buffer).convert("RGB")

    meta["canvas"] = [cw, ch]
    meta["paperQuad"] = [[round(x / cw, 4), round(y / ch, 4)] for x, y in quad]
    return img, meta
