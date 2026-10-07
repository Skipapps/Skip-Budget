"""Holdout set: receipt layouts the first corpus does not have.

Thirteen families (fast-food kiosk, coffee shop, pharmacy with Rx lines, fuel pump, restaurant check
with a blank tip line, card slip with a handwritten tip, department store with discounts and returns,
hardware with SKU columns, taxi / rail, ATM, card terminal, supermarket savings, bilingual Canadian),
each instantiated per market with its own fonts, column width, paper width and total style, so every
market has at least twelve frames of its own. Digital receipts are in digital.py.

Nothing here edits the first corpus's modules: it reuses their helpers and draws from its own seed.
"""

import datetime
import random
from fractions import Fraction

import catalog
import holdout_catalog as hc
from content import (
    LOCALES, Builder, Line, Tax, address_rows, datetime_text, digits, half_up, label, legal_footer,
    make_card, make_line, make_store, money, name_rows, price, strip_accents, tax_rows, tender_rows,
    thanks_rows, total_label, total_rows, url_rows,
)
from render import Row, Style

FAMILIES = ["kiosk", "coffee", "rx", "pump", "check_blank", "check_signed", "dept", "hardware",
            "transport", "atm", "terminal", "market2", "bilingual"]

# ---------------------------------------------------------------------------------------------
# Words
# ---------------------------------------------------------------------------------------------

LANG = {
    "en": dict(order="ORDER", eat_in="EAT IN", take_out="TAKE OUT", pickup="PICK UP AT COUNTER", ready="Your number will be called",
               paid="PAID WITH", name="Name", rewards="REWARDS", earned="Points earned", balance="Points balance", member="Member",
               server="Server", table="Table", guests="Guests", check="Check", guide="SERVICE GUIDE", tip="TIP", total="TOTAL", sign="SIGNATURE",
               merchant_copy="MERCHANT COPY", customer_copy="CUSTOMER COPY", rx="Rx", copay="COPAY", coupon="COUPON", mfr="MFR COUPON",
               savings="SAVINGS", saved="YOU SAVED", fsa="FSA/HSA ELIGIBLE", counsel="Pharmacist counselling is available", pump="PUMP",
               product="PRODUCT", price_per="PRICE/", fuel_total="FUEL TOTAL", trans="TRANS", sku="SKU", desc="DESCRIPTION", qty="QTY",
               unit="PRICE", ext="AMOUNT", acct="ACCT", po="PO#", job="JOB", trip="Trip", pickup_at="Pickup", dropoff="Drop-off",
               distance="Distance", duration="Duration", driver="Driver", atm="ATM", withdrawal="WITHDRAWAL", avail="AVAILABLE BALANCE",
               card="CARD", ref="REF", ret="RETURN", orig="ORIG", sale="SALE", assoc="ASSOCIATE", returned="ITEMS RETURNED", bought="ITEMS PURCHASED",
               approved="APPROVED", auth="AUTH", thanks="Thank you", terminal="TERMINAL", merchant_id="MERCHANT ID", chip="CHIP", tap="CONTACTLESS",
               sub="SUBTOTAL", tax="TAX", fare="FARE", ticket="E-TICKET", seat="Seat", depart="Depart", member_price="MEMBER PRICE", multi="MULTI-SAVE",
               points="Points", carwash="Car wash code", kiosk="Kiosk", dine="DINE IN", mins="min", rating="Rate your order"),
    "fr": dict(order="COMMANDE", eat_in="SUR PLACE", take_out="POUR EMPORTER", pickup="RAMASSAGE AU COMPTOIR", ready="Votre numero sera appele",
               paid="PAYE PAR", name="Nom", rewards="RECOMPENSES", earned="Points gagnes", balance="Solde de points", member="Membre",
               server="Serveur", table="Table", guests="Invites", check="Cheque", guide="GUIDE DE POURBOIRE", tip="POURBOIRE", total="TOTAL", sign="SIGNATURE",
               merchant_copy="COPIE DU MARCHAND", customer_copy="COPIE DU CLIENT", rx="Rx", copay="CO-PAIEMENT", coupon="COUPON", mfr="COUPON FABRICANT",
               savings="ECONOMIES", saved="VOUS AVEZ ECONOMISE", fsa="ADMISSIBLE ASSURANCE", counsel="Le pharmacien est disponible pour vous conseiller", pump="POMPE",
               product="PRODUIT", price_per="PRIX/", fuel_total="TOTAL CARBURANT", trans="TRANS", sku="UGS", desc="DESCRIPTION", qty="QTE",
               unit="PRIX", ext="MONTANT", acct="COMPTE", po="BC#", job="CHANTIER", trip="Course", pickup_at="Depart", dropoff="Arrivee",
               distance="Distance", duration="Duree", driver="Chauffeur", atm="GAB", withdrawal="RETRAIT", avail="SOLDE DISPONIBLE",
               card="CARTE", ref="REF", ret="RETOUR", orig="ORIG", sale="SOLDE", assoc="CONSEILLER", returned="ARTICLES RETOURNES", bought="ARTICLES ACHETES",
               approved="APPROUVE", auth="AUTOR", thanks="Merci", terminal="TERMINAL", merchant_id="NO MARCHAND", chip="PUCE", tap="SANS CONTACT",
               sub="SOUS-TOTAL", tax="TAXES", fare="TARIF", ticket="BILLET ELECTRONIQUE", seat="Siege", depart="Depart", member_price="PRIX MEMBRE", multi="MULTI-ECONOMIE",
               points="Points", carwash="Code lave-auto", kiosk="Borne", dine="SUR PLACE", mins="min", rating="Evaluez votre commande"),
    "es": dict(order="ORDEN", eat_in="PARA COMER AQUI", take_out="PARA LLEVAR", pickup="RECOGER EN MOSTRADOR", ready="Se llamara su numero",
               paid="PAGADO CON", name="Nombre", rewards="RECOMPENSAS", earned="Puntos ganados", balance="Saldo de puntos", member="Socio",
               server="Mesero", table="Mesa", guests="Personas", check="Cuenta", guide="GUIA DE PROPINA", tip="PROPINA", total="TOTAL", sign="FIRMA",
               merchant_copy="COPIA COMERCIO", customer_copy="COPIA CLIENTE", rx="Rx", copay="COPAGO", coupon="CUPON", mfr="CUPON FABRICANTE",
               savings="AHORRO", saved="USTED AHORRO", fsa="DEDUCIBLE", counsel="El farmaceutico esta disponible para orientarle", pump="BOMBA",
               product="PRODUCTO", price_per="PRECIO/", fuel_total="TOTAL COMBUSTIBLE", trans="TRANS", sku="SKU", desc="DESCRIPCION", qty="CANT",
               unit="PRECIO", ext="IMPORTE", acct="CUENTA", po="OC#", job="OBRA", trip="Viaje", pickup_at="Origen", dropoff="Destino",
               distance="Distancia", duration="Duracion", driver="Conductor", atm="CAJERO", withdrawal="RETIRO", avail="SALDO DISPONIBLE",
               card="TARJETA", ref="REF", ret="DEVOLUCION", orig="ORIG", sale="OFERTA", assoc="VENDEDOR", returned="ARTICULOS DEVUELTOS", bought="ARTICULOS COMPRADOS",
               approved="APROBADA", auth="AUTORIZ", thanks="Gracias", terminal="TERMINAL", merchant_id="NO COMERCIO", chip="CHIP", tap="SIN CONTACTO",
               sub="SUBTOTAL", tax="IVA", fare="TARIFA", ticket="BOLETO ELECTRONICO", seat="Asiento", depart="Sale", member_price="PRECIO SOCIO", multi="MULTIAHORRO",
               points="Puntos", carwash="Codigo de autolavado", kiosk="Kiosco", dine="COMER AQUI", mins="min", rating="Califique su orden"),
}

