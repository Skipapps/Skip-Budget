# Terms and Privacy update: facts and drafting rules (2026-10-13)

Source of truth for the new in-app Terms of service and Privacy policy. Dmitri checked every fact against the code (read-only, plus count-only live queries). Marcus researched Apple's rules. Peer sessions added the rest. Current text: `src/i18n/messages/legal.ts` (English values of `legal.terms.*` / `legal.privacy.*`).

## Drafting rules
- English only for approval. Spanish and French come after the Founder approves.
- Plain and short, one idea per sentence, the existing tone. "We" = the Weknd team. The Founder isn't technical.
- Never type a price. Prices come from the App Store in the person's currency.
- Placeholders for facts we don't have yet: `[LEGAL NAME]`, `[POSTAL ADDRESS]`, `[GOVERNING LAW: state/province, country]`, `[DATE]`.
- Where a Founder decision is pending, write the recommended version and put the alternative in a `> ALT:` line under it.
- Mark each section KEEP / UPDATE / NEW so the before/after is easy to see.

## Pending Founder decisions (asked through Jay), drafting assumption first
1. Legal seller name and address: placeholders.
2. Governing law: placeholder, plus "consumers keep the protections of where they live". No arbitration, no class-action waiver.
3. Licence: Apple's standard EULA (https://www.apple.com/legal/internet-services/itunes/dev/stdeula/), linked from the Terms.
4. Refunds: Apple handles them; we can't issue refunds; ask Apple (https://reportaproblem.apple.com); legal rights unaffected.
5. Buy Me a Coffee link: assume REMOVED before release, so no tips paragraph. ALT: keep the current sentence.
6. Minimum age: 18+.
7. 7-year deletion: assume SWITCHED ON before release, so the policy keeps the promise. ALT: no automatic deletion; kept until you delete it or your account. (The Pro page also says "Nothing is ever deleted", which needs a matching fix either way.)
8. Exit offer wording: outside the legal text (Mia, separately).
9. Delete account warns subscribers: assume BUILT before release. The policy and Terms say deleting the account doesn't cancel Skip Pro, so cancel it in Apple settings first.
10. Public web copies on skipapps.net: same text and date.
11. Lawyer review of the final English.
12. (new) Splits leftovers on the server: assume REMOVED before release (Phase 7), so no Splits text. ALT: a short line that past Splits groups keep your name as a placeholder after deletion.
13. (new) Sentry: the account id is attached (APPROVED), and assume breadcrumb web addresses are stripped of query strings (asked of the logic chat), so "reports never include what you typed" holds. Until Sentry's "Prevent Storing of IP Addresses" is confirmed on, don't promise "never your IP".

## Facts

### Skip Pro
- Apple in-app purchase through RevenueCat. Monthly and yearly auto-renewing subscriptions (`skip_budget_pro_monthly`, `skip_budget_pro_yearly`), group "Skip Pro".
- Prices shown are the App Store's price for the person's country.
- Free trial: shown only when the App Store has a free intro offer and Apple says the person is eligible. Its length comes from App Store Connect (set to 2 weeks, shown as "14 days").
- One-time offer: shown once per account, the first time a free person leaves the Pro page without buying, with a 10-minute timer. It sells a yearly plan that renews automatically ("Billed once a year. Cancel anytime." and "Renews automatically until you cancel in your App Store subscriptions."). Renewal price to confirm in App Store Connect (assumed $9.99/yr).
- Restore purchase is on both purchase screens. Subscribers get "Manage in the App Store". Both screens link Terms and Privacy.
- RevenueCat is started for every signed-in account, with the Supabase account id as its user id. No email, name or other attributes are sent.
- The server keeps one `entitlements` row per account: Pro yes/no, product id, expiry, sandbox/production, will-renew, updated time. Written only by the RevenueCat webhook. A pending change (another session) copies Pro to a second account on the same Apple ID.
- `profiles.pro_offer_seen_at` records when the offer was shown. There are no allowance counters: the database counts this month's receipts by how they were added and when they were saved.
- Free: everything typed (bills, subscriptions, receipts, any number of salaries, loans, loan calculator, savings, goals), 1 card + 1 bank account, 15 camera scans + 15 uploads a month (own calendar month), lists show the last 90 days (older kept, still counted in balances).
- Pro only: voice entry, Insights, Spending habits, export (CSV/PDF), unlimited cards/accounts/scans/uploads, 7 years of history.
- When Pro ends: nothing deleted, nothing locked. Extra cards/accounts stop appearing under "Paid with" for new spending, and history older than 90 days is hidden again.
- The Pro page also promises "New features first" and "Priority support". Neither is built; the Terms must not repeat them.
- Buy Me a Coffee: a Settings row opens buymeacoffee.com/Weknd_team (decision 5).

### Sign-in and email
- Methods: email + password (6-digit emailed code to confirm and to reset), Sign in with Apple, Google.
- Stored: email + hashed password; Apple user id + email (may be a private relay address; the name Apple offers is not saved); Google's sign-in record also holds full name and profile-photo link (Skip never uses them).
- Resend sends the sign-in codes (Supabase dashboard setting, not in the repo) and the contact form.
- Contact form (Settings → Support and feedback → Contact / Idea): sends topic, optional name (≤80 chars) and message (≤4000) to admin@skipapps.net from noreply@skipapps.net. The server adds the account email as reply-to, plus the account id.
- The "By continuing you agree to our Terms and Privacy" line is only on Log in, not on Sign up or the Apple/Google page (fix sent to the logic chat).

