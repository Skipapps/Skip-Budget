import { defineMessages } from '@/i18n/translate';

export const onboardingMessages = defineMessages({
  /** The verb: leave this step for later. Not the app's name. */
  'onboarding.skip': { en: 'Skip', es: 'Omitir', fr: 'Passer' },
  'onboarding.skipForNow': {
    en: 'Skip for now',
    es: 'Omitir por ahora',
    fr: 'Passer pour l’instant',
  },

  // Broken after the comma, as the design sets it.
  'onboarding.welcome.title': {
    en: 'Your money,\nyour privacy.',
    es: 'Tu dinero,\ntu privacidad.',
    fr: 'Ton argent,\nta vie privée.',
  },
  'onboarding.welcome.subtitle': {
    en: 'Track spending, bills and cards.\nNo bank login, ever.',
    es: 'Lleva tus gastos, facturas y tarjetas.\nSin acceso a tu banco, nunca.',
    fr: 'Suis tes dépenses, factures et cartes.\nJamais d’identifiants bancaires.',
  },
  'onboarding.welcome.start': { en: 'Get started', es: 'Comenzar', fr: 'Commencer' },
  'onboarding.welcome.haveAccount': {
    en: 'Already have an account?',
    es: '¿Ya tienes una cuenta?',
    fr: 'Tu as déjà un compte ?',
  },
  'onboarding.welcome.logIn': { en: 'Log in', es: 'Inicia sesión', fr: 'Connecte-toi' },

  'onboarding.canDo.title': {
    en: 'What Skip can do',
    es: 'Lo que Skip puede hacer',
    fr: 'Ce que Skip peut faire',
  },
  'onboarding.canDo.subtitle': {
    en: 'Simple money tracking, built for privacy.',
    es: 'Llevar tu dinero, sencillo y privado.',
    fr: 'Suivre ton argent, simplement et en privé.',
  },

  'onboarding.canDo.bank.title': {
    en: 'No bank connection needed',
    es: 'Sin conectar tu banco',
    fr: 'Aucune connexion bancaire',
  },
  'onboarding.canDo.bank.detail': {
    en: 'Your bank details always stay private.',
    es: 'Los datos de tu banco siempre son privados.',
    fr: 'Tes données bancaires restent toujours privées.',
  },
  'onboarding.canDo.receipts.title': {
    en: 'Scan receipts instantly',
    es: 'Escanea recibos al instante',
    fr: 'Numérise tes reçus en un instant',
  },
  'onboarding.canDo.receipts.detail': {
    en: 'Read on your phone, never uploaded.',
    es: 'Se leen en tu teléfono, nunca se suben.',
    fr: 'Lus sur ton téléphone, jamais envoyés.',
  },
  'onboarding.canDo.loans.title': {
    en: 'Accurate loan tracking',
    es: 'Préstamos exactos',
    fr: 'Des prêts suivis au plus juste',
  },
  'onboarding.canDo.loans.detail': {
    en: 'Daily interest, just like your bank.',
    es: 'Interés diario, igual que tu banco.',
    fr: 'Intérêts quotidiens, comme ta banque.',
  },
  'onboarding.canDo.savings.title': {
    en: 'Clear, automatic savings',
    es: 'Ahorro claro y automático',
    fr: 'Une épargne claire et automatique',
  },
  'onboarding.canDo.savings.detail': {
    en: 'Leftovers saved, with the math shown.',
    es: 'Lo que sobra se ahorra, con las cuentas a la vista.',
    fr: 'Le reste est épargné, calculs à l’appui.',
  },
  'onboarding.canDo.reminders.title': {
    en: 'Reminders before it’s due',
    es: 'Avisos antes de cada pago',
    fr: 'Des rappels avant l’échéance',
  },
  'onboarding.canDo.reminders.detail': {
    en: 'Bills, renewals and payday, ahead of time.',
    es: 'Facturas, renovaciones y día de pago, con tiempo.',
    fr: 'Factures, renouvellements et jour de paie, à l’avance.',
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
