import { defineMessages } from '@/i18n/translate';

export const remindersMessages = defineMessages({
  'reminders.title': { en: 'Reminders', es: 'Recordatorios', fr: 'Rappels' },

  'reminders.summary.nothing': {
    en: 'Add a bill, a subscription, a card or an account and Skip can remind you about those.',
    es: 'Agrega una factura, una suscripción, una tarjeta o una cuenta y Skip te las podrá recordar.',
    fr: 'Ajoute une facture, un abonnement, une carte ou un compte, et Skip pourra te les rappeler.',
  },
  /** Counted by how many are on: the verb agrees with {count}. */
  'reminders.summary.count': {
    en: {
      one: '{count} of {available} will let you know.',
      other: '{count} of {available} will let you know.',
    },
    es: {
      one: '{count} de {available} te avisará.',
      other: '{count} de {available} te avisarán.',
    },
    fr: {
      one: '{count} sur {available} te préviendra.',
      other: '{count} sur {available} te préviendront.',
    },
  },
  'reminders.summary.countAndAdd': {
    en: {
      one: '{count} of {available} will let you know. Add a bill, a subscription, a card or an account and Skip can remind you about those too.',
      other:
        '{count} of {available} will let you know. Add a bill, a subscription, a card or an account and Skip can remind you about those too.',
    },
    es: {
      one: '{count} de {available} te avisará. Agrega una factura, una suscripción, una tarjeta o una cuenta y Skip también te las podrá recordar.',
      other:
        '{count} de {available} te avisarán. Agrega una factura, una suscripción, una tarjeta o una cuenta y Skip también te las podrá recordar.',
    },
    fr: {
      one: '{count} sur {available} te préviendra. Ajoute une facture, un abonnement, une carte ou un compte, et Skip pourra aussi te les rappeler.',
      other:
        '{count} sur {available} te préviendront. Ajoute une facture, un abonnement, une carte ou un compte, et Skip pourra aussi te les rappeler.',
    },
  },

  'reminders.receipts.title': { en: 'Receipts', es: 'Recibos', fr: 'Reçus' },
  'reminders.receipts.caption': {
    en: 'Every day, so nothing gets forgotten.',
    es: 'Todos los días, para que nada se te olvide.',
    fr: 'Chaque jour, pour ne rien oublier.',
  },
  'reminders.receipts.daily': {
    en: 'Daily receipts reminder',
    es: 'Recordatorio diario de recibos',
    fr: 'Rappel quotidien des reçus',
  },
  'reminders.receipts.nudge': {
    en: 'A nudge to log what you bought today.',
    es: 'Un aviso para anotar lo que compraste hoy.',
    fr: 'Un petit rappel pour noter ce que tu as acheté aujourd’hui.',
  },
  /**
   * Spanish puts the time last: "8:00 p. m." already ends in a full stop, and "a la / a las" would
   * have to follow the hour.
   */
  'reminders.receipts.time': {
    en: 'Sent at {time}. Change the time for the daily receipts reminder.',
    es: 'Cambia la hora del recordatorio diario de recibos. Hora de envío: {time}',
    fr: 'Envoyé à {time}. Change l’heure du rappel quotidien des reçus.',
  },

  'reminders.group.bills': { en: 'Bills', es: 'Facturas', fr: 'Factures' },
  'reminders.group.subscriptions': {
    en: 'Subscriptions',
    es: 'Suscripciones',
    fr: 'Abonnements',
  },
  'reminders.group.cards': { en: 'Cards', es: 'Tarjetas', fr: 'Cartes' },
  'reminders.group.accounts': {
    en: 'Bank accounts',
    es: 'Cuentas bancarias',
    fr: 'Comptes bancaires',
  },

  'reminders.bill.due': {
    en: '{amount} · due {date}',
    es: '{amount} · vence el {date}',
    fr: '{amount} · à payer le {date}',
  },
  'reminders.subscription.renews': {
    en: '{amount} · renews {date}',
    es: '{amount} · se renueva el {date}',
    fr: '{amount} · renouvellement le {date}',
  },
  'reminders.card.fallback': { en: 'Card', es: 'Tarjeta', fr: 'Carte' },
  'reminders.card.noPaymentDay': {
    en: 'Add a payment day to this card first',
    es: 'Primero agrega un día de pago a esta tarjeta',
    fr: 'Ajoute d’abord une date de paiement à cette carte',
  },
  'reminders.account.fallback': { en: 'Account', es: 'Cuenta', fr: 'Compte' },
  /** The stored account type, read as a caption under the account's name. */
  'reminders.account.checking': { en: 'checking', es: 'cheques', fr: 'chèques' },
  'reminders.account.savings': { en: 'savings', es: 'ahorros', fr: 'épargne' },
  'reminders.account.noPay': {
    en: 'No pay lands here yet',
    es: 'Aún no llega salario aquí',
    fr: 'Aucune paie n’arrive ici pour l’instant',
  },

  'reminders.remindAbout': {
    en: 'Remind me about {name}',
    es: 'Recordatorio de {name}',
    fr: 'Rappel pour {name}',
  },
  'reminders.lead.sameDay': {
    en: 'Remind on the same day',
    es: 'Recordar el mismo día',
    fr: 'Rappeler le jour même',
  },
  /** {lead} is a lead option in lower case: "1 day", "3 days", "1 week". */
  'reminders.lead.before': {
    en: 'Remind {lead} before',
    es: 'Recordar {lead} antes',
    fr: 'Rappeler {lead} avant',
  },
  'reminders.time': {
    en: 'Sent at {time}. Change the time for {name}.',
    es: 'Cambia la hora de {name}. Hora de envío: {time}',
    fr: 'Envoyé à {time}. Change l’heure pour {name}.',
  },
  'reminders.remove': {
    en: 'Remove the reminder for {name}',
    es: 'Quitar el recordatorio de {name}',
    fr: 'Retirer le rappel pour {name}',
  },
  'reminders.footer': {
    en: "Reminders arrive as a notification. Turn them off for Skip in your phone's settings and nothing here will reach you.",
    es: 'Los recordatorios llegan como notificación. Si desactivas las notificaciones de Skip en los ajustes de tu teléfono, nada de esto te llegará.',
    fr: 'Les rappels arrivent sous forme de notification. Si tu les désactives pour Skip dans les réglages de ton téléphone, rien d’ici ne te parviendra.',
  },

  'reminders.news.title': {
    en: 'Notifications',
    es: 'Notificaciones',
    fr: 'Notifications',
  },
  'reminders.news.intro': {
    en: 'News from Skip — updates to install and features that have just arrived.',
    es: 'Novedades de Skip: actualizaciones para instalar y funciones recién llegadas.',
    fr: 'Les nouvelles de Skip — des mises à jour à installer et des fonctions qui viennent d’arriver.',
  },
  'reminders.news.empty': {
    en: 'No news yet',
    es: 'Aún no hay novedades',
    fr: 'Pas encore de nouvelles',
  },
  'reminders.news.emptyDetail': {
    en: 'Updates and new features from Skip will show up here.',
    es: 'Las actualizaciones y nuevas funciones de Skip aparecerán aquí.',
    fr: 'Les mises à jour et les nouvelles fonctions de Skip s’afficheront ici.',
  },
  'reminders.news.update': { en: 'Update', es: 'Actualización', fr: 'Mise à jour' },
  'reminders.news.feature': {
    en: 'New feature',
    es: 'Nueva función',
    fr: 'Nouvelle fonction',
  },
  'reminders.news.news': { en: 'News', es: 'Novedad', fr: 'Nouvelle' },
});
