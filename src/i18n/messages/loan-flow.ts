import { defineMessages } from '@/i18n/translate';

/**
 * Adding a loan you have: the monthly payment, the loan's details, and the review it is saved from.
 * The calculator's Save opens the same pages, filled in.
 */
export const loanFlowMessages = defineMessages({
  // What close asks before it throws the loan away.
  'loanFlow.close': {
    en: 'Cancel adding this loan?',
    es: '¿Dejar de agregar este préstamo?',
    fr: 'Annuler l’ajout de ce prêt ?',
  },

  // The keypad pages.
  'loanFlow.monthly.question': {
    en: 'How much do you pay each month?',
    es: '¿Cuánto pagas cada mes?',
    fr: 'Combien paies-tu chaque mois ?',
  },
  'loanFlow.monthly.helper': {
    en: 'Enter your monthly installment.',
    es: 'Escribe tu cuota mensual.',
    fr: 'Entre ta mensualité.',
  },
  'loanFlow.borrowed.question': {
    en: 'How much did you borrow?',
    es: '¿Cuánto pediste prestado?',
    fr: 'Combien as-tu emprunté ?',
  },
  'loanFlow.borrowed.helper': {
    en: 'The amount you borrowed, before interest.',
    es: 'Lo que pediste prestado, sin intereses.',
    fr: 'Le montant emprunté, sans les intérêts.',
  },

  // The details page.
  'loanFlow.details.title': { en: 'Your loan', es: 'Tu préstamo', fr: 'Ton prêt' },
  'loanFlow.field.name': { en: 'Loan name', es: 'Nombre del préstamo', fr: 'Nom du prêt' },
  'loanFlow.field.borrowed': {
    en: 'Amount borrowed',
    es: 'Importe prestado',
    fr: 'Montant emprunté',
  },
  // The same name in every language, as the schedule writes it.
  'loanFlow.field.apr': { en: 'APR', es: 'APR', fr: 'APR' },
  'loanFlow.field.start': { en: 'Start date', es: 'Fecha de inicio', fr: 'Date de début' },
  'loanFlow.field.startPlaceholder': {
    en: 'When you got the money',
    es: 'Cuándo recibiste el dinero',
    fr: 'Quand tu as reçu l’argent',
  },
  'loanFlow.field.paymentDay': { en: 'Payment day', es: 'Día de pago', fr: 'Jour de paiement' },
  'loanFlow.field.addA11y': {
    en: '{label}, empty. Add',
    es: '{label}, vacío. Agregar',
    fr: '{label}, vide. Ajouter',
  },
  'loanFlow.term.years': { en: 'Years', es: 'Años', fr: 'Ans' },
  'loanFlow.term.months': { en: 'Months', es: 'Meses', fr: 'Mois' },
  'loanFlow.term.tooLong': {
    en: 'A loan’s term can be up to {years} years.',
    es: 'El plazo de un préstamo puede ser de hasta {years} años.',
    fr: 'La durée d’un prêt peut aller jusqu’à {years} ans.',
  },
  'loanFlow.firstPayment': {
    en: 'First payment {date}',
    es: 'Primer pago: {date}',
    fr: 'Premier paiement : {date}',
  },
  // The existing refusal, naming what cannot keep up, since it sits under the whole page.
  'loanFlow.details.paymentTooLow': {
    en: 'Your monthly payment can’t keep up with this loan’s interest. The least it can be is {minimum}.',
    es: 'Tu pago mensual no alcanza para cubrir los intereses de este préstamo. Lo mínimo posible es {minimum}.',
    fr: 'Ton paiement mensuel ne suffit pas à couvrir les intérêts de ce prêt. Le minimum possible est {minimum}.',
  },
  // {fields} is the boxes still empty, by the names they carry on the page, in page order.
  'loanFlow.details.missing': {
    en: 'To continue, fill in: {fields}.',
    es: 'Para continuar, completa: {fields}.',
    fr: 'Pour continuer, remplis : {fields}.',
  },

  // What the name box says until the person types one.
  'loanFlow.defaultName.personal': {
    en: 'Personal loan',
    es: 'Préstamo personal',
    fr: 'Prêt personnel',
  },
  'loanFlow.defaultName.car': { en: 'Car loan', es: 'Préstamo de auto', fr: 'Prêt auto' },
  'loanFlow.defaultName.student': {
    en: 'Student loan',
    es: 'Préstamo estudiantil',
    fr: 'Prêt étudiant',
  },
  'loanFlow.defaultName.home': {
    en: 'Home loan',
    es: 'Préstamo hipotecario',
    fr: 'Prêt immobilier',
  },
  'loanFlow.defaultName.business': {
    en: 'Business loan',
    es: 'Préstamo de negocio',
    fr: 'Prêt d’entreprise',
  },
  'loanFlow.defaultName.medical': {
    en: 'Medical loan',
    es: 'Préstamo médico',
    fr: 'Prêt médical',
  },
  'loanFlow.defaultName.creditCard': {
    en: 'Credit card',
    es: 'Tarjeta de crédito',
    fr: 'Carte de crédit',
  },
  'loanFlow.defaultName.other': { en: 'Loan', es: 'Préstamo', fr: 'Prêt' },

  // The review page.
  'loanFlow.review.title': {
    en: 'Review your loan',
    es: 'Revisa tu préstamo',
    fr: 'Vérifie ton prêt',
  },
  'loanFlow.review.nextPayment': {
    en: 'Next payment {date}',
    es: 'Próximo pago: {date}',
    fr: 'Prochain paiement : {date}',
  },
  'loanFlow.review.lastPayment': {
    en: 'Last payment {date}',
    es: 'Último pago: {date}',
    fr: 'Dernier paiement : {date}',
  },
  // "4 years · 48 payments": the term, then as many payments as the schedule holds.
  'loanFlow.review.termCount': {
    en: { one: '{term} · {count} payment', other: '{term} · {count} payments' },
    es: { one: '{term} · {count} pago', other: '{term} · {count} pagos' },
    fr: { one: '{term} · {count} paiement', other: '{term} · {count} paiements' },
  },
  'loanFlow.review.termCountA11y': {
    en: { one: '{term}, {count} payment', other: '{term}, {count} payments' },
    es: { one: '{term}, {count} pago', other: '{term}, {count} pagos' },
    fr: { one: '{term}, {count} paiement', other: '{term}, {count} paiements' },
  },
  // Single payments changed in the calculator that the loan as edited can no longer take.
  'loanFlow.review.dropped': {
    en: {
      one: 'Your change to payment {numbers} no longer fits this loan, so it isn’t saved.',
      other: 'Your changes to payments {numbers} no longer fit this loan, so they aren’t saved.',
    },
    es: {
      one: 'Tu cambio al pago {numbers} ya no encaja con este préstamo, así que no se guarda.',
      other:
        'Tus cambios a los pagos {numbers} ya no encajan con este préstamo, así que no se guardan.',
    },
    fr: {
      one: 'Ta modification du paiement {numbers} ne convient plus à ce prêt : elle n’est pas enregistrée.',
      other:
        'Tes modifications des paiements {numbers} ne conviennent plus à ce prêt : elles ne sont pas enregistrées.',
    },
  },
  'loanFlow.review.totalPaid': {
    en: 'Total you’ll pay',
    es: 'Total que pagarás',
    fr: 'Total que tu paieras',
  },
  'loanFlow.review.inBills': {
    en: 'Add to monthly bills',
    es: 'Agregar a las facturas mensuales',
    fr: 'Ajouter aux factures mensuelles',
  },
  'loanFlow.review.inBillsOn': {
    en: 'Counts toward your monthly spending',
    es: 'Cuenta en tus gastos del mes',
    fr: 'Compte dans tes dépenses du mois',
  },
  'loanFlow.review.inBillsOff': {
    en: 'Stays under Loans, out of your spending',
    es: 'Se queda en Préstamos, fuera de tus gastos',
    fr: 'Reste dans Prêts, hors de tes dépenses',
  },
  'loanFlow.review.noPaymentsLeft': {
    en: 'No payments left to remind you about',
    es: 'No quedan pagos que recordarte',
    fr: 'Plus aucun paiement à te rappeler',
  },
  'loanFlow.review.save': {
    en: 'Save loan',
    es: 'Guardar préstamo',
    fr: 'Enregistrer le prêt',
  },
  'loanFlow.review.backToEdit': {
    en: 'Back to edit',
    es: 'Volver a editar',
    fr: 'Revenir aux détails',
  },

  // Changing a saved loan: the same pages, opened on its details, filled in.
  'loanFlow.edit.title': { en: 'Edit loan', es: 'Editar préstamo', fr: 'Modifier le prêt' },
  'loanFlow.edit.close': {
    en: 'Cancel editing this loan?',
    es: '¿Dejar de editar este préstamo?',
    fr: 'Annuler la modification de ce prêt ?',
  },
  'loanFlow.edit.save': {
    en: 'Save changes',
    es: 'Guardar cambios',
    fr: 'Enregistrer les modifications',
  },
  // An edit that starts the loan after money already paid off it.
  'loanFlow.edit.startAfterPayoff': {
    en: 'Your extra payment of {amount} on {date} comes before this start date. Remove it first or pick an earlier start.',
    es: 'Tu pago extra de {amount} del {date} es anterior a esta fecha de inicio. Quítalo primero o elige un inicio anterior.',
    fr: 'Ton paiement supplémentaire de {amount} du {date} est antérieur à cette date de début. Retire-le d’abord ou choisis un début plus tôt.',
  },
  'loanFlow.edit.delete': { en: 'Delete loan', es: 'Eliminar préstamo', fr: 'Supprimer le prêt' },
  'loanFlow.edit.deleting': { en: 'Deleting…', es: 'Eliminando…', fr: 'Suppression…' },
  'loanFlow.edit.deleteTitle': {
    en: 'Delete this loan?',
    es: '¿Eliminar este préstamo?',
    fr: 'Supprimer ce prêt ?',
  },
  // Deleting a loan removes its bill, and every payment recorded against it goes too.
  'loanFlow.edit.deleteMessage': {
    en: 'Its payment history and reminder are deleted too. This can’t be undone.',
    es: 'También se eliminan su historial de pagos y su recordatorio. Esto no se puede deshacer.',
    fr: 'Son historique de paiements et son rappel sont aussi supprimés. Cette action est irréversible.',
  },

  // The loan's own page.
  'loanFlow.view.editA11y': { en: 'Edit {name}', es: 'Editar {name}', fr: 'Modifier {name}' },
  'loanFlow.view.leftToPay': { en: 'Left to pay', es: 'Por pagar', fr: 'Reste à payer' },
  'loanFlow.view.paymentsLeft': {
    en: 'Payments left',
    es: 'Pagos restantes',
    fr: 'Paiements restants',
  },
  // "27 of 48": payments left of every payment the schedule holds.
  'loanFlow.view.paymentsOf': {
    en: '{left} of {count}',
    es: '{left} de {count}',
    fr: '{left} sur {count}',
  },
  'loanFlow.view.seeAll': { en: 'See all', es: 'Ver todo', fr: 'Tout voir' },
  'loanFlow.view.seeAllA11y': {
    en: 'See all, {section}',
    es: 'Ver todo, {section}',
    fr: 'Tout voir, {section}',
  },
  'loanFlow.view.scheduleHint': {
    en: 'Opens every payment and where it goes.',
    es: 'Abre todos los pagos y a dónde va cada uno.',
    fr: 'Ouvre chaque paiement et sa répartition.',
  },
  'loanFlow.view.noneLeft': {
    en: 'No more payments on this loan.',
    es: 'Este préstamo ya no tiene pagos.',
    fr: 'Plus aucun paiement sur ce prêt.',
  },
  'loanFlow.view.upcomingA11y': {
    en: 'Payment {number}, {date}. {payment}: {principal} principal, {interest} interest.',
    es: 'Pago {number}, {date}. {payment}: {principal} a capital, {interest} de intereses.',
    fr: 'Paiement {number}, {date}. {payment} : {principal} en capital, {interest} d’intérêts.',
  },
  'loanFlow.view.history': { en: 'History', es: 'Historial', fr: 'Historique' },
  'loanFlow.view.historyHint': {
    en: 'Shows every payment made.',
    es: 'Muestra todos los pagos hechos.',
    fr: 'Affiche tous les paiements effectués.',
  },
  'loanFlow.view.paidFrom': {
    en: 'Paid from {source}',
    es: 'Pagado desde {source}',
    fr: 'Payé depuis {source}',
  },
  'loanFlow.view.historyA11y': {
    en: 'Payment {number}, {date}, {payment}, paid from {source}.',
    es: 'Pago {number}, {date}, {payment}, pagado desde {source}.',
    fr: 'Paiement {number}, {date}, {payment}, payé depuis {source}.',
  },
  'loanFlow.view.historyNoSourceA11y': {
    en: 'Payment {number}, {date}, {payment}.',
    es: 'Pago {number}, {date}, {payment}.',
    fr: 'Paiement {number}, {date}, {payment}.',
  },
  'loanFlow.view.firstOn': {
    en: 'Your first payment is on {date}.',
    es: 'Tu primer pago es el {date}.',
    fr: 'Ton premier paiement est le {date}.',
  },
  'loanFlow.view.noPayments': {
    en: 'No payments on this loan yet.',
    es: 'Este préstamo aún no tiene pagos.',
    fr: 'Aucun paiement sur ce prêt pour l’instant.',
  },
  // Read out for the card in one go, in place of the figures drawn.
  'loanFlow.view.cardA11y': {
    en: '{name}. {when}. {left} left to pay, {percent} paid off.',
    es: '{name}. {when}. Quedan {left} por pagar, {percent} pagado.',
    fr: '{name}. {when}. Reste {left} à payer, {percent} remboursé.',
  },
  // Paying a loan off, all of it or part of it, from its own page.
  'loanFlow.payoff.action': { en: 'Pay off', es: 'Pagar', fr: 'Rembourser' },
  'loanFlow.payoff.actionHint': {
    en: 'Pay all of this loan, or part of it.',
    es: 'Paga todo este préstamo o una parte.',
    fr: 'Rembourse tout ce prêt, ou une partie.',
  },
  'loanFlow.payoff.title': { en: 'Pay off {name}', es: 'Pagar {name}', fr: 'Rembourser {name}' },
  'loanFlow.payoff.close': {
    en: 'Cancel this payment?',
    es: '¿Cancelar este pago?',
    fr: 'Annuler ce paiement ?',
  },
  'loanFlow.payoff.question': {
    en: 'How much are you paying?',
    es: '¿Cuánto vas a pagar?',
    fr: 'Combien rembourses-tu ?',
  },
  'loanFlow.payoff.helper': {
    en: 'All of it or part of it, as you like.',
    es: 'Todo o una parte, como prefieras.',
    fr: 'Tout ou une partie, comme tu veux.',
  },
  'loanFlow.payoff.all': { en: 'Pay it all', es: 'Pagarlo todo', fr: 'Tout rembourser' },
  'loanFlow.payoff.allOn': {
    en: '{amount} clears this loan on {date}',
    es: '{amount} salda este préstamo el {date}',
    fr: '{amount} solde ce prêt le {date}',
  },
  'loanFlow.payoff.allToday': {
    en: '{amount} clears this loan today',
    es: '{amount} salda este préstamo hoy',
    fr: '{amount} solde ce prêt aujourd’hui',
  },
  // What the amount typed does, said as it is typed.
  'loanFlow.payoff.full': {
    en: 'This pays off {name}. No more payments after {date}.',
    es: 'Con esto terminas de pagar {name}. No hay más pagos después del {date}.',
    fr: 'Ce paiement solde {name}. Plus aucun paiement après le {date}.',
  },
  'loanFlow.payoff.partial': {
    en: {
      one: '{count} payment left instead of {before}, last payment {date}',
      other: '{count} payments left instead of {before}, last payment {date}',
    },
    es: {
      one: 'Queda {count} pago en vez de {before}; último pago: {date}',
      other: 'Quedan {count} pagos en vez de {before}; último pago: {date}',
    },
    fr: {
      one: '{count} paiement restant au lieu de {before}, dernier paiement le {date}',
      other: '{count} paiements restants au lieu de {before}, dernier paiement le {date}',
    },
  },
  // Too little to take a payment off the end: the count stays and the last one shrinks.
  'loanFlow.payoff.partialSame': {
    en: {
      one: 'Still {count} payment left, last payment {date}',
      other: 'Still {count} payments left, last payment {date}',
    },
    es: {
      one: 'Sigue quedando {count} pago; último pago: {date}',
      other: 'Siguen quedando {count} pagos; último pago: {date}',
    },
    fr: {
      one: 'Toujours {count} paiement restant, dernier paiement le {date}',
      other: 'Toujours {count} paiements restants, dernier paiement le {date}',
    },
  },
  'loanFlow.payoff.tooMuch': {
    en: 'That’s more than this loan needs. {amount} clears it on {date}.',
    es: 'Es más de lo que falta por pagar. {amount} salda el préstamo el {date}.',
    fr: 'C’est plus que ce qui reste à payer. {amount} solde le prêt le {date}.',
  },
  'loanFlow.payoff.tooMuchToday': {
    en: 'That’s more than this loan needs. {amount} clears it today.',
    es: 'Es más de lo que falta por pagar. {amount} salda el préstamo hoy.',
    fr: 'C’est plus que ce qui reste à payer. {amount} solde le prêt aujourd’hui.',
  },
  'loanFlow.payoff.useAll': { en: 'Pay {amount}', es: 'Pagar {amount}', fr: 'Rembourser {amount}' },
  'loanFlow.payoff.beforeStart': {
    en: 'This loan started on {date}. Pick that day or later.',
    es: 'Este préstamo empezó el {date}. Elige ese día o uno posterior.',
    fr: 'Ce prêt a commencé le {date}. Choisis ce jour-là ou un jour suivant.',
  },
  'loanFlow.payoff.future': {
    en: 'A payment can’t be dated after today.',
    es: 'Un pago no puede tener fecha posterior a hoy.',
    fr: 'Un paiement ne peut pas être daté après aujourd’hui.',
  },
  // A payment or payoff already made on or after the day picked: paying it all comes after it.
  'loanFlow.payoff.afterPayment': {
    en: 'Your payment on {date} is already made. You can pay it all from {earliest}.',
    es: 'Tu pago del {date} ya está hecho. Puedes pagarlo todo a partir del {earliest}.',
    fr: 'Ton paiement du {date} est déjà fait. Tu peux tout rembourser à partir du {earliest}.',
  },
  // Dated before payments already made, and so much it would end the loan before them.
  'loanFlow.payoff.overtakes': {
    en: 'On this day, the most you can pay is {amount}. More would pay the loan off before payments already made.',
    es: 'En este día, lo máximo que puedes pagar es {amount}. Más saldaría el préstamo antes de pagos ya hechos.',
    fr: 'Ce jour-là, tu peux rembourser au plus {amount}. Davantage solderait le prêt avant des paiements déjà faits.',
  },
  'loanFlow.payoff.overtakesNone': {
    en: 'Nothing can be paid on this day without changing payments already made. Pick a later day.',
    es: 'No se puede pagar nada en este día sin cambiar pagos ya hechos. Elige un día posterior.',
    fr: 'Rien ne peut être remboursé ce jour-là sans changer des paiements déjà faits. Choisis un jour plus tard.',
  },
  'loanFlow.payoff.notStarted': {
    en: 'This loan starts on {date}. You can pay it off from then.',
    es: 'Este préstamo empieza el {date}. Podrás pagarlo a partir de entonces.',
    fr: 'Ce prêt commence le {date}. Tu pourras le rembourser à partir de là.',
  },
  'loanFlow.payoff.finished': {
    en: 'This loan is already paid off.',
    es: 'Este préstamo ya está pagado.',
    fr: 'Ce prêt est déjà remboursé.',
  },
  'loanFlow.payoff.paying': { en: 'You’re paying', es: 'Vas a pagar', fr: 'Tu rembourses' },
  'loanFlow.payoff.interestSince': {
    en: 'Includes {amount} of interest since {date}.',
    es: 'Incluye {amount} de intereses desde el {date}.',
    fr: 'Dont {amount} d’intérêts depuis le {date}.',
  },
  'loanFlow.payoff.date': { en: 'Paid on', es: 'Pagado el', fr: 'Payé le' },
  'loanFlow.payoff.changeAmount': {
    en: 'Change amount',
    es: 'Cambiar importe',
    fr: 'Modifier le montant',
  },
  'loanFlow.payoff.saving': { en: 'Paying off…', es: 'Pagando…', fr: 'Remboursement…' },

  // Money paid off a loan, in its History, and taking it back out.
  'loanFlow.view.paidOff': { en: 'Paid off', es: 'Liquidado', fr: 'Soldé' },
  'loanFlow.view.extraPayment': {
    en: 'Extra payment',
    es: 'Pago extra',
    fr: 'Paiement supplémentaire',
  },
  // "12 Oct · Paid from Chase ••4821"
  'loanFlow.view.payoffDetail': {
    en: '{date} · {source}',
    es: '{date} · {source}',
    fr: '{date} · {source}',
  },
  'loanFlow.view.payoffA11y': {
    en: '{kind}, {date}, {amount}, paid from {source}.',
    es: '{kind}, {date}, {amount}, pagado desde {source}.',
    fr: '{kind}, {date}, {amount}, payé depuis {source}.',
  },
  'loanFlow.view.payoffNoSourceA11y': {
    en: '{kind}, {date}, {amount}.',
    es: '{kind}, {date}, {amount}.',
    fr: '{kind}, {date}, {amount}.',
  },
  'loanFlow.view.payoffHint': {
    en: 'Removes this payment, after you confirm.',
    es: 'Quita este pago, después de confirmarlo.',
    fr: 'Retire ce paiement, après confirmation.',
  },
  'loanFlow.view.removeTitle': {
    en: 'Remove this payment?',
    es: '¿Quitar este pago?',
    fr: 'Retirer ce paiement ?',
  },
  'loanFlow.view.removeMessage': {
    en: '{amount} paid on {date} comes off this loan, and its figures go back to how they were without it.',
    es: 'Se quita de este préstamo el pago de {amount} del {date}, y sus cifras vuelven a ser como sin él.',
    fr: 'Le paiement de {amount} du {date} est retiré de ce prêt, et ses chiffres redeviennent ceux d’avant.',
  },
  // Payments paid off come back out newest first: an earlier one says which to take out first.
  'loanFlow.view.removeLaterFirst': {
    en: 'Remove the later payment first',
    es: 'Quita primero el pago posterior',
    fr: 'Retire d’abord le paiement suivant',
  },
  'loanFlow.view.removeLaterFirstMessage': {
    en: 'Payments come off newest first. Remove the one on {date}, then this one.',
    es: 'Los pagos se quitan del más reciente al más antiguo. Quita el del {date} y luego este.',
    fr: 'Les paiements se retirent du plus récent au plus ancien. Retire celui du {date}, puis celui-ci.',
  },

  // A payoff among the payments of a saved loan's schedule.
  'loanFlow.schedule.payoffA11y': {
    en: '{kind}, {date}. {amount}: {interest} interest, {principal} off the balance. {balance} left.',
    es: '{kind}, {date}. {amount}: {interest} de intereses, {principal} a capital. Quedan {balance}.',
    fr: '{kind}, {date}. {amount} : {interest} d’intérêts, {principal} en capital. Reste {balance}.',
  },
  // A schedule year with no payment in it, only money paid off.
  'loanFlow.schedule.yearPaidOff': {
    en: 'Paid off · {interest} interest',
    es: 'Liquidado · {interest} de intereses',
    fr: 'Soldé · {interest} d’intérêts',
  },
  'loanFlow.schedule.yearExtra': {
    en: {
      one: 'Extra payment · {interest} interest',
      other: '{count} extra payments · {interest} interest',
    },
    es: {
      one: 'Pago extra · {interest} de intereses',
      other: '{count} pagos extra · {interest} de intereses',
    },
    fr: {
      one: 'Paiement supplémentaire · {interest} d’intérêts',
      other: '{count} paiements supplémentaires · {interest} d’intérêts',
    },
  },
});
