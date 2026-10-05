# Voice input: design spec

Date: 2026-10-01 · Author: Pia (Product Designer) · Build: Dana (voice pages, FAB), Diego (forms)
Reads with: `.claude/team/dev/voice-input-brief.md` (brief), `.claude/team/dev/voice-input-plan-2026-10-01.md`
(Dmitri's engineering plan, which decides the save path and how the draft travels), and
`design-direction-2026-09-11.md` / `add-flows-2026-09-12.md` (tokens, radii, rows, add-flow chrome).
Where this spec and Dmitri's plan disagree on engineering, his plan wins. Where they disagree on what
the person sees, this spec wins. I found no conflicts. Two places extend his plan (§6 edit pages, §2 FAB
placement) and both are marked.

Checked against SDK 57 docs and the installed `expo-router` 57.0.15: `router.dismissTo(href)` ("Dismisses
screens until the provided href is reached. If the href is not found, it will instead replace the current
screen"), `Stack.Screen` `gestureEnabled`, `expo-haptics` `selectionAsync`. The design adds **no Expo
module**. Speech (`expo-speech-recognition`) is Dilip's. The pulse uses `react-native-reanimated`, which
is already installed and already used for `useReducedMotion` in `skeleton.tsx` and `amount-tile.tsx`.

---

## 0. The whole thing in one screen

- **Entry:** a 56pt mic button floating bottom-right on Home, 12pt above the tab bar, filled with the
  accent (`bg-control`). Free accounts see it too. Tapping it opens the Pro explainer.
- **Page 1, `/voice`, "Just say it":** teaches with nine real sentences (three each for receipts,
  bills and subscriptions). One "Start talking" button. The same page then shows listening, checking,
  nothing heard, permission and unavailable states. Nothing slides up. The page changes in place.
- **Page 2, `/voice-review`, "Is this right?":** what Skip heard, as a short summary. Kind chips, a big
  amount, and rows for store/name, date and category. Missing fields say **Tap to add**. An ambiguous
  amount must be picked. **Save** is in the footer, with "Say it again" and "More options" under it.
- **Edits are pages, not sheets:** tapping a row pushes `/voice-edit?field=…`, a one-job page built
  from the add flows' own parts (keypad, store search, calendar, category grid). **Done** brings you back.
- **After saving:** `success()` haptic, then `router.dismissTo('/home')`. No toast. The hero figure
  rolls to its new value, and that is the confirmation. Back from Home goes nowhere.
- **Every move is a push** (`slide_from_right`, the Stack default). The only overlay anywhere in the
  flow is the existing confirm dialog ("Cancel adding this receipt?").

---

## 1. Routes, stack and back

| From | Action | To | Stack after | Motion |
|---|---|---|---|---|
| Home | tap mic (Pro) | `/voice` | `[tabs, voice]` | push |
| Home | tap mic (free) | `/pro-feature?id=voice` | `[tabs, pro-feature]` | push |
| `/voice` | words arrive and parse | `/voice-review?draft=<id>` | `[tabs, voice, voice-review]` | push |
| `/voice` | "Receipt" / "Bill" / "Subscription" by-hand pill | `/add-receipt` etc. | `[tabs, add-x]` (`router.replace`) | push |
| `/voice-review` | tap a row or the amount | `/voice-edit?field=…` | `[…, voice-review, voice-edit]` | push |
| `/voice-edit` | Done | back to review, edit applied | `[…, voice-review]` | back |
| `/voice-edit` | back chevron / swipe | back to review, edit discarded | `[…, voice-review]` | back |
| `/voice-review` | Save | Home | `[tabs]` (`router.dismissTo('/home')`) | back |
| `/voice-review` | back chevron / swipe | `/voice`, idle | `[tabs, voice]` | back |
| `/voice-review` | Say it again | `/voice`, **listening at once** | `[tabs, voice]` | back |
| `/voice-review` | ✕ then "Yes" | Home | `[tabs]` (`dismissTo('/home')`) | back |
| `/voice-review` | More options | full add form, pre-filled, `from=voice` | `[…, voice-review, add-x]` | push |
| add form (`from=voice`) | Save | Home | `[tabs]` (`dismissTo('/home')`, Diego) | back |
| add form (`from=voice`) | back | the review page, unchanged | `[…, voice-review]` | back |

**Back must never walk into a finished flow.** After either save path the stack is `[tabs]`, so
there is nothing to swipe back into. Tia checks this on a device (Dmitri's plan §4.4).

**Unsaved edits on the review page (the same rule as `StepFlow`).** While the review page is
untouched, back and the edge swipe simply return to `/voice`. Saying it again costs one sentence. Once
the person has changed anything there or on an edit page, the review page sets
`<Stack.Screen options={{ gestureEnabled: false }} />` (as `step-flow.tsx:97` does), and the back
chevron and "Say it again" both ask first with the house dialog (§5.9). ✕ always asks.

---

## 2. The floating mic on Home

### 2.1 Decision: fill with the accent (`bg-control`), not a neutral

In this codebase `control` **is** the accent (`palette.ts` `buildTokens`: `control: accent.value`).
The "charcoal" in the comments of `skip-tab-bar.tsx:29-33` and `balance-summary.tsx:31` is left over
from before theming. There is no charcoal token any more, so the real choice is accent vs a neutral
(`bg-card` or `bg-ink`). The accent wins:

1. **Every floating control in the app is already `bg-control` + `onControl`.** That covers
   `source/[id].tsx`'s floating "Make a payment" pill, the retired `AddButton` FAB, and the tab bar's
   own "you are here" pill directly below. The mic is a primary "make something" action, so it wears
   the primary fill, the same as `Button`.
2. **It is the only fill with a curated foreground for all eight accents in both modes.** `onControl`
   is declared per accent, and the white or near-black glyph clears 3.49:1 (periwinkle) to 13.87:1
   (navy). A neutral `bg-ink` disc would be a new pairing that no control uses, and it would invert
   between modes (black disc in light, white disc in dark).
3. The direction doc (§6) already lists "the FAB" among the accent's permitted uses.
4. **Why not the neutral?** It would sit next to the bar and read as part of the bar. The Quick add
   icons are the tonal `bg-accent/10` version of "add". The mic is the solid version, so it reads as
   the fastest way in, without a second colour.

The risk is two accent shapes near each other: the Home tab pill bottom-left and the mic disc
bottom-right. They differ in shape and size (a wide labelled pill vs a 56pt circle), and that they
share a colour says these are the two controls on the page.

### 2.2 Spec

New component `src/components/voice/voice-fab.tsx` (Dana). It reuses `AddButton`'s anatomy. `AddButton`
is dead code (design log, 2026-09-12).

| Property | Value |
|---|---|
| Size | `h-14 w-14` (56×56) `rounded-full`, `hitSlop={4}` → 64pt target |
| Fill | `bg-control`, pressed `active:bg-control-pressed` |
| Icon | Lucide `Mic`, `size={24}`, `color={colors.onControl}`, `strokeWidth={2}` `absoluteStrokeWidth`. That is the tab bar's stroke, the glyphs it sits beside, and it is heavier than 1.8 on a solid fill on purpose |
| Elevation | `style={shadows.floating}`. One of the two things the direction doc keeps a shadow on |
| Dark-mode edge | When `scheme === 'dark'` and `contrast(colors.control, colors.surface) < 3`, add `borderWidth: 1, borderColor: colors.muted`. Today that is **plum (2.09:1, the default accent)** and **navy (1.26:1)**. A shadow does not show on `#1B181F`, so without the ring the disc's edge disappears over dark rows. In light mode the shadow carries the edge, as it does for the tab bar. Numbers from the same contrast formula as `src/lib/tone.ts` |
| Haptic | `withTap(onPress)` |
| Motion | None. It does not hide on scroll and does not animate in. It moves with the Home page when tabs slide, because it lives inside the Home scene |

**Placement (extends Dmitri §4.2).** The Founder asked for it "at bottom above the navbar on right
side". `Screen`'s `floating` slot is hard-coded `absolute bottom-10 right-5`, which on a tab page puts the
disc 40pt above the scene's bottom edge. With the bar's 8pt top band (`skip-tab-bar.tsx:48`, `pt-2`)
that leaves a 48pt gap above the bar, and it reads as detached. Add one optional prop to `Screen`:

```ts
/** Where `floating` sits. 'page' is today's spot. 'tabBar' tucks it just above the floating tab bar. */
floatingPlacement?: 'page' | 'tabBar'; // default 'page': nothing else moves
```

- `'tabBar'` → wrapper `absolute bottom-1 right-4`. Target geometry is **12pt of clear space between
  the disc's bottom edge and the top edge of the tab bar pill** (4pt + the 8pt band), with the **disc's
  right edge flush with the pill's right edge** (both 16pt in, the bar's own `px-4`).
- **Unverified:** this assumes the safe-area bottom inset inside a tab scene is 0, because the tab bar is
  in normal flow and owns the home-indicator inset. Dana checks on the Simulator and tunes the class so
  the *visible* result is the 12pt / flush-right target.
- Home's last section already ends `pb-24` (96pt). The disc takes 60pt off the scene bottom, so the
  last "Coming up" row still scrolls fully clear. While scrolling it will pass over right-aligned
  amounts. That is accepted. It is what a floating button does, and the 36pt of spare padding means
  nothing is ever stuck under it.

### 2.3 When it shows, and what a tap does

Home wiring follows Dmitri §4.2:

| Condition | FAB |
|---|---|
| `!isSpeechAvailable()` (build has no speech module: old builds, web, Jest) | **hidden**, for everyone. There is nothing to explain and nothing to sell |
| `!usePro().ready` | hidden. This avoids flashing the explainer at someone who has paid |
| ready, **free** | **shown, no PRO sticker.** Tap → `router.push({ pathname: '/pro-feature', params: { id: 'voice' } })` |
| ready, **Pro** | shown. Tap → `router.push('/voice')` |
| permission denied, or recognizer unavailable | **shown.** `/voice` explains (§4.6, §4.7). Hiding a feature someone paid for without a word is worse, which is the same reasoning as the receipt scan's "Scanning needs a camera" (`add-receipt.tsx:359-368`) |

**No PRO sticker on the FAB.** The tool cards carry a corner PRO pill, but they sit in the page's
flow. A sticker on a button that floats over the dashboard is an advert that never leaves. The
explainer does the selling on the first tap, and the accessibility hint says it is Pro. This is
Founder question 1.

**Accessibility**
- `accessibilityRole="button"`, `accessibilityLabel="Add by voice"`.
- Hint, Pro: `"Say a receipt, bill or subscription. You check it before it’s saved."`
- Hint, free: `"Part of Skip Pro. Shows what adding by voice can do."`
- No text, so Dynamic Type does not apply. The 64pt target meets the floor at any size.

---

## 3. Shared chrome and haptics for the voice pages

- **Page 1** is a teaching page, so it uses the shape of `pro-feature` and `welcome`: `<Screen showBack
  footer={…}>` with a left-aligned `Title`.
- **Page 2 and the edit pages** are add-flow pages, so they use `FlowHeader` (`step-flow.tsx:176`):
  back on the left, a centred 17px title, ✕ on the right. They have no step dots, because the voice
  pages are separate routes and dots would lie once an edit page is pushed.
- `FlowHeader` gets two optional props (Dana, additive, the add flows compile unchanged):
  - `closePrompt?: string`: when omitted, no ✕. The edit pages use this.
  - `onClose?: () => void`: what happens after the person confirms. Defaults to today's `goBack()`.
    The review page passes `() => router.dismissTo('/home')`.
- All three voice routes open with `const gate = useProGate('voice'); if (gate) return gate;`.
- Haptics come from `@/lib/haptics` only. `Button`, `ActionPill` and `TextLink` presses already tap.
  `toggle()` fires once when the mic goes live. `warn()` fires on "nothing heard" and on a failed save.
  `success()` fires on a saved entry. The chips already call `selection()`.

---

## 4. Page 1: `/voice`, "Just say it"

### 4.1 Layout, top to bottom (idle)

```
┌─────────────────────────────────────────────┐
│ ‹                                           │  Screen showBack
│ Just say it                                 │  Title align="left" (default mt-2)
│ Say how much, where, and when. Skip fills   │  Subtitle align="left" mt-2
│ it in, and you check it before anything     │
│ is saved.                                   │
│ ┌─ stage card · bg-ink/5 · rounded-[16px] ┐ │  mt-6
│ │              ( 🎙 )                       │ │  disc 80pt, tonal
│ │          Ready when you are             │ │  15 medium ink
│ │  Tap the mic, say it in one go, then    │ │  13 muted, min-h-[56px] area
│ │  tap Done.                              │ │
│ └─────────────────────────────────────────┘ │
│ 🛡 Turned into text on your iPhone. Your     │  privacy line, mt-3
│    voice never leaves it.                   │
│                                             │
│ Try saying                                  │  SectionHeading mt-8
│ ┌─ card ──────────────────────────────────┐ │  mt-3, cards gap-3
│ │ (▤) Receipts                            │ │
│ │     Something you’ve already paid for   │ │
│ │ “Spent $12.50 at Starbucks today”       │ │  bold = what Skip picks up
│ │ “$64.20 at Target yesterday”            │ │
│ │ “Paid 45 bucks for gas at Shell on      │ │
│ │  Friday”                                │ │
│ └─────────────────────────────────────────┘ │
│ ┌─ (Bills) ───────────────────────────────┐ │
│ └─────────────────────────────────────────┘ │
│ ┌─ (Subscriptions) ───────────────────────┐ │
│ └─────────────────────────────────────────┘ │  pb-4
├─────────────────────────────────────────────┤
│ (       🎙  Start talking                 ) │  footer: Button primary + Mic icon
└─────────────────────────────────────────────┘
```

The Title, Subtitle and the "Try saying" examples stay put in every state except denied and
unavailable. Only the stage card and the footer change, so the page never jumps between states and
the examples stay readable while someone is speaking.

### 4.2 The stage card

New component `src/components/voice/listening-card.tsx` (Dana). It is new because nothing in the kit
shows a live mic.

| Part | Spec |
|---|---|
| Card | `w-full items-center rounded-[16px] bg-ink/5 px-5 py-6`. It is tonal, not bordered, because it is a well and not a card of content |
| Disc area | `h-28 w-28 items-center justify-center` (112pt, room for the ring) |
| Disc | `h-20 w-20 rounded-full items-center justify-center`. **Ready** states: `bg-accent/10`, `Mic` 32 `colors.accentInk` stroke 1.8. **Listening / checking:** `bg-control`, `Mic` 32 `colors.onControl`. **Blocked** (denied, unavailable): `bg-card border border-line`, `MicOff` 32 `colors.muted`. Tonal means ready, solid means live. That is the chips' own selected-vs-unselected grammar |
| Pulse (listening only) | An absolutely centred `h-20 w-20 rounded-full bg-control/25` behind the disc. Reanimated: scale 1 → 1.4, opacity 0.6 → 0, 1600ms ease-out, repeating. It is calm: one ring, no bars, no waveform. **If Dilip exposes a level (0–1):** drive the scale `1 + 0.35 × level` through `withTiming(…, { duration: 120 })` instead of the loop. **`useReducedMotion()`:** no animation, the ring is drawn still at scale 1.2, opacity 0.35 |
| Disc as a button | The disc is pressable in the ready states (it starts listening) and while listening (it stops, the same as Done), with `active:opacity-80`. It is `accessibilityElementsHidden` because the footer button does the same thing with a label, and VoiceOver should find one control, not two (as `SettingsRow` does with its switch) |
| Status line | `mt-2 text-center font-poppins-medium text-[15px] text-ink`, `maxFontSizeMultiplier={1.4}`. Checking puts an `ActivityIndicator size="small" color={colors.muted}` before it, `gap-2`, as add-receipt's "Reading the receipt…" does |
| Body area | `mt-1 w-full min-h-[56px] items-center justify-center`. This fixed height is what keeps the card from jumping. **Message:** `text-center font-poppins text-[13px] leading-5 text-muted`, cap 1.4. **Transcript:** `text-center font-poppins text-[20px] leading-7 text-ink`, cap 1.3, `numberOfLines={4}`. Once it outgrows four lines, show the **latest** words (`ellipsizeMode="head"`. Dana: check that iOS honours head-truncation on multi-line `Text`. If not, trim the string to its last ~120 characters before rendering) |

### 4.3 States (`SpeechStatus` from Dilip's `useSpeechCapture`, plus two of the page's own)

| State | Disc | Status line | Body area | Privacy line | By-hand pills | Examples | Footer |
|---|---|---|---|---|---|---|---|
| **idle** | tonal Mic | Ready when you are | Tap the mic, say it in one go, then tap Done. | ✓ | – | ✓ | `Start talking` (Mic icon) |
| **asking** | tonal Mic | Asking your iPhone | Allow the microphone and speech recognition so Skip can hear you. | ✓ | – | ✓ | `Start talking`, disabled |
| **listening**, no words yet | solid + pulse | Listening… | *Go ahead* (20px, `text-muted`) | ✓ | – | ✓ | `Done` + subtle `TextLink` "Cancel" |
| **listening**, words | solid + pulse | Listening… | live `interim` (20px ink) | ✓ | – | ✓ | `Done` + "Cancel" |
| **checking** (page state: stopped, waiting for final alternatives) | solid, no pulse | ⟳ Checking what you said… | last `interim`, ink | ✓ | – | ✓ | `Checking…`, disabled |
| **nothing heard** (page state: final alternatives empty or blank) | tonal Mic | Skip didn’t hear anything | Try again a little closer to your iPhone, or add it by hand below. | ✓ | ✓ | ✓ | `Try again` (Mic icon) |
| **error** | tonal Mic | Something went wrong. Please try again. (`FAILURE_MESSAGE`) | (empty) | ✓ | ✓ | ✓ | `Try again` (Mic icon) |
| **denied** | MicOff | Skip can’t hear you yet | Turn on Microphone and Speech Recognition for Skip Budget in Settings, then come back. | – | ✓ | – | `Open Settings` → `Linking.openSettings()` |
| **unavailable** | MicOff | Voice isn’t available right now | Speech recognition isn’t working on this iPhone at the moment. Check that you’re online, or add it by hand below. | – | ✓ | – | none |

Notes on the states:
- **Words arrive → page 2.** When `alternatives` turns non-empty and not blank: `parseVoice` →
  `putVoiceDraft` → `router.push({ pathname: '/voice-review', params: { draft } })`, **once per
  session**, guarded by a ref (Dmitri §4.3). Even when the parser understood nothing it goes to review.
  The brief says unclear input still reaches review with whatever was caught. Only an empty transcript
  is "nothing heard".
- **Silence ends listening on its own** (iOS ends after a pause). That behaves exactly like Done.
- **Cancel** (listening): `cancel()` and back to idle, with nothing kept and no dialog.
- **Leaving the page in any way stops the mic at once**: back chevron, swipe, push to review, app to
  background, or a call. That is `cancel()` on blur and on `AppState` background (Dmitri §4.3). An
  interruption returns the page to idle silently. The person knows why it stopped.
  **Amended by the CEO, 2026-10-01:** a call or Siri ends the session quietly (no error line). If words
  were already heard, they go to the review page as if Done was tapped. Nothing saves without a tap, so
  keeping the words is safer than dropping them. With no words heard, the page shows "nothing heard".
- **On re-focus** (back from review) the page resets to idle. **Exception:** "Say it again" sets a
  one-shot flag and the page starts listening immediately on focus. That is an explicit request, so
  the mic turning on is expected.
- **Back from Settings:** on `AppState` → active, re-read permission. If it is now granted, go to idle.
  Do not auto-start.
- **No auto-start on open (v1).** The mic never turns on by itself on arrival, from the FAB or from a
  deep link. Three reasons. A first-timer needs to read the examples, and iOS ends a silent session in
  about 3 seconds, so an auto-started mic greets them with "Skip didn’t hear anything". The permission
  prompts would fire before the page is even seen. And in a money app the mic should only go live on a
  tap that says so. The cost is one tap (§12).
- **unavailable copy, if Dilip can tell the cases apart:** permanent (no en-US recognizer on this
  phone) → status line "Voice isn’t available on this iPhone", body "This iPhone can’t turn speech
  into text in US English. You can still add it by hand below." Temporary (offline on a phone with no
  on-device model) → the table's copy. If he cannot tell them apart, ship the table's copy. It is true
  in both cases.
- A recognizer **restricted** by Screen Time arrives as denied and uses the denied copy. Settings is
  still the right door.

### 4.4 The privacy line

`mt-3 w-full flex-row items-start gap-2`. `ShieldCheck` `size={16}` `colors.muted` stroke 1.8,
`mt-0.5`, then `flex-1 font-poppins text-[13px] leading-5 text-muted`, cap 1.4. It is **one line of
copy**, picked by what the phone will do *before* anyone speaks:

| Phone | Copy |
|---|---|
| on-device recognition supported | Turned into text on your iPhone. Your voice never leaves it. |
| not supported (Apple's servers) | Turned into text by Apple’s speech service. Skip never keeps your voice. |
| unknown (helper not available) | Turned into text by Apple’s speech recognition. Skip never keeps your voice. |

This needs a synchronous `supportsOnDevice(): boolean` from `src/lib/speech.ts`. The module already
has `supportsOnDeviceRecognition()`. Dilip's contract only reports `onDevice` *after* a session, which
is too late for the page. All three lines match the marketing privacy draft's wording
(`.claude/team/marketing/2026-10-01-voice-privacy.md`). **Founder approves** (question 2).

### 4.5 "Try saying": the examples

`<SectionHeading>Try saying</SectionHeading>` at `mt-8`, then three cards `mt-3 gap-3`. The examples
are not tappable: no chevron, no pressed state, no role.

**Card:** `w-full rounded-[16px] border border-line bg-card p-4`.
- Header row `flex-row items-center gap-3`: a well `h-10 w-10 rounded-full bg-ink/5` holding the
  **same icon Quick add uses for that kind** (`ReceiptText`, `CalendarPlus`, `Repeat`), `size={20}
  color={colors.body} strokeWidth={1.8}`. The well is neutral, not `bg-accent/10`, because the accent
  on this page belongs to the button. Then the text: kind `font-poppins-semibold text-[15px] text-ink`,
  cap 1.3, and under it the tip `mt-0.5 font-poppins text-[12px] text-muted`, cap 1.3.
- Example lines `mt-3 gap-2`, each one `<Text className="font-poppins text-[15px] leading-6
  text-body" maxFontSizeMultiplier={1.6}>` in curly quotes. **The parts Skip picks up**
  (amount, name, when) are wrapped in `Strong` (`font-poppins-semibold text-ink`). The bold shows what
  matters, and the plain words show the filler that doesn't.

| Kind | Tip | Examples (**bold** = `Strong`) |
|---|---|---|
| Receipts | Something you’ve already paid for | “Spent **$12.50** at **Starbucks** **today**” · “**$64.20** at **Target** **yesterday**” · “Paid **45 bucks** for gas at **Shell** **on Friday**” |
| Bills | Mention “bill” or “due” and the date | “**Electric bill** **$85**, due **on the 15th**” · “**Rent** is **$1,800**, due **on the 1st**” · “**Comcast** **$79.99**, due **on the 20th** **every month**” |
| Subscriptions | Mention how often it renews | “**Netflix** **$15.99** **every month**” · “**Spotify** **$11.99** **a month**, renews **on the 3rd**” · “**Amazon Prime** **$139** **a year**” |

Amounts are written as digits with `$`, because that is how iOS writes them (brief correction 5).
What people see here is what they will see quoted back on the review page.

**These nine sentences are a promise, so each one must be a fixture in Drew's parser table** and parse
to exactly the bold values (kind, cents, merchant, date, cycle; bills also `energy` / `housing` /
`internet`). If one does not parse, change the example, not the parser's promise. Fallback for the
weekday example if weekdays are not supported in v1: “Paid **45 bucks** for gas at **Shell** **on the 28th**”.

### 4.6 "Add it by hand" (nothing heard, error, denied, unavailable)

Between the privacy line (or the stage card, when the line is hidden) and "Try saying": `mt-6`,
`<FieldLabel>Or add it by hand</FieldLabel>`, then `mt-3 w-full flex-row flex-wrap gap-2` with three
`ActionPill`s: `icon={ReceiptText}` **Receipt**, `icon={CalendarPlus}` **Bill**, `icon={Repeat}`
**Subscription**. Each one does `router.replace('/add-receipt' | '/add-bill' | '/add-subscription')`, so
the form takes this page's place: back or save from the form returns to Home.

### 4.7 Footer

`Screen`'s `footer`, never `mt-auto` (house rule). Primary `Button` full width. Icons in the
button: `<Mic size={20} color={colors.onControl} strokeWidth={1.8} />`. While listening, a
`TextLink variant="subtle" label="Cancel"` sits under Done. The unavailable state has no footer, and the
by-hand pills are its actions.

---

## 5. Page 2: `/voice-review`, "Is this right?"

Dmitri decided the save (his §1): this page builds the values with Diego's pure builders
(`src/api/entry-values.ts`) and calls `create…mutateAsync` directly. The form's rules come along
because the forms call the same builders. There is **no reminder control** on this page, so Dana does
not call `applyReminder`. A new item's default is Off, the same as an untouched form. Reminders, notes,
a specific-period bill and a custom icon are what "More options" is for.

### 5.1 Layout, top to bottom (a receipt, everything heard)

```
┌─────────────────────────────────────────────┐
│ ‹             Add a receipt              ✕  │  FlowHeader (pinned); title follows the kind
│               Is this right?                │  20px muted centred, mt-6
│ ┌─ bg-ink/5 · rounded-[16px] · px-4 py-3 ─┐ │  mt-4
│ │ You said                                │ │  12 medium muted
│ │ “Spent twelve fifty at Starbucks today” │ │  15 ink
│ └─────────────────────────────────────────┘ │
│ Add as                                      │  FieldLabel mt-6
│ (Receipt) ( Bill ) ( Subscription )         │  ChoiceChips mt-2
│                                             │
│                 $12.50                      │  AmountFigure, mt-6, one pressable block
│               ( ✎ Change )                  │
│ ┌─ card · border-line · py-1 ─────────────┐ │  mt-6
│ │ (logo) Store                          › │ │  ReviewRow
│ │        Starbucks                        │ │
│ │ ─────────────────────────── ml-[52px] ─ │ │
│ │ [📅]   Bought on                      › │ │
│ │        Today                            │ │
│ └─────────────────────────────────────────┘ │
│ Paid with                                   │  FieldLabel mt-6 (only if sources exist)
│ (● Visa ·4821) (● Checking)                 │  SourceTiles mt-3, nothing preselected
├─────────────────────────────────────────────┤
│        Pick the amount you meant.           │  hint, only when Save is blocked
│ (             Save receipt               )  │  Button primary
│      Say it again        More options       │  two subtle TextLinks
└─────────────────────────────────────────────┘
```

`<Screen header={<FlowHeader …/>} footer={…}>`, scrollable (default). There are no text inputs here,
so no `avoidKeyboard`.

### 5.2 Header and question line

- `FlowHeader` title: **Add a receipt** / **Add a bill** / **Add a subscription**, the add flows' own
  titles. It updates live when the kind chips change, so the title always says what Save will make.
  `closePrompt` follows the kind (§5.9). `onClose` → `router.dismissTo('/home')`.
- Question line (the `StepFlow` question style: `w-full text-center font-poppins text-[20px]
  text-muted`, `mt-6`, `numberOfLines={2}`, cap 1.3, `accessibilityRole="header"`):
  - `confidence` **high** or **medium** → **Is this right?**
  - `confidence` **low** → **Did Skip hear you right?**
  - **This is the only thing confidence changes.** Low confidence never skips anything and never
    hides anything. High confidence never skips the review. Missing fields are highlighted from the
    kind's required fields (§5.6), not from the confidence score.

### 5.3 "You said"

`mt-4 w-full rounded-[16px] bg-ink/5 px-4 py-3`, the same tonal box add-receipt uses for its scan
report.
- `You said`: `font-poppins-medium text-[12px] text-muted`, cap 1.3.
- The transcript: `mt-1 font-poppins text-[15px] leading-6 text-ink`, cap 1.6, wrapped in curly quotes,
  **shown in full**. It is what they said, and it is the evidence for everything below it.

### 5.4 "Add as": the kind

`<FieldLabel className="mt-6">Add as</FieldLabel>` then `ChoiceChips` `mt-2` with options
**Receipt** / **Bill** / **Subscription**, value = the draft's kind.
- When `kindSure === false` and the person has not touched the chips, a line under them reads
  `mt-2 font-poppins text-[13px] text-muted`, cap 1.4: **Skip guessed this one. Pick another if it’s
  wrong.**
- **Changing the kind** updates the header title, the Save label, the row set (§5.6), the date row's
  label, the cycle chips and the "Paid with" label. It should also **re-read the same words for the new
  kind**: date direction (a receipt's "on the 5th" is past, a bill's is next), the cycle and the bill
  category. That needs Drew's `forceKind` (Dmitri §8.3, which I support). **Anything the person
  already changed by hand is kept.** Only untouched fields are re-derived. Without `forceKind`, the
  values stay as they were and the person checks the date by hand.

### 5.5 The amount

One of three looks, always `mt-6`:

**a) Heard clearly.** One `Pressable`, `w-full items-center rounded-[16px] py-4 active:bg-ink/5`,
holding:
- `AmountFigure` (`src/components/flow/amount-figure.tsx`), the add flows' hero money style. It uses
  the 64/48/36/28 bands, its own `$`, and never shrinks to fit. Feed it a **plain two-decimal string
  with no commas, built from integer cents** (`"12.50"`, `"1250.00"`). `String(12.5)` would show
  "$12.5", so this conversion belongs in Diego's `voice-draft.ts`, not in the page.
- Below the figure, `mt-3`, a **drawn** pill (not a second button): `flex-row items-center gap-1.5
  rounded-full bg-ink/5 px-3.5 min-h-8` with `Pencil` 14 `colors.ink` stroke 1.8 and **Change**
  `font-poppins-medium text-[13px] text-ink`, cap 1.2.
- Press → `/voice-edit?field=amount`.

**b) Not heard** (`amount === null` and no choices). One `Pressable`, `w-full min-h-[112px] items-center
justify-center rounded-[16px] bg-accent/10 px-4 active:opacity-80`:
- **Tap to add the amount** in `font-poppins-medium text-[17px] text-accent-ink`, cap 1.3.
- Under it, `mt-1 font-poppins text-[13px] text-muted`, cap 1.4: **Skip didn’t catch how much.**
- Press → `/voice-edit?field=amount`.
- Never `$0` or `$0.00`. A zero for an amount nobody said is a false figure (add-flows §5.1).

