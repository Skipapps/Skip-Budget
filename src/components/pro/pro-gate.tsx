import { Redirect, useCurrentRouteInfo } from 'expo-router';
import { useState, type ReactElement } from 'react';

import { usePro } from '@/api/pro';

/**
 * The one-line gate a Pro screen opens with:
 *
 *   const gate = useProGate('insights');
 *   if (gate) return gate;
 *
 * Free lands on the feature's explainer; unknown-yet renders nothing rather than flashing a paywall
 * at someone who paid; Pro falls through. Deep links, tiles and back-stack returns all pass here.
 *
 * Decided once, on the first known answer, for the life of the screen. A page opened with Pro stays
 * open if Pro lapses under it (nothing locks on lapse), so a form whose save is refused as free
 * keeps what was typed and the explainer it pushes returns to it.
 */
export function useProGate(featureId: string): ReactElement | null {
  const { pro, ready } = usePro();
  const [opened, setOpened] = useState<boolean | null>(null);
  let decided = opened;
  if (decided === null && ready) {
    decided = pro;
    setOpened(pro);
  }
  if (decided === null) return <></>;
  if (!decided) return <ProFeatureRedirect featureId={featureId} />;
  return null;
}

/** The explainer in place of this page, told to open this page again, params and all, once Pro. */
export function ProFeatureRedirect({ featureId }: { featureId: string }) {
  // This screen's own route, not whichever is on top: a lapse can redirect a page left underneath.
  const here = useCurrentRouteInfo()?.pathnameWithParams;
  return (
    <Redirect
      href={{
        pathname: '/pro-feature',
        params: here ? { id: featureId, next: here } : { id: featureId },
      }}
    />
  );
}
