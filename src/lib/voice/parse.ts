/**
 * parseVoice: up to three recogniser guesses in, one draft out.
 *
 * No AI, no network: every step is a small rule module in this folder.
 *
 *   clean → learned aliases → exact merchants → dates → cycles → amounts →
 *   fuzzy and typed merchants → payment methods set aside → category words →
 *   corrections → kind → amount choice → date direction → bill category →
 *   several transactions? → score
 *
 * The order of the claiming steps is the point. A merchant with a number in
 * it ("7-Eleven", "24 Hour Fitness") is claimed before amounts; a date's
 * numbers ("the 5th", "October 3 2026") and a cycle's ("every 3 months")
 * before amounts too, so "rent 1800 on the 1st" has one amount and one day.
 *
 * Each guess is parsed alone. The best score wins and a tie goes to the
 * earlier guess. If guesses that tie with the winner heard *different*
 * amounts ("forty" against "forty five"), every amount they heard is offered
 * as a choice: the parser cannot tell them apart, so the person picks.
 *
 * Never throws. A guess that trips anything unexpected becomes an empty
 * draft for that guess, so voice can never take the app down.
 */
import { fromCents } from '@/lib/money';

import { chooseAmount, findAmounts, type AmountCandidate } from './amount';
import {
  categoryFromBrand,
  categoryFromWords,
  findCategoryWords,
  type CategorySpan,
} from './bill-category';
import { tokenize, type Token } from './clean';
import { overruledSpans, type Slot, type SlotSpan } from './corrections';
import { findCycles, type CycleSpan } from './cycle';
import { datesRunBackward, findDates, resolveDate, type DateSpan } from './date';
import { decideKind, leanOfCategory } from './kind';
import {
  findExactMerchants,
  findFuzzyMerchants,
  findLearnedMerchants,
  findTypedMerchants,
  introducedWithAt,
  isPaymentMethod,
  pickMerchant,
  preferCatalog,
  type MerchantSpan,
} from './merchant';
import { describesSeveral } from './multiple';
import { confidenceOf, missingOf, scoreOf } from './score';
import type { BrandRow, VoiceContext, VoiceDraft, VoiceKind } from './types';
import { isPlainWord } from './words';

type Parsed = {
  draft: VoiceDraft;
  /** Cents this guess heard: its choices, or its one amount. */
  heardCents: number[];
};

type Claim = 'merchant' | 'date' | 'cycle' | 'amount';

const KINDS: VoiceKind[] = ['receipt', 'bill', 'subscription'];

function finish(fields: Omit<VoiceDraft, 'score' | 'confidence' | 'missing'>): VoiceDraft {
  const score = scoreOf(fields);
  const missing = missingOf(fields);
  return { ...fields, score, confidence: confidenceOf(score, fields.amount, missing), missing };
}

function emptyDraft(transcript: string, forceKind: VoiceKind | undefined): VoiceDraft {
  return finish({
    kind: forceKind ?? 'receipt',
    kindSure: forceKind !== undefined,
    amount: null,
    amountChoices: [],
    merchant: null,
    merchantHeard: null,
    merchantSource: null,
    date: null,
    cycle: null,
    billCategoryId: null,
    transcript,
    multiple: false,
  });
}

type Context = {
  today: string;
  directory: BrandRow[];
  aliases: Record<string, string>;
  forceKind: VoiceKind | undefined;
};

type Range = { start: number; end: number };