**c) Ambiguous** (`amountChoices.length >= 2`, nothing picked yet). `w-full rounded-[16px] bg-accent/10
p-4`:
- **Which amount did you mean?** `font-poppins-semibold text-[15px] text-ink`, cap 1.3.
- `ChoiceChips` `mt-3`, one chip per choice labelled `formatCurrency(choice)` (`$12.50`, `$1,250.00`),
  in the parser's order, **with none selected** (value `''`). Nothing is guessed (brief correction 4).
- `TextLink variant="subtle"`, left-aligned with `className="mt-1 items-start"`: **Neither, I’ll type
  it** → `/voice-edit?field=amount`.
- Picking a chip sets the amount, and the block becomes look (a). If that is wrong, Change opens the
  keypad, which is the same way any amount is corrected.

### 5.6 The details card

`mt-6 w-full overflow-hidden rounded-[16px] border border-line bg-card py-1`, the `DestinationList`
container. Rows are separated by `<View className="ml-[52px] h-px bg-line/60" />` (the house inset).

**Rows by kind.** Required means the add form refuses to save without it. That is mirrored from each
form's `handleSave`. The rules come from the forms, not from this spec.

| Kind | Row | Leading mark | Value | If empty |
|---|---|---|---|---|
| Receipt | **Store** | `BrandLogo` 40 (name, domain), with the monogram fallback for unknown stores | merchant name | **required**: Tap to add |
| Receipt | **Bought on** | well + `CalendarDays` | `formatRelativeDay(date, today)`: "Today", "Yesterday", "15 Oct 2026" | shows **Today**. That is the form's own default (`add-receipt.tsx` `BLANK.date`), so it is not highlighted |
| Bill | **Name** | `BrandLogo` 40 when a company was heard, else `BillMark` with the category's glyph | merchant name, else the category's label (the form's prefill, via Dmitri's `defaultBillName`) | **required**: Tap to add |
| Bill | **Category** | well + the category's glyph (`BILL_CATEGORIES[…].icon`, `GLYPH_STROKE`) | category label, e.g. "Electricity & Gas" | **required**: Tap to add |
| Bill | **Due on** | well + `CalendarDays` | `formatRelativeDay` | **required**: Tap to add |
| Subscription | **Service** | `BrandLogo` 40 | merchant name | **required**: Tap to add |
| Subscription | **Renews on** | well + `CalendarDays` | `formatRelativeDay` | **optional**: "Not set", muted, no highlight (the form treats renewal as optional) |

