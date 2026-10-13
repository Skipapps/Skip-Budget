import type { Intent } from '@/lib/ask-sam/types';

export const gettingStartedIntents: Intent[] = [
  // The big picture

  {
    id: 'getting-started.skip.what',
    topic: 'getting-started',
    title: 'What is Skip?',
    questions: [
      'is skip only a spending tracker',
      'what else does skip do besides tracking spending',
      'What is Skip?',
      'what does this app do',
      'What is Skip Budget for?',
      'explain skip to me',
      'What can I do with Skip?',
      'is this a budgeting app',
      'How does Skip work?',
      "what's the point of this app",
      'skip app what is it',
      'i just downloaded this what does it actually do',
      'What kind of app is Skip?',
      'give me the short version of what skip does',
      'what is skip budget about',
    ],
    answer:
      'Skip is a personal budgeting app for iPhone. You tell it about your money and it keeps everything in one place: your pay, credit cards, bank accounts, bills, subscriptions, receipts, loans and savings.\n\n' +
      'From that, Skip shows your **Current balance**, where your money went this month, what is **Coming up**, and reminds you before bills, renewals and payday. It never connects to your bank. You add things by typing, by scanning a receipt, or with Skip Pro, by voice.\n\n' +
      'The easiest place to begin is the **Getting started** card on **Home**.',
    keywords: ['skip', 'skip budget', 'about', 'overview', 'budget app', 'what is this'],
    related: [
      'getting-started.skip.who',
      'getting-started.skip.free',
      'getting-started.skip.bank',
      'getting-started.start.first',
    ],
  },
  {
    id: 'getting-started.skip.who',
    topic: 'getting-started',
    title: 'Who is Skip made for?',
    questions: [
      'Who is Skip made for?',
      'who is this app for',
      'Is Skip right for me?',
      'is skip good for beginners',
      'Can my teenager use Skip?',
      'is there an age limit',
      'can kids use skip',
      'Is Skip for businesses or just personal use?',
      'who should use skip',
      'is skip for people who hate budgeting',
      'Can I use Skip for my small business?',
      'what age do you have to be',
      'is this app suitable for young children',
      'can a child have their own skip account for pocket money',
      'can minors use skip',
      'my daughter wants to track her allowance, is that ok',
      'is skip only for adults',
      'can a kid use skip for pocket money',
    ],
    answer:
      'Skip is for anyone who wants to see clearly where their own money goes, without handing over a bank login. It suits people who like to stay in control: you decide what goes in, and Skip adds it up.\n\n' +
      'A few things to know:\n' +
      '- One account is for one person.\n' +
      '- It is for adults managing their own money. It is not meant for children.\n' +
      '- It is made for personal money. There are no business features like invoices or tax reports.\n' +
      '- Skip is for tracking and planning. It is not a bank and does not give financial advice.',
    keywords: ['audience', 'age', 'kids', 'children', 'teen', 'business', 'personal'],
    related: [
      'getting-started.skip.what',
      'getting-started.account.share',
      'getting-started.skip.not-a-bank',
    ],
  },
  {
    id: 'getting-started.skip.free',
    topic: 'getting-started',
    title: 'Is Skip free?',
    questions: [
      'do I ever have to pay if I stay on the free plan',
      'how much does skip cost',
      'Do I have to pay to use Skip?',
      'is this app free or paid',
      'Is there a free version?',
      'what do i get for free',
      'is skip free forever',
      'Does the free plan run out?',
      'free vs paid skip',
      'do i need to buy anything to use it',
      'is there a free trial or is it free',
      'what is limited on the free plan',
      'Is it free to download?',
      'Is Skip free to use?',
      'Is Skip free?',
      'do i have to pay to use this app',
      'Is the app free or paid?',
      'Can I use Skip without Pro?',
      'do I need to subscribe',
      'free version any good?',
      'Will Skip charge me?',
      'is there a cost to use skip budget',
      'Can I keep using Skip for free forever?',
      'do I need pro to track my bills',
      'what happens if i never buy pro',
      'does skip begin charging after a trial period',
      'will i be charged after the first few weeks of using the app',
      'does the app turn into a paid app after a couple of weeks',
      'is skip free for the first weeks only and then paid',
      'do i have to start paying for skip after a few weeks',
      'is skip going to ask me for money later',
    ],
    answer:
      'Yes. Skip is free to download and use, and the free plan has no time limit. It covers the everyday things: your pay (as many salaries as you like), bills, subscriptions, receipts, loans and the loan calculator, savings, goals and reminders.\n\n' +
      'The free plan has a few limits:\n' +
      '- 1 credit card and 1 bank account\n' +
      '- 15 receipt scans and 15 uploads each month\n' +
      '- History shows the last 90 days. Older entries are kept, just hidden.\n\n' +
      'Skip Pro is optional, at {proMonthly} or {proYearly}, billed by Apple. It removes those limits and adds Voice entry, Insights, Spending habits and payment export, with up to 7 years of history. You can see it all in **Settings → Skip Pro**.',
    keywords: [
      'free',
      'price',
      'cost',
      'free plan',
      'pro',
      'paid',
      'subscription price',
      'trial',
      'pay',
      'freemium',
      'start charging',
    ],
    related: ['getting-started.skip.what', 'getting-started.nav.voice'],
    route: '/pro',
  },
  {
    id: 'getting-started.skip.safe',
    topic: 'getting-started',
    title: 'Is Skip safe to use?',
    questions: [
      'Is Skip safe?',
      'is my data secure',
      'Can I trust Skip with my money info?',
      'is this app legit',
      'is skip a scam',
      'Does Skip sell my data?',
      'how do you keep my information safe',
      'Is it safe to put my card in Skip?',
      'can hackers get into my bank through skip',
      'is skip private',
      'Will anyone else see my budget?',
      'security of my financial data',
    ],
    answer:
      'Yes. Skip is built to hold as little as possible. It never asks for your bank login, so there is nothing in Skip that could reach your bank.\n\n' +
      '- Skip never stores a full card number, expiry date or security code. At most, the last 4 digits if you choose to type them.\n' +
      '- Receipt photos are read on your iPhone and never uploaded. Only the store, date and total you confirm are saved.\n' +
      '- What you save is kept in your own account on our server, so you can sign in on another iPhone and find it there.\n' +
      '- Skip has no ads and does not sell your data.\n\n' +
      'For extra privacy on the phone, turn on **Settings → Preferences → App lock** to ask for Face ID before Skip opens. The full details are in **Settings → About → Privacy policy**.',
    keywords: [
      'safe',
      'secure',
      'security',
      'privacy',
      'trust',
      'legit',
      'scam',
      'ads',
      'sell data',
      'hack',
    ],
    related: [
      'getting-started.skip.bank',
      'getting-started.signin.stay',
      'getting-started.signin.terms',
    ],
    route: '/privacy',
  },
  {
    id: 'getting-started.skip.bank',
    topic: 'getting-started',
    title: 'Does Skip connect to my bank?',
    questions: [
      'Does Skip connect to my bank?',
      'how do i link my bank account',
      'Why can I not sync my bank?',
      'does skip use plaid',
      'Can Skip pull my transactions automatically?',
      'can i import my bank statement',
      'link chase to skip',
      'why do i have to type everything in',
      'Is there bank sync?',
      'does it read my bank transactions',
      'can i upload a csv from my bank',
      'Why does Skip not see my spending on its own?',
      'no bank connection why',
    ],
    answer:
      'No, and that is on purpose. Skip never asks for your bank login, so no one can reach your bank through it, and your bank never knows Skip exists.\n\n' +
      'Instead, you tell Skip what happens:\n' +
      '- Add a bill or subscription once, and Skip repeats it on its schedule.\n' +
      '- Scan or upload a receipt, or type it in.\n' +
      '- Type your card and account balances, and Skip moves them with what you record.\n\n' +
      'That also means balances do not update by themselves, and there is no way to import a bank statement. If you would like that, send it from **Settings → Support and feedback → Share an idea**.',
    keywords: [
      'bank sync',
      'plaid',
      'link bank',
      'connect bank',
      'import',
      'csv',
      'statement',
      'automatic',
    ],
    related: [
      'getting-started.skip.safe',
      'getting-started.skip.not-a-bank',
      'getting-started.skip.what',
    ],
  },
  {
    id: 'getting-started.skip.not-a-bank',
    topic: 'getting-started',
    title: 'Can Skip pay my bills or move money?',
    questions: [
      'Can Skip pay my bills?',
      'can i send money with skip',
      'Does Skip move money between my accounts?',
      'is skip a bank',
      'will skip take money out of my account',
      'Does Skip give financial advice?',
      'can i transfer money in skip',
      'will skip pay my credit card automatically',
      'Does Skip hold my money?',
      'is skip like venmo or paypal',
      'can skip help me with my taxes',
    ],
    answer:
      'No. Skip is not a bank or a payment app, so it cannot pay bills, send money, or move money between your accounts. It keeps a record of your money and does the adding up.\n\n' +
      'When a bill is due, you pay it the usual way: through your bank, your card or the company. Skip reminds you before it is due and shows it in your month.\n\n' +
      'Skip does not give financial, tax or legal advice either. Every figure comes from what you entered.',
    keywords: ['pay bills', 'transfer', 'send money', 'bank', 'advice', 'venmo', 'paypal', 'taxes'],
    related: ['getting-started.skip.bank', 'getting-started.skip.what'],
  },
  {
    id: 'getting-started.platform.android',
    topic: 'getting-started',
    title: 'Is Skip on Android?',
    questions: [
      'Is Skip on Android?',
      'android version?',
      'Can I get Skip on my Samsung?',
      'is skip on the google play store',
      'my partner has an android can they use skip',
      'Will Skip work on a Pixel?',
      'no android app?',
      'Can I use Skip on a non-Apple phone?',
      'skip for android download',
      'i switched to android how do i keep using skip',
    ],
    answer:
      'Skip is only on iPhone right now. There is no Android version.\n\n' +
      'Your things are kept in your account, not only on the phone, so nothing is lost if you are away from your iPhone for a while. Sign in on any iPhone to see them.\n\n' +
      'If you would like Skip on Android, tell us with **Share an idea** in **Settings → Support and feedback**.',
    keywords: ['android', 'google play', 'samsung', 'pixel', 'play store'],
    related: [
      'getting-started.platform.ipad',
      'getting-started.platform.web',
      'getting-started.devices.two-phones',
    ],
  },
  {
    id: 'getting-started.platform.ipad',
    topic: 'getting-started',
    title: 'Can I use Skip on my iPad?',
    questions: [
      'Can I use Skip on iPad?',
      'ipad version?',
      'Does Skip work on a tablet?',
      'is there an ipad app',
      'can i have skip on my phone and my ipad',
      'Why does Skip not turn sideways on my iPad?',
      'skip on ipad landscape',
      'Will my data show on my iPad?',
      'does skip support ipad',
      'install skip on tablet',
    ],
    answer:
      'Skip is made for iPhone, and its pages are designed around the iPhone screen. It can also run on an iPad, but it has no layout made for the bigger iPad screen.\n\nSign in on the iPad the same way you sign in on your iPhone, and your things are there, because they live in your account.',
    keywords: ['ipad', 'tablet', 'landscape', 'portrait'],
    related: [
      'getting-started.devices.two-phones',
      'getting-started.platform.web',
      'getting-started.platform.android',
    ],
  },
  {
    id: 'getting-started.platform.web',
    topic: 'getting-started',
    title: 'Is there a web or computer version?',
    questions: [
      'Is there a web version of Skip?',
      'can i use skip on my computer',
      'Is there a desktop app?',
      'skip website login',
      'Can I use Skip on my laptop?',
      'is there a windows app',
      'can i open skip in a browser',
      'Is Skip on Mac?',
      'how do i see my budget on a big screen',
      'web app?',
      'can i log in online',
    ],
    answer:
      'No. Skip is an iPhone app. There is no website to sign in to, and no version made for computers.\n\n' +
      'The closest thing: with Skip Pro you can export your payments as a spreadsheet or a PDF and open them on a computer.\n\n' +
      'If you would like Skip on a computer, send it from **Settings → Support and feedback → Share an idea**.',
    keywords: [
      'web',
      'website',
      'browser',
      'computer',
      'desktop',
      'laptop',
      'mac',
      'windows',
      'pc',
    ],
    related: [
      'getting-started.platform.ipad',
      'getting-started.platform.android',
      'getting-started.devices.two-phones',
    ],
  },
  {
    id: 'getting-started.internet.need',
    topic: 'getting-started',
    title: 'Do I need internet to use Skip?',
    questions: [
      'Do I need internet to use Skip?',
      'does skip work offline',
      'Can I use Skip without wifi?',
      'does it work on airplane mode',
      'will skip save if i have no signal',
      'Does Skip need mobile data?',
      'offline mode?',
      'can i add receipts with no connection',
      'does skip use a lot of data',
      'Why does Skip need a connection?',
      'can i use skip on a plane',
      'is a connection required to open the app',
      'will skip load my bills if i have no service',
      'what happens if i lose signal while i am using skip',
      'do i need data or wifi for skip to work',
      'can i use the app offline',
    ],
    answer:
      'Yes. Skip needs an internet connection to sign in, load your things and save changes, because everything lives in your account rather than only on the phone. Wi-Fi or mobile data both work.\n\n' +
      'Without a connection:\n' +
      '- Pages you already opened stay on screen, but new ones may not load.\n' +
      '- Saving will not work, and you will see **Something went wrong. Please try again.** Nothing is kept to save later, so try again once you are back online.\n\n' +
      'Receipt scanning reads the photo on your iPhone itself, but saving the receipt still needs a connection.',
    keywords: [
      'offline',
      'internet',
      'wifi',
      'wi-fi',
      'data',
      'airplane mode',
      'no signal',
      'connection',
    ],
    related: ['getting-started.devices.two-phones', 'getting-started.skip.safe'],
  },
  {
    id: 'getting-started.devices.two-phones',
    topic: 'getting-started',
    title: 'Can I use Skip on two phones?',
    questions: [
      'Can I use Skip on two phones?',
      'does skip sync between devices',
      'How do I get Skip on my second iPhone?',
      'will my data show on my other phone',
      'Can I be signed in on two iPhones at once?',
      'skip on work phone and personal phone',
      'does it sync',
      'is there a device limit',
      'why is my dark mode different on my other phone',
      'Do reminders come to both phones?',
      'does pro work on my other iphone',
      'multiple devices same account',
    ],
    answer:
      'Yes. Sign in on the second iPhone the same way you signed in on the first: the same Apple ID, the same Google account, or the same email and password. Everything you save lives in your account, so both phones show the same bills, cards, receipts and figures.\n\nA few things are set per phone, so set them on each one:\n- **Appearance**, **Language**, **Haptics** and **App lock** in **Settings → Preferences**\n- Stores Skip has remembered for you, and voice corrections\n\nFor reminders to reach a phone, turn on a reminder or **Monthly wrap-up** in **Settings → Preferences → Reminders** on that phone and allow notifications when asked. If you have Skip Pro, it comes with your Skip account, so it works on both.\n\nSigning out on one phone signs you out on the other too.',
    keywords: [
      'sync',
      'second phone',
      'two devices',
      'multiple devices',
      'other iphone',
      'both phones',
    ],
    related: [
      'getting-started.account.share',
      'getting-started.signin.how',
      'getting-started.internet.need',
    ],
  },
  {
    id: 'getting-started.account.share',
    topic: 'getting-started',
    title: 'Can my partner share my account?',
    questions: [
      'Can my partner use my account?',
      'can my wife and i share a budget',
      'can my husband see my budget',
      'how do i invite someone to my budget',
      'Can two people use one Skip account?',
      'joint account with my husband',
      'shared budget with roommate',
      'can i add my girlfriend to my skip',
      'Does Skip do couples budgeting?',
      'can i give my partner access',
      'family sharing skip',
    ],
    answer:
      'Skip is made for one person per account, and that is part of the **Terms of service**. There is no shared or family budget, and no way to invite someone into your account.\n\n' +
      'The closest thing: your partner can make their own free Skip account on their iPhone. For a bill you share, you can each add your own share to your own account.\n\n' +
      'If you would like shared budgets, send it from **Settings → Support and feedback → Share an idea**.',
    keywords: [
      'partner',
      'spouse',
      'family',
      'couple',
      'joint',
      'share',
      'invite',
      'roommate',
      'family sharing',
    ],
    related: [
      'getting-started.devices.two-phones',
      'getting-started.account.switch',
      'getting-started.skip.who',
    ],
  },
  {
    id: 'getting-started.skip.who-makes',
    topic: 'getting-started',
    title: 'Who makes Skip?',
    questions: [
      'Who makes Skip?',
      'who is behind this app',
      'Who owns Skip Budget?',
      'what company made skip',
      'who is the developer',
      'is skip made by a bank',
      'Who do I talk to about Skip?',
      'who runs skip',
      'what is the weknd team',
      'how do i reach the people who make skip',
      'who created skip budget',
      'whose app is this',
      'which team built skip',
      'which people made skip',
      "who is behind this app's development",
    ],
    answer:
      'Skip is made by the Weknd team. It is not made by a bank, and there are no ads in it.\n\n' +
      'To reach the team, go to **Settings → Support and feedback**:\n' +
      '- **Email support** if something is wrong or unclear\n' +
      '- **Share an idea** for something you would like Skip to do\n\n' +
      'Replies go to the email address you signed in with.',
    keywords: ['developer', 'company', 'owner', 'weknd', 'team', 'maker', 'creator'],
    related: ['getting-started.skip.what', 'getting-started.help.tour'],
    route: '/settings/support',
  },
  {
    id: 'getting-started.account.required',
    topic: 'getting-started',
    title: 'Do I need an account to use Skip?',
    questions: [
      'do I have to register first or can I look around',
      'why does skip make me sign up before I can use it',
      'Do I need an account to use Skip?',
      'can i use skip without signing up',
      'Why do I have to make an account?',
      'can i skip the login',
      'use skip as a guest',
      'is there a guest mode',
      'why does skip need my email',
      'Can I try Skip before creating an account?',
      'no account option?',
      'why is login required',
    ],
    answer:
      'Yes. Skip needs an account before you can add anything. Your things are kept in it, so they are safe if you lose or change your phone, and you can sign in on another iPhone.\n\n' +
      'Making one takes a minute: **Continue with Apple**, **Continue with Google**, or **Continue with Email**. Apple and Google do not need a password or an email code.',
    keywords: ['guest', 'without account', 'no login', 'why account'],
    related: ['getting-started.signup.ways', 'getting-started.signup.which'],
  },

  // Opening Skip and the welcome pages

  {
    id: 'getting-started.launch.splash',
    topic: 'getting-started',
    title: 'What is the animation when Skip opens?',
    questions: [
      'What is the animation when Skip opens?',
      'why does a video play every time i open the app',
      'Can I turn off the intro animation?',
      'what is the logo thing at the start',
      'opening screen video',
      'Why is the start screen white when I use dark mode?',
      'does the intro video stop my music',
      'skip the splash screen',
      'the logo animation is annoying',
      'Why is the opening screen cream colored?',
      'how long is the opening animation',
      'the start animation makes me dizzy',
    ],
    answer:
      'That is Skip opening. The Skip mark grows in, the word Skip appears, then it fades into the app. It lasts about 2 seconds, and Skip is loading underneath while it plays.\n\n' +
      '- It is silent and will not stop music or podcasts you are playing.\n' +
      '- It always sits on a light cream background, even in dark mode. The app switches to your look as soon as it opens.\n' +
      '- It only plays when Skip starts fresh, not when you switch back to Skip from another app.\n\n' +
      "There is no setting to turn it off. If **Reduce Motion** is on in your iPhone's **Settings → Accessibility → Motion**, you see the finished logo for a moment instead of the animation.",
    keywords: [
      'splash',
      'intro',
      'animation',
      'video',
      'logo',
      'launch',
      'start screen',
      'reduce motion',
    ],
    related: ['getting-started.launch.stuck', 'getting-started.welcome.page'],
  },
  {
    id: 'getting-started.launch.stuck',
    topic: 'getting-started',
    title: 'Skip is stuck on the opening logo',
    questions: [
      'the app is stuck on the logo forever',
      'app stays on the logo screen and never opens',
      'Skip is stuck on the logo',
      'app wont open past the splash screen',
      'Skip freezes on the start screen',
      'stuck on the cream screen',
      'the opening animation never ends',
      'Skip will not open',
      'app hangs at launch',
      'skip just shows the logo and nothing else',
      'blank screen when i open skip',
      'it keeps loading on the first screen',
    ],
    answer:
      'Skip does not wait on the logo for long. If the animation cannot play, Skip opens anyway after a few seconds.\n\n' +
      'If it still seems stuck:\n' +
      '1. Swipe up from the bottom of the screen and pause to see your open apps.\n' +
      '2. Swipe Skip up and off the screen to close it.\n' +
      '3. Open Skip again.\n\n' +
      'If it happens every time, restart your iPhone and check the App Store for a Skip update. If it still will not open, write to admin@skipapps.net so we can look into it.',
    keywords: ['logo screen', 'stuck', 'frozen', 'splash', 'wont open', 'launch', 'blank screen'],
    related: ['getting-started.launch.splash', 'getting-started.internet.need'],
  },
  {
    id: 'getting-started.welcome.page',
    topic: 'getting-started',
    title: 'What is on the Welcome screen?',
    questions: [
      'What is on the Welcome screen?',
      'what do i tap first',
      'How do I start using Skip?',
      'the first page says your money your privacy what now',
      'Get started or Log in, which one?',
      'what does get started do',
      'first time opening skip',
      'I am new, where do I begin?',
      'what is the welcome page',
      'which button do i press if im new',
      'just installed skip what do i press',
    ],
    answer:
      'The Welcome screen is the first page you see before you sign in. It shows the Skip mark, **Your money, your privacy.** and a reminder that Skip never needs your bank login.\n\n' +
      'At the bottom there are two choices:\n' +
      '- **Get started** if you are new. It shows two short pages about Skip, then you create your account.\n' +
      '- **Already have an account? Log in** if you have used Skip before.\n\n' +
      'Once you are signed in, Skip opens straight on **Home**, and you will not see this page again unless you sign out.',
    keywords: ['welcome', 'get started', 'first screen', 'start', 'begin', 'new user'],
    related: [
      'getting-started.welcome.why',
      'getting-started.signup.ways',
      'getting-started.signin.how',
    ],
  },
  {
    id: 'getting-started.welcome.why',
    topic: 'getting-started',
    title: 'What is the Why Skip page?',
    questions: [
      "what's on the second welcome screen",
      'What is the Why Skip page?',
      'what does awareness privacy control mean',
      'understand your money dont just automate it meaning',
      'what is the page after get started',
      'Why Skip page explained',
      'what does the ledger quote mean',
      'what are the three things on the why skip screen',
      'What does You decide, not an algorithm mean?',
      'the page with the quote about pennies',
      'what is skip trying to say on that page',
    ],
    answer:
      '**Why Skip** is the page right after **Get started**. It explains the idea behind Skip: **Understand your money. Don’t just automate it.**\n\n' +
      'It has three parts:\n' +
      '- **Awareness**: Every dollar, accounted for.\n' +
      '- **Privacy**: No bank logins. Ever.\n' +
      '- **Control**: You decide, not an algorithm.\n\n' +
      'People once wrote every penny in a ledger. Skip brings that habit back without the paperwork. Tap **Continue** at the bottom to see **What Skip can do**.',
    keywords: ['why skip', 'awareness', 'privacy', 'control', 'ledger', 'algorithm'],
    related: [
      'getting-started.welcome.can-do',
      'getting-started.welcome.stuck',
      'getting-started.welcome.page',
    ],
  },
  {
    id: 'getting-started.welcome.can-do',
    topic: 'getting-started',
    title: 'What does What Skip can do show?',
    questions: [
      'the intro page right before sign up',
      'What does What Skip can do show?',
      'what are the five things skip can do',
      'the page with lets go button',
      'What does Accurate loan tracking mean?',
      'what does clear automatic savings mean',
      'tapping the features list does nothing',
      'Why can I not tap the rows on What Skip can do?',
      'what skip can do page explained',
      'is the list on the intro all the features',
      'what happens when i press lets go',
    ],
    answer:
      '**What Skip can do** is the last page before you create your account. It lists five things:\n\n' +
      '- **No bank connection needed**: your bank details always stay private.\n' +
      '- **Scan receipts instantly**: read on your phone, never uploaded.\n' +
      '- **Accurate loan tracking**: daily interest, just like your bank.\n' +
      '- **Clear, automatic savings**: what is left over is saved, with the maths shown.\n' +
      '- **Reminders before it’s due**: bills, renewals and payday, ahead of time.\n\n' +
      "The rows are just to read, so tapping them does nothing. Tap **Let's go** to choose how you sign up.",
    keywords: ['what skip can do', 'features', "let's go", 'lets go', 'intro'],
    related: [
      'getting-started.welcome.why',
      'getting-started.signup.ways',
      'getting-started.skip.what',
    ],
  },
  {
    id: 'getting-started.welcome.stuck',
    topic: 'getting-started',
    title: "I can't find the button to go on",
    questions: [
      'I cannot find the button to continue',
      'where is the continue button',
      'stuck on the why skip page',
      'how do i get to the next page',
      'the page will not move on',
      'no next button on the intro',
      "Text is too big and I cannot see Let's go",
      'how do i get past the intro pages',
      'the words are cut off at the bottom',
      'where is the button on the welcome page',
    ],
    answer:
      'The button to move on is always pinned at the bottom of the screen, even when the page is taller than your screen:\n\n' +
      '- **Welcome**: **Get started**\n' +
      '- **Why Skip**: **Continue**\n' +
      "- **What Skip can do**: **Let's go**\n\n" +
      'If you use larger text, part of the page may sit under the button. Swipe up on the page to read the rest. The button stays where it is.',
    keywords: ['stuck', 'continue', 'next', 'button', 'large text', 'cut off'],
    related: [
      'getting-started.welcome.why',
      'getting-started.welcome.can-do',
      'getting-started.welcome.back',
    ],
  },
  {
    id: 'getting-started.welcome.back',
    topic: 'getting-started',
    title: 'How do I go back in the welcome pages?',
    questions: [
      'How do I go back to the previous welcome page?',
      'can i see the intro pages again',
      'I want to read the Why Skip page again',
      'how do i get back to the welcome screen',
      'swipe back does not go to the welcome pages',
      'where did the intro go after i signed up',
      'can i replay the onboarding',
      'go back from set up your login',
      'how to return to the start screen',
      "I tapped Let's go too fast, can I go back?",
    ],
    answer:
      'Before you sign in, you can move back and forth freely. Tap the back arrow at the top left, or swipe right from the left edge of the screen.\n\n' +
      'Once you are signed in, the welcome pages are closed behind you on purpose, so a swipe cannot take you out of the app by mistake. They only show again after you sign out (**Settings → Sign out**, under **Account**).',
    keywords: ['back', 'intro again', 'onboarding', 'welcome pages', 'replay'],
    related: [
      'getting-started.welcome.page',
      'getting-started.nav.back',
      'getting-started.signout.how',
    ],
  },

  // Creating an account

  {
    id: 'getting-started.signup.ways',
    topic: 'getting-started',
    title: 'How do I create an account?',
    questions: [
      'How do I create an account?',
      'how do i sign up',
      'make a new skip account',
      'How do I register?',
      'what are the ways to sign up',
      'Where do I sign up for Skip?',
      'create account steps',
      'how to get started with an account',
      'what is set up your login',
      'Set up your login page, what do I pick?',
      'new user sign up',
      'how long does it take to make an account',
    ],
    answer:
      '1. On the Welcome screen, tap **Get started**.\n' +
      "2. Tap **Continue**, then **Let's go**.\n" +
      '3. On **Set up your login**, tap **Continue with Google**, **Continue with Apple**, or **Continue with Email**.\n\n' +
      'With Apple or Google, you are in straight away. With email, you type your email and a password, then the 6-digit code we email you.\n\n' +
      'Next, Skip asks what to call you, then shows **Let’s set up Skip** to get you going.',
    keywords: ['sign up', 'register', 'create account', 'new account', 'set up your login'],
    related: [
      'getting-started.signup.which',
      'getting-started.signup.email',
      'getting-started.hello.name',
    ],
  },
  {
    id: 'getting-started.signup.which',
    topic: 'getting-started',
    title: 'Apple, Google or email: which should I use?',
    questions: [
      'is apple sign in or email sign in better',
      'Should I sign up with Apple, Google or email?',
      'which sign in option is best',
      'what is the difference between apple and email sign up',
      'Is it better to use Google or email?',
      'which login should i choose',
      'apple vs google sign in',
      'does it matter how i sign up',
      'which way is safest to log in',
      'continue with apple or continue with email',
      'Can I change how I sign in later?',
    ],
    answer:
      'Any of them works, and they all give you the same Skip. Pick the one you are least likely to lose:\n\n' +
      '- **Continue with Apple**: quickest on iPhone. No password, confirmed with Face ID or your passcode, and you can hide your email from Skip.\n' +
      '- **Continue with Google**: handy if you use Gmail. No Skip password to remember.\n' +
      '- **Continue with Email**: works with any email. You make a password of at least 6 characters and confirm the address with a 6-digit code.\n\n' +
      'The important part: use the same way every time. Signing in a different way can open a separate, empty account, and there is no setting to switch methods later.',
    keywords: ['apple', 'google', 'email', 'best', 'which', 'difference', 'sign in method'],
    related: [
      'getting-started.signup.apple',
      'getting-started.signup.google',
      'getting-started.signup.email',
      'getting-started.signin.empty-account',
    ],
  },
  {
    id: 'getting-started.signup.email',
    topic: 'getting-started',
    title: 'How do I sign up with my email?',
    questions: [
      'sign up using only an email address, no apple or google',
      'How do I sign up with my email?',
      'continue with email steps',
      'create account with email and password',
      'Where is the email sign up?',
      'i dont want to use apple or google',
      'how does create your account work',
      'sign up without apple id',
      'Can I use my work email?',
      'email signup',
      'can i use a hotmail or yahoo address',
    ],
    answer:
      '1. On **Set up your login**, tap **Continue with Email** under the Apple and Google buttons.\n' +
      '2. Type your **Email**, a **Password**, and the same password again in **Confirm password**.\n' +
      '3. Tap **Create account**.\n' +
      '4. Check your inbox for a 6-digit code and type it on **Enter the code**. Skip checks it as soon as the sixth digit is in.\n\n' +
      'Any email address you can open works. Your password needs at least 6 characters. If you already have an account, tap **I already have an account** instead.',
    keywords: [
      'email sign up',
      'continue with email',
      'create account',
      'password',
      'gmail',
      'outlook',
    ],
    related: [
      'getting-started.code.what',
      'getting-started.password.rules',
      'getting-started.signup.email-taken',
    ],
  },
  {
    id: 'getting-started.signup.apple',
    topic: 'getting-started',
    title: 'How does Continue with Apple work?',
    questions: [
      'How does Continue with Apple work?',
      'sign in with apple id',
      'What is Hide My Email?',
      'should i hide my email with apple',
      'does apple give skip my email',
      'Why is my email a weird privaterelay address?',
      'log in with apple',
      'sign up using face id',
      'does apple sign in need a password',
      'what does skip get from my apple id',
      'Apple sign in, first time',
    ],
    answer:
      '**Continue with Apple** uses the Apple ID on your iPhone, so there is no Skip password and no email code.\n\n' +
      '1. Tap **Continue with Apple** on **Set up your login** or **Log in**.\n' +
      '2. Confirm with Face ID or your passcode.\n' +
      '3. The first time, Apple lets you share your email or choose **Hide My Email**. Hide My Email gives Skip a private address ending in privaterelay.appleid.com that forwards to you.\n\n' +
      'It works for new and returning people: the same Apple ID always opens the same Skip account. Apple does not pass your name to Skip, so Skip asks what to call you next.',
    keywords: [
      'apple',
      'apple id',
      'sign in with apple',
      'hide my email',
      'privaterelay',
      'face id',
    ],
    related: [
      'getting-started.signin.social-error',
      'getting-started.signup.which',
      'getting-started.account.which-email',
    ],
  },
  {
    id: 'getting-started.signup.google',
    topic: 'getting-started',
    title: 'How does Continue with Google work?',
    questions: [
      'How does Continue with Google work?',
      'sign in with gmail',
      'log in with my google account',
      'Why does it say Opening Google?',
      'it asks to use google.com to sign in, is that ok',
      'sign up with google',
      'use my gmail for skip',
      'does google sign in need a password',
      'pick a different google account',
      'What does Skip get from Google?',
    ],
    answer:
      '**Continue with Google** signs you in with your Google account, so there is no Skip password and no email code.\n\n' +
      '1. Tap **Continue with Google**. It says **Opening Google…** while it starts.\n' +
      '2. Your iPhone may ask to let Skip Budget use google.com to sign in. Tap **Continue**.\n' +
      '3. Pick your Google account, or sign in to Google.\n\n' +
      'The same Google account always opens the same Skip account, so pick the same one each time. If you close the Google window, nothing changes and you can try again.',
    keywords: ['google', 'gmail', 'sign in with google', 'opening google'],
    related: [
      'getting-started.signin.social-error',
      'getting-started.signup.which',
      'getting-started.signin.empty-account',
    ],
  },
  {
    id: 'getting-started.signup.other-methods',
    topic: 'getting-started',
    title: 'Can I sign in with my phone number?',
    questions: [
      'Can I sign in with my phone number?',
      'log in with facebook',
      'Is there a Microsoft sign in?',
      'sign up with sms',
      'can i use a text code instead of email',
      'other ways to log in',
      'sign in with instagram',
      'no phone number login?',
      'can i log in with a magic link',
      'Can I use a passkey?',
    ],
    answer:
      'No. Skip has three ways to sign in: **Continue with Apple**, **Continue with Google**, and **Continue with Email** (email and password). There is no sign-in by phone number, text message, Facebook, Microsoft or another service.\n\n' +
      'If you would like another way, send it from **Settings → Support and feedback → Share an idea**.',
    keywords: [
      'phone number',
      'sms',
      'facebook',
      'microsoft',
      'passkey',
      'magic link',
      'text code',
    ],
    related: ['getting-started.signup.which', 'getting-started.signup.ways'],
  },
  {
    id: 'getting-started.signup.email-taken',
    topic: 'getting-started',
    title: 'It says that email already has an account',
    questions: [
      'It says that email already has an account',
      'email already registered',
      'why cant i sign up with my email',
      'That email already has an account, but I never signed up',
      'sign up says email is taken',
      'i made an account before and forgot',
      'cant create account email in use',
      'email exists error',
      'how do i use an email that already has an account',
      'already have an account message',
    ],
    answer:
      '**That email already has an account.** means a Skip account already uses that email, most likely from an earlier sign-up. Each email can have only one Skip account.\n\n' +
      '1. Tap **I already have an account**.\n' +
      '2. Log in with your password.\n' +
      '3. If you do not remember it, tap **Forgot password?** on the **Log in** page.\n\n' +
      'If you first used Apple or Google with this email, tap that button on **Log in** instead.',
    keywords: ['email taken', 'already registered', 'existing account', 'email in use'],
    related: [
      'getting-started.signin.how',
      'getting-started.password.forgot',
      'getting-started.code.later',
    ],
  },
  {
    id: 'getting-started.signup.bad-email',
    topic: 'getting-started',
    title: "It says my email doesn't look right",
    questions: [
      'It says my email does not look right',
      'that email address does not look right',
      'skip wont accept my email',
      'invalid email error',
      'why is my email address rejected',
      'my email is correct but it says its wrong',
      'email not valid sign up',
      'error on the email box',
      'email format wrong',
      'cant type my email in',
    ],
    answer:
      '**That email address does not look right.** means the address has a typo or a missing part. Check for:\n\n' +
      '- An @ and a dot, like name@example.com\n' +
      '- A space inside the address\n' +
      '- A comma where a dot should be\n\n' +
      'Fix it and tap the button again. If your email is right and it still is not accepted, try **Continue with Apple** or **Continue with Google** instead.',
    keywords: ['invalid email', 'email error', 'typo', 'email format'],
    related: ['getting-started.signup.email', 'getting-started.signup.which'],
  },
  {
    id: 'getting-started.signup.missing-fields',
    topic: 'getting-started',
    title: 'It says to enter my email and password',
    questions: [
      'It says enter your email and password',
      'enter an email and password error',
      'Enter the email on your account, what does that mean?',
      'why does it say enter your email when i did',
      'login button says enter email and password',
      'error when i tap create account',
      'nothing happens when i tap log in',
      'forgot password says enter the email',
      'it keeps asking for my email',
      'empty field error on sign in',
    ],
    answer:
      'This shows when a box is empty. Skip needs every box filled before it can go on:\n\n' +
      '- **Enter your email and password.** on **Log in**\n' +
      '- **Enter an email and password.** on **Create your account**\n' +
      '- **Enter the email on your account.** on **Forgot password?**\n\n' +
      'Tap each box and fill it in, then tap the button again. If your iPhone filled in a saved password, check the **Email** box was filled too.',
    keywords: ['empty', 'missing', 'enter email', 'blank field'],
    related: [
      'getting-started.signin.how',
      'getting-started.signup.email',
      'getting-started.password.forgot',
    ],
  },

  // Email codes

  {
    id: 'getting-started.code.what',
    topic: 'getting-started',
    title: 'What is the 6-digit code for?',
    questions: [
      'What is the 6-digit code for?',
      'why do i need a verification code',
      'Where do I enter the code?',
      'what is the enter the code page',
      'how do i verify my email',
      'can i paste the code',
      'Does the code fill in automatically?',
      'it says enter all 6 digits',
      'confirm my email skip',
      'otp code meaning',
      'do i have to verify my account',
      'what is the number in the email skip sent me for',
      'what do i do with the number in the email',
      'skip emailed me a number, where do i type it',
      'the email has a number in it, what is it for',
      'what do i enter from the email skip sent me',
      'skip emailed me digits, what are they for',
    ],
    answer:
      'When you sign up with email, Skip sends a 6-digit code to that address. Typing it on **Enter the code** proves the email is yours, which keeps your account safe and lets you reset your password later.\n\n' +
      '- Type or paste the code. Your iPhone may also offer it above the keyboard.\n' +
      '- Skip checks it as soon as all 6 digits are in, or tap **Continue**.\n' +
      '- **Enter all 6 digits.** means a digit is missing.\n' +
      '- The same kind of code is sent when you use **Forgot password?**.\n\n' +
      'Apple and Google sign-in do not need a code.',
    keywords: ['code', 'otp', 'verification', 'verify', '6 digit', 'six digit', 'enter the code'],
    related: [
      'getting-started.code.missing',
      'getting-started.code.wrong',
      'getting-started.code.later',
    ],
  },
  {
    id: 'getting-started.code.missing',
    topic: 'getting-started',
    title: "I didn't get the email code",
    questions: [
      'I did not get the email code',
      'no verification email',
      'the code never came',
      'Where is my code?',
      'skip email not arriving',
      'how do i resend the code',
      'still waiting for the 6 digit code',
      'check spam for skip code',
      'i typed my email wrong on sign up',
      'reset password code not received',
      'nothing in my inbox from skip',
      'resend code not working',
      'the email never came, no code',
      'i got no email with a verification code',
      'the verification email has not arrived',
      'i did not receive the code in my email',
      'the code never came to my inbox',
    ],
    answer:
      'If the code has not arrived:\n\n' +
      '1. Check your spam or junk folder. Emails from new apps sometimes land there.\n' +
      '2. Check the address shown on **Enter the code**. If it has a typo, tap the back arrow and fix it.\n' +
      '3. Tap **Resend code** to get a fresh code, and use the code from the newest email.\n' +
      '4. Give it a minute between tries, so you do not hit the limit.\n\n' +
      'For **Forgot password?**, a code only arrives if that email has a Skip account. If you signed up with Apple or Google, use that button on **Log in** instead.',
    keywords: ['no code', 'resend code', 'spam', 'junk', 'not received', 'email not arriving'],
    related: [
      'getting-started.code.what',
      'getting-started.code.too-many',
      'getting-started.password.forgot-social',
    ],
  },
  {
    id: 'getting-started.code.wrong',
    topic: 'getting-started',
    title: 'It says my code is not right',
    questions: [
      'It says my code is not right',
      'that code is not right check it and try again',
      'verification code wrong',
      'code not working',
      'Why is my code rejected?',
      'i typed the code exactly but it fails',
      'invalid code skip',
      'the code from my email does not work',
      'wrong otp',
      'how do i clear the code boxes',
    ],
    answer:
      '**That code is not right. Check it and try again.** means the digits do not match the latest code we sent.\n\n' +
      '- Use the code from the newest email from Skip. If you asked for a new code, older codes may no longer work.\n' +
      '- Make sure the code was sent to the same email shown on the page.\n' +
      '- To fix a digit, delete back to it and type again.\n\n' +
      'If it keeps failing, tap **Resend code** and use the new code.',
    keywords: ['wrong code', 'invalid code', 'code not working', 'otp'],
    related: [
      'getting-started.code.expired',
      'getting-started.code.missing',
      'getting-started.code.too-many',
    ],
  },
  {
    id: 'getting-started.code.expired',
    topic: 'getting-started',
    title: 'It says my code has expired',
    questions: [
      'It says my code has expired',
      'that code has expired send a new one',
      'code expired',
      'how long does the code last',
      'Why did my code expire?',
      'old code not working',
      'i waited too long to enter the code',
      'expired verification code',
      'code timed out',
      'does the code run out',
    ],
    answer:
      '**That code has expired. Send a new one.** means the code is too old to use. Codes only last a limited time, to keep your account safe.\n\n' +
      'Tap **Resend code** on the same page, then type the code from the newest email. If it is not in your inbox, check your spam folder too.',
    keywords: ['expired', 'code expired', 'timed out', 'old code'],
    related: ['getting-started.code.wrong', 'getting-started.code.missing'],
  },
  {
    id: 'getting-started.code.too-many',
    topic: 'getting-started',
    title: 'It says too many attempts',
    questions: [
      'It says too many attempts',
      'too many attempts wait a minute and try again',
      'locked out after too many tries',
      'why am i blocked from logging in',
      'rate limit error',
      'Can I try again now?',
      'i pressed resend too many times',
      'how long do i have to wait to log in',
      'too many requests skip',
      'it wont let me try my password again',
    ],
    answer:
      '**Too many attempts. Wait a minute and try again.** means there were several tries in a short time, so Skip pauses for a moment to keep your account safe. It can show when logging in, sending a code, or entering a code.\n\n' +
      'Wait a minute or two, then try once more. Avoid asking for a new code many times in a row: each request counts, and only the newest code is the one to use.',
    keywords: ['too many attempts', 'rate limit', 'locked out', 'blocked', 'wait'],
    related: ['getting-started.code.missing', 'getting-started.signin.wrong-password'],
  },
  {
    id: 'getting-started.code.later',
    topic: 'getting-started',
    title: 'I never entered my code, what now?',
    questions: [
      'I never entered my code, what now?',
      'i closed the app before verifying',
      'how do i finish signing up',
      'my account is not confirmed',
      'Can I verify my email later?',
      'i left during sign up',
      'unverified account log in',
      'log in sends me a code again',
      'why does log in ask for a code',
      'half finished sign up',
    ],
    answer:
      'No problem. Your account is just waiting to be confirmed.\n\n' +
      '1. Open Skip and tap **Already have an account? Log in**.\n' +
      '2. Type the email and password you signed up with and tap **Log in**.\n' +
      '3. Skip sends a fresh code and opens **Enter the code**.\n' +
      '4. Type the new code and you are in.\n\n' +
      'This is also why logging in can ask for a code: it means the email was never confirmed. If you have forgotten the password too, tap **Forgot password?** on **Log in**.',
    keywords: ['unverified', 'not confirmed', 'finish sign up', 'verify later'],
    related: [
      'getting-started.code.what',
      'getting-started.signin.how',
      'getting-started.password.forgot',
    ],
  },

  // Passwords

  {
    id: 'getting-started.password.rules',
    topic: 'getting-started',
    title: 'What are the password rules?',
    questions: [
      'What are the password rules?',
      'how long does my password need to be',
      'password must be at least 6 characters',
      'Does my password need a number or symbol?',
      'password requirements',
      'minimum password length',
      'why is my password too short',
      'Do Apple and Google accounts have a Skip password?',
      'can my password have spaces',
      'what makes a good skip password',
      'is the password case sensitive',
    ],
    answer:
      'Your Skip password needs at least 6 characters. Letters, numbers and symbols all work, capital letters count as different from small ones, and longer is safer.\n\n' +
      'If it is shorter, you will see **Password must be at least 6 characters.** You type it twice (**Password** and **Confirm password**), so a typo cannot lock you out.\n\n' +
      'Only email accounts have a Skip password. **Continue with Apple** and **Continue with Google** do not use one.',
    keywords: ['password', 'length', 'characters', 'requirements', 'too short', 'strong password'],
    related: [
      'getting-started.password.mismatch',
      'getting-started.password.forgot',
      'getting-started.password.reset-error',
    ],
  },
  {
    id: 'getting-started.password.mismatch',
    topic: 'getting-started',
    title: 'It says the passwords do not match',
    questions: [
      'It says the passwords do not match',
      'those passwords do not match',
      'confirm password error',
      'passwords dont match but they do',
      'why do my two passwords not match',
      'what is confirm password for',
      'confirm new password does not match',
      'mismatch error sign up',
      'i typed the same password twice',
      'password and confirm password different',
    ],
    answer:
      '**Those passwords do not match.** means the two password boxes are not exactly the same. A capital letter or an extra space counts as different.\n\n' +
      'Clear both boxes and type the password again in each (**Password** and **Confirm password**, or **New password** and **Confirm new password**), then tap the button again.',
    keywords: ['passwords do not match', 'confirm password', 'mismatch'],
    related: ['getting-started.password.rules', 'getting-started.password.forgot'],
  },
  {
    id: 'getting-started.password.forgot',
    topic: 'getting-started',
    title: 'I forgot my password',
    questions: [
      'I forgot my password',
      'reset my password',
      'How do I recover my account?',
      'cant remember my skip password',
      'forgot password steps',
      'where is forgot password',
      'locked out of my account',
      'how do i get back in without my password',
      'Set a new password page',
      'password reset email',
      'lost password',
      'will i lose my data if i reset my password',
    ],
    answer:
      'You can set a new one in a couple of minutes:\n\n' +
      '1. On the Welcome screen, tap **Already have an account? Log in**.\n' +
      '2. Tap **Forgot password?** under the password box.\n' +
      '3. Type the email on your account and tap **Continue**.\n' +
      '4. Type the 6-digit code we email you on **Enter the code**.\n' +
      '5. On **Set a new password**, type a new password twice and tap **Continue**.\n\n' +
      'You are signed in and taken to **Home**, with all your things still there. Next time, log in with the new password.',
    keywords: ['forgot password', 'reset password', 'recover', 'locked out', 'lost password'],
    related: [
      'getting-started.password.forgot-social',
      'getting-started.code.missing',
      'getting-started.password.reset-error',
    ],
  },
  {
    id: 'getting-started.password.forgot-social',
    topic: 'getting-started',
    title: "I used Apple or Google, what's my password?",
    questions: [
      'I use google sign in, is there a skip password',
      'I signed up with Apple, what is my password?',
      'what is my password if i used google',
      'i dont know which way i signed up',
      'Forgot password but I used Apple',
      'no password for apple sign in',
      'how do i log in if i signed up with google',
      'cant remember if i used email or apple',
      'which login did i use',
      'reset password for google account',
      'skip password for apple id',
    ],
    answer:
      'There is no Skip password in that case. When you sign up with **Continue with Apple** or **Continue with Google**, Apple or Google confirms it is you, so Skip never sets a password.\n\n' +
      'To sign in, tap the same button again on **Log in**. If you are not sure which one you used, try one: the right one opens your account with all your things. If you land in an empty account instead, go to **Settings**, tap **Sign out** (under **Account**), and try the other way.',
    keywords: ['apple password', 'google password', 'which login', 'forgot method'],
    related: [
      'getting-started.signin.empty-account',
      'getting-started.signup.which',
      'getting-started.password.forgot',
    ],
  },
  {
    id: 'getting-started.password.change',
    topic: 'getting-started',
    title: 'How do I change my password?',
    questions: [
      'change my password when I still know the current one',
      'How do I change my password?',
      'change password in settings',
      'where is the password setting',
      'update my skip password',
      'I want a new password but I remember the old one',
      'new password while logged in',
      'can i change my password inside the app',
      'how to set a different password',
      'password change option missing',
      'my password was leaked how do i change it',
    ],
    answer:
      'There is no password setting inside Skip, but you can set a new one with **Forgot password?**:\n\n1. Go to **Settings** and tap **Sign out** (under **Account**). This signs you out on your other phones too.\n2. On the Welcome screen, tap **Already have an account? Log in**.\n3. Tap **Forgot password?**, type your email, and tap **Continue**.\n4. Type the 6-digit code from your email.\n5. Type your new password twice and tap **Continue**.\n\nYou are signed back in with everything where you left it. Pick a password you have not used for Skip before. If you sign in with Apple or Google, there is no Skip password to change.',
    keywords: ['change password', 'new password', 'update password', 'password setting'],
    related: [
      'getting-started.password.forgot',
      'getting-started.signout.how',
      'getting-started.password.reset-error',
    ],
    route: '/settings',
  },
  {
    id: 'getting-started.password.reset-error',
    topic: 'getting-started',
    title: 'It says 6 characters but my password is longer',
    questions: [
      'It says at least 6 characters but my password is longer',
      'set a new password keeps saying too short',
      'new password rejected',
      'why will skip not take my new password',
      'can i reuse my old password',
      'password must be at least 6 characters but it is 10',
      'reset password error even with long password',
      'cant save new password',
      'same password as before',
      'new password not accepted',
    ],
    answer:
      'This can happen on **Set a new password** when the new password is the same as your old one. Skip does not accept your old password again, and in that case it shows **Password must be at least 6 characters.**\n\n' +
      'Type a password you have not used for Skip before, at least 6 characters, in both boxes, and tap **Continue**.',
    keywords: ['too short', 'same password', 'old password', 'reuse', 'reset error'],
    related: ['getting-started.password.rules', 'getting-started.password.forgot'],
  },

  // Signing in and out

  {
    id: 'getting-started.signin.how',
    topic: 'getting-started',
    title: 'How do I log in?',
    questions: [
      'How do I log in?',
      'where is the login',
      'I already have an account, where do I sign in?',
      'log in to skip',
      'how to sign in on a new phone',
      'i tapped get started but i have an account',
      'sign in page',
      'how do i get back into my account',
      'login with email and password',
      'where do returning users go',
      'I reinstalled Skip, how do I sign in?',
    ],
    answer:
      '1. On the Welcome screen, tap **Already have an account? Log in**.\n' +
      '2. Type your **Email** and **Password**, then tap **Log in**.\n\n' +
      'If you signed up with Apple or Google, tap **Continue with Apple** or **Continue with Google** lower on the same page instead.\n\n' +
      'Tapped **Get started** by mistake? You can still get in: the Apple and Google buttons on **Set up your login** open your existing account, and **Create your account** has **I already have an account**.',
    keywords: ['log in', 'sign in', 'login', 'returning', 'existing account'],
    related: [
      'getting-started.signin.wrong-password',
      'getting-started.password.forgot',
      'getting-started.signin.stay',
    ],
  },
  {
    id: 'getting-started.signin.wrong-password',
    topic: 'getting-started',
    title: "It says my email and password don't match",
    questions: [
      'It says my email and password do not match',
      'that email and password do not match',
      'wrong password error',
      'cant log in my password is right',
      'login keeps failing',
      'incorrect email or password',
      'Why will Skip not let me log in?',
      'my login is not working',
      'invalid login',
      'i know my password but it says no',
      'login says my password is incorrect',
      'i get an error saying my email and password are wrong',
      'error when signing in, wrong password',
      'i typed my password right but the login error says it does not match',
      'skip will not accept my password when i log in',
    ],
    answer:
      '**That email and password do not match.** means Skip could not find an account with that exact email and password.\n\n' +
      '- Check the email for a typo, and that it is the one you signed up with.\n' +
      '- Passwords care about capital letters. Check for a capital you did not mean, or a space.\n' +
      '- If you signed up with Apple or Google, you do not have a Skip password. Use that button instead.\n' +
      '- Still stuck? Tap **Forgot password?** to set a new one.\n\n' +
      'After several tries in a row, Skip may ask you to wait a minute.',
    keywords: ['wrong password', 'login failed', 'incorrect', 'do not match', "can't log in"],
    related: [
      'getting-started.password.forgot',
      'getting-started.password.forgot-social',
      'getting-started.code.too-many',
    ],
  },
  {
    id: 'getting-started.signin.social-error',
    topic: 'getting-started',
    title: "Apple or Google sign-in isn't working",
    questions: [
      'Sign in with Apple is not working',
      'continue with google does nothing',
      'Sign in to an Apple ID on this device first, what does that mean?',
      'sign in with apple is not available on this device',
      'apple login error',
      'google sign in fails',
      'nothing happens after i choose my google account',
      'i closed the apple window by mistake',
      'error after face id on apple sign in',
      'google sign in something went wrong',
      'apple sign in keeps failing',
      'i tap sign in with apple and nothing happens',
      'i cannot get past apple login, it just sits there',
      'continue with apple does nothing for me',
      'the google sign in button is not working',
      'apple sign in freezes on my phone',
      'apple button does not respond on the login page',
    ],
    answer:
      'It depends on what you see:\n\n' +
      "- **Sign in to an Apple ID on this device first, then try again.**: open the iPhone's Settings app, sign in to your Apple ID at the top, then try again.\n" +
      '- **Sign in with Apple is not available on this device.**: use **Continue with Google** or **Continue with Email** instead.\n' +
      '- **Something went wrong. Please try again.**: check your internet connection and try once more.\n' +
      '- Nothing happens: if you closed the Apple or Google window, Skip just waits. Tap the button again.\n\n' +
      'If it still fails, try the other sign-in way only if you are new. If you already have an account, keep using the way you signed up, so you do not end up in a second account.',
    keywords: ['apple error', 'google error', 'apple id', 'sign in failed', 'not available'],
    related: [
      'getting-started.signup.apple',
      'getting-started.signup.google',
      'getting-started.internet.need',
    ],
  },
  {
    id: 'getting-started.signin.stay',
    topic: 'getting-started',
    title: 'Do I have to log in every time?',
    questions: [
      'Do I have to log in every time?',
      'does skip keep me signed in',
      'why did skip log me out',
      'will i stay logged in after closing the app',
      'how long does my login last',
      'Can I make Skip ask for Face ID when it opens?',
      'stay signed in',
      'remember me option',
      'skip asked me to sign in again',
      'do i need to sign in after restarting my phone',
      'the app logged me out',
      'skip signed me out by itself',
      'do i have to type my password each time i open skip',
      'does skip ask for my email and password on every launch',
      'will i need to enter my login again next time i open it',
      'does the app remember me when i reopen it',
      'is my password remembered when i reopen the app',
    ],
    answer:
      'No. Once you are signed in, Skip keeps you signed in on that iPhone, even after you close the app or restart the phone. You only sign in again if you tap **Sign out**, delete and reinstall Skip, or move to another phone.\n\n' +
      'If you would like Skip locked when it opens, turn on **Settings → Preferences → App lock**. It asks for Face ID, Touch ID or your passcode before Skip opens.',
    keywords: ['stay signed in', 'remember me', 'logged out', 'session', 'face id', 'app lock'],
    related: [
      'getting-started.signout.how',
      'getting-started.skip.safe',
      'getting-started.signin.how',
    ],
  },
  {
    id: 'getting-started.signin.empty-account',
    topic: 'getting-started',
    title: 'I signed in and all my stuff is gone',
    questions: [
      'I signed in and all my stuff is gone',
      'my data disappeared after logging in',
      'everything is empty after i signed in',
      "Why does Skip show Let's set up Skip when I already set it up?",
      'i have two accounts by mistake',
      'logged in and my bills are missing',
      'where did all my receipts go after login',
      'new phone and skip is empty',
      'did skip delete my data',
      'signed in with apple and its a blank account',
      'my old entries are gone',
    ],
    answer:
      'Do not worry. This almost always means you are in a different, new account, not that anything was deleted. It happens when you sign in a different way from last time, like Apple instead of email, or another email address.\n\n' +
      'To get back to your things:\n' +
      '1. Go to **Settings** and tap **Sign out** (under **Account**).\n' +
      '2. Sign in the way you used first, with the same email, Apple ID or Google account.\n\n' +
      "If you used Apple with **Hide My Email**, your account uses Apple's private address, so sign in with **Continue with Apple**. If only entries older than 90 days are missing, that is the free plan hiding them. They are kept, and Skip Pro shows them again.",
    keywords: [
      'data gone',
      'empty account',
      'missing data',
      'second account',
      'wrong account',
      'disappeared',
    ],
    related: [
      'getting-started.password.forgot-social',
      'getting-started.account.which-email',
      'getting-started.setup.again',
    ],
  },
  {
    id: 'getting-started.signout.how',
    topic: 'getting-started',
    title: 'How do I sign out?',
    questions: [
      'How do I sign out?',
      'log out of skip',
      'where is the logout button',
      'Does signing out delete my data?',
      'what happens when i sign out',
      'sign out of my account',
      'logout',
      'will i lose anything if i log out',
      'Does Skip ask before signing me out?',
      'how to log off',
      'signed out by accident',
    ],
    answer:
      'Go to **Settings**, scroll to **Account**, and tap **Sign out**. Skip signs you out straight away, with no extra question, and goes back to the Welcome screen.\n\nSigning out does not delete anything. Your things stay in your account, ready when you sign back in. It also:\n- Signs you out on any other phone where you use Skip, so you’ll sign in again there too\n- Stops Skip reminders arriving on this phone until you sign in again\n- Forgets a few things kept only on this phone, like stores Skip remembered for you, voice corrections and recent searches\n\nRemoving your account for good is **Delete account**, just below. It asks twice and cannot be undone.',
    keywords: ['sign out', 'log out', 'logout', 'log off'],
    related: [
      'getting-started.signin.how',
      'getting-started.account.switch',
      'getting-started.signin.stay',
    ],
    route: '/settings',
  },
  {
    id: 'getting-started.account.email-change',
    topic: 'getting-started',
    title: 'Can I change my email address?',
    questions: [
      'Can I change my email address?',
      'update the email on my account',
      'how do i change my login email',
      'I have a new email, how do I move my account?',
      'change email in settings',
      'wrong email on my skip account',
      'switch my account to a different email',
      'edit my email',
      'my old email no longer works',
      'move my data to another email',
    ],
    answer:
      'Not inside Skip. The email you signed up with is how your account is found, so there is no setting to change it, and there is no way to move your things to a different account.\n\n' +
      'If you sign in with Apple or Google, the email comes from that account. If changing it matters to you, tell us from **Settings → Support and feedback → Email support**.',
    keywords: ['change email', 'update email', 'new email', 'edit email'],
    related: ['getting-started.account.which-email', 'getting-started.account.switch'],
  },
  {
    id: 'getting-started.account.which-email',
    topic: 'getting-started',
    title: 'Which email am I signed in with?',
    questions: [
      'which email address did I use to sign up',
      'forgot my login email',
      'check what email my account was made with',
      "I can't remember which email I used for skip",
      'Which email am I signed in with?',
      'where can i see my account email',
      'what email is my skip account',
      'how do i check which account im in',
      'Where does Skip show my email?',
      'what address did i sign up with',
      'see my login email',
      'which apple id is skip using',
      'is my account email shown anywhere',
      'how do i know which account this is',
    ],
    answer:
      'You can see it in **Settings → Support and feedback → Email support**. The **Your email** box shows the address your account uses. You do not have to send anything, just tap back.\n\n' +
      'If it ends in privaterelay.appleid.com, you signed up with Apple and chose **Hide My Email**. Keep using **Continue with Apple** to sign in.',
    keywords: ['my email', 'account email', 'which account', 'login email'],
    related: ['getting-started.signin.empty-account', 'getting-started.account.email-change'],
    route: '/contact',
  },
  {
    id: 'getting-started.account.switch',
    topic: 'getting-started',
    title: 'Can I switch between two accounts?',
    questions: [
      'Can I switch between two accounts?',
      'two skip accounts on one phone',
      'how do i use a different account',
      'account switcher',
      'Can I merge two Skip accounts?',
      'combine my accounts',
      'swap to my other account',
      'use my work and personal skip on one phone',
      'how to change accounts',
      'move my data from one account to another',
    ],
    answer:
      'Skip holds one account at a time on a phone, and there is no account switcher. To use another account:\n\n' +
      '1. Go to **Settings** and tap **Sign out** (under **Account**).\n' +
      '2. Log in with the other account.\n\n' +
      'Each account keeps its own things, and nothing is lost when you sign out. There is no way to merge two accounts or move things between them.',
    keywords: ['switch account', 'two accounts', 'merge', 'combine', 'change account'],
    related: [
      'getting-started.signout.how',
      'getting-started.account.share',
      'getting-started.signin.empty-account',
    ],
  },
  {
    id: 'getting-started.signin.terms',
    topic: 'getting-started',
    title: 'Where are the Terms and Privacy policy?',
    questions: [
      'Where are the Terms of service?',
      'by continuing you agree to our terms, where are they',
      'read the privacy policy before signing up',
      'what am i agreeing to when i log in',
      'privacy policy link on the login page',
      'terms and conditions skip',
      'link to the privacy policy',
      'where can i read your terms',
      'skip terms of use',
      'what does the agreement line on log in mean',
      'terms & conditions page',
      'where do i find the privacy policy in the app',
      'where is the privacy statement',
      'where can i read the privacy policy before i sign up',
      'show me the privacy policy',
    ],
    answer:
      'On the **Log in** page, the line **By continuing you agree to our Terms of service and Privacy policy** has both as links. Tap either one to read it.\n\n' +
      'Once you are signed in, they are in **Settings → About**: **Privacy policy** (what is stored, and who else can see it) and **Terms of service**.\n\n' +
      'In short: Skip only holds what you put in, never your bank login, does not sell your data, and you can delete everything from **Settings**.',
    keywords: [
      'terms',
      'terms of service',
      'privacy policy',
      'agreement',
      'legal',
      'terms and conditions',
      'T&Cs',
    ],
    related: ['getting-started.skip.safe', 'getting-started.account.share'],
  },

  // Name and picture

  {
    id: 'getting-started.hello.name',
    topic: 'getting-started',
    title: 'Why does Skip ask for my name?',
    questions: [
      'Why does Skip ask for my name?',
      'what should we call you page',
      'Do I have to give my real name?',
      'can i skip the name',
      'what is the name used for',
      'skip asks my name every time i sign in',
      'why did apple not give skip my name',
      'Skip for now on the name page',
      'can i use a nickname',
      'what happens if i dont enter a name',
      'name step after sign up',
      'what is the pencil on the big circle when i sign up',
      'pick a picture while signing up',
    ],
    answer:
      'Right after you create your account, Skip asks **What should we call you?** The name you type in **Your name** shows at the top of **Home**. Any name or nickname is fine.\n\n' +
      '- Tap **Continue** to save it. You will see **Name saved**.\n' +
      '- Tap **Skip for now** to leave it. **Home** then says **Welcome** instead.\n' +
      '- Tap the round picture with the pencil to open **Profile picture**. Tap one of the 15 pictures and it saves straight away.\n\n' +
      'Apple and Google do not pass your name to Skip, so it asks either way. If you skip it after signing in with Apple or Google, it asks again the next time you sign in. You can change both later in **Settings** under **Profile**.',
    keywords: [
      'name',
      'what should we call you',
      'your name',
      'nickname',
      'skip for now',
      'pencil',
    ],
    related: [
      'getting-started.setup.what',
      'getting-started.signup.ways',
      'getting-started.signup.apple',
    ],
  },

  // The setup checklist

  {
    id: 'getting-started.setup.what',
    topic: 'getting-started',
    title: "What is Let's set up Skip?",
    questions: [
      "What is Let's set up Skip?",
      'what is the setup checklist',
      'what are the five steps after sign up',
      'Why is one step outlined in purple?',
      'what does the plum border on a step mean',
      'what do the numbers 1 to 5 mean',
      'what does all set open skip do',
      'how does setup work',
      'the list after i made my account',
      'crossed out steps on setup',
      'what does continue do on the checklist',
    ],
    answer:
      '**Let’s set up Skip** is a short checklist you see after creating your account. Each step opens the real page for it, and when you save, you come back here:\n\n' +
      '1. **Set your pay**\n' +
      '2. **Add your credit card and bank account**\n' +
      '3. **Add your bills**\n' +
      '4. **Add your subscriptions**\n' +
      '5. **Add a receipt** (Optional)\n\n' +
      'The step to do next has a plum border. Done steps get a plum tick and are crossed out. Tap **Continue** to open the next step, or tap any step yourself. When all five are done, tap **All set — open Skip**.',
    keywords: ['setup', 'checklist', "let's set up skip", 'steps', 'all set', 'onboarding'],
    related: [
      'getting-started.setup.later',
      'getting-started.setup.pay',
      'getting-started.setup.ticks',
    ],
  },
  {
    id: 'getting-started.setup.later',
    topic: 'getting-started',
    title: 'Can I skip setup and do it later?',
    questions: [
      'skip the setup steps for now and go to home',
      'Can I skip setup and do it later?',
      'set up later button',
      'I just want to look around first',
      'do i have to finish setup',
      'skip the setup',
      'what does skip the receipt open skip do',
      'leave setup',
      'i dont have time to set everything up now',
      'can i come back to setup',
      'how do i get to home without setting up',
      'can i skip the steps for now and go to home',
      'i do not have time for all these setup steps, take me to home',
      "how do i leave the let's set up skip page and use the app",
      'i am not ready to add everything, can i just go in',
      'bypass the setup checklist',
      'how do i get to home without doing all the steps',
    ],
    answer:
      'Yes. Tap **Set up later** at the bottom of **Let’s set up Skip** and you go straight to **Home**. Anything you already added stays.\n\n' +
      'The same steps wait for you on **Home** in the **Getting started** card, which ticks each one as you add things. You can also add anything at any time with **Quick add** on **Home**, or from the **Cards** tab.\n\n' +
      'Once the first four steps are done, the bottom link becomes **Skip the receipt — open Skip**, since the receipt is optional.',
    keywords: ['set up later', 'skip setup', 'later', 'skip the receipt'],
    related: [
      'getting-started.card.what',
      'getting-started.setup.what',
      'getting-started.setup.receipt',
    ],
  },
  {
    id: 'getting-started.setup.pay',
    topic: 'getting-started',
    title: 'What is the Set your pay step?',
    questions: [
      'What is the Set your pay step?',
      'why is pay the first step',
      'how do i add my salary during setup',
      'set your pay',
      'Do I have to add my salary?',
      'I get paid hourly, what do I put for set your pay',
      'what if i have two jobs in setup',
      'i dont have a salary can i skip step 1',
      'step 1 setup',
      'where does my pay go after setup',
    ],
    answer:
      '**Set your pay** is the first step because your **Current balance**, savings and **Insights** all count what comes in.\n\n' +
      'Tapping it opens **Salary**, where you add your pay: fixed or hourly, how much, and how often. You can add as many salaries as you like, on any plan. Save, and you are back on the checklist with the step ticked.\n\n' +
      'No regular pay? You can leave this step and do the others. Later, your pay lives in **Cards → Salary**, or **Quick add → Salary** on **Home**.',
    keywords: ['set your pay', 'salary', 'pay', 'step 1', 'income', 'hourly'],
    related: [
      'getting-started.setup.wallet',
      'getting-started.setup.what',
      'getting-started.start.first',
    ],
  },
  {
    id: 'getting-started.setup.wallet',
    topic: 'getting-started',
    title: 'What is the card and bank account step?',
    questions: [
      'only add a card in setup, no bank account',
      'What is the card and bank account step?',
      'add your credit card and bank account step',
      'step 2 setup',
      'why does setup ask for a credit card first',
      'do i need to add both a card and an account',
      'Is it safe to add my card in setup?',
      'what do i type for my card in setup',
      'how many cards can i add during setup',
      'setup card form',
      'can i add my debit card',
      'what details does the credit card form want during setup',
      'what is the due day on the card form in setup',
      'what information does the bank account step ask for in setup',
      'what do i enter for the credit card step in setup',
      'step 2 of setup: what goes in the card and bank boxes',
    ],
    answer:
      'Step 2, **Add your credit card and bank account**, adds the places your money goes out from.\n\n' +
      '1. Tap the step. The credit card form opens first: a name for the card, its balance right now, and the day its bill is due.\n' +
      '2. Save the card. You will see **Add your bank account**.\n' +
      '3. Tap **Add bank account** to add one now, or **Skip** to leave it.\n\n' +
      'The step is ticked either way, since one card or one account is enough. Skip never asks for a full card number. The free plan has room for 1 credit card and 1 bank account.',
    keywords: ['card and bank', 'credit card', 'bank account', 'step 2', 'wallet', 'card form'],
    related: [
      'getting-started.setup.account-offer',
      'getting-started.setup.no-card',
      'getting-started.setup.bills',
    ],
  },
  {
    id: 'getting-started.setup.no-card',
    topic: 'getting-started',
    title: "I don't have a credit card",
    questions: [
      'I do not have a credit card',
      'can i skip the credit card step',
      'only want to add my bank account',
      'Do I need a credit card to use Skip?',
      'i only use cash',
      'no credit card what do i do in setup',
      'add bank account without a card',
      'i only have a debit card',
      'step 2 without a credit card',
      'can i use skip with no cards at all',
      'can i finish the setup steps with only a bank account',
      'i use a debit account, not a credit card, what do i do in setup',
      'setup keeps asking for a credit card and i do not have one',
      'no credit card, how do i get past step 2',
      'i only have a checking account and no credit card, what do i do in setup',
    ],
    answer:
      'That is fine. A credit card is not required. Step 2 ticks with either a credit card or a bank account.\n\nThe setup step opens the credit card form first, so to add only a bank account:\n1. Tap **Set up later**, or go back from the card form and then tap **Set up later**.\n2. Open the **Cards** tab and tap **+ Add** next to **Bank accounts**.\n3. Fill it in and tap **Add account**. The step is ticked on the **Getting started** card on **Home**.\n\nYou can also add neither. When a bill asks **Paid with**, you can pick **Skip**.',
    keywords: ['no credit card', 'cash', 'debit', 'bank only', 'skip card'],
    related: ['getting-started.setup.wallet', 'getting-started.card.what'],
    route: '/cards',
  },
  {
    id: 'getting-started.setup.account-offer',
    topic: 'getting-started',
    title: 'What is the Add your bank account page?',
    questions: [
      'What is the Add your bank account page?',
      'page after i saved my card in setup',
      'add bank account or skip',
      'should i add my bank account now',
      'what happens if i press skip on add your bank account',
      'i skipped the bank account can i add it later',
      'why did skip ask for my bank account',
      'does add bank account connect to my bank',
      'bank account offer setup',
      'step 2 is ticked but i didnt add a bank account',
      'Why did Skip ask me to add a bank account?',
      'Why did Skip ask me to add my bank account after my card?',
      'Add your bank account screen',
      'can I skip adding a bank account',
      'should I tap add bank account or skip after my card',
      'skipped the bank account, can I add it later',
      'getting started bank account step',
      'do I need a bank account',
      'after adding a card it asks for an account',
      'wallet step in setup',
      'Add your credit card and bank account',
    ],
    answer:
      'It shows during setup right after you save your first credit card, since most pay lands in a bank account.\n\n- **Add bank account** opens the bank account form. Fill it in and tap **Add account**, and you’re back on the checklist.\n- **Skip** takes you straight back to the checklist.\n\nThe step is ticked either way. Adding an account doesn’t connect to your bank; you type its name and balance yourself. It isn’t required either: without one, your pay still counts in your **Current balance**. You can add one any time from **Cards**: tap **+ Add** next to **Bank accounts**.',
    keywords: [
      'add your bank account',
      'add bank account',
      'skip',
      'offer',
      'Add your bank account',
      'Add bank account',
      'Skip',
      'setup',
    ],
    related: [
      'getting-started.setup.wallet',
      'getting-started.setup.no-card',
      'getting-started.skip.bank',
    ],
  },
  {
    id: 'getting-started.setup.bills',
    topic: 'getting-started',
    title: 'How does the Add your bills step work?',
    questions: [
      'How does the Add your bills step work?',
      'add my bills in setup',
      'step 3 setup',
      'can i add more than one bill during setup',
      'keep adding bills during setup',
      'what bills should i add',
      'how do i fix a bill i added in setup',
      'I added one bill, how do I go back to the checklist?',
      'rent phone internet setup',
      'bills page during setup is empty',
      'What is Add your bills during setup?',
      'add your bills screen',
      'add your subscriptions during setup',
      'how do I add more than one bill at setup',
      'add another bill button',
      'skip for now on bills',
      'can i add bills later instead of now',
      'where does done take me on add your bills',
      'setup asks me to add my bills',
      'tapping a bill in setup opens the edit page',
    ],
    answer:
      '**Add your bills** is where you add every bill that comes back: rent, phone, internet and so on, one at a time.\n\n1. Tap **Add a bill**, fill it in and save.\n2. You land back on the list, which shows each bill you added.\n3. Tap **Add another bill** for the next one, or **Done** to go back to the checklist.\n\nOne bill is enough to tick the step and fill **Coming up** on **Home**. Tap a bill in the list to change it. Not ready? Tap **Skip for now** and add bills any time later with **Quick add → Bill**.',
    keywords: [
      'add your bills',
      'bills',
      'step 3',
      'add another bill',
      'rent',
      'setup',
      'add your subscriptions',
      'onboarding',
      'skip for now',
    ],
    related: [
      'getting-started.setup.subscriptions',
      'getting-started.setup.ticks',
      'getting-started.setup.what',
    ],
  },
  {
    id: 'getting-started.setup.subscriptions',
    topic: 'getting-started',
    title: 'How does the subscriptions step work?',
    questions: [
      'How does the Add your subscriptions step work?',
      'add my subscriptions in setup',
      'step 4 setup',
      'add netflix during setup',
      'add another subscription',
      'what counts as a subscription in setup',
      'is the gym a bill or a subscription',
      'how do i change a subscription i added in setup',
      'subscriptions page during setup',
      'I have lots of subscriptions, do I add them all now?',
    ],
    answer:
      '**Add your subscriptions** is for everything that renews on its own: Netflix, Spotify, the gym and so on, one at a time.\n\n' +
      '1. Tap **Add a subscription**, fill it in and save.\n' +
      '2. You land back on the list of what you added.\n' +
      '3. Tap **Add another subscription**, or **Done** to go back to the checklist.\n\n' +
      'One is enough to tick the step. You can add the rest any time with **Quick add → Subscription** on **Home**. Tap one in the list to change it, or tap **Skip for now** to leave the step.',
    keywords: ['add your subscriptions', 'subscriptions', 'step 4', 'netflix', 'spotify', 'gym'],
    related: [
      'getting-started.setup.bills',
      'getting-started.setup.receipt',
      'getting-started.setup.ticks',
    ],
  },
  {
    id: 'getting-started.setup.receipt',
    topic: 'getting-started',
    title: 'Do I have to add a receipt in setup?',
    questions: [
      'Do I have to add a receipt?',
      'add a receipt optional',
      'step 5 setup',
      'i dont have a receipt to add',
      'why is the receipt step optional',
      'does my setup receipt count toward my free scans',
      'Getting started says 4 of 5 done because of the receipt',
      'what receipt should i add first',
      'can i type the receipt instead of scanning',
      'skip the receipt step',
      'is the receipt step mandatory in setup',
      'is it mandatory to add a receipt when getting started',
      'do i need to add a receipt to finish getting started',
      'can i finish the getting started checklist without a receipt',
      'is the last setup step required',
    ],
    answer:
      'No. **Add a receipt** is the only step marked **Optional**, and Skip works fine without it.\n\n' +
      'Once steps 1 to 4 are done, the checklist offers **Add a receipt** (scan, upload or type one) and **Skip the receipt — open Skip**.\n\n' +
      'Two things to know:\n' +
      '- On the free plan, a scan or upload counts toward the 15 scans and 15 uploads you get each month. Typing a receipt does not.\n' +
      '- The **Getting started** card on **Home** shows **4 of 5 done** until you add a receipt or hide the card.',
    keywords: ['receipt', 'optional', 'step 5', 'add a receipt', 'skip the receipt'],
    related: [
      'getting-started.setup.later',
      'getting-started.card.hide',
      'getting-started.setup.ticks',
    ],
  },
  {
    id: 'getting-started.setup.ticks',
    topic: 'getting-started',
    title: 'Why is a setup step ticked or not?',
    questions: [
      'Why is a setup step ticked or not?',
      'i added a bill but the step is not ticked',
      'how do i tick a step',
      'can i untick a step',
      'Why can I not tap a finished step?',
      'step ticked on its own',
      'my loan does not tick add your bills',
      'setup step not updating',
      'how does skip know a step is done',
      'the tick went away',
      'i deleted my bill and the step came back',
    ],
    answer:
      'Skip ticks each step by itself, from what is in your account. You cannot tick or untick a step by hand:\n\n' +
      '- **Set your pay**: at least one salary\n' +
      '- **Add your credit card and bank account**: at least one card or bank account\n' +
      '- **Add your bills**: at least one bill in your monthly bills\n' +
      '- **Add your subscriptions**: at least one subscription\n' +
      '- **Add a receipt**: at least one receipt\n\n' +
      'So a bill added from **Quick add** ticks the bill step too. A loan you kept out of monthly bills does not count as a bill. Delete the only thing behind a step and its tick goes away. Done steps cannot be tapped; change things from their own pages.',
    keywords: ['tick', 'checkmark', 'done', 'not ticked', 'step complete'],
    related: [
      'getting-started.card.reappeared',
      'getting-started.setup.what',
      'getting-started.card.what',
    ],
  },
  {
    id: 'getting-started.setup.again',
    topic: 'getting-started',
    title: 'Why did the setup checklist show again?',
    questions: [
      'Why did the setup checklist show up again?',
      'setup shows every time i log in',
      "why do i see let's set up skip after signing in",
      'Why did Skip skip the setup checklist?',
      'i never saw the setup steps',
      'after login it went straight to home',
      'setup keeps coming back',
      'how do i stop setup from showing',
      'why did setup not appear for me',
      'logged in and got the checklist',
      "i signed in again and the let's set up skip page is back, like my account is empty",
      'why does skip treat me like a brand new user after login',
      'logged back in, it took me to the setup checklist instead of home',
      'every time i log in it asks me to set up skip',
      'after signing in again skip asks me to set everything up from scratch',
      'signed back in and the account looks brand new, asking for setup',
    ],
    answer:
      '**Let’s set up Skip** shows after you sign in only when your account is empty and you have not hidden the **Getting started** card. Empty means no pay, cards, accounts, bills, subscriptions or receipts yet. As soon as there is anything in your account, signing in goes straight to **Home**.\n\nSo if you see it but expected your things, you are probably in a different account. Sign out and sign in the way you used before.\n\nIf you are new, tap **Continue** to start, or **Set up later**. Hiding the **Getting started** card on **Home** also stops the checklist showing at sign-in.',
    keywords: [
      'setup again',
      'checklist again',
      'setup missing',
      'straight to home',
      'set everything up',
    ],
    related: [
      'getting-started.signin.empty-account',
      'getting-started.card.hide',
      'getting-started.setup.later',
    ],
  },

  // The Getting started card on Home

  {
    id: 'getting-started.card.what',
    topic: 'getting-started',
    title: 'What is the Getting started card?',
    questions: [
      "what's the getting started box for",
      "what's that getting started section on home for",
      'What is the Getting started card?',
      'what is the checklist on home',
      'what does 2 of 5 done mean',
      'what is the purple bar on the getting started card',
      'getting started on home screen',
      'the card under quick add with steps',
      'how do i finish getting started',
      'tap a step on getting started',
      'when does getting started go away',
      'progress bar on home',
    ],
    answer:
      '**Getting started** is the card on **Home** just under **Quick add**. It shows the same five setup steps as the checklist, so you can finish setting up whenever you like.\n\n' +
      '- **2 of 5 done**, for example, and the plum bar show how far you are.\n' +
      '- Tap any step without a tick to open it.\n' +
      '- Steps tick themselves as you add things, from anywhere in the app.\n\n' +
      'The card goes away by itself once all five steps are done, or when you tap the **X** to hide it.',
    keywords: ['getting started', 'checklist', 'progress', 'of 5 done', 'card on home'],
    related: [
      'getting-started.card.hide',
      'getting-started.card.back',
      'getting-started.setup.ticks',
    ],
    route: '/home',
  },
  {
    id: 'getting-started.card.hide',
    topic: 'getting-started',
    title: 'How do I hide the Getting started card?',
    questions: [
      'How do I hide the Getting started card?',
      'remove getting started from home',
      'close the setup card',
      'what does the x on getting started do',
      'dismiss getting started',
      'i dont want the checklist on home',
      'Does hiding Getting started undo my setup?',
      'get rid of the getting started box',
      'turn off getting started',
      'is getting started hidden on my other phone too',
      'remove the setup card from my home screen',
      'the checklist card on my home page, can i close it',
      'get the checklist off my home screen',
      'remove the checklist card from my home screen',
      'get rid of the getting started card on home',
    ],
    answer:
      'Tap the **X** at the top right of the **Getting started** card on **Home**. It hides straight away, and stays hidden on every phone you sign in on.\n\n' +
      'Hiding it does not undo anything you set up. It also means the setup checklist will not show again when you sign in.\n\n' +
      'Changed your mind? Bring it back from **Settings → Support and feedback → Getting started**.',
    keywords: ['hide', 'dismiss', 'close', 'x', 'remove getting started'],
    related: ['getting-started.card.back', 'getting-started.card.what'],
    route: '/home',
  },
  {
    id: 'getting-started.card.back',
    topic: 'getting-started',
    title: 'How do I get the Getting started card back?',
    questions: [
      'I dismissed getting started, how do I get it back',
      'How do I get the Getting started card back?',
      'bring back getting started',
      'i hid the checklist by mistake',
      'show the setup steps again',
      'where did getting started go',
      'restore getting started card',
      'getting started is back message',
      'i tapped getting started in settings but nothing shows',
      'undo hiding getting started',
      'getting started card missing from home',
      'What does Getting started in Support do?',
      'What does the Getting started row in Support do?',
      'Put the setup steps back on Home',
      'Getting started is back, what happened',
      'bring back the setup checklist from settings',
      'support page getting started button',
      'I tapped getting started and it took me home',
      'restore setup steps',
      'show the setup card again from settings',
      'getting started row in support and feedback',
      're-enable the onboarding card',
    ],
    answer:
      '1. Go to **Settings → Support and feedback**.\n2. Tap **Getting started** (Put the setup steps back on Home).\n\nSkip takes you to **Home** and shows **Getting started is back**. The card shows all five steps again, with the ones you have done ticked.\n\nIf all five steps are already done, there is nothing left to show, so the card stays away.',
    keywords: [
      'getting started back',
      'restore',
      'show again',
      'support and feedback',
      'Getting started',
      'setup steps',
      'checklist',
    ],
    related: [
      'getting-started.card.hide',
      'getting-started.card.what',
      'getting-started.card.reappeared',
    ],
    route: '/settings/support',
  },
  {
    id: 'getting-started.card.reappeared',
    topic: 'getting-started',
    title: 'Why did Getting started come back?',
    questions: [
      'the setup card shows up again on its own',
      'Why did Getting started come back?',
      'the setup card showed up again on home',
      'getting started reappeared',
      'i finished setup but the card is back',
      'why is getting started on home again',
      'checklist came back by itself',
      'getting started back after deleting a bill',
      'the card says 4 of 5 again',
      'getting started keeps returning',
      'why is a step open again',
    ],
    answer:
      'The card comes back by itself when a step it had ticked is no longer done. For example, if you delete your only bill, **Add your bills** is not done any more, so the card shows again with that step open.\n\n' +
      'Add the missing thing again, or tap the **X** on the card to hide it. Once hidden, it stays away until you bring it back from **Settings → Support and feedback → Getting started**.',
    keywords: ['came back', 'reappeared', 'again', 'getting started'],
    related: ['getting-started.setup.ticks', 'getting-started.card.hide'],
    route: '/home',
  },

  // Getting around

  {
    id: 'getting-started.start.first',
    topic: 'getting-started',
    title: 'What should I do first?',
    questions: [
      'What should I do first?',
      'where do i start',
      'how do i set up skip',
      'best way to start with skip',
      'what order should i add things',
      'how long does setup take',
      'I am overwhelmed, what is the first thing to add?',
      'first steps in skip',
      'what do i need to get going',
      'what should i add after signing up',
      'i just downloaded the app, where should i start',
      'just downloaded skip, what do i do now',
      'i just installed the app, what is step one',
      'i have a fresh account, what should i set up first',
      'i have the app now, what do i do first',
      'downloaded skip today, what comes first',
    ],
    answer:
      "Add your pay first, since most of Skip's figures start from what comes in. Then follow **Let’s set up Skip** after sign-up, or the **Getting started** card on **Home**:\n\n" +
      '1. **Set your pay**\n' +
      '2. **Add your credit card and bank account**\n' +
      '3. **Add your bills**\n' +
      '4. **Add your subscriptions**\n' +
      '5. **Add a receipt** (optional)\n\n' +
      'It takes a few minutes, and you can stop any time. After that, the everyday habit is quick: add what you spend with **Quick add** on **Home**.',
    keywords: ['first', 'start', 'begin', 'setup', 'order'],
    related: [
      'getting-started.setup.what',
      'getting-started.setup.pay',
      'getting-started.nav.find',
    ],
  },
  {
    id: 'getting-started.nav.tabs',
    topic: 'getting-started',
    title: 'What are the tabs at the bottom?',
    questions: [
      'difference between the tabs at the bottom',
      'what is each bottom tab for',
      'What are the tabs at the bottom?',
      'what do the icons at the bottom mean',
      'how do i move around the app',
      'what is the house icon',
      'what is the wallet icon for',
      'what is the lightning bolt icon',
      'why does one tab show a name and the others dont',
      'navigation bar explained',
      'tapping the tab i am on does nothing',
      'menu at the bottom of the screen',
      'where is the menu',
    ],
    answer:
      'The bar at the bottom takes you around Skip. The tab you are on shows as a plum pill with its name; the others show just an icon.\n\n' +
      '- **Home** (house): your **Current balance**, **Quick add**, where your money went this month, and day by day\n' +
      '- **Cards** (wallet): credit cards, bank accounts, and **Salary**, **Savings**, **Loans** and **Goals**\n' +
      '- **Activity** (receipt): everything you have recorded, in one list\n' +
      '- **Settings** (bolt): Skip Pro, your profile, preferences, help, and signing out\n\n' +
      'The round button at the right end is for adding by voice. Tapping the tab you are already on does nothing.',
    keywords: ['tabs', 'tab bar', 'menu', 'navigation', 'icons', 'house', 'wallet', 'bolt'],
    related: ['getting-started.nav.voice', 'getting-started.nav.back', 'getting-started.nav.find'],
    route: '/home',
  },
  {
    id: 'getting-started.nav.voice',
    topic: 'getting-started',
    title: 'What is the round button in the tab bar?',
    questions: [
      'What is the round button in the tab bar?',
      'what is the purple circle at the bottom right',
      'why does the round button say pro',
      'what does the sound wave button do',
      'voice button',
      'the big button next to the tabs',
      'round button does nothing when i tap it',
      'add by voice button',
      'can i hide the voice button',
      'what is the pro badge on the button',
      'tapping the circle shows a pro page',
    ],
    answer:
      'That is the Voice button, at the right end of the tab bar on every tab. With Skip Pro, tap it and say something like Netflix $15.99 every month to add a receipt, bill or subscription. You check what Skip heard before anything is saved.\n\n' +
      'On the free plan it has a small **PRO** badge. Tapping it shows what Voice entry does, with a way to get Skip Pro, or **Not now** to go back.\n\n' +
      'Right after Skip opens, the button waits a moment until it knows your plan, so a very early tap may do nothing. Just tap again. There is no setting to hide it.',
    keywords: ['voice', 'voice button', 'round button', 'pro badge', 'sound wave', 'add by voice'],
    related: ['getting-started.nav.tabs', 'getting-started.skip.free'],
  },
  {
    id: 'getting-started.nav.back',
    topic: 'getting-started',
    title: 'How do I go back to the last page?',
    questions: [
      'How do I go back to the last page?',
      'there is no back button',
      'swipe back not working',
      'how to close a page',
      'how do i leave this screen',
      'back arrow',
      'why cant i swipe back while adding something',
      'go back one step',
      'how do i return to the previous screen',
      'stuck on a page how do i get out',
    ],
    answer:
      'Tap the back arrow at the top left, or swipe right from the left edge of the screen. On the four main tabs there is nothing to go back to; tap another tab in the bar instead.\n\n' +
      'While you are adding something with several steps, the swipe is turned off so you do not lose your work by accident. Use the arrow to go back a step. If you leave part way, Skip asks before throwing away what you typed.',
    keywords: ['back', 'go back', 'swipe', 'close', 'back arrow', 'previous'],
    related: ['getting-started.nav.tabs', 'getting-started.welcome.back'],
  },
  {
    id: 'getting-started.nav.find',
    topic: 'getting-started',
    title: 'Where do I find things in Skip?',
    questions: [
      'Where do I find things in Skip?',
      'which tab has my bills',
      'where is my salary',
      'where do i find loans',
      'where are savings',
      'where is the bell',
      'where are reminders settings',
      'map of the app',
      'I can not find anything in this app',
      'where is everything',
      'where do i find receipts',
      'where is the help section',
    ],
    answer:
      'Here is where everything lives:\n\n' +
      '- **Salary**: **Cards → Salary**, or **Quick add → Salary** on **Home**\n' +
      '- Credit cards and bank accounts: the **Cards** tab\n' +
      '- **Monthly Bills**, **Subscriptions** and **Receipts**: **Home**, under **Where your money went**\n' +
      '- **Loans**: **Home → Go further**, or **Cards → Loans**\n' +
      '- **Spending habits**: **Home → Go further**\n' +
      '- **Savings** and **Goals**: the **Cards** tab\n' +
      '- **Insights**: **Home**, below **Go further**\n' +
      '- Everything you recorded: the **Activity** tab\n' +
      '- **Notifications**: the bell at the top right of **Home**\n' +
      '- **Reminders**: **Settings → Preferences**\n' +
      '- Help: **Settings → Support and feedback**',
    keywords: ['where', 'find', 'map', 'location', 'menu', 'lost'],
    related: [
      'getting-started.nav.tabs',
      'getting-started.start.first',
      'getting-started.help.tour',
    ],
  },
  {
    id: 'getting-started.help.tour',
    topic: 'getting-started',
    title: 'Is there a tour or tutorial?',
    questions: [
      'Is there a tour or tutorial?',
      'how do i learn to use skip',
      'is there a guide',
      'walkthrough of the app',
      'show me how skip works',
      'where is the help page',
      'are there how-to videos for skip',
      'is there an faq',
      'can i redo the tutorial',
      'onboarding guide again',
    ],
    answer:
      'There is no separate tour. Skip shows you around as you go:\n\n' +
      '- The welcome pages explain what Skip is before you sign up.\n' +
      '- **Let’s set up Skip** and the **Getting started** card on **Home** walk you through the five setup steps.\n' +
      '- **Common questions** is a page of short answers. Open it with the link below.\n\n' +
      'And you can ask me anything, any time: I’m in **Settings → Support and feedback** and at the bottom of **Settings**.',
    keywords: ['tour', 'tutorial', 'guide', 'faq', 'help', 'common questions', 'walkthrough'],
    related: [
      'getting-started.card.back',
      'getting-started.nav.find',
      'getting-started.start.first',
    ],
    route: '/faq',
  },
  {
    id: 'getting-started.platform.ios-version',
    topic: 'getting-started',
    title: 'Which iPhone and iOS do I need?',
    questions: [
      'does skip work on ios 16',
      'which iphone do i need',
      'minimum ios version',
      'will skip run on my old iphone',
      'can i use skip on iphone 8',
      "app won't install, ios too old",
      'requires a newer version of ios',
      'does it work on iphone se',
      'what ios do i need for skip',
      'skip not compatible with my iphone',
    ],
    answer:
      'Skip needs iOS 16.4 or later. That covers the iPhone 8, the iPhone SE (2nd generation) and every newer iPhone.\n\nIf the App Store says Skip needs a newer iOS, update your iPhone in **Settings → General → Software Update**, then try again.\n\nA few features also need something from the phone: scanning needs the camera, **App lock** needs Face ID or Touch ID set up, and **Voice** needs Dictation turned on.',
    keywords: ['iOS version', 'iOS 16', 'old iPhone', 'compatible', 'requirements'],
    related: ['getting-started.platform.ipad', 'getting-started.platform.android'],
  },
  {
    id: 'getting-started.nav.icons',
    topic: 'getting-started',
    title: 'What do the pencil, bin and + icons do?',
    questions: [
      'what does the pencil icon do',
      'what does the bin icon mean',
      'what is the trash can for',
      'pencil button at the top right',
      'icons in skip meaning',
      'what does the plus sign do',
      'how do i edit anything in skip',
      'where is the edit button',
      'how do i delete things in skip',
      'what does the small pencil on a logo do',
      "what's the pencil for",
    ],
    answer:
      'They work the same way across Skip:\n\n- **Pencil**: edits. It’s at the top of a receipt, bill, subscription, card or account page, and on goals, savings months and habit cards. A small pencil on a logo changes the logo.\n- **Bin**: removes. On **Salary** it removes a pay source (tap **Save** to finish), and on the **Reminders** page it deletes a reminder.\n- **+**: adds, like **+ Add** on **Cards** or the **+** on **Monthly bills**.\n\nTo delete most things, open them, tap the pencil and look for **Delete** at the bottom. Skip asks before it deletes a receipt, bill, subscription, loan, card, account, goal or habit.',
    keywords: ['pencil', 'bin', 'trash', 'plus', 'icons', 'edit button'],
    related: ['getting-started.nav.find', 'getting-started.nav.back', 'getting-started.nav.tabs'],
  },
];
