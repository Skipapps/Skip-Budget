import { Text, View } from 'react-native';

import { TEXT_CAP } from '@/theme/text-scale';

/** Sam's plum "S", beside the name it stands for, so screen readers skip it. */
export function SamMark({ size }: { size: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center bg-accent"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text
        className="font-app-bold text-on-control"
        style={{ fontSize: Math.round(size * 0.5) }}
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        S
      </Text>
    </View>
  );
}
