import { router } from 'expo-router';
import { CalendarDays, CreditCard, ReceiptText, Repeat } from 'lucide-react-native';

import { SettingsPage } from '@/components/settings/settings-page';
import { SettingsRow } from '@/components/settings/settings-row';
import { plural, useMoneyCounts } from '@/components/settings/use-money-counts';

export default function YourMoneyScreen() {
  const counts = useMoneyCounts();

  return (
    <SettingsPage title="Your money">
      <SettingsRow
        icon={ReceiptText}
        title="Bills"
        subtitle={counts.bills > 0 ? plural(counts.bills, 'recurring bill') : 'None yet'}
        // Every bill, including those with no charge this month; cost is on Home's Monthly bills.
        onPress={() => router.push('/bill-plans')}
      />
      <SettingsRow
        icon={Repeat}
        title="Subscriptions"
        subtitle={counts.subscriptions > 0 ? `${counts.subscriptions} tracked` : 'None yet'}
        onPress={() => router.push('/subscription-plans')}
      />
      <SettingsRow
        icon={CreditCard}
        title="Cards and accounts"
        subtitle={`${plural(counts.cards, 'card')} · ${plural(counts.accounts, 'bank account')}`}
        // A tab, and this page sits above the tabs: pushing it would stack a second tab bar.
        onPress={() => router.dismissTo('/cards')}
      />
      <SettingsRow
        icon={CalendarDays}
        title="Payday"
        subtitle={
          counts.salarySources > 0
            ? plural(counts.salarySources, 'salary source')
            : 'Not set up yet'
        }
        onPress={() => router.push('/salary')}
        last
      />
    </SettingsPage>
  );
}
