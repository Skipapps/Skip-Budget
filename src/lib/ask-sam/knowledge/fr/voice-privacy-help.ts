import type { IntentText } from '@/lib/ask-sam/types';

export const voicePrivacyHelpFr: IntentText[] = [
  // Voix : enregistrer

  {
    id: 'voice.record.how',
    title: 'Comment ajouter quelque chose avec la voix ?',
    questions: [
      'comment utiliser la voix',
      'Comment ajouter quelque chose avec la voix ?',
      'comment marche la saisie vocale',
      'comment utiliser le micro pour ajouter des trucs',
      'Je peux juste dire ce que j’ai dépensé au lieu de taper ?',
      'étapes pour enregistrer une transaction',
      'comment parler à Skip',
      'je veux dicter ma facture, comment faire',
      'faut-il toucher ou maintenir le micro',
      'Enregistrer une transaction, comment ça marche',
      'comment noter un achat avec ma voix',
      'on peut dicter une facture ?',
      'comment ca marche la voix stp',
      'c’est quoi la saisie vocale',
    ],
    answer:
      'Maintiens le gros micro, dis-le, puis relâche. La saisie vocale ajoute un reçu, une facture ou un abonnement à partir de ce que tu dis.\n\n' +
      '1. Touche le bouton rond de la voix, tout à droite de la barre d’onglets.\n' +
      '2. Sur **Enregistrer une transaction**, appuie sur le micro en bas et garde le doigt dessus.\n' +
      '3. Dis une seule chose, en anglais, par exemple « Spent $12.50 at Starbucks today ». Tes mots s’affichent en haut pendant que tu parles.\n' +
      '4. Relâche. Skip montre ce qu’elle a entendu sur une page de vérification.\n' +
      '5. Corrige ce qui ne va pas, puis touche **Enregistrer le reçu**, **Enregistrer la facture** ou **Enregistrer l’abonnement**.\n\n' +
      'Tu reviens sur **Accueil** avec une courte note qui confirme l’ajout. Rien n’est jamais enregistré sans que tu l’aies d’abord vérifié.\n\n' +
      'La toute première fois, ce premier appui sert seulement à demander la permission à ton iPhone. Appuie de nouveau et maintiens pour parler.',
    keywords: ['voix', 'micro', 'dicter', 'Enregistrer une transaction'],
  },
  {
    id: 'voice.say.receipts',
    title: 'Que dire pour ajouter un reçu ?',
    questions: [
      'que dire pour noter un café avec la voix',
      'Que dois-je dire pour ajouter un reçu avec la voix ?',
      'exemples de phrases pour un achat',
      'comment dire un café que j’ai acheté',
      'quels mots Skip comprend pour les reçus',
      'faut-il dire le nom du magasin ?',
      'je peux dire la date de mon achat ?',
      'exemple de phrase pour les courses à la voix',
      'quoi dire pour l’essence que j’ai payée hier',
      'comment formuler un reçu en parlant',
      'exemple de phrase pour un recu stp',
      'Je peux dire "spent 40 at Target" ?',
      'dans quel format je parle pour un achat',
    ],
    answer:
      'Dis combien, où et quand, en anglais et dans l’ordre que tu veux. Skip repère chaque morceau. Par exemple :\n\n' +
      '- « Spent $12.50 at Starbucks today »\n' +
      '- « $64.20 at Target yesterday »\n' +
      '- « Paid 45 bucks for gas at Shell on Friday »\n' +
      '- « Groceries $82 at Costco »\n' +
      '- « Lunch at Chipotle $14 yesterday »\n' +
      '- « Forty five at Target three days ago »\n\n' +
      'Des mots comme « spent », « bought », « lunch », « coffee », « groceries » ou « gas », ou « at » devant un magasin, indiquent à Skip qu’il s’agit d’un reçu. Un commerce que Skip ne connaît pas fonctionne quand même si tu dis « at » devant, comme « spent 12.50 at Joe’s Diner ».\n\n' +
      'Si tu ne dis pas de jour, le reçu est daté d’aujourd’hui.',
    keywords: ['reçu à la voix', 'achat', 'exemple', 'que dire'],
  },
  {
    id: 'voice.say.bills',
    title: 'Que dire pour ajouter une facture ?',
    questions: [
      'Que dire pour ajouter une facture avec la voix ?',
      'comment dire mon loyer',
      'exemple pour une facture d’électricité',
      'je peux dire quand une facture est due ?',
      'exemple vocal facture elec',
      'comment ajouter ma facture de téléphone en parlant',
      'quels mots font de ça une facture',
      'Je peux dire mon assurance tous les 3 mois ?',
      'comment dire à Skip le montant et l’échéance de mon hypothèque',
      'dire une facture due le 1er',
      'ajouter ma facture internet avec la voix',
      'comment dicter un loyer à payer le 1er du mois',
    ],
    answer:
      'Dis à quoi sert la facture, combien, et quand elle est due, en anglais. Par exemple :\n\n' +
      '- « Electric bill $85, due on the 15th »\n' +
      '- « Rent is $1,800, due on the 1st »\n' +
      '- « Xfinity $79.99, due on the 20th every month »\n' +
      '- « Water bill $45 due in 3 days »\n\n' +
      'Des mots comme « rent », « mortgage », « electric », « insurance », « phone bill » ou « due » en font une facture. Skip remplit aussi la **Catégorie** à partir de ces mots, ou d’une entreprise qu’elle connaît, comme Xfinity pour **Internet**.\n\n' +
      'Une facture a besoin d’une date d’échéance pour être enregistrée, alors dis « due on… » si tu peux. Si tu ne dis pas la fréquence, **Chaque mois** est choisi pour toi.',
    keywords: ['facture à la voix', 'loyer', 'hypothèque', 'échéance'],
  },
  {
    id: 'voice.say.subscriptions',
    title: 'Que dire pour ajouter un abonnement ?',
    questions: [
      'que dire pour netflix',
      'Que dire pour ajouter un abonnement avec la voix ?',
      'comment ajouter netflix à la voix',
      'exemple pour spotify chaque mois',
      'je peux dire un abonnement annuel ?',
      'comment dire quand ca se renouvelle',
      'qu’est-ce qui fait penser à Skip que c’est un abonnement',
      'ajouter mon abonnement au gym en parlant',
      'exemples vocaux d’abonnements',
      'Je peux dire Amazon Prime par année ?',
      'comment dire un abonnement à la semaine',
      'dire Hulu 7.99 par mois',
    ],
    answer:
      'Dis le service, le prix et la fréquence, en anglais. Par exemple :\n\n' +
      '- « Netflix $15.99 every month »\n' +
      '- « Spotify $11.99 a month, renews on the 3rd »\n' +
      '- « Hulu $99.99 a year »\n' +
      '- « Disney+ $13.99 monthly »\n' +
      '- « Costco membership $65 once a year »\n\n' +
      'Les mots « subscription », « membership » ou « renews » en font un abonnement, tout comme un service de diffusion en continu ou d’application que Skip connaît. La date de renouvellement est facultative.\n\n' +
      'Si tu ne dis ni « every month » ni « a year », **Chaque mois** est choisi pour toi : vérifie donc le **Cycle de facturation** avant d’enregistrer. Si tu ne donnes pas de nom, comme dans « gym membership $40 a month », touche **Service** et choisis-le avant d’enregistrer.',
    keywords: ['abonnement à la voix', 'netflix', 'spotify', 'renouvellement'],
  },
  {
    id: 'voice.say.tips',
    title: 'Astuces pour que Skip me comprenne du premier coup',
    questions: [
      'comment faire pour que Skip me comprenne mieux',
      'la meilleure façon de parler à la saisie vocale',
      'conseils pour la saisie vocale',
      'meilleure façon de dire les montants à la voix',
      'je dis dollars ou juste le chiffre',
      'comment rendre la voix plus precise',
      'ça ne comprend jamais du premier coup, des conseils ?',
      'faut-il parler lentement',
      'je peux faire une pause en parlant',
      'astuces voix',
      'comment bien parler au micro pour que ce soit compris',
    ],
    answer:
      'Quelques habitudes aident Skip à comprendre du premier coup :\n\n' +
      '- Dis une seule chose par appui : un montant, un nom et un jour.\n' +
      '- Dis le magasin ou le service clairement, comme « at Target » ou « Netflix ».\n' +
      '- Pour les cents, « $12.50 » ou « twelve dollars fifty » est clair. « Twelve fifty » peut vouloir dire $12.50 ou $1,250, alors Skip te posera la question.\n' +
      '- Pour les factures et les abonnements, dis la fréquence : « every month », « a year », « every 3 months ».\n' +
      '- Dis quand : « today », « yesterday », « last Friday », « due on the 15th ».\n' +
      '- Parle à un rythme normal. Les pauses ne posent pas de problème tant que tu continues de maintenir, et termine en moins de 15 secondes.\n' +
      '- Un endroit calme aide.\n\n' +
      'Si tu butes sur un mot, corrige-toi simplement : « forty, no, fifty » garde fifty.',
    keywords: ['astuces', 'conseils', 'précision', 'mieux parler'],
  },
  {
    id: 'voice.say.amounts',
    title: 'Comment dire les montants ?',
    questions: [
      'je peux dire les montants en mots ?',
      'est-ce que la voix comprend "a grand"',
      'comment dire les cents à la voix',
      'je peux dire 1.2k',
      'ça comprend "bucks" ?',
      'comment dire un gros montant comme le loyer',
      'twelve fifty ou twelve dollars fifty',
      'dire un prix avec des cents à la voix',
      'ça comprend two hundred and five dollars',
      'et les taxes et le pourboire quand je parle',
      'quels montants la voix comprend',
      'comment dire 1800 dollars a la voix',
    ],
    answer:
      'Dis les montants comme tu le ferais d’habitude, en anglais. Tout ceci fonctionne :\n\n' +
      '- « $12.50 », « 12 dollars 50 », « twelve dollars and fifty cents »\n' +
      '- « 45 bucks », « forty five », « ninety nine cents », « a buck fifty »\n' +
      '- « two hundred and five dollars », « eighteen hundred », « twelve hundred fifty »\n' +
      '- « a grand », « two grand », « $1.2k », « five k »\n\n' +
      'Deux choses poussent Skip à demander plutôt qu’à deviner : les paires comme « twelve fifty », qui peuvent vouloir dire $12.50 ou $1,250, et deux chiffres distincts, comme un prix et un pourboire. Skip n’additionne jamais des chiffres, alors pour un repas avec pourboire, dis le total.\n\n' +
      'Un prix au gallon ou à l’unité est ignoré quand tu dis aussi le total : « $3.45 a gallon, $45.20 total at Shell » enregistre $45.20.',
    keywords: ['montant', 'dollars', 'cents', 'pourboire'],
  },
  {
    id: 'voice.corrections',
    title: 'Puis-je me corriger en parlant ?',
    questions: [
      'et si je dis le mauvais chiffre en parlant',
      'je peux dire non attends',
      'j’ai dit quarante puis cinquante, lequel est retenu',
      'me corriger au milieu d’une phrase à la voix',
      'est-ce que "actually" marche dans la voix',
      'scratch that à la voix',
      'j’ai changé d’avis en plein milieu',
      'je voulais dire Target pas Walmart',
      'oups j’ai dit le mauvais magasin',
      'comment me corriger a la voix',
      'je me suis trompé en parlant, je fais quoi',
    ],
    answer:
      'Oui. Corrige-toi comme tu le ferais avec une personne, et Skip garde la dernière chose que tu as dite pour cette partie :\n\n' +
      '- « Forty, no, fifty at Shell » enregistre $50.\n' +
      '- « Spent 40, make that 45, at Shell » enregistre $45.\n' +
      '- « Walmart, I mean Target, 30 » enregistre Target.\n' +
      '- « Netflix, actually Hulu, 7.99 » enregistre Hulu.\n' +
      '- « Netflix 15.99 monthly, no, yearly » l’enregistre comme annuel.\n\n' +
      'Parmi les mots qui fonctionnent : « no », « no wait », « actually », « I mean », « sorry », « make that », « scratch that » et « oops ». Seule la partie que tu as corrigée change. Tout le reste de ce que tu as dit demeure.',
    keywords: ['correction', 'no wait', 'actually', 'scratch that'],
  },
  {
    id: 'voice.limit-time',
    title: 'Combien de temps puis-je parler ?',
    questions: [
      'y a-t-il une limite de temps pour la voix ?',
      "ca a arrete d'ecouter apres quelques secondes",
      'combien de temps je peux maintenir le micro',
      'la voix m’a coupé la parole',
      'je peux faire une pause au milieu d’une phrase',
      'durée max d’enregistrement',
      'phrase longue saisie vocale',
      'pourquoi le micro s’est arrêté tout seul',
      'ça s’arrête quand je fais une pause ?',
      '15 secondes voix',
    ],
    answer:
      'Jusqu’à 15 secondes par appui. Passé ce délai, le micro se ferme tout seul et Skip utilise ce qu’elle a entendu jusque-là.\n\n' +
      'Les pauses ne l’arrêtent pas. Tant que ton doigt reste appuyé, un appui équivaut à une phrase, peu importe le temps que tu prends pour réfléchir. Lever le doigt y met fin.\n\n' +
      'Une entrée tient sans problème : « Car insurance $140 every month, due on the 5th » est bien en dessous de la limite.',
    keywords: ['limite de temps', '15 secondes', 'coupé', 'pause'],
  },
  {
    id: 'voice.interruptions',
    title: 'Et si un appel arrive pendant que je parle ?',
    questions: [
      'et si je reçois un appel pendant l’enregistrement',
      'ma musique s’est arrêtée quand j’ai utilisé la voix',
      'la voix met mon podcast en pause ?',
      'j’ai verrouillé mon téléphone en parlant',
      'la voix s’est arrêtée quand j’ai changé d’app',
      'Siri a interrompu la saisie vocale',
      'j’ai quitté la page voix au milieu d’une phrase',
      'ma musique va revenir après la voix ?',
      'une alarme a sonné pendant que j’enregistrais',
      'musique en arriere plan voix',
    ],
    answer:
      'Skip gère les interruptions calmement :\n\n' +
      '- Un appel, Siri ou une alarme met fin à l’enregistrement, et Skip garde ce que tu avais déjà dit.\n' +
      '- Quitter la page, retourner à l’écran d’accueil ou verrouiller le téléphone coupe le micro aussitôt et oublie cet enregistrement. Rien n’est enregistré.\n' +
      '- La musique et les podcasts se mettent en pause pendant que tu maintiens le micro, et reprennent généralement quand tu relâches.\n\n' +
      'Le micro ne se rallume jamais tout seul quand tu reviens. Maintiens-le de nouveau quand tu veux.',
    keywords: ['appel', 'interruption', 'musique', 'Siri'],
  },

  // Voix : comment Skip comprend ce que tu dis

  {
    id: 'voice.kind.how',
    title: 'Comment Skip choisit reçu, facture ou abonnement ?',
    questions: [
      'comment la voix sait que c’est une facture',
      'Comment Skip décide entre reçu, facture et abonnement ?',
      'pourquoi mon netflix est devenu un reçu',
      'ça veut dire quoi "Skip a deviné"',
      'comment la voix reconnaît le type',
      'pourquoi mon gym est classé comme abonnement',
      'c’est quoi les boutons Ajouter comme',
      'ma facture netflix est sortie en abonnement, pourquoi',
      'comment elle fait la différence entre facture et abonnement',
      'comment ca choisit facture ou abonnement stp',
      'pourquoi c’est un reçu alors que j’ai dit facture',
      'Skip a deviné. Choisis-en un autre si ce n’est pas le bon',
    ],
    answer:
      'Skip lit les mots que tu as employés, puis le nom, et en choisit un parmi trois :\n\n' +
      '- **Abonnement** : des mots comme « subscription », « membership » ou « renews », ou un service de diffusion en continu ou d’application comme Netflix ou Spotify.\n' +
      '- **Facture** : « rent », « mortgage », « electric », « insurance », « phone bill », « due », ou une entreprise de services publics, de téléphone, d’internet ou d’assurance.\n' +
      '- **Reçu** : « spent », « bought », « coffee », « lunch », « groceries », « gas », ou « at » devant un magasin.\n\n' +
      'Dire la fréquence (« every month ») oriente vers un abonnement, ou vers une facture pour un service public ou un mot de facture. « Spent 15.49 on Netflix » est un reçu, parce que « spent » l’emporte. « My Netflix bill » reste un abonnement.\n\n' +
      'Quand rien ne l’indique, Skip choisit **Reçu** et affiche « Skip a deviné. Choisis-en un autre si ce n’est pas le bon. » Touche un autre choix sous **Ajouter comme** pour changer.',
    keywords: ['Ajouter comme', 'type', 'deviné', 'reçu ou facture'],
  },
  {
    id: 'voice.kind.change',
    title: 'Comment le changer en facture ou en abonnement ?',
    questions: [
      'changer de reçu à facture sur la page voix',
      'en faire une facture au lieu d’un reçu',
      'Comment changer une saisie vocale de reçu à facture ?',
      'il a choisi le mauvais type, comment corriger',
      'je peux le passer en abonnement avant d’enregistrer',
      'que se passe-t-il si je touche Facture sous Ajouter comme',
      'mauvais type sur la page voix',
      'je l’ai enregistré comme reçu mais c’est un abonnement',
      'changer le type après avoir enregistré une saisie vocale',
      'transformer mon reçu vocal en facture',
      'les boutons Ajouter comme ont changé ma date',
      'passer de reçu à abonnement sur la page de vérification',
    ],
    answer:
      'Avant d’enregistrer, touche **Reçu**, **Facture** ou **Abonnement** sous **Ajouter comme**. Skip relit tes mots pour le nouveau type, et tout ce que tu as déjà modifié à la main reste comme tu l’as réglé.\n\n' +
      'Le jour peut bouger quand tu changes de type. Pour un reçu, « on the 5th » désigne le dernier 5 déjà passé. Pour une facture ou un abonnement, cela désigne le prochain 5.\n\n' +
      'Une fois enregistré, un reçu ne peut plus devenir une facture ni un abonnement. Supprime celui que tu as enregistré (ouvre-le, touche le crayon, puis **Supprimer** en bas) et ajoute-le de nouveau de la bonne façon, par la voix ou avec **Ajout rapide** sur **Accueil**.',
    keywords: ['Ajouter comme', 'changer le type', 'mauvais type', 'convertir'],
  },
  {
    id: 'voice.amount.which',
    title: 'Pourquoi Skip demande quel montant je voulais dire ?',
    questions: [
      'il a entendu fifteen ninety nine comme 1599',
      'quel montant tu voulais dire',
      'Pourquoi Skip me demande quel montant je voulais dire ?',
      'il m’a donné deux montants à choisir',
      'c’est quoi "Quel montant voulais-tu dire ?"',
      'twelve fifty est sorti en 12.50 et 1250',
      'pourquoi il ne distingue pas 15.99 de 1599',
      'à quoi sert "Aucun, je vais le taper"',
      'ça affiche deux prix et ça n’enregistre pas',
      'j’ai dit un prix plus un pourboire et ça me demande de choisir',
      'ca affiche 2 montants pk',
      'pourquoi je dois choisir le montant',
      'Choisis le montant que tu voulais dire',
    ],
    answer:
      'Skip a entendu quelque chose qui pourrait vouloir dire deux montants, alors elle te demande plutôt que de deviner avec ton argent.\n\n' +
      '- « Twelve fifty » peut être $12.50 ou $1,250.\n' +
      '- « Fifteen ninety nine » peut être $15.99 ou $1,599.\n' +
      '- Deux chiffres distincts, comme « $40 plus $5 tip », sont proposés comme $5 et $40. Skip n’additionne jamais des chiffres.\n\n' +
      'Touche le bon sous **Quel montant voulais-tu dire ?**. Si aucun ne convient, touche **Aucun, je vais le taper** et utilise le clavier numérique. **Enregistrer** reste désactivé tant que tu n’as pas choisi, avec l’indice « Choisis le montant que tu voulais dire. »\n\n' +
      'Pour éviter la question, dis « $12.50 », « twelve dollars fifty », ou le total seul.',
    keywords: ['Quel montant voulais-tu dire ?', 'deux montants', 'Aucun', 'ambigu'],
  },
  {
    id: 'voice.amount.wrong',
    title: 'Le montant entendu par Skip est faux',
    questions: [
      'Skip s’est trompé de montant',
      'il a entendu 14 au lieu de 40',
      'comment corriger le montant sur la page voix',
      'le prix est faux après que j’ai parlé',
      'mauvais chiffre avec la voix',
      'la voix a-t-elle arrondi mon montant',
      'il a mis un énorme montant par erreur',
      'comment changer le montant avant d’enregistrer une saisie vocale',
      'le montant est manquant après avoir parlé',
      'Touche pour ajouter le montant, je fais quoi',
      'il n’a pas pris les cents',
    ],
    answer:
      'Corrige-le sur la page de vérification.\n\n1. Touche le gros montant en haut. Un clavier numérique s’ouvre avec la question « Combien as-tu dépensé ? » (ou « De combien est la facture ? » ou « Combien ça coûte ? »).\n2. Saisis le bon chiffre.\n3. Touche **Terminé**.\n\nSi aucun montant n’a été entendu, le haut de la page affiche **Touche pour ajouter le montant**.\n\nSkip garde les montants au cent près et ne les arrondit jamais. Le plus élevé qu’elle accepte est $999,999,999.99. Des nombres comme « forty » et « fourteen » se ressemblent à l’oreille, alors un coup d’œil rapide avant **Enregistrer** en vaut la peine.',
    keywords: [
      'mauvais montant',
      'clavier numérique',
      'Touche pour ajouter le montant',
      'chiffre mal entendu',
    ],
  },
  {
    id: 'voice.dates',
    title: 'Quelles dates puis-je dire ?',
    questions: [
      'je peux dire une date quand j’ajoute par la voix ?',
      'quelles dates la voix comprend',
      'comment dire vendredi dernier',
      'pourquoi "on the 5th" est devenu le mois dernier',
      'ça a mis le mois prochain pour l’échéance de ma facture',
      'je peux dire il y a trois jours',
      'ça comprend october 3rd',
      'la voix a mis la mauvaise date',
      'et si je ne dis pas de date à la voix',
      'échéance le 31 dans un mois court avec la voix',
      'comment la voix gère les dates',
      'mon loyer dû le 1er est passé au mois prochain',
    ],
    answer:
      'Skip comprend la plupart des façons courantes de dire un jour : « today », « yesterday », « tomorrow », « the day before yesterday », « 3 days ago », « a week ago », « last Friday », « next Friday », « on Monday », « on the 5th », « October 3rd » et « 10/3 ».\n\n' +
      'Le sens du jour dépend du type :\n' +
      '- **Reçu** : le plus récent, puisque tu as déjà acheté. Un 5 dit le 13 donne le 5 de ce mois-ci.\n' +
      '- **Facture ou abonnement** : le prochain. Un 5 dit le 13 donne le 5 du mois prochain. Des mots au passé comme « paid », « was due » ou « renewed » pointent plutôt vers l’arrière.\n\n' +
      'Si tu dis le 31 et que le mois est plus court, une facture prend le dernier jour du mois. Sans jour dit, un reçu est daté d’aujourd’hui, une facture demande **Date d’échéance**, et un abonnement peut s’enregistrer sans date de renouvellement.\n\n' +
      'Pour changer, touche la ligne de la date et choisis un jour. Sur un reçu, les boutons **Aujourd’hui** et **Hier** sous la date la règlent d’un seul toucher.',
    keywords: ['date', 'jour', 'hier', 'échéance'],
  },
  {
    id: 'voice.cycle',
    title: 'Comment dire à quelle fréquence ça se répète ?',
    questions: [
      'comment dire chaque année à la voix',
      'Comment dire à Skip qu’une facture est annuelle ?',
      'options de fréquence à la voix',
      'je peux dire une fréquence toutes les deux semaines',
      'mon abonnement a été enregistré mensuel mais il est annuel',
      'pourquoi "chaque mois" est déjà choisi',
      'ça veut dire quoi Récurrence sur la page voix',
      'Cycle de facturation sur la page de vérification',
      'dire une facture trimestrielle',
      'fréquence aux deux semaines à la voix',
      'assurance tous les 3 mois à la voix',
      'j’ai pas dit la fréquence',
    ],
    answer:
      'Dis-le avec des mots simples. Skip comprend quatre rythmes :\n\n' +
      '- **Chaque semaine** : « every week », « a week », « weekly »\n' +
      '- **Chaque mois** : « every month », « a month », « per month », « monthly »\n' +
      '- **Tous les 3 mois** pour les factures, **Chaque trimestre** pour les abonnements : « every 3 months », « every quarter », « quarterly »\n' +
      '- **Chaque année** : « every year », « a year », « once a year », « annually »\n\n' +
      'Si tu n’en dis aucun, **Chaque mois** est sélectionné sous **Récurrence** (factures) ou **Cycle de facturation** (abonnements). Touche un autre bouton avant d’enregistrer, parce que mensuel ou annuel change beaucoup tes chiffres.\n\n' +
      'Skip ne peut pas enregistrer « every two weeks », « twice a month » ni « every 6 months ». Elle les repère pour que le nombre ne soit pas pris pour de l’argent, mais tu devras choisir le bouton le plus proche.',
    keywords: ['Récurrence', 'Cycle de facturation', 'mensuel', 'annuel'],
  },
  {
    id: 'voice.store.wrong',
    title: 'Skip a mal entendu le magasin ou le service',
    questions: [
      'la voix s’est trompée de magasin',
      'Skip s’est trompé dans le nom du magasin',
      'elle a écrit star bucks au lieu de starbucks',
      'mauvais nom de service avec la voix',
      'comment changer le magasin sur la page de vérification',
      'elle n’a pas reconnu mon commerce local',
      'Magasin est vide après que j’ai parlé',
      'l’entreprise de la facture est fausse après avoir parlé',
      'elle a entendu spot a fly au lieu de spotify',
      'Choisis d’abord un magasin, ça veut dire quoi avec la voix',
      'comment corriger le nom que Skip a entendu',
      'mon petit commerce du coin n’est pas trouvé par la voix',
    ],
    answer:
      'Tu peux le changer toi-même.\n\n1. Touche la ligne **Magasin** (**Service** pour un abonnement, **Nom** pour une facture).\n2. Une recherche s’ouvre avec « Où l’as-tu acheté ? », « Quel est le service ? » ou « De qui vient la facture ? ». Si Skip n’a pas reconnu le nom, la recherche contient déjà ce qu’elle a entendu : il ne te reste qu’à le corriger.\n3. Choisis le bon, ou ajoute ton propre nom, puis touche **Terminé**.\n\nUn reçu a besoin d’un magasin et un abonnement d’un service avant de s’enregistrer. Tu verras « Choisis d’abord un magasin. » ou « Choisis d’abord un service. » jusque-là.\n\nQuand Skip a dû deviner le nom, elle mémorise ta correction pour la prochaine fois.',
    keywords: ['magasin', 'service', 'nom', 'mauvais magasin'],
  },
  {
    id: 'voice.names.brand',
    title: 'Pourquoi ça s’est enregistré sous un autre nom ?',
    questions: [
      'j’ai dit comcast mais ça affiche xfinity',
      'Amazon Prime enregistré comme Amazon',
      'icloud est devenu apple',
      'la voix a changé le nom de l’entreprise',
      'pourquoi mon abonnement affiche un autre nom que celui que j’ai dit',
      'la voix a renommé ma facture avec la marque',
      'elle a pris le nom de la société mère',
      'la voix a choisi un autre nom de marque',
      'Comcast ou Xfinity',
      'le nom que j’ai dit n’est pas celui qui est enregistré',
    ],
    answer:
      'Skip a associé ce que tu as dit au nom que l’entreprise utilise dans la liste de magasins et de services de Skip. Par exemple :\n\n' +
      '- « Comcast » s’enregistre comme **Xfinity**.\n' +
      '- « Amazon Prime » s’enregistre comme **Amazon**.\n' +
      '- « iCloud » s’enregistre comme **Apple**.\n\n' +
      'Cela conserve le bon logo et garde tes entrées ensemble. Si tu préfères tes propres mots, touche la ligne **Magasin**, **Service** ou **Nom** avant d’enregistrer et change-le. Pour une facture, tu peux saisir n’importe quel **Nom** et garder l’entreprise à part.',
    keywords: ['Xfinity', 'Comcast', 'Amazon Prime', 'nom de marque'],
  },
  {
    id: 'voice.learning',
    title: 'Skip apprend-elle de mes corrections ?',
    questions: [
      'la voix apprend les noms que je corrige ?',
      'elle va se souvenir de spotify la prochaine fois',
      'comment Skip apprend mes mots',
      'où sont gardées mes corrections vocales',
      'je peux faire oublier une correction à Skip',
      'elle utilise toujours un mauvais nom que j’ai corrigé une fois',
      'mes corrections vocales passent sur mon autre téléphone',
      'la voix se souvient d’un mauvais nom, comment l’annuler',
      'Skip téléverse mes corrections ?',
      'combien de corrections elle peut retenir',
      'noms appris par la voix',
    ],
    answer:
      'Oui, pour les noms que Skip a dû deviner. Si elle a entendu « spot a fly » et que tu le changes pour Spotify, puis enregistres, Skip retient que ces mots veulent dire Spotify.\n\n' +
      '- Elle n’apprend que lorsque tu changes un nom deviné. Si tu as dit un nom que Skip connaît exactement, comme « Target », et que tu l’as changé, c’est un changement d’idée, alors rien n’est appris.\n' +
      '- Les corrections restent sur ce téléphone seulement. Elles ne sont jamais téléversées et ne passent pas sur un autre téléphone.\n' +
      '- Elle en garde jusqu’à 200. Les plus anciennes partent en premier.\n' +
      '- Pour en annuler une, la prochaine fois, remets le nom aux mots que tu as vraiment dits. Cela la supprime.\n' +
      '- Te déconnecter ou supprimer ton compte les efface.',
    keywords: ['apprendre', 'se souvenir', 'corrections', 'oublier'],
  },

  // Voix : la page de vérification

  {
    id: 'voice.bill-category',
    title: 'Pourquoi une facture vocale demande à quoi elle sert ?',
    questions: [
      'c’est quoi la Catégorie sur une facture vocale',
      'la voix n’a pas choisi de catégorie pour ma facture Verizon',
      'c’est quoi la page "Cette facture, c’est pour quoi ?"',
      'comment la voix choisit la catégorie d’une facture',
      'mauvaise catégorie sur ma facture vocale',
      'pourquoi ma facture vocale s’appelle Électricité et gaz',
      'le nom de ma facture est devenu le nom de la catégorie',
      'changer la catégorie après avoir dicté une facture',
      'liste des catégories de factures à la voix',
      'prêt étudiant à la voix classé dans Autre',
      'pourquoi ça me demande une catégorie',
      'Choisis à quoi correspond la facture',
    ],
    answer:
      'Chaque facture a besoin d’une **Catégorie**, et Skip la remplit à partir de tes mots ou de l’entreprise :\n\n' +
      '- Les mots passent en premier : « rent » ou « mortgage » donne **Logement**, « electric » donne **Électricité et gaz**, « car insurance » donne **Assurances**, « tuition » donne **Éducation**.\n' +
      '- Une entreprise qui ne fait qu’une chose claire la remplit : Xfinity donne **Internet**, GEICO donne **Assurances**. Les entreprises qui vendent plusieurs choses, comme Verizon ou AT&T, te laissent choisir.\n\n' +
      'Quand aucune n’est définie, tu vois « Choisis à quoi correspond la facture. » Touche **Catégorie** et, sur **Cette facture, c’est pour quoi ?**, choisis-en une parmi les 10 : Logement, Électricité et gaz, Eau et déchets, Internet, Cellulaire, Assurances, Transport, Santé et soins médicaux, Éducation ou Autre.\n\n' +
      'Une facture sans entreprise prend le nom de sa catégorie, donc « Electric bill $85 » s’enregistre sous **Électricité et gaz**. Touche **Nom** pour lui donner un autre nom. Une facture **Autre**, comme « student loan 250 every month », a besoin d’un **Nom** que tu saisis.',
    keywords: ['Catégorie', 'type de facture', 'Logement', 'Autre'],
  },
  {
    id: 'voice.note',
    title: 'Puis-je ajouter une note avec la voix ?',
    questions: [
      'je peux ajouter une note à une saisie vocale',
      'ce que je dis va dans la note ?',
      'ajouter une note à un reçu vocal',
      'où est la note sur la page voix',
      'je peux dicter une note dans Skip',
      'champ note vide apres la voix',
      'ligne Ajouter une note sur la page de vérification',
      'comment écrire une note en ajoutant par la voix',
      'une note pour une facture que j’ai dite à voix haute',
      'la voix a ignoré les autres choses que j’ai dites',
    ],
    answer:
      'Oui, mais tu la saisis au clavier. Rien de ce que tu dis ne devient une note, parce que Skip ne retient que le montant, le nom, la date et la fréquence. Les autres mots sont laissés de côté.\n\n' +
      'Sur la page de vérification, touche la ligne **Note**, qui dit **Ajouter une note**, saisis ta note et touche **Terminé**. Une note peut compter jusqu’à 200 caractères, et elle reste si tu passes de **Reçu** à **Facture** ou à **Abonnement**.',
    keywords: ['note', 'Ajouter une note', 'commentaire', 'mémo'],
  },
  {
    id: 'voice.siri',
    title: 'Puis-je ajouter des choses avec Siri ?',
    questions: [
      'je peux utiliser siri avec skip',
      'hey siri ajoute un reçu dans skip',
      'raccourcis siri skip',
      'ajouter à skip par la voix depuis l’écran verrouillé',
      'je peux ajouter par la voix sans ouvrir l’app',
      'apple watch voix skip',
      'il y a un widget pour la saisie vocale',
      'carplay skip',
      'dicter à skip avec siri',
      'raccourci direct vers la page voix',
    ],
    answer:
      'Non. Skip ne fonctionne pas avec Siri ni avec Raccourcis, et elle n’a ni widget ni app pour l’Apple Watch. La saisie vocale se trouve dans Skip : ouvre l’app et touche le bouton rond de la voix, tout à droite de la barre d’onglets, sur n’importe quel onglet.\n\n' +
      'Si tu aimerais avoir Siri ou un raccourci, envoie-le comme idée dans **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['Siri', 'Raccourcis', 'widget', 'Apple Watch'],
  },
  {
    id: 'voice.review.page',
    title: 'C’est quoi la page après que j’ai parlé ?',
    questions: [
      'c’est quoi la page "C’est bien ça ?"',
      'ça veut dire quoi "Skip t’a bien entendu ?"',
      'c’est quoi la zone "Tu as dit"',
      'qu’est-ce que je regarde après avoir relâché le micro',
      'la page de vérification après la voix, c’est quoi les lignes',
      'pourquoi ça dit Skip t’a bien entendu au lieu de C’est bien ça',
      'ça veut dire quoi "Tu pourras le modifier plus tard"',
      'ecran de verification voix c quoi',
      'c’est quoi la page Ajouter un reçu après l’enregistrement',
      'ça veut dire quoi Touche pour ajouter sur une ligne',
    ],
    answer:
      'C’est la page de vérification. Rien n’est enregistré tant que tu ne touches pas **Enregistrer**.\n\n' +
      '- En haut : **C’est bien ça ?**, ou **Skip t’a bien entendu ?** quand elle est moins sûre, par exemple quand aucun montant n’a été entendu.\n' +
      '- **Tu as dit** affiche tes mots entre guillemets.\n' +
      '- **Ajouter comme** permet de passer de **Reçu** à **Facture** ou à **Abonnement**.\n' +
      '- Le gros chiffre est le montant. Touche-le pour le changer.\n' +
      '- Les lignes en dessous contiennent le reste : le magasin, le service ou le nom de la facture, la date, la fréquence, **Payé avec** et une **Note**. Une ligne qui dit **Touche pour ajouter** est encore nécessaire. Touche n’importe quelle ligne pour la changer.\n' +
      '- En bas : **Enregistrer**, **Redis-le** et **Plus d’options**.\n\n' +
      '« Tu pourras le modifier plus tard. » veut dire que tu peux toujours ouvrir l’entrée enregistrée et la modifier.',
    keywords: ['C’est bien ça ?', 'Skip t’a bien entendu ?', 'Tu as dit', 'page de vérification'],
  },
  {
    id: 'voice.review.required',
    title: 'Pourquoi je ne peux pas enregistrer ma saisie vocale ?',
    questions: [
      'Pourquoi je ne peux pas enregistrer ce que j’ai dit ?',
      'bouton enregistrer grisé sur la page voix',
      'ma saisie vocale ne s’enregistre pas',
      'ça veut dire quoi Choisis à quoi correspond la facture',
      'ça dit Choisis la première date d’échéance',
      'Donne un nom à la facture, je fais ça où',
      'qu’est-ce qui manque encore sur la page de vérification',
      'le bouton enregistrer le reçu ne marche pas après la voix',
      'pourquoi enregistrer la facture est desactive',
      'qu’est-ce que je dois remplir avant d’enregistrer une facture vocale',
      'Indique combien tu as dépensé s’affiche sous le bouton',
    ],
    answer:
      'Il manque encore quelque chose dont Skip a besoin. La ligne au-dessus de **Enregistrer** te dit quoi :\n\n' +
      '- « Choisis le montant que tu voulais dire. » Choisis-en un sous **Quel montant voulais-tu dire ?**\n' +
      '- « Choisis à quoi correspond la facture. » Touche **Catégorie** et choisis-en une.\n' +
      '- « Choisis d’abord un magasin. » ou « Choisis d’abord un service. » Touche la ligne **Magasin** ou **Service**.\n' +
      '- « Indique combien tu as dépensé. », « Indique combien ça coûte. » ou « Indique ce que ça coûte. » Touche le montant.\n' +
      '- « Donne un nom à la facture. » Touche **Nom**.\n' +
      '- « Choisis la première date d’échéance. » Touche **Date d’échéance**.\n\n' +
      'Les lignes encore nécessaires disent **Touche pour ajouter**. Si la ligne dit plutôt « Une erreur est survenue. Réessaie. », c’est l’enregistrement lui-même qui a échoué. Vérifie ta connexion et touche **Enregistrer** de nouveau.',
    keywords: ['enregistrer grisé', 'désactivé', 'manquant', 'obligatoire'],
  },
  {
    id: 'voice.review.more-options',
    title: 'À quoi sert Plus d’options ?',
    questions: [
      'C’est quoi Plus d’options sur la page voix ?',
      'comment obtenir le formulaire complet depuis la voix',
      'je peux ajouter un rappel depuis la page de vérification vocale',
      'bouton plus d’options voix',
      'je veux régler plus de détails que ce que la voix montre',
      'comment ouvrir le formulaire normal avec ce que j’ai dit',
      'où est le champ rappel quand j’ajoute par la voix',
      'qu’arrive-t-il si je touche plus d’options',
      "plus d'options ou enregistrer",
      'plus de champs quand j’ajoute par la voix',
    ],
    answer:
      '**Plus d’options** ouvre le formulaire d’ajout complet pour ce type, avec tout ce que Skip a entendu déjà rempli. Utilise-le quand tu veux un champ que la page de vérification n’affiche pas, comme le **Rappel** d’une facture.\n\n' +
      'Le formulaire demande alors ce qu’il demande toujours. Pour une facture ou un abonnement, cela comprend **Payée avec** et **Rappel**, où **Aucun rappel** est une réponse tout à fait correcte. Enregistrer à partir de là te ramène aussi à **Accueil**.\n\n' +
      'Tes mots et tes modifications t’accompagnent, alors tu n’as rien à redire.',
    keywords: ['Plus d’options', 'formulaire complet', 'rappel', 'tous les champs'],
  },
  {
    id: 'voice.review.start-over',
    title: 'Comment annuler ou refaire une saisie vocale ?',
    questions: [
      'annuler une saisie vocale',
      'Comment recommencer sur la page voix ?',
      'à quoi sert Redis-le',
      'annuler l’ajout par la voix',
      'je veux jeter ce que j’ai dit',
      'ça veut dire quoi Annuler l’ajout de ce reçu',
      'le balayage pour revenir ne marche plus sur la page de vérification',
      'comment refaire un enregistrement',
      'sortir de la saisie vocale sans enregistrer',
      'j’ai touché le X sur la page voix, ça enregistre ?',
      'retourner au micro',
    ],
    answer:
      'Il y a trois façons d’en sortir, et aucune n’enregistre quoi que ce soit :\n\n' +
      '- **Redis-le** te ramène au micro pour réessayer.\n' +
      '- La flèche de retour te ramène aussi au micro.\n' +
      '- Le **X** en haut ferme tout et te mène à **Accueil**.\n\n' +
      'Le **X** demande toujours confirmation d’abord, par exemple « Annuler l’ajout de ce reçu ? » avec « Rien de ce que tu as saisi ici ne sera enregistré. » Retour et **Redis-le** ne le demandent qu’une fois que tu as modifié quelque chose. Touche **Oui** pour tout jeter, ou **Revenir** pour continuer.\n\n' +
      'Une fois que tu as modifié quelque chose, le geste de balayage pour revenir est désactivé sur cette page, pour qu’un balayage accidentel ne te fasse pas perdre ton travail.',
    keywords: ['Redis-le', 'annuler', 'recommencer', 'refaire'],
  },
  {
    id: 'voice.after-save',
    title: 'Que se passe-t-il après avoir enregistré une saisie vocale ?',
    questions: [
      'où est passé mon reçu vocal',
      'Où va ma saisie vocale après l’enregistrement ?',
      'j’ai enregistré par la voix, où est-ce',
      'un reçu vocal est pareil qu’un reçu tapé ?',
      'dans quel carnet de reçus va un reçu vocal',
      'je peux modifier ce que j’ai ajouté par la voix',
      'après l’enregistrement ça m’a ramené à l’accueil, c’est normal',
      'la saisie vocale apparaît dans Activité ?',
      'facture enregistrée par la voix, où la trouver',
      'est ce que ma saisie vocale est enregistree',
      'comment modifier une saisie vocale plus tard',
    ],
    answer:
      'Elle est enregistrée exactement comme une saisie au clavier. Tu reviens sur **Accueil**, et une courte note en bas dit **Reçu ajouté**, **Facture ajoutée** ou **Abonnement ajouté**.\n\n' +
      '- Un reçu va dans ton carnet de reçus par défaut, ou dans **Général** si tu n’en as pas choisi. Il s’affiche dans **Reçus**, **Activité** et sur **Accueil**.\n' +
      '- Une facture s’affiche dans **Factures mensuelles**, et un abonnement dans **Abonnements**.\n\n' +
      'Pour la modifier plus tard, touche-la pour ouvrir sa page, puis touche le crayon en haut. Tes paroles ne sont pas conservées avec elle, seulement les détails que tu as enregistrés.',
    keywords: ['après l’enregistrement', 'où est-ce', 'Reçu ajouté', 'carnet de reçus'],
  },
  {
    id: 'voice.reminder',
    title: 'Une facture ajoutée par la voix a-t-elle un rappel ?',
    questions: [
      'est-ce que j’aurai un rappel pour une facture ajoutée par la voix ?',
      'mon abonnement vocal n’a pas de rappel',
      'comment ajouter un rappel à une facture vocale',
      'j’ai ajouté mon loyer par la voix et je n’ai pas eu de rappel',
      'la voix règle des rappels ?',
      'rappel manquant sur une facture que j’ai dite',
      'la voix peut me rappeler avant le renouvellement de netflix',
      'régler un rappel après l’ajout par la voix',
      'pourquoi ma facture vocale ne m’a pas rappelé',
      'reglage rappel saisie vocale',
    ],
    answer:
      'Non. Une facture ou un abonnement enregistré depuis la page de vérification vocale n’a pas de rappel. Tu peux en ajouter un en quelques touches :\n\n' +
      '1. Ouvre la facture ou l’abonnement.\n' +
      '2. Touche le crayon en haut.\n' +
      '3. Règle **Rappel** et enregistre.\n\n' +
      'Tu peux aussi activer les rappels pour n’importe quelle facture ou n’importe quel abonnement dans **Réglages → Préférences → Rappels**.\n\n' +
      'Pour régler le rappel pendant l’ajout, touche **Plus d’options** sur la page de vérification plutôt que **Enregistrer**. Le formulaire complet demande **Rappel** avant d’enregistrer.',
    keywords: ['rappel', 'notification', 'rappeler', 'facture vocale'],
  },
  {
    id: 'voice.paid-with',
    title: 'Comment dire avec quelle carte j’ai payé ?',
    questions: [
      'je peux dire quelle carte j’ai utilisée ?',
      'j’ai dit sur ma Amex mais Payé avec est vide',
      'comment régler payé avec sur un reçu vocal',
      'la voix n’a pas choisi ma carte',
      'c’est quoi Prélevé sur sur la page voix',
      'pourquoi il n’y a pas de ligne Payé avec sur la page voix',
      'payé avec apple pay à la voix',
      'dire visa ca choisit la carte ?',
      'choisir la carte pour une saisie vocale',
      'payé depuis mon compte bancaire par la voix',
    ],
    answer:
      'Dire la carte ne la choisit pas. Skip entend « on my Amex » ou « with Apple Pay » et sait que ce n’est pas le magasin, mais c’est toi qui choisis la carte :\n\n' +
      '1. Sur la page de vérification, touche **Payé avec** (**Prélevé sur** pour un abonnement).\n' +
      '2. Choisis la carte ou le compte bancaire et touche **Terminé**.\n\n' +
      'Si tu la laisses vide, l’entrée s’enregistre sans carte ni compte, donc elle ne touche aucun solde de carte ou de compte. La ligne n’apparaît que lorsque tu as au moins une carte ou un compte sous **Cartes**.',
    keywords: ['Payé avec', 'Prélevé sur', 'carte', 'Apple Pay'],
  },

  // Voix : messages et problèmes

  {
    id: 'voice.multiple',
    title: 'Pourquoi ça dit « On dirait qu’il y en a plusieurs » ?',
    questions: [
      'netflix et spotify ensemble à la voix',
      'Ça veut dire quoi "On dirait qu’il y en a plusieurs" ?',
      'je peux ajouter deux choses à la fois par la voix',
      'j’ai dit netflix et spotify et ça n’a pas voulu',
      'message ajoute-les un à la fois',
      'la voix n’accepte pas deux reçus ensemble',
      'je peux lister toutes mes factures d’un coup',
      'j’ai dit loyer et électricité ensemble',
      'plusieurs elements a la voix',
      'pourquoi je ne peux pas dire deux achats',
      'deux entrées dans une seule phrase',
    ],
    answer:
      'Skip a entendu deux choses distinctes d’un coup, comme « Netflix 15.99 and Spotify 11.99 » ou « $12 at Starbucks and $40 at Target ». Une page de vérification contient une seule entrée, alors rien n’est gardé et la page dit « On dirait qu’il y en a plusieurs. Ajoute-les un à la fois. »\n\n' +
      'Maintiens le micro et dis seulement la première, enregistre-la, puis touche de nouveau le bouton de la voix pour la suivante.\n\n' +
      'Une correction comme « forty, no, fifty », ou le fait de nommer la carte avec laquelle tu as payé, reste une seule entrée.',
    keywords: ['On dirait qu’il y en a plusieurs', 'un à la fois', 'deux', 'plusieurs'],
  },
  {
    id: 'voice.nothing-heard',
    title: 'Pourquoi ça dit « Maintiens le bouton enfoncé… » ?',
    questions: [
      'ça veut dire quoi "Maintiens le bouton enfoncé pendant que tu parles" ?',
      'Skip n’a rien entendu',
      'j’ai touché le micro et rien ne s’est passé',
      'le micro s’arrête dès que je lâche',
      'rien ne s’affiche quand je parle',
      'ça dit juste J’écoute et rien n’apparaît',
      'la voix capte pas mes mots',
      'je dois garder le doigt sur le micro ?',
      'ça a arrêté d’écouter tout de suite',
      'mes mots n’apparaissent pas sur la page voix',
    ],
    answer:
      'Cela veut dire que Skip n’a reçu aucun mot. En général, le micro a été touché au lieu d’être maintenu, ou tu as relâché avant de parler.\n\n' +
      '1. Appuie sur le micro et garde le doigt dessus.\n' +
      '2. Attends un instant que **J’écoute…** s’affiche, puis parle.\n' +
      '3. Relâche seulement quand tu as fini.\n\n' +
      'Ton doigt peut glisser hors du bouton pendant que tu parles. Seul le fait de le lever met fin à l’enregistrement. Si **J’écoute…** reste affiché et qu’aucun mot n’apparaît, va dans un endroit plus calme, rapproche le téléphone, et assure-toi que rien d’autre n’utilise le microphone, comme un appel.',
    keywords: ['Maintiens pour parler', 'J’écoute', 'rien entendu', 'toucher ou maintenir'],
  },
  {
    id: 'voice.mishears',
    title: 'La voix comprend mal ce que je dis',
    questions: [
      'la voix se trompe tout le temps dans mes mots',
      'Skip ne comprend pas mon accent',
      'la reconnaissance vocale est nulle',
      'pourquoi elle entend les mauvais mots',
      'elle écrit n’importe quoi quand je parle',
      'la saisie vocale est imprécise',
      'elle ma encore mal compris',
      'comment améliorer ce que le micro entend',
      'la voix marche avec du bruit de fond ?',
      'elle ne capte jamais les noms de mes magasins',
    ],
    answer:
      'Skip transforme ta voix en mots grâce à la reconnaissance vocale d’Apple, à l’écoute de l’anglais américain, puis lit ces mots sur ton téléphone. Quelques gestes aident :\n\n' +
      '- Parle dans un endroit calme, près du téléphone.\n' +
      '- Dis les noms clairement, et mets « at » devant un commerce que Skip pourrait ne pas connaître : « at Joe’s Diner ».\n' +
      '- Dis l’argent comme « $12.50 » ou « twelve dollars fifty ».\n' +
      '- Corrige les erreurs sur la page de vérification. Quand Skip a dû deviner un nom, elle mémorise ta correction.\n' +
      '- Les casques Bluetooth, comme les AirPods, fonctionnent aussi.\n\n' +
      'Skip aide la reconnaissance d’Apple en lui transmettant une liste de noms de magasins et de services, en commençant par ceux que tu utilises déjà, si bien que tes endroits habituels deviennent plus faciles avec le temps. Tu peux toujours ajouter à la main avec **Ajout rapide** sur **Accueil**.',
    keywords: ['mal compris', 'accent', 'mauvais mots', 'précision'],
  },
  {
    id: 'voice.permissions.first',
    title: 'Pourquoi la voix demande une permission ?',
    questions: [
      'pourquoi Skip veut mon microphone',
      'la permission de reconnaissance vocale sert à quoi',
      'le premier appui a juste affiché une fenêtre',
      'Tout est prêt, maintiens pour parler, et ensuite',
      'Skip a besoin de l’accès au microphone ?',
      'deux fenêtres de permission quand j’ai touché le micro',
      'je dois autoriser la reconnaissance vocale pour Skip Budget ?',
      'pourquoi rien n’a enregistré la première fois',
      'c’est sécuritaire d’autoriser le microphone',
      'permission micro skip',
    ],
    answer:
      'La voix a besoin de deux choses de ton iPhone : le **Microphone**, pour t’entendre, et la **Reconnaissance vocale**, pour transformer ce que tu dis en mots.\n\n' +
      'La première fois que tu appuies sur le micro, l’iPhone demande les deux, et cet appui ne fait que demander. Rien n’est jamais enregistré derrière les fenêtres. Une fois les deux autorisés, la page dit « Tout est prêt. Maintiens pour parler. » Appuie et maintiens de nouveau pour commencer.\n\n' +
      'Skip n’utilise le microphone que pendant que tu maintiens le bouton sur **Enregistrer une transaction**. Elle ne l’ouvre jamais d’elle-même, ni à l’ouverture de la page ni quand tu y reviens.',
    keywords: ['permission', 'microphone', 'Reconnaissance vocale', 'autoriser'],
  },
  {
    id: 'voice.permissions.denied',
    title: 'Le microphone ou la reconnaissance vocale est désactivé',
    questions: [
      'ça dit d’activer Microphone et Reconnaissance vocale',
      'j’ai dit non au microphone, comment réparer',
      'la voix dit Ouvrir Réglages',
      'comment autoriser le microphone pour skip budget',
      'j’ai refusé la reconnaissance vocale par erreur',
      'où activer le micro pour skip',
      'permission du microphone désactivée',
      'voix bloquee dans les reglages',
      'Le microphone ou la reconnaissance vocale est désactivé',
      'j’ai coupé le micro pour skip, comment annuler',
    ],
    answer:
      'Une fois que tu as dit non, seuls les Réglages de ton iPhone peuvent le réactiver :\n\n' +
      '1. Sur la page de la voix, touche **Ouvrir Réglages**. Tu arrives directement dans les réglages de Skip Budget.\n' +
      '2. Active **Microphone** et **Reconnaissance vocale**.\n' +
      '3. Reviens dans Skip. La page revérifie d’elle-même, alors tu peux maintenir le micro et parler.\n\n' +
      'Tu peux aussi ouvrir l’app **Réglages** de l’iPhone et descendre jusqu’à **Skip Budget**. La saisie au clavier fonctionne tout ce temps.',
    keywords: [
      'Ouvrir Réglages',
      'permission refusée',
      'microphone désactivé',
      'reconnaissance vocale désactivée',
    ],
  },
  {
    id: 'voice.unavailable',
    title: 'La voix n’est pas disponible sur cet iPhone',
    questions: [
      'Pourquoi ça dit Voix n’est pas disponible sur cet iPhone pour le moment ?',
      'voix non disponible',
      'la page voix dit ajoute-le à la main',
      'la voix ne marche pas sur mon téléphone',
      'faut-il la dictée pour la voix de skip',
      'voix indisponible sans internet',
      'mon iphone dit que la voix n’est pas disponible',
      'pourquoi il y a des boutons Reçu Facture Abonnement sur la page voix',
      'la voix ne fonctionne plus du tout',
      'je ne peux pas utiliser la voix sur mon vieil iphone',
    ],
    answer:
      'La reconnaissance vocale d’Apple n’est pas prête sur ton iPhone en ce moment. Les raisons habituelles :\n\n' +
      '- **La dictée est désactivée.** Active-la dans **Réglages → Général → Clavier → Activer la dictée** sur l’iPhone.\n' +
      '- **Pas d’internet**, sur un téléphone qui ne peut pas reconnaître la voix directement sur l’appareil. Connecte-toi et réessaie.\n\n' +
      'En attendant, la page propose **Ajoute-le à la main**, avec des boutons **Reçu**, **Facture** et **Abonnement** qui ouvrent les formulaires habituels. Revenir en arrière ou enregistrer depuis l’un d’eux te ramène là où tu étais, pas au micro.',
    keywords: ['pas disponible', 'indisponible', 'Ajoute-le à la main', 'dictée'],
  },
  {
    id: 'voice.error',
    title: 'La voix dit qu’une erreur est survenue',
    questions: [
      'la page voix dit Une erreur est survenue',
      'erreur sur la page enregistrer une transaction',
      'la voix a échoué',
      'la page de vérification ne s’enregistre pas, erreur',
      'erreur quand j’ai relâché le micro',
      'la voix a planté',
      'ça a dit erreur quand j’ai enregistré mon reçu vocal',
      'message d’erreur de la voix',
      'une erreur est survenue après que j’ai parlé',
      'la voix n’arrête pas d’échouer',
    ],
    answer:
      'Deux moments différents peuvent afficher « Une erreur est survenue. Réessaie. » :\n\n' +
      '- **Sur la page du micro**, l’enregistrement lui-même n’a pas fonctionné. Maintiens le micro et redis-le. Si ça continue, ferme Skip complètement et rouvre-la.\n' +
      '- **Sur la page de vérification, au-dessus d’Enregistrer**, l’enregistrement n’a pas atteint ton compte, le plus souvent à cause de la connexion. Tout ce que tu as réglé est toujours là. Vérifie que tu es en ligne et touche **Enregistrer** de nouveau.\n\n' +
      'Un seul appui sur **Enregistrer** crée une seule entrée, alors réessayer ne l’ajoutera pas deux fois. Si ça ne fonctionne jamais, dis-le-nous dans **Réglages → Assistance et commentaires → Écrire à l’assistance**.',
    keywords: ['erreur', 'échec', 'Une erreur est survenue', 'erreur vocale'],
  },
  {
    id: 'voice.stale',
    title: 'Que veut dire « Rien à vérifier pour l’instant » ?',
    questions: [
      'Que veut dire Rien à vérifier pour l’instant ?',
      'la page voix dit dis ce que tu veux ajouter et Skip l’affichera ici',
      'bouton Recommencer sur la voix',
      'ma saisie vocale a disparu avant l’enregistrement',
      'la page de vérification vocale est vide',
      'la page de vérification a perdu mes mots',
      'page voix vide',
      'ça a ouvert une page avec rien à vérifier',
      'brouillon vocal disparu',
      'c’est quoi le bouton Recommencer sur la voix',
    ],
    answer:
      'La page de vérification s’est ouverte sans rien derrière. Cela arrive quand l’entrée a déjà été enregistrée ou annulée, quand tu reviens sur une ancienne page de la voix, ou quand Skip a redessiné ses pages, par exemple après un changement de taille du texte.\n\n' +
      'Touche **Recommencer** pour retourner au micro et le redire. Rien de la tentative perdue n’a été enregistré, sauf si tu avais déjà touché **Enregistrer**.',
    keywords: ['Rien à vérifier pour l’instant', 'Recommencer', 'vide', 'perdu'],
  },
  {
    id: 'voice.offline',
    title: 'La voix fonctionne-t-elle sans internet ?',
    questions: [
      'voix sans wifi',
      'je peux utiliser la voix hors ligne',
      'voix en mode avion',
      'pas de signal saisie vocale',
      'la voix a besoin du wifi ?',
      'la voix ne s’enregistre pas sans internet',
      'enregistrer une transaction hors ligne',
      'la voix sur l’appareil marche hors ligne ?',
      'voix sans connexion de données',
      'la voix a besoin d’internet ?',
      'enregistrer une saisie vocale plus tard une fois en ligne',
    ],
    answer:
      'En partie. Beaucoup d’iPhone peuvent transformer la voix en mots directement sur l’appareil, donc le micro peut fonctionner sans internet. Les téléphones qui ne le peuvent pas affichent « Voix n’est pas disponible sur cet iPhone pour le moment. » jusqu’à ce que tu sois de nouveau en ligne.\n\n' +
      'Enregistrer demande toujours une connexion, puisque les entrées sont conservées dans ton compte. Sans connexion, **Enregistrer** affiche « Une erreur est survenue. Réessaie. » et garde tout ce que tu as réglé, alors tu peux retoucher **Enregistrer** une fois en ligne. Rien n’est gardé pour être envoyé plus tard.\n\n' +
      'Hors ligne, Skip peut aussi rater des noms de magasins qu’elle connaît d’habitude.',
    keywords: ['hors ligne', 'sans internet', 'mode avion', 'wifi'],
  },

  // Voix : confidentialité, langues, forfaits, accessibilité

  {
    id: 'voice.on-device',
    title: 'Ma voix est-elle traitée sur mon téléphone ou par Apple ?',
    questions: [
      'ma voix va chez apple ?',
      'Ma voix quitte-t-elle mon téléphone ?',
      'la reconnaissance vocale se fait sur l’appareil ?',
      'apple entend ce que je dis dans skip',
      'où va ce que je dis',
      'la saisie vocale est-elle privée',
      'Skip envoie ma voix à un serveur ?',
      'reconnaissance vocale sur l’appareil skip',
      'serveurs d’Apple et confidentialité de la voix',
      'qui écoute mes saisies vocales',
      'Skip utilise un service tiers pour la voix',
      'ma voix est envoyée par internet ?',
    ],
    answer:
      'Tes paroles sont transformées en texte par la reconnaissance vocale d’Apple, intégrée à l’iPhone. Skip n’utilise aucun autre service vocal et n’a pas de serveur vocal à elle.\n\n' +
      '- Quand ton iPhone peut reconnaître la voix directement sur l’appareil, ta voix reste sur le téléphone.\n' +
      '- Quand il ne le peut pas, l’audio est envoyé au service vocal d’Apple pour être transformé en texte, selon les conditions de confidentialité d’Apple.\n' +
      '- Skip lit ensuite ce texte sur ton téléphone avec de simples règles, pas de l’IA, pour trouver le montant, le nom et la date.\n\n' +
      'Seuls les détails que tu vérifies et enregistres vont dans ton compte. Skip ne garde jamais l’audio.',
    keywords: ['sur l’appareil', 'Apple', 'reconnaissance vocale', 'confidentialité'],
  },
  {
    id: 'voice.recording-stored',
    title: 'Ma voix est-elle enregistrée ou conservée ?',
    questions: [
      'ma voix est-elle enregistrée',
      'la saisie vocale garde un enregistrement de moi ?',
      'Skip enregistre ma voix ?',
      'mes enregistrements vocaux sont sauvegardés ?',
      'Skip garde ce que j’ai dit',
      'l’audio est stocké quelque part',
      'quelqu’un peut écouter mes saisies vocales plus tard',
      'Skip enregistre la transcription',
      'ma voix est stockée sur vos serveurs',
      'mes paroles sont enregistrées avec le reçu',
      'supprimer mes enregistrements vocaux',
      'donnees vocales stockees ?',
    ],
    answer:
      'Non. Skip n’enregistre ni ne conserve jamais l’audio, ni sur ton téléphone ni sur nos serveurs, alors il n’y a aucun enregistrement à supprimer.\n\n' +
      'Tant que tu es sur la page de vérification, les mots que tu as dits ne vivent que dans la mémoire de l’app, ce qui te permet de les voir sous **Tu as dit**. Ils sont effacés quand tu enregistres, annules ou te déconnectes. Le reçu, la facture ou l’abonnement enregistré ne contient que ses détails, comme le montant, le nom et la date, exactement comme si tu les avais saisis au clavier.\n\n' +
      'La seule chose que la voix conserve est la liste des corrections de noms que tu as faites, comme « spot a fly » qui veut dire Spotify. Elle reste sur ce téléphone et est effacée quand tu te déconnectes.',
    keywords: ['enregistrement', 'audio', 'transcription', 'conservé'],
  },
  {
    id: 'voice.languages',
    title: 'Quelles langues la voix comprend-elle ?',
    questions: [
      'je peux parler à skip en espagnol ?',
      'la voix marche en français ?',
      'quelle langue la voix comprend',
      'la voix dans d’autres langues',
      'mon app est en français mais la voix veut de l’anglais',
      'la voix comprend un accent britannique',
      'je peux dire pounds au lieu de dollars',
      'la voix seulement en anglais ?',
      'pourquoi les exemples de la voix sont en anglais',
      'puedo hablar en español con skip',
      'la voix fonctionne si mon téléphone est dans une autre langue',
      'je parle français à la voix, ça marche ?',
    ],
    answer:
      'La voix ne comprend que l’anglais parlé, même quand Skip est réglée sur **Español** ou **Français**. Dans ces langues, la page de la voix le dit au-dessus des exemples, et les exemples restent en anglais.\n\n' +
      'Tous les accents sont acceptés. Skip écoute de l’anglais américain, alors les mots et les orthographes américains fonctionnent le mieux. Les montants s’enregistrent dans la devise que Skip affiche, donc « 20 pounds » et « $20 » s’enregistrent tous les deux comme 20.\n\n' +
      'Tout le reste de Skip fonctionne en anglais, en espagnol et en français.',
    keywords: ['langue', 'espagnol', 'français', 'anglais seulement'],
  },
  {
    id: 'voice.pro.rules',
    title: 'La saisie vocale est-elle gratuite ou Pro ?',
    questions: [
      'la saisie vocale fait partie de Skip Pro ?',
      'pourquoi il faut Pro pour la voix',
      'les utilisateurs gratuits peuvent utiliser le microphone',
      'la voix avec le forfait gratuit',
      'combien de saisies vocales j’ai droit',
      'la voix compte dans mes 15 numérisations',
      'y a-t-il une limite de saisies vocales avec Pro',
      'la voix est verrouillee',
      'c’est quoi la page Dis-le simplement',
      'comment débloquer la saisie vocale',
    ],
    answer:
      'La saisie vocale fait partie de Skip Pro.\n\n' +
      '- Avec le forfait gratuit, le bouton rond de la voix affiche un badge **PRO**. Le toucher ouvre **Dis-le simplement**, une page qui présente ce que la voix peut faire, avec **Obtenir Skip Pro** et **Pas maintenant**.\n' +
      '- Avec Pro, il n’y a pas de limite. Ajoute autant de reçus, de factures et d’abonnements que tu veux par la voix.\n' +
      '- Les reçus vocaux n’utilisent pas la limite mensuelle de numérisations ou d’imports. Celle-ci ne compte que les reçus lus avec la caméra, ou à partir d’une photo ou d’un fichier.\n\n' +
      'Ajouter des choses au clavier est gratuit avec tous les forfaits.',
    keywords: ['Pro', 'gratuit', 'verrouillé', 'Dis-le simplement'],
  },
  {
    id: 'voice.pro.ended',
    title: 'Que deviennent mes saisies vocales si Pro prend fin ?',
    questions: [
      'j’ai annulé Pro, qu’advient-il de mes saisies vocales',
      'Si j’annule Pro, mes saisies vocales restent ?',
      'reçus vocaux après la fin de mon essai',
      'pro expiré, qu’arrive-t-il à ce que j’ai ajouté par la voix',
      'je peux encore modifier mes factures vocales sans pro',
      'le bouton voix a de nouveau un badge pro',
      'ma page voix m’envoie vers pro maintenant',
      'j’ai perdu la voix après la fin de pro',
      'annuler pro supprime les reçus vocaux ?',
      'la voix ne marche plus depuis la fin de mon abonnement',
      'rétrogradé et la voix a disparu',
    ],
    answer:
      'Tout ce que tu as enregistré par la voix reste. C’est un reçu, une facture ou un abonnement ordinaire, et tu peux l’ouvrir, le modifier ou le supprimer avec n’importe quel forfait. Comme pour tout le reste avec le forfait gratuit, les listes affichent les 90 derniers jours, et les entrées plus anciennes sont gardées hors de vue.\n\n' +
      'Ce qui change, c’est l’ajout de nouvelles entrées par la voix. Le bouton rond affiche de nouveau le badge **PRO** et ouvre la page Pro au lieu du micro. Si Pro prend fin pendant que tu es à mi-chemin d’une saisie vocale, Skip affiche plutôt la page Pro, et rien n’est enregistré.\n\n' +
      'Tes corrections de noms restent sur le téléphone, prêtes si tu reviens à Pro.',
    keywords: ['Pro terminé', 'annulé', 'expiré', 'essai terminé'],
  },
  {
    id: 'voice.voiceover',
    title: 'Puis-je utiliser la saisie vocale avec VoiceOver ?',
    questions: [
      'comment utiliser la voix avec VoiceOver activé',
      'voiceover maintenir pour parler ne marche pas',
      'utilisateur aveugle saisie vocale',
      'double toucher pour commencer à parler',
      'Touche pour parler au lieu de maintenir',
      'la voix marche avec un lecteur d’écran',
      'voiceover lit J’écoute',
      'accessibilité saisie vocale',
      'je ne peux pas maintenir le micro avec voiceover',
      'Touche quand tu as fini, c’est quoi',
    ],
    answer:
      'Oui. Avec VoiceOver activé, tu n’as pas besoin de maintenir le bouton :\n\n' +
      '1. Touche deux fois **Dicter** pour commencer. VoiceOver dit d’abord « J’écoute », et le micro ne s’ouvre qu’une fois qu’il a fini de parler, pour que sa voix ne soit pas transcrite.\n' +
      '2. Parle.\n' +
      '3. Touche deux fois de nouveau quand tu as fini. VoiceOver dit « Arrêté ».\n\n' +
      'Les mots sous le bouton deviennent **Touche pour parler** et **Touche quand tu as fini**. Sur la page de vérification, VoiceOver se pose d’abord sur la question, **C’est bien ça ?**, et chaque ligne lit son nom et sa valeur.',
    keywords: ['VoiceOver', 'lecteur d’écran', 'accessibilité', 'toucher deux fois'],
  },
  {
    id: 'voice.cant-add',
    title: 'Que ne puis-je pas ajouter avec la voix ?',
    questions: [
      'je peux ajouter mon salaire par la voix ?',
      'voix pour les cartes de crédit',
      'j’ai dit j’ai été payé et ça a fait un reçu',
      'la voix peut supprimer quelque chose',
      'ajouter de l’épargne par la voix',
      'je peux modifier une facture avec ma voix',
      'quels types fonctionnent avec la voix',
      'paie par la voix',
      'la voix fait seulement trois choses ?',
      'ajouter une habitude par la voix',
      'je peux ajouter un objectif en parlant',
    ],
    answer:
      'La voix ajoute trois choses : des reçus, des factures et des abonnements. Elle ne peut pas ajouter de paie, de cartes, de comptes bancaires, de prêts, d’habitudes, d’épargne ni d’objectifs, et elle ne peut pas modifier ni supprimer ce qui est déjà enregistré.\n\n' +
      'Si tu dis « got my paycheck 3,700 », Skip ne sait pas que c’est de la paie. Elle affiche un reçu qu’elle a deviné : touche le **X** pour le fermer, et ajoute plutôt ta paie sous **Cartes → Salaire**.\n\n' +
      'Si tu aimerais que la voix en fasse plus, envoie-le dans **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['salaire', 'paie', 'cartes', 'prêts'],
  },

  // Confidentialité et tes données

  {
    id: 'privacy.stored.what',
    title: 'Que garde Skip à mon sujet ?',
    questions: [
      'quelles données Skip collecte ?',
      'quelles informations gardez-vous sur moi',
      'qu’est-ce que skip sait de moi',
      'quelles données personnelles sont stockées',
      'qu’est-ce que vous enregistrez de mon compte',
      'liste de mes données chez skip',
      'skip collecte mon courriel ?',
      'vous gardez mon nom ?',
      'qu’y a-t-il dans mon compte skip',
      'données collectées par skip budget',
      'quelles infos sont gardées quand je m’inscris',
      'skip garde mon fuseau horaire ?',
    ],
    answer:
      'Seulement ce que tu y mets, plus ce qui est nécessaire pour faire fonctionner ton compte :\n\n- **Ton compte** : ton adresse courriel, ou l’identifiant de connexion que nous donne Apple ou Google si tu les utilises.\n- **Ton profil** : le nom d’affichage et l’image que tu choisis parmi celles de Skip, ainsi que le fuseau horaire de ton téléphone, pour que les dates et les rappels suivent ta journée.\n- **Ton argent** : les factures, abonnements, reçus, prêts, paie, épargne, objectifs, habitudes et paiements de carte que tu saisis, ainsi que l’historique des prélèvements de tes factures et de tes abonnements.\n- **Tes cartes et tes comptes** : le nom que tu leur donnes, le réseau ou la banque, une couleur, un solde que tu saisis, un jour d’échéance et, au plus, les quatre derniers chiffres.\n- **Tes réglages** : tes rappels, le fait que tu aies Skip Pro ou non et, si tu actives les rappels, l’adresse de notification de ton téléphone pour qu’ils puissent l’atteindre.\n\nSkip ne demande jamais de numéro de carte complet, de date d’expiration, de code de sécurité ni d’identifiants bancaires. Tu trouveras plus de détails dans **Réglages → À propos → Politique de confidentialité**.',
    keywords: ['données', 'collecte', 'renseignements personnels', 'politique de confidentialité'],
  },
  {
    id: 'privacy.stored.where',
    title: 'Où sont gardées mes données ?',
    questions: [
      'où mes données sont stockées',
      'Mes données sont sur mon téléphone ou dans le nuage ?',
      'où Skip garde mes informations',
      'Skip sauvegarde mes données ?',
      'mon budget est enregistré en ligne',
      'si je perds mon téléphone je perds tout',
      'mes données sont gardées sur le serveur',
      'Skip utilise iCloud',
      'où sont stockées mes entrées',
      'y a-t-il quelque chose de sauvegardé sur le téléphone lui-même',
      'stockage dans le nuage skip',
    ],
    answer:
      'Tes entrées sont conservées dans ton compte Skip, sur notre serveur, et pas seulement sur le téléphone. C’est pourquoi elles reviennent quand tu te connectes sur un nouveau téléphone, et pourquoi tes téléphones affichent la même chose.\n\nQuelques éléments appartiennent au téléphone et y restent : l’apparence, la langue, le retour haptique et le verrouillage de l’app, tes corrections de noms de la voix, et la liste des magasins que Skip retient pour toi.\n\nSkip ne garde pas tes entrées dans iCloud. Si tu perds ton téléphone, connecte-toi sur le nouveau et tout est là.',
    keywords: ['nuage', 'serveur', 'sauvegarde', 'iCloud'],
  },
  {
    id: 'privacy.phone-only',
    title: 'Qu’est-ce qui ne quitte jamais mon téléphone ?',
    questions: [
      'qu’est-ce qui reste seulement sur mon téléphone',
      'qu’est-ce qui ne va pas sur votre serveur',
      'la numérisation se fait sur le téléphone ?',
      'quelles données ne sont jamais téléversées',
      'donnees locales seulement',
      'les données de Face ID sont envoyées à skip',
      'skip voit mon face id',
      'qu’est-ce qui est gardé sur l’appareil',
      'quelles données restent privées sur mon iphone',
      'traitement sur l’appareil skip',
    ],
    answer:
      'Ceci reste sur ton iPhone et ne nous est jamais envoyé :\n\n- **Les photos de reçus.** Les numérisations et les imports sont lus sur le téléphone par la reconnaissance de texte d’Apple. L’image n’est pas téléversée ; Skip n’enregistre que les détails que tu confirmes.\n- **Ta voix**, quand ton iPhone peut reconnaître la voix directement sur l’appareil.\n- **Les réglages d’apparence, de retour haptique et de verrouillage de l’app**, et ton choix de langue.\n- **Les corrections de noms de la voix** et la liste des magasins que Skip retient pour toi. Les reçus eux-mêmes, noms de magasins compris, sont enregistrés dans ton compte.\n- **Face ID.** Le verrouillage de l’app demande à l’iPhone de vérifier que c’est toi. Skip ne voit jamais tes données faciales.\n\nParce qu’elles vivent sur le téléphone, elles ne passent pas sur un nouveau.',
    keywords: ['sur l’appareil', 'local', 'jamais téléversé', 'Face ID'],
  },
  {
    id: 'privacy.bank',
    title: 'Skip a-t-elle besoin de mon accès bancaire ou de ma carte ?',
    questions: [
      'je dois donner mon mot de passe bancaire à skip',
      'skip demande mon numéro de carte',
      'elle garde mon numéro de carte complet',
      'skip peut déplacer de l’argent de mon compte',
      'vous avez besoin de mes identifiants de banque en ligne',
      'pourquoi seulement les quatre derniers chiffres',
      'skip voit mes transactions bancaires',
      'mon compte bancaire est lié à skip',
      'skip va-t-elle prélever de l’argent',
      'skip a accès à ma banque',
      'code de securite carte skip',
    ],
    answer:
      'Non. Skip ne demande jamais, et ne conserve jamais, d’identifiants bancaires, de numéro de carte complet, de date d’expiration ni de code de sécurité. Au plus, elle garde les quatre derniers chiffres d’une carte, pour que tu puisses distinguer tes cartes.\n\n' +
      'Skip ne se connecte pas du tout à ta banque. Elle ne peut pas voir les transactions de ta banque, et elle ne peut pas déplacer, retenir, envoyer ni recevoir d’argent. Tout ce qu’elle contient, c’est ce que tu lui as dit, en le saisissant, en numérisant un reçu ou en le disant.\n\n' +
      'Le seul paiement auquel Skip participe est Skip Pro, et c’est Apple qui s’en occupe.',
    keywords: ['identifiants bancaires', 'mot de passe', 'numéro de carte', 'code de sécurité'],
  },
  {
    id: 'privacy.who-sees',
    title: 'Qui peut voir mes données ?',
    questions: [
      'qui peut voir mes affaires',
      'quelqu’un d’autre peut voir mon budget ?',
      'qui a accès à mes informations',
      'd’autres utilisateurs voient mes reçus',
      'mes données sont partagées avec quelqu’un',
      'qui traite mes données',
      'skip partage avec des tiers',
      'services tiers que skip utilise',
      'mes données sont privées',
      'quelles entreprises reçoivent mes données',
      'd’autres personnes voient mes dépenses',
    ],
    answer:
      'Tes entrées ne sont montrées qu’à toi, une fois ta session ouverte dans ton compte. Les autres utilisateurs de Skip ne peuvent jamais les voir.\n\nPour fonctionner, Skip utilise quelques services qui traitent des données en notre nom et qui n’ont pas le droit de s’en servir pour autre chose :\n- Un service d’hébergement qui conserve ton compte et gère la connexion.\n- Apple ou Google, seulement si tu te connectes avec eux, pour confirmer que c’est toi.\n- Un service de courriel, pour envoyer tes codes de connexion et les messages que tu nous écris.\n- Apple et un service d’abonnement, pour vendre Skip Pro et vérifier si ton compte l’a.\n- Un service de rapports de plantage, qui reçoit des rapports sur ce que faisait l’app, pas sur ce que contient ton budget.\n- Le service de notifications d’Apple, pour livrer les rappels que tu actives.\n- Le service vocal d’Apple, seulement pour la voix quand ton iPhone ne peut pas la traiter directement sur l’appareil.\n\nSkip ne vend pas tes données et ne les partage pas à des fins publicitaires.',
    keywords: ['qui voit', 'tiers', 'partagé', 'fournisseurs de services'],
  },
  {
    id: 'privacy.selling',
    title: 'Skip vend-elle mes données ou me suit-elle ?',
    questions: [
      'vous vendez des données',
      'Skip va-t-elle un jour vendre mes informations ?',
      'vous me suivez',
      'skip utilise des outils d’analyse',
      'mes infos vont être vendues à des annonceurs',
      'skip est gratuite parce qu’elle vend des données',
      'skip suit ce que je fais dans l’app',
      'pistage skip budget',
      'vous partagez des données avec facebook ou google pour la pub',
      'comment skip fait de l’argent',
      'mes données sont-elles un produit',
    ],
    answer:
      'Non. Skip ne vend pas tes données, ne les partage pas à des fins publicitaires, et n’a aucune publicité. Il n’y a pas non plus d’outil d’analyse tiers, seulement des rapports de plantage qui aident à corriger les défauts.\n\nSkip est financée par Skip Pro, qui coûte {proMonthly} par mois ou {proYearly} par an, facturés par Apple. Il y a aussi un pourboire volontaire, **Offre un café à l’équipe**, dans **Réglages**.',
    keywords: ['vendre', 'pistage', 'analyse', 'annonceurs'],
  },
  {
    id: 'privacy.crash-reports',
    title: 'Que contient un rapport de plantage ?',
    questions: [
      'qu’est-ce que les rapports de plantage envoient',
      'un plantage envoie mon budget chez vous',
      'confidentialité des rapports d’erreur',
      'je peux désactiver les rapports de plantage',
      'quand l’app plante, des données sont envoyées',
      'vous voyez mes montants quand skip a une erreur',
      'diagnostics envoyés par skip',
      'mon courriel est dans les rapports de plantage',
      'skip enregistre ce que je fais',
      'quelles informations accompagnent une erreur',
    ],
    answer:
      'Quand quelque chose ne va pas, Skip envoie un rapport pour que le défaut puisse être trouvé et corrigé. Il décrit ce que faisait l’app, pas ce que contient ton budget, et Skip est configurée pour ne pas y joindre de détails personnels.\n\n' +
      'Il n’y a pas d’interrupteur pour ça dans l’app. Les rapports ne viennent que de la version de Skip que tu télécharges, et seulement quand quelque chose échoue ou plante.',
    keywords: ['rapport de plantage', 'rapport d’erreur', 'diagnostics', 'journaux'],
  },
  {
    id: 'privacy.ai',
    title: 'Skip envoie-t-elle mes données à une IA ?',
    questions: [
      'skip utilise de l’ia',
      'Skip utilise-t-elle l’IA pour lire mes reçus ?',
      'la saisie vocale c’est de l’IA',
      'chatgpt voit mes données',
      'mes infos sont envoyées à une intelligence artificielle',
      'apprentissage automatique skip',
      'skip utilise l’intelligence artificielle',
      'skip envoie mes reçus à une ia',
      'le scanner de reçus c’est de l’IA',
      'mes données servent à entraîner une IA',
      'skip a un chatbot ia',
    ],
    answer:
      'Aucun service d’IA ne voit tes données. Skip utilise des fonctions intégrées à ton iPhone et de simples règles à elle :\n\n' +
      '- **Numérisation** : la reconnaissance de texte d’Apple sur l’appareil lit le reçu, puis les règles de Skip repèrent le magasin, le total et la date.\n' +
      '- **Voix** : la reconnaissance vocale d’Apple transforme tes paroles en texte, puis les règles de Skip, sur ton téléphone, trouvent le montant, le nom et la date.\n' +
      '- **Sam**, c’est moi, associe ta question à des réponses écrites par l’équipe de Skip. Je ne suis pas de l’IA non plus.\n\n' +
      'Tes données ne servent pas à entraîner quoi que ce soit.',
    keywords: ['IA', 'intelligence artificielle', 'apprentissage automatique', 'entraîner'],
  },
  {
    id: 'privacy.retention',
    title: 'Combien de temps Skip garde-t-elle mes données ?',
    questions: [
      'combien de temps mes données sont gardées',
      'skip supprime les vieilles données',
      'conservation des données skip',
      'mes vieux reçus seront supprimés après quelques années',
      'jusqu’où skip garde les transactions',
      'mon historique est gardé pour toujours',
      'sept ans de données skip',
      'vieilles factures supprimées automatiquement',
      'quand skip supprime mon historique',
      'les anciens prélèvements sont retirés',
    ],
    answer:
      'La politique de confidentialité de Skip fixe deux règles :\n\n' +
      '- **Ce qui s’est produit**, comme les reçus, les prélèvements enregistrés et les paiements de carte, est conservé sept ans, puis retiré jour après jour à mesure que chaque élément dépasse cet âge.\n' +
      '- **Ce qui est toujours en cours**, comme les factures, abonnements, cartes, comptes et salaires, est conservé jusqu’à ce que tu les supprimes.\n\n' +
      'Jusqu’où tu peux remonter est une question distincte. Le forfait gratuit affiche les 90 derniers jours, et les entrées plus anciennes sont gardées hors de vue, pas supprimées. Skip Pro en affiche jusqu’à 7 ans.',
    keywords: ['conservation', 'combien de temps', 'sept ans', 'anciennes données'],
  },
  {
    id: 'privacy.delete-account',
    title: 'Comment supprimer mon compte ?',
    questions: [
      'Comment supprimer mon compte Skip ?',
      'supprimer le compte',
      'effacer toutes mes données de skip',
      'je veux fermer mon compte et tout effacer',
      'je veux tout supprimer',
      'où est supprimer le compte',
      'comment effacer mes données skip',
      'supprimer skip définitivement',
      'supprimer mon profil',
      'effacer mon compte',
      'je ne veux plus utiliser skip, comment retirer mes infos',
      'ça veut dire quoi Tout supprimer pour de bon',
      'Cela supprime 2 cartes, 5 factures et 40 reçus, tout ce que Skip conserve pour toi. C’est irréversible.',
    ],
    answer:
      'Va dans **Réglages**, descends jusqu’à **Compte**, et touche **Supprimer le compte**.\n\n' +
      '1. **Supprimer ton compte ?** liste ce qui sera supprimé, avec le nombre de tes cartes, comptes, factures, abonnements, reçus et plus encore. Touche **Continuer**, ou **Garder mon compte** pour t’arrêter.\n' +
      '2. **Tout supprimer pour de bon ?** dit « Il n’y a pas de retour en arrière, et aucune copie n’est conservée. » Touche **Tout supprimer**.\n\n' +
      'Ton compte et tout ce qu’il contient sont supprimés aussitôt, et tu reviens à l’écran de bienvenue. Skip efface aussi du téléphone tes corrections de noms de la voix et les magasins que tu as ajoutés.\n\n' +
      'Tu dois être en ligne. Supprimer ton compte n’annule pas Skip Pro : annule-le aussi auprès d’Apple.',
    keywords: ['Supprimer le compte', 'retirer le compte', 'effacer', 'Tout supprimer'],
  },
  {
    id: 'privacy.delete-undo',
    title: 'Puis-je récupérer mon compte après l’avoir supprimé ?',
    questions: [
      'annuler la suppression du compte',
      'Puis-je annuler la suppression de mon compte ?',
      'j’ai supprimé mon compte par erreur',
      'récupérer un compte skip supprimé',
      'y a-t-il un délai de grâce après la suppression',
      'vous gardez une sauvegarde après la suppression',
      'restaurer mes données supprimées',
      'compte skip supprimé, je peux me reconnecter',
      'l’assistance peut-elle ramener mon compte supprimé',
      'dans combien de temps les données supprimées disparaissent',
      'la suppression du compte est-elle définitive',
    ],
    answer:
      'Non. La suppression est immédiate et définitive. Il n’y a pas de délai de grâce et Skip ne garde aucune copie à partir de laquelle restaurer, alors elle ne peut pas être récupérée. C’est pourquoi Skip demande deux fois.\n\n' +
      'Tu peux t’inscrire de nouveau avec le même courriel, ou le même compte Apple ou Google, mais tu repartiras avec un Skip vide.',
    keywords: ['annuler', 'récupérer', 'restaurer', 'délai de grâce'],
  },
  {
    id: 'privacy.reset',
    title: 'Puis-je repartir à zéro sans supprimer mon compte ?',
    questions: [
      'réinitialiser toutes mes données',
      'réinitialiser skip',
      'Comment réinitialiser Skip et recommencer ?',
      'effacer toutes mes données mais garder mon compte',
      'il y a un bouton de réinitialisation',
      'tout effacer et repartir de zéro',
      'supprimer tous mes reçus d’un coup',
      'recommencer mon budget',
      'effacer les données mais garder ma connexion',
      'retirer toutes mes entrées de test',
      'nouveau départ skip',
      'suppression en bloc',
    ],
    answer:
      'Il n’y a ni bouton de réinitialisation ni suppression en bloc. Tu peux :\n\n' +
      '- Supprimer les éléments un à un. Ouvre chaque reçu, facture, abonnement, carte ou compte, touche le crayon, et utilise le bouton de suppression en bas.\n' +
      '- Ou supprimer tout ton compte dans **Réglages → Compte → Supprimer le compte**, puis t’inscrire de nouveau avec le même courriel pour un Skip vide.\n\n' +
      'Si un bouton de réinitialisation t’aiderait, envoie-le comme idée dans **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['réinitialiser', 'recommencer', 'effacer les données', 'suppression en bloc'],
  },
  {
    id: 'privacy.export',
    title: 'Puis-je obtenir une copie de toutes mes données ?',
    questions: [
      'Comment exporter toutes mes données ?',
      'télécharger toutes mes données skip',
      'obtenir une copie de mes informations',
      'demande de données RGPD',
      'emporter mes données dans une autre app',
      'sauvegarder mon budget dans un fichier',
      'exporter tout de skip',
      'je peux télécharger les données de mon compte',
      'portabilité des données skip',
      'je veux toutes mes données dans un fichier',
    ],
    answer:
      'Dans l’app, tu peux exporter les paiements de tes factures et de tes abonnements avec Skip Pro :\n\n' +
      '1. Ouvre **Factures mensuelles** ou **Abonnements** et touche **Voir l’historique des paiements**.\n' +
      '2. Touche **Exporter en CSV ou PDF**, ou le bouton de partage en haut.\n' +
      '3. Choisis **CSV** (pour Numbers, Excel ou Google Sheets) ou **PDF** (un relevé à imprimer ou à envoyer), puis touche **Exporter**.\n\n' +
      'Les reçus, les cartes, la paie et le reste ne peuvent pas être exportés depuis l’app. Pour une copie complète de tes données, écris à **admin@skipapps.net**, comme l’explique la politique de confidentialité, et nous y donnerons suite.',
    keywords: ['exporter', 'télécharger', 'copie', 'RGPD'],
  },
  {
    id: 'privacy.rights',
    title: 'Quels sont mes droits sur mes données ?',
    questions: [
      'je peux voir toutes les données que vous avez sur moi',
      'comment corriger mes données',
      'droits de protection des données skip',
      'm’opposer au traitement',
      'droit à l’oubli skip',
      'qui contacter pour ma vie privée',
      'courriel pour une demande de confidentialité',
      'adresse de contact pour la vie privée',
      'droits rgpd',
      'loi 25 vie privée skip',
    ],
    answer:
      'Tu peux voir dans l’app tout ce que Skip détient à ton sujet, corriger n’importe quel élément en le modifiant, et tout supprimer dans **Réglages → Compte → Supprimer le compte**.\n\n' +
      'Selon l’endroit où tu vis, tu peux aussi avoir le droit d’obtenir une copie de tes données dans un format portable, ou de t’opposer à certains traitements. Écris à **admin@skipapps.net** et nous y donnerons suite. Les détails sont dans **Réglages → À propos → Politique de confidentialité**.',
    keywords: ['droits', 'RGPD', 'corriger', 'contact confidentialité'],
  },
  {
    id: 'privacy.terms',
    title: 'Que disent les conditions d’utilisation ?',
    questions: [
      'les points principaux des conditions',
      'skip c’est du conseil financier ?',
      'à qui appartiennent les données que je saisis',
      'résumé des conditions d’utilisation',
      'skip peut se tromper sur mon argent',
      'skip est responsable de mes décisions financières',
      'mon compte peut être fermé par vous',
      'à quoi j’accepte en utilisant skip',
      'responsabilité skip',
      'skip est un conseiller financier',
      'les conditions en espagnol sont officielles',
    ],
    answer:
      'En bref :\n\n' +
      '- Skip est un outil pour noter et regarder ton propre argent. Ce n’est ni une banque, ni un service de paiement, ni un conseiller financier, et rien dans l’app n’est un conseil financier, fiscal ou juridique.\n' +
      '- Chaque chiffre vient de ce que tu as saisi. Les prévisions de factures et de jours de paie sont des estimations tirées des horaires que tu as réglés.\n' +
      '- Ce que tu y mets reste à toi, et tu peux le supprimer quand tu veux.\n' +
      '- Un compte est pour une seule personne. Un compte qui enfreint les conditions peut être suspendu ou fermé.\n\n' +
      'Lis tout dans **Réglages → À propos → Conditions d’utilisation**. En espagnol ou en français, c’est une traduction de courtoisie, et c’est la version anglaise qui fait foi.',
    keywords: ['conditions', 'conditions d’utilisation', 'conseil financier', 'responsabilité'],
  },
  {
    id: 'privacy.shared-phone',
    title: 'Je vends ou je partage mon téléphone',
    questions: [
      'je vends mon téléphone, que faire avec skip',
      'quelqu’un d’autre va utiliser mon iphone',
      'comment m’assurer que la prochaine personne ne voit pas mon budget',
      'se déconnecter avant de donner mon téléphone',
      'ma famille utilise mon téléphone',
      'mes rappels vont continuer à aller sur mon ancien téléphone',
      'je passe mon iphone à quelqu’un',
      'arrêter d’afficher mes infos sur mon ancien téléphone',
      'reprise de mon iphone skip',
      'protéger skip des gens qui empruntent mon téléphone',
    ],
    answer:
      'Déconnecte-toi d’abord, dans **Réglages → Compte → Se déconnecter**. Se déconnecter :\n\n- arrête l’envoi de tes rappels vers ce téléphone,\n- efface de celui-ci tes corrections de noms de la voix et les magasins que Skip avait retenus pour toi,\n- et ramène Skip à l’écran de bienvenue.\n\nCela te déconnecte aussi de Skip sur tes autres téléphones, alors reconnecte-toi sur ton nouveau si on te le demande.\n\nTes entrées restent en sécurité dans ton compte, prêtes sur ton prochain téléphone. Si quelqu’un partage ton téléphone au quotidien, active le **Verrouillage de l’app** dans **Réglages → Préférences**, pour que Skip demande Face ID avant de s’ouvrir.',
    keywords: ['vendre mon téléphone', 'donner', 'téléphone partagé', 'Verrouillage de l’app'],
  },
  {
    id: 'privacy.permissions',
    title: 'Quelles permissions Skip demande-t-elle ?',
    questions: [
      'quelles permissions skip demande',
      'skip utilise ma position',
      'skip lit mes contacts',
      'pourquoi skip veut mon appareil photo',
      'pourquoi skip veut mes photos',
      'je peux dire non aux permissions de skip',
      'skip accède à mes photos et à ma photothèque ?',
      'liste des permissions de skip',
      'skip lit mes messages texte',
      'skip accède à mon calendrier',
    ],
    answer:
      'Skip ne demande que lorsque tu utilises quelque chose qui en a besoin, et tu peux dire non et continuer d’utiliser le reste :\n\n- **Appareil photo** : pour numériser les reçus. Les numérisations sont lues sur le téléphone et jamais téléversées.\n- **Photos** : pour lire un reçu que tu choisis dans tes photos, sur le téléphone.\n- **Microphone** et **Reconnaissance vocale** : pour la saisie vocale.\n- **Notifications** : pour les rappels que tu actives.\n- **Face ID** : pour le **Verrouillage de l’app**, si tu l’actives.\n\nSkip ne demande ni ta position, ni tes contacts, ni ton calendrier, ni tes messages. Change n’importe quelle permission dans les **Réglages → Skip Budget** de l’iPhone.',
    keywords: ['permissions', 'position', 'contacts', 'appareil photo'],
  },
  {
    id: 'privacy.account.compromised',
    title: 'Je pense que quelqu’un est entré dans mon compte',
    questions: [
      'je pense que quelqu’un est entré dans mon compte skip',
      'mon compte skip a été piraté',
      'il y a des entrées que je n’ai pas ajoutées',
      'quelqu’un d’autre utilise mon compte',
      'des reçus étranges sont apparus dans mon compte',
      'accès non autorisé à mon compte skip',
      'comment sécuriser mon compte après une intrusion',
      'quelqu’un connaît mon mot de passe skip',
      'activité suspecte dans skip',
      'je peux voir qui s’est connecté à mon compte',
      'comment garder mon compte skip sécurisé',
    ],
    answer:
      'Agis vite :\n\n' +
      '1. Définis un nouveau mot de passe. Déconnecte-toi dans **Réglages → Compte → Se déconnecter**, puis, sur l’écran **Se connecter**, touche **Mot de passe oublié ?** et suis le code envoyé à ton courriel. Si tu te connectes avec Apple ou Google, sécurise plutôt ce compte-là.\n' +
      '2. Dis-le-nous à **admin@skipapps.net**, ou dans **Réglages → Assistance et commentaires → Écrire à l’assistance**, pour que nous puissions enquêter.\n' +
      '3. Parcours tes entrées à la recherche de tout ce que tu n’as pas ajouté, et supprime-le.\n\n' +
      'Skip n’affiche pas de liste des connexions. Elle ne détient aucun identifiant bancaire ni numéro de carte complet et ne peut pas déplacer d’argent, alors personne ne peut accéder à ta banque par elle. Pour empêcher les gens d’ouvrir Skip sur ton téléphone, active le **Verrouillage de l’app** dans **Réglages → Préférences**.',
    keywords: ['piraté', 'compromis', 'intrusion', 'activité suspecte'],
  },

  // Quelque chose ne va pas : problèmes qui touchent toute l’app

  {
    id: 'troubleshooting.failure.what',
    title: 'Que veut dire « Une erreur est survenue » ?',
    questions: [
      'Que veut dire Une erreur est survenue. Réessaie. ?',
      'erreur une erreur est survenue',
      'je vois tout le temps une erreur est survenue',
      'pourquoi skip dit réessaie',
      'message d’erreur dans skip',
      'c’est quoi l’erreur que skip affiche',
      'ça a dit une erreur est survenue et rien ne s’est passé',
      'erreur skip',
      'la page affiche une erreur avec un bouton réessayer',
      'j’ai perdu mes données, ça a dit une erreur est survenue',
      'ça veut dire quoi réessayer',
    ],
    answer:
      'C’est l’unique message que Skip affiche chaque fois que quelque chose échoue, comme charger une page, enregistrer, supprimer ou envoyer. Cela veut presque toujours dire que Skip n’a pas pu joindre ton compte pendant un moment, le plus souvent à cause de la connexion.\n\n' +
      '1. Vérifie que tu es en ligne, en Wi-Fi ou avec les données cellulaires.\n' +
      '2. Touche **Réessayer** sur la page, ou touche de nouveau le même bouton, comme **Enregistrer**.\n' +
      '3. Ça bloque encore ? Ferme Skip complètement et rouvre-la.\n\n' +
      'Rien de ce que tu as déjà enregistré n’est perdu. Quand un enregistrement échoue, ce que tu avais saisi reste sur la page pour que tu puisses réessayer.\n\n' +
      'Les messages qui te disent quoi corriger, comme « Indique le nom de la banque. » ou « Choisis d’abord un magasin. », ne sont pas des échecs. Ils indiquent quelque chose qui attend encore une réponse.',
    keywords: ['Une erreur est survenue', 'Réessaie', 'Réessayer', 'erreur'],
  },
  {
    id: 'troubleshooting.failure.repeats',
    title: 'Rien ne marche, chaque page affiche une erreur',
    questions: [
      'ça dit encore une erreur est survenue après avoir réessayé',
      'chaque page affiche une erreur',
      'rien ne charge dans skip',
      'skip ne charge rien',
      'je n’arrive à rien enregistrer',
      'erreur sur chaque écran',
      'skip est brisée',
      'réessayer ne marche pas',
      'skip ne fonctionne pas aujourd’hui',
      'skip est en panne',
      'toutes mes pages sont vides avec des erreurs',
    ],
    answer:
      'Si chaque tentative échoue, suis ces étapes :\n\n' +
      '1. Passe du Wi-Fi aux données cellulaires, ou l’inverse, ou active puis désactive le mode Avion.\n' +
      '2. Ferme Skip complètement, en la balayant dans le sélecteur d’apps, et rouvre-la.\n' +
      '3. Mets Skip à jour dans l’App Store, et redémarre ton iPhone.\n' +
      '4. Déconnecte-toi puis reconnecte-toi : **Réglages → Compte → Se déconnecter**. Tes entrées sont en sécurité dans ton compte. Seules les corrections de noms de la voix et les magasins gardés sur ce téléphone sont effacés.\n\n' +
      'Si ça échoue encore, Skip a peut-être un problème de notre côté. Dis-nous dans **Réglages → Assistance et commentaires → Écrire à l’assistance** ce que tu faisais et ce que tu as vu. Si tu ne peux pas aller jusque-là, écris à **admin@skipapps.net**.',
    keywords: ['ne fonctionne pas', 'panne', 'brisée', 'rien ne charge'],
  },
  {
    id: 'troubleshooting.wont-save',
    title: 'Pourquoi rien ne s’enregistre ?',
    questions: [
      'le bouton enregistrer ne marche pas',
      'rien ne s’enregistre dans skip',
      'bouton enregistrer gris partout',
      'enregistrer ne fait rien nulle part dans l’app',
      'le bouton en bas ne fait rien',
      'ça ne me laisse pas enregistrer',
      'le formulaire ne s’envoie pas',
      'je ne peux pas enregistrer mes changements',
      'ça veut dire quoi le texte gris au-dessus d’enregistrer',
      'enregistrer ne fonctionne pas',
      'texte rouge au-dessus du bouton enregistrer',
    ],
    answer:
      'Les mots juste au-dessus du bouton t’indiquent lequel de ces deux cas est en cause :\n\n' +
      '- **Un texte gris qui dit ce qui manque**, comme « Choisis d’abord un magasin. » ou une liste de champs. Quelque chose attend encore une réponse. Remplis les lignes qui disent **Touche pour ajouter**, puis touche **Enregistrer** de nouveau.\n' +
      '- **« Une erreur est survenue. Réessaie. »** L’enregistrement n’a pas atteint ton compte, le plus souvent à cause de la connexion. Ton entrée est toujours sur la page. Vérifie que tu es en ligne et touche **Enregistrer** de nouveau.\n\n' +
      'Quand un enregistrement fonctionne, une courte note s’affiche en bas de l’écran, comme **Facture ajoutée**.',
    keywords: ['enregistrer', 'grisé', 'désactivé', 'champs manquants'],
  },
  {
    id: 'troubleshooting.slow',
    title: 'Skip est lente ou charge sans arrêt',
    questions: [
      'pourquoi skip est si lente',
      'skip charge sans arrêt',
      'roue qui tourne sans fin',
      'les pages sont longues à ouvrir',
      'skip lag',
      'c’est long à enregistrer',
      'pourquoi skip charge chaque fois que je l’ouvre',
      'app lente',
      'les chiffres prennent du temps à apparaître',
      'skip prend une éternité à s’ouvrir et à charger',
    ],
    answer:
      'Skip charge tes entrées depuis ton compte, alors sa vitesse suit surtout ta connexion.\n\n' +
      '- Un signal faible est la cause habituelle. Essaie le Wi-Fi, ou un endroit où le signal est meilleur.\n' +
      '- Quand tu reviens dans Skip après un moment, elle va chercher les derniers chiffres pour qu’ils soient justes. Cela peut prendre un instant.\n' +
      '- Tire vers le bas sur **Accueil**, **Cartes**, **Activité** et la plupart des listes pour actualiser à la main.\n' +
      '- Si elle semble bloquée, ferme Skip complètement et rouvre-la.\n\n' +
      'Si elle est lente tout le temps malgré une bonne connexion, dis-nous quelle page dans **Réglages → Assistance et commentaires → Écrire à l’assistance**.',
    keywords: ['lent', 'chargement', 'roue qui tourne', 'lag'],
  },
  {
    id: 'troubleshooting.crash',
    title: 'Skip a planté ou s’est fermée toute seule',
    questions: [
      'skip plante tout le temps',
      'l’app se ferme toute seule',
      'skip quitte quand j’ouvre une page',
      'l’app a planté pendant l’enregistrement',
      'skip se fige',
      'l’app s’est arrêtée',
      'skip s’est figée puis fermée',
      'l’app n’arrête pas de se fermer',
      'j’ai perdu ce que je saisissais quand ça a planté',
      'skip est figée',
    ],
    answer:
      'Toutes mes excuses pour ça. Skip envoie elle-même un rapport de plantage, qui décrit ce que faisait l’app et rien de ton budget, pour que le défaut puisse être trouvé.\n\n' +
      '1. Ferme Skip complètement et rouvre-la.\n' +
      '2. Mets Skip à jour dans l’App Store, et mets iOS à jour.\n' +
      '3. Redémarre ton iPhone.\n\n' +
      'Tout ce que tu avais déjà enregistré est en sécurité dans ton compte. Seule l’entrée que tu étais en train de faire est perdue, alors vérifie qu’elle y est et ajoute-la de nouveau sinon.\n\n' +
      'Si ça continue de se produire au même endroit, dis-nous ce que tu as touché juste avant dans **Réglages → Assistance et commentaires → Écrire à l’assistance**. Ta **Version**, dans **Réglages → À propos**, nous aide.',
    keywords: ['plantage', 'figée', 'se ferme', 'quitte'],
  },
  {
    id: 'troubleshooting.splash-stuck',
    title: 'Skip reste bloquée sur l’écran d’ouverture',
    questions: [
      'skip reste sur le logo',
      'l’app ne passe pas l’écran de démarrage',
      'bloqué sur l’écran de chargement',
      'skip affiche le logo et rien d’autre',
      'écran vide à l’ouverture de skip',
      'écran blanc au lancement',
      'skip ne démarre pas',
      'l’app plante au démarrage',
      'je n’arrive pas à passer l’écran de départ',
      'skip s’ouvre sur une page vide',
      'écran noir quand j’ouvre skip',
    ],
    answer:
      'Le logo d’ouverture joue pendant environ deux secondes pendant que Skip se prépare, puis cède la place en quelques secondes même si l’animation ne peut pas se charger. Si ça bloque encore après ça :\n\n' +
      '1. Ferme Skip complètement, en la balayant dans le sélecteur d’apps, et rouvre-la.\n' +
      '2. Redémarre ton iPhone.\n' +
      '3. Mets Skip à jour dans l’App Store.\n' +
      '4. Ça bloque toujours ? Supprime Skip et réinstalle-la, puis connecte-toi. Tes entrées sont dans ton compte, mais les réglages gardés sur le téléphone, comme l’apparence et le verrouillage de l’app, sont réinitialisés.\n\n' +
      'Si rien de cela n’aide, écris à **admin@skipapps.net**, puisque tu ne pourras peut-être pas accéder aux **Réglages**.',
    keywords: ['écran de démarrage', 'bloqué', 'logo', 'écran vide'],
  },
  {
    id: 'troubleshooting.update',
    title: 'Comment mettre Skip à jour ?',
    questions: [
      'comment mettre à jour l’app',
      'il y a une nouvelle version de skip ?',
      'skip me demande de la mettre à jour',
      'activer les mises à jour automatiques pour skip',
      'mettre à jour skip budget',
      'mise à jour de l’app disponible',
      'je dois mettre à jour skip ?',
      'dernière version de skip',
      'quoi de neuf dans la mise à jour',
      'mettre à jour va supprimer mes données ?',
    ],
    answer:
      'Skip se met à jour par l’App Store :\n\n' +
      '1. Ouvre l’**App Store** et touche ta photo en haut à droite.\n' +
      '2. Trouve **Skip Budget** parmi les mises à jour disponibles et touche **Mettre à jour**.\n\n' +
      'Pour que les mises à jour se fassent toutes seules, active **Mises à jour d’app** dans **Réglages → App Store** de l’iPhone. Mettre à jour ne touche jamais à tes entrées.\n\n' +
      'Skip ne te bloque pas pour t’obliger à mettre à jour. Les nouvelles sur les nouvelles versions et fonctions apparaissent sous la cloche de **Accueil**, dans **Notifications**. Ta version actuelle se trouve dans **Réglages → À propos → Version**.',
    keywords: ['mise à jour', 'nouvelle version', 'App Store', 'mises à jour automatiques'],
  },
  {
    id: 'troubleshooting.new-phone',
    title: 'Mes données reviendront-elles sur un nouveau téléphone ?',
    questions: [
      'nouvel iphone, comment récupérer mes données skip',
      'transférer skip sur un nouveau téléphone',
      'mon budget va passer sur mon nouveau téléphone ?',
      'j’ai changé de téléphone, comment tout retrouver',
      'comment déplacer mes données vers un nouvel iphone',
      'configurer skip sur mon nouvel iphone',
      'transfert de données skip',
      'je dois tout reconfigurer sur un nouveau téléphone',
      'qu’est-ce qui ne passe pas sur mon nouveau téléphone',
      'j’ai changé d’iphone, et skip',
    ],
    answer:
      'Oui. Installe Skip sur le nouveau téléphone et connecte-toi de la même façon qu’avant, avec le même courriel ou le même compte Apple ou Google. Tout ce qui est dans ton compte revient : reçus, factures, abonnements, cartes, paie, prêts, épargne et le reste.\n\nQuelques éléments appartiennent à l’ancien téléphone, alors règle-les de nouveau :\n- **Apparence**, **Langue**, **Retour haptique** et **Verrouillage de l’app** dans **Réglages → Préférences**.\n- Les notifications : active **Bilan mensuel** dans **Réglages → Préférences → Rappels**, et touche Autoriser quand l’iPhone te le demande. Tes autres rappels arriveront alors aussi sur ce téléphone.\n- Les corrections de noms de la voix et les magasins que Skip avait retenus pour toi repartent de zéro.\n\nSi Skip Pro n’apparaît pas, va dans **Réglages → Skip Pro → Restaurer l’achat**.',
    keywords: ['nouveau téléphone', 'transfert', 'changer de téléphone', 'nouvel iPhone'],
  },
  {
    id: 'troubleshooting.reinstall',
    title: 'J’ai supprimé l’app. Mes données sont-elles perdues ?',
    questions: [
      'j’ai supprimé l’app',
      'désinstallé skip, tout est perdu ?',
      'j’ai supprimé skip par accident',
      'si je désinstalle skip je perds mes données',
      'réinstallé skip, où sont mes affaires',
      'données après réinstallation',
      'décharger skip',
      'app supprimée, mon compte est toujours là',
      'réinstaller va régler mon problème',
      'retiré skip de mon téléphone',
      'supprimer l’app supprime mon compte',
      'réinstaller et se connecter',
    ],
    answer:
      'Non, tes données sont en sécurité. Supprimer l’app ne supprime pas ton compte. Réinstalle Skip depuis l’App Store, connecte-toi de la même façon qu’avant, et tout ce qui est dans ton compte revient.\n\nCe qui est réinitialisé avec une réinstallation : les réglages gardés sur le téléphone (apparence, langue, retour haptique, verrouillage de l’app), tes corrections de noms de la voix, et les magasins que Skip avait retenus pour toi. Pour recevoir de nouveau des notifications, active **Bilan mensuel** dans **Réglages → Préférences → Rappels** et touche Autoriser quand l’iPhone te le demande.\n\nSupprimer l’app n’annule pas Skip Pro. Pour supprimer tes données pour de bon, utilise **Réglages → Compte → Supprimer le compte**.',
    keywords: ['désinstaller', 'réinstaller', 'app supprimée', 'décharger'],
  },
  {
    id: 'troubleshooting.missing-data',
    title: 'Mes entrées ont disparu',
    questions: [
      'mes entrées ont disparu',
      'des données manquent dans skip',
      'j’ai perdu mes transactions',
      'mes anciennes entrées ont disparu',
      'mon historique a disparu',
      'tout ce que j’ai saisi s’est volatilisé',
      'skip a perdu mes données',
      'les entrées d’il y a des mois sont manquantes',
      'ce que j’ai ajouté la semaine dernière n’est pas là',
      'où sont passées mes entrées dans skip',
    ],
    answer:
      'Tes entrées sont conservées dans ton compte, alors elles y sont presque toujours. Vérifie dans cet ordre :\n\n' +
      '- **Plus de 90 jours avec le forfait gratuit ?** Les listes affichent les 90 derniers jours. Les entrées plus anciennes sont gardées hors de vue et reviennent avec Skip Pro.\n' +
      '- **Un autre compte ?** Si tu as rejoint Skip avec ton courriel et que tu te connectes maintenant avec Apple ou Google, ou l’inverse, tu es peut-être dans un deuxième compte, vide. Déconnecte-toi et connecte-toi de la façon dont tu l’as fait la première fois.\n' +
      '- **Le bon endroit ?** Les reçus peuvent se trouver dans un autre carnet, et **Activité** affiche une période à la fois.\n' +
      '- **Supprimées ?** Les entrées supprimées ne peuvent pas revenir.\n' +
      '- **Pas de connexion ?** Tire vers le bas pour actualiser, ou touche **Réessayer**.\n\n' +
      'Toujours rien ? Dis-nous dans **Réglages → Assistance et commentaires → Écrire à l’assistance**.',
    keywords: ['manquant', 'disparu', 'perdu', 'volatilisé'],
  },
  {
    id: 'troubleshooting.sync',
    title: 'Les changements sur mon autre téléphone n’apparaissent pas',
    questions: [
      'skip ne se synchronise pas entre mes téléphones',
      'j’ai ajouté une facture sur un téléphone mais mon autre téléphone ne l’affiche pas',
      'deux appareils pas synchronisés',
      'les changements n’apparaissent pas sur mon autre iphone',
      'combien de temps avant que les changements apparaissent sur mon autre téléphone',
      'mes téléphones affichent des choses différentes',
      'problème de synchronisation',
      'supprimé sur un téléphone mais encore affiché sur l’autre',
      'ne se met pas à jour entre les appareils',
      'l’autre téléphone a de vieilles données',
    ],
    answer:
      'Skip se met à jour toute seule. Quand quelque chose change dans ton compte, tes autres téléphones le reprennent en quelques instants, tant que Skip y est ouverte et en ligne.\n\n' +
      'Si ça n’est pas apparu :\n' +
      '1. Vérifie que les deux téléphones sont connectés au même compte. **Réglages → Assistance et commentaires → Écrire à l’assistance** affiche le courriel avec lequel tu te connectes.\n' +
      '2. Tire vers le bas sur la page pour actualiser.\n' +
      '3. Ferme Skip et rouvre-la.\n\n' +
      'Skip actualise aussi quand tu y reviens après un moment. Les réglages gardés sur chaque téléphone, comme l’apparence et la langue, ne se synchronisent jamais.',
    keywords: ['synchronisation', 'autre téléphone', 'appareils', 'pas à jour'],
  },
  {
    id: 'troubleshooting.numbers-wrong',
    title: 'Mes chiffres semblent faux',
    questions: [
      'les chiffres de skip ne correspondent pas à ma banque',
      'les totaux semblent erronés',
      'pourquoi mon budget est faux',
      'les calculs de skip sont faux',
      'les chiffres ne s’additionnent pas',
      'skip affiche le mauvais montant',
      'mon total de dépenses est trop élevé',
      'chiffres incorrects',
      'les calculs de skip sont décalés',
      'pourquoi mes chiffres sont différents de ce que j’attends',
    ],
    answer:
      'Chaque chiffre de Skip est calculé au cent près à partir de ce qui a été saisi, alors quand l’un semble faux, c’est généralement une entrée derrière lui. Les causes courantes :\n\n' +
      '- Un montant ou une date mal saisi, ou une entrée ajoutée deux fois.\n' +
      '- Un reçu, une facture ou un abonnement payé avec la mauvaise carte ou le mauvais compte, ou sans aucun.\n' +
      '- Un solde de départ sur une carte ou un compte qui n’est pas à jour.\n' +
      '- Une paie manquante, ou réglée avec un mauvais horaire.\n' +
      '- Des dépenses qui n’ont jamais été ajoutées. Skip n’est pas liée à ta banque, alors elle ne sait que ce que tu lui dis.\n' +
      '- Avec le forfait gratuit, les entrées plus anciennes sont masquées dans les listes mais comptent quand même.\n\n' +
      'Demande-moi à propos du chiffre qui te semble faux, par exemple « Comment le solde actuel est-il calculé ? » ou « Pourquoi le solde de ma carte est-il faux ? », et je te montrerai comment il est construit.',
    keywords: ['chiffres faux', 'calculs', 'totaux', 'ne s’additionne pas'],
  },
  {
    id: 'troubleshooting.wrong-date',
    title: 'Les dates dans Skip sont décalées d’un jour',
    questions: [
      'skip affiche la mauvaise date',
      'aujourd’hui est faux dans skip',
      'mon entrée s’est enregistrée au mauvais jour',
      'les dates ont un jour de retard',
      'fuseau horaire faux dans skip',
      'j’ai voyagé et les dates sont décalées',
      'skip pense qu’on est hier',
      'skip affiche encore hier après minuit',
      'mes dates ont changé après un voyage',
      'mauvais jour partout dans skip',
    ],
    answer:
      'Le « aujourd’hui » de Skip est la date de ton iPhone, et ton compte garde le fuseau horaire de ton téléphone pour que les prélèvements et les rappels suivent ta journée.\n\n' +
      '- Vérifie la date et l’heure de l’iPhone : **Réglages → Général → Date et heure**, avec **Réglage automatique** activé.\n' +
      '- Après un voyage, ferme Skip complètement (balaie-la dans le sélecteur d’apps) et rouvre-la. Elle enregistre le nouveau fuseau horaire à chaque démarrage.\n' +
      '- Si Skip est restée ouverte toute la nuit, elle passe au nouveau jour en moins d’une minute, ou dès que tu y reviens.\n\n' +
      'Si une entrée a le mauvais jour, ouvre-la, touche le crayon et change la date.',
    keywords: ['date', 'fuseau horaire', 'mauvais jour', 'voyage'],
  },
  {
    id: 'troubleshooting.badge',
    title: 'C’est quoi le chiffre rouge sur l’icône de Skip ?',
    questions: [
      'pastille rouge sur l’icône de skip',
      'chiffre sur l’icône de skip',
      'comment effacer la pastille',
      'l’icône de skip affiche 1',
      'la pastille ne disparaît pas',
      'petit cercle rouge sur l’app',
      'que veut dire la pastille',
      'compteur de notifications sur l’icône de skip',
      'enlever la pastille de skip',
      'numéro de pastille skip',
    ],
    answer:
      'Cela veut dire qu’une notification de Skip est arrivée depuis la dernière fois que tu as ouvert Skip. Ouvrir Skip l’efface.\n\n' +
      'Si tu préfères ne jamais la voir, désactive **Pastilles** dans **Réglages → Notifications → Skip Budget** de l’iPhone.\n\n' +
      'Le point sur la cloche de **Accueil** est différent. Il veut dire qu’il y a, dans **Notifications**, une nouvelle de Skip que tu n’as pas encore lue.',
    keywords: ['pastille', 'chiffre rouge', 'icône de l’app', 'cercle rouge'],
  },
  {
    id: 'troubleshooting.large-text',
    title: 'Le texte est trop grand ou trop petit',
    questions: [
      'le texte est trop gros',
      'l’écriture dans skip est énorme',
      'comment agrandir le texte dans skip',
      'le texte est trop petit',
      'taille de police skip',
      'les mots sont coupés',
      'le grand texte rend skip bizarre',
      'skip supporte le texte dynamique',
      'certains textes ne grossissent pas',
      'le texte se chevauche',
      'je peux changer la taille de la police dans l’app',
      'les chiffres ne grossissent pas avec la taille du texte',
    ],
    answer:
      'Skip suit la taille du texte de ton iPhone, et n’a aucun réglage à elle. Change-la dans les **Réglages → Affichage et luminosité → Taille du texte** de l’iPhone, ou, pour un texte encore plus grand, dans **Réglages → Accessibilité → Affichage et taille du texte → Police plus grande**.\n\n' +
      'Pour que chaque page reste utilisable, chaque type de texte cesse de grossir à un certain point. Le texte à lire grossit le plus, les libellés de ligne un peu moins, et les titres et les gros chiffres le moins, si bien qu’aux plus grandes tailles certains chiffres restent plus petits que les mots. Les boutons comme **Enregistrer** restent épinglés en bas, pour que tu puisses toujours les atteindre.\n\n' +
      'Si quelque chose est coupé ou se chevauche, dis-nous quelle page dans **Réglages → Assistance et commentaires → Écrire à l’assistance**.',
    keywords: ['taille du texte', 'police', 'texte plus grand', 'texte coupé'],
  },
  {
    id: 'troubleshooting.text-size.reset',
    title: 'Changer la taille du texte a réinitialisé ma page',
    questions: [
      'j’ai changé la taille du texte et skip est revenue en arrière',
      'j’ai perdu ce que je tapais après avoir changé la taille de police',
      'skip s’est réinitialisée quand j’ai changé la taille du texte',
      'l’app est revenue en arrière après un changement d’accessibilité',
      'la page s’est rechargée toute seule',
      'formulaire effacé après avoir changé les réglages',
      'mon entrée a disparu quand j’ai changé la taille du texte',
      'changer la taille du texte a fermé ma page',
      'pourquoi skip a tout redessiné',
      'skip a redémarré quand j’ai changé les réglages d’affichage',
    ],
    answer:
      'Quand la taille du texte change pendant que Skip est ouverte, elle redessine ses pages pour que tout s’adapte à la nouvelle taille. Une page que tu étais en train de remplir peut perdre ce que tu n’avais pas encore enregistré.\n\n' +
      'Tout ce qui est déjà enregistré est en sécurité. Pour éviter de tout ressaisir, enregistre d’abord, ou change la taille du texte avant de commencer à ajouter quelque chose. Si tu ajoutais par la voix et que tu vois **Rien à vérifier pour l’instant**, touche **Recommencer**.',
    keywords: ['taille du texte', 'réinitialisation', 'redessin', 'saisie perdue'],
  },
  {
    id: 'troubleshooting.dark-mode',
    title: 'Le mode sombre a l’air bizarre',
    questions: [
      'skip reste clair quand mon téléphone est en sombre',
      'pourquoi skip s’ouvre en clair en mode sombre',
      'l’animation d’ouverture est trop lumineuse',
      'le mode sombre ne marche pas dans skip',
      'skip ignore le mode sombre de mon téléphone',
      'éclair de lumière à l’ouverture de skip la nuit',
      'certaines parties sont bizarres en mode sombre',
      'skip est sombre mais je veux clair',
      'le thème ne suit pas mon téléphone',
      'le mode sombre a l’air décalé',
    ],
    answer:
      'Quelques points expliquent la plupart des cas :\n\n' +
      '- **Skip ne change pas quand ton téléphone change.** **Apparence** est réglée sur **Clair** ou **Sombre**. Choisis **Système** dans **Réglages → Préférences → Apparence** pour suivre ton téléphone.\n' +
      '- **Un écran clair à l’ouverture de Skip.** L’animation du logo d’ouverture se joue toujours sur son fond crème, puis Skip passe à ton thème.\n' +
      '- **Quelque chose est difficile à lire en mode sombre.** Dis-nous quelle page dans **Réglages → Assistance et commentaires → Écrire à l’assistance**, et décris ce que tu vois.\n\n' +
      'L’apparence est gratuite avec tous les forfaits et gardée sur chaque téléphone.',
    keywords: ['mode sombre', 'mode clair', 'thème', 'Apparence'],
  },
  {
    id: 'troubleshooting.motion',
    title: 'Puis-je désactiver les animations ?',
    questions: [
      'trop d’animation dans skip',
      'réduire les animations skip',
      'l’animation d’ouverture me donne le tournis',
      'désactiver la vidéo du logo',
      'animation d’écran de démarrage de skip',
      'mal des transports à cause de l’app',
      'je peux sauter l’animation d’intro',
      'arrêter le micro qui pulse',
      'animations désactivées',
      'moins de mouvement dans skip',
    ],
    answer:
      'Skip suit le réglage **Réduire les animations** de l’iPhone. Active-le dans **Réglages → Accessibilité → Mouvement → Réduire les animations**.\n\n' +
      'Quand il est activé, Skip s’ouvre sur le logo terminé, en image fixe, au lieu de jouer l’animation, et le micro de la voix cesse de pulser et de grossir pendant que tu parles. Skip n’a aucun interrupteur à elle.',
    keywords: ['Réduire les animations', 'animation', 'mouvement', 'tournis'],
  },
  {
    id: 'troubleshooting.accessibility',
    title: 'Skip fonctionne-t-elle avec VoiceOver ?',
    questions: [
      'accessibilité de skip',
      'support voiceover skip',
      'lecteur d’écran skip budget',
      'les personnes aveugles peuvent utiliser skip',
      'fonctions d’accessibilité',
      'skip lit les montants à voix haute',
      'skip pour les personnes malvoyantes',
      'aide à l’accessibilité',
      'voiceover lit le mauvais libellé',
      'skip est utilisable avec un lecteur d’écran',
    ],
    answer:
      'Oui. Skip est conçue pour fonctionner avec VoiceOver. Les boutons, les lignes et les chiffres ont des noms parlés, et les lignes des pages d’ajout disent si elles sont encore nécessaires ou facultatives.\n\n' +
      'Elle suit aussi la taille du texte de ton iPhone et le réglage **Réduire les animations**. Avec VoiceOver activé, la saisie vocale passe au double toucher pour commencer et arrêter, alors tu n’as pas à maintenir le bouton.\n\n' +
      'Si quelque chose n’est pas bien lu, dis-nous quelle page dans **Réglages → Assistance et commentaires → Écrire à l’assistance**.',
    keywords: ['VoiceOver', 'accessibilité', 'lecteur d’écran', 'aveugle'],
  },
  {
    id: 'privacy.encryption',
    title: 'Mes données sont-elles chiffrées ?',
    questions: [
      'mes données sont chiffrées',
      'skip utilise le chiffrement',
      'la connexion est sécurisée',
      'des pirates peuvent voir mon budget',
      'mes informations sont envoyées de façon sécuritaire',
      'https',
      'comment mes données sont protégées',
      'mes données sont en sécurité sur votre serveur',
      'qu’est-ce qui empêche quelqu’un de lire mes données',
      'connexion chiffrée',
    ],
    answer:
      'Oui, pendant leur trajet entre ton téléphone et notre serveur. Skip ne communique avec notre serveur que par une connexion chiffrée, du même genre que le site de ta banque, de sorte que personne en chemin ne peut les lire.\n\nSur notre serveur, tes entrées appartiennent à ton compte seul. Les autres utilisateurs de Skip ne peuvent jamais les voir, et elles ne sont ni vendues ni partagées à des fins publicitaires.\n\nSkip ne demande ni ne conserve non plus jamais tes identifiants bancaires, un numéro de carte complet, une date d’expiration ou un code de sécurité. Pour tenir à distance les gens qui prennent ton téléphone, active **Réglages → Préférences → Verrouillage de l’app**.',
    keywords: ['chiffrement', 'chiffré', 'sécurisé', 'HTTPS'],
  },
];
