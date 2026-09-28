import * as C from '../kit/components.mjs';
const { screen, vstack, text, flexSpacer } = C;

export const section = 'Onboarding & auth';
export const order = 18;

/**
 * src/app/verify-otp.tsx — the 6-digit code, for signup and for recovery.
 *
 * The subtitle is one centred sentence with the address in <Strong>, which a
 * nested Text renders at the parent's 16px in semibold ink.
 */
const EMAIL = 'sam@skipbudget.app';

const verify = ({ id, name, code = '', error, notice, label = 'Continue' }) =>
  screen({
    id,
    name,
    back: true,
    children: [
      C.Title('Enter the code'),
      C.RichSubtitle(
        [
          ['We sent a 6-digit code to ', {}],
          [EMAIL, { weight: 600, color: 'ink' }],
          ['.', {}],
        ],
        { mt: 12 },
      ),

      // <View className="mt-10 w-full">
      C.OtpInput(code, { length: 6, focused: code.length < 6, mt: 40 }),

      error
        ? text(error, { size: 13, weight: 400, lineHeight: 18, color: 'danger', align: 'center' }, { mt: 16 })
        : null,
      notice
        ? text(notice, { size: 13, weight: 400, lineHeight: 18, color: 'muted', align: 'center' }, { mt: 16 })
        : null,

      // <View className="mt-auto w-full gap-2 pt-10">
      flexSpacer(),
      vstack({ gap: 8, pad: { t: 40 }, name: 'Actions' }, [
        C.Button(label),
        C.TextLink('Resend code', { variant: 'subtle' }),
      ]),
    ],
  });

export default [
  verify({ id: 'verify-otp', name: 'Enter the code' }),
  verify({ id: 'verify-otp-typing', name: 'Enter the code — partly typed', code: '304' }),
  verify({
    id: 'verify-otp-error',
    name: 'Enter the code — too few digits',
    code: '304',
    error: 'Enter all 6 digits.',
  }),
  verify({
    id: 'verify-otp-notice',
    name: 'Enter the code — code resent',
    notice: 'A new code is on its way.',
  }),
  verify({
    id: 'verify-otp-busy',
    name: 'Enter the code — checking',
    code: '304918',
    label: 'Checking…',
  }),
];
