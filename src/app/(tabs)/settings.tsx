import { router, type Href } from 'expo-router';
import {
  Check,
  Crown,
  FlaskConical,
  Info,
  LifeBuoy,
  LogOut,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { deleteAccount, signOut } from '@/api/auth';
import { resetTo } from '@/lib/nav';
import { usePro, useProPrices } from '@/api/pro';
import { t } from '@/i18n';
import { proMonthlyLabel, proYearlyLabel } from '@/lib/wall';
import { setProOverride, useProOverride } from '@/lib/pro-bypass';
import { useUpdateProfile } from '@/api/mutations';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { plural, useMoneyCounts, type Counted } from '@/components/settings/use-money-counts';
import { Screen } from '@/components/ui/screen';
import { useConfirm, useDialog } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';
import { findAvatar } from '@/theme/avatars';
import { TextField } from '@/components/ui/text-field';

import { useCharges } from '@/api/charges';
import { useProfile, useReceipts } from '@/api/queries';

/** Each opens a page of its own, so the rows carry no summary line. */
const PAGES: { readonly title: string; icon: LucideIcon; href: Href }[] = [
  {
    get title() {
      return t('settings.pages.preferences');
    },
    icon: SlidersHorizontal,
    href: '/settings/preferences',
  },
  {
    get title() {
      return t('settings.pages.yourMoney');
    },
    icon: Wallet,
    href: '/settings/your-money',
  },
  {
    get title() {
      return t('settings.pages.about');
    },
    icon: Info,
    href: '/settings/about',
  },
  {
    get title() {
      return t('settings.pages.support');
    },
    icon: LifeBuoy,
    href: '/settings/support',
  },
];

export default function SettingsScreen() {
  const colors = useColors();
  const confirm = useConfirm();
  const ask = useDialog();
  const counts = useMoneyCounts();
  const profile = useProfile();
  const { pro } = usePro();
  const prices = useProPrices();
  const proOverride = useProOverride();
  const updateProfile = useUpdateProfile();

  const receipts = useReceipts();
  const charges = useCharges();

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
   * Two dialogs: the first counts what is about to go ("3 cards, 57 transactions" can be weighed),
   * the second is the point of no return. Account deletion cannot be undone, so it does not use the
   * single-confirm pattern.
   */
  const handleDeleteAccount = async () => {
    const tally: [number, Counted][] = [
      [counts.cards, 'card'],
      [counts.accounts, 'bankAccount'],
      [counts.bills, 'bill'],
      [counts.subscriptions, 'subscription'],
      [receipts.data?.length ?? 0, 'receipt'],
      [charges.data?.length ?? 0, 'recordedCharge'],
      [counts.salarySources, 'salarySource'],
    ];

    const held = tally.filter(([count]) => count > 0).map(([count, thing]) => plural(count, thing));

    const first = await confirm({
      title: t('settings.delete.title'),
      message: held.length
        ? t('settings.delete.held', { held: held.join(', ') })
        : t('settings.delete.nothingHeld'),
      confirmLabel: t('common.continue'),
      cancelLabel: t('settings.delete.keep'),
      destructive: true,
    });
    if (!first) return;

    const second = await confirm({
      title: t('settings.delete.finalTitle'),
      message: t('settings.delete.finalMessage'),
      confirmLabel: t('settings.delete.everything'),
      cancelLabel: t('settings.delete.keep'),
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

  // The store's own prices for this storefront; the US dollar fallback only until it answers.
  const monthly = prices.data?.monthly
    ? t('pro.price.monthly', { price: prices.data.monthly.product.priceString })
    : proMonthlyLabel();
  const yearly = prices.data?.yearly
    ? t('pro.price.yearly', { price: prices.data.yearly.product.priceString })
    : proYearlyLabel();

  return (
    <Screen title={t('settings.title')} avoidKeyboard>
      <SettingsSection title="Skip Pro">
        <SettingsRow
          icon={Crown}
          title={pro ? t('settings.pro.active') : 'Skip Pro'}
          subtitle={
            pro ? t('settings.pro.activeDetail') : t('settings.pro.pitch', { monthly, yearly })
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

      <SettingsSection title={t('settings.profile.title')}>
        <SettingsRow
          icon={UserRound}
          artwork={<ProfileAvatar avatarId={profile.data?.avatar_id} size={34} />}
          title={t('settings.profile.picture')}
          subtitle={
            findAvatar(profile.data?.avatar_id)
              ? t('settings.profile.tapToChange')
              : t('settings.profile.pickOne')
          }
          onPress={() => router.push('/avatar')}
          last
        />

        <View className="mt-4 w-full">
          <TextField
            label={t('settings.profile.displayName')}
            value={displayName}
            onChangeText={setDraftName}
            onSubmitEditing={commitName}
            placeholder={t('settings.profile.namePlaceholder')}
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
              accessibilityLabel={t('settings.profile.saveName')}
              onPress={commitName}
              disabled={updateProfile.isPending}
              hitSlop={{ top: 4, bottom: 4 }}
              className="mt-3 min-h-10 items-center justify-center self-end rounded-full bg-control px-4 active:bg-control-pressed"
            >
              <Text
                className="font-app-medium text-[14px] text-on-control"
                maxFontSizeMultiplier={1.2}
              >
                {updateProfile.isPending ? t('settings.saving') : t('common.save')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SettingsSection>

      <SettingsSection>
        {PAGES.map((page, index) => (
          <SettingsRow
            key={page.title}
            icon={page.icon}
            title={page.title}
            onPress={() => router.push(page.href)}
            last={index === PAGES.length - 1}
          />
        ))}
      </SettingsSection>

      <SettingsSection title={t('settings.account.title')}>
        <SettingsRow
          icon={LogOut}
          title={t('settings.account.signOut')}
          onPress={async () => {
            await signOut();
            resetTo('/welcome');
          }}
        />
        <SettingsRow
          icon={Trash2}
          title={t('settings.account.delete')}
          subtitle={t('settings.account.deleteDetail')}
          destructive
          onPress={handleDeleteAccount}
          last
        />
      </SettingsSection>

      <View className="h-24 w-full" />
    </Screen>
  );
}
