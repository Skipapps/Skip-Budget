import { Pressable, Text, View } from 'react-native';

import { PlanMark, dayMonthText, fullDateText } from '@/components/payments/plan-month-row';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import type { PaymentEntry, PaymentStatus } from '@/lib/payment-entries';
import { withTap } from '@/lib/press';
import { TEXT_CAP } from '@/theme/text-scale';

/** "Paid", or a loan payoff's own word. Charges are recorded on their due date: never "late". */
export function paymentStatusText(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return t('payments.status.paid');
    case 'paidOff':
      return t('payments.status.paidOff');
    case 'extraPayment':
      return t('payments.status.extraPayment');
  }
}

/** One character as search compares it: lower case, accent dropped, so positions stay put. */
const plainChar = (char: string) => char.toLowerCase().normalize('NFD').charAt(0) || char;

/**
 * Where a query sits in a name, as [start, end), compared as the search compares (any case, no
 * accents). Null when the name matched only through a typo or the plan's newer name: nothing to mark.
 */
export function nameMatch(name: string, query: string): [number, number] | null {
  // By UTF-16 unit on both sides, so an index into the plain name is one into the name.
  const plain = (text: string) =>
    Array.from({ length: text.length }, (_, index) => plainChar(text[index])).join('');
  const needle = plain(query.trim());
  if (!needle) return null;
  const hay = plain(name);
  const start = hay.indexOf(needle);
  return start < 0 ? null : [start, start + needle.length];
}

type PaymentRowProps = {
  payment: PaymentEntry;
  /** The card or account it came out of; null for none, or one deleted since. */
  sourceLabel: string | null;
  /** "9 Oct 2026" rather than "9 Oct", for a list that spans years. */
  withYear?: boolean;
  /** Left out when the payment's plan is unknown: the row is then not a button. */
  onOpen?: () => void;
  /** A search's words: the part of the name they match is drawn in plum. */
  highlight?: string;
};

/**
 * One payment that went out: its mark, the name it went out under, when and from where, how much
 * and what it was. A name word too wide to sit beside the amount puts the amount and status under
 * the name.
 */
export function PaymentRow({
  payment,
  sourceLabel,
  withYear = false,
  onOpen,
  highlight,
}: PaymentRowProps) {
  const words = useFitGroup({ mode: 'switch' });
  const stacked = !words.fits;
  const amount = formatCurrency(payment.amount);
  const date = withYear ? fullDateText(payment.date) : dayMonthText(payment.date);
  const source = sourceLabel ?? t('payments.cardNotSet');
  const status = paymentStatusText(payment.status);
  const match = highlight ? nameMatch(payment.name, highlight) : null;

  const figure = (
    <FitText
      id="amount"
      hug
      role="row"
      size={15}
      className="font-app-semibold text-ink"
      slotClassName={stacked ? 'mt-0.5' : undefined}
    >
      {amount}
    </FitText>
  );
  const statusLine = (
    <Text className="mt-0.5 font-app text-[12px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
      {status}
    </Text>
  );

  const content = (
    <>
      <PlanMark
        kind={payment.kind}
        name={payment.name}
        categoryId={payment.categoryId}
        iconId={payment.iconId}
        domain={payment.domain}
        logoHidden={payment.logoHidden}
      />
      <View className="min-w-0 flex-1 items-start">
        {match ? <MarkedName name={payment.name} match={match} /> : null}
        {/* With a part marked the name is drawn above; this copy only measures it for the row. */}
        <View
          aria-hidden={match ? true : undefined}
          accessibilityElementsHidden={match ? true : undefined}
          importantForAccessibility={match ? 'no-hide-descendants' : undefined}
          className={match ? 'h-0 w-full overflow-hidden' : 'w-full'}
        >
          <FitText
            id="name"
            role="row"
            size={15}
            className="font-app-medium text-ink"
            slotClassName="w-full"
          >
            {payment.name}
          </FitText>
        </View>
        {stacked ? figure : null}
        <Text
          className="mt-0.5 font-app text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {`${date} · ${source}`}
        </Text>
        {stacked ? statusLine : null}
      </View>
      {stacked ? null : (
        <View className="shrink-0 items-end">
          {figure}
          {statusLine}
        </View>
      )}
    </>
  );

  const spoken = t('payments.row.a11y', { name: payment.name, amount, date, source, status });
  const row = 'w-full flex-row items-center gap-3 px-[16px] py-[14px]';

  return (
    <FitGroup group={words} className="w-full" testID={`payment-${payment.id}-words`}>
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={spoken}
          onPress={withTap(onOpen)}
          testID={`payment-${payment.id}`}
          className={`${row} active:bg-ink/5`}
        >
          {content}
        </Pressable>
      ) : (
        <View
          accessible
          accessibilityLabel={spoken}
          testID={`payment-${payment.id}`}
          className={row}
        >
          {content}
        </View>
      )}
    </FitGroup>
  );
}

/**
 * The name with the searched part in plum. tint-ink, not accent-ink: the row sits on a card, where
 * accent-ink falls under 4.5:1 in dark. It grows with the phone's text size to the row ceiling,
 * as the name's FitText does: that group only switches layout, it never shrinks its text.
 */
function MarkedName({ name, match }: { name: string; match: [number, number] }) {
  const [start, end] = match;
  return (
    <Text
      testID="marked-name"
      className="w-full font-app-medium text-[15px] text-ink"
      maxFontSizeMultiplier={TEXT_CAP.row}
    >
      {name.slice(0, start)}
      <Text className="text-tint-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
        {name.slice(start, end)}
      </Text>
      {name.slice(end)}
    </Text>
  );
}
