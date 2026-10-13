import { PHRASES, SYNONYMS, SYNONYM_WORDS } from './synonyms';
import { compileRewrites, LIGHT_WORDS, normalize, stem, STOPWORDS } from './text';
import { OTHER_PHRASES, RULES } from './language';
import type { Intent, Language } from './types';

type Vector = Map<string, number>;

const rewritePhrases = compileRewrites(PHRASES);

type Doc = { intent: number; norm: number; scale: number };

export type Match = { intent: Intent; score: number };

export type MatchContext = {
  topic?: string;
  intentId?: string;
  related?: string[];
  /** What the last answer was about, standing in for "it" and "that" in a follow-up. */
  subject?: string;
  /** Use the subject even without "it" or "that": a correction re-reads the question it corrects. */
  alwaysSubject?: boolean;
  /** "No, I mean a subscription": the same aspect as `intentId`, about a new subject. */
  sameAspect?: boolean;
  /** Words carried over from earlier in the chat, with how much they count (the person's own count 1). */
  carry?: { terms: string[]; weight: number };
  /** Treat the message as part of the last exchange even if it doesn't look like a follow-up. */
  followUp?: boolean;
  /** How much the subject counts, when not the default. */
  subjectWeight?: number;
};

export type Matcher = {
  match: (query: string, context?: MatchContext) => Match[];
  /** The words left after cleaning, for telling "nothing typed" from "nothing found". */
  terms: (query: string) => string[];
  byId: (id: string) => Intent | undefined;
  /** Whether an answer's own words include this term. */
  knows: (id: string, term: string) => boolean;
  /** A question's words, split into what it is about (habit, loan) and what it asks (delete, free). */
  slots: (query: string) => { subject: string[]; ask: string[] };
  intents: Intent[];
};

export type MatcherWeights = {
  bigram: number;
  light: number;
  keywordDoc: number;
  /** The best single written question. */
  best: number;
  /** All of an answer's questions together. */
  centroid: number;
  /** The answer's own words: people describe things the way the answer does. */
  answer: number;
  keywordBonus: number;
  /** How much of the score depends on the answer knowing every important word asked. */
  coverage: number;
  followTopic: number;
  followRelated: number;
  /** How much the last answer's subject counts when a follow-up says "it". */
  subject: number;
};

/** Tuned against the held-out questions in src/lib/ask-sam/eval (scripts/ask-sam/eval.mjs). */
export const DEFAULT_WEIGHTS: MatcherWeights = {
  bigram: 0.3,
  light: 0.35,
  keywordDoc: 0.6,
  best: 0.5,
  centroid: 0.5,
  answer: 0.4,
  keywordBonus: 0.06,
  // A follow-up ("is it free?") means the thing just discussed, even over a word-for-word match elsewhere.
  followTopic: 0.3,
  followRelated: 0.3,
  subject: 0.35,
  coverage: 0.5,
};

/**
 * The things Skip keeps. They're mentioned all over the app, so the share rule below can't see that
 * they name what a question is about.
 */
