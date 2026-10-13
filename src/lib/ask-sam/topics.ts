import type { Topic } from './types';

/** The "Browse topics" menu, in the order a new user meets things. */
export const TOPICS: Topic[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    starters: [
      'getting-started.skip.what',
      'getting-started.skip.free',
      'getting-started.setup.what',
      'getting-started.signin.how',
      'getting-started.nav.find',
    ],
  },
  {
    id: 'home',
    label: 'Home and your balance',
    starters: [
      'home.balance.what',
      'home.balance.calc',
      'home.screen.overview',
      'home.where.what',
      'home.quick-add.what',
      'home.insights.what',
    ],
  },
  {
    id: 'activity',
    label: 'Activity',
    starters: [
      'activity.list.what',
      'activity.summary.what',
      'activity.search.how',
      'activity.history.free',
    ],
  },
  {
    id: 'receipts',
    label: 'Receipts',
    starters: [
      'receipts.add.ways',
      'receipts.scan.how',
      'receipts.limit.free',
      'receipts.books.what',
      'receipts.edit.how',
      'receipts.delete.how',
    ],
  },
  {
    id: 'bills',
    label: 'Bills',
    starters: [
      'bills.add.how',
      'bills.find.where',
      'bills.add.reminder',
      'bills.add.paid-with',
      'bills.detail.page',
    ],
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    starters: [
      'subscriptions.add.how',
      'subscriptions.find.where',
      'subscriptions.add.next-renewal',
      'subscriptions.cancel.how',
    ],
  },
  {
    id: 'pay',
    label: 'Salary and pay',
    starters: [
      'pay.salary.add',
      'pay.page.overview',
      'pay.once.what',
      'pay.hourly.calc',
      'pay.paid-into.what',
    ],
  },
  {
    id: 'cards',
    label: 'Cards and accounts',
    starters: [
      'cards.tab.overview',
      'cards.card.add',
      'cards.account.add',
      'cards.pay-card.how',
      'cards.free.limits',
    ],
  },
  {
    id: 'loans',
    label: 'Loans',
    starters: [
      'loans.page.what',
      'loans.add.how',
      'loans.left.calc',
      'loans.add.apr',
      'loans.calculator.what',
      'loans.payoff.how',
    ],
  },
  {
    id: 'savings',
    label: 'Savings',
    starters: [
      'savings.page.what',
      'savings.ready.what',
      'savings.wrapup.what',
      'savings.add.how',
      'home.balance.vs-savings',
    ],
  },
  {
    id: 'goals',
    label: 'Goals',
    starters: [
      'goals.page.what',
      'goals.create.how',
      'goals.send.how',
      'goals.weekly.calc',
      'goals.take-out.how',
    ],
  },
  {
    id: 'habits',
    label: 'Spending habits',
    starters: [
      'habits.overview.what',
      'habits.create.how',
      'habits.card.overview',
      'habits.saved.how',
      'habits.pro.free',
    ],
  },
  {
    id: 'voice',
    label: 'Voice',
    starters: [
      'voice.record.how',
      'voice.say.receipts',
      'voice.say.bills',
      'voice.mishears',
      'voice.pro.rules',
    ],
  },
  {
    id: 'pro',
    label: 'Skip Pro',
    starters: [
      'pro.what.overview',
      'getting-started.skip.free',
      'pro.free.limits',
      'pro.trial.what',
      'pro.restore.how',
      'pro.lapse.overview',
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    starters: [
      'settings.overview.page',
      'settings.preferences.overview',
      'settings.app-lock.what',
      'settings.language.what-changes',
      'settings.support.overview',
    ],
  },
  {
    id: 'reminders',
    label: 'Reminders',
    starters: [
      'reminders.page.overview',
      'reminders.item.turn-on',
      'reminders.problem.not-arriving',
      'receipts.reminder.daily',
      'bills.notifications.went-out',
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy and your data',
    starters: [
      'privacy.stored.what',
      'privacy.who-sees',
      'privacy.bank',
      'privacy.delete-account',
      'privacy.export',
    ],
  },
  {
    id: 'troubleshooting',
    label: 'Something’s not right',
    starters: [
      'troubleshooting.failure.what',
      'troubleshooting.numbers-wrong',
      'troubleshooting.missing-data',
      'troubleshooting.new-phone',
      'troubleshooting.crash',
    ],
  },
];
