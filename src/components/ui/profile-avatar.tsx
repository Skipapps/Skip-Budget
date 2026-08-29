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
 * The account's face, or an invitation to pick one.
 *
 * Always drawn on a tinted circle rather than straight onto the page. The
 * artwork is transparent, so without one a pale avatar would dissolve into
 * light mode and a dark-outlined one into dark mode — and the ring is what
 * makes an unset avatar read as an empty slot rather than a missing image.
 *
 * An id the app no longer ships falls back to the placeholder, which is why
 * the column has no foreign key: retiring an avatar should not orphan a row.
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
