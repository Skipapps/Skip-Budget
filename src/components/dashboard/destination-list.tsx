import {
  CalendarDays,
  ChevronRight,
  FileText,
  Landmark,
  ReceiptText,
  Repeat,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { TextLink } from '@/components/ui/text-link';
import type { SpendingCategory } from '@/data/dashboard-mock';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';

/**
 * The glyph for each dashboard destination.
 *
 * Exported so the Arrange screen can show the same mark against the same
 * label: a shortcut that changes its picture depending on which screen you
 * are rearranging it from is a different shortcut as far as the eye is
 * concerned. Anything not listed falls back to a document, so an id added
 * later renders a real icon rather than an empty well.
 */
export const DESTINATION_ICONS: Record<string, LucideIcon> = {
  'monthly-bills': CalendarDays,
  receipts: ReceiptText,
  subscriptions: Repeat,
  'loan-calculator': Landmark,
  'split-calculator': Users,
};

export const DESTINATION_FALLBACK_ICON: LucideIcon = FileText;

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
 * Where this month's money went, as one list rather than a carousel.
 *
 * Five destinations with five figures is a comparison, and a comparison wants
 * a single column of amounts you can run your eye down — not a horizontal
 * scroller that hides three of them behind a gesture and spends a 150pt
 * square on a drawing to report one number. It also puts these amounts in the
 * same grammar as the transaction rows further down the screen, so the
 * dashboard reads as one page instead of three stacked widgets.
 *
 * The order is the user's own, straight from `tile_order`.
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
          // Locked features keep their row. A hidden feature sells nothing; a
          // visible locked one is an advert that renders itself, and the
          // destination screen still does the actual refusing.
          const locked =
            !pro && (category.id === 'loan-calculator' || category.id === 'split-calculator');

          const label = isMoneyRow
            ? loading
              ? `${category.label}, amount loading`
              : error
                ? `${category.label}, amount unavailable`
                : `${category.label}, ${formatCurrency(amount)}, this month`
            : `${category.label}.${locked ? ' Pro feature.' : ''} Opens the tool.`;

          return (
            <Fragment key={category.id}>
              {index > 0 ? <View className="ml-[52px] h-px bg-line/60" /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => onPress(category.id)}
                className="min-h-14 w-full flex-row items-center gap-3 px-4 py-3.5 active:opacity-60"
              >
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-ink/5">
                  <Icon size={20} color={colors.body} strokeWidth={1.8} />
                </View>

                <Text
                  className="min-w-0 flex-1 font-poppins-medium text-[15px] text-ink"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.4}
                >
                  {category.label}
                </Text>

                {/* Inline rather than pinned to the corner, so at large type
                    the badge pushes the label along instead of sitting on it. */}
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
                  loading ? (
                    <Skeleton className="h-3.5 w-20" />
                  ) : error ? (
                    <Text
                      className="shrink-0 font-poppins-semibold text-[15px] text-muted"
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.4}
                    >
                      —
                    </Text>
                  ) : (
                    <Text
                      className="shrink-0 font-poppins-semibold text-[15px] text-ink"
                      style={{ color: moneyColor(amount) }}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.4}
                    >
                      {formatCurrency(amount)}
                    </Text>
                  )
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

      {/* The rows stay tappable while this shows: each destination loads its
          own data, so only the figures here are missing. */}
      {error ? (
        <View className="mt-3 w-full flex-row items-center justify-between gap-3">
          <Text className="shrink font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
            Amounts are unavailable right now.
          </Text>
          {onRetry ? (
            <TextLink label="Try again" variant="subtle" onPress={onRetry} className="py-0" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
