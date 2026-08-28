import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { ConfirmDialog, type DialogRequest } from '@/components/ui/confirm-dialog';

/** Resolves to the chosen action's id, or null when the user backed out. */
type Ask = (request: DialogRequest) => Promise<string | null>;

const DialogContext = createContext<Ask | null>(null);

/**
 * Makes the app's dialog callable the way Alert.alert was.
 *
 * Awaiting a promise keeps the call sites reading top to bottom — `if (await
 * ask(...)) { delete }` — instead of every screen growing its own open flag and
 * a callback that has to reach back into the handler it came from.
 *
 * One dialog at a time, mounted at the root, so it renders above every screen
 * and modal rather than inside whichever one happened to raise it.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const resolver = useRef<((value: string | null) => void) | null>(null);

  const ask = useCallback<Ask>((next) => {
    // A second dialog while one is open would strand the first promise, so the
    // one being replaced is settled as a cancel.
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

/** Yes/no shorthand, which is most of the call sites. */
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
