import { monthShort } from '@/i18n/calendar';
import { t } from '@/i18n';
import type { Ledger } from '@/lib/card-ledger';
import { formatFullDate } from '@/lib/date';

/**
 * The day a card's or account's figure was last true to something real: the later of the day its
 * balance was typed and its newest entry that has happened. Null when neither exists.
 */
export function lastUpdated(
  balanceAsOf: string | null | undefined,
  ledger: Pick<Ledger, 'entries'> | null | undefined,
  today: string,
): string | null {
  let latest: string | null = balanceAsOf && balanceAsOf <= today ? balanceAsOf : null;
  for (const entry of ledger?.entries ?? []) {
    if (entry.date <= today && (latest === null || entry.date > latest)) latest = entry.date;
  }
  return latest;
}

/** "Updated today", "Updated yesterday", "Updated 4 Oct" (the year only when it is not this one). */
export function updatedLine(day: string | null, today: string): string | null {
  if (!day) return null;
  if (day === today) return t('cards.face.updatedToday');

  const date = new Date(`${day}T00:00:00`);
  const reference = new Date(`${today}T00:00:00`);
  // Rounded: a daylight-saving change makes one day 23 or 25 hours long.
  if (Math.round((reference.getTime() - date.getTime()) / 86_400_000) === 1) {
    return t('cards.face.updatedYesterday');
  }
  const shown =
    date.getFullYear() === reference.getFullYear()
      ? `${date.getDate()} ${monthShort(date.getMonth())}`
      : formatFullDate(date);
  return t('cards.face.updatedOn', { date: shown });
}
