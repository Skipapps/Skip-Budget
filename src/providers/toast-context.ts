import { createContext, useContext } from 'react';

import type { MessageKey } from '@/i18n';

/** `done` is anything saved, sent or changed; `deleted` is anything removed. */
export type ToastTone = 'done' | 'deleted';

export type ShowToast = (message: MessageKey, tone?: ToastTone) => void;

/** Apart from the toast itself, so a screen can raise one without loading its animation. */
export const ToastContext = createContext<ShowToast | null>(null);

/**
 * `toast('toast.card.added')` after a save, `toast('toast.card.deleted', 'deleted')` after a
 * removal. Outside the provider (a screen rendered on its own in a test) it does nothing.
 */
export function useToast(): ShowToast {
  return useContext(ToastContext) ?? noToast;
}

const noToast: ShowToast = () => {};
