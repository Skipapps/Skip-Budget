import type { IntentText } from '@/lib/ask-sam/types';

export const gettingStartedFr: IntentText[] = [
  // The big picture

  {
    id: 'getting-started.skip.what',
    title: 'C’est quoi Skip ?',
    questions: [
      'C’est quoi Skip ?',
      'à quoi sert cette app',
      'Skip Budget, ça sert à quoi ?',
      'explique-moi Skip',
      'Qu’est-ce que je peux faire avec Skip ?',
      'c est une app de budget ?',
      'Comment ça marche Skip ?',
      'c koi cette appli',
      'je viens de télécharger l’app, elle fait quoi exactement',
      'Quel genre d’app est Skip ?',
      'donne-moi la version courte de ce que fait skip',
      "skip budget c'est pour quoi faire",
      "l'app skip en gros ca fait quoi",
    ],
    answer:
      'Skip est une app de budget personnel pour iPhone. Tu lui dis où en est ton argent et elle garde tout au même endroit : ta paie, tes cartes de crédit, tes comptes bancaires, tes factures, tes abonnements, tes reçus, tes prêts et ton épargne.\n\n' +
      'À partir de là, Skip te montre ton **Solde actuel**, où est passé ton argent ce mois-ci, ce qui est **À venir**, et te rappelle avant les factures, les renouvellements et le jour de paie. Elle ne se connecte jamais à ta banque. Tu ajoutes les choses en tapant, en numérisant un reçu ou, avec Skip Pro, à la voix.\n\n' +
      'Le plus simple pour commencer, c’est la carte **Premiers pas** dans **Accueil**.',
    keywords: ['skip', 'skip budget', 'app de budget', 'c’est quoi'],
  },
  {
    id: 'getting-started.skip.who',
    title: 'À qui s’adresse Skip ?',
    questions: [
      'À qui s’adresse Skip ?',
      'c’est pour qui cette app',
      'Skip est-elle faite pour moi ?',
      'est ce que skip convient aux débutants',
      'Mon ado peut utiliser Skip ?',
      'y a-t-il une limite d’âge',
      'les enfants peuvent utiliser skip ?',
      'Skip, c’est pour les entreprises ou juste pour les particuliers ?',
      'qui devrait utiliser skip',
      'je peux utiliser Skip pour mon petit commerce ?',
      'quel âge faut-il avoir',
      'ma fille veut noter son argent de poche, c’est ok ?',
      'un mineur peut avoir un compte skip',
      'skip c pour les adultes seulement ?',
    ],
    answer:
      'Skip est pour toute personne qui veut voir clairement où va son propre argent, sans donner ses identifiants bancaires. Elle convient à ceux qui aiment garder le contrôle : c’est toi qui décides ce qui entre, et Skip fait l’addition.\n\n' +
      'Quelques points à savoir :\n' +
      '- Un compte est pour une seule personne.\n' +
      '- Elle est pour les adultes qui gèrent leur propre argent. Elle n’est pas conçue pour les enfants.\n' +
      '- Elle est faite pour l’argent personnel. Il n’y a aucune fonction d’entreprise, comme des factures à envoyer à des clients ou des rapports d’impôts.\n' +
      '- Skip sert à suivre et à planifier. Ce n’est pas une banque et elle ne donne pas de conseils financiers.',
    keywords: ['âge', 'enfants', 'ado', 'entreprise'],
  },
  {
    id: 'getting-started.skip.free',
    title: 'Skip est-elle gratuite ?',
    questions: [
      'combien coûte skip',
      'Je dois payer pour utiliser Skip ?',
      'l’app est gratuite ou payante',
      'Il y a une version gratuite ?',
      'qu’est-ce que j’ai gratuitement',
      'skip est gratuite pour toujours ?',
      'Le forfait gratuit s’arrête un jour ?',
      'gratuit vs payant skip',
      'faut-il acheter quelque chose pour l’utiliser',
      'y a un essai gratuit ou c’est gratuit tout court',
      'qu’est-ce qui est limité avec le forfait gratuit',
      'Skip va me facturer ?',
      'est-ce que ça devient payant après quelques semaines',
      'je dois m’abonner ?',
    ],
    answer:
      'Oui. Skip est gratuite à télécharger et à utiliser, et le forfait gratuit n’a pas de limite de durée. Il couvre l’essentiel : ta paie (autant de salaires que tu veux), tes factures, tes abonnements, tes reçus, tes prêts et le calculateur de prêt, ton épargne, tes objectifs et tes rappels.\n\n' +
      'Le forfait gratuit a quelques limites :\n' +
      '- 1 carte de crédit et 1 compte bancaire\n' +
      '- 15 numérisations de reçus et 15 imports par mois\n' +
      '- L’historique montre les 90 derniers jours. Les entrées plus anciennes sont conservées, simplement masquées.\n\n' +
      'Skip Pro est facultatif, à {proMonthly} par mois ou {proYearly} par an, facturé par Apple. Il enlève ces limites et ajoute la Saisie vocale, l’Aperçu, les Habitudes de dépense et l’export des paiements, avec jusqu’à 7 ans d’historique. Tu peux tout voir dans **Réglages → Skip Pro**.',
    keywords: ['gratuit', 'prix', 'forfait gratuit', 'payant'],
  },
  {
    id: 'getting-started.skip.safe',
    title: 'Skip est-elle sûre ?',
    questions: [
      'Skip est sûre ?',
      'mes données sont en sécurité ?',
      'Je peux faire confiance à Skip avec mes infos d’argent ?',
      'c’est une arnaque cette app',
      'Skip vend mes données ?',
      'comment vous protégez mes informations',
      'c’est sécuritaire de mettre ma carte dans Skip ?',
      'est-ce que des pirates peuvent accéder à ma banque via skip',
      'skip respecte ma vie privée ?',
      'quelqu’un d’autre peut voir mon budget ?',
      'securite de mes donnees financieres',
      'l’app est fiable ?',
      'Skip garde mon numéro de carte ?',
    ],
    answer:
      'Oui. Skip est conçue pour conserver le moins possible. Elle ne demande jamais tes identifiants bancaires, donc rien dans Skip ne peut atteindre ta banque.\n\n' +
      '- Skip ne conserve jamais un numéro de carte complet, une date d’expiration ou un code de sécurité. Tout au plus, les 4 derniers chiffres si tu choisis de les taper.\n' +
      '- Les photos de reçus sont lues sur ton iPhone et ne sont jamais envoyées. Seuls le magasin, la date et le total que tu confirmes sont enregistrés.\n' +
      '- Ce que tu enregistres est conservé dans ton propre compte sur notre serveur, pour que tu puisses te connecter sur un autre iPhone et le retrouver.\n' +
      '- Skip n’a aucune publicité et ne vend pas tes données.\n\n' +
      'Pour plus de confidentialité sur le téléphone, active **Réglages → Préférences → Verrouillage de l’app** pour demander Face ID avant l’ouverture de Skip. Tous les détails sont dans **Réglages → À propos → Politique de confidentialité**.',
    keywords: ['sécurité', 'confidentialité', 'arnaque', 'données'],
  },
  {
    id: 'getting-started.skip.bank',
    title: 'Skip se connecte-t-elle à ma banque ?',
    questions: [
      'Skip se connecte à ma banque ?',
      'comment lier mon compte bancaire',
      'pourquoi je ne peux pas synchroniser ma banque',
      'skip utilise plaid ?',
      'Skip peut récupérer mes transactions automatiquement ?',
      'je peux importer mon relevé bancaire ?',
      'relier ma banque à skip',
      'pourquoi je dois tout taper à la main',
      'y a une synchro bancaire ?',
      'est-ce que l’app lit mes opérations bancaires',
      'je peux envoyer un fichier csv de ma banque',
      'pourquoi Skip ne voit pas mes dépenses toute seule',
      'pas de connexion bancaire pourquoi',
    ],
    answer:
      'Non, et c’est voulu. Skip ne demande jamais tes identifiants bancaires, donc personne ne peut atteindre ta banque par elle, et ta banque ne sait même pas que Skip existe.\n\n' +
      'À la place, c’est toi qui dis à Skip ce qui se passe :\n' +
      '- Ajoute une facture ou un abonnement une seule fois, et Skip le répète selon son calendrier.\n' +
      '- Numérise ou importe un reçu, ou tape-le.\n' +
      '- Indique les soldes de tes cartes et de tes comptes, et Skip les fait bouger avec ce que tu enregistres.\n\n' +
      'Cela veut aussi dire que les soldes ne se mettent pas à jour tout seuls, et qu’il n’y a aucun moyen d’importer un relevé bancaire. Si tu aimerais que ça existe, envoie l’idée depuis **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['synchro bancaire', 'plaid', 'relevé', 'automatique'],
  },
  {
    id: 'getting-started.skip.not-a-bank',
    title: 'Skip peut-elle payer mes factures ou déplacer de l’argent ?',
    questions: [
      'Skip peut payer mes factures ?',
      'je peux envoyer de l’argent avec skip',
      'Skip déplace de l’argent entre mes comptes ?',
      'skip est une banque ?',
      'est-ce que skip va prélever de l’argent sur mon compte',
      'Skip donne des conseils financiers ?',
      'je peux faire un virement dans skip',
      'skip paie ma carte de crédit automatiquement ?',
      'Skip garde mon argent ?',
      'c’est comme paypal ?',
      'skip peut m’aider pour mes impôts',
      'est ce que skip fait les paiements à ma place',
    ],
    answer:
      'Non. Skip n’est ni une banque ni une app de paiement, donc elle ne peut pas payer de factures, envoyer de l’argent ni en déplacer entre tes comptes. Elle garde une trace de ton argent et fait l’addition.\n\n' +
      'Quand une facture arrive à échéance, tu la paies comme d’habitude : par ta banque, ta carte ou l’entreprise. Skip te rappelle avant l’échéance et l’affiche dans ton mois.\n\n' +
      'Skip ne donne pas non plus de conseils financiers, fiscaux ou juridiques. Chaque chiffre vient de ce que tu as entré.',
    keywords: ['payer des factures', 'virement', 'conseils', 'impôts'],
  },
  {
    id: 'getting-started.platform.android',
    title: 'Skip existe-t-elle sur Android ?',
    questions: [
      'Skip existe sur Android ?',
      'version android ?',
      'Je peux avoir Skip sur mon Samsung ?',
      'skip est sur google play ?',
      'ma conjointe a un android, elle peut utiliser skip',
      'Skip marche sur un Pixel ?',
      'pas d’app android ?',
      'je peux utiliser Skip sur un téléphone pas Apple ?',
      'télécharger skip pour android',
      'je suis passé à android, comment je garde skip',
      'est-ce qu’il y aura une version android',
      'playstore skip budget',
    ],
    answer:
      'Skip n’existe que sur iPhone pour l’instant. Il n’y a pas de version Android.\n\n' +
      'Tes données sont gardées dans ton compte, pas seulement sur le téléphone, alors rien n’est perdu si tu es loin de ton iPhone un moment. Connecte-toi sur n’importe quel iPhone pour les voir.\n\n' +
      'Si tu aimerais avoir Skip sur Android, dis-le-nous avec **Partage une idée** dans **Réglages → Assistance et commentaires**.',
    keywords: ['android', 'google play', 'samsung', 'pixel'],
  },
  {
    id: 'getting-started.platform.ipad',
    title: 'Puis-je utiliser Skip sur mon iPad ?',
    questions: [
      'Je peux utiliser Skip sur iPad ?',
      'version ipad ?',
      'Skip marche sur une tablette ?',
      'y a une app ipad',
      'je peux avoir skip sur mon téléphone et mon ipad',
      'pourquoi skip ne tourne pas en mode paysage sur mon ipad',
      'skip sur ipad à l’horizontale',
      'mes données apparaissent sur mon ipad ?',
      'skip est compatible ipad',
      'installer skip sur tablette',
      'skip ipad grand écran',
    ],
    answer:
      'Skip est faite pour l’iPhone, et ses pages sont conçues pour l’écran de l’iPhone. Elle peut aussi tourner sur un iPad, mais elle n’a pas de mise en page pensée pour le grand écran de l’iPad.\n\nConnecte-toi sur l’iPad comme sur ton iPhone, et tes données y sont, parce qu’elles vivent dans ton compte.',
    keywords: ['ipad', 'tablette', 'paysage'],
  },
  {
    id: 'getting-started.platform.web',
    title: 'Y a-t-il une version web ou pour ordinateur ?',
    questions: [
      'Il y a une version web de Skip ?',
      'je peux utiliser skip sur mon ordinateur',
      'y a une app de bureau ?',
      'site web skip connexion',
      'Skip sur mon laptop c’est possible ?',
      'app windows ?',
      'je peux ouvrir skip dans un navigateur',
      'Skip existe sur Mac ?',
      'comment voir mon budget sur un grand écran',
      'application web ?',
      'je peux me connecter en ligne',
      'skip pc',
    ],
    answer:
      'Non. Skip est une app pour iPhone. Il n’y a pas de site où se connecter, ni de version pour ordinateur.\n\n' +
      'Ce qui s’en rapproche le plus : avec Skip Pro, tu peux exporter tes paiements en tableur ou en PDF et les ouvrir sur un ordinateur.\n\n' +
      'Si tu aimerais avoir Skip sur ordinateur, envoie l’idée depuis **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['web', 'site web', 'navigateur', 'ordinateur'],
  },
  {
    id: 'getting-started.internet.need',
    title: 'Ai-je besoin d’internet pour utiliser Skip ?',
    questions: [
      'Faut-il internet pour utiliser Skip ?',
      'skip marche hors ligne ?',
      'Je peux utiliser Skip sans wifi ?',
      'ça marche en mode avion',
      'Skip enregistre si j’ai pas de réseau ?',
      'Skip a besoin des données mobiles ?',
      'mode hors connexion ?',
      'je peux ajouter des reçus sans connexion',
      'skip consomme beaucoup de données',
      'pourquoi Skip a besoin d’une connexion',
      'je peux utiliser skip dans l’avion',
      'est-ce qu’il faut du réseau pour ouvrir l’app',
      'que se passe-t-il si je perds le signal en utilisant skip',
      'jai pas de data, skip marche quand meme ?',
    ],
    answer:
      'Oui. Skip a besoin d’une connexion internet pour ouvrir ta session, charger tes données et enregistrer les changements, parce que tout vit dans ton compte et pas seulement sur le téléphone. Le Wi-Fi comme les données mobiles fonctionnent.\n\n' +
      'Sans connexion :\n' +
      '- Les pages que tu as déjà ouvertes restent à l’écran, mais les nouvelles peuvent ne pas se charger.\n' +
      '- L’enregistrement ne fonctionne pas, et tu vois **Une erreur est survenue. Réessaie.** Rien n’est gardé pour être enregistré plus tard, alors réessaie une fois de nouveau en ligne.\n\n' +
      'La numérisation de reçu lit la photo sur ton iPhone lui-même, mais enregistrer le reçu demande quand même une connexion.',
    keywords: ['hors ligne', 'internet', 'wifi', 'mode avion'],
  },
  {
    id: 'getting-started.devices.two-phones',
    title: 'Puis-je utiliser Skip sur deux téléphones ?',
    questions: [
      'Je peux utiliser Skip sur deux téléphones ?',
      'skip se synchronise entre les appareils ?',
      'comment avoir Skip sur mon deuxième iPhone',
      'mes données vont apparaître sur mon autre téléphone ?',
      'je peux être connecté sur deux iPhone en même temps',
      'skip sur mon téléphone de travail et mon perso',
      'ça se synchronise ?',
      'y a une limite d’appareils',
      'pourquoi mon mode sombre est différent sur l’autre téléphone',
      'les rappels arrivent sur les deux téléphones ?',
      'Pro marche sur mon autre iphone',
      'plusieurs appareils même compte',
    ],
    answer:
      'Oui. Connecte-toi sur le deuxième iPhone comme sur le premier : le même identifiant Apple, le même compte Google, ou le même courriel et mot de passe. Tout ce que tu enregistres vit dans ton compte, donc les deux téléphones montrent les mêmes factures, cartes, reçus et chiffres.\n\nQuelques réglages sont propres à chaque téléphone, alors fais-les sur chacun :\n- **Apparence**, **Langue**, **Retour haptique** et **Verrouillage de l’app** dans **Réglages → Préférences**\n- Les magasins que Skip a retenus pour toi, et les corrections vocales\n\nPour que les rappels arrivent sur un téléphone, active un rappel ou le **Bilan mensuel** dans **Réglages → Préférences → Rappels** sur ce téléphone, et autorise les notifications quand on te le demande. Si tu as Skip Pro, il est lié à ton compte Skip, donc il fonctionne sur les deux.\n\nSe déconnecter sur un téléphone te déconnecte aussi sur l’autre.',
    keywords: ['synchro', 'deuxième téléphone', 'deux appareils', 'autre iphone'],
  },
  {
    id: 'getting-started.account.share',
    title: 'Mon partenaire peut-il partager mon compte ?',
    questions: [
      'Mon conjoint peut utiliser mon compte ?',
      'ma femme et moi on peut partager un budget',
      'mon mari peut voir mon budget',
      'comment inviter quelqu’un dans mon budget',
      'Deux personnes peuvent utiliser un même compte Skip ?',
      'compte commun avec mon mari',
      'budget partagé avec colocataire',
      'je peux ajouter ma copine à mon skip',
      'Skip permet de faire un budget de couple ?',
      'donner accès à mon partenaire',
      'partage familial skip',
    ],
    answer:
      'Skip est faite pour une seule personne par compte, et cela fait partie des **Conditions d’utilisation**. Il n’y a pas de budget partagé ou familial, ni de moyen d’inviter quelqu’un dans ton compte.\n\n' +
      'Ce qui s’en rapproche le plus : ton ou ta partenaire peut créer son propre compte Skip gratuit sur son iPhone. Pour une facture que vous partagez, chacun peut ajouter sa part dans son propre compte.\n\n' +
      'Si tu aimerais des budgets partagés, envoie l’idée depuis **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['conjoint', 'couple', 'partage', 'colocataire'],
  },
  {
    id: 'getting-started.skip.who-makes',
    title: 'Qui fait Skip ?',
    questions: [
      'Qui fait Skip ?',
      'qui est derrière cette app',
      'À qui appartient Skip Budget ?',
      'quelle entreprise a fait skip',
      'qui est le développeur',
      'skip est fait par une banque ?',
      'À qui je parle pour Skip ?',
      'qui dirige skip',
      'c est quoi l’équipe weknd',
      'comment joindre les gens qui font skip',
      'qui a créé skip budget',
      'c’est l’app de qui',
      'quelle équipe a développé skip',
    ],
    answer:
      'Skip est faite par l’équipe Weknd. Elle n’est pas faite par une banque, et il n’y a aucune publicité dedans.\n\n' +
      'Pour joindre l’équipe, va dans **Réglages → Assistance et commentaires** :\n' +
      '- **Écrire à l’assistance** si quelque chose ne va pas ou n’est pas clair\n' +
      '- **Partage une idée** pour quelque chose que tu aimerais que Skip fasse\n\n' +
      'Les réponses arrivent à l’adresse utilisée pour te connecter.',
    keywords: ['développeur', 'entreprise', 'weknd', 'équipe'],
  },
  {
    id: 'getting-started.account.required',
    title: 'Ai-je besoin d’un compte pour utiliser Skip ?',
    questions: [
      'Il faut un compte pour utiliser Skip ?',
      'je peux utiliser skip sans m’inscrire',
      'pourquoi je dois créer un compte',
      'on peut passer la connexion',
      'utiliser skip en invité',
      'y a un mode invité ?',
      'pourquoi skip veut mon email',
      'Je peux essayer Skip avant de créer un compte ?',
      'pas d’option sans compte ?',
      'pourquoi la connexion est obligatoire',
    ],
    answer:
      'Oui. Skip demande un compte avant que tu puisses ajouter quoi que ce soit. Tes données y sont gardées, donc elles sont en sécurité si tu perds ou changes de téléphone, et tu peux te connecter sur un autre iPhone.\n\n' +
      'En créer un prend une minute : **Continuer avec Apple**, **Continuer avec Google** ou **Continuer avec ton courriel**. Avec Apple et Google, pas besoin de mot de passe ni de code par courriel.',
    keywords: ['invité', 'sans compte', 'pourquoi un compte'],
  },

  // Opening Skip and the welcome pages

  {
    id: 'getting-started.launch.splash',
    title: 'C’est quoi l’animation quand Skip s’ouvre ?',
    questions: [
      'C’est quoi l’animation quand Skip s’ouvre ?',
      'pourquoi une vidéo se lance à chaque ouverture de l’app',
      'Je peux désactiver l’animation d’intro ?',
      'c’est quoi le truc avec le logo au début',
      'vidéo de l’écran d’ouverture',
      'pourquoi l’écran de démarrage est blanc en mode sombre',
      'la vidéo d’intro arrête ma musique ?',
      'passer l’écran de démarrage',
      'l’animation du logo m’énerve',
      'pourquoi l’écran d’ouverture est de couleur crème',
      'combien de temps dure l’animation d’ouverture',
      'l’animation du début me donne le tournis',
    ],
    answer:
      'C’est l’ouverture de Skip. Le symbole Skip grandit, le mot Skip apparaît, puis tout se fond dans l’app. Cela dure environ 2 secondes, et Skip se charge en dessous pendant ce temps.\n\n' +
      '- Elle est silencieuse et n’arrête pas la musique ni les podcasts que tu écoutes.\n' +
      '- Elle est toujours sur un fond crème clair, même en mode sombre. L’app passe à ton apparence dès qu’elle s’ouvre.\n' +
      '- Elle ne se lance que quand Skip démarre à neuf, pas quand tu reviens à Skip depuis une autre app.\n\n' +
      'Il n’y a aucun réglage pour la désactiver. Si **Réduire les animations** est activé dans **Réglages → Accessibilité → Mouvement** de ton iPhone, tu vois le logo final un instant au lieu de l’animation.',
    keywords: ['animation', 'intro', 'logo', 'écran de démarrage'],
  },
  {
    id: 'getting-started.launch.stuck',
    title: 'Skip reste bloquée sur le logo d’ouverture',
    questions: [
      'Skip est bloquée sur le logo',
      'l’app ne s’ouvre pas après l’écran de démarrage',
      'Skip gèle sur l’écran de départ',
      'bloqué sur l’écran crème',
      'l’animation d’ouverture ne finit jamais',
      'Skip ne s’ouvre pas',
      'l’app plante au lancement',
      'skip montre juste le logo et rien d’autre',
      'écran blanc quand j’ouvre skip',
      'ça charge sans fin sur le premier écran',
    ],
    answer:
      'Skip n’attend pas longtemps sur le logo. Si l’animation ne peut pas se lancer, Skip s’ouvre quand même après quelques secondes.\n\n' +
      'Si elle semble toujours bloquée :\n' +
      '1. Balaie vers le haut depuis le bas de l’écran et marque une pause pour voir tes apps ouvertes.\n' +
      '2. Balaie Skip vers le haut pour la fermer.\n' +
      '3. Rouvre Skip.\n\n' +
      'Si ça arrive à chaque fois, redémarre ton iPhone et regarde dans l’App Store s’il y a une mise à jour de Skip. Si elle ne s’ouvre toujours pas, écris à admin@skipapps.net pour qu’on regarde ce qui se passe.',
    keywords: ['bloqué', 'gelé', 'ne s’ouvre pas', 'écran blanc'],
  },
  {
    id: 'getting-started.welcome.page',
    title: 'Qu’y a-t-il sur l’écran de bienvenue ?',
    questions: [
      'Qu’est-ce qu’il y a sur l’écran de bienvenue ?',
      'sur quoi je touche en premier',
      'Comment je commence à utiliser Skip ?',
      'la première page dit ton argent ta vie privée, et maintenant ?',
      'Commencer ou se connecter, lequel choisir ?',
      'ça fait quoi le bouton commencer',
      'première ouverture de skip',
      'Je débute, par où commencer ?',
      'c’est quoi la page de bienvenue',
      'quel bouton je choisis si c’est ma première fois',
      'je viens d’installer skip, je touche quoi',
    ],
    answer:
      'L’écran de bienvenue est la première page que tu vois avant de te connecter. Il montre le symbole Skip, **Ton argent, ta vie privée.** et un rappel que Skip n’a jamais besoin de tes identifiants bancaires.\n\n' +
      'En bas, tu as deux choix :\n' +
      '- **Commencer** si c’est ta première fois. Deux courtes pages sur Skip s’affichent, puis tu crées ton compte.\n' +
      '- **Tu as déjà un compte ? Connecte-toi** si tu as déjà utilisé Skip.\n\n' +
      'Une fois ta session ouverte, Skip s’ouvre directement sur **Accueil**, et tu ne reverras plus cette page, sauf si tu te déconnectes.',
    keywords: ['bienvenue', 'commencer', 'premier écran', 'débuter'],
  },
  {
    id: 'getting-started.welcome.why',
    title: 'C’est quoi la page Pourquoi Skip ?',
    questions: [
      'C’est quoi la page Pourquoi Skip ?',
      'ça veut dire quoi conscience, confidentialité, contrôle',
      'comprends ton argent, ne te contente pas de l’automatiser, ça veut dire quoi',
      'c’est quoi la page après commencer',
      'page pourquoi skip expliquée',
      'que veut dire la citation sur le grand livre',
      'quelles sont les trois choses sur l’écran pourquoi skip',
      'Que veut dire C’est toi qui décides, pas un algorithme ?',
      'la page avec la citation sur les sous',
      'qu’est-ce que skip essaie de dire sur cette page',
    ],
    answer:
      '**Pourquoi Skip** est la page juste après **Commencer**. Elle explique l’idée derrière Skip : **Comprends ton argent. Ne te contente pas de l’automatiser.**\n\n' +
      'Elle a trois parties :\n' +
      '- **Conscience** : Chaque centime, bien compté.\n' +
      '- **Confidentialité** : Aucun identifiant bancaire. Jamais.\n' +
      '- **Contrôle** : C’est toi qui décides, pas un algorithme.\n\n' +
      'Autrefois, on notait chaque sou dans un grand livre. Skip ramène cette habitude dans la vie moderne, sans la paperasse. Touche **Continuer** en bas pour voir **Ce que Skip peut faire**.',
    keywords: ['pourquoi skip', 'conscience', 'contrôle', 'algorithme'],
  },
  {
    id: 'getting-started.welcome.can-do',
    title: 'Que montre la page Ce que Skip peut faire ?',
    questions: [
      'Que montre Ce que Skip peut faire ?',
      'quelles sont les cinq choses que skip peut faire',
      'la page avec le bouton c’est parti',
      'ça veut dire quoi des prêts suivis au plus juste',
      'une épargne claire et automatique, ça veut dire quoi',
      'toucher la liste des fonctions ne fait rien',
      'pourquoi je ne peux pas toucher les lignes de Ce que Skip peut faire',
      'page ce que skip peut faire expliquée',
      'la liste de l’intro, c’est toutes les fonctions ?',
      'que se passe-t-il quand j’appuie sur c’est parti',
    ],
    answer:
      '**Ce que Skip peut faire** est la dernière page avant de créer ton compte. Elle liste cinq choses :\n\n' +
      '- **Aucune connexion bancaire** : tes données bancaires restent toujours privées.\n' +
      '- **Numérise tes reçus en un instant** : lus sur ton téléphone, jamais envoyés.\n' +
      '- **Des prêts suivis au plus juste** : intérêts quotidiens, comme ta banque.\n' +
      '- **Une épargne claire et automatique** : le reste est épargné, calculs à l’appui.\n' +
      '- **Des rappels avant l’échéance** : factures, renouvellements et jour de paie, à l’avance.\n\n' +
      'Les lignes sont juste à lire, donc les toucher ne fait rien. Touche **C’est parti !** pour choisir comment t’inscrire.',
    keywords: ['ce que skip peut faire', 'fonctions', 'c’est parti', 'intro'],
  },
  {
    id: 'getting-started.welcome.stuck',
    title: 'Je ne trouve pas le bouton pour continuer',
    questions: [
      'je ne trouve pas le bouton pour continuer',
      'où est le bouton continuer',
      'bloqué sur la page pourquoi skip',
      'comment passer à la page suivante',
      'la page n’avance pas',
      'pas de bouton suivant sur l’intro',
      'le texte est trop gros, je ne vois pas c’est parti',
      'comment passer les pages d’intro',
      'les mots sont coupés en bas',
      'où est le bouton sur la page de bienvenue',
      'jsp ou est le bouton commencer',
    ],
    answer:
      'Le bouton pour avancer est toujours fixé en bas de l’écran, même quand la page est plus haute que ton écran :\n\n' +
      '- **Bienvenue** : **Commencer**\n' +
      '- **Pourquoi Skip** : **Continuer**\n' +
      '- **Ce que Skip peut faire** : **C’est parti !**\n\n' +
      'Si tu utilises un texte plus grand, une partie de la page peut se trouver sous le bouton. Balaie vers le haut sur la page pour lire le reste. Le bouton reste à sa place.',
    keywords: ['bloqué', 'continuer', 'suivant', 'texte trop gros'],
  },
  {
    id: 'getting-started.welcome.back',
    title: 'Comment revenir en arrière dans les pages de bienvenue ?',
    questions: [
      'Comment revenir à la page de bienvenue précédente ?',
      'je peux revoir les pages d’intro',
      'je veux relire la page pourquoi skip',
      'comment retourner à l’écran de bienvenue',
      'le balayage arrière ne ramène pas aux pages de bienvenue',
      'où est passée l’intro après mon inscription',
      'je peux rejouer l’intro',
      'retour depuis configure ta connexion',
      'comment revenir à l’écran de départ',
      'j’ai touché c’est parti trop vite, je peux revenir ?',
    ],
    answer:
      'Avant d’ouvrir ta session, tu peux aller et venir librement. Touche la flèche de retour en haut à gauche, ou balaie vers la droite depuis le bord gauche de l’écran.\n\n' +
      'Une fois ta session ouverte, les pages de bienvenue sont fermées derrière toi exprès, pour qu’un balayage ne puisse pas te faire sortir de l’app par erreur. Elles ne s’affichent de nouveau qu’après une déconnexion (**Réglages → Se déconnecter**, sous **Compte**).',
    keywords: ['retour', 'intro', 'pages de bienvenue', 'rejouer'],
  },

  // Creating an account

  {
    id: 'getting-started.signup.ways',
    title: 'Comment créer un compte ?',
    questions: [
      'Comment créer un compte ?',
      'comment je m’inscris',
      'faire un nouveau compte skip',
      'comment m’enregistrer ?',
      'quelles sont les façons de s’inscrire',
      'Où je m’inscris sur Skip ?',
      'étapes pour créer un compte',
      'stp comment je commence avec un compte',
      'c’est quoi configure ta connexion',
      'Page Configure ta connexion, je choisis quoi ?',
      'inscription nouvel utilisateur',
      'ça prend combien de temps pour créer un compte',
    ],
    answer:
      '1. Sur l’écran de bienvenue, touche **Commencer**.\n' +
      '2. Touche **Continuer**, puis **C’est parti !**\n' +
      '3. Sur **Configure ta connexion**, touche **Continuer avec Google**, **Continuer avec Apple** ou **Continuer avec ton courriel**.\n\n' +
      'Avec Apple ou Google, tu es dedans tout de suite. Avec le courriel, tu tapes ton courriel et un mot de passe, puis le code à 6 chiffres que nous t’envoyons par courriel.\n\n' +
      'Ensuite, Skip te demande comment t’appeler, puis affiche **Configurons Skip** pour te mettre en route.',
    keywords: ['inscription', 's’inscrire', 'créer un compte', 'nouveau compte'],
  },
  {
    id: 'getting-started.signup.which',
    title: 'Apple, Google ou courriel : lequel choisir ?',
    questions: [
      'Je m’inscris avec Apple, Google ou mon courriel ?',
      'quelle option de connexion est la meilleure',
      'quelle différence entre apple et courriel',
      'c’est mieux google ou email ?',
      'quelle connexion je dois choisir',
      'apple ou google pour se connecter',
      'ça change quelque chose comment je m’inscris',
      'quelle façon de se connecter est la plus sûre',
      'continuer avec apple ou continuer avec ton courriel',
      'Je peux changer ma façon de me connecter plus tard ?',
    ],
    answer:
      'N’importe laquelle convient, et elles donnent toutes le même Skip. Choisis celle que tu risques le moins de perdre :\n\n' +
      '- **Continuer avec Apple** : la plus rapide sur iPhone. Pas de mot de passe, confirmation avec Face ID ou ton code, et tu peux cacher ton courriel à Skip.\n' +
      '- **Continuer avec Google** : pratique si tu utilises Gmail. Pas de mot de passe Skip à retenir.\n' +
      '- **Continuer avec ton courriel** : fonctionne avec n’importe quelle adresse. Tu crées un mot de passe d’au moins 6 caractères et tu confirmes l’adresse avec un code à 6 chiffres.\n\n' +
      'Le plus important : utilise la même façon à chaque fois. Se connecter autrement peut ouvrir un autre compte, vide, et il n’y a aucun réglage pour changer de méthode plus tard.',
    keywords: ['apple', 'google', 'courriel', 'laquelle choisir'],
  },
  {
    id: 'getting-started.signup.email',
    title: 'Comment m’inscrire avec mon courriel ?',
    questions: [
      'Comment m’inscrire avec mon courriel ?',
      'continuer avec ton courriel, les étapes',
      'créer un compte avec email et mot de passe',
      'Où est l’inscription par courriel ?',
      'je veux pas utiliser apple ni google',
      'comment fonctionne crée ton compte',
      'm’inscrire sans identifiant apple',
      'Je peux utiliser mon adresse de travail ?',
      'inscription par email',
      'je peux mettre une adresse hotmail ou yahoo',
      'inscription avec adresse mail',
    ],
    answer:
      '1. Sur **Configure ta connexion**, touche **Continuer avec ton courriel**, sous les boutons Apple et Google.\n' +
      '2. Tape ton **Courriel**, un **Mot de passe**, et le même mot de passe de nouveau dans **Confirme le mot de passe**.\n' +
      '3. Touche **Créer un compte**.\n' +
      '4. Regarde ta boîte de réception pour un code à 6 chiffres et tape-le sur **Entre le code**. Skip le vérifie dès que le sixième chiffre est entré.\n\n' +
      'Toute adresse courriel que tu peux ouvrir convient. Ton mot de passe doit contenir au moins 6 caractères. Si tu as déjà un compte, touche plutôt **J’ai déjà un compte**.',
    keywords: ['inscription par courriel', 'email', 'mot de passe', 'gmail'],
  },
  {
    id: 'getting-started.signup.apple',
    title: 'Comment fonctionne Continuer avec Apple ?',
    questions: [
      'Comment fonctionne Continuer avec Apple ?',
      'se connecter avec identifiant apple',
      'C’est quoi Masquer mon adresse e-mail ?',
      'je devrais cacher mon courriel avec apple ?',
      'est-ce qu’apple donne mon courriel à skip',
      'Pourquoi mon courriel est une adresse bizarre privaterelay ?',
      'connexion avec apple',
      'm’inscrire avec face id',
      'la connexion apple demande un mot de passe ?',
      'qu’est-ce que skip reçoit de mon identifiant apple',
      'connexion apple, première fois',
    ],
    answer:
      '**Continuer avec Apple** utilise l’identifiant Apple de ton iPhone, donc pas de mot de passe Skip ni de code par courriel.\n\n' +
      '1. Touche **Continuer avec Apple** sur **Configure ta connexion** ou **Se connecter**.\n' +
      '2. Confirme avec Face ID ou ton code.\n' +
      '3. La première fois, Apple te laisse partager ton courriel ou choisir **Masquer mon adresse e-mail**. Cette option donne à Skip une adresse privée qui se termine par privaterelay.appleid.com et qui te transfère les messages.\n\n' +
      'Cela fonctionne pour les nouveaux comme pour ceux qui reviennent : le même identifiant Apple ouvre toujours le même compte Skip. Apple ne transmet pas ton nom à Skip, alors Skip te demande ensuite comment t’appeler.',
    keywords: ['apple', 'identifiant apple', 'masquer mon adresse', 'privaterelay'],
  },
  {
    id: 'getting-started.signup.google',
    title: 'Comment fonctionne Continuer avec Google ?',
    questions: [
      'Comment fonctionne Continuer avec Google ?',
      'se connecter avec gmail',
      'me connecter avec mon compte google',
      'Pourquoi ça dit Ouverture de Google ?',
      'il demande d’utiliser google.com pour se connecter, c’est ok ?',
      'm’inscrire avec google',
      'utiliser mon gmail pour skip',
      'la connexion google demande un mot de passe ?',
      'choisir un autre compte google',
      'Qu’est-ce que Skip reçoit de Google ?',
    ],
    answer:
      '**Continuer avec Google** te connecte avec ton compte Google, donc pas de mot de passe Skip ni de code par courriel.\n\n' +
      '1. Touche **Continuer avec Google**. Le message **Ouverture de Google…** s’affiche pendant le démarrage.\n' +
      '2. Ton iPhone peut te demander d’autoriser Skip Budget à utiliser google.com pour se connecter. Touche **Continuer**.\n' +
      '3. Choisis ton compte Google, ou connecte-toi à Google.\n\n' +
      'Le même compte Google ouvre toujours le même compte Skip, alors choisis le même à chaque fois. Si tu fermes la fenêtre Google, rien ne change et tu peux réessayer.',
    keywords: ['google', 'gmail', 'connexion google', 'ouverture de google'],
  },
  {
    id: 'getting-started.signup.other-methods',
    title: 'Puis-je me connecter avec mon numéro de téléphone ?',
    questions: [
      'Je peux me connecter avec mon numéro de téléphone ?',
      'connexion avec facebook',
      'Il y a une connexion Microsoft ?',
      'm’inscrire par sms',
      'je peux utiliser un code par texto au lieu du courriel',
      'autres façons de se connecter',
      'connexion avec instagram',
      'pas de connexion par numéro de téléphone ?',
      'je peux me connecter avec un lien magique',
      'Je peux utiliser une clé d’accès ?',
    ],
    answer:
      'Non. Skip a trois façons de se connecter : **Continuer avec Apple**, **Continuer avec Google** et **Continuer avec ton courriel** (courriel et mot de passe). Il n’y a pas de connexion par numéro de téléphone, message texte, Facebook, Microsoft ni un autre service.\n\n' +
      'Si tu aimerais une autre façon, envoie l’idée depuis **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['numéro de téléphone', 'sms', 'facebook', 'clé d’accès'],
  },
  {
    id: 'getting-started.signup.email-taken',
    title: 'Ça dit que ce courriel a déjà un compte',
    questions: [
      'ça dit que ce courriel a déjà un compte',
      'email déjà enregistré',
      'pourquoi je ne peux pas m’inscrire avec mon courriel',
      'Ce courriel a déjà un compte, mais je ne me suis jamais inscrit',
      'l’inscription dit que l’adresse est déjà prise',
      'j’ai déjà fait un compte avant et j’ai oublié',
      'impossible de créer un compte, courriel déjà utilisé',
      'erreur adresse mail existe déjà',
      'comment utiliser un courriel qui a déjà un compte',
      'message j’ai déjà un compte',
    ],
    answer:
      '**Ce courriel a déjà un compte.** veut dire qu’un compte Skip utilise déjà ce courriel, sans doute depuis une inscription précédente. Chaque courriel ne peut avoir qu’un seul compte Skip.\n\n' +
      '1. Touche **J’ai déjà un compte**.\n' +
      '2. Connecte-toi avec ton mot de passe.\n' +
      '3. Si tu ne t’en souviens pas, touche **Mot de passe oublié ?** sur la page **Se connecter**.\n\n' +
      'Si tu as d’abord utilisé Apple ou Google avec ce courriel, touche plutôt ce bouton sur **Se connecter**.',
    keywords: ['courriel déjà utilisé', 'déjà inscrit', 'compte existant'],
  },
  {
    id: 'getting-started.signup.bad-email',
    title: 'Ça dit que mon courriel ne semble pas valide',
    questions: [
      'ça dit que mon adresse courriel ne semble pas valide',
      'cette adresse courriel ne semble pas valide',
      'skip n’accepte pas mon email',
      'erreur email invalide',
      'pourquoi mon adresse mail est refusée',
      'mon courriel est bon mais ça dit que c’est faux',
      'email pas valide inscription',
      'erreur sur la case courriel',
      'format du courriel incorrect',
      'je n’arrive pas à taper mon courriel',
    ],
    answer:
      '**Cette adresse courriel ne semble pas valide.** veut dire qu’il y a une faute de frappe ou une partie manquante. Vérifie :\n\n' +
      '- Un @ et un point, comme nom@example.com\n' +
      '- Un espace dans l’adresse\n' +
      '- Une virgule à la place d’un point\n\n' +
      'Corrige et touche de nouveau le bouton. Si ton courriel est bon et que ça ne passe toujours pas, essaie plutôt **Continuer avec Apple** ou **Continuer avec Google**.',
    keywords: ['email invalide', 'adresse invalide', 'faute de frappe', 'format'],
  },
  {
    id: 'getting-started.signup.missing-fields',
    title: 'Ça dit d’indiquer mon courriel et mon mot de passe',
    questions: [
      'ça dit indique ton courriel et ton mot de passe',
      'erreur indique un courriel et un mot de passe',
      'Indique le courriel de ton compte, ça veut dire quoi ?',
      'pourquoi ça dit indique ton courriel alors que je l’ai fait',
      'le bouton connexion dit indique courriel et mot de passe',
      'erreur quand je touche créer un compte',
      'rien ne se passe quand je touche se connecter',
      'mot de passe oublié dit indique le courriel',
      'ça me redemande mon courriel sans arrêt',
      'erreur champ vide connexion',
    ],
    answer:
      'Ce message s’affiche quand une case est vide. Skip a besoin que toutes les cases soient remplies avant de continuer :\n\n' +
      '- **Indique ton courriel et ton mot de passe.** sur **Se connecter**\n' +
      '- **Indique un courriel et un mot de passe.** sur **Crée ton compte**\n' +
      '- **Indique le courriel de ton compte.** sur **Mot de passe oublié ?**\n\n' +
      'Touche chaque case et remplis-la, puis touche de nouveau le bouton. Si ton iPhone a rempli un mot de passe enregistré, vérifie que la case **Courriel** a été remplie aussi.',
    keywords: ['case vide', 'champ manquant', 'indique ton courriel'],
  },

  // Email codes

  {
    id: 'getting-started.code.what',
    title: 'À quoi sert le code à 6 chiffres ?',
    questions: [
      'À quoi sert le code à 6 chiffres ?',
      'pourquoi j’ai besoin d’un code de vérification',
      'Où je rentre le code ?',
      'c’est quoi la page entre le code',
      'comment vérifier mon courriel',
      'je peux coller le code ?',
      'le code se remplit tout seul ?',
      'ça dit indique les 6 chiffres',
      'confirmer mon email skip',
      'c’est quoi ce code otp',
      'je dois vérifier mon compte ?',
      'skip m’a envoyé un numéro par mail, je le tape où',
      'le mail contient des chiffres, ça sert à quoi',
    ],
    answer:
      'Quand tu t’inscris avec un courriel, Skip envoie un code à 6 chiffres à cette adresse. Le taper sur **Entre le code** prouve que le courriel est bien le tien, ce qui protège ton compte et te permettra de réinitialiser ton mot de passe plus tard.\n\n' +
      '- Tape ou colle le code. Ton iPhone peut aussi te le proposer au-dessus du clavier.\n' +
      '- Skip le vérifie dès que les 6 chiffres sont entrés, ou touche **Continuer**.\n' +
      '- **Indique les 6 chiffres.** veut dire qu’il manque un chiffre.\n' +
      '- Le même genre de code est envoyé quand tu utilises **Mot de passe oublié ?**.\n\n' +
      'La connexion avec Apple et Google n’a pas besoin de code.',
    keywords: ['code', 'otp', 'vérification', '6 chiffres'],
  },
  {
    id: 'getting-started.code.missing',
    title: 'Je n’ai pas reçu le code par courriel',
    questions: [
      'je n’ai pas reçu le code par courriel',
      'pas de courriel de vérification',
      'le code n’est jamais arrivé',
      'Où est mon code ?',
      'le mail de skip n’arrive pas',
      'comment renvoyer le code',
      'j’attends toujours le code à 6 chiffres',
      'vérifier les spams pour le code skip',
      'j’ai mal tapé mon email à l’inscription',
      'code de réinitialisation du mot de passe pas reçu',
      'rien dans ma boîte de réception de skip',
      'renvoyer le code ne marche pas',
      'pas de mail avec le code',
    ],
    answer:
      'Si le code n’est pas arrivé :\n\n' +
      '1. Regarde ton dossier de courrier indésirable (spam). Les courriels des nouvelles apps y arrivent parfois.\n' +
      '2. Vérifie l’adresse affichée sur **Entre le code**. S’il y a une faute de frappe, touche la flèche de retour et corrige-la.\n' +
      '3. Touche **Renvoyer le code** pour en recevoir un nouveau, et utilise celui du courriel le plus récent.\n' +
      '4. Laisse passer une minute entre les essais, pour ne pas atteindre la limite.\n\n' +
      'Pour **Mot de passe oublié ?**, un code n’arrive que si ce courriel a un compte Skip. Si tu as créé ton compte avec Apple ou Google, utilise plutôt ce bouton sur **Se connecter**.',
    keywords: ['pas de code', 'renvoyer le code', 'spam', 'courrier indésirable'],
  },
  {
    id: 'getting-started.code.wrong',
    title: 'Ça dit que mon code n’est pas le bon',
    questions: [
      'ça dit que mon code n’est pas le bon',
      'ce code n’est pas le bon, vérifie-le et réessaie',
      'code de vérification incorrect',
      'le code ne marche pas',
      'Pourquoi mon code est refusé ?',
      'j’ai tapé le code exactement mais ça échoue',
      'code invalide skip',
      'le code de mon courriel ne fonctionne pas',
      'mauvais code otp',
      'comment effacer les cases du code',
    ],
    answer:
      '**Ce code n’est pas le bon. Vérifie-le et réessaie.** veut dire que les chiffres ne correspondent pas au dernier code que nous avons envoyé.\n\n' +
      '- Utilise le code du courriel de Skip le plus récent. Si tu as demandé un nouveau code, les anciens peuvent ne plus fonctionner.\n' +
      '- Assure-toi que le code a été envoyé au même courriel que celui affiché sur la page.\n' +
      '- Pour corriger un chiffre, efface jusqu’à lui et retape.\n\n' +
      'Si ça continue d’échouer, touche **Renvoyer le code** et utilise le nouveau.',
    keywords: ['mauvais code', 'code invalide', 'code refusé', 'otp'],
  },
  {
    id: 'getting-started.code.expired',
    title: 'Ça dit que mon code a expiré',
    questions: [
      'ça dit que mon code a expiré',
      'ce code a expiré, demandes-en un nouveau',
      'code expiré',
      'combien de temps le code est valable',
      'Pourquoi mon code a expiré ?',
      'l’ancien code ne marche plus',
      'j’ai attendu trop longtemps pour entrer le code',
      'code de vérification expiré',
      'le code a dépassé le temps',
      'est-ce que le code s’épuise',
    ],
    answer:
      '**Ce code a expiré. Demandes-en un nouveau.** veut dire que le code est trop vieux pour être utilisé. Les codes ne durent qu’un temps limité, pour protéger ton compte.\n\n' +
      'Touche **Renvoyer le code** sur la même page, puis tape le code du courriel le plus récent. S’il n’est pas dans ta boîte de réception, regarde aussi ton dossier de courrier indésirable.',
    keywords: ['expiré', 'code expiré', 'ancien code'],
  },
  {
    id: 'getting-started.code.too-many',
    title: 'Ça dit trop de tentatives',
    questions: [
      'ça dit trop de tentatives',
      'trop de tentatives, attends une minute et réessaie',
      'bloqué après trop d’essais',
      'pourquoi je suis bloqué pour me connecter',
      'erreur limite de tentatives',
      'je peux réessayer maintenant ?',
      'j’ai touché renvoyer trop de fois',
      'combien de temps attendre pour me connecter',
      'trop de requêtes skip',
      'ça ne me laisse pas retenter mon mot de passe',
    ],
    answer:
      '**Trop de tentatives. Attends une minute et réessaie.** veut dire qu’il y a eu plusieurs essais en peu de temps, alors Skip fait une pause pour protéger ton compte. Il peut s’afficher quand tu ouvres ta session, quand tu demandes un code ou quand tu en entres un.\n\n' +
      'Attends une minute ou deux, puis réessaie une seule fois. Évite de demander un nouveau code plusieurs fois de suite : chaque demande compte, et seul le code le plus récent est valable.',
    keywords: ['trop de tentatives', 'bloqué', 'attendre', 'limite'],
  },
  {
    id: 'getting-started.code.later',
    title: 'Je n’ai jamais entré mon code, et maintenant ?',
    questions: [
      'je n’ai jamais entré mon code, et maintenant ?',
      'j’ai fermé l’app avant de vérifier',
      'comment finir mon inscription',
      'mon compte n’est pas confirmé',
      'Je peux vérifier mon courriel plus tard ?',
      'j’ai quitté pendant l’inscription',
      'connexion avec un compte non vérifié',
      'se connecter m’envoie encore un code',
      'pourquoi la connexion me demande un code',
      'inscription à moitié faite',
    ],
    answer:
      'Pas de souci. Ton compte attend simplement d’être confirmé.\n\n' +
      '1. Ouvre Skip et touche **Tu as déjà un compte ? Connecte-toi**.\n' +
      '2. Tape le courriel et le mot de passe avec lesquels tu as créé ton compte et touche **Se connecter**.\n' +
      '3. Skip envoie un nouveau code et ouvre **Entre le code**.\n' +
      '4. Tape le nouveau code et tu es dedans.\n\n' +
      'C’est aussi pour ça que la connexion peut demander un code : cela veut dire que le courriel n’a jamais été confirmé. Si tu as aussi oublié le mot de passe, touche **Mot de passe oublié ?** sur **Se connecter**.',
    keywords: ['non confirmé', 'finir l’inscription', 'vérifier plus tard'],
  },

  // Passwords

  {
    id: 'getting-started.password.rules',
    title: 'Quelles sont les règles du mot de passe ?',
    questions: [
      'Quelles sont les règles pour le mot de passe ?',
      'mon mot de passe doit faire combien de caractères',
      'le mot de passe doit contenir au moins 6 caractères',
      'il faut un chiffre ou un symbole dans le mot de passe ?',
      'exigences du mot de passe',
      'longueur minimale du mot de passe',
      'pourquoi mon mot de passe est trop court',
      'Les comptes Apple et Google ont un mot de passe Skip ?',
      'je peux mettre des espaces dans le mot de passe',
      'c’est quoi un bon mot de passe pour skip',
      'le mot de passe fait la différence entre majuscules et minuscules ?',
    ],
    answer:
      'Ton mot de passe Skip doit contenir au moins 6 caractères. Les lettres, les chiffres et les symboles conviennent tous, les majuscules comptent comme différentes des minuscules, et plus il est long, plus il est sûr.\n\n' +
      'S’il est plus court, tu verras **Le mot de passe doit contenir au moins 6 caractères.** Tu le tapes deux fois (**Mot de passe** et **Confirme le mot de passe**), pour qu’une faute de frappe ne puisse pas te bloquer.\n\n' +
      'Seuls les comptes par courriel ont un mot de passe Skip. **Continuer avec Apple** et **Continuer avec Google** n’en utilisent pas.',
    keywords: ['mot de passe', 'longueur', 'caractères', 'trop court'],
  },
  {
    id: 'getting-started.password.mismatch',
    title: 'Ça dit que les mots de passe ne correspondent pas',
    questions: [
      'ça dit que les mots de passe ne correspondent pas',
      'les mots de passe ne correspondent pas',
      'erreur confirme le mot de passe',
      'les mots de passe ne correspondent pas mais ils sont pareils',
      'pourquoi mes deux mots de passe ne correspondent pas',
      'c’est quoi confirmer le mot de passe',
      'confirme le nouveau mot de passe ne correspond pas',
      'erreur de non-concordance à l’inscription',
      'j’ai tapé deux fois le même mot de passe',
      'mot de passe et confirmation différents',
    ],
    answer:
      '**Les mots de passe ne correspondent pas.** veut dire que les deux cases de mot de passe ne sont pas exactement identiques. Une majuscule ou un espace en trop compte comme une différence.\n\n' +
      'Efface les deux cases et retape le mot de passe dans chacune (**Mot de passe** et **Confirme le mot de passe**, ou **Nouveau mot de passe** et **Confirme le nouveau mot de passe**), puis touche de nouveau le bouton.',
    keywords: ['ne correspondent pas', 'confirmer le mot de passe', 'différents'],
  },
  {
    id: 'getting-started.password.forgot',
    title: 'J’ai oublié mon mot de passe',
    questions: [
      'j’ai oublié mon mot de passe',
      'réinitialiser mon mot de passe',
      'comment récupérer mon compte',
      'je me souviens plus de mon mot de passe skip',
      'étapes mot de passe oublié',
      'où est mot de passe oublié',
      'je suis bloqué hors de mon compte',
      'comment rentrer sans mon mot de passe',
      'page choisis un nouveau mot de passe',
      'courriel de réinitialisation du mot de passe',
      'mot de pase perdu',
      'je vais perdre mes données si je réinitialise mon mot de passe ?',
    ],
    answer:
      'Tu peux en choisir un nouveau en quelques minutes :\n\n' +
      '1. Sur l’écran de bienvenue, touche **Tu as déjà un compte ? Connecte-toi**.\n' +
      '2. Touche **Mot de passe oublié ?** sous la case du mot de passe.\n' +
      '3. Tape le courriel de ton compte et touche **Continuer**.\n' +
      '4. Tape le code à 6 chiffres que nous t’envoyons par courriel sur **Entre le code**.\n' +
      '5. Sur **Choisis un nouveau mot de passe**, tape un nouveau mot de passe deux fois et touche **Continuer**.\n\n' +
      'Ta session s’ouvre et tu arrives sur **Accueil**, avec toutes tes données toujours là. La prochaine fois, connecte-toi avec le nouveau mot de passe.',
    keywords: ['mot de passe oublié', 'réinitialiser', 'récupérer', 'perdu'],
  },
  {
    id: 'getting-started.password.forgot-social',
    title: 'J’ai utilisé Apple ou Google, quel est mon mot de passe ?',
    questions: [
      'je me suis inscrit avec Apple, c’est quoi mon mot de passe ?',
      'quel est mon mot de passe si j’ai utilisé google',
      'je ne sais pas comment je me suis inscrit',
      'mot de passe oublié mais j’ai utilisé Apple',
      'pas de mot de passe avec la connexion apple',
      'comment me connecter si je me suis inscrite avec google',
      'je ne me souviens plus si c’était email ou apple',
      'quelle connexion j’ai utilisée',
      'réinitialiser le mot de passe d’un compte google',
      'mot de passe skip pour identifiant apple',
    ],
    answer:
      'Dans ce cas, il n’y a pas de mot de passe Skip. Quand tu t’inscris avec **Continuer avec Apple** ou **Continuer avec Google**, c’est Apple ou Google qui confirme que c’est bien toi, alors Skip ne crée jamais de mot de passe.\n\n' +
      'Pour ouvrir ta session, touche de nouveau le même bouton sur **Se connecter**. Si tu ne sais plus lequel tu as utilisé, essaie-en un : le bon ouvre ton compte avec toutes tes données. Si tu arrives plutôt dans un compte vide, va dans **Réglages**, touche **Se déconnecter** (sous **Compte**) et essaie l’autre façon.',
    keywords: ['mot de passe apple', 'mot de passe google', 'quelle connexion'],
  },
  {
    id: 'getting-started.password.change',
    title: 'Comment changer mon mot de passe ?',
    questions: [
      'Comment changer mon mot de passe ?',
      'changer le mot de passe dans les réglages',
      'où est le réglage du mot de passe',
      'mettre à jour mon mot de passe skip',
      'je veux un nouveau mot de passe mais je me souviens de l’ancien',
      'nouveau mot de passe en étant connecté',
      'je peux changer mon mot de passe dans l’app ?',
      'comment mettre un autre mot de passe',
      'l’option changer le mot de passe n’existe pas',
      'mon mot de passe a fuité, comment le changer',
    ],
    answer:
      'Il n’y a pas de réglage de mot de passe dans Skip, mais tu peux en définir un nouveau avec **Mot de passe oublié ?** :\n\n1. Va dans **Réglages** et touche **Se déconnecter** (sous **Compte**). Cela te déconnecte aussi sur tes autres téléphones.\n2. Sur l’écran de bienvenue, touche **Tu as déjà un compte ? Connecte-toi**.\n3. Touche **Mot de passe oublié ?**, tape ton courriel et touche **Continuer**.\n4. Tape le code à 6 chiffres reçu par courriel.\n5. Tape ton nouveau mot de passe deux fois et touche **Continuer**.\n\nTa session se rouvre avec tout là où tu l’avais laissé. Choisis un mot de passe que tu n’as jamais utilisé pour Skip. Si tu te connectes avec Apple ou Google, il n’y a pas de mot de passe Skip à changer.',
    keywords: ['changer le mot de passe', 'nouveau mot de passe', 'modifier'],
  },
  {
    id: 'getting-started.password.reset-error',
    title: 'Ça dit 6 caractères mais mon mot de passe est plus long',
    questions: [
      'ça dit au moins 6 caractères mais mon mot de passe est plus long',
      'choisis un nouveau mot de passe dit toujours trop court',
      'nouveau mot de passe refusé',
      'pourquoi skip n’accepte pas mon nouveau mot de passe',
      'je peux réutiliser mon ancien mot de passe ?',
      'le mot de passe doit contenir 6 caractères mais il en a 10',
      'erreur de réinitialisation même avec un long mot de passe',
      'impossible d’enregistrer le nouveau mot de passe',
      'même mot de passe qu’avant',
      'nouveau mot de passe pas accepté',
    ],
    answer:
      'Cela peut arriver sur **Choisis un nouveau mot de passe** quand le nouveau mot de passe est le même que l’ancien. Skip n’accepte pas de reprendre ton ancien mot de passe, et dans ce cas elle affiche **Le mot de passe doit contenir au moins 6 caractères.**\n\n' +
      'Tape un mot de passe que tu n’as jamais utilisé pour Skip, d’au moins 6 caractères, dans les deux cases, et touche **Continuer**.',
    keywords: ['trop court', 'même mot de passe', 'ancien mot de passe', 'refusé'],
  },

  // Signing in and out

  {
    id: 'getting-started.signin.how',
    title: 'Comment me connecter ?',
    questions: [
      'Comment me connecter ?',
      'où est la connexion',
      'j’ai déjà un compte, où je me connecte ?',
      'se connecter à skip',
      'comment me connecter sur un nouveau téléphone',
      'j’ai touché commencer mais j’ai déjà un compte',
      'page de connexion',
      'comment retrouver mon compte',
      'comment me conecter avec email et mot de passe',
      'où vont les utilisateurs qui reviennent',
      'j’ai réinstallé Skip, comment je me connecte ?',
      'connexion skip',
    ],
    answer:
      '1. Sur l’écran de bienvenue, touche **Tu as déjà un compte ? Connecte-toi**.\n' +
      '2. Tape ton **Courriel** et ton **Mot de passe**, puis touche **Se connecter**.\n\n' +
      'Si tu as créé ton compte avec Apple ou Google, touche plutôt **Continuer avec Apple** ou **Continuer avec Google**, plus bas sur la même page.\n\n' +
      'Tu as touché **Commencer** par erreur ? Tu peux quand même entrer : les boutons Apple et Google sur **Configure ta connexion** ouvrent ton compte existant, et **Crée ton compte** a **J’ai déjà un compte**.',
    keywords: ['connexion', 'se connecter', 'compte existant', 'login'],
  },
  {
    id: 'getting-started.signin.wrong-password',
    title: 'Ça dit que mon courriel et mon mot de passe ne correspondent pas',
    questions: [
      'ça dit que mon courriel et mon mot de passe ne correspondent pas',
      'ce courriel et ce mot de passe ne correspondent pas',
      'erreur mauvais mot de passe',
      'je n’arrive pas à me connecter alors que mon mot de passe est bon',
      'la connexion échoue tout le temps',
      'courriel ou mot de passe incorrect',
      'Pourquoi Skip ne me laisse pas me connecter ?',
      'ma connexion ne marche pas',
      'identifiants invalides',
      'je connais mon mot de passe mais ça dit non',
      'j’ai une erreur qui dit que mon email et mon mot de passe sont faux',
      'skip n’accepte pas mon mot de passe quand je me connecte',
    ],
    answer:
      '**Ce courriel et ce mot de passe ne correspondent pas.** veut dire que Skip n’a trouvé aucun compte avec exactement ce courriel et ce mot de passe.\n\n' +
      '- Vérifie qu’il n’y a pas de faute dans le courriel, et que c’est bien celui avec lequel tu as créé ton compte.\n' +
      '- Les mots de passe tiennent compte des majuscules. Cherche une majuscule que tu n’as pas voulue, ou un espace.\n' +
      '- Si tu as créé ton compte avec Apple ou Google, tu n’as pas de mot de passe Skip. Utilise plutôt ce bouton.\n' +
      '- Toujours bloqué ? Touche **Mot de passe oublié ?** pour en choisir un nouveau.\n\n' +
      'Après plusieurs essais d’affilée, Skip peut te demander d’attendre une minute.',
    keywords: ['mauvais mot de passe', 'connexion échouée', 'incorrect', 'identifiants'],
  },
  {
    id: 'getting-started.signin.social-error',
    title: 'La connexion avec Apple ou Google ne marche pas',
    questions: [
      'la connexion avec Apple ne marche pas',
      'continuer avec google ne fait rien',
      'Connecte-toi d’abord à un identifiant Apple sur cet appareil, ça veut dire quoi ?',
      'la connexion avec apple n’est pas disponible sur cet appareil',
      'erreur de connexion apple',
      'la connexion google échoue',
      'rien ne se passe après avoir choisi mon compte google',
      'j’ai fermé la fenêtre apple par erreur',
      'erreur après face id sur la connexion apple',
      'connexion google, une erreur est survenue',
      'la connexion apple échoue tout le temps',
      'je touche continuer avec apple et rien ne se passe',
      'le bouton google ne marche pas',
    ],
    answer:
      'Ça dépend de ce que tu vois :\n\n' +
      '- **Connecte-toi d’abord à un identifiant Apple sur cet appareil, puis réessaie.** : ouvre l’app Réglages de l’iPhone, connecte-toi à ton identifiant Apple tout en haut, puis réessaie.\n' +
      '- **La connexion avec Apple n’est pas disponible sur cet appareil.** : utilise plutôt **Continuer avec Google** ou **Continuer avec ton courriel**.\n' +
      '- **Une erreur est survenue. Réessaie.** : vérifie ta connexion internet et réessaie une fois.\n' +
      '- Il ne se passe rien : si tu as fermé la fenêtre Apple ou Google, Skip attend simplement. Touche de nouveau le bouton.\n\n' +
      'Si ça échoue toujours, essaie l’autre façon de te connecter seulement si tu débutes. Si tu as déjà un compte, continue avec la façon utilisée à l’inscription, pour ne pas te retrouver dans un deuxième compte.',
    keywords: ['erreur apple', 'erreur google', 'identifiant apple', 'pas disponible'],
  },
  {
    id: 'getting-started.signin.stay',
    title: 'Dois-je me connecter à chaque fois ?',
    questions: [
      'Je dois me connecter à chaque fois ?',
      'skip garde ma session ouverte ?',
      'pourquoi skip m’a déconnecté',
      'je reste connecté après avoir fermé l’app ?',
      'combien de temps dure ma connexion',
      'Je peux faire demander Face ID à l’ouverture de Skip ?',
      'rester connecté',
      'option se souvenir de moi',
      'skip m’a redemandé de me connecter',
      'faut-il me reconnecter après un redémarrage du téléphone',
      'l’app m’a déconnecté toute seule',
      'je dois taper mon mot de passe à chaque ouverture ?',
      'est-ce que l’app se souvient de moi quand je la rouvre',
    ],
    answer:
      'Non. Une fois ta session ouverte, Skip la garde ouverte sur cet iPhone, même après avoir fermé l’app ou redémarré le téléphone. Tu ne te reconnectes que si tu touches **Se déconnecter**, si tu supprimes puis réinstalles Skip, ou si tu changes de téléphone.\n\n' +
      'Si tu veux que Skip soit verrouillée à l’ouverture, active **Réglages → Préférences → Verrouillage de l’app**. Elle demande Face ID, Touch ID ou ton code avant l’ouverture de Skip.',
    keywords: ['rester connecté', 'se souvenir de moi', 'déconnecté', 'face id'],
  },
  {
    id: 'getting-started.signin.empty-account',
    title: 'Je me suis connecté et tout a disparu',
    questions: [
      'je me suis connecté et tout a disparu',
      'mes données ont disparu après la connexion',
      'tout est vide après ma connexion',
      'Pourquoi Skip affiche Configurons Skip alors que j’ai déjà tout configuré ?',
      'j’ai deux comptes par erreur',
      'connecté mais mes factures ont disparu',
      'où sont passés tous mes reçus après la connexion',
      'nouveau téléphone et skip est vide',
      'skip a supprimé mes données ?',
      'connexion avec apple et le compte est vide',
      'mes anciennes entrées ont disparu',
    ],
    answer:
      'Pas de panique. Ça veut presque toujours dire que tu es dans un autre compte, tout neuf, et non que quelque chose a été supprimé. Ça arrive quand tu te connectes autrement que la fois d’avant, par exemple avec Apple au lieu du courriel, ou avec une autre adresse courriel.\n\n' +
      'Pour retrouver tes données :\n' +
      '1. Va dans **Réglages** et touche **Se déconnecter** (sous **Compte**).\n' +
      '2. Connecte-toi de la façon utilisée au départ, avec le même courriel, le même identifiant Apple ou le même compte Google.\n\n' +
      'Si tu as utilisé Apple avec **Masquer mon adresse e-mail**, ton compte utilise l’adresse privée d’Apple, alors connecte-toi avec **Continuer avec Apple**. Si seules les entrées de plus de 90 jours manquent, c’est le forfait gratuit qui les masque. Elles sont conservées, et Skip Pro les réaffiche.',
    keywords: ['données disparues', 'compte vide', 'deuxième compte', 'mauvais compte'],
  },
  {
    id: 'getting-started.signout.how',
    title: 'Comment me déconnecter ?',
    questions: [
      'Comment me déconnecter ?',
      'se déconnecter de skip',
      'où est le bouton de déconnexion',
      'Est-ce que me déconnecter supprime mes données ?',
      'qu’est-ce qui se passe quand je me déconnecte',
      'quitter mon compte',
      'déconnexion',
      'je vais perdre quelque chose si je me déconnecte ?',
      'Skip demande confirmation avant de me déconnecter ?',
      'comment fermer ma session',
      'déconnecté par erreur',
    ],
    answer:
      'Va dans **Réglages**, fais défiler jusqu’à **Compte** et touche **Se déconnecter**. Skip te déconnecte tout de suite, sans question supplémentaire, et revient à l’écran de bienvenue.\n\nSe déconnecter ne supprime rien. Tes données restent dans ton compte, prêtes quand tu te reconnectes. Cela :\n- Te déconnecte aussi de tout autre téléphone où tu utilises Skip, alors tu devras t’y reconnecter aussi\n- Arrête l’arrivée des rappels Skip sur ce téléphone jusqu’à ce que tu te reconnectes\n- Oublie quelques éléments gardés seulement sur ce téléphone, comme les magasins que Skip avait retenus pour toi, les corrections vocales et les recherches récentes\n\nSupprimer ton compte pour de bon, c’est **Supprimer le compte**, juste en dessous. Il demande deux fois et c’est irréversible.',
    keywords: ['déconnexion', 'se déconnecter', 'quitter le compte'],
  },
  {
    id: 'getting-started.account.email-change',
    title: 'Puis-je changer mon adresse courriel ?',
    questions: [
      'Je peux changer mon adresse courriel ?',
      'modifier le courriel de mon compte',
      'comment changer mon email de connexion',
      'j’ai un nouveau mail, comment déplacer mon compte ?',
      'changer l’email dans les réglages',
      'mauvais courriel sur mon compte skip',
      'passer mon compte à un autre courriel',
      'modifier mon email',
      'mon ancien courriel ne marche plus',
      'transférer mes données vers un autre courriel',
    ],
    answer:
      'Pas dans Skip. Le courriel avec lequel tu as créé ton compte sert à le retrouver, donc il n’y a aucun réglage pour le changer, ni moyen de déplacer tes données vers un autre compte.\n\n' +
      'Si tu te connectes avec Apple ou Google, le courriel vient de ce compte. Si le changer est important pour toi, dis-le-nous depuis **Réglages → Assistance et commentaires → Écrire à l’assistance**.',
    keywords: ['changer le courriel', 'modifier l’email', 'nouveau courriel'],
  },
  {
    id: 'getting-started.account.which-email',
    title: 'Avec quel courriel suis-je connecté ?',
    questions: [
      'Avec quel courriel suis-je connecté ?',
      'où voir le courriel de mon compte',
      'c’est quoi l’email de mon compte skip',
      'comment savoir dans quel compte je suis',
      'Où Skip affiche mon courriel ?',
      'avec quelle adresse je me suis inscrit',
      'voir mon courriel de connexion',
      'quel identifiant apple skip utilise',
      'mon courriel de compte est affiché quelque part ?',
      'comment je sais de quel compte il s’agit',
    ],
    answer:
      'Tu peux le voir dans **Réglages → Assistance et commentaires → Écrire à l’assistance**. La case **Ton courriel** affiche l’adresse utilisée par ton compte. Tu n’as rien à envoyer, touche simplement retour.\n\n' +
      'Si elle se termine par privaterelay.appleid.com, tu as créé ton compte avec Apple et tu as choisi **Masquer mon adresse e-mail**. Continue d’utiliser **Continuer avec Apple** pour te connecter.',
    keywords: ['mon courriel', 'courriel du compte', 'quel compte'],
  },
  {
    id: 'getting-started.account.switch',
    title: 'Puis-je passer d’un compte à un autre ?',
    questions: [
      'Je peux passer d’un compte à un autre ?',
      'deux comptes skip sur un seul téléphone',
      'comment utiliser un autre compte',
      'changement de compte',
      'Je peux fusionner deux comptes Skip ?',
      'combiner mes comptes',
      'basculer vers mon autre compte',
      'mon compte de travail et mon compte perso sur le même téléphone',
      'comment changer de compte',
      'déplacer mes données d’un compte à un autre',
    ],
    answer:
      'Skip garde un seul compte à la fois sur un téléphone, et il n’y a pas de sélecteur de compte. Pour utiliser un autre compte :\n\n' +
      '1. Va dans **Réglages** et touche **Se déconnecter** (sous **Compte**).\n' +
      '2. Connecte-toi avec l’autre compte.\n\n' +
      'Chaque compte garde ses propres données, et rien n’est perdu quand tu te déconnectes. Il n’y a aucun moyen de fusionner deux comptes ni de déplacer des données de l’un à l’autre.',
    keywords: ['changer de compte', 'deux comptes', 'fusionner'],
  },
  {
    id: 'getting-started.signin.terms',
    title: 'Où sont les Conditions et la Politique de confidentialité ?',
    questions: [
      'Où sont les Conditions d’utilisation ?',
      'en continuant tu acceptes les conditions, elles sont où',
      'lire la politique de confidentialité avant de m’inscrire',
      'à quoi j’accepte quand je me connecte',
      'lien politique de confidentialité sur la page de connexion',
      'termes et conditions skip',
      'lien vers la politique de confidentialité',
      'où lire vos conditions',
      'conditions d’utilisation de skip',
      'c’est quoi la phrase d’accord sur la page de connexion',
      'cgu skip',
      'où trouver la politique de confidentialité dans l’app',
      'où est la déclaration de confidentialité',
      'montre-moi la politique de confidentialité',
    ],
    answer:
      'Sur la page **Se connecter**, la ligne **En continuant, tu acceptes les Conditions d’utilisation et la Politique de confidentialité** contient les deux sous forme de liens. Touche l’un ou l’autre pour le lire.\n\n' +
      'Une fois ta session ouverte, ils sont dans **Réglages → À propos** : **Politique de confidentialité** (ce qui est conservé, et qui d’autre peut le voir) et **Conditions d’utilisation**.\n\n' +
      'En bref : Skip ne conserve que ce que tu y mets, jamais tes identifiants bancaires, elle ne vend pas tes données, et tu peux tout supprimer depuis **Réglages**.',
    keywords: ['conditions', 'confidentialité', 'cgu', 'légal'],
  },

  // Name and picture

  {
    id: 'getting-started.hello.name',
    title: 'Pourquoi Skip me demande-t-elle mon nom ?',
    questions: [
      'Pourquoi Skip me demande mon nom ?',
      'c’est quoi la page comment veux-tu qu’on t’appelle',
      'je dois donner mon vrai nom ?',
      'je peux passer le nom',
      'ça sert à quoi le nom',
      'skip me demande mon nom à chaque connexion',
      'pourquoi apple n’a pas donné mon nom à skip',
      'passer pour l’instant sur la page du nom',
      'je peux mettre un surnom',
      'que se passe-t-il si je ne mets pas de nom',
      'étape du nom après l’inscription',
      'c’est quoi le crayon sur le grand cercle à l’inscription',
      'choisir une photo pendant l’inscription',
    ],
    answer:
      'Juste après avoir créé ton compte, Skip demande **Comment veux-tu qu’on t’appelle ?** Le nom que tu tapes dans **Ton nom** s’affiche en haut de **Accueil**. N’importe quel nom ou surnom convient.\n\n' +
      '- Touche **Continuer** pour l’enregistrer. Tu verras **Nom enregistré**.\n' +
      '- Touche **Passer pour l’instant** pour le laisser. **Accueil** affichera alors **Bienvenue** à la place.\n' +
      '- Touche la photo ronde avec le crayon pour ouvrir **Photo de profil**. Touche l’une des 15 photos et elle s’enregistre tout de suite.\n\n' +
      'Apple et Google ne transmettent pas ton nom à Skip, alors elle le demande dans tous les cas. Si tu le passes après une connexion avec Apple ou Google, elle le redemande à ta prochaine connexion. Tu peux modifier les deux plus tard dans **Réglages**, sous **Profil**.',
    keywords: ['nom', 'surnom', 'passer pour l’instant', 'crayon'],
  },

  // The setup checklist

  {
    id: 'getting-started.setup.what',
    title: 'C’est quoi Configurons Skip ?',
    questions: [
      'C’est quoi Configurons Skip ?',
      'c’est quoi la liste de configuration',
      'quelles sont les cinq étapes après l’inscription',
      'Pourquoi une étape est entourée en violet ?',
      'la bordure prune sur une étape veut dire quoi',
      'les numéros de 1 à 5 veulent dire quoi',
      'qu’est-ce que tout est prêt, ouvrir skip fait',
      'comment fonctionne la configuration',
      'la liste après que j’ai créé mon compte',
      'étapes barrées dans la configuration',
      'ça fait quoi continuer sur la liste',
    ],
    answer:
      '**Configurons Skip** est une courte liste que tu vois après avoir créé ton compte. Chaque étape ouvre la vraie page correspondante, et quand tu enregistres, tu reviens ici :\n\n' +
      '1. **Indique ta paie**\n' +
      '2. **Ajoute ta carte de crédit et ton compte bancaire**\n' +
      '3. **Ajoute tes factures**\n' +
      '4. **Ajoute tes abonnements**\n' +
      '5. **Ajoute un reçu** (Facultatif)\n\n' +
      'L’étape à faire ensuite a une bordure prune. Les étapes terminées reçoivent une coche prune et sont barrées. Touche **Continuer** pour ouvrir l’étape suivante, ou touche toi-même n’importe quelle étape. Quand les cinq sont faites, touche **Tout est prêt — ouvrir Skip**.',
    keywords: ['configuration', 'liste', 'étapes', 'tout est prêt'],
  },
  {
    id: 'getting-started.setup.later',
    title: 'Puis-je passer la configuration et la faire plus tard ?',
    questions: [
      'Je peux passer la configuration et la faire plus tard ?',
      'bouton configurer plus tard',
      'je veux juste regarder d’abord',
      'je dois finir la configuration ?',
      'sauter la configuration',
      'ça fait quoi passer le reçu, ouvrir skip',
      'quitter la configuration',
      'j’ai pas le temps de tout configurer maintenant',
      'je peux revenir à la configuration plus tard ?',
      'comment aller à l’accueil sans configurer',
      'je peux sauter les étapes et aller à l’accueil',
      'je ne suis pas prêt à tout ajouter, je peux entrer direct ?',
      'contourner la liste de configuration',
    ],
    answer:
      'Oui. Touche **Configurer plus tard** en bas de **Configurons Skip** et tu vas directement à **Accueil**. Tout ce que tu as déjà ajouté reste.\n\n' +
      'Les mêmes étapes t’attendent sur **Accueil**, dans la carte **Premiers pas**, qui coche chacune au fur et à mesure que tu ajoutes des choses. Tu peux aussi tout ajouter à tout moment avec **Ajout rapide** sur **Accueil**, ou depuis l’onglet **Cartes**.\n\n' +
      'Quand les quatre premières étapes sont faites, le lien du bas devient **Passer le reçu — ouvrir Skip**, puisque le reçu est facultatif.',
    keywords: ['configurer plus tard', 'passer la configuration', 'plus tard'],
  },
  {
    id: 'getting-started.setup.pay',
    title: 'C’est quoi l’étape Indique ta paie ?',
    questions: [
      'C’est quoi l’étape Indique ta paie ?',
      'pourquoi la paie est la première étape',
      'comment ajouter mon salaire pendant la configuration',
      'indique ta paie',
      'Je dois ajouter mon salaire ?',
      'je suis payé à l’heure, je mets quoi pour indique ta paie',
      'et si j’ai deux emplois dans la configuration',
      'j’ai pas de salaire, je peux passer l’étape 1 ?',
      'étape 1 configuration',
      'où va ma paie après la configuration',
    ],
    answer:
      '**Indique ta paie** est la première étape parce que ton **Solde actuel**, ton épargne et ton **Aperçu** comptent tous ce qui entre.\n\n' +
      'La toucher ouvre **Salaire**, où tu ajoutes ta paie : fixe ou à l’heure, combien, et à quelle fréquence. Tu peux ajouter autant de salaires que tu veux, avec tous les forfaits. Enregistre, et tu reviens sur la liste avec l’étape cochée.\n\n' +
      'Pas de paie régulière ? Tu peux laisser cette étape et faire les autres. Plus tard, ta paie se trouve dans **Cartes → Salaire**, ou **Ajout rapide → Salaire** sur **Accueil**.',
    keywords: ['indique ta paie', 'salaire', 'étape 1', 'revenu'],
  },
  {
    id: 'getting-started.setup.wallet',
    title: 'C’est quoi l’étape carte et compte bancaire ?',
    questions: [
      'C’est quoi l’étape carte et compte bancaire ?',
      'étape ajoute ta carte de crédit et ton compte bancaire',
      'étape 2 configuration',
      'pourquoi la configuration demande d’abord une carte de crédit',
      'je dois ajouter une carte et un compte ?',
      'c’est sécuritaire d’ajouter ma carte dans la configuration ?',
      'qu’est-ce que je tape pour ma carte dans la configuration',
      'combien de cartes je peux ajouter pendant la configuration',
      'formulaire de carte configuration',
      'je peux ajouter ma carte de débit',
      'quelles infos demande le formulaire de carte de crédit',
      'c’est quoi le jour d’échéance sur le formulaire de carte',
      'qu’est-ce que l’étape du compte bancaire demande',
    ],
    answer:
      'L’étape 2, **Ajoute ta carte de crédit et ton compte bancaire**, ajoute les endroits d’où part ton argent.\n\n' +
      '1. Touche l’étape. Le formulaire de carte de crédit s’ouvre d’abord : un nom pour la carte, son solde actuel et le jour où sa facture est due.\n' +
      '2. Enregistre la carte. Tu verras **Ajoute ton compte bancaire**.\n' +
      '3. Touche **Ajouter un compte bancaire** pour en ajouter un maintenant, ou **Passer** pour le laisser.\n\n' +
      'L’étape est cochée dans les deux cas, puisqu’une carte ou un compte suffit. Skip ne demande jamais un numéro de carte complet. Le forfait gratuit permet 1 carte de crédit et 1 compte bancaire.',
    keywords: ['carte de crédit', 'compte bancaire', 'étape 2', 'formulaire de carte'],
  },
  {
    id: 'getting-started.setup.no-card',
    title: 'Je n’ai pas de carte de crédit',
    questions: [
      'je n’ai pas de carte de crédit',
      'je peux passer l’étape de la carte de crédit ?',
      'je veux juste ajouter mon compte bancaire',
      'Il faut une carte de crédit pour utiliser Skip ?',
      'j’utilise juste du cash',
      'pas de carte de crédit, je fais quoi dans la configuration',
      'ajouter un compte bancaire sans carte',
      'j’ai seulement une carte de débit',
      'étape 2 sans carte de crédit',
      'je peux utiliser skip sans aucune carte',
      'je peux finir la configuration avec juste un compte bancaire',
      'j’ai un compte chèques et pas de carte de crédit, je fais quoi',
      'la configuration redemande une carte de crédit et j’en ai pas',
    ],
    answer:
      'Aucun problème. Une carte de crédit n’est pas obligatoire. L’étape 2 est cochée avec une carte de crédit ou un compte bancaire.\n\nL’étape de configuration ouvre d’abord le formulaire de carte de crédit, alors pour ajouter seulement un compte bancaire :\n1. Touche **Configurer plus tard**, ou reviens en arrière depuis le formulaire de carte puis touche **Configurer plus tard**.\n2. Ouvre l’onglet **Cartes** et touche **+ Ajouter** à côté de **Comptes bancaires**.\n3. Remplis le formulaire et touche **Ajouter le compte**. L’étape est cochée dans la carte **Premiers pas** sur **Accueil**.\n\nTu peux aussi n’ajouter ni l’un ni l’autre. Quand une facture demande **Payée avec**, tu peux choisir **Passer**.',
    keywords: ['pas de carte de crédit', 'cash', 'débit', 'compte bancaire seulement'],
  },
  {
    id: 'getting-started.setup.account-offer',
    title: 'C’est quoi la page Ajoute ton compte bancaire ?',
    questions: [
      'C’est quoi la page Ajoute ton compte bancaire ?',
      'la page après avoir enregistré ma carte dans la configuration',
      'ajouter un compte bancaire ou passer',
      'je devrais ajouter mon compte bancaire maintenant ?',
      'que se passe-t-il si je touche passer sur ajoute ton compte bancaire',
      'j’ai passé le compte bancaire, je peux l’ajouter plus tard ?',
      'pourquoi skip m’a demandé mon compte bancaire',
      'ajouter un compte bancaire, ça connecte à ma banque ?',
      'l’étape 2 est cochée mais je n’ai pas ajouté de compte bancaire',
      'Pourquoi Skip me demande d’ajouter un compte après ma carte ?',
      'écran ajoute ton compte bancaire',
      'je peux passer l’ajout d’un compte bancaire',
    ],
    answer:
      'Elle s’affiche pendant la configuration juste après l’enregistrement de ta première carte de crédit, puisque la plupart des paies arrivent dans un compte bancaire.\n\n- **Ajouter un compte bancaire** ouvre le formulaire de compte bancaire. Remplis-le et touche **Ajouter le compte**, et tu reviens à la liste de configuration.\n- **Passer** te ramène directement à la liste de configuration.\n\nL’étape est cochée dans les deux cas. Ajouter un compte ne te connecte pas à ta banque : tu tapes toi-même son nom et son solde. Ce n’est pas obligatoire non plus : sans compte, ta paie compte quand même dans ton **Solde actuel**. Tu peux en ajouter un à tout moment depuis **Cartes** : touche **+ Ajouter** à côté de **Comptes bancaires**.',
    keywords: [
      'ajoute ton compte bancaire',
      'ajouter un compte bancaire',
      'passer',
      'configuration',
    ],
  },
  {
    id: 'getting-started.setup.bills',
    title: 'Comment fonctionne l’étape Ajoute tes factures ?',
    questions: [
      'Comment fonctionne l’étape Ajoute tes factures ?',
      'ajouter mes factures dans la configuration',
      'étape 3 configuration',
      'je peux ajouter plusieurs factures pendant la configuration',
      'continuer à ajouter des factures',
      'quelles factures je dois ajouter',
      'comment corriger une facture ajoutée dans la configuration',
      'j’ai ajouté une facture, comment revenir à la liste de configuration ?',
      'loyer téléphone internet configuration',
      'la page des factures est vide pendant la configuration',
      'bouton ajouter une autre facture',
      'passer pour l’instant sur les factures',
      'je peux ajouter mes factures plus tard au lieu de maintenant',
      'où mène terminé sur ajoute tes factures',
    ],
    answer:
      '**Ajoute tes factures** est l’endroit où tu ajoutes chaque facture qui revient : loyer, téléphone, internet et ainsi de suite, une à la fois.\n\n1. Touche **Ajouter une facture**, remplis-la et enregistre.\n2. Tu reviens à la liste, qui montre chaque facture ajoutée.\n3. Touche **Ajouter une autre facture** pour la suivante, ou **Terminé** pour revenir à la liste de configuration.\n\nUne facture suffit pour cocher l’étape et remplir **À venir** sur **Accueil**. Touche une facture dans la liste pour la modifier. Pas le moment ? Touche **Passer pour l’instant** et ajoute des factures plus tard avec **Ajout rapide → Facture**.',
    keywords: ['ajoute tes factures', 'factures', 'étape 3', 'ajouter une autre facture'],
  },
  {
    id: 'getting-started.setup.subscriptions',
    title: 'Comment fonctionne l’étape des abonnements ?',
    questions: [
      'Comment fonctionne l’étape Ajoute tes abonnements ?',
      'ajouter mes abonnements dans la configuration',
      'étape 4 configuration',
      'ajouter netflix pendant la configuration',
      'ajouter un autre abonnement',
      'qu’est-ce qui compte comme abonnement dans la configuration',
      'la salle de sport, c’est une facture ou un abonnement ?',
      'comment modifier un abonnement ajouté dans la configuration',
      'page des abonnements pendant la configuration',
      'j’ai plein d’abonnements, je les ajoute tous maintenant ?',
    ],
    answer:
      '**Ajoute tes abonnements** sert à tout ce qui se renouvelle tout seul : Netflix, Spotify, le gym et ainsi de suite, un à la fois.\n\n' +
      '1. Touche **Ajouter un abonnement**, remplis-le et enregistre.\n' +
      '2. Tu reviens à la liste de ce que tu as ajouté.\n' +
      '3. Touche **Ajouter un autre abonnement**, ou **Terminé** pour revenir à la liste de configuration.\n\n' +
      'Un seul suffit pour cocher l’étape. Tu peux ajouter les autres à tout moment avec **Ajout rapide → Abonnement** sur **Accueil**. Touche-en un dans la liste pour le modifier, ou touche **Passer pour l’instant** pour laisser l’étape.',
    keywords: ['abonnements', 'étape 4', 'netflix', 'spotify'],
  },
  {
    id: 'getting-started.setup.receipt',
    title: 'Dois-je ajouter un reçu pendant la configuration ?',
    questions: [
      'Je dois ajouter un reçu ?',
      'ajouter un reçu, facultatif',
      'étape 5 configuration',
      'j’ai pas de reçu à ajouter',
      'pourquoi l’étape du reçu est facultative',
      'mon reçu de configuration compte dans mes numérisations gratuites ?',
      'Premiers pas dit 4 sur 5 à cause du reçu',
      'quel reçu je devrais ajouter en premier',
      'je peux taper le reçu au lieu de le numériser',
      'passer l’étape du reçu',
      'l’étape du reçu est obligatoire dans la configuration ?',
      'faut-il ajouter un reçu pour finir premiers pas',
      'je peux finir la liste premiers pas sans reçu',
      'la dernière étape est obligatoire ?',
    ],
    answer:
      'Non. **Ajoute un reçu** est la seule étape marquée **Facultatif**, et Skip fonctionne très bien sans elle.\n\n' +
      'Quand les étapes 1 à 4 sont faites, la liste propose **Ajouter un reçu** (numériser, importer ou taper un reçu) et **Passer le reçu — ouvrir Skip**.\n\n' +
      'Deux choses à savoir :\n' +
      '- Avec le forfait gratuit, une numérisation ou un import compte dans les 15 numérisations et les 15 imports que tu as chaque mois. Taper un reçu n’en compte pas.\n' +
      '- La carte **Premiers pas** sur **Accueil** affiche **4 sur 5 terminées** tant que tu n’ajoutes pas de reçu et ne masques pas la carte.',
    keywords: ['reçu', 'facultatif', 'étape 5', 'passer le reçu'],
  },
  {
    id: 'getting-started.setup.ticks',
    title: 'Pourquoi une étape est-elle cochée ou non ?',
    questions: [
      'Pourquoi une étape de la configuration est cochée ou non ?',
      'j’ai ajouté une facture mais l’étape n’est pas cochée',
      'comment cocher une étape',
      'je peux décocher une étape',
      'pourquoi je ne peux pas toucher une étape terminée',
      'l’étape s’est cochée toute seule',
      'mon prêt ne coche pas ajoute tes factures',
      'l’étape de configuration ne se met pas à jour',
      'comment skip sait qu’une étape est faite',
      'la coche a disparu',
      'j’ai supprimé ma facture et l’étape est revenue',
    ],
    answer:
      'Skip coche chaque étape toute seule, d’après ce qu’il y a dans ton compte. Tu ne peux pas cocher ni décocher une étape à la main :\n\n' +
      '- **Indique ta paie** : au moins un salaire\n' +
      '- **Ajoute ta carte de crédit et ton compte bancaire** : au moins une carte ou un compte bancaire\n' +
      '- **Ajoute tes factures** : au moins une facture dans tes factures mensuelles\n' +
      '- **Ajoute tes abonnements** : au moins un abonnement\n' +
      '- **Ajoute un reçu** : au moins un reçu\n\n' +
      'Une facture ajoutée depuis **Ajout rapide** coche donc aussi l’étape des factures. Un prêt que tu as gardé hors des factures mensuelles ne compte pas comme une facture. Supprime la seule chose derrière une étape et sa coche disparaît. Les étapes terminées ne se touchent pas ; modifie les choses depuis leurs propres pages.',
    keywords: ['coche', 'étape terminée', 'pas cochée'],
  },
  {
    id: 'getting-started.setup.again',
    title: 'Pourquoi la liste de configuration s’affiche-t-elle encore ?',
    questions: [
      'Pourquoi la liste de configuration est revenue ?',
      'la configuration s’affiche à chaque connexion',
      'pourquoi je vois configurons skip après ma connexion',
      'pourquoi Skip a sauté la liste de configuration',
      'je n’ai jamais vu les étapes de configuration',
      'après la connexion ça m’a envoyé direct à l’accueil',
      'la configuration revient tout le temps',
      'comment arrêter l’affichage de la configuration',
      'pourquoi la configuration n’est pas apparue pour moi',
      'connecté et j’ai eu la liste de configuration',
      'je me suis reconnecté et la page configurons skip est de retour, comme si mon compte était vide',
      'pourquoi skip me traite comme un nouvel utilisateur après la connexion',
      'à chaque connexion ça me demande de configurer skip',
    ],
    answer:
      '**Configurons Skip** s’affiche après la connexion seulement quand ton compte est vide et que tu n’as pas masqué la carte **Premiers pas**. Vide veut dire pas encore de paie, de cartes, de comptes, de factures, d’abonnements ni de reçus. Dès qu’il y a quoi que ce soit dans ton compte, la connexion mène directement à **Accueil**.\n\nSi tu la vois alors que tu t’attendais à retrouver tes données, tu es probablement dans un autre compte. Déconnecte-toi et reconnecte-toi de la façon utilisée avant.\n\nSi tu débutes, touche **Continuer** pour commencer, ou **Configurer plus tard**. Masquer la carte **Premiers pas** sur **Accueil** empêche aussi la liste de s’afficher à la connexion.',
    keywords: ['configuration de nouveau', 'liste de retour', 'direct à l’accueil'],
  },

  // The Getting started card on Home

  {
    id: 'getting-started.card.what',
    title: 'C’est quoi la carte Premiers pas ?',
    questions: [
      'C’est quoi la carte Premiers pas ?',
      'c’est quoi la liste sur l’accueil',
      '2 sur 5 terminées, ça veut dire quoi',
      'c’est quoi la barre violette sur la carte premiers pas',
      'premiers pas sur l’écran d’accueil',
      'la carte sous ajout rapide avec des étapes',
      'comment finir premiers pas',
      'toucher une étape sur premiers pas',
      'quand est-ce que premiers pas disparaît',
      'barre de progression sur l’accueil',
    ],
    answer:
      '**Premiers pas** est la carte sur **Accueil**, juste sous **Ajout rapide**. Elle montre les mêmes cinq étapes de configuration que la liste, pour que tu puisses finir de configurer quand tu veux.\n\n' +
      '- **2 sur 5 terminées**, par exemple, et la barre prune montrent où tu en es.\n' +
      '- Touche n’importe quelle étape sans coche pour l’ouvrir.\n' +
      '- Les étapes se cochent toutes seules quand tu ajoutes des choses, de n’importe où dans l’app.\n\n' +
      'La carte disparaît d’elle-même quand les cinq étapes sont terminées, ou quand tu touches le **X** pour la masquer.',
    keywords: ['premiers pas', 'liste', 'progression', 'sur 5 terminées'],
  },
  {
    id: 'getting-started.card.hide',
    title: 'Comment masquer la carte Premiers pas ?',
    questions: [
      'Comment masquer la carte Premiers pas ?',
      'retirer premiers pas de l’accueil',
      'fermer la carte de configuration',
      'le x sur premiers pas, ça fait quoi',
      'ignorer premiers pas',
      'je ne veux pas la liste sur l’accueil',
      'masquer premiers pas annule ma configuration ?',
      'me débarrasser de la boîte premiers pas',
      'désactiver premiers pas',
      'premiers pas est masqué aussi sur mon autre téléphone ?',
      'enlever la carte de configuration de mon écran d’accueil',
      'la carte de liste sur ma page d’accueil, je peux la fermer ?',
    ],
    answer:
      'Touche le **X** en haut à droite de la carte **Premiers pas** sur **Accueil**. Elle se masque tout de suite, et reste masquée sur chaque téléphone où tu ouvres ta session.\n\n' +
      'La masquer n’annule rien de ce que tu as configuré. Cela veut aussi dire que la liste de configuration ne s’affichera plus à la connexion.\n\n' +
      'Tu as changé d’idée ? Remets-la depuis **Réglages → Assistance et commentaires → Premiers pas**.',
    keywords: ['masquer', 'fermer', 'x', 'retirer premiers pas'],
  },
  {
    id: 'getting-started.card.back',
    title: 'Comment récupérer la carte Premiers pas ?',
    questions: [
      'Comment récupérer la carte Premiers pas ?',
      'remettre premiers pas',
      'j’ai masqué la liste par erreur',
      'réafficher les étapes de configuration',
      'où est passé premiers pas',
      'restaurer la carte premiers pas',
      'le guide de démarrage est de retour, c’est quoi ce message',
      'j’ai touché premiers pas dans les réglages mais rien ne s’affiche',
      'annuler le masquage de premiers pas',
      'la carte premiers pas a disparu de l’accueil',
      'Que fait Premiers pas dans Assistance ?',
      'remettre les étapes de configuration dans l’accueil',
      'la ligne premiers pas dans assistance et commentaires',
      'réactiver la carte de démarrage',
    ],
    answer:
      '1. Va dans **Réglages → Assistance et commentaires**.\n2. Touche **Premiers pas** (Réaffiche les étapes de configuration dans Accueil).\n\nSkip t’amène à **Accueil** et affiche **Le guide de démarrage est de retour**. La carte montre de nouveau les cinq étapes, avec celles que tu as faites cochées.\n\nSi les cinq étapes sont déjà terminées, il n’y a plus rien à afficher, donc la carte reste absente.',
    keywords: ['premiers pas de retour', 'restaurer', 'réafficher', 'assistance et commentaires'],
  },
  {
    id: 'getting-started.card.reappeared',
    title: 'Pourquoi Premiers pas est-elle revenue ?',
    questions: [
      'Pourquoi Premiers pas est revenu ?',
      'la carte de configuration est réapparue sur l’accueil',
      'premiers pas est réapparu',
      'j’avais fini la configuration mais la carte est de retour',
      'pourquoi premiers pas est de nouveau sur l’accueil',
      'la liste est revenue toute seule',
      'premiers pas est revenu après avoir supprimé une facture',
      'la carte dit encore 4 sur 5',
      'premiers pas n’arrête pas de revenir',
      'pourquoi une étape est de nouveau ouverte',
    ],
    answer:
      'La carte revient toute seule quand une étape qu’elle avait cochée n’est plus faite. Par exemple, si tu supprimes ta seule facture, **Ajoute tes factures** n’est plus terminée, alors la carte s’affiche de nouveau avec cette étape ouverte.\n\n' +
      'Ajoute de nouveau ce qui manque, ou touche le **X** de la carte pour la masquer. Une fois masquée, elle reste absente jusqu’à ce que tu la remettes depuis **Réglages → Assistance et commentaires → Premiers pas**.',
    keywords: ['revenue', 'réapparue', 'de nouveau'],
  },

  // Getting around

  {
    id: 'getting-started.start.first',
    title: 'Que dois-je faire en premier ?',
    questions: [
      'Que dois-je faire en premier ?',
      'par où je commence',
      'comment configurer skip',
      'la meilleure façon de commencer avec skip',
      'dans quel ordre ajouter les choses',
      'combien de temps prend la configuration',
      'je suis perdu, c’est quoi la première chose à ajouter ?',
      'premiers pas dans skip',
      'il me faut quoi pour démarrer',
      'qu’est-ce que j’ajoute après l’inscription',
      'je viens de télécharger l’app, je commence où',
      'je viens d’installer skip, c’est quoi l’étape un',
      'j’ai un compte tout neuf, je configure quoi en premier',
      'j’ai téléchargé skip aujourd’hui, qu’est-ce qui vient d’abord',
    ],
    answer:
      'Ajoute d’abord ta paie, puisque la plupart des chiffres de Skip partent de ce qui entre. Ensuite, suis **Configurons Skip** après l’inscription, ou la carte **Premiers pas** sur **Accueil** :\n\n' +
      '1. **Indique ta paie**\n' +
      '2. **Ajoute ta carte de crédit et ton compte bancaire**\n' +
      '3. **Ajoute tes factures**\n' +
      '4. **Ajoute tes abonnements**\n' +
      '5. **Ajoute un reçu** (facultatif)\n\n' +
      'Cela prend quelques minutes, et tu peux t’arrêter à tout moment. Après, l’habitude de tous les jours est rapide : ajoute ce que tu dépenses avec **Ajout rapide** sur **Accueil**.',
    keywords: ['premier', 'commencer', 'démarrer', 'ordre'],
  },
  {
    id: 'getting-started.nav.tabs',
    title: 'C’est quoi les onglets en bas ?',
    questions: [
      'C’est quoi les onglets en bas ?',
      'que veulent dire les icônes en bas',
      'comment je me déplace dans l’app',
      'c’est quoi l’icône de maison',
      'l’icône du portefeuille sert à quoi',
      'c’est quoi l’éclair',
      'pourquoi un onglet affiche un nom et pas les autres',
      'barre de navigation expliquée',
      'toucher l’onglet où je suis ne fait rien',
      'le menu en bas de l’écran',
      'où est le menu',
    ],
    answer:
      'La barre du bas te permet de te déplacer dans Skip. L’onglet où tu es s’affiche en pastille prune avec son nom ; les autres montrent seulement une icône.\n\n' +
      '- **Accueil** (maison) : ton **Solde actuel**, **Ajout rapide**, où est passé ton argent ce mois-ci, et jour après jour\n' +
      '- **Cartes** (portefeuille) : cartes de crédit, comptes bancaires, et **Salaire**, **Épargne**, **Prêts** et **Objectifs**\n' +
      '- **Activité** (reçu) : tout ce que tu as enregistré, dans une seule liste\n' +
      '- **Réglages** (éclair) : Skip Pro, ton profil, tes préférences, l’aide et la déconnexion\n\n' +
      'Le bouton rond à l’extrémité droite sert à ajouter par la voix. Toucher l’onglet où tu es déjà ne fait rien.',
    keywords: ['onglets', 'barre du bas', 'menu', 'icônes'],
  },
  {
    id: 'getting-started.nav.voice',
    title: 'C’est quoi le bouton rond dans la barre du bas ?',
    questions: [
      'C’est quoi le bouton rond dans la barre d’onglets ?',
      'c’est quoi le cercle violet en bas à droite',
      'pourquoi le bouton rond dit pro',
      'le bouton avec les ondes sonores sert à quoi',
      'bouton vocal',
      'le gros bouton à côté des onglets',
      'le bouton rond ne fait rien quand je le touche',
      'bouton pour ajouter par la voix',
      'je peux cacher le bouton vocal',
      'c’est quoi le badge pro sur le bouton',
      'quand je touche le cercle ça ouvre une page pro',
    ],
    answer:
      'C’est le bouton vocal, à l’extrémité droite de la barre d’onglets, sur chaque onglet. Avec Skip Pro, touche-le et dis par exemple « Netflix $15.99 every month » pour ajouter un reçu, une facture ou un abonnement. Tu vérifies ce que Skip a entendu avant que quoi que ce soit soit enregistré.\n\n' +
      'Avec le forfait gratuit, il porte un petit badge **Pro**. Le toucher montre ce que fait la Saisie vocale, avec un moyen d’obtenir Skip Pro, ou **Pas maintenant** pour revenir.\n\n' +
      'Juste après l’ouverture de Skip, le bouton attend un instant de connaître ton forfait, alors un toucher très rapide peut ne rien faire. Touche simplement de nouveau. Il n’y a aucun réglage pour le masquer.',
    keywords: ['bouton vocal', 'bouton rond', 'badge pro', 'ajouter par la voix'],
  },
  {
    id: 'getting-started.nav.back',
    title: 'Comment revenir à la page précédente ?',
    questions: [
      'Comment revenir à la page précédente ?',
      'il n’y a pas de bouton retour',
      'le balayage arrière ne marche pas',
      'comment fermer une page',
      'comment quitter cet écran',
      'flèche de retour',
      'pourquoi je ne peux pas balayer pour revenir quand j’ajoute quelque chose',
      'revenir en arrière d’une étape',
      'comment retourner à l’écran précédent',
      'bloqué sur une page, comment sortir',
    ],
    answer:
      'Touche la flèche de retour en haut à gauche, ou balaie vers la droite depuis le bord gauche de l’écran. Sur les quatre onglets principaux, il n’y a rien où revenir ; touche plutôt un autre onglet dans la barre.\n\n' +
      'Pendant que tu ajoutes quelque chose en plusieurs étapes, le balayage est désactivé pour que tu ne perdes pas ton travail par accident. Utilise la flèche pour revenir d’une étape. Si tu quittes en cours de route, Skip demande avant de jeter ce que tu as tapé.',
    keywords: ['retour', 'revenir', 'balayer', 'flèche'],
  },
  {
    id: 'getting-started.nav.find',
    title: 'Où trouver chaque chose dans Skip ?',
    questions: [
      'Où trouver les choses dans Skip ?',
      'quel onglet a mes factures',
      'où est mon salaire',
      'où trouver les prêts',
      'où est l’épargne',
      'où est la cloche',
      'où sont les réglages des rappels',
      'plan de l’app',
      'je ne trouve rien dans cette app',
      'où est tout',
      'où trouver les reçus',
      'où est la section d’aide',
    ],
    answer:
      'Voici où se trouve chaque chose :\n\n' +
      '- **Salaire** : **Cartes → Salaire**, ou **Ajout rapide → Salaire** sur **Accueil**\n' +
      '- Cartes de crédit et comptes bancaires : l’onglet **Cartes**\n' +
      '- **Factures mensuelles**, **Abonnements** et **Reçus** : **Accueil**, sous **Où est passé ton argent**\n' +
      '- **Prêts** : **Accueil → Va plus loin**, ou **Cartes → Prêts**\n' +
      '- **Habitudes de dépense** : **Accueil → Va plus loin**\n' +
      '- **Épargne** et **Objectifs** : l’onglet **Cartes**\n' +
      '- **Aperçu** : **Accueil**, sous **Va plus loin**\n' +
      '- Tout ce que tu as enregistré : l’onglet **Activité**\n' +
      '- **Notifications** : la cloche en haut à droite de **Accueil**\n' +
      '- **Rappels** : **Réglages → Préférences**\n' +
      '- Aide : **Réglages → Assistance et commentaires**',
    keywords: ['où', 'trouver', 'plan', 'perdu'],
  },
  {
    id: 'getting-started.help.tour',
    title: 'Y a-t-il une visite guidée ou un tutoriel ?',
    questions: [
      'Il y a une visite guidée ou un tutoriel ?',
      'comment apprendre à utiliser skip',
      'y a un guide ?',
      'un tour de l’app',
      'montre-moi comment fonctionne skip',
      'où est la page d’aide',
      'y a des vidéos pour apprendre skip',
      'il y a une faq ?',
      'je peux refaire le tutoriel',
      'revoir le guide de démarrage',
    ],
    answer:
      'Il n’y a pas de visite à part. Skip te guide au fur et à mesure :\n\n' +
      '- Les pages de bienvenue expliquent ce qu’est Skip avant l’inscription.\n' +
      '- **Configurons Skip** et la carte **Premiers pas** sur **Accueil** te guident à travers les cinq étapes de configuration.\n' +
      '- **Réglages → Assistance et commentaires → Questions fréquentes** contient de courtes réponses.\n\n' +
      'Et tu peux me demander n’importe quoi, à tout moment.',
    keywords: ['visite guidée', 'tutoriel', 'guide', 'faq'],
  },
  {
    id: 'getting-started.platform.ios-version',
    title: 'Quel iPhone et quel iOS me faut-il ?',
    questions: [
      'skip marche sur ios 16 ?',
      'quel iphone il me faut',
      'version minimale d’ios',
      'Skip va fonctionner sur mon vieil iPhone ?',
      'je peux utiliser skip sur un iphone 8',
      'l’app ne s’installe pas, ios trop ancien',
      'nécessite une version plus récente d’ios',
      'ça marche sur iphone se ?',
      'quel ios pour skip',
      'skip n’est pas compatible avec mon iphone',
    ],
    answer:
      'Skip a besoin d’iOS 16.4 ou plus récent. Cela couvre l’iPhone 8, l’iPhone SE (2e génération) et tous les iPhone plus récents.\n\nSi l’App Store dit que Skip a besoin d’un iOS plus récent, mets ton iPhone à jour dans **Réglages → Général → Mise à jour logicielle**, puis réessaie.\n\nQuelques fonctions demandent aussi quelque chose du téléphone : la numérisation a besoin de l’appareil photo, le **Verrouillage de l’app** a besoin de Face ID ou Touch ID configuré, et la **Saisie vocale** a besoin que la Dictée soit activée.',
    keywords: ['version ios', 'ios 16', 'vieil iphone', 'compatible'],
  },
  {
    id: 'getting-started.nav.icons',
    title: 'Que font le crayon, la corbeille et le + ?',
    questions: [
      'à quoi sert l’icône crayon',
      'que veut dire l’icône de corbeille',
      'la poubelle sert à quoi',
      'bouton crayon en haut à droite',
      'signification des icônes dans skip',
      'le signe plus sert à quoi',
      'comment modifier quelque chose dans skip',
      'où est le bouton modifier',
      'comment supprimer des choses dans skip',
      'le petit crayon sur un logo, il fait quoi',
      'c’est quoi le crayon',
    ],
    answer:
      'Ils fonctionnent de la même façon partout dans Skip :\n\n- **Crayon** : modifie. Il est en haut d’une page de reçu, de facture, d’abonnement, de carte ou de compte, et sur les objectifs, les mois d’épargne et les cartes d’habitude. Un petit crayon sur un logo change le logo.\n- **Corbeille** : supprime. Sur **Salaire**, elle supprime une source de paie (touche **Enregistrer** pour terminer), et sur la page **Rappels**, elle supprime un rappel.\n- **+** : ajoute, comme **+ Ajouter** sur **Cartes** ou le **+** sur **Factures mensuelles**.\n\nPour supprimer la plupart des choses, ouvre-les, touche le crayon et cherche **Supprimer** en bas. Skip demande avant de supprimer un reçu, une facture, un abonnement, un prêt, une carte, un compte, un objectif ou une habitude.',
    keywords: ['crayon', 'corbeille', 'poubelle', 'plus'],
  },
];
