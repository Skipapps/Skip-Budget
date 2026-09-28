import * as C from '../kit/components.mjs';

const { screen, vstack, hstack, box, text, icon, divider, flexSpacer } = C;
const { fmt } = C;

export const section = 'Splits';
export const order = 48;

/*
 * src/app/add-expense.tsx — three steps over one piece of state: how much,
 * what and who, then when. Nothing is remounted between them, so going back
 * keeps everything typed.
 *
 * Sample: the group "Lisbon trip" with Sam, Alex and Dani, $84.60 for dinner
 * paid by Sam. Equally is $28.20 each — 84.60 divides exactly by three, so the
 * screen has no remainder to show. The exact-amounts frame assigns $40.00,
 * $30.00 and $10.00, which leaves the $4.60 the live line reports.
 *
 * Pro-gated (`splits`), so these are the Pro states of the screen.
 */

const MEMBERS = [
  { id: 'sam', name: 'Sam' },
  { id: 'alex', name: 'Alex' },
  { id: 'dani', name: 'Dani' },
];

const TOTAL = 84.6;
const EQUAL = { sam: 28.2, alex: 28.2, dani: 28.2 };
const EXACT = { sam: 40, alex: 30, dani: 10 };

/** The 20pt tick box beside each name. */
const checkbox = (on) =>
  on
    ? box({ w: 20, h: 20, radius: 5, fill: 'accent', justify: 'center', align: 'center' }, icon('Check', { size: 13, color: 'onControl', stroke: 3 }))
    : box({ w: 20, h: 20, radius: 6, stroke: 'line' });

