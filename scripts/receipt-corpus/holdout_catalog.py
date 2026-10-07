"""Holdout set: brands that are not in the first corpus, menus, prescriptions and fonts.

None of the names below appears in catalog.BRANDS, so a parser tuned on the first 300 receipts has
seen none of them. fams lists the receipt layouts a brand can appear on.
"""

import catalog
import render

# ---------------------------------------------------------------------------------------------
# Fonts the first corpus did not use. 3-tuples carry a variable-font instance name.
# ---------------------------------------------------------------------------------------------

S = "/System/Library/Fonts/"
SS = "/System/Library/Fonts/Supplemental/"

NEW_FONTS = {
    "sfmono": ((S + "SFNSMono.ttf", 0, "Regular"), (S + "SFNSMono.ttf", 0, "Bold")),
    "sfui": ((S + "SFNS.ttf", 0, "Regular"), (S + "SFNS.ttf", 0, "Bold")),
    "sfsemi": ((S + "SFNS.ttf", 0, "Medium"), (S + "SFNS.ttf", 0, "Semibold")),
    "avenirnext": ((S + "Avenir Next.ttc", 7), (S + "Avenir Next.ttc", 0)),
    "avenirheavy": ((S + "Avenir Next.ttc", 8), (S + "Avenir Next.ttc", 8)),
    "avenir": ((S + "Avenir.ttc", 0), (S + "Avenir.ttc", 4)),
    "optima": ((S + "Optima.ttc", 0), (S + "Optima.ttc", 1)),
    "gillsans": ((SS + "GillSans.ttc", 0), (SS + "GillSans.ttc", 1)),
    "lucida": ((S + "LucidaGrande.ttc", 0), (S + "LucidaGrande.ttc", 1)),
    "geneva": ((S + "Geneva.ttf", 0), None),
    "helvold": ((S + "Helvetica.ttc", 0), (S + "Helvetica.ttc", 1)),
    "palatino": ((S + "Palatino.ttc", 0), (S + "Palatino.ttc", 2)),
    "typewriter": ((SS + "AmericanTypewriter.ttc", 0), (SS + "AmericanTypewriter.ttc", 2)),
    "typewritercond": ((SS + "AmericanTypewriter.ttc", 4), (SS + "AmericanTypewriter.ttc", 5)),
    "georgiaserif": ((SS + "Georgia.ttf", 0), (SS + "Georgia Bold.ttf", 0)),
    "timesold": ((S + "Times.ttc", 0), (S + "Times.ttc", 1)),
    "charter": ((SS + "Charter.ttc", 0), (SS + "Charter.ttc", 3)),
    # handwriting, for a tip and a total written in by hand
    "bradley": ((SS + "Bradley Hand Bold.ttf", 0), (SS + "Bradley Hand Bold.ttf", 0)),
    "noteworthy": ((S + "Noteworthy.ttc", 1), (S + "Noteworthy.ttc", 1)),
    "markerfelt": ((S + "MarkerFelt.ttc", 0), (S + "MarkerFelt.ttc", 0)),
    # large sans-serif store names
    "avenirblack": ((S + "Avenir.ttc", 2), (S + "Avenir.ttc", 2)),
    "gillultra": ((SS + "GillSans.ttc", 6), (SS + "GillSans.ttc", 6)),
    "optimablack": ((S + "Optima.ttc", 4), (S + "Optima.ttc", 4)),
    "dinalt": ((SS + "DIN Alternate Bold.ttf", 0), (SS + "DIN Alternate Bold.ttf", 0)),
    "sfheavy": ((S + "SFNS.ttf", 0, "Heavy"), (S + "SFNS.ttf", 0, "Heavy")),
}
SANS_LARGE = ["avenirblack", "gillultra", "optimablack", "dinalt", "sfheavy", "avenirheavy"]
MONO_NEW = ["sfmono"]
PROPORTIONAL = ["avenirnext", "avenir", "optima", "gillsans", "lucida", "geneva", "helvold", "sfui", "typewriter", "typewritercond"]

render.FONTS.update(NEW_FONTS)
render.MONO.update(MONO_NEW)
for key in SANS_LARGE:
    if key not in render.DISPLAY:
        render.DISPLAY.append(key)


