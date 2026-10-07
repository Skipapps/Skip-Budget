"""Per-market receipt frames, the kind-specific bodies, and the context that ties a receipt together."""

import datetime
from fractions import Fraction

import catalog
from content import (
    LOCALES, Builder, Line, bi, datetime_text, digits, half_up, item_rows, label, legal_footer, make_card,
    make_cart, make_line, make_store, money, name_rows, price, printed_name, strip_accents, tax_rows,
    tender_rows, thanks_rows, total_label, total_rows, url_rows, address_rows, date_text,
)
from render import DISPLAY, MONO, Row, Style

# ---------------------------------------------------------------------------------------------
# Frames. Each is one till's way of laying a receipt out; any brand of the market can use any
# frame, the data (items, prices, dates, ids) varies underneath.
# dt: where the date line goes (top-left, top-center, bottom). trline: terminal/transaction ids.
# ---------------------------------------------------------------------------------------------

FRAMES = {
    "US": [
        dict(id="us-bigbox", fonts=["menlo", "andale"], geom=[(80, 42)], align="center", addr="full", items="coded", flags=True,
             rule="-", dt="top-left", trline="Store {s}", tender="detail", footer=["thanks", "survey", "url", "barcode"]),
        dict(id="us-super", fonts=["courier", "menlo"], geom=[(80, 42), (80, 48)], align="center", addr="full", items="upc", flags=True,
             rule=" ", dt="bottom", trline="ST# {s:04d} OP# {op:08d} TE# {te:02d} TR# {tr:05d}", tender="tend", change_line=True,
             footer=["itemsold", "tc", "return", "thanks", "barcode"]),
        dict(id="us-tape", fonts=["couriernew", "ptmono", "menlo"], geom=[(58, 32), (80, 40)], align="left", addr="compact", items="plain", flags=True,
             rule="=", dt="top-left", trline="Cashier: {cashier}  Lane {reg}", tender="line", footer=["thanks", "url"]),
        dict(id="us-laser", fonts=["arial", "tahoma", "helvetica"], geom=[(80, 40)], align="center", addr="full", items="sku2", flags=False,
             rule="-", dt="top-center", trline="Reg {reg}  Trans {tr}", tender="detail", title_items=True, graphic="dashed",
             footer=["thanks", "return", "qr", "barcode"]),
    ],
    "CA": [
        dict(id="ca-box", fonts=["menlo", "courier"], geom=[(80, 42)], align="center", addr="full", items="coded", flags=True, rule="-",
             dt="top-left", trline="Store {s}  Reg {reg}  Trans {tr}", tender="detail", gst_head=True, footer=["thanks", "return", "barcode"]),
        dict(id="ca-super", fonts=["couriernew", "menlo"], geom=[(80, 40)], align="center", addr="full", items="plain", flags=True, rule="-",
             dt="bottom", trline="{cashier}  CAISSE {reg}", tender="tend", gst_head=True, footer=["itemsold", "thanks", "survey", "barcode"]),
        dict(id="ca-tape", fonts=["ptmono", "monaco", "couriernew"], geom=[(58, 32)], align="left", addr="compact", items="plain", flags=False,
             rule="=", dt="top-left", trline="#{tr}  {cashier}", tender="line", gst_head=True, footer=["thanks"]),
        dict(id="ca-laser", fonts=["arial", "tahoma", "arialnarrow"], geom=[(80, 40)], align="center", addr="full", items="sku2", flags=False,
             rule="-", dt="top-center", trline="Magasin/Store {s}  Caisse/Reg {reg}", tender="detail", title_items=True, graphic="dashed",
             gst_head=True, footer=["thanks", "return", "qr", "barcode"]),
    ],
    "UK": [
        dict(id="uk-super", fonts=["menlo", "andale"], geom=[(80, 42)], align="center", addr="full", items="plain", flags=True, rule="-",
             dt="top-left", trline="Store {s}  Till {reg}  Receipt {tr:04d}", tender="detail", vat_head=True, footer=["vatsummary", "itemsold", "thanks", "barcode"]),
        dict(id="uk-high", fonts=["couriernew", "ptmono"], geom=[(80, 40)], align="left", addr="compact", items="qty", flags=False, rule="-",
             dt="bottom", trline="Operator {cashier}  Till {reg}", tender="line", mark_all=True, footer=["vatsummary", "thanks", "survey"]),
        dict(id="uk-slip", fonts=["monaco", "courier"], geom=[(58, 32)], align="center", addr="full", items="plain", flags=False, rule="*",
             dt="top-center", trline="TILL {reg} TRAN {tr:04d}", tender="line", vat_head=True, footer=["vatsummary", "thanks", "url"]),
        dict(id="uk-laser", fonts=["arial", "verdana", "helvetica"], geom=[(80, 40)], align="center", addr="full", items="sku2", flags=False,
             rule="-", dt="top-center", trline="Receipt no. {tr:06d}", tender="detail", title_items=True, graphic="solid", vat_head=True,
             footer=["return", "thanks", "qr", "barcode"]),
    ],
    "MX": [
        dict(id="mx-conv", fonts=["menlo", "monaco", "andale"], geom=[(58, 32)], align="center", addr="full", items="qty", flags=False, rule="-",
             dt="top-left", trline="TICKET: {tr:08d}  CAJA {reg:02d}", tender="line", rfc_head=True, footer=["itemsold", "thanks", "survey", "barcode"]),
        dict(id="mx-super", fonts=["courier", "menlo"], geom=[(80, 42), (80, 48)], align="center", addr="full", items="upc", flags=True, rule="-",
             dt="top-left", trline="SUC. {s:04d}  CAJA {reg:02d}  CAJERO {cashier}", tender="tend", rfc_head=True,
             footer=["itemsold", "factura", "thanks", "barcode"]),
        dict(id="mx-ticket", fonts=["couriernew", "ptmono"], geom=[(80, 40)], align="left", addr="compact", items="plain", flags=False, rule="=",
             dt="top-left", trline="FOLIO {tr:07d}", tender="line", mark_all=True, rfc_head=True, footer=["thanks", "factura"]),
        dict(id="mx-laser", fonts=["arial", "tahoma"], geom=[(80, 40)], align="center", addr="full", items="sku2", flags=False, rule="-",
             dt="top-center", trline="FOLIO {tr:07d}  CAJA {reg:02d}", tender="detail", title_items=True, graphic="dashed", rfc_head=True,
             footer=["factura", "thanks", "qr", "barcode"]),
    ],
    "AU": [
        dict(id="au-super", fonts=["menlo", "couriernew"], geom=[(80, 42)], align="center", addr="full", items="plain", flags=True, rule="-",
             dt="top-left", trline="Store {s}  Till {reg}  Receipt {tr:05d}", tender="detail", tax_invoice="top", abn_head=True,
             footer=["itemsold", "survey", "thanks", "barcode"]),
        dict(id="au-coded", fonts=["courier", "andale"], geom=[(80, 40)], align="center", addr="full", items="coded", flags=False, rule="-",
             dt="bottom", trline="Operator {cashier}  POS {reg}", tender="tend", tax_invoice="mid", abn_head=True, footer=["thanks", "return", "barcode"]),
        dict(id="au-tape", fonts=["ptmono", "monaco"], geom=[(58, 32)], align="left", addr="compact", items="plain", flags=False, rule="-",
             dt="top-left", trline="TILL {reg}  #{tr}", tender="line", tax_invoice="mid", abn_head=True, footer=["thanks", "url"]),
        dict(id="au-laser", fonts=["arial", "verdana", "arialnarrow"], geom=[(80, 40)], align="center", addr="full", items="sku2", flags=False,
             rule="-", dt="top-center", trline="Trans {tr:06d}  Reg {reg}", tender="detail", title_items=True, graphic="solid", tax_invoice="top",
             abn_head=True, footer=["return", "thanks", "qr", "barcode"]),
    ],
}

