/**
 * What the scanner does when the native module is not in the build.
 *
 * Recognition lives in the same Swift module as the camera, so without it there is no upload path
 * either: every question answers false and every attempt rejects with a readable sentence.
 */

const mockRequireOptionalNativeModule = jest.fn();

// Spread the real module: jest-expo's setup calls `requireNativeModule`, and a bare factory fails
// the suite before a test runs.
jest.mock('expo-modules-core', () => ({
  ...jest.requireActual('expo-modules-core'),
  requireOptionalNativeModule: (...args: unknown[]) => mockRequireOptionalNativeModule(...args),
}));

/**
 * Re-imports the module fresh, because `native` is resolved once at load. Uses `require` in
 * `isolateModules`: a dynamic `import` needs --experimental-vm-modules, which jest here lacks.
 */
function loadScanner(): typeof import('./index') {
  let scanner!: typeof import('./index');
  jest.isolateModules(() => {
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
    // An empty list means "use the flat text".
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
