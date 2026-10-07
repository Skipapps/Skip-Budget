"""Test data for the receipt corpus: brands, item lists, places.

Brand names, legal entities and web addresses are public facts used as labelled test data. Street
numbers, phone numbers, tax ids and card digits are invented (phone numbers use the ranges that
regulators reserve for fiction: 555-01xx in North America, 01632/0161 496 0xxx in the UK, 02 5550 xxxx
in Australia).
"""

# ---------------------------------------------------------------------------------------------
# Brands. name is the expected merchant as a person would write it; legal / url are what a
# receipt prints elsewhere; sub is a second word the logo sometimes carries.
# Categories: grocery pharmacy coffee fuel restaurant electronics hardware department
#             convenience discount
# lang: which Canadian receipts it appears on (en, fr or both); ignored elsewhere.
# ---------------------------------------------------------------------------------------------


def _b(name, cat, legal, url, slogan=None, sub=None, mixed=None, lang="both", split=None):
    return dict(
        name=name,
        cat=cat,
        legal=legal,
        url=url,
        slogan=slogan,
        sub=sub,
        mixed=mixed or name,
        lang=lang,
        split=split,
    )


BRANDS = {
    "US": [
        _b("Walmart", "grocery", "WAL-MART STORES INC.", "www.walmart.com", "Save money. Live better.", "SUPERCENTER"),
        _b("Target", "department", "TARGET CORPORATION", "www.target.com", "Expect More. Pay Less."),
        _b("Costco Wholesale", "grocery", "COSTCO WHOLESALE CORPORATION", "www.costco.com", split=("COSTCO", "WHOLESALE")),
        _b("Kroger", "grocery", "THE KROGER CO.", "www.kroger.com", "Fresh for Everyone"),
        _b("Whole Foods Market", "grocery", "WHOLE FOODS MARKET GROUP, INC.", "www.wholefoodsmarket.com", split=("WHOLE FOODS", "MARKET")),
        _b("Trader Joe's", "grocery", "TRADER JOE'S COMPANY", "www.traderjoes.com", split=("TRADER", "JOE'S")),
        _b("CVS Pharmacy", "pharmacy", "CVS PHARMACY, INC.", "www.cvs.com", split=("CVS", "pharmacy"), mixed="CVS pharmacy"),
        _b("Walgreens", "pharmacy", "WALGREEN CO.", "www.walgreens.com", "At the corner of happy & healthy"),
        _b("Starbucks", "coffee", "STARBUCKS CORPORATION", "www.starbucks.com"),
        _b("Dunkin'", "coffee", "DUNKIN' BRANDS, INC.", "www.dunkindonuts.com", "America Runs on Dunkin'"),
        _b("Shell", "fuel", "SHELL OIL PRODUCTS US", "www.shell.us"),
        _b("Chevron", "fuel", "CHEVRON U.S.A. INC.", "www.chevron.com"),
        _b("The Home Depot", "hardware", "HOME DEPOT U.S.A., INC.", "www.homedepot.com", "More saving. More doing.", split=("THE HOME", "DEPOT")),
        _b("Lowe's", "hardware", "LOWE'S HOME CENTERS, LLC", "www.lowes.com", "Let's Build Something Together"),
        _b("Best Buy", "electronics", "BEST BUY STORES, L.P.", "www.bestbuy.com", split=("BEST", "BUY")),
        _b("Macy's", "department", "MACY'S RETAIL HOLDINGS, LLC", "www.macys.com"),
        _b("Olive Garden", "restaurant", "DARDEN RESTAURANTS, INC.", "www.olivegarden.com", "When you're here, you're family", split=("OLIVE", "GARDEN")),
        _b("Applebee's", "restaurant", "APPLEBEE'S NEIGHBORHOOD GRILL", "www.applebees.com", "Eatin' good in the neighborhood"),
        _b("Panera Bread", "coffee", "PANERA, LLC", "www.panerabread.com", split=("PANERA", "BREAD")),
    ],
    "CA": [
        _b("Loblaws", "grocery", "LOBLAW COMPANIES LIMITED", "www.loblaws.ca", lang="en"),
        _b("No Frills", "grocery", "LOBLAW COMPANIES LIMITED", "www.nofrills.ca", lang="en", split=("NO", "FRILLS")),
        _b("Metro", "grocery", "METRO RICHELIEU INC.", "www.metro.ca"),
        _b("IGA", "grocery", "SOBEYS QUEBEC INC.", "www.iga.net", lang="fr"),
        _b("Provigo", "grocery", "PROVIGO DISTRIBUTION INC.", "www.provigo.ca", lang="fr"),
        _b("Maxi", "grocery", "LOBLAW QUEBEC LTEE", "www.maxi.ca", lang="fr"),
        _b("Super C", "grocery", "METRO RICHELIEU INC.", "www.superc.ca", lang="fr", split=("SUPER", "C")),
        _b("Shoppers Drug Mart", "pharmacy", "SHOPPERS DRUG MART INC.", "www.shoppersdrugmart.ca", lang="en", split=("SHOPPERS", "DRUG MART")),
        _b("Jean Coutu", "pharmacy", "GROUPE JEAN COUTU (PJC) INC.", "www.jeancoutu.com", lang="fr", split=("JEAN", "COUTU")),
        _b("Pharmaprix", "pharmacy", "PHARMAPRIX INC.", "www.pharmaprix.ca", lang="fr"),
        _b("Tim Hortons", "coffee", "TIM HORTONS INC.", "www.timhortons.ca", split=("TIM", "HORTONS")),
        _b("Petro-Canada", "fuel", "SUNCOR ENERGY PRODUCTS PARTNERSHIP", "www.petro-canada.ca"),
        _b("Canadian Tire", "hardware", "CANADIAN TIRE CORPORATION, LIMITED", "www.canadiantire.ca", split=("CANADIAN", "TIRE")),
        _b("RONA", "hardware", "RONA INC.", "www.rona.ca", lang="fr", mixed="Rona"),
        _b("Réno-Dépôt", "hardware", "RENO-DEPOT INC.", "www.renodepot.com", lang="fr"),
        _b("The Home Depot", "hardware", "HOME DEPOT OF CANADA INC.", "www.homedepot.ca", lang="en", split=("THE HOME", "DEPOT")),
        _b("Best Buy", "electronics", "BEST BUY CANADA LTD.", "www.bestbuy.ca", split=("BEST", "BUY")),
        _b("Walmart", "grocery", "WALMART CANADA CORP.", "www.walmart.ca", "Save money. Live better.", "SUPERCENTRE"),
        _b("Costco Wholesale", "grocery", "COSTCO WHOLESALE CANADA LTD.", "www.costco.ca", split=("COSTCO", "WHOLESALE")),
        _b("Couche-Tard", "convenience", "COUCHE-TARD INC.", "www.couche-tard.com", lang="fr", split=("COUCHE", "TARD")),
        _b("St-Hubert", "restaurant", "RESTAURANTS ST-HUBERT INC.", "www.st-hubert.com", lang="fr", mixed="St-Hubert"),
        _b("A&W", "restaurant", "A&W FOOD SERVICES OF CANADA INC.", "www.aw.ca", lang="en"),
        _b("Dollarama", "discount", "DOLLARAMA L.P.", "www.dollarama.com"),
        _b("Sobeys", "grocery", "SOBEYS INC.", "www.sobeys.com", lang="en"),
    ],
    "UK": [
        _b("Tesco", "grocery", "TESCO STORES LIMITED", "www.tesco.com", "Every little helps", mixed="tesco"),
        _b("Sainsbury's", "grocery", "J SAINSBURY PLC", "www.sainsburys.co.uk", "Live Well For Less", mixed="Sainsbury's"),
        _b("Asda", "grocery", "ASDA STORES LTD", "www.asda.com", "Save money. Live better.", mixed="asda"),
        _b("Morrisons", "grocery", "WM MORRISON SUPERMARKETS PLC", "www.morrisons.com", "Great Value", mixed="Morrisons"),
        _b("Waitrose", "grocery", "WAITROSE LIMITED", "www.waitrose.com", mixed="Waitrose & Partners"),
        _b("Marks & Spencer", "department", "MARKS AND SPENCER PLC", "www.marksandspencer.com", split=("MARKS &", "SPENCER"), mixed="Marks & Spencer"),
        _b("Boots", "pharmacy", "BOOTS UK LIMITED", "www.boots.com", "Trusted since 1849", mixed="Boots"),
        _b("Superdrug", "pharmacy", "SUPERDRUG STORES PLC", "www.superdrug.com"),
        _b("Greggs", "coffee", "GREGGS PLC", "www.greggs.co.uk", mixed="greggs"),
        _b("Costa Coffee", "coffee", "COSTA LIMITED", "www.costa.co.uk", split=("COSTA", "COFFEE")),
        _b("Pret A Manger", "coffee", "PRET A MANGER (EUROPE) LTD", "www.pret.co.uk", split=("PRET", "A MANGER")),
        _b("Shell", "fuel", "SHELL U.K. OIL PRODUCTS LIMITED", "www.shell.co.uk"),
        _b("BP", "fuel", "BP OIL UK LTD", "www.bp.com/en_gb"),
        _b("B&Q", "hardware", "B&Q LIMITED", "www.diy.com"),
        _b("Currys", "electronics", "CURRYS GROUP LIMITED", "www.currys.co.uk", mixed="Currys"),
        _b("Argos", "department", "ARGOS LIMITED", "www.argos.co.uk", mixed="Argos"),
        _b("John Lewis", "department", "JOHN LEWIS PLC", "www.johnlewis.com", split=("JOHN", "LEWIS"), mixed="John Lewis"),
        _b("Nando's", "restaurant", "NANDO'S CHICKENLAND LIMITED", "www.nandos.co.uk", mixed="Nando's"),
        _b("Wagamama", "restaurant", "WAGAMAMA LIMITED", "www.wagamama.com", mixed="wagamama"),
    ],
    "MX": [
        _b("OXXO", "convenience", "CADENA COMERCIAL OXXO, S.A. DE C.V.", "www.oxxo.com", mixed="Oxxo"),
        _b("Soriana", "grocery", "ORGANIZACION SORIANA, S.A.B. DE C.V.", "www.soriana.com", "Precios bajos todos los dias", mixed="Soriana"),
        _b("Walmart", "grocery", "NUEVA WAL MART DE MEXICO, S. DE R.L. DE C.V.", "www.walmart.com.mx", "Ahorra dinero. Vive mejor.", "SUPERCENTER"),
        _b("Bodega Aurrerá", "grocery", "NUEVA WAL MART DE MEXICO, S. DE R.L. DE C.V.", "www.bodegaaurrera.com.mx", split=("BODEGA", "AURRERÁ")),
        _b("Farmacias Guadalajara", "pharmacy", "FARMACIAS GUADALAJARA, S.A. DE C.V.", "www.farmaciasguadalajara.com", split=("FARMACIAS", "GUADALAJARA")),
        _b("Farmacia del Ahorro", "pharmacy", "FARMACIAS DEL AHORRO, S.A. DE C.V.", "www.fahorro.com", split=("FARMACIA", "DEL AHORRO")),
        _b("Farmacias Similares", "pharmacy", "FARMACIAS SIMILARES, S.A. DE C.V.", "www.farmaciasdesimilares.com", split=("FARMACIAS", "SIMILARES")),
        _b("7-Eleven", "convenience", "7-ELEVEN MEXICO, S.A. DE C.V.", "www.7-eleven.com.mx", mixed="7-Eleven"),
        _b("Chedraui", "grocery", "TIENDAS CHEDRAUI, S.A. DE C.V.", "www.chedraui.com.mx", mixed="Chedraui"),
        _b("La Comer", "grocery", "CONTROLADORA COMERCIAL MEXICANA, S.A.B.", "www.lacomer.com.mx", split=("LA", "COMER"), mixed="La Comer"),
        _b("Liverpool", "department", "DISTRIBUIDORA LIVERPOOL, S.A. DE C.V.", "www.liverpool.com.mx", mixed="Liverpool"),
        _b("Sanborns", "department", "SANBORN HERMANOS, S.A.", "www.sanborns.com.mx", mixed="Sanborns"),
        _b("The Home Depot", "hardware", "THE HOME DEPOT MEXICO, S. DE R.L. DE C.V.", "www.homedepot.com.mx", split=("THE HOME", "DEPOT")),
        _b("Office Depot", "electronics", "OFFICE DEPOT DE MEXICO, S.A. DE C.V.", "www.officedepot.com.mx", split=("OFFICE", "DEPOT")),
        _b("Starbucks", "coffee", "ALSEA, S.A.B. DE C.V.", "www.starbucks.com.mx"),
        _b("Pemex", "fuel", "PETROLEOS MEXICANOS", "www.pemex.com", mixed="Pemex"),
        _b("Toks", "restaurant", "OPERADORA DE RESTAURANTES TOKS, S.A.", "www.toks.com.mx", mixed="Toks"),
        _b("Vips", "restaurant", "ALSEA, S.A.B. DE C.V.", "www.vips.com.mx", mixed="Vips"),
    ],
    "AU": [
        _b("Woolworths", "grocery", "WOOLWORTHS GROUP LIMITED", "www.woolworths.com.au", "The Fresh Food People"),
        _b("Coles", "grocery", "COLES SUPERMARKETS AUSTRALIA PTY LTD", "www.coles.com.au", mixed="coles"),
        _b("ALDI", "grocery", "ALDI STORES (A LIMITED PARTNERSHIP)", "www.aldi.com.au", mixed="Aldi"),
        _b("IGA", "grocery", "METCASH TRADING LTD", "www.iga.com.au", mixed="iga"),
        _b("Chemist Warehouse", "pharmacy", "CHEMIST WAREHOUSE PTY LTD", "www.chemistwarehouse.com.au", split=("CHEMIST", "WAREHOUSE")),
        _b("Priceline Pharmacy", "pharmacy", "PRICELINE PTY LTD", "www.priceline.com.au", split=("PRICELINE", "PHARMACY")),
        _b("Bunnings Warehouse", "hardware", "BUNNINGS GROUP LIMITED", "www.bunnings.com.au", "Lowest Prices Are Just The Beginning", split=("BUNNINGS", "WAREHOUSE")),
        _b("JB Hi-Fi", "electronics", "JB HI-FI GROUP PTY LTD", "www.jbhifi.com.au", mixed="JB Hi-Fi"),
        _b("Officeworks", "electronics", "OFFICEWORKS LTD", "www.officeworks.com.au", mixed="Officeworks"),
        _b("Kmart", "department", "KMART AUSTRALIA LIMITED", "www.kmart.com.au", mixed="Kmart"),
        _b("Big W", "department", "BIG W PTY LTD", "www.bigw.com.au", split=("BIG", "W")),
        _b("7-Eleven", "convenience", "7-ELEVEN STORES PTY LTD", "www.7eleven.com.au", mixed="7-Eleven"),
        _b("Caltex", "fuel", "AMPOL AUSTRALIA PETROLEUM PTY LTD", "www.caltex.com.au", mixed="Caltex"),
        _b("BP", "fuel", "BP AUSTRALIA PTY LTD", "www.bp.com/en_au"),
        _b("Ampol", "fuel", "AMPOL AUSTRALIA PETROLEUM PTY LTD", "www.ampol.com.au", mixed="Ampol"),
        _b("Dan Murphy's", "grocery", "ENDEAVOUR GROUP LIMITED", "www.danmurphys.com.au", split=("DAN", "MURPHY'S")),
        _b("McDonald's", "restaurant", "MCDONALD'S AUSTRALIA LIMITED", "www.mcdonalds.com.au", mixed="McDonald's"),
        _b("Guzman y Gomez", "restaurant", "GUZMAN Y GOMEZ PTY LTD", "www.guzmanygomez.com.au", split=("GUZMAN", "Y GOMEZ")),
        _b("Gloria Jean's Coffees", "coffee", "GLORIA JEAN'S COFFEES PTY LTD", "www.gloriajeans.com.au", split=("GLORIA JEAN'S", "COFFEES")),
    ],
}

