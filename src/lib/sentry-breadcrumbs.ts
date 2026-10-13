import type { Breadcrumb } from '@sentry/react-native';

/**
 * Sentry keeps the last requests and screens as breadcrumbs on every report. Their URLs and routes
 * can name the account (`profiles?id=eq.<uuid>`), a receipt's storage folder, or the store a person
 * typed into a logo search, and a report describes what the app was doing, not whose budget it is
 * or what it holds. So each keeps its method, host, path and status, and loses the rest.
 */

const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** A URL or route without its query string, fragment or ids: "https://x.supabase.co/rest/v1/profiles". */
export function bareUrl(url: string): string {
  return url.replace(/[?#][\s\S]*$/, '').replace(ID, '<id>');
}

const REQUEST_CATEGORIES = new Set(['fetch', 'xhr', 'http']);

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const { category, type, data, message } = breadcrumb;

  if (REQUEST_CATEGORIES.has(category ?? '') || type === 'http') {
    if (!data) return breadcrumb;
    const { 'http.query': _query, 'http.fragment': _fragment, ...kept } = data;
    return {
      ...breadcrumb,
      data: typeof kept.url === 'string' ? { ...kept, url: bareUrl(kept.url) } : kept,
    };
  }

  if (category === 'navigation' || type === 'navigation') {
    const scrubbed: Breadcrumb = { ...breadcrumb };
    if (typeof message === 'string') scrubbed.message = bareUrl(message);
    if (data) {
      const { params: _params, ...kept } = data;
      for (const key of ['from', 'to']) {
        if (typeof kept[key] === 'string') kept[key] = bareUrl(kept[key]);
      }
      scrubbed.data = kept;
    }
    return scrubbed;
  }

  return breadcrumb;
}

/**
 * The same, for every breadcrumb on an event about to be sent. The native iOS SDK keeps its own
 * breadcrumbs, with the query in `http.query`, and they join the event after beforeBreadcrumb has
 * run, so they are only reachable here.
 */
export function scrubEvent<T extends { breadcrumbs?: Breadcrumb[] }>(event: T): T {
  if (!event.breadcrumbs) return event;
  return { ...event, breadcrumbs: event.breadcrumbs.map(scrubBreadcrumb) };
}
