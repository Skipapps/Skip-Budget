# Monthly bills, Subscriptions and Payment history: build plan (Dmitri, 2026-10-12)

Brief: `bills-subs-pages-brief.md`. Designs 1–7 read. Builds on `past-and-upcoming-plan.md` (stopped/cancelled, the ledger
fix, payoffs). Read-only plan: no code was touched.

## 0. Facts the plan rests on (checked in the tree today)
- `useLedger(range, today)` (`src/api/queries.ts`) already lists a stopped bill's / cancelled subscription's recorded charges
  (`listRecorded`), payoffs as kind `'bill'` with `payoff` + `planId`, and skips a flag-off bill's projections. `allEntries` =
  whole window (figures), `entries` = from the free floor (rows). Amounts are negative (money out).
- **Recorded plans are projected from tomorrow** (`planOccurrences`: `dayAfter(today)`). A due-today charge exists in the
  ledger only once a recorder has written it (`refresh.ts` sweep on open, server cron). Loans count today's instalment as made
  (`loan.ts`: upcoming = date > today). So **"today" counts as Paid** everywhere in this plan (Founder Q1 confirms).
- `usePaymentSources()` returns only the *usable* sources on free (first card, first account). The current `bills.tsx` /
  `subscriptions.tsx` therefore label a charge on a locked second card "No payment method". **Our pages must label from every
  card and account** (`usePaymentLabels`, §1.2). The same bug may exist on other pages (CEO, §6).
- `expo-file-system` 57.0.5 is in node_modules and linked in `ios/Podfile.lock` (ExpoFileSystem), but only as `expo`'s own
  dependency, **not in package.json**. `expo-sharing` 57.0.14 is direct and linked, unused in src. `expo-print` is absent.
  Expo 57 docs: `Print.printToFileAsync({ html, width?, height?, margins? }) → { uri, numberOfPages, base64? }` (recommended
  `~57.0.2`); `Sharing.shareAsync(url, { mimeType?, UTI?, dialogTitle? })`; file-system `new File(Paths.cache, name)`,
  `.create({ overwrite })`, `.write(string)`, `.uri`.
- Typed routes are on (`app.json`): a new route file needs `.expo/types/router.d.ts` regenerated (a running Metro does it;
  otherwise `npx expo customize tsconfig.json`, as the i18n worktree did). Never hand-edit `.expo/types`.
- Guards that bite new files: `src/__tests__/large-text-guard.test.ts` (no numeric `maxFontSizeMultiplier`, no
  `numberOfLines={1}`, no `adjustsFontSizeToFit`: use `TEXT_CAP` roles and FitGroup/FitText), `no-route-test-files`
  (tests never under src/app), `src/i18n/messages.test.ts` (every key starts with its area), `src/data/pro-features.test.ts`
  (lists every feature id).
- Reusable as imports (never edited): `BillMark`, `BrandMark`, `recurrenceLabel` (bill-row), `cycleLabel` (subscription-row),
  `billPageHref`, `billStopped`, `countsInSpending`, `historyFloor`, `useHistoryFloor`, `useToday`, `usePro`, `useProGate`,
  `HistoryNotice`, `PageState`, `SkeletonList`, `Screen` (footer prop for pinned buttons), `InlineCalendar`, `CurrencyField`,
  `sumMoney`/`toCents`/`fromCents`, `matchesSearch`, `storeKey` (known-stores), `monthShort`/`monthLong`/`monthsShort`,
  `formatFullDate`, `formatCurrency`, `FailureLine`, `useNavigateOnce`, the paid-into pick pattern.

## 1. Data layer

**Decision: everything is built on `useLedger` (`allEntries`), no new read.** Two windows only:
- **Month window** (bills/subscriptions month page): `useLedger(monthBounds(month), today).allEntries`.
- **Payment window** (history, years, search, export): `useLedger({ from: paymentFloor(today), to: today }, today).allEntries`.
  `to = today` means nothing is projected forward. It is the same 7-year walk Home's "All" does. Dilip times it (§5 R2).
- Rows vs figures: figures use the whole window, rows use `listFloor` (free: `historyFloor(false)`; Pro: `paymentFloor`).
  We split ourselves rather than use `entries`/`hidden`, because Pro's floor here is Jan 1 (§2.13).
- A past date projected for a never-recorded plan is in the ledger (Home counts it), so it is a payment here too; the sweep
  turns it into a charge on open. "Only payments that happened" = `date <= today`.
- All money is summed in integer cents (`toCents`/`sumMoney`). Amounts are shown positive, in ink (the designs), never red.

