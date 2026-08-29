import { createElement } from 'react';
import { View } from 'react-native';

import { BrandLogo } from '@/components/brands/brand-logo';
import { getBillIcon } from '@/data/bills-mock';
import { useColors } from '@/providers/theme-provider';

type BillMarkProps = {
  categoryId?: string | null;
  /** Set when someone picked their own icon instead of the category's. */
  iconId?: string | null;
  /** The issuer's domain, when the bill has one. AEP, T-Mobile, Xfinity. */
  domain?: string | null;
  /** Falls back to a monogram tile when a logo will not load. */
  name?: string;
  size?: number;
};

/**
 * A bill's mark: its issuer's logo, or its category icon.
 *
 * Both, because bills are two different things wearing one name. The
 * electricity is from AEP and the phone is from T-Mobile — those are brands,
 * and a logo is what someone recognises fastest in a list. Rent, HOA fees and
 * a loan from a relative are not brands, and a monogram tile for them looks
 * like a logo that failed to load rather than a bill that never had one.
 *
 * So the logo is shown when there is a brand and the category icon when there
 * is not, and a bill that has never been given one looks exactly as it always
 * did.
 *
 * Sized and shaped to match BrandMark either way, because in a mixed list the
 * two sit next to each other and any difference reads as a mistake.
 */
export function BillMark({ categoryId, iconId, domain, name, size = 40 }: BillMarkProps) {
  const colors = useColors();

  if (domain) {
    return <BrandLogo name={name ?? ''} domain={domain} size={size} />;
  }

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
