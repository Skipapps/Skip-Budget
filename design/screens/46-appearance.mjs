import * as C from '../kit/components.mjs';
import { ACCENTS, onColor } from '../kit/tokens.mjs';

const { screen, vstack, hstack, box, text, icon, wrap, spacer } = C;

export const section = 'Settings';
export const order = 46;

/*
 * src/app/appearance.tsx — two commitments, so two interactions. Mode applies
 * on tap; colour is staged behind a Save, because repainting the app twelve
 * times while somebody makes their mind up is a strobe, not a comparison.
 *
 * The twelve swatches are ACCENTS from design/kit/tokens.mjs, which mirrors
 * src/theme/palette.ts. The tick on a chosen swatch is `onColor(value)` —
 * measured, which is why it comes out white on plum and slate and black on the
 * other ten. Pro-gated (`theming`), so this is the Pro state of the screen.
 */

const MODES = [
  { id: 'light', label: 'Light', caption: 'Warm off-white', icon: 'Sun' },
  { id: 'dark', label: 'Dark', caption: 'Soft near-black', icon: 'Moon' },
  { id: 'system', label: 'System', caption: 'Follows your phone', icon: 'Monitor' },
];

const ModeRow = (option, selected) =>
  hstack(
    {
      mb: 12, radius: 16, pad: { y: 14, x: 16 }, gap: 12, align: 'center',
      stroke: selected ? 'accent' : 'line',
      fill: selected ? 'accent/10' : 'card',
      name: `Mode/${option.id}`,
    },
    [
      box({ w: 40, h: 40, radius: 'full', fill: 'accent/15', justify: 'center', align: 'center' }, icon(option.icon, { size: 20, color: 'accentInk', stroke: 2 })),
      vstack({ flex: 1 }, [
        text(option.label, { size: 16, weight: 600, lineHeight: 24, color: 'ink' }, { nowrap: true }),
        text(option.caption, { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
      ]),
      selected ? icon('Check', { size: 22, color: 'accentInk', stroke: 2.6 }) : null,
    ],
  );

/** The 4-up grid: w-1/4 cells, a 58pt swatch with the ring outside it. */
const Swatches = (chosen) =>
  wrap({ gap: 0, name: 'Accents' }, ACCENTS.map((accent) => {
    const selected = accent.id === chosen;
    return vstack({ w: 342 / 4, align: 'center', pad: { b: 20 } }, [
      box(
        {
          w: 58, h: 58, radius: 'full', fill: accent.value,
          stroke: selected ? 'ink' : undefined, strokeWidth: 3,
          justify: 'center', align: 'center',
        },
        selected ? icon('Check', { size: 24, color: onColor(accent.value), stroke: 3 }) : null,
      ),
      text(accent.label, { size: 12, weight: 400, lineHeight: 17, color: 'body', align: 'center' }, { mt: 8, nowrap: true, hug: true }),
    ]);
  }));

const page = ({ mode, accent, draft }) => {
  const chosen = draft ?? accent;
  const dirty = Boolean(draft) && draft !== accent;
  const chosenLabel = (ACCENTS.find((a) => a.id === chosen)?.label ?? '').toLowerCase();

  return [
    C.Title('Appearance', { align: 'left' }),

    vstack({ mt: 32 }, [
      C.SectionHeading('Mode'),
      vstack({ mt: 8 }, MODES.map((option) => ModeRow(option, option.id === mode))),
    ]),

    vstack({ mt: 32 }, [
      C.SectionHeading('Colour'),
      vstack({ mt: 8 }, [
        text(
          `Used for buttons, the tab bar, charts and every highlight in the app.${dirty ? ` Choosing ${chosenLabel} — applies when you save.` : ''}`,
          { size: 14, weight: 400, lineHeight: 21, color: 'muted' },
          { mb: 16 },
        ),
        Swatches(chosen),
        dirty
          ? hstack({ hug: true, self: 'end', minH: 40, radius: 'full', fill: 'control', pad: [0, 16], align: 'center', mt: 4 }, [
              text('Save', { size: 14, weight: 500, lineHeight: 20, color: 'onControl' }, { nowrap: true }),
            ])
          : null,
      ]),
    ]),

    spacer(64),
  ];
};

export default [
  screen({ id: 'appearance', name: 'Appearance', back: true, children: page({ mode: 'system', accent: 'apricot' }) }),
  screen({ id: 'appearance-light', name: 'Appearance / light picked', back: true, children: page({ mode: 'light', accent: 'apricot' }) }),
  screen({
    id: 'appearance-choosing',
    name: 'Appearance / a colour chosen, not yet saved',
    back: true,
    children: page({ mode: 'dark', accent: 'apricot', draft: 'plum' }),
  }),
];