### 1.1 Month view: `src/lib/bill-month.ts` (Drew; pure)
```ts
export type PlanKind = 'bill' | 'subscription';
export function monthOf(date: string): string;                      // '2026-10-12' → '2026-10'
export function monthBounds(month: string): { from: string; to: string }; // '2026-02' → 01..28/29
export function addMonths(month: string, n: number): string;
export function monthChoices(today: string, floor: string, ahead = 12): string[]; // monthOf(floor)..+ahead, newest first
export function daysUntil(date: string, today: string): number;    // Date.UTC on both strings: DST-proof
export function nextDueAfter(plan: {
  anchor: string | null; recurrence: Recurrence; startsOn?: string | null; createdAt?: string | null; endsOn?: string | null;
}, today: string): string | null; // first date > today inside billWindow, looking ≤ 400 days ahead; null if none

export type MonthOccurrence = {
  id: string; planId: string; date: string; amount: number /* positive */; sourceId: string /* '' = none */;
  label: string; paid: boolean /* date <= today */;
};
export type MonthStatus =
  | { kind: 'paid' }                                   // "✓ Paid"
  | { kind: 'next'; date: string; inMonth: boolean }   // "Next 22 Oct" | "Next 3 Mar 2027"
  | { kind: 'ends'; date: string }                     // running, no date left: "Ends 30 Oct 2026"
  | { kind: 'none' };
export type MonthPlanRow = {
  planId: string; kind: PlanKind; name: string; recurrence: string;
  amount: number;           // due plan: sum of its occurrences in the month; not due: its next payment's amount
  sourceId: string; categoryId: string | null; iconId: string | null; domain: string | null; logoHidden: boolean;
  href: Href;               // billPageHref / '/subscription/[id]'
  editHref: Href;           // "Add a card": /add-bill?id= | /add-loan?id= (loans category) | /add-subscription?id=
  occurrences: MonthOccurrence[]; // oldest first, [] when not due
  status: MonthStatus;
};
export type StoppedPlanRow = Omit<MonthPlanRow, 'occurrences' | 'status' | 'editHref'> & {
  stoppedOn: string | null;   // bill: ends_on
  lastCharged: string | null; // subscription: newest charge date
};
export type PlanMonth = {
  month: string; when: 'past' | 'current' | 'future';
  total: number;            // sum of every occurrence in the month (cent-exact)
  planCount: number;        // n: plans with ≥1 occurrence in the month
  paidCount: number;        // p: of those, every occurrence paid
  comingCount: number;      // c = n − p
  next: MonthOccurrence | null; // earliest unpaid in the month
  comingUp: MonthOccurrence[];  // unpaid, date asc, then name, then id
  rows: MonthPlanRow[];     // All bills: due plans by first date in month; then running not-due plans by next date
  stopped: StoppedPlanRow[];// stopped/cancelled plans with NO occurrence in the month, newest stop first
};
export function planMonth(input: {
  kind: PlanKind; month: string; today: string;
  entries: readonly Pick<LedgerEntry, 'id' | 'date' | 'amount' | 'kind' | 'planId' | 'sourceId' | 'label' | 'payoff'>[];
  bills: readonly BillRow[]; subscriptions: readonly SubscriptionRow[];
  lastCharged: ReadonlyMap<string, string>; // subscription id → newest charged_on
}): PlanMonth;
export function lastChargedBy(charges: readonly ChargeRow[]): Map<string, string>;
```
Rules:
- Occurrences = month-window entries of `kind`, with a `planId`, **without `payoff`**. A payoff is never "due".
- A plan is listed under All bills when it has an occurrence in the month (stopped or not: Founder Q3), or when it is running
  (bill: `countsInSpending && !billStopped`; subscription: `active && next_renewal_on`) and not due (status Next/Ends).
- Stopped section: `countsInSpending` bills with `billStopped`, and `!active` subscriptions, that have no occurrence in the
  month. A flag-off loan is never in Stopped or in All bills (unless it has a recorded charge that month).
- Status: all occurrences paid → paid. One unpaid → `next` with the first unpaid date (`inMonth: true`). Not due →
  `nextDueAfter(...)` (`inMonth: false`), else `ends` with `ends_on`, else `none`.
- `when` compares `month` with `monthOf(today)`. A past month is all paid and a future month all unpaid, because of the date
  rule alone. There is no special case.

### 1.2 Payments: `src/lib/payment-entries.ts` + `src/api/payment-labels.ts` (Diego)
```ts
export type PaymentKind = 'bill' | 'subscription';
export type PaymentKindFilter = 'all' | PaymentKind;
export type PaymentStatus = 'paid' | 'paidOff' | 'extraPayment';
export type PaymentEntry = {
  id: string; date: string; name: string /* as recorded */; planName: string | null /* plan's current name */;
  amount: number /* positive */; kind: PaymentKind; status: PaymentStatus; sourceId: string /* '' = Card not set */;
  planId: string | null; categoryId: string | null; iconId: string | null; domain: string | null; logoHidden: boolean;
};
export function paymentEntries(entries: readonly LedgerEntry[],
  plans: { bills: readonly Pick<BillRow, 'id' | 'name'>[]; subscriptions: readonly Pick<SubscriptionRow, 'id' | 'name'>[] },
  today: string): PaymentEntry[];          // kind bill|subscription, date <= today, newest first (date desc, id)
export function ofKind<T extends { kind: PaymentKind }>(rows: readonly T[], kind: PaymentKindFilter): T[];
export function paymentHref(p: PaymentEntry): Href | null; // payoff → /loan/[id]; bill → billPageHref; sub → /subscription/[id]
export function parseKind(v: unknown, fallback: PaymentKindFilter): PaymentKindFilter;
export function parseYear(v: unknown, today: string, floor: string): number;        // clamps; bad → this year
export function parseMonth(v: unknown, today: string, floor: string, ahead = 12): string;

// src/api/payment-labels.ts
export function usePaymentLabels(): {
  sources: PaymentSourceRow[];             // EVERY card then every account (cardSource/accountSource), locked ones too
  labelOf: (id: string) => string | null;  // null → "Card not set"
  isLoading: boolean; isError: boolean; refetch: () => void;
};
```

