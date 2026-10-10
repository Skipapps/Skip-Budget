import { createElement } from 'react';
import { View } from 'react-native';

import { BillIcon } from '@/components/bills/bill-icon';
import { BrandLogo } from '@/components/brands/brand-logo';
import { billIconOf, getBillIcon } from '@/data/bill-categories';
import { GLYPH_STROKE } from '@/data/glyphs';
import { useColors } from '@/providers/theme-provider';

type BillMarkProps = {
  categoryId?: string | null;
  /** Set when someone picked their own icon instead of the category's. */
  iconId?: string | null;
  domain?: string | null;
  /** Falls back to a monogram tile when a logo will not load. */
  name?: string;
  size?: number;
};

/**
 * A bill's mark: its issuer's logo when it has a brand (AEP, T-Mobile), else a saved loan's type,
 * else its category's gradient icon, since rent or HOA fees are not brands and a monogram would look
 * like a logo that failed to load. A spending category (Insights lists them beside bills) keeps its
 * glyph. Matches BrandMark in size and shape because the two sit side by side in a mixed list.
 */
export function BillMark({ categoryId, iconId, domain, name, size = 40 }: BillMarkProps) {
  const colors = useColors();
  const choice = billIconOf({ categoryId: categoryId ?? 'other', iconId });

  // createElement, not JSX: a capitalised local for a looked-up component trips the lint rule.
  const icon = choice ? (
    <BillIcon choice={choice} size={Math.round(size * 0.6)} />
  ) : (
    createElement(getBillIcon({ categoryId: categoryId ?? 'other', iconId: iconId ?? undefined }), {
      size: Math.round(size * 0.5),
      strokeWidth: GLYPH_STROKE,
      color: colors.body,
    })
  );

  const glyph = (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center rounded-full border border-line bg-ink/5"
    >
      {icon}
    </View>
  );

  // A logo that will not load falls back to the glyph too, so "no logo" looks the same either way.
  return domain ? (
    <BrandLogo name={name ?? ''} domain={domain} size={size} fallback={glyph} />
  ) : (
    glyph
  );
}
