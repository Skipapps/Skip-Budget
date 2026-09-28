// src/app/contact.tsx — one form for support and for ideas. The topic only
// changes the heading, the subtitle and the message placeholder.
import * as C from '../kit/components.mjs';

const { screen, vstack, box, text, icon, flexSpacer } = C;

export const section = 'Support & legal';
export const order = 61;

const SubtitleLeft = (str, p = {}) => text(str, { ...C.TYPE.subtitle, align: 'left' }, p);

const COPY = {
  support: {
    title: 'Email support',
    subtitle: 'Tell us what went wrong and we will look into it.',
    placeholder: 'What happened, and what were you doing when it did?',
  },
  idea: {
    title: 'Share an idea',
    subtitle: 'What should Skip do next?',
    placeholder: 'Describe the thing you wish Skip could do.',
  },
};

const EMAIL = 'sampath@example.com';

/**
 * The read-only address block. Not a TextField: the app draws a bordered box
 * with muted text, because the address is read from the session and a box you
 * can type in would change nothing.
 */
const EmailBlock = () =>
  vstack({ name: 'EmailBlock' }, [
    C.FieldLabel('Your email', { mb: 8 }),
    box({ radius: 10, stroke: 'line', fill: 'ink/3', pad: [14, 16] }, [
      text(EMAIL, { size: 15, weight: 400, lineHeight: 22, color: 'muted' }, { nowrap: true }),
    ]),
    text('We reply to the address you signed in with.', { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 6 }),
  ]);

/** The multiline message box — min-h-[160px], 10px corners, bg-card. */
const MessageBlock = (value, placeholder) =>
  vstack({ name: 'MessageBlock' }, [
    C.FieldLabel('Message', { mb: 8 }),
    box({ minH: 160, radius: 10, stroke: 'line', fill: 'card', pad: [14, 16], align: 'stretch' }, [
      text(value || placeholder, { size: 15, weight: 400, lineHeight: 22, color: value ? 'ink' : 'muted' }),
    ]),
    text(`${value.length} / 4000`, { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 6, self: 'end', hug: true }),
  ]);

const form = ({ topic = 'support', name = 'Sam', message = '', error, sending = false } = {}) => {
  const copy = COPY[topic];
  return [
    C.Title(copy.title, { align: 'left' }),
    SubtitleLeft(copy.subtitle, { mt: 8 }),
    vstack({ mt: 28, gap: 20 }, [
      C.TextField('Your name', { value: name, placeholder: 'What should we call you?' }),
      EmailBlock(),
      MessageBlock(message, copy.placeholder),
    ]),
    error
      ? text(error, { size: 13, weight: 400, lineHeight: 18, color: 'moneyOut', align: 'center' }, { mt: 16 })
      : null,
    flexSpacer(),
    vstack({ pad: { t: 32 } }, [C.Button(sending ? 'Sending…' : 'Send', { disabled: sending })]),
  ];
};

const FILLED =
  'The Electricity bill charged $61.40 on the 16th but Skip still shows the scheduled $59.99 on the card ledger.';

export default [
  screen({ id: 'contact', name: 'Contact · support', back: true, children: form() }),
  screen({ id: 'contact-idea', name: 'Contact · idea', back: true, children: form({ topic: 'idea' }) }),
  screen({ id: 'contact-filled', name: 'Contact · filled in', back: true, children: form({ message: FILLED }) }),
  screen({
    id: 'contact-error',
    name: 'Contact · nothing written',
    back: true,
    children: form({ error: 'Write a message first.' }),
  }),
  screen({
    id: 'contact-sending',
    name: 'Contact · sending',
    back: true,
    children: form({ message: FILLED, sending: true }),
  }),
  screen({
    id: 'contact-sent',
    name: 'Contact · sent',
    back: true,
    children: [
      vstack({ flex: 1, justify: 'center', align: 'center', gap: 24, pad: { x: 16 } }, [
        box({ w: 80, h: 80, radius: 'full', fill: 'accent/15', justify: 'center', align: 'center' }, [
          icon('Check', { size: 36, color: 'accentInk', stroke: 2.4 }),
        ]),
        vstack({ align: 'center', gap: 8 }, [
          C.Title('Sent', { flush: true }),
          C.Subtitle(`Thanks — we read every one. If it needs an answer it will come to ${EMAIL}.`),
        ]),
        C.Button('Done'),
      ]),
    ],
  }),
];
