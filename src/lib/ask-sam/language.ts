import type { Language, TopicId } from './types';

/**
 * Everything about a conversation that depends on the language: how people say yes, no, "why?",
 * "what about…", "I already did that", and every sentence Sam says itself. Patterns are matched on
 * normalized text: lowercase, no accents, punctuation turned into spaces.
 */
export type LanguageRules = {
  yes: RegExp;
  no: RegExp;
  ack: RegExp;
  more: RegExp;
  why: RegExp;
  ordinals: [RegExp, number][];
  greetingPrefix: RegExp;
  corrections: { pattern: RegExp; leads: string[] }[];
  questionStart: RegExp;
  switchStart: RegExp;
  /** Words that, on their own, are only thanks and nods: "ahh ok thanks", "vale gracias". */
  nods: Set<string>;
  thanks: RegExp;
  /** "I cancelled…", "ya cancelé…": an action reported done, not asked about. */
  done: RegExp;
  howTo: RegExp;
  pointsBack: RegExp;
  followUp: RegExp;
  switchPhrase: RegExp;
  strings: SamStrings;
};

export type SamStrings = {
  contactChip: string;
  topicsChip: string;
  somethingElse: string;
  anythingElse: string[];
  bye: string;
  why: string;
  more: string;
  clarify: string[];
  didYouMean: (title: string) => string;
  fallback: string[];
  fallbackAgain: string[];
  noProblem: string;
  tellMeMore: string;
  contactIntro: string;
  ideaIntro: string;
  topicsIntro: string;
  topicStarters: (label: string) => string;
  helpfulYes: string[];
  helpfulNoOthers: string;
  helpfulNoAlone: string;
  greet: (name?: string) => string;
  correctionClarify: string;
  correctionFallback: string;
  topics: Record<Exclude<TopicId, 'chat'>, string>;
};

