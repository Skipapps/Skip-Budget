import {
  useBankAccounts,
  useBills,
  useCards,
  useSalarySources,
  useSubscriptions,
} from '@/api/queries';
import { t } from '@/i18n';

/** Each counted thing's message holds its own one/other wording; this only hands it the count. */
const COUNTED = {
  card: 'settings.count.cards',
  bankAccount: 'settings.count.bankAccounts',
  bill: 'settings.count.bills',
  recurringBill: 'settings.count.recurringBills',
  subscription: 'settings.count.subscriptions',
  receipt: 'settings.count.receipts',
  recordedCharge: 'settings.count.recordedCharges',
  salarySource: 'settings.count.salarySources',
} as const;

export type Counted = keyof typeof COUNTED;

/** "2 bank accounts" in the language on screen. */
export const plural = (count: number, thing: Counted) => t(COUNTED[thing], { count });

/**
 * One read for the counts Your money shows and the tally Delete account lists, so the two pages
 * cannot disagree about how much someone has.
 */
export function useMoneyCounts() {
  const bills = useBills();
  const subscriptions = useSubscriptions();
  const cards = useCards();
  const accounts = useBankAccounts();
  const salary = useSalarySources();

  return {
    bills: bills.data?.length ?? 0,
    subscriptions: subscriptions.data?.length ?? 0,
    cards: cards.data?.length ?? 0,
    accounts: accounts.data?.length ?? 0,
    salarySources: salary.data?.length ?? 0,
  };
}
