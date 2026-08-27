import type { ViewStyle } from 'react-native';

import { CardFace } from '@/components/cards/card-face';
import type { BankAccount } from '@/data/accounts-mock';

type AccountCardProps = {
  account: BankAccount;
  placeholderName?: string;
  style?: ViewStyle;
};

export function AccountCard({ account, placeholderName, style }: AccountCardProps) {
  return (
    <CardFace
      color={account.color}
      title={account.bankName}
      titlePlaceholder={placeholderName}
      meta={account.accountType}
      amount={account.balance}
      last4={account.last4}
      style={style}
    />
  );
}