MODS = {
    "en": ["NO PICKLES", "EXTRA CHEESE", "NO ONION", "SUB SWEET POTATO", "ADD BACON +1.50", "SAUCE ON SIDE", "NO ICE", "MED RARE", "GLUTEN FREE BUN", "ALLERGY: PEANUT"],
    "fr": ["SANS CORNICHONS", "EXTRA FROMAGE", "SANS OIGNON", "SUBST. PATATE DOUCE", "AJOUT BACON +1.50", "SAUCE A PART", "SANS GLACE", "MI-SAIGNANT", "ALLERGIE: ARACHIDES"],
    "es": ["SIN PEPINILLOS", "EXTRA QUESO", "SIN CEBOLLA", "CAMBIO A CAMOTE", "AGREGAR TOCINO +25", "SALSA APARTE", "SIN HIELO", "TERMINO MEDIO", "ALERGIA: CACAHUATE"],
}
DRINK_MODS = {
    "en": ["OAT MILK", "EXTRA SHOT", "NO WHIP", "SKINNY", "2 PUMPS VANILLA", "ICED", "HALF SWEET", "DECAF"],
    "fr": ["LAIT D'AVOINE", "SHOT EXTRA", "SANS CREME FOUETTEE", "ALLEGE", "2 PORTIONS VANILLE", "GLACE", "A MOITIE SUCRE", "DECAFEINE"],
    "es": ["LECHE DE AVENA", "SHOT EXTRA", "SIN CREMA", "LIGERO", "2 BOMBEOS VAINILLA", "FRAPPE", "MITAD DULCE", "DESCAFEINADO"],
}


def L(ctx, key):
    text = LANG[ctx.loc.lang][key]
    return text if ctx.accents else strip_accents(text)


# ---------------------------------------------------------------------------------------------
# Frames: one per market and family. fonts/geom differ by market so nothing repeats exactly.
# ---------------------------------------------------------------------------------------------

_MONO = ["sfmono", "menlo", "monaco", "andale"]
_PROP = ["avenirnext", "gillsans", "optima", "lucida", "geneva", "helvold", "sfui"]
_TYPE = ["typewriter", "typewritercond"]

# family -> list of option dicts; market index picks an option so the five markets differ
_OPTIONS = {
    "kiosk": [dict(fonts=["sfmono"], geom=[(58, 26)], total="box"), dict(fonts=["avenirnext"], geom=[(58, 28)], total="inverse"),
              dict(fonts=["typewritercond"], geom=[(58, 30)], total="double"), dict(fonts=["menlo"], geom=[(80, 36)], total="box"),
              dict(fonts=["gillsans"], geom=[(58, 24)], total="rules")],
    "coffee": [dict(fonts=["avenir"], geom=[(58, 30)], total="bold"), dict(fonts=["optima"], geom=[(80, 34)], total="bold"),
               dict(fonts=["sfui"], geom=[(58, 28)], total="rules"), dict(fonts=["monaco"], geom=[(80, 40)], total="box"),
               dict(fonts=["lucida"], geom=[(80, 36)], total="bold")],
    "rx": [dict(fonts=["courier"], geom=[(80, 44)], total="plain"), dict(fonts=["geneva"], geom=[(80, 38)], total="bold"),
           dict(fonts=["sfmono"], geom=[(80, 46)], total="rules"), dict(fonts=["typewriter"], geom=[(80, 34)], total="bold"),
           dict(fonts=["andale"], geom=[(80, 48)], total="plain")],
    "pump": [dict(fonts=["monaco"], geom=[(58, 30)], total="box"), dict(fonts=["ptmono"], geom=[(58, 28)], total="bold"),
             dict(fonts=["sfmono"], geom=[(58, 32)], total="inverse"), dict(fonts=["couriernew"], geom=[(58, 30)], total="double"),
             dict(fonts=["menlo"], geom=[(58, 26)], total="box")],
    "check_blank": [dict(fonts=["gillsans"], geom=[(80, 36)], total="bold"), dict(fonts=["typewriter"], geom=[(80, 32)], total="bold"),
                    dict(fonts=["avenirnext"], geom=[(80, 38)], total="rules"), dict(fonts=["sfmono"], geom=[(80, 44)], total="plain"),
                    dict(fonts=["optima"], geom=[(80, 34)], total="bold")],
    "check_signed": [dict(fonts=["sfmono"], geom=[(80, 42)], total="plain"), dict(fonts=["courier"], geom=[(80, 40)], total="plain"),
                     dict(fonts=["monaco"], geom=[(80, 44)], total="plain"), dict(fonts=["andale"], geom=[(80, 40)], total="plain"),
                     dict(fonts=["ptmono"], geom=[(80, 42)], total="plain")],
    "dept": [dict(fonts=["optima"], geom=[(80, 40)], total="bold"), dict(fonts=["helvold"], geom=[(80, 42)], total="box"),
             dict(fonts=["avenir"], geom=[(80, 38)], total="rules"), dict(fonts=["gillsans"], geom=[(80, 44)], total="bold"),
             dict(fonts=["lucida"], geom=[(80, 40)], total="double")],
    "hardware": [dict(fonts=["sfmono"], geom=[(80, 52)], total="box"), dict(fonts=["menlo"], geom=[(80, 56)], total="plain"),
                 dict(fonts=["monaco"], geom=[(80, 50)], total="bold"), dict(fonts=["couriernew"], geom=[(80, 54)], total="rules"),
                 dict(fonts=["andale"], geom=[(80, 52)], total="inverse")],
    "transport": [dict(fonts=["avenirnext"], geom=[(58, 30)], total="bold"), dict(fonts=["sfui"], geom=[(58, 28)], total="bold"),
                  dict(fonts=["geneva"], geom=[(58, 30)], total="box"), dict(fonts=["optima"], geom=[(58, 28)], total="bold"),
                  dict(fonts=["lucida"], geom=[(58, 30)], total="rules")],
    "atm": [dict(fonts=["monaco"], geom=[(58, 32)], total="plain"), dict(fonts=["sfmono"], geom=[(58, 30)], total="plain"),
            dict(fonts=["menlo"], geom=[(58, 32)], total="plain"), dict(fonts=["andale"], geom=[(58, 30)], total="plain"),
            dict(fonts=["couriernew"], geom=[(58, 32)], total="plain")],
    "terminal": [dict(fonts=["sfmono"], geom=[(58, 28)], total="box"), dict(fonts=["monaco"], geom=[(58, 30)], total="inverse"),
                 dict(fonts=["menlo"], geom=[(58, 32)], total="double"), dict(fonts=["ptmono"], geom=[(58, 28)], total="box"),
                 dict(fonts=["andale"], geom=[(58, 30)], total="bold")],
    "market2": [dict(fonts=["helvold"], geom=[(80, 42)], total="bold"), dict(fonts=["avenirnext"], geom=[(80, 40)], total="box"),
                dict(fonts=["gillsans"], geom=[(80, 44)], total="rules"), dict(fonts=["typewritercond"], geom=[(80, 36)], total="bold"),
                dict(fonts=["optima"], geom=[(80, 40)], total="bold")],
    "bilingual": [dict(fonts=["avenirnext"], geom=[(80, 42)], total="box"), dict(fonts=["helvold"], geom=[(80, 40)], total="bold")],
}
MARKET_INDEX = {"US": 0, "CA": 1, "UK": 2, "MX": 3, "AU": 4}
MARKET_FLAGS = {
    "US": dict(addr="full"), "CA": dict(addr="full", gst_head=True), "UK": dict(addr="compact", vat_head=True),
    "MX": dict(addr="full", rfc_head=True), "AU": dict(addr="full", abn_head=True),
}


