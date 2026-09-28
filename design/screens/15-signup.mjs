import * as C from '../kit/components.mjs';
const { screen, vstack, flexSpacer } = C;

export const section = 'Onboarding & auth';
export const order = 15;

/** src/app/signup.tsx — email, password, confirm. */
const signup = ({ id, name, email = '', password = '', confirm = '', error, label = 'Create account' }) =>
  screen({
    id,
    name,
    back: true,
    children: [
      C.Title('Create your account'),
      C.Subtitle('Use your email and a password you will remember.', { mt: 12 }),

      // <View className="mt-8 w-full gap-5">
      vstack({ mt: 32, gap: 20, name: 'Fields' }, [
        C.TextField('Email', { value: email }),
        C.TextField('Password', { value: password, password: true }),
        C.TextField('Confirm password', { value: confirm, password: true, error }),
      ]),

      // <View className="mt-auto w-full gap-2 pt-10">
      flexSpacer(),
      vstack({ gap: 8, pad: { t: 40 }, name: 'Actions' }, [
        C.Button(label),
        C.TextLink('I already have an account'),
      ]),
    ],
  });

export default [
  signup({ id: 'signup', name: 'Create your account' }),
  signup({
    id: 'signup-filled',
    name: 'Create your account — filled',
    email: 'sam@skipbudget.app',
    password: '••••••••••',
    confirm: '••••••••••',
  }),
  signup({
    id: 'signup-error',
    name: 'Create your account — passwords do not match',
    email: 'sam@skipbudget.app',
    password: '••••••••••',
    confirm: '•••••••',
    error: 'Those passwords do not match.',
  }),
  signup({
    id: 'signup-busy',
    name: 'Create your account — creating',
    email: 'sam@skipbudget.app',
    password: '••••••••••',
    confirm: '••••••••••',
    label: 'Creating…',
  }),
];
