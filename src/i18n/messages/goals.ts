import { defineMessages } from '@/i18n/translate';

/** Goals: what the person is saving for, and the money sent to each from Savings. */
export const goalsMessages = defineMessages({
  'goals.title': { en: 'Goals', es: 'Metas', fr: 'Objectifs' },
  'goals.new': { en: 'New goal', es: 'Nueva meta', fr: 'Nouvel objectif' },

  // The Goals page.
  'goals.summary.saved': {
    en: 'Saved toward goals',
    es: 'Ahorrado para tus metas',
    fr: 'Mis de côté pour tes objectifs',
  },
  'goals.summary.active': {
    en: { one: '{count} active', other: '{count} active' },
    es: { one: '{count} activa', other: '{count} activas' },
    fr: { one: '{count} en cours', other: '{count} en cours' },
  },
  'goals.summary.done': {
    en: { one: '{count} done', other: '{count} done' },
    es: { one: '{count} cumplida', other: '{count} cumplidas' },
    fr: { one: '{count} atteint', other: '{count} atteints' },
  },
  'goals.summary.a11y': {
    en: 'Saved toward goals, {saved} of {target}. {counts}',
    es: 'Ahorrado para tus metas, {saved} de {target}. {counts}',
    fr: 'Mis de côté pour tes objectifs, {saved} sur {target}. {counts}',
  },
  'goals.active': { en: 'Active', es: 'Activas', fr: 'En cours' },
  'goals.completed': { en: 'Completed', es: 'Cumplidas', fr: 'Atteints' },
  'goals.by': { en: 'by {date}', es: 'para {date}', fr: 'd’ici {date}' },
  'goals.of': { en: 'of {target}', es: 'de {target}', fr: 'sur {target}' },
  'goals.weekly': {
    en: 'About {amount} a week to get there',
    es: 'Unos {amount} por semana para lograrlo',
    fr: 'Environ {amount} par semaine pour y arriver',
  },
  'goals.passed': {
    en: 'Target date passed · {amount} to go',
    es: 'Ya pasó la fecha · faltan {amount}',
    fr: 'Date dépassée · il reste {amount}',
  },
  'goals.reached': {
    en: '{amount} · reached {date}',
    es: '{amount} · cumplida en {date}',
    fr: '{amount} · atteint en {date}',
  },
  'goals.card.a11y': {
    en: '{name}, {percent}. {saved} of {target}.',
    es: '{name}, {percent}. {saved} de {target}.',
    fr: '{name}, {percent}. {saved} sur {target}.',
  },
  'goals.card.done': { en: 'Completed', es: 'Cumplida', fr: 'Atteint' },
  'goals.card.openHint': {
    en: 'Opens the goal',
    es: 'Abre la meta',
    fr: 'Ouvre l’objectif',
  },
  'goals.empty.title': {
    en: 'Save for something',
    es: 'Ahorra para algo',
    fr: 'Épargne pour un projet',
  },
  'goals.empty.body': {
    en: 'Create a goal and start collecting for it.',
    es: 'Crea una meta y empieza a juntar para ella.',
    fr: 'Crée un objectif et commence à mettre de côté.',
  },

  // What a goal is for, stored as its icon.
  'goals.type.trip': { en: 'Trip', es: 'Viaje', fr: 'Voyage' },
  'goals.type.emergency': {
    en: 'Emergency fund',
    es: 'Fondo de emergencia',
    fr: 'Fonds d’urgence',
  },
  'goals.type.home': { en: 'Home', es: 'Hogar', fr: 'Maison' },
  'goals.type.car': { en: 'Car', es: 'Auto', fr: 'Auto' },
  'goals.type.education': { en: 'Education', es: 'Educación', fr: 'Éducation' },
  'goals.type.wedding': { en: 'Wedding', es: 'Boda', fr: 'Mariage' },
  'goals.type.phone': {
    en: 'Phone & gadgets',
    es: 'Celular y gadgets',
    fr: 'Cellulaire et gadgets',
  },
  'goals.type.gifts': { en: 'Gifts', es: 'Regalos', fr: 'Cadeaux' },
  'goals.type.health': { en: 'Health', es: 'Salud', fr: 'Santé' },
  'goals.type.family': {
    en: 'Family & kids',
    es: 'Familia y niños',
    fr: 'Famille et enfants',
  },
  'goals.type.pets': { en: 'Pets', es: 'Mascotas', fr: 'Animaux' },
  'goals.type.other': { en: 'Other', es: 'Otra', fr: 'Autre' },

  // A new goal, first its figures.
  'goals.calculator.title': { en: 'New goal', es: 'Nueva meta', fr: 'Nouvel objectif' },
  'goals.calculator.target': {
    en: 'How much do you need?',
    es: '¿Cuánto necesitas?',
    fr: 'De combien as-tu besoin ?',
  },
  'goals.calculator.targetLabel': { en: 'Target', es: 'Meta', fr: 'Objectif' },
  'goals.calculator.byWhen': { en: 'By when', es: '¿Para cuándo?', fr: 'Pour quand' },
  'goals.calculator.noDate': { en: 'No date', es: 'Sin fecha', fr: 'Sans date' },
  'goals.calculator.pickMonth': { en: 'Pick a month', es: 'Elegir un mes', fr: 'Choisir un mois' },
  'goals.calculator.reachBy': {
    en: 'To reach {target} by {date}',
    es: 'Para juntar {target} para {date}',
    fr: 'Pour atteindre {target} d’ici {date}',
  },
  'goals.calculator.reach': {
    en: 'To reach {target}',
    es: 'Para juntar {target}',
    fr: 'Pour atteindre {target}',
  },
  'goals.calculator.alreadySaved': {
    en: 'Already saved',
    es: 'Ya ahorrado',
    fr: 'Déjà mis de côté',
  },
  'goals.calculator.alreadySavedHint': {
    en: 'Money you’ve already put aside for this. It doesn’t come out of Savings.',
    es: 'Dinero que ya apartaste para esto. No sale de tus Ahorros.',
    fr: 'L’argent déjà mis de côté pour ça. Il ne sort pas de ton Épargne.',
  },
  // A no-break space in "a week" and "a month", so neither phrase is split across lines.
  'goals.calculator.weekly': {
    en: 'About {amount} a\u00A0week',
    es: 'Unos {amount} por\u00A0semana',
    fr: 'Environ {amount} par\u00A0semaine',
  },
  'goals.calculator.monthly': {
    en: '{amount} a\u00A0month',
    es: '{amount} al\u00A0mes',
    fr: '{amount} par\u00A0mois',
  },
  'goals.calculator.resultNoDate': {
    en: 'Pick a month to see what to put aside each week.',
    es: 'Elige un mes para ver cuánto apartar cada semana.',
    fr: 'Choisis un mois pour voir combien mettre de côté chaque semaine.',
  },
  'goals.calculator.alreadyThere': {
    en: 'You’ve already saved enough for this.',
    es: 'Ya ahorraste lo suficiente para esto.',
    fr: 'Tu as déjà mis assez de côté pour ça.',
  },
  'goals.calculator.targetAboveZero': {
    en: 'Enter how much you need.',
    es: 'Escribe cuánto necesitas.',
    fr: 'Saisis le montant dont tu as besoin.',
  },

  // Then its name and type.
  'goals.save.title': {
    en: 'Save this goal',
    es: 'Guardar esta meta',
    fr: 'Enregistrer cet objectif',
  },
  'goals.save.subtitle': {
    en: 'It’ll show under Goals, ready for your savings.',
    es: 'Aparecerá en Metas, lista para tus ahorros.',
    fr: 'Il apparaîtra dans Objectifs, prêt pour ton épargne.',
  },
  'goals.save.name': { en: 'Name', es: 'Nombre', fr: 'Nom' },
  'goals.save.namePlaceholder': {
    en: 'e.g. Trip to Japan',
    es: 'p. ej., Viaje a Japón',
    fr: 'p. ex. Voyage au Japon',
  },
  'goals.save.type': { en: 'Goal type', es: 'Tipo de meta', fr: 'Type d’objectif' },
  // {fields} is the boxes still empty, by the names they carry on the page.
  'goals.save.missing': {
    en: 'To save this goal, fill in: {fields}.',
    es: 'Para guardar la meta, completa: {fields}.',
    fr: 'Pour enregistrer cet objectif, remplis : {fields}.',
  },
  'goals.save.saveToGoals': {
    en: 'Save to Goals',
    es: 'Guardar en Metas',
    fr: 'Enregistrer dans Objectifs',
  },
  'goals.save.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },
  'goals.save.saveChanges': {
    en: 'Save changes',
    es: 'Guardar cambios',
    fr: 'Enregistrer les modifications',
  },

  // One goal.
  'goals.detail.edit': { en: 'Edit goal', es: 'Editar meta', fr: 'Modifier l’objectif' },
  'goals.detail.percentSaved': {
    en: '{percent} saved',
    es: '{percent} ahorrado',
    fr: '{percent} mis de côté',
  },
  'goals.detail.moves': { en: 'Money moves', es: 'Movimientos', fr: 'Mouvements' },
  'goals.detail.noMoves': {
    en: 'Nothing sent yet.',
    es: 'Aún no has enviado nada.',
    fr: 'Rien d’envoyé pour l’instant.',
  },
  'goals.detail.fromSavings': {
    en: '+{amount} from savings · {date}',
    es: '+{amount} de ahorros · {date}',
    fr: '+{amount} de l’épargne · {date}',
  },
  'goals.detail.toSavings': {
    en: '−{amount} back to savings · {date}',
    es: '−{amount} de vuelta a ahorros · {date}',
    fr: '−{amount} retour à l’épargne · {date}',
  },
  'goals.detail.startAmount': {
    en: '{amount} already saved when you started',
    es: '{amount} ya ahorrados al empezar',
    fr: '{amount} déjà mis de côté au départ',
  },
  'goals.detail.addFromSavings': {
    en: 'Add from savings',
    es: 'Agregar de ahorros',
    fr: 'Ajouter depuis l’épargne',
  },
  'goals.detail.takeOut': { en: 'Take money out', es: 'Sacar dinero', fr: 'Retirer de l’argent' },
  'goals.detail.delete': { en: 'Delete goal', es: 'Eliminar meta', fr: 'Supprimer l’objectif' },
  'goals.detail.deleteTitle': {
    en: 'Delete {name}?',
    es: '¿Eliminar {name}?',
    fr: 'Supprimer {name} ?',
  },
  'goals.detail.deleteMoney': {
    en: '{amount} in it came from your savings.',
    es: '{amount} de esta meta salieron de tus ahorros.',
    fr: '{amount} de cet objectif vient de ton épargne.',
  },
  'goals.detail.putBack': {
    en: 'Put {amount} back in savings',
    es: 'Devolver {amount} a ahorros',
    fr: 'Remettre {amount} dans l’épargne',
  },
  'goals.detail.spentIt': { en: 'I spent it', es: 'Ya lo gasté', fr: 'Je l’ai dépensé' },
  'goals.detail.deleteEmpty': {
    en: 'It comes off your goals. Your savings don’t change.',
    es: 'Se quita de tus metas. Tus ahorros no cambian.',
    fr: 'Il disparaît de tes objectifs. Ton épargne ne change pas.',
  },
  'goals.takeOut.title': { en: 'Take money out', es: 'Sacar dinero', fr: 'Retirer de l’argent' },
  'goals.takeOut.hint': {
    en: 'It goes back to your savings. Up to {amount}.',
    es: 'Vuelve a tus ahorros. Hasta {amount}.',
    fr: 'Il retourne dans ton épargne. Jusqu’à {amount}.',
  },
  'goals.takeOut.tooMuch': {
    en: 'Up to {amount} can go back to your savings.',
    es: 'Hasta {amount} pueden volver a tus ahorros.',
    fr: 'Jusqu’à {amount} peut retourner dans ton épargne.',
  },

  // "I spent it": what was bought, filed as a receipt with the goal.
  'goals.spent.lead': {
    en: 'Add what you bought as a receipt here, so it counts once. Adding it again from Receipts would count it twice.',
    es: 'Agrega aquí lo que compraste como recibo, para que cuente una sola vez. Si lo agregas otra vez desde Recibos, contaría dos veces.',
    fr: 'Ajoute ici ce que tu as acheté comme reçu, pour qu’il compte une seule fois. L’ajouter encore depuis Reçus le compterait deux fois.',
  },
  'goals.spent.held': {
    en: 'Everything in this goal',
    es: 'Todo lo de esta meta',
    fr: 'Tout ce qu’il y a dans cet objectif',
  },
  'goals.spent.add': { en: 'Add receipt', es: 'Agregar recibo', fr: 'Ajouter le reçu' },
  'goals.spent.justRemove': {
    en: 'Just remove it',
    es: 'Solo eliminarla',
    fr: 'Juste le supprimer',
  },
  'goals.spent.alreadyAdded': {
    en: 'I already added it',
    es: 'Ya lo agregué',
    fr: 'Je l’ai déjà ajouté',
  },

  // "I already added it": the receipt on the record, picked and named by the goal.
  'goals.link.title': { en: 'Pick the receipt', es: 'Elige el recibo', fr: 'Choisis le reçu' },
  'goals.link.lead': {
    en: 'Pick the receipt you added for what you bought. The goal ends, and the money counts once.',
    es: 'Elige el recibo que agregaste por lo que compraste. La meta termina y el dinero cuenta una sola vez.',
    fr: 'Choisis le reçu que tu as ajouté pour cet achat. L’objectif se termine et l’argent ne compte qu’une fois.',
  },
  'goals.link.near': { en: 'Close to {amount}', es: 'Cerca de {amount}', fr: 'Proche de {amount}' },
  'goals.link.recent': { en: 'Recent', es: 'Recientes', fr: 'Récents' },
  'goals.link.none': {
    en: 'There are no receipts to pick yet.',
    es: 'Aún no hay recibos para elegir.',
    fr: 'Il n’y a encore aucun reçu à choisir.',
  },
  'goals.link.link': { en: 'Link receipt', es: 'Vincular recibo', fr: 'Lier le reçu' },
  'goals.link.missing': {
    en: 'Pick a receipt first.',
    es: 'Primero elige un recibo.',
    fr: 'Choisis d’abord un reçu.',
  },
  // Asked before linking a receipt smaller than what the goal holds.
  'goals.link.lessTitle': {
    en: 'This receipt is {difference} less than the goal.',
    es: 'Este recibo es {difference} menos que la meta.',
    fr: 'Ce reçu est inférieur de {difference} à l’objectif.',
  },
  'goals.link.lessMessage': {
    en: 'The rest stays out of savings.',
    es: 'La diferencia no vuelve a tus ahorros.',
    fr: 'La différence ne revient pas dans ton épargne.',
  },
  'goals.link.anyway': { en: 'Link anyway', es: 'Vincular igual', fr: 'Lier quand même' },
  'goals.link.pickAnother': { en: 'Pick another', es: 'Elegir otro', fr: 'Choisir un autre' },
});
