import { createAskSam } from '@/lib/ask-sam/conversation';
import { CONVERSATIONS } from '@/lib/ask-sam/eval/conversations';
import { ALIASES, HELD_OUT, NOT_ABOUT_SKIP } from '@/lib/ask-sam/eval/held-out';
import { ALL_INTENTS } from '@/lib/ask-sam/knowledge';
import { intentsFor } from '@/lib/ask-sam/library';
import { createMatcher } from '@/lib/ask-sam/matcher';
import { prepare } from '@/lib/ask-sam/prepare';
import { PREPARED_EN } from '@/lib/ask-sam/prepared/en';
import { PREPARED_ES } from '@/lib/ask-sam/prepared/es';
import { PREPARED_FR } from '@/lib/ask-sam/prepared/fr';
import { TOPICS } from '@/lib/ask-sam/topics';

const ids = new Set(ALL_INTENTS.map((intent) => intent.id));

describe('the library', () => {
  it('has one intent per id', () => {
    expect(ids.size).toBe(ALL_INTENTS.length);
  });

  it('links only to answers that exist', () => {
    const broken = ALL_INTENTS.flatMap((intent) =>
      (intent.related ?? []).filter((id) => !ids.has(id)).map((id) => `${intent.id} -> ${id}`),
    );
    expect(broken).toEqual([]);
  });

  it('offers only real answers as topic starters', () => {
    const missing = TOPICS.flatMap((topic) => topic.starters.filter((id) => !ids.has(id)));
    expect(missing).toEqual([]);
  });

  it('asks every answer at least ten ways, except small talk', () => {
    const thin = ALL_INTENTS.filter(
      (intent) => intent.topic !== 'chat' && intent.questions.length < 10,
    );
    expect(thin.map((intent) => intent.id)).toEqual([]);
  });

  it('never names the services behind the app', () => {
    const technical = /\b(supabase|revenuecat|edge function|database|postgres|backend)\b/i;
    expect(ALL_INTENTS.filter((intent) => technical.test(intent.answer)).map((i) => i.id)).toEqual(
      [],
    );
  });

  it('fills only the price placeholders', () => {
    const unknown = ALL_INTENTS.filter((intent) =>
      /\{(?!proMonthly\}|proYearly\})\w+\}/.test(intent.answer),
    );
    expect(unknown.map((intent) => intent.id)).toEqual([]);
  });

  // The phone matches against these instead of the knowledge files, so stale ones answer from an
  // old library. Fix with: node scripts/ask-sam/build-prepared.mjs
  it('ships prepared terms made from the current knowledge files', () => {
    const shipped = { en: PREPARED_EN, es: PREPARED_ES, fr: PREPARED_FR };
    for (const language of ['en', 'es', 'fr'] as const) {
      const fresh =
        JSON.stringify(prepare(intentsFor(language), language)) ===
        JSON.stringify(shipped[language]);
      expect({ language, fresh }).toEqual({ language, fresh: true });
    }
  });
});

describe('questions Sam has never seen', () => {
  const matcher = createMatcher(ALL_INTENTS);
  const cases = HELD_OUT.map((c) => ({ ...c, id: ALIASES[c.id] ?? c.id }));

  it('name answers that exist', () => {
    expect(cases.filter((c) => !ids.has(c.id)).map((c) => c.id)).toEqual([]);
  });

  // Floors, not targets: raise them as the library improves, never lower them to pass.
  it('puts the right answer on screen for most of them', () => {
    let first = 0;
    let shown = 0;
    for (const c of cases) {
      const sam = createAskSam({ intents: ALL_INTENTS, topics: TOPICS, matcher, random: () => 0 });
      const [reply] = sam.ask(c.q);
      const offered = [reply.intentId, ...(reply.alternatives ?? []).map((chip) => chip.intentId)];
      if (reply.kind === 'clarify') offered.push(...reply.chips.map((chip) => chip.intentId));
      if (reply.intentId === c.id) first += 1;
      if (offered.includes(c.id)) shown += 1;
    }
    expect(first / cases.length).toBeGreaterThanOrEqual(0.72);
    expect(shown / cases.length).toBeGreaterThanOrEqual(0.86);
  });

  it('declines most questions that are not about Skip', () => {
    const answered = NOT_ABOUT_SKIP.filter((q) => {
      const [reply] = createAskSam({
        intents: ALL_INTENTS,
        topics: TOPICS,
        matcher,
        random: () => 0,
      }).ask(q);
      return reply.kind === 'answer';
    });
    expect(answered.length).toBeLessThanOrEqual(3);
  });
});

