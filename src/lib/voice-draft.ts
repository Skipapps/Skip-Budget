/**
 * What Skip heard, carried from `/voice` to `/voice-review` and its edit pages, and on to an add
 * form when the person wants every option.
 *
 * One slot, in memory: `putVoiceDraft` stores the parsed draft plus a working copy (`VoiceEntry`)
 * that the review and `/voice-edit` pages change, and returns an id; the review page is pushed with
 * `?draft=<id>`. An edit page writes with `updateVoiceEntry` on Done; back writes nothing.
 * `useVoiceSession(id)` re-renders on every write, so the review page is current when refocused.
 *
 * Not route params, on purpose: the person's words stay out of navigation state, and a
 * `skipbudget://voice-review?…` link cannot open a pre-filled Save page. A cold link, or the
 * navigator remounting, finds no matching id and the page says "Nothing to check yet".
 *
 * The parser is a module boundary, so nothing it hands over is trusted: drafts and working copies
 * are re-validated on every write and read.
 *
 * "More options" goes out to a full add form as route params (`entryToForm`); the forms read them
 * back through the strict readers below, which drop anything invalid to blank and never coerce.
 */
import { useSyncExternalStore } from 'react';

import type { BillInput, ReceiptInput, SubscriptionInput } from '@/api/entry-values';
import type { BrandSelection } from '@/components/brands/brand-field';
import { t } from '@/i18n';
import { toCents } from '@/lib/money';
import type {
  VoiceCycle,
  VoiceDraft,
  VoiceKind,
  VoiceMerchant,
  VoiceMerchantSource,
  VoiceMissing,
} from '@/lib/voice';
import { BILL_CATEGORY_IDS } from '@/lib/voice/bill-category';

const KINDS: readonly VoiceKind[] = ['receipt', 'bill', 'subscription'];
const CYCLES: readonly VoiceCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];
const CONFIDENCES: readonly VoiceDraft['confidence'][] = ['high', 'medium', 'low'];

/**
 * Where the parser's merchant came from (`VoiceMerchantSource`): the review page learns a
 * correction only when the person changed a merchant that was not a `catalog` match.
 */
const MERCHANT_SOURCES: readonly VoiceMerchantSource[] = ['learned', 'catalog', 'fuzzy', 'heard'];

/** The keypad's ceiling: nine whole digits and two decimals. */
export const MAX_VOICE_AMOUNT = 999_999_999.99;

const MAX_NAME = 200;
/** The note field's own limit, as the forms' note page types it. */
const MAX_NOTE = 200;
const MAX_TRANSCRIPT = 2000;

const isString = (value: unknown): value is string => typeof value === 'string';

/** Dollars that are positive, within the keypad's range and exact to the cent. */
export function isVoiceAmount(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_VOICE_AMOUNT &&
    toCents(value) / 100 === value
  );
}

/**
 * A real calendar day as yyyy-mm-dd: the shape, and a round trip through the
 * calendar so 2026-02-30 and 2026-13-01 are refused.
 */
export function isIsoDay(value: unknown): value is string {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2999) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value;
}

/** Brand, category and source ids are slugs or uuids. */
const isId = (value: unknown): value is string =>
  isString(value) && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value);

const isDomain = (value: unknown): value is string =>
  isString(value) && value.length <= 253 && /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(value);

const isBillCategory = (value: unknown): value is string =>
  isString(value) && (BILL_CATEGORY_IDS as readonly string[]).includes(value);

const oneOf = <T extends string>(options: readonly T[], value: unknown): T | null =>
  isString(value) && (options as readonly string[]).includes(value) ? (value as T) : null;

function cleanName(value: unknown): string | null {
  if (!isString(value)) return null;
  const name = value.trim();
  return name && name.length <= MAX_NAME ? name : null;
}

/**
 * A note as text, trimmed: '' for an empty one (a fine note: it is optional), null for anything
 * that is not a note at all (not text, or over the limit).
 */
function cleanNote(value: unknown): string | null {
  if (!isString(value)) return null;
  const note = value.trim();
  return note.length <= MAX_NOTE ? note : null;
}

/**
 * A merchant whose every field is the right type, or null. The name is the one thing it cannot do
 * without; a bad brand id or domain only loses the logo, and so does a bad logo choice (which is
 * then simply not made, rather than refusing the entry).
 */
