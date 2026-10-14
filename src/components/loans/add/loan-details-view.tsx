import { Pressable, Text, View } from 'react-native';

import type { PaymentSourceRow } from '@/api/queries';
import { LoanTypeGrid } from '@/components/calculators/loan-type-grid';
import { loanAmountText } from '@/components/calculators/schedule-card';
import { SegmentedChips } from '@/components/entry/entry-review';
import { DateBox } from '@/components/entry/date-box';
import { LoanFlowFooter, LoanFlowPage } from '@/components/loans/add/loan-flow-page';
import {
  firstPaymentHint,
  firstPaymentOf,
  firstPaymentProblemOf,
  loanName,
  latestFirstPaymentOf,
  paymentDayChoiceLabel,
  paymentDayChoiceTitle,
  paymentDayChoicesOf,
  paymentDayOf,
  paymentRhythm,
  rateFromTyped,
  rateShown,
  termFromTyped,
  withFirstPayment,
  withStartDate,
  type LoanForm,
  type TermUnit,
} from '@/components/loans/add/loan-form';
import { QuietAction } from '@/components/savings/quiet-action';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, SectionHeading } from '@/components/ui/typography';
import { t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { earliestFirstPayment } from '@/lib/loan-first-payment';
import { withTap } from '@/lib/press';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * A figure set on the keypad page: the box shows it, and a tap goes back to the keypad to change
 * it. Empty, it says Add.
 */
function KeypadBox({
  label,
  value,
  onPress,
  testID,
}: {
  label: string;
  value: string | null;
  onPress: () => void;
  testID: string;
}) {
  return (
    <View className="w-full">
      <FieldLabel className="mb-2">{label}</FieldLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          value
            ? t('loan.sliderRow.edit', { label, value })
            : t('loanFlow.field.addA11y', { label })
        }
        onPress={withTap(onPress)}
        testID={testID}
        // Wraps rather than cuts: at the largest text the word drops under the figure.
        className="min-h-14 w-full flex-row flex-wrap items-center justify-between gap-x-3 rounded-[12px] border border-line px-5 py-3 active:bg-ink/5"
      >
        <Text
          className={value ? 'font-app text-[16px] text-ink' : 'font-app text-[16px] text-muted'}
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {value ?? '—'}
        </Text>
        <Text
          className="font-app-medium text-[14px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {value ? t('common.edit') : t('common.add')}
        </Text>
      </Pressable>
    </View>
  );
}

const amountOf = (draft: string) => (draft ? Number(draft) : 0);

/**
 * The loan's details: its type, one card of fields, then where it is paid from. Continue never
 * greys out; it says what is still missing. A saved loan being changed has its Delete at the end.
 */
