// src/app/reminders.tsx — every reminder in the app on one page, grouped by
// what the thing is. Captions come from REMINDER_CAPTION in src/api/reminders.ts
// and the lead chips from LEAD_OPTIONS.
import * as C from '../kit/components.mjs';
import { color as resolveColor } from '../kit/render.mjs';

const { screen, vstack, hstack, box, text, icon, spacer, flexSpacer } = C;

export const section = 'Reminders & notifications';
export const order = 64;

const SubtitleLeft = (str, p = {}) => text(str, { ...C.TYPE.subtitle, align: 'left' }, p);

// --- pieces the page builds itself -----------------------------------------

/** Group header: 18pt muted glyph, 17/600 title, then what it counts from. */
const GroupHeader = (iconName, title, caption) =>
  vstack({ name: `GroupHeader/${title}` }, [
    hstack({ gap: 8, align: 'center' }, [
      icon(iconName, { size: 18, color: 'muted' }),
      text(title, { size: 17, weight: 600, lineHeight: 24, color: 'ink' }, { nowrap: true }),
    ]),
    text(caption, { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { mt: 4 }),
  ]);

/** The lead chips, exactly LEAD_OPTIONS. */
const LEAD_OPTIONS = ['On the day', '1 day', '3 days', '1 week'];

const chip = (label, selected) =>
  hstack({ hug: true, minH: 40, radius: 'full', pad: [0, 16], fill: selected ? 'control' : 'ink/5' }, [
    text(label, selected ? C.TYPE.chipSelected : C.TYPE.chip, { nowrap: true }),
  ]);

const clockPill = (clock) =>
  hstack({ hug: true, minH: 40, radius: 'full', fill: 'ink/5', pad: [0, 16], gap: 6 }, [
    icon('Clock', { size: 18, color: 'body' }),
    text(clock, { size: 14, weight: 500, lineHeight: 20, color: 'body' }, { nowrap: true }),
  ]);

const trashButton = () =>
  box({ w: 32, h: 32, radius: 'full', justify: 'center', align: 'center' }, [icon('Trash2', { size: 16, color: 'muted' })]);

/**
 * The detail row under an on reminder. In the app it is one `flex-wrap` row
 * with the bin pushed out by `ml-auto`; at 310pt of card width the four chips
 * and the clock take two lines, which is what is drawn here.
 */
const leadRow = (lead, clock) =>
  vstack({ mt: 12, gap: 8, name: 'LeadRow' }, [
    hstack({ gap: 8 }, [...LEAD_OPTIONS.slice(0, 3).map((o) => chip(o, o === lead)), flexSpacer()]),
    hstack({ gap: 8 }, [chip(LEAD_OPTIONS[3], LEAD_OPTIONS[3] === lead), clockPill(clock), flexSpacer(), trashButton()]),
  ]);

/** One reminder card: rounded-[16px], border-line, bg-card, px-4 py-3.5. */
const ReminderCard = (title, caption, { on = false, blocked, lead = '1 day', clock = '9:00 AM', trailing } = {}) =>
  vstack({ mt: 12, radius: 16, stroke: 'line', fill: 'card', pad: [14, 16], name: 'ReminderCard' }, [
    hstack({ gap: 12, align: 'center' }, [
      vstack({ flex: 1 }, [
        text(title, { size: 15, weight: 600, lineHeight: 22, color: 'ink' }, { nowrap: true }),
        text(caption, { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
      ]),
      blocked
        ? box({ w: 139, name: 'Blocked' }, [
            text(blocked, { size: 12, weight: 400, lineHeight: 17, color: 'muted', align: 'right' }),
          ])
        : (trailing ?? C.Switch(on)),
    ]),
    on && !blocked ? leadRow(lead, clock) : null,
  ]);

/** The Receipts section — one card, no lead chips, because there is nothing to lead. */
const receiptsSection = ({ enabled = true, failed = false, clock = '8:00 PM' } = {}) =>
  vstack({ mt: 32, name: 'Receipts' }, [
    GroupHeader('ReceiptText', 'Receipts', 'Every day, so nothing gets forgotten.'),
    vstack({ mt: 8 }, [
      vstack({ mt: 12, radius: 16, stroke: 'line', fill: 'card', pad: [14, 16], name: 'ReminderCard' }, [
        hstack({ gap: 12, align: 'center' }, [
          vstack({ flex: 1 }, [
            text('Daily receipts reminder', { size: 15, weight: 600, lineHeight: 22, color: 'ink' }, { nowrap: true }),
            text(
              failed ? 'Skip could not check whether this one is on.' : 'A nudge to log what you bought today.',
              { size: 13, weight: 400, lineHeight: 18, color: 'muted' },
              { maxLines: 2 },
            ),
          ]),
          failed ? C.TextLink('Try again', { variant: 'subtle', hug: true }) : C.Switch(enabled),
        ]),
        enabled && !failed ? hstack({ mt: 12, gap: 8 }, [clockPill(clock), flexSpacer()]) : null,
      ]),
    ]),
  ]);

// --- sample data ------------------------------------------------------------

const GROUPS = [
  {
    title: 'Bills',
    icon: 'ReceiptText',
    caption: 'Before the bill is due',
    items: [
      { label: 'Rent', caption: '$1,450.00 · due 21 Sep 2026', on: true, lead: '1 day' },
      { label: 'Electricity', caption: '$120.00 · due 24 Sep 2026' },
      { label: 'T-Mobile', caption: '$65.00 · due 28 Sep 2026' },
    ],
  },
  {
    title: 'Subscriptions',
    icon: 'Repeat',
    caption: 'Before it renews',
    items: [
      { label: 'Spotify', caption: '$10.99 · renews 18 Sep 2026', on: true, lead: 'On the day' },
      { label: 'Netflix', caption: '$15.49 · renews 16 Oct 2026' },
    ],
  },
  {
    title: 'Cards',
    icon: 'CreditCard',
    caption: "Before this card's payment day",
    items: [
      { label: 'Chase', caption: '•••• 4421' },
      { label: 'Amex', caption: '•••• 1002', blocked: 'Add a payment day to this card first' },
    ],
  },
  {
    title: 'Bank accounts',
    icon: 'Landmark',
    caption: 'When your pay lands here',
    items: [
      { label: 'Chase Checking', caption: '•••• 1180' },
      { label: 'Chase Savings', caption: '•••• 6620', blocked: 'No pay lands here yet' },
    ],
  },
];

const groupSection = (group) =>
  vstack({ mt: 32, name: `Group/${group.title}` }, [
    GroupHeader(group.icon, group.title, group.caption),
    vstack({ mt: 8 }, group.items.map((item) =>
      ReminderCard(item.label, item.caption, { on: item.on, blocked: item.blocked, lead: item.lead }),
    )),
  ]);

/** The standing note at the foot of the page. */
const bellNote = () =>
  hstack({ mt: 32, radius: 16, fill: 'ink/5', pad: [14, 16], gap: 12, align: 'start', name: 'BellNote' }, [
    icon('Bell', { size: 18, color: 'muted' }),
    text(
      "Reminders arrive as a notification. Turn them off for Skip in your phone's settings and nothing here will reach you.",
      { size: 13, weight: 400, lineHeight: 19, color: 'muted' },
      { flex: 1 },
    ),
  ]);

// --- the time picker (src/components/ui/time-picker.tsx), a Modal -----------

const DIAL = 240;
const CENTRE = DIAL / 2;
const RING = CENTRE - 26;
const MARKER = 22;

const pointOn = (index) => ({
  x: CENTRE + RING * Math.sin((index / 12) * 2 * Math.PI),
  y: CENTRE - RING * Math.cos((index / 12) * 2 * Math.PI),
});

/** The clock face: 240pt of bg-ink/5, hand and marker in the control colour. */
const dial = ({ activeIndex, labels }) => {
  const hand = pointOn(activeIndex);
  const marks = labels.map((label, i) => ({ label, at: pointOn(i), selected: i === activeIndex }));
  return C.raw({
    w: DIAL,
    h: DIAL,
    self: 'center',
    mt: 24,
    name: 'Dial',
    svg: (x, y, w, h, ctx) => {
      const col = (v) => resolveColor(v, ctx);
      const parts = [
        `<rect x="${x}" y="${y}" width="${DIAL}" height="${DIAL}" rx="${CENTRE}" fill="${col('ink/5')}"/>`,
        `<line x1="${x + CENTRE}" y1="${y + CENTRE}" x2="${x + hand.x}" y2="${y + hand.y}" stroke="${col('control')}" stroke-width="2"/>`,
        `<circle cx="${x + CENTRE}" cy="${y + CENTRE}" r="4" fill="${col('control')}"/>`,
        `<circle cx="${x + hand.x}" cy="${y + hand.y}" r="${MARKER}" fill="${col('control')}"/>`,
      ];
      for (const mark of marks) {
        parts.push(
          `<text x="${x + mark.at.x}" y="${y + mark.at.y + 5.6}" font-family="${ctx.font.replace(/"/g, "'")}" font-size="16" font-weight="400" fill="${col(mark.selected ? 'onControl' : 'body')}" text-anchor="middle">${mark.label}</text>`,
        );
      }
      return `<g data-name="Dial">${parts.join('')}</g>`;
    },
    html: (ctx) => {
      const col = (v) => resolveColor(v, ctx);
      const numbers = marks
        .map(
          (mark) =>
            `<div style="position:absolute;left:${mark.at.x - MARKER}px;top:${mark.at.y - MARKER}px;width:${MARKER * 2}px;height:${MARKER * 2}px;display:flex;align-items:center;justify-content:center;font:400 16px ${ctx.font.replace(/"/g, "'")};color:${col(mark.selected ? 'onControl' : 'body')}">${mark.label}</div>`,
        )
        .join('');
      return `<div data-name="Dial" style="position:relative;width:${DIAL}px;height:${DIAL}px;border-radius:${CENTRE}px;background:${col('ink/5')}"><svg width="${DIAL}" height="${DIAL}" style="position:absolute;left:0;top:0"><line x1="${CENTRE}" y1="${CENTRE}" x2="${hand.x}" y2="${hand.y}" stroke="${col('control')}" stroke-width="2"/><circle cx="${CENTRE}" cy="${CENTRE}" r="4" fill="${col('control')}"/><circle cx="${hand.x}" cy="${hand.y}" r="${MARKER}" fill="${col('control')}"/></svg>${numbers}</div>`;
    },
  });
};

/** The two big fields double as the switch for what the dial is editing. */
const clockField = (label, active) =>
  box({ w: 84, radius: 16, pad: [8, 12], fill: active ? 'control' : 'ink/5', align: 'center' }, [
    text(label, { size: 38, weight: 700, lineHeight: 50, color: active ? 'onControl' : 'ink', align: 'center' }, { hug: true }),
  ]);

const dialogButton = (label, { primary = false } = {}) =>
  box({ hug: true, minH: 44, radius: 'full', pad: [0, 20], justify: 'center', fill: primary ? 'control' : 'none' }, [
    text(label, { size: 15, weight: primary ? 600 : 500, lineHeight: 22, color: primary ? 'onControl' : 'body' }, { nowrap: true, hug: true }),
  ]);

/** 8:00 PM — the receipts reminder's stored hour, opened on the hour ring. */
const TimePicker = ({ hour = '8', minute = '00', pm = true, mode = 'hour' } = {}) =>
  vstack({ w: 326, radius: 16, fill: 'card', shadow: 'floating', pad: { t: 20, b: 16, x: 20 }, clip: true, name: 'TimePicker' }, [
    text('Select time', { size: 14, weight: 400, lineHeight: 20, color: 'muted' }),
    hstack({ mt: 16, gap: 8, justify: 'center', align: 'center' }, [
      clockField(hour, mode === 'hour'),
      text(':', { size: 34, weight: 700, lineHeight: 46, color: 'ink' }, { nowrap: true }),
      clockField(minute, mode === 'minute'),
    ]),
    C.TogglePill([{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }], pm ? 'PM' : 'AM', { w: 184, self: 'center', mt: 12 }),
    dial({
      activeIndex: mode === 'hour' ? Number(hour) % 12 : Number(minute) / 5,
      labels:
        mode === 'hour'
          ? ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
          : ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'],
    }),
    hstack({ mt: 20, gap: 8, justify: 'end' }, [dialogButton('Cancel'), dialogButton('OK', { primary: true })]),
  ]);

// --- the page ---------------------------------------------------------------

const heading = (subtitle) => [
  C.Title('Reminders', { align: 'left' }),
  subtitle ? SubtitleLeft(subtitle, { mt: 8 }) : null,
];

const loaded = ({ receipts = {} } = {}) => [
  ...heading(
    receipts.failed ? '2 of 7 will let you know.' : '3 of 8 will let you know.',
  ),
  receiptsSection(receipts),
  ...GROUPS.map(groupSection),
  bellNote(),
  spacer(64),
];

export default [
  screen({ id: 'reminders', name: 'Reminders', back: true, children: loaded() }),

  screen({
    id: 'reminders-empty',
    name: 'Reminders · nothing to remind about yet',
    back: true,
    children: [
      ...heading(
        '0 of 1 will let you know. Add a bill, a subscription, a card or an account and Skip can remind you about those too.',
      ),
      receiptsSection({ enabled: false }),
      bellNote(),
      spacer(64),
    ],
  }),

  screen({
    id: 'reminders-loading',
    name: 'Reminders · loading',
    back: true,
    children: [
      ...heading(
        '0 of 1 will let you know. Add a bill, a subscription, a card or an account and Skip can remind you about those too.',
      ),
      vstack({}, Array.from({ length: 6 }, () => C.SkeletonRow())),
      spacer(64),
    ],
  }),

  screen({
    id: 'reminders-error',
    name: 'Reminders · could not load',
    back: true,
    children: [
      ...heading(null),
      C.PageState(
        'state-error',
        'Could not load your reminders',
        'Nothing has changed. Check your connection and try again — until this loads, Skip cannot tell you what it is set to send.',
        { action: 'Try again' },
      ),
      spacer(64),
    ],
  }),

  screen({
    id: 'reminders-receipts-error',
    name: 'Reminders · receipts read failed',
    back: true,
    children: loaded({ receipts: { failed: true } }),
  }),

  screen({
    id: 'reminders-time-picker',
    name: 'Reminders · time picker',
    back: true,
    overlay: TimePicker(),
    children: loaded(),
  }),
];
