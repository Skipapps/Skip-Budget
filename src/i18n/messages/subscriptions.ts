import { defineMessages } from '@/i18n/translate';

export const subscriptionsMessages = defineMessages({
  // Weekly and Monthly are dates.weekly and dates.monthly.
  'subscriptions.cycle.quarterly': {
    en: 'Quarterly',
    es: 'Trimestral',
    fr: 'Chaque trimestre',
  },
  'subscriptions.cycle.yearly': { en: 'Yearly', es: 'Anual', fr: 'Chaque année' },

  'subscriptions.active': { en: 'Active', es: 'Activa', fr: 'Actif' },
  'subscriptions.cancelled': { en: 'Cancelled', es: 'Cancelada', fr: 'Annulé' },
  'subscriptions.addSubscription': {
    en: 'Add subscription',
    es: 'Agregar suscripción',
    fr: 'Ajouter un abonnement',
  },
  'subscriptions.addASubscription': {
    en: 'Add a subscription',
    es: 'Agregar una suscripción',
    fr: 'Ajouter un abonnement',
  },
  'subscriptions.noSubscriptionsYet': {
    en: 'No subscriptions yet',
    es: 'Aún no hay suscripciones',
    fr: 'Pas encore d’abonnements',
  },
  'subscriptions.noPaymentMethod': {
    en: 'No payment method',
    es: 'Sin forma de pago',
    fr: 'Aucun mode de paiement',
  },
  'subscriptions.goBack': { en: 'Go back', es: 'Regresar', fr: 'Revenir' },

  'subscriptions.field.service': { en: 'Service', es: 'Servicio', fr: 'Service' },
  'subscriptions.field.chargedTo': { en: 'Charged to', es: 'Se cobra a', fr: 'Prélevé sur' },
  'subscriptions.field.note': { en: 'Note', es: 'Nota', fr: 'Note' },
  'subscriptions.field.status': { en: 'Status', es: 'Estado', fr: 'Statut' },
  'subscriptions.field.billingCycle': {
    en: 'Billing cycle',
    es: 'Ciclo de cobro',
    fr: 'Cycle de facturation',
  },

  'subscriptions.add.titleEdit': {
    en: 'Edit subscription',
    es: 'Editar suscripción',
    fr: 'Modifier l’abonnement',
  },
  'subscriptions.add.closeNew': {
    en: 'Cancel adding this subscription?',
    es: '¿Dejar de agregar esta suscripción?',
    fr: 'Annuler l’ajout de cet abonnement ?',
  },
  'subscriptions.add.closeEdit': {
    en: 'Cancel editing this subscription?',
    es: '¿Dejar de editar esta suscripción?',
    fr: 'Annuler la modification de cet abonnement ?',
  },
  'subscriptions.add.amountQuestion': {
    en: 'How much does it cost?',
    es: '¿Cuánto cuesta?',
    fr: 'Combien ça coûte ?',
  },
  'subscriptions.add.renewQuestion': {
    en: 'When does it renew?',
    es: '¿Cuándo se renueva?',
    fr: 'Quand se renouvelle-t-il ?',
  },
  'subscriptions.add.askService': {
    en: 'Which service is it?',
    es: '¿Qué servicio es?',
    fr: 'Quel est le service ?',
  },
  'subscriptions.add.noRenewal': {
    en: 'No renewal date',
    es: 'Sin fecha de renovación',
    fr: 'Aucune date de renouvellement',
  },
  'subscriptions.add.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },
  'subscriptions.add.saveChanges': {
    en: 'Save changes',
    es: 'Guardar cambios',
    fr: 'Enregistrer les modifications',
  },
  'subscriptions.add.saveSubscription': {
    en: 'Save subscription',
    es: 'Guardar suscripción',
    fr: 'Enregistrer l’abonnement',
  },
  'subscriptions.add.deleteTitle': {
    en: 'Delete this subscription?',
    es: '¿Eliminar esta suscripción?',
    fr: 'Supprimer cet abonnement ?',
  },
  'subscriptions.add.deleteMessage': {
    en: 'This cannot be undone.',
    es: 'Esto no se puede deshacer.',
    fr: 'Cette action est irréversible.',
  },
  'subscriptions.add.deleteA11y': {
    en: 'Delete this subscription',
    es: 'Eliminar esta suscripción',
    fr: 'Supprimer cet abonnement',
  },
  'subscriptions.add.deleting': { en: 'Deleting…', es: 'Eliminando…', fr: 'Suppression…' },
  'subscriptions.add.deleteSubscription': {
    en: 'Delete subscription',
    es: 'Eliminar suscripción',
    fr: 'Supprimer l’abonnement',
  },
  'subscriptions.add.changeService': {
    en: 'Change service, currently {name}',
    es: 'Cambiar servicio, ahora es {name}',
    fr: 'Changer de service, actuellement {name}',
  },
  'subscriptions.add.addServiceAs': {
    en: 'Add {name} as a new service',
    es: 'Agregar {name} como servicio nuevo',
    fr: 'Ajouter {name} comme nouveau service',
  },
  'subscriptions.add.servicePlaceholder': {
    en: 'Search for a service',
    es: 'Busca un servicio',
    fr: 'Cherche un service',
  },
  'subscriptions.add.notePlaceholder': {
    en: 'Which plan, for example',
    es: 'Qué plan, por ejemplo',
    fr: 'Quel forfait, par exemple',
  },
  'subscriptions.add.filedUnder': {
    en: 'Filed under {category}',
    es: 'Archivada en {category}',
    fr: 'Classé dans {category}',
  },

  // A service's spending category, stored by id; the database label is English only.
  'subscriptions.spendCategory.groceries': {
    en: 'Groceries',
    es: 'Supermercado',
    fr: 'Épicerie',
  },
  'subscriptions.spendCategory.dining': {
    en: 'Dining & Takeout',
    es: 'Restaurantes y comida para llevar',
    fr: 'Restaurants et mets à emporter',
  },
  'subscriptions.spendCategory.fuel': {
    en: 'Fuel & Convenience',
    es: 'Gasolina y tiendas de conveniencia',
    fr: 'Essence et dépanneurs',
  },
  'subscriptions.spendCategory.pharmacy': {
    en: 'Pharmacy & Health',
    es: 'Farmacia y salud',
    fr: 'Pharmacie et santé',
  },
  'subscriptions.spendCategory.shopping': { en: 'Shopping', es: 'Compras', fr: 'Magasinage' },
  'subscriptions.spendCategory.clothing': { en: 'Clothing', es: 'Ropa', fr: 'Vêtements' },
  'subscriptions.spendCategory.electronics': {
    en: 'Electronics',
    es: 'Electrónica',
    fr: 'Électronique',
  },
  'subscriptions.spendCategory.home': {
    en: 'Home & Hardware',
    es: 'Hogar y ferretería',
    fr: 'Maison et quincaillerie',
  },
  'subscriptions.spendCategory.beauty': { en: 'Beauty', es: 'Belleza', fr: 'Beauté' },
  'subscriptions.spendCategory.pets': { en: 'Pets', es: 'Mascotas', fr: 'Animaux' },
  'subscriptions.spendCategory.entertainment': {
    en: 'Entertainment',
    es: 'Entretenimiento',
    fr: 'Divertissement',
  },
  'subscriptions.spendCategory.software': {
    en: 'Apps & Software',
    es: 'Apps y software',
    fr: 'Applis et logiciels',
  },
  'subscriptions.spendCategory.fitness': {
    en: 'Fitness & Wellness',
    es: 'Ejercicio y bienestar',
    fr: 'Forme et bien-être',
  },
  'subscriptions.spendCategory.news': {
    en: 'News & Learning',
    es: 'Noticias y aprendizaje',
    fr: 'Actualités et apprentissage',
  },
  'subscriptions.spendCategory.meals': {
    en: 'Meal Kits',
    es: 'Kits de comida',
    fr: 'Boîtes-repas',
  },
  'subscriptions.spendCategory.memberships': {
    en: 'Memberships',
    es: 'Membresías',
    fr: 'Adhésions',
  },
  'subscriptions.spendCategory.transport': {
    en: 'Transport',
    es: 'Transporte',
    fr: 'Transport',
  },
  'subscriptions.spendCategory.utilities': {
    en: 'Utilities',
    es: 'Servicios',
    fr: 'Services publics',
  },
  'subscriptions.spendCategory.telecom': {
    en: 'Phone & Internet',
    es: 'Teléfono e internet',
    fr: 'Téléphone et Internet',
  },
  'subscriptions.spendCategory.insurance': {
    en: 'Insurance',
    es: 'Seguros',
    fr: 'Assurances',
  },
  'subscriptions.spendCategory.finance': {
    en: 'Banking & Loans',
    es: 'Bancos y préstamos',
    fr: 'Banques et prêts',
  },
  'subscriptions.spendCategory.other': { en: 'Other', es: 'Otros', fr: 'Autre' },

  'subscriptions.plans.title': {
    en: 'Your subscriptions',
    es: 'Tus suscripciones',
    fr: 'Tes abonnements',
  },
  'subscriptions.plans.search': {
    en: 'Search subscriptions',
    es: 'Buscar suscripciones',
    fr: 'Rechercher des abonnements',
  },
  'subscriptions.plans.filtersActive': {
    en: { one: 'Filters, {count} active', other: 'Filters, {count} active' },
    es: { one: 'Filtros, {count} activo', other: 'Filtros, {count} activos' },
    fr: { one: 'Filtres, {count} actif', other: 'Filtres, {count} actifs' },
  },
  'subscriptions.plans.loading': { en: 'Loading', es: 'Cargando', fr: 'Chargement' },
  // Counted on the whole list, as the English always was.
  'subscriptions.plans.countOf': {
    en: {
      one: '{shown} of {count} subscriptions',
      other: '{shown} of {count} subscriptions',
    },
    es: { one: '{shown} de {count} suscripción', other: '{shown} de {count} suscripciones' },
    fr: { one: '{shown} sur {count} abonnement', other: '{shown} sur {count} abonnements' },
  },
  'subscriptions.plans.count': {
    en: { one: '{count} subscription', other: '{count} subscriptions' },
    es: { one: '{count} suscripción', other: '{count} suscripciones' },
    fr: { one: '{count} abonnement', other: '{count} abonnements' },
  },
  'subscriptions.plans.perMonth': { en: '/ mo', es: '/ mes', fr: '/ mois' },
  'subscriptions.plans.emptyMessage': {
    en: 'Add the ones you pay for and Skip will show what they cost you each month.',
    es: 'Agrega las que pagas y Skip te mostrará cuánto te cuestan cada mes.',
    fr: 'Ajoute ceux que tu paies et Skip te montrera ce qu’ils te coûtent chaque mois.',
  },
  'subscriptions.plans.noMatchTitle': {
    en: 'Nothing matches',
    es: 'Nada coincide',
    fr: 'Aucun résultat',
  },
  'subscriptions.plans.noMatchMessage': {
    en: 'No subscription fits that search and those filters. Try a different name or clear what you have set.',
    es: 'Ninguna suscripción coincide con esa búsqueda y esos filtros. Prueba otro nombre o borra lo que elegiste.',
    fr: 'Aucun abonnement ne correspond à cette recherche et à ces filtres. Essaie un autre nom ou efface ce que tu as choisi.',
  },
  'subscriptions.plans.clearFilters': {
    en: 'Clear filters',
    es: 'Borrar filtros',
    fr: 'Effacer les filtres',
  },

  'subscriptions.renewals.title': { en: 'Subscriptions', es: 'Suscripciones', fr: 'Abonnements' },
  'subscriptions.renewals.label': {
    en: 'Renewals charged',
    es: 'Renovaciones cobradas',
    fr: 'Renouvellements prélevés',
  },
  'subscriptions.renewals.nothing': {
    en: 'Nothing in this window',
    es: 'Nada en este periodo',
    fr: 'Rien dans cette période',
  },
  'subscriptions.renewals.count': {
    en: { one: '{count} charge', other: '{count} charges' },
    es: { one: '{count} cargo', other: '{count} cargos' },
    fr: { one: '{count} prélèvement', other: '{count} prélèvements' },
  },
  'subscriptions.renewals.emptyMessage': {
    en: 'Add the ones you pay for and every renewal shows up here as it happens.',
    es: 'Agrega las que pagas y cada renovación aparecerá aquí en cuanto ocurra.',
    fr: 'Ajoute ceux que tu paies et chaque renouvellement s’affichera ici dès qu’il a lieu.',
  },
  'subscriptions.renewals.windowMessage': {
    en: 'Nothing renewed in this stretch of time. Try a wider window.',
    es: 'Nada se renovó en este periodo. Prueba con uno más amplio.',
    fr: 'Rien ne s’est renouvelé dans cette période. Essaie une période plus longue.',
  },

  'subscriptions.detail.nextRenewal': {
    en: 'Next renewal',
    es: 'Próxima renovación',
    fr: 'Prochain renouvellement',
  },
  'subscriptions.detail.paidFrom': { en: 'Paid from', es: 'Se paga con', fr: 'Payé avec' },
  'subscriptions.detail.started': { en: 'Started', es: 'Inicio', fr: 'Début' },

  'subscriptions.filter.close': {
    en: 'Close filters',
    es: 'Cerrar filtros',
    fr: 'Fermer les filtres',
  },
  'subscriptions.filter.title': {
    en: 'Filter subscriptions',
    es: 'Filtrar suscripciones',
    fr: 'Filtrer les abonnements',
  },
  'subscriptions.filter.everyCycle': {
    en: 'Showing every cycle.',
    es: 'Se muestran todos los ciclos.',
    fr: 'Tous les cycles sont affichés.',
  },
  'subscriptions.filter.everySource': {
    en: 'Showing every credit card and account.',
    es: 'Se muestran todas las tarjetas de crédito y cuentas.',
    fr: 'Toutes les cartes de crédit et tous les comptes sont affichés.',
  },
  'subscriptions.filter.reset': { en: 'Reset', es: 'Borrar', fr: 'Effacer' },
  'subscriptions.filter.apply': { en: 'Apply', es: 'Aplicar', fr: 'Appliquer' },

  'subscriptions.row.a11y': {
    en: '{name}, {amount} {cycle}',
    es: '{name}, {amount} {cycle}',
    fr: '{name}, {amount} {cycle}',
  },
  'subscriptions.row.a11ySource': {
    en: '{name}, {amount} {cycle}, charged to {source}',
    es: '{name}, {amount} {cycle}, se cobra a {source}',
    fr: '{name}, {amount} {cycle}, prélevé sur {source}',
  },
  'subscriptions.row.a11yCancelled': {
    en: '{name}, {amount} {cycle}, cancelled',
    es: '{name}, {amount} {cycle}, cancelada',
    fr: '{name}, {amount} {cycle}, annulé',
  },
  'subscriptions.row.a11ySourceCancelled': {
    en: '{name}, {amount} {cycle}, charged to {source}, cancelled',
    es: '{name}, {amount} {cycle}, se cobra a {source}, cancelada',
    fr: '{name}, {amount} {cycle}, prélevé sur {source}, annulé',
  },
  'subscriptions.row.hint': {
    en: 'Opens this subscription',
    es: 'Abre esta suscripción',
    fr: 'Ouvre cet abonnement',
  },
  'subscriptions.row.noRenewalDate': {
    en: 'No renewal date',
    es: 'Sin fecha de renovación',
    fr: 'Aucune date de renouvellement',
  },
});
