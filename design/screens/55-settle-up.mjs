// src/app/settle-up.tsx — writing down that a debt was paid. No money moves.
// The form opens on what simplifyDebts() suggests, which for Lake house is
// Priya → Sam $12.10 (see 51-split-group.mjs for the arithmetic).
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider, flexSpacer } = C;

export const section = 'Splits';
export const order = 55;

const MEMBERS = ['Sam', 'Priya'];

const Head = () => [
  C.Title('Settle up'),
  C.Subtitle('Records a payment that happened somewhere else — cash, a bank transfer, a round of drinks. Skip does not move any money.', { mt: 12 }),
];

/** Who paid → who was paid. Two 48pt ink/5 pills with the arrow between. */
const Pair = (from, to) =>
  hstack({ mt: 28, gap: 8, align: 'center', name: 'Pair' }, [
    box({ flex: 1, minH: 48, radius: 'full', fill: 'ink/5', pad: [0, 12], justify: 'center', align: 'center' }, [
      text(from, { size: 14, weight: 500, lineHeight: 20, color: 'ink', align: 'center' }, { nowrap: true, hug: true }),
    ]),
    icon('ArrowRight', { size: 18, color: 'muted', stroke: 2 }),
    box({ flex: 1, minH: 48, radius: 'full', fill: 'ink/5', pad: [0, 12], justify: 'center', align: 'center' }, [
      text(to, { size: 14, weight: 500, lineHeight: 20, color: 'ink', align: 'center' }, { nowrap: true, hug: true }),
    ]),
  ]);

/** The open member list — one ink/5 block, a tick on the chosen name. */
const MemberList = (chosen) =>
  vstack({ mt: 12, radius: 16, fill: 'ink/5', clip: true, name: 'MemberList' }, MEMBERS.map((member) =>
    hstack({ minH: 48, justify: 'between', align: 'center', gap: 12, pad: [12, 16] }, [
      text(member, { size: 15, weight: 400, lineHeight: 22, color: 'ink' }, { nowrap: true }),
      member === chosen ? icon('Check', { size: 18, color: 'ink', stroke: 2.4 }) : null,
    ]),
  ));

const Fields = ({ amount = '$12.10', when = '17 Sep 2026', note = '' } = {}) =>
  vstack({ mt: 28, gap: 24, name: 'Fields' }, [
    C.SelectField('Amount', { value: amount, placeholder: 'Enter an amount', iconName: 'Wallet' }),
    C.SelectField('When', { value: when, iconName: 'Calendar' }),
    C.TextField('Note', { optional: true, value: note, placeholder: 'Bank transfer, cash, anything worth remembering' }),
  ]);

const Save = (label = 'Record payment', { disabled = false } = {}) =>
  vstack({ pad: { t: 40, b: 32 }, name: 'Save' }, [
    C.Button(label, { disabled }),
    text('Everyone in Lake house will see this.', { size: 12, weight: 400, lineHeight: 17, color: 'muted', align: 'center' }, { mt: 16 }),
  ]);

/**
 * src/components/ui/amount-pad.tsx, composed: a full-screen Modal, so it is a
 * frame of its own rather than an overlay. Header px-4 py-2 (pulled 8pt outside
 * the 24pt gutter), the figure centred in what is left, then the keypad and
 * Done at px-6 — which is the gutter this column already has.
 */
const AmountPadScreen = (value) =>
  screen({
    id: 'settle-up-amount',
    name: 'Settle up / amount pad',
    children: [
      hstack({ ml: -8, mr: -8, pad: [8, 0], align: 'center', name: 'PadHeader' }, [
        box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [icon('ChevronLeft', { size: 24, color: 'ink', stroke: 2, hug: true })]),
        text('Amount paid', { size: 17, weight: 600, lineHeight: 24, color: 'ink', align: 'center' }, { flex: 1, mr: 44, nowrap: true }),
      ]),
      flexSpacer(),
      C.AmountFigure(value),
      text('What actually changed hands', { size: 15, weight: 400, lineHeight: 22, color: 'muted', align: 'center' }, { mt: 8 }),
      flexSpacer(),
      C.AmountKeypad(),
      vstack({ pad: { t: 20 } }, [C.Button('Done')]),
    ],
  });

/**
 * src/components/ui/date-picker.tsx on its month step — the step it opens on.
 * Accent header carrying the draft date and the year stepper, twelve months in
 * a four-wide grid, then Cancel / Next.
 */
