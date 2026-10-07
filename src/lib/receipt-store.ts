/**
 * Which receipts are the same store. A receipt keeps the store's name as typed or picked, and a
 * catalogue store and a hand-typed one of the same name are the same shop to the person, so the name
 * decides, not the brand id: case, edge spaces and runs of spaces do not.
 */

export function storeKey(merchant: string): string {
  return merchant.trim().replace(/\s+/g, ' ').toLowerCase();
}

type StoreReceipt = { merchant: string; purchased_on: string };

/** Every receipt from the same store as `of`, newest first. A tie keeps the order it came in. */
export function receiptsFromStore<T extends StoreReceipt>(receipts: readonly T[], of: T): T[] {
  const key = storeKey(of.merchant);
  return receipts
    .filter((receipt) => storeKey(receipt.merchant) === key)
    .sort((a, b) => b.purchased_on.localeCompare(a.purchased_on));
}
