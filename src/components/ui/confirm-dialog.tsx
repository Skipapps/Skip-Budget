import { Modal, Pressable, Text, View } from 'react-native';

import { t, useLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { shadows } from '@/theme/shadows';

export type DialogAction = {
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
 * One choice plus Cancel sits side by side; three or more stack, since side by side truncates once
 * a label is longer than a word. The first choice is the filled pill (red if destructive), any other
 * is outlined. Cancel is an equal outlined pill beside a single choice and a quiet link under a stack.
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
  const cancelLabel = givenCancelLabel === undefined ? t('common.cancel') : givenCancelLabel;
  const choices = actions.length > 0 ? actions : [{ id: 'ok', label: t('common.ok') }];
  const showCancel = cancelLabel !== null && actions.length > 0;
  // Side by side only while every label fits half the card; longer ones end in "…" on a small phone.
  const labels = [...choices.map((choice) => choice.label), cancelLabel ?? ''];
  const sideBySide =
    showCancel && choices.length === 1 && labels.every((label) => label.length <= 12);

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
              maxFontSizeMultiplier={1.3}
            >
              {title}
            </Text>
            {message ? (
              <Text
                className="mt-2 font-app text-[15px] leading-6 text-body"
                maxFontSizeMultiplier={1.5}
              >
                {message}
              </Text>
            ) : null}
          </View>

          <View className={cn('gap-2.5 px-5 pb-5 pt-1', sideBySide ? 'flex-row' : 'w-full')}>
            {/* Stacked layouts put the way out last, away from the real choices. */}
            {sideBySide && showCancel ? (
              <DialogButton
                label={cancelLabel}
                variant="outline"
                sideBySide
                onPress={() => onResolve(null)}
              />
            ) : null}

            {choices.map((action, index) => (
              <DialogButton
                key={action.id}
                label={action.label}
                destructive={action.destructive}
                variant={index === 0 ? 'filled' : 'outline'}
                sideBySide={sideBySide}
                onPress={() => onResolve(action.id)}
              />
            ))}

            {!sideBySide && showCancel ? (
              <DialogButton label={cancelLabel} variant="link" onPress={() => onResolve(null)} />
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DialogButton({
  label,
  onPress,
  destructive,
  variant,
  sideBySide,
}: {
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
        'items-center justify-center rounded-full px-5',
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
      <Text
        className={cn(
          'text-center text-[15px]',
          variant === 'link' ? 'font-app-medium' : 'font-app-semibold',
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
        maxFontSizeMultiplier={1.4}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}
