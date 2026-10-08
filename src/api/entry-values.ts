/**
 * What a new or edited receipt, bill or subscription is saved as. Lifted out of the three add forms
 * so the voice review page saves through the same rules: each builder is the form's own Save minus
 * the writing, with the checks in the same order and the same words.
 *
 * Pure on purpose: no hooks, no Supabase, and nothing from `@/data/bill-categories` (it pulls lucide
 * icons into Jest). The caller hands in what it already read: the payment sources, and for an edit
 * the last charge on record and where the plan counts from. A new item passes
 * `lastChargedOn: null, countsFrom: null`, which makes both floors no-ops.
 *
 * The amount check is exactly the forms' `Number.isFinite(v) && v > 0`, with no rounding: the
 * keypad already settles at two decimals, and anything stricter would change what the forms
 * accept. Voice amounts are made cent-exact where they arrive (`src/lib/voice-draft.ts`).
 */
import type { BillValues, CaptureSource, ReceiptValues, SubscriptionValues } from '@/api/mutations';
import type { BrandSelection } from '@/components/brands/brand-field';
import { t } from '@/i18n';
import { countFromAfterPick, floorAfterCharges } from '@/lib/charges';
import { toIsoDate } from '@/lib/date';

/** A card or bank account, as `usePaymentSources()` lists it. */
export type SourceRef = { id: string; kind: 'card' | 'account' };

/** The values to write, or the first thing wrong: which field, and the form's hint for it. */
export type Built<T, F extends string> =
  { ok: true; values: T } | { ok: false; field: F; message: string };

type BillRecurrence = BillValues['recurrence'];
type SubscriptionCycle = SubscriptionValues['cycle'];

const refuse = <F extends string>(field: F, message: string) =>
  ({ ok: false, field, message }) as const;

