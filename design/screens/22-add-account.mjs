// src/app/add-account.tsx — the three-step bank account flow and its guards.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon } = C;

export const section = 'Cards & money';
export const order = 22;

const checking = {
  bankName: 'Chase',
  accountType: 'Checking',
  balance: 2840.12,
  last4: '1180',
  color: '#7BC4F5',
};

const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'semimonthly', label: 'Twice a month' },
  { value: 'monthly', label: 'Monthly' },
];

const REMINDER_CHOICES = [
  { value: 'off', label: 'Off' },
  { value: '0', label: 'On the day' },
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '7', label: '1 week' },
];

/** src/components/ui/reminder-field.tsx — caption, chips, then the time pill. */
const ReminderField = (caption, value, { time = '9:00 AM', unavailable, retry, ...p } = {}) =>
  vstack({ name: 'ReminderField', ...p }, [
    C.FieldLabel('Reminder', { mb: 4 }),
    text(unavailable ?? caption, { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { mb: 10 }),
    unavailable && retry ? C.TextLink('Try again', { variant: 'subtle', self: 'start', hug: true, mb: 4 }) : null,
    unavailable ? null : C.ChoiceChips(REMINDER_CHOICES, value),
    unavailable || value === 'off'
      ? null
      : hstack({ hug: true, minH: 40, radius: 'full', fill: 'ink/5', pad: [0, 16], gap: 8, mt: 12 }, [
          icon('Clock', { size: 18, color: 'body' }),
          text(`at ${time}`, { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { nowrap: true }),
        ]),
  ]);

const DeleteRow = (label) =>
  hstack({ minH: 48, radius: 'full', justify: 'center', align: 'center', gap: 8, name: 'DeleteRow' }, [
    icon('Trash2', { size: 17, color: 'danger' }),
    text(label, { size: 15, weight: 500, lineHeight: 22, color: 'danger' }, { nowrap: true }),
  ]);

const skeleton = (h, radius) => box({ h, radius, fill: 'line', opacity: 0.7 });

const details = ({ error } = {}) =>
  vstack({ flex: 1, gap: 24, mt: 32, name: 'Step/Details' }, [
    C.AccountCard(checking),
    C.TextField('Bank name', { value: 'Chase' }),
    vstack({}, [C.FieldLabel('Account type', { mb: 8 }), C.ChoiceChips(['Checking', 'Savings'], 'Checking')]),
    C.TextField('Name of the account', { value: 'Chase Checking' }),
    vstack({}, [C.FieldLabel('Card colour', { mb: 12 }), C.ColorPicker('#7BC4F5')]),
    C.TextField('Last 4 digits', { value: '1180' }),
    C.SelectField('Expected income', {
      variant: 'pill',
      value: '$4,200.00',
      placeholder: 'Enter an amount',
      iconName: 'Calculator',
    }),
    error ? text(error, { size: 13, weight: 400, lineHeight: 18, color: 'danger' }) : null,
  ]);

const paydayStep = (reminderProps) =>
  vstack({ flex: 1, gap: 24, mt: 24 }, [
    vstack({}, [
      C.InlineCalendar({ selected: 15, today: 17 }),
      text('Next payday: 15 Oct 2026', { size: 13, weight: 400, lineHeight: 18, color: 'muted', align: 'center' }, { mt: 8 }),
    ]),
    vstack({}, [C.FieldLabel('How often are you paid?', { mb: 8 }), C.ChoiceChips(PAY_FREQUENCIES, 'monthly')]),
    ReminderField('When your pay lands here', '1', reminderProps),
  ]);

export default [
  // Step 1 of 3 — what is in the account today.
  screen({
    id: 'add-account-amount',
    name: 'Add an account — balance',
    children: [
      C.StepHeader('Add an account', 3, 0),
      C.StepQuestion('What is in the account today?'),
      C.AmountStep('2840.12', { mt: 24 }),
      C.StepFooter('Continue'),
    ],
  }),

  // Step 2 of 3 — the face, the fields, and the income paid into it.
  screen({
    id: 'add-account-details',
    name: 'Add an account — details',
    children: [C.StepHeader('Add an account', 3, 1), details(), C.StepFooter('Continue')],
  }),

  // Step 3 of 3 — the last payday, the cycle, and the payday reminder.
  screen({
    id: 'add-account-payday',
    name: 'Add an account — pay day',
    children: [
      C.StepHeader('Add an account', 3, 2),
      C.StepQuestion('When was the last pay day?'),
      paydayStep({}),
      C.StepFooter('Save account'),
    ],
  }),

  // Nothing is paid in here yet, so there is no payday to announce.
  screen({
    id: 'add-account-payday-no-income',
    name: 'Add an account — no income',
    children: [
      C.StepHeader('Add an account', 3, 2),
      C.StepQuestion('When was the last pay day?'),
      paydayStep({
        unavailable: 'Add the income paid into this account and Skip can tell you when it lands.',
      }),
      C.StepFooter('Save account'),
    ],
  }),

  // The link could not be checked: an explanation plus a way to retry, and the
  // saved reminder is left alone.
  screen({
    id: 'add-account-payday-unknown',
    name: 'Edit account — link unknown',
    children: [
      C.StepHeader('Edit account', 3, 2),
      C.StepQuestion('When was the last pay day?'),
      paydayStep({
        unavailable: 'Skip could not check what is paid into this account, so it cannot set this up yet.',
        retry: true,
      }),
      C.StepFooter('Save changes', { slot: DeleteRow('Delete account') }),
    ],
  }),

  // Editing opens on the details, with the delete row under the button.
  screen({
    id: 'add-account-edit',
    name: 'Edit account',
    children: [
      C.StepHeader('Edit account', 3, 1),
      details(),
      C.StepFooter('Save changes', { slot: DeleteRow('Delete account') }),
    ],
  }),

  // Confirm before deleting.
  screen({
    id: 'add-account-delete-confirm',
    name: 'Edit account — delete?',
    overlay: C.ConfirmDialog(
      'Delete this account?',
      'Receipts, bills and subscriptions paid from it are kept, but stop showing this account.',
      { actions: [{ label: 'Delete', destructive: true }], cancel: 'Cancel' },
    ),
    children: [
      C.StepHeader('Edit account', 3, 1),
      details(),
      C.StepFooter('Save changes', { slot: DeleteRow('Delete account') }),
    ],
  }),

  // The record being edited has not landed yet.
  screen({
    id: 'add-account-loading',
    name: 'Edit account — loading',
    children: [
      C.StepHeader('Edit account', 3, 1),
      vstack({ flex: 1, gap: 24, mt: 32 }, [skeleton(180, 16), skeleton(56, 12)]),
      C.StepFooter('Continue', { disabled: true }),
    ],
  }),

  // The read failed — never a blank form over a real account.
  screen({
    id: 'add-account-error',
    name: 'Edit account — could not open',
    back: true,
    children: [
      C.PageState(
        'state-error',
        'Could not open this account',
        'Check your connection and try again. Your balance has not been touched.',
        { action: 'Try again', secondary: 'Go back' },
      ),
    ],
  }),

  // Read fine, but there is no such account.
  screen({
    id: 'add-account-missing',
    name: 'Edit account — not here',
    back: true,
    children: [
      C.PageState('state-error', 'That account is not here', 'It may have been removed. Nothing has been changed.', {
        action: 'Go back',
      }),
    ],
  }),
];
