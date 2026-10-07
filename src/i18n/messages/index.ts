import { accountsMessages } from '@/i18n/messages/accounts';
import { apiMessages } from '@/i18n/messages/api';
import { authMessages } from '@/i18n/messages/auth';
import { billsMessages } from '@/i18n/messages/bills';
import { cardsMessages } from '@/i18n/messages/cards';
import { commonMessages } from '@/i18n/messages/common';
import { dateMessages } from '@/i18n/messages/dates';
import { faqMessages } from '@/i18n/messages/faq';
import { homeMessages } from '@/i18n/messages/home';
import { insightsMessages } from '@/i18n/messages/insights';
import { legalMessages } from '@/i18n/messages/legal';
import { libMessages } from '@/i18n/messages/lib';
import { loanMessages } from '@/i18n/messages/loan';
import { localeMessages } from '@/i18n/messages/locale';
import { navMessages } from '@/i18n/messages/nav';
import { onboardingMessages } from '@/i18n/messages/onboarding';
import { preferencesMessages } from '@/i18n/messages/preferences';
import { proMessages } from '@/i18n/messages/pro';
import { receiptsMessages } from '@/i18n/messages/receipts';
import { remindersMessages } from '@/i18n/messages/reminders';
import { salaryMessages } from '@/i18n/messages/salary';
import { savingsMessages } from '@/i18n/messages/savings';
import { settingsMessages } from '@/i18n/messages/settings';
import { subscriptionsMessages } from '@/i18n/messages/subscriptions';
import { supportMessages } from '@/i18n/messages/support';
import { transactionsMessages } from '@/i18n/messages/transactions';
import { uiMessages } from '@/i18n/messages/ui';
import { voiceMessages } from '@/i18n/messages/voice';

/** One file per area, each with all three languages side by side. */
export const MESSAGE_AREAS = {
  accounts: accountsMessages,
  api: apiMessages,
  auth: authMessages,
  bills: billsMessages,
  cards: cardsMessages,
  common: commonMessages,
  dates: dateMessages,
  faq: faqMessages,
  home: homeMessages,
  insights: insightsMessages,
  legal: legalMessages,
  lib: libMessages,
  loan: loanMessages,
  locale: localeMessages,
  nav: navMessages,
  preferences: preferencesMessages,
  onboarding: onboardingMessages,
  pro: proMessages,
  receipts: receiptsMessages,
  reminders: remindersMessages,
  salary: salaryMessages,
  savings: savingsMessages,
  settings: settingsMessages,
  subscriptions: subscriptionsMessages,
  support: supportMessages,
  transactions: transactionsMessages,
  ui: uiMessages,
  voice: voiceMessages,
};

/**
 * Spread rather than merged at runtime so every key stays a literal type. A key defined in two
 * areas would be silently overwritten here; the messages test counts the areas to catch it.
 */
export const MESSAGES = {
  ...MESSAGE_AREAS.accounts,
  ...MESSAGE_AREAS.api,
  ...MESSAGE_AREAS.auth,
  ...MESSAGE_AREAS.bills,
  ...MESSAGE_AREAS.cards,
  ...MESSAGE_AREAS.common,
  ...MESSAGE_AREAS.dates,
  ...MESSAGE_AREAS.faq,
  ...MESSAGE_AREAS.home,
  ...MESSAGE_AREAS.insights,
  ...MESSAGE_AREAS.legal,
  ...MESSAGE_AREAS.lib,
  ...MESSAGE_AREAS.loan,
  ...MESSAGE_AREAS.locale,
  ...MESSAGE_AREAS.nav,
  ...MESSAGE_AREAS.preferences,
  ...MESSAGE_AREAS.onboarding,
  ...MESSAGE_AREAS.pro,
  ...MESSAGE_AREAS.receipts,
  ...MESSAGE_AREAS.reminders,
  ...MESSAGE_AREAS.salary,
  ...MESSAGE_AREAS.savings,
  ...MESSAGE_AREAS.settings,
  ...MESSAGE_AREAS.subscriptions,
  ...MESSAGE_AREAS.support,
  ...MESSAGE_AREAS.transactions,
  ...MESSAGE_AREAS.ui,
  ...MESSAGE_AREAS.voice,
};

export type MessageKey = keyof typeof MESSAGES;
