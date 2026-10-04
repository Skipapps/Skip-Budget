import {
  billGlyph,
  chargePayload,
  digestPayload,
  logoUrl,
  money,
  noticePayload,
  receiptsPayload,
  reminderPayload,
  shortDate,
  sourceName,
  splitBody,
} from '../../../supabase/functions/send-push/card';

/**
 * The card a notification carries: what the press-and-hold view shows, the
 * picture on the right, and where "View" lands. Built by the push sender from
 * the reminder or charge, so a mistake here reaches every phone at once.
 */

const BASE = 'https://project.supabase.co';
const AMEX = { kind: 'card' as const, network: 'Amex', last4: '1004' };
const CHECKING = {
  kind: 'account' as const,
  bank_name: 'Chase',
  nickname: 'Everyday',
  last4: null,
};

describe('formatting', () => {
  it('writes money the way the app does', () => {
    expect(money(1500)).toBe('$1,500.00');
    expect(money(-15.49)).toBe('$15.49');
  });

  it('builds the public URL of a stored logo', () => {
    expect(logoUrl(BASE, 'v1/netflix.png')).toBe(
      `${BASE}/storage/v1/object/public/brand-logos/v1/netflix.png`,
    );
    expect(logoUrl(BASE, null)).toBeUndefined();
  });

  it('splits a reminder body into its pill and its figure', () => {
    expect(splitBody('Renews tomorrow · $15.49')).toEqual({
      when: 'Renews tomorrow',
      amount: '$15.49',
    });
    expect(splitBody('Your pay lands today')).toEqual({ when: 'Your pay lands today' });
  });

  it('names a card or account the way the pickers do', () => {
    expect(sourceName(AMEX)).toBe('Amex ••1004');
    expect(sourceName(CHECKING)).toBe('Everyday');
    expect(sourceName(null)).toBeUndefined();
  });

  it('reads a date without a time zone', () => {
    expect(shortDate('2026-10-03')).toBe('3 Oct');
  });

  it('gives a bill the icon somebody picked, else its category', () => {
    expect(billGlyph('housing', null)).toBe('housing');
    expect(billGlyph('housing', 'other')).toBe('housing');
    expect(billGlyph('other', 'pets')).toBe('pets');
  });
});

describe('reminders', () => {
  it('shows a subscription with its logo, amount, renewal and card', () => {
    const payload = reminderPayload(
      {
        kind: 'subscription',
        title: 'Netflix',
        body: 'Renews tomorrow · $15.49',
        targetId: 'sub-1',
        logoPath: 'v1/netflix.png',
        categoryId: 'entertainment',
        payer: AMEX,
      },
      BASE,
    );

    expect(payload.route).toBe('/subscription');
    expect(payload.id).toBe('sub-1');
    expect(payload.card).toMatchObject({
      kind: 'subscription',
      title: 'Netflix',
      amount: '$15.49',
      when: 'Renews tomorrow',
      sourceLabel: 'Charged to',
      source: 'Amex ••1004',
      logo: `${BASE}/storage/v1/object/public/brand-logos/v1/netflix.png`,
      view: 'View subscription',
    });
    // Still sent: the phone draws it if the logo will not load.
    expect(payload.card?.glyph).toBe('entertainment');
  });

  it('gives a bill with no brand its category icon instead of a logo', () => {
    const payload = reminderPayload(
      {
        kind: 'bill',
        title: 'Housing',
        body: 'Due tomorrow · $1,500.00',
        targetId: 'bill-1',
        categoryId: 'housing',
        payer: CHECKING,
      },
      BASE,
    );

    expect(payload.route).toBe('/bill');
    expect(payload.card).toMatchObject({
      glyph: 'housing',
      sourceLabel: 'Paid from',
      view: 'View bill',
    });
    expect(payload.card?.logo).toBeUndefined();
  });

  it('shows payday with its own icon and the account it lands in', () => {
    const payload = reminderPayload(
      {
        kind: 'account',
        title: 'Payday',
        body: 'Your pay lands today',
        targetId: 'acct-1',
        self: CHECKING,
      },
      BASE,
    );

    expect(payload).toMatchObject({ route: '/source', id: 'acct-1' });
    expect(payload.card).toMatchObject({
      glyph: 'payday',
      when: 'Your pay lands today',
      sourceLabel: 'Into',
      source: 'Everyday',
    });
    expect(payload.card?.amount).toBeUndefined();
  });

  it('shows a card payment with the card icon', () => {
    const payload = reminderPayload(
      { kind: 'card', title: 'Sam', body: 'Payment due tomorrow', targetId: 'card-1', self: AMEX },
      BASE,
    );

    expect(payload.route).toBe('/source');
    expect(payload.card).toMatchObject({ glyph: 'card', source: 'Amex ••1004', view: 'View card' });
  });
});

describe('everything else', () => {
  it('announces a charge with its logo and the day it went out', () => {
    const payload = chargePayload(
      {
        label: 'Housing',
        amount: 1500,
        chargedOn: '2026-10-01',
        billId: 'bill-1',
        glyph: 'housing',
        payer: CHECKING,
      },
      BASE,
    );

    expect(payload).toMatchObject({ route: '/bill', id: 'bill-1' });
    expect(payload.card).toMatchObject({
      amount: '$1,500.00',
      when: 'Went out 1 Oct',
      glyph: 'housing',
      view: 'View bill',
    });
  });

  it('folds a backlog of charges into one card', () => {
    const payload = digestPayload(4, 120.5);
    expect(payload.route).toBe('/transactions');
    expect(payload.card).toMatchObject({ amount: '$120.50', when: '4 charges' });
  });

  it('shows group activity with the group icon', () => {
    const payload = noticePayload('Flat 3B', 'Komal added Groceries · $84.20');
    expect(payload.route).toBe('/splits');
    expect(payload.card).toMatchObject({
      glyph: 'group',
      note: 'Komal added Groceries',
      amount: '$84.20',
    });
  });

  it('sends the receipts nudge to the add form with the receipt icon', () => {
    const payload = receiptsPayload(
      'Receipts',
      "Add today's receipts while they are still in your pocket.",
    );
    expect(payload.route).toBe('/add-receipt');
    expect(payload.card).toMatchObject({ glyph: 'receipts', view: 'Add a receipt' });
    expect(payload.card?.when).toBeUndefined();
  });
});
