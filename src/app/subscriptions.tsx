import { useLocalSearchParams } from 'expo-router';

import { useHistoryFloor } from '@/api/history';
import { PlanMonthScreen } from '@/components/payments/plan-month-screen';
import { parseMonth } from '@/lib/payment-entries';
import { paymentFloor } from '@/lib/payment-years';
import { useToday } from '@/lib/use-today';

/**
 * Subscriptions (`?month=yyyy-mm`). A month from a link is held between the oldest month the plan
 * lists (90 days back on free, seven calendar years on Pro) and a year ahead, as Choose month offers.
 */
export default function SubscriptionsScreen() {
  const { month } = useLocalSearchParams<{ month?: string }>();
  const { today } = useToday();
  const { floor, free } = useHistoryFloor();
  return (
    <PlanMonthScreen
      kind="subscription"
      month={parseMonth(month, today, free ? floor : paymentFloor(today))}
    />
  );
}