### On the server, per person
- Profile: display name, chosen bundled avatar, time zone (written at every launch), reminder settings (receipt reminder on/off, time, last sent), default receipt book, offer-seen time, getting-started dismissed, Home tile order. Leftovers: an unused `currency` column, and Splits `invite_code` / `discoverable`.
- Cards: name, network, last four digits (exactly 4 digits enforced), colour, typed balance and its date, due day, optional credit limit.
- Bank accounts: bank, nickname, checking/savings, last four digits, colour, balance and its date.
- Bills (with notes and logo choices; whether a bill counts in spending), loans (principal, rate, term, payment, interest, first payment, statement figures, payment changes, payment day) and loan payoffs, subscriptions, charges (each recorded bill/subscription payment), receipts (store, amount, date, category, paid with, note, how added, when saved, habit, book, logo; `image_path` always empty), receipt books, payments (card payments and transfers), salary sources (incl. hourly rate, hours, overtime, deduction %), pay received (incl. one-off "Just this time" pay), savings pots and monthly savings, goals and goal moves, habits (habit days are stored as receipts), reminders (days before, time, last sent), device tokens (push address), entitlements.
- Splits leftovers (decision 12): friendships, requests, groups, members (with names), expenses, splits, settlements, notices. The app no longer reads them. Friends and group-mates can read a person's whole profile row.
- Receipt-image bucket exists; nothing writes to it (0 files).

### Retention and deletion
- 7-year job `prune_expired_data` exists (deletes charges, receipts, card payments and pay older than 7 years) but is NOT scheduled; the only live cron is send-push (decision 7). Drew should check that balances don't shift when old rows go.
- Free's 90-day window hides; it never deletes.
- Delete account: asks twice (counts, then a final warning). The counts cover cards, accounts, bills, subscriptions, receipts, charges, salaries and one-off pay; they leave out loans, habits, goals, savings, card payments, pay received and books. Calls `delete_my_account`, which deletes every table with the account. Splits names stay as placeholders in others' groups. On the phone it then clears voice corrections, remembered stores, recent searches, the voice draft and the wrap-up notification.
- Not removed by deletion: the Apple subscription (not cancelled; no warning today), RevenueCat's record, Sentry reports, logo-service votes and reports, emails already sent.

### Only on the phone (AsyncStorage)
- Sign-in session, appearance, haptics, app lock, language, currency, voice corrections, remembered stores and logo answers, recent payment searches (last 10, erased at sign-out and deletion), wrap-up switch, news seen, book tip seen.
- Export files (Pro): built in the app's cache folder only for the share sheet; only the newest is kept. Picked receipt files are copied into the cache to be read.
- The voice draft stays in memory only.

### Scanning and uploads
- Apple's document camera and text reading, all on the phone; PDFs too. The module has no network code.
- An "upload" is a photo from Photos or an image/PDF from Files, read on the phone. Nothing is uploaded.
- The card is matched from the last four digits printed on the receipt; those digits aren't saved.
- Loan statement upload isn't built.

### Voice
- Apple speech recognition (US English). On the phone when supported, otherwise Apple's servers.
- Up to 100 hint words go with the request: the person's own store, bill and subscription names first, then catalogue brand names. On the server path these go to Apple.
- No audio is recorded or kept.

### Logo service (Skip Logos, Cloudflare)
- The phone calls the Skip Logos worker directly; images load from logos.skipapps.net. Brandfetch isn't used.
- Sent: the typed name or website, the phone's Region country code and a category. No account id.
- Picking a logo also sends a voter tag (one-way SHA-256 of the account id). "Wrong logo" reports send the website and name.
- The service keeps unknown names with country, votes with the voter tag, and reports. For unknown names it searches Wikidata and visits brand websites from Cloudflare, not tied to the person.
- Typing a store also searches Skip's own brand list on Supabase.

### Sentry (crash and failure reports)
- Release builds only; sendDefaultPii false; no session replay, screenshots or tracing.
- Approved: Sentry.setUser({ id: account uuid }) only. Set at sign-in/restore, cleared at sign-out and deletion. Applies to all events. Not built yet; waits for this text.
- Failure reports send the database error code only (no details/hint, pinned by a test); read-error reports send only the data kind.
- Breadcrumb web addresses currently include the account id and typed store names (fix asked of the logic chat, decision 13).
- Reports also carry device model, OS version and app version. No other analytics. Over-the-air updates are off.

### Notifications
- Push address stored in `device_tokens` only after reminders are turned on; deleted at sign-out.
- send-push runs every 15 minutes and posts to Apple's push service. Content: bill/subscription/card name with due date and amount, "went out", payday, the receipts nudge. Logos are fetched on the phone by the notification extension.
- Local notifications: monthly wrap-up, "Remind me in 1 hour".

### Other
- Insights are worked out on the phone. No exchange rates are fetched. News and the brand list are read from Supabase.
- Ask Sam (not shipped yet) has no network code; its planned contact card would send the chat transcript through the contact form.
- Contact: admin@skipapps.net. "Weknd team" appears in legal.ts, the coffee link and Ask Sam. app.json names no publisher (Apple team 2YDDY7H6XP).
- Policy changes: the app has a News feed (Notifications page), so "we'll tell you in the app" is possible through it.

## Other app copy that must match the new text (not in this task)
- FAQ "What leaves my phone? Only what you save" (`src/i18n/messages/faq.ts:222`).
- Pro page "Nothing is ever deleted" (`src/i18n/messages/pro.ts:145-146`).
- Pro table "Upload any bill" (uploads are receipts) (`pro.ts:357-360`).
- Ask Sam answers: privacy.retention, privacy.stored.what, privacy.who-sees, privacy.terms, privacy.rights, receipts.history.limit (the Ask Sam session updates them after approval).
- iOS privacy manifest `ios/SkipBudget/PrivacyInfo.xcprivacy` declares no collected data (sent to the logic chat).
