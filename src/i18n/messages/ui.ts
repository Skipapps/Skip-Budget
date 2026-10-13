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

  /** The one question every plan asks about its past, on an edit or a delete. */
  'ui.past.change.title.charges': {
    en: 'Change past charges too?',
    es: '¿Cambiar también los cargos anteriores?',
    fr: 'Modifier aussi les prélèvements passés ?',
  },
  'ui.past.change.title.payments': {
    en: 'Change past payments too?',
    es: '¿Cambiar también los pagos anteriores?',
    fr: 'Modifier aussi les paiements passés ?',
  },
  'ui.past.change.title.days': {
    en: 'Change past days too?',
    es: '¿Cambiar también los días anteriores?',
    fr: 'Modifier aussi les jours passés ?',
  },
  'ui.past.change.body.charges': {
    en: {
      one: '{name} has already been charged once. Change that charge as well, or only the ones still to come?',
      other:
        '{name} has already been charged {count} times. Change those as well, or only the ones still to come?',
    },
    es: {
      one: 'Ya hubo un cargo de {name}. ¿Cambiar también ese cargo o solo los próximos?',
      other: 'Ya hubo {count} cargos de {name}. ¿Cambiarlos también o solo los próximos?',
    },
    fr: {
      one: 'Un prélèvement a déjà eu lieu pour {name}. Modifier aussi ce prélèvement, ou seulement ceux à venir ?',
      other:
        '{count} prélèvements ont déjà eu lieu pour {name}. Les modifier aussi, ou seulement ceux à venir ?',
    },
  },
  'ui.past.change.body.payments': {
    en: {
      one: '{name} already has 1 payment recorded. Change that payment as well, or only the ones still to come?',
      other:
        '{name} already has {count} payments recorded. Change those as well, or only the ones still to come?',
    },
    es: {
      one: 'Ya hay un pago registrado de {name}. ¿Cambiar también ese pago o solo los próximos?',
      other: 'Ya hay {count} pagos registrados de {name}. ¿Cambiarlos también o solo los próximos?',
    },
    fr: {
      one: 'Un paiement a déjà été enregistré pour {name}. Modifier aussi ce paiement, ou seulement ceux à venir ?',
      other:
        '{count} paiements ont déjà été enregistrés pour {name}. Les modifier aussi, ou seulement ceux à venir ?',
    },
  },
  'ui.past.change.body.days': {
    en: {
      one: '{name} already has 1 day logged. Change that day as well, or only the days still to come?',
      other:
        '{name} already has {count} days logged. Change those as well, or only the days still to come?',
    },
    es: {
      one: 'Ya hay un día registrado en {name}. ¿Cambiar también ese día o solo los próximos?',
      other: 'Ya hay {count} días registrados en {name}. ¿Cambiarlos también o solo los próximos?',
    },
    fr: {
      one: 'Un jour a déjà été noté pour {name}. Modifier aussi ce jour, ou seulement ceux à venir ?',
      other:
        '{count} jours ont déjà été notés pour {name}. Les modifier aussi, ou seulement ceux à venir ?',
    },
  },
  'ui.past.change.all': {
    en: 'Past and upcoming',
    es: 'Anteriores y próximos',
    fr: 'Passés et à venir',
  },
  'ui.past.change.upcoming': {
    en: 'Upcoming only',
    es: 'Solo los próximos',
    fr: 'Seulement ceux à venir',
  },
  'ui.past.delete.title': {
    en: 'Delete {name}?',
    es: '¿Eliminar {name}?',
    fr: 'Supprimer {name} ?',
  },
  'ui.past.delete.none': {
    en: 'This can’t be undone.',
    es: 'Esto no se puede deshacer.',
    fr: 'Cette action est irréversible.',
  },
  'ui.past.delete.body.charges': {
    en: {
      one: '{name} has 1 past charge. Keep it in your history, or remove it from past months too? Either way, nothing after today is recorded.',
      other:
        '{name} has {count} past charges. Keep them in your history, or remove them from past months too? Either way, nothing after today is recorded.',
    },
    es: {
      one: '{name} tiene un cargo anterior. ¿Conservarlo en tu historial o quitarlo también de los meses pasados? En ambos casos, no se registra nada después de hoy.',
      other:
        '{name} tiene {count} cargos anteriores. ¿Conservarlos en tu historial o quitarlos también de los meses pasados? En ambos casos, no se registra nada después de hoy.',
    },
    fr: {
      one: '{name} a un prélèvement passé. Le garder dans ton historique, ou le retirer aussi des mois passés ? Dans les deux cas, rien n’est enregistré après aujourd’hui.',
      other:
        '{name} a {count} prélèvements passés. Les garder dans ton historique, ou les retirer aussi des mois passés ? Dans les deux cas, rien n’est enregistré après aujourd’hui.',
    },
  },
  'ui.past.delete.body.payments': {
    en: {
      one: '{name} has 1 past payment. Keep it in your history, or remove it from past months too? Either way, nothing after today is recorded.',
      other:
        '{name} has {count} past payments. Keep them in your history, or remove them from past months too? Either way, nothing after today is recorded.',
    },
    es: {
      one: '{name} tiene un pago anterior. ¿Conservarlo en tu historial o quitarlo también de los meses pasados? En ambos casos, no se registra nada después de hoy.',
      other:
        '{name} tiene {count} pagos anteriores. ¿Conservarlos en tu historial o quitarlos también de los meses pasados? En ambos casos, no se registra nada después de hoy.',
    },
    fr: {
      one: '{name} a un paiement passé. Le garder dans ton historique, ou le retirer aussi des mois passés ? Dans les deux cas, rien n’est enregistré après aujourd’hui.',
      other:
        '{name} a {count} paiements passés. Les garder dans ton historique, ou les retirer aussi des mois passés ? Dans les deux cas, rien n’est enregistré après aujourd’hui.',
    },
  },
  'ui.past.delete.body.days': {
    en: {
      one: '{name} has 1 past day. Keep it in your history, or remove it from past months too? Either way, nothing after today is recorded.',
      other:
        '{name} has {count} past days. Keep them in your history, or remove them from past months too? Either way, nothing after today is recorded.',
    },
    es: {
      one: '{name} tiene un día anterior. ¿Conservarlo en tu historial o quitarlo también de los meses pasados? En ambos casos, no se registra nada después de hoy.',
      other:
        '{name} tiene {count} días anteriores. ¿Conservarlos en tu historial o quitarlos también de los meses pasados? En ambos casos, no se registra nada después de hoy.',
    },
    fr: {
      one: '{name} a un jour passé. Le garder dans ton historique, ou le retirer aussi des mois passés ? Dans les deux cas, rien n’est enregistré après aujourd’hui.',
      other:
        '{name} a {count} jours passés. Les garder dans ton historique, ou les retirer aussi des mois passés ? Dans les deux cas, rien n’est enregistré après aujourd’hui.',
    },
  },
  'ui.past.delete.keep.charges': {
    en: 'Keep past charges',
    es: 'Conservar los cargos anteriores',
    fr: 'Garder les prélèvements passés',
  },
  'ui.past.delete.keep.payments': {
    en: 'Keep past payments',
    es: 'Conservar los pagos anteriores',
    fr: 'Garder les paiements passés',
  },
  'ui.past.delete.keep.days': {
    en: 'Keep past days',
    es: 'Conservar los días anteriores',
    fr: 'Garder les jours passés',
  },
  'ui.past.delete.everything': {
    en: 'Remove everything',
    es: 'Eliminar todo',
    fr: 'Tout supprimer',
  },

  /** A Paid with tile as VoiceOver reads it; "terminada" agrees with tarjeta and cuenta alike. */
  'ui.source.endingIn': {
    en: '{name}, ending in {last4}',
    es: '{name}, terminada en {last4}',
    fr: '{name}, se terminant par {last4}',
  },
});
