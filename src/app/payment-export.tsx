import { useLocalSearchParams } from 'expo-router';

import { usePayments } from '@/api/payment-ledger';
import { ExportScreen } from '@/components/payments/export-choices';
import { useProGate } from '@/components/pro/pro-gate';

/** Exports the payments a history view shows, as CSV or PDF. Pro only. */
export default function PaymentExportRoute() {
  // Wrapper, not inline: an early return above the page's own hooks would change the hook count
  // when the entitlement answer lands.
  const gate = useProGate('export');
  if (gate) return gate;
  return <PaymentExportInner />;
}

function PaymentExportInner() {
  const params = useLocalSearchParams<{ kind?: string; year?: string }>();
  return <ExportScreen kind={params.kind} year={params.year} usePayments={usePayments} />;
}
