// `import type` only: `@/api/brands` pulls Supabase and React Query in at runtime, which this
// folder must not.
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
   * True when something said (a keyword, cycle or merchant) or `forceKind` decided the kind; false on
   * the receipt fallback.
   */
  kindSure: boolean;
  /** Dollars, cent-exact (via money.ts). Null when no amount was heard. */
  amount: number | null;
  /** Two or more when the amount is ambiguous; the review page asks. Otherwise empty. */
  amountChoices: number[];
  merchant: VoiceMerchant | null;
  /** The words taken as the merchant, as heard ("spot a fly"). Feed to `learnAlias` on correction. */
  merchantHeard: string | null;
  /** Never learn a correction when this is `catalog`. */
  merchantSource: VoiceMerchantSource | null;
  /** yyyy-mm-dd, only when a date was actually spoken. Direction depends on kind and tense. */
  date: string | null;
  /** Bills and subscriptions only. Null when not said. */
  cycle: VoiceCycle | null;
  /** Bills only: a BILL_CATEGORIES id, or null when nothing mapped. */
  billCategoryId: string | null;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  missing: VoiceMissing[];
  /** The alternative that won, as heard (for "You said: …"). */
  transcript: string;
  /**
   * The sentence clearly holds two or more transactions ("Netflix 15.99 and Spotify 11.99"). The
   * other fields must not be saved as one entry. Rule: multiple.ts.
   */
  multiple: boolean;
};

export type VoiceContext = {
  /** yyyy-mm-dd, injected so tests are deterministic. */
  today: string;
  directory: BrandRow[];
  /** Learned corrections, heard phrase → canonical merchant/brand name. */
  aliases: Record<string, string>;
  /** The kind picked on the review page. When set, the parser detects no kind. */
  forceKind?: VoiceKind;
};
