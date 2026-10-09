export type PaymentCard = {
  id: string;
  holder: string;
  balance: number;
  /** Last four digits; the rest is never stored or shown. */
  last4: string;
  network: string;
  /** Card face colour, picked from FACE_COLORS; a card made before them keeps a CARD_COLORS one. */
  color: string;
  /** Null or omitted when none was given: the face then draws no bar. */
  creditLimit?: number | null;
};

export const NETWORKS = ['VISA', 'Mastercard', 'Amex', 'Discover'] as const;
