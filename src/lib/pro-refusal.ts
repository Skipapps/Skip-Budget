/**
 * Whether a save was refused by the database's Pro wall ("Scanning receipts is part of Skip Pro.",
 * "Adding receipts by voice is part of Skip Pro."). That is not a failure to apologise for: the
 * person is shown what Pro adds instead of the one failure line.
 */
export function refusedForPro(thrown: unknown): boolean {
  const message =
    thrown && typeof thrown === 'object' && 'message' in thrown
      ? (thrown as { message?: unknown }).message
      : thrown;
  return typeof message === 'string' && message.includes('part of Skip Pro');
}