Dates print through the app's existing `formatRelativeDay` / `formatFullDate`. There is no second date
format.

**`ReviewRow`** is new, `src/components/voice/review-row.tsx` (Dana). It is new because `SettingsRow`
puts the value first on one line and has no "missing" look, and a review reads label then value:

| Part | Spec |
|---|---|
| Row | `Pressable`, `min-h-14 w-full flex-row items-center gap-3 px-4 py-3 active:opacity-60` |
| Leading | 40×40. Brand and bill marks bring their own round shape. Glyphs sit in `h-10 w-10 items-center justify-center rounded-[12px] bg-ink/5`, 20px, `colors.body`, stroke 1.8 |
| Label | `font-poppins text-[12px] text-muted`, cap 1.3: "Store", "Due on"… |
| Value | `mt-0.5 font-poppins-medium text-[15px] text-ink`, cap 1.4, `numberOfLines={2}` (long names wrap at large text rather than ellipsising) |
| Trailing | `ChevronRight` 18 `colors.muted` stroke 2 |
| **Missing, required** | Leading well becomes `bg-accent/10` holding `Plus` 20 `colors.accentInk`. Value reads **Tap to add** in `text-accent-ink`. The chevron stays. Three cues (tint, words, colour) without a red "error" before anything has gone wrong |
| **Missing, optional** | Normal well. Value **Not set** in `font-poppins text-muted`. Label gains " · optional" |
| Press | `/voice-edit?field=merchant` (Store, Name, Service), `field=date`, `field=category` |

