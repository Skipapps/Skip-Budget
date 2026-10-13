import type { Conversation } from './conversation-types';

export const conversationsA: Conversation[] = [
  // ---- pronoun follow-ups ----
  {
    pattern: 'pronoun',
    turns: [
      { say: 'how do i add a credit card', expect: ['cards.card.add'] },
      { say: 'is it free', expect: ['cards.free.limits'] },
      { say: 'ok can i delete it later', expect: ['cards.card.delete'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'whats the big number on home', expect: ['home.balance.what'] },
      { say: 'does it reset every month', expect: ['home.balance.reset'] },
      { say: 'so when does it change', expect: ['home.balance.when'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'how do i put my salary in', expect: ['pay.salary.add'] },
      { say: 'can i change it later', expect: ['pay.salary.edit'] },
      { say: 'what if its a raise', expect: ['pay.edit.raise'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'whats the getting started card', expect: ['getting-started.card.what'] },
      { say: 'how do i hide it', expect: ['getting-started.card.hide'] },
      { say: 'and if i want it back', expect: ['getting-started.card.back'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'what is lets set up skip', expect: ['getting-started.setup.what'] },
      { say: 'can i skip it', expect: ['getting-started.setup.later'] },
      { say: 'do i have to add a receipt in it', expect: ['getting-started.setup.receipt'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'what is new money', expect: ['cards.money.new'] },
      { say: 'where do i add it', expect: ['cards.money.add', 'home.balance.add-money'] },
      { say: 'does it count as income', expect: ['home.balance.income', 'cards.money.new'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'is skip safe to use', expect: ['getting-started.skip.safe'] },
      { say: 'does it need my bank login', expect: ['getting-started.skip.bank', 'privacy.bank'] },
      {
        say: 'so how does it know what i spend',
        expect: ['getting-started.skip.bank', 'getting-started.skip.what'],
      },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'what is just this time pay', expect: ['pay.once.what'] },
      { say: 'how do i add one', expect: ['pay.once.add'] },
      { say: 'will it show in total per month', expect: ['pay.total.per-month', 'pay.once.what'] },
    ],
  },

  // ---- same question, new subject ----
  {
    pattern: 'new-subject',
    turns: [
      { say: 'how do i delete a credit card', expect: ['cards.card.delete'] },
      { say: 'what about a bank account', expect: ['cards.account.delete'] },
      { say: 'and what happens to my bills then', expect: ['cards.account.delete-effects'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'what are the tabs at the bottom', expect: ['getting-started.nav.tabs'] },
      { say: 'what about the round button', expect: ['getting-started.nav.voice'] },
      { say: 'and the pencil and bin icons', expect: ['getting-started.nav.icons'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'what balance do i type for my card', expect: ['cards.card.balance-start'] },
      { say: 'and for my bank account', expect: ['cards.account.balance-start'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'how is my card balance worked out', expect: ['cards.balance.card-calc'] },
      { say: 'what about my bank account', expect: ['cards.balance.account-calc'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'what is income on the balance card', expect: ['home.balance.income'] },
      { say: 'what about expenses', expect: ['home.balance.expenses'] },
      { say: 'and the percent bar', expect: ['home.balance.percent'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'how do i sign up with email', expect: ['getting-started.signup.email'] },
      { say: 'what about apple', expect: ['getting-started.signup.apple'] },
      { say: 'and google?', expect: ['getting-started.signup.google'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'is skip on android', expect: ['getting-started.platform.android'] },
      { say: 'what about ipad', expect: ['getting-started.platform.ipad'] },
      { say: 'is there a website version', expect: ['getting-started.platform.web'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'how do i get a reminder before my card is due', expect: ['cards.due.reminder'] },
      { say: 'what about before payday', expect: ['pay.reminder'] },
      { say: 'and for a bill?', expect: ['reminders.item.turn-on'] },
    ],
  },

  // ---- already done ----
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i add my salary', expect: ['pay.salary.add'] },
      { say: 'i did that already, how do i add a second job', expect: ['pay.multiple'] },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i add a credit card', expect: ['cards.card.add'] },
      { say: 'i already added it. how do i put a limit on it', expect: ['cards.limit.edit'] },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i hide the getting started card', expect: ['getting-started.card.hide'] },
      { say: 'i know, i did that. how do i get it back', expect: ['getting-started.card.back'] },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i pay my credit card', expect: ['cards.pay-card.how'] },
      { say: 'i already did, how do i undo it', expect: ['cards.payment.remove'] },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'i forgot my password', expect: ['getting-started.password.forgot'] },
      {
        say: 'i did the forgot password thing but the code never came',
        expect: ['getting-started.code.missing'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i go back a day on home', expect: ['home.date.use'] },
      {
        say: 'i know the arrow. how do i go further back than 90 days',
        expect: ['home.date.limit'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i add a bank account', expect: ['cards.account.add'] },
      {
        say: 'i already did that, how do i make my pay go into it',
        expect: ['pay.paid-into.what', 'cards.account.link-pay'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i sign out', expect: ['getting-started.signout.how'] },
      {
        say: 'yeah i did. now how do i log back in with apple',
        expect: ['getting-started.signup.apple', 'getting-started.signin.how'],
      },
    ],
  },

  // ---- "no, I mean ..." ----
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i delete a card', expect: ['cards.card.delete'] },
      { say: 'no i mean my bank account', expect: ['cards.account.delete'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i add a card', expect: ['cards.card.add'] },
      { say: 'not credit, i mean debit', expect: ['cards.debit'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i add pay', expect: ['pay.salary.add'] },
      { say: 'no i mean a one time bonus', expect: ['pay.once.add'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'why doesnt my balance match my bank', expect: ['home.balance.wrong'] },
      { say: 'no i mean the balance on my card page, not home', expect: ['cards.balance.wrong'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i log in', expect: ['getting-started.signin.how'] },
      { say: 'no i mean log out', expect: ['getting-started.signout.how'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i change my email', expect: ['getting-started.account.email-change'] },
      { say: 'not that, i mean my password', expect: ['getting-started.password.change'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'can i export my transactions', expect: ['activity.export.how'] },
      { say: 'no i mean my receipts', expect: ['receipts.not.export'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      {
        say: 'whats the difference between checking and savings',
        expect: ['cards.account.type'],
      },
      {
        say: 'no i mean the savings page, not the account',
        expect: ['savings.page.what', 'savings.bank-account'],
      },
    ],
  },

  // ---- "that's not what I asked" then a rephrase ----
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i change my balance', expect: ['home.balance.fix'] },
      { say: 'thats not what i asked', expect: ['any'] },
      { say: 'i want to change the amount in my bank account', expect: ['cards.account.edit'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i add money', expect: ['cards.money.add', 'home.balance.add-money'] },
      { say: 'no thats not it', expect: ['any'] },
      { say: 'i mean a paycheck', expect: ['pay.salary.add'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'what is the limit', expect: ['cards.limit.what'] },
      { say: "that's not what i asked", expect: ['any'] },
      { say: 'how many cards can i have on free', expect: ['cards.free.limits'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i delete my account', expect: ['privacy.delete-account'] },
      { say: 'not what i asked', expect: ['any'] },
      { say: 'i just want to remove my bank account from skip', expect: ['cards.account.delete'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'where is my pay', expect: ['pay.page.overview', 'pay.history'] },
      { say: 'thats not what i asked', expect: ['any'] },
      { say: 'why isnt my pay in my balance', expect: ['pay.balance.missing'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i change my password', expect: ['getting-started.password.change'] },
      { say: "that's not what i asked", expect: ['any'] },
      { say: 'i forgot it and cant log in', expect: ['getting-started.password.forgot'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'why is it red', expect: ['home.rows.colours'] },
      { say: 'thats not what i asked', expect: ['any'] },
      { say: 'why is my current balance negative', expect: ['home.balance.negative'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how much can i spend', expect: ['home.spend.until-payday'] },
      { say: "no that's not what i meant", expect: ['any'] },
      { say: 'can i set a budget', expect: ['home.screen.budget'] },
    ],
  },

  // ---- adding detail in the next turn ----
  {
    pattern: 'detail',
    turns: [
      { say: 'my balance is wrong', expect: ['home.balance.wrong', 'cards.balance.wrong'] },
      {
        say: 'its the big one on the home screen',
        expect: ['home.balance.wrong', 'home.balance.fix'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'what balance should i type', expect: ['home.balance.what-to-type'] },
      { say: 'for my credit card', expect: ['cards.card.balance-start'] },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'how do i add an account', expect: ['cards.account.add'] },
      { say: 'im on the free plan and i already have one', expect: ['cards.free.limits'] },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'why is my balance negative', expect: ['home.balance.negative'] },
      {
        say: 'i only added a credit card, no bank account',
        expect: ['home.balance.negative', 'home.balance.no-accounts'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'my pay isnt showing', expect: ['pay.balance.missing'] },
      {
        say: 'its every 2 weeks and my last payday was friday',
        expect: ['pay.balance.missing', 'pay.payday.next'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      {
        say: 'why cant i see my old stuff',
        expect: ['pro.history.hidden', 'activity.history.free'],
      },
      { say: 'in the activity tab', expect: ['activity.history.free'] },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'i cant find the button', expect: ['getting-started.welcome.stuck'] },
      {
        say: 'its on the welcome page and my text is really big',
        expect: ['getting-started.welcome.stuck'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'how do i add hourly pay', expect: ['pay.hourly.setup'] },
      {
        say: '20 an hour, 40 hours, paid every 2 weeks',
        expect: ['pay.hourly.calc', 'pay.hourly.setup'],
      },
    ],
  },

  // ---- digging deeper ----
  {
    pattern: 'deeper',
    turns: [
      { say: 'what is the big number on home', expect: ['home.balance.what'] },
      { say: 'how is it worked out', expect: ['home.balance.calc'] },
      { say: 'why is mine negative', expect: ['home.balance.negative'] },
      { say: 'how do i fix it', expect: ['home.balance.negative', 'home.balance.fix'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what is income on the balance card', expect: ['home.balance.income'] },
      { say: 'why is it so big', expect: ['home.balance.income'] },
      {
        say: 'so how do i see just this month',
        expect: ['activity.periods.how', 'home.balance.income'],
      },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what is the activity tab', expect: ['activity.list.what'] },
      { say: 'how do week and month work', expect: ['activity.periods.how'] },
      { say: 'whats the card at the top', expect: ['activity.summary.what'] },
      { say: 'why doesnt it change when i search', expect: ['activity.summary.search'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what does next payday mean on the salary page', expect: ['pay.total.footer'] },
      { say: 'how does skip work it out', expect: ['pay.payday.next'] },
      { say: 'its showing the wrong date', expect: ['pay.payday.next', 'pay.payday.last'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what does owed now mean on my card', expect: ['cards.balance.card-calc'] },
      {
        say: 'why is it more than my bank says',
        expect: ['cards.balance.wrong', 'cards.balance.no-sync'],
      },
      { say: 'how do i fix it', expect: ['cards.balance.wrong', 'cards.card.edit'] },
      { say: 'what does starting point mean', expect: ['cards.card.new-balance'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what is coming up on home', expect: ['home.coming-up.what'] },
      { say: 'why isnt my rent in it', expect: ['home.coming-up.missing'] },
      {
        say: 'its due next month',
        expect: ['home.coming-up.missing', 'bills.month.other-months'],
      },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what is where your money went', expect: ['home.where.what'] },
      { say: 'how are the totals worked out', expect: ['home.where.calc'] },
      { say: 'why is it different from activity', expect: ['home.where.vs-activity'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'how do i sign up', expect: ['getting-started.signup.ways'] },
      { say: 'what is the 6 digit code for', expect: ['getting-started.code.what'] },
      { say: 'i didnt get it', expect: ['getting-started.code.missing'] },
      { say: 'now it says its expired', expect: ['getting-started.code.expired'] },
    ],
  },

  // ---- switching topic mid-chat ----
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'why is my current balance negative', expect: ['home.balance.negative'] },
      { say: 'also how do i turn on face id', expect: ['settings.app-lock.what'] },
      { say: 'does it cost anything', expect: ['pro.free.settings', 'settings.app-lock.what'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i add a credit card', expect: ['cards.card.add'] },
      { say: 'unrelated but how do i change the language', expect: ['settings.language.change'] },
      { say: 'thanks', expect: ['chat.thanks'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how is the balance worked out', expect: ['home.balance.calc'] },
      { say: 'how do i scan a receipt', expect: ['receipts.scan.how'] },
      { say: 'how many can i do for free', expect: ['receipts.limit.free'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'what is just this time pay', expect: ['pay.once.what'] },
      { say: 'whats the round button with the pro badge', expect: ['getting-started.nav.voice'] },
      { say: 'can i use it on free', expect: ['voice.pro.rules', 'getting-started.nav.voice'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i add my salary', expect: ['pay.salary.add'] },
      {
        say: 'different question, how do i cancel netflix in skip',
        expect: ['subscriptions.cancel.how'],
      },
      { say: 'and can skip cancel it for me', expect: ['subscriptions.cancel.company'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      {
        say: 'where is the activity tab',
        expect: ['getting-started.nav.tabs', 'activity.list.what'],
      },
      { say: 'who makes this app', expect: ['getting-started.skip.who-makes'] },
      { say: 'can i talk to a real person', expect: ['chat.human'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'why does my card show no cents', expect: ['cards.face.cents'] },
      { say: 'how much is pro', expect: ['pro.price.plans'] },
      { say: 'is there a free trial', expect: ['pro.trial.what'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i pay off my credit card', expect: ['cards.pay-card.how'] },
      { say: 'sorry another thing, how do i add a loan', expect: ['loans.add.how'] },
      { say: 'what do i type for apr', expect: ['loans.add.apr'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'what happens on the 1st of the month', expect: ['home.month.first-day'] },
      { say: 'how do i delete my account', expect: ['privacy.delete-account'] },
      { say: 'can i get it back after', expect: ['privacy.delete-undo'] },
    ],
  },

  // ---- a statement, then a question ----
  {
    pattern: 'statement',
    turns: [
      { say: 'i got paid today', expect: ['pay.payday.when-counts', 'pay.salary.add'] },
      { say: 'where do i put it', expect: ['pay.salary.add', 'pay.once.add'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i paid rent in cash', expect: ['home.balance.cash', 'cards.cash.wallet'] },
      { say: 'how do i record that', expect: ['home.balance.cash', 'bills.add.how'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      {
        say: 'my friend paid me back 50 bucks',
        expect: ['cards.money.paid-for-someone', 'home.balance.add-money'],
      },
      { say: 'where do i put that', expect: ['cards.money.add', 'home.balance.add-money'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      {
        say: 'i paid off my credit card this morning',
        expect: ['cards.pay-card.how', 'home.balance.card-payment'],
      },
      { say: 'how do i put that in', expect: ['cards.pay-card.how'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'my bank took my rent a day early', expect: ['home.balance.bank-timing'] },
      {
        say: 'how do i fix it in skip',
        expect: ['home.balance.bank-timing', 'bills.edit.date-change'],
      },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i got a bonus from work', expect: ['pay.once.add', 'pay.once.what'] },
      { say: 'where do i put it', expect: ['pay.once.add'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i took 200 out of the atm', expect: ['cards.cash.wallet'] },
      { say: 'how do i record that', expect: ['cards.cash.wallet'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      {
        say: 'i got a refund on my credit card',
        expect: ['home.balance.add-money', 'cards.money.new'],
      },
      { say: 'how do i add it', expect: ['home.balance.add-money', 'cards.pay-card.from'] },
    ],
  },

  // ---- "I did X but Y happened" ----
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i added my card but the balance didnt change',
        expect: ['home.balance.not-changed', 'cards.current-balance'],
      },
      {
        say: 'i typed 0 for what it owes',
        expect: ['cards.current-balance', 'home.balance.vs-cards'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      { say: 'i added my salary but my balance didnt go up', expect: ['pay.balance.missing'] },
      {
        say: 'it says next payday is friday',
        expect: ['pay.payday.when-counts', 'pay.balance.missing'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i paid my credit card in skip but my home balance went up',
        expect: ['cards.pay-card.from', 'home.balance.card-payment'],
      },
      { say: 'i picked somewhere else', expect: ['cards.pay-card.from'] },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i deleted my bank account and my balance went down',
        expect: ['cards.account.delete-effects', 'home.balance.delete'],
      },
      { say: 'can i get it back', expect: ['cards.account.delete'] },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      { say: 'i think my pay got counted twice', expect: ['pay.balance.double'] },
      { say: 'how do i fix it', expect: ['pay.balance.double'] },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i put in 500 weekly pay but the salary tile on cards says 2166',
        expect: ['pay.tile.cards', 'pay.total.per-month'],
      },
      { say: 'this month has five fridays', expect: ['pay.tile.cards'] },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i hid the getting started card and it came back',
        expect: ['getting-started.card.reappeared'],
      },
      {
        say: 'how do i stop it coming back',
        expect: ['getting-started.card.reappeared', 'getting-started.card.hide'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i typed my password right and it says no match',
        expect: ['getting-started.signin.wrong-password'],
      },
      {
        say: 'i signed up with apple',
        expect: ['getting-started.password.forgot-social', 'getting-started.signin.wrong-password'],
      },
    ],
  },

  // ---- small talk mixed in ----
  {
    pattern: 'small-talk',
    turns: [
      { say: 'hi', expect: ['chat.greeting'] },
      { say: 'how do i add a credit card', expect: ['cards.card.add'] },
      { say: 'thanks', expect: ['chat.thanks'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'how is the balance worked out', expect: ['home.balance.calc'] },
      { say: 'ok', expect: ['any'] },
      { say: 'thanks', expect: ['chat.thanks'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'hello sam', expect: ['chat.greeting'] },
      { say: 'whats the big number on home', expect: ['home.balance.what'] },
      { say: 'cool thanks', expect: ['chat.thanks'] },
      { say: 'bye', expect: ['chat.bye'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'how do i delete a bank account', expect: ['cards.account.delete'] },
      { say: 'great thank you so much', expect: ['chat.thanks', 'chat.compliment'] },
      { say: 'you are great', expect: ['chat.compliment'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'hey how are you', expect: ['chat.how-are-you', 'chat.greeting'] },
      { say: 'good. i need help with my salary', expect: ['pay.page.overview', 'pay.salary.add'] },
      { say: 'how do i change the amount', expect: ['pay.salary.edit'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'how do i add my salary', expect: ['pay.salary.add'] },
      { say: 'ok', expect: ['any'] },
      { say: 'got it thanks', expect: ['chat.thanks'] },
      { say: 'one more thing, can i add a second job', expect: ['pay.multiple'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'yo', expect: ['chat.greeting'] },
      { say: 'is skip free', expect: ['getting-started.skip.free'] },
      { say: 'ok cool', expect: ['any'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'hi', expect: ['chat.greeting'] },
      { say: 'are you a real person', expect: ['chat.ai'] },
      { say: 'ok. why is my balance negative', expect: ['home.balance.negative'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'why is my card faded', expect: ['cards.free.locked'] },
      { say: 'ahh ok thanks', expect: ['chat.thanks'] },
      { say: 'bye', expect: ['chat.bye'] },
    ],
  },
];
