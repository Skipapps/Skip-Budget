import { act, renderHook } from '@testing-library/react-native';

import { buildBillValues, buildReceiptValues, buildSubscriptionValues } from '@/api/entry-values';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { parseVoice, type VoiceDraft } from '@/lib/voice';
import { DIRECTORY, TODAY } from '@/lib/voice/test-fixtures';
import {
  amountFromText,
  amountText,
  cameFromVoice,
  clearVoiceDraft,
  entryFromDraft,
  entryToBillInput,
  entryToForm,
  entryToReceiptInput,
  entryToSubscriptionInput,
  putVoiceDraft,
  readBillPrefill,
  readDayParam,
  readMerchantParams,
  readSubscriptionPrefill,
  readVoiceDraft,
  readVoiceEntry,
  rederiveVoiceEntry,
  updateVoiceEntry,
  useVoiceSession,
  validateVoiceDraft,
  validateVoiceEntry,
  voiceBillName,
  voiceSaveBlocker,
  type VoiceEntry,
} from '@/lib/voice-draft';

/**
 * The hand-over between the voice pages, and from them to the add forms. Everything that crosses is
 * re-checked: invalid values are blanked (a parser draft) or refused (the working copy), and a form
 * param is dropped rather than coerced.
 */

const NETFLIX = {
  brandId: 'netflix',
  name: 'Netflix',
  domain: 'netflix.com',
  categoryId: 'entertainment',
};

const draft = (patch: Partial<VoiceDraft> = {}): VoiceDraft => ({
  kind: 'subscription',
  kindSure: true,
  amount: 15.99,
  amountChoices: [],
  merchant: NETFLIX,
  merchantHeard: 'netflix',
  merchantSource: 'catalog',
  date: '2026-10-12',
  cycle: 'monthly',
  billCategoryId: null,
  score: 90,
  confidence: 'high',
  missing: [],
  transcript: 'Netflix 15.99 a month renews on the 12th',
  multiple: false,
  ...patch,
});

const entry = (patch: Partial<VoiceEntry> = {}): VoiceEntry => ({
  ...entryFromDraft(draft()),
  ...patch,
});

afterEach(() => clearVoiceDraft());

