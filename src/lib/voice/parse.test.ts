import { fromCents, toCents } from '@/lib/money';

import { learnAlias, type AliasPair } from './aliases';
import { parseVoice } from './parse';
import { WEIGHTS } from './score';
import { DIRECTORY, TODAY } from './test-fixtures';
import type { VoiceCycle, VoiceDraft, VoiceKind, VoiceMerchantSource, VoiceMissing } from './types';

/**
 * One sentence per row. TODAY is Thursday 1 Oct 2026 unless a row says otherwise: yesterday 30 Sep,
 * last Friday 25 Sep, next Friday 2 Oct, Monday back 28 Sep, Monday ahead 5 Oct. Unstated optional
 * fields default to null / [].
 */
type Want = {
  kind: VoiceKind;
  amount: number | null;
  choices?: number[];
  merchant?: string | null;
  heard?: string | null;
  source?: VoiceMerchantSource | null;
  date?: string | null;
  cycle?: VoiceCycle | null;
  category?: string | null;
  confidence: VoiceDraft['confidence'];
  missing: VoiceMissing[];
  sure?: boolean;
  transcript?: string;
};

type Row = {
  says: string | string[];
  want: Want;
  today?: string;
  force?: VoiceKind;
  aliases?: Record<string, string>;
};

const row = (says: Row['says'], want: Want, extra: Omit<Row, 'says' | 'want'> = {}): Row => ({
  says,
  want,
  ...extra,
});

