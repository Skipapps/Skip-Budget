// src/app/add-group.tsx — naming a group and choosing how it settles.
// Two steps: a group has no amount and no date, so there is no keypad step.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, wrap, flexSpacer } = C;

export const section = 'Splits';
export const order = 52;

/**
 * src/data/group-icons.ts GROUP_ICON_CHOICES, in order.
 *
 * The app draws its own SVGs from `@/assets/bill-icons`, which the kit cannot
 * load; each is paired here with the closest lucide glyph the kit ships, so the
 * picker has the right count, order and geometry even though four or five of
 * the drawings differ in detail from the app's own.
 */
const GROUP_ICON_CHOICES = [
  ['housing', 'House'], ['travel', 'Plane'], ['coffee', 'Coffee'], ['shopping', 'ShoppingBag'],
  ['transport', 'Bus'], ['family', 'Baby'], ['pets', 'PawPrint'], ['energy', 'Zap'],
  ['water', 'Droplets'], ['internet', 'Wifi'], ['mobile', 'Smartphone'], ['tv', 'Tv'],
  ['music', 'Music'], ['software', 'Monitor'], ['health', 'HeartPulse'], ['education', 'GraduationCap'],
  ['insurance', 'Shield'], ['loans', 'Landmark'], ['waste', 'Trash2'], ['other', 'Tag'],
];

/**
 * src/components/splits/group-icon-picker.tsx — 48pt tiles, 12px corners,
 * gap-2.5, the chosen one filled with the control colour.
 */
const GroupIconPicker = (value, p = {}) =>
  wrap({ gap: 10, name: 'GroupIconPicker', ...p }, GROUP_ICON_CHOICES.map(([id, glyph]) => {
    const selected = id === value;
    return box(
      { w: 48, h: 48, radius: 12, justify: 'center', align: 'center', fill: selected ? 'control' : 'card', stroke: selected ? 'control' : 'line', name: `GroupIcon/${id}` },
      [icon(glyph, { size: 21, color: selected ? 'onControl' : 'body', hug: true })],
    );
  }));

const IconField = (value) =>
  vstack({ name: 'IconField' }, [C.FieldLabel('Icon', { mb: 12 }), GroupIconPicker(value)]);

/** Step 1 — the name and the glyph. `gap-7` between the blocks. */
const NameStep = ({ name = '', icon: iconId = 'housing', carried = null, error = null } = {}) =>
  vstack({ flex: 1, gap: 28, mt: 24, name: 'Step/name' }, [
    carried ? text(`${carried} will be added as names. They can claim their own once they are on Skip.`, { size: 13, weight: 400, lineHeight: 19, color: 'muted' }) : null,
    C.TextField('Group name', { value: name, placeholder: 'Barcelona, or Flat 3', focused: !name }),
    IconField(iconId),
    error ? text(error, { size: 13, weight: 400, lineHeight: 18, color: 'danger' }) : null,
  ]);

/** Step 2 — how the group settles. */
const SettleStep = (simplify) =>
  vstack({ flex: 1, mt: 24, name: 'Step/settle' }, [
    hstack({ gap: 16, align: 'center', radius: 16, fill: 'ink/5', pad: [16, 16] }, [
      vstack({ flex: 1 }, [
        text('Simplify who pays whom', C.TYPE.rowTitle),
        text('Collapses chains, so three payments become one. It can ask you to pay somebody you never ate with — which is the trade.', { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 4 }),
      ]),
      C.Switch(simplify),
    ]),
    text('For the flat, the trip, the thing that keeps going. Everyone in it sees the same running total.', { size: 13, weight: 400, lineHeight: 19, color: 'muted' }, { mt: 20 }),
  ]);

export default [
  screen({
    id: 'add-group-name',
    name: 'New group / 1 name',
    children: [
      C.StepHeader('New group', 2, 0),
      C.StepQuestion('What is the group called?'),
      NameStep({ name: 'Lake house', icon: 'housing' }),
      C.StepFooter('Continue'),
    ],
  }),

  screen({
    id: 'add-group-name-empty',
    name: 'New group / 1 empty',
    children: [
      C.StepHeader('New group', 2, 0),
      C.StepQuestion('What is the group called?'),
      NameStep({ name: '', icon: 'housing' }),
      C.StepFooter('Continue', { disabled: true }),
    ],
  }),

  screen({
    id: 'add-group-name-carried',
    name: 'New group / 1 from the calculator',
    children: [
      C.StepHeader('New group', 2, 0),
      C.StepQuestion('What is the group called?'),
      NameStep({ name: 'Lake house', icon: 'travel', carried: 'Priya, Diego, Maya' }),
      C.StepFooter('Continue'),
    ],
  }),

  screen({
    id: 'add-group-settle',
    name: 'New group / 2 settling',
    children: [
      C.StepHeader('New group', 2, 1),
      C.StepQuestion('How should the group settle up?'),
      SettleStep(true),
      C.StepFooter('Create group'),
    ],
  }),

  screen({
    id: 'add-group-settle-off',
    name: 'New group / 2 simplify off',
    children: [
      C.StepHeader('New group', 2, 1),
      C.StepQuestion('How should the group settle up?'),
      SettleStep(false),
      C.StepFooter('Create group'),
    ],
  }),

  screen({
    id: 'add-group-saving',
    name: 'New group / 2 creating',
    children: [
      C.StepHeader('New group', 2, 1),
      C.StepQuestion('How should the group settle up?'),
      SettleStep(true),
      C.StepFooter('Creating…', { disabled: true }),
    ],
  }),

  screen({
    id: 'add-group-error',
    name: 'New group / 2 could not create',
    children: [
      C.StepHeader('New group', 2, 1),
      C.StepQuestion('How should the group settle up?'),
      SettleStep(true),
      C.StepFooter('Create group', { error: 'Could not create that group.' }),
    ],
  }),
];
