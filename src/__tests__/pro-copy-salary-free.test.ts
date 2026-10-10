import { faqMessages } from '@/i18n/messages/faq';
import { proMessages } from '@/i18n/messages/pro';
import type { Message } from '@/i18n/translate';

/**
 * Salary and moving money between accounts are free on every plan, so nothing that sells Pro may
 * count either among what it unlocks: not the Pro pages, the compare table or the feature
 * explainers, and not the FAQ's Pro answers. Checked in every language, since a translation can keep
 * a claim the English dropped.
 */

const FREE_FOR_ALL = [
  /\b(incomes?|salar(y|ies)|paychecks?|ingresos?|salarios?|sueldos?|revenus?|salaires?|paies?)\b/i,
  /\b(mov(e|es|ing) money|transfers?|mueve dinero|transfiere|transferencias?|transf[eè]re|virements?)\b/i,
];

const text = (value: Message['en']): string[] =>
  typeof value === 'string' ? [value] : Object.values(value);

const proCopy = Object.entries({
  ...proMessages,
  ...Object.fromEntries(Object.entries(faqMessages).filter(([key]) => key.startsWith('faq.pro.'))),
}) as [string, Message][];

it.each(['en', 'es', 'fr'] as const)(
  'claims neither income nor moving money anywhere Pro is sold, in %s',
  (language) => {
    const claims = proCopy.flatMap(([key, message]) =>
      text(message[language])
        .filter((line) => FREE_FOR_ALL.some((claim) => claim.test(line)))
        .map((line) => `${key}: ${line}`),
    );
    expect(claims).toEqual([]);
  },
);

it('keeps no middle point for the Unlimited explainer', () => {
  expect(proMessages).not.toHaveProperty(['pro.unlimited.b']);
});
