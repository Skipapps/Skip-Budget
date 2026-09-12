# Design direction — SkipBudget UI refresh

Date: 2026-09-11 · Author: Priya (Product Design lead) · For: Pia, Paulo
Scope: **presentation only**. No file under `src/api`, `src/lib` (hooks/queries), `src/stores`,
`supabase/` or `ios/` is in scope. Every number, route and action stays exactly where it is and keeps
coming from the same hook.

**The look in one line:** Material 3 clarity — tonal surfaces, generous whitespace, one clear
hierarchy — with Wise's money manners: big flat numbers, borders instead of shadows, pill buttons,
one accent used rarely.

Verified against https://docs.expo.dev/versions/v57.0.0/ (SDK 57 module list): this refresh adds **no
new Expo module**. Everything below is React Native core + NativeWind + `lucide-react-native@1.33.0`
+ `react-native-reanimated`, all already installed. Do not reach for `expo-blur`, `expo-glass-effect`
or `expo-linear-gradient` — they are installed but unused, and the audit flagged them for removal.

---

## 1. Spacing

One scale, multiples of 4. Allowed classes only: `1 (4) · 2 (8) · 3 (12) · 4 (16) · 5 (20) · 6 (24) · 8 (32)`.
Nothing odd (`mt-7`, `mt-10`, `py-2.5` on containers) unless it is inside a component's own internals.

| Rhythm | Value |
|---|---|
| Screen gutter | `px-6` — owned by `Screen`, never overridden |
| Between two blocks of the same idea | `mt-3` |
| Between blocks | `mt-6` |
| Above a new section heading | `mt-8` |
| Card padding | `p-5` (hero), `p-4` (standard card), `px-4 py-3.5` (list row) |
| Page title offset | `mt-2`, and that becomes `Screen`'s default — stop passing `mt-*` to `<Title>` |

Whitespace is the separator. Prefer removing a hairline rule and adding `mt-8` over drawing a line.

## 2. Corner radii — four steps, no others

| Step | Class | Used for |
|---|---|---|
| Hero | `rounded-[24px]` | the "Left this month" card only |
| Card | `rounded-[16px]` | every card, every grouped-row container |
| Control | `rounded-[12px]` | icon wells, date selector, inputs, segmented control, chips-in-a-row |
| Pill | `rounded-full` | buttons, badges, avatars, the FAB, progress tracks, brand marks |

Retire on sight: `rounded-[6px]` (except `Skeleton`), `rounded-[8px]`, `rounded-[10px]`,
`rounded-[14px]`, `rounded-[20px]`.

## 3. Elevation — flat and tonal, not shadowed

Default card: `bg-card` + `border border-line` + **no shadow**. `shadows.card` and `shadows.raised`
come off every in-page surface (`balance-summary`, `insight-banner`, `amount-tile`,
`getting-started-card`, `source-tiles`). Keep `src/theme/shadows.ts` as a file; keep
`shadows.floating` on exactly two things — the FAB and the tab bar, which genuinely float.

Reason beyond taste: shadows are invisible on `#1B181F`/`#2A2634`, so today light mode is separated
by shadow and dark mode by nothing. A border separates identically in both.

Tonal fills, in order of preference: `bg-ink/5` (neutral well), `bg-accent/10` (the one accented
well), `bg-control` (a real accent surface, foreground `text-on-control`). Never tint a whole card
with the accent except the hero.

## 4. Section headings — one size, one component

Add to `src/components/ui/typography.tsx`:

    SectionHeading — 17px, font-poppins-semibold, text-ink, maxFontSizeMultiplier={1.3}
      optional `caption` — 13px, font-poppins, text-muted, numberOfLines={1}, cap 1.2
      renders as a flex-row, items-baseline, justify-between, gap-3

Every section heading in the app becomes this. That deletes the local `Heading` in `insights.tsx`,
`SectionHeader` in `cards.tsx`, and the 15/16/19/20/21px one-offs listed in the audit (finding 9).
Cards drops 20 → 17 and Insights 19 → 17; that is the point, the three tabs currently disagree while
swiping between them.

## 5. Numbers

Poppins has no tabular figures, so numbers are aligned by **column**, not by font feature: every
amount is the last child of its row, right-aligned, `numberOfLines={1}`.

| Role | Style |
|---|---|
| Hero figure | `font-poppins-bold`, size from the existing 40/34/28 length rule in `balance-summary.tsx` — keep it, keep `RollingNumber` |
| Block figure (Income, Expenses) | `font-poppins-semibold text-[20px]`, `adjustsFontSizeToFit`, cap 1.2 |
| List row amount | `font-poppins-semibold text-[15px]`, cap 1.4 |
| Group total / caption figure | `font-poppins text-[13px] text-muted`, cap 1.3 |

Colour of money comes from `useMoneyColor()` / `colors.moneyIn` / `colors.moneyOut` only. Never
colour a figure with the accent, and never hardcode a hex. Figures are never approximated, rounded
for looks, or abbreviated (`$1.2k` is banned) — `formatCurrency` and nothing else.

