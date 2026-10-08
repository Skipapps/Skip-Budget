import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { TEXT_CAP } from '@/theme/text-scale';

type NetworkPickerProps = {
  networks: readonly string[];
  value: string;
  onChange: (network: string) => void;
};

/** Short mark shown inside each circle — full names do not fit legibly. */
const MARKS: Record<string, string> = {
  VISA: 'VISA',
  Mastercard: 'MC',
  Amex: 'AMEX',
  Discover: 'DISC',
};

export function NetworkPicker({ networks, value, onChange }: NetworkPickerProps) {
  return (
    <View className="w-full flex-row flex-wrap gap-4">
      {networks.map((network) => {
        const selected = network === value;
        return (
          <Pressable
            key={network}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={network}
            onPress={() => onChange(network)}
            className="items-center gap-2 active:opacity-70"
          >
            <View
              className={cn(
                'h-16 w-16 items-center justify-center rounded-full border',
                selected ? 'border-2 border-ink bg-ink' : 'border-line bg-card',
              )}
            >
              <Text
                allowFontScaling={false}
                className={cn(
                  'font-app-bold text-[13px] italic',
                  // Filled with ink, so the mark takes the surface colour (`on-control` pairs with
                  // the accent and vanishes here in dark mode).
                  selected ? 'text-surface' : 'text-ink',
                )}
              >
                {MARKS[network] ?? network}
              </Text>
            </View>
            {/* The tile is as wide as its name, so a name is never squeezed; the row wraps instead. */}
            <Text
              className={cn(
                'text-center text-[12px]',
                selected ? 'font-app-medium text-ink' : 'font-app text-muted',
              )}
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {network}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
