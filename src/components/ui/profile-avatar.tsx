import { Camera } from 'lucide-react-native';
import { Image, View } from 'react-native';

import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';
import { findAvatar } from '@/theme/avatars';

type ProfileAvatarProps = {
  avatarId?: string | null;
  size?: number;
  className?: string;
};

/**
 * The account's face, or an invitation to pick one. Always in a ringed circle: the avatars bring their
 * own round background, and the ring makes an unset avatar read as an empty slot, not a missing image.
 *
 * An id the app no longer ships falls back to the placeholder, which is why the column has no foreign key.
 */
export function ProfileAvatar({ avatarId, size = 48, className }: ProfileAvatarProps) {
  const colors = useColors();
  const avatar = findAvatar(avatarId);

  return (
    <View
      style={{ width: size, height: size }}
      className={cn(
        'items-center justify-center overflow-hidden rounded-full border border-line bg-ink/5',
        className,
      )}
    >
      {avatar ? (
        <Image
          source={avatar.source}
          style={{ width: size, height: size }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Camera size={Math.round(size * 0.42)} color={colors.muted} strokeWidth={1.8} />
      )}
    </View>
  );
}
