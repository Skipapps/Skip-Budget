import { defineMessages } from '@/i18n/translate';

export const apiMessages = defineMessages({
  'api.auth.wrongPassword': {
    en: 'That email and password do not match.',
    es: 'Ese correo y esa contraseña no coinciden.',
    fr: 'Ce courriel et ce mot de passe ne correspondent pas.',
  },
  'api.auth.emailTaken': {
    en: 'That email already has an account.',
    es: 'Ese correo ya tiene una cuenta.',
    fr: 'Ce courriel a déjà un compte.',
  },
  'api.auth.shortPassword': {
    en: 'Password must be at least 6 characters.',
    es: 'La contraseña debe tener al menos 6 caracteres.',
    fr: 'Le mot de passe doit contenir au moins 6 caractères.',
  },
  'api.auth.badEmail': {
    en: 'That email address does not look right.',
    es: 'Esa dirección de correo no parece correcta.',
    fr: 'Cette adresse courriel ne semble pas valide.',
  },
  'api.auth.codeExpired': {
    en: 'That code has expired. Send a new one.',
    es: 'Ese código ya expiró. Pide uno nuevo.',
    fr: 'Ce code a expiré. Demandes-en un nouveau.',
  },
  'api.auth.codeWrong': {
    en: 'That code is not right. Check it and try again.',
    es: 'Ese código no es correcto. Revísalo e inténtalo de nuevo.',
    fr: 'Ce code n’est pas le bon. Vérifie-le et réessaie.',
  },
  'api.auth.tooMany': {
    en: 'Too many attempts. Wait a minute and try again.',
    es: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    fr: 'Trop de tentatives. Attends une minute et réessaie.',
  },

  'api.oauth.appleIosOnly': {
    en: 'Sign in with Apple is only available on iOS.',
    es: 'Iniciar sesión con Apple solo está disponible en iOS.',
    fr: 'La connexion avec Apple n’est disponible que sur iOS.',
  },
  'api.oauth.appleUnavailable': {
    en: 'Sign in with Apple is not available on this device.',
    es: 'Iniciar sesión con Apple no está disponible en este dispositivo.',
    fr: 'La connexion avec Apple n’est pas disponible sur cet appareil.',
  },
  'api.oauth.appleNoAccount': {
    en: 'Sign in to an Apple ID on this device first, then try again.',
    es: 'Primero inicia sesión con un ID de Apple en este dispositivo y luego inténtalo de nuevo.',
    fr: 'Connecte-toi d’abord à un identifiant Apple sur cet appareil, puis réessaie.',
  },

  'api.entry.pickStore': {
    en: 'Pick a store first.',
    es: 'Primero elige una tienda.',
    fr: 'Choisis d’abord un magasin.',
  },
  'api.entry.receiptAmount': {
    en: 'Enter how much you spent.',
    es: 'Ingresa cuánto gastaste.',
    fr: 'Indique combien tu as dépensé.',
  },
  'api.entry.billName': {
    en: 'Give the bill a name.',
    es: 'Ponle un nombre a la factura.',
    fr: 'Donne un nom à la facture.',
  },
  'api.entry.billAmount': {
    en: 'Enter how much it costs.',
    es: 'Ingresa cuánto cuesta.',
    fr: 'Indique combien ça coûte.',
  },
  'api.entry.periodStart': {
    en: 'Pick the date it starts.',
    es: 'Elige la fecha en que empieza.',
    fr: 'Choisis la date de début.',
  },
  'api.entry.firstDue': {
    en: 'Pick the first due date.',
    es: 'Elige la primera fecha de vencimiento.',
    fr: 'Choisis la première date d’échéance.',
  },
  'api.entry.endBeforeStart': {
    en: 'The end date cannot be before the start date.',
    es: 'La fecha de fin no puede ser anterior a la fecha de inicio.',
    fr: 'La date de fin ne peut pas précéder la date de début.',
  },
  'api.entry.pickService': {
    en: 'Pick a service first.',
    es: 'Primero elige un servicio.',
    fr: 'Choisis d’abord un service.',
  },
  'api.entry.subscriptionAmount': {
    en: 'Enter what it costs.',
    es: 'Ingresa cuánto cuesta.',
    fr: 'Indique ce que ça coûte.',
  },

  'api.pastCharges.title': {
    en: 'Change past charges too?',
    es: '¿Cambiar también los cargos anteriores?',
    fr: 'Modifier aussi les prélèvements passés ?',
  },
  'api.pastCharges.charged': {
    en: {
      one: '{name} has already been charged once. Change that charge as well, or only the ones still to come?',
      other:
        '{name} has already been charged {count} times. Change those as well, or only the ones still to come?',
    },
    es: {
      one: 'Ya hubo un cargo de {name}. ¿Cambiar también ese cargo o solo los próximos?',
      other: 'Ya hubo {count} cargos de {name}. ¿Cambiarlos también o solo los próximos?',
    },
    fr: {
      one: 'Un prélèvement a déjà eu lieu pour {name}. Modifier aussi ce prélèvement, ou seulement ceux à venir ?',
      other:
        '{count} prélèvements ont déjà eu lieu pour {name}. Les modifier aussi, ou seulement ceux à venir ?',
    },
  },
  'api.pastCharges.maybeOne': {
    en: '{name} may already have been charged. Change that charge as well, or only the ones still to come?',
    es: 'Puede que ya haya un cargo de {name}. ¿Cambiar también ese cargo o solo los próximos?',
    fr: 'Un prélèvement a peut-être déjà eu lieu pour {name}. Modifier aussi ce prélèvement, ou seulement ceux à venir ?',
  },
  'api.pastCharges.maybeMany': {
    en: '{name} may already have been charged. Change those as well, or only the ones still to come?',
    es: 'Puede que ya haya cargos de {name}. ¿Cambiarlos también o solo los próximos?',
    fr: 'Des prélèvements ont peut-être déjà eu lieu pour {name}. Les modifier aussi, ou seulement ceux à venir ?',
  },
  'api.pastCharges.all': {
    en: 'Past and upcoming',
    es: 'Anteriores y próximos',
    fr: 'Passés et à venir',
  },
  'api.pastCharges.upcoming': {
    en: 'Upcoming only',
    es: 'Solo los próximos',
    fr: 'Seulement ceux à venir',
  },

  'api.setup.salary.title': {
    en: 'Set your pay',
    es: 'Configura tu salario',
    fr: 'Indique ta paie',
  },
  'api.setup.salary.detail': {
    en: 'Left this month, savings and Insights all start from what comes in.',
    es: '“Te queda este mes”, los ahorros y Análisis se calculan a partir de lo que entra.',
    fr: '« Reste ce mois-ci », l’épargne et Aperçu se calculent à partir de ce qui entre.',
  },
  'api.setup.wallet.title': {
    en: 'Add your credit card and bank account',
    es: 'Agrega tu tarjeta de crédito y tu cuenta bancaria',
    fr: 'Ajoute ta carte de crédit et ton compte bancaire',
  },
  'api.setup.wallet.detail': {
    en: 'Card first; the bank account is offered right after, and skipping it still completes the step.',
    es: 'Primero la tarjeta; justo después te ofrecemos la cuenta bancaria, y si la omites, el paso queda completo igual.',
    fr: 'La carte d’abord ; le compte bancaire est proposé juste après, et l’étape est complétée même si tu le passes.',
  },
  'api.setup.bill.title': {
    en: 'Add your bills',
    es: 'Agrega tus facturas',
    fr: 'Ajoute tes factures',
  },
  'api.setup.bill.detail': {
    en: 'Rent or the phone bill — one is enough to light up Coming up.',
    es: 'La renta o la factura del teléfono: con una basta para llenar Próximos.',
    fr: 'Le loyer ou la facture de téléphone — une seule suffit pour remplir À venir.',
  },
  'api.setup.subscription.title': {
    en: 'Add your subscriptions',
    es: 'Agrega tus suscripciones',
    fr: 'Ajoute tes abonnements',
  },
  'api.setup.subscription.detail': {
    en: 'Netflix, the gym — the charges that come back on their own land in Coming up.',
    es: 'Netflix, el gimnasio: los cargos que se repiten solos aparecen en Próximos.',
    fr: 'Netflix, le gym — les prélèvements qui reviennent d’eux-mêmes s’affichent dans À venir.',
  },
  'api.setup.receipt.title': {
    en: 'Add a receipt',
    es: 'Agrega un recibo',
    fr: 'Ajoute un reçu',
  },
  'api.setup.receipt.detail': {
    en: 'What you spend day to day, next to your bills. Skippable — the app works without it.',
    es: 'Lo que gastas día a día, junto a tus facturas. Es opcional: la app funciona sin esto.',
    fr: 'Ce que tu dépenses au quotidien, à côté de tes factures. Facultatif — l’app fonctionne sans.',
  },

  'api.reminders.off': { en: 'Off', es: 'Desactivado', fr: 'Désactivé' },
  'api.reminders.onTheDay': { en: 'On the day', es: 'El mismo día', fr: 'Le jour même' },
  'api.reminders.days': {
    en: { one: '{count} day', other: '{count} days' },
    es: { one: '{count} día', other: '{count} días' },
    fr: { one: '{count} jour', other: '{count} jours' },
  },
  'api.reminders.weeks': {
    en: { one: '{count} week', other: '{count} weeks' },
    es: { one: '{count} semana', other: '{count} semanas' },
    fr: { one: '{count} semaine', other: '{count} semaines' },
  },
  'api.reminders.caption.bill': {
    en: 'Before the bill is due',
    es: 'Antes de que venza la factura',
    fr: 'Avant l’échéance de la facture',
  },
  'api.reminders.caption.subscription': {
    en: 'Before it renews',
    es: 'Antes de que se renueve',
    fr: 'Avant le renouvellement',
  },
  'api.reminders.caption.card': {
    en: "Before this card's payment day",
    es: 'Antes del día de pago de esta tarjeta',
    fr: 'Avant la date de paiement de cette carte',
  },
  'api.reminders.caption.account': {
    en: 'When your pay lands here',
    es: 'Cuando tu salario llegue aquí',
    fr: 'Quand ta paie arrive ici',
  },
});
