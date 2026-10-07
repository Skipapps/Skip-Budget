import type { ViewStyle } from 'react-native';

import { CardFace } from '@/components/cards/card-face';
import type { BankAccount } from '@/data/accounts-mock';
import { t } from '@/i18n';
import { toCents } from '@/lib/money';

type AccountCardProps = {
  account: BankAccount;
  placeholderName?: string;
  style?: ViewStyle;
};

export function AccountCard({ account, placeholderName, style }: AccountCardProps) {
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
      last4={account.last4}
      style={style}
    />
  );
}