# ---------------------------------------------------------------------------------------------
# Items. "NAME|low|high[|tax][|unit]": prices in the local currency. tax is T (standard rated) or
# 0 (zero rated / exempt); groceries default to 0 and everything else to T. A unit (kg, lb, 100g)
# makes the price per unit and the quantity a weight.
# ---------------------------------------------------------------------------------------------

_ITEMS = {}


def _items(key, text):
    rows = []
    for raw in text.strip().splitlines():
        parts = [part.strip() for part in raw.split("|")]
        if len(parts) < 3:
            continue
        tax = None
        unit = None
        for extra in parts[3:]:
            if extra in ("T", "0"):
                tax = extra
            elif extra:
                unit = extra
        rows.append(dict(name=parts[0], lo=float(parts[1]), hi=float(parts[2]), tax=tax, unit=unit))
    _ITEMS[key] = rows


_items("grocery.us", """
BANANAS|0.52|0.79|0|lb
ORG BANANAS 3LB|1.49|2.49
GALA APPLES|1.29|2.19|0|lb
RED GRAPES|2.49|3.99|0|lb
ROMA TOMATOES|0.99|1.99|0|lb
AVOCADO LG|0.79|1.59
BABY SPINACH 5OZ|2.99|4.49
RUSSET POTATOES 5LB|2.99|4.99
YELLOW ONION 3LB|2.29|3.79
WHOLE MILK GAL|3.19|4.59
2% MILK HALF GAL|2.29|3.29
LARGE EGGS 18CT|3.99|6.99
BUTTER UNSALTED 1LB|3.99|5.99
SHRED CHEDDAR 8OZ|2.49|3.99
GREEK YOGURT 32OZ|4.29|5.99
WHT SANDWICH BREAD|1.89|3.49
BAGELS 6CT|3.29|4.79
TORTILLAS 10CT|2.49|3.69
SPAGHETTI 16OZ|1.19|1.99
MARINARA SAUCE 24OZ|2.49|4.49
LONG GRAIN RICE 5LB|3.99|6.49
PEANUT BUTTER 16OZ|2.49|3.99
CHICKEN BREAST FAM|8.99|16.99|0|lb
GROUND BEEF 80/20|4.49|6.99|0|lb
BACON 12OZ|4.99|7.49
TURKEY DELI 1/2LB|5.49|7.99
FROZEN PIZZA|4.99|8.49
ICE CREAM 48OZ|3.99|6.49
ORANGE JUICE 52OZ|3.49|5.49
SPARKLING WATER 12PK|3.99|5.99|T
COLA 12PK CANS|5.99|8.99|T
POTATO CHIPS 8OZ|3.29|4.99|T
PAPER TOWELS 6RL|8.99|14.99|T
DISH SOAP 24OZ|2.99|4.49|T
LAUNDRY DETERGENT|9.99|15.99|T
""")

