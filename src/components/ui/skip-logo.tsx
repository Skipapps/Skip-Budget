import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors, useTheme } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** The app icon's navy; on the dark page the ring takes the ink so it does not sink into it. */
const NAVY = '#233B62';

/**
 * The ring, drawn from the app icon (1932px artwork): centre 919,1011, stroke 225 wide, open at the
 * upper right between 19.6° and 70.1°, with round ends.
 */
const RING = 'M1085.3 551.7 A488.5 488.5 0 1 0 1379.2 847.1';
/** The paper-plane arrow beyond the gap, in two faces split along its fold. */
const ARROW_NEAR = 'M1212 410 L1612 320 L1397 535 Z';
const ARROW_FAR = 'M1397 535 L1612 320 L1520 718 Z';

/** The Skip mark alone: ring and arrow, sized as a square. */
export function SkipMark({ size = 32 }: { size?: number }) {
  const colors = useColors();
  const { scheme } = useTheme();
  const arrow = scheme === 'dark' ? colors.accentInk : colors.accent;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="300 300 1340 1340"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d={RING}
        stroke={scheme === 'dark' ? colors.ink : NAVY}
        strokeWidth={225}
        strokeLinecap="round"
        fill="none"
      />
      <Path d={ARROW_NEAR} fill={arrow} />
      <Path d={ARROW_FAR} fill={arrow} />
      {/* The far face in shade, as on the icon, whatever the arrow's colour. */}
      <Path d={ARROW_FAR} fill="#000000" fillOpacity={0.2} />
    </Svg>
  );
}

/** The mark with the name beside it, its S in the accent: the welcome page's masthead. */
export function SkipLogo() {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="Skip"
      className="flex-row items-center justify-center gap-2"
    >
      <SkipMark size={36} />
      <Text
        className="font-app-semibold text-[26px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        <Text className="text-accent-ink">S</Text>
        kip
      </Text>
    </View>
  );
}
