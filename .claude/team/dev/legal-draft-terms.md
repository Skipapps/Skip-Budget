# Terms of service: English draft for Founder approval (2026-10-13)

Draft by Mia (Marketing). Nothing here is in the app yet. Facts come from `.claude/team/dev/legal-facts-2026-10-13.md` (Dmitri-checked). Current text: `src/i18n/messages/legal.ts`, `legal.terms.*` (English).

Revised 2026-10-13 with Dmitri's fact-check corrections (sections 1, 5, 6, 7, 8, 9, 10, 11, 12). Where the fact sheet and Dmitri's corrections differ, his corrections win.

How to read this file:
- Everything between a heading and its "Why:" line is the text exactly as it would appear in the app. The section number and the KEEP / UPDATE / NEW tag are for review only; the app shows headings without them.
- "Why:" lines are for Dmitri and are not app text.
- `> ALT:` lines are for pending Founder decisions. The recommended version is always written first.
- "Skip" in the app text is the app. "We" is the Weknd team.
- Spelling is British, to match the app's English copy ("licence", "cancelling"). Apple's own document title stays as Apple spells it.

---

# App text starts here

**Last updated [DATE]**

# Terms of service

### Summary · UPDATE

The agreement between you and the Weknd team for using Skip.

In short:
- Skip is free to download, and most of its features are free.
- Skip Pro is an optional subscription, billed by Apple.
- Skip is a tool for tracking your own money. It is not financial advice.
- What you enter stays yours, and you can delete all of it whenever you like.

  Why: Old summary had no Pro. New first two bullets are the CEO brief (free to download, most features free, Pro optional and billed by Apple). Fact sheet, "Skip Pro": Apple in-app purchase, "Free" list. Never "free forever", because the app and Pro can change (section 12).

---

### 1. Agreeing to these terms · KEEP + NEW sentences

By creating an account or using Skip you agree to these terms. If you do not agree with them, do not use the app. If you are using Skip on behalf of somebody else, you confirm you are allowed to agree on their behalf.

You must be 18 or older to use Skip.

Apple's standard licence for apps, the "Licensed Application End User License Agreement" (the standard EULA), applies to Skip alongside these terms. You can read it at https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

  Why: First paragraph is the current text, unchanged. Age 18+ is pending decision 6. Standard EULA linked is pending decision 3 (Apple's standard EULA, no custom one). The document's name is written as Apple spells it ("License"), while the rest of the text stays British. The link must be tappable in the app (see Checks, item 8).

> ALT (decision 3): if the Founder wants a custom licence instead of Apple's standard one, this paragraph is replaced by that licence. Not drafted.

---

### 2. What Skip is, and what it is not · KEEP, one sentence fixed

Skip is a tool for writing down and looking at your own money. It records what you tell it and does arithmetic on it.

Skip is not a bank, a payment service, an accountant or a financial adviser. Nothing in the app is financial, tax or legal advice. A figure can come from something you typed, from a scan, from your voice, or from Skip's own arithmetic. Skip cannot know whether it is right.

Skip has no connection to your bank and cannot move, hold, send or receive money. Projections of future bills and paydays are estimates based on the schedules you set, not statements about what will happen.

  Why: Paragraphs 1 and 3 are unchanged. Paragraph 2 replaces "Every figure comes from something you entered", which is no longer true. Fact sheet, "Scanning and uploads" (receipts read on the phone), "Voice" (speech turned into text), "Other" (Insights worked out on the phone).

---

### 3. Your account · KEEP

- Give accurate details when you sign up, and keep your sign-in method secure.
- An account is for one person. You are responsible for what happens under yours.
- Tell us at admin@skipapps.net if you think somebody else has got into it.

  Why: Current text, unchanged. Contact address from fact sheet, "Other".

---

### 4. Using Skip properly · KEEP

You agree not to break the law with Skip, not to try to reach other people's data, not to attack or overload the service, and not to pull it apart to rebuild or resell it.

  Why: Current text, unchanged.

---

### 5. What you put in stays yours · UPDATE

Everything you enter belongs to you. You give us only the permission needed to run the app for you — to store it, back it up, show it back to you on your devices, and use the services our Privacy policy lists to do that. That permission ends when you delete the data or your account, apart from the few things our Privacy policy says can stay.

  Why: Dmitri's correction. The old text said the permission ends on deletion, but the services that run Skip (named in the Privacy policy) and a few items survive deletion: fact sheet, "Retention and deletion", "Not removed by deletion" (RevenueCat's record, Sentry reports, logo-service votes and reports, emails already sent). The Privacy policy must list both the services and the items that can stay (see Checks, item 5).

