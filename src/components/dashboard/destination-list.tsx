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

import { Skeleton } from '@/components/ui/skeleton';
import { TextLink } from '@/components/ui/text-link';
import type { SpendingCategory } from '@/data/dashboard-mock';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';
import { FAILURE_MESSAGE } from '@/lib/failure';

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
  items: SpendingCategory[];
  /** Signed month totals by id. Absent means the row opens a tool, not a figure. */
  amounts: Record<string, number | undefined>;
  pro: boolean;
  loading?: boolean;
  error?: boolean;
  onPress: (id: string) => void;
  onRetry?: () => void;
};

/**
 * Where this month's money went, as one list rather than a carousel: a comparison wants a single
 * column of amounts, in the same grammar as the transaction rows below.
 */
export function DestinationList({
  items,
  amounts,
  pro,
  loading = false,
  error = false,
  onPress,
  onRetry,
}: DestinationListProps) {
  const colors = useColors();
  const moneyColor = useMoneyColor();

  return (
    <View className="w-full">
      <View className="w-full overflow-hidden rounded-[16px] border border-line bg-card py-1">
        {items.map((category, index) => {
          const Icon = DESTINATION_ICONS[category.id] ?? DESTINATION_FALLBACK_ICON;
          const amount = amounts[category.id];
          const isMoneyRow = amount !== undefined;
          // Locked features keep their row: a hidden feature sells nothing, and the destination
          // screen still does the refusing.
          const locked = !pro && category.id === 'loan-calculator';

          const label = isMoneyRow
            ? loading
              ? `${category.label}, amount loading`
              : error
                ? `${category.label}, amount unavailable`
                : `${category.label}, ${formatCurrency(amount)}, this month`
            : `${category.label}.${locked ? ' Pro feature.' : ''} Opens the tool.`;

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

                <Text
                  className="min-w-0 flex-1 font-poppins-medium text-[15px] text-ink"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.4}
                >
                  {category.label}
                </Text>

                {/* Inline rather than pinned to the corner, so at large type the badge pushes the
                    label along. */}
                {locked ? (
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    className="shrink-0 rounded-full bg-accent px-2 py-0.5"
                  >
                    <Text
                      allowFontScaling={false}
                      className="font-poppins-bold text-[9px] text-on-control"
                    >
                      PRO
                    </Text>
                  </View>
                ) : null}

                {isMoneyRow ? (
                  // A rule before the figure and a chevron after it: the shared minimum width keeps
                  // the rules aligned down the card, and the chevron says the row opens.
                  <View className="shrink-0 flex-row items-center">
                    <View className="mr-3 h-6 w-px bg-line" />
                    <View className="min-w-[96px] items-end">
                      {loading ? (
                        <Skeleton className="h-3.5 w-20" />
                      ) : error ? (
                        <Text
                          className="font-poppins-semibold text-[15px] text-muted"
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.4}
                        >
                          —
                        </Text>
                      ) : (
                        <Text
                          className="font-poppins-semibold text-[15px] text-ink"
                          style={{ color: moneyColor(amount) }}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.4}
                        >
                          {formatCurrency(amount)}
                        </Text>
                      )}
                    </View>
                    <View className="ml-1.5">
                      <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
                    </View>
                  </View>
                ) : (
                  <View className="shrink-0 flex-row items-center gap-1">
                    <Text
                      className="font-poppins text-[13px] text-muted"
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.3}
                    >
                      Open
                    </Text>
                    <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
                  </View>
                )}
              </Pressable>
            </Fragment>
          );
        })}
      </View>

      {/* The rows stay tappable while this shows: each destination loads its own data. */}
      {error ? (
        <View className="mt-3 w-full flex-row items-center justify-between gap-3">
          <Text className="shrink font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
            {FAILURE_MESSAGE}
          </Text>
          {onRetry ? (
            <TextLink label="Try again" variant="subtle" onPress={onRetry} className="py-0" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