### 1.3 Years: `src/lib/payment-years.ts` (Drew; pure, cents)
```ts
type Paid = { date: string; amount: number };
export function paymentFloor(today: string): string;       // `${year − (PRO_HISTORY_YEARS − 1)}-01-01` (Founder Q2)
export function isProOnlyYear(year: number, listFloor: string): boolean; // `${year}-12-31` < listFloor
export function avgMonths(year: number, today: string, first: string | null): number;
export function averageCents(totalCents: number, months: number): number; // half away from zero, integers only; 0 if months 0
export function yearSummary(all: readonly Paid[] /* whole window, one kind filter */, year: number, today: string): {
  year: number; total: number; count: number; average: number; months: number;
  bars: number[] /* 12 month totals */; highlight: number | null /* this month's index on this year, else null */;
};
export function monthGroups<T extends Paid>(yearRows: readonly T[] /* whole year */, listFloor: string): {
  month: string; total: number /* whole month: a figure */; count: number; rows: T[] /* date >= listFloor, newest first */;
}[]; // newest month first; only months with ≥1 visible row
export function hidesOlder(rows: readonly Paid[], listFloor: string): boolean;
export function yearsList(all: readonly Paid[], today: string, listFloor: string): {
  first: number | null; total: number; count: number;
  years: { year: number; total: number; count: number; proOnly: boolean }[]; // newest first; this year always present
};
```
**Avg / month rule:**
- Average = round(year total ÷ months). The months run from the first month that has a payment (of the kind shown, in the
  window) if that month falls in this year, else from January. They run to this month for this year, else to December.
- Design check: 18,548.81 ÷ 10 = 1,854.881, which shows as $1,854.88.
- Past year, first payment 9 May: ÷ 8. A year with no payments: $0.00.
- The rounding is cents half away from zero, done on integers: `floor((2·|c| + m) / (2·m))`.
- Bars: 12 totals. Future months of this year are 0 and drawn flat. The highlight is this month on this year, none on a past
  year.

### 1.4 Search: `src/lib/payment-search.ts` + `src/api/payment-searches.ts` (Diego)
```ts
export type DateRangeChoice = 'any' | 'thisMonth' | 'last3Months' | 'thisYear' | 'lastYear' | { from: string; to: string };
export type PaymentFilters = { range: DateRangeChoice; minCents: number | null; maxCents: number | null;
                               source: string | null /* null = all accounts, '' = Card not set */ };
export const NO_FILTERS: PaymentFilters;
export function activeFilterCount(f: PaymentFilters): number;
export function rangeBounds(r: DateRangeChoice, today: string): { from: string | null; to: string | null };
  // thisMonth 1st..today · last3Months 1st of (month−2)..today · thisYear Jan 1..today · lastYear whole previous year
export function matchesPayment(p: Pick<PaymentEntry, 'name' | 'planName'>, query: string): boolean;
  // matchesSearch(name) || matchesSearch(planName): finds charges recorded under an old name
export function searchPayments<T extends PaymentEntry>(all: readonly T[],
  o: { query: string; kind: PaymentKindFilter; filters: PaymentFilters; today: string }): T[]; // newest first
export function searchGroups<T extends PaymentEntry>(matches: readonly T[], listFloor: string, expanded: boolean): {
  count: number; total: number /* whole */; span: { first: number; last: number } | null;
  groups: { year: number; total: number; count: number; rows: T[] }[];  // years with visible rows, newest first
  folded: { newest: number; oldest: number; count: number /* visible rows folded */ } | null;
  hiddenOlder: boolean;
};
```
- **Matching:** `matchesSearch` fits. It lower-cases, ignores accents and allows a few typos. Results appear when the trimmed
  query is not empty or a filter is set.
- **Fold:**
  - The two newest years that have visible rows are shown in full.
  - Any older ones fold into one row, "{newest} – {oldest} · {n} more". Tapping it opens them in place; it is not a new page.
  - Year headers ("$159.90 · 10") and "{n} results · {first} – {last}" are figures, so they count every match, hidden ones too.
  - Rows stop at `listFloor`. `hiddenOlder` shows the HistoryNotice.
- **Amounts:** min/max are compared in cents and are inclusive. Source '' matches rows with no source.

Recent searches (on the phone, the `known-stores` way):
```ts
export const RECENT_CAP = 10; export const RECENT_SHOWN = 5;
export function rememberQuery(list: readonly string[], q: string): string[]; // trimmed; dedupe by storeKey; newest first; cap
export function forgetQuery(list: readonly string[], q: string): string[];
export function useRecentSearches(): { recent: string[]; remember: (q: string) => void; forget: (q: string) => void };
export async function forgetRecentSearches(userId: string | null | undefined): Promise<void>;
```
- AsyncStorage key `skip.paymentSearches.<userId>`, required lazily, never throws, one write at a time.
- Saved on keyboard Search and when a result is opened, never per keystroke.
- Removing one (×) has no toast (it is not money data).
- Clearing on sign-out is one line in `auth.ts` at the swap (CEO Q).

### 1.5 Hooks: `src/api/payment-ledger.ts` (Diego)
```ts
export function usePayments(today: string): {
  payments: PaymentEntry[];  // paymentFloor(today)..today, bills + subscriptions + counted payoffs, newest first: FIGURES
  listFloor: string;         // free: historyFloor(false, today) ; Pro/unknown: paymentFloor(today): ROWS from here
  free: boolean;             // useKnownFree (unknown reads as Pro: nobody who paid sees the free view flash)
  labelOf: (id: string) => string | null; sources: PaymentSourceRow[];
  isLoading: boolean; isError: boolean; refetch: () => void;
};
export function usePlanMonth(kind: PaymentKind, month: string, today: string): {
  view: PlanMonth; hasPlans: boolean /* any bill (countsInSpending) / any subscription at all, stopped included */;
  labelOf: (id: string) => string | null;
  isLoading: boolean; isError: boolean; refetch: () => void;
};
```
`isError` = the ledger's `isError` OR the cards/accounts reads. A missing label must not read as "Card not set".

