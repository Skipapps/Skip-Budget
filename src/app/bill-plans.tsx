import { Redirect } from 'expo-router';

/** Monthly bills lists every bill now; an old link or push here lands there. */
export default function BillPlansScreen() {
  return <Redirect href="/bills" />;
}
