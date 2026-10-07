import { defineMessages } from '@/i18n/translate';

export const proMessages = defineMessages({
  'pro.price.monthly': { en: '{price}/mo', es: '{price}/mes', fr: '{price}/mois' },
  'pro.price.yearly': { en: '{price}/yr', es: '{price}/año', fr: '{price}/an' },

  'pro.trial.day': {
    en: { one: '{count} day free', other: '{count} days free' },
    es: { one: '{count} día gratis', other: '{count} días gratis' },
    fr: { one: '{count} jour gratuit', other: '{count} jours gratuits' },
  },
  'pro.trial.week': {
    en: { one: '{count} week free', other: '{count} weeks free' },
    es: { one: '{count} semana gratis', other: '{count} semanas gratis' },
    fr: { one: '{count} semaine gratuite', other: '{count} semaines gratuites' },
  },
  'pro.trial.month': {
    en: { one: '{count} month free', other: '{count} months free' },
    es: { one: '{count} mes gratis', other: '{count} meses gratis' },
    fr: { one: '{count} mois gratuit', other: '{count} mois gratuits' },
  },
  'pro.trial.year': {
    en: { one: '{count} year free', other: '{count} years free' },
    es: { one: '{count} año gratis', other: '{count} años gratis' },
    fr: { one: '{count} an gratuit', other: '{count} ans gratuits' },
  },

  'pro.loans.title': {
    en: 'Know a loan to the cent',
    es: 'Conoce tu préstamo al centavo',
    fr: 'Connais ton prêt au cent près',
  },
  'pro.loans.tagline': {
    en: 'Most calculators guess with a twelfth of a year. Lenders charge by the day — and so does Skip.',
    es: 'La mayoría de las calculadoras adivinan con un doceavo de año. Los bancos cobran por día, y Skip también.',
    fr: 'La plupart des calculatrices devinent avec un douzième d’année. Les prêteurs comptent au jour près — et Skip aussi.',
  },
  'pro.loans.exact.title': {
    en: 'Matches your bank’s statement exactly',
    es: 'Coincide exactamente con el estado de cuenta de tu banco',
    fr: 'Correspond exactement au relevé de ta banque',
  },
  'pro.loans.exact.detail': {
    en: 'Payoff, next payment, accrued interest — the same figures your lender shows, to the cent.',
    es: 'Saldo para liquidar, próximo pago, intereses acumulados: las mismas cifras que muestra tu banco, al centavo.',
    fr: 'Solde à rembourser, prochain paiement, intérêts courus — les mêmes chiffres que ton prêteur, au cent près.',
  },
  'pro.loans.schedule.title': {
    en: 'Every payment, mapped out',
    es: 'Cada pago, desglosado',
    fr: 'Chaque paiement, détaillé',
  },
  'pro.loans.schedule.detail': {
    en: 'See how much of each month is interest, and what paying extra actually saves.',
    es: 'Ve cuánto de cada mes es interés y cuánto ahorras de verdad al pagar de más.',
    fr: 'Vois quelle part de chaque mois va aux intérêts, et ce que payer plus te fait vraiment économiser.',
  },
  'pro.loans.bill.title': {
    en: 'Filed as a bill, reminded on time',
    es: 'Guardado como factura, con recordatorio a tiempo',
    fr: 'Classé comme facture, avec un rappel à temps',
  },
  'pro.loans.bill.detail': {
    en: 'Save a loan once and its payment joins your bills, reminders and dashboard.',
    es: 'Guarda un préstamo una vez y su pago se suma a tus facturas, tus recordatorios y tu panel.',
    fr: 'Enregistre un prêt une fois et son paiement rejoint tes factures, tes rappels et ton tableau de bord.',
  },

  'pro.insights.title': {
    en: 'Your whole money picture, one page',
    es: 'Todo tu dinero, en una sola página',
    fr: 'Tout ton argent, sur une seule page',
  },
  'pro.insights.tagline': {
    en: 'Where you stand, what comes in, where it goes, what you keep.',
    es: 'Cómo estás, lo que entra, a dónde se va y lo que te queda.',
    fr: 'Où tu en es, ce qui entre, où ça va, ce que tu gardes.',
  },
  'pro.insights.stand.title': {
    en: 'Where you stand, honestly',
    es: 'Cómo estás, sin rodeos',
    fr: 'Où tu en es, honnêtement',
  },
  'pro.insights.stand.detail': {
    en: 'Savings, less what you owe on credit cards — one figure that means something.',
    es: 'Tus ahorros menos lo que debes en tarjetas de crédito: una cifra que sí dice algo.',
    fr: 'Ton épargne, moins ce que tu dois sur tes cartes de crédit — un seul chiffre qui veut dire quelque chose.',
  },
  'pro.insights.goes.title': {
    en: 'Where it actually goes',
    es: 'A dónde se va de verdad',
    fr: 'Où va vraiment ton argent',
  },
  'pro.insights.goes.detail': {
    en: 'By category and by shop, with the chart that shows which weeks did the damage.',
    es: 'Por categoría y por tienda, con la gráfica que muestra qué semanas hicieron el daño.',
    fr: 'Par catégorie et par magasin, avec le graphique qui montre quelles semaines ont fait des dégâts.',
  },
  'pro.insights.months.title': {
    en: 'What each month left behind',
    es: 'Lo que dejó cada mes',
    fr: 'Ce que chaque mois a laissé',
  },
  'pro.insights.months.detail': {
    en: 'Finished months, added up — the difference between feeling careful and being right.',
    es: 'Los meses terminados, sumados: la diferencia entre creer que te cuidas y saberlo.',
    fr: 'Les mois terminés, additionnés — la différence entre croire que tu fais attention et le savoir.',
  },

  'pro.scan.title': {
    en: 'Point, tap, filed',
    es: 'Apunta, toca y listo',
    fr: 'Vise, touche, c’est classé',
  },
  'pro.scan.tagline': {
    en: 'The camera finds the receipt, reads it, and fills the form. You just check it.',
    es: 'La cámara encuentra el recibo, lo lee y llena el formulario. Tú solo lo revisas.',
    fr: 'L’appareil photo trouve le reçu, le lit et remplit le formulaire. Tu n’as qu’à vérifier.',
  },
  'pro.scan.private.title': {
    en: 'Read on your phone, never uploaded',
    es: 'Se lee en tu teléfono, nunca se sube',
    fr: 'Lu sur ton téléphone, jamais téléversé',
  },
  'pro.scan.private.detail': {
    en: 'The photo is thrown away after reading — only the store, date and total are kept, on your account.',
    es: 'La foto se descarta después de leerla: solo se guardan la tienda, la fecha y el total, en tu cuenta.',
    fr: 'La photo est supprimée après la lecture — seuls le magasin, la date et le total sont conservés, dans ton compte.',
  },
  'pro.scan.handled.title': {
    en: 'Skew, glare, thermal print — handled',
    es: 'Torcido, con reflejos o en papel térmico: no hay problema',
    fr: 'De travers, avec reflets, sur papier thermique — réglé',
  },
  'pro.scan.handled.detail': {
    en: 'Skip straightens the page before reading it, which is the difference between a 3 and an 8.',
    es: 'Skip endereza la página antes de leerla, y esa es la diferencia entre un 3 y un 8.',
    fr: 'Skip redresse la page avant de la lire, ce qui fait la différence entre un 3 et un 8.',
  },
  'pro.scan.card.title': {
    en: 'The credit card comes pre-picked',
    es: 'La tarjeta de crédito ya viene elegida',
    fr: 'La carte de crédit est déjà choisie',
  },
  'pro.scan.card.detail': {
    en: 'When the last four digits match a credit card you track, it is already selected to save.',
    es: 'Si los últimos cuatro dígitos coinciden con una tarjeta de crédito que registras, ya viene seleccionada para guardar.',
    fr: 'Quand les quatre derniers chiffres correspondent à une carte de crédit que tu suis, elle est déjà sélectionnée pour l’enregistrement.',
  },

  'pro.voice.title': { en: 'Just say it', es: 'Solo dilo', fr: 'Dis-le, tout simplement' },
  'pro.voice.tagline': {
    en: 'Say what you spent or what’s due. Skip fills it in, and you check it before it’s saved.',
    es: 'Di lo que gastaste o lo que vence. Skip lo llena y tú lo revisas antes de guardarlo.',
    fr: 'Dis ce que tu as dépensé ou ce qui est à payer. Skip le remplit, et tu vérifies avant l’enregistrement.',
  },
  'pro.voice.kinds.title': {
    en: 'Receipts, bills and subscriptions',
    es: 'Recibos, facturas y suscripciones',
    fr: 'Reçus, factures et abonnements',
  },
  // The examples stay in English in every language: dictation only understands English.
  'pro.voice.kinds.detail': {
    en: '“$12.50 at Starbucks today.” “Rent $1,800, due on the 1st.” “Netflix $15.99 every month.” One sentence each.',
    es: '“$12.50 at Starbucks today.” “Rent $1,800, due on the 1st.” “Netflix $15.99 every month.” Una frase para cada uno, dicha en inglés.',
    fr: '« $12.50 at Starbucks today. » « Rent $1,800, due on the 1st. » « Netflix $15.99 every month. » Une phrase pour chacun, dite en anglais.',
  },
  'pro.voice.check.title': {
    en: 'Nothing saves until you say so',
    es: 'Nada se guarda hasta que tú lo digas',
    fr: 'Rien n’est enregistré sans ton accord',
  },
  'pro.voice.check.detail': {
    en: 'Skip shows exactly what it heard. Fix anything it missed, then tap Save. Nothing is filed without you.',
    es: 'Skip muestra exactamente lo que escuchó. Corrige lo que se le haya pasado y toca Guardar. Nada se guarda sin ti.',
    fr: 'Skip affiche exactement ce qu’il a entendu. Corrige ce qui manque, puis touche Enregistrer. Rien n’est classé sans toi.',
  },
  'pro.voice.private.title': {
    en: 'Skip never keeps your voice',
    es: 'Skip nunca guarda tu voz',
    fr: 'Skip ne garde jamais ta voix',
  },
  'pro.voice.private.detail': {
    en: 'Your iPhone turns what you say into text, on the phone when it can, or with Apple’s speech service when it can’t.',
    es: 'Tu iPhone convierte lo que dices en texto, en el propio teléfono cuando puede, o con el servicio de voz de Apple cuando no.',
    fr: 'Ton iPhone transforme ce que tu dis en texte, sur le téléphone quand il le peut, sinon avec le service vocal d’Apple.',
  },

  'pro.unlimited.title': {
    en: 'All your credit cards. All your accounts.',
    es: 'Todas tus tarjetas de crédito. Todas tus cuentas.',
    fr: 'Toutes tes cartes de crédit. Tous tes comptes.',
  },
  'pro.unlimited.tagline': {
    en: 'Free keeps one of each. Real wallets are bigger than that.',
    es: 'El plan Gratis incluye una de cada cosa. Las carteras de verdad tienen más.',
    fr: 'Le forfait Gratuit en garde un de chaque. Les vrais portefeuilles sont plus garnis.',
  },
  'pro.unlimited.all.title': {
    en: 'Every credit card and account you actually have',
    es: 'Cada tarjeta de crédito y cuenta que de verdad tienes',
    fr: 'Chaque carte de crédit et chaque compte que tu as vraiment',
  },
  'pro.unlimited.all.detail': {
    en: 'Track them all, with live balances and their own ledgers.',
    es: 'Lleva el control de todas, con saldos al día y sus propios movimientos.',
    fr: 'Suis-les tous, avec leurs soldes à jour et leur propre historique.',
  },
  'pro.unlimited.income.title': {
    en: 'Every income, counted',
    es: 'Todos tus ingresos, contados',
    fr: 'Tous tes revenus, comptés',
  },
  'pro.unlimited.income.detail': {
    en: 'Salary, side work, the second job — Left this month gets the whole truth.',
    es: 'Salario, trabajos extra, el segundo empleo: “Te queda este mes” conoce toda la verdad.',
    fr: 'Salaire, petits boulots, deuxième emploi — « Reste ce mois-ci » connaît toute la vérité.',
  },
  'pro.unlimited.kept.title': {
    en: 'Nothing ever locked or deleted',
    es: 'Nada se bloquea ni se borra',
    fr: 'Rien n’est jamais verrouillé ni supprimé',
  },
  'pro.unlimited.kept.detail': {
    en: 'If Pro lapses, everything you made keeps working exactly as it is — you just cannot add past the free allowance until you are back.',
    es: 'Si Pro vence, todo lo que creaste sigue funcionando tal como está; solo no podrás agregar más allá del límite gratis hasta que vuelvas.',
    fr: 'Si Pro prend fin, tout ce que tu as créé continue de fonctionner tel quel — tu ne peux simplement pas dépasser la limite gratuite avant ton retour.',
  },
});