function cleanMerchant(value: unknown): VoiceMerchant | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const name = cleanName(raw.name);
  if (!name) return null;
  if (raw.brandId !== null && !isString(raw.brandId)) return null;
  if (raw.domain !== null && !isString(raw.domain)) return null;
  if (!isString(raw.categoryId)) return null;

  // Only an answer is kept: letters (which win, as on a saved row), or a logo. The store field marks
  // a store it has not asked about with null and false, which is the same as nothing, and so is a
  // bad value; both are dropped so such a merchant looks exactly as it did before logos.
  const chosen: Pick<VoiceMerchant, 'logoDomain' | 'logoHidden'> =
    raw.logoHidden === true
      ? { logoDomain: null, logoHidden: true }
      : isDomain(raw.logoDomain)
        ? { logoDomain: raw.logoDomain, logoHidden: false }
        : {};

  return {
    brandId: isId(raw.brandId) ? raw.brandId : null,
    name,
    domain: isDomain(raw.domain) ? raw.domain : null,
    categoryId: isId(raw.categoryId) ? raw.categoryId : '',
    ...chosen,
  };
}

/** Two or more distinct valid amounts, in the order given; otherwise none. */
function cleanChoices(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const kept = [...new Set(value.filter(isVoiceAmount))];
  return kept.length >= 2 ? kept : [];
}

/** What the review page should still ask for: the parser's `missingOf` rules, recomputed. */
function missingFor(fields: {
  kind: VoiceKind;
  amount: number | null;
  amountChoices: readonly number[];
  merchant: VoiceMerchant | null;
  date: string | null;
  cycle: VoiceCycle | null;
  billCategoryId: string | null;
}): VoiceMissing[] {
  const missing: VoiceMissing[] = [];
  if (fields.amount === null || fields.amountChoices.length > 1) missing.push('amount');
  if (fields.kind !== 'bill' && fields.merchant === null) missing.push('merchant');
  if (fields.kind === 'bill' && fields.date === null) missing.push('date');
  if (fields.kind !== 'receipt' && fields.cycle === null) missing.push('cycle');
  if (fields.kind === 'bill' && fields.billCategoryId === null) missing.push('category');
  return missing;
}

/**
 * A parser draft, checked field by field. Null only when it is not a draft at all; anything else
 * that fails is nulled or emptied and `missing` is recomputed.
 *
 * An amount the parser left unsettled stays unsettled: if any offered choice fails the checks, the
 * amount is not taken as heard ("$40 or $4,000,000,000,000" must not open as a settled $40). The
 * surviving choices are still offered when there are two or more.
 */
export function validateVoiceDraft(input: unknown): VoiceDraft | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const kind = oneOf(KINDS, raw.kind);
  if (!kind) return null;

  const offered = Array.isArray(raw.amountChoices) ? raw.amountChoices : [];
  const amountChoices = cleanChoices(offered);
  const unsettled = offered.length > 0 && amountChoices.length !== offered.length;
  const merchant = cleanMerchant(raw.merchant);

  const fields = {
    kind,
    amount: !unsettled && isVoiceAmount(raw.amount) ? raw.amount : null,
    amountChoices,
    merchant,
    date: isIsoDay(raw.date) ? raw.date : null,
    cycle: oneOf(CYCLES, raw.cycle),
    billCategoryId: isBillCategory(raw.billCategoryId) ? raw.billCategoryId : null,
  };

  return {
    ...fields,
    kindSure: raw.kindSure === true,
    merchantHeard: merchant ? cleanName(raw.merchantHeard) : null,
    // Null with no merchant, and for anything outside the four: an unknown source is never
    // treated as safe to learn from.
    merchantSource: merchant ? oneOf(MERCHANT_SOURCES, raw.merchantSource) : null,
    score: typeof raw.score === 'number' && Number.isFinite(raw.score) ? raw.score : 0,
    confidence: oneOf(CONFIDENCES, raw.confidence) ?? 'low',
    missing: missingFor(fields),
    transcript: isString(raw.transcript) ? raw.transcript.slice(0, MAX_TRANSCRIPT) : '',
    multiple: raw.multiple === true,
  };
}

