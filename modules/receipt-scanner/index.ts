import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * One recognised line, and where it sat on the page.
 *
 * Coordinates are normalised to 0–1 with the origin at the TOP left, so y
 * grows the way a receipt is read. Height is the printed size of the line,
 * which is how the shop's name is told apart from its address.
 */
export type TextLine = {
  text: string;
  /** Vision's ranked readings, best first. Useful when digits are ambiguous. */
  candidates: string[];
  /** 0–1. Low confidence is a reason to prefer another candidate. */
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ScanResult = {
  /** Every page's recognised text, joined in reading order. */
  text: string;
  /** The same text with its layout kept. Empty on older native builds. */
  lines: TextLine[];
  /** file:// path to the first page, or null if it could not be written. */
  imageUri: string | null;
  pageCount: number;
};

type ReceiptScannerModule = {
  isScanningAvailable: () => boolean;
  scanDocument: () => Promise<ScanResult | null>;
  recognizeText: (uri: string) => Promise<string>;
  recognizeReceipt?: (uri: string) => Promise<TextLine[]>;
};

// Optional, so a JS-only context (web, or a build made before the module was
// added) still loads this file instead of throwing at import time.
const native = requireOptionalNativeModule<ReceiptScannerModule>('ReceiptScanner');

/** False on the Simulator, on web, and in any build without the native module. */
export function isScanningAvailable(): boolean {
  try {
    return native?.isScanningAvailable() ?? false;
  } catch {
    return false;
  }
}

/** True whenever text recognition can run, which needs only the module. */
export function isRecognitionAvailable(): boolean {
  return native != null;
}

/** Resolves null when the user backs out of the scanner. */
export async function scanDocument(): Promise<ScanResult | null> {
  if (!native) throw new Error('Scanning needs a newer build of the app.');
  return native.scanDocument();
}

export async function recognizeText(uri: string): Promise<string> {
  if (!native) throw new Error('Scanning needs a newer build of the app.');
  return native.recognizeText(uri);
}

/**
 * Recognition that keeps the layout.
 *
 * Returns an empty list on a native build that predates it, which the caller
 * reads as "fall back to the flat text" rather than as a failure.
 */
export async function recognizeReceipt(uri: string): Promise<TextLine[]> {
  if (!native) throw new Error('Scanning needs a newer build of the app.');
  if (!native.recognizeReceipt) return [];
  return native.recognizeReceipt(uri);
}