### 5.7 How often (bills and subscriptions)

Under the card, `mt-6`: `FieldLabel` then `ChoiceChips` `mt-2`. The labels and options are **each form's
own**, so "More options" opens on the same words:
- Bill: **Recurring**, with `RECURRENCES`: Weekly · Monthly · Every 3 months · Yearly. "Specific period"
  is left out because it needs an end date, which is a "More options" job.
- Subscription: **Billing cycle**, with the form's `CYCLES`: Weekly · Monthly · Quarterly · Yearly.

If no cycle was heard, **Monthly** is preselected. That is each form's own default, so it is not a
guess and not highlighted. The selection is visible, which is the check.

### 5.8 Paid with

Shown only when `usePaymentSources().sources.length > 0`, as add-receipt and add-subscription do
(add-bill draws an empty row. Voice does not copy that). `mt-6`,
`FieldLabel` **Paid with** (receipts, bills) or **Charged to** (subscriptions), then `SourceTiles`
`mt-3`. **Nothing is preselected** (the forms' default). It is optional and never mentioned by the
Save hint. It is here because a receipt on a credit card moves that card's balance, and leaving it out
would quietly file every voice receipt against no card.

### 5.9 Footer: Save, and the two ways out

`Screen`'s `footer`, a column `w-full gap-2`:

1. **Hint** (only while Save is blocked): `w-full text-center font-poppins text-[13px] text-muted`,
   cap 1.4. It is muted, not `text-danger`, because nothing has failed. It names what to do. Show the
   **first** that applies:
   1. ambiguous amount not picked → **Pick the amount you meant.**
   2. bill with no category → **Pick what the bill is for.**
   3. otherwise the builder's own message, **verbatim from the forms**: "Pick a store first." / "Enter
      how much you spent." / "Give the bill a name." / "Enter how much it costs." / "Pick the first due
      date." / "Pick a service first." / "Enter what it costs."
2. **Save:** `Button` primary, full width. **Save receipt** / **Save bill** / **Save subscription**.
   While pending: **Saving…**, disabled (one tap makes one row). Disabled while blocked, with
   `accessibilityHint` set to the hint text.
3. **Save failed:** `FAILURE_MESSAGE` in `text-center font-poppins text-[13px] text-danger` replaces the
   hint (the `StepFlow` error slot). `warn()`. The button goes back to its label, and pressing it again is
   the retry. Nothing on the page is cleared.
4. **Secondary row:** `w-full flex-row flex-wrap justify-center gap-x-8`, two `TextLink
   variant="subtle"`:
   - **Say it again** → back to `/voice` listening immediately (§4.3). If edits were made, it asks first.
   - **More options** → the full add form, pre-filled (§7). `accessibilityHint`: "Opens the full
     receipt form with this filled in." (with the kind).
   At large text the two wrap onto two centred lines rather than ellipsising.

**The one dialog** is the add flows' close prompt, word for word (`useConfirm`, as `FlowHeader` already
does):
- title **Cancel adding this receipt?** / **…bill?** / **…subscription?**
- message **Nothing you have entered here will be saved.**
- confirm **Yes** (destructive), cancel **Go back**