const EN: LanguageRules = {
  yes: /^(yes|yeah|yep|yup|ya|yea|sure|correct|right|exactly|that one|that is it|thats it|yes please|y)$/,
  no: /^(no|nope|nah|not really|neither|none|none of these|none of them|wrong|n)$/,
  ack: /^(ok|okay|k|kk|cool|alright|all right|got it|i see|understood|fine|great|nice|good|perfect)$/,
  more: /^(more|tell me more|go on|explain more|and|what else|anything else i should know|more info|more details|continue)$/,
  why: /^(why|why not|how come|but why|why is that|really|seriously|how so)$/,
  ordinals: [
    [/^(the )?(first|1st|1|one|top)( one)?$/, 0],
    [/^(the )?(second|2nd|2|two|middle)( one)?$/, 1],
    [/^(the )?(third|3rd|3|three|last)( one)?$/, 2],
  ],
  greetingPrefix: /^(hi|hello|hey|hiya|good (morning|afternoon|evening)|yo)( there)?( sam)?\s+/,
  corrections: [
    {
      pattern:
        /^(?:i know|i already (?:did|know|tried|have|cancel+ed|done)|i did that|i(?: have|ve)? (?:already )?(?:done|tried|did) (?:that|it|this)|already did(?: that| it)?|done that|did that|yes i did|yeah i did)\b\s*/,
      leads: ['Got it, you’ve already done that.', 'Ah, you’ve done that part already.'],
    },
    {
      pattern:
        /^(?:no+ i mean[t]?|i mean[t]?|what i mean[t]? is|i(?: am|m) asking(?: about)?|i want to know|i wanted to know|my question is)\b\s*/,
      leads: ['Ah, I see what you mean.', 'Got it, thanks for explaining.'],
    },
    {
      pattern:
        /^(?:no+|nope|nah|not that|not quite|that is not (?:it|what i (?:asked|meant|wanted|need))|not what i (?:asked|meant|wanted|need)|wrong(?: answer)?|that is wrong|you (?:misunderstood|got it wrong|did not understand)|that (?:did not|does not) (?:help|answer(?: my question)?)|that is not my question|that is not right)\b\s*/,
      leads: ['Sorry, I got that wrong. Let me try again.', 'Sorry about that, I misread you.'],
    },
  ],
  questionStart:
    /^(how|what|why|where|when|which|who|can|could|do|does|did|is|are|will|should|would|may|i want|i need|tell me|show me|help)\b/,
  switchStart:
    /^(what about|how about|and what about|and for|and with|and|or|also|same for|same with|same thing for|same goes for|what if it is)\b/,
  nods: new Set(
    'ok okay k kk cool great nice perfect good got it i see ah ahh ahhh oh ohh alright right sure yes yeah yep makes sense haha lol thanks thank you thx ty cheers so much a lot understood fine awesome brilliant that helps helped will do now'.split(
      ' ',
    ),
  ),
  thanks: /^(thank|thanks|thx|ty|cheers)$/,
  done: /\bi (?:have |had |already |just |recently |did |)(cancel+ed|deleted|removed|added|paid|stopped|bought|upgraded|downgraded|changed|reset|scanned|uploaded|created|made|turned off|turned on|signed out|logged out|signed up|set up|moved|edited|renamed|typed|entered)\b/g,
  howTo: /^(how (do|can|should) i|how to|can i|where do i)\b/,
  pointsBack: /\b(it|its|that|this|they|them|those|these|one|there)\b/,
  followUp:
    /^(and|but|so|also|what about|how about|ok|okay|then)\b|\b(it|its|that|this|they|them|those|these|one)\b/,
  switchPhrase:
    /^(what about|how about|and what about|and for|same for|same with|what if it is|and with)\b/,
  strings: {
    contactChip: 'Talk to a person',
    topicsChip: 'Browse topics',
    somethingElse: 'Something else',
    anythingElse: [
      'Anything else I can help with?',
      'Great. What else would you like to know?',
      'Anything else on your mind?',
    ],
    bye: 'Alright. I’m here if you need me.',
    why: 'The reason is in the answer just above. If it doesn’t cover what you meant, these might, or a real person can explain.',
    more: 'Here’s what people often ask next:',
    clarify: [
      'I want to get this right. Which of these do you mean?',
      'That could mean a few things. Which one is it?',
      'Just to be sure, which of these are you asking about?',
    ],
    didYouMean: (title) => `Did you mean “${title}”?`,
    fallback: [
      'I’m not sure I understood that. Could you say it another way? Naming the screen or the number you’re looking at helps, like “Current balance” or “Monthly bills”.',
      'Hmm, I didn’t quite get that. Could you put it another way? For example: “how do I add my salary” or “why is my balance negative”.',
      'I don’t want to guess wrong. Could you tell me a bit more, like which screen you’re on or what you were trying to do?',
    ],
    fallbackAgain: [
      'I’m sorry, I don’t have a good answer for that one. A real person from the Skip team can help. Tap **Talk to a person** and they’ll reply by email.',
      'That one’s beyond what I know, and I don’t want to guess. Tap **Talk to a person** and someone from the team will get back to you.',
    ],
    noProblem:
      'No problem. Could you tell me a little more about what you need? Or a real person can help.',
    tellMeMore:
      'No problem. Tell me a little more about what you need, in your own words. Or a real person can help.',
    contactIntro:
      'Of course. Fill this in and a real person from the Skip team will reply by email.',
    ideaIntro: 'I’d love to hear it. Write it below and it goes straight to the team.',
    topicsIntro: 'Pick a topic and I’ll show you the common questions.',
    topicStarters: (label) =>
      `Here are common questions about ${label}. Tap one, or ask in your own words.`,
    helpfulYes: ['Glad that helped.', 'Great, glad that sorted it.', 'Good to hear.'],
    helpfulNoOthers: 'Sorry that missed. Is it one of these? If not, a real person can help.',
    helpfulNoAlone: 'Sorry that missed. Try asking it another way, or a real person can help.',
    greet: (name) =>
      `${name ? `Hi ${name}, I’m Sam.` : 'Hi, I’m Sam.'} Ask me anything about Skip, in your own words. I can explain what a number means, how it’s worked out, where to find something, or how to fix an entry.`,
    correctionClarify: 'Is it one of these?',
    correctionFallback:
      'I don’t have a better answer for that one, and I don’t want to guess. A real person from the Skip team can help.',
    topics: {
      'getting-started': 'Getting started',
      home: 'Home and your balance',
      activity: 'Activity',
      receipts: 'Receipts',
      bills: 'Bills',
      subscriptions: 'Subscriptions',
      pay: 'Salary and pay',
      cards: 'Cards and accounts',
      loans: 'Loans',
      savings: 'Savings',
      goals: 'Goals',
      habits: 'Spending habits',
      voice: 'Voice',
      pro: 'Skip Pro',
      settings: 'Settings',
      reminders: 'Reminders',
      privacy: 'Privacy and your data',
      troubleshooting: 'Something’s not right',
    },
  },
};

