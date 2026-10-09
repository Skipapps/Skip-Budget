import type { ViewStyle } from 'react-native';

import { CardFace } from '@/components/cards/card-face';
import type { PaymentCard as PaymentCardModel } from '@/data/cards';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { toCents } from '@/lib/money';

type PaymentCardProps = {
  card: PaymentCardModel;
  /** Placeholder shown while the name field is still empty. */
  placeholderHolder?: string;
  /** The form's live preview: with no limit yet it draws the empty bar and says so. */
  preview?: boolean;
  style?: ViewStyle;
};

export function PaymentCard({ card, placeholderHolder, preview = false, style }: PaymentCardProps) {
  // Stored as debt (a bigger number is more owed); the face shows it as it affects you, negative.
  // Decided in cents: $0.40 still owed is owed, float dust is nothing.
  const owed = toCents(card.balance);
  const limit = card.creditLimit ? toCents(card.creditLimit) : 0;

  return (
    <CardFace
      color={card.color}
      title={card.holder}
      titlePlaceholder={placeholderHolder}
      meta={card.network}
      metaStyle="mark"
      amount={-card.balance}
      // Overpaying leaves the card in your favour, which is not the same as owing nothing.
      caption={t(
        owed > 0 ? 'cards.face.owed' : owed < 0 ? 'cards.face.inCredit' : 'cards.face.nothingOwed',
      )}
      // The face clamps it: a card in credit shows an empty bar, one past its limit a full one.
      share={limit > 0 ? owed / limit : preview ? 0 : undefined}
      footnote={
        limit > 0
          ? t('cards.face.limitUsed', {
              used: formatCurrency(Math.max(0, card.balance), { cents: false }),
              limit: formatCurrency(card.creditLimit!, { cents: false }),
            })
          : preview
            ? t('cards.face.limitNotSet')
            : null
      }
      last4={card.last4}
      style={style}
    />
  );
}
