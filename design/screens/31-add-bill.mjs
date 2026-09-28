// src/app/add-bill.tsx — the category chooser, then a three-dot StepFlow
// (amount → details → when), plus the edit states the route reaches with ?id=.
//
// The ten category glyphs are custom SVGs in assets/bill-icons; the kit draws
// lucide, so the nearest lucide name stands in for each, the way 00-home.mjs
// already does for the Rent row.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon } = C;

export const section = 'Bills';
export const order = 31;

const SOURCES = [
  { id: 'chase', label: 'Chase ••4421', color: '#161616' },
  { id: 'amex', label: 'Amex ••1002', color: '#7BC4F5' },
];

// BILL_CATEGORIES from src/data/bills-mock.ts, in order.
const CATEGORIES = [
  ['housing', 'House', 'Housing', 'Rent, mortgage, HOA fees'],
  ['energy', 'Zap', 'Electricity & Gas', 'Power, heating, cooking gas'],
  ['water', 'Droplets', 'Water & Waste', 'Water, sewer, garbage'],
  ['internet', 'Wifi', 'Internet', 'Home broadband and Wi-Fi'],
  ['mobile', 'Smartphone', 'Mobile Phone', 'Phone plans, device payments'],
  ['insurance', 'Shield', 'Insurance', 'Car, health, home, life'],
  ['loans', 'Landmark', 'Loans & Credit', 'Cards, student, auto, personal'],
  ['transport', 'Car', 'Transportation', 'Car, transit, parking, tolls'],
  ['family', 'Baby', 'Family & Healthcare', 'Childcare, tuition, medical'],
  ['other', 'FileText', 'Other bill', 'Name it and pick an icon'],
];

const CATEGORY_OPTIONS = CATEGORIES.map(([value, , label]) => ({ value, label }));

// BILL_ICON_CHOICES, same order.
const ICON_CHOICES = [
  'FileText', 'GraduationCap', 'PawPrint', 'Tv', 'ShoppingBag',
  'Plane', 'Coffee', 'Music', 'Trash2', 'Monitor', 'HeartPulse',
];

const RECURRENCE_CHOICES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'period', label: 'Specific period' },
];

const REMINDER_CHOICES = [
  { value: 'off', label: 'Off' },
  { value: '0', label: 'On the day' },
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '7', label: '1 week' },
];

// --- pieces the kit does not carry ----------------------------------------

/** src/components/bills/category-picker.tsx — two-up, 47.5% wide, gap-3. */
const CategoryCard = (iconName, label, hint, selected) =>
  vstack(
    {
      w: 162.45, radius: 10, pad: 14,
      stroke: selected ? 'control' : 'line',
      fill: selected ? 'ink/3' : 'card',
      name: `CategoryCard/${label}`,
    },
    [
      box({ w: 44, h: 44, radius: 10, fill: selected ? 'control' : 'ink/5', justify: 'center', align: 'center' }, [
        icon(iconName, { size: 22, color: selected ? 'onControl' : 'body' }),
      ]),
      text(label, { size: 14, weight: 500, lineHeight: 19, color: 'ink' }, { mt: 12, maxLines: 2 }),
      text(hint, { size: 11, weight: 400, lineHeight: 15, color: 'muted' }, { mt: 4, maxLines: 2 }),
    ],
  );

const CategoryPicker = (selectedId, p = {}) =>
  C.wrap({ gap: 12, name: 'CategoryPicker', ...p },
    CATEGORIES.map(([id, iconName, label, hint]) => CategoryCard(iconName, label, hint, id === selectedId)));

/** src/components/bills/icon-picker.tsx — 48pt squares, gap-3. */
const IconPicker = (selectedIndex, p = {}) =>
  C.wrap({ gap: 12, name: 'IconPicker', ...p },
    ICON_CHOICES.map((name, i) =>
      box({
        w: 48, h: 48, radius: 10, justify: 'center', align: 'center',
        stroke: i === selectedIndex ? 'control' : 'line',
        fill: i === selectedIndex ? 'control' : 'card',
      }, [icon(name, { size: 22, color: i === selectedIndex ? 'onControl' : 'body' })])));