export function LoanDetailsView({
  title = t('loanFlow.details.title'),
  closePrompt = t('loanFlow.close'),
  onDelete,
  form,
  onChange,
  sources,
  todayDate,
  root,
  onBack,
  onEditMonthly,
  onEditPrincipal,
  onContinue,
  error,
  scrollPlace,
}: {
  title?: string;
  closePrompt?: string;
  onDelete?: { onPress: () => void; busy: boolean };
  form: LoanForm;
  onChange: (patch: Partial<LoanForm>) => void;
  sources: readonly PaymentSourceRow[];
  todayDate: Date;
  root: boolean;
  onBack: () => void;
  onEditMonthly: () => void;
  onEditPrincipal: () => void;
  onContinue: () => void;
  error: string | null;
  scrollPlace: { y: number; keep: (y: number) => void };
}) {
  const first = firstPaymentOf(form);
  const day = paymentDayOf(form);
  const dayChoices = paymentDayChoicesOf(form);
  const firstProblem = firstPaymentProblemOf(form);
  const earliest = form.startDate ? earliestFirstPayment(form.startDate) : null;
  const latest = latestFirstPaymentOf(form);
  const monthly = amountOf(form.monthly);
  const principal = amountOf(form.principal);

  const units: { unit: TermUnit; label: string }[] = [
    { unit: 'years', label: t('loanFlow.term.years') },
    { unit: 'months', label: t('loanFlow.term.months') },
  ];

  return (
    <LoanFlowPage
      title={title}
      onBack={onBack}
      closePrompt={closePrompt}
      root={root}
      avoidKeyboard
      scrollPlace={scrollPlace}
      footer={<LoanFlowFooter error={error} label={t('common.continue')} onPress={onContinue} />}
    >
      <SectionHeading className="mt-2">{t('loan.save.loanType')}</SectionHeading>
      <View className="mt-3 w-full">
        <LoanTypeGrid value={form.type} onChange={(type) => onChange({ type })} />
      </View>

      <View
        className="mt-5 w-full gap-[18px] overflow-hidden rounded-[20px] border border-line bg-card p-4"
        testID="loan-details-card"
      >
        <TextField
          label={t('loanFlow.field.name')}
          value={loanName(form)}
          onChangeText={(typedName) => onChange({ typedName })}
          placeholder={t('loan.save.namePlaceholder')}
          autoCapitalize="sentences"
          returnKeyType="done"
        />

        <KeypadBox
          label={t('loan.monthlyPayment')}
          value={monthly > 0 ? formatCurrency(monthly) : null}
          onPress={onEditMonthly}
          testID="loan-monthly-box"
        />

        <KeypadBox
          label={t('loanFlow.field.borrowed')}
          value={principal > 0 ? loanAmountText(principal) : null}
          onPress={onEditPrincipal}
          testID="loan-principal-box"
        />

        <TextField
          label={t('loan.interestRate')}
          value={rateShown(form.rate)}
          onChangeText={(text) => onChange({ rate: rateFromTyped(text) })}
          keyboardType="decimal-pad"
          returnKeyType="done"
          trailing={
            <Text
              className="font-app text-[16px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              %
            </Text>
          }
        />

        {/* The number and its unit side by side; at large text the unit goes under it. */}
        <View className="w-full flex-row flex-wrap items-end gap-3">
          <View className="min-w-[96px] flex-1">
            <TextField
              label={t('loan.termLabel')}
              value={form.term}
              onChangeText={(text) => onChange({ term: termFromTyped(text) })}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={3}
            />
          </View>
          <View className="min-h-14 min-w-[184px] flex-[1.6] justify-center">
            <SegmentedChips
              options={units.map(({ unit, label }) => ({
                key: unit,
                label,
                selected: form.termUnit === unit,
                onPress: () => onChange({ termUnit: unit }),
              }))}
            />
          </View>
        </View>

        <DateBox
          label={t('loanFlow.field.start')}
          value={form.startDate}
          today={todayDate}
          placeholder={t('loanFlow.field.startPlaceholder')}
          format={formatFullDate}
          onChange={(startDate) => onChange(withStartDate(form, startDate))}
        />

        <View className="w-full">
          <DateBox
            label={t('loanFlow.field.firstPayment')}
            value={first}
            today={todayDate}
            placeholder={t('loanFlow.field.firstPaymentPlaceholder')}
            format={formatFullDate}
            minDate={earliest}
            maxDate={latest}
            onChange={(picked) => onChange(withFirstPayment(form, picked))}
          />
          {dayChoices ? (
            <View className="mt-3 w-full" testID="loan-month-end-choice">
              <Text
                className="mb-2 font-app text-[13px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {paymentDayChoiceTitle()}
              </Text>
              <SegmentedChips
                variant="pills"
                options={dayChoices.map((choice) => ({
                  key: String(choice),
                  label: paymentDayChoiceLabel(choice),
                  selected: day === choice,
                  onPress: () => onChange({ pickedDay: choice }),
                }))}
              />
            </View>
          ) : null}
          {firstProblem && form.startDate ? (
            <Text
              className="ml-5 mt-1.5 font-app text-[13px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.reading}
              testID="loan-first-payment-hint"
            >
              {firstPaymentHint(firstProblem, form.startDate)}
            </Text>
          ) : day ? (
            <Text
              className="mt-3 font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
              testID="loan-payment-rhythm"
            >
              {paymentRhythm(day)}
            </Text>
          ) : null}
        </View>
      </View>

      <SectionHeading className="mt-6">{t('loan.save.paidFrom')}</SectionHeading>
      <View className="mb-4 mt-3 w-full">
        <SourceTiles
          sources={sources}
          value={form.sourceId ?? ''}
          onChange={(sourceId) => onChange({ sourceId })}
          skip={{
            label: t('loan.save.skipSource'),
            selected: form.sourceId === '',
            onPress: () => onChange({ sourceId: '' }),
          }}
        />
      </View>

      {onDelete ? (
        <QuietAction
          className="mb-4"
          tone="danger"
          label={onDelete.busy ? t('loanFlow.edit.deleting') : t('loanFlow.edit.delete')}
          onPress={onDelete.onPress}
          disabled={onDelete.busy}
          testID="loan-delete"
        />
      ) : null}
    </LoanFlowPage>
  );
}