const memberRow = (member, { included, mode, share }) =>
  hstack({ gap: 12, pad: { y: 8 }, align: 'center', name: `Member/${member.id}` }, [
    hstack({ flex: 1, minH: 44, gap: 12, align: 'center' }, [
      checkbox(included),
      text(member.name, { size: 15, weight: 400, lineHeight: 22, color: 'ink' }, { flex: 1, nowrap: true }),
    ]),
    !included
      ? null
      : mode === 'exact'
        ? box({ hug: true, minH: 44, w: 88, radius: 'full', fill: 'ink/5', pad: [0, 16], justify: 'center', align: 'end' }, [
            text(fmt(share), { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { nowrap: true, hug: true }),
          ])
        : text(fmt(share), { size: 14, weight: 500, lineHeight: 20, color: 'muted' }, { nowrap: true }),
  ]);

/** The payer list that drops out of the "Paid by" pill. */
const payerList = (selected) =>
  vstack({ mt: 8, radius: 16, fill: 'ink/5', clip: true }, MEMBERS.map((member) =>
    hstack({ minH: 48, justify: 'between', gap: 12, pad: { y: 12, x: 16 }, align: 'center' }, [
      text(member.name, { size: 15, weight: 400, lineHeight: 22, color: 'ink' }, { flex: 1, nowrap: true }),
      member.id === selected ? icon('Check', { size: 18, color: 'ink', stroke: 2.4 }) : null,
    ]),
  ));

const details = ({ mode = 'equal', payerOpen = false, description = 'Dinner', error, remainder }) =>
  vstack({ flex: 1, mt: 32, gap: 24, name: 'Step2' }, [
    C.TextField('What for', { value: description, placeholder: 'Dinner, taxi, the weekly shop' }),

    vstack({}, [
      C.SelectField('Paid by', { value: 'Sam', placeholder: 'Say who paid', iconName: 'ChevronDown', variant: 'pill' }),
      payerOpen ? payerList('sam') : null,
    ]),

    vstack({}, [
      C.FieldLabel('Split', { mb: 8 }),
      C.ChoiceChips([{ value: 'equal', label: 'Equally' }, { value: 'exact', label: 'Exact amounts' }], mode),
    ]),

    vstack({}, [
      C.FieldLabel(mode === 'equal' ? 'Between' : 'Who owes what', { mb: 8 }),
      divider({ color: 'line' }),
      ...MEMBERS.map((member) =>
        memberRow(member, { included: true, mode, share: (mode === 'equal' ? EQUAL : EXACT)[member.id] }),
      ),
    ]),

    remainder
      ? text(remainder.text, { size: 13, weight: 400, lineHeight: 19, color: remainder.balanced ? 'accentInk' : 'ink' })
      : null,
    error ? text(error, { size: 13, weight: 400, lineHeight: 19, color: 'danger' }) : null,
  ]);

const deleteSlot = hstack({ minH: 48, radius: 'full', justify: 'center', align: 'center', gap: 8 }, [
  icon('Trash2', { size: 17, color: 'danger' }),
  text('Delete expense', { size: 15, weight: 500, lineHeight: 22, color: 'danger' }, { nowrap: true }),
]);

export default [
  screen({
    id: 'add-expense',
    name: 'Add an expense / how much',
    children: [
      C.StepHeader('Add an expense', 3, 0),
      C.StepQuestion('How much did you spend?'),
      C.AmountStep('84.60', { mt: 24 }),
      C.StepFooter('Continue'),
    ],
  }),
  screen({
    id: 'add-expense-details',
    name: 'Add an expense / what and who',
    children: [
      C.StepHeader('Add an expense', 3, 1),
      details({ mode: 'equal' }),
      C.StepFooter('Continue'),
    ],
  }),
  screen({
    id: 'add-expense-payer',
    name: 'Add an expense / who paid',
    children: [
      C.StepHeader('Add an expense', 3, 1),
      details({ mode: 'equal', payerOpen: true }),
      C.StepFooter('Continue'),
    ],
  }),
  screen({
    id: 'add-expense-exact',
    name: 'Add an expense / exact amounts',
    children: [
      C.StepHeader('Add an expense', 3, 1),
      details({
        mode: 'exact',
        remainder: { text: '$4.60 left to assign.', balanced: false },
      }),
      C.StepFooter('Continue'),
    ],
  }),
  screen({
    id: 'add-expense-missing-what-for',
    name: 'Add an expense / a check sends you back',
    children: [
      C.StepHeader('Add an expense', 3, 1),
      details({ mode: 'equal', description: '', error: 'What was it for?' }),
      C.StepFooter('Continue', { disabled: true }),
    ],
  }),
  screen({
    id: 'add-expense-when',
    name: 'Add an expense / when',
    children: [
      C.StepHeader('Add an expense', 3, 2),
      C.StepQuestion('When was it?'),
      vstack({ flex: 1, mt: 24 }, [
        C.InlineCalendar({ selected: 17, today: 17, showToday: false }),
        text('Adding to Lisbon trip.', { size: 13, weight: 400, lineHeight: 19, color: 'muted', align: 'center' }, { mt: 24 }),
      ]),
      C.StepFooter('Save expense'),
    ],
  }),
  screen({
    id: 'add-expense-save-error',
    name: 'Add an expense / the save did not go through',
    children: [
      C.StepHeader('Add an expense', 3, 2),
      C.StepQuestion('When was it?'),
      vstack({ flex: 1, mt: 24 }, [
        C.InlineCalendar({ selected: 17, today: 17, showToday: false }),
        text('Adding to Lisbon trip.', { size: 13, weight: 400, lineHeight: 19, color: 'muted', align: 'center' }, { mt: 24 }),
      ]),
      C.StepFooter('Save expense', { error: 'Could not save that expense.' }),
    ],
  }),
  screen({
    id: 'add-expense-loading',
    name: 'Add an expense / waiting for the group',
    children: [
      C.StepHeader('Add an expense', 3, 0),
      // The shell with skeletons, never a $0 figure: a placeholder amount on
      // an expense that is still loading is a wrong number about somebody's
      // money.
      vstack({ flex: 1, mt: 32, gap: 24 }, [
        box({ h: 56, radius: 12, fill: 'line', opacity: 0.7 }),
        box({ h: 56, radius: 'full', fill: 'line', opacity: 0.7 }),
        box({ h: 40, w: 228, radius: 'full', fill: 'line', opacity: 0.7 }),
      ]),
      C.StepFooter('Continue', { disabled: true }),
    ],
  }),
  screen({
    id: 'add-expense-edit',
    name: 'Edit expense / opens on the details',
    children: [
      C.StepHeader('Edit expense', 3, 1),
      details({ mode: 'equal' }),
      C.StepFooter('Continue', { slot: deleteSlot }),
    ],
  }),
  screen({
    id: 'add-expense-delete',
    name: 'Edit expense / delete',
    children: [
      C.StepHeader('Edit expense', 3, 1),
      details({ mode: 'equal' }),
      C.StepFooter('Continue', { slot: deleteSlot }),
    ],
    overlay: C.ConfirmDialog('Delete this expense?', 'Everyone’s balance in the group will change to match.', {
      actions: [{ label: 'Delete', destructive: true }],
      cancel: 'Cancel',
    }),
  }),
  screen({
    id: 'add-expense-share-pad',
    name: "Add an expense / one person's share",
    padBottom: 0,
    children: [
      hstack({ pad: { y: 8 }, align: 'center', ml: -8, mr: -8 }, [
        box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, icon('ChevronLeft', { size: 24, color: 'ink', stroke: 2 })),
        text('Alex', { size: 17, weight: 600, lineHeight: 24, color: 'ink', align: 'center' }, { flex: 1, nowrap: true, mr: 44 }),
      ]),
      vstack({ flex: 1, justify: 'center' }, [
        C.AmountFigure('30'),
        text('Their share', { size: 15, weight: 400, lineHeight: 22, color: 'muted', align: 'center' }, { mt: 8 }),
      ]),
      C.AmountKeypad(),
      box({ pad: { t: 20 } }, C.Button('Done')),
    ],
  }),
];
