import type { Intent } from '@/lib/ask-sam/types';

export const billsSubscriptionsIntents: Intent[] = [
  // ---------------------------------------------------------------------------------------------
  // What bills and subscriptions are, and where they live
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.basics.difference',
    topic: 'bills',
    title: "What's the difference between a bill and a subscription?",
    questions: [
      "What's the difference between a bill and a subscription?",
      'bill vs subscription',
      'should netflix be a bill or a subscription',
      'Is rent a bill or a subscription in Skip?',
      'where do I put my gym membership, bills or subscriptions',
      'what counts as a bill',
      'what counts as a subscription in this app',
      'Does it matter if I add something as a bill instead of a subscription?',
      'is my phone plan a bill or subscription',
      'why are bills and subscriptions separate',
      'difference bills subscriptions',
      'which one do i use for car insurance',
    ],
    answer:
      'Both are payments that repeat, and Skip counts them the same way: each one goes out on its date and lowers your **Current balance**. The difference is how you describe them.\n\n' +
      "- A **bill** is something like rent, power, water, internet, your phone, insurance or school fees. You pick a **Category**, a **Payment on** date and how often it's **Recurring**.\n" +
      '- A **subscription** is a service that renews on its own, like Netflix, Spotify or the gym. You search for the **Service** (its logo comes with it), pick a **Billing cycle** and its **Next renewal**, and you can mark it **Cancelled** later.\n\n' +
      'Pick whichever feels right. Bills live on **Monthly bills**, subscriptions on **Subscriptions**. Loans have their own **Loans** page.',
    keywords: ['bill', 'subscription', 'difference', 'which one', 'recurring payment'],
    related: [
      'bills.add.how',
      'subscriptions.add.how',
      'bills.find.where',
      'subscriptions.find.where',
    ],
  },
  {
    id: 'bills.find.where',
    topic: 'bills',
    title: 'Where do I see my bills?',
    questions: [
      'Where do I see my bills?',
      'where are my bills',
      "I can't find the bills page",
      'how do i get to monthly bills',
      'Where is the list of all my bills?',
      'bills page',
      'where did my bills go',
      'is there a bills tab',
      'how do i open a bill i added',
      'where can I check what bills are due',
      'show me my recurring bills',
      'what happened to the Your bills page',
    ],
    answer:
      'Your bills are on the **Monthly bills** page. Two ways to get there:\n\n' +
      '- On **Home**, under **Where your money went**, tap **Monthly Bills**.\n' +
      '- Go to **Settings → Your money → Bills**.\n\n' +
      "The page shows what's due in the month, what's still **Coming up**, every bill under **All bills**, and any you stopped under **Stopped**. Tap a bill to open its page. To add one, tap the **+** at the top right.\n\n" +
      "If you haven't added any yet, it says **No bills yet** with an **Add a bill** button.",
    keywords: ['monthly bills', 'bills page', 'your bills', 'bills list'],
    related: ['bills.month.page', 'bills.add.how', 'bills.detail.page'],
    route: '/bills',
  },
  {
    id: 'subscriptions.find.where',
    topic: 'subscriptions',
    title: 'Where do I see my subscriptions?',
    questions: [
      'Where do I see my subscriptions?',
      'where are my subscriptions',
      'subscriptions page',
      'how do i find netflix that i added',
      "can't find my subscriptions anywhere",
      'Where is the list of all my subscriptions?',
      'how to open subscriptions',
      'where do i check my streaming services',
      'show me what subscriptions I have',
      'is there a page for subscriptions',
      'where did my subs go',
    ],
    answer:
      'Your subscriptions are on the **Subscriptions** page. Two ways to get there:\n\n' +
      '- On **Home**, under **Where your money went**, tap **Subscriptions**.\n' +
      '- Go to **Settings → Your money → Subscriptions**.\n\n' +
      "The page shows what's due in the month, what's still **Coming up**, every running one under **All subscriptions**, and cancelled ones under **Cancelled**. Tap one to open its page, or the **+** at the top right to add one.",
    keywords: ['subscriptions page', 'subs', 'my subscriptions', 'streaming'],
    related: ['subscriptions.page', 'subscriptions.add.how', 'subscriptions.detail.page'],
    route: '/subscriptions',
  },

  // ---------------------------------------------------------------------------------------------
  // Adding a bill
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.add.how',
    topic: 'bills',
    title: 'How do I add a bill?',
    questions: [
      'How do I add a bill?',
      'add bill',
      'how do i put my rent in',
      'I want to add my electric bill',
      'how to add a recurring bill',
      'Where do I enter my phone bill?',
      'new bill',
      'how can i track my internet bill',
      'add a monthly payment',
      'how do i set up my bills',
      'steps to add a bill',
      'whats the fastest way to add a bill',
      'i pay my landlord every month how do i add that',
      'Monthly bills says No bills yet',
    ],
    answer:
      'Tap **Quick add → Bill** on **Home**, or the **+** on **Monthly bills**. Then:\n\n' +
      "1. Pick what it's for, like **Housing** or **Internet**. The tap takes you straight on.\n" +
      '2. Type the amount and tap **Continue**.\n' +
      "3. Fill in **Name**, **Payment on**, how often it's **Recurring**, **Paid with** and **Reminder**. **Note** is optional.\n" +
      '4. Tap **Save bill**.\n\n' +
      "You'll see **Bill added** at the bottom of the screen. Everything can be changed later from the bill's page.\n\n" +
      "Tip: for **Payment on**, pick the next date it's due. A date in the past makes Skip fill in every payment since then.",
    keywords: ['add bill', 'new bill', 'quick add', 'rent', 'utilities'],
    related: [
      'bills.add.categories',
      'bills.add.payment-on',
      'bills.add.missing',
      'bills.dates.past',
    ],
    route: '/add-bill',
  },
  {
    id: 'bills.add.categories',
    topic: 'bills',
    title: 'What do the bill categories mean?',
    questions: [
      'What do the bill categories mean?',
      'which category is my rent',
      'what goes under Other',
      'bill categories list',
      'Can I make my own bill category?',
      'there is no category for my bill',
      'where is Loans and Credit in the categories',
      'what happened to Family and Healthcare',
      'which category should gas go in',
      'what are the tiles when adding a bill',
      'custom category for bills',
      'is there a category for childcare or daycare',
    ],
    answer:
      'The first page of **Add a bill** asks "What’s this bill for?" with 10 tiles. Each says what it covers:\n\n' +
      '- **Housing**: rent, mortgage, HOA\n' +
      '- **Electricity & Gas**: power, heating, gas\n' +
      '- **Water & Waste**: water, sewer, trash\n' +
      '- **Internet**: broadband and Wi-Fi\n' +
      '- **Mobile Phone**: plans and devices\n' +
      '- **Insurance**: car, health, home, life\n' +
      '- **Transportation**: fuel, transit, tolls\n' +
      '- **Health & Medical**: doctor, dental, meds\n' +
      '- **Education**: tuition and courses\n' +
      '- **Other**: anything else\n\n' +
      "The category sets the bill's icon. You can't make your own, so use **Other** for anything that doesn't fit. Loans aren't here: add them on the **Loans** page. Bills filed under Family & Healthcare in an older version now show as **Health & Medical**.",
    keywords: ['category', 'categories', 'housing', 'utilities', 'other', 'tiles'],
    related: ['bills.edit.category', 'bills.add.how', 'bills.loans.in-bills'],
    route: '/add-bill',
  },
  {
    id: 'bills.add.name',
    topic: 'bills',
    title: "What do I put in the bill's Name?",
    questions: [
      "What do I put in the bill's Name?",
      'my electric company is not in the list',
      'how do i name a bill',
      'can I type my own name for a bill',
      'the name box only shows companies',
      'my landlord is not a company what do i type',
      'bill name field',
      'Why does the name box show company names?',
      'how do i rename a bill',
      'change the name of my bill',
      'what is the grey text in the name box',
    ],
    answer:
      "**Name** is what the bill is called everywhere in Skip, and it's required. Start typing, then either:\n\n" +
      "- Pick a company from the list. Its logo comes with it, and names you've used before are listed first.\n" +
      '- Or keep your own words. Tap the **Add** row at the bottom, like **Add “Landlord”**, or simply leave what you typed. It still counts as the name.\n\n' +
      'The grey hint changes with the category, for example "Rent, mortgage or your landlord" for **Housing**.\n\n' +
      "To rename a bill later, open it, tap the pencil, tap the **X** in the **Name** box and type the new name. If it's been paid before, Skip asks whether past payments should take the new name too.",
    keywords: ['name', 'company', 'rename', 'landlord', 'issuer'],
    related: ['bills.logo.change', 'bills.edit.past-or-upcoming', 'bills.edit.how'],
  },
  {
    id: 'bills.add.amount',
    topic: 'bills',
    title: 'How do I enter the amount of a bill?',
    questions: [
      'How do I enter the amount of a bill?',
      'how do i put cents in the amount',
      'what is the calculator button on the bill',
      'can I add two amounts together for one bill',
      'is there a maximum amount for a bill',
      'the continue button is greyed out on the amount',
      'can a bill be zero dollars',
      'how do I change the amount after saving',
      'amount keypad',
      'how much is the bill page',
      'can i enter a huge amount',
      'can i add up two things when i enter the amount of a bill',
      'add rent and parking together in the bill amount',
      'can i add numbers together when i type the bill amount',
      'is there a calculator when i type the bill amount',
      'combine rent and utilities into a single bill amount',
    ],
    answer:
      'Type it on the keypad, cents included, then tap **Continue**. On a bill, the **Calculator** button above the keypad lets you add things up first, like rent plus parking.\n\n' +
      '- The amount must be more than zero, so **Continue** stays off until you type one.\n' +
      '- Up to two decimals, and up to $999,999,999.99.\n' +
      '- To change it later, open the bill, tap the pencil, then tap the amount at the top of the page.\n\n' +
      'A subscription works the same way, without the **Calculator**. If the amount changes from month to month, use your usual amount and update it when it changes.',
    keywords: ['amount', 'calculator', 'keypad', 'cents', 'maximum'],
    related: ['bills.edit.amount-change', 'bills.amount.varies', 'bills.add.missing'],
  },
  {
    id: 'bills.add.payment-on',
    topic: 'bills',
    title: 'Which date do I pick for Payment on?',
    questions: [
      'Which date do I pick for Payment on?',
      'what does payment on mean',
      'what date should i put for my bill',
      'Do I put the first date I paid or the next one?',
      'payment on date',
      'is payment on the due date',
      'how do i set the due date of a bill',
      'what is Starts on instead of Payment on',
      'can i pick a future date for my bill',
      'the date box on the bill',
      'where do i see when my bill is due next',
      'why does payment on show a different date when I edit',
    ],
    answer:
      '**Payment on** is the date the bill is due next. Tap the box and pick a day on the calendar. Skip repeats it from there using your **Recurring** choice, so rent on the 1st stays on the 1st.\n\n' +
      '- Pick the next date it will go out if you want Skip to count from now.\n' +
      '- A future date is fine: nothing counts until it comes.\n' +
      '- A date in the past makes Skip record every payment since then as paid.\n\n' +
      "On the bill's page this date shows as **Next due**, and when you edit the bill the box shows that next date, not the first one. On a **Specific period** bill the box is called **Starts on** instead.",
    keywords: ['payment on', 'due date', 'next due', 'starts on', 'date'],
    related: [
      'bills.add.recurring',
      'bills.dates.past',
      'bills.edit.date-change',
      'bills.dates.month-end',
    ],
  },
  {
    id: 'bills.add.recurring',
    topic: 'bills',
    title: 'What do the Recurring options mean?',
    questions: [
      'What do the Recurring options mean?',
      'how often does my bill repeat',
      'what does every 3 months mean',
      'weekly monthly yearly bill options',
      'how do i make a bill yearly',
      'my insurance is paid once a year',
      'what is billing cycle on a subscription',
      'quarterly vs every 3 months',
      'how do I set a weekly bill',
      'recurring options',
      'does a monthly bill repeat on the same day',
      'which weekday does a weekly bill fall on',
      'how do i add an annual fee',
      'can i add a weekly bill',
      'my bill is paid quarterly',
      'my subscription is yearly',
    ],
    answer:
      "**Recurring** is how often the bill comes back. Pick one pill:\n\n- **Weekly**: every 7 days, on the same weekday as **Payment on**.\n- **Monthly**: the same day each month. New bills start with this one picked.\n- **Every 3 months**: the same day every third month, like 15 Jan, 15 Apr, 15 Jul and 15 Oct.\n- **Yearly**: once a year on that date.\n- **Specific period**: counted once, on its **Starts on** day. It doesn't repeat.\n\nSubscriptions have the same choices under **Billing cycle**, except **Specific period**, and every 3 months is called **Quarterly**. You can change it later with the pencil on the bill's page.",
    keywords: [
      'recurring',
      'billing cycle',
      'weekly',
      'monthly',
      'quarterly',
      'yearly',
      'annual',
      'frequency',
    ],
    related: ['bills.add.period', 'bills.schedule.odd', 'bills.month.due-figure'],
  },
  {
    id: 'bills.add.period',
    topic: 'bills',
    title: 'What is a Specific period bill?',
    questions: [
      'What is a Specific period bill?',
      'what does set period mean on my bill',
      'specific period option',
      'my bill only runs for 6 months',
      'does specific period charge every month between the dates',
      'why was my specific period bill only counted once',
      'what is the To date on a bill',
      'how do I give a bill an end date',
      'Clear make it ongoing what does that do',
      'can a bill end automatically after some payments',
      'ongoing no end date meaning',
      'bill with a start day and an end day',
      'set a start and end date for a bill',
      'what do the starts on and to fields do on a specific period bill',
      'add a bill with a start date and an end date',
      'bill that ends on a certain date',
    ],
    answer:
      '**Specific period** is for a payment that happens once, not on a schedule. Skip counts it one time, on its **Starts on** day.\n\n' +
      "- **Starts on** (required): the day it's paid.\n" +
      '- **To** (optional): the day it ends. On that day the bill moves to **Stopped**. Without one ("Ongoing — no end date") it stays under **All bills**. **Clear — make it ongoing** removes the end day.\n' +
      '- In lists it reads **Set period**.\n\n' +
      'It does not repeat between the two dates. For something monthly that ends on a known date, choose **Monthly** instead, and on its last day stop it with **Keep past charges**.',
    keywords: ['specific period', 'set period', 'end date', 'to', 'starts on', 'ongoing'],
    related: ['bills.add.recurring', 'bills.stop.how', 'bills.one-time'],
  },
  {
    id: 'bills.add.paid-with',
    topic: 'bills',
    title: 'What does Paid with mean?',
    questions: [
      'What does Paid with mean?',
      'what is Charged to on a subscription',
      'what does the Skip option in paid with do',
      'I pay my bill in cash what do I pick',
      'paid with is required?',
      'why do i have to pick a card for a bill',
      "my bill isn't paid with a card",
      'my second card is not in the paid with list',
      'which card pays this bill',
      'what happens if I choose Skip for paid with',
      'can I leave paid with empty',
      'paid with skip meaning',
      'i paid my rent with my credit card',
      'i pay my phone bill from my savings account',
      'what do i tap if the bill is not charged to one of my accounts',
      'what does paid with mean on a bill',
      'which tile do i tap under paid with on the bill form',
      'adding a bill i pay in cash, what do i select under paid with',
    ],
    answer:
      "**Paid with** says which card or bank account the bill comes out of. On a subscription it's called **Charged to**. You must tap one tile before saving:\n\n" +
      '- A card: each payment adds to what you owe on that card.\n' +
      "- A bank account: each payment comes out of that account's balance.\n" +
      '- **Skip**: not tied to any card or account, for cash or anything else. It still counts in your spending and **Current balance**.\n\n' +
      'Bills set to **Skip** show an **Add a card** link on **Monthly bills**, and their payments say **Card not set**.\n\n' +
      'On the free plan, only your first card and first bank account appear in this list. Bills already paid with another card keep using it.',
    keywords: ['paid with', 'charged to', 'skip', 'card', 'bank account', 'cash'],
    related: ['bills.balance.effect', 'bills.edit.card-change', 'bills.month.add-card'],
  },
  {
    id: 'bills.add.reminder',
    topic: 'bills',
    title: 'How does a bill reminder work?',
    questions: [
      'How does a bill reminder work?',
      'why do I have to choose a reminder',
      'can i get a notification before my bill is due',
      'remind me before rent is due',
      'what time does the bill reminder come',
      'what time does a subscription reminder arrive',
      'reminder options for a bill',
      'what does On the day mean for the reminder',
      'will skip remind me before netflix renews',
      'reminder required',
      'does skip need to be open to send reminders',
      'what does the bill reminder say',
      'how to be reminded before a bill is due',
      'how do i make skip nudge me before a bill is due',
      'turn on a reminder when adding a bill',
    ],
    answer:
      "Every bill and subscription asks for a **Reminder** before it saves. Pick **No reminder**, **On the day**, **1 day**, **3 days** or **1 week** before it's due (before it renews, for a subscription).\n\n" +
      'Pick anything but **No reminder** and a pill shows the time, **at 9:00 AM** to start. Tap it to choose another time.\n\n' +
      'The notification comes on that day, at or a little after that time in your own time zone (within about 15 minutes). It shows the name, when it\'s due and the amount, like "Due in 3 days · $50.00" or "Renews tomorrow · $15.00". Tapping it opens the bill.\n\n' +
      "It comes again before every new due date, and Skip doesn't need to be open. Stopped bills and cancelled subscriptions get no more reminders. Reminders are free on every plan.",
    keywords: ['reminder', 'notification', 'alert', 'remind me', 'no reminder', '9:00'],
    related: ['bills.reminder.change', 'bills.reminder.missing', 'bills.notifications.went-out'],
  },
  {
    id: 'bills.add.note',
    topic: 'bills',
    title: 'Can I add a note to a bill?',
    questions: [
      'write extra details about a subscription',
      'Can I add a note to a bill?',
      'where do i write the account number for my bill',
      'add a note to a subscription',
      'is the note required',
      'what is the note for',
      'can I write which plan I have',
      'where does the note show up',
      'how to edit a note on a bill',
      'bill note',
      'can i add a memo',
      'text field for a memo on a bill or subscription',
      'extra details on a bill, where do i type them',
      'is there a notes field on bills',
      'a comment on a bill',
      'where can i leave a comment on a subscription',
    ],
    answer:
      'Yes. You can add one on the bill or subscription form, while adding it or after tapping the pencil.\n\n1. Tap **Note**, which says **Add a note**.\n2. Type what you like ("Anything worth remembering" for a bill, "Which plan, for example" for a subscription).\n3. Tap **Done**.\n\nThe note is optional. It shows as **Note** on the bill\'s or subscription\'s page. To change or clear it, tap the pencil, tap **Note**, edit it and tap **Save changes**.',
    keywords: ['comment', 'note', 'memo', 'add a note'],
    related: ['bills.detail.page', 'bills.edit.how'],
  },
  {
    id: 'bills.add.missing',
    topic: 'bills',
    title: "Why won't my bill or subscription save?",
    questions: [
      "Why won't my bill or subscription save?",
      'it says to save this bill fill in',
      "bill won't save",
      'save subscription not working',
      'which fields are required for a bill',
      'what is required to add a subscription',
      'it keeps saying fill in reminder',
      'the end date cannot be before the start date',
      'save button does nothing',
      'it says something went wrong when saving my bill',
      'Enter how much it costs.',
      'Enter what it costs.',
    ],
    answer:
      '**Save** never greys out. It tells you what\'s missing instead, like "To save this bill, fill in: Paid with, Reminder."\n\n' +
      '- A bill needs **Amount**, **Name**, **Category**, **Payment on** (or **Starts on**), **Paid with** and **Reminder**.\n' +
      '- A subscription needs **Amount**, **Service**, **Next renewal**, **Charged to** and **Reminder**.\n\n' +
      "For **Paid with**, tap a card, an account or **Skip**. For **Reminder**, **No reminder** counts as an answer. **Note** is always optional. A **Specific period** bill can't have its **To** day before **Starts on**.\n\n" +
      'If it says "Something went wrong. Please try again." check your connection and tap Save again. What you filled in stays on the page.',
    keywords: ['save', 'required', 'fill in', 'missing', 'error', 'tap to add'],
    related: ['bills.add.paid-with', 'bills.add.reminder', 'bills.add.cancel'],
  },
  {
    id: 'bills.add.cancel',
    topic: 'bills',
    title: 'How do I leave a bill without saving?',
    questions: [
      'the back arrow while adding a bill or subscription',
      'what happens if I tap back halfway through adding a bill',
      'How do I leave a bill without saving?',
      'cancel adding this bill',
      'how do I get out of the add subscription page',
      'i started adding a bill by mistake',
      'what does the X do on the bill page',
      'Cancel editing this bill? what happens',
      'nothing you have entered here will be saved on my bill',
      'discard changes to a subscription',
      'go back without saving bill',
      'will the back arrow lose what i typed',
    ],
    answer:
      'Tap the **X** at the top. Skip asks "Cancel adding this bill?" (or "Cancel editing this bill?") and says "Nothing you have entered here will be saved." Tap **Yes** to leave, or **Go back** to keep going.\n\n' +
      'The back arrow steps back one page. While adding, it goes back to the keypad and keeps what you typed. On the first page of the form, it leaves without saving. Subscriptions work the same way. Nothing is saved until you tap **Save bill**, **Save subscription** or **Save changes**.',
    keywords: ['cancel', 'discard', 'close', 'x', 'leave'],
    related: ['bills.add.how', 'bills.edit.how'],
  },
  {
    id: 'bills.one-time',
    topic: 'bills',
    title: 'Can I add a one-time bill?',
    questions: [
      'Can I add a one-time bill?',
      'one off bill',
      'i only pay this once',
      'how do i add a bill that does not repeat',
      'single payment bill',
      'a medical bill i pay one time',
      'should a one time payment be a receipt or a bill',
      'non recurring bill',
      'add a bill with no repeat',
      'one-time payment reminder',
      'how do i log a repair bill i only pay once',
      'a bill that happens one time only, should it be a bill or a receipt',
      'plumber, dentist or repair invoice paid once, how do i add it',
      'one off bill, where does it go',
      'where does a one off bill go',
    ],
    answer:
      'Bills are made for payments that repeat. For a one-off you have two choices:\n\n' +
      "- Add it as a receipt with **Quick add → Receipt**. That's simplest for something already paid.\n" +
      '- Add it as a bill with **Recurring** set to **Specific period**. Skip counts it once, on its **Starts on** day, and you can still get a **Reminder** before it. Set **To** to the same day so it moves to **Stopped** afterwards.',
    keywords: ['one-time', 'one off', 'once', 'single payment'],
    related: ['bills.add.period', 'bills.add.recurring'],
  },

  // ---------------------------------------------------------------------------------------------
  // Adding a subscription
  // ---------------------------------------------------------------------------------------------
  {
    id: 'subscriptions.add.how',
    topic: 'subscriptions',
    title: 'How do I add a subscription?',
    questions: [
      'How do I add a subscription?',
      'add subscription',
      'how do i add netflix',
      'I want to track my spotify',
      'add my gym membership',
      'new subscription',
      'how to add a streaming service',
      'where do i put my apple music',
      'how can i track subscriptions in skip',
      'steps to add a subscription',
      'add disney plus',
      'set up my subscriptions',
      'Subscriptions says No subscriptions yet',
    ],
    answer:
      'Tap **Quick add → Subscription** on **Home**, or the **+** on **Subscriptions**. Then:\n\n' +
      '1. Type what it costs and tap **Continue**.\n' +
      '2. Under **Service**, start typing and pick it from the list, like Netflix. Its logo comes with it.\n' +
      '3. Pick the **Billing cycle**: **Weekly**, **Monthly**, **Quarterly** or **Yearly**.\n' +
      "4. Set **Next renewal**, the next date you'll be charged.\n" +
      '5. Pick **Charged to** (a card, an account or **Skip**) and a **Reminder**. **Note** is optional.\n' +
      '6. Tap **Save subscription**.\n\n' +
      "You'll see **Subscription added**. Everything can be changed later with the pencil on its page.",
    keywords: ['add subscription', 'new subscription', 'netflix', 'spotify', 'gym', 'quick add'],
    related: ['subscriptions.add.service', 'subscriptions.add.next-renewal', 'bills.add.missing'],
    route: '/add-subscription',
  },
  {
    id: 'subscriptions.add.service',
    topic: 'subscriptions',
    title: 'How do I pick the service for a subscription?',
    questions: [
      'How do I pick the service for a subscription?',
      'my service is not in the list',
      'what does Filed under mean',
      'can I change the category of a subscription',
      'how do i change which service it is',
      'search for a service box',
      'my local gym is not in the search',
      'why does it say filed under entertainment',
      'it asked looks like what does that mean',
      'type my own subscription name',
      'rename a subscription',
      'add a custom subscription',
      "my service isn't listed, how do i type my own",
    ],
    answer:
      'Type in the **Service** box ("Search for a service") and pick from the list. Services you\'ve used before come first, and picking one brings its logo.\n\n' +
      'Not in the list? Tap the **Add** row at the bottom, or just leave your typed words: they count as the name. Skip may then ask "Looks like…" to find a logo. Tap **Yes, that’s it**, **Not this one**, or a no-logo choice.\n\n' +
      "Under the box, **Filed under** shows the kind of spending Skip put it in, like Entertainment. Skip picks it from the service, and it can't be changed by hand.\n\n" +
      'To pick a different service, tap the **X** in the box.',
    keywords: ['service', 'filed under', 'category', 'search for a service'],
    related: ['subscriptions.add.how', 'bills.logo.change', 'subscriptions.edit.how'],
  },
  {
    id: 'subscriptions.add.next-renewal',
    topic: 'subscriptions',
    title: 'Which date do I pick for Next renewal?',
    questions: [
      'Which date do I pick for Next renewal?',
      'what is next renewal',
      'I am on a free trial how do I add it',
      'my subscription starts after a free trial',
      'what if I dont know when it renews',
      'next renewal is required?',
      'when does my tracked subscription renew',
      'what date do i put for spotify',
      'trial ends next week what date',
      'do i put the day i signed up',
      'renewal date for a subscription',
      'free trial subscription how do i add it',
      "my subscription's free trial ends soon, what date goes in next renewal",
      'free trial ends friday, which renewal date do i enter',
      'do i enter the trial end date or the sign up date for a subscription',
      'free week trial then it charges, what is the renewal date',
      'tracking a trial i will be charged for later, what do i put for next renewal',
    ],
    answer:
      "**Next renewal** is the next date you'll be charged, and it's required. Skip repeats it using the **Billing cycle**: the same day each week, month, quarter or year.\n\n" +
      '- Pick a future date to count from now. A past date makes Skip record every renewal since then as paid.\n' +
      "- On a free trial, pick the day the trial ends and enter the price you'll pay after it. Nothing counts until then.\n" +
      "- Not sure? Your last charge's day, moved forward one cycle, is usually right. You can change it later.\n\n" +
      "On the subscription's page it shows as **Next renewal**.",
    keywords: ['next renewal', 'renewal date', 'free trial', 'trial', 'renews'],
    related: ['bills.dates.past', 'bills.edit.date-change', 'subscriptions.add.how'],
  },

  // ---------------------------------------------------------------------------------------------
  // Detail pages and editing
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.detail.page',
    topic: 'bills',
    title: "What's on a bill's page?",
    questions: [
      "What's on a bill's page?",
      'what happens when i tap a bill',
      'what does Next due mean',
      'what is Paid from on my bill',
      'no payment method on my bill page',
      'what are the month and year buttons on the bill',
      'what is the Upcoming list on a bill',
      'what does Due mean under upcoming',
      'bill details page',
      'what does Started mean on a bill',
      'what is the Ends row',
      'what shows up when i tap a bill',
      "what information is on a bill's page",
      'tap on a bill, what is on the page',
      'what are the rows on a bill page like next due and started',
      'what is on the screen after i open a bill',
    ],
    answer:
      'Tap any bill to open its page. At the top: its logo or icon, the amount and how often it repeats. Then:\n\n' +
      "- **Next due**: the next date it's due\n" +
      '- **Paid from**: its card or account ("No payment method" when it\'s set to **Skip**)\n' +
      '- **Category**\n' +
      '- **Started**: the date Skip counts it from\n' +
      '- **Ends**: only on a bill with an end date\n' +
      '- **Note**, if it has one\n\n' +
      'Below, pick **Month** or **Year** (it opens on Year, this calendar year). **Paid** lists payments so far, with their count and total beside the heading. **Upcoming** lists dates still to come, each marked **Due**.\n\n' +
      'The pencil at the top right edits the bill. Tap the logo to change it.',
    keywords: ['bill page', 'details', 'next due', 'paid from', 'started', 'upcoming'],
    related: [
      'bills.edit.how',
      'bills.detail.no-charges',
      'bills.detail.total',
      'bills.edit.started-date',
    ],
  },
  {
    id: 'subscriptions.detail.page',
    topic: 'subscriptions',
    title: "What's on a subscription's page?",
    questions: [
      "What's on a subscription's page?",
      'what happens when i tap a subscription',
      'subscription details',
      'where do i see when netflix renews',
      'what does no date yet mean on my subscription',
      'what is Paid from on a subscription',
      'why is there no pencil on my subscription',
      'what does the month year switch do on a subscription',
      'subscription page shows paid and upcoming',
      'what does Started mean on a subscription',
      "what is shown on a subscription's page",
      'i tapped netflix in my list, what is all this on the page',
      'explain the page for one subscription',
      'subscription page, what do renewal, paid from and started mean',
      'what is on the screen after i open a subscription',
    ],
    answer:
      'Tap any subscription to open its page. At the top: its logo, the price and its billing cycle (or "Cancelled · last charged" and a date). Then:\n\n' +
      '- **Next renewal**: the next charge date ("No date yet" if it has none)\n' +
      '- **Paid from**: its card or account ("No payment method" when it\'s set to **Skip**)\n' +
      '- **Started**: the date Skip counts it from\n' +
      '- **Note**, if it has one\n\n' +
      'Below, pick **Month** or **Year**. **Paid** lists renewals so far with their count and total. **Upcoming** lists the ones still to come, marked **Due**.\n\n' +
      'The pencil at the top right edits it. A cancelled subscription has no pencil, only **Delete subscription** at the bottom.',
    keywords: ['subscription page', 'next renewal', 'paid from', 'details'],
    related: ['subscriptions.edit.how', 'subscriptions.cancelled.what', 'bills.detail.total'],
  },
  {
    id: 'bills.detail.no-charges',
    topic: 'bills',
    title: "Why does my bill's page show no payments?",
    questions: [
      "Why does my bill's page show no payments?",
      'no charges for this bill in this window',
      'no charges for this subscription in this window',
      'my bill page is empty',
      'the paid list is missing last year',
      'why are old payments missing from my bill',
      "the bill page doesn't show my first payment",
      'nothing under paid on my subscription',
      'older history is saved on my bill page',
      'where are the payments from last year for this bill',
    ],
    answer:
      '"No charges for this bill in this window" means nothing was paid or is due in the **Month** or **Year** you picked. Try the other chip.\n\n- A new bill has no payments until its first date comes.\n- **Month** and **Year** mean this calendar month and year, so last year\'s payments aren\'t here. Use **Payment history** and pick the year.\n- On the free plan the list shows the last 90 days. Older payments are kept, and **Older history is saved** appears just under the **Month** and **Year** chips. The count and total beside **Paid** still include them.',
    keywords: ['no charges', 'empty', 'missing payments', 'window'],
    related: ['bills.history.years', 'bills.history.free-limit', 'bills.detail.page'],
  },
  {
    id: 'bills.detail.total',
    topic: 'bills',
    title: 'How much have I paid on one bill?',
    questions: [
      'How much have I paid on one bill?',
      'how much have i spent on netflix this year',
      'total paid for my rent',
      'how much did my phone bill cost me last year',
      'see everything I paid to one company',
      'total for a single subscription',
      'how much have I paid in total for spotify',
      'yearly total of one bill',
      'sum of all payments for this bill',
      'how much has my gym cost me',
    ],
    answer:
      'For this year, open the bill or subscription and leave the chip on **Year**. The count and total sit beside the **Paid** heading.\n\n' +
      'For other years, open **Payment history**, tap **Search payments** and type its name. Results are grouped by year, and each year shows its total and how many payments.\n\n' +
      'On the free plan, the totals count every payment, but the rows only go back 90 days.',
    keywords: ['total', 'how much', 'spent on', 'sum', 'yearly total'],
    related: ['bills.detail.page', 'bills.search.how', 'bills.history.page'],
  },
  {
    id: 'bills.edit.how',
    topic: 'bills',
    title: 'How do I edit a bill?',
    questions: [
      "fix details on a bill I've already made",
      'can I still make changes to a bill I made earlier',
      'How do I edit a bill?',
      'change my bill',
      'edit bill',
      'how do i fix a mistake on my rent bill',
      'where is the edit button for a bill',
      'how do i update a bill',
      'I made a typo in my bill',
      'pencil on bill page',
      'can I change a bill after saving it',
      'tapping a bill does not let me edit it',
      'bill updated message',
      'how can i change the details of a bill i already saved',
      'is it possible to modify an existing bill',
      'where is the button to edit a saved bill',
      'is a bill still editable after i save it',
      'edit a bill after it has been created',
    ],
    answer:
      '1. Open **Monthly bills** and tap the bill. Its page opens.\n' +
      '2. Tap the pencil at the top right. **Edit bill** opens with everything filled in.\n' +
      '3. Tap the amount at the top to change it, tap **Category** or **Note** to open their pages, or change the boxes and pills right there.\n' +
      '4. Tap **Save changes**.\n\n' +
      "If you changed the name, amount or **Paid with** and the bill has been paid before, Skip asks whether past payments should change too. You'll see **Bill updated** when it's saved.\n\n" +
      "Stopped bills have no pencil and can't be edited. A loan opens its own loan page, which you edit from there.",
    keywords: ['edit', 'change', 'pencil', 'update', 'fix'],
    related: [
      'bills.edit.past-or-upcoming',
      'bills.edit.amount-change',
      'bills.edit.date-change',
      'bills.edit.card-change',
    ],
  },
  {
    id: 'subscriptions.edit.how',
    topic: 'subscriptions',
    title: 'How do I edit a subscription?',
    questions: [
      'How do I edit a subscription?',
      'change my subscription',
      'edit subscription',
      'how do i update netflix price',
      'change the renewal date of my subscription',
      'how do I switch a subscription from monthly to yearly',
      'fix a subscription I added wrong',
      'where is the pencil for subscriptions',
      'can I edit a cancelled subscription',
      'subscription updated',
      'change what card netflix is charged to',
    ],
    answer:
      '1. Open **Subscriptions** and tap it. Its page opens.\n' +
      '2. Tap the pencil at the top right. **Edit subscription** opens.\n' +
      '3. Change the amount (tap it at the top), **Service**, **Billing cycle**, **Next renewal**, **Charged to**, **Reminder**, **Note** or **Status**.\n' +
      '4. Tap **Save changes**.\n\n' +
      "If you changed the name, amount or card and it has been charged before, Skip asks whether to change past charges too. You'll see **Subscription updated**.\n\n" +
      "Cancelled subscriptions can't be edited. Their page has no pencil.",
    keywords: ['edit subscription', 'change subscription', 'pencil', 'billing cycle'],
    related: [
      'bills.edit.past-or-upcoming',
      'bills.edit.amount-change',
      'subscriptions.cancel.how',
    ],
  },
  {
    id: 'bills.edit.past-or-upcoming',
    topic: 'bills',
    title: 'What do Past and upcoming and Upcoming only do?',
    questions: [
      'What do Past and upcoming and Upcoming only do?',
      'change past charges too?',
      'it asked me change past charges too what should i pick',
      'past and upcoming meaning',
      'upcoming only meaning',
      'will editing my bill change old months',
      'does changing the amount change my history',
      'why did skip ask about past charges',
      'I changed the amount and my old months changed',
      'how do i fix the amount for all past payments',
      'edit only future payments',
      'why didnt it ask about past charges when I changed the date',
      'Rent has already been charged 4 times. Change those as well, or only the ones still to come?',
    ],
    answer:
      'When you edit a bill or subscription that has been paid before, and you changed its name, amount or card, Skip asks "Change past charges too?"\n\n' +
      '- **Past and upcoming**: every payment already recorded takes the new name, amount and card. Use it to fix a mistake, like a typo.\n' +
      '- **Upcoming only**: past payments stay as they were. Only payments from now on use the new details. Use it when the price really changed.\n' +
      '- **Cancel**: nothing is saved.\n\n' +
      'Example: rent of $1,000 paid 3 times, now $1,100. **Upcoming only** keeps $3,000 in past months. **Past and upcoming** makes it $3,300, and your balances change to match.\n\n' +
      'Changing only the date, category, cycle, reminder or note never asks, because past payments keep their own dates.',
    keywords: ['past and upcoming', 'upcoming only', 'change past charges', 'history'],
    related: ['bills.edit.amount-change', 'bills.edit.card-change', 'bills.paid.one-payment'],
  },
  {
    id: 'bills.edit.amount-change',
    topic: 'bills',
    title: 'My bill or subscription price changed',
    questions: [
      'My bill or subscription price changed',
      'netflix raised its price',
      'my rent went up how do I update it',
      'price increase on my subscription',
      'how do i change the amount of a bill',
      'my phone bill got cheaper',
      'update subscription price without changing old months',
      'the bill amount is wrong now',
      'insurance renewal is more expensive this year',
      'how to change monthly amount',
      'my gym put the price up',
    ],
    answer:
      'Update the amount and keep the old months as they were:\n\n' +
      '1. Open the bill or subscription and tap the pencil.\n' +
      '2. Tap the amount at the top, type the new one and tap **Done**.\n' +
      '3. Tap **Save changes**.\n' +
      '4. When Skip asks "Change past charges too?", tap **Upcoming only**.\n\n' +
      'Payments already recorded keep the old price. Every payment from now on uses the new one. Change it before the next due date so that payment gets the new price.\n\n' +
      'If the old amount was simply wrong from the start, pick **Past and upcoming** instead.',
    keywords: ['price change', 'price increase', 'went up', 'new amount', 'raise'],
    related: ['bills.edit.past-or-upcoming', 'bills.amount.varies', 'bills.paid.one-payment'],
  },
  {
    id: 'bills.amount.varies',
    topic: 'bills',
    title: 'My bill is a different amount each month',
    questions: [
      'My bill is a different amount each month',
      'my electric bill changes every month',
      'variable bill amount',
      'how do i track a bill that is never the same',
      'water bill different each time',
      'can i set a different amount for each month',
      'my power bill is higher in winter',
      'what amount should I put for a changing bill',
      'utility bill amount varies',
      'can skip use the real amount each month',
    ],
    answer:
      'Skip keeps one amount per bill, and each payment uses the amount the bill has on its due date. For bills that change, like power or water:\n\n' +
      "- Use your usual or average amount, so the month's total stays close.\n" +
      '- When a new bill arrives, change the amount before its due date and choose **Upcoming only**. That payment gets the new amount and past months stay as they were.\n\n' +
      "Once a payment is recorded, you can't change that one month alone. If you'd like a different amount for each month, tell us in **Settings → Support and feedback → Share an idea**.",
    keywords: ['variable', 'different amount', 'changes', 'utilities', 'average'],
    related: ['bills.edit.amount-change', 'bills.paid.one-payment', 'bills.edit.past-or-upcoming'],
  },
  {
    id: 'bills.edit.date-change',
    topic: 'bills',
    title: 'How do I change when a bill is due?',
    questions: [
      'changed my rent due day and the next one jumped to next month',
      'How do I change when a bill is due?',
      'change the due date of my bill',
      'my rent moved from the 1st to the 15th',
      'how do i change the renewal day of a subscription',
      'I picked the wrong date for my bill',
      'move bill to another day',
      'why did changing the date skip this month',
      'changed the date and the next payment is next month',
      'my bill now comes out on a different day',
      'edit next renewal date',
    ],
    answer:
      "Change the date in **Payment on**.\n\n1. Open the bill and tap the pencil.\n2. Tap **Payment on** and pick the new date.\n3. Tap **Save changes**.\n\nFor a subscription, change **Next renewal** the same way. Skip doesn't ask about past payments, because they keep the dates they went out on.\n\nSkip never charges the same month twice (or week, quarter or year). If this month's payment is already recorded and you move the date later in the month, the new date starts next month.\n\nExample: rent recorded on 1 October, moved to the 15th. The next payment is 15 November, not 15 October.",
    keywords: ['due date', 'change date', 'payment on', 'next renewal', 'move'],
    related: ['bills.edit.started-date', 'bills.add.payment-on', 'bills.dates.month-end'],
  },
  {
    id: 'bills.edit.started-date',
    topic: 'bills',
    title: 'Why does Started show a date I didn’t pick?',
    questions: [
      'Why does Started show a date I didn’t pick?',
      'started date is wrong on my bill',
      'why does my bill say started next month',
      'the started row changed after i edited',
      'started date different from payment on',
      'what is the started date on a subscription',
      'my subscription started date moved',
      'why is started after my first payment',
      'started shows the 1st of next month',
      'started date meaning',
    ],
    answer:
      "**Started** is the first date Skip counts the bill or subscription from. When you add one, it's the date you picked.\n\nOnce it has been paid at least once, saving any edit moves **Started** forward, even if you only changed the note. That stops the same month (or week, quarter or year) being charged twice:\n\n- A bill's **Started** becomes its next due date, or the start of the next month (or week, quarter or year) if that date is still in one already paid.\n- A subscription's **Started** becomes the start of the month (or week, quarter or year) after its last payment, often the 1st of next month.\n\nYour past payments stay as they are, in your history and balances.\n\nPicking an earlier **Next renewal** on a subscription that hasn't been charged yet can move **Started** earlier too, and Skip then fills in the renewals between.",
    keywords: ['started', 'start date', 'counts from'],
    related: ['bills.edit.date-change', 'bills.detail.page', 'bills.dates.past'],
  },
  {
    id: 'bills.edit.card-change',
    topic: 'bills',
    title: 'How do I change the card a bill is paid with?',
    questions: [
      'How do I change the card a bill is paid with?',
      'I got a new credit card how do i move my bills',
      'switch subscription to another card',
      'change paid with on a bill',
      'move netflix to my debit card',
      'my bill now comes out of my bank account',
      'change charged to',
      'will changing the card move my old payments',
      'bill on the wrong card',
      'my card expired update bills',
    ],
    answer:
      'Open the bill, tap the pencil, tap a different card or account under **Paid with** (**Charged to** on a subscription), then **Save changes**.\n\n' +
      'If it has been paid before, Skip asks "Change past charges too?"\n\n' +
      '- **Upcoming only**: past payments stay on the old card, new ones go on the new card. Use this when you really switched cards.\n' +
      "- **Past and upcoming**: every past payment moves to the new card too, so both cards' balances change.\n\n" +
      'On the free plan, only your first card and first bank account appear in the list.',
    keywords: ['change card', 'new card', 'switch card', 'paid with', 'charged to'],
    related: ['bills.edit.past-or-upcoming', 'bills.balance.effect', 'bills.card-deleted'],
  },
  {
    id: 'bills.edit.category',
    topic: 'bills',
    title: "How do I change a bill's category?",
    questions: [
      "How do I change a bill's category?",
      'wrong category on my bill',
      'move my bill to another category',
      'change bill from other to housing',
      'how do i change the icon of a bill',
      'edit category',
      'i put my bill in the wrong category',
      'recategorize a bill',
      'change bill type',
      'my bill shows the wrong icon',
      'how can i change what kind of bill this is',
      'how do i change the type of a bill',
      'my internet bill is under the wrong group, how do i move it',
      'change the kind of a bill, like from utilities to housing',
      'reassign my bill to a new category tile',
    ],
    answer:
      "Change it from the bill's form.\n\n1. Open the bill and tap the pencil.\n2. Tap **Category** and pick a new tile. You're taken straight back to the form.\n3. Tap **Save changes**.\n\nThe category sets the bill's icon, unless it shows a company logo. It never changes amounts or dates, and Skip doesn't ask about past payments for it.",
    keywords: ['category', 'change category', 'icon', 'wrong category'],
    related: ['bills.add.categories', 'bills.logo.change', 'bills.edit.how'],
  },

  // ---------------------------------------------------------------------------------------------
  // Deleting, stopping, cancelling
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.delete.how',
    topic: 'bills',
    title: 'How do I delete a bill?',
    questions: [
      'How do I delete a bill?',
      'delete bill',
      'remove a bill',
      'how do i get rid of a bill',
      'where is the delete button for bills',
      'I want to remove my old rent',
      'how to erase a bill',
      'bill deleted',
      'delete a bill I added by mistake',
      'trash a bill',
      "can't find delete on my bill",
    ],
    answer:
      '1. Open the bill from **Monthly bills**.\n' +
      '2. Tap the pencil at the top right.\n' +
      '3. Tap **Delete bill**, under **Save changes**.\n' +
      '4. Choose:\n\n' +
      '- Never paid yet: Skip asks "Delete Rent?" with "This can’t be undone." Tap **Delete**.\n' +
      '- Paid before: **Keep past charges** stops it today and keeps its history. **Remove everything** deletes it and every past payment.\n\n' +
      "You'll see **Bill stopped** or **Bill deleted**. A stopped bill has **Delete bill** at the bottom of its own page.",
    keywords: ['delete', 'remove', 'trash', 'erase'],
    related: ['bills.delete.choices', 'bills.stop.how', 'bills.stopped.delete'],
  },
  {
    id: 'subscriptions.delete.how',
    topic: 'subscriptions',
    title: 'How do I delete a subscription?',
    questions: [
      'How do I delete a subscription?',
      'delete subscription',
      'remove netflix from skip',
      'how do i get rid of a subscription',
      'delete a subscription I added twice',
      'subscription deleted',
      'erase a subscription',
      'where is delete subscription',
      'remove a cancelled subscription from the list',
      'take a subscription off the app',
    ],
    answer:
      '1. Open it from **Subscriptions**.\n' +
      '2. Tap the pencil.\n' +
      '3. Tap **Delete subscription**, under **Save changes**.\n' +
      '4. Choose:\n\n' +
      '- Never charged yet: tap **Delete** ("This can’t be undone.").\n' +
      '- Charged before: **Keep past charges** cancels it and keeps its history. **Remove everything** deletes it with all its past payments and its reminder.\n\n' +
      "You'll see **Subscription cancelled** or **Subscription deleted**. To delete one that's already cancelled, open it and tap **Delete subscription** at the bottom of its page, then **Remove everything** (or **Delete** if it was never charged).",
    keywords: ['delete subscription', 'remove subscription', 'erase'],
    related: ['bills.delete.choices', 'subscriptions.cancel.how', 'subscriptions.cancelled.what'],
  },
  {
    id: 'bills.delete.choices',
    topic: 'bills',
    title: 'Keep past charges or Remove everything?',
    questions: [
      'which delete option should I pick for a bill I stopped paying',
      'Keep past charges or Remove everything?',
      'what does keep past charges do',
      'what does remove everything do',
      'if i delete a bill will my history disappear',
      'will deleting a subscription change my balance',
      'delete asks keep them in your history or remove them',
      'nothing after today is recorded meaning',
      'which one should i pick when deleting',
      'does remove everything change past months',
      'delete bill but keep history',
      'can i undo remove everything',
      'deleting a bill that was paid in the past, do old payments stay',
      'will past payments vanish if i remove a bill',
      'if i delete a bill, what happens to payments made already',
      'when i delete a bill that already has payments, what happens to them',
      'deleting a bill with earlier payments: do those stay in my history',
    ],
    answer:
      'When you delete a bill or subscription that has been paid before, Skip says how many past payments it has and asks what to do with them. Either way, nothing after today is recorded.\n\n' +
      '- **Keep past charges**: it stops today. Past payments stay in your history, your balances and **Payment history**. A bill moves to **Stopped**, a subscription to **Cancelled**. For a bill, a payment due today still counts.\n' +
      "- **Remove everything**: it is deleted with all its past payments and its reminder. Past months, card balances and your **Current balance** change as if it never existed. This can't be undone.\n" +
      '- **Cancel**: nothing changes.\n\n' +
      'If you just stopped paying it, **Keep past charges** is the safe choice.',
    keywords: ['keep past charges', 'remove everything', 'delete', 'history'],
    related: ['bills.delete.how', 'bills.stopped.what', 'bills.stopped.restart'],
  },
  {
    id: 'bills.stop.how',
    topic: 'bills',
    title: 'How do I stop a bill but keep its history?',
    questions: [
      'How do I stop a bill but keep its history?',
      "I don't pay this bill anymore",
      'stop a bill',
      'end a bill',
      'i moved out how do i stop my rent',
      'my loan or contract ended stop the bill',
      'how to finish a bill without deleting it',
      'bill stopped',
      'archive a bill',
      'hide a bill i no longer pay',
      'stop tracking a bill',
    ],
    answer:
      'Stopping ends the bill today and keeps every past payment:\n\n' +
      '1. Open the bill and tap the pencil.\n' +
      '2. Tap **Delete bill**.\n' +
      '3. Tap **Keep past charges**.\n\n' +
      "You'll see **Bill stopped**. It moves to the **Stopped** section at the bottom of **Monthly bills**, with the date it stopped. Nothing after today is counted or reminded.\n\n" +
      "If the bill has never been paid, there's no history to keep, so Skip only offers to delete it. There's no way to hide a running bill.",
    keywords: ['stop', 'end', 'finish', 'archive', 'no longer pay'],
    related: ['bills.stopped.what', 'bills.delete.choices', 'bills.stopped.restart'],
  },
  {
    id: 'bills.stopped.what',
    topic: 'bills',
    title: 'What does Stopped mean on a bill?',
    questions: [
      'What does Stopped mean on a bill?',
      'what is the stopped section',
      'stopped on date meaning',
      'why is my bill in stopped',
      'why cant i edit a stopped bill',
      'there is no pencil on my bill',
      'my bill moved to stopped by itself',
      'paid off on date in bills',
      'does a stopped bill still count',
      'why is a stopped bill in this months total',
    ],
    answer:
      'A stopped bill no longer runs: nothing new is counted and no reminders are sent. Its past payments stay in your history.\n\n' +
      'A bill stops when you pick **Keep past charges** while deleting it, or when a **Specific period** bill reaches its **To** day. A loan that is paid off shows **Paid off on** and the date.\n\n' +
      "Stopped bills sit at the bottom of **Monthly bills**, newest first. They only add to a month's figure if they were paid in that month before stopping.\n\n" +
      'Stopped is final. Its page has no pencil, only **Delete bill** at the bottom.',
    keywords: ['stopped', 'stopped on', 'paid off', 'final', 'read only'],
    related: ['bills.stopped.restart', 'bills.stopped.delete', 'bills.stop.how'],
  },
  {
    id: 'bills.stopped.restart',
    topic: 'bills',
    title: 'Can I restart a stopped bill or subscription?',
    questions: [
      'Can I restart a stopped bill or subscription?',
      'undo stop bill',
      'reactivate a cancelled subscription',
      'i resubscribed to netflix',
      'bring back a deleted bill',
      'i stopped the wrong bill',
      'how do I make a cancelled subscription active again',
      'restore a deleted subscription',
      'turn a stopped bill back on',
      'started paying again',
      'undo delete',
    ],
    answer:
      "No. Stopped bills and cancelled subscriptions are final, and deleted ones can't be brought back.\n\n" +
      'To start paying again, add it as new with **Quick add → Bill** or **Subscription**. The old one keeps its history in **Stopped** or **Cancelled**, and the new one starts fresh.\n\n' +
      "Tip: for the date, pick the next one it's due. A past date fills in payments you may not have made.",
    keywords: ['restart', 'reactivate', 'undo', 'resubscribe', 'restore'],
    related: ['bills.stopped.what', 'subscriptions.cancelled.what', 'bills.dates.past'],
  },
  {
    id: 'bills.stopped.delete',
    topic: 'bills',
    title: 'How do I remove a stopped bill from the list?',
    questions: [
      'How do I remove a stopped bill from the list?',
      'delete a stopped bill',
      'get rid of the stopped section',
      'remove old bills from stopped',
      'clear cancelled subscriptions',
      'the delete on a stopped bill only offers remove everything',
      'stopped bills cluttering my page',
      'can I hide stopped bills but keep the history',
      'delete bill at the bottom of a stopped bill',
      'remove cancelled from subscriptions page',
    ],
    answer:
      'Open it from **Stopped** (or **Cancelled**) and tap **Delete bill** (or **Delete subscription**) at the bottom of its page.\n\n' +
      'If it was paid before, Skip asks again. **Remove everything** deletes it with all its past payments, so past months and balances change. **Keep past charges** leaves it exactly as it is.\n\n' +
      "There's no way to hide it from the list and still keep its history.",
    keywords: ['stopped', 'cancelled', 'remove', 'clear', 'hide'],
    related: ['bills.delete.choices', 'bills.stopped.what', 'subscriptions.cancelled.what'],
  },
  {
    id: 'subscriptions.cancel.how',
    topic: 'subscriptions',
    title: 'How do I cancel a subscription in Skip?',
    questions: [
      'How do I cancel a subscription in Skip?',
      'cancel a subscription i track in skip',
      'I cancelled netflix how do i update skip',
      'mark subscription as cancelled',
      'what does the Status row do',
      'active or cancelled status',
      'stop a subscription',
      'subscription cancelled message',
      'i unsubscribed from spotify',
      'end my gym membership in the app',
      'how to stop tracking a subscription',
      'i quit a subscription, how do i update it in skip',
      'i quit my gym membership, how do i show it in skip',
      'i stopped paying for spotify, how do i show that in skip',
      'tell skip i ended a subscription',
      'remove a subscription i no longer pay for but keep its history',
    ],
    answer:
      'There are two ways, and both keep its past payments:\n\n' +
      '- Open it, tap the pencil, set **Status** to **Cancelled**, then tap **Save changes**.\n' +
      '- Or, if it has been charged before, tap the pencil, then **Delete subscription**, then **Keep past charges**.\n\n' +
      'You\'ll see **Subscription cancelled**. It moves to the **Cancelled** section at the bottom of **Subscriptions**, reading "Cancelled · last charged" and the date. Nothing new is counted and no reminders come.\n\n' +
      'This only stops tracking in Skip. To stop being charged, cancel with the company too.',
    keywords: ['cancel', 'status', 'cancelled', 'unsubscribe', 'stop subscription'],
    related: [
      'subscriptions.cancelled.what',
      'subscriptions.cancel.company',
      'bills.delete.choices',
    ],
  },
  {
    id: 'subscriptions.cancelled.what',
    topic: 'subscriptions',
    title: 'What does Cancelled mean on a subscription?',
    questions: [
      'cancelled subscription still listed',
      'What does Cancelled mean on a subscription?',
      'cancelled last charged meaning',
      'what is the cancelled section',
      'why is my subscription greyed out',
      'does a cancelled subscription still count',
      'why is a cancelled subscription in this months total',
      'cancelled subscription has no edit button',
      'last charged date',
      'my subscription says cancelled',
      'where do cancelled subscriptions go',
    ],
    answer:
      'A cancelled subscription counts nothing new and sends no reminders. Its past payments stay in your history and balances.\n\n' +
      '- It sits in the **Cancelled** section at the bottom of **Subscriptions**, with "Cancelled · last charged" and the date of its last payment.\n' +
      '- Its page says the same under the price, has no pencil, and has **Delete subscription** at the bottom.\n' +
      "- It only adds to a month's figure if it was charged in that month before you cancelled.\n\n" +
      'Cancelled is final. To start it again, add it as a new subscription.',
    keywords: ['cancelled', 'last charged', 'inactive'],
    related: ['bills.stopped.restart', 'bills.stopped.delete', 'subscriptions.cancel.how'],
  },
  {
    id: 'subscriptions.pause',
    topic: 'subscriptions',
    title: 'Can I pause a subscription?',
    questions: [
      'Can I pause a subscription?',
      'pause subscription',
      'i paused my gym for two months',
      'skip a month of my subscription',
      'freeze a subscription',
      'my subscription is on hold',
      'temporarily stop netflix',
      'can I move the renewal date to skip months',
      'subscription paused by the company',
      'hold a subscription',
    ],
    answer:
      "There's no pause. If you've paused it with the company:\n\n" +
      '1. Cancel it in Skip: pencil → **Status** → **Cancelled** → **Save changes**. Its past payments stay.\n' +
      '2. When it starts again, add it as a new subscription with its next renewal date.\n\n' +
      "Moving **Next renewal** later doesn't skip the months in between, so cancelling is the way to stop it counting. To ask for a pause option, use **Settings → Support and feedback → Share an idea**.",
    keywords: ['pause', 'hold', 'freeze', 'skip a month'],
    related: ['subscriptions.cancel.how', 'bills.stopped.restart'],
  },

  // ---------------------------------------------------------------------------------------------
  // Paid, late, one payment, dates
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.paid.how-marked',
    topic: 'bills',
    title: 'How does Skip know my bill is paid?',
    questions: [
      'How does Skip know my bill is paid?',
      'how do i mark a bill as paid',
      'why does it say paid when i havent paid yet',
      'my bill says paid but it has not come out of my bank',
      'is there a paid button',
      'does skip know when my autopay goes through',
      'why does a bill due today already say paid',
      'mark as unpaid',
      'where is paid late',
      'how does it record my bill payments',
      'my bill shows paid automatically',
      'when does a bill count as paid',
      "why does activity show bills i haven't paid yet",
    ],
    answer:
      "Skip isn't connected to your bank, so it can't see the payment. Instead it records each bill as paid on its due date, with the amount and card the bill had that day.\n\n" +
      '- A bill due today already counts as **Paid**.\n' +
      "- Every past payment says **Paid**. Skip doesn't track late payments.\n" +
      "- There's no button to mark a bill paid or unpaid.\n" +
      '- You get a "went out" notification when it\'s recorded.\n\n' +
      "That's why your **Current balance** drops on the due date. If a bill really comes out on another day, change its date with the pencil on its page.",
    keywords: ['paid', 'mark as paid', 'autopay', 'unpaid', 'paid late'],
    related: ['bills.paid.one-payment', 'bills.notifications.went-out', 'bills.balance.effect'],
  },
  {
    id: 'bills.paid.one-payment',
    topic: 'bills',
    title: 'Can I change or remove one payment?',
    questions: [
      'Can I change or remove one payment?',
      'I paid my bill late this month',
      'i paid early how do i change that',
      'I skipped a month how do I remove that payment',
      'delete one payment from a bill',
      'last month was a different amount',
      'edit a single charge',
      'one payment is wrong',
      'remove a charge from history',
      'i did not pay rent in august but it shows paid',
      'change the date of one payment',
    ],
    answer:
      "Not one on its own. Each past payment is kept as it was recorded, so you can't move, delete or change a single month.\n\n" +
      'What you can do:\n\n' +
      '- **Different date from now on**: change **Payment on** with the pencil.\n' +
      '- **New amount from now on**: change the amount and choose **Upcoming only**.\n' +
      '- **Every past payment was wrong**: change it and choose **Past and upcoming**.\n' +
      "- **You won't pay it again**: stop it with **Keep past charges**.\n" +
      '- **None of it should have counted**: delete it with **Remove everything**.\n\n' +
      "If you'd like to edit single payments, tell us in **Settings → Support and feedback → Share an idea**.",
    keywords: ['one payment', 'single charge', 'skipped month', 'late', 'early'],
    related: ['bills.edit.past-or-upcoming', 'bills.delete.choices', 'bills.paid.how-marked'],
  },
  {
    id: 'bills.dates.past',
    topic: 'bills',
    title: 'What happens if I pick a date in the past?',
    questions: [
      'What happens if I pick a date in the past?',
      'I added my rent with a date from months ago',
      'skip recorded payments before I started using it',
      'why are there old payments on a bill i just added',
      'my new bill already has three payments',
      'backdate a bill',
      'past date on a subscription',
      'my balance dropped a lot after adding a bill',
      'wrong start date filled in old months',
      'can i add bills from earlier this year',
      'how do I remove payments from before I added the bill',
    ],
    answer:
      'Skip treats every payment from that date up to today as already paid, and records each one.\n\n' +
      'Example: on 13 October you add $1,000 monthly rent with **Payment on** 1 August. Skip records 1 August, 1 September and 1 October, so $3,000 counts as spent, and the next one is due 1 November.\n\n' +
      "Those payments lower your **Current balance**, unless they're from before the day you entered your card's or account's balance. A subscription's **Next renewal** works the same way.\n\n" +
      "If you only want Skip to count from now, pick the next date it's due. Added it with the wrong past date? Delete it with **Remove everything** and add it again. Changing the date afterwards won't remove payments already recorded.",
    keywords: ['past date', 'backdate', 'old payments', 'backfill', 'earlier'],
    related: ['bills.add.payment-on', 'bills.balance.effect', 'bills.delete.choices'],
  },
  {
    id: 'bills.dates.month-end',
    topic: 'bills',
    title: 'What if a bill is due on the 29th, 30th or 31st?',
    questions: [
      'What if a bill is due on the 29th, 30th or 31st?',
      'my rent is due on the 31st what about february',
      'bill due on the last day of the month',
      'what happens in months with 30 days',
      'leap year bill on february 29',
      'my bill moved from the 31st to the 30th',
      'why is my due date now the 28th',
      'end of month bill',
      'short month due date',
      'yearly bill on 29 feb',
    ],
    answer:
      "In a month without that day, Skip uses the month's last day, then goes back to your day the month after. A bill due on the 31st is counted on 31 March, 30 April and 31 May, and on 28 February (29 February in a leap year). A yearly bill on 29 February is counted on 28 February in other years and on the 29th again in a leap year. Subscriptions, loan payments and bills set to **Every 3 months** work the same way.\n\n" +
      "So **Next due** can show the 30th or the 28th in a short month; the month after, it's back on your day. If you set **Payment on** to a new date, that's the day Skip keeps from then on.\n\n" +
      'Tip: a date from the 1st to the 28th never shifts.',
    keywords: ['31st', '30th', '29th', 'end of month', 'february', 'leap year', 'last day'],
    related: ['bills.edit.date-change', 'bills.add.payment-on', 'bills.dates.weekend'],
  },
  {
    id: 'bills.dates.weekend',
    topic: 'bills',
    title: 'Does Skip move a bill due on a weekend?',
    questions: [
      'bill due on a saturday or sunday, which day does skip use',
      'Does Skip move a bill due on a weekend?',
      'my bill is due on a sunday',
      'bank holiday bill date',
      'my bank takes payment on the next business day',
      'weekend due date',
      'does skip know bank holidays',
      'bill came out monday but skip says saturday',
      'business days for bills',
      'holiday payment date',
      'will my bill shift if it falls on a saturday',
    ],
    answer:
      "No. Skip counts every bill on the exact date it's set to, weekends and holidays included. It doesn't know your bank's working days.\n\n" +
      'If your bill usually goes out on a different day, set **Payment on** to that day instead. Skip repeats whatever date you pick.',
    keywords: ['weekend', 'holiday', 'business day', 'saturday', 'sunday'],
    related: ['bills.edit.date-change', 'bills.paid.how-marked', 'bills.dates.month-end'],
  },
  {
    id: 'bills.schedule.odd',
    topic: 'bills',
    title: 'What if my bill is every 2 months or twice a month?',
    questions: [
      'What if my bill is every 2 months or twice a month?',
      'my water bill is every two months',
      'bi-monthly bill',
      'biweekly bill every 2 weeks',
      'paid twice a month on the 1st and 15th',
      'every 6 months insurance',
      'fortnightly payment',
      'my bill is irregular',
      'semi annual bill',
      'is there an every two weeks option',
      'custom repeat for a bill',
      'my bill comes twice a month, which repeat option do i use',
      'a bill that comes two times a month',
      'bill comes twice per month on different days, how do i add it',
      'there is no twice monthly option, what do i do',
      'my bill is every two weeks, how do i add it as a bill',
    ],
    answer:
      'Skip repeats bills **Weekly**, **Monthly**, **Every 3 months** or **Yearly**. For other patterns:\n\n' +
      '- **Twice a month** (like the 1st and 15th): add two **Monthly** bills, one for each date.\n' +
      "- **Every 2 weeks**: add it as **Weekly** at half the amount. Totals come out the same, though the dates won't match exactly.\n" +
      "- **Every 2 months**: add six **Yearly** bills, one for each month it's due, so every date is exact. Or add one **Monthly** bill at half the amount.\n" +
      '- **Every 6 months**: add two **Yearly** bills.\n' +
      '- **No pattern at all**: add each one as a receipt when you pay it.\n\n' +
      'To ask for more schedules, use **Settings → Support and feedback → Share an idea**.',
    keywords: [
      'every 2 months',
      'bimonthly',
      'biweekly',
      'fortnightly',
      'twice a month',
      'semi-annual',
      'irregular',
    ],
    related: ['bills.add.recurring', 'bills.one-time', 'bills.month.due-figure'],
  },

  // ---------------------------------------------------------------------------------------------
  // Monthly bills and Subscriptions pages
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.month.page',
    topic: 'bills',
    title: "What's on the Monthly bills page?",
    questions: [
      'what does the large card on monthly bills show',
      "What's on the Monthly bills page?",
      'explain the monthly bills screen',
      'what is the purple card on monthly bills',
      'monthly bills page sections',
      'what does the plum card show',
      'how do i read the monthly bills page',
      'what is see payment history',
      'what does the search icon on monthly bills do',
      'what does the plus on monthly bills do',
      'how do i refresh my bills',
      'is there a calendar of my bills',
      'does monthly bills reset on the 1st',
      'what is that plum card on monthly bills',
      'what does due in october mean at the top of the bills page',
      'how do i read the top card on bills',
      'which numbers does the top card on the bills page show',
      'what is the coloured summary box on top of monthly bills',
    ],
    answer:
      '**Monthly bills** shows one month at a time, starting with this one:\n\n' +
      '- The plum card: **Due in October**, the total, how many bills are paid and still coming up, and **Next:** with the next one.\n' +
      '- **Coming up**: each payment still to come that month, soonest first, with a pill like **Tomorrow** or **in 12 days**.\n' +
      '- **All bills**: every running bill, its amount for the month and **Paid** or its next date.\n' +
      '- **Stopped**: bills you stopped.\n' +
      '- **See payment history**: everything already paid.\n\n' +
      "At the top are search and **+** to add a bill. Tap the month chip on the card, like **Oct 2026**, to see another month. On the 1st, the page moves on to the new month by itself. Pull down to refresh. There's no calendar view: **Coming up** and the month chip are the closest.",
    keywords: ['monthly bills', 'plum card', 'purple card', 'coming up', 'all bills'],
    related: [
      'bills.month.due-figure',
      'bills.month.counts',
      'bills.month.coming-up',
      'bills.month.other-months',
    ],
    route: '/bills',
  },
  {
    id: 'subscriptions.page',
    topic: 'subscriptions',
    title: "What's on the Subscriptions page?",
    questions: [
      "What's on the Subscriptions page?",
      'explain the subscriptions screen',
      'what is the card at the top of subscriptions',
      'subscriptions page sections',
      'what is all subscriptions',
      'what does the cancelled section on subscriptions mean',
      'how do I see next months subscriptions',
      'what does next on the subscriptions card mean',
      'subscription coming up list',
      'what does 2 subscriptions 1 paid 1 coming up mean',
      'what is the layout of the subscriptions page',
      'what sections are on the subscriptions screen',
      'walk me through the subscriptions page',
    ],
    answer:
      '**Subscriptions** shows one month at a time, starting with this one:\n\n' +
      '- The plum card: **Due in October**, the total, a line like "4 subscriptions · 2 paid · 2 coming up", and **Next:** with the next renewal.\n' +
      '- **Coming up**: each renewal still to come that month, with **Tomorrow** or **in 5 days**.\n' +
      '- **All subscriptions**: each running one, with its cycle, card, amount, and **Paid** or its next date.\n' +
      '- **Cancelled**: ones you cancelled, with their last charge date.\n' +
      '- **See payment history**: every renewal already paid.\n\n' +
      'Tap the month chip (like **Oct 2026**) for another month, the search button to find a payment, or **+** to add one.',
    keywords: ['subscriptions page', 'plum card', 'all subscriptions', 'cancelled', 'coming up'],
    related: ['subscriptions.month.figure', 'bills.month.counts', 'bills.month.other-months'],
    route: '/subscriptions',
  },
  {
    id: 'bills.month.due-figure',
    topic: 'bills',
    title: 'How is the Due in month figure worked out?',
    questions: [
      'are unpaid bills counted in the due figure',
      'How is the Due in month figure worked out?',
      'what does due in october mean',
      'how is the monthly bills total calculated',
      'why is my monthly bills total so high',
      'does due in this month include bills already paid',
      'my weekly bill is counted 5 times this month',
      'why is my yearly bill not in the total',
      'why did the total jump this month',
      'monthly bills total is wrong',
      'how much are my bills this month',
      'due in month total',
      'where does the big number on monthly bills come from',
    ],
    answer:
      'It adds up every date your bills are due in that month, paid or not.\n\n' +
      '- A monthly bill counts once, a weekly one 4 or 5 times, and a yearly one only in its month.\n' +
      "- Payments already made use the amount they had then. Ones still to come use today's amount.\n" +
      '- A bill stopped during the month counts what it paid before it stopped.\n' +
      '- Loans added to monthly bills count. Extra loan payments get their own line.\n\n' +
      "Example, on 13 October: rent $1,000 on the 1st, internet $60 on the 25th and a $25 cleaner every Monday (4 Mondays). **Due in October** is $1,000 + $60 + $100 = $1,160.00. A $600 yearly insurance due in March isn't counted until March.\n\n" +
      'It updates as soon as you add or change a bill.',
    keywords: ['due this month', 'due in', 'total', 'monthly total', 'figure', 'big number'],
    related: ['bills.month.counts', 'bills.balance.vs-month', 'bills.month.extra'],
    route: '/bills',
  },
  {
    id: 'subscriptions.month.figure',
    topic: 'subscriptions',
    title: 'How much do my subscriptions cost a month?',
    questions: [
      'How much do my subscriptions cost a month?',
      'total of all my subscriptions',
      'why is my yearly subscription not in this month',
      'monthly cost of subscriptions',
      'subscriptions total looks too low',
      'why did subscriptions jump this month',
      'does skip average yearly subscriptions per month',
      'how much do i spend on subscriptions',
      'my annual plan shows full price in one month',
      'subscriptions due this month total',
      'what is my total monthly subscription spending',
      'what do my subscriptions come to each month',
      'how is the monthly subscriptions total worked out',
      'what do my subscriptions add up to in a month',
      'monthly spending on subscriptions',
    ],
    answer:
      "The plum card on **Subscriptions** shows what's due in that month, using each one's real dates. It isn't an average.\n\n" +
      '- Monthly ones count once, weekly ones 4 or 5 times.\n' +
      '- Quarterly and yearly ones count only in the months they renew. A $120 yearly plan adds $120 to its month and nothing to the others.\n' +
      "- Renewals already charged use the price they had then. Ones still to come use today's price.\n\n" +
      'Example: Netflix $15 on the 5th and Spotify $12 on the 20th make **Due in October** $27.00.\n\n' +
      'Tap the month chip to see other months, or **See payment history** for what you paid over a year.',
    keywords: ['subscription cost', 'monthly cost', 'total', 'yearly', 'average'],
    related: ['subscriptions.page', 'bills.history.card', 'bills.month.other-months'],
    route: '/subscriptions',
  },
  {
    id: 'bills.month.counts',
    topic: 'bills',
    title: 'What does 3 bills · 1 paid · 2 coming up mean?',
    questions: [
      'What does 3 bills · 1 paid · 2 coming up mean?',
      'what does the paid count mean on monthly bills',
      'why does it say 0 paid',
      'my weekly bill is still coming up',
      'it says nothing due in november',
      'why are all bills paid in last month',
      'counts on the plum card',
      'why does next month show everything coming up',
      'bills paid coming up numbers',
      'why does it say nothing due',
    ],
    answer:
      'It counts bills, not payments, for the month on the card:\n\n' +
      '- **bills**: how many have a date in that month.\n' +
      '- **paid**: how many have had every date in the month go out. Today counts as paid.\n' +
      '- **coming up**: how many still have a date to come.\n\n' +
      'Paid plus coming up always equals the bills count. A weekly bill due 4 times is one bill, and it stays coming up until its last date in the month.\n\n' +
      'In a past month everything is paid, and in a future month everything is coming up. If nothing is due, the card says "Nothing due in November" (with that month\'s name).',
    keywords: ['paid', 'coming up', 'count', 'nothing due'],
    related: ['bills.month.due-figure', 'bills.month.coming-up', 'bills.month.page'],
    route: '/bills',
  },
  {
    id: 'bills.month.coming-up',
    topic: 'bills',
    title: 'What is the Coming up list?',
    questions: [
      'What is the Coming up list?',
      'what does in 12 days mean',
      'coming up section',
      'why is my bill not in coming up',
      'my bill due today is not in coming up',
      'what does tomorrow mean on the bill',
      'why is coming up missing on last month',
      'next line on the card',
      'what are the pills on coming up',
      'why is my subscription not coming up',
      'which bills are due this week',
    ],
    answer:
      "**Coming up** lists each payment still to come in the month you're looking at, soonest first. Each row has the name, the date and card, the amount, and a pill: **Tomorrow**, or **in 5 days** and so on.\n\n" +
      '- This month: from tomorrow on, because a bill due today already counts as paid.\n' +
      '- A future month: every payment in it.\n' +
      '- A past month: the section is hidden.\n\n' +
      'Not there? It may be due today (so **Paid**), due in another month (check **All bills**), or stopped. The **Next:** line on the plum card names the first one. Tap a row to open it.',
    keywords: ['coming up', 'in days', 'tomorrow', 'next', 'pill'],
    related: ['bills.month.counts', 'bills.month.all-bills', 'bills.paid.how-marked'],
    route: '/bills',
  },
  {
    id: 'bills.month.all-bills',
    topic: 'bills',
    title: 'What does the All bills list show?',
    questions: [
      'What does the All bills list show?',
      'what does next 25 oct mean',
      'what is the green tick paid',
      'why does a bill show a date next year',
      'can i reorder my bills',
      'what order are my bills in',
      'why is the amount on all bills bigger than the bill',
      'what does ends mean next to my bill',
      'all subscriptions list explained',
      'sort bills by amount',
      'why is my bill listed with a 2027 date',
    ],
    answer:
      '**All bills** (or **All subscriptions**) lists every running one, with how many beside the heading. Each row shows:\n\n' +
      '- How often it repeats and its card, or an **Add a card** link.\n' +
      "- Its amount for the month: all its dates added up (a weekly bill can show 4 or 5 payments' worth), or one payment if it isn't due that month.\n" +
      '- **Paid** with a green tick when every date in the month has gone out, **Next 25 Oct** when one is still to come, **Next 1 Mar 2027** when its next date is in a later month, or **Ends** and a date for a period bill.\n\n' +
      "Ones due in the month come first, by date, then the rest by their next date. You can't reorder them. Tap a row to open it.",
    keywords: ['all bills', 'all subscriptions', 'status', 'order', 'next', 'green tick'],
    related: ['bills.month.add-card', 'bills.month.due-figure', 'bills.detail.page'],
    route: '/bills',
  },
  {
    id: 'bills.month.add-card',
    topic: 'bills',
    title: 'What does Add a card or Card not set mean?',
    questions: [
      'What does Add a card or Card not set mean?',
      'why does my bill say add a card',
      'card not set on my payment',
      'what is the purple add a card link',
      'bill has no card',
      'payment history says card not set',
      'subscription shows add a card',
      'no payment method on a bill',
      'how do i link a card to my bill',
      'why is there no card next to my bill',
    ],
    answer:
      "It means the bill isn't tied to a card or account. Its **Paid with** is set to **Skip**, or the card it used was deleted.\n\n" +
      '- On **Monthly bills** or **Subscriptions**, tap **Add a card** in the row. The edit page opens: pick a card or account and tap **Save changes**.\n' +
      '- Its payments in **Coming up**, **Payment history** and search say **Card not set**.\n\n' +
      "It still counts in your spending and **Current balance**. It just doesn't change any card's or account's balance.",
    keywords: ['add a card', 'card not set', 'no payment method', 'link card'],
    related: ['bills.add.paid-with', 'bills.card-deleted', 'bills.edit.card-change'],
  },
  {
    id: 'bills.month.other-months',
    topic: 'bills',
    title: 'How do I see bills for another month?',
    questions: [
      'How do I see bills for another month?',
      'see next months bills',
      'look at last months bills',
      'choose month',
      'how far ahead can i see my bills',
      'how far back can i see my bills',
      'why cant i pick an older month',
      'see older months of bills with pro',
      'change month on monthly bills',
      'what will my bills be in december',
      'the month chip',
    ],
    answer:
      'Tap the month chip on the plum card, like **Oct 2026**. **Choose month** opens with **This month** first, then **Coming months** (up to 12 ahead), then past months by year. Tap one and the page shows it.\n\n' +
      "Past months show what was paid. Future months show what's coming, at today's amounts. Next time you open the page it starts on this month again.\n\n" +
      'On the free plan, past months go back as far as your last 90 days, and the list ends with **See older months with Pro**. With Pro you can go back 7 years: this year and the six before it.',
    keywords: ['choose month', 'month chip', 'next month', 'last month', 'older months'],
    related: ['bills.history.free-limit', 'bills.month.due-figure', 'bills.history.page'],
    route: '/payment-month',
  },
  {
    id: 'bills.month.extra',
    topic: 'bills',
    title: 'What does + extra on Car loan mean?',
    questions: [
      'What does + extra on Car loan mean?',
      'extra on loan line on monthly bills',
      'what does in all mean on the bills card',
      'why is there an extra amount under due in',
      'extra payment on monthly bills',
      'monthly bills and home tile dont match',
      'i paid off part of my loan and monthly bills changed',
      'what is paid off in payment history',
      'what does extra payment mean in history',
      'loan payoff on bills page',
    ],
    answer:
      'That line appears when you paid extra toward a loan that month, with **Pay off** on the loan. Extra payments aren\'t due, so they stay out of **Due in October**. The line shows how much, on which loan, and the total with it, like "+ $1,000.00 extra on Car loan · $2,884.00 in all".\n\n' +
      'The "in all" figure matches the **Monthly Bills** tile on **Home**. In **Payment history** these show as **Paid off** (the whole loan) or **Extra payment** (part of it).',
    keywords: ['extra', 'in all', 'pay off', 'paid off', 'extra payment', 'loan'],
    related: ['bills.loans.in-bills', 'bills.month.due-figure', 'bills.balance.vs-month'],
    route: '/bills',
  },
  {
    id: 'bills.missing.disappeared',
    topic: 'bills',
    title: 'My bill disappeared from Monthly bills',
    questions: [
      'My bill disappeared from Monthly bills',
      'where did my bill go',
      'a bill is missing from the list',
      'my subscription vanished',
      'my bill is not in the total anymore',
      'cant see my insurance bill this month',
      'bill gone after editing',
      'my loan is no longer in bills',
      'subscription missing from subscriptions page',
      'i lost a bill',
      'my bill was here last month and now it is gone',
      'bill was there last month but not now',
      'where is the bill that was there last month',
      'my bill is not on the monthly bills page anymore',
      'a bill i had before is not in monthly bills now',
    ],
    answer:
      'Check these:\n\n' +
      "- It isn't due this month. It's still under **All bills** with its next date, but not in **Coming up** or the total.\n" +
      '- It stopped. Look in **Stopped** at the bottom. **Keep past charges** puts a bill there, and so does a **Specific period** bill reaching its **To** day.\n' +
      "- You're looking at another month. The chip on the plum card shows which.\n" +
      "- It's a loan with **Add to monthly bills** switched off. It's on the **Loans** page only.\n" +
      "- It was deleted with **Remove everything**. That can't be undone, so add it again.\n\n" +
      'For a subscription, look in **Cancelled** at the bottom of **Subscriptions**. Pull down on the page to refresh.',
    keywords: ['missing', 'disappeared', 'gone', 'vanished', 'lost'],
    related: ['bills.stopped.what', 'bills.month.all-bills', 'bills.loans.in-bills'],
    route: '/bills',
  },
  {
    id: 'bills.loans.in-bills',
    topic: 'bills',
    title: 'Why is my loan on Monthly bills?',
    questions: [
      'Why is my loan on Monthly bills?',
      'my car loan shows up as a bill',
      'tapping my loan bill opens the loan page',
      'how do I edit a loan from bills',
      'remove loan from monthly bills',
      'can I add a loan as a bill',
      'where is loans and credit',
      'mortgage as a bill or loan',
      'add to monthly bills switch',
      'loan payment counted in bills',
    ],
    answer:
      'Loans saved with **Add to monthly bills** switched on count as bills. Each monthly payment shows on **Monthly bills** and in **Payment history**, and counts in your spending.\n\n' +
      '- Tapping a loan opens its own loan page, not a bill page.\n' +
      '- Change or delete a loan from that page, not from **Edit bill**.\n' +
      "- With **Add to monthly bills** off, the loan stays on **Loans** but its payments don't show or count here.\n\n" +
      "Loans can't be added from **Add a bill**. Add them on the **Loans** page.",
    keywords: ['loan', 'add to monthly bills', 'car loan', 'mortgage', 'loans and credit'],
    related: ['bills.month.extra', 'bills.add.categories'],
    route: '/loans',
  },

  // ---------------------------------------------------------------------------------------------
  // Payment history, years, search, export
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.history.page',
    topic: 'bills',
    title: 'What is Payment history?',
    questions: [
      'What is Payment history?',
      'where do i see bills i already paid',
      'payment history page',
      'see all past bill payments',
      'history of my subscriptions',
      'how do I see what I paid last month',
      'list of every payment',
      'does payment history show future bills',
      'why isnt my upcoming bill in payment history',
      'are cancelled subscriptions in payment history',
      'old payments list',
    ],
    answer:
      '**Payment history** lists every bill and subscription payment that has already gone out, one year at a time. Open it from **See payment history** at the bottom of **Monthly bills** or **Subscriptions**.\n\n' +
      '- The year chip (**This year**) picks the year.\n' +
      "- **All**, **Bills** and **Subscriptions** pick what's shown.\n" +
      '- **Search payments** finds any payment.\n' +
      '- The plum card shows **Paid in 2026**, **Payments** and **Avg / month**, with a bar for each month.\n' +
      '- Below are the months, newest first, each with its total and every payment marked **Paid**.\n\n' +
      'Only payments dated today or earlier are here, never upcoming ones. Stopped bills, cancelled subscriptions and loan payments are included. Tap a payment to open it.',
    keywords: ['payment history', 'past payments', 'history', 'paid'],
    related: ['bills.history.card', 'bills.history.years', 'bills.search.how', 'bills.export.how'],
    route: '/payment-history',
  },
  {
    id: 'bills.history.card',
    topic: 'bills',
    title: 'How are Paid in and Avg / month worked out?',
    questions: [
      'How are Paid in and Avg / month worked out?',
      'what is avg month on payment history',
      'how is the average per month calculated',
      'paid in 2026 meaning',
      'what are the bars on payment history',
      'why are some bars flat',
      'average looks wrong',
      'payments count on history',
      'why is this month bar white',
      'how much did i pay this year in bills',
      'yearly total of bills and subscriptions',
    ],
    answer:
      "The plum card adds up every payment in the year for the tab you're on (**All**, **Bills** or **Subscriptions**):\n\n" +
      '- **Paid in 2026**: the total of every payment that year, up to today.\n' +
      '- **Payments**: how many there were.\n' +
      '- **Avg / month**: the total divided by the months so far, January to this month for this year, or all 12 for a past year. If your first payment was later in that year, it counts from that month.\n' +
      "- The bars are each month's total. This month stands out, and months still to come are flat.\n\n" +
      "Example, on 13 October: $5,000 paid since January gives $500.00 a month. If your first payment was in March, it's $5,000 ÷ 8 = $625.00.\n\n" +
      "On the free plan these figures still count every payment, even older ones the list doesn't show.",
    keywords: ['avg', 'average', 'paid in', 'bars', 'payments count', 'yearly total'],
    related: ['bills.history.page', 'bills.history.years', 'bills.history.free-limit'],
    route: '/payment-history',
  },
  {
    id: 'bills.history.years',
    topic: 'bills',
    title: 'How do I see payments from other years?',
    questions: [
      'How do I see payments from other years?',
      'see last years bills',
      'choose year',
      'what is all years',
      'paid since meaning',
      'why does 2025 have a pro badge',
      'what is the pro label next to a year',
      'how many years of payments can i see',
      'payment history for 2024',
      'compare years of bills',
      'total of every year',
    ],
    answer:
      'On **Payment history**, tap the year chip (**This year**). **Choose year** lists **This year**, every earlier year you have payments in, and **All years**.\n\n' +
      '**All years** opens a page with **Paid since** your first year (the total, payments and years), then a card for each year with its payments and total. Tap a year to open it.\n\n' +
      'Years go back 7 calendar years: this year and the six before it.\n\n' +
      'On the free plan, a year that is all older than your last 90 days has a **Pro** badge. It still opens with its totals, but its list is replaced by **Older history is saved**.',
    keywords: ['choose year', 'all years', 'paid since', 'pro badge', 'last year'],
    related: ['bills.history.free-limit', 'bills.history.card', 'bills.export.how'],
    route: '/payment-year',
  },
  {
    id: 'bills.history.free-limit',
    topic: 'bills',
    title: 'Why can I only see 90 days of payments?',
    questions: [
      'Why can I only see 90 days of payments?',
      'older history is saved what does it mean',
      'my old bill payments disappeared',
      'free plan history limit for bills',
      'did skip delete my old payments',
      'see up to 7 years with pro on payment history',
      'why does the list stop in july',
      'how do i see payments older than 3 months',
      'payment history cut off',
      'are my older payments gone',
    ],
    answer:
      "On the free plan, lists show the last 90 days of payments (today is the 90th). Older payments aren't deleted: they're kept, still counted in every total and balance, and show again with Skip Pro.\n\n" +
      "- Where a list stops, you'll see **Older history is saved**. Tap it to see what Pro adds.\n" +
      "- Totals, counts and bars on **Payment history**, and the totals beside **Paid** on a bill's page, include every payment.\n" +
      '- **Choose month** and **Choose year** end with a line about seeing more with Pro.\n\n' +
      'Skip Pro shows up to 7 years, for {proMonthly} or {proYearly}.',
    keywords: ['90 days', 'history limit', 'older history', 'free plan', '7 years'],
    related: ['bills.history.years', 'bills.free.limits', 'bills.detail.no-charges'],
    route: '/payment-history',
    pro: true,
  },
  {
    id: 'bills.search.how',
    topic: 'bills',
    title: 'How do I search my payments?',
    questions: [
      'How do I search my payments?',
      'search bills',
      'find a bill payment',
      'search payments',
      'how to find an old subscription charge',
      'look up every netflix payment',
      'search for a bill by name',
      'what does 2024 – 2021 · 12 more mean',
      'how does search work in payments',
      'find what I paid to my electric company',
      'search subscriptions',
      'how do i find every rent payment from last year',
      'where do i search for past bill payments',
      'list every payment i made for rent',
    ],
    answer:
      'Tap the search button on **Monthly bills** or **Subscriptions**, or **Search payments** on **Payment history**. Type part of a name.\n\n' +
      '- **All**, **Bills** and **Subscriptions** narrow it.\n' +
      "- It matches the name a payment went out under and the bill's name now, so renamed bills are found either way. It forgives a small typo in words of 4 letters or more.\n" +
      '- Results show how many and from which years, then each year with its total. The two newest years are listed in full; older ones fold into one row like "2024 – 2021 · 12 more". Tap it to open them.\n\n' +
      'Only payments that have gone out are searched. Tap a result to open its bill or subscription.',
    keywords: ['search', 'find', 'look up', 'search payments'],
    related: ['bills.search.filters', 'bills.search.not-found', 'bills.search.recent'],
    route: '/payment-search',
  },
  {
    id: 'bills.search.filters',
    topic: 'bills',
    title: 'How do the payment search filters work?',
    questions: [
      'How do the payment search filters work?',
      'filter payments by date',
      'show payments over 100 dollars',
      'filter bill payments by card',
      'date range filter',
      'amount filter at least at most',
      'the smaller amount must come first',
      'filter bills by category',
      'clear filters',
      'pick dates from to',
      'paid from filter all accounts',
    ],
    answer:
      'Before you type, the search page lists **Filters**. Each opens its own page:\n\n' +
      '- **Date range**: **Any time**, **This month**, **Last 3 months**, **This year**, **Last year** or **Pick dates** (set **From** and **To**, then **Show payments**).\n' +
      '- **Amount**: **At least**, **At most** or both, then **Show payments**. The smaller amount must come first.\n' +
      '- **Paid from**: **All accounts**, one card or account, or **Card not set**.\n\n' +
      "A filter alone shows results, even with nothing typed. With results showing, tap a filter's name to change it, or **Clear filters**. There's no filter by category: search by name instead.",
    keywords: ['filter', 'date range', 'amount', 'paid from', 'clear filters'],
    related: ['bills.search.how', 'bills.search.not-found'],
    route: '/payment-search',
  },
  {
    id: 'bills.search.recent',
    topic: 'bills',
    title: 'How do I clear recent searches?',
    questions: [
      'How do I clear recent searches?',
      'delete recent payment searches',
      'remove a search from recent',
      'what is the recent list in search',
      'why does search remember what i typed',
      'recent payment searches',
      'clear payment search history',
      'are my payment searches saved',
      'recent searches on another phone',
      'how many recent searches does it keep',
    ],
    answer:
      '**Recent** shows your last 5 payment searches, newest first. Tap one to search it again, or tap the **X** beside it to remove it.\n\n' +
      'A search is remembered when you tap **Search** on the keyboard or open a result, not while you type. Recent searches are kept on this phone only and cleared when you sign out.',
    keywords: ['recent', 'recent searches', 'search history', 'clear'],
    related: ['bills.search.how', 'bills.search.filters'],
    route: '/payment-search',
  },
  {
    id: 'bills.search.not-found',
    topic: 'bills',
    title: "Why can't search find my payment?",
    questions: [
      "Why can't search find my payment?",
      'no payments match',
      'search shows nothing',
      'search cant find my bill',
      'searching a category finds nothing',
      'my upcoming bill isnt in search',
      'search doesnt find old payments',
      'no matches try a shorter word',
      'search results missing a payment',
      'why does search not find notes',
      'payment search finds nothing but i know the payment is there',
      'search on monthly bills can not find a payment i made',
      'search not finding a payment in payment history',
      'a payment i made does not show when i type its name',
      'i know i paid it but search does not show the payment',
    ],
    answer:
      'A few things to check:\n\n' +
      '- Search looks at names only, not categories or notes. Try part of the name, like "elec".\n' +
      '- It only finds payments that have already gone out, not upcoming ones.\n' +
      '- Check the **All** / **Bills** / **Subscriptions** tab, and tap **Clear filters**.\n' +
      '- On the free plan, only the last 90 days are listed. Older matches still count in the totals, and **Older history is saved** appears.\n' +
      "- Payments older than 7 calendar years aren't shown.\n\n" +
      'No matches? Try a shorter word or another year.',
    keywords: ['no matches', 'not found', 'search empty', 'nothing'],
    related: ['bills.search.how', 'bills.search.filters', 'bills.history.free-limit'],
    route: '/payment-search',
  },
  {
    id: 'bills.export.how',
    topic: 'bills',
    title: 'How do I export my payments?',
    questions: [
      'How do I export my payments?',
      'export bills to excel',
      'download my payment history',
      'can I get a pdf of my bills',
      'export bills csv',
      'send my bill history to my accountant',
      'print my payments',
      'why is payment export locked',
      'is exporting payments free',
      'export subscriptions',
      'export all years',
      'share payment history',
    ],
    answer:
      'Export is part of Skip Pro.\n\n' +
      '1. Open **Payment history**.\n' +
      '2. Pick the year and the **All**, **Bills** or **Subscriptions** tab.\n' +
      '3. Tap **Export CSV or PDF**, or the share button at the top right.\n' +
      '4. Choose **CSV** (for Numbers, Excel or Google Sheets) or **PDF** (a statement to print or send).\n' +
      '5. Tap **Export**. The iPhone share sheet opens, so you can save it to Files, mail it or print it.\n\n' +
      'For every year at once, open **All years** and tap its share button.\n\n' +
      'On the free plan, these buttons open a page about Pro instead. Pro is {proMonthly} or {proYearly}.',
    keywords: ['export', 'csv', 'pdf', 'download', 'excel', 'spreadsheet', 'print', 'accountant'],
    related: ['bills.export.contents', 'bills.history.page', 'bills.free.limits'],
    route: '/payment-history',
    pro: true,
  },
  {
    id: 'bills.export.contents',
    topic: 'bills',
    title: "What's in the payments export file?",
    questions: [
      "What's in the payments export file?",
      'what columns are in the csv',
      'does the export include my search filters',
      'export only one bill',
      'nothing to export for this year',
      'export button is grey',
      'what does the pdf statement look like',
      'what currency is the export in',
      'what is the file called',
      'does export include loan payments',
    ],
    answer:
      "The export holds what **Payment history** is showing: the tab you're on and the year (or **All years**). It doesn't use search filters, so for one bill, export the year and filter it in your spreadsheet.\n\n" +
      '- **CSV**: one row per payment with **Date**, **Name**, **Kind** (Bill, Subscription, or Paid off and Extra payment for loans), **Amount** and **Paid from**. Amounts are plain numbers, with the currency in the column name.\n' +
      '- **PDF**: a statement grouped by month, each month with its total, an overall **Total**, and "Made with Skip Budget on" the day you made it.\n\n' +
      'Files are named like skip-bills-2026.pdf. If a year has nothing in it, Skip says so and **Export** stays off.',
    keywords: ['csv columns', 'pdf statement', 'export file', 'filename'],
    related: ['bills.export.how', 'bills.history.page'],
    route: '/payment-export',
    pro: true,
  },

  // ---------------------------------------------------------------------------------------------
  // Money: balances, cards, Home
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.balance.effect',
    topic: 'bills',
    title: 'How do bills change my Current balance?',
    questions: [
      'does a bill take money out of my balance on the due day',
      'How do bills change my Current balance?',
      'why did my balance go down on the 1st',
      'do bills come off my bank account balance in skip',
      'how do subscriptions affect my card balance',
      'my credit card balance went up by my bill',
      'when does a bill come off my balance',
      'does a bill count before its due date',
      'why didnt my bill change my account balance',
      'bills and card balances',
      'does my rent lower my current balance',
      'cancelled subscription still in my balance',
    ],
    answer:
      'Each payment counts on its due date, not before. On that day:\n\n' +
      '- Your **Current balance** on **Home** goes down by the amount.\n' +
      '- Paid with a credit card: what you owe on that card goes up.\n' +
      "- Paid with a bank account: that account's balance goes down.\n" +
      '- Paid with **Skip**: only your **Current balance** changes.\n\n' +
      "Skip only counts payments from the day you entered that card's or account's balance, because that figure already included anything before it.\n\n" +
      'Example: checking has $2,000 and rent of $1,000 comes out of it on the 1st. On the 1st, checking shows $1,000 and your **Current balance** drops by $1,000. Stopped bills and cancelled subscriptions keep their past payments counted.',
    keywords: ['current balance', 'card balance', 'account balance', 'balance'],
    related: ['bills.balance.vs-month', 'bills.add.paid-with', 'bills.dates.past'],
  },
  {
    id: 'bills.balance.vs-month',
    topic: 'bills',
    title: "Why don't Monthly bills and Current balance match?",
    questions: [
      "Why don't Monthly bills and Current balance match?",
      'due in october is more than what came off my balance',
      'difference between monthly bills total and current balance',
      'home monthly bills tile vs current balance',
      'why does the monthly bills tile show bills not paid yet',
      'my balance only dropped part of my bills',
      'what does the monthly bills tile on home add up',
      'why is where your money went bigger than what i spent',
      'bills total vs balance',
      'current balance ignores my upcoming bills',
      'the total for the month on the bills page is higher than what has left my balance',
      'why is the due in figure on monthly bills larger than what has been taken out',
      'the due figure on the bills page is higher than my balance drop',
    ],
    answer:
      'They answer different questions.\n\n' +
      '- **Due in October** on **Monthly bills** adds every bill date in the month, including ones still to come. The **Monthly Bills** tile on **Home** shows the same, plus any extra loan payments.\n' +
      '- **Current balance** only takes off what has already happened, up to today, and it never resets on the 1st.\n\n' +
      'Example, on 13 October: rent ($1,000, the 1st) is paid and internet ($60, the 25th) is still to come. **Due in October** says $1,060.00, but only $1,000 has come off your **Current balance** so far. The $60 comes off on the 25th.',
    keywords: [
      'current balance',
      'monthly bills tile',
      'due in',
      'difference',
      'where your money went',
    ],
    related: ['bills.balance.effect', 'bills.month.due-figure', 'bills.month.extra'],
  },
  {
    id: 'bills.card-deleted',
    topic: 'bills',
    title: 'I deleted a card my bills were paid with',
    questions: [
      'if I delete a card, are the subscriptions paid with it deleted too',
      'I deleted a card my bills were paid with',
      'what happens to my bills if i delete a card',
      'removed my credit card now bills say add a card',
      'closed my bank account in skip what about subscriptions',
      'deleted card payments show card not set',
      'will deleting a card delete my bills',
      'move bills after deleting a card',
      'bills lost their card',
      'my old card was removed',
      'deleting an account and my rent bill',
    ],
    answer:
      "Your bills and subscriptions stay. They just lose their card. On **Monthly bills** and **Subscriptions** they show an **Add a card** link, and their past payments say **Card not set**. Those payments still count in your spending and **Current balance**.\n\nTo give one a card again:\n\n1. Tap **Add a card** (or the pencil on its page).\n2. Pick a card or account.\n3. Tap **Save changes**.\n\nChoose **Past and upcoming** if you also want past payments on the new card. That changes the new card's balance too.",
    keywords: ['deleted card', 'removed card', 'card not set', 'add a card'],
    related: ['bills.month.add-card', 'bills.edit.card-change', 'bills.balance.effect'],
  },

  // ---------------------------------------------------------------------------------------------
  // Reminders and notifications
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.reminder.change',
    topic: 'bills',
    title: 'How do I change or turn off a bill reminder?',
    questions: [
      'How do I change or turn off a bill reminder?',
      'turn off reminder for netflix',
      'stop reminders for my rent',
      'change reminder from 1 day to 3 days',
      'change the time of my bill reminder',
      'where are bill reminders in settings',
      'can I get two reminders for one bill',
      'too many bill notifications',
      'remove a reminder',
      'reminder settings for subscriptions',
    ],
    answer:
      'Two ways:\n\n' +
      '1. Open the bill or subscription, tap the pencil, change **Reminder** (pick **No reminder** to turn it off) or tap the time pill, then tap **Save changes**.\n' +
      '2. Or go to **Settings → Preferences → Reminders**. Your bills and subscriptions are listed there with their amount and next date, and you can change each one.\n\n' +
      "Each bill or subscription has one reminder. You can't add a second one for the same thing.",
    keywords: ['reminder', 'turn off', 'change reminder', 'reminder time'],
    related: ['bills.add.reminder', 'bills.reminder.missing', 'bills.notifications.went-out'],
    route: '/reminders',
  },
  {
    id: 'bills.reminder.missing',
    topic: 'bills',
    title: "Why didn't my bill reminder come?",
    questions: [
      'my subscription renewed and no reminder showed up',
      "Why didn't my bill reminder come?",
      'no notification for my bill',
      'bill reminder not working',
      'subscription renewal reminder never came',
      'i set a reminder but got nothing',
      'reminder came on the wrong day',
      'didnt get notified before rent',
      'reminders stopped after I cancelled',
      'my reminder is late',
      'netflix reminder missing',
    ],
    answer:
      "A few things to check:\n\n- In your iPhone's **Settings → Notifications → Skip Budget**, notifications must be allowed.\n- The reminder counts back from **Next due** (or **Next renewal**) on its page. Check that date is right.\n- If the reminder day had already passed when you set it, like **1 week** before a bill due in 3 days, the first one comes with the next due date.\n- It arrives at or a little after your time, within about 15 minutes, in your own time zone.\n- Stopped bills and cancelled subscriptions get no reminders.\n- Open the bill, tap the pencil and check **Reminder** isn't **No reminder**.\n\nSkip doesn't need to be open for reminders to arrive.",
    keywords: ['reminder', 'notification', 'not working', 'missing', 'late'],
    related: ['bills.add.reminder', 'bills.reminder.change', 'bills.dates.month-end'],
  },
  {
    id: 'bills.notifications.went-out',
    topic: 'bills',
    title: 'What is the "went out" notification?',
    questions: [
      'What is the bill "went out" notification?',
      'i got a notification saying $50 went out',
      'got a payments went out message for my bills',
      'why did skip tell me my rent went out',
      'turn off went out notifications',
      'notification after my bill is paid',
      'I got a notification but have no reminder set',
      'what does 5 charges mean in the notification',
      'didnt get the went out message',
      'charge notification',
      'Why did I get a went out notification?',
      'I got a notification saying $15.99 went out',
      'what is the went out notification',
      'Payments went out notification',
      'skip told me a bill was charged',
      'notification when a subscription is paid',
      "why do I get notifications I didn't set up",
      'can I turn off the went out alerts',
      'notification says 5 charges',
      'charge notifications',
      'skip says netflix went out',
    ],
    answer:
      'When a bill or subscription’s date comes, Skip records it as paid and sends a notification with its name and the amount, like “$15.99 went out”. If more than three go out at once, they come as one: **Payments went out**, with the count and total.\n\nTapping it opens that bill or subscription, or **Activity** for a group.\n\nIt comes to any phone where you’ve turned on reminders in Skip and allowed notifications, even for bills set to **No reminder**. There’s no separate switch for it. Turning off Skip’s notifications in the iPhone Settings app stops it, but stops your reminders too.\n\nIf you open Skip just as the day starts, Skip may record the payment before the notification goes, and then none is sent. The payment still counts.',
    keywords: [
      'went out',
      'notification',
      'payments went out',
      'charges',
      'Payments went out',
      'charged',
      'charge notice',
    ],
    related: ['bills.paid.how-marked', 'bills.add.reminder', 'bills.reminder.change'],
  },

  // ---------------------------------------------------------------------------------------------
  // Logos, setup, plans, duplicates
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.logo.change',
    topic: 'bills',
    title: "How do I change a bill's or subscription's logo?",
    questions: [
      "How do I change a bill's or subscription's logo?",
      'wrong logo on my subscription',
      'change logo on a bill',
      'my bill shows letters instead of a logo',
      'why does my bill have no logo',
      'remove the logo from a bill',
      'are logos free for bills',
      'report a wrong logo on my subscription',
      'use the website for my bill logo',
      'no logo use the icon',
      'the logo is the wrong company',
      'change the picture on a bill',
      'my bill has the wrong image, how do i change it',
      'swap the logo on my bill',
      'how can i swap the image on a bill',
      "how can i change a subscription's image",
    ],
    answer:
      'Logos are free for everyone.\n\n' +
      '1. Open the bill or subscription.\n' +
      '2. Tap its logo or icon at the top (it has a small pencil).\n' +
      "3. On **Change logo**, tap **Yes, that’s it** for the suggestion, **Not this one** to see others, or **Use the website instead** to type the company's website.\n" +
      '4. Or pick **No logo, use the icon** (bills) or **No logo, use letters** (subscriptions).\n' +
      '5. Tap **Save logo**.\n\n' +
      "If a logo is wrong for everyone, tap **Report this logo**. A bill with no company picked shows its category's icon. A subscription with no logo shows letters.",
    keywords: ['logo', 'change logo', 'icon', 'letters', 'report logo'],
    related: ['bills.add.name', 'subscriptions.add.service', 'bills.edit.category'],
  },
  {
    id: 'bills.free.limits',
    topic: 'bills',
    title: "What's free and what's Pro for bills?",
    questions: [
      "What's free and what's Pro for bills?",
      'is there a limit on how many bills i can add',
      'are subscriptions free to track',
      'do I need pro for bills',
      'how many subscriptions can i add for free',
      'what does pro add to bills',
      'are bill reminders free',
      'free vs pro bills and subscriptions',
      'is monthly bills a pro feature',
      'why is something locked on payment history',
      'what is free with bills',
      'what is included in the free plan for bills and subscriptions',
      'do i have to pay for bills and subscriptions in skip',
      'is there a limit on bills for free users',
      'what comes free for bills and subscriptions',
      'are subscriptions free to add',
      'is adding a subscription free',
      'do i need pro for subscriptions',
    ],
    answer:
      'Almost everything is free:\n\n' +
      '- As many bills and subscriptions as you like\n' +
      "- Reminders, logos, **Monthly bills**, **Subscriptions** and every bill's page\n" +
      '- **Payment history** and search for the last 90 days, with full totals for every year\n\n' +
      'Skip Pro adds:\n\n' +
      '- Lists and search going back up to 7 years\n' +
      '- **Export CSV or PDF** of your payments\n\n' +
      'Pro is {proMonthly} or {proYearly}. If Pro ends, nothing you added is deleted: older history is just hidden until you have Pro again.',
    keywords: ['free', 'pro', 'limit', 'how many', 'locked'],
    related: ['bills.history.free-limit', 'bills.export.how'],
    pro: true,
  },
  {
    id: 'bills.duplicates',
    topic: 'bills',
    title: 'I added the same bill twice',
    questions: [
      'I added the same bill twice',
      'duplicate bill',
      'my rent is counted twice',
      'two of the same subscription',
      'bill shows up twice',
      'why is netflix charged twice this month',
      'remove a duplicate subscription',
      'double counted bill',
      'same bill appears two times',
      'did skip charge my bill twice',
      'subscription listed twice on the subscriptions page',
      'i have netflix in my list two times',
      'how do i get rid of a doubled subscription',
      'the same subscription was added two times by mistake',
      'bill entered twice, how do i remove one',
    ],
    answer:
      'Delete the extra one with **Remove everything**, so its payments stop counting:\n\n' +
      '1. Open the duplicate from **Monthly bills** (or **Subscriptions**).\n' +
      '2. Tap the pencil, then **Delete bill** (or **Delete subscription**).\n' +
      '3. Tap **Remove everything**.\n\n' +
      'Totals and balances update straight away. A single bill is never charged twice for the same month (or week, quarter or year), so a double usually means two copies were added. Tapping **Save bill** twice, or saving again after a lost connection, doesn’t make one: the button holds on **Saving…** until the page closes, and a retry finds the bill the first tap filed.',
    keywords: ['duplicate', 'twice', 'double', 'counted twice'],
    related: ['bills.delete.choices', 'bills.delete.how', 'subscriptions.delete.how'],
  },

  // ---------------------------------------------------------------------------------------------
  // Things Skip does not do
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.not-supported.bank',
    topic: 'bills',
    title: 'Does Skip pay my bills or connect to my bank?',
    questions: [
      'Does Skip pay my bills or connect to my bank?',
      'can skip pay my rent for me',
      'does skip find my bills automatically',
      'can it import bills from my bank',
      'link my bank to see bills',
      'does skip read my email for bills',
      'pay a bill from the app',
      'automatic bill detection',
      'why do i have to type my bills in',
      'does skip set up autopay',
    ],
    answer:
      "No. Skip doesn't move money or pay anything, and it never connects to your bank or email. It tracks the bills you add, counts each one as paid on its due date and reminds you before it's due. You still pay the bill as you normally do.\n\n" +
      'Add each bill once with **Quick add → Bill** or **Subscription**, and Skip keeps it going every month.\n\n' +
      'To suggest something, go to **Settings → Support and feedback → Share an idea**.',
    keywords: ['bank', 'pay bills', 'autopay', 'import', 'automatic', 'email'],
    related: ['bills.paid.how-marked', 'bills.add.how', 'subscriptions.cancel.company'],
  },
  {
    id: 'subscriptions.cancel.company',
    topic: 'subscriptions',
    title: 'Can Skip cancel a subscription for me?',
    questions: [
      'does skip contact netflix to cancel',
      'Can Skip cancel a subscription for me?',
      'will cancelling in skip stop netflix charging me',
      'cancel my spotify through skip',
      'does skip find my subscriptions automatically',
      'can skip detect subscriptions from my bank',
      'cancelled in skip but still being charged',
      'unsubscribe for me',
      'does skip contact the company',
      'find forgotten subscriptions',
      'skip cancel service for me',
      'does marking it cancelled in skip stop them charging my card',
      'if i mark a subscription cancelled in the app, will the company stop billing me',
      'is the cancelled status just for my own records',
      'does skip cancel the subscription with the company for me',
      'will skip cancel my subscription with netflix for me',
    ],
    answer:
      "No. Skip isn't connected to the company or your bank, so it can't cancel, pause or change a subscription. Cancel with the company (on their website or app, or in iPhone **Settings** for App Store subscriptions), then mark it **Cancelled** in Skip so it stops counting.\n\n" +
      "Skip also can't spot subscriptions by itself. Add each one with **Quick add → Subscription**.\n\n" +
      'To suggest something, go to **Settings → Support and feedback → Share an idea**.',
    keywords: ['cancel for me', 'detect', 'still charged', 'unsubscribe'],
    related: ['subscriptions.cancel.how', 'bills.not-supported.bank'],
  },
  {
    id: 'bills.not-supported.split',
    topic: 'bills',
    title: 'Can I split a bill with someone?',
    questions: [
      'Can I split a bill with someone?',
      'share a bill with my roommate',
      'split rent with my partner',
      'shared bills',
      'i only pay half the internet',
      'split utilities',
      'joint bill with my spouse',
      'can two people see the same bill',
      'how do i track my share of a bill',
      'split subscription family plan',
    ],
    answer:
      'Skip has no shared bills: each bill belongs to your account only. The closest way is to enter your own share as the amount. For example, if rent is $2,000 and you pay half, add it as $1,000. Your totals and balances then show what you really pay.\n\n' +
      'To ask for shared bills, go to **Settings → Support and feedback → Share an idea**.',
    keywords: ['split', 'share', 'roommate', 'partner', 'half', 'family plan'],
    related: ['bills.add.amount', 'bills.add.how'],
  },
  {
    id: 'bills.not-supported.attach',
    topic: 'bills',
    title: 'Can I attach a photo or PDF to a bill?',
    questions: [
      'Can I attach a photo or PDF to a bill?',
      'attach my bill statement',
      'save a picture of my bill',
      'upload a bill document',
      'can i scan a utility bill into skip',
      'add a file to a subscription',
      'keep a copy of the invoice',
      'store my utility bill pdf',
      'photo of rent receipt on the bill',
      'attachments for bills',
    ],
    answer:
      "No. Bills and subscriptions don't hold photos or files. You can write details like an account number in **Note**.\n\n" +
      'Scanning and uploading are for receipts (**Quick add → Receipt**), and Skip reads the details from them rather than keeping the picture.\n\n' +
      "If you'd like attachments on bills, tell us in **Settings → Support and feedback → Share an idea**.",
    keywords: ['attach', 'photo', 'pdf', 'upload', 'document', 'invoice'],
    related: ['bills.add.note', 'bills.add.how'],
  },
  {
    id: 'bills.add.any-regular',
    topic: 'bills',
    title: "Can I add a regular payment that isn't a bill?",
    questions: [
      'i send money to my family abroad every month',
      'i give my kid allowance',
      'charity donation every month',
      'add a monthly donation',
      'money i send home every month',
      'child support i pay',
      'pocket money for my kids every week',
      'regular transfer to someone',
      'tithe every month',
      'my monthly payment to my mom',
      "can a bill be something that isn't a company",
    ],
    answer:
      'Yes. Anything you pay on a schedule can be a bill, even if it isn’t a company: money sent home, a child’s allowance, a donation or child support.\n\n1. On **Home**, tap **Quick add → Bill**, then **Other**.\n2. Type the amount and tap **Continue**.\n3. Give it a **Name**, like “Allowance”, then fill in **Payment on**, **Recurring**, **Paid with** and **Reminder**.\n4. Tap **Save bill**.\n\nIt goes out on each date, lowers your **Current balance** and shows on **Monthly bills**.\n\nFor money you move to your own savings account, use **Add money** on that account instead, so it isn’t counted as spending.',
    keywords: [
      'allowance',
      'donation',
      'remittance',
      'child support',
      'tithe',
      'regular payment',
      'Other',
    ],
    related: [
      'bills.add.how',
      'bills.add.categories',
      'bills.add.recurring',
      'bills.basics.difference',
    ],
    route: '/add-bill',
  },
  {
    id: 'bills.amount.calculator',
    topic: 'bills',
    title: 'How does the Calculator on an amount work?',
    questions: [
      'how does the calculator button work',
      'Cannot divide by zero',
      'what does AC do on the calculator',
      'can i add up two amounts before saving',
      'calculator on the bill amount',
      'calculator icon in the salary amount box',
      'does the calculator round',
      '2 + 3 x 4 gives the wrong answer',
      'how do i divide my yearly salary in skip',
      'calculator for expected income',
      "the calculator result didn't go into the amount",
    ],
    answer:
      'The **Calculator** works like a pocket calculator, and **Done** puts the result into the amount. You’ll find it on a bill’s amount, as the calculator icon in the **Amount** box on **Salary**, and in **Expected income** when you add a bank account.\n\n- **AC** clears everything, and the back key deletes the last digit.\n- **+**, **−**, **×** and **÷** work in the order you tap them, so 2 + 3 × 4 gives 20, not 14.\n- Each step is rounded to the cent.\n- **Done** finishes a sum even if you haven’t tapped **=**.\n\nDividing by zero shows **Cannot divide by zero** and clears the sum. Tap the back arrow at the top to leave without changing the amount.',
    keywords: ['calculator', 'AC', 'divide by zero', 'add up', 'sum'],
    related: ['bills.add.amount'],
    route: '/add-bill',
  },
];
