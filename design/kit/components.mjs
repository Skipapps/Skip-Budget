// The app's components, described for the design kit. Every measurement here
// is read off the matching file under src/components — same paddings, radii,
// type sizes and colours — so the SVG and HTML come out as the app draws them.
import { TYPE, CARD_COLORS, isLightColor } from './tokens.mjs';
import { art, box, divider, flexSpacer, hstack, icon, image, raw, rich, spacer, text, vstack, wrap } from './render.mjs';

export { art, box, divider, flexSpacer, hstack, icon, image, raw, rich, spacer, text, vstack, wrap, TYPE };

/** Body copy with inline emphasis: RichBody([['Track spending — ', {}], ['all in one place.', { weight: 600, color: 'ink' }]]). */
export const RichBody = (runs, p = {}) => rich(runs, TYPE.body, p);
export const RichSubtitle = (runs, p = {}) => rich(runs, { ...TYPE.subtitle, align: 'center' }, p);

const st = (base, over = {}) => ({ ...base, ...over });
export const money = (amount) => (amount < 0 ? 'moneyOut' : amount > 0 ? 'moneyIn' : 'ink');
export const fmt = (amount, { cents = true } = {}) => {
  if (!Number.isFinite(amount)) return '—';
  const [whole, fraction] = Math.abs(amount).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const shown = cents ? Number(whole) + Number(fraction) : Number(whole);
  return `${amount < 0 && shown > 0 ? '-' : ''}$${grouped}${cents ? `.${fraction}` : ''}`;
};

// ---------------------------------------------------------------------------
// Typography (src/components/ui/typography.tsx)
// ---------------------------------------------------------------------------

export const Title = (str, { align = 'center', flush = false, ...p } = {}) =>
  text(str, st(TYPE.title, { align }), { mt: flush ? 0 : 8, ...p });
export const Subtitle = (str, p = {}) => text(str, st(TYPE.subtitle, { align: 'center' }), p);
export const Body = (str, p = {}) => text(str, TYPE.body, p);
export const Strong = (str, p = {}) => text(str, st(TYPE.body, { weight: 600, color: 'ink' }), p);
export const Quote = (str, p = {}) => text(str, TYPE.quote, p);
export const FieldLabel = (str, p = {}) => text(str, TYPE.fieldLabel, p);
export const Caption = (str, p = {}) => text(str, TYPE.caption, p);
export const Small = (str, p = {}) => text(str, TYPE.small, p);
export const T = (str, style, p = {}) => text(str, style, p);

export const SectionHeading = (str, { caption, ...p } = {}) =>
  hstack({ gap: 12, align: 'baseline', justify: 'between', name: 'SectionHeading', ...p }, [
    text(str, TYPE.sectionHeading, { nowrap: true, flex: caption ? 1 : 0 }),
    caption ? text(caption, TYPE.sectionCaption, { nowrap: true }) : null,
  ]);

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

/** src/components/ui/button.tsx — full-width pill, min 64 tall. */
export const Button = (label, { variant = 'primary', disabled = false, leading, ...p } = {}) =>
  hstack(
    {
      minH: 64, radius: 'full', pad: [16, 20], gap: 0, justify: 'center', align: 'center', name: `Button/${variant}`,
      fill: variant === 'primary' ? 'control' : 'none',
      stroke: variant === 'outline' ? 'control' : undefined,
      opacity: disabled ? 0.5 : undefined,
      ...p,
    },
    [
      leading ? box({ hug: true, mr: 12 }, leading) : null,
      text(label, st(TYPE.button, { color: variant === 'primary' ? 'onControl' : 'ink', align: 'center' }), { nowrap: true }),
    ],
  );

/** src/components/ui/action-pill.tsx — "+ New card". */
export const ActionPill = (label, { iconName = 'Plus', ...p } = {}) =>
  hstack({ hug: true, minH: 40, radius: 'full', fill: 'ink/5', pad: { t: 0, b: 0, l: 14, r: 16 }, gap: 6, name: 'ActionPill', ...p }, [
    icon(iconName, { size: 18, color: 'ink' }),
    text(label, TYPE.pill, { nowrap: true }),
  ]);

const chip = (label, selected, { leading, ...p } = {}) =>
  hstack(
    { hug: true, minH: 40, radius: 'full', pad: [0, 16], gap: 6, fill: selected ? 'control' : 'ink/5', name: `Chip/${selected ? 'selected' : 'default'}`, ...p },
    [leading ?? null, text(label, selected ? TYPE.chipSelected : TYPE.chip, { nowrap: true })],
  );

/** src/components/ui/choice-chips.tsx — pick one, wraps. */
export const ChoiceChips = (options, value, p = {}) =>
  wrap({ gap: 8, name: 'ChoiceChips', ...p }, options.map((o) => chip(o.label ?? o, (o.value ?? o) === value)));

/** src/components/ui/multi-choice-chips.tsx — pick many, tick on the chosen. */
export const MultiChoiceChips = (options, values, { emptyHint, ...p } = {}) =>
  vstack({ name: 'MultiChoiceChips', ...p }, [
    wrap({ gap: 8 }, options.map((o) => {
      const on = values.includes(o.value ?? o);
      return chip(o.label ?? o, on, on ? { leading: icon('Check', { size: 16, color: 'onControl' }) } : {});
    })),
    values.length === 0 && emptyHint ? text(emptyHint, TYPE.caption, { mt: 8 }) : null,
  ]);

/** src/components/ui/toggle-pill.tsx — one of exactly two. */
export const TogglePill = (options, value, p = {}) =>
  hstack({ radius: 'full', fill: 'ink/5', name: 'TogglePill', ...p }, options.map((o) => {
    const selected = (o.value ?? o) === value;
    return hstack({ flex: 1, minH: 44, radius: 'full', justify: 'center', pad: [0, 12], fill: selected ? 'control' : 'none' }, [
      text(o.label ?? o, selected ? TYPE.chipSelected : TYPE.chip, { nowrap: true }),
    ]);
  }));

/** src/components/ui/source-tiles.tsx — pay-from pills carrying the card's swatch. */
export const SourceTiles = (sources, value, p = {}) =>
  wrap({ gap: 8, name: 'SourceTiles', ...p }, sources.map((s) => {
    const selected = s.id === value;
    return hstack({ hug: true, minH: 40, radius: 'full', pad: { l: 10, r: 16 }, gap: 10, fill: selected ? 'control' : 'ink/5' }, [
      box({ w: 24, h: 24, radius: 'full', fill: s.color, stroke: 'ink/10' }),
      text(s.label, selected ? TYPE.chipSelected : TYPE.chip, { nowrap: true }),
    ]);
  }));

/** src/components/ui/switch-control.tsx — the iOS switch, 51×31. */
export const Switch = (on, p = {}) =>
  box({ w: 51, h: 31, radius: 'full', fill: on ? 'control' : 'line', name: `Switch/${on ? 'on' : 'off'}`, ...p }, [
    box({ w: 27, h: 27, radius: 'full', fill: '#FFFFFF', shadow: 'card', mt: 2, ml: on ? 22 : 2, hug: true }),
  ]);

