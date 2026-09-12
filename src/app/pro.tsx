import {
  Camera,
  Calculator,
  ChartColumn,
  Check,
  CreditCard,
  Crown,
  Palette,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { usePro, useProPrices, usePurchasePro, purchasesAvailable } from '@/api/pro';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Title } from '@/components/ui/typography';
import { PRO_MONTHLY_LABEL, PRO_YEARLY_LABEL } from '@/lib/wall';
import { router } from 'expo-router';
import { useColors } from '@/providers/theme-provider';

const FEATURES: { icon: LucideIcon; title: string; hint: string }[] = [
  {
    icon: CreditCard,
    title: 'Unlimited cards, accounts & incomes',
    hint: 'Track every card and account you actually have',
  },
  {
    icon: Camera,
    title: 'Unlimited receipt scanning',
    hint: 'Point, tap, filed — read on your phone, never uploaded',
  },
  {
    icon: Calculator,
    title: 'Loan calculator, to the cent',
    hint: 'Daily interest, the way your bank actually charges',
  },
  {
    icon: Users,
    title: 'Split manager',
    hint: 'Groups, friends, who-owes-who — settled without an app in the middle',
  },
  { icon: ChartColumn, title: 'Insights', hint: 'Your whole money picture on one page' },
  {
    icon: Palette,
    title: 'Themes, early features, first-in-line support',
    hint: 'Make Skip yours, and get the new things first',
  },
];

/**
 * The Pro page: six loaded rows before any price, yearly first and badged,
 * one Continue. Feature list is the hero — the eye counts what it gets before
 * it reads what it costs.
 *
 * With no store key configured it still renders everything and says purchases
 * are opening soon, because a page that crashes without its billing SDK would
 * fail the exact stability promise the wall was built on.
 */
