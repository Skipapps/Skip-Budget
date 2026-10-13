import { defineMessages } from '@/i18n/translate';

/**
 * The Ask Sam page around the answers: its header, welcome, composer, feedback and contact form.
 * Sam's own replies live with the answers in src/lib/ask-sam, one table per language.
 */
export const askSamMessages = defineMessages({
  'askSam.title': { en: 'Ask Sam', es: 'Pregúntale a Sam', fr: 'Demande à Sam' },
  'askSam.settings.title': { en: 'Ask Sam', es: 'Pregúntale a Sam', fr: 'Demande à Sam' },
  'askSam.settings.subtitle': {
    en: 'Questions about Skip, answered right away',
    es: 'Respuestas al momento sobre Skip',
    fr: 'Des réponses tout de suite sur Skip',
  },
  'askSam.welcome.title': {
    en: 'Hi, I’m Sam. How can I help?',
    es: 'Hola, soy Sam. ¿En qué te ayudo?',
    fr: 'Salut, je suis Sam. Comment je peux t’aider ?',
  },
  'askSam.welcome.subtitle': {
    en: 'Quick answers about bills, loans and goals.',
    es: 'Respuestas rápidas sobre facturas, préstamos y metas.',
    fr: 'Des réponses rapides sur les factures, les prêts et les objectifs.',
  },
  'askSam.welcome.common': {
    en: 'Common questions',
    es: 'Preguntas frecuentes',
    fr: 'Questions fréquentes',
  },
  'askSam.welcome.addBill': {
    en: 'How do I add a bill?',
    es: '¿Cómo agrego una factura?',
    fr: 'Comment ajouter une facture ?',
  },
  'askSam.welcome.loanInterest': {
    en: 'How is my loan interest calculated?',
    es: '¿Cómo se calcula el interés de mi préstamo?',
    fr: 'Comment sont calculés les intérêts de mon prêt ?',
  },
  'askSam.welcome.goals': {
    en: 'How do I move money to goals?',
    es: '¿Cómo paso dinero a mis metas?',
    fr: 'Comment mettre de l’argent dans mes objectifs ?',
  },
  'askSam.welcome.pastYears': {
    en: 'Can I see past years?',
    es: '¿Puedo ver años anteriores?',
    fr: 'Je peux voir les années passées ?',
  },
  'askSam.welcome.export': {
    en: 'How do I export payments?',
    es: '¿Cómo exporto mis pagos?',
    fr: 'Comment exporter mes paiements ?',
  },
  'askSam.welcome.more': {
    en: 'See all topics',
    es: 'Ver todos los temas',
    fr: 'Voir tous les sujets',
  },
  'askSam.placeholder': {
    en: 'Ask anything about Skip',
    es: 'Pregunta lo que quieras sobre Skip',
    fr: 'Pose ta question sur Skip',
  },
  'askSam.send': { en: 'Send', es: 'Enviar', fr: 'Envoyer' },
  'askSam.typing': { en: 'Sam is typing', es: 'Sam está escribiendo', fr: 'Sam écrit' },
  'askSam.helpful': {
    en: 'Was this helpful?',
    es: '¿Te sirvió?',
    fr: 'Ça t’a aidé ?',
  },
  'askSam.helpful.yes': { en: 'Helpful', es: 'Me sirvió', fr: 'Utile' },
  'askSam.helpful.no': { en: 'Not helpful', es: 'No me sirvió', fr: 'Pas utile' },
  'askSam.related': { en: 'Related', es: 'Relacionado', fr: 'Sur le même sujet' },
  'askSam.notQuite': {
    en: 'Not quite? Did you mean',
    es: '¿No era eso? Quizá buscabas',
    fr: 'Pas tout à fait ? Tu cherchais peut-être',
  },
  'askSam.open': { en: 'Open {screen}', es: 'Abrir {screen}', fr: 'Ouvrir {screen}' },

  'askSam.contact.help': { en: 'I need help', es: 'Necesito ayuda', fr: 'J’ai besoin d’aide' },
  'askSam.contact.idea': { en: 'I have an idea', es: 'Tengo una idea', fr: 'J’ai une idée' },
  'askSam.contact.name': { en: 'Your name', es: 'Tu nombre', fr: 'Ton nom' },
  'askSam.contact.message': { en: 'Your message', es: 'Tu mensaje', fr: 'Ton message' },
  'askSam.contact.helpPlaceholder': {
    en: 'What happened, and which screen were you on?',
    es: '¿Qué pasó y en qué pantalla estabas?',
    fr: 'Que s’est-il passé, et sur quel écran étais-tu ?',
  },
  'askSam.contact.ideaPlaceholder': {
    en: 'What would make Skip better for you?',
    es: '¿Qué haría Skip mejor para ti?',
    fr: 'Qu’est-ce qui rendrait Skip meilleure pour toi ?',
  },
  'askSam.contact.includeChat': {
    en: 'Include this chat, so you don’t have to repeat yourself',
    es: 'Incluir este chat, para no tener que repetirlo',
    fr: 'Joindre cette discussion, pour ne pas tout répéter',
  },
  'askSam.contact.replyTo': {
    en: 'The reply goes to {email}.',
    es: 'La respuesta llegará a {email}.',
    fr: 'La réponse arrivera à {email}.',
  },
  'askSam.contact.send': { en: 'Send', es: 'Enviar', fr: 'Envoyer' },
  'askSam.contact.sending': { en: 'Sending…', es: 'Enviando…', fr: 'Envoi…' },
  'askSam.contact.writeFirst': {
    en: 'Write your message first.',
    es: 'Primero escribe tu mensaje.',
    fr: 'Écris d’abord ton message.',
  },
  'askSam.contact.sent': {
    en: 'Sent. Someone from the Skip team will reply to {email}.',
    es: 'Enviado. Alguien del equipo de Skip te responderá a {email}.',
    fr: 'Envoyé. Quelqu’un de l’équipe Skip te répondra à {email}.',
  },
  'askSam.contact.sentNoEmail': {
    en: 'Sent. Someone from the Skip team will reply by email.',
    es: 'Enviado. Alguien del equipo de Skip te responderá por correo.',
    fr: 'Envoyé. Quelqu’un de l’équipe Skip te répondra par e-mail.',
  },
  'askSam.contact.chatHeading': {
    en: 'Chat with Ask Sam',
    es: 'Chat con Sam',
    fr: 'Discussion avec Sam',
  },

  'askSam.screen.home': { en: 'Home', es: 'Inicio', fr: 'Accueil' },
  'askSam.screen.cards': { en: 'Cards', es: 'Tarjetas', fr: 'Cartes' },
  'askSam.screen.transactions': { en: 'Activity', es: 'Actividad', fr: 'Activité' },
  'askSam.screen.settings': { en: 'Settings', es: 'Ajustes', fr: 'Réglages' },
  'askSam.screen.salary': { en: 'Salary', es: 'Salario', fr: 'Salaire' },
  'askSam.screen.habits': {
    en: 'Spending habits',
    es: 'Hábitos de gasto',
    fr: 'Habitudes de dépense',
  },
  'askSam.screen.habitNew': { en: 'New habit', es: 'Nuevo hábito', fr: 'Nouvelle habitude' },
  'askSam.screen.addLoan': { en: 'Add loan', es: 'Agregar préstamo', fr: 'Ajouter un prêt' },
  'askSam.screen.loans': { en: 'Loans', es: 'Préstamos', fr: 'Prêts' },
  'askSam.screen.loanCalculator': {
    en: 'Loan calculator',
    es: 'Calculadora de préstamos',
    fr: 'Calculateur de prêt',
  },
  'askSam.screen.pro': { en: 'Skip Pro', es: 'Skip Pro', fr: 'Skip Pro' },
  'askSam.screen.reminders': { en: 'Reminders', es: 'Recordatorios', fr: 'Rappels' },
  'askSam.screen.receipts': { en: 'Receipts', es: 'Recibos', fr: 'Reçus' },
  'askSam.screen.addReceipt': {
    en: 'Add a receipt',
    es: 'Agregar un recibo',
    fr: 'Ajouter un reçu',
  },
  'askSam.screen.preferences': { en: 'Preferences', es: 'Preferencias', fr: 'Préférences' },
  'askSam.screen.savings': { en: 'Savings', es: 'Ahorros', fr: 'Épargne' },
  'askSam.screen.voice': { en: 'Voice', es: 'Voz', fr: 'Voix' },
  'askSam.screen.insights': { en: 'Insights', es: 'Análisis', fr: 'Aperçu' },
  'askSam.screen.bills': {
    en: 'Monthly bills',
    es: 'Facturas mensuales',
    fr: 'Factures mensuelles',
  },
  'askSam.screen.addBill': { en: 'Add bill', es: 'Agregar factura', fr: 'Ajouter une facture' },
  'askSam.screen.subscriptions': { en: 'Subscriptions', es: 'Suscripciones', fr: 'Abonnements' },
  'askSam.screen.addSubscription': {
    en: 'Add subscription',
    es: 'Agregar suscripción',
    fr: 'Ajouter un abonnement',
  },
  'askSam.screen.privacy': {
    en: 'Privacy policy',
    es: 'Política de privacidad',
    fr: 'Politique de confidentialité',
  },
  'askSam.screen.terms': {
    en: 'Terms of service',
    es: 'Términos del servicio',
    fr: 'Conditions d’utilisation',
  },
  'askSam.screen.support': {
    en: 'Support and feedback',
    es: 'Soporte y comentarios',
    fr: 'Assistance et commentaires',
  },
  'askSam.screen.about': { en: 'About', es: 'Acerca de', fr: 'À propos' },
  'askSam.screen.yourMoney': { en: 'Your money', es: 'Tu dinero', fr: 'Ton argent' },
  'askSam.screen.sendToGoals': {
    en: 'Send to goals',
    es: 'Enviar a metas',
    fr: 'Envoyer aux objectifs',
  },
  'askSam.screen.goals': { en: 'Goals', es: 'Metas', fr: 'Objectifs' },
  'askSam.screen.goalCalculator': {
    en: 'Goal calculator',
    es: 'Calculadora de metas',
    fr: 'Calculateur d’objectif',
  },
  'askSam.screen.savingsEntry': {
    en: 'Add savings',
    es: 'Agregar ahorros',
    fr: 'Ajouter de l’épargne',
  },
  'askSam.screen.paymentSearch': {
    en: 'Search payments',
    es: 'Buscar pagos',
    fr: 'Rechercher des paiements',
  },
  'askSam.screen.paymentHistory': {
    en: 'Payment history',
    es: 'Historial de pagos',
    fr: 'Historique des paiements',
  },
  'askSam.screen.paymentExport': { en: 'Export', es: 'Exportar', fr: 'Exporter' },
  'askSam.screen.notifications': { en: 'Notifications', es: 'Notificaciones', fr: 'Notifications' },
  'askSam.screen.contact': {
    en: 'Email support',
    es: 'Escribir a soporte',
    fr: 'Écrire à l’assistance',
  },
  'askSam.screen.addAccount': {
    en: 'Add bank account',
    es: 'Agregar cuenta bancaria',
    fr: 'Ajouter un compte bancaire',
  },
  'askSam.screen.addCard': {
    en: 'Add credit card',
    es: 'Agregar tarjeta de crédito',
    fr: 'Ajouter une carte de crédit',
  },
  'askSam.screen.faq': {
    en: 'Common questions',
    es: 'Preguntas frecuentes',
    fr: 'Questions fréquentes',
  },
  'askSam.screen.avatar': { en: 'Profile picture', es: 'Foto de perfil', fr: 'Photo de profil' },
  'askSam.screen.receiptBook': {
    en: 'Receipt book',
    es: 'Libro de recibos',
    fr: 'Carnet de reçus',
  },
});
