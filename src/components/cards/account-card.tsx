import type { ViewStyle } from 'react-native';

import { CardFace } from '@/components/cards/card-face';
import type { BankAccount } from '@/data/accounts-mock';

type AccountCardProps = {
  account: BankAccount;
  placeholderName?: string;
  style?: ViewStyle;
};

export function AccountCard({ account, placeholderName, style }: AccountCardProps) {
  // An account already runs the right way round: the stored number is money
  // held, so it needs no flipping the way a card's does.
  return (
    <CardFace
      color={account.color}
      title={account.bankName}
      titlePlaceholder={placeholderName}
      meta={account.accountType}
      amount={account.balance}
      caption={Math.round(account.balance) < 0 ? 'Overdrawn' : 'Available'}
      last4={account.last4}
      style={style}
    />
  );
}
