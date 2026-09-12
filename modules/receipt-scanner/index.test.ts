/**
 * What happens to the scanner when the native module is not in the build.
 *
 * `requireOptionalNativeModule` is the whole reason this file can be imported
 * on the Simulator, on web, and in a build made before the pod existed — it
 * answers null instead of throwing. But "does not throw at import time" is a
 * much weaker promise than "degrades to upload-only", which is what the audit
 * claims, so both halves are pinned here rather than assumed.
 *
 * The finding these tests record: recognition is in the *same* Swift module as
 * the camera. Without the pod there is no upload path either — `recognizeText`
 * and `recognizeReceipt` reject exactly as `captureReceipt` does. The degrade
 * is "every question answers false, and every attempt rejects with a sentence
 * somebody can read", not "upload still works".
 */

const mockRequireOptionalNativeModule = jest.fn();

// Spread the real module rather than replacing it: jest-expo's own setup
// reaches for `requireNativeModule` while installing the winter runtime, and a
// bare factory takes that away and fails the suite before a test runs.
jest.mock('expo-modules-core', () => ({
  ...jest.requireActual('expo-modules-core'),
  requireOptionalNativeModule: (...args: unknown[]) => mockRequireOptionalNativeModule(...args),
}));

/**
 * Re-imports the module fresh, because `native` is resolved once at load.
 *
 * `require` inside `isolateModules` rather than a dynamic `import`: the latter
 * needs --experimental-vm-modules, which this project's jest does not run with.
 */
function loadScanner(): typeof import('./index') {
  let scanner!: typeof import('./index');
  jest.isolateModules(() => {
    // The point of this helper is to re-evaluate the module, which `import`
    // cannot do.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    scanner = require('./index') as typeof import('./index');
  });
  return scanner;
}

describe('receipt-scanner without the native module', () => {
  beforeEach(() => {
    mockRequireOptionalNativeModule.mockReset();
    mockRequireOptionalNativeModule.mockReturnValue(null);
  });

  it('asks expo-modules-core for the module by the name the podspec registers', async () => {
    loadScanner();
    expect(mockRequireOptionalNativeModule).toHaveBeenCalledWith('ReceiptScanner');
  });

  it('answers false to every availability question instead of throwing', async () => {
    const scanner = loadScanner();
    expect(scanner.isScanningAvailable()).toBe(false);
    expect(scanner.isCaptureAvailable()).toBe(false);
    expect(scanner.isRecognitionAvailable()).toBe(false);
  });

  it('rejects with a readable sentence rather than a TypeError', async () => {
    const scanner = loadScanner();
    const message = 'Scanning needs a newer build of the app.';
    await expect(scanner.captureReceipt()).rejects.toThrow(message);
    await expect(scanner.scanDocument()).rejects.toThrow(message);
    await expect(scanner.recognizeText('file:///receipt.jpg')).rejects.toThrow(message);
    await expect(scanner.recognizeReceipt('file:///receipt.jpg')).rejects.toThrow(message);
  });
});

describe('receipt-scanner on an older native build', () => {
  it('falls back to the document scanner when the one-shot camera is missing', async () => {
    const scanDocument = jest
      .fn()
      .mockResolvedValue({ text: 'x', lines: [], imageUri: null, pageCount: 1 });
    mockRequireOptionalNativeModule.mockReset();
    mockRequireOptionalNativeModule.mockReturnValue({
      isScanningAvailable: () => true,
      scanDocument,
      recognizeText: jest.fn(),
      // captureReceipt and recognizeReceipt deliberately absent.
    });

    const scanner = loadScanner();
    expect(scanner.isCaptureAvailable()).toBe(false);
    await scanner.captureReceipt();
    expect(scanDocument).toHaveBeenCalledTimes(1);
    // The positioned reading is optional; an empty list means "use flat text".
    await expect(scanner.recognizeReceipt('file:///receipt.jpg')).resolves.toEqual([]);
  });

  it('survives a native isScanningAvailable that throws', async () => {
    mockRequireOptionalNativeModule.mockReset();
    mockRequireOptionalNativeModule.mockReturnValue({
      isScanningAvailable: () => {
        throw new Error('no camera');
      },
      isCaptureAvailable: () => {
        throw new Error('no camera');
      },
      scanDocument: jest.fn(),
      recognizeText: jest.fn(),
    });

    const scanner = loadScanner();
    expect(scanner.isScanningAvailable()).toBe(false);
    expect(scanner.isCaptureAvailable()).toBe(false);
  });
});
