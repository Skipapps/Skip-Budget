import { render } from '@testing-library/react-native';

import NotificationsScreen from '@/app/notifications';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * Notifications is news from Skip and nothing else: no charges, no reminders.
 * Opening it is reading it.
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

const mockMarkSeen = jest.fn();
jest.mock('@/api/news', () => ({ useMarkNewsSeen: () => mockMarkSeen }));

const mockRefetch = jest.fn();
let mockNews: { data?: unknown[]; isPending: boolean; isError: boolean };
jest.mock('@/api/queries', () => ({
  useAnnouncements: () => ({ ...mockNews, refetch: mockRefetch, isRefetching: false }),
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

beforeEach(() => {
  jest.clearAllMocks();
  mockNews = { data: [RELEASE, FEATURE], isPending: false, isError: false };
});

it('shows the news, labelled by what kind it is', async () => {
  const screen = await render(<NotificationsScreen />);

  expect(screen.getByText('Version 1.2 is out')).toBeTruthy();
  expect(screen.getByText('Update from the App Store for faster scanning.')).toBeTruthy();
  expect(screen.getByText('Add a receipt by voice')).toBeTruthy();
  expect(screen.getByText(/^Update · /)).toBeTruthy();
  expect(screen.getByText(/^New feature · /)).toBeTruthy();
});

it('marks the newest item as seen on opening', async () => {
  await render(<NotificationsScreen />);
  expect(mockMarkSeen).toHaveBeenCalledWith(RELEASE.published_at);
});

it('says so when there is no news yet, and marks nothing', async () => {
  mockNews = { data: [], isPending: false, isError: false };
  const screen = await render(<NotificationsScreen />);

  expect(screen.getByText('No news yet')).toBeTruthy();
  expect(mockMarkSeen).not.toHaveBeenCalled();
});

it('says the one failure line when the news will not load', async () => {
  mockNews = { isPending: false, isError: true };
  const screen = await render(<NotificationsScreen />);

  expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
  expect(screen.getByText('Try again')).toBeTruthy();
});