/** The review page's state: what Save will write, as the person has it now. */
export type VoiceEntry = {
  kind: VoiceKind;
  /** Dollars, cent-exact. Null until heard, typed or picked. */
  amount: number | null;
  /** The amounts to choose between when what was heard was ambiguous; `amount` is null then. */
  amountChoices: number[];
  /** The store, company or service. For a bill, the company. */
  merchant: VoiceMerchant | null;
  /**
   * Bills only: the bill's name when typed by hand. Null falls back to the company, else the
   * category's label (`voiceBillName`).
   */
  billName: string | null;
  /** yyyy-mm-dd. */
  date: string | null;
  cycle: VoiceCycle | null;
  /** Bills only: a BILL_CATEGORIES id. */
  billCategoryId: string | null;
  /** A card or bank account id, or null for none (the forms' default). */
  sourceId: string | null;
  /** Typed on the review page, never heard; null for none. */
  note: string | null;
};

export type VoiceEntryField = keyof VoiceEntry;

/** The working copy a fresh draft opens with. An ambiguous amount is left unpicked. */
export function entryFromDraft(draft: VoiceDraft): VoiceEntry {
  const ambiguous = draft.amountChoices.length >= 2;
  return {
    kind: draft.kind,
    amount: ambiguous ? null : draft.amount,
    amountChoices: ambiguous ? [...draft.amountChoices] : [],
    merchant: draft.merchant ? { ...draft.merchant } : null,
    billName: null,
    date: draft.date,
    cycle: draft.cycle,
    billCategoryId: draft.billCategoryId,
    sourceId: null,
    note: null,
  };
}

/**
 * A working copy, checked. A bad value here is a bug in a page rather than noise in a sentence, so
 * it refuses the whole thing (null) instead of quietly blanking the field somebody just set.
 */
export function validateVoiceEntry(input: unknown): VoiceEntry | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const kind = oneOf(KINDS, raw.kind);
  if (!kind) return null;
  if (raw.amount !== null && !isVoiceAmount(raw.amount)) return null;
  if (!Array.isArray(raw.amountChoices)) return null;
  const amountChoices = cleanChoices(raw.amountChoices);
  if (amountChoices.length !== raw.amountChoices.length) return null;
  const merchant = raw.merchant === null ? null : cleanMerchant(raw.merchant);
  if (raw.merchant !== null && !merchant) return null;
  const billName = raw.billName === null ? null : cleanName(raw.billName);
  if (raw.billName !== null && billName === null) return null;
  if (raw.date !== null && !isIsoDay(raw.date)) return null;
  if (raw.cycle !== null && !oneOf(CYCLES, raw.cycle)) return null;
  if (raw.billCategoryId !== null && !isBillCategory(raw.billCategoryId)) return null;
  if (raw.sourceId !== null && !isId(raw.sourceId)) return null;
  const note = raw.note === null ? '' : cleanNote(raw.note);
  if (note === null) return null;

  return {
    kind,
    amount: amountChoices.length > 0 ? null : (raw.amount as number | null),
    amountChoices,
    merchant,
    billName,
    date: raw.date as string | null,
    cycle: raw.cycle as VoiceCycle | null,
    billCategoryId: raw.billCategoryId as string | null,
    sourceId: raw.sourceId as string | null,
    // A note of only spaces is no note, so it reads the same as one never written.
    note: note || null,
  };
}

type Slot = {
  id: string;
  draft: VoiceDraft;
  /** The recogniser's alternatives, best first, for a re-parse with `forceKind`. */
  alternatives: string[];
  entry: VoiceEntry;
  /** Fields the person has changed. A re-parse leaves these alone. */
  touched: VoiceEntryField[];
};

/** What the review page renders from. Frozen: change it through `updateVoiceEntry`. */
export type VoiceSession = Readonly<{
  id: string;
  /**
   * The draft as parsed. Its merchant, `merchantHeard` and `merchantSource` stay the parse's own
   * after a hand edit of the merchant (that lands on `entry`), so `draft` against `entry` plus
   * `touched` is the evidence for whether to learn.
   */
  draft: Readonly<VoiceDraft>;
  alternatives: readonly string[];
  entry: Readonly<VoiceEntry>;
  touched: readonly VoiceEntryField[];
  /** True once anything was changed by hand: back and "Say it again" then ask first. */
  edited: boolean;
}>;

