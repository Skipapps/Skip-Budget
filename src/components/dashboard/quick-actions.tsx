import type { Href } from 'expo-router';
import { Banknote, Calendar, Receipt, RefreshCw } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { cn } from '@/lib/cn';
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

/** Two rows of two, in reading order. */
const ROWS = [ACTIONS.slice(0, 2), ACTIONS.slice(2)];

/**
 * Two by two on every phone at every text size, the four labels at one size: a label that outgrows
 * its tile shrinks all four together. One column only if that would take them under their default
 * size.
 */
export function QuickActions({ onPress }: QuickActionsProps) {
  const colors = useColors();
  const labels = useFitGroup({ mode: 'shrink' });

  const tile = (action: QuickAction) => (
    <Pressable
      key={action.id}
      accessibilityRole="button"
      accessibilityLabel={action.hint}
      onPress={withTap(() => onPress(action.href))}
      className={cn(
        'min-h-14 flex-row items-center gap-2 rounded-[20px] border border-line bg-card px-3 py-2 active:bg-ink/5',
        labels.fits ? 'min-w-0 flex-1' : 'w-full',
      )}
    >
      <action.icon size={22} color={colors.accentInk} strokeWidth={1.8} />
      <FitText
        id={action.id}
        role="control"
        size={15}
        className="font-app-medium text-ink"
        slotClassName="min-w-0 flex-1"
      >
        {action.label}
      </FitText>
    </Pressable>
  );

  return (
    <FitGroup group={labels} className="w-full gap-3" testID="quick-add">
      {labels.fits
        ? ROWS.map((row) => (
            <View key={row[0].id} className="w-full flex-row gap-3">
              {row.map(tile)}
            </View>
          ))
        : ACTIONS.map(tile)}
    </FitGroup>
  );
}
