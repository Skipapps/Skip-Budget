"""What is printed on a receipt: locales, money, carts, header styles and the per-market frames.

All money is integer cents; tax is rounded half up on the cent exactly as a till does it, so every
printed total equals the sum of its parts and the expected value in expected.json is exact.
"""

import datetime
from fractions import Fraction

import catalog
from render import DISPLAY, MONO, Row, Style

# ---------------------------------------------------------------------------------------------
# Money
# ---------------------------------------------------------------------------------------------


def half_up(value):
    return int((Fraction(value) + Fraction(1, 2)) // 1)


def group(whole, sep):
    text = str(whole)
    if not sep:
        return text
    out = []
    while len(text) > 3:
        out.insert(0, text[-3:])
        text = text[:-3]
    out.insert(0, text)
    return sep.join(out)


class Locale:
    def __init__(self, key, **kw):
        self.key = key
        self.__dict__.update(kw)

    def amount(self, cents, mark="none", neg="lead"):
        sign = cents < 0
        whole, frac = divmod(abs(cents), 100)
        text = "%s%s%02d" % (group(whole, self.thou), self.dec, frac)
        if mark == "before":
            text = self.cur + (self.cur_gap if self.lang == "fr" else "") + text
        elif mark == "after":
            text = text + (" " + self.cur_after)
        if sign:
            text = ("-" + text) if neg == "lead" else (text + "-")
        return text


LOCALES = {
    "US": Locale("US", country="US", lang="en", cur="$", cur_after="USD", cur_gap="", dec=".", thou=",",
                 total_words=["TOTAL", "TOTAL", "TOTAL", "BALANCE", "TOTAL DUE", "AMOUNT DUE", "TOTAL SALE", "GRAND TOTAL"],
                 noword=["AMOUNT", "PAID", "VISA", "MASTERCARD", "DEBIT"], subtotal=["SUBTOTAL", "SUB TOTAL", "SUBTOTAL"],
                 cash="CASH", change=["CHANGE", "CHANGE DUE"], tip="TIP", thanks=["THANK YOU", "THANK YOU FOR SHOPPING", "THANKS FOR VISITING"],
                 welcome=["WELCOME TO", "Welcome to"], at="Thank you for shopping at %s", approved="APPROVED", sale="SALE",
                 copy=["CUSTOMER COPY", "MERCHANT COPY"], items_sold="# ITEMS SOLD", survey="Tell us how we did", save="YOU SAVED"),
    "CA_en": Locale("CA_en", country="CA", lang="en", cur="$", cur_after="CAD", cur_gap="", dec=".", thou=",",
                    total_words=["TOTAL", "TOTAL", "TOTAL", "TOTAL DUE", "BALANCE", "AMOUNT DUE"],
                    noword=["AMOUNT", "DEBIT", "VISA", "MASTERCARD", "INTERAC"], subtotal=["SUBTOTAL", "SUB TOTAL"],
                    cash="CASH", change=["CHANGE", "CHANGE DUE"], tip="TIP", thanks=["THANK YOU", "THANK YOU, COME AGAIN", "THANKS"],
                    welcome=["WELCOME TO", "Welcome to"], at="Thank you for shopping at %s", approved="APPROVED", sale="PURCHASE",
                    copy=["CUSTOMER COPY", "MERCHANT COPY"], items_sold="ITEM COUNT", survey="Win $1000: tell us about your visit", save="YOU SAVED"),
    "CA_fr": Locale("CA_fr", country="CA", lang="fr", cur="$", cur_after="$", cur_gap=" ", dec=",", thou=" ",
                    total_words=["TOTAL", "TOTAL", "MONTANT DÛ", "TOTAL À PAYER", "À PAYER", "SOLDE", "MONTANT TOTAL"],
                    noword=["À PAYER", "MONTANT", "VISA", "MASTERCARD", "DÉBIT", "INTERAC"], subtotal=["SOUS-TOTAL", "SOUS TOTAL"],
                    cash="COMPTANT", change=["MONNAIE", "RENDU"], tip="POURBOIRE", thanks=["MERCI", "MERCI DE VOTRE VISITE", "MERCI ET À BIENTÔT"],
                    welcome=["BIENVENUE CHEZ", "Bienvenue chez"], at="Merci d'avoir magasiné chez %s", approved="APPROUVÉ", sale="ACHAT",
                    copy=["COPIE DU CLIENT", "COPIE DU MARCHAND"], items_sold="NOMBRE D'ARTICLES", survey="Dites-nous ce que vous en pensez", save="VOUS AVEZ ÉCONOMISÉ"),
    "UK": Locale("UK", country="UK", lang="en", cur="£", cur_after="GBP", cur_gap="", dec=".", thou=",",
                 total_words=["BALANCE TO PAY", "BALANCE TO PAY", "TOTAL", "TOTAL TO PAY", "AMOUNT DUE", "TO PAY"],
                 noword=["PAID", "CARD", "VISA DEBIT", "CONTACTLESS", "AMOUNT"], subtotal=["SUBTOTAL", "SUB TOTAL"],
                 cash="CASH", change=["CHANGE", "CHANGE DUE"], tip="SERVICE", thanks=["THANK YOU FOR SHOPPING WITH US", "THANK YOU", "THANKS, SEE YOU SOON"],
                 welcome=["Welcome to", "WELCOME TO"], at="Thanks for shopping at %s", approved="AUTHORISED", sale="SALE",
                 copy=["CUSTOMER COPY", "CARDHOLDER COPY"], items_sold="ITEMS", survey="Tell us about your visit and win £1000", save="YOU SAVED"),
    "MX": Locale("MX", country="MX", lang="es", cur="$", cur_after="MXN", cur_gap="", dec=".", thou=",",
                 total_words=["TOTAL", "TOTAL", "TOTAL A PAGAR", "TOTAL A PAGAR", "IMPORTE", "IMPORTE TOTAL"],
                 noword=["IMPORTE", "TARJETA", "VISA", "MASTERCARD", "PAGO TARJETA"], subtotal=["SUBTOTAL", "SUB-TOTAL"],
                 cash="EFECTIVO", change=["CAMBIO"], tip="PROPINA", thanks=["GRACIAS POR SU COMPRA", "GRACIAS, VUELVA PRONTO", "¡GRACIAS!"],
                 welcome=["BIENVENIDO A", "BIENVENIDO"], at="Gracias por su compra en %s", approved="APROBADA", sale="VENTA",
                 copy=["COPIA CLIENTE", "COPIA COMERCIO"], items_sold="ARTICULOS", survey="Cuentanos tu experiencia", save="AHORRASTE"),
    "AU": Locale("AU", country="AU", lang="en", cur="$", cur_after="AUD", cur_gap="", dec=".", thou=",",
                 total_words=["TOTAL", "TOTAL", "TOTAL", "AMOUNT DUE", "TOTAL AUD", "BALANCE DUE", "TOTAL INC GST"],
                 noword=["EFTPOS", "VISA", "MASTERCARD", "PAID", "AMOUNT"], subtotal=["SUBTOTAL", "SUB TOTAL"],
                 cash="CASH", change=["CHANGE", "CHANGE DUE"], tip="SURCHARGE", thanks=["THANK YOU", "THANKS FOR SHOPPING", "THANK YOU, HAVE A GREAT DAY"],
                 welcome=["WELCOME TO", "Welcome to"], at="Thanks for shopping at %s", approved="APPROVED", sale="PURCHASE",
                 copy=["CUSTOMER COPY", "MERCHANT COPY"], items_sold="ITEMS", survey="Tell us how we did, win a $1000 gift card", save="YOU SAVED"),
}

MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
MONTHS_ES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]
DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def date_text(locale_key, d, rng, fmt=None):
    """(printed date, format name). Day-first and month-first both occur in Canada."""
    y2 = "%02d" % (d.year % 100)
    dd, mm, yyyy = "%02d" % d.day, "%02d" % d.month, "%d" % d.year
    options = {
        "US": [(30, "MM/DD/YYYY", "%s/%s/%s" % (mm, dd, yyyy)), (22, "MM/DD/YY", "%s/%s/%s" % (mm, dd, y2)),
               (14, "Mon DD, YYYY", "%s %s, %s" % (MONTHS_EN[d.month - 1], dd, yyyy)), (8, "YYYY-MM-DD", "%s-%s-%s" % (yyyy, mm, dd)),
               (14, "DDD MM/DD/YYYY", "%s %s/%s/%s" % (DAYS_EN[d.weekday()], mm, dd, yyyy)), (12, "MM-DD-YYYY", "%s-%s-%s" % (mm, dd, yyyy))],
        "CA_en": [(34, "YYYY-MM-DD", "%s-%s-%s" % (yyyy, mm, dd)), (18, "MM/DD/YYYY", "%s/%s/%s" % (mm, dd, yyyy)),
                  (16, "DD/MM/YYYY", "%s/%s/%s" % (dd, mm, yyyy)), (10, "YYYY/MM/DD", "%s/%s/%s" % (yyyy, mm, dd)),
                  (12, "Mon DD, YYYY", "%s %s, %s" % (MONTHS_EN[d.month - 1], dd, yyyy)), (10, "DD/MM/YY", "%s/%s/%s" % (dd, mm, y2))],
        "CA_fr": [(36, "YYYY-MM-DD", "%s-%s-%s" % (yyyy, mm, dd)), (20, "YYYY/MM/DD", "%s/%s/%s" % (yyyy, mm, dd)),
                  (16, "DD/MM/YYYY", "%s/%s/%s" % (dd, mm, yyyy)), (14, "D mois YYYY", "%d %s %s" % (d.day, MONTHS_FR[d.month - 1], yyyy)),
                  (14, "DD/MM/YY", "%s/%s/%s" % (dd, mm, y2))],
        "UK": [(48, "DD/MM/YYYY", "%s/%s/%s" % (dd, mm, yyyy)), (22, "DD/MM/YY", "%s/%s/%s" % (dd, mm, y2)),
               (10, "DD-Mon-YYYY", "%s-%s-%s" % (dd, MONTHS_EN[d.month - 1], yyyy)), (10, "DD Mon YYYY", "%s %s %s" % (dd, MONTHS_EN[d.month - 1], yyyy)),
               (10, "DD.MM.YYYY", "%s.%s.%s" % (dd, mm, yyyy))],
        "MX": [(44, "DD/MM/YYYY", "%s/%s/%s" % (dd, mm, yyyy)), (16, "DD/MM/YY", "%s/%s/%s" % (dd, mm, y2)),
               (14, "DD-MMM-YYYY", "%s-%s-%s" % (dd, MONTHS_ES[d.month - 1], yyyy)), (12, "DD MMM YYYY", "%s %s %s" % (dd, MONTHS_ES[d.month - 1], yyyy)),
               (8, "YYYY-MM-DD", "%s-%s-%s" % (yyyy, mm, dd)), (6, "DD.MM.YYYY", "%s.%s.%s" % (dd, mm, yyyy))],
        "AU": [(46, "DD/MM/YYYY", "%s/%s/%s" % (dd, mm, yyyy)), (20, "DD/MM/YY", "%s/%s/%s" % (dd, mm, y2)),
               (14, "DD Mon YYYY", "%s %s %s" % (dd, MONTHS_EN[d.month - 1], yyyy)), (12, "DD-MM-YYYY", "%s-%s-%s" % (dd, mm, yyyy)),
               (8, "DD.MM.YY", "%s.%s.%s" % (dd, mm, y2))],
    }[locale_key]
    if fmt:
        pick = [o for o in options if o[1] == fmt][0]
    else:
        pick = rng.choices(options, weights=[o[0] for o in options])[0]
    return pick[2], pick[1]


