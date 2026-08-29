import Constants from 'expo-constants';
import { openBrowserAsync } from 'expo-web-browser';
import { router } from 'expo-router';
import {
  Bell,
  CalendarDays,
  Check,
  Coffee,
  CreditCard,
  FileText,
  Lightbulb,
  LogOut,
  Mail,
  Palette,
  ReceiptText,
  Repeat,
  ScanFace,
  ScrollText,
  Shield,
  Trash2,
  Vibrate,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { deleteAccount, signOut } from '@/api/auth';
import { useUpdateProfile } from '@/api/mutations';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { Screen } from '@/components/ui/screen';
import { useConfirm, useDialog } from '@/providers/dialog-provider';
import { TextField } from '@/components/ui/text-field';
import { Title } from '@/components/ui/typography';
import { money } from '@/theme/colors';
import { useCharges } from '@/api/charges';
import {
  useBankAccounts,
  useBills,
  useCards,
  useProfile,
  useReceipts,
  useSalarySources,
  useSubscriptions,
} from '@/api/queries';

/** Straight from the subscriptions list, so the summary cannot drift. */

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export default function SettingsScreen() {
  const confirm = useConfirm();
  const ask = useDialog();
  const cards = useCards();
  const accounts = useBankAccounts();
  const salary = useSalarySources();
  const subs = useSubscriptions();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();

  const bills = useBills();
  const receipts = useReceipts();
  const charges = useCharges();

  const billCount = bills.data?.length ?? 0;
  const cardCount = cards.data?.length ?? 0;
  const accountCount = accounts.data?.length ?? 0;
  const salaryCount = salary.data?.length ?? 0;
  const trackedSubscriptions = subs.data?.length ?? 0;
  // Null until the field is touched, so the saved name shows through until
  // someone edits it. Seeding state from the query in an effect instead would
  // overwrite what they were typing the moment a refetch landed.
  const [draftName, setDraftName] = useState<string | null>(null);
  const savedName = profile.data?.display_name ?? '';
  const displayName = draftName ?? savedName;

  /** Whether what is on screen differs from what is stored. */
  const nameDirty = draftName !== null && draftName.trim() !== savedName;

  const commitName = () => {
    if (!nameDirty) return;
    updateProfile.mutate(
      { display_name: displayName.trim() || null },
      // Back to reading the saved value, so the tick means "this is what is
      // stored" rather than "this is what you typed".
      { onSuccess: () => setDraftName(null) },
    );
  };
  const [haptics, setHaptics] = useState(true);
  const [appLock, setAppLock] = useState(false);

  const noop = () => {};

  /**
   * Two dialogs, not one.
   *
   * The first counts what is about to go. "Everything" is easy to agree to;
   * "3 cards, 57 transactions" is the same fact in a form somebody can weigh.
   * The second is the point of no return. Account deletion is the only action
   * in the app that cannot be undone by any means, so it does not share the
   * single-confirm pattern used for deleting a receipt.
   */
  const handleDeleteAccount = async () => {
    const tally = [
      [cardCount, 'card'],
      [accountCount, 'bank account'],
      [billCount, 'bill'],
      [trackedSubscriptions, 'subscription'],
      [receipts.data?.length ?? 0, 'receipt'],
      [charges.data?.length ?? 0, 'recorded charge'],
      [salaryCount, 'salary source'],
    ] as const;

    const held = tally.filter(([count]) => count > 0).map(([count, word]) => plural(count, word));

    const first = await confirm({
      title: 'Delete your account?',
      message: held.length
        ? `This removes ${held.join(', ')} — everything Skip holds for you. It cannot be undone.`
        : 'This removes your account and everything Skip holds for you. It cannot be undone.',
      confirmLabel: 'Continue',
      cancelLabel: 'Keep my account',
      destructive: true,
    });
    if (!first) return;

    const second = await confirm({
      title: 'Delete everything, for good?',
      message: 'There is no way back from here, and no copy kept.',
      confirmLabel: 'Delete everything',
      cancelLabel: 'Keep my account',
      destructive: true,
    });
    if (!second) return;

    const { error } = await deleteAccount();
    if (error) {
      await ask({ title: 'Could not delete your account', message: error, cancelLabel: null });
      return;
    }
    router.replace('/welcome');
  };

  return (
    <Screen avoidKeyboard>
      <Title className="mt-2">Settings</Title>

      <SettingsSection title="Profile">
        <View className="mt-1 w-full">
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDraftName}
            onSubmitEditing={commitName}
            placeholder="Your name"
            autoCapitalize="words"
            returnKeyType="done"
            // A tick only once it is stored. Saving on blur alone left people
            // with no way to tell whether their name had been kept.
            trailing={
              !nameDirty && savedName ? (
                <Check size={20} color={money.in} strokeWidth={2.6} />
              ) : null
            }
          />

          {nameDirty ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save your display name"
              onPress={commitName}
              disabled={updateProfile.isPending}
              className="mt-3 self-end rounded-full bg-control px-5 py-2.5 active:opacity-80"
            >
              <Text
                className="font-poppins-medium text-[14px] text-white"
                maxFontSizeMultiplier={1.2}
              >
                {updateProfile.isPending ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          ) : null}
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
          icon={ReceiptText}
          title="Bills"
          subtitle={billCount > 0 ? plural(billCount, 'recurring bill') : 'None yet'}
          onPress={() => router.push('/bills')}
        />
        <SettingsRow
          icon={Repeat}
          title="Subscriptions"
          subtitle={trackedSubscriptions > 0 ? plural(trackedSubscriptions, 'tracked') : 'None yet'}
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
          title="Buy a coffee for team"
          subtitle="Keep Skip brewing"
          onPress={() => openBrowserAsync('https://buymeacoffee.com/Weknd_team')}
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
