import { defineMessages } from '@/i18n/translate';

/**
 * The common questions: a title, then a question (.q) and its answer (.a) per entry. The place
 * names an answer gives ("Settings → Support") follow the names the screens carry.
 */
export const faqMessages = defineMessages({
  'faq.title': {
    en: 'Common questions',
    es: 'Preguntas frecuentes',
    fr: 'Questions fréquentes',
  },
  'faq.intro': {
    en: 'Short answers to the things people ask. If yours is not here, message us — a person reads every one.',
    es: 'Respuestas cortas a lo que la gente pregunta. Si la tuya no está aquí, escríbenos: una persona lee cada mensaje.',
    fr: 'Des réponses courtes aux questions les plus fréquentes. Si la tienne n’y est pas, écris-nous — une vraie personne lit chaque message.',
  },
  'faq.stuck': {
    en: 'Still stuck? Message us',
    es: '¿Sigues con dudas? Escríbenos',
    fr: 'Toujours pas de réponse ? Écris-nous',
  },
  'faq.hint.show': {
    en: 'Shows the answer',
    es: 'Muestra la respuesta',
    fr: 'Affiche la réponse',
  },
  'faq.hint.hide': {
    en: 'Collapses the answer',
    es: 'Oculta la respuesta',
    fr: 'Masque la réponse',
  },

  'faq.start.title': {
    en: 'Getting started',
    es: 'Primeros pasos',
    fr: 'Premiers pas',
  },
  'faq.start.bank.q': {
    en: 'Why doesn’t Skip connect to my bank?',
    es: '¿Por qué Skip no se conecta con mi banco?',
    fr: 'Pourquoi Skip ne se connecte-t-il pas à ma banque ?',
  },
  'faq.start.bank.a': {
    en: 'On purpose. Skip never asks for bank credentials, so there is no login to leak and no third party reading your transactions. You tell Skip what happened — by scanning a receipt, or typing a bill once — and everything it knows stays between you and your own account. Your bank never knows Skip exists.',
    es: 'A propósito. Skip nunca pide credenciales bancarias, así que no hay ningún acceso que pueda filtrarse ni ningún tercero que lea tus movimientos. Tú le cuentas a Skip lo que pasó, ya sea escaneando un recibo o escribiendo una factura una sola vez, y todo lo que sabe se queda entre tú y tu propia cuenta. Tu banco nunca se entera de que Skip existe.',
    fr: 'C’est voulu. Skip ne demande jamais d’identifiants bancaires, donc il n’y a aucun accès qui puisse fuir ni aucun tiers qui lise tes transactions. C’est toi qui dis à Skip ce qui s’est passé — en numérisant un reçu ou en saisissant une facture une seule fois — et tout ce qu’elle sait reste entre toi et ton propre compte. Ta banque ne saura jamais que Skip existe.',
  },
  'faq.start.card.q': {
    en: 'Can I get the Getting started card back?',
    es: '¿Puedo recuperar la guía “Primeros pasos”?',
    fr: 'Puis-je récupérer le guide « Premiers pas » ?',
  },
  'faq.start.card.a': {
    en: 'Yes — Settings → Support → Getting started puts it back on Home. It only stays while there is something left to do; once all five steps are done it leaves on its own.',
    es: 'Sí: Ajustes → Soporte → Primeros pasos la vuelve a poner en Inicio. Solo se queda mientras haya algo por hacer; cuando los cinco pasos están completos, se va sola.',
    fr: 'Oui — Réglages → Assistance → Premiers pas le remet sur Accueil. Il ne reste que tant qu’il y a encore quelque chose à faire ; une fois les cinq étapes terminées, il disparaît de lui-même.',
  },
  'faq.start.first.q': {
    en: 'What should I set up first?',
    es: '¿Qué debo configurar primero?',
    fr: 'Que dois-je configurer en premier ?',
  },
  'faq.start.first.a': {
    en: 'Your pay, under Cards → Salary. Left this month, savings and Insights all start from what comes in. The Getting Started card on Home walks you through the rest — a credit card, a bank account, your bills and subscriptions.',
    es: 'Tu salario, en Tarjetas → Salario. “Te queda este mes”, los ahorros y Análisis se calculan a partir de lo que entra. La guía “Primeros pasos” en Inicio te acompaña con lo demás: una tarjeta de crédito, una cuenta bancaria, tus facturas y tus suscripciones.',
    fr: 'Ta paie, sous Cartes → Salaire. « Reste ce mois-ci », l’épargne et Aperçu se calculent à partir de ce qui entre. Le guide « Premiers pas » sur Accueil t’accompagne pour le reste — une carte de crédit, un compte bancaire, tes factures et tes abonnements.',
  },

  'faq.money.title': {
    en: 'Your money',
    es: 'Tu dinero',
    fr: 'Ton argent',
  },
  'faq.money.left.q': {
    en: 'How does “Left this month” work?',
    es: '¿Cómo funciona “Te queda este mes”?',
    fr: 'Comment fonctionne « Reste ce mois-ci » ?',
  },
  'faq.money.left.a': {
    en: 'Your pay for a month, minus the bills and subscriptions due in it. It is a forecast — what the month looks like from here. What you actually kept shows up in Savings once the month is over.',
    es: 'Tu salario del mes, menos las facturas y suscripciones que vencen en él. Es un pronóstico: cómo se ve el mes desde ahora. Lo que realmente conservaste aparece en Ahorros cuando el mes termina.',
    fr: 'Ta paie du mois, moins les factures et les abonnements qui arrivent à échéance durant ce mois. C’est une prévision — ce à quoi le mois ressemble à partir de maintenant. Ce que tu as réellement gardé apparaît dans Épargne une fois le mois terminé.',
  },
  'faq.money.savings.q': {
    en: 'How do savings months work?',
    es: '¿Cómo funcionan los meses de ahorro?',
    fr: 'Comment fonctionnent les mois d’épargne ?',
  },
  'faq.money.savings.a': {
    en: 'When a month ends, Skip adds up what came in and everything recorded going out — bills, subscriptions, receipts — and whatever is left becomes that month’s saving. A month that overspent counts against the total, because pretending it saved zero would make the total a lie.',
    es: 'Cuando un mes termina, Skip suma lo que entró y todo lo que quedó registrado como salida (facturas, suscripciones, recibos), y lo que sobra se convierte en el ahorro de ese mes. Un mes en el que gastaste de más resta del total, porque hacer como si hubieras ahorrado cero volvería falso el total.',
    fr: 'Quand un mois se termine, Skip additionne ce qui est entré et tout ce qui a été enregistré comme sorti — factures, abonnements, reçus — et ce qui reste devient l’épargne de ce mois. Un mois où tu as trop dépensé vient en déduction du total, parce que prétendre que tu as épargné zéro rendrait le total mensonger.',
  },
  'faq.money.correct.q': {
    en: 'Why can I correct a savings month?',
    es: '¿Por qué puedo corregir un mes de ahorro?',
    fr: 'Pourquoi puis-je corriger un mois d’épargne ?',
  },
  'faq.money.correct.a': {
    en: 'Skip only knows what it was told. If you paid a plumber in cash or never scanned a receipt, the month looks better than it was — so you can put in the real figure, with a note, and Skip keeps both numbers so you can always see why they differ.',
    es: 'Skip solo sabe lo que se le ha dicho. Si le pagaste a un plomero en efectivo o nunca escaneaste un recibo, el mes se ve mejor de lo que fue; por eso puedes poner la cifra real, con una nota, y Skip conserva las dos cifras para que siempre veas por qué difieren.',
    fr: 'Skip ne connaît que ce qu’on lui a dit. Si tu as payé un plombier en argent comptant ou que tu n’as jamais numérisé un reçu, le mois paraît meilleur qu’il ne l’était — tu peux donc saisir le chiffre réel, avec une note, et Skip garde les deux montants pour que tu voies toujours pourquoi ils diffèrent.',
  },
  'faq.money.balances.q': {
    en: 'Why don’t my credit card balances update by themselves?',
    es: '¿Por qué los saldos de mis tarjetas de crédito no se actualizan solos?',
    fr: 'Pourquoi les soldes de mes cartes de crédit ne se mettent-ils pas à jour d’eux-mêmes ?',
  },
  'faq.money.balances.a': {
    en: 'Because Skip is not connected to your bank. A card’s balance starts from the figure you gave it and moves with what you record — bills, subscriptions and receipts paid with that card.',
    es: 'Porque Skip no está conectada con tu banco. El saldo de una tarjeta parte de la cifra que le diste y cambia con lo que registras: facturas, suscripciones y recibos pagados con esa tarjeta.',
    fr: 'Parce que Skip n’est pas connectée à ta banque. Le solde d’une carte part du chiffre que tu lui as donné et évolue selon ce que tu enregistres — factures, abonnements et reçus payés avec cette carte.',
  },

  'faq.receipts.title': {
    en: 'Receipts',
    es: 'Recibos',
    fr: 'Reçus',
  },
  'faq.receipts.leave.q': {
    en: 'Does my receipt leave my phone?',
    es: '¿Mi recibo sale de mi teléfono?',
    fr: 'Mon reçu quitte-t-il mon téléphone ?',
  },
  'faq.receipts.leave.a': {
    en: 'No. The photo is read on the device itself, and only the text Skip understood — the store, the date, the total — is saved to your account. The picture is thrown away.',
    es: 'No. La foto se lee en el propio dispositivo, y solo el texto que Skip entendió (la tienda, la fecha y el total) se guarda en tu cuenta. La imagen se descarta.',
    fr: 'Non. La photo est lue sur l’appareil même, et seul le texte que Skip a compris — le magasin, la date, le total — est enregistré dans ton compte. L’image est supprimée.',
  },
  'faq.receipts.wrong.q': {
    en: 'The scan got something wrong.',
    es: 'El escaneo se equivocó en algo.',
    fr: 'La numérisation s’est trompée sur quelque chose.',
  },
  'faq.receipts.wrong.a': {
    en: 'Tap the receipt and fix the field. Skip fills in what it could read and leaves the rest to you — a wrong guess corrected once does not come back.',
    es: 'Toca el recibo y corrige el campo. Skip llena lo que pudo leer y deja el resto en tus manos; una suposición equivocada que corriges una vez no vuelve a aparecer.',
    fr: 'Appuie sur le reçu et corrige le champ. Skip remplit ce qu’elle a pu lire et te laisse le reste — une mauvaise interprétation corrigée une fois ne revient pas.',
  },

  'faq.loans.title': {
    en: 'Loans',
    es: 'Préstamos',
    fr: 'Prêts',
  },
  'faq.loans.match.q': {
    en: 'Why does Skip’s loan figure match my bank when other calculators don’t?',
    es: '¿Por qué la cifra del préstamo de Skip coincide con mi banco y la de otras calculadoras no?',
    fr: 'Pourquoi le chiffre de prêt de Skip correspond-il à celui de ma banque, contrairement aux autres calculatrices ?',
  },
  'faq.loans.match.a': {
    en: 'Most calculators charge a twelfth of a year’s interest every month. Real lenders charge by the day, so a 31-day month costs more than February. Skip charges by the day too, which is why its payoff matches your statement to the cent.',
    es: 'La mayoría de las calculadoras cobran cada mes un doceavo de los intereses de un año. Los prestamistas de verdad cobran por día, así que un mes de 31 días cuesta más que febrero. Skip también cobra por día, y por eso su saldo para liquidar coincide con tu estado de cuenta al centavo.',
    fr: 'La plupart des calculatrices facturent chaque mois un douzième des intérêts d’une année. Les vrais prêteurs comptent au jour près, si bien qu’un mois de 31 jours coûte plus cher que février. Skip compte lui aussi au jour près, et c’est pourquoi son solde à rembourser correspond à ton relevé au cent près.',
  },

  'faq.reminders.title': {
    en: 'Reminders',
    es: 'Recordatorios',
    fr: 'Rappels',
  },
  'faq.reminders.missing.q': {
    en: 'Why didn’t I get a reminder?',
    es: '¿Por qué no me llegó un recordatorio?',
    fr: 'Pourquoi n’ai-je pas reçu de rappel ?',
  },
  'faq.reminders.missing.a': {
    en: 'Check notifications are on for Skip in the iPhone’s Settings, and that the reminder’s time hasn’t already passed today. Reminders send at the time you chose, in your own time zone.',
    es: 'Revisa que las notificaciones estén activadas para Skip en los Ajustes del iPhone, y que la hora del recordatorio no haya pasado ya hoy. Los recordatorios se envían a la hora que elegiste, en tu propia zona horaria.',
    fr: 'Vérifie que les notifications sont activées pour Skip dans les Réglages de l’iPhone, et que l’heure du rappel n’est pas déjà passée aujourd’hui. Les rappels sont envoyés à l’heure que tu as choisie, dans ton propre fuseau horaire.',
  },

  'faq.pro.title': {
    en: 'Skip Pro and billing',
    es: 'Skip Pro y cobros',
    fr: 'Skip Pro et facturation',
  },
  'faq.pro.include.q': {
    en: 'What does Pro include?',
    es: '¿Qué incluye Pro?',
    fr: 'Qu’est-ce qui est inclus dans Pro ?',
  },
  // {monthly} and {yearly} are the store's own prices, so each storefront reads its own currency.
  'faq.pro.include.a': {
    en: 'Unlimited credit cards, accounts and incomes, unlimited receipt scans and uploads, Voice entry, Insights, seven years of history, early access to new features and first-in-line support. {monthly} a month or {yearly} a year, billed by Apple.',
    es: 'Tarjetas de crédito, cuentas e ingresos sin límite, escaneos y subidas de recibos sin límite, entrada por voz, Análisis, siete años de historial, acceso anticipado a las funciones nuevas y soporte con prioridad. {monthly} al mes o {yearly} al año, cobrados por Apple.',
    fr: 'Cartes de crédit, comptes et revenus en nombre illimité, numérisations et imports de reçus illimités, saisie vocale, Aperçu, sept ans d’historique, accès anticipé aux nouvelles fonctionnalités et assistance prioritaire. {monthly} par mois ou {yearly} par an, facturés par Apple.',
  },
  'faq.pro.cancelled.q': {
    en: 'What happens to my things if I cancel?',
    es: '¿Qué pasa con mis cosas si cancelo?',
    fr: 'Qu’arrive-t-il à mes affaires si j’annule ?',
  },
  'faq.pro.cancelled.a': {
    en: 'Nothing is deleted — ever. Every credit card, account and balance keeps working exactly as it was. Until Pro returns you cannot add past the free allowance, and lists show the last 90 days (older entries are kept, just out of view).',
    es: 'Nada se elimina, nunca. Cada tarjeta de crédito, cuenta y saldo sigue funcionando exactamente como estaba. Hasta que Pro regrese no puedes agregar más allá del límite gratis y las listas muestran los últimos 90 días (lo anterior se guarda, solo que no se ve).',
    fr: 'Rien n’est jamais supprimé. Chaque carte de crédit, chaque compte et chaque solde continue de fonctionner exactement comme avant. Tant que Pro n’est pas de retour, tu ne peux rien ajouter au-delà de la limite gratuite et les listes affichent les 90 derniers jours (le reste est conservé, simplement masqué).',
  },
  'faq.pro.cancel.q': {
    en: 'How do I cancel?',
    es: '¿Cómo cancelo?',
    fr: 'Comment annuler ?',
  },
  'faq.pro.cancel.a': {
    en: 'In your Apple subscriptions — Settings → your name → Subscriptions on the iPhone, or from the Skip Pro page in the app. Skip never bills you itself, so cancelling is entirely between you and Apple.',
    es: 'En tus suscripciones de Apple: Ajustes → tu nombre → Suscripciones en el iPhone, o desde la página de Skip Pro en la aplicación. Skip nunca te cobra directamente, así que cancelar es algo que se resuelve solo entre tú y Apple.',
    fr: 'Dans tes abonnements Apple — Réglages → ton nom → Abonnements sur l’iPhone, ou depuis la page Skip Pro dans l’application. Skip ne te facture jamais elle-même, alors l’annulation se règle uniquement entre toi et Apple.',
  },

  'faq.privacy.title': {
    en: 'Privacy and your data',
    es: 'Privacidad y tus datos',
    fr: 'Confidentialité et tes données',
  },
  'faq.privacy.leaves.q': {
    en: 'What leaves my phone?',
    es: '¿Qué sale de mi teléfono?',
    fr: 'Qu’est-ce qui quitte mon téléphone ?',
  },
  'faq.privacy.leaves.a': {
    en: 'Only what you save: the bills, receipts and cards on your account, stored so your own devices agree with each other. No bank connection, no receipt photos, no contact list, no tracking of what you do in the app to sell.',
    es: 'Solo lo que guardas: las facturas, los recibos y las tarjetas de tu cuenta, almacenados para que tus propios dispositivos coincidan entre sí. Ninguna conexión con el banco, ninguna foto de recibos, ninguna lista de contactos y ningún rastreo de lo que haces en la aplicación para venderlo.',
    fr: 'Seulement ce que tu enregistres : les factures, les reçus et les cartes de ton compte, conservés pour que tes propres appareils concordent entre eux. Aucune connexion bancaire, aucune photo de reçu, aucune liste de contacts, aucun suivi de ce que tu fais dans l’application pour le vendre.',
  },
  'faq.privacy.delete.q': {
    en: 'How do I delete my account?',
    es: '¿Cómo elimino mi cuenta?',
    fr: 'Comment supprimer mon compte ?',
  },
  'faq.privacy.delete.a': {
    en: 'Settings → Account → Delete account. Everything that is yours goes with it immediately — there is no grace copy kept.',
    es: 'Ajustes → Cuenta → Eliminar cuenta. Todo lo que es tuyo se va con ella de inmediato; no se conserva ninguna copia de respaldo.',
    fr: 'Réglages → Compte → Supprimer le compte. Tout ce qui t’appartient disparaît avec lui immédiatement — aucune copie de sauvegarde n’est conservée.',
  },
});
