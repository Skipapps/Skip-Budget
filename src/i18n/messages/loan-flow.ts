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
});
