import { defineMessages } from '@/i18n/translate';

export const preferencesMessages = defineMessages({
  'preferences.title': { en: 'Preferences', es: 'Preferencias', fr: 'Préférences' },
  'preferences.appearance.title': { en: 'Appearance', es: 'Apariencia', fr: 'Apparence' },
  'preferences.appearance.light': { en: 'Light', es: 'Claro', fr: 'Clair' },
  'preferences.appearance.dark': { en: 'Dark', es: 'Oscuro', fr: 'Sombre' },
  'preferences.appearance.system': { en: 'System', es: 'Sistema', fr: 'Système' },
  'preferences.appearance.lightCaption': {
    en: 'Always light',
    es: 'Siempre claro',
    fr: 'Toujours clair',
  },
  'preferences.appearance.darkCaption': {
    en: 'Always dark',
    es: 'Siempre oscuro',
    fr: 'Toujours sombre',
  },
  'preferences.appearance.systemCaption': {
    en: 'Follows your phone',
    es: 'Igual que tu teléfono',
    fr: 'Suit ton téléphone',
  },
  'preferences.haptics.title': { en: 'Haptics', es: 'Respuesta háptica', fr: 'Retour haptique' },
  'preferences.haptics.caption': {
    en: 'A tap when you press something',
    es: 'Un toque cuando presionas algo',
    fr: 'Une vibration quand tu appuies sur un élément',
  },
  'preferences.lock.title': {
    en: 'App lock',
    es: 'Bloqueo de la app',
    fr: 'Verrouillage de l’app',
  },
  'preferences.lock.caption': {
    en: 'Face ID before Skip opens',
    es: 'Face ID antes de abrir Skip',
    fr: 'Face ID avant d’ouvrir Skip',
  },
  'preferences.lock.unavailable': {
    en: 'App lock is not available',
    es: 'El bloqueo de la app no está disponible',
    fr: 'Le verrouillage de l’app n’est pas disponible',
  },
  'preferences.lock.turnOn': {
    en: 'Turn on {label} for Skip',
    es: 'Activar {label} para Skip',
    fr: 'Activer {label} pour Skip',
  },
  'preferences.reminders.title': { en: 'Reminders', es: 'Recordatorios', fr: 'Rappels' },
  'preferences.reminders.caption': {
    en: 'Before a renewal, a bill or payday',
    es: 'Antes de una renovación, una factura o el día de pago',
    fr: 'Avant un renouvellement, une facture ou la paie',
  },
});
