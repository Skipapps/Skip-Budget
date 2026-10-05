import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * One recognised line, and where it sat on the page.
 *
 * Coordinates are normalised to 0–1 with the origin at the TOP left, so y grows the way a receipt
 * is read. Height is the printed size of the line, which tells the shop's name from its address.
 */
export type TextLine = {
  text: string;
  /** Vision's ranked readings, best first. */
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
  isCaptureAvailable?: () => boolean;
  scanDocument: () => Promise<ScanResult | null>;
  captureReceipt?: () => Promise<ScanResult | null>;
  recognizeText: (uri: string) => Promise<string>;
  recognizeReceipt?: (uri: string) => Promise<TextLine[]>;
};

// Optional, so a JS-only context (web, an older build) can import this file without throwing.
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

/** False on the Simulator, on web, and on a build made before the one-shot camera. */
export function isCaptureAvailable(): boolean {
  try {
    return native?.isCaptureAvailable?.() ?? false;
  } catch {
    return false;
  }
}

/**
 * One shutter tap, then the reading, with no review screen. `scanDocument` is Apple's multi-page
 * scanner (review plus a second confirm); this is the same recognition behind a plain camera.
 *
 * Falls back to the document scanner on a build without the native camera.
 * Resolves null when the user backs out.
 */
export async function captureReceipt(): Promise<ScanResult | null> {
  if (!native) throw new Error('Scanning needs a newer build of the app.');
  if (!native.captureReceipt) return native.scanDocument();
  return native.captureReceipt();
}

export async function recognizeText(uri: string): Promise<string> {
  if (!native) throw new Error('Scanning needs a newer build of the app.');
  return native.recognizeText(uri);
}

/**
 * Recognition that keeps the layout. An empty list (older native build) means "fall back to the
 * flat text", not a failure.
 */
export async function recognizeReceipt(uri: string): Promise<TextLine[]> {
  if (!native) throw new Error('Scanning needs a newer build of the app.');
  if (!native.recognizeReceipt) return [];
  return native.recognizeReceipt(uri);
}
