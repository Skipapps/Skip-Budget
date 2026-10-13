import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Dimensions } from 'react-native';

import type { ShareRequest, ShareResult } from '@/api/payment-export';
import PaymentExportRoute from '@/app/payment-export';
import { ExportScreen, type ExportPayments } from '@/components/payments/export-choices';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import type { PaymentEntry } from '@/lib/payment-entries';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Export: the page says what goes out (kind, year, how many payments), offers CSV or PDF, and one
 * pinned button builds the file and opens the share sheet. It is busy until the sheet closes, says
 * nothing on success (a cancel looks the same), and shows the one failure line when it fails.
 * Free never gets here: the gate sends them to the export explainer.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockParams: Record<string, string> = {};
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => {},
  useLocalSearchParams: () => mockParams,
  useCurrentRouteInfo: () => {
    const query = new URLSearchParams(mockParams).toString();
    return { pathnameWithParams: query ? `/payment-export?${query}` : '/payment-export' };
  },
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
}));
// RevenueCat's bundle does not load under jest; the real usePro() is this same store read.
jest.mock('@/api/pro', () => ({
  usePro: () => jest.requireActual('@/lib/pro-status').useProStatus(),
}));
const mockShare = jest.fn<Promise<ShareResult>, [ShareRequest]>();
jest.mock('@/api/payment-export', () => ({
  sharePayments: (request: ShareRequest) => mockShare(request),
}));
// The route's own read; the page's states are driven through ExportScreen below.
const mockRoutePayments = jest.fn((_today: string) => mockData);
jest.mock('@/api/payment-ledger', () => ({
  usePayments: (today: string) => mockRoutePayments(today),
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
// Its shimmer is Reanimated, which does not load under jest.
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => {
  const colors = new Proxy({}, { get: () => '#000000' });
  return { useColors: () => colors, useTheme: () => ({ scheme: 'light', colors }) };
});
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-12', todayDate: new Date(2026, 9, 12) }),
}));

const FAILURE = 'Something went wrong. Please try again.';

function payment(extra: Partial<PaymentEntry> & Pick<PaymentEntry, 'id' | 'date' | 'name'>) {
  return {
    planName: extra.name,
    amount: 10,
    kind: 'bill',
    status: 'paid',
    sourceId: '',
    planId: null,
    categoryId: null,
    iconId: null,
    domain: null,
    logoHidden: false,
    ...extra,
  } satisfies PaymentEntry;
}

/** Newest first, as usePayments gives them; one row before the floor, never exported. */
const PAYMENTS: PaymentEntry[] = [
  payment({ id: 'p1', date: '2026-10-11', name: 'Nationwide', amount: 145 }),
  payment({
    id: 'p2',
    date: '2026-10-09',
    name: 'Netflix',
    amount: 15.99,
    kind: 'subscription',
    sourceId: 'card-1',
  }),
  payment({
    id: 'p3',
    date: '2026-10-05',
    name: 'Car loan',
    amount: 12345.67,
    status: 'paidOff',
    sourceId: 'acct-1',
  }),
  payment({ id: 'p4', date: '2026-09-01', name: 'Rent', amount: 1035, sourceId: 'acct-1' }),
  payment({ id: 'p5', date: '2026-09-09', name: 'Spotify', amount: 10, kind: 'subscription' }),
  payment({
    id: 'p6',
    date: '2025-12-09',
    name: 'Netflix',
    amount: 15.99,
    kind: 'subscription',
    sourceId: 'gone',
  }),
  payment({ id: 'p7', date: '2025-06-22', name: 'AEP', amount: 150, sourceId: 'card-1' }),
  payment({ id: 'p0', date: '2019-12-01', name: 'Old', amount: 99 }),
];

const LABELS: Record<string, string> = { 'card-1': 'Discover ••6334', 'acct-1': 'Komal ••7010' };

let mockData: ExportPayments;
const usePayments = jest.fn((_today: string) => mockData);

function data(extra: Partial<ExportPayments> = {}): ExportPayments {
  return {
    payments: PAYMENTS,
    listFloor: '2020-01-01',
    labelOf: (id) => LABELS[id] ?? null,
    isLoading: false,
    isError: false,
    refreshFailed: false,
    refetch: jest.fn(),
    ...extra,
  };
}

