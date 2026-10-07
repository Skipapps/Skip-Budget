import { Pressable, View } from 'react-native';

import { BrandMark } from '@/components/brands/brand-mark';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t, type MessageKey } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useMoneyColor } from '@/providers/theme-provider';

const CYCLE_KEYS = new Map<string, MessageKey>([
  ['weekly', 'dates.weekly'],
  ['monthly', 'dates.monthly'],
  ['quarterly', 'subscriptions.cycle.quarterly'],
  ['yearly', 'subscriptions.cycle.yearly'],
]);

/** A billing cycle as read; the stored value only picks the line. */
export function cycleLabel(cycle: string): string {
  const key = CYCLE_KEYS.get(cycle);
  return key ? t(key) : cycle;
}

type SubscriptionRowProps = {
  name: string;
  amount: number;
  cycle: string;
  /** yyyy-mm-dd, or null when the renewal date is unknown. */
  renewsOn: string | null;
  sourceLabel: string;
  domain?: string | null;
  /** The owner chose letters for this subscription. */
  logoHidden?: boolean | null;
  /** Cancelled plans stay in the list, dimmed rather than hidden. */
  active?: boolean;
  onPress?: () => void;
};

/**
 * One subscription in a list. The name wraps between words; a word too wide to sit beside the amount
 * and renewal date puts them under the name instead.
 */
export function SubscriptionRow({
  name,
  amount,
  cycle,
  renewsOn,
  sourceLabel,
  domain,
  logoHidden,
  active = true,
  onPress,
}: SubscriptionRowProps) {
  const moneyColor = useMoneyColor();
  const words = useFitGroup({ mode: 'switch' });
  const stacked = !words.fits;
  const shownCycle = cycleLabel(cycle);
  const spoken = {
    name,
    amount: formatCurrency(amount),
    cycle: shownCycle,
    source: sourceLabel,
  };
  const accessibilityLabel = sourceLabel
    ? t(active ? 'subscriptions.row.a11ySource' : 'subscriptions.row.a11ySourceCancelled', spoken)
    : t(active ? 'subscriptions.row.a11y' : 'subscriptions.row.a11yCancelled', spoken);

  const figure = (
    <FitText
      id="amount"
      hug
      role="row"
      size={15}
      className="font-app-semibold text-ink"
      style={{ color: moneyColor(-Math.abs(amount)) }}
      slotClassName={stacked ? 'mt-0.5' : undefined}
    >
      {formatCurrency(amount)}
    </FitText>
  );
  const renews = (
    <FitText
      id="date"
      hug
      role="row"
      size={12}
      className="font-app text-muted"
      slotClassName="mt-0.5"
    >
      {renewsOn
        ? formatFullDate(new Date(`${renewsOn}T00:00:00`))
        : t('subscriptions.row.noRenewalDate')}
    </FitText>
  );

  return (
    <FitGroup group={words} className="w-full">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={t('subscriptions.row.hint')}
        onPress={onPress}
        className="w-full flex-row items-center gap-3 py-3.5 active:opacity-60"
        style={active ? undefined : { opacity: 0.5 }}
      >
        <BrandMark name={name} domain={domain} hidden={logoHidden} size={40} />

        {/* Stacked, the amount follows the name and the date follows the details. */}
        <View className="min-w-0 flex-1 items-start">
          <FitText
            id="name"
            role="row"
            size={15}
            className="font-app-medium text-ink"
            slotClassName="w-full"
          >
            {name}
          </FitText>
          {stacked ? figure : null}
          <FitText
            id="detail"
            role="row"
            size={12}
            className="font-app text-muted"
            slotClassName="mt-0.5 w-full"
          >
            {`${active ? shownCycle : t('subscriptions.cancelled')}${sourceLabel ? ` · ${sourceLabel}` : ''}`}
          </FitText>
          {stacked ? renews : null}
        </View>

        {stacked ? null : (
          <View className="shrink-0 items-end">
            {figure}
            {renews}
          </View>
        )}
      </Pressable>
    </FitGroup>
  );
}
