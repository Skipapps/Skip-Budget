import { defineMessages } from '@/i18n/translate';

export const billsMessages = defineMessages({
  // A bill stores its category id; these are only what is read.
  'bills.category.housing': { en: 'Housing', es: 'Vivienda', fr: 'Logement' },
  'bills.category.energy': {
    en: 'Electricity & Gas',
    es: 'Luz y gas',
    fr: 'Électricité et gaz',
  },
  'bills.category.water': { en: 'Water & Waste', es: 'Agua y basura', fr: 'Eau et déchets' },
  'bills.category.internet': { en: 'Internet', es: 'Internet', fr: 'Internet' },
  'bills.category.mobile': { en: 'Mobile Phone', es: 'Celular', fr: 'Cellulaire' },
  'bills.category.insurance': { en: 'Insurance', es: 'Seguros', fr: 'Assurances' },
  'bills.category.loans': {
    en: 'Loans & Credit',
    es: 'Préstamos y crédito',
    fr: 'Prêts et crédit',
  },
  'bills.category.transport': { en: 'Transportation', es: 'Transporte', fr: 'Transport' },
  'bills.category.health': {
    en: 'Health & Medical',
    es: 'Salud y gastos médicos',
    fr: 'Santé et soins médicaux',
  },
  'bills.category.education': {
    en: 'Education',
    es: 'Educación',
    fr: 'Éducation',
  },
  'bills.category.other': {
    en: 'Other',
    es: 'Otra',
    fr: 'Autre',
  },

  'bills.categoryHint.housing': {
    en: 'Rent, mortgage, HOA',
    es: 'Renta, hipoteca, mantenimiento',
    fr: 'Loyer, hypothèque, copropriété',
  },
  'bills.categoryHint.energy': {
    en: 'Power, heating, gas',
    es: 'Luz, calefacción, gas',
    fr: 'Électricité, chauffage, gaz',
  },
  'bills.categoryHint.water': {
    en: 'Water, sewer, trash',
    es: 'Agua, drenaje, basura',
    fr: 'Eau, égouts, ordures',
  },
  'bills.categoryHint.internet': {
    en: 'Broadband and Wi-Fi',
    es: 'Internet de casa y wifi',
    fr: 'Internet et Wi-Fi',
  },
  'bills.categoryHint.mobile': {
    en: 'Plans and devices',
    es: 'Planes y equipos',
    fr: 'Forfaits et appareils',
  },
  'bills.categoryHint.insurance': {
    en: 'Car, health, home, life',
    es: 'Auto, gastos médicos, casa, vida',
    fr: 'Auto, santé, habitation, vie',
  },
  'bills.categoryHint.loans': {
    en: 'Cards, student, auto, personal',
    es: 'Tarjetas, estudiantiles, de auto, personales',
    fr: 'Cartes, prêts étudiants, auto, personnels',
  },
  'bills.categoryHint.transport': {
    en: 'Fuel, transit, tolls',
    es: 'Gasolina, transporte público, casetas',
    fr: 'Essence, transport en commun, péages',
  },
  'bills.categoryHint.health': {
    en: 'Doctor, dental, meds',
    es: 'Médico, dentista, medicinas',
    fr: 'Médecin, dentiste, médicaments',
  },
  'bills.categoryHint.education': {
    en: 'Tuition and courses',
    es: 'Colegiaturas y cursos',
    fr: 'Frais de scolarité et cours',
  },
  'bills.categoryHint.other': {
    en: 'Anything else',
    es: 'Cualquier otra cosa',
    fr: 'Tout le reste',
  },

  // Weekly and Monthly are dates.weekly and dates.monthly.
  'bills.recurrence.quarterly': {
    en: 'Every 3 months',
    es: 'Cada 3 meses',
    fr: 'Tous les 3 mois',
  },
  'bills.recurrence.yearly': { en: 'Yearly', es: 'Anual', fr: 'Chaque année' },
  'bills.recurrence.period': { en: 'Set period', es: 'Periodo fijo', fr: 'Période définie' },

  'bills.addBill': { en: 'Add bill', es: 'Agregar factura', fr: 'Ajouter une facture' },
  'bills.addABill': { en: 'Add a bill', es: 'Agregar una factura', fr: 'Ajouter une facture' },
  'bills.noBillsYet': {
    en: 'No bills yet',
    es: 'Aún no hay facturas',
    fr: 'Pas encore de factures',
  },
  'bills.noPaymentMethod': {
    en: 'No payment method',
    es: 'Sin forma de pago',
    fr: 'Aucun mode de paiement',
  },
  'bills.goBack': { en: 'Go back', es: 'Regresar', fr: 'Revenir' },

  'bills.field.name': { en: 'Name', es: 'Nombre', fr: 'Nom' },
  'bills.field.category': { en: 'Category', es: 'Categoría', fr: 'Catégorie' },
  'bills.field.paidWith': { en: 'Paid with', es: 'Se paga con', fr: 'Payée avec' },
  'bills.field.note': { en: 'Note', es: 'Nota', fr: 'Note' },
  'bills.field.recurring': { en: 'Recurring', es: 'Se repite', fr: 'Récurrence' },
  'bills.field.to': { en: 'To', es: 'Hasta', fr: 'Jusqu’au' },
  'bills.field.paymentOn': { en: 'Payment on', es: 'Fecha de pago', fr: 'Date de paiement' },
  'bills.field.starts': { en: 'Starts on', es: 'Empieza el', fr: 'Commence le' },

  'bills.add.titleEdit': { en: 'Edit bill', es: 'Editar factura', fr: 'Modifier la facture' },
  'bills.add.closeNew': {
    en: 'Cancel adding this bill?',
    es: '¿Dejar de agregar esta factura?',
    fr: 'Annuler l’ajout de cette facture ?',
  },
  'bills.add.closeEdit': {
    en: 'Cancel editing this bill?',
    es: '¿Dejar de editar esta factura?',
    fr: 'Annuler la modification de cette facture ?',
  },
  'bills.add.categoryQuestion': {
    en: 'What’s this bill for?',
    es: '¿De qué es esta factura?',
    fr: 'Cette facture, c’est pour quoi ?',
  },
  'bills.add.categorySubtitle': {
    en: 'Pick one. You can change it later.',
    es: 'Elige una. Puedes cambiarla después.',
    fr: 'Choisis-en une. Tu pourras la changer plus tard.',
  },
  'bills.add.amountQuestion': {
    en: 'How much is the bill?',
    es: '¿De cuánto es la factura?',
    fr: 'De combien est la facture ?',
  },
  'bills.add.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },
  'bills.add.saveChanges': {
    en: 'Save changes',
    es: 'Guardar cambios',
    fr: 'Enregistrer les modifications',
  },
  'bills.add.saveBill': { en: 'Save bill', es: 'Guardar factura', fr: 'Enregistrer la facture' },
  'bills.add.calculator': { en: 'Calculator', es: 'Calculadora', fr: 'Calculatrice' },
  'bills.add.deleteTitle': {
    en: 'Delete this bill?',
    es: '¿Eliminar esta factura?',
    fr: 'Supprimer cette facture ?',
  },
  'bills.add.deleteMessage': {
    en: 'This cannot be undone.',
    es: 'Esto no se puede deshacer.',
    fr: 'Cette action est irréversible.',
  },
  'bills.add.deleteA11y': {
    en: 'Delete this bill',
    es: 'Eliminar esta factura',
    fr: 'Supprimer cette facture',
  },
  'bills.add.deleting': { en: 'Deleting…', es: 'Eliminando…', fr: 'Suppression…' },
  'bills.add.deleteBill': { en: 'Delete bill', es: 'Eliminar factura', fr: 'Supprimer la facture' },
  'bills.add.notePlaceholder': {
    en: 'Anything worth remembering',
    es: 'Algo que quieras recordar',
    fr: 'Un détail à retenir',
  },
  'bills.add.specificPeriod': {
    en: 'Specific period',
    es: 'Periodo específico',
    fr: 'Période précise',
  },
  'bills.add.noEndDate': {
    en: 'Ongoing — no end date',
    es: 'Continúa — sin fecha de fin',
    fr: 'En cours — sans date de fin',
  },
  'bills.add.changeName': {
    en: 'Change name, currently {name}',
    es: 'Cambiar nombre, ahora es {name}',
    fr: 'Changer le nom, actuellement {name}',
  },
  'bills.add.useName': {
    en: 'Use {name} as the name',
    es: 'Usar {name} como nombre',
    fr: 'Utiliser {name} comme nom',
  },
  'bills.add.pickDay': { en: 'Select a date', es: 'Elige una fecha', fr: 'Choisis une date' },
  // Paid with: none of the cards or accounts, chosen on purpose.
  'bills.add.skipSource': { en: 'Skip', es: 'Omitir', fr: 'Passer' },
  'bills.add.noReminder': { en: 'No reminder', es: 'Sin recordatorio', fr: 'Aucun rappel' },
  // {fields} is the boxes still empty, by the names they carry on the page.
  'bills.add.missing': {
    en: 'To save this bill, fill in: {fields}.',
    es: 'Para guardar la factura, completa: {fields}.',
    fr: 'Pour enregistrer la facture, remplis : {fields}.',
  },
  'bills.add.clearEnd': {
    en: 'Clear — make it ongoing',
    es: 'Borrar — sin fecha de fin',
    fr: 'Effacer — sans date de fin',
  },
  'bills.add.paymentSchedule': {
    en: 'Payment schedule',
    es: 'Calendario de pagos',
    fr: 'Calendrier des paiements',
  },
  // The company field's placeholder per category. Lists of company names are not messages.
  'bills.add.issuer.housing': {
    en: 'Rent, mortgage or your landlord',
    es: 'Renta, hipoteca o tu arrendador',
    fr: 'Loyer, prêt immobilier ou ton propriétaire',
  },
  'bills.add.issuer.water': {
    en: 'Your water company',
    es: 'Tu compañía de agua',
    fr: 'Ton fournisseur d’eau',
  },
  'bills.add.issuer.transport': {
    en: 'Transit, tolls or parking',
    es: 'Transporte público, casetas o estacionamiento',
    fr: 'Transport en commun, péages ou stationnement',
  },
  'bills.add.issuer.health': {
    en: 'Your doctor, dentist or clinic',
    es: 'Tu médico, dentista o clínica',
    fr: 'Ton médecin, dentiste ou clinique',
  },
  'bills.add.issuer.education': {
    en: 'Your school or college',
    es: 'Tu escuela o universidad',
    fr: 'Ton école ou ton collège',
  },
  'bills.add.issuer.other': {
    en: 'Search or type a name',
    es: 'Busca o escribe un nombre',
    fr: 'Cherche ou écris un nom',
  },

  'bills.plans.title': { en: 'Your bills', es: 'Tus facturas', fr: 'Tes factures' },
  'bills.plans.search': {
    en: 'Search bills',
    es: 'Buscar facturas',
    fr: 'Rechercher des factures',
  },
  'bills.plans.filtersActive': {
    en: { one: 'Filters, {count} active', other: 'Filters, {count} active' },
    es: { one: 'Filtros, {count} activo', other: 'Filtros, {count} activos' },
    fr: { one: 'Filtres, {count} actif', other: 'Filtres, {count} actifs' },
  },
  'bills.plans.loading': { en: 'Loading', es: 'Cargando', fr: 'Chargement' },
  // Counted on the whole list, as the English always was.
  'bills.plans.countOf': {
    en: { one: '{shown} of {count} bills', other: '{shown} of {count} bills' },
    es: { one: '{shown} de {count} factura', other: '{shown} de {count} facturas' },
    fr: { one: '{shown} sur {count} facture', other: '{shown} sur {count} factures' },
  },
  'bills.plans.count': {
    en: { one: '{count} bill', other: '{count} bills' },
    es: { one: '{count} factura', other: '{count} facturas' },
    fr: { one: '{count} facture', other: '{count} factures' },
  },
  'bills.plans.emptyMessage': {
    en: 'Add the ones that repeat — rent, power, phone — and Skip will keep track of what is due.',
    es: 'Agrega las que se repiten (renta, luz, teléfono) y Skip llevará la cuenta de lo que vence.',
    fr: 'Ajoute celles qui reviennent — loyer, électricité, téléphone — et Skip suivra ce qui est à payer.',
  },
  'bills.plans.noMatchTitle': { en: 'Nothing matches', es: 'Nada coincide', fr: 'Aucun résultat' },
  'bills.plans.noMatchMessage': {
    en: 'No bill fits that search and those filters. Try a different name or clear what you have set.',
    es: 'Ninguna factura coincide con esa búsqueda y esos filtros. Prueba otro nombre o borra lo que elegiste.',
    fr: 'Aucune facture ne correspond à cette recherche et à ces filtres. Essaie un autre nom ou efface ce que tu as choisi.',
  },
  'bills.plans.clearFilters': {
    en: 'Clear filters',
    es: 'Borrar filtros',
    fr: 'Effacer les filtres',
  },

  'bills.charged.title': {
    en: 'Monthly bills',
    es: 'Facturas mensuales',
    fr: 'Factures mensuelles',
  },
  'bills.charged.label': {
    en: 'Bills charged',
    es: 'Facturas cobradas',
    fr: 'Factures prélevées',
  },
  'bills.charged.nothing': {
    en: 'Nothing in this window',
    es: 'Nada en este periodo',
    fr: 'Rien dans cette période',
  },
  'bills.charged.count': {
    en: { one: '{count} charge', other: '{count} charges' },
    es: { one: '{count} cargo', other: '{count} cargos' },
    fr: { one: '{count} prélèvement', other: '{count} prélèvements' },
  },
  'bills.charged.emptyMessage': {
    en: 'Add the ones that repeat — rent, power, phone — and each time one lands it shows up here.',
    es: 'Agrega las que se repiten (renta, luz, teléfono) y cada vez que llegue una aparecerá aquí.',
    fr: 'Ajoute celles qui reviennent — loyer, électricité, téléphone — et chaque fois qu’une arrive, elle s’affiche ici.',
  },
  'bills.charged.windowMessage': {
    en: 'Your bills have not landed in this stretch of time. Try a wider window.',
    es: 'No llegó ninguna de tus facturas en este periodo. Prueba con uno más amplio.',
    fr: 'Aucune de tes factures n’est arrivée dans cette période. Essaie une période plus longue.',
  },

  'bills.detail.nextDue': {
    en: 'Next due',
    es: 'Próximo vencimiento',
    fr: 'Prochaine échéance',
  },
  'bills.detail.nothingDue': { en: 'Nothing due', es: 'Nada por pagar', fr: 'Rien à payer' },
  'bills.detail.paidFrom': { en: 'Paid from', es: 'Se paga con', fr: 'Payée avec' },
  'bills.detail.otherCategory': { en: 'Other', es: 'Otra', fr: 'Autre' },
  'bills.detail.started': { en: 'Started', es: 'Inicio', fr: 'Début' },
  'bills.detail.ends': { en: 'Ends', es: 'Termina', fr: 'Fin' },

  'bills.filter.close': { en: 'Close filters', es: 'Cerrar filtros', fr: 'Fermer les filtres' },
  'bills.filter.title': { en: 'Filter bills', es: 'Filtrar facturas', fr: 'Filtrer les factures' },
  'bills.filter.everyCategory': {
    en: 'Showing every category.',
    es: 'Se muestran todas las categorías.',
    fr: 'Toutes les catégories sont affichées.',
  },
  'bills.filter.everySource': {
    en: 'Showing every credit card and account.',
    es: 'Se muestran todas las tarjetas de crédito y cuentas.',
    fr: 'Toutes les cartes de crédit et tous les comptes sont affichés.',
  },
  'bills.filter.howOften': { en: 'How often', es: 'Frecuencia', fr: 'Fréquence' },
  'bills.filter.everySchedule': {
    en: 'Showing every schedule.',
    es: 'Se muestran todas las frecuencias.',
    fr: 'Toutes les fréquences sont affichées.',
  },
  'bills.filter.reset': { en: 'Reset', es: 'Borrar', fr: 'Effacer' },
  'bills.filter.apply': { en: 'Apply', es: 'Aplicar', fr: 'Appliquer' },

  'bills.row.a11y': {
    en: '{name}, {amount}, {recurrence}, paid with {source}',
    es: '{name}, {amount}, {recurrence}, se paga con {source}',
    fr: '{name}, {amount}, {recurrence}, payée avec {source}',
  },

  // The page for one bill or one subscription.
  'bills.planDetail.edit': { en: 'Edit {name}', es: 'Editar {name}', fr: 'Modifier {name}' },
  'bills.planDetail.noChargesBill': {
    en: 'No charges for this bill in this window.',
    es: 'No hay cargos de esta factura en este periodo.',
    fr: 'Aucun prélèvement pour cette facture dans cette période.',
  },
  'bills.planDetail.noChargesSubscription': {
    en: 'No charges for this subscription in this window.',
    es: 'No hay cargos de esta suscripción en este periodo.',
    fr: 'Aucun prélèvement pour cet abonnement dans cette période.',
  },
  'bills.planDetail.paid': { en: 'Paid', es: 'Pagados', fr: 'Payés' },
  'bills.planDetail.paidRow': { en: 'Paid', es: 'Pagado', fr: 'Payé' },
  'bills.planDetail.upcoming': { en: 'Upcoming', es: 'Próximos', fr: 'À venir' },
  'bills.planDetail.due': { en: 'Due', es: 'Vence', fr: 'À payer' },
});
