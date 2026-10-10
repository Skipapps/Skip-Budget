import { Text, View } from 'react-native';

import { PaymentHeadline } from '@/components/calculators/payment-headline';
import { FitRows, FitText, useGroupFits } from '@/components/ui/fit-group';
import { percent, t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { TEXT_CAP } from '@/theme/text-scale';

type LoanResultCardProps = {
  /** The contract payment: the bank's when it was typed, else the one the app works out. */
  payment: number;
  /** What the payment is, when it is not the app's own figure. */
  paymentLabel?: string;
  /** Payments in the schedule shown, and the day the last one lands. */
  count: number;
  lastOn: Date;
  principal: number;
  interest: number;
  totalPaid: number;
  /** Prepaid finance charges; a line of their own when there are any. */
  fees: number;
  /** The disclosure APR, given only when it reads differently from the rate. */
  apr: number | null;
  /** Lines under the payment count: what leaves the account with extra, a short or long first period. */
  notes: readonly string[];
  /** What needs the person's attention: a balloon last payment, a change that no longer fits. */
  warnings?: readonly string[];
  /** Opens the page to type the lender's own payment. */
  onEditPayment?: () => void;
};

/** What the loan costs: the payment, how long, and borrowed against interest. */
export function LoanResultCard({
  payment,
  paymentLabel,
  count,
  lastOn,
  principal,
  interest,
  totalPaid,
  fees,
  apr,
  notes,
  warnings = [],
  onEditPayment,
}: LoanResultCardProps) {
  return (
    <View className="w-full rounded-[20px] border border-line bg-card p-[20px]">
      <PaymentHeadline payment={payment} label={paymentLabel} size={32} onEdit={onEditPayment} />

      <Text
        className="mt-3 font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('loan.calculator.paymentsLastOn', { count, date: formatFullDate(lastOn) })}
      </Text>
      {notes.map((note) => (
        <Text
          key={note}
          className="mt-1.5 font-app text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {note}
        </Text>
      ))}
      {warnings.map((warning) => (
        <Text
          key={warning}
          className="mt-1.5 font-app-medium text-[13px] leading-[18px] text-danger"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {warning}
        </Text>
      ))}

      {/* The rows below carry the figures; the bar only shows their proportion. */}
      <View
        className="mt-[16px] h-[8px] w-full flex-row gap-[4px]"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID="loan-split-bar"
      >
        <View style={{ flex: Math.max(principal, 0) }} className="rounded-full bg-accent" />
        {interest > 0 ? (
          <View style={{ flex: interest }} className="rounded-full bg-accent/45" />
        ) : null}
      </View>

      <FitRows className="mt-[16px] w-full gap-3" testID="loan-summary">
        <LoanSummaryLine
          id="borrowed"
          label={t('loan.borrowed')}
          value={formatCurrency(principal)}
          dot="bg-accent"
        />
        <LoanSummaryLine
          id="interest"
          label={t('loan.interest')}
          value={formatCurrency(interest)}
          dot="bg-accent/45"
        />
        {fees > 0 ? (
          <LoanSummaryLine
            id="fees"
            label={t('loan.calculator.feesAtClosing')}
            value={formatCurrency(fees)}
          />
        ) : null}
        <View className="h-px w-full bg-line" />
        <LoanSummaryLine
          id="total"
          label={t('loan.calculator.totalRepay')}
          value={formatCurrency(totalPaid)}
          strong
        />
        {/* APR is a disclosure term and stays as written. */}
        {apr !== null ? <LoanSummaryLine id="apr" label="APR" value={percent(apr, 2)} /> : null}
      </FitRows>

      {apr !== null ? (
        <Text
          className="mt-4 font-app text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('loan.calculator.aprNote')}
        </Text>
      ) : null}
    </View>
  );
}

const DOT = 8;
const DOT_GAP = 8;

/**
 * A label and its figure. Every line in the card keeps its figure beside its label, or every line
 * puts it underneath.
 */
export function LoanSummaryLine({
  id,
  label,
  value,
  dot,
  strong = false,
  positive = false,
}: {
  /** Names the fit slots; unique in its card. */
  id: string;
  label: string;
  value: string;
  /** The bar segment this line names, as a fill class. */
  dot?: string;
  strong?: boolean;
  /** Money not going out. */
  positive?: boolean;
}) {
  const stacked = !useGroupFits();
  return (
    <View
      className={
        stacked ? 'w-full items-start' : 'w-full flex-row items-center justify-between gap-3'
      }
    >
      <FitText
        id={`${id}-label`}
        role="row"
        size={strong ? 15 : 14}
        className={strong ? 'font-app-semibold text-ink' : 'font-app text-body'}
        slotClassName={cn(stacked ? 'w-full' : 'min-w-0 flex-1', dot && 'flex-row items-center')}
        reserve={dot ? DOT + DOT_GAP : 0}
        before={
          dot ? (
            <View
              style={{ width: DOT, height: DOT, marginRight: DOT_GAP }}
              className={cn('rounded-full', dot)}
            />
          ) : undefined
        }
      >
        {label}
      </FitText>
      <FitText
        id={`${id}-value`}
        hug
        role="row"
        size={strong ? 17 : 15}
        className={cn(
          strong ? 'font-app-bold' : 'font-app-semibold',
          positive ? 'text-money-in' : 'text-ink',
        )}
        slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
      >
        {value}
      </FitText>
    </View>
  );
}
