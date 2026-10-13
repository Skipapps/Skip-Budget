import { useContext, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { SafeAreaInsetsContext, type EdgeInsets } from 'react-native-safe-area-context';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t, useLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';

type DialogAction = {
  id: string;
  label: string;
  /** Paints the action red. Reserved for things that cannot be undone. */
  destructive?: boolean;
};

export type DialogRequest = {
  title: string;
  message?: string;
  /** One to three choices. Omit for a plain acknowledgement. */
  actions?: DialogAction[];
  /** Text of the way out. Pass null when there is nothing to back out of. */
  cancelLabel?: string | null;
};

type ConfirmDialogProps = DialogRequest & {
  onResolve: (actionId: string | null) => void;
};

/** Points kept clear between the card and the safe area, above and below it. */
const EDGE_GAP = 16;

/** A dialog drawn outside the app's SafeAreaProvider, as in a test, has no insets to keep clear. */
const NO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** As tall as its words until the card reaches its ceiling; then it gives up height and scrolls. */
const TEXT_AREA: ViewStyle = { flexGrow: 0, flexShrink: 1 };

/**
 * The app's own confirmation dialog; `Alert.alert` would draw the system's.
 *
 * One choice plus Cancel sits side by side while both labels fit their half of the card on one line,
 * measured at the text size in use; otherwise, and always for three or more, the buttons stack and
 * every label wraps whole. The first choice is the filled pill (red if destructive), any other is
 * outlined. Cancel is an equal outlined pill beside a single choice and a quiet link under a stack.
 *
 * The card never runs past the safe area. When the title and message are taller than the room left
 * above the buttons, only they scroll, so every button stays on screen at any text size.
 */
export function ConfirmDialog({
  title,
  message,
  actions = [],
  cancelLabel: givenCancelLabel,
  onResolve,
}: ConfirmDialogProps) {
  // The dialog host sits at the root, outside every screen's remount, so this follows the language itself.
  useLocale();
  const pair = useFitGroup({ mode: 'switch' });
  const cancelLabel = givenCancelLabel === undefined ? t('common.cancel') : givenCancelLabel;
  const choices = actions.length > 0 ? actions : [{ id: 'ok', label: t('common.ok') }];
  const showCancel = cancelLabel !== null && actions.length > 0;
  const sideBySide = showCancel && choices.length === 1 && pair.fits;

  const { height: windowHeight } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext) ?? NO_INSETS;
  // The same room above and below, so a dialog that fits stays centred where it always was.
  const edge = Math.max(insets.top, insets.bottom) + EDGE_GAP;

  const words = useRef<ScrollView>(null);
  const room = useRef({ box: 0, content: 0, flashed: false });
  // iOS only shows a scroll bar while scrolling; flashing it once says there is more to read.
  const noteRoom = (part: 'box' | 'content', height: number) => {
    room.current[part] = height;
    const { box, content, flashed } = room.current;
    if (!flashed && box > 0 && content > box + 1) {
      room.current.flashed = true;
      words.current?.flashScrollIndicators();
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onResolve(null)}>
      <Pressable
        accessibilityLabel={t('ui.dismiss')}
        onPress={() => onResolve(null)}
        className="flex-1 items-center justify-center bg-black/40 px-8"
        style={{ paddingVertical: edge }}
      >
        {/* Swallows the tap so pressing the card itself does not dismiss it. */}
        <Pressable
          onPress={() => {}}
          style={[shadows.floating, { maxHeight: windowHeight - 2 * edge }]}
          className="w-full max-w-[340px] overflow-hidden rounded-[16px] bg-card"
        >
          <ScrollView
            ref={words}
            testID="dialog-words"
            style={TEXT_AREA}
            // A dialog that fits does not move under a finger.
            alwaysBounceVertical={false}
            onLayout={(event) => noteRoom('box', event.nativeEvent.layout.height)}
            onContentSizeChange={(_, height) => noteRoom('content', height)}
          >
            <View className="px-5 pb-4 pt-5">
              <Text
                className="font-app-semibold text-[17px] leading-6 text-ink"
                maxFontSizeMultiplier={TEXT_CAP.heading}
              >
                {title}
              </Text>
              {message ? (
                <Text
                  className="mt-2 font-app text-[15px] leading-6 text-body"
                  maxFontSizeMultiplier={TEXT_CAP.reading}
                >
                  {message}
                </Text>
              ) : null}
            </View>
          </ScrollView>

          <FitGroup
            group={pair}
            className={cn('w-full gap-2.5 px-5 pb-5 pt-1', sideBySide && 'flex-row')}
          >
            {/* Stacked layouts put the way out last, away from the real choices. */}
            {sideBySide && showCancel ? (
              <DialogButton
                id="cancel"
                label={cancelLabel}
                variant="outline"
                sideBySide
                onPress={() => onResolve(null)}
              />
            ) : null}

            {choices.map((action, index) => (
              <DialogButton
                key={action.id}
                id={`choice-${index}`}
                label={action.label}
                destructive={action.destructive}
                variant={index === 0 ? 'filled' : 'outline'}
                sideBySide={sideBySide}
                onPress={() => onResolve(action.id)}
              />
            ))}

            {!sideBySide && showCancel ? (
              <DialogButton
                id="cancel"
                label={cancelLabel}
                variant="link"
                onPress={() => onResolve(null)}
              />
            ) : null}
          </FitGroup>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DialogButton({
  id,
  label,
  onPress,
  destructive,
  variant,
  sideBySide,
}: {
  /** Names its fit slot; the same in every language, unlike the label. */
  id: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  /** `filled` is the choice, `outline` another choice, `link` the way out. */
  variant: 'filled' | 'outline' | 'link';
  sideBySide?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'items-center justify-center rounded-full px-5 py-2',
        sideBySide ? 'min-w-0 flex-1' : 'w-full',
        variant === 'link' ? 'min-h-11 active:bg-ink/5' : 'min-h-12',
        variant === 'filled' &&
          (destructive ? 'bg-danger active:opacity-80' : 'bg-control active:bg-control-pressed'),
        variant === 'outline' &&
          (destructive
            ? 'border border-danger active:bg-danger/10'
            : 'border border-control active:bg-ink/5'),
      )}
    >
      <FitText
        id={id}
        whole
        role="row"
        size={15}
        // One weight for every variant: Cancel is measured as an outlined pill and drawn as a link,
        // and a width that changed with the layout would send the pair back and forth.
        className={cn(
          'text-center font-app-semibold',
          variant === 'filled'
            ? destructive
              ? // The page colour, not white: the dark theme's red is light and white on it fails contrast.
                'text-surface'
              : 'text-on-control'
            : destructive
              ? 'text-danger'
              : variant === 'outline'
                ? 'text-ink'
                : 'text-muted',
        )}
        slotClassName="w-full"
      >
        {label}
      </FitText>
    </Pressable>
  );
}
