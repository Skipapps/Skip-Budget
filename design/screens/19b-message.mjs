import * as C from '../kit/components.mjs';
const { screen, vstack, flexSpacer } = C;

export const section = 'Onboarding & auth';
export const order = 19;

/** src/app/message.tsx — why Skip is different, between Welcome and Auth. */

export default [
  screen({
    id: 'message',
    name: 'Why Skip is different',
    back: true,
    children: [
      C.Title('Why Skip is different'),

      // <View className="mt-8 w-full gap-4">
      vstack({ mt: 32, gap: 16, name: 'Copy' }, [
        C.Body(
          'Skip is built for people who want to truly understand their money—not simply automate it and forget about it.',
        ),
        C.Body(
          'While many budgeting apps automatically import and categorize everything, Skip takes a more intentional approach. Recording your spending helps you notice where your money goes, understand your habits, and appreciate what you save.',
        ),
        C.Body(
          'Our team spent months designing Skip this way. It is not missing automatic budgeting—it is intentionally built around awareness, privacy, and control.',
        ),
      ]),

      C.Quote(
        '“People once recorded every penny in a ledger. Skip brings that same financial awareness into modern life—without the paperwork.”',
        { mt: 32 },
      ),

      C.RichBody(
        [
          ['Skip Budget', { weight: 600, color: 'ink' }],
          [': Know where your money goes. Decide where it goes next.', {}],
        ],
        { mt: 32 },
      ),

      // <View className="mt-auto w-full pt-10">
      flexSpacer(),
      vstack({ pad: { t: 40 }, name: 'Actions' }, [C.Button('Lets go')]),
    ],
  }),
];
