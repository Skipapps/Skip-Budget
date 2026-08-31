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
  LayoutGrid,
  Trash2,
  UserRound,
  Vibrate,
  CircleHelp,
  Compass,
  ListChecks,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { deleteAccount, signOut } from '@/api/auth';
import { authenticate, lockCapability, unavailableMessage } from '@/lib/app-lock';
import { useUpdateProfile } from '@/api/mutations';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { Screen } from '@/components/ui/screen';
import { useConfirm, useDialog } from '@/providers/dialog-provider';
import { usePreferences } from '@/providers/preferences-provider';
import { useTheme, useColors } from '@/providers/theme-provider';
import { findAvatar } from '@/theme/avatars';
import { ACCENTS, MODES } from '@/theme/palette';
import { TextField } from '@/components/ui/text-field';
import { Title } from '@/components/ui/typography';

import CoffeeMark from '@/assets/illustrations/buy-me-a-coffee.svg';
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
  const colors = useColors();
  const confirm = useConfirm();
  const ask = useDialog();
  const cards = useCards();
  const accounts = useBankAccounts();
  const salary = useSalarySources();
  const subs = useSubscriptions();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const { mode, accentId } = useTheme();
  const { haptics, setHaptics, appLock, setAppLock } = usePreferences();

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

  /**
   * Turning the lock on has to prove it works first.
   *
   * A switch that flips without a scan is a promise the app has not checked it
   * can keep — and the moment it matters is the moment somebody is locked out
   * of their own budget. Turning it off needs nothing: getting far enough to
   * tap it already meant getting past the lock.
   */
  const handleAppLock = async (next: boolean) => {
    if (!next) {
      setAppLock(false);
      return;
    }

    const capability = await lockCapability();
    if (!capability.available) {
      await ask({
        title: 'App lock is not available',
        message: unavailableMessage(capability.reason),
        cancelLabel: null,
      });
      return;
    }

    if (await authenticate(`Turn on ${capability.label} for Skip`)) setAppLock(true);
  };

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
        {/* Above the name, in the order the dashboard shows them. */}
        <SettingsRow
          icon={UserRound}
          artwork={<ProfileAvatar avatarId={profile.data?.avatar_id} size={34} />}
          title="Profile picture"
          subtitle={
            findAvatar(profile.data?.avatar_id)?.label ?? 'Pick one to show on your dashboard'
          }
          onPress={() => router.push('/avatar')}
          last
        />

        <View className="mt-4 w-full">
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
                <Check size={20} color={colors.moneyIn} strokeWidth={2.6} />
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
                className="font-poppins-medium text-[14px] text-on-control"
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
          // What it is set to, not what it does. Someone opening settings to
          // change it already knows what appearance means.
          subtitle={`${MODES.find((option) => option.id === mode)?.label ?? 'System'} · ${
            ACCENTS.find((accent) => accent.id === accentId)?.label ?? ''
          }`}
          onPress={() => router.push('/appearance')}
        />
        <SettingsRow
          icon={Vibrate}
          title="Haptics"
          subtitle="A tap when you press something"
          toggle={{ value: haptics, onChange: setHaptics }}
        />
        <SettingsRow
          icon={ScanFace}
          title="App lock"
          subtitle="Face ID before Skip opens"
          toggle={{ value: appLock, onChange: (next) => void handleAppLock(next) }}
        />
        <SettingsRow
          icon={Bell}
          title="Reminders"
          subtitle="Before a renewal, a bill or payday"
          onPress={() => router.push('/reminders')}
        />
        <SettingsRow
          icon={LayoutGrid}
          title="Dashboard tiles"
          subtitle="The order of “Where it goes”"
          onPress={() => router.push('/tiles')}
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
          onPress={() => router.push('/privacy')}
        />
        <SettingsRow
          icon={FileText}
          title="Terms of service"
          onPress={() => router.push('/terms')}
        />
        <SettingsRow
          icon={ScrollText}
          title="Version"
          value={Constants.expoConfig?.version ?? '—'}
          last
        />
      </SettingsSection>

      <SettingsSection title="Support and feedback">
        <SettingsRow
          icon={ListChecks}
          title="Getting started"
          subtitle="Put the setup steps back on Home"
          onPress={() => {
            // Clearing the dismissal is all it takes: the card derives its
            // steps live, and it still leaves on its own once all five are done.
            updateProfile.mutate({ getting_started_dismissed_at: null });
            router.push('/home');
          }}
        />
        <SettingsRow
          icon={CircleHelp}
          title="Common questions"
          subtitle="Short answers, no waiting"
          onPress={() => router.push('/faq')}
        />
        <SettingsRow
          icon={Compass}
          title="What Skip can do"
          subtitle="The six things, each a tap away"
          onPress={() => router.push('/tour')}
        />
        <SettingsRow
          icon={Mail}
          title="Email support"
          subtitle="Something is wrong or unclear"
          onPress={() => router.push('/contact?topic=support')}
        />
        <SettingsRow
          icon={Lightbulb}
          title="Share an idea"
          subtitle="What should Skip do next?"
          onPress={() => router.push('/contact?topic=idea')}
        />
        <SettingsRow
          icon={Coffee}
          // Their mark, in their colours. Tinting someone else's logo to match
          // the row would be misrepresenting it.
          artwork={<CoffeeMark width={22} height={22} />}
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
