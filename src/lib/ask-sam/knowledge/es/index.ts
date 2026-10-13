import type { IntentText } from '@/lib/ask-sam/types';

import { billsSubscriptionsEs } from './bills-subscriptions';
import { chatEs } from './chat';
import { gettingStartedEs } from './getting-started';
import { habitsEs } from './habits';
import { homeEs } from './home';
import { loansEs } from './loans';
import { payCardsEs } from './pay-cards';
import { proSettingsEs } from './pro-settings';
import { receiptsEs } from './receipts';
import { savingsGoalsEs } from './savings-goals';
import { voicePrivacyHelpEs } from './voice-privacy-help';

export const TEXTS_ES: IntentText[] = [
  ...gettingStartedEs,
  ...homeEs,
  ...receiptsEs,
  ...billsSubscriptionsEs,
  ...payCardsEs,
  ...loansEs,
  ...savingsGoalsEs,
  ...habitsEs,
  ...proSettingsEs,
  ...voicePrivacyHelpEs,
  ...chatEs,
];
