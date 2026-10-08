import { defineMessages } from '@/i18n/translate';

export const proMessages = defineMessages({
  'pro.price.monthly': { en: '{price}/mo', es: '{price}/mes', fr: '{price}/mois' },
  'pro.price.yearly': { en: '{price}/yr', es: '{price}/año', fr: '{price}/an' },

  'pro.period.day': {
    en: { one: '{count} day', other: '{count} days' },
    es: { one: '{count} día', other: '{count} días' },
    fr: { one: '{count} jour', other: '{count} jours' },
  },
  'pro.period.month': {
    en: { one: '{count} month', other: '{count} months' },
    es: { one: '{count} mes', other: '{count} meses' },
    fr: { one: '{count} mois', other: '{count} mois' },
  },
  'pro.period.year': {
    en: { one: '{count} year', other: '{count} years' },
    es: { one: '{count} año', other: '{count} años' },
    fr: { one: '{count} an', other: '{count} ans' },
  },

  // What a free person sees at a locked door: an icon, one example, a heading, one line and three
  // points, each one line. The examples are the same in every language (dictation is English).
  'pro.feature.included': {
    en: 'Included with Skip Pro',
    es: 'Incluido con Skip Pro',
    fr: 'Inclus avec Skip Pro',
  },
  'pro.feature.get': {
    en: 'Get Skip Pro — {monthly}',
    es: 'Obtener Skip Pro — {monthly}',
    fr: 'Obtenir Skip Pro — {monthly}',
  },
  'pro.voice.example': {
    en: '“$12.50 at Starbucks today”',
    es: '“$12.50 at Starbucks today”',
    fr: '“$12.50 at Starbucks today”',
  },
  'pro.voice.title': {
    en: 'Just say it',
    es: 'Solo dilo',
    fr: 'Dis-le simplement',
  },
  'pro.voice.subtitle': {
    en: 'Speak it. Skip writes it down.',
    es: 'Dilo y Skip lo anota.',
    fr: 'Dis-le, Skip le note.',
  },
  'pro.voice.a': {
    en: 'Log receipts, bills and subscriptions',
    es: 'Recibos, facturas y suscripciones',
    fr: 'Reçus, factures et abonnements',
  },
  'pro.voice.b': {
    en: 'You review it before it saves',
    es: 'Lo revisas antes de guardar',
    fr: 'Tu vérifies avant d’enregistrer',
  },
  'pro.voice.c': {
    en: 'Your voice is never stored',
    es: 'Tu voz nunca se guarda',
    fr: 'Ta voix n’est jamais gardée',
  },
  'pro.scan.example': {
    en: 'Starbucks · $12.50 · Today',
    es: 'Starbucks · $12.50 · Hoy',
    fr: 'Starbucks · $12.50 · Aujourd’hui',
  },
  'pro.scan.title': {
    en: 'Scan every receipt',
    es: 'Escanea cada recibo',
    fr: 'Scanne chaque reçu',
  },
  'pro.scan.subtitle': {
    en: 'Snap it. Skip reads it for you.',
    es: 'Haz la foto. Skip la lee.',
    fr: 'Prends la photo. Skip la lit.',
  },
  'pro.scan.a': {
    en: 'Unlimited scans and uploads',
    es: 'Escaneos y subidas sin límite',
    fr: 'Scans et imports illimités',
  },
  'pro.scan.b': {
    en: 'Handles glare and thermal print',
    es: 'Maneja reflejos y papel térmico',
    fr: 'Gère reflets et papier thermique',
  },
  'pro.scan.c': {
    en: 'Photos are never kept',
    es: 'Las fotos nunca se guardan',
    fr: 'Les photos ne sont jamais gardées',
  },
  'pro.insights.example': {
    en: 'Left this month · $1,240',
    es: 'Te queda este mes · $1,240',
    fr: 'Reste ce mois-ci · $1,240',
  },
  'pro.insights.title': {
    en: 'Money on one page',
    es: 'Todo en una página',
    fr: 'Tout sur une page',
  },
  'pro.insights.subtitle': {
    en: 'See what comes in and goes out.',
    es: 'Mira lo que entra y lo que sale.',
    fr: 'Vois ce qui entre et ce qui sort.',
  },
  'pro.insights.a': {
    en: 'Where you stand right now',
    es: 'Cómo estás ahora mismo',
    fr: 'Où tu en es maintenant',
  },
  'pro.insights.b': {
    en: 'Where your money goes',
    es: 'A dónde va tu dinero',
    fr: 'Où va ton argent',
  },
  'pro.insights.c': {
    en: 'Finished months, added up',
    es: 'Los meses cerrados, sumados',
    fr: 'Les mois terminés, additionnés',
  },
  'pro.history.example': {
    en: 'From 90 days to 7 years',
    es: 'De 90 días a 7 años',
    fr: 'De 90 jours à 7 ans',
  },
  'pro.history.title': {
    en: 'See further back',
    es: 'Mira más atrás',
    fr: 'Remonte plus loin',
  },
  'pro.history.subtitle': {
    en: 'Older entries are kept, not lost.',
    es: 'Lo anterior se guarda, no se pierde.',
    fr: 'L’ancien est conservé, pas perdu.',
  },
  'pro.history.a': {
    en: 'Up to 7 years of history',
    es: 'Hasta 7 años de historial',
    fr: 'Jusqu’à 7 ans d’historique',
  },
  'pro.history.b': {
    en: 'Nothing is ever deleted',
    es: 'Nada se borra nunca',
    fr: 'Rien n’est jamais supprimé',
  },
  'pro.history.c': {
    en: 'Balances always add up',
    es: 'Los saldos siempre cuadran',
    fr: 'Les soldes tombent toujours juste',
  },
  'pro.logos.example': {
    en: 'Netflix · Spotify · Uber',
    es: 'Netflix · Spotify · Uber',
    fr: 'Netflix · Spotify · Uber',
  },
  'pro.logos.title': {
    en: 'Every store, its logo',
    es: 'Cada tienda, su logo',
    fr: 'Un logo par magasin',
  },
  'pro.logos.subtitle': {
    en: 'Spot your spending at a glance.',
    es: 'Reconoce tus gastos de un vistazo.',
    fr: 'Repère tes dépenses d’un coup d’œil.',
  },
  'pro.logos.a': {
    en: 'Real logos, not just initials',
    es: 'Logos reales, no solo iniciales',
    fr: 'Vrais logos, pas que des initiales',
  },
  'pro.logos.b': {
    en: 'Pick the right logo for any store',
    es: 'Elige el logo de cualquier tienda',
    fr: 'Choisis le logo de chaque magasin',
  },
  'pro.logos.c': {
    en: 'Logos in lists and reminders',
    es: 'Logos en listas y recordatorios',
    fr: 'Logos dans les listes et rappels',
  },
  'pro.unlimited.example': {
    en: 'Visa ••4242 · Chase ••1180',
    es: 'Visa ••4242 · Chase ••1180',
    fr: 'Visa ••4242 · Chase ••1180',
  },
  'pro.unlimited.title': {
    en: 'Add them all',
    es: 'Añádelos todos',
    fr: 'Ajoute-les tous',
  },
  'pro.unlimited.subtitle': {
    en: 'Free keeps one card and one account.',
    es: 'Gratis incluye una tarjeta y una cuenta.',
    fr: 'Gratuit : une carte et un compte.',
  },
  'pro.unlimited.a': {
    en: 'Unlimited cards and accounts',
    es: 'Tarjetas y cuentas sin límite',
    fr: 'Cartes et comptes illimités',
  },
  'pro.unlimited.b': {
    en: 'Every income counted',
    es: 'Todos tus ingresos, contados',
    fr: 'Tous tes revenus, comptés',
  },
  'pro.unlimited.c': {
    en: 'Nothing locked if Pro ends',
    es: 'Nada se bloquea si Pro termina',
    fr: 'Rien n’est bloqué si Pro finit',
  },

  'pro.history.notice.title': {
    en: 'Older history is saved',
    es: 'Tu historial anterior está guardado',
    fr: 'Ton historique plus ancien est conservé',
  },
  'pro.history.notice.detail': {
    en: 'Free shows the last 90 days. Skip Pro shows up to 7 years.',
    es: 'Gratis muestra los últimos 90 días. Skip Pro muestra hasta 7 años.',
    fr: 'Gratuit affiche les 90 derniers jours. Skip Pro affiche jusqu’à 7 ans.',
  },
  // The examples stay in English in every language: dictation only understands English.

  'pro.page.notOpen': {
    en: 'Purchases are not open in this version yet. Everything on this page is coming shortly.',
    es: 'Las compras aún no están disponibles en esta versión. Todo lo de esta página llegará pronto.',
    fr: 'Les achats ne sont pas encore ouverts dans cette version. Tout ce qui est sur cette page arrive bientôt.',
  },
  'pro.page.restored': {
    en: 'Welcome back — Pro is active.',
    es: 'Qué gusto verte de nuevo: Pro está activo.',
    fr: 'Bon retour — Pro est actif.',
  },
  'pro.page.nothingToRestore': {
    en: 'No past purchase to restore.',
    es: 'No hay compras anteriores que restaurar.',
    fr: 'Aucun achat antérieur à restaurer.',
  },
  'pro.page.haveTitle': { en: 'You have Skip Pro', es: 'Tienes Skip Pro', fr: 'Tu as Skip Pro' },
  'pro.page.haveDetail': {
    en: 'Everything is unlocked. Billing is handled by Apple — renewals, changes and cancellation all live in your App Store subscriptions.',
    es: 'Todo está desbloqueado. Apple se encarga del cobro: las renovaciones, los cambios y la cancelación están en tus suscripciones del App Store.',
    fr: 'Tout est déverrouillé. La facturation est gérée par Apple — renouvellements, changements et annulation se trouvent dans tes abonnements de l’App Store.',
  },
  'pro.page.manage': {
    en: 'Manage in the App Store',
    es: 'Administrar en el App Store',
    fr: 'Gérer dans l’App Store',
  },
  'pro.page.oneMoment': { en: 'One moment…', es: 'Un momento…', fr: 'Un instant…' },
  'pro.page.checking': {
    en: 'Checking the store…',
    es: 'Consultando el App Store…',
    fr: 'Connexion à l’App Store…',
  },
  'pro.page.checkAgain': {
    en: 'Check again',
    es: 'Volver a consultar',
    fr: 'Vérifier à nouveau',
  },
  'pro.page.restore': {
    en: 'Restore purchase',
    es: 'Restaurar compra',
    fr: 'Restaurer l’achat',
  },
  'pro.page.terms': { en: 'Terms', es: 'Términos', fr: 'Conditions' },
  'pro.page.privacy': { en: 'Privacy', es: 'Privacidad', fr: 'Confidentialité' },

  'pro.page.title': {
    en: 'Get more with Skip Pro',
    es: 'Consigue más con Skip Pro',
    fr: 'Va plus loin avec Skip Pro',
  },
  'pro.page.coffee': {
    en: 'Less than a coffee a month.',
    es: 'Menos que un café al mes.',
    fr: 'Moins qu’un café par mois.',
  },
  'pro.page.tryFree': {
    en: 'Try Pro free for {period}',
    es: 'Prueba Pro gratis durante {period}',
    fr: 'Essaie Pro gratuitement pendant {period}',
  },
  'pro.page.thenYearly': {
    en: 'Then {price}/year. Cancel anytime.',
    es: 'Después, {price} al año. Cancela cuando quieras.',
    fr: 'Ensuite {price} par an. Annule quand tu veux.',
  },
  'pro.page.thenMonthly': {
    en: 'Then {price}/month. Cancel anytime.',
    es: 'Después, {price} al mes. Cancela cuando quieras.',
    fr: 'Ensuite {price} par mois. Annule quand tu veux.',
  },
  'pro.page.getYearly': {
    en: 'Get Pro for {price}/year',
    es: 'Obtén Pro por {price} al año',
    fr: 'Passe à Pro pour {price} par an',
  },
  'pro.page.getMonthly': {
    en: 'Get Pro for {price}/month',
    es: 'Obtén Pro por {price} al mes',
    fr: 'Passe à Pro pour {price} par mois',
  },
  'pro.page.billedYearly': {
    en: 'Billed once a year. Cancel anytime.',
    es: 'Se cobra una vez al año. Cancela cuando quieras.',
    fr: 'Facturé une fois par an. Annule quand tu veux.',
  },
  'pro.page.billedMonthly': {
    en: 'Billed every month. Cancel anytime.',
    es: 'Se cobra cada mes. Cancela cuando quieras.',
    fr: 'Facturé chaque mois. Annule quand tu veux.',
  },
  'pro.page.renews': {
    en: 'Billed by Apple. Renews automatically until you cancel in your App Store subscriptions.',
    es: 'Lo cobra Apple. Se renueva automáticamente hasta que lo canceles en tus suscripciones del App Store.',
    fr: 'Facturé par Apple. Se renouvelle automatiquement jusqu’à ce que tu l’annules dans tes abonnements de l’App Store.',
  },
  'pro.compare.what': { en: 'What you get', es: 'Lo que obtienes', fr: 'Ce que tu obtiens' },
  'pro.compare.free': { en: 'Free', es: 'Gratis', fr: 'Gratuit' },
  'pro.compare.pro': { en: 'Pro', es: 'Pro', fr: 'Pro' },
  'pro.compare.track': {
    en: 'Track spending & bills',
    es: 'Gastos y facturas',
    fr: 'Dépenses et factures',
  },
  'pro.compare.upload': {
    en: 'Upload any bill',
    es: 'Sube cualquier factura',
    fr: 'Importe tes factures',
  },
  'pro.compare.scan': { en: 'Scan receipts', es: 'Escanea recibos', fr: 'Numérise tes reçus' },
  'pro.compare.cards': {
    en: 'Cards & accounts',
    es: 'Tarjetas y cuentas',
    fr: 'Cartes et comptes',
  },
  'pro.compare.history': {
    en: 'Money history',
    es: 'Historial de dinero',
    fr: 'Historique',
  },
  'pro.compare.voice': { en: 'Voice entry', es: 'Entrada por voz', fr: 'Saisie vocale' },
  'pro.compare.insights': { en: 'Insights', es: 'Análisis', fr: 'Aperçu' },
  'pro.compare.logos': { en: 'Brand logos', es: 'Logos de marcas', fr: 'Logos des marques' },
  'pro.compare.early': {
    en: 'New features first',
    es: 'Novedades primero',
    fr: 'Nouveautés en avant-première',
  },
  'pro.compare.support': {
    en: 'Priority support',
    es: 'Soporte prioritario',
    fr: 'Assistance prioritaire',
  },
  'pro.compare.limited': { en: 'Limited', es: 'Limitado', fr: 'Limité' },
  'pro.compare.unlimited': { en: 'Unlimited', es: 'Ilimitado', fr: 'Illimité' },
  'pro.compare.days': {
    en: { one: '{count} day', other: '{count} days' },
    es: { one: '{count} día', other: '{count} días' },
    fr: { one: '{count} jour', other: '{count} jours' },
  },
  'pro.compare.years': {
    en: { one: '{count} year', other: '{count} years' },
    es: { one: '{count} año', other: '{count} años' },
    fr: { one: '{count} an', other: '{count} ans' },
  },
  'pro.compare.included': { en: 'included', es: 'incluido', fr: 'inclus' },
  'pro.compare.notIncluded': { en: 'not included', es: 'no incluido', fr: 'non inclus' },
  'pro.compare.row': {
    en: '{feature}: Free, {free}. Pro, {pro}.',
    es: '{feature}: Gratis, {free}. Pro, {pro}.',
    fr: '{feature} : Gratuit, {free}. Pro, {pro}.',
  },
  'pro.offer.badge': { en: 'ONE-TIME OFFER', es: 'OFERTA ÚNICA', fr: 'OFFRE UNIQUE' },
  'pro.offer.title': {
    en: 'Skip Pro, half price',
    es: 'Skip Pro a mitad de precio',
    fr: 'Skip Pro à moitié prix',
  },
  'pro.offer.titleSpecial': {
    en: 'Skip Pro, a one-time price',
    es: 'Skip Pro a un precio único',
    fr: 'Skip Pro à un prix unique',
  },
  'pro.offer.year': { en: 'year', es: 'año', fr: 'an' },
  'pro.offer.wasPrice': {
    en: 'Was {price}',
    es: 'Antes {price}',
    fr: 'Avant {price}',
  },
  'pro.offer.perMonth': {
    en: 'That’s just {price} a month.',
    es: 'Solo {price} al mes.',
    fr: 'Soit seulement {price} par mois.',
  },
  'pro.offer.min': { en: 'min', es: 'min', fr: 'min' },
  'pro.offer.sec': { en: 'sec', es: 'seg', fr: 's' },
  'pro.offer.timeLeft': {
    en: '{minutes} min {seconds} s left',
    es: 'Quedan {minutes} min {seconds} s',
    fr: 'Il reste {minutes} min {seconds} s',
  },
  'pro.offer.endsWhen': {
    en: 'This offer ends when the timer runs out.',
    es: 'Esta oferta termina cuando se acabe el tiempo.',
    fr: 'Cette offre prend fin à la fin du compte à rebours.',
  },
  'pro.offer.ended': {
    en: 'This offer has ended.',
    es: 'Esta oferta ha terminado.',
    fr: 'Cette offre est terminée.',
  },
  'pro.offer.endedButton': { en: 'Offer ended', es: 'Oferta terminada', fr: 'Offre terminée' },
  'pro.offer.includes': {
    en: 'Everything in Pro, including',
    es: 'Todo Pro, incluyendo',
    fr: 'Tout Pro, y compris',
  },
  'pro.offer.scans': {
    en: 'Unlimited receipt scans',
    es: 'Escaneos de recibos ilimitados',
    fr: 'Numérisations de reçus illimitées',
  },
  'pro.offer.voice': {
    en: 'Unlimited Voice entry',
    es: 'Entrada por voz ilimitada',
    fr: 'Saisie vocale illimitée',
  },
  'pro.offer.history': {
    en: { one: '{count} year of money history', other: '{count} years of money history' },
    es: { one: '{count} año de historial', other: '{count} años de historial' },
    fr: { one: '{count} an d’historique', other: '{count} ans d’historique' },
  },
  'pro.offer.insights': {
    en: 'Insights and brand logos',
    es: 'Análisis y logos de marcas',
    fr: 'Aperçu et logos des marques',
  },
  'pro.offer.once': {
    en: 'If you close this, you won’t see this offer again.',
    es: 'Si cierras esto, no volverás a ver esta oferta.',
    fr: 'Si tu fermes cette page, tu ne reverras plus cette offre.',
  },
  'pro.offer.noThanks': { en: 'No thanks', es: 'No, gracias', fr: 'Non merci' },
  'pro.offer.close': { en: 'Close', es: 'Cerrar', fr: 'Fermer' },
  'pro.plan.popular': { en: 'Most Popular', es: 'Más popular', fr: 'Le plus choisi' },
  'pro.plan.billedMonthly': {
    en: 'Billed monthly',
    es: 'Cobro mensual',
    fr: 'Facturé chaque mois',
  },
  'pro.plan.yearly': { en: 'Yearly', es: 'Anual', fr: 'Annuel' },
  'pro.plan.monthly': { en: 'Monthly', es: 'Mensual', fr: 'Mensuel' },
});