describe('validateVoiceDraft', () => {
  it('passes a good draft through unchanged', () => {
    expect(validateVoiceDraft(draft())).toEqual(draft());
  });

  it('refuses what is not a draft at all', () => {
    for (const bad of [null, undefined, 'receipt', 42, [], {}, { ...draft(), kind: 'salary' }]) {
      expect(validateVoiceDraft(bad)).toBeNull();
    }
  });

  it.each([0, -1, NaN, Infinity, 12.345, 1e12, '15.99', null])(
    'blanks an amount of %p',
    (amount) => {
      const checked = validateVoiceDraft({ ...draft(), amount });
      expect(checked?.amount).toBeNull();
      expect(checked?.missing).toContain('amount');
    },
  );

  it('keeps the largest amount the keypad can type, and cents', () => {
    expect(validateVoiceDraft(draft({ amount: 999999999.99 }))?.amount).toBe(999999999.99);
    expect(validateVoiceDraft(draft({ amount: 0.1 }))?.amount).toBe(0.1);
    expect(validateVoiceDraft(draft({ amount: 1030.5 }))?.amount).toBe(1030.5);
  });

  it.each(['2026-02-30', '2026-13-01', '1/10/2026', '2026-1-5', '0099-01-01', '', 20261001])(
    'blanks a date of %p',
    (date) => {
      expect(validateVoiceDraft({ ...draft(), date })?.date).toBeNull();
    },
  );

  it('keeps a leap day only in a leap year', () => {
    expect(validateVoiceDraft(draft({ date: '2028-02-29' }))?.date).toBe('2028-02-29');
    expect(validateVoiceDraft(draft({ date: '2027-02-29' }))?.date).toBeNull();
  });

  it('blanks a cycle or bill category outside its list', () => {
    const checked = validateVoiceDraft({
      ...draft({ kind: 'bill' }),
      cycle: 'daily',
      billCategoryId: 'gym',
    });
    expect(checked?.cycle).toBeNull();
    expect(checked?.billCategoryId).toBeNull();
    expect(checked?.missing).toEqual(expect.arrayContaining(['cycle', 'category']));
  });

  it('offers amount choices only when two or more good ones are left', () => {
    expect(validateVoiceDraft(draft({ amountChoices: [12.5] }))?.amountChoices).toEqual([]);
    expect(validateVoiceDraft(draft({ amountChoices: [12.5, 12.345] }))?.amountChoices).toEqual([]);
    expect(validateVoiceDraft(draft({ amountChoices: [12.5, 12.5] }))?.amountChoices).toEqual([]);
    expect(
      validateVoiceDraft({ ...draft(), amountChoices: [12.5, 'x', 1250] })?.amountChoices,
    ).toEqual([12.5, 1250]);
  });

  it('keeps the parser’s amount beside choices that all survive', () => {
    const checked = validateVoiceDraft(draft({ amount: 12.5, amountChoices: [12.5, 1250] }));
    expect(checked?.amount).toBe(12.5);
    expect(checked?.amountChoices).toEqual([12.5, 1250]);
    expect(checked?.missing).toContain('amount');
  });

  // "$40 or $4,000,000,000,000" must not open as a settled $40.
  it('never settles an amount whose choices did not all survive', () => {
    const outOfRange = validateVoiceDraft(
      draft({ amount: 40, amountChoices: [40, 4_000_000_000_000] }),
    );
    expect(outOfRange?.amount).toBeNull();
    expect(outOfRange?.amountChoices).toEqual([]);
    expect(outOfRange?.missing).toContain('amount');

    const oneOfThree = validateVoiceDraft(
      draft({ amount: 12.5, amountChoices: [12.5, 1250, 12.345] }),
    );
    expect(oneOfThree?.amount).toBeNull();
    expect(oneOfThree?.amountChoices).toEqual([12.5, 1250]);
    expect(oneOfThree?.missing).toContain('amount');

    for (const amountChoices of [[12.5], [12.5, 12.5], [12.5, 'x']]) {
      const checked = validateVoiceDraft({ ...draft({ amount: 12.5 }), amountChoices });
      expect(checked?.amount).toBeNull();
      expect(checked?.missing).toContain('amount');
    }
  });

  it('leaves unsettled whatever the parser left unsettled', () => {
    const ctx = { today: TODAY, directory: DIRECTORY, aliases: {} };
    for (const alternatives of [
      ['Target $40', 'Target $4,000,000,000,000'],
      ['twelve fifty at Starbucks'],
      ['Spent 12:50 at Starbucks'],
    ]) {
      const parsed = parseVoice(alternatives, ctx);
      const checked = validateVoiceDraft(parsed);
      if (parsed.missing.includes('amount')) expect(checked?.missing).toContain('amount');
    }
  });

  it('carries the several-transactions flag, false unless it is exactly true', () => {
    expect(validateVoiceDraft(draft({ multiple: true }))?.multiple).toBe(true);
    expect(validateVoiceDraft(draft({ multiple: false }))?.multiple).toBe(false);
    for (const multiple of ['true', 1, null, undefined]) {
      expect(validateVoiceDraft({ ...draft(), multiple })?.multiple).toBe(false);
    }
  });

  it('carries where the merchant came from, and nothing for no merchant', () => {
    for (const merchantSource of ['learned', 'catalog', 'fuzzy', 'heard'] as const) {
      expect(validateVoiceDraft(draft({ merchantSource }))?.merchantSource).toBe(merchantSource);
    }
    for (const merchantSource of ['alias', 'exact', 5, undefined]) {
      const checked = validateVoiceDraft({ ...draft(), merchantSource });
      expect(checked?.merchant).toEqual(NETFLIX);
      expect(checked?.merchantSource).toBeNull();
    }
    expect(
      validateVoiceDraft(draft({ merchant: null, merchantSource: 'catalog' }))?.merchantSource,
    ).toBeNull();
    expect(
      validateVoiceDraft({ ...draft(), merchant: { ...NETFLIX, name: '' } })?.merchantSource,
    ).toBeNull();
  });

  it('drops a merchant with a field of the wrong type, and its heard words with it', () => {
    const checked = validateVoiceDraft({ ...draft(), merchant: { ...NETFLIX, name: 7 } });
    expect(checked?.merchant).toBeNull();
    expect(checked?.merchantHeard).toBeNull();
    expect(checked?.missing).toContain('merchant');
    expect(
      validateVoiceDraft({ ...draft(), merchant: { ...NETFLIX, brandId: 3 } })?.merchant,
    ).toBeNull();
  });

  it('works out what is missing instead of trusting it', () => {
    expect(validateVoiceDraft(draft({ missing: ['amount', 'date'] }))?.missing).toEqual([]);
    expect(
      validateVoiceDraft(draft({ kind: 'bill', date: null, cycle: null, missing: [] }))?.missing,
    ).toEqual(['date', 'cycle', 'category']);
  });

  it('agrees with the parser on every draft it makes', () => {
    const ctx = { today: TODAY, directory: DIRECTORY, aliases: {} };
    const sentences = [
      ['Spent 45 bucks at Walmart yesterday'],
      ['Netflix 15.99 a month'],
      ['electric bill 120 due on the 15th'],
      ['twelve fifty at Starbucks'],
      ['Comcast forty, no, fifty'],
      ['rent 1,800 due on the first monthly'],
      ['I bought something'],
      [''],
    ];
    for (const alternatives of sentences) {
      const parsed = parseVoice(alternatives, ctx);
      expect(validateVoiceDraft(parsed)).toEqual(parsed);
    }
  });
});

