import type { PotRowData } from '@/components/savings/pot-row';
import type { PotState } from '@/components/savings/pot-detail-parts';
import {
  dayMonthText,
  monthName,
  monthTitle,
  shortMoney,
} from '@/components/savings/savings-words';
import type { PillStatus } from '@/components/savings/status-pill';
import { t } from '@/i18n';
import { toCents } from '@/lib/money';
import type { PotView } from '@/lib/savings';

/**
 * How a pot is named and described wherever it is drawn, from its view: a month by its name, added
 * savings by its own label.
 */

/** "September", or "Birthday gift". */
export function potName(pot: PotView): string {
  return pot.kind === 'month' && pot.month ? monthName(pot.month) : (pot.label ?? '');
}

/** "September 2026" for a month's page, or the added savings' label. */
export function potTitle(pot: PotView): string {
  return pot.kind === 'month' && pot.month ? monthTitle(pot.month) : (pot.label ?? '');
}

/** "Earned $3,700 · Spent $3,060", or "Added 3 Oct". */
export function potDetail(pot: PotView): string {
  return pot.kind === 'month'
    ? t('savings.earnedSpent', {
        earned: shortMoney(pot.earned ?? 0),
        spent: shortMoney(pot.spent ?? 0),
      })
    : t('savings.addedOn', { date: dayMonthText(pot.added_on) });
}

/**
 * The pill. A month with nothing left over (no pay and no spending, or exactly even) moved nothing
 * without being overspent, so it says so rather than "Overspent".
 */
export function potPill(pot: PotView): PillStatus {
  switch (pot.status) {
    case 'overspent':
      return toCents(pot.leftOver) === 0 ? { kind: 'nothing' } : { kind: 'overspent' };
    case 'partly':
      return { kind: 'partly', amount: pot.left };
    case 'ready':
      return { kind: 'ready' };
    case 'sent':
      return { kind: 'sent' };
  }
}

/** Where the pot's money is now; nothing to say for a month that moved nothing. */
export function potState(pot: PotView): PotState | null {
  switch (pot.status) {
    case 'ready':
      return { kind: 'waiting' };
    case 'partly':
      return { kind: 'partly', left: pot.left, sent: pot.sentFromIt };
    case 'sent':
      return { kind: 'allSent', sent: pot.sentFromIt };
    case 'overspent':
      return null;
  }
}

export function potRowOf(pot: PotView): PotRowData {
  return {
    id: pot.id,
    name: potName(pot),
    detail: potDetail(pot),
    amount: pot.amount,
    status: potPill(pot),
  };
}

/** The year a pot is listed under: a month's own year, or the year it was added. */
export function potYear(pot: PotView): number {
  return Number((pot.kind === 'month' && pot.month ? pot.month : pot.added_on).slice(0, 4));
}

/** Pots grouped by year in the order given (newest first), for By month. */
export function byYear(pots: readonly PotView[]): { year: number; rows: PotRowData[] }[] {
  const years: { year: number; rows: PotRowData[] }[] = [];
  for (const pot of pots) {
    const year = potYear(pot);
    const group = years.find((entry) => entry.year === year);
    if (group) group.rows.push(potRowOf(pot));
    else years.push({ year, rows: [potRowOf(pot)] });
  }
  return years.sort((a, b) => b.year - a.year);
}