const ES: LanguageRules = {
  yes: /^(si|sip|sii|claro|exacto|correcto|eso|ese|esa|eso es|ese es|esa es|si por favor|dale|vale)$/,
  no: /^(no|nop|nel|para nada|ninguno|ninguna|ninguna de esas|ninguno de esos|mal|n)$/,
  ack: /^(ok|okey|vale|listo|entendido|perfecto|genial|de acuerdo|bueno|dale|bien|ya veo|ah ok|chevere|super)$/,
  more: /^(mas|dime mas|cuentame mas|sigue|y|y que mas|algo mas|mas informacion|mas detalles|continua)$/,
  why: /^(por que|porque|por que no|y eso|como asi|en serio|de verdad)$/,
  ordinals: [
    [/^(el |la )?(primer|primero|primera|1|uno|una)$/, 0],
    [/^(el |la )?(segundo|segunda|2|dos)$/, 1],
    [/^(el |la )?(tercero|tercera|3|tres|ultimo|ultima)$/, 2],
  ],
  greetingPrefix:
    /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|que tal)( sam)?\s+/,
  corrections: [
    {
      pattern:
        /^(?:ya lo se|lo se|ya lo hice|ya hice eso|eso ya lo hice|ya lo intente|ya lo probe|si ya lo hice|ya)\b\s*/,
      leads: ['Entendido, eso ya lo hiciste.', 'Ah, esa parte ya la hiciste.'],
    },
    {
      pattern:
        /^(?:no+ me refiero a|me refiero a|quiero decir|lo que quiero saber es|mi pregunta es|pregunto por|hablo de|no hablo de)\b\s*/,
      leads: ['Ah, ya entiendo lo que quieres decir.', 'Entendido, gracias por explicarlo.'],
    },
    {
      pattern:
        /^(?:no+|eso no|no es eso|no era eso|no es lo que pregunte|eso no es lo que pregunte|incorrecto|esta mal|respuesta equivocada|no me sirvio|no me sirve|no ayuda|no me ayuda|no entendiste|no me entendiste)\b\s*/,
      leads: ['Perdón, lo entendí mal. Lo intento otra vez.', 'Perdón, te entendí mal.'],
    },
  ],
  questionStart:
    /^(como|que|por que|porque|donde|cuando|cual|cuales|quien|cuanto|cuanta|cuantos|cuantas|puedo|puede|se puede|hay|tengo|es|esta|son|quiero|necesito|dime|muestrame|ayuda|ayudame)\b/,
  switchStart:
    /^(y que tal|que tal|y que hay de|que hay de|y con|y para|y en|y si|y el|y la|y los|y las|y mi|y mis|y un|y una|y|o|tambien|lo mismo para|lo mismo con|igual para|igual con)\b/,
  nods: new Set(
    'ok okey vale gracias muchas mil muchisimas perfecto genial listo entendido bueno dale si claro ah oh ya veo de acuerdo super excelente buenisimo jaja jeje chevere bien muy me sirvio sirve ayudo eso es'.split(
      ' ',
    ),
  ),
  thanks: /^(gracias|grax|thx)$/,
  done: /\b(?:ya |yo |)(cancele|borre|elimine|quite|agregue|anadi|pague|pare|compre|cambie|escanee|subi|cree|hice|configure|movi|edite|renombre|escribi|active|desactive|cerre sesion)\b/g,
  howTo: /^(como (hago para|puedo|se)?|como|puedo|donde (puedo|hago))\b/,
  pointsBack: /\b(lo|la|los|las|eso|esa|ese|esto|esta|este|ahi|alli|uno|una)\b/,
  followUp:
    /^(y|pero|entonces|tambien|que tal|ok|vale)\b|\b(lo|la|los|las|eso|esa|ese|esto|esta|este)\b/,
  switchPhrase:
    /^(y que tal|que tal|y que hay de|que hay de|y con|y para|lo mismo para|igual para)\b/,
  strings: {
    contactChip: 'Hablar con una persona',
    topicsChip: 'Ver temas',
    somethingElse: 'Otra cosa',
    anythingElse: [
      '¿Te ayudo con algo más?',
      'Genial. ¿Qué más quieres saber?',
      '¿Algo más que quieras preguntar?',
    ],
    bye: 'Perfecto. Aquí estoy si me necesitas.',
    why: 'La razón está en la respuesta de arriba. Si no responde lo que querías saber, quizá estas sí, o una persona del equipo te lo explica.',
    more: 'Esto es lo que la gente suele preguntar después:',
    clarify: [
      'Quiero responderte bien. ¿Cuál de estas buscas?',
      'Eso puede significar varias cosas. ¿Cuál es?',
      'Para estar seguro, ¿sobre cuál de estas preguntas?',
    ],
    didYouMean: (title) => `¿Quisiste decir “${title}”?`,
    fallback: [
      'No estoy seguro de haberte entendido. ¿Puedes decirlo de otra forma? Ayuda nombrar la pantalla o el número que estás viendo, como “Saldo actual” o “Facturas del mes”.',
      'Mmm, no lo entendí del todo. ¿Puedes decirlo de otra forma? Por ejemplo: “cómo agrego mi salario” o “por qué mi saldo es negativo”.',
      'No quiero adivinar mal. ¿Me cuentas un poco más, como en qué pantalla estás o qué intentabas hacer?',
    ],
    fallbackAgain: [
      'Lo siento, no tengo una buena respuesta para eso. Una persona del equipo de Skip puede ayudarte. Toca **Hablar con una persona** y te responderá por correo.',
      'Eso va más allá de lo que sé, y no quiero adivinar. Toca **Hablar con una persona** y alguien del equipo te escribirá.',
    ],
    noProblem:
      'No hay problema. ¿Me cuentas un poco más de lo que necesitas? O una persona del equipo puede ayudarte.',
    tellMeMore:
      'No hay problema. Cuéntame un poco más de lo que necesitas, con tus palabras. O una persona del equipo puede ayudarte.',
    contactIntro: 'Claro. Completa esto y una persona del equipo de Skip te responderá por correo.',
    ideaIntro: 'Me encantaría escucharla. Escríbela abajo y llega directo al equipo.',
    topicsIntro: 'Elige un tema y te muestro las preguntas más comunes.',
    topicStarters: (label) =>
      `Estas son preguntas comunes sobre ${label}. Toca una, o pregunta con tus palabras.`,
    helpfulYes: [
      'Me alegra que te haya servido.',
      'Genial, me alegra que se resolviera.',
      'Qué bueno.',
    ],
    helpfulNoOthers:
      'Perdón, no era eso. ¿Es alguna de estas? Si no, una persona del equipo puede ayudarte.',
    helpfulNoAlone:
      'Perdón, no era eso. Prueba preguntarlo de otra forma, o una persona del equipo puede ayudarte.',
    greet: (name) =>
      `${name ? `Hola ${name}, soy Sam.` : 'Hola, soy Sam.'} Pregúntame lo que quieras sobre Skip, con tus palabras. Puedo explicarte qué significa un número, cómo se calcula, dónde encontrar algo o cómo corregir un registro.`,
    correctionClarify: '¿Es alguna de estas?',
    correctionFallback:
      'No tengo una respuesta mejor para eso, y no quiero adivinar. Una persona del equipo de Skip puede ayudarte.',
    topics: {
      'getting-started': 'Primeros pasos',
      home: 'Inicio y tu saldo',
      activity: 'Actividad',
      receipts: 'Recibos',
      bills: 'Facturas',
      subscriptions: 'Suscripciones',
      pay: 'Salario y pagos',
      cards: 'Tarjetas y cuentas',
      loans: 'Préstamos',
      savings: 'Ahorros',
      goals: 'Metas',
      habits: 'Hábitos de gasto',
      voice: 'Voz',
      pro: 'Skip Pro',
      settings: 'Ajustes',
      reminders: 'Recordatorios',
      privacy: 'Privacidad y tus datos',
      troubleshooting: 'Algo no funciona bien',
    },
  },
};