const APP_OBJECTS_ES = [
  'tarjeta de credito',
  'tarjeta',
  'cuenta bancaria',
  'cuenta',
  'factura',
  'suscripcion',
  'recibo',
  'libro',
  'prestamo',
  'salario',
  'sueldo',
  'nomina',
  'dia de pago',
  'habito',
  'meta',
  'ahorro',
  'ahorros',
  'resumen',
  'saldo actual',
  'saldo',
  'voz',
  'recordatorio',
  'notificacion',
  'prueba',
  'tema',
  'idioma',
  'moneda',
  'contrasena',
  'correo',
  'codigo',
  'bloqueo',
  'foto',
  'nombre',
  'logo',
  'tienda',
  'categoria',
  'actividad',
  'analisis',
  'novedades',
  'historial',
  'calculadora',
  'perfil',
  'ingresos',
  'limite',
  'interes',
  'escanear',
  'telefono',
  'datos',
  'privacidad',
];
const APP_OBJECTS_FR = [
  'carte de credit',
  'carte',
  'compte bancaire',
  'compte',
  'facture',
  'abonnement',
  'recu',
  'carnet',
  'pret',
  'salaire',
  'paie',
  'jour de paie',
  'habitude',
  'objectif',
  'epargne',
  'bilan',
  'solde actuel',
  'solde',
  'voix',
  'rappel',
  'notification',
  'essai',
  'theme',
  'langue',
  'devise',
  'mot de passe',
  'code',
  'verrouillage',
  'photo',
  'nom',
  'logo',
  'magasin',
  'categorie',
  'activite',
  'apercu',
  'nouveautes',
  'historique',
  'calculatrice',
  'echeancier',
  'profil',
  'revenus',
  'plafond',
  'interet',
  'scanner',
  'telephone',
  'donnees',
  'confidentialite',
];
const APP_OBJECTS = [
  'credit card',
  'card',
  'bank account',
  'account',
  'bill',
  'subscription',
  'receipt',
  'book',
  'loan',
  'salary',
  'pay',
  'paycheck',
  'payday',
  'habit',
  'goal',
  'savings',
  'pot',
  'wrap up',
  'current balance',
  'balance',
  'voice',
  'reminder',
  'notification',
  'pro',
  'trial',
  'theme',
  'language',
  'currency',
  'password',
  'email',
  'code',
  'app lock',
  'avatar',
  'picture',
  'name',
  'logo',
  'store',
  'category',
  'activity',
  'insights',
  'news',
  'export',
  'history',
  'calculator',
  'schedule',
  'getting started',
  'quick add',
  'go further',
  'profile',
  'income',
  'limit',
  'interest',
  'apr',
  'payoff',
  'scan',
  'upload',
  'photo',
  'phone',
  'data',
  'privacy',
];

/** How much of a word's use must sit in one part of the app for it to count as a subject. */
const SUBJECT_SHARE = 0.55;

/**
 * The library's texts already cleaned, made at build time by scripts/ask-sam/build-prepared.mjs:
 * per intent, the term indices of its title, each question, each keyword, then its answer.
 */
export type Prepared = {
  terms: string[];
  words: [string, number][];
  intents: Record<string, number[][]>;
};

