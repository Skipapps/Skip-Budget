import { defineMessages } from '@/i18n/translate';

export const settingsMessages = defineMessages({
  'settings.title': { en: 'Settings', es: 'Ajustes', fr: 'Réglages' },
  'settings.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },

  'settings.pro.active': {
    en: 'Skip Pro — active',
    es: 'Skip Pro — activo',
    fr: 'Skip Pro — actif',
  },
  'settings.pro.activeDetail': {
    en: 'Everything unlocked · manage in the App Store',
    es: 'Todo desbloqueado · adminístralo en el App Store',
    fr: 'Tout est débloqué · gère-le dans l’App Store',
  },
  /** {monthly} and {yearly} are whole price labels, such as "$1.99/mo". */
  'settings.pro.pitch': {
    en: 'Unlimited everything, {monthly} or {yearly}',
    es: 'Todo ilimitado, {monthly} o {yearly}',
    fr: 'Tout en illimité, {monthly} ou {yearly}',
  },

  'settings.profile.title': { en: 'Profile', es: 'Perfil', fr: 'Profil' },
  'settings.profile.picture': {
    en: 'Profile picture',
    es: 'Foto de perfil',
    fr: 'Photo de profil',
  },
  'settings.profile.tapToChange': {
    en: 'Tap to change',
    es: 'Toca para cambiarla',
    fr: 'Touche pour la changer',
  },
  'settings.profile.pickOne': {
    en: 'Pick one to show on your dashboard',
    es: 'Elige una para mostrarla en tu panel',
    fr: 'Choisis-en une à afficher sur ton tableau de bord',
  },
  'settings.profile.displayName': {
    en: 'Display name',
    es: 'Nombre visible',
    fr: 'Nom affiché',
  },
  'settings.profile.namePlaceholder': { en: 'Your name', es: 'Tu nombre', fr: 'Ton nom' },
  'settings.profile.saveName': {
    en: 'Save your display name',
    es: 'Guardar tu nombre visible',
    fr: 'Enregistrer ton nom affiché',
  },

  'settings.pages.preferences': {
    en: 'Preferences',
    es: 'Preferencias',
    fr: 'Préférences',
  },
  'settings.pages.yourMoney': { en: 'Your money', es: 'Tu dinero', fr: 'Ton argent' },
  'settings.pages.about': { en: 'About', es: 'Acerca de', fr: 'À propos' },
  'settings.pages.support': {
    en: 'Support and feedback',
    es: 'Soporte y comentarios',
    fr: 'Assistance et commentaires',
  },

  'settings.account.title': { en: 'Account', es: 'Cuenta', fr: 'Compte' },
  'settings.account.signOut': { en: 'Sign out', es: 'Cerrar sesión', fr: 'Se déconnecter' },
  'settings.account.delete': {
    en: 'Delete account',
    es: 'Eliminar cuenta',
    fr: 'Supprimer le compte',
  },
  'settings.account.deleteDetail': {
    en: 'Permanent, and it cannot be undone',
    es: 'Es permanente y no se puede deshacer',
    fr: 'Définitif et irréversible',
  },

  'settings.delete.title': {
    en: 'Delete your account?',
    es: '¿Eliminar tu cuenta?',
    fr: 'Supprimer ton compte ?',
  },
  /** {held} is a list of counts: "1 card, 2 bank accounts". */
  'settings.delete.held': {
    en: 'This removes {held} — everything Skip holds for you. It cannot be undone.',
    es: 'Esto elimina {held}: todo lo que Skip guarda para ti. No se puede deshacer.',
    fr: 'Cela supprime {held} — tout ce que Skip conserve pour toi. C’est irréversible.',
  },
  'settings.delete.nothingHeld': {
    en: 'This removes your account and everything Skip holds for you. It cannot be undone.',
    es: 'Esto elimina tu cuenta y todo lo que Skip guarda para ti. No se puede deshacer.',
    fr: 'Cela supprime ton compte et tout ce que Skip conserve pour toi. C’est irréversible.',
  },
  'settings.delete.keep': {
    en: 'Keep my account',
    es: 'Conservar mi cuenta',
    fr: 'Garder mon compte',
  },
  'settings.delete.finalTitle': {
    en: 'Delete everything, for good?',
    es: '¿Eliminar todo para siempre?',
    fr: 'Tout supprimer pour de bon ?',
  },
  'settings.delete.finalMessage': {
    en: 'There is no way back from here, and no copy kept.',
    es: 'No hay vuelta atrás y no se guarda ninguna copia.',
    fr: 'Il n’y a pas de retour en arrière, et aucune copie n’est conservée.',
  },
  'settings.delete.everything': {
    en: 'Delete everything',
    es: 'Eliminar todo',
    fr: 'Tout supprimer',
  },

  'settings.count.cards': {
    en: { one: '{count} card', other: '{count} cards' },
    es: { one: '{count} tarjeta', other: '{count} tarjetas' },
    fr: { one: '{count} carte', other: '{count} cartes' },
  },
  'settings.count.bankAccounts': {
    en: { one: '{count} bank account', other: '{count} bank accounts' },
    es: { one: '{count} cuenta bancaria', other: '{count} cuentas bancarias' },
    fr: { one: '{count} compte bancaire', other: '{count} comptes bancaires' },
  },
  'settings.count.bills': {
    en: { one: '{count} bill', other: '{count} bills' },
    es: { one: '{count} factura', other: '{count} facturas' },
    fr: { one: '{count} facture', other: '{count} factures' },
  },
  'settings.count.recurringBills': {
    en: { one: '{count} recurring bill', other: '{count} recurring bills' },
    es: { one: '{count} factura recurrente', other: '{count} facturas recurrentes' },
    fr: { one: '{count} facture récurrente', other: '{count} factures récurrentes' },
  },
  'settings.count.subscriptions': {
    en: { one: '{count} subscription', other: '{count} subscriptions' },
    es: { one: '{count} suscripción', other: '{count} suscripciones' },
    fr: { one: '{count} abonnement', other: '{count} abonnements' },
  },
  'settings.count.receipts': {
    en: { one: '{count} receipt', other: '{count} receipts' },
    es: { one: '{count} recibo', other: '{count} recibos' },
    fr: { one: '{count} reçu', other: '{count} reçus' },
  },
  'settings.count.recordedCharges': {
    en: { one: '{count} recorded charge', other: '{count} recorded charges' },
    es: { one: '{count} cargo registrado', other: '{count} cargos registrados' },
    fr: { one: '{count} prélèvement enregistré', other: '{count} prélèvements enregistrés' },
  },
  'settings.count.salarySources': {
    en: { one: '{count} salary source', other: '{count} salary sources' },
    es: { one: '{count} fuente de ingresos', other: '{count} fuentes de ingresos' },
    fr: { one: '{count} source de revenus', other: '{count} sources de revenus' },
  },

  'settings.yourMoney.bills': { en: 'Bills', es: 'Facturas', fr: 'Factures' },
  'settings.yourMoney.noBills': { en: 'None yet', es: 'Ninguna aún', fr: 'Aucune pour l’instant' },
  'settings.yourMoney.subscriptions': {
    en: 'Subscriptions',
    es: 'Suscripciones',
    fr: 'Abonnements',
  },
  'settings.yourMoney.tracked': {
    en: { one: '{count} tracked', other: '{count} tracked' },
    es: { one: '{count} registrada', other: '{count} registradas' },
    fr: { one: '{count} suivi', other: '{count} suivis' },
  },
  'settings.yourMoney.noSubscriptions': {
    en: 'None yet',
    es: 'Ninguna aún',
    fr: 'Aucun pour l’instant',
  },
  'settings.yourMoney.cardsAndAccounts': {
    en: 'Cards and accounts',
    es: 'Tarjetas y cuentas',
    fr: 'Cartes et comptes',
  },
  'settings.yourMoney.payday': { en: 'Payday', es: 'Día de pago', fr: 'Jour de paie' },
  'settings.yourMoney.notSetUp': {
    en: 'Not set up yet',
    es: 'Aún no configurado',
    fr: 'Pas encore configuré',
  },

  'settings.about.privacy': {
    en: 'Privacy policy',
    es: 'Política de privacidad',
    fr: 'Politique de confidentialité',
  },
  'settings.about.privacyDetail': {
    en: 'What is stored, and who else can see it',
    es: 'Qué se guarda y quién más puede verlo',
    fr: 'Ce qui est conservé, et qui d’autre peut le voir',
  },
  'settings.about.terms': {
    en: 'Terms of service',
    es: 'Términos del servicio',
    fr: 'Conditions d’utilisation',
  },
  'settings.about.version': { en: 'Version', es: 'Versión', fr: 'Version' },

  /** Logo choices: the add-store check, Change logo, and the logos lists draw. */
  'settings.logo.change': { en: 'Change logo', es: 'Cambiar logo', fr: 'Changer le logo' },
  /** The name is set in bold wherever the language puts it. */
  'settings.logo.looksLike': {
    en: 'Looks like {name}',
    es: 'Parece que es {name}',
    fr: 'On dirait {name}',
  },
  'settings.logo.yes': { en: 'Yes, that’s it', es: 'Sí, es ese', fr: 'Oui, c’est ça' },
  'settings.logo.notThis': { en: 'Not this one', es: 'No es este', fr: 'Pas celui-ci' },
  'settings.logo.website': {
    en: 'Use the website instead',
    es: 'Usar el sitio web',
    fr: 'Utiliser plutôt le site Web',
  },
  'settings.logo.letters': {
    en: 'No logo, use letters',
    es: 'Sin logo, usar letras',
    fr: 'Pas de logo, utiliser les lettres',
  },
  'settings.logo.icon': {
    en: 'No logo, use the icon',
    es: 'Sin logo, usar el ícono',
    fr: 'Pas de logo, utiliser l’icône',
  },
  'settings.logo.addWebsite': {
    en: 'Add a website',
    es: 'Agregar un sitio web',
    fr: 'Ajouter un site Web',
  },
  'settings.logo.looking': {
    en: 'Looking for a logo…',
    es: 'Buscando un logo…',
    fr: 'Recherche d’un logo…',
  },
  'settings.logo.whichOne': { en: 'Which one is it?', es: '¿Cuál es?', fr: 'Lequel est-ce ?' },
  'settings.logo.noOthers': {
    en: 'Nothing else came up.',
    es: 'No apareció nada más.',
    fr: 'Rien d’autre n’est ressorti.',
  },
  'settings.logo.websiteLabel': { en: 'Website', es: 'Sitio web', fr: 'Site Web' },
  'settings.logo.find': { en: 'Find', es: 'Buscar', fr: 'Chercher' },
  'settings.logo.findLabel': {
    en: 'Find the logo for this website',
    es: 'Buscar el logo de este sitio web',
    fr: 'Trouver le logo de ce site Web',
  },
  'settings.logo.finding': { en: 'Looking…', es: 'Buscando…', fr: 'Recherche…' },
  'settings.logo.noLogoForWebsite': {
    en: 'No logo found for that website.',
    es: 'No encontramos un logo para ese sitio web.',
    fr: 'Aucun logo trouvé pour ce site Web.',
  },
  'settings.logo.report': {
    en: 'Report this logo',
    es: 'Reportar este logo',
    fr: 'Signaler ce logo',
  },
  'settings.logo.reportHint': {
    en: 'Tells Skip this logo is wrong, so it can be fixed for everyone',
    es: 'Avisa a Skip que este logo está mal, para corregirlo para todos',
    fr: 'Indique à Skip que ce logo est erroné, pour qu’il soit corrigé pour tout le monde',
  },
  'settings.logo.reporting': { en: 'Sending…', es: 'Enviando…', fr: 'Envoi…' },
  'settings.logo.reported': {
    en: 'Thanks. We’ll check this logo.',
    es: 'Gracias. Revisaremos este logo.',
    fr: 'Merci. Nous allons vérifier ce logo.',
  },
  'settings.logo.save': { en: 'Save logo', es: 'Guardar logo', fr: 'Enregistrer le logo' },
  'settings.logo.none': { en: 'No logo', es: 'Sin logo', fr: 'Aucun logo' },
  'settings.logo.goBack': { en: 'Go back', es: 'Volver', fr: 'Retour' },
  'settings.logo.chooseFor': {
    en: 'Choose the logo shown for {name}',
    es: 'Elige el logo que se muestra para {name}',
    fr: 'Choisis le logo affiché pour {name}',
  },
  'settings.logo.imageOf': { en: '{name} logo', es: 'Logo de {name}', fr: 'Logo de {name}' },

  /** The store field on the add forms. */
  'settings.store.search': {
    en: 'Search for a store',
    es: 'Busca una tienda',
    fr: 'Cherche un magasin',
  },
  'settings.store.change': {
    en: 'Change store, currently {name}',
    es: 'Cambiar tienda, ahora es {name}',
    fr: 'Changer de magasin, actuellement {name}',
  },
  'settings.store.addAs': {
    en: 'Add {name} as a new store',
    es: 'Agregar {name} como tienda nueva',
    fr: 'Ajouter {name} comme nouveau magasin',
  },
  'settings.store.add': {
    en: 'Add “{name}”',
    es: 'Agregar “{name}”',
    fr: 'Ajouter « {name} »',
  },
});