/** src/components/brands/brand-field.tsx — empty, and with a company chosen. */
const BrandField = (label, { value, placeholder } = {}) =>
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

/** The Delete row StepFlow hangs under the primary button when editing. */
const DeleteRow = (label) =>
  hstack({ minH: 48, radius: 'full', justify: 'center', align: 'center', gap: 8, name: 'DeleteRow' }, [
    icon('Trash2', { size: 17, color: 'danger' }),
    text(label, { size: 15, weight: 500, lineHeight: 22, color: 'danger' }, { nowrap: true }),
  ]);

/** StepFlow's shell: header, optional slot, optional question, body, footer. */
const flow = ({ id, name, title, current, headerSlot, question, gap = 24, body, primary, disabled, error, deleteLabel, overlay }) =>
  screen({
    id, name, overlay,
    children: [
      C.StepHeader(title, 3, current),
      headerSlot ? vstack({ mt: 24 }, headerSlot) : null,
      question ? C.StepQuestion(question) : null,
      vstack({ flex: 1, mt: question ? 24 : 32, gap }, body),
      C.StepFooter(primary, { disabled, error, slot: deleteLabel ? DeleteRow(deleteLabel) : null }),
    ],
  });

const DETAILS_RENT = [
  BrandField('Company', { placeholder: 'Letting agent or management company' }),
  C.TextField('Name', { value: 'Rent' }),
  vstack({}, [C.FieldLabel('Category', { mb: 8 }), C.ChoiceChips(CATEGORY_OPTIONS, 'housing')]),
  vstack({}, [C.FieldLabel('Paid with', { mb: 8 }), C.SourceTiles(SOURCES, 'chase')]),
  C.TextField('Note', { optional: true, placeholder: 'Anything worth remembering', multiline: true }),
];

