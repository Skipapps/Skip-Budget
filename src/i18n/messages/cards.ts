import { defineMessages } from '@/i18n/translate';

export const cardsMessages = defineMessages({
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
  'cards.add.saveCard': {
    en: 'Save credit card',
    es: 'Guardar tarjeta de crédito',
    fr: 'Enregistrer la carte de crédit',
  },
  'cards.add.name': {
    en: 'Name of the credit card',
    es: 'Nombre de la tarjeta de crédito',
    fr: 'Nom de la carte de crédit',
  },
  'cards.add.network': {
    en: 'Select Network provider',
    es: 'Elige la red de la tarjeta',
    fr: 'Choisis le réseau de la carte',
  },
  'cards.add.reminderNeedsDate': {
    en: 'Set a bill due date above and Skip can remind you before it.',
    es: 'Elige arriba la fecha de vencimiento y Skip te lo podrá recordar antes.',
    fr: 'Choisis une date d’échéance ci-dessus et Skip pourra te le rappeler avant.',
  },
});
