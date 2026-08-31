import { createElement } from 'react';
import { View } from 'react-native';

import { BILL_ICON_CHOICES } from '@/data/bills-mock';
import { cn } from '@/lib/cn';

const BY_ID = new Map(BILL_ICON_CHOICES.map((choice) => [choice.id, choice.icon]));

/** The neutral choice, and the one a retired id falls back to. */
const FALLBACK = BY_ID.get('other')!;

type GroupIconProps = {
  iconId?: string | null;
  size?: number;
  color: string;
  className?: string;
};

/**
 * A group's icon, in its own tinted well.
 *
 * Falls back to the neutral glyph rather than drawing nothing, so a group made
 * before icons existed still looks deliberate — and so retiring an icon from
 * the set cannot leave a hole on somebody's screen.
 */
export function GroupIcon({ iconId, size = 26, color, className }: GroupIconProps) {
  const well = Math.round(size * 1.85);
  // createElement, not JSX, matching BillRow: this looks a component up rather
  // than defining one, but assigning it to a capitalised local trips the lint
  // rule against creating components during render.
  const icon = createElement((iconId ? BY_ID.get(iconId) : undefined) ?? FALLBACK, {
    width: size,
    height: size,
    color,
  });

  return (
    <View
      style={{ width: well, height: well }}
      className={cn('items-center justify-center rounded-full bg-ink/5', className)}
    >
      {icon}
    </View>
  );
}
