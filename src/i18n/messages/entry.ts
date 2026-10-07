import { defineMessages } from '@/i18n/translate';

/**
 * The final page every new receipt, bill and subscription lands on, and the one-field pages it opens.
 * Words that name a field or a kind of record live with that record; only what the page itself says
 * is here.
 */
export const entryMessages = defineMessages({
  'entry.editLater': {
    en: 'You can edit this later.',
    es: 'Puedes editarlo más tarde.',
    fr: 'Tu pourras le modifier plus tard.',
  },
  'entry.tapToEdit': { en: 'Tap to edit', es: 'Toca para editar', fr: 'Touche pour modifier' },
  'entry.amountMissing': {
    en: 'Tap to add the amount',
    es: 'Toca para agregar el importe',
    fr: 'Touche pour ajouter le montant',
  },

  'entry.row.spoken': { en: '{label}, {value}', es: '{label}, {value}', fr: '{label}, {value}' },
  'entry.row.neededSpoken': { en: 'needed', es: 'obligatorio', fr: 'requis' },
  'entry.row.notSetSpoken': {
    en: 'not set, optional',
    es: 'sin definir, opcional',
    fr: 'non défini, facultatif',
  },
  'entry.row.optional': {
    en: '{label} · Optional',
    es: '{label} · Opcional',
    fr: '{label} · Facultatif',
  },
  'entry.row.neededHint': {
    en: 'Needed to save. Opens {label} to add it.',
    es: 'Hace falta para guardar. Abre «{label}» para agregarlo.',
    fr: 'Requis pour enregistrer. Ouvre « {label} » pour l’ajouter.',
  },
  'entry.row.changeHint': {
    en: 'Opens {label} to change it.',
    es: 'Abre «{label}» para cambiarlo.',
    fr: 'Ouvre « {label} » pour le modifier.',
  },
  'entry.row.tapToAdd': { en: 'Tap to add', es: 'Toca para agregar', fr: 'Touche pour ajouter' },
  'entry.row.notSet': { en: 'Not set', es: 'Sin definir', fr: 'Non défini' },
  'entry.addNote': { en: 'Add a note', es: 'Agregar una nota', fr: 'Ajouter une note' },

  // "Tue Oct 6": the order of the three follows each language's own.
  'entry.day': {
    en: '{weekday} {month} {day}',
    es: '{weekday} {day} {month}',
    fr: '{weekday} {day} {month}',
  },
  'entry.dayRelative': {
    en: '{relative}, {day}',
    es: '{relative}, {day}',
    fr: '{relative}, {day}',
  },
  'entry.pickDate': { en: 'Pick date', es: 'Elegir fecha', fr: 'Choisir une date' },

  // "1 day before · 9:00 AM"; "On the day · 9:00 AM" needs no "before".
  'entry.reminder.before': {
    en: '{lead} before',
    es: '{lead} antes',
    fr: '{lead} avant',
  },
  'entry.reminder.summary': { en: '{when} · {time}', es: '{when} · {time}', fr: '{when} · {time}' },

  'entry.askPaidWith': {
    en: 'What did you pay with?',
    es: '¿Con qué pagaste?',
    fr: 'Tu as payé avec quoi ?',
  },
  'entry.noSource': {
    en: 'No card or account',
    es: 'Sin tarjeta ni cuenta',
    fr: 'Aucune carte ni aucun compte',
  },
});
