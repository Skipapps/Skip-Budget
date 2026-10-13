import type { Conversation } from './conversation-types';

// Savings and goals, habits, Pro and settings, voice, privacy and help.
// `expect` lists the answers a good support person would give (either is fine);
// 'any' means Sam may answer anything sensible, e.g. "Anything else?" after an ok.
export const conversationsC: Conversation[] = [
  // ---- pronoun follow-ups ----
  {
    pattern: 'pronoun',
    turns: [
      { say: 'what are spending habits', expect: ['habits.overview.what'] },
      { say: 'is it free', expect: ['habits.pro.free'] },
      { say: 'how do i start one', expect: ['habits.create.how'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'how do i add something by voice', expect: ['voice.record.how'] },
      { say: 'does it need internet', expect: ['voice.offline'] },
      { say: 'is it free', expect: ['voice.pro.rules'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'how do i lock skip with face id', expect: ['settings.app-lock.what'] },
      { say: 'how do i turn it off', expect: ['settings.app-lock.what'] },
      {
        say: 'will it be on my other phone too',
        expect: ['settings.per-phone.which', 'settings.app-lock.what'],
      },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'how do i make a goall', expect: ['goals.create.how'] },
      { say: 'can i change that later', expect: ['goals.edit.how'] },
      { say: 'what happens when i reach it', expect: ['goals.reached'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'what is the monthly wrap up', expect: ['savings.wrapup.what'] },
      { say: 'when does it come', expect: ['savings.wrapup.when'] },
      { say: 'can i change that', expect: ['savings.wrapup.change-time'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'how much is skip pro', expect: ['pro.price.plans'] },
      { say: 'is there a free trial for it', expect: ['pro.trial.what'] },
      { say: 'and how do i cancel it', expect: ['pro.trial.cancel', 'pro.manage.cancel'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'can skip remind me about a bill', expect: ['reminders.item.turn-on'] },
      { say: 'how early can it come', expect: ['reminders.item.lead'] },
      { say: 'can i change the time of it', expect: ['reminders.item.time'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      { say: 'does skip keep my card number', expect: ['privacy.bank'] },
      { say: 'who else can see that', expect: ['privacy.who-sees'] },
      { say: 'can i delete it all', expect: ['privacy.delete-account', 'privacy.reset'] },
    ],
  },
  {
    pattern: 'pronoun',
    turns: [
      {
        say: 'what does saved mean on my coffee habit',
        expect: ['habits.card.saved-week', 'habits.saved.how'],
      },
      { say: 'does it go into my savings', expect: ['habits.saved.real-money'] },
      { say: 'can i pause it when im away', expect: ['habits.saved.away'] },
    ],
  },

  // ---- same question, new subject ----
  {
    pattern: 'new-subject',
    turns: [
      { say: 'how do i delete a habit', expect: ['habits.delete.how'] },
      { say: 'what about a goal', expect: ['goals.delete.how'] },
      { say: 'and savings', expect: ['savings.remove.how'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'can skip remind me about habits', expect: ['habits.receipts.reminder'] },
      { say: 'what about goals', expect: ['goals.not.reminders'] },
      { say: 'and savings', expect: ['savings.wrapup.notification-switch'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'how do i change the language', expect: ['settings.language.change'] },
      { say: 'what about the currency', expect: ['settings.currency.change'] },
      { say: 'and dark mode', expect: ['settings.theme.mode'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'is voice entry free', expect: ['voice.pro.rules'] },
      { say: 'what about habits', expect: ['habits.pro.free'] },
      { say: 'and insights', expect: ['home.insights.pro'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'what happens to voice entries if pro ends', expect: ['voice.pro.ended'] },
      { say: 'same for habits', expect: ['habits.pro.lapsed'] },
      { say: 'and my extra cards', expect: ['cards.free.locked', 'pro.lapse.overview'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'how do i edit a goal', expect: ['goals.edit.how'] },
      { say: 'and a habit', expect: ['habits.edit.how'] },
      { say: 'same for savings', expect: ['savings.edit.how'] },
    ],
  },
  {
    pattern: 'new-subject',
    turns: [
      { say: 'is it safe to give skip my bank login', expect: ['privacy.bank'] },
      { say: 'what about my voice', expect: ['voice.recording-stored', 'voice.on-device'] },
      { say: 'and my receipt photos', expect: ['privacy.phone-only', 'receipts.scan.privacy'] },
    ],
  },

  // ---- already done ----
  {
    pattern: 'already-done',
    turns: [
      {
        say: 'I cancled pro but I need my card details back, how to get that back',
        expect: ['cards.free.locked', 'pro.lapse.come-back'],
      },
      {
        say: 'I know I did that but how to get that back',
        expect: ['pro.lapse.come-back', 'cards.free.locked'],
      },
      { say: 'so my cards are not deleted', expect: ['cards.free.locked'] },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i restore my purchase', expect: ['pro.restore.how'] },
      { say: 'i already did that and it still says free', expect: ['pro.paid.not-active'] },
      { say: 'ok i emailed them, when do they reply', expect: ['settings.contact.reply'] },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'my reminder isnt coming', expect: ['reminders.problem.not-arriving'] },
      {
        say: 'i know, i already allowed notifications in iphone settings',
        expect: ['reminders.problem.not-arriving', 'reminders.permission.allow'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'my wrap up didnt open', expect: ['savings.wrapup.not-showing'] },
      {
        say: 'i know, its the 1st and i already opened skip. where is last months money then',
        expect: ['savings.wrapup.missed', 'savings.by-month.missing'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i add a habit', expect: ['habits.create.how'] },
      {
        say: 'i know i tapped the plus but it just shows a pro page',
        expect: ['habits.pro.free', 'habits.create.missing'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'voice says its not available on this iphone', expect: ['voice.unavailable'] },
      {
        say: 'i know, i already turned dictation on',
        expect: ['voice.unavailable', 'voice.error'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      {
        say: 'i deleted the app, how do i get my stuff back',
        expect: ['troubleshooting.reinstall'],
      },
      {
        say: 'i know, i reinstalled it already but its all empty',
        expect: ['getting-started.signin.empty-account', 'troubleshooting.missing-data'],
      },
      {
        say: 'i used apple last time',
        expect: ['getting-started.signin.empty-account', 'troubleshooting.missing-data'],
      },
    ],
  },
  {
    pattern: 'already-done',
    turns: [
      { say: 'how do i cancel pro', expect: ['pro.manage.cancel'] },
      {
        say: 'i already cancelled it but settings still says active',
        expect: ['pro.cancel.after'],
      },
      { say: 'ok so when does it stop', expect: ['pro.manage.renewal', 'pro.cancel.after'] },
    ],
  },

  // ---- "no, I mean ..." ----
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i delete my goal', expect: ['goals.delete.how'] },
      { say: 'no i mean take the money out of it', expect: ['goals.take-out.how'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how much is the habit thing', expect: ['habits.pro.free'] },
      { say: 'no i mean what price do i put in for it', expect: ['habits.create.price'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      {
        say: 'how do i cancel a habit',
        expect: ['habits.delete.how', 'habits.create.cancel'],
      },
      { say: 'no i mean cancel pro', expect: ['pro.manage.cancel'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i turn off the reminder', expect: ['reminders.item.off-remove'] },
      {
        say: 'not that one, the monthly wrap up one',
        expect: ['savings.wrapup.notification-switch'],
      },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'can i use my own picture', expect: ['settings.profile.own-photo'] },
      { say: 'no i mean as the habit icon', expect: ['habits.create.icons'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'why is my saved zero', expect: ['habits.saved.zero', 'savings.ready.zero'] },
      { say: 'no i mean my savings', expect: ['savings.ready.zero'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i delete my account', expect: ['privacy.delete-account'] },
      { say: 'no i mean just clear everything and start over', expect: ['privacy.reset'] },
    ],
  },
  {
    pattern: 'i-mean',
    turns: [
      { say: 'how do i add money to savings', expect: ['savings.add.how'] },
      { say: 'not that, i mean send it to a goal', expect: ['goals.send.how'] },
      { say: 'it wont let me send more than 500', expect: ['goals.send.limits'] },
    ],
  },

  // ---- "that's not what I asked", then a rephrase ----
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i remove a habit', expect: ['habits.delete.how'] },
      { say: 'thats not what i asked', expect: ['any'] },
      { say: 'i mean one tapped day, not the whole habit', expect: ['habits.day.untap'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'tell me about pro', expect: ['pro.what.overview'] },
      { say: 'thats not what i asked', expect: ['any'] },
      { say: 'i asked how much it costs', expect: ['pro.price.plans'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i change my name', expect: ['settings.profile.name'] },
      { say: 'no thats not what i asked', expect: ['any'] },
      { say: 'i want to change my email', expect: ['getting-started.account.email-change'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how do i delete my data', expect: ['privacy.delete-account', 'privacy.reset'] },
      { say: 'not what i asked', expect: ['any'] },
      { say: 'i want a copy of it first', expect: ['privacy.export'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'how does voice work', expect: ['voice.record.how'] },
      { say: 'thats not what i asked', expect: ['any'] },
      { say: 'i mean does apple hear what i say', expect: ['voice.on-device'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'why is my savings zero', expect: ['savings.ready.zero'] },
      { say: 'thats not what i asked', expect: ['any'] },
      { say: 'i asked why the month so far is negative', expect: ['savings.so-far.negative'] },
    ],
  },
  {
    pattern: 'not-what-i-asked',
    turns: [
      { say: 'why wont it save', expect: ['troubleshooting.wont-save'] },
      { say: 'that is not what i asked', expect: ['any'] },
      { say: 'my goal wont save', expect: ['goals.save.wont-save'] },
    ],
  },

  // ---- adding detail ----
  {
    pattern: 'detail',
    turns: [
      { say: 'i cant add a second card', expect: ['cards.free.limits', 'pro.free.limits'] },
      { say: 'im on the free plan', expect: ['cards.free.limits', 'pro.free.limits'] },
      { say: 'so what does pro add', expect: ['pro.compare.list', 'pro.what.overview'] },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'how do i cancel pro', expect: ['pro.manage.cancel'] },
      { say: 'its the free trial', expect: ['pro.trial.cancel'] },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'voice wont work', expect: ['voice.error', 'voice.unavailable'] },
      { say: 'it says hold the button while you talk', expect: ['voice.nothing-heard'] },
      { say: 'im holding it and nothing shows', expect: ['voice.nothing-heard'] },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'my wrapup notifcation didnt come', expect: ['savings.wrapup.no-notification'] },
      { say: 'i have notifications on', expect: ['savings.wrapup.no-notification'] },
      {
        say: 'its on my new phone',
        expect: ['reminders.devices.all', 'settings.per-phone.which'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'why is my savings 0', expect: ['savings.ready.zero'] },
      {
        say: 'i only joined last week',
        expect: ['savings.ready.zero', 'savings.month.first-month'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      {
        say: 'i cant tap yesterday on my habit',
        expect: ['habits.day.cant-tap', 'habits.day.past'],
      },
      {
        say: 'i only made it this morning',
        expect: ['habits.create.starts', 'habits.day.cant-tap'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'how do i change the language', expect: ['settings.language.change'] },
      { say: 'to spanish', expect: ['settings.language.change'] },
      {
        say: 'but my reminders are still in english',
        expect: ['reminders.notice.language', 'settings.language.what-changes'],
      },
    ],
  },
  {
    pattern: 'detail',
    turns: [
      { say: 'my bill reminder didnt come', expect: ['reminders.problem.not-arriving'] },
      {
        say: 'i set it to 1 week before and the bill is in 3 days',
        expect: ['reminders.problem.not-arriving', 'reminders.item.lead'],
      },
    ],
  },

  // ---- digging deeper ----
  {
    pattern: 'deeper',
    turns: [
      {
        say: 'what is saved on a habit',
        expect: ['habits.card.saved-week', 'habits.saved.how'],
      },
      { say: 'how is it worked out', expect: ['habits.saved.how'] },
      { say: 'why is mine zero', expect: ['habits.saved.zero'] },
      { say: 'how do i fix it', expect: ['habits.saved.zero'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what is ready to use', expect: ['savings.ready.what'] },
      { say: 'how is it worked out', expect: ['savings.ready.what', 'savings.total.all'] },
      { say: 'why did it change', expect: ['savings.ready.change'] },
      { say: 'why is it zero now', expect: ['savings.ready.zero'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what is the month so far card', expect: ['savings.so-far.what'] },
      { say: 'why is it negative', expect: ['savings.so-far.negative'] },
      {
        say: 'does that take money out of my savings',
        expect: ['savings.so-far.negative', 'savings.wrapup.overspent'],
      },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what happens when pro ends', expect: ['pro.lapse.overview'] },
      { say: 'why are my old entries hidden', expect: ['pro.history.hidden'] },
      { say: 'how do i get them back', expect: ['pro.lapse.come-back', 'pro.history.hidden'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what does skip store about me', expect: ['privacy.stored.what'] },
      { say: 'where is it kept', expect: ['privacy.stored.where'] },
      { say: 'can i get a copy', expect: ['privacy.export'] },
      { say: 'how do i delete all of it', expect: ['privacy.delete-account'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what is the month wrap up', expect: ['savings.wrapup.what'] },
      { say: 'how is the left over worked out', expect: ['savings.month.left-over'] },
      { say: 'why does every month say overspent', expect: ['savings.month.no-pay'] },
      { say: 'how do i fix that', expect: ['savings.month.no-pay'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'why is my spent higher than my limit', expect: ['habits.figures.over-limit'] },
      { say: 'what is the limit', expect: ['habits.card.limit'] },
      { say: 'can i change it', expect: ['habits.card.limit', 'habits.edit.price'] },
    ],
  },
  {
    pattern: 'deeper',
    turns: [
      { say: 'what does something went wrong mean', expect: ['troubleshooting.failure.what'] },
      { say: 'it shows on every page', expect: ['troubleshooting.failure.repeats'] },
      {
        say: 'what if that doesnt work',
        expect: ['troubleshooting.failure.repeats', 'settings.contact.how'],
      },
    ],
  },

  // ---- switching topic mid-chat ----
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i add a habit', expect: ['habits.create.how'] },
      { say: 'unrelated but how do i add a bill', expect: ['bills.add.how'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i create a goal', expect: ['goals.create.how'] },
      {
        say: 'ok different thing, how do i lock the app with face id',
        expect: ['settings.app-lock.what'],
      },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      {
        say: 'what does saved mean on my coffee habit',
        expect: ['habits.card.saved-week', 'habits.saved.how'],
      },
      { say: 'how do i pay off a loan', expect: ['loans.payoff.how'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how much is pro', expect: ['pro.price.plans'] },
      { say: 'how do i scan a recipt', expect: ['receipts.scan.how'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'why is my savings zero', expect: ['savings.ready.zero'] },
      { say: 'what is the red number on the skip icon', expect: ['troubleshooting.badge'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i use voice', expect: ['voice.record.how'] },
      { say: 'where do i see my bills', expect: ['bills.find.where'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i change the language', expect: ['settings.language.change'] },
      { say: 'why is my balance negative', expect: ['home.balance.negative'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'how do i delete a goal', expect: ['goals.delete.how'] },
      { say: 'i forgot my password', expect: ['getting-started.password.forgot'] },
      { say: 'back to goals, how do i send money to one', expect: ['goals.send.how'] },
    ],
  },
  {
    pattern: 'switch-topic',
    turns: [
      { say: 'does skip send my data to an ai', expect: ['privacy.ai'] },
      { say: 'how do i add a credit card', expect: ['cards.card.add'] },
    ],
  },

  // ---- a statement, then a question ----
  {
    pattern: 'statement',
    turns: [
      { say: 'i cancelled premium', expect: ['pro.cancel.after', 'pro.lapse.overview'] },
      { say: 'what happens to my stuff', expect: ['pro.lapse.overview'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i got a new phone', expect: ['troubleshooting.new-phone'] },
      { say: 'will my data come back', expect: ['troubleshooting.new-phone'] },
      { say: 'what about pro', expect: ['pro.device.new-phone'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'my trial ends tomorrow', expect: ['pro.trial.end'] },
      { say: 'will i get charged', expect: ['pro.trial.end', 'pro.trial.cancel'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'im selling my iphone', expect: ['privacy.shared-phone'] },
      { say: 'will my stuff be on the new one', expect: ['troubleshooting.new-phone'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i reached my goal', expect: ['goals.reached'] },
      { say: 'can i still add money to it', expect: ['goals.send.limits', 'goals.reached'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i bought what i was saving for', expect: ['goals.spent'] },
      { say: 'what happens to the money', expect: ['goals.delete.choices', 'goals.spent'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i closed the wrap up by mistake', expect: ['savings.wrapup.missed'] },
      { say: 'did i lose the money', expect: ['savings.keep.what', 'savings.wrapup.missed'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i forgot to tap my coffee yesterday', expect: ['habits.day.past'] },
      { say: 'how do i fix it', expect: ['habits.day.past'] },
    ],
  },
  {
    pattern: 'statement',
    turns: [
      { say: 'i think someone got into my account', expect: ['privacy.account.compromised'] },
      { say: 'what should i do', expect: ['privacy.account.compromised'] },
    ],
  },

  // ---- "I did X but Y happened" ----
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i turned on the daily receipts reminder but nothing came tonight',
        expect: ['receipts.reminder.missing', 'reminders.problem.not-arriving'],
      },
      {
        say: 'yes i added one this morning',
        expect: ['receipts.reminder.missing', 'reminders.problem.not-arriving'],
      },
      {
        say: 'what if i only tapped my habit',
        expect: ['habits.receipts.reminder', 'receipts.reminder.missing'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      { say: 'i bought pro but it still says free', expect: ['pro.paid.not-active'] },
      {
        say: 'restore says no past purchase',
        expect: ['pro.restore.how', 'pro.paid.not-active'],
      },
      {
        say: 'i think i signed in with a different email',
        expect: ['pro.account.other', 'pro.paid.not-active'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i tapped the day on my habit but it went back',
        expect: ['habits.day.changed-alone', 'habits.day.cant-tap'],
      },
      {
        say: 'it says something went wrong under the week',
        expect: ['habits.day.cant-tap', 'troubleshooting.failure.what'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i added savings but my balance didnt change',
        expect: ['savings.add.how', 'home.balance.not-changed'],
      },
      {
        say: 'so how do i put it in my account too',
        expect: ['savings.add.how', 'cards.money.add'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i sent money to my goal and my ready to use went down',
        expect: ['savings.ready.change', 'goals.send.how'],
      },
      { say: 'so is the money gone', expect: ['savings.ready.change', 'goals.summary.calc'] },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i changed to spanish but my reminders are english',
        expect: ['reminders.notice.language', 'settings.language.what-changes'],
      },
      { say: 'the bill ones too', expect: ['reminders.notice.language'] },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      { say: 'i said twelve fifty and it asked me something', expect: ['voice.amount.which'] },
      {
        say: 'i just wanted 12 dollars 50',
        expect: ['voice.amount.which', 'voice.say.amounts'],
      },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i deleted my habbit but the receipts are still there',
        expect: ['habits.delete.leftover'],
      },
      { say: 'how do i get rid of them', expect: ['habits.delete.leftover'] },
    ],
  },
  {
    pattern: 'did-but',
    turns: [
      {
        say: 'i signed in on my other phone but my goals arent there',
        expect: ['savings.two-phones', 'troubleshooting.sync'],
      },
      {
        say: 'its the same email on both',
        expect: ['troubleshooting.sync', 'savings.two-phones'],
      },
    ],
  },

  // ---- small talk mixed in ----
  {
    pattern: 'small-talk',
    turns: [
      { say: 'hi', expect: ['chat.greeting'] },
      { say: 'how do i add a habit', expect: ['habits.create.how'] },
      { say: 'thanks', expect: ['chat.thanks'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'are you a bot', expect: ['chat.ai'] },
      { say: 'ok', expect: ['any'] },
      { say: 'how do i delete my account', expect: ['privacy.delete-account'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'why is my savings 0', expect: ['savings.ready.zero'] },
      { say: 'ahh ok', expect: ['any'] },
      { say: 'thank you', expect: ['chat.thanks'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'hey sam', expect: ['chat.greeting'] },
      { say: 'how are you', expect: ['chat.how-are-you'] },
      { say: 'can you tell me how to make a goal', expect: ['goals.create.how'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'whats the wrap up', expect: ['savings.wrapup.what'] },
      { say: 'cool', expect: ['any'] },
      { say: 'bye', expect: ['chat.bye'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'is this working', expect: ['chat.test'] },
      { say: 'can i use voice to add a bill', expect: ['voice.say.bills'] },
      { say: 'you are great', expect: ['chat.compliment'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'who is sam', expect: ['chat.who'] },
      { say: 'what can you help with', expect: ['chat.capabilities'] },
      { say: 'how do i change my name', expect: ['settings.profile.name'] },
    ],
  },
  {
    pattern: 'small-talk',
    turns: [
      { say: 'tell me a joke', expect: ['chat.joke'] },
      { say: 'haha', expect: ['any'] },
      { say: 'ok how do i skip a habit day', expect: ['habits.day.skip'] },
    ],
  },
];
