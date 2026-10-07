import { LegalDocument, type Section } from '@/components/ui/legal-document';
import { t } from '@/i18n';

/** A developer's draft, not legal advice. */

/** Built on render: a list made at import would stay in the language the app opened in. */
function sections(): Section[] {
  return [
    {
      heading: t('legal.terms.agree.heading'),
      blocks: [{ kind: 'text', text: t('legal.terms.agree.p1') }],
    },
    {
      heading: t('legal.terms.what.heading'),
      blocks: [
        { kind: 'text', text: t('legal.terms.what.p1') },
        { kind: 'note', text: t('legal.terms.what.note') },
        { kind: 'text', text: t('legal.terms.what.p2') },
      ],
    },
    {
      heading: t('legal.terms.account.heading'),
      blocks: [
        {
          kind: 'bullets',
          items: [
            t('legal.terms.account.b1'),
            t('legal.terms.account.b2'),
            t('legal.terms.account.b3'),
          ],
        },
      ],
    },
    {
      heading: t('legal.terms.using.heading'),
      blocks: [{ kind: 'text', text: t('legal.terms.using.p1') }],
    },
    {
      heading: t('legal.terms.yours.heading'),
      blocks: [{ kind: 'text', text: t('legal.terms.yours.p1') }],
    },
    {
      heading: t('legal.terms.change.heading'),
      blocks: [{ kind: 'text', text: t('legal.terms.change.p1') }],
    },
    {
      heading: t('legal.terms.money.heading'),
      blocks: [{ kind: 'text', text: t('legal.terms.money.p1') }],
    },
    {
      heading: t('legal.terms.warranty.heading'),
      blocks: [{ kind: 'text', text: t('legal.terms.warranty.p1') }],
    },
    {
      heading: t('legal.terms.liability.heading'),
      blocks: [{ kind: 'text', text: t('legal.terms.liability.p1') }],
    },
    {
      heading: t('legal.terms.ending.heading'),
      blocks: [{ kind: 'text', text: t('legal.terms.ending.p1') }],
    },
    {
      heading: t('legal.terms.changes.heading'),
      blocks: [{ kind: 'text', text: t('legal.terms.changes.p1') }],
    },
    {
      heading: t('legal.terms.law.heading'),
      blocks: [
        { kind: 'text', text: t('legal.terms.law.p1') },
        { kind: 'note', text: t('legal.terms.law.note') },
      ],
    },
  ];
}

export default function TermsScreen() {
  return (
    <LegalDocument
      title={t('legal.terms.title')}
      updated={t('legal.terms.updated')}
      summary={t('legal.terms.summary')}
      sections={sections()}
    />
  );
}
