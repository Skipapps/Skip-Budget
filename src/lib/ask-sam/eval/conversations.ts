import type { Conversation } from './conversation-types';
import { conversationsA } from './conversations-a';
import { conversationsB } from './conversations-b';
import { conversationsC } from './conversations-c';

/** Multi-turn chats written by testers, for measuring how Sam carries a conversation. */
export const CONVERSATIONS: Conversation[] = [
  ...conversationsA,
  ...conversationsB,
  ...conversationsC,
];