export default function ProScreen() {
  const colors = useColors();
  const { pro } = usePro();
  const prices = useProPrices();
  const { purchase, restore } = usePurchasePro();

  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canBuy = purchasesAvailable() && Boolean(prices.data?.yearly || prices.data?.monthly);

  /**
   * What to say when there is nothing to buy, in the user's terms.
   *
   * Three different causes — no billing in this build, a store we could not
   * reach, a store with no products yet — and each one has a different thing
   * for the reader to do about it. The store's own error text is none of
   * those, so it does not appear here.
   */
  const storeNote = !purchasesAvailable()
    ? 'Purchases are not open in this version yet. Everything on this page is coming shortly.'
    : !canBuy && prices.isFetched
      ? prices.error
        ? 'We could not reach the App Store. Check your connection and tap Check again.'
        : 'The App Store returned no plans for this app yet. Freshly readied products can take a few hours to reach the sandbox — check again shortly.'
      : null;

  const devNote = prices.error ? (prices.error as Error).message : (prices.data?.debug ?? null);
  const yearlyPrice = prices.data?.yearly?.product.priceString ?? PRO_YEARLY_LABEL;
  const monthlyPrice = prices.data?.monthly?.product.priceString ?? PRO_MONTHLY_LABEL;
  const trial = prices.data?.trialText ?? null;

  const handleContinue = async () => {
    const pack = plan === 'yearly' ? prices.data?.yearly : prices.data?.monthly;
    if (!pack) return;
    setMessage(null);
    setBusy(true);
    try {
      const result = await purchase(pack);
      if (result === 'done') router.back();
    } catch (thrown) {
      setMessage((thrown as Error).message ?? 'The purchase did not go through.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const restored = await restore();
      setMessage(restored ? 'Welcome back — Pro is active.' : 'No past purchase to restore.');
    } catch (thrown) {
      setMessage((thrown as Error).message ?? 'Could not check past purchases.');
    } finally {
      setBusy(false);
    }
  };

  // Already paying: status, not a sell.
  if (pro) {
    return (
      <Screen showBack>
        <View className="mt-8 w-full items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Crown size={28} color={colors.onControl} strokeWidth={2} />
          </View>
          <Title flush className="mt-5">
            You have Skip Pro
          </Title>
          <Text
            className="mt-3 max-w-[300px] text-center font-poppins text-[14px] leading-[21px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            Everything is unlocked. Billing is handled by Apple — renewals, changes and cancellation
            all live in your App Store subscriptions.
          </Text>
        </View>
        <View className="mb-8 mt-auto w-full gap-3 pt-10">
          <Button
            label="Manage in the App Store"
            variant="outline"
            onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen showBack>
      <Title align="left">Skip Pro</Title>
      <Text className="mt-2 w-full font-poppins text-[14px] text-muted" maxFontSizeMultiplier={1.4}>
        Everything Skip can do, for less than a coffee a month.
      </Text>

      <View className="mt-6 w-full gap-2.5">
        {FEATURES.map((feature) => (
          <View
            key={feature.title}
            className="w-full flex-row items-center gap-3 rounded-[16px] border border-line bg-card px-4 py-3"
          >
            {/* A tonal well rather than an emoji: six different emoji fonts in
                a column read as six different weights, and none of them take
                the theme. */}
            <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-ink/5">
              <feature.icon size={20} color={colors.body} strokeWidth={1.8} />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className="font-poppins-semibold text-[13.5px] text-ink"
                maxFontSizeMultiplier={1.3}
              >
                {feature.title}
              </Text>
              <Text
                className="mt-0.5 font-poppins text-[11.5px] leading-[16px] text-muted"
                maxFontSizeMultiplier={1.3}
              >
                {feature.hint}
              </Text>
            </View>
            <Check size={18} color={colors.accentInk} strokeWidth={2} />
          </View>
        ))}
      </View>

      {/* Yearly leads, pre-selected: $19.99 against $23.88 of months is
          honestly two months free, and the per-month line shrinks the anchor. */}
      <View className="mt-6 w-full gap-2.5">
        <PriceCard
          selected={plan === 'yearly'}
          onPress={() => setPlan('yearly')}
          name="Yearly"
          price={`${yearlyPrice}/yr`}
          hint={trial ? `${trial}, then billed once a year` : '$1.67 a month, billed once a year'}
          badge="2 MONTHS FREE"
        />
        <PriceCard
          selected={plan === 'monthly'}
          onPress={() => setPlan('monthly')}
          name="Monthly"
          price={`${monthlyPrice}/mo`}
          hint={trial ? `${trial}, then monthly` : 'Cancel any time in your Apple subscriptions'}
        />
      </View>

      {message ? (
        <Text
          className="mt-4 w-full text-center font-poppins text-[13px] text-ink"
          maxFontSizeMultiplier={1.4}
        >
          {message}
        </Text>
      ) : null}

      {/* When the store gives nothing, say why — a mute disabled button turns
          every cause into the same mystery. What it never says is what the
          store literally said: a RevenueCat exception is not a sentence anyone
          can act on, and it is not what a paying customer should be reading. */}
      {storeNote ? (
        <Text
          className="mt-4 w-full text-center font-poppins text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {storeNote}
        </Text>
      ) : null}

      {/* The raw store reason, kept for whoever is wiring billing, and only
          ever on a development build. */}
      {__DEV__ && devNote ? (
        <Text
          className="mt-2 w-full text-center font-poppins text-[10px] leading-[14px] text-muted"
          maxFontSizeMultiplier={1.2}
        >
          {devNote}
        </Text>
      ) : null}

      <View className="mb-6 mt-6 w-full gap-2">
        <Button
          label={
            busy
              ? 'One moment…'
              : canBuy
                ? trial
                  ? `Start ${trial}`
                  : 'Continue'
                : prices.isFetching
                  ? 'Checking the store…'
                  : 'Check again'
          }
          onPress={canBuy ? handleContinue : () => void prices.refetch()}
          disabled={busy || prices.isFetching}
        />
        {/* Text links, never pills: a pill next to the purchase button reads
            as a second thing to buy. Restore keeps its own tap target — the
            App Store expects it to be findable without hunting. */}
        <View className="w-full flex-row flex-wrap items-center justify-center gap-5">
          <TextLink label="Restore purchases" variant="subtle" onPress={handleRestore} />
          <TextLink
            label="Terms"
            variant="subtle"
            underline
            onPress={() => router.push('/terms')}
          />
          <TextLink
            label="Privacy"
            variant="subtle"
            underline
            onPress={() => router.push('/privacy')}
          />
        </View>
        <Text
          className="mt-1 w-full text-center font-poppins text-[10.5px] leading-[15px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          Billed by Apple. Renews automatically until cancelled in your App Store subscriptions.
          Cancel any time — everything you made stays yours.
        </Text>
      </View>
    </Screen>
  );
}

function PriceCard({
  selected,
  onPress,
  name,
  price,
  hint,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  name: string;
  price: string;
  hint: string;
  badge?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${price}. ${hint}`}
      onPress={onPress}
      className={
        selected
          ? 'w-full rounded-[16px] border-2 border-control bg-card px-4 py-3.5'
          : 'w-full rounded-[16px] border border-line bg-card px-4 py-3.5 active:bg-ink/5'
      }
    >
      {badge ? (
        <View className="absolute -top-2.5 right-3 rounded-full bg-accent px-2.5 py-0.5">
          <Text
            allowFontScaling={false}
            className="font-poppins-bold text-[9px] tracking-wide text-on-control"
          >
            {badge}
          </Text>
        </View>
      ) : null}
      <View className="w-full flex-row items-baseline justify-between gap-3">
        <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          {name}
        </Text>
        <Text className="font-poppins-bold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          {price}
        </Text>
      </View>
      <Text className="mt-0.5 font-poppins text-[11.5px] text-muted" maxFontSizeMultiplier={1.3}>
        {hint}
      </Text>
    </Pressable>
  );
}
