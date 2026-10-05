# Voice input — privacy copy draft

Draft only. Nothing here is published until the Founder approves. Written against the live code:
`src/app/privacy.tsx`, `src/components/ui/legal-document.tsx`, `app.json` (`expo.ios.infoPlist`),
`.claude/team/dev/voice-input-brief.md`.

---

## 1. Privacy policy section

### Where it goes

`src/app/privacy.tsx` exports a `SECTIONS: Section[]` array that `LegalDocument` renders and
numbers automatically (`{index + 1}. {heading}`) — so inserting a section just means adding one
object to the array; nothing else renumbers by hand.

Insert a **new section** between the existing `'What never leaves your phone'` section and
`'Who else sees it'` section. Today those are array entries 3 and 4 (displayed as "3." and "4.");
the new one becomes the new "4.", and "Who else sees it" shifts to "5." automatically.

Reasoning for the placement: the new section doesn't fit inside **What never leaves your phone**,
because that section's whole premise is "never" — and voice sometimes does leave the phone (Apple's
servers, off-device). It needs its own section, the way scanning got its own bullet when that
shipped. It goes right after scanning because both are "how Skip turns something physical into an
entry" and a reader comparing them benefits from reading them back to back.

### New section — exact text

```ts
{
  heading: 'Adding things by voice',
  blocks: [
    {
      kind: 'text',
      text: 'Tap the microphone and say something like “Netflix $15.99 every month” to add a receipt, bill or subscription without typing. Here is exactly what happens to what you say.',
    },
    {
      kind: 'bullets',
      items: [
        'Your words are turned into text by Apple’s speech recognition, built into your iPhone. Skip does not use any third-party speech or transcription service, and has no speech server of its own.',
        'When your iPhone can run speech recognition on the device, your voice never leaves it. When it can’t, Apple’s speech recognition service processes the audio instead, under Apple’s own privacy terms rather than this one.',
        'Skip never records or keeps the audio itself, on your phone or on our servers. Only the text you review and confirm becomes a receipt, bill or subscription — stored exactly like one you type in by hand.',
        'If you correct what Skip heard (for example, turning “spot a fly” into Spotify), Skip remembers that correction on your phone only, so it recognises it next time. These corrections are never uploaded.',
      ],
    },
    {
      kind: 'note',
      text: 'Skip asks for microphone and speech recognition access the first time you use voice input. You can turn either off at any time in iOS Settings → Skip Budget — typing still works exactly as before.',
    },
  ],
},
```

This is 4 bullets + a note, the same shape as the `'What Skip stores about you'` section, so it
doesn't read as noticeably longer or shorter than its neighbours.

### Existing sentences — what I checked, what must change

**Nothing claims Skip doesn't access the microphone today.** I read the whole file; there is no
"we don't access your microphone" line to walk back. The only directly relevant existing sentence
is in **What never leaves your phone**:

> "Scanning a receipt. The text is read on your device by Apple's own on-device recognition. The
> photo is not uploaded, and Skip saves only the fields you confirm — the shop, the amount, the
> date."

That sentence is about the camera/Vision path and stays exactly as is — it's still true and it's a
different feature. I did not fold voice into it, for the "never" reason above.

**One bullet must be added** to **Who else sees it**. Today that section reads:

> "Skip uses a small number of services to run. They process data on our behalf and are not
> permitted to use it for their own purposes."
>
> - Supabase — hosts the database your data lives in, and handles sign-in.
> - Apple and Google — only if you choose to sign in with them, and only to confirm it is you.
> - Sentry — receives crash and error reports so faults can be fixed. These describe what the app
>   was doing, not what your budget contains.
> - Brandfetch — supplies the logos shown next to shops and subscriptions. It is sent a brand name
>   or website address to look up. It is not sent anything about you or your spending.
> - Apple Push Notification service — delivers reminders, if you turn them on.

This is Skip's canonical "who touches your data" list, and right now it's incomplete: when
recognition runs off-device, Apple's speech service does touch data (the audio) and isn't on the
list. Add one bullet, same style as the existing Apple/Google one:

```
'Apple's speech recognition — if your iPhone can't run speech recognition on the device, what you say when you use voice input is sent to Apple's speech service to turn it into text, under Apple's own privacy terms. Skip never receives the audio itself, only the text it returns.'
```

The section's closing sentence —

> "Skip does not sell your data, does not share it for advertising, and carries no advertising or
> third-party analytics beyond the crash reporting described above."

— stays true and doesn't need a word changed.

### Optional, not required: the opening summary

The page summary currently says:

> "Skip is a budgeting app, so almost everything in it is something you typed. This explains what
> is stored, what stays on your phone, who else is involved, and how to get rid of all of it."

"Almost everything... you typed" already hedges (it was written loosely enough to cover scanning,
which it never explicitly mentions either), so this doesn't *have* to change. If the Founder wants
it tightened for accuracy now that there are three ways in, one option:

> "Skip is a budgeting app, so almost everything in it is something you typed, scanned or said."

