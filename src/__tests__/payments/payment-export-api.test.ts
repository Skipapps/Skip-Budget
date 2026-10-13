import type { ShareRequest } from '@/api/payment-export';

/**
 * Sharing an export: the file goes to its own folder in the cache under its export name, older
 * exports are cleared, a PDF is printed on the paper of the phone's region, and the share sheet
 * opens on it. A build without one of the modules, a refused share or a failed write is the one
 * failure line; a cancelled share is not a failure. The modules load only when someone exports.
 */

const mockMissing = new Set<string>();
const mockShare = jest.fn();
const mockAvailable = jest.fn();
const mockPrint = jest.fn();
let mockRegion: string | null = 'US';

/** An in-memory cache folder, with the File and Directory calls the API makes. */
jest.mock('expo-file-system', () => {
  if (mockMissing.has('expo-file-system'))
    throw new Error("Cannot find native module 'FileSystem'");
  const files = new Map<string, string>();
  const dirs = new Set<string>(['file:///cache']);
  const uriOf = (parts: unknown[]) =>
    parts
      .map((part) => (typeof part === 'string' ? part : (part as { uri: string }).uri))
      .map((part) => part.replace(/\/+$/, ''))
      .join('/');
  const parentOf = (uri: string) => uri.slice(0, uri.lastIndexOf('/'));

  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = uriOf(parts);
    }
    get exists() {
      return dirs.has(this.uri);
    }
    delete() {
      if (!dirs.has(this.uri)) throw new Error('path does not exist');
      for (const uri of [...files.keys()]) if (uri.startsWith(`${this.uri}/`)) files.delete(uri);
      for (const uri of [...dirs])
        if (uri === this.uri || uri.startsWith(`${this.uri}/`)) dirs.delete(uri);
    }
    create(options: { idempotent?: boolean } = {}) {
      if (dirs.has(this.uri) && !options.idempotent) throw new Error('already exists');
      dirs.add(this.uri);
    }
  }

  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = uriOf(parts);
    }
    get exists() {
      return files.has(this.uri);
    }
    create(options: { overwrite?: boolean } = {}) {
      if (!dirs.has(parentOf(this.uri))) throw new Error('no parent folder');
      if (files.has(this.uri) && !options.overwrite) throw new Error('already exists');
      files.set(this.uri, '');
    }
    write(content: string) {
      if (!files.has(this.uri)) throw new Error('no such file');
      files.set(this.uri, content);
    }
    delete() {
      if (!files.delete(this.uri)) throw new Error('path does not exist');
    }
    async move(to: File, options: { overwrite?: boolean } = {}) {
      const content = files.get(this.uri);
      if (content === undefined) throw new Error('no such file');
      if (!dirs.has(parentOf(to.uri))) throw new Error('no parent folder');
      if (files.has(to.uri) && !options.overwrite) throw new Error('already exists');
      files.set(to.uri, content);
      files.delete(this.uri);
      this.uri = to.uri;
    }
  }

  return {
    Directory,
    File,
    Paths: { cache: new Directory('file:///cache') },
    __files: files,
    __dirs: dirs,
  };
});

jest.mock('expo-sharing', () => {
  if (mockMissing.has('expo-sharing')) throw new Error("Cannot find native module 'ExpoSharing'");
  return {
    isAvailableAsync: (...args: unknown[]) => mockAvailable(...args),
    shareAsync: (...args: unknown[]) => mockShare(...args),
  };
});

jest.mock('expo-print', () => {
  if (mockMissing.has('expo-print')) throw new Error("Cannot find native module 'ExpoPrint'");
  return { printToFileAsync: (...args: unknown[]) => mockPrint(...args) };
});

jest.mock('expo-localization', () => ({ getLocales: () => [{ regionCode: mockRegion }] }));

type Disk = { __files: Map<string, string>; __dirs: Set<string> };

/** A fresh module registry each time, so a module can be missing in one test and present in the next. */
function load() {
  // Required after resetModules, so each test gets the native modules its own case calls for.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const api = require('@/api/payment-export') as typeof import('@/api/payment-export');
  const disk = mockMissing.has('expo-file-system')
    ? null
    : (jest.requireMock('expo-file-system') as Disk);
  return { api, disk };
}

const FAILURE = 'Something went wrong. Please try again.';
const FOLDER = 'file:///cache/payment-exports';
const CSV =
  '\uFEFFDate,Name,Kind,Amount (USD),Paid from\r\n2026-10-11,Nationwide,Bill,145.00,Card not set\r\n';