/** src/components/ui/text-field.tsx */
export const TextField = (label, { value, placeholder = '', optional, error, focused, password, multiline, trailing, ...p } = {}) =>
  vstack({ name: 'TextField', ...p }, [
    hstack({ align: 'baseline', gap: 6, mb: 8 }, [
      FieldLabel(label, { nowrap: true }),
      optional ? text('(optional)', TYPE.caption, { nowrap: true }) : null,
    ]),
    hstack(
      {
        radius: 12, pad: { l: 20, r: password || trailing ? 12 : 20 }, minH: multiline ? 96 : 56, align: multiline ? 'start' : 'center', gap: 8,
        stroke: error ? 'danger' : focused ? 'control' : 'line',
      },
      [
        text(value || placeholder, st(TYPE.input, { color: value ? 'ink' : 'muted' }), { flex: 1, mt: multiline ? 16 : 0, nowrap: !multiline }),
        trailing ?? null,
        password ? box({ w: 44, h: 44, justify: 'center', align: 'center' }, icon('Eye', { size: 22, color: 'muted' })) : null,
      ],
    ),
    error ? text(error, st(TYPE.caption, { color: 'danger' }), { mt: 6, ml: 20 }) : null,
  ]);

/** src/components/ui/search-field.tsx */
export const SearchField = ({ value = '', placeholder = 'Search', ...p } = {}) =>
  hstack({ minH: 48, radius: 12, stroke: 'line', pad: [0, 12], gap: 8, name: 'SearchField', ...p }, [
    icon('Search', { size: 18, color: 'muted', stroke: 2 }),
    text(value || placeholder, st({ size: 15, weight: 400, lineHeight: 22 }, { color: value ? 'ink' : 'muted' }), { flex: 1, nowrap: true }),
    value ? icon('X', { size: 16, color: 'muted', stroke: 2.2 }) : null,
  ]);

/** src/components/ui/select-field.tsx — field or pill variant. */
export const SelectField = (label, { value = '', placeholder = '', iconName, variant = 'field', ...p } = {}) =>
  vstack({ name: `SelectField/${variant}`, ...p }, [
    FieldLabel(label, { mb: 8 }),
    hstack(
      {
        minH: 56, pad: [0, 20], justify: 'between', gap: 8,
        radius: variant === 'pill' ? 'full' : 12,
        fill: variant === 'pill' ? 'ink/5' : 'none',
        stroke: variant === 'pill' ? undefined : 'line',
      },
      [
        text(value || placeholder, st(TYPE.input, { color: value ? 'ink' : 'muted' }), { flex: 1, nowrap: true }),
        iconName ? icon(iconName, { size: 20, color: 'muted' }) : null,
      ],
    ),
  ]);

/** src/components/ui/otp-input.tsx — six boxes. */
export const OtpInput = (value = '', { length = 6, focused = true, ...p } = {}) =>
  hstack({ gap: 8, name: 'OtpInput', ...p }, Array.from({ length }, (_, i) => {
    const digit = value[i] ?? '';
    const cursor = focused && i === Math.min(value.length, length - 1);
    return box({ flex: 1, h: 56, radius: 12, stroke: cursor || digit ? 'control' : 'line', justify: 'center', align: 'center' }, [
      text(digit, { size: 22, weight: 600, lineHeight: 30, color: 'ink', align: 'center' }, { hug: true }),
    ]);
  }));

/** src/components/ui/text-link.tsx */
export const TextLink = (label, { variant = 'default', underline, ...p } = {}) =>
  box({ pad: [12, 0], align: 'center', name: 'TextLink', ...p }, [
    text(label, st(variant === 'subtle' ? TYPE.linkSubtle : TYPE.link, { align: 'center', underline }), { hug: true }),
  ]);

/** src/components/ui/range-dropdown.tsx — the closed pill. */
export const RangeDropdown = (label, p = {}) =>
  hstack({ hug: true, minH: 40, radius: 'full', fill: 'ink/5', pad: { l: 16, r: 12 }, gap: 6, name: 'RangeDropdown', ...p }, [
    text(label, TYPE.pill, { nowrap: true }),
    icon('ChevronDown', { size: 16, color: 'muted', stroke: 2 }),
  ]);

/** src/components/ui/color-picker.tsx */
export const ColorPicker = (value, p = {}) =>
  wrap({ gap: 12, name: 'ColorPicker', ...p }, CARD_COLORS.map((c) => {
    const selected = c.value === value;
    return box({ w: 44, h: 44, radius: 'full', fill: c.value, stroke: selected ? 'ink' : 'line', strokeWidth: selected ? 2 : 1, justify: 'center', align: 'center' }, [
      selected ? icon('Check', { size: 18, color: isLightColor(c.value) ? 'ink' : '#FFFFFF', stroke: 3 }) : null,
    ]);
  }));

/** src/components/ui/slider.tsx + calculators/slider-row.tsx */
export const SliderRow = (label, display, ratio, { pressable = true, minLabel, maxLabel, ...p } = {}) =>
  vstack({ name: 'SliderRow', ...p }, [
    hstack({ justify: 'between', gap: 12 }, [
      text(label, TYPE.fieldLabel, { nowrap: true }),
      pressable
        ? box({ hug: true, minH: 40, radius: 'full', fill: 'ink/5', pad: [0, 16], justify: 'center' }, text(display, { size: 18, weight: 600, lineHeight: 26, color: 'ink' }, { nowrap: true }))
        : text(display, { size: 18, weight: 600, lineHeight: 26, color: 'ink' }, { nowrap: true }),
    ]),
    Slider(ratio, { mt: 4 }),
    minLabel || maxLabel
      ? hstack({ justify: 'between' }, [text(minLabel ?? '', { size: 11, lineHeight: 16, color: 'muted' }, { nowrap: true }), text(maxLabel ?? '', { size: 11, lineHeight: 16, color: 'muted' }, { nowrap: true })])
      : null,
  ]);

export const Slider = (ratio, p = {}) =>
  raw({
    h: 44, name: 'Slider', ...p,
    svg: (x, y, w, h, ctx) => {
      const { color } = ctxColor(ctx);
      const cy = y + h / 2;
      const tx = x + Math.max(13, Math.min(w - 13, ratio * w));
      return `<rect x="${x}" y="${cy - 3}" width="${w}" height="6" rx="3" fill="${color('ink/10')}"/><rect x="${x}" y="${cy - 3}" width="${ratio * w}" height="6" rx="3" fill="${color('control')}"/><circle cx="${tx}" cy="${cy}" r="11.5" fill="${color('card')}" stroke="${color('control')}" stroke-width="3"/>`;
    },
    html: (ctx) => {
      const { color } = ctxColor(ctx);
      return `<div data-name="Slider" style="position:relative;height:44px;width:100%;display:flex;align-items:center"><div style="height:6px;width:100%;border-radius:3px;background:${color('ink/10')}"></div><div style="position:absolute;left:0;height:6px;width:${Math.round(ratio * 100)}%;border-radius:3px;background:${color('control')}"></div><div style="position:absolute;left:calc(${Math.round(ratio * 100)}% - 13px);width:26px;height:26px;border-radius:13px;background:${color('card')};border:3px solid ${color('control')};box-sizing:border-box"></div></div>`;
    },
  });

