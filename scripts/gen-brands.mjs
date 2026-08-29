#!/usr/bin/env node
/**
 * Generates the brand seed migration.
 *
 * Retailers, restaurants and subscriptions, plus the companies that bill you —
 * utilities, telecoms, insurers and lenders. The second group is here for the
 * same reason as the first: a logo is what someone recognises in a list, and
 * "AEP" is as much a brand as "Netflix".
 *
 * Columns: name | domain | category | country | rank | aliases(;-separated)
 * rank only breaks ties in search — daily-shop brands outrank niche ones so
 * "wal" surfaces Walmart before Walgreens.
 */
const DATA = `
# ---- Electricity and gas ----
AEP|aep.com|utilities|us|85|american electric power;aep ohio;aep texas
Duke Energy|duke-energy.com|utilities|us|85|duke
Dominion Energy|dominionenergy.com|utilities|us|75|dominion
Xcel Energy|xcelenergy.com|utilities|us|75|xcel
Con Edison|coned.com|utilities|us|75|coned;consolidated edison
PG&E|pge.com|utilities|us|80|pacific gas and electric;pacific gas
National Grid|nationalgrid.com|utilities|us|70|
FirstEnergy|firstenergycorp.com|utilities|us|65|first energy
Entergy|entergy.com|utilities|us|65|
DTE Energy|dteenergy.com|utilities|us|65|dte
Ameren|ameren.com|utilities|us|60|
Georgia Power|georgiapower.com|utilities|us|65|
Florida Power & Light|fpl.com|utilities|us|70|fpl;florida power and light
Southern California Edison|sce.com|utilities|us|70|sce;socal edison
PSE&G|pseg.com|utilities|us|65|pseg;public service enterprise
CenterPoint Energy|centerpointenergy.com|utilities|us|60|centerpoint
Eversource|eversource.com|utilities|us|65|
Consumers Energy|consumersenergy.com|utilities|us|60|
Alliant Energy|alliantenergy.com|utilities|us|50|alliant
APS|aps.com|utilities|us|55|arizona public service
Salt River Project|srpnet.com|utilities|us|50|srp
NV Energy|nvenergy.com|utilities|us|50|
Puget Sound Energy|pse.com|utilities|us|50|puget sound
ComEd|comed.com|utilities|us|65|commonwealth edison
PECO|peco.com|utilities|us|55|
BGE|bge.com|utilities|us|55|baltimore gas and electric
Pepco|pepco.com|utilities|us|55|
# ---- Water and waste ----
American Water|amwater.com|utilities|us|55|
Republic Services|republicservices.com|utilities|us|55|republic
Waste Management|wm.com|utilities|us|60|wm
# ---- Mobile ----
T-Mobile|t-mobile.com|telecom|us|95|tmobile;t mobile
Verizon|verizon.com|telecom|us|95|verizon wireless
AT&T|att.com|telecom|us|95|at&t;atandt
Mint Mobile|mintmobile.com|telecom|us|60|mint
Cricket Wireless|cricketwireless.com|telecom|us|60|cricket
Boost Mobile|boostmobile.com|telecom|us|55|boost
Metro by T-Mobile|metrobyt-mobile.com|telecom|us|55|metro pcs;metropcs
Google Fi|fi.google.com|telecom|us|50|
Visible|visible.com|telecom|us|45|
UScellular|uscellular.com|telecom|us|45|us cellular
Straight Talk|straighttalk.com|telecom|us|45|
# ---- Internet and TV ----
Xfinity|xfinity.com|telecom|us|90|comcast
Spectrum|spectrum.com|telecom|us|85|charter
Cox|cox.com|telecom|us|70|cox communications
Optimum|optimum.com|telecom|us|60|altice
Frontier|frontier.com|telecom|us|60|frontier communications
CenturyLink|centurylink.com|telecom|us|60|lumen
Starlink|starlink.com|telecom|both|55|
Google Fiber|fiber.google.com|telecom|us|45|
Astound Broadband|astound.com|telecom|us|40|rcn;wave
WOW!|wowway.com|telecom|us|40|wide open west
Windstream|windstream.com|telecom|us|40|kinetic
# ---- Insurance ----
GEICO|geico.com|insurance|us|90|
State Farm|statefarm.com|insurance|us|90|
Progressive|progressive.com|insurance|us|85|
Allstate|allstate.com|insurance|us|80|
USAA|usaa.com|insurance|us|75|
Liberty Mutual|libertymutual.com|insurance|us|70|
Nationwide|nationwide.com|insurance|us|65|
Farmers Insurance|farmers.com|insurance|us|65|farmers
Travelers|travelers.com|insurance|us|60|
American Family|amfam.com|insurance|us|55|amfam
Lemonade|lemonade.com|insurance|us|45|
Root|joinroot.com|insurance|us|40|root insurance
# ---- Banking and loans ----
Chase|chase.com|finance|us|90|jpmorgan chase
Bank of America|bankofamerica.com|finance|us|90|bofa
Wells Fargo|wellsfargo.com|finance|us|85|
Capital One|capitalone.com|finance|us|85|
Discover|discover.com|finance|us|80|
American Express|americanexpress.com|finance|us|85|amex
Citi|citi.com|finance|us|80|citibank
Ally|ally.com|finance|us|60|ally bank
SoFi|sofi.com|finance|us|60|
Synchrony|synchrony.com|finance|us|55|synchrony bank
Navient|navient.com|finance|us|55|
Nelnet|nelnet.com|finance|us|55|
MOHELA|mohela.com|finance|us|50|
Aidvantage|aidvantage.com|finance|us|50|
# ---- Video and television ----
Netflix|netflix.com|entertainment|both|95|
Disney+|disneyplus.com|entertainment|both|85|disney plus;disney
Hulu|hulu.com|entertainment|us|80|
HBO Max|hbomax.com|entertainment|us|80|max;hbo
Peacock|peacocktv.com|entertainment|us|70|
Paramount+|paramountplus.com|entertainment|both|70|paramount plus
Sling TV|sling.com|entertainment|us|55|
Fubo|fubo.tv|entertainment|both|50|fubotv
Philo|philo.com|entertainment|us|40|
STARZ|starz.com|entertainment|both|50|
AMC+|amcplus.com|entertainment|both|45|amc plus
BritBox|britbox.com|entertainment|both|40|
Crunchyroll|crunchyroll.com|entertainment|both|55|
Discovery+|discoveryplus.com|entertainment|both|50|discovery plus
ESPN+|espn.com|entertainment|us|60|espn plus
DAZN|dazn.com|entertainment|both|45|
Crave|crave.ca|entertainment|ca|60|
CBC Gem|gem.cbc.ca|entertainment|ca|45|cbc gem premium;cbc gem
STACKTV|stacktv.ca|entertainment|ca|45|stack tv
TSN+|tsn.ca|entertainment|ca|45|tsn plus
Sportsnet+|sportsnet.ca|entertainment|ca|45|sportsnet plus
illico+|illico.tv|entertainment|ca|30|illico
Hayu|hayu.com|entertainment|both|30|
# ---- Music, podcasts, audiobooks ----
Spotify|spotify.com|entertainment|both|95|
YouTube|youtube.com|entertainment|both|80|youtube premium;youtube tv;youtube music
SiriusXM|siriusxm.com|entertainment|both|60|sirius
Audible|audible.com|news|both|70|
Tidal|tidal.com|entertainment|both|40|
Pandora|pandora.com|entertainment|us|45|
iHeartRadio|iheart.com|entertainment|both|40|iheart
SoundCloud|soundcloud.com|entertainment|both|35|soundcloud go+;soundcloud
Pocket Casts|pocketcasts.com|entertainment|both|25|pocket casts plus;pocket casts
# ---- Gaming ----
Xbox|xbox.com|entertainment|both|75|xbox game pass;game pass;xbox
PlayStation|playstation.com|entertainment|both|75|playstation plus;ps plus;playstation
Nintendo|nintendo.com|entertainment|both|70|nintendo switch online;nintendo
EA|ea.com|entertainment|both|50|ea play
Ubisoft|ubisoft.com|entertainment|both|40|ubisoft+;ubisoft plus
NVIDIA GeForce NOW|nvidia.com|entertainment|both|40|geforce now
Roblox|roblox.com|entertainment|both|55|roblox premium;roblox
Fortnite|fortnite.com|entertainment|both|45|fortnite crew;fortnite
Discord|discord.com|entertainment|both|55|discord nitro;discord
# ---- Software, cloud and security ----
Google|one.google.com|software|both|75|google one;google play pass
Microsoft|microsoft.com|software|both|75|microsoft 365;office 365;office
Dropbox|dropbox.com|software|both|60|
Adobe|adobe.com|software|both|70|adobe creative cloud;adobe
Canva|canva.com|software|both|65|canva pro;canva
Notion|notion.so|software|both|55|
Evernote|evernote.com|software|both|35|
Grammarly|grammarly.com|software|both|50|
ChatGPT|openai.com|software|both|80|openai
Claude|claude.ai|software|both|70|anthropic
GitHub|github.com|software|both|55|
1Password|1password.com|software|both|55|one password
Dashlane|dashlane.com|software|both|35|
NordVPN|nordvpn.com|software|both|55|nord
ExpressVPN|expressvpn.com|software|both|50|express vpn
Surfshark|surfshark.com|software|both|40|
Proton|proton.me|software|both|45|protonmail
Norton|norton.com|software|both|45|
McAfee|mcafee.com|software|both|45|
Malwarebytes|malwarebytes.com|software|both|35|
Zoom|zoom.us|software|both|60|
DocuSign|docusign.com|software|both|40|
# ---- Shopping and delivery memberships ----
Sam's Club|samsclub.com|memberships|us|65|sams club
Instacart|instacart.com|memberships|both|60|instacart+;instacart
Uber|uber.com|memberships|both|65|uber one;uber
DoorDash|doordash.com|memberships|both|65|doordash dashpass;dashpass;doordash
Grubhub|grubhub.com|memberships|us|45|grubhub+;grubhub
Shipt|shipt.com|memberships|us|40|
PC Express|pcexpress.ca|memberships|ca|40|pc express pass;pc express
# ---- Fitness and wellness ----
Planet Fitness|planetfitness.com|fitness|both|75|
LA Fitness|lafitness.com|fitness|both|60|
Anytime Fitness|anytimefitness.com|fitness|both|60|
YMCA|ymca.net|fitness|both|55|
Orangetheory|orangetheory.com|fitness|both|50|orange theory
Crunch Fitness|crunch.com|fitness|both|45|crunch
Equinox|equinox.com|fitness|both|45|
GoodLife Fitness|goodlifefitness.com|fitness|ca|60|goodlife
Fit4Less|fit4less.ca|fitness|ca|45|fit 4 less
F45|f45training.com|fitness|both|40|f45 training
Peloton|onepeloton.com|fitness|both|65|
Fitbit|fitbit.com|fitness|both|45|fitbit premium;fitbit
Strava|strava.com|fitness|both|50|
ClassPass|classpass.com|fitness|both|45|class pass
Calm|calm.com|fitness|both|55|
Headspace|headspace.com|fitness|both|55|
MyFitnessPal|myfitnesspal.com|fitness|both|50|myfitnesspal premium;myfitnesspal
Noom|noom.com|fitness|both|45|
# ---- News, books and education ----
The New York Times|nytimes.com|news|both|75|nyt;new york times
The Wall Street Journal|wsj.com|news|both|65|wsj
The Washington Post|washingtonpost.com|news|us|60|wapo
USA Today|usatoday.com|news|us|45|
The Athletic|theathletic.com|news|both|45|athletic
The Globe and Mail|theglobeandmail.com|news|ca|50|globe and mail
Toronto Star|thestar.com|news|ca|45|
National Post|nationalpost.com|news|ca|45|
Financial Post|financialpost.com|news|ca|35|
Everand|everand.com|news|both|30|scribd
Medium|medium.com|news|both|40|
Substack|substack.com|news|both|45|
Coursera|coursera.org|news|both|45|coursera plus;coursera
MasterClass|masterclass.com|news|both|45|master class
LinkedIn|linkedin.com|news|both|55|linkedin premium;linkedin
Duolingo|duolingo.com|news|both|60|
Chegg|chegg.com|news|both|40|
# ---- Meal kits and food plans ----
HelloFresh|hellofresh.com|meals|both|70|hello fresh
Factor|factor75.com|meals|both|50|factor 75
Home Chef|homechef.com|meals|us|50|
EveryPlate|everyplate.com|meals|both|45|every plate
Green Chef|greenchef.com|meals|both|40|
Blue Apron|blueapron.com|meals|us|45|
Hungryroot|hungryroot.com|meals|us|40|
CookUnity|cookunity.com|meals|us|35|cook unity
Chef's Plate|chefsplate.com|meals|ca|45|chefs plate
Goodfood|makegoodfood.ca|meals|ca|45|good food
Fresh Prep|freshprep.ca|meals|ca|35|
# ---- Social and dating ----
Tinder|tinder.com|software|both|60|
Bumble|bumble.com|software|both|55|
Hinge|hinge.co|software|both|55|
Match|match.com|software|both|40|
eHarmony|eharmony.com|software|both|35|e harmony
Snapchat|snapchat.com|software|both|55|snapchat+;snapchat
Reddit|reddit.com|software|both|50|reddit premium;reddit
X|x.com|software|both|50|x premium;twitter blue;twitter
# ---- Home, vehicle and pet memberships ----
AAA|aaa.com|transport|us|65|triple a
CAA|caa.ca|transport|ca|60|
OnStar|onstar.com|transport|both|45|on star
Tesla|tesla.com|transport|both|45|tesla premium connectivity;tesla
Ring|ring.com|home|both|55|ring protect;ring
Nest|nest.com|home|both|50|nest aware;nest
Arlo|arlo.com|home|both|40|arlo secure;arlo
SimpliSafe|simplisafe.com|home|both|45|simpli safe
ADT|adt.com|home|both|50|
BarkBox|barkbox.com|pets|both|45|bark box
# ---- General and online shopping ----
Amazon|amazon.com|shopping|both|99|amzn;amazon.ca;amazon music unlimited;amazon music;amazon prime;prime;kindle unlimited;kindle;amazon prime video;prime video
Walmart|walmart.com|shopping|both|98|wal mart;wm supercenter;walmart+;walmart plus;walmart pharmacy
Costco|costco.com|shopping|both|95|costco membership;costco pharmacy
Target|target.com|shopping|us|92|
eBay|ebay.com|shopping|both|65|
Etsy|etsy.com|shopping|both|60|
Temu|temu.com|shopping|both|60|
SHEIN|shein.com|clothing|both|60|
AliExpress|aliexpress.com|shopping|both|45|ali express
Dollar General|dollargeneral.com|shopping|us|70|
Dollar Tree|dollartree.com|shopping|both|65|
Five Below|fivebelow.com|shopping|us|50|
Canadian Tire|canadiantire.ca|shopping|ca|80|canadian tire gas;ct gas
Giant Tiger|gianttiger.com|shopping|ca|55|
Dollarama|dollarama.com|shopping|ca|75|
# ---- Grocery, United States ----
Kroger|kroger.com|groceries|us|85|kroger pharmacy
Albertsons|albertsons.com|groceries|us|70|
Safeway|safeway.com|groceries|both|75|safeway canada
Publix|publix.com|groceries|us|80|publix pharmacy
Aldi|aldi.us|groceries|both|80|
Trader Joe's|traderjoes.com|groceries|us|80|trader joes
Whole Foods Market|wholefoodsmarket.com|groceries|both|80|whole foods
H-E-B|heb.com|groceries|us|70|heb
Meijer|meijer.com|groceries|us|65|
Wegmans|wegmans.com|groceries|us|65|
Food Lion|foodlion.com|groceries|us|60|
Stop & Shop|stopandshop.com|groceries|us|60|stop and shop
Giant Food|giantfood.com|groceries|us|55|
Giant Eagle|gianteagle.com|groceries|us|55|
ShopRite|shoprite.com|groceries|us|60|shop rite
WinCo Foods|wincofoods.com|groceries|us|50|winco
Sprouts Farmers Market|sprouts.com|groceries|us|55|sprouts
Hy-Vee|hy-vee.com|groceries|us|55|hyvee
Harris Teeter|harristeeter.com|groceries|us|55|
Ralphs|ralphs.com|groceries|us|55|
Fred Meyer|fredmeyer.com|groceries|us|55|
Smith's|smithsfoodanddrug.com|groceries|us|45|smiths
Mariano's|marianos.com|groceries|us|45|marianos
QFC|qfc.com|groceries|us|40|
Jewel-Osco|jewelosco.com|groceries|us|50|jewel osco
Vons|vons.com|groceries|us|50|
Piggly Wiggly|pigglywiggly.com|groceries|us|35|
# ---- Grocery, Canada ----
Loblaws|loblaws.ca|groceries|ca|85|
No Frills|nofrills.ca|groceries|ca|85|nofrills
Real Canadian Superstore|realcanadiansuperstore.ca|groceries|ca|80|superstore
Your Independent Grocer|yourindependentgrocer.ca|groceries|ca|55|independent
Zehrs|zehrs.ca|groceries|ca|55|
Fortinos|fortinos.ca|groceries|ca|50|
Provigo|provigo.ca|groceries|ca|55|
Maxi|maxi.ca|groceries|ca|55|
Atlantic Superstore|atlanticsuperstore.ca|groceries|ca|45|
T&T Supermarket|tntsupermarket.com|groceries|ca|55|t and t
Sobeys|sobeys.com|groceries|ca|80|
FreshCo|freshco.com|groceries|ca|70|fresh co
Foodland|foodland.ca|groceries|ca|50|
Farm Boy|farmboy.ca|groceries|ca|55|
IGA|iga.net|groceries|ca|60|
Metro|metro.ca|groceries|ca|75|
Food Basics|foodbasics.ca|groceries|ca|65|
Super C|superc.ca|groceries|ca|55|
Longo's|longos.com|groceries|ca|50|longos
Save-On-Foods|saveonfoods.com|groceries|ca|65|save on foods
PriceSmart Foods|pricesmartfoods.ca|groceries|ca|35|
Urban Fare|urbanfare.com|groceries|ca|30|
Thrifty Foods|thriftyfoods.com|groceries|ca|45|
Co-op|crs.coop|groceries|ca|45|coop
Calgary Co-op|calgarycoop.com|groceries|ca|40|calgary coop
NorthMart|northmart.ca|groceries|ca|25|north mart
# ---- Pharmacies and health ----
CVS|cvs.com|pharmacy|us|85|cvs pharmacy
Walgreens|walgreens.com|pharmacy|us|85|
Shoppers Drug Mart|shoppersdrugmart.ca|pharmacy|ca|85|shoppers
Rexall|rexall.ca|pharmacy|ca|65|
Jean Coutu|jeancoutu.com|pharmacy|ca|60|
Pharmasave|pharmasave.com|pharmacy|ca|45|
London Drugs|londondrugs.com|pharmacy|ca|55|
# ---- Home and hardware ----
The Home Depot|homedepot.com|home|both|90|home depot
Lowe's|lowes.com|home|both|85|lowes
Ace Hardware|acehardware.com|home|both|60|ace
Menards|menards.com|home|us|60|
Harbor Freight|harborfreight.com|home|us|55|
Tractor Supply|tractorsupply.com|home|us|55|
RONA|rona.ca|home|ca|65|
Home Hardware|homehardware.ca|home|ca|60|
IKEA|ikea.com|home|both|75|
Wayfair|wayfair.com|home|both|60|
HomeSense|homesense.com|home|both|55|home sense
Bed Bath & Beyond|bedbathandbeyond.com|home|both|45|bed bath and beyond
# ---- Clothing and footwear ----
Macy's|macys.com|clothing|us|70|macys
Nordstrom|nordstrom.com|clothing|both|60|
Kohl's|kohls.com|clothing|us|65|kohls
JCPenney|jcpenney.com|clothing|us|50|jc penney
Old Navy|oldnavy.com|clothing|both|70|
Gap|gap.com|clothing|both|60|
Banana Republic|bananarepublic.com|clothing|both|50|
H&M|hm.com|clothing|both|70|h and m;hm
Zara|zara.com|clothing|both|70|
Uniqlo|uniqlo.com|clothing|both|60|
TJ Maxx|tjmaxx.com|clothing|us|70|tjmaxx
Marshalls|marshalls.com|clothing|both|65|
Ross|rossstores.com|clothing|us|65|ross dress for less
Burlington|burlington.com|clothing|us|55|
Winners|winners.ca|clothing|ca|70|
Aritzia|aritzia.com|clothing|ca|60|
Lululemon|lululemon.com|clothing|both|70|lulu
Nike|nike.com|clothing|both|80|
Adidas|adidas.com|clothing|both|70|
Foot Locker|footlocker.com|clothing|both|55|
Levi's|levi.com|clothing|both|55|levis
# ---- Electronics and office ----
Best Buy|bestbuy.com|electronics|both|85|bestbuy
Apple|apple.com|electronics|both|85|apple store;apple;apple tv+;apple tv plus;apple music;apple podcasts;apple arcade;icloud+;icloud;apple fitness+;apple fitness plus;apple news+;apple news plus
Staples|staples.com|electronics|both|65|
GameStop|gamestop.com|electronics|both|55|game stop
Micro Center|microcenter.com|electronics|us|50|
Canada Computers|canadacomputers.com|electronics|ca|45|
Memory Express|memoryexpress.com|electronics|ca|40|
# ---- Beauty and personal care ----
Sephora|sephora.com|beauty|both|75|
Ulta Beauty|ulta.com|beauty|us|70|ulta
Bath & Body Works|bathandbodyworks.com|beauty|both|60|bath and body works
Sally Beauty|sallybeauty.com|beauty|both|45|
Lush|lush.com|beauty|both|50|
MAC Cosmetics|maccosmetics.com|beauty|both|50|mac
# ---- Pet stores ----
PetSmart|petsmart.com|pets|both|70|pet smart
Petco|petco.com|pets|us|65|petco vital care;vital care
Chewy|chewy.com|pets|us|65|
Pet Valu|petvalu.ca|pets|ca|55|petvalu
Ren's Pets|renspets.com|pets|ca|40|rens pets
Global Pet Foods|globalpetfoods.com|pets|ca|35|
# ---- Convenience and fuel ----
7-Eleven|7-eleven.com|fuel|both|80|7 eleven;seven eleven
Circle K|circlek.com|fuel|both|75|
Shell|shell.com|fuel|both|85|
Exxon|exxon.com|fuel|us|75|
Mobil|mobil.com|fuel|us|70|exxonmobil
Chevron|chevron.com|fuel|us|75|
BP|bp.com|fuel|both|70|
Sunoco|sunoco.com|fuel|us|55|
Speedway|speedway.com|fuel|us|55|
Wawa|wawa.com|fuel|us|60|
Sheetz|sheetz.com|fuel|us|55|
QuikTrip|quiktrip.com|fuel|us|55|qt
Casey's|caseys.com|fuel|us|50|caseys
Petro-Canada|petro-canada.ca|fuel|ca|75|petro canada
Esso|esso.ca|fuel|ca|75|
Irving|irvingoil.com|fuel|ca|55|irving oil
# ---- Food merchants ----
McDonald's|mcdonalds.com|dining|both|95|mcdonalds;mc donalds;mcd
Starbucks|starbucks.com|dining|both|95|
Subway|subway.com|dining|both|80|
Tim Hortons|timhortons.com|dining|ca|92|tims;tim horton
Dunkin'|dunkindonuts.com|dining|us|80|dunkin;dunkin donuts
Taco Bell|tacobell.com|dining|both|80|
Chick-fil-A|chick-fil-a.com|dining|us|85|chick fil a;chickfila
Wendy's|wendys.com|dining|both|80|wendys
Burger King|bk.com|dining|both|80|bk
Chipotle|chipotle.com|dining|both|80|
Domino's|dominos.com|dining|both|75|dominos
Pizza Hut|pizzahut.com|dining|both|70|
KFC|kfc.com|dining|both|75|kentucky fried chicken
Popeyes|popeyes.com|dining|both|70|
Panera Bread|panerabread.com|dining|us|65|panera
A&W|aw.com|dining|both|65|a and w

`;

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const q = (s) => (s === null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);