### 1.6 Export (Dilip)
`src/lib/payment-export.ts` (pure):
```ts
export type ExportRow = { date: string; name: string; kind: string; amount: number; paidFrom: string };
export type ExportWords = { date: string; name: string; kind: string; amount: string /* "Amount (USD)" */;
  paidFrom: string; title: string; scope: string; total: string; made: string };
export function exportRows(rows: readonly PaymentEntry[], o: { labelOf: (id: string) => string | null;
  kindWord: Record<'bill' | 'subscription' | 'paidOff' | 'extraPayment', string>; notSet: string }): ExportRow[];
export function paymentsCsv(rows: readonly ExportRow[], w: ExportWords): string;
export function paymentsHtml(rows: readonly ExportRow[], w: ExportWords,
  o: { money: (n: number) => string; date: (iso: string) => string }): string;
export function exportFileName(o: { kind: PaymentKindFilter; year: number | 'all'; ext: 'csv' | 'pdf' }): string;
  // skip-payments-2026.csv · skip-bills-2026.pdf · skip-subscriptions-all-years.csv
```
- **CSV:**
  - Columns: date (yyyy-mm-dd), name, kind, amount, paid from. Kind is Bill / Subscription, or the payoff's own word.
  - UTF-8 BOM, CRLF, RFC 4180 quoting. Plain amount "1035.00" from cents: dot, no grouping, no symbol. The currency code
    is in the header.
  - Formula-injection guard: a cell starting `= + - @` or a tab/CR is prefixed with `'`.
  - Header words are in the app's language.
- **PDF HTML:**
  - Title, scope line and table. Month subtotals and the grand total come from `sumMoney`.
  - Every name is HTML-escaped. System font, light only, no images.
- **Rows:** the current view's rows. On Pro that is all rows: export is Pro, so nothing is hidden.

`src/api/payment-export.ts`:
```ts
export async function sharePayments(o: { format: 'csv' | 'pdf'; fileName: string; csv?: string; html?: string;
  dialogTitle: string }): Promise<'shared' | 'unavailable'>;
```
- **CSV:** `new File(Paths.cache, fileName)`, then `.create({ overwrite: true })` and `.write(csv)`. Share with
  `shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' })`.
- **PDF:** `Print.printToFileAsync({ html, margins })`, copied to `Paths.cache/fileName`, then shared with
  `{ mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }`.
- `isAvailableAsync()` false gives 'unavailable'. Throws reach the caller, which shows the one failure line.
- Dilip checks each call against the v57 docs (File copy/move options, UTI strings) before writing it.

## 2. Edge cases: exact expected behaviour (each one is a fixture in the owner's test)
1. **Bill moved mid-month.** The month shows the ledger's dates, which keep one date per cycle (`floorAfterCharges`,
   `charges_one_per_cycle`).
   - Rent due on the 28th, charged 28 Sep, moved to the 1st on 5 Oct: October has 1 Oct, Paid (recorded by the sweep). There
     is no 28 Oct; November has 1 Nov.
   - Moved the other way (1st → 28th on 5 Oct after 1 Oct was charged): October has 1 Oct only, Paid; November has 28 Nov.
   - The month view never dedupes. A double would be a ledger bug, and the test asserts exactly one.
   - Before the sweep has written 1 Oct, October shows the bill as "Next 1 Nov 2026" (R1).
2. **Starting or stopping mid-month.**
   - Starts 15 Oct: only dates on or after 15 Oct. A start in the past fills earlier dates as paid.
   - Stops 12 Oct (`ends_on`): dates up to 12 Oct only. It stays under All bills in October as Paid (Q3) and moves to
     Stopped from November ("Stopped on 12 Oct 2026").
3. **Weekly bill.**
   - Every weekly date in the month (4 or 5), stepped from its anchor.
   - One All bills row, whose amount is the month's sum. Counted once in n.
   - Each unpaid date is its own Coming up row.
   - ✓ Paid only when every date is on or before today, else "Next {first unpaid}".
4. **Yearly bill not due this month.** It is not in the figure or in n. It is listed after the due plans: "Next 3 Mar 2027",
   with its per-payment amount. A quarterly bill works the same in its off months.
5. **Cancelled subscription.**
   - Never projected; never in Coming up; no Add a card.
   - A charge it had in the month counts and is listed Paid (Q3). Otherwise it is in the Cancelled section as "Cancelled ·
     last charged 9 Oct 2026", or just "Cancelled" if it never charged.
   - Its row opens `/subscription/[id]`, which is read-only.
6. **Stopped loan:** as a stopped bill. The row opens `/loan/[id]`. Its instalments and payoffs stay in history.
7. **Payoff.**
   - History, search and export only. Status "Paid off" (full) or "Extra payment" (partial). It counts in year totals,
     count, bars, average and month groups.
   - Never in the month figure, n/p/c, rows or Coming up.
   - An uncounted payoff (loan kept out, or before the add day) is absent everywhere, as in the ledger.
8. **No Paid with.**
   - All bills: "{Recurrence} · Add a card". The plum link is its own target (≥44pt via hitSlop) plus a VoiceOver custom
     action "Add a card" on the row. It goes to `editHref`.
   - Coming up: "{d MMM} · Card not set", with no link.
   - History, search and export: "Card not set". That includes a charge whose card was deleted later.
   - Stopped rows: no link.
9. **Timezone / day boundary.**
   - `today` comes from `useToday()`: the device's local yyyy-mm-dd, re-checked on resume and once a minute.
   - All comparisons are on date strings. Months are string slices. `daysUntil` is a Date.UTC difference.
   - A payment dated today is Paid. At midnight the page re-renders: the item moves from Coming up to paid, "in 1 day"
     becomes "Tomorrow" for the next one, and on 1 Jan "This year" moves on.
   - Tests run under `TZ=Pacific/Kiritimati` and `America/Los_Angeles`, across 25 Oct (FR) and 1 Nov (US) DST.
