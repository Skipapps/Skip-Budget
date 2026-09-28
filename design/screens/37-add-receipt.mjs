// src/app/add-receipt.tsx — three dots: amount → details → when. Capture sits
// above the question on step 1, because one scan fills the amount, the store
// and the date at once. Editing opens on the details step.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon } = C;

export const section = 'Receipts';
export const order = 37;

const SOURCES = [
  { id: 'chase', label: 'Chase ••4421', color: '#161616' },
  { id: 'amex', label: 'Amex ••1002', color: '#7BC4F5' },
];

// --- pieces the kit does not carry ----------------------------------------

/** src/components/brands/brand-field.tsx, with a store already chosen. */
const BrandField = (label, { value, placeholder = 'Search for a store' } = {}) =>
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
      : hstack({ minH: 56, radius: 10, stroke: 'line', pad: { x: 20 }, align: 'center' }, [
          text(placeholder, { size: 16, weight: 400, lineHeight: 24, color: 'muted' }, { flex: 1, nowrap: true }),
        ]),
  ]);

/** The capture pair plus its framing hint — StepFlow's headerSlot on step 1. */
const capture = ({ dimmed = false } = {}) => [
  hstack({ justify: 'center', gap: 12, opacity: dimmed ? 0.5 : undefined }, [
    C.ActionPill('Scan', { iconName: 'ScanLine' }),
    C.ActionPill('Upload', { iconName: 'ImageUp' }),
  ]),
  text('Point the camera at a paper receipt, or upload a photo or PDF', {
    size: 12, weight: 400, lineHeight: 17, color: 'muted', align: 'center',
  }, { mt: 8 }),
];

/** ActivityIndicator stand-in — the kit has no spinner. */
const spinner = box({ w: 16, h: 16, radius: 'full', stroke: 'muted', strokeWidth: 2, opacity: 0.45, name: 'Spinner' });

