import type { IntentText } from '@/lib/ask-sam/types';

import { billsSubscriptionsFr } from './bills-subscriptions';
import { chatFr } from './chat';
import { gettingStartedFr } from './getting-started';
import { habitsFr } from './habits';
import { homeFr } from './home';
import { loansFr } from './loans';
import { payCardsFr } from './pay-cards';
import { proSettingsFr } from './pro-settings';
import { receiptsFr } from './receipts';
import { savingsGoalsFr } from './savings-goals';
import { voicePrivacyHelpFr } from './voice-privacy-help';

export const TEXTS_FR: IntentText[] = [
  ...gettingStartedFr,
  ...homeFr,
  ...receiptsFr,
  ...billsSubscriptionsFr,
  ...payCardsFr,
  ...loansFr,
  ...savingsGoalsFr,
  ...habitsFr,
  ...proSettingsFr,
  ...voicePrivacyHelpFr,
  ...chatFr,
];
