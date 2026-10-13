import { createAskSam, splitQuestions } from '@/lib/ask-sam/conversation';
import { parseAnswer } from '@/lib/ask-sam/format';
import { createMatcher, damerauLevenshtein, terms } from '@/lib/ask-sam/matcher';
import { normalize, stem } from '@/lib/ask-sam/text';
import type { Intent } from '@/lib/ask-sam/types';
import { chatIntents } from '@/lib/ask-sam/knowledge/chat';
import { TOPICS } from '@/lib/ask-sam/topics';

const q = (...list: string[]) => [
  ...list,
  ...Array.from({ length: Math.max(0, 10 - list.length) }, (_, i) => `${list[0]} ${i}`),
];

const FIXTURE: Intent[] = [
  {
    id: 'home.balance.what',
    topic: 'home',
    title: 'What is the Current balance?',
    questions: q(
      'what is the current balance',
      'what is the big number on home',
      'what does the main card on home show',
      'why is the number in the centre of home',
    ),
    answer: 'It is the money you have now.',
    keywords: ['current balance', 'main number'],
    related: ['home.balance.calc', 'home.balance.negative'],
    route: '/home',
  },
  {
    id: 'home.balance.calc',
    topic: 'home',
    title: 'How is the Current balance worked out?',
    questions: q(
      'how is the current balance calculated',
      'how is my balance worked out',
      'where does the balance number come from',
      'what goes into the current balance',
    ),
    answer: 'Typed balances, plus pay since, minus spending since.',
    related: ['home.balance.what'],
  },
  {
    id: 'home.balance.negative',
    topic: 'home',
    title: 'Why is my balance negative?',
    questions: q(
      'why is my balance negative',
      'why is the current balance below zero',
      'balance shows minus',
      'why is my balance red',
    ),
    answer: 'More went out than you had.',
  },
  {
    id: 'bills.add.how',
    topic: 'bills',
    title: 'How do I add a bill?',
    questions: q(
      'how do i add a bill',
      'add my rent',
      'where do i put my electricity bill',
      'create a new bill',
    ),
    answer: 'Tap **Quick add**, then **Bill**.\n\n1. Pick a category\n2. Type the amount',
  },
  {
    id: 'bills.delete.how',
    topic: 'bills',
    title: 'How do I delete a bill?',
    questions: q(
      'how do i delete a bill',
      'remove a bill',
      'get rid of my old bill',
      'erase a bill i added by mistake',
    ),
    answer: 'Open the bill, tap the pencil, then **Delete**.',
  },
  {
    id: 'pro.price.what',
    topic: 'pro',
    title: 'How much is Pro?',
    questions: q('how much is pro', 'what does pro cost', 'price of premium', 'is pro expensive'),
    answer: 'Pro is {proMonthly} a month or {proYearly} a year.',
    pro: true,
  },
  ...chatIntents,
];

const newSam = () =>
  createAskSam({
    intents: FIXTURE,
    topics: TOPICS,
    vars: { proMonthly: '$1.99', proYearly: '$19.99' },
    random: () => 0,
  });

describe('text', () => {
  it('expands contractions and drops possessives', () => {
    expect(normalize("What's Skip's balance? I can't see it")).toBe(
      'what is skip balance i can not see it',
    );
  });

  it('meets word forms in one stem', () => {
    expect(stem('bills')).toBe('bill');
    expect(stem('billing')).toBe('bill');
    expect(stem('scanned')).toBe('scan');
    expect(stem('saving')).toBe('save');
    expect(stem('categories')).toBe('category');
    expect(stem('added')).toBe('add');
    expect(stem('news')).toBe('news');
  });

  it('folds phrases and synonyms to one word', () => {
    expect(terms('how do I log in')).toEqual(terms('how do I sign in'));
    expect(terms('get rid of a bill')).toEqual(terms('delete a bill'));
    expect(terms('my paycheck')).toEqual(terms('my salary'));
  });

  it('measures typos as a short distance', () => {
    expect(damerauLevenshtein('balance', 'balnace')).toBe(1);
    expect(damerauLevenshtein('subscription', 'subscribtion')).toBe(1);
    expect(damerauLevenshtein('bill', 'loan', 1)).toBe(2);
  });
});

