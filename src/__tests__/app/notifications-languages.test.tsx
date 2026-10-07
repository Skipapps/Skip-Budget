import { render } from '@testing-library/react-native';

import NotificationsScreen from '@/app/notifications';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { formatFullDate } from '@/lib/date';

/**
 * Notifications in Spanish and French. The page's own words follow the language; the news itself
 * comes from the database and stays as it was written.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333', line: '#DDDDDD' }),
}));
jest.mock('@/api/news', () => ({ useMarkNewsSeen: () => jest.fn() }));

let mockNews: { data?: unknown[]; isPending: boolean; isError: boolean };
jest.mock('@/api/queries', () => ({
  useAnnouncements: () => ({ ...mockNews, refetch: jest.fn(), isRefetching: false }),
}));

const RELEASE = {
  id: 'n-1',
  kind: 'update',
  title: 'Version 1.2 is out',
  body: 'Update from the App Store for faster scanning.',
  published_at: '2026-09-28T09:00:00+00:00',
};
const FEATURE = {
  id: 'n-2',
  kind: 'feature',
  title: 'Add a receipt by voice',
  body: '',
  published_at: '2026-09-20T09:00:00+00:00',
};

const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;

type Screen = Awaited<ReturnType<typeof render>>;
function expectAllWorded(screen: Screen) {
  const lines = [
    ...screen.getAllByText(/./).map((node) => String(node.props.children)),
    ...screen.queryAllByLabelText(/./).map((node) => String(node.props.accessibilityLabel)),
  ];
  for (const line of lines) {
    expect(line).not.toMatch(RAW_KEY);
    expect(line).not.toMatch(/\{\w+\}/);
  }
}

const published = (iso: string) => formatFullDate(new Date(iso));

beforeEach(() => {
  resetLocaleForTests();
  mockNews = { data: [RELEASE, FEATURE], isPending: false, isError: false };
});

it('labels the news in Spanish, and leaves the news itself as written', async () => {
  setLanguage('es');
  const screen = await render(<NotificationsScreen />);

  expect(screen.getByText('Notificaciones')).toBeTruthy();
  expect(
    screen.getByText(
      'Novedades de Skip: actualizaciones para instalar y funciones recién llegadas.',
    ),
  ).toBeTruthy();
  expect(screen.getByText(`Actualización · ${published(RELEASE.published_at)}`)).toBeTruthy();
  expect(screen.getByText(`Nueva función · ${published(FEATURE.published_at)}`)).toBeTruthy();
  expect(screen.getByText('Version 1.2 is out')).toBeTruthy();
  expect(
    screen.getByLabelText(
      `Actualización, ${published(RELEASE.published_at)}. Version 1.2 is out. Update from the App Store for faster scanning.`,
    ),
  ).toBeTruthy();
  expectAllWorded(screen);
});

it('labels the news in French', async () => {
  setLanguage('fr');
  const screen = await render(<NotificationsScreen />);

  expect(screen.getByText('Notifications')).toBeTruthy();
  expect(screen.getByText(`Mise à jour · ${published(RELEASE.published_at)}`)).toBeTruthy();
  expect(published(RELEASE.published_at)).toMatch(/2026$/);
  expect(screen.getByText(`Nouvelle fonction · ${published(FEATURE.published_at)}`)).toBeTruthy();
  expectAllWorded(screen);
});

it.each([
  ['es', 'Aún no hay novedades', 'Las actualizaciones y nuevas funciones de Skip aparecerán aquí.'],
  [
    'fr',
    'Pas encore de nouvelles',
    'Les mises à jour et les nouvelles fonctions de Skip s’afficheront ici.',
  ],
] as const)('says there is no news yet in %s', async (language, title, detail) => {
  setLanguage(language);
  mockNews = { data: [], isPending: false, isError: false };
  const screen = await render(<NotificationsScreen />);

  expect(screen.getByText(title)).toBeTruthy();
  expect(screen.getByText(detail)).toBeTruthy();
});

it.each([
  ['es', 'Algo salió mal. Inténtalo de nuevo.', 'Intentar de nuevo'],
  ['fr', 'Une erreur est survenue. Réessaie.', 'Réessayer'],
] as const)('says the one failure line in %s', async (language, failure, retry) => {
  setLanguage(language);
  mockNews = { isPending: false, isError: true };
  const screen = await render(<NotificationsScreen />);

  expect(screen.getByText(failure)).toBeTruthy();
  expect(screen.getByText(retry)).toBeTruthy();
});
