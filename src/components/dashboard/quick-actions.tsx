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

/** The four things a person records, one tap each, in the order people actually use them. */
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
          <action.icon size={22} color={colors.accentInk} strokeWidth={1.8} />
          {/* One line, shrunk to fit when Dynamic Type outgrows the card: "Subscription" is one
              word, so a two-line version would break it mid-word. */}
          <Text
            className="text-center font-app-medium text-[12px] text-ink"
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
