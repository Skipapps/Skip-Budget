/**
 * The per-row logo columns on receipts, subscriptions and bills, plus the catalog brand they were
 * filed under. Every field is optional so a row read before those columns existed still fits.
 */
export type LogoFields = {
  logo_hidden?: boolean | null;
  logo_domain?: string | null;
  brands?: { domain: string | null } | null;
};

const present = (value: string | null | undefined): string | null =>
  value?.trim().toLowerCase() || null;

/**
 * Which website's logo to show for a row, or null for the letter monogram.
 *
 * The owner's choice beats the catalog's, and "use letters" beats both. The push function keeps a
 * copy of this rule (logoDomainOf in supabase/functions/send-push/card.ts, which cannot import from
 * the app); push-card.test.ts holds the two to the same answers.
 */
export function logoDomainOf(row: LogoFields): string | null {
  if (row.logo_hidden) return null;
  return present(row.logo_domain) ?? present(row.brands?.domain);
}