describe('the slot', () => {
  it('hands the draft to the id it was stored under, and to no other', () => {
    const id = putVoiceDraft(draft());
    expect(readVoiceDraft(id)).toEqual(draft());
    expect(readVoiceDraft('v-stale')).toBeNull();
    expect(readVoiceDraft(undefined)).toBeNull();
  });

  it('holds one draft at a time', () => {
    const first = putVoiceDraft(draft());
    const second = putVoiceDraft(draft({ amount: 9.99 }));
    expect(first).not.toBe(second);
    expect(readVoiceDraft(first)).toBeNull();
    expect(readVoiceDraft(second)?.amount).toBe(9.99);
  });

  it('stores nothing for a draft that fails, so the review page starts again', () => {
    const id = putVoiceDraft({ kind: 'salary' } as unknown as VoiceDraft);
    expect(readVoiceDraft(id)).toBeNull();
    expect(readVoiceEntry(id)).toBeNull();
  });

  it('is empty after a save', () => {
    const id = putVoiceDraft(draft());
    clearVoiceDraft();
    expect(readVoiceDraft(id)).toBeNull();
    expect(readVoiceEntry(id)).toBeNull();
  });

  it('hands out copies, so changing one changes nothing', () => {
    const id = putVoiceDraft(draft());
    const copy = readVoiceEntry(id)!;
    copy.amount = 1;
    copy.merchant!.name = 'Hacked';
    expect(readVoiceEntry(id)?.amount).toBe(15.99);
    expect(readVoiceEntry(id)?.merchant?.name).toBe('Netflix');
  });
});