export default [
  // Step before the dots: the category chooser is its own Screen.
  screen({
    id: 'add-bill-category',
    name: 'Add a bill / what for',
    back: true,
    children: [
      C.Title('What is this bill for?'),
      C.Subtitle('Pick what this bill is for. You can rename it on the next step.', { mt: 12 }),
      vstack({ mt: 28, pad: { b: 40 } }, [CategoryPicker('housing')]),
    ],
  }),

  flow({
    id: 'add-bill-amount',
    name: 'Add a bill / 1 amount',
    title: 'Add a bill',
    current: 0,
    headerSlot: [hstack({ justify: 'center' }, [C.ActionPill('Calculator', { iconName: 'Calculator' })])],
    question: 'How much is the bill?',
    body: [C.AmountStep('1450')],
    primary: 'Continue',
  }),

  flow({
    id: 'add-bill-amount-empty',
    name: 'Add a bill / 1 amount, nothing typed',
    title: 'Add a bill',
    current: 0,
    headerSlot: [hstack({ justify: 'center' }, [C.ActionPill('Calculator', { iconName: 'Calculator' })])],
    question: 'How much is the bill?',
    body: [C.AmountStep('')],
    primary: 'Continue',
    disabled: true,
  }),

  flow({
    id: 'add-bill-details',
    name: 'Add a bill / 2 details',
    title: 'Add a bill',
    current: 1,
    gap: 20,
    body: DETAILS_RENT,
    primary: 'Continue',
  }),

  // categoryId 'other' with no company chosen is the only way the icon picker
  // appears — the icon is never seen when there is a logo to show instead.
  flow({
    id: 'add-bill-details-icon',
    name: 'Add a bill / 2 details, own icon',
    title: 'Add a bill',
    current: 1,
    gap: 20,
    body: [
      BrandField('Company', { placeholder: 'Search for a company' }),
      C.TextField('Name', { value: '', placeholder: '' }),
      vstack({}, [C.FieldLabel('Icon', { mb: 8 }), IconPicker(0)]),
      vstack({}, [C.FieldLabel('Category', { mb: 8 }), C.ChoiceChips(CATEGORY_OPTIONS, 'other')]),
      vstack({}, [C.FieldLabel('Paid with', { mb: 8 }), C.SourceTiles(SOURCES, '')]),
      C.TextField('Note', { optional: true, placeholder: 'Anything worth remembering', multiline: true }),
    ],
    primary: 'Continue',
    disabled: true,
  }),

  flow({
    id: 'add-bill-when',
    name: 'Add a bill / 3 when',
    title: 'Add a bill',
    current: 2,
    question: 'When is it due?',
    body: [
      C.InlineCalendar({ monthLabel: 'October 2026', firstWeekday: 4, days: 31, selected: 1, today: 0 }),
      vstack({}, [C.FieldLabel('Recurring', { mb: 8 }), C.ChoiceChips(RECURRENCE_CHOICES, 'monthly')]),
      ReminderField('Before the bill is due', '1'),
    ],
    primary: 'Save bill',
  }),

  // "Specific period" is the one recurrence that adds an end date, and it
  // changes the question above the calendar.
  flow({
    id: 'add-bill-when-period',
    name: 'Add a bill / 3 when, specific period',
    title: 'Add a bill',
    current: 2,
    question: 'When does it start?',
    body: [
      C.InlineCalendar({ monthLabel: 'October 2026', firstWeekday: 4, days: 31, selected: 1, today: 0 }),
      vstack({}, [C.FieldLabel('Recurring', { mb: 8 }), C.ChoiceChips(RECURRENCE_CHOICES, 'period')]),
      C.SelectField('To', { variant: 'pill', placeholder: 'Ongoing — no end date', iconName: 'Calendar' }),
      ReminderField('Before the bill is due', '1'),
    ],
    primary: 'Save bill',
  }),

  // Editing opens on the details step, not the chooser.
  flow({
    id: 'add-bill-edit',
    name: 'Edit bill / details',
    title: 'Edit bill',
    current: 1,
    gap: 20,
    body: DETAILS_RENT,
    primary: 'Continue',
    deleteLabel: 'Delete bill',
  }),

  flow({
    id: 'add-bill-edit-delete',
    name: 'Edit bill / delete confirm',
    title: 'Edit bill',
    current: 1,
    gap: 20,
    body: DETAILS_RENT,
    primary: 'Continue',
    deleteLabel: 'Delete bill',
    overlay: C.ConfirmDialog('Delete this bill?', 'This cannot be undone.', {
      actions: [{ label: 'Delete', destructive: true }],
      cancel: 'Cancel',
    }),
  }),

  flow({
    id: 'add-bill-edit-loading',
    name: 'Edit bill / loading the row',
    title: 'Edit bill',
    current: 1,
    body: [
      box({ h: 56, radius: 12, fill: 'line', opacity: 0.6 }),
      box({ h: 56, radius: 12, fill: 'line', opacity: 0.6 }),
      box({ h: 40, w: 228, radius: 'full', fill: 'line', opacity: 0.6 }),
    ],
    primary: 'Continue',
    disabled: true,
  }),

  screen({
    id: 'add-bill-missing',
    name: 'Edit bill / not here',
    back: true,
    children: [
      C.PageState('state-error', 'That bill is not here', 'It may have been deleted. Nothing has been changed.', {
        action: 'Go back',
      }),
    ],
  }),

  screen({
    id: 'add-bill-read-error',
    name: 'Edit bill / could not open',
    back: true,
    children: [
      C.PageState(
        'state-error',
        'Could not open this bill',
        'Check your connection and try again. Nothing about the bill has changed.',
        { action: 'Try again', secondary: 'Go back' },
      ),
    ],
  }),
];