describe('a conversation', () => {
  const matcher = createMatcher(ALL_INTENTS);
  const talk = (...turns: string[]) => {
    const sam = createAskSam({ intents: ALL_INTENTS, topics: TOPICS, matcher, random: () => 0 });
    return turns.map((turn) => sam.ask(turn)[0].intentId);
  };

  it('reads "it" as the thing just discussed', () => {
    expect(talk('what is the habit tracker', 'is it free', 'how do i delete one')).toEqual([
      'habits.overview.what',
      'habits.pro.free',
      'habits.delete.how',
    ]);
    expect(
      talk('what is the current balance', 'how is it calculated', 'why is it negative'),
    ).toEqual(['home.balance.what', 'home.balance.calc', 'home.balance.negative']);
    expect(talk('what is skip pro', 'how much is it', 'how do i cancel it')).toEqual([
      'pro.what.overview',
      'pro.price.plans',
      'pro.manage.cancel',
    ]);
  });

  it('reads "what about" as the same question about something else', () => {
    expect(talk('how do i add a bill', 'what about a subscription')).toEqual([
      'bills.add.how',
      'subscriptions.add.how',
    ]);
  });
});

describe('carrying a conversation', () => {
  const matcher = createMatcher(ALL_INTENTS);
  const talk = (...turns: string[]) => {
    const sam = createAskSam({ intents: ALL_INTENTS, topics: TOPICS, matcher, random: () => 0 });
    return turns.map((turn) => sam.ask(turn)[0]);
  };

  it('reads "I cancelled Pro" as done, not as how to cancel', () => {
    const [reply] = talk('I cancled pro but I need my card details back, how to get that back');
    expect(reply.intentId).toBe('cards.free.locked');
  });

  it('owns a miss and tries again without repeating it', () => {
    const [first, second] = talk('how do i add a bill', 'no i mean a subscription');
    expect(first.intentId).toBe('bills.add.how');
    expect(second.intentId).toBe('subscriptions.add.how');
    expect(second.text).toMatch(/^Ah, I see what you mean\./);
  });

  it('keeps small talk small, wherever the chat was', () => {
    const replies = talk('why is my card faded', 'ahh ok thanks', 'bye');
    expect(replies.map((reply) => reply.intentId)).toEqual([
      'cards.free.locked',
      'chat.thanks',
      'chat.bye',
    ]);
    expect(talk('are you a real person')[0].intentId).toBe('chat.ai');
  });

  // Floors, not targets: raise them as Sam improves, never lower them to pass.
  it('answers most follow-ups in the testers’ chats', () => {
    let right = 0;
    let shown = 0;
    let total = 0;
    for (const conversation of CONVERSATIONS) {
      const sam = createAskSam({ intents: ALL_INTENTS, topics: TOPICS, matcher, random: () => 0 });
      conversation.turns.forEach((turn, index) => {
        const [reply] = sam.ask(turn.say);
        if (index === 0 || turn.expect.includes('any')) return;
        const want = turn.expect.map((id) => ALIASES[id] ?? id);
        const offered = [
          reply.intentId,
          ...(reply.alternatives ?? []).map((chip) => chip.intentId),
          ...(reply.kind === 'clarify' ? reply.chips.map((chip) => chip.intentId) : []),
        ];
        total += 1;
        if (reply.intentId && want.includes(reply.intentId)) right += 1;
        if (want.some((id) => offered.includes(id))) shown += 1;
      });
    }
    expect(right / total).toBeGreaterThanOrEqual(0.55);
    expect(shown / total).toBeGreaterThanOrEqual(0.68);
  });
});