// Lazy import to avoid a cycle: render.mjs exports color(); components.mjs only needs it inside raw nodes.
import { color as resolveColor } from './render.mjs';
const ctxColor = (ctx) => ({ color: (v) => resolveColor(v, ctx) });
const fontOf = (ctx) => ctx.font.replace(/"/g, "'");

/** src/components/calculators/proportion-bar.tsx */
export const ProportionBar = (principal, interest, p = {}) => {
  const total = principal + interest;
  const share = total > 0 ? interest / total : 0;
  return vstack({ name: 'ProportionBar', ...p }, [
    hstack({ h: 12, radius: 'full', fill: 'ink/5', clip: true, gap: 0 }, [
      box({ flex: Math.max(1 - share, 0.0001), fill: 'body', self: 'stretch' }),
      box({ flex: Math.max(share, 0.0001), fill: 'accent', self: 'stretch' }),
    ]),
    hstack({ justify: 'between', gap: 12, mt: 12 }, [
      hstack({ hug: true, gap: 8 }, [box({ w: 10, h: 10, radius: 'full', fill: 'body' }), text(`Borrowed ${fmt(principal, { cents: false })}`, st(TYPE.small, { color: 'body' }), { nowrap: true })]),
      hstack({ hug: true, gap: 8 }, [box({ w: 10, h: 10, radius: 'full', fill: 'accent' }), text(`Interest ${Math.round(share * 100)}%`, st(TYPE.small, { color: 'body' }), { nowrap: true })]),
    ]),
  ]);
};

/** src/components/calculators/schedule-card.tsx */
export const ScheduleCard = ({ interestShare = 0.6, count = 60, ...p } = {}) =>
  hstack({ radius: 16, stroke: 'line', pad: [16, 16], gap: 12, name: 'ScheduleCard', ...p }, [
    art('loan-schedule', { w: 72, h: 72 }),
    vstack({ flex: 1 }, [
      text('Where each payment goes', { size: 15, weight: 600, lineHeight: 22, color: 'ink' }),
      text(`${Math.round(interestShare * 100)}% of your first payment is interest — see all ${count} payments`, TYPE.small, { mt: 4 }),
      hstack({ h: 8, radius: 'full', fill: 'ink/5', clip: true, mt: 10 }, [
        box({ flex: Math.max(1 - interestShare, 0.0001), fill: 'body', self: 'stretch' }),
        box({ flex: Math.max(interestShare, 0.0001), fill: 'accent', self: 'stretch' }),
      ]),
    ]),
    icon('ChevronRight', { size: 20, color: 'muted', stroke: 2 }),
  ]);

// ---------------------------------------------------------------------------
// Marks, avatars, badges
// ---------------------------------------------------------------------------

function monogramColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 100000;
  return CARD_COLORS[hash % CARD_COLORS.length].value;
}
function monogram(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** src/components/brands/brand-logo.tsx — the monogram fallback, which is what a design file can draw. */
export const BrandMark = (name, { size = 40, ...p } = {}) => {
  const bg = monogramColor(name || '?');
  return box({ w: size, h: size, radius: 'full', fill: bg, stroke: 'line', justify: 'center', align: 'center', name: `BrandMark/${name}`, ...p }, [
    text(monogram(name), { size: Math.round(size * 0.36), weight: 600, lineHeight: Math.round(size * 0.5), color: isLightColor(bg) ? '#161616' : '#FFFFFF', align: 'center' }, { hug: true }),
  ]);
};

/** src/components/bills/bill-mark.tsx — category glyph in a bordered well. */
export const BillMark = (iconName, { size = 40, ...p } = {}) =>
  box({ w: size, h: size, radius: 'full', fill: 'ink/5', stroke: 'line', justify: 'center', align: 'center', name: 'BillMark', ...p }, [
    icon(iconName, { size: Math.round(size * 0.5), color: 'body' }),
  ]);

/** The 40pt square well used by settings rows, destination rows and bill rows. */
export const IconWell = (iconName, { size = 40, color: c = 'body', radius = 12, ...p } = {}) =>
  box({ w: size, h: size, radius, fill: 'ink/5', justify: 'center', align: 'center', ...p }, [icon(iconName, { size: 20, color: c })]);

/** src/components/ui/profile-avatar.tsx — empty slot shows a camera. */
export const ProfileAvatar = ({ size = 48, avatar, label, ...p } = {}) =>
  avatar
    ? image({ w: size, h: size, radius: 'full', label: label ?? '', fill: avatar === true ? '#F6E3A9' : avatar, name: 'ProfileAvatar', ...p })
    : box({ w: size, h: size, radius: 'full', fill: 'ink/5', stroke: 'line', justify: 'center', align: 'center', name: 'ProfileAvatar/empty', ...p }, [
        icon('Camera', { size: Math.round(size * 0.42), color: 'muted' }),
      ]);

export const ProBadge = (p = {}) =>
  box({ hug: true, radius: 'full', fill: 'accent', pad: [2, 8], name: 'ProBadge', ...p }, [text('PRO', { size: 9, weight: 700, lineHeight: 12, color: 'onControl' }, { nowrap: true })]);

/** src/components/splits/group-icon.tsx */
export const GroupIcon = (iconName, { size = 26, bg = '#F6E3A9', fg = '#111111', ...p } = {}) => {
  const well = Math.round(size * 1.85);
  return box({ w: well, h: well, radius: 14, fill: bg, justify: 'center', align: 'center', name: 'GroupIcon', ...p }, [icon(iconName, { size, color: fg })]);
};

/** src/components/splits/person.tsx */
export const Person = (name, { subtitle, accent, size = 40, avatar, ...p } = {}) =>
  hstack({ flex: 1, gap: 12, name: 'Person', ...p }, [
    ProfileAvatar({ size, avatar, label: avatar ? name.slice(0, 1) : undefined }),
    vstack({ flex: 1 }, [
      text(name, TYPE.rowTitle, { nowrap: true }),
      subtitle ? text(subtitle, st(TYPE.rowSub, { color: accent ? 'accentInk' : 'muted' }), { mt: 2, nowrap: true }) : null,
    ]),
  ]);

// ---------------------------------------------------------------------------
// Rows and lists
// ---------------------------------------------------------------------------

export const RowDivider = (p = {}) => divider({ inset: 52, ...p });

/** src/components/settings/settings-row.tsx */
export const SettingsRow = (title, { iconName = 'Settings', subtitle, value, toggle, chevron = true, destructive, last, artwork, ...p } = {}) =>
  vstack({ name: 'SettingsRow', ...p }, [
    hstack({ gap: 12, pad: [14, 0] }, [
      artwork ?? IconWell(iconName, { color: destructive ? 'danger' : 'body' }),
      vstack({ flex: 1 }, [
        text(title, st(TYPE.rowTitle, { color: destructive ? 'danger' : 'ink' }), { nowrap: true }),
        subtitle ? text(subtitle, TYPE.rowSub, { mt: 2, nowrap: true }) : null,
      ]),
      toggle !== undefined ? Switch(toggle) : value ? text(value, { size: 14, weight: 400, lineHeight: 20, color: 'muted' }, { nowrap: true }) : chevron ? icon('ChevronRight', { size: 18, color: 'muted', stroke: 2 }) : null,
    ]),
    last ? null : RowDivider(),
  ]);

/** src/components/settings/settings-section.tsx */
export const SettingsSection = (title, rows, p = {}) =>
  vstack({ mt: 32, name: 'SettingsSection', ...p }, [SectionHeading(title), vstack({ mt: 8 }, rows)]);

/** src/components/ui/date-group-header.tsx */
export const DateGroupHeader = (label, { total, ...p } = {}) =>
  hstack({ justify: 'between', gap: 12, pad: { t: 16, b: 6 }, name: 'DateGroupHeader', ...p }, [
    text(label, { size: 13, weight: 500, lineHeight: 18, color: 'muted', transform: 'uppercase', letterSpacing: 0.4 }, { nowrap: true }),
    total !== undefined ? text(fmt(total), st(TYPE.caption, { color: money(total) }), { nowrap: true }) : null,
  ]);

const leadingMark = ({ kind, mark, iconName, name }) => {
  if (mark) return mark;
  if (kind === 'bill') return BillMark(iconName ?? 'FileText');
  if (kind === 'payment' || kind === 'income')
    return box({ w: 40, h: 40, radius: 'full', fill: 'ink/5', justify: 'center', align: 'center' }, [icon('ArrowDownLeft', { size: 18, color: 'body' })]);
  return BrandMark(name);
};

/** src/components/dashboard/transaction-row.tsx */
export const TransactionRow = (name, amount, { kindLabel, kind = 'receipt', iconName, mark, ...p } = {}) =>
  hstack({ gap: 12, pad: [14, 0], name: 'TransactionRow', ...p }, [
    leadingMark({ kind, mark, iconName, name }),
    vstack({ flex: 1 }, [text(name, TYPE.rowTitle, { nowrap: true }), kindLabel ? text(kindLabel, TYPE.rowSub, { mt: 2, nowrap: true }) : null]),
    text(fmt(amount), st(TYPE.rowAmount, { color: money(amount) }), { nowrap: true }),
  ]);

/** src/components/transactions/ledger-row.tsx */
export const LedgerRow = (name, amount, { kindLabel = 'Receipt', sourceLabel, kind = 'receipt', iconName, mark, ...p } = {}) =>
  hstack({ gap: 12, pad: [12, 0], name: 'LedgerRow', ...p }, [
    leadingMark({ kind, mark, iconName, name }),
    vstack({ flex: 1 }, [
      text(name, st(TYPE.rowTitle, { weight: 400 }), { nowrap: true }),
      text(sourceLabel ? `${kindLabel} · ${sourceLabel}` : kindLabel, TYPE.rowSub, { mt: 2, nowrap: true }),
    ]),
    text(fmt(amount), st(TYPE.rowAmount, { color: money(amount) }), { nowrap: true }),
  ]);

const twoLineRow = (name, mark, sub, amount, date, { shown, ...p }) =>
  hstack({ gap: 12, pad: [14, 0], ...p }, [
    mark,
    vstack({ flex: 1 }, [text(name, TYPE.rowTitle, { nowrap: true }), sub ? text(sub, TYPE.rowSub, { mt: 2, nowrap: true }) : null]),
    vstack({ hug: true, align: 'end' }, [
      text(fmt(shown ?? amount), st(TYPE.rowAmount, { color: money(amount) }), { nowrap: true, hug: true }),
      text(date, TYPE.rowSub, { mt: 2, nowrap: true, hug: true }),
    ]),
  ]);

/** src/components/bills/bill-row.tsx — glyph in a 12px well unless the issuer has a logo. */
export const BillRow = (name, amount, { iconName = 'FileText', logo, recurrence = 'Monthly', sourceLabel, dueDate, ...p } = {}) =>
  twoLineRow(name, logo ? BrandMark(name) : IconWell(iconName), sourceLabel ? `${recurrence} · ${sourceLabel}` : recurrence, -Math.abs(amount), dueDate ?? '', { name: 'BillRow', ...p });

/** src/components/subscriptions/subscription-row.tsx */
export const SubscriptionRow = (name, amount, { cycle = 'Monthly', sourceLabel, renewsOn, active = true, ...p } = {}) =>
  // The app prints formatCurrency(amount) — the positive figure — coloured as money out.
  twoLineRow(name, BrandMark(name), `${active ? cycle : 'Cancelled'}${sourceLabel ? ` · ${sourceLabel}` : ''}`, -Math.abs(amount), renewsOn ?? 'No renewal date', { name: 'SubscriptionRow', opacity: active ? undefined : 0.5, shown: Math.abs(amount), ...p });

/** src/components/receipts/receipt-row.tsx */
export const ReceiptRow = (merchant, amount, { sourceLabel, date, ...p } = {}) =>
  twoLineRow(merchant, BrandMark(merchant), sourceLabel, -Math.abs(amount), date ?? '', { name: 'ReceiptRow', ...p });

/** A dated group: header, then rows with inset dividers. */
export const DateGroup = (label, total, rows, p = {}) =>
  vstack({ name: 'DateGroup', ...p }, [DateGroupHeader(label, { total }), ...rows.flatMap((row, i) => (i > 0 ? [RowDivider(), row] : [row]))]);

/** Rows separated by the 52pt inset hairline. */
export const RowList = (rows, p = {}) => vstack({ name: 'RowList', ...p }, rows.flatMap((row, i) => (i > 0 ? [RowDivider(), row] : [row])));

/** src/components/ui/skeleton.tsx — SkeletonRow */
export const SkeletonRow = (p = {}) =>
  hstack({ gap: 12, pad: [14, 0], name: 'SkeletonRow', ...p }, [
    box({ w: 44, h: 44, radius: 'full', fill: 'line', opacity: 0.7 }),
    vstack({ flex: 1, gap: 8 }, [box({ h: 14, radius: 6, fill: 'line', w: 150, opacity: 0.7 }), box({ h: 10, radius: 6, fill: 'line', w: 100, opacity: 0.7 })]),
    vstack({ hug: true, gap: 8, align: 'end' }, [box({ h: 14, w: 64, radius: 6, fill: 'line', opacity: 0.7 }), box({ h: 10, w: 80, radius: 6, fill: 'line', opacity: 0.7 })]),
  ]);

export const Card = (children, p = {}) => vstack({ radius: 16, stroke: 'line', fill: 'card', pad: 20, name: 'Card', ...p }, children);

/** Cards tab "No cards yet" note. */
export const ListNote = (str, p = {}) => Card([text(str, st({ size: 14, weight: 400, lineHeight: 20 }, { color: 'muted', align: 'center' }))], { align: 'center', name: 'ListNote', ...p });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** src/components/dashboard/dashboard-header.tsx */
export const DashboardHeader = (name, { avatar, ...p } = {}) =>
  hstack({ justify: 'between', gap: 12, name: 'DashboardHeader', ...p }, [
    hstack({ flex: 1, gap: 12 }, [ProfileAvatar({ size: 48, avatar, label: avatar ? name.slice(0, 1) : undefined }), text(name, { size: 20, weight: 600, lineHeight: 28, color: 'ink' }, { flex: 1, nowrap: true })]),
    box({ w: 44, h: 44, radius: 12, justify: 'center', align: 'center' }, [icon('Bell', { size: 22, color: 'ink' })]),
  ]);

/** src/components/dashboard/balance-summary.tsx — the accent hero card. */
export const BalanceSummary = ({ left = 0, income = 0, expenses = 0, daysLeft = 14, loading = false, error = false, ...p } = {}) => {
  const share = error || income <= 0 ? null : Math.min(Math.max(expenses / income, 0), 1);
  const digits = fmt(left).length;
  const size = digits > 12 ? 28 : digits > 10 ? 34 : 40;
  const stat = (label, amount, iconName) =>
    vstack({ flex: 1 }, [
      hstack({ gap: 6 }, [icon(iconName, { size: 14, color: 'onControl', opacity: 0.7 }), text(label, { size: 12, weight: 500, lineHeight: 17, color: 'onControl/85' }, { nowrap: true })]),
      loading ? box({ h: 20, w: 96, radius: 6, fill: 'onControl', opacity: 0.2, mt: 6 }) : text(error ? '—' : fmt(amount), { size: 20, weight: 600, lineHeight: 28, color: 'onControl' }, { mt: 4, nowrap: true }),
    ]);
  return vstack({ radius: 24, fill: 'control', pad: 20, clip: true, name: 'BalanceSummary', ...p }, [
    hstack({ justify: 'between', align: 'start', gap: 12 }, [
      text('Left this month', { size: 15, weight: 500, lineHeight: 22, color: 'onControl/85' }, { nowrap: true }),
      box({ hug: true, radius: 'full', fill: 'onControl/15', pad: [6, 12] }, [text(daysLeft === 0 ? 'Last day' : `${daysLeft} days left`, { size: 12, weight: 500, lineHeight: 16, color: 'onControl' }, { nowrap: true })]),
    ]),
    error
      ? text('—', { size: 40, weight: 700, lineHeight: 52, color: 'onControl' }, { mt: 12 })
      : loading
        ? box({ h: 52, w: 220, radius: 12, fill: 'onControl', opacity: 0.2, mt: 12 })
        : text(fmt(left), { size, weight: 700, lineHeight: Math.round(size * 1.3), color: 'onControl' }, { mt: 12, nowrap: true }),
    error
      ? text('We could not load this month. Pull down to try again.', { size: 12, weight: 400, lineHeight: 17, color: 'onControl/85' }, { mt: 16 })
      : share === null
        ? null
        : vstack({ mt: 20 }, [
            hstack({ h: 8, radius: 'full', fill: 'onControl/15', clip: true }, [box({ flex: Math.max(share, 0.0001), fill: 'onControl', radius: 'full', self: 'stretch' }), box({ flex: Math.max(1 - share, 0.0001) })]),
            text(`${Math.round(share * 100)}% of this month's income is spoken for`, { size: 12, weight: 400, lineHeight: 17, color: 'onControl/85' }, { mt: 8 }),
          ]),
    divider({ color: 'onControl/20', mt: 20 }),
    hstack({ gap: 16, mt: 16 }, [stat('Income', income, 'ArrowDownLeft'), stat('Expenses', -expenses, 'ArrowUpRight')]),
  ]);
};

/** src/components/dashboard/quick-actions.tsx */
export const QuickActions = (p = {}) =>
  hstack({ gap: 8, align: 'start', name: 'QuickActions', ...p }, [
    ['Receipt', 'ReceiptText'], ['Bill', 'CalendarPlus'], ['Subscription', 'Repeat'], ['Salary', 'Banknote'],
  ].map(([label, name]) =>
    vstack({ flex: 1, gap: 8, align: 'center', pad: [4, 0] }, [
      box({ w: 48, h: 48, radius: 'full', fill: 'accent/10', justify: 'center', align: 'center' }, [icon(name, { size: 20, color: 'accentInk' })]),
      text(label, { size: 12, weight: 500, lineHeight: 17, color: 'body', align: 'center' }, { maxLines: 2 }),
    ]),
  ));

/** src/components/dashboard/destination-list.tsx */
export const DestinationList = (items, { pro = false, loading = false, ...p } = {}) =>
  vstack({ radius: 16, stroke: 'line', fill: 'card', pad: [4, 0], clip: true, name: 'DestinationList', ...p }, items.flatMap((item, i) => {
    const locked = !pro && item.locked;
    const row = hstack({ minH: 56, gap: 12, pad: [14, 16] }, [
      IconWell(item.icon),
      text(item.label, TYPE.rowTitle, { flex: 1, nowrap: true }),
      locked ? ProBadge() : null,
      item.amount !== undefined
        ? loading ? box({ h: 14, w: 80, radius: 6, fill: 'line' }) : text(fmt(item.amount), st(TYPE.rowAmount, { color: money(item.amount) }), { nowrap: true })
        : hstack({ hug: true, gap: 4 }, [text('Open', TYPE.caption, { nowrap: true }), icon('ChevronRight', { size: 18, color: 'muted', stroke: 2 })]),
    ]);
    return i > 0 ? [RowDivider(), row] : [row];
  }));

export const DESTINATIONS = [
  { id: 'monthly-bills', label: 'Monthly Bills', icon: 'CalendarDays', amount: -1240.5 },
  { id: 'receipts', label: 'Receipts', icon: 'ReceiptText', amount: -386.42 },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'Repeat', amount: -64.97 },
  { id: 'loan-calculator', label: 'Loan calculator', icon: 'Landmark', locked: true },
  { id: 'split-calculator', label: 'Split manager', icon: 'Users', locked: true },
];