def frames_for(market):
    """The twelve (thirteen in Canada) frames of one market."""
    key = "CA" if market.startswith("CA") else market
    index = MARKET_INDEX[key]
    out = []
    for family in FAMILIES:
        if family == "bilingual" and key != "CA":
            continue
        options = _OPTIONS[family]
        option = dict(options[index % len(options)])
        frame = dict(id="hold-%s-%s" % (key.lower(), family), family=family, align=["center", "left"][(index + len(family)) % 2],
                     tender=["tend", "detail", "line"][(index + len(family)) % 3], items="plain", flags=bool((index + len(family)) % 2),
                     rule=["-", "=", "*", "-", "_"][(index * 3 + len(family)) % 5], tax_rate=bool(index % 2))
        frame.update(MARKET_FLAGS[key])
        frame.update(option)
        out.append(frame)
    return out


# ---------------------------------------------------------------------------------------------
# Context
# ---------------------------------------------------------------------------------------------


class Ctx:
    pass


def make_hold_ctx(spec, rng):
    ctx = Ctx()
    ctx.rng = rng
    ctx.spec = spec
    ctx.loc_key = spec["market"]
    ctx.loc = LOCALES[ctx.loc_key]
    ctx.kind = spec["family"]
    ctx.brand = spec["brand"]
    ctx.hs = spec["header"]
    ctx.logo_hint = spec.get("logo_hint")
    ctx.big = False
    ctx.word_mode = spec["word_mode"]
    ctx.total_layout = spec["total_layout"]
    ctx.mark = spec["mark"]
    ctx.date = spec["date"]
    ctx.hour, ctx.minute, ctx.second = rng.randint(6, 23), rng.randint(0, 59), rng.randint(0, 59)
    ctx.frame = dict(spec["frame"])
    ctx.notes = []
    ctx.accents = True if ctx.loc.lang == "en" else rng.random() < 0.55
    if ctx.loc.lang != "en" and not ctx.accents:
        ctx.notes.append("accents dropped as an ASCII till prints them")
    ctx.bilingual = ctx.kind == "bilingual" or (ctx.loc_key == "CA_en" and rng.random() < 0.25) or (ctx.loc_key == "CA_fr" and rng.random() < 0.2)
    if ctx.bilingual:
        ctx.notes.append("bilingual labels")
    ctx.title_case = False
    ctx.item_title = rng.random() < 0.3
    ctx.align = ctx.frame["align"]
    font = rng.choice(ctx.frame["fonts"])
    paper_mm, cols = rng.choice(ctx.frame["geom"])
    adv = (paper_mm * 11.25 - 2 * 56) / cols
    ctx.style = Style(font=font, adv=adv, cols=cols, paper_mm=paper_mm, line_gap=rng.uniform(1.14, 1.4),
                      top=rng.randint(50, 130), bottom=rng.randint(60, 150), edge="zigzag" if rng.random() < 0.2 else "straight")
    ctx.font = font
    ctx.rule = ctx.frame["rule"]
    ctx.item_mark = "none"
    ctx.name_font = rng.choice(hc.SANS_LARGE) if ctx.hs == "sans-large" else (rng.choice(["impact", "arialblack", "dincond", "futura"]) if rng.random() < 0.3 else None)
    ctx.name_size = rng.choice([2.0, 2.3, 2.6, 2.9]) if ctx.hs == "sans-large" else rng.choice([1.7, 2.0, 2.3])
    ctx.box_style = rng.choice(["single", "double", "inverse", "rounded"])
    ctx.logo_variant = rng.randint(0, 4)
    ctx.legal_pos = rng.choice(["header", "footer"])
    ctx.want_url = rng.random() < 0.3
    ctx.decoy = False
    ctx.total_word = rng.choice(ctx.loc.total_words)
    ctx.noword = rng.choice(ctx.loc.noword)
    ctx.sub_word = rng.choice(ctx.loc.subtotal)
    ctx.total_size = 1.0
    ctx.leader_char = "."
    ctx.coupon = False
    ctx.coupon_word = "COUPON"
    ctx.mod_words = MODS[ctx.loc.lang]
    ctx.ids = dict(s=rng.randint(11, 9899), op=rng.randint(1, 99999999), te=rng.randint(1, 40), tr=rng.randint(1, 99999),
                   reg=rng.randint(1, 24), cashier=rng.choice(catalog.STAFF))
    ctx.payment = "card" if rng.random() < 0.8 else "cash"
    ctx.tip_mode = "none"
    ctx.store = make_store(ctx)
    ctx.store["number"] = ctx.ids["s"]
    ctx.place_rate = ctx.store.get("rate", 0)
    ctx.tax_scheme = ctx.store.get("scheme")
    ctx.card = make_card(ctx)
    ctx.dt_text = None
    ctx.card_printed = False
    ctx.total_printed = None
    ctx.cart = []
    ctx.subtotal = ctx.pre_tip = ctx.total = 0
    ctx.taxes = []
    ctx.included = False
    ctx.final_total = None
    if ctx.word_mode == "noword":
        ctx.payment = "card"
    return ctx


# ---------------------------------------------------------------------------------------------
# Shared pieces
# ---------------------------------------------------------------------------------------------


def hold_name(ctx, b):
    """Name rows: the first corpus's styles, plus large sans-serif type."""
    if ctx.hs == "sans-large":
        brand = ctx.brand
        name = brand["name"] if ctx.accents else strip_accents(brand["name"])
        text = name.upper() if ctx.rng.random() < 0.7 else (brand["mixed"] if ctx.accents else strip_accents(brand["mixed"]))
        b.text(text, align="center" if ctx.align == "center" or ctx.rng.random() < 0.5 else "left", size=ctx.name_size, bold=True,
               font=ctx.name_font, tag="name")
        if brand["slogan"] and ctx.rng.random() < 0.4:
            b.text(brand["slogan"], align="center", size=0.85)
        return
    name_rows(ctx, b)


def header(ctx, b, address=True, store_line=None, dt_left=True):
    b.gap(0.3)
    hold_name(ctx, b)
    if address:
        address_rows(ctx, b)
    if store_line:
        b.text(store_line)
    if ctx.dt_text is None:
        ctx.dt_text = datetime_text(ctx)
    if dt_left:
        b.gap(0.3)
        b.text(ctx.dt_text, align=ctx.align)
    b.gap(0.3)


