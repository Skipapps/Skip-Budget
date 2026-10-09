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

  'home.balance.left': { en: 'Current balance', es: 'Saldo actual', fr: 'Solde actuel' },
  'home.balance.summary': {
    en: 'Current balance, {amount}',
    es: 'Saldo actual, {amount}',
    fr: 'Solde actuel, {amount}',
  },
  'home.balance.summaryUnavailable': {
    en: 'Current balance, unavailable',
    es: 'Saldo actual, no disponible',
    fr: 'Solde actuel, non disponible',
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
  'home.tool.loanCalculator': {
    en: 'Loan Calculator',
    es: 'Calculadora de préstamos',
    fr: 'Calculateur de prêt',
  },
  'home.tool.spendingHabits': {
    en: 'Spending Habits',
    es: 'Hábitos de gasto',
    fr: 'Habitudes de dépense',
  },
  'home.tool.habitsLocked': {
    en: 'Spending Habits. Pro feature. See what skipping saves.',
    es: 'Hábitos de gasto. Función Pro. Mira lo que ahorras sin comprar.',
    fr: 'Habitudes de dépense. Fonction Pro. Vois ce que tu économises en t’abstenant.',
  },
  'home.tool.opens': {
    en: '{label}. Opens the tool.',
    es: '{label}. Abre la herramienta.',
    fr: '{label}. Ouvre l’outil.',
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
    en: 'Nothing on this day.',
    es: 'Nada en este día.',
    fr: 'Rien ce jour-là.',
  },
  'home.comingUp': { en: 'Coming up', es: 'Próximos', fr: 'À venir' },
  'home.comingUp.empty': {
    en: 'Nothing due for the rest of this month.',
    es: 'Nada vence en lo que queda del mes.',
    fr: 'Rien à payer jusqu’à la fin du mois.',
  },
});
