# Pro page, leaving offer and delete account: copy to match the new Terms and Privacy (draft, 2026-10-13)

Draft by Mia (Marketing). DRAFT FILE ONLY: no source file was touched. Dana implements after the Pro files are committed by the other session. Founder said "all as recommended" (via Jay).

Sources read: `src/i18n/messages/pro.ts`, `src/i18n/messages/settings.ts`, `src/app/pro.tsx`, `src/app/pro-offer.tsx`, `src/app/(tabs)/settings.tsx`, `src/data/pro-features.ts`, `src/app/pro-feature.tsx`, `src/components/settings/use-money-counts.ts`, `src/components/ui/confirm-dialog.tsx`, `src/app/(tabs)/cards.tsx`; with `.claude/team/dev/legal-draft-terms.md`, `legal-draft-privacy.md`, `legal-facts-2026-10-13.md`.

How to read:
- Each key has: where it shows, the current en / es / fr, the new en / es / fr, and a one-line why. "Now" is copied from the files as they are in the working tree today.
- `{price}`, `{held}`, `{monthly}`, `{yearly}` are the app's own placeholders, kept as they are.
- `> ALT:` lines are for a pending decision or a later change. The recommended text is always first.
- British spelling in English ("greyed out", "cancelled"). The app's curly apostrophe is used in English strings.

Words matched to the app's existing copy:
- "Skip Pro" is never translated (en, es, fr).
- Cancel: en "cancel / cancelled"; es "cancelar, lo canceles"; fr "annuler, tu l’annules".
- Subscriptions: en "App Store subscriptions"; es "suscripciones del App Store"; fr "abonnements de l’App Store". Button: "Manage in the App Store" / "Administrar en el App Store" / "Gérer dans l’App Store" (`pro.page.manage`).
- Pro page says "borra / supprime" for deleting things; the account-deletion flow says "elimina / supprime". I kept each place's own word.
- Features: es "Entrada por voz", "Análisis" (Insights), "Hábitos de gasto", "préstamos", "ahorros", "metas"; fr "Saisie vocale", "Aperçu" (Insights), "Habitudes de dépense", "prêts", "épargne", "objectifs".
- es uses "tú"; fr uses "tu". Spanish "agregar" (not "añadir") in the account flow.

---

## 1) Pro page and Settings pitch (L13, L14, L18)

### Rows to remove from the Pro table

These two rows show in the Free-against-Pro table on the Pro page (`src/app/pro.tsx`, `ROWS`, lines 71-72). Neither feature is built. Remove the keys, the two `ROWS` entries, and the `Sparkles` and `Headphones` imports.

#### `pro.compare.early` — DELETE
- Shows: Pro page table, row "New features first". Also read aloud through `pro.compare.row`.
- Now en: New features first
- Now es: Novedades primero
- Now fr: Nouveautés en avant-première
- New: none.
- Why: not built (fact sheet, "Skip Pro", last bullet). The Terms (section 6) leave it out on purpose.

#### `pro.compare.support` — DELETE
- Shows: Pro page table, row "Priority support".
- Now en: Priority support
- Now es: Soporte prioritario
- Now fr: Assistance prioritaire
- New: none.
- Why: not built. Support is the same address for everyone.

### Nothing is deleted

#### `pro.history.b`
- Shows: "See further back" explainer (opened from a locked history door), second of three points, with an archive icon.
- Now en: Nothing is ever deleted
- Now es: Nada se borra nunca
- Now fr: Rien n’est jamais supprimé
- New en: Nothing is deleted if Pro ends
- New es: Nada se borra si Pro termina
- New fr: Rien n’est supprimé si Pro finit
- Why: "ever" is false once the 7-year rule is on (records go after 7 years on any plan). This says only what stays true, and copies the shape of the old "Nothing locked if Pro ends" line. "When Pro ends" (the CEO version) is equally true; I chose "if" because it is gentler on a selling page, and it is shorter.

### Cards and accounts when Pro ends