def name_footer(ctx, b, generic=True):
    """Where a logo-only receipt keeps its name, or a plain thank-you."""
    b.gap(0.4)
    legal_footer(ctx, b)
    if ctx.hs == "logo-only" and ctx.logo_hint == "thanks":
        thanks_rows(ctx, b)
    elif ctx.hs == "logo-only" and ctx.logo_hint == "url":
        url_rows(ctx, b)
    elif generic:
        thanks_rows(ctx, b)
        if ctx.hs != "logo-only" and ctx.want_url:
            url_rows(ctx, b)


def hold_total(ctx, b, cents, label_text=None):
    style = ctx.frame.get("total", "plain")
    text = label_text or total_label(ctx)
    if style == "plain":
        total_rows(ctx, b, cents, label_text=text)
        return
    amount = ctx.loc.amount(cents, ctx.mark)
    ctx.total_printed = ctx.loc.amount(cents, "none")
    size = {"bold": 1.3, "box": 1.5, "inverse": 1.5, "double": 1.6, "rules": 1.4}[style]
    b.cells([(text, 0, "left"), (amount, ctx.style.cols, "right")], bold=True, size=size)
    if style != "bold":
        b.rows[-1].extra["frame"] = style


def hold_totals(ctx, b, total=None, tender=True, sub=True):
    k = ctx.loc_key
    total = ctx.total if total is None else total
    b.rule()
    if sub:
        if k == "MX":
            iva = sum(t.amount for t in ctx.taxes)
            b.pair(label(ctx, "subtotal"), money(ctx, total - iva))
            for t in ctx.taxes:
                if t.base:
                    b.pair(t.label, money(ctx, t.amount))
        elif len(ctx.cart) > 1 or ctx.taxes:
            if not ctx.included or k == "UK":
                b.pair(label(ctx, "subtotal"), money(ctx, ctx.subtotal))
            if not ctx.included:
                tax_rows(ctx, b)
    if ctx.word_mode != "noword":
        hold_total(ctx, b, total)
    if k == "AU" and ctx.included and sub:
        tax_rows(ctx, b)
    if tender:
        tender_rows(ctx, b, total)


def cart_from(ctx, rows, count, category, qty=None):
    ctx.cart = [make_line(ctx.rng.choice(rows), ctx.rng, category, qty) for _ in range(count)]


def finish(ctx, total=None):
    ctx.final_total = ctx.total if total is None else total
    assert ctx.final_total > 0, "%s: a receipt cannot total %d" % (ctx.spec["id"], ctx.final_total)


def short_name(ctx):
    return ctx.ids["cashier"].title()


def ref_line(ctx, text):
    return "%s %s" % (text, digits(ctx.rng, 6))


def tip_block(ctx, b, subtotal, blank=True):
    """Gratuity guide in the market's own terms: a tip, a service charge, or propina."""
    rng, k = ctx.rng, ctx.loc_key
    pcts = (10, 15, 20) if k == "MX" else ((10, 12.5, 15) if k == "UK" else (18, 20, 22))
    b.gap(0.3)
    b.text(L(ctx, "guide"), align="left", size=0.9, bold=True)
    for pct in pcts:
        amount = half_up(Fraction(subtotal) * Fraction(str(pct)) / 100)
        b.pair("%s%%" % ("%g" % pct), money(ctx, amount), size=0.9)
    if blank:
        line = "_" * max(8, int(ctx.style.cols * 0.36))
        b.gap(0.3)
        b.pair(L(ctx, "tip"), line)
        b.pair(L(ctx, "total"), line)
        b.gap(0.4)
        b.text("%s X%s" % (L(ctx, "sign"), "_" * int(ctx.style.cols * 0.5)), align="left")


# ---------------------------------------------------------------------------------------------
# Families
# ---------------------------------------------------------------------------------------------


def fam_kiosk(ctx, b):
    rng = ctx.rng
    rows = catalog._ITEMS["kiosk." + {"US": "en", "CA_en": "en", "CA_fr": "fr", "UK": "uk", "MX": "es", "AU": "au"}[ctx.loc_key]]
    cart_from(ctx, rows, rng.randint(2, 6), "restaurant")
    price(ctx)
    b.gap(0.3)
    hold_name(ctx, b)
    b.text(L(ctx, "kiosk") + " %02d" % ctx.ids["te"], align="center", size=0.9)
    b.gap(0.4)
    b.text(L(ctx, "order"), align="center", size=1.0, bold=True)
    b.text("%s%d" % (rng.choice("ABCDEFGHJKLMNPRSTUVWXYZ"), rng.randint(100, 999)), align="center", size=3.4, bold=True)
    b.text(rng.choice([L(ctx, "eat_in"), L(ctx, "take_out")]), align="center", size=1.2, bold=True)
    ctx.dt_text = datetime_text(ctx)
    b.text(ctx.dt_text, align="center", size=0.9)
    b.rule()
    for line in ctx.cart:
        name = line.name if ctx.accents else strip_accents(line.name)
        b.cells([("%d" % line.qty, 0, "left"), (name[: ctx.style.cols - 12], 3, "left"), (money(ctx, line.amount), ctx.style.cols, "right")])
        if rng.random() < 0.45:
            b.cells([("- " + rng.choice(ctx.mod_words), 5, "left")], size=0.9)
        if rng.random() < 0.2:
            b.cells([("+ " + rng.choice(["LRG FRIES", "MED DRINK", "APPLE SLICES"] if ctx.loc.lang == "en" else ["EXTRA"]), 5, "left")], size=0.9)
    hold_totals(ctx, b)
    b.gap(0.3)
    b.text(L(ctx, "ready"), align="center", size=0.9)
    if rng.random() < 0.5:
        b.raw(Row("qr", size=rng.choice([140, 170])))
        b.text(L(ctx, "rating"), align="center", size=0.8)
    name_footer(ctx, b, generic=False)
    finish(ctx)


def fam_coffee(ctx, b):
    rng = ctx.rng
    key = {"US": "na", "CA_en": "na", "CA_fr": "fr", "UK": "uk", "MX": "es", "AU": "uk"}[ctx.loc_key]
    cart_from(ctx, catalog._ITEMS["coffee." + key], rng.randint(1, 4), "coffee")
    price(ctx)
    header(ctx, b, store_line=None, dt_left=False)
    b.text("%s #%d" % (L(ctx, "order"), rng.randint(1, 299)), align="left", bold=True, size=1.2)
    b.text("%s: %s" % (L(ctx, "name"), ctx.ids["cashier"]), align="left")
    ctx.dt_text = datetime_text(ctx)
    b.text(ctx.dt_text, align="left")
    b.rule()
    for line in ctx.cart:
        name = line.name if ctx.accents else strip_accents(line.name)
        b.cells([(("%dx " % line.qty if line.qty > 1 else "") + name[: ctx.style.cols - 10], 0, "left"), (money(ctx, line.amount), ctx.style.cols, "right")])
        for _ in range(rng.choice([0, 0, 1, 2])):
            b.cells([(rng.choice(DRINK_MODS[ctx.loc.lang]), 3, "left")], size=0.9)
    hold_totals(ctx, b)
    b.gap(0.3)
    b.text(L(ctx, "rewards"), align="left", bold=True, size=0.95)
    b.pair(L(ctx, "earned"), "%d" % rng.randint(3, 40), size=0.9)
    b.pair(L(ctx, "balance"), "%d" % rng.randint(40, 1450), size=0.9)
    b.pair(L(ctx, "member"), "****%s" % digits(rng, 4), size=0.9)
    name_footer(ctx, b)
    finish(ctx)


