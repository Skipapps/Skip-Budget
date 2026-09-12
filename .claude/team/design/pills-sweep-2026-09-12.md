# Pills everywhere — the rule, and the screen-by-screen sweep

Date: 2026-09-12 · Author: Priya (Product Design lead) · Build: Pia + Paulo
Companion to `add-flows-2026-09-12.md`. Extends `design-direction-2026-09-11.md` §2 (radii) and §9
(buttons) — it does not replace them.

## Hard constraint — read before writing a line

**Presentation and screen flow only.** Nothing under `src/api`, `src/lib` (hooks, queries,
mutations), `src/stores`, `supabase/` or `ios/` changes. No mutation, no saved record, no figure, no
route. A pill is a shape; it never changes what a control does, what it is called in state, or what
it sends. Option lists (`RECURRENCE_CHOICES`, `REMINDER_CHOICES`, `LEDGER_RANGES`, `CYCLES`,
`NETWORKS`, the filter sheets' facets) are data — restyle them, never re-word or re-order them.

No new native module. `lucide-react-native`, NativeWind and the existing tokens only.

---

## 1. Why

Today the app says "pick one of these" in four different shapes: a bordered `SegmentedControl`, a
pill `ChoiceChips`, a `rounded-[12px]` stepper band, and a bordered dropdown. They sit on adjacent
tabs, so you meet three of them in one swipe. The Founder's instruction — Google-style pills
everywhere — is also the cheapest consistency win available: one shape for "choose", one shape for
"act", and the rounded-rectangle is left to do one job only, which is to be a card.

## 2. Pill anatomy

### 2.1 Chip — "choose one of these" / "filter by this"

| Property | Value |
|---|---|
| Height | **40** (`min-h-10`), `px-4`, `rounded-full` |
| Unselected | `bg-ink/5`, **no border**, `active:bg-ink/10` |
| Unselected label | `font-poppins text-[14px] text-body` |
| Selected | `bg-control`, no border |
| Selected label | `font-poppins-medium text-[14px] text-on-control` |
| Disabled | `opacity-40`, not pressable, `accessibilityState={{ disabled: true }}` |
| Icon (optional) | leading, 18, `strokeWidth={1.8}`, `colors.body` unselected / `colors.onControl` selected |
| Gaps | `gap-2` in a row, `gap-2` between wrapped lines |
| Type cap | `maxFontSizeMultiplier={1.2}`, plus `hitSlop={{ top: 4, bottom: 4 }}` so the target clears 44 |

The border comes **off**. A tonal fill already separates the chip from the page, and a chip that is
both filled and outlined is two separations doing one job — it is also the single loudest difference
between our chips today and the Founder's reference.

### 2.2 Primary button — "do the thing"

Unchanged from `Button`: full width, `rounded-full`, `min-h-16` (52 is the design height; the
component uses a minimum so a wrapped label grows instead of clipping — keep that), `bg-control`,
`text-on-control` 17px medium, disabled `opacity-50`. One per screen or per step.

### 2.3 Action pill — "a secondary action, inline"

`ActionPill`, already correct in shape. One change: `border border-line bg-card` → **`bg-ink/5`, no
border**, to match §2.1. Height rises to 40. Icon 18 at 1.8, label 14 medium `text-ink`.

### 2.4 Toggle pill — "one of exactly two"

A single `rounded-full bg-ink/5` track with two halves; the selected half is a `rounded-full
bg-control` inset by 0 (no visible track padding), label `text-on-control`. Used for AM/PM and
anywhere a binary reads better as one object than as two chips. Both halves ≥44×44 including hitSlop.

### 2.5 Badge — "a label, not a control"

Unchanged: `rounded-full`, `bg-accent`, `text-on-control`, 11px. The **PRO badge stays exactly as it
is** — it is the one pill that is not pressable, and changing it would make a label look tappable.

---

## 3. What becomes a pill

| Today | Becomes | Where |
|---|---|---|
| `segmented-control.tsx` | **retired.** All three call sites move to `ChoiceChips`, then delete the file — I checked, `add-expense.tsx`, `add-account.tsx` and `add-subscription.tsx` are the only importers. | add-account (account type), add-expense (split mode), add-subscription (cycle **and** active/cancelled — two of them on one screen) |
| `choice-chips.tsx` | restyled to §2.1 (border off, height 40, 14px) | 7 screens — behaviour identical |
| `multi-choice-chips.tsx` | same restyle, check glyph stays `colors.onControl` at 1.8 | salary (which accounts a source is paid into) |
| `range-dropdown.tsx` trigger | pill per §2.3 — `bg-ink/5`, no border, 40 tall, trailing `ChevronDown` 16 at 2 | Transactions, Insights, Savings |
| `range-dropdown.tsx` sheet | `rounded-[14px]` → `rounded-[16px]`, rows keep their check | same |
| Transactions period stepper (`rounded-[12px] border` band) | one `rounded-full bg-ink/5` band, the two steppers already circles — keep them, keep `hitSlop`, keep the `opacity-30` at the ends | `(tabs)/transactions.tsx` |
| Filter buttons (`min-h-12 w-12 rounded-[12px] border`) | 44×44 `rounded-full bg-ink/5`; the count badge stays a `rounded-full bg-accent` with `text-on-control` | Transactions, Receipts, Bills, Subscriptions |
| Filter sheets' facet rows | `ChoiceChips` / `MultiChoiceChips` per §2.1 | the four `*-filter-sheet.tsx` |
| `action-pill.tsx` | §2.3 | Cards, Bills, Subscriptions, Receipts, Splits headers |
| "Open" / "See all" affordances (`min-h-12 w-full rounded-full border`, `rounded-[12px] border` rows that are really buttons) | `ActionPill` where they are inline; `Button variant="outline"` only where they are the screen's own action | insights.tsx:688, add-member.tsx "Add a friend by code", settle-up |
| `appearance.tsx` / `settings.tsx` `rounded-full bg-control px-6 py-3` save buttons | already pills — normalise to 40 tall and `ActionPill` metrics | 2 screens |
| `reminders.tsx` chips at `rounded-full border px-3 py-1.5` | §2.1 metrics (40 tall, `bg-ink/5`) | reminders |
| `pro.tsx` plan cards' `border-2 border-control` selection | stays a **card**, not a pill — but its "Most popular" badge stays a badge per §2.5 | pro |
| `source-tiles.tsx` | tiles become pills: `rounded-full`, 40 tall, brand mark 24 leading, selected `bg-control` | add-bill, add-card, add-account, save-loan, add-receipt, add-subscription |

## 4. What must NOT become a pill

1. **List rows.** A row is a row: `px-4 py-3.5`, `min-h-14`, 52pt-inset divider. Rounding a full-width
   row makes a 350pt-wide pill, which reads as a button you cannot press.
2. **Text fields.** `TextField` keeps `rounded-[12px]`. A round-ended box says "tap me and something
   opens"; a text field says "type here". The one exception is `SelectField`'s new `pill` variant —
   which is correct precisely because it *does* open something.
3. **The tab bar.** Already a pill, already floating, already signed off. Do not touch its shape, its
   position, or the FAB.
4. **Cards.** `rounded-[16px]`, hero `rounded-[24px]`. Unchanged.
5. **The PRO badge and every other non-interactive badge.** §2.5.
6. **Progress tracks.** Already `rounded-full`; they are not controls and get no fill change.
7. **Switches.** `Switch` is a system control with system semantics. Leave it.
8. **Modal sheets and dialogs.** `rounded-[16px]`.
9. **Colour and avatar swatches, and `NetworkPicker`'s logo tiles.** Already circles/tiles; they are
   recognised by their artwork, and a `bg-control` fill over a logo hides the thing being chosen.
10. **`PaymentCard`'s live preview** on add-card. It is a picture of a card, not a control.

## 5. Screen-by-screen checklist

### Pia — everyday

| Screen | Work |
|---|---|
| `(tabs)/home.tsx` | `QuickActions` circles unchanged; any "See all" → `ActionPill` |
| `(tabs)/transactions.tsx` | range dropdown trigger → §2.3 · period band → `rounded-full` · filter button → 44 circle, badge kept · filter sheet facets → §2.1 |
| `(tabs)/cards.tsx` | header `ActionPill` ×2 → §2.3 |
| `bills.tsx` | `ActionPill` · filter button · `bill-filter-sheet.tsx` facets |
| `subscriptions.tsx` | `ActionPill` · filter button · `subscription-filter-sheet.tsx` facets |
| `receipts.tsx` | `ActionPill` · filter button · `receipt-filter-sheet.tsx` facets |
| `splits.tsx` | `ActionPill` · group card stays a card · the unread count stays a badge |
| `split-group.tsx`, `group-settings.tsx`, `settle-up.tsx` | any bordered inline action → `ActionPill`; member rows stay rows |
| `add-expense.tsx`, `add-receipt.tsx`, `add-bill.tsx`, `add-group.tsx`, `add-member.tsx` | per `add-flows-2026-09-12.md`; `SegmentedControl` → `ChoiceChips`; `SourceTiles` → pills |
| `savings.tsx`, `savings-month.tsx` | range dropdown trigger; figures untouched |
| `friends.tsx` | "Add by code" → `ActionPill`; friend rows stay rows |
| `tour.tsx`, `hello.tsx`, `welcome.tsx` | primary `Button` already a pill; any "Skip" → `TextLink`, not a pill |

### Paulo — loans, insights, settings, paywall, appearance, notifications, reminders

| Screen | Work |
|---|---|
| `insights.tsx` | `ChoiceChips` range row → §2.1 · the `rounded-full border` CTA at :688 → `ActionPill` · cards and progress tracks untouched |
| `loan-calculator.tsx` | `SliderRow`s unchanged (a slider is not a pill) · the two `SelectField`s → pill variant · `AmountPad` incl. `unit="percent"` per the add-flows spec · **no figure, no rate, no schedule maths touched** |
| `loan-schedule.tsx` | chrome only: any inline action → `ActionPill`. The table, its figures and its per-row a11y labels are off limits. |
| `save-loan.tsx` | `SourceTiles` → pills · summary `Row`s stay rows · "Add to bills" already a pill |
| `salary.tsx` | frequency `ChoiceChips` · `MultiChoiceChips` accounts · `SelectField`s → pill variant · `CollapsibleSection` header unchanged |
| `add-subscription.tsx`, `add-card.tsx`, `add-account.tsx` | per the add-flows spec. `NetworkPicker` (add-card) and `ColorPicker` keep their own shapes — logo tiles and colour swatches are not chips. |
| `(tabs)/settings.tsx` | rows stay rows · the `rounded-full bg-control` save → `ActionPill` metrics · section headings already `SectionHeading` |
| `appearance.tsx` | theme rows stay rows (`rounded-[16px]`) · accent swatches stay circles · the save pill → `ActionPill` metrics |
| `notifications.tsx` | the `rounded-full border` toggle at :99 → §2.3 · rows stay rows |
| `reminders.tsx` | choice chips → §2.1 · the "at 9:00 am" time trigger → §2.3 · keep the existing `hitSlop={8}` on the 32pt clear button, or raise it to 40 |
| `pro.tsx` | plan cards stay cards · "Most popular" stays a badge · Restore / Terms → `TextLink`, not pills · the primary purchase button already a pill |
| `pro-feature.tsx` | primary already a pill · the dismiss line stays a `TextLink` |
| `contact.tsx`, `faq.tsx`, `terms.tsx`, `privacy.tsx`, `message.tsx` | `ActionPill` for inline actions only; long-form text untouched |
| `auth.tsx`, `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-otp.tsx` | primary `Button` already pills · `otp-input.tsx` boxes stay `rounded-[12px]` (they are fields) |

## 6. Accessibility (applies to every pill)

- `accessibilityRole="button"` for actions, `"radio"` inside a single-choice group (with the group
  wrapped in `accessibilityRole="radiogroup"`), `"checkbox"` for multi-choice.
- `accessibilityState={{ selected }}` / `{{ checked }}` / `{{ disabled }}` — always. Colour is not a
  state.
- The label reads the **value**, not the noun: `"Monthly"`, `"Showing this month"`, `"Filters, 2
  applied"`.
- 44pt target minimum: a 40pt chip needs `hitSlop={{ top: 4, bottom: 4 }}`. Non-negotiable.
- `maxFontSizeMultiplier={1.2}` on chip labels; `allowFontScaling={false}` **only** on a badge that
  physically cannot grow, never on a chip.
- Contrast floor 4.5:1 for the label, 3:1 for the fill against the page. `bg-ink/5` unselected on
  `bg-card` is the tightest pair in the app — check it with `contrast()` from `src/lib/tone.ts` on
  apricot, butter, plum and slate before signing off.

## 7. Order of work

1. `choice-chips.tsx`, `multi-choice-chips.tsx`, `action-pill.tsx` — the three components. One change,
   lands everywhere at once. Screenshot the four accents after this and before anything else.
2. `SegmentedControl` call sites → `ChoiceChips`, then delete `segmented-control.tsx`.
3. `SelectField` gains `variant="pill"`; `SourceTiles` becomes pills.
4. `range-dropdown.tsx` trigger, the four filter buttons, the four filter sheets.
5. The screen-by-screen list, Pia and Paulo in parallel.

`npx tsc --noEmit` and `npx expo lint` clean at every step. **Nobody commits, pushes or merges** —
the CEO does that, and only after the Founder approves.
