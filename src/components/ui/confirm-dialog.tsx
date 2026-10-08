import { Modal, Pressable, Text, View } from 'react-native';

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

/**
 * The app's own confirmation dialog; `Alert.alert` would draw the system's.
 *
 * One choice plus Cancel sits side by side while both labels fit their half of the card on one line,
 * measured at the text size in use; otherwise, and always for three or more, the buttons stack and
 * every label wraps whole. The first choice is the filled pill (red if destructive), any other is
 * outlined. Cancel is an equal outlined pill beside a single choice and a quiet link under a stack.
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

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onResolve(null)}>
      <Pressable
        accessibilityLabel={t('ui.dismiss')}
        onPress={() => onResolve(null)}
        className="flex-1 items-center justify-center bg-black/40 px-8"
      >
        {/* Swallows the tap so pressing the card itself does not dismiss it. */}
        <Pressable
          onPress={() => {}}
          style={shadows.floating}
          className="w-full max-w-[340px] overflow-hidden rounded-[16px] bg-card"
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
