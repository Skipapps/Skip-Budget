import type { IntentText } from '@/lib/ask-sam/types';

export const billsSubscriptionsFr: IntentText[] = [
  {
    id: 'bills.basics.difference',
    title: 'Quelle différence entre une facture et un abonnement ?',
    questions: [
      'Quelle est la différence entre une facture et un abonnement ?',
      'facture ou abonnement',
      'Netflix, je le mets en facture ou en abonnement ?',
      "Mon loyer c'est une facture ou un abonnement dans Skip ?",
      'où je mets mon abonnement de gym, factures ou abonnements',
      "c'est quoi une facture dans l'app",
      "qu'est-ce qui compte comme abonnement",
      'est-ce que ça change quelque chose si je mets un abonnement en facture',
      'mon forfait téléphone, facture ou abonnement ?',
      'pourquoi il y a factures et abonnements séparés',
      'difference facture abonnement',
      'assurance auto : facture ou abonnement ?',
      'jsp si je dois mettre ça en facture ou abonnement',
      'gym : facture ou abo ?',
    ],
    answer:
      'Les deux sont des paiements qui reviennent, et Skip les compte de la même façon : chacun sort à sa date et fait baisser ton **Solde actuel**. La différence, c’est la façon de les décrire.\n\n' +
      '- Une **facture**, c’est par exemple le loyer, l’électricité, l’eau, Internet, le téléphone, l’assurance ou les frais de scolarité. Tu choisis une **Catégorie**, une **Date de paiement** et la **Récurrence**.\n' +
      '- Un **abonnement**, c’est un service qui se renouvelle tout seul, comme Netflix, Spotify ou le gym. Tu cherches le **Service** (son logo vient avec), tu choisis un **Cycle de facturation** et le **Prochain renouvellement**, et tu pourras le marquer **Annulé** plus tard.\n\n' +
      'Choisis ce qui te semble le plus juste. Les factures sont dans **Factures mensuelles**, les abonnements dans **Abonnements**. Les prêts ont leur propre page, **Prêts**.',
    keywords: ['facture', 'abonnement', 'différence', 'paiement récurrent'],
  },
  {
    id: 'bills.find.where',
    title: 'Où voir mes factures ?',
    questions: [
      'Où voir mes factures ?',
      'dans quel menu se trouvent mes factures',
      'je trouve pas la page des factures',
      "comment j'accède aux factures mensuelles",
      'Où est la liste de toutes mes factures ?',
      'page factures',
      'où sont passées mes factures',
      'il y a un onglet factures ?',
      "comment ouvrir une facture que j'ai ajoutée",
      'où je vois les factures à payer ce mois-ci',
      'montre-moi mes factures récurrentes',
      'ou est ma liste de factures stp',
      'qu’est devenue la page Tes factures',
      'ou trouver mes factures',
    ],
    answer:
      'Tes factures sont sur la page **Factures mensuelles**. Il y a deux façons d’y aller :\n\n' +
      '- Sur **Accueil**, sous **Où est passé ton argent**, touche **Factures mensuelles**.\n' +
      '- Va dans **Réglages → Ton argent → Factures**.\n\n' +
      'La page montre ce qui est à payer dans le mois, ce qui est encore **À venir**, chaque facture sous **Toutes les factures**, et celles que tu as arrêtées sous **Arrêtées**. Touche une facture pour ouvrir sa page. Pour en ajouter une, touche le **+** en haut à droite.\n\n' +
      'Si tu n’en as pas encore ajouté, la page affiche **Pas encore de factures** avec un bouton **Ajouter une facture**.',
    keywords: ['factures mensuelles', 'page des factures', 'tes factures', 'liste des factures'],
  },
  {
    id: 'subscriptions.find.where',
    title: 'Où voir mes abonnements ?',
    questions: [
      'Où voir mes abonnements ?',
      'où sont mes abonnements',
      'page abonnements',
      "comment retrouver Netflix que j'ai ajouté",
      'je trouve mes abonnements nulle part',
      'Où est la liste de tous mes abonnements ?',
      'comment ouvrir les abonnements',
      'où je regarde mes services de streaming',
      "montre-moi les abonnements que j'ai",
      'il y a une page pour les abonnements ?',
      'où sont passés mes abos',
      'ou voir mes abonnements stp',
      "ou sont mes abonnements dans l'app",
      'je vois pas mes abonnements',
    ],
    answer:
      'Tes abonnements sont sur la page **Abonnements**. Il y a deux façons d’y aller :\n\n' +
      '- Sur **Accueil**, sous **Où est passé ton argent**, touche **Abonnements**.\n' +
      '- Va dans **Réglages → Ton argent → Abonnements**.\n\n' +
      'La page montre ce qui est à payer dans le mois, ce qui est encore **À venir**, chaque abonnement actif sous **Tous les abonnements**, et ceux que tu as annulés sous **Annulés**. Touches-en un pour ouvrir sa page, ou le **+** en haut à droite pour en ajouter un.',
    keywords: ['page abonnements', 'abos', 'mes abonnements', 'streaming'],
  },
  {
    id: 'bills.add.how',
    title: 'Comment ajouter une facture ?',
    questions: [
      'Comment ajouter une facture ?',
      'ajouter facture',
      'comment je mets mon loyer',
      "je veux ajouter ma facture d'électricité",
      'comment ajouter une facture récurrente',
      'Où je saisis ma facture de téléphone ?',
      'nouvelle facture',
      'comment suivre ma facture Internet',
      'ajouter un paiement mensuel',
      'comment configurer mes factures',
      'étapes pour ajouter une facture',
      'le moyen le plus rapide pour ajouter une facture',
      "je paie mon propriétaire chaque mois, comment j'ajoute ça",
      'Factures mensuelles affiche Pas encore de factures',
    ],
    answer:
      'Touche **Ajout rapide → Facture** sur **Accueil**, ou le **+** sur **Factures mensuelles**. Ensuite :\n\n' +
      '1. Choisis à quoi elle sert, par exemple **Logement** ou **Internet**. Ton choix te fait avancer directement.\n' +
      '2. Écris le montant et touche **Continuer**.\n' +
      '3. Remplis **Nom**, **Date de paiement**, la **Récurrence**, **Payée avec** et **Rappel**. **Note** est facultatif.\n' +
      '4. Touche **Enregistrer la facture**.\n\n' +
      'Tu verras **Facture ajoutée** au bas de l’écran. Tu pourras tout modifier plus tard depuis la page de la facture.\n\n' +
      'Astuce : pour **Date de paiement**, choisis la prochaine date d’échéance. Une date passée fait que Skip remplit chaque paiement depuis cette date.',
    keywords: ['ajouter facture', 'nouvelle facture', 'ajout rapide', 'loyer'],
  },
  {
    id: 'bills.add.categories',
    title: 'Que veulent dire les catégories de factures ?',
    questions: [
      'Que veulent dire les catégories de factures ?',
      'quelle catégorie pour mon loyer',
      "qu'est-ce qui va dans Autre",
      'liste des catégories de factures',
      'Je peux créer ma propre catégorie de facture ?',
      "il n'y a pas de catégorie pour ma facture",
      'où sont Prêts et crédit dans les catégories',
      "qu'est devenu Famille et Santé",
      'quelle catégorie pour le gaz',
      'c’est quoi les tuiles quand on ajoute une facture',
      'catégorie perso pour les factures',
      'y a-t-il une catégorie pour la garderie ou la crèche',
      "quelle catégorie pour une facture d'hydro ou d'électricité",
      'ma facture ne rentre dans aucune catégorie, je fais quoi',
    ],
    answer:
      'La première page d’**Ajouter une facture** demande « Cette facture, c’est pour quoi ? » avec 10 tuiles. Chacune dit ce qu’elle couvre :\n\n' +
      '- **Logement** : loyer, hypothèque, copropriété\n' +
      '- **Électricité et gaz** : électricité, chauffage, gaz\n' +
      '- **Eau et déchets** : eau, égouts, ordures\n' +
      '- **Internet** : Internet et Wi-Fi\n' +
      '- **Cellulaire** : forfaits et appareils\n' +
      '- **Assurances** : auto, santé, habitation, vie\n' +
      '- **Transport** : essence, transport en commun, péages\n' +
      '- **Santé et soins médicaux** : médecin, dentiste, médicaments\n' +
      '- **Éducation** : frais de scolarité et cours\n' +
      '- **Autre** : tout le reste\n\n' +
      'La catégorie détermine l’icône de la facture. Tu ne peux pas créer la tienne : utilise **Autre** pour ce qui ne rentre nulle part. Les prêts ne sont pas ici : ajoute-les sur la page **Prêts**. Les factures classées sous Famille et Santé dans une ancienne version s’affichent maintenant sous **Santé et soins médicaux**.',
    keywords: ['catégorie', 'catégories', 'logement', 'autre'],
  },
  {
    id: 'bills.add.name',
    title: 'Que mettre dans le Nom de la facture ?',
    questions: [
      'Que mettre dans le Nom de la facture ?',
      "ma compagnie d'électricité n'est pas dans la liste",
      'comment nommer une facture',
      'je peux écrire mon propre nom pour une facture',
      'la case nom propose seulement des entreprises',
      "mon propriétaire n'est pas une entreprise, je mets quoi",
      'champ nom de la facture',
      'Pourquoi la case du nom montre des noms d’entreprises ?',
      'comment renommer une facture',
      'changer le nom de ma facture',
      "c'est quoi le texte gris dans la case du nom",
      "peut-on écrire autre chose qu'un nom d'entreprise comme nom de facture",
      'ça veut dire quoi ajouter en bas de la liste des noms',
      'nom de ma facture de loyer, je mets quoi',
    ],
    answer:
      '**Nom**, c’est le nom de la facture partout dans Skip, et il est obligatoire. Commence à écrire, puis :\n\n' +
      '- Choisis une entreprise dans la liste. Son logo vient avec, et les noms que tu as déjà utilisés sont en premier.\n' +
      '- Ou garde tes propres mots. Touche la ligne **Ajouter** du bas, comme **Ajouter « Propriétaire »**, ou laisse simplement ce que tu as écrit. Ça compte quand même comme nom.\n\n' +
      'L’indice en gris change selon la catégorie, par exemple « Loyer, prêt immobilier ou ton propriétaire » pour **Logement**.\n\n' +
      'Pour renommer une facture plus tard, ouvre-la, touche le crayon, touche le **X** dans la case **Nom** et écris le nouveau nom. Si elle a déjà été payée, Skip te demande si les paiements passés doivent aussi prendre le nouveau nom.',
    keywords: ['nom', 'entreprise', 'renommer', 'propriétaire'],
  },
  {
    id: 'bills.add.amount',
    title: 'Comment saisir le montant d’une facture ?',
    questions: [
      'Comment saisir le montant d’une facture ?',
      'comment mettre les centimes dans le montant',
      "c'est quoi le bouton calculatrice sur la facture",
      'je peux additionner deux montants pour une seule facture',
      'y a-t-il un montant maximum pour une facture',
      'le bouton continuer est grisé sur le montant',
      'une facture peut être à zéro dollar',
      'comment changer le montant après avoir enregistré',
      'clavier du montant',
      'je peux mettre un énorme montant ?',
      'additionner deux choses quand je saisis le montant',
      'loyer et stationnement ensemble dans le montant',
      'est-ce que je peux faire une addition dans le montant de la facture',
      'combiner loyer et charges en un seul montant',
    ],
    answer:
      'Écris-le sur le clavier numérique, centimes compris, puis touche **Continuer**. Pour une facture, le bouton **Calculatrice** au-dessus du clavier te permet d’additionner d’abord, par exemple loyer plus stationnement.\n\n' +
      '- Le montant doit être supérieur à zéro, donc **Continuer** reste inactif tant que tu n’en as pas écrit un.\n' +
      '- Jusqu’à deux décimales, et jusqu’à $999,999,999.99.\n' +
      '- Pour le changer plus tard, ouvre la facture, touche le crayon, puis touche le montant en haut de la page.\n\n' +
      'Un abonnement fonctionne de la même façon, sans la **Calculatrice**. Si le montant change d’un mois à l’autre, mets ton montant habituel et mets-le à jour quand il change.',
    keywords: ['montant', 'calculatrice', 'clavier', 'centimes'],
  },
  {
    id: 'bills.add.payment-on',
    title: 'Quelle date choisir pour Date de paiement ?',
    questions: [
      'Quelle date choisir pour Date de paiement ?',
      "qu'est-ce que date de paiement veut dire",
      'quelle date je mets pour ma facture',
      'Je mets la première date où j’ai payé ou la prochaine ?',
      'date de paiement',
      "la date de paiement c'est l'échéance ?",
      "comment fixer l'échéance d'une facture",
      "c'est quoi Commence le au lieu de Date de paiement",
      'je peux choisir une date future pour ma facture',
      'la case date sur la facture',
      'où je vois quand ma facture est due',
      'pourquoi la date de paiement change quand je modifie',
      'je mets quelle date si ma facture tombe le 15 de chaque mois',
      'date de paiement obligatoire ?',
    ],
    answer:
      '**Date de paiement**, c’est la prochaine date d’échéance de la facture. Touche la case et choisis un jour dans le calendrier. Skip la répète à partir de là selon ta **Récurrence** : un loyer le 1er reste le 1er.\n\n' +
      '- Choisis la prochaine date où elle sortira si tu veux que Skip compte à partir de maintenant.\n' +
      '- Une date future, c’est bon : rien ne compte avant qu’elle arrive.\n' +
      '- Une date passée fait que Skip enregistre comme payé chaque paiement depuis cette date.\n\n' +
      'Sur la page de la facture, cette date s’affiche sous **Prochaine échéance**, et quand tu modifies la facture, la case montre cette prochaine date, pas la première. Pour une facture **Période précise**, la case s’appelle plutôt **Commence le**.',
    keywords: ['date de paiement', 'échéance', 'prochaine échéance', 'commence le'],
  },
  {
    id: 'bills.add.recurring',
    title: 'Que veulent dire les options de Récurrence ?',
    questions: [
      'Que veulent dire les options de Récurrence ?',
      'à quelle fréquence ma facture se répète',
      'ça veut dire quoi tous les 3 mois',
      'options hebdomadaire mensuel annuel',
      'comment faire une facture annuelle',
      'mon assurance se paie une fois par an',
      "c'est quoi le cycle de facturation d'un abonnement",
      'trimestriel ou tous les 3 mois',
      'comment mettre une facture chaque semaine',
      'options de récurrence',
      'une facture mensuelle revient le même jour ?',
      'quel jour tombe une facture hebdomadaire',
      'ma facture est payée chaque trimestre',
      'mon abonnement est annuel',
    ],
    answer:
      '**Récurrence**, c’est la fréquence à laquelle la facture revient. Choisis une pastille :\n\n' +
      '- **Chaque semaine** : tous les 7 jours, le même jour de la semaine que **Date de paiement**.\n' +
      '- **Chaque mois** : le même jour chaque mois. Les nouvelles factures démarrent avec celle-ci.\n' +
      '- **Tous les 3 mois** : le même jour tous les trois mois, comme le 15 janv., le 15 avr., le 15 juill. et le 15 oct.\n' +
      '- **Chaque année** : une fois par an à cette date.\n' +
      '- **Période précise** : comptée une seule fois, à son jour **Commence le**. Elle ne se répète pas.\n\n' +
      'Les abonnements ont les mêmes choix sous **Cycle de facturation**, sauf **Période précise**, et « tous les 3 mois » s’appelle **Chaque trimestre**. Tu peux le changer plus tard avec le crayon sur la page de la facture.',
    keywords: ['récurrence', 'cycle de facturation', 'trimestriel', 'annuel'],
  },
  {
    id: 'bills.add.period',
    title: 'C’est quoi une facture Période précise ?',
    questions: [
      'C’est quoi une facture Période précise ?',
      "qu'est-ce que période définie veut dire sur ma facture",
      'option période précise',
      'ma facture dure seulement 6 mois',
      'période précise prélève chaque mois entre les dates ?',
      'pourquoi ma facture période précise est comptée une seule fois',
      "c'est quoi la date Jusqu’au sur une facture",
      'comment donner une date de fin à une facture',
      'Effacer — sans date de fin, ça fait quoi',
      'une facture peut finir toute seule après quelques paiements',
      'en cours sans date de fin ça veut dire quoi',
      'facture avec un jour de début et un jour de fin',
      'mettre une date de début et de fin sur une facture',
      'à quoi servent commence le et jusqu’au',
    ],
    answer:
      '**Période précise**, c’est pour un paiement qui arrive une seule fois, pas selon un calendrier. Skip le compte une fois, à son jour **Commence le**.\n\n' +
      '- **Commence le** (obligatoire) : le jour où il est payé.\n' +
      '- **Jusqu’au** (facultatif) : le jour où il se termine. Ce jour-là, la facture passe sous **Arrêtées**. Sans date de fin (« En cours — sans date de fin »), elle reste sous **Toutes les factures**. **Effacer — sans date de fin** supprime le jour de fin.\n' +
      '- Dans les listes, elle s’affiche **Période définie**.\n\n' +
      'Elle ne se répète pas entre les deux dates. Pour quelque chose de mensuel qui se termine à une date connue, choisis plutôt **Chaque mois**, et arrête-la le dernier jour avec **Garder les prélèvements passés**.',
    keywords: ['période précise', 'période définie', 'date de fin', 'jusqu’au'],
  },
  {
    id: 'bills.add.paid-with',
    title: 'Que veut dire Payée avec ?',
    questions: [
      'Que veut dire Payée avec ?',
      "c'est quoi Prélevé sur pour un abonnement",
      "l'option Skip dans payée avec, ça fait quoi",
      'je paie ma facture en espèces, je choisis quoi',
      'payée avec est obligatoire ?',
      'pourquoi je dois choisir une carte pour une facture',
      "ma facture n'est pas payée par carte",
      "ma deuxième carte n'est pas dans la liste payée avec",
      'quelle carte paie cette facture',
      'que se passe-t-il si je choisis Skip',
      'payée avec passer ça veut dire quoi',
      'j’ai payé mon loyer avec ma carte de crédit',
      'je paie mon téléphone depuis mon compte épargne',
      "je touche quoi si la facture n'est prélevée sur aucun de mes comptes",
    ],
    answer:
      '**Payée avec** indique de quelle carte ou de quel compte bancaire la facture est payée. Sur un abonnement, ça s’appelle **Prélevé sur**. Tu dois toucher une tuile avant d’enregistrer :\n\n' +
      '- Une carte : chaque paiement s’ajoute à ce que tu dois sur cette carte.\n' +
      '- Un compte bancaire : chaque paiement sort du solde de ce compte.\n' +
      '- **Skip** : pas lié à une carte ni à un compte, pour l’argent comptant ou autre chose. Ça compte quand même dans tes dépenses et ton **Solde actuel**.\n\n' +
      'Les factures réglées sur **Skip** affichent un lien **Ajouter une carte** dans **Factures mensuelles**, et leurs paiements indiquent **Aucune carte**.\n\n' +
      'Avec le forfait gratuit, seules ta première carte et ton premier compte bancaire apparaissent dans cette liste. Les factures déjà payées avec une autre carte continuent de l’utiliser.',
    keywords: ['payée avec', 'prélevé sur', 'passer', 'carte'],
  },
  {
    id: 'bills.add.reminder',
    title: 'Comment fonctionne le rappel d’une facture ?',
    questions: [
      'Comment fonctionne le rappel d’une facture ?',
      'pourquoi je dois choisir un rappel',
      'je peux recevoir une notification avant ma facture',
      "rappelle-moi avant l'échéance du loyer",
      'à quelle heure arrive le rappel de facture',
      "à quelle heure arrive le rappel d'un abonnement",
      'options de rappel pour une facture',
      'Le jour même, ça veut dire quoi pour le rappel',
      'Skip va me prévenir avant le renouvellement de Netflix ?',
      'rappel obligatoire',
      'faut-il que Skip soit ouvert pour envoyer les rappels',
      'que dit le rappel de facture',
      'comment être prévenu avant une facture',
      'activer un rappel quand j’ajoute une facture',
    ],
    answer:
      'Chaque facture et chaque abonnement demande un **Rappel** avant l’enregistrement. Choisis **Aucun rappel**, **Le jour même**, **1 jour**, **3 jours** ou **1 semaine** avant l’échéance (avant le renouvellement, pour un abonnement).\n\n' +
      'Choisis autre chose qu’**Aucun rappel** et une pastille affiche l’heure, **à 9 h 00** au départ. Touche-la pour choisir une autre heure.\n\n' +
      'La notification arrive ce jour-là, à cette heure ou un peu après, dans ton fuseau horaire (à environ 15 minutes près). Elle affiche le nom, l’échéance et le montant, par exemple « À payer dans 3 jours · $50.00 » ou « Renouvellement demain · $15.00 ». La toucher ouvre la facture.\n\n' +
      'Elle revient avant chaque nouvelle échéance, et Skip n’a pas besoin d’être ouvert. Les factures arrêtées et les abonnements annulés n’envoient plus de rappels. Les rappels sont gratuits avec tous les forfaits.',
    keywords: ['rappel', 'notification', 'alerte', 'aucun rappel'],
  },
  {
    id: 'bills.add.note',
    title: 'Puis-je ajouter une note à une facture ?',
    questions: [
      'Puis-je ajouter une note à une facture ?',
      "où j'écris le numéro de compte de ma facture",
      'ajouter une note à un abonnement',
      'la note est obligatoire ?',
      'la note sert à quoi',
      "je peux écrire quel forfait j'ai",
      'où s’affiche la note',
      'comment modifier une note sur une facture',
      'note de facture',
      'je peux mettre un mémo',
      'champ texte pour un mémo sur une facture ou un abonnement',
      'détails en plus sur une facture, où je les écris',
      'y a-t-il un champ notes sur les factures',
      'un commentaire sur une facture',
    ],
    answer:
      'Oui. Tu peux en ajouter une sur le formulaire de la facture ou de l’abonnement, à l’ajout ou après avoir touché le crayon.\n\n1. Touche **Note**, qui affiche **Ajouter une note**.\n2. Écris ce que tu veux (« Un détail à retenir » pour une facture, « Quel forfait, par exemple » pour un abonnement).\n3. Touche **Terminé**.\n\nLa note est facultative. Elle s’affiche sous **Note** sur la page de la facture ou de l’abonnement. Pour la changer ou l’effacer, touche le crayon, touche **Note**, modifie-la et touche **Enregistrer les modifications**.',
    keywords: ['note', 'mémo', 'ajouter une note'],
  },
  {
    id: 'bills.add.missing',
    title: 'Pourquoi ma facture ou mon abonnement ne s’enregistre pas ?',
    questions: [
      'Pourquoi ma facture ou mon abonnement ne s’enregistre pas ?',
      'ça dit pour enregistrer la facture remplis',
      'la facture ne veut pas s’enregistrer',
      "enregistrer l'abonnement ne marche pas",
      'quels champs sont obligatoires pour une facture',
      "qu'est-ce qu'il faut pour ajouter un abonnement",
      'ça répète remplis rappel',
      'la date de fin ne peut pas précéder la date de début',
      'le bouton enregistrer ne fait rien',
      'ça dit une erreur est survenue quand j’enregistre ma facture',
      'Indique combien ça coûte.',
      'Indique ce que ça coûte.',
      'pk ca enregistre pas ma facture',
      'ça me dit de remplir des champs, lesquels',
    ],
    answer:
      '**Enregistrer** n’est jamais grisé. Il te dit plutôt ce qui manque, par exemple « Pour enregistrer la facture, remplis : Payée avec, Rappel. »\n\n' +
      '- Une facture a besoin de **Montant**, **Nom**, **Catégorie**, **Date de paiement** (ou **Commence le**), **Payée avec** et **Rappel**.\n' +
      '- Un abonnement a besoin de **Montant**, **Service**, **Prochain renouvellement**, **Prélevé sur** et **Rappel**.\n\n' +
      'Pour **Payée avec**, touche une carte, un compte ou **Skip**. Pour **Rappel**, **Aucun rappel** compte comme une réponse. **Note** est toujours facultative. Une facture **Période précise** ne peut pas avoir son jour **Jusqu’au** avant **Commence le**.\n\n' +
      'Si tu vois « Une erreur est survenue. Réessaie. », vérifie ta connexion et touche Enregistrer de nouveau. Ce que tu as rempli reste sur la page.',
    keywords: ['enregistrer', 'obligatoire', 'remplis', 'manque'],
  },
  {
    id: 'bills.add.cancel',
    title: 'Comment quitter une facture sans l’enregistrer ?',
    questions: [
      'Comment quitter une facture sans l’enregistrer ?',
      "annuler l'ajout de cette facture",
      'comment sortir de la page ajouter un abonnement',
      "j'ai commencé à ajouter une facture par erreur",
      'le X sur la page de la facture, ça fait quoi',
      'Annuler la modification de cette facture ? qu’est-ce qui se passe',
      'rien de ce que tu as saisi ici ne sera enregistré sur ma facture',
      'abandonner les changements sur un abonnement',
      'revenir sans enregistrer la facture',
      'la flèche de retour va me faire perdre ce que j’ai écrit ?',
      'je veux sortir du formulaire sans rien sauvegarder',
      "le bouton X ferme la facture sans l'enregistrer ?",
    ],
    answer:
      'Touche le **X** en haut. Skip demande « Annuler l’ajout de cette facture ? » (ou « Annuler la modification de cette facture ? ») et dit « Rien de ce que tu as saisi ici ne sera enregistré. » Touche **Oui** pour partir, ou **Revenir** pour continuer.\n\n' +
      'La flèche de retour recule d’une page. À l’ajout, elle te ramène au clavier numérique et garde ce que tu as écrit. Sur la première page du formulaire, elle te fait quitter sans enregistrer. Les abonnements fonctionnent de la même façon. Rien n’est enregistré tant que tu n’as pas touché **Enregistrer la facture**, **Enregistrer l’abonnement** ou **Enregistrer les modifications**.',
    keywords: ['annuler', 'quitter', 'fermer', 'x'],
  },
  {
    id: 'bills.one-time',
    title: 'Puis-je ajouter une facture ponctuelle ?',
    questions: [
      'Puis-je ajouter une facture ponctuelle ?',
      'facture unique',
      'je paie ça une seule fois',
      'comment ajouter une facture qui ne se répète pas',
      'facture à paiement unique',
      'une facture médicale que je paie une fois',
      'un paiement unique, reçu ou facture ?',
      'facture non récurrente',
      'ajouter une facture sans répétition',
      'rappel pour un paiement unique',
      'comment noter une facture de réparation que je paie une seule fois',
      'une facture qui arrive une seule fois, facture ou reçu ?',
      'plombier, dentiste ou réparation payés une fois, comment je l’ajoute',
      'facture unique, elle va où',
    ],
    answer:
      'Les factures sont faites pour des paiements qui reviennent. Pour un paiement unique, tu as deux choix :\n\n' +
      '- Ajoute-le comme un reçu avec **Ajout rapide → Reçu**. C’est le plus simple pour quelque chose de déjà payé.\n' +
      '- Ajoute-le comme une facture avec **Récurrence** sur **Période précise**. Skip le compte une seule fois, à son jour **Commence le**, et tu peux quand même avoir un **Rappel** avant. Mets **Jusqu’au** au même jour pour qu’elle passe sous **Arrêtées** ensuite.',
    keywords: ['ponctuelle', 'unique', 'une fois', 'paiement unique'],
  },
  {
    id: 'subscriptions.add.how',
    title: 'Comment ajouter un abonnement ?',
    questions: [
      'Comment ajouter un abonnement ?',
      'ajouter abonnement',
      'comment j’ajoute Netflix',
      'je veux suivre mon Spotify',
      'ajouter mon abonnement au gym',
      'nouvel abonnement',
      'comment ajouter un service de streaming',
      'où je mets mon Apple Music',
      'comment suivre mes abonnements dans Skip',
      'étapes pour ajouter un abonnement',
      'ajouter Disney plus',
      'configurer mes abonnements',
      'Abonnements affiche Pas encore d’abonnements',
      'comment je mets mon abonnement Canal+ ou Crave',
    ],
    answer:
      'Touche **Ajout rapide → Abonnement** sur **Accueil**, ou le **+** sur **Abonnements**. Ensuite :\n\n' +
      '1. Écris ce que ça coûte et touche **Continuer**.\n' +
      '2. Sous **Service**, commence à écrire et choisis-le dans la liste, comme Netflix. Son logo vient avec.\n' +
      '3. Choisis le **Cycle de facturation** : **Chaque semaine**, **Chaque mois**, **Chaque trimestre** ou **Chaque année**.\n' +
      '4. Indique le **Prochain renouvellement**, la prochaine date où tu seras prélevé.\n' +
      '5. Choisis **Prélevé sur** (une carte, un compte ou **Skip**) et un **Rappel**. **Note** est facultatif.\n' +
      '6. Touche **Enregistrer l’abonnement**.\n\n' +
      'Tu verras **Abonnement ajouté**. Tu pourras tout modifier plus tard avec le crayon sur sa page.',
    keywords: ['ajouter abonnement', 'nouvel abonnement', 'netflix', 'spotify'],
  },
  {
    id: 'subscriptions.add.service',
    title: 'Comment choisir le service d’un abonnement ?',
    questions: [
      'Comment choisir le service d’un abonnement ?',
      "mon service n'est pas dans la liste",
      'ça veut dire quoi Classé dans',
      'je peux changer la catégorie d’un abonnement',
      'comment changer de service',
      'la case cherche un service',
      "mon gym de quartier n'est pas dans la recherche",
      'pourquoi ça dit classé dans divertissement',
      'il m’a demandé on dirait, c’est quoi',
      'écrire mon propre nom d’abonnement',
      'renommer un abonnement',
      'ajouter un abonnement personnalisé',
      "mon service n'est pas listé, comment j'écris le mien",
    ],
    answer:
      'Écris dans la case **Service** (« Cherche un service ») et choisis dans la liste. Les services que tu as déjà utilisés viennent en premier, et en choisir un apporte son logo.\n\n' +
      'Il n’est pas dans la liste ? Touche la ligne **Ajouter** du bas, ou laisse simplement ce que tu as écrit : ça compte comme le nom. Skip peut alors demander « On dirait… » pour trouver un logo. Touche **Oui, c’est ça**, **Pas celui-ci**, ou un choix sans logo.\n\n' +
      'Sous la case, **Classé dans** montre le type de dépense dans lequel Skip l’a rangé, comme Divertissement. Skip le choisit d’après le service, et on ne peut pas le changer à la main.\n\n' +
      'Pour choisir un autre service, touche le **X** dans la case.',
    keywords: ['service', 'classé dans', 'catégorie', 'cherche un service'],
  },
  {
    id: 'subscriptions.add.next-renewal',
    title: 'Quelle date choisir pour Prochain renouvellement ?',
    questions: [
      'Quelle date choisir pour Prochain renouvellement ?',
      "c'est quoi le prochain renouvellement",
      "je suis en essai gratuit, comment je l'ajoute",
      'mon abonnement commence après un essai gratuit',
      'et si je ne sais pas quand ça se renouvelle',
      'prochain renouvellement obligatoire ?',
      'quand mon abonnement suivi se renouvelle',
      'quelle date je mets pour Spotify',
      'je mets le jour où je me suis inscrit ?',
      'date de renouvellement d’un abonnement',
      'abonnement avec essai gratuit comment l’ajouter',
      "l'essai gratuit de mon abonnement finit bientôt, quelle date pour le renouvellement",
      "l'essai finit vendredi, quelle date de renouvellement je saisis",
      "je mets la date de fin d'essai ou d'inscription pour un abonnement",
    ],
    answer:
      '**Prochain renouvellement**, c’est la prochaine date où tu seras prélevé, et il est obligatoire. Skip le répète selon le **Cycle de facturation** : le même jour chaque semaine, mois, trimestre ou année.\n\n' +
      '- Choisis une date future pour compter à partir de maintenant. Une date passée fait que Skip enregistre comme payé chaque renouvellement depuis cette date.\n' +
      '- Pour un essai gratuit, choisis le jour où l’essai se termine et saisis le prix que tu paieras ensuite. Rien ne compte avant.\n' +
      '- Pas sûr ? Le jour de ton dernier prélèvement, avancé d’un cycle, est généralement le bon. Tu pourras le changer plus tard.\n\n' +
      'Sur la page de l’abonnement, il s’affiche sous **Prochain renouvellement**.',
    keywords: ['prochain renouvellement', 'renouvellement', 'essai gratuit', 'essai'],
  },
  {
    id: 'bills.detail.page',
    title: 'Que contient la page d’une facture ?',
    questions: [
      'Que contient la page d’une facture ?',
      'que se passe-t-il quand je touche une facture',
      'ça veut dire quoi Prochaine échéance',
      "c'est quoi Payée avec sur ma facture",
      'aucun mode de paiement sur la page de ma facture',
      'à quoi servent les boutons mois et année sur la facture',
      "c'est quoi la liste À venir sur une facture",
      'que veut dire À payer sous à venir',
      'page de détails d’une facture',
      'que veut dire Début sur une facture',
      "c'est quoi la ligne Fin",
      "qu'est-ce qui s'affiche quand j'ouvre une facture",
      'quelles infos sont sur la page d’une facture',
      'j’ouvre une facture, c’est quoi toutes ces lignes',
    ],
    answer:
      'Touche une facture pour ouvrir sa page. En haut : son logo ou son icône, le montant et la fréquence. Ensuite :\n\n' +
      '- **Prochaine échéance** : la prochaine date où elle est due\n' +
      '- **Payée avec** : sa carte ou son compte (« Aucun mode de paiement » quand elle est réglée sur **Skip**)\n' +
      '- **Catégorie**\n' +
      '- **Début** : la date à partir de laquelle Skip la compte\n' +
      '- **Fin** : seulement sur une facture avec une date de fin\n' +
      '- **Note**, s’il y en a une\n\n' +
      'En dessous, choisis **Mois** ou **Année** (la page s’ouvre sur Année, l’année civile en cours). **Payés** liste les paiements faits jusqu’ici, avec leur nombre et leur total à côté du titre. **À venir** liste les dates à venir, chacune marquée **À payer**.\n\n' +
      'Le crayon en haut à droite modifie la facture. Touche le logo pour le changer.',
    keywords: ['page de la facture', 'détails', 'prochaine échéance', 'payée avec'],
  },
  {
    id: 'subscriptions.detail.page',
    title: 'Que contient la page d’un abonnement ?',
    questions: [
      'Que contient la page d’un abonnement ?',
      'que se passe-t-il quand je touche un abonnement',
      'détails d’un abonnement',
      'où je vois quand Netflix se renouvelle',
      'ça veut dire quoi Pas encore de date sur mon abonnement',
      "c'est quoi Payé avec sur un abonnement",
      "pourquoi il n'y a pas de crayon sur mon abonnement",
      'à quoi sert le choix mois année sur un abonnement',
      'la page d’un abonnement montre payés et à venir',
      'que veut dire Début sur un abonnement',
      "qu'est-ce qui est affiché sur la page d'un abonnement",
      "j'ai touché Netflix dans ma liste, c'est quoi tout ça",
      'explique-moi la page d’un abonnement',
      'page d’un abonnement : renouvellement, payé avec et début, ça veut dire quoi',
    ],
    answer:
      'Touche un abonnement pour ouvrir sa page. En haut : son logo, le prix et son cycle de facturation (ou « Annulé · dernier prélèvement le » et une date). Ensuite :\n\n' +
      '- **Prochain renouvellement** : la date du prochain prélèvement (« Pas encore de date » s’il n’y en a pas)\n' +
      '- **Payé avec** : sa carte ou son compte (« Aucun mode de paiement » quand il est réglé sur **Skip**)\n' +
      '- **Début** : la date à partir de laquelle Skip le compte\n' +
      '- **Note**, s’il y en a une\n\n' +
      'En dessous, choisis **Mois** ou **Année**. **Payés** liste les renouvellements faits jusqu’ici avec leur nombre et leur total. **À venir** liste ceux qui restent, marqués **À payer**.\n\n' +
      'Le crayon en haut à droite le modifie. Un abonnement annulé n’a pas de crayon, seulement **Supprimer l’abonnement** en bas.',
    keywords: ['page abonnement', 'prochain renouvellement', 'payé avec', 'détails'],
  },
  {
    id: 'bills.detail.no-charges',
    title: 'Pourquoi la page de ma facture n’affiche aucun paiement ?',
    questions: [
      'Pourquoi la page de ma facture n’affiche aucun paiement ?',
      'aucun prélèvement pour cette facture dans cette période',
      'aucun prélèvement pour cet abonnement dans cette période',
      'la page de ma facture est vide',
      "la liste payés n'a pas l'an dernier",
      'pourquoi les anciens paiements manquent sur ma facture',
      'la page de la facture ne montre pas mon premier paiement',
      'rien sous payés sur mon abonnement',
      'ton historique plus ancien est conservé sur la page de ma facture',
      "où sont les paiements de l'an dernier pour cette facture",
      "ma facture n'affiche aucun paiement",
      'pourquoi il y a rien dans payés pour ma facture',
      'ma nouvelle facture est vide, normal ?',
    ],
    answer:
      '« Aucun prélèvement pour cette facture dans cette période. » veut dire que rien n’a été payé ni n’est à payer dans le **Mois** ou l’**Année** choisi. Essaie l’autre pastille.\n\n' +
      '- Une nouvelle facture n’a aucun paiement tant que sa première date n’est pas arrivée.\n' +
      '- **Mois** et **Année** veulent dire le mois civil et l’année civile en cours, donc les paiements de l’an dernier ne sont pas là. Utilise **Historique des paiements** et choisis l’année.\n' +
      '- Avec le forfait gratuit, la liste montre les 90 derniers jours. Les paiements plus anciens sont conservés, et **Ton historique plus ancien est conservé** apparaît juste sous les pastilles **Mois** et **Année**. Le nombre et le total à côté de **Payés** les incluent quand même.',
    keywords: ['aucun prélèvement', 'vide', 'paiements manquants', 'période'],
  },
  {
    id: 'bills.detail.total',
    title: 'Combien ai-je payé en tout pour une facture ?',
    questions: [
      'Combien ai-je payé en tout pour une facture ?',
      "combien j'ai dépensé pour Netflix cette année",
      'total payé pour mon loyer',
      "combien m'a coûté ma facture de téléphone l'an dernier",
      'voir tout ce que j’ai payé à une seule entreprise',
      'total pour un seul abonnement',
      'combien j’ai payé au total pour Spotify',
      'total annuel d’une facture',
      'somme de tous les paiements de cette facture',
      "combien m'a coûté mon gym",
      "cumul de ce que j'ai payé pour ma facture d'internet",
      "combien j'ai donné à mon propriétaire en tout",
      'total payé sur un abonnement depuis le début',
    ],
    answer:
      'Pour cette année, ouvre la facture ou l’abonnement et laisse la pastille sur **Année**. Le nombre et le total sont à côté du titre **Payés**.\n\n' +
      'Pour les autres années, ouvre **Historique des paiements**, touche **Rechercher des paiements** et écris son nom. Les résultats sont regroupés par année, et chaque année affiche son total et le nombre de paiements.\n\n' +
      'Avec le forfait gratuit, les totaux comptent tous les paiements, mais les lignes ne remontent qu’à 90 jours.',
    keywords: ['total', 'combien', 'dépensé pour', 'somme'],
  },
  {
    id: 'bills.edit.how',
    title: 'Comment modifier une facture ?',
    questions: [
      'Comment modifier une facture ?',
      'changer ma facture',
      'modifier facture',
      'comment corriger une erreur sur ma facture de loyer',
      'où est le bouton pour modifier une facture',
      'comment mettre à jour une facture',
      "j'ai fait une faute dans ma facture",
      'crayon sur la page de la facture',
      'je peux changer une facture après l’avoir enregistrée',
      'quand je touche une facture je ne peux pas la modifier',
      'facture mise à jour',
      'comment changer les détails d’une facture déjà enregistrée',
      'est-il possible de modifier une facture existante',
      'où est le bouton pour modifier une facture enregistrée',
    ],
    answer:
      '1. Ouvre **Factures mensuelles** et touche la facture. Sa page s’ouvre.\n' +
      '2. Touche le crayon en haut à droite. **Modifier la facture** s’ouvre avec tout déjà rempli.\n' +
      '3. Touche le montant en haut pour le changer, touche **Catégorie** ou **Note** pour ouvrir leurs pages, ou change directement les cases et les pastilles.\n' +
      '4. Touche **Enregistrer les modifications**.\n\n' +
      'Si tu as changé le nom, le montant ou **Payée avec** et que la facture a déjà été payée, Skip te demande si les paiements passés doivent aussi changer. Tu verras **Facture mise à jour** quand c’est enregistré.\n\n' +
      'Les factures arrêtées n’ont pas de crayon et ne peuvent pas être modifiées. Un prêt ouvre sa propre page de prêt, que tu modifies à partir de là.',
    keywords: ['modifier', 'changer', 'crayon', 'corriger'],
  },
  {
    id: 'subscriptions.edit.how',
    title: 'Comment modifier un abonnement ?',
    questions: [
      'Comment modifier un abonnement ?',
      'changer mon abonnement',
      'modifier abonnement',
      'comment mettre à jour le prix de Netflix',
      'changer la date de renouvellement de mon abonnement',
      'passer un abonnement de mensuel à annuel',
      "corriger un abonnement que j'ai mal ajouté",
      'où est le crayon pour les abonnements',
      'je peux modifier un abonnement annulé',
      'abonnement mis à jour',
      'changer la carte sur laquelle Netflix est prélevé',
      'comment corriger le prix de mon abonnement',
      "modifier le cycle de facturation d'un abonnement",
    ],
    answer:
      '1. Ouvre **Abonnements** et touche-le. Sa page s’ouvre.\n' +
      '2. Touche le crayon en haut à droite. **Modifier l’abonnement** s’ouvre.\n' +
      '3. Change le montant (touche-le en haut), **Service**, **Cycle de facturation**, **Prochain renouvellement**, **Prélevé sur**, **Rappel**, **Note** ou **Statut**.\n' +
      '4. Touche **Enregistrer les modifications**.\n\n' +
      'Si tu as changé le nom, le montant ou la carte et qu’il a déjà été prélevé, Skip te demande s’il faut aussi changer les prélèvements passés. Tu verras **Abonnement mis à jour**.\n\n' +
      'Les abonnements annulés ne peuvent pas être modifiés. Leur page n’a pas de crayon.',
    keywords: ['modifier abonnement', 'changer abonnement', 'crayon', 'cycle de facturation'],
  },
  {
    id: 'bills.edit.past-or-upcoming',
    title: 'Que font Passés et à venir et Seulement ceux à venir ?',
    questions: [
      'Que font Passés et à venir et Seulement ceux à venir ?',
      'modifier aussi les prélèvements passés ?',
      "il m'a demandé de modifier aussi les prélèvements passés, je choisis quoi",
      'passés et à venir ça veut dire quoi',
      'seulement ceux à venir ça veut dire quoi',
      'modifier ma facture va changer les anciens mois ?',
      'changer le montant change mon historique ?',
      "pourquoi Skip m'a posé la question des prélèvements passés",
      "j'ai changé le montant et mes anciens mois ont changé",
      'comment corriger le montant de tous les paiements passés',
      'modifier seulement les paiements futurs',
      "pourquoi il n'a pas posé la question quand j'ai changé la date",
      'Loyer a déjà été prélevé 4 fois. Modifier aussi ces prélèvements, ou seulement ceux à venir ?',
      "Skip m'a demandé si je change aussi les anciens paiements, que faire",
    ],
    answer:
      'Quand tu modifies une facture ou un abonnement qui a déjà été payé, et que tu as changé son nom, son montant ou sa carte, Skip demande « Modifier aussi les prélèvements passés ? »\n\n' +
      '- **Passés et à venir** : tous les paiements déjà enregistrés prennent le nouveau nom, le nouveau montant et la nouvelle carte. Utilise-le pour corriger une erreur, comme une faute de frappe.\n' +
      '- **Seulement ceux à venir** : les paiements passés restent comme ils étaient. Seuls les paiements à partir de maintenant utilisent les nouveaux détails. Utilise-le quand le prix a vraiment changé.\n' +
      '- **Annuler** : rien n’est enregistré.\n\n' +
      'Exemple : un loyer de $1,000 payé 3 fois, maintenant à $1,100. **Seulement ceux à venir** garde $3,000 dans les mois passés. **Passés et à venir** le fait passer à $3,300, et tes soldes changent en conséquence.\n\n' +
      'Changer seulement la date, la catégorie, le cycle, le rappel ou la note ne pose jamais la question, parce que les paiements passés gardent leurs propres dates.',
    keywords: ['passés et à venir', 'seulement ceux à venir', 'prélèvements passés', 'historique'],
  },
  {
    id: 'bills.edit.amount-change',
    title: 'Le prix de ma facture ou de mon abonnement a changé',
    questions: [
      'Le prix de ma facture ou de mon abonnement a changé',
      'Netflix a augmenté son prix',
      'mon loyer a augmenté, comment je le mets à jour',
      'hausse de prix sur mon abonnement',
      'comment changer le montant d’une facture',
      'ma facture de téléphone a baissé',
      "mettre à jour le prix d'un abonnement sans toucher aux anciens mois",
      'le montant de la facture n’est plus bon',
      'le renouvellement de mon assurance coûte plus cher cette année',
      'comment changer le montant mensuel',
      'mon gym a augmenté son prix',
      'mon propriétaire a monté le loyer',
      "changer le prix de l'abo à partir du mois prochain seulement",
    ],
    answer:
      'Mets le montant à jour et garde les anciens mois tels quels :\n\n' +
      '1. Ouvre la facture ou l’abonnement et touche le crayon.\n' +
      '2. Touche le montant en haut, écris le nouveau et touche **Terminé**.\n' +
      '3. Touche **Enregistrer les modifications**.\n' +
      '4. Quand Skip demande « Modifier aussi les prélèvements passés ? », touche **Seulement ceux à venir**.\n\n' +
      'Les paiements déjà enregistrés gardent l’ancien prix. Chaque paiement à partir de maintenant utilise le nouveau. Change-le avant la prochaine échéance pour que ce paiement prenne le nouveau prix.\n\n' +
      'Si l’ancien montant était simplement faux depuis le début, choisis plutôt **Passés et à venir**.',
    keywords: ['changement de prix', 'hausse de prix', 'augmenté', 'nouveau montant'],
  },
  {
    id: 'bills.amount.varies',
    title: 'Ma facture change de montant chaque mois',
    questions: [
      'Ma facture change de montant chaque mois',
      "ma facture d'électricité change chaque mois",
      'montant de facture variable',
      'comment suivre une facture qui n’est jamais la même',
      "la facture d'eau est différente à chaque fois",
      'je peux mettre un montant différent pour chaque mois',
      "ma facture de chauffage est plus haute l'hiver",
      'quel montant mettre pour une facture qui change',
      "le montant de ma facture d'hydro varie",
      'Skip peut utiliser le vrai montant chaque mois ?',
      "ma facture de gaz n'est jamais pareille, quel montant je mets",
      'montant estimé pour une facture variable',
    ],
    answer:
      'Skip garde un seul montant par facture, et chaque paiement utilise le montant que la facture a à sa date d’échéance. Pour les factures qui changent, comme l’électricité ou l’eau :\n\n' +
      '- Utilise ton montant habituel ou moyen, pour que le total du mois reste proche.\n' +
      '- Quand une nouvelle facture arrive, change le montant avant son échéance et choisis **Seulement ceux à venir**. Ce paiement prend le nouveau montant et les mois passés restent comme ils étaient.\n\n' +
      'Une fois un paiement enregistré, tu ne peux pas changer ce mois-là seul. Si tu aimerais un montant différent pour chaque mois, dis-le-nous dans **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['variable', 'montant différent', 'change', 'moyenne'],
  },
  {
    id: 'bills.edit.date-change',
    title: 'Comment changer la date d’échéance d’une facture ?',
    questions: [
      'Comment changer la date d’échéance d’une facture ?',
      "changer la date d'échéance de ma facture",
      'mon loyer est passé du 1er au 15',
      "comment changer le jour de renouvellement d'un abonnement",
      "j'ai choisi la mauvaise date pour ma facture",
      'déplacer une facture à un autre jour',
      'pourquoi changer la date a sauté ce mois-ci',
      "j'ai changé la date et le prochain paiement est le mois prochain",
      'ma facture est maintenant prélevée un autre jour',
      'modifier la date du prochain renouvellement',
      "j'ai déménagé et mon loyer est maintenant le 5",
      "changer le jour de prélèvement d'une facture",
    ],
    answer:
      'Change la date dans **Date de paiement**.\n\n1. Ouvre la facture et touche le crayon.\n2. Touche **Date de paiement** et choisis la nouvelle date.\n3. Touche **Enregistrer les modifications**.\n\nPour un abonnement, change **Prochain renouvellement** de la même façon. Skip ne pose pas de question sur les paiements passés, parce qu’ils gardent les dates où ils sont sortis.\n\nSkip ne prélève jamais deux fois le même mois (ou la même semaine, le même trimestre ou la même année). Si le paiement de ce mois-ci est déjà enregistré et que tu déplaces la date plus tard dans le mois, la nouvelle date commence le mois prochain.\n\nExemple : un loyer enregistré le 1er octobre, déplacé au 15. Le prochain paiement est le 15 novembre, pas le 15 octobre.',
    keywords: ['date d’échéance', 'changer la date', 'date de paiement', 'prochain renouvellement'],
  },
  {
    id: 'bills.edit.started-date',
    title: 'Pourquoi Début affiche une date que je n’ai pas choisie ?',
    questions: [
      'Pourquoi Début affiche une date que je n’ai pas choisie ?',
      'la date de début est fausse sur ma facture',
      'pourquoi ma facture dit début le mois prochain',
      'la ligne début a changé après ma modification',
      'date de début différente de la date de paiement',
      "c'est quoi la date de début d'un abonnement",
      'la date de début de mon abonnement a bougé',
      'pourquoi début est après mon premier paiement',
      'début affiche le 1er du mois prochain',
      'sens de la date de début',
      'pourquoi la date de début de ma facture a avancé',
      'pk ca dit début 1er du mois prochain',
    ],
    answer:
      '**Début**, c’est la première date à partir de laquelle Skip compte la facture ou l’abonnement. Quand tu en ajoutes un, c’est la date que tu as choisie.\n\nUne fois qu’il a été payé au moins une fois, enregistrer n’importe quelle modification fait avancer **Début**, même si tu n’as changé que la note. Ça évite qu’un même mois (ou une même semaine, un même trimestre ou une même année) soit prélevé deux fois :\n\n- Le **Début** d’une facture devient sa prochaine échéance, ou le début du mois suivant (ou de la semaine, du trimestre ou de l’année suivants) si cette date tombe dans une période déjà payée.\n- Le **Début** d’un abonnement devient le début du mois (ou de la semaine, du trimestre ou de l’année) qui suit son dernier paiement, souvent le 1er du mois prochain.\n\nTes paiements passés restent tels quels, dans ton historique et tes soldes.\n\nChoisir un **Prochain renouvellement** plus tôt sur un abonnement qui n’a pas encore été prélevé peut aussi faire reculer **Début**, et Skip remplit alors les renouvellements entre les deux.',
    keywords: ['début', 'date de début', 'compté depuis'],
  },
  {
    id: 'bills.edit.card-change',
    title: 'Comment changer la carte d’une facture ?',
    questions: [
      'Comment changer la carte d’une facture ?',
      "j'ai une nouvelle carte de crédit, comment je déplace mes factures",
      'passer un abonnement sur une autre carte',
      'changer payée avec sur une facture',
      'mettre Netflix sur ma carte de débit',
      'ma facture est maintenant prélevée sur mon compte bancaire',
      'changer prélevé sur',
      'changer la carte va déplacer mes anciens paiements ?',
      'facture sur la mauvaise carte',
      'ma carte a expiré, mettre à jour mes factures',
      'je change de banque, comment je mets mes factures sur le nouveau compte',
      'payée avec : comment choisir une autre carte',
    ],
    answer:
      'Ouvre la facture, touche le crayon, touche une autre carte ou un autre compte sous **Payée avec** (**Prélevé sur** pour un abonnement), puis **Enregistrer les modifications**.\n\n' +
      'Si elle a déjà été payée, Skip demande « Modifier aussi les prélèvements passés ? »\n\n' +
      '- **Seulement ceux à venir** : les paiements passés restent sur l’ancienne carte, les nouveaux vont sur la nouvelle. Utilise-le quand tu as vraiment changé de carte.\n' +
      '- **Passés et à venir** : tous les paiements passés passent aussi sur la nouvelle carte, donc le solde des deux cartes change.\n\n' +
      'Avec le forfait gratuit, seules ta première carte et ton premier compte bancaire apparaissent dans la liste.',
    keywords: ['changer de carte', 'nouvelle carte', 'payée avec', 'prélevé sur'],
  },
  {
    id: 'bills.edit.category',
    title: 'Comment changer la catégorie d’une facture ?',
    questions: [
      'Comment changer la catégorie d’une facture ?',
      'mauvaise catégorie sur ma facture',
      'déplacer ma facture dans une autre catégorie',
      'passer une facture de Autre à Logement',
      "comment changer l'icône d'une facture",
      'modifier la catégorie',
      "j'ai mis ma facture dans la mauvaise catégorie",
      'recatégoriser une facture',
      'changer le type de facture',
      'ma facture affiche la mauvaise icône',
      'comment changer le genre de facture',
      "ma facture d'Internet est dans le mauvais groupe, comment la déplacer",
      'changer la sorte de facture, de services publics à logement',
    ],
    answer:
      'Change-la depuis le formulaire de la facture.\n\n1. Ouvre la facture et touche le crayon.\n2. Touche **Catégorie** et choisis une nouvelle tuile. Tu reviens directement au formulaire.\n3. Touche **Enregistrer les modifications**.\n\nLa catégorie détermine l’icône de la facture, sauf si elle affiche un logo d’entreprise. Elle ne change jamais les montants ni les dates, et Skip ne pose pas de question sur les paiements passés pour ça.',
    keywords: ['catégorie', 'changer la catégorie', 'icône', 'mauvaise catégorie'],
  },
  {
    id: 'bills.delete.how',
    title: 'Comment supprimer une facture ?',
    questions: [
      'Comment supprimer une facture ?',
      'supprimer facture',
      'enlever une facture',
      'comment me débarrasser d’une facture',
      'où est le bouton supprimer pour les factures',
      'je veux retirer mon ancien loyer',
      'comment effacer une facture',
      'facture supprimée',
      'supprimer une facture ajoutée par erreur',
      'jeter une facture',
      'je ne trouve pas supprimer sur ma facture',
      "comment supprimer une facture que j'ai créée en trop",
      'supprimer ma facture de loyer',
    ],
    answer:
      '1. Ouvre la facture depuis **Factures mensuelles**.\n' +
      '2. Touche le crayon en haut à droite.\n' +
      '3. Touche **Supprimer la facture**, sous **Enregistrer les modifications**.\n' +
      '4. Choisis :\n\n' +
      '- Jamais payée : Skip demande « Supprimer Loyer ? » avec « Cette action est irréversible. » Touche **Supprimer**.\n' +
      '- Déjà payée : **Garder les prélèvements passés** l’arrête aujourd’hui et garde son historique. **Tout supprimer** la supprime avec tous ses paiements passés.\n\n' +
      'Tu verras **Facture arrêtée** ou **Facture supprimée**. Une facture arrêtée a **Supprimer la facture** au bas de sa propre page.',
    keywords: ['supprimer', 'enlever', 'effacer', 'retirer'],
  },
  {
    id: 'subscriptions.delete.how',
    title: 'Comment supprimer un abonnement ?',
    questions: [
      'Comment supprimer un abonnement ?',
      'supprimer abonnement',
      'enlever Netflix de Skip',
      'comment me débarrasser d’un abonnement',
      "supprimer un abonnement que j'ai ajouté en double",
      'abonnement supprimé',
      'effacer un abonnement',
      'où est supprimer l’abonnement',
      'retirer un abonnement annulé de la liste',
      'retirer un abonnement de l’app',
      'comment je supprime Spotify de mes abonnements',
      'enlever un abonnement de la liste',
    ],
    answer:
      '1. Ouvre-le depuis **Abonnements**.\n' +
      '2. Touche le crayon.\n' +
      '3. Touche **Supprimer l’abonnement**, sous **Enregistrer les modifications**.\n' +
      '4. Choisis :\n\n' +
      '- Jamais prélevé : touche **Supprimer** (« Cette action est irréversible. »).\n' +
      '- Déjà prélevé : **Garder les prélèvements passés** l’annule et garde son historique. **Tout supprimer** le supprime avec tous ses paiements passés et son rappel.\n\n' +
      'Tu verras **Abonnement annulé** ou **Abonnement supprimé**. Pour supprimer un abonnement déjà annulé, ouvre-le et touche **Supprimer l’abonnement** au bas de sa page, puis **Tout supprimer** (ou **Supprimer** s’il n’a jamais été prélevé).',
    keywords: ['supprimer abonnement', 'enlever abonnement', 'effacer'],
  },
  {
    id: 'bills.delete.choices',
    title: 'Garder les prélèvements passés ou Tout supprimer ?',
    questions: [
      'Garder les prélèvements passés ou Tout supprimer ?',
      'garder les prélèvements passés ça fait quoi',
      'tout supprimer ça fait quoi',
      'si je supprime une facture mon historique disparaît ?',
      'supprimer un abonnement va changer mon solde ?',
      'supprimer demande de garder dans l’historique ou de retirer',
      "rien après aujourd'hui n'est enregistré, ça veut dire quoi",
      'lequel choisir quand je supprime',
      'supprimer la facture mais garder l’historique',
      'je peux annuler tout supprimer ?',
      'je supprime une facture déjà payée, les anciens paiements restent ?',
      'les paiements passés disparaissent si je retire une facture',
      "si je supprime une facture, qu'advient-il des paiements déjà faits",
      'supprimer une facture qui a des paiements, ils restent dans mon historique ?',
    ],
    answer:
      'Quand tu supprimes une facture ou un abonnement qui a déjà été payé, Skip dit combien de paiements passés il a et demande quoi en faire. Dans les deux cas, rien n’est enregistré après aujourd’hui.\n\n' +
      '- **Garder les prélèvements passés** : il s’arrête aujourd’hui. Les paiements passés restent dans ton historique, tes soldes et **Historique des paiements**. Une facture passe sous **Arrêtées**, un abonnement sous **Annulés**. Pour une facture, un paiement dû aujourd’hui compte quand même.\n' +
      '- **Tout supprimer** : il est supprimé avec tous ses paiements passés et son rappel. Les mois passés, les soldes des cartes et ton **Solde actuel** changent comme s’il n’avait jamais existé. Cette action est irréversible.\n' +
      '- **Annuler** : rien ne change.\n\n' +
      'Si tu as simplement arrêté de le payer, **Garder les prélèvements passés** est le choix sûr.',
    keywords: ['garder les prélèvements passés', 'tout supprimer', 'supprimer', 'historique'],
  },
  {
    id: 'bills.stop.how',
    title: 'Comment arrêter une facture et garder son historique ?',
    questions: [
      'Comment arrêter une facture et garder son historique ?',
      'je ne paie plus cette facture',
      'arrêter une facture',
      'terminer une facture',
      "j'ai déménagé, comment j'arrête mon loyer",
      'mon prêt ou mon contrat est fini, arrêter la facture',
      'finir une facture sans la supprimer',
      "j'ai vu facture arrêtée en bas de l'écran",
      'archiver une facture',
      'cacher une facture que je ne paie plus',
      'arrêter de suivre une facture',
      'mon contrat est terminé, comment arrêter la facture mais garder les paiements passés',
      "mettre fin à une facture sans perdre l'historique",
    ],
    answer:
      'Arrêter une facture la termine aujourd’hui et garde tous les paiements passés :\n\n' +
      '1. Ouvre la facture et touche le crayon.\n' +
      '2. Touche **Supprimer la facture**.\n' +
      '3. Touche **Garder les prélèvements passés**.\n\n' +
      'Tu verras **Facture arrêtée**. Elle passe dans la section **Arrêtées**, au bas de **Factures mensuelles**, avec la date de son arrêt. Rien après aujourd’hui n’est compté ni rappelé.\n\n' +
      'Si la facture n’a jamais été payée, il n’y a pas d’historique à garder, donc Skip propose seulement de la supprimer. Il n’y a aucun moyen de masquer une facture active.',
    keywords: ['arrêter', 'terminer', 'finir', 'archiver'],
  },
  {
    id: 'bills.stopped.what',
    title: 'Que veut dire Arrêtée pour une facture ?',
    questions: [
      'Que veut dire Arrêtée pour une facture ?',
      "c'est quoi la section arrêtées",
      'arrêtée le, ça veut dire quoi',
      'pourquoi ma facture est dans arrêtées',
      'pourquoi je ne peux pas modifier une facture arrêtée',
      "il n'y a pas de crayon sur ma facture",
      'ma facture est passée dans arrêtées toute seule',
      'remboursé le dans les factures',
      'une facture arrêtée compte encore ?',
      'pourquoi une facture arrêtée est dans le total de ce mois',
      "c'est quoi arrêtée le sur ma facture",
      'ma facture est grisée dans arrêtées',
    ],
    answer:
      'Une facture arrêtée ne court plus : rien de nouveau n’est compté et aucun rappel n’est envoyé. Ses paiements passés restent dans ton historique.\n\n' +
      'Une facture s’arrête quand tu choisis **Garder les prélèvements passés** en la supprimant, ou quand une facture **Période précise** atteint son jour **Jusqu’au**. Un prêt entièrement remboursé affiche **Remboursé le** et la date.\n\n' +
      'Les factures arrêtées sont au bas de **Factures mensuelles**, les plus récentes d’abord. Elles ne s’ajoutent au chiffre d’un mois que si elles ont été payées ce mois-là avant d’être arrêtées.\n\n' +
      'Arrêtée, c’est définitif. Sa page n’a pas de crayon, seulement **Supprimer la facture** en bas.',
    keywords: ['arrêtée', 'arrêtée le', 'remboursé', 'définitif'],
  },
  {
    id: 'bills.stopped.restart',
    title: 'Puis-je relancer une facture ou un abonnement arrêté ?',
    questions: [
      'Puis-je relancer une facture ou un abonnement arrêté ?',
      'annuler l’arrêt d’une facture',
      'réactiver un abonnement annulé',
      'je me suis réabonné à Netflix',
      'récupérer une facture supprimée',
      "j'ai arrêté la mauvaise facture",
      'comment réactiver un abonnement annulé',
      'restaurer un abonnement supprimé',
      'remettre en marche une facture arrêtée',
      "j'ai recommencé à payer",
      'annuler la suppression',
      "j'ai arrêté une facture par erreur, je peux la réactiver ?",
    ],
    answer:
      'Non. Les factures arrêtées et les abonnements annulés sont définitifs, et ceux qui ont été supprimés ne reviennent pas.\n\n' +
      'Pour recommencer à payer, ajoute-le comme nouveau avec **Ajout rapide → Facture** ou **Abonnement**. L’ancien garde son historique sous **Arrêtées** ou **Annulés**, et le nouveau repart de zéro.\n\n' +
      'Astuce : pour la date, choisis la prochaine échéance. Une date passée remplit des paiements que tu n’as peut-être pas faits.',
    keywords: ['relancer', 'réactiver', 'annuler la suppression', 'se réabonner'],
  },
  {
    id: 'bills.stopped.delete',
    title: 'Comment retirer une facture arrêtée de la liste ?',
    questions: [
      'Comment retirer une facture arrêtée de la liste ?',
      'supprimer une facture arrêtée',
      'me débarrasser de la section arrêtées',
      'enlever les vieilles factures de arrêtées',
      'effacer les abonnements annulés',
      'supprimer sur une facture arrêtée propose seulement tout supprimer',
      'les factures arrêtées encombrent ma page',
      'cacher les factures arrêtées mais garder l’historique',
      'supprimer la facture en bas d’une facture arrêtée',
      'retirer annulés de la page abonnements',
      'comment vider la liste des factures arrêtées',
      'supprimer définitivement une facture arrêtée',
    ],
    answer:
      'Ouvre-la depuis **Arrêtées** (ou **Annulés**) et touche **Supprimer la facture** (ou **Supprimer l’abonnement**) au bas de sa page.\n\n' +
      'Si elle a déjà été payée, Skip redemande. **Tout supprimer** la supprime avec tous ses paiements passés, donc les mois passés et les soldes changent. **Garder les prélèvements passés** la laisse exactement comme elle est.\n\n' +
      'Il n’y a aucun moyen de la masquer de la liste tout en gardant son historique.',
    keywords: ['arrêtées', 'annulés', 'retirer', 'effacer'],
  },
  {
    id: 'subscriptions.cancel.how',
    title: 'Comment annuler un abonnement dans Skip ?',
    questions: [
      'Comment annuler un abonnement dans Skip ?',
      'annuler un abonnement que je suis dans Skip',
      "j'ai annulé Netflix, comment je mets Skip à jour",
      'marquer un abonnement comme annulé',
      'la ligne Statut sert à quoi',
      'statut actif ou annulé',
      'arrêter un abonnement',
      'je me suis désabonné de Spotify',
      "mettre fin à mon abonnement au gym dans l'app",
      'comment ne plus suivre un abonnement',
      "j'ai résilié mon gym, comment je le montre dans Skip",
      "j'ai arrêté de payer Spotify, comment je le montre dans Skip",
      "dire à Skip que j'ai mis fin à un abonnement",
      'retirer un abonnement que je ne paie plus mais garder son historique',
    ],
    answer:
      'Il y a deux façons, et les deux gardent ses paiements passés :\n\n' +
      '- Ouvre-le, touche le crayon, mets **Statut** sur **Annulé**, puis touche **Enregistrer les modifications**.\n' +
      '- Ou, s’il a déjà été prélevé, touche le crayon, puis **Supprimer l’abonnement**, puis **Garder les prélèvements passés**.\n\n' +
      'Tu verras **Abonnement annulé**. Il passe dans la section **Annulés** au bas de **Abonnements**, avec « Annulé · dernier prélèvement le » et la date. Rien de nouveau n’est compté et aucun rappel n’arrive.\n\n' +
      'Ça arrête seulement le suivi dans Skip. Pour ne plus être prélevé, annule aussi auprès de l’entreprise.',
    keywords: ['annuler', 'statut', 'annulé', 'se désabonner'],
  },
  {
    id: 'subscriptions.cancelled.what',
    title: 'Que veut dire Annulé pour un abonnement ?',
    questions: [
      'Que veut dire Annulé pour un abonnement ?',
      'annulé dernier prélèvement ça veut dire quoi',
      "c'est quoi la section annulés",
      'pourquoi mon abonnement est grisé',
      'un abonnement annulé compte encore ?',
      'pourquoi un abonnement annulé est dans le total de ce mois',
      "un abonnement annulé n'a pas de bouton modifier",
      'date du dernier prélèvement',
      'mon abonnement dit annulé',
      'où vont les abonnements annulés',
      'pourquoi mon abonnement est dans annulés',
      "abonnement annulé dernier prélèvement le, c'est quoi cette date",
    ],
    answer:
      'Un abonnement annulé ne compte rien de nouveau et n’envoie aucun rappel. Ses paiements passés restent dans ton historique et tes soldes.\n\n' +
      '- Il est dans la section **Annulés** au bas de **Abonnements**, avec « Annulé · dernier prélèvement le » et la date de son dernier paiement.\n' +
      '- Sa page affiche la même chose sous le prix, n’a pas de crayon, et a **Supprimer l’abonnement** en bas.\n' +
      '- Il ne s’ajoute au chiffre d’un mois que s’il a été prélevé ce mois-là avant que tu l’annules.\n\n' +
      'Annulé, c’est définitif. Pour le relancer, ajoute-le comme nouvel abonnement.',
    keywords: ['annulé', 'dernier prélèvement', 'inactif'],
  },
  {
    id: 'subscriptions.pause',
    title: 'Puis-je mettre un abonnement en pause ?',
    questions: [
      'Puis-je mettre un abonnement en pause ?',
      'pause abonnement',
      "j'ai mis mon gym en pause deux mois",
      'sauter un mois de mon abonnement',
      'geler un abonnement',
      'mon abonnement est suspendu',
      'arrêter Netflix temporairement',
      'je peux repousser la date de renouvellement pour sauter des mois',
      "abonnement mis en pause par l'entreprise",
      'suspendre un abonnement',
      "mon gym est suspendu pendant l'été, je fais quoi dans Skip",
      'mettre un abonnement sur pause',
    ],
    answer:
      'Il n’y a pas de pause. Si tu l’as mis en pause auprès de l’entreprise :\n\n' +
      '1. Annule-le dans Skip : crayon → **Statut** → **Annulé** → **Enregistrer les modifications**. Ses paiements passés restent.\n' +
      '2. Quand il reprend, ajoute-le comme nouvel abonnement avec sa prochaine date de renouvellement.\n\n' +
      'Repousser **Prochain renouvellement** ne saute pas les mois entre les deux, donc l’annuler est la façon de l’empêcher de compter. Pour demander une option de pause, utilise **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['pause', 'suspendre', 'geler', 'sauter un mois'],
  },
  {
    id: 'bills.paid.how-marked',
    title: 'Comment Skip sait que ma facture est payée ?',
    questions: [
      'Comment Skip sait que ma facture est payée ?',
      'comment je marque une facture comme payée',
      "pourquoi ça dit payé alors que je n'ai pas encore payé",
      "ma facture dit payé mais rien n'est sorti de ma banque",
      'il y a un bouton payé ?',
      'Skip sait quand mon paiement automatique passe ?',
      "pourquoi une facture due aujourd'hui dit déjà payé",
      'marquer comme impayé',
      'où est payé en retard',
      'comment il enregistre mes paiements de factures',
      'ma facture est marquée payée automatiquement',
      "quand est-ce qu'une facture compte comme payée",
      "pourquoi l'activité montre des factures que je n'ai pas encore payées",
      'pk ma facture est déjà payée',
    ],
    answer:
      'Skip n’est pas relié à ta banque, donc il ne voit pas le paiement. Il enregistre plutôt chaque facture comme payée à sa date d’échéance, avec le montant et la carte que la facture avait ce jour-là.\n\n' +
      '- Une facture due aujourd’hui compte déjà comme **Payé**.\n' +
      '- Chaque paiement passé indique **Payé**. Skip ne suit pas les paiements en retard.\n' +
      '- Il n’y a pas de bouton pour marquer une facture payée ou impayée.\n' +
      '- Tu reçois une notification « prélevé » quand il est enregistré.\n\n' +
      'C’est pour ça que ton **Solde actuel** baisse à la date d’échéance. Si une facture sort vraiment un autre jour, change sa date avec le crayon sur sa page.',
    keywords: ['payé', 'marquer comme payé', 'paiement automatique', 'impayé'],
  },
  {
    id: 'bills.paid.one-payment',
    title: 'Puis-je modifier ou retirer un seul paiement ?',
    questions: [
      'Puis-je modifier ou retirer un seul paiement ?',
      "j'ai payé ma facture en retard ce mois-ci",
      "j'ai payé en avance, comment je change ça",
      "j'ai sauté un mois, comment je retire ce paiement",
      'supprimer un seul paiement d’une facture',
      'le mois dernier c’était un autre montant',
      'modifier un seul prélèvement',
      'un paiement est faux',
      'retirer un prélèvement de l’historique',
      "je n'ai pas payé le loyer en août mais ça dit payé",
      'changer la date d’un seul paiement',
      "je veux corriger le montant d'un seul mois",
      'enlever un paiement de mars de ma facture',
    ],
    answer:
      'Pas un seul à part. Chaque paiement passé est gardé tel qu’il a été enregistré, donc tu ne peux pas déplacer, supprimer ou modifier un seul mois.\n\n' +
      'Ce que tu peux faire :\n\n' +
      '- **Une autre date à partir de maintenant** : change **Date de paiement** avec le crayon.\n' +
      '- **Un nouveau montant à partir de maintenant** : change le montant et choisis **Seulement ceux à venir**.\n' +
      '- **Tous les paiements passés étaient faux** : change-le et choisis **Passés et à venir**.\n' +
      '- **Tu ne le paieras plus** : arrête-le avec **Garder les prélèvements passés**.\n' +
      '- **Rien de tout ça n’aurait dû compter** : supprime-le avec **Tout supprimer**.\n\n' +
      'Si tu aimerais modifier des paiements un par un, dis-le-nous dans **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['un seul paiement', 'prélèvement unique', 'mois sauté', 'en retard'],
  },
  {
    id: 'bills.dates.past',
    title: 'Que se passe-t-il si je choisis une date passée ?',
    questions: [
      'Que se passe-t-il si je choisis une date passée ?',
      "j'ai ajouté mon loyer avec une date d'il y a des mois",
      "Skip a enregistré des paiements d'avant que je l'utilise",
      "pourquoi il y a de vieux paiements sur une facture que je viens d'ajouter",
      'ma nouvelle facture a déjà trois paiements',
      'antidater une facture',
      'date passée sur un abonnement',
      'mon solde a beaucoup baissé après avoir ajouté une facture',
      'mauvaise date de début, ça a rempli de vieux mois',
      'je peux ajouter des factures du début de l’année',
      "comment retirer les paiements d'avant l'ajout de la facture",
      "j'ai mis une date passée, qu'est-ce que ça fait",
      'ma facture a rempli des paiements depuis janvier',
    ],
    answer:
      'Skip traite chaque paiement de cette date jusqu’à aujourd’hui comme déjà payé, et les enregistre un par un.\n\n' +
      'Exemple : le 13 octobre, tu ajoutes un loyer mensuel de $1,000 avec **Date de paiement** au 1er août. Skip enregistre le 1er août, le 1er septembre et le 1er octobre, donc $3,000 comptent comme dépensés, et le prochain est dû le 1er novembre.\n\n' +
      'Ces paiements font baisser ton **Solde actuel**, sauf s’ils datent d’avant le jour où tu as saisi le solde de ta carte ou de ton compte. Le **Prochain renouvellement** d’un abonnement fonctionne de la même façon.\n\n' +
      'Si tu veux que Skip compte seulement à partir de maintenant, choisis la prochaine échéance. Tu l’as ajoutée avec la mauvaise date passée ? Supprime-la avec **Tout supprimer** et ajoute-la de nouveau. Changer la date ensuite ne retire pas les paiements déjà enregistrés.',
    keywords: ['date passée', 'antidater', 'anciens paiements', 'rattrapage'],
  },
  {
    id: 'bills.dates.month-end',
    title: 'Et si une facture est due le 29, le 30 ou le 31 ?',
    questions: [
      'Et si une facture est due le 29, le 30 ou le 31 ?',
      'mon loyer est dû le 31, et février ?',
      'facture due le dernier jour du mois',
      'que se passe-t-il dans les mois de 30 jours',
      'année bissextile facture le 29 février',
      'ma facture est passée du 31 au 30',
      'pourquoi ma date d’échéance est maintenant le 28',
      'facture de fin de mois',
      'date d’échéance dans un mois court',
      'facture annuelle le 29 fév',
      'facture le 31 en avril',
      'mon loyer est le 30, et en février ?',
    ],
    answer:
      'Dans un mois qui n’a pas ce jour, Skip utilise le dernier jour du mois. Une facture due le 31 est comptée le 30 avril, et le 28 février (le 29 février les années bissextiles). Une facture annuelle du 29 février est comptée le 28 février les autres années.\n\n' +
      'Après un mois plus court, vérifie **Prochaine échéance** sur la page de la facture. Si elle est restée sur le jour plus bas, touche le crayon et remets **Date de paiement** à la date que tu veux.\n\n' +
      'Astuce : une date du 1er au 28 ne se décale jamais.',
    keywords: ['le 31', 'fin de mois', 'février', 'année bissextile'],
  },
  {
    id: 'bills.dates.weekend',
    title: 'Skip déplace-t-il une facture due en fin de semaine ?',
    questions: [
      'Skip déplace-t-il une facture due en fin de semaine ?',
      'ma facture est due un dimanche',
      'date de facture un jour férié',
      'ma banque prélève le jour ouvrable suivant',
      'échéance un week-end',
      'Skip connaît les jours fériés ?',
      'la facture est sortie lundi mais Skip dit samedi',
      'jours ouvrables pour les factures',
      'date de paiement un jour férié',
      'ma facture va se décaler si elle tombe un samedi ?',
      'si le 1er tombe un samedi, Skip décale ?',
      "facture un dimanche, c'est compté quel jour",
    ],
    answer:
      'Non. Skip compte chaque facture à la date exacte où elle est réglée, fins de semaine et jours fériés compris. Il ne connaît pas les jours ouvrables de ta banque.\n\n' +
      'Si ta facture sort habituellement un autre jour, mets plutôt **Date de paiement** à ce jour-là. Skip répète la date que tu choisis.',
    keywords: ['week-end', 'jour férié', 'jour ouvrable', 'samedi'],
  },
  {
    id: 'bills.schedule.odd',
    title: 'Et si ma facture est aux 2 mois ou deux fois par mois ?',
    questions: [
      'Et si ma facture est aux 2 mois ou deux fois par mois ?',
      "ma facture d'eau est aux deux mois",
      'facture bimestrielle',
      'facture aux deux semaines',
      'payé deux fois par mois, le 1er et le 15',
      'assurance tous les 6 mois',
      'paiement aux 15 jours',
      'facture semestrielle',
      'il y a une option toutes les deux semaines ?',
      'ma facture arrive deux fois par mois, quelle option de répétition',
      'une facture qui arrive deux fois par mois',
      "facture deux fois par mois à des jours différents, comment l'ajouter",
      "il n'y a pas d'option deux fois par mois, je fais quoi",
      'ma facture est aux deux semaines, comment je l’ajoute',
    ],
    answer:
      'Skip répète les factures **Chaque semaine**, **Chaque mois**, **Tous les 3 mois** ou **Chaque année**. Pour les autres rythmes :\n\n' +
      '- **Deux fois par mois** (comme le 1er et le 15) : ajoute deux factures **Chaque mois**, une pour chaque date.\n' +
      '- **Toutes les 2 semaines** : ajoute-la **Chaque semaine** à la moitié du montant. Les totaux sont les mêmes, même si les dates ne correspondent pas exactement.\n' +
      '- **Tous les 2 mois** : ajoute six factures **Chaque année**, une pour chaque mois d’échéance, pour que toutes les dates soient exactes. Ou ajoute une seule facture **Chaque mois** à la moitié du montant.\n' +
      '- **Tous les 6 mois** : ajoute deux factures **Chaque année**.\n' +
      '- **Aucun rythme du tout** : ajoute chacune comme un reçu quand tu la paies.\n\n' +
      'Pour demander d’autres rythmes, utilise **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['tous les 2 mois', 'aux deux semaines', 'deux fois par mois', 'semestriel'],
  },
  {
    id: 'bills.month.page',
    title: 'Que contient la page Factures mensuelles ?',
    questions: [
      'Que contient la page Factures mensuelles ?',
      "explique-moi l'écran des factures mensuelles",
      "c'est quoi la carte violette sur factures mensuelles",
      'sections de la page factures mensuelles',
      'la carte prune montre quoi',
      "c'est quoi voir l'historique des paiements",
      'la loupe sur factures mensuelles sert à quoi',
      'le plus sur factures mensuelles fait quoi',
      'comment actualiser mes factures',
      'il y a un calendrier de mes factures ?',
      'factures mensuelles repart à zéro le 1er ?',
      'que veut dire à payer en octobre en haut de la page des factures',
      'comment lire la carte du haut sur les factures',
      "c'est quoi la boîte de couleur en haut de factures mensuelles",
    ],
    answer:
      '**Factures mensuelles** affiche un mois à la fois, en commençant par celui-ci :\n\n' +
      '- La carte prune : **À payer en octobre**, le total, combien de factures sont payées et encore à venir, et **Prochain :** avec la prochaine.\n' +
      '- **À venir** : chaque paiement encore à venir ce mois-là, le plus proche d’abord, avec une pastille comme **Demain** ou **dans 12 jours**.\n' +
      '- **Toutes les factures** : chaque facture active, son montant pour le mois et **Payé** ou sa prochaine date.\n' +
      '- **Arrêtées** : les factures que tu as arrêtées.\n' +
      '- **Voir l’historique des paiements** : tout ce qui est déjà payé.\n\n' +
      'En haut, il y a la recherche et **+** pour ajouter une facture. Touche la pastille du mois sur la carte, comme **oct. 2026**, pour voir un autre mois. Le 1er, la page passe d’elle-même au nouveau mois. Tire vers le bas pour actualiser. Il n’y a pas de vue calendrier : **À venir** et la pastille du mois s’en approchent le plus.',
    keywords: ['factures mensuelles', 'carte prune', 'à venir', 'toutes les factures'],
  },
  {
    id: 'subscriptions.page',
    title: 'Que contient la page Abonnements ?',
    questions: [
      'Que contient la page Abonnements ?',
      "explique-moi l'écran des abonnements",
      'la carte en haut des abonnements, c’est quoi',
      'carte prune, à venir, tous les abonnements, annulés : c’est quoi',
      "c'est quoi tous les abonnements",
      'la section annulés des abonnements veut dire quoi',
      'comment voir les abonnements du mois prochain',
      'prochain sur la carte des abonnements, ça veut dire quoi',
      'liste des abonnements à venir',
      '2 abonnements · payés : 1 · à venir : 1, ça veut dire quoi',
      'comment est faite la page des abonnements',
      'quelles sections sur l’écran des abonnements',
      'fais-moi le tour de la page des abonnements',
    ],
    answer:
      '**Abonnements** affiche un mois à la fois, en commençant par celui-ci :\n\n' +
      '- La carte prune : **À payer en octobre**, le total, une ligne comme « 4 abonnements · payés : 2 · à venir : 2 », et **Prochain :** avec le prochain renouvellement.\n' +
      '- **À venir** : chaque renouvellement encore à venir ce mois-là, avec **Demain** ou **dans 5 jours**.\n' +
      '- **Tous les abonnements** : chaque abonnement actif, avec son cycle, sa carte, son montant, et **Payé** ou sa prochaine date.\n' +
      '- **Annulés** : ceux que tu as annulés, avec la date de leur dernier prélèvement.\n' +
      '- **Voir l’historique des paiements** : chaque renouvellement déjà payé.\n\n' +
      'Touche la pastille du mois (comme **oct. 2026**) pour un autre mois, le bouton de recherche pour trouver un paiement, ou **+** pour en ajouter un.',
    keywords: ['page abonnements', 'carte prune', 'tous les abonnements', 'annulés'],
  },
  {
    id: 'bills.month.due-figure',
    title: 'Comment est calculé le montant À payer du mois ?',
    questions: [
      'Comment est calculé le montant À payer du mois ?',
      'à payer en octobre ça veut dire quoi',
      'comment le total des factures mensuelles est calculé',
      'pourquoi le total de mes factures mensuelles est si élevé',
      'à payer ce mois-ci inclut les factures déjà payées ?',
      'ma facture hebdomadaire est comptée 5 fois ce mois-ci',
      "pourquoi ma facture annuelle n'est pas dans le total",
      'pourquoi le total a sauté ce mois-ci',
      'le total des factures mensuelles est faux',
      'combien mes factures coûtent ce mois-ci',
      'total à payer du mois',
      "d'où vient le gros chiffre sur factures mensuelles",
    ],
    answer:
      'Il additionne chaque date d’échéance de tes factures dans ce mois, payée ou non.\n\n' +
      '- Une facture mensuelle compte une fois, une facture hebdomadaire 4 ou 5 fois, et une facture annuelle seulement dans son mois.\n' +
      '- Les paiements déjà faits utilisent le montant qu’ils avaient alors. Ceux à venir utilisent le montant d’aujourd’hui.\n' +
      '- Une facture arrêtée en cours de mois compte ce qu’elle a payé avant son arrêt.\n' +
      '- Les prêts ajoutés aux factures mensuelles comptent. Les paiements supplémentaires sur un prêt ont leur propre ligne.\n\n' +
      'Exemple, le 13 octobre : loyer de $1,000 le 1er, Internet à $60 le 25 et un service de ménage à $25 chaque lundi (4 lundis). **À payer en octobre** égale $1,000 + $60 + $100 = $1,160.00. Une assurance annuelle de $600 due en mars n’est pas comptée avant mars.\n\n' +
      'Le montant se met à jour dès que tu ajoutes ou modifies une facture.',
    keywords: ['à payer en', 'total', 'total mensuel', 'gros chiffre'],
  },
  {
    id: 'subscriptions.month.figure',
    title: 'Combien coûtent mes abonnements par mois ?',
    questions: [
      'Combien coûtent mes abonnements par mois ?',
      'total de tous mes abonnements',
      "pourquoi mon abonnement annuel n'est pas dans ce mois",
      'coût mensuel des abonnements',
      'le total des abonnements est trop bas',
      'pourquoi les abonnements ont sauté ce mois-ci',
      'Skip fait une moyenne des abonnements annuels par mois ?',
      'combien je dépense en abonnements',
      'mon forfait annuel apparaît au prix complet dans un seul mois',
      'abonnements à payer ce mois-ci total',
      'quel est le total de mes dépenses mensuelles en abonnements',
      'à combien reviennent mes abonnements chaque mois',
      'comment est calculé le total mensuel des abonnements',
      'mes abonnements font combien par mois',
    ],
    answer:
      'La carte prune sur **Abonnements** montre ce qui est à payer dans ce mois, d’après les vraies dates de chacun. Ce n’est pas une moyenne.\n\n' +
      '- Les mensuels comptent une fois, les hebdomadaires 4 ou 5 fois.\n' +
      '- Les trimestriels et annuels comptent seulement dans les mois où ils se renouvellent. Un forfait annuel de $120 ajoute $120 à son mois et rien aux autres.\n' +
      '- Les renouvellements déjà prélevés utilisent le prix qu’ils avaient alors. Ceux à venir utilisent le prix d’aujourd’hui.\n\n' +
      'Exemple : Netflix à $15 le 5 et Spotify à $12 le 20 font **À payer en octobre** $27.00.\n\n' +
      'Touche la pastille du mois pour voir d’autres mois, ou **Voir l’historique des paiements** pour ce que tu as payé sur une année.',
    keywords: ['coût des abonnements', 'coût mensuel', 'total', 'annuel'],
  },
  {
    id: 'bills.month.counts',
    title: 'Que veut dire 3 factures · payées : 1 · à venir : 2 ?',
    questions: [
      'Que veut dire 3 factures · payées : 1 · à venir : 2 ?',
      'le nombre de payées sur factures mensuelles, ça veut dire quoi',
      'pourquoi ça dit 0 payée',
      'ma facture hebdomadaire est encore à venir',
      'ça dit rien à payer en novembre',
      'pourquoi toutes les factures sont payées le mois dernier',
      'les chiffres sur la carte prune',
      'pourquoi le mois prochain montre tout à venir',
      'factures payées à venir chiffres',
      'pourquoi ça dit rien à payer',
      'ça veut dire quoi 2 payées 1 à venir',
      'pourquoi ça dit 1 payée alors que ma facture est dans 3 jours',
    ],
    answer:
      'Ça compte les factures, pas les paiements, pour le mois affiché sur la carte :\n\n' +
      '- **factures** : combien ont une date dans ce mois.\n' +
      '- **payées** : combien ont déjà payé chacune de leurs dates du mois. Aujourd’hui compte comme payé.\n' +
      '- **à venir** : combien ont encore une date à venir.\n\n' +
      'Payées plus à venir égalent toujours le nombre de factures. Une facture hebdomadaire due 4 fois est une seule facture, et elle reste à venir jusqu’à sa dernière date du mois.\n\n' +
      'Dans un mois passé, tout est payé, et dans un mois futur, tout est à venir. Si rien n’est dû, la carte affiche « Rien à payer en novembre » (avec le nom de ce mois-là).',
    keywords: ['payées', 'à venir', 'compte', 'rien à payer'],
  },
  {
    id: 'bills.month.coming-up',
    title: 'C’est quoi la liste À venir ?',
    questions: [
      'C’est quoi la liste À venir ?',
      'dans 12 jours ça veut dire quoi',
      'section à venir',
      "pourquoi ma facture n'est pas dans à venir",
      "ma facture due aujourd'hui n'est pas dans à venir",
      'demain sur la facture, ça veut dire quoi',
      'pourquoi à venir manque pour le mois dernier',
      'la ligne prochain sur la carte',
      'les pastilles de à venir, ça veut dire quoi',
      "pourquoi mon abonnement n'est pas dans à venir",
      'quelles factures sont dues cette semaine',
      'à venir, ce sont les prochains paiements du mois ?',
      'où je vois ce qui reste à payer ce mois-ci',
    ],
    answer:
      '**À venir** liste chaque paiement encore à venir dans le mois que tu regardes, le plus proche d’abord. Chaque ligne a le nom, la date et la carte, le montant, et une pastille : **Demain**, ou **dans 5 jours** et ainsi de suite.\n\n' +
      '- Ce mois-ci : à partir de demain, parce qu’une facture due aujourd’hui compte déjà comme payée.\n' +
      '- Un mois futur : chaque paiement du mois.\n' +
      '- Un mois passé : la section est masquée.\n\n' +
      'Elle n’y est pas ? Elle est peut-être due aujourd’hui (donc **Payé**), due un autre mois (regarde **Toutes les factures**), ou arrêtée. La ligne **Prochain :** sur la carte prune nomme la première. Touche une ligne pour l’ouvrir.',
    keywords: ['à venir', 'dans … jours', 'demain', 'prochain'],
  },
  {
    id: 'bills.month.all-bills',
    title: 'Que montre la liste Toutes les factures ?',
    questions: [
      'Que montre la liste Toutes les factures ?',
      'prochain 25 oct ça veut dire quoi',
      "c'est quoi la coche verte payé",
      'pourquoi une facture affiche une date de l’an prochain',
      'je peux réorganiser mes factures',
      'dans quel ordre sont mes factures',
      'pourquoi le montant dans toutes les factures est plus gros que la facture',
      'se termine le à côté de ma facture, ça veut dire quoi',
      'la liste tous les abonnements expliquée',
      'trier les factures par montant',
      'pourquoi ma facture est listée avec une date de 2027',
      "c'est quoi prochain 1 mars 2027",
      'la coche verte à côté de ma facture',
    ],
    answer:
      '**Toutes les factures** (ou **Tous les abonnements**) liste chaque facture active, avec leur nombre à côté du titre. Chaque ligne montre :\n\n' +
      '- La fréquence et la carte, ou un lien **Ajouter une carte**.\n' +
      '- Son montant pour le mois : toutes ses dates additionnées (une facture hebdomadaire peut valoir 4 ou 5 paiements), ou un seul paiement si elle n’est pas due ce mois-là.\n' +
      '- **Payé** avec une coche verte quand toutes les dates du mois sont passées, **Prochain : 25 oct.** quand il en reste une à venir, **Prochain : 1 mars 2027** quand sa prochaine date tombe un mois plus tard, ou **Se termine le** et une date pour une facture à période définie.\n\n' +
      'Celles dues dans le mois viennent en premier, par date, puis les autres selon leur prochaine date. Tu ne peux pas les réorganiser. Touche une ligne pour l’ouvrir.',
    keywords: ['toutes les factures', 'tous les abonnements', 'statut', 'ordre'],
  },
  {
    id: 'bills.month.add-card',
    title: 'Que veut dire Ajouter une carte ou Aucune carte ?',
    questions: [
      'Que veut dire Ajouter une carte ou Aucune carte ?',
      'pourquoi ma facture dit ajouter une carte',
      'aucune carte sur mon paiement',
      "c'est quoi le lien violet ajouter une carte",
      "ma facture n'a pas de carte",
      "l'historique des paiements dit aucune carte",
      'un abonnement affiche ajouter une carte',
      'aucun mode de paiement sur une facture',
      'comment lier une carte à ma facture',
      "pourquoi il n'y a pas de carte à côté de ma facture",
      "qu'est-ce que ajouter une carte veut dire sur ma facture",
      'aucune carte sur un paiement passé',
    ],
    answer:
      'Ça veut dire que la facture n’est liée à aucune carte ni aucun compte. Son champ **Payée avec** est réglé sur **Skip**, ou la carte qu’elle utilisait a été supprimée.\n\n' +
      '- Sur **Factures mensuelles** ou **Abonnements**, touche **Ajouter une carte** dans la ligne. La page de modification s’ouvre : choisis une carte ou un compte et touche **Enregistrer les modifications**.\n' +
      '- Ses paiements dans **À venir**, **Historique des paiements** et la recherche indiquent **Aucune carte**.\n\n' +
      'Elle compte quand même dans tes dépenses et ton **Solde actuel**. Elle ne change simplement le solde d’aucune carte ni d’aucun compte.',
    keywords: ['ajouter une carte', 'aucune carte', 'aucun mode de paiement', 'lier une carte'],
  },
  {
    id: 'bills.month.other-months',
    title: 'Comment voir les factures d’un autre mois ?',
    questions: [
      'Comment voir les factures d’un autre mois ?',
      'voir les factures du mois prochain',
      'regarder les factures du mois dernier',
      'choisis le mois',
      'jusqu’où je peux voir mes factures à l’avance',
      'jusqu’où je peux remonter dans mes factures',
      'pourquoi je ne peux pas choisir un mois plus ancien',
      'voir les mois plus anciens des factures avec pro',
      'changer de mois sur factures mensuelles',
      'mes factures de décembre seront de combien',
      'la pastille du mois',
      'voir les factures de janvier',
      "jusqu'à quand je peux regarder en avance",
    ],
    answer:
      'Touche la pastille du mois sur la carte prune, comme **oct. 2026**. **Choisis le mois** s’ouvre avec **Ce mois-ci** en premier, puis **Mois à venir** (jusqu’à 12 d’avance), puis les mois passés par année. Touches-en un et la page l’affiche.\n\n' +
      'Les mois passés montrent ce qui a été payé. Les mois futurs montrent ce qui s’en vient, aux montants d’aujourd’hui. La prochaine fois que tu ouvres la page, elle repart sur ce mois-ci.\n\n' +
      'Avec le forfait gratuit, les mois passés remontent jusqu’à tes 90 derniers jours, et la liste se termine par **Consulte les mois précédents avec Pro**. Avec Pro, tu peux remonter 7 ans : cette année et les six précédentes.',
    keywords: ['choisis le mois', 'pastille du mois', 'mois prochain', 'mois dernier'],
  },
  {
    id: 'bills.month.extra',
    title: 'Que veut dire « + en plus sur Prêt auto » ?',
    questions: [
      'Que veut dire « + en plus sur Prêt auto » ?',
      'ligne en plus sur un prêt dans factures mensuelles',
      'au total sur la carte des factures, ça veut dire quoi',
      'pourquoi il y a un montant en plus sous à payer en',
      'paiement supplémentaire sur factures mensuelles',
      'factures mensuelles et la tuile accueil ne correspondent pas',
      "j'ai remboursé une partie de mon prêt et factures mensuelles a changé",
      "c'est quoi soldé dans l'historique des paiements",
      'paiement supplémentaire dans l’historique, ça veut dire quoi',
      'remboursement de prêt sur la page des factures',
      "c'est quoi le + en plus sous la carte des factures",
      "j'ai remboursé mon prêt en avance, ça change quoi aux factures mensuelles",
    ],
    answer:
      'Cette ligne apparaît quand tu as fait un paiement supplémentaire sur un prêt ce mois-là, avec **Rembourser** sur le prêt. Les paiements supplémentaires ne sont pas dus, donc ils restent hors de **À payer en octobre**. La ligne montre combien, sur quel prêt, et le total avec, comme « + $1,000.00 en plus sur Prêt auto · $2,884.00 au total ».\n\n' +
      'Le chiffre « au total » correspond à la tuile **Factures mensuelles** sur **Accueil**. Dans **Historique des paiements**, ces paiements s’affichent **Soldé** (tout le prêt) ou **Paiement supplémentaire** (une partie).',
    keywords: ['en plus', 'au total', 'rembourser', 'soldé'],
  },
  {
    id: 'bills.missing.disappeared',
    title: 'Ma facture a disparu de Factures mensuelles',
    questions: [
      'Ma facture a disparu de Factures mensuelles',
      'ma facture a disparu de la liste',
      'il manque une facture dans la liste',
      'mon abonnement a disparu',
      "ma facture n'est plus dans le total",
      "je ne vois plus ma facture d'assurance ce mois-ci",
      'facture disparue après modification',
      "mon prêt n'est plus dans les factures",
      'abonnement manquant sur la page abonnements',
      "j'ai perdu une facture",
      "ma facture était là le mois dernier et maintenant elle n'y est plus",
      'la facture était là le mois dernier mais plus maintenant',
      'où est la facture qui était là le mois dernier',
      "ma facture n'est plus sur la page factures mensuelles",
    ],
    answer:
      'Vérifie ces points :\n\n' +
      '- Elle n’est pas due ce mois-ci. Elle est toujours sous **Toutes les factures** avec sa prochaine date, mais pas dans **À venir** ni dans le total.\n' +
      '- Elle est arrêtée. Regarde sous **Arrêtées**, en bas. **Garder les prélèvements passés** y met une facture, tout comme une facture **Période précise** qui atteint son jour **Jusqu’au**.\n' +
      '- Tu regardes un autre mois. La pastille sur la carte prune indique lequel.\n' +
      '- C’est un prêt avec **Ajouter aux factures mensuelles** désactivé. Il est seulement sur la page **Prêts**.\n' +
      '- Elle a été supprimée avec **Tout supprimer**. C’est irréversible, donc ajoute-la de nouveau.\n\n' +
      'Pour un abonnement, regarde sous **Annulés**, au bas de **Abonnements**. Tire vers le bas sur la page pour actualiser.',
    keywords: ['manquante', 'disparue', 'perdue', 'introuvable'],
  },
  {
    id: 'bills.loans.in-bills',
    title: 'Pourquoi mon prêt est dans Factures mensuelles ?',
    questions: [
      'Pourquoi mon prêt est dans Factures mensuelles ?',
      'mon prêt auto apparaît comme une facture',
      'toucher la facture de mon prêt ouvre la page du prêt',
      'comment modifier un prêt depuis les factures',
      'retirer un prêt des factures mensuelles',
      'je peux ajouter un prêt comme une facture',
      'où est prêts et crédit',
      'hypothèque en facture ou en prêt',
      'interrupteur ajouter aux factures mensuelles',
      'paiement de prêt compté dans les factures',
      'mon prêt étudiant apparaît dans les factures mensuelles',
      'pourquoi je peux pas modifier mon prêt comme une facture',
    ],
    answer:
      'Les prêts enregistrés avec **Ajouter aux factures mensuelles** activé comptent comme des factures. Chaque paiement mensuel s’affiche dans **Factures mensuelles** et **Historique des paiements**, et compte dans tes dépenses.\n\n' +
      '- Toucher un prêt ouvre sa propre page de prêt, pas une page de facture.\n' +
      '- Modifie ou supprime un prêt depuis cette page, pas depuis **Modifier la facture**.\n' +
      '- Avec **Ajouter aux factures mensuelles** désactivé, le prêt reste sur **Prêts**, mais ses paiements n’apparaissent pas et ne comptent pas ici.\n\n' +
      'On ne peut pas ajouter de prêts depuis **Ajouter une facture**. Ajoute-les sur la page **Prêts**.',
    keywords: ['prêt', 'ajouter aux factures mensuelles', 'prêt auto', 'hypothèque'],
  },
  {
    id: 'bills.history.page',
    title: 'C’est quoi l’Historique des paiements ?',
    questions: [
      'C’est quoi l’Historique des paiements ?',
      'où je vois les factures que j’ai déjà payées',
      'page historique des paiements',
      'voir tous les paiements passés de mes factures',
      'historique de mes abonnements',
      "comment voir ce que j'ai payé le mois dernier",
      'liste de tous les paiements',
      "l'historique montre les factures à venir ?",
      "pourquoi ma facture à venir n'est pas dans l'historique",
      "les abonnements annulés sont dans l'historique des paiements ?",
      'liste des anciens paiements',
      "où je vois l'historique de mes factures payées",
      'page avec tous mes paiements passés',
    ],
    answer:
      '**Historique des paiements** liste chaque paiement de facture et d’abonnement déjà sorti, une année à la fois. Ouvre-le avec **Voir l’historique des paiements**, au bas de **Factures mensuelles** ou **Abonnements**.\n\n' +
      '- La pastille d’année (**Cette année**) choisit l’année.\n' +
      '- **Tous**, **Factures** et **Abonnements** choisissent ce qui est affiché.\n' +
      '- **Rechercher des paiements** retrouve n’importe quel paiement.\n' +
      '- La carte prune montre **Payé en 2026**, **Paiements** et **Moy. / mois**, avec une barre pour chaque mois.\n' +
      '- En dessous, les mois, du plus récent au plus ancien, chacun avec son total et chaque paiement marqué **Payé**.\n\n' +
      'Seuls les paiements datés d’aujourd’hui ou avant sont ici, jamais ceux à venir. Les factures arrêtées, les abonnements annulés et les paiements de prêt sont inclus. Touche un paiement pour l’ouvrir.',
    keywords: ['historique des paiements', 'paiements passés', 'historique', 'payé'],
  },
  {
    id: 'bills.history.card',
    title: 'Comment sont calculés Payé en et Moy. / mois ?',
    questions: [
      'Comment sont calculés Payé en et Moy. / mois ?',
      "c'est quoi moy. / mois dans l'historique des paiements",
      'comment la moyenne par mois est calculée',
      'payé en 2026 ça veut dire quoi',
      "c'est quoi les barres de l'historique des paiements",
      'pourquoi certaines barres sont plates',
      'la moyenne a l’air fausse',
      "le nombre de paiements dans l'historique",
      'pourquoi la barre de ce mois est blanche',
      "combien j'ai payé cette année en factures",
      'total annuel des factures et abonnements',
      'comment est calculée la moyenne par mois',
      'ce que veulent dire payé en 2026 et paiements en haut',
    ],
    answer:
      'La carte prune additionne chaque paiement de l’année pour l’onglet où tu es (**Tous**, **Factures** ou **Abonnements**) :\n\n' +
      '- **Payé en 2026** : le total de tous les paiements de cette année, jusqu’à aujourd’hui.\n' +
      '- **Paiements** : combien il y en a eu.\n' +
      '- **Moy. / mois** : le total divisé par les mois écoulés, de janvier à ce mois-ci pour l’année en cours, ou les 12 mois pour une année passée. Si ton premier paiement a eu lieu plus tard dans l’année, ça compte à partir de ce mois-là.\n' +
      '- Les barres sont le total de chaque mois. Le mois en cours ressort, et les mois à venir sont plats.\n\n' +
      'Exemple, le 13 octobre : $5,000 payés depuis janvier donnent $500.00 par mois. Si ton premier paiement date de mars, c’est $5,000 ÷ 8 = $625.00.\n\n' +
      'Avec le forfait gratuit, ces chiffres comptent quand même chaque paiement, même les plus anciens que la liste n’affiche pas.',
    keywords: ['moy. / mois', 'moyenne', 'payé en', 'barres'],
  },
  {
    id: 'bills.history.years',
    title: 'Comment voir les paiements d’autres années ?',
    questions: [
      'Comment voir les paiements d’autres années ?',
      "voir les factures de l'an dernier",
      "choisis l'année",
      "c'est quoi toutes les années",
      'payé depuis ça veut dire quoi',
      'pourquoi 2025 a un badge pro',
      "c'est quoi l'étiquette pro à côté d'une année",
      "combien d'années de paiements je peux voir",
      'historique des paiements de 2024',
      'comparer les années de factures',
      'total de chaque année',
      'voir mes paiements de 2024',
      'historique sur plusieurs années',
    ],
    answer:
      'Dans **Historique des paiements**, touche la pastille d’année (**Cette année**). **Choisis l’année** liste **Cette année**, chaque année précédente où tu as des paiements, et **Toutes les années**.\n\n' +
      '**Toutes les années** ouvre une page avec **Payé depuis** ta première année (le total, les paiements et les années), puis une carte pour chaque année avec ses paiements et son total. Touche une année pour l’ouvrir.\n\n' +
      'Les années remontent à 7 années civiles : cette année et les six précédentes.\n\n' +
      'Avec le forfait gratuit, une année entièrement plus ancienne que tes 90 derniers jours a un badge **Pro**. Elle s’ouvre quand même avec ses totaux, mais sa liste est remplacée par **Ton historique plus ancien est conservé**.',
    keywords: ['choisis l’année', 'toutes les années', 'payé depuis', 'badge pro'],
  },
  {
    id: 'bills.history.free-limit',
    title: 'Pourquoi je ne vois que 90 jours de paiements ?',
    questions: [
      'Pourquoi je ne vois que 90 jours de paiements ?',
      'ton historique plus ancien est conservé, ça veut dire quoi',
      'mes anciens paiements de factures ont disparu',
      "limite d'historique du forfait gratuit pour les factures",
      'Skip a supprimé mes anciens paiements ?',
      "voir jusqu'à 7 ans avec pro dans l'historique des paiements",
      'pourquoi la liste s’arrête en juillet',
      'comment voir les paiements de plus de 3 mois',
      'historique des paiements coupé',
      'mes anciens paiements sont perdus ?',
      'pourquoi je vois seulement 3 mois de paiements',
      'mes vieux paiements sont où',
    ],
    answer:
      'Avec le forfait gratuit, les listes montrent les 90 derniers jours de paiements (aujourd’hui est le 90e). Les paiements plus anciens ne sont pas supprimés : ils sont conservés, comptés dans tous les totaux et soldes, et réapparaissent avec Skip Pro.\n\n' +
      '- Là où une liste s’arrête, tu verras **Ton historique plus ancien est conservé**. Touche-le pour voir ce que Pro ajoute.\n' +
      '- Les totaux, les nombres et les barres de **Historique des paiements**, ainsi que les totaux à côté de **Payés** sur la page d’une facture, incluent chaque paiement.\n' +
      '- **Choisis le mois** et **Choisis l’année** se terminent par une ligne sur le fait de voir plus loin avec Pro.\n\n' +
      'Skip Pro affiche jusqu’à 7 ans, pour {proMonthly} ou {proYearly}.',
    keywords: ['90 jours', 'limite d’historique', 'historique plus ancien', 'forfait gratuit'],
  },
  {
    id: 'bills.search.how',
    title: 'Comment rechercher dans mes paiements ?',
    questions: [
      'Comment rechercher dans mes paiements ?',
      'rechercher des factures',
      'trouver le paiement d’une facture',
      'rechercher des paiements',
      'comment retrouver un vieux prélèvement d’abonnement',
      'chercher tous les paiements Netflix',
      'chercher une facture par son nom',
      '2024 – 2021 · 12 de plus, ça veut dire quoi',
      'comment marche la recherche dans les paiements',
      'retrouver ce que j’ai payé à ma compagnie d’électricité',
      'chercher dans les abonnements',
      "comment retrouver tous les paiements de loyer de l'an dernier",
      'où je cherche d’anciens paiements de factures',
      'liste de tous mes paiements de loyer',
    ],
    answer:
      'Touche le bouton de recherche sur **Factures mensuelles** ou **Abonnements**, ou **Rechercher des paiements** sur **Historique des paiements**. Écris une partie du nom.\n\n' +
      '- **Tous**, **Factures** et **Abonnements** restreignent la recherche.\n' +
      '- Elle compare avec le nom sous lequel un paiement est sorti et avec le nom actuel de la facture, donc les factures renommées sont trouvées dans les deux cas. Elle pardonne une petite faute de frappe dans les mots de 4 lettres ou plus.\n' +
      '- Les résultats montrent combien il y en a et de quelles années, puis chaque année avec son total. Les deux années les plus récentes sont listées en entier ; les plus anciennes se regroupent en une seule ligne comme « 2024 – 2021 · 12 de plus ». Touche-la pour les ouvrir.\n\n' +
      'Seuls les paiements déjà sortis sont recherchés. Touche un résultat pour ouvrir sa facture ou son abonnement.',
    keywords: ['recherche', 'trouver', 'chercher', 'rechercher des paiements'],
  },
  {
    id: 'bills.search.filters',
    title: 'Comment fonctionnent les filtres de la recherche de paiements ?',
    questions: [
      'Comment fonctionnent les filtres de la recherche de paiements ?',
      'filtrer les paiements par date',
      'voir les paiements de plus de 100 dollars',
      'filtrer les paiements de factures par carte',
      'filtre par période',
      'filtre de montant minimum maximum',
      'le plus petit montant doit venir en premier',
      'filtrer les factures par catégorie',
      'effacer les filtres',
      'choisir les dates début fin',
      'filtre payé avec tous les comptes',
      'filtrer par montant dans la recherche',
      'comment réduire les résultats de la recherche de paiements',
    ],
    answer:
      'Avant d’écrire, la page de recherche liste des **Filtres**. Chacun ouvre sa propre page :\n\n' +
      '- **Période** : **Toutes les dates**, **Ce mois-ci**, **3 derniers mois**, **Cette année**, **L’année dernière** ou **Choisir les dates** (règle **Début** et **Fin**, puis **Voir les paiements**).\n' +
      '- **Montant** : **Minimum**, **Maximum** ou les deux, puis **Voir les paiements**. Le plus petit montant doit venir en premier.\n' +
      '- **Payé avec** : **Tous les comptes**, une carte ou un compte, ou **Aucune carte**.\n\n' +
      'Un filtre seul affiche des résultats, même sans rien écrire. Quand des résultats s’affichent, touche le nom d’un filtre pour le changer, ou **Effacer les filtres**. Il n’y a pas de filtre par catégorie : cherche plutôt par nom.',
    keywords: ['filtre', 'période', 'montant', 'payé avec'],
  },
  {
    id: 'bills.search.recent',
    title: 'Comment effacer les recherches récentes ?',
    questions: [
      'Comment effacer les recherches récentes ?',
      'supprimer les recherches récentes de paiements',
      'retirer une recherche des récentes',
      "c'est quoi la liste récentes dans la recherche",
      'pourquoi la recherche se souvient de ce que j’ai écrit',
      'recherches récentes de paiements',
      "effacer l'historique de recherche des paiements",
      'mes recherches de paiements sont enregistrées ?',
      'recherches récentes sur un autre téléphone',
      'combien de recherches récentes il garde',
      "supprimer l'historique de recherche",
      'enlever une recherche récente',
    ],
    answer:
      '**Récentes** montre tes 5 dernières recherches de paiements, de la plus récente à la plus ancienne. Touches-en une pour la relancer, ou touche le **X** à côté pour la retirer.\n\n' +
      'Une recherche est retenue quand tu touches **Rechercher** sur le clavier ou que tu ouvres un résultat, pas pendant que tu écris. Les recherches récentes sont gardées sur ce téléphone seulement et effacées quand tu te déconnectes.',
    keywords: ['récentes', 'recherches récentes', 'historique de recherche', 'effacer'],
  },
  {
    id: 'bills.search.not-found',
    title: 'Pourquoi la recherche ne trouve pas mon paiement ?',
    questions: [
      'Pourquoi la recherche ne trouve pas mon paiement ?',
      'aucun paiement ne correspond',
      'la recherche ne montre rien',
      'la recherche ne trouve pas ma facture',
      'chercher une catégorie ne trouve rien',
      "ma facture à venir n'est pas dans la recherche",
      'la recherche ne trouve pas les vieux paiements',
      'rien trouvé essaie un mot plus court',
      'il manque un paiement dans les résultats',
      'la recherche de paiements ne trouve rien mais je sais qu’il y est',
      'la recherche sur factures mensuelles ne trouve pas un paiement que j’ai fait',
      "la recherche ne trouve pas un paiement de l'historique",
      'un paiement que j’ai fait ne s’affiche pas quand je tape son nom',
      "je sais que j'ai payé mais la recherche ne montre pas le paiement",
    ],
    answer:
      'Quelques points à vérifier :\n\n' +
      '- La recherche regarde les noms seulement, pas les catégories ni les notes. Essaie une partie du nom, comme « élec ».\n' +
      '- Elle ne trouve que les paiements déjà sortis, pas ceux à venir.\n' +
      '- Vérifie l’onglet **Tous** / **Factures** / **Abonnements**, et touche **Effacer les filtres**.\n' +
      '- Avec le forfait gratuit, seuls les 90 derniers jours sont listés. Les résultats plus anciens comptent quand même dans les totaux, et **Ton historique plus ancien est conservé** apparaît.\n' +
      '- Les paiements de plus de 7 années civiles ne sont pas affichés.\n\n' +
      'Rien trouvé ? Essaie un mot plus court ou une autre année.',
    keywords: ['aucun résultat', 'introuvable', 'recherche vide', 'rien trouvé'],
  },
  {
    id: 'bills.export.how',
    title: 'Comment exporter mes paiements ?',
    questions: [
      'Comment exporter mes paiements ?',
      'exporter mes factures vers Excel',
      "télécharger l'historique de mes paiements",
      'je peux avoir un PDF de mes factures',
      'exporter les factures en csv',
      "envoyer l'historique de mes factures à mon comptable",
      'imprimer mes paiements',
      "pourquoi l'export des paiements est verrouillé",
      "l'export des paiements est gratuit ?",
      'exporter les abonnements',
      'exporter toutes les années',
      "partager l'historique des paiements",
      'envoyer mes factures à mon comptable en csv',
      'où est le bouton exporter',
    ],
    answer:
      'L’export fait partie de Skip Pro.\n\n' +
      '1. Ouvre **Historique des paiements**.\n' +
      '2. Choisis l’année et l’onglet **Tous**, **Factures** ou **Abonnements**.\n' +
      '3. Touche **Exporter en CSV ou PDF**, ou le bouton de partage en haut à droite.\n' +
      '4. Choisis **CSV** (pour Numbers, Excel ou Google Sheets) ou **PDF** (un relevé à imprimer ou à envoyer).\n' +
      '5. Touche **Exporter**. La feuille de partage de l’iPhone s’ouvre, pour l’enregistrer dans Fichiers, l’envoyer par courriel ou l’imprimer.\n\n' +
      'Pour toutes les années à la fois, ouvre **Toutes les années** et touche son bouton de partage.\n\n' +
      'Avec le forfait gratuit, ces boutons ouvrent plutôt une page sur Pro. Pro coûte {proMonthly} ou {proYearly}.',
    keywords: ['export', 'csv', 'pdf', 'excel'],
  },
  {
    id: 'bills.export.contents',
    title: 'Que contient le fichier d’export des paiements ?',
    questions: [
      'Que contient le fichier d’export des paiements ?',
      'quelles colonnes il y a dans le csv',
      "l'export inclut mes filtres de recherche ?",
      'exporter une seule facture',
      'rien à exporter pour cette année',
      'le bouton exporter est grisé',
      'à quoi ressemble le relevé pdf',
      "dans quelle devise est l'export",
      'comment le fichier est nommé',
      "l'export inclut les paiements de prêt ?",
      'quelles infos sont dans le fichier exporté',
      'le pdf exporté ressemble à quoi',
    ],
    answer:
      'L’export contient ce que **Historique des paiements** affiche : l’onglet où tu es et l’année (ou **Toutes les années**). Il n’utilise pas les filtres de recherche, donc pour une seule facture, exporte l’année et filtre dans ton tableur.\n\n' +
      '- **CSV** : une ligne par paiement avec **Date**, **Nom**, **Type** (Facture, Abonnement, ou Soldé et Paiement supplémentaire pour les prêts), **Montant** et **Payé avec**. Les montants sont des nombres simples, avec la devise dans le nom de la colonne.\n' +
      '- **PDF** : un relevé regroupé par mois, chaque mois avec son total, un **Total** général, et « Créé avec Skip Budget le » le jour où tu l’as fait.\n\n' +
      'Les fichiers sont nommés comme skip-bills-2026.pdf. Si une année est vide, Skip le dit et **Exporter** reste inactif.',
    keywords: ['colonnes csv', 'relevé pdf', 'fichier d’export', 'nom du fichier'],
  },
  {
    id: 'bills.balance.effect',
    title: 'Comment les factures changent mon Solde actuel ?',
    questions: [
      'Comment les factures changent mon Solde actuel ?',
      'pourquoi mon solde a baissé le 1er',
      'les factures sortent du solde de mon compte bancaire dans Skip ?',
      'comment les abonnements touchent le solde de ma carte',
      'le solde de ma carte de crédit a monté avec ma facture',
      'quand une facture sort de mon solde',
      "une facture compte avant sa date d'échéance ?",
      "pourquoi ma facture n'a pas changé le solde de mon compte",
      'factures et soldes des cartes',
      'mon loyer fait baisser mon solde actuel ?',
      'un abonnement annulé est encore dans mon solde',
      'quand le solde baisse à cause d’une facture',
      'ma facture est sur la carte de crédit, ça change quoi au solde de la carte',
    ],
    answer:
      'Chaque paiement compte à sa date d’échéance, pas avant. Ce jour-là :\n\n' +
      '- Ton **Solde actuel** sur **Accueil** baisse du montant.\n' +
      '- Payé avec une carte de crédit : ce que tu dois sur cette carte augmente.\n' +
      '- Payé avec un compte bancaire : le solde de ce compte baisse.\n' +
      '- Payé avec **Skip** : seul ton **Solde actuel** change.\n\n' +
      'Skip compte seulement les paiements à partir du jour où tu as saisi le solde de cette carte ou de ce compte, parce que ce chiffre incluait déjà tout ce qui précédait.\n\n' +
      'Exemple : ton compte chèques a $2,000 et un loyer de $1,000 en sort le 1er. Le 1er, le compte chèques affiche $1,000 et ton **Solde actuel** baisse de $1,000. Les factures arrêtées et les abonnements annulés gardent leurs paiements passés comptés.',
    keywords: ['solde actuel', 'solde de la carte', 'solde du compte', 'solde'],
  },
  {
    id: 'bills.balance.vs-month',
    title: 'Pourquoi Factures mensuelles et Solde actuel ne concordent pas ?',
    questions: [
      'Pourquoi Factures mensuelles et Solde actuel ne concordent pas ?',
      'à payer en octobre est plus que ce qui est sorti de mon solde',
      'différence entre le total des factures mensuelles et le solde actuel',
      'tuile factures mensuelles de accueil et solde actuel',
      'pourquoi la tuile factures mensuelles montre des factures pas encore payées',
      "mon solde a baissé d'une partie seulement de mes factures",
      'la tuile factures mensuelles de accueil additionne quoi',
      'pourquoi où est passé ton argent est plus gros que ce que j’ai dépensé',
      'total des factures contre solde',
      'le solde actuel ignore mes factures à venir',
      'le total du mois sur la page des factures est plus haut que ce qui est sorti de mon solde',
      'pourquoi le chiffre à payer sur factures mensuelles est plus grand que ce qui a été prélevé',
      'le chiffre à payer de la page des factures dépasse la baisse de mon solde',
    ],
    answer:
      'Ils répondent à des questions différentes.\n\n' +
      '- **À payer en octobre** sur **Factures mensuelles** additionne chaque date de facture du mois, y compris celles à venir. La tuile **Factures mensuelles** sur **Accueil** affiche la même chose, plus les paiements supplémentaires sur les prêts.\n' +
      '- **Solde actuel** retire seulement ce qui s’est déjà passé, jusqu’à aujourd’hui, et il ne repart jamais à zéro le 1er.\n\n' +
      'Exemple, le 13 octobre : le loyer ($1,000, le 1er) est payé et Internet ($60, le 25) est encore à venir. **À payer en octobre** affiche $1,060.00, mais seulement $1,000 est sorti de ton **Solde actuel** jusqu’ici. Les $60 en sortiront le 25.',
    keywords: [
      'solde actuel',
      'tuile factures mensuelles',
      'à payer en',
      'où est passé ton argent',
    ],
  },
  {
    id: 'bills.card-deleted',
    title: 'J’ai supprimé une carte qui payait mes factures',
    questions: [
      'J’ai supprimé une carte qui payait mes factures',
      'que deviennent mes factures si je supprime une carte',
      "j'ai retiré ma carte de crédit et mes factures disent ajouter une carte",
      "j'ai fermé mon compte bancaire dans Skip, et mes abonnements ?",
      'paiements de carte supprimée affichent aucune carte',
      'supprimer une carte va supprimer mes factures ?',
      'déplacer mes factures après avoir supprimé une carte',
      'mes factures ont perdu leur carte',
      'ma vieille carte a été retirée',
      'supprimer un compte et ma facture de loyer',
      "j'ai fermé une carte et mes factures n'ont plus de carte",
      "que faire des factures de la carte que j'ai retirée",
    ],
    answer:
      'Tes factures et tes abonnements restent. Ils perdent seulement leur carte. Sur **Factures mensuelles** et **Abonnements**, ils affichent un lien **Ajouter une carte**, et leurs paiements passés indiquent **Aucune carte**. Ces paiements comptent quand même dans tes dépenses et ton **Solde actuel**.\n\nPour redonner une carte à l’un d’eux :\n\n1. Touche **Ajouter une carte** (ou le crayon sur sa page).\n2. Choisis une carte ou un compte.\n3. Touche **Enregistrer les modifications**.\n\nChoisis **Passés et à venir** si tu veux aussi mettre les paiements passés sur la nouvelle carte. Ça change aussi le solde de la nouvelle carte.',
    keywords: ['carte supprimée', 'carte retirée', 'aucune carte', 'ajouter une carte'],
  },
  {
    id: 'bills.reminder.change',
    title: 'Comment changer ou désactiver un rappel de facture ?',
    questions: [
      'Comment changer ou désactiver un rappel de facture ?',
      'désactiver le rappel pour Netflix',
      'arrêter les rappels pour mon loyer',
      'passer le rappel de 1 jour à 3 jours',
      "changer l'heure de mon rappel de facture",
      'où sont les rappels de factures dans les réglages',
      'je peux avoir deux rappels pour une facture',
      'trop de notifications de factures',
      'retirer un rappel',
      'réglages des rappels pour les abonnements',
      "comment modifier le rappel d'un abonnement",
      'je veux plus de rappel pour mon loyer',
    ],
    answer:
      'Il y a deux façons :\n\n' +
      '1. Ouvre la facture ou l’abonnement, touche le crayon, change **Rappel** (choisis **Aucun rappel** pour le désactiver) ou touche la pastille d’heure, puis touche **Enregistrer les modifications**.\n' +
      '2. Ou va dans **Réglages → Préférences → Rappels**. Tes factures et tes abonnements y sont listés avec leur montant et leur prochaine date, et tu peux changer chacun.\n\n' +
      'Chaque facture ou abonnement a un seul rappel. Tu ne peux pas en ajouter un deuxième pour la même chose.',
    keywords: ['rappel', 'désactiver', 'changer le rappel', 'heure du rappel'],
  },
  {
    id: 'bills.reminder.missing',
    title: 'Pourquoi mon rappel de facture n’est pas arrivé ?',
    questions: [
      'Pourquoi mon rappel de facture n’est pas arrivé ?',
      'aucune notification pour ma facture',
      'le rappel de facture ne marche pas',
      "le rappel de renouvellement de mon abonnement n'est jamais venu",
      "j'ai réglé un rappel mais je n'ai rien reçu",
      'le rappel est arrivé le mauvais jour',
      'pas prévenu avant le loyer',
      'les rappels se sont arrêtés après mon annulation',
      'mon rappel est en retard',
      'le rappel de Netflix manque',
      "j'ai jamais reçu de notif pour ma facture",
      "pas de rappel alors que j'en ai mis un",
    ],
    answer:
      'Quelques points à vérifier :\n\n' +
      '- Dans **Réglages → Notifications → Skip Budget** sur ton iPhone, les notifications doivent être autorisées.\n' +
      '- Le rappel se calcule à rebours depuis **Prochaine échéance** (ou **Prochain renouvellement**) sur sa page. Vérifie que cette date est la bonne.\n' +
      '- Si le jour du rappel était déjà passé quand tu l’as réglé, comme **1 semaine** avant une facture due dans 3 jours, le premier arrive avec la prochaine échéance.\n' +
      '- Il arrive à ton heure ou un peu après, à environ 15 minutes près, dans ton fuseau horaire.\n' +
      '- Les factures arrêtées et les abonnements annulés n’envoient aucun rappel.\n' +
      '- Ouvre la facture, touche le crayon et vérifie que **Rappel** n’est pas sur **Aucun rappel**.\n\n' +
      'Skip n’a pas besoin d’être ouvert pour que les rappels arrivent.',
    keywords: ['rappel', 'notification', 'ne marche pas', 'en retard'],
  },
  {
    id: 'bills.notifications.went-out',
    title: 'C’est quoi la notification « Paiements prélevés » ?',
    questions: [
      'C’est quoi la notification « Paiements prélevés » ?',
      'j’ai reçu une notification qui dit $50 prélevé',
      'message de paiements prélevés pour mes factures',
      'pourquoi Skip m’a dit que mon loyer est sorti',
      'désactiver les notifications de paiement prélevé',
      'notification après qu’une facture est payée',
      "j'ai une notification mais aucun rappel réglé",
      'ça veut dire quoi 5 prélèvements dans la notification',
      "je n'ai pas reçu le message de paiement prélevé",
      'j’ai reçu une notification $15.99 prélevé',
      'Skip m’a dit qu’une facture a été prélevée',
      'notification quand un abonnement est payé',
      "pourquoi je reçois des notifications que je n'ai pas réglées",
      'je peux désactiver les alertes de paiement prélevé',
    ],
    answer:
      'Quand la date d’une facture ou d’un abonnement arrive, Skip l’enregistre comme payé et envoie une notification avec son nom et le montant, comme « $15.99 prélevé ». Si plus de trois sortent en même temps, elles arrivent en une seule : **Paiements prélevés**, avec le nombre et le total.\n\nLa toucher ouvre cette facture ou cet abonnement, ou **Activité** pour un groupe.\n\nElle arrive sur tout téléphone où tu as activé les rappels dans Skip et autorisé les notifications, même pour les factures réglées sur **Aucun rappel**. Il n’y a pas d’interrupteur séparé pour elle. Désactiver les notifications de Skip dans l’app Réglages de l’iPhone l’arrête, mais arrête aussi tes rappels.\n\nSi tu ouvres Skip juste au début de la journée, Skip peut enregistrer le paiement avant l’envoi de la notification, et alors aucune n’est envoyée. Le paiement compte quand même.',
    keywords: ['prélevé', 'notification', 'paiements prélevés', 'prélèvements'],
  },
  {
    id: 'bills.logo.change',
    title: 'Comment changer le logo d’une facture ou d’un abonnement ?',
    questions: [
      'Comment changer le logo d’une facture ou d’un abonnement ?',
      'mauvais logo sur mon abonnement',
      'changer le logo sur une facture',
      'ma facture affiche des lettres au lieu d’un logo',
      "pourquoi ma facture n'a pas de logo",
      'retirer le logo d’une facture',
      'les logos sont gratuits pour les factures ?',
      'signaler un mauvais logo sur mon abonnement',
      'utiliser le site Web pour le logo de ma facture',
      "pas de logo, utiliser l'icône",
      "le logo n'est pas la bonne entreprise",
      "changer l'image d'une facture",
      'ma facture a la mauvaise image, comment la changer',
      "comment changer l'image d'un abonnement",
    ],
    answer:
      'Les logos sont gratuits pour tout le monde.\n\n' +
      '1. Ouvre la facture ou l’abonnement.\n' +
      '2. Touche son logo ou son icône en haut (il a un petit crayon).\n' +
      '3. Sur **Changer le logo**, touche **Oui, c’est ça** pour la suggestion, **Pas celui-ci** pour en voir d’autres, ou **Utiliser plutôt le site Web** pour écrire le site Web de l’entreprise.\n' +
      '4. Ou choisis **Pas de logo, utiliser l’icône** (factures) ou **Pas de logo, utiliser les lettres** (abonnements).\n' +
      '5. Touche **Enregistrer le logo**.\n\n' +
      'Si un logo est faux pour tout le monde, touche **Signaler ce logo**. Une facture sans entreprise choisie affiche l’icône de sa catégorie. Un abonnement sans logo affiche des lettres.',
    keywords: ['logo', 'changer le logo', 'icône', 'lettres'],
  },
  {
    id: 'bills.free.limits',
    title: 'Qu’est-ce qui est gratuit et Pro pour les factures ?',
    questions: [
      'Qu’est-ce qui est gratuit et Pro pour les factures ?',
      'il y a une limite au nombre de factures que je peux ajouter',
      'les abonnements sont gratuits à suivre',
      'il me faut pro pour les factures',
      'combien d’abonnements je peux ajouter gratuitement',
      'que ajoute pro aux factures',
      'les rappels de factures sont gratuits',
      'gratuit contre pro factures et abonnements',
      'factures mensuelles est une fonction pro',
      "pourquoi quelque chose est verrouillé dans l'historique des paiements",
      "qu'est-ce qui est inclus dans le forfait gratuit pour les factures et abonnements",
      'je dois payer pour les factures et abonnements dans Skip',
      'y a-t-il une limite de factures pour les utilisateurs gratuits',
      "qu'est-ce qui est gratuit pour les factures et abonnements",
    ],
    answer:
      'Presque tout est gratuit :\n\n' +
      '- Autant de factures et d’abonnements que tu veux\n' +
      '- Les rappels, les logos, **Factures mensuelles**, **Abonnements** et la page de chaque facture\n' +
      '- **Historique des paiements** et la recherche sur les 90 derniers jours, avec les totaux complets pour chaque année\n\n' +
      'Skip Pro ajoute :\n\n' +
      '- Des listes et une recherche qui remontent jusqu’à 7 ans\n' +
      '- **Exporter en CSV ou PDF** de tes paiements\n\n' +
      'Pro coûte {proMonthly} ou {proYearly}. Si Pro prend fin, rien de ce que tu as ajouté n’est supprimé : l’historique plus ancien est simplement masqué jusqu’à ce que tu aies de nouveau Pro.',
    keywords: ['gratuit', 'pro', 'limite', 'combien'],
  },
  {
    id: 'bills.duplicates',
    title: 'J’ai ajouté la même facture deux fois',
    questions: [
      'J’ai ajouté la même facture deux fois',
      'facture en double',
      'mon loyer est compté deux fois',
      'deux fois le même abonnement',
      'une facture apparaît deux fois',
      'pourquoi Netflix est prélevé deux fois ce mois-ci',
      'retirer un abonnement en double',
      'facture comptée en double',
      'Skip a prélevé ma facture deux fois ?',
      'abonnement listé deux fois sur la page abonnements',
      "j'ai Netflix deux fois dans ma liste",
      'comment me débarrasser d’un abonnement en double',
      'le même abonnement a été ajouté deux fois par erreur',
      "facture saisie deux fois, comment j'en retire une",
    ],
    answer:
      'Supprime celle en trop avec **Tout supprimer**, pour que ses paiements arrêtent de compter :\n\n' +
      '1. Ouvre le doublon depuis **Factures mensuelles** (ou **Abonnements**).\n' +
      '2. Touche le crayon, puis **Supprimer la facture** (ou **Supprimer l’abonnement**).\n' +
      '3. Touche **Tout supprimer**.\n\n' +
      'Les totaux et les soldes se mettent à jour tout de suite. Une même facture n’est jamais prélevée deux fois pour le même mois (ou la même semaine, le même trimestre ou la même année), donc un doublon veut généralement dire que deux copies ont été ajoutées.',
    keywords: ['doublon', 'deux fois', 'en double', 'compté deux fois'],
  },
  {
    id: 'bills.not-supported.bank',
    title: 'Skip paie-t-il mes factures ou se relie-t-il à ma banque ?',
    questions: [
      'Skip paie-t-il mes factures ou se relie-t-il à ma banque ?',
      'Skip peut payer mon loyer à ma place',
      'Skip trouve mes factures automatiquement ?',
      'je peux importer mes factures depuis ma banque',
      'relier ma banque pour voir mes factures',
      'Skip lit mes courriels pour trouver les factures ?',
      "payer une facture depuis l'app",
      'détection automatique des factures',
      'pourquoi je dois saisir mes factures à la main',
      'Skip configure les paiements automatiques ?',
      'Skip peut aller chercher mes factures dans ma boîte courriel',
      'Skip se branche à ma banque ?',
    ],
    answer:
      'Non. Skip ne déplace pas d’argent et ne paie rien, et il ne se connecte jamais à ta banque ni à ton courriel. Il suit les factures que tu ajoutes, compte chacune comme payée à son échéance et te rappelle avant. Tu paies toujours la facture comme d’habitude.\n\n' +
      'Ajoute chaque facture une fois avec **Ajout rapide → Facture** ou **Abonnement**, et Skip la suit ensuite chaque mois.\n\n' +
      'Pour faire une suggestion, va dans **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['banque', 'payer des factures', 'paiement automatique', 'importer'],
  },
  {
    id: 'subscriptions.cancel.company',
    title: 'Skip peut-il annuler un abonnement pour moi ?',
    questions: [
      'Skip peut-il annuler un abonnement pour moi ?',
      'annuler dans Skip arrête Netflix de me prélever ?',
      'annuler mon Spotify avec Skip',
      'Skip trouve mes abonnements automatiquement ?',
      'Skip peut détecter les abonnements depuis ma banque',
      "j'ai annulé dans Skip mais je suis encore prélevé",
      'désabonne-moi',
      "Skip contacte l'entreprise ?",
      'trouver des abonnements oubliés',
      'Skip résilie le service à ma place',
      "marquer annulé dans Skip empêche l'entreprise de prélever ma carte ?",
      "si je marque un abonnement annulé dans l'app, l'entreprise arrête de me facturer ?",
      'le statut annulé est juste pour mes dossiers ?',
      'Skip va annuler mon abonnement Netflix pour moi ?',
    ],
    answer:
      'Non. Skip n’est pas relié à l’entreprise ni à ta banque, donc il ne peut pas annuler, mettre en pause ou modifier un abonnement. Annule auprès de l’entreprise (sur son site Web ou son appli, ou dans l’app **Réglages** de l’iPhone pour les abonnements de l’App Store), puis marque-le **Annulé** dans Skip pour qu’il arrête de compter.\n\n' +
      'Skip ne peut pas non plus repérer les abonnements tout seul. Ajoute chacun avec **Ajout rapide → Abonnement**.\n\n' +
      'Pour faire une suggestion, va dans **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['annuler pour moi', 'détecter', 'toujours prélevé', 'se désabonner'],
  },
  {
    id: 'bills.not-supported.split',
    title: 'Puis-je partager une facture avec quelqu’un ?',
    questions: [
      'Puis-je partager une facture avec quelqu’un ?',
      'partager une facture avec mon colocataire',
      'diviser le loyer avec ma conjointe',
      'factures partagées',
      'je paie seulement la moitié d’Internet',
      'séparer les factures de services publics',
      'facture commune avec mon conjoint',
      'deux personnes peuvent voir la même facture',
      'comment suivre ma part d’une facture',
      'partager un abonnement familial',
      'on est 3 colocs, comment diviser le loyer',
      "je paie 50 % de l'électricité, comment l'ajouter",
    ],
    answer:
      'Skip n’a pas de factures partagées : chaque facture appartient à ton compte seulement. Le plus proche, c’est de saisir ta propre part comme montant. Par exemple, si le loyer est de $2,000 et que tu en paies la moitié, ajoute-le à $1,000. Tes totaux et tes soldes montrent alors ce que tu paies vraiment.\n\n' +
      'Pour demander des factures partagées, va dans **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['partager', 'colocataire', 'conjoint', 'moitié'],
  },
  {
    id: 'bills.not-supported.attach',
    title: 'Puis-je joindre une photo ou un PDF à une facture ?',
    questions: [
      'Puis-je joindre une photo ou un PDF à une facture ?',
      'joindre le relevé de ma facture',
      'garder une photo de ma facture',
      'téléverser un document de facture',
      'je peux numériser une facture d’électricité dans Skip',
      'ajouter un fichier à un abonnement',
      'garder une copie de la facture',
      'enregistrer le PDF de ma facture',
      'photo du reçu de loyer sur la facture',
      'pièces jointes pour les factures',
      'je peux mettre ma facture en pièce jointe',
      "stocker une photo de la facture d'électricité",
    ],
    answer:
      'Non. Les factures et les abonnements ne gardent ni photos ni fichiers. Tu peux écrire des détails comme un numéro de compte dans **Note**.\n\n' +
      'La numérisation et le téléversement sont pour les reçus (**Ajout rapide → Reçu**), et Skip en lit les détails plutôt que de garder l’image.\n\n' +
      'Si tu aimerais des pièces jointes sur les factures, dis-le-nous dans **Réglages → Assistance et commentaires → Partage une idée**.',
    keywords: ['joindre', 'photo', 'pdf', 'pièce jointe'],
  },
  {
    id: 'bills.add.any-regular',
    title: 'Puis-je ajouter un paiement régulier qui n’est pas une facture ?',
    questions: [
      'j’envoie de l’argent à ma famille à l’étranger chaque mois',
      'je donne de l’argent de poche à mon enfant',
      'don mensuel à un organisme',
      'ajouter un don mensuel',
      'l’argent que j’envoie au pays chaque mois',
      'pension alimentaire que je paie',
      'argent de poche de mes enfants chaque semaine',
      'virement régulier à quelqu’un',
      'dîme chaque mois',
      'mon paiement mensuel à ma mère',
      "une facture peut être autre chose qu'une entreprise",
      "allocation de mes enfants chaque mois, comment l'ajouter",
      "envoi d'argent mensuel à mes parents",
    ],
    answer:
      'Oui. Tout ce que tu paies selon un calendrier peut être une facture, même si ce n’est pas une entreprise : de l’argent envoyé à la famille, l’allocation d’un enfant, un don ou une pension alimentaire.\n\n1. Sur **Accueil**, touche **Ajout rapide → Facture**, puis **Autre**.\n2. Écris le montant et touche **Continuer**.\n3. Donne-lui un **Nom**, comme « Allocation », puis remplis **Date de paiement**, **Récurrence**, **Payée avec** et **Rappel**.\n4. Touche **Enregistrer la facture**.\n\nElle sort à chaque date, fait baisser ton **Solde actuel** et s’affiche dans **Factures mensuelles**.\n\nPour de l’argent que tu déplaces vers ton propre compte d’épargne, utilise plutôt **Ajouter de l’argent** sur ce compte, pour que ce ne soit pas compté comme une dépense.',
    keywords: ['allocation', 'don', 'argent envoyé', 'pension alimentaire'],
  },
  {
    id: 'bills.amount.calculator',
    title: 'Comment fonctionne la Calculatrice du montant ?',
    questions: [
      'comment marche le bouton calculatrice',
      'Division par zéro impossible',
      'AC sur la calculatrice, ça fait quoi',
      'je peux additionner deux montants avant d’enregistrer',
      'calculatrice sur le montant de la facture',
      'icône de calculatrice dans la case montant du salaire',
      'la calculatrice arrondit ?',
      '2 + 3 x 4 donne la mauvaise réponse',
      'comment diviser mon salaire annuel dans Skip',
      'calculatrice pour les revenus prévus',
      "le résultat de la calculatrice n'est pas allé dans le montant",
      'calculatrice dans Skip, comment ça marche',
      'à quoi sert AC sur la calculatrice',
    ],
    answer:
      'La **Calculatrice** fonctionne comme une calculatrice de poche, et **Terminé** place le résultat dans le montant. Tu la trouves sur le montant d’une facture, comme l’icône de calculatrice dans la case **Montant** de **Salaire**, et dans **Revenus prévus** quand tu ajoutes un compte bancaire.\n\n- **AC** efface tout, et la touche de retour efface le dernier chiffre.\n- **+**, **−**, **×** et **÷** s’appliquent dans l’ordre où tu les touches, donc 2 + 3 × 4 donne 20, pas 14.\n- Chaque étape est arrondie au centime.\n- **Terminé** achève un calcul même si tu n’as pas touché **=**.\n\nDiviser par zéro affiche **Division par zéro impossible** et efface le calcul. Touche la flèche de retour en haut pour quitter sans changer le montant.',
    keywords: ['calculatrice', 'AC', 'division par zéro', 'additionner'],
  },
];