export function createMatcher(
  intents: Intent[],
  tuning: Partial<MatcherWeights> = {},
  language: Language = 'en',
  prepared?: Prepared,
): Matcher {
  const rules = RULES[language];
  const w = { ...DEFAULT_WEIGHTS, ...tuning };
  // The library is spelled right, so its own words skip the spelling fixer, and each of its texts
  // is cleaned once: on a phone this is the difference between a fraction of a second and many.
  const wordCounts = new Map<string, number>();
  const cleaned = new Map<string, string[]>();
  const library = (text: string) => {
    let found = cleaned.get(text);
    if (!found) {
      const plain = normalize(text, language);
      for (const word of plain.split(' ')) {
        if (word) wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      }
      found = termsOfPlain(plain, undefined, language);
      cleaned.set(text, found);
    }
    return found;
  };
  if (prepared) {
    for (const [word, count] of prepared.words) wordCounts.set(word, count);
    for (const intent of intents) {
      const lists = prepared.intents[intent.id];
      const texts = [
        intent.title,
        ...intent.questions,
        ...(intent.keywords ?? []),
        answerText(intent),
      ];
      // Prepared for a different version of this intent: work it out here instead.
      if (!lists || lists.length !== texts.length) continue;
      texts.forEach((text, index) =>
        cleaned.set(
          text,
          lists[index].map((term) => prepared.terms[term]),
        ),
      );
    }
  }
  // What people type gets the fixer, once the vocabulary is known (below).
  let fix: (word: string) => string = (word) => word;
  const analyze = (text: string) => terms(text, fix, language);

  const docs: Doc[] = [];
  const docVectors: Vector[] = [];
  const documentFrequency = new Map<string, number>();

  const perIntentFeatures: Set<string>[] = intents.map(() => new Set());
  const rawDocs: { intent: number; vector: Vector; scale: number }[] = [];

  intents.forEach((intent, index) => {
    const add = (text: string, scale: number) => {
      const vector = features(library(text), w);
      if (vector.size === 0) return;
      rawDocs.push({ intent: index, vector, scale });
      for (const feature of vector.keys()) perIntentFeatures[index].add(feature);
    };
    add(intent.title, 1);
    for (const question of intent.questions) add(question, 1);
    for (const keyword of intent.keywords ?? []) add(keyword, w.keywordDoc);
  });

  for (const set of perIntentFeatures) {
    for (const feature of set)
      documentFrequency.set(feature, (documentFrequency.get(feature) ?? 0) + 1);
  }

  const total = intents.length;
  const idf = (feature: string) => {
    const df = documentFrequency.get(feature) ?? 0;
    return Math.max(0.1, Math.log((total + 1) / (df + 0.5)));
  };

  // A word that mostly lives in one part of the app (habit, loan, netflix) names what a question is
  // about; one used all over (delete, free, remind) names what it asks.
  const topicsByTerm = new Map<string, Map<string, number>>();
  perIntentFeatures.forEach((set, index) => {
    const topic = intents[index].topic;
    if (topic === 'chat') return;
    for (const feature of set) {
      if (feature.includes('_') || LIGHT_WORDS.has(feature)) continue;
      let counts = topicsByTerm.get(feature);
      if (!counts) topicsByTerm.set(feature, (counts = new Map()));
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  });
  // Written correctly already, so no spelling fixes: fixing a word against another language's
  // vocabulary is slow and turns "tarjeta" into nonsense.
  const ownObjects = language === 'es' ? APP_OBJECTS_ES : language === 'fr' ? APP_OBJECTS_FR : [];
  const objects = new Set(
    [...APP_OBJECTS, ...ownObjects].flatMap((word) => terms(word, undefined, language)),
  );
  const isSubject = (term: string) => {
    if (objects.has(term)) return true;
    const counts = topicsByTerm.get(term);
    if (!counts) return false;
    let total = 0;
    let most = 0;
    for (const count of counts.values()) {
      total += count;
      most = Math.max(most, count);
    }
    return total >= 2 && most / total >= SUBJECT_SHARE;
  };
  const slots = (text: string) => {
    const subject: string[] = [];
    const ask: string[] = [];
    for (const term of analyze(text)) (isSubject(term) ? subject : ask).push(term);
    return { subject, ask };
  };

  const postings = new Map<string, { doc: number; weight: number }[]>();
  for (const raw of rawDocs) {
    const weighted: Vector = new Map();
    let sum = 0;
    for (const [feature, weight] of raw.vector) {
      const value = weight * idf(feature);
      weighted.set(feature, value);
      sum += value * value;
    }
    const doc = docs.push({ intent: raw.intent, norm: Math.sqrt(sum), scale: raw.scale }) - 1;
    docVectors.push(weighted);
    for (const [feature, value] of weighted) {
      let list = postings.get(feature);
      if (!list) postings.set(feature, (list = []));
      list.push({ doc, weight: value });
    }
  }

  // Built on first use and kept: a question only ever touches the few hundred answers that share a
  // word with it, so building all of them up front is wasted work at startup.
  const docsByIntent: number[][] = intents.map(() => []);
  docs.forEach((doc, index) => docsByIntent[doc.intent].push(index));

  const centroids: ({ vector: Vector; norm: number } | undefined)[] = [];
  const centroidOf = (index: number) => {
    let centroid = centroids[index];
    if (!centroid) {
      const vector: Vector = new Map();
      const own = docsByIntent[index];
      for (const docIndex of own) {
        for (const [feature, value] of docVectors[docIndex])
          vector.set(feature, (vector.get(feature) ?? 0) + value);
      }
      let sum = 0;
      for (const [feature, value] of vector) {
        const averaged = value / Math.max(1, own.length);
        vector.set(feature, averaged);
        sum += averaged * averaged;
      }
      centroids[index] = centroid = { vector, norm: Math.sqrt(sum) };
    }
    return centroid;
  };

  const answers: ({ vector: Vector; norm: number } | undefined)[] = [];
  const answerOf = (index: number) => {
    let answer = answers[index];
    if (!answer) {
      const vector: Vector = new Map();
      let sum = 0;
      for (const [feature, weight] of features(library(answerText(intents[index])), w)) {
        if (feature.includes('_')) continue;
        const value = weight * idf(feature);
        vector.set(feature, value);
        sum += value * value;
      }
      answers[index] = answer = { vector, norm: Math.sqrt(sum) };
    }
    return answer;
  };

  // Every word each answer knows, from its questions, keywords and its own text.
  const knowns: (Set<string> | undefined)[] = [];
  const knownOf = (index: number) => {
    let words = knowns[index];
    if (!words) {
      words = new Set(answerOf(index).vector.keys());
      for (const feature of perIntentFeatures[index])
        if (!feature.includes('_')) words.add(feature);
      knowns[index] = words;
    }
    return words;
  };

  const keywordPhrases = intents.map((intent) =>
    (intent.keywords ?? [])
      .map((keyword) => normalize(keyword, language))
      .filter((keyword) => keyword.length > 1),
  );
  fix = makeSpellFixer(finishVocabulary(wordCounts));

  const ids = new Map(intents.map((intent, index) => [intent.id, index]));

  // The action a "How do I…" answer teaches, for telling it apart from a report of that action done.
  const teaches = intents.map((intent) =>
    rules.howTo.test(normalize(intent.title, language)) ? new Set(library(intent.title)) : null,
  );

  function match(query: string, context?: MatchContext): Match[] {
    const plain = normalize(query, language);
    // "Is it free?" right after habits means "are spending habits free?".
    const pointsBack =
      Boolean(context?.subject) &&
      (context?.alwaysSubject || (rules.pointsBack.test(plain) && !rules.switchPhrase.test(plain)));
    const queryTerms = analyze(query);
    const done = new Set<string>();
    for (const found of plain.split(' ').map(fix).join(' ').matchAll(rules.done)) {
      for (const term of analyze(found[1])) done.add(term);
    }
    if (queryTerms.length === 0) return [];
    const queryVector: Vector = new Map();
    for (const [feature, weight] of features(queryTerms, w))
      queryVector.set(feature, weight * idf(feature));
    for (const term of context?.carry?.terms ?? []) {
      if (queryVector.has(term)) continue;
      const weight = LIGHT_WORDS.has(term) ? w.light : 1;
      queryVector.set(term, context!.carry!.weight * weight * idf(term));
    }
    if (pointsBack) {
      // Lightly: the person's own words still decide what they're asking about it.
      for (const term of analyze(context!.subject!)) {
        if (!queryVector.has(term) && !LIGHT_WORDS.has(term))
          queryVector.set(term, (context!.subjectWeight ?? w.subject) * idf(term));
      }
    }
    let queryNormSum = 0;
    for (const value of queryVector.values()) queryNormSum += value * value;
    const asked = new Map<string, number>();
    for (const term of queryTerms) if (!LIGHT_WORDS.has(term)) asked.set(term, idf(term));
    // What the chat is about counts too: an answer that knows nothing of the bill being discussed
    // isn't the answer to "can I start it again?".
    for (const term of context?.carry?.terms ?? []) {
      if (!LIGHT_WORDS.has(term) && !asked.has(term))
        asked.set(term, context!.carry!.weight * idf(term));
    }
    let askedWeight = 0;
    for (const weight of asked.values()) askedWeight += weight;
    const queryNorm = Math.sqrt(queryNormSum);
    if (queryNorm === 0) return [];

    const dots = new Map<number, number>();
    // A question shares "how" or "what" with nearly every answer; only answers sharing a word that
    // means something are worth scoring.
    const meaningful = new Set<number>();
    for (const [feature, value] of queryVector) {
      const light = LIGHT_WORDS.has(feature);
      for (const posting of postings.get(feature) ?? []) {
        dots.set(posting.doc, (dots.get(posting.doc) ?? 0) + value * posting.weight);
        if (!light) meaningful.add(posting.doc);
      }
    }

    const best = new Map<number, number>();
    for (const [docIndex, dot] of dots) {
      if (meaningful.size && !meaningful.has(docIndex)) continue;
      const doc = docs[docIndex];
      const cosine = (dot / (queryNorm * doc.norm)) * doc.scale;
      if (cosine > (best.get(doc.intent) ?? 0)) best.set(doc.intent, cosine);
    }

    const normalizedQuery = ` ${plain} `;
    const followUp = context?.followUp || isFollowUp(plain, queryTerms, rules.followUp);
    const relatedIds = new Set(context?.related ?? []);
    const switching = rules.switchPhrase.test(plain);
    const aspect = context?.intentId ? context.intentId.slice(context.intentId.indexOf('.')) : '';

    const results: Match[] = [];
    for (const [intentIndex, top] of best) {
      const centroid = centroidOf(intentIndex);
      let centroidDot = 0;
      for (const [feature, value] of queryVector)
        centroidDot += value * (centroid.vector.get(feature) ?? 0);
      const centroidCosine = centroid.norm ? centroidDot / (queryNorm * centroid.norm) : 0;

      let answerCosine = 0;
      const answer = w.answer > 0 ? answerOf(intentIndex) : undefined;
      if (answer?.norm) {
        let answerDot = 0;
        for (const [feature, value] of queryVector)
          answerDot += value * (answer.vector.get(feature) ?? 0);
        answerCosine = answerDot / (queryNorm * answer.norm);
      }

      let score = w.best * top + w.centroid * centroidCosine + w.answer * answerCosine;

      const taught = teaches[intentIndex];
      if (taught && done.size && [...done].some((term) => taught.has(term))) score *= 0.75;

      if (w.coverage > 0 && askedWeight > 0) {
        // "Book me a flight" shares "book" with receipt books, but that answer knows nothing of flights.
        let covered = 0;
        const knows = knownOf(intentIndex);
        for (const [term, weight] of asked) if (knows.has(term)) covered += weight;
        score *= 1 - w.coverage + w.coverage * (covered / askedWeight);
      }

      let keywordHits = 0;
      for (const keyword of keywordPhrases[intentIndex]) {
        if (normalizedQuery.includes(` ${keyword} `)) keywordHits += 1;
      }
      score += Math.min(w.keywordBonus * 2, keywordHits * w.keywordBonus);

      const intent = intents[intentIndex];
      // Asked almost exactly as one of the written questions: that answer, however mixed the rest.
      // Not for a follow-up: "is it free?" means the thing just discussed, not the answer that
      // happens to be written that way.
      if (top >= 0.98 && !(followUp && context && !switching)) score = Math.max(score, 0.97);

      if (followUp && context) {
        if (switching || context.sameAspect) {
          // "What about subscriptions?" after "how do I add a bill": the same aspect, a new subject.
          if (aspect && intent.id.slice(intent.id.indexOf('.')) === aspect)
            score += w.followRelated;
        } else {
          if (relatedIds.has(intent.id)) score += w.followRelated;
          if (context.topic && intent.topic === context.topic) score += w.followTopic;
        }
        // "How is it worked out?" may well be answered by the answer just given; prefer a new one only a little.
        if (context.intentId === intent.id) score -= 0.03;
      }
      if (score <= 0) continue;
      results.push({ intent, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 8);
  }

  return {
    match,
    slots,
    knows: (id, term) => {
      const index = ids.get(id);
      return index !== undefined && knownOf(index).has(term);
    },
    terms: analyze,
    byId: (id) => {
      const index = ids.get(id);
      return index === undefined ? undefined : intents[index];
    },
    intents,
  };
}

function isFollowUp(plain: string, queryTerms: string[], followUp: RegExp): boolean {
  const contentTerms = queryTerms.filter((term) => !LIGHT_WORDS.has(term));
  return contentTerms.length <= 2 || followUp.test(plain);
}

export function terms(
  input: string,
  fix?: (word: string) => string,
  language: Language = 'en',
): string[] {
  return termsOfPlain(normalize(input, language), fix, language);
}

function termsOfPlain(
  plain: string,
  fix: ((word: string) => string) | undefined,
  language: Language,
): string[] {
  let text = plain;
  if (fix) text = text.split(' ').map(fix).join(' ');
  if (language === 'en') text = rewritePhrases(text);
  else
    for (const [pattern, replacement] of OTHER_PHRASES[language])
      text = text.replace(pattern, replacement);
  const out: string[] = [];
  for (const word of text.split(' ')) {
    if (!word || STOPWORDS.has(word)) continue;
    const canonical = SYNONYMS.get(word) ?? SYNONYMS.get(stem(word)) ?? stem(word);
    if (!STOPWORDS.has(canonical)) out.push(canonical);
  }
  return out;
}

function features(list: string[], w: MatcherWeights): Vector {
  const vector: Vector = new Map();
  for (const term of list) vector.set(term, LIGHT_WORDS.has(term) ? w.light : 1);
  for (let index = 0; index < list.length - 1; index += 1) {
    if (list[index] === list[index + 1]) continue;
    vector.set(`${list[index]}_${list[index + 1]}`, w.bigram);
  }
  return vector;
}

/** The words Sam knows: the library's own, every synonym, and the small words it ignores. */
function finishVocabulary(counts: Map<string, number>): Map<string, number> {
  for (const word of SYNONYM_WORDS)
    for (const part of word.split(' ')) counts.set(part, (counts.get(part) ?? 0) + 3);
  for (const word of STOPWORDS) counts.set(word, (counts.get(word) ?? 0) + 3);
  return counts;
}

/** An answer as one text, for what it knows and how it reads. Placeholders aren't words. */
export function answerText(intent: Intent): string {
  return `${intent.title} ${intent.answer.replace(/\{\w+\}/g, '')}`;
}

/**
 * Fixes a word that isn't in Ask Sam's vocabulary to the closest one that is, preferring the most
 * common. Short words are left alone: "bil" could be bill, bit or big, and a wrong guess is worse
 * than none.
 */
export function makeSpellFixer(vocabulary: Map<string, number>): (word: string) => string {
  const byLength = new Map<number, string[]>();
  for (const word of vocabulary.keys()) {
    let list = byLength.get(word.length);
    if (!list) byLength.set(word.length, (list = []));
    list.push(word);
  }
  const cache = new Map<string, string>();

  return (word: string) => {
    if (word.length < 4 || vocabulary.has(word) || /\d/.test(word)) return word;
    const cached = cache.get(word);
    if (cached) return cached;

    const limit = word.length <= 5 ? 1 : 2;
    const letters = [...word].sort().join('');
    let bestWord = word;
    let bestDistance = limit + 1;
    let bestRank = 0;
    for (let length = word.length - limit; length <= word.length + limit; length += 1) {
      for (const candidate of byLength.get(length) ?? []) {
        const distance = damerauLevenshtein(word, candidate, limit);
        if (distance > limit) continue;
        // Between equally close words, the likelier slip wins: a dropped letter ("limt" is limit,
        // not list) or two swapped, then an extra one, before a wrong one; then the commoner word.
        const slip =
          candidate.length > word.length ||
          (candidate.length === word.length && [...candidate].sort().join('') === letters)
            ? 2
            : candidate.length < word.length
              ? 1
              : 0;
        const sameStart = candidate[0] === word[0] ? 1 : 0;
        const rank = sameStart * 1e9 + slip * 1e6 + (vocabulary.get(candidate) ?? 0);
        if (distance < bestDistance || (distance === bestDistance && rank > bestRank)) {
          bestWord = candidate;
          bestDistance = distance;
          bestRank = rank;
        }
      }
    }
    cache.set(word, bestWord);
    return bestWord;
  };
}

/** Optimal string alignment distance, giving up early once every path is past `limit`. */
export function damerauLevenshtein(a: string, b: string, limit = Infinity): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) table[i][0] = i;
  for (let j = 0; j < cols; j += 1) table[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, table[i - 2][j - 2] + 1);
      }
      table[i][j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > limit) return limit + 1;
  }
  return table[rows - 1][cols - 1];
}
