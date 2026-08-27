import { Text, View, type ViewStyle } from 'react-native';

import { cn } from '@/lib/cn';
import { isLightColor } from '@/lib/color';
import { formatCurrency } from '@/lib/format';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

type CardFaceProps = {
  color: string;
  /** Holder name or bank name. */
  title: string;
  titlePlaceholder?: string;
  /** Network mark ("VISA") or account type ("Checking"). */
  meta: string;
  /** `mark` is the italic network wordmark; `label` is plain type. */
  metaStyle?: 'mark' | 'label';
  amount: number;
  last4: string;
  style?: ViewStyle;
};

/**
 * Shared visual shell for anything shown as a card — payment cards and bank
 * accounts. Type colour and the embossed wordmark are derived from the
 * background's luminance, so any palette colour stays readable.
 */
export function CardFace({
  color,
  title,
  titlePlaceholder,
  meta,
  metaStyle = 'label',
  amount,
  last4,
  style,
}: CardFaceProps) {
  const onLight = isLightColor(color);
  const foreground = onLight ? colors.ink : '#FFFFFF';
  const mutedForeground = onLight ? 'rgba(17,17,17,0.6)' : 'rgba(255,255,255,0.7)';
  const watermark = onLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)';
  // A white face would otherwise sit invisibly on a white screen.
  const needsOutline = color.toUpperCase() === '#FFFFFF';

  return (
    <View
      style={[
        shadows.card,
        { backgroundColor: color },
        needsOutline && { borderWidth: 1, borderColor: colors.line },
        style,
      ]}
      className="aspect-[1.62] w-full justify-between overflow-hidden rounded-[10px] p-5"
    >
      <Text
        pointerEvents="none"
        allowFontScaling={false}
        style={{ color: watermark }}
        className="absolute -bottom-4 left-3 font-poppins-bold text-[104px] leading-[120px]"
      >
        Skip
      </Text>

      <View>
        <View className="flex-row items-start justify-between gap-3">
          <Text
            style={{ color: title ? foreground : mutedForeground }}
            className="flex-1 font-poppins-medium text-[15px]"
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {title || titlePlaceholder || ' '}
          </Text>
          <Text
            allowFontScaling={false}
            style={{ color: metaStyle === 'mark' ? foreground : mutedForeground }}
            className={cn(
              metaStyle === 'mark'
                ? 'font-poppins-bold text-[18px] italic'
                : 'font-poppins-medium text-[13px]',
            )}
          >
            {meta}
          </Text>
        </View>

        <Text
          style={{ color: foreground }}
          className="mt-1.5 font-poppins-bold text-[26px]"
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {formatCurrency(amount, { cents: false })}
        </Text>
      </View>

      <Text
        style={{ color: mutedForeground }}
        className="font-poppins-medium text-[15px]"
        maxFontSizeMultiplier={1.2}
      >
        ••••{'  '}
        {last4 || '••••'}
      </Text>
    </View>
  );
}
