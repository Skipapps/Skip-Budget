/** The words each of the database's Pro walls raises; nothing else says them. */
const PRO_WALL_WORDS = [
  // "Scanning receipts is part of Skip Pro.", "Tracking spending habits is part of Skip Pro."
  'part of Skip Pro',
  // The free allowance of one card, one account: "Free keeps one — Skip Pro removes the limit."
  'Skip Pro removes the limit',
];

/**
 * Whether a save was refused by the database's Pro wall. That is not a failure to apologise for:
 * the person is shown what Pro adds instead of the one failure line.
 */
export function refusedForPro(thrown: unknown): boolean {
  const message =
    thrown && typeof thrown === 'object' && 'message' in thrown
      ? (thrown as { message?: unknown }).message
      : thrown;
  return typeof message === 'string' && PRO_WALL_WORDS.some((words) => message.includes(words));
}
