import { Modal, Pressable, Text, View } from 'react-native';

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
 * The app's own confirmation dialog.
 *
 * Alert.alert draws the system's dialog, which arrives in San Francisco with
 * the system's blues and corner radii — recognisably not this app. This is the
 * same modal language as InfoDialog: Poppins, the ink and coral palette, the
 * app's 10px corners.
 *
 * Two choices sit side by side because that is one glance. Three or more stack,
 * because three side by side truncates the moment a label is longer than a word.
 */
export function ConfirmDialog({
  title,
  message,
  actions = [],
  cancelLabel = 'Cancel',
  onResolve,
}: ConfirmDialogProps) {
  const choices = actions.length > 0 ? actions : [{ id: 'ok', label: 'OK' }];
  const showCancel = cancelLabel !== null && actions.length > 0;
  const sideBySide = showCancel && choices.length === 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onResolve(null)}>
      <Pressable
        accessibilityLabel="Dismiss"
        onPress={() => onResolve(null)}
        className="flex-1 items-center justify-center bg-black/40 px-8"
      >
        {/* Swallows the tap so pressing the card itself does not dismiss it. */}
        <Pressable
          onPress={() => {}}
          style={shadows.floating}
          className="w-full max-w-[340px] overflow-hidden rounded-[10px] bg-card"
        >
          <View className="px-5 pb-4 pt-5">
            <Text
              className="font-poppins-semibold text-[17px] leading-6 text-ink"
              maxFontSizeMultiplier={1.3}
            >
              {title}
            </Text>
            {message ? (
              <Text
                className="mt-2 font-poppins text-[15px] leading-6 text-body"
                maxFontSizeMultiplier={1.5}
              >
                {message}
              </Text>
            ) : null}
          </View>

          <View className={cn('gap-2 px-3 pb-3', sideBySide ? 'flex-row justify-end' : 'w-full')}>
            {/* Stacked layouts put the way out last, where a thumb rests and
                where it cannot be hit while reaching for the real choice. */}
            {sideBySide && showCancel ? (
              <DialogButton label={cancelLabel} onPress={() => onResolve(null)} />
            ) : null}

            {choices.map((action) => (
              <DialogButton
                key={action.id}
                label={action.label}
                destructive={action.destructive}
                emphasis
                fullWidth={!sideBySide}
                onPress={() => onResolve(action.id)}
              />
            ))}

            {!sideBySide && showCancel ? (
              <DialogButton label={cancelLabel} fullWidth onPress={() => onResolve(null)} />
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
  emphasis,
  fullWidth,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  emphasis?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'min-h-12 items-center justify-center rounded-[10px] px-5 active:bg-ink/5',
        fullWidth && 'w-full',
      )}
    >
      <Text
        className={cn(
          'text-[15px]',
          emphasis ? 'font-poppins-semibold' : 'font-poppins-medium',
          destructive ? 'text-red-600' : emphasis ? 'text-ink' : 'text-muted',
        )}
        maxFontSizeMultiplier={1.4}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
