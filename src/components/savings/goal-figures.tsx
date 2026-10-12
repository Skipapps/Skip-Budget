import { useState } from 'react';
import { Text, View } from 'react-native';

import { LoanCard, LoanCardRow } from '@/components/calculators/loan-section';
import { SliderRow } from '@/components/calculators/slider-row';
import { MonthPicker } from '@/components/savings/month-picker';
import { shortMoney } from '@/components/savings/savings-words';
import { AmountPad } from '@/components/ui/amount-pad';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FitRows } from '@/components/ui/fit-group';
import { SectionHeading } from '@/components/ui/typography';
import { t } from '@/i18n';
import { toCents } from '@/lib/money';
import { TEXT_CAP } from '@/theme/text-scale';

// The slider's range. A typed figure may go past either end: the thumb waits at the end and the
// value shows what was typed.
const TARGET_MIN = 50;
const TARGET_MAX = 100_000;

/**
 * A goal's figures, as the calculator and the edit page ask for them: how much, by when (a month, or
 * no date), and what is already put aside.
 */
export function GoalFigures({
  target,
  onTarget,
  month,
  onMonth,
  saved,
  onSaved,
  from,
}: {
  target: number;
  onTarget: (target: number) => void;
  /** yyyy-mm, or null for no date. */
  month: string | null;
  onMonth: (month: string | null) => void;
  saved: number;
  onSaved: (saved: number) => void;
  /** yyyy-mm: the first month a date may be. */
  from: string;
}) {
  const [targetPad, setTargetPad] = useState(false);
  const [savedPad, setSavedPad] = useState(false);
  // The month a person last picked, so No date and back again does not lose it.
  const [lastMonth, setLastMonth] = useState(month ?? from);

  return (
    <View className="w-full">
      <SectionHeading className="mb-3 mt-8 px-1">{t('goals.calculator.target')}</SectionHeading>
      <LoanCard>
        <FitRows className="w-full" testID="goal-target">
          <SliderRow
            id="target"
            label={t('goals.calculator.targetLabel')}
            display={shortMoney(target)}
            value={target}
            min={TARGET_MIN}
            max={TARGET_MAX}
            step={50}
            scale="log"
            onChange={onTarget}
            onValuePress={() => setTargetPad(true)}
            className="px-[18px] pb-2 pt-[16px]"
          />
        </FitRows>
      </LoanCard>

      <SectionHeading className="mb-3 mt-8 px-1">{t('goals.calculator.byWhen')}</SectionHeading>
      <ChoiceChips
        tone="card"
        options={[
          { value: 'month', label: t('goals.calculator.pickMonth') },
          { value: 'none', label: t('goals.calculator.noDate') },
        ]}
        value={month ? 'month' : 'none'}
        onChange={(choice) => onMonth(choice === 'month' ? lastMonth : null)}
      />
      {month ? (
        <View className="mt-3 w-full rounded-[20px] border border-line bg-card px-[12px] py-[10px]">
          <MonthPicker
            value={month}
            from={from}
            onChange={(picked) => {
              setLastMonth(picked);
              onMonth(picked);
            }}
          />
        </View>
      ) : null}

      <SectionHeading className="mb-3 mt-8 px-1">
        {t('goals.calculator.alreadySaved')}
      </SectionHeading>
      <LoanCard>
        <FitRows className="w-full" testID="goal-saved">
          <LoanCardRow
            id="saved"
            first
            label={t('goals.calculator.alreadySaved')}
            value={toCents(saved) > 0 ? shortMoney(saved) : t('common.none')}
            unset={toCents(saved) <= 0}
            onPress={() => setSavedPad(true)}
          />
        </FitRows>
      </LoanCard>
      <Text
        className="mb-4 mt-2 w-full px-1 font-app text-[13px] leading-[18px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('goals.calculator.alreadySavedHint')}
      </Text>

      {targetPad ? (
        <AmountPad
          title={t('goals.calculator.targetLabel')}
          caption={t('goals.calculator.target')}
          value={String(target)}
          onCancel={() => setTargetPad(false)}
          check={(draft) =>
            toCents(Number(draft) || 0) > 0 ? null : t('goals.calculator.targetAboveZero')
          }
          onConfirm={(draft) => {
            onTarget(Number(draft) || 0);
            setTargetPad(false);
          }}
        />
      ) : null}

      {savedPad ? (
        <AmountPad
          title={t('goals.calculator.alreadySaved')}
          caption={t('goals.calculator.alreadySavedHint')}
          value={toCents(saved) > 0 ? String(saved) : ''}
          onCancel={() => setSavedPad(false)}
          onConfirm={(draft) => {
            onSaved(Math.max(0, Number(draft) || 0));
            setSavedPad(false);
          }}
        />
      ) : null}
    </View>
  );
}
