import { Check } from 'lucide-react-native';
import { useRef, type ComponentRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AmountFigure } from '@/components/flow/amount-figure';
import { AmountKeypad, applyAmountKey } from '@/components/flow/amount-keypad';
import { LoanFlowFooter, LoanFlowPage, LoanQuestion } from '@/components/loans/add/loan-flow-page';
import { PayoffLine, type PayoffLineWords } from '@/components/loans/payoff/payoff-line';
import { RefreshNote } from '@/components/ui/refresh-note';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Fills in what clears the loan on the day chosen. Lit while the amount is that figure, so a day
 * changed later keeps it the whole amount.
 */
function PayAllChip({
  selected,
  hint,
  onPress,
}: {
  selected: boolean;
  hint: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('loanFlow.payoff.all')}
      accessibilityHint={hint}
      accessibilityState={{ selected }}
      onPress={withTap(onPress)}
      // 40pt tall by design; the touch target is the 44pt floor.
      hitSlop={{ top: 4, bottom: 4 }}
      testID="payoff-all"
      className={cn(
        'min-h-10 max-w-full flex-row items-center gap-1.5 self-center rounded-full border px-4 py-2',
        selected ? 'border-transparent bg-tint' : 'border-line bg-card active:bg-ink/5',
      )}
    >
      {selected ? <Check size={16} color={colors.tintInk} strokeWidth={2.4} /> : null}
      <Text
        className={cn(
          'shrink font-app-semibold text-[14px]',
          selected ? 'text-tint-ink' : 'text-ink',
        )}
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {t('loanFlow.payoff.all')}
      </Text>
    </Pressable>
  );
}

/**
 * The amount, on the app's keypad: what it does to the loan is said right under it as it is
 * typed, and "Pay it all" fills in what clears the loan. The keypad page the flow opens on.
 */
export function PayoffAmountView({
  title,
  draft,
  onDraft,
  line,
  payAll,
  ready,
  refreshFailed = false,
  onBack,
  onContinue,
}: {
  title: string;
  draft: string;
  onDraft: (draft: string) => void;
  line: PayoffLineWords;
  payAll: { selected: boolean; hint: string; onPress: () => void };
  /** An amount above nothing is typed. */
  ready: boolean;
  /** A reload of the loan failed; the figures are the ones it was opened with. */
  refreshFailed?: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const questionRef = useRef<ComponentRef<typeof Text>>(null);

  return (
    <LoanFlowPage
      title={title}
      onBack={onBack}
      closePrompt={t('loanFlow.payoff.close')}
      root
      focusRef={questionRef}
      footer={
        <LoanFlowFooter label={t('common.continue')} onPress={onContinue} disabled={!ready} />
      }
    >
      <LoanQuestion
        question={t('loanFlow.payoff.question')}
        helper={t('loanFlow.payoff.helper')}
        questionRef={questionRef}
      />
      <View className="mt-6 w-full flex-1">
        <AmountFigure value={draft} />
        <PayoffLine words={line} className="mt-3 text-center" testID="payoff-line" />
        <RefreshNote show={refreshFailed} />
        <View className="mt-4 w-full">
          <PayAllChip {...payAll} />
        </View>
        <View className="mt-auto w-full pt-8">
          <AmountKeypad onKey={(key) => onDraft(applyAmountKey(draft, key))} />
        </View>
      </View>
    </LoanFlowPage>
  );
}