_items("grocery.ca_en", """
BANANAS|0.79|1.49|0|kg
GALA APPLES 3LB BAG|3.99|5.99
BROCCOLI CROWN|1.99|3.49|0|kg
GRAPE TOMATOES|2.99|4.49
BABY CARROTS 1LB|1.79|2.99
POTATOES 10LB|4.99|7.99
MILK 2% 4L|5.49|6.29
MILK 1% 2L|3.49|4.19
LARGE EGGS DOZEN|3.79|5.49
BUTTER SALTED 454G|5.99|7.99
OLD CHEDDAR 400G|5.99|8.49
GREEK YOGURT 750G|4.99|6.99
WHOLE WHEAT BREAD|2.49|3.99
BAGELS 6PK|3.49|4.99
PASTA PENNE 900G|1.99|3.49
PASTA SAUCE 650ML|2.49|4.29
MAPLE SYRUP 540ML|8.99|12.99
PEANUT BUTTER 1KG|5.99|8.99
CHICKEN BREAST BONELESS|7.99|13.99|0|kg
LEAN GROUND BEEF|9.99|15.99|0|kg
BACON 500G|5.99|8.99
FROZEN FRIES 750G|3.49|4.99
ORANGE JUICE 1.75L|3.99|5.49
BOTTLED WATER 24PK|3.99|5.99|T
GINGER ALE 12PK|5.49|7.49|T
KETTLE CHIPS 220G|3.49|4.99|T
PAPER TOWEL 6 ROLLS|7.99|11.99|T
DISH DETERGENT 740ML|2.99|4.49|T
COFFEE GROUND 925G|10.99|14.99
TOILET PAPER 12RL|9.99|13.99|T
""")

_items("grocery.ca_fr", """
BANANES|1.30|2.60|0|kg
POMMES GALA 1.36KG|3.99|5.99
BROCOLI COURONNE|1.99|3.49
TOMATES RAISIN|2.99|4.49
CAROTTES 1LB|1.29|2.19
POMMES DE TERRE 4.5KG|4.99|7.99
LAIT 2% 2L|3.69|4.49
LAIT 1% 4L|5.49|6.29
OEUFS GROS DOUZAINE|3.79|5.49
BEURRE SALE 454G|5.99|7.99
CHEDDAR VIEILLI 400G|5.99|8.49
YOGOURT GREC 750G|4.99|6.99
PAIN BLANC TRANCHE|2.49|3.99
BAGUETTE|1.89|2.99
PATES PENNE 900G|1.99|3.49
SAUCE SPAGHETTI 650ML|2.49|4.29
SIROP D'ERABLE 540ML|8.99|12.99
BEURRE D'ARACHIDE 1KG|5.99|8.99
POITRINE POULET DESOSSEE|7.99|13.99|0|kg
BOEUF HACHE MAIGRE|9.99|15.99|0|kg
BACON TRANCHE 500G|5.99|8.99
FRITES SURGELEES 750G|3.49|4.99
JUS D'ORANGE 1.75L|3.99|5.49
EAU EN BOUTEILLE 24PQ|3.99|5.99|T
BIERE 12 CANETTES|17.99|21.99|T
CROUSTILLES 220G|3.49|4.99|T
ESSUIE-TOUT 6 ROULEAUX|7.99|11.99|T
DETERGENT VAISSELLE 740ML|2.99|4.49|T
CAFE MOULU 925G|10.99|14.99
PAPIER HYGIENIQUE 12RL|9.99|13.99|T
POUTINE SURGELEE|5.99|7.99
TIRE D'ERABLE|3.99|5.99
""")

_items("grocery.uk", """
BANANAS LOOSE|0.69|1.29|0|kg
GALA APPLES 6PK|1.49|2.29
BROCCOLI|0.65|1.10
CHERRY TOMATOES 250G|0.99|1.79
CARROTS 1KG|0.45|0.95
MARIS PIPER POTATOES 2KG|1.65|2.85
SEMI SKIMMED MILK 2.27L|1.45|1.75
WHOLE MILK 4PT|1.55|1.95
FREE RANGE EGGS 12|2.20|3.40
BUTTER SALTED 250G|1.95|2.95
MATURE CHEDDAR 350G|2.50|3.90
GREEK STYLE YOGHURT 500G|1.00|1.95
WHITE SLICED LOAF 800G|0.95|1.45
CRUMPETS 6PK|0.65|1.20
PENNE PASTA 500G|0.55|1.25
PASTA SAUCE 500G|0.85|1.95
BAKED BEANS 4X400G|2.00|3.60
CHICKEN BREAST FILLETS 650G|3.50|5.50
BRITISH BEEF MINCE 500G|3.00|4.50
SMOKED BACON 300G|1.80|2.95
FROZEN CHIPS 1.5KG|1.99|3.19
ORANGE JUICE 1L|1.20|2.20
STILL WATER 6X2L|1.89|2.69|0
CHOCOLATE DIGESTIVES|0.95|1.55|T
READY SALTED CRISPS 6PK|1.50|2.30|T
KITCHEN ROLL 4PK|2.00|3.50|T
WASHING UP LIQUID|0.85|1.60|T
TEA BAGS 80S|1.50|3.30
BIN BAGS 20PK|1.75|2.90|T
HUMMUS 200G|1.00|1.70
""")

