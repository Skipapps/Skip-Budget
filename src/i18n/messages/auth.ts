import { defineMessages } from '@/i18n/translate';

export const authMessages = defineMessages({
  'auth.email': { en: 'Email', es: 'Correo', fr: 'Courriel' },
  'auth.password': { en: 'Password', es: 'Contraseña', fr: 'Mot de passe' },
  'auth.signingIn': { en: 'Signing in…', es: 'Iniciando sesión…', fr: 'Connexion…' },
  'auth.passwordsDiffer': {
    en: 'Those passwords do not match.',
    es: 'Las contraseñas no coinciden.',
    fr: 'Les mots de passe ne correspondent pas.',
  },
  'auth.haveAccount': {
    en: 'I already have an account',
    es: 'Ya tengo una cuenta',
    fr: 'J’ai déjà un compte',
  },

  'auth.start.title': {
    en: 'Set up your login',
    es: 'Configura tu inicio de sesión',
    fr: 'Configure ta connexion',
  },
  'auth.start.subtitle': {
    en: 'Keep your data synced across devices and make account recovery easier.',
    es: 'Mantén tus datos sincronizados entre dispositivos y recupera tu cuenta más fácilmente.',
    fr: 'Garde tes données synchronisées sur tous tes appareils et récupère ton compte plus facilement.',
  },
  'auth.start.openingGoogle': {
    en: 'Opening Google…',
    es: 'Abriendo Google…',
    fr: 'Ouverture de Google…',
  },
  'auth.start.google': {
    en: 'Continue with Google',
    es: 'Continuar con Google',
    fr: 'Continuer avec Google',
  },
  'auth.start.apple': {
    en: 'Continue with Apple',
    es: 'Continuar con Apple',
    fr: 'Continuer avec Apple',
  },
  'auth.start.email': {
    en: 'Continue with Email',
    es: 'Continuar con correo',
    fr: 'Continuer avec ton courriel',
  },

  'auth.login.title': { en: 'Log in', es: 'Iniciar sesión', fr: 'Se connecter' },
  // Between the email log-in and the Google and Apple buttons.
  'auth.login.or': { en: 'or', es: 'o', fr: 'ou' },
  'auth.login.subtitle': {
    en: 'Welcome back. Pick up where you left off.',
    es: 'Qué gusto verte de nuevo. Sigue donde te quedaste.',
    fr: 'Bon retour. Reprends où tu en étais.',
  },
  'auth.login.missing': {
    en: 'Enter your email and password.',
    es: 'Ingresa tu correo y tu contraseña.',
    fr: 'Indique ton courriel et ton mot de passe.',
  },
  // The links are drawn inside the sentence: {terms} always comes before {privacy}, and nothing
  // follows {privacy}, because the screen lays the pieces out in that order.
  'auth.login.agreement': {
    en: 'By continuing you agree to our {terms} and {privacy}',
    es: 'Al continuar, aceptas los {terms} y el {privacy}',
    fr: 'En continuant, tu acceptes les {terms} et la {privacy}',
  },
  'auth.login.terms': {
    en: 'Terms of service',
    es: 'Términos del servicio',
    fr: 'Conditions d’utilisation',
  },
  'auth.login.privacy': {
    en: 'Privacy policy',
    es: 'Aviso de privacidad',
    fr: 'Politique de confidentialité',
  },

  'auth.signup.title': {
    en: 'Create your account',
    es: 'Crea tu cuenta',
    fr: 'Crée ton compte',
  },
  'auth.signup.subtitle': {
    en: 'Use your email and a password you will remember.',
    es: 'Usa tu correo y una contraseña que vayas a recordar.',
    fr: 'Utilise ton courriel et un mot de passe dont tu te souviendras.',
  },
  'auth.signup.missing': {
    en: 'Enter an email and password.',
    es: 'Ingresa un correo y una contraseña.',
    fr: 'Indique un courriel et un mot de passe.',
  },
  'auth.signup.confirm': {
    en: 'Confirm password',
    es: 'Confirma la contraseña',
    fr: 'Confirme le mot de passe',
  },
  'auth.signup.creating': { en: 'Creating…', es: 'Creando…', fr: 'Création…' },
  'auth.signup.button': { en: 'Create account', es: 'Crear cuenta', fr: 'Créer un compte' },

  'auth.forgot.title': {
    en: 'Forgot password?',
    es: '¿Olvidaste tu contraseña?',
    fr: 'Mot de passe oublié ?',
  },
  'auth.forgot.subtitle': {
    en: 'Enter your email and we will send you a 6-digit verification code.',
    es: 'Ingresa tu correo y te enviaremos un código de verificación de 6 dígitos.',
    fr: 'Indique ton courriel et nous t’enverrons un code de vérification à 6 chiffres.',
  },
  'auth.forgot.missing': {
    en: 'Enter the email on your account.',
    es: 'Ingresa el correo de tu cuenta.',
    fr: 'Indique le courriel de ton compte.',
  },
  'auth.forgot.sending': { en: 'Sending…', es: 'Enviando…', fr: 'Envoi…' },

  'auth.reset.title': {
    en: 'Set a new password',
    es: 'Crea una contraseña nueva',
    fr: 'Choisis un nouveau mot de passe',
  },
  'auth.reset.subtitle': {
    en: 'Choose a password you have not used before.',
    es: 'Elige una contraseña que no hayas usado antes.',
    fr: 'Choisis un mot de passe que tu n’as jamais utilisé.',
  },
  'auth.reset.newPassword': {
    en: 'New password',
    es: 'Contraseña nueva',
    fr: 'Nouveau mot de passe',
  },
  'auth.reset.confirm': {
    en: 'Confirm new password',
    es: 'Confirma la contraseña nueva',
    fr: 'Confirme le nouveau mot de passe',
  },
  'auth.reset.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },

  'auth.otp.title': { en: 'Enter the code', es: 'Ingresa el código', fr: 'Entre le code' },
  // {email} is drawn in bold, so the screen splits the sentence around it.
  'auth.otp.sentTo': {
    en: 'We sent a {digits}-digit code to {email}.',
    es: 'Enviamos un código de {digits} dígitos a {email}.',
    fr: 'Nous avons envoyé un code à {digits} chiffres à {email}.',
  },
  'auth.otp.sentToYou': {
    en: 'We sent a {digits}-digit code to your email.',
    es: 'Enviamos un código de {digits} dígitos a tu correo.',
    fr: 'Nous avons envoyé un code à {digits} chiffres à ton adresse courriel.',
  },
  'auth.otp.enterAll': {
    en: 'Enter all {digits} digits.',
    es: 'Ingresa los {digits} dígitos.',
    fr: 'Indique les {digits} chiffres.',
  },
  'auth.otp.resent': {
    en: 'New code sent. If you don’t see it soon, please check your spam folder.',
    es: 'Código nuevo enviado. Si no lo ves pronto, revisa tu carpeta de spam.',
    fr: 'Nouveau code envoyé. Si tu ne le vois pas bientôt, vérifie ton dossier de courrier indésirable.',
  },
  // Shown once the code has had time to arrive: a new sender's mail often lands in spam.
  'auth.otp.checkSpam': {
    en: 'No code yet? Please check your spam folder. Emails from new apps sometimes land there.',
    es: '¿Aún sin código? Revisa tu carpeta de spam. Los correos de apps nuevas a veces llegan ahí.',
    fr: 'Pas encore de code ? Vérifie ton dossier de courrier indésirable. Les courriels des nouvelles apps y arrivent parfois.',
  },
  'auth.otp.checking': { en: 'Checking…', es: 'Verificando…', fr: 'Vérification…' },
  'auth.otp.resend': { en: 'Resend code', es: 'Reenviar código', fr: 'Renvoyer le code' },
});
