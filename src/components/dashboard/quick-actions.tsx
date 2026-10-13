import type { Href } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { HomeTile, type HomeTileGroups } from '@/components/dashboard/home-tile';
import { FitGroup, useFitGroup } from '@/components/ui/fit-group';
import { t, type MessageKey } from '@/i18n';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { useHomeIcons } from '@/theme/home-icons';

type QuickAction = {
  id: 'receipt' | 'bill' | 'subscription' | 'salary';
  label: MessageKey;
  /** Read out in full, because "Bill" on its own does not say what happens. */
  hint: MessageKey;
  href: Href;
};

/** The four things a person records, one tap each, in the order people actually use them. */
const ACTIONS: QuickAction[] = [
  {
    id: 'receipt',
    label: 'home.kind.receipt',
    hint: 'home.quickAdd.receiptHint',
    href: '/add-receipt',
  },
  {
    id: 'bill',
    label: 'home.kind.bill',
    hint: 'home.quickAdd.billHint',
    href: '/add-bill',
  },
  {
    id: 'subscription',
    label: 'home.kind.subscription',
    hint: 'home.quickAdd.subscriptionHint',
    href: '/add-subscription',
  },
  {
    id: 'salary',
    label: 'home.quickAdd.salary',
    hint: 'home.quickAdd.salaryHint',
    href: '/salary',
  },
];

type QuickActionsProps = {
  onPress: (href: Href) => void;
};

/** Two rows of two, in reading order. */
const ROWS = [ACTIONS.slice(0, 2), ACTIONS.slice(2)];

/**
 * Two by two on every phone at every text size, the Founder's rule. The names share one size; with
 * no one-column layout to fall back on, a name too wide for its tile shrinks all four together,
 * under the design size if it must but never under the 11pt floor.
 */
export function QuickActions({ onPress }: QuickActionsProps) {
  const colors = useColors();
  const icons = useHomeIcons();
  const groups: HomeTileGroups = { names: useFitGroup({ mode: 'shrink', onlyLayout: true }) };

  const plus = (
    <View
      testID="quick-add-plus"
      className="h-[28px] w-[28px] items-center justify-center rounded-full bg-accent"
    >
      <Plus size={16} color={colors.onControl} strokeWidth={2.4} />
    </View>
  );

  return (
    <FitGroup group={groups.names} className="w-full gap-[12px]" testID="quick-add">
      {ROWS.map((row) => (
        <View key={row[0].id} testID="quick-add-row" className="w-full flex-row gap-[12px]">
          {row.map((action) => (
            <HomeTile
              key={action.id}
              id={action.id}
              icon={icons[action.id]}
              mark={plus}
              markAt="bottom"
              name={t(action.label)}
              groups={groups}
              accessibilityLabel={t(action.hint)}
              onPress={withTap(() => onPress(action.href))}
              className="min-w-0 flex-1"
            />
          ))}
        </View>
      ))}
    </FitGroup>
  );
}
