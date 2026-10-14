# Privacy policy: new English draft (2026-10-13, Marcus; revised the same day after Dmitri's fact-check)

A draft for the Founder's approval, not legal advice. It needs a lawyer's review before release (decision 11). English only. Spanish and French follow once the English is approved.

Built from Dmitri's fact sheet (`.claude/team/dev/legal-facts-2026-10-13.md`), his fact-check of the first draft, and the English values of `legal.privacy.*` in `src/i18n/messages/legal.ts`. Each section carries a tag: KEEP (unchanged), UPDATE (changed) or NEW. Suggested message keys are in brackets. Old keys keep their names where the meaning holds, and new keys get the next free number. Block kinds match the `LegalDocument` component: plain text, bullets, and "Note:" for the shaded note block.

Line markers:
- `> ALT:` is the alternative wording if a pending decision goes the other way.
- `> GATE:` means the sentence is only true once the named work has landed. It must not ship before then.

Drafting assumptions, from the fact sheet:
- 7-year deletion switched on (decision 7).
- Splits leftovers removed (decision 12).
- Buy Me a Coffee removed (decision 5).
- The delete-account warning for subscribers built (decision 9; gated below).
- Sentry carries the account id, and its reports never include what you typed (decision 13; gated below). "Never your IP" isn't promised.
- Minimum age 18 (decision 6).

---

## 0. Title, date and summary (UPDATE)

**Title** [`legal.privacy.title`] (KEEP): Privacy policy

**Last updated** [`legal.privacy.updated`] (UPDATE): [DATE]

**Summary** [`legal.privacy.summary`] (UPDATE):
Skip is a budgeting app, so almost everything in it is something you typed. This explains what is stored, what stays on your phone, who else is involved, and how to delete it.

  Why: "how to get rid of all of it" promised too much. RevenueCat's purchase record, Sentry reports and emails already sent stay after deletion (facts, Retention and deletion).

---

## 1. Who we are (UPDATE)

**Heading** [`who.heading`] (KEEP): Who we are

[`who.p1`] (UPDATE):
Skip is a personal budgeting app published by the Weknd team. Wherever this policy says “we”, it means the Weknd team: [LEGAL NAME], [POSTAL ADDRESS].

[`who.p2`] (KEEP):
You can reach us about anything in this policy at admin@skipapps.net.

  Why: privacy laws in our five markets expect the legal name and address of whoever is responsible for the data. "The Weknd team" isn't a legal name, and app.json names no publisher (decision 1, facts Other).

---

## 2. What Skip stores about you (UPDATE)

**Heading** [`stores.heading`] (KEEP): What Skip stores about you

[`stores.p1`] (UPDATE):
Skip keeps what you put into it, plus what it needs to sign you in, send your reminders and know whether you have Skip Pro. Here it is, in groups:

Bullets:
- [`stores.b1`] (UPDATE) Your account: the email address you signed up with, and your password in a scrambled form that can’t be read back.
- [`stores.b5`] (NEW) If you sign in with Apple: the account id Apple gives us and the email it shares, which may be a private relay address. Skip doesn’t save the name Apple offers.
- [`stores.b6`] (NEW) If you sign in with Google: the account id and email Google gives us. Google’s sign-in record also includes your full name and a link to your profile photo. Skip doesn’t use or show either.
- [`stores.b2`] (UPDATE) Your profile: the display name you choose and the avatar you pick from Skip’s own set.
- [`stores.b3`] (UPDATE) Your money: the bills, subscriptions, receipts, receipt books, loans, salaries, pay, savings, goals and spending habits you enter, with their notes and logo choices. That includes the loan rates and terms, and the hours, overtime and deductions, that you type. It also includes what your bills and subscriptions have charged, your card payments and transfers, and how and when each receipt was added.
- [`stores.b4`] (UPDATE) Your cards and bank accounts: the name you give them, the network or bank, the account type, a colour, the balance you type and its date, a due day, an optional credit limit, and, if you add them, the last four digits — never more.
- [`stores.b7`] (NEW) Your Skip Pro status: whether you have Pro, which plan, when it renews or ends, whether it will renew, and whether the purchase was real or a test. It comes from Apple through RevenueCat. Skip also notes when it showed you the one-time offer, so it appears only once.
- [`stores.b8`] (NEW) Messages you send us from the contact form: the topic, the name you give (if any) and your message. Skip adds your account email, so we can reply, and your account id. They come to us by email; Skip’s database doesn’t keep them.
- [`stores.b9`] (NEW) Your settings: your time zone, kept up to date from your phone so reminders arrive at the right hour; your reminder choices and when each was last sent; your default receipt book; and whether you closed the getting-started card.
- [`stores.b10`] (NEW) Your phone’s push address, once you turn on a reminder or the monthly wrap-up. Apple gives it to Skip so notices can reach your iPhone. It is deleted when you sign out or delete your account, or when Apple tells us it no longer works.

