import { createMatcher, type Match, type MatchContext, type Matcher } from './matcher';
import { RULES } from './language';
import { LIGHT_WORDS, normalize } from './text';
import type { Intent, Language, Topic, TopicId } from './types';

export type Chip = {
  label: string;
  intentId?: string;
  action?: 'contact' | 'idea' | 'topics' | 'topic' | 'none';
  topic?: TopicId;
};

export type ReplyKind = 'answer' | 'clarify' | 'fallback' | 'contact' | 'topics' | 'chat';

export type SamReply = {
  kind: ReplyKind;
  text: string;
  chips: Chip[];
  /** The next-best answers, offered under an answer Sam wasn't sure of. */
  alternatives?: Chip[];
  intentId?: string;
  route?: string;
  pro?: boolean;
  /** Offer "Was this helpful?" under it. Off for small talk and questions back. */
  askFeedback?: boolean;
  /** Set when the reply should open the contact form, with what the person already asked. */
  contact?: { topic: 'support' | 'idea'; draft: string };
  /** Why Sam chose this reply, for the test page. */
  debug?: { query: string; candidates: { id: string; score: number }[] };
};

export type TranscriptLine = { from: 'user' | 'sam'; text: string };

export type AskSamOptions = {
  intents: Intent[];
  topics: Topic[];
  /** Filled into answers: {proMonthly} and {proYearly}. */
  vars?: Record<string, string>;
  /** Swappable so tests get the same wording every run. */
  random?: () => number;
  /** A matcher already built from `intents`, so a fresh chat doesn't index the library again. */
  matcher?: Matcher;
  /** How much carried-over words count against the person's own; tuned on the test chats. */
  carry?: { subject: number; ask: number };
  /** The app's language: how Sam reads people and what it says back. */
  language?: Language;
};

export type AskSam = {
  greet: (name?: string) => SamReply;
  ask: (text: string) => SamReply[];
  choose: (chip: Chip) => SamReply[];
  feedback: (intentId: string, helpful: boolean) => SamReply;
  transcript: () => TranscriptLine[];
  matcher: Matcher;
};

// Tuned against the held-out questions (scripts/ask-sam/eval.mjs): answering at once and offering
// the runner-ups beats asking back, which reads as not understanding.
/** How much words carried from earlier in the chat count; the person's own words count 1. */
export const CARRY_SUBJECT = 0.6;
export const CARRY_ASK = 0.6;

/** Above this, with a clear lead, Sam answers outright. */
export const SURE = 0.55;
const CLEAR_LEAD = 0.12;
/** Above this Sam answers, and offers the next-best answers under it. */
export const LIKELY = 0.3;
/** Above this Sam asks "Did you mean…?" instead of guessing. */
export const MAYBE = 0.2;
/** Two weak answers closer than this are too close to call, so Sam asks which one. */
const TIE = 0.03;

/** Small talk that stays small talk whatever app words come with it: asking for a person or a fix. */
const CONTACT_INTENTS = new Set([
  'chat.human',
  'chat.idea',
  'chat.bug',
  'chat.frustrated',
  'chat.ai',
]);

function pick<T>(list: T[], random: () => number): T {
  return list[Math.floor(random() * list.length) % list.length];
}

