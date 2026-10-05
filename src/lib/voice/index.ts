/** Voice input parser: pure TypeScript, no React, native or network. See parse.ts. */
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
