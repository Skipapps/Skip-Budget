import { createElement } from 'react';
import { View } from 'react-native';

import { groupIconFor, groupTint } from '@/data/group-icons';
import { cn } from '@/lib/cn';

type GroupIconProps = {
  iconId?: string | null;
  /** Colours the well. Two groups sharing a glyph still look different. */
  groupId?: string | null;
  size?: number;
  className?: string;
};

/**
 * A group's icon, in a tinted well.
 *
 * The colour comes from the group's id, so it is stable, needs no column and
 * no picker, and a group made before colours existed still gets one.
 *
 * Falls back to the neutral glyph rather than drawing nothing, so retiring an
 * icon from the set cannot leave a hole on somebody's screen.
 */
export function GroupIcon({ iconId, groupId, size = 26, className }: GroupIconProps) {
  const tint = groupTint(groupId);
  const well = Math.round(size * 1.85);
  // createElement, not JSX, matching BillRow: this looks a component up rather
  // than defining one, but assigning it to a capitalised local trips the lint
  // rule against creating components during render.
  const icon = createElement(groupIconFor(iconId), {
    width: size,
    height: size,
    color: tint.fg,
  });

  return (
    <View
      style={{ width: well, height: well, backgroundColor: tint.bg }}
      className={cn('items-center justify-center rounded-[14px]', className)}
    >
      {icon}
    </View>
  );
}
