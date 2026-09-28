// src/app/salary.tsx — every source of income and where each one is paid.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, flexSpacer } = C;

export const section = 'Cards & money';
export const order = 24;

const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'semimonthly', label: 'Twice a month' },
  { value: 'monthly', label: 'Monthly' },
];

const ACCOUNT_OPTIONS = [{ value: 'chk', label: 'Chase Checking ••1180' }];

const totalCard = (amount, p = {}) =>
  vstack({ radius: 16, stroke: 'line', fill: 'card', pad: { x: 16, y: 12 }, name: 'Total per month', ...p }, [
    text('Total per month', { size: 13, weight: 400, lineHeight: 18, color: 'muted' }),
    text(amount, { size: 20, weight: 600, lineHeight: 28, color: 'ink' }, { mt: 2, nowrap: true }),
  ]);

const roundButton = (name, color = 'ink') =>
  box({ w: 36, h: 36, radius: 'full', justify: 'center', align: 'center' }, [icon(name, { size: 18, color })]);

const sourceCard = ({ index, name, amount, frequency = 'monthly', payday, nextPayday, accounts = [], collapsed = false }) =>
  vstack({ radius: 16, stroke: 'line', fill: 'card', pad: 16, name: `Source ${index}` }, [
    hstack({ justify: 'between', align: 'center', mb: 12 }, [
      text(`Source ${index}`, { size: 15, weight: 500, lineHeight: 22, color: 'ink' }, { nowrap: true }),
      hstack({ hug: true, gap: 4 }, [roundButton('Trash2', 'muted'), roundButton(collapsed ? 'ChevronDown' : 'ChevronUp')]),
    ]),
    collapsed
      ? text([name || 'Unnamed', amount].filter(Boolean).join(' · '), { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true })
      : vstack({ gap: 20 }, [
          C.TextField('Name', { value: name }),
          C.SelectField('Amount', { variant: 'pill', value: amount, placeholder: 'Enter an amount', iconName: 'Calculator' }),
          vstack({}, [C.FieldLabel('How often', { mb: 8 }), C.ChoiceChips(PAY_FREQUENCIES, frequency)]),
          C.SelectField('Last payday', { variant: 'pill', value: payday, placeholder: 'Pick the most recent one', iconName: 'Calendar' }),
          nextPayday
            ? text(`Next payday ${nextPayday}`, { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { mt: -12, ml: 16 })
            : null,
          vstack({}, [
            C.FieldLabel('Paid into', { mb: 8 }),
            C.MultiChoiceChips(ACCOUNT_OPTIONS, accounts, {
              emptyHint: 'Link at least one account so Skip knows where this lands.',
            }),
          ]),
        ]),
  ]);

const addSourcePill = (p = {}) =>
  hstack({ minH: 56, radius: 'full', fill: 'ink/5', justify: 'center', align: 'center', gap: 8, name: 'Add salary source', ...p }, [
    icon('Plus', { size: 18, color: 'ink' }),
    text('Add salary source', { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { nowrap: true }),
  ]);

const footer = (error) =>
  vstack({ pad: { t: 40 }, name: 'Footer' }, [
    error ? text(error, { size: 13, weight: 400, lineHeight: 18, color: 'danger', align: 'center' }, { mb: 12 }) : null,
    C.Button('Save'),
  ]);

const head = () => [
  C.Title('Salary'),
  C.Subtitle('Track every source of income and where each one is paid.', { mt: 12 }),
];

const mainJob = {
  index: 1,
  name: 'Main job',
  amount: '$4,200.00',
  payday: '15 Sep 2026',
  nextPayday: '15 Oct 2026',
  accounts: ['chk'],
};

export default [
  // One monthly source, open — a source you just added is one you are filling in.
  screen({
    id: 'salary',
    name: 'Salary',
    back: true,
    children: [
      ...head(),
      totalCard('$4,200.00', { mt: 24 }),
      vstack({ mt: 24, gap: 16 }, [sourceCard(mainJob)]),
      addSourcePill({ mt: 16 }),
      flexSpacer(),
      footer(),
    ],
  }),

  // Two sources on Pro, the one being edited open and the other folded away.
  screen({
    id: 'salary-two-sources',
    name: 'Salary — two sources',
    back: true,
    children: [
      ...head(),
      totalCard('$5,608.33', { mt: 24 }),
      vstack({ mt: 24, gap: 16 }, [
        sourceCard({ index: 1, name: 'Main job', amount: '$4,200.00', collapsed: true }),
        sourceCard({
          index: 2,
          name: 'Freelance',
          amount: '$325.00',
          frequency: 'weekly',
          payday: '11 Sep 2026',
          nextPayday: '18 Sep 2026',
          accounts: ['chk'],
        }),
      ]),
      addSourcePill({ mt: 16 }),
      flexSpacer(),
      footer(),
    ],
  }),

  // Nothing added yet.
  screen({
    id: 'salary-empty',
    name: 'Salary — no sources',
    back: true,
    children: [...head(), totalCard('$0.00', { mt: 24 }), addSourcePill({ mt: 16 }), flexSpacer(), footer()],
  }),

  // A source with no payday cannot be counted forward, and Save says so.
  screen({
    id: 'salary-error',
    name: 'Salary — missing payday',
    back: true,
    children: [
      ...head(),
      totalCard('$4,200.00', { mt: 24 }),
      vstack({ mt: 24, gap: 16 }, [
        sourceCard({ ...mainJob, payday: undefined, nextPayday: undefined, accounts: [] }),
      ]),
      addSourcePill({ mt: 16 }),
      flexSpacer(),
      footer('Pick the last payday for each source, so Skip can work out the next ones.'),
    ],
  }),

  // Before the saved sources land.
  screen({
    id: 'salary-loading',
    name: 'Salary — loading',
    back: true,
    children: [
      C.Title('Salary'),
      box({ mt: 64, align: 'center' }, [
        box({ w: 24, h: 24, radius: 'full', stroke: 'muted', strokeWidth: 2, opacity: 0.35, name: 'ActivityIndicator' }),
      ]),
      flexSpacer(),
    ],
  }),

  // The amount pad (src/components/ui/amount-pad.tsx), opened from "Amount".
  screen({
    id: 'salary-amount-pad',
    name: 'Salary — amount pad',
    children: [
      hstack({ gap: 0, align: 'center', mt: 8, name: 'PadHeader' }, [
        box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [icon('ChevronLeft', { size: 24, color: 'ink', stroke: 2 })]),
        text('Salary amount', { size: 17, weight: 600, lineHeight: 24, color: 'ink', align: 'center' }, { flex: 1, nowrap: true, mr: 44 }),
      ]),
      flexSpacer(),
      C.AmountFigure('4200'),
      text('Each month', { size: 15, weight: 400, lineHeight: 22, color: 'muted', align: 'center' }, { mt: 8 }),
      flexSpacer(),
      C.AmountKeypad(),
      C.Button('Done', { mt: 20 }),
    ],
  }),
];
