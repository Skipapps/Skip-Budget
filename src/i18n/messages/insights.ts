import { defineMessages } from '@/i18n/translate';

export const insightsMessages = defineMessages({
  'insights.title': { en: 'Insights', es: 'Análisis', fr: 'Aperçu' },

  'insights.seeAll': { en: 'See all', es: 'Ver todo', fr: 'Tout voir' },
  'insights.seeAllA11y': {
    en: 'See all: {section}',
    es: 'Ver todo: {section}',
    fr: 'Tout voir : {section}',
  },

  'insights.hero.left': {
    en: 'Left this month',
    es: 'Te queda este mes',
    fr: 'Reste ce mois-ci',
  },
  'insights.hero.over': {
    en: 'Over this month',
    es: 'Te pasaste este mes',
    fr: 'Dépassement ce mois-ci',
  },
  'insights.hero.inOut': {
    en: '{in} in · {out} out',
    es: 'Entra {in} · Sale {out}',
    fr: 'Entrées {in} · Sorties {out}',
  },
  'insights.hero.spentShare': {
    en: 'You’ve spent {percent} of your income so far.',
    es: 'Llevas gastado el {percent} de tus ingresos.',
    fr: 'Tu as dépensé {percent} de tes revenus jusqu’ici.',
  },
  /** Spent, but under half a percent: "0%" would say nothing was spent. */
  'insights.hero.spentShareUnder': {
    en: 'You’ve spent less than {percent} of your income so far.',
    es: 'Llevas gastado menos del {percent} de tus ingresos.',
    fr: 'Tu as dépensé moins de {percent} de tes revenus jusqu’ici.',
  },
  'insights.hero.a11y': {
    en: '{label}: {amount}. {in} in, {out} out.',
    es: '{label}: {amount}. Entra {in}, sale {out}.',
    fr: '{label} : {amount}. Entrées {in}, sorties {out}.',
  },

  'insights.in.heading': { en: 'What comes in', es: 'Lo que entra', fr: 'Ce qui entre' },
  'insights.in.subtitle': {
    en: 'Money you receive',
    es: 'El dinero que recibes',
    fr: 'L’argent que tu reçois',
  },
  'insights.in.salary': { en: 'Salary', es: 'Salario', fr: 'Salaire' },
  'insights.in.everyMonthSources': {
    en: { one: 'Every month · {count} source', other: 'Every month · {count} sources' },
    es: { one: 'Cada mes · {count} fuente', other: 'Cada mes · {count} fuentes' },
    fr: { one: 'Chaque mois · {count} source', other: 'Chaque mois · {count} sources' },
  },
  'insights.in.thisMonthOnce': {
    en: { one: 'This month · {count} one-off pay', other: 'This month · {count} one-off pays' },
    es: { one: 'Este mes · {count} pago único', other: 'Este mes · {count} pagos únicos' },
    fr: { one: 'Ce mois-ci · {count} paie unique', other: 'Ce mois-ci · {count} paies uniques' },
  },
  'insights.in.onceThisMonth': {
    en: '+ {amount} paid once this month',
    es: '+ {amount} pagado una vez este mes',
    fr: '+ {amount} payé une fois ce mois-ci',
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
  'insights.out.subtitle': {
    en: 'Money you spend in this period',
    es: 'El dinero que gastas en este periodo',
    fr: 'L’argent que tu dépenses pendant cette période',
  },
  'insights.out.thisMonth': { en: 'This month', es: 'Este mes', fr: 'Ce mois-ci' },
  'insights.out.thisYear': { en: 'This year', es: 'Este año', fr: 'Cette année' },
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
  /** One bar of the chart as VoiceOver reads it: "1–3: $1,500.00", "October: $1,599.99". */
  'insights.out.bar': {
    en: '{label}: {amount}',
    es: '{label}: {amount}',
    fr: '{label} : {amount}',
  },

  'insights.period.month': { en: 'Month', es: 'Mes', fr: 'Mois' },
  'insights.period.year': { en: 'Year', es: 'Año', fr: 'Année' },
  'insights.period.chooseMonthA11y': {
    en: 'Showing {month}. Choose another month',
    es: 'Mostrando {month}. Elige otro mes',
    fr: 'Affichage : {month}. Choisis un autre mois',
  },
  'insights.period.chooseYearA11y': {
    en: 'Showing {year}. Choose another year',
    es: 'Mostrando {year}. Elige otro año',
    fr: 'Affichage : {year}. Choisis une autre année',
  },
  'insights.period.byMonthA11y': {
    en: 'Show one month',
    es: 'Ver un mes',
    fr: 'Afficher un mois',
  },
  'insights.period.byYearA11y': {
    en: 'Show the whole year',
    es: 'Ver todo el año',
    fr: 'Afficher toute l’année',
  },

  'insights.goes.heading': { en: 'Where it goes', es: 'A dónde se va', fr: 'Où va l’argent' },
  'insights.goes.subtitle': {
    en: 'Spending by category',
    es: 'Gastos por categoría',
    fr: 'Dépenses par catégorie',
  },
  'insights.most.heading': {
    en: 'Where you spend most',
    es: 'Dónde gastas más',
    fr: 'Où tu dépenses le plus',
  },
  'insights.most.subtitle': {
    en: 'Places you spend the most',
    es: 'Los lugares donde más gastas',
    fr: 'Les endroits où tu dépenses le plus',
  },
  'insights.most.times': {
    en: { one: '{count} time', other: '{count} times' },
    es: { one: '{count} vez', other: '{count} veces' },
    fr: { one: '{count} fois', other: '{count} fois' },
  },

  'insights.owe.heading': { en: 'What you owe', es: 'Lo que debes', fr: 'Ce que tu dois' },
  'insights.owe.subtitle': {
    en: 'Money you owe on cards',
    es: 'Lo que debes en tarjetas',
    fr: 'Ce que tu dois sur tes cartes',
  },

  'insights.loans.heading': { en: 'Loans', es: 'Préstamos', fr: 'Prêts' },
  'insights.loans.subtitle': {
    en: 'Money you owe on loans',
    es: 'Lo que debes en préstamos',
    fr: 'Ce que tu dois sur tes prêts',
  },
  'insights.loans.total': { en: 'Total you owe', es: 'Total que debes', fr: 'Total dû' },
  'insights.loans.count': {
    en: { one: '{count} loan', other: '{count} loans' },
    es: { one: '{count} préstamo', other: '{count} préstamos' },
    fr: { one: '{count} prêt', other: '{count} prêts' },
  },
  'insights.loans.paidOff': {
    en: '{percent} paid off',
    es: '{percent} pagado',
    fr: '{percent} remboursé',
  },
  'insights.loans.totalA11y': {
    en: 'Total you owe: {amount}. {loans}. {paid}.',
    es: 'Total que debes: {amount}. {loans}. {paid}.',
    fr: 'Total dû : {amount}. {loans}. {paid}.',
  },
  'insights.loans.next': {
    en: '{name} · next {date}',
    es: '{name} · próximo {date}',
    fr: '{name} · prochain {date}',
  },
  'insights.loans.monthly': {
    en: 'Monthly payments',
    es: 'Pagos mensuales',
    fr: 'Paiements mensuels',
  },
  'insights.loans.empty': {
    en: 'No loans yet',
    es: 'Aún no hay préstamos',
    fr: 'Aucun prêt pour l’instant',
  },
  'insights.loans.noneOpen': {
    en: 'No open loans',
    es: 'No hay préstamos activos',
    fr: 'Aucun prêt en cours',
  },
  'insights.loans.add': { en: 'Add a loan', es: 'Agregar un préstamo', fr: 'Ajouter un prêt' },

  'insights.plans.heading': {
    en: 'Bills & subscriptions',
    es: 'Facturas y suscripciones',
    fr: 'Factures et abonnements',
  },
  'insights.plans.subtitle': {
    en: 'What you pay every month',
    es: 'Lo que pagas cada mes',
    fr: 'Ce que tu paies chaque mois',
  },
  'insights.plans.bills': {
    en: 'Bills · {count}',
    es: 'Facturas · {count}',
    fr: 'Factures · {count}',
  },
  'insights.plans.subscriptions': {
    en: 'Subscriptions · {count}',
    es: 'Suscripciones · {count}',
    fr: 'Abonnements · {count}',
  },
  'insights.plans.nextDue': { en: 'Next due', es: 'Próximos pagos', fr: 'Prochaines échéances' },
  'insights.plans.dueOn': { en: '{name} · {date}', es: '{name} · {date}', fr: '{name} · {date}' },

  'insights.coming.heading': { en: 'Coming up', es: 'Próximos', fr: 'À venir' },
  'insights.coming.subtitle': {
    en: 'Regular costs ahead',
    es: 'Gastos fijos por venir',
    fr: 'Dépenses régulières à venir',
  },
  'insights.coming.perMonth': { en: '{amount}/mo', es: '{amount}/mes', fr: '{amount}/mois' },
  'insights.coming.overYear': {
    en: '{amount} over a year',
    es: '{amount} al año',
    fr: '{amount} sur un an',
  },

  'insights.habits.heading': { en: 'Habits', es: 'Hábitos', fr: 'Habitudes' },
  'insights.habits.subtitle': {
    en: 'What you saved by skipping',
    es: 'Lo que ahorraste al no comprar',
    fr: 'Ce que tu as économisé sans acheter',
  },
  'insights.habits.skipped': {
    en: { one: 'Skipped {count} time this week', other: 'Skipped {count} times this week' },
    es: {
      one: '{count} día sin comprar esta semana',
      other: '{count} días sin comprar esta semana',
    },
    fr: {
      one: '{count} jour sans achat cette semaine',
      other: '{count} jours sans achat cette semaine',
    },
  },
  'insights.habits.savedSoFar': {
    en: 'Saved so far',
    es: 'Ahorrado hasta ahora',
    fr: 'Économisé jusqu’ici',
  },
  'insights.habits.empty': {
    en: 'No habits yet',
    es: 'Aún no hay hábitos',
    fr: 'Aucune habitude pour l’instant',
  },
  'insights.habits.add': {
    en: 'Start a habit',
    es: 'Empezar un hábito',
    fr: 'Commencer une habitude',
  },

  'insights.goals.heading': { en: 'Goals', es: 'Metas', fr: 'Objectifs' },
  'insights.goals.subtitle': {
    en: 'Progress toward what you’re saving for',
    es: 'Cómo vas con lo que estás ahorrando',
    fr: 'Où tu en es pour ce que tu mets de côté',
  },
  'insights.goals.saved': {
    en: 'Saved toward goals',
    es: 'Ahorrado para tus metas',
    fr: 'Mis de côté pour tes objectifs',
  },
  'insights.goals.ofActive': {
    en: { one: 'of {target} · {count} active', other: 'of {target} · {count} active' },
    es: { one: 'de {target} · {count} activa', other: 'de {target} · {count} activas' },
    fr: { one: 'sur {target} · {count} actif', other: 'sur {target} · {count} actifs' },
  },
  'insights.goals.goalOf': {
    en: '{saved} of {target}',
    es: '{saved} de {target}',
    fr: '{saved} sur {target}',
  },
  'insights.goals.empty': {
    en: 'No goals yet',
    es: 'Aún no hay metas',
    fr: 'Aucun objectif pour l’instant',
  },
  'insights.goals.noneActive': {
    en: 'No active goals',
    es: 'No hay metas activas',
    fr: 'Aucun objectif actif',
  },
  'insights.goals.add': { en: 'Add a goal', es: 'Agregar una meta', fr: 'Ajouter un objectif' },

  'insights.savings.heading': { en: 'Savings', es: 'Ahorros', fr: 'Épargne' },
  'insights.savings.subtitle': {
    en: 'Money set aside',
    es: 'Dinero apartado',
    fr: 'Argent mis de côté',
  },
  'insights.savings.moved': {
    en: 'Moved this month',
    es: 'Movido este mes',
    fr: 'Transféré ce mois-ci',
  },
  'insights.savings.total': {
    en: 'Total in savings',
    es: 'Total en ahorros',
    fr: 'Total de l’épargne',
  },
  'insights.savings.share': {
    en: 'About {percent} of this month’s income',
    es: 'Cerca del {percent} de los ingresos de este mes',
    fr: 'Environ {percent} des revenus de ce mois-ci',
  },
  /** Moved, but under half a percent of the income. */
  'insights.savings.shareUnder': {
    en: 'Less than {percent} of this month’s income',
    es: 'Menos del {percent} de los ingresos de este mes',
    fr: 'Moins de {percent} des revenus de ce mois-ci',
  },
  'insights.savings.empty': {
    en: 'Nothing in savings yet',
    es: 'Aún no hay nada en ahorros',
    fr: 'Rien dans l’épargne pour l’instant',
  },
  'insights.savings.open': { en: 'See savings', es: 'Ver ahorros', fr: 'Voir l’épargne' },

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
