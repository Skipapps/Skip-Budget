import { bookColumn, bookNameTaken, bookOfReceipt, defaultBookOf } from '@/lib/receipt-books';

const books = [
  { id: 'b1', name: 'Paris trip' },
  { id: 'b2', name: 'Kids' },
];

describe('bookOfReceipt', () => {
  it('keeps a receipt in its own book', () => {
    expect(bookOfReceipt('b2', books)).toBe('b2');
  });

  it('puts a receipt with no book, or a book that is gone, in General', () => {
    expect(bookOfReceipt(null, books)).toBe('general');
    expect(bookOfReceipt(undefined, books)).toBe('general');
    expect(bookOfReceipt('deleted-elsewhere', books)).toBe('general');
  });
});

describe('defaultBookOf', () => {
  it('is General for someone with no book: there is nothing to ask', () => {
    expect(defaultBookOf(null, [])).toBe('general');
    expect(defaultBookOf('b1', [])).toBe('general');
  });

  it('is the chosen book, or General when General was chosen', () => {
    expect(defaultBookOf('b1', books)).toBe('b1');
    expect(defaultBookOf('general', books)).toBe('general');
  });

  it('asks (null) when nothing was chosen, or the chosen book is gone', () => {
    expect(defaultBookOf(null, books)).toBeNull();
    expect(defaultBookOf('gone', books)).toBeNull();
  });
});

describe('bookColumn', () => {
  it('writes General as no book', () => {
    expect(bookColumn('general')).toBeNull();
    expect(bookColumn('b1')).toBe('b1');
  });
});

describe('bookNameTaken', () => {
  const general = ['General', 'Général'];

  it('refuses another book of the same name in any case or spacing', () => {
    expect(bookNameTaken(' paris TRIP ', books, general)).toBe(true);
  });

  it('lets a book keep its own name when edited', () => {
    expect(bookNameTaken('Paris trip', books, general, 'b1')).toBe(false);
  });

  it('refuses General under any of its names', () => {
    expect(bookNameTaken('general', books, general)).toBe(true);
    expect(bookNameTaken('GÉNÉRAL', books, general)).toBe(true);
  });

  it('allows a new name', () => {
    expect(bookNameTaken('Wedding', books, general)).toBe(false);
  });
});