function show(kind?: string, year?: string) {
  return render(<ExportScreen kind={kind} year={year} usePayments={usePayments} />);
}

const exportButton = (name = 'Export') => screen.getByRole('button', { name });

function insideScroll(node: { type: unknown; parent: unknown } | null): boolean {
  for (let at = node as { type: unknown; parent: unknown } | null; at; at = at.parent as never) {
    if (String(at.type) === 'RCTScrollView') return true;
  }
  return false;
}

/** The request the last export sent. */
const sent = () => mockShare.mock.calls[mockShare.mock.calls.length - 1][0];

beforeEach(() => {
  resetLocaleForTests();
  resetProStatusForTests();
  mockParams = {};
  mockData = data();
  mockShare.mockReset().mockResolvedValue({ status: 'done' });
  mockRedirect.mockClear();
  usePayments.mockClear();
  mockRoutePayments.mockClear();
});
afterAll(() => {
  resetLocaleForTests();
  resetProStatusForTests();
});

describe('the gate', () => {
  it('sends free to the export explainer', async () => {
    publishProStatus({ pro: false, ready: true });
    await render(<PaymentExportRoute />);
    expect(mockRedirect).toHaveBeenCalledWith({
      pathname: '/pro-feature',
      params: { id: 'export', next: '/payment-export' },
    });
    expect(screen.queryByText('Export')).toBeNull();
    expect(mockRoutePayments).not.toHaveBeenCalled();
  });

  it('draws nothing while Pro is being checked', async () => {
    await render(<PaymentExportRoute />);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.queryByText('Export')).toBeNull();
    expect(mockRoutePayments).not.toHaveBeenCalled();
  });

  it('opens on Pro with the payments for the kind and year it was sent', async () => {
    publishProStatus({ pro: true, ready: true });
    mockParams = { kind: 'bill', year: '2026' };
    await render(<PaymentExportRoute />);
    expect(mockRoutePayments).toHaveBeenCalledWith('2026-10-12');
    expect(screen.getByText('Bills')).toBeTruthy();
    expect(screen.getByText('3 payments · This year')).toBeTruthy();
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('waits while the payments load, rather than saying there is nothing', async () => {
    publishProStatus({ pro: true, ready: true });
    mockData = data({ payments: [], isLoading: true });
    mockParams = { kind: 'bill', year: '2026' };
    await render(<PaymentExportRoute />);
    expect(screen.getByText('Export')).toBeTruthy();
    expect(screen.getByTestId('export-loading')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
    expect(screen.queryByText(/Nothing to export/)).toBeNull();
  });
});

describe('what goes out', () => {
  it.each([
    ['bill', '2026', 'Bills', '3 payments · This year'],
    ['subscription', '2026', 'Subscriptions', '2 payments · This year'],
    ['all', '2026', 'Bills and subscriptions', '5 payments · This year'],
    ['subscription', '2025', 'Subscriptions', '1 payment · 2025'],
    ['all', 'all', 'Bills and subscriptions', '7 payments · All years'],
    // Unknown words fall back: every kind, this year.
    ['nonsense', 'soon', 'Bills and subscriptions', '5 payments · This year'],
  ])('kind %s, year %s: %s, %s', async (kind, year, heading, line) => {
    await show(kind, year);
    expect(screen.getByText(heading)).toBeTruthy();
    expect(screen.getByText(line)).toBeTruthy();
    expect(usePayments).toHaveBeenCalledWith('2026-10-12');
  });

  it('reads the summary to VoiceOver as one stop, with commas', async () => {
    await show('bill', '2026');
    expect(screen.getByLabelText('Bills, 3 payments, This year')).toBeTruthy();
  });

  it('offers CSV and PDF, CSV ticked, and pins Export below the scroll', async () => {
    await show('bill', '2026');
    const csv = screen.getByRole('radio', { name: 'CSV, For Numbers, Excel or Google Sheets' });
    const pdf = screen.getByRole('radio', { name: 'PDF, A statement to print or send' });
    expect(csv.props.accessibilityState).toMatchObject({ selected: true });
    expect(pdf.props.accessibilityState).toMatchObject({ selected: false });

    await fireEvent.press(pdf);
    expect(pdf.props.accessibilityState).toMatchObject({ selected: true });

    expect(insideScroll(exportButton())).toBe(false);
    expect(insideScroll(screen.getByText('Bills'))).toBe(true);
  });

  it('says there is nothing to export, with Export off and no choices', async () => {
    await show('bill', '2024');
    expect(screen.getByText('Nothing to export for 2024.')).toBeTruthy();
    expect(screen.getByText('0 payments · 2024')).toBeTruthy();
    expect(screen.queryByTestId('export-choices')).toBeNull();
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(exportButton());
    expect(mockShare).not.toHaveBeenCalled();
  });

  it.each([
    ['en', 'Nothing to export yet.', '0 payments · All years'],
    ['es', 'Aún no hay nada que exportar.', '0 pagos · Todos los años'],
    ['fr', 'Rien à exporter pour l’instant.', '0 paiement · Toutes les années'],
  ] as const)(
    'says there is nothing yet across all years, in %s',
    async (language, line, summary) => {
      setLanguage(language);
      mockData = data({ payments: [] });
      await show('all', 'all');
      expect(screen.getByText(line)).toBeTruthy();
      expect(screen.getByText(summary)).toBeTruthy();
      expect(screen.queryByText(/Nothing to export for/)).toBeNull();
      expect(screen.queryByTestId('export-choices')).toBeNull();
    },
  );

  it('shows the failure page when the payments cannot be read, and tries again', async () => {
    mockData = data({ isError: true });
    await show('bill', '2026');
    expect(screen.getByText(FAILURE)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
    await fireEvent.press(screen.getByText('Try again'));
    expect(mockData.refetch).toHaveBeenCalledTimes(1);
  });
});

const NOTE: Record<Language, string> = {
  en: 'Couldn’t refresh · showing your last figures',
  es: 'No se pudo actualizar · mostrando tus últimas cifras',
  fr: 'Impossible d’actualiser · voici tes derniers chiffres',
};

type Host = ReturnType<typeof screen.getByText>;

/** The refresh note as drawn, straight under the summary card. */
function noteUnderSummary(language: Language = 'en') {
  const note = screen.getByText(NOTE[language]);
  expect(note.props.accessibilityRole).toBe('text');
  expect(note.props.maxFontSizeMultiplier).toBe(TEXT_CAP.reading);
  expect(note.props.numberOfLines).toBeUndefined();
  expect(String(note.props.className)).toContain('text-center');
  const kids = (note.parent?.children ?? []) as (Host | string)[];
  expect((kids[kids.indexOf(note) - 1] as Host).props.testID).toBe('export-summary');
}

describe('a refresh that failed', () => {
  it('keeps the export offered, with the note straight under the summary', async () => {
    mockData = data({ refreshFailed: true });
    await show('bill', '2026');
    noteUnderSummary();
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
  });

  it('has no note after a good refresh, and never one beside the error page', async () => {
    mockData = data();
    await show('bill', '2026');
    expect(screen.queryByText(NOTE.en)).toBeNull();
    mockData = data({ isError: true, refreshFailed: true });
    await show('bill', '2026');
    expect(screen.getByText(FAILURE)).toBeTruthy();
    expect(screen.queryByText(NOTE.en)).toBeNull();
  });

  it.each<Language>(['es', 'fr'])('says it in %s', async (language) => {
    setLanguage(language);
    mockData = data({ refreshFailed: true });
    await show('bill', '2026');
    noteUnderSummary(language);
  });
});

describe('exporting', () => {
  it('shares a CSV of exactly the rows shown, newest first, in plain cents', async () => {
    await show('bill', '2026');
    await fireEvent.press(exportButton());
    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));

    const request = sent();
    expect(request).toMatchObject({
      format: 'csv',
      kind: 'bill',
      year: 2026,
      dialogTitle: 'Export',
    });
    expect(request.format === 'csv' && request.csv).toBe(
      [
        '\uFEFFDate,Name,Kind,Amount (USD),Paid from',
        '2026-10-11,Nationwide,Bill,145.00,Card not set',
        '2026-10-05,Car loan,Paid off,12345.67,Komal ••7010',
        '2026-09-01,Rent,Bill,1035.00,Komal ••7010',
        '',
      ].join('\r\n'),
    );
  });

  it('exports every year from the floor on, and a deleted card reads Card not set', async () => {
    await show('subscription', 'all');
    await fireEvent.press(exportButton());
    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));

    const request = sent();
    expect(request).toMatchObject({ format: 'csv', kind: 'subscription', year: 'all' });
    const lines = request.format === 'csv' ? request.csv.split('\r\n') : [];
    expect(lines.slice(1, -1)).toEqual([
      '2026-10-09,Netflix,Subscription,15.99,Discover ••6334',
      '2026-09-09,Spotify,Subscription,10.00,Card not set',
      '2025-12-09,Netflix,Subscription,15.99,Card not set',
    ]);
  });

  it('shares a PDF statement in the app’s words and money', async () => {
    await show('bill', '2026');
    await fireEvent.press(screen.getByRole('radio', { name: 'PDF, A statement to print or send' }));
    await fireEvent.press(exportButton());
    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));

    const request = sent();
    expect(request).toMatchObject({ format: 'pdf', kind: 'bill', year: 2026 });
    const html = request.format === 'pdf' ? request.html : '';
    expect(html).toContain(
      '<h1>Payment history</h1><p class="scope">3 payments · Bills · 2026</p>',
    );
    expect(html).toContain('<span class="figure">$13,525.67</span>');
    expect(html).toContain(
      '<div class="heading">October 2026</div><div class="amount">$12,490.67</div>',
    );
    expect(html).toContain('<div class="date">5 Oct 2026</div><div class="name">Car loan</div>');
    expect(html).toContain('<div class="kind">Paid off</div>');
    expect(html).toContain('<footer>Made with Skip Budget on 12 Oct 2026</footer>');
  });

  it('names what a statement of every kind covers, and its year', async () => {
    await show('all', '2025');
    await fireEvent.press(screen.getByRole('radio', { name: 'PDF, A statement to print or send' }));
    await fireEvent.press(exportButton());
    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));
    const html = sent().format === 'pdf' ? (sent() as { html: string }).html : '';
    expect(html).toContain('<p class="scope">2 payments · Bills and subscriptions · 2025</p>');
  });

  it('is busy until the share sheet closes: Preparing…, and a second tap does nothing', async () => {
    let close!: (result: ShareResult) => void;
    mockShare.mockReturnValueOnce(new Promise((resolve) => (close = resolve)));
    await show('bill', '2026');

    await fireEvent.press(exportButton());
    const busy = await screen.findByRole('button', { name: 'Preparing…' });
    expect(busy.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(busy);
    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));

    await act(async () => close({ status: 'done' }));
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: false });
    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  it('says nothing when the sheet closes, shared or cancelled', async () => {
    await show('bill', '2026');
    await fireEvent.press(exportButton());
    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(exportButton()).toBeTruthy());
    expect(screen.queryByText(FAILURE)).toBeNull();
  });

  it('shows the one failure line when it fails, and clears it as soon as it tries again', async () => {
    mockShare.mockResolvedValueOnce({ status: 'failed', error: FAILURE });
    await show('bill', '2026');

    await fireEvent.press(exportButton());
    expect(await screen.findByText(FAILURE)).toBeTruthy();
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: false });

    let close!: (result: ShareResult) => void;
    mockShare.mockReturnValueOnce(new Promise((resolve) => (close = resolve)));
    await fireEvent.press(exportButton());
    await screen.findByRole('button', { name: 'Preparing…' });
    // The last failure is not left on screen while the next try is under way.
    expect(screen.queryByText(FAILURE)).toBeNull();

    await act(async () => close({ status: 'done' }));
    expect(mockShare).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(FAILURE)).toBeNull();
  });

  it('never sticks on Preparing… when building the file throws: the one failure line, then Export again', async () => {
    const broken = new Error('label read failed');
    mockData = data({
      labelOf: () => {
        throw broken;
      },
    });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await show('bill', '2026');

    await fireEvent.press(exportButton());
    expect(await screen.findByText(FAILURE)).toBeTruthy();
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: false });
    expect(screen.queryByRole('button', { name: 'Preparing…' })).toBeNull();
    expect(mockShare).not.toHaveBeenCalled();
    // The cause is reported, not only the line shown.
    expect(log).toHaveBeenCalledWith('[failure]', broken);
    log.mockRestore();
  });

  it('tells VoiceOver once for each failure, and never for a share that went through', async () => {
    // React Native's jest setup already makes this a mock, with every earlier test's calls on it.
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
    announce.mockClear();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      mockShare
        .mockResolvedValueOnce({ status: 'failed', error: FAILURE })
        .mockResolvedValueOnce({ status: 'done' })
        .mockResolvedValueOnce({ status: 'failed', error: FAILURE });
      await show('bill', '2026');

      await fireEvent.press(exportButton());
      await screen.findByText(FAILURE);
      expect(announce).toHaveBeenCalledTimes(1);
      expect(announce).toHaveBeenLastCalledWith(FAILURE);

      await fireEvent.press(exportButton());
      await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.queryByText(FAILURE)).toBeNull());
      expect(announce).toHaveBeenCalledTimes(1);

      await fireEvent.press(exportButton());
      await screen.findByText(FAILURE);
      expect(announce).toHaveBeenCalledTimes(2);

      // A file that could not be built is said the same way.
      mockData = data({
        labelOf: () => {
          throw new Error('label read failed');
        },
      });
      await screen.rerender(<ExportScreen kind="bill" year="2026" usePayments={usePayments} />);
      await fireEvent.press(exportButton());
      await waitFor(() => expect(announce).toHaveBeenCalledTimes(3));
      expect(announce).toHaveBeenLastCalledWith(FAILURE);
      expect(mockShare).toHaveBeenCalledTimes(3);
    } finally {
      announce.mockReset();
      log.mockRestore();
    }
  });

  it('keeps the failure line in the pinned footer, right above Export, at the largest text', async () => {
    const window = { width: 390, height: 844, scale: 3, fontScale: 3 };
    Dimensions.set({ window, screen: window });
    try {
      mockShare.mockResolvedValueOnce({ status: 'failed', error: FAILURE });
      await show('bill', '2026');
      await fireEvent.press(exportButton());

      const line = await screen.findByRole('alert');
      expect(line.props.children).toBe(FAILURE);
      expect(screen.getAllByText(FAILURE)).toHaveLength(1);
      expect(insideScroll(line)).toBe(false);
      // The footer's own column: the line, then the button that was pressed.
      const footer = line.parent;
      expect(footer).toBe(exportButton().parent);
      expect(footer?.children.indexOf(line)).toBeLessThan(
        footer?.children.indexOf(exportButton()) ?? -1,
      );
    } finally {
      const normal = { width: 390, height: 844, scale: 3, fontScale: 1 };
      await act(async () => Dimensions.set({ window: normal, screen: normal }));
    }
  });

  it('reads and exports in Spanish, with the person’s currency in the header', async () => {
    setLanguage('es');
    setCurrency('GBP');
    await show('bill', '2026');
    expect(screen.getByText('Facturas')).toBeTruthy();
    expect(screen.getByText('3 pagos · Este año')).toBeTruthy();

    await fireEvent.press(exportButton('Exportar'));
    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));
    const request = sent();
    expect(request.dialogTitle).toBe('Exportar');
    const lines = request.format === 'csv' ? request.csv.split('\r\n') : [];
    expect(lines[0]).toBe('\uFEFFFecha,Nombre,Tipo,Importe (GBP),Pagado con');
    expect(lines[1]).toBe('2026-10-11,Nationwide,Factura,145.00,Sin tarjeta');
    expect(lines[2]).toBe('2026-10-05,Car loan,Liquidado,12345.67,Komal ••7010');
  });

  it('reads in French', async () => {
    setLanguage('fr');
    await show('subscription', '2025');
    expect(screen.getByText('Abonnements')).toBeTruthy();
    expect(screen.getByText('1 paiement · 2025')).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: 'PDF, Un relevé à imprimer ou à envoyer' }),
    ).toBeTruthy();
    expect(exportButton('Exporter')).toBeTruthy();
  });

  it('heads every kind with what it covers, in Spanish and French', async () => {
    setLanguage('es');
    const spanish = await show('all', '2026');
    expect(screen.getByText('Facturas y suscripciones')).toBeTruthy();
    await spanish.unmount();
    setLanguage('fr');
    await show('all', '2026');
    expect(screen.getByLabelText('Factures et abonnements, 5 paiements, Cette année')).toBeTruthy();
  });
});