# ---------------------------------------------------------------------------------------------
# Brands. fams: kiosk coffee rx pump check_blank check_signed dept hardware transport atm
# terminal market2 bilingual (Canada only). Every brand can also be a digital receipt.
# ---------------------------------------------------------------------------------------------


def H(name, fams, legal, url, slogan=None, sub=None, mixed=None, lang="both", split=None, cat="restaurant"):
    brand = catalog._b(name, cat, legal, url, slogan, sub, mixed, lang, split)
    brand["fams"] = fams
    return brand


HOLDOUT_BRANDS = {
    "US": [
        H("Taco Bell", ["kiosk", "terminal"], "TACO BELL CORP.", "www.tacobell.com", "Live Mas", split=("TACO", "BELL")),
        H("Subway", ["kiosk", "terminal"], "SUBWAY IP LLC", "www.subway.com", mixed="Subway"),
        H("Chipotle", ["kiosk", "terminal"], "CHIPOTLE MEXICAN GRILL, INC.", "www.chipotle.com", mixed="Chipotle"),
        H("Peet's Coffee", ["coffee"], "PEET'S COFFEE, INC.", "www.peets.com", split=("PEET'S", "COFFEE")),
        H("Caribou Coffee", ["coffee"], "CARIBOU COFFEE COMPANY, INC.", "www.cariboucoffee.com", split=("CARIBOU", "COFFEE")),
        H("Rite Aid", ["rx"], "RITE AID CORPORATION", "www.riteaid.com", split=("RITE", "AID"), cat="pharmacy"),
        H("Duane Reade", ["rx", "terminal"], "DUANE READE, INC.", "www.duanereade.com", split=("DUANE", "READE"), cat="pharmacy"),
        H("Sunoco", ["pump", "terminal"], "SUNOCO LP", "www.sunoco.com", mixed="Sunoco", cat="fuel"),
        H("Wawa", ["pump", "coffee"], "WAWA, INC.", "www.wawa.com", mixed="Wawa", cat="fuel"),
        H("Chili's", ["check_blank", "check_signed"], "BRINKER INTERNATIONAL", "www.chilis.com", mixed="Chili's"),
        H("Outback Steakhouse", ["check_blank", "check_signed"], "OSI RESTAURANT PARTNERS, LLC", "www.outback.com", split=("OUTBACK", "STEAKHOUSE")),
        H("Nordstrom", ["dept"], "NORDSTROM, INC.", "www.nordstrom.com", cat="department"),
        H("Kohl's", ["dept", "terminal"], "KOHL'S, INC.", "www.kohls.com", mixed="Kohl's", cat="department"),
        H("Ace Hardware", ["hardware"], "ACE HARDWARE CORPORATION", "www.acehardware.com", split=("ACE", "HARDWARE"), cat="hardware"),
        H("Menards", ["hardware"], "MENARD, INC.", "www.menards.com", mixed="Menards", cat="hardware"),
        H("Publix", ["market2"], "PUBLIX SUPER MARKETS, INC.", "www.publix.com", mixed="Publix", cat="grocery"),
        H("Safeway", ["market2"], "SAFEWAY INC.", "www.safeway.com", mixed="Safeway", cat="grocery"),
        H("Uber", ["transport"], "UBER TECHNOLOGIES, INC.", "www.uber.com", mixed="Uber", cat="transport"),
        H("Amtrak", ["transport"], "NATIONAL RAILROAD PASSENGER CORP.", "www.amtrak.com", mixed="Amtrak", cat="transport"),
        H("Chase", ["atm"], "JPMORGAN CHASE BANK, N.A.", "www.chase.com", mixed="Chase", cat="bank"),
        H("Wells Fargo", ["atm"], "WELLS FARGO BANK, N.A.", "www.wellsfargo.com", split=("WELLS", "FARGO"), cat="bank"),
    ],
    "CA": [
        H("Subway", ["kiosk", "terminal"], "SUBWAY CANADA", "www.subway.com", mixed="Subway"),
        H("Harvey's", ["kiosk"], "HARVEY'S RESTAURANTS", "www.harveys.ca", mixed="Harvey's", lang="en"),
        H("Second Cup", ["coffee"], "SECOND CUP LTD.", "www.secondcup.com", split=("SECOND", "CUP"), lang="en"),
        H("Van Houtte", ["coffee"], "VAN HOUTTE CAFE INC.", "www.vanhoutte.com", split=("VAN", "HOUTTE"), lang="fr"),
        H("Rexall", ["rx"], "REXALL PHARMA PLUS", "www.rexall.ca", mixed="Rexall", lang="en", cat="pharmacy"),
        H("Uniprix", ["rx", "bilingual"], "UNIPRIX INC.", "www.uniprix.com", mixed="Uniprix", lang="fr", cat="pharmacy"),
        H("Esso", ["pump", "terminal"], "IMPERIAL OIL LIMITED", "www.esso.ca", mixed="Esso", cat="fuel"),
        H("Ultramar", ["pump"], "PARKLAND CORPORATION", "www.ultramar.ca", mixed="Ultramar", lang="fr", cat="fuel"),
        H("Boston Pizza", ["check_blank", "check_signed"], "BOSTON PIZZA INTERNATIONAL", "www.bostonpizza.com", split=("BOSTON", "PIZZA"), lang="en"),
        H("Cora", ["check_blank", "check_signed"], "GROUPE CORA INC.", "www.chezcora.com", mixed="Cora", lang="fr"),
        H("Winners", ["dept"], "WINNERS MERCHANTS INTERNATIONAL", "www.winners.ca", mixed="Winners", lang="en", cat="department"),
        H("Simons", ["dept", "bilingual"], "LA MAISON SIMONS INC.", "www.simons.ca", mixed="Simons", lang="fr", cat="department"),
        H("Home Hardware", ["hardware"], "HOME HARDWARE STORES LIMITED", "www.homehardware.ca", split=("HOME", "HARDWARE"), lang="en", cat="hardware"),
        H("Patrick Morin", ["hardware", "bilingual"], "PATRICK MORIN INC.", "www.patrickmorin.com", split=("PATRICK", "MORIN"), lang="fr", cat="hardware"),
        H("Giant Tiger", ["market2", "bilingual"], "GIANT TIGER STORES LIMITED", "www.gianttiger.com", split=("GIANT", "TIGER"), cat="grocery"),
        H("Adonis", ["market2"], "MARCHE ADONIS INC.", "www.marcheadonis.com", mixed="Adonis", lang="fr", cat="grocery"),
        H("VIA Rail", ["transport"], "VIA RAIL CANADA INC.", "www.viarail.ca", mixed="VIA Rail", cat="transport"),
        H("Uber", ["transport"], "UBER CANADA INC.", "www.uber.com", mixed="Uber", cat="transport"),
        H("RBC", ["atm"], "ROYAL BANK OF CANADA", "www.rbc.com", mixed="RBC", cat="bank"),
        H("Desjardins", ["atm"], "FEDERATION DES CAISSES DESJARDINS", "www.desjardins.com", mixed="Desjardins", lang="fr", cat="bank"),
    ],
    "UK": [
        H("KFC", ["kiosk", "terminal"], "KFC (GREAT BRITAIN) LIMITED", "www.kfc.co.uk", mixed="KFC"),
        H("Burger King", ["kiosk"], "BURGER KING (UK) LIMITED", "www.burgerking.co.uk", split=("BURGER", "KING")),
        H("Caffe Nero", ["coffee"], "CAFFE NERO GROUP LTD", "www.caffenero.com", split=("CAFFE", "NERO"), mixed="Caffè Nero"),
        H("Leon", ["kiosk", "coffee"], "LEON RESTAURANTS LIMITED", "www.leon.co", mixed="LEON"),
        H("Lloyds Pharmacy", ["rx"], "LLOYDSPHARMACY LTD", "www.lloydspharmacy.com", split=("LLOYDS", "PHARMACY"), cat="pharmacy"),
        H("Well Pharmacy", ["rx"], "WELL PHARMACY LIMITED", "www.well.co.uk", split=("WELL", "PHARMACY"), cat="pharmacy"),
        H("Esso", ["pump", "terminal"], "ESSO PETROLEUM COMPANY LTD", "www.esso.co.uk", mixed="Esso", cat="fuel"),
        H("Texaco", ["pump"], "TEXACO LIMITED", "www.texaco.co.uk", mixed="Texaco", cat="fuel"),
        H("Pizza Express", ["check_blank", "check_signed"], "PIZZAEXPRESS RESTAURANTS LTD", "www.pizzaexpress.com", split=("PIZZA", "EXPRESS")),
        H("Wetherspoon", ["check_blank"], "J D WETHERSPOON PLC", "www.jdwetherspoon.com", mixed="Wetherspoon"),
        H("Next", ["dept"], "NEXT RETAIL LIMITED", "www.next.co.uk", mixed="NEXT", cat="department"),
        H("TK Maxx", ["dept", "terminal"], "TJX UK", "www.tkmaxx.com", split=("TK", "MAXX"), cat="department"),
        H("Screwfix", ["hardware"], "SCREWFIX DIRECT LIMITED", "www.screwfix.com", mixed="Screwfix", cat="hardware"),
        H("Wickes", ["hardware"], "WICKES BUILDING SUPPLIES LTD", "www.wickes.co.uk", mixed="Wickes", cat="hardware"),
        H("Co-op", ["market2"], "THE CO-OPERATIVE FOOD", "www.coop.co.uk", mixed="Co-op", cat="grocery"),
        H("Lidl", ["market2"], "LIDL GREAT BRITAIN LTD", "www.lidl.co.uk", mixed="Lidl", cat="grocery"),
        H("Trainline", ["transport"], "TRAINLINE.COM LIMITED", "www.thetrainline.com", mixed="trainline", cat="transport"),
        H("National Express", ["transport"], "NATIONAL EXPRESS LIMITED", "www.nationalexpress.com", split=("NATIONAL", "EXPRESS"), cat="transport"),
        H("Barclays", ["atm"], "BARCLAYS BANK UK PLC", "www.barclays.co.uk", mixed="Barclays", cat="bank"),
        H("NatWest", ["atm"], "NATIONAL WESTMINSTER BANK PLC", "www.natwest.com", mixed="NatWest", cat="bank"),
    ],
    "MX": [
        H("Burger King", ["kiosk"], "BURGER KING MEXICO", "www.burgerking.com.mx", split=("BURGER", "KING")),
        H("Domino's", ["kiosk", "terminal"], "DOMINO'S PIZZA MEXICO", "www.dominos.com.mx", mixed="Domino's"),
        H("Little Caesars", ["kiosk"], "LITTLE CAESARS MEXICO", "www.littlecaesars.com.mx", split=("LITTLE", "CAESARS")),
        H("Cafe Punta del Cielo", ["coffee"], "CAFE PUNTA DEL CIELO, S.A.", "www.puntadelcielo.com", split=("CAFE", "PUNTA DEL CIELO"), mixed="Café Punta del Cielo"),
        H("Italian Coffee", ["coffee"], "THE ITALIAN COFFEE COMPANY", "www.italiancoffee.com.mx", split=("ITALIAN", "COFFEE")),
        H("Benavides", ["rx"], "FARMACIAS BENAVIDES, S.A.B. DE C.V.", "www.benavides.com.mx", mixed="Benavides", cat="pharmacy"),
        H("Farmacias San Pablo", ["rx"], "FARMACIAS SAN PABLO, S.A. DE C.V.", "www.farmaciasanpablo.com.mx", split=("FARMACIAS", "SAN PABLO"), cat="pharmacy"),
        H("Mobil", ["pump", "terminal"], "MOBIL MEXICO", "www.mobil.com.mx", mixed="Mobil", cat="fuel"),
        H("G500", ["pump"], "G500 NETWORK, S.A. DE C.V.", "www.g500.com.mx", mixed="G500", cat="fuel"),
        H("El Fogoncito", ["check_blank", "check_signed"], "OPERADORA EL FOGONCITO", "www.elfogoncito.com.mx", split=("EL", "FOGONCITO")),
        H("Sushi Itto", ["check_blank", "check_signed"], "SUSHI ITTO, S.A. DE C.V.", "www.sushiitto.com.mx", split=("SUSHI", "ITTO")),
        H("Coppel", ["dept"], "COPPEL, S.A. DE C.V.", "www.coppel.com", mixed="Coppel", cat="department"),
        H("Suburbia", ["dept", "terminal"], "SUBURBIA, S. DE R.L. DE C.V.", "www.suburbia.com.mx", mixed="Suburbia", cat="department"),
        H("El Palacio de Hierro", ["dept"], "EL PALACIO DE HIERRO, S.A.B.", "www.elpalaciodehierro.com", split=("EL PALACIO", "DE HIERRO"), cat="department"),
        H("Construrama", ["hardware"], "CEMEX CONSTRURAMA", "www.construrama.com", mixed="Construrama", cat="hardware"),
        H("Casa Ley", ["market2"], "CASA LEY, S.A. DE C.V.", "www.casaley.com.mx", split=("CASA", "LEY"), cat="grocery"),
        H("H-E-B", ["market2"], "HEB MEXICO, S.A. DE C.V.", "www.heb.com.mx", mixed="H-E-B", cat="grocery"),
        H("Cabify", ["transport"], "CABIFY MEXICO", "www.cabify.com", mixed="Cabify", cat="transport"),
        H("ADO", ["transport"], "AUTOBUSES DE ORIENTE ADO", "www.ado.com.mx", mixed="ADO", cat="transport"),
        H("BBVA", ["atm"], "BBVA MEXICO, S.A.", "www.bbva.mx", mixed="BBVA", cat="bank"),
        H("Banorte", ["atm"], "BANCO MERCANTIL DEL NORTE", "www.banorte.com", mixed="Banorte", cat="bank"),
    ],
    "AU": [
        H("KFC", ["kiosk", "terminal"], "KFC AUSTRALIA PTY LTD", "www.kfc.com.au", mixed="KFC"),
        H("Hungry Jack's", ["kiosk"], "HUNGRY JACK'S PTY LTD", "www.hungryjacks.com.au", split=("HUNGRY", "JACK'S")),
        H("Oporto", ["kiosk"], "OPORTO PTY LTD", "www.oporto.com.au", mixed="Oporto"),
        H("The Coffee Club", ["coffee", "check_blank"], "THE COFFEE CLUB PTY LTD", "www.coffeeclub.com.au", split=("THE COFFEE", "CLUB")),
        H("Muffin Break", ["coffee"], "MUFFIN BREAK PTY LTD", "www.muffinbreak.com.au", split=("MUFFIN", "BREAK")),
        H("Terry White Chemmart", ["rx"], "TERRY WHITE CHEMMART", "www.terrywhitechemmart.com.au", split=("TERRY WHITE", "CHEMMART"), cat="pharmacy"),
        H("Amcal", ["rx"], "AMCAL PHARMACY", "www.amcal.com.au", mixed="Amcal", cat="pharmacy"),
        H("United Petroleum", ["pump"], "UNITED PETROLEUM PTY LTD", "www.unitedpetroleum.com.au", split=("UNITED", "PETROLEUM"), cat="fuel"),
        H("Mobil", ["pump", "terminal"], "VIVA ENERGY AUSTRALIA", "www.mobil.com.au", mixed="Mobil", cat="fuel"),
        H("Hog's Breath Cafe", ["check_blank", "check_signed"], "HOG'S BREATH CAFE", "www.hogsbreath.com.au", split=("HOG'S BREATH", "CAFE")),
        H("Sizzler", ["check_blank", "check_signed"], "SIZZLER AUSTRALIA PTY LTD", "www.sizzler.com.au", mixed="Sizzler"),
        H("Myer", ["dept"], "MYER PTY LTD", "www.myer.com.au", mixed="Myer", cat="department"),
        H("David Jones", ["dept", "terminal"], "DAVID JONES PTY LIMITED", "www.davidjones.com", split=("DAVID", "JONES"), cat="department"),
        H("Mitre 10", ["hardware"], "MITRE 10 AUSTRALIA", "www.mitre10.com.au", split=("MITRE", "10"), cat="hardware"),
        H("Total Tools", ["hardware"], "TOTAL TOOLS PTY LTD", "www.totaltools.com.au", split=("TOTAL", "TOOLS"), cat="hardware"),
        H("Harris Farm Markets", ["market2"], "HARRIS FARM MARKETS PTY LTD", "www.harrisfarm.com.au", split=("HARRIS FARM", "MARKETS"), cat="grocery"),
        H("Foodland", ["market2"], "FOODLAND SUPERMARKETS", "www.foodland.com.au", mixed="Foodland", cat="grocery"),
        H("Uber", ["transport"], "UBER AUSTRALIA PTY LTD", "www.uber.com", mixed="Uber", cat="transport"),
        H("13cabs", ["transport"], "13CABS PTY LTD", "www.13cabs.com.au", mixed="13cabs", cat="transport"),
        H("Westpac", ["atm"], "WESTPAC BANKING CORPORATION", "www.westpac.com.au", mixed="Westpac", cat="bank"),
        H("NAB", ["atm"], "NATIONAL AUSTRALIA BANK", "www.nab.com.au", mixed="NAB", cat="bank"),
    ],
}