I'd only make this change alongside the Founder's sign-off on the rest — flagging it, not drafting
it in by default.

### Judgment call to flag

Learned voice corrections live only in AsyncStorage on the phone, same as the appearance/haptics/
app-lock settings already called out as a separate bullet in **What never leaves your phone**:

> "Your appearance, haptics and app lock settings, which are stored on the device itself."

I chose to explain the corrections inside the new **Adding things by voice** section rather than
also adding a fifth item to that bullet list, to keep the voice story in one place instead of split
across two sections. If the Founder would rather it read as "same bucket as your other on-device
settings," that's a one-line edit to add there instead (or as well).

---

## 2. iOS permission prompt strings

Current drafts, in `app.json` → `expo.ios.infoPlist` (not yet set for these two keys; the mic and
photo-library ones that already exist there are the house style to match):

```json
"NSCameraUsageDescription": "Skip Budget uses the camera to scan your receipts. Scans are read on your device and never uploaded.",
"NSPhotoLibraryUsageDescription": "Skip Budget reads receipts you pick from your photos. They are processed on your device."
```

Both existing strings are two sentences: what it's for, then a flat reassurance that it stays on
the device. Voice can't honestly make that second-sentence promise for speech recognition — it
sometimes doesn't stay on the device — which is exactly why the nuance belongs in the speech string,
not the mic one.

**Microphone — keep close to the brief's draft, essentially unchanged:**

> "Skip Budget uses the microphone when you add a receipt, bill or subscription by voice."

86 characters. It already matches house style ("the microphone", parallel to "the camera"), states
the specific feature (not a vague "to record audio"), and deliberately carries no on-device/off-
device claim — correctly, because that claim would sometimes be false for this exact action. I
would not touch this one.

**Speech recognition — tightened from two sentences to one:**

Brief's draft (178 characters):
> "Skip Budget turns what you say into an entry you can check before saving. When your iPhone
> supports it, this happens on the device; otherwise Apple's speech service processes it."

Proposed (151 characters):
> "Skip Budget turns what you say into an entry you review before saving — on-device when your
> iPhone supports it, otherwise via Apple's speech service."

Same two facts Apple will want to see in the purpose string — why (turns speech into a reviewable
entry) and the on-device/server split — in one sentence instead of two, which reads better in the
system alert and is less likely to get visually truncated. I kept "your iPhone supports it" rather
than a vaguer "when possible", since the fact is specifically about on-device capability, not
network conditions.

---

## 3. App Store privacy label notes

Reasoning, not a filled-in questionnaire — whoever owns App Store Connect should re-check the
live question wording at submission time.

**Audio Data should not be added to the label at all, in either recognition path.**

- On-device: Skip's code never receives the raw audio — iOS's Speech framework consumes the
  microphone input and hands Skip only recognised text (`alternatives`/`transcript` in the
  `useSpeechCapture` contract). Apple's own guidance is that data processed only on-device, never
  transmitted off it, isn't "collected" and doesn't need disclosing.
- Off-device fallback: the audio goes to Apple's own speech service as part of the OS-level
  `SFSpeechRecognizer` API — Apple's first-party system service, not a third-party SDK Skip
  integrated and not Skip's own server. Skip's code still never receives or stores the audio, only
  the text the API returns. This is the same category as apps that use the system keyboard's
  dictation, Siri, or Sign in with Apple: the developer doesn't declare data that only Apple's own
  OS service touches, because the app itself never collects it.

So: no new row under **Data Used to Track You** (Skip doesn't track; that's unaffected), and no new
row under **Data Linked to You** or **Data Not Linked to You** for audio or voice data, in either
case.

**What doesn't change:** voice input is a new way to produce the same already-stored data — a
receipt, bill or subscription's merchant, amount, date and category. It doesn't introduce a new
*type* of data Skip holds, only a new *input method* for types the label should already be
accounting for (financial/purchase info, linked to the account). No new row needed there either.

**One open question, outside what I can see from the codebase:** the brief's item 11 adds `voice`
to the receipts `capture_source` enum (`manual | scan | upload | voice`) to measure usage. If
whoever filled out the current App Store Connect label already declares a "Usage Data" /
"Product Interaction" category for in-app analytics, `capture_source` values would sit inside
that existing category — it's an attribute of data already disclosed, not a new collection event.
I can't see the live App Store Connect config from the repo, so this needs a human check against
whatever is currently filed there, not a guess from me.

---

## Summary for the Founder

1. One new privacy-policy section ("Adding things by voice"), inserted after "What never leaves
   your phone", text drafted above.
2. One new bullet added to the existing "Who else sees it" services list, for Apple's speech
   service (off-device case only).
3. Mic permission string: keep as drafted. Speech permission string: tightened to one sentence,
   151 characters, same two facts.
4. App Store privacy label: no new "Audio Data" row needed in any of the three buckets; voice adds
   an input method, not a new data type. One open question flagged for whoever owns App Store
   Connect, re: `capture_source` and any existing Usage Data declaration.

Nothing here touches app code or gets published — draft for Founder review.
