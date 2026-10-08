import {
  Calendar,
  ChevronRight,
  FileText,
  Landmark,
  Receipt,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react-native';
import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { Skeleton } from '@/components/ui/skeleton';
import { TextLink } from '@/components/ui/text-link';
import type { SpendingCategory } from '@/data/spending-categories';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';
import { failureText } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Glyph per dashboard destination, matching the Quick add cards. Unknown ids fall back to a
 * document.
 */
const DESTINATION_ICONS: Record<string, LucideIcon> = {
  'monthly-bills': Calendar,
  receipts: Receipt,
  subscriptions: RefreshCw,
  'loan-calculator': Landmark,
};

const DESTINATION_FALLBACK_ICON: LucideIcon = FileText;

type DestinationListProps = {
  /** Each row shows its label as given, so the caller words it in the language on screen. */
  items: SpendingCategory[];
  /** Signed month totals by id. Absent means the row opens a tool, not a figure. */
  amounts: Record<string, number | undefined>;
  loading?: boolean;
  error?: boolean;
  onPress: (id: string) => void;
  onRetry?: () => void;
};

/**
 * Where this month's money went, as one list rather than a carousel: a comparison wants a single
 * column of amounts, in the same grammar as the transaction rows below. Labels wrap between words;
 * once any label has a word that cannot fit beside its amount, every row puts its amount under its
 * label, so the column of amounts stays one column.
 */
export function DestinationList({
  items,
  amounts,
  loading = false,
  error = false,
  onPress,
  onRetry,
}: DestinationListProps) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  const rows = useFitGroup({ mode: 'switch' });
  const stacked = !rows.fits;

  return (
    <View className="w-full">
      <FitGroup
        group={rows}
        className="w-full overflow-hidden rounded-[16px] border border-line bg-card py-1"
        testID="where-it-goes"
      >
        {items.map((category, index) => {
          const Icon = DESTINATION_ICONS[category.id] ?? DESTINATION_FALLBACK_ICON;
          const amount = amounts[category.id];
          const isMoneyRow = amount !== undefined;

          const label = isMoneyRow
            ? loading
              ? t('home.destination.loading', { label: category.label })
              : error
                ? t('home.destination.unavailable', { label: category.label })
                : t('home.destination.amount', {
                    label: category.label,
                    amount: formatCurrency(amount),
                  })
            : t('home.tool.opens', { label: category.label });

          const name = (
            <FitText
              id={`${category.id}-label`}
              role="row"
              size={15}
              className="font-app-medium text-ink"
              slotClassName={stacked ? 'w-full' : 'min-w-0 flex-1'}
            >
              {category.label}
            </FitText>
          );

          const value = !isMoneyRow ? (
            <FitText
              id={`${category.id}-open`}
              hug
              role="row"
              size={13}
              className="font-app text-muted"
            >
              {t('home.destination.open')}
            </FitText>
          ) : loading ? (
            <Skeleton className="h-3.5 w-20" />
          ) : (
            <FitText
              id={`${category.id}-amount`}
              hug
              role="row"
              size={15}
              className={error ? 'font-app-semibold text-muted' : 'font-app-semibold text-ink'}
              style={error ? undefined : { color: moneyColor(amount) }}
            >
              {error ? '—' : formatCurrency(amount)}
            </FitText>
          );

          const chevron = <ChevronRight size={18} color={colors.muted} strokeWidth={2} />;

          return (
            <Fragment key={category.id}>
              {/* Inset to start under the label, past the icon's circle. */}
              {index > 0 ? <View className="ml-[70px] h-px bg-line/60" /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => onPress(category.id)}
                className="min-h-14 w-full flex-row items-center gap-[12px] px-4 py-3 active:opacity-60"
              >
                <View className="h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <Icon size={20} color={colors.accentInk} strokeWidth={1.8} />
                </View>

                {stacked ? (
                  // Label first, then the amount on its own line at the same size, in the order
                  // VoiceOver reads them.
                  <View className="min-w-0 flex-1 items-start gap-0.5">
                    {name}
                    {value}
                  </View>
                ) : (
                  name
                )}

                {stacked ? (
                  <View className="shrink-0">{chevron}</View>
                ) : isMoneyRow ? (
                  // A rule before the figure and a chevron after it: the shared minimum width keeps
                  // the rules aligned down the card, and the chevron says the row opens.
                  <View className="shrink-0 flex-row items-center">
                    <View className="mr-3 h-6 w-px bg-line" />
                    <View className="min-w-[96px] items-end">{value}</View>
                    <View className="ml-1.5">{chevron}</View>
                  </View>
                ) : (
                  <View className="shrink-0 flex-row items-center gap-1">
                    {value}
                    {chevron}
                  </View>
                )}
              </Pressable>
            </Fragment>
          );
        })}
      </FitGroup>

      {/* The rows stay tappable while this shows: each destination loads its own data. */}
      {error ? (
        <View className="mt-3 w-full flex-row items-center justify-between gap-3">
          <Text
            className="shrink font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {failureText()}
          </Text>
          {onRetry ? (
            <TextLink
              label={t('common.tryAgain')}
              variant="subtle"
              onPress={onRetry}
              className="py-0"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