const csv = (extra: Partial<ShareRequest> = {}): ShareRequest =>
  ({
    format: 'csv',
    csv: CSV,
    kind: 'bill',
    year: 2026,
    dialogTitle: 'Export',
    ...extra,
  }) as ShareRequest;
const pdf = (extra: Partial<ShareRequest> = {}): ShareRequest =>
  ({
    format: 'pdf',
    html: '<!DOCTYPE html><p>Statement</p>',
    kind: 'all',
    year: 'all',
    dialogTitle: 'Export',
    ...extra,
  }) as ShareRequest;

/** What expo-print does: a new file under Caches/Print with a random name. */
function printsTo(disk: Disk, uri = 'file:///cache/Print/5C1D.pdf') {
  mockPrint.mockImplementation(async () => {
    disk.__dirs.add('file:///cache/Print');
    disk.__files.set(uri, '%PDF-1.7');
    return { uri, numberOfPages: 3 };
  });
  return uri;
}

let log: jest.SpyInstance;

beforeEach(() => {
  jest.resetModules();
  mockMissing.clear();
  mockRegion = 'US';
  mockShare.mockReset().mockResolvedValue(undefined);
  mockAvailable.mockReset().mockResolvedValue(true);
  mockPrint.mockReset();
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => log.mockRestore());

describe('sharePayments', () => {
  it('loads none of the native modules until someone exports, so an older build still opens the page', () => {
    mockMissing.add('expo-print').add('expo-file-system').add('expo-sharing');
    expect(() => load()).not.toThrow();
  });

  it('writes the CSV under its export name in its own cache folder and shares it as a CSV', async () => {
    const { api, disk } = load();

    await expect(api.sharePayments(csv())).resolves.toEqual({ status: 'done' });

    const uri = `${FOLDER}/skip-bills-2026.csv`;
    expect(disk!.__files.get(uri)).toBe(CSV);
    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockShare).toHaveBeenCalledWith(uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: 'Export',
    });
    expect(mockPrint).not.toHaveBeenCalled();
  });

  it('prints the PDF with the statement margins, moves it under its export name and shares it', async () => {
    const { api, disk } = load();
    const printed = printsTo(disk!);

    await expect(api.sharePayments(pdf())).resolves.toEqual({ status: 'done' });

    expect(mockPrint).toHaveBeenCalledWith({
      html: '<!DOCTYPE html><p>Statement</p>',
      width: 612,
      height: 792,
      margins: { top: 40, right: 36, bottom: 40, left: 36 },
    });
    const uri = `${FOLDER}/skip-payments-all-years.pdf`;
    expect(disk!.__files.get(uri)).toBe('%PDF-1.7');
    // Moved, not copied: the printer's own file does not pile up.
    expect(disk!.__files.has(printed)).toBe(false);
    expect(mockShare).toHaveBeenCalledWith(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Export',
    });
  });

  it('prints on A4 outside the Letter countries', async () => {
    mockRegion = 'FR';
    const { api, disk } = load();
    printsTo(disk!);

    await api.sharePayments(pdf());
    expect(mockPrint).toHaveBeenCalledWith(
      expect.objectContaining({ width: 595.28, height: 841.89 }),
    );
  });

  it('keeps only the newest export, and nothing outside its own folder is touched', async () => {
    const { api, disk } = load();
    disk!.__dirs.add(FOLDER);
    disk!.__files.set(`${FOLDER}/skip-payments-2025.pdf`, 'old');
    disk!.__files.set(`${FOLDER}/skip-bills-2026.csv`, 'old');
    disk!.__files.set('file:///cache/receipt-photo.jpg', 'keep');

    await api.sharePayments(csv({ kind: 'subscription', year: 2024 }));

    const left = [...disk!.__files.keys()].filter((uri) => uri.startsWith(FOLDER));
    expect(left).toEqual([`${FOLDER}/skip-subscriptions-2024.csv`]);
    expect(disk!.__files.get('file:///cache/receipt-photo.jpg')).toBe('keep');
  });

  it('treats a cancelled share as done: iOS answers a cancel the way it answers a share', async () => {
    const { api } = load();
    mockShare.mockResolvedValueOnce(undefined);

    await expect(api.sharePayments(csv())).resolves.toEqual({ status: 'done' });
    expect(log).not.toHaveBeenCalled();
  });

  it('gives the one failure line for a refused share, and reports why', async () => {
    const { api } = load();
    const refused = new Error("You don't have access to the provided file");
    mockShare.mockRejectedValueOnce(refused);

    await expect(api.sharePayments(csv())).resolves.toEqual({ status: 'failed', error: FAILURE });
    expect(log).toHaveBeenCalledWith('[failure]', refused);
  });

  it('gives the one failure line when the phone cannot share at all, before writing anything', async () => {
    const { api, disk } = load();
    mockAvailable.mockResolvedValueOnce(false);

    await expect(api.sharePayments(csv())).resolves.toEqual({ status: 'failed', error: FAILURE });
    expect(mockShare).not.toHaveBeenCalled();
    expect(disk!.__dirs.has(FOLDER)).toBe(false);
  });

  it.each(['expo-file-system', 'expo-sharing'])(
    'gives the one failure line, never a crash, in a build without %s',
    async (name) => {
      mockMissing.add(name);
      const { api } = load();

      await expect(api.sharePayments(csv())).resolves.toEqual({ status: 'failed', error: FAILURE });
      expect(mockShare).not.toHaveBeenCalled();
    },
  );

  it('still shares a CSV in a dev client without expo-print; only the PDF fails', async () => {
    mockMissing.add('expo-print');
    const { api } = load();

    await expect(api.sharePayments(pdf())).resolves.toEqual({ status: 'failed', error: FAILURE });
    expect(mockShare).not.toHaveBeenCalled();
    await expect(api.sharePayments(csv())).resolves.toEqual({ status: 'done' });
    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  it('gives the one failure line when printing fails, and shares nothing', async () => {
    const { api } = load();
    mockPrint.mockRejectedValueOnce(new Error('PDF not rendered'));

    await expect(api.sharePayments(pdf())).resolves.toEqual({ status: 'failed', error: FAILURE });
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('removes the printed file when it cannot be moved, and reports the move', async () => {
    const { api, disk } = load();
    const printed = printsTo(disk!);
    const { File } = jest.requireMock('expo-file-system') as {
      File: { prototype: { move: unknown } };
    };
    const stuck = new Error('Unable to move');
    jest
      .spyOn(File.prototype as { move: () => Promise<void> }, 'move')
      .mockRejectedValueOnce(stuck);

    await expect(api.sharePayments(pdf())).resolves.toEqual({ status: 'failed', error: FAILURE });
    expect(disk!.__files.has(printed)).toBe(false);
    expect(log).toHaveBeenCalledWith('[failure]', stuck);
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('still exports when an old export cannot be cleared', async () => {
    const { api, disk } = load();
    disk!.__dirs.add(FOLDER);
    disk!.__files.set(`${FOLDER}/skip-bills-2026.csv`, 'old');
    const { Directory } = jest.requireMock('expo-file-system') as {
      Directory: { prototype: { delete: () => void } };
    };
    jest.spyOn(Directory.prototype, 'delete').mockImplementationOnce(() => {
      throw new Error('Unable to delete');
    });

    await expect(api.sharePayments(csv())).resolves.toEqual({ status: 'done' });
    expect(disk!.__files.get(`${FOLDER}/skip-bills-2026.csv`)).toBe(CSV);
  });
});

describe('pdfPage', () => {
  const { pdfPage, LETTER, A4 } = jest.requireActual(
    '@/api/payment-export',
  ) as typeof import('@/api/payment-export');

  it.each([
    'US',
    'CA',
    'MX',
    'PH',
    'CL',
    'CO',
    'VE',
    'PR',
    'GT',
    'CR',
    'PA',
    'SV',
    'NI',
    'BZ',
    'us',
  ])('prints on US Letter in %s', (region) => expect(pdfPage(region)).toBe(LETTER));

  it.each(['FR', 'ES', 'GB', 'DE', 'IN', 'AU', 'BR', 'AR', 'JP', null, undefined, ''])(
    'prints on A4 in %p',
    (region) => expect(pdfPage(region)).toBe(A4),
  );

  it('uses the points expo-print expects: Letter 8.5 × 11 in, A4 210 × 297 mm', () => {
    expect(LETTER).toEqual({ width: 8.5 * 72, height: 11 * 72 });
    expect(A4.width).toBeCloseTo((210 / 25.4) * 72, 1);
    expect(A4.height).toBeCloseTo((297 / 25.4) * 72, 1);
  });
});
