import { defineMessages } from '@/i18n/translate';

export const receiptsMessages = defineMessages({
  'receipts.field.amount': { en: 'Amount', es: 'Importe', fr: 'Montant' },
  'receipts.field.store': { en: 'Store', es: 'Tienda', fr: 'Magasin' },
  'receipts.field.paidWith': { en: 'Paid with', es: 'Pagado con', fr: 'Payé avec' },
  'receipts.field.note': { en: 'Note', es: 'Nota', fr: 'Note' },
  'receipts.field.date': { en: 'Date', es: 'Fecha', fr: 'Date' },

  'receipts.add.titleNew': {
    en: 'Add a receipt',
    es: 'Agregar un recibo',
    fr: 'Ajouter un reçu',
  },
  'receipts.add.titleEdit': { en: 'Edit receipt', es: 'Editar recibo', fr: 'Modifier le reçu' },
  'receipts.add.closeNew': {
    en: 'Cancel adding this receipt?',
    es: '¿Dejar de agregar este recibo?',
    fr: 'Annuler l’ajout de ce reçu ?',
  },
  'receipts.add.closeEdit': {
    en: 'Cancel editing this receipt?',
    es: '¿Dejar de editar este recibo?',
    fr: 'Annuler la modification de ce reçu ?',
  },
  'receipts.add.askAmount': {
    en: 'How much did you spend?',
    es: '¿Cuánto gastaste?',
    fr: 'Combien as-tu dépensé ?',
  },
  'receipts.add.askDate': { en: 'When was it?', es: '¿Cuándo fue?', fr: 'C’était quand ?' },
  'receipts.add.askStore': {
    en: 'Where did you buy it?',
    es: '¿Dónde lo compraste?',
    fr: 'Où l’as-tu acheté ?',
  },
  'receipts.add.storePlaceholder': {
    en: 'Enter the store name',
    es: 'Escribe el nombre de la tienda',
    fr: 'Écris le nom du magasin',
  },
  // Paid with: none of the cards or accounts, chosen on purpose.
  'receipts.add.skipSource': { en: 'Skip', es: 'Omitir', fr: 'Passer' },
  // {fields} is the boxes still empty, by the names they carry on the page.
  'receipts.add.missing': {
    en: 'To save this receipt, fill in: {fields}.',
    es: 'Para guardar el recibo, completa: {fields}.',
    fr: 'Pour enregistrer le reçu, remplis : {fields}.',
  },
  'receipts.add.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },
  'receipts.add.saveChanges': {
    en: 'Save changes',
    es: 'Guardar cambios',
    fr: 'Enregistrer les modifications',
  },
  'receipts.add.saveReceipt': {
    en: 'Save receipt',
    es: 'Guardar recibo',
    fr: 'Enregistrer le reçu',
  },
  'receipts.add.goBack': { en: 'Go back', es: 'Regresar', fr: 'Revenir' },
  'receipts.add.notePlaceholder': {
    en: 'Anything worth remembering',
    es: 'Algo que valga la pena recordar',
    fr: 'Quelque chose à retenir',
  },
  'receipts.add.filedUnder': {
    en: 'Filed under {category}',
    es: 'Archivado en {category}',
    fr: 'Classé dans {category}',
  },
  'receipts.add.deleteLabel': {
    en: 'Delete this receipt',
    es: 'Eliminar este recibo',
    fr: 'Supprimer ce reçu',
  },
  'receipts.add.deleting': { en: 'Deleting…', es: 'Eliminando…', fr: 'Suppression…' },
  'receipts.add.deleteReceipt': {
    en: 'Delete receipt',
    es: 'Eliminar recibo',
    fr: 'Supprimer le reçu',
  },
  'receipts.add.deleteTitle': {
    en: 'Delete this receipt?',
    es: '¿Eliminar este recibo?',
    fr: 'Supprimer ce reçu ?',
  },
  'receipts.add.deleteMessage': {
    en: 'This cannot be undone.',
    es: 'Esto no se puede deshacer.',
    fr: 'Cette action est irréversible.',
  },

  'receipts.scan.scan': { en: 'Scan', es: 'Escanear', fr: 'Numériser' },
  'receipts.scan.upload': { en: 'Upload', es: 'Subir', fr: 'Importer' },
  'receipts.scan.scanHint': {
    en: 'Point the camera at a paper receipt',
    es: 'Apunta la cámara a un recibo de papel',
    fr: 'Pointe la caméra vers un reçu papier',
  },
  'receipts.scan.uploadHint': {
    en: 'Upload a photo or PDF of a receipt',
    es: 'Sube una foto o un PDF de un recibo',
    fr: 'Importe une photo ou un PDF d’un reçu',
  },
  'receipts.scan.proHint': {
    en: '{hint}. Part of Skip Pro.',
    es: '{hint}. Parte de Skip Pro.',
    fr: '{hint}. Fait partie de Skip Pro.',
  },
  'receipts.scan.allowance': {
    en: 'Free this month: {scans} and {uploads} left',
    es: 'Gratis este mes: quedan {scans} y {uploads}',
    fr: 'Gratuit ce mois-ci : il reste {scans} et {uploads}',
  },
  'receipts.scan.scansCount': {
    en: { one: '{count} scan', other: '{count} scans' },
    es: { one: '{count} escaneo', other: '{count} escaneos' },
    fr: { one: '{count} numérisation', other: '{count} numérisations' },
  },
  'receipts.scan.uploadsCount': {
    en: { one: '{count} upload', other: '{count} uploads' },
    es: { one: '{count} subida', other: '{count} subidas' },
    fr: { one: '{count} import', other: '{count} imports' },
  },
  'receipts.scan.reading': {
    en: 'Reading the receipt…',
    es: 'Leyendo el recibo…',
    fr: 'Lecture du reçu…',
  },
  // Spanish and French carry each field's article, so the list reads "la tienda, el importe".
  'receipts.scan.read': {
    en: 'Read the {fields}.',
    es: 'Leímos {fields}.',
    fr: 'Nous avons lu {fields}.',
  },
  'receipts.scan.check': {
    en: 'Check the {fields} below.',
    es: 'Revisa {fields} abajo.',
    fr: 'Vérifie {fields} ci-dessous.',
  },
  'receipts.scan.and': {
    en: '{first} and {last}',
    es: '{first} y {last}',
    fr: '{first} et {last}',
  },
  'receipts.scan.field.store': { en: 'store', es: 'la tienda', fr: 'le magasin' },
  'receipts.scan.field.date': { en: 'date', es: 'la fecha', fr: 'la date' },
  'receipts.scan.field.amount': { en: 'amount', es: 'el importe', fr: 'le montant' },
  'receipts.scan.field.card': { en: 'card', es: 'la tarjeta', fr: 'la carte' },
  'receipts.scan.noCameraTitle': {
    en: 'Scanning needs a camera',
    es: 'Para escanear se necesita una cámara',
    fr: 'La numérisation nécessite une caméra',
  },
  'receipts.scan.noCameraMessage': {
    en: 'The Simulator has none, so scanning is unavailable here. Upload reads a photo or a PDF and works everywhere.',
    es: 'El Simulador no tiene cámara, así que aquí no se puede escanear. “Subir” lee una foto o un PDF y funciona en todas partes.',
    fr: 'Le simulateur n’en a pas, donc la numérisation est impossible ici. « Importer » lit une photo ou un PDF et fonctionne partout.',
  },
  'receipts.scan.whereTitle': {
    en: 'Where is the receipt?',
    es: '¿Dónde está el recibo?',
    fr: 'Où est le reçu ?',
  },
  'receipts.scan.photoLibrary': {
    en: 'Photo library',
    es: 'Biblioteca de fotos',
    fr: 'Photothèque',
  },
  'receipts.scan.files': { en: 'Files', es: 'Archivos', fr: 'Fichiers' },
  'receipts.scan.photoAccess': {
    en: 'Allow photo access in Settings to read a receipt from your library.',
    es: 'Permite el acceso a tus fotos en Ajustes para leer un recibo de tu biblioteca.',
    fr: 'Autorise l’accès aux photos dans Réglages pour lire un reçu de ta photothèque.',
  },

  'receipts.list.title': { en: 'Receipts', es: 'Recibos', fr: 'Reçus' },
  'receipts.list.reading': {
    en: 'Reading the receipt',
    es: 'Leyendo el recibo',
    fr: 'Lecture du reçu',
  },
  'receipts.list.scan': { en: 'Scan a receipt', es: 'Escanear un recibo', fr: 'Numériser un reçu' },
  'receipts.list.add': { en: 'Add a receipt', es: 'Agregar un recibo', fr: 'Ajouter un reçu' },
  'receipts.list.search': {
    en: 'Search receipts',
    es: 'Buscar recibos',
    fr: 'Rechercher des reçus',
  },
  'receipts.list.filtersActive': {
    en: { one: 'Filters, {count} active', other: 'Filters, {count} active' },
    es: { one: 'Filtros, {count} activo', other: 'Filtros, {count} activos' },
    fr: { one: 'Filtres, {count} actif', other: 'Filtres, {count} actifs' },
  },
  'receipts.list.loading': { en: 'Loading', es: 'Cargando', fr: 'Chargement' },
  'receipts.list.count': {
    en: { one: '{count} receipt', other: '{count} receipts' },
    es: { one: '{count} recibo', other: '{count} recibos' },
    fr: { one: '{count} reçu', other: '{count} reçus' },
  },
  'receipts.list.emptyTitle': {
    en: 'No receipts yet',
    es: 'Aún no hay recibos',
    fr: 'Pas encore de reçus',
  },
  'receipts.list.emptyMessage': {
    en: 'Add what you spend day to day and it shows up here.',
    es: 'Agrega lo que gastas día a día y aparecerá aquí.',
    fr: 'Ajoute ce que tu dépenses au quotidien et ça s’affichera ici.',
  },
  'receipts.list.noMatchTitle': {
    en: 'Nothing matches',
    es: 'Sin resultados',
    fr: 'Aucun résultat',
  },
  'receipts.list.noMatchMessage': {
    en: 'No receipt fits that search and those filters. Try a different store or clear what you have set.',
    es: 'Ningún recibo coincide con esa búsqueda y esos filtros. Prueba con otra tienda o borra lo que elegiste.',
    fr: 'Aucun reçu ne correspond à cette recherche et à ces filtres. Essaie un autre magasin ou efface ce que tu as choisi.',
  },
  'receipts.list.clearFilters': {
    en: 'Clear filters',
    es: 'Borrar filtros',
    fr: 'Effacer les filtres',
  },

  'receipts.field.category': { en: 'Category', es: 'Categoría', fr: 'Catégorie' },

  'receipts.detail.edit': { en: 'Edit {name}', es: 'Editar {name}', fr: 'Modifier {name}' },
  'receipts.detail.boughtOn': {
    en: 'Bought on {date}',
    es: 'Comprado el {date}',
    fr: 'Acheté le {date}',
  },
  'receipts.detail.noPaymentMethod': {
    en: 'No card or account',
    es: 'Sin tarjeta ni cuenta',
    fr: 'Aucune carte ni aucun compte',
  },
  'receipts.detail.history': {
    en: 'Receipts from {store}',
    es: 'Recibos de {store}',
    fr: 'Reçus de {store}',
  },
  'receipts.detail.thisOne': { en: 'This receipt', es: 'Este recibo', fr: 'Ce reçu' },
  'receipts.detail.empty': {
    en: 'No receipts from {store} in this period.',
    es: 'No hay recibos de {store} en este período.',
    fr: 'Aucun reçu de {store} sur cette période.',
  },

  'receipts.row.paidWith': {
    en: '{merchant}, {amount}, paid with {source}',
    es: '{merchant}, {amount}, pagado con {source}',
    fr: '{merchant}, {amount}, payé avec {source}',
  },
  'receipts.row.hint': { en: 'Opens this receipt', es: 'Abre este recibo', fr: 'Ouvre ce reçu' },

  'receipts.filter.title': {
    en: 'Filter receipts',
    es: 'Filtrar recibos',
    fr: 'Filtrer les reçus',
  },
  'receipts.filter.close': {
    en: 'Close filters',
    es: 'Cerrar filtros',
    fr: 'Fermer les filtres',
  },
  'receipts.filter.date': { en: 'Date', es: 'Fecha', fr: 'Date' },
  'receipts.filter.anyDate': {
    en: 'Any date',
    es: 'Cualquier fecha',
    fr: 'N’importe quelle date',
  },
  'receipts.filter.clearDate': { en: 'Clear date', es: 'Borrar fecha', fr: 'Effacer la date' },
  'receipts.filter.everySource': {
    en: 'Showing every credit card and account.',
    es: 'Se muestran todas las tarjetas de crédito y cuentas.',
    fr: 'Toutes les cartes de crédit et tous les comptes sont affichés.',
  },
  // The third-width button fits about seven letters; these are the words filter screens use.
  'receipts.filter.reset': { en: 'Reset', es: 'Borrar', fr: 'Effacer' },
  'receipts.filter.apply': { en: 'Apply', es: 'Aplicar', fr: 'Appliquer' },

  // Shop categories by their stored id (spend_categories); the English is the database's label.
  'receipts.category.groceries': { en: 'Groceries', es: 'Supermercado', fr: 'Épicerie' },
  'receipts.category.dining': {
    en: 'Dining & Takeout',
    es: 'Restaurantes y comida para llevar',
    fr: 'Restaurants et mets à emporter',
  },
  'receipts.category.fuel': {
    en: 'Fuel & Convenience',
    es: 'Gasolina y tiendas de conveniencia',
    fr: 'Essence et dépanneurs',
  },
  'receipts.category.pharmacy': {
    en: 'Pharmacy & Health',
    es: 'Farmacia y salud',
    fr: 'Pharmacie et santé',
  },
  'receipts.category.shopping': { en: 'Shopping', es: 'Compras', fr: 'Magasinage' },
  'receipts.category.clothing': { en: 'Clothing', es: 'Ropa', fr: 'Vêtements' },
  'receipts.category.electronics': { en: 'Electronics', es: 'Electrónica', fr: 'Électronique' },
  'receipts.category.home': {
    en: 'Home & Hardware',
    es: 'Hogar y ferretería',
    fr: 'Maison et quincaillerie',
  },
  'receipts.category.beauty': { en: 'Beauty', es: 'Belleza', fr: 'Beauté' },
  'receipts.category.pets': { en: 'Pets', es: 'Mascotas', fr: 'Animaux' },
  'receipts.category.entertainment': {
    en: 'Entertainment',
    es: 'Entretenimiento',
    fr: 'Divertissement',
  },
  'receipts.category.software': {
    en: 'Apps & Software',
    es: 'Apps y software',
    fr: 'Applis et logiciels',
  },
  'receipts.category.fitness': {
    en: 'Fitness & Wellness',
    es: 'Ejercicio y bienestar',
    fr: 'Forme et bien-être',
  },
  'receipts.category.news': {
    en: 'News & Learning',
    es: 'Noticias y aprendizaje',
    fr: 'Actualités et apprentissage',
  },
  'receipts.category.meals': { en: 'Meal Kits', es: 'Kits de comida', fr: 'Boîtes-repas' },
  'receipts.category.memberships': { en: 'Memberships', es: 'Membresías', fr: 'Adhésions' },
  'receipts.category.transport': { en: 'Transport', es: 'Transporte', fr: 'Transport' },
  'receipts.category.utilities': { en: 'Utilities', es: 'Servicios', fr: 'Services publics' },
  'receipts.category.telecom': {
    en: 'Phone & Internet',
    es: 'Teléfono e internet',
    fr: 'Téléphone et Internet',
  },
  'receipts.category.insurance': { en: 'Insurance', es: 'Seguros', fr: 'Assurances' },
  'receipts.category.finance': {
    en: 'Banking & Loans',
    es: 'Bancos y préstamos',
    fr: 'Banques et prêts',
  },
  'receipts.category.other': { en: 'Other', es: 'Otros', fr: 'Autre' },
});
