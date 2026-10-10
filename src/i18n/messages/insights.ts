import { defineMessages } from '@/i18n/translate';

export const insightsMessages = defineMessages({
  'insights.title': { en: 'Insights', es: 'Análisis', fr: 'Aperçu' },

  'insights.in.heading': { en: 'What comes in', es: 'Lo que entra', fr: 'Ce qui entre' },
  'insights.in.everyMonth': { en: 'Every month', es: 'Cada mes', fr: 'Chaque mois' },
  'insights.in.thisMonth': { en: 'This month', es: 'Este mes', fr: 'Ce mois-ci' },
  'insights.in.onceThisMonth': {
    en: '+ {amount} paid once this month',
    es: '+ {amount} pagado una vez este mes',
    fr: '+ {amount} payé une fois ce mois-ci',
  },
  'insights.in.paidOnce': {
    en: { one: 'from {count} one-off pay', other: 'from {count} one-off pays' },
    es: { one: 'de {count} pago único', other: 'de {count} pagos únicos' },
    fr: { one: 'de {count} paie unique', other: 'de {count} paies uniques' },
  },
  'insights.in.sources': {
    en: { one: 'from {count} source', other: 'from {count} sources' },
    es: { one: 'de {count} fuente', other: 'de {count} fuentes' },
    fr: { one: 'de {count} source', other: 'de {count} sources' },
  },
  'insights.in.emptyTitle': {
    en: 'Skip does not know what you earn yet',
    es: 'Skip aún no sabe cuánto ganas',
    fr: 'Skip ne sait pas encore combien tu gagnes',
  },
  'insights.in.emptyMessage': {
    en: 'Adding your pay is what turns this page from a record of what you spent into a picture of what you can afford.',
    es: 'Con tu salario, esta página deja de ser solo un registro de lo que gastaste y te muestra lo que puedes permitirte.',
    fr: 'Une fois ta paie ajoutée, cette page ne montre plus seulement ce que tu as dépensé, mais aussi ce que tu peux te permettre.',
  },
  'insights.in.setUp': {
    en: 'Set up payday',
    es: 'Configurar día de pago',
    fr: 'Configurer le jour de paie',
  },

  'insights.out.heading': { en: 'What goes out', es: 'Lo que sale', fr: 'Ce qui sort' },
  'insights.out.thisWeek': { en: 'This week', es: 'Esta semana', fr: 'Cette semaine' },
  'insights.out.thisMonth': { en: 'This month', es: 'Este mes', fr: 'Ce mois-ci' },
  'insights.out.thisYear': { en: 'This year', es: 'Este año', fr: 'Cette année' },
  'insights.out.allTime': { en: 'All time', es: 'Desde el inicio', fr: 'Depuis le début' },
  'insights.out.receipts': {
    en: 'Shop receipts',
    es: 'Recibos de compras',
    fr: 'Reçus d’achats',
  },
  'insights.out.bills': { en: 'Bills', es: 'Facturas', fr: 'Factures' },
  'insights.out.subscriptions': {
    en: 'Subscriptions',
    es: 'Suscripciones',
    fr: 'Abonnements',
  },
  'insights.out.recorded': {
    en: 'Recorded in this period',
    es: 'Registrado en este periodo',
    fr: 'Enregistré pour cette période',
  },

  'insights.goes.heading': { en: 'Where it goes', es: 'A dónde se va', fr: 'Où va l’argent' },
  'insights.most.heading': {
    en: 'Where you spend most',
    es: 'Dónde gastas más',
    fr: 'Où tu dépenses le plus',
  },
  'insights.most.times': {
    en: { one: '{count} time', other: '{count} times' },
    es: { one: '{count} vez', other: '{count} veces' },
    fr: { one: '{count} fois', other: '{count} fois' },
  },

  'insights.owe.heading': { en: 'What you owe', es: 'Lo que debes', fr: 'Ce que tu dois' },

  'insights.coming.heading': { en: 'Coming up', es: 'Próximos', fr: 'À venir' },
  'insights.coming.perMonth': { en: '{amount}/mo', es: '{amount}/mes', fr: '{amount}/mois' },
  'insights.coming.overYear': {
    en: '{amount} over a year',
    es: '{amount} al año',
    fr: '{amount} sur un an',
  },

  // Bill categories by their stored id; the English is the label the bill picker shows.
  'insights.billCategory.housing': { en: 'Housing', es: 'Vivienda', fr: 'Logement' },
  'insights.billCategory.energy': {
    en: 'Electricity & Gas',
    es: 'Luz y gas',
    fr: 'Électricité et gaz',
  },
  'insights.billCategory.water': { en: 'Water & Waste', es: 'Agua y basura', fr: 'Eau et déchets' },
  'insights.billCategory.internet': { en: 'Internet', es: 'Internet', fr: 'Internet' },
  'insights.billCategory.mobile': { en: 'Mobile Phone', es: 'Celular', fr: 'Cellulaire' },
  'insights.billCategory.insurance': { en: 'Insurance', es: 'Seguros', fr: 'Assurances' },
  'insights.billCategory.loans': {
    en: 'Loans & Credit',
    es: 'Préstamos y crédito',
    fr: 'Prêts et crédit',
  },
  'insights.billCategory.transport': {
    en: 'Transportation',
    es: 'Transporte',
    fr: 'Transport',
  },
  'insights.billCategory.health': {
    en: 'Health & Medical',
    es: 'Salud y gastos médicos',
    fr: 'Santé et soins médicaux',
  },
  'insights.billCategory.education': { en: 'Education', es: 'Educación', fr: 'Éducation' },
  'insights.billCategory.other': { en: 'Other bill', es: 'Otra factura', fr: 'Autre facture' },
});
