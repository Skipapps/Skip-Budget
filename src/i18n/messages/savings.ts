import { defineMessages } from '@/i18n/translate';

export const savingsMessages = defineMessages({
  'savings.monthYear': { en: '{month} {year}', es: '{month} de {year}', fr: '{month} {year}' },

  'savings.list.title': { en: 'Savings', es: 'Ahorros', fr: 'Épargne' },
  'savings.list.intro': {
    en: 'When a month ends, whatever was left of it is added here. Nothing is moved between your accounts — this is a record, not a transfer.',
    es: 'Cuando termina un mes, lo que sobró se suma aquí. No se mueve dinero entre tus cuentas: esto es un registro, no una transferencia.',
    fr: 'À la fin d’un mois, ce qu’il en reste est ajouté ici. Rien ne bouge entre tes comptes — c’est un registre, pas un virement.',
  },
  'savings.list.emptyTitle': { en: 'Nothing yet', es: 'Nada todavía', fr: 'Rien pour l’instant' },
  'savings.list.emptyMessage': {
    en: 'Your first month appears here once it has finished. Until then the figure is still being spent, so there is nothing honest to show.',
    es: 'Tu primer mes aparece aquí cuando termina. Hasta entonces la cifra se sigue gastando, así que no hay nada honesto que mostrar.',
    fr: 'Ton premier mois s’affiche ici une fois terminé. D’ici là, le montant est encore en train d’être dépensé, alors il n’y a rien d’honnête à montrer.',
  },
  'savings.list.savedSoFar': {
    en: 'Saved so far',
    es: 'Ahorrado hasta ahora',
    fr: 'Épargné jusqu’ici',
  },
  'savings.list.across': {
    en: {
      one: 'across {count} month that ended with something left',
      other: 'across {count} months that ended with something left',
    },
    es: {
      one: 'en {count} mes que terminó con algo de sobra',
      other: 'en {count} meses que terminaron con algo de sobra',
    },
    fr: {
      one: 'sur {count} mois qui s’est terminé avec un reste',
      other: 'sur {count} mois qui se sont terminés avec un reste',
    },
  },

  'savings.row.excluded': {
    en: 'Left out of your savings. Tap to count it again.',
    es: 'Fuera de tus ahorros. Toca para volver a contarlo.',
    fr: 'Exclu de ton épargne. Touche pour le compter de nouveau.',
  },
  'savings.row.corrected': {
    en: 'You said this month left {amount}. Skip worked out {computed}.',
    es: 'Dijiste que este mes dejó {amount}. Skip calculó {computed}.',
    fr: 'Tu as dit que ce mois a laissé {amount}. Skip avait calculé {computed}.',
  },
  'savings.row.correctedNote': {
    en: 'You said this month left {amount} — {note}. Skip worked out {computed}.',
    es: 'Dijiste que este mes dejó {amount} — {note}. Skip calculó {computed}.',
    fr: 'Tu as dit que ce mois a laissé {amount} — {note}. Skip avait calculé {computed}.',
  },
  'savings.row.over': {
    en: '{spent} went out against {income} coming in, so this month took from your savings rather than adding to them.',
    es: 'Salieron {spent} contra {income} que entraron, así que este mes tomó de tus ahorros en lugar de sumarles.',
    fr: '{spent} sont sortis contre {income} entrés, donc ce mois a puisé dans ton épargne au lieu d’y ajouter.',
  },
  'savings.row.kept': {
    en: '{income} came in and {spent} went out on bills, subscriptions and receipts — the rest stayed.',
    es: 'Entraron {income} y salieron {spent} en facturas, suscripciones y recibos; el resto se quedó.',
    fr: '{income} sont entrés et {spent} sont sortis en factures, abonnements et reçus — le reste est resté.',
  },
  'savings.row.label': {
    en: '{month}. {amount}. {explain} Tap to correct.',
    es: '{month}. {amount}. {explain} Toca para corregir.',
    fr: '{month}. {amount}. {explain} Touche pour corriger.',
  },
  'savings.row.labelExcluded': {
    en: '{month}. Left out of your savings. {explain} Tap to correct.',
    es: '{month}. Fuera de tus ahorros. {explain} Toca para corregir.',
    fr: '{month}. Exclu de ton épargne. {explain} Touche pour corriger.',
  },

  'savings.month.title': { en: 'Month', es: 'Mes', fr: 'Mois' },
  'savings.month.loading': { en: 'Loading', es: 'Cargando', fr: 'Chargement' },
  'savings.month.missing': {
    en: 'That month is not on your savings.',
    es: 'Ese mes no está en tus ahorros.',
    fr: 'Ce mois ne fait pas partie de ton épargne.',
  },
  'savings.month.intro': {
    en: 'Skip only knows what it was told. If something was paid in cash or never scanned, put the real figure here.',
    es: 'Skip solo sabe lo que le dijiste. Si algo se pagó en efectivo o nunca se escaneó, pon aquí la cifra real.',
    fr: 'Skip ne sait que ce qu’on lui a dit. Si quelque chose a été payé comptant ou jamais numérisé, indique le vrai montant ici.',
  },
  'savings.month.workedOut': {
    en: 'What Skip worked out',
    es: 'Lo que calculó Skip',
    fr: 'Ce que Skip a calculé',
  },
  'savings.month.flow': {
    en: '{income} came in and {spent} went out on bills, subscriptions and receipts.',
    es: 'Entraron {income} y salieron {spent} en facturas, suscripciones y recibos.',
    fr: '{income} sont entrés et {spent} sont sortis en factures, abonnements et reçus.',
  },
  'savings.month.reallyLeft': {
    en: 'What it really left',
    es: 'Lo que realmente dejó',
    fr: 'Ce qu’il a vraiment laissé',
  },
  'savings.month.reallyLeftPlaceholder': {
    en: 'Leave empty to use Skip’s figure',
    es: 'Déjalo vacío para usar la cifra de Skip',
    fr: 'Laisse vide pour utiliser le montant de Skip',
  },
  'savings.month.why': { en: 'Why', es: 'Por qué', fr: 'Pourquoi' },
  'savings.month.whyPlaceholder': {
    en: 'Paid the plumber in cash',
    es: 'Le pagué al plomero en efectivo',
    fr: 'J’ai payé le plombier comptant',
  },
  'savings.month.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },
  'savings.month.resetLabel': {
    en: 'Put this month back on Skip’s own figure',
    es: 'Regresar este mes a la cifra de Skip',
    fr: 'Remettre ce mois sur le montant de Skip',
  },
  'savings.month.reset': {
    en: 'Back to Skip’s figure',
    es: 'Volver a la cifra de Skip',
    fr: 'Revenir au montant de Skip',
  },
  'savings.month.include': {
    en: 'Count this month again',
    es: 'Volver a contar este mes',
    fr: 'Compter ce mois de nouveau',
  },
  'savings.month.excludeLabel': {
    en: 'Leave this month out of your savings',
    es: 'Dejar este mes fuera de tus ahorros',
    fr: 'Exclure ce mois de ton épargne',
  },
  'savings.month.exclude': {
    en: 'Leave this month out',
    es: 'Dejar fuera este mes',
    fr: 'Exclure ce mois',
  },
  'savings.month.excludeTitle': {
    en: 'Leave {month} out?',
    es: '¿Dejar fuera {month}?',
    fr: 'Exclure {month} ?',
  },
  'savings.month.excludeMessage': {
    en: 'It stops counting towards your savings total. Nothing is deleted, and you can put it back.',
    es: 'Deja de contar para el total de tus ahorros. No se elimina nada y puedes volver a incluirlo.',
    fr: 'Il ne compte plus dans le total de ton épargne. Rien n’est supprimé, et tu peux le remettre.',
  },
  'savings.month.excludeConfirm': { en: 'Leave it out', es: 'Dejarlo fuera', fr: 'L’exclure' },
});
