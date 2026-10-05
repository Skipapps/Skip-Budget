import { createElement } from 'react';
import { View } from 'react-native';

import { groupIconFor, groupTint } from '@/data/group-icons';
import { GLYPH_STROKE } from '@/data/glyphs';
import { cn } from '@/lib/cn';

type GroupIconProps = {
  iconId?: string | null;
  /** Colours the well. Two groups sharing a glyph still look different. */
  groupId?: string | null;
  size?: number;
  className?: string;
};

/**
 * A group's icon, in a tinted well. The tint comes from the group's id (stable, no column or
 * picker), and a retired icon falls back to the neutral glyph rather than leaving a hole.
 */
export function GroupIcon({ iconId, groupId, size = 26, className }: GroupIconProps) {
  const tint = groupTint(groupId);
  const well = Math.round(size * 1.85);
  // createElement, not JSX: a capitalised local for a looked-up component trips the lint rule.
  const icon = createElement(groupIconFor(iconId), {
    size,
    strokeWidth: GLYPH_STROKE,
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
