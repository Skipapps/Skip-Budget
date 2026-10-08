// Skip · send-push · the card a notification carries
//
// What the phone needs beyond title and body: the thumbnail (brand logo, or the category glyph) and
// the press-and-hold card details (amount, when, who pays).
//
// Plain TypeScript with no Deno or Node globals, so the app's Jest suite can test it directly;
// index.ts imports it as `./card.ts`.
//
// The phone reads this from `userInfo.body` (see TapPayload in index.ts) in
// targets/notification-service and targets/notification-content; src/api/push.ts routes the tap.

type CardKind = 'bill' | 'subscription' | 'card' | 'account' | 'charge' | 'group' | 'receipts';

type PushCard = {
  kind: CardKind;
  title: string;
  /** Formatted, e.g. "$15.49". Absent when there is no single figure. */
  amount?: string;
  /** The coloured pill, e.g. "Renews tomorrow". */
  when?: string;
  /** A plain line under the title, for notices that are a sentence. */
  note?: string;
  /** "Charged to", "Paid from", "Into", "Card". */
  sourceLabel?: string;
  /** "Amex ••1004", "Chase Checking". */
  source?: string;
  /** Full URL of the logo image: the logo CDN, or the brand-logos bucket without one. */
  logo?: string;
  /** A category or kind id the phone draws as an icon when there is no logo or it will not load. */
  glyph?: string;
  /**
   * A store's initials and their colours, drawn in place of the glyph when there is no logo or it
   * will not load, as the app draws them. Only for a subscription: a bill wears its icon.
   */
  letters?: string;
  /** "#RRGGBB" behind the letters. */
  lettersColor?: string;
  /** "#RRGGBB" of the letters. */
  lettersInk?: string;
  /** Title of the action that opens this in the app. */
  view: string;
};

/**
 * Where a tap lands, by name. The app maps each name to one of its own routes and ignores anything
 * else, so a payload can never send somebody to an arbitrary screen. `id` is required by the
 * per-item routes.
 */
type TapRoute =
  '/add-receipt' | '/bill' | '/subscription' | '/source' | '/splits' | '/transactions';

export type TapPayload = { route: TapRoute; id?: string; card?: PushCard };

/** Dollars the way the app writes them: "$1,500.00". */
export function money(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Math.abs(amount),
  );
}