const DatePickerCard = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const row = (labels) =>
    hstack({}, labels.map((label) =>
      box({ flex: 1, pad: [6, 0], align: 'center' }, [
        box({ w: 56, h: 56, radius: 'full', fill: label === 'Sep' ? 'control' : 'none', justify: 'center', align: 'center' }, [
          text(label, { size: 15, weight: label === 'Sep' ? 600 : 400, lineHeight: 22, color: label === 'Sep' ? 'onControl' : 'ink', align: 'center' }, { nowrap: true, hug: true }),
        ]),
      ]),
    ));
  const action = (label, { filled = false } = {}) =>
    box({ hug: true, minH: 44, radius: 'full', pad: [0, 20], fill: filled ? 'control' : 'none', justify: 'center', align: 'center' }, [
      text(label, { size: 15, weight: filled ? 600 : 500, lineHeight: 22, color: filled ? 'onControl' : 'body' }, { nowrap: true, hug: true }),
    ]);
  return vstack({ w: 326, radius: 16, fill: 'card', shadow: 'floating', clip: true, name: 'DatePicker' }, [
    vstack({ fill: 'control', pad: [16, 20] }, [
      text('17 Sep 2026', { size: 13, weight: 400, lineHeight: 18, color: 'onControl/85' }, { nowrap: true }),
      hstack({ mt: 4, justify: 'between', align: 'center' }, [
        text('2026', { size: 30, weight: 700, lineHeight: 40, color: 'onControl' }, { nowrap: true }),
        hstack({ hug: true }, [
          box({ w: 44, h: 44, radius: 12, justify: 'center', align: 'center' }, [icon('ChevronUp', { size: 22, color: 'onControl', stroke: 2, hug: true })]),
          box({ w: 44, h: 44, radius: 12, justify: 'center', align: 'center' }, [icon('ChevronDown', { size: 22, color: 'onControl', stroke: 2, hug: true })]),
        ]),
      ]),
    ]),
    vstack({ pad: [16, 12] }, [row(months.slice(0, 4)), row(months.slice(4, 8)), row(months.slice(8, 12))]),
    hstack({ justify: 'end', gap: 4, pad: { t: 4, b: 12, x: 12 } }, [action('Cancel'), action('Next', { filled: true })]),
  ]);
};

export default [
  screen({
    id: 'settle-up',
    name: 'Settle up',
    back: true,
    children: [...Head(), Pair('Priya', 'Sam'), Fields(), flexSpacer(), Save()],
  }),

  screen({
    id: 'settle-up-picking',
    name: 'Settle up / choosing who paid',
    back: true,
    children: [...Head(), Pair('Priya', 'Sam'), MemberList('Priya'), Fields(), flexSpacer(), Save()],
  }),

  AmountPadScreen('12.10'),

  screen({
    id: 'settle-up-date',
    name: 'Settle up / when',
    back: true,
    overlay: DatePickerCard(),
    children: [...Head(), Pair('Priya', 'Sam'), Fields(), flexSpacer(), Save()],
  }),

  screen({
    id: 'settle-up-note',
    name: 'Settle up / with a note',
    back: true,
    children: [...Head(), Pair('Priya', 'Sam'), Fields({ note: 'Bank transfer on Thursday' }), flexSpacer(), Save()],
  }),

  screen({
    id: 'settle-up-invalid',
    name: 'Settle up / same person twice',
    back: true,
    children: [
      ...Head(),
      Pair('Priya', 'Priya'),
      Fields(),
      text('A payment needs two different people.', { size: 13, weight: 400, lineHeight: 18, color: 'danger' }, { mt: 20 }),
      flexSpacer(),
      Save(),
    ],
  }),

  screen({
    id: 'settle-up-saving',
    name: 'Settle up / saving',
    back: true,
    children: [...Head(), Pair('Priya', 'Sam'), Fields(), flexSpacer(), Save('Saving…', { disabled: true })],
  }),

  screen({
    id: 'settle-up-loading',
    name: 'Settle up / loading',
    back: true,
    children: [
      C.Title('Settle up'),
      vstack({ mt: 28, gap: 24, name: 'Loading' }, [
        box({ h: 48, radius: 'full', fill: 'line', opacity: 0.7 }),
        box({ h: 56, radius: 12, fill: 'line', opacity: 0.7 }),
        box({ h: 56, radius: 12, fill: 'line', opacity: 0.7 }),
      ]),
    ],
  }),

  screen({
    id: 'settle-up-error',
    name: 'Settle up / could not open',
    back: true,
    children: [
      C.PageState('state-error', 'Could not open this group', 'Check your connection and try again. Nothing has been recorded.', { action: 'Try again' }),
    ],
  }),
];
