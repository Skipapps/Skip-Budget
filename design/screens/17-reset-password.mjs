import * as C from '../kit/components.mjs';
const { screen, vstack, flexSpacer } = C;

export const section = 'Onboarding & auth';
export const order = 17;

/** src/app/reset-password.tsx — the last step of a recovery. */
const reset = ({ id, name, password = '', confirm = '', error, label = 'Continue' }) =>
  screen({
    id,
    name,
    back: true,
    children: [
      C.Title('Set a new password'),
      C.Subtitle('Choose a password you have not used before.', { mt: 12 }),

      // <View className="mt-8 w-full gap-5">
      vstack({ mt: 32, gap: 20, name: 'Fields' }, [
        C.TextField('New password', { value: password, password: true }),
        C.TextField('Confirm new password', { value: confirm, password: true, error }),
      ]),

      // <View className="mt-auto w-full pt-10">
      flexSpacer(),
      vstack({ pad: { t: 40 }, name: 'Actions' }, [C.Button(label)]),
    ],
  });

export default [
  reset({ id: 'reset-password', name: 'Set a new password' }),
  reset({
    id: 'reset-password-filled',
    name: 'Set a new password — filled',
    password: '••••••••••',
    confirm: '••••••••••',
  }),
  reset({
    id: 'reset-password-error',
    name: 'Set a new password — too short',
    password: '•••••',
    confirm: '•••••',
    error: 'Password must be at least 6 characters.',
  }),
  reset({
    id: 'reset-password-busy',
    name: 'Set a new password — saving',
    password: '••••••••••',
    confirm: '••••••••••',
    label: 'Saving…',
  }),
];