_items("grocery.mx", """
PLATANO TABASCO|18.50|26.90|0|kg
MANZANA GALA|39.90|59.90|0|kg
AGUACATE HASS|49.00|89.00|0|kg
JITOMATE SALADET|18.00|36.00|0|kg
CEBOLLA BLANCA|16.00|28.00|0|kg
LIMON SIN SEMILLA|22.00|44.00|0|kg
PAPA BLANCA|24.00|38.00|0|kg
LECHE ENTERA 1L|24.50|29.90
LECHE DESLACTOSADA 1L|27.50|33.90
HUEVO BLANCO 18 PZ|52.00|72.00
CREMA ACIDA 450ML|28.50|42.90
QUESO PANELA 400G|45.00|78.00
QUESO OAXACA 400G|68.00|112.00
YOGURT NATURAL 900G|34.00|52.00
PAN BLANCO GRANDE|36.00|49.00
TORTILLAS DE MAIZ 1KG|22.00|31.00
FRIJOL NEGRO 900G|27.00|41.00
ARROZ SUPER EXTRA 1KG|24.00|38.00
ACEITE VEGETAL 1L|42.00|64.00
PASTA ESPAGUETI 200G|7.50|12.50
SALSA CASERA 220G|14.00|23.00
ATUN EN AGUA 140G|16.50|24.50
PECHUGA DE POLLO|98.00|139.00|0|kg
CARNE MOLIDA DE RES|139.00|189.00|0|kg
CHORIZO 250G|36.00|58.00
JAMON DE PAVO 250G|45.00|68.00
JUGO DE NARANJA 1L|28.00|42.00
AGUA PURIFICADA 8L|22.00|36.00|T
REFRESCO COLA 3L|36.00|52.00|T
PAPAS FRITAS 170G|28.00|42.00|T
GALLETAS MARIAS|14.00|23.00|T
CAFE SOLUBLE 200G|88.00|139.00
PAPEL HIGIENICO 12 ROLLOS|62.00|98.00|T
DETERGENTE EN POLVO 2KG|68.00|112.00|T
JABON DE TOCADOR 3PZ|28.00|46.00|T
""")

_items("grocery.au", """
BANANAS CAVENDISH|2.90|4.90|0|kg
PINK LADY APPLES|4.50|6.90|0|kg
BROCCOLI|2.50|4.90|0|kg
CHERRY TOMATOES 250G|2.90|4.50
CARROTS 1KG|1.50|2.50
BRUSHED POTATOES 2KG|4.00|6.50
FULL CREAM MILK 2L|2.80|3.40
LITE MILK 3L|3.60|4.60
FREE RANGE EGGS 12PK|5.50|8.50
BUTTER SALTED 250G|4.50|6.50
TASTY CHEESE BLOCK 500G|6.50|9.50
GREEK YOGHURT 1KG|4.50|7.00
WHITE LOAF 650G|2.50|4.20
CRUMPETS 6PK|2.20|3.60
PENNE PASTA 500G|1.20|2.50
PASTA SAUCE 500G|2.50|4.50
VEGEMITE 380G|6.50|8.50
TIM TAM CHOCOLATE|3.00|4.50|T
LAMB CUTLETS|18.00|29.00|0|kg
BEEF MINCE 500G|6.50|9.50
BACON RASHERS 250G|4.50|7.50
FROZEN CHIPS 1KG|3.50|5.50
ORANGE JUICE 2L|3.50|5.50
SPRING WATER 24PK|4.50|7.50|T
POTATO CHIPS 175G|3.00|4.80|T
PAPER TOWELS 2PK|3.50|6.50|T
DISH LIQUID 500ML|2.80|4.50|T
GROUND COFFEE 200G|6.00|11.00
TOILET TISSUE 12PK|5.50|9.50|T
HUMMUS 200G|3.00|4.50
""")

_items("pharmacy.en", """
IBUPROFEN 200MG 50CT|6.99|11.99|T
ACETAMINOPHEN 500MG 100CT|7.49|12.99|T
ALLERGY RELIEF 30CT|9.99|19.99|T
VITAMIN D3 1000IU 120CT|7.99|14.99|T
MULTIVITAMIN ADULT 150CT|9.99|18.99|T
COUGH SYRUP 8OZ|6.49|10.99|T
BANDAGES ASSORTED 100CT|3.99|7.99|T
SUNSCREEN SPF50 8OZ|7.99|13.99|T
TOOTHPASTE 4.7OZ|2.99|5.99|T
MOUTHWASH 1L|5.99|8.99|T
SHAMPOO 12OZ|4.99|9.99|T
HAND SANITIZER|1.99|4.49|T
LIP BALM 2PK|2.99|4.99|T
COTTON ROUNDS 100CT|1.99|3.49|T
ELECTRIC TOOTHBRUSH|19.99|49.99|T
RX COPAY|4.00|35.00|0
""")

_items("pharmacy.uk", """
IBUPROFEN 200MG 16S|0.65|1.89|0
PARACETAMOL 500MG 32S|0.85|2.10|0
ALLERGY RELIEF 30S|3.00|7.99|0
VITAMIN D 1000IU 90S|3.49|8.99|0
MULTIVITAMINS 60S|3.99|9.99|T
COUGH SYRUP 150ML|3.50|6.99|0
PLASTERS ASSORTED 40|1.50|3.50|0
SUNCREAM SPF50 200ML|5.00|10.99|T
TOOTHPASTE 100ML|1.00|3.50|T
MOUTHWASH 500ML|2.00|4.50|T
SHAMPOO 400ML|2.00|5.50|T
HAND GEL 100ML|0.99|2.50|T
LIP BALM|1.49|3.99|T
COTTON PADS 100|1.00|2.40|T
MEAL DEAL|3.50|4.50
NHS PRESCRIPTION CHARGE|9.90|9.90|0
""")

_items("pharmacy.fr", """
IBUPROFENE 200MG 50|6.99|11.99|T
ACETAMINOPHENE 500MG 100|7.49|12.99|T
ANTIHISTAMINIQUE 30|9.99|19.99|T
VITAMINE D3 1000UI 120|7.99|14.99|T
MULTIVITAMINES 150|9.99|18.99|T
SIROP CONTRE LA TOUX 240ML|6.49|10.99|T
PANSEMENTS ASSORTIS 100|3.99|7.99|T
CREME SOLAIRE FPS50|7.99|13.99|T
DENTIFRICE 120ML|2.99|5.99|T
BAIN DE BOUCHE 1L|5.99|8.99|T
SHAMPOOING 355ML|4.99|9.99|T
DESINFECTANT MAINS|1.99|4.49|T
BAUME A LEVRES 2PQ|2.99|4.99|T
ROND DE COTON 100|1.99|3.49|T
BROSSE A DENTS ELECTRIQUE|19.99|49.99|T
ORDONNANCE|4.00|35.00|0
""")

