// src/app/add-card.tsx — the three-step card flow, plus its edit and guard states.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon } = C;

export const section = 'Cards & money';
export const order = 21;

const chase = { holder: 'Chase', network: 'VISA', balance: 412.3, last4: '4421', color: '#161616' };

/** src/components/cards/network-picker.tsx — 64pt circles, wrap gap-4, caption under. */
const NETWORKS = [
  ['VISA', 'VISA'],
  ['Mastercard', 'MC'],
  ['Amex', 'AMEX'],
  ['Discover', 'DISC'],
];
const NetworkPicker = (value, p = {}) =>
  C.wrap({ gap: 16, name: 'NetworkPicker', ...p }, NETWORKS.map(([name, mark]) => {
    const selected = name === value;
    return vstack({ hug: true, gap: 8, align: 'center' }, [
      box(
        {
          w: 64, h: 64, radius: 'full', justify: 'center', align: 'center',
          fill: selected ? 'ink' : 'card',
          stroke: selected ? 'ink' : 'line',
          strokeWidth: selected ? 2 : 1,
        },
        // Faithful to the source: the mark is `text-on-control` on `bg-ink`.
        text(mark, { size: 13, weight: 700, lineHeight: 18, color: selected ? 'onControl' : 'ink', italic: true }, { nowrap: true, hug: true }),
      ),
      text(name, { size: 12, weight: selected ? 500 : 400, lineHeight: 17, color: selected ? 'ink' : 'muted', align: 'center' }, { nowrap: true, hug: true }),
    ]);
  }));

