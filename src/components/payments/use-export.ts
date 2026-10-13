import { router, type Href } from 'expo-router';

import { usePro } from '@/api/pro';
import type { ExportKind } from '@/lib/payment-export';
import { useNavigateOnce } from '@/lib/use-navigate-once';

/** What a payments view is showing, and so what it would export. */
export type ExportScope = { kind: ExportKind; year: number | 'all' };

/** Both params are fixed words or digits, so the query needs no encoding. */
export function exportHref({ kind, year }: ExportScope): Href {
  return `/payment-export?kind=${kind}&year=${year}` as Href;
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
    navigateOnce(() =>
      router.push(pro ? exportHref(scope) : { pathname: '/pro-feature', params: { id: 'export' } }),
    );
  };

  return { open };
}
