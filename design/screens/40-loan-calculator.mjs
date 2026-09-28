import * as C from '../kit/components.mjs';

const { screen, vstack, hstack, box, text, icon, divider, flexSpacer, spacer } = C;
const { fmt, TYPE } = C;

export const section = 'Loans';
export const order = 40;

/*
 * src/app/loan-calculator.tsx
 *
 * Figures are not invented: every one below comes from the app's own engine
 * (`comparePrepayment` / `truthInLending` in src/lib) run on $25,000 at 6.50%
 * over 60 months, money received 17 Aug 2026, first payment 17 Sep 2026.
 *   contract payment $489.22 · 60 payments · last 17 Aug 2031
 *   interest $4,353.40 · repaid $29,353.40 · APR 6.5059% · first payment 28% interest
 * The overpaying state adds $150 a month, a $2,000 one-off on 17 Sep 2027 and
 * $450 of fees: 41 payments, last 17 Jan 2030, interest $2,825.52,
 * repaid $27,825.52, saved $1,527.88 / 1 yr 7 mo, APR 7.2674%.
 */

// --- local pieces the kit has no component for ------------------------------

/** loan-calculator.tsx's own <SummaryLine>. */
const SummaryLine = (label, value, { strong, accent, positive } = {}) =>
  hstack({ justify: 'between', gap: 12, name: 'SummaryLine' }, [
    text(label, strong ? { size: 15, weight: 500, lineHeight: 22, color: 'ink' } : { size: 14, weight: 400, lineHeight: 20, color: 'body' }, { flex: 1 }),
    text(
      value,
      strong
        ? { size: 17, weight: 700, lineHeight: 24, color: 'ink' }
        : { size: 15, weight: 600, lineHeight: 22, color: accent ? 'moneyOut' : positive ? 'moneyIn' : 'ink' },
      { nowrap: true },
    ),
  ]);

/** The answer card at the top of the screen. */
const Hero = ({ payment, count, last, extraLine, openingLine }) =>
  vstack({ mt: 24, radius: 16, stroke: 'line', fill: 'card', pad: { y: 24, x: 20 }, align: 'center', name: 'MonthlyPayment' }, [
    text('Monthly payment', TYPE.caption, { nowrap: true, hug: true }),
    text(payment, { size: 40, weight: 700, lineHeight: 52, color: 'ink' }, { mt: 4, nowrap: true, hug: true }),
    text(`${count} payments · last on ${last}`, { ...TYPE.caption, align: 'center' }, { mt: 4 }),
    extraLine ? text(extraLine, { size: 12, weight: 400, lineHeight: 17, color: 'muted', align: 'center' }, { mt: 8 }) : null,
    openingLine ? text(openingLine, { size: 12, weight: 400, lineHeight: 17, color: 'muted', align: 'center' }, { mt: 8 }) : null,
  ]);

const BASIS_CHOICES = [
  { value: 'actual/365', label: 'Daily · 365' },
  { value: 'monthly', label: 'Monthly rests' },
  { value: '30/360', label: '30 / 360' },
];

const BASIS_NOTES = {
  'actual/365':
    'Interest accrues every day on what is still owed, so a 31-day month costs more than a 28-day one. How US auto, personal and student loans are billed.',
  monthly:
    'One twelfth of the annual rate each month, whatever the calendar says — February costs the same as March. What mortgages, UK personal loans and every rate table quote. Any odd days before the first payment are charged on top, by the day.',
  '30/360':
    'Every month counted as 30 days and every year as 360. The bond convention, and how older mortgages were written.',
};

const APR_NOTE =
  'The APR is what the credit costs once the fees and the length of the first period are counted in — the figure a US lender has to disclose. It is higher than the rate whenever you pay for the loan before you start repaying it.';

