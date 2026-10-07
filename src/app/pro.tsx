import {
  Camera,
  Calculator,
  ChartColumn,
  Check,
  CreditCard,
  Crown,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { usePro, useProPrices, usePurchasePro, purchasesAvailable } from '@/api/pro';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Title } from '@/components/ui/typography';
import { t, type MessageKey } from '@/i18n';
import { proMonthlyLabel, proYearlyLabel, usdText } from '@/lib/wall';
import { router } from 'expo-router';
import { useColors } from '@/providers/theme-provider';
import { failureMessage, failureText } from '@/lib/failure';

const FEATURES: { icon: LucideIcon; title: MessageKey; hint: MessageKey }[] = [
  { icon: CreditCard, title: 'pro.page.cards.title', hint: 'pro.page.cards.hint' },
  { icon: Camera, title: 'pro.page.scan.title', hint: 'pro.page.scan.hint' },
  { icon: Calculator, title: 'pro.page.loans.title', hint: 'pro.page.loans.hint' },
  { icon: ChartColumn, title: 'pro.page.insights.title', hint: 'pro.page.insights.hint' },
  { icon: Sparkles, title: 'pro.page.early.title', hint: 'pro.page.early.hint' },
];

/**
 * The yearly price over twelve months ($19.99 / 12), for when the store has not answered. In
 * dollars whatever the app shows, like the fallback prices in wall.ts: Apple prices each
 * storefront itself, so no other currency's figure would be a real price.
 */
const PRO_YEARLY_PER_MONTH_USD = 1.67;

/**
 * The Pro page. With no store key configured it still renders and says purchases are opening soon,
 * so a missing billing SDK never crashes it.
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

  // No billing in this build says so; a store that is unreachable or returns no plans is a failure.
  const storeNote = !purchasesAvailable()
    ? t('pro.page.notOpen')
    : !canBuy && prices.isFetched
      ? failureText()
      : null;

  const devNote = prices.error ? (prices.error as Error).message : (prices.data?.debug ?? null);
  // The store's own prices when it has answered; the dollar fallbacks until then.
  const yearly = prices.data?.yearly?.product;
  const monthly = prices.data?.monthly?.product;
  const yearlyPrice = yearly
    ? t('pro.price.yearly', { price: yearly.priceString })
    : proYearlyLabel();
  const monthlyPrice = monthly
    ? t('pro.price.monthly', { price: monthly.priceString })
    : proMonthlyLabel();
  const yearlyPerMonth = yearly?.pricePerMonthString ?? usdText(PRO_YEARLY_PER_MONTH_USD);
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
      setMessage(failureMessage(thrown));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const restored = await restore();
      setMessage(t(restored ? 'pro.page.restored' : 'pro.page.nothingToRestore'));
    } catch (thrown) {
      setMessage(failureMessage(thrown));
    } finally {
      setBusy(false);
    }
  };

  if (pro) {
    return (
      <Screen title="Skip Pro" showBack>
        <View className="mt-8 w-full items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Crown size={28} color={colors.onControl} strokeWidth={2} />
          </View>
          <Title flush className="mt-5">
            {t('pro.page.haveTitle')}
          </Title>
          <Text
            className="mt-3 max-w-[300px] text-center font-app text-[14px] leading-[21px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            {t('pro.page.haveDetail')}
          </Text>
        </View>
        <View className="mb-8 mt-auto w-full gap-3 pt-10">
          <Button
            label={t('pro.page.manage')}
            variant="outline"
            onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Skip Pro" showBack>
      <Text className="mt-2 w-full font-app text-[14px] text-muted" maxFontSizeMultiplier={1.4}>
        {t('pro.page.tagline')}
      </Text>

      <View className="mt-6 w-full gap-2.5">
        {FEATURES.map((feature) => (
          <View
            key={feature.title}
            className="w-full flex-row items-center gap-3 rounded-[16px] border border-line bg-card px-4 py-3"
          >
            <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-ink/5">
              <feature.icon size={20} color={colors.body} strokeWidth={1.8} />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className="font-app-semibold text-[13.5px] text-ink"
                maxFontSizeMultiplier={1.3}
              >
                {t(feature.title)}
              </Text>
              <Text
                className="mt-0.5 font-app text-[11.5px] leading-[16px] text-muted"
                maxFontSizeMultiplier={1.3}
              >
                {t(feature.hint)}
              </Text>
            </View>
            <Check size={18} color={colors.accentInk} strokeWidth={2} />
          </View>
        ))}
      </View>

      <View className="mt-6 w-full gap-2.5">
        <PriceCard
          selected={plan === 'yearly'}
          onPress={() => setPlan('yearly')}
          name={t('pro.plan.yearly')}
          price={yearlyPrice}
          hint={
            trial
              ? t('pro.plan.yearlyTrial', { trial })
              : t('pro.plan.yearlyHint', { perMonth: yearlyPerMonth })
          }
          badge={t('pro.plan.badge')}
        />
        <PriceCard
          selected={plan === 'monthly'}
          onPress={() => setPlan('monthly')}
          name={t('pro.plan.monthly')}
          price={monthlyPrice}
          hint={trial ? t('pro.plan.monthlyTrial', { trial }) : t('pro.plan.monthlyHint')}
        />
      </View>

      {message ? (
        <Text
          className="mt-4 w-full text-center font-app text-[13px] text-ink"
          maxFontSizeMultiplier={1.4}
        >
          {message}
        </Text>
      ) : null}

      {/* Never the store's own message: a RevenueCat exception means nothing to a customer. */}
      {storeNote ? (
        <Text
          className="mt-4 w-full text-center font-app text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {storeNote}
        </Text>
      ) : null}

      {__DEV__ && devNote ? (
        <Text
          className="mt-2 w-full text-center font-app text-[10px] leading-[14px] text-muted"
          maxFontSizeMultiplier={1.2}
        >
          {devNote}
        </Text>
      ) : null}

      <View className="mb-6 mt-6 w-full gap-2">
        <Button
          label={
            busy
              ? t('pro.page.oneMoment')
              : canBuy
                ? trial
                  ? t('pro.page.startTrial', { trial })
                  : t('common.continue')
                : prices.isFetching
                  ? t('pro.page.checking')
                  : t('pro.page.checkAgain')
          }
          onPress={canBuy ? handleContinue : () => void prices.refetch()}
          disabled={busy || prices.isFetching}
        />
        {/* Text links, not pills, so they do not read as a second thing to buy. Restore must stay
            easy to find (App Store). */}
        <View className="w-full flex-row flex-wrap items-center justify-center gap-5">
          <TextLink label={t('pro.page.restore')} variant="subtle" onPress={handleRestore} />
          <TextLink
            label={t('pro.page.terms')}
            variant="subtle"
            underline
            onPress={() => router.push('/terms')}
          />
          <TextLink
            label={t('pro.page.privacy')}
            variant="subtle"
            underline
            onPress={() => router.push('/privacy')}
          />
        </View>
        <Text
          className="mt-1 w-full text-center font-app text-[10.5px] leading-[15px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {t('pro.page.billing')}
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
            className="font-app-bold text-[9px] tracking-wide text-on-control"
          >
            {badge}
          </Text>
        </View>
      ) : null}
      <View className="w-full flex-row items-baseline justify-between gap-3">
        <Text className="font-app-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          {name}
        </Text>
        <Text className="font-app-bold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          {price}
        </Text>
      </View>
      <Text className="mt-0.5 font-app text-[11.5px] text-muted" maxFontSizeMultiplier={1.3}>
        {hint}
      </Text>
    </Pressable>
  );
}
