import type { PayoffLineWords } from '@/components/loans/payoff/payoff-line';
import type {
  PayoffCheck,
  PayoffQuoteOn,
  PayoffRefusal,
} from '@/components/loans/payoff/payoff-preview';
import { pageDate, spokenDate } from '@/components/loans/view/loan-view-data';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';

type Tone = NonNullable<PayoffLineWords>['tone'];

/** One line, drawn with short dates and read with full ones. */
function said(tone: Tone, words: (date: (iso: string) => string) => string, today: string) {
  return { shown: words((iso) => pageDate(iso, today)), spoken: words(spokenDate), tone };
}

/** The same line drawn and read: it holds no date. */
const plain = (tone: Tone, line: string) => ({ shown: line, spoken: line, tone });

/** "$10,728.50 clears this loan today", or on the day chosen. */
export function clearsLine(quote: PayoffQuoteOn, today: string): NonNullable<PayoffLineWords> {
  const amount = formatCurrency(quote.payoff);
  if (quote.on === today) return plain('hint', t('loanFlow.payoff.allToday', { amount }));
  return said(
    'hint',
    (date) => t('loanFlow.payoff.allOn', { amount, date: date(quote.on) }),
    today,
  );
}

/**
 * What the amount typed does to the loan, every figure the engine's (`checkPayoff`): the loan paid
 * off, or how many payments are left and when the last one is; or why it cannot be paid. Before
 * anything is typed, what clears it.
 */
export function payoffLine(
  check: PayoffCheck | null,
  quote: PayoffQuoteOn,
  name: string,
  today: string,
): NonNullable<PayoffLineWords> {
  if (!check) return clearsLine(quote, today);
  if (!check.ok) return refusalLine(check.refusal, quote, today);

  if (check.kind === 'full') {
    return said(
      'outcome',
      (date) => t('loanFlow.payoff.full', { name, date: date(quote.on) }),
      today,
    );
  }
  const fewer = check.paymentsLeft < check.paymentsLeftBefore;
  return said(
    'outcome',
    (date) =>
      fewer
        ? t('loanFlow.payoff.partial', {
            count: check.paymentsLeft,
            before: check.paymentsLeftBefore,
            date: date(check.endsOn),
          })
        : t('loanFlow.payoff.partialSame', { count: check.paymentsLeft, date: date(check.endsOn) }),
    today,
  );
}

/** Why the amount or the day cannot be paid, in words, with what would do instead. */
export function refusalLine(
  refusal: PayoffRefusal,
  quote: PayoffQuoteOn,
  today: string,
): NonNullable<PayoffLineWords> {
  switch (refusal.reason) {
    case 'more-than-owed': {
      const amount = formatCurrency(refusal.quote);
      if (quote.on === today) {
        return plain('refusal', t('loanFlow.payoff.tooMuchToday', { amount }));
      }
      return said(
        'refusal',
        (date) => t('loanFlow.payoff.tooMuch', { amount, date: date(quote.on) }),
        today,
      );
    }
    case 'before-start':
      return said(
        'refusal',
        (date) => t('loanFlow.payoff.beforeStart', { date: date(refusal.earliest) }),
        today,
      );
    case 'before-last-payment':
    case 'before-last-payoff': {
      const made =
        refusal.reason === 'before-last-payment' ? refusal.lastPaymentOn : refusal.lastPayoffOn;
      return said(
        'refusal',
        (date) =>
          t('loanFlow.payoff.afterPayment', { date: date(made), earliest: date(refusal.earliest) }),
        today,
      );
    }
    case 'overtakes-later':
      return refusal.most > 0
        ? plain('refusal', t('loanFlow.payoff.overtakes', { amount: formatCurrency(refusal.most) }))
        : plain('refusal', t('loanFlow.payoff.overtakesNone'));
    case 'future':
      return plain('refusal', t('loanFlow.payoff.future'));
    case 'finished':
      return plain('refusal', t('loanFlow.payoff.finished'));
    case 'not-an-amount':
    case 'zero':
    case 'not-a-date':
      // Nothing the keypad or the calendar can give: Continue waits for an amount.
      return clearsLine(quote, today);
  }
}
