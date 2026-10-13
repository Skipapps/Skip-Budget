import type { Intent } from '@/lib/ask-sam/types';

import { billsSubscriptionsIntents } from './bills-subscriptions';
import { chatIntents } from './chat';
import { gettingStartedIntents } from './getting-started';
import { habitsIntents } from './habits';
import { homeIntents } from './home';
import { loansIntents } from './loans';
import { payCardsIntents } from './pay-cards';
import { proSettingsIntents } from './pro-settings';
import { receiptsIntents } from './receipts';
import { savingsGoalsIntents } from './savings-goals';
import { voicePrivacyHelpIntents } from './voice-privacy-help';

export const ALL_INTENTS: Intent[] = [
  ...gettingStartedIntents,
  ...homeIntents,
  ...receiptsIntents,
  ...billsSubscriptionsIntents,
  ...payCardsIntents,
  ...loansIntents,
  ...savingsGoalsIntents,
  ...habitsIntents,
  ...proSettingsIntents,
  ...voicePrivacyHelpIntents,
  ...chatIntents,
];
