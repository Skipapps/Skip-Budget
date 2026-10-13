import { Redirect } from 'expo-router';

/** Subscriptions lists every subscription now; an old link or push here lands there. */
export default function SubscriptionPlansScreen() {
  return <Redirect href="/subscriptions" />;
}
