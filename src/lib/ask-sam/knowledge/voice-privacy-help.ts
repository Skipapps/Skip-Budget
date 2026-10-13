import type { Intent } from '@/lib/ask-sam/types';

export const voicePrivacyHelpIntents: Intent[] = [
  // Voice: recording

  {
    id: 'voice.record.how',
    topic: 'voice',
    title: 'How do I add something by voice?',
    questions: [
      'how do I use voice',
      'How do I add something by voice?',
      'how does voice entry work',
      'how do i use the microphone to add stuff',
      'Can I just say what I spent instead of typing?',
      'steps to record a transaction',
      'how do I talk to skip',
      'I want to say my bill out loud, how',
      'do I tap or hold the mic',
      'Record a transaction how to use',
      'how to log a purchase with my voice',
      'can i dictate a bill',
      'voice input how',
      'what is voice entry',
    ],
    answer:
      'Hold the big mic, say it, then let go. Voice entry adds a receipt, bill or subscription from what you say.\n\n' +
      '1. Tap the round voice button at the right end of the tab bar.\n' +
      '2. On **Record a transaction**, press and hold the mic at the bottom.\n' +
      '3. Say one thing, like “Spent $12.50 at Starbucks today”. Your words appear at the top as you talk.\n' +
      '4. Let go. Skip shows what it heard on a check page.\n' +
      '5. Fix anything that’s off, then tap **Save receipt**, **Save bill** or **Save subscription**.\n\n' +
      'You land back on **Home** with a short note that it was added. Nothing is ever saved without you checking it first.\n\n' +
      'The very first time, that first press only asks your iPhone for permission. Press and hold again to talk.',
    keywords: [
      'voice',
      'mic',
      'microphone',
      'dictate',
      'speak',
      'talk',
      'Record a transaction',
      'Add by voice',
      'hold to talk',
    ],
    related: [
      'voice.say.receipts',
      'voice.say.bills',
      'voice.say.subscriptions',
      'voice.review.page',
    ],
    route: '/voice',
    pro: true,
  },
  {
    id: 'voice.say.receipts',
    topic: 'voice',
    title: 'What can I say to add a receipt?',
    questions: [
      'what should I say to log a coffee by voice',
      'What should I say to add a receipt by voice?',
      'examples of what to say for a purchase',
      'how do I say a coffee I bought',
      'what words does skip understand for receipts',
      'Do I have to say the store name?',
      'can I say the date I bought something',
      'example sentence for groceries by voice',
      'what do I say for gas I bought yesterday',
      'how should i phrase a receipt when talking',
      'receipt voice examples',
      'Can I say "spent 40 at Target"?',
      'what format do I talk in for a purchase',
    ],
    answer:
      'Say how much, where, and when, in any order. Skip picks out each part. For example:\n\n' +
      '- “Spent $12.50 at Starbucks today”\n' +
      '- “$64.20 at Target yesterday”\n' +
      '- “Paid 45 bucks for gas at Shell on Friday”\n' +
      '- “Groceries $82 at Costco”\n' +
      '- “Lunch at Chipotle $14 yesterday”\n' +
      '- “Forty five at Target three days ago”\n\n' +
      'Words like spent, bought, lunch, coffee, groceries or gas, or “at” before a store, tell Skip it’s a receipt. A shop Skip doesn’t know still works if you say “at” before it, like “spent 12.50 at Joe’s Diner”.\n\n' +
      'If you don’t say a day, the receipt is dated today.',
    keywords: ['receipt by voice', 'purchase', 'spent', 'bought', 'example', 'what to say'],
    related: ['voice.say.amounts', 'voice.dates', 'voice.say.tips', 'voice.paid-with'],
    route: '/voice',
    pro: true,
  },
  {
    id: 'voice.say.bills',
    topic: 'voice',
    title: 'What can I say to add a bill?',
    questions: [
      'What do I say to add a bill by voice?',
      'how do i say my rent',
      'example of saying an electric bill',
      'can i say when a bill is due',
      'voice bill examples',
      'how to add my phone bill by talking',
      'what words make it a bill',
      'Can I say my insurance every 3 months?',
      'how do i tell skip my mortgage amount and due date',
      'say a bill due on the 1st',
      'add internet bill with voice',
    ],
    answer:
      'Say what the bill is for, how much, and when it’s due. For example:\n\n' +
      '- “Electric bill $85, due on the 15th”\n' +
      '- “Rent is $1,800, due on the 1st”\n' +
      '- “Xfinity $79.99, due on the 20th every month”\n' +
      '- “Phone bill $60 due on the 22nd”\n' +
      '- “Car insurance $140 every month, due on the 5th”\n' +
      '- “Water bill $45 due in 3 days”\n\n' +
      'Words like rent, mortgage, electric, insurance, phone bill or “due” make it a bill. Skip also fills in the **Category** from those words, or from a company it knows, like Xfinity for **Internet**.\n\n' +
      'A bill needs a due date to save, so say “due on the …” if you can. If you don’t say how often, **Monthly** is picked for you.',
    keywords: ['bill by voice', 'rent', 'mortgage', 'electric', 'due', 'utilities'],
    related: ['voice.cycle', 'voice.dates', 'voice.reminder', 'voice.review.required'],
    route: '/voice',
    pro: true,
  },
  {
    id: 'voice.say.subscriptions',
    topic: 'voice',
    title: 'What can I say to add a subscription?',
    questions: [
      'what do I say for netflix',
      'What do I say to add a subscription by voice?',
      'how do i add netflix by voice',
      'example for spotify every month',
      'can i say a yearly subscription',
      'how to say when it renews',
      'what makes skip think its a subscription',
      'add my gym membership by talking',
      'subscription voice examples',
      'Can I say Amazon Prime per year?',
      'how do I say a weekly subscription',
      'say Hulu 7.99 a month',
    ],
    answer:
      'Say the service, the price and how often. For example:\n\n' +
      '- “Netflix $15.99 every month”\n' +
      '- “Spotify $11.99 a month, renews on the 3rd”\n' +
      '- “Hulu $99.99 a year”\n' +
      '- “Disney+ $13.99 monthly”\n' +
      '- “Costco membership $65 once a year”\n\n' +
      'The words subscription, membership or renews make it a subscription, and so does a streaming or app service Skip knows. A renewal date is optional.\n\n' +
      'If you don’t say “every month” or “a year”, **Monthly** is picked for you, so check **Billing cycle** before you save. If you don’t say a name, like “gym membership $40 a month”, tap **Service** and pick it before you save.',
    keywords: ['subscription by voice', 'netflix', 'spotify', 'membership', 'renews', 'streaming'],
    related: ['voice.cycle', 'voice.names.brand', 'voice.kind.how', 'voice.store.wrong'],
    route: '/voice',
    pro: true,
  },
  {
    id: 'voice.say.tips',
    topic: 'voice',
    title: 'Tips so Skip understands me first time',
    questions: [
      'How do I get skip to understand me better?',
      'best way to talk to the voice feature',
      'tips for voice entry',
      'what is the best way to say amounts by voice',
      'should I say dollars or just the number',
      'how to make voice more accurate',
      'it never gets it right first time, any advice',
      'do I need to talk slowly',
      'can I pause while talking',
      'voice tips',
      'how should I speak to the mic',
    ],
    answer:
      'A few habits help Skip get it right the first time:\n\n' +
      '- Say one thing per hold: an amount, a name and a day.\n' +
      '- Say the store or service clearly, like “at Target” or “Netflix”.\n' +
      '- For cents, “$12.50” or “twelve dollars fifty” is clear. “Twelve fifty” could be $12.50 or $1,250, so Skip will ask.\n' +
      '- For bills and subscriptions, say how often: “every month”, “a year”, “every 3 months”.\n' +
      '- Say when: “today”, “yesterday”, “last Friday”, “due on the 15th”.\n' +
      '- Talk at a normal pace. Pauses are fine as long as you keep holding, and finish within 15 seconds.\n' +
      '- A quiet spot helps.\n\n' +
      'If you trip over a word, just correct yourself: “forty, no, fifty” keeps fifty.',
    keywords: ['tips', 'advice', 'accuracy', 'better', 'how to speak'],
    related: ['voice.say.amounts', 'voice.corrections', 'voice.mishears', 'voice.limit-time'],
    route: '/voice',
    pro: true,
  },
  {
    id: 'voice.say.amounts',
    topic: 'voice',
    title: 'How can I say amounts?',
    questions: [
      'Can I say amounts in words?',
      'does voice understand a grand',
      'how do I say cents by voice',
      'can I say 1.2k',
      'does it understand bucks',
      'how to say a big amount like rent',
      'twelve fifty or twelve dollars fifty',
      'say a price with cents by voice',
      'does it get two hundred and five dollars',
      'what about tax and tip when talking',
      'amounts voice understands',
    ],
    answer:
      'Say amounts the way you normally would. All of these work:\n\n' +
      '- “$12.50”, “12 dollars 50”, “twelve dollars and fifty cents”\n' +
      '- “45 bucks”, “forty five”, “ninety nine cents”, “a buck fifty”\n' +
      '- “two hundred and five dollars”, “eighteen hundred”, “twelve hundred fifty”\n' +
      '- “a grand”, “two grand”, “$1.2k”, “five k”\n\n' +
      'Two things make Skip ask instead of guess: pairs like “twelve fifty”, which could be $12.50 or $1,250, and two separate figures like a price and a tip. Skip never adds figures together, so for a meal with a tip, say the total.\n\n' +
      'A price per gallon or per item is ignored when you also say the total: “$3.45 a gallon, $45.20 total at Shell” saves $45.20.',
    keywords: ['amount', 'dollars', 'cents', 'bucks', 'grand', 'k', 'tip', 'tax', 'numbers'],
    related: ['voice.amount.which', 'voice.amount.wrong', 'voice.say.tips'],
    route: '/voice',
    pro: true,
  },
  {
    id: 'voice.corrections',
    topic: 'voice',
    title: 'Can I correct myself while talking?',
    questions: [
      'what if I say the wrong number while talking',
      'can I say no wait',
      'I said forty then fifty, which does it use',
      'correct myself mid sentence voice',
      'does actually work in voice',
      'scratch that voice',
      'I changed my mind halfway through talking',
      'I mean target not walmart',
      'oops said the wrong store',
      'self correction voice entry',
    ],
    answer:
      'Yes. Correct yourself the way you would with a person, and Skip keeps the last thing you said for that part:\n\n' +
      '- “Forty, no, fifty at Shell” saves $50.\n' +
      '- “Spent 40, make that 45, at Shell” saves $45.\n' +
      '- “Walmart, I mean Target, 30” saves Target.\n' +
      '- “Netflix, actually Hulu, 7.99” saves Hulu.\n' +
      '- “Netflix 15.99 monthly, no, yearly” saves it as yearly.\n\n' +
      'Words that work include “no”, “no wait”, “actually”, “I mean”, “sorry”, “make that”, “scratch that” and “oops”. Only the part you corrected changes. Everything else you said stays.',
    keywords: ['correction', 'no wait', 'actually', 'I mean', 'scratch that', 'make that', 'oops'],
    related: ['voice.say.tips', 'voice.amount.wrong', 'voice.store.wrong'],
    route: '/voice',
    pro: true,
  },
  {
    id: 'voice.limit-time',
    topic: 'voice',
    title: 'How long can I talk for?',
    questions: [
      'Is there a time limit on voice?',
      'it stopped listening after a few seconds',
      'how long can I hold the mic',
      'voice cut me off',
      'can I pause in the middle of a sentence',
      'max recording length',
      'long sentence voice',
      'why did the mic stop on its own',
      'does it stop when I pause',
      '15 seconds voice',
    ],
    answer:
      'Up to 15 seconds per hold. After that the mic closes by itself and Skip uses what it heard so far.\n\n' +
      'Pauses don’t end it. As long as your finger stays down, one hold is one sentence, however long you stop to think. Lifting your finger ends it.\n\n' +
      'One entry fits easily: “Car insurance $140 every month, due on the 5th” is well under the limit.',
    keywords: ['time limit', '15 seconds', 'cut off', 'pause', 'length'],
    related: ['voice.nothing-heard', 'voice.interruptions', 'voice.say.tips'],
    route: '/voice',
    pro: true,
  },
  {
    id: 'voice.interruptions',
    topic: 'voice',
    title: 'What if a call comes in while I talk?',
    questions: [
      'what if I get a call while recording',
      'my music stopped when I used voice',
      'does voice pause my podcast',
      'I locked my phone while talking',
      'voice stopped when I switched apps',
      'siri interrupted voice entry',
      'left the voice page mid sentence',
      'will my music come back after voice',
      'alarm went off while recording',
      'background audio voice',
    ],
    answer:
      'Skip handles interruptions calmly:\n\n' +
      '- A call, Siri or an alarm ends the recording, and Skip keeps whatever you’d already said.\n' +
      '- Leaving the page, going to the Home Screen or locking the phone stops the mic at once and forgets that recording. Nothing is saved.\n' +
      '- Music or podcasts pause while you hold the mic, and usually carry on when you let go.\n\n' +
      'The mic never turns itself back on when you return. Hold it again when you’re ready.',
    keywords: ['call', 'interrupted', 'music', 'podcast', 'lock', 'background', 'siri'],
    related: ['voice.limit-time', 'voice.nothing-heard', 'voice.stale'],
    route: '/voice',
    pro: true,
  },

  // Voice: how Skip reads what you said

  {
    id: 'voice.kind.how',
    topic: 'voice',
    title: 'How does Skip pick receipt, bill or subscription?',
    questions: [
      'how does voice know its a bill',
      'How does Skip decide between receipt, bill and subscription?',
      'why did it think my netflix was a receipt',
      'what does Skip guessed this one mean',
      'how does voice know what type it is',
      'why did it file my gym as a subscription',
      'what are the Add as buttons',
      'my netflix bill came up as a subscription why',
      'how does it tell a bill from a subscription',
      'kind detection voice',
      'why is it a receipt when I said a bill',
      'Skip guessed this one. Pick another if it’s wrong',
    ],
    answer:
      'Skip reads the words you used, then the name, and picks one of three:\n\n' +
      '- **Subscription**: words like subscription, membership or renews, or a streaming or app service such as Netflix or Spotify.\n' +
      '- **Bill**: rent, mortgage, electric, insurance, phone bill, “due”, or a utility, phone, internet or insurance company.\n' +
      '- **Receipt**: spent, bought, coffee, lunch, groceries, gas, or “at” a store.\n\n' +
      'Saying how often (“every month”) points to a subscription, or to a bill for a utility or a bill word. “Spent 15.49 on Netflix” is a receipt, because “spent” wins. “My Netflix bill” stays a subscription.\n\n' +
      'When nothing tells it, Skip picks **Receipt** and shows “Skip guessed this one. Pick another if it’s wrong.” Tap another choice under **Add as** to change it.',
    keywords: ['Add as', 'type', 'kind', 'guessed', 'receipt or bill', 'bill or subscription'],
    related: ['voice.kind.change', 'voice.say.bills', 'voice.say.subscriptions'],
    pro: true,
  },
  {
    id: 'voice.kind.change',
    topic: 'voice',
    title: 'How do I change it to a bill or subscription?',
    questions: [
      'change it from receipt to bill on the voice page',
      'make it a bill instead of a receipt',
      'How do I change a voice entry from receipt to bill?',
      'it picked the wrong type, how do i fix it',
      'can I switch it to a subscription before saving',
      'what happens when I tap Bill under Add as',
      'wrong kind on the voice page',
      'I saved it as a receipt but it should be a subscription',
      'change type after saving voice entry',
      'turn my voice receipt into a bill',
      'the add as chips changed my date',
      'switch receipt to subscription on the check page',
    ],
    answer:
      'Before you save, tap **Receipt**, **Bill** or **Subscription** under **Add as**. Skip reads your words again for the new type, and anything you already changed by hand stays as you set it.\n\n' +
      'The day can move when you switch. For a receipt, “on the 5th” means the last 5th that has passed. For a bill or subscription, it means the next 5th.\n\n' +
      'Once saved, a receipt can’t be turned into a bill or subscription. Delete the one you saved (open it, tap the pencil, then **Delete** at the bottom) and add it again the right way, by voice or with **Quick add** on **Home**.',
    keywords: ['Add as', 'change type', 'switch', 'wrong type', 'convert'],
    related: ['voice.kind.how', 'voice.dates', 'voice.after-save'],
    pro: true,
  },
  {
    id: 'voice.amount.which',
    topic: 'voice',
    title: 'Why does it ask which amount I meant?',
    questions: [
      'it heard fifteen ninety nine as 1599',
      'which amount did you mean',
      'Why does Skip ask which amount I meant?',
      'it gave me two amounts to pick from',
      'what is Which amount did you mean',
      'twelve fifty came up as 12.50 and 1250',
      'why cant it tell 15.99 from 1599',
      'what does Neither, I will type it do',
      'it shows two prices and wont save',
      'I said a price plus tip and it asked me to pick',
      'two numbers came up when I talked',
      'why do I have to choose the amount',
      'Pick the amount you meant',
    ],
    answer:
      'Skip heard something that could mean two amounts, so it asks rather than guess with your money.\n\n' +
      '- “Twelve fifty” can be $12.50 or $1,250.\n' +
      '- “Fifteen ninety nine” can be $15.99 or $1,599.\n' +
      '- Two separate figures, like “$40 plus $5 tip”, are offered as $5 and $40. Skip never adds figures together.\n\n' +
      'Tap the right one under **Which amount did you mean?**. If neither is right, tap **Neither, I’ll type it** and use the keypad. **Save** stays off until you choose, with the hint “Pick the amount you meant.”\n\n' +
      'To avoid the question, say “$12.50”, “twelve dollars fifty”, or the total on its own.',
    keywords: ['Which amount did you mean', 'two amounts', 'Neither', 'ambiguous', 'pick amount'],
    related: ['voice.say.amounts', 'voice.amount.wrong', 'voice.review.required'],
    pro: true,
  },
  {
    id: 'voice.amount.wrong',
    topic: 'voice',
    title: 'The amount Skip heard is wrong',
    questions: [
      'Skip got the amount wrong',
      'it heard 14 instead of 40',
      'how do i fix the amount on the voice page',
      'the price is wrong after I spoke',
      'wrong number from voice',
      'did voice round my amount',
      'it put a huge amount by mistake',
      'how do I change the amount before saving a voice entry',
      'the amount is missing after talking',
      'Tap to add the amount, what do I do',
      'it didnt catch the cents',
    ],
    answer:
      'Fix it on the check page.\n\n1. Tap the big amount at the top. A keypad opens with the question “How much did you spend?” (or “How much is the bill?” or “How much does it cost?”).\n2. Type the right figure.\n3. Tap **Done**.\n\nIf no amount was heard, the top says **Tap to add the amount** instead.\n\nSkip keeps amounts to the cent and never rounds them. The largest it takes is $999,999,999.99. Numbers like “forty” and “fourteen” sound close, so a quick look before **Save** is worth it.',
    keywords: ['amount wrong', 'keypad', 'Tap to add the amount', 'misheard number'],
    related: ['voice.amount.which', 'voice.say.amounts', 'voice.mishears'],
    pro: true,
  },
  {
    id: 'voice.dates',
    topic: 'voice',
    title: 'Which dates can I say?',
    questions: [
      'Can I say a date when I add by voice?',
      'what dates does voice understand',
      'how do i say last friday',
      'Why did "on the 5th" become last month?',
      'it put next month for my bill due date',
      'can I say three days ago',
      'does it understand october 3rd',
      'voice put the wrong date',
      'what if I dont say a date by voice',
      'due on the 31st in a short month by voice',
      'how does voice handle dates',
      'my rent due on the 1st went to next month',
    ],
    answer:
      'Skip understands most everyday ways of saying a day: today, yesterday, tomorrow, “the day before yesterday”, “3 days ago”, “a week ago”, “last Friday”, “next Friday”, “on Monday”, “on the 5th”, “October 3rd” and “10/3”.\n\n' +
      'Which way a day points depends on the type:\n' +
      '- **Receipt**: the most recent one, because you already bought it. “On the 5th” said on the 13th is the 5th of this month.\n' +
      '- **Bill or subscription**: the next one. “Due on the 5th” said on the 13th is the 5th of next month. Past words like “paid”, “was due” or “renewed” point back instead.\n\n' +
      'If you say the 31st and that month is shorter, a bill uses the month’s last day. With no day said, a receipt is today, a bill asks for **Due on**, and a subscription asks for **Next renewal**.\n\n' +
      'To change it, tap the date row and pick a day. On a receipt, the **Today** and **Yesterday** chips under the date set it in one tap.',
    keywords: ['date', 'day', 'yesterday', 'last friday', 'due on', 'renews on', 'when'],
    related: ['voice.kind.change', 'voice.cycle', 'voice.say.bills'],
    pro: true,
  },
  {
    id: 'voice.cycle',
    topic: 'voice',
    title: 'How do I say how often it repeats?',
    questions: [
      'how do i say every year by voice',
      'How do I tell Skip a bill is yearly?',
      'how often voice options',
      'can I say every two weeks',
      'it saved my subscription as monthly but its yearly',
      'why is monthly already picked',
      'what does Recurring mean on the voice page',
      'Billing cycle on the check page',
      'say quarterly bill',
      'biweekly subscription by voice',
      'every 3 months insurance by voice',
      'I didnt say how often',
    ],
    answer:
      'Say it in plain words. Skip understands four rhythms:\n\n' +
      '- **Weekly**: “every week”, “a week”, “weekly”\n' +
      '- **Monthly**: “every month”, “a month”, “per month”, “monthly”\n' +
      '- **Every 3 months** for bills, **Quarterly** for subscriptions: “every 3 months”, “every quarter”, “quarterly”\n' +
      '- **Yearly**: “every year”, “a year”, “once a year”, “annually”\n\n' +
      'If you don’t say one, **Monthly** is selected under **Recurring** (bills) or **Billing cycle** (subscriptions). Tap another chip before you save, because monthly or yearly changes your numbers a lot.\n\n' +
      'Skip can’t store “every two weeks”, “twice a month” or “every 6 months”. It notices them so the number isn’t taken as money, but you’ll need to pick the closest chip.',
    keywords: [
      'Recurring',
      'Billing cycle',
      'monthly',
      'yearly',
      'weekly',
      'quarterly',
      'how often',
    ],
    related: ['voice.say.bills', 'voice.say.subscriptions', 'voice.dates'],
    pro: true,
  },
  {
    id: 'voice.store.wrong',
    topic: 'voice',
    title: 'Skip heard the wrong store or service',
    questions: [
      'voice got the store wrong',
      'Skip got the store name wrong',
      'it wrote star bucks instead of starbucks',
      'wrong service name from voice',
      'how do i change the store on the voice check page',
      'it didnt recognise my local shop',
      'Store is empty after I spoke',
      'the bill company is wrong after talking',
      'it heard spot a fly instead of spotify',
      'Pick a store first, what does that mean on voice',
      'how to fix the name skip heard',
      'my small local store isnt found by voice',
    ],
    answer:
      'You can change it yourself.\n\n1. Tap the **Store** row (**Service** for a subscription, **Name** for a bill).\n2. A search opens with “Where did you buy it?”, “Which service is it?” or “Who is the bill from?”. If Skip didn’t recognise the name, the search already holds what it heard, so you only need to fix it.\n3. Pick the right one, or add your own name, then tap **Done**.\n\nA receipt needs a store and a subscription needs a service before they save. You’ll see “Pick a store first.” or “Pick a service first.” until then.\n\nWhen Skip had to guess the name, it remembers your fix for next time.',
    keywords: ['store', 'service', 'name', 'merchant', 'wrong store', 'search'],
    related: ['voice.learning', 'voice.names.brand', 'voice.mishears'],
    pro: true,
  },
  {
    id: 'voice.names.brand',
    topic: 'voice',
    title: 'Why did it save under a different name?',
    questions: [
      'I said comcast but it says xfinity',
      'Amazon Prime saved as Amazon',
      'icloud became apple',
      'voice changed the company name',
      'why does my subscription show a different name than I said',
      'voice renamed my bill to the brand',
      'it used the parent company name',
      'voice picked a different brand name',
      'Comcast vs Xfinity',
      'the name I said is not the name saved',
    ],
    answer:
      'Skip matched what you said to the name the company uses in Skip’s list of stores and services. For example:\n\n' +
      '- “Comcast” saves as **Xfinity**.\n' +
      '- “Amazon Prime” saves as **Amazon**.\n' +
      '- “iCloud” saves as **Apple**.\n\n' +
      'That keeps the right logo and keeps your entries together. If you’d rather use your own words, tap the **Store**, **Service** or **Name** row before saving and change it. For a bill, you can type any **Name** and keep the company separately.',
    keywords: ['Xfinity', 'Comcast', 'Amazon Prime', 'iCloud', 'Apple', 'brand name'],
    related: ['voice.store.wrong', 'voice.learning'],
    pro: true,
  },
  {
    id: 'voice.learning',
    topic: 'voice',
    title: 'Does Skip learn from my corrections?',
    questions: [
      'Does voice learn the names I fix?',
      'will it remember spotify next time',
      'how does skip learn my words',
      'where are my voice corrections kept',
      'can I make skip forget a correction',
      'it keeps using a wrong name I fixed once',
      'do my voice corrections sync to my other phone',
      'voice remembers wrong name, how to undo',
      'does skip upload my corrections',
      'how many corrections can it remember',
      'learned names voice',
    ],
    answer:
      'Yes, for names Skip had to guess. If it heard “spot a fly” and you change it to Spotify and save, Skip remembers that those words mean Spotify.\n\n' +
      '- It learns only when you change a guessed name. If you said a name Skip knows exactly, like “Target”, and changed it, that’s a change of mind, so nothing is learned.\n' +
      '- Fixes stay on this phone only. They’re never uploaded and don’t move to another phone.\n' +
      '- It keeps up to 200. The oldest go first.\n' +
      '- To undo one, next time change the name back to the words you actually said. That removes it.\n' +
      '- Signing out or deleting your account clears them.',
    keywords: ['learn', 'remember', 'corrections', 'alias', 'forget', 'undo correction'],
    related: ['voice.store.wrong', 'voice.recording-stored', 'privacy.phone-only'],
    pro: true,
  },

  // Voice: the check page

  {
    id: 'voice.bill-category',
    topic: 'voice',
    title: 'Why does a voice bill ask what it is for?',
    questions: [
      'what is the Category on a voice bill',
      'voice didnt pick a category for my Verizon bill',
      'what is the What is this bill for page',
      'how does voice choose the bill category',
      'wrong category on my voice bill',
      'why is my voice bill called Electricity & Gas',
      'my bill name became the category name',
      'change category after speaking a bill',
      'voice bill category list',
      'student loan by voice went under Other',
    ],
    answer:
      'Every bill needs a **Category**, and Skip fills it in from your words or the company:\n\n' +
      '- Words win: rent or mortgage is **Housing**, electric is **Electricity & Gas**, car insurance is **Insurance**, tuition is **Education**.\n' +
      '- A company with one clear kind fills it in: Xfinity is **Internet**, GEICO is **Insurance**. Companies that sell several things, like Verizon or AT&T, leave it to you.\n\n' +
      'When none is set, you’ll see “Pick what the bill is for.” Tap **Category** and, on **What is this bill for?**, pick one of the 10: Housing, Electricity & Gas, Water & Waste, Internet, Mobile Phone, Insurance, Transportation, Health & Medical, Education or Other.\n\n' +
      'A bill with no company is named after its category, so “Electric bill $85” saves as **Electricity & Gas**. Tap **Name** to call it something else. An **Other** bill, like “student loan 250 every month”, needs a **Name** you type.',
    keywords: ['Category', 'What is this bill for?', 'bill type', 'Housing', 'Other'],
    related: ['voice.say.bills', 'voice.review.required', 'voice.names.brand'],
    pro: true,
  },
  {
    id: 'voice.note',
    topic: 'voice',
    title: 'Can I add a note when adding by voice?',
    questions: [
      'can I add a note to a voice entry',
      'does what I say go in the note',
      'add a note to a voice receipt',
      'where is the note on the voice page',
      'can I dictate a note into skip',
      'note field is empty after voice',
      'Add a note row on the check page',
      'how to write a note when adding by voice',
      'note for a bill I said out loud',
      'voice ignored the extra things I said',
    ],
    answer:
      'Yes, but you type it. Nothing you say becomes a note, because Skip only picks out the amount, the name, the date and how often. Any other words are left out.\n\n' +
      'On the check page, tap the **Note** row, which says **Add a note**, type it and tap **Done**. A note can be up to 200 characters, and it stays if you switch between **Receipt**, **Bill** and **Subscription**.',
    keywords: ['note', 'Add a note', 'comment', 'memo'],
    related: ['voice.review.page', 'voice.after-save'],
    pro: true,
  },
  {
    id: 'voice.siri',
    topic: 'voice',
    title: 'Can I add things with Siri?',
    questions: [
      'can I use siri with skip',
      'hey siri add a receipt to skip',
      'siri shortcuts skip',
      'add to skip by voice from the lock screen',
      'can I add by voice without opening the app',
      'apple watch voice skip',
      'is there a widget for voice entry',
      'carplay skip',
      'dictate to skip through siri',
      'shortcut straight to the voice page',
    ],
    answer:
      'No. Skip doesn’t work with Siri or Shortcuts, and it has no widget or Apple Watch app. Voice entry lives inside Skip: open the app and tap the round voice button at the right end of the tab bar, on any tab.\n\n' +
      'If you’d like Siri or a shortcut, send it as an idea in **Settings → Support and feedback → Share an idea**.',
    keywords: ['Siri', 'Shortcuts', 'widget', 'Apple Watch', 'CarPlay', 'lock screen'],
    related: ['voice.record.how', 'voice.cant-add'],
    pro: true,
  },

  {
    id: 'voice.review.page',
    topic: 'voice',
    title: 'What is the page after I talk?',
    questions: [
      'What is the Is this right page?',
      'what does Did Skip hear you right mean',
      'what is the You said box',
      'what am I looking at after I let go of the mic',
      'the check page after voice, what are the rows',
      'why does it say Did Skip hear you right instead of Is this right',
      'what does You can edit this later mean',
      'voice review screen explained',
      'what is the page titled Add a receipt after recording',
      'what does Tap to add mean on a voice row',
    ],
    answer:
      'It’s the check page. Nothing is saved until you tap **Save**.\n\n' +
      '- At the top: **Is this right?**, or **Did Skip hear you right?** when it’s less sure, for example when no amount was heard.\n' +
      '- **You said** shows your words in quotes.\n' +
      '- **Add as** switches between **Receipt**, **Bill** and **Subscription**.\n' +
      '- The big figure is the amount. Tap it to change it.\n' +
      '- Rows below hold the rest: the store, service or bill name, the date, how often, **Paid with** (**Charged to** for a subscription) and a **Note**. A bill or subscription also asks for a **Reminder**. A row saying **Tap to add** is still needed. Tap any row to change it.\n' +
      '- At the bottom: **Save**, **Say it again** and **More options**.\n\n' +
      '“You can edit this later.” means you can always open the saved entry and change it.',
    keywords: ['Is this right?', 'Did Skip hear you right?', 'You said', 'check page', 'review'],
    related: [
      'voice.review.required',
      'voice.review.more-options',
      'voice.review.start-over',
      'voice.after-save',
    ],
    pro: true,
  },
  {
    id: 'voice.review.required',
    topic: 'voice',
    title: 'Why can’t I save my voice entry?',
    questions: [
      "Why can't I save what I said?",
      'save button greyed out on the voice page',
      'voice entry wont save',
      'what does Pick what the bill is for mean',
      'it says Pick the first due date',
      'Give the bill a name, where do I do that',
      'what is still missing on the voice check page',
      'save receipt button not working after voice',
      'why is save bill disabled',
      'what do I need to fill in before saving a voice bill',
      'Enter how much you spent shows under the button',
    ],
    answer:
      'Something Skip needs is still empty.\n\n' +
      '- **Bill or subscription**: tap **Save** and the line above it lists what’s left, like “To save this bill, fill in: Paid with, Reminder.” It can name the amount, the name, **Category**, **Paid with** (**Charged to**), **Reminder** and **Due on** (or **Next renewal** for a subscription).\n' +
      '- **Receipt**: the line above **Save** says what: “Pick the amount you meant.”, “Pick a store first.” or “Enter how much you spent.”\n\n' +
      'Rows still needed say **Tap to add**. If the line says “Something went wrong. Please try again.” instead, the save itself failed. Check your connection and tap **Save** again.',
    keywords: ['save greyed out', 'disabled', 'missing', 'Category', 'Due on', 'required'],
    related: ['voice.amount.which', 'voice.store.wrong', 'voice.error'],
    pro: true,
  },
  {
    id: 'voice.review.more-options',
    topic: 'voice',
    title: 'What does More options do?',
    questions: [
      'What is More options on the voice page?',
      'how do I get the full form from voice',
      'more options button voice',
      'I want to set more details than voice shows',
      'how do i open the normal add form with what I said',
      'where is the reminder field when adding by voice',
      'what happens if I tap more options',
      'more options vs save',
      'more fields when adding by voice',
      'open the full form from the voice page',
    ],
    answer:
      '**More options** opens the full add form for that type, with everything Skip heard already filled in. Use it when you want a field the check page doesn’t show.\n\n' +
      'The form then asks what it always does. For a bill or subscription, that includes **Paid with** and **Reminder**, where **No reminder** is a fine answer. Saving from there also takes you to **Home**.\n\n' +
      'Your words and any changes go with you, so you don’t have to say anything again.',
    keywords: ['More options', 'full form', 'reminder', 'all fields'],
    related: ['voice.reminder', 'voice.review.page', 'voice.paid-with'],
    pro: true,
  },
  {
    id: 'voice.review.start-over',
    topic: 'voice',
    title: 'How do I cancel or redo a voice entry?',
    questions: [
      'cancel a voice entry',
      'How do I start again on the voice page?',
      'what does Say it again do',
      'cancel adding by voice',
      'I want to throw away what I said',
      'what does Cancel adding this receipt mean',
      'the back swipe stopped working on the voice check page',
      'how to redo a recording',
      'exit voice entry without saving',
      'tapped the X on the voice page, will it save',
      'go back to the mic',
    ],
    answer:
      'There are three ways out, and none of them saves anything:\n\n' +
      '- **Say it again** takes you back to the mic to try again.\n' +
      '- The back arrow also goes back to the mic.\n' +
      '- The **X** at the top closes it all and takes you to **Home**.\n\n' +
      'The **X** always asks first, for example “Cancel adding this receipt?” with “Nothing you have entered here will be saved.” Back and **Say it again** ask only once you’ve changed something. Tap **Yes** to throw it away, or **Go back** to keep working.\n\n' +
      'Once you’ve changed something, the swipe-back gesture is switched off on that page, so a stray swipe can’t lose your work.',
    keywords: ['Say it again', 'cancel', 'start over', 'redo', 'discard', 'X'],
    related: ['voice.review.page', 'voice.stale', 'voice.record.how'],
    pro: true,
  },
  {
    id: 'voice.after-save',
    topic: 'voice',
    title: 'What happens after I save a voice entry?',
    questions: [
      'where did my voice receipt go',
      'Where does my voice entry go after saving?',
      'I saved by voice, where is it',
      'is a voice receipt the same as a typed one',
      'which receipt book does a voice receipt go in',
      'can I edit something I added by voice',
      'after saving by voice it went to home, is that right',
      'does the voice entry show in activity',
      'voice saved bill where to find',
      'did my voice entry save',
      'how do I change a voice entry later',
    ],
    answer:
      'It’s saved just like one you typed. You land on **Home**, and a short note at the bottom says **Receipt added**, **Bill added** or **Subscription added**.\n\n' +
      '- A receipt goes into your default receipt book, or **General** if you haven’t picked one. It shows in **Receipts**, **Activity** and on **Home**.\n' +
      '- A bill shows in **Monthly bills**, and a subscription in **Subscriptions**.\n\n' +
      'To change it later, tap it to open its page, then tap the pencil at the top. Your spoken words aren’t kept with it, only the details you saved.',
    keywords: ['after save', 'where is it', 'Receipt added', 'edit later', 'receipt book'],
    related: ['voice.reminder', 'voice.kind.change', 'voice.recording-stored'],
    pro: true,
  },
  {
    id: 'voice.reminder',
    topic: 'voice',
    title: 'Does a bill added by voice get a reminder?',
    questions: [
      'Will I get a reminder for a bill I added by voice?',
      'voice subscription has no reminder',
      'how do I add a reminder to a voice bill',
      'I added rent by voice and got no reminder',
      'does voice set reminders',
      'reminder missing on a bill I spoke',
      'can voice remind me before netflix renews',
      'set reminder after adding by voice',
      'why didnt my voice bill remind me',
      'voice entry reminder setting',
      'can i add a reminder from the voice check page',
    ],
    answer:
      'Yes. For a bill or subscription, the voice check page asks for a **Reminder**, just like the typed forms. Pick when you want it, or **No reminder**: one of them is needed before **Save**.\n\n' +
      'To change it later:\n' +
      '1. Open the bill or subscription.\n' +
      '2. Tap the pencil at the top.\n' +
      '3. Set **Reminder** and save.',
    keywords: ['reminder', 'notification', 'remind', 'voice bill'],
    related: ['voice.review.more-options', 'voice.after-save', 'voice.say.bills'],
    pro: true,
  },
  {
    id: 'voice.paid-with',
    topic: 'voice',
    title: 'How do I say which card I paid with?',
    questions: [
      'Can I say which card I used?',
      'I said on my Amex but Paid with is empty',
      'how to set paid with on a voice receipt',
      'voice didnt pick my card',
      'what is Charged to on the voice page',
      'why is there no Paid with row on the voice page',
      'paid with apple pay by voice',
      'does saying visa set the card',
      'choose card for voice entry',
      'paid from my bank account by voice',
    ],
    answer:
      'Saying the card doesn’t choose it. Skip hears “on my Amex” or “with Apple Pay” and knows it isn’t the store, but you pick the card yourself on the check page:\n\n' +
      '- **Bill or subscription**: tap one of the cards or accounts under **Paid with** (**Charged to** for a subscription), or **Skip** for none. One is needed before **Save**.\n' +
      '- **Receipt**: tap **Paid with**, choose the card or bank account and tap **Done**. If you leave it empty, the receipt saves with no card or account, so it doesn’t move any card or account balance.',
    keywords: ['Paid with', 'Charged to', 'card', 'Amex', 'Visa', 'Apple Pay', 'account'],
    related: ['voice.review.page', 'voice.review.more-options'],
    pro: true,
  },

  // Voice: messages and problems

  {
    id: 'voice.multiple',
    topic: 'voice',
    title: 'Why does it say “Looks like more than one”?',
    questions: [
      'netflix and spotify together by voice',
      'What does Looks like more than one mean?',
      'can I add two things at once by voice',
      'I said netflix and spotify and it wouldnt add',
      'add them one at a time message',
      'voice wont take two receipts together',
      'can I list all my bills in one go',
      'I said rent and electric together',
      'multiple items voice',
      'why cant I say two purchases',
      'two entries in one sentence',
    ],
    answer:
      'Skip heard two separate things in one go, like “Netflix 15.99 and Spotify 11.99” or “$12 at Starbucks and $40 at Target”. One check page holds one entry, so nothing is kept and the page says “Looks like more than one. Add them one at a time.”\n\n' +
      'Hold the mic and say just the first one, save it, then tap the voice button again for the next.\n\n' +
      'A correction like “forty, no, fifty”, or naming the card you paid with, is still one entry.',
    keywords: ['Looks like more than one', 'one at a time', 'two', 'multiple', 'several'],
    related: ['voice.say.tips', 'voice.corrections'],
    pro: true,
  },
  {
    id: 'voice.nothing-heard',
    topic: 'voice',
    title: 'Why does it say “Hold the button while you talk”?',
    questions: [
      'What does Hold the button while you talk mean?',
      'skip didnt hear anything',
      'I tapped the mic and nothing happened',
      'the mic stops as soon as I let go',
      'nothing shows when I talk',
      'it just says Listening and nothing comes up',
      'voice not picking up my words',
      'do I have to keep my finger on the mic',
      'it stopped listening straight away',
      'my words dont appear on the voice page',
    ],
    answer:
      'It means Skip didn’t get any words. Usually the mic was tapped instead of held, or you let go before talking.\n\n' +
      '1. Press and keep your finger on the mic.\n' +
      '2. Wait a moment for **Listening…**, then talk.\n' +
      '3. Let go only when you’ve finished.\n\n' +
      'Your finger can drift off the button while you talk. Only lifting it ends the recording. If **Listening…** stays and no words appear, move somewhere quieter, hold the phone closer, and make sure nothing else is using the microphone, like a call.',
    keywords: ['Hold to talk', 'Listening', 'nothing heard', 'no words', 'tap vs hold'],
    related: ['voice.mishears', 'voice.permissions.first', 'voice.limit-time'],
    pro: true,
  },
  {
    id: 'voice.mishears',
    topic: 'voice',
    title: 'Voice keeps mishearing me',
    questions: [
      'voice keeps getting my words wrong',
      'skip doesnt understand my accent',
      'speech recognition is bad',
      'why does it hear the wrong words',
      'it writes nonsense when I talk',
      'voice is inaccurate',
      'it misheard me again',
      'how do I improve what the mic hears',
      'does voice work with background noise',
      'it never catches my store names',
    ],
    answer:
      'Skip turns your speech into words with Apple’s speech recognition, listening for US English, then reads those words on your phone. A few things help:\n\n' +
      '- Talk in a quiet place, close to the phone.\n' +
      '- Say names clearly, and put “at” before a shop Skip may not know: “at Joe’s Diner”.\n' +
      '- Say money as “$12.50” or “twelve dollars fifty”.\n' +
      '- Fix mistakes on the check page. When Skip had to guess a name, it remembers your fix.\n' +
      '- Bluetooth headsets, like AirPods, work too.\n\n' +
      'Skip helps Apple’s recognition by passing it a list of store and service names, starting with the ones you already use, so your regular places get easier over time. You can always add by hand with **Quick add** on **Home**.',
    keywords: ['mishear', 'accent', 'wrong words', 'accuracy', 'noise'],
    related: ['voice.say.tips', 'voice.learning', 'voice.languages'],
    pro: true,
  },
  {
    id: 'voice.permissions.first',
    topic: 'voice',
    title: 'Why does voice ask for permission?',
    questions: [
      'Why does Skip want my microphone?',
      'what is the speech recognition permission for',
      'the first press only showed a popup',
      'You are all set hold to talk, what now',
      'does skip need microphone access',
      'two permission popups when I tapped the mic',
      'Should I allow speech recognition for Skip Budget?',
      'why did nothing record the first time',
      'is it safe to allow the microphone',
      'mic permission skip',
    ],
    answer:
      'Voice needs two things from your iPhone: the **Microphone**, to hear you, and **Speech Recognition**, to turn what you say into words.\n\n' +
      'The first time you press the mic, iPhone asks for both, and that press only asks. It never records behind the popups. Once you allow both, the page says “You’re all set. Hold to talk.” Press and hold again to start.\n\n' +
      'Skip only uses the microphone while you’re holding the button on **Record a transaction**. It never opens it on its own, not when the page opens and not when you come back to it.',
    keywords: ['permission', 'microphone', 'Speech Recognition', 'allow', 'popup', 'all set'],
    related: ['voice.permissions.denied', 'voice.on-device', 'voice.recording-stored'],
    pro: true,
  },
  {
    id: 'voice.permissions.denied',
    topic: 'voice',
    title: 'Microphone or speech recognition is off',
    questions: [
      'It says turn on Microphone and Speech Recognition',
      'I said no to the microphone, how do I fix it',
      'voice says Open Settings',
      'how do I allow microphone for skip budget',
      'denied speech recognition by mistake',
      'where to turn on mic for skip',
      'microphone permission off',
      'voice blocked in settings',
      'Microphone or speech recognition is off',
      'I turned off the mic for skip, how to undo',
    ],
    answer:
      'Once you’ve said no, only your iPhone’s Settings can turn it back on:\n\n' +
      '1. On the voice page, tap **Open Settings**. It goes straight to Skip Budget’s settings.\n' +
      '2. Switch on **Microphone** and **Speech Recognition**.\n' +
      '3. Come back to Skip. The page checks again by itself, so you can hold the mic and talk.\n\n' +
      'You can also open the iPhone’s **Settings** app and scroll down to **Skip Budget**. Typing entries works the whole time.',
    keywords: ['Open Settings', 'permission denied', 'microphone off', 'speech recognition off'],
    related: ['voice.permissions.first', 'voice.unavailable'],
    pro: true,
  },
  {
    id: 'voice.unavailable',
    topic: 'voice',
    title: 'Voice isn’t available on this iPhone',
    questions: [
      "Why does it say Voice isn't available on this iPhone right now?",
      'voice not available',
      'the voice page says add it by hand',
      'voice doesnt work on my phone',
      'is dictation needed for skip voice',
      'voice unavailable with no internet',
      'my iphone says voice isnt available',
      'why are there Receipt Bill Subscription buttons on the voice page',
      'voice stopped working completely',
      'cant use voice on my older iphone',
    ],
    answer:
      'Apple’s speech recognition isn’t ready on your iPhone at the moment. The usual reasons:\n\n' +
      '- **Dictation is off.** Turn it on in the iPhone’s **Settings → General → Keyboard → Enable Dictation**.\n' +
      '- **No internet**, on a phone that can’t recognise speech on the device itself. Connect and try again.\n\n' +
      'Meanwhile the page offers **Add it by hand**, with **Receipt**, **Bill** and **Subscription** buttons that open the normal forms. Going back or saving from one of them takes you back to where you were, not to the mic.',
    keywords: ['not available', 'unavailable', 'Add it by hand', 'dictation', 'Siri'],
    related: ['voice.offline', 'voice.permissions.denied', 'voice.error'],
    pro: true,
  },
  {
    id: 'voice.error',
    topic: 'voice',
    title: 'Voice says something went wrong',
    questions: [
      'voice page says Something went wrong',
      'error on the record a transaction page',
      'voice failed',
      'the voice check page wont save, something went wrong',
      'error after letting go of the mic',
      'voice crashed',
      'it said something went wrong when saving my voice receipt',
      'voice error message',
      'something went wrong after I spoke',
      'voice keeps failing',
    ],
    answer:
      'Two different moments can show “Something went wrong. Please try again.”:\n\n' +
      '- **On the mic page**, the recording itself didn’t work. Hold the mic and say it again. If it keeps happening, close Skip fully and open it again.\n' +
      '- **On the check page, above Save**, the save didn’t reach your account, most often because of the connection. Everything you set is still there. Check you’re online and tap **Save** again.\n\n' +
      'One tap on **Save** makes one entry, so trying again won’t add it twice. If it never works, tell us in **Settings → Support and feedback → Email support**.',
    keywords: ['error', 'failed', 'Something went wrong', 'voice error'],
    related: ['voice.offline', 'voice.unavailable', 'troubleshooting.failure.what'],
    pro: true,
  },
  {
    id: 'voice.stale',
    topic: 'voice',
    title: 'What does “Nothing to check yet” mean?',
    questions: [
      'What does Nothing to check yet mean?',
      'voice page says say what you want to add and skip will show it here',
      'Start again button on voice',
      'my voice entry disappeared before saving',
      'the voice check page went empty',
      'voice review lost my words',
      'empty voice page',
      'it opened a page with nothing to check',
      'voice draft gone',
      'what is start again',
    ],
    answer:
      'The check page opened with nothing behind it. That happens when the entry was already saved or cancelled, when you came back to an old voice page, or when Skip redrew its pages, for example after you changed the text size.\n\n' +
      'Tap **Start again** to go back to the mic and say it again. Nothing from the lost attempt was saved unless you’d already tapped **Save**.',
    keywords: ['Nothing to check yet', 'Start again', 'empty', 'lost'],
    related: ['voice.review.start-over', 'troubleshooting.text-size.reset'],
    pro: true,
  },
  {
    id: 'voice.offline',
    topic: 'voice',
    title: 'Does voice work without internet?',
    questions: [
      'voice without wifi',
      'can I use voice offline',
      'voice on airplane mode',
      'no signal voice entry',
      'does voice need wifi',
      'voice wont save with no internet',
      'record a transaction offline',
      'does on device voice work offline',
      'voice without a data connection',
      'voice needs internet?',
      'save a voice entry later when online',
    ],
    answer:
      'Partly. Many iPhones can turn speech into words on the device, so the mic can work without internet. Phones that can’t show “Voice isn’t available on this iPhone right now.” until you’re back online.\n\n' +
      'Saving always needs a connection, because entries are stored in your account. Without one, **Save** shows “Something went wrong. Please try again.” and keeps everything you set, so you can tap **Save** again once you’re online. Nothing is kept to send later.\n\n' +
      'Offline, Skip may also miss store names it usually knows.',
    keywords: ['offline', 'no internet', 'airplane mode', 'wifi', 'signal'],
    related: ['voice.on-device', 'voice.unavailable', 'voice.error'],
    pro: true,
  },

  // Voice: privacy, languages, plans, accessibility

  {
    id: 'voice.on-device',
    topic: 'voice',
    title: 'Is my voice processed on my phone or by Apple?',
    questions: [
      'does my voice go to apple',
      'Does my voice leave my phone?',
      'is voice recognition done on device',
      'does apple hear what I say in skip',
      'where does my speech go',
      'is voice entry private',
      'does skip send my voice to a server',
      'on device speech recognition skip',
      'Apple servers voice privacy',
      'who listens to my voice entries',
      'does skip use a third party for speech',
      'is my voice sent over the internet',
    ],
    answer:
      'Your words are turned into text by Apple’s speech recognition, built into iPhone. Skip uses no other speech service and has no speech server of its own.\n\n' +
      '- When your iPhone can recognise speech on the device, your voice stays on the phone.\n' +
      '- When it can’t, the audio goes to Apple’s speech service to be turned into text, under Apple’s own privacy terms.\n' +
      '- Skip then reads that text on your phone with simple rules, not AI, to find the amount, name and date.\n\n' +
      'Only the details you check and save go to your account. Skip never keeps the audio.',
    keywords: ['on-device', 'Apple', 'speech recognition', 'privacy', 'server', 'audio'],
    related: ['voice.recording-stored', 'voice.permissions.first', 'privacy.ai', 'voice.offline'],
    pro: true,
  },
  {
    id: 'voice.recording-stored',
    topic: 'voice',
    title: 'Is my voice recorded or kept?',
    questions: [
      'is my voice recorded',
      'does voice entry keep a recording of me',
      'Does Skip record my voice?',
      'are my voice recordings saved',
      'does skip keep what I said',
      'is the audio stored anywhere',
      'can anyone listen to my voice entries later',
      'does skip save the transcript',
      'is my voice stored on your servers',
      'are my spoken words saved with the receipt',
      'delete my voice recordings',
      'voice data stored?',
    ],
    answer:
      'No. Skip never records or keeps the audio, on your phone or on our servers, so there are no recordings to delete.\n\n' +
      'While you’re on the check page, the words you said live only in the app’s memory, so you can see them under **You said**. They’re cleared when you save, cancel or sign out. The saved receipt, bill or subscription holds only its details, like the amount, name and date, exactly as if you’d typed it.\n\n' +
      'The only thing voice keeps is the list of name fixes you made, such as “spot a fly” meaning Spotify. That stays on this phone and is cleared when you sign out.',
    keywords: ['recording', 'audio', 'stored', 'transcript', 'kept', 'saved voice'],
    related: ['voice.on-device', 'voice.learning', 'privacy.stored.what'],
    pro: true,
  },
  {
    id: 'voice.languages',
    topic: 'voice',
    title: 'Which languages does voice understand?',
    questions: [
      'Can I talk to skip in Spanish?',
      'does voice work in french',
      'what language does voice understand',
      'voice in other languages',
      'I have the app in Spanish but voice wants English',
      'does voice understand a british accent',
      'can I say pounds instead of dollars',
      'English only voice?',
      'why are the voice examples in English',
      'puedo hablar en español con skip',
      'does voice work if my phone is set to another language',
    ],
    answer:
      'Voice understands spoken English only, even when Skip is set to **Español** or **Français**. In those languages the voice page says so above the examples, and the examples stay in English.\n\n' +
      'Any accent is fine. Skip listens for US English, so American words and spellings work best. Amounts save in the currency Skip shows, so “20 pounds” and “$20” both save as 20.\n\n' +
      'Everything else in Skip works in English, Spanish and French.',
    keywords: ['language', 'Spanish', 'French', 'English only', 'accent', 'español', 'français'],
    related: ['voice.mishears', 'voice.say.amounts'],
    pro: true,
  },
  {
    id: 'voice.pro.rules',
    topic: 'voice',
    title: 'Is voice entry free or Pro?',
    questions: [
      'Is voice entry part of Skip Pro?',
      'why do I need pro for voice',
      'can free users use the microphone',
      'voice on the free plan',
      'how many voice entries do I get',
      'does voice count toward my 15 scans',
      'is there a limit on voice entries with pro',
      'voice is locked',
      'what is the Just say it page',
      'how do I unlock voice entry',
    ],
    answer:
      'Voice entry is part of Skip Pro.\n\n' +
      '- On the free plan, the round voice button has a **PRO** badge. Tapping it opens **Just say it**, a page about what voice can do, with **Get Skip Pro** and **Not now**.\n' +
      '- With Pro there’s no limit. Add as many receipts, bills and subscriptions by voice as you like.\n' +
      '- Voice receipts don’t use the monthly scan or upload allowance. That counts only receipts read by the camera or from a photo or file.\n\n' +
      'Adding things by typing is free on every plan.',
    keywords: ['Pro', 'free', 'locked', 'PRO badge', 'Just say it', 'limit', 'unlock'],
    related: ['voice.pro.ended', 'voice.record.how'],
    route: '/pro',
    pro: true,
  },
  {
    id: 'voice.pro.ended',
    topic: 'voice',
    title: 'What happens to voice entries if Pro ends?',
    questions: [
      'cancelled pro, what about my voice entries',
      'If I cancel Pro, do my voice entries stay?',
      'voice receipts after my trial ends',
      'pro expired, what about things I added by voice',
      'can I still edit voice bills without pro',
      'voice button got a pro badge again',
      'my voice page sends me to pro now',
      'lost voice after pro ended',
      'does cancelling pro delete voice receipts',
      'voice stopped working after my subscription ended',
      'downgraded and voice is gone',
    ],
    answer:
      'Everything you saved by voice stays. It’s an ordinary receipt, bill or subscription, and you can open, edit or delete it on any plan. As with everything on the free plan, lists show the last 90 days, and older entries are kept out of view.\n\n' +
      'What changes is adding new ones by voice. The round button shows the **PRO** badge again and opens the Pro page instead of the mic. If Pro ends while you’re half-way through a voice entry, Skip shows the Pro page instead, and nothing is saved.\n\n' +
      'Your name fixes stay on the phone, ready if you come back to Pro.',
    keywords: ['Pro ended', 'cancelled', 'expired', 'trial ended', 'voice entries kept'],
    related: ['voice.pro.rules', 'voice.after-save'],
    pro: true,
  },
  {
    id: 'voice.voiceover',
    topic: 'voice',
    title: 'Can I use voice entry with VoiceOver?',
    questions: [
      'how do I use voice with VoiceOver on',
      'voiceover hold to talk doesnt work',
      'blind user voice entry',
      'double tap to start talking',
      'Tap to talk instead of hold',
      'does voice work with a screen reader',
      'voiceover reads listening',
      'accessibility voice entry',
      'cant hold the mic with voiceover',
      'Tap when you are done, what is that',
    ],
    answer:
      'Yes. With VoiceOver on, you don’t need to hold the button:\n\n' +
      '1. Double-tap **Record** to start. VoiceOver says “Listening” first, and the mic opens only after it has finished speaking, so its voice isn’t written down.\n' +
      '2. Talk.\n' +
      '3. Double-tap again when you’re done. VoiceOver says “Stopped”.\n\n' +
      'The words under the button change to **Tap to talk** and **Tap when you’re done**. On the check page, VoiceOver lands on the question first, **Is this right?**, and each row reads its name and value.',
    keywords: ['VoiceOver', 'screen reader', 'accessibility', 'double-tap', 'Tap to talk'],
    related: ['voice.record.how', 'troubleshooting.accessibility'],
    pro: true,
  },
  {
    id: 'voice.cant-add',
    topic: 'voice',
    title: 'What can’t I add by voice?',
    questions: [
      'Can I add my salary by voice?',
      'voice for credit cards',
      'I said got paid and it made a receipt',
      'can voice delete something',
      'add savings by voice',
      'can I edit a bill with my voice',
      'what types work with voice',
      'paycheck by voice',
      'voice only does three things?',
      'add a habit by voice',
      'can I add a goal by talking',
    ],
    answer:
      'Voice adds three things: receipts, bills and subscriptions. It can’t add pay, cards, bank accounts, loans, habits, savings or goals, and it can’t edit or delete something already saved.\n\n' +
      'If you say “got my paycheck 3,700”, Skip doesn’t know it’s pay. It shows a receipt it guessed at, so tap the **X** to close it, and add your pay under **Cards → Salary** instead.\n\n' +
      'If you’d like voice to do more, send it in **Settings → Support and feedback → Share an idea**.',
    keywords: ['salary', 'pay', 'paycheck', 'cards', 'loans', 'habits', 'goals', 'not supported'],
    related: ['voice.kind.how', 'voice.record.how'],
    pro: true,
  },

  // Privacy and your data

  {
    id: 'privacy.stored.what',
    topic: 'privacy',
    title: 'What does Skip store about me?',
    questions: [
      'What data does Skip collect?',
      'what information do you keep about me',
      'what does skip know about me',
      'what personal data is stored',
      'what do you save from my account',
      'list of my data skip has',
      'does skip collect my email',
      'do you store my name',
      'what is in my skip account',
      'data collected by skip budget',
      'what info is saved when I sign up',
      'does skip store my time zone',
    ],
    answer:
      'Only what you put in, plus what’s needed to run your account:\n\n- **Your account**: your email address, or the sign-in ID Apple or Google gives us if you use them.\n- **Your profile**: the display name and picture you choose from Skip’s set, and your phone’s time zone, so dates and reminders follow your day.\n- **Your money**: the bills, subscriptions, receipts, loans, pay, savings, goals, habits and card payments you enter, and the record of what your bills and subscriptions have charged.\n- **Your cards and accounts**: the name you give them, the network or bank, a colour, a balance you type, a due day, and at most the last four digits.\n- **Your settings**: your reminders, whether you have Skip Pro, and, if you turn reminders on, your phone’s notification address so they can reach it.\n\nSkip never asks for a full card number, expiry date, security code or bank login. More detail is in **Settings → About → Privacy policy**.',
    keywords: ['data', 'collect', 'personal information', 'what is stored', 'privacy policy'],
    related: ['privacy.stored.where', 'privacy.phone-only', 'privacy.who-sees', 'privacy.bank'],
    route: '/privacy',
  },
  {
    id: 'privacy.stored.where',
    topic: 'privacy',
    title: 'Where is my data kept?',
    questions: [
      'where is my data stored',
      'Is my data stored on my phone or in the cloud?',
      'where does skip keep my information',
      'does skip back up my data',
      'is my budget saved online',
      'if I lose my phone do I lose everything',
      'is my data kept on the server',
      'does skip use icloud',
      'where are my entries stored',
      'is anything saved on the phone itself',
      'cloud storage skip',
    ],
    answer:
      'Your entries are stored in your Skip account on our server, not only on the phone. That’s why they come back when you sign in on a new phone, and why your phones show the same thing.\n\nA few things belong to the phone and stay there: appearance, language, haptics and app lock, your voice name fixes, and the list of stores Skip remembers for you.\n\nSkip doesn’t keep your entries in iCloud. If you lose your phone, sign in on the new one and they’re all there.',
    keywords: ['cloud', 'server', 'backup', 'iCloud', 'lost phone', 'stored where'],
    related: ['privacy.phone-only', 'troubleshooting.new-phone', 'privacy.retention'],
  },
  {
    id: 'privacy.phone-only',
    topic: 'privacy',
    title: 'What never leaves my phone?',
    questions: [
      'What stays on my phone only?',
      'what doesnt go to your server',
      'is scanning done on the phone',
      'what data never gets uploaded',
      'local only data',
      'is face id data sent to skip',
      'does skip see my face id',
      'what is kept on device',
      'which data stays private on my iphone',
      'on device processing skip',
    ],
    answer:
      'These stay on your iPhone and are never sent to us:\n\n- **Receipt photos.** Scans and uploads are read on the phone by Apple’s own text recognition. The picture isn’t uploaded; Skip saves only the details you confirm.\n- **Your voice**, when your iPhone can recognise speech on the device.\n- **Appearance, haptics and app lock settings**, and your language choice.\n- **Voice name fixes** and the list of stores Skip remembers for you. The receipts themselves, store names included, are saved in your account.\n- **Face ID.** App lock asks iPhone to check it’s you. Skip never sees your face data.\n\nBecause these live on the phone, they don’t move to a new one.',
    keywords: ['on device', 'local', 'never uploaded', 'Face ID', 'receipt photo', 'private'],
    related: ['privacy.stored.where', 'voice.on-device', 'privacy.permissions'],
    route: '/privacy',
  },
  {
    id: 'privacy.bank',
    topic: 'privacy',
    title: 'Does Skip need my bank login or card number?',
    questions: [
      'Do I have to give Skip my bank password?',
      'does skip ask for my card number',
      'does it store my full card number',
      'can skip move money from my account',
      'do you need my online banking login',
      'why only the last four digits',
      'can skip see my bank transactions',
      'is my bank account linked to skip',
      'will skip ever take money',
      'does skip have access to my bank',
      'card security code skip',
    ],
    answer:
      'No. Skip never asks for, and never stores, a bank login, a full card number, an expiry date or a security code. At most it keeps the last four digits of a card, so you can tell your cards apart.\n\n' +
      'Skip doesn’t connect to your bank at all. It can’t see your bank’s transactions, and it can’t move, hold, send or receive money. Everything in it is something you told it, by typing, scanning a receipt or saying it.\n\n' +
      'The only payment Skip is part of is Skip Pro, and Apple handles that.',
    keywords: [
      'bank login',
      'password',
      'card number',
      'CVV',
      'security code',
      'last four',
      'credentials',
    ],
    related: ['privacy.account.compromised', 'privacy.stored.what', 'privacy.who-sees'],
  },
  {
    id: 'privacy.who-sees',
    topic: 'privacy',
    title: 'Who can see my data?',
    questions: [
      'who can see my stuff',
      'Can anyone else see my budget?',
      'who has access to my information',
      'can other users see my receipts',
      'is my data shared with anyone',
      'who processes my data',
      'does skip share with third parties',
      'third party services skip uses',
      'is my data private',
      'which companies get my data',
      'do other people see my spending',
    ],
    answer:
      'Your entries are shown only to you, when you’re signed in to your account. Other Skip users can never see them.\n\nTo run, Skip uses a few services that handle data on our behalf and aren’t allowed to use it for anything else:\n- A hosting service that stores your account and handles sign-in.\n- Apple or Google, only if you sign in with them, to confirm it’s you.\n- An email service, to send your sign-in codes and the messages you write to us.\n- Apple and a subscription service, to sell Skip Pro and check whether your account has it.\n- A crash-reporting service, which gets reports about what the app was doing, not what your budget holds.\n- Apple’s notification service, to deliver reminders you turn on.\n- Apple’s speech service, only for voice when your iPhone can’t do it on the device.\n\nSkip doesn’t sell your data or share it for advertising.',
    keywords: ['who sees', 'third parties', 'shared', 'access', 'service providers'],
    related: ['privacy.selling', 'privacy.crash-reports', 'privacy.stored.what'],
    route: '/privacy',
  },
  {
    id: 'privacy.selling',
    topic: 'privacy',
    title: 'Do you sell my data or track me?',
    questions: [
      'do you sell data',
      'Will Skip ever sell my information?',
      'do you track me',
      'does skip use analytics',
      'will my info be sold to advertisers',
      'is skip free because it sells data',
      'does skip track what I do in the app',
      'tracking skip budget',
      'do you share data with facebook or google for ads',
      'how does skip make money',
      'is my data a product',
    ],
    answer:
      'No. Skip doesn’t sell your data, doesn’t share it for advertising, and has no ads. There’s no third-party analytics either, only crash reports that help fix faults.\n\nSkip is paid for by Skip Pro, which is {proMonthly} a month or {proYearly} a year, billed by Apple. There’s also a voluntary tip, **Buy a coffee for team**, in **Settings**.',
    keywords: ['sell', 'tracking', 'analytics', 'advertisers', 'business model'],
    related: ['privacy.who-sees', 'privacy.crash-reports'],
  },
  {
    id: 'privacy.crash-reports',
    topic: 'privacy',
    title: 'What is in a crash report?',
    questions: [
      'what do crash reports send',
      'does a crash send my budget to you',
      'error reports privacy',
      'can I turn off crash reporting',
      'what happens when the app crashes, is data sent',
      'do you see my amounts when skip errors',
      'diagnostics skip sends',
      'is my email in crash reports',
      'does skip log what I do',
      'what information goes with an error',
    ],
    answer:
      'When something goes wrong, Skip sends a report so the fault can be found and fixed. It describes what the app was doing, not what your budget contains, and Skip is set up not to attach personal details to it.\n\n' +
      'There’s no switch for this in the app. Reports only come from the version of Skip you download, and only when something fails or crashes.',
    keywords: ['crash report', 'error report', 'diagnostics', 'logs'],
    related: ['privacy.who-sees', 'troubleshooting.crash'],
  },
  {
    id: 'privacy.ai',
    topic: 'privacy',
    title: 'Does Skip send my data to an AI?',
    questions: [
      'does skip use ai',
      'Does Skip use AI to read my receipts?',
      'is voice entry AI',
      'does chatgpt see my data',
      'is any of my info sent to an AI',
      'machine learning skip',
      'does skip use artificial intelligence',
      'does skip send my receipts to an AI',
      'is the receipt scanner AI',
      'is my data used to train AI',
      'does skip have an ai chatbot',
    ],
    answer:
      'No AI service sees your data. Skip uses features built into your iPhone and simple rules of its own:\n\n' +
      '- **Scanning**: Apple’s on-device text recognition reads the receipt, then Skip’s rules pick out the store, total and date.\n' +
      '- **Voice**: Apple’s speech recognition turns your words into text, then Skip’s rules on your phone find the amount, name and date.\n' +
      '- **Sam**, that’s me, matches your question to answers written by the Skip team. I’m not AI either.\n\n' +
      'Your data isn’t used to train anything.',
    keywords: ['AI reading my data', 'artificial intelligence', 'machine learning', 'train AI'],
    related: ['voice.on-device', 'privacy.who-sees'],
  },
  {
    id: 'privacy.retention',
    topic: 'privacy',
    title: 'How long does Skip keep my data?',
    questions: [
      'How long is my data kept?',
      'does skip delete old data',
      'data retention skip',
      'will my old receipts be deleted after a few years',
      'how far back does skip keep transactions',
      'is my history kept forever',
      'seven years data skip',
      'old bills deleted automatically?',
      'when does skip delete my history',
      'are old charges removed',
    ],
    answer:
      'Skip’s privacy policy sets two rules:\n\n' +
      '- **Things that happened**, like receipts, recorded charges and card payments, are kept for seven years, then let go a day at a time as each one passes that age.\n' +
      '- **Things still running**, like bills, subscriptions, cards, accounts and salaries, are kept until you delete them.\n\n' +
      'How far back you can see is separate. The free plan shows the last 90 days, and older entries are kept out of view, not deleted. Skip Pro shows up to 7 years.',
    keywords: ['retention', 'how long', 'seven years', '7 years', 'old data', 'kept'],
    related: ['privacy.delete-account', 'privacy.stored.where'],
    route: '/privacy',
  },
  {
    id: 'privacy.delete-account',
    topic: 'privacy',
    title: 'How do I delete my account?',
    questions: [
      'How do I delete my Skip account?',
      'delete account',
      'remove all my data from skip',
      'close my skip account',
      'I want to delete everything',
      'where is delete account',
      'how do I erase my skip data',
      'permanently delete skip',
      'delete my profile',
      'wipe my account',
      'I dont want to use skip anymore, how do I remove my info',
      'what does Delete everything for good mean',
      'This removes your account and everything you added. That includes 2 cards, 5 bills and 40 receipts',
      'what stays after I delete my account',
    ],
    answer:
      'Go to **Settings**, scroll to **Account**, and tap **Delete account**.\n\n' +
      '1. With Skip Pro, **Cancel Skip Pro first?** comes first: deleting your account doesn’t cancel Pro, and Apple keeps billing you until you cancel. **Manage in the App Store** opens your subscriptions and deletes nothing. If you’ve already cancelled, tap **Continue to delete**.\n' +
      '2. **Delete your account?** counts what will go, like your cards, bank accounts, bills, subscriptions, receipts and pay, and everything else, such as loans, savings, goals and spending habits. Tap **Continue**, or **Keep my account** to stop.\n' +
      '3. **Delete everything, for good?** is the last step. Tap **Delete everything**.\n\n' +
      'Your account and everything in it are removed at once, and you’re taken back to the welcome screen. Skip also clears your voice name fixes, remembered stores and recent searches from the phone. A few records outside Skip, such as crash reports, can stay.\n\n' +
      'You need to be online.',
    keywords: ['Delete account', 'remove account', 'erase', 'close account', 'Delete everything'],
    related: ['privacy.delete-undo', 'privacy.reset', 'privacy.export'],
    route: '/settings',
  },
  {
    id: 'privacy.delete-undo',
    topic: 'privacy',
    title: 'Can I get my account back after deleting?',
    questions: [
      'undo account deletion',
      'Can I undo deleting my account?',
      'I deleted my account by mistake',
      'recover a deleted skip account',
      'is there a grace period after deleting',
      'do you keep a backup after I delete',
      'restore my deleted data',
      'deleted skip account, can I sign in again',
      'can support bring back my deleted account',
      'how long until deleted data is gone',
      'is account deletion permanent',
    ],
    answer:
      'No. Deleting is immediate and permanent. There’s no grace period and no way to restore it, so it can’t be brought back. That’s why Skip asks before it deletes anything.\n\n' +
      'You can sign up again with the same email, or the same Apple or Google account, but you’ll start with an empty Skip.',
    keywords: ['undo', 'recover', 'restore', 'grace period', 'backup', 'permanent'],
    related: ['privacy.delete-account', 'privacy.reset'],
  },
  {
    id: 'privacy.reset',
    topic: 'privacy',
    title: 'Can I start fresh without deleting my account?',
    questions: [
      'reset all my data',
      'reset skip',
      'How do I reset Skip and start over?',
      'clear all my data but keep my account',
      'is there a reset button',
      'erase everything and start from zero',
      'delete all my receipts at once',
      'start my budget over',
      'wipe data but keep login',
      'remove all my test entries',
      'fresh start skip',
      'bulk delete',
    ],
    answer:
      'There’s no reset button or bulk delete. You can:\n\n' +
      '- Delete things one at a time. Open each receipt, bill, subscription, card or account, tap the pencil, and use the delete button at the bottom.\n' +
      '- Or delete your whole account in **Settings → Account → Delete account**, then sign up again with the same email for an empty Skip.\n\n' +
      'If a reset button would help you, send it as an idea in **Settings → Support and feedback → Share an idea**.',
    keywords: ['reset', 'start over', 'clear data', 'bulk delete', 'fresh start'],
    related: ['privacy.delete-account', 'privacy.delete-undo'],
  },
  {
    id: 'privacy.export',
    topic: 'privacy',
    title: 'Can I get a copy of all my data?',
    questions: [
      'How do I export all my data?',
      'download all my skip data',
      'get a copy of my information',
      'GDPR data request',
      'take my data to another app',
      'backup my budget to a file',
      'export everything from skip',
      'can I download my account data',
      'data portability skip',
      'I want all my data in a file',
    ],
    answer:
      'In the app, you can export your bill and subscription payments with Skip Pro:\n\n' +
      '1. Open **Monthly bills** or **Subscriptions** and tap **See payment history**.\n' +
      '2. Tap **Export CSV or PDF**, or the share button at the top.\n' +
      '3. Pick **CSV** (for Numbers, Excel or Google Sheets) or **PDF** (a statement to print or send), then tap **Export**.\n\n' +
      'Receipts, cards, pay and the rest can’t be exported from the app. For a full copy of your data, write to **admin@skipapps.net**, as the privacy policy explains, and we’ll act on it.',
    keywords: ['export', 'download', 'copy', 'CSV', 'PDF', 'GDPR', 'portability'],
    related: ['privacy.rights', 'privacy.delete-account'],
  },
  {
    id: 'privacy.rights',
    topic: 'privacy',
    title: 'What are my rights over my data?',
    questions: [
      'can I see all the data you have on me',
      'how do I correct my data',
      'data protection rights skip',
      'object to processing',
      'right to be forgotten skip',
      'who do I contact about my privacy',
      'privacy request email',
      'privacy contact address',
      'gdpr rights',
      'ccpa skip',
    ],
    answer:
      'You can see everything Skip holds about you in the app, correct any of it by editing it, and delete all of it in **Settings → Account → Delete account**.\n\n' +
      'Depending on where you live, you may also have a right to a copy of your data in a portable form, or to object to some processing. Write to **admin@skipapps.net** and we’ll act on it. The details are in **Settings → About → Privacy policy**.',
    keywords: ['rights', 'GDPR', 'CCPA', 'correct', 'object', 'privacy contact'],
    related: ['privacy.export', 'privacy.delete-account', 'privacy.terms'],
    route: '/privacy',
  },
  {
    id: 'privacy.terms',
    topic: 'privacy',
    title: 'What do the terms of service say?',
    questions: [
      'what are the main points of the terms',
      'is skip financial advice',
      'who owns the data I enter',
      'terms of service summary',
      'can skip be wrong about my money',
      'is skip responsible for my financial decisions',
      'can my account be closed by you',
      'what am I agreeing to by using skip',
      'liability skip',
      'is skip a financial adviser',
      'are the spanish terms official',
    ],
    answer:
      'In short:\n\n' +
      '- Skip is a tool for writing down and looking at your own money. It isn’t a bank, a payment service or a financial adviser, and nothing in it is financial, tax or legal advice.\n' +
      '- Every figure comes from what you entered. Forecasts of bills and paydays are estimates from the schedules you set.\n' +
      '- What you put in stays yours, and you can delete it whenever you like.\n' +
      '- An account is for one person. An account that breaks the terms can be suspended or closed.\n\n' +
      'Read it all in **Settings → About → Terms of service**. In Spanish or French it’s a courtesy translation, and the English version is the one that counts.',
    keywords: ['terms', 'terms of service', 'agreement', 'advice', 'liability', 'owns data'],
    related: ['privacy.rights', 'privacy.stored.what'],
    route: '/terms',
  },
  {
    id: 'privacy.shared-phone',
    topic: 'privacy',
    title: 'I’m selling or sharing my phone',
    questions: [
      'I am selling my phone, what should I do with skip',
      'someone else will use my iphone',
      'how do I make sure the next person cant see my budget',
      'sign out before giving my phone away',
      'family uses my phone',
      'will reminders keep going to my old phone',
      'handing down my iphone',
      'stop my info showing on my old phone',
      'trading in my iphone skip',
      'protect skip from people who borrow my phone',
    ],
    answer:
      'Sign out first, in **Settings → Account → Sign out**. Signing out:\n\n- stops your reminders going to that phone,\n- clears your voice name fixes and the stores Skip remembered for you from it,\n- and returns Skip to the welcome screen.\n\nIt also signs you out of Skip on your other phones, so sign in again on your new one if it asks.\n\nYour entries stay safe in your account, ready on your next phone. If someone shares your phone day to day, turn on **App lock** in **Settings → Preferences**, so Skip asks for Face ID before it opens.',
    keywords: ['sell phone', 'give away', 'shared phone', 'sign out', 'App lock', 'trade in'],
    related: ['privacy.account.compromised', 'troubleshooting.new-phone'],
  },
  {
    id: 'privacy.permissions',
    topic: 'privacy',
    title: 'What permissions does Skip ask for?',
    questions: [
      'what permissions does skip need',
      'does skip use my location',
      'does skip read my contacts',
      'why does skip want my camera',
      'why does skip want my photos',
      'can I say no to skip permissions',
      'does skip access my photo library',
      'skip permissions list',
      'does skip read my text messages',
      'does skip access my calendar',
    ],
    answer:
      'Skip asks only when you use something that needs it, and you can say no and still use the rest:\n\n' +
      '- **Camera**: to scan receipts. Scans are read on the phone and never uploaded.\n' +
      '- **Photos**: to read a receipt you pick from your photos, on the phone.\n' +
      '- **Microphone** and **Speech Recognition**: for voice entry.\n' +
      '- **Notifications**: for reminders you turn on.\n' +
      '- **Face ID**: for **App lock**, if you switch it on.\n\n' +
      'Skip doesn’t ask for your location, contacts, calendar or messages. Change any permission in the iPhone’s **Settings → Skip Budget**.',
    keywords: ['permissions', 'location', 'contacts', 'camera', 'photos', 'microphone', 'Face ID'],
    related: ['privacy.phone-only', 'voice.permissions.first'],
  },
  {
    id: 'privacy.account.compromised',
    topic: 'privacy',
    title: 'I think someone got into my account',
    questions: [
      'I think someone got into my skip account',
      'my skip account was hacked',
      'there are entries I didnt add',
      'someone else is using my account',
      'strange receipts appeared in my account',
      'unauthorised access to my skip account',
      'how do I secure my account after a breach',
      'someone knows my skip password',
      'suspicious activity in skip',
      'can I see who signed in to my account',
      'how do I keep my skip account secure',
    ],
    answer:
      'Act quickly:\n\n' +
      '1. Set a new password. Sign out in **Settings → Account → Sign out**, then on the **Log in** screen tap **Forgot password?** and follow the code sent to your email. If you sign in with Apple or Google, secure that account instead.\n' +
      '2. Tell us at **admin@skipapps.net**, or in **Settings → Support and feedback → Email support**, so we can look into it.\n' +
      '3. Look through your entries for anything you didn’t add, and delete it.\n\n' +
      'Skip doesn’t show a list of sign-ins. It holds no bank logins or full card numbers and can’t move money, so nobody can reach your bank through it. To stop people opening Skip on your phone, turn on **App lock** in **Settings → Preferences**.',
    keywords: ['hacked', 'compromised', 'breach', 'unauthorised', 'suspicious', 'secure account'],
    related: ['privacy.bank', 'privacy.shared-phone', 'privacy.who-sees'],
  },

  // Something's not right: app-wide problems

  {
    id: 'troubleshooting.failure.what',
    topic: 'troubleshooting',
    title: 'What does “Something went wrong” mean?',
    questions: [
      'What does Something went wrong. Please try again mean?',
      'something went wrong error',
      'I keep seeing something went wrong',
      'why does skip say please try again',
      'error message in skip',
      'what is the error skip shows',
      'it said something went wrong and nothing happened',
      'skip error',
      'page shows something went wrong with a try again button',
      'did I lose my data, it said something went wrong',
      'what does try again mean',
    ],
    answer:
      'It’s the one message Skip shows whenever something fails, like loading a page, saving, deleting or sending. It almost always means Skip couldn’t reach your account for a moment, usually because of the connection.\n\n' +
      '1. Check you’re online, on Wi-Fi or mobile data.\n' +
      '2. Tap **Try again** on the page, or tap the same button again, like **Save**.\n' +
      '3. Still stuck? Close Skip fully and open it again.\n\n' +
      'Nothing you already saved is lost. When a save fails, what you entered stays on the page so you can try again, and saving again never makes a second copy of a receipt, bill, subscription, card, account, salary, habit or card payment. If a page can’t refresh, it keeps the figures it already showed, with “Couldn’t refresh · showing your last figures” under them.\n\n' +
      'Messages that tell you what to fix, like “Enter the bank name.” or “Pick a store first.”, aren’t failures. They point to something that still needs an answer.',
    keywords: ['Something went wrong', 'Please try again', 'Try again', 'error', 'failed'],
    related: [
      'troubleshooting.failure.repeats',
      'troubleshooting.wont-save',
      'troubleshooting.slow',
    ],
  },
  {
    id: 'troubleshooting.refresh-failed',
    topic: 'troubleshooting',
    title: 'What does “Couldn’t refresh” mean?',
    questions: [
      'what does couldnt refresh showing your last figures mean',
      'it says couldnt refresh under my balance',
      'showing your last figures',
      'are these numbers out of date',
      'my figures did not update and it says couldnt refresh',
      'couldnt refresh on monthly bills',
      'is the balance shown old',
      'why does it say showing your last figures on home',
      'refresh failed but numbers still there',
      'how do i get the latest figures',
    ],
    answer:
      'Skip couldn’t reload that page’s figures just now, usually because of the connection, so it keeps showing the last ones it had. They’re the figures from your last successful refresh, not a guess.\n\n' +
      'Pull down on the page to try again, or come back once you’re online. The line goes as soon as a refresh works. A full **Something went wrong. Please try again.** page appears only when there’s nothing to show yet.\n\n' +
      'You’ll see it on pages such as **Home**, **Cards** and each card’s page, **Monthly bills**, **Subscriptions**, **Payment history**, **Loans**, **Spending habits**, **Goals** and **Insights**.',
    keywords: ['Couldn’t refresh', 'last figures', 'out of date', 'refresh failed'],
    related: ['troubleshooting.failure.what', 'cards.error'],
  },
  {
    id: 'troubleshooting.failure.repeats',
    topic: 'troubleshooting',
    title: 'Nothing works, every page shows an error',
    questions: [
      'It still says something went wrong after trying again',
      'every page shows an error',
      'nothing loads in skip',
      'skip wont load anything',
      'I cant save anything at all',
      'error on every screen',
      'skip is broken',
      'try again doesnt work',
      'skip not working today',
      'is skip down',
      'all my pages are empty with errors',
    ],
    answer:
      'If every try fails, work through these:\n\n' +
      '1. Switch between Wi-Fi and mobile data, or turn Airplane Mode on and off.\n' +
      '2. Close Skip fully, by swiping it away in the app switcher, and open it again.\n' +
      '3. Update Skip in the App Store, and restart your iPhone.\n' +
      '4. Sign out and back in: **Settings → Account → Sign out**. Your entries are safe in your account. Only the voice name fixes and shops kept on this phone are cleared.\n\n' +
      'If it still fails, Skip may be having a problem on our side. Tell us in **Settings → Support and feedback → Email support** what you were doing and what you saw. If you can’t get that far, write to **admin@skipapps.net**.',
    keywords: ['not working', 'down', 'broken', 'nothing loads', 'outage'],
    related: ['troubleshooting.failure.what', 'troubleshooting.crash', 'troubleshooting.update'],
  },
  {
    id: 'troubleshooting.wont-save',
    topic: 'troubleshooting',
    title: 'Why won’t anything save?',
    questions: [
      'save button wont work',
      'nothing saves in skip',
      'grey save button everywhere',
      'save does nothing anywhere in the app',
      'the button at the bottom does nothing',
      'it wont let me save',
      'form wont submit',
      'cant save my changes',
      'what does the grey text above save mean',
      'save not working',
      'red text above the save button',
    ],
    answer:
      'The words just above the button tell you which of two things is going on:\n\n' +
      '- **Grey text saying what’s missing**, like “Pick a store first.” or a list of fields. Something still needs an answer. Fill in the rows that say **Tap to add**, then tap **Save** again.\n' +
      '- **“Something went wrong. Please try again.”** The save didn’t reach your account, usually because of the connection. Your entry is still on the page. Check you’re online and tap **Save** again.\n\n' +
      'When a save works, a short note pops up at the bottom of the screen, like **Bill added**.',
    keywords: ['save', 'greyed out', 'disabled', 'won’t save', 'missing fields'],
    related: ['troubleshooting.failure.what', 'voice.review.required'],
  },
  {
    id: 'troubleshooting.slow',
    topic: 'troubleshooting',
    title: 'Skip is slow or keeps loading',
    questions: [
      'why is skip so slow',
      'skip keeps loading',
      'spinner forever',
      'pages take ages to open',
      'skip is laggy',
      'it takes long to save',
      'why does skip load every time I open it',
      'slow app',
      'numbers take a while to appear',
      'skip takes forever',
    ],
    answer:
      'Skip loads your entries from your account, so its speed mostly follows your connection.\n\n' +
      '- A weak signal is the usual cause. Try Wi-Fi, or somewhere with better signal.\n' +
      '- When you come back to Skip after a while, it fetches the latest figures so they’re right. That can take a moment.\n' +
      '- Pull down on **Home**, **Cards**, **Activity** and most lists to refresh by hand.\n' +
      '- If it feels stuck, close Skip fully and open it again.\n\n' +
      'If it’s slow all the time on a good connection, tell us which page in **Settings → Support and feedback → Email support**.',
    keywords: ['slow', 'loading', 'spinner', 'lag', 'takes forever'],
    related: [
      'troubleshooting.failure.repeats',
      'troubleshooting.sync',
      'troubleshooting.splash-stuck',
    ],
  },
  {
    id: 'troubleshooting.crash',
    topic: 'troubleshooting',
    title: 'Skip crashed or closed by itself',
    questions: [
      'skip keeps crashing',
      'app closes on its own',
      'skip quits when I open a page',
      'app crashed while saving',
      'skip freezes',
      'the app shut down',
      'skip froze and closed',
      'app keeps closing',
      'did I lose what I was entering when it crashed',
      'skip is frozen',
    ],
    answer:
      'Sorry about that. Skip sends a crash report by itself, describing what the app was doing and none of your budget, so the fault can be found.\n\n' +
      '1. Close Skip fully and reopen it.\n' +
      '2. Update Skip in the App Store, and update iOS.\n' +
      '3. Restart your iPhone.\n\n' +
      'Anything you’d already saved is safe in your account. Only the entry you were in the middle of is lost, so check it’s there and add it again if not.\n\n' +
      'If it keeps happening in the same spot, tell us what you tapped just before in **Settings → Support and feedback → Email support**. Your **Version** from **Settings → About** helps.',
    keywords: ['crash', 'freeze', 'closes', 'quits', 'frozen'],
    related: ['privacy.crash-reports', 'troubleshooting.update', 'troubleshooting.splash-stuck'],
  },
  {
    id: 'troubleshooting.splash-stuck',
    topic: 'troubleshooting',
    title: 'Skip is stuck on the opening screen',
    questions: [
      'skip stuck on the logo',
      'app wont open past the splash',
      'stuck on the loading screen',
      'skip shows the logo and nothing else',
      'blank screen when opening skip',
      'white screen on launch',
      'skip doesnt start',
      'app hangs at startup',
      'cant get past the start screen',
      'skip opens to a blank page',
      'black screen when i open skip',
    ],
    answer:
      'The opening logo plays for about two seconds while Skip gets ready, and gives way within a few seconds even if the animation can’t load. If you’re still stuck after that:\n\n' +
      '1. Close Skip fully, by swiping it away in the app switcher, and open it again.\n' +
      '2. Restart your iPhone.\n' +
      '3. Update Skip in the App Store.\n' +
      '4. Still stuck? Delete and reinstall Skip, then sign in. Your entries are in your account, but settings kept on the phone, like appearance and app lock, reset.\n\n' +
      'If none of that helps, write to **admin@skipapps.net**, since you may not be able to reach **Settings**.',
    keywords: ['splash', 'stuck', 'logo', 'blank screen', 'startup', 'launch'],
    related: ['troubleshooting.crash', 'troubleshooting.reinstall'],
  },
  {
    id: 'troubleshooting.update',
    topic: 'troubleshooting',
    title: 'How do I update Skip?',
    questions: [
      'how do I update the app',
      'is there a new version of skip',
      'skip asks me to update',
      'turn on automatic updates for skip',
      'update skip budget',
      'app update available',
      'do I need to update skip',
      'latest version of skip',
      'what is new in the update',
      'will updating delete my data',
    ],
    answer:
      'Skip updates through the App Store:\n\n' +
      '1. Open the **App Store** and tap your picture at the top right.\n' +
      '2. Find **Skip Budget** under the available updates and tap **Update**.\n\n' +
      'To get updates by themselves, turn on **App Updates** in the iPhone’s **Settings → App Store**. Updating never touches your entries.\n\n' +
      'Skip doesn’t lock you out to make you update. News about new versions and features appears under the bell on **Home**, in **Notifications**. Your current version is in **Settings → About → Version**.',
    keywords: ['update', 'new version', 'App Store', 'automatic updates', 'upgrade app'],
    related: ['troubleshooting.crash', 'troubleshooting.failure.repeats'],
  },
  {
    id: 'troubleshooting.new-phone',
    topic: 'troubleshooting',
    title: 'Will my data come back on a new phone?',
    questions: [
      'new iphone, how do I get my skip data',
      'moving skip to a new phone',
      'will my budget transfer to my new phone',
      'switched phones, how do I get everything back',
      'how do I move my data to a new iphone',
      'set up skip on my new iphone',
      'transfer skip data',
      'do I need to set everything up again on a new phone',
      'what doesnt come over to my new phone',
      'upgraded my iphone, what about skip',
    ],
    answer:
      'Yes. Install Skip on the new phone and sign in the same way as before, with the same email or the same Apple or Google account. Everything in your account comes back: receipts, bills, subscriptions, cards, pay, loans, savings and the rest.\n\nA few things belong to the old phone, so set them again:\n- **Appearance**, **Language**, **Haptics** and **App lock** in **Settings → Preferences**.\n- Notifications: turn on **Monthly wrap-up** in **Settings → Preferences → Reminders**, and tap Allow when iPhone asks. Your other reminders then reach this phone too.\n- Voice name fixes and the stores Skip remembered for you start fresh.\n\nIf Skip Pro doesn’t show, go to **Settings → Skip Pro → Restore purchase**.',
    keywords: ['new phone', 'transfer', 'move data', 'switch phones', 'new iPhone'],
    related: ['troubleshooting.reinstall', 'troubleshooting.missing-data', 'privacy.stored.where'],
  },
  {
    id: 'troubleshooting.reinstall',
    topic: 'troubleshooting',
    title: 'I deleted the app. Is my data gone?',
    questions: [
      'I deleted the app',
      'uninstalled skip, is everything gone',
      'I deleted skip by accident',
      'if I uninstall skip do I lose my data',
      'reinstalled skip, where is my stuff',
      'reinstall app data',
      'offload skip',
      'deleted the app, is my account still there',
      'will reinstalling fix my problem',
      'removed skip from my phone',
      'does deleting the app delete my account',
      'reinstall and sign in',
    ],
    answer:
      'No, your data is safe. Deleting the app doesn’t delete your account. Reinstall Skip from the App Store, sign in the same way as before, and everything in your account comes back.\n\nWhat resets with a reinstall: the settings kept on the phone (appearance, language, haptics, app lock), your voice name fixes, and the stores Skip remembered for you. To get notifications again, turn on **Monthly wrap-up** in **Settings → Preferences → Reminders** and tap Allow when iPhone asks.\n\nDeleting the app doesn’t cancel Skip Pro. To delete your data for good, use **Settings → Account → Delete account**.',
    keywords: ['uninstall', 'reinstall', 'deleted app', 'offload', 'removed app'],
    related: ['troubleshooting.new-phone', 'privacy.delete-account'],
  },
  {
    id: 'troubleshooting.missing-data',
    topic: 'troubleshooting',
    title: 'My entries disappeared',
    questions: [
      'my entries are gone',
      'data missing from skip',
      'I lost my transactions',
      'old entries disappeared',
      'my history is gone',
      'everything I entered vanished',
      'skip lost my data',
      'entries from months ago are missing',
      'things I added last week are not there',
      'where did my stuff go',
    ],
    answer:
      'Your entries are kept in your account, so they’re almost always still there. Check these in order:\n\n' +
      '- **Older than 90 days on the free plan?** Lists show the last 90 days. Older entries are kept out of view and come back with Skip Pro.\n' +
      '- **A different account?** If you joined with email and now signed in with Apple or Google, or the other way round, you may be in a second, empty account. Sign out and sign in the way you first did.\n' +
      '- **The right place?** Receipts can sit in a different book, and **Activity** shows one period at a time.\n' +
      '- **Deleted?** Deleted entries can’t come back.\n' +
      '- **No connection?** Pull down to refresh, or tap **Try again**.\n\n' +
      'Still missing? Tell us in **Settings → Support and feedback → Email support**.',
    keywords: ['missing', 'disappeared', 'gone', 'vanished', 'lost data'],
    related: ['troubleshooting.new-phone', 'troubleshooting.sync', 'troubleshooting.numbers-wrong'],
  },
  {
    id: 'troubleshooting.sync',
    topic: 'troubleshooting',
    title: 'Changes on my other phone don’t show',
    questions: [
      'skip not syncing between my phones',
      'I added a bill on one phone but my other phone doesnt show it',
      'two devices out of sync',
      'changes not showing up on my other iphone',
      'how long until changes appear on my other phone',
      'my phones show different things',
      'sync problem',
      'deleted on one phone still showing on the other',
      'not updating across devices',
      'other phone has old data',
    ],
    answer:
      'Skip updates by itself. When something changes in your account, your other phones pick it up within moments, as long as Skip is open and online on them.\n\n' +
      'If it hasn’t appeared:\n' +
      '1. Check both phones are signed in to the same account. **Settings → Support and feedback → Email support** shows the email you’re signed in with.\n' +
      '2. Pull down on the page to refresh.\n' +
      '3. Close Skip and open it again.\n\n' +
      'Skip also refreshes when you come back to it after a while. Settings kept on each phone, like appearance and language, never sync.',
    keywords: ['sync', 'other phone', 'devices', 'not updating', 'out of sync'],
    related: ['troubleshooting.missing-data', 'troubleshooting.slow'],
  },
  {
    id: 'troubleshooting.numbers-wrong',
    topic: 'troubleshooting',
    title: 'My numbers look wrong',
    questions: [
      'skip numbers dont match my bank',
      'totals look off',
      'why is my budget wrong',
      'the math in skip is wrong',
      'figures dont add up',
      'skip shows the wrong amount',
      'my spending total is too high',
      'numbers incorrect',
      'skip calculations are off',
      'why are my figures different from what I expect',
    ],
    answer:
      'Every number in Skip is worked out to the cent from what’s been entered, so when one looks off, an entry behind it usually is. The common causes:\n\n' +
      '- An amount or date typed wrong, or an entry added twice.\n' +
      '- A receipt, bill or subscription paid with the wrong card or account, or with none.\n' +
      '- A starting balance on a card or account that’s out of date.\n' +
      '- Pay that’s missing, or set up on the wrong schedule.\n' +
      '- Spending that was never added. Skip isn’t linked to your bank, so it only knows what you tell it.\n' +
      '- On the free plan, older entries are hidden from lists but still count.\n\n' +
      'Ask me about the figure that looks wrong, like “How is the Current balance worked out?” or “Why is my card balance wrong?”, and I’ll show how it’s built.',
    keywords: ['wrong numbers', 'math', 'totals', 'calculation', 'doesn’t add up'],
    related: ['troubleshooting.missing-data', 'troubleshooting.wrong-date'],
  },
  {
    id: 'troubleshooting.wrong-date',
    topic: 'troubleshooting',
    title: 'Dates in Skip are off by a day',
    questions: [
      'skip shows the wrong date',
      'today is wrong in skip',
      'my entry saved on the wrong day',
      'dates are a day behind',
      'time zone wrong in skip',
      'I travelled and the dates are off',
      'skip thinks its yesterday',
      'skip still shows yesterday after midnight',
      'my dates changed after a trip',
      'wrong day everywhere in skip',
    ],
    answer:
      'Skip’s “today” is your iPhone’s own date, and your account keeps your phone’s time zone so charges and reminders follow your day.\n\n- Check the iPhone’s date and time: **Settings → General → Date & Time**, with **Set Automatically** on.\n- After travelling, just come back to Skip. It saves the new time zone whenever it opens or comes back to the front.\n- If Skip was left open overnight, it moves to the new day within a minute, or as soon as you come back to it.\n\nIf one entry has the wrong day, open it, tap the pencil and change the date.',
    keywords: ['date', 'time zone', 'wrong day', 'travel', 'today', 'midnight'],
    related: ['troubleshooting.numbers-wrong', 'troubleshooting.sync'],
  },
  {
    id: 'troubleshooting.badge',
    topic: 'troubleshooting',
    title: 'What is the red number on the Skip icon?',
    questions: [
      'red badge on the skip app icon',
      'number on the skip icon',
      'how do I clear the badge',
      'skip icon shows 1',
      'badge wont go away',
      'little red circle on the app',
      'what does the badge mean',
      'skip app icon notification count',
      'remove the badge from skip',
      'badge number skip',
    ],
    answer:
      'It means a Skip notification arrived since you last opened Skip. Opening Skip clears it.\n\n' +
      'If you’d rather never see it, turn off **Badges** in the iPhone’s **Settings → Notifications → Skip Budget**.\n\n' +
      'The dot on the bell on **Home** is different. It means there’s news from Skip in **Notifications** that you haven’t read yet.',
    keywords: ['badge', 'red number', 'app icon', 'red circle'],
    related: ['troubleshooting.update'],
  },
  {
    id: 'troubleshooting.large-text',
    topic: 'troubleshooting',
    title: 'The text is too big or too small',
    questions: [
      'text is too big',
      'the writing in skip is huge',
      'how do I make the text bigger in skip',
      'text is too small',
      'font size skip',
      'words are cut off',
      'large text makes skip look weird',
      'does skip support dynamic type',
      'some text doesnt get bigger',
      'text overlapping',
      'can I change the font size in the app',
      'the numbers dont grow with text size',
    ],
    answer:
      'Skip follows your iPhone’s text size, and has no separate setting of its own. Change it in the iPhone’s **Settings → Display & Brightness → Text Size**, or for even bigger text, **Settings → Accessibility → Display & Text Size → Larger Text**.\n\n' +
      'To keep every page usable, each kind of text stops growing at a set point. Reading text grows the most, row labels a little less, and headings and big figures the least, so at the largest sizes some numbers stay smaller than the words. Buttons like **Save** stay pinned at the bottom, so you can always reach them.\n\n' +
      'If something is cut off or overlapping, tell us which page in **Settings → Support and feedback → Email support**.',
    keywords: ['text size', 'font', 'larger text', 'dynamic type', 'cut off', 'small text'],
    related: ['troubleshooting.text-size.reset', 'troubleshooting.accessibility'],
  },
  {
    id: 'troubleshooting.text-size.reset',
    topic: 'troubleshooting',
    title: 'Changing the text size reset my page',
    questions: [
      'I changed the text size and skip went back',
      'lost what I was typing after changing font size',
      'skip reset when I changed text size',
      'app jumped back after an accessibility change',
      'page reloaded by itself',
      'form cleared after changing settings',
      'my entry vanished when I changed text size',
      'text size change closed my page',
      'why did skip redraw everything',
      'skip restarted when I changed display settings',
    ],
    answer:
      'When the text size changes while Skip is open, Skip redraws its pages so everything fits the new size. A page you were part-way through can lose what you hadn’t saved yet.\n\n' +
      'Anything already saved is safe. To avoid retyping, save first, or change the text size before you start adding something. If you were adding by voice and see **Nothing to check yet**, tap **Start again**.',
    keywords: ['text size', 'reset', 'redraw', 'lost typing'],
    related: ['troubleshooting.large-text', 'voice.stale'],
  },
  {
    id: 'troubleshooting.dark-mode',
    topic: 'troubleshooting',
    title: 'Dark mode looks wrong',
    questions: [
      'skip stays light when my phone is dark',
      'why does skip open with a light screen in dark mode',
      'the opening animation is bright',
      'dark mode not working in skip',
      'skip ignores my phone dark mode',
      'flash of light when opening skip at night',
      'some parts look odd in dark mode',
      'skip is dark but I want it light',
      'theme not following my phone',
      'dark mode looks off',
    ],
    answer:
      'A few things explain most of it:\n\n' +
      '- **Skip doesn’t change when your phone does.** **Appearance** is set to **Light** or **Dark**. Choose **System** in **Settings → Preferences → Appearance** to follow your phone.\n' +
      '- **A light screen when Skip opens.** The opening logo animation always plays on its cream background, then Skip switches to your theme.\n' +
      '- **Something hard to read in dark mode.** Tell us which page in **Settings → Support and feedback → Email support**, and describe what you see.\n\n' +
      'Appearance is free on every plan and kept on each phone.',
    keywords: ['dark mode', 'light mode', 'theme', 'Appearance', 'System', 'night'],
    related: ['troubleshooting.motion', 'troubleshooting.large-text'],
  },
  {
    id: 'troubleshooting.motion',
    topic: 'troubleshooting',
    title: 'Can I turn off the animations?',
    questions: [
      'too much animation in skip',
      'reduce motion skip',
      'the opening animation makes me dizzy',
      'turn off the logo video',
      'skip splash screen animation',
      'motion sickness from the app',
      'can I skip the intro animation',
      'stop the mic pulsing',
      'animations off',
      'less movement in skip',
    ],
    answer:
      'Skip follows the iPhone’s **Reduce Motion** setting. Turn it on in **Settings → Accessibility → Motion → Reduce Motion**.\n\n' +
      'With it on, Skip opens on the finished logo as a still picture instead of playing the animation, and the voice mic stops pulsing and growing while you talk. Skip has no separate switch of its own.',
    keywords: ['Reduce Motion', 'animation', 'motion', 'dizzy', 'splash'],
    related: ['troubleshooting.accessibility', 'troubleshooting.dark-mode'],
  },
  {
    id: 'troubleshooting.accessibility',
    topic: 'troubleshooting',
    title: 'Does Skip work with VoiceOver?',
    questions: [
      'is skip accessible',
      'voiceover support skip',
      'screen reader skip budget',
      'can blind people use skip',
      'accessibility features',
      'does skip read out amounts',
      'skip for the visually impaired',
      'accessibility help',
      'voiceover reads the wrong label',
      'is skip usable with a screen reader',
    ],
    answer:
      'Yes. Skip is built to work with VoiceOver. Buttons, rows and figures have spoken names, and rows on add pages say whether they’re still needed or optional.\n\n' +
      'It also follows your iPhone’s text size and **Reduce Motion** setting. With VoiceOver on, voice entry switches to double-tap to start and stop, so you don’t need to hold the button.\n\n' +
      'If something isn’t read out well, tell us which page in **Settings → Support and feedback → Email support**.',
    keywords: ['VoiceOver', 'accessibility', 'screen reader', 'blind', 'visually impaired'],
    related: ['troubleshooting.large-text', 'troubleshooting.motion', 'voice.voiceover'],
  },
  {
    id: 'privacy.encryption',
    topic: 'privacy',
    title: 'Is my data encrypted?',
    questions: [
      'is my data encrypted',
      'does skip use encryption',
      'is the connection secure',
      'can hackers see my budget',
      'is my information sent securely',
      'https',
      'how is my data protected',
      'is my data safe on your server',
      'what stops someone reading my data',
      'encrypted connection',
    ],
    answer:
      'Yes, on its way between your phone and our server. Skip only talks to our server over an encrypted connection, the same kind your bank’s website uses, so nobody along the way can read it.\n\nOn our server, your entries belong to your account alone. Other Skip users can never see them, and they aren’t sold or shared for advertising.\n\nSkip also never asks for or stores your bank login, a full card number, an expiry date or a security code. To keep out people who pick up your phone, turn on **Settings → Preferences → App lock**.',
    keywords: ['encryption', 'encrypted', 'secure', 'HTTPS', 'TLS', 'hackers'],
    related: ['privacy.who-sees', 'privacy.stored.where', 'privacy.bank'],
    route: '/privacy',
  },
];