/** src/components/dashboard/insight-banner.tsx */
export const InsightBanner = (p = {}) =>
  hstack({ radius: 16, stroke: 'line', fill: 'card', pad: [14, 16], gap: 12, name: 'InsightBanner', ...p }, [
    IconWell('TrendingUp'),
    vstack({ flex: 1 }, [text('Insights', TYPE.rowTitle, { nowrap: true }), text('See the story behind your spending', TYPE.rowSub, { mt: 2, maxLines: 2 })]),
    box({ hug: true, pad: { l: 4 } }, icon('ChevronRight', { size: 18, color: 'muted', stroke: 2 })),
  ]);

/** src/components/dashboard/getting-started-card.tsx */
export const GettingStartedCard = (steps, p = {}) => {
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return vstack({ mt: 24, radius: 16, stroke: 'line', fill: 'card', pad: 20, name: 'GettingStartedCard', ...p }, [
    hstack({ justify: 'between', align: 'start', gap: 12 }, [
      vstack({ flex: 1 }, [SectionHeading('Getting started'), text(`${done} of ${steps.length} done`, TYPE.rowSub, { mt: 2 })]),
      box({ w: 36, h: 36, radius: 'full', justify: 'center', align: 'center' }, [icon('X', { size: 17, color: 'muted', stroke: 2 })]),
    ]),
    hstack({ h: 6, radius: 'full', fill: 'ink/5', clip: true, mt: 12 }, [box({ flex: Math.max(done / steps.length, 0.0001), fill: 'accent', radius: 'full', self: 'stretch' }), box({ flex: Math.max(1 - done / steps.length, 0.0001) })]),
    vstack({ mt: 8 }, steps.map((s) =>
      hstack({ gap: 12, pad: [10, 0] }, [
        s.done
          ? box({ w: 24, h: 24, radius: 'full', fill: 'accent', justify: 'center', align: 'center' }, [icon('Check', { size: 14, color: 'onControl' })])
          : box({ w: 24, h: 24, radius: 'full', stroke: 'line' }),
        vstack({ flex: 1 }, [
          text(s.title, s.done ? { size: 14, weight: 400, lineHeight: 20, color: 'muted', strike: true } : { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { nowrap: true }),
          s === next && s.detail ? text(s.detail, TYPE.rowSub, { mt: 2 }) : null,
        ]),
        s.done ? null : icon('ChevronRight', { size: 16, color: 'muted', stroke: 2 }),
      ]),
    )),
  ]);
};

/** src/components/dashboard/date-selector.tsx */
export const DateSelector = (weekday, date, { atLatest = true, ...p } = {}) =>
  hstack({ radius: 12, stroke: 'line', pad: [8, 6], justify: 'between', name: 'DateSelector', ...p }, [
    box({ w: 40, h: 40, radius: 'full', justify: 'center', align: 'center' }, [icon('ChevronLeft', { size: 20, color: 'ink', stroke: 2 })]),
    hstack({ flex: 1, justify: 'center', gap: 8 }, [
      vstack({ hug: true, align: 'center' }, [text(weekday, { size: 12, weight: 500, lineHeight: 17, color: 'muted', align: 'center' }, { hug: true }), text(date, { size: 15, weight: 600, lineHeight: 22, color: 'ink', align: 'center' }, { hug: true })]),
      icon('Calendar', { size: 18, color: 'muted' }),
    ]),
    box({ w: 40, h: 40, radius: 'full', justify: 'center', align: 'center', opacity: atLatest ? 0.3 : undefined }, [icon('ChevronRight', { size: 20, color: 'ink', stroke: 2 })]),
  ]);

/** src/components/ui/amount-tile.tsx — square, artwork softened to 55%. */
export const AmountTile = (label, amount, artName, p = {}) =>
  vstack({ aspect: 1, radius: 16, stroke: 'line', fill: 'card', pad: 14, justify: 'center', align: 'center', name: 'AmountTile', ...p }, [
    art(artName, { w: 84, h: 84, opacity: 0.55 }),
    vstack({ mt: 10, align: 'center' }, [
      text(label, { size: 13, weight: 500, lineHeight: 18, color: 'body', align: 'center' }, { nowrap: true }),
      text(amount === undefined ? 'Open' : fmt(amount), { size: 16, weight: 600, lineHeight: 22, color: amount === undefined ? 'muted' : 'ink', align: 'center' }, { mt: 4, nowrap: true }),
    ]),
  ]);

/** src/components/ui/page-state.tsx — empty / error / no results. */
export const PageState = (artName, title, message, { action, secondary, ...p } = {}) =>
  vstack({ flex: 1, pad: [40, 8], justify: 'center', align: 'center', name: 'PageState', ...p }, [
    art(artName, { w: 198, h: 198, self: 'center' }),
    text(title, { size: 19, weight: 600, lineHeight: 24, color: 'ink', align: 'center' }, { mt: 28 }),
    text(message, { size: 14, weight: 400, lineHeight: 20, color: 'muted', align: 'center' }, { mt: 10, w: 300, self: 'center' }),
    action ? Button(action, { mt: 28, w: 280, self: 'center' }) : null,
    secondary ? TextLink(secondary, { variant: 'subtle', mt: 16 }) : null,
  ]);

/** src/components/ui/illustration.tsx — 75% wide, max 280, square. */
export const Illustration = (artName, { ratio = 0.75, maxW = 280, aspect = 1, ...p } = {}) =>
  art(artName, { w: Math.min(342 * ratio, maxW), aspect, self: 'center', ...p });

/** src/components/ui/feature-row.tsx */
export const FeatureRow = (artName, copy, p = {}) =>
  hstack({ gap: 16, name: 'FeatureRow', ...p }, [box({ w: 80, h: 80, justify: 'center', align: 'center' }, [art(artName, { w: 80, h: 80 })]), vstack({ flex: 1 }, copy)]);

// ---------------------------------------------------------------------------
// Cards tab
// ---------------------------------------------------------------------------

/** src/components/cards/card-face.tsx — aspect 1.62, 10px corners, "Skip" watermark. */
export const CardFace = ({ color: c = '#FA8F6F', title, titlePlaceholder, meta = '', metaStyle = 'label', amount = 0, caption, last4 = '', ...p } = {}) => {
  const onLight = isLightColor(c);
  const fg = onLight ? 'ink' : '#FFFFFF';
  const mutedFg = onLight ? 'rgba(17,17,17,0.6)' : 'rgba(255,255,255,0.7)';
  const watermark = onLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)';
  const white = c.toUpperCase() === '#FFFFFF';
  return vstack({ aspect: 1.62, radius: 10, fill: c, stroke: white ? 'line' : undefined, shadow: 'card', pad: 20, justify: 'between', clip: true, relative: true, name: 'CardFace', ...p }, [
    raw({
      h: 0, name: 'watermark',
      svg: (x, y, w, h, ctx) => `<text x="${x - 8}" y="${y + 197}" font-family="${ctx.font.replace(/"/g, "'")}" font-size="104" font-weight="700" fill="${ctx.mode === 'wire' ? 'rgba(0,0,0,0.05)' : watermark}">Skip</text>`,
      html: (ctx) => `<div style="position:absolute;left:12px;bottom:-16px;font:700 104px/120px ${fontOf(ctx)};color:${ctx.mode === 'wire' ? 'rgba(0,0,0,0.05)' : watermark};pointer-events:none">Skip</div>`,
    }),
    vstack({}, [
      hstack({ justify: 'between', align: 'start', gap: 12 }, [
        text(title || titlePlaceholder || ' ', { size: 15, weight: 500, lineHeight: 22, color: title ? fg : mutedFg }, { flex: 1, nowrap: true }),
        text(meta, metaStyle === 'mark' ? { size: 18, weight: 700, lineHeight: 26, color: fg, italic: true } : { size: 13, weight: 500, lineHeight: 18, color: mutedFg }, { nowrap: true }),
      ]),
      caption ? text(caption, { size: 11, weight: 500, lineHeight: 16, color: mutedFg, transform: 'uppercase', letterSpacing: 0.4 }, { mt: 8, nowrap: true }) : null,
      text(fmt(amount, { cents: false }), { size: 26, weight: 700, lineHeight: 34, color: fg }, { mt: caption ? 2 : 6, nowrap: true }),
    ]),
    text(`••••  ${last4 || '••••'}`, { size: 15, weight: 500, lineHeight: 22, color: mutedFg }, { nowrap: true }),
  ]);
};

