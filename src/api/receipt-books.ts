import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { NOTHING_SAVED } from '@/api/mutations';
import { withTimeout } from '@/lib/deadline';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Receipt books: a label on a receipt that keeps a trip or the kids apart. General is not a row:
 * a receipt with no book is in General. Every receipt counts toward spending whatever its book.
 */

export type ReceiptBookRow = {
  id: string;
  name: string;
  icon_id: string;
  /** The card or account the book is paid from; neither is Skip (each receipt picks its own). */
  card_id: string | null;
  bank_account_id: string | null;
  created_at: string;
};

const BOOK_COLUMNS = 'id, name, icon_id, card_id, bank_account_id, created_at';

const QUERY_TIMEOUT_MS = 12_000;

type ReadFailure = { code?: string; message?: string } | null;

/**
 * A database without books yet: PostgREST has no such table (PGRST205), or Postgres no such
 * column (42703). Such a database has only General, so it reads as no books at all.
 */
const lacksBooks = (error: ReadFailure) =>
  error?.code === 'PGRST205' ||
  (error?.code === '42703' && /receipt_book/.test(error.message ?? ''));

/** The person's books, oldest first: a new one goes at the end of the row. */
export function useReceiptBooks() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['receipt_books', userId],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async (): Promise<ReceiptBookRow[]> => {
          const { data, error } = await supabase
            .from('receipt_books')
            .select(BOOK_COLUMNS)
            .order('created_at', { ascending: true });
          if (lacksBooks(error)) return [];
          if (error) throw error;
          return (data ?? []) as unknown as ReceiptBookRow[];
        })(),
        QUERY_TIMEOUT_MS,
        'Could not load your receipt books. Check your connection and try again.',
      ),
  });
}

/**
 * Where new receipts go, as stored: null (not chosen), 'general', or a book's id. Read it through
 * `defaultBookOf`, which knows a stored id can name a book that is gone. Under 'profile', so a
 * change on another phone arrives with the profile's own.
 */
export function useReceiptBookDefault() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['profile', userId, 'receipt-book-default'],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async (): Promise<string | null> => {
          const { data, error } = await supabase
            .from('profiles')
            .select('receipt_book_default')
            .eq('id', userId!)
            .maybeSingle();
          if (lacksBooks(error)) return null;
          if (error) throw error;
          return (
            (data as { receipt_book_default: string | null } | null)?.receipt_book_default ?? null
          );
        })(),
        QUERY_TIMEOUT_MS,
        'Could not load your receipt books. Check your connection and try again.',
      ),
  });
}

/**
 * A book write moves receipts too (a deleted book's go back to General), and the default lives on
 * the profile. Awaited, so the page a save returns to already has the new book to show.
 */
function useInvalidateBooks() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      ['receipt_books', 'receipts', 'receipt', 'profile'].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

export type ReceiptBookValues = {
  name: string;
  icon_id: string;
  card_id: string | null;
  bank_account_id: string | null;
  /** New receipts go here unless the person picks another. Off clears it only if it was this one. */
  makeDefault: boolean;
};

/** 23505 on the name index: the person already has a book by this name. */
export const bookNameRefused = (thrown: unknown) =>
  (thrown as { code?: unknown } | null)?.code === '23505';

/** Creates a book (no id) or saves one, and its default, in one transaction. Resolves to its id. */
export function useSaveReceiptBook() {
  const invalidate = useInvalidateBooks();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | null; values: ReceiptBookValues }) => {
      const { data, error } = await supabase.rpc('save_receipt_book', {
        p_id: id ?? null,
        p_name: values.name.trim(),
        p_icon_id: values.icon_id,
        p_card_id: values.card_id,
        p_bank_account_id: values.bank_account_id,
        p_make_default: values.makeDefault,
      });
      if (error) throw error;
      return { id: data as string };
    },
    onSuccess: invalidate,
  });
}

/** Deletes a book. Its receipts stay, back in General, and still count. */
export function useDeleteReceiptBook() {
  const invalidate = useInvalidateBooks();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('receipt_books').delete().eq('id', id);
      if (error) throw error;
      return { id };
    },
    onSuccess: invalidate,
  });
}

/** Makes `book` ('general' or a book's id) where new receipts go. */
export function useSetReceiptBookDefault() {
  const userId = useUserId();
  const invalidate = useInvalidateBooks();
  return useMutation({
    mutationFn: async (book: string) => {
      if (!userId) throw new Error('Sign in first.');
      const { data, error } = await supabase
        .from('profiles')
        .update({ receipt_book_default: book } as never)
        .eq('id', userId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(NOTHING_SAVED);
      return { book };
    },
    onSuccess: invalidate,
  });
}
