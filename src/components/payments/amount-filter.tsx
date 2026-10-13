import type { Href } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import { CurrencyField } from '@/components/ui/currency-field';
import { FilterActions } from '@/components/ui/filter-actions';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { fromCents, MAX_MONEY_CENTS, wholeCents } from '@/lib/money';
import { draftFromAmount } from '@/lib/typed-amount';
import { TEXT_CAP } from '@/theme/text-scale';

export type AmountBounds = { minCents: number | null; maxCents: number | null };

const CENTS = /^\d{1,15}$/;

/** A route param as one string: expo-router hands a repeated one over as an array. */
function first(value: unknown): string | null {
  const one = Array.isArray(value) ? (value as unknown[])[0] : value;
  return typeof one === 'string' ? one : null;
}

function readCents(value: unknown): number | null {
  const text = first(value);
  if (text === null || !CENTS.test(text)) return null;
  const cents = Number(text);
  return cents <= MAX_MONEY_CENTS ? cents : null;
}

/** The bounds as the filter page's link carries them: whole cents, so no language changes them. */
export function amountParams({ minCents, maxCents }: AmountBounds): { min?: string; max?: string } {
  return {
    ...(minCents !== null ? { min: String(minCents) } : {}),
    ...(maxCents !== null ? { max: String(maxCents) } : {}),
  };
}

/** The bounds a link asks for; one that is not a whole number of cents is no bound. */
export function readAmountParams(params: { min?: unknown; max?: unknown }): AmountBounds {
  return { minCents: readCents(params.min), maxCents: readCents(params.max) };
}

/** The amount page, opened for the search page `owner` with its bounds as they stand. */
export function amountFilterHref(owner: string, bounds: AmountBounds): Href {
  return {
    pathname: '/payment-filter',
    params: { type: 'amount', owner, ...amountParams(bounds) },
  };
}

/** A keypad draft ("15.99", "" for empty) in whole cents; empty, or not an amount, is no bound. */
export function draftCents(draft: string): number | null {
  if (!draft) return null;
  return wholeCents(Number(draft));
}

const draftOf = (cents: number | null) =>
  cents === null ? '' : draftFromAmount(String(fromCents(cents)));

/**
 * The amounts a payment search covers: at least, at most, both or neither, each end included. Both
 * are handed back together, so clearing one cannot leave the other behind. A smaller "at most" than
 * "at least" is refused with a line above the buttons, never a toast.
 */
export function AmountFilter({
  initial,
  onPick,
}: {
  initial: AmountBounds;
  onPick: (bounds: AmountBounds) => void;
}) {
  const [min, setMin] = useState(() => draftOf(initial.minCents));
  const [max, setMax] = useState(() => draftOf(initial.maxCents));
  const [refusal, setRefusal] = useState<string | null>(null);

  const apply = () => {
    const minCents = draftCents(min);
    const maxCents = draftCents(max);
    if (minCents !== null && maxCents !== null && minCents > maxCents) {
      const reason = t('payments.amount.order');
      setRefusal(reason);
      AccessibilityInfo.announceForAccessibility(reason);
      return;
    }
    onPick({ minCents, maxCents });
  };

  return (
    <Screen
      title={t('payments.search.amount')}
      showBack
      avoidKeyboard
      footer={
        // The refusal sits right above the button that was pressed, so large text cannot scroll it
        // out of sight.
        <View className="w-full gap-2">
          {refusal ? (
            <Text
              accessibilityRole="alert"
              className="w-full text-center font-app text-[13px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {refusal}
            </Text>
          ) : null}
          <FilterActions
            resetLabel={t('payments.filter.clear')}
            applyLabel={t('payments.filter.apply')}
            onReset={() => {
              setMin('');
              setMax('');
              setRefusal(null);
            }}
            onApply={apply}
          />
        </View>
      }
    >
      <View className="mt-4 w-full gap-5">
        {/* Named for VoiceOver: an empty amount field has no placeholder to say what it is. */}
        <CurrencyField
          label={t('payments.amount.min')}
          accessibilityLabel={t('payments.amount.min')}
          value={min}
          onChange={(draft) => {
            setMin(draft);
            setRefusal(null);
          }}
        />
        <CurrencyField
          label={t('payments.amount.max')}
          accessibilityLabel={t('payments.amount.max')}
          value={max}
          onChange={(draft) => {
            setMax(draft);
            setRefusal(null);
          }}
        />
      </View>
    </Screen>
  );
}
