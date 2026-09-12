import type { Href } from 'expo-router';
import { Banknote, CalendarPlus, ReceiptText, Repeat } from 'lucide-react-native';
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
    icon: ReceiptText,
    href: '/add-receipt',
  },
  { id: 'bill', label: 'Bill', hint: 'Add a bill', icon: CalendarPlus, href: '/add-bill' },
  {
    id: 'subscription',
    label: 'Subscription',
    hint: 'Add a subscription',
    icon: Repeat,
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

/** Four one-tap shortcuts, directly under the hero. */
export function QuickActions({ onPress }: QuickActionsProps) {
  const colors = useColors();

  return (
    <View className="w-full flex-row items-start gap-2">
      {ACTIONS.map((action) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          accessibilityLabel={action.hint}
          onPress={withTap(() => onPress(action.href))}
          className="min-w-0 flex-1 items-center gap-2 py-1 active:opacity-60"
        >
          {/* The one accented thing on this screen. These are the only
              controls here that make something rather than show it. */}
          <View className="h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <action.icon size={20} color={colors.accentInk} strokeWidth={1.8} />
          </View>
          <Text
            className="text-center font-poppins-medium text-[12px] text-body"
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
