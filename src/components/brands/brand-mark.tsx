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
 * The logo for a list row, resolved from a merchant string.
 *
 * Rows store what the shop printed, not a brand id — older receipts and
 * anything typed by hand never had one. Looking the name up here keeps that
 * detail out of every row component, and the directory is one cached query
 * shared by all of them rather than a request per row.
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
