import { useState } from 'react';

import { guessCategory, matchBrand, useBrandDirectory, type BrandRow } from '@/api/brands';
import { usePaymentSources } from '@/api/queries';
import type { BrandSelection } from '@/components/brands/brand-field';
import { getLocaleSnapshot } from '@/i18n/store';
import { toIsoDate } from '@/lib/date';
import { parseReceipt, parseReceiptFromLines, type ParseOptions } from '@/lib/receipt-parser';
import { readDayParam } from '@/lib/voice-draft';
import {
  captureReceipt,
  isCaptureAvailable,
  isRecognitionAvailable,
  isScanningAvailable,
} from '../../modules/receipt-scanner';

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
};

/**
 * What the parser is told about this person: the shops the catalogue knows, and how their region
 * writes dates, for a receipt that does not say. English Canada prints both orders, so CAD does not
 * decide.
 */
export function receiptParseOptions(directory: readonly BrandRow[]): ParseOptions {
  const { currency } = getLocaleSnapshot();
  return {
    brands: directory,
    dayFirst: currency === 'USD' ? false : currency === 'CAD' ? undefined : true,
  };
}

/**
 * Camera to draft receipt, in one call. The receipts list opens the add form pre-filled with it,
 * so every scan is checked before it is filed.
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

      // Prefer the positioned reading: a receipt is a two-column document, and flat text loses
      // which figure belongs to which label.
      const options = receiptParseOptions(directory);
      const parsed = result.lines?.length
        ? parseReceiptFromLines(result.lines, options)
        : parseReceipt(result.text, options);

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
      // The parser allows any day up to 31; an impossible one ("02/30") is not a date that was read.
      const day = readDayParam(parsed.date);
      if (day) read.push('date');

      const matchedSource = parsed.last4
        ? (sources.find((source) => source.label.endsWith(parsed.last4!)) ?? null)
        : null;
      if (matchedSource) read.push('card');

      const amount = parsed.total ?? null;

      return {
        store,
        amount,
        date: day ?? new Date(),
        sourceId: matchedSource?.id ?? null,
        read,
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
