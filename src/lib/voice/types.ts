/**
 * The voice parser's public shapes.
 *
 * `import type` only: `@/api/brands` pulls Supabase and React Query in at
 * runtime, and this folder must stay plain code that Jest can run without
 * either.
 */
import type { BrandRow } from '@/api/brands';

export type { BrandRow };

export type VoiceKind = 'receipt' | 'bill' | 'subscription';
export type VoiceCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** Structurally the same as BrandSelection in src/components/brands/brand-field.tsx. */
export type VoiceMerchant = {
  brandId: string | null;
  name: string;
  domain: string | null;
  categoryId: string;
};

export type VoiceMissing = 'amount' | 'merchant' | 'date' | 'cycle' | 'category';

/**
 * How the merchant was found:
 * - `learned`: through the person's own corrections (`ctx.aliases`);
 * - `catalog`: an exact name or alias in the brand directory;
 * - `fuzzy`: a near miss of a directory name ("spot a fly" → Spotify);
 * - `heard`: no brand; the words after "at"/"from", used as said.
 * Null exactly when `merchant` is null.
 */
export type VoiceMerchantSource = 'learned' | 'catalog' | 'fuzzy' | 'heard';

export type VoiceDraft = {
  kind: VoiceKind;
  /**
   * True when something said decided the kind — a keyword, a cycle, the
   * merchant's line of business — or `forceKind` set it; false when it fell
   * back to receipt.
   */
  kindSure: boolean;
  /** Dollars, cent-exact (via money.ts). Null when no amount was heard. */
  amount: number | null;
  /** Two or more when the amount is ambiguous; the review page asks. Otherwise empty. */
  amountChoices: number[];
  merchant: VoiceMerchant | null;
  /**
   * The words taken as the merchant, as heard, before learned aliases or the
   * brand directory touched them ("spot a fly" for Spotify). Null when no
   * merchant was found. Feed it to `learnAlias` when the person corrects the
   * merchant.
   */
  merchantHeard: string | null;
  /** See VoiceMerchantSource. Never learn a correction when this is `catalog`. */
  merchantSource: VoiceMerchantSource | null;
  /** yyyy-mm-dd, only when a date was actually spoken. Direction depends on kind and tense. */
  date: string | null;
  /** Bills and subscriptions only. Null when not said. */
  cycle: VoiceCycle | null;
  /** Bills only: a BILL_CATEGORIES id, or null when nothing mapped. */
  billCategoryId: string | null;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  /** What the review page should highlight as still needed. */
  missing: VoiceMissing[];
  /** The alternative that won, as heard (for "You said: …"). */
  transcript: string;
  /**
   * True when the sentence clearly holds two or more separate transactions
   * ("Netflix 15.99 and Spotify 11.99"). The page asks for one at a time
   * instead of offering a review; the other fields describe what was heard
   * and must not be saved as one entry. Rule: src/lib/voice/multiple.ts.
   */
  multiple: boolean;
};

export type VoiceContext = {
  /** yyyy-mm-dd, injected so tests are deterministic. */
  today: string;
  directory: BrandRow[];
  /** Learned corrections, heard phrase → canonical merchant/brand name. */
  aliases: Record<string, string>;
  /**
   * The kind the person picked on the review page. When set, the parser does
   * not detect a kind: date direction, bill category, cycle and the default
   * for an ambiguous amount all follow this one.
   */
  forceKind?: VoiceKind;
};
