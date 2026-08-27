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
  return (
    <CardFace
      color={card.color}
      title={card.holder}
      titlePlaceholder={placeholderHolder}
      meta={card.network}
      metaStyle="mark"
      amount={card.balance}
      last4={card.last4}
      style={style}
    />
  );
}
