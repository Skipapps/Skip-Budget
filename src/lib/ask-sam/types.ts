export type TopicId =
  | 'getting-started'
  | 'home'
  | 'activity'
  | 'receipts'
  | 'bills'
  | 'subscriptions'
  | 'pay'
  | 'cards'
  | 'loans'
  | 'savings'
  | 'goals'
  | 'habits'
  | 'pro'
  | 'settings'
  | 'reminders'
  | 'voice'
  | 'privacy'
  | 'troubleshooting'
  | 'chat';

/**
 * One thing a person might want to know, asked many ways, answered once.
 *
 * `answer` uses a small text format both the app and the web test page render:
 * a blank line between paragraphs, lines starting "- " for bullets, "1. " for steps,
 * and **bold** for on-screen names. `{proMonthly}` and `{proYearly}` are filled with the
 * store's price, because Apple prices each country itself.
 */
export type Intent = {
  id: string;
  topic: TopicId;
  /** Shown on suggestion chips and "Did you mean" buttons, so it reads as a short question. */
  title: string;
  questions: string[];
  answer: string;
  /** Words that point here but read oddly inside a full question: screen labels, slang, abbreviations. */
  keywords?: string[];
  /** Offered as next questions after this answer. */
  related?: string[];
  /** The screen this answer is about, for a "Take me there" button once Ask Sam lives in the app. */
  route?: string;
  pro?: boolean;
};

export type Topic = {
  id: TopicId;
  label: string;
  /** Intents offered when someone opens this topic from the menu. */
  starters: string[];
};

export type Language = 'en' | 'es' | 'fr';

/** One intent's words in another language; everything else (topic, links, route) comes from English. */
export type IntentText = {
  id: string;
  title: string;
  questions: string[];
  answer: string;
  keywords?: string[];
};