def fam_rx(ctx, b):
    rng = ctx.rng
    key = {"US": "en", "CA_en": "en", "CA_fr": "fr", "UK": "uk", "MX": "es", "AU": "en"}[ctx.loc_key]
    rx_rows = catalog._ITEMS["rx." + key]
    lines = []
    ctx.rx_lines = []
    for _ in range(rng.randint(1, 3)):
        line = make_line(rng.choice(rx_rows), rng, "pharmacy", 1)
        line.tax = "0"
        lines.append(line)
    front = catalog.items_for(ctx.loc_key, "pharmacy")
    for _ in range(rng.randint(1, 4)):
        item = rng.choice([r for r in front if "RX" not in r["name"] and "ORDON" not in r["name"] and "RECETA" not in r["name"] and "NHS" not in r["name"]])
        lines.append(make_line(item, rng, "pharmacy"))
    coupons = []
    for _ in range(rng.choice([0, 1, 2])):
        target = rng.choice(lines[len(lines) - 1:])
        cents = -min(rng.choice([100, 150, 200, 300, 500]), max(1, target.amount - 1))
        coupons.append(Line(rng.choice([L(ctx, "mfr"), L(ctx, "coupon"), L(ctx, "savings")]), cents, target.tax))
    ctx.cart = lines + coupons
    price(ctx)
    header(ctx, b, store_line="%s: %s %s" % ({"en": "Pharmacist", "fr": "Pharmacien", "es": "Farmaceutico"}[ctx.loc.lang], rng.choice("ABCDEFGHJKLMNPRSTW"), rng.choice(catalog.STAFF).title()))
    b.rule()
    for line in lines:
        name = line.name if ctx.accents else strip_accents(line.name)
        is_rx = line.tax == "0" and line.name in [r["name"] for r in rx_rows]
        if is_rx:
            b.cells([("%s# %s-%02d" % (L(ctx, "rx"), digits(rng, 7), rng.randint(0, 9)), 0, "left")], size=0.95)
            b.cells([(name[: ctx.style.cols - 14], 0, "left"), ("%s %s" % (L(ctx, "copay"), money(ctx, line.amount)), ctx.style.cols, "right")])
            b.cells([("%s %d  Dr %s" % (L(ctx, "qty"), rng.choice([21, 28, 30, 60, 90]), rng.choice(catalog.STAFF).title()), 2, "left")], size=0.85)
        else:
            b.cells([(name[: ctx.style.cols - 10], 0, "left"), (money(ctx, line.amount), ctx.style.cols, "right")])
    for c in coupons:
        b.cells([(c.name, 2, "left"), (money(ctx, c.amount), ctx.style.cols, "right")])
    hold_totals(ctx, b)
    eligible = sum(l.amount for l in lines if l.tax == "0" or rng.random() < 0.4)
    if ctx.payment == "card" and rng.random() < 0.6:
        # a decoy that says "total" after the real one
        b.gap(0.3)
        b.pair("%s TOTAL" % L(ctx, "fsa"), money(ctx, min(max(100, eligible), ctx.total)), size=0.95)
    b.gap(0.3)
    b.text(L(ctx, "counsel"), align="center", size=0.8)
    name_footer(ctx, b)
    finish(ctx)


def fam_pump(ctx, b):
    rng = ctx.rng
    spec = catalog.FUEL[{"CA_en": "CA_en", "CA_fr": "CA_fr"}.get(ctx.loc_key, ctx.loc_key)]
    price_lo, price_hi = spec["price"]
    unit_price = Fraction(round(rng.uniform(price_lo, price_hi), 3)).limit_denominator(1000)
    volume = Fraction(round(rng.uniform(*spec["vol"]), 3)).limit_denominator(1000)
    amount = half_up(unit_price * volume * 100)
    grade = rng.choice(spec["grades"])
    tax = "T" if ctx.loc_key in ("UK", "MX", "AU") else "0"
    ctx.cart = [Line("FUEL " + grade, amount, tax)]
    inside = []
    if rng.random() < 0.3:
        inside = [make_line(rng.choice(catalog.items_for(ctx.loc_key, "convenience")), rng, "convenience")]
        ctx.cart += inside
    price(ctx)
    header(ctx, b, store_line="%s %s" % (L(ctx, "trans"), digits(rng, 6)))
    b.text("%s %02d" % (L(ctx, "pump"), rng.randint(1, 16)), align="left", bold=True)
    b.pair(L(ctx, "product"), grade)
    unit = spec["unit"]
    vol = "%.3f" % float(volume)
    pr = "%.3f" % float(unit_price)
    if ctx.loc_key == "CA_fr":
        vol, pr = vol.replace(".", ","), pr.replace(".", ",")
    if ctx.loc_key == "AU":
        pr = "%.1f c/L" % (float(unit_price) * 100)
    b.pair({"en": "VOLUME", "fr": "VOLUME", "es": "LITROS"}[ctx.loc.lang] if unit != "GAL" else "GALLONS", "%s %s" % (vol, unit))
    b.pair(L(ctx, "price_per") + unit, pr)
    ctx.pump_amount = amount
    if inside:
        b.pair("FUEL", money(ctx, amount))
        for line in inside:
            b.pair(line.name if ctx.accents else strip_accents(line.name), money(ctx, line.amount))
        hold_totals(ctx, b)
    else:
        b.rule()
        hold_total(ctx, b, amount, label_text=ctx.noword if ctx.word_mode == "noword" else L(ctx, "fuel_total"))
        if ctx.payment == "card":
            tender_rows(ctx, b, amount)
    if rng.random() < 0.6:
        b.text("%s: %s" % (L(ctx, "carwash"), digits(rng, 4)), align="center", size=0.9)
    if rng.random() < 0.5:
        b.text("ODO %s" % digits(rng, 6), align="left", size=0.9)
    name_footer(ctx, b)
    finish(ctx)


def _check_items(ctx):
    rng = ctx.rng
    key = {"US": "na", "CA_en": "na", "CA_fr": "fr", "UK": "uk", "MX": "es", "AU": "au"}[ctx.loc_key]
    cart_from(ctx, catalog._ITEMS["restaurant." + key], rng.randint(3, 10), "restaurant")
    for line in ctx.cart:
        for _ in range(rng.choice([0, 0, 1, 2])):
            line.mods.append(rng.choice(ctx.mod_words))


def _check_rows(ctx, b):
    rng = ctx.rng
    for line in ctx.cart:
        name = line.name if ctx.accents else strip_accents(line.name)
        seat = rng.choice(["S1", "S2", "S3", "S4", ""]) if rng.random() < 0.5 else ""
        b.cells([(("%d  " % line.qty) + name[: ctx.style.cols - 14], 0, "left"), (seat, ctx.style.cols - 10, "left"), (money(ctx, line.amount), ctx.style.cols, "right")])
        for mod in line.mods:
            b.cells([(mod, 4, "left")], size=0.9)


