"""Draws a receipt (a list of rows) onto a flat paper image, the way a thermal printer lays it out.

Everything is measured in paper pixels at 11.25 px per mm, so an 80 mm roll is 900 px wide and a
58 mm roll 652 px. Fonts are calibrated by the width of a digit, so the same column count gives the
same printed density in a monospace face and a proportional one.
"""

import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

PX_PER_MM = 11.25
SYS = "/System/Library/Fonts/"
SUP = "/System/Library/Fonts/Supplemental/"

# key: (regular, bold). Each is (path, collection index); None for bold means draw regular heavier.
FONTS = {
    "menlo": ((SYS + "Menlo.ttc", 0), (SYS + "Menlo.ttc", 1)),
    "courier": ((SYS + "Courier.ttc", 0), (SYS + "Courier.ttc", 1)),
    "couriernew": ((SUP + "Courier New.ttf", 0), (SUP + "Courier New Bold.ttf", 0)),
    "monaco": ((SYS + "Monaco.ttf", 0), None),
    "andale": ((SUP + "Andale Mono.ttf", 0), None),
    "ptmono": ((SUP + "PTMono.ttc", 1), (SUP + "PTMono.ttc", 0)),
    "arial": ((SUP + "Arial.ttf", 0), (SUP + "Arial Bold.ttf", 0)),
    "arialnarrow": ((SUP + "Arial Narrow.ttf", 0), (SUP + "Arial Narrow Bold.ttf", 0)),
    "tahoma": ((SUP + "Tahoma.ttf", 0), (SUP + "Tahoma Bold.ttf", 0)),
    "verdana": ((SUP + "Verdana.ttf", 0), (SUP + "Verdana Bold.ttf", 0)),
    "helvetica": ((SYS + "HelveticaNeue.ttc", 0), (SYS + "HelveticaNeue.ttc", 1)),
    # Display faces for names: always bold, never body text.
    "impact": ((SUP + "Impact.ttf", 0), (SUP + "Impact.ttf", 0)),
    "arialblack": ((SUP + "Arial Black.ttf", 0), (SUP + "Arial Black.ttf", 0)),
    "dincond": ((SUP + "DIN Condensed Bold.ttf", 0), (SUP + "DIN Condensed Bold.ttf", 0)),
    "futura": ((SUP + "Futura.ttc", 0), (SUP + "Futura.ttc", 0)),
    "georgia": ((SUP + "Georgia Bold.ttf", 0), (SUP + "Georgia Bold.ttf", 0)),
    "arialround": ((SUP + "Arial Rounded Bold.ttf", 0), (SUP + "Arial Rounded Bold.ttf", 0)),
    "trebuchet": ((SUP + "Trebuchet MS Bold.ttf", 0), (SUP + "Trebuchet MS Bold.ttf", 0)),
}
MONO = {"menlo", "courier", "couriernew", "monaco", "andale", "ptmono"}
DISPLAY = ["impact", "arialblack", "dincond", "futura", "georgia", "arialround", "trebuchet"]

_cache = {}


def _font(key, bold, size):
    size = max(6, int(round(size)))
    cache_key = (key, bold, size)
    if cache_key not in _cache:
        regular, heavy = FONTS[key]
        entry = heavy if (bold and heavy) else regular
        path, index = entry[0], entry[1]
        font = ImageFont.truetype(path, size, index=index)
        if len(entry) > 2:
            font.set_variation_by_name(entry[2])
        _cache[cache_key] = font
    return _cache[cache_key]


class Row:
    """One printed line (or graphic). kind: text cols rule gap barcode logo box qr."""

    def __init__(self, kind="text", text="", align="left", size=1.0, bold=False, font=None,
                 cells=None, char="-", lines=1.0, variant=0, box="single", pad=0, tag=None,
                 spacing=None, indent=0, **extra):
        self.kind = kind
        self.text = text
        self.align = align
        self.size = size
        self.bold = bold
        self.font = font
        self.cells = cells or []  # (text, column, align)
        self.char = char
        self.lines = lines
        self.variant = variant
        self.box = box
        self.pad = pad
        self.tag = tag  # 'name' marks the rows that carry the merchant's name, for the notes
        self.spacing = spacing
        self.indent = indent
        self.extra = extra


