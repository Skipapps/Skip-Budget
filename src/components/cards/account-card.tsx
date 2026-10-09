import type { ViewStyle } from 'react-native';

import { CardFace } from '@/components/cards/card-face';
import type { BankAccount } from '@/data/accounts';
import { t } from '@/i18n';
import { toIsoDate } from '@/lib/date';
import { toCents } from '@/lib/money';
import { updatedLine } from '@/lib/source-updated';

type AccountCardProps = {
  account: BankAccount;
  placeholderName?: string;
  /** yyyy-mm-dd the balance was last true to something real (see lastUpdated); no line when null. */
  updatedOn?: string | null;
  /** yyyy-mm-dd; the screen's own day, so a page left open overnight moves on with it. */
  today?: string;
  style?: ViewStyle;
};

export function AccountCard({
  account,
  placeholderName,
  updatedOn,
  today,
  style,
}: AccountCardProps) {
  // The stored number is money held, so unlike a card's it needs no flipping.
  return (
    <CardFace
      color={account.color}
      title={account.bankName}
      titlePlaceholder={placeholderName}
      // The type is a stored value ("Checking"); only what the face says is translated.
      meta={t(
        account.accountType === 'Savings' ? 'accounts.type.savings' : 'accounts.type.checking',
      )}
      amount={account.balance}
      // Decided in cents: a $0.01 overdraft is overdrawn, float dust is not.
      caption={t(toCents(account.balance) < 0 ? 'cards.face.overdrawn' : 'cards.face.available')}
      footnote={updatedLine(updatedOn ?? null, today ?? toIsoDate(new Date()))}
      last4={account.last4}
      style={style}
    />
  );
}
