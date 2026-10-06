import { refusedForPro } from '@/lib/pro-refusal';

/** The database's Pro wall, told apart from every other failure by the words it raises. */

it.each([
  { code: 'P0001', message: 'Scanning receipts is part of Skip Pro.' },
  { code: 'P0001', message: 'Adding receipts by voice is part of Skip Pro.' },
  new Error('Scanning receipts is part of Skip Pro.'),
  'Scanning receipts is part of Skip Pro.',
])('recognises the Pro wall in %p', (thrown) => {
  expect(refusedForPro(thrown)).toBe(true);
});

it.each([
  new Error('network down'),
  { code: '23503', message: 'insert or update violates foreign key constraint' },
  { code: 'P0001' },
  null,
  undefined,
  42,
])('treats %p as an ordinary failure', (thrown) => {
  expect(refusedForPro(thrown)).toBe(false);
});
