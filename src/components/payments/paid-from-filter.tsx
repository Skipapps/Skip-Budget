import type { Href } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { usePaymentLabels } from '@/api/payment-labels';
import { ChoiceList, type ChoiceItem } from '@/components/payments/choice-list';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

/** Choice values no card or account id can be. */
const ALL = '*all';
const NONE = '*none';

/** A route param as one string: expo-router hands a repeated one over as an array. */
function first(value: unknown): string | null {
  const one = Array.isArray(value) ? (value as unknown[])[0] : value;
  return typeof one === 'string' ? one : null;
}

/** A source as the filter page's link carries it: 'all', 'none' (Card not set) or an id. */
export function sourceParam(source: string | null): string {
  return source === null ? 'all' : source === '' ? 'none' : source;
}

/** The source a link asks for: null for every account, '' for Card not set. */
export function readSourceParam(value: unknown): string | null {
  const source = first(value);
  if (source === null || source === '' || source === 'all') return null;
  return source === 'none' ? '' : source;
}

/** The Paid from page, opened for the search page `owner` with its source as it stands. */
export function paidFromFilterHref(owner: string, source: string | null): Href {
  return {
    pathname: '/payment-filter',
    params: { type: 'from', owner, source: sourceParam(source) },
  };
}

/**
 * Where the payments a search covers came from: every account, one card or account, or none set.
 * Every card and account is listed, a free account's locked ones too: their payments went out all
 * the same. A choice is handed back as soon as it is tapped.
 */
export function PaidFromFilter({
  initial,
  onPick,
}: {
  initial: string | null;
  onPick: (source: string | null) => void;
}) {
  const colors = useColors();
  const artwork = useArtwork();
  const labels = usePaymentLabels();
  const title = t('payments.search.paidFrom');

  if (labels.isLoading) {
    return (
      <Screen title={title} showBack>
        <View className="mt-16 w-full items-center">
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      </Screen>
    );
  }

  if (labels.isError) {
    return (
      <Screen title={title} showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={labels.refetch}
        />
      </Screen>
    );
  }

  const items: ChoiceItem<string>[] = [
    { value: ALL, label: t('payments.search.allAccounts') },
    ...labels.sources.map((source) => ({ value: source.id, label: source.label })),
    { value: NONE, label: t('payments.cardNotSet') },
  ];
  // A card or account deleted since is not among the choices, so nothing is ticked.
  const chosen = initial === null ? ALL : initial === '' ? NONE : initial;

  return (
    <Screen title={title} showBack>
      <ChoiceList
        items={items}
        value={chosen}
        onChoose={(value) => onPick(value === ALL ? null : value === NONE ? '' : value)}
        className="mt-4"
        testID="paid-from"
      />
    </Screen>
  );
}
