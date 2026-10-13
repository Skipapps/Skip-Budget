import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { AmountFilter, readAmountParams } from '@/components/payments/amount-filter';
import { DateRangeFilter, readRangeParams } from '@/components/payments/date-range-filter';
import { PaidFromFilter, readSourceParam } from '@/components/payments/paid-from-filter';
import { goBack } from '@/components/ui/back-button';
import { pickPayment, type PickedFilter } from '@/lib/payment-pick';
import { useNavigateOnce } from '@/lib/use-navigate-once';
import { useToday } from '@/lib/use-today';

type FilterParams = {
  type?: string;
  owner?: string;
  range?: string;
  from?: string;
  to?: string;
  min?: string;
  max?: string;
  source?: string;
};

/**
 * One payment search filter on a page of its own (`?type=date|amount|from&owner=…`), opened with
 * the filter as it stands. The choice is handed back to the search that opened it and the page goes
 * back; nothing is saved, so a page reached by a link hands its choice to nobody.
 */
export default function PaymentFilterScreen() {
  const params = useLocalSearchParams<FilterParams>();
  const { today } = useToday();
  const once = useNavigateOnce();
  const owner = typeof params.owner === 'string' ? params.owner : '';
  const type = params.type === 'date' || params.type === 'amount' || params.type === 'from';

  useEffect(() => {
    if (!type) goBack();
  }, [type]);

  const pick = (filter: PickedFilter) =>
    once(() => {
      pickPayment({ owner, type: 'filters', filter });
      goBack();
    });

  if (params.type === 'date') {
    return (
      <DateRangeFilter
        initial={readRangeParams(params)}
        today={today}
        onPick={(range) => pick({ range })}
      />
    );
  }
  if (params.type === 'amount') {
    return <AmountFilter initial={readAmountParams(params)} onPick={pick} />;
  }
  if (params.type === 'from') {
    return (
      <PaidFromFilter
        initial={readSourceParam(params.source)}
        onPick={(source) => pick({ source })}
      />
    );
  }
  return null;
}
