import { useRef, useState, type ComponentRef } from 'react';
import { Text, View } from 'react-native';

import { AmountStep } from '@/components/flow/amount-step';
import { LoanFlowFooter, LoanFlowPage, LoanQuestion } from '@/components/loans/add/loan-flow-page';
import { wholeCents } from '@/lib/money';

/**
 * An amount on the app's keypad: the monthly payment the flow starts with, or a figure the details
 * page sends back here to change. It keeps its own copy until the button, so Back writes nothing.
 */
export function LoanKeypadView({
  title,
  question,
  helper,
  value,
  root,
  onBack,
  closePrompt,
  primaryLabel,
  onDone,
}: {
  title: string;
  question: string;
  helper: string;
  /** The keypad draft it opens on. */
  value: string;
  root: boolean;
  onBack: () => void;
  /** The flow's own first page has close; a figure sent here from the details page does not. */
  closePrompt?: string;
  primaryLabel: string;
  onDone: (draft: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const questionRef = useRef<ComponentRef<typeof Text>>(null);
  const cents = wholeCents(Number(draft));
  const ready = draft !== '' && cents !== null && cents > 0;

  return (
    <LoanFlowPage
      title={title}
      onBack={onBack}
      closePrompt={closePrompt}
      root={root}
      focusRef={questionRef}
      footer={
        <LoanFlowFooter label={primaryLabel} onPress={() => onDone(draft)} disabled={!ready} />
      }
    >
      <LoanQuestion question={question} helper={helper} questionRef={questionRef} />
      <View className="mt-6 w-full flex-1">
        <AmountStep value={draft} onChange={setDraft} />
      </View>
    </LoanFlowPage>
  );
}