/** What the scan read, and what still needs a look. */
const scanReport = (read, missed) =>
  vstack({ mt: 16, radius: 16, fill: 'ink/5', pad: [12, 16], name: 'ScanReport' }, [
    text(read ? `Read the ${read}.` : 'Could not read that one.', { size: 13, weight: 400, lineHeight: 18, color: 'ink' }),
    missed
      ? text(`Check the ${missed} below — it will save either way.`, { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { mt: 4 })
      : null,
  ]);

const DeleteRow = (label) =>
  hstack({ minH: 48, radius: 'full', justify: 'center', align: 'center', gap: 8, name: 'DeleteRow' }, [
    icon('Trash2', { size: 17, color: 'danger' }),
    text(label, { size: 15, weight: 500, lineHeight: 22, color: 'danger' }, { nowrap: true }),
  ]);

const flow = ({ id, name, title, current, headerSlot, question, body, primary, disabled, deleteLabel, overlay }) =>
  screen({
    id, name, overlay,
    children: [
      C.StepHeader(title, 3, current),
      headerSlot ? vstack({ mt: 24 }, headerSlot) : null,
      question ? C.StepQuestion(question) : null,
      vstack({ flex: 1, mt: question ? 24 : 32, gap: 24 }, body),
      C.StepFooter(primary, { disabled, slot: deleteLabel ? DeleteRow(deleteLabel) : null }),
    ],
  });

const details = (store) => [
  BrandField('Store', { value: store }),
  vstack({}, [C.FieldLabel('Paid with', { mb: 12 }), C.SourceTiles(SOURCES, 'chase')]),
  C.TextField('Note', { optional: true, placeholder: 'Anything worth remembering', multiline: true }),
  store ? text('Filed under Groceries', { size: 13, weight: 400, lineHeight: 18, color: 'muted' }) : null,
];

export default [
  flow({
    id: 'add-receipt-amount',
    name: 'Add a receipt / 1 amount',
    title: 'Add a receipt',
    current: 0,
    headerSlot: capture(),
    question: 'How much did you spend?',
    body: [C.AmountStep('')],
    primary: 'Continue',
    disabled: true,
  }),

  flow({
    id: 'add-receipt-reading',
    name: 'Add a receipt / reading the receipt',
    title: 'Add a receipt',
    current: 0,
    headerSlot: [
      ...capture({ dimmed: true }),
      hstack({ justify: 'center', align: 'center', gap: 8, mt: 16 }, [
        spinner,
        text('Reading the receipt…', { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
      ]),
    ],
    question: 'How much did you spend?',
    body: [C.AmountStep('')],
    primary: 'Continue',
    disabled: true,
  }),

  flow({
    id: 'add-receipt-scanned',
    name: 'Add a receipt / scan read three of four',
    title: 'Add a receipt',
    current: 0,
    headerSlot: [...capture(), scanReport('store, date and amount', 'card')],
    question: 'How much did you spend?',
    body: [C.AmountStep('54.12')],
    primary: 'Continue',
  }),

  flow({
    id: 'add-receipt-scan-failed',
    name: 'Add a receipt / scan read nothing',
    title: 'Add a receipt',
    current: 0,
    headerSlot: [...capture(), scanReport(null, 'store, date and amount')],
    question: 'How much did you spend?',
    body: [C.AmountStep('')],
    primary: 'Continue',
    disabled: true,
  }),

  flow({
    id: 'add-receipt-upload-where',
    name: 'Add a receipt / where is the receipt',
    title: 'Add a receipt',
    current: 0,
    headerSlot: capture(),
    question: 'How much did you spend?',
    body: [C.AmountStep('')],
    primary: 'Continue',
    disabled: true,
    overlay: C.ConfirmDialog('Where is the receipt?', undefined, {
      actions: [{ label: 'Photo library' }, { label: 'Files' }],
      cancel: 'Cancel',
    }),
  }),

  flow({
    id: 'add-receipt-no-camera',
    name: 'Add a receipt / scanning needs a camera',
    title: 'Add a receipt',
    current: 0,
    headerSlot: capture(),
    question: 'How much did you spend?',
    body: [C.AmountStep('')],
    primary: 'Continue',
    disabled: true,
    overlay: C.ConfirmDialog(
      'Scanning needs a camera',
      'The Simulator has none, so scanning is unavailable here. Upload reads a photo or a PDF and works everywhere.',
      { actions: [{ label: 'OK' }], cancel: null },
    ),
  }),

  flow({
    id: 'add-receipt-details',
    name: 'Add a receipt / 2 details',
    title: 'Add a receipt',
    current: 1,
    body: details("Trader Joe's"),
    primary: 'Continue',
  }),

  flow({
    id: 'add-receipt-when',
    name: 'Add a receipt / 3 when',
    title: 'Add a receipt',
    current: 2,
    question: 'When was it?',
    body: [C.InlineCalendar({ monthLabel: 'September 2026', firstWeekday: 2, days: 30, selected: 17, today: 17 })],
    primary: 'Save receipt',
  }),

  flow({
    id: 'add-receipt-edit',
    name: 'Edit receipt / details',
    title: 'Edit receipt',
    current: 1,
    body: details("Trader Joe's"),
    primary: 'Continue',
    deleteLabel: 'Delete receipt',
  }),

  flow({
    id: 'add-receipt-edit-delete',
    name: 'Edit receipt / delete confirm',
    title: 'Edit receipt',
    current: 1,
    body: details("Trader Joe's"),
    primary: 'Continue',
    deleteLabel: 'Delete receipt',
    overlay: C.ConfirmDialog('Delete this receipt?', 'This cannot be undone.', {
      actions: [{ label: 'Delete', destructive: true }],
      cancel: 'Cancel',
    }),
  }),

  flow({
    id: 'add-receipt-edit-loading',
    name: 'Edit receipt / loading the row',
    title: 'Edit receipt',
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
    id: 'add-receipt-missing',
    name: 'Edit receipt / not here',
    back: true,
    children: [
      C.PageState('state-error', 'That receipt is not here', 'It may have been deleted. Nothing has been changed.', {
        action: 'Go back',
      }),
    ],
  }),

  screen({
    id: 'add-receipt-read-error',
    name: 'Edit receipt / could not open',
    back: true,
    children: [
      C.PageState(
        'state-error',
        'Could not open this receipt',
        'Check your connection and try again. Nothing about it has changed.',
        { action: 'Try again', secondary: 'Go back' },
      ),
    ],
  }),
];