/** The forms' amount rule, unchanged: a finite number above zero. */
function positive(amount: string): number | null {
  const value = Number(amount);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** A source id is filed under the column of its own kind; an unknown id under neither. */
function sourceColumns(sourceId: string, sources: readonly SourceRef[]) {
  const chosen = sources.find((source) => source.id === sourceId);
  return {
    card_id: chosen?.kind === 'card' ? chosen.id : null,
    bank_account_id: chosen?.kind === 'account' ? chosen.id : null,
  };
}

const noteOf = (note: string) => note.trim() || null;

export type ReceiptInput = {
  store: BrandSelection | null;
  /** The amount as typed, e.g. "12.50". */
  amount: string;
  date: Date;
  /** A card or account id, or '' for none. */
  sourceId: string;
  note: string;
  captureSource: CaptureSource;
};

/** add-receipt's Save. The store is checked before the amount. */
export function buildReceiptValues(
  input: ReceiptInput,
  sources: readonly SourceRef[],
): Built<ReceiptValues, 'store' | 'amount'> {
  const { store } = input;
  if (!store) return refuse('store', t('api.entry.pickStore'));
  const amount = positive(input.amount);
  if (amount === null) return refuse('amount', t('api.entry.receiptAmount'));

  return {
    ok: true,
    values: {
      brand_id: store.brandId,
      merchant: store.name,
      amount,
      purchased_on: toIsoDate(input.date),
      category_id: store.categoryId || 'other',
      ...sourceColumns(input.sourceId, sources),
      note: noteOf(input.note),
      source: input.captureSource,
      image_path: null,
    },
  };
}

export type BillInput = {
  name: string;
  amount: string;
  /** Who issues it, for the logo. Optional: rent has nobody behind it. */
  issuer: BrandSelection | null;
  /** A BILL_CATEGORIES id. Never the issuer's spend category. */
  categoryId: string;
  /** The picked icon; only an Other bill keeps one. */
  iconId: string;
  recurrence: BillRecurrence;
  /** The first due date, or a period's first day. */
  startDate: Date | null;
  /** A period's last day. Kept as given for any recurrence, as the form does. */
  endDate: Date | null;
  sourceId: string;
  note: string;
};

/**
 * add-bill's Save. The checks run name, amount, date, then a period that ends
 * before it starts, and each names the step it belongs to.
 */
export function buildBillValues(
  input: BillInput,
  ctx: { sources: readonly SourceRef[]; lastChargedOn: string | null },
): Built<BillValues, 'details' | 'amount' | 'when'> {
  const name = input.name.trim();
  if (!name) return refuse('details', t('api.entry.billName'));
  const amount = positive(input.amount);
  if (amount === null) return refuse('amount', t('api.entry.billAmount'));

  const isPeriod = input.recurrence === 'period';
  // A bill with no date cannot be scheduled, so it would save and never show.
  if (!input.startDate) {
    return refuse('when', isPeriod ? t('api.entry.periodStart') : t('api.entry.firstDue'));
  }
  const start = toIsoDate(input.startDate);
  // Compared as ISO days: no clock, no timezone, exact.
  if (isPeriod && input.endDate && toIsoDate(input.endDate) < start) {
    return refuse('when', t('api.entry.endBeforeStart'));
  }

  return {
    ok: true,
    values: {
      name,
      amount,
      brand_id: input.issuer?.brandId ?? null,
      category_id: input.categoryId,
      // Only a self-named bill has an icon of its own; the rest wear their category's. Saving the
      // picker's untouched 'other' onto a Housing bill would put the Other glyph on it.
      icon_id: input.categoryId === 'other' ? input.iconId || null : null,
      recurrence: input.recurrence,
      next_due_on: start,
      // Never on or before a charge already recorded, or an edit records that
      // cycle a second time. A set period keeps its own first day.
      starts_on: isPeriod ? start : floorAfterCharges(start, ctx.lastChargedOn, input.recurrence),
      ends_on: input.endDate ? toIsoDate(input.endDate) : null,
      ...sourceColumns(input.sourceId, ctx.sources),
      note: noteOf(input.note),
    },
  };
}

export type SubscriptionInput = {
  service: BrandSelection | null;
  amount: string;
  cycle: SubscriptionCycle;
  /** Optional: plenty of people know the cost but not the renewal date. */
  renewsOn: Date | null;
  sourceId: string;
  note: string;
  active: boolean;
};

/** add-subscription's Save. The service is checked before the amount. */
export function buildSubscriptionValues(
  input: SubscriptionInput,
  ctx: {
    sources: readonly SourceRef[];
    lastChargedOn: string | null;
    /** yyyy-mm-dd the row already counts renewals from; null for a new one. */
    countsFrom: string | null;
  },
): Built<SubscriptionValues, 'service' | 'amount'> {
  const { service } = input;
  if (!service) return refuse('service', t('api.entry.pickService'));
  const amount = positive(input.amount);
  if (amount === null) return refuse('amount', t('api.entry.subscriptionAmount'));

  const renewal = input.renewsOn ? toIsoDate(input.renewsOn) : null;
  return {
    ok: true,
    values: {
      brand_id: service.brandId,
      name: service.name,
      amount,
      cycle: input.cycle,
      next_renewal_on: renewal,
      // Counted from the renewal picked, and an edit only ever moves the start
      // earlier; then never on or before a renewal already recorded.
      started_on: floorAfterCharges(
        countFromAfterPick(renewal, ctx.countsFrom),
        ctx.lastChargedOn,
        input.cycle,
      ),
      category_id: service.categoryId || 'other',
      ...sourceColumns(input.sourceId, ctx.sources),
      note: noteOf(input.note),
      active: input.active,
    },
  };
}

/**
 * The name a bill gets when nobody typed one: the company, else the category's label, and nothing
 * for Other (which asks for a name).
 */
export function defaultBillName(
  categoryId: string,
  categoryLabel: string,
  issuer: BrandSelection | null,
): string {
  if (issuer?.name.trim()) return issuer.name;
  return categoryId === 'other' ? '' : categoryLabel;
}