// The three sliders. Ratios are the real ones: the amount track is log-scaled
// (src/components/ui/slider.tsx), so 25,000 of 500–1,000,000 sits at 0.515.
const sliders = ({ amount, amountRatio, rate, rateRatio, term, termRatio }) =>
  vstack({ gap: 24 }, [
    C.SliderRow('Loan amount', amount, amountRatio, { minLabel: '$500', maxLabel: '$1,000,000' }),
    C.SliderRow('Interest rate', rate, rateRatio, { minLabel: '0%', maxLabel: '30%' }),
    C.SliderRow('Term', term, termRatio, { pressable: false, minLabel: '6 mo', maxLabel: '40 yrs' }),
  ]);

/** The whole column, so every state is the same screen with different figures. */
const page = ({
  payment, count, last, extraLine, openingLine,
  amount = '$25,000', amountRatio = 0.5147,
  rate = '6.50%', rateRatio = 0.2167,
  term = '5 yrs', termRatio = 0.1139,
  funded = '17 Aug 2026', firstPayment = '17 Sep 2026',
  extraMonthly = '', lumpSum = '', lumpOn, fees = '',
  basis = 'actual/365',
  principal, interest, interestValue, feesValue, totalRepaid, apr,
  overpay,
  scheduleShare, scheduleCount,
}) => [
  C.Title('Loan calculator', { align: 'left' }),
  Hero({ payment, count, last, extraLine, openingLine }),

  C.SectionHeading('The loan', { mt: 32, mb: 16 }),
  sliders({ amount, amountRatio, rate, rateRatio, term, termRatio }),

  C.SectionHeading('Dates', { mt: 32, mb: 16 }),
  vstack({ gap: 20 }, [
    C.SelectField('Money received', { value: funded, iconName: 'Calendar', variant: 'pill' }),
    C.SelectField('First payment', { value: firstPayment, iconName: 'Calendar', variant: 'pill' }),
  ]),

  C.SectionHeading('Overpayments and fees', { caption: 'Optional', mt: 32, mb: 16 }),
  vstack({ gap: 20 }, [
    C.SelectField('Extra each month', { value: extraMonthly, placeholder: 'Nothing extra', variant: 'pill' }),
    C.SelectField('One-off overpayment', { value: lumpSum, placeholder: 'None', variant: 'pill' }),
    lumpOn ? C.SelectField('Overpayment lands', { value: lumpOn, iconName: 'Calendar', variant: 'pill' }) : null,
    C.SelectField('Fees paid upfront', { value: fees, placeholder: 'None', variant: 'pill' }),
  ]),

  vstack({ mt: 32 }, [
    C.FieldLabel('How interest is charged', { mb: 12 }),
    C.ChoiceChips(BASIS_CHOICES, basis),
    text(BASIS_NOTES[basis], { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 12 }),
  ]),

  vstack({ mt: 24, radius: 16, stroke: 'line', fill: 'card', pad: 20, name: 'Summary' }, [
    C.ProportionBar(principal, interest),
    vstack({ mt: 20, gap: 12 }, [
      SummaryLine('Borrowed', fmt(principal)),
      SummaryLine('Interest paid', interestValue, { accent: true }),
      feesValue ? SummaryLine('Fees at closing', feesValue, { accent: true }) : null,
      divider({ color: 'line' }),
      SummaryLine('Total you repay', totalRepaid, { strong: true }),
      apr ? SummaryLine('APR', apr) : null,
    ]),
    apr ? text(APR_NOTE, { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 16 }) : null,
  ]),

  overpay
    ? vstack({ mt: 12, gap: 12, radius: 16, stroke: 'line', fill: 'card', pad: 20, name: 'IfYouOverpay' }, [
        text('If you overpay', { size: 15, weight: 600, lineHeight: 22, color: 'ink' }),
        SummaryLine('Interest saved', overpay.saved, { positive: true }),
        SummaryLine('Paid off early by', overpay.early),
        text(overpay.note, { size: 12, weight: 400, lineHeight: 17, color: 'muted' }),
      ])
    : null,

  C.ScheduleCard({ interestShare: scheduleShare, count: scheduleCount, mt: 12 }),

  flexSpacer(),
  box({ pad: { t: 32, b: 32 } }, C.Button('Save')),
];

