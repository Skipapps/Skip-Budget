import { act, render } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import SavingsScreen from '@/app/savings';
import { t } from '@/i18n';
import { publishProStatus, resetProStatusForTests, type ProStatus } from '@/lib/pro-status';

/**
 * The 90-day window hides older history from the free plan. Savings has no history to hide, so it
 * is the same page on every plan: the placeholder, with no "older history" notice and no Pro wall.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

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
  'shows the placeholder on the %s plan, with no history notice or wall',
  async (_name, status) => {
    await act(async () => publishProStatus(status));
    const screen = await render(<SavingsScreen />);

    expect(screen.getByText('Savings is getting a fresh start')).toBeTruthy();
    expect(screen.getByText('A new way to save is on its way. It will show up here.')).toBeTruthy();
    expect(
      shownText(screen.toJSON() as Node).filter((line) =>
        NOTICE.some((part) => line.includes(part)),
      ),
    ).toEqual([]);
  },
);
