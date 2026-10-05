import { matchBrand, useBrandDirectory } from '@/api/brands';
import { BrandLogo } from '@/components/brands/brand-logo';

type BrandMarkProps = {
  /** Merchant or service exactly as it was saved. */
  name: string;
  /** Set when the row already knows its brand; skips the lookup. */
  domain?: string | null;
  size?: number;
};

/**
 * The logo for a list row, resolved from a merchant string: rows store what the shop printed, not a
 * brand id. Looking it up here keeps that out of every row, and the directory is one cached query.
 */
export function BrandMark({ name, domain, size = 44 }: BrandMarkProps) {
  const { data: directory = [] } = useBrandDirectory();
  const matched = domain ? null : matchBrand(name, directory);

  return (
    <BrandLogo
      name={name}
      domain={domain ?? matched?.domain}
      logoPath={matched?.logo_path}
      size={size}
      className="border border-line"
    />
  );
}
