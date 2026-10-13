import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  focusManager,
  type Query,
} from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { failureFingerprint, reportFailure } from '@/lib/failure';
import { noteOwnWrite, rowIdsIn } from '@/providers/realtime-provider';

/** Read failures sent in one run of the app, at most, whatever their cause. */
const READ_REPORTS_PER_RUN = 20;
/** The same cause, failing on different screens, is sent this many times at most. */
const READ_REPORTS_PER_CAUSE = 3;

/** A query key's first segment names what was read ('receipts'); the rest can hold ids. */
const KEY_NAME = /^[a-z][a-z0-9_-]{0,39}$/i;

/**
 * Sends failed reads to Sentry in a release build. A read that fails while the screen still holds
 * older data is otherwise invisible, though it can blank a figure. Each query is sent once per run
 * and each cause a few times, so a phone that is offline, or a screen retrying every resume, cannot
 * flood the project. Only the key's first segment goes with it.
 */
export function readFailureReporter(): (
  error: unknown,
  query: Query<unknown, unknown, unknown>,
) => void {
  const sentKeys = new Set<string>();
  const sentCauses = new Map<string, number>();

  return (error, query) => {
    if (sentKeys.has(query.queryHash) || sentKeys.size >= READ_REPORTS_PER_RUN) return;
    const cause = failureFingerprint(error, 'query-read').join('|');
    const times = sentCauses.get(cause) ?? 0;
    if (times >= READ_REPORTS_PER_CAUSE) return;
    sentKeys.add(query.queryHash);
    sentCauses.set(cause, times + 1);

    const first = query.queryKey[0];
    const name = typeof first === 'string' && KEY_NAME.test(first) ? first : 'other';
    if (__DEV__) console.log('[query-read]', name, error);
    else reportFailure(error, 'query-read', { query: name });
  };
}

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: readFailureReporter() }),
    // Runs as soon as the server has answered a write, before the write's own invalidations; see
    // the realtime provider, which then knows the echo of those rows is ours.
    mutationCache: new MutationCache({
      onSuccess: (data, variables) => noteOwnWrite(client, rowIdsIn(data, variables)),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        // No window here, but there is a foreground: returning to the app is the native
        // refocus, and a budget accurate an hour ago may not be now.
        refetchOnWindowFocus: true,
      },
    },
  });
  return client;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // Created in state so a fast refresh does not throw the cache away.
  const [client] = useState(createQueryClient);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
