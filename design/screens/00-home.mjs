import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text } = C;

export const section = 'Tabs';
export const order = 1;

const steps = [
  { title: 'Add a card or account', done: true },
  { title: 'Add your salary', done: true },
  { title: 'Add a bill', detail: 'Rent, power, phone — anything that comes round.' },
  { title: 'Turn on reminders' },
  { title: 'Log a receipt' },
];

const main = [
  screen({
    id: 'home',
    name: 'Home',
    tab: 'home',
    children: [
      C.DashboardHeader('Sam', { mt: 8, avatar: true }),
      C.BalanceSummary({ left: 1873.4, income: 4200, expenses: 2326.6, daysLeft: 13, mt: 24 }),
      C.QuickActions({ mt: 20 }),
      C.GettingStartedCard(steps),
      C.SectionHeading('Where it goes', { caption: 'This month', mt: 32 }),
      C.DestinationList(C.DESTINATIONS, { mt: 12 }),
      C.InsightBanner({ mt: 12 }),
      C.DateSelector('Thursday', '17 Sep 2026', { mt: 32 }),
      C.SectionHeading('Recent', { caption: '11 – 17 Sep', mt: 32 }),
      vstack({ mt: 4 }, [
        C.DateGroup('Tuesday', -54.12, [C.TransactionRow("Trader Joe's", -54.12, { kindLabel: 'Receipt' })]),
        C.DateGroup('Yesterday', -135.49, [
          C.TransactionRow('Netflix', -15.49, { kindLabel: 'Subscription' }),
          C.TransactionRow('Electricity', -120, { kindLabel: 'Bill', kind: 'bill', iconName: 'Zap' }),
        ]),
        C.DateGroup('Today', -32.1, [C.TransactionRow('Shell', -32.1, { kindLabel: 'Receipt' })]),
      ]),
      C.SectionHeading('Coming up', { caption: '18 – 24 Sep', mt: 32 }),
      vstack({ mt: 4, pad: { b: 96 } }, [
        C.DateGroup('Tomorrow', -10.99, [C.TransactionRow('Spotify', -10.99, { kindLabel: 'Subscription' })]),
        C.DateGroup('Mon 21 Sep', -1450, [C.TransactionRow('Rent', -1450, { kindLabel: 'Bill', kind: 'bill', iconName: 'House' })]),
      ]),
    ],
  }),
];

// Other states of the same tab.
const states = [
  screen({
    id: 'home-loading',
    name: 'Home / loading',
    tab: 'home',
    children: [
      C.DashboardHeader('Welcome', { mt: 8 }),
      C.BalanceSummary({ loading: true, daysLeft: 13, mt: 24 }),
      C.QuickActions({ mt: 20 }),
      C.SectionHeading('Where it goes', { caption: 'This month', mt: 32 }),
      C.DestinationList(C.DESTINATIONS, { loading: true, mt: 12 }),
      C.InsightBanner({ mt: 12 }),
      C.DateSelector('Thursday', '17 Sep 2026', { mt: 32 }),
      C.SectionHeading('Recent', { caption: '11 – 17 Sep', mt: 32 }),
      vstack({ mt: 4 }, [C.SkeletonRow(), C.SkeletonRow(), C.SkeletonRow()]),
      C.SectionHeading('Coming up', { caption: '18 – 24 Sep', mt: 32 }),
      vstack({ mt: 4, pad: { b: 96 } }, [C.SkeletonRow(), C.SkeletonRow(), C.SkeletonRow()]),
    ],
  }),
  screen({
    id: 'home-empty',
    name: 'Home / new account',
    tab: 'home',
    children: [
      C.DashboardHeader('Sam', { mt: 8 }),
      C.BalanceSummary({ left: 0, income: 0, expenses: 0, daysLeft: 13, mt: 24 }),
      C.QuickActions({ mt: 20 }),
      C.GettingStartedCard(steps.map((s) => ({ ...s, done: false, detail: s.title === 'Add a card or account' ? 'Skip needs somewhere for the money to come from.' : undefined }))),
      C.SectionHeading('Where it goes', { caption: 'This month', mt: 32 }),
      C.DestinationList(C.DESTINATIONS.map((d) => (d.amount === undefined ? d : { ...d, amount: 0 })), { mt: 12 }),
      C.InsightBanner({ mt: 12 }),
      C.DateSelector('Thursday', '17 Sep 2026', { mt: 32 }),
      C.SectionHeading('Recent', { caption: '11 – 17 Sep', mt: 32 }),
      text('Nothing in this week.', { size: 14, weight: 400, lineHeight: 20, color: 'muted', align: 'center' }, { pad: [24, 0], mt: 0 }),
      C.SectionHeading('Coming up', { caption: '18 – 24 Sep', mt: 32 }),
      vstack({ pad: { b: 96 } }, [text('Nothing due in the week ahead.', { size: 14, weight: 400, lineHeight: 20, color: 'muted', align: 'center' }, { pad: [24, 0] })]),
    ],
  }),
  screen({
    id: 'home-error',
    name: 'Home / could not load',
    tab: 'home',
    children: [
      C.DashboardHeader('Sam', { mt: 8, avatar: true }),
      C.BalanceSummary({ error: true, daysLeft: 13, mt: 24 }),
      C.QuickActions({ mt: 20 }),
      C.SectionHeading('Where it goes', { caption: 'This month', mt: 32 }),
      vstack({ mt: 12 }, [
        C.DestinationList(C.DESTINATIONS.map((d) => (d.amount === undefined ? d : { ...d, amount: NaN })), {}),
        hstack({ justify: 'between', gap: 12, mt: 12 }, [text('Amounts are unavailable right now.', C.TYPE.caption, { flex: 1 }), C.TextLink('Try again', { variant: 'subtle', pad: 0 })]),
      ]),
      C.InsightBanner({ mt: 12 }),
      C.DateSelector('Thursday', '17 Sep 2026', { mt: 32 }),
      C.SectionHeading('Recent', { caption: '11 – 17 Sep', mt: 32 }),
      vstack({ mt: 8, align: 'center' }, [text('We could not load this week.', { size: 14, weight: 400, lineHeight: 20, color: 'muted', align: 'center' }), C.TextLink('Try again', { variant: 'subtle' })]),
      C.SectionHeading('Coming up', { caption: '18 – 24 Sep', mt: 32 }),
      vstack({ mt: 8, align: 'center', pad: { b: 96 } }, [text('We could not load this week.', { size: 14, weight: 400, lineHeight: 20, color: 'muted', align: 'center' }), C.TextLink('Try again', { variant: 'subtle' })]),
    ],
  }),
];

export default [...main, ...states];
