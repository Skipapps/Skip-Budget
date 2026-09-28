// src/app/add-subscription.tsx — three dots: amount → details → when.
// Editing opens on the details step and adds Status and the Delete row.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon } = C;

export const section = 'Subscriptions';
export const order = 34;

const SOURCES = [
  { id: 'chase', label: 'Chase ••4421', color: '#161616' },
  { id: 'amex', label: 'Amex ••1002', color: '#7BC4F5' },
];

const CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const REMINDER_CHOICES = [
  { value: 'off', label: 'Off' },
  { value: '0', label: 'On the day' },
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '7', label: '1 week' },
];

// --- pieces the kit does not carry ----------------------------------------

/** src/components/brands/brand-field.tsx */
const BrandField = (label, { value, placeholder, results } = {}) =>
  vstack({ name: 'BrandField' }, [
    C.FieldLabel(label, { mb: 8 }),
    value
      ? hstack({ minH: 56, radius: 10, stroke: 'line', pad: { x: 16 }, align: 'center' }, [
          C.BrandMark(value, { size: 32 }),
          text(value, { size: 16, weight: 400, lineHeight: 24, color: 'ink' }, { flex: 1, ml: 12, nowrap: true }),
          box({ w: 40, h: 40, radius: 8, justify: 'center', align: 'center', mr: -4 }, [
            icon('X', { size: 18, color: 'muted', stroke: 2 }),
          ]),
        ])
      : hstack({ minH: 56, radius: 10, stroke: results ? 'control' : 'line', pad: { x: 20 }, align: 'center' }, [
          text(results ? results.typed : placeholder, {
            size: 16, weight: 400, lineHeight: 24, color: results ? 'ink' : 'muted',
          }, { flex: 1, nowrap: true }),
        ]),
    // Results render inline below the field, never as a floating dropdown.
    results
      ? vstack({ mt: 8, radius: 10, stroke: 'line', clip: true }, [
          ...results.items.flatMap((name, i) => [
            i > 0 ? C.divider({ color: 'line' }) : null,
            hstack({ minH: 56, pad: [12, 16], align: 'center' }, [
              C.BrandMark(name, { size: 32 }),
              text(name, { size: 15, weight: 400, lineHeight: 22, color: 'ink' }, { flex: 1, ml: 12, nowrap: true }),
            ]),
          ]),
          C.divider({ color: 'line' }),
          hstack({ minH: 56, pad: [12, 16], align: 'center' }, [
            box({ w: 32, h: 32, radius: 'full', stroke: 'line', dashed: true, justify: 'center', align: 'center' }, [
              icon('Plus', { size: 16, color: 'muted', stroke: 2 }),
            ]),
            text(`Add “${results.typed}”`, { size: 15, weight: 400, lineHeight: 22, color: 'body' }, { flex: 1, ml: 12, nowrap: true }),
          ]),
        ])
      : null,
  ]);

