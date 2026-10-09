import { defineMessages } from '@/i18n/translate';

/** The shared components' own words: defaults, accessibility labels and picker chrome. */
export const uiMessages = defineMessages({
  'ui.dismiss': { en: 'Dismiss', es: 'Cerrar', fr: 'Fermer' },
  'ui.goBack': { en: 'Go back', es: 'Volver', fr: 'Retour' },

  'ui.flow.discardMessage': {
    en: 'Nothing you have entered here will be saved.',
    es: 'No se guardará nada de lo que ingresaste aquí.',
    fr: 'Rien de ce que tu as saisi ici ne sera enregistré.',
  },
  'ui.flow.stay': { en: 'Go back', es: 'Volver', fr: 'Revenir' },
  'ui.flow.stepOf': {
    en: 'Step {step} of {steps}',
    es: 'Paso {step} de {steps}',
    fr: 'Étape {step} sur {steps}',
  },

  'ui.calendar.previousMonth': { en: 'Previous month', es: 'Mes anterior', fr: 'Mois précédent' },
  'ui.calendar.nextMonth': { en: 'Next month', es: 'Mes siguiente', fr: 'Mois suivant' },
  'ui.calendar.previousYear': { en: 'Previous year', es: 'Año anterior', fr: 'Année précédente' },
  'ui.calendar.nextYear': { en: 'Next year', es: 'Año siguiente', fr: 'Année suivante' },
  /** A shortened month with its year: "Jun 2026". */
  'ui.calendar.monthYearShort': {
    en: '{month} {year}',
    es: '{month} {year}',
    fr: '{month} {year}',
  },
  /** A month written out with its year: "June 2026", "junio de 2026". */
  'ui.calendar.monthYear': {
    en: '{month} {year}',
    es: '{month} de {year}',
    fr: '{month} {year}',
  },
  'ui.calendar.pickMonth': {
    en: '{month} {year}. Choose a different month.',
    es: '{month} de {year}. Elige otro mes.',
    fr: '{month} {year}. Choisis un autre mois.',
  },
  /** One day of the grid, read aloud. */
  'ui.calendar.day': {
    en: '{weekday} {day} {month} {year}',
    es: '{weekday} {day} de {month} de {year}',
    fr: '{weekday} {day} {month} {year}',
  },
  'ui.calendar.today': {
    en: 'Today, {date}',
    es: 'Hoy, {date}',
    fr: 'Aujourd’hui, {date}',
  },

  'ui.datePicker.close': {
    en: 'Close date picker',
    es: 'Cerrar el selector de fecha',
    fr: 'Fermer le sélecteur de date',
  },
  'ui.datePicker.backToMonths': {
    en: 'Back to months',
    es: 'Volver a los meses',
    fr: 'Retour aux mois',
  },

  'ui.timePicker.title': { en: 'Select time', es: 'Elige la hora', fr: 'Choisis l’heure' },
  'ui.timePicker.close': {
    en: 'Close time picker',
    es: 'Cerrar el selector de hora',
    fr: 'Fermer le sélecteur d’heure',
  },
  'ui.timePicker.hour': { en: 'Hour, {hour}', es: 'Hora, {hour}', fr: 'Heure, {hour}' },
  'ui.timePicker.minute': {
    en: 'Minute, {minute}',
    es: 'Minuto, {minute}',
    fr: 'Minute, {minute}',
  },
  'ui.timePicker.am': { en: 'AM', es: 'a. m.', fr: 'a.m.' },
  'ui.timePicker.pm': { en: 'PM', es: 'p. m.', fr: 'p.m.' },
  'ui.timePicker.confirm': {
    en: 'Confirm time',
    es: 'Confirmar la hora',
    fr: 'Confirmer l’heure',
  },

  'ui.search.clear': {
    en: 'Clear search',
    es: 'Borrar la búsqueda',
    fr: 'Effacer la recherche',
  },
  'ui.select.notSet': { en: 'Not set', es: 'Sin definir', fr: 'Non défini' },
  'ui.skeleton.loading': { en: 'Loading', es: 'Cargando', fr: 'Chargement' },

  'ui.field.optional': { en: '(optional)', es: '(opcional)', fr: '(facultatif)' },
  'ui.field.showPassword': {
    en: 'Show password',
    es: 'Mostrar contraseña',
    fr: 'Afficher le mot de passe',
  },
  'ui.field.hidePassword': {
    en: 'Hide password',
    es: 'Ocultar contraseña',
    fr: 'Masquer le mot de passe',
  },
  'ui.otp.label': {
    en: '{length} digit verification code',
    es: 'Código de verificación de {length} dígitos',
    fr: 'Code de vérification à {length} chiffres',
  },

  'ui.range.showing': {
    en: 'Showing {range}. Change the window.',
    es: 'Periodo: {range}. Cambiar el periodo.',
    fr: 'Période : {range}. Changer la période.',
  },

  'ui.reminder.label': { en: 'Reminder', es: 'Recordatorio', fr: 'Rappel' },
  'ui.reminder.sentAt': {
    en: 'Sent at {time}. Change the time.',
    // Not a full stop after {time}: the Spanish time already ends in one ("p. m.").
    es: 'Hora de envío: {time}, cambiar la hora',
    fr: 'Envoyé à {time}. Changer l’heure.',
  },
  /** Counted by the hour on the clock face: Spanish says "a la 1:30" but "a las 2:30". */
  'ui.reminder.at': {
    en: { one: 'at {time}', other: 'at {time}' },
    es: { one: 'a la {time}', other: 'a las {time}' },
    fr: { one: 'à {time}', other: 'à {time}' },
  },

  'ui.color.blue': { en: 'Blue', es: 'Azul', fr: 'Bleu' },
  'ui.color.violet': { en: 'Violet', es: 'Violeta', fr: 'Violet' },
  'ui.color.plum': { en: 'Plum', es: 'Ciruela', fr: 'Prune' },
  'ui.color.teal': { en: 'Teal', es: 'Verde azulado', fr: 'Sarcelle' },
  'ui.color.slate': { en: 'Slate', es: 'Pizarra', fr: 'Ardoise' },
  'ui.color.sand': { en: 'Sand', es: 'Arena', fr: 'Sable' },
  'ui.color.rose': { en: 'Rose', es: 'Rosa', fr: 'Rose' },
  'ui.color.black': { en: 'Black', es: 'Negro', fr: 'Noir' },
  'ui.color.current': { en: 'Current colour', es: 'Color actual', fr: 'Couleur actuelle' },
});
