import { Calculator } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { AmountStep } from '@/components/flow/amount-step';
import { InlineCalendar } from '@/components/flow/inline-calendar';
import { StepFlow } from '@/components/flow/step-flow';
import { ActionPill } from '@/components/ui/action-pill';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { TextField } from '@/components/ui/text-field';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextLink } from '@/components/ui/text-link';
import type { ReminderChoice, ReminderKind } from '@/api/reminders';
import type { PaymentSourceRow } from '@/api/queries';
import { ReminderField } from '@/components/ui/reminder-field';
import { t } from '@/i18n';

/**
 * The page a line of the review opens: one thing to set, Done to keep it, Back to leave it as it
 * was. Each holds its own copy of the value until Done, so Back writes nothing. They wear the same
 * shell as the add flows' steps (a single step draws no dots), so a correction looks like the
 * question it answers.
 */

type PageProps = {
  title: string;
  onBack: () => void;
};

/** The shell every one-field page shares. No close: one field has nothing to throw away Back does not. */
export function FieldPage({
  title,
  question,
  onBack,
  onDone,
  doneDisabled = false,
  avoidKeyboard = false,
  error,
  children,
}: PageProps & {
  question?: string;
  /** Omitted where a tap is the answer: there is no Done. */
  onDone?: () => void;
  doneDisabled?: boolean;
  avoidKeyboard?: boolean;
  /** Above Done, when Done could not keep the change. */
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <StepFlow
      title={title}
      steps={1}
      // Never the first page, so the edge swipe is off and hardware back steps back.
      current={1}
      onBack={onBack}
      question={question}
      primaryLabel={onDone ? t('common.done') : undefined}
      primaryDisabled={doneDisabled}
      onPrimary={onDone}
      error={error}
      avoidKeyboard={avoidKeyboard}
    >
      {children}
    </StepFlow>
  );
}

/** The keypad, to change an amount already set. A zero is not an amount, so Done waits. */
export function AmountEditPage({
  title,
  question,
  value,
  calculator,
  onBack,
  onDone,
}: PageProps & {
  question: string;
  value: string;
  /** The label of a calculator offered above the question (a bill's), or none. */
  calculator?: string;
  onDone: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const [padOpen, setPadOpen] = useState(false);
  const amount = Number(text);

  return (
    <StepFlow
      title={title}
      steps={1}
      current={1}
      onBack={onBack}
      question={question}
      headerSlot={
        calculator ? (
          <View className="w-full flex-row justify-center">
            <ActionPill icon={Calculator} label={calculator} onPress={() => setPadOpen(true)} />
          </View>
        ) : undefined
      }
      primaryLabel={t('common.done')}
      primaryDisabled={!(Number.isFinite(amount) && amount > 0)}
      onPrimary={() => onDone(text)}
    >
      <AmountStep value={text} onChange={setText} />

      {padOpen ? (
        <CalculatorPad
          title={calculator ?? ''}
          value={text}
          onCancel={() => setPadOpen(false)}
          onConfirm={(next) => {
            setText(next);
            setPadOpen(false);
          }}
        />
      ) : null}
    </StepFlow>
  );
}

/** Which card or account paid, or neither: it is optional. */
export function PaidWithEditPage({
  title,
  question = t('entry.askPaidWith'),
  sources,
  value,
  error,
  onBack,
  onDone,
}: PageProps & {
  question?: string;
  sources: readonly PaymentSourceRow[];
  value: string;
  error?: string | null;
  onDone: (sourceId: string) => void;
}) {
  const [sourceId, setSourceId] = useState(value);

  return (
    <FieldPage
      title={title}
      question={question}
      onBack={onBack}
      onDone={() => onDone(sourceId)}
      error={error}
    >
      <SourceTiles sources={sources} value={sourceId} onChange={setSourceId} />
      {sourceId ? (
        <TextLink
          label={t('entry.noSource')}
          variant="subtle"
          onPress={() => setSourceId('')}
          className="mt-3 self-start"
        />
      ) : null}
    </FieldPage>
  );
}

/** A line to remember it by. Optional, so an empty note is a fine one. */
export function NoteEditPage({
  title,
  label,
  placeholder,
  value,
  error,
  onBack,
  onDone,
}: PageProps & {
  label: string;
  placeholder: string;
  value: string;
  error?: string | null;
  onDone: (note: string) => void;
}) {
  const [note, setNote] = useState(value);

  return (
    <FieldPage
      title={title}
      onBack={onBack}
      onDone={() => onDone(note)}
      error={error}
      avoidKeyboard
    >
      <View className="mt-2 w-full">
        <TextField
          label={label}
          optional
          value={note}
          onChangeText={setNote}
          placeholder={placeholder}
          multiline
          maxLength={200}
          autoCapitalize="sentences"
        />
      </View>
    </FieldPage>
  );
}

/** A day on the calendar. */
export function DateEditPage({
  title,
  question,
  value,
  minDate,
  footerExtra,
  onBack,
  onDone,
}: PageProps & {
  question?: string;
  value: Date | null;
  /** Earlier days are dimmed and cannot be picked. */
  minDate?: Date | null;
  /** Under the calendar: "No renewal date". */
  footerExtra?: (clear: () => void) => ReactNode;
  onDone: (day: Date | null) => void;
}) {
  const [day, setDay] = useState<Date | null>(value);

  return (
    <FieldPage
      title={title}
      question={question}
      onBack={onBack}
      onDone={() => onDone(day)}
      doneDisabled={!day && !footerExtra}
    >
      <InlineCalendar value={day} onChange={setDay} minDate={minDate} />
      {footerExtra ? footerExtra(() => onDone(null)) : null}
    </FieldPage>
  );
}

/** When to be reminded, and at what time. Off is a choice, not a missing answer. */
export function ReminderEditPage({
  title,
  kind,
  value,
  time,
  onBack,
  onDone,
}: PageProps & {
  kind: ReminderKind;
  value: ReminderChoice;
  /** "HH:MM". */
  time: string;
  onDone: (choice: ReminderChoice, time: string) => void;
}) {
  const [choice, setChoice] = useState(value);
  const [at, setAt] = useState(time);

  return (
    <FieldPage title={title} onBack={onBack} onDone={() => onDone(choice, at)}>
      <View className="mt-2 w-full">
        <ReminderField
          kind={kind}
          value={choice}
          onChange={setChoice}
          time={at}
          onTimeChange={setAt}
        />
      </View>
    </FieldPage>
  );
}
