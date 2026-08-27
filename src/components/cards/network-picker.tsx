import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';

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

/** Circular provider chooser. */
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
                selected ? 'border-2 border-ink bg-ink' : 'border-line bg-white',
              )}
            >
              <Text
                allowFontScaling={false}
                className={cn(
                  'font-poppins-bold text-[13px] italic',
                  selected ? 'text-white' : 'text-ink',
                )}
              >
                {MARKS[network] ?? network}
              </Text>
            </View>
            <Text
              className={cn(
                'text-[12px]',
                selected ? 'font-poppins-medium text-ink' : 'font-poppins text-muted',
              )}
              maxFontSizeMultiplier={1.2}
            >
              {network}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