class Style:
    def __init__(self, font="menlo", adv=16.9, cols=48, paper_mm=80, line_gap=1.28,
                 ink=(18, 18, 20), top=70, bottom=90, edge="straight", name_font=None):
        self.font = font
        self.adv = adv
        self.cols = cols
        self.paper_mm = paper_mm
        self.line_gap = line_gap
        self.ink = ink
        self.top = top
        self.bottom = bottom
        self.edge = edge
        self.name_font = name_font

    @property
    def paper_w(self):
        return int(round(self.paper_mm * PX_PER_MM))

    @property
    def margin(self):
        return max(18.0, (self.paper_w - self.cols * self.adv) / 2.0)


def _base_size(style, font_key):
    """Font size at which a digit is exactly one column wide."""
    probe = _font(font_key, False, 100)
    digit = probe.getlength("0") / 100.0
    return style.adv / digit


def _fit(style, font_key, bold, size, text, max_w):
    font = _font(font_key, bold, size)
    width = font.getlength(text)
    if width > max_w and width > 0:
        size = size * max_w / width
        font = _font(font_key, bold, size)
    return font, size


def _text_h(style, size):
    return size * style.line_gap


def _barcode(draw, x0, x1, y0, y1, rng, ink):
    x = x0
    while x < x1:
        w = rng.choice([2, 2, 3, 4, 6])
        if rng.random() < 0.55:
            draw.rectangle([x, y0, min(x + w, x1), y1], fill=255)
        x += w + rng.choice([2, 3, 4])


def _qr(draw, x0, y0, size, rng):
    """A QR-like matrix: three real finder squares and random modules elsewhere."""
    n = 25
    cell = size / n

    def finder(i, j):
        return i in (0, 6) or j in (0, 6) or (2 <= i <= 4 and 2 <= j <= 4)

    for i in range(n):
        for j in range(n):
            if i < 7 and j < 7:
                on = finder(i, j)
            elif i < 7 and j >= n - 7:
                on = finder(i, j - (n - 7))
            elif i >= n - 7 and j < 7:
                on = finder(i - (n - 7), j)
            else:
                on = rng.random() < 0.5
            if on:
                draw.rectangle([x0 + j * cell, y0 + i * cell, x0 + (j + 1) * cell - 1, y0 + (i + 1) * cell - 1], fill=255)


