export type ConversationPattern =
  | 'pronoun'
  | 'new-subject'
  | 'already-done'
  | 'i-mean'
  | 'not-what-i-asked'
  | 'detail'
  | 'deeper'
  | 'switch-topic'
  | 'statement'
  | 'did-but'
  | 'small-talk';

/** A chat as people have it: each turn with the answers a support person would accept, or 'any'. */
export type Conversation = {
  pattern: ConversationPattern;
  turns: { say: string; expect: string[] }[];
};