function parseOne(transcript: string, ctx: Context): Parsed {
  const tokens: Token[] = tokenize(transcript);
  const claims: (Claim | null)[] = new Array(tokens.length).fill(null);
  const free = (index: number) => index >= 0 && index < tokens.length && claims[index] === null;
  const claim = (span: { start: number; end: number }, as: Claim) => {
    for (let index = span.start; index < span.end; index += 1) claims[index] = as;
  };
  const claimedSoFar = () => claims.map((owner) => owner !== null);

  // Merchants the person taught Skip and exact directory names, read over the
  // same words; where they overlap the catalog keeps its own names.
  const merchants: MerchantSpan[] = [];
  for (const span of preferCatalog(
    findLearnedMerchants(tokens, ctx.aliases, ctx.directory, free),
    findExactMerchants(tokens, ctx.directory, free),
  )) {
    merchants.push(span);
    claim(span, 'merchant');
  }

  const dates: DateSpan[] = findDates(tokens, claimedSoFar());
  dates.forEach((span) => claim(span, 'date'));
  const cycles: CycleSpan[] = findCycles(tokens, claimedSoFar());
  cycles.forEach((span) => claim(span, 'cycle'));
  const amounts: AmountCandidate[] = findAmounts(tokens, claimedSoFar());
  amounts.forEach((span) => claim(span, 'amount'));

  for (const span of findFuzzyMerchants(tokens, ctx.directory, free)) {
    merchants.push(span);
    claim(span, 'merchant');
  }
  for (const span of findTypedMerchants(tokens, free)) {
    merchants.push(span);
    claim(span, 'merchant');
  }

  // A card or wallet named as how it was paid ("on my Amex", "with Apple Pay")
  // keeps its words, but is never the merchant (see isPaymentMethod).
  const payees = merchants.filter((span) => !isPaymentMethod(tokens, span));

  // Category words may sit inside a merchant's name ("Farmers Insurance") but
  // not inside a number, a date or a cycle.
  const categories: CategorySpan[] = findCategoryWords(
    tokens,
    (index) => claims[index] === null || claims[index] === 'merchant',
  );
  const insideMerchant = (span: CategorySpan) =>
    claims.slice(span.start, span.end).some((owner) => owner === 'merchant');

  // Corrections, slot by slot.
  const slotted = new Map<SlotSpan, Range>();
  const add = (slot: Slot, sources: readonly Range[]) => {
    for (const source of sources)
      slotted.set({ slot, start: source.start, end: source.end }, source);
  };
  add('amount', amounts);
  add('date', dates);
  add('merchant', payees);
  add('cycle', cycles);
  add(
    'category',
    categories.filter((span) => !insideMerchant(span)),
  );
  const dropped = new Set<Range>();
  for (const span of overruledSpans(tokens, [...slotted.keys()])) {
    dropped.add(slotted.get(span) as Range);
  }
  const live = <T extends Range>(spans: T[]) => spans.filter((span) => !dropped.has(span));

  const liveMerchants = live(payees);
  const liveCategories = live(categories);
  const liveCycles = live(cycles);
  const liveDates = live(dates);
  const liveAmounts = live(amounts);

  const chosen = pickMerchant(liveMerchants);
  const merchant = chosen ? chosen.merchant : null;

  const inCategory = new Array<boolean>(tokens.length).fill(false);
  for (const span of liveCategories) {
    for (let index = span.start; index < span.end; index += 1) inCategory[index] = true;
  }

  const decided = ctx.forceKind
    ? { kind: ctx.forceKind, sure: true }
    : decideKind(tokens, {
        categorySignals: liveCategories.map((span) => span.signal),
        recurring: liveCycles.length > 0,
        brandLean: leanOfCategory(chosen ? chosen.brandCategory : null),
        atMerchant: chosen !== null && introducedWithAt(tokens, chosen),
        inCategoryPhrase: (index) => inCategory[index],
      });
  const kind = decided.kind;

  // A bare number followed by a noun may be a count: "2 pizzas".
  const isNoun = (index: number) => claims[index] === null && isPlainWord(tokens[index]);
  const amount = chooseAmount(liveAmounts, kind, isNoun, tokens);

  const dateSpan = liveDates[0];
  const date = dateSpan
    ? resolveDate(dateSpan.spec, datesRunBackward(tokens, kind), ctx.today)
    : null;

  const cycle = kind !== 'receipt' && liveCycles.length > 0 ? liveCycles[0].cycle : null;

  const brand =
    chosen && chosen.merchant.brandId !== null
      ? { id: chosen.merchant.brandId, category_id: chosen.brandCategory ?? '' }
      : null;
  const billCategoryId =
    kind === 'bill' ? (categoryFromWords(liveCategories) ?? categoryFromBrand(brand)) : null;

  const multiple = describesSeveral({
    tokens,
    merchants: liveMerchants,
    categories: liveCategories,
    amounts: liveAmounts,
    isCount: isNoun,
  });

  const draft = finish({
    kind,
    kindSure: decided.sure,
    amount: amount.cents === null ? null : fromCents(amount.cents),
    amountChoices: amount.choices.map(fromCents),
    merchant,
    merchantHeard: chosen ? chosen.heard : null,
    merchantSource: chosen ? chosen.source : null,
    date,
    cycle,
    billCategoryId,
    transcript,
    multiple,
  });

  return {
    draft,
    heardCents:
      amount.choices.length > 0 ? amount.choices : amount.cents === null ? [] : [amount.cents],
  };
}

function normaliseContext(ctx: VoiceContext | null | undefined): Context {
  const forceKind = ctx && KINDS.includes(ctx.forceKind as VoiceKind) ? ctx.forceKind : undefined;
  return {
    today: ctx && typeof ctx.today === 'string' ? ctx.today : '',
    directory: (ctx && Array.isArray(ctx.directory) ? ctx.directory : []) as BrandRow[],
    aliases: ctx && ctx.aliases && typeof ctx.aliases === 'object' ? ctx.aliases : {},
    forceKind,
  };
}

/** See the module comment. `alternatives` are the recogniser's guesses, best first. */
export function parseVoice(alternatives: string[], ctx: VoiceContext): VoiceDraft {
  const context = normaliseContext(ctx);
  const heard = (Array.isArray(alternatives) ? alternatives : []).filter(
    (alternative): alternative is string => typeof alternative === 'string',
  );
  if (heard.length === 0) return emptyDraft('', context.forceKind);

  const parsed: Parsed[] = heard.map((transcript) => {
    try {
      return parseOne(transcript, context);
    } catch {
      return { draft: emptyDraft(transcript, context.forceKind), heardCents: [] };
    }
  });

  let winner = parsed[0];
  for (const candidate of parsed) {
    if (candidate.draft.score > winner.draft.score) winner = candidate;
  }

  // Guesses the score cannot separate, that heard different amounts.
  const tied = parsed.filter(
    (candidate) => candidate.draft.score === winner.draft.score && candidate.heardCents.length > 0,
  );
  const everyAmount = [...new Set(tied.flatMap((candidate) => candidate.heardCents))].sort(
    (a, b) => a - b,
  );
  if (winner.draft.amount === null || everyAmount.length <= winner.heardCents.length) {
    return winner.draft;
  }
  const { draft } = winner;
  return finish({
    kind: draft.kind,
    kindSure: draft.kindSure,
    amount: draft.amount,
    amountChoices: everyAmount.map(fromCents),
    merchant: draft.merchant,
    merchantHeard: draft.merchantHeard,
    merchantSource: draft.merchantSource,
    date: draft.date,
    cycle: draft.cycle,
    billCategoryId: draft.billCategoryId,
    transcript: draft.transcript,
    multiple: draft.multiple,
  });
}
