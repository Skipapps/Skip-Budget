import type { Href } from 'expo-router';

/**
 * Where a row in the ledger opens: the page of the record behind it (a receipt's store, a bill, a
 * subscription), never its edit form; the pencil on that page leads there. A `useLedger` row is one
 * occurrence, not a record (two months of rent are two rows of one bill), and its id is the only
 * evidence of which record it belongs to:
 *
 * - `receipt-<id>`: the id is the record's.
 * - `bill-<id>@<date>` / `subscription-<id>@<date>`: a projected occurrence of that plan.
 * - `charge-<id>`: a recorded occurrence; the id names no plan, so it is looked up via `chargeOwners`.
 * - `income-<id>@<date>`: a payday; the salary screen takes no id.
 *
 * The id formats come from `src/api/queries.ts`; the test pins them.
 */

/** Mirrors `LedgerEntry['kind']`. */
type LedgerLinkKind = 'bill' | 'receipt' | 'subscription' | 'income';

export type LedgerLinkEntry = { id: string; kind: LedgerLinkKind };

export type ChargeOwnerRow = {
  id: string;
  bill_id: string | null;
  subscription_id: string | null;
};

/** Charge rows keyed `charge-<id>`, exactly as `entry.id` arrives, so the lookup parses nothing. */
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
  // Split at the last `@`: the date is the suffix, and a record id may contain anything.
  const at = entryId.lastIndexOf('@');
  const id = entryId.slice(prefix.length + 1, at === -1 ? undefined : at);
  return id || null;
}

/**
 * The page of the record behind a ledger row, or null. Null means nothing to open: the caller
 * leaves the row non-pressable rather than route somewhere approximate.
 */
export function ledgerHref(
  entry: LedgerLinkEntry,
  owners?: ReadonlyMap<string, string>,
): Href | null {
  if (entry.kind === 'income') {
    return '/salary';
  }

  if (entry.kind === 'receipt') {
    const id = recordIdFrom(entry.id, 'receipt');
    return id ? { pathname: '/receipt/[id]', params: { id } } : null;
  }

  const id = entry.id.startsWith('charge-')
    ? (owners?.get(entry.id) ?? null)
    : recordIdFrom(entry.id, entry.kind);

  if (!id) return null;

  return entry.kind === 'bill'
    ? { pathname: '/bill/[id]', params: { id } }
    : { pathname: '/subscription/[id]', params: { id } };
}
