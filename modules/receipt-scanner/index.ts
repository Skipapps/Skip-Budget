import { requireOptionalNativeModule } from 'expo-modules-core';

export type ScanResult = {
  /** Every page's recognised text, joined in reading order. */
  text: string;
  /** file:// path to the first page, or null if it could not be written. */
  imageUri: string | null;
  pageCount: number;
};

type ReceiptScannerModule = {
  isScanningAvailable: () => boolean;
  scanDocument: () => Promise<ScanResult | null>;
  recognizeText: (uri: string) => Promise<string>;
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
