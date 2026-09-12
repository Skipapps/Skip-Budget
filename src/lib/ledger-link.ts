import type { Href } from 'expo-router';

/**
 * Where a row in the ledger opens.
 *
 * The two big lists — the Transactions tab and the dashboard's Recent and
 * Coming up — draw entries that came out of `useLedger`, which is a timeline
 * built from four different tables. A row there is not a record: it is one
 * *occurrence*. September's rent and October's rent are two rows of the same
 * bill, and both open the same bill.
 *
 * Working out which record an occurrence belongs to is the whole job, and the
 * ledger's ids are the only evidence there is:
 *
 * - `receipt-<id>` — a receipt happened once, so the id is the record's.
 * - `bill-<id>@<date>` / `subscription-<id>@<date>` — a *projected* occurrence,
 *   named after the plan that projected it plus the day it falls on.
 * - `charge-<id>` — an occurrence that was written down at the time. Its id is
 *   the charge row's own, which names no plan at all, so the charge has to be
 *   looked up. That is what `chargeOwners` is for.
 * - `income-<id>@<date>` — a payday. The salary screen edits every source at
 *   once and takes no id, so this one carries nothing.
 *
 * Kept here, pure, rather than inline in the two screens: the id formats are
 * `src/api/queries.ts`'s business, and a screen that guesses at them silently
 * stops navigating the day one of them changes. A test pinned to those exact
 * shapes fails loudly instead.
 */

/** The kinds a ledger entry can be. Mirrors `LedgerEntry['kind']`. */
export type LedgerLinkKind = 'bill' | 'receipt' | 'subscription' | 'income';

/** As much of a ledger entry as a link needs. */
export type LedgerLinkEntry = { id: string; kind: LedgerLinkKind };

/** As much of a charge row as a link needs: which plan wrote it. */
export type ChargeOwnerRow = {
  id: string;
  bill_id: string | null;
  subscription_id: string | null;
};

/**
 * Charge rows, keyed the way the ledger names them.
 *
 * The key is `charge-<id>` rather than the bare row id because that is exactly
 * what arrives as `entry.id`, so the lookup is one `get` with nothing parsed.
 */
export function chargeOwners(rows: readonly ChargeOwnerRow[]): Map<string, string> {
  const owners = new Map<string, string>();
  for (const row of rows) {
    const planId = row.bill_id ?? row.subscription_id;
    if (planId) owners.set(`charge-${row.id}`, planId);
  }
  return owners;
}

/** `bill-abc@2026-09-12` → `abc`. Null when the id is not that shape. */
function recordIdFrom(entryId: string, prefix: string): string | null {
  if (!entryId.startsWith(`${prefix}-`)) return null;
  // Split at the last `@` rather than the first: the date is the suffix, and a
  // record id is free to contain anything.
  const at = entryId.lastIndexOf('@');
  const id = entryId.slice(prefix.length + 1, at === -1 ? undefined : at);
  return id || null;
}

/**
 * The screen that edits the record behind a ledger row, or null.
 *
 * Null means "this row has nothing to open", and the caller must leave it
 * non-pressable rather than route somewhere approximate — a row that navigates
 * to the wrong record is worse than one that does nothing.
 */
export function ledgerHref(
  entry: LedgerLinkEntry,
  owners?: ReadonlyMap<string, string>,
): Href | null {
  if (entry.kind === 'income') {
    // Every source on one screen, and it takes no id.
    return '/salary';
  }

  if (entry.kind === 'receipt') {
    const id = recordIdFrom(entry.id, 'receipt');
    return id ? { pathname: '/add-receipt', params: { id } } : null;
  }

  // A recorded occurrence is named after the charge, so the plan behind it is
  // whatever that charge was written against.
  const id = entry.id.startsWith('charge-')
    ? (owners?.get(entry.id) ?? null)
    : recordIdFrom(entry.id, entry.kind);

  if (!id) return null;

  return entry.kind === 'bill'
    ? { pathname: '/add-bill', params: { id } }
    : { pathname: '/add-subscription', params: { id } };
}
