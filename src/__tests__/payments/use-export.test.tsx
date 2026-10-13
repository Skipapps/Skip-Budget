import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { exportHref, useExport, type ExportScope } from '@/components/payments/use-export';
import { PRO_FEATURES } from '@/data/pro-features';
import { publishProStatus, resetProStatusForTests, type ProStatus } from '@/lib/pro-status';

/**
 * Export is Pro. The hook reads the app's one Pro answer: unknown does nothing, free opens the
 * export explainer, Pro opens the export page for the view, and a double tap opens one page.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

// RevenueCat's bundle does not load under jest. The real usePro() is this same read of the shared
// store, so publishing an answer below reaches the hook as it does in the app.
jest.mock('@/api/pro', () => ({
  usePro: () => jest.requireActual('@/lib/pro-status').useProStatus(),
}));

const mockFocus: { effect: (() => void) | null } = { effect: null };
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: { push: jest.fn() },
    useFocusEffect: (effect: () => void) => {
      mockFocus.effect = effect;
      React.useEffect(effect, [effect]);
    },
  };
});

const push = router.push as jest.Mock;

/** The export explainer, told which export page to open once Pro is bought. */
const explainer = (next: string) => ({ pathname: '/pro-feature', params: { id: 'export', next } });

async function mount() {
  const hook = await renderHook(() => useExport());
  return {
    open: async (scope: ExportScope) => {
      await act(async () => hook.result.current.open(scope));
    },
    /** Two taps before the first page lands. */
    openTwice: async (scope: ExportScope) => {
      await act(async () => {
        hook.result.current.open(scope);
        hook.result.current.open(scope);
      });
    },
  };
}

const publish = (status: ProStatus) => act(async () => publishProStatus(status));

/** The page comes back into focus, as after the export page or the explainer is closed. */
const refocus = () => act(async () => mockFocus.effect?.());

beforeEach(() => {
  resetProStatusForTests();
  push.mockClear();
});
afterAll(() => resetProStatusForTests());

describe('useExport', () => {
  it('does nothing while Pro is still being checked, and that tap does not use up the page', async () => {
    const view = await mount();

    await view.open({ kind: 'all', year: 2026 });
    expect(push).not.toHaveBeenCalled();

    // Even an answer of Pro does not count until it is ready.
    await publish({ pro: true, ready: false });
    await view.open({ kind: 'all', year: 2026 });
    expect(push).not.toHaveBeenCalled();

    await publish({ pro: true, ready: true });
    await view.open({ kind: 'all', year: 2026 });
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/payment-export?kind=all&year=2026');
  });

  it('opens the export explainer on free, one that has its own page', async () => {
    publishProStatus({ pro: false, ready: true });
    const view = await mount();

    await view.open({ kind: 'bill', year: 2026 });
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(explainer('/payment-export?kind=bill&year=2026'));
    // An unknown id would quietly draw the cards-and-accounts explainer instead.
    expect(PRO_FEATURES[explainer('').params.id].id).toBe('export');
  });

  it.each([
    [{ kind: 'all', year: 2026 }, '/payment-export?kind=all&year=2026'],
    [{ kind: 'bill', year: 2024 }, '/payment-export?kind=bill&year=2024'],
    [{ kind: 'subscription', year: 'all' }, '/payment-export?kind=subscription&year=all'],
  ] as const)('opens the export page for the view on Pro: %j', async (scope, href) => {
    publishProStatus({ pro: true, ready: true });
    const view = await mount();

    await view.open(scope);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(href);
    expect(exportHref(scope)).toBe(href);
  });

  it('opens one page for a double tap, and again once the page is back in focus', async () => {
    publishProStatus({ pro: true, ready: true });
    const view = await mount();

    await view.openTwice({ kind: 'bill', year: 2026 });
    expect(push).toHaveBeenCalledTimes(1);

    await refocus();
    await view.open({ kind: 'all', year: 'all' });
    expect(push).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenLastCalledWith('/payment-export?kind=all&year=all');
  });

  it('follows the answer when it changes, as after buying Pro from the explainer', async () => {
    publishProStatus({ pro: false, ready: true });
    const view = await mount();

    await view.open({ kind: 'all', year: 2026 });
    expect(push).toHaveBeenLastCalledWith(explainer('/payment-export?kind=all&year=2026'));

    await publish({ pro: true, ready: true });
    await refocus();
    await view.open({ kind: 'all', year: 2026 });
    expect(push).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenLastCalledWith('/payment-export?kind=all&year=2026');
  });
});