It is raised by ✕ (always), and by back or "Say it again" once anything has been edited (§1). "Yes" from
✕ → `dismissTo('/home')`. "Yes" from back or "Say it again" → `/voice`.

### 5.10 A cold or stale draft

When `readVoiceDraft(id)` is null (a deep link, or the navigator remounting on a text-size change,
Dmitri §2), render `<Screen showBack>` + `PageState`:
- `art={artwork.noResults}` (`error` would read as a failure, and nothing failed)
- title **Nothing to check yet**
- message **Say what you want to add and Skip will show it here.**
- action **Start again** → `router.replace('/voice')`

`/voice-edit` uses the same state when its working copy is missing.

---

## 6. Edit pages: `/voice-edit?field=amount|merchant|date|category`

**This extends Dmitri's plan.** He planned two routes. The Founder's rule ("individual pages… do not
make hover or push from bottom") rules out `AmountPad` (a `Modal` with `animationType="slide"`, which
slides up from the bottom) and `DatePicker` (a floating modal). So corrections are one-job pages pushed
from the right, built from the add flows' own pieces. No piece is new.

**Engineering dependency (Dmitri/Diego):** the review page's working copy has to survive the push and
take the edit back on **Done**. One way is a working-copy slot beside the draft in `voice-draft.ts`,
which the review page re-reads on focus. Dmitri picks the mechanism. The behaviour required is:
**Done** writes the change and pops. **Back** or **swipe** pops and writes nothing (no dialog, since it
is one field).