Note [`stores.note`] (UPDATE):
Skip never asks for and never stores a full card number, an expiry date, a security code, or any banking login. When a receipt shows a card’s last four digits, Skip uses them to pick the card and doesn’t save them. Skip does not connect to your bank and cannot move money.

  Why: Guideline 5.1.1(i) requires every kind of data collected. The old "display name, and nothing else" was false. Sources: facts "On the server, per person", "Sign-in and email" (Google name and photo link, Apple relay email, the contact form sent by email) and "Skip Pro" (entitlements row, `pro_offer_seen_at`). Dmitri's fact-check corrected four points: last four digits are optional; Home tile order is never written; contact messages aren't stored in the database; and the push address is stored for a reminder or the wrap-up and removed at sign-out, at deletion or when Apple reports it dead. Receipt card digits aren't saved (facts "Scanning and uploads").

---

## 3. What never leaves your phone (UPDATE)

**Heading** [`local.heading`] (KEEP): What never leaves your phone

Bullets:
- [`local.b1`] (UPDATE) Scanning or uploading a receipt. The camera image, or the photo or PDF you pick, is read on your phone by Apple’s own on-device text recognition, and nothing is uploaded. Skip then saves the details you confirm, just like a receipt you type: the shop, amount, date, card or account, category, any note, the receipt book, and that it came from a scan or an upload.
- [`local.b2`] (UPDATE) Your appearance, haptics, app lock, language, currency and wrap-up settings, and which tips and news you’ve already seen.
- [`local.b3`] (NEW) Your voice corrections, the stores and logo answers Skip remembers, and your last 10 payment searches. All of them are erased when you sign out. When you pick a logo, Skip Logos also gets a vote (see “Who else sees it”).
- [`local.b4`] (NEW) Insights. They are worked out on your phone, and the results aren’t sent anywhere.
- [`local.b5`] (NEW) Exports (Skip Pro). The CSV or PDF is made on your phone for the share sheet, and only the newest one is kept there. Where you send it is up to you.
- [`local.b6`] (NEW) The monthly wrap-up and “Remind me in 1 hour” notifications, which your phone schedules itself.

[`local.p1`] (NEW):
Your sign-in session is kept on your phone and only ever sent to Supabase, to prove it’s you.

Note [`local.note`] (NEW):
One exception: a shop or service name you type, or that Skip reads from a receipt, is looked up to find its logo.

  Why: facts "Scanning and uploads": the camera and text reading run on the phone and there is no upload. The saved receipt fields, the sign-in session going to Supabase, everything in b3 being erased at sign-out, and logo lookups for both typed and scanned names come from Dmitri's fact-check. Facts "Only on the phone" cover AsyncStorage and exports in the cache with only the newest kept. Facts "Other": Insights are worked out on the phone.

---

## 4. Adding things by voice (UPDATE)

**Heading** [`voice.heading`] (KEEP): Adding things by voice

[`voice.p1`] (KEEP):
Tap the microphone and say something like “Netflix $15.99 every month” to add a receipt, bill or subscription without typing. Here is exactly what happens to what you say.

Bullets:
- [`voice.b1`] (KEEP) Your words are turned into text by Apple’s speech recognition, built into your iPhone. Skip does not use any third-party speech or transcription service, and has no speech server of its own.
- [`voice.b2`] (KEEP) When your iPhone can run speech recognition on the device, your voice never leaves it. When it can’t, Apple’s speech recognition service processes the audio instead, under Apple’s own privacy terms rather than this one.
- [`voice.b5`] (NEW) To help Apple hear names correctly, Skip sends up to 100 hint words with each request: your own store, bill and subscription names first, then well-known brand names. When Apple’s servers do the recognising, these hints go to Apple too.
- [`voice.b3`] (KEEP) Skip never records or keeps the audio itself, on your phone or on our servers. Only the text you review and confirm becomes a receipt, bill or subscription — stored exactly like one you type in by hand.
- [`voice.b4`] (UPDATE) If you correct what Skip heard (for example, turning “spot a fly” into Spotify), Skip remembers that correction on your phone only, so it recognises it next time. These corrections are never uploaded, and they are cleared when you sign out or delete your account.