/** The public URL of a logo stored as `v1/netflix.png`. */
export function logoUrl(
  supabaseUrl: string,
  logoPath: string | null | undefined,
): string | undefined {
  if (!logoPath || !supabaseUrl) return undefined;
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/brand-logos/${logoPath}`;
}

/** What a bill or subscription says about its logo: the owner's choice and its catalog brand. */
export type LogoSource = {
  logoDomain?: string | null;
  logoHidden?: boolean | null;
  brandDomain?: string | null;
  /** The catalog brand's file in the brand-logos bucket. */
  logoPath?: string | null;
};

const present = (value: string | null | undefined): string | null =>
  value?.trim().toLowerCase() || null;

/**
 * Which website's logo to show, or null for none. Must stay the app's rule (logoDomainOf in
 * src/lib/logo-domain.ts) so a notification never shows a logo the app does not.
 */
export function logoDomainOf(source: LogoSource): string | null {
  if (source.logoHidden) return null;
  return present(source.logoDomain) ?? present(source.brandDomain);
}

/**
 * The thumbnail's URL. With LOGO_CDN_URL set, any domain's logo by name (a 404 there leaves the
 * glyph). Without it, only the catalog's bucket files exist, so a row whose owner chose another
 * website gets the glyph rather than the logo they replaced.
 */
export function thumbnailUrl(
  source: LogoSource,
  supabaseUrl: string,
  logoCdnUrl?: string | null,
): string | undefined {
  const domain = logoDomainOf(source);
  const cdn = logoCdnUrl?.trim().replace(/\/+$/, '');
  if (cdn) return domain ? `${cdn}/${encodeURIComponent(domain)}` : undefined;

  if (source.logoHidden) return undefined;
  const chosen = present(source.logoDomain);
  if (chosen && chosen !== present(source.brandDomain)) return undefined;
  return logoUrl(supabaseUrl, source.logoPath);
}

/**
 * The app's card colours (src/theme/card-colors.ts) in the same order, each with the ink the app
 * puts on it (isLightColor in src/lib/color.ts). The order is part of the hash below.
 */
const MONOGRAM_COLOURS: { background: string; ink: string }[] = [
  { background: '#FA8F6F', ink: '#161616' },
  { background: '#161616', ink: '#FFFFFF' },
  { background: '#FFFFFF', ink: '#161616' },
  { background: '#C7E756', ink: '#161616' },
  { background: '#7BC4F5', ink: '#161616' },
  { background: '#8B7BF5', ink: '#161616' },
  { background: '#E9CF9B', ink: '#161616' },
  { background: '#2E6E5B', ink: '#FFFFFF' },
];

/**
 * A store's initials on its colour. Must stay the app's monogramOf (src/lib/monogram.ts), which
 * the push-card test checks name by name.
 */
export function monogram(name: string): { letters: string; background: string; ink: string } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length === 0
      ? '?'
      : words.length === 1
        ? words[0].slice(0, 2).toUpperCase()
        : (words[0][0] + words[1][0]).toUpperCase();
  const keyed = name || '?';
  let hash = 0;
  for (let index = 0; index < keyed.length; index += 1) {
    hash = (hash * 31 + keyed.charCodeAt(index)) % 100000;
  }
  return { letters, ...MONOGRAM_COLOURS[hash % MONOGRAM_COLOURS.length] };
}

/** The card fields that draw a store's initials. */
function lettersFor(name: string): Pick<PushCard, 'letters' | 'lettersColor' | 'lettersInk'> {
  const mark = monogram(name);
  return { letters: mark.letters, lettersColor: mark.background, lettersInk: mark.ink };
}

/** A reminder body is "<when> · <amount>" or just "<when>" (reminders_due writes it that way). */
export function splitBody(body: string): { when: string; amount?: string } {
  const at = body.lastIndexOf(' · ');
  if (at === -1) return { when: body };
  const tail = body.slice(at + 3);
  return tail.startsWith('$') ? { when: body.slice(0, at), amount: tail } : { when: body };
}

/** The glyph a bill wears: the icon somebody picked, else its category's. */
export function billGlyph(
  categoryId: string | null | undefined,
  iconId: string | null | undefined,
): string {
  if (iconId && iconId !== 'other') return iconId;
  return categoryId || 'other';
}

export type SourceRow =
  | { kind: 'card'; network: string; last4: string | null }
  | { kind: 'account'; bank_name: string; nickname: string | null; last4: string | null };

/** The same label the app's "Paid with" pickers show. */
export function sourceName(source: SourceRow | null | undefined): string | undefined {
  if (!source) return undefined;
  const name = source.kind === 'card' ? source.network : source.nickname || source.bank_name;
  if (!name) return undefined;
  return source.last4 ? `${name} ••${source.last4}` : name;
}

type ReminderInput = {
  kind: 'bill' | 'subscription' | 'card' | 'account';
  title: string;
  body: string;
  /** The bill, subscription, card or account the reminder is about. */
  targetId: string | null;
  categoryId?: string | null;
  iconId?: string | null;
  /** Who pays: the bill's or subscription's card or account. */
  payer?: SourceRow | null;
  /** The card itself, for a card-payment reminder. */
  self?: SourceRow | null;
  /** Whether the account has Skip Pro: logos are Pro, so free gets letters or the icon. */
  pro: boolean;
} & LogoSource;

export function reminderPayload(
  input: ReminderInput,
  supabaseUrl: string,
  logoCdnUrl?: string | null,
): TapPayload {
  const { when, amount } = splitBody(input.body);
  const logo = input.pro ? thumbnailUrl(input, supabaseUrl, logoCdnUrl) : undefined;
  const id = input.targetId ?? undefined;

  switch (input.kind) {
    case 'subscription':
      return {
        route: '/subscription',
        id,
        card: {
          kind: 'subscription',
          title: input.title,
          amount,
          when,
          sourceLabel: 'Charged to',
          source: sourceName(input.payer),
          logo,
          glyph: input.categoryId || 'entertainment',
          ...lettersFor(input.title),
          view: 'View subscription',
        },
      };
    case 'bill':
      return {
        route: '/bill',
        id,
        card: {
          kind: 'bill',
          title: input.title,
          amount,
          when,
          sourceLabel: 'Paid from',
          source: sourceName(input.payer),
          logo,
          glyph: billGlyph(input.categoryId, input.iconId),
          view: 'View bill',
        },
      };
    case 'card':
      return {
        route: '/source',
        id,
        card: {
          kind: 'card',
          title: input.title,
          when,
          sourceLabel: 'Card',
          source: sourceName(input.self),
          glyph: 'card',
          view: 'View card',
        },
      };
    case 'account':
      return {
        route: '/source',
        id,
        card: {
          kind: 'account',
          title: input.title,
          when,
          sourceLabel: 'Into',
          source: sourceName(input.self),
          glyph: 'payday',
          view: 'View account',
        },
      };
  }
}

type ChargeInput = {
  label: string;
  amount: number;
  /** yyyy-mm-dd */
  chargedOn: string;
  billId?: string | null;
  subscriptionId?: string | null;
  glyph?: string | null;
  payer?: SourceRow | null;
  /** Whether the account has Skip Pro: logos are Pro, so free gets letters or the icon. */
  pro: boolean;
} & LogoSource;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "3 Oct" from "2026-10-03", without a time zone to get wrong. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1] ?? ''}`.trim();
}

export function chargePayload(
  input: ChargeInput,
  supabaseUrl: string,
  logoCdnUrl?: string | null,
): TapPayload {
  const logo = input.pro ? thumbnailUrl(input, supabaseUrl, logoCdnUrl) : undefined;
  const route: TapRoute = input.subscriptionId
    ? '/subscription'
    : input.billId
      ? '/bill'
      : '/transactions';
  return {
    route,
    id: input.subscriptionId ?? input.billId ?? undefined,
    card: {
      kind: 'charge',
      title: input.label,
      amount: money(input.amount),
      when: `Went out ${shortDate(input.chargedOn)}`,
      sourceLabel: 'Charged to',
      source: sourceName(input.payer),
      logo,
      glyph: input.glyph || 'other',
      ...(input.subscriptionId ? lettersFor(input.label) : {}),
      view: input.subscriptionId
        ? 'View subscription'
        : input.billId
          ? 'View bill'
          : 'View transactions',
    },
  };
}

export function digestPayload(count: number, total: number): TapPayload {
  return {
    route: '/transactions',
    card: {
      kind: 'charge',
      title: 'Payments went out',
      amount: money(total),
      when: `${count} charges`,
      glyph: 'other',
      view: 'View transactions',
    },
  };
}

export function noticePayload(title: string, body: string): TapPayload {
  const { when, amount } = splitBody(body);
  return {
    route: '/splits',
    card: { kind: 'group', title, amount, note: when, glyph: 'group', view: 'Open Splits' },
  };
}

export function receiptsPayload(title: string, body: string): TapPayload {
  return {
    route: '/add-receipt',
    card: { kind: 'receipts', title, note: body, glyph: 'receipts', view: 'Add a receipt' },
  };
}
