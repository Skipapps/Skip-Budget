import { defineMessages } from '@/i18n/translate';

export const salaryMessages = defineMessages({
  'salary.title': { en: 'Salary', es: 'Salario', fr: 'Salaire' },
  'salary.payType.fixed': { en: 'Fixed pay', es: 'Salario fijo', fr: 'Paie fixe' },
  'salary.payType.hourly': { en: 'Hourly', es: 'Por hora', fr: 'À l’heure' },
  // Not common.none: both languages agree it with "horas extra" / "heures supplémentaires".
  'salary.overtime.none': { en: 'None', es: 'Ninguna', fr: 'Aucune' },

  'salary.remove.title': {
    en: 'Remove {name}?',
    es: '¿Quitar {name}?',
    fr: 'Retirer {name} ?',
  },
  'salary.remove.titleUnnamed': {
    en: 'Remove this source?',
    es: '¿Quitar esta fuente?',
    fr: 'Retirer cette source ?',
  },
  'salary.remove.message': {
    en: 'Its paydays stop being counted as money coming in, on the dashboard and everywhere else. Nothing you have spent changes.',
    es: 'Sus días de pago dejan de contarse como dinero que entra, en Inicio y en todas partes. Nada de lo que gastaste cambia.',
    fr: 'Ses jours de paie ne comptent plus comme de l’argent qui entre, dans Accueil comme partout ailleurs. Rien de ce que tu as dépensé ne change.',
  },
  'salary.remove.keep': { en: 'Keep it', es: 'Conservarla', fr: 'La garder' },

  'salary.needNameAndPay': {
    en: 'Give each source a name and its pay.',
    es: 'Ponle a cada fuente un nombre y su salario.',
    fr: 'Donne à chaque source un nom et sa paie.',
  },
  'salary.sourceProblem': {
    en: '{name}: {problem}',
    es: '{name}: {problem}',
    fr: '{name} : {problem}',
  },
  'salary.needLastPayday': {
    en: 'Pick the last payday for each source, so Skip can work out the next ones.',
    es: 'Elige el último día de pago de cada fuente para que Skip calcule los siguientes.',
    fr: 'Choisis le dernier jour de paie de chaque source pour que Skip calcule les suivants.',
  },

  'salary.totalPerMonth': { en: 'Total per month', es: 'Total al mes', fr: 'Total par mois' },
  'salary.sourceNumber': { en: 'Source {number}', es: 'Fuente {number}', fr: 'Source {number}' },
  'salary.removeSource': {
    en: 'Remove source {number}',
    es: 'Quitar fuente {number}',
    fr: 'Retirer la source {number}',
  },
  'salary.expandSource': {
    en: 'Expand source {number}',
    es: 'Mostrar fuente {number}',
    fr: 'Afficher la source {number}',
  },
  'salary.collapseSource': {
    en: 'Collapse source {number}',
    es: 'Ocultar fuente {number}',
    fr: 'Masquer la source {number}',
  },
  'salary.unnamed': { en: 'Unnamed', es: 'Sin nombre', fr: 'Sans nom' },
  'salary.name': { en: 'Name', es: 'Nombre', fr: 'Nom' },
  'salary.howPaid': { en: 'How you are paid', es: 'Cómo te pagan', fr: 'Mode de paie' },
  'salary.hourlyRate': { en: 'Hourly rate', es: 'Tarifa por hora', fr: 'Taux horaire' },
  'salary.perHour': { en: '{amount} an hour', es: '{amount} por hora', fr: '{amount} de l’heure' },
  'salary.hourlyRatePlaceholder': {
    en: 'What you earn per hour',
    es: 'Lo que ganas por hora',
    fr: 'Ce que tu gagnes de l’heure',
  },
  'salary.hoursAWeek': { en: 'Hours a week', es: 'Horas por semana', fr: 'Heures par semaine' },
  'salary.hoursUnit': { en: 'hrs', es: 'h', fr: 'h' },
  'salary.overtime': { en: 'Overtime', es: 'Horas extra', fr: 'Heures supplémentaires' },
  'salary.overtimeHours': {
    en: 'Overtime hours a week',
    es: 'Horas extra por semana',
    fr: 'Heures supplémentaires par semaine',
  },
  'salary.overtimePays': {
    en: 'Overtime pays',
    es: 'Pago de horas extra',
    fr: 'Taux des heures supplémentaires',
  },
  'salary.amount': { en: 'Amount', es: 'Importe', fr: 'Montant' },
  'salary.enterAmount': {
    en: 'Enter an amount',
    es: 'Ingresa un importe',
    fr: 'Indique un montant',
  },
  'salary.openCalculator': {
    en: 'Open calculator',
    es: 'Abrir calculadora',
    fr: 'Ouvrir la calculatrice',
  },
  'salary.howOften': { en: 'How often', es: 'Frecuencia', fr: 'Fréquence' },
  'salary.lastPayday': {
    en: 'Last payday',
    es: 'Último día de pago',
    fr: 'Dernier jour de paie',
  },
  'salary.lastPaydayPlaceholder': {
    en: 'Pick the most recent one',
    es: 'Elige el más reciente',
    fr: 'Choisis le plus récent',
  },
  'salary.paidOn': { en: 'Paid on', es: 'Pagado el', fr: 'Payé le' },
  'salary.paidOnPlaceholder': {
    en: 'Pick the day it was paid',
    es: 'Elige el día en que se pagó',
    fr: 'Choisis le jour où elle a été payée',
  },
  'salary.needPaidOn': {
    en: 'Pick the day each one-off pay was paid.',
    es: 'Elige el día en que se pagó cada pago único.',
    fr: 'Choisis le jour de chaque paie unique.',
  },
  'salary.hoursWorked': { en: 'Hours worked', es: 'Horas trabajadas', fr: 'Heures travaillées' },
  'salary.overtimeWorked': {
    en: 'Overtime hours worked',
    es: 'Horas extra trabajadas',
    fr: 'Heures supplémentaires travaillées',
  },
  'salary.thisPay': {
    en: 'This pay, before tax',
    es: 'Este pago, antes de impuestos',
    fr: 'Cette paie, avant impôts',
  },
  'salary.countsThisMonth': {
    en: 'Counts once, in the month it was paid',
    es: 'Cuenta una vez, en el mes en que se pagó',
    fr: 'Compte une fois, le mois où elle a été payée',
  },
  'salary.oneOffThisMonth': {
    en: '+ {amount} paid once this month',
    es: '+ {amount} pagado una vez este mes',
    fr: '+ {amount} payé une fois ce mois-ci',
  },
  'salary.addOneOff': {
    en: 'Add a one-off pay',
    es: 'Agregar un pago único',
    fr: 'Ajouter une paie unique',
  },
  'salary.oneOffNumber': { en: 'One-off pay', es: 'Pago único', fr: 'Paie unique' },
  'salary.earlierOneOffs': {
    en: { one: '{count} earlier one-off pay', other: '{count} earlier one-off pays' },
    es: { one: '{count} pago único anterior', other: '{count} pagos únicos anteriores' },
    fr: { one: '{count} paie unique antérieure', other: '{count} paies uniques antérieures' },
  },
  'salary.earlierHint': {
    en: 'Shows them, to change or remove',
    es: 'Los muestra para cambiarlos o quitarlos',
    fr: 'Les affiche pour les modifier ou les retirer',
  },
  'salary.nextPayday': {
    en: 'Next payday {date}',
    es: 'Próximo día de pago: {date}',
    fr: 'Prochain jour de paie : {date}',
  },
  'salary.paidInto': { en: 'Paid into', es: 'Se deposita en', fr: 'Versée dans' },
  'salary.linkAccountHint': {
    en: 'Link at least one account so Skip knows where this lands.',
    es: 'Vincula al menos una cuenta para que Skip sepa a dónde llega.',
    fr: 'Associe au moins un compte pour que Skip sache où elle arrive.',
  },
  'salary.addSource': {
    en: 'Add salary source',
    es: 'Agregar fuente de salario',
    fr: 'Ajouter une source de salaire',
  },
  'salary.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },

  'salary.ratePadCaption': {
    en: 'Per hour, before tax',
    es: 'Por hora, antes de impuestos',
    fr: 'De l’heure, avant impôts',
  },
  'salary.amountPadTitle': {
    en: 'Salary amount',
    es: 'Importe del salario',
    fr: 'Montant du salaire',
  },
  'salary.eachPayPeriod': {
    en: 'Each pay period',
    es: 'Cada periodo de pago',
    fr: 'Chaque période de paie',
  },

  'salary.estimateA11y': {
    en: 'Each paycheck about {paycheck} before tax. About {perMonth} a month.',
    es: 'Cada pago, unos {paycheck} antes de impuestos. Unos {perMonth} al mes.',
    fr: 'Chaque paie, environ {paycheck} avant impôts. Environ {perMonth} par mois.',
  },
  'salary.eachPaycheck': {
    en: 'Each paycheck, before tax',
    es: 'Cada pago, antes de impuestos',
    fr: 'Chaque paie, avant impôts',
  },
  'salary.aboutPerMonth': {
    en: 'About {amount} a month',
    es: 'Unos {amount} al mes',
    fr: 'Environ {amount} par mois',
  },
});