describe('the working copy', () => {
  it('opens on what was heard, with an ambiguous amount left unpicked', () => {
    expect(entryFromDraft(draft())).toEqual({
      kind: 'subscription',
      amount: 15.99,
      amountChoices: [],
      merchant: NETFLIX,
      billName: null,
      date: '2026-10-12',
      cycle: 'monthly',
      billCategoryId: null,
      sourceId: null,
    });
    const ambiguous = entryFromDraft(draft({ amount: 12.5, amountChoices: [12.5, 1250] }));
    expect(ambiguous.amount).toBeNull();
    expect(ambiguous.amountChoices).toEqual([12.5, 1250]);
  });

  it('takes an edit, and remembers which fields were changed by hand', () => {
    const id = putVoiceDraft(draft());
    const next = updateVoiceEntry(id, { date: '2026-11-01', sourceId: 'card-1' });
    expect(next).toMatchObject({ date: '2026-11-01', sourceId: 'card-1' });
    expect(readVoiceEntry(id)).toEqual(next);
  });

  it('refuses an invalid edit whole, and writes nothing', () => {
    const id = putVoiceDraft(draft());
    for (const patch of [
      { amount: 12.345 },
      { amount: 0 },
      { date: '2026-02-30' },
      { cycle: 'daily' },
      { billCategoryId: 'gym' },
      { kind: 'salary' },
      { sourceId: 'not an id!' },
      { billName: '   ' },
      { merchant: { ...NETFLIX, name: '' } },
    ] as Partial<VoiceEntry>[]) {
      expect(updateVoiceEntry(id, { sourceId: 'card-1', ...patch })).toBeNull();
    }
    expect(readVoiceEntry(id)).toEqual(entryFromDraft(draft()));
    expect(updateVoiceEntry('v-stale', { amount: 5 })).toBeNull();
  });

  it('settles the choices when an amount is picked', () => {
    const id = putVoiceDraft(draft({ amountChoices: [12.5, 1250] }));
    expect(readVoiceEntry(id)?.amount).toBeNull();
    expect(updateVoiceEntry(id, { amount: 1250 })).toMatchObject({
      amount: 1250,
      amountChoices: [],
    });
  });

  it('re-reads untouched fields for a new kind and keeps what was changed by hand', () => {
    const id = putVoiceDraft(draft({ kind: 'receipt', cycle: null, date: '2026-09-28' }));
    updateVoiceEntry(id, { kind: 'bill', amount: 20 });
    const reparsed = draft({
      kind: 'bill',
      amount: 15.99,
      date: '2026-10-28',
      cycle: 'monthly',
      billCategoryId: 'internet',
    });
    expect(rederiveVoiceEntry(id, reparsed)).toMatchObject({
      kind: 'bill',
      amount: 20,
      date: '2026-10-28',
      cycle: 'monthly',
      billCategoryId: 'internet',
    });
    expect(readVoiceDraft(id)?.kind).toBe('bill');
    expect(rederiveVoiceEntry('v-stale', reparsed)).toBeNull();
  });

  const XFINITY = { brandId: 'xfinity', name: 'Xfinity', domain: 'xfinity.com', categoryId: 'x' };
  const WALMART = { brandId: 'walmart', name: 'Walmart', domain: 'walmart.com', categoryId: 's' };

  it('keeps the parse’s merchant evidence when the person changes the merchant', async () => {
    const id = putVoiceDraft(draft({ merchantHeard: 'netflix', merchantSource: 'catalog' }));
    updateVoiceEntry(id, { merchant: WALMART });

    expect(readVoiceEntry(id)?.merchant).toEqual(WALMART);
    expect(readVoiceDraft(id)).toMatchObject({
      merchant: NETFLIX,
      merchantHeard: 'netflix',
      merchantSource: 'catalog',
    });
    const { result } = await renderHook(() => useVoiceSession(id));
    expect(result.current?.draft.merchantSource).toBe('catalog');
    expect(result.current?.touched).toContain('merchant');
    expect(result.current?.edited).toBe(true);
  });

  it('takes the re-parse’s merchant evidence when the merchant was left alone', () => {
    const id = putVoiceDraft(draft({ merchantSource: 'catalog' }));
    const reparsed = draft({
      kind: 'bill',
      merchant: XFINITY,
      merchantHeard: 'comcast',
      merchantSource: 'fuzzy',
    });
    expect(rederiveVoiceEntry(id, reparsed)?.merchant).toEqual(XFINITY);
    expect(readVoiceDraft(id)).toMatchObject({
      kind: 'bill',
      merchant: XFINITY,
      merchantHeard: 'comcast',
      merchantSource: 'fuzzy',
    });
  });

  it('keeps the original merchant evidence together through a re-parse after a hand change', () => {
    const id = putVoiceDraft(draft({ merchantHeard: 'netflix', merchantSource: 'catalog' }));
    updateVoiceEntry(id, { merchant: WALMART });
    const reparsed = draft({
      kind: 'bill',
      merchant: XFINITY,
      merchantHeard: 'comcast',
      merchantSource: 'fuzzy',
      billCategoryId: 'internet',
    });

    expect(rederiveVoiceEntry(id, reparsed)).toMatchObject({
      kind: 'bill',
      merchant: WALMART,
      billCategoryId: 'internet',
    });
    expect(readVoiceDraft(id)).toMatchObject({
      kind: 'bill',
      merchant: NETFLIX,
      merchantHeard: 'netflix',
      merchantSource: 'catalog',
      billCategoryId: 'internet',
    });
  });

  it('never pairs a missing merchant with a source after a re-parse', () => {
    const id = putVoiceDraft(draft({ merchant: null, merchantHeard: null, merchantSource: null }));
    updateVoiceEntry(id, { merchant: WALMART });
    rederiveVoiceEntry(id, draft({ kind: 'bill', merchantSource: 'catalog' }));
    expect(readVoiceDraft(id)).toMatchObject({
      merchant: null,
      merchantHeard: null,
      merchantSource: null,
    });
  });

  it('refuses a working copy with anything out of place', () => {
    expect(validateVoiceEntry(entry())).toEqual(entry());
    expect(validateVoiceEntry({ ...entry(), amountChoices: [12.5] })).toBeNull();
    expect(validateVoiceEntry({ ...entry(), amountChoices: 'x' })).toBeNull();
    expect(validateVoiceEntry(null)).toBeNull();
  });
});

