import { refusedForPro } from '@/lib/pro-refusal';

/** The database's Pro wall, told apart from every other failure by the words it raises. */

it.each([
  { code: 'P0001', message: 'Scanning receipts is part of Skip Pro.' },
  { code: 'P0001', message: 'Adding receipts by voice is part of Skip Pro.' },
  { code: 'P0001', message: 'Tracking spending habits is part of Skip Pro.' },
  // The free allowance on cards and accounts.
  { code: 'P0001', message: 'Free keeps one — Skip Pro removes the limit.' },
  new Error('Scanning receipts is part of Skip Pro.'),
  'Scanning receipts is part of Skip Pro.',
])('recognises the Pro wall in %p', (thrown) => {
  expect(refusedForPro(thrown)).toBe(true);
});

it.each([
  new Error('network down'),
  { code: '23503', message: 'insert or update violates foreign key constraint' },
  // Mentions Skip Pro, but is not one of the walls.
  { code: 'P0001', message: 'Could not check Skip Pro.' },
  { code: 'P0001' },
  null,
  undefined,
  42,
])('treats %p as an ordinary failure', (thrown) => {
  expect(refusedForPro(thrown)).toBe(false);
});