10. **Free floor mid-month / mid-year** (today 12 Oct 2026, floor 15 Jul 2026).
    - History 2026: total, count, average and bars are whole-year.
    - Groups Oct, Sep, Aug and Jul are drawn. July's header total is all of July; its rows run 15–31 Jul. One HistoryNotice
      follows, at the bottom. Jan–Jun are not drawn.
    - 2025 on free gets the Pro badge in Choose year and All years. It opens with its figures; the rows are replaced by the
      HistoryNotice.
    - Month picker on free: Jul 2026 to Oct 2027, with no badges. Footer: "See older months with Pro".
    - The month page for July on free shows full figures and plan rows (plans are not history).
    - Search on free: whole counts and totals, rows from 15 Jul, and the HistoryNotice when older matches exist.
11. **Empty account.**
    - No plans at all: the existing art, "No bills yet" and "Add a bill" (same for subscriptions).
    - Plans but nothing due this month: the card shows $0.00 and "Nothing due in October". No Next, no Coming up.
    - History: $0.00, Payments 0, Avg $0.00, flat bars, and the line "No payments in 2026 yet".
    - Choose year: This year and All years (2026). All years: "Paid since 2026", "0 payments · 1 year" and one 2026 card.
    - Export: shows "Nothing to export for 2026." with both buttons disabled.
12. **First payment mid-year.** The average divides by the months from the first payment's month (§1.3): first payment 9 May
    2026 and today 12 Oct gives ÷ 6. A payment on 31 Dec at 23:30 local is December (string date).
13. **7-year floor.** The payment pages read from 1 Jan of (this year − 6): 1 Jan 2020 today.
    - Pro sees 2020–2026, 7 cards, as the design shows. The month picker on Pro starts in Jan 2020.
    - The ledger keeps back to 12 Oct 2019. That partial 2019 is not shown here (Founder Q2).
    - On 1 Jan 2027, 2020 drops off.
14. **Loan kept out of bills** (`countsInSpending` false): not in the month page. Its charges recorded before the switch was
    turned off stay in history and figures, as the ledger has them.
15. **Amount changed mid-month:** past dates show the recorded amount and future dates the new one. The figure and the row are
    their sum.
16. **Renamed plan:** history shows the name as recorded. Search finds both names.
17. **Loan override months (R6):** future months use the level amount, so they are not statement-exact for override months
    (existing, on the backlog).

## 3. Tasks (each ≤ ~½ day, one owner, new files only, own tests in `src/__tests__/payments/`)

Gates per task:
- tsc 0, with typed routes regenerated.
- `rm -rf .expo/cache/eslint && npx eslint --no-cache --max-warnings 0 <files>`.
- `npx prettier --check <files>`.
- Jest green on own suites plus the guards.
- en/es/fr present.
- Dmitri review.

**Wave 1: start now, all parallel**

| ID | Owner | Creates | Notes |
|---|---|---|---|
| P1 | Drew | `src/lib/bill-month.ts`, `src/__tests__/payments/bill-month.test.ts` | §1.1. Fixtures: design Oct 2026 bills $1,884.00 · 4 · 2 paid · 2 coming · Next AEP 22 Oct (today 12 Oct); subs $38.98 · 3 · 2 · 1 · Next iCloud+ 15 Oct; edge cases 1–9, 11, 14, 15; TZ runs. |
| P2 | Diego | `src/lib/payment-entries.ts`, `src/api/payment-labels.ts`, tests `payment-entries.test.ts`, `payment-labels.test.tsx` | §1.2. Locked 2nd card labelled; payoff status; href per kind; param parsers clamp. |
| P3 | Dana | `src/i18n/messages/payments.ts` (ALL keys in §4, en/es/fr) + 3 lines in `src/i18n/messages/index.ts` (import, area, spread); `src/lib/payment-pick.ts`; `src/components/payments/{plum-card,chip-button,kind-tabs,pro-badge,pro-footer,section-card,search-button,choice-list}.tsx`; tests `payment-pick.test.ts`, `payment-parts.test.tsx` | Single writer of `payments.ts`: others ask Dana for a new word. `payment-pick.ts` = the paid-into pattern: `pickPayment({ owner, type: 'month' \| 'year' \| 'filters', ... })` + `onPaymentPicked`. Tabs: `tablist`/`tab` roles + selected state. Chips/tabs wrap at large text. |
| P4 | Dilip | `src/data/pro-features.ts` (+`export`, icon `FileDown`; points `FileSpreadsheet`, `FileText`, `CalendarRange`), `src/i18n/messages/pro.ts` (`pro.export.*`), `src/data/pro-features.test.ts` (+ id), `src/components/payments/use-export.ts`, test `use-export.test.tsx` | `useExport()` → `open({ kind, year })`. Not ready: nothing happens. Free: `/pro-feature?id=export`. Pro: `/payment-export`. |
| P5 | Dilip | `src/lib/payment-export.ts`, `src/__tests__/payments/payment-export.test.ts` | §1.6 pure. Covers quoting, BOM, injection, cents ("0.10", "1035.00", 10.075 → "10.08"), escaping, and subtotals equal to `sumMoney`. |
| P6 | Dilip | `package.json`, `package-lock.json`, `ios/Podfile.lock` (+ pod-generated ios files) | **Isolated; only after the CEO clears it with the other sessions.** `npx expo install expo-print expo-file-system` (the latter only makes the existing 57.0.5 dependency direct). pod install via the ~/.gem pod with a UTF-8 locale. Verify ExpoPrint in Podfile.lock and in the built artifact, then a Release compile. No JS. |

**Wave 2: each starts when its inputs land (parallel across owners)**

