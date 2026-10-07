import { defineMessages } from '@/i18n/translate';

export const navMessages = defineMessages({
  'nav.home': { en: 'Home', es: 'Inicio', fr: 'Accueil' },
  'nav.cards': { en: 'Cards', es: 'Tarjetas', fr: 'Cartes' },
  'nav.activity': { en: 'Activity', es: 'Actividad', fr: 'Activité' },
  'nav.settings': { en: 'Settings', es: 'Ajustes', fr: 'Réglages' },
  'nav.locked.title': {
    en: 'Skip is locked',
    es: 'Skip está bloqueada',
    fr: 'Skip est verrouillée',
  },
  'nav.locked.body': {
    en: 'Your budget is behind Face ID on this phone.',
    es: 'Tu presupuesto está protegido con Face ID en este teléfono.',
    fr: 'Ton budget est protégé par Face ID sur ce téléphone.',
  },
  'nav.locked.unlock': { en: 'Unlock', es: 'Desbloquear', fr: 'Déverrouiller' },
  'nav.locked.unlockLabel': { en: 'Unlock Skip', es: 'Desbloquear Skip', fr: 'Déverrouiller Skip' },
  'nav.locked.waiting': { en: 'Waiting…', es: 'Esperando…', fr: 'En attente…' },
});
