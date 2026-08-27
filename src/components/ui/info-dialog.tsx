import { Modal, Pressable, Text, View } from 'react-native';

import { shadows } from '@/theme/shadows';

type InfoDialogProps = {
  title: string;
  message: string;
  onClose: () => void;
};

/** Small explanatory dialog, styled like the app's other modals. */
export function InfoDialog({ title, message, onClose }: InfoDialogProps) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close"
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/40 px-8"
      >
        <Pressable
          onPress={() => {}}
          style={shadows.floating}
          className="w-full max-w-[340px] overflow-hidden rounded-[10px] bg-white"
        >
          <View className="px-5 pb-4 pt-5">
            <Text
              className="font-poppins-semibold text-[17px] text-ink"
              maxFontSizeMultiplier={1.3}
            >
              {title}
            </Text>
            <Text
              className="mt-2 font-poppins text-[15px] leading-6 text-body"
              maxFontSizeMultiplier={1.5}
            >
              {message}
            </Text>
          </View>

          <View className="flex-row justify-end px-3 pb-3">
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="rounded-[10px] px-5 py-3 active:bg-black/5"
            >
              <Text className="font-poppins-semibold text-[15px] text-ink">Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
