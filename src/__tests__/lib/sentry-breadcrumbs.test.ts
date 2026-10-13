import type { Breadcrumb } from '@sentry/react-native';
import fs from 'node:fs';
import path from 'node:path';

import { bareUrl, scrubBreadcrumb, scrubEvent } from '@/lib/sentry-breadcrumbs';

/**
 * The requests and screens a Sentry report carries keep their method, host, path and status, and
 * nothing that names the account or what the person typed.
 */

const USER = '4f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f';
const HOST = 'https://abcdefghijklmnopqrst.supabase.co';

describe('a request breadcrumb', () => {
  it.each(['fetch', 'xhr'])('loses the query string of a %s, and keeps the rest', (category) => {
    const crumb = {
      category,
      type: 'http',
      level: 'info' as const,
      data: {
        method: 'GET',
        url: `${HOST}/rest/v1/profiles?select=pro_offer_seen_at&id=eq.${USER}`,
        status_code: 200,
        response_body_size: 31,
      },
    };
    expect(scrubBreadcrumb(crumb)).toEqual({
      ...crumb,
      data: {
        method: 'GET',
        url: `${HOST}/rest/v1/profiles`,
        status_code: 200,
        response_body_size: 31,
      },
    });
  });

  it('drops what a logo lookup typed, and any fragment', () => {
    const crumb = {
      category: 'fetch',
      type: 'http',
      data: {
        method: 'GET',
        url: 'https://skip-logos.example.workers.dev/v1/resolve?q=Joe%27s%20Pizza&country=US#top',
        status_code: 404,
      },
    };
    const scrubbed = scrubBreadcrumb(crumb);
    expect(scrubbed.data?.url).toBe('https://skip-logos.example.workers.dev/v1/resolve');
    expect(JSON.stringify(scrubbed)).not.toContain('Pizza');
  });

  it('blanks an id in the path, such as a receipt folder', () => {
    expect(bareUrl(`${HOST}/storage/v1/object/receipts/${USER}/scan.jpg`)).toBe(
      `${HOST}/storage/v1/object/receipts/<id>/scan.jpg`,
    );
  });

  it("drops Sentry's own split-out query and fragment fields", () => {
    const scrubbed = scrubBreadcrumb({
      category: 'fetch',
      data: {
        method: 'POST',
        url: `${HOST}/rest/v1/rpc/is_pro`,
        'http.query': `p_user=${USER}`,
        'http.fragment': 'x',
      },
    });
    expect(scrubbed.data).toEqual({ method: 'POST', url: `${HOST}/rest/v1/rpc/is_pro` });
  });
});

describe("the native iOS SDK's own request breadcrumb", () => {
  // As SentryNetworkTracker.m builds it: the URL already without its query, which sits beside it.
  const native = {
    category: 'http',
    type: 'http',
    level: 'info' as const,
    data: {
      url: `${HOST}/rest/v1/profiles`,
      method: 'GET',
      status_code: 200,
      reason: 'no error',
      'http.query': `select=pro_offer_seen_at&id=eq.${USER}`,
      'http.fragment': 'top',
    },
  };

  it('loses http.query and http.fragment', () => {
    expect(scrubBreadcrumb(native)).toEqual({
      ...native,
      data: {
        url: `${HOST}/rest/v1/profiles`,
        method: 'GET',
        status_code: 200,
        reason: 'no error',
      },
    });
  });

  it('is scrubbed on the event before it is sent, where native breadcrumbs join it', () => {
    const event = {
      event_id: 'abc',
      message: 'boom',
      breadcrumbs: [
        native,
        {
          category: 'fetch',
          data: { method: 'GET', url: `${HOST}/rest/v1/bills?user_id=eq.${USER}` },
        },
        { category: 'navigation', data: { from: `/source/${USER}`, to: '/home' } },
        { category: 'console', message: 'kept as it is' },
      ],
    };
    const sent = scrubEvent(event);

    expect(sent.event_id).toBe('abc');
    expect(sent.breadcrumbs).toHaveLength(4);
    expect(JSON.stringify(sent)).not.toContain(USER);
    expect(JSON.stringify(sent)).not.toContain('http.query');
    expect(sent.breadcrumbs[3]).toEqual({ category: 'console', message: 'kept as it is' });
  });

  it('leaves an event with no breadcrumbs as it is', () => {
    const event: { message: string; breadcrumbs?: Breadcrumb[] } = { message: 'boom' };
    expect(scrubEvent(event)).toBe(event);
  });
});

describe('a navigation breadcrumb', () => {
  it('loses route params, query strings and ids', () => {
    const scrubbed = scrubBreadcrumb({
      category: 'navigation',
      type: 'navigation',
      message: `Navigation to /source/${USER}?q=netflix`,
      data: {
        from: `/payments/search?q=netflix&card=${USER}`,
        to: `/source/${USER}`,
        params: { id: USER, q: 'netflix' },
      },
    });
    expect(scrubbed).toEqual({
      category: 'navigation',
      type: 'navigation',
      message: 'Navigation to /source/<id>',
      data: { from: '/payments/search', to: '/source/<id>' },
    });
  });

  it('leaves a plain route name as it is', () => {
    const crumb = {
      category: 'navigation',
      message: 'Navigation to source/[id]',
      data: { from: 'home', to: 'source/[id]' },
    };
    expect(scrubBreadcrumb(crumb)).toEqual(crumb);
  });
});

it('leaves every other breadcrumb alone', () => {
  const crumb = { category: 'ui.click', message: 'Save' };
  expect(scrubBreadcrumb(crumb)).toBe(crumb);
});

it('is what the Sentry init uses', () => {
  const layout = fs.readFileSync(path.join(__dirname, '../../app/_layout.tsx'), 'utf8');
  const init = layout.slice(
    layout.indexOf('Sentry.init({'),
    layout.indexOf('});', layout.indexOf('Sentry.init({')),
  );
  expect(init).toContain('beforeBreadcrumb: scrubBreadcrumb');
  expect(init).toContain('beforeSend: scrubEvent');
  // The native SDK's own request breadcrumbs carry the query and skip beforeBreadcrumb.
  expect(init).toContain('enableNetworkBreadcrumbs: false');
  expect(init).toContain('sendDefaultPii: false');
  expect(init).not.toContain('setUser');
});
