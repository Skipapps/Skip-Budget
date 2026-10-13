import type { Conversation } from './conversation-types';

// Multi-turn chats about receipts, bills, subscriptions and loans. Each turn's
// `expect` lists the answer id(s) a good support person would reply with, or
// 'any' when no particular answer is required.
export const conversationsB: Conversation[] = [
  // ---------------------------------------------------------------- pronoun
  {
    pattern: 'pronoun',
    turns: [
      { say: 'how do i delete a recipt', expect: ['receipts.delete.how'] },
      { say: 'what if i delete it by mistake, can i undo that', expect: ['receipts.delete.undo'] },
      { say: 'ok so how do i put it back', expect: ['receipts.add.type', 'receipts.delete.undo'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'how do i add a bill', expect: ['bills.add.how'] },
      { say: 'is it free', expect: ['bills.free.limits'] },
      { say: 'can i change it later', expect: ['bills.edit.how'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'how do i cancel my netflix in skip', expect: ['subscriptions.cancel.how'] },
      {
        say: 'does that cancel it with netflix too',
        expect: ['subscriptions.cancel.company', 'subscriptions.cancel.how'],
      },
      {
        say: 'will i lose the old payments if i do that',
        expect: ['subscriptions.cancelled.what', 'bills.delete.choices'],
      },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'how do i pay off my car loan', expect: ['loans.payoff.how'] },
      { say: 'how is that amount worked out', expect: ['loans.payoff.full-amount'] },
      {
        say: 'why is it more than what i owe',
        expect: ['loans.payoff.full-amount', 'loans.left.calc'],
      },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      {
        say: 'it says your last payment would be 4948, whats that',
        expect: ['loans.add.balloon'],
      },
      { say: 'can i still save it', expect: ['loans.add.balloon'] },
      { say: 'how do i fix it', expect: ['loans.add.balloon', 'loans.problem.mismatch'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'whats a receipt book', expect: ['receipts.books.what'] },
      { say: 'do i have to pay for it', expect: ['receipts.books.what', 'receipts.free.what'] },
      { say: 'how do i make one', expect: ['receipts.books.create'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      {
        say: 'how do i stop my rent bill but keep the history',
        expect: ['bills.stop.how'],
      },
      { say: 'can i start it again later', expect: ['bills.stopped.restart'] },
      { say: 'how do i get it off the list for good', expect: ['bills.stopped.delete'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'how do i edit my loan', expect: ['loans.edit.how'] },
      {
        say: 'can i change the rate on it',
        expect: ['loans.edit.rate-change', 'loans.edit.how'],
      },
      {
        say: 'will that change the payments i already made',
        expect: ['loans.edit.rate-change', 'loans.edit.past-choice'],
      },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'wheres my subscriptions', expect: ['subscriptions.find.where'] },
      { say: 'how do i add one', expect: ['subscriptions.add.how'] },
      { say: 'what date do i put for it', expect: ['subscriptions.add.next-renewal'] },
    ],
  },

  // ------------------------------------------------------------ new-subject
  {
    pattern: 'new-subject',
    turns: [
      { say: 'how do i delete a bill', expect: ['bills.delete.how'] },
      { say: 'what about a subscription', expect: ['subscriptions.delete.how'] },
      { say: 'and a receipt?', expect: ['receipts.delete.how'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'how do i edit a receipt', expect: ['receipts.edit.how'] },
      { say: 'same for a bill?', expect: ['bills.edit.how'] },
      { say: 'and my loan', expect: ['loans.edit.how'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'is adding a loan free', expect: ['loans.rules.free'] },
      { say: 'what about bills', expect: ['bills.free.limits'] },
      { say: 'and receipts', expect: ['receipts.free.what', 'receipts.limit.free'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'where do i find my receipts', expect: ['receipts.page.find'] },
      { say: 'and my subscriptons', expect: ['subscriptions.find.where'] },
      { say: 'what about loans', expect: ['loans.page.what'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      {
        say: 'how do i add a receipt',
        expect: ['receipts.add.type', 'receipts.add.ways'],
      },
      { say: 'and a subscription?', expect: ['subscriptions.add.how'] },
      { say: 'same for a loan', expect: ['loans.add.how'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'can i add a note to a receipt', expect: ['receipts.field.note'] },
      { say: 'what about on a bill', expect: ['bills.add.note'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'how do i change the logo on a receipt', expect: ['receipts.logo.change'] },
      { say: 'same for a subscription', expect: ['bills.logo.change'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'can skip remind me before a loan payment', expect: ['loans.add.reminder'] },
      { say: 'and a bill?', expect: ['bills.add.reminder', 'reminders.item.turn-on'] },
      { say: 'what about receipts', expect: ['receipts.reminder.daily'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'i added the same receipt twice', expect: ['receipts.duplicate'] },
      { say: 'same with a loan', expect: ['loans.add.duplicate'] },
      { say: 'and a bill', expect: ['bills.duplicates'] },
    ],
  },

  // ----------------------------------------------------------- already-done
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i scann a receipt', expect: ['receipts.scan.how'] },
      {
        say: 'i already scanned it, how do i fix the store name',
        expect: ['receipts.scan.wrong', 'receipts.field.store'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i add a loan', expect: ['loans.add.how'] },
      {
        say: 'i know, i added it already. how do i change the monthly payment',
        expect: ['loans.edit.monthly-payment'],
      },
      {
        say: 'did that. can i change what i already paid too',
        expect: ['loans.edit.past-choice', 'loans.edit.monthly-payment'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i cancel a subscription', expect: ['subscriptions.cancel.how'] },
      {
        say: 'i did that already, how do i remove it from the list now',
        expect: ['bills.stopped.delete', 'subscriptions.delete.how'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'where are my bills', expect: ['bills.find.where'] },
      {
        say: 'i know where they are, i meant how do i see next month',
        expect: ['bills.month.other-months'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i make a receipt book', expect: ['receipts.books.create'] },
      {
        say: 'made one already, how do i move an old receipt into it',
        expect: ['receipts.books.move'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i pay off a loan', expect: ['loans.payoff.how'] },
      {
        say: 'i did that already but by mistake, how do i undo it',
        expect: ['loans.payoff.undo', 'loans.finished.readonly'],
      },
      { say: 'ok i undid it. how do i delete the whole loan', expect: ['loans.delete.how'] },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how many receipts can i scan for free', expect: ['receipts.limit.free'] },
      {
        say: 'i know, i already used all 15, what now',
        expect: ['receipts.limit.reached'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i add a subscription', expect: ['subscriptions.add.how'] },
      {
        say: 'i know that part, i just dont get which date to pick for next renewal',
        expect: ['subscriptions.add.next-renewal'],
      },
    ],
  },

  // ---------------------------------------------------------------- i-mean
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i delete my loan', expect: ['loans.delete.how'] },
      { say: 'no i mean pay it off', expect: ['loans.payoff.how'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i cancle a bill', expect: ['bills.stop.how', 'bills.delete.how'] },
      { say: 'no i mean leave the form without saving', expect: ['bills.add.cancel'] },
      { say: 'ok and how do i stop one i already paid before', expect: ['bills.stop.how'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i edit a receipt', expect: ['receipts.edit.how'] },
      { say: 'not that, i mean the logo', expect: ['receipts.logo.change'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how much did i pay on my internet bill', expect: ['bills.detail.total'] },
      {
        say: 'no i mean all my bills together for the year',
        expect: ['bills.history.page', 'bills.history.card'],
      },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i change my loan', expect: ['loans.edit.how'] },
      {
        say: 'no i mean just one payment, not the whole loan',
        expect: ['loans.edit.single-saved', 'loans.calculator.single-payment'],
      },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i add a receipt', expect: ['receipts.add.type', 'receipts.add.ways'] },
      { say: 'no i mean from a photo i already have', expect: ['receipts.upload.how'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'can i pause my spotify', expect: ['subscriptions.pause'] },
      { say: 'not pause, i mean cancel it', expect: ['subscriptions.cancel.how'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i see my subscriptions', expect: ['subscriptions.find.where'] },
      { say: 'no i mean how much they cost a month', expect: ['subscriptions.month.figure'] },
      { say: 'what about the yearly ones', expect: ['subscriptions.month.figure'] },
    ],
  },

  // ------------------------------------------------------- not-what-i-asked
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i change my bill', expect: ['bills.edit.how'] },
      { say: 'thats not what i asked', expect: ['any'] },
      { say: 'i mean when its due, the date', expect: ['bills.edit.date-change'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i delete a receipt', expect: ['receipts.delete.how'] },
      { say: 'no thats not what i asked', expect: ['any'] },
      {
        say: 'i deleted one by accident, how do i get it back',
        expect: ['receipts.delete.undo'],
      },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i add a loan', expect: ['loans.add.how'] },
      { say: 'that is not what i asked', expect: ['any'] },
      { say: 'what do i type for the monthly payment', expect: ['loans.add.monthly-first'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how many scans do i get', expect: ['receipts.limit.free'] },
      { say: 'thats not what i asked', expect: ['any'] },
      { say: 'when do they come back', expect: ['receipts.limit.reset'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i cancel my gym', expect: ['subscriptions.cancel.how'] },
      { say: 'thats not what i asked', expect: ['any'] },
      {
        say: 'does skip cancel it with the gym itself',
        expect: ['subscriptions.cancel.company'],
      },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i see a bill', expect: ['bills.find.where', 'bills.detail.page'] },
      { say: 'not what i asked', expect: ['any'] },
      {
        say: 'i want to see what i paid on it last year',
        expect: ['bills.history.years', 'bills.detail.total'],
      },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'why is my loan wrong', expect: ['loans.problem.mismatch'] },
      { say: 'thats not what i asked', expect: ['any'] },
      {
        say: 'my last payment is different from the others, why',
        expect: ['loans.math.last-payment'],
      },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i move my receipts', expect: ['receipts.books.move'] },
      { say: 'no not what i asked', expect: ['any'] },
      {
        say: 'i want to see all my receipts from last month',
        expect: ['receipts.list.range'],
      },
    ],
  },

  // ----------------------------------------------------------------- detail
  {
    pattern: 'detail',
    turns: [
      { say: 'how do i add a subscription', expect: ['subscriptions.add.how'] },
      { say: 'its a yearly one', expect: ['bills.add.recurring', 'subscriptions.add.how'] },
      { say: 'it renews in march', expect: ['subscriptions.add.next-renewal'] },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      {
        say: 'why isnt my insurance in coming up',
        expect: ['bills.month.coming-up', 'bills.missing.disappeared'],
      },
      {
        say: 'it shows under all bills though',
        expect: ['bills.month.all-bills', 'bills.month.coming-up'],
      },
      {
        say: 'its a yearly one',
        expect: ['bills.missing.disappeared', 'bills.month.due-figure'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      {
        say: 'why cant i see my old recepits',
        expect: ['receipts.history.limit', 'receipts.list.missing'],
      },
      { say: 'im on the free plan', expect: ['receipts.history.limit', 'receipts.free.what'] },
      {
        say: 'but do they still count in my totals',
        expect: ['receipts.history.limit', 'receipts.history.count-mismatch'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'why dont my loan numbers match my lender', expect: ['loans.problem.mismatch'] },
      {
        say: 'its a mortgage and the payment includes escrow',
        expect: ['loans.problem.escrow'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'how do i enter the amount on a receipt', expect: ['receipts.field.amount'] },
      { say: 'there was a tip and a coupon', expect: ['receipts.amount.what-to-type'] },
      { say: 'it was in euros too', expect: ['receipts.not.currency'] },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'what date do i pick for payment on', expect: ['bills.add.payment-on'] },
      { say: 'its due on the 31st', expect: ['bills.dates.month-end'] },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'can i change the payment on my loan', expect: ['loans.edit.monthly-payment'] },
      {
        say: 'i only paid extra one month',
        expect: ['loans.extra.record', 'loans.edit.single-saved'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'how much do my subscriptions cost a month', expect: ['subscriptions.month.figure'] },
      { say: 'i have a yearly one too', expect: ['subscriptions.month.figure'] },
      {
        say: 'what about the one i cancelled',
        expect: ['subscriptions.cancelled.what', 'subscriptions.month.figure'],
      },
    ],
  },

  // ----------------------------------------------------------------- deeper
  {
    pattern: 'deeper',
    turns: [
      {
        say: 'what does % paid off mean on my loan',
        expect: ['loans.percent.calc', 'loans.summary.progress'],
      },
      { say: 'how is it worked out', expect: ['loans.percent.calc', 'loans.summary.progress'] },
      {
        say: 'why is it so low after a year',
        expect: ['loans.percent.calc', 'loans.interest.split'],
      },
      { say: 'ok so how do i pay extra', expect: ['loans.extra.record'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what is the due in october number', expect: ['bills.month.due-figure'] },
      { say: 'how is it worked out', expect: ['bills.month.due-figure'] },
      {
        say: 'why is it higher than what came off my balance',
        expect: ['bills.balance.vs-month'],
      },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what is payment history', expect: ['bills.history.page'] },
      { say: 'how is avg / month worked out', expect: ['bills.history.card'] },
      { say: 'why can i only see 90 days', expect: ['bills.history.free-limit'] },
      {
        say: 'how do i see the rest',
        expect: ['bills.history.free-limit', 'bills.free.limits'],
      },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what does the scaner read off a receipt', expect: ['receipts.scan.reads'] },
      { say: 'how does it pick the total', expect: ['receipts.scan.total'] },
      { say: 'mine got it wrong', expect: ['receipts.scan.total', 'receipts.scan.wrong'] },
      { say: 'ok how do i fix it', expect: ['receipts.scan.wrong', 'receipts.field.amount'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'how does skip work out interest on a loan', expect: ['loans.interest.how'] },
      { say: 'why does most of my payment go to interest', expect: ['loans.interest.split'] },
      { say: 'how much will i pay in total', expect: ['loans.math.total-interest'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      {
        say: 'what does cancelled mean on a subscription',
        expect: ['subscriptions.cancelled.what'],
      },
      {
        say: 'how did it get there, i didnt cancel it',
        expect: ['subscriptions.cancelled.what', 'subscriptions.cancel.how'],
      },
      { say: 'can i turn it back on', expect: ['bills.stopped.restart'] },
      {
        say: 'so how do i add it again',
        expect: ['subscriptions.add.how', 'bills.stopped.restart'],
      },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what are receipt books', expect: ['receipts.books.what'] },
      { say: 'whats the default one', expect: ['receipts.books.default'] },
      { say: 'why does it keep asking me which book', expect: ['receipts.books.required'] },
      {
        say: 'how do i make it stop asking',
        expect: ['receipts.books.required', 'receipts.books.default'],
      },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'when is the first payment on a new loan', expect: ['loans.add.first-payment'] },
      { say: 'why does it have more interest than the rest', expect: ['loans.math.first-payment'] },
      { say: 'mine doesnt match my statement', expect: ['loans.problem.mismatch'] },
      { say: 'what do i check first', expect: ['loans.problem.mismatch'] },
    ],
  },

  // ----------------------------------------------------------- switch-topic
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i delete a loan', expect: ['loans.delete.how'] },
      { say: 'how do i delete my account', expect: ['privacy.delete-account'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i cancel a subscription', expect: ['subscriptions.cancel.how'] },
      { say: 'how do i cancel skip pro', expect: ['pro.manage.cancel'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'why does my loan balance not match my bank', expect: ['loans.problem.mismatch'] },
      { say: 'why is my current balance negative', expect: ['home.balance.negative'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i edit a receipt', expect: ['receipts.edit.how'] },
      {
        say: 'how do i change my name',
        expect: ['settings.profile.name', 'home.header.profile'],
      },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      {
        say: 'how do i set a reminder on a bill',
        expect: ['bills.add.reminder', 'reminders.item.turn-on'],
      },
      { say: 'how do i allow skips notifications', expect: ['reminders.permission.allow'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'i added the same bill twice', expect: ['bills.duplicates'] },
      { say: 'how do i sign out', expect: ['getting-started.signout.how'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i scan a receipt', expect: ['receipts.scan.how'] },
      { say: 'how much is pro', expect: ['pro.price.plans'] },
      { say: 'is there a free trial', expect: ['pro.trial.what'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      {
        say: 'my subscription disappeared',
        expect: ['bills.missing.disappeared', 'subscriptions.page'],
      },
      { say: 'different thing, how do i turn on face id', expect: ['settings.app-lock.what'] },
    ],
  },

  // -------------------------------------------------------------- statement
  {
    pattern: 'statement',
    turns: [
      { say: 'i paid my rent in cash', expect: ['bills.add.paid-with', 'bills.add.how'] },
      { say: 'how do i record that', expect: ['bills.add.how', 'bills.add.paid-with'] },
      {
        say: 'will it still come off my balance',
        expect: ['bills.add.paid-with', 'bills.balance.effect'],
      },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i got a loan from my bank', expect: ['loans.add.how', 'loans.page.what'] },
      { say: 'where does it go', expect: ['loans.page.what', 'loans.add.how'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'netflix went up to 17 dollars', expect: ['bills.edit.amount-change'] },
      {
        say: 'how do i change it',
        expect: ['bills.edit.amount-change', 'subscriptions.edit.how'],
      },
      {
        say: 'will my old months change',
        expect: ['bills.edit.past-or-upcoming', 'bills.edit.amount-change'],
      },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      {
        say: 'i bought groceries on my visa',
        expect: ['receipts.add.type', 'receipts.add.ways'],
      },
      { say: 'how do i put it in', expect: ['receipts.add.type', 'receipts.add.ways'] },
      { say: 'it was yesterday', expect: ['receipts.field.date'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i paid off my car loan early', expect: ['loans.payoff.how', 'loans.payoff.after'] },
      { say: 'how do i show that', expect: ['loans.payoff.how'] },
      { say: 'does that count as spending', expect: ['loans.payoff.spending'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i signed up for spotify yesterday', expect: ['subscriptions.add.how'] },
      { say: 'how do i add it', expect: ['subscriptions.add.how'] },
      {
        say: 'it already charged me so what date do i pick',
        expect: ['subscriptions.add.next-renewal'],
      },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i returned the shoes i bought', expect: ['receipts.not.refund'] },
      { say: 'how do i record that', expect: ['receipts.not.refund'] },
      { say: 'it was only one of two pairs', expect: ['receipts.not.refund'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i have a payment every 2 weeks', expect: ['bills.schedule.odd', 'bills.add.how'] },
      { say: 'how do i add that', expect: ['bills.schedule.odd'] },
    ],
  },

  // -------------------------------------------------------------- did-but
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i added a bill but its not showing',
        expect: ['bills.missing.disappeared', 'bills.month.coming-up'],
      },
      {
        say: 'its due next month',
        expect: ['bills.month.other-months', 'bills.missing.disappeared'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      { say: 'i scaned a receipt but the total is wrong', expect: ['receipts.scan.total'] },
      { say: 'how do i fix it', expect: ['receipts.scan.wrong', 'receipts.field.amount'] },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i added a receipt but my card balance didnt change',
        expect: ['receipts.balance.not-changed'],
      },
      {
        say: 'i picked skip for paid with',
        expect: ['receipts.balance.not-changed', 'receipts.field.skip'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      { say: 'i deleted my card but my bills still show', expect: ['bills.card-deleted'] },
      {
        say: 'how do i give them a card again',
        expect: ['bills.card-deleted', 'bills.month.add-card'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i paid extra on my loan but the payments left didnt change',
        expect: ['loans.payoff.partial', 'loans.card.payments-left'],
      },
      { say: 'it was only 50 dollars', expect: ['loans.payoff.partial'] },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      { say: 'i set a reminder on my bill but it never came', expect: ['bills.reminder.missing'] },
      {
        say: 'notifications are allowed in settings',
        expect: ['bills.reminder.missing', 'reminders.problem.not-arriving'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i added my loan but its not in monthly bills',
        expect: ['loans.problem.not-in-bills', 'bills.missing.disappeared'],
      },
      {
        say: 'how do i turn that on',
        expect: ['loans.problem.not-in-bills', 'loans.add.bills-switch'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i cancelled netflix in skip but they still charged me',
        expect: ['subscriptions.cancel.company', 'subscriptions.cancel.how'],
      },
      { say: 'can skip do it for me', expect: ['subscriptions.cancel.company'] },
    ],
  },

  // ------------------------------------------------------------- small-talk
  {
    pattern: 'small-talk',
    turns: [
      { say: 'hi', expect: ['chat.greeting'] },
      { say: 'who is sam', expect: ['chat.who'] },
      { say: 'how do i add a loan', expect: ['loans.add.how'] },
      { say: 'thanks', expect: ['chat.thanks'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'where do i see my bills', expect: ['bills.find.where'] },
      { say: 'ok', expect: ['any'] },
      { say: 'and how do i add one', expect: ['bills.add.how'] },
      { say: 'thanks!!', expect: ['chat.thanks'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'hello', expect: ['chat.greeting'] },
      { say: 'how are you', expect: ['chat.how-are-you'] },
      { say: 'can i scan a receipt', expect: ['receipts.scan.how'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'how do i delete a subscripton', expect: ['subscriptions.delete.how'] },
      { say: 'thx', expect: ['chat.thanks'] },
      { say: 'bye', expect: ['chat.bye'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'hey sam', expect: ['chat.greeting'] },
      {
        say: 'why is the last payment on my loan different',
        expect: ['loans.math.last-payment'],
      },
      { say: 'ok got it', expect: ['any'] },
      { say: 'youre great', expect: ['chat.compliment'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'how do i add a receipt', expect: ['receipts.add.type', 'receipts.add.ways'] },
      { say: 'ok', expect: ['any'] },
      { say: 'is it free', expect: ['receipts.free.what', 'receipts.limit.free'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'is this working', expect: ['chat.test'] },
      { say: 'how do i edit a bill', expect: ['bills.edit.how'] },
      { say: 'perfect thanks', expect: ['chat.thanks'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'how do i add a bill', expect: ['bills.add.how'] },
      { say: 'cool', expect: ['any'] },
      { say: 'what about a subscription', expect: ['subscriptions.add.how'] },
    ],
  },
];
