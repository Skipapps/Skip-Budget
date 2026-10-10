/**
 * The Paid into page picks an account for a salary the editor beneath it has not saved yet, so the
 * choice cannot go through the database: it is handed straight to the editor that opened the page.
 * Nothing is kept: a pick with no editor listening (the page reached by a link) goes nowhere, so a
 * later editor can never be handed a choice made for another, whose new sources reuse the same ids.
 */

export type PaidIntoPick = {
  /** The editor that opened the page, so a second one mounted elsewhere ignores it. */
  editor: string;
  source: string;
  /** Null for "No account". */
  accountId: string | null;
};

const listeners = new Set<(pick: PaidIntoPick) => void>();

export function onPaidIntoPicked(listener: (pick: PaidIntoPick) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function pickPaidInto(pick: PaidIntoPick): void {
  for (const listener of listeners) listener(pick);
}