**Shell for all four:** `<Screen header={<FlowHeader title={…} onBack={router.back} />} footer={…}>`,
with no `closePrompt`, so there is no ✕. The question line is the `StepFlow` style, `mt-6`, using **the
add flows' own question copy**. Footer: `Button` **Done**.

| field | Header title | Question line | Content | Done enabled when |
|---|---|---|---|---|
| `amount` | Amount | How much did you spend? / How much is the bill? / How much does it cost? | `AmountStep` (figure plus the tonal keypad, keypad low on the page), seeded with the current two-decimal string, or empty | `Number(draft) > 0` |
| `merchant`, receipt | Store | Where did you buy it? | `BrandField` label **Store**, placeholder "Search for a store". `avoidKeyboard` | a store is chosen |
| `merchant`, subscription | Service | Which service is it? | `BrandField` label **Service**, placeholder "Search for a service" | a service is chosen |
| `merchant`, bill | Name | Who is the bill from? | `BrandField` label **Company**, placeholder "Search for a company", then `TextField` label **Name** (`autoCapitalize="words"`, `mt-5`). Picking a company names the bill unless it has a real name already, which is add-bill's `handleIssuer` rule exactly | name not blank |
| `date` | Bought on / Due on / Renews on | When was it? / When is it due? / When does it renew? | `InlineCalendar` (with its **Today** pill), seeded with the current date. Receipts with none get today | a day is picked. Subscriptions are also enabled with none |
| `category` (bills) | Category | What is this bill for? | `CategoryPicker`. **A tap picks and pops**, with no Done and no footer. That is the component's own behaviour in add-bill. If the bill's name was still the old category's label, it becomes the new label (add-bill's untouched-name rule) | n/a |

