import { router, Stack } from 'expo-router';
import {
  CalendarCheck,
  ChartColumn,
  Check,
  CreditCard,
  Crown,
  FileUp,
  Headphones,
  History,
  Mic,
  ScanLine,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import {
  purchasesAvailable,
  trialPeriodLabel,
  usePro,
  useProPrices,
  usePurchasePro,
} from '@/api/pro';
import { useExitOffer } from '@/api/pro-offer';
import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Title } from '@/components/ui/typography';
import { t, type MessageKey } from '@/i18n';
import { failureMessage, failureText } from '@/lib/failure';
import {
  FREE_HISTORY_DAYS,
  PRO_HISTORY_YEARS,
  PRO_OFFER_MS,
  proMonthlyAmount,
  proMonthlyLabel,
  proYearlyAmount,
  proYearlyLabel,
  usdText,
} from '@/lib/wall';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** What one side of the table says: a tick, a dash, or a few words. */
type Cell = 'yes' | 'no' | (() => string);

type Row = { icon: LucideIcon; label: MessageKey; free: Cell; pro: Cell };

const limited = () => t('pro.compare.limited');
const unlimited = () => t('pro.compare.unlimited');

/** Free against Pro, in the order the design gives them. The words follow the language on screen. */
const ROWS: Row[] = [
  { icon: Wallet, label: 'pro.compare.track', free: 'yes', pro: 'yes' },
  { icon: FileUp, label: 'pro.compare.upload', free: limited, pro: 'yes' },
  { icon: ScanLine, label: 'pro.compare.scan', free: limited, pro: unlimited },
  { icon: CreditCard, label: 'pro.compare.cards', free: limited, pro: unlimited },
  {
    icon: History,
    label: 'pro.compare.history',
    free: () => t('pro.compare.days', { count: FREE_HISTORY_DAYS }),
    pro: () => t('pro.compare.years', { count: PRO_HISTORY_YEARS }),
  },
  { icon: Mic, label: 'pro.compare.voice', free: 'no', pro: 'yes' },
  { icon: ChartColumn, label: 'pro.compare.insights', free: 'no', pro: 'yes' },
  { icon: CalendarCheck, label: 'pro.compare.habits', free: 'no', pro: 'yes' },
  { icon: Sparkles, label: 'pro.compare.early', free: 'no', pro: 'yes' },
  { icon: Headphones, label: 'pro.compare.support', free: 'no', pro: 'yes' },
];

/** How a cell is read aloud. */
function spoken(cell: Cell): string {
  if (cell === 'yes') return t('pro.compare.included');
  if (cell === 'no') return t('pro.compare.notIncluded');
  return cell();
}

/**
 * The yearly price over twelve months ($19.99 / 12), for when the store has not answered. In
 * dollars whatever the app shows, like the fallback prices in wall.ts: Apple prices each
 * storefront itself, so no other currency's figure would be a real price.
 */
const PRO_YEARLY_PER_MONTH_USD = 1.67;

type Plan = 'yearly' | 'monthly';

const SWIPE_BACK = { gestureEnabled: true };

/**
 * The Pro page: Free against Pro, the two plans, and one button. With no store key configured it
 * still renders and says purchases are opening soon, so a missing billing SDK never crashes it.
 */