export function createAskSam(options: AskSamOptions): AskSam {
  const random = options.random ?? Math.random;
  const language = options.language ?? 'en';
  const rules = RULES[language];
  const S = rules.strings;
  const plainOf = (text: string) => normalize(text, language);
  const CONTACT_CHIP: Chip = { label: S.contactChip, action: 'contact' };
  const TOPICS_CHIP: Chip = { label: S.topicsChip, action: 'topics' };
  const matcher = options.matcher ?? createMatcher(options.intents, {}, language);
  const topics = new Map(options.topics.map((topic) => [topic.id, topic]));
  const lines: TranscriptLine[] = [];
  const carryWeight = options.carry ?? { subject: CARRY_SUBJECT, ask: CARRY_ASK };

  let lastAnswer: Intent | undefined;
  let lastCandidates: Match[] = [];
  let pending: { options: string[] } | undefined;
  let misses = 0;
  let lastUnanswered = '';
  /** What the person asked that produced the last answer: what a correction is about. */
  let lastQuestion = '';
  /** Answers the person has said were wrong, never offered again while they explain. */
  const rejected = new Set<string>();
  let askedAnythingElse = false;

  const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (whole, key: string) => options.vars?.[key] ?? whole);

  const say = (reply: SamReply): SamReply => {
    lines.push({ from: 'sam', text: reply.text });
    askedAnythingElse = false;
    return reply;
  };

  const debugOf = (query: string, matches: Match[]) => ({
    query,
    candidates: matches
      .slice(0, 5)
      .map((m) => ({ id: m.intent.id, score: Math.round(m.score * 1000) / 1000 })),
  });

  const relatedChips = (intent: Intent): Chip[] =>
    (intent.related ?? [])
      .map((id) => matcher.byId(id))
      .filter((related): related is Intent => Boolean(related))
      .slice(0, 3)
      .map((related) => ({ label: related.title, intentId: related.id }));

  function answer(
    intent: Intent,
    alternatives: Chip[] = [],
    debug?: SamReply['debug'],
    lead?: string,
  ): SamReply {
    pending = undefined;
    if (intent.topic === 'chat') return chat(intent, debug);
    lastAnswer = intent;
    misses = 0;
    if (!lead) rejected.clear();
    const offered = new Set([intent.id, ...alternatives.map((chip) => chip.intentId)]);
    const chips = relatedChips(intent).filter(
      (chip) => !offered.has(chip.intentId) && !rejected.has(chip.intentId!),
    );
    return say({
      kind: 'answer',
      text: lead ? `${lead}\n\n${fill(intent.answer)}` : fill(intent.answer),
      chips: chips.slice(0, 3),
      alternatives: alternatives.length ? alternatives : undefined,
      intentId: intent.id,
      route: intent.route,
      pro: intent.pro,
      askFeedback: true,
      debug,
    });
  }

  function chat(intent: Intent, debug?: SamReply['debug']): SamReply {
    switch (intent.id) {
      case 'chat.human':
        return say({
          kind: 'contact',
          text: intent.answer,
          chips: [],
          intentId: intent.id,
          contact: { topic: 'support', draft: lastUnanswered },
          debug,
        });
      case 'chat.idea':
        return say({
          kind: 'contact',
          text: intent.answer,
          chips: [],
          intentId: intent.id,
          contact: { topic: 'idea', draft: '' },
          debug,
        });
      case 'chat.capabilities':
        return say({
          kind: 'topics',
          text: intent.answer,
          chips: topicChips(),
          intentId: intent.id,
          debug,
        });
      case 'chat.frustrated': {
        const others = lastCandidates
          .filter(
            (m) => m.intent.topic !== 'chat' && m.intent.id !== lastAnswer?.id && m.score >= MAYBE,
          )
          .slice(0, 3)
          .map((m) => ({ label: m.intent.title, intentId: m.intent.id }));
        return say({
          kind: 'chat',
          text: intent.answer,
          chips: [...others, CONTACT_CHIP],
          intentId: intent.id,
          debug,
        });
      }
      case 'chat.language':
      case 'chat.bug':
        return say({
          kind: 'chat',
          text: intent.answer,
          chips: [CONTACT_CHIP],
          intentId: intent.id,
          debug,
        });
      case 'chat.ai':
      case 'chat.who':
        return say({
          kind: 'chat',
          text: intent.answer,
          chips: [CONTACT_CHIP, TOPICS_CHIP],
          intentId: intent.id,
          debug,
        });
      default:
        return say({ kind: 'chat', text: intent.answer, chips: [], intentId: intent.id, debug });
    }
  }

  function topicChips(): Chip[] {
    return options.topics
      .filter((topic) => topic.id !== 'chat')
      .map((topic) => ({
        label: S.topics[topic.id as Exclude<TopicId, 'chat'>] ?? topic.label,
        action: 'topic' as const,
        topic: topic.id,
      }));
  }

  function fallback(query: string, matches: Match[]): SamReply {
    misses += 1;
    lastUnanswered = query;
    pending = undefined;
    const near = matches
      .filter((m) => m.score >= MAYBE * 0.8 && m.intent.topic !== 'chat')
      .slice(0, 2);
    const nearChips = near.map((m) => ({ label: m.intent.title, intentId: m.intent.id }));
    if (misses >= 2) {
      return say({
        kind: 'fallback',
        text: pick(S.fallbackAgain, random),
        chips: [CONTACT_CHIP, ...nearChips, TOPICS_CHIP],
        debug: debugOf(query, matches),
      });
    }
    return say({
      kind: 'fallback',
      text: pick(S.fallback, random),
      chips: [...nearChips, TOPICS_CHIP, CONTACT_CHIP],
      debug: debugOf(query, matches),
    });
  }

  /**
   * How a message carries on from the last exchange. Every question has a subject (a loan, a habit)
   * and an ask (how to delete, is it free). No subject means the last one ("is it free?"); only a
   * subject means the last ask ("and savings?"); both means a new question.
   */
  function carryOn(
    query: string,
    basis: string,
    previous: Intent,
  ): { context?: MatchContext; asked: string } {
    const now = matcher.slots(query);
    const before = matcher.slots(basis);
    const subject = [...new Set([...before.subject, ...matcher.slots(previous.title).subject])];
    const ownAsk = now.ask.filter((term) => !LIGHT_WORDS.has(term));
    const plain = plainOf(query);
    const switching = rules.switchStart.test(plain) && now.subject.length + ownAsk.length <= 3;
    if (
      before.ask.length &&
      (switching || (now.subject.length && !rules.questionStart.test(plain) && ownAsk.length <= 1))
    ) {
      return {
        context: {
          intentId: previous.id,
          sameAspect: true,
          followUp: true,
          carry: { terms: before.ask, weight: carryWeight.ask },
        },
        asked: `${before.ask.join(' ')} ${query}`,
      };
    }
    if (!now.subject.length && subject.length) {
      return {
        context: {
          topic: previous.topic,
          intentId: previous.id,
          related: previous.related,
          followUp: true,
          carry: { terms: subject, weight: carryWeight.subject },
        },
        asked: `${query} ${subject.join(' ')}`,
      };
    }
    if (!now.subject.length) {
      // Nothing to carry: lean on what the last answer was about, as a person would.
      return {
        context: {
          topic: previous.topic,
          intentId: previous.id,
          related: previous.related,
          subject: previous.title,
        },
        asked: query,
      };
    }
    return { asked: query };
  }

  function respond(query: string): SamReply {
    // Small talk is small talk wherever the chat was: "bye" after a card answer is goodbye.
    const alone = matcher.match(query)[0];
    if (
      alone?.intent.topic === 'chat' &&
      alone.score >= 0.8 &&
      !matcher.slots(query).subject.length
    ) {
      lastCandidates = [alone];
      return answer(alone.intent, [], debugOf(query, [alone]));
    }

    const { context, asked } = lastAnswer
      ? carryOn(query, lastQuestion || lastAnswer.title, lastAnswer)
      : { context: undefined, asked: query };
    // Small talk answers only small talk: "good, I need help with my salary" is about salary.
    const own = matcher.terms(query).filter((term) => !LIGHT_WORDS.has(term));
    const matches = matcher
      .match(query, context)
      .filter(
        (m) =>
          m.intent.topic !== 'chat' ||
          CONTACT_INTENTS.has(m.intent.id) ||
          own.filter((term) => m.intent.id && matcher.knows(m.intent.id, term)).length >=
            own.length * 0.6,
      );
    lastCandidates = matches;
    const debug = debugOf(query, matches);
    const [top, second] = matches;
    lastQuestion = asked;

    if (!top || top.score < MAYBE) return fallback(query, matches);
    if (top.intent.topic === 'chat') {
      return top.score >= LIKELY ? answer(top.intent, [], debug) : fallback(query, matches);
    }

    const rivals = matches
      .slice(1)
      .filter((m) => m.intent.topic !== 'chat' && m.score >= MAYBE && m.score >= top.score - 0.25)
      .slice(0, 3);
    const toChip = (m: Match): Chip => ({ label: m.intent.title, intentId: m.intent.id });
    const lead = top.score - (second && second.intent.topic !== 'chat' ? second.score : 0);

    if (top.score >= SURE && lead >= CLEAR_LEAD) return answer(top.intent, [], debug);

    if (top.score >= LIKELY && !(lead < TIE && top.score < 0.45)) {
      return answer(top.intent, rivals.map(toChip), debug);
    }

    const choices = [top, ...rivals].slice(0, 3);
    pending = { options: choices.map((m) => m.intent.id) };
    lastUnanswered = query;
    return say({
      kind: 'clarify',
      text: choices.length === 1 ? S.didYouMean(top.intent.title) : pick(S.clarify, random),
      chips: [...choices.map(toChip), { label: S.somethingElse, action: 'none' as const }],
      debug,
    });
  }

  /** The person says the last answer missed: drop it, and read their question again with what they added. */
  function correct(rest: string, lead: string): SamReply {
    const previous = lastAnswer!;
    rejected.add(previous.id);
    const basis = lastQuestion || previous.title;
    const adds = matcher.terms(rest).length > 0;
    const carried = adds ? carryOn(rest, basis, previous) : { context: undefined, asked: basis };
    const query = adds ? rest : basis;
    const matches = matcher
      .match(query, carried.context)
      .filter((m) => !rejected.has(m.intent.id) && m.intent.topic !== 'chat');
    lastCandidates = matches;
    const debug = debugOf(adds ? `${rest} [+ ${basis}]` : basis, matches);
    const [top] = matches;
    const toChip = (m: Match): Chip => ({ label: m.intent.title, intentId: m.intent.id });

    if (top && top.score >= LIKELY) {
      const rivals = matches
        .slice(1)
        .filter((m) => m.score >= MAYBE && m.score >= top.score - 0.25)
        .slice(0, 3);
      lastQuestion = carried.asked;
      return answer(top.intent, rivals.map(toChip), debug, pick([lead], random));
    }
    if (top && top.score >= MAYBE) {
      const choices = matches.filter((m) => m.score >= MAYBE).slice(0, 3);
      pending = { options: choices.map((m) => m.intent.id) };
      lastUnanswered = adds ? `${basis} ${rest}` : basis;
      return say({
        kind: 'clarify',
        text: `${lead} ${S.correctionClarify}`,
        chips: [...choices.map(toChip), CONTACT_CHIP],
        debug,
      });
    }
    lastUnanswered = adds ? `${basis} ${rest}` : basis;
    return say({
      kind: 'fallback',
      text: `${lead} ${S.correctionFallback}`,
      chips: [CONTACT_CHIP, TOPICS_CHIP],
      debug,
    });
  }

  function readCorrection(text: string): { rest: string; lead: string } | undefined {
    const plain = plainOf(text);
    for (const { pattern, leads } of rules.corrections) {
      const found = pattern.exec(plain);
      if (!found) continue;
      const rest = plain
        .slice(found[0].length)
        .replace(/^(?:but|so|and|ok|okay|just)\b\s*/, '')
        .trim();
      return { rest, lead: pick(leads, random) };
    }
    return undefined;
  }

  function ask(raw: string): SamReply[] {
    const text = raw.trim();
    if (!text) return [];
    lines.push({ from: 'user', text });

    if (pending) {
      const choice = rules.ordinals.find(([pattern]) => pattern.test(plainOf(text)));
      if (choice && pending.options[choice[1]])
        return [answer(matcher.byId(pending.options[choice[1]])!)];
      if (rules.yes.test(plainOf(text))) return [answer(matcher.byId(pending.options[0])!)];
      // A detail in reply to "which of these?" picks among the choices offered, read with the question.
      if (!rules.no.test(plainOf(text)) && !rules.questionStart.test(plainOf(text))) {
        const offered = new Set(pending.options);
        const picked = matcher
          .match(`${lastUnanswered} ${text}`)
          .filter((m) => offered.has(m.intent.id));
        if (picked[0] && picked[0].score >= MAYBE) {
          lastQuestion = `${lastUnanswered} ${text}`;
          return [answer(picked[0].intent)];
        }
      }
      if (rules.no.test(plainOf(text))) {
        pending = undefined;
        return [
          say({
            kind: 'fallback',
            text: S.noProblem,
            chips: [TOPICS_CHIP, CONTACT_CHIP],
          }),
        ];
      }
    }

    // "ahh ok thanks", "cool got it": nothing but thanks and nods.
    const words = plainOf(text).split(' ');
    if (words.every((word) => rules.nods.has(word))) {
      if (words.some((word) => rules.thanks.test(word))) {
        return [answer(matcher.byId('chat.thanks')!)];
      }
      const reply = say({
        kind: 'chat',
        text: pick(S.anythingElse, random),
        chips: [],
      });
      askedAnythingElse = true;
      return [reply];
    }

    // A bare "no" after "Anything else?" is goodbye; straight after an answer it means "not that".
    const correction =
      lastAnswer && !(askedAnythingElse && rules.no.test(plainOf(text)))
        ? readCorrection(text)
        : undefined;
    if (correction) return [correct(correction.rest, correction.lead)];

    if (rules.ack.test(plainOf(text)) || rules.yes.test(plainOf(text))) {
      const reply = say({
        kind: 'chat',
        text: pick(S.anythingElse, random),
        chips: [],
      });
      askedAnythingElse = true;
      return [reply];
    }

    if (rules.no.test(plainOf(text))) {
      return [say({ kind: 'chat', text: S.bye, chips: [] })];
    }

    if (rules.why.test(plainOf(text)) && lastAnswer) {
      return [
        say({
          kind: 'chat',
          text: S.why,
          chips: [...relatedChips(lastAnswer), CONTACT_CHIP],
        }),
      ];
    }

    if (rules.more.test(plainOf(text)) && lastAnswer) {
      const chips = relatedChips(lastAnswer);
      if (chips.length) {
        return [say({ kind: 'chat', text: S.more, chips })];
      }
    }

    // "Hi, how do I add a bill?": drop the greeting's words from the original text, which keeps
    // the question marks that split two questions apart.
    const greeting = rules.greetingPrefix.exec(plainOf(text))?.[0].trim();
    const withoutGreeting = greeting
      ? text.trim().split(/\s+/).slice(greeting.split(' ').length).join(' ')
      : text;
    const query =
      withoutGreeting.length >= 3 && matcher.terms(withoutGreeting).length > 0
        ? withoutGreeting
        : text;

    const parts = splitQuestions(query, matcher);
    if (parts.length > 1) {
      const replies = parts.map(respond);
      const answered = replies.filter((reply) => reply.kind === 'answer');
      if (answered.length > 0) return answered.slice(0, 3);
      return [replies[0]];
    }
    return [respond(query)];
  }

  function choose(chip: Chip): SamReply[] {
    lines.push({ from: 'user', text: chip.label });
    if (chip.action === 'none') {
      pending = undefined;
      return [
        say({
          kind: 'fallback',
          text: S.tellMeMore,
          chips: [TOPICS_CHIP, CONTACT_CHIP],
        }),
      ];
    }
    if (chip.action === 'contact') {
      return [
        say({
          kind: 'contact',
          text: S.contactIntro,
          chips: [],
          contact: { topic: 'support', draft: lastUnanswered },
        }),
      ];
    }
    if (chip.action === 'idea') {
      return [
        say({
          kind: 'contact',
          text: S.ideaIntro,
          chips: [],
          contact: { topic: 'idea', draft: '' },
        }),
      ];
    }
    if (chip.action === 'topics') {
      return [
        say({
          kind: 'topics',
          text: S.topicsIntro,
          chips: topicChips(),
        }),
      ];
    }
    if (chip.action === 'topic' && chip.topic) {
      const topic = topics.get(chip.topic);
      const starters = (topic?.starters ?? [])
        .map((id) => matcher.byId(id))
        .filter((intent): intent is Intent => Boolean(intent))
        .map((intent) => ({ label: intent.title, intentId: intent.id }));
      return [
        say({
          kind: 'topics',
          text: S.topicStarters(
            topic ? (S.topics[topic.id as Exclude<TopicId, 'chat'>] ?? topic.label) : '',
          ),
          chips: [...starters, TOPICS_CHIP],
        }),
      ];
    }
    const intent = chip.intentId ? matcher.byId(chip.intentId) : undefined;
    if (intent) lastQuestion = intent.title;
    return intent ? [answer(intent)] : [];
  }

  function feedback(intentId: string, helpful: boolean): SamReply {
    if (helpful)
      return say({
        kind: 'chat',
        text: pick(S.helpfulYes, random),
        chips: [],
      });
    const others = lastCandidates
      .filter((m) => m.intent.id !== intentId && m.intent.topic !== 'chat' && m.score >= MAYBE)
      .slice(0, 3)
      .map((m) => ({ label: m.intent.title, intentId: m.intent.id }));
    const intent = matcher.byId(intentId);
    lastUnanswered = lastUnanswered || intent?.title || '';
    return say({
      kind: 'fallback',
      text: others.length ? S.helpfulNoOthers : S.helpfulNoAlone,
      chips: [...others, CONTACT_CHIP],
    });
  }

  function greet(name?: string): SamReply {
    const starters = [
      'home.balance.what',
      'home.balance.calc',
      'habits.overview.what',
      'getting-started.skip.free',
    ]
      .map((id) => matcher.byId(id))
      .filter((intent): intent is Intent => Boolean(intent))
      .map((intent) => ({ label: intent.title, intentId: intent.id }));
    return say({
      kind: 'chat',
      text: S.greet(name),
      chips: [...starters, TOPICS_CHIP],
    });
  }

  return { greet, ask, choose, feedback, transcript: () => [...lines], matcher };
}

/**
 * "How do I add a bill? And can I change its date?" is two questions; answering only the first
 * reads as not listening. Split only where each part still has something to match on.
 */
export function splitQuestions(text: string, matcher: Matcher): string[] {
  const parts = text
    .split(
      /\?+\s+|\s+(?:and also|also|and then|plus)\s+(?=(?:how|why|what|where|when|can|could|do|does|is|are|will|should)\b)/i,
    )
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return [text];
  const useful = parts.filter((part) => matcher.terms(part).length >= 2);
  return useful.length >= 2 ? useful.slice(0, 3) : [text];
}