describe('useVoiceSession', () => {
  it('re-renders on every write, and is null for a stale id', async () => {
    const id = putVoiceDraft(draft());
    const { result } = await renderHook(() => useVoiceSession(id));
    expect(result.current?.entry.amount).toBe(15.99);
    expect(result.current?.edited).toBe(false);

    await act(() => {
      updateVoiceEntry(id, { amount: 9.99 });
    });
    expect(result.current?.entry.amount).toBe(9.99);
    expect(result.current?.edited).toBe(true);
    expect(result.current?.touched).toEqual(['amount', 'amountChoices']);
    expect(Object.isFrozen(result.current?.entry)).toBe(true);

    await act(() => {
      clearVoiceDraft();
    });
    expect(result.current).toBeNull();
  });

  it('gives nothing to a page holding an old id', async () => {
    putVoiceDraft(draft());
    const { result } = await renderHook(() => useVoiceSession('v-old'));
    expect(result.current).toBeNull();
  });
});

describe('amounts as the pages show them', () => {
  it.each([
    [12.5, '12.50'],
    [1250, '1250.00'],
    [0.1, '0.10'],
    [15.99, '15.99'],
    [1030.5, '1030.50'],
    [999999999.99, '999999999.99'],
    [null, ''],
    [12.345, ''],
  ])('prints %p as %p', (amount, text) => {
    expect(amountText(amount)).toBe(text);
  });

  it('reads back only what the keypad could have typed', () => {
    expect(amountFromText('12.50')).toBe(12.5);
    expect(amountFromText('1100')).toBe(1100);
    for (const bad of ['', '0', '1e3', '-5', '12.345', '1,800', '1234567890', ' 5']) {
      expect(amountFromText(bad)).toBeNull();
    }
  });
});

describe('voiceSaveBlocker', () => {
  it('asks for the amount choice first, then a bill’s category', () => {
    expect(voiceSaveBlocker(entry({ amount: null, amountChoices: [12.5, 1250] }))).toBe(
      'Pick the amount you meant.',
    );
    expect(voiceSaveBlocker(entry({ kind: 'bill', billCategoryId: null }))).toBe(
      'Pick what the bill is for.',
    );
    expect(voiceSaveBlocker(entry({ kind: 'bill', billCategoryId: 'internet' }))).toBeNull();
    expect(voiceSaveBlocker(entry({ amount: null }))).toBeNull();
  });

  it('asks in the language on screen', () => {
    resetLocaleForTests();
    setLanguage('es');
    expect(voiceSaveBlocker(entry({ amount: null, amountChoices: [12.5, 1250] }))).toBe(
      'Elige el importe que quisiste decir.',
    );
    setLanguage('fr');
    expect(voiceSaveBlocker(entry({ kind: 'bill', billCategoryId: null }))).toBe(
      'Choisis à quoi correspond la facture.',
    );
    resetLocaleForTests();
  });
});

