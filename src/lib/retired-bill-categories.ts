/**
 * Bill categories the app no longer offers, and the one each became. A bill still filed under one
 * (saved before the move, or by an older build that still offers it) is read as the one it became,
 * so every list, total and form shows it there, and an edit files it there.
 */
const BECAME: Record<string, string> = { family: 'health' };

export function currentBillCategory(id: string): string {
  return BECAME[id] ?? id;
}
