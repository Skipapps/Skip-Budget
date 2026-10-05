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
  FlaskConical,
  Lightbulb,
  LogOut,
  Mail,
  ReceiptText,
  Repeat,
  ScanFace,
  ScrollText,
  Shield,
  SunMoon,
  Trash2,
  UserRound,
  Vibrate,
  CircleHelp,
  Compass,
  ListChecks,
  Crown,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { deleteAccount, signOut } from '@/api/auth';
import { resetTo } from '@/lib/nav';
import { usePro } from '@/api/pro';
import { authenticate, lockCapability, unavailableMessage } from '@/lib/app-lock';
import { setProOverride, useProOverride } from '@/lib/pro-bypass';
import { useUpdateProfile } from '@/api/mutations';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { Screen } from '@/components/ui/screen';
import { useConfirm, useDialog } from '@/providers/dialog-provider';
import { usePreferences } from '@/providers/preferences-provider';
import { useColors, useTheme } from '@/providers/theme-provider';
import { findAvatar } from '@/theme/avatars';
import type { ModeKey } from '@/theme/palette';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { TextField } from '@/components/ui/text-field';

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

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const MODE_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

const MODE_CAPTIONS: Record<ModeKey, string> = {
  light: 'Always light',
  dark: 'Always dark',
  system: 'Follows your phone',
};

export default function SettingsScreen() {
  const colors = useColors();
  const confirm = useConfirm();
  const ask = useDialog();
  const cards = useCards();
  const accounts = useBankAccounts();
  const salary = useSalarySources();
  const subs = useSubscriptions();
  const profile = useProfile();
  const { pro } = usePro();
  const proOverride = useProOverride();
  const updateProfile = useUpdateProfile();
  const { mode, setMode } = useTheme();
  const { haptics, setHaptics, appLock, setAppLock } = usePreferences();

  const bills = useBills();
  const receipts = useReceipts();
  const charges = useCharges();

  const billCount = bills.data?.length ?? 0;
  const cardCount = cards.data?.length ?? 0;
  const accountCount = accounts.data?.length ?? 0;
  const salaryCount = salary.data?.length ?? 0;
  const trackedSubscriptions = subs.data?.length ?? 0;
  // Null until the field is touched, so the saved name shows through. Seeding state from the query
  // in an effect would overwrite what someone is typing when a refetch lands.
  const [draftName, setDraftName] = useState<string | null>(null);
  const savedName = profile.data?.display_name ?? '';
  const displayName = draftName ?? savedName;

  const nameDirty = draftName !== null && draftName.trim() !== savedName;

  const commitName = () => {
    if (!nameDirty) return;
    updateProfile.mutate(
      { display_name: displayName.trim() || null },
      // Back to the saved value, so the tick means "stored", not "typed".
      { onSuccess: () => setDraftName(null) },
    );
  };

  /**
   * Turning the lock on must pass a scan first, or a broken lock could shut someone out of their
   * own budget. Turning it off needs nothing: reaching the switch meant passing the lock.
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
   * Two dialogs: the first counts what is about to go ("3 cards, 57 transactions" can be weighed),
   * the second is the point of no return. Account deletion cannot be undone, so it does not use the
   * single-confirm pattern.
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
      await ask({ title: error, cancelLabel: null });
      return;
    }
    resetTo('/welcome');
  };

  return (
    <Screen title="Settings" avoidKeyboard>
      <SettingsSection title="Skip Pro">
        <SettingsRow
          icon={Crown}
          title={pro ? 'Skip Pro — active' : 'Skip Pro'}
          subtitle={
            pro
              ? 'Everything unlocked · manage in the App Store'
              : 'Unlimited everything, $1.99/mo or $19.99/yr'
          }
          onPress={() => router.push('/pro')}
          last
        />
      </SettingsSection>

      {/* Development builds only: `__DEV__` is false in every Release bundle. */}
      {__DEV__ ? (
        <SettingsSection title="Developer">
          <SettingsRow
            icon={FlaskConical}
            title="Fake Pro"
            subtitle={
              proOverride === 'pro'
                ? 'On — Pro screens unlocked, nothing purchased'
                : 'Unlock Pro screens for testing, without buying'
            }
            toggle={{
              value: proOverride === 'pro',
              onChange: (on) => setProOverride(on ? 'pro' : 'off'),
            }}
          />
          {/* For a device a sandbox purchase has made Pro: RevenueCat cannot be switched off
              in-app, and the free and lapsed experiences still need testing. */}
          <SettingsRow
            icon={FlaskConical}
            title="Fake Free"
            subtitle={
              proOverride === 'free'
                ? 'On — drawing this account as free, whatever the store says'
                : 'See the free experience, even with an entitlement active'
            }
            toggle={{
              value: proOverride === 'free',
              onChange: (on) => setProOverride(on ? 'free' : 'off'),
            }}
            last
          />
        </SettingsSection>
      ) : null}

      <SettingsSection title="Profile">
        <SettingsRow
          icon={UserRound}
          artwork={<ProfileAvatar avatarId={profile.data?.avatar_id} size={34} />}
          title="Profile picture"
          subtitle={
            findAvatar(profile.data?.avatar_id)
              ? 'Tap to change'
              : 'Pick one to show on your dashboard'
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
              hitSlop={{ top: 4, bottom: 4 }}
              className="mt-3 min-h-10 items-center justify-center self-end rounded-full bg-control px-4 active:bg-control-pressed"
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

      <SettingsSection title="Preferences">
        <SettingsRow icon={SunMoon} title="Appearance" subtitle={MODE_CAPTIONS[mode]}>
          <ChoiceChips options={MODE_OPTIONS} value={mode} onChange={setMode} />
        </SettingsRow>
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
          last
        />
      </SettingsSection>

      <SettingsSection title="Your money">
        <SettingsRow
          icon={ReceiptText}
          title="Bills"
          subtitle={billCount > 0 ? plural(billCount, 'recurring bill') : 'None yet'}
          // Every bill, including those with no charge this month; cost is on Home's Monthly bills.
          onPress={() => router.push('/bill-plans')}
        />
        <SettingsRow
          icon={Repeat}
          title="Subscriptions"
          subtitle={trackedSubscriptions > 0 ? `${trackedSubscriptions} tracked` : 'None yet'}
          onPress={() => router.push('/subscription-plans')}
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
            // Clearing the dismissal is enough: the card derives its steps live.
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
          // Their mark in their colours; tinting someone else's logo would misrepresent it.
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
            resetTo('/welcome');
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
