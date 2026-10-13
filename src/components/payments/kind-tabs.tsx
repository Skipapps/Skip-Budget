import { Pressable, Text, View } from 'react-native';

import { t, type MessageKey } from '@/i18n';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import { TEXT_CAP } from '@/theme/text-scale';

export type KindTab = 'all' | 'bill' | 'subscription';

const TABS: readonly { value: KindTab; label: MessageKey }[] = [
  { value: 'all', label: 'payments.tabs.all' },
  { value: 'bill', label: 'payments.tabs.bills' },
  { value: 'subscription', label: 'payments.tabs.subscriptions' },
];

/**
 * All, Bills, Subscriptions: which payments the page lists. The chosen one is underlined in the
 * accent as wide as its word. The row wraps rather than cutting a word at large text or in a longer
 * language.
 */
export function KindTabs({
  value,
  onChange,
  className,
  testID = 'kind-tabs',
}: {
  value: KindTab;
  onChange: (value: KindTab) => void;
  className?: string;
  testID?: string;
}) {
  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      className={cn('w-full flex-row flex-wrap gap-x-[24px]', className)}
    >
      {TABS.map((tab) => {
        const selected = tab.value === value;
        const label = t(tab.label);
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              selection();
              onChange(tab.value);
            }}
            hitSlop={{ left: 10, right: 10 }}
            testID={`${testID}-${tab.value}`}
            className="min-h-[44px] max-w-full justify-center active:opacity-70"
          >
            <Text
              className={cn(
                'text-[15px]',
                selected ? 'font-app-semibold text-ink' : 'font-app-medium text-muted',
              )}
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {label}
            </Text>
            {/* Drawn on every tab, clear on the others, so choosing one never moves the row. */}
            <View
              testID={`${testID}-${tab.value}-line`}
              className={cn(
                'mt-[5px] h-[2px] w-full rounded-full',
                selected ? 'bg-accent-ink' : 'bg-transparent',
              )}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