- **Subscription date:** when a date is set, a `TextLink variant="subtle"` **No renewal date** sits
  under Done. It clears the date and pops.
- **Seeding the store search.** When the heard merchant matched no brand, `BrandField` opens with the
  search already filled with what was heard ("star bucks"), the field focused, and its results already
  showing. That needs two additive props on `BrandField`: `initialQuery?: string` and
  `autoFocus?: boolean`. It should use Drew's `merchantHeard` when it exists (Dmitri §8.1), else the
  merchant's name. When the merchant *did* match, the field opens showing it, with its ✕ to search for
  another, as in the forms.
- **Learning:** changing the merchant from what was heard teaches Skip the pair *after a successful
  save*. That is silent and on the phone only (Dmitri §4.5). There is no UI for it.

---

## 7. More options: the hand-off to the full form

Per Dmitri §1.4 step 5 and §2: `router.push({ pathname, params })` with the **edited** review state
(not the raw draft), plus `from=voice`. Diego's forms read the params.

What the person sees in the form (Diego):
- The form opens **pre-filled on its first dot** (the amount step). Bills **skip the category chooser**
  when a category is known.
- add-receipt does **not** show the scan report ("Read the store, date and amount" is camera wording).
  This matches Dmitri's `result: null` for voice. No voice banner is added to the forms. The fields are
  already filled, and that is the message.
- Saving → `success()` → `router.dismissTo('/home')`. Back → the review page, unchanged and still
  savable. The form is the one that saves. The review page is not stale, because a successful form save
  never returns to it.

**If the save path ever changes to "always hand off" (Dmitri rejected this in §1.2, so it is recorded
here, not built):** the review page's Save button would become **Continue**, opening the form on its
*last* step instead of its first, and §8 would happen inside the form. Nothing else on the review page
changes. §5.9's labels and hints are the only lines that would move.

---

## 8. After saving

1. `success()` haptic. That is the add flows' confirmation, and the only one.
2. `clearVoiceDraft()` and the learned alias (if any) are handled per Dmitri.
3. `router.dismissTo('/home')`. The voice pages slide out to the right, the standard back. The stack is
   `[tabs]`, with Home's tab selected.
4. **No toast, no "Saved", no success page** (add-flows §5.4). On Home the hero's `RollingNumber` rolls to
   its new "Left this month", a today receipt appears under **Recent**, and a bill due this week appears
   under **Coming up**. Those changing figures are the confirmation.
5. **Why Home and not the item's list:** the mic lives on Home, and every Quick add form launched from
   Home already returns there (`router.back()`). Landing on a list would cost a back tap on every save.
   The trade-off is that a bill or subscription due next month changes nothing visible on Home, so
   there the haptic alone confirms it. That is the same as Quick add today. I accept it for v1.

---

## 9. Pro explainer: `voice` in `src/data/pro-features.ts`

The Founder approves this copy (question 2). It follows the house shape: one short title, one tagline,
three benefits that sell what it *does*.

```ts
voice: {
  id: 'voice',
  artwork: 'welcomeTrack',
  title: 'Just say it',
  tagline: 'Say what you spent or what’s due. Skip fills it in, and you check it before it’s saved.',
  benefits: [
    {
      title: 'Receipts, bills and subscriptions',
      detail:
        '“$12.50 at Starbucks today.” “Rent $1,800, due on the 1st.” “Netflix $15.99 every month.” One sentence each.',
    },
    {
      title: 'Nothing saves until you say so',
      detail:
        'Skip shows exactly what it heard. Fix anything it missed, then tap Save. Nothing is filed without you.',
    },
    {
      title: 'Skip never keeps your voice',
      detail:
        'Your iPhone turns what you say into text, on the phone when it can, or with Apple’s speech service when it can’t.',
    },
  ],
},
```

- **Artwork `welcomeTrack`:** a person holding a phone with a thumbs-up. It is the only drawing in
  `artwork.ts` about talking to the phone. It is drawn on transparency for both modes (registry row
  `welcomeTrack: { light: WelcomeTrack, dark: WelcomeTrack }`), and it is not used on any other Pro
  page.
- Curly quotes and apostrophes, as the other entries use. The `title` matches page 1's title, so the
  feature has one name.

---

## 10. Light and dark

There are no new tokens and no hex literals. Every surface is an existing class:

| Element | Token |
|---|---|
| Pages | `bg-surface` (Screen) |
| Stage card, "You said", Change pill | `bg-ink/5` |
| Example cards, details card | `bg-card border border-line` |
| Ready disc, missing-field wells, not-heard and ambiguous blocks | `bg-accent/10` with `accentInk` type and glyphs |
| Live disc, FAB, selected chips, Save | `bg-control` with `onControl` |
| Pulse ring | `bg-control/25` |
| Blocked disc | `bg-card border border-line` with `MicOff` in `muted` |
| Save failure | `text-danger` |

- **Check on device with pistachio and apricot in light** (palest fills: the FAB edge rides on its
  shadow at 1.36:1 / 2.01:1) **and plum and navy in dark** (the FAB gets its ring, §2.2). Those four
  are the extremes of today's eight accents. The direction doc's old list (butter, slate) predates the
  2026-09-25 palette.
- `text-accent-ink` is computed against `surface`, and here it also sits on `bg-accent/10`. Measure
  "Tap to add" and "Tap to add the amount" with `contrast()` on the four accents above (floor 4.5:1). If
  one falls short, use `text-ink` for the words and keep the tint for the well.
- `bg-ink/5` on `#1B181F` is faint by design. The stage card relies on its contents (disc, type), not
  its edge.

---

## 11. Dynamic Type

Every `Text` gets a cap. Nothing is `allowFontScaling={false}` except `AmountFigure` (as today).

| Text | Cap |
|---|---|
| Title / Subtitle / example lines / "You said" quote | 1.4 / 1.6 / 1.6 / 1.6 |
| Question line, SectionHeading, card headers, review labels | 1.3 |
| Status line, body messages, privacy line, hints, review values | 1.4 |
| Live transcript | 1.3 (20px base) |
| Buttons / TextLinks | 1.5 (component default) |
| Chips, ActionPills | 1.2 (component default) |

- Primary actions are in `Screen`'s `footer` on every voice page, so at AX sizes the content scrolls
  under a button that is always on screen (the pinned-footer rule).
