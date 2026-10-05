import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type BrandRow = {
  id: string;
  name: string;
  domain: string | null;
  category_id: string;
  logo_path: string | null;
  /** Present on directory rows; the search RPC does not return them. */
  aliases?: string[];
};

export type SpendCategoryRow = {
  id: string;
  label: string;
  hint: string | null;
};

/**
 * Ranked brand search for the store field. Matching runs in Postgres (trigram similarity) so typos
 * and missing apostrophes ("trader joes") match, which a client-side startsWith cannot.
 */
export function useBrandSearch(query: string) {
  const needle = query.trim();

  return useQuery({
    queryKey: ['brand-search', needle.toLowerCase()],
    // One character matches most of the catalog and tells the user nothing.
    enabled: needle.length >= 2,
    // The catalog is reference data; nothing invalidates it during a session.
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<BrandRow[]> => {
      const { data, error } = await supabase.rpc('search_brands', {
        p_query: needle,
        p_limit: 12,
      });
      if (error) throw error;
      return (data ?? []) as BrandRow[];
    },
  });
}

export function useSpendCategories() {
  return useQuery({
    queryKey: ['spend-categories'],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<SpendCategoryRow[]> => {
      const { data, error } = await supabase
        .from('spend_categories')
        .select('id, label, hint')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Category guess for a store the catalog does not know (a matched brand carries its own).
 * Deliberately small: a nudge toward the right bucket, and 'other' is a fine answer.
 */
const KEYWORD_CATEGORIES: [RegExp, string][] = [
  [/\b(market|grocer|grocery|supermarket|foods?|produce|butcher|bakery)\b/i, 'groceries'],
  [
    /\b(cafe|coffee|espresso|restaurant|grill|pizza|sushi|diner|bar|kitchen|bistro|deli)\b/i,
    'dining',
  ],
  [/\b(gas|fuel|petro|petrol|station|convenience)\b/i, 'fuel'],
  [/\b(pharmacy|drug|drugs|chemist|clinic|dental|dentist|medical|health)\b/i, 'pharmacy'],
  [/\b(salon|spa|barber|nails?|beauty|cosmetics)\b/i, 'beauty'],
  [/\b(vet|veterinary|pet|pets)\b/i, 'pets'],
  [/\b(gym|fitness|yoga|pilates|crossfit)\b/i, 'fitness'],
  [/\b(hardware|lumber|builders?|paint|garden|furniture)\b/i, 'home'],
  [/\b(electronics|computers?|phone|mobile|tech)\b/i, 'electronics'],
  [/\b(clothing|apparel|boutique|shoes?|fashion)\b/i, 'clothing'],
  [/\b(parking|transit|taxi|rail|airlines?|airways)\b/i, 'transport'],
];

export function guessCategory(merchant: string): string {
  const found = KEYWORD_CATEGORIES.find(([pattern]) => pattern.test(merchant));
  return found ? found[1] : 'other';
}

/**
 * The whole catalog, fetched once per session: a few tens of KB, cheaper than a query per list row
 * and usable offline. Reads the same table as the search RPC.
 */
export function useBrandDirectory() {
  return useQuery({
    queryKey: ['brand-directory'],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<BrandRow[]> => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, domain, category_id, logo_path, aliases')
        .order('rank', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BrandRow[];
    },
  });
}

/**
 * Finds the brand behind a merchant string. Receipts carry whatever the shop printed ("WM
 * SUPERCENTER", "THE HOME DEPOT #4021"), so matching walks strict to loose and stops at the first
 * hit, which keeps "Walmart" from being beaten by a longer alias on another brand.
 */
export function matchBrand(merchant: string, directory: BrandRow[]): BrandRow | null {
  const needle = merchant.trim().toLowerCase();
  if (!needle) return null;

  const names = (brand: BrandRow) => [brand.name.toLowerCase(), ...(brand.aliases ?? [])];

  const exact = directory.find((brand) => names(brand).includes(needle));
  if (exact) return exact;

  // Directory is rank-ordered, so the first containment hit is the most prominent brand.
  const contained = directory.find((brand) =>
    names(brand).some((name) => needle.includes(name) || name.includes(needle)),
  );
  return contained ?? null;
}
