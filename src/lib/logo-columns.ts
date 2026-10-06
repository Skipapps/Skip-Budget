import type { BrandSelection } from '@/components/brands/brand-field';
import { logoDomainOf, type LogoFields } from '@/lib/logo-domain';

/** The website whose logo a store field's selection shows, by the same rule as a saved row. */
export function selectionLogo(selection: BrandSelection): string | null {
  return logoDomainOf({
    logo_hidden: selection.logoHidden,
    logo_domain: selection.logoDomain,
    brands: { domain: selection.domain },
  });
}

/**
 * The logo columns to save with a selection, given what the row holds now (nothing for a new one).
 * Empty when the field chose nothing, so an edit that kept its store never overwrites the row's
 * logo, and empty when the choice is what is already there, so an ordinary save does not depend
 * on the columns existing.
 */
export function logoColumns(
  selection: BrandSelection | Pick<BrandSelection, 'logoDomain' | 'logoHidden'> | null,
  before?: Omit<LogoFields, 'brands'> | null,
): Partial<{ logo_domain: string | null; logo_hidden: boolean }> {
  if (!selection || (selection.logoDomain === undefined && selection.logoHidden === undefined)) {
    return {};
  }
  const next = {
    logo_domain: selection.logoDomain ?? null,
    logo_hidden: selection.logoHidden ?? false,
  };
  const same =
    next.logo_domain === (before?.logo_domain ?? null) &&
    next.logo_hidden === Boolean(before?.logo_hidden);
  return same ? {} : next;
}