_items("pharmacy.es", """
IBUPROFENO 400MG 20 TAB|38.00|79.00|0
PARACETAMOL 500MG 20 TAB|22.00|48.00|0
ANTIGRIPAL 12 TAB|49.00|98.00|0
VITAMINA C 1G 30 TAB|89.00|168.00|T
MULTIVITAMINICO 60 CAP|139.00|289.00|T
JARABE PARA LA TOS 120ML|68.00|124.00|0
CURITAS 20 PZ|18.00|39.00|T
PROTECTOR SOLAR FPS50|139.00|289.00|T
PASTA DENTAL 100ML|28.00|62.00|T
ENJUAGUE BUCAL 500ML|58.00|98.00|T
SHAMPOO 400ML|48.00|109.00|T
GEL ANTIBACTERIAL 250ML|28.00|58.00|T
SUERO ORAL 500ML|24.00|39.00|0
PANAL CHICO 40 PZ|139.00|229.00|T
TOALLA SANITARIA 10 PZ|24.00|52.00|T
RECETA SURTIDA|68.00|498.00|0
""")

_items("coffee.na", """
CAFE LATTE LG|3.95|5.75|T
CARAMEL MACCHIATO|4.95|6.45|T
ICED COFFEE MED|2.89|4.29|T
COLD BREW|3.95|5.25|T
AMERICANO|2.95|3.95|T
BREAKFAST SANDWICH|4.49|6.49|T
BAGEL CREAM CHEESE|2.99|4.49|T
BLUEBERRY MUFFIN|2.49|3.99|T
CHOCOLATE CHIP COOKIE|1.79|2.99|T
BOSTON CREAM DONUT|1.29|1.99|T
HASH BROWNS|1.19|1.99|T
TURKEY BACON WRAP|4.99|6.99|T
CHAI TEA LATTE|4.25|5.45|T
""")

_items("coffee.uk", """
FLAT WHITE REG|2.60|3.80|T
LATTE LRG|2.95|4.20|T
CAPPUCCINO|2.70|3.80|T
ICED AMERICANO|2.60|3.50|T
HOT CHOCOLATE|2.80|3.90|T
BACON ROLL|2.50|3.95|T
SAUSAGE BREAKFAST ROLL|1.90|3.50|T
CHICKEN & MAYO SANDWICH|2.75|4.10|T
CHEESE & ONION BAKE|1.45|2.10|T
VEGAN SAUSAGE ROLL|1.35|2.00|T
STEAK BAKE|1.65|2.20|T
CHOCOLATE BROWNIE|1.40|2.60|T
CROISSANT|1.10|2.20|T
""")

_items("coffee.fr", """
CAFE LATTE GRAND|3.95|5.75|T
CAFE GLACE MOYEN|2.89|4.29|T
CAPPUCCINO|3.45|4.75|T
THE CHAI|3.95|5.25|T
CHOCOLAT CHAUD|2.95|4.25|T
SANDWICH DEJEUNER|4.49|6.49|T
BAGEL FROMAGE A LA CREME|2.99|4.49|T
MUFFIN AUX BLEUETS|2.49|3.99|T
CROISSANT AU BEURRE|2.19|3.49|T
BEIGNE A LA CREME|1.29|1.99|T
GALETTE DE POMMES DE TERRE|1.19|1.99|T
""")

_items("coffee.es", """
CAFE AMERICANO GDE|42.00|65.00
LATTE MEDIANO|58.00|82.00
CAPUCHINO|55.00|78.00
FRAPPE DE CARAMELO|78.00|105.00
TE CHAI LATTE|62.00|88.00
SANDWICH DE JAMON Y QUESO|68.00|98.00
PAN DE ELOTE|34.00|52.00
CROISSANT DE MANTEQUILLA|38.00|58.00
GALLETA DE CHISPAS|28.00|42.00
MUFFIN DE ARANDANO|38.00|58.00
BAGEL CON QUESO CREMA|48.00|72.00
""")

_items("restaurant.na", """
SPINACH ARTICHOKE DIP|9.99|13.99|T
BONELESS WINGS|10.99|14.99|T
CAESAR SALAD|7.99|12.99|T
CHICKEN ALFREDO|15.99|20.99|T
FETTUCCINE|14.99|19.99|T
BBQ RIBS FULL RACK|22.99|29.99|T
CHEESEBURGER|12.99|16.99|T
GRILLED SALMON|18.99|26.99|T
STEAK 8OZ SIRLOIN|19.99|28.99|T
KIDS MAC & CHEESE|5.99|7.99|T
GARLIC BREADSTICKS|4.99|7.99|T
SOUP OF THE DAY|4.49|6.99|T
CHEESECAKE|6.99|9.99|T
ICED TEA|2.79|3.99|T
SODA REFILL|2.79|3.99|T
DRAFT BEER 16OZ|5.49|8.99|T
HOUSE RED WINE GLS|7.99|11.99|T
""")

_items("restaurant.uk", """
PERI-PERI CHICKEN WHOLE|12.75|16.95|T
HALF CHICKEN & 2 SIDES|9.95|12.95|T
CHICKEN WRAP|7.95|9.95|T
KATSU CURRY|11.50|14.50|T
RAMEN CHICKEN|11.95|14.95|T
GYOZA 6PC|5.95|7.50|T
FISH & CHIPS|11.95|15.95|T
SUNDAY ROAST|12.95|17.95|T
CAESAR SALAD|8.95|11.95|T
CHIPS REG|3.50|4.50|T
HOUSE SALAD|3.50|4.75|T
CHOCOLATE FUDGE CAKE|5.95|7.50|T
SPARKLING WATER 750ML|3.20|4.50|T
DRAUGHT LAGER PINT|4.80|6.90|T
HOUSE WHITE 175ML|5.50|7.95|T
KIDS MEAL|5.25|6.95|T
""")

_items("restaurant.fr", """
POUTINE CLASSIQUE|9.99|13.99|T
DEMI-POULET RTI|15.99|20.99|T
CLUB SANDWICH|12.99|16.99|T
SALADE CESAR|9.99|13.99|T
POITRINE DE POULET GRILLEE|14.99|19.99|T
COTES LEVEES BBQ|19.99|26.99|T
BURGER FROMAGE|12.99|16.99|T
SAUMON GRILLE|18.99|26.99|T
FILET DE BOEUF 6OZ|22.99|32.99|T
MENU ENFANT|6.99|8.99|T
SOUPE DU JOUR|4.49|6.99|T
TARTE AU SUCRE|5.99|8.99|T
GATEAU AU FROMAGE|6.99|9.99|T
THE GLACE|2.79|3.99|T
BIERE EN FUT 14OZ|5.99|8.99|T
VIN ROUGE VERRE|8.99|12.99|T
""")

_items("restaurant.es", """
TACOS AL PASTOR ORDEN|78.00|118.00
ENCHILADAS SUIZAS|128.00|178.00
CHILAQUILES VERDES|98.00|148.00
MOLE POBLANO|148.00|198.00
SOPA DE TORTILLA|68.00|98.00
GUACAMOLE CON TOTOPOS|98.00|148.00
ENSALADA CESAR|118.00|168.00
HAMBURGUESA CLASICA|138.00|198.00
ARRACHERA 250G|258.00|358.00
FAJITAS DE POLLO|168.00|238.00
CAFE DE OLLA|42.00|62.00
LIMONADA MINERAL|48.00|72.00
CERVEZA CLARA|58.00|88.00
MARGARITA|98.00|148.00
FLAN NAPOLITANO|68.00|98.00
AGUA MINERAL 600ML|38.00|52.00
""")

