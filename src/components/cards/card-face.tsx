import { Text, View, type ViewStyle } from 'react-native';

import { FitFigure } from '@/components/ui/fit-group';
import { cn } from '@/lib/cn';
import { isLightColor } from '@/lib/color';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';

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
 * A payment card's proportions (1.78 : 1) at the least. Padding in percent is taken from the
 * parent's width, so the face only grows taller when larger text needs the room.
 */
const CARD_RATIO: ViewStyle = { width: 0, paddingTop: '56.18%' };

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
  const mark = metaStyle === 'mark';

  return (
    <View
      style={[
        shadows.card,
        { backgroundColor: color },
        needsOutline && { borderWidth: 1, borderColor: colors.line },
        style,
      ]}
      className="w-[94%] flex-row self-center overflow-hidden rounded-[14px]"
    >
      <Text
        pointerEvents="none"
        allowFontScaling={false}
        style={{ color: watermark }}
        className="absolute -bottom-3 left-3 font-app-bold text-[80px] leading-[92px]"
      >
        Skip
      </Text>

      <View style={CARD_RATIO} />

      <View className="min-w-0 flex-1 justify-between p-4">
        <View>
          <View className="flex-row items-start justify-between gap-3">
            <Text
              style={{ color: title ? foreground : mutedForeground }}
              className="min-w-0 flex-1 font-app-medium text-[14px]"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {title || titlePlaceholder || ' '}
            </Text>
            {/* The network wordmark is a logo and stays its size; an account type is words. */}
            <Text
              allowFontScaling={mark ? false : undefined}
              maxFontSizeMultiplier={mark ? undefined : TEXT_CAP.control}
              style={{ color: mark ? foreground : mutedForeground }}
              className={cn(
                'shrink-0',
                mark ? 'font-app-bold text-[16px] italic' : 'font-app-medium text-[12px]',
              )}
            >
              {meta}
            </Text>
          </View>

          {caption ? (
            <Text
              style={{ color: mutedForeground }}
              className="mt-1.5 font-app-medium text-[10px] uppercase tracking-wide"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {caption}
            </Text>
          ) : null}

          {/* The face's own foreground, never red or green: "Owed" and the minus sign already say
              which way the money runs. */}
          <FitFigure
            id="balance"
            size={22}
            className="font-app-bold"
            style={{ color: foreground }}
            boxClassName={caption ? 'mt-0.5' : 'mt-1'}
          >
            {formatCurrency(amount, { cents: false })}
          </FitFigure>
        </View>

        <Text
          style={{ color: mutedForeground }}
          className="font-app-medium text-[13px]"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          ••••{'  '}
          {last4 || '••••'}
        </Text>
      </View>
    </View>
  );
}