# Brands that fit a card-terminal slip when no brand lists "terminal": any retailer will do.
GENERIC_TERMINAL = {
    "US": ["Barnes & Noble", "Petco", "GameStop"],
    "CA": ["Chapters", "Indigo", "Sport Chek"],
    "UK": ["Waterstones", "WH Smith", "Halfords"],
    "MX": ["Cinepolis", "Sears", "Liverpool Pacifica"],
    "AU": ["Harvey Norman", "The Good Guys", "Cotton On"],
}

# ---------------------------------------------------------------------------------------------
# New item lists. Same "NAME|low|high[|tax][|unit]" format as catalog.
# ---------------------------------------------------------------------------------------------

catalog._items("kiosk.en", """
DOUBLE CHEESEBURGER|4.49|6.99|T
CHICKEN SANDWICH|5.29|7.49|T
SPICY CHICKEN WRAP|4.99|6.49|T
6PC NUGGETS|3.99|5.99|T
LRG FRIES|2.79|3.99|T
MED FRIES|2.19|3.19|T
MED SOFT DRINK|1.99|2.99|T
LRG SHAKE|3.49|4.99|T
ICED TEA|1.99|2.99|T
APPLE PIE|1.29|2.29|T
KIDS MEAL|4.29|5.99|T
VEGGIE BURGER|4.99|6.49|T
BREAKFAST BURRITO|3.99|5.49|T
""")
catalog._items("kiosk.fr", """
DOUBLE CHEESEBURGER|4.49|6.99|T
SANDWICH AU POULET|5.29|7.49|T
WRAP POULET EPICE|4.99|6.49|T
6 MORCEAUX POULET|3.99|5.99|T
GRANDE FRITE|2.79|3.99|T
FRITE MOYENNE|2.19|3.19|T
BOISSON GAZEUSE MOY|1.99|2.99|T
GRAND LAIT FRAPPE|3.49|4.99|T
THE GLACE|1.99|2.99|T
CHAUSSON AUX POMMES|1.29|2.29|T
REPAS ENFANT|4.29|5.99|T
BURGER VEGETARIEN|4.99|6.49|T
""")
catalog._items("kiosk.es", """
HAMBURGUESA DOBLE|59.00|99.00|T
SANDWICH DE POLLO|55.00|89.00|T
BURRITO DE POLLO|49.00|79.00|T
6 PZ NUGGETS|45.00|75.00|T
PAPAS GRANDES|32.00|49.00|T
PAPAS MEDIANAS|26.00|39.00|T
REFRESCO MEDIANO|24.00|36.00|T
MALTEADA GRANDE|45.00|69.00|T
TE HELADO|24.00|36.00|T
PAY DE MANZANA|22.00|34.00|T
COMBO INFANTIL|59.00|89.00|T
HAMBURGUESA VEGGIE|55.00|85.00|T
""")
catalog._items("kiosk.uk", """
DOUBLE CHEESEBURGER|3.49|5.99|T
CHICKEN FILLET BURGER|3.79|5.99|T
SPICY WRAP|3.29|4.99|T
6 NUGGETS|2.99|4.49|T
LARGE FRIES|1.99|3.19|T
REGULAR FRIES|1.59|2.59|T
MEDIUM COKE|1.79|2.79|T
MILKSHAKE|2.49|3.99|T
APPLE PIE|1.19|1.99|T
KIDS MEAL|3.49|4.99|T
VEGGIE BURGER|3.99|5.49|T
""")
catalog._items("kiosk.au", """
DOUBLE CHEESEBURGER|7.50|11.90|T
CHICKEN BURGER|8.50|12.90|T
CHICKEN WRAP|7.90|11.50|T
6PK NUGGETS|5.50|8.50|T
LARGE CHIPS|3.90|5.90|T
REGULAR CHIPS|3.20|4.90|T
MEDIUM DRINK|3.50|4.90|T
THICKSHAKE|5.50|7.50|T
APPLE PIE|2.50|3.90|T
KIDS PACK|6.90|9.50|T
""")

