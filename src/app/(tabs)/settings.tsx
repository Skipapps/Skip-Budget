import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  Bell,
  CalendarDays,
  Coffee,
  CreditCard,
  DollarSign,
  FileText,
  Lightbulb,
  LogOut,
  Mail,
  Palette,
  Repeat,
  ScanFace,
  ScrollText,
  Shield,
  Trash2,
  Vibrate,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { deleteAccount, signOut } from '@/api/auth';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Title } from '@/components/ui/typography';
import { useBankAccounts, useCards, useSalarySources, useSubscriptions } from '@/api/queries';

/** Straight from the subscriptions list, so the summary cannot drift. */

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export default function SettingsScreen() {
  const cards = useCards();
  const accounts = useBankAccounts();
  const salary = useSalarySources();
  const subs = useSubscriptions();

  const cardCount = cards.data?.length ?? 0;
  const accountCount = accounts.data?.length ?? 0;
  const salaryCount = salary.data?.length ?? 0;
  const trackedSubscriptions = subs.data?.length ?? 0;
  const [displayName, setDisplayName] = useState('');
  const [haptics, setHaptics] = useState(true);
  const [appLock, setAppLock] = useState(false);

  const noop = () => {};

  /**
   * Two taps, not one. The first spells out exactly what disappears; the
   * second is the point of no return. Account deletion is the only action in
   * the app that cannot be undone by any means, so it does not share the
   * single-confirm pattern used for deleting a receipt.
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'Your cards, accounts, bills, subscriptions, receipts and scanned images are all deleted. This cannot be undone and there is no way to recover them.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('This is permanent', 'Delete everything and sign out?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete everything',
                style: 'destructive',
                onPress: async () => {
                  const { error } = await deleteAccount();
                  if (error) {
                    Alert.alert('Could not delete your account', error);
                    return;
                  }
                  router.replace('/welcome');
                },
              },
            ]),
        },
      ],
    );
  };

  return (
    <Screen avoidKeyboard>
      <Title className="mt-2">Settings</Title>

      <SettingsSection title="Profile">
        <View className="mt-1 w-full">
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Preference">
        <SettingsRow
          icon={Palette}
          title="Appearance"
          subtitle="Follows your phone"
          onPress={noop}
        />
        <SettingsRow
          icon={Vibrate}
          title="Haptics"
          subtitle="Vibration on taps and switches"
          toggle={{ value: haptics, onChange: setHaptics }}
        />
        <SettingsRow
          icon={ScanFace}
          title="App lock"
          subtitle="Face ID before Skip opens"
          toggle={{ value: appLock, onChange: setAppLock }}
        />
        <SettingsRow
          icon={Bell}
          title="Reminders"
          subtitle="Before a renewal, a bill or payday"
          onPress={noop}
          last
        />
      </SettingsSection>

      <SettingsSection title="Your money">
        <SettingsRow
          icon={DollarSign}
          title="Currency"
          subtitle="US dollar (USD) · More currencies coming"
        />
        <SettingsRow
          icon={Repeat}
          title="Subscriptions"
          subtitle={`${trackedSubscriptions} tracked`}
          onPress={() => router.push('/subscriptions')}
        />
        <SettingsRow
          icon={CreditCard}
          title="Cards and accounts"
          subtitle={`${plural(cardCount, 'card')} · ${plural(accountCount, 'bank account')}`}
          onPress={() => router.push('/cards')}
        />
        <SettingsRow
          icon={CalendarDays}
          title="Payday"
          subtitle={salaryCount > 0 ? plural(salaryCount, 'salary source') : 'Not set up yet'}
          onPress={() => router.push('/salary')}
          last
        />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsRow
          icon={Shield}
          title="Privacy policy"
          subtitle="What is stored, and who else can see it"
          onPress={noop}
        />
        <SettingsRow icon={FileText} title="Terms of service" onPress={noop} />
        <SettingsRow
          icon={ScrollText}
          title="Version"
          value={Constants.expoConfig?.version ?? '—'}
          last
        />
      </SettingsSection>

      <SettingsSection title="Support and feedback">
        <SettingsRow
          icon={Mail}
          title="Email support"
          subtitle="Something is wrong or unclear"
          onPress={noop}
        />
        <SettingsRow
          icon={Lightbulb}
          title="Share an idea"
          subtitle="What should Skip do next?"
          onPress={noop}
        />
        <SettingsRow
          icon={Coffee}
          title="Buy me a coffee"
          subtitle="Keep Skip brewing"
          onPress={noop}
          last
        />
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsRow
          icon={LogOut}
          title="Sign out"
          onPress={async () => {
            await signOut();
            router.replace('/welcome');
          }}
        />
        <SettingsRow
          icon={Trash2}
          title="Delete account"
          subtitle="Permanent, and it cannot be undone"
          destructive
          onPress={handleDeleteAccount}
          last
        />
      </SettingsSection>

      <View className="h-24 w-full" />
    </Screen>
  );
}
