import type { ViewStyle } from 'react-native';

import { CardFace } from '@/components/cards/card-face';
import type { BankAccount } from '@/data/accounts-mock';
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
      meta={account.accountType}
      amount={account.balance}
      // Decided in cents: a $0.01 overdraft is overdrawn, float dust is not.
      caption={toCents(account.balance) < 0 ? 'Overdrawn' : 'Available'}
      last4={account.last4}
      style={style}
    />
  );
}
