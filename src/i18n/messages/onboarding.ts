import { defineMessages } from '@/i18n/translate';

export const onboardingMessages = defineMessages({
  /** The verb: leave this step for later. Not the app's name. */
  'onboarding.skip': { en: 'Skip', es: 'Omitir', fr: 'Passer' },
  'onboarding.skipForNow': {
    en: 'Skip for now',
    es: 'Omitir por ahora',
    fr: 'Passer pour l’instant',
  },

  'onboarding.welcome.title': {
    en: 'Your money, your privacy.',
    es: 'Tu dinero, tu privacidad.',
    fr: 'Ton argent, ta vie privée.',
  },
  // {place} and {noLogin} are drawn in bold, so the screen splits each sentence around them.
  'onboarding.welcome.track': {
    en: 'Track spending, bills, subscriptions and card balances — {place}.',
    es: 'Lleva el control de tus gastos, facturas, suscripciones y saldos de tarjetas, {place}.',
    fr: 'Suis tes dépenses, factures, abonnements et soldes de cartes — {place}.',
  },
  'onboarding.welcome.trackPlace': {
    en: 'all in one place',
    es: 'todo en un solo lugar',
    fr: 'tout au même endroit',
  },
  'onboarding.welcome.privacy': {
    en: '{noLogin} You decide what Skip knows, and nothing else.',
    es: '{noLogin} Tú decides qué sabe Skip, y nada más.',
    fr: '{noLogin} Tu décides de ce que Skip sait, et rien d’autre.',
  },
  'onboarding.welcome.noLogin': {
    en: 'No bank login, ever.',
    es: 'Nunca te pedimos los datos de tu banco.',
    fr: 'Jamais d’identifiants bancaires.',
  },
  'onboarding.welcome.start': { en: 'Get started', es: 'Comenzar', fr: 'Commencer' },

  'onboarding.canDo.title': {
    en: 'What Skip can do',
    es: 'Lo que Skip puede hacer',
    fr: 'Ce que Skip peut faire',
  },
  'onboarding.tour.subtitle': {
    en: 'Five things, each a tap away. No setup order to follow — start wherever your money bothers you most.',
    es: 'Cinco cosas, cada una a un toque. No hay un orden que seguir: empieza por lo que más te preocupe de tu dinero.',
    fr: 'Cinq choses, chacune à une touche de distance. Aucun ordre à suivre — commence par ce qui te préoccupe le plus côté argent.',
  },

  'onboarding.stop.bank.title': {
    en: 'Track without linking a bank',
    es: 'Lleva tus cuentas sin conectar tu banco',
    fr: 'Suis ton argent sans lier ta banque',
  },
  'onboarding.stop.receipts.title': {
    en: 'Scan receipts in a tap',
    es: 'Escanea recibos con un toque',
    fr: 'Numérise tes reçus en une touche',
  },
  'onboarding.stop.loans.title': {
    en: 'Loans, to the cent',
    es: 'Préstamos, al centavo',
    fr: 'Les prêts, au cent près',
  },
  'onboarding.stop.savings.title': {
    en: 'Savings that explain themselves',
    es: 'Ahorros que se explican solos',
    fr: 'Une épargne qui s’explique d’elle-même',
  },
  'onboarding.stop.reminders.title': {
    en: 'Reminded before things land',
    es: 'Recordatorios antes de cada cargo',
    fr: 'Des rappels avant que ça tombe',
  },

  'onboarding.tour.bank.detail': {
    en: 'No credentials, no aggregator. You tell Skip what happens and it does the arithmetic — your bank never knows Skip exists.',
    es: 'Sin contraseñas ni agregadores. Tú le dices a Skip lo que pasa y Skip hace las cuentas: tu banco nunca sabe que Skip existe.',
    fr: 'Pas d’identifiants, pas d’agrégateur. Tu dis à Skip ce qui se passe et il fait les calculs — ta banque ne sait jamais que Skip existe.',
  },
  'onboarding.tour.receipts.detail': {
    en: 'Point the camera at a receipt and it is read on your phone — store, date, total, ready to check and save. The photo never leaves the device.',
    es: 'Apunta la cámara a un recibo y se lee en tu teléfono: tienda, fecha y total, listos para revisar y guardar. La foto nunca sale del dispositivo.',
    fr: 'Pointe l’appareil photo vers un reçu et il est lu sur ton téléphone — magasin, date, total, prêts à vérifier et à enregistrer. La photo ne quitte jamais l’appareil.',
  },
  'onboarding.tour.loans.detail': {
    en: 'Interest charged by the day, the way lenders actually bill — so Skip’s payoff matches your statement exactly.',
    es: 'Intereses calculados por día, como cobran de verdad los bancos, para que el saldo a liquidar de Skip coincida exactamente con tu estado de cuenta.',
    fr: 'Des intérêts calculés au jour près, comme les prêteurs facturent vraiment — le solde à rembourser de Skip correspond donc exactement à ton relevé.',
  },
  'onboarding.tour.savings.detail': {
    en: 'When a month ends, whatever was left of it is added here — with the arithmetic shown, and corrections when Skip missed something.',
    es: 'Cuando termina un mes, lo que sobró se suma aquí, con las cuentas a la vista y correcciones cuando a Skip se le pasó algo.',
    fr: 'À la fin d’un mois, ce qui en reste s’ajoute ici — avec les calculs bien visibles, et des corrections quand Skip a manqué quelque chose.',
  },
  'onboarding.tour.reminders.detail': {
    en: 'Bills, renewals and payday, announced before they happen instead of discovered afterwards.',
    es: 'Facturas, renovaciones y día de pago, avisados antes de que pasen y no descubiertos después.',
    fr: 'Factures, renouvellements et jour de paie, annoncés avant plutôt que découverts après coup.',
  },

  'onboarding.canDo.bank.detail': {
    en: 'You tell Skip what happens. Your bank never knows Skip exists.',
    es: 'Tú le dices a Skip lo que pasa. Tu banco nunca sabe que Skip existe.',
    fr: 'Tu dis à Skip ce qui se passe. Ta banque ne sait jamais que Skip existe.',
  },
  'onboarding.canDo.receipts.detail': {
    en: 'Read on your phone — the photo never leaves it.',
    es: 'Se lee en tu teléfono: la foto nunca sale de ahí.',
    fr: 'Lu sur ton téléphone — la photo n’en sort jamais.',
  },
  'onboarding.canDo.loans.detail': {
    en: 'Daily interest, so the payoff matches your statement.',
    es: 'Intereses diarios, para que el saldo a liquidar coincida con tu estado de cuenta.',
    fr: 'Intérêts quotidiens : le solde à rembourser correspond à ton relevé.',
  },
  'onboarding.canDo.savings.detail': {
    en: 'Whatever a month leaves over lands here, arithmetic shown.',
    es: 'Lo que sobra cada mes llega aquí, con las cuentas a la vista.',
    fr: 'Ce qui reste de chaque mois arrive ici, calculs à l’appui.',
  },
  'onboarding.canDo.reminders.detail': {
    en: 'Bills, renewals and payday, announced ahead.',
    es: 'Facturas, renovaciones y día de pago, avisados con tiempo.',
    fr: 'Factures, renouvellements et jour de paie, annoncés d’avance.',
  },

  'onboarding.accountOffer.title': {
    en: 'Add your bank account',
    es: 'Agrega tu cuenta bancaria',
    fr: 'Ajoute ton compte bancaire',
  },
  'onboarding.accountOffer.add': {
    en: 'Add bank account',
    es: 'Agregar cuenta bancaria',
    fr: 'Ajouter un compte bancaire',
  },

  'onboarding.avatar.title': { en: 'Profile picture', es: 'Foto de perfil', fr: 'Photo de profil' },
  'onboarding.avatar.none': { en: 'No profile', es: 'Sin foto', fr: 'Aucune photo' },
  'onboarding.avatar.noneLabel': {
    en: 'No profile picture',
    es: 'Sin foto de perfil',
    fr: 'Aucune photo de profil',
  },
  'onboarding.avatar.number': {
    en: 'Avatar {number}',
    es: 'Avatar {number}',
    fr: 'Avatar {number}',
  },

  'onboarding.hello.loading': { en: 'Loading', es: 'Cargando', fr: 'Chargement' },
  'onboarding.hello.title': {
    en: 'What should we call you?',
    es: '¿Cómo quieres que te llamemos?',
    fr: 'Comment veux-tu qu’on t’appelle ?',
  },
  'onboarding.hello.pickPicture': {
    en: 'Choose a profile picture',
    es: 'Elige una foto de perfil',
    fr: 'Choisis une photo de profil',
  },
  'onboarding.hello.name': { en: 'Your name', es: 'Tu nombre', fr: 'Ton nom' },

  'onboarding.setup.title': {
    en: 'Let’s set up Skip',
    es: 'Configuremos Skip',
    fr: 'Configurons Skip',
  },
  'onboarding.setup.allSet': {
    en: 'All set — open Skip',
    es: 'Todo listo: abrir Skip',
    fr: 'Tout est prêt — ouvrir Skip',
  },
  'onboarding.setup.addReceipt': {
    en: 'Add a receipt',
    es: 'Agregar un recibo',
    fr: 'Ajouter un reçu',
  },
  'onboarding.setup.skipReceipt': {
    en: 'Skip the receipt — open Skip',
    es: 'Omitir el recibo: abrir Skip',
    fr: 'Passer le reçu — ouvrir Skip',
  },
  'onboarding.setup.later': {
    en: 'Set up later',
    es: 'Configurar después',
    fr: 'Configurer plus tard',
  },
  'onboarding.setup.stepDone': {
    en: 'Step {number}, {title}. Done.',
    es: 'Paso {number}, {title}. Listo.',
    fr: 'Étape {number}, {title}. Terminée.',
  },

  'onboarding.bills.title': {
    en: 'Add your bills',
    es: 'Agrega tus facturas',
    fr: 'Ajoute tes factures',
  },
  'onboarding.bills.subtitle': {
    en: 'Rent, phone, internet — add every bill that comes back, one at a time.',
    es: 'Renta, teléfono, internet: agrega cada factura que se repite, una por una.',
    fr: 'Loyer, téléphone, internet — ajoute chaque facture qui revient, une à la fois.',
  },
  'onboarding.bills.empty': {
    en: 'Your bills show up here as you add them.',
    es: 'Tus facturas aparecen aquí a medida que las agregas.',
    fr: 'Tes factures s’affichent ici à mesure que tu les ajoutes.',
  },
  'onboarding.bills.add': {
    en: 'Add a bill',
    es: 'Agregar una factura',
    fr: 'Ajouter une facture',
  },
  'onboarding.bills.addAnother': {
    en: 'Add another bill',
    es: 'Agregar otra factura',
    fr: 'Ajouter une autre facture',
  },

  'onboarding.subscriptions.title': {
    en: 'Add your subscriptions',
    es: 'Agrega tus suscripciones',
    fr: 'Ajoute tes abonnements',
  },
  'onboarding.subscriptions.subtitle': {
    en: 'Netflix, Spotify, the gym — add every one that renews on its own, one at a time.',
    es: 'Netflix, Spotify, el gimnasio: agrega cada una que se renueve sola, una por una.',
    fr: 'Netflix, Spotify, le gym — ajoute chacun de ceux qui se renouvellent tout seuls, un à la fois.',
  },
  'onboarding.subscriptions.empty': {
    en: 'Your subscriptions show up here as you add them.',
    es: 'Tus suscripciones aparecen aquí a medida que las agregas.',
    fr: 'Tes abonnements s’affichent ici à mesure que tu les ajoutes.',
  },
  'onboarding.subscriptions.add': {
    en: 'Add a subscription',
    es: 'Agregar una suscripción',
    fr: 'Ajouter un abonnement',
  },
  'onboarding.subscriptions.addAnother': {
    en: 'Add another subscription',
    es: 'Agregar otra suscripción',
    fr: 'Ajouter un autre abonnement',
  },

  'onboarding.gettingStarted.title': {
    en: 'Getting started',
    es: 'Primeros pasos',
    fr: 'Premiers pas',
  },
  'onboarding.gettingStarted.progress': {
    en: '{done} of {total} done',
    es: '{done} de {total} listos',
    fr: '{done} sur {total} terminées',
  },
  'onboarding.gettingStarted.hide': {
    en: 'Hide the getting started card',
    es: 'Ocultar la guía de primeros pasos',
    fr: 'Masquer le guide Premiers pas',
  },
  'onboarding.gettingStarted.stepDone': {
    en: '{title}. Done.',
    es: '{title}. Listo.',
    fr: '{title}. Terminée.',
  },
});
