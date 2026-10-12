import { defineMessages } from '@/i18n/translate';

/**
 * Savings: what is left of each month, the money added on top, and the month wrap-up. A {month} at
 * the start of a line is capitalised where it is drawn, so Spanish and French keep it lower-case
 * inside a sentence.
 */
export const savingsMessages = defineMessages({
  'savings.list.title': { en: 'Savings', es: 'Ahorros', fr: 'Épargne' },

  // The Savings page.
  'savings.add': { en: 'Add to savings', es: 'Agregar a ahorros', fr: 'Ajouter à l’épargne' },
  'savings.send': {
    en: 'Send to my goals',
    es: 'Enviar a mis metas',
    fr: 'Envoyer à mes objectifs',
  },
  'savings.keep': {
    en: 'Keep it in savings',
    es: 'Dejarlo en ahorros',
    fr: 'Le garder dans l’épargne',
  },
  'savings.ready.label': { en: 'Ready to use', es: 'Listo para usar', fr: 'Prêt à utiliser' },
  'savings.ready.caption': {
    en: 'What’s left after each month moves here.',
    es: 'Lo que sobra de cada mes llega aquí.',
    fr: 'Ce qui reste de chaque mois arrive ici.',
  },
  'savings.ready.firstWrapUp': {
    en: 'Your first wrap-up arrives on {date}',
    es: 'Tu primer resumen llega el {date}',
    fr: 'Ton premier bilan arrive le {date}',
  },
  'savings.soFar.title': {
    en: '{month} so far',
    es: '{month} hasta ahora',
    fr: '{month} jusqu’ici',
  },
  'savings.soFar.inProgress': { en: 'In progress', es: 'En curso', fr: 'En cours' },
  'savings.soFar.movesOn': {
    en: 'Moves to savings on {date}',
    es: 'Pasa a ahorros el {date}',
    fr: 'Passe à l’épargne le {date}',
  },
  // A no-break space inside each pair, so a line breaks between them, never inside one.
  'savings.earnedSpent': {
    en: 'Earned\u00A0{earned} · Spent\u00A0{spent}',
    es: 'Ingresos\u00A0{earned} · Gastos\u00A0{spent}',
    fr: 'Revenus\u00A0{earned} · Dépenses\u00A0{spent}',
  },
  'savings.byMonth': { en: 'By month', es: 'Por mes', fr: 'Par mois' },
  'savings.addedOn': { en: 'Added {date}', es: 'Agregado el {date}', fr: 'Ajouté le {date}' },
  'savings.row.a11y': {
    en: '{name}, {amount}, {status}. {detail}',
    es: '{name}, {amount}, {status}. {detail}',
    fr: '{name}, {amount}, {status}. {detail}',
  },
  'savings.row.openHint': {
    en: 'Opens what moved and where it went',
    es: 'Abre lo que pasó a ahorros y a dónde fue',
    fr: 'Ouvre ce qui a été épargné et où c’est allé',
  },

  // How much of a month's or an added amount is still in savings.
  'savings.status.ready': { en: 'Ready', es: 'Listo', fr: 'Prêt' },
  'savings.status.left': { en: '{amount} left', es: 'Quedan {amount}', fr: 'Reste {amount}' },
  'savings.status.sent': {
    en: 'Sent to goals',
    es: 'Enviado a metas',
    fr: 'Envoyé aux objectifs',
  },
  'savings.status.overspent': { en: 'Overspent', es: 'Excedido', fr: 'Dépassé' },
  // A month with no pay and no spending: nothing to move, nothing overspent.
  'savings.status.nothing': {
    en: 'Nothing left over',
    es: 'No sobró nada',
    fr: 'Il ne reste rien',
  },

  // One month, or one added amount.
  'savings.pot.leftOver': { en: 'Left over', es: 'Sobrante', fr: 'Reste' },
  'savings.pot.added': {
    en: 'Added to savings',
    es: 'Agregado a ahorros',
    fr: 'Ajouté à l’épargne',
  },
  'savings.pot.movedOn': {
    en: 'Moved to savings on {date}',
    es: 'Pasó a ahorros el {date}',
    fr: 'Passé à l’épargne le {date}',
  },
  'savings.pot.addedOn': {
    en: 'Added on {date}',
    es: 'Agregado el {date}',
    fr: 'Ajouté le {date}',
  },
  'savings.pot.overspent': {
    en: 'You spent {amount} more than you earned',
    es: 'Gastaste {amount} más de lo que ganaste',
    fr: 'Tu as dépensé {amount} de plus que tes revenus',
  },
  'savings.pot.nothingMoved': {
    en: 'Nothing moved to savings this month.',
    es: 'Este mes no pasó nada a ahorros.',
    fr: 'Rien n’est passé à l’épargne ce mois-ci.',
  },
  'savings.pot.edit': { en: 'Edit savings', es: 'Editar ahorro', fr: 'Modifier l’épargne' },
  'savings.figures.earned': { en: 'Earned', es: 'Ingresos', fr: 'Revenus' },
  'savings.figures.spent': { en: 'Spent', es: 'Gastos', fr: 'Dépenses' },
  'savings.figures.leftOver': { en: 'Left over', es: 'Sobrante', fr: 'Reste' },
  'savings.whereWent.title': {
    en: 'Where your {amount} went',
    es: 'A dónde se fueron tus {amount}',
    fr: 'Où sont passés tes {amount}',
  },
  'savings.whereWent.spent': {
    en: 'Spent {percent}',
    es: 'Gastos {percent}',
    fr: 'Dépenses {percent}',
  },
  'savings.whereWent.leftOver': {
    en: 'Left over {percent}',
    es: 'Sobrante {percent}',
    fr: 'Reste {percent}',
  },
  'savings.whereWent.a11y': {
    en: 'Where your {amount} went: spent {spent}, left over {left}.',
    es: 'A dónde se fueron tus {amount}: gastos {spent}, sobrante {left}.',
    fr: 'Où sont passés tes {amount} : dépenses {spent}, reste {left}.',
  },
  'savings.state.waiting': {
    en: 'Waiting in savings',
    es: 'Esperando en ahorros',
    fr: 'En attente dans l’épargne',
  },
  'savings.state.waitingBody': {
    en: 'Send it to a goal whenever you’re ready.',
    es: 'Envíalo a una meta cuando quieras.',
    fr: 'Envoie-le vers un objectif quand tu veux.',
  },
  'savings.state.partial': {
    en: '{amount} left in savings',
    es: 'Quedan {amount} en ahorros',
    fr: 'Il reste {amount} dans l’épargne',
  },
  'savings.state.partialBody': {
    en: '{amount} went to your goals.',
    es: '{amount} se fueron a tus metas.',
    fr: '{amount} sont allés à tes objectifs.',
  },
  'savings.state.allSent': {
    en: 'All sent to goals',
    es: 'Todo enviado a metas',
    fr: 'Tout envoyé aux objectifs',
  },
  'savings.state.allSentBody': {
    en: 'All {amount} went to your goals.',
    es: 'Los {amount} se fueron a tus metas.',
    fr: 'Les {amount} sont allés à tes objectifs.',
  },

  // Pay or spending recorded for a month after its wrap-up. Nothing changes until the person says so.
  'savings.update.spentUp': {
    en: 'Since your wrap-up, {month}’s spending went up by {amount}',
    es: 'Desde tu resumen, los gastos de {month} subieron {amount}',
    fr: 'Depuis ton bilan, les dépenses pour {month} ont augmenté de {amount}',
  },
  'savings.update.spentDown': {
    en: 'Since your wrap-up, {month}’s spending went down by {amount}',
    es: 'Desde tu resumen, los gastos de {month} bajaron {amount}',
    fr: 'Depuis ton bilan, les dépenses pour {month} ont baissé de {amount}',
  },
  'savings.update.earnedUp': {
    en: 'Since your wrap-up, {month}’s pay went up by {amount}',
    es: 'Desde tu resumen, los ingresos de {month} subieron {amount}',
    fr: 'Depuis ton bilan, les revenus pour {month} ont augmenté de {amount}',
  },
  'savings.update.earnedDown': {
    en: 'Since your wrap-up, {month}’s pay went down by {amount}',
    es: 'Desde tu resumen, los ingresos de {month} bajaron {amount}',
    fr: 'Depuis ton bilan, les revenus pour {month} ont baissé de {amount}',
  },
  'savings.update.button': {
    en: 'Update to {amount}',
    es: 'Actualizar a {amount}',
    fr: 'Mettre à jour à {amount}',
  },
  // Taking the update replaces an amount the person typed for the month by hand.
  'savings.update.replaces': {
    en: 'This replaces the {amount} you set.',
    es: 'Esto reemplaza los {amount} que pusiste.',
    fr: 'Cela remplace les {amount} que tu avais mis.',
  },
  'savings.update.capped': {
    en: '{amount} is already in your goals, so {month} stays at {amount}.',
    es: '{amount} ya está en tus metas, así que {month} se queda en {amount}.',
    fr: '{amount} est déjà dans tes objectifs, donc {month} reste à {amount}.',
  },

  // Adding savings that are not pay, or changing what a month moved.
  'savings.entry.addTitle': {
    en: 'Add to savings',
    es: 'Agregar a ahorros',
    fr: 'Ajouter à l’épargne',
  },
  'savings.entry.editTitle': { en: 'Edit savings', es: 'Editar ahorro', fr: 'Modifier l’épargne' },
  'savings.entry.addSubtitle': {
    en: 'A gift, cash you found, anything that isn’t pay.',
    es: 'Un regalo, dinero que encontraste, lo que no sea tu sueldo.',
    fr: 'Un cadeau, de l’argent trouvé, tout ce qui n’est pas ta paie.',
  },
  'savings.entry.monthSubtitle': {
    en: 'Change what this month moved to savings.',
    es: 'Cambia lo que este mes pasó a ahorros.',
    fr: 'Change ce que ce mois a mis dans l’épargne.',
  },
  'savings.entry.name': { en: 'Name', es: 'Nombre', fr: 'Nom' },
  'savings.entry.namePlaceholder': {
    en: 'e.g. Birthday gift',
    es: 'p. ej., Regalo de cumpleaños',
    fr: 'p. ex. Cadeau d’anniversaire',
  },
  'savings.entry.amount': { en: 'Amount', es: 'Monto', fr: 'Montant' },
  'savings.entry.date': { en: 'Date', es: 'Fecha', fr: 'Date' },
  'savings.entry.note': { en: 'Note', es: 'Nota', fr: 'Note' },
  'savings.entry.notePlaceholder': {
    en: 'Anything to remember about it',
    es: 'Algo que quieras recordar',
    fr: 'Un détail à retenir',
  },
  // {fields} is the boxes still empty, by the names they carry on the page.
  'savings.entry.missing': {
    en: 'To save this, fill in: {fields}.',
    es: 'Para guardarlo, completa: {fields}.',
    fr: 'Pour l’enregistrer, remplis : {fields}.',
  },
  'savings.entry.add': {
    en: 'Add to savings',
    es: 'Agregar a ahorros',
    fr: 'Ajouter à l’épargne',
  },
  'savings.entry.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },
  'savings.entry.saveChanges': {
    en: 'Save changes',
    es: 'Guardar cambios',
    fr: 'Enregistrer les modifications',
  },
  'savings.entry.zero': {
    en: 'Savings can’t be {amount}. Remove it from savings instead.',
    es: 'Un ahorro no puede ser de {amount}. Mejor quítalo de ahorros.',
    fr: 'Une épargne ne peut pas être de {amount}. Retire-la plutôt de l’épargne.',
  },
  'savings.entry.future': {
    en: 'Pick today or a day before it.',
    es: 'Elige hoy o un día anterior.',
    fr: 'Choisis aujourd’hui ou un jour d’avant.',
  },
  'savings.entry.remove': {
    en: 'Remove from savings',
    es: 'Quitar de ahorros',
    fr: 'Retirer de l’épargne',
  },
  'savings.entry.removeTitle': {
    en: 'Remove {name} from savings?',
    es: '¿Quitar {name} de ahorros?',
    fr: 'Retirer {name} de l’épargne ?',
  },
  'savings.entry.removeBody': {
    en: '{amount} comes out of your savings.',
    es: '{amount} sale de tus ahorros.',
    fr: '{amount} sort de ton épargne.',
  },
  'savings.entry.inGoals': {
    en: '{amount} of this is already in your goals. Take it out of a goal first.',
    es: '{amount} de esto ya está en tus metas. Sácalo primero de una meta.',
    fr: '{amount} de ce montant est déjà dans tes objectifs. Retire-le d’abord d’un objectif.',
  },

  // Sending savings to goals.
  'savings.sendPage.title': {
    en: 'Send to goals',
    es: 'Enviar a metas',
    fr: 'Envoyer aux objectifs',
  },
  'savings.sendPage.from': { en: 'From savings', es: 'De tus ahorros', fr: 'De ton épargne' },
  'savings.sendPage.available': {
    en: '{amount} available',
    es: '{amount} disponibles',
    fr: '{amount} disponibles',
  },
  // One pot with money left, in the list under the figure: "September $640 · July $210".
  'savings.sendPage.potLeft': {
    en: '{name} {amount}',
    es: '{name} {amount}',
    fr: '{name} {amount}',
  },
  'savings.sendPage.yourGoals': { en: 'Your goals', es: 'Tus metas', fr: 'Tes objectifs' },
  'savings.sendPage.splitEvenly': {
    en: 'Split evenly',
    es: 'Repartir por igual',
    fr: 'Répartir également',
  },
  'savings.sendPage.less': {
    en: 'Send {step} less to {name}',
    es: 'Enviar {step} menos a {name}',
    fr: 'Envoyer {step} de moins à {name}',
  },
  'savings.sendPage.more': {
    en: 'Send {step} more to {name}',
    es: 'Enviar {step} más a {name}',
    fr: 'Envoyer {step} de plus à {name}',
  },
  'savings.sendPage.amountA11y': {
    en: 'Sending {amount} to {name}',
    es: 'Enviando {amount} a {name}',
    fr: 'Envoi de {amount} à {name}',
  },
  'savings.sendPage.typeHint': {
    en: 'Type an amount',
    es: 'Escribe un monto',
    fr: 'Saisis un montant',
  },
  'savings.sendPage.addChip': { en: '+{amount}', es: '+{amount}', fr: '+{amount}' },
  'savings.sendPage.addChipA11y': {
    en: 'Add {amount} for {name}',
    es: 'Agregar {amount} para {name}',
    fr: 'Ajouter {amount} pour {name}',
  },
  'savings.sendPage.fill': { en: 'Fill goal', es: 'Completar meta', fr: 'Remplir l’objectif' },
  'savings.sendPage.fillA11y': {
    en: 'Fill {name}',
    es: 'Completar {name}',
    fr: 'Remplir {name}',
  },
  'savings.sendPage.toGoals': {
    en: '{amount} to goals',
    es: '{amount} a metas',
    fr: '{amount} aux objectifs',
  },
  'savings.sendPage.stays': {
    en: '{amount} stays in savings',
    es: '{amount} se queda en ahorros',
    fr: '{amount} reste dans l’épargne',
  },
  'savings.sendPage.button': { en: 'Send {amount}', es: 'Enviar {amount}', fr: 'Envoyer {amount}' },
  'savings.sendPage.sending': { en: 'Sending…', es: 'Enviando…', fr: 'Envoi…' },
  'savings.sendPage.nothing': {
    en: 'Choose how much to send to a goal.',
    es: 'Elige cuánto enviar a una meta.',
    fr: 'Choisis combien envoyer vers un objectif.',
  },
  'savings.sendPage.typeTitle': {
    en: 'How much for {name}?',
    es: '¿Cuánto para {name}?',
    fr: 'Combien pour {name} ?',
  },
  'savings.sendPage.upTo': {
    en: 'Up to {amount}',
    es: 'Hasta {amount}',
    fr: 'Jusqu’à {amount}',
  },
  'savings.sendPage.needs': {
    en: '{name} needs {amount} more.',
    es: 'A {name} le faltan {amount}.',
    fr: 'Il manque {amount} à {name}.',
  },
  'savings.sendPage.room': {
    en: 'You have {amount} to send.',
    es: 'Tienes {amount} para enviar.',
    fr: 'Tu as {amount} à envoyer.',
  },
  'savings.sendPage.noGoals': {
    en: 'Create a goal and start collecting for it',
    es: 'Crea una meta y empieza a juntar para ella',
    fr: 'Crée un objectif et commence à mettre de côté',
  },
  'savings.sendPage.noGoalsBody': {
    en: 'Name what you’re saving for, then send money to it whenever you like.',
    es: 'Ponle nombre a lo que quieres y envíale dinero cuando quieras.',
    fr: 'Nomme ce pour quoi tu épargnes, puis envoie-y de l’argent quand tu veux.',
  },

  // When the money rules refuse a write for a reason the page can name.
  'savings.refusal.gone': {
    en: 'This changed on another phone. Go back and try again.',
    es: 'Esto cambió en otro teléfono. Regresa e inténtalo de nuevo.',
    fr: 'Ceci a changé sur un autre téléphone. Reviens en arrière et réessaie.',
  },
  'savings.refusal.notFinished': {
    en: 'This month hasn’t ended yet.',
    es: 'Este mes todavía no termina.',
    fr: 'Ce mois n’est pas encore fini.',
  },

  // After sending.
  'savings.sent.title': {
    en: 'Sent to your goals',
    es: 'Enviado a tus metas',
    fr: 'Envoyé à tes objectifs',
  },
  'savings.sent.subtitle': {
    en: '{amount} moved from savings. Nicely done.',
    es: '{amount} salieron de tus ahorros. ¡Bien hecho!',
    fr: '{amount} sont sortis de ton épargne. Bien joué !',
  },
  'savings.sent.added': { en: '+{amount}', es: '+{amount}', fr: '+{amount}' },
  'savings.sent.now': {
    en: 'Now {saved} of {target}',
    es: 'Ahora {saved} de {target}',
    fr: 'Maintenant {saved} sur {target}',
  },
  'savings.sent.lineA11y': {
    en: '{name}, plus {amount}. Now {saved} of {target}.',
    es: '{name}, más {amount}. Ahora {saved} de {target}.',
    fr: '{name}, plus {amount}. Maintenant {saved} sur {target}.',
  },
  'savings.sent.still': {
    en: 'Still in savings',
    es: 'Sigue en ahorros',
    fr: 'Encore dans l’épargne',
  },
  'savings.sent.stillBody': {
    en: 'Ready whenever you need it',
    es: 'Listo para cuando lo necesites',
    fr: 'Prêt quand tu en as besoin',
  },
  'savings.sent.viewGoals': { en: 'View goals', es: 'Ver metas', fr: 'Voir les objectifs' },

  // The month wrap-up, shown once on the first open after a month closes.
  'savings.wrapUp.kicker': {
    en: '{month} wrap-up',
    es: 'Resumen de {month}',
    fr: '{month} : le bilan',
  },
  'savings.wrapUp.saved': {
    en: 'Congrats, you saved {amount}!',
    es: '¡Felicidades, ahorraste {amount}!',
    fr: 'Bravo, tu as épargné {amount} !',
  },
  'savings.wrapUp.howWent': {
    en: 'Here’s how your {month} went.',
    es: 'Así te fue en {month}.',
    fr: 'Voici ton bilan pour {month}.',
  },
  'savings.wrapUp.earned': { en: 'You earned', es: 'Ganaste', fr: 'Tu as gagné' },
  'savings.wrapUp.spent': { en: 'You spent', es: 'Gastaste', fr: 'Tu as dépensé' },
  'savings.wrapUp.moving': {
    en: 'Moving to savings',
    es: 'Pasa a ahorros',
    fr: 'Va à l’épargne',
  },
  'savings.wrapUp.waiting': {
    en: 'It’s waiting in Savings. Send it to your goals whenever you like.',
    es: 'Te espera en Ahorros. Envíalo a tus metas cuando quieras.',
    fr: 'Il t’attend dans l’Épargne. Envoie-le vers tes objectifs quand tu veux.',
  },
  'savings.wrapUp.later': { en: 'Maybe later', es: 'Quizás después', fr: 'Plus tard' },
  // {month} is the month now starting.
  'savings.wrapUp.freshStart': {
    en: 'Nothing moved to savings. {month} is a fresh start.',
    es: 'Nada pasó a ahorros. {month} empieza de cero.',
    fr: 'Rien n’est passé à l’épargne. {month} repart à zéro.',
  },
  'savings.wrapUp.gotIt': { en: 'Got it', es: 'Entendido', fr: 'Compris' },
  'savings.wrapUp.getting': {
    en: 'Getting your {month} ready',
    es: 'Preparando tu resumen de {month}',
    fr: 'On prépare ton bilan pour {month}',
  },
});
