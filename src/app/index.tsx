import { Redirect } from 'expo-router';

import { useSession } from '@/providers/session-provider';

/**
 * Entry route. Signed-in users land on the dashboard; everyone else starts
 * onboarding.
 */
export default function Index() {
  const { session } = useSession();
  return <Redirect href={session ? '/home' : '/welcome'} />;
}
