import { router } from 'expo-router';
import { CalendarDays, CreditCard, ReceiptText, Repeat } from 'lucide-react-native';

import { SettingsPage } from '@/components/settings/settings-page';
import { SettingsRow } from '@/components/settings/settings-row';
import { plural, useMoneyCounts } from '@/components/settings/use-money-counts';
import { t } from '@/i18n';

export default function YourMoneyScreen() {
  const counts = useMoneyCounts();

  return (
    <SettingsPage title={t('settings.pages.yourMoney')}>
      <SettingsRow
        icon={ReceiptText}
        title={t('settings.yourMoney.bills')}
        subtitle={
          counts.bills > 0 ? plural(counts.bills, 'recurringBill') : t('settings.yourMoney.noBills')
        }
        // Every bill, including those with no charge this month; cost is on Home's Monthly bills.
        onPress={() => router.push('/bill-plans')}
      />
      <SettingsRow
        icon={Repeat}
        title={t('settings.yourMoney.subscriptions')}
        subtitle={
          counts.subscriptions > 0
            ? t('settings.yourMoney.tracked', { count: counts.subscriptions })
            : t('settings.yourMoney.noSubscriptions')
        }
        onPress={() => router.push('/subscription-plans')}
      />
      <SettingsRow
        icon={CreditCard}
        title={t('settings.yourMoney.cardsAndAccounts')}
        subtitle={`${plural(counts.cards, 'card')} · ${plural(counts.accounts, 'bankAccount')}`}
        // A tab, and this page sits above the tabs: pushing it would stack a second tab bar.
        onPress={() => router.dismissTo('/cards')}
      />
      <SettingsRow
        icon={CalendarDays}
        title={t('settings.yourMoney.payday')}
        subtitle={
          counts.salarySources > 0
            ? plural(counts.salarySources, 'salarySource')
            : counts.oneOffPays > 0
              ? plural(counts.oneOffPays, 'oneOffPay')
              : t('settings.yourMoney.notSetUp')
        }
        onPress={() => router.push('/salary')}
        last
      />
    </SettingsPage>
  );
}
