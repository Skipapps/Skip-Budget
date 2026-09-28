import * as C from '../kit/components.mjs';
const { screen, vstack, flexSpacer } = C;

export const section = 'Onboarding & auth';
export const order = 16;

/** src/app/forgot-password.tsx — one field, then the code screen. */
const forgot = ({ id, name, email = '', error, label = 'Continue' }) =>
  screen({
    id,
    name,
    back: true,
    children: [
      C.Title('Forgot password?'),
      C.Subtitle('Enter your email and we will send you a 6-digit verification code.', { mt: 12 }),

      // <View className="mt-8 w-full">
      C.TextField('Email', { value: email, error, focused: Boolean(email) && !error, mt: 32 }),

      // <View className="mt-auto w-full pt-10">
      flexSpacer(),
      vstack({ pad: { t: 40 }, name: 'Actions' }, [C.Button(label)]),
    ],
  });

export default [
  forgot({ id: 'forgot-password', name: 'Forgot password' }),
  forgot({ id: 'forgot-password-filled', name: 'Forgot password — filled', email: 'sam@skipbudget.app' }),
  forgot({
    id: 'forgot-password-error',
    name: 'Forgot password — no email entered',
    error: 'Enter the email on your account.',
  }),
  forgot({
    id: 'forgot-password-busy',
    name: 'Forgot password — sending',
    email: 'sam@skipbudget.app',
    label: 'Sending…',
  }),
];