TEXT_ALIGN = {"center": "center", "left": "left"}

COUPON_WORD = {"US": "COUPON", "CA_en": "COUPON", "CA_fr": "COUPON", "UK": "CLUBCARD PRICE", "MX": "DESCUENTO", "AU": "MEMBER DISCOUNT"}
MODS = {
    "en": ["NO ONION", "EXTRA CHEESE", "SIDE SALAD", "WELL DONE", "NO ICE", "ADD BACON", "SUB FRIES", "ALLERGY: NUTS", "ON THE SIDE"],
    "fr": ["SANS OIGNON", "EXTRA FROMAGE", "SALADE EN ACCOMPAGNEMENT", "BIEN CUIT", "SANS GLACE", "AJOUTER BACON", "SAUCE A PART"],
    "es": ["SIN CEBOLLA", "EXTRA QUESO", "CON GUARNICION", "TERMINO MEDIO", "SIN HIELO", "SALSA APARTE", "SIN PICANTE"],
}


class Ctx:
    pass


def make_ctx(spec, rng):
    ctx = Ctx()
    ctx.rng = rng
    ctx.spec = spec
    ctx.loc_key = spec["market"]
    ctx.loc = LOCALES[ctx.loc_key]
    ctx.kind = spec["kind"]
    ctx.brand = spec["brand"]
    ctx.hs = spec["header"]
    ctx.logo_hint = spec.get("logo_hint")
    ctx.big = spec.get("big", False)
    ctx.word_mode = spec["word_mode"]
    ctx.total_layout = spec["total_layout"]
    ctx.mark = spec["mark"]
    ctx.date = spec["date"]
    ctx.hour, ctx.minute, ctx.second = rng.randint(7, 21), rng.randint(0, 59), rng.randint(0, 59)
    family = {"US": "US", "CA_en": "CA", "CA_fr": "CA", "UK": "UK", "MX": "MX", "AU": "AU"}[ctx.loc_key]
    ctx.frame = dict(rng.choice(FRAMES[family]))
    ctx.notes = []

    ctx.accents = True if ctx.loc.lang == "en" else rng.random() < 0.55
    if ctx.loc.lang != "en" and not ctx.accents:
        ctx.notes.append("accents dropped as an ASCII till prints them")
    ctx.bilingual = ctx.loc_key == "CA_en" and rng.random() < 0.3 or ctx.loc_key == "CA_fr" and rng.random() < 0.25
    if ctx.bilingual:
        ctx.notes.append("bilingual labels")
    ctx.title_case = False
    ctx.item_title = bool(ctx.frame.get("title_items"))
    ctx.align = ctx.frame["align"] if rng.random() < 0.85 else rng.choice(["center", "left"])

    font = rng.choice(ctx.frame["fonts"])
    paper_mm, cols = rng.choice(ctx.frame["geom"])
    paper_w = paper_mm * 11.25
    adv = (paper_w - 2 * 56) / cols
    ctx.style = Style(font=font, adv=adv, cols=cols, paper_mm=paper_mm, line_gap=rng.uniform(1.18, 1.38),
                      top=rng.randint(50, 130), bottom=rng.randint(60, 150), edge="zigzag" if rng.random() < 0.25 else "straight")
    ctx.font = font
    ctx.rule = ctx.frame["rule"]
    ctx.item_mark = ctx.mark if ctx.frame.get("mark_all") else "none"
    ctx.name_font = rng.choice(DISPLAY) if rng.random() < 0.4 else None
    ctx.name_size = rng.choice([1.7, 2.0, 2.3, 2.7])
    ctx.box_style = rng.choice(["single", "double", "inverse", "rounded", "dotted"])
    ctx.logo_variant = rng.randint(0, 4)
    ctx.legal_pos = rng.choice(["header", "footer"])
    ctx.want_url = rng.random() < 0.35
    ctx.decoy = rng.random() < 0.13
    ctx.total_word = rng.choice(ctx.loc.total_words)
    ctx.noword = rng.choice(ctx.loc.noword)
    ctx.sub_word = rng.choice(ctx.loc.subtotal)
    ctx.total_size = rng.choice([1.0, 1.25, 1.25, 1.5])
    ctx.leader_char = "."
    ctx.coupon = rng.random() < 0.25
    ctx.coupon_word = COUPON_WORD[ctx.loc_key]
    ctx.mod_words = MODS[ctx.loc.lang]
    ctx.ids = dict(s=rng.randint(11, 9899), op=rng.randint(1, 99999999), te=rng.randint(1, 40), tr=rng.randint(1, 99999),
                   reg=rng.randint(1, 24), cashier=rng.choice(catalog.STAFF))
    ctx.payment = "card" if rng.random() < 0.72 or ctx.word_mode == "noword" or ctx.kind in ("card-slip",) else "cash"
    ctx.tip_mode = "none"
    ctx.store = make_store(ctx)
    ctx.store["number"] = ctx.ids["s"]
    ctx.place_rate = ctx.store.get("rate", 0)
    ctx.tax_scheme = ctx.store.get("scheme")
    ctx.card = make_card(ctx)
    # a receipt that labels its amount "MASTERCARD" cannot show a Visa card number beneath it
    if ctx.word_mode == "noword" and ctx.noword not in ("AMOUNT", "PAID", "IMPORTE", "MONTANT", "À PAYER"):
        ctx.card["network"] = ctx.noword
    ctx.dt_text = None
    ctx.card_printed = False
    ctx.total_printed = None

    if ctx.kind == "restaurant":
        modes = {"US": [("none", 20), ("printed", 30), ("blank", 20), ("suggested", 15)], "CA_en": [("none", 20), ("printed", 30), ("blank", 20), ("suggested", 15)],
                 "CA_fr": [("none", 20), ("printed", 30), ("blank", 20), ("suggested", 15)], "UK": [("none", 20), ("service", 40), ("blank", 15), ("printed", 15)],
                 "MX": [("none", 15), ("suggested", 35), ("blank", 25), ("printed", 25)], "AU": [("none", 40), ("service", 20), ("printed", 20), ("blank", 10)]}[ctx.loc_key]
        ctx.tip_mode = rng.choices([m for m, _ in modes], weights=[w for _, w in modes])[0]
        if ctx.tip_mode in ("printed", "blank", "suggested"):
            ctx.word_mode = "word"
            ctx.payment = "card" if ctx.tip_mode != "none" else ctx.payment

    if ctx.kind == "fuel":
        make_fuel(ctx)
    elif ctx.kind == "card-slip":
        ctx.cart = []
        low, high = (4500, 180000) if ctx.loc_key == "MX" else (450, 18000)
        ctx.slip_amount = rng.randint(low, high) // 5 * 5 + rng.choice([0, 4, 9])
    else:
        ctx.cart = make_cart(ctx)

    if ctx.kind == "card-slip":
        ctx.subtotal = ctx.pre_tip = ctx.total = ctx.slip_amount
        ctx.taxes = []
        ctx.included = False
    else:
        price(ctx)
    ctx.final_total = ctx.total
    return ctx