// --- the states -------------------------------------------------------------

const base = {
  payment: '$489.22',
  count: 60,
  last: '17 Aug 2031',
  principal: 25000,
  interest: 4353.4,
  interestValue: '$4,353.40',
  totalRepaid: '$29,353.40',
  apr: '6.51%',
  scheduleShare: 138.01 / 489.22,
  scheduleCount: 60,
};

const overpaying = {
  ...base,
  extraLine: 'Plus $150.00 extra — $639.22 leaves your account each month.',
  extraMonthly: '$150.00',
  lumpSum: '$2,000.00',
  lumpOn: '17 Sep 2027',
  fees: '$450.00',
  count: 41,
  last: '17 Jan 2030',
  interest: 2825.52,
  interestValue: '$2,825.52',
  feesValue: '$450.00',
  totalRepaid: '$27,825.52',
  apr: '7.27%',
  scheduleShare: 138.01 / 639.22,
  scheduleCount: 41,
  overpay: {
    saved: '$1,527.88',
    early: '1 yr 7 mo',
    note: 'Clear on 17 Jan 2030 instead of 17 Aug 2031, paying the same $489.22 a month plus what you add.',
  },
};

const monthlyRests = {
  ...base,
  basis: 'monthly',
  funded: '28 Aug 2026',
  firstPayment: '1 Oct 2026',
  payment: '$489.41',
  last: '1 Sep 2031',
  openingLine: 'First payment covers a month plus 3 days — $148.77 of it is interest.',
  interest: 4364.85,
  interestValue: '$4,364.85',
  totalRepaid: '$29,364.85',
  // 6.4963% against a 6.50% rate is under half a basis point, so the screen
  // prints neither the APR line nor the note. That is the source's own rule.
  apr: null,
  scheduleShare: 148.77 / 489.41,
};

/** src/components/ui/amount-pad.tsx — a full-screen Modal, not an overlay. */
const amountPad = ({ id, name, title, caption, value, unit }) =>
  screen({
    id,
    name,
    padBottom: 0,
    children: [
      hstack({ pad: { y: 8 }, align: 'center', ml: -8, mr: -8 }, [
        box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, icon('ChevronLeft', { size: 24, color: 'ink', stroke: 2 })),
        text(title, { size: 17, weight: 600, lineHeight: 24, color: 'ink', align: 'center' }, { flex: 1, nowrap: true, mr: 44 }),
      ]),
      vstack({ flex: 1, justify: 'center' }, [
        C.AmountFigure(value, { unit }),
        text(caption, { size: 15, weight: 400, lineHeight: 22, color: 'muted', align: 'center' }, { mt: 8 }),
      ]),
      C.AmountKeypad(),
      box({ pad: { t: 20 } }, C.Button('Done')),
    ],
  });

export default [
  screen({ id: 'loan-calculator', name: 'Loan calculator', back: true, children: page(base) }),
  screen({ id: 'loan-calculator-overpaying', name: 'Loan calculator / overpaying', back: true, children: page(overpaying) }),
  screen({ id: 'loan-calculator-monthly-rests', name: 'Loan calculator / monthly rests', back: true, children: page(monthlyRests) }),
  screen({
    id: 'loan-calculator-save',
    name: 'Loan calculator / add to bills',
    back: true,
    children: page(base),
    overlay: C.ConfirmDialog(
      'Add this to monthly bills?',
      '$489.22 a month for 5 yrs, filed under Loans.',
      { actions: [{ label: 'Continue' }], cancel: 'Not now' },
    ),
  }),
  amountPad({ id: 'loan-calculator-amount-pad', name: 'Loan calculator / amount pad', title: 'Loan amount', caption: 'How much you are borrowing', value: '25000' }),
  amountPad({ id: 'loan-calculator-rate-pad', name: 'Loan calculator / rate pad', title: 'Interest rate', caption: 'Annual percentage rate', value: '6.5', unit: 'percent' }),
];
