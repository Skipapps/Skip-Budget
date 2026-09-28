import * as C from '../kit/components.mjs';
const { screen, vstack, text, raw, flexSpacer } = C;

export const section = 'Onboarding & auth';
export const order = 13;

/**
 * src/app/auth.tsx — the two-tap way in, and the door to the email one.
 *
 * The kit has no Apple or Google mark, so both are composed here from the same
 * paths the app ships (src/components/icons/apple-icon.tsx, google-icon.tsx),
 * drawn as raw SVG. In wireframe mode they fall back to a greybox.
 *
 * The Apple mark is white because `AppleIcon`'s `color` defaults to '#FFFFFF'
 * and auth.tsx passes none — on the apricot `bg-control` pill that is a
 * hardcoded foreground, the same class of bug as the audit's finding 1. Drawn
 * as the app draws it, flagged rather than quietly corrected.
 */
const APPLE =
  '<path fill="COLOR" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>';

const GOOGLE =
  '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
  '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
  '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>' +
  '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>';

const brandIcon = (name, viewBox, body, { size = 22 } = {}) =>
  raw({
    w: size,
    h: size,
    name,
    svg: (x, y, w, h, ctx) =>
      ctx.mode === 'wire'
        ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#E4E4E4" stroke="#B9B9B9"/>`
        : `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${viewBox}">${body}</svg>`,
    html: (ctx) =>
      ctx.mode === 'wire'
        ? `<div style="width:${size}px;height:${size}px;border-radius:4px;background:#E4E4E4;border:1px solid #B9B9B9"></div>`
        : `<svg style="width:${size}px;height:${size}px;display:block" viewBox="${viewBox}" data-name="${name}">${body}</svg>`,
  });

const GoogleIcon = () => brandIcon('GoogleIcon', '0 0 48 48', GOOGLE);
const AppleIcon = () => brandIcon('AppleIcon', '0 0 384 512', APPLE.replace('COLOR', '#FFFFFF'));

const authScreen = ({ id, name, googleLabel = 'Continue with google', appleLabel = 'Continue with Apple', error }) =>
  screen({
    id,
    name,
    back: true,
    children: [
      // <Illustration … widthRatio={0.78} maxWidth={290} className="pt-2" />
      C.Illustration('login-hero', { ratio: 0.78, maxW: 290, mt: 8 }),

      C.Title('Set up your login'),
      C.Subtitle('Keep your data synced across devices and make account recovery easier.', {
        mt: 12,
      }),

      // <View className="mt-auto w-full gap-4 pt-10">
      flexSpacer(),
      vstack({ gap: 16, pad: { t: 40 }, name: 'Actions' }, [
        C.Button(googleLabel, { variant: 'outline', leading: GoogleIcon() }),
        C.Button(appleLabel, { leading: AppleIcon() }),
        C.TextLink('Continue with Email'),
        error
          ? text(error, { size: 13, weight: 400, lineHeight: 18, color: 'danger', align: 'center' })
          : null,
      ]),
    ],
  });

export default [
  authScreen({ id: 'auth', name: 'Set up your login' }),
  authScreen({
    id: 'auth-busy-google',
    name: 'Set up your login — opening Google',
    googleLabel: 'Opening Google…',
  }),
  authScreen({
    id: 'auth-busy-apple',
    name: 'Set up your login — signing in with Apple',
    appleLabel: 'Signing in…',
  }),
  authScreen({
    id: 'auth-error',
    name: 'Set up your login — provider error',
    error: 'Could not sign in with Google. Try again.',
  }),
];