| ID | Owner | After | Creates | Notes |
|---|---|---|---|---|
| P7 | Drew | P1 | `src/lib/payment-years.ts`, tests `payment-years.test.ts`, `payment-cross-check.test.ts` | §1.3 + edge cases 10, 12, 13. Design fixture: 2026 $18,548.81 · 67 · avg $1,854.88 · Oct $1,205.99 · Sep $1,922.98; Netflix 2025 $191.88 · 12. Cross-check: every past month's `planMonth.total` + that month's payoffs = the `monthGroups` total (bills tab), to the cent. A scratchpad script recomputes the demo seed's yearly sums from `supabase/seed/demo-sam.sql` (never the live DB). |
| P8 | Diego | P2 | `src/lib/payment-search.ts`, `src/api/payment-searches.ts`, tests `payment-search.test.ts`, `payment-searches.test.tsx` | §1.4. Design fixture: "netflix" gives 62 results · 2021 – 2026, 2026 $159.90 · 10, 2025 $191.88 · 12, "2024 – 2021 · 40 more". Free hidden matches. Storage refusal reads as empty. |
| P9 | Dana | P1, P3 | `src/components/payments/{plan-month-screen,month-card,coming-up-row,plan-month-row,stopped-row}.tsx`, test `plan-month-parts.test.tsx` | `PlanMonthScreen({ kind })`, the whole page, swapped in at P23. Builds against P1 types with a mocked hook, then wires P10. Header: Search (`/payment-search?kind=`) and Plus. "See payment history ›". |
| P10 | Diego | P1, P2, P7 | `src/api/payment-ledger.ts`, test `payment-ledger.test.tsx` | §1.5. Free/Pro/unknown floors, isError from labels, refetch fans out, memo stable. |
| P11 | Dilip | P5, P6 | `src/api/payment-export.ts`, test `payment-export-api.test.ts` | §1.6 with mocked expo-print / file-system / sharing. Also a node timing of `usePayments`' derivation on a synthetic 7-year account (R2). |

**Wave 3: screens. Dana's are sequential. Theo trails each one. Diego's P17 and Dilip's P18 run in parallel with Dana.**

| ID | Owner | After | Creates |
|---|---|---|---|
| P12 | Dana | P9, P10 | `src/app/payment-month.tsx` |
| P13 | Dana | P7, P10 | `src/components/payments/{history-card,month-bars,payment-row,history-list}.tsx`, test `history-parts.test.tsx` |
| P14 | Dana | P13 | `src/app/payment-history.tsx` |
| P15 | Dana | P14 | `src/app/payment-year.tsx`, `src/app/payment-years.tsx`, `src/components/payments/year-card.tsx` |
| P16 | Dana | P8, P13 | `src/app/payment-search.tsx`, `src/components/payments/{search-input,recent-searches,filter-rows,search-results}.tsx` |
| P17 | Diego | P3, P8 | `src/app/payment-filter.tsx`, `src/components/payments/{date-range-filter,amount-filter,paid-from-filter}.tsx`, test `payment-filters.test.tsx`. Diego takes these to shorten Dana's chain: they are range bounds, cent parsing and a source list on Dana's `choice-list`. |
| P18 | Dilip | P4, P11, P13 | `src/app/payment-export.tsx` (`useProGate('export')`), `src/components/payments/export-choices.tsx`, test `payment-export-page.test.tsx` |
| P19 | Theo | P9, P12 | `src/__tests__/payments/plan-month-screen.test.tsx`, `payment-month-route.test.tsx` |
| P20 | Theo | P14, P15 | `payment-history-screen.test.tsx`, `payment-years-screens.test.tsx` |
| P21 | Theo | P16, P17 | `payment-search-screen.test.tsx`, `payment-filter-screen.test.tsx` |
| P22 | Theo | P18 | `payment-export-screen.test.tsx` |

Theo's screen tests cover every page in:
- light and dark;
- en/es/fr;
- large text, with the pinned footer reachable;
- VoiceOver labels and roles, and the "Add a card" custom action;
- free vs Pro: badge, HistoryNotice, footer → `/pro-feature?id=history`, export → `/pro-feature?id=export`;
- loading, error with Try again, and empty.

**Wave 4: the swap. Only after the Loans session says its hunks are committed and the CEO says go.**

| ID | Owner | Edits |
|---|---|---|
| P23 | Dana | `src/app/bills.tsx` → `<PlanMonthScreen kind="bill" />` (optional `month` param); `src/app/subscriptions.tsx` → `kind="subscription"`; `src/app/settings/your-money.tsx` → `/bills`, `/subscriptions`; `src/app/bill-plans.tsx` / `subscription-plans.tsx` → `<Redirect>` to the new pages; `src/__tests__/large-text-guard.test.ts` (drop the two ALLOWED rows those files no longer need) |
| P24 | Diego | `src/api/auth.ts` (+`forgetRecentSearches` beside `forgetKnownStores`), `src/api/auth.test.ts` (mock line). Needs the CEO's OK. |
| P25 | Theo | Rewrite the suites that render the old pages: `bills-i18n`, `subscriptions-i18n`, `charges-edit`, `bills-spending-flag`, `stopped-plans`, `settings` (all in `src/__tests__/app/`) |
| P26 | Dmitri → CEO | Full review and gates. Then Dilip's Release build to the 13 Pro Max for the Founder. |

Later, only after the Founder approves:
- Archive `bill-filter-sheet`, `subscription-filter-sheet` and the unused `bills.charged/plans.*` and
  `subscriptions.renewals/plans.*` keys to the dated archive folder.
- This is a separate CEO call.

Critical path: P1 → P7 → P10 → P13 → P14 → P15/P16 → P23, about 4½ days of Dana-and-Diego time if every hand-off lands the same
day.

