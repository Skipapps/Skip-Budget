import { getLocales } from 'expo-localization';

import { failureMessage } from '@/lib/failure';
import { exportFileName, PDF_MARGINS, type ExportKind } from '@/lib/payment-export';

// Types only. The packages are required inside sharePayments: each calls requireNativeModule as it
// loads, which throws in a build without its pod (the dev clients made before expo-print was
// added), and a throw at import would take every screen that imports this file down with it.
type FileSystemModule = typeof import('expo-file-system');
type SharingModule = typeof import('expo-sharing');
type PrintModule = typeof import('expo-print');

/** Exports live in their own folder in the cache, so clearing it can never touch anything else. */
const EXPORT_FOLDER = 'payment-exports';

/** Where US Letter is the paper in the tray (CLDR's list); A4 everywhere else. */
const LETTER_REGIONS = new Set([
  'BZ',
  'CA',
  'CL',
  'CO',
  'CR',
  'GT',
  'MX',
  'NI',
  'PA',
  'PH',
  'PR',
  'SV',
  'US',
  'VE',
]);

/** Page sizes in points (1/72 inch), as expo-print takes them. */
export const LETTER = { width: 612, height: 792 } as const;
export const A4 = { width: 595.28, height: 841.89 } as const;

export function pdfPage(region: string | null | undefined): { width: number; height: number } {
  return region && LETTER_REGIONS.has(region.toUpperCase()) ? LETTER : A4;
}

const FILE_TYPES = {
  csv: { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' },
  pdf: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
} as const;

export type ShareRequest = {
  kind: ExportKind;
  year: number | 'all';
  dialogTitle: string;
} & ({ format: 'csv'; csv: string } | { format: 'pdf'; html: string });

/**
 * `done` once the share sheet has closed. iOS reports the same for a share and for a cancel, and a
 * cancel is not a failure, so the two are one answer. Anything that goes wrong, a build without
 * one of the modules included, is the one failure line.
 */
export type ShareResult = { status: 'done' } | { status: 'failed'; error: string };

/**
 * Writes the export to the cache under its file name and opens the share sheet on it. Only the
 * newest export is kept: by the time another is asked for, the last one's sheet has closed.
 */
export async function sharePayments(request: ShareRequest): Promise<ShareResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Directory, File, Paths } = require('expo-file-system') as FileSystemModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require('expo-sharing') as SharingModule;
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');

    const folder = new Directory(Paths.cache, EXPORT_FOLDER);
    try {
      if (folder.exists) folder.delete();
    } catch {
      // An old export that will not go is no reason to refuse this one; it is overwritten below
      // when it has the same name, and the system clears the cache when space runs low.
    }
    folder.create({ intermediates: true, idempotent: true });
    const file = new File(
      folder,
      exportFileName({ kind: request.kind, year: request.year, ext: request.format }),
    );

    if (request.format === 'csv') {
      file.create({ overwrite: true });
      file.write(request.csv);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Print = require('expo-print') as PrintModule;
      const printed = await Print.printToFileAsync({
        html: request.html,
        ...pdfPage(getLocales()[0]?.regionCode),
        margins: { ...PDF_MARGINS },
      });
      try {
        await new File(printed.uri).move(file, { overwrite: true });
      } catch (thrown) {
        // The printer writes a fresh file each time, so one that was not moved would stay forever.
        try {
          const left = new File(printed.uri);
          if (left.exists) left.delete();
        } catch {
          // The move's error is the one worth reporting.
        }
        throw thrown;
      }
    }

    await Sharing.shareAsync(file.uri, {
      ...FILE_TYPES[request.format],
      dialogTitle: request.dialogTitle,
    });
    return { status: 'done' };
  } catch (thrown) {
    return { status: 'failed', error: failureMessage(thrown) };
  }
}
