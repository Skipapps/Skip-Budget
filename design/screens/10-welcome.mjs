import * as C from '../kit/components.mjs';
const { screen, vstack, flexSpacer } = C;

export const section = 'Onboarding & auth';
export const order = 10;

/** src/app/welcome.tsx — the first screen on a fresh install. */

export default [
  screen({
    id: 'welcome',
    name: 'Welcome',
    children: [
      // <Illustration source={artwork.welcomeHero} widthRatio={0.82} maxWidth={300} />
      C.Illustration('welcome-hero', { ratio: 0.82, maxW: 300 }),

      C.Title('Your money, your privacy.'),

      // <View className="mt-6 w-full gap-5">
      vstack({ mt: 24, gap: 20, name: 'Features' }, [
        C.FeatureRow('welcome-track', [
          C.RichBody([
            ['Track spending, bills, subscriptions and card balances — ', {}],
            ['all in one place.', { weight: 600, color: 'ink' }],
          ]),
        ]),
        C.FeatureRow('welcome-privacy', [
          C.RichBody([
            ['No bank login, ever.', { weight: 600, color: 'ink' }],
            [' You decide what Skip knows, and nothing else.', {}],
          ]),
        ]),
      ]),

      // <View className="mt-auto w-full gap-2 pt-8">
      flexSpacer(),
      vstack({ gap: 8, pad: { t: 32 }, name: 'Actions' }, [
        C.Button('Get started'),
        C.TextLink('I already have an account'),
      ]),
    ],
  }),
];
