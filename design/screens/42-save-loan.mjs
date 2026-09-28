import * as C from '../kit/components.mjs';

const { screen, vstack, hstack, box, text, icon, wrap, flexSpacer } = C;

export const section = 'Loans';
export const order = 42;

/*
 * src/app/save-loan.tsx — names a calculated loan and files it as a bill.
 *
 * The summary re-prices the loan from the same three inputs rather than
 * trusting the link, so the figures are the calculator's: $25,000 at 6.5% over
 * 60 months, first payment 17 Sep 2026 → $489.22 a month, $4,353.40 interest.
 */

const SOURCES = [
  { id: 'chase', label: 'Chase ••4421', color: '#161616' },
  { id: 'amex', label: 'Amex ••1002', color: '#7BC4F5' },
  { id: 'checking', label: 'Chase Checking ••1180', color: '#7BC4F5' },
];

/**
 * src/components/bills/icon-picker.tsx — BILL_ICON_CHOICES, in order.
 * The app draws its own bill-icon SVGs; these lucide glyphs stand in for them,
 * at the picker's real 48pt tile, 10px radius and 12pt gap.
 */
const ICON_CHOICES = [
  'Tag', 'GraduationCap', 'PawPrint', 'Tv', 'ShoppingBag', 'Plane',
  'Coffee', 'Music', 'Trash2', 'Monitor', 'HeartPulse',
];

const IconPicker = (selected) =>
  wrap({ gap: 12, name: 'IconPicker' }, ICON_CHOICES.map((name, i) => {
    const on = i === selected;
    return box(
      { w: 48, h: 48, radius: 10, stroke: on ? 'control' : 'line', fill: on ? 'control' : 'card', justify: 'center', align: 'center' },
      icon(name, { size: 22, color: on ? 'onControl' : 'body' }),
    );
  }));

/** save-loan.tsx's own <Row>. */
const Row = (label, value, { strong } = {}) =>
  hstack({ justify: 'between', gap: 12, pad: { y: 6 }, name: 'SummaryRow' }, [
    text(label, { size: 14, weight: 400, lineHeight: 20, color: 'muted' }, { flex: 1, nowrap: true }),
    text(value, strong ? { size: 15, weight: 600, lineHeight: 22, color: 'ink' } : { size: 14, weight: 400, lineHeight: 20, color: 'body' }, { nowrap: true }),
  ]);

const summary = vstack({ mt: 24, radius: 16, stroke: 'line', fill: 'card', pad: { y: 12, x: 16 }, name: 'WhatIsSaved' }, [
  Row('Monthly payment', '$489.22', { strong: true }),
  Row('Borrowed', '$25,000.00'),
  Row('Rate', '6.5% a year'),
  Row('Term', '5 yrs · 60 payments'),
  Row('First payment', '17 Sep 2026'),
  Row('Interest over the term', '$4,353.40'),
]);

const page = ({ name, iconIndex = 0, source = '', error, saving, sources = SOURCES }) => [
  C.Title('Add to monthly bills'),
  C.Subtitle('This becomes a monthly bill under Loans, so it counts against what you have left.', { mt: 12 }),
  summary,
  vstack({ mt: 32, gap: 24 }, [
    C.TextField('Name', { value: name, placeholder: 'Car loan, student loan…' }),
    vstack({}, [C.FieldLabel('Icon', { mb: 12 }), IconPicker(iconIndex)]),
    sources.length > 0 ? vstack({}, [C.FieldLabel('Paid from', { mb: 12 }), C.SourceTiles(sources, source)]) : null,
    error ? text(error, { size: 13, weight: 400, lineHeight: 19, color: 'danger' }) : null,
  ]),
  flexSpacer(),
  box({ pad: { t: 40 } }, C.Button(saving ? 'Saving…' : 'Add to bills')),
];

export default [
  screen({ id: 'save-loan', name: 'Add to monthly bills', back: true, children: page({ name: '' }) }),
  screen({
    id: 'save-loan-filled',
    name: 'Add to monthly bills / named',
    back: true,
    children: page({ name: 'Car loan', iconIndex: 0, source: 'checking' }),
  }),
  screen({
    id: 'save-loan-error',
    name: 'Add to monthly bills / needs a name',
    back: true,
    children: page({ name: '', error: 'Give the loan a name so you can spot it in your bills.' }),
  }),
  screen({
    id: 'save-loan-saving',
    name: 'Add to monthly bills / saving',
    back: true,
    children: page({ name: 'Car loan', source: 'checking', saving: true }),
  }),
  screen({
    id: 'save-loan-no-sources',
    name: 'Add to monthly bills / nothing to pay from',
    back: true,
    // With no card and no account on file the whole "Paid from" block is gone,
    // not shown empty — the loan still saves without one.
    children: page({ name: 'Student loan', iconIndex: 1, sources: [] }),
  }),
];
