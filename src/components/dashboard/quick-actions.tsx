import type { Href } from 'expo-router';
import { Banknote, Calendar, Receipt, RefreshCw } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';

type QuickAction = {
  id: string;
  label: string;
  /** Read out in full, because "Bill" on its own does not say what happens. */
  hint: string;
  icon: LucideIcon;
  href: Href;
};

/**
 * The four things a person records.
 *
 * Everything on this screen below the hero is a place to look at money that
 * has already been entered. Entering it was the slow part: a bill took a tap
 * to the destination, a tap to its list and a tap on that screen's own add
 * control. These four are the same journeys in one tap each, in the order
 * people actually use them.
 */
const ACTIONS: QuickAction[] = [
  {
    id: 'receipt',
    label: 'Receipt',
    hint: 'Add a receipt',
    icon: Receipt,
    href: '/add-receipt',
  },
  { id: 'bill', label: 'Bill', hint: 'Add a bill', icon: Calendar, href: '/add-bill' },
  {
    id: 'subscription',
    label: 'Subscription',
    hint: 'Add a subscription',
    icon: RefreshCw,
    href: '/add-subscription',
  },
  {
    id: 'salary',
    label: 'Salary',
    hint: 'Your salary and where it lands',
    icon: Banknote,
    href: '/salary',
  },
];

type QuickActionsProps = {
  onPress: (href: Href) => void;
};

/**
 * Four one-tap shortcuts, directly under the hero: a row of white cards, the
 * icon up top and the word along the bottom (the Founder's Figma, 2026-10-03).
 */
export function QuickActions({ onPress }: QuickActionsProps) {
  const colors = useColors();

  return (
    <View className="w-full flex-row gap-3">
      {ACTIONS.map((action) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          accessibilityLabel={action.hint}
          onPress={withTap(() => onPress(action.href))}
          className="min-h-[92px] min-w-0 flex-1 items-center justify-between rounded-[20px] border border-line bg-card px-1.5 pb-[14px] pt-[24px] active:bg-ink/5"
        >
          {/* The one accented thing on this screen. These are the only
              controls here that make something rather than show it. */}
          <action.icon size={22} color={colors.accentInk} strokeWidth={1.8} />
          {/* One line, shrunk to fit when Dynamic Type outgrows the card:
              "Subscription" is a single word, so the two-line version could
              only break it mid-word — "Subscripti / on" at the larger
              sizes, which reads like a typo. */}
          <Text
            className="text-center font-poppins-medium text-[12px] text-ink"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            maxFontSizeMultiplier={1.3}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
