import type { ImageSourcePropType } from 'react-native';

/**
 * Bundled with the app: the profile stores an id, nothing is uploaded. Ids are stable, so a saved
 * id keeps pointing at the same face. `require` takes a literal path, so the list is written out.
 */

export type Avatar = {
  id: string;
  /** Read aloud by a screen reader. */
  label: string;
  source: ImageSourcePropType;
};

const SOURCES: ImageSourcePropType[] = [
  require('@/assets/avatars/avatar-01.png'),
  require('@/assets/avatars/avatar-02.png'),
  require('@/assets/avatars/avatar-03.png'),
  require('@/assets/avatars/avatar-04.png'),
  require('@/assets/avatars/avatar-05.png'),
  require('@/assets/avatars/avatar-06.png'),
  require('@/assets/avatars/avatar-07.png'),
  require('@/assets/avatars/avatar-08.png'),
  require('@/assets/avatars/avatar-09.png'),
  require('@/assets/avatars/avatar-10.png'),
  require('@/assets/avatars/avatar-11.png'),
  require('@/assets/avatars/avatar-12.png'),
  require('@/assets/avatars/avatar-13.png'),
  require('@/assets/avatars/avatar-14.png'),
  require('@/assets/avatars/avatar-15.png'),
];

export const AVATARS: Avatar[] = SOURCES.map((source, index) => ({
  id: `avatar-${String(index + 1).padStart(2, '0')}`,
  label: `Avatar ${index + 1}`,
  source,
}));

/** The chosen avatar, or null for an id the app no longer ships. */
export function findAvatar(id: string | null | undefined): Avatar | null {
  if (!id) return null;
  return AVATARS.find((avatar) => avatar.id === id) ?? null;
}
