// src/app/faq.tsx — the in-app answers, grouped, each question a card that
// opens in place. Copy is verbatim from GROUPS in that file.
import * as C from '../kit/components.mjs';

const { screen, vstack, hstack, text, icon } = C;

export const section = 'Support & legal';
export const order = 60;

/** Subtitle, left-aligned as faq.tsx asks for it (`className="mt-3 w-full text-left"`). */
const SubtitleLeft = (str, p = {}) => text(str, { ...C.TYPE.subtitle, align: 'left' }, p);

/**
 * One question, dressed as a card: rounded-[14px], border-line, bg-card,
 * px-5 py-4, shadows.card. The whole card is the button.
 *
 * The app rotates one ChevronDown 180°; the kit draws icons unrotated, so the
 * open card carries ChevronUp — the same glyph at the same angle.
 */
const QuestionCard = (question, { answer, open = false, ...p } = {}) =>
  vstack({ radius: 14, stroke: 'line', fill: 'card', pad: [16, 20], shadow: 'card', name: 'QuestionCard', ...p }, [
    hstack({ gap: 12, align: 'center' }, [
      text(question, { size: 15, weight: 600, lineHeight: 21, color: 'ink' }, { flex: 1 }),
      icon(open ? 'ChevronUp' : 'ChevronDown', { size: 18, color: 'muted', stroke: 2 }),
    ]),
    open ? text(answer, { size: 14, weight: 400, lineHeight: 21, color: 'body' }, { mt: 12 }) : null,
  ]);

const GROUPS = [
  {
    title: 'Getting started',
    entries: [
      {
        question: 'Why doesn’t Skip connect to my bank?',
        answer:
          'On purpose. Skip never asks for bank credentials, so there is no login to leak and no third party reading your transactions. You tell Skip what happened — by scanning a receipt, or typing a bill once — and everything it knows stays between you and your own account. Your bank never knows Skip exists.',
      },
      { question: 'Can I get the Getting started card back?' },
      { question: 'What should I set up first?' },
    ],
  },
  {
    title: 'Your money',
    entries: [
      { question: 'How does “Left this month” work?' },
      { question: 'How do savings months work?' },
      { question: 'Why can I correct a savings month?' },
      { question: 'Why don’t my card balances update by themselves?' },
    ],
  },
  {
    title: 'Receipts',
    entries: [{ question: 'Does my receipt leave my phone?' }, { question: 'The scan got something wrong.' }],
  },
  {
    title: 'Splitting with friends',
    entries: [
      { question: 'How do friends find me?' },
      { question: 'Does settling up move real money?' },
      { question: 'What does “simplify who pays whom” do?' },
      { question: 'Can I split with somebody who doesn’t have Skip?' },
    ],
  },
  {
    title: 'Loans',
    entries: [{ question: 'Why does Skip’s loan figure match my bank when other calculators don’t?' }],
  },
  {
    title: 'Reminders',
    entries: [{ question: 'Why didn’t I get a reminder?' }],
  },
  {
    title: 'Skip Pro and billing',
    entries: [
      { question: 'What does Pro include?' },
      { question: 'What happens to my things if I cancel?' },
      { question: 'How do I cancel?' },
    ],
  },
  {
    title: 'Privacy and your data',
    entries: [{ question: 'What leaves my phone?' }, { question: 'How do I delete my account?' }],
  },
];

/** `openQuestion` is the one card showing its answer; the rest are collapsed. */
const body = (openQuestion) => [
  C.Title('Common questions', { align: 'left' }),
  SubtitleLeft(
    'Short answers to the things people ask. If yours is not here, message us — a person reads every one.',
    { mt: 12 },
  ),
  ...GROUPS.map((group) =>
    vstack({ mt: 32, name: `Group/${group.title}` }, [
      C.FieldLabel(group.title, { mb: 12 }),
      vstack({ gap: 12 }, group.entries.map((entry) =>
        QuestionCard(entry.question, { answer: entry.answer, open: entry.question === openQuestion }),
      )),
    ]),
  ),
  vstack({ mt: 36, mb: 40 }, [C.Button('Still stuck? Message us', { variant: 'outline' })]),
];

export default [
  screen({ id: 'faq', name: 'FAQ', back: true, children: body(null) }),
  screen({
    id: 'faq-expanded',
    name: 'FAQ · answer open',
    back: true,
    children: body('Why doesn’t Skip connect to my bank?'),
  }),
];