def make_fuel(ctx):
    rng, key = ctx.rng, ctx.loc_key
    spec = catalog.FUEL[key]
    price_lo, price_hi = spec["price"]
    unit_price = Fraction(round(rng.uniform(price_lo, price_hi), 3)).limit_denominator(1000)
    volume = Fraction(round(rng.uniform(*spec["vol"]), 3)).limit_denominator(1000)
    amount = half_up(unit_price * volume * 100)
    grade = rng.choice(spec["grades"])
    ctx.fuel = dict(grade=grade, unit=spec["unit"], unit_price=unit_price, volume=volume, pump=rng.randint(1, 16))
    tax = "T" if key in ("UK", "MX", "AU") else "0"
    ctx.cart = [Line("FUEL " + grade, amount, tax)]
    if rng.random() < 0.3:
        extras = catalog.items_for(key, "convenience")
        for _ in range(rng.randint(1, 2)):
            ctx.cart.append(make_line(rng.choice(extras), rng, "convenience"))


# ---------------------------------------------------------------------------------------------
# Header and footer
# ---------------------------------------------------------------------------------------------


def header(ctx, b):
    frame, k = ctx.frame, ctx.loc_key
    b.gap(0.3)
    if k == "AU" and frame.get("tax_invoice") == "top" and ctx.kind != "card-slip":
        b.text("TAX INVOICE", align="center", bold=True)
    name_rows(ctx, b)
    short = ctx.kind == "short"
    if k == "AU" and frame.get("tax_invoice") == "mid" and ctx.kind != "card-slip":
        b.text("TAX INVOICE", align="center", bold=True)
    if short:
        b.text(ctx.store["street"])
    else:
        address_rows(ctx, b)
    if frame.get("trline") and not short:
        b.text(frame["trline"].format(**ctx.ids), align=ctx.align if frame["trline"].startswith("Store") else ctx.align)
    if ctx.dt_text is None:
        ctx.dt_text = datetime_text(ctx)
    pos = frame["dt"]
    if pos != "bottom":
        b.gap(0.4)
        b.text(ctx.dt_text, align="center" if pos == "top-center" else ("left" if pos == "top-left" else ctx.align))
    b.gap(0.4)