_items("restaurant.au", """
CHICKEN PARMIGIANA|22.00|29.90|T
FISH & CHIPS|19.00|26.90|T
BEEF BURGER|17.00|24.00|T
CAESAR SALAD|14.00|19.90|T
SCHNITZEL|20.00|27.00|T
RUMP STEAK 300G|28.00|39.00|T
FISH TACOS 3|16.00|22.00|T
BEEF BURRITO BOWL|12.50|16.50|T
CHIPS REG|5.50|8.50|T
GARDEN SALAD|7.00|10.00|T
BANOFFEE PIE|10.00|14.00|T
FLAT WHITE|4.20|5.20|T
LEMON LIME BITTERS|4.50|6.50|T
PINT TOOHEYS NEW|9.50|12.50|T
HOUSE SHIRAZ GLASS|9.50|13.50|T
KIDS NUGGETS & CHIPS|9.00|12.00|T
""")

_items("electronics.en", """
USB-C CABLE 6FT|9.99|24.99|T
WIRELESS MOUSE|14.99|59.99|T
HDMI CABLE 8FT|11.99|29.99|T
BLUETOOTH SPEAKER|29.99|129.99|T
NOISE CANCELLING HEADPHONES|149.99|399.99|T
USB FLASH DRIVE 128GB|14.99|29.99|T
PHONE CASE|14.99|49.99|T
LAPTOP 15.6IN|549.00|1499.00|T
TABLET 10.2IN|329.00|649.00|T
4K TV 55IN|399.00|1299.00|T
SOUNDBAR|149.00|499.00|T
WIFI ROUTER AX3000|99.00|249.00|T
MONITOR 27IN|179.00|449.00|T
PRINTER INK BLACK|24.99|49.99|T
SSD 1TB|69.00|149.00|T
SMART WATCH|199.00|449.00|T
PROTECTION PLAN 2YR|29.99|149.99|T
""")

_items("electronics.fr", """
CABLE USB-C 2M|9.99|24.99|T
SOURIS SANS FIL|14.99|59.99|T
CABLE HDMI 2.4M|11.99|29.99|T
HAUT-PARLEUR BLUETOOTH|29.99|129.99|T
ECOUTEURS ANTIBRUIT|149.99|399.99|T
CLE USB 128GO|14.99|29.99|T
ETUI DE TELEPHONE|14.99|49.99|T
ORDINATEUR PORTABLE 15.6PO|549.00|1499.00|T
TABLETTE 10.2PO|329.00|649.00|T
TELEVISEUR 4K 55PO|399.00|1299.00|T
BARRE DE SON|149.00|499.00|T
ROUTEUR WIFI AX3000|99.00|249.00|T
MONITEUR 27PO|179.00|449.00|T
CARTOUCHE D'ENCRE NOIRE|24.99|49.99|T
DISQUE SSD 1TO|69.00|149.00|T
MONTRE INTELLIGENTE|199.00|449.00|T
PLAN DE PROTECTION 2 ANS|29.99|149.99|T
""")

_items("electronics.es", """
CABLE USB-C 1.8M|149.00|389.00|T
MOUSE INALAMBRICO|199.00|899.00|T
CABLE HDMI 2M|179.00|459.00|T
BOCINA BLUETOOTH|499.00|2199.00|T
AUDIFONOS CON CANCELACION|1899.00|6499.00|T
MEMORIA USB 128GB|199.00|499.00|T
FUNDA PARA CELULAR|199.00|699.00|T
LAPTOP 15.6 PULGADAS|8999.00|24999.00|T
TABLETA 10.2 PULGADAS|4999.00|10999.00|T
PANTALLA 4K 55 PULGADAS|7499.00|19999.00|T
BARRA DE SONIDO|2499.00|7999.00|T
ROUTER WIFI AX3000|1499.00|3999.00|T
MONITOR 27 PULGADAS|2899.00|6999.00|T
CARTUCHO TINTA NEGRA|389.00|799.00|T
DISCO SSD 1TB|1199.00|2499.00|T
RELOJ INTELIGENTE|2999.00|7499.00|T
GARANTIA EXTENDIDA 2 ANOS|499.00|2499.00|T
""")

_items("hardware.en", """
2X4X8 STUD|3.48|6.98|T
PLYWOOD 3/4 4X8|42.98|79.98|T
DRYWALL SCREWS 1LB|6.98|12.98|T
INTERIOR PAINT 1GAL|24.98|54.98|T
PAINT BRUSH 2IN|4.98|12.98|T
ROLLER KIT 9IN|6.98|14.98|T
CORDLESS DRILL KIT|79.00|199.00|T
IMPACT DRIVER|89.00|179.00|T
CIRCULAR SAW|79.00|169.00|T
LED BULBS 8PK|8.98|17.98|T
EXTENSION CORD 25FT|14.98|29.98|T
WORK GLOVES|5.98|14.98|T
GARDEN HOSE 50FT|19.98|39.98|T
POTTING SOIL 2CF|7.98|12.98|T
CONCRETE MIX 60LB|5.48|8.98|T
CAULK SILICONE|4.98|9.98|T
TOOLBOX 22IN|19.98|44.98|T
LAWN MOWER 21IN|219.00|499.00|T
BATHROOM FAUCET|49.00|189.00|T
""")

_items("hardware.fr", """
MONTANT 2X4X8|3.48|6.98|T
CONTREPLAQUE 3/4 4X8|42.98|79.98|T
VIS A GYPSE 1LB|6.98|12.98|T
PEINTURE INTERIEURE 3.78L|24.98|54.98|T
PINCEAU 2PO|4.98|12.98|T
ENSEMBLE ROULEAU 9PO|6.98|14.98|T
PERCEUSE SANS FIL|79.00|199.00|T
VISSEUSE A PERCUSSION|89.00|179.00|T
SCIE CIRCULAIRE|79.00|169.00|T
AMPOULES DEL 8PQ|8.98|17.98|T
RALLONGE 7.6M|14.98|29.98|T
GANTS DE TRAVAIL|5.98|14.98|T
TUYAU D'ARROSAGE 15M|19.98|39.98|T
TERREAU 56L|7.98|12.98|T
MELANGE DE BETON 27KG|5.48|8.98|T
CALFEUTRAGE SILICONE|4.98|9.98|T
BOITE A OUTILS 22PO|19.98|44.98|T
TONDEUSE 21PO|219.00|499.00|T
ROBINET DE SALLE DE BAIN|49.00|189.00|T
""")

_items("hardware.es", """
POLIN 2X4X8|98.00|189.00|T
TRIPLAY 19MM 1.22X2.44|449.00|789.00|T
TORNILLOS PARA TABLAROCA 500G|68.00|129.00|T
PINTURA VINILICA 19L|899.00|1899.00|T
BROCHA 2 PULGADAS|28.00|89.00|T
KIT RODILLO 9 PULGADAS|69.00|179.00|T
TALADRO INALAMBRICO|899.00|2499.00|T
ATORNILLADOR DE IMPACTO|1199.00|2899.00|T
SIERRA CIRCULAR 7 1/4|999.00|2299.00|T
FOCOS LED 8 PZ|149.00|299.00|T
EXTENSION ELECTRICA 7M|119.00|289.00|T
GUANTES DE TRABAJO|39.00|139.00|T
MANGUERA 15M|249.00|499.00|T
TIERRA PARA MACETA 25L|79.00|149.00|T
CEMENTO GRIS 50KG|189.00|259.00|T
SELLADOR SILICON|69.00|149.00|T
CAJA DE HERRAMIENTAS 22 PULG|249.00|599.00|T
PODADORA ELECTRICA|2499.00|5999.00|T
MEZCLADORA PARA BANO|699.00|2499.00|T
""")

_items("department.en", """
WOMENS CREW TEE|9.99|24.99|T
MENS JEANS SLIM|24.99|59.99|T
KIDS HOODIE|14.99|29.99|T
COTTON SOCKS 6PK|7.99|14.99|T
BATH TOWEL SET|19.99|49.99|T
QUEEN SHEET SET|29.99|79.99|T
COMFORTER QUEEN|39.99|119.99|T
COFFEE MAKER 12CUP|29.99|89.99|T
NONSTICK PAN 10IN|12.99|34.99|T
DINNER PLATES 4PK|14.99|34.99|T
SCENTED CANDLE|6.99|19.99|T
THROW PILLOW|8.99|24.99|T
TABLE LAMP|24.99|69.99|T
SNEAKERS|34.99|99.99|T
BACKPACK|19.99|59.99|T
UMBRELLA|9.99|24.99|T
GIFT BAG LRG|2.99|5.99|T
LEGO SET|24.99|79.99|T
BOARD GAME|14.99|39.99|T
""")

