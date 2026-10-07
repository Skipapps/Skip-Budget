import { t, type MessageKey } from '@/i18n';
import { MESSAGES } from '@/i18n/messages';

/** A shop category's name by its stored id; an id the app has no words for keeps its stored label. */
export function receiptCategoryName(id: string, stored: string | undefined): string {
  const key = `receipts.category.${id}`;
  if (key in MESSAGES) return t(key as MessageKey);
  return stored ?? t('receipts.category.other');
}
