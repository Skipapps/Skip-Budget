import { defineMessages } from '@/i18n/translate';

/**
 * The privacy policy and the terms, one message per heading, paragraph and bullet. A draft, not
 * legal advice: the Spanish and French follow the English clause for clause.
 */
export const legalMessages = defineMessages({
  'legal.lastUpdated': {
    en: 'Last updated {date}',
    es: 'Última actualización: {date}',
    fr: 'Dernière mise à jour : {date}',
  },
  // Shown above the translated documents only; the English original needs no notice.
  'legal.translationNotice': {
    en: 'This is a courtesy translation. If anything differs, the English version prevails.',
    es: 'Esta es una traducción de cortesía. Si hay alguna diferencia, prevalece la versión en inglés.',
    fr: 'Ceci est une traduction de courtoisie. En cas de divergence, la version anglaise prévaut.',
  },

  // Privacy policy

  'legal.privacy.title': {
    en: 'Privacy policy',
    es: 'Política de privacidad',
    fr: 'Politique de confidentialité',
  },
  'legal.privacy.updated': {
    en: '28 August 2026',
    es: '28 de agosto de 2026',
    fr: '28 août 2026',
  },
  'legal.privacy.summary': {
    en: 'Skip is a budgeting app, so almost everything in it is something you typed. This explains what is stored, what stays on your phone, who else is involved, and how to get rid of all of it.',
    es: 'Skip es una aplicación para llevar tu presupuesto, así que casi todo lo que contiene es algo que tú escribiste. Aquí se explica qué se guarda, qué se queda en tu teléfono, quién más interviene y cómo deshacerte de todo.',
    fr: 'Skip est une application de gestion de budget : presque tout ce qu’elle contient, c’est toi qui l’as saisi. Cette politique explique ce qui est conservé, ce qui reste sur ton téléphone, qui d’autre intervient et comment tout effacer.',
  },

  'legal.privacy.who.heading': {
    en: 'Who we are',
    es: 'Quiénes somos',
    fr: 'Qui nous sommes',
  },
  'legal.privacy.who.p1': {
    en: 'Skip is a personal budgeting app published by the Weknd team. Wherever this policy says “we”, it means the team that operates Skip and the servers it talks to.',
    es: 'Skip es una aplicación de presupuesto personal publicada por el equipo de Weknd. Cuando esta política dice “nosotros”, se refiere al equipo que opera Skip y a los servidores con los que se comunica.',
    fr: 'Skip est une application de budget personnel publiée par l’équipe Weknd. Chaque fois que cette politique dit « nous », elle désigne l’équipe qui exploite Skip et les serveurs avec lesquels l’application communique.',
  },
  'legal.privacy.who.p2': {
    en: 'You can reach us about anything in this policy at admin@skipapps.net.',
    es: 'Puedes escribirnos a admin@skipapps.net para cualquier asunto relacionado con esta política.',
    fr: 'Tu peux nous joindre à admin@skipapps.net pour toute question relative à cette politique.',
  },

  'legal.privacy.stores.heading': {
    en: 'What Skip stores about you',
    es: 'Qué guarda Skip sobre ti',
    fr: 'Ce que Skip conserve à ton sujet',
  },
  'legal.privacy.stores.p1': {
    en: 'Skip only holds what you put into it, plus what is needed to keep you signed in. Specifically:',
    es: 'Skip solo guarda lo que tú ingresas, más lo necesario para mantener tu sesión iniciada. En concreto:',
    fr: 'Skip ne conserve que ce que tu y saisis, ainsi que ce qui est nécessaire pour maintenir ta session ouverte. Plus précisément :',
  },
  'legal.privacy.stores.b1': {
    en: 'Your account: the email address you signed up with, or the identifier Apple or Google gives us when you sign in with them.',
    es: 'Tu cuenta: la dirección de correo con la que creaste tu cuenta, o el identificador que Apple o Google nos proporciona cuando inicias sesión con ellos.',
    fr: 'Ton compte : l’adresse courriel avec laquelle tu as créé ton compte, ou l’identifiant que nous transmet Apple ou Google quand tu te connectes avec eux.',
  },
  'legal.privacy.stores.b2': {
    en: 'Your profile: the display name you choose, and nothing else.',
    es: 'Tu perfil: el nombre para mostrar que eliges, y nada más.',
    fr: 'Ton profil : le nom d’affichage que tu choisis, et rien d’autre.',
  },
  'legal.privacy.stores.b3': {
    en: 'Your money: the bills, subscriptions, receipts, loans, salary sources, savings and card payments you enter, and the record of what your bills and subscriptions have charged.',
    es: 'Tu dinero: las facturas, suscripciones, recibos, préstamos, fuentes de salario, ahorros y pagos de tarjeta que ingresas, y el registro de lo que tus facturas y suscripciones han cobrado.',
    fr: 'Ton argent : les factures, abonnements, reçus, prêts, sources de salaire, épargne et paiements de carte que tu saisis, ainsi que l’historique des prélèvements de tes factures et de tes abonnements.',
  },
  'legal.privacy.stores.b4': {
    en: 'Your credit cards and accounts: the name you give them, the network or bank, a colour, a balance you type, a due day, and at most the last four digits.',
    es: 'Tus tarjetas de crédito y cuentas: el nombre que les das, la red o el banco, un color, un saldo que escribes, un día de vencimiento y, como máximo, los últimos cuatro dígitos.',
    fr: 'Tes cartes de crédit et tes comptes : le nom que tu leur donnes, le réseau ou la banque, une couleur, un solde que tu saisis, un jour d’échéance et, au plus, les quatre derniers chiffres.',
  },
  'legal.privacy.stores.note': {
    en: 'Skip never asks for and never stores a full card number, an expiry date, a security code, or any banking login. Skip does not connect to your bank and cannot move money.',
    es: 'Skip nunca pide ni guarda el número completo de una tarjeta, una fecha de vencimiento, un código de seguridad ni ninguna credencial de acceso a tu banco. Skip no se conecta con tu banco y no puede mover dinero.',
    fr: 'Skip ne demande ni ne conserve jamais un numéro de carte complet, une date d’expiration, un code de sécurité ni aucun identifiant bancaire. Skip ne se connecte pas à ta banque et ne peut pas déplacer d’argent.',
  },

  'legal.privacy.local.heading': {
    en: 'What never leaves your phone',
    es: 'Lo que nunca sale de tu teléfono',
    fr: 'Ce qui ne quitte jamais ton téléphone',
  },
  'legal.privacy.local.b1': {
    en: 'Scanning a receipt. The text is read on your device by Apple’s own on-device recognition. The photo is not uploaded, and Skip saves only the fields you confirm — the shop, the amount, the date.',
    es: 'Escanear un recibo. El texto se lee en tu dispositivo con el reconocimiento integrado de Apple. La foto no se sube, y Skip guarda solo los campos que confirmas: la tienda, el importe y la fecha.',
    fr: 'La numérisation d’un reçu. Le texte est lu sur ton appareil par la reconnaissance intégrée d’Apple. La photo n’est pas téléversée, et Skip n’enregistre que les champs que tu confirmes — le magasin, le montant, la date.',
  },
  'legal.privacy.local.b2': {
    en: 'Your appearance, haptics and app lock settings, which are stored on the device itself.',
    es: 'Tus ajustes de apariencia, respuesta háptica y bloqueo de la app, que se guardan en el propio dispositivo.',
    fr: 'Tes réglages d’apparence, de retour haptique et de verrouillage de l’app, qui sont conservés sur l’appareil même.',
  },

  'legal.privacy.voice.heading': {
    en: 'Adding things by voice',
    es: 'Agregar cosas por voz',
    fr: 'Ajouter des éléments par la voix',
  },
  // The example is spoken in English in every language: dictation only understands English.
  'legal.privacy.voice.p1': {
    en: 'Tap the microphone and say something like “Netflix $15.99 every month” to add a receipt, bill or subscription without typing. Here is exactly what happens to what you say.',
    es: 'Toca el micrófono y di, en inglés, algo como “Netflix $15.99 every month” para agregar un recibo, una factura o una suscripción sin escribir. Esto es exactamente lo que pasa con lo que dices.',
    fr: 'Appuie sur le microphone et dis, en anglais, quelque chose comme « Netflix $15.99 every month » pour ajouter un reçu, une facture ou un abonnement sans rien taper. Voici exactement ce qui arrive à ce que tu dis.',
  },
  'legal.privacy.voice.b1': {
    en: 'Your words are turned into text by Apple’s speech recognition, built into your iPhone. Skip does not use any third-party speech or transcription service, and has no speech server of its own.',
    es: 'El reconocimiento de voz de Apple, integrado en tu iPhone, convierte tus palabras en texto. Skip no usa ningún servicio de voz ni de transcripción de terceros, y no tiene un servidor de voz propio.',
    fr: 'La reconnaissance vocale d’Apple, intégrée à ton iPhone, transforme tes paroles en texte. Skip n’utilise aucun service tiers de reconnaissance vocale ou de transcription, et ne possède pas de serveur vocal qui lui soit propre.',
  },
  'legal.privacy.voice.b2': {
    en: 'When your iPhone can run speech recognition on the device, your voice never leaves it. When it can’t, Apple’s speech recognition service processes the audio instead, under Apple’s own privacy terms rather than this one.',
    es: 'Cuando tu iPhone puede ejecutar el reconocimiento de voz en el propio dispositivo, tu voz nunca sale de él. Cuando no puede, el servicio de reconocimiento de voz de Apple procesa el audio, conforme a los términos de privacidad de Apple y no a los de esta política.',
    fr: 'Quand ton iPhone peut effectuer la reconnaissance vocale directement sur l’appareil, ta voix ne le quitte jamais. Quand il ne le peut pas, c’est le service de reconnaissance vocale d’Apple qui traite l’audio, selon les conditions de confidentialité d’Apple et non celles de la présente politique.',
  },
  'legal.privacy.voice.b3': {
    en: 'Skip never records or keeps the audio itself, on your phone or on our servers. Only the text you review and confirm becomes a receipt, bill or subscription — stored exactly like one you type in by hand.',
    es: 'Skip nunca graba ni conserva el audio, ni en tu teléfono ni en nuestros servidores. Solo el texto que revisas y confirmas se convierte en un recibo, una factura o una suscripción, que se guarda exactamente igual que uno que escribes a mano.',
    fr: 'Skip n’enregistre ni ne conserve jamais l’audio lui-même, ni sur ton téléphone ni sur nos serveurs. Seul le texte que tu vérifies et confirmes devient un reçu, une facture ou un abonnement, enregistré exactement comme ceux que tu saisis à la main.',
  },
  'legal.privacy.voice.b4': {
    en: 'If you correct what Skip heard (for example, turning “spot a fly” into Spotify), Skip remembers that correction on your phone only, so it recognises it next time. These corrections are never uploaded.',
    es: 'Si corriges lo que Skip escuchó (por ejemplo, cambiar “spot a fly” por Spotify), Skip recuerda esa corrección solo en tu teléfono, para reconocerla la próxima vez. Estas correcciones nunca se suben.',
    fr: 'Si tu corriges ce que Skip a entendu (par exemple, remplacer « spot a fly » par Spotify), Skip mémorise cette correction sur ton téléphone seulement, afin de la reconnaître la prochaine fois. Ces corrections ne sont jamais téléversées.',
  },
  'legal.privacy.voice.note': {
    en: 'Skip asks for microphone and speech recognition access the first time you use voice input. You can turn either off at any time in iOS Settings → Skip Budget — typing still works exactly as before.',
    es: 'Skip pide acceso al micrófono y al reconocimiento de voz la primera vez que usas la entrada por voz. Puedes desactivar cualquiera de los dos en cualquier momento en Ajustes de iOS → Skip Budget; escribir sigue funcionando exactamente igual que antes.',
    fr: 'Skip demande l’accès au microphone et à la reconnaissance vocale la première fois que tu utilises la saisie vocale. Tu peux désactiver l’un ou l’autre à tout moment dans Réglages d’iOS → Skip Budget — la saisie au clavier fonctionne exactement comme avant.',
  },

  'legal.privacy.others.heading': {
    en: 'Who else sees it',
    es: 'Quién más tiene acceso',
    fr: 'Qui d’autre y a accès',
  },
  'legal.privacy.others.p1': {
    en: 'Skip uses a small number of services to run. They process data on our behalf and are not permitted to use it for their own purposes.',
    es: 'Skip usa un pequeño número de servicios para funcionar. Procesan los datos en nuestro nombre y no tienen permitido usarlos para sus propios fines.',
    fr: 'Skip fait appel à un petit nombre de services pour fonctionner. Ils traitent les données pour notre compte et n’ont pas le droit de les utiliser à leurs propres fins.',
  },
  'legal.privacy.others.b1': {
    en: 'Supabase — hosts the database your data lives in, and handles sign-in.',
    es: 'Supabase: aloja la base de datos donde viven tus datos y gestiona el inicio de sesión.',
    fr: 'Supabase — héberge la base de données où se trouvent tes données et gère la connexion.',
  },
  'legal.privacy.others.b2': {
    en: 'Apple and Google — only if you choose to sign in with them, and only to confirm it is you.',
    es: 'Apple y Google: solo si decides iniciar sesión con ellos, y solo para confirmar que eres tú.',
    fr: 'Apple et Google — seulement si tu choisis de te connecter avec eux, et seulement pour confirmer que c’est bien toi.',
  },
  'legal.privacy.others.b3': {
    en: 'Sentry — receives crash and error reports so faults can be fixed. These describe what the app was doing, not what your budget contains.',
    es: 'Sentry: recibe informes de fallos y errores para poder corregirlos. Describen lo que hacía la aplicación, no lo que contiene tu presupuesto.',
    fr: 'Sentry — reçoit des rapports de plantage et d’erreur afin que les problèmes puissent être corrigés. Ils décrivent ce que l’application était en train de faire, pas le contenu de ton budget.',
  },
  'legal.privacy.others.b4': {
    en: 'Apple Push Notification service — delivers reminders, if you turn them on.',
    es: 'Apple Push Notification service: entrega los recordatorios, si los activas.',
    fr: 'Apple Push Notification service — transmet les rappels, si tu les actives.',
  },
  'legal.privacy.others.b5': {
    en: 'Apple’s speech recognition — if your iPhone can’t run speech recognition on the device, what you say when you use voice input is sent to Apple’s speech service to turn it into text, under Apple’s own privacy terms. Skip never receives the audio itself, only the text it returns.',
    es: 'El reconocimiento de voz de Apple: si tu iPhone no puede ejecutar el reconocimiento de voz en el propio dispositivo, lo que dices al usar la entrada por voz se envía al servicio de voz de Apple para convertirlo en texto, conforme a los términos de privacidad de Apple. Skip nunca recibe el audio, solo el texto que Apple le devuelve.',
    fr: 'La reconnaissance vocale d’Apple — si ton iPhone ne peut pas effectuer la reconnaissance vocale sur l’appareil, ce que tu dis en utilisant la saisie vocale est envoyé au service vocal d’Apple pour être transformé en texte, selon les conditions de confidentialité d’Apple. Skip ne reçoit jamais l’audio lui-même, seulement le texte qui lui est renvoyé.',
  },
  'legal.privacy.others.p2': {
    en: 'Skip does not sell your data, does not share it for advertising, and carries no advertising or third-party analytics beyond the crash reporting described above.',
    es: 'Skip no vende tus datos, no los comparte con fines publicitarios y no incluye publicidad ni analítica de terceros más allá de los informes de fallos descritos arriba.',
    fr: 'Skip ne vend pas tes données, ne les communique pas à des fins publicitaires et ne contient ni publicité ni outil d’analyse tiers, hormis les rapports de plantage décrits ci-dessus.',
  },

  'legal.privacy.kept.heading': {
    en: 'How long it is kept',
    es: 'Cuánto tiempo se conserva',
    fr: 'Combien de temps les données sont conservées',
  },
  'legal.privacy.kept.b1': {
    en: 'Things that happened — recorded charges, receipts and card payments — are kept for seven years and then deleted automatically, a day at a time as each one passes the boundary.',
    es: 'Lo que ya ocurrió (cargos registrados, recibos y pagos de tarjeta) se conserva durante siete años y después se elimina automáticamente, día por día, a medida que cada elemento rebasa ese límite.',
    fr: 'Ce qui s’est produit — prélèvements enregistrés, reçus et paiements de carte — est conservé pendant sept ans, puis supprimé automatiquement, jour après jour, à mesure que chaque élément dépasse cette limite.',
  },
  'legal.privacy.kept.b2': {
    en: 'Things that are still running — bills, subscriptions, credit cards, accounts and salary sources — are kept until you delete them, because a standing order set up years ago is still a standing order.',
    es: 'Lo que sigue en marcha (facturas, suscripciones, tarjetas de crédito, cuentas y fuentes de salario) se conserva hasta que lo elimines, porque un pago domiciliado que contrataste hace años sigue siendo un pago domiciliado.',
    fr: 'Ce qui est toujours en cours — factures, abonnements, cartes de crédit, comptes et sources de salaire — est conservé jusqu’à ce que tu le supprimes, car un paiement préautorisé établi il y a des années reste un paiement préautorisé.',
  },

  'legal.privacy.deleting.heading': {
    en: 'Deleting your account',
    es: 'Eliminar tu cuenta',
    fr: 'Supprimer ton compte',
  },
  'legal.privacy.deleting.p1': {
    en: 'Settings → Delete account removes your account and everything listed above. Skip shows you a count of exactly what will go before it does anything, and asks twice.',
    es: 'Ajustes → Eliminar cuenta elimina tu cuenta y todo lo enumerado arriba. Skip te muestra un recuento exacto de lo que se va a eliminar antes de hacer nada, y te lo pregunta dos veces.',
    fr: 'Réglages → Supprimer le compte supprime ton compte et tout ce qui est énuméré ci-dessus. Skip te montre le décompte exact de ce qui sera supprimé avant de faire quoi que ce soit, et te demande deux fois de confirmer.',
  },
  'legal.privacy.deleting.note': {
    en: 'Deletion is immediate and permanent. There is no grace period and no backup copy kept for you to restore from.',
    es: 'La eliminación es inmediata y permanente. No hay periodo de gracia ni se conserva ninguna copia de respaldo desde la cual puedas restaurar tus datos.',
    fr: 'La suppression est immédiate et définitive. Il n’y a aucun délai de grâce et aucune copie de sauvegarde n’est conservée pour te permettre de restaurer tes données.',
  },

  'legal.privacy.rights.heading': {
    en: 'Your rights over your data',
    es: 'Tus derechos sobre tus datos',
    fr: 'Tes droits sur tes données',
  },
  'legal.privacy.rights.p1': {
    en: 'You can see everything Skip holds about you inside the app, correct any of it by editing it, and delete all of it from Settings. Depending on where you live you may also have a right to a copy of your data in a portable form, or to object to some processing. Write to admin@skipapps.net and we will action it.',
    es: 'Puedes ver dentro de la aplicación todo lo que Skip guarda sobre ti, corregirlo editándolo y eliminarlo todo desde Ajustes. Según dónde vivas, también puedes tener derecho a recibir una copia de tus datos en un formato portátil, o a oponerte a cierto tratamiento. Escribe a admin@skipapps.net y daremos curso a tu solicitud.',
    fr: 'Tu peux voir dans l’application tout ce que Skip détient à ton sujet, corriger n’importe quel élément en le modifiant et tout supprimer depuis Réglages. Selon l’endroit où tu vis, tu peux aussi avoir le droit d’obtenir une copie de tes données dans un format portable, ou de t’opposer à certains traitements. Écris à admin@skipapps.net et nous y donnerons suite.',
  },

  'legal.privacy.children.heading': {
    en: 'Children',
    es: 'Menores de edad',
    fr: 'Enfants',
  },
  'legal.privacy.children.p1': {
    en: 'Skip is not intended for children, and we do not knowingly collect data from anyone under the age required to consent where they live. If you believe a child has created an account, write to us and we will remove it.',
    es: 'Skip no está dirigida a menores de edad, y no recopilamos datos a sabiendas de ninguna persona que no tenga la edad requerida para dar su consentimiento en el lugar donde vive. Si crees que un menor creó una cuenta, escríbenos y la eliminaremos.',
    fr: 'Skip n’est pas destinée aux enfants, et nous ne recueillons pas sciemment de données auprès de personnes qui n’ont pas atteint l’âge requis pour consentir là où elles vivent. Si tu crois qu’un enfant a créé un compte, écris-nous et nous le supprimerons.',
  },

  'legal.privacy.changes.heading': {
    en: 'Changes to this policy',
    es: 'Cambios a esta política',
    fr: 'Modifications de cette politique',
  },
  'legal.privacy.changes.p1': {
    en: 'If this policy changes in a way that affects what is collected or who it is shared with, the date at the top changes and you will be told in the app before the change takes effect.',
    es: 'Si esta política cambia de un modo que afecte lo que se recopila o con quién se comparte, cambiará la fecha que aparece arriba y se te avisará dentro de la aplicación antes de que el cambio entre en vigor.',
    fr: 'Si cette politique change d’une façon qui touche ce qui est recueilli ou les personnes avec qui c’est communiqué, la date en haut change et nous t’en informerons dans l’application avant l’entrée en vigueur de la modification.',
  },

  // Terms of service

  'legal.terms.title': {
    en: 'Terms of service',
    es: 'Términos del servicio',
    fr: 'Conditions d’utilisation',
  },
  'legal.terms.updated': {
    en: '28 August 2026',
    es: '28 de agosto de 2026',
    fr: '28 août 2026',
  },
  'legal.terms.summary': {
    en: 'The agreement between you and the Weknd team for using Skip. In short: it is a tool for tracking your own money, it is not financial advice, what you enter stays yours, and you can delete all of it whenever you like.',
    es: 'El acuerdo entre tú y el equipo de Weknd para usar Skip. En resumen: es una herramienta para llevar el control de tu propio dinero, no es asesoría financiera, lo que ingresas sigue siendo tuyo y puedes eliminarlo todo cuando quieras.',
    fr: 'L’entente entre toi et l’équipe Weknd pour l’utilisation de Skip. En bref : c’est un outil pour suivre ton propre argent, ce n’est pas un conseil financier, ce que tu saisis reste à toi, et tu peux tout supprimer quand tu veux.',
  },

  'legal.terms.agree.heading': {
    en: 'Agreeing to these terms',
    es: 'Aceptación de estos términos',
    fr: 'Acceptation de ces conditions',
  },
  'legal.terms.agree.p1': {
    en: 'By creating an account or using Skip you agree to these terms. If you do not agree with them, do not use the app. If you are using Skip on behalf of somebody else, you confirm you are allowed to agree on their behalf.',
    es: 'Al crear una cuenta o usar Skip, aceptas estos términos. Si no estás de acuerdo con ellos, no uses la aplicación. Si usas Skip en nombre de otra persona, confirmas que tienes autorización para aceptar en su nombre.',
    fr: 'En créant un compte ou en utilisant Skip, tu acceptes ces conditions. Si tu n’es pas d’accord avec elles, n’utilise pas l’application. Si tu utilises Skip au nom d’une autre personne, tu confirmes avoir le droit d’accepter en son nom.',
  },

  'legal.terms.what.heading': {
    en: 'What Skip is, and what it is not',
    es: 'Qué es Skip y qué no es',
    fr: 'Ce qu’est Skip, et ce qu’elle n’est pas',
  },
  'legal.terms.what.p1': {
    en: 'Skip is a tool for writing down and looking at your own money. It records what you tell it and does arithmetic on it.',
    es: 'Skip es una herramienta para anotar y consultar tu propio dinero. Registra lo que le dices y hace cálculos con eso.',
    fr: 'Skip est un outil pour noter et consulter ton propre argent. Il enregistre ce que tu lui dis et fait des calculs à partir de cela.',
  },
  'legal.terms.what.note': {
    en: 'Skip is not a bank, a payment service, an accountant or a financial adviser. Nothing in the app is financial, tax or legal advice. Every figure comes from something you entered, and Skip cannot know whether it is right.',
    es: 'Skip no es un banco, un servicio de pagos, un contador ni un asesor financiero. Nada en la aplicación constituye asesoría financiera, fiscal ni legal. Cada cifra proviene de algo que tú ingresaste, y Skip no puede saber si es correcta.',
    fr: 'Skip n’est ni une banque, ni un service de paiement, ni un comptable, ni un conseiller financier. Rien dans l’application ne constitue un conseil financier, fiscal ou juridique. Chaque chiffre provient de quelque chose que tu as saisi, et Skip ne peut pas savoir s’il est exact.',
  },
  'legal.terms.what.p2': {
    en: 'Skip has no connection to your bank and cannot move, hold, send or receive money. Projections of future bills and paydays are estimates based on the schedules you set, not statements about what will happen.',
    es: 'Skip no tiene ninguna conexión con tu banco y no puede mover, retener, enviar ni recibir dinero. Las proyecciones de facturas y días de pago futuros son estimaciones basadas en las programaciones que estableciste, no afirmaciones sobre lo que va a ocurrir.',
    fr: 'Skip n’a aucun lien avec ta banque et ne peut ni déplacer, ni détenir, ni envoyer, ni recevoir d’argent. Les projections des factures et des jours de paie à venir sont des estimations fondées sur les échéanciers que tu as définis, et non des affirmations sur ce qui va se produire.',
  },

  'legal.terms.account.heading': {
    en: 'Your account',
    es: 'Tu cuenta',
    fr: 'Ton compte',
  },
  'legal.terms.account.b1': {
    en: 'Give accurate details when you sign up, and keep your sign-in method secure.',
    es: 'Proporciona datos exactos al crear tu cuenta y mantén seguro tu método de inicio de sesión.',
    fr: 'Fournis des renseignements exacts lorsque tu crées ton compte, et protège ta méthode de connexion.',
  },
  'legal.terms.account.b2': {
    en: 'An account is for one person. You are responsible for what happens under yours.',
    es: 'Una cuenta es para una sola persona. Eres responsable de lo que ocurra con la tuya.',
    fr: 'Un compte est destiné à une seule personne. Tu es responsable de ce qui se passe avec le tien.',
  },
  'legal.terms.account.b3': {
    en: 'Tell us at admin@skipapps.net if you think somebody else has got into it.',
    es: 'Avísanos en admin@skipapps.net si crees que alguien más ha entrado en ella.',
    fr: 'Écris-nous à admin@skipapps.net si tu penses que quelqu’un d’autre y a accédé.',
  },

  'legal.terms.using.heading': {
    en: 'Using Skip properly',
    es: 'Uso adecuado de Skip',
    fr: 'Utilisation correcte de Skip',
  },
  'legal.terms.using.p1': {
    en: 'You agree not to break the law with Skip, not to try to reach other people’s data, not to attack or overload the service, and not to pull it apart to rebuild or resell it.',
    es: 'Aceptas no infringir la ley con Skip, no intentar acceder a los datos de otras personas, no atacar ni sobrecargar el servicio, y no desarmarlo para reconstruirlo o revenderlo.',
    fr: 'Tu t’engages à ne pas enfreindre la loi avec Skip, à ne pas tenter d’accéder aux données d’autres personnes, à ne pas attaquer ni surcharger le service, et à ne pas le démonter pour le reconstruire ou le revendre.',
  },

  'legal.terms.yours.heading': {
    en: 'What you put in stays yours',
    es: 'Lo que ingresas sigue siendo tuyo',
    fr: 'Ce que tu saisis reste à toi',
  },
  'legal.terms.yours.p1': {
    en: 'Everything you enter belongs to you. You give us only the permission needed to run the app for you — to store it, back it up and show it back to you on your devices. That permission ends when you delete the data or your account.',
    es: 'Todo lo que ingresas te pertenece. Solo nos das la autorización necesaria para operar la aplicación por ti: guardarlo, respaldarlo y mostrártelo de nuevo en tus dispositivos. Esa autorización termina cuando eliminas los datos o tu cuenta.',
    fr: 'Tout ce que tu saisis t’appartient. Tu nous accordes uniquement l’autorisation nécessaire pour faire fonctionner l’application pour toi — conserver ces données, les sauvegarder et te les présenter de nouveau sur tes appareils. Cette autorisation prend fin lorsque tu supprimes les données ou ton compte.',
  },

  'legal.terms.change.heading': {
    en: 'The app will change',
    es: 'La aplicación cambiará',
    fr: 'L’application évoluera',
  },
  'legal.terms.change.p1': {
    en: 'Skip is under active development. Features may be added, altered or withdrawn, and the app may be unavailable at times for maintenance or for reasons outside our control. We do not promise any particular level of availability.',
    es: 'Skip está en desarrollo activo. Se pueden agregar, modificar o retirar funciones, y la aplicación puede no estar disponible en ciertos momentos por mantenimiento o por razones ajenas a nuestro control. No prometemos ningún nivel de disponibilidad en particular.',
    fr: 'Skip est en développement actif. Des fonctionnalités peuvent être ajoutées, modifiées ou retirées, et l’application peut être indisponible à certains moments pour cause d’entretien ou pour des raisons indépendantes de notre volonté. Nous ne promettons aucun niveau de disponibilité particulier.',
  },

  'legal.terms.money.heading': {
    en: 'Money',
    es: 'Dinero',
    fr: 'Argent',
  },
  'legal.terms.money.p1': {
    en: 'Skip is currently free to use and has no in-app purchases or subscriptions. The “Buy a coffee for team” link is an entirely voluntary tip handled by Buy Me a Coffee under their own terms; it buys no feature and no obligation. If paid features are ever introduced, the terms and the price will be shown before you are asked to pay for anything.',
    es: 'Por ahora, usar Skip es gratis y no hay compras dentro de la aplicación ni suscripciones. El enlace “Invita un café al equipo” es una propina totalmente voluntaria que gestiona Buy Me a Coffee bajo sus propios términos; no compra ninguna función ni genera ninguna obligación. Si algún día se introducen funciones de pago, los términos y el precio se mostrarán antes de que se te pida pagar por cualquier cosa.',
    fr: 'Skip est actuellement gratuite et ne comporte ni achats intégrés ni abonnements. Le lien « Offre un café à l’équipe » est un pourboire entièrement volontaire, géré par Buy Me a Coffee selon ses propres conditions ; il ne donne accès à aucune fonctionnalité et n’entraîne aucune obligation. Si des fonctionnalités payantes sont un jour introduites, les conditions et le prix seront affichés avant qu’on te demande de payer quoi que ce soit.',
  },

  'legal.terms.warranty.heading': {
    en: 'No warranty',
    es: 'Sin garantía',
    fr: 'Aucune garantie',
  },
  'legal.terms.warranty.p1': {
    en: 'Skip is provided as it is. To the extent the law allows, we make no warranty that it will be uninterrupted, error-free, or that its calculations will suit any particular purpose. You are responsible for the financial decisions you make.',
    es: 'Skip se ofrece tal como está. En la medida en que la ley lo permita, no garantizamos que funcione sin interrupciones ni sin errores, ni que sus cálculos sean adecuados para un fin en particular. Eres responsable de las decisiones financieras que tomes.',
    fr: 'Skip est fournie telle quelle. Dans la mesure permise par la loi, nous ne garantissons pas qu’elle fonctionnera sans interruption ni sans erreur, ni que ses calculs conviendront à un usage particulier. Tu es responsable des décisions financières que tu prends.',
  },

  'legal.terms.liability.heading': {
    en: 'Limits on liability',
    es: 'Límites de responsabilidad',
    fr: 'Limites de responsabilité',
  },
  'legal.terms.liability.p1': {
    en: 'To the extent the law allows, we are not liable for indirect or consequential loss, for lost profits or savings, or for any loss arising from decisions you made using Skip. Nothing here limits liability that cannot lawfully be limited — including for death or personal injury caused by negligence, or for fraud.',
    es: 'En la medida en que la ley lo permita, no somos responsables de las pérdidas indirectas o consecuenciales, de la pérdida de ganancias o de ahorros, ni de ninguna pérdida derivada de decisiones que tomaste usando Skip. Nada de lo aquí dispuesto limita la responsabilidad que no pueda limitarse legalmente, incluida la responsabilidad por muerte o lesiones personales causadas por negligencia, o por fraude.',
    fr: 'Dans la mesure permise par la loi, nous ne sommes pas responsables des pertes indirectes ou consécutives, de la perte de profits ou d’économies, ni de toute perte découlant de décisions que tu as prises en utilisant Skip. Rien ici ne limite une responsabilité qui ne peut légalement être limitée — y compris en cas de décès ou de préjudice corporel causé par une négligence, ou en cas de fraude.',
  },

  'legal.terms.ending.heading': {
    en: 'Ending it',
    es: 'Terminación',
    fr: 'Résiliation',
  },
  'legal.terms.ending.p1': {
    en: 'You can stop using Skip and delete your account at any time from Settings, which removes your data permanently. We may suspend or close an account that breaks these terms, and will say why where we can.',
    es: 'Puedes dejar de usar Skip y eliminar tu cuenta en cualquier momento desde Ajustes, lo cual elimina tus datos de forma permanente. Podemos suspender o cerrar una cuenta que incumpla estos términos, y explicaremos el motivo cuando nos sea posible.',
    fr: 'Tu peux cesser d’utiliser Skip et supprimer ton compte à tout moment depuis Réglages, ce qui supprime tes données de façon définitive. Nous pouvons suspendre ou fermer un compte qui contrevient à ces conditions, et nous en expliquerons la raison lorsque cela nous est possible.',
  },

  'legal.terms.changes.heading': {
    en: 'Changes to these terms',
    es: 'Cambios a estos términos',
    fr: 'Modifications de ces conditions',
  },
  'legal.terms.changes.p1': {
    en: 'If these terms change materially, the date at the top changes and you will be told in the app before the change takes effect. Continuing to use Skip after that means you accept the new terms.',
    es: 'Si estos términos cambian de forma importante, cambiará la fecha que aparece arriba y se te avisará dentro de la aplicación antes de que el cambio entre en vigor. Si sigues usando Skip después de eso, aceptas los nuevos términos.',
    fr: 'Si ces conditions sont modifiées de façon importante, la date en haut change et nous t’en informerons dans l’application avant l’entrée en vigueur de la modification. Si tu continues d’utiliser Skip par la suite, tu acceptes les nouvelles conditions.',
  },

  'legal.terms.law.heading': {
    en: 'Law and contact',
    es: 'Ley aplicable y contacto',
    fr: 'Droit applicable et contact',
  },
  'legal.terms.law.p1': {
    en: 'Questions about these terms go to admin@skipapps.net.',
    es: 'Las preguntas sobre estos términos se envían a admin@skipapps.net.',
    fr: 'Les questions sur ces conditions sont à adresser à admin@skipapps.net.',
  },
  'legal.terms.law.note': {
    en: 'The governing law and the courts that would hear a dispute are set by where the Weknd team legally operates, and are to be confirmed before release.',
    es: 'La ley aplicable y los tribunales que conocerían de una controversia dependen de dónde opere legalmente el equipo de Weknd, y se confirmarán antes del lanzamiento.',
    fr: 'Le droit applicable et les tribunaux qui entendraient un litige dépendent de l’endroit où l’équipe Weknd exerce légalement ses activités, et seront confirmés avant le lancement.',
  },
});
