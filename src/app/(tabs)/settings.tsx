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
import { View } from 'react-native';

import { signOut } from '@/api/auth';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Title } from '@/components/ui/typography';
import { accounts } from '@/data/accounts-mock';
import { cards } from '@/data/cards-mock';
import { salarySources } from '@/data/salary-mock';
import { subscriptions } from '@/data/subscriptions-mock';

/** Straight from the subscriptions list, so the summary cannot drift. */
const trackedSubscriptions = subscriptions.length;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export default function SettingsScreen() {
  const [displayName, setDisplayName] = useState('');
  const [haptics, setHaptics] = useState(true);
  const [appLock, setAppLock] = useState(false);

  const noop = () => {};

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
          subtitle={`${plural(cards.length, 'card')} · ${plural(accounts.length, 'bank account')}`}
          onPress={() => router.push('/cards')}
        />
        <SettingsRow
          icon={CalendarDays}
          title="Payday"
          subtitle={
            salarySources.length > 0
              ? plural(salarySources.length, 'salary source')
              : 'Not set up yet'
          }
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
          onPress={noop}
          last
        />
      </SettingsSection>

      <View className="h-24 w-full" />
    </Screen>
  );
}
