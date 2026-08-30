import { useState } from 'react';

import { guessCategory, matchBrand, useBrandDirectory } from '@/api/brands';
import { usePaymentSources } from '@/api/queries';
import type { BrandSelection } from '@/components/brands/brand-field';
import { toIsoDate } from '@/lib/date';
import { parseReceipt, parseReceiptFromLines } from '@/lib/receipt-parser';
import {
  captureReceipt,
  isCaptureAvailable,
  isRecognitionAvailable,
  isScanningAvailable,
} from '../../modules/receipt-scanner';

/** Everything a scan managed to work out, ready to become a receipt. */
export type ScanDraft = {
  store: BrandSelection | null;
  /** Null when no total could be read with any confidence. */
  amount: number | null;
  /** Falls back to today, which is right far more often than it is wrong. */
  date: Date;
  /** A payment source, only when the last four digits matched one on file. */
  sourceId: string | null;
  /** Which fields were actually read, for telling someone what to check. */
  read: ('store' | 'date' | 'amount' | 'card')[];
  /**
   * Whether this can be filed without asking anything.
   *
   * A receipt needs a store and an amount; everything else has a sensible
   * default. Deliberately strict — filing a confident wrong total is worse
   * than one extra screen, because nobody re-checks a row that looks fine.
   */
  complete: boolean;
};

/**
 * Camera to draft receipt, in one call.
 *
 * Lives here rather than in a screen because two places need it: the receipts
 * list, where a complete scan is filed without leaving the page, and the add
 * form, where it fills the fields in place.
 */
export function useReceiptScan() {
  const [scanning, setScanning] = useState(false);

  const { sources } = usePaymentSources();
  const { data: directory = [] } = useBrandDirectory();

  /** Resolves null when the user backs out of the camera. */
  const scan = async (): Promise<ScanDraft | null> => {
    try {
      setScanning(true);
      const result = await captureReceipt();
      if (!result) return null;

      // Prefer the positioned reading: a receipt is a two-column document, and
      // flat text loses which figure belongs to which label. A build without it
      // still returns the words.
      const parsed = result.lines?.length
        ? parseReceiptFromLines(result.lines)
        : parseReceipt(result.text);

      const read: ScanDraft['read'] = [];
      let store: BrandSelection | null = null;

      if (parsed.merchant) {
        const brand = matchBrand(parsed.merchant, directory);
        store = brand
          ? {
              brandId: brand.id,
              name: brand.name,
              domain: brand.domain,
              categoryId: brand.category_id,
            }
          : {
              brandId: null,
              name: parsed.merchant,
              domain: null,
              categoryId: guessCategory(parsed.merchant),
            };
        read.push('store');
      }

      if (parsed.total !== undefined) read.push('amount');
      if (parsed.date) read.push('date');

      const matchedSource = parsed.last4
        ? (sources.find((source) => source.label.endsWith(parsed.last4!)) ?? null)
        : null;
      if (matchedSource) read.push('card');

      const amount = parsed.total ?? null;

      return {
        store,
        amount,
        date: parsed.date ? new Date(`${parsed.date}T00:00:00`) : new Date(),
        sourceId: matchedSource?.id ?? null,
        read,
        complete: Boolean(store) && amount !== null && amount > 0,
      };
    } finally {
      setScanning(false);
    }
  };

  return {
    scan,
    scanning,
    /** Recognition needs the module; the camera needs hardware behind it. */
    available: isRecognitionAvailable() && (isCaptureAvailable() || isScanningAvailable()),
  };
}

/** A draft as route params, for the times it has to be finished by hand. */
export function draftToParams(draft: ScanDraft) {
  return {
    scannedStore: draft.store?.name ?? '',
    scannedBrandId: draft.store?.brandId ?? '',
    scannedDomain: draft.store?.domain ?? '',
    scannedCategory: draft.store?.categoryId ?? '',
    scannedAmount: draft.amount !== null ? String(draft.amount) : '',
    scannedDate: toIsoDate(draft.date),
    scannedSource: draft.sourceId ?? '',
    scannedRead: draft.read.join(','),
  };
}