let slot: Slot | null = null;
let counter = 0;
const listeners = new Set<() => void>();
let snapshot: VoiceSession | null = null;

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
}

/** Rebuilds the frozen snapshot from the slot, re-validated, and tells the readers. */
function publish(): void {
  const draft = slot ? validateVoiceDraft(slot.draft) : null;
  const entry = slot ? validateVoiceEntry(slot.entry) : null;
  if (slot && (!draft || !entry)) slot = null;
  snapshot =
    slot && draft && entry
      ? freeze({
          id: slot.id,
          draft,
          alternatives: [...slot.alternatives],
          entry,
          touched: [...slot.touched],
          edited: slot.touched.length > 0,
        })
      : null;
  for (const listener of [...listeners]) listener();
}

function nextId(): string {
  counter += 1;
  return `v${Date.now().toString(36)}${counter.toString(36)}`;
}

/**
 * Stores a fresh draft, replacing whatever was there, and returns its id. Never throws: a draft
 * that fails validation leaves the slot empty, so the id finds nothing and the review page shows
 * "Nothing to check yet".
 */
export function putVoiceDraft(draft: VoiceDraft, alternatives: readonly string[] = []): string {
  const id = nextId();
  const checked = validateVoiceDraft(draft);
  slot = checked
    ? {
        id,
        draft: checked,
        alternatives: (Array.isArray(alternatives) ? alternatives : [])
          .filter(isString)
          .slice(0, 3)
          .map((text) => text.slice(0, MAX_TRANSCRIPT)),
        entry: entryFromDraft(checked),
        touched: [],
      }
    : null;
  publish();
  return id;
}

const current = (id: string | undefined): Slot | null =>
  slot && isString(id) && id === slot.id ? slot : null;

/** The draft as parsed, re-validated. Null unless `id` is the one in the slot. */
export function readVoiceDraft(id: string | undefined): VoiceDraft | null {
  const found = current(id);
  return found ? validateVoiceDraft(found.draft) : null;
}

/** The working copy, re-validated (a copy: changing it changes nothing). */
export function readVoiceEntry(id: string | undefined): VoiceEntry | null {
  const found = current(id);
  const entry = found ? validateVoiceEntry(found.entry) : null;
  return entry ? { ...entry, amountChoices: [...entry.amountChoices] } : null;
}

/**
 * Changes the working copy: an edit page's Done, a kind chip, a source tile. All or nothing: the
 * patched copy is validated whole, and if it is invalid or the id is stale nothing is written
 * (null). Every key in the patch is remembered as changed by hand. Setting an amount settles any
 * open choices, so picking a chip is `{ amount }` alone.
 */
export function updateVoiceEntry(
  id: string | undefined,
  patch: Partial<VoiceEntry>,
): VoiceEntry | null {
  const found = current(id);
  if (!found || !patch || typeof patch !== 'object') return null;
  const settles = patch.amount !== undefined && patch.amount !== null && !patch.amountChoices;
  const merged: Partial<VoiceEntry> = settles ? { ...patch, amountChoices: [] } : patch;
  const next = validateVoiceEntry({ ...found.entry, ...merged });
  if (!next) return null;

  const keys = (Object.keys(merged) as VoiceEntryField[]).filter((key) => key in found.entry);
  found.entry = next;
  found.touched = [...new Set([...found.touched, ...keys])];
  publish();
  return readVoiceEntry(id);
}

/**
 * Takes a re-parse of the same words (`parseVoice` with `forceKind`, after a kind change) and
 * re-derives every field the person has not changed by hand. A merchant changed by hand keeps the
 * original parse's merchant, `merchantHeard` and `merchantSource` together, since they are the
 * evidence for learning and must describe the same match. Null when the id is stale or the
 * re-parse is not a draft.
 */
