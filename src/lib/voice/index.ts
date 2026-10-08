/** Voice input parser: pure TypeScript, no React, native or network. See parse.ts. */
export type {
  VoiceCycle,
  VoiceDraft,
  VoiceKind,
  VoiceMerchant,
  VoiceMerchantSource,
  VoiceMissing,
} from './types';
export { parseVoice } from './parse';
export { DEFAULT_ALIAS_CAP, learnAlias, type AliasPair } from './aliases';
export { voiceVocabulary } from './vocabulary';
