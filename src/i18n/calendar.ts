import type { Language } from '@/i18n/config';
import { getLocaleSnapshot } from '@/i18n/store';

/**
 * Hand-rolled because Hermes ships Intl inconsistently across platforms. Spanish follows Mexico
 * (lower-case, no full stop), French follows Canada (lower-case, a full stop on shortened words).
 */
const MONTHS_SHORT: Record<Language, readonly string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  fr: [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juill.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ],
};

const MONTHS_LONG: Record<Language, readonly string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  es: [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ],
  fr: [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ],
};

const WEEKDAYS_SHORT: Record<Language, readonly string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
};

const WEEKDAYS_LONG: Record<Language, readonly string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
};

/** One letter for a calendar header, read by position, so repeats (T and T, M and M) are fine. */
const WEEKDAY_INITIALS: Record<Language, readonly string[]> = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  es: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  fr: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
};

const current = () => getLocaleSnapshot().language;

/** Month 0 to 11, as Date#getMonth counts. */
export const monthShort = (month: number): string => MONTHS_SHORT[current()][month];
export const monthLong = (month: number): string => MONTHS_LONG[current()][month];

/** Weekday 0 (Sunday) to 6, as Date#getDay counts. */
export const weekdayShort = (day: number): string => WEEKDAYS_SHORT[current()][day];
export const weekdayLong = (day: number): string => WEEKDAYS_LONG[current()][day];

/** All twelve, for a month grid. */
export const monthsShort = (): readonly string[] => MONTHS_SHORT[current()];
export const monthsLong = (): readonly string[] => MONTHS_LONG[current()];
export const weekdayInitials = (): readonly string[] => WEEKDAY_INITIALS[current()];

/**
 * A time of day the way the language writes it: "9:00 AM", "9:00 a. m." (a no-break space inside),
 * "9 h 00". French uses the 24-hour clock, as Canada does.
 */
export function clockText(hour: number, minute: number, language: Language = current()): string {
  const mm = String(minute).padStart(2, '0');

  if (language === 'fr') return `${hour} h ${mm}`;

  const shown = hour % 12 === 0 ? 12 : hour % 12;
  const pm = hour >= 12;
  if (language === 'es') return `${shown}:${mm} ${pm ? 'p. m.' : 'a. m.'}`;
  return `${shown}:${mm} ${pm ? 'PM' : 'AM'}`;
}