export function rederiveVoiceEntry(
  id: string | undefined,
  reparsed: VoiceDraft,
): VoiceEntry | null {
  const found = current(id);
  const draft = found ? validateVoiceDraft(reparsed) : null;
  if (!found || !draft) return null;

  const fresh = entryFromDraft(draft);
  const merged = { ...fresh };
  for (const key of found.touched) {
    (merged as Record<VoiceEntryField, unknown>)[key] = found.entry[key];
  }
  // The amount and its choices travel together: a hand-picked amount keeps
  // its choices cleared, and an untouched one takes both from the re-parse.
  if (found.touched.includes('amount') || found.touched.includes('amountChoices')) {
    merged.amount = found.entry.amount;
    merged.amountChoices = found.entry.amountChoices;
  }
  // Nothing said is ever a note, so a re-parse has none to offer: the one typed stays.
  merged.note = found.entry.note;
  const next = validateVoiceEntry(merged);
  if (!next) return null;

  const kept = found.touched.includes('merchant')
    ? validateVoiceDraft({
        ...draft,
        merchant: found.draft.merchant,
        merchantHeard: found.draft.merchantHeard,
        merchantSource: found.draft.merchantSource,
      })
    : draft;

  found.draft = kept ?? draft;
  found.entry = next;
  publish();
  return readVoiceEntry(id);
}

/** Empties the slot. After a successful save, and on discarding the flow. */
export function clearVoiceDraft(): void {
  slot = null;
  publish();
}

