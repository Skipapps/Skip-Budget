import type { ViewStyle } from 'react-native';

import { CardFace } from '@/components/cards/card-face';
import type { PaymentCard as PaymentCardModel } from '@/data/cards-mock';
import { t } from '@/i18n';
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
      // A network name is a brand and reads the same in every language.
      meta={card.network}
      metaStyle="mark"
      amount={-card.balance}
      // Overpaying leaves the card in your favour, which is not the same as owing nothing.
      caption={t(
        owed > 0 ? 'cards.face.owed' : owed < 0 ? 'cards.face.inCredit' : 'cards.face.nothingOwed',
      )}
      last4={card.last4}
      style={style}
    />
  );
}