Note [`voice.note`] (KEEP):
Skip asks for microphone and speech recognition access the first time you use voice input. You can turn either off at any time in iOS Settings → Skip Budget — typing still works exactly as before.

  Why: facts "Voice": up to 100 hint words, the person's own names first, and on the server path they go to Apple. No audio is kept. Dmitri's fact-check: corrections are cleared at sign-out as well as at deletion.

---

## 5. Paying for Skip Pro (NEW)

**Heading** [`pro.heading`] (NEW): Paying for Skip Pro

[`pro.p1`] (NEW):
Skip Pro is bought through the App Store. Apple takes the payment, under Apple’s own terms and privacy policy. We never see your card details or your Apple Account.

[`pro.p2`] (NEW):
RevenueCat, a service that works for us, checks your purchase with Apple and tells Skip whether you have Pro. Skip signs in to it with your Skip account id whenever you’re signed in, even if you never buy. It receives the purchase details Apple shares, such as the plan, its dates, whether it was a free trial, and the price and country.

[`pro.p3`] (NEW):
RevenueCat never receives your name, your email or anything you’ve entered in Skip.

[`pro.p4`] (NEW):
We use this to switch Skip Pro on and off for you, and to see how Skip Pro is doing overall, such as how many people subscribe or cancel.

  Why: facts "Skip Pro": RevenueCat is started for every signed-in account, with the Supabase account id as its user id and no email, name or attributes sent. The entitlements row is written only by the webhook. 5.1.1(i) requires every use of the data. RevenueCat's own guidance lists purchase history as used for app functionality and analytics, which is the second half of p4.

---

## 6. Who else sees it (UPDATE)

**Heading** [`others.heading`] (KEEP): Who else sees it

[`others.p1`] (UPDATE):
Skip uses a few services to run. These ones work for us: they handle data only to provide their service to Skip, they may not use it for their own purposes, and they must protect it at least as well as this policy does.

Bullets:
- [`others.b1`] (UPDATE) Supabase — hosts the database your data lives in and handles sign-in. When you type a store, Skip searches its own brand list there.
- [`others.b6`] (NEW) RevenueCat — checks Skip Pro purchases with Apple (see “Paying for Skip Pro”).
- [`others.b7`] (NEW) Resend — sends the emails with your sign-in and reset codes, and delivers your contact-form messages to us.
- [`others.b3`] (UPDATE) Sentry — receives crash and error reports so faults can be fixed. A report carries your account id, your iPhone model, the iOS and app versions, and what the app was doing. It doesn’t include what you typed or what your budget contains. Like any web service, Sentry may also see the internet address a report comes from.

> GATE: true only once the logic chat's Sentry fixes land. Those are the JS scrubber, iPhone-side network breadcrumbs switched off, and `setUser` with the account id (decision 13). Until all three are in, the "account id" and "doesn't include what you typed" sentences are not accurate.