## 6. The accent — sparingly

Permitted: the hero card fill, the FAB, the focused tab pill, progress fills, the PRO badge,
selected/checked states, and one tonal `bg-accent/10` icon well per screen at most. Everything else
is the neutral ramp. Type on the accent is `text-on-control` (never white, never `colors.surface` —
audit finding 1, four files). Accent as *type on the page* is `text-accent-ink`, never `text-accent`.

## 7. Icons

`lucide-react-native` only. **`strokeWidth={1.8}`** everywhere, with one exception: chevrons and
steppers use `2`. Retire 2.4 and 2.5 (`balance-summary`, `add-button`). Sizes: `20` in list rows and
headers, `18` for chevrons and captions, `24` in the FAB and hero controls. Colour from
`useColors()` — `colors.body` for an active glyph, `colors.muted` for a passive one,
`colors.onControl` on an accent fill.

Illustrations (`src/theme/artwork.ts`) stay, but move to where an illustration earns its space:
empty states, onboarding, the paywall. They come **off** the dashboard destinations and the insights
banner, where a 55%-opacity drawing was carrying a number.

## 8. List rows

One row style across the app:

    px-4 py-3.5, min-h-14, flex-row items-center gap-3, active:opacity-60
    leading mark: 40×40 — brand/bill marks stay rounded-full; generic glyphs sit in a
      rounded-[12px] bg-ink/5 well
    label: font-poppins-medium text-[15px] text-ink, numberOfLines={1}, cap 1.4
    caption: mt-0.5 font-poppins text-[12px] text-muted, cap 1.3
    trailing: amount, or a muted 18px ChevronRight, or both

Divider between rows: `<View className="ml-[52px] h-px bg-line/60" />`. `ml-13` is **not a Tailwind
class** and renders full-bleed today (audit finding 6; `home.tsx`, `bills.tsx`, `subscriptions.tsx`,
`source/[id].tsx`). `settings-row.tsx`'s `ml-8` moves to `ml-[52px]` too, so the whole app insets
dividers to the same 52pt.

Grouped rows sit inside one `rounded-[16px] border border-line bg-card` container with `p-0`, first
and last row padded by the container's own `py-1`.

## 9. Buttons

- Primary: `Button` — change `rounded-[10px]` → `rounded-full` in `src/components/ui/button.tsx`.
  One line; it is the single strongest Wise signal and it lands on every screen at once.
  **Founder sign-off needed** because it is app-wide (open question 1).
- Secondary/tertiary: `ActionPill` is already correct (`rounded-full border border-line bg-card`).
  Use it rather than inventing a ghost button.
- Text actions: `TextLink`.
- Minimum touch target 44×44 everywhere; where the visual is smaller, add `hitSlop={8}`
  (`reminders.tsx:354`, `date-selector.tsx` steppers).

## 10. Dark mode

- Separation is `bg-surface` vs `bg-card` plus `border-line`. Never `border-black/10`
  (`source-tiles.tsx:43`) — invisible on the dark card.
- No new hex literals. The destructive red `#DC2626` appears in 7 files and scores 3.05:1 on the dark
  card: add a `danger` token to `RAMPS`/`Tokens` (light `#B85040` family, dark `#ED7A7A` family,
  matching `moneyOut`) and a `text-danger` class, then replace all seven.
- `RefreshControl tintColor` must be `colors.muted`, not the hardcoded `#9A9A9A` (`screen.tsx:57`).
- Check every change on **apricot (default) and butter in light, plum and slate in dark** — those
  four are where `onControl` flips.

## 11. Accessibility — non-negotiable per screen

Every interactive element: `accessibilityRole`, a label that reads the value not just the noun
("Monthly Bills, minus $1,030.00" — the existing `AmountTile` label is the model), and
`accessibilityState` for disabled/selected. Every `<Text>` carries a `maxFontSizeMultiplier`
(headings 1.3, body 1.4–1.6, badges `allowFontScaling={false}` only when the pill cannot grow).
Decorative art gets `accessibilityElementsHidden`. Contrast floor 4.5:1 for type, 3:1 for glyphs —
use `contrast()` from `src/lib/tone.ts` to check, do not eyeball it.

## 12. Do NOT touch

- `src/api/**`, `src/lib/**` hooks, queries, mutations, stores, `supabase/**`, `ios/**`.
- Any figure, its source hook, or `formatCurrency`. No rounding, no abbreviating, no "approximately".
- Routes and navigation structure: same five destinations, same tab bar, same `expo-router` paths.
- `palette.ts` colour maths (`onColor`, `readable`, `mix`), the 12 accent values, the ramps —
  **except** adding the `danger` token.
- `tone.ts`, `RollingNumber`'s animation, `groupByDate`, `orderByIds`, `rangeFor`.
- The tab bar's shape and the FAB's position/size. Only the FAB's icon colour changes.
- `loan-schedule.tsx` logic and its per-row accessibility labels — best screen in the app, polish the
  chrome only.
- Artwork SVG assets. They are relocated, not edited or deleted.
