import fs from 'node:fs';
import path from 'node:path';

import { logoDomainOf as appLogoDomainOf } from '@/lib/logo-domain';
import { monogramOf } from '@/lib/monogram';

import {
  billGlyph,
  chargePayload,
  digestPayload,
  logoDomainOf,
  logoUrl,
  monogram,
  money,
  noticePayload,
  receiptsPayload,
  reminderPayload,
  shortDate,
  sourceName,
  splitBody,
  thumbnailUrl,
  type LogoSource,
} from '../../../supabase/functions/send-push/card';

/** The card a notification carries: press-and-hold details, thumbnail, and where "View" lands. */

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
        pro: true,
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
        pro: true,
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
        pro: true,
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
      {
        pro: true,
        kind: 'card',
        title: 'Sam',
        body: 'Payment due tomorrow',
        targetId: 'card-1',
        self: AMEX,
      },
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
        pro: true,
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

describe('thumbnails from the logo service', () => {
  const CDN = 'https://logos.skipapps.net/logos';
  const BUCKET_NETFLIX = `${BASE}/storage/v1/object/public/brand-logos/v1/netflix.png`;
  const NETFLIX: LogoSource = { brandDomain: 'netflix.com', logoPath: 'v1/netflix.png' };

  /** Every combination a row can be in, as the app and the function each spell it. */
  const ROWS: { name: string; source: LogoSource }[] = [
    { name: 'catalog brand only', source: NETFLIX },
    { name: "owner's choice over the brand", source: { ...NETFLIX, logoDomain: 'hulu.com' } },
    { name: 'choice equal to the brand', source: { ...NETFLIX, logoDomain: 'netflix.com' } },
    { name: 'custom store with a choice', source: { logoDomain: 'planetfitness.com' } },
    { name: 'hidden brand', source: { ...NETFLIX, logoHidden: true } },
    { name: 'hidden choice', source: { logoDomain: 'hulu.com', logoHidden: true } },
    { name: 'nothing', source: {} },
    { name: 'blank choice', source: { ...NETFLIX, logoDomain: '  ' } },
    { name: 'odd case', source: { brandDomain: 'Netflix.COM', logoDomain: ' Hulu.com ' } },
  ];

  it.each(ROWS)('picks the same website as the app for: $name', ({ source }) => {
    const asTheAppReadsIt = {
      logo_domain: source.logoDomain,
      logo_hidden: source.logoHidden,
      brands: source.brandDomain === undefined ? null : { domain: source.brandDomain },
    };
    expect(logoDomainOf(source)).toBe(appLogoDomainOf(asTheAppReadsIt));
  });

  describe('with LOGO_CDN_URL set', () => {
    it.each([
      ['catalog brand only', NETFLIX, `${CDN}/netflix.com`],
      ["owner's choice over the brand", { ...NETFLIX, logoDomain: 'hulu.com' }, `${CDN}/hulu.com`],
      [
        'custom store with a choice',
        { logoDomain: 'planetfitness.com' },
        `${CDN}/planetfitness.com`,
      ],
      ['hidden brand', { ...NETFLIX, logoHidden: true }, undefined],
      ['hidden choice', { logoDomain: 'hulu.com', logoHidden: true }, undefined],
      ['nothing, not even a bucket file', { logoPath: 'v1/netflix.png' }, undefined],
    ] as [string, LogoSource, string | undefined][])('%s', (_, source, expected) => {
      expect(thumbnailUrl(source, BASE, CDN)).toBe(expected);
    });

    it('ignores a trailing slash on the setting', () => {
      expect(thumbnailUrl(NETFLIX, BASE, `${CDN}/`)).toBe(`${CDN}/netflix.com`);
    });
  });

  describe('without LOGO_CDN_URL, as deployed today', () => {
    it.each([undefined, null, '', '  '])('keeps the bucket logo when the setting is %p', (cdn) => {
      expect(thumbnailUrl(NETFLIX, BASE, cdn)).toBe(BUCKET_NETFLIX);
    });

    it.each([
      ['choice equal to the brand', { ...NETFLIX, logoDomain: 'Netflix.com' }, BUCKET_NETFLIX],
      // The bucket only holds catalog files: showing Netflix's would undo the owner's choice.
      ["owner's choice over the brand", { ...NETFLIX, logoDomain: 'hulu.com' }, undefined],
      ['custom store with a choice', { logoDomain: 'planetfitness.com' }, undefined],
      ['hidden brand', { ...NETFLIX, logoHidden: true }, undefined],
    ] as [string, LogoSource, string | undefined][])('%s', (_, source, expected) => {
      expect(thumbnailUrl(source, BASE)).toBe(expected);
    });
  });

  it('puts the CDN logo on a subscription reminder, glyph still sent', () => {
    const payload = reminderPayload(
      {
        pro: true,
        kind: 'subscription',
        title: 'Hulu',
        body: 'Renews tomorrow · $17.99',
        targetId: 'sub-2',
        ...NETFLIX,
        logoDomain: 'hulu.com',
        categoryId: 'entertainment',
      },
      BASE,
      CDN,
    );
    expect(payload.card).toMatchObject({ logo: `${CDN}/hulu.com`, glyph: 'entertainment' });
  });

  it('leaves a bill reminder on its icon when its owner chose letters', () => {
    const payload = reminderPayload(
      {
        pro: true,
        kind: 'bill',
        title: 'Electric',
        body: 'Due tomorrow · $80.00',
        targetId: 'bill-2',
        brandDomain: 'aep.com',
        logoPath: 'v1/aep.png',
        logoHidden: true,
        categoryId: 'energy',
      },
      BASE,
      CDN,
    );
    expect(payload.card?.logo).toBeUndefined();
    expect(payload.card?.glyph).toBe('energy');
  });

  it('puts the CDN logo on a charge from a custom store', () => {
    const payload = chargePayload(
      {
        pro: true,
        label: 'Planet Fitness',
        amount: 24.99,
        chargedOn: '2026-10-01',
        subscriptionId: 'sub-3',
        logoDomain: 'planetfitness.com',
        glyph: 'fitness',
      },
      BASE,
      CDN,
    );
    expect(payload.card).toMatchObject({ logo: `${CDN}/planetfitness.com`, glyph: 'fitness' });
  });

  it('keeps a charge on the bucket logo without the setting', () => {
    const payload = chargePayload(
      {
        pro: true,
        label: 'Netflix',
        amount: 15.49,
        chargedOn: '2026-10-01',
        subscriptionId: 's',
        ...NETFLIX,
      },
      BASE,
    );
    expect(payload.card?.logo).toBe(BUCKET_NETFLIX);
  });
});