export function subscribeVoiceDraft(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The session for `id`, re-rendering on every write. Null for a stale or missing id. */
export function useVoiceSession(id: string | undefined): VoiceSession | null {
  const session = useSyncExternalStore(
    subscribeVoiceDraft,
    () => snapshot,
    () => snapshot,
  );
  return session && isString(id) && session.id === id ? session : null;
}

/**
 * An amount as the keypad and the hero figure take it: two decimals, no commas,
 * built from whole cents ("12.50", "1250.00"). '' for none.
 */
export function amountText(amount: number | null): string {
  if (!isVoiceAmount(amount)) return '';
  const cents = toCents(amount);
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export function amountFromText(text: string): number | null {
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) return null;
  const value = Number(text);
  return isVoiceAmount(value) ? value : null;
}

/**
 * The review page's own two hints, which come before the builders': an ambiguous amount nobody
 * picked, and a bill with no category. Null when neither applies.
 */
export function voiceSaveBlocker(entry: VoiceEntry): string | null {
  if (entry.amount === null && entry.amountChoices.length >= 2) return t('lib.voice.pickAmount');
  if (entry.kind === 'bill' && !entry.billCategoryId) return t('lib.voice.pickBillCategory');
  return null;
}

/** A yyyy-mm-dd day as a local-midnight Date, which is how every form holds dates. */
export function dayToDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

const asSelection = (merchant: VoiceMerchant | null): BrandSelection | null =>
  merchant ? { ...merchant } : null;

/** A voice receipt for `buildReceiptValues`. No date heard means today, the form's own default. */
export function entryToReceiptInput(entry: VoiceEntry, today: Date): ReceiptInput {
  return {
    store: asSelection(entry.merchant),
    amount: amountText(entry.amount),
    date: entry.date ? dayToDate(entry.date) : today,
    sourceId: entry.sourceId ?? '',
    note: entry.note ?? '',
    captureSource: 'voice',
  };
}

/** The name a voice bill saves under: the one typed, else the company, else the category. */
export function voiceBillName(entry: VoiceEntry, categoryLabel: string): string {
  if (entry.billName) return entry.billName;
  if (entry.merchant) return entry.merchant.name;
  return entry.billCategoryId && entry.billCategoryId !== 'other' ? categoryLabel : '';
}

/**
 * A voice bill for `buildBillValues`. `categoryLabel` is `entry.billCategoryId`'s
 * name in the language on screen (billCategoryLabel), which this module cannot
 * import. Check `voiceSaveBlocker` first: a bill with no category is not a bill
 * to save.
 */
export function entryToBillInput(entry: VoiceEntry, categoryLabel: string): BillInput {
  return {
    name: voiceBillName(entry, categoryLabel),
    amount: amountText(entry.amount),
    issuer: asSelection(entry.merchant),
    categoryId: entry.billCategoryId ?? '',
    // The form's own starting icon; only an Other bill keeps it.
    iconId: 'other',
    recurrence: entry.cycle ?? 'monthly',
    startDate: entry.date ? dayToDate(entry.date) : null,
    endDate: null,
    sourceId: entry.sourceId ?? '',
    note: entry.note ?? '',
  };
}

export function entryToSubscriptionInput(entry: VoiceEntry): SubscriptionInput {
  return {
    service: asSelection(entry.merchant),
    amount: amountText(entry.amount),
    cycle: entry.cycle ?? 'monthly',
    renewsOn: entry.date ? dayToDate(entry.date) : null,
    sourceId: entry.sourceId ?? '',
    note: entry.note ?? '',
    active: true,
  };
}

export type VoiceFormHref = {
  pathname: '/add-receipt' | '/add-bill' | '/add-subscription';
  params: Record<string, string>;
};

/**
 * "More options": the full add form for the entry's kind, with the edited values as route params
 * and `from=voice`. Only what is set is sent. Receipts use add-receipt's scan keys plus
 * `scannedVia=voice`; bills and subscriptions use the `prefill…` keys that `readBillPrefill` /
 * `readSubscriptionPrefill` read.
 */
export function entryToForm(entry: VoiceEntry): VoiceFormHref {
  const params: Record<string, string> = { from: 'voice' };
  const put = (key: string, value: string | null | undefined) => {
    if (value) params[key] = value;
  };
  const amount = amountText(entry.amount);
  const merchant = entry.merchant;
  // A logo the person already chose goes with the store, so the form does not ask them again.
  const putLogo = (domainKey: string, hiddenKey: string) => {
    if (merchant?.logoHidden) params[hiddenKey] = '1';
    else put(domainKey, merchant?.logoDomain);
  };

  if (entry.kind === 'receipt') {
    params.scannedVia = 'voice';
    put('scannedStore', merchant?.name);
    put('scannedBrandId', merchant?.brandId);
    put('scannedDomain', merchant?.domain);
    put('scannedCategory', merchant?.categoryId);
    putLogo('scannedLogoDomain', 'scannedLogoHidden');
    put('scannedAmount', amount);
    put('scannedDate', entry.date);
    put('scannedSource', entry.sourceId);
    put('scannedNote', entry.note);
    return { pathname: '/add-receipt', params };
  }

  if (entry.kind === 'bill') {
    put('prefillIssuer', merchant?.name);
    put('prefillBrandId', merchant?.brandId);
    put('prefillDomain', merchant?.domain);
    putLogo('prefillLogoDomain', 'prefillLogoHidden');
    put('prefillName', entry.billName);
    put('prefillCategory', entry.billCategoryId);
    put('prefillAmount', amount);
    put('prefillDate', entry.date);
    put('prefillCycle', entry.cycle);
    put('prefillSource', entry.sourceId);
    put('prefillNote', entry.note);
    return { pathname: '/add-bill', params };
  }

  put('prefillName', merchant?.name);
  put('prefillBrandId', merchant?.brandId);
  put('prefillDomain', merchant?.domain);
  putLogo('prefillLogoDomain', 'prefillLogoHidden');
  put('prefillCategory', merchant?.categoryId);
  put('prefillAmount', amount);
  put('prefillDate', entry.date);
  put('prefillCycle', entry.cycle);
  put('prefillSource', entry.sourceId);
  put('prefillNote', entry.note);
  return { pathname: '/add-subscription', params };
}

export type RouteParams = Record<string, string | string[] | undefined>;

/** One string param, or undefined. A repeated param is not one value, so it is dropped. */
const param = (params: RouteParams, key: string): string | undefined => {
  const value = params[key];
  return isString(value) ? value : undefined;
};

export function cameFromVoice(params: RouteParams): boolean {
  return param(params, 'from') === 'voice';
}

/** An amount param as the keypad would have typed it ("15.99", "1100"), else '': never coerced. */
export function readAmountParam(value: string | undefined): string {
  return isString(value) && amountFromText(value) !== null ? value : '';
}

/** A yyyy-mm-dd param as a local-midnight Date, or null when it is not a real day. */
export function readDayParam(value: string | undefined): Date | null {
  return isIsoDay(value) ? dayToDate(value) : null;
}

/** A source id param, or '' (the forms' "none"). */
export function readSourceParam(value: string | undefined): string {
  return isId(value) ? value : '';
}

/** A note param, trimmed, or '' when it is not one: one over the limit is dropped, never cut. */
export function readNoteParam(value: string | undefined): string {
  return cleanNote(value) ?? '';
}

/**
 * A store, company or service from its params, or null without a name.
 * A bad brand id or domain only loses the logo; a bad category is left blank,
 * which every builder files under 'other'.
 *
 * The logo the person chose rides along when there is one: letters win over a domain (as a saved
 * row's do), and neither param leaves the choice unmade, so the form saves no logo columns.
 */
export function readMerchantParams(fields: {
  name: string | undefined;
  brandId: string | undefined;
  domain: string | undefined;
  categoryId: string | undefined;
  logoDomain?: string | undefined;
  logoHidden?: string | undefined;
}): BrandSelection | null {
  const name = cleanName(fields.name);
  if (!name) return null;

  const chosen: Pick<BrandSelection, 'logoDomain' | 'logoHidden'> =
    fields.logoHidden === '1'
      ? { logoDomain: null, logoHidden: true }
      : isDomain(fields.logoDomain)
        ? { logoDomain: fields.logoDomain, logoHidden: false }
        : {};

  return {
    brandId: isId(fields.brandId) ? fields.brandId : null,
    name,
    domain: isDomain(fields.domain) ? fields.domain : null,
    categoryId: isId(fields.categoryId) ? fields.categoryId : '',
    ...chosen,
  };
}

export type BillPrefill = {
  issuer: BrandSelection | null;
  /** The name typed on the review page, if any. */
  name: string | null;
  /** A BILL_CATEGORIES id; with one, the form skips its category chooser. */
  categoryId: string | null;
  amount: string;
  startDate: Date | null;
  recurrence: VoiceCycle | null;
  sourceId: string;
  note: string;
};

const PREFILL_KEYS = [
  'prefillIssuer',
  'prefillBrandId',
  'prefillDomain',
  'prefillLogoDomain',
  'prefillLogoHidden',
  'prefillName',
  'prefillCategory',
  'prefillAmount',
  'prefillDate',
  'prefillCycle',
  'prefillSource',
  'prefillNote',
] as const;

const hasPrefill = (params: RouteParams) => PREFILL_KEYS.some((key) => param(params, key));

/** add-bill's prefill, field by field; null when none was sent. */
export function readBillPrefill(params: RouteParams): BillPrefill | null {
  if (!hasPrefill(params)) return null;
  const categoryId = param(params, 'prefillCategory');
  return {
    issuer: readMerchantParams({
      name: param(params, 'prefillIssuer'),
      brandId: param(params, 'prefillBrandId'),
      domain: param(params, 'prefillDomain'),
      // A bill's company never answers the category question; it carries the bill's own.
      categoryId: isBillCategory(categoryId) ? categoryId : undefined,
      logoDomain: param(params, 'prefillLogoDomain'),
      logoHidden: param(params, 'prefillLogoHidden'),
    }),
    name: cleanName(param(params, 'prefillName')),
    categoryId: isBillCategory(categoryId) ? categoryId : null,
    amount: readAmountParam(param(params, 'prefillAmount')),
    startDate: readDayParam(param(params, 'prefillDate')),
    recurrence: oneOf(CYCLES, param(params, 'prefillCycle')),
    sourceId: readSourceParam(param(params, 'prefillSource')),
    note: readNoteParam(param(params, 'prefillNote')),
  };
}

export type SubscriptionPrefill = {
  service: BrandSelection | null;
  amount: string;
  renewsOn: Date | null;
  cycle: VoiceCycle | null;
  sourceId: string;
  note: string;
};

/** add-subscription's prefill, field by field; null when none was sent. */
export function readSubscriptionPrefill(params: RouteParams): SubscriptionPrefill | null {
  if (!hasPrefill(params)) return null;
  return {
    service: readMerchantParams({
      name: param(params, 'prefillName'),
      brandId: param(params, 'prefillBrandId'),
      domain: param(params, 'prefillDomain'),
      categoryId: param(params, 'prefillCategory'),
      logoDomain: param(params, 'prefillLogoDomain'),
      logoHidden: param(params, 'prefillLogoHidden'),
    }),
    amount: readAmountParam(param(params, 'prefillAmount')),
    renewsOn: readDayParam(param(params, 'prefillDate')),
    cycle: oneOf(CYCLES, param(params, 'prefillCycle')),
    sourceId: readSourceParam(param(params, 'prefillSource')),
    note: readNoteParam(param(params, 'prefillNote')),
  };
}
