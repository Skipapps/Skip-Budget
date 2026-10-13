# What writing Ask Sam turned up in the app

Found 2026-10-13 while 10 writers and 5 reviewers read every screen to write help answers. Nothing here has
been changed in the app. Ask Sam's answers describe the app as it behaves today, bugs included.

## Fix before release (store review or money risk)

1. **Terms of service say Skip has no in-app purchases or subscriptions** (`legal.terms.money.p1`), but Skip Pro exists. App Review risk.
2. **The privacy policy is out of date.** It says the profile holds "the display name… and nothing else". It leaves habits and goals out of the data list, doesn't name the purchase or email services, and doesn't mention store names going to Apple's speech recogniser. It's dated 28 August 2026.
3. **Month-end date drift (money).**
   - Monthly pay on the 29th–31st slides to the 28th after February and stays there in every balance. Confirmed by running `paydaysInRange`. The Salary page's "Next payday" is still right.
   - Bills due on the 31st move earlier for good after a short month.
   - A ready-made fix task is in the session's task chips.
4. **The 7-year deletion promised by the privacy policy isn't scheduled.** The job exists in `20260828100002_retention.sql`, but its schedule is left off. Either switch it on or change the policy.

## Likely bugs

5. **Insights → Where it goes** puts all receipts and subscriptions under **Other**. They never get a category in the ledger; the tests mock one.
6. **Insights → Coming up** counts a yearly subscription as monthly: $120 a year shows as $120/mo.
7. **On the free plan, editing an entry paid with a locked card clears the card.** This applies to a receipt, bill or subscription paid with a 2nd+ card or account after Pro ends. Saving an edit silently removes its card (`entry-values.ts:42-48`). Detail pages also show "No payment method" for those entries.
8. **Moving a bill's due date after this month's payment shows the wrong Next due.** It reads 15 Oct instead of 15 Nov, and a reminder can fire that day.
9. **Turning a reminder off resets its time to 9:00 AM** (`reminders.tsx:463`).
10. **Allowing notifications later in iPhone Settings never signs the phone up for reminders.** It only happens when a switch is turned on inside Skip.
11. **The time zone is saved only at app launch**, not when the app comes back from the background.
12. **A new password equal to the old one shows the wrong error.** It says "Password must be at least 6 characters" (`auth.ts` `readable()`).
13. **Sign out signs out every phone**, because `signOut()` uses the default global scope. Confirm this is intended.
14. **The Free-scan count:**
    - A scan that read nothing, then typed and saved, still counts as a scan.
    - Deleting a scanned receipt gives the scan back.

15a. **Pay that has been recorded can never be deleted.** A salary or one-off pay entered by mistake stays in balances and Activity for good; the only workaround is retyping the account balance.
15b. **A new, incomplete salary is silently dropped on Save** when the other pays are complete (`salary.tsx:124-129`).

## Product decisions for you

15. **Voice saves bills and subscriptions with no reminder and no card**, while the typed form requires a reminder.
16. **A "Specific period" bill is a single charge, not a repeat between two dates.** Users will likely expect repeats.
17. **Add loan labels the rate field APR**, but interest is charged at the typed rate. If someone types a fee-inclusive APR, interest is overstated. The calculator calls it "Interest rate".
18. **Habits:**
    - There's no one-step undo for "Upcoming only".
    - Kept habit receipts can only be removed one by one.
    - Stopping a habit removes its days from Saved so far.
    - The "Skip" payment tile sits beside "skipping a day" and may confuse people.
19. **Goals:** deleting a goal with **I spent it** and also adding the purchase as a receipt takes the money out of savings twice.
20. **Promised on the Pro page but not built:** "priority support" and "new features first". Support emails carry no Pro flag.

## Copy that is now wrong

- **FAQ** (`src/i18n/messages/faq.ts`):
  - It explains "Left this month", which Home no longer shows.
  - It says an overspent month "counts against the total"; it moves nothing.
  - It says every card keeps working after Pro ends; extras lock.
  - The reminder tip about the time having passed is wrong; the server still sends.
  - "Settings → Support" is really **Support and feedback**.
  - The receipts answer says "a wrong guess corrected once does not come back"; scans don't learn.
- **Pro page:**
  - "Nothing locked if Pro ends" (`pro.unlimited.c`) is wrong.
  - Export is Pro but missing from the comparison table.
  - The Insights example still says "Left this month".
- `api.setup.salary.detail`, read aloud by VoiceOver, still says "Left this month".
- **The Remove pay dialog says past paydays stop counting "everywhere"**, but pay already received stays.

Ask Sam can replace the FAQ screen once you approve it, which would retire most of the FAQ problems at once.