def footer(ctx, b):
    frame = ctx.frame
    b.gap(0.5)
    if frame["dt"] == "bottom":
        b.text(ctx.dt_text, align=ctx.align)
        b.gap(0.4)
    legal_footer(ctx, b)
    for part in frame["footer"]:
        FOOT[part](ctx, b)
    if ctx.hs == "logo-only" and ctx.logo_hint == "thanks" and "thanks" not in frame["footer"]:
        thanks_rows(ctx, b)
    if ctx.hs == "logo-only" and ctx.logo_hint == "url" and "url" not in frame["footer"]:
        url_rows(ctx, b)
    b.gap(0.6)


def _barcode(ctx, b):
    rng = ctx.rng
    b.raw(Row("barcode", text=" ".join(digits(rng, 4) for _ in range(rng.choice([3, 4, 5]))), h=rng.choice([90, 110, 130]), frac=rng.choice([0.6, 0.78, 0.9])))


def _qr(ctx, b):
    b.raw(Row("qr", size=ctx.rng.choice([150, 180, 210])))


def _itemsold(ctx, b):
    count = sum(l.qty for l in ctx.cart if l.weight is None) + sum(1 for l in ctx.cart if l.weight is not None)
    if ctx.kind in ("short", "card-slip", "fuel"):
        return
    b.text("%s %d" % (ctx.loc.items_sold, count), align=ctx.align)