/** src/components/ui/reminder-field.tsx */
const ReminderField = (caption, value) =>
  vstack({ name: 'ReminderField' }, [
    C.FieldLabel('Reminder', { mb: 4 }),
    text(caption, { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { mb: 10 }),
    C.ChoiceChips(REMINDER_CHOICES, value),
    value === 'off'
      ? null
      : hstack({ hug: true, minH: 40, radius: 'full', fill: 'ink/5', pad: { x: 16 }, gap: 8, mt: 12 }, [
          icon('Clock', { size: 18, color: 'body' }),
          text('at 9:00 AM', C.TYPE.pill, { nowrap: true }),
        ]),
  ]);

const DeleteRow = (label) =>
  hstack({ minH: 48, radius: 'full', justify: 'center', align: 'center', gap: 8, name: 'DeleteRow' }, [
    icon('Trash2', { size: 17, color: 'danger' }),
    text(label, { size: 15, weight: 500, lineHeight: 22, color: 'danger' }, { nowrap: true }),
  ]);

const flow = ({ id, name, title, current, question, body, primary, disabled, deleteLabel, overlay }) =>
  screen({
    id, name, overlay,
    children: [
      C.StepHeader(title, 3, current),
      question ? C.StepQuestion(question) : null,
      vstack({ flex: 1, mt: question ? 24 : 32, gap: 24 }, body),
      C.StepFooter(primary, { disabled, slot: deleteLabel ? DeleteRow(deleteLabel) : null }),
    ],
  });

const details = ({ value, editing }) => [
  BrandField('Service', { value, placeholder: 'Search for a service' }),
  vstack({}, [C.FieldLabel('Charged to', { mb: 12 }), C.SourceTiles(SOURCES, 'amex')]),
  C.TextField('Note', { optional: true, placeholder: 'Which plan, for example', multiline: true }),
  editing
    ? vstack({}, [
        C.FieldLabel('Status', { mb: 8 }),
        C.ChoiceChips([{ value: 'active', label: 'Active' }, { value: 'cancelled', label: 'Cancelled' }], 'active'),
      ])
    : null,
  value ? text('Filed under Entertainment', { size: 13, weight: 400, lineHeight: 18, color: 'muted' }) : null,
];

export default [
  flow({
    id: 'add-subscription-amount',
    name: 'Add a subscription / 1 amount',
    title: 'Add a subscription',
    current: 0,
    question: 'How much does it cost?',
    body: [C.AmountStep('10.99')],
    primary: 'Continue',
  }),

  flow({
    id: 'add-subscription-amount-empty',
    name: 'Add a subscription / 1 amount, nothing typed',
    title: 'Add a subscription',
    current: 0,
    question: 'How much does it cost?',
    body: [C.AmountStep('')],
    primary: 'Continue',
    disabled: true,
  }),

  flow({
    id: 'add-subscription-details',
    name: 'Add a subscription / 2 details',
    title: 'Add a subscription',
    current: 1,
    body: details({ value: 'Spotify', editing: false }),
    primary: 'Continue',
  }),

  // BrandField mid-search: results inline, with "Add …" always the last row.
  flow({
    id: 'add-subscription-search',
    name: 'Add a subscription / 2 details, searching',
    title: 'Add a subscription',
    current: 1,
    body: [
      BrandField('Service', { results: { typed: 'Spot', items: ['Spotify', 'Spotify Family'] } }),
      vstack({}, [C.FieldLabel('Charged to', { mb: 12 }), C.SourceTiles(SOURCES, '')]),
      C.TextField('Note', { optional: true, placeholder: 'Which plan, for example', multiline: true }),
    ],
    primary: 'Continue',
    disabled: true,
  }),

  flow({
    id: 'add-subscription-when',
    name: 'Add a subscription / 3 when',
    title: 'Add a subscription',
    current: 2,
    question: 'When does it renew?',
    body: [
      C.InlineCalendar({ monthLabel: 'September 2026', firstWeekday: 2, days: 30, selected: 18, today: 17 }),
      vstack({}, [C.FieldLabel('Billing cycle', { mb: 8 }), C.ChoiceChips(CYCLES, 'monthly')]),
      ReminderField('Before it renews', '1'),
    ],
    primary: 'Save subscription',
  }),

  flow({
    id: 'add-subscription-edit',
    name: 'Edit subscription / details',
    title: 'Edit subscription',
    current: 1,
    body: details({ value: 'Netflix', editing: true }),
    primary: 'Continue',
    deleteLabel: 'Delete subscription',
  }),

  flow({
    id: 'add-subscription-edit-delete',
    name: 'Edit subscription / delete confirm',
    title: 'Edit subscription',
    current: 1,
    body: details({ value: 'Netflix', editing: true }),
    primary: 'Continue',
    deleteLabel: 'Delete subscription',
    overlay: C.ConfirmDialog('Delete this subscription?', 'This cannot be undone.', {
      actions: [{ label: 'Delete', destructive: true }],
      cancel: 'Cancel',
    }),
  }),

  flow({
    id: 'add-subscription-edit-loading',
    name: 'Edit subscription / loading the row',
    title: 'Edit subscription',
    current: 1,
    body: [
      box({ h: 56, radius: 12, fill: 'line', opacity: 0.6 }),
      box({ h: 40, w: 228, radius: 'full', fill: 'line', opacity: 0.6 }),
      box({ h: 96, radius: 12, fill: 'line', opacity: 0.6 }),
    ],
    primary: 'Continue',
    disabled: true,
  }),

  screen({
    id: 'add-subscription-missing',
    name: 'Edit subscription / not here',
    back: true,
    children: [
      C.PageState('state-error', 'That subscription is not here', 'It may have been deleted. Nothing has been changed.', {
        action: 'Go back',
      }),
    ],
  }),

  screen({
    id: 'add-subscription-read-error',
    name: 'Edit subscription / could not open',
    back: true,
    children: [
      C.PageState(
        'state-error',
        'Could not open this subscription',
        'Check your connection and try again. Nothing about it has changed.',
        { action: 'Try again', secondary: 'Go back' },
      ),
    ],
  }),
];