export const PaymentCard = ({ holder, network = 'VISA', balance = 0, last4, color: c, ...p } = {}) => {
  const owed = Math.round(balance);
  return CardFace({ color: c, title: holder, meta: network, metaStyle: 'mark', amount: -balance, caption: owed > 0 ? 'Owed' : owed < 0 ? 'In credit' : 'Nothing owed', last4, ...p });
};
export const AccountCard = ({ bankName, accountType = 'Checking', balance = 0, last4, color: c, ...p } = {}) =>
  CardFace({ color: c, title: bankName, meta: accountType, amount: balance, caption: Math.round(balance) < 0 ? 'Overdrawn' : 'Available', last4, ...p });

// ---------------------------------------------------------------------------
// Stepped add flows (src/components/flow)
// ---------------------------------------------------------------------------

/** StepFlow's own header: back chevron, centred title, and the progress pips. */
export const StepHeader = (title, steps, current, p = {}) =>
  vstack({ pad: { t: 4 }, name: 'StepHeader', ...p }, [
    hstack({ h: 44, justify: 'center' }, [
      box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center', self: 'center' }, [icon('ChevronLeft', { size: 24, color: 'ink', stroke: 2 })]),
      text(title, st(TYPE.stepTitle, { align: 'center' }), { flex: 1, nowrap: true }),
      box({ w: 44, h: 44 }),
    ]),
    hstack({ justify: 'center', gap: 8, mt: 16, name: 'StepIndicator' }, Array.from({ length: steps }, (_, i) => box({ w: i === current ? 40 : 10, h: 10, radius: 'full', fill: i === current ? 'ink' : 'ink/20' }))),
  ]);