def fam_check_blank(ctx, b):
    rng = ctx.rng
    _check_items(ctx)
    price(ctx)
    header(ctx, b, store_line="%s %d   %s %d   %s %s" % (L(ctx, "table"), rng.randint(1, 60), L(ctx, "guests"), rng.randint(1, 8), L(ctx, "server"), ctx.ids["cashier"].title()), dt_left=True)
    b.text("%s #%d" % (L(ctx, "check"), ctx.ids["tr"]), align="left")
    b.rule()
    _check_rows(ctx, b)
    ctx.word_mode = "word"
    hold_totals(ctx, b, tender=False)
    tip_block(ctx, b, ctx.subtotal, blank=True)
    ctx.notes.append("tip and total lines left blank: expected is the printed total before tip")
    name_footer(ctx, b)
    finish(ctx)


def fam_check_signed(ctx, b):
    rng = ctx.rng
    _check_items(ctx)
    price(ctx)
    header(ctx, b, store_line="%s %d   %s %s" % (L(ctx, "table"), rng.randint(1, 60), L(ctx, "server"), ctx.ids["cashier"].title()))
    b.text(L(ctx, "merchant_copy"), align="center", bold=True, size=0.9)
    b.rule()
    ctx.word_mode = "word"
    hold_totals(ctx, b, tender=False)
    ctx.card_printed = True
    b.text("%s %s" % (ctx.card["network"], ctx.card["mask"]), align="left")
    b.text("%s %s" % (L(ctx, "auth"), digits(rng, 6)), align="left", size=0.9)
    pct = rng.choice([10, 15, 18, 20, 22])
    tip = half_up(Fraction(ctx.subtotal) * pct / 100)
    # round the written tip to something a person writes
    tip = max(100, (tip // 50) * 50)
    final = ctx.total + tip
    font = rng.choice(["bradley", "noteworthy", "markerfelt"])
    tilt = rng.choice([-3, -2, 2, 3])
    b.gap(0.3)
    for text, cents, tilt_sign in ((L(ctx, "tip"), tip, 1), (L(ctx, "total"), final, -1)):
        row = Row("cols", cells=[(text, 0, "left"), (ctx.loc.amount(cents, ctx.mark), ctx.style.cols, "right", dict(font=font, size=1.5, tilt=tilt * tilt_sign))], size=1.5)
        row.extra["leader"] = "_"
        b.rows.append(row)
    ctx.total_printed = ctx.loc.amount(final, "none")
    b.text("%s X" % L(ctx, "sign"), align="left")
    b.rows.append(Row("scribble", size=2.2, strokes=rng.randint(10, 20)))
    ctx.notes.append("tip and total written in by hand: expected is the handwritten total")
    name_footer(ctx, b)
    finish(ctx, final)


def fam_dept(ctx, b):
    rng = ctx.rng
    dep = catalog.items_for(ctx.loc_key, "department")
    ctx.cart = []
    ctx.dept_blocks = []
    for _ in range(rng.randint(2, 5)):
        line = make_line(rng.choice(dep), rng, "department", 1)
        orig = line.amount
        pct = rng.choice([10, 20, 25, 30, 40, 50])
        off = half_up(Fraction(orig) * pct / 100)
        line.amount = orig - off
        ctx.dept_blocks.append((line, orig, pct, off))
        ctx.cart.append(line)
    returns = []
    bought = sum(l.amount for l in ctx.cart)
    if rng.random() < 0.55:
        r = make_line(rng.choice(dep), rng, "department", 1)
        r.amount = -min(r.amount, int(bought * 0.4))
        returns.append(r)
        ctx.cart.append(r)
    coupons = []
    if rng.random() < 0.6:
        c = Line(rng.choice([L(ctx, "coupon") + " " + digits(rng, 4), "SAVE" + rng.choice(["10", "15", "20"])]), -min(rng.choice([500, 1000, 1500]), max(100, bought // 5)), "T")
        coupons.append(c)
        ctx.cart.append(c)
    price(ctx)
    header(ctx, b, store_line="%s: %s   %s %d" % (L(ctx, "assoc"), ctx.ids["cashier"].title(), "REG", ctx.ids["reg"]))
    b.rule()
    saved = 0
    for line, orig, pct, off in ctx.dept_blocks:
        name = line.name if ctx.accents else strip_accents(line.name)
        b.cells([("%s %s" % (digits(rng, 6), name)[: ctx.style.cols - 10], 0, "left")])
        b.cells([(L(ctx, "orig"), 3, "left"), (money(ctx, orig), ctx.style.cols - 12, "right")], size=0.9)
        b.cells([("%s %d%% OFF" % (L(ctx, "sale"), pct), 3, "left"), ("-" + money(ctx, off), ctx.style.cols - 12, "right"), (money(ctx, line.amount), ctx.style.cols, "right")], size=0.9)
        saved += off
    for r in returns:
        name = r.name if ctx.accents else strip_accents(r.name)
        b.cells([("%s %s" % (L(ctx, "ret"), name)[: ctx.style.cols - 10], 0, "left"), (money(ctx, r.amount), ctx.style.cols, "right")])
        b.cells([("%s %s" % (L(ctx, "ref"), digits(rng, 8)), 3, "left")], size=0.85)
    for c in coupons:
        b.cells([(c.name, 0, "left"), (money(ctx, c.amount), ctx.style.cols, "right")])
        saved += -c.amount
    hold_totals(ctx, b)
    b.gap(0.2)
    b.pair(L(ctx, "saved"), money(ctx, saved), size=0.9)
    if returns:
        b.pair(L(ctx, "returned"), "%d" % len(returns), size=0.85)
    b.pair(L(ctx, "bought"), "%d" % len(ctx.dept_blocks), size=0.85)
    b.raw(Row("barcode", text=" ".join(digits(rng, 4) for _ in range(4)), h=100, frac=0.8))
    name_footer(ctx, b)
    finish(ctx)


def fam_hardware(ctx, b):
    rng = ctx.rng
    rows = catalog.items_for(ctx.loc_key, "hardware")
    cart_from(ctx, rows, rng.randint(3, 9), "hardware")
    ctx.cart = [l for l in ctx.cart]
    disc = []
    if rng.random() < 0.4:
        disc.append(Line({"en": "TRADE DISCOUNT 5%", "fr": "RABAIS ENTREPRENEUR 5%", "es": "DESCUENTO CONTRATISTA 5%"}[ctx.loc.lang], -half_up(Fraction(sum(l.amount for l in ctx.cart)) * 5 / 100), "T"))
        ctx.cart += disc
    price(ctx)
    cols = ctx.style.cols
    header(ctx, b, store_line="%s: %s   %s: %s" % (L(ctx, "acct"), "****" + digits(rng, 4), L(ctx, "po"), digits(rng, 6)))
    b.text("%s: %s" % (L(ctx, "job"), rng.choice(["DECK", "BATHROOM", "FENCE", "GARAGE", "ROOF", "KITCHEN"] if ctx.loc.lang == "en" else ["TERRAZA", "BANO", "BARDA", "COCINA"] if ctx.loc.lang == "es" else ["TERRASSE", "SALLE DE BAIN", "CLOTURE", "CUISINE"])), align="left", size=0.9)
    b.rule("-")
    q_col, p_col, e_col = cols - 20, cols - 10, cols
    b.cells([(L(ctx, "sku"), 0, "left"), (L(ctx, "desc"), 10, "left"), (L(ctx, "qty"), q_col, "right"), (L(ctx, "unit"), p_col, "right"), (L(ctx, "ext"), e_col, "right")], bold=True, size=0.9)
    b.rule("-")
    for line in ctx.cart:
        if line in disc:
            b.cells([("", 0, "left"), (line.name, 10, "left"), (money(ctx, line.amount), e_col, "right")])
            continue
        name = line.name if ctx.accents else strip_accents(line.name)
        unit = line.unit or line.amount
        b.cells([(digits(rng, 8 if cols > 50 else 6), 0, "left"), (name[: q_col - 16], 10, "left"), ("%d" % line.qty, q_col, "right"), (money(ctx, unit), p_col, "right"), (money(ctx, line.amount), e_col, "right")])
    hold_totals(ctx, b)
    b.text("%s %s" % (L(ctx, "thanks"), ""), align="center", size=0.9)
    b.raw(Row("barcode", text=digits(rng, 12), h=90, frac=0.7))
    name_footer(ctx, b, generic=False)
    finish(ctx)


def fam_transport(ctx, b):
    rng, k = ctx.rng, ctx.loc_key
    lang = ctx.loc.lang
    brand = ctx.brand
    rail = brand["name"] in ("Amtrak", "VIA Rail", "Trainline", "National Express", "ADO")
    cart = []
    if rail:
        for label_text in rng.sample(hc.RAIL[lang][:3], 1) + ([hc.RAIL[lang][4]] if rng.random() < 0.5 else []):
            lo, hi = (160.0, 1450.0) if k == "MX" else (14.0, 118.0)
            if label_text == hc.RAIL[lang][4]:
                lo, hi = (25.0, 55.0) if k == "MX" else (1.5, 4.5)
            cart.append(Line(label_text, int(rng.uniform(lo, hi) * 100), "0"))
    else:
        rows = hc.TRANSPORT[lang]
        base = rows[0]
        cart.append(Line(base[0], int(rng.uniform(base[1], base[2]) * 100), "0"))
        for entry in rng.sample(rows[1:], rng.randint(2, 4)):
            cart.append(Line(entry[0], int(rng.uniform(entry[1], entry[2]) * 100), "0"))
    ctx.cart = [l for l in cart if True]
    ctx.cart = [l for l in ctx.cart if sum(x.amount for x in ctx.cart) > 0]
    gross = sum(l.amount for l in ctx.cart)
    tip = 0
    if not rail and rng.random() < 0.5:
        tip = max(100, (half_up(Fraction(gross) * rng.choice([10, 15, 20]) / 100) // 50) * 50)
    price(ctx)
    ctx.total = ctx.pre_tip = ctx.subtotal + tip
    header(ctx, b, address=False, store_line=None, dt_left=False)
    if rail:
        b.text(L(ctx, "ticket"), align="center", bold=True, size=1.2)
        a_to_b = rng.sample(["LEEDS", "YORK", "BRISTOL", "TORONTO", "OTTAWA", "MONTREAL", "CHICAGO", "ALBANY", "PUEBLA", "QUERETARO", "GUADALAJARA", "SYDNEY", "CANBERRA"], 2)
        b.text("%s  >  %s" % tuple(a_to_b), align="center", bold=True)
        ctx.dt_text = datetime_text(ctx)
        b.text("%s %s" % (L(ctx, "depart"), ctx.dt_text), align="left")
        b.text("%s %s%d  %s %s" % ("Coach", rng.choice("ABCDEF"), rng.randint(1, 12), L(ctx, "seat"), rng.randint(1, 80)), align="left", size=0.95)
        b.text("%s %s" % (L(ctx, "ref"), digits(rng, 8)), align="left", size=0.95)
    else:
        b.text({"en": "Thanks for riding", "fr": "Merci d'avoir voyage avec nous", "es": "Gracias por viajar con nosotros"}[lang], align="left", bold=True, size=1.2)
        ctx.dt_text = datetime_text(ctx)
        b.text(ctx.dt_text, align="left")
        b.text("%s %s: %s" % (L(ctx, "trip"), digits(rng, 6), rng.choice(["Uber X", "Comfort", "Taxi", "Standard"])), align="left", size=0.95)
        b.text("%s: %s  %s" % (L(ctx, "driver"), ctx.ids["cashier"].title(), "#" + digits(rng, 5)), align="left", size=0.95)
        b.text("%s: %d.%d %s" % (L(ctx, "distance"), rng.randint(2, 34), rng.randint(0, 9), "mi" if k == "US" else "km"), align="left", size=0.9)
        b.text("%s: %d %s" % (L(ctx, "duration"), rng.randint(6, 58), L(ctx, "mins")), align="left", size=0.9)
        s = ctx.store
        b.text("%s: %s" % (L(ctx, "pickup_at"), s["street"]), align="left", size=0.9)
        b.text("%s: %s" % (L(ctx, "dropoff"), "%d %s" % (rng.randint(10, 990), rng.choice(catalog.STREETS_EN if lang == "en" else catalog.STREETS_FR if lang == "fr" else catalog.STREETS_MX))), align="left", size=0.9)
    b.rule()
    for line in ctx.cart:
        b.pair(line.name if ctx.accents else strip_accents(line.name), money(ctx, line.amount))
    if tip:
        b.pair(L(ctx, "tip"), money(ctx, tip))
    b.rule()
    hold_total(ctx, b, ctx.total)
    if ctx.payment == "card":
        tender_rows(ctx, b, ctx.total)
    name_footer(ctx, b, generic=False)
    finish(ctx)


def fam_atm(ctx, b):
    rng = ctx.rng
    amounts = hc.ATM_AMOUNTS["MX" if ctx.loc_key == "MX" else "default"]
    amount = rng.choice(amounts)
    balance = amount + rng.randint(5000 if ctx.loc_key != "MX" else 50000, 480000)
    ctx.total = ctx.pre_tip = ctx.subtotal = amount
    ctx.taxes = []
    b.gap(0.3)
    hold_name(ctx, b)
    b.text({"en": "TRANSACTION RECORD", "fr": "RELEVE DE TRANSACTION", "es": "COMPROBANTE DE OPERACION"}[ctx.loc.lang], align="center", bold=True, size=0.95)
    ctx.dt_text = datetime_text(ctx)
    b.text(ctx.dt_text, align="center")
    b.text("%s %s  %s" % (L(ctx, "atm"), digits(rng, 6), ctx.store["street"][:20]), align="left", size=0.9)
    b.text("%s %s" % (L(ctx, "card"), ctx.card["mask"]), align="left")
    ctx.card_printed = True
    b.text("%s %s" % (L(ctx, "ref"), digits(rng, 8)), align="left", size=0.9)
    b.rule()
    b.text({"en": "WITHDRAWAL FROM CHEQUING", "fr": "RETRAIT DU COMPTE CHEQUES", "es": "RETIRO DE CUENTA DE CHEQUES"}[ctx.loc.lang], align="left", size=0.95)
    label_text = rng.choice([L(ctx, "withdrawal"), {"en": "AMOUNT", "fr": "MONTANT", "es": "IMPORTE"}[ctx.loc.lang]])
    b.cells([(label_text, 0, "left"), (ctx.loc.amount(amount, ctx.mark), ctx.style.cols, "right")], bold=True, size=1.3)
    ctx.total_printed = ctx.loc.amount(amount, "none")
    b.gap(0.3)
    b.cells([(L(ctx, "avail"), 0, "left"), (ctx.loc.amount(balance, "none"), ctx.style.cols, "right")], size=0.95)
    b.gap(0.4)
    b.text({"en": "Keep this record. Please take your card.", "fr": "Conservez ce releve. Reprenez votre carte.", "es": "Conserve este comprobante. Retire su tarjeta."}[ctx.loc.lang], align="center", size=0.85)
    name_footer(ctx, b, generic=False)
    ctx.notes.append("ATM withdrawal: the available balance is larger and is not the amount")
    finish(ctx, amount)


def fam_terminal(ctx, b):
    rng = ctx.rng
    low, high = (4500, 180000) if ctx.loc_key == "MX" else (450, 38000)
    amount = rng.randint(low, high) // 5 * 5 + rng.choice([0, 4, 9])
    ctx.total = ctx.pre_tip = ctx.subtotal = amount
    ctx.taxes = []
    b.gap(0.3)
    hold_name(ctx, b)
    b.text(ctx.store["street"], align="center", size=0.9)
    b.text("%s %s    %s %s" % (L(ctx, "terminal"), digits(rng, 8), "MID", digits(rng, 10)), align="left", size=0.85)
    ctx.dt_text = datetime_text(ctx)
    b.text(ctx.dt_text, align="left")
    b.rule()
    b.text(rng.choice([L(ctx, "chip"), L(ctx, "tap")]), align="left", size=0.9)
    ctx.card_printed = True
    b.text("%s  %s" % (ctx.card["network"], ctx.card["mask"]), align="left")
    b.text("AID A0000000%s   %s %s" % (digits(rng, 6), L(ctx, "auth"), digits(rng, 6)), align="left", size=0.85)
    b.gap(0.3)
    b.text({"en": "SALE", "fr": "VENTE", "es": "VENTA"}[ctx.loc.lang], align="center", bold=True)
    label_text = ctx.noword if ctx.word_mode == "noword" else rng.choice([{"en": "AMOUNT", "fr": "MONTANT", "es": "IMPORTE"}[ctx.loc.lang], total_label(ctx)])
    hold_total(ctx, b, amount, label_text=label_text)
    b.gap(0.3)
    b.text(L(ctx, "approved"), align="center", bold=True)
    b.text(rng.choice([L(ctx, "customer_copy"), L(ctx, "merchant_copy")]), align="center", size=0.9)
    name_footer(ctx, b, generic=False)
    finish(ctx, amount)


def fam_market2(ctx, b):
    rng = ctx.rng
    key = {"US": "us", "CA_en": "ca_en", "CA_fr": "ca_fr", "UK": "uk", "MX": "mx", "AU": "au"}[ctx.loc_key]
    cart_from(ctx, catalog._ITEMS["grocery." + key], rng.randint(6, 18), "grocery")
    discounts = []
    for line in rng.sample(ctx.cart, min(len(ctx.cart), rng.randint(1, 4))):
        kind = rng.choice([L(ctx, "multi"), L(ctx, "member_price"), L(ctx, "coupon")])
        cents = -min(rng.choice([50, 60, 100, 150, 200]), max(1, line.amount - 1))
        discounts.append((line, kind, cents))
    lines = []
    for line in ctx.cart:
        lines.append(line)
        for l, kind, cents in discounts:
            if l is line:
                lines.append(Line(kind, cents, line.tax))
    ctx.cart = lines
    price(ctx)
    header(ctx, b, store_line="%s %s" % ("#" + digits(rng, 4), L(ctx, "member") + " ****" + digits(rng, 4)))
    b.rule()
    saved = 0
    for line in ctx.cart:
        name = line.name if ctx.accents else strip_accents(line.name)
        if line.amount < 0:
            b.cells([(name, 3, "left"), (money(ctx, line.amount), ctx.style.cols, "right")], size=0.95)
            saved += -line.amount
        else:
            b.cells([(name[: ctx.style.cols - 12], 0, "left"), (money(ctx, line.amount), ctx.style.cols, "right")])
            if line.weight is not None:
                b.cells([("%s %s @ %s/%s" % ("%.3f" % line.weight, line.unit_label, ctx.loc.amount(line.unit, "none"), line.unit_label), 3, "left")], size=0.9)
    hold_totals(ctx, b)
    b.gap(0.3)
    b.pair(L(ctx, "saved"), money(ctx, saved), bold=True, size=0.95)
    b.pair(L(ctx, "earned"), "%d" % rng.randint(10, 240), size=0.9)
    b.pair(L(ctx, "balance"), "%d" % rng.randint(100, 9900), size=0.9)
    name_footer(ctx, b)
    finish(ctx)


def fam_bilingual(ctx, b):
    """Canadian two-language till: labels in English and French side by side."""
    rng = ctx.rng
    cat = ctx.brand["cat"]
    lang_key = "ca_fr" if ctx.loc_key == "CA_fr" else "ca_en"
    rows = catalog._ITEMS["grocery." + lang_key] if cat in ("grocery", "convenience") else catalog.items_for(ctx.loc_key, cat if cat in ("department", "hardware", "pharmacy") else "department")
    cart_from(ctx, rows, rng.randint(3, 10), cat if cat in ("grocery", "department", "hardware", "pharmacy") else "department")
    price(ctx)
    ctx.bilingual = True
    cols = ctx.style.cols
    header(ctx, b, store_line="Store/Magasin %d   Reg/Caisse %d" % (ctx.ids["s"], ctx.ids["reg"]))
    b.cells([("ITEM / ARTICLE", 0, "left"), ("PRICE / PRIX", cols, "right")], bold=True, size=0.9)
    b.rule()
    for line in ctx.cart:
        name = line.name if ctx.accents else strip_accents(line.name)
        b.cells([(name[: cols - 12], 0, "left"), (money(ctx, line.amount), cols, "right")])
    b.rule()
    b.cells([("SUBTOTAL", 0, "left"), ("SOUS-TOTAL", int(cols * 0.5), "left"), (money(ctx, ctx.subtotal), cols, "right")])
    for t in ctx.taxes:
        pct = ("%.3f" % float(t.rate * 100)).rstrip("0").rstrip(".")
        names = {"GST": "TPS", "HST": "TVH", "PST": "TVP", "TPS": "GST", "TVQ": "QST"}
        b.cells([("%s %s%%" % (t.label, pct), 0, "left"), (names.get(t.label, ""), int(cols * 0.5), "left"), (money(ctx, t.amount), cols, "right")])
    ctx.word_mode = "word"
    ctx.total_word = "TOTAL"
    hold_total(ctx, b, ctx.total, label_text="TOTAL / TOTAL")
    tender_rows(ctx, b, ctx.total)
    b.gap(0.3)
    b.text("THANK YOU / MERCI", align="center", bold=True)
    b.text("CUSTOMER COPY / COPIE DU CLIENT", align="center", size=0.85)
    name_footer(ctx, b, generic=False)
    finish(ctx)


BUILD = dict(kiosk=fam_kiosk, coffee=fam_coffee, rx=fam_rx, pump=fam_pump, check_blank=fam_check_blank, check_signed=fam_check_signed,
             dept=fam_dept, hardware=fam_hardware, transport=fam_transport, atm=fam_atm, terminal=fam_terminal, market2=fam_market2,
             bilingual=fam_bilingual)


def compose_hold(ctx):
    b = Builder(ctx)
    BUILD[ctx.kind](ctx, b)
    return b.rows
