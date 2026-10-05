import { Redirect } from 'expo-router';

import { useSession } from '@/providers/session-provider';

/** Entry route: the dashboard when signed in, onboarding otherwise. */
export default function Index() {
  const { session } = useSession();
  return <Redirect href={session ? '/home' : '/welcome'} />;
}
