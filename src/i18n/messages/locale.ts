import { defineMessages } from '@/i18n/translate';

export const localeMessages = defineMessages({
  'locale.language.title': { en: 'Language', es: 'Idioma', fr: 'Langue' },
  'locale.currency.title': { en: 'Currency', es: 'Moneda', fr: 'Devise' },
  'locale.automatic': {
    en: 'Same as my phone',
    es: 'Igual que mi teléfono',
    fr: 'Comme mon téléphone',
  },
  'locale.currency.note': {
    en: 'This changes how amounts are shown. It does not convert them.',
    es: 'Esto cambia cómo se muestran los importes. No los convierte.',
    fr: 'Cela change l’affichage des montants. Cela ne les convertit pas.',
  },
  'locale.currency.USD': {
    en: 'US dollar',
    es: 'Dólar estadounidense',
    fr: 'Dollar américain',
  },
  'locale.currency.GBP': {
    en: 'Pound sterling',
    es: 'Libra esterlina',
    fr: 'Livre sterling',
  },
  'locale.currency.CAD': {
    en: 'Canadian dollar',
    es: 'Dólar canadiense',
    fr: 'Dollar canadien',
  },
  'locale.currency.MXN': {
    en: 'Mexican peso',
    es: 'Peso mexicano',
    fr: 'Peso mexicain',
  },
  'locale.currency.AUD': {
    en: 'Australian dollar',
    es: 'Dólar australiano',
    fr: 'Dollar australien',
  },
});
