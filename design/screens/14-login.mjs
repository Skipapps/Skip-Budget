import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, text, flexSpacer } = C;

export const section = 'Onboarding & auth';
export const order = 14;

/**
 * src/app/login.tsx — email + password, with the agreement under the button.
 *
 * The legal line is `flex-row flex-wrap items-center justify-center` mixing
 * 12px muted copy with two subtle TextLinks. The kit's `wrap` is left-aligned
 * and has no inline runs, so the two lines it breaks into at 342pt are drawn
 * here as two centred rows.
 */
const legalLine = () =>
  vstack({ mt: 20, name: 'Agreement' }, [
    hstack({ justify: 'center', gap: 0 }, [
      text('By continuing you agree to our', { size: 12, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
      C.TextLink('Terms of service', { variant: 'subtle' }),
    ]),
    hstack({ justify: 'center', gap: 0 }, [
      text('and', { size: 12, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
      C.TextLink('Privacy policy', { variant: 'subtle' }),
    ]),
  ]);

const login = ({ id, name, email = '', password = '', error, label = 'Log in' }) =>
  screen({
    id,
    name,
    back: true,
    children: [
      C.Title('Log in'),
      C.Subtitle('Welcome back. Pick up where you left off.', { mt: 12 }),

      // <View className="mt-8 w-full gap-5">
      vstack({ mt: 32, gap: 20, name: 'Fields' }, [
        C.TextField('Email', { value: email, focused: Boolean(email) && !password }),
        vstack({}, [
          C.TextField('Password', { value: password, password: true, error }),
          // className="self-end py-2 pr-1"
          C.TextLink('Forgot password?', { variant: 'subtle', self: 'end', hug: true, pad: [8, 0], mr: 4 }),
        ]),
      ]),

      // <View className="mt-auto w-full pt-10">
      flexSpacer(),
      vstack({ pad: { t: 40 }, name: 'Actions' }, [C.Button(label), legalLine()]),
    ],
  });

export default [
  login({ id: 'login', name: 'Log in' }),
  login({
    id: 'login-filled',
    name: 'Log in — filled',
    email: 'sam@skipbudget.app',
    password: '••••••••••',
  }),
  login({
    id: 'login-error',
    name: 'Log in — wrong credentials',
    email: 'sam@skipbudget.app',
    password: '••••••',
    error: 'Invalid login credentials.',
  }),
  login({
    id: 'login-busy',
    name: 'Log in — signing in',
    email: 'sam@skipbudget.app',
    password: '••••••••••',
    label: 'Signing in…',
  }),
];
