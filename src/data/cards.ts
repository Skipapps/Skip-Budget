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

export const NETWORKS = ['VISA', 'Mastercard', 'Amex', 'Discover'] as const;
