import { Redirect } from 'expo-router';
import type { ReactElement } from 'react';

import { usePro } from '@/api/pro';

/**
 * The one-line gate a Pro screen opens with:
 *
 *   const gate = useProGate('insights');
 *   if (gate) return gate;
 *
 * Free lands on the feature's explainer; unknown-yet renders nothing rather than flashing a paywall
 * at someone who paid; Pro falls through. Deep links, tiles and back-stack returns all pass here.
 */
export function useProGate(featureId: string): ReactElement | null {
  const { pro, ready } = usePro();
  if (!ready) return <></>;
  if (!pro) return <Redirect href={{ pathname: '/pro-feature', params: { id: featureId } }} />;
  return null;
}