def draw_logo(img, draw, cx, y0, w, h, variant, rng):
    """A mark that is a picture, not text: filled shapes with cut-outs and some grain."""
    x0, x1, y1 = cx - w / 2.0, cx + w / 2.0, y0 + h
    if variant == 0:  # rounded plate with a hole, a slash and dots
        draw.rounded_rectangle([x0, y0, x1, y1], radius=h * 0.28, fill=255)
        draw.ellipse([x0 + w * 0.12, y0 + h * 0.2, x0 + w * 0.12 + h * 0.6, y0 + h * 0.8], fill=0)
        for k in range(3):
            xs = x0 + w * (0.45 + 0.12 * k)
            draw.polygon([(xs, y1 - h * 0.15), (xs + w * 0.05, y0 + h * 0.15), (xs + w * 0.09, y0 + h * 0.15), (xs + w * 0.04, y1 - h * 0.15)], fill=0)
    elif variant == 1:  # target-like rings
        r = h / 2.0
        cy = y0 + h / 2.0
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
        draw.ellipse([cx - r * 0.72, cy - r * 0.72, cx + r * 0.72, cy + r * 0.72], fill=0)
        draw.ellipse([cx - r * 0.5, cy - r * 0.5, cx + r * 0.5, cy + r * 0.5], fill=255)
        draw.ellipse([cx - r * 0.26, cy - r * 0.26, cx + r * 0.26, cy + r * 0.26], fill=0)
    elif variant == 2:  # pill with stripes
        draw.rounded_rectangle([x0, y0, x1, y1], radius=h / 2.0, fill=255)
        for k in range(5):
            xs = x0 + w * (0.14 + 0.16 * k)
            draw.rectangle([xs, y0 + h * 0.18, xs + w * 0.05, y1 - h * 0.18], fill=0)
    elif variant == 3:  # diamond and half circle
        draw.polygon([(cx - w * 0.3, y0 + h / 2.0), (cx - w * 0.12, y0), (cx + w * 0.06, y0 + h / 2.0), (cx - w * 0.12, y1)], fill=255)
        draw.pieslice([cx - w * 0.02, y0, cx + w * 0.38, y1], 270, 90, fill=255)
        draw.ellipse([cx + w * 0.1, y0 + h * 0.34, cx + w * 0.22, y0 + h * 0.66], fill=0)
    else:  # bursts
        draw.rounded_rectangle([x0, y0, x1, y1], radius=h * 0.1, fill=255)
        for k in range(7):
            ang_x = x0 + w * (0.1 + 0.13 * k)
            draw.ellipse([ang_x, y0 + h * 0.25, ang_x + h * 0.4, y0 + h * 0.25 + h * 0.4], fill=0)
    # grain, only inside the ink, so the plate is not a perfect vector
    for _ in range(int(w * h / 90)):
        px, py = int(rng.uniform(x0, x1)), int(rng.uniform(y0, y1))
        if 0 <= px < img.size[0] and 0 <= py < img.size[1] and img.getpixel((px, py)) == 255:
            draw.point((px, py), fill=0)


