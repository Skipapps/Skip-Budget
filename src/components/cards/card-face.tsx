import { Text, View, type ViewStyle } from 'react-native';

import { cn } from '@/lib/cn';
import { isLightColor } from '@/lib/color';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
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
  /** Signed for display: negative is money owed, positive is money held. */
  amount: number;
  caption?: string;
  last4: string;
  style?: ViewStyle;
};

/**
 * Shared shell for payment cards and bank accounts. Type colour and the embossed wordmark derive
 * from the background's luminance, so any palette colour stays readable.
 */
export function CardFace({
  color,
  title,
  titlePlaceholder,
  meta,
  metaStyle = 'label',
  amount,
  caption,
  last4,
  style,
}: CardFaceProps) {
  const colors = useColors();
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
      className="aspect-[1.78] w-[94%] justify-between self-center overflow-hidden rounded-[14px] p-4"
    >
      <Text
        pointerEvents="none"
        allowFontScaling={false}
        style={{ color: watermark }}
        className="absolute -bottom-3 left-3 font-app-bold text-[80px] leading-[92px]"
      >
        Skip
      </Text>

      <View>
        <View className="flex-row items-start justify-between gap-3">
          <Text
            style={{ color: title ? foreground : mutedForeground }}
            className="flex-1 font-app-medium text-[14px]"
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
                ? 'font-app-bold text-[16px] italic'
                : 'font-app-medium text-[12px]',
            )}
          >
            {meta}
          </Text>
        </View>

        {caption ? (
          <Text
            style={{ color: mutedForeground }}
            className="mt-1.5 font-app-medium text-[10px] uppercase tracking-wide"
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {caption}
          </Text>
        ) : null}

        {/* The face's own foreground, never red or green: "Owed" and the minus sign already say
            which way the money runs. */}
        <Text
          style={{ color: foreground }}
          className={cn('font-app-bold text-[22px]', caption ? 'mt-0.5' : 'mt-1')}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {formatCurrency(amount, { cents: false })}
        </Text>
      </View>

      <Text
        style={{ color: mutedForeground }}
        className="font-app-medium text-[13px]"
        maxFontSizeMultiplier={1.2}
      >
        ••••{'  '}
        {last4 || '••••'}
      </Text>
    </View>
  );
}