def time_text(locale_key, hour, minute, second, rng):
    h12 = hour % 12 or 12
    ampm = "AM" if hour < 12 else "PM"
    if locale_key in ("US", "CA_en", "AU") and rng.random() < 0.6:
        return rng.choice(["%d:%02d %s" % (h12, minute, ampm), "%02d:%02d %s" % (h12, minute, ampm), "%d:%02d:%02d %s" % (h12, minute, second, ampm)])
    return rng.choice(["%02d:%02d" % (hour, minute), "%02d:%02d:%02d" % (hour, minute, second)])


# ---------------------------------------------------------------------------------------------
# Carts and pricing
# ---------------------------------------------------------------------------------------------


class Line:
    def __init__(self, name, amount, tax, qty=1, unit=None, weight=None, unit_label=None, code=None, mods=None):
        self.name, self.amount, self.tax = name, amount, tax
        self.qty, self.unit, self.weight, self.unit_label = qty, unit, weight, unit_label
        self.code = code
        self.mods = mods or []


def cents_for(item, rng):
    value = rng.uniform(item["lo"], item["hi"])
    cents = int(round(value * 100))
    if cents > 300 and rng.random() < 0.6:
        cents = (cents // 10) * 10 + 9
    return max(cents, 25)


def make_line(item, rng, category, qty=None):
    tax = item["tax"] or ("0" if category == "grocery" else "T")
    unit_cents = cents_for(item, rng)
    if item["unit"]:
        weight = round(rng.uniform(0.25, 2.4), 3)
        return Line(item["name"], half_up(Fraction(unit_cents) * Fraction(str(weight))), tax, qty=1, unit=unit_cents,
                    weight=weight, unit_label=item["unit"], code="%013d" % rng.randint(10 ** 11, 10 ** 12 - 1))
    quantity = qty or (rng.choices([1, 2, 3], weights=[84, 12, 4])[0])
    return Line(item["name"], unit_cents * quantity, tax, qty=quantity, unit=unit_cents, code="%012d" % rng.randint(10 ** 10, 10 ** 11 - 1))


def make_cart(ctx):
    rng, kind, loc = ctx.rng, ctx.kind, ctx.loc_key
    cat = ctx.brand["cat"]
    rows = catalog.items_for(loc, cat)
    if kind == "long":
        rows = catalog.items_for(loc, "grocery")
        count = rng.randint(60, 84)
    elif kind == "short":
        count = rng.randint(1, 2)
    elif kind == "grocery":
        count = rng.randint(6, 26)
        if cat != "grocery":
            rows = catalog.items_for(loc, "grocery")
    elif kind == "restaurant":
        count = rng.randint(3, 11)
        if cat == "coffee":
            rows = catalog.items_for(loc, "coffee")
        else:
            rows = catalog.items_for(loc, "restaurant")
    elif kind == "pharmacy":
        count = rng.randint(2, 8)
    elif kind == "retail":
        count = rng.randint(1, 6)
    else:
        count = rng.randint(1, 4)

    lines = []
    if kind == "retail" and ctx.big:
        pricey = [r for r in rows if r["hi"] >= (60 if loc == "MX" else 20) * (5 if loc == "MX" else 1)] or rows
        while sum(l.amount for l in lines) < (100000 if loc != "MX" else 100000):
            lines.append(make_line(rng.choice(pricey), rng, cat, qty=rng.choice([1, 1, 2, 3])))
            if len(lines) > 12:
                break
    else:
        for _ in range(count):
            lines.append(make_line(rng.choice(rows), rng, cat))
    if kind == "pharmacy" and rng.random() < 0.5:
        rx = [r for r in rows if "RX" in r["name"] or "ORDON" in r["name"] or "RECETA" in r["name"] or "NHS" in r["name"]]
        if rx:
            lines.append(make_line(rx[0], rng, cat))
    if kind == "restaurant":
        for line in lines:
            if rng.random() < 0.3:
                line.mods.append(rng.choice(ctx.mod_words))
    if ctx.coupon and kind in ("grocery", "long", "pharmacy") and len(lines) > 3:
        discount = -min(rng.choice([100, 150, 200, 300, 500]), lines[0].amount - 1)
        lines.insert(rng.randint(1, len(lines)), Line(ctx.coupon_word, discount, lines[0].tax))
    return lines


class Tax:
    def __init__(self, label, rate, amount, base=None):
        self.label, self.rate, self.amount, self.base = label, rate, amount, base


def price(ctx):
    """Fills ctx.subtotal, ctx.taxes, ctx.included (tax inside the prices) and ctx.pre_tip."""
    lines = ctx.cart
    gross = sum(l.amount for l in lines)
    taxable = sum(l.amount for l in lines if l.tax == "T")
    loc = ctx.loc_key
    taxes = []
    included = False
    if loc == "US":
        rate = Fraction(str(ctx.place_rate)) / 100
        if rate:
            taxes.append(Tax("TAX", rate, half_up(taxable * rate), taxable))
    elif loc in ("CA_en", "CA_fr"):
        scheme = ctx.tax_scheme
        if scheme == "HST13":
            taxes.append(Tax("HST", Fraction(13, 100), half_up(taxable * Fraction(13, 100)), taxable))
        elif scheme == "HST15":
            taxes.append(Tax("HST", Fraction(15, 100), half_up(taxable * Fraction(15, 100)), taxable))
        elif scheme == "GST":
            taxes.append(Tax("GST", Fraction(5, 100), half_up(taxable * Fraction(5, 100)), taxable))
        elif scheme in ("GSTPST7", "GSTPST6"):
            pst = Fraction(7 if scheme == "GSTPST7" else 6, 100)
            taxes.append(Tax("GST", Fraction(5, 100), half_up(taxable * Fraction(5, 100)), taxable))
            taxes.append(Tax("PST", pst, half_up(taxable * pst), taxable))
        elif scheme == "QC":
            taxes.append(Tax("TPS", Fraction(5, 100), half_up(taxable * Fraction(5, 100)), taxable))
            taxes.append(Tax("TVQ", Fraction("0.09975"), half_up(taxable * Fraction("0.09975")), taxable))
        taxes = [t for t in taxes if t.amount or taxable]
    elif loc == "UK":
        included = True
        a = taxable
        z = gross - taxable
        taxes.append(Tax("A 20.00%", Fraction(20, 100), half_up(Fraction(a) * Fraction(20, 120)), a))
        taxes.append(Tax("C 0.00%", Fraction(0), 0, z))
    elif loc == "MX":
        included = True
        taxes.append(Tax("IVA 16%", Fraction(16, 100), half_up(Fraction(taxable) * Fraction(16, 116)), taxable))
        taxes.append(Tax("IVA 0%", Fraction(0), 0, gross - taxable))
    elif loc == "AU":
        included = True
        taxes.append(Tax("GST", Fraction(10, 100), half_up(Fraction(taxable) / 11), taxable))
    ctx.subtotal = gross
    ctx.taxes = taxes
    ctx.included = included
    ctx.pre_tip = gross if included else gross + sum(t.amount for t in taxes)
    ctx.total = ctx.pre_tip


# ---------------------------------------------------------------------------------------------
# Identity: store, card, ids
# ---------------------------------------------------------------------------------------------

POSTAL_LETTERS = "ABCEGHJKLMNPRSTVXY"
POSTAL_ANY = "ABCEGHJKLMNPRSTVWXYZ"


def digits(rng, n):
    return "".join(rng.choice("0123456789") for _ in range(n))


def make_store(ctx):
    rng, loc = ctx.rng, ctx.loc_key
    s = {"number": rng.randint(11, 9899)}
    if loc == "US":
        city, st, zip3, rate = rng.choice(catalog.US_PLACES)
        s.update(street="%d %s" % (rng.randint(100, 9899), rng.choice(catalog.STREETS_EN)), city=city, region=st,
                 postal="%s%02d" % (zip3, rng.randint(0, 99)), rate=rate,
                 phone="(%s) 555-01%02d" % (rng.choice(["612", "614", "512", "503", "813", "303", "919", "602", "816", "412", "916", "208", "404", "206", "518", "608", "615"]), rng.randint(0, 99)))
        s["city_line"] = "%s, %s %s" % (city, st, s["postal"])
    elif loc in ("CA_en", "CA_fr"):
        want = "fr" if loc == "CA_fr" else "en"
        choices = [p for p in catalog.CA_PLACES if p[4] in (want, "both")]
        city, prov, letter, scheme, _ = rng.choice(choices)
        postal = "%s%d%s %d%s%d" % (letter, rng.randint(0, 9), rng.choice(POSTAL_LETTERS), rng.randint(0, 9), rng.choice(POSTAL_LETTERS), rng.randint(0, 9))
        streets = catalog.STREETS_FR if loc == "CA_fr" else catalog.STREETS_EN
        street = rng.choice(streets)
        number = rng.randint(100, 9899)
        s.update(street=("%d, %s" % (number, street)) if loc == "CA_fr" else "%d %s" % (number, street), city=city, region=prov, postal=postal, scheme=scheme,
                 phone={"ON": "(416)", "QC": "(514)", "BC": "(604)", "AB": "(403)", "MB": "(204)", "NS": "(902)", "SK": "(306)", "NB": "(506)"}[prov] + " 555-01%02d" % rng.randint(0, 99))
        s["city_line"] = "%s %s %s" % (city, prov, postal) if loc == "CA_en" else "%s (%s) %s" % (city, prov, postal)
        s["gst_id"] = "%s RT0001" % digits(rng, 9)
        s["qst_id"] = "%s TQ0001" % digits(rng, 10)
    elif loc == "UK":
        town, area, prefix = rng.choice(catalog.UK_PLACES)
        s.update(street="%d %s" % (rng.randint(1, 240), rng.choice(catalog.STREETS_UK)), city=town, region="",
                 postal="%s %d%s%s" % (area, rng.randint(1, 9), rng.choice("ABDEFGHJLNPQRSTUWXYZ"), rng.choice("ABDEFGHJLNPQRSTUWXYZ")),
                 phone="%s %04d" % (prefix, rng.randint(0, 999) if prefix.endswith("0") else rng.randint(0, 9999)))
        s["city_line"] = "%s %s" % (town, s["postal"])
        s["vat_id"] = "GB %s %s %s" % (digits(rng, 3), digits(rng, 4), digits(rng, 2))
    elif loc == "MX":
        city, state, cp = rng.choice(catalog.MX_PLACES)
        s.update(street="%s %d" % (rng.choice(catalog.STREETS_MX), rng.randint(10, 4999)), colonia=rng.choice(catalog.MX_COLONIAS), city=city, region=state,
                 postal="%s%03d" % (cp, rng.randint(0, 999)), phone="55 %s %s" % (digits(rng, 4), digits(rng, 4)))
        s["city_line"] = "%s, %s" % (city, state)
        s["rfc"] = "%s%s%s" % ("".join(rng.choice("ABCDEFGHJKLMNPRSTUVWXYZ") for _ in range(3)), digits(rng, 6), "".join(rng.choice("ABCDEFGHJKLMNPRSTUVWXYZ0123456789") for _ in range(3)))
    elif loc == "AU":
        suburb, state, pc, ac = rng.choice(catalog.AU_PLACES)
        s.update(street="%d %s" % (rng.randint(1, 640), rng.choice(catalog.STREETS_AU)), city=suburb, region=state, postal=pc,
                 phone="(%s) 5550 %04d" % (ac, rng.randint(0, 9999)))
        s["city_line"] = "%s %s %s" % (suburb, state, pc)
        s["abn"] = "%s %s %s %s" % (digits(rng, 2), digits(rng, 3), digits(rng, 3), digits(rng, 3))
    return s


def make_card(ctx):
    rng, loc = ctx.rng, ctx.loc_key
    network = {
        "US": ["VISA", "MASTERCARD", "AMEX", "DEBIT", "DISCOVER"], "CA_en": ["VISA", "MASTERCARD", "INTERAC", "AMEX", "DEBIT"],
        "CA_fr": ["VISA", "MASTERCARD", "INTERAC", "DÉBIT", "AMEX"], "UK": ["VISA DEBIT", "MASTERCARD", "VISA", "CONTACTLESS", "AMEX"],
        "MX": ["VISA", "MASTERCARD", "DEBITO", "AMEX", "CREDITO"], "AU": ["EFTPOS", "VISA", "MASTERCARD", "AMEX", "CHEQUE/SAVINGS"],
    }[loc]
    last4 = digits(rng, 4)
    masks = ["************%s", "XXXXXXXXXXXX%s", "****%s", "**** **** **** %s", "XXXX%s", "...%s", "#############%s"]
    return dict(network=rng.choice(network), last4=last4, mask=rng.choice(masks) % last4, ending=rng.random() < 0.25)


# ---------------------------------------------------------------------------------------------
# Row helpers
# ---------------------------------------------------------------------------------------------


def strip_accents(text):
    table = str.maketrans("ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜàâäçéèêëîïôöùûüñÑáíóúÁÍÓÚ¿¡€", "AAACEEEEIIOOUUUaaaceeeeiioouuunNaiouAIOU?!E")
    return text.translate(table)


class Builder:
    def __init__(self, ctx):
        self.ctx = ctx
        self.rows = []

    def text(self, text, align=None, size=1.0, bold=False, font=None, tag=None, **kw):
        ctx = self.ctx
        if not ctx.accents:
            text = strip_accents(text)
        align = align or ctx.align
        indent = kw.pop("indent", 0)
        self.rows.append(Row("text", text=text, align=align, size=size, bold=bold, font=font, tag=tag, indent=indent, **kw))

    def pair(self, left, right, bold=False, size=1.0, leader=None, right_col=None, left_col=0, font=None):
        ctx = self.ctx
        if not ctx.accents:
            left = strip_accents(left)
        cols = ctx.style.cols
        row = Row("cols", cells=[(left, left_col, "left"), (right, right_col if right_col is not None else cols, "right")], bold=bold, size=size, font=font)
        if leader:
            row.extra["leader"] = leader
        self.rows.append(row)

    def cells(self, cells, bold=False, size=1.0):
        if not self.ctx.accents:
            cells = [(strip_accents(t), c, a) for t, c, a in cells]
        self.rows.append(Row("cols", cells=cells, bold=bold, size=size))

    def rule(self, char=None, graphic=None):
        row = Row("rule", char=char or self.ctx.rule)
        if graphic:
            row.extra["graphic"] = graphic
        self.rows.append(row)

    def gap(self, lines=1.0):
        self.rows.append(Row("gap", lines=lines))

    def raw(self, row):
        self.rows.append(row)


def money(ctx, cents, mark=None):
    return ctx.loc.amount(cents, mark if mark is not None else ctx.item_mark)


def bi(ctx, en, fr):
    """Bilingual label as Canadian receipts print it: 'SUBTOTAL / SOUS-TOTAL'."""
    return "%s / %s" % (en, fr) if ctx.bilingual else (fr if ctx.loc_key == "CA_fr" else en)


def label(ctx, key):
    """A fixed label in the receipt's language (and in both on a bilingual one)."""
    loc = ctx.loc
    if key == "subtotal":
        return bi(ctx, "SUBTOTAL", "SOUS-TOTAL") if ctx.loc_key in ("CA_en", "CA_fr") else ctx.sub_word
    if key == "cash":
        return bi(ctx, "CASH", "COMPTANT") if ctx.loc_key in ("CA_en", "CA_fr") else loc.cash
    if key == "change":
        return bi(ctx, "CHANGE", "MONNAIE") if ctx.loc_key in ("CA_en", "CA_fr") else loc.change[0]
    if key == "tip":
        return bi(ctx, "TIP", "POURBOIRE") if ctx.loc_key in ("CA_en", "CA_fr") else loc.tip
    return key


def case(ctx, text):
    if ctx.title_case:
        return " ".join(w.capitalize() if w.isupper() and len(w) > 2 else w.lower() if w.isupper() else w for w in text.split(" ")) if text.isupper() else text
    return text


# ---------------------------------------------------------------------------------------------
# Header: the name in each of the styles
# ---------------------------------------------------------------------------------------------


def printed_name(ctx):
    name = ctx.brand["name"]
    if not ctx.accents:
        name = strip_accents(name)
    return name


def name_rows(ctx, b):
    """Rows above the address. Sets ctx.name_rows_text for the notes."""
    hs, brand, rng, loc = ctx.hs, ctx.brand, ctx.rng, ctx.loc
    up = printed_name(ctx).upper()
    mixed = brand["mixed"] if ctx.accents else strip_accents(brand["mixed"])
    big_font = ctx.name_font

    def pre_slogan():
        choice = rng.random()
        if brand["slogan"] and choice < 0.45 and ctx.loc_key in ("US", "UK", "MX", "AU"):
            b.text(brand["slogan"], size=rng.choice([1.0, 1.0, 1.25]))
        else:
            b.text(rng.choice(loc.welcome), size=rng.choice([1.0, 1.2, 1.5]))

    def pre_ids():
        k = ctx.loc_key
        s = ctx.store
        if k == "US":
            b.text(rng.choice(["STORE #%d" % s["number"], "STORE %04d" % s["number"], "TAX ID %s-%s" % (digits(rng, 2), digits(rng, 7)), "TERMINAL T-%d" % s["number"]]), size=rng.choice([1.0, 1.0, 1.3]))
        elif k in ("CA_en", "CA_fr"):
            b.text(rng.choice(["GST/HST %s" % s["gst_id"], "%s %s" % (("TPS" if k == "CA_fr" else "GST"), s["gst_id"]), "%s %d" % (("MAGASIN" if k == "CA_fr" else "STORE"), s["number"])]), size=rng.choice([1.0, 1.0, 1.3]))
        elif k == "UK":
            b.text(rng.choice(["VAT REG NO. %s" % s["vat_id"], "STORE %04d" % s["number"], "VAT No: %s" % s["vat_id"]]), size=rng.choice([1.0, 1.3]))
        elif k == "MX":
            b.text(rng.choice(["R.F.C. %s" % s["rfc"], "SUC. %04d" % s["number"], "RFC: %s" % s["rfc"]]), size=rng.choice([1.0, 1.3]))
        else:
            b.text(rng.choice(["ABN %s" % s["abn"], "TAX INVOICE", "STORE %04d" % s["number"]]), size=rng.choice([1.0, 1.3]))

    if hs == "big-centred":
        b.text(up, align="center", size=ctx.name_size, bold=True, font=big_font, tag="name")
        if brand["sub"] and rng.random() < 0.5:
            b.text(brand["sub"], align="center", size=1.0, bold=True)
    elif hs == "same-size":
        b.text(up if rng.random() < 0.8 else mixed, size=1.0, bold=False, tag="name")
    elif hs == "split-two-lines":
        first, second = brand["split"] or tuple(up.split(" ", 1))
        if not ctx.accents:
            first, second = strip_accents(first), strip_accents(second)
        b.text(first.upper() if first.isupper() or rng.random() < 0.7 else first, align="center", size=ctx.name_size * 0.9, bold=True, font=big_font, tag="name")
        b.text(second.upper() if second.isupper() or rng.random() < 0.7 else second, align="center", size=ctx.name_size * 0.9, bold=True, font=big_font, tag="name")
    elif hs == "slogan-above":
        pre_slogan()
        b.text(up, align="center", size=ctx.name_size, bold=True, font=big_font, tag="name")
    elif hs == "store-id-above":
        pre_ids()
        b.text(up, align="center", size=ctx.name_size, bold=True, font=big_font, tag="name")
    elif hs == "lowercase-mixed":
        text = mixed if rng.random() < 0.65 else mixed.lower()
        b.text(text, align="center" if ctx.align == "center" or rng.random() < 0.5 else "left", size=rng.choice([1.0, ctx.name_size * 0.85, ctx.name_size]), bold=rng.random() < 0.7, font=big_font if rng.random() < 0.5 else None, tag="name")
    elif hs == "boxed-name":
        b.raw(Row("box", text=up, align="center", size=rng.choice([1.4, 1.7, 2.0]), bold=True, font=big_font, box=ctx.box_style, pad=14, tag="name"))
    elif hs == "logo-only":
        b.raw(Row("logo", variant=ctx.logo_variant, tag="logo", h=rng.choice([110, 130, 150, 170]), frac=rng.choice([0.45, 0.6, 0.72])))
        if ctx.logo_hint == "legal" and ctx.legal_pos == "header":
            b.text(brand["legal"], align="center", size=0.8, tag="name")
    else:
        raise ValueError(hs)


def legal_footer(ctx, b):
    if ctx.hs == "logo-only" and ctx.logo_hint == "legal" and ctx.legal_pos == "footer":
        b.gap(0.5)
        b.text(ctx.brand["legal"], align="center", size=0.8, tag="name")


def thanks_rows(ctx, b):
    loc = ctx.loc
    if ctx.hs == "logo-only" and ctx.logo_hint == "thanks":
        text = loc.at % printed_name(ctx)
        if len(text) > ctx.style.cols:
            cut = text.rfind(" ", 0, ctx.style.cols)
            b.text(text[:cut], align="center", tag="name")
            b.text(text[cut + 1:], align="center", tag="name")
        else:
            b.text(text, align="center", tag="name")
    else:
        if ctx.hs == "logo-only":
            generic = {"en": "THANK YOU FOR SHOPPING WITH US", "fr": "MERCI DE VOTRE VISITE", "es": "GRACIAS POR SU COMPRA"}[loc.lang]
            b.text(generic if ctx.rng.random() < 0.7 else ctx.rng.choice(loc.thanks), align="center")
        else:
            b.text(ctx.rng.choice(loc.thanks), align="center", bold=ctx.rng.random() < 0.3)


def url_rows(ctx, b):
    if ctx.hs == "logo-only":
        if ctx.logo_hint == "url":
            b.text(ctx.rng.choice(["%s", "Visit us at %s", "Survey: %s/survey", "Shop online: %s"]) % ctx.brand["url"], align="center", tag="name")
    elif ctx.want_url:
        b.text(ctx.rng.choice(["%s", "Visit us at %s", "%s/survey"]) % ctx.brand["url"], align="center")


# ---------------------------------------------------------------------------------------------
# Address and meta blocks
# ---------------------------------------------------------------------------------------------


def address_rows(ctx, b):
    s, k, rng = ctx.store, ctx.loc_key, ctx.rng
    layout = ctx.frame["addr"]
    lines = []
    if k == "MX":
        lines = [s["street"], "%s C.P. %s" % (s["colonia"], s["postal"]), s["city_line"]]
        if ctx.frame.get("rfc_head"):
            lines.append("R.F.C. %s" % s["rfc"])
        lines.append("Tel. %s" % s["phone"])
    elif k == "UK":
        lines = [s["street"], s["city_line"], "Tel: %s" % s["phone"]]
        if ctx.frame.get("vat_head"):
            lines.append("VAT No. %s" % s["vat_id"])
    elif k == "AU":
        lines = [s["street"], s["city_line"], "Ph: %s" % s["phone"]]
        if ctx.frame.get("abn_head"):
            lines.append("ABN %s" % s["abn"])
    elif k in ("CA_en", "CA_fr"):
        lines = [s["street"], s["city_line"], s["phone"]]
        if ctx.frame.get("gst_head"):
            lines.append(("TPS %s" % s["gst_id"]) if k == "CA_fr" else "GST/HST %s" % s["gst_id"])
            if k == "CA_fr" or s["scheme"] == "QC":
                lines.append("TVQ %s" % s["qst_id"])
    else:
        lines = [s["street"], s["city_line"], s["phone"]]
    if layout == "compact":
        lines = [", ".join(lines[:2])] + lines[2:]
    for text in lines:
        b.text(text)


def datetime_text(ctx):
    date, fmt = date_text(ctx.loc_key, ctx.date, ctx.rng)
    ctx.date_fmt = fmt
    ctx.date_printed = date
    when = time_text(ctx.loc_key, ctx.hour, ctx.minute, ctx.second, ctx.rng)
    prefix = {"MX": ctx.rng.choice(["FECHA: ", "FECHA ", ""]), "CA_fr": ctx.rng.choice(["DATE: ", ""]), "UK": ctx.rng.choice(["", "Date: "]), "AU": ctx.rng.choice(["", "DATE: "])}.get(ctx.loc_key, ctx.rng.choice(["", "", "DATE: "]))
    sep = ctx.rng.choice(["  ", " ", "   ", " - "])
    if ctx.loc_key == "MX" and prefix:
        return "%s%s%sHORA: %s" % (prefix, date, sep, when)
    return "%s%s%s%s" % (prefix, date, sep, when)


# ---------------------------------------------------------------------------------------------
# Totals and tender
# ---------------------------------------------------------------------------------------------


def total_label(ctx):
    if ctx.word_mode == "noword":
        return ctx.noword
    word = ctx.total_word
    if ctx.bilingual and ctx.loc_key in ("CA_en", "CA_fr"):
        pair = {"TOTAL": ("TOTAL", "TOTAL"), "BALANCE": ("BALANCE", "SOLDE"), "TOTAL DUE": ("TOTAL DUE", "TOTAL À PAYER"), "AMOUNT DUE": ("AMOUNT DUE", "MONTANT DÛ")}
        if word in pair:
            return "%s / %s" % pair[word]
        fr_pair = {"MONTANT DÛ": ("AMOUNT DUE", "MONTANT DÛ"), "TOTAL À PAYER": ("TOTAL DUE", "TOTAL À PAYER"), "À PAYER": ("TO PAY", "À PAYER"), "SOLDE": ("BALANCE", "SOLDE"), "MONTANT TOTAL": ("TOTAL AMOUNT", "MONTANT TOTAL")}
        if word in fr_pair:
            return "%s / %s" % fr_pair[word]
    return word


def total_rows(ctx, b, cents, label_text=None, size=None, bold=True):
    """The line the whole receipt is about, in one of the three layouts and one of three marks."""
    text = label_text or total_label(ctx)
    amount = ctx.loc.amount(cents, ctx.mark)
    ctx.total_printed = ctx.loc.amount(cents, "none")
    size = size or ctx.total_size
    layout = ctx.total_layout
    if layout == "leaders":
        b.pair(text, amount, bold=bold, size=size, leader=ctx.leader_char)
    elif layout == "nextline":
        b.text(text, align="left", bold=bold, size=size)
        b.text(amount, align="right", bold=bold, size=size)
    else:
        b.pair(text, amount, bold=bold, size=size)


def tax_rows(ctx, b):
    loc_key = ctx.loc_key
    for t in ctx.taxes:
        if loc_key == "US":
            label_text = "TAX" if ctx.rng.random() < 0.5 else "SALES TAX"
            if ctx.frame.get("tax_rate", True):
                label_text += " %s%%" % ("%.3f" % float(ctx.place_rate)).rstrip("0").rstrip(".")
            b.pair(label_text, money(ctx, t.amount))
        elif loc_key in ("CA_en", "CA_fr"):
            pct = ("%.3f" % float(t.rate * 100)).rstrip("0").rstrip(".")
            if loc_key == "CA_fr":
                pct = pct.replace(".", ",")
            b.pair("%s %s%%" % (t.label, pct), money(ctx, t.amount))
        elif loc_key == "UK":
            if t.base:
                b.pair("VAT %s" % t.label, money(ctx, t.amount))
        elif loc_key == "MX":
            if t.base:
                b.pair(t.label, money(ctx, t.amount))
        elif loc_key == "AU":
            b.pair("GST INCLUDED IN TOTAL" if ctx.rng.random() < 0.6 else "GST (10%)", money(ctx, t.amount))


def tender_rows(ctx, b, amount):
    card, rng, k = ctx.card, ctx.rng, ctx.loc_key
    amt = ctx.loc.amount(amount, ctx.item_mark)
    if ctx.payment == "cash":
        given = amount + rng.choice([0, 0, 100, 200, 500, 1000, 2000, 3000])
        if given == amount:
            given = ((amount // 1000) + 1) * 1000
        b.pair(label(ctx, "cash"), money(ctx, given, ctx.item_mark))
        b.pair(label(ctx, "change"), money(ctx, given - amount, ctx.item_mark))
        return
    network = card["network"]
    ctx.card_printed = True
    if ctx.word_mode == "noword":
        # the total is printed only on the tender line, whose label is not a "total" word
        total_rows(ctx, b, amount, label_text=ctx.noword)
        b.text("%s %s" % (network, card["mask"]), align="left")
        return
    style = ctx.frame.get("tender", "tend")
    if style == "tend":
        b.pair("%s TEND" % network if k == "US" else network, amt)
        b.text(card["mask"] if not card["ending"] else "ENDING IN %s" % card["last4"], align="left")
    elif style == "detail":
        b.pair(network, amt)
        b.text(card["mask"], align="left")
        b.text("AID: A0000000%s  AUTH: %s" % (digits(rng, 6), digits(rng, 6)), align="left", size=0.9)
    else:
        b.pair("%s %s" % (network, card["mask"]), amt)
    if k == "US" and ctx.frame.get("change_line"):
        b.pair("CHANGE DUE", money(ctx, 0, "none"))


# ---------------------------------------------------------------------------------------------
# Item rows
# ---------------------------------------------------------------------------------------------


def unit_text(ctx, line):
    loc = ctx.loc
    unit_price = loc.amount(line.unit, "none")
    if line.weight is not None:
        w = ("%.3f" % line.weight)
        if ctx.loc_key == "CA_fr":
            w = w.replace(".", ",")
        return "%s %s @ %s/%s" % (w, line.unit_label, unit_price, line.unit_label)
    return "%d @ %s" % (line.qty, unit_price)


def item_rows(ctx, b):
    style = ctx.frame["items"]
    cols = ctx.style.cols
    flag_w = 2 if ctx.frame.get("flags") else 0
    price_col = cols - flag_w
    for line in ctx.cart:
        flag = ""
        if ctx.frame.get("flags"):
            flag = {"T": " T", "0": " F" if ctx.loc_key == "US" else " N"}.get(line.tax, "")
            if ctx.loc_key == "UK":
                flag = " A" if line.tax == "T" else " C"
            if ctx.loc_key == "MX":
                flag = " *" if line.tax == "T" else ""
        name = line.name if ctx.accents else strip_accents(line.name)
        name = name.title() if ctx.item_title else name
        amount = money(ctx, line.amount)
        # "2 @ 3.49" goes on its own line when it will not fit beside the name
        if style == "plain":
            b.cells([(name[: price_col - len(amount) - 2], 0, "left"), (amount, price_col, "right")] + ([(flag.strip(), cols, "right")] if flag else []))
        elif style == "coded":
            code = (line.code or "")[:9]
            b.cells([(code, 0, "left"), (name[: price_col - len(amount) - 12], 11, "left"), (amount, price_col, "right")] + ([(flag.strip(), cols, "right")] if flag else []))
        elif style == "upc":
            upc_col = price_col - len(amount) - 13
            b.cells([(name[: upc_col - 1], 0, "left"), ((line.code or "")[:12], upc_col, "left"), (amount, price_col, "right")] + ([(flag.strip(), cols, "right")] if flag else []))
        elif style == "qty":
            b.cells([("%d" % (line.qty if line.weight is None else 1), 0, "left"), (name[: price_col - len(amount) - 6], 3, "left"), (amount, price_col, "right")] + ([(flag.strip(), cols, "right")] if flag else []))
        else:  # sku2
            b.cells([(((line.code or "")[:8] + "  " + name)[: price_col - len(amount) - 2], 0, "left")])
            if line.qty > 1 or line.weight is not None:
                b.cells([(unit_text(ctx, line), 4, "left"), (amount, price_col, "right")])
            else:
                b.cells([("1 @ %s" % money(ctx, line.unit or line.amount), 4, "left"), (amount, price_col, "right")])
            continue
        if line.weight is not None:
            b.cells([(unit_text(ctx, line), 4, "left")], size=0.95)
        elif line.qty > 1 and style != "qty":
            b.cells([(unit_text(ctx, line), 4, "left")], size=0.95)
        for mod in line.mods:
            b.cells([(mod, 3, "left")], size=0.95)