const FR: LanguageRules = {
  yes: /^(oui|ouais|ouep|exact|exactement|c est ca|celui la|celle la|oui merci|tout a fait|voila)$/,
  no: /^(non|nan|nope|aucun|aucune|aucune des deux|ni l un ni l autre|faux|n)$/,
  ack: /^(ok|okay|d accord|dac|cool|super|parfait|top|compris|ca marche|tres bien|bien|genial|nickel|je vois)$/,
  more: /^(plus|dis m en plus|encore|et|et quoi d autre|autre chose|plus d infos|plus de details|continue)$/,
  why: /^(pourquoi|pourquoi pas|comment ca|ah bon|vraiment|serieux|et pourquoi)$/,
  ordinals: [
    [/^(le |la )?(premier|premiere|1|un|une)$/, 0],
    [/^(le |la )?(deuxieme|second|seconde|2|deux)$/, 1],
    [/^(le |la )?(troisieme|3|trois|dernier|derniere)$/, 2],
  ],
  greetingPrefix: /^(bonjour|salut|coucou|bonsoir|hello|hey|yo)( sam)?\s+/,
  corrections: [
    {
      pattern:
        /^(?:je sais|je l ai deja fait|j ai deja fait ca|deja fait|c est deja fait|je l ai fait|oui je l ai fait|j ai deja essaye)\b\s*/,
      leads: ['D’accord, c’est déjà fait de ton côté.', 'Ah, cette partie est déjà faite.'],
    },
    {
      pattern:
        /^(?:non+ je veux dire|je veux dire|je parle de|ce que je veux dire c est|ma question c est|je demande|je voulais dire)\b\s*/,
      leads: ['Ah, je vois ce que tu veux dire.', 'Compris, merci de préciser.'],
    },
    {
      pattern:
        /^(?:non+|pas ca|ce n est pas ca|c est pas ca|pas ce que j ai demande|faux|mauvaise reponse|ca n aide pas|ca ne m aide pas|ca m aide pas|tu n as pas compris|t as pas compris)\b\s*/,
      leads: ['Désolé, j’ai mal compris. J’essaie encore.', 'Désolé, je t’ai mal compris.'],
    },
  ],
  questionStart:
    /^(comment|quoi|que|qu est ce|pourquoi|ou|quand|quel|quelle|quels|quelles|qui|combien|est ce|puis je|je peux|peut on|on peut|y a t il|il y a|je veux|j ai besoin|dis moi|montre moi|aide)\b/,
  switchStart:
    /^(et pour|et avec|et le|et la|et les|et mon|et ma|et mes|et un|et une|et si|et|ou|aussi|pareil pour|meme chose pour|qu en est il|et qu en est il)\b/,
  nods: new Set(
    'ok okay d accord dac cool super parfait top compris ca marche tres bien genial nickel merci beaucoup mille oui ah oh je vois haha mdr excellent bien m aide aide c est clair'.split(
      ' ',
    ),
  ),
  thanks: /^(merci|mercii|thx)$/,
  done: /\b(?:j ai |je l ai |j ai deja |)(annule|supprime|efface|retire|ajoute|paye|arrete|achete|change|scanne|importe|cree|fait|configure|deplace|modifie|renomme|tape|active|desactive)\b/g,
  howTo:
    /^(comment (faire pour|je peux|puis je|on)?|comment|est ce que je peux|puis je|ou (est ce que )?je)\b/,
  pointsBack: /\b(le|la|les|l|ca|cela|ce|cet|cette|ceci|y|en|un|une)\b/,
  followUp: /^(et|mais|donc|aussi|ok|d accord|alors)\b|\b(ca|cela|ceci|le|la|les)\b/,
  switchPhrase: /^(et pour|et avec|pareil pour|meme chose pour|qu en est il|et qu en est il)\b/,
  strings: {
    contactChip: 'Parler à une personne',
    topicsChip: 'Parcourir les sujets',
    somethingElse: 'Autre chose',
    anythingElse: [
      'Je peux t’aider pour autre chose ?',
      'Super. Tu veux savoir autre chose ?',
      'Autre chose en tête ?',
    ],
    bye: 'D’accord. Je suis là si tu as besoin.',
    why: 'La raison est dans la réponse juste au-dessus. Si elle ne répond pas à ta question, celles-ci peut-être, sinon une vraie personne peut t’expliquer.',
    more: 'Voici ce que les gens demandent souvent ensuite :',
    clarify: [
      'Je veux bien te répondre. Laquelle de ces questions est la bonne ?',
      'Ça peut vouloir dire plusieurs choses. Laquelle ?',
      'Pour être sûr, tu parles de laquelle ?',
    ],
    didYouMean: (title) => `Tu voulais dire « ${title} » ?`,
    fallback: [
      'Je ne suis pas sûr d’avoir compris. Tu peux le dire autrement ? Ça aide de nommer l’écran ou le chiffre que tu regardes, comme « Solde actuel » ou « Factures du mois ».',
      'Hmm, je n’ai pas bien compris. Tu peux reformuler ? Par exemple : « comment ajouter mon salaire » ou « pourquoi mon solde est négatif ».',
      'Je ne veux pas deviner de travers. Tu peux m’en dire un peu plus, comme l’écran où tu es ou ce que tu essayais de faire ?',
    ],
    fallbackAgain: [
      'Désolé, je n’ai pas de bonne réponse pour celle-là. Une vraie personne de l’équipe Skip peut t’aider. Touche **Parler à une personne** et elle te répondra par e-mail.',
      'Ça dépasse ce que je sais, et je ne veux pas deviner. Touche **Parler à une personne** et quelqu’un de l’équipe te répondra.',
    ],
    noProblem:
      'Pas de souci. Tu peux m’en dire un peu plus sur ce qu’il te faut ? Sinon, une vraie personne peut t’aider.',
    tellMeMore:
      'Pas de souci. Dis-m’en un peu plus sur ce qu’il te faut, avec tes mots. Sinon, une vraie personne peut t’aider.',
    contactIntro:
      'Bien sûr. Remplis ceci et une vraie personne de l’équipe Skip te répondra par e-mail.',
    ideaIntro: 'Avec plaisir. Écris-la ci-dessous, elle arrive directement à l’équipe.',
    topicsIntro: 'Choisis un sujet et je te montre les questions fréquentes.',
    topicStarters: (label) =>
      `Voici des questions fréquentes sur ${label}. Touches-en une, ou pose ta question avec tes mots.`,
    helpfulYes: ['Content que ça t’aide.', 'Super, content que ce soit réglé.', 'Tant mieux.'],
    helpfulNoOthers:
      'Désolé, ce n’était pas ça. C’est l’une de celles-ci ? Sinon, une vraie personne peut t’aider.',
    helpfulNoAlone:
      'Désolé, ce n’était pas ça. Essaie de reformuler, ou une vraie personne peut t’aider.',
    greet: (name) =>
      `${name ? `Salut ${name}, je suis Sam.` : 'Salut, je suis Sam.'} Pose-moi n’importe quelle question sur Skip, avec tes mots. Je peux t’expliquer ce que veut dire un chiffre, comment il est calculé, où trouver quelque chose ou comment corriger une entrée.`,
    correctionClarify: 'C’est l’une de celles-ci ?',
    correctionFallback:
      'Je n’ai pas de meilleure réponse pour celle-là, et je ne veux pas deviner. Une vraie personne de l’équipe Skip peut t’aider.',
    topics: {
      'getting-started': 'Premiers pas',
      home: 'Accueil et ton solde',
      activity: 'Activité',
      receipts: 'Reçus',
      bills: 'Factures',
      subscriptions: 'Abonnements',
      pay: 'Salaire et paie',
      cards: 'Cartes et comptes',
      loans: 'Prêts',
      savings: 'Épargne',
      goals: 'Objectifs',
      habits: 'Habitudes de dépense',
      voice: 'Voix',
      pro: 'Skip Pro',
      settings: 'Réglages',
      reminders: 'Rappels',
      privacy: 'Confidentialité et données',
      troubleshooting: 'Quelque chose ne va pas',
    },
  },
};