def _tc(ctx, b):
    rng = ctx.rng
    b.text("TC# %s %s %s %s %s" % tuple(digits(rng, 4) for _ in range(5)), align="center", size=0.85)


def _survey(ctx, b):
    rng = ctx.rng
    if ctx.hs == "logo-only":
        b.text(ctx.loc.survey if ctx.loc.lang != "en" or rng.random() < 0.5 else "Tell us about your visit", align="center", size=0.9)
    else:
        b.text(ctx.loc.survey, align="center", size=0.9)
    b.text("Survey code: %s-%s-%s" % (digits(rng, 4), digits(rng, 4), digits(rng, 4)), align="center", size=0.9)


def _return(ctx, b):
    k = ctx.loc_key
    text = {"en": "RETURNS WITH RECEIPT WITHIN 30 DAYS", "fr": "RETOURS AVEC REÇU DANS LES 30 JOURS", "es": "CAMBIOS CON TICKET EN 30 DIAS"}[ctx.loc.lang]
    if ctx.kind in ("short", "card-slip"):
        return
    b.text(text, align="center", size=0.9)
    if ctx.decoy:
        later = ctx.date + datetime.timedelta(days=ctx.rng.choice([30, 45, 60, 90]))
        fmt = ctx.date_fmt if hasattr(ctx, "date_fmt") else None
        try:
            printed, _ = date_text(ctx.loc_key, later, ctx.rng, fmt=fmt)
        except IndexError:
            printed, _ = date_text(ctx.loc_key, later, ctx.rng)
        word = {"en": "RETURN BY", "fr": "RETOUR AVANT LE", "es": "VALIDO HASTA"}[ctx.loc.lang]
        b.text("%s %s" % (word, printed), align="center", size=0.9)
        ctx.notes.append("decoy date in the footer")


def _factura(ctx, b):
    s = ctx.store
    b.text("PARA FACTURAR INGRESE A", align="center", size=0.9)
    # the web address carries the brand, so a logo-only receipt that must not name it points elsewhere
    nameless = ctx.hs == "logo-only" and ctx.logo_hint != "url"
    b.text("facturacion.com.mx" if nameless else ctx.brand["url"].replace("www.", "facturacion."), align="center", size=0.9)
    b.text("DENTRO DE 30 DIAS NATURALES", align="center", size=0.9)
    b.text("TICKET %s" % digits(ctx.rng, 12), align="center", size=0.9)


