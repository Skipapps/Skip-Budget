import { router } from 'expo-router';

import { usePro } from '@/api/pro';
import type { ExportKind } from '@/lib/payment-export';
import { useNavigateOnce } from '@/lib/use-navigate-once';

/** What a payments view is showing, and so what it would export. */
export type ExportScope = { kind: ExportKind; year: number | 'all' };

/** Both params are fixed words or digits, so the query needs no encoding. */
export function exportHref({ kind, year }: ExportScope): `/payment-export?${string}` {
  return `/payment-export?kind=${kind}&year=${year}`;
}

/**
 * Export from any payments page: Pro opens the export page for the view, free opens the export
 * explainer. Until Pro is known a tap does nothing, so nobody who has paid is sent to the
 * explainer; one page per visit, since the header button and the link are the same action.
 */
export function useExport(): { open: (scope: ExportScope) => void } {
  const { pro, ready } = usePro();
  const navigateOnce = useNavigateOnce();

  const open = (scope: ExportScope) => {
    if (!ready) return;
    const page = exportHref(scope);
    navigateOnce(() =>
      router.push(pro ? page : { pathname: '/pro-feature', params: { id: 'export', next: page } }),
    );
  };

  return { open };
}
