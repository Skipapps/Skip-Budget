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
});
