import { Text, View } from 'react-native';

import { ProfileAvatar } from '@/components/ui/profile-avatar';

type PersonProps = {
  name: string;
  avatarId?: string | null;
  /** A second line — what they owe, or that they have not joined yet. */
  subtitle?: string | null;
  size?: number;
  /** Tints the second line the way an amount owed is tinted elsewhere. */
  accent?: boolean;
};

/**
 * A face and a name, wherever a person appears.
 *
 * Split screens are lists of people, and a column of identical text is hard to
 * scan — the picture is what makes a row findable at a glance. Everything that
 * lists people uses this, so a name is presented the same way on every screen
 * and only the trailing control differs.
 */
export function Person({ name, avatarId, subtitle, size = 40, accent = false }: PersonProps) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-3">
      <ProfileAvatar avatarId={avatarId ?? null} size={size} />
      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {name}
        </Text>
        {subtitle ? (
          <Text
            className={
              accent
                ? 'mt-0.5 font-poppins text-[12px] text-accent-ink'
                : 'mt-0.5 font-poppins text-[12px] text-muted'
            }
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
