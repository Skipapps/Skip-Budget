import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function QueryProvider({ children }: { children: ReactNode }) {
  // Created in state so a fast refresh does not throw the cache away.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            // There is no window here, but there is a foreground: coming back
            // to the app is the native equivalent of refocusing a tab, and a
            // budget that was accurate an hour ago may not be now.
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
