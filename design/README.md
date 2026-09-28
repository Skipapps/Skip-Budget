# SkipBudget design kit

Generates, from one spec per screen:

- `out/wireframes/<id>.svg` – greybox wireframe
- `out/hifi/<id>.svg` – high-fidelity, light mode, apricot accent (import into Figma: File → Import, or drag in)
- `out/hifi-dark/<id>.svg` – the same in dark mode
- `out/html/<id>.html` – flex HTML for the free **html.to.design** Figma plugin (paste the file's URL or contents; it produces frames with auto layout and Poppins text styles)
- `out/*/_components.svg` and `out/html/_components.html` – the component sheet
- `out/index.html` – gallery of everything

Build: `node design/build.mjs` (regenerate icons first only if the app adds lucide icons: `node design/kit/build-icons.mjs`).

Everything in `kit/tokens.mjs` and `kit/components.mjs` is copied from the app source (`src/theme/palette.ts`, `src/components/**`) – same paddings, radii, type sizes, colours. **Do not invent a look. If the screen you are drawing uses a component, use the kit's version of it.**

## Writing a screen spec

One file per app route in `design/screens/NN-<route>.mjs`:

```js
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, spacer, flexSpacer, icon, art, divider, wrap } = C;

export const section = 'Bills';   // gallery group
export const order = 30;          // gallery order

export default [
  screen({
    id: 'bills',                  // file name, kebab-case, unique across ALL screens
    name: 'Bills',                // Figma frame name
    back: true,                   // Screen showBack → back chevron above the column
    tab: 'home',                  // one of home | cards | transactions | settings – draws the tab bar (tab pages only)
    fab: false,                   // AddButton bottom-right
    overlay: C.ConfirmDialog(...),// centred modal over a 40% scrim (optional)
    sheet: C.Sheet([...]),        // bottom sheet over a scrim (optional)
    padBottom: 16,                // Screen's contentContainer paddingBottom
    children: [ ...nodes ],       // the column, 342pt wide (390 minus 24pt gutters)
  }),
  // more states of the same route: 'bills-empty', 'bills-loading', 'bills-filter-sheet' …
];
```

Export an array. **Every state that exists in the source gets its own frame**: loaded, empty (`PageState`), loading (`SkeletonRow`s), error, each step of a `StepFlow`, each open sheet or dialog.

### Layout primitives (`kit/render.mjs`)

| node | what it is |
|---|---|
| `vstack(props, children)` | column. Children fill the width unless `hug: true` or `w`. |
| `hstack(props, children)` | row. Children hug their content unless `flex: n`. |
| `wrap(props, children)` | row that wraps (chips, swatches). |
| `box(props, child)` | a vstack with one child. |
| `text(str, style, opts)` | style `{ size, weight, lineHeight, color, align, italic, transform:'uppercase', letterSpacing, underline, strike }`; opts `{ nowrap, maxLines, flex, hug, mt… }`. Prefer the typography helpers below. |
| `icon('Name', { size, color, stroke })` | any lucide icon the app imports (PascalCase, e.g. `'CalendarDays'`). |
| `art('tile-salary', { w, h } or { ratio, maxW, aspect })` | an illustration from `assets/illustrations` by file name (no `.svg`). Dark mode picks the dark version automatically. |
| `rich([[str, styleOverride], …], baseStyle, opts)` | one wrapping paragraph with inline runs of different weight/colour (`<Body>` with `<Strong>` inside). Helpers: `C.RichBody(runs)`, `C.RichSubtitle(runs)`. |
| `spacer(h)` / `flexSpacer()` | vertical gap / push-to-bottom. |
| `divider({ inset, color })` | 1px hairline. |

Common props on any node: `mt mb ml mr` (margins, in pt – use these for the `mt-6`-style spacing in the source: `mt-2`=8, `mt-3`=12, `mt-4`=16, `mt-5`=20, `mt-6`=24, `mt-8`=32, `mt-10`=40), `flex`, `hug`, `w`, `h`, `minH`, `self` (`'center' | 'start' | 'end' | 'stretch'`), `opacity`, `name` (Figma layer name).

Stack props: `gap`, `pad` (number, `[y, x]`, or `{ t, r, b, l, x, y }`), `align` (`start | center | end | stretch | baseline`), `justify` (`start | center | end | between | around`), `fill`, `stroke`, `strokeWidth`, `radius` (number or `'full'`), `shadow` (`card | raised | floating`), `clip`, `aspect` (w/h), `dashed`.

Colours are token names from the app: `surface card ink body muted line control controlPressed onControl accent accentInk moneyIn moneyOut danger`, with an optional alpha like `'ink/5'` (= `bg-ink/5`), or a hex for a card colour. Tailwind class → token: `text-ink`→`ink`, `text-body`→`body`, `text-muted`→`muted`, `bg-control`→`control`, `text-on-control`→`onControl`, `border-line`→`line`, `bg-card`→`card`, `text-accent-ink`→`accentInk`, `text-danger`→`danger`.

### Components (`kit/components.mjs`) – all mirror a file under `src/components`

Typography: `Title(str, {align, flush})`, `Subtitle`, `Body`, `Strong`, `Quote`, `FieldLabel`, `Caption`, `Small`, `SectionHeading(str, {caption})`, `T(str, style)` for a one-off.

Controls: `Button(label, {variant:'primary'|'outline', disabled, leading})`, `ActionPill(label, {iconName})`, `ChoiceChips(options, value)`, `MultiChoiceChips(options, values, {emptyHint})`, `TogglePill(options, value)`, `SourceTiles(sources, value)`, `Switch(on)`, `TextField(label, {value, placeholder, optional, error, focused, password, multiline, trailing})`, `SearchField({value, placeholder})`, `SelectField(label, {value, placeholder, iconName, variant:'field'|'pill'})`, `OtpInput(value)`, `TextLink(label, {variant:'subtle', underline})`, `RangeDropdown(label)`, `ColorPicker(hex)`, `SliderRow(label, display, ratio, {minLabel, maxLabel, pressable})`, `Slider(ratio)`.

Rows/lists: `SettingsRow(title, {iconName, subtitle, value, toggle, chevron, destructive, last, artwork})`, `SettingsSection(title, rows)`, `DateGroupHeader(label, {total})`, `DateGroup(label, total, rows)`, `RowList(rows)` (inset dividers), `RowDivider()`, `TransactionRow(name, amount, {kindLabel, kind:'receipt'|'bill'|'income'|'payment', iconName})`, `LedgerRow(name, amount, {kindLabel, sourceLabel, kind, iconName})`, `BillRow(name, amount, {iconName, logo, recurrence, sourceLabel, dueDate})`, `SubscriptionRow(name, amount, {cycle, sourceLabel, renewsOn, active})`, `ReceiptRow(merchant, amount, {sourceLabel, date})`, `SkeletonRow()`, `Card(children, props)`, `ListNote(str)`.

Marks: `BrandMark(name, {size})` (monogram), `BillMark(iconName)`, `IconWell(iconName)`, `ProfileAvatar({size, avatar:true, label})`, `ProBadge()`, `GroupIcon(iconName, {bg, fg})`, `Person(name, {subtitle, accent, avatar})`.

Dashboard: `DashboardHeader(name, {avatar})`, `BalanceSummary({left, income, expenses, daysLeft, loading, error})`, `QuickActions()`, `DestinationList(items, {pro, loading})` + `DESTINATIONS`, `InsightBanner()`, `GettingStartedCard(steps)`, `DateSelector(weekday, date, {atLatest})`, `AmountTile(label, amount|undefined, artName)`, `PageState(artName, title, message, {action, secondary})`, `Illustration(artName, {ratio, maxW, aspect})`, `FeatureRow(artName, [copy nodes])`.

Cards: `CardFace({...})`, `PaymentCard({holder, network, balance, last4, color})`, `AccountCard({bankName, accountType, balance, last4, color})`.

Stepped flows: `StepHeader(title, steps, current)`, `StepQuestion(str)`, `StepFooter(label, {error, disabled, slot})`, `AmountFigure(value, {unit})`, `AmountKeypad()`, `AmountStep(value, {unit})`, `InlineCalendar({monthLabel, selected, today, firstWeekday, days, compact, showToday})`.

A StepFlow screen is: `screen({ id, name, children: [ C.StepHeader('New bill', 4, 1), C.StepQuestion('How much is it?'), <step body with flex: 1>, C.StepFooter('Continue') ] })` – no `back` (StepFlow draws its own chevron).

Transactions/calculators: `LedgerSummary({net, inTotal, outTotal, count})`, `FlowChart([{label, spent}])`, `ProportionBar(principal, interest)`, `ScheduleCard({interestShare, count})`.

Overlays: `ConfirmDialog(title, message, {actions:[{label, destructive}], cancel})`, `RangeMenu(options, value)`, `Sheet(children)`.

Chrome (drawn by `screen()` for you): `StatusBar`, `BackButton`, `TabBar`, `AddButton`.

### Rules

1. Read the route's source under `src/app` **and** every component it renders before writing the spec. Copy the real copy – headings, placeholders, captions, button labels, empty-state messages, microcopy – word for word. Copy the real spacing (`mt-*`, `gap-*`, `p-*`) and the real order of elements.
2. Use realistic sample data consistent with the rest of the kit: the user is **Sam**, cards are **Chase •••• 4421** (ink) and **Amex •••• 1002** (sky), account **Chase Checking •••• 1180**, salary **$4,200.00/month**, today is **Thursday 17 September 2026**. Merchants: Trader Joe's, Whole Foods, Netflix, Spotify, Shell, Electricity (AEP), Rent, T-Mobile.
3. Do not edit anything under `design/kit/`. If a component is missing, compose it from primitives inside your screen file (copy the measurements from the source) and say so in your report.
4. `node design/build.mjs` must print no `✗` lines for your screens. Then open `design/out/hifi/<id>.svg` and read it as text (or check `out/index.html`) for sanity: look for `…` (truncation), overlapping, or missing sections.
5. Pro-gated routes (`useProGate`) redirect to `/pro-feature` on the free plan; draw the Pro state of the screen itself, not the redirect.

## Getting it into Figma

**SVG (wireframes, hi-fi, dark):** in Figma, File → Import (or drag the `.svg` files onto the canvas). Each screen arrives as a 390-wide frame with editable vectors and text. Install the Poppins font (Google Fonts; Figma has it built in) so text renders in the right face. Import `_components.svg` the same way for the component sheet.

**HTML (auto layout):** install the free html.to.design plugin (Figma → Plugins → search "html.to.design"). Choose *Import from file*, pick a file under `out/html/` (or `out/html-dark/`), and it creates a frame with auto layout, text styles and vector icons. The frame is named after the screen. `_components.html` imports the whole component sheet in one go.

**Wireframes** are drawn in Helvetica greys on white with illustrations as crossed boxes, so they read as wireframes and not as the design.