_items("department.fr", """
T-SHIRT FEMME|9.99|24.99|T
JEAN HOMME COUPE ETROITE|24.99|59.99|T
CHANDAIL A CAPUCHE ENFANT|14.99|29.99|T
CHAUSSETTES COTON 6PR|7.99|14.99|T
ENSEMBLE DE SERVIETTES|19.99|49.99|T
ENSEMBLE DE DRAPS LIT DOUBLE|29.99|79.99|T
COUETTE LIT DOUBLE|39.99|119.99|T
CAFETIERE 12 TASSES|29.99|89.99|T
POELE ANTIADHESIVE 10PO|12.99|34.99|T
ASSIETTES 4PQ|14.99|34.99|T
CHANDELLE PARFUMEE|6.99|19.99|T
COUSSIN DECORATIF|8.99|24.99|T
LAMPE DE TABLE|24.99|69.99|T
BASKETS|34.99|99.99|T
SAC A DOS|19.99|59.99|T
PARAPLUIE|9.99|24.99|T
SAC CADEAU GRAND|2.99|5.99|T
JEU DE CONSTRUCTION|24.99|79.99|T
JEU DE SOCIETE|14.99|39.99|T
""")

_items("department.es", """
PLAYERA DAMA|149.00|349.00|T
JEANS CABALLERO CORTE SLIM|449.00|999.00|T
SUDADERA INFANTIL|249.00|549.00|T
CALCETINES ALGODON 6 PARES|99.00|229.00|T
JUEGO DE TOALLAS|349.00|899.00|T
JUEGO DE SABANAS MATRIMONIAL|499.00|1299.00|T
EDREDON MATRIMONIAL|699.00|1999.00|T
CAFETERA 12 TAZAS|499.00|1499.00|T
SARTEN ANTIADHERENTE 26CM|249.00|699.00|T
PLATOS HONDOS 4 PZ|249.00|599.00|T
VELA AROMATICA|99.00|329.00|T
COJIN DECORATIVO|149.00|429.00|T
LAMPARA DE MESA|449.00|1199.00|T
TENIS|599.00|1799.00|T
MOCHILA|349.00|999.00|T
PARAGUAS|149.00|399.00|T
BOLSA DE REGALO GDE|39.00|89.00|T
SET DE CONSTRUCCION|449.00|1399.00|T
JUEGO DE MESA|249.00|699.00|T
""")

_items("convenience.na", """
ENERGY DRINK 473ML|2.49|3.49|T
BOTTLED WATER 710ML|1.59|2.29|T
CHOCOLATE BAR|1.49|2.39|T
POTATO CHIPS 150G|2.49|3.99|T
HOT COFFEE 16OZ|1.69|2.79|T
HOT DOG|1.99|3.29|T
BREAKFAST WRAP|2.99|4.49|T
MILK 1L|2.29|3.49
LOTTERY QUICK PICK|2.00|10.00|0
GUM 12PK|1.79|2.99|T
BEEF JERKY 90G|4.99|7.99|T
ICE BAG 8LB|2.79|3.99|T
""")

_items("convenience.fr", """
BOISSON ENERGISANTE 473ML|2.49|3.49|T
EAU EN BOUTEILLE 710ML|1.59|2.29|T
BARRE DE CHOCOLAT|1.49|2.39|T
CROUSTILLES 150G|2.49|3.99|T
CAFE FILTRE 16OZ|1.69|2.79|T
HOT-DOG|1.99|3.29|T
WRAP DEJEUNER|2.99|4.49|T
LAIT 1L|2.29|3.49
LOTO-QUEBEC|2.00|10.00|0
GOMME 12PQ|1.79|2.99|T
BOEUF SEC 90G|4.99|7.99|T
SAC DE GLACE 3.6KG|2.79|3.99|T
""")

_items("convenience.es", """
REFRESCO COLA 600ML|18.00|24.00|T
AGUA NATURAL 1L|12.00|16.00|0
BARRA DE CHOCOLATE|14.00|24.00|T
PAPAS FRITAS 150G|24.00|34.00|T
CAFE AMERICANO 12OZ|22.00|32.00|T
HOT DOG|28.00|42.00|T
BURRITO DE FRIJOL|26.00|38.00|T
LECHE 1L|24.00|30.00|0
GALLETAS DE AVENA|14.00|22.00|T
CHICLES MENTOLADOS|8.00|14.00|T
BEBIDA ENERGETICA 473ML|28.00|42.00|T
BOLSA DE HIELO 5KG|32.00|44.00|T
CERVEZA CLARA 355ML|22.00|32.00|T
RECARGA TELEFONICA|50.00|200.00|0
""")

_items("convenience.au", """
ENERGY DRINK 500ML|3.50|4.90|T
WATER 600ML|2.50|3.50|0
CHOCOLATE BAR|2.20|3.20|T
CHIPS 175G|3.50|5.20|T
LARGE LATTE|4.00|5.00|T
HOT DOG|4.00|5.50|T
BREAKFAST WRAP|5.50|7.50|T
MILK 1L|2.30|3.10|0
MEAT PIE|4.50|6.00|T
LOTTO TICKET|10.00|30.00|0
SLUSHIE|2.50|4.00|T
ICE 5KG|5.00|7.00|T
""")

_items("discount.en", """
STORAGE BIN 27L|3.00|6.00|T
PLASTIC CUPS 50PK|1.25|3.00|T
BIRTHDAY CARD|1.25|3.00|T
GIFT WRAP ROLL|1.25|3.00|T
AA BATTERIES 8PK|4.00|7.00|T
CANDY BAG|1.25|3.00|T
NOTEBOOK 3PK|1.25|3.00|T
SCOTCH TAPE 4PK|1.25|3.00|T
PARTY BALLOONS 25PK|1.25|3.00|T
SPONGES 6PK|1.25|3.00|T
BAKING DISH|2.00|4.00|T
PHONE CHARGER|3.00|5.00|T
""")

# Fuel: grade names and price per unit (litre or gallon).
FUEL = {
    "US": dict(unit="GAL", grades=["REGULAR UNLEADED", "PLUS UNLEADED", "PREMIUM"], price=(3.059, 4.899), vol=(6.0, 21.5)),
    "CA_en": dict(unit="L", grades=["REGULAR", "MID-GRADE", "PREMIUM"], price=(1.499, 1.859), vol=(18.0, 66.0)),
    "CA_fr": dict(unit="L", grades=["ORDINAIRE", "SUPER", "PREMIUM"], price=(1.499, 1.859), vol=(18.0, 66.0)),
    "UK": dict(unit="L", grades=["UNLEADED", "SUPER UNLEADED", "DIESEL"], price=(1.329, 1.689), vol=(15.0, 62.0)),
    "MX": dict(unit="L", grades=["MAGNA", "PREMIUM", "DIESEL"], price=(23.89, 26.99), vol=(12.0, 48.0)),
    "AU": dict(unit="L", grades=["ULP 91", "PULP 95", "DIESEL"], price=(1.799, 2.399), vol=(14.0, 62.0)),
}

# ---------------------------------------------------------------------------------------------
# Places. All streets and numbers are invented.
# ---------------------------------------------------------------------------------------------