describe('into the builders', () => {
  const SOURCES = [{ id: 'card-1', kind: 'card' as const }];

  it('saves a voice receipt as voice, dated today when no day was heard', () => {
    const built = buildReceiptValues(
      entryToReceiptInput(
        entry({ kind: 'receipt', date: null, sourceId: 'card-1' }),
        new Date(2026, 9, 1),
      ),
      SOURCES,
    );
    expect(built).toEqual({
      ok: true,
      values: {
        brand_id: 'netflix',
        merchant: 'Netflix',
        amount: 15.99,
        purchased_on: '2026-10-01',
        category_id: 'entertainment',
        card_id: 'card-1',
        bank_account_id: null,
        note: null,
        source: 'voice',
        image_path: null,
      },
    });
  });

  it('says what a voice receipt is missing in the form’s words', () => {
    expect(
      buildReceiptValues(entryToReceiptInput(entry({ merchant: null }), new Date()), SOURCES),
    ).toMatchObject({ ok: false, message: 'Pick a store first.' });
    expect(
      buildReceiptValues(entryToReceiptInput(entry({ amount: null }), new Date()), SOURCES),
    ).toMatchObject({ ok: false, message: 'Enter how much you spent.' });
  });

  it('saves a voice bill under its company, monthly unless said, reminder-free', () => {
    const bill = entry({
      kind: 'bill',
      merchant: {
        brandId: 'xfinity',
        name: 'Xfinity',
        domain: 'xfinity.com',
        categoryId: 'telecom',
      },
      billCategoryId: 'internet',
      cycle: null,
      date: '2026-10-15',
      amount: 1030.5,
    });
    expect(
      buildBillValues(entryToBillInput(bill, 'Internet'), {
        sources: SOURCES,
        lastChargedOn: null,
      }),
    ).toEqual({
      ok: true,
      values: {
        name: 'Xfinity',
        amount: 1030.5,
        brand_id: 'xfinity',
        category_id: 'internet',
        icon_id: null,
        recurrence: 'monthly',
        next_due_on: '2026-10-15',
        starts_on: '2026-10-15',
        ends_on: null,
        card_id: null,
        bank_account_id: null,
        note: null,
      },
    });
  });

  it('names a voice bill: typed, else the company, else the category', () => {
    const bill = entry({ kind: 'bill', merchant: null, billCategoryId: 'housing' });
    expect(voiceBillName(bill, 'Housing')).toBe('Housing');
    expect(voiceBillName({ ...bill, billCategoryId: 'other' }, 'Other bill')).toBe('');
    expect(voiceBillName({ ...bill, billName: 'Flat rent' }, 'Housing')).toBe('Flat rent');
    expect(
      buildBillValues(entryToBillInput({ ...bill, date: null }, 'Housing'), {
        sources: [],
        lastChargedOn: null,
      }),
    ).toMatchObject({ ok: false, field: 'when', message: 'Pick the first due date.' });
  });

  it('saves a voice subscription with or without a renewal date', () => {
    const ctx = { sources: SOURCES, lastChargedOn: null, countsFrom: null };
    expect(buildSubscriptionValues(entryToSubscriptionInput(entry()), ctx)).toMatchObject({
      ok: true,
      values: {
        name: 'Netflix',
        amount: 15.99,
        cycle: 'monthly',
        next_renewal_on: '2026-10-12',
        started_on: '2026-10-12',
        active: true,
      },
    });
    expect(
      buildSubscriptionValues(entryToSubscriptionInput(entry({ date: null, cycle: null })), ctx),
    ).toMatchObject({
      ok: true,
      values: { next_renewal_on: null, started_on: null, cycle: 'monthly' },
    });
  });
});

