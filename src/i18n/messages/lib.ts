import { defineMessages } from '@/i18n/translate';

export const libMessages = defineMessages({
  'lib.appLock.passcode': { en: 'your passcode', es: 'tu código', fr: 'ton code' },
  'lib.appLock.unlock': { en: 'Unlock Skip', es: 'Desbloquear Skip', fr: 'Déverrouiller Skip' },
  'lib.appLock.noHardware': {
    en: 'This phone has no Face ID or Touch ID.',
    es: 'Este teléfono no tiene Face ID ni Touch ID.',
    fr: 'Ce téléphone n’a ni Face ID ni Touch ID.',
  },
  'lib.appLock.notEnrolled': {
    en: 'Set up Face ID or Touch ID in your phone’s settings first, then come back.',
    es: 'Primero configura Face ID o Touch ID en los ajustes de tu teléfono y luego vuelve.',
    fr: 'Configure d’abord Face ID ou Touch ID dans les réglages de ton téléphone, puis reviens.',
  },
  'lib.appLock.unsupported': {
    en: 'App lock is not available in this build of Skip.',
    es: 'El bloqueo de la app no está disponible en esta versión de Skip.',
    fr: 'Le verrouillage de l’app n’est pas disponible dans cette version de Skip.',
  },

  'lib.hourly.timeAndAHalf': {
    en: 'Time and a half (1.5×)',
    es: 'Tiempo y medio (1.5×)',
    fr: 'Temps et demi (1,5×)',
  },
  'lib.hourly.doubleTime': {
    en: 'Double time (2×)',
    es: 'Tiempo doble (2×)',
    fr: 'Temps double (2×)',
  },
  'lib.hourly.enterRate': {
    en: 'Enter what you earn per hour.',
    es: 'Ingresa cuánto ganas por hora.',
    fr: 'Indique combien tu gagnes de l’heure.',
  },
  'lib.hourly.enterHours': {
    en: 'Enter how many hours you work in a typical week.',
    es: 'Ingresa cuántas horas trabajas en una semana normal.',
    fr: 'Indique combien d’heures tu travailles dans une semaine normale.',
  },
  'lib.hourly.negativeOvertime': {
    en: 'Overtime hours cannot be negative.',
    es: 'Las horas extra no pueden ser negativas.',
    fr: 'Les heures supplémentaires ne peuvent pas être négatives.',
  },
  'lib.hourly.tooManyHours': {
    en: 'A week only has {hours} hours — check the hours you entered.',
    es: 'Una semana solo tiene {hours} horas. Revisa las horas que ingresaste.',
    fr: 'Une semaine ne compte que {hours} heures. Vérifie les heures que tu as indiquées.',
  },
  'lib.hourly.deductions': {
    en: 'Tax and deductions should be a percentage under 100.',
    es: 'Los impuestos y las deducciones deben ser un porcentaje menor que 100.',
    fr: 'Les impôts et les retenues doivent être un pourcentage inférieur à 100.',
  },

  'lib.voice.pickAmount': {
    en: 'Pick the amount you meant.',
    es: 'Elige el importe que quisiste decir.',
    fr: 'Choisis le montant que tu voulais dire.',
  },
  'lib.voice.pickBillCategory': {
    en: 'Pick what the bill is for.',
    es: 'Elige de qué es la factura.',
    fr: 'Choisis à quoi correspond la facture.',
  },
});
