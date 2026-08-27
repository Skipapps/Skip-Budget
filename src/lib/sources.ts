/**
 * Cards and bank accounts share one namespace wherever something is "paid
 * with" — bills, transactions, filters. Kept in one place so a new payment
 * source shows up everywhere at once.
 */
import { accounts } from '@/data/accounts-mock';
import { cards } from '@/data/cards-mock';

export type PaymentSource = {
  id: string;
  label: string;
  /** Card face colour, so a tile is recognisable at a glance. */
  color: string;
  kind: 'card' | 'account';
};

export const PAYMENT_SOURCES: PaymentSource[] = [
  ...cards.map((card) => ({
    id: card.id,
    label: `${card.network} ••${card.last4}`,
    color: card.color,
    kind: 'card' as const,
  })),
  ...accounts.map((account) => ({
    id: account.id,
    label: `${account.bankName} ••${account.last4}`,
    color: account.color,
    kind: 'account' as const,
  })),
];

/** value/label shape for chip and filter controls. */
export const PAYMENT_SOURCE_OPTIONS = PAYMENT_SOURCES.map((source) => ({
  value: source.id,
  label: source.label,
}));

const LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_SOURCES.map((source) => [source.id, source.label]),
);

export function getSourceLabel(id: string): string {
  return LABELS[id] ?? 'Unknown';
}
