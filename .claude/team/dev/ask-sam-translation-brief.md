# Ask Sam: Spanish and French

Ask Sam is Skip's built-in help chat. It has no AI: it matches what a person types against each
answer's list of questions, then shows that answer. The English library is in
`src/lib/ask-sam/knowledge/*.ts`. Skip runs in English, Spanish and French, and Sam has to work in all
three. The Founder's words: *"make sure you have all the questions and answers properly written in
all 3 languages."*

## What you write

For your English file `src/lib/ask-sam/knowledge/<file>.ts`, write two files:

- `src/lib/ask-sam/knowledge/es/<file>.ts`, exporting `<camelName>Es`
- `src/lib/ask-sam/knowledge/fr/<file>.ts`, exporting `<camelName>Fr`

The camelName is the English export without `Intents`. For example, `homeIntents` becomes `homeEs`
and `homeFr`.

```ts
import type { IntentText } from '@/lib/ask-sam/types';

export const homeEs: IntentText[] = [
  {
    id: 'home.balance.what',
    title: '¿Qué es el número grande de Inicio?',
    questions: ['…', '…'],
    answer: '…',
    keywords: ['saldo actual'],
  },
];
```

Every intent in the English file appears exactly once, with the same `id`. Use no other fields.

## Answer

The answer is a faithful translation:

- **Facts:** every fact stays, and nothing is added or dropped. Numbers, amounts, dates, limits and worked examples stay exactly the same, `$` included.
- **Structure:** keep the same paragraphs, numbered steps ("1. "), bullets ("- ") and **bold**, and the arrows in paths (**Ajustes → Soporte y comentarios**).
- **Price placeholders:** keep `{proMonthly}` and `{proYearly}` untouched, then write the words around them naturally, for example "{proMonthly} al mes" or "{proMonthly} par mois".
- **On-screen names in bold:** use the app's own Spanish and French text. For each bold English label, find its `en:` string in `src/i18n/messages/*.ts` and use that message's `es:` or `fr:` value, word for word. Example: **Current balance** becomes **Saldo actual** or **Solde actuel**, and **Settings** becomes **Ajustes** or **Réglages**. If a label has no message (for example, the iPhone Settings app), translate it the way iOS does in that language: "la app Ajustes del iPhone" or "l'app Réglages de l'iPhone".
- **Voice:** match the app.
  - Spanish uses **tú**, warm and plain, in neutral Spanish that works in Latin America and Spain ("agregar", "tarjeta de crédito", "celular" avoided; say "iPhone").
  - French uses **tu**, warm and plain, like the app ("Écris-nous", "ton solde").
- **Sam:** speaks in the first person (“soy Sam”, “je suis Sam”).

## Title

The title is a short, natural question in that language, 70 characters at most.

## Questions

Write 10 to 14 questions per answer: 10 is the minimum, and 6 for `chat.*` small talk.

- Write them in the target language the way people really type them on a phone. Don't translate the English list line by line. Think how a Mexican, Spanish, Colombian or Argentine person, or a French, Belgian, Swiss or Québécois person, would ask.
- Mix the styles: direct, plain words without app vocabulary, how-to, why or confused, where, yes/no, problem or complaint, a short scenario, and short keyword queries.
- Write some without accents ("como agrego una factura", "ou est mon solde"). Use the occasional chat abbreviation ("q", "xq", "pq" in Spanish; "stp", "jsp" sparingly in French), and at most one realistic typo in a few of them.
- Each question must clearly belong to this answer and not its neighbours. Use the same words that tell it apart, for example "factura" vs "recibo" vs "suscripción".
- `keywords` (optional, at most 4) holds slang, short forms or app labels in that language.

## Check before you finish

```bash
node scripts/ask-sam/check-translation.mjs es <file>.ts
node scripts/ask-sam/check-translation.mjs fr <file>.ts
npx prettier --write src/lib/ask-sam/knowledge/es/<file>.ts src/lib/ask-sam/knowledge/fr/<file>.ts
```

Both checks must end in `OK`. Write only your two files: no other edits, no git, no team log.

Report the counts and any labels you couldn't find in the app's messages.
