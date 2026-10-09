import { defineMessages } from '@/i18n/translate';

export const accountsMessages = defineMessages({
  'accounts.type.checking': { en: 'Checking', es: 'Cheques', fr: 'Chèques' },
  'accounts.type.savings': { en: 'Savings', es: 'Ahorros', fr: 'Épargne' },

  'accounts.add.editTitle': { en: 'Edit account', es: 'Editar cuenta', fr: 'Modifier le compte' },
  'accounts.add.addTitle': {
    en: 'Add an account',
    es: 'Agregar una cuenta',
    fr: 'Ajouter un compte',
  },
  'accounts.add.closeEditing': {
    en: 'Cancel editing this account?',
    es: '¿Dejar de editar esta cuenta?',
    fr: 'Annuler la modification de ce compte ?',
  },
  'accounts.add.closeAdding': {
    en: 'Cancel adding this account?',
    es: '¿Dejar de agregar esta cuenta?',
    fr: 'Annuler l’ajout de ce compte ?',
  },
  'accounts.add.deleteTitle': {
    en: 'Delete this account?',
    es: '¿Eliminar esta cuenta?',
    fr: 'Supprimer ce compte ?',
  },
  'accounts.add.deleteMessage': {
    en: 'Receipts, bills and subscriptions paid from it are kept, but stop showing this account.',
    es: 'Los recibos, las facturas y las suscripciones que pagaste desde ella se conservan, pero dejan de mostrar esta cuenta.',
    fr: 'Les reçus, factures et abonnements payés depuis ce compte sont conservés, mais n’affichent plus ce compte.',
  },
  'accounts.add.deleteLabel': {
    en: 'Delete this account',
    es: 'Eliminar esta cuenta',
    fr: 'Supprimer ce compte',
  },
  'accounts.add.deleteAccount': {
    en: 'Delete account',
    es: 'Eliminar cuenta',
    fr: 'Supprimer le compte',
  },
  'accounts.add.bankNameMissing': {
    en: 'Enter the bank name.',
    es: 'Ingresa el nombre del banco.',
    fr: 'Indique le nom de la banque.',
  },
  'accounts.add.balanceQuestion': {
    en: 'What is in the account today?',
    es: '¿Cuánto hay en la cuenta hoy?',
    fr: 'Combien y a-t-il dans le compte aujourd’hui ?',
  },
  'accounts.add.lastPaydayQuestion': {
    en: 'When was the last pay day?',
    es: '¿Cuándo fue el último día de pago?',
    fr: 'Quel était le dernier jour de paie ?',
  },
  'accounts.add.reminderQuestion': {
    en: 'Want a nudge when pay lands?',
    es: '¿Quieres un aviso cuando llegue tu salario?',
    fr: 'Tu veux un rappel quand ta paie arrive ?',
  },
  'accounts.add.bankName': { en: 'Bank name', es: 'Nombre del banco', fr: 'Nom de la banque' },
  'accounts.add.accountType': { en: 'Account type', es: 'Tipo de cuenta', fr: 'Type de compte' },
  'accounts.add.accountName': {
    en: 'Name of the account',
    es: 'Nombre de la cuenta',
    fr: 'Nom du compte',
  },
  'accounts.add.expectedIncome': {
    en: 'Expected income',
    es: 'Ingresos esperados',
    fr: 'Revenus prévus',
  },
  'accounts.add.enterAmount': {
    en: 'Enter an amount',
    es: 'Ingresa un importe',
    fr: 'Indique un montant',
  },
  'accounts.add.openCalculator': {
    en: 'Open calculator',
    es: 'Abrir calculadora',
    fr: 'Ouvrir la calculatrice',
  },
  'accounts.add.calculator': { en: 'Calculator', es: 'Calculadora', fr: 'Calculatrice' },
  'accounts.add.nextPayday': {
    en: 'Next payday: {date}',
    es: 'Próximo día de pago: {date}',
    fr: 'Prochain jour de paie : {date}',
  },
  'accounts.add.payFrequency': {
    en: 'How often are you paid?',
    es: '¿Cada cuánto te pagan?',
    fr: 'À quelle fréquence reçois-tu ta paie ?',
  },
  'accounts.add.checkingPay': {
    en: 'Checking what is paid into this account…',
    es: 'Revisando lo que se deposita en esta cuenta…',
    fr: 'Vérification de ce qui est versé dans ce compte…',
  },
  'accounts.add.paySubtitle': {
    en: 'Pick the last payday and how often you’re paid.',
    es: 'Elige el último día de pago y cada cuánto te pagan.',
    fr: 'Choisis le dernier jour de paie et la fréquence.',
  },
  'accounts.add.remindOff': {
    en: 'Get a nudge before your pay lands',
    es: 'Recibe un aviso antes de que llegue tu salario',
    fr: 'Reçois un rappel avant l’arrivée de ta paie',
  },
  'accounts.add.remindOnDay': {
    en: '{date}, the day your pay lands',
    es: '{date}, el día que llega tu salario',
    fr: '{date}, le jour où ta paie arrive',
  },
  'accounts.add.remindDays': {
    en: {
      one: '{date}, 1 day before your pay lands',
      other: '{date}, {count} days before your pay lands',
    },
    es: {
      one: '{date}, 1 día antes de que llegue tu salario',
      other: '{date}, {count} días antes de que llegue tu salario',
    },
    fr: {
      one: '{date}, 1 jour avant l’arrivée de ta paie',
      other: '{date}, {count} jours avant l’arrivée de ta paie',
    },
  },
  'accounts.add.remindWeek': {
    en: '{date}, 1 week before your pay lands',
    es: '{date}, 1 semana antes de que llegue tu salario',
    fr: '{date}, 1 semaine avant l’arrivée de ta paie',
  },
  'accounts.add.remindLeadOnDay': {
    en: 'On the day your pay lands',
    es: 'El día que llega tu salario',
    fr: 'Le jour où ta paie arrive',
  },
  'accounts.add.remindLeadDays': {
    en: { one: '1 day before your pay lands', other: '{count} days before your pay lands' },
    es: {
      one: '1 día antes de que llegue tu salario',
      other: '{count} días antes de que llegue tu salario',
    },
    fr: {
      one: '1 jour avant l’arrivée de ta paie',
      other: '{count} jours avant l’arrivée de ta paie',
    },
  },
  'accounts.add.remindLeadWeek': {
    en: '1 week before your pay lands',
    es: '1 semana antes de que llegue tu salario',
    fr: '1 semaine avant l’arrivée de ta paie',
  },
  'accounts.add.changeLater': {
    en: 'You can change these anytime in account settings.',
    es: 'Puedes cambiar esto cuando quieras en los ajustes de la cuenta.',
    fr: 'Tu peux modifier ça quand tu veux dans les réglages du compte.',
  },
  'accounts.add.addAccount': { en: 'Add account', es: 'Agregar cuenta', fr: 'Ajouter le compte' },
  'accounts.added.title': { en: 'Account added', es: 'Cuenta agregada', fr: 'Compte ajouté' },
  'accounts.added.remindOnDay': {
    en: 'We’ll remind you on the day your pay lands.',
    es: 'Te lo recordaremos el día que llegue tu salario.',
    fr: 'On te le rappellera le jour où ta paie arrive.',
  },
  'accounts.added.remindDays': {
    en: {
      one: 'We’ll remind you 1 day before your pay lands.',
      other: 'We’ll remind you {count} days before your pay lands.',
    },
    es: {
      one: 'Te lo recordaremos 1 día antes de que llegue tu salario.',
      other: 'Te lo recordaremos {count} días antes de que llegue tu salario.',
    },
    fr: {
      one: 'On te le rappellera 1 jour avant l’arrivée de ta paie.',
      other: 'On te le rappellera {count} jours avant l’arrivée de ta paie.',
    },
  },
  'accounts.added.remindWeek': {
    en: 'We’ll remind you 1 week before your pay lands.',
    es: 'Te lo recordaremos 1 semana antes de que llegue tu salario.',
    fr: 'On te le rappellera 1 semaine avant l’arrivée de ta paie.',
  },
  'accounts.added.type': { en: 'Type', es: 'Tipo', fr: 'Type' },
  'accounts.added.nextPayday': {
    en: 'Next payday',
    es: 'Próximo día de pago',
    fr: 'Prochain jour de paie',
  },
  'accounts.added.another': {
    en: 'Add another account',
    es: 'Agregar otra cuenta',
    fr: 'Ajouter un autre compte',
  },
  'accounts.add.reminderNeedsPay': {
    en: 'Add the income paid into this account and Skip can tell you when it lands.',
    es: 'Agrega los ingresos que se depositan en esta cuenta y Skip te avisará cuando lleguen.',
    fr: 'Ajoute les revenus versés dans ce compte et Skip pourra te dire quand ils arrivent.',
  },

  'accounts.link.names': {
    en: '{list} and {last}',
    es: '{list} y {last}',
    fr: '{list} et {last}',
  },
  // Spanish writes "e" for "y" before an "i" sound ("Acme e IBM"); the other languages do not change.
  'accounts.link.namesBeforeI': {
    en: '{list} and {last}',
    es: '{list} e {last}',
    fr: '{list} et {last}',
  },
  'accounts.link.lands': {
    en: { one: '{names} lands here', other: '{names} land here' },
    es: { one: '{names} llega aquí', other: '{names} llegan aquí' },
    fr: { one: '{names} arrive ici', other: '{names} arrivent ici' },
  },
  'accounts.link.myPay': {
    en: 'My pay lands here',
    es: 'Mi salario llega aquí',
    fr: 'Ma paie arrive ici',
  },
  'accounts.link.pay': {
    en: '{amount} {frequency}',
    es: '{amount} {frequency}',
    fr: '{amount} {frequency}',
  },
  'accounts.link.payWithPayday': {
    en: '{amount} {frequency} · payday already set',
    es: '{amount} {frequency} · día de pago ya configurado',
    fr: '{amount} {frequency} · jour de paie déjà défini',
  },
  'accounts.link.paydaysSet': {
    en: 'Their paydays are already set',
    es: 'Sus días de pago ya están configurados',
    fr: 'Leurs jours de paie sont déjà définis',
  },

  'accounts.source.kind.receipt': { en: 'Receipt', es: 'Recibo', fr: 'Reçu' },
  'accounts.source.kind.bill': { en: 'Bill', es: 'Factura', fr: 'Facture' },
  'accounts.source.kind.subscription': {
    en: 'Subscription',
    es: 'Suscripción',
    fr: 'Abonnement',
  },
  'accounts.source.kind.payment': { en: 'Payment', es: 'Pago', fr: 'Paiement' },
  'accounts.source.kind.income': { en: 'Pay', es: 'Sueldo', fr: 'Paie' },
  // A move's other side, when it is one of the person's own cards or accounts.
  'accounts.source.fromSource': { en: 'From {name}', es: 'Desde {name}', fr: 'Depuis {name}' },
  'accounts.source.toSource': { en: 'To {name}', es: 'A {name}', fr: 'Vers {name}' },
  'accounts.source.moneyOut': { en: 'Money out', es: 'Dinero que salió', fr: 'Argent sorti' },

  'accounts.pay.closeCard': {
    en: 'Cancel this payment?',
    es: '¿Cancelar este pago?',
    fr: 'Annuler ce paiement ?',
  },
  'accounts.pay.closeAccount': {
    en: 'Cancel adding this money?',
    es: '¿Dejar de agregar este dinero?',
    fr: 'Annuler l’ajout de cet argent ?',
  },
  'accounts.pay.howMuchCard': {
    en: 'How much did you pay?',
    es: '¿Cuánto pagaste?',
    fr: 'Combien as-tu payé ?',
  },
  'accounts.pay.howMuchAccount': {
    en: 'How much came in?',
    es: '¿Cuánto entró?',
    fr: 'Combien est entré ?',
  },
  'accounts.pay.fromCard': {
    en: 'Which account did you pay from?',
    es: '¿Desde qué cuenta pagaste?',
    fr: 'Depuis quel compte as-tu payé ?',
  },
  'accounts.pay.fromAccount': {
    en: 'Where did it come from?',
    es: '¿De dónde vino?',
    fr: 'D’où vient cet argent ?',
  },
  'accounts.pay.fromCardHint': {
    en: 'The payment comes out of that account and off what the card owes.',
    es: 'El pago sale de esa cuenta y se descuenta de lo que debe la tarjeta.',
    fr: 'Le paiement sort de ce compte et réduit ce que doit la carte.',
  },
  'accounts.pay.fromAccountHint': {
    en: 'Money from another of your accounts comes out of that one. New money, like a gift or a refund, adds to your balance.',
    es: 'Si viene de otra de tus cuentas, sale de esa. El dinero nuevo, como un regalo o un reembolso, suma a tu saldo.',
    fr: 'S’il vient d’un autre de tes comptes, il en sort. L’argent nouveau, comme un cadeau ou un remboursement, s’ajoute à ton solde.',
  },
  'accounts.pay.somewhereElse': { en: 'Somewhere else', es: 'En otro lugar', fr: 'Ailleurs' },
  'accounts.pay.newMoney': { en: 'New money', es: 'Dinero nuevo', fr: 'Nouvel argent' },
  'accounts.pay.pickFrom': {
    en: 'Choose where the money came from.',
    es: 'Elige de dónde vino el dinero.',
    fr: 'Choisis d’où vient l’argent.',
  },
  'accounts.pay.saveCard': {
    en: 'Save payment',
    es: 'Guardar pago',
    fr: 'Enregistrer le paiement',
  },
  'accounts.pay.saveAccount': { en: 'Add money', es: 'Agregar dinero', fr: 'Ajouter l’argent' },
  'accounts.pay.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },
  'accounts.source.removePaymentTitle': {
    en: 'Remove payment?',
    es: '¿Quitar este pago?',
    fr: 'Retirer ce paiement ?',
  },
  'accounts.source.removeNamedTitle': {
    en: 'Remove {label}?',
    es: '¿Quitar “{label}”?',
    fr: 'Retirer « {label} » ?',
  },
  'accounts.source.removeMessage': {
    en: 'The balance goes back up by that amount.',
    es: 'El saldo vuelve a subir en esa cantidad.',
    fr: 'Le solde remonte de ce montant.',
  },
  'accounts.source.removeMessageDown': {
    en: 'The balance goes down by that amount.',
    es: 'El saldo baja en esa cantidad.',
    fr: 'Le solde baisse de ce montant.',
  },
  'accounts.source.editLabel': { en: 'Edit {name}', es: 'Editar {name}', fr: 'Modifier {name}' },
  'accounts.source.makePayment': {
    en: 'Make a payment',
    es: 'Hacer un pago',
    fr: 'Faire un paiement',
  },
  'accounts.source.addDeposit': {
    en: 'Add a deposit',
    es: 'Agregar un depósito',
    fr: 'Ajouter un dépôt',
  },
  'accounts.source.addMoney': { en: 'Add money', es: 'Agregar dinero', fr: 'Ajouter de l’argent' },
  'accounts.source.balanceOn': {
    en: 'Balance on {date}',
    es: 'Saldo al {date}',
    fr: 'Solde au {date}',
  },
  'accounts.source.startingBalance': {
    en: 'Starting balance',
    es: 'Saldo inicial',
    fr: 'Solde de départ',
  },
  'accounts.source.chargedSince': {
    en: 'Charged since',
    es: 'Cargos desde entonces',
    fr: 'Débité depuis',
  },
  'accounts.source.payments': { en: 'Payments', es: 'Pagos', fr: 'Paiements' },
  'accounts.source.moneyIn': { en: 'Money in', es: 'Dinero recibido', fr: 'Argent reçu' },
  'accounts.source.moneySent': { en: 'Money sent', es: 'Dinero enviado', fr: 'Argent envoyé' },
  'accounts.source.owedNow': { en: 'Owed now', es: 'Adeudo actual', fr: 'Montant dû actuel' },
  'accounts.source.balanceNow': { en: 'Balance now', es: 'Saldo actual', fr: 'Solde actuel' },
  // What a row on a card's or account's page opens, read after its label.
  'accounts.source.billHint': {
    en: 'Opens this bill',
    es: 'Abre esta factura',
    fr: 'Ouvre cette facture',
  },
  'accounts.source.payHint': { en: 'Opens your pay', es: 'Abre tu salario', fr: 'Ouvre ta paie' },
  'accounts.source.emptyTitle': {
    en: 'Nothing on this one yet',
    es: 'Aún no hay nada aquí',
    fr: 'Rien ici pour l’instant',
  },
  'accounts.source.emptyCard': {
    en: 'Receipts, bills and subscriptions paid with this card land here as their dates arrive.',
    es: 'Los recibos, las facturas y las suscripciones que pagues con esta tarjeta aparecen aquí cuando llega su fecha.',
    fr: 'Les reçus, factures et abonnements payés avec cette carte s’affichent ici à leur date.',
  },
  'accounts.source.emptyAccount': {
    en: 'Anything paid from this account lands here as its date arrives.',
    es: 'Todo lo que se pague desde esta cuenta aparece aquí cuando llega su fecha.',
    fr: 'Tout ce qui est payé depuis ce compte s’affiche ici à sa date.',
  },
  'accounts.source.noMatch': {
    en: 'No transaction on this one fits that search and those filters.',
    es: 'Ningún movimiento de aquí coincide con esa búsqueda y esos filtros.',
    fr: 'Aucune transaction ici ne correspond à cette recherche et à ces filtres.',
  },
  'accounts.source.clearSearch': {
    en: 'Clear search',
    es: 'Borrar búsqueda',
    fr: 'Effacer la recherche',
  },
});