## 4. Routes, params, i18n

**Routes (final):**
- `/bills?month=yyyy-mm` and `/subscriptions?month=yyyy-mm` (after the swap; month optional, clamped).
- `/payment-month?kind=bill|subscription&owner=<id>&selected=yyyy-mm`. Picking hands the month back and goes back.
- `/payment-history?kind=all|bill|subscription&year=YYYY` (year omitted = this year).
- `/payment-year?kind=…&owner=<id>&selected=YYYY`. "All years" does `router.replace` to `/payment-years?kind=…&owner=<id>`.
- `/payment-years?kind=…[&owner=<id>]`:
  - With `owner`, a year hands back and goes back to the history under it.
  - Without `owner`, a year pushes `/payment-history?year=`.
- `/payment-search?kind=…`
- `/payment-filter?type=date|amount|from&owner=<id>&…current` (date: `range`/`from`/`to`; amount: `min`/`max` in cents;
  from: `source`).
- `/payment-export?kind=…&year=YYYY|all` (Pro gate inside).
- `/pro-feature?id=export` (new) and `/pro-feature?id=history` (existing).
- `owner` comes from `useId()` on the opener. A pick with no listener goes nowhere.

**Namespace `payments.*`.** Dana writes es/fr in P3. Plurals are `{ one, other }`. Status words are drawn without the ✓;
VoiceOver reads "Paid".

| key | en |
|---|---|
| payments.month.dueIn | Due in {month} |
| payments.month.chipA11y | Showing {month}. Choose another month |
| payments.month.counts.bill | one: {count} bill · {paid} paid · {coming} coming up / other: {count} bills · {paid} paid · {coming} coming up |
| payments.month.counts.subscription | one: {count} subscription · {paid} paid · {coming} coming up / other: {count} subscriptions · … |
| payments.month.nothingDue | Nothing due in {month} |
| payments.month.next | Next: {name} · {date} |
| payments.month.cardA11y | Due in {month}: {amount}. {counts}. {next} |
| payments.month.comingUp | Coming up |
| payments.month.allBills | All bills |
| payments.month.allSubscriptions | All subscriptions |
| payments.month.stopped | Stopped |
| payments.month.cancelled | Cancelled |
| payments.month.seeHistory | See payment history |
| payments.month.search | Search payments |
| payments.pill.tomorrow | Tomorrow |
| payments.pill.inDays | one: in {count} day / other: in {count} days |
| payments.status.paid | Paid |
| payments.status.next | Next {date} |
| payments.status.ends | Ends {date} |
| payments.status.paidOff | Paid off |
| payments.status.extraPayment | Extra payment |
| payments.addCard | Add a card |
| payments.addCardHint | Choose how {name} is paid |
| payments.cardNotSet | Card not set |
| payments.row.a11y | {name}, {amount}, {date}, {source}, {status} |
| payments.planRow.a11y | {name}, {amount}, {recurrence}, {source}, {status} |
| payments.comingRow.a11y | {name}, {amount}, due {date}, {when}, {source} |
| payments.picker.monthTitle | Choose month |
| payments.picker.thisMonth | This month |
| payments.picker.olderMonthsPro | See older months with Pro |
| payments.learnMore | Learn more |
| payments.history.title | Payment history |
| payments.history.export | Export CSV or PDF |
| payments.history.exportA11y | Export payments |
| payments.history.thisYear | This year |
| payments.history.yearChipA11y | Showing {year}. Choose another year |
| payments.tabs.all | All |
| payments.tabs.bills | Bills |
| payments.tabs.subscriptions | Subscriptions |
| payments.history.paidIn | Paid in {year} |
| payments.history.payments | Payments |
| payments.history.avg | Avg / month |
| payments.history.cardA11y | Paid in {year}: {amount}. {count} payments. Average {avg} a month. |
| payments.history.barsA11y | By month: {list} |
| payments.history.barA11y | {month} {amount} |
| payments.history.monthA11y | {month}, {amount} paid |
| payments.history.none | No payments in {year} yet |
| payments.pro.years | one: See up to {count} year with Pro / other: See up to {count} years with Pro |
| payments.pro.badge | Pro |
| payments.pro.yearA11y | {year}, older history with Pro |
| payments.year.title | Choose year |
| payments.year.thisYear | This year |
| payments.year.allYears | All years |
| payments.year.span | {first} – {last} |
| payments.years.title | All years |
| payments.years.paidSince | Paid since {year} |
| payments.count | one: {count} payment / other: {count} payments |
| payments.years.count | one: {count} year / other: {count} years |
| payments.years.rowA11y | {year}, {count}, {amount} |
| payments.search.placeholder | Search payments |
| payments.search.cancel | Cancel |
| payments.search.recent | Recent |
| payments.search.removeRecent | Remove {query} |
| payments.search.filters | Filters |
| payments.search.dateRange | Date range |
| payments.search.anyTime | Any time |
| payments.search.amount | Amount |
| payments.search.anyAmount | Any amount |
| payments.search.paidFrom | Paid from |
| payments.search.allAccounts | All accounts |
| payments.search.footerPro | one: Search across up to {count} year of payments. / other: Search across up to {count} years of payments. |
| payments.search.footerFree | Search your last {days} days of payments. Pro searches up to {years} years. |
| payments.search.results | one: {count} result · {span} / other: {count} results · {span} |
| payments.search.yearTotal | {amount} · {count} |
| payments.search.more | {newest} – {oldest} · {count} more |
| payments.search.noMatches | No matches? Try a shorter word or another year. |
| payments.search.nothing | No payments match |
| payments.search.clearFilters | Clear filters |
| payments.range.thisMonth | This month |
| payments.range.last3Months | Last 3 months |
| payments.range.thisYear | This year |
| payments.range.lastYear | Last year |
| payments.range.custom | Pick dates |
| payments.range.from | From |
| payments.range.to | To |
| payments.range.span | {from} – {to} |
| payments.amount.min | At least |
| payments.amount.max | At most |
| payments.amount.atLeast | {amount} or more |
| payments.amount.atMost | Up to {amount} |
| payments.amount.between | {min} – {max} |
| payments.amount.order | The smaller amount must come first. |
| payments.filter.apply | Show payments |
| payments.filter.clear | Clear |
| payments.export.title | Export |
| payments.export.summary | {count} · {scope} |
| payments.export.allYears | All years |
| payments.export.csv | CSV |
| payments.export.csvHint | For Numbers, Excel or Google Sheets |
| payments.export.pdf | PDF |
| payments.export.pdfHint | A statement to print or send |
| payments.export.busy | Preparing… |
| payments.export.none | Nothing to export for {scope}. |
| payments.export.col.date | Date |
| payments.export.col.name | Name |
| payments.export.col.kind | Kind |
| payments.export.col.amount | Amount ({currency}) |
| payments.export.col.paidFrom | Paid from |
| payments.export.kind.bill | Bill |
| payments.export.kind.subscription | Subscription |
| payments.export.total | Total |
| payments.export.made | Made with Skip Budget on {date} |

