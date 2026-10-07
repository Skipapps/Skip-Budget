"""Digital receipts: an email, an app screen or a PDF-like page, drawn in proportional fonts.

White page, "Your receipt from X", "Order #", line items, "Total $12.34", "Paid with Visa ending 1234".
These are screenshots or page renders, not photographs: no paper, no rotation, no sensor noise.
"""

import random
from fractions import Fraction

from PIL import Image, ImageDraw

import catalog
import holdout_catalog as hc
import holdout_frames as hf
import render
from content import MONTHS_EN, MONTHS_ES, MONTHS_FR, Line, digits, half_up, make_line, price

TEXT = {
    "en": dict(subject="Your receipt from %s", order="Order #%s", subtotal="Subtotal", delivery="Delivery fee", service="Service fee", tax="Tax",
               tip="Tip", total="Total", paid="Paid with %s ending in %s", thanks="Thanks for your order, %s", help="Questions about your order? Visit our Help Center.",
               view="View this email in your browser", qty="Qty", item="Item", amount="Amount", receipt="Receipt", done="Done", get_help="Get help",
               page="Page 1 of 1", shipping="Shipping", discount="Discount", date="Date", billed="Billed to", includes="Includes %s %s"),
    "fr": dict(subject="Votre recu de %s", order="Commande no %s", subtotal="Sous-total", delivery="Frais de livraison", service="Frais de service", tax="Taxes",
               tip="Pourboire", total="Total", paid="Paye avec %s se terminant par %s", thanks="Merci de votre commande, %s", help="Des questions? Visitez notre centre d'aide.",
               view="Afficher ce courriel dans le navigateur", qty="Qte", item="Article", amount="Montant", receipt="Recu", done="Termine", get_help="Obtenir de l'aide",
               page="Page 1 de 1", shipping="Expedition", discount="Rabais", date="Date", billed="Facture a", includes="Comprend %s %s"),
    "es": dict(subject="Tu recibo de %s", order="Pedido #%s", subtotal="Subtotal", delivery="Costo de envio", service="Cargo por servicio", tax="IVA",
               tip="Propina", total="Total", paid="Pagado con %s terminada en %s", thanks="Gracias por tu pedido, %s", help="Preguntas sobre tu pedido? Visita nuestro Centro de ayuda.",
               view="Ver este correo en el navegador", qty="Cant", item="Articulo", amount="Importe", receipt="Recibo", done="Listo", get_help="Obtener ayuda",
               page="Pagina 1 de 1", shipping="Envio", discount="Descuento", date="Fecha", billed="Facturado a", includes="Incluye %s %s"),
}
ACCENT_FIX = {
    "fr": {"Votre recu": "Votre reçu", "Paye": "Payé", "Qte": "Qté", "Recu": "Reçu", "Termine": "Terminé", "Expedition": "Expédition", "Facture a": "Facturé à",
           "Commande no": "Commande n°", "Des questions": "Des questions", "Frais de reservation": "Frais de réservation", "Termine": "Terminé"},
    "es": {"Pagina": "Página", "Articulo": "Artículo", "Preguntas": "¿Preguntas", "pedido?": "pedido?", "Pagado": "Pagado", "envio": "envío"},
}
BRAND_COLOURS = [(18, 95, 66), (35, 71, 140), (190, 38, 56), (28, 28, 30), (232, 126, 4), (86, 54, 150), (0, 120, 140), (160, 30, 90)]