describe('out to a form and back', () => {
  it('sends a receipt on the scan keys, marked as voice', () => {
    expect(entryToForm(entry({ kind: 'receipt', sourceId: 'card-1' }))).toEqual({
      pathname: '/add-receipt',
      params: {
        from: 'voice',
        scannedVia: 'voice',
        scannedStore: 'Netflix',
        scannedBrandId: 'netflix',
        scannedDomain: 'netflix.com',
        scannedCategory: 'entertainment',
        scannedAmount: '15.99',
        scannedDate: '2026-10-12',
        scannedSource: 'card-1',
      },
    });
  });

  it('round-trips a bill through its params', () => {
    const bill = entry({
      kind: 'bill',
      merchant: {
        brandId: 'xfinity',
        name: 'Xfinity',
        domain: 'xfinity.com',
        categoryId: 'telecom',
      },
      billName: 'Internet at the flat',
      billCategoryId: 'internet',
      cycle: 'yearly',
      amount: 1030.5,
      sourceId: 'acct-1',
    });
    const { pathname, params } = entryToForm(bill);
    expect(pathname).toBe('/add-bill');
    expect(cameFromVoice(params)).toBe(true);
    expect(readBillPrefill(params)).toEqual({
      issuer: {
        brandId: 'xfinity',
        name: 'Xfinity',
        domain: 'xfinity.com',
        categoryId: 'internet',
      },
      name: 'Internet at the flat',
      categoryId: 'internet',
      amount: '1030.50',
      startDate: new Date(2026, 9, 12),
      recurrence: 'yearly',
      sourceId: 'acct-1',
    });
  });

  it('round-trips a subscription through its params', () => {
    const { pathname, params } = entryToForm(entry({ sourceId: 'card-1' }));
    expect(pathname).toBe('/add-subscription');
    expect(readSubscriptionPrefill(params)).toEqual({
      service: NETFLIX,
      amount: '15.99',
      renewsOn: new Date(2026, 9, 12),
      cycle: 'monthly',
      sourceId: 'card-1',
    });
  });

  it('sends only what is set', () => {
    const { params } = entryToForm(
      entry({ merchant: null, amount: null, date: null, cycle: null, sourceId: null }),
    );
    expect(params).toEqual({ from: 'voice' });
    expect(readSubscriptionPrefill(params)).toBeNull();
  });

  it('drops every bad param to blank and never coerces one', () => {
    const garbage = {
      from: ['voice', 'voice'],
      prefillIssuer: '   ',
      prefillName: 'x'.repeat(201),
      prefillBrandId: 'drop table;',
      prefillDomain: 'not a domain',
      prefillCategory: 'gym',
      prefillAmount: '12.345',
      prefillDate: '2026-02-30',
      prefillCycle: 'daily',
      prefillSource: '../etc',
    };
    expect(cameFromVoice(garbage)).toBe(false);
    expect(readBillPrefill(garbage)).toEqual({
      issuer: null,
      name: null,
      categoryId: null,
      amount: '',
      startDate: null,
      recurrence: null,
      sourceId: '',
    });
    // A subscription's category is a spend category (any well-formed slug);
    // only a bill's must be one of the ten.
    expect(
      readSubscriptionPrefill({ ...garbage, prefillName: 'Gym', prefillCategory: 'not a slug!' }),
    ).toEqual({
      service: { brandId: null, name: 'Gym', domain: null, categoryId: '' },
      amount: '',
      renewsOn: null,
      cycle: null,
      sourceId: '',
    });
    expect(readBillPrefill({ id: 'bill-1' })).toBeNull();
  });

  it('reads a day param at local midnight, the way the forms hold dates', () => {
    expect(readDayParam('2026-10-05')).toEqual(new Date(2026, 9, 5));
    expect(readDayParam('2026-10-5')).toBeNull();
    expect(readDayParam(undefined)).toBeNull();
  });

  it('reads a merchant only with a name, and keeps a good logo', () => {
    expect(
      readMerchantParams({
        name: undefined,
        brandId: 'netflix',
        domain: undefined,
        categoryId: undefined,
      }),
    ).toBeNull();
    expect(
      readMerchantParams({
        name: ' Netflix ',
        brandId: 'netflix',
        domain: 'netflix.com',
        categoryId: 'entertainment',
      }),
    ).toEqual(NETFLIX);
  });
});
