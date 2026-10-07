import { dateMessages } from '@/i18n/messages/dates';
import { localeMessages } from '@/i18n/messages/locale';

/** One file per area, each with all three languages side by side. */
export const MESSAGE_AREAS = {
  dates: dateMessages,
  locale: localeMessages,
};

/**
 * Spread rather than merged at runtime so every key stays a literal type. A key defined in two
 * areas would be silently overwritten here; the messages test counts the areas to catch it.
 */
export const MESSAGES = {
  ...MESSAGE_AREAS.dates,
  ...MESSAGE_AREAS.locale,
};

export type MessageKey = keyof typeof MESSAGES;
