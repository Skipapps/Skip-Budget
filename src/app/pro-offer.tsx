import { router, useLocalSearchParams } from 'expo-router';
import { ChartColumn, History, Info, Mic, ScanLine, X, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';

import { purchasesAvailable, useOfferPrices, usePurchasePro } from '@/api/pro';
import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { t } from '@/i18n';
import { failureMessage } from '@/lib/failure';
import { PRO_HISTORY_YEARS, PRO_OFFER_MS, usdText } from '@/lib/wall';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** The prices the offer is set at in US dollars, until the store has answered. */
const OFFER_YEARLY_USD = 9.99;
const OFFER_PER_MONTH_USD = 0.83;
const REGULAR_YEARLY_USD = 19.99;

const INCLUDED: { icon: LucideIcon; label: () => string }[] = [
  { icon: ScanLine, label: () => t('pro.offer.scans') },
  { icon: Mic, label: () => t('pro.offer.voice') },
  { icon: History, label: () => t('pro.offer.history', { count: PRO_HISTORY_YEARS }) },
  { icon: ChartColumn, label: () => t('pro.offer.insights') },
];

const twoDigits = (value: number) => String(value).padStart(2, '0');

/**
 * The deadline the Pro page set when it claimed the offer. None, or one further off than an offer
 * lasts, means this was not opened by a claim (a typed link, say), and the page closes.
 */
function readDeadline(until: string | undefined): number | null {
  const at = Number(until);
  if (!until || !Number.isFinite(at)) return null;
  return at <= Date.now() + PRO_OFFER_MS + 5_000 ? at : null;
}

/** Whether the store prices really are about half, before the page says "half price". */
function isHalf(offer: number | undefined, regular: number | undefined): boolean {
  if (!offer || !regular) return true;
  return Math.abs(offer / regular - 0.5) <= 0.05;
}

/**
 * Skip Pro at half price, once: opened in place of the Pro page the first time a free account
 * leaves it without buying (the claim is made before this opens, so closing it, by X, "No thanks"
 * or a swipe, is final). The timer runs on the clock, not on renders, so time away from the app
 * counts, and at zero the offer is gone.
 */
export default function ProOfferScreen() {
  const colors = useColors();
  const prices = useOfferPrices();
  const { purchase, restore } = usePurchasePro();
  const { until } = useLocalSearchParams<{ until?: string }>();

  // Read once: a remount (the text size changing, say) keeps the same deadline.
  const [deadline] = useState(() => readDeadline(until));
  const endsAt = deadline ?? 0;
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const left = Math.max(0, endsAt - now);
  const ended = left === 0;

  useEffect(() => {
    if (deadline === null) goBack();
  }, [deadline]);

  useEffect(() => {
    if (ended) return;
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    // Back from the background, the clock is read at once rather than on the next tick.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [ended]);

  const pack = prices.data?.offer ?? null;
  const canBuy = purchasesAvailable() && Boolean(pack) && !ended;
  const product = pack?.product;
  const price = product?.priceString ?? usdText(OFFER_YEARLY_USD);
  const perMonth = product?.pricePerMonthString ?? usdText(OFFER_PER_MONTH_USD);
  const regularProduct = prices.data?.regular?.product;
  // The dollar figure stands in only while the store has said nothing: beside a store price in
  // another currency it would be a price nobody is charged.
  const regular = regularProduct?.priceString ?? (product ? null : usdText(REGULAR_YEARLY_USD));
  const title = isHalf(product?.price, regularProduct?.price)
    ? t('pro.offer.title')
    : t('pro.offer.titleSpecial');

  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);

  const handleRestore = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const restored = await restore();
      if (restored) goBack();
      else setMessage(t('pro.page.nothingToRestore'));
    } catch (thrown) {
      setMessage(failureMessage(thrown));
    } finally {
      setBusy(false);
    }
  };

  const handleBuy = async () => {
    if (!pack || ended) return;
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

  const cta = ended
    ? t('pro.offer.endedButton')
    : busy
      ? t('pro.page.oneMoment')
      : canBuy
        ? t('pro.page.getYearly', { price })
        : prices.isFetching
          ? t('pro.page.checking')
          : t('pro.page.checkAgain');

  if (deadline === null) return null;

  return (
    <Screen
      headerActions={[{ icon: X, label: t('pro.offer.close'), onPress: goBack }]}
      footer={
        <View className="w-full items-center gap-2">
          <Button
            label={cta}
            onPress={canBuy ? handleBuy : () => void prices.refetch()}
            disabled={ended || busy || prices.isFetching}
          />
          {ended ? null : (
            <Text
              className="w-full text-center font-app text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {t('pro.page.billedYearly')}
            </Text>
          )}
          <View className="w-full flex-row items-center justify-center gap-1.5">
            <Info size={14} color={colors.muted} strokeWidth={1.8} />
            <Text
              className="shrink text-center font-app text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {t('pro.offer.once')}
            </Text>
          </View>
          <TextLink label={t('pro.offer.noThanks')} variant="subtle" onPress={goBack} />
        </View>
      }
    >
      <View className="mt-2 w-full items-center">
        <View className="rounded-full border border-accent px-3 py-1">
          <Text
            className="font-app-semibold text-[11px] tracking-widest text-accent-ink"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {t('pro.offer.badge')}
          </Text>
        </View>

        <Text
          accessibilityRole="header"
          className="mt-4 text-center font-app-bold text-[28px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.heading}
        >
          {title}
        </Text>

        <View className="mt-3 flex-row flex-wrap items-baseline justify-center gap-x-2">
          {regular ? (
            <Text
              accessibilityLabel={t('pro.offer.wasPrice', { price: regular })}
              className="font-app text-[20px] text-muted line-through"
              maxFontSizeMultiplier={TEXT_CAP.figure}
            >
              {regular}
            </Text>
          ) : null}
          <Text
            className="font-app-bold text-[56px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.figure}
          >
            {price}
          </Text>
          <Text className="font-app text-[18px] text-muted" maxFontSizeMultiplier={TEXT_CAP.figure}>
            /{t('pro.offer.year')}
          </Text>
        </View>

        <Text
          className="mt-1 text-center font-app text-[15px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('pro.offer.perMonth', { price: perMonth })}
        </Text>

        {/* One stop for VoiceOver; it is read when reached, not announced every second. */}
        <View
          accessible
          accessibilityLabel={
            ended ? t('pro.offer.ended') : t('pro.offer.timeLeft', { minutes, seconds })
          }
          className="mt-6 flex-row items-center gap-3"
        >
          <TimeBox value={twoDigits(minutes)} unit={t('pro.offer.min')} />
          <Text
            className="font-app-bold text-[24px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.figure}
          >
            :
          </Text>
          <TimeBox value={twoDigits(seconds)} unit={t('pro.offer.sec')} />
        </View>

        <View className="mt-4 h-1 w-[184px] overflow-hidden rounded-full bg-line">
          <View
            className="h-1 rounded-full bg-accent"
            style={{ width: `${(left / PRO_OFFER_MS) * 100}%` }}
          />
        </View>

        <Text
          className="mt-3 text-center font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {ended ? t('pro.offer.ended') : t('pro.offer.endsWhen')}
        </Text>
      </View>

      <View className="mt-6 w-full rounded-[16px] border border-line bg-card px-4 py-4">
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
          {t('pro.offer.includes')}
        </Text>
        <View className="mt-3 w-full gap-3">
          {INCLUDED.map((item) => (
            <View key={item.label()} className="w-full flex-row items-center gap-3">
              <item.icon size={18} color={colors.accentInk} strokeWidth={1.8} />
              <Text
                className="min-w-0 flex-1 font-app text-[15px] text-ink"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {item.label()}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {message ? (
        <Text
          className="mt-4 w-full text-center font-app text-[13px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {message}
        </Text>
      ) : null}

      {/* A purchase screen keeps Restore, Terms and Privacy within reach (App Review 3.1.2). */}
      <View className="mt-4 w-full flex-row flex-wrap items-center justify-center gap-x-5">
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
        className="mb-2 mt-3 w-full text-center font-app text-[10.5px] leading-[15px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('pro.page.renews')}
      </Text>
    </Screen>
  );
}

function TimeBox({ value, unit }: { value: string; unit: string }) {
  return (
    <View className="w-[84px] items-center rounded-[14px] border border-line bg-card py-3">
      <Text
        className="font-app-bold text-[34px] text-ink"
        style={{ fontVariant: ['tabular-nums'] }}
        maxFontSizeMultiplier={TEXT_CAP.figure}
      >
        {value}
      </Text>
      <Text className="font-app text-[11px] text-muted" maxFontSizeMultiplier={TEXT_CAP.control}>
        {unit}
      </Text>
    </View>
  );
}