export const RULES: Record<Language, LanguageRules> = { en: EN, es: ES, fr: FR };

/** Common words in Spanish and French that tell two questions apart no better than "the" does. */
export const OTHER_STOPWORDS = new Set(
  (
    'el la los las un una unos unas de del al a en y o u que se me mi mis tu tus su sus es son esta estan ' +
    'estoy ser hay lo le les con por para como pero si no ya muy mas este esta estos estas ese esa eso ' +
    'aqui alli porfa favor quiero necesito puedo tengo hacer hago sobre aplicacion ' +
    'le la les l un une des du de d et mais donc or ni je j tu il elle on nous vous ils elles me m ' +
    'te t se s ce c cet cette ces mon ma mes ton ta tes son sa ses notre votre leur leurs qui que qu quoi ' +
    'dans en au aux avec pour par sur pas ne n est suis es sont ai as a avoir etre fait faire peux veux ' +
    'stp svp sil plait voila ca cela'
  ).split(' '),
);

/** Question words in Spanish and French: light, like "how" and "why" in English. */
export const OTHER_LIGHT_WORDS = new Set(
  'como cuando donde cual cuales cuanto cuanta cuantos cuantas porque comment quand combien pourquoi quel quelle quels quelles ou'.split(
    ' ',
  ),
);

