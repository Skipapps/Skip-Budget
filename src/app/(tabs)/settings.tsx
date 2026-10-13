import { router, type Href } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import {
  Check,
  ChevronRight,
  Coffee,
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
import { Linking, Pressable, Text, View } from 'react-native';

import { deleteAccount, signOut } from '@/api/auth';
import { resetTo } from '@/lib/nav';
import { usePro, useProPrices } from '@/api/pro';
import { resetExitOfferForDev } from '@/api/pro-offer';
import { t } from '@/i18n';
import { failureMessage } from '@/lib/failure';
import { proMonthlyLabel, proYearlyLabel } from '@/lib/wall';
import { setProOverride, useProOverride } from '@/lib/pro-bypass';
import { useUpdateProfile } from '@/api/mutations';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { SamMark } from '@/components/ask-sam/sam-mark';
import { CoffeeMark } from '@/components/settings/coffee-mark';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { plural, useMoneyCounts, type Counted } from '@/components/settings/use-money-counts';
import { Screen } from '@/components/ui/screen';
import { useConfirm, useDialog } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';
import { useColors } from '@/providers/theme-provider';
import { findAvatar } from '@/theme/avatars';
import { TEXT_CAP } from '@/theme/text-scale';
import { withTap } from '@/lib/press';
import { TextField } from '@/components/ui/text-field';

import { useCharges } from '@/api/charges';
import { useProfile, useReceipts } from '@/api/queries';

/** The voluntary tip page, opened in the in-app browser. */
const COFFEE_URL = 'https://buymeacoffee.com/Weknd_team';

/** Apple's own list of the person's subscriptions, where Skip Pro is cancelled. */
const APP_STORE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

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
  const [offerReset, setOfferReset] = useState<string | null>(null);
  const updateProfile = useUpdateProfile();
  const toast = useToast();

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
      {
        onSuccess: () => {
          setDraftName(null);
          toast('toast.profile.updated');
        },
      },
    );
  };

  /**
   * Two dialogs: the first counts what is about to go ("3 cards, 57 transactions" can be weighed),
   * the second is the point of no return. Account deletion cannot be undone, so it does not use the
   * single-confirm pattern.
   *
   * A subscriber is asked about Skip Pro first, because deleting the account does not stop Apple's
   * billing. `pro` is true only once a source has said yes, so an unknown answer goes straight on,
   * as a free account does. The App Store choice ends this attempt without deleting anything.
   */
  const handleDeleteAccount = async () => {
    if (pro) {
      const choice = await ask({
        title: t('settings.delete.proTitle'),
        message: t('settings.delete.proMessage'),
        actions: [
          { id: 'manage', label: t('pro.page.manage') },
          { id: 'continue', label: t('settings.delete.proContinue') },
        ],
        cancelLabel: t('settings.delete.keep'),
      });
      if (choice === 'manage') {
        try {
          await Linking.openURL(APP_STORE_SUBSCRIPTIONS_URL);
        } catch (thrown) {
          await ask({ title: failureMessage(thrown), cancelLabel: null });
        }
        return;
      }
      if (choice !== 'continue') return;
    }

    const tally: [number, Counted][] = [
      [counts.cards, 'card'],
      [counts.accounts, 'bankAccount'],
      [counts.bills, 'bill'],
      [counts.subscriptions, 'subscription'],
      [receipts.data?.length ?? 0, 'receipt'],
      [charges.data?.length ?? 0, 'recordedCharge'],
      [counts.salarySources, 'salarySource'],
      [counts.oneOffPays, 'oneOffPay'],
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
          />
          {/* The offer is once per account on the server, so trying it again needs the flag cleared. */}
          <SettingsRow
            icon={FlaskConical}
            title="Show the one-time offer again"
            subtitle={offerReset ?? 'Leave the Pro page without buying to see it'}
            onPress={() => {
              void resetExitOfferForDev().then((done) =>
                setOfferReset(
                  done ? 'Done — it opens next time you leave the Pro page' : 'Could not reset',
                ),
              );
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
        {PAGES.map((page) => (
          <SettingsRow
            key={page.title}
            icon={page.icon}
            title={page.title}
            onPress={() => router.push(page.href)}
          />
        ))}
        <SettingsRow
          icon={Coffee}
          // Their mark in their colours; tinting someone else's logo would misrepresent it.
          artwork={<CoffeeMark width={22} height={22} />}
          title={t('support.coffee')}
          subtitle={t('support.coffeeDetail')}
          onPress={() => openBrowserAsync(COFFEE_URL)}
          last
        />
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

      <AskSamButton />

      <View className="h-24 w-full" />
    </Screen>
  );
}

/** The way into Ask Sam, the help chat, set apart from the rows above as a button of its own. */
function AskSamButton() {
  const colors = useColors();
  const title = t('askSam.settings.title');
  const subtitle = t('askSam.settings.subtitle');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={withTap(() => router.push('/ask-sam'))}
      className="mt-8 w-full flex-row items-center gap-3 rounded-[18px] border border-line bg-card px-4 py-3.5 active:opacity-70"
    >
      <SamMark size={40} />
      <View className="min-w-0 flex-1">
        <Text
          className="font-app-semibold text-[16px] leading-[21px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {title}
        </Text>
        <Text
          className="mt-0.5 font-app text-[13px] leading-[18px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}
