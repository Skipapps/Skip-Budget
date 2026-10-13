import { heldOutChat, NOT_ABOUT_SKIP } from './held-out-chat';
import { heldOutHabitsPro } from './held-out-habits-pro';
import { heldOutPayLoans } from './held-out-pay-loans';
import { heldOutReceiptsBills } from './held-out-receipts-bills';
import { heldOutStartHome } from './held-out-start-home';

/**
 * Questions written by people who never saw the library's own questions, each with the answer a
 * support person would give. Aliases point at an answer that was merged into another.
 */
export const HELD_OUT: { q: string; id: string }[] = [
  ...heldOutStartHome,
  ...heldOutReceiptsBills,
  ...heldOutPayLoans,
  ...heldOutHabitsPro,
  ...heldOutChat,
];

export const ALIASES: Record<string, string> = {
  'settings.support.getting-started': 'getting-started.card.back',
  'reminders.wrap-up.monthly': 'savings.wrapup.notification-switch',
  'reminders.receipts.daily': 'receipts.reminder.daily',
  'reminders.notice.went-out': 'bills.notifications.went-out',
  'cards.account-offer': 'getting-started.setup.account-offer',
  'pro.free.is-skip-free': 'getting-started.skip.free',
  'bills.setup.screen': 'getting-started.setup.bills',
  'pay.left-this-month': 'home.balance.left-this-month',
  'home.go-further.habits-pro': 'habits.pro.free',
  'pro.lapse.cards': 'cards.free.locked',
  'savings.habit-saved': 'habits.saved.real-money',
  'savings.balance.relation': 'home.balance.vs-savings',
  'savings.tiles.cards': 'cards.money.tiles',
};

export { NOT_ABOUT_SKIP };