export const StepQuestion = (str, p = {}) => text(str, st(TYPE.question, { align: 'center' }), { mt: 32, maxLines: 2, ...p });

/** Footer of every step: optional error line, the primary pill, optional slot. */
export const StepFooter = (label, { error, disabled, slot, ...p } = {}) =>
  vstack({ gap: 12, mt: 32, pad: { b: 8 }, name: 'StepFooter', ...p }, [
    error ? text(error, st(TYPE.caption, { color: 'danger', align: 'center' })) : null,
    Button(label, { disabled }),
    slot ?? null,
  ]);

const BANDS = [
  { max: 7, size: 64, lh: 76, affix: 28, top: 12 },
  { max: 10, size: 48, lh: 58, affix: 21, top: 9.5 },
  { max: 14, size: 36, lh: 44, affix: 16, top: 7 },
  { max: Infinity, size: 28, lh: 34, affix: 12, top: 5.5 },
];
const displayAmount = (raw) => {
  if (!raw) return '0';
  const [whole, fraction] = String(raw).split('.');
  const grouped = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
};

/** src/components/flow/amount-figure.tsx */
export const AmountFigure = (value = '', { unit = 'currency', ...p } = {}) => {
  const display = displayAmount(value);
  const band = BANDS.find((b) => display.length <= b.max);
  const empty = value === '' || Number(value) === 0;
  const affix = (s) => text(s, { size: band.affix, weight: 700, lineHeight: band.affix * 1.3, color: empty ? 'muted' : 'body' }, { nowrap: true, self: 'start', mt: band.top });
  return hstack({ justify: 'center', align: 'start', name: 'AmountFigure', ...p }, [
    unit === 'currency' ? affix('$') : null,
    text(display, { size: band.size, weight: 700, lineHeight: band.lh, color: empty ? 'muted' : 'ink' }, { nowrap: true }),
    unit === 'percent' ? affix('%') : null,
  ]);
};

