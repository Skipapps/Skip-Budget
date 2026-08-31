import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { useFriendRequests, useRespondToFriendRequest } from '@/api/splits';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { shadows } from '@/theme/shadows';

/**
 * A friend request, wherever somebody happens to be.
 *
 * Requests used to sit on the Friends screen and nowhere else, which meant the
 * only way to find one was to go looking for it — and nobody opens a Friends
 * screen speculatively. Since the request already arrives over the realtime
 * topic, showing it is a matter of drawing it rather than fetching anything.
 *
 * Mounted above the navigator and inside the lock, so it draws over any route
 * without ever appearing on a locked phone.
 *
 * Dismissing is not declining. Tapping outside says "not now" and the request
 * stays waiting on the Friends screen; only the buttons answer it. Someone who
 * flicks a sheet away by reflex should not have silently turned a person down.
 */
export function FriendRequestPopup() {
  const { data: requests } = useFriendRequests();
  const respond = useRespondToFriendRequest();

  // Session-only, and deliberately so. Persisting it would mean a request
  // waved away once could never resurface, and this is the only place most
  // people will ever see one.
  const [waved, setWaved] = useState<string[]>([]);

  const incoming = requests?.incoming ?? [];
  const next = incoming.find((request) => !waved.includes(request.id));

  if (!next) return null;

  const name = next.profile?.display_name || 'Someone on Skip';

  const answer = (accept: boolean) => {
    // Hidden immediately rather than on success. The mutation refreshes the
    // list, and leaving the card up until it lands makes a tap feel ignored.
    setWaved((current) => [...current, next.id]);
    respond.mutate({ id: next.id, accept });
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => setWaved((c) => [...c, next.id])}
    >
      <Pressable
        accessibilityLabel="Not now"
        onPress={() => setWaved((current) => [...current, next.id])}
        className="flex-1 items-center justify-center bg-black/40 px-8"
      >
        {/* Swallows the tap, so pressing the card itself does not dismiss it. */}
        <Pressable
          onPress={() => {}}
          style={shadows.floating}
          className="w-full max-w-[340px] items-center overflow-hidden rounded-[10px] bg-card px-5 pb-4 pt-6"
        >
          <ProfileAvatar avatarId={next.profile?.avatar_id ?? null} size={64} />

          <Text
            className="mt-4 text-center font-poppins-semibold text-[18px] leading-6 text-ink"
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {name}
          </Text>
          <Text
            className="mt-1.5 text-center font-poppins text-[14px] leading-5 text-body"
            maxFontSizeMultiplier={1.4}
          >
            wants to split bills with you on Skip.
          </Text>

          <View className="mt-5 w-full flex-row gap-2">
            <PopupButton label="Decline" onPress={() => answer(false)} />
            <PopupButton label="Accept" emphasis onPress={() => answer(true)} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not now"
            onPress={() => setWaved((current) => [...current, next.id])}
            className="mt-1 min-h-11 w-full items-center justify-center rounded-[10px] active:bg-ink/5"
          >
            <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
              Not now
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PopupButton({
  label,
  emphasis = false,
  onPress,
}: {
  label: string;
  emphasis?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={
        emphasis
          ? 'min-h-12 flex-1 items-center justify-center rounded-[10px] bg-control active:opacity-80'
          : 'min-h-12 flex-1 items-center justify-center rounded-[10px] border border-line active:bg-ink/5'
      }
    >
      <Text
        className={
          emphasis
            ? 'font-poppins-medium text-[15px] text-on-control'
            : 'font-poppins-medium text-[15px] text-ink'
        }
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        maxFontSizeMultiplier={1.4}
      >
        {label}
      </Text>
    </Pressable>
  );
}