DATE_NAMES = {
    "en_us": ["Mon D, YYYY", "Month D, YYYY", "DDD, Mon D, YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
    "en_gb": ["D Mon YYYY", "D Month YYYY", "DDD D Mon YYYY", "DD/MM/YYYY"],
    "fr": ["D mois YYYY", "D Month YYYY fr", "YYYY-MM-DD", "DD/MM/YYYY"],
    "es": ["D mes YYYY", "D de Month de YYYY", "DD/MM/YYYY"],
}
MONTHS_FULL = {
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    "fr": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    "es": ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
}
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def digital_date(ctx, rng):
    d = ctx.date
    lang = ctx.loc.lang
    pool = DATE_NAMES["fr" if lang == "fr" else "es" if lang == "es" else ("en_us" if ctx.loc_key in ("US", "CA_en") else "en_gb")]
    fmt = rng.choice(pool)
    mon_en, mon_fr, mon_es = MONTHS_EN[d.month - 1], MONTHS_FR[d.month - 1], MONTHS_ES[d.month - 1].lower()
    full = MONTHS_FULL["en" if lang == "en" else lang][d.month - 1]
    table = {
        "Mon D, YYYY": "%s %d, %d" % (mon_en, d.day, d.year),
        "Month D, YYYY": "%s %d, %d" % (full, d.day, d.year),
        "DDD, Mon D, YYYY": "%s, %s %d, %d" % (DAYS[d.weekday()], mon_en, d.day, d.year),
        "MM/DD/YYYY": "%02d/%02d/%d" % (d.month, d.day, d.year),
        "YYYY-MM-DD": "%d-%02d-%02d" % (d.year, d.month, d.day),
        "D Mon YYYY": "%d %s %d" % (d.day, mon_en, d.year),
        "D Month YYYY": "%d %s %d" % (d.day, full, d.year),
        "DDD D Mon YYYY": "%s %d %s %d" % (DAYS[d.weekday()], d.day, mon_en, d.year),
        "DD/MM/YYYY": "%02d/%02d/%d" % (d.day, d.month, d.year),
        "D mois YYYY": "%d %s %d" % (d.day, mon_fr, d.year),
        "D Month YYYY fr": "%d %s %d" % (d.day, full, d.year),
        "D mes YYYY": "%d %s %d" % (d.day, mon_es, d.year),
        "D de Month de YYYY": "%d de %s de %d" % (d.day, full, d.year),
    }
    printed = table[fmt]
    names = {"D Month YYYY fr": "D Month YYYY", "D mois YYYY": "D mois YYYY", "D mes YYYY": "D Mon YYYY"}
    return printed, names.get(fmt, fmt)


def fix(text, lang):
    for plain, accented in ACCENT_FIX.get(lang, {}).items():
        text = text.replace(plain, accented)
    return text


def digital_cart(ctx, rng):
    cat = ctx.brand["cat"]
    if cat == "transport":
        rows = hc.TRANSPORT[ctx.loc.lang]
        cart = [Line(rows[0][0], int(rng.uniform(rows[0][1], rows[0][2]) * 100), "0")]
        for entry in rng.sample(rows[1:], rng.randint(2, 3)):
            cart.append(Line(entry[0], int(rng.uniform(entry[1], entry[2]) * 100), "0"))
        cart = [c for c in cart if c.amount > 0]
        return cart
    pool = cat if cat in ("restaurant", "coffee", "pharmacy", "department", "hardware", "grocery", "electronics") else "department"
    rows = catalog.items_for(ctx.loc_key, pool)
    return [make_line(rng.choice(rows), rng, pool) for _ in range(rng.randint(2, 7))]


class Page:
    def __init__(self, w, h, bg):
        self.im = Image.new("RGB", (w, h), bg)
        self.d = ImageDraw.Draw(self.im)

    def font(self, key, px, bold=False):
        return render._font(key, bold, px)

    def text(self, x, y, text, key, px, fill, bold=False, anchor="ls"):
        self.d.text((x, y), text, font=self.font(key, px, bold), fill=fill, anchor=anchor)

    def width(self, text, key, px, bold=False):
        return self.font(key, px, bold).getlength(text)

    def line(self, x0, x1, y, fill=(222, 222, 226), width=2):
        self.d.line([x0, y, x1, y], fill=fill, width=width)


def build_digital(ctx, rng):
    """Draws the receipt for a context made by holdout_frames.make_hold_ctx. Returns (image, template)."""
    lang = ctx.loc.lang
    t = {k: fix(v, lang) if lang != "en" else v for k, v in TEXT[lang].items()}
    cart = digital_cart(ctx, rng)
    ctx.cart = list(cart)
    extras = []
    cat = ctx.brand["cat"]
    if cat in ("restaurant", "grocery", "coffee") and rng.random() < 0.7:
        extras.append(Line(t["delivery"], int(rng.uniform(1.99, 5.99) * (18 if ctx.loc_key == "MX" else 1) * 100), "0"))
        extras.append(Line(t["service"], int(rng.uniform(0.99, 3.49) * (18 if ctx.loc_key == "MX" else 1) * 100), "0"))
    elif cat in ("department", "hardware") and rng.random() < 0.6:
        extras.append(Line(t["shipping"], int(rng.uniform(4.99, 12.99) * (18 if ctx.loc_key == "MX" else 1) * 100), "0"))
    if rng.random() < 0.25 and cat != "transport":
        extras.append(Line(t["discount"], -min(500, ctx.cart[0].amount - 1), ctx.cart[0].tax))
    ctx.cart += extras
    price(ctx)
    tip = 0
    if cat in ("restaurant", "transport", "coffee") and rng.random() < 0.5:
        tip = max(100, (half_up(Fraction(ctx.subtotal) * rng.choice([10, 15, 20]) / 100) // 50) * 50)
    total = ctx.pre_tip + tip
    ctx.total = total
    ctx.final_total = total

    loc = ctx.loc
    mark = "after" if ctx.loc_key == "CA_fr" else "before"

    def amt(cents):
        text = loc.amount(cents, mark)
        return text.replace(" " + loc.cur_after, " $") if ctx.loc_key == "CA_fr" else text

    ctx.total_printed = loc.amount(total, "none")
    date_text, date_fmt = digital_date(ctx, rng)
    ctx.date_printed = date_text
    ctx.date_fmt = date_fmt
    ctx.dt_text = date_text
    clock = "%d:%02d %s" % (ctx.hour % 12 or 12, ctx.minute, "AM" if ctx.hour < 12 else "PM") if lang == "en" else "%02d:%02d" % (ctx.hour, ctx.minute)
    order_no = digits(rng, rng.choice([5, 6, 8]))
    network = ctx.card["network"].title().replace("Visa Debit", "Visa Debit")
    paid = t["paid"] % (network, ctx.card["last4"])
    ctx.card_printed = True
    brand = ctx.brand["name"]
    subject = fix(t["subject"], lang) % brand
    first = rng.choice(catalog.STAFF).title()
    variant = rng.choice(["email", "app", "pdf"])
    sans = rng.choice(["sfui", "helvold", "avenirnext", "lucida", "gillsans"])
    bold = True

    lines = [(l.name if ctx.accents or lang == "en" else l.name, l.qty, l.amount) for l in ctx.cart]
    breakdown = []
    if not ctx.included:
        breakdown.append((t["subtotal"], ctx.subtotal))
        for tax in ctx.taxes:
            if tax.amount:
                pct = ("%.3f" % float(tax.rate * 100)).rstrip("0").rstrip(".")
                breakdown.append(("%s (%s%%)" % (tax.label if tax.label not in ("A 20.00%", "C 0.00%") else t["tax"], pct.replace(".", "," if lang == "fr" else ".")), tax.amount))
    else:
        vat = sum(x.amount for x in ctx.taxes)
        breakdown.append((t["includes"] % ({"UK": "VAT", "MX": "IVA", "AU": "GST"}[ctx.loc_key], amt(vat)), None))
    if tip:
        breakdown.append((t["tip"], tip))

    if variant == "email":
        w, col0, col1 = 1300, 250, 1050
        page = Page(w, 4200, (236, 236, 240))
        y = 60
        page.d.rectangle([col0, y, col1, 4100], fill=(255, 255, 255))
        colour = rng.choice(BRAND_COLOURS)
        page.d.rectangle([col0, y, col1, y + 150], fill=colour)
        page.text((col0 + col1) / 2, y + 100, brand, sans, 58, (255, 255, 255), True, "ms")
        y += 150 + 90
        page.text(col0 + 56, y, subject, sans, 46, (30, 30, 34), True)
        y += 56
        page.text(col0 + 56, y, "%s  ·  %s  ·  %s" % (t["order"] % order_no, date_text, clock), sans, 28, (110, 110, 118))
        y += 36
        page.text(col0 + 56, y, t["thanks"] % first, sans, 30, (60, 60, 66))
        y += 48
        page.line(col0 + 56, col1 - 56, y)
        y += 56
        for name, qty, cents in lines:
            page.text(col0 + 56, y, name[:34], sans, 32, (30, 30, 34))
            if qty > 1:
                page.text(col0 + 56, y + 34, "× %d" % qty, sans, 24, (120, 120, 128))
            page.text(col1 - 56, y, amt(cents), sans, 32, (30, 30, 34), False, "rs")
            y += 78 if qty > 1 else 56
        y += 6
        page.line(col0 + 56, col1 - 56, y)
        y += 50
        for text, cents in breakdown:
            page.text(col0 + 56, y, text, sans, 28, (100, 100, 108))
            if cents is not None:
                page.text(col1 - 56, y, amt(cents), sans, 28, (100, 100, 108), False, "rs")
            y += 46
        y += 18
        page.text(col0 + 56, y + 10, t["total"], sans, 42, (20, 20, 24), True)
        page.text(col1 - 56, y + 10, amt(total), sans, 50, (20, 20, 24), True, "rs")
        y += 78
        page.line(col0 + 56, col1 - 56, y)
        y += 54
        page.text(col0 + 56, y, paid, sans, 29, (50, 50, 56))
        y += 90
        page.text((col0 + col1) / 2, y, t["help"], sans, 25, (130, 130, 138), False, "ms")
        y += 44
        page.text((col0 + col1) / 2, y, t["view"], sans, 23, (110, 110, 160), False, "ms")
        y += 70
        img = page.im.crop((0, 0, w, min(page.im.size[1], y + 40)))
        return img, "digital-email"

    if variant == "app":
        w = 1170
        page = Page(w, 4200, (242, 242, 247))
        page.text(86, 96, "%d:%02d" % (ctx.hour % 12 or 12, ctx.minute), "sfui", 46, (0, 0, 0), True)
        page.d.rectangle([w - 190, 58, w - 100, 96], outline=(0, 0, 0), width=4)
        page.d.rectangle([w - 184, 64, w - 130, 90], fill=(0, 0, 0))
        for i in range(4):
            page.d.rectangle([w - 330 + i * 24, 96 - 14 - i * 8, w - 318 + i * 24, 96], fill=(0, 0, 0))
        page.text(w / 2, 214, t["receipt"], "sfui", 50, (0, 0, 0), True, "ms")
        page.text(90, 214, "<", "sfui", 66, (0, 110, 255), False)
        page.text(w - 70, 214, t["done"], "sfui", 46, (0, 110, 255), False, "rs")
        y = 290
        page.d.rounded_rectangle([40, y, w - 40, 4000], radius=36, fill=(255, 255, 255))
        y += 150
        colour = rng.choice(BRAND_COLOURS)
        page.d.ellipse([w / 2 - 74, y - 100, w / 2 + 74, y + 48], fill=colour)
        page.text(w / 2, y + 2, brand[0].upper(), sans, 84, (255, 255, 255), True, "ms")
        y += 140
        page.text(w / 2, y, brand, sans, 60, (20, 20, 24), True, "ms")
        y += 62
        page.text(w / 2, y, "%s · %s" % (date_text, clock), sans, 34, (120, 120, 128), False, "ms")
        y += 52
        page.text(w / 2, y, t["order"] % order_no, sans, 34, (120, 120, 128), False, "ms")
        y += 70
        page.line(110, w - 110, y)
        y += 70
        for name, qty, cents in lines:
            page.text(110, y, ("%dx  " % qty if qty > 1 else "") + name[:30], sans, 38, (20, 20, 24))
            page.text(w - 110, y, amt(cents), sans, 38, (20, 20, 24), False, "rs")
            y += 70
        page.line(110, w - 110, y - 20)
        y += 40
        for text, cents in breakdown:
            page.text(110, y, text, sans, 34, (110, 110, 118))
            if cents is not None:
                page.text(w - 110, y, amt(cents), sans, 34, (110, 110, 118), False, "rs")
            y += 58
        y += 24
        page.text(110, y, t["total"], sans, 50, (20, 20, 24), True)
        page.text(w - 110, y, amt(total), sans, 56, (20, 20, 24), True, "rs")
        y += 90
        page.line(110, w - 110, y - 20)
        y += 40
        page.text(110, y, paid, sans, 34, (60, 60, 66))
        y += 120
        page.d.rounded_rectangle([110, y, w - 110, y + 120], radius=60, fill=(0, 110, 255))
        page.text(w / 2, y + 78, t["get_help"], sans, 44, (255, 255, 255), True, "ms")
        y += 190
        # the white card was drawn tall before the content; give the rest of the page back to the grey
        page.d.rectangle([0, y, w, 4200], fill=(242, 242, 247))
        height = max(2532, y + 120)
        img = Image.new("RGB", (w, height), (242, 242, 247))
        img.paste(page.im.crop((0, 0, w, min(page.im.size[1], y + 60))), (0, 0))
        return img, "digital-app"

    # pdf-like page
    w, h = 1240, 1754
    page = Page(w, 4200, (255, 255, 255))
    serif = rng.choice(["georgiaserif", "palatino", "timesold", "charter", sans])
    y = 150
    page.text(110, y, brand, serif, 66, (20, 20, 20), True)
    page.text(w - 110, y, t["receipt"].upper(), sans, 44, (110, 110, 110), False, "rs")
    y += 48
    for text in (ctx.store["street"], ctx.store["city_line"]):
        page.text(110, y, text, sans, 28, (90, 90, 90))
        y += 38
    y += 30
    page.text(110, y, t["order"] % order_no, sans, 30, (30, 30, 30), True)
    page.text(w - 110, y, "%s: %s" % (t["date"], date_text), sans, 30, (30, 30, 30), False, "rs")
    y += 44
    page.text(110, y, "%s: %s" % (t["billed"], first), sans, 28, (90, 90, 90))
    y += 70
    page.d.rectangle([110, y - 40, w - 110, y + 14], fill=(240, 240, 240))
    page.text(124, y, t["item"], sans, 28, (40, 40, 40), True)
    page.text(w - 420, y, t["qty"], sans, 28, (40, 40, 40), True, "rs")
    page.text(w - 124, y, t["amount"], sans, 28, (40, 40, 40), True, "rs")
    y += 56
    for name, qty, cents in lines:
        page.text(124, y, name[:38], serif, 30, (30, 30, 30))
        page.text(w - 420, y, "%d" % qty, serif, 30, (30, 30, 30), False, "rs")
        page.text(w - 124, y, amt(cents), serif, 30, (30, 30, 30), False, "rs")
        y += 56
        page.line(110, w - 110, y - 28, (230, 230, 230), 1)
    y += 40
    for text, cents in breakdown:
        page.text(w - 420, y, text, sans, 28, (90, 90, 90), False, "rs")
        if cents is not None:
            page.text(w - 124, y, amt(cents), sans, 28, (90, 90, 90), False, "rs")
        y += 46
    y += 20
    page.line(w - 640, w - 110, y - 30, (60, 60, 60), 2)
    page.text(w - 420, y + 20, t["total"], sans, 40, (10, 10, 10), True, "rs")
    page.text(w - 124, y + 20, amt(total), sans, 46, (10, 10, 10), True, "rs")
    y += 110
    page.text(110, y, paid, sans, 29, (60, 60, 60))
    height = max(h, y + 400)
    page.text(w / 2, height - 90, t["page"], sans, 24, (140, 140, 140), False, "ms")
    return page.im.crop((0, 0, w, height)), "digital-pdf"


def digital_spec_frame(market):
    key = "CA" if market.startswith("CA") else market
    frame = dict(id="hold-%s-digital" % key.lower(), family="digital", fonts=["sfui"], geom=[(80, 40)], align="left", rule="-", total="plain",
                 tender="line", items="plain", flags=False, tax_rate=True)
    frame.update(hf.MARKET_FLAGS[key])
    return frame
