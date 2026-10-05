import type { ImageSourcePropType } from 'react-native';

/**
 * The faces someone can pick for their account.
 *
 * Bundled with the app rather than uploaded, which is the whole design: the
 * profile stores an id, nothing leaves the phone, and there is no bucket,
 * permission prompt or crop step between wanting a picture and having one.
 *
 * The fifteen Skip avatars, re-framed closer on the face (2026-10-04, from
 * "assets/New Avatars"). Same people in the same order as the set before, so
 * an id someone already picked lands on their own face, just closer. Shipped
 * as 512px palette PNGs: sharp at the 132pt they are ever drawn, a quarter of
 * the 1024px exports' weight. Unnamed on purpose; a screen reader hears their
 * number. `require` takes a literal path, so the list is written out.
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