def _vatsummary(ctx, b):
    if ctx.kind in ("card-slip", "short"):
        return
    b.rule()
    b.cells([("VAT RATE", 0, "left"), ("NET", int(ctx.style.cols * 0.62), "right"), ("VAT", ctx.style.cols, "right")], size=0.9)
    for t in ctx.taxes:
        net = t.base - t.amount
        b.cells([(t.label, 0, "left"), (ctx.loc.amount(net), int(ctx.style.cols * 0.62), "right"), (ctx.loc.amount(t.amount), ctx.style.cols, "right")], size=0.9)
    b.text("VAT No: %s" % ctx.store["vat_id"], align="center", size=0.9)


FOOT = {
    "thanks": thanks_rows, "url": url_rows, "survey": _survey, "return": _return, "barcode": _barcode, "qr": _qr,
    "itemsold": _itemsold, "tc": _tc, "factura": _factura, "vatsummary": _vatsummary,
}


# ---------------------------------------------------------------------------------------------
# Bodies
# ---------------------------------------------------------------------------------------------


def totals_block(ctx, b, total_cents=None, with_tender=True):
    """Subtotal, tax lines, the total (or none on a no-word receipt) and how it was paid."""
    k = ctx.loc_key
    total = ctx.total if total_cents is None else total_cents
    show_sub = ctx.kind not in ("short",) and (len(ctx.cart) > 1 or ctx.taxes)
    if ctx.kind == "short":
        b.rule()
        if ctx.word_mode == "noword":
            tender_rows(ctx, b, total)
        else:
            total_rows(ctx, b, total)
        return
    b.rule()
    if k == "MX":
        iva = sum(t.amount for t in ctx.taxes)
        b.pair(label(ctx, "subtotal"), money(ctx, total - iva))
        for t in ctx.taxes:
            if t.base:
                b.pair(t.label, money(ctx, t.amount))
    elif show_sub and ctx.kind != "fuel":
        if not ctx.included or k == "UK":
            b.pair(label(ctx, "subtotal"), money(ctx, ctx.subtotal))
        if not ctx.included:
            tax_rows(ctx, b)
    if ctx.word_mode != "noword":
        total_rows(ctx, b, total)
    if k == "AU" and ctx.included and ctx.kind not in ("fuel",):
        tax_rows(ctx, b)
    if with_tender:
        tender_rows(ctx, b, total)
    if k == "UK" and ctx.included and ctx.kind == "fuel":
        b.text("VAT INCLUDED IN TOTAL  %s" % money(ctx, ctx.taxes[0].amount, "none"), size=0.9)


def retail_body(ctx, b):
    if ctx.kind == "pharmacy" and ctx.rng.random() < 0.4:
        b.text({"en": "PHARMACY RECEIPT", "fr": "REÇU DE PHARMACIE", "es": "TICKET DE FARMACIA"}[ctx.loc.lang], align="center", bold=True)
    item_rows(ctx, b)
    if ctx.kind == "pharmacy" and any("RX" in l.name or "ORDON" in l.name or "RECETA" in l.name for l in ctx.cart):
        b.text("RX# %s" % digits(ctx.rng, 7), size=0.9)
    totals_block(ctx, b)
    if ctx.coupon and ctx.kind in ("grocery", "long", "pharmacy") and any(l.amount < 0 for l in ctx.cart):
        saved = -sum(l.amount for l in ctx.cart if l.amount < 0)
        b.pair(ctx.loc.save, money(ctx, saved, "none"))