#### `pro.unlimited.c`
- Shows: "Add them all" explainer (opened from the second card or account), the second point. Today it has an open-padlock icon (`LockOpen`, `src/data/pro-features.ts`).
- Now en: Nothing locked if Pro ends
- Now es: Nada se bloquea si Pro termina
- Now fr: Rien n’est bloqué si Pro finit
- New en (today's truth): Extras are kept but greyed out if Pro ends
- New es: Los extras se guardan, pero en gris, si Pro termina
- New fr: Les autres sont conservés mais grisés si Pro finit
- Why: today the extra cards and accounts go greyed out and tapping one opens the Skip Pro page instead of the card. Same facts as Terms section 11 ("kept, greyed out, can't be opened"). The screen-reader label on the Cards tab already says "locked on the free plan"; both words are true, and I used "greyed out" to match the Terms. "Extras" works because the line above it says "Free keeps one card and one account". French "les autres" follows that same subtitle.

> ALT (after L17, if lapsed people can open and delete them):
> - en: Extras can still be opened and deleted if Pro ends
> - es: Los extras se pueden abrir y eliminar si Pro termina
> - fr: Tu peux ouvrir et supprimer les autres si Pro finit
> - Check before using it: this line says nothing about picking them for new spending. If that stays blocked, Terms section 11 still needs that sentence. Re-read what L17 actually ships.

Two things for Dana on this point:
- The open padlock now shows next to "greyed out", which pulls the other way. Swap the icon for something neutral, such as `Archive` (kept). Design call.
- Test `src/data/pro-features.test.ts:66` and `src/__tests__/app/pro-feature.test.tsx:78` read the old text.

### "Upload any bill"

#### `pro.compare.upload`
- Shows: Pro page table, row 2 (file-up icon). Free: "Limited". Pro: tick. Read aloud as "Upload receipts: Free, Limited. Pro, included."
- Now en: Upload any bill
- Now es: Sube cualquier factura
- Now fr: Importe tes factures
- New en: Upload receipts
- New es: Sube recibos
- New fr: Importe tes reçus
- Why: an upload is a photo from Photos or an image or PDF from Files, and it becomes a receipt (fact sheet, "Scanning and uploads"). The row below already says "Scan receipts" / "Escanea recibos" / "Numérise tes reçus", so the two now match. Bills are typed, never uploaded; loan statement upload is not built.
- Optional, code not copy: the Pro cell of this row is a tick while "Scan receipts" says "Unlimited". Uploads are unlimited on Pro (`pro.scan.a`: "Unlimited scans and uploads"), so `pro: unlimited` would match. Dana's call; the spoken text becomes "Upload receipts: Free, Limited. Pro, Unlimited."

### Settings pitch

#### `settings.pro.pitch`
- Shows: Settings, "Skip Pro" row subtitle for people without Pro. `{monthly}` and `{yearly}` are whole price labels such as "$1.99/mo".
- Now en: Unlimited everything, {monthly} or {yearly}
- Now es: Todo ilimitado, {monthly} o {yearly}
- Now fr: Tout en illimité, {monthly} ou {yearly}
- New en: Voice, Insights and more, {monthly} or {yearly}
- New es: Entrada por voz, Análisis y más, {monthly} o {yearly}
- New fr: Saisie vocale, Aperçu et plus encore, {monthly} ou {yearly}
- Why: "Unlimited everything" is false against 15 scans, 15 uploads, one card and 90 days on Free, and history on Pro is 7 years, not unlimited. Voice and Insights are Pro-only features nobody gets on Free (fact sheet), so naming them is safe, and "and more" does not claim a number. About the same length as before (47 against 43 characters in English).

> ALT (names the limits that lift): en "More cards, scans and history, {monthly} or {yearly}" / es "Más tarjetas, escaneos e historial, {monthly} o {yearly}" / fr "Plus de cartes, de scans et d’historique, {monthly} ou {yearly}".

- Test `src/__tests__/app/settings.test.tsx:143` reads the old text.

---

## 2) Leaving offer (L8, L19): `src/app/pro-offer.tsx`

How the screen reads after the changes, top to bottom: badge, title, struck regular price, the offer price with "/year", the per-month line, timer, what is included, then (footer) the buy button, the billing lines, "If you close this…", "No thanks".

#### `pro.offer.titleSpecial`
- Shows: offer title when the store's offer price is NOT about half the regular yearly price (or the half check cannot pass).
- Now en: Skip Pro, a one-time price
- Now es: Skip Pro a un precio único
- Now fr: Skip Pro à un prix unique
- New en: Skip Pro, a special yearly price
- New es: Skip Pro a un precio anual especial
- New fr: Skip Pro à un prix annuel spécial
- Why: "one-time price" reads as pay once, and the plan renews every year.

#### `pro.offer.title` — KEEP as it is
- Shows: offer title when the offer price is within 5% of half the regular yearly price (`isHalf`), or the store has said nothing and the dollar fallbacks are drawn.
- en: Skip Pro, half price / es: Skip Pro a mitad de precio / fr: Skip Pro à moitié prix
- Why it stays: honest only while the offer RENEWS at the price shown. If App Store Connect shows the offer is an introductory price that goes back to the regular price after the first year, "half price" is true for one year only. See the ALT at the end of this section. This is the one thing in section 2 that depends on a fact I could not see (Terms checks, item 1, and fact sheet: "Renewal price to confirm in App Store Connect").

#### `pro.offer.wasPrice`
- Shows: screen-reader label only, on the struck-through regular price. Sighted people see the number with a line through it and no words.
- Now en: Was {price}
- Now es: Antes {price}
- Now fr: Avant {price}
- New en: Usually {price} a year
- New es: Normalmente {price} al año
- New fr: Habituellement {price} par an
- Why: "Was" says the price has changed for good; "Usually … a year" says it is the regular yearly price and this is the exception. `{price}` is the store's regular yearly price string.
- For Dana and the CEO: because the words reach only VoiceOver, a sighted person sees a bare struck-through number. A small visible "Usually $19.99 a year" beside or under it would make the claim honest on screen too. The same key can be used as the visible text. I'd do this; it is a layout change, so it is the CEO's call.
- The key name `wasPrice` can stay (no ripple), or become `pro.offer.usualPrice`.

#### `pro.offer.renews` — NEW
- Shows: new line under the buy button, in the footer of the offer screen.
- New en: Renews at {price} a year until you cancel.
- New es: Se renueva a {price} al año hasta que lo canceles.
- New fr: Se renouvelle à {price} par an jusqu’à ce que tu l’annules.
- Why: the Terms (section 9 ALT) need the offer to show its renewal price. Wording follows the existing small print `pro.page.renews` ("Renews automatically until you cancel…"), so the two lines agree.
- `{price}` is the same `price` as the buy button (`product.priceString`), true only if the offer renews at that price (see the ALT below).
- Suggestions for Dana:
  - Show it only when `product` exists (the store has answered). Until then the screen draws a dollar fallback, and a made-up price must not sit on a renewal line.
  - Draw it at the 12px of the other billing line, not the 10.5px small print. Marcus flagged the 10.5px renewal line; this one is the price a person is agreeing to.
  - It overlaps `pro.page.billedYearly` ("Billed once a year. Cancel anytime."), which sits in the same spot. Recommended: on this screen show `pro.offer.renews` INSTEAD of `billedYearly` (leave `billedYearly` on the Pro page). That keeps the footer from gaining a line, and "until you cancel" already says you can stop. If the CEO wants both, both are true.

#### `pro.offer.badge`
- Shows: the outlined pill above the title.
- Now en: ONE-TIME OFFER
- Now es: OFERTA ÚNICA
- Now fr: OFFRE UNIQUE
- New en: ONE-TIME CHANCE
- New es: OPORTUNIDAD ÚNICA
- New fr: OCCASION UNIQUE
- Why: with a price on the screen, "offer" invites "pay once". "Chance" ties "one-time" to the opportunity, not to the payment. With the new title, "/year" and the renewal line, keeping "ONE-TIME OFFER" would also be acceptable; I recommend the change because the badge is the first thing read.
- Width: "OPORTUNIDAD ÚNICA" is five characters longer than "OFERTA ÚNICA". The pill wraps at large text sizes; check it at the largest size.

> ALT (smallest change): keep "ONE-TIME OFFER" / "OFERTA ÚNICA" / "OFFRE UNIQUE". Readable with the other changes, but the pay-once reading is still possible.

#### `pro.offer.once` — checked, NO change
- Shows: with the info icon, under the billing lines.
- en: If you close this, you won’t see this offer again. / es: Si cierras esto, no volverás a ver esta oferta. / fr: Si tu fermes cette page, tu ne reverras plus cette offre.
- Why it stays: it is about seeing the offer, not about paying once. The code makes the claim before the screen opens, so closing it is final. It still reads right beside the new badge and title.

Also checked, no change needed: `pro.offer.perMonth` ("That’s just {price} a month."; the yearly price stays the biggest figure on the screen), `pro.offer.endsWhen`, `pro.offer.ended`, `pro.offer.includes` and its four lines, `pro.page.renews`, `pro.page.getYearly` ("Get Pro for {price}/year").

> ALT (only if the offer is an introductory price that renews at the regular price): two changes, written for the case the Founder sees "regular price after year one" in App Store Connect.
> - `pro.offer.title` becomes: en "Skip Pro, half price for the first year" / es "Skip Pro a mitad de precio el primer año" / fr "Skip Pro à moitié prix la première année". (`titleSpecial` can say "a special first-year price" / "a un precio especial el primer año" / "à un prix spécial la première année".)
> - `pro.offer.renews` becomes: en "Then {regular} a year until you cancel." / es "Después, {regular} al año hasta que lo canceles." / fr "Ensuite, {regular} par an jusqu’à ce que tu l’annules." with `{regular}` the regular yearly price string.
> - Terms section 9 would then say the offer renews at the regular price, not "its yearly price".

---

## 3) Delete account (L9, L15): `settings.delete.*`, `src/app/(tabs)/settings.tsx` lines 116-165

### What the screen can count today

The tally in `handleDeleteAccount` reads the whole lists (not the 90-day window), so the counts are right on Free too.

| What the Founder wants covered | In the count list today | Could be counted | Recommended |
|---|---|---|---|
| cards | yes (`counts.cards`) | | count |
| accounts | yes (`counts.accounts`) | | count |
| bills | yes (`counts.bills`) | | count |
| subscriptions | yes | | count |
| receipts (habit days are receipts) | yes | | count |
| recorded charges | yes | | count |
| salaries | yes (`salarySources`) | | count |
| one-off pay | yes (`oneOffPays`) | | count |
| loans | no | `useLoans(today)` is exported. Each loan also sits behind a bill row, so it is already inside the bills count (Dana or Dmitri to confirm) | closing line |
| spending habits | no | `useHabits()` is exported but lists only habits not archived, so a count would be too low | closing line |
| goals | no | `useGoals().goals` is exported but lists only open goals | closing line |
| savings | no | `useSavingsCore().pots` is exported but includes removed pots, so it needs filtering | closing line |
| receipt books | no | `useReceiptBooks()` is exported | closing line |
| card payments | no | `usePayments` in `queries.ts` is private | closing line |
| pay history (pay received) | no | no count hook | closing line |

Recommendation: keep the eight counts as they are and add a closing "everything else" line. Reasons:
- Counting loans, habits, goals, savings, books, card payments and pay too would make the sentence about 370 characters, which is a wall in a dialog.
- Four of those counts would be too low (archived habits, closed goals, removed pots), and a count that is too low on a delete screen is worse than none.
- "Everything else you added" is true for all of them and for anything added later. The named examples are the pages people think of as separate: loans, savings, goals, spending habits.

Coverage of the Founder's list with the new wording: cards, accounts, bills, subscriptions, receipts, recorded charges, salaries and one-off pay are counted. Loans, savings, goals and spending habits are named. Receipt books, card payments and pay history are inside "everything else".

#### `settings.delete.held`
- Shows: first dialog "Delete your account?", the message, when at least one count is above zero. `{held}` is the comma list such as "1 card, 2 bank accounts".
- Now en: This removes {held} — everything Skip holds for you. It cannot be undone.
- Now es: Esto elimina {held}: todo lo que Skip guarda para ti. No se puede deshacer.
- Now fr: Cela supprime {held} — tout ce que Skip conserve pour toi. C’est irréversible.
- New en: This removes your account and everything you added. That includes {held}, and everything else, such as loans, savings, goals and spending habits. It cannot be undone.
- New es: Esto elimina tu cuenta y todo lo que agregaste. Incluye {held}, y todo lo demás, como préstamos, ahorros, metas y hábitos de gasto. No se puede deshacer.
- New fr: Cela supprime ton compte et tout ce que tu as ajouté. Cela comprend {held}, et tout le reste, comme les prêts, l’épargne, les objectifs et les habitudes de dépense. C’est irréversible.
- Why: "everything Skip holds for you" is too wide. A few records outside your account stay (crash reports, Apple's and RevenueCat's records; Privacy policy section 9). "Everything you added" is exactly what goes. Three short sentences, one idea each. No dash.

> ALT (if the Founder wants every item named, longer): replace "and everything else, such as loans, savings, goals and spending habits" with "and also your pay history, loans, savings, goals, spending habits, receipt books and card payments". es: "y también tu historial de pagos, préstamos, ahorros, metas, hábitos de gasto, libros de recibos y pagos de tarjeta". fr: "et aussi ton historique de paie, tes prêts, ton épargne, tes objectifs, tes habitudes de dépense, tes carnets de reçus et tes paiements de carte". About 90 characters longer.

#### `settings.delete.nothingHeld`
- Shows: same dialog when every count is zero.
- Now en: This removes your account and everything Skip holds for you. It cannot be undone.
- Now es: Esto elimina tu cuenta y todo lo que Skip guarda para ti. No se puede deshacer.
- Now fr: Cela supprime ton compte et tout ce que Skip conserve pour toi. C’est irréversible.
- New en: This removes your account and everything you added to Skip. It cannot be undone.
- New es: Esto elimina tu cuenta y todo lo que agregaste a Skip. No se puede deshacer.
- New fr: Cela supprime ton compte et tout ce que tu as ajouté dans Skip. C’est irréversible.
- Why: same reason as `held`. This case is also reached by someone with only loans, habits or savings, so it must not say they have nothing.

#### `settings.delete.finalMessage`
- Shows: the second dialog, "Delete everything, for good?".
- Now en: There is no way back from here, and no copy kept.
- Now es: No hay vuelta atrás y no se guarda ninguna copia.
- Now fr: Il n’y a pas de retour en arrière, et aucune copie n’est conservée.
- New en: There is no way back from here. A few records outside Skip, such as crash reports, can stay. Our Privacy policy lists them.
- New es: No hay vuelta atrás. Unos pocos registros fuera de Skip, como los informes de fallos, pueden quedarse. Nuestra política de privacidad los enumera.
- New fr: Il n’y a pas de retour en arrière. Quelques traces hors de Skip, comme les rapports de plantage, peuvent rester. Notre politique de confidentialité les énumère.
- Why: not asked, but it is the same contradiction. "No copy kept" clashes with the Privacy draft (crash reports, RevenueCat, logo votes, emails already sent, hosting backups until they expire). Apple's guidance is to say what is kept. "Crash reports" and the pointer to the Privacy policy match Terms section 15 word for word.

> ALT (shortest, if the Founder does not want a second paragraph in the final dialog): en "There is no way back from here. Skip cannot restore it." / es "No hay vuelta atrás. Skip no puede restaurarlo." / fr "Il n’y a pas de retour en arrière. Skip ne peut pas le restaurer." This drops the "outside Skip" sentence and would leave that to Privacy policy section 9 only.

### Warning for Skip Pro subscribers

A new dialog, shown BEFORE the counts dialog, only when `usePro().pro` is true. Order: warning, counts, final. Someone who goes to cancel first does not have to read the counts twice.

Buttons (the dialog supports up to three choices plus a way out, `confirm-dialog.tsx`; with two or more choices they stack):
1. `pro.page.manage` (existing key): Manage in the App Store. The first choice is the filled pill, so the safe one is first. Not red.
2. `settings.delete.proContinue` (new): Continue to delete. Outlined. Goes on to the counts dialog.
3. Way out: `settings.delete.keep` (existing): Keep my account.

"Manage in the App Store" opens https://apps.apple.com/account/subscriptions (the same address and the same label as the Pro page, `pro.tsx` line 234, with `Linking.openURL`; not `openBrowserAsync`, which is for the coffee page). It ends this delete attempt; the person comes back to Settings and taps Delete account again, or taps "Continue to delete" instead. The label matches Terms section 10 ("Manage in the App Store").

#### `settings.delete.proTitle` — NEW
- en: Cancel Skip Pro first?
- es: ¿Cancelar Skip Pro primero?
- fr: Annuler Skip Pro d’abord ?
- Why: a question, like the other two dialog titles ("Delete your account?", "Delete everything, for good?"). It names the action.

#### `settings.delete.proMessage` — NEW
- en: Deleting your account does not cancel Skip Pro. Apple keeps billing you until you cancel. Cancel it in your App Store subscriptions first. If you have already cancelled, you can go on.
- es: Eliminar tu cuenta no cancela Skip Pro. Apple sigue cobrándote hasta que lo canceles. Cancélalo primero en tus suscripciones del App Store. Si ya lo cancelaste, puedes continuar.
- fr: Supprimer ton compte n’annule pas Skip Pro. Apple continue de te facturer jusqu’à ce que tu l’annules. Annule-le d’abord dans tes abonnements de l’App Store. Si tu l’as déjà annulé, tu peux continuer.
- Why: four sentences, one idea each, calm. The last sentence is there on purpose: the app only knows "Pro is on", not "Pro is on and will renew". Someone who has cancelled but is still inside the period they paid for also has Pro on, and the warning must not tell them something false. (If Dana wants to hide the warning for them, the `entitlements` row has `will_renew`; the phone does not read it today. CEO decision.) Matches the Privacy draft (`deleting.note2`) and Terms section 15, so the "Skip reminds you before you delete" gate in the Privacy draft can be lifted once this ships.

#### `settings.delete.proContinue` — NEW
- en: Continue to delete
- es: Continuar y eliminar
- fr: Continuer la suppression
- Why: the plain "Continue" would be unclear beside a "Manage" button. Not red here; the red "Continue" and "Delete everything" come in the next two dialogs.

---

## Keys to delete

- `pro.compare.early`
- `pro.compare.support`

Also in code: remove the two `ROWS` entries and the `Sparkles` and `Headphones` imports in `src/app/pro.tsx`.

## New keys

- `pro.offer.renews`
- `settings.delete.proTitle`
- `settings.delete.proMessage`
- `settings.delete.proContinue`

Reused with no change: `pro.page.manage` (button), `settings.delete.keep` (way out), `settings.delete.title`, `settings.delete.finalTitle`, `settings.delete.everything`.

## Values changed (same key)

`pro.history.b`, `pro.unlimited.c`, `pro.compare.upload`, `settings.pro.pitch`, `pro.offer.titleSpecial`, `pro.offer.wasPrice`, `pro.offer.badge`, `settings.delete.held`, `settings.delete.nothingHeld`, `settings.delete.finalMessage`.

---

## Tests and other copy that read the old text (for Dana and the CEO)

Tests that assert the old strings:
- `src/__tests__/app/pro.test.tsx:95` ("Upload any bill: Free, Limited. Pro, included."), `:102-103` (the two rows)
- `src/__tests__/app/pro-feature.test.tsx:78` and `src/data/pro-features.test.ts:66` ("Nothing locked if Pro ends")
- `src/__tests__/app/pro-offer.test.tsx:206` ("Skip Pro, a one-time price")
- `src/__tests__/app/settings.test.tsx:143` ("Unlimited everything…")
- `src/__tests__/app/faq-languages.test.tsx:169` ("first-in-line support") if the FAQ below is changed

Other copy that contradicts the same facts (outside this task; the Ask Sam session said it would update its own answers):
- `src/lib/ask-sam/knowledge/pro-settings.ts`: line 78 ("New features first and priority support"), 568 ("Unlimited everything"), 836 ("a one-time price"), 1124-1145 (a whole entry on priority support and new features first), 756 ("Nothing is deleted…", check against the 7-year rule), and `eval/held-out-habits-pro.ts:348`.
- `src/lib/ask-sam/knowledge/pay-cards.ts:2190` (extra cards and accounts after Pro ends; check it says greyed out and cannot be opened).

## Found while reading (not asked; for the CEO to route)

These are in `src/i18n/messages/faq.ts` and are the same claims, so I drafted them while the facts were in front of me.

#### `faq.pro.include.a`
- Now en: Unlimited credit cards and accounts, unlimited receipt scans and uploads, Voice entry, Insights, seven years of history, early access to new features and first-in-line support. {monthly} a month or {yearly} a year, billed by Apple.
- New en: Unlimited credit cards and accounts, unlimited receipt scans and uploads, Voice entry, Insights and seven years of history. {monthly} a month or {yearly} a year, billed by Apple.
- New es: Tarjetas de crédito y cuentas sin límite, escaneos y subidas de recibos sin límite, entrada por voz, Análisis y siete años de historial. {monthly} al mes o {yearly} al año, cobrados por Apple.
- New fr: Cartes de crédit et comptes en nombre illimité, numérisations et imports de reçus illimités, saisie vocale, Aperçu et sept ans d’historique. {monthly} par mois ou {yearly} par an, facturés par Apple.
- Why: drops "early access" and "first-in-line support" (not built). It also leaves out spending habits and export, which the Pro table does include; adding them is a separate edit.

#### `faq.pro.cancelled.a`
- Now en: Nothing is deleted — ever. Every credit card, account and balance keeps working exactly as it was. Until Pro returns you cannot add past the free allowance, and lists show the last 90 days (older entries are kept, just out of view).
- New en: Nothing is deleted if Pro ends. Your first credit card and first bank account keep working. Any others stay in Skip, greyed out, and still count in your balances, but you cannot open them until Pro returns. You also cannot add past the free allowance, and lists show the last 90 days (older entries are kept, just out of view).
- New es: Nada se borra si Pro termina. Tu primera tarjeta de crédito y tu primera cuenta bancaria siguen funcionando. Las demás se quedan en Skip, en gris, y siguen contando en tus saldos, pero no puedes abrirlas hasta que Pro regrese. Tampoco puedes agregar más allá del límite gratis, y las listas muestran los últimos 90 días (lo anterior se guarda, solo que no se ve).
- New fr: Rien n’est supprimé si Pro finit. Ta première carte de crédit et ton premier compte bancaire continuent de fonctionner. Les autres restent dans Skip, grisés, et comptent toujours dans tes soldes, mais tu ne peux pas les ouvrir tant que Pro n’est pas de retour. Tu ne peux pas non plus ajouter au-delà de la limite gratuite, et les listes affichent les 90 derniers jours (le reste est conservé, simplement masqué).
- Why: "Nothing is deleted — ever" and "every card keeps working exactly as it was" are both false today. If L17 lands, this answer changes too.

Smaller things I noticed, no text proposed:
- `pro.history.subtitle` ("Older entries are kept, not lost.") and `pro.history.notice.title` ("Older history is saved"): fine for the 90-day window, but the 7-year rule means old entries are not kept for ever. If you want it exact: "Older entries are hidden, not lost." / "Lo anterior se oculta, no se pierde." / "L’ancien est masqué, pas perdu."
- `pro.history.c` ("Balances always add up"): the fact sheet asks Drew to check that balances do not shift when 7-year-old rows are deleted. Until he has, "always" is a strong word.
- `pro.voice.c` ("Your voice is never stored"): true of Skip. When the phone cannot recognise speech itself, the audio goes to Apple's servers (fact sheet, "Voice"). Dmitri or Marcus to confirm it still reads right next to the Privacy policy.

## Open questions

1. Does the one-time offer renew at the price it shows? (Decides `pro.offer.title`, `pro.offer.renews` and Terms section 9; ALT written.) Dmitri to confirm in App Store Connect.
2. Visible "Usually $X a year" on the offer screen, or leave `wasPrice` as a screen-reader label only? Layout call.
3. `pro.offer.renews`: show it instead of "Billed once a year. Cancel anytime." on the offer screen (recommended), or as an extra line?
4. Should the subscriber warning be hidden for people who already cancelled (needs `will_renew` on the phone), or stay for every Pro account with the "if you have already cancelled" line (written that way)?
5. What exactly does L17 let lapsed people do? The ALT for `pro.unlimited.c` and Terms section 11 depend on it.
6. Icon for the "Add them all" second point: the open padlock no longer fits.
7. Badge: "ONE-TIME CHANCE" (recommended) or keep "ONE-TIME OFFER"?
8. Spanish and French are written by me to match the app's existing tone and terms. They have not had a native read; the i18n playbook (`.claude/team/dev/i18n-playbook.md`) may want a review pass before release.
