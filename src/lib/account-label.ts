/**
 * "Chase Checking ••7730": the nickname, or the bank when there is none, and the last four when
 * given, never a dangling "••".
 */
export function accountLabel(account: {
  nickname: string | null;
  bank_name: string;
  last4: string | null;
}): string {
  const name = account.nickname || account.bank_name;
  return account.last4 ? `${name} ••${account.last4}` : name;
}