def restaurant_body(ctx, b):
    rng, k = ctx.rng, ctx.loc_key
    lang = ctx.loc.lang
    guests = rng.randint(1, 6)
    table = rng.randint(1, 48)
    if lang == "fr":
        b.text("TABLE %d   INVITÉS %d   SERVEUR %s" % (table, guests, ctx.ids["cashier"]), align="left")
        b.text("CHÈQUE #%d" % ctx.ids["tr"], align="left")
    elif lang == "es":
        b.text("MESA %d   PERSONAS %d   MESERO %s" % (table, guests, ctx.ids["cashier"]), align="left")
        b.text("CUENTA #%d" % ctx.ids["tr"], align="left")
    else:
        b.text("Table %d   Guests %d   Server %s" % (table, guests, ctx.ids["cashier"].title()), align="left")
        b.text("Check #%d" % ctx.ids["tr"], align="left")
    b.rule()
    item_rows(ctx, b)
    b.rule()
    sub = ctx.subtotal
    tip_mode = ctx.tip_mode
    if tip_mode == "service":
        pct = Fraction(125, 10) if k == "UK" else Fraction(10)
        service = half_up(Fraction(sub) * pct / 100)
        b.pair(label(ctx, "subtotal"), money(ctx, sub))
        word = "SERVICE CHARGE %s%%" % ("12.5" if k == "UK" else "10")
        b.pair(word, money(ctx, service))
        if k == "AU":
            word = "PUBLIC HOLIDAY SURCHARGE 10%"
        ctx.total = ctx.pre_tip = ctx.final_total = sub + service
        if ctx.included and k == "AU":
            total_rows(ctx, b, ctx.total)
            tax_rows(ctx, b)
        else:
            total_rows(ctx, b, ctx.total)
        tender_rows(ctx, b, ctx.total) if ctx.payment == "card" else None
        ctx.notes.append("service charge inside the total")
        return
    if ctx.included:
        b.pair(label(ctx, "subtotal"), money(ctx, ctx.subtotal))
    else:
        b.pair(label(ctx, "subtotal"), money(ctx, ctx.subtotal))
        tax_rows(ctx, b)
    if ctx.word_mode == "noword" and tip_mode == "none":
        tender_rows(ctx, b, ctx.total)
        return
    total_rows(ctx, b, ctx.total)
    if ctx.included and k in ("MX", "AU", "UK"):
        tax_rows(ctx, b)
    if tip_mode == "none":
        tender_rows(ctx, b, ctx.total)
        return
    pre = ctx.total
    if tip_mode == "printed":
        pct = rng.choice([10, 15, 18, 20, 22])
        tip = half_up(Fraction(ctx.subtotal) * pct / 100)
        b.gap(0.4)
        tip_label = "%s %d%%" % (label(ctx, "tip"), pct) if rng.random() < 0.6 else label(ctx, "tip")
        b.pair(tip_label, money(ctx, tip))
        final = pre + tip
        total_rows(ctx, b, final)
        ctx.final_total = final
        ctx.notes.append("second TOTAL after the tip is the amount charged")
        tender_rows(ctx, b, final)
    elif tip_mode == "blank":
        b.gap(0.4)
        blank = "_" * int(ctx.style.cols * 0.4)
        tip_word = label(ctx, "tip")
        b.pair(tip_word, blank)
        b.pair(total_label(ctx) if ctx.word_mode != "noword" else "TOTAL", blank)
        b.gap(0.4)
        b.text({"en": "SIGNATURE X____________________", "fr": "SIGNATURE X____________________", "es": "FIRMA X____________________"}[lang], align="left")
        ctx.final_total = pre
        ctx.notes.append("tip and total lines left blank: expected is the printed total before tip")
        b.text("%s %s" % (ctx.card["network"], ctx.card["mask"]), align="left")
        ctx.card_printed = True
    else:
        b.gap(0.4)
        word = {"en": "SUGGESTED TIP", "fr": "POURBOIRE SUGGÉRÉ", "es": "PROPINA SUGERIDA"}[lang]
        b.text(word, align="left", size=0.95)
        for pct in (15, 18, 20) if k != "MX" else (10, 15, 20):
            tip = half_up(Fraction(ctx.subtotal) * pct / 100)
            b.pair("%d%%" % pct, money(ctx, tip))
        ctx.final_total = pre
        ctx.notes.append("suggested tips only: expected is the printed total")
        tender_rows(ctx, b, pre)