export default function ProScreen() {
  const colors = useColors();
  const { pro } = usePro();
  const prices = useProPrices();
  const { purchase, restore } = usePurchasePro();

  const [plan, setPlan] = useState<Plan>('yearly');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Leaving without buying opens the one-time offer, the first time only. While it is armed the
  // edge swipe is off, so the chevron is the one way out and the offer cannot be skipped by
  // gesture; once seen, the page goes back as any other.
  const offer = useExitOffer();
  const leaving = useRef(false);
  const screenOptions = useMemo(() => ({ gestureEnabled: !offer.armed }), [offer.armed]);
  const leave = async () => {
    if (leaving.current) return;
    leaving.current = true;
    try {
      if (offer.armed && (await offer.claim())) {
        // The deadline travels with the page, so a remount cannot start the ten minutes again.
        router.replace({
          pathname: '/pro-offer',
          params: { until: String(Date.now() + PRO_OFFER_MS) },
        });
        return;
      }
    } catch {
      // A failed claim is not a reason to keep anyone on this page.
    }
    leaving.current = false;
    goBack();
  };

  const pack = plan === 'yearly' ? prices.data?.yearly : prices.data?.monthly;
  const canBuy = purchasesAvailable() && Boolean(pack);
  const trial = prices.data?.trials[plan] ?? null;

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
  const yearlyPerMonth = t('pro.price.monthly', {
    price: yearly?.pricePerMonthString ?? usdText(PRO_YEARLY_PER_MONTH_USD),
  });
  const price =
    plan === 'yearly'
      ? (yearly?.priceString ?? proYearlyAmount())
      : (monthly?.priceString ?? proMonthlyAmount());

  const cta = busy
    ? t('pro.page.oneMoment')
    : canBuy
      ? trial
        ? t('pro.page.tryFree', { period: trialPeriodLabel(trial) })
        : t(plan === 'yearly' ? 'pro.page.getYearly' : 'pro.page.getMonthly', { price })
      : prices.isFetching
        ? t('pro.page.checking')
        : t('pro.page.checkAgain');

  // What happens after the button, in the plan's own terms; nothing until the store has answered.
  const terms = !canBuy
    ? null
    : trial
      ? t(plan === 'yearly' ? 'pro.page.thenYearly' : 'pro.page.thenMonthly', { price })
      : t(plan === 'yearly' ? 'pro.page.billedYearly' : 'pro.page.billedMonthly');

  const handleContinue = async () => {
    if (!pack) return;
    setMessage(null);
    setBusy(true);
    try {
      const result = await purchase(pack);
      if (result === 'done') goBack();
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
        {/* A restore made here turns this page Pro while the offer was armed: the swipe comes back. */}
        <Stack.Screen options={SWIPE_BACK} />
        <View className="mt-8 w-full items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Crown size={28} color={colors.onControl} strokeWidth={2} />
          </View>
          <Title flush className="mt-5">
            {t('pro.page.haveTitle')}
          </Title>
          <Text
            className="mt-3 max-w-[300px] text-center font-app text-[14px] leading-[21px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
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
    <Screen
      title={t('pro.page.title')}
      showBack
      onBack={() => void leave()}
      footer={
        <View className="w-full gap-2">
          <Button
            label={cta}
            onPress={canBuy ? handleContinue : () => void prices.refetch()}
            disabled={busy || prices.isFetching}
          />
          {terms ? (
            <Text
              className="w-full text-center font-app text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {terms}
            </Text>
          ) : null}
          {/* Text links, not pills, so they do not read as a second thing to buy. Restore, Terms
              and Privacy must stay easy to find (App Review 3.1.2). */}
          <View className="w-full flex-row flex-wrap items-center justify-center gap-x-5">
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
        </View>
      }
    >
      <Stack.Screen options={screenOptions} />

      <Text
        className="mt-1 w-full text-center font-app text-[15px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('pro.page.coffee')}
      </Text>

      <CompareTable />

      <View className="mt-6 w-full flex-row gap-3">
        <PlanCard
          selected={plan === 'yearly'}
          onPress={() => setPlan('yearly')}
          name={t('pro.plan.yearly')}
          price={yearlyPrice}
          detail={yearlyPerMonth}
          badge={t('pro.plan.popular')}
        />
        <PlanCard
          selected={plan === 'monthly'}
          onPress={() => setPlan('monthly')}
          name={t('pro.plan.monthly')}
          price={monthlyPrice}
          detail={t('pro.plan.billedMonthly')}
        />
      </View>

      {message ? (
        <Text
          className="mt-4 w-full text-center font-app text-[13px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {message}
        </Text>
      ) : null}

      {/* Never the store's own message: a RevenueCat exception means nothing to a customer. */}
      {storeNote ? (
        <Text
          className="mt-4 w-full text-center font-app text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {storeNote}
        </Text>
      ) : null}

      <Text
        className="mt-6 w-full text-center font-app text-[10.5px] leading-[15px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('pro.page.renews')}
      </Text>

      {__DEV__ && devNote ? (
        <Text
          className="mt-2 w-full text-center font-app text-[10px] leading-[14px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {devNote}
        </Text>
      ) : null}
    </Screen>
  );
}

/** The free and Pro columns: wide enough for "Unlimited" and its translations at their cap. */
const COLUMN = 'w-[76px] items-center';

function CompareTable() {
  return (
    <View className="mt-5 w-full">
      <View className="w-full flex-row items-center border-b border-line pb-2">
        <Text
          className="min-w-0 flex-1 font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {t('pro.compare.what')}
        </Text>
        <View className={COLUMN}>
          <Text
            className="font-app-medium text-[14px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {t('pro.compare.free')}
          </Text>
        </View>
        <View className={COLUMN}>
          <Text
            className="font-app-semibold text-[14px] text-accent-ink"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {t('pro.compare.pro')}
          </Text>
        </View>
      </View>

      {ROWS.map((row) => (
        <CompareRow key={row.label} row={row} />
      ))}
    </View>
  );
}

function CompareRow({ row }: { row: Row }) {
  const colors = useColors();
  const label = t(row.label);
  return (
    // One stop for VoiceOver, read as a sentence, rather than five fragments.
    <View
      accessible
      accessibilityLabel={t('pro.compare.row', {
        feature: label,
        free: spoken(row.free),
        pro: spoken(row.pro),
      })}
      className="min-h-[44px] w-full flex-row items-center gap-3 border-b border-line py-2"
    >
      <row.icon size={18} color={colors.accentInk} strokeWidth={1.8} />
      <Text
        className="min-w-0 flex-1 font-app text-[15px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {label}
      </Text>
      <View className={COLUMN}>
        <CellMark cell={row.free} side="free" />
      </View>
      <View className={COLUMN}>
        <CellMark cell={row.pro} side="pro" />
      </View>
    </View>
  );
}

function CellMark({ cell, side }: { cell: Cell; side: 'free' | 'pro' }) {
  const colors = useColors();
  if (cell === 'yes') {
    return (
      <Check size={18} color={side === 'pro' ? colors.accentInk : colors.muted} strokeWidth={2} />
    );
  }
  if (cell === 'no') {
    return (
      <Text className="font-app text-[14px] text-muted" maxFontSizeMultiplier={TEXT_CAP.control}>
        —
      </Text>
    );
  }
  return (
    <Text
      className={
        side === 'pro'
          ? 'text-center font-app-semibold text-[13px] text-accent-ink'
          : 'text-center font-app text-[13px] text-muted'
      }
      maxFontSizeMultiplier={TEXT_CAP.control}
    >
      {cell()}
    </Text>
  );
}

function PlanCard({
  selected,
  onPress,
  name,
  price,
  detail,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  name: string;
  price: string;
  detail: string;
  badge?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${price}. ${detail}`}
      onPress={onPress}
      className={
        selected
          ? 'min-w-0 flex-1 rounded-[16px] border-[1.5px] border-accent bg-card px-4 pb-4 pt-5'
          : 'min-w-0 flex-1 rounded-[16px] border border-line bg-card px-4 pb-4 pt-5 active:bg-ink/5'
      }
    >
      {badge ? (
        // Its words are not in the card's spoken label, so they follow the text size like any other.
        <View className="absolute -top-2.5 left-3 rounded-full bg-accent px-2.5 py-0.5">
          <Text
            className="font-app-semibold text-[10px] text-on-control"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {badge}
          </Text>
        </View>
      ) : null}
      <View className="w-full flex-row items-center justify-between gap-2">
        <Text
          className="min-w-0 shrink font-app-medium text-[14px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {name}
        </Text>
        {selected ? (
          <View className="h-6 w-6 items-center justify-center rounded-full bg-accent">
            <Check size={14} color={colors.onControl} strokeWidth={2.4} />
          </View>
        ) : (
          <View className="h-6 w-6 rounded-full border-[1.5px] border-line" />
        )}
      </View>
      <Text
        className="mt-1.5 font-app-bold text-[22px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {price}
      </Text>
      <Text
        className="mt-0.5 font-app text-[12.5px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {detail}
      </Text>
    </Pressable>
  );
}
