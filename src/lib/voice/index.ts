/**
 * Voice input parser: pure TypeScript, no React, no native, no network.
 * See parse.ts for the pipeline and each rule module for its rule.
 */
export type {
  BrandRow,
  VoiceContext,
  VoiceCycle,
  VoiceDraft,
  VoiceKind,
  VoiceMerchant,
  VoiceMerchantSource,
  VoiceMissing,
} from './types';
export { parseVoice } from './parse';
export {
  applyAliases,
  DEFAULT_ALIAS_CAP,
  learnAlias,
  normaliseHeard,
  type AliasPair,
} from './aliases';
export { voiceVocabulary, VOCABULARY_CAP } from './vocabulary';
export { BILL_CATEGORY_IDS, type BillCategoryId } from './bill-category';