> ALT (once Sentry's "Prevent Storing of IP Addresses" is confirmed on), replacing the last sentence: Sentry is set not to store the internet address a report comes from.

- [`others.b8`] (NEW) Cloudflare — runs Skip Logos, our own logo service, described below.

[`others.p3`] (NEW):
Skip Logos finds logos for shops and services. To find one, your phone sends a shop or service name or a website, your iPhone’s Region country and a category. It never sends your account id, email or name.

[`others.p4`] (NEW):
When you pick a logo, Skip also sends a tag made from your account id by one-way scrambling, so each person counts as one vote. The tag can’t be turned back into your account id. If you report a wrong logo, the report sends the website and the name.

[`others.p5`] (NEW):
The service keeps names it didn’t know (with the country), votes (with the tag) and reports. To learn a new name, it may look it up on Wikidata and visit the brand’s own website. Those lookups come from Cloudflare, not your phone, and aren’t tied to you. Skip Logos and logos.skipapps.net run on Cloudflare, which sees your phone’s internet address like any website. Our code doesn’t store it, and Cloudflare keeps its own request logs for a few days.

[`others.p6`] (NEW):
These companies work with you directly, under their own privacy policies:

Bullets:
- [`others.b2`] (UPDATE) Apple — if you choose Sign in with Apple, to confirm it is you.
- [`others.b9`] (NEW) Apple’s App Store — takes payment for Skip Pro.
- [`others.b4`] (UPDATE) Apple Push Notification service — delivers your reminders and “payment went out” notices, once you’ve turned on a reminder. A notice’s text can include a bill, subscription or card name and an amount.
- [`others.b5`] (UPDATE) Apple’s speech recognition — if your iPhone can’t run speech recognition on the device, what you say when you use voice input, and the hint words, go to Apple’s speech service to be turned into text. Skip never receives the audio itself, only the text.
- [`others.b10`] (UPDATE) Google — if you choose to sign in with Google, to confirm it is you. Google’s sign-in tool, which is built into Skip, may also collect some details for Google, as Google’s privacy policy describes.

> ALT (decision 5, only if the Buy Me a Coffee row stays): Buy Me a Coffee — if you choose to tip us from Settings, on their website and under their own terms. Skip sends them nothing.

[`others.p2`] (UPDATE):
Skip does not sell your data, does not share it for advertising, and does not track you across other apps or websites. It carries no advertising and no tools that follow what you do in the app. Beyond your own data, the only information we get is the crash and error reports, the Skip Pro purchase details, and the logo lookups, votes and reports described above.

  Why: 5.1.1(i) requires confirming that third parties give "the same or equal protection" (p1, which depends on the data-processing agreements in Checks). Facts "Sign-in and email": Resend sends codes and the contact form. Facts "Sentry" and decision 13: account id approved and gated on the logic chat's fixes, IP not promised. Facts "Logo service" plus Dmitri's fact-check: what's sent, the voter tag, reports, Wikidata and site visits from Cloudflare, and Cloudflare's own few-day request logs. Dmitri's fact-check on Notifications: push notices need a reminder turned on, and their text holds a name and an amount. The second sentence of b10 is my addition (see the label notes): Google Sign-In's own declaration lists data the policy should acknowledge. p2 no longer says "no third-party analytics", because RevenueCat gives us purchase information.

---

## 7. Where your data is stored (NEW)

**Heading** [`where.heading`] (NEW): Where your data is stored

[`where.p1`] (NEW):
Your data is stored on servers run by Supabase, in Canada (Montréal).

[`where.p2`] (NEW):
The other services above may handle data in other countries. Sentry, for example, stores crash and error reports in the United States. Wherever they are, they must protect it as this policy describes.

  Why: Dmitri's fact-check gives the Supabase region (Canada, Montréal) and Sentry's US storage. The UK, Canadian, Mexican and Australian privacy rules expect transfers abroad to be stated. The lawyer may add transfer wording.

---

## 8. How long it is kept (UPDATE)

**Heading** [`kept.heading`] (KEEP): How long it is kept

Bullets:
- [`kept.b1`] (UPDATE) Things that happened (recorded charges, receipts, including habit days, card payments and transfers, and pay you received) are deleted automatically seven years after the date on them.

> ALT (decision 7, if the 7-year job is not switched on): Things that happened (recorded charges, receipts, including habit days, card payments and transfers, and pay you received) are kept until you delete them or your account.

- [`kept.b2`] (UPDATE) Everything else you set up — bills, subscriptions, loans (with any extra payments), cards, accounts, salaries, savings, goals, habits and receipt books — is kept until you delete it. A standing order set up years ago is still a standing order.
- [`kept.b3`] (NEW) On the Free plan, lists show the last 90 days. Older entries are hidden, not deleted: they still count in your balances, and Skip Pro shows them again.
- [`kept.b4`] (NEW) Your account, profile and settings are kept until you delete your account.
- [`kept.b5`] (NEW) Messages you send us stay in our email inbox until you ask us to delete them. Resend keeps its own record of sending them for a limited time.
- [`kept.b6`] (NEW) RevenueCat keeps its record of your Skip Pro purchases, even after you delete your Skip account.
- [`kept.b7`] (NEW) Sentry deletes crash and error reports automatically after [SENTRY DAYS] days.
- [`kept.b8`] (NEW) Skip Logos keeps names, votes and reports without your account id.
- [`kept.b9`] (NEW) Our hosting providers keep short technical logs, such as the internet address a request came from, and rolling backups, for a limited time.

  Why: facts "Retention and deletion": `prune_expired_data` is assumed scheduled (decision 7). Dmitri's fact-check corrected its list (receipts include habit days; payments include transfers) and its rule (seven years after each row's date). Free's 90-day window hides and never deletes. RevenueCat, Sentry and logo-service data aren't removed by deletion. Dmitri's fact-check adds the providers' logs and backups and Resend's sending record. 5.1.1(i) requires the retention rules. The exact periods are in Checks.