// Messy spoken examples across all three kinds.
const PLAN: Row[] = [
  // Comcast is an alias of the Xfinity brand in the catalog, so the brand is Xfinity.
  row('uh paid like forty no fifty bucks for comcast yesterday', {
    kind: 'bill',
    amount: 50,
    merchant: 'Xfinity',
    heard: 'comcast',
    date: '2026-09-30',
    category: 'internet',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('netflix fifteen ninety nine every month', {
    kind: 'subscription',
    amount: 15.99,
    choices: [15.99, 1599],
    merchant: 'Netflix',
    cycle: 'monthly',
    confidence: 'medium',
    missing: ['amount'],
  }),
  // Salary is out: no kind for it, so an unsure receipt with no merchant.
  row('got my paycheck thirty seven hundred', {
    kind: 'receipt',
    sure: false,
    amount: 3700,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('spent twelve fifty at star bucks', {
    kind: 'receipt',
    amount: 12.5,
    choices: [12.5, 1250],
    merchant: 'Starbucks',
    heard: 'star bucks',
    confidence: 'medium',
    missing: ['amount'],
  }),
  row('rent is due on the first, eighteen hundred', {
    kind: 'bill',
    amount: 1800,
    date: '2026-10-01',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('spot a fly', {
    kind: 'subscription',
    amount: null,
    merchant: 'Spotify',
    heard: 'spot a fly',
    confidence: 'low',
    missing: ['amount', 'cycle'],
  }),
];

// The hints on the voice page. The brand the review page shows must be the word the example puts in
// bold, so none leans on a catalog alias (catalog.test.ts checks them against the real catalog).
const TRY_SAYING: Row[] = [
  row('Spent $12.50 at Starbucks today', {
    kind: 'receipt',
    amount: 12.5,
    merchant: 'Starbucks',
    date: '2026-10-01',
    confidence: 'high',
    missing: [],
  }),
  row('$64.20 at Target yesterday', {
    kind: 'receipt',
    amount: 64.2,
    merchant: 'Target',
    date: '2026-09-30',
    confidence: 'high',
    missing: [],
  }),
  row('Paid 45 bucks for gas at Shell on Friday', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Shell',
    date: '2026-09-25',
    confidence: 'high',
    missing: [],
  }),
  row('Electric bill $85, due on the 15th', {
    kind: 'bill',
    amount: 85,
    date: '2026-10-15',
    category: 'energy',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('Rent is $1,800, due on the 1st', {
    kind: 'bill',
    amount: 1800,
    date: '2026-10-01',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('Xfinity $79.99, due on the 20th every month', {
    kind: 'bill',
    amount: 79.99,
    merchant: 'Xfinity',
    heard: 'xfinity',
    date: '2026-10-20',
    cycle: 'monthly',
    category: 'internet',
    confidence: 'high',
    missing: [],
  }),
  row('Netflix $15.99 every month', {
    kind: 'subscription',
    amount: 15.99,
    merchant: 'Netflix',
    cycle: 'monthly',
    confidence: 'high',
    missing: [],
  }),
  row('Spotify $11.99 a month, renews on the 3rd', {
    kind: 'subscription',
    amount: 11.99,
    merchant: 'Spotify',
    date: '2026-10-03',
    cycle: 'monthly',
    confidence: 'high',
    missing: [],
  }),
  row('Hulu $99.99 a year', {
    kind: 'subscription',
    amount: 99.99,
    merchant: 'Hulu',
    heard: 'hulu',
    cycle: 'yearly',
    confidence: 'high',
    missing: [],
  }),
];

const DIGITS: Row[] = [
  row('Netflix $15.99', {
    kind: 'subscription',
    amount: 15.99,
    merchant: 'Netflix',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('rent 1,800', {
    kind: 'bill',
    amount: 1800,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('Paid 45 bucks at Chipotle', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Chipotle',
    confidence: 'high',
    missing: [],
  }),
  row('Rent $1.2k due on the 5th', {
    kind: 'bill',
    amount: 1200,
    date: '2026-10-05',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('$1,234.56 at Target', {
    kind: 'receipt',
    amount: 1234.56,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
  row('Target $5', {
    kind: 'receipt',
    amount: 5,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
  row('Spent $.99 at 7-Eleven', {
    kind: 'receipt',
    amount: 0.99,
    merchant: '7-Eleven',
    confidence: 'high',
    missing: [],
  }),
  row('Spent 15.5 at CVS', {
    kind: 'receipt',
    amount: 15.5,
    merchant: 'CVS',
    confidence: 'high',
    missing: [],
  }),
  row('$2k for rent', {
    kind: 'bill',
    amount: 2000,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('Hulu $7.99/month', {
    kind: 'subscription',
    amount: 7.99,
    merchant: 'Hulu',
    cycle: 'monthly',
    confidence: 'high',
    missing: [],
  }),
  // A clock time with pm is a time, not $5.30.
  row('Spent $12.50 at 7-Eleven at 5:30 pm', {
    kind: 'receipt',
    amount: 12.5,
    merchant: '7-Eleven',
    confidence: 'high',
    missing: [],
  }),
  // iOS sometimes writes "fifteen ninety nine" as "15 99" and "twelve fifty" as "12:50".
  row('Netflix 15 99 a month', {
    kind: 'subscription',
    amount: 15.99,
    choices: [15.99, 1599],
    merchant: 'Netflix',
    cycle: 'monthly',
    confidence: 'medium',
    missing: ['amount'],
  }),
  row('Spent 12:50 at Starbucks', {
    kind: 'receipt',
    amount: 12.5,
    choices: [12.5, 1250],
    merchant: 'Starbucks',
    confidence: 'medium',
    missing: ['amount'],
  }),
  row('Comcast $80.00 monthly', {
    kind: 'bill',
    amount: 80,
    merchant: 'Xfinity',
    cycle: 'monthly',
    category: 'internet',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('$15', {
    kind: 'receipt',
    sure: false,
    amount: 15,
    confidence: 'medium',
    missing: ['merchant'],
  }),
];

const WORDS: Row[] = [
  row('forty five at target', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
  row('two hundred and five dollars at walmart', {
    kind: 'receipt',
    amount: 205,
    merchant: 'Walmart',
    confidence: 'high',
    missing: [],
  }),
  row('a grand for rent', {
    kind: 'bill',
    amount: 1000,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('eighteen hundred for rent', {
    kind: 'bill',
    amount: 1800,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('thirty seven hundred', {
    kind: 'receipt',
    sure: false,
    amount: 3700,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('twelve dollars and fifty cents at chipotle', {
    kind: 'receipt',
    amount: 12.5,
    merchant: 'Chipotle',
    confidence: 'high',
    missing: [],
  }),
  row('ninety nine cents at seven eleven', {
    kind: 'receipt',
    amount: 0.99,
    merchant: '7-Eleven',
    heard: 'seven eleven',
    confidence: 'high',
    missing: [],
  }),
  row('a buck fifty coffee', {
    kind: 'receipt',
    amount: 1.5,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('one point two k for rent', {
    kind: 'bill',
    amount: 1200,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('twelve hundred fifty rent', {
    kind: 'bill',
    amount: 1250,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('fifteen hundred for the mortgage', {
    kind: 'bill',
    amount: 1500,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('a hundred and fifty at costco', {
    kind: 'receipt',
    amount: 150,
    merchant: 'Costco',
    confidence: 'high',
    missing: [],
  }),
  row('two grand', {
    kind: 'receipt',
    sure: false,
    amount: 2000,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('five k for tuition', {
    kind: 'bill',
    amount: 5000,
    category: 'family',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('twelve point five at shell', {
    kind: 'receipt',
    amount: 12.5,
    merchant: 'Shell',
    confidence: 'high',
    missing: [],
  }),
  row('spent forty uh five at target', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
];

const AMBIGUOUS: Row[] = [
  row('twelve fifty at starbucks', {
    kind: 'receipt',
    amount: 12.5,
    choices: [12.5, 1250],
    merchant: 'Starbucks',
    confidence: 'medium',
    missing: ['amount'],
  }),
  // A bill pre-selects the hundreds reading.
  row('rent twelve fifty', {
    kind: 'bill',
    amount: 1250,
    choices: [12.5, 1250],
    category: 'housing',
    confidence: 'medium',
    missing: ['amount', 'date', 'cycle'],
  }),
  row('one twenty for the electric bill', {
    kind: 'bill',
    amount: 120,
    choices: [1.2, 120],
    category: 'energy',
    confidence: 'medium',
    missing: ['amount', 'date', 'cycle'],
  }),
  row('nine ninety nine for a new iphone at apple', {
    kind: 'receipt',
    amount: 9.99,
    choices: [9.99, 999],
    merchant: 'Apple',
    confidence: 'medium',
    missing: ['amount'],
  }),
  row('twelve oh five at cvs', {
    kind: 'receipt',
    amount: 12.05,
    choices: [12.05, 1205],
    merchant: 'CVS',
    confidence: 'medium',
    missing: ['amount'],
  }),
  // "bucks" after the pair is said of both readings.
  row('twelve fifty bucks at target', {
    kind: 'receipt',
    amount: 12.5,
    choices: [12.5, 1250],
    merchant: 'Target',
    confidence: 'medium',
    missing: ['amount'],
  }),
  row('paid forty fifty for gas', {
    kind: 'receipt',
    amount: 40.5,
    choices: [40.5, 4050],
    confidence: 'medium',
    missing: ['amount', 'merchant'],
  }),
  row('rent nineteen ninety nine', {
    kind: 'bill',
    amount: 1999,
    choices: [19.99, 1999],
    category: 'housing',
    confidence: 'medium',
    missing: ['amount', 'date', 'cycle'],
  }),
  // Two separate amounts: both offered, never summed.
  row('bought 2 for 30', {
    kind: 'receipt',
    amount: 2,
    choices: [2, 30],
    confidence: 'medium',
    missing: ['amount', 'merchant'],
  }),
  row('$12 for lunch and $8 for coffee', {
    kind: 'receipt',
    amount: 12,
    choices: [8, 12],
    confidence: 'medium',
    missing: ['amount', 'merchant'],
  }),
];

const SETTLED: Row[] = [
  row('twelve fifty cents at target', {
    kind: 'receipt',
    amount: 12.5,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
  row('twelve dollars fifty at target', {
    kind: 'receipt',
    amount: 12.5,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
  row('spent 30 on 3 coffees at starbucks', {
    kind: 'receipt',
    amount: 30,
    merchant: 'Starbucks',
    confidence: 'high',
    missing: [],
  }),
  row('comcast 80 for 300 megabits', {
    kind: 'bill',
    amount: 80,
    merchant: 'Xfinity',
    category: 'internet',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('netflix 15.99 for 4 screens', {
    kind: 'subscription',
    amount: 15.99,
    merchant: 'Netflix',
    confidence: 'medium',
    missing: ['cycle'],
  }),
];

const CORRECTIONS: Row[] = [
  row('comcast forty, no, fifty', {
    kind: 'bill',
    amount: 50,
    merchant: 'Xfinity',
    category: 'internet',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('paid 40 no wait 45 for gas', {
    kind: 'receipt',
    amount: 45,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('spent 40 actually it was 45 at shell', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Shell',
    confidence: 'high',
    missing: [],
  }),
  row('actually I spent 40 at target', {
    kind: 'receipt',
    amount: 40,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
  row('walmart no target 30', {
    kind: 'receipt',
    amount: 30,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
  row('spent 20 at target actually walmart', {
    kind: 'receipt',
    amount: 20,
    merchant: 'Walmart',
    confidence: 'high',
    missing: [],
  }),
  row('paid forty not fifty at target', {
    kind: 'receipt',
    amount: 40,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
  row('netflix 15.99 monthly no yearly', {
    kind: 'subscription',
    amount: 15.99,
    merchant: 'Netflix',
    cycle: 'yearly',
    confidence: 'high',
    missing: [],
  }),
  row('yesterday no today coffee 5 bucks at starbucks', {
    kind: 'receipt',
    amount: 5,
    merchant: 'Starbucks',
    date: '2026-10-01',
    confidence: 'high',
    missing: [],
  }),
  row('on the 5th no the 6th rent 1800', {
    kind: 'bill',
    amount: 1800,
    date: '2026-10-06',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('electric no water bill 45 due on the 10th', {
    kind: 'bill',
    amount: 45,
    date: '2026-10-10',
    category: 'water',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('forty no fifty no sixty at target', {
    kind: 'receipt',
    amount: 60,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
  row('target 30 sorry 35', {
    kind: 'receipt',
    amount: 35,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
  row('twelve fifty no thirteen fifty at target', {
    kind: 'receipt',
    amount: 13.5,
    choices: [13.5, 1350],
    merchant: 'Target',
    confidence: 'medium',
    missing: ['amount'],
  }),
];

const NO_FRILLS: Row[] = [
  row('No Frills groceries 40', {
    kind: 'receipt',
    amount: 40,
    merchant: 'No Frills',
    heard: 'no frills',
    confidence: 'high',
    missing: [],
  }),
  row('no frills 40 no 45', {
    kind: 'receipt',
    amount: 45,
    merchant: 'No Frills',
    confidence: 'high',
    missing: [],
  }),
  row('40 no frills', {
    kind: 'receipt',
    amount: 40,
    merchant: 'No Frills',
    confidence: 'high',
    missing: [],
  }),
  row('groceries at no frills 62.15', {
    kind: 'receipt',
    amount: 62.15,
    merchant: 'No Frills',
    confidence: 'high',
    missing: [],
  }),
];

const KINDS: Row[] = [
  row('bought water 3 bucks', {
    kind: 'receipt',
    amount: 3,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('water 45', {
    kind: 'bill',
    amount: 45,
    category: 'water',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('bought a phone at verizon 800', {
    kind: 'receipt',
    amount: 800,
    merchant: 'Verizon',
    confidence: 'high',
    missing: [],
  }),
  // Verizon sells phone and home internet, so no category is suggested.
  row('verizon 80 monthly', {
    kind: 'bill',
    amount: 80,
    merchant: 'Verizon',
    cycle: 'monthly',
    confidence: 'medium',
    missing: ['date', 'category'],
  }),
  row('geico 120 monthly', {
    kind: 'bill',
    amount: 120,
    merchant: 'GEICO',
    cycle: 'monthly',
    category: 'insurance',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('progressive insurance 140 a month', {
    kind: 'bill',
    amount: 140,
    merchant: 'Progressive',
    cycle: 'monthly',
    category: 'insurance',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('gym 40 a month', {
    kind: 'subscription',
    amount: 40,
    cycle: 'monthly',
    confidence: 'medium',
    missing: ['merchant'],
  }),
  // Gyms and delivery apps are paid both ways, so they do not decide the kind.
  row('planet fitness 10', {
    kind: 'receipt',
    sure: false,
    amount: 10,
    merchant: 'Planet Fitness',
    confidence: 'medium',
    missing: [],
  }),
  row('uber 25', {
    kind: 'receipt',
    sure: false,
    amount: 25,
    merchant: 'Uber',
    confidence: 'medium',
    missing: [],
  }),
  row('uber one 9.99 monthly', {
    kind: 'subscription',
    amount: 9.99,
    merchant: 'Uber',
    cycle: 'monthly',
    confidence: 'high',
    missing: [],
  }),
  row('icloud 2.99 monthly', {
    kind: 'subscription',
    amount: 2.99,
    merchant: 'Apple',
    heard: 'icloud',
    cycle: 'monthly',
    confidence: 'high',
    missing: [],
  }),
  row('my netflix bill is 15.49', {
    kind: 'subscription',
    amount: 15.49,
    merchant: 'Netflix',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  // A purchase word beats the brand's lean.
  row('spent 15.49 on netflix', {
    kind: 'receipt',
    amount: 15.49,
    merchant: 'Netflix',
    confidence: 'high',
    missing: [],
  }),
  // Recurring, but not a cycle the app stores.
  row('hulu every two weeks 8', {
    kind: 'subscription',
    amount: 8,
    merchant: 'Hulu',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('daycare 250 weekly', {
    kind: 'bill',
    amount: 250,
    cycle: 'weekly',
    category: 'family',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('car insurance 140 quarterly', {
    kind: 'bill',
    amount: 140,
    cycle: 'quarterly',
    category: 'insurance',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('costco membership 65 a year', {
    kind: 'subscription',
    amount: 65,
    merchant: 'Costco',
    heard: 'costco membership',
    cycle: 'yearly',
    confidence: 'high',
    missing: [],
  }),
  row('spent 200 at costco', {
    kind: 'receipt',
    amount: 200,
    merchant: 'Costco',
    confidence: 'high',
    missing: [],
  }),
  row('paid 1800 to my landlord on the 1st', {
    kind: 'bill',
    amount: 1800,
    date: '2026-10-01',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('coffee 5 bucks', {
    kind: 'receipt',
    amount: 5,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('paid the gas bill 60', {
    kind: 'bill',
    amount: 60,
    category: 'energy',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('gas 40 at shell', {
    kind: 'receipt',
    amount: 40,
    merchant: 'Shell',
    confidence: 'high',
    missing: [],
  }),
  row('duke energy 120 due on the 18th', {
    kind: 'bill',
    amount: 120,
    merchant: 'Duke Energy',
    date: '2026-10-18',
    category: 'energy',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('american water 45 a month', {
    kind: 'bill',
    amount: 45,
    merchant: 'American Water',
    cycle: 'monthly',
    category: 'water',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('chase card payment 300 due on the 25th', {
    kind: 'bill',
    amount: 300,
    merchant: 'Chase',
    date: '2026-10-25',
    category: 'loans',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('student loan 250 every month on the 12th', {
    kind: 'bill',
    amount: 250,
    date: '2026-10-12',
    cycle: 'monthly',
    category: 'loans',
    confidence: 'high',
    missing: [],
  }),
];

const DATES: Row[] = [
  row('target 45 three days ago', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2026-09-28',
    confidence: 'high',
    missing: [],
  }),
  row('target 45 last friday', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2026-09-25',
    confidence: 'high',
    missing: [],
  }),
  // A plain weekday runs back for a receipt...
  row('target 45 on monday', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2026-09-28',
    confidence: 'high',
    missing: [],
  }),
  // ...and forward for a bill.
  row('phone bill 60 due monday', {
    kind: 'bill',
    amount: 60,
    date: '2026-10-05',
    category: 'mobile',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('netflix next friday 15.99', {
    kind: 'subscription',
    amount: 15.99,
    merchant: 'Netflix',
    date: '2026-10-02',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('target 45 on the 5th', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2026-09-05',
    confidence: 'high',
    missing: [],
  }),
  row('rent 1800 due the 5th', {
    kind: 'bill',
    amount: 1800,
    date: '2026-10-05',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('target 45 on october 3rd', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2025-10-03',
    confidence: 'high',
    missing: [],
  }),
  row('phone bill 60 due october 3rd', {
    kind: 'bill',
    amount: 60,
    date: '2026-10-03',
    category: 'mobile',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('target 45 on 10/3', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2025-10-03',
    confidence: 'high',
    missing: [],
  }),
  row('target 45 october 3rd 2026', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2026-10-03',
    confidence: 'high',
    missing: [],
  }),
  row('the 3rd of october 45 at target', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2025-10-03',
    confidence: 'high',
    missing: [],
  }),
  row('target 45 a week ago', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2026-09-24',
    confidence: 'high',
    missing: [],
  }),
  row('target 45 the day before yesterday', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2026-09-29',
    confidence: 'high',
    missing: [],
  }),
  row('water bill 45 due in 3 days', {
    kind: 'bill',
    amount: 45,
    date: '2026-10-04',
    category: 'water',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  // Backward skips a month without the day: September has no 31st.
  row('target 45 on the 31st', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2026-08-31',
    confidence: 'high',
    missing: [],
  }),
  row('rent due on the 31st 1800', {
    kind: 'bill',
    amount: 1800,
    date: '2026-10-31',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('internet 70 due at the end of the month', {
    kind: 'bill',
    amount: 70,
    date: '2026-10-31',
    category: 'internet',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('target 45 at the end of the month', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2026-09-30',
    confidence: 'high',
    missing: [],
  }),
  // A calendar date that does not exist is no date.
  row('rent 1800 on september 31st', {
    kind: 'bill',
    amount: 1800,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('target 45 february 29th', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2024-02-29',
    confidence: 'high',
    missing: [],
  }),
  row('rent 1800 due february 29th', {
    kind: 'bill',
    amount: 1800,
    date: '2028-02-29',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('target 45 a month ago', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Target',
    date: '2026-09-01',
    confidence: 'high',
    missing: [],
  }),
];

// Past tense on a bill or subscription runs the date back.
const TENSE: Row[] = [
  row('netflix renewed on the 10th 15.99', {
    kind: 'subscription',
    amount: 15.99,
    merchant: 'Netflix',
    date: '2026-09-10',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('netflix renews on the 10th 15.99', {
    kind: 'subscription',
    amount: 15.99,
    merchant: 'Netflix',
    date: '2026-10-10',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('electric bill was due on the 5th 120', {
    kind: 'bill',
    amount: 120,
    date: '2026-09-05',
    category: 'energy',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('electric bill due on the 5th 120', {
    kind: 'bill',
    amount: 120,
    date: '2026-10-05',
    category: 'energy',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('paid rent on the 30th 1800', {
    kind: 'bill',
    amount: 1800,
    date: '2026-09-30',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('spotify charged me 11.99 on the 3rd', {
    kind: 'subscription',
    amount: 11.99,
    merchant: 'Spotify',
    date: '2026-09-03',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('spotify will charge 11.99 on the 3rd', {
    kind: 'subscription',
    amount: 11.99,
    merchant: 'Spotify',
    date: '2026-10-03',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  // "it was" in a correction is about the amount, not the tense.
  row('rent due on the 5th 1800 actually it was 1850', {
    kind: 'bill',
    amount: 1850,
    date: '2026-10-05',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('the water bill was on the 5th 45', {
    kind: 'bill',
    amount: 45,
    date: '2026-09-05',
    category: 'water',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('netflix renewed last friday 15.99', {
    kind: 'subscription',
    amount: 15.99,
    merchant: 'Netflix',
    date: '2026-09-25',
    confidence: 'medium',
    missing: ['cycle'],
  }),
];

const MONTH_ENDS: Row[] = [
  // Forward clamps a short month to its last day, as a monthly bill rolls.
  row(
    'rent 1800 due on the 30th',
    {
      kind: 'bill',
      amount: 1800,
      date: '2026-02-28',
      category: 'housing',
      confidence: 'medium',
      missing: ['cycle'],
    },
    { today: '2026-01-31' },
  ),
  row(
    'rent 1800 due on the 31st',
    {
      kind: 'bill',
      amount: 1800,
      date: '2026-02-28',
      category: 'housing',
      confidence: 'medium',
      missing: ['cycle'],
    },
    { today: '2026-02-10' },
  ),
  row(
    'phone bill 60 due on the 5th',
    {
      kind: 'bill',
      amount: 60,
      date: '2026-03-05',
      category: 'mobile',
      confidence: 'medium',
      missing: ['cycle'],
    },
    { today: '2026-02-10' },
  ),
  // Backward skips months without the day.
  row(
    'target 45 on the 31st',
    {
      kind: 'receipt',
      amount: 45,
      merchant: 'Target',
      date: '2026-01-31',
      confidence: 'high',
      missing: [],
    },
    { today: '2026-03-01' },
  ),
  row(
    'target 45 on the 29th',
    {
      kind: 'receipt',
      amount: 45,
      merchant: 'Target',
      date: '2026-01-29',
      confidence: 'high',
      missing: [],
    },
    { today: '2026-03-01' },
  ),
  row(
    'target 45 on the 29th',
    {
      kind: 'receipt',
      amount: 45,
      merchant: 'Target',
      date: '2028-02-29',
      confidence: 'high',
      missing: [],
    },
    { today: '2028-03-01' },
  ),
  row(
    'rent 1800 was due on the 30th',
    {
      kind: 'bill',
      amount: 1800,
      date: '2026-01-30',
      category: 'housing',
      confidence: 'medium',
      missing: ['cycle'],
    },
    { today: '2026-03-01' },
  ),
  row(
    'rent 1800 due on the 1st',
    {
      kind: 'bill',
      amount: 1800,
      date: '2027-01-01',
      category: 'housing',
      confidence: 'medium',
      missing: ['cycle'],
    },
    { today: '2026-12-31' },
  ),
  row(
    'target 45 january 2nd',
    {
      kind: 'receipt',
      amount: 45,
      merchant: 'Target',
      date: '2026-01-02',
      confidence: 'high',
      missing: [],
    },
    { today: '2026-12-31' },
  ),
  row(
    'target 45 on december 30th',
    {
      kind: 'receipt',
      amount: 45,
      merchant: 'Target',
      date: '2025-12-30',
      confidence: 'high',
      missing: [],
    },
    { today: '2026-01-02' },
  ),
  row(
    'target 45 a month ago',
    {
      kind: 'receipt',
      amount: 45,
      merchant: 'Target',
      date: '2026-02-28',
      confidence: 'high',
      missing: [],
    },
    { today: '2026-03-31' },
  ),
  row(
    'target 45 at the end of the month',
    {
      kind: 'receipt',
      amount: 45,
      merchant: 'Target',
      date: '2026-03-31',
      confidence: 'high',
      missing: [],
    },
    { today: '2026-03-31' },
  ),
  row(
    'internet 70 due at the end of the month',
    {
      kind: 'bill',
      amount: 70,
      date: '2026-02-28',
      category: 'internet',
      confidence: 'medium',
      missing: ['cycle'],
    },
    { today: '2026-02-10' },
  ),
];

const NUMBERS_VS_DATES: Row[] = [
  row('rent 1800', {
    kind: 'bill',
    amount: 1800,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('rent 1800 on the 1st', {
    kind: 'bill',
    amount: 1800,
    date: '2026-10-01',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  // 1800 is no year (2000–2099 only), so it stays the rent.
  row('october 3rd 1800 rent', {
    kind: 'bill',
    amount: 1800,
    date: '2026-10-03',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('on the 5 rent 1800', {
    kind: 'bill',
    amount: 1800,
    date: '2026-10-05',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('target 5 on the 5th', {
    kind: 'receipt',
    amount: 5,
    merchant: 'Target',
    date: '2026-09-05',
    confidence: 'high',
    missing: [],
  }),
  // "every 3 months" is a cycle, not $3.
  row('car insurance 300 every 3 months', {
    kind: 'bill',
    amount: 300,
    cycle: 'quarterly',
    category: 'insurance',
    confidence: 'medium',
    missing: ['date'],
  }),
];

const MERCHANTS: Row[] = [
  // Aliases read back as the brand's own name: Comcast is Xfinity, Amazon Prime is Amazon.
  row('Comcast $79.99, due on the 20th every month', {
    kind: 'bill',
    amount: 79.99,
    merchant: 'Xfinity',
    heard: 'comcast',
    date: '2026-10-20',
    cycle: 'monthly',
    category: 'internet',
    confidence: 'high',
    missing: [],
  }),
  row('Amazon Prime $139 a year', {
    kind: 'subscription',
    amount: 139,
    merchant: 'Amazon',
    heard: 'amazon prime',
    cycle: 'yearly',
    confidence: 'high',
    missing: [],
  }),
  row('7-Eleven 12.40', {
    kind: 'receipt',
    amount: 12.4,
    merchant: '7-Eleven',
    heard: '7 eleven',
    confidence: 'high',
    missing: [],
  }),
  row('seven eleven twelve forty', {
    kind: 'receipt',
    amount: 12.4,
    choices: [12.4, 1240],
    merchant: '7-Eleven',
    heard: 'seven eleven',
    confidence: 'medium',
    missing: ['amount'],
  }),
  row('24 Hour Fitness $39.99 a month', {
    kind: 'subscription',
    amount: 39.99,
    merchant: '24 Hour Fitness',
    cycle: 'monthly',
    confidence: 'high',
    missing: [],
  }),
  row('twenty four hour fitness 40 monthly', {
    kind: 'subscription',
    amount: 40,
    merchant: '24 Hour Fitness',
    heard: 'twenty four hour fitness',
    cycle: 'monthly',
    confidence: 'high',
    missing: [],
  }),
  row('come cast 80 monthly', {
    kind: 'bill',
    amount: 80,
    merchant: 'Xfinity',
    heard: 'come cast',
    cycle: 'monthly',
    category: 'internet',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('spent 40 at joes diner', {
    kind: 'receipt',
    amount: 40,
    merchant: 'Joes Diner',
    heard: 'joes diner',
    confidence: 'high',
    missing: [],
  }),
  row("spent 40 at joe's diner", {
    kind: 'receipt',
    amount: 40,
    merchant: "Joe's Diner",
    confidence: 'high',
    missing: [],
  }),
  row('at the store 30', {
    kind: 'receipt',
    sure: false,
    amount: 30,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('a medium coffee 4 bucks', {
    kind: 'receipt',
    amount: 4,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('medium subscription 5 a month', {
    kind: 'subscription',
    amount: 5,
    merchant: 'Medium',
    cycle: 'monthly',
    confidence: 'high',
    missing: [],
  }),
  row('bought lemonade 3 bucks', {
    kind: 'receipt',
    amount: 3,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('lemonade insurance 25 monthly', {
    kind: 'bill',
    amount: 25,
    merchant: 'Lemonade',
    cycle: 'monthly',
    category: 'insurance',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('office supplies 40', {
    kind: 'receipt',
    sure: false,
    amount: 40,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('microsoft office 99.99 a year', {
    kind: 'subscription',
    amount: 99.99,
    merchant: 'Microsoft',
    cycle: 'yearly',
    confidence: 'high',
    missing: [],
  }),
  row('max 15.99 a month', {
    kind: 'subscription',
    amount: 15.99,
    cycle: 'monthly',
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('hbo max 15.99 a month', {
    kind: 'subscription',
    amount: 15.99,
    merchant: 'HBO Max',
    cycle: 'monthly',
    confidence: 'high',
    missing: [],
  }),
  row('T-Mobile $70 a month', {
    kind: 'bill',
    amount: 70,
    merchant: 'T-Mobile',
    cycle: 'monthly',
    category: 'mobile',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('shell out 45 for dinner', {
    kind: 'receipt',
    amount: 45,
    confidence: 'medium',
    missing: ['merchant'],
  }),
];

// Several guesses: the best score wins, a tie goes to the earlier one.
const ALTERNATIVES: Row[] = [
  // Tied guesses that heard different amounts: both amounts offered.
  row(['forty fife for gas', 'forty five for gas'], {
    kind: 'receipt',
    amount: 40,
    choices: [40, 45],
    confidence: 'medium',
    missing: ['amount', 'merchant'],
    transcript: 'forty fife for gas',
  }),
  // #2 beats #1 on merchant and cycle.
  row(['fifteen ninety nine every mouth', 'netflix fifteen ninety nine every month'], {
    kind: 'subscription',
    amount: 15.99,
    choices: [15.99, 1599],
    merchant: 'Netflix',
    cycle: 'monthly',
    confidence: 'medium',
    missing: ['amount'],
    transcript: 'netflix fifteen ninety nine every month',
  }),
  row(['spent 12.50 at star bucks', 'spent 1250 at starbucks'], {
    kind: 'receipt',
    amount: 12.5,
    choices: [12.5, 1250],
    merchant: 'Starbucks',
    confidence: 'medium',
    missing: ['amount'],
    transcript: 'spent 12.50 at star bucks',
  }),
  // #2 beats #1 on the spoken date.
  row(['rent 1800', 'rent 1800 due on the first'], {
    kind: 'bill',
    amount: 1800,
    date: '2026-10-01',
    category: 'housing',
    confidence: 'medium',
    missing: ['cycle'],
    transcript: 'rent 1800 due on the first',
  }),
  row(['', 'Netflix $15.99 every month'], {
    kind: 'subscription',
    amount: 15.99,
    merchant: 'Netflix',
    cycle: 'monthly',
    confidence: 'high',
    missing: [],
    transcript: 'Netflix $15.99 every month',
  }),
  // A tie with the same amount keeps the earlier guess as it is.
  row(['comcast 80', 'come cast 80'], {
    kind: 'bill',
    amount: 80,
    merchant: 'Xfinity',
    heard: 'comcast',
    category: 'internet',
    confidence: 'medium',
    missing: ['date', 'cycle'],
    transcript: 'comcast 80',
  }),
  row(['40 at walmart', '14 at walmart'], {
    kind: 'receipt',
    amount: 40,
    choices: [14, 40],
    merchant: 'Walmart',
    confidence: 'medium',
    missing: ['amount'],
    transcript: '40 at walmart',
  }),
  row(['hello there', 'um'], {
    kind: 'receipt',
    sure: false,
    amount: null,
    confidence: 'low',
    missing: ['amount', 'merchant'],
    transcript: 'hello there',
  }),
];

// The kind the person picked on the review page.
const FORCED: Row[] = [
  row(
    'netflix 15.99 on the 10th',
    {
      kind: 'bill',
      sure: true,
      amount: 15.99,
      merchant: 'Netflix',
      date: '2026-10-10',
      confidence: 'medium',
      missing: ['cycle', 'category'],
    },
    { force: 'bill' },
  ),
  row(
    'electric 85 on the 5th',
    {
      kind: 'receipt',
      amount: 85,
      date: '2026-09-05',
      confidence: 'medium',
      missing: ['merchant'],
    },
    { force: 'receipt' },
  ),
  row(
    'rent twelve fifty',
    {
      kind: 'receipt',
      amount: 12.5,
      choices: [12.5, 1250],
      confidence: 'medium',
      missing: ['amount', 'merchant'],
    },
    { force: 'receipt' },
  ),
  row(
    'rent twelve fifty',
    {
      kind: 'bill',
      amount: 1250,
      choices: [12.5, 1250],
      category: 'housing',
      confidence: 'medium',
      missing: ['amount', 'date', 'cycle'],
    },
    { force: 'bill' },
  ),
  row(
    'comcast 80 monthly',
    {
      kind: 'subscription',
      amount: 80,
      merchant: 'Xfinity',
      cycle: 'monthly',
      confidence: 'high',
      missing: [],
    },
    { force: 'subscription' },
  ),
  row(
    'netflix 15.99 every month',
    { kind: 'receipt', amount: 15.99, merchant: 'Netflix', confidence: 'high', missing: [] },
    { force: 'receipt' },
  ),
  row(
    '',
    {
      kind: 'bill',
      sure: true,
      amount: null,
      confidence: 'low',
      missing: ['amount', 'date', 'cycle', 'category'],
    },
    { force: 'bill' },
  ),
];

const ALIASES: Row[] = [
  row(
    'spot a fly 9.99 a month',
    {
      kind: 'subscription',
      amount: 9.99,
      merchant: 'Spotify',
      heard: 'spot a fly',
      cycle: 'monthly',
      confidence: 'high',
      missing: [],
    },
    { aliases: { 'spot a fly': 'Spotify' } },
  ),
  row(
    'lunch at joes 20',
    {
      kind: 'receipt',
      amount: 20,
      merchant: "Joe's Diner",
      heard: 'joes',
      confidence: 'high',
      missing: [],
    },
    { aliases: { joes: "Joe's Diner" } },
  ),
  // An integer-like heard phrase.
  row(
    '711 12.40',
    {
      kind: 'receipt',
      amount: 12.4,
      merchant: '7-Eleven',
      heard: '711',
      confidence: 'high',
      missing: [],
    },
    { aliases: { '711': '7-Eleven' } },
  ),
  row(
    'spot a fly 9.99',
    {
      kind: 'subscription',
      amount: 9.99,
      merchant: 'Spotify',
      confidence: 'medium',
      missing: ['cycle'],
    },
    { aliases: { spotafly: 'Spotify' } },
  ),
];

// A digit past the cent is never rounded into an amount: gas is priced to three decimals, and
// "$3.46" would be a figure nobody said.
const PAST_THE_CENT: Row[] = [
  row('Paid $3.459 at Shell', {
    kind: 'receipt',
    amount: null,
    merchant: 'Shell',
    confidence: 'low',
    missing: ['amount'],
  }),
  row('spent $12.345 at Target', {
    kind: 'receipt',
    amount: null,
    merchant: 'Target',
    confidence: 'low',
    missing: ['amount'],
  }),
  row('$12.345', {
    kind: 'receipt',
    sure: false,
    amount: null,
    confidence: 'low',
    missing: ['amount', 'merchant'],
  }),
  row('spent 1.005 at Target', {
    kind: 'receipt',
    amount: null,
    merchant: 'Target',
    confidence: 'low',
    missing: ['amount'],
  }),
  row('Starbucks twelve point nine nine nine', {
    kind: 'receipt',
    amount: null,
    merchant: 'Starbucks',
    confidence: 'low',
    missing: ['amount'],
  }),
  row('twelve point nine nine nine', {
    kind: 'receipt',
    sure: false,
    amount: null,
    confidence: 'low',
    missing: ['amount', 'merchant'],
  }),
  row('$3.459 a gallon, $45.20 total at Shell', {
    kind: 'receipt',
    amount: 45.2,
    merchant: 'Shell',
    confidence: 'high',
    missing: [],
  }),
  row('45 bucks for gas at Shell, 3.459 a gallon', {
    kind: 'receipt',
    amount: 45,
    merchant: 'Shell',
    confidence: 'high',
    missing: [],
  }),
  // Trailing zeros are still whole cents, and a scale can make a figure whole.
  row('spent $3.450 at Shell', {
    kind: 'receipt',
    amount: 3.45,
    merchant: 'Shell',
    confidence: 'high',
    missing: [],
  }),
  row('rent $1.2345k', {
    kind: 'bill',
    amount: 1234.5,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('rent 1.2345 thousand', {
    kind: 'bill',
    amount: 1234.5,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('rent one point two three four five k', {
    kind: 'bill',
    amount: 1234.5,
    category: 'housing',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('rent $1.234567k', {
    kind: 'bill',
    amount: null,
    category: 'housing',
    confidence: 'low',
    missing: ['amount', 'date', 'cycle'],
  }),
];

// A bare number straight before a money figure cannot be read as one amount.
const RUN_ON: Row[] = [
  row('Target twelve fifty thousand', {
    kind: 'receipt',
    amount: null,
    merchant: 'Target',
    confidence: 'low',
    missing: ['amount'],
  }),
  row('rent twelve fifty million', {
    kind: 'bill',
    amount: null,
    category: 'housing',
    confidence: 'low',
    missing: ['amount', 'date', 'cycle'],
  }),
  row('twelve $50 at target', {
    kind: 'receipt',
    amount: null,
    merchant: 'Target',
    confidence: 'low',
    missing: ['amount'],
  }),
  // Not side by side: the correction and the marked figure read as before.
  row('twelve no $50 at target', {
    kind: 'receipt',
    amount: 50,
    merchant: 'Target',
    confidence: 'high',
    missing: [],
  }),
];

const SOURCES: Row[] = [
  row('$40 at Target', {
    kind: 'receipt',
    amount: 40,
    merchant: 'Target',
    source: 'catalog',
    confidence: 'high',
    missing: [],
  }),
  row('comcast 80 monthly', {
    kind: 'bill',
    amount: 80,
    merchant: 'Xfinity',
    heard: 'comcast',
    source: 'catalog',
    cycle: 'monthly',
    category: 'internet',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('come cast 80 monthly', {
    kind: 'bill',
    amount: 80,
    merchant: 'Xfinity',
    source: 'fuzzy',
    cycle: 'monthly',
    category: 'internet',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('spent 40 at joes diner', {
    kind: 'receipt',
    amount: 40,
    merchant: 'Joes Diner',
    source: 'heard',
    confidence: 'high',
    missing: [],
  }),
  row(
    'lunch at joes 20',
    {
      kind: 'receipt',
      amount: 20,
      merchant: "Joe's Diner",
      source: 'learned',
      confidence: 'high',
      missing: [],
    },
    { aliases: { joes: "Joe's Diner" } },
  ),
  // A learned phrase never turns a catalog name into another store...
  row(
    'spent $5 at Target',
    {
      kind: 'receipt',
      amount: 5,
      merchant: 'Target',
      source: 'catalog',
      confidence: 'high',
      missing: [],
    },
    { aliases: { target: 'Walmart' } },
  ),
  row(
    'comcast 80 monthly',
    {
      kind: 'bill',
      amount: 80,
      merchant: 'Xfinity',
      source: 'catalog',
      cycle: 'monthly',
      category: 'internet',
      confidence: 'medium',
      missing: ['date'],
    },
    { aliases: { comcast: 'AT&T' } },
  ),
  // ...but a longer learned phrase still names what the catalog does not.
  row(
    'glasses at target optical 200',
    {
      kind: 'receipt',
      amount: 200,
      merchant: 'Target Optical',
      heard: 'target optical',
      source: 'learned',
      confidence: 'high',
      missing: [],
    },
    { aliases: { 'target optical': 'Target Optical' } },
  ),
  row('hello there', {
    kind: 'receipt',
    amount: null,
    source: null,
    heard: null,
    confidence: 'low',
    missing: ['amount', 'merchant'],
  }),
];

// A card or wallet after payment words ("on my Amex", "with Apple Pay") is never the merchant, so
// the store named with "at" stands.
const SPOTIFY: Record<string, string> = { 'spot a fly': 'Spotify' };
const PAID_WITH: Row[] = [
  row(
    'paid $20 at spot a fly on my Amex',
    {
      kind: 'receipt',
      amount: 20,
      merchant: 'Spotify',
      source: 'learned',
      confidence: 'high',
      missing: [],
    },
    { aliases: SPOTIFY },
  ),
  row('paid $20 at spot a fly on my Amex', {
    kind: 'receipt',
    amount: 20,
    merchant: 'Spotify',
    source: 'fuzzy',
    confidence: 'high',
    missing: [],
  }),
  row(
    'paid $20 at spot a fly with Apple Pay',
    {
      kind: 'receipt',
      amount: 20,
      merchant: 'Spotify',
      source: 'learned',
      confidence: 'high',
      missing: [],
    },
    { aliases: SPOTIFY },
  ),
  row(
    'paid $20 at spot a fly on my Chase card',
    {
      kind: 'receipt',
      amount: 20,
      merchant: 'Spotify',
      source: 'learned',
      confidence: 'high',
      missing: [],
    },
    { aliases: SPOTIFY },
  ),
  row("$20 at Joe's Diner on my Amex", {
    kind: 'receipt',
    amount: 20,
    merchant: "Joe's Diner",
    source: 'heard',
    confidence: 'high',
    missing: [],
  }),
  // Apple the store, not Apple the wallet.
  row('$999 at the Apple Store with my Visa', {
    kind: 'receipt',
    amount: 999,
    merchant: 'Apple',
    heard: 'apple store',
    source: 'catalog',
    confidence: 'high',
    missing: [],
  }),
  row('$999 at the Apple Store with Apple Pay', {
    kind: 'receipt',
    amount: 999,
    merchant: 'Apple',
    heard: 'apple store',
    source: 'catalog',
    confidence: 'high',
    missing: [],
  }),
  row('spent 40 at target using my chase card', {
    kind: 'receipt',
    amount: 40,
    merchant: 'Target',
    source: 'catalog',
    confidence: 'high',
    missing: [],
  }),
  // A card or wallet alone names how, not where: no merchant.
  row('$20 on my Amex', {
    kind: 'receipt',
    sure: false,
    amount: 20,
    source: null,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('$20 with Apple Pay', {
    kind: 'receipt',
    sure: false,
    amount: 20,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('google pay 20', {
    kind: 'receipt',
    sure: false,
    amount: 20,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  // Not payment methods: the card's own bill, and "with" naming the company.
  row('paid 300 to chase', {
    kind: 'bill',
    amount: 300,
    merchant: 'Chase',
    category: 'loans',
    confidence: 'medium',
    missing: ['date', 'cycle'],
  }),
  row('amex 300 due on the 15th', {
    kind: 'bill',
    amount: 300,
    merchant: 'American Express',
    date: '2026-10-15',
    category: 'loans',
    confidence: 'medium',
    missing: ['cycle'],
  }),
  row('insurance with geico 120 a month', {
    kind: 'bill',
    amount: 120,
    merchant: 'GEICO',
    cycle: 'monthly',
    category: 'insurance',
    confidence: 'medium',
    missing: ['date'],
  }),
  row('subscription with netflix 15.99 a month', {
    kind: 'subscription',
    amount: 15.99,
    merchant: 'Netflix',
    cycle: 'monthly',
    confidence: 'high',
    missing: [],
  }),
];

// Beside a total, the total settles. Alone, a unit price is not offered: one figure cannot be
// "offered but unsettled", and a per-gallon price would otherwise settle as the amount.
const UNIT_PRICES: Row[] = [
  row('$3.45 a gallon, $45.20 total at Shell', {
    kind: 'receipt',
    amount: 45.2,
    merchant: 'Shell',
    confidence: 'high',
    missing: [],
  }),
  row('$45.20 total, $3.45 a gallon at Shell', {
    kind: 'receipt',
    amount: 45.2,
    merchant: 'Shell',
    confidence: 'high',
    missing: [],
  }),
  row('45.20 total, 3.459 a gallon', {
    kind: 'receipt',
    sure: false,
    amount: 45.2,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  // Over two decimals is still never an amount, unit price or not.
  row('$3.459 a gallon, $45.20 total', {
    kind: 'receipt',
    sure: false,
    amount: 45.2,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('$12 each for 3 tickets, $36 total', {
    kind: 'receipt',
    sure: false,
    amount: 36,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  row('$4 a pound, $10.40 at Whole Foods', {
    kind: 'receipt',
    amount: 10.4,
    merchant: 'Whole Foods',
    source: 'heard',
    confidence: 'high',
    missing: [],
  }),
  row('hotel $150 per night, $450 total', {
    kind: 'receipt',
    sure: false,
    amount: 450,
    confidence: 'medium',
    missing: ['merchant'],
  }),
  // A unit price alone: no amount, so the person says or types what they paid.
  row('$3.45 a gallon at Shell', {
    kind: 'receipt',
    amount: null,
    merchant: 'Shell',
    confidence: 'low',
    missing: ['amount'],
  }),
  row('$20 each', {
    kind: 'receipt',
    sure: false,
    amount: null,
    confidence: 'low',
    missing: ['amount', 'merchant'],
  }),
  // Tips and tax are out of scope: the pick is unchanged.
  row('$40 plus $5 tip at Olive Garden', {
    kind: 'receipt',
    amount: 40,
    choices: [5, 40],
    merchant: 'Olive Garden',
    confidence: 'medium',
    missing: ['amount'],
  }),
];

const GARBAGE: Row[] = [
  '',
  'um',
  'hello there',
  'uh um like you know',
  '!!!',
  'wait a second',
  'the',
  '$',
].map((says) =>
  row(says, {
    kind: 'receipt',
    sure: false,
    amount: null,
    confidence: 'low',
    missing: ['amount', 'merchant'],
    transcript: says,
  }),
);

const TABLE: Row[] = [
  ...PLAN,
  ...TRY_SAYING,
  ...DIGITS,
  ...WORDS,
  ...AMBIGUOUS,
  ...SETTLED,
  ...CORRECTIONS,
  ...NO_FRILLS,
  ...KINDS,
  ...DATES,
  ...TENSE,
  ...MONTH_ENDS,
  ...NUMBERS_VS_DATES,
  ...MERCHANTS,
  ...ALTERNATIVES,
  ...FORCED,
  ...ALIASES,
  ...PAST_THE_CENT,
  ...RUN_ON,
  ...SOURCES,
  ...PAID_WITH,
  ...UNIT_PRICES,
  ...GARBAGE,
];

function parse(entry: Row): VoiceDraft {
  return parseVoice(Array.isArray(entry.says) ? entry.says : [entry.says], {
    today: entry.today ?? TODAY,
    directory: DIRECTORY,
    aliases: entry.aliases ?? {},
    forceKind: entry.force,
  });
}

function label(entry: Row): string {
  const said = JSON.stringify(entry.says);
  const today = entry.today ? ` on ${entry.today}` : '';
  const force = entry.force ? ` as ${entry.force}` : '';
  return `${said}${today}${force}`;
}

describe('parseVoice fixture table', () => {
  it('has at least 100 sentences', () => {
    expect(TABLE.length).toBeGreaterThanOrEqual(100);
  });

  it.each(TABLE.map((entry) => [label(entry), entry] as const))('%s', (_, entry) => {
    const draft = parse(entry);
    const { want } = entry;

    const actual: Record<string, unknown> = {
      kind: draft.kind,
      amount: draft.amount,
      choices: draft.amountChoices,
      merchant: draft.merchant?.name ?? null,
      date: draft.date,
      cycle: draft.cycle,
      category: draft.billCategoryId,
      confidence: draft.confidence,
      missing: draft.missing,
    };
    const expected: Record<string, unknown> = {
      kind: want.kind,
      amount: want.amount,
      choices: want.choices ?? [],
      merchant: want.merchant ?? null,
      date: want.date ?? null,
      cycle: want.cycle ?? null,
      category: want.category ?? null,
      confidence: want.confidence,
      missing: want.missing,
    };
    if (want.sure !== undefined) {
      actual.sure = draft.kindSure;
      expected.sure = want.sure;
    }
    if (want.heard !== undefined) {
      actual.heard = draft.merchantHeard;
      expected.heard = want.heard;
    }
    if (want.source !== undefined) {
      actual.source = draft.merchantSource;
      expected.source = want.source;
    }
    if (want.transcript !== undefined) {
      actual.transcript = draft.transcript;
      expected.transcript = want.transcript;
    }
    expect(actual).toEqual(expected);
  });
});

describe('parseVoice invariants, over every row', () => {
  const drafts = TABLE.map(parse);

  it('gives cent-exact amounts and choices', () => {
    for (const draft of drafts) {
      for (const value of [draft.amount, ...draft.amountChoices]) {
        if (value === null) continue;
        expect(fromCents(toCents(value))).toBe(value);
        expect(value).toBeGreaterThan(0);
      }
    }
  });

  it('offers choices only when there are two or more, ascending, with the amount among them', () => {
    for (const draft of drafts) {
      if (draft.amountChoices.length === 0) continue;
      expect(draft.amountChoices.length).toBeGreaterThanOrEqual(2);
      expect([...draft.amountChoices].sort((a, b) => a - b)).toEqual(draft.amountChoices);
      expect(draft.amountChoices).toContain(draft.amount);
    }
  });

  it('never counts an ambiguous amount as settled', () => {
    for (const draft of drafts) {
      const unsettled = draft.amount === null || draft.amountChoices.length > 0;
      expect(draft.missing.includes('amount')).toBe(unsettled);
    }
  });

  it('scores by the brief: amount 40, kind 25, merchant 20, spoken date 15', () => {
    for (const draft of drafts) {
      const expected =
        (draft.amount !== null ? WEIGHTS.amount : 0) +
        (draft.kindSure ? WEIGHTS.kind : 0) +
        (draft.merchant !== null ? WEIGHTS.merchant : 0) +
        (draft.date !== null ? WEIGHTS.date : 0);
      expect(draft.score).toBe(expected);
    }
  });

  it('is high only with an amount, a score of 75+ and nothing missing', () => {
    for (const draft of drafts) {
      if (draft.confidence === 'high') {
        expect(draft.amount).not.toBeNull();
        expect(draft.score).toBeGreaterThanOrEqual(75);
        expect(draft.missing).toEqual([]);
      }
      if (draft.amount === null) expect(draft.confidence).toBe('low');
    }
  });

  it('keeps cycle off receipts and category off everything but bills', () => {
    for (const draft of drafts) {
      if (draft.kind === 'receipt') expect(draft.cycle).toBeNull();
      if (draft.kind !== 'bill') expect(draft.billCategoryId).toBeNull();
    }
  });

  it('flags several transactions as a boolean, and no row of this table is several', () => {
    for (const draft of drafts) {
      expect(typeof draft.multiple).toBe('boolean');
      expect(draft.multiple).toBe(false);
    }
  });

  it('reports what was heard as the merchant, and how it was found, whenever there is one', () => {
    for (const draft of drafts) {
      expect(draft.merchantHeard === null).toBe(draft.merchant === null);
      expect(draft.merchantSource === null).toBe(draft.merchant === null);
      if (draft.merchantSource === 'catalog' || draft.merchantSource === 'fuzzy') {
        expect(draft.merchant?.brandId).not.toBeNull();
      }
      if (draft.merchantSource === 'heard') expect(draft.merchant?.brandId).toBeNull();
    }
  });
});

describe('parseVoice never throws', () => {
  it('survives a malformed context and malformed directory rows', () => {
    const draft = parseVoice(['netflix 15.99 on the 5th'], {
      today: 'not a date',
      directory: [
        {} as never,
        null as never,
        { id: 'x', name: 42, category_id: 'other' } as never,
        ...DIRECTORY,
      ],
      aliases: null as never,
    });
    expect(draft.amount).toBe(15.99);
    expect(draft.merchant?.name).toBe('Netflix');
    expect(draft.date).toBeNull();
  });

  it('survives no alternatives at all', () => {
    expect(parseVoice([], { today: TODAY, directory: DIRECTORY, aliases: {} }).confidence).toBe(
      'low',
    );
    expect(
      parseVoice(undefined as never, { today: TODAY, directory: DIRECTORY, aliases: {} })
        .transcript,
    ).toBe('');
  });

  it('ignores a forceKind that is not a kind', () => {
    const draft = parseVoice(['netflix 15.99'], {
      today: TODAY,
      directory: DIRECTORY,
      aliases: {},
      forceKind: 'salary' as never,
    });
    expect(draft.kind).toBe('subscription');
  });
});

/**
 * The review page learns (merchantHeard → the name the person chose) after a save, except when
 * merchantSource is 'catalog' (the rule documented on learnAlias).
 */
describe('learning from corrections', () => {
  const said = (text: string, pairs: AliasPair[]) =>
    parseVoice([text], {
      today: TODAY,
      directory: DIRECTORY,
      aliases: Object.fromEntries(pairs),
    });

  /** What the review page does after a save where the merchant was changed to `chosen`. */
  const save = (pairs: AliasPair[], draft: VoiceDraft, chosen: string): AliasPair[] =>
    draft.merchantHeard === null || draft.merchantSource === 'catalog'
      ? pairs
      : learnAlias(pairs, draft.merchantHeard, chosen);

  it('Target → Walmart → back to Target: an exact catalog name is never overridden', () => {
    let pairs: AliasPair[] = [];

    const first = said('spent $5 at Target', pairs);
    expect([first.merchant?.name, first.merchantSource]).toEqual(['Target', 'catalog']);

    // Changed to Walmart once: a catalog match is a change of mind, not a mishearing.
    pairs = save(pairs, first, 'Walmart');
    expect(pairs).toEqual([]);

    const second = said('spent $8 at Target', pairs);
    expect([second.merchant?.name, second.merchantSource, second.confidence]).toEqual([
      'Target',
      'catalog',
      'high',
    ]);

    pairs = save(pairs, second, 'Target');
    expect(pairs).toEqual([]);
    expect(said('spent $3 at Target', pairs).merchant?.name).toBe('Target');
  });

  it('heals even if the pair was stored before the rule, and correcting back removes it', () => {
    let pairs: AliasPair[] = [['target', 'Walmart']];
    // The parser keeps the catalog's own name over a learned one for the same words.
    expect(said('spent $5 at Target', pairs).merchant?.name).toBe('Target');
    pairs = learnAlias(pairs, 'target', 'Target');
    expect(pairs).toEqual([]);
  });

  it('spot a fly → Spotify → "Spot A Fly": learned, then un-learned', () => {
    let pairs: AliasPair[] = [];

    const first = said('spot a fly 9.99 a month', pairs);
    expect([first.merchant?.name, first.merchantSource, first.merchantHeard]).toEqual([
      'Spotify',
      'fuzzy',
      'spot a fly',
    ]);

    pairs = save(pairs, first, 'Spotify');
    expect(pairs).toEqual([['spot a fly', 'Spotify']]);

    const second = said('spot a fly 9.99 a month', pairs);
    expect([second.merchant?.name, second.merchantSource]).toEqual(['Spotify', 'learned']);

    pairs = save(pairs, second, 'Spot A Fly');
    expect(pairs).toEqual([]);
    expect(said('spot a fly 9.99 a month', pairs).merchantSource).toBe('fuzzy');
  });

  it('learns a name the catalog does not know, from the words used as said', () => {
    let pairs: AliasPair[] = [];
    const first = said('spent 40 at joes diner', pairs);
    expect(first.merchantSource).toBe('heard');
    pairs = save(pairs, first, "Joe's Diner");
    expect(pairs).toEqual([['joes diner', "Joe's Diner"]]);
    const second = said('dinner at joes diner 60', pairs);
    expect([second.merchant?.name, second.merchantSource]).toEqual(["Joe's Diner", 'learned']);
  });

  it('never learns from a catalog alias either: Comcast changed to AT&T stays Comcast', () => {
    const first = said('comcast 80 monthly', []);
    expect(first.merchantSource).toBe('catalog');
    expect(save([], first, 'AT&T')).toEqual([]);
  });
});

// Conservative: a false "several" blocks a valid entry, a miss still reaches review (see
// multiple.ts).
describe('several transactions in one sentence', () => {
  const said = (text: string) =>
    parseVoice([text], { today: TODAY, directory: DIRECTORY, aliases: {} });

  it.each([
    'Netflix 15.99 and Spotify 11.99',
    '$12 at Starbucks and $40 at Target',
    'Netflix and Hulu, 15.99 and 7.99',
    'Netflix 15.99 and Hulu 15.99',
    'spent 40 at Target, then 25 at Chipotle',
    // A correction inside one of them does not hide the other.
    'Netflix 15.99 no 16.99 and Hulu 7.99',
    'rent 1800 and electric bill 85',
    'electric bill $85 due on the 15th, water bill $40 due on the 20th',
    'comcast internet 80 and rent 1800',
    'Netflix 15.99 and rent 1800',
    "spent 40 at Joe's Diner and rent 1800",
  ])('%j is several', (text) => {
    expect(said(text).multiple).toBe(true);
  });

  it.each([
    // [said, amount, choices, merchant]
    ['forty no fifty at Shell', 50, [], 'Shell'],
    ['Netflix, actually Hulu, 7.99', 7.99, [], 'Hulu'],
    ['$3.459 a gallon, $45.20 total at Shell', 45.2, [], 'Shell'],
    // Unit price left out of the amount pick: the total settles.
    ['$3.45 a gallon, $45.20 total at Shell', 45.2, [], 'Shell'],
    ['$40 plus $5 tip at Olive Garden', 40, [5, 40], 'Olive Garden'],
    ['$20 and $1.60 tax at Target', 20, [1.6, 20], 'Target'],
    ['rent 1800 and a 50 late fee', 1800, [], null],
    ['Target 40 and 60', 40, [40, 60], 'Target'],
    ['paid $20 at Target on my Amex', 20, [], 'Target'],
    ['twelve fifty at Starbucks', 12.5, [12.5, 1250], 'Starbucks'],
    ['car insurance 300 every 3 months', 300, [], null],
    ['rent 1800 on the 1st and 15th', 1800, [], null],
    ['Netflix and Hulu 15.99', 15.99, [], 'Netflix'],
    ['Progressive insurance 140 a month, 1680 a year', 140, [140, 1680], 'Progressive'],
    ['Netflix 15.99 a month, 191.88 a year', 15.99, [15.99, 191.88], 'Netflix'],
    ['water and sewer 60 and 40', 60, [40, 60], null],
    ['$12 for lunch and $8 for coffee', 12, [8, 12], null],
    ['comcast 80 for 300 megabits', 80, [], 'Xfinity'],
    ['spent 30 on 3 coffees at starbucks', 30, [], 'Starbucks'],
  ])('%j is one: $%s', (text, amount, choices, merchant) => {
    const draft = said(text);
    expect({
      multiple: draft.multiple,
      amount: draft.amount,
      choices: draft.amountChoices,
      merchant: draft.merchant?.name ?? null,
    }).toEqual({ multiple: false, amount, choices, merchant });
  });

  it('is false on an empty draft and on every guess that heard nothing', () => {
    expect(said('').multiple).toBe(false);
    expect(said('um').multiple).toBe(false);
    expect(parseVoice([], { today: TODAY, directory: DIRECTORY, aliases: {} }).multiple).toBe(
      false,
    );
  });
});
