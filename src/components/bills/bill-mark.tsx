import { createElement } from 'react';
import { View } from 'react-native';

import { getBillIcon } from '@/data/bills-mock';
import { useColors } from '@/providers/theme-provider';

type BillMarkProps = {
  categoryId?: string | null;
  /** Set when someone picked their own icon instead of the category's. */
  iconId?: string | null;
  size?: number;
};

/**
 * A bill's icon, drawn where a brand logo would go.
 *
 * Bills have no merchant to look up — rent and car insurance are not brands —
 * so a monogram tile is the wrong answer for them: it looks like a logo that
 * failed to load. The category icon is the thing people already recognise from
 * the bills list, so it comes along wherever the bill appears.
 *
 * Sized and shaped to match BrandMark, because in a mixed list the two sit
 * next to each other and any difference reads as a mistake.
 */
export function BillMark({ categoryId, iconId, size = 40 }: BillMarkProps) {
  const colors = useColors();
  // createElement, not JSX: getBillIcon looks a component up rather than
  // defining one, and assigning it to a capitalised local trips the lint rule.
  const icon = createElement(
    getBillIcon({ categoryId: categoryId ?? 'other', iconId: iconId ?? undefined }),
    { width: Math.round(size * 0.5), height: Math.round(size * 0.5), color: colors.body },
  );

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center rounded-full border border-line bg-ink/5"
    >
      {icon}
    </View>
  );
}
