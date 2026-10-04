// Skip · send-push · the card a notification carries
//
// Everything the phone needs to draw a notification beyond its title and body:
// the picture for the right-hand thumbnail (a brand logo, or the category's
// glyph when there is no brand), and the details for the card that opens on
// press-and-hold — the amount, when it lands, and which card or account pays.
//
// Plain TypeScript with no Deno or Node globals, so the app's Jest suite can
// test it directly; index.ts imports it as `./card.ts`.
//
// The phone side reads this from `userInfo.body` — see TapPayload in index.ts
// for why it lives there — in targets/notification-service and
// targets/notification-content, and src/api/push.ts routes the tap.

export type CardKind =
  'bill' | 'subscription' | 'card' | 'account' | 'charge' | 'group' | 'receipts';

export type PushCard = {
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
  /** Full URL of the brand logo in the brand-logos bucket. */
  logo?: string;
  /**
   * A category or kind id the phone draws as an icon — instead of a logo when
   * there is none, and in its place when the logo will not load.
   */
  glyph?: string;
  /** Title of the action that opens this in the app. */
  view: string;
};

/**
 * Where a tap lands, by name. The app maps each name to one of its own routes
 * and ignores anything else, so a payload can never send somebody to an
 * arbitrary screen. `id` is required by the per-item routes.
 */
export type TapRoute =
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

/**
 * A reminder body is "<when> · <amount>" or just "<when>" — reminders_due
 * writes it that way — so the card's pill and figure come straight from it.
 */
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
  logoPath?: string | null;
  categoryId?: string | null;
  iconId?: string | null;
  /** Who pays: the bill's or subscription's card or account. */
  payer?: SourceRow | null;
  /** The card itself, for a card-payment reminder. */
  self?: SourceRow | null;
};

export function reminderPayload(input: ReminderInput, supabaseUrl: string): TapPayload {
  const { when, amount } = splitBody(input.body);
  const logo = logoUrl(supabaseUrl, input.logoPath);
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
  logoPath?: string | null;
  glyph?: string | null;
  payer?: SourceRow | null;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "3 Oct" from "2026-10-03", without a time zone to get wrong. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1] ?? ''}`.trim();
}

/** A charge that has just been recorded: money that went out. */
export function chargePayload(input: ChargeInput, supabaseUrl: string): TapPayload {
  const logo = logoUrl(supabaseUrl, input.logoPath);
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
      view: input.subscriptionId
        ? 'View subscription'
        : input.billId
          ? 'View bill'
          : 'View transactions',
    },
  };
}

/** Several charges at once, folded into one notification. */
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

/** Something happened in a shared group. */
export function noticePayload(title: string, body: string): TapPayload {
  const { when, amount } = splitBody(body);
  return {
    route: '/splits',
    card: { kind: 'group', title, amount, note: when, glyph: 'group', view: 'Open Splits' },
  };
}

/** The evening nudge to log today's receipts. */
export function receiptsPayload(title: string, body: string): TapPayload {
  return {
    route: '/add-receipt',
    card: { kind: 'receipts', title, note: body, glyph: 'receipts', view: 'Add a receipt' },
  };
}