/** Two-word ideas in Spanish and French, joined before matching, like PHRASES in English. */
export const OTHER_PHRASES: Record<Exclude<Language, 'en'>, [RegExp, string][]> = {
  es: [
    [/\b(prueba gratis|prueba gratuita|periodo de prueba|prueba de \d+ dias)\b/g, 'trial'],
    [/\b(tarjeta de credito|tarjetas de credito)\b/g, 'tarjetacredito tarjeta'],
    [/\b(cuenta bancaria|cuentas bancarias|cuenta de banco)\b/g, 'cuentabancaria cuenta'],
    [/\b(saldo actual)\b/g, 'saldoactual saldo'],
    [/\b(iniciar sesion|inicio de sesion)\b/g, 'iniciarsesion'],
    [/\b(cerrar sesion)\b/g, 'cerrarsesion'],
  ],
  fr: [
    [/\b(essai gratuit|periode d essai|essai de \d+ jours)\b/g, 'trial'],
    [/\b(carte de credit|cartes de credit)\b/g, 'cartecredit carte'],
    [/\b(compte bancaire|comptes bancaires|compte en banque)\b/g, 'comptebancaire compte'],
    [/\b(solde actuel)\b/g, 'soldeactuel solde'],
    [/\b(se connecter|connexion)\b/g, 'seconnecter'],
    [/\b(se deconnecter|deconnexion)\b/g, 'sedeconnecter'],
  ],
};

/** Spanish and French chat shorthand, expanded before matching. */
export const SHORTHAND: Record<Exclude<Language, 'en'>, [RegExp, string][]> = {
  es: [
    [/\bq\b/g, 'que'],
    [/\b(xq|pq|xk|pk)\b/g, 'porque'],
    [/\b(tb|tmb|tbn)\b/g, 'tambien'],
    [/\bx\b/g, 'por'],
    [/\bd\b/g, 'de'],
    [/\bpls\b|\bplis\b/g, 'por favor'],
  ],
  fr: [
    [/\b(stp|svp)\b/g, 's il te plait'],
    [/\b(pk|pq|pkoi)\b/g, 'pourquoi'],
    [/\bjsp\b/g, 'je sais pas'],
    [/\bc\b/g, 'c est'],
    [/\bmtn\b/g, 'maintenant'],
  ],
};
