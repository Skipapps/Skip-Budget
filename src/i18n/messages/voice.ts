import { defineMessages } from '@/i18n/translate';

/**
 * The voice pages' own words. What a person is told to say stays English (src/data/voice-examples.ts):
 * the recogniser and the parser understand English only.
 */
export const voiceMessages = defineMessages({
  'voice.kind.receipt': { en: 'Receipt', es: 'Recibo', fr: 'Reçu' },
  'voice.kind.bill': { en: 'Bill', es: 'Factura', fr: 'Facture' },
  'voice.kind.subscription': { en: 'Subscription', es: 'Suscripción', fr: 'Abonnement' },

  'voice.receipt.title': { en: 'Add a receipt', es: 'Agregar un recibo', fr: 'Ajouter un reçu' },
  'voice.receipt.closePrompt': {
    en: 'Cancel adding this receipt?',
    es: '¿Dejar de agregar este recibo?',
    fr: 'Annuler l’ajout de ce reçu ?',
  },
  'voice.receipt.save': { en: 'Save receipt', es: 'Guardar recibo', fr: 'Enregistrer le reçu' },
  'voice.receipt.merchant': { en: 'Store', es: 'Tienda', fr: 'Magasin' },
  'voice.receipt.date': { en: 'Bought on', es: 'Fecha de compra', fr: 'Date d’achat' },
  'voice.receipt.paidWith': { en: 'Paid with', es: 'Pagado con', fr: 'Payé avec' },
  'voice.receipt.askAmount': {
    en: 'How much did you spend?',
    es: '¿Cuánto gastaste?',
    fr: 'Combien as-tu dépensé ?',
  },
  'voice.receipt.askMerchant': {
    en: 'Where did you buy it?',
    es: '¿Dónde lo compraste?',
    fr: 'Où l’as-tu acheté ?',
  },
  'voice.receipt.askDate': { en: 'When was it?', es: '¿Cuándo fue?', fr: 'C’était quand ?' },

  'voice.bill.title': { en: 'Add a bill', es: 'Agregar una factura', fr: 'Ajouter une facture' },
  'voice.bill.closePrompt': {
    en: 'Cancel adding this bill?',
    es: '¿Dejar de agregar esta factura?',
    fr: 'Annuler l’ajout de cette facture ?',
  },
  'voice.bill.save': { en: 'Save bill', es: 'Guardar factura', fr: 'Enregistrer la facture' },
  'voice.bill.merchant': { en: 'Name', es: 'Nombre', fr: 'Nom' },
  'voice.bill.date': { en: 'Due on', es: 'Fecha de vencimiento', fr: 'Date d’échéance' },
  'voice.bill.paidWith': { en: 'Paid with', es: 'Se paga con', fr: 'Payée avec' },
  'voice.bill.askAmount': {
    en: 'How much is the bill?',
    es: '¿De cuánto es la factura?',
    fr: 'De combien est la facture ?',
  },
  'voice.bill.askMerchant': {
    en: 'Who is the bill from?',
    es: '¿De quién es la factura?',
    fr: 'De qui vient la facture ?',
  },
  'voice.bill.askDate': {
    en: 'When is it due?',
    es: '¿Cuándo vence?',
    fr: 'Quelle est la date d’échéance ?',
  },

  'voice.subscription.title': {
    en: 'Add a subscription',
    es: 'Agregar una suscripción',
    fr: 'Ajouter un abonnement',
  },
  'voice.subscription.closePrompt': {
    en: 'Cancel adding this subscription?',
    es: '¿Dejar de agregar esta suscripción?',
    fr: 'Annuler l’ajout de cet abonnement ?',
  },
  'voice.subscription.save': {
    en: 'Save subscription',
    es: 'Guardar suscripción',
    fr: 'Enregistrer l’abonnement',
  },
  'voice.subscription.merchant': { en: 'Service', es: 'Servicio', fr: 'Service' },
  'voice.subscription.date': {
    en: 'Renews on',
    es: 'Fecha de renovación',
    fr: 'Date de renouvellement',
  },
  'voice.subscription.paidWith': { en: 'Charged to', es: 'Se cobra a', fr: 'Prélevé sur' },
  'voice.subscription.askAmount': {
    en: 'How much does it cost?',
    es: '¿Cuánto cuesta?',
    fr: 'Combien ça coûte ?',
  },
  'voice.subscription.askMerchant': {
    en: 'Which service is it?',
    es: '¿Qué servicio es?',
    fr: 'Quel est le service ?',
  },
  'voice.subscription.askDate': {
    en: 'When does it renew?',
    es: '¿Cuándo se renueva?',
    fr: 'Quand se renouvelle-t-il ?',
  },

  'voice.record.title': {
    en: 'Record a transaction',
    es: 'Registrar un movimiento',
    fr: 'Enregistrer une transaction',
  },
  'voice.record.listening': { en: 'Listening…', es: 'Escuchando…', fr: 'J’écoute…' },
  'voice.record.listeningAnnouncement': { en: 'Listening', es: 'Escuchando', fr: 'J’écoute' },
  'voice.record.stopped': { en: 'Stopped', es: 'Detenido', fr: 'Arrêté' },
  'voice.record.multiple': {
    en: 'Looks like more than one. Add them one at a time.',
    es: 'Parece que es más de uno. Agrégalos uno por uno.',
    fr: 'On dirait qu’il y en a plusieurs. Ajoute-les un à la fois.',
  },
  'voice.record.nothingScreenReader': {
    en: 'Skip didn’t hear anything. Double-tap {button}, then talk.',
    es: 'Skip no escuchó nada. Toca dos veces {button} y luego habla.',
    fr: 'Skip n’a rien entendu. Touche deux fois {button}, puis parle.',
  },
  'voice.record.nothing': {
    en: 'Hold the button while you talk.',
    es: 'Mantén presionado el botón mientras hablas.',
    fr: 'Maintiens le bouton enfoncé pendant que tu parles.',
  },
  'voice.record.allSet': { en: 'You’re all set.', es: 'Todo listo.', fr: 'Tout est prêt.' },
  'voice.record.allSetHold': {
    en: 'You’re all set. Hold to talk.',
    es: 'Todo listo. Mantén presionado para hablar.',
    fr: 'Tout est prêt. Maintiens pour parler.',
  },
  'voice.record.deniedAnnouncement': {
    en: 'Microphone or speech recognition is off.',
    es: 'El micrófono o el reconocimiento de voz está desactivado.',
    fr: 'Le microphone ou la reconnaissance vocale est désactivé.',
  },
  'voice.record.denied': {
    en: 'Turn on Microphone and Speech Recognition for Skip Budget in Settings.',
    es: 'Activa Micrófono y Reconocimiento de voz para Skip Budget en Configuración.',
    fr: 'Active Microphone et Reconnaissance vocale pour Skip Budget dans Réglages.',
  },
  'voice.record.openSettings': {
    en: 'Open Settings',
    es: 'Abrir Configuración',
    fr: 'Ouvrir Réglages',
  },
  'voice.record.unavailableAnnouncement': {
    en: 'Voice isn’t available right now.',
    es: 'Voz no está disponible en este momento.',
    fr: 'Voix n’est pas disponible pour le moment.',
  },
  'voice.record.unavailable': {
    en: 'Voice isn’t available on this iPhone right now.',
    es: 'Voz no está disponible en este iPhone en este momento.',
    fr: 'Voix n’est pas disponible sur cet iPhone pour le moment.',
  },
  'voice.record.addByHand': {
    en: 'Add it by hand',
    es: 'Agrégalo a mano',
    fr: 'Ajoute-le à la main',
  },
  'voice.record.tapWhenDone': {
    en: 'Tap when you’re done',
    es: 'Toca cuando termines',
    fr: 'Touche quand tu as fini',
  },
  'voice.record.tapToTalk': {
    en: 'Tap to talk',
    es: 'Toca para hablar',
    fr: 'Touche pour parler',
  },
  'voice.record.releaseWhenDone': {
    en: 'Release when you’re done',
    es: 'Suelta cuando termines',
    fr: 'Relâche quand tu as fini',
  },
  'voice.record.holdToTalk': {
    en: 'Hold to talk',
    es: 'Mantén presionado para hablar',
    fr: 'Maintiens pour parler',
  },
  'voice.record.hintStop': {
    en: 'Double-tap to stop.',
    es: 'Toca dos veces para detener.',
    fr: 'Touche deux fois pour arrêter.',
  },
  'voice.record.hintStart': {
    en: 'Double-tap to start talking, and again when you’re done.',
    es: 'Toca dos veces para empezar a hablar y otra vez cuando termines.',
    fr: 'Touche deux fois pour commencer à parler, puis encore une fois quand tu as fini.',
  },
  'voice.record.hintHold': {
    en: 'Hold while you talk, then let go.',
    es: 'Mantén presionado mientras hablas y luego suelta.',
    fr: 'Maintiens pendant que tu parles, puis relâche.',
  },
  'voice.record.devLabel': {
    en: 'Test sentence (dev only)',
    es: 'Frase de prueba (solo desarrollo)',
    fr: 'Phrase test (développement seulement)',
  },
  'voice.record.devUse': {
    en: 'Use this sentence',
    es: 'Usar esta frase',
    fr: 'Utiliser cette phrase',
  },

  'voice.hints.englishOnly': {
    en: 'For now, Skip understands spoken English only.',
    es: 'Por ahora, Skip solo entiende inglés hablado.',
    fr: 'Pour l’instant, Skip ne comprend que l’anglais parlé.',
  },

  'voice.mic.label': { en: 'Record', es: 'Grabar', fr: 'Dicter' },

  'voice.review.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },
  'voice.review.sayAgain': { en: 'Say it again', es: 'Dilo otra vez', fr: 'Redis-le' },
  'voice.review.moreOptions': { en: 'More options', es: 'Más opciones', fr: 'Plus d’options' },
  'voice.review.moreOptionsHint': {
    en: 'Opens the full form with what Skip heard filled in.',
    es: 'Abre el formulario completo con lo que Skip escuchó ya llenado.',
    fr: 'Ouvre le formulaire complet, rempli avec ce que Skip a entendu.',
  },
  'voice.review.heardRight': {
    en: 'Did Skip hear you right?',
    es: '¿Skip te escuchó bien?',
    fr: 'Skip t’a bien entendu ?',
  },
  'voice.review.isThisRight': {
    en: 'Is this right?',
    es: '¿Es correcto?',
    fr: 'C’est bien ça ?',
  },
  'voice.review.youSaidLabel': {
    en: 'You said: {words}',
    es: 'Dijiste: {words}',
    fr: 'Tu as dit : {words}',
  },
  'voice.review.youSaid': { en: 'You said', es: 'Dijiste', fr: 'Tu as dit' },
  'voice.review.quoted': { en: '“{words}”', es: '“{words}”', fr: '« {words} »' },
  'voice.review.addAs': { en: 'Add as', es: 'Agregar como', fr: 'Ajouter comme' },
  'voice.review.guessed': {
    en: 'Skip guessed this one. Pick another if it’s wrong.',
    es: 'Skip lo adivinó. Elige otro si no es correcto.',
    fr: 'Skip a deviné. Choisis-en un autre si ce n’est pas le bon.',
  },
  'voice.review.whichAmount': {
    en: 'Which amount did you mean?',
    es: '¿Qué importe quisiste decir?',
    fr: 'Quel montant voulais-tu dire ?',
  },
  'voice.review.typeIt': {
    en: 'Neither, I’ll type it',
    es: 'Ninguno, lo escribo yo',
    fr: 'Aucun, je vais le taper',
  },
  'voice.review.amount': { en: 'Amount', es: 'Importe', fr: 'Montant' },
  'voice.review.amountNeededHint': {
    en: 'Needed to save. Opens the amount to add it.',
    es: 'Hace falta para guardar. Abre el importe para agregarlo.',
    fr: 'Requis pour enregistrer. Ouvre le montant pour l’ajouter.',
  },
  'voice.review.tapToAddAmount': {
    en: 'Tap to add the amount',
    es: 'Toca para agregar el importe',
    fr: 'Touche pour ajouter le montant',
  },
  'voice.review.amountNotCaught': {
    en: 'Skip didn’t catch how much.',
    es: 'Skip no entendió cuánto fue.',
    fr: 'Skip n’a pas saisi le montant.',
  },
  'voice.review.amountChangeHint': {
    en: 'Opens the amount to change it.',
    es: 'Abre el importe para cambiarlo.',
    fr: 'Ouvre le montant pour le modifier.',
  },
  'voice.review.category': { en: 'Category', es: 'Categoría', fr: 'Catégorie' },
  'voice.review.recurring': { en: 'Recurring', es: 'Se repite', fr: 'Récurrence' },
  'voice.review.billingCycle': {
    en: 'Billing cycle',
    es: 'Ciclo de cobro',
    fr: 'Cycle de facturation',
  },

  'voice.row.spoken': { en: '{label}, {value}', es: '{label}, {value}', fr: '{label}, {value}' },
  'voice.row.notHeard': { en: 'not heard', es: 'no se escuchó', fr: 'non entendu' },
  'voice.row.notSetOptional': {
    en: 'not set, optional',
    es: 'sin definir, opcional',
    fr: 'non défini, facultatif',
  },
  'voice.row.optionalLabel': {
    en: '{label} · optional',
    es: '{label} · opcional',
    fr: '{label} · facultatif',
  },
  'voice.row.neededHint': {
    en: 'Needed to save. Opens {label} to add it.',
    es: 'Hace falta para guardar. Abre «{label}» para agregarlo.',
    fr: 'Requis pour enregistrer. Ouvre « {label} » pour l’ajouter.',
  },
  'voice.row.changeHint': {
    en: 'Opens {label} to change it.',
    es: 'Abre «{label}» para cambiarlo.',
    fr: 'Ouvre « {label} » pour le modifier.',
  },
  'voice.row.tapToAdd': { en: 'Tap to add', es: 'Toca para agregar', fr: 'Touche pour ajouter' },
  'voice.row.notSet': { en: 'Not set', es: 'Sin definir', fr: 'Non défini' },

  'voice.edit.searchStore': {
    en: 'Search for a store',
    es: 'Busca una tienda',
    fr: 'Cherche un magasin',
  },
  'voice.edit.searchService': {
    en: 'Search for a service',
    es: 'Busca un servicio',
    fr: 'Cherche un service',
  },
  'voice.edit.company': { en: 'Company', es: 'Empresa', fr: 'Entreprise' },
  'voice.edit.searchCompany': {
    en: 'Search for a company',
    es: 'Busca una empresa',
    fr: 'Cherche une entreprise',
  },
  'voice.edit.noRenewal': {
    en: 'No renewal date',
    es: 'Sin fecha de renovación',
    fr: 'Aucune date de renouvellement',
  },
  'voice.edit.categoryQuestion': {
    en: 'What is this bill for?',
    es: '¿De qué es esta factura?',
    fr: 'Cette facture, c’est pour quoi ?',
  },

  'voice.stale.title': {
    en: 'Nothing to check yet',
    es: 'Aún no hay nada que revisar',
    fr: 'Rien à vérifier pour l’instant',
  },
  'voice.stale.message': {
    en: 'Say what you want to add and Skip will show it here.',
    es: 'Di lo que quieres agregar y Skip lo mostrará aquí.',
    fr: 'Dis ce que tu veux ajouter et Skip l’affichera ici.',
  },
  'voice.stale.action': { en: 'Start again', es: 'Empezar de nuevo', fr: 'Recommencer' },

  'voice.fab.label': { en: 'Add by voice', es: 'Agregar por voz', fr: 'Ajouter par la voix' },
  'voice.fab.hint': {
    en: 'Say a receipt, bill or subscription. You check it before it’s saved.',
    es: 'Di un recibo, una factura o una suscripción. Lo revisas antes de guardarlo.',
    fr: 'Dis un reçu, une facture ou un abonnement. Tu le vérifies avant qu’il soit enregistré.',
  },
  'voice.fab.hintFree': {
    en: 'Part of Skip Pro. Shows what adding by voice can do.',
    es: 'Parte de Skip Pro. Muestra lo que puedes hacer al agregar por voz.',
    fr: 'Fait partie de Skip Pro. Montre ce que l’ajout par la voix permet de faire.',
  },
});