/** src/components/flow/amount-keypad.tsx */
export const AmountKeypad = (p = {}) =>
  vstack({ gap: 12, name: 'AmountKeypad', ...p }, [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', 'delete']].map((row) =>
    hstack({ gap: 12 }, row.map((key) =>
      box({ flex: 1, h: 64, radius: 16, fill: 'ink/5', justify: 'center', align: 'center' }, [
        key === 'delete' ? icon('Delete', { size: 24, color: 'ink' }) : text(key, { size: 26, weight: 400, lineHeight: 34, color: 'ink', align: 'center' }, { hug: true }),
      ]),
    )),
  ));

/** Amount step: figure at the top, keypad pushed to the bottom. */
export const AmountStep = (value, { unit, ...p } = {}) =>
  vstack({ flex: 1, name: 'AmountStep', ...p }, [AmountFigure(value, { unit }), flexSpacer(), AmountKeypad({ mt: 32 })]);

/** src/components/flow/inline-calendar.tsx — September 2026 by default. */
export const InlineCalendar = ({ year = 2026, month = 8, selected = 17, today = 17, monthLabel = 'September 2026', firstWeekday = 2, days = 30, compact = false, showToday = true, ...p } = {}) => {
  const cell = compact ? 40 : 44;
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(box({ w: 342 / 7, h: cell + 4 }));
  for (let d = 1; d <= days; d += 1) {
    const isSel = d === selected;
    const isToday = d === today;
    cells.push(
      box({ w: 342 / 7, pad: [2, 0], align: 'center' }, [
        box({ w: cell, h: cell, radius: 'full', fill: isSel ? 'control' : 'none', stroke: !isSel && isToday ? 'control' : undefined, strokeWidth: 1.5, justify: 'center', align: 'center' }, [
          text(String(d), { size: 15, weight: isSel ? 600 : isToday ? 500 : 400, lineHeight: 22, color: isSel ? 'onControl' : isToday ? 'accentInk' : 'ink', align: 'center' }, { hug: true }),
        ]),
      ]),
    );
  }
  return vstack({ name: 'InlineCalendar', ...p }, [
    hstack({ justify: 'between' }, [
      box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [icon('ChevronLeft', { size: 22, color: 'ink', stroke: 2 })]),
      text(monthLabel, { size: 17, weight: 600, lineHeight: 24, color: 'ink', align: 'center' }, { nowrap: true }),
      box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [icon('ChevronRight', { size: 22, color: 'ink', stroke: 2 })]),
    ]),
    wrap({ gap: 0, mt: 8 }, [
      ...['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => box({ w: 342 / 7, pad: [4, 0], align: 'center' }, [text(d, { size: 11, weight: 500, lineHeight: 16, color: 'muted', align: 'center' }, { hug: true })])),
      ...cells,
    ]),
    showToday ? hstack({ justify: 'end', mt: 16 }, [ActionPill('Today', { iconName: 'CalendarDays' })]) : null,
  ]);
};

// ---------------------------------------------------------------------------
// Transactions tab
// ---------------------------------------------------------------------------

/** src/components/transactions/ledger-summary.tsx */
export const LedgerSummary = ({ net = 0, inTotal = 0, outTotal = 0, count = 0, ...p } = {}) => {
  const moved = inTotal + outTotal;
  const inShare = moved > 0 ? inTotal / moved : 0;
  const leg = (label, amount, c) => hstack({ flex: 1, gap: 8 }, [box({ w: 10, h: 10, radius: 'full', fill: c }), text(label, TYPE.small, { nowrap: true }), text(fmt(amount), { size: 13, weight: 500, lineHeight: 18, color: c }, { flex: 1, nowrap: true })]);
  return vstack({ radius: 16, fill: 'ink/4', pad: 16, name: 'LedgerSummary', ...p }, [
    hstack({ justify: 'between', align: 'start', gap: 12 }, [
      vstack({ flex: 1 }, [text(net < 0 ? 'Short by' : 'Left over', TYPE.caption), text(fmt(Math.abs(net)), { size: 26, weight: 700, lineHeight: 34, color: money(net) }, { mt: 2, nowrap: true })]),
      text(count === 0 ? 'Nothing yet' : `${count} ${count === 1 ? 'transaction' : 'transactions'}`, TYPE.small, { mt: 4, nowrap: true }),
    ]),
    moved === 0 ? null : hstack({ h: 10, radius: 'full', fill: 'ink/5', clip: true, mt: 16 }, [box({ flex: Math.max(inShare, 0.0001), fill: 'moneyIn', self: 'stretch' }), box({ flex: Math.max(1 - inShare, 0.0001), fill: 'moneyOut', self: 'stretch' })]),
    moved === 0 ? null : hstack({ gap: 12, mt: 12 }, [leg('In', inTotal, 'moneyIn'), leg('Out', -outTotal, 'moneyOut')]),
  ]);
};