Also reused by import only:
- Empty states: `bills.noBillsYet`, `bills.plans.emptyMessage`, `bills.addABill`, `subscriptions.noSubscriptionsYet`,
  `subscriptions.plans.emptyMessage`, `subscriptions.addASubscription`.
- Stopped rows: `bills.stoppedOn`, `bills.stopped`, `subscriptions.cancelledLastCharged`, `subscriptions.cancelledLastChargedA11y`,
  `subscriptions.cancelled`.
- Recurrence words: `recurrenceLabel` / `cycleLabel`.
- Other: `common.tryAgain`, `pro.history.notice.*`.

The swap must not delete these keys.

**Pro explainer (`pro.ts`, Dilip, en; es/fr by Dilip):**
- `pro.export.example` "Payment history 2026.pdf"
- `pro.export.title` "Export your payments"
- `pro.export.subtitle` "Every bill and subscription payment, as a spreadsheet or a PDF."
- `pro.export.a` "CSV for Numbers, Excel or Google Sheets"
- `pro.export.b` "A PDF statement to print or send"
- `pro.export.c` "Any year, up to 7 years back"

## 5. Risks
- **R1. Today's due can be missing until the sweep records it.**
  - Cause: the ledger projects recorded plans from tomorrow, so between midnight and the sweep a bill due today has no row.
  - Effect: it reads "Next {date next month}" and is not in the figure.
  - The sweep runs on open, so this is usually seconds. Pull-to-refresh refetches but does not sweep. This is existing
    behaviour and affects Home too. CEO call whether to fix it in the ledger (Loans-owned file).
- **R2. 7-year ledger walk on every payment page.** Dilip measures it in node (P11), then on the Release build. If it is slow,
  memoise the derivation at module level, keyed by the query data's identity, inside `payment-ledger.ts`.
- **R3. Built on the Loans session's uncommitted hunks.** If `listRecorded`, `payoff`, `billStopped` or the stopped/cancelled
  key words change before their commit, P1/P2/P10 tests break. Diego re-checks at P23.
- **R4. expo-print is a new native module:** pod install plus a Release build. The share sheet is proven only on the phone.
- **R5. The swap breaks six old suites (P25).** It also needs typed routes regenerated and the large-text guard edited.
- **R6. Free counts include hidden rows** (Founder rule 1). "62 results" with 3 rows is explained by the HistoryNotice.
- **R7. Loan override months are not statement-exact (R6 backlog).** A payoff lands in that month's Bills history total, so it
  also differs from the month page figure by design: payoffs are not "due".

## 6. Questions

**Founder (real blockers; we build the default unless told otherwise):**
1. **A bill due today.** Default: it counts as **Paid**. The app records it that day, Home counts it, history lists it, and
   loans already count today's instalment as made. The "Today" pill is therefore never shown; Coming up starts tomorrow.
   - The alternative: keep it in Coming up as "Today" until the day ends. History and Home would then disagree with the
     page for a day.
2. **How far back.** Default: the payment pages show **7 calendar years** (this year and the 6 before; 2020–2026 today), as
   the design does.
   - The alternative: the exact rolling 7 years (from 12 Oct 2019). That adds a partial eighth year card for 2019.
3. **A bill stopped (or subscription cancelled) after it was charged in the month shown.** Default: that charge counts in
   "Due in October", and the plan is listed under All bills as Paid for that month. It sits in Stopped from the next month on.
   - The alternative: never counted. The page's figure would then differ from history for that month.

**CEO:**
1. P24 needs one line in `src/api/auth.ts`: clear recent searches on sign-out, beside `forgetKnownStores`. It goes in the
   swap. OK?
2. P4 must also edit `src/data/pro-features.test.ts` (its id list), or that suite fails. `index.ts` needs 3 lines (import,
   area, spread), not 1.
3. P6 should also make `expo-file-system` a direct dependency (`expo install`). That is a package.json change only; it is
   already linked natively. Same isolated task as expo-print?
4. On free, `usePaymentSources()` returns only usable sources, so other pages label a charge on a locked card "No payment
   method" (today's Bills and Subscriptions pages do). Ours avoid it. Worth a separate fix elsewhere.
5. R1: fix the "today not yet recorded" gap in the ledger (Loans-owned), or accept it as it is today?
