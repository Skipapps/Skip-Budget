import { defineMessages } from '@/i18n/translate';

export const cardsMessages = defineMessages({
  'cards.list.subtitle': {
    en: 'All your money in one place.',
    es: 'Todo tu dinero en un solo lugar.',
    fr: 'Tout ton argent au même endroit.',
  },
  // The section's "+ Add" pill; VoiceOver hears newCard / addAccount, which say what is added.
  'cards.list.add': { en: 'Add', es: 'Agregar', fr: 'Ajouter' },
  'cards.list.creditCards': {
    en: 'Credit cards',
    es: 'Tarjetas de crédito',
    fr: 'Cartes de crédit',
  },
  'cards.list.newCard': {
    en: 'New credit card',
    es: 'Nueva tarjeta de crédito',
    fr: 'Nouvelle carte de crédit',
  },
  'cards.list.bankAccounts': {
    en: 'Bank accounts',
    es: 'Cuentas bancarias',
    fr: 'Comptes bancaires',
  },
  'cards.list.addAccount': { en: 'Add account', es: 'Agregar cuenta', fr: 'Ajouter un compte' },
  'cards.list.money': { en: 'Money', es: 'Dinero', fr: 'Argent' },
  'cards.list.salary': { en: 'Salary', es: 'Salario', fr: 'Salaire' },
  'cards.list.savings': { en: 'Savings', es: 'Ahorros', fr: 'Épargne' },
  'cards.list.noCards': {
    en: 'No credit cards yet. Add one to track what you spend on it.',
    es: 'Aún no hay tarjetas de crédito. Agrega una para seguir lo que gastas con ella.',
    fr: 'Aucune carte de crédit pour l’instant. Ajoutes-en une pour suivre ce que tu y dépenses.',
  },
  'cards.list.noAccounts': {
    en: 'No bank accounts yet. Add one to see money coming in and out.',
    es: 'Aún no hay cuentas bancarias. Agrega una para ver el dinero que entra y sale.',
    fr: 'Aucun compte bancaire pour l’instant. Ajoutes-en un pour voir l’argent qui entre et qui sort.',
  },
  // Two keys with one English line: French agrees "verrouillée" with carte, "verrouillé" with compte.
  'cards.list.cardLocked': {
    en: '{name}, locked on the free plan. Opens Skip Pro.',
    es: '{name}, bloqueada en el plan gratis. Abre Skip Pro.',
    fr: '{name}, verrouillée avec le forfait gratuit. Ouvre Skip Pro.',
  },
  'cards.list.accountLocked': {
    en: '{name}, locked on the free plan. Opens Skip Pro.',
    es: '{name}, bloqueada en el plan gratis. Abre Skip Pro.',
    fr: '{name}, verrouillé avec le forfait gratuit. Ouvre Skip Pro.',
  },
  'cards.list.viewTransactions': {
    en: '{name}, view transactions',
    es: '{name}, ver movimientos',
    fr: '{name}, voir les transactions',
  },

  'cards.face.owed': { en: 'Owed', es: 'Adeudo', fr: 'Montant dû' },
  'cards.face.inCredit': { en: 'In credit', es: 'Saldo a favor', fr: 'Solde créditeur' },
  'cards.face.nothingOwed': { en: 'Nothing owed', es: 'Sin adeudo', fr: 'Rien à payer' },
  'cards.face.available': { en: 'Available', es: 'Disponible', fr: 'Disponible' },
  'cards.face.overdrawn': { en: 'Overdrawn', es: 'Sobregirado', fr: 'À découvert' },
  'cards.face.limitUsed': {
    en: '{used} of {limit} limit',
    es: '{used} de {limit} de límite',
    fr: '{used} sur {limit} de limite',
  },
  'cards.face.updatedToday': {
    en: 'Updated today',
    es: 'Actualizado hoy',
    fr: 'Mis à jour aujourd’hui',
  },
  'cards.face.updatedYesterday': {
    en: 'Updated yesterday',
    es: 'Actualizado ayer',
    fr: 'Mis à jour hier',
  },
  'cards.face.updatedOn': {
    en: 'Updated {date}',
    es: 'Actualizado el {date}',
    fr: 'Mis à jour le {date}',
  },

  'cards.money.loans': { en: 'Loans', es: 'Préstamos', fr: 'Prêts' },
  'cards.money.goals': { en: 'Goals', es: 'Metas', fr: 'Objectifs' },
  // The tiles' pills sit two to a row, so each is kept short enough to fit on a 375pt phone.
  'cards.money.addSalary': { en: 'Add salary', es: 'Agregar salario', fr: 'Ajouter ta paie' },
  'cards.money.addPay': { en: 'Add your pay', es: 'Agrega tu salario', fr: 'Ajoute ta paie' },
  'cards.money.open': { en: 'Open', es: 'Abrir', fr: 'Ouvrir' },
  'cards.money.startSaving': {
    en: 'Start saving',
    es: 'Empieza a ahorrar',
    fr: 'Commence à épargner',
  },
  'cards.money.addLoan': { en: 'Add a loan', es: 'Agregar uno', fr: 'Ajouter un prêt' },
  'cards.money.trackLoans': {
    en: 'Track what you owe',
    es: 'Sigue lo que debes',
    fr: 'Suis ce que tu dois',
  },
  'cards.money.loansActive': {
    en: { one: '1 active', other: '{count} active' },
    es: { one: '1 activo', other: '{count} activos' },
    fr: { one: '1 actif', other: '{count} actifs' },
  },
  'cards.money.comingSoon': { en: 'Coming soon', es: 'Próximamente', fr: 'Bientôt' },
  'cards.money.tileLabel': {
    en: '{name}, {value}, {note}',
    es: '{name}, {value}, {note}',
    fr: '{name}, {value}, {note}',
  },
  'cards.money.tileLabelShort': {
    en: '{name}, {value}',
    es: '{name}, {value}',
    fr: '{name}, {value}',
  },

  'cards.form.goBack': { en: 'Go back', es: 'Regresar', fr: 'Retour' },
  'cards.form.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },
  'cards.form.deleting': { en: 'Deleting…', es: 'Eliminando…', fr: 'Suppression…' },
  'cards.form.saveChanges': {
    en: 'Save changes',
    es: 'Guardar cambios',
    fr: 'Enregistrer les modifications',
  },
  'cards.form.cardColour': {
    en: 'Card colour',
    es: 'Color de la tarjeta',
    fr: 'Couleur de la carte',
  },
  'cards.form.last4': { en: 'Last 4 digits', es: 'Últimos 4 dígitos', fr: '4 derniers chiffres' },
  'cards.form.cardName': { en: 'Card name', es: 'Nombre de la tarjeta', fr: 'Nom de la carte' },
  'cards.form.network': { en: 'Network', es: 'Red', fr: 'Réseau' },
  'cards.form.creditLimit': {
    en: 'Card limit',
    es: 'Límite de la tarjeta',
    fr: 'Limite de la carte',
  },
  'cards.form.creditLimitOptional': { en: 'Optional', es: 'Opcional', fr: 'Facultatif' },

  'cards.add.editTitle': {
    en: 'Edit credit card',
    es: 'Editar tarjeta de crédito',
    fr: 'Modifier la carte de crédit',
  },
  'cards.add.addTitle': {
    en: 'Add a credit card',
    es: 'Agregar una tarjeta de crédito',
    fr: 'Ajouter une carte de crédit',
  },
  'cards.add.closeEditing': {
    en: 'Cancel editing this credit card?',
    es: '¿Dejar de editar esta tarjeta de crédito?',
    fr: 'Annuler la modification de cette carte de crédit ?',
  },
  'cards.add.closeAdding': {
    en: 'Cancel adding this credit card?',
    es: '¿Dejar de agregar esta tarjeta de crédito?',
    fr: 'Annuler l’ajout de cette carte de crédit ?',
  },
  'cards.add.deleteTitle': {
    en: 'Delete this credit card?',
    es: '¿Eliminar esta tarjeta de crédito?',
    fr: 'Supprimer cette carte de crédit ?',
  },
  'cards.add.deleteMessage': {
    en: 'Receipts, bills and subscriptions paid with it are kept, but stop showing this credit card.',
    es: 'Los recibos, las facturas y las suscripciones que pagaste con ella se conservan, pero dejan de mostrar esta tarjeta de crédito.',
    fr: 'Les reçus, factures et abonnements payés avec cette carte sont conservés, mais n’affichent plus cette carte de crédit.',
  },
  'cards.add.deleteLabel': {
    en: 'Delete this credit card',
    es: 'Eliminar esta tarjeta de crédito',
    fr: 'Supprimer cette carte de crédit',
  },
  'cards.add.deleteCard': { en: 'Delete card', es: 'Eliminar tarjeta', fr: 'Supprimer la carte' },
  'cards.add.nameMissing': {
    en: 'Give the credit card a name so you can tell it apart.',
    es: 'Ponle un nombre a la tarjeta de crédito para distinguirla.',
    fr: 'Donne un nom à la carte de crédit pour la reconnaître.',
  },
  'cards.add.newBalanceTitle': {
    en: 'This balance becomes the starting point',
    es: 'Este saldo se vuelve el punto de partida',
    fr: 'Ce solde devient le point de départ',
  },
  'cards.add.newBalanceMessage': {
    en: {
      one: "A new balance is taken as today's figure, so the transaction already on this credit card is counted as part of it and will stop showing here. Nothing is deleted — they stay in your transactions, and on the bills and receipts they came from.",
      other:
        "A new balance is taken as today's figure, so the {count} transactions already on this credit card are counted as part of it and will stop showing here. Nothing is deleted — they stay in your transactions, and on the bills and receipts they came from.",
    },
    es: {
      one: 'Un saldo nuevo se toma como la cifra de hoy, así que el movimiento que ya está en esta tarjeta de crédito cuenta como parte de él y dejará de aparecer aquí. No se elimina nada: sigue en tus movimientos y en la factura o el recibo de donde vino.',
      other:
        'Un saldo nuevo se toma como la cifra de hoy, así que los {count} movimientos que ya están en esta tarjeta de crédito cuentan como parte de él y dejarán de aparecer aquí. No se elimina nada: siguen en tus movimientos y en las facturas y recibos de donde vinieron.',
    },
    fr: {
      one: 'Un nouveau solde est pris comme le montant d’aujourd’hui, donc la transaction déjà sur cette carte de crédit est comptée dedans et ne s’affichera plus ici. Rien n’est supprimé : elle reste dans tes transactions, ainsi que sur la facture ou le reçu d’où elle vient.',
      other:
        'Un nouveau solde est pris comme le montant d’aujourd’hui, donc les {count} transactions déjà sur cette carte de crédit sont comptées dedans et ne s’afficheront plus ici. Rien n’est supprimé : elles restent dans tes transactions, ainsi que sur les factures et les reçus d’où elles viennent.',
    },
  },
  'cards.add.updateBalance': {
    en: 'Update the balance',
    es: 'Actualizar el saldo',
    fr: 'Mettre à jour le solde',
  },
  'cards.add.keepBalance': {
    en: 'Leave it as it was',
    es: 'Dejarlo como estaba',
    fr: 'Le laisser tel quel',
  },
  'cards.add.balanceQuestion': {
    en: 'What is the credit card balance right now?',
    es: '¿Cuál es el saldo de la tarjeta de crédito ahora?',
    fr: 'Quel est le solde de la carte de crédit en ce moment ?',
  },
  'cards.add.dueQuestion': {
    en: 'When is the bill due?',
    es: '¿Cuál es la fecha de vencimiento?',
    fr: 'Quelle est la date d’échéance ?',
  },
  'cards.add.name': {
    en: 'Name of the credit card',
    es: 'Nombre de la tarjeta de crédito',
    fr: 'Nom de la carte de crédit',
  },
  'cards.add.dueSubtitle': {
    en: 'Pick the day it’s due each month.',
    es: 'Elige el día en que vence cada mes.',
    fr: 'Choisis le jour où elle est à payer chaque mois.',
  },
  'cards.add.dayLabel': { en: 'Day {day}', es: 'Día {day}', fr: 'Jour {day}' },
  'cards.add.dayClearHint': {
    en: 'Tap again to clear the day.',
    es: 'Tócalo otra vez para quitar el día.',
    fr: 'Touche encore pour retirer le jour.',
  },
  'cards.add.dueEvery': {
    en: 'Due every month on the {day}',
    es: 'Vence cada mes el día {day}',
    fr: 'À payer chaque mois le {day}',
  },
  'cards.add.dueEveryLate': {
    en: 'Due every month on the {day}, or the last day in shorter months',
    es: 'Vence cada mes el día {day}, o el último día en los meses más cortos',
    fr: 'À payer chaque mois le {day}, ou le dernier jour des mois plus courts',
  },
  'cards.add.nextDue': {
    en: 'Next due: {date}',
    es: 'Próximo vencimiento: {date}',
    fr: 'Prochaine échéance : {date}',
  },
  'cards.add.remindMe': { en: 'Remind me', es: 'Recordarme', fr: 'Me le rappeler' },
  'cards.add.remindOff': {
    en: 'Get a nudge before it’s due',
    es: 'Recibe un aviso antes de que venza',
    fr: 'Reçois un rappel avant l’échéance',
  },
  'cards.add.remindOnDay': {
    en: '{date}, the day it’s due',
    es: '{date}, el día que vence',
    fr: '{date}, le jour de l’échéance',
  },
  'cards.add.remindDays': {
    en: { one: '{date}, 1 day before it’s due', other: '{date}, {count} days before it’s due' },
    es: {
      one: '{date}, 1 día antes de que venza',
      other: '{date}, {count} días antes de que venza',
    },
    fr: {
      one: '{date}, 1 jour avant l’échéance',
      other: '{date}, {count} jours avant l’échéance',
    },
  },
  'cards.add.remindWeek': {
    en: '{date}, 1 week before it’s due',
    es: '{date}, 1 semana antes de que venza',
    fr: '{date}, 1 semaine avant l’échéance',
  },
  'cards.add.reminderNeedsDay': {
    en: 'Pick a day above and Skip can remind you before it.',
    es: 'Elige un día arriba y Skip te lo podrá recordar antes.',
    fr: 'Choisis un jour ci-dessus et Skip pourra te le rappeler avant.',
  },
  'cards.add.changeLater': {
    en: 'You can change these anytime in card settings.',
    es: 'Puedes cambiar esto cuando quieras en los ajustes de la tarjeta.',
    fr: 'Tu peux modifier ça quand tu veux dans les réglages de la carte.',
  },
  'cards.add.addCard': { en: 'Add card', es: 'Agregar tarjeta', fr: 'Ajouter la carte' },

  'cards.added.title': { en: 'Card added', es: 'Tarjeta agregada', fr: 'Carte ajoutée' },
  'cards.added.remindOnDay': {
    en: 'We’ll remind you on the day it’s due.',
    es: 'Te lo recordaremos el día que vence.',
    fr: 'On te le rappellera le jour de l’échéance.',
  },
  'cards.added.remindDays': {
    en: {
      one: 'We’ll remind you 1 day before it’s due.',
      other: 'We’ll remind you {count} days before it’s due.',
    },
    es: {
      one: 'Te lo recordaremos 1 día antes de que venza.',
      other: 'Te lo recordaremos {count} días antes de que venza.',
    },
    fr: {
      one: 'On te le rappellera 1 jour avant l’échéance.',
      other: 'On te le rappellera {count} jours avant l’échéance.',
    },
  },
  'cards.added.remindWeek': {
    en: 'We’ll remind you 1 week before it’s due.',
    es: 'Te lo recordaremos 1 semana antes de que venza.',
    fr: 'On te le rappellera 1 semaine avant l’échéance.',
  },
  'cards.added.noReminder': {
    en: 'No reminder set. You can add one anytime.',
    es: 'Sin recordatorio. Puedes agregar uno cuando quieras.',
    fr: 'Aucun rappel. Tu peux en ajouter un quand tu veux.',
  },
  'cards.added.due': { en: 'Due', es: 'Vence', fr: 'Échéance' },
  'cards.added.dueValue': {
    en: '{day} of each month',
    es: 'El día {day} de cada mes',
    fr: 'Le {day} de chaque mois',
  },
  'cards.added.notSet': { en: 'Not set', es: 'Sin definir', fr: 'Non définie' },
  'cards.added.nextDue': { en: 'Next due', es: 'Próximo vencimiento', fr: 'Prochaine échéance' },
  'cards.added.reminder': { en: 'Reminder', es: 'Recordatorio', fr: 'Rappel' },
  'cards.added.reminderOnDay': {
    en: '{date} · on the day',
    es: '{date} · el mismo día',
    fr: '{date} · le jour même',
  },
  'cards.added.reminderDays': {
    en: { one: '{date} · 1 day before', other: '{date} · {count} days before' },
    es: { one: '{date} · 1 día antes', other: '{date} · {count} días antes' },
    fr: { one: '{date} · 1 jour avant', other: '{date} · {count} jours avant' },
  },
  'cards.added.reminderWeek': {
    en: '{date} · 1 week before',
    es: '{date} · 1 semana antes',
    fr: '{date} · 1 semaine avant',
  },
  'cards.added.reminderOff': { en: 'Off', es: 'Desactivado', fr: 'Désactivé' },
  'cards.added.another': {
    en: 'Add another card',
    es: 'Agregar otra tarjeta',
    fr: 'Ajouter une autre carte',
  },
  'cards.face.limitNotSet': {
    en: 'Limit not set',
    es: 'Límite sin definir',
    fr: 'Limite non définie',
  },
});
