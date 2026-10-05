import type { ViewStyle } from 'react-native';

import { CardFace } from '@/components/cards/card-face';
import type { PaymentCard as PaymentCardModel } from '@/data/cards-mock';
import { toCents } from '@/lib/money';

type PaymentCardProps = {
  card: PaymentCardModel;
  /** Placeholder shown while the name field is still empty. */
  placeholderHolder?: string;
  style?: ViewStyle;
};

export function PaymentCard({ card, placeholderHolder, style }: PaymentCardProps) {
  // Stored as debt (a bigger number is more owed); the face shows it as it affects you, negative.
  // Decided in cents: $0.40 still owed is owed, float dust is nothing.
  const owed = toCents(card.balance);

  return (
    <CardFace
      color={card.color}
      title={card.holder}
      titlePlaceholder={placeholderHolder}
      meta={card.network}
      metaStyle="mark"
      amount={-card.balance}
      // Overpaying leaves the card in your favour, which is not the same as owing nothing.
      caption={owed > 0 ? 'Owed' : owed < 0 ? 'In credit' : 'Nothing owed'}
      last4={card.last4}
      style={style}
    />
  );
}
