import { defineMessages } from '@/i18n/translate';

export const transactionsMessages = defineMessages({
  'transactions.title': { en: 'Transactions', es: 'Movimientos', fr: 'Transactions' },
  'transactions.earlier': { en: 'Earlier', es: 'Anterior', fr: 'Précédent' },
  'transactions.later': { en: 'Later', es: 'Siguiente', fr: 'Suivant' },
  'transactions.search': {
    en: 'Search transactions',
    es: 'Buscar movimientos',
    fr: 'Rechercher des transactions',
  },
  // English reads the same for one and many; Spanish and French agree the adjective.
  'transactions.filtersActive': {
    en: { one: 'Filters, {count} active', other: 'Filters, {count} active' },
    es: { one: 'Filtros, {count} activo', other: 'Filtros, {count} activos' },
    fr: { one: 'Filtres, {count} actif', other: 'Filtres, {count} actifs' },
  },
  'transactions.filterButton': {
    en: 'Filter transactions',
    es: 'Filtrar movimientos',
    fr: 'Filtrer les transactions',
  },
  'transactions.emptyTitle': {
    en: 'Nothing here yet',
    es: 'Aún no hay nada aquí',
    fr: 'Rien ici pour l’instant',
  },
  'transactions.emptyMessage': {
    en: 'Receipts, bills and subscriptions all show up here together once you add a few.',
    es: 'Los recibos, las facturas y las suscripciones aparecen aquí juntos en cuanto agregues algunos.',
    fr: 'Les reçus, factures et abonnements s’affichent ici ensemble dès que tu en ajoutes quelques-uns.',
  },
  'transactions.addReceipt': {
    en: 'Add a receipt',
    es: 'Agregar un recibo',
    fr: 'Ajouter un reçu',
  },
  'transactions.noMatchTitle': {
    en: 'Nothing matches',
    es: 'No hay coincidencias',
    fr: 'Aucun résultat',
  },
  'transactions.noMatchMessage': {
    en: 'No transaction fits that search and those filters.',
    es: 'Ningún movimiento coincide con esa búsqueda y esos filtros.',
    fr: 'Aucune transaction ne correspond à cette recherche et à ces filtres.',
  },
  'transactions.clearFilters': {
    en: 'Clear filters',
    es: 'Borrar filtros',
    fr: 'Effacer les filtres',
  },

  'transactions.kind.income': { en: 'Income', es: 'Ingresos', fr: 'Revenus' },
  'transactions.kind.bill': {
    en: 'Monthly Bills',
    es: 'Facturas mensuales',
    fr: 'Factures mensuelles',
  },
  'transactions.kind.receipt': { en: 'Receipts', es: 'Recibos', fr: 'Reçus' },
  'transactions.kind.subscription': {
    en: 'Subscriptions',
    es: 'Suscripciones',
    fr: 'Abonnements',
  },

  'transactions.summary.shortBy': { en: 'Short by', es: 'Te faltan', fr: 'Il manque' },
  'transactions.summary.leftOver': { en: 'Left over', es: 'Te sobran', fr: 'Il reste' },
  'transactions.summary.nothingYet': { en: 'Nothing yet', es: 'Nada aún', fr: 'Rien encore' },
  'transactions.summary.count': {
    en: { one: '{count} transaction', other: '{count} transactions' },
    es: { one: '{count} movimiento', other: '{count} movimientos' },
    fr: { one: '{count} transaction', other: '{count} transactions' },
  },
  'transactions.summary.income': { en: 'Income', es: 'Ingresos', fr: 'Revenus' },
  'transactions.summary.expenses': { en: 'Expenses', es: 'Gastos', fr: 'Dépenses' },

  'transactions.filter.close': {
    en: 'Close filters',
    es: 'Cerrar filtros',
    fr: 'Fermer les filtres',
  },
  'transactions.filter.title': { en: 'Filter', es: 'Filtrar', fr: 'Filtrer' },
  'transactions.filter.date': { en: 'Date', es: 'Fecha', fr: 'Date' },
  'transactions.filter.anyDate': {
    en: 'Any date',
    es: 'Cualquier fecha',
    fr: 'N’importe quelle date',
  },
  'transactions.filter.clearDate': {
    en: 'Clear date',
    es: 'Borrar fecha',
    fr: 'Effacer la date',
  },
  'transactions.filter.source': {
    en: 'Card or bank account',
    es: 'Tarjeta o cuenta bancaria',
    fr: 'Carte ou compte bancaire',
  },
  'transactions.filter.everySource': {
    en: 'Showing every credit card and account.',
    es: 'Se muestran todas las tarjetas de crédito y cuentas.',
    fr: 'Toutes les cartes de crédit et tous les comptes sont affichés.',
  },
  'transactions.filter.kind': {
    en: 'Type of transaction',
    es: 'Tipo de movimiento',
    fr: 'Type de transaction',
  },
  'transactions.filter.everyKind': {
    en: 'Showing every type.',
    es: 'Se muestran todos los tipos.',
    fr: 'Tous les types sont affichés.',
  },
  'transactions.filter.reset': { en: 'Reset', es: 'Borrar todo', fr: 'Tout effacer' },
  'transactions.filter.apply': { en: 'Apply', es: 'Aplicar', fr: 'Appliquer' },
});