catalog._items("rx.en", """
ATORVASTATIN 20MG #30|4.00|18.00|0
LISINOPRIL 10MG #90|0.00|12.00|0
AMOXICILLIN 500MG #21|3.00|14.00|0
METFORMIN 500MG #60|2.00|10.00|0
SERTRALINE 50MG #30|4.00|15.00|0
LEVOTHYROXINE 75MCG #90|5.00|20.00|0
OMEPRAZOLE 20MG #30|3.00|12.00|0
""")
catalog._items("rx.uk", """
ATORVASTATIN 20MG 28|9.90|9.90|0
AMOXICILLIN 500MG 21|9.90|9.90|0
METFORMIN 500MG 84|9.90|9.90|0
SERTRALINE 50MG 28|9.90|9.90|0
OMEPRAZOLE 20MG 28|9.90|9.90|0
""")
catalog._items("rx.fr", """
ATORVASTATINE 20MG #30|4.00|18.00|0
LISINOPRIL 10MG #90|0.00|12.00|0
AMOXICILLINE 500MG #21|3.00|14.00|0
METFORMINE 500MG #60|2.00|10.00|0
SERTRALINE 50MG #30|4.00|15.00|0
OMEPRAZOLE 20MG #30|3.00|12.00|0
""")
catalog._items("rx.es", """
ATORVASTATINA 20MG C/30|120.00|380.00|0
METFORMINA 850MG C/60|60.00|190.00|0
LOSARTAN 50MG C/30|80.00|240.00|0
OMEPRAZOL 20MG C/14|45.00|140.00|0
AMOXICILINA 500MG C/12|70.00|210.00|0
""")