def render(rows, style, rng):
    """Returns (paper RGB, paper mask L, [(y0, y1, row)])."""
    width = style.paper_w
    margin = style.margin
    text_w = width - 2 * margin
    base_font = style.font

    # Layout pass.
    heights = []
    for row in rows:
        size_factor = row.size
        if row.kind == "gap":
            heights.append(row.lines * _base_size(style, base_font) * style.line_gap)
        elif row.kind == "barcode":
            heights.append(row.extra.get("h", 110) + 44)
        elif row.kind == "logo":
            heights.append(row.extra.get("h", 120) + 28)
        elif row.kind == "qr":
            heights.append(row.extra.get("size", 170) + 24)
        elif row.kind == "box":
            font_key = row.font or style.name_font or base_font
            heights.append(_base_size(style, font_key if font_key in MONO else base_font) * size_factor * style.line_gap * 1.0 + row.pad * 2 + 20)
        elif row.kind == "rule":
            heights.append(_base_size(style, base_font) * style.line_gap * (0.8 if row.extra.get("graphic") else 1.0))
        else:
            font_key = row.font or base_font
            heights.append(_base_size(style, base_font) * size_factor * style.line_gap * (row.spacing or 1.0))

    total_h = int(sum(heights) + style.top + style.bottom)
    ink = Image.new("L", (width, total_h), 0)
    draw = ImageDraw.Draw(ink)
    boxes = []
    all_spans = []
    style.row_spans = all_spans
    y = float(style.top)

    for row, height in zip(rows, heights):
        y0 = y
        font_key = row.font or base_font
        base_size = _base_size(style, base_font) * row.size
        if row.font and row.font not in MONO and row.font in DISPLAY:
            # Display faces run smaller per point than a mono face of the same size; widen a little.
            base_size *= 1.12

        if row.kind in ("text", "box"):
            text = row.text
            max_w = text_w - row.indent * style.adv - (row.pad * 2 if row.kind == "box" else 0)
            font, size = _fit(style, font_key, row.bold, base_size, text, max_w)
            w = font.getlength(text)
            if row.kind == "box":
                bw = w + row.pad * 2
                bh = size * style.line_gap + row.pad
                if row.align == "center":
                    bx0 = width / 2.0 - bw / 2.0
                elif row.align == "right":
                    bx0 = width - margin - bw
                else:
                    bx0 = margin
                by0 = y + 8
                by1 = by0 + bh
                if row.box == "inverse":
                    draw.rectangle([bx0, by0, bx0 + bw, by1], fill=255)
                    draw.text((bx0 + row.pad, by0 + row.pad / 2.0 + size * 0.95), text, font=font, fill=0, anchor="ls")
                else:
                    stroke = 3
                    if row.box == "rounded":
                        draw.rounded_rectangle([bx0, by0, bx0 + bw, by1], radius=size * 0.4, outline=255, width=stroke)
                    elif row.box == "double":
                        draw.rectangle([bx0, by0, bx0 + bw, by1], outline=255, width=stroke)
                        draw.rectangle([bx0 + 8, by0 + 8, bx0 + bw - 8, by1 - 8], outline=255, width=2)
                    elif row.box == "dotted":
                        for xs in range(int(bx0), int(bx0 + bw), 9):
                            draw.line([xs, by0, xs + 4, by0], fill=255, width=stroke)
                            draw.line([xs, by1, xs + 4, by1], fill=255, width=stroke)
                        for ys in range(int(by0), int(by1), 9):
                            draw.line([bx0, ys, bx0, ys + 4], fill=255, width=stroke)
                            draw.line([bx0 + bw, ys, bx0 + bw, ys + 4], fill=255, width=stroke)
                    else:
                        draw.rectangle([bx0, by0, bx0 + bw, by1], outline=255, width=stroke)
                    draw.text((bx0 + row.pad, by0 + row.pad / 2.0 + size * 0.95), text, font=font, fill=255, anchor="ls")
            else:
                if row.align == "center":
                    x = width / 2.0 - w / 2.0
                elif row.align == "right":
                    x = width - margin - w
                else:
                    x = margin + row.indent * style.adv
                baseline = y + size * 1.0
                tilt = row.extra.get("tilt")
                if tilt:
                    tmp = Image.new("L", (int(w) + 60, int(size * 1.8)), 0)
                    ImageDraw.Draw(tmp).text((30, size * 1.2), text, font=font, fill=255, anchor="ls")
                    tmp = tmp.rotate(tilt, resample=Image.BICUBIC, expand=True)
                    ink.paste(255, (int(x - 30), int(y - size * 0.4)), tmp)
                else:
                    draw.text((x, baseline), text, font=font, fill=255, anchor="ls")
        elif row.kind == "cols":
            spans = []
            frame = row.extra.get("frame")
            tfill = 255
            if frame:
                fx0, fx1, fy0, fy1 = margin - 6, width - margin + 6, y + 2, y + height - 2
                if frame == "inverse":
                    draw.rectangle([fx0, fy0, fx1, fy1], fill=255)
                    tfill = 0
                elif frame == "double":
                    draw.rectangle([fx0, fy0, fx1, fy1], outline=255, width=3)
                    draw.rectangle([fx0 + 6, fy0 + 6, fx1 - 6, fy1 - 6], outline=255, width=2)
                elif frame == "rules":
                    draw.line([fx0, fy0, fx1, fy0], fill=255, width=3)
                    draw.line([fx0, fy1, fx1, fy1], fill=255, width=3)
                else:
                    draw.rectangle([fx0, fy0, fx1, fy1], outline=255, width=3)
            for cell in row.cells:
                text, col, align = cell[0], cell[1], cell[2]
                opts = cell[3] if len(cell) > 3 else None
                if opts:
                    # a cell in its own face, e.g. a tip written by hand
                    font, size = _fit(style, opts.get("font", font_key), True, base_size * opts.get("size", 1.0), text, text_w)
                else:
                    font, size = _fit(style, font_key, row.bold, base_size, text, text_w)
                w = font.getlength(text)
                x = margin + col * style.adv
                if align == "right":
                    x -= w
                elif align == "center":
                    x -= w / 2.0
                if opts and opts.get("tilt"):
                    tmp = Image.new("L", (int(w) + 60, int(size * 1.8)), 0)
                    ImageDraw.Draw(tmp).text((30, size * 1.2), text, font=font, fill=255, anchor="ls")
                    tmp = tmp.rotate(opts["tilt"], resample=Image.BICUBIC, expand=True)
                    ink.paste(255, (int(x - 30), int(y - size * 0.4)), tmp)
                else:
                    draw.text((x, y + size * 1.0), text, font=font, fill=tfill, anchor="ls")
                spans.append((x, x + w, font, size))
            leader = row.extra.get("leader")
            if leader and len(spans) >= 2:
                font, size = spans[0][2], spans[0][3]
                start = spans[0][1] + font.getlength(" ")
                stop = spans[-1][0] - font.getlength(" ")
                step = font.getlength(leader)
                if stop - start > step * 2:
                    count = int((stop - start) // step)
                    draw.text((start, y + size * 1.0), leader * count, font=font, fill=255, anchor="ls")
        elif row.kind == "rule":
            if row.extra.get("graphic") == "dashed":
                yy = y + height / 2.0
                for xs in range(int(margin), int(width - margin), 14):
                    draw.line([xs, yy, xs + 8, yy], fill=255, width=2)
            elif row.extra.get("graphic") == "solid":
                yy = y + height / 2.0
                draw.line([margin, yy, width - margin, yy], fill=255, width=3)
            else:
                font, size = _fit(style, base_font, False, base_size, row.char * style.cols, text_w)
                draw.text((margin, y + size * 1.0), row.char * style.cols, font=font, fill=255, anchor="ls")
        elif row.kind == "barcode":
            h = row.extra.get("h", 110)
            frac = row.extra.get("frac", 0.78)
            bx0 = width / 2.0 - text_w * frac / 2.0
            _barcode(draw, bx0, bx0 + text_w * frac, y + 10, y + 10 + h, rng, 255)
            digits = row.text
            if digits:
                font, size = _fit(style, base_font, False, _base_size(style, base_font) * 0.82, digits, text_w)
                draw.text((width / 2.0 - font.getlength(digits) / 2.0, y + h + 10 + size), digits, font=font, fill=255, anchor="ls")
        elif row.kind == "logo":
            draw_logo(ink, draw, width / 2.0, y + 14, text_w * row.extra.get("frac", 0.62), row.extra.get("h", 120), row.variant, rng)
        elif row.kind == "qr":
            size = row.extra.get("size", 170)
            _qr(draw, width / 2.0 - size / 2.0, y + 12, size, rng)
        elif row.kind == "scribble":
            # a pen signature: a few looping strokes across the line
            x = margin + text_w * 0.12
            px, py = x, y + height * 0.55
            for _ in range(int(row.extra.get("strokes", 14))):
                nx = px + rng.uniform(8, 34)
                ny = y + height * (0.5 + rng.uniform(-0.38, 0.38))
                draw.line([px, py, nx, ny], fill=255, width=3)
                px, py = nx, ny
                if px > margin + text_w * 0.7:
                    break

        all_spans.append((y0, y + height, row))
        if row.tag:
            boxes.append((y0, y + height, row))
        y += height

    paper = Image.new("RGB", (width, total_h), (246, 244, 238))
    mask = Image.new("L", (width, total_h), 255)
    if style.edge == "zigzag":
        mdraw = ImageDraw.Draw(mask)
        step = 12
        for xs in range(0, width, step * 2):
            mdraw.polygon([(xs, 0), (xs + step, 0), (xs + step / 2.0, 11)], fill=0)
            mdraw.polygon([(xs, total_h), (xs + step, total_h), (xs + step / 2.0, total_h - 11)], fill=0)
    return paper, mask, ink, boxes
