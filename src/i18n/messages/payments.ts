import { defineMessages } from '@/i18n/translate';

export const paymentsMessages = defineMessages({
  'payments.month.title.bill': {
    en: 'Monthly bills',
    es: 'Facturas mensuales',
    fr: 'Factures mensuelles',
  },
  'payments.month.title.subscription': {
    en: 'Subscriptions',
    es: 'Suscripciones',
    fr: 'Abonnements',
  },
  'payments.month.dueIn': {
    en: 'Due in {month}',
    es: 'A pagar en {month}',
    fr: 'À payer en {month}',
  },
  'payments.month.chipA11y': {
    en: 'Showing {month}. Choose another month',
    es: 'Mes: {month}. Elige otro mes',
    fr: 'Mois : {month}. Choisis un autre mois',
  },
  // The plural follows {count} alone, but Spanish and French "paid" agrees with {paid}, so those
  // two write the paid and coming figures as labels.
  'payments.month.counts.bill': {
    en: {
      one: '{count} bill · {paid} paid · {coming} coming up',
      other: '{count} bills · {paid} paid · {coming} coming up',
    },
    es: {
      one: '{count} factura · pagadas: {paid} · por pagar: {coming}',
      other: '{count} facturas · pagadas: {paid} · por pagar: {coming}',
    },
    fr: {
      one: '{count} facture · payées : {paid} · à venir : {coming}',
      other: '{count} factures · payées : {paid} · à venir : {coming}',
    },
  },
  'payments.month.counts.subscription': {
    en: {
      one: '{count} subscription · {paid} paid · {coming} coming up',
      other: '{count} subscriptions · {paid} paid · {coming} coming up',
    },
    es: {
      one: '{count} suscripción · pagadas: {paid} · por pagar: {coming}',
      other: '{count} suscripciones · pagadas: {paid} · por pagar: {coming}',
    },
    fr: {
      one: '{count} abonnement · payés : {paid} · à venir : {coming}',
      other: '{count} abonnements · payés : {paid} · à venir : {coming}',
    },
  },
  // A loan paid down early this month: never due, so beside the figure rather than in it.
  'payments.month.extra': {
    en: {
      one: '+ {amount} extra on {name} · {total} in all',
      other: '+ {amount} extra on {count} loans · {total} in all',
    },
    es: {
      one: '+ {amount} de pago extra a {name} · {total} en total',
      other: '+ {amount} de pagos extra a {count} préstamos · {total} en total',
    },
    fr: {
      one: '+ {amount} en plus sur {name} · {total} au total',
      other: '+ {amount} en plus sur {count} prêts · {total} au total',
    },
  },
  'payments.month.nothingDue': {
    en: 'Nothing due in {month}',
    es: 'Nada que pagar en {month}',
    fr: 'Rien à payer en {month}',
  },
  'payments.month.next': {
    en: 'Next: {name} · {date}',
    es: 'Próximo: {name} · {date}',
    fr: 'Prochain : {name} · {date}',
  },
  'payments.month.cardA11y': {
    en: 'Due in {month}: {amount}. {counts}. {next}',
    es: 'A pagar en {month}: {amount}. {counts}. {next}',
    fr: 'À payer en {month} : {amount}. {counts}. {next}',
  },
  'payments.month.comingUp': { en: 'Coming up', es: 'Próximos', fr: 'À venir' },
  'payments.month.allBills': {
    en: 'All bills',
    es: 'Todas las facturas',
    fr: 'Toutes les factures',
  },
  'payments.month.allSubscriptions': {
    en: 'All subscriptions',
    es: 'Todas las suscripciones',
    fr: 'Tous les abonnements',
  },
  'payments.month.stopped': { en: 'Stopped', es: 'Detenidas', fr: 'Arrêtées' },
  'payments.month.cancelled': { en: 'Cancelled', es: 'Canceladas', fr: 'Annulés' },
  'payments.month.seeHistory': {
    en: 'See payment history',
    es: 'Ver historial de pagos',
    fr: 'Voir l’historique des paiements',
  },
  'payments.month.search': {
    en: 'Search payments',
    es: 'Buscar pagos',
    fr: 'Rechercher des paiements',
  },

  'payments.pill.tomorrow': { en: 'Tomorrow', es: 'Mañana', fr: 'Demain' },
  'payments.pill.inDays': {
    en: { one: 'in {count} day', other: 'in {count} days' },
    es: { one: 'en {count} día', other: 'en {count} días' },
    fr: { one: 'dans {count} jour', other: 'dans {count} jours' },
  },

  'payments.status.paid': { en: 'Paid', es: 'Pagado', fr: 'Payé' },
  'payments.status.next': { en: 'Next {date}', es: 'Próximo: {date}', fr: 'Prochain : {date}' },
  'payments.status.ends': {
    en: 'Ends {date}',
    es: 'Termina el {date}',
    fr: 'Se termine le {date}',
  },
  'payments.status.paidOff': { en: 'Paid off', es: 'Liquidado', fr: 'Soldé' },
  'payments.status.extraPayment': {
    en: 'Extra payment',
    es: 'Pago extra',
    fr: 'Paiement supplémentaire',
  },
  'payments.stopped.paidOffOn': {
    en: 'Paid off on {date}',
    es: 'Liquidado el {date}',
    fr: 'Remboursé le {date}',
  },

  'payments.addCard': { en: 'Add a card', es: 'Agregar una tarjeta', fr: 'Ajouter une carte' },
  'payments.addCardHint': {
    en: 'Choose how {name} is paid',
    es: 'Elige cómo se paga {name}',
    fr: 'Choisis le mode de paiement de {name}',
  },
  'payments.cardNotSet': { en: 'Card not set', es: 'Sin tarjeta', fr: 'Aucune carte' },

  'payments.row.a11y': {
    en: '{name}, {amount}, {date}, {source}, {status}',
    es: '{name}, {amount}, {date}, {source}, {status}',
    fr: '{name}, {amount}, {date}, {source}, {status}',
  },
  'payments.planRow.a11y': {
    en: '{name}, {amount}, {recurrence}, {source}, {status}',
    es: '{name}, {amount}, {recurrence}, {source}, {status}',
    fr: '{name}, {amount}, {recurrence}, {source}, {status}',
  },
  'payments.comingRow.a11y': {
    en: '{name}, {amount}, due {date}, {when}, {source}',
    es: '{name}, {amount}, vence el {date}, {when}, {source}',
    fr: '{name}, {amount}, à payer le {date}, {when}, {source}',
  },

  'payments.picker.monthTitle': { en: 'Choose month', es: 'Elige el mes', fr: 'Choisis le mois' },
  'payments.picker.thisMonth': { en: 'This month', es: 'Este mes', fr: 'Ce mois-ci' },
  'payments.picker.comingMonths': {
    en: 'Coming months',
    es: 'Próximos meses',
    fr: 'Mois à venir',
  },
  'payments.picker.olderMonthsPro': {
    en: 'See older months with Pro',
    es: 'Consulta los meses anteriores con Pro',
    fr: 'Consulte les mois précédents avec Pro',
  },
  'payments.learnMore': { en: 'Learn more', es: 'Más información', fr: 'En savoir plus' },

  'payments.history.title': {
    en: 'Payment history',
    es: 'Historial de pagos',
    fr: 'Historique des paiements',
  },
  'payments.history.export': {
    en: 'Export CSV or PDF',
    es: 'Exportar CSV o PDF',
    fr: 'Exporter en CSV ou PDF',
  },
  'payments.history.exportA11y': {
    en: 'Export payments',
    es: 'Exportar pagos',
    fr: 'Exporter les paiements',
  },
  'payments.history.thisYear': { en: 'This year', es: 'Este año', fr: 'Cette année' },
  'payments.history.yearChipA11y': {
    en: 'Showing {year}. Choose another year',
    es: 'Año: {year}. Elige otro año',
    fr: 'Année : {year}. Choisis une autre année',
  },
  'payments.tabs.all': { en: 'All', es: 'Todos', fr: 'Tous' },
  'payments.tabs.bills': { en: 'Bills', es: 'Facturas', fr: 'Factures' },
  'payments.tabs.subscriptions': { en: 'Subscriptions', es: 'Suscripciones', fr: 'Abonnements' },
  'payments.history.paidIn': { en: 'Paid in {year}', es: 'Pagado en {year}', fr: 'Payé en {year}' },
  'payments.history.payments': { en: 'Payments', es: 'Pagos', fr: 'Paiements' },
  'payments.history.avg': { en: 'Avg / month', es: 'Prom. / mes', fr: 'Moy. / mois' },
  'payments.history.cardA11y': {
    en: {
      one: 'Paid in {year}: {amount}. {count} payment. Average {avg} a month.',
      other: 'Paid in {year}: {amount}. {count} payments. Average {avg} a month.',
    },
    es: {
      one: 'Pagado en {year}: {amount}. {count} pago. Promedio de {avg} al mes.',
      other: 'Pagado en {year}: {amount}. {count} pagos. Promedio de {avg} al mes.',
    },
    fr: {
      one: 'Payé en {year} : {amount}. {count} paiement. Moyenne de {avg} par mois.',
      other: 'Payé en {year} : {amount}. {count} paiements. Moyenne de {avg} par mois.',
    },
  },
  'payments.history.barsA11y': {
    en: 'By month: {list}',
    es: 'Por mes: {list}',
    fr: 'Par mois : {list}',
  },
  'payments.history.barA11y': {
    en: '{month} {amount}',
    es: '{month}: {amount}',
    fr: '{month} : {amount}',
  },
  'payments.history.monthA11y': {
    en: '{month}, {amount} paid',
    es: '{month}, pagado: {amount}',
    fr: '{month}, payé : {amount}',
  },
  'payments.history.nonePast': {
    en: 'No payments in {year}.',
    es: 'No hubo pagos en {year}.',
    fr: 'Aucun paiement en {year}.',
  },
  'payments.history.none': {
    en: 'No payments in {year} yet',
    es: 'Aún no hay pagos en {year}',
    fr: 'Pas encore de paiements en {year}',
  },

  'payments.pro.years': {
    en: { one: 'See up to {count} year with Pro', other: 'See up to {count} years with Pro' },
    es: { one: 'Consulta hasta {count} año con Pro', other: 'Consulta hasta {count} años con Pro' },
    fr: {
      one: 'Consulte jusqu’à {count} an avec Pro',
      other: 'Consulte jusqu’à {count} ans avec Pro',
    },
  },
  'payments.pro.badge': { en: 'Pro', es: 'Pro', fr: 'Pro' },
  'payments.pro.yearA11y': {
    en: '{year}, older history with Pro',
    es: '{year}, historial anterior con Pro',
    fr: '{year}, historique plus ancien avec Pro',
  },

  'payments.year.title': { en: 'Choose year', es: 'Elige el año', fr: 'Choisis l’année' },
  'payments.year.thisYear': { en: 'This year', es: 'Este año', fr: 'Cette année' },
  'payments.year.allYears': { en: 'All years', es: 'Todos los años', fr: 'Toutes les années' },
  'payments.year.span': { en: '{first} – {last}', es: '{first} – {last}', fr: '{first} – {last}' },
  'payments.years.title': { en: 'All years', es: 'Todos los años', fr: 'Toutes les années' },
  'payments.years.paidSince': {
    en: 'Paid since {year}',
    es: 'Pagado desde {year}',
    fr: 'Payé depuis {year}',
  },
  'payments.count': {
    en: { one: '{count} payment', other: '{count} payments' },
    es: { one: '{count} pago', other: '{count} pagos' },
    fr: { one: '{count} paiement', other: '{count} paiements' },
  },
  'payments.years.count': {
    en: { one: '{count} year', other: '{count} years' },
    es: { one: '{count} año', other: '{count} años' },
    fr: { one: '{count} an', other: '{count} ans' },
  },
  'payments.years.rowA11y': {
    en: '{year}, {count}, {amount}',
    es: '{year}, {count}, {amount}',
    fr: '{year}, {count}, {amount}',
  },

  'payments.search.placeholder': {
    en: 'Search payments',
    es: 'Buscar pagos',
    fr: 'Rechercher des paiements',
  },
  'payments.search.cancel': { en: 'Cancel', es: 'Cancelar', fr: 'Annuler' },
  'payments.search.recent': { en: 'Recent', es: 'Recientes', fr: 'Récentes' },
  'payments.search.removeRecent': {
    en: 'Remove {query}',
    es: 'Quitar {query}',
    fr: 'Retirer {query}',
  },
  'payments.search.filters': { en: 'Filters', es: 'Filtros', fr: 'Filtres' },
  'payments.search.dateRange': { en: 'Date range', es: 'Rango de fechas', fr: 'Période' },
  'payments.search.anyTime': { en: 'Any time', es: 'Todas las fechas', fr: 'Toutes les dates' },
  'payments.search.amount': { en: 'Amount', es: 'Importe', fr: 'Montant' },
  'payments.search.anyAmount': {
    en: 'Any amount',
    es: 'Cualquier importe',
    fr: 'Tous les montants',
  },
  'payments.search.paidFrom': { en: 'Paid from', es: 'Pagado con', fr: 'Payé avec' },
  'payments.search.allAccounts': {
    en: 'All accounts',
    es: 'Todas las cuentas',
    fr: 'Tous les comptes',
  },
  'payments.search.footerPro': {
    en: {
      one: 'Search across up to {count} year of payments.',
      other: 'Search across up to {count} years of payments.',
    },
    es: {
      one: 'La búsqueda abarca hasta {count} año de pagos.',
      other: 'La búsqueda abarca hasta {count} años de pagos.',
    },
    fr: {
      one: 'La recherche couvre jusqu’à {count} an de paiements.',
      other: 'La recherche couvre jusqu’à {count} ans de paiements.',
    },
  },
  'payments.search.footerFree': {
    en: 'Search your last {days} days of payments. Pro searches up to {years} years.',
    es: 'Busca en tus pagos de los últimos {days} días. Con Pro, hasta {years} años.',
    fr: 'Cherche parmi tes paiements des {days} derniers jours. Avec Pro, jusqu’à {years} ans.',
  },
  'payments.search.results': {
    en: { one: '{count} result · {span}', other: '{count} results · {span}' },
    es: { one: '{count} resultado · {span}', other: '{count} resultados · {span}' },
    fr: { one: '{count} résultat · {span}', other: '{count} résultats · {span}' },
  },
  'payments.search.yearTotal': {
    en: '{amount} · {count}',
    es: '{amount} · {count}',
    fr: '{amount} · {count}',
  },
  'payments.search.more': {
    en: '{newest} – {oldest} · {count} more',
    es: '{newest} – {oldest} · {count} más',
    fr: '{newest} – {oldest} · {count} de plus',
  },
  'payments.search.moreOneYear': {
    en: '{year} · {count} more',
    es: '{year} · {count} más',
    fr: '{year} · {count} de plus',
  },
  'payments.search.filterSet': {
    en: '{filter}: {value}',
    es: '{filter}: {value}',
    fr: '{filter} : {value}',
  },
  'payments.search.noMatches': {
    en: 'No matches? Try a shorter word or another year.',
    es: '¿No lo encuentras? Prueba con una palabra más corta u otro año.',
    fr: 'Rien trouvé ? Essaie un mot plus court ou une autre année.',
  },
  'payments.search.nothing': {
    en: 'No payments match',
    es: 'Ningún pago coincide',
    fr: 'Aucun paiement ne correspond',
  },
  'payments.search.clearFilters': {
    en: 'Clear filters',
    es: 'Borrar filtros',
    fr: 'Effacer les filtres',
  },

  'payments.range.thisMonth': { en: 'This month', es: 'Este mes', fr: 'Ce mois-ci' },
  'payments.range.last3Months': {
    en: 'Last 3 months',
    es: 'Últimos 3 meses',
    fr: '3 derniers mois',
  },
  'payments.range.thisYear': { en: 'This year', es: 'Este año', fr: 'Cette année' },
  'payments.range.lastYear': { en: 'Last year', es: 'El año pasado', fr: 'L’année dernière' },
  'payments.range.custom': { en: 'Pick dates', es: 'Elegir fechas', fr: 'Choisir les dates' },
  'payments.range.from': { en: 'From', es: 'Desde', fr: 'Début' },
  'payments.range.to': { en: 'To', es: 'Hasta', fr: 'Fin' },
  'payments.range.span': { en: '{from} – {to}', es: '{from} – {to}', fr: '{from} – {to}' },

  'payments.amount.min': { en: 'At least', es: 'Mínimo', fr: 'Minimum' },
  'payments.amount.max': { en: 'At most', es: 'Máximo', fr: 'Maximum' },
  'payments.amount.atLeast': {
    en: '{amount} or more',
    es: '{amount} o más',
    fr: '{amount} ou plus',
  },
  'payments.amount.atMost': { en: 'Up to {amount}', es: 'Hasta {amount}', fr: 'Jusqu’à {amount}' },
  'payments.amount.between': { en: '{min} – {max}', es: '{min} – {max}', fr: '{min} – {max}' },
  'payments.amount.order': {
    en: 'The smaller amount must come first.',
    es: 'El importe menor debe ir primero.',
    fr: 'Le plus petit montant doit venir en premier.',
  },

  'payments.filter.apply': { en: 'Show payments', es: 'Ver pagos', fr: 'Voir les paiements' },
  'payments.filter.clear': { en: 'Clear', es: 'Borrar', fr: 'Effacer' },

  'payments.export.title': { en: 'Export', es: 'Exportar', fr: 'Exporter' },
  'payments.export.summary': {
    en: '{count} · {scope}',
    es: '{count} · {scope}',
    fr: '{count} · {scope}',
  },
  'payments.export.allYears': { en: 'All years', es: 'Todos los años', fr: 'Toutes les années' },
  'payments.export.csv': { en: 'CSV', es: 'CSV', fr: 'CSV' },
  'payments.export.csvHint': {
    en: 'For Numbers, Excel or Google Sheets',
    es: 'Para Numbers, Excel o Google Sheets',
    fr: 'Pour Numbers, Excel ou Google Sheets',
  },
  'payments.export.pdf': { en: 'PDF', es: 'PDF', fr: 'PDF' },
  'payments.export.pdfHint': {
    en: 'A statement to print or send',
    es: 'Un estado de cuenta para imprimir o enviar',
    fr: 'Un relevé à imprimer ou à envoyer',
  },
  'payments.export.busy': { en: 'Preparing…', es: 'Preparando…', fr: 'Préparation…' },
  'payments.export.none': {
    en: 'Nothing to export for {scope}.',
    es: 'No hay nada que exportar de {scope}.',
    fr: 'Rien à exporter pour {scope}.',
  },
  'payments.export.noneAllYears': {
    en: 'Nothing to export yet.',
    es: 'Aún no hay nada que exportar.',
    fr: 'Rien à exporter pour l’instant.',
  },
  'payments.export.everything': {
    en: 'Bills and subscriptions',
    es: 'Facturas y suscripciones',
    fr: 'Factures et abonnements',
  },
  'payments.export.col.date': { en: 'Date', es: 'Fecha', fr: 'Date' },
  'payments.export.col.name': { en: 'Name', es: 'Nombre', fr: 'Nom' },
  'payments.export.col.kind': { en: 'Kind', es: 'Tipo', fr: 'Type' },
  'payments.export.col.amount': {
    en: 'Amount ({currency})',
    es: 'Importe ({currency})',
    fr: 'Montant ({currency})',
  },
  'payments.export.col.paidFrom': { en: 'Paid from', es: 'Pagado con', fr: 'Payé avec' },
  'payments.export.kind.bill': { en: 'Bill', es: 'Factura', fr: 'Facture' },
  'payments.export.kind.subscription': {
    en: 'Subscription',
    es: 'Suscripción',
    fr: 'Abonnement',
  },
  'payments.export.total': { en: 'Total', es: 'Total', fr: 'Total' },
  'payments.export.made': {
    en: 'Made with Skip Budget on {date}',
    es: 'Hecho con Skip Budget el {date}',
    fr: 'Créé avec Skip Budget le {date}',
  },
});
