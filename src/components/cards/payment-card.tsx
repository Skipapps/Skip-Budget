import type { ViewStyle } from 'react-native';

import { CardFace } from '@/components/cards/card-face';
import type { PaymentCard as PaymentCardModel } from '@/data/cards-mock';

type PaymentCardProps = {
  card: PaymentCardModel;
  /** Placeholder shown while the name field is still empty. */
  placeholderHolder?: string;
  style?: ViewStyle;
};

export function PaymentCard({ card, placeholderHolder, style }: PaymentCardProps) {
  // A card balance is stored as debt — a bigger number means more owed. On the
  // face it is shown the way it affects you, which is negative: this is money
  // already spent, not money sitting there waiting.
  const owed = Math.round(card.balance);

  return (
    <CardFace
      color={card.color}
      title={card.holder}
      titlePlaceholder={placeholderHolder}
      meta={card.network}
      metaStyle="mark"
      amount={-card.balance}
      // Overpaying a card leaves it in your favour, which is a different thing
      // from owing nothing at all, and worth saying plainly.
      caption={owed > 0 ? 'Owed' : owed < 0 ? 'In credit' : 'Nothing owed'}
      last4={card.last4}
      style={style}
    />
  );
}
