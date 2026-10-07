import { LegalDocument, type Section } from '@/components/ui/legal-document';
import { t } from '@/i18n';

/** A developer's draft, not legal advice. Factual claims follow what the code actually does. */

/** Built on render: a list made at import would stay in the language the app opened in. */
function sections(): Section[] {
  return [
    {
      heading: t('legal.privacy.who.heading'),
      blocks: [
        { kind: 'text', text: t('legal.privacy.who.p1') },
        { kind: 'text', text: t('legal.privacy.who.p2') },
      ],
    },
    {
      heading: t('legal.privacy.stores.heading'),
      blocks: [
        { kind: 'text', text: t('legal.privacy.stores.p1') },
        {
          kind: 'bullets',
          items: [
            t('legal.privacy.stores.b1'),
            t('legal.privacy.stores.b2'),
            t('legal.privacy.stores.b3'),
            t('legal.privacy.stores.b4'),
          ],
        },
        { kind: 'note', text: t('legal.privacy.stores.note') },
      ],
    },
    {
      heading: t('legal.privacy.local.heading'),
      blocks: [
        {
          kind: 'bullets',
          items: [t('legal.privacy.local.b1'), t('legal.privacy.local.b2')],
        },
      ],
    },
    {
      heading: t('legal.privacy.voice.heading'),
      blocks: [
        { kind: 'text', text: t('legal.privacy.voice.p1') },
        {
          kind: 'bullets',
          items: [
            t('legal.privacy.voice.b1'),
            t('legal.privacy.voice.b2'),
            t('legal.privacy.voice.b3'),
            t('legal.privacy.voice.b4'),
          ],
        },
        { kind: 'note', text: t('legal.privacy.voice.note') },
      ],
    },
    {
      heading: t('legal.privacy.others.heading'),
      blocks: [
        { kind: 'text', text: t('legal.privacy.others.p1') },
        {
          kind: 'bullets',
          items: [
            t('legal.privacy.others.b1'),
            t('legal.privacy.others.b2'),
            t('legal.privacy.others.b3'),
            t('legal.privacy.others.b4'),
            t('legal.privacy.others.b5'),
          ],
        },
        { kind: 'text', text: t('legal.privacy.others.p2') },
      ],
    },
    {
      heading: t('legal.privacy.kept.heading'),
      blocks: [
        {
          kind: 'bullets',
          items: [t('legal.privacy.kept.b1'), t('legal.privacy.kept.b2')],
        },
      ],
    },
    {
      heading: t('legal.privacy.deleting.heading'),
      blocks: [
        { kind: 'text', text: t('legal.privacy.deleting.p1') },
        { kind: 'note', text: t('legal.privacy.deleting.note') },
      ],
    },
    {
      heading: t('legal.privacy.rights.heading'),
      blocks: [{ kind: 'text', text: t('legal.privacy.rights.p1') }],
    },
    {
      heading: t('legal.privacy.children.heading'),
      blocks: [{ kind: 'text', text: t('legal.privacy.children.p1') }],
    },
    {
      heading: t('legal.privacy.changes.heading'),
      blocks: [{ kind: 'text', text: t('legal.privacy.changes.p1') }],
    },
  ];
}

export default function PrivacyScreen() {
  return (
    <LegalDocument
      title={t('legal.privacy.title')}
      updated={t('legal.privacy.updated')}
      summary={t('legal.privacy.summary')}
      sections={sections()}
    />
  );
}