---

### 6. Free and Skip Pro · NEW (replaces "Money")

Most of Skip is free to use. Skip Pro adds more.

The Pro page in Skip shows what Pro includes, and its price, before you pay.

  Why: CEO brief. "Exactly" dropped on Dmitri's check, so the sentence doesn't promise the page lists every detail. No feature list, no price typed (drafting rules). "New features first" and "Priority support" are left out on purpose; neither is built (fact sheet, "Skip Pro", last bullet). Prices are the App Store's (fact sheet, "Skip Pro"). The old "Money" text said Skip has no in-app purchases or subscriptions, which Skip Pro contradicts (Mia's 2026-10-07 log entry).

> ALT (decision 5): if the Buy Me a Coffee link stays in Settings, add this paragraph, which is the current sentence: "The “Buy a coffee for team” link is an entirely voluntary tip handled by Buy Me a Coffee under their own terms; it buys no feature and no obligation."

---

### 7. Paying for Skip Pro · NEW

Skip Pro comes as a monthly plan or a yearly plan. You buy it through Apple.

- Apple charges your Apple Account (Apple ID) when you confirm the purchase, or when a free trial ends.
- You pay the App Store's price for your Apple Account's country, in that country's currency. Skip's own currency setting doesn't change it.
- Both plans renew automatically until you cancel.
- Apple charges your Apple Account up to 24 hours before each new period starts.
- If the price changes, Apple tells you. Where Apple's rules require your consent to a new price, Apple asks for it.

  Why: Fact sheet, "Skip Pro": monthly and yearly auto-renewing subscriptions through Apple in-app purchase, group "Skip Pro"; prices shown are the App Store's price for the person's country. Dmitri's corrections: the charge also happens when a trial ends; the price follows the Apple Account's country and currency, and Skip's currency setting is display-only, so it can't change what Apple charges. "Apple Account" is Apple's current name for the Apple ID; the old name is written once, at first use. The 24-hour and price-change lines are Apple's auto-renewal rules (Marcus's outline; App Review Guideline 3.1.2(c) says to describe the subscription clearly before asking someone to subscribe).

---

### 8. Free trial · NEW

Sometimes Skip Pro starts with a free trial. Apple decides who can have a free trial. If you can, the Pro page shows it and how long it lasts.

A trial turns into the paid plan, at the price shown, unless you cancel at least 24 hours before it ends.

A trial can't be restarted.

  Why: Fact sheet, "Skip Pro": the trial shows only when the App Store has a free intro offer and Apple says the person is eligible; its length comes from App Store Connect, so no number is typed here. Wording is Dmitri's. The 24-hour cancel rule is Apple's. "Can't be restarted" is the CEO brief (Apple allows one intro offer per subscription group per Apple Account).

---

### 9. Special offers · NEW

Sometimes Skip shows a special offer. For example, you may see one once, the first time you leave the Pro page without buying. It stays open for 10 minutes.

Before you buy, the offer shows its yearly price. It's a yearly plan that renews automatically until you cancel, like any other plan.

  Why: Fact sheet, "Skip Pro", one-time offer: shown once per account, the first time a free person leaves the Pro page without buying; a 10-minute timer; it sells a yearly plan that renews automatically ("Billed once a year. Cancel anytime."). No price typed. This is the version that is safe today: it does not say the screen shows the renewal price, because that isn't confirmed (fact sheet: "Renewal price to confirm in App Store Connect"). See the ALT below and Checks, item 1.

> ALT: once App Store Connect confirms the renewal price and the offer screen gets a renewal line, the second paragraph's first sentence becomes: "Before you buy, the offer shows its yearly price, which is also the price it renews at."

---

### 10. Cancelling, refunds and restoring · NEW

**To cancel**
- On your iPhone, open Settings, tap your name, then Subscriptions, then Skip Budget.
- Or, while you have Skip Pro, open Settings in Skip, tap Skip Pro, then "Manage in the App Store".

Skip Pro stays on until the end of the period you paid for.

Deleting the app or your Skip account does not cancel Skip Pro. Only cancelling with Apple does.

**Refunds**

Apple handles refunds. We can't issue refunds ourselves. To ask Apple for one, go to https://reportaproblem.apple.com

This doesn't affect your legal rights.

**Restoring**

Skip Pro stays with the Skip account you bought it on, so signing in to that account on a new iPhone brings it back. If it doesn't show, tap "Restore purchase" on the Pro page.

  Why: Pending decision 4 (refunds: Apple handles them, we can't issue them, legal rights unaffected). Dmitri's corrections: the subscription is listed under the app's store name, "Skip Budget"; "Manage in the App Store" sits under Settings in Skip, then Skip Pro (subscribers only); Pro is tied to the Skip account (the server keeps one entitlement row per account, fact sheet "Skip Pro"), so signing in is the main way back and "Restore purchase" is the fallback. No sentence about moving Pro to another account. "Stays on until the end of the period" and "deleting does not cancel" are the CEO brief; fact sheet, "Retention and deletion": the Apple subscription is not cancelled by account deletion.

---

### 11. When Skip Pro ends · NEW

Nothing you made is deleted.

The Free limits come back. Today they are:
- One card and one bank account for new spending. Any others stay in Skip, greyed out, and still count in your balances. Until you have Skip Pro again, you can't open them or pick them for new spending.
- 15 camera scans and 15 uploads each calendar month.
- Lists show the last 90 days. Older entries are hidden, not deleted. They still count in your balances, and they come back when you have Skip Pro again.

These stop until you have Skip Pro again: adding things by voice, Insights, exporting your payments, and starting a new spending habit.

These keep working: the spending habits you already have, and everything you already added by voice or by scanning.

  Why: Replaced on Dmitri's code check. Fact sheet, "Skip Pro", "Free" and "When Pro ends": 1 card + 1 bank account; 15 camera scans + 15 uploads a month (own calendar month); lists show the last 90 days, older kept and still counted in balances. Dmitri's corrections: extra cards and accounts are greyed out and can't be opened or picked, so the old "nothing locked" is gone; the Pro-only verbs that stop are voice, Insights, export and new habits; existing habits and earlier voice and scan entries keep working. The rule against listing features applies to section 6; this section has to say what changes when Pro ends. "Today they are" keeps the Terms true if the limits move.

---

### 12. The app will change · UPDATE

Skip is under active development. Features may be added, altered or withdrawn, and the app may be unavailable at times for maintenance or for reasons outside our control. We do not promise any particular level of availability.

If we ever stop offering Skip Pro, we'll tell you in the app first. Then we'll take it off sale with Apple, so it stops renewing. You keep Skip Pro until the end of the time you've already paid for.

  Why: First paragraph is the current text, unchanged. Second paragraph is Dmitri's wording: taking a subscription off sale stops renewals, and Apple's minimum notice is 31 days, so "tell you first" is real. Related Apple rule: App Review Guideline 3.1.2(a), do not take away what existing users have already paid for. See Checks, item 3: I could not confirm the renewal mechanism from Apple's own pages.

---

### 13. No warranty · UPDATE

Skip is provided as it is. To the extent the law allows, we make no warranty that it will be uninterrupted, error-free, or that its calculations will suit any particular purpose. You are responsible for the financial decisions you make.

This doesn't affect your rights as a consumer.

  Why: First paragraph is the current text, unchanged. Consumer-rights sentence is the CEO brief. A lawyer should check this against local consumer law (open since Mia's 2026-10-07 log entry; decision 11).

---

### 14. Limits on liability · KEEP

To the extent the law allows, we are not liable for indirect or consequential loss, for lost profits or savings, or for any loss arising from decisions you made using Skip. Nothing here limits liability that cannot lawfully be limited — including for death or personal injury caused by negligence, or for fraud.

  Why: Current text, unchanged.

---

### 15. Ending it · UPDATE

You can stop using Skip and delete your account at any time from Settings. Deleting your account permanently removes what you saved in Skip. Our Privacy policy lists the few things that can stay, such as crash reports.

Deleting your account does not cancel Skip Pro. If you have Skip Pro, cancel it with Apple first. See "Cancelling, refunds and restoring" above.

We may suspend or close an account that breaks these terms, and will say why where we can.

  Why: Fact sheet, "Retention and deletion": `delete_my_account` deletes every table with the account, but the Apple subscription, RevenueCat's record, Sentry reports, logo-service votes and reports, and emails already sent are not removed. The old "removes your data permanently" is too strong for those, so I narrowed it and pointed to the Privacy policy, the same pointer as section 5. Pro sentence is the CEO brief and pending decision 9. Suspension sentence is the current text, unchanged.

> ALT (original wording): "You can stop using Skip and delete your account at any time from Settings, which removes your data permanently."

> ALT (decision 9): if the delete-account warning for subscribers is NOT built before release, the Pro paragraph stays as written. It tells people what to do; it does not say the app will warn them.

---

### 16. Changes to these terms · KEEP, one clause added

If these terms change materially, the date at the top changes and you will be told in the app, for example in Notifications, before the change takes effect. Continuing to use Skip after that means you accept the new terms.

  Why: Current text plus "for example in Notifications". Fact sheet, "Other": the News feed on the Notifications page makes "we'll tell you in the app" possible.

---

### 17. Law and contact · UPDATE

Skip is made by [LEGAL NAME], known as the Weknd team, at [POSTAL ADDRESS].

Questions about these terms go to admin@skipapps.net.

These terms are governed by the law of [GOVERNING LAW: state/province, country].

You keep the consumer protections of the place where you live, and you can use your local courts.

  Why: Pending decisions 1 and 2. Fact sheet, "Other": "Weknd team" appears in the app but app.json names no publisher, so the legal name is a placeholder. No arbitration clause and no class-action waiver, on purpose (decision 2), so there is nothing about either here. The old "to be confirmed before release" note is removed.

---

# App text ends here

---

## Before → after (for the Founder)

What changed, in plain words:

1. **Summary.** It now says Skip is free to download, most features are free, and Skip Pro is an optional subscription billed by Apple.
2. **Agreeing to these terms.** Two new sentences: you must be 18 or older, and Apple's standard app licence applies alongside these terms (with the link).
3. **What Skip is.** One sentence fixed. It used to say every figure comes from something you typed. Now it says figures can also come from a scan, your voice, or Skip's own arithmetic, and that Skip can't know whether they are right.
4. **Account, Using Skip properly.** No change.
5. **What you put in stays yours.** The permission you give us now includes the services our Privacy policy lists, and it ends when you delete your data or account, apart from the few things the Privacy policy says can stay.
6. **"Money" is gone.** It said Skip has no purchases or subscriptions, which is no longer true. The Buy Me a Coffee sentence goes with it (kept only if you choose the ALT).
7. **Six new sections about Skip Pro.** Free and Skip Pro; Paying for Skip Pro; Free trial; Special offers; Cancelling, refunds and restoring; When Skip Pro ends. They cover:
   - Apple bills your Apple Account, when you confirm or when a trial ends, at the App Store's price for that account's country.
   - Plans renew automatically, and Apple charges up to 24 hours before each new period.
   - A trial must be cancelled at least 24 hours before it ends, and it can't be restarted.
   - The one-time offer shows its yearly price and renews like any plan.
   - You cancel in iPhone Settings (Skip Budget) or in Skip under Settings, Skip Pro, "Manage in the App Store".
   - Apple handles refunds.
   - Pro stays with your Skip account, so signing in brings it back.
   - When Pro ends, nothing you made is deleted. Extra cards and accounts are greyed out but still count in your balances. Voice, Insights, export and new habits stop. Habits and entries you already have keep working.
8. **The app will change.** Added: if we ever stop offering Skip Pro, we tell you in the app first, then take it off sale with Apple so it stops renewing, and you keep Pro until the end of the time you paid for.
9. **No warranty.** Added: this doesn't affect your rights as a consumer.
10. **Limits on liability.** No change.
11. **Ending it.** Two changes. Deleting your account does not cancel Skip Pro, so cancel with Apple first. And "removes your data permanently" is now "removes what you saved in Skip", with a pointer to the Privacy policy for the few things that can stay (crash reports, for example).
12. **Changes to these terms.** Same promise, and it now says where you'll be told: in the app, for example in Notifications.
13. **Law and contact.** The "to be confirmed" note is replaced by the company name, address and governing law (placeholders for now), plus a line that you keep your local consumer protections and can use your local courts. No arbitration, no class-action waiver.

Length: the app text is roughly 1,250 words, against roughly 700 today. The extra is the Pro sections.

## Placeholders and ALTs

Placeholders (fill before release; all need the Founder through Jay):
- `[DATE]`: "Last updated", set on the day the Terms go live. The same date goes on the web copies (decision 10).
- `[LEGAL NAME]` and `[POSTAL ADDRESS]` in section 17 (decision 1).
- `[GOVERNING LAW: state/province, country]` in section 17 (decision 2).

ALTs in this draft:
- Section 1, decision 3: custom licence instead of Apple's standard EULA. Not drafted.
- Section 6, decision 5: keep the Buy Me a Coffee sentence if the link stays in Settings. Recommended: removed.
- Section 9: once the renewal price is confirmed in App Store Connect and the offer screen shows it, say the yearly price is also the renewal price. Recommended today: the safe wording.
- Section 15, wording: the original "removes your data permanently" line, if you prefer it.
- Section 15, decision 9: no wording change either way; if the delete-account warning is not built, the text still tells people to cancel with Apple first.

Decisions that need no change to the Terms: 7 (7-year deletion, a Privacy-policy matter), 8 (exit offer wording, separate), 12 (Splits leftovers, a Privacy-policy matter), 13 (Sentry, a Privacy-policy matter). Decision 6 (age 18+) and decision 4 (refunds) are written in with no ALT, as the fact sheet gave none. Decision 11 (lawyer review) is open for the final English.

## Checks for Dmitri

1. Section 9 (safe today): the text no longer claims the offer shows its renewal price. The ALT is for later, once App Store Connect confirms the renewal price and the offer screen gets a renewal line. Also confirm "the first time you leave the Pro page without buying" and "10 minutes" against the code, as the fact sheet says.
2. Section 11 was rewritten from your code check. Please re-read it against the code once more: greyed out and can't be opened or picked; still counted in balances; voice, Insights, export and new habits stop; existing habits and earlier voice and scan entries keep working; 15 + 15 a month; 90-day lists.
3. Section 12: "take it off sale with Apple, so it stops renewing" and the 31-day notice are from your correction. I could not confirm them from Apple's own documentation. The sources I found were Apple developer forum posts (for example https://developer.apple.com/forums/thread/779909 and https://developer.apple.com/forums/thread/730750; I did not open them), and they disagree: some say current subscribers stop renewing, one recent report says they kept renewing after availability was removed in all territories. Please confirm in App Store Connect before the sentence is promised. Fallback if it can't be confirmed: "If we ever stop offering Skip Pro, we'll tell you in the app first. You keep Skip Pro until the end of the time you've already paid for."
4. Section 15: the Privacy policy draft must list what can stay after deletion (Sentry reports, RevenueCat record, logo-service votes and reports, emails already sent).
5. Section 5: the new words "use the services our Privacy policy lists" and "the few things our Privacy policy says can stay" are only true if the Privacy policy lists both. Sections 5 and 15 now point to it.
6. Section 10: the store name "Skip Budget" must match the name Apple shows under Subscriptions. "Manage in the App Store" is under Settings in Skip, then Skip Pro. There is no transfer sentence by design; a pending change that copies Pro to a second account on the same Apple Account (fact sheet, "Skip Pro") would need a revisit if it ships.
7. Spelling: British is decided ("licence", "cancelling", "greyed out"). Apple's document title stays as Apple spells it ("Licensed Application End User License Agreement").
8. Links: the legal page can't show tappable links yet. The EULA address (section 1) and the reportaproblem address (section 10) need a link block in LegalDocument, which the CEO will add when the text goes in.
9. Not checked: Apple's Developer Program License Agreement Schedule 2 (the subscription disclosure list that Guideline 3.1.2(c) points to). I read 3.1.2 only. The Pro purchase screens must show title, length, price and the Terms and Privacy links; the fact sheet says both screens link Terms and Privacy.
