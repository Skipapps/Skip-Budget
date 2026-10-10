import { GENERAL_BOOK } from '@/data/receipt-books';

/** A book as these rules need it. */
type BookRef = { id: string; name: string };

/**
 * The book a receipt is kept in: its own when that book still exists, else General. A receipt
 * whose book was deleted on another phone, and not yet re-read here, is in General.
 */
export function bookOfReceipt(
  bookId: string | null | undefined,
  books: readonly Pick<BookRef, 'id'>[],
): string {
  return bookId && books.some((book) => book.id === bookId) ? bookId : GENERAL_BOOK;
}

/**
 * Where a new receipt goes before anyone picks: the default the person chose, General when they
 * have no book (there is nothing to ask), or null, which means ask. A default naming a book that is
 * gone is no choice at all.
 */
export function defaultBookOf(
  stored: string | null | undefined,
  books: readonly Pick<BookRef, 'id'>[],
): string | null {
  if (books.length === 0) return GENERAL_BOOK;
  if (stored === GENERAL_BOOK) return GENERAL_BOOK;
  return stored && books.some((book) => book.id === stored) ? stored : null;
}

/** The receipts column for a book key: General is no book. */
export function bookColumn(book: string): string | null {
  return book === GENERAL_BOOK ? null : book;
}

/** Names are compared the way the database's unique index compares them: trimmed, any case. */
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Whether `name` would read as another book: one of the person's (other than `exceptId`, the book
 * being edited) or General, under any of its names.
 */
export function bookNameTaken(
  name: string,
  books: readonly BookRef[],
  generalNames: readonly string[],
  exceptId?: string | null,
): boolean {
  if (generalNames.some((general) => sameName(general, name))) return true;
  return books.some((book) => book.id !== exceptId && sameName(book.name, name));
}