const rows = DATA.split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((line) => {
    const [name, domain, category, country, rank, aliases] = line.split('|');
    const list = (aliases || '')
      .split(';')
      .map((a) => a.trim())
      .filter(Boolean);
    return { id: slug(name), name, domain, category, country, rank: Number(rank) || 0, list };
  });

const seen = new Set();
for (const r of rows) {
  if (seen.has(r.id)) throw new Error(`duplicate slug: ${r.id} (${r.name})`);
  seen.add(r.id);
}

const values = rows
  .map(
    (r) =>
      `  (${q(r.id)}, ${q(r.name)}, ${q(r.domain)}, ` +
      `array[${r.list.map(q).join(', ')}]::text[], ` +
      `${q(r.category)}, ${q(r.country)}, ${r.rank})`,
  )
  .join(',\n');

const sql = `-- Brand catalog sync
--
-- ${rows.length} brands: US and Canadian retailers, restaurants and
-- subscription services, plus the utilities, telecoms, insurers and lenders
-- that send bills. Generated, not hand-written — see scripts/gen-brands.mjs.
--
-- One row per brand. Sub-brands that would share a parent's logo (Walmart+,
-- Costco Pharmacy, Apple Music) are folded into the parent and survive as
-- search aliases, so nothing becomes unfindable.
--
-- This is a sync, not an append: anything no longer in the script is deleted,
-- so folding a brand away actually removes it. receipts.brand_id and
-- subscriptions.brand_id are "on delete set null", so saved rows keep their
-- merchant text and simply lose the enrichment.

delete from public.brands where id <> all (array[
${rows.map((r) => `  ${q(r.id)}`).join(',\n')}
]::text[]);

insert into public.brands (id, name, domain, aliases, category_id, country, rank) values
${values}
on conflict (id) do update
  set name        = excluded.name,
      domain      = excluded.domain,
      aliases     = excluded.aliases,
      category_id = excluded.category_id,
      country     = excluded.country,
      rank        = excluded.rank;
`;

process.stdout.write(sql);
process.stderr.write(`\n${rows.length} brands generated\n`);