STREETS_EN = ["Main St", "Maple Ave", "Oak St", "Cedar Rd", "Elm St", "Park Ave", "Lake Blvd", "Mill Rd", "Hillcrest Dr", "Station Rd", "Church St", "Market St", "River Rd", "Highland Ave", "Sunset Blvd", "Washington St", "Bayview Dr"]
STREETS_FR = ["rue Sainte-Catherine", "boul. Saint-Laurent", "rue Principale", "ave du Parc", "boul. des Laurentides", "chemin Sainte-Foy", "rue Saint-Denis", "boul. Taschereau", "rue de la Gare", "ave Papineau", "boul. Henri-Bourassa", "rue Notre-Dame"]
STREETS_UK = ["High Street", "Station Road", "Church Lane", "Victoria Road", "Market Place", "Kings Road", "Park Street", "Queens Drive", "Mill Lane", "London Road", "Bridge Street", "Retail Park, Unit"]
STREETS_MX = ["Av. Insurgentes Sur", "Calle Reforma", "Blvd. Diaz Ordaz", "Av. Universidad", "Calzada de Tlalpan", "Av. Juarez", "Calle Hidalgo", "Av. Revolucion", "Blvd. Lopez Mateos", "Av. Vallarta", "Calle 5 de Mayo", "Av. Constituyentes"]
STREETS_AU = ["George St", "Pacific Hwy", "Station St", "High St", "Princes Hwy", "Oxford St", "Burke Rd", "Main Rd", "Sturt St", "Hay St", "Brisbane Rd", "Victoria Rd"]

US_PLACES = [
    ("Minneapolis", "MN", "554", 7.375), ("Columbus", "OH", "432", 7.5), ("Austin", "TX", "787", 8.25),
    ("Portland", "OR", "972", 0.0), ("Tampa", "FL", "336", 7.5), ("Denver", "CO", "802", 8.81),
    ("Raleigh", "NC", "276", 7.25), ("Phoenix", "AZ", "850", 8.6), ("Kansas City", "MO", "641", 8.475),
    ("Pittsburgh", "PA", "152", 7.0), ("Sacramento", "CA", "958", 8.75), ("Boise", "ID", "837", 6.0),
    ("Atlanta", "GA", "303", 8.9), ("Seattle", "WA", "981", 10.25), ("Albany", "NY", "122", 8.0),
    ("Madison", "WI", "537", 5.5), ("Nashville", "TN", "372", 9.25),
]

# province, city, postal first letters, tax scheme, language of the receipt
CA_PLACES = [
    ("Toronto", "ON", "M", "HST13", "en"), ("Ottawa", "ON", "K", "HST13", "en"),
    ("Vancouver", "BC", "V", "GSTPST7", "en"), ("Victoria", "BC", "V", "GSTPST7", "en"),
    ("Calgary", "AB", "T", "GST", "en"), ("Edmonton", "AB", "T", "GST", "en"),
    ("Winnipeg", "MB", "R", "GSTPST7", "en"), ("Halifax", "NS", "B", "HST15", "en"),
    ("Saskatoon", "SK", "S", "GSTPST6", "en"), ("Fredericton", "NB", "E", "HST15", "en"),
    ("Hamilton", "ON", "L", "HST13", "en"), ("Montreal", "QC", "H", "QC", "both"),
    ("Montréal", "QC", "H", "QC", "fr"), ("Québec", "QC", "G", "QC", "fr"),
    ("Laval", "QC", "H", "QC", "fr"), ("Gatineau", "QC", "J", "QC", "fr"),
    ("Sherbrooke", "QC", "J", "QC", "fr"), ("Trois-Rivières", "QC", "G", "QC", "fr"),
    ("Longueuil", "QC", "J", "QC", "fr"), ("Saint-Jérôme", "QC", "J", "QC", "fr"),
]

UK_PLACES = [
    ("LONDON", "EC1A", "020 7946"), ("MANCHESTER", "M1", "0161 496"), ("BIRMINGHAM", "B2", "0121 496"),
    ("LEEDS", "LS1", "0113 496"), ("GLASGOW", "G2", "0141 496"), ("BRISTOL", "BS1", "0117 496"),
    ("EDINBURGH", "EH2", "0131 496"), ("CARDIFF", "CF10", "029 2018"), ("NEWCASTLE", "NE1", "0191 498"),
    ("SHEFFIELD", "S1", "0114 496"), ("NOTTINGHAM", "NG1", "0115 496"), ("NORWICH", "NR2", "01632 960"),
]

MX_PLACES = [
    ("Ciudad de Mexico", "CDMX", "06"), ("Ciudad de Mexico", "CDMX", "03"), ("Guadalajara", "Jal.", "44"),
    ("Monterrey", "N.L.", "64"), ("Puebla", "Pue.", "72"), ("Queretaro", "Qro.", "76"),
    ("Merida", "Yuc.", "97"), ("Tijuana", "B.C.", "22"), ("Leon", "Gto.", "37"), ("Cancun", "Q. Roo", "77"),
    ("Toluca", "Edo. Mex.", "50"), ("Naucalpan", "Edo. Mex.", "53"),
]
MX_COLONIAS = ["Col. Centro", "Col. Del Valle", "Col. Roma Norte", "Col. Polanco", "Col. Americana", "Col. Condesa", "Col. Narvarte", "Col. Lindavista", "Col. Santa Fe", "Col. Cumbres"]

AU_PLACES = [
    ("SYDNEY", "NSW", "2000", "02"), ("MELBOURNE", "VIC", "3000", "03"), ("BRISBANE", "QLD", "4000", "07"),
    ("PERTH", "WA", "6000", "08"), ("ADELAIDE", "SA", "5000", "08"), ("HOBART", "TAS", "7000", "03"),
    ("CANBERRA", "ACT", "2600", "02"), ("PARRAMATTA", "NSW", "2150", "02"), ("GEELONG", "VIC", "3220", "03"),
    ("NEWCASTLE", "NSW", "2300", "02"), ("GOLD COAST", "QLD", "4217", "07"), ("FREMANTLE", "WA", "6160", "08"),
]

STAFF = ["ALEX", "MIA", "JORDAN", "SAM", "CHRIS", "PRIYA", "LUCAS", "SOFIA", "NOAH", "EMMA", "LIAM", "AVA", "OMAR", "NINA", "DIEGO", "ELENA", "HUGO", "MAYA"]


def items_for(locale_key, category):
    """Item rows for a market and a brand category; falls back to a shared English list."""
    family = {
        "US": "en", "CA_en": "en", "UK": "uk", "AU": "au", "CA_fr": "fr", "MX": "es",
    }[locale_key]
    grocery_key = {"US": "us", "CA_en": "ca_en", "CA_fr": "ca_fr", "UK": "uk", "MX": "mx", "AU": "au"}[locale_key]
    if category == "grocery":
        return _ITEMS["grocery." + grocery_key]
    if category == "pharmacy":
        return _ITEMS["pharmacy." + {"en": "en", "au": "en", "uk": "uk", "fr": "fr", "es": "es"}[family]]
    if category == "coffee":
        return _ITEMS["coffee." + {"en": "na", "au": "uk", "uk": "uk", "fr": "fr", "es": "es"}[family]]
    if category == "restaurant":
        return _ITEMS["restaurant." + {"en": "na", "au": "au", "uk": "uk", "fr": "fr", "es": "es"}[family]]
    if category == "electronics":
        return _ITEMS["electronics." + {"en": "en", "au": "en", "uk": "en", "fr": "fr", "es": "es"}[family]]
    if category == "hardware":
        return _ITEMS["hardware." + {"en": "en", "au": "en", "uk": "en", "fr": "fr", "es": "es"}[family]]
    if category == "department":
        return _ITEMS["department." + {"en": "en", "au": "en", "uk": "en", "fr": "fr", "es": "es"}[family]]
    if category == "convenience":
        return _ITEMS["convenience." + {"en": "na", "au": "au", "uk": "na", "fr": "fr", "es": "es"}[family]]
    if category == "discount":
        return _ITEMS["discount.en"]
    raise KeyError(category)