describe('free accounts: logos are Pro', () => {
  const CDN = 'https://logos.skipapps.net/logos';
  const NETFLIX: LogoSource = { brandDomain: 'netflix.com', logoPath: 'v1/netflix.png' };

  it('sends a subscription reminder with the store’s letters, never its logo', () => {
    const payload = reminderPayload(
      {
        pro: false,
        kind: 'subscription',
        title: 'Netflix',
        body: 'Renews tomorrow · $15.49',
        targetId: 'sub-1',
        ...NETFLIX,
        categoryId: 'entertainment',
      },
      BASE,
      CDN,
    );
    const app = monogramOf('Netflix');
    expect(payload.card?.logo).toBeUndefined();
    expect(payload.card).toMatchObject({
      letters: 'NE',
      lettersColor: app.background,
      lettersInk: app.ink,
    });
  });

  it('sends a bill reminder with its icon and no letters, as the app draws a bill', () => {
    const payload = reminderPayload(
      {
        pro: false,
        kind: 'bill',
        title: 'Electric',
        body: 'Due tomorrow · $80.00',
        targetId: 'bill-2',
        brandDomain: 'aep.com',
        logoPath: 'v1/aep.png',
        categoryId: 'energy',
      },
      BASE,
      CDN,
    );
    expect(payload.card?.logo).toBeUndefined();
    expect(payload.card?.letters).toBeUndefined();
    expect(payload.card?.glyph).toBe('energy');
  });

  it('sends a subscription charge with letters and a bill charge with its icon', () => {
    const subscription = chargePayload(
      {
        pro: false,
        label: 'Planet Fitness',
        amount: 24.99,
        chargedOn: '2026-10-01',
        subscriptionId: 'sub-3',
        logoDomain: 'planetfitness.com',
        glyph: 'fitness',
      },
      BASE,
      CDN,
    );
    expect(subscription.card?.logo).toBeUndefined();
    expect(subscription.card?.letters).toBe('PF');

    const bill = chargePayload(
      {
        pro: false,
        label: 'Housing',
        amount: 1500,
        chargedOn: '2026-10-01',
        billId: 'bill-1',
        glyph: 'housing',
      },
      BASE,
      CDN,
    );
    expect(bill.card?.logo).toBeUndefined();
    expect(bill.card?.letters).toBeUndefined();
  });

  it('still sends Pro the logo, with letters for when it will not load', () => {
    const payload = reminderPayload(
      {
        pro: true,
        kind: 'subscription',
        title: 'Netflix',
        body: 'Renews tomorrow · $15.49',
        targetId: 'sub-1',
        ...NETFLIX,
      },
      BASE,
      CDN,
    );
    expect(payload.card).toMatchObject({ logo: `${CDN}/netflix.com`, letters: 'NE' });
  });

  it.each([
    'Netflix',
    "Trader Joe's",
    'Planet Fitness',
    '  spaced   name ',
    'X',
    '',
    'Café Olé',
    'AT&T Wireless',
    '7-Eleven',
    'Hulu + Live TV',
  ])('draws %p exactly as the app does', (name) => {
    expect(monogram(name)).toEqual(monogramOf(name));
  });

  it('agrees with the app on every colour of the palette, ink included', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 500 && seen.size < 8; index += 1) {
      const name = `Store ${index}`;
      expect(monogram(name)).toEqual(monogramOf(name));
      seen.add(monogram(name).background);
    }
    expect(seen.size).toBe(8);
  });
});

describe('the function itself (Deno, so read as source)', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../../../supabase/functions/send-push/index.ts'),
    'utf8',
  );

  it.each(['bills', 'subscriptions'])('reads the logo choice and brand for %s', (table) => {
    const read = source.match(
      new RegExp(`\\.from\\('${table}'\\)\\s*\\.select\\(\\s*\`([^\`]*)\``),
    );
    expect(read).not.toBeNull();
    expect(read![1]).toContain('${logo}brands(domain, logo_path)');
    expect(source).toContain("const LOGO_COLUMNS = 'logo_domain, logo_hidden, '");
  });

  it('falls back to the old read on a database without the columns', () => {
    expect(source).toMatch(/error\?\.code === '42703' \? read\(''\)/);
  });

  it('takes the CDN from LOGO_CDN_URL and hands it to both card builders', () => {
    expect(source).toContain("Deno.env.get('LOGO_CDN_URL')");
    expect(source).toMatch(/chargeData\(ctx, supabaseUrl, logoCdnUrl,/);
    expect(source).toMatch(/reminderData\(ctx, supabaseUrl, logoCdnUrl,/);
  });
});
