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
  'subscriptions.add.pickDay': {
    en: 'Select a date',
    es: 'Elige una fecha',
    fr: 'Choisis une date',
  },
  // Charged to: none of the cards or accounts, chosen on purpose.
  'subscriptions.add.skipSource': { en: 'Skip', es: 'Omitir', fr: 'Passer' },
  'subscriptions.add.noReminder': {
    en: 'No reminder',
    es: 'Sin recordatorio',
    fr: 'Aucun rappel',
  },
  // {fields} is the boxes still empty, by the names they carry on the page.
  'subscriptions.add.missing': {
    en: 'To save this subscription, fill in: {fields}.',
    es: 'Para guardar la suscripción, completa: {fields}.',
    fr: 'Pour enregistrer l’abonnement, remplis : {fields}.',
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

  'subscriptions.plans.emptyMessage': {
    en: 'Add the ones you pay for and Skip will show what they cost you each month.',
    es: 'Agrega las que pagas y Skip te mostrará cuánto te cuestan cada mes.',
    fr: 'Ajoute ceux que tu paies et Skip te montrera ce qu’ils te coûtent chaque mois.',
  },
  'subscriptions.cancelledLastCharged': {
    en: 'Cancelled · last charged {date}',
    es: 'Cancelada · último cargo el {date}',
    fr: 'Annulé · dernier prélèvement le {date}',
  },
  /** The same, read aloud: a comma, not the dot. */
  'subscriptions.cancelledLastChargedA11y': {
    en: 'Cancelled, last charged {date}',
    es: 'Cancelada, último cargo el {date}',
    fr: 'Annulé, dernier prélèvement le {date}',
  },

  'subscriptions.detail.nextRenewal': {
    en: 'Next renewal',
    es: 'Próxima renovación',
    fr: 'Prochain renouvellement',
  },
  'subscriptions.detail.paidFrom': { en: 'Paid from', es: 'Se paga con', fr: 'Payé avec' },
  'subscriptions.detail.started': { en: 'Started', es: 'Inicio', fr: 'Début' },

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
  'subscriptions.row.a11yStatus': {
    en: '{name}, {amount} {cycle}. {status}',
    es: '{name}, {amount} {cycle}. {status}',
    fr: '{name}, {amount} {cycle}. {status}',
  },
  'subscriptions.row.a11ySourceStatus': {
    en: '{name}, {amount} {cycle}, charged to {source}. {status}',
    es: '{name}, {amount} {cycle}, se cobra a {source}. {status}',
    fr: '{name}, {amount} {cycle}, prélevé sur {source}. {status}',
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