/** src/components/transactions/flow-chart.tsx — 132pt of bars with figures on top. */
export const FlowChart = (buckets, p = {}) =>
  raw({
    h: 132 + 6 + 16, name: 'FlowChart', ...p,
    svg: (x, y, w, h, ctx) => {
      const { color } = ctxColor(ctx);
      const peak = Math.max(1, ...buckets.map((b) => b.spent));
      const slot = w / buckets.length;
      const bar = Math.max(3, slot - 4);
      const base = y + 132;
      const parts = [`<line x1="${x}" y1="${base}" x2="${x + w}" y2="${base}" stroke="${color('line')}"/>`];
      buckets.forEach((b, i) => {
        const bx = x + i * slot + 2;
        if (b.spent > 0) {
          const top = base - Math.max(3, (b.spent / peak) * (132 - 18));
          parts.push(`<rect x="${bx}" y="${top}" width="${bar}" height="${base - top}" rx="4" fill="${color('control')}"/>`);
          parts.push(`<text x="${bx + bar / 2}" y="${top - 6}" font-size="10" font-weight="600" fill="${color('body')}" text-anchor="middle">${b.spent >= 1000 ? `$${(b.spent / 1000).toFixed(b.spent >= 10000 ? 0 : 1)}k` : `$${Math.round(b.spent)}`}</text>`);
        }
        if (slot > 22) parts.push(`<text x="${bx + bar / 2}" y="${base + 18}" font-size="11" fill="${color('muted')}" text-anchor="middle">${b.label}</text>`);
      });
      return parts.join('');
    },
    html: (ctx) => {
      const { color } = ctxColor(ctx);
      const peak = Math.max(1, ...buckets.map((b) => b.spent));
      return `<div data-name="FlowChart" style="width:100%"><div style="display:flex;align-items:flex-end;height:132px;border-bottom:1px solid ${color('line')};gap:4px">${buckets
        .map((b) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%">${b.spent > 0 ? `<div style="font:600 10px ${fontOf(ctx)};color:${color('body')}">${b.spent >= 1000 ? `$${(b.spent / 1000).toFixed(1)}k` : `$${Math.round(b.spent)}`}</div><div style="width:100%;height:${Math.max(3, (b.spent / peak) * 114)}px;border-radius:4px 4px 0 0;background:${color('control')}"></div>` : ''}</div>`)
        .join('')}</div><div style="display:flex;margin-top:6px">${buckets.map((b) => `<div style="flex:1;text-align:center;font:400 11px ${fontOf(ctx)};color:${color('muted')}">${b.label}</div>`).join('')}</div></div>`;
    },
  });

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

/** src/components/ui/confirm-dialog.tsx — render through screen({ overlay }). */
export const ConfirmDialog = (title, message, { actions = [{ label: 'OK' }], cancel = 'Cancel' } = {}) => {
  const sideBySide = cancel !== null && actions.length === 1;
  const button = (label, { destructive, emphasis, full } = {}) =>
    box({ hug: !full, minH: 48, radius: 12, pad: [0, 20], justify: 'center', align: 'center' }, [
      text(label, { size: 15, weight: emphasis ? 600 : 500, lineHeight: 22, color: destructive ? 'danger' : emphasis ? 'ink' : 'muted', align: 'center' }, { nowrap: true, hug: true }),
    ]);
  return vstack({ w: 326, radius: 16, fill: 'card', shadow: 'floating', clip: true, name: 'ConfirmDialog' }, [
    vstack({ pad: { t: 20, b: 16, x: 20 } }, [text(title, { size: 17, weight: 600, lineHeight: 24, color: 'ink' }), message ? text(message, TYPE.body, { mt: 8 }) : null]),
    sideBySide
      ? hstack({ justify: 'end', gap: 8, pad: { b: 12, x: 12 } }, [button(cancel), button(actions[0].label, { destructive: actions[0].destructive, emphasis: true })])
      : vstack({ gap: 8, pad: { b: 12, x: 12 } }, [...actions.map((a) => button(a.label, { destructive: a.destructive, emphasis: true, full: true })), cancel !== null ? button(cancel, { full: true }) : null]),
  ]);
};

/** The RangeDropdown's open menu. */
export const RangeMenu = (options, value) =>
  vstack({ w: 300, radius: 16, fill: 'card', shadow: 'floating', pad: [6, 0], clip: true, name: 'RangeMenu' }, options.map((o) =>
    hstack({ justify: 'between', gap: 12, pad: [14, 20] }, [
      text(o, { size: 16, weight: o === value ? 500 : 400, lineHeight: 24, color: o === value ? 'ink' : 'body' }, { nowrap: true }),
      o === value ? icon('Check', { size: 18, color: 'ink', stroke: 2.4 }) : null,
    ]),
  ));

/** A bottom sheet body (filter sheets, pickers). Pass as screen({ sheet }). */
export const Sheet = (children, p = {}) => vstack({ radius: 24, fill: 'card', pad: { t: 12, b: 34, x: 24 }, name: 'Sheet', ...p }, [box({ w: 36, h: 5, radius: 'full', fill: 'line', self: 'center', mb: 16 }), ...children]);

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

export const TAB_ICONS = { home: 'House', cards: 'CreditCard', transactions: 'ReceiptText', settings: 'Bolt' };
export const TAB_LABELS = { home: 'Home', cards: 'Cards', transactions: 'Transactions', settings: 'Settings' };

/** src/components/navigation/skip-tab-bar.tsx — floating pill, selected tab expands. */
export const TabBar = (active, p = {}) =>
  vstack({ fill: 'surface', pad: { t: 8, b: 34, x: 16 }, name: 'TabBar', ...p }, [
    hstack({ radius: 'full', stroke: 'line', fill: 'card', shadow: 'floating', pad: [16, 12], justify: 'around' }, Object.keys(TAB_ICONS).map((tab) =>
      tab === active
        ? hstack({ hug: true, radius: 'full', fill: 'control', pad: [14, 20], gap: 8, name: `Tab/${tab}/active` }, [icon(TAB_ICONS[tab], { size: 22, color: 'onControl', stroke: 2 }), text(TAB_LABELS[tab], TYPE.tabLabel, { nowrap: true })])
        : box({ w: 52, h: 52, radius: 'full', justify: 'center', align: 'center', name: `Tab/${tab}` }, [icon(TAB_ICONS[tab], { size: 22, color: 'muted', stroke: 2 })]),
    )),
  ]);

/** src/components/dashboard/add-button.tsx */
export const AddButton = (p = {}) => box({ w: 64, h: 64, radius: 'full', fill: 'control', shadow: 'floating', justify: 'center', align: 'center', name: 'AddButton', ...p }, [icon('Plus', { size: 28, color: 'onControl', stroke: 2 })]);

/** src/components/ui/back-button.tsx — 44pt target, chevron 26. */
export const BackButton = (p = {}) => box({ w: 44, h: 44, radius: 12, justify: 'center', align: 'center', name: 'BackButton', ...p }, [icon('ChevronLeft', { size: 26, color: 'ink', stroke: 2 })]);

/** The iOS status bar, 59pt with the Dynamic Island. */
export const StatusBar = () =>
  raw({
    h: 59, name: 'StatusBar',
    svg: (x, y, w, h, ctx) => {
      const { color } = ctxColor(ctx);
      const ink = color('ink');
      return `<g data-name="StatusBar"><text x="${x + 52}" y="${y + 27}" font-size="16" font-weight="600" fill="${ink}" text-anchor="middle">9:41</text><rect x="${x + 128}" y="${y + 11}" width="124" height="36" rx="18" fill="${ctx.mode === 'wire' ? '#D4D4D4' : '#000000'}"/><g fill="${ink}"><rect x="${x + 292}" y="${y + 23}" width="3" height="4" rx="1"/><rect x="${x + 297}" y="${y + 21}" width="3" height="6" rx="1"/><rect x="${x + 302}" y="${y + 19}" width="3" height="8" rx="1"/><rect x="${x + 307}" y="${y + 17}" width="3" height="10" rx="1"/></g><path d="M${x + 318} ${y + 21}a9 9 0 0 1 12 0M${x + 320.5} ${y + 23.5}a5.5 5.5 0 0 1 7 0M${x + 323} ${y + 26}a2 2 0 0 1 2 0" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/><rect x="${x + 336}" y="${y + 17}" width="24" height="11" rx="3" fill="none" stroke="${ink}" stroke-opacity="0.4"/><rect x="${x + 338}" y="${y + 19}" width="20" height="7" rx="1.5" fill="${ink}"/><rect x="${x + 361}" y="${y + 20.5}" width="1.5" height="4" rx="0.5" fill="${ink}" fill-opacity="0.4"/></g>`;
    },
    html: (ctx) => {
      const { color } = ctxColor(ctx);
      const ink = color('ink');
      return `<div data-name="StatusBar" style="height:59px;position:relative;flex-shrink:0"><div style="position:absolute;left:34px;top:11px;width:36px;text-align:center;font:600 16px/24px ${fontOf(ctx)};color:${ink}">9:41</div><div style="position:absolute;left:128px;top:11px;width:124px;height:36px;border-radius:18px;background:${ctx.mode === 'wire' ? '#D4D4D4' : '#000'}"></div><div style="position:absolute;right:30px;top:17px;width:24px;height:11px;border-radius:3px;border:1px solid ${ink};opacity:.9;box-sizing:border-box"><div style="margin:1px;height:7px;border-radius:1.5px;background:${ink}"></div></div><div style="position:absolute;right:66px;top:17px;display:flex;align-items:flex-end;gap:2px;height:10px"><i style="width:3px;height:4px;background:${ink};border-radius:1px"></i><i style="width:3px;height:6px;background:${ink};border-radius:1px"></i><i style="width:3px;height:8px;background:${ink};border-radius:1px"></i><i style="width:3px;height:10px;background:${ink};border-radius:1px"></i></div></div>`;
    },
  });

/**
 * A screen. `children` sit in the 24pt-gutter column under the safe area, as
 * src/components/ui/screen.tsx lays them out. Set `tab` for the four tab pages,
 * `back` for pushed pages, `fab` for the add button, `overlay` / `sheet` for a
 * modal state.
 */
export const screen = ({ id, name, back = false, tab, fab = false, overlay, sheet, children = [], padBottom = 16 }) => ({
  id, name, back, tab, fab, overlay, sheet, children: kidsOf(children), padBottom,
});
const kidsOf = (c) => (Array.isArray(c) ? c : [c]).flat(3).filter(Boolean);