def items(key):
    return catalog._ITEMS[key]


# Transport: (label, low, high) in local currency. The first is always the base fare.
TRANSPORT = {
    "en": [("Base fare", 2.5, 4.5), ("Distance", 6.0, 38.0), ("Time", 3.0, 18.0), ("Booking fee", 1.5, 3.5), ("Airport surcharge", 4.0, 7.0), ("Tolls", 2.0, 9.0), ("Promo", -6.0, -2.0)],
    "fr": [("Tarif de base", 3.5, 4.5), ("Distance", 6.0, 38.0), ("Temps", 3.0, 18.0), ("Frais de reservation", 1.5, 3.5), ("Supplement aeroport", 4.0, 7.0), ("Peages", 2.0, 9.0), ("Rabais", -6.0, -2.0)],
    "es": [("Tarifa base", 20.0, 35.0), ("Distancia", 60.0, 420.0), ("Tiempo", 30.0, 160.0), ("Cuota de servicio", 12.0, 28.0), ("Cargo aeropuerto", 45.0, 80.0), ("Casetas", 30.0, 140.0), ("Promocion", -90.0, -30.0)],
}
RAIL = {
    "en": ["Adult single", "Adult return", "Seat reservation", "Railcard discount", "Booking fee"],
    "fr": ["Billet adulte simple", "Billet adulte aller-retour", "Reservation de siege", "Rabais carte", "Frais de reservation"],
    "es": ["Boleto adulto sencillo", "Boleto adulto redondo", "Reservacion de asiento", "Descuento INAPAM", "Cargo por servicio"],
}
ATM_AMOUNTS = {
    "default": [2000, 4000, 6000, 8000, 10000, 12000, 20000, 30000, 40000, 50000],
    "MX": [20000, 30000, 50000, 100000, 150000, 200000],
}
