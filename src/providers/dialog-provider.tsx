import { usePathname } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { ConfirmDialog, type DialogRequest } from '@/components/ui/confirm-dialog';

/** Resolves to the chosen action's id, or null when the user backed out. */
type Ask = (request: DialogRequest) => Promise<string | null>;

const DialogContext = createContext<Ask | null>(null);

/**
 * Makes the app's dialog callable like Alert.alert: awaiting a promise keeps call sites reading top
 * to bottom. One dialog at a time, mounted at the root so it renders above every screen and modal.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const resolver = useRef<((value: string | null) => void) | null>(null);

  const ask = useCallback<Ask>((next) => {
    // A second dialog would strand the first promise, so the replaced one settles as a cancel.
    resolver.current?.(null);

    return new Promise<string | null>((resolve) => {
      resolver.current = resolve;
      setRequest(next);
    });
  }, []);

  const resolve = useCallback((actionId: string | null) => {
    const settle = resolver.current;
    resolver.current = null;
    setRequest(null);
    settle?.(actionId);
  }, []);

  // A dialog belongs to the screen that raised it: navigating away (deep link, notification) would
  // otherwise leave it floating over the next screen.
  const pathname = usePathname();
  const raisedOn = useRef(pathname);
  useEffect(() => {
    if (raisedOn.current !== pathname && resolver.current) {
      resolve(null);
    }
    raisedOn.current = pathname;
  }, [pathname, resolve]);

  const value = useMemo(() => ask, [ask]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {request ? <ConfirmDialog {...request} onResolve={resolve} /> : null}
    </DialogContext.Provider>
  );
}

export function useDialog(): Ask {
  const ask = useContext(DialogContext);
  if (!ask) {
    throw new Error('useDialog must be used inside DialogProvider');
  }
  return ask;
}

export function useConfirm() {
  const ask = useDialog();

  return useCallback(
    async (options: {
      title: string;
      message?: string;
      confirmLabel: string;
      destructive?: boolean;
      cancelLabel?: string;
    }) => {
      const choice = await ask({
        title: options.title,
        message: options.message,
        cancelLabel: options.cancelLabel ?? 'Cancel',
        actions: [{ id: 'confirm', label: options.confirmLabel, destructive: options.destructive }],
      });
      return choice === 'confirm';
    },
    [ask],
  );
}
