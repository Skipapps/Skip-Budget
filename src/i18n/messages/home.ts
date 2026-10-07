import { defineMessages } from '@/i18n/translate';

export const homeMessages = defineMessages({
  /** Stands in for the name until the person gives one. */
  'home.welcome': { en: 'Welcome', es: 'Te damos la bienvenida', fr: 'Bienvenue' },

  'home.header.changePicture': {
    en: 'Change your profile picture',
    es: 'Cambiar tu foto de perfil',
    fr: 'Changer ta photo de profil',
  },
  'home.header.addPicture': {
    en: 'Add a profile picture',
    es: 'Agregar una foto de perfil',
    fr: 'Ajouter une photo de profil',
  },
  'home.header.notifications': {
    en: 'Notifications',
    es: 'Notificaciones',
    fr: 'Notifications',
  },
  'home.header.notificationsNew': {
    en: 'Notifications, new',
    es: 'Notificaciones, nuevas',
    fr: 'Notifications, nouvelles',
  },

  'home.balance.left': {
    en: 'Left this month',
    es: 'Te queda este mes',
    fr: 'Reste ce mois-ci',
  },
  'home.balance.lastDay': { en: 'Last day', es: 'Último día', fr: 'Dernier jour' },
  'home.balance.daysLeft': {
    en: { one: '{count} day left', other: '{count} days left' },
    es: { one: 'Queda {count} día', other: 'Quedan {count} días' },
    fr: { one: '{count} jour restant', other: '{count} jours restants' },
  },
  'home.balance.summary': {
    en: 'Left this month, {amount}, {days}',
    es: 'Te queda este mes, {amount}, {days}',
    fr: 'Reste ce mois-ci, {amount}, {days}',
  },
  'home.balance.summaryUnavailable': {
    en: 'Left this month, unavailable, {days}',
    es: 'Te queda este mes, no disponible, {days}',
    fr: 'Reste ce mois-ci, non disponible, {days}',
  },
  'home.balance.spent': {
    en: '{percent} of the income is spent',
    es: 'Ya se gastó el {percent} de los ingresos',
    fr: '{percent} des revenus sont dépensés',
  },
  'home.balance.income': { en: 'Income', es: 'Ingresos', fr: 'Revenus' },
  'home.balance.expenses': { en: 'Expenses', es: 'Gastos', fr: 'Dépenses' },
  'home.balance.statLoading': {
    en: '{label}, loading',
    es: '{label}, cargando',
    fr: '{label}, chargement',
  },
  'home.balance.statUnavailable': {
    en: '{label}, unavailable',
    es: '{label}, no disponible',
    fr: '{label}, non disponible',
  },

  'home.quickAdd': { en: 'Quick add', es: 'Agregar rápido', fr: 'Ajout rapide' },
  'home.quickAdd.salary': { en: 'Salary', es: 'Salario', fr: 'Salaire' },
  'home.quickAdd.receiptHint': {
    en: 'Add a receipt',
    es: 'Agregar un recibo',
    fr: 'Ajouter un reçu',
  },
  'home.quickAdd.billHint': {
    en: 'Add a bill',
    es: 'Agregar una factura',
    fr: 'Ajouter une facture',
  },
  'home.quickAdd.subscriptionHint': {
    en: 'Add a subscription',
    es: 'Agregar una suscripción',
    fr: 'Ajouter un abonnement',
  },
  'home.quickAdd.salaryHint': {
    en: 'Your salary and where it lands',
    es: 'Tu salario y a dónde llega',
    fr: 'Ton salaire et où il arrive',
  },

  /** What a row came from, under its name; also the Quick add tile labels. */
  'home.kind.receipt': { en: 'Receipt', es: 'Recibo', fr: 'Reçu' },
  'home.kind.bill': { en: 'Bill', es: 'Factura', fr: 'Facture' },
  'home.kind.subscription': { en: 'Subscription', es: 'Suscripción', fr: 'Abonnement' },

  'home.whereItGoes': { en: 'Where it goes', es: 'A dónde se va', fr: 'Où va ton argent' },
  'home.thisMonth': { en: 'This month', es: 'Este mes', fr: 'Ce mois-ci' },
  'home.destination.monthlyBills': {
    en: 'Monthly Bills',
    es: 'Facturas mensuales',
    fr: 'Factures mensuelles',
  },
  'home.destination.receipts': { en: 'Receipts', es: 'Recibos', fr: 'Reçus' },
  'home.destination.subscriptions': {
    en: 'Subscriptions',
    es: 'Suscripciones',
    fr: 'Abonnements',
  },
  'home.destination.loading': {
    en: '{label}, amount loading',
    es: '{label}, cargando el importe',
    fr: '{label}, montant en chargement',
  },
  'home.destination.unavailable': {
    en: '{label}, amount unavailable',
    es: '{label}, importe no disponible',
    fr: '{label}, montant non disponible',
  },
  'home.destination.amount': {
    en: '{label}, {amount}, this month',
    es: '{label}, {amount}, este mes',
    fr: '{label}, {amount}, ce mois-ci',
  },
  'home.destination.open': { en: 'Open', es: 'Abrir', fr: 'Ouvrir' },

  'home.goFurther': { en: 'Go further', es: 'Ve más allá', fr: 'Va plus loin' },
  'home.includedWithPro': {
    en: 'Included with Pro',
    es: 'Incluido con Pro',
    fr: 'Inclus avec Pro',
  },
  'home.tool.loanCalculator': {
    en: 'Loan Calculator',
    es: 'Calculadora de préstamos',
    fr: 'Calculateur de prêt',
  },
  'home.tool.opens': {
    en: '{label}. Opens the tool.',
    es: '{label}. Abre la herramienta.',
    fr: '{label}. Ouvre l’outil.',
  },
  'home.tool.opensLocked': {
    en: '{label}. Pro feature. Opens the tool.',
    es: '{label}. Función Pro. Abre la herramienta.',
    fr: '{label}. Fonction Pro. Ouvre l’outil.',
  },

  'home.insights.title': { en: 'Insights', es: 'Análisis', fr: 'Aperçu' },
  'home.insights.detail': {
    en: 'See the story behind your spending',
    es: 'Descubre la historia detrás de tus gastos',
    fr: 'Découvre l’histoire derrière tes dépenses',
  },
  'home.insights.label': {
    en: 'Insights. See the story behind your spending.',
    es: 'Análisis. Descubre la historia detrás de tus gastos.',
    fr: 'Aperçu. Découvre l’histoire derrière tes dépenses.',
  },
  'home.insights.labelLocked': {
    en: 'Insights. Pro feature. See the story behind your spending.',
    es: 'Análisis. Función Pro. Descubre la historia detrás de tus gastos.',
    fr: 'Aperçu. Fonction Pro. Découvre l’histoire derrière tes dépenses.',
  },

  'home.day.previous': { en: 'Previous day', es: 'Día anterior', fr: 'Jour précédent' },
  'home.day.next': { en: 'Next day', es: 'Día siguiente', fr: 'Jour suivant' },
  'home.day.pick': {
    en: '{weekday} {date}. Choose a date',
    es: '{weekday} {date}. Elegir una fecha',
    fr: '{weekday} {date}. Choisir une date',
  },

  'home.recent': { en: 'Recent', es: 'Recientes', fr: 'Récents' },
  'home.recent.empty': {
    en: 'Nothing in this week.',
    es: 'Nada en esta semana.',
    fr: 'Rien cette semaine.',
  },
  'home.comingUp': { en: 'Coming up', es: 'Próximos', fr: 'À venir' },
  'home.comingUp.empty': {
    en: 'Nothing due in the week ahead.',
    es: 'Nada vence en la próxima semana.',
    fr: 'Rien à payer dans la semaine qui vient.',
  },
});
