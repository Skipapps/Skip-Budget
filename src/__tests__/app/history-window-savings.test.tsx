import { act, render } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import SavingsScreen from '@/app/savings';
import { AUGUST, JULY, SEPTEMBER } from '@/components/savings/__fixtures__/design';
import { t } from '@/i18n';
import { publishProStatus, resetProStatusForTests, type ProStatus } from '@/lib/pro-status';

/**
 * The 90-day window hides older history from the free plan. Savings is free on every plan and
 * lists every month it has, however old: no "older history" notice and no Pro wall.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null, Skeleton: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: 'light' }),
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// A year-old month among this year's: older than any free window.
const mockPots = [
  SEPTEMBER,
  AUGUST,
  JULY,
  { ...JULY, id: 'old', month: '2025-07-01', movedOn: '2025-08-01' },
];
jest.mock('@/api/savings', () => ({
  useSavings: () => ({
    pots: mockPots,
    summary: { readyToUse: 850, pots: mockPots },
    soFar: null,
    isPending: false,
    isError: false,
    refetch: () => {},
  }),
}));

type Node = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

/** Every line a person can see or hear: text, labels, hints and placeholders. */
function shownText(node: Node): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(shownText);
  const props = node.props ?? {};
  const spoken = ['accessibilityLabel', 'accessibilityHint', 'placeholder'].flatMap((name) =>
    typeof props[name] === 'string' ? [props[name] as string] : [],
  );
  return [...spoken, ...(node.children ?? []).flatMap((child) => shownText(child as Node))];
}

// The notice the free plan sees on a list with older history, and the plan name a wall would use.
const NOTICE = [t('pro.history.notice.title'), t('pro.history.notice.detail'), 'Skip Pro'];

const PLANS: [string, ProStatus][] = [
  ['free', { pro: false, ready: true }],
  ['Pro', { pro: true, ready: true }],
  ['not yet known', { pro: false, ready: false }],
];

beforeEach(() => resetProStatusForTests());

it.each(PLANS)(
  'lists every month on the %s plan, with no history notice or wall',
  async (_name, status) => {
    await act(async () => publishProStatus(status));
    const screen = await render(<SavingsScreen />);

    expect(screen.getByText('2026')).toBeTruthy();
    expect(screen.getByText('2025')).toBeTruthy();
    expect(screen.getAllByText('July')).toHaveLength(2);
    expect(
      shownText(screen.toJSON() as Node).filter((line) =>
        NOTICE.some((part) => line.includes(part)),
      ),
    ).toEqual([]);
  },
);