/** src/components/ui/reminder-field.tsx */
const REMINDER_CHOICES = [
  { value: 'off', label: 'Off' },
  { value: '0', label: 'On the day' },
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '7', label: '1 week' },
];
const ReminderField = (caption, value, { time = '9:00 AM', unavailable, ...p } = {}) =>
  vstack({ name: 'ReminderField', ...p }, [
    C.FieldLabel('Reminder', { mb: 4 }),
    text(unavailable ?? caption, { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { mb: 10 }),
    unavailable ? null : C.ChoiceChips(REMINDER_CHOICES, value),
    unavailable || value === 'off'
      ? null
      : hstack({ hug: true, minH: 40, radius: 'full', fill: 'ink/5', pad: [0, 16], gap: 8, mt: 12 }, [
          icon('Clock', { size: 18, color: 'body' }),
          text(`at ${time}`, { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { nowrap: true }),
        ]),
  ]);

/** StepFlow's footerSlot when editing. */
const DeleteRow = (label) =>
  hstack({ minH: 48, radius: 'full', justify: 'center', align: 'center', gap: 8, name: 'DeleteRow' }, [
    icon('Trash2', { size: 17, color: 'danger' }),
    text(label, { size: 15, weight: 500, lineHeight: 22, color: 'danger' }, { nowrap: true }),
  ]);

const skeleton = (h, radius) => box({ h, radius, fill: 'line', opacity: 0.7 });

const details = ({ editing = false, error } = {}) =>
  vstack({ flex: 1, gap: 24, mt: 32, name: 'Step/Details' }, [
    C.PaymentCard(chase),
    vstack({}, [C.FieldLabel('Select Network provider', { mb: 12 }), NetworkPicker('VISA')]),
    C.TextField('Name of the card', { value: 'Chase' }),
    vstack({}, [C.FieldLabel('Card colour', { mb: 12 }), C.ColorPicker('#161616')]),
    C.TextField('Last 4 digits', { value: '4421' }),
    error ? text(error, { size: 13, weight: 400, lineHeight: 18, color: 'danger' }) : null,
    editing ? null : null,
  ]);

export default [
  // Step 1 of 3 — the keypad. A card's balance is allowed to be zero.
  screen({
    id: 'add-card-amount',
    name: 'Add a card — balance',
    children: [
      C.StepHeader('Add a card', 3, 0),
      C.StepQuestion('What is on the card today?'),
      C.AmountStep('412.30', { mt: 24 }),
      C.StepFooter('Continue'),
    ],
  }),

  // Step 2 of 3 — the live preview, then the fields that change it.
  screen({
    id: 'add-card-details',
    name: 'Add a card — details',
    children: [C.StepHeader('Add a card', 3, 1), details(), C.StepFooter('Continue')],
  }),

  // Step 3 of 3 — the bill day, and the reminder counted back from it.
  screen({
    id: 'add-card-due',
    name: 'Add a card — bill due',
    children: [
      C.StepHeader('Add a card', 3, 2),
      C.StepQuestion('When is the bill due?'),
      vstack({ flex: 1, gap: 24, mt: 24 }, [
        C.InlineCalendar({ selected: 21, today: 17 }),
        ReminderField("Before this card's payment day", '1'),
      ]),
      C.StepFooter('Save card'),
    ],
  }),

  // No date picked yet: there is nothing to count back from, so the controls
  // are replaced by the reason.
  screen({
    id: 'add-card-due-no-date',
    name: 'Add a card — no due date',
    children: [
      C.StepHeader('Add a card', 3, 2),
      C.StepQuestion('When is the bill due?'),
      vstack({ flex: 1, gap: 24, mt: 24 }, [
        C.InlineCalendar({ selected: null, today: 17 }),
        ReminderField("Before this card's payment day", '1', {
          unavailable: 'Set a bill due date above and Skip can remind you before it.',
        }),
      ]),
      C.StepFooter('Save card'),
    ],
  }),

  // Editing opens on the details, and carries the delete row under the button.
  screen({
    id: 'add-card-edit',
    name: 'Edit card',
    children: [
      C.StepHeader('Edit card', 3, 1),
      details({ editing: true }),
      C.StepFooter('Save changes', { slot: DeleteRow('Delete card') }),
    ],
  }),

  // Save failed on the last step.
  screen({
    id: 'add-card-save-error',
    name: 'Edit card — save failed',
    children: [
      C.StepHeader('Edit card', 3, 2),
      C.StepQuestion('When is the bill due?'),
      vstack({ flex: 1, gap: 24, mt: 24 }, [
        C.InlineCalendar({ selected: 21, today: 17 }),
        ReminderField("Before this card's payment day", '1'),
      ]),
      C.StepFooter('Save changes', {
        error: 'Could not save that card. Check your connection and try again.',
        slot: DeleteRow('Delete card'),
      }),
    ],
  }),

  // Confirm before deleting.
  screen({
    id: 'add-card-delete-confirm',
    name: 'Edit card — delete?',
    overlay: C.ConfirmDialog(
      'Delete this card?',
      'Receipts, bills and subscriptions paid with it are kept, but stop showing this card.',
      { actions: [{ label: 'Delete', destructive: true }], cancel: 'Cancel' },
    ),
    children: [
      C.StepHeader('Edit card', 3, 1),
      details({ editing: true }),
      C.StepFooter('Save changes', { slot: DeleteRow('Delete card') }),
    ],
  }),

  // A new balance is taken as today's figure, so older rows fall inside it.
  screen({
    id: 'add-card-balance-confirm',
    name: 'Edit card — balance warning',
    overlay: C.ConfirmDialog(
      'This balance becomes the starting point',
      "A new balance is taken as today's figure, so the 6 transactions already on this card are counted as part of it and will stop showing here. Nothing is deleted — they stay in your transactions, and on the bills and receipts they came from.",
      { actions: [{ label: 'Update the balance' }], cancel: 'Leave it as it was' },
    ),
    children: [
      C.StepHeader('Edit card', 3, 2),
      C.StepQuestion('When is the bill due?'),
      vstack({ flex: 1, gap: 24, mt: 24 }, [
        C.InlineCalendar({ selected: 21, today: 17 }),
        ReminderField("Before this card's payment day", '1'),
      ]),
      C.StepFooter('Save changes', { slot: DeleteRow('Delete card') }),
    ],
  }),

  // The record being edited has not landed yet.
  screen({
    id: 'add-card-loading',
    name: 'Edit card — loading',
    children: [
      C.StepHeader('Edit card', 3, 1),
      vstack({ flex: 1, gap: 24, mt: 32 }, [skeleton(180, 16), skeleton(56, 12)]),
      C.StepFooter('Continue', { disabled: true }),
    ],
  }),

  // The read failed — never a blank form over a real card.
  screen({
    id: 'add-card-error',
    name: 'Edit card — could not open',
    back: true,
    children: [
      C.PageState(
        'state-error',
        'Could not open this card',
        'Check your connection and try again. Your card and its reminder are unchanged.',
        { action: 'Try again', secondary: 'Go back' },
      ),
    ],
  }),

  // Read fine, but there is no such card.
  screen({
    id: 'add-card-missing',
    name: 'Edit card — not here',
    back: true,
    children: [
      C.PageState('state-error', 'That card is not here', 'It may have been removed. Nothing has been changed.', {
        action: 'Go back',
      }),
    ],
  }),
];
