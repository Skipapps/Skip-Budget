import { Text, View, type ViewStyle } from 'react-native';

import { FitFigure } from '@/components/ui/fit-group';
import { cn } from '@/lib/cn';
import { isLightColor } from '@/lib/color';
import { contrast } from '@/lib/tone';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { colors as fixedTones } from '@/theme/colors';
import { TEXT_CAP } from '@/theme/text-scale';

type CardFaceProps = {
  color: string;
  /** Holder name or bank name. */
  title: string;
  titlePlaceholder?: string;
  /** Network mark ("VISA") or account type ("Checking"). */
  meta: string;
  /** `mark` is the network wordmark; `badge` is the account type in a pill. */
  metaStyle?: 'mark' | 'badge';
  /** Signed for display: negative is money owed, positive is money held. */
  amount: number;
  caption: string;
  /** How full the bar under the figure is, 0 to 1; no bar when omitted. */
  share?: number;
  /** The line at the bottom left: a card's limit, an account's last update. */
  footnote?: string | null;
  last4: string;
  style?: ViewStyle;
};

/**
 * Shared shell for payment cards and bank accounts. Its height is its content's, so larger text
 * makes it taller and nothing on it is cut. Type colour and the watermark derive from the
 * background's luminance, so any palette colour stays readable.
 */
export function CardFace({
  color,
  title,
  titlePlaceholder,
  meta,
  metaStyle = 'badge',
  amount,
  caption,
  share,
  footnote,
  last4,
  style,
}: CardFaceProps) {
  const colors = useColors();
  const onLight = isLightColor(color);
  // The fixed ink, not the theme's: a face keeps its colour in dark mode, where the theme's ink is
  // near white.
  const foreground = onLight ? fixedTones.ink : '#FFFFFF';
  const mutedForeground = onLight ? 'rgba(17,17,17,0.6)' : 'rgba(255,255,255,0.9)';
  const watermark = onLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';
  const tint = onLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.16)';
  const track = onLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.25)';
  // A face the colour of the page (white in light mode, black in dark) would otherwise vanish.
  const needsOutline = contrast(color, colors.surface) < 1.5;

  return (
    <View
      style={[
        { backgroundColor: color },
        needsOutline && { borderWidth: 1, borderColor: colors.line },
        style,
      ]}
      className="w-full overflow-hidden rounded-[10px] p-[20px]"
      testID="card-face"
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        // Lifted off the line box's centre so the ink, which sits low in it, is centred on the face.
        className="absolute bottom-0 right-[16px] top-0 justify-center pb-[14px]"
      >
        <Text
          allowFontScaling={false}
          style={{ color: watermark, letterSpacing: -3 }}
          className="font-app-bold text-[64px] leading-[78px]"
        >
          Skip
        </Text>
      </View>

      <View className="min-h-[24px] flex-row items-center justify-between gap-3">
        <Text
          style={{ color: title ? foreground : mutedForeground }}
          className="min-w-0 flex-1 font-app text-[15px]"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {title || titlePlaceholder || ' '}
        </Text>
        {metaStyle === 'mark' ? (
          // A network wordmark is a logo: it stays its size and is never translated.
          <Text
            allowFontScaling={false}
            style={{ color: foreground, letterSpacing: 1.5 }}
            className="shrink-0 font-app-bold text-[13px]"
          >
            {meta.toUpperCase()}
          </Text>
        ) : (
          <View style={{ backgroundColor: tint }} className="shrink-0 rounded-full px-[10px] py-1">
            <Text
              style={{ color: foreground }}
              className="font-app-semibold text-[12px]"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {meta}
            </Text>
          </View>
        )}
      </View>

      <Text
        style={{ color: mutedForeground }}
        className="mt-[24px] font-app text-[12px]"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {caption}
      </Text>

      {/* The face's own foreground, never red or green: the caption and the minus sign already say
          which way the money runs. */}
      <FitFigure
        id="balance"
        size={31}
        className="font-app-bold"
        style={{ color: foreground }}
        boxClassName="mt-[4px]"
      >
        {formatCurrency(amount, { cents: false })}
      </FitFigure>

      {share !== undefined ? (
        <View
          testID="card-limit-bar"
          style={{ backgroundColor: track }}
          className="mt-[32px] h-[4px] w-full overflow-hidden rounded-full"
        >
          <View
            testID="card-limit-fill"
            style={{
              backgroundColor: foreground,
              width: `${Math.min(1, Math.max(0, share)) * 100}%` as const,
            }}
            className="h-full rounded-full"
          />
        </View>
      ) : null}

      <View
        className={cn(
          'flex-row items-end justify-between gap-3',
          share !== undefined ? 'mt-[8px]' : 'mt-[24px]',
        )}
      >
        {footnote ? (
          <Text
            style={{ color: mutedForeground }}
            className="min-w-0 flex-1 font-app text-[12px]"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {footnote}
          </Text>
        ) : (
          <View className="flex-1" />
        )}
        <Text
          style={{ color: foreground }}
          className="shrink-0 font-app-medium text-[13px]"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {`•••• ${last4 || '••••'}`}
        </Text>
      </View>
    </View>
  );
}
