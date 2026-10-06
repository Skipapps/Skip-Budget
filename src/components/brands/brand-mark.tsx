import { matchBrand, useBrandDirectory } from '@/api/brands';
import { BrandLogo } from '@/components/brands/brand-logo';

type BrandMarkProps = {
  /** Merchant or service exactly as it was saved. */
  name: string;
  /** Set when the row already knows its logo; skips the lookup. */
  domain?: string | null;
  /**
   * The owner chose letters. Skips the name lookup too, or a catalog brand whose name the store
   * contains would put back the logo they turned off.
   */
  hidden?: boolean | null;
  size?: number;
};

/**
 * The logo for a list row, resolved from a merchant string when the row has none: rows store what
 * the shop printed, not a brand id. Looking it up here keeps that out of every row, and the
 * directory is one cached query.
 */
export function BrandMark({ name, domain, hidden, size = 44 }: BrandMarkProps) {
  const { data: directory = [] } = useBrandDirectory();
  const matched = hidden || domain ? null : matchBrand(name, directory);

  return (
    <BrandLogo
      name={name}
      domain={hidden ? null : (domain ?? matched?.domain)}
      size={size}
      className="border border-line"
    />
  );
}