- The stage card's body area is a **minimum** of 56pt, not a fixed height, so at large text it grows
  rather than clipping.
- Review values wrap to two lines. The footer's two links wrap to two centred lines.
- The FAB has no text and does not scale.
- Test with `xcrun simctl ui booted content_size accessibility-medium`, then extra-extra-extra-large.

---

## 12. VoiceOver

**The mic hears VoiceOver.** While listening, nothing on the page may speak. So:
- The stage card's status line is a polite live region for **state changes only** ("Listening",
  "Checking what you said", "Skip didn’t hear anything"). The live transcript is **never** a live
  region.
- With VoiceOver on, "Start talking" first announces **"Listening. Double-tap Done when you’ve
  finished."**, then starts the mic **after** that announcement finishes (`AccessibilityInfo`
  `announcementFinished`). Dana checks the API, Tia checks on device that VoiceOver's speech is not
  transcribed (Dmitri R12). The `toggle()` haptic marks the moment the mic is live.
- After start, focus moves to **Done**.

| Element | Label | Hint / state |
|---|---|---|
| FAB | Add by voice | §2.3 |
| Page 1 title | Just say it (header) | n/a |
| Stage disc | hidden (`accessibilityElementsHidden`) | the footer button carries the action |
| Example card | each line read as written, for example "Spent $12.50 at Starbucks today" | not a button |
| Privacy line | as written | n/a |
| Review question | Is this right? (header), focused on arrival | n/a |
| "You said" box | "You said: Spent twelve fifty at Starbucks today" (one element) | n/a |
| Kind chips | radiogroup "Add as". Each: Receipt / Bill / Subscription | selected |
| Amount (a) | "Amount, $12.50" | "Opens the amount to change it." |
| Amount (b) | "Amount, not heard" | "Needed to save. Opens the amount to add it." |
| Amount (c) | header "Which amount did you mean?" + radio chips "$12.50", "$1,250.00" | none selected until picked |
| ReviewRow | "{Label}, {value}", for example "Store, Starbucks" / "Due on, not heard" / "Renews on, not set, optional" | "Opens {label} to change it." / "Needed to save. Opens {label} to add it." |
| Save | Save receipt | disabled + hint = the footer hint |
| Edit pages | header title, then the question line (header) focused on arrival | Done disabled state |

---

## 13. Components

**Reused as they are:** `Screen` (`footer`, `header`, `showBack`), `Button`, `TextLink`, `ActionPill`,
`ChoiceChips`, `SourceTiles`, `TextField`, `PageState`, `SectionHeading` / `Title` / `Subtitle` /
`FieldLabel` / `Strong`, `AmountFigure`, `AmountStep`, `InlineCalendar`, `CategoryPicker`, `BrandLogo`,
`BillMark`, `useConfirm`, `useProGate`, `formatCurrency`, `formatRelativeDay`, `@/lib/haptics`.

**Changed, additive only (old call sites compile untouched):**

| File | Change | Owner |
|---|---|---|
| `src/components/ui/screen.tsx` | `floatingPlacement?: 'page' \| 'tabBar'` (§2.2) | Dana |
| `src/components/flow/step-flow.tsx` | `FlowHeader`: `closePrompt` optional (no ✕ when absent), `onClose?` (§3) | Dana |
| `src/components/brands/brand-field.tsx` | `initialQuery?: string`, `autoFocus?: boolean` (§6) | Dana |
| `src/app/(tabs)/home.tsx` | `{ pro, ready }`, `floating={<VoiceFab/>}`, `floatingPlacement="tabBar"` | Dana |
| `src/data/pro-features.ts` | `voice` entry (§9) | Dana, once the Founder approves |

**New:**

| File | Why nothing existing does it |
|---|---|
| `src/components/voice/voice-fab.tsx` | The floating mic. `AddButton` has the anatomy but a different icon, label and hint, and it is dead code |
| `src/components/voice/listening-card.tsx` | A live mic with a calm pulse. Nothing in the kit animates to a voice |
| `src/components/voice/review-row.tsx` | Label-above-value with a "missing" look. `SettingsRow` is value-first and has neither (§5.6) |
| `src/components/voice/example-card.tsx` (optional, can be local to `voice.tsx`) | A static card of highlighted sentences |
| `src/app/voice.tsx`, `src/app/voice-review.tsx` | per Dmitri |
| `src/app/voice-edit.tsx` | §6 (extends Dmitri's plan) |

Screen tests go under `src/__tests__/app/`, never `src/app/`.

---

## 14. What this spec needs from the others

| From | Need |
|---|---|
| **Drew** | The nine examples in §4.5 as fixtures, parsing to the bold values. `forceKind` for a kind switch (Dmitri §8.3). `merchantHeard` for seeding the store search (Dmitri §8.1) |
| **Dilip** | `supportsOnDevice(): boolean` before listening (§4.4). An optional `level: number` (0–1) for the pulse (§4.2). Tell me whether `unavailable` can say permanent vs temporary (§4.3). Restricted maps to `denied` |
| **Dmitri / Diego** | The working copy shared by review and edit pages (§6). The two-decimal amount string from cents (§5.5). The form side of `from=voice` (§7) |
| **Tia** | §2.2 placement and ring. `dismissTo` leaves `[tabs]` with Home selected. VoiceOver not transcribed. AX text sizes. The four accents in §10 |

---

## 15. Not in v1 (decided, not forgotten)

- **Auto-start on open.** It would save one tap for returning users. Reasons against are in §4.3. It is
  easy later: the FAB sets a one-shot flag, only after a first successful voice save.
- **Showing the engine's other guesses** ("Or did you say…"). The parser already picks the best of
  three.
- Reminders, notes, a specific-period bill or a custom icon on the review page. These are in "More
  options".
- A "PRO" sticker on the FAB (§2.3).

## 16. Found along the way (not voice scope)

1. `formatFullDate` prints day-first ("15 Oct 2026") while copy is US English. It is app-wide, so voice
   follows it rather than adding a second format. For Priya and Mia.
2. The tab bar's focused pill has the same dark-mode edge problem the FAB ring fixes: plum is 1.76:1 and
   navy 1.06:1 against the bar's `bg-card`. For Priya and Tia.
3. The stale "charcoal" comments in `skip-tab-bar.tsx:29-33` and `balance-summary.tsx:31` describe a
   colour the app no longer has. `control` is the accent.

## 17. Open questions for the Founder

1. **Free accounts see the mic, with no PRO sticker, and a tap opens the "Just say it" explainer.**
   Recommended. The alternatives are a small PRO sticker on the button, or hiding it from free accounts.
2. **Approve the privacy copy:** the three one-line notes in §4.4 and the explainer in §9. They match the
   marketing draft's claims.
3. **Saving returns to Home** (as Quick add does), not to the Receipts, Bills or Subscriptions list.
   Recommended. A bill due next month then shows nothing new on Home, and only the haptic confirms it.