def fuel_body(ctx, b):
    f = ctx.fuel
    lang = ctx.loc.lang
    pump = {"en": "PUMP", "fr": "POMPE", "es": "BOMBA"}[lang]
    b.text("%s %d" % (pump, f["pump"]), align="left")
    unit = f["unit"]
    vol = "%.3f" % float(f["volume"])
    price_s = "%.3f" % float(f["unit_price"])
    if ctx.loc_key == "CA_fr":
        vol, price_s = vol.replace(".", ","), price_s.replace(".", ",")
    if ctx.loc_key == "AU":
        price_s = "%.1f c/L" % (float(f["unit_price"]) * 100)
    b.text(f["grade"], align="left", bold=True)
    b.pair({"en": "VOLUME", "fr": "VOLUME", "es": "LITROS"}[lang], "%s %s" % (vol, unit))
    b.pair({"en": "PRICE/%s" % unit, "fr": "PRIX/%s" % unit, "es": "PRECIO/L"}[lang], (ctx.loc.cur + price_s) if ctx.item_mark == "before" and ctx.loc_key != "AU" else price_s)
    extras = ctx.cart[1:]
    b.pair({"en": "FUEL SALE", "fr": "VENTE CARBURANT", "es": "IMPORTE CARBURANTE"}[lang] if ctx.word_mode != "noword" or extras else {"en": "FUEL", "fr": "CARBURANT", "es": "COMBUSTIBLE"}[lang], money(ctx, ctx.cart[0].amount, ctx.mark if not extras else None))
    for line in extras:
        b.pair(line.name if ctx.accents else strip_accents(line.name), money(ctx, line.amount))
    totals_block(ctx, b)
    if ctx.rng.random() < 0.5:
        b.text({"en": "SAVE ON A CAR WASH TODAY", "fr": "PROFITEZ DE NOTRE LAVE-AUTO", "es": "LAVADO DE AUTO DISPONIBLE"}[lang], align="center", size=0.9)


def slip_body(ctx, b):
    rng, lang, k = ctx.rng, ctx.loc.lang, ctx.loc_key
    card = ctx.card
    ctx.card_printed = True
    b.text("MID: %s   TID: %s" % (digits(rng, 10), digits(rng, 8)), align="left", size=0.9)
    b.text(ctx.loc.sale, align="center", bold=True)
    b.pair({"en": "CARD", "fr": "CARTE", "es": "TARJETA"}[lang], card["network"])
    b.pair("", card["mask"], right_col=ctx.style.cols)
    entry = rng.choice([{"en": "CHIP", "fr": "PUCE", "es": "CHIP"}[lang], {"en": "CONTACTLESS", "fr": "SANS CONTACT", "es": "SIN CONTACTO"}[lang], "TAP" if lang == "en" else "NFC"])
    b.pair({"en": "ENTRY", "fr": "SAISIE", "es": "ENTRADA"}[lang], entry)
    b.text("AID: A0000000031010", size=0.9)
    b.text("AUTH: %s   REF: %s" % (digits(rng, 6), digits(rng, 7)), size=0.9)
    b.rule()
    amount = ctx.slip_amount
    word = ctx.noword if ctx.word_mode == "noword" else rng.choice(["AMOUNT", "SALE AMOUNT", "TOTAL"] if lang == "en" else {"fr": ["MONTANT", "TOTAL"], "es": ["IMPORTE", "TOTAL"]}[lang])
    if ctx.word_mode == "noword" and lang != "en":
        word = ctx.noword
    if k == "CA_fr" and ctx.word_mode == "word":
        word = rng.choice(["MONTANT", "TOTAL", "À PAYER"])
    total_rows(ctx, b, amount, label_text=word)
    if rng.random() < 0.5:
        b.pair(label(ctx, "tip"), "_" * 10)
        b.pair("TOTAL", "_" * 10)
        ctx.notes.append("tip and total lines left blank: expected is the printed amount")
    b.gap(0.4)
    b.text(ctx.loc.approved, align="center", bold=True)
    b.text(rng.choice(ctx.loc.copy), align="center")
    b.text({"en": "I AGREE TO PAY ABOVE TOTAL AMOUNT", "fr": "J'ACCEPTE DE PAYER LE MONTANT CI-DESSUS", "es": "ME OBLIGO A PAGAR EL IMPORTE ANTERIOR"}[lang], align="center", size=0.8)


BODY = {
    "grocery": retail_body, "long": retail_body, "short": retail_body, "pharmacy": retail_body, "retail": retail_body,
    "restaurant": restaurant_body, "fuel": fuel_body, "card-slip": slip_body,
}


def compose(ctx):
    b = Builder(ctx)
    header(ctx, b)
    BODY[ctx.kind](ctx, b)
    footer(ctx, b)
    return b.rows
