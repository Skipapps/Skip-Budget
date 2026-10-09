import { defineMessages } from '@/i18n/translate';

/**
 * Starting and editing a spending habit: Pick, Add my own (name and icon), Price, the final page,
 * and the ten ready-made habits. Meal words follow the icon names: French Canada eats déjeuner,
 * dîner and souper.
 */
export const habitFlowMessages = defineMessages({
  'habitFlow.new.title': { en: 'New habit', es: 'Nuevo hábito', fr: 'Nouvelle habitude' },
  'habitFlow.new.close': {
    en: 'Cancel adding this habit?',
    es: '¿Dejar de agregar este hábito?',
    fr: 'Annuler l’ajout de cette habitude ?',
  },
  'habitFlow.edit.title': { en: 'Edit habit', es: 'Editar hábito', fr: 'Modifier l’habitude' },
  'habitFlow.edit.close': {
    en: 'Cancel editing this habit?',
    es: '¿Dejar de editar este hábito?',
    fr: 'Annuler la modification de cette habitude ?',
  },

  // Step 1: Pick.
  'habitFlow.pick.question': {
    en: 'What do you want to track?',
    es: '¿Qué quieres registrar?',
    fr: 'Que veux-tu suivre ?',
  },
  'habitFlow.pick.tracking': {
    en: 'Already tracking',
    es: 'Ya lo registras',
    fr: 'Déjà suivi',
  },
  // A tile read aloud: its name, its subtitle (or "Already tracking") and its price.
  'habitFlow.pick.spoken': {
    en: '{name}, {subtitle}, {price} each time',
    es: '{name}, {subtitle}, {price} cada vez',
    fr: '{name}, {subtitle}, {price} chaque fois',
  },
  'habitFlow.pick.more': { en: 'More', es: 'Más', fr: 'Plus' },
  'habitFlow.pick.moreHint': {
    en: 'Shows four more habits.',
    es: 'Muestra cuatro hábitos más.',
    fr: 'Affiche quatre autres habitudes.',
  },
  // Short enough to sit beside More on a 375pt phone. "Une habitude" is feminine, so French says
  // "something else" rather than a "le mien" that would not agree.
  'habitFlow.pick.own': { en: 'Add my own', es: 'Crear el mío', fr: 'Autre chose' },

  // Add my own: the name, then the icon.
  'habitFlow.name.question': {
    en: 'What do you want to call it?',
    es: '¿Cómo quieres llamarlo?',
    fr: 'Comment veux-tu l’appeler ?',
  },
  'habitFlow.name.label': { en: 'Name', es: 'Nombre', fr: 'Nom' },
  'habitFlow.name.placeholder': {
    en: 'e.g. Bubble tea',
    es: 'p. ej., Té de burbujas',
    fr: 'p. ex. Thé aux perles',
  },
  'habitFlow.icon.question': { en: 'Pick an icon', es: 'Elige un ícono', fr: 'Choisis une icône' },

  // Step 2: Price.
  'habitFlow.price.question': {
    en: 'How much does it cost each time?',
    es: '¿Cuánto cuesta cada vez?',
    fr: 'Combien ça coûte chaque fois ?',
  },
  'habitFlow.price.helper': {
    en: 'Each day you tap records this amount.',
    es: 'Cada día que tocas registra este importe.',
    fr: 'Chaque jour touché enregistre ce montant.',
  },

  // Step 3: the final page, also the edit page.
  'habitFlow.confirm.question': {
    en: 'Ready to track',
    es: 'Listo para registrar',
    fr: 'Prêt à suivre',
  },
  'habitFlow.confirm.preview': { en: 'Preview', es: 'Vista previa', fr: 'Aperçu' },
  'habitFlow.confirm.start': {
    en: 'Start tracking',
    es: 'Empezar a registrar',
    fr: 'Commencer le suivi',
  },
  // {fields} is the rows still empty, by the names they carry on the page.
  'habitFlow.confirm.missingNew': {
    en: 'To start tracking, fill in: {fields}.',
    es: 'Para empezar a registrar, completa: {fields}.',
    fr: 'Pour commencer le suivi, remplis : {fields}.',
  },
  'habitFlow.field.habit': { en: 'Habit', es: 'Hábito', fr: 'Habitude' },
  'habitFlow.field.icon': { en: 'Icon', es: 'Ícono', fr: 'Icône' },
  'habitFlow.field.price': { en: 'Price', es: 'Precio', fr: 'Prix' },
  'habitFlow.field.priceValue': {
    en: '{price} each time',
    es: '{price} cada vez',
    fr: '{price} chaque fois',
  },
  'habitFlow.field.colour': { en: 'Colour', es: 'Color', fr: 'Couleur' },
  'habitFlow.field.paidWith': { en: 'Paid with', es: 'Pagado con', fr: 'Payé avec' },
  'habitFlow.field.starts': { en: 'Starts', es: 'Empieza', fr: 'Début' },
  // On edit: the day it was made, the first day that can be tapped.
  'habitFlow.field.started': { en: 'Started', es: 'Inicio', fr: 'Début' },
  'habitFlow.starts.today': { en: 'Today', es: 'Hoy', fr: 'Aujourd’hui' },
  'habitFlow.color.caramel': { en: 'Caramel', es: 'Caramelo', fr: 'Caramel' },
  'habitFlow.color.coral': { en: 'Coral', es: 'Coral', fr: 'Corail' },
  'habitFlow.color.green': { en: 'Green', es: 'Verde', fr: 'Vert' },
  'habitFlow.color.blue': { en: 'Blue', es: 'Azul', fr: 'Bleu' },
  'habitFlow.color.violet': { en: 'Violet', es: 'Violeta', fr: 'Violet' },
  'habitFlow.color.pink': { en: 'Pink', es: 'Rosa', fr: 'Rose' },

  // Edit mode.
  'habitFlow.edit.save': {
    en: 'Save changes',
    es: 'Guardar cambios',
    fr: 'Enregistrer les modifications',
  },
  'habitFlow.edit.missing': {
    en: 'To save this habit, fill in: {fields}.',
    es: 'Para guardar el hábito, completa: {fields}.',
    fr: 'Pour enregistrer l’habitude, remplis : {fields}.',
  },
  'habitFlow.edit.futureOnly': {
    en: 'New taps use the new price and card. Past receipts keep theirs.',
    es: 'Los días que toques desde ahora usan el precio y la tarjeta nuevos. Los recibos anteriores conservan los suyos.',
    fr: 'Les prochains jours touchés utilisent le nouveau prix et la nouvelle carte. Les reçus passés gardent les leurs.',
  },
  'habitFlow.edit.delete': {
    en: 'Delete habit',
    es: 'Eliminar hábito',
    fr: 'Supprimer l’habitude',
  },
  'habitFlow.edit.deleting': { en: 'Deleting…', es: 'Eliminando…', fr: 'Suppression…' },
  'habitFlow.delete.title': {
    en: 'Delete {name}?',
    es: '¿Eliminar {name}?',
    fr: 'Supprimer {name} ?',
  },
  'habitFlow.delete.message': {
    en: 'Its receipts stay in your spending.',
    es: 'Sus recibos se quedan en tus gastos.',
    fr: 'Ses reçus restent dans tes dépenses.',
  },

  // The ten ready-made habits. The name is copied into the habit; the subtitle is only shown here.
  'habitFlow.preset.coffee.name': { en: 'Coffee', es: 'Café', fr: 'Café' },
  'habitFlow.preset.coffee.subtitle': {
    en: 'Café runs',
    es: 'Cafés para llevar',
    fr: 'Cafés pour emporter',
  },
  'habitFlow.preset.breakfast.name': {
    en: 'Breakfast out',
    es: 'Desayunar fuera',
    fr: 'Déjeuner au resto',
  },
  'habitFlow.preset.breakfast.subtitle': {
    en: 'Morning treats',
    es: 'Antojos de la mañana',
    fr: 'Gâteries du matin',
  },
  'habitFlow.preset.lunch.name': { en: 'Lunch out', es: 'Comer fuera', fr: 'Dîner au resto' },
  'habitFlow.preset.lunch.subtitle': {
    en: 'Workday lunches',
    es: 'Comidas entre semana',
    fr: 'Dîners de semaine',
  },
  'habitFlow.preset.delivery.name': {
    en: 'Food delivery',
    es: 'Comida a domicilio',
    fr: 'Livraison de repas',
  },
  'habitFlow.preset.delivery.subtitle': {
    en: 'Takeout apps',
    es: 'Apps de comida',
    fr: 'Applis de livraison',
  },
  'habitFlow.preset.snacks.name': {
    en: 'Snacks & sweets',
    es: 'Botanas y dulces',
    fr: 'Collations et sucreries',
  },
  'habitFlow.preset.snacks.subtitle': {
    en: 'Treats on the go',
    es: 'Antojitos de paso',
    fr: 'Gâteries sur le pouce',
  },
  'habitFlow.preset.rides.name': {
    en: 'Taxi & rides',
    es: 'Taxi y traslados',
    fr: 'Taxi et covoiturage',
  },
  'habitFlow.preset.rides.subtitle': {
    en: 'Cabs & ride apps',
    es: 'Taxis y apps de viaje',
    fr: 'Taxis et applis de transport',
  },
  'habitFlow.preset.dinner.name': { en: 'Dinner out', es: 'Cenar fuera', fr: 'Souper au resto' },
  'habitFlow.preset.dinner.subtitle': { en: 'Restaurants', es: 'Restaurantes', fr: 'Restos' },
  'habitFlow.preset.drinks.name': { en: 'Drinks out', es: 'Salir a tomar', fr: 'Sorties au bar' },
  'habitFlow.preset.drinks.subtitle': {
    en: 'Bars & nights out',
    es: 'Bares y salidas de noche',
    fr: 'Bars et sorties',
  },
  'habitFlow.preset.shopping.name': {
    en: 'Online shopping',
    es: 'Compras en línea',
    fr: 'Magasinage en ligne',
  },
  'habitFlow.preset.shopping.subtitle': {
    en: 'Impulse buys',
    es: 'Compras por impulso',
    fr: 'Achats impulsifs',
  },
  'habitFlow.preset.soda.name': { en: 'Soft drinks', es: 'Refrescos', fr: 'Boissons gazeuses' },
  'habitFlow.preset.soda.subtitle': {
    en: 'Sodas & energy drinks',
    es: 'Refrescos y energizantes',
    fr: 'Boissons gazeuses et énergisantes',
  },
});