---

## 9. Deleting your account (UPDATE)

**Heading** [`deleting.heading`] (KEEP): Deleting your account

[`deleting.p1`] (UPDATE):
Settings → Delete account removes your account and everything Skip keeps about you in its database, all at once. Skip asks twice before it does anything, and shows you a count of the main things that will go.

[`deleting.p2`] (NEW):
On your phone, Skip also clears your voice corrections, remembered stores, recent searches and any unfinished voice entry.

Note [`deleting.note`] (KEEP):
Deletion is immediate and permanent. There is no grace period and no backup copy kept for you to restore from.

Note [`deleting.note2`] (NEW):
Deleting your account does not cancel Skip Pro. Apple keeps billing you until you cancel. Cancel first in iOS Settings → your name → Subscriptions. If you have Skip Pro, Skip reminds you before you delete.

> GATE: "If you have Skip Pro, Skip reminds you before you delete" is true only once the subscriber warning on Delete account is built (decision 9). It isn't built yet.

> ALT (if the warning isn't built by release): drop the last sentence.

[`deleting.p3`] (NEW):
A few things sit outside your Skip account and stay after you delete it:

Bullets:
- [`deleting.b1`] (NEW) Apple’s own record of your purchases, and your Skip Pro subscription until you cancel it.
- [`deleting.b2`] (NEW) RevenueCat’s record of your Skip Pro purchases.
- [`deleting.b3`] (NEW) Crash and error reports already sent to Sentry, until Sentry deletes them on schedule.
- [`deleting.b4`] (NEW) Logo votes, which carry only the scrambled tag, and wrong-logo reports and unknown shop names, which carry nothing about you.
- [`deleting.b5`] (NEW) Emails already sent, such as your sign-in codes, and messages you sent us. Ask and we’ll delete the messages.
- [`deleting.b7`] (NEW) Our hosting providers’ short technical logs and rolling backups, until they expire.
- [`deleting.b6`] (NEW) Apple or Google may still list Skip as an app you signed in with. You can remove it there (see “Your choices”).

> ALT (decision 12, if the Splits leftovers stay on the server), an extra bullet: In Skip Splits groups you were part of, your name stays as a placeholder so the other members’ records still add up.

  Why: facts "Retention and deletion": `delete_my_account` deletes every table in one go, and the phone clears corrections, remembered stores, searches and the voice draft. p1 now says "in its database", because contact messages live in email, not the database. The confirmation counts leave out loans, habits, goals, savings, card payments, pay and books, so "a count of exactly what will go" is gone. The subscription, RevenueCat, Sentry, logo data and sent emails aren't removed. b7 is my addition, matching kept.b9, so the list of what stays is complete. Apple's account-deletion guidance says to tell subscribers that billing continues through Apple, to ask them to cancel first, and to say what is kept.

---

## 10. Your choices (NEW)

**Heading** [`choices.heading`] (NEW): Your choices

[`choices.p1`] (NEW):
You can change these at any time:

Bullets:
- [`choices.b1`] (NEW) Microphone, speech recognition and notifications: turn any of them off in iOS Settings → Skip Budget. Typing still works. Voice entry and reminders stop until you turn them back on.
- [`choices.b2`] (NEW) Signing out deletes your phone’s push address from our servers. Turning reminders off in Skip doesn’t; to stop all notices, turn notifications off in iOS Settings → Skip Budget.
- [`choices.b3`] (NEW) Sign in with Apple: you can stop it in iOS Settings → your name → Sign in with Apple.
- [`choices.b4`] (NEW) Sign in with Google: you can remove Skip from the third-party connections in your Google Account.

Note [`choices.note`] (NEW):
Stopping Apple or Google sign-in doesn’t delete your Skip account, and you may not be able to sign in to it that way again. To remove your data, delete your account in Skip first.

  Why: 5.1.1(i) requires saying "how a user can revoke consent". Apple's paths come from Apple Support "Manage your apps with Sign in with Apple" (102571). Google's comes from Google's "Manage connections between your Google Account and third parties" (13533235). Dmitri's fact-check: turning reminders off keeps the push address; signing out deletes it.

---

## 11. Your rights over your data (UPDATE)

**Heading** [`rights.heading`] (KEEP): Your rights over your data

[`rights.p1`] (UPDATE):
You can correct most of what you entered by editing it, and delete it, or your whole account, in the app. For anything you can’t remove yourself, write to us.

[`rights.p2`] (NEW):
Write to admin@skipapps.net and we will send you a copy of everything we hold about you.

[`rights.p3`] (NEW):
Depending on where you live, you may also have the right to get your data in a portable form, to object to or limit some processing, and to complain to your data protection authority. Write to us and we will action it.

  Why: "you can see everything Skip holds about you inside the app" isn't true on Free, where lists show 90 days (facts "Skip Pro"). Dmitri's fact-check: not everything can be edited or removed in the app, hence "most" and the write-to-us route. The lawyer can name each market's regulator.

---

## 12. Children (UPDATE)

**Heading** [`children.heading`] (KEEP): Children

[`children.p1`] (UPDATE):
Skip is for people aged 18 and over. We do not knowingly collect data from anyone younger. If you believe someone under 18 has created an account, write to us and we will delete it.

  Why: decision 6 (18+). This is the same age Mia uses in the Terms.

---

## 13. Changes to this policy (UPDATE)

**Heading** [`changes.heading`] (KEEP): Changes to this policy

[`changes.p1`] (UPDATE):
If this policy changes in a way that affects what is collected or who it is shared with, the date at the top changes and Skip tells you on its Notifications page before the change takes effect.

  Why: facts "Other": the app has a News feed on its Notifications page, so "told in the app" has a real channel.

---

## Before → after, in plain words (for the Founder)

1. **Summary:** "how to get rid of all of it" becomes "how to delete it", because a few records outside Skip stay after deletion.
2. **Who we are:** now names the legal owner and postal address (placeholders until you choose).
3. **What's stored:** it used to say "your display name, and nothing else". It now lists everything in plain groups:
   - your account, plus Apple and Google sign-in details, including the name and photo link Google keeps, which Skip doesn't use;
   - your profile and avatar;
   - your money;
   - your cards and accounts, with the last four digits only if you add them;
   - your Skip Pro status;
   - contact messages, which reach us by email and aren't kept in Skip's database;
   - settings like time zone and reminders;
   - the push address, which goes when you sign out or delete your account, or when Apple says it's dead.
4. **Card digits on receipts:** a new line says Skip uses them to pick the card and doesn't save them.
5. **On the phone:**
   - Says exactly which receipt details a scan or upload saves.
   - Moves the sign-in session out, because it's sent to Supabase.
   - Voice corrections, remembered stores and searches are erased at sign-out.
   - Any shop name, typed or read from a receipt, is looked up for its logo.
6. **Voice:** your own store, bill and subscription names go to Apple as hints when Apple's servers do the recognising. Corrections are cleared at sign-out too.
7. **New section, Paying for Skip Pro:**
   - Apple takes the money, and RevenueCat checks the purchase.
   - Skip connects to RevenueCat with your account id whenever you're signed in, even if you never buy.
   - RevenueCat never gets your name or email.
8. **Who else sees it:**
   - Adds RevenueCat, Resend and Cloudflare. The logo service section says exactly what it gets, and that Cloudflare keeps request logs for a few days.
   - Sentry carries your account id. That line waits on the Sentry fixes.
   - Apple and Google are listed as working under their own policies. Google's sign-in tool may collect some details for Google.
   - Reminder and "payment went out" notices only start once a reminder is on.
9. **"No third-party analytics"** becomes "no advertising and no tools that follow what you do in the app". The only reports we get are crash reports, purchase details and logo lookups, votes and reports.
10. **New section, Where your data is stored:** Supabase's servers in Canada (Montréal); Sentry stores reports in the US.
11. **How long it's kept:**
    - Things that happened (including habit days and transfers) are deleted seven years after their date.
    - Free hides entries older than 90 days and never deletes them.
    - Adds how long RevenueCat, Sentry, our inbox, Resend, the logo service, and hosting logs and backups keep things.
12. **Deleting your account:**
    - Removes everything in Skip's database.
    - No longer claims the count shows "exactly" what goes.
    - Says deleting doesn't cancel Skip Pro, so cancel with Apple first. The "Skip reminds you" line waits on the warning being built.
    - Lists what stays elsewhere, now including hosting logs and backups.
13. **New section, Your choices:**
    - How to switch off the microphone, speech recognition and notifications, and how to stop Apple or Google sign-in.
    - Turning reminders off in Skip doesn't delete the push address; signing out does.
14. **Your rights:** drops "see everything in the app". You can correct most things yourself; for the rest, and for a full copy, write to us.
15. **Children:** now plainly 18 and over.
16. **Changes:** you'll be told on the Notifications page before a change takes effect.

## Placeholders, ALTs and GATEs

Placeholders:
- `[DATE]`: the "Last updated" date (section 0).
- `[LEGAL NAME]` and `[POSTAL ADDRESS]`: section 1 (decision 1).
- `[SENTRY DAYS]`: Sentry's data retention for our plan (section 8). Read it from Sentry's settings.

(`[REGION]` is gone: Supabase is in Canada, Montréal.)

ALTs:
- Section 6, Sentry: a firmer IP sentence, once "Prevent Storing of IP Addresses" is confirmed on (decision 13).
- Section 6, Buy Me a Coffee: an extra bullet, only if the tip row stays (decision 5). The current policy never mentions it.
- Section 8: no automatic deletion, if the 7-year job isn't switched on (decision 7).
- Section 9: drop "Skip reminds you before you delete", if the subscriber warning isn't built (decision 9).
- Section 9: a Splits placeholder-name bullet, if the Splits leftovers stay (decision 12).

GATEs:
- Section 6, Sentry bullet: needs the logic chat's JS scrubber, iPhone-side network breadcrumbs off, and `setUser` with the account id.
- Section 9, note2: needs the subscriber warning on Delete account (decision 9).

## Checks before release

- Confirm in the Supabase dashboard that Resend sends the sign-in emails (others.b7). It's a dashboard setting, not in the repo.
- Data-processing agreements accepted with Supabase, RevenueCat, Resend, Sentry and Cloudflare (Founder and lawyer). Without them, others.p1's "must protect it at least as well as this policy does" isn't backed.
- Retention periods: Sentry's `[SENTRY DAYS]` (kept.b7), and Supabase's log and backup periods (kept.b9, deleting.b7). The lawyer may want day counts instead of "a limited time".
- Sentry's "Prevent Storing of IP Addresses": confirm it, to use the section 6 ALT.
- The two GATEs above, before the text ships.
- Pending decisions behind the assumptions: 7-year job scheduled (7), Splits leftovers removed (12), Buy Me a Coffee removed (5).

## App Privacy label rows

For the Founder (App Store Connect → App Privacy) and Dilip (`ios/SkipBudget/PrivacyInfo.xcprivacy`, which today declares nothing). Tracking is No on every row, so the manifest's `NSPrivacyTracking` stays false with no tracking domains. "Linked" means tied to the person's account.

The label must also cover what the libraries we ship declare in their own privacy manifests: Google Sign-In, Sentry and RevenueCat. Several rows below are Yes only because of those declarations; the "What it is" column says so. Rows marked *judgement call* are conservative choices: declaring more than strictly needed is safe at review, while declaring less is what gets apps rejected.

| Data type (App Store Connect) | Manifest key (`NSPrivacyCollectedDataType…`) | Collected | Linked to the person | Used for tracking | Purpose | What it is in Skip |
|---|---|---|---|---|---|---|
| Contact Info › Email Address | `EmailAddress` | Yes | Yes | No | App Functionality | Sign-in email (or Apple relay address), reply-to on contact messages, sign-in codes sent through Resend |
| Contact Info › Name | `Name` | Yes | Yes | No | App Functionality | Display name; optional name on the contact form; full name in Google's sign-in record (stored, unused) |
| Contact Info › Phone Number | `PhoneNumber` | Yes | Yes | No | App Functionality | Declared by Google Sign-In's manifest; Skip itself never asks for a phone number |
| Contact Info › Physical Address, Other Contact Info | — | No | — | — | — | Not asked for |
| Health & Fitness (both) | — | No | — | — | — | — |
| Financial Info › Payment Info | `PaymentInfo` | Yes (*judgement call*) | Yes | No | App Functionality | Optional last four digits and the network or bank of the person's own cards and accounts. Apple's payment for Pro isn't this (Apple handles it, we never see it) |
| Financial Info › Credit Info | — | No | — | — | — | Means credit score; the optional credit limit sits under Other Financial Info |
| Financial Info › Other Financial Info | `OtherFinancialInfo` | Yes | Yes | No | App Functionality | Bills, subscriptions, charges, receipts, loans, salaries, pay, savings, goals, habits, balances, credit limits |
| Location › Precise Location | — | No | — | — | — | Skip never uses location services |
| Location › Coarse Location | `CoarseLocation` | Yes | Yes | No | App Functionality | Declared by Google Sign-In's manifest, whatever Sentry's IP setting. Sentry can also store the sender's IP. Time zone and Region country are settings, not location |
| Sensitive Info | — | No | — | — | — | — |
| Contacts | — | No | — | — | — | — |
| User Content › Emails or Text Messages | — | No | — | — | — | — |
| User Content › Photos or Videos | — | No | — | — | — | Read on the phone, never uploaded; the receipt bucket is empty |
| User Content › Audio Data | — | No | — | — | — | Skip never receives audio; Apple's speech service is part of iOS (Mia's 2026-10-01 reasoning) |
| User Content › Gameplay Content | — | No | — | — | — | — |
| User Content › Customer Support | `CustomerSupport` | Yes | Yes | No | App Functionality | Contact form topic, name and message, delivered by email with the account email and id |
| User Content › Other User Content | `OtherUserContent` | Yes | Yes | No | App Functionality | Notes, names given to things, receipt books |
| Browsing History | — | No | — | — | — | — |
| Search History | `SearchHistory` | Yes | No | No | App Functionality | Unknown shop and service names kept by Skip Logos (no account id); store searches against the brand list on Supabase. Payment searches stay on the phone |
| Identifiers › User ID | `UserID` | Yes | Yes (Sentry's part once `setUser` lands) | No | App Functionality, Analytics | Skip account id (Supabase), shared with RevenueCat and, once `setUser` lands, Sentry; Apple and Google sign-in ids; the logo voter tag |
| Identifiers › Device ID | `DeviceID` | Yes (*judgement call*) | Yes | No | App Functionality, Analytics | Push address (device token), stored once a reminder or the wrap-up is on; Analytics from the libraries' declarations |
| Purchases › Purchase History | `PurchaseHistory` | Yes | Yes | No | App Functionality, Analytics | Skip Pro status row; RevenueCat's purchase record (RevenueCat's own guidance) |
| Usage Data › Product Interaction | `ProductInteraction` | Yes (*judgement call*) | Yes | No | App Functionality | How and when each receipt was added (it sets the Free scan and upload limits), when the offer was shown, getting-started closed |
| Usage Data › Advertising Data | — | No | — | — | — | No ads |
| Usage Data › Other Usage Data | `OtherUsageData` | Yes | Yes | No | Analytics | Declared by Google Sign-In's manifest |
| Diagnostics › Crash Data | `CrashData` | Yes | Yes, once `setUser` lands | No | App Functionality | Sentry crash reports |
| Diagnostics › Performance Data | `PerformanceData` | Yes | Yes, once `setUser` lands | No | App Functionality | Sentry's app-hang reports |
| Diagnostics › Other Diagnostic Data | `OtherDiagnosticData` | Yes | Yes, once `setUser` lands | No | App Functionality | Sentry error reports: database error code, data kind, device model, iOS and app version |
| Surroundings, Body | — | No | — | — | — | — |
| Other Data | `OtherDataTypes` | Yes (*judgement call*) | Yes | No | App Functionality, Analytics | Time zone, reminder settings, default receipt book; Analytics from the libraries' declarations |

Manifest purposes map like this: App Functionality = `NSPrivacyCollectedDataTypePurposeAppFunctionality`, and Analytics = `NSPrivacyCollectedDataTypePurposeAnalytics`. Google Sign-In, Sentry and RevenueCat ship their own privacy manifests, which Xcode adds into the app's report. The app's own manifest still has to list Skip's own data above. App Store Connect needs the combined answer.
