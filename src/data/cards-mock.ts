/**
 * Placeholder wallet contents. Sample data only — replaced once cards come
 * from the database.
 */
export type PaymentCard = {
  id: string;
  holder: string;
  balance: number;
  /** Last four digits; the rest is never stored or shown. */
  last4: string;
  network: string;
  /** Card face colour, chosen from CARD_COLORS when the card is created. */
  color: string;
};

export const cards: PaymentCard[] = [
  {
    id: 'card-1',
    holder: 'Alex Morgan',
    balance: 112411,
    last4: '2451',
    network: 'VISA',
    color: '#FA8F6F',
  },
  {
    id: 'card-2',
    holder: 'Alex Morgan',
    balance: 24880,
    last4: '0095',
    network: 'VISA',
    color: '#161616',
  },
  {
    id: 'card-3',
    holder: 'Alex Morgan',
    balance: 12000,
    last4: '1122',
    network: 'VISA',
    color: '#FFFFFF',
  },
];

export const NETWORKS = ['VISA', 'Mastercard', 'Amex', 'Discover'] as const;