describe('matcher', () => {
  const matcher = createMatcher(FIXTURE);
  const top = (query: string) => matcher.match(query)[0]?.intent.id;

  it('finds the answer however it is asked', () => {
    expect(top('whats that big number on the home screen')).toBe('home.balance.what');
    expect(top('why is the card number in the center')).toBe('home.balance.what');
    expect(top('how do i remove my bill')).toBe('bills.delete.how');
    expect(top('put my rent in')).toBe('bills.add.how');
    expect(top('how much does premium cost')).toBe('pro.price.what');
  });

  it('shrugs off typos', () => {
    expect(top('how is my currnet balnace calculatd')).toBe('home.balance.calc');
    expect(top('delte a bil')).toBe('bills.delete.how');
  });

  it('reads a short follow-up in the light of the last answer', () => {
    const context = {
      topic: 'home',
      intentId: 'home.balance.what',
      related: ['home.balance.calc', 'home.balance.negative'],
    };
    expect(matcher.match('how is it worked out', context)[0].intent.id).toBe('home.balance.calc');
  });
});

describe('conversation', () => {
  it('greets with starter questions and a way to browse', () => {
    const reply = newSam().greet('Ana');
    expect(reply.text).toMatch(/^Hi Ana, I’m Sam\./);
    expect(reply.chips.some((chip) => chip.action === 'topics')).toBe(true);
  });

  it('answers with the related questions as next steps and fills in prices', () => {
    const sam = newSam();
    const [reply] = sam.ask('what is the big number on home');
    expect(reply.kind).toBe('answer');
    expect(reply.intentId).toBe('home.balance.what');
    expect(reply.chips.map((chip) => chip.intentId)).toEqual([
      'home.balance.calc',
      'home.balance.negative',
    ]);
    expect(reply.route).toBe('/home');
    expect(sam.ask('how much is pro')[0].text).toBe('Pro is $1.99 a month or $19.99 a year.');
  });

  it('follows up on the last answer', () => {
    const sam = newSam();
    sam.ask('what is the current balance');
    expect(sam.ask('how is it calculated')[0].intentId).toBe('home.balance.calc');
  });

  it('answers two questions in one message', () => {
    const sam = newSam();
    const replies = sam.ask('How do I add a bill? And how do I delete a bill?');
    expect(replies.map((reply) => reply.intentId)).toEqual(['bills.add.how', 'bills.delete.how']);
    expect(splitQuestions('how do i add a bill', sam.matcher)).toEqual(['how do i add a bill']);
  });

  it('says it did not understand, then offers a person first after a second miss', () => {
    const sam = newSam();
    const first = sam.ask('purple elephants dancing');
    expect(first[0].kind).toBe('fallback');
    expect(first[0].chips.some((chip) => chip.action === 'contact')).toBe(true);
    const second = sam.ask('zebra trampoline quantum');
    expect(second[0].kind).toBe('fallback');
    expect(second[0].chips[0].action).toBe('contact');
  });

  it('opens the contact form with what the person already asked', () => {
    const sam = newSam();
    sam.ask('purple elephants dancing');
    const [reply] = sam.ask('can i talk to a real person');
    expect(reply.kind).toBe('contact');
    expect(reply.contact).toEqual({ topic: 'support', draft: 'purple elephants dancing' });
  });

  it('is honest about not being a person or an AI', () => {
    const [reply] = newSam().ask('are you a bot or a human?');
    expect(reply.intentId).toBe('chat.ai');
    expect(reply.text).toMatch(/not a person, and I’m not an AI/);
  });

  it('takes "yes" as the answer to "did you mean"', () => {
    const sam = newSam();
    const [unsure] = sam.ask('balance zero');
    if (unsure.kind === 'clarify') {
      expect(sam.ask('yes')[0].kind).toBe('answer');
    } else {
      expect(unsure.kind).toBe('answer');
    }
  });

  it('offers other answers after a thumbs down', () => {
    const sam = newSam();
    sam.ask('why is my balance negative');
    const reply = sam.feedback('home.balance.negative', false);
    expect(reply.chips.at(-1)?.action).toBe('contact');
  });

  it('keeps a transcript for the contact form', () => {
    const sam = newSam();
    sam.ask('how do i add a bill');
    expect(sam.transcript().map((line) => line.from)).toEqual(['user', 'sam']);
  });
});

describe('answer format', () => {
  it('splits paragraphs, steps and bold', () => {
    expect(
      parseAnswer('Tap **Quick add**, then **Bill**.\n\n1. Pick a category\n2. Type the amount'),
    ).toEqual([
      {
        type: 'paragraph',
        spans: [
          { text: 'Tap ', bold: false },
          { text: 'Quick add', bold: true },
          { text: ', then ', bold: false },
          { text: 'Bill', bold: true },
          { text: '.', bold: false },
        ],
      },
      {
        type: 'steps',
        items: [
          [{ text: 'Pick a category', bold: false }],
          [{ text: 'Type the amount', bold: false }],
        ],
      },
    ]);
  });
});
