import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ChipButton } from '@/components/payments/chip-button';
import { ChoiceList, type ChoiceItem } from '@/components/payments/choice-list';
import { KindTabs } from '@/components/payments/kind-tabs';
import { PlumCard } from '@/components/payments/plum-card';
import { ProBadge } from '@/components/payments/pro-badge';
import { ProFooter } from '@/components/payments/pro-footer';
import { SearchButton } from '@/components/payments/search-button';
import { SectionCard } from '@/components/payments/section-card';
import { t } from '@/i18n';
import type { Language } from '@/i18n/config';
import { paymentsMessages } from '@/i18n/messages/payments';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type { MessageText } from '@/i18n/translate';
import { selection, tap } from '@/lib/haptics';
import { contrast } from '@/lib/tone';
import { buildTokens } from '@/theme/palette';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The parts the Monthly bills, Subscriptions and Payment history pages are built from, with the
 * designs' own words and figures: Oct 2026's bills come to $1,884.00 over 4 bills, 2 paid and 2
 * coming up, next AEP on 22 Oct. Every part in English, Spanish and French, at the role ceilings,
 * never cut.
 */

// Each icon is a view named after itself that keeps the colour it was drawn in.
jest.mock('lucide-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    {
      get:
        (_target, name) =>
        ({ color }: { color?: string }) =>
          createElement(View, { testID: `icon-${String(name)}`, iconColor: color }),
    },
  );
});
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

let mockScheme: 'light' | 'dark' = 'light';
// Each colour reads back as its token's name, so a test can tell which one was used.
jest.mock('@/providers/theme-provider', () => {
  const colors = new Proxy({}, { get: (_target, name) => `token:${String(name)}` });
  return { useColors: () => colors, useTheme: () => ({ scheme: mockScheme, colors }) };
});

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

const hidden = { includeHiddenElements: true };
const CEILINGS = new Set<number>(Object.values(TEXT_CAP));
const LANGUAGES: Language[] = ['en', 'es', 'fr'];
const classOf = (node: { props: Record<string, unknown> } | null | undefined) =>
  String(node?.props.className ?? '');
const noop = () => {};

/** Every word the plan lists for these pages, in English as listed there. */
/** Words the pages added once built, beyond the plan's list. */
const PAGE_WORDS: Record<string, MessageText> = {
  'payments.month.title.bill': 'Monthly bills',
  'payments.month.title.subscription': 'Subscriptions',
  'payments.stopped.paidOffOn': 'Paid off on {date}',
  'payments.picker.comingMonths': 'Coming months',
  'payments.export.noneAllYears': 'Nothing to export yet.',
  'payments.export.everything': 'Bills and subscriptions',
  'payments.search.moreOneYear': '{year} · {count} more',
  'payments.history.nonePast': 'No payments in {year}.',
  'payments.search.filterSet': '{filter}: {value}',
  'payments.month.extra': {
    one: '+ {amount} extra on {name} · {total} in all',
    other: '+ {amount} extra on {count} loans · {total} in all',
  },
};

const PLAN_ENGLISH: Record<string, MessageText> = {
  'payments.month.dueIn': 'Due in {month}',
  'payments.month.chipA11y': 'Showing {month}. Choose another month',
  'payments.month.counts.bill': {
    one: '{count} bill · {paid} paid · {coming} coming up',
    other: '{count} bills · {paid} paid · {coming} coming up',
  },
  'payments.month.counts.subscription': {
    one: '{count} subscription · {paid} paid · {coming} coming up',
    other: '{count} subscriptions · {paid} paid · {coming} coming up',
  },
  'payments.month.nothingDue': 'Nothing due in {month}',
  'payments.month.next': 'Next: {name} · {date}',
  'payments.month.cardA11y': 'Due in {month}: {amount}. {counts}. {next}',
  'payments.month.comingUp': 'Coming up',
  'payments.month.allBills': 'All bills',
  'payments.month.allSubscriptions': 'All subscriptions',
  'payments.month.stopped': 'Stopped',
  'payments.month.cancelled': 'Cancelled',
  'payments.month.seeHistory': 'See payment history',
  'payments.month.search': 'Search payments',
  'payments.pill.tomorrow': 'Tomorrow',
  'payments.pill.inDays': { one: 'in {count} day', other: 'in {count} days' },
  'payments.status.paid': 'Paid',
  'payments.status.next': 'Next {date}',
  'payments.status.ends': 'Ends {date}',
  'payments.status.paidOff': 'Paid off',
  'payments.status.extraPayment': 'Extra payment',
  'payments.addCard': 'Add a card',
  'payments.addCardHint': 'Choose how {name} is paid',
  'payments.cardNotSet': 'Card not set',
  'payments.row.a11y': '{name}, {amount}, {date}, {source}, {status}',
  'payments.planRow.a11y': '{name}, {amount}, {recurrence}, {source}, {status}',
  'payments.comingRow.a11y': '{name}, {amount}, due {date}, {when}, {source}',
  'payments.picker.monthTitle': 'Choose month',
  'payments.picker.thisMonth': 'This month',
  'payments.picker.olderMonthsPro': 'See older months with Pro',
  'payments.learnMore': 'Learn more',
  'payments.history.title': 'Payment history',
  'payments.history.export': 'Export CSV or PDF',
  'payments.history.exportA11y': 'Export payments',
  'payments.history.thisYear': 'This year',
  'payments.history.yearChipA11y': 'Showing {year}. Choose another year',
  'payments.tabs.all': 'All',
  'payments.tabs.bills': 'Bills',
  'payments.tabs.subscriptions': 'Subscriptions',
  'payments.history.paidIn': 'Paid in {year}',
  'payments.history.payments': 'Payments',
  'payments.history.avg': 'Avg / month',
  'payments.history.cardA11y': {
    one: 'Paid in {year}: {amount}. {count} payment. Average {avg} a month.',
    other: 'Paid in {year}: {amount}. {count} payments. Average {avg} a month.',
  },
  'payments.history.barsA11y': 'By month: {list}',
  'payments.history.barA11y': '{month} {amount}',
  'payments.history.monthA11y': '{month}, {amount} paid',
  'payments.history.none': 'No payments in {year} yet',
  'payments.pro.years': {
    one: 'See up to {count} year with Pro',
    other: 'See up to {count} years with Pro',
  },
  'payments.pro.badge': 'Pro',
  'payments.pro.yearA11y': '{year}, older history with Pro',
  'payments.year.title': 'Choose year',
  'payments.year.thisYear': 'This year',
  'payments.year.allYears': 'All years',
  'payments.year.span': '{first} – {last}',
  'payments.years.title': 'All years',
  'payments.years.paidSince': 'Paid since {year}',
  'payments.count': { one: '{count} payment', other: '{count} payments' },
  'payments.years.count': { one: '{count} year', other: '{count} years' },
  'payments.years.rowA11y': '{year}, {count}, {amount}',
  'payments.search.placeholder': 'Search payments',
  'payments.search.cancel': 'Cancel',
  'payments.search.recent': 'Recent',
  'payments.search.removeRecent': 'Remove {query}',
  'payments.search.filters': 'Filters',
  'payments.search.dateRange': 'Date range',
  'payments.search.anyTime': 'Any time',
  'payments.search.amount': 'Amount',
  'payments.search.anyAmount': 'Any amount',
  'payments.search.paidFrom': 'Paid from',
  'payments.search.allAccounts': 'All accounts',
  'payments.search.footerPro': {
    one: 'Search across up to {count} year of payments.',
    other: 'Search across up to {count} years of payments.',
  },
  'payments.search.footerFree':
    'Search your last {days} days of payments. Pro searches up to {years} years.',
  'payments.search.results': { one: '{count} result · {span}', other: '{count} results · {span}' },
  'payments.search.yearTotal': '{amount} · {count}',
  'payments.search.more': '{newest} – {oldest} · {count} more',
  'payments.search.noMatches': 'No matches? Try a shorter word or another year.',
  'payments.search.nothing': 'No payments match',
  'payments.search.clearFilters': 'Clear filters',
  'payments.range.thisMonth': 'This month',
  'payments.range.last3Months': 'Last 3 months',
  'payments.range.thisYear': 'This year',
  'payments.range.lastYear': 'Last year',
  'payments.range.custom': 'Pick dates',
  'payments.range.from': 'From',
  'payments.range.to': 'To',
  'payments.range.span': '{from} – {to}',
  'payments.amount.min': 'At least',
  'payments.amount.max': 'At most',
  'payments.amount.atLeast': '{amount} or more',
  'payments.amount.atMost': 'Up to {amount}',
  'payments.amount.between': '{min} – {max}',
  'payments.amount.order': 'The smaller amount must come first.',
  'payments.filter.apply': 'Show payments',
  'payments.filter.clear': 'Clear',
  'payments.export.title': 'Export',
  'payments.export.summary': '{count} · {scope}',
  'payments.export.allYears': 'All years',
  'payments.export.csv': 'CSV',
  'payments.export.csvHint': 'For Numbers, Excel or Google Sheets',
  'payments.export.pdf': 'PDF',
  'payments.export.pdfHint': 'A statement to print or send',
  'payments.export.busy': 'Preparing…',
  'payments.export.none': 'Nothing to export for {scope}.',
  'payments.export.col.date': 'Date',
  'payments.export.col.name': 'Name',
  'payments.export.col.kind': 'Kind',
  'payments.export.col.amount': 'Amount ({currency})',
  'payments.export.col.paidFrom': 'Paid from',
  'payments.export.kind.bill': 'Bill',
  'payments.export.kind.subscription': 'Subscription',
  'payments.export.total': 'Total',
  'payments.export.made': 'Made with Skip Budget on {date}',
};

const nodes = (tree: Tree): Json[] => (tree === null ? [] : Array.isArray(tree) ? tree : [tree]);

function textsOf(tree: Tree): Json[] {
  const found: Json[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') return;
    if (node.type === 'Text') found.push(node);
    node.children?.forEach(walk);
  };
  nodes(tree).forEach(walk);
  return found;
}

function linesOf(tree: Tree): string[] {
  return textsOf(tree).map((node) =>
    (node.children ?? []).filter((child) => typeof child === 'string').join(''),
  );
}

const YEARS: ChoiceItem<number | 'all'>[] = [
  { value: 2026, label: 'This year', caption: '2026' },
  { value: 2025, label: '2025' },
  { value: 2024, label: '2024', pro: true, accessibilityLabel: '2024, older history with Pro' },
  { value: 'all', label: 'All years', caption: '2020 – 2026' },
];

/** Every part once, with words from the messages, as the pages will draw them. */
function Gallery() {
  return (
    <View>
      <PlumCard
        label={t('payments.month.dueIn', { month: 'October' })}
        figure="$1,884.00"
        caption={t('payments.month.counts.bill', { count: 4, paid: 2, coming: 2 })}
        footer={t('payments.month.next', { name: 'AEP', date: '22 Oct' })}
        accessibilityLabel={t('payments.month.cardA11y', {
          month: 'October',
          amount: '$1,884.00',
          counts: t('payments.month.counts.bill', { count: 4, paid: 2, coming: 2 }),
          next: t('payments.month.next', { name: 'AEP', date: '22 Oct' }),
        })}
        chip={{
          label: 'Oct 2026',
          accessibilityLabel: t('payments.month.chipA11y', { month: 'Oct 2026' }),
          onPress: noop,
        }}
      />
      <ChipButton
        label={t('payments.history.thisYear')}
        accessibilityLabel={t('payments.history.yearChipA11y', { year: 2026 })}
        onPress={noop}
      />
      <KindTabs value="all" onChange={noop} />
      <SearchButton onPress={noop} />
      <SectionCard title={t('payments.month.comingUp')} caption="2">
        <Text maxFontSizeMultiplier={TEXT_CAP.row}>AEP</Text>
        <Text maxFontSizeMultiplier={TEXT_CAP.row}>Car loan</Text>
      </SectionCard>
      <ChoiceList<number | 'all'>
        items={[
          { value: 2026, label: t('payments.year.thisYear'), caption: '2026' },
          { value: 2024, label: '2024', pro: true },
          { value: 'all', label: t('payments.year.allYears'), caption: '2020 – 2026' },
        ]}
        value={2026}
        onChoose={noop}
      />
      <ProFooter label={t('payments.pro.years', { count: 7 })} />
    </View>
  );
}

beforeEach(() => {
  resetLocaleForTests();
  mockScheme = 'light';
  jest.clearAllMocks();
});

describe('the words', () => {
  it('has every word the plan lists, in English as listed, and only the pages’ own besides', () => {
    const english = Object.fromEntries(
      Object.entries(paymentsMessages).map(([key, message]) => [key, message.en]),
    );
    expect(english).toEqual({ ...PLAN_ENGLISH, ...PAGE_WORDS });
  });

  it('writes the designs’ lines', () => {
    expect(t('payments.month.counts.bill', { count: 4, paid: 2, coming: 2 })).toBe(
      '4 bills · 2 paid · 2 coming up',
    );
    expect(t('payments.month.counts.subscription', { count: 3, paid: 2, coming: 1 })).toBe(
      '3 subscriptions · 2 paid · 1 coming up',
    );
    expect(t('payments.month.counts.bill', { count: 1, paid: 1, coming: 0 })).toBe(
      '1 bill · 1 paid · 0 coming up',
    );
    expect(t('payments.month.next', { name: 'AEP', date: '22 Oct' })).toBe('Next: AEP · 22 Oct');
    expect(t('payments.pill.inDays', { count: 10 })).toBe('in 10 days');
    expect(t('payments.pill.inDays', { count: 1 })).toBe('in 1 day');
    expect(t('payments.pro.years', { count: 7 })).toBe('See up to 7 years with Pro');
    expect(t('payments.count', { count: 67 })).toBe('67 payments');
    expect(t('payments.count', { count: 1 })).toBe('1 payment');
    expect(t('payments.years.count', { count: 7 })).toBe('7 years');
    expect(t('payments.search.results', { count: 62, span: '2021 – 2026' })).toBe(
      '62 results · 2021 – 2026',
    );
    expect(t('payments.search.more', { newest: 2024, oldest: 2021, count: 40 })).toBe(
      '2024 – 2021 · 40 more',
    );
    expect(t('payments.history.cardA11y', { year: 2026, amount: '$5', count: 1, avg: '$5' })).toBe(
      'Paid in 2026: $5. 1 payment. Average $5 a month.',
    );
  });

  it('counts in Spanish and French without agreeing "paid" with the wrong number', () => {
    setLanguage('es');
    expect(t('payments.month.counts.bill', { count: 4, paid: 1, coming: 3 })).toBe(
      '4 facturas · pagadas: 1 · por pagar: 3',
    );
    setLanguage('fr');
    // French reads 0 and 1 as singular.
    expect(t('payments.month.counts.subscription', { count: 1, paid: 1, coming: 0 })).toBe(
      '1 abonnement · payés : 1 · à venir : 0',
    );
    expect(t('payments.count', { count: 0 })).toBe('0 paiement');
  });

  it('keeps French punctuation off the line it belongs to', () => {
    const forms = (text: MessageText) =>
      typeof text === 'string' ? [text] : [text.one, text.other];
    for (const [key, message] of Object.entries(paymentsMessages)) {
      for (const line of forms(message.fr)) {
        expect({ key, plainSpaceBefore: / [:;?!]/.test(line) }).toEqual({
          key,
          plainSpaceBefore: false,
        });
      }
      for (const line of forms(message.es)) {
        expect({ key, opensQuestion: !line.includes('?') || line.includes('¿') }).toEqual({
          key,
          opensQuestion: true,
        });
      }
    }
  });
});

describe('the plum card', () => {
  const chip = {
    label: 'Oct 2026',
    accessibilityLabel: 'Showing Oct 2026. Choose another month',
    onPress: jest.fn(),
  };

  function draw(extra: Partial<Parameters<typeof PlumCard>[0]> = {}) {
    return render(
      <PlumCard
        label="Due in October"
        figure="$1,884.00"
        caption="4 bills · 2 paid · 2 coming up"
        footer="Next: AEP · 22 Oct"
        accessibilityLabel="Due in October: $1,884.00. 4 bills · 2 paid · 2 coming up. Next: AEP · 22 Oct"
        chip={chip}
        {...extra}
      />,
    );
  }

  it('reads as one stop, then the month chip as a button of its own', async () => {
    await draw();
    const summary = screen.getByTestId('plum-card-summary');
    expect(summary.props.accessible).toBe(true);
    expect(summary.props.accessibilityLabel).toBe(
      'Due in October: $1,884.00. 4 bills · 2 paid · 2 coming up. Next: AEP · 22 Oct',
    );

    const buttons = screen.getAllByRole('button', { name: chip.accessibilityLabel });
    expect(buttons).toHaveLength(1);
    expect(within(summary).queryByRole('button', { name: chip.accessibilityLabel })).toBeNull();

    await fireEvent.press(buttons[0]);
    expect(chip.onPress).toHaveBeenCalledTimes(1);
    expect(tap).toHaveBeenCalled();
  });

  it('holds the chip’s room beside the label with a copy nobody can reach', async () => {
    await draw();
    const room = screen.getByTestId('plum-card-chip-room', hidden);
    expect(room.props.accessibilityElementsHidden).toBe(true);
    expect(room.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(room.props.pointerEvents).toBe('none');
    expect(classOf(room)).toContain('opacity-0');
    expect(within(room).getByText('Oct 2026', hidden)).toBeTruthy();
  });

  it('draws every line in white on the accent, the figure whole and never shrunk to fit', async () => {
    await draw();
    expect(classOf(screen.getByTestId('plum-card'))).toContain('bg-accent');
    const figure = screen.getByText('$1,884.00');
    expect(classOf(figure)).toContain('text-on-control');
    expect(classOf(figure)).toContain('font-app-bold');
    expect(figure.props.adjustsFontSizeToFit).toBeUndefined();
    expect(figure.props.numberOfLines).toBeUndefined();
    for (const line of ['Due in October', '4 bills · 2 paid · 2 coming up']) {
      expect(classOf(screen.getByText(line))).toContain('text-on-control/90');
    }
    expect(classOf(screen.getByText('Next: AEP · 22 Oct'))).toContain('text-on-control');
  });

  it('keeps the same colours in dark mode and drops the shadow a dark page would swallow', async () => {
    await draw();
    expect(screen.getByTestId('plum-card').props.style).toMatchObject({ shadowOpacity: 0.06 });
    const light = classOf(screen.getByText('$1,884.00'));

    mockScheme = 'dark';
    await draw();
    expect(screen.getByTestId('plum-card').props.style).toBeUndefined();
    expect(classOf(screen.getByTestId('plum-card'))).toContain('bg-accent');
    expect(classOf(screen.getByText('$1,884.00'))).toBe(light);
  });

  it('leaves out the rule, the next line, the caption and the chip when it has none', async () => {
    await draw({ footer: null, caption: null, chip: null });
    expect(screen.queryByText('Next: AEP · 22 Oct')).toBeNull();
    expect(screen.queryByText('4 bills · 2 paid · 2 coming up')).toBeNull();
    expect(screen.queryByTestId('plum-card-chip-room', hidden)).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('draws what it is given under the caption, inside the one stop', async () => {
    await draw({ children: <Text testID="stats">Payments 67</Text> });
    expect(within(screen.getByTestId('plum-card-summary')).getByTestId('stats')).toBeTruthy();
  });
});

describe('the chip', () => {
  it('on the plum card: a tenth of white, white type and arrow', async () => {
    const onPress = jest.fn();
    await render(
      <ChipButton label="Oct 2026" accessibilityLabel="Month" onPress={onPress} tone="accent" />,
    );
    const button = screen.getByRole('button', { name: 'Month' });
    expect(classOf(button)).toContain('bg-on-control/10');
    expect(classOf(screen.getByText('Oct 2026'))).toContain('text-on-control');
    expect(screen.getByTestId('icon-ChevronDown').props.iconColor).toBe('token:onControl');
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('on the page: a white pill with ink type, and it wraps rather than cutting its words', async () => {
    await render(<ChipButton label="This year" accessibilityLabel="Year" onPress={noop} />);
    const button = screen.getByRole('button', { name: 'Year' });
    expect(classOf(button)).toContain('bg-card');
    expect(classOf(button)).toContain('max-w-full');
    const label = screen.getByText('This year');
    expect(classOf(label)).toContain('text-ink');
    expect(classOf(label)).toContain('shrink');
    expect(label.props.numberOfLines).toBeUndefined();
    expect(screen.getByTestId('icon-ChevronDown').props.iconColor).toBe('token:ink');
  });
});

describe('the kind tabs', () => {
  it('are a tab list of All, Bills and Subscriptions, the chosen one selected and underlined', async () => {
    await render(<KindTabs value="bill" onChange={noop} />);
    expect(screen.getByTestId('kind-tabs').props.accessibilityRole).toBe('tablist');
    expect(screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel)).toEqual([
      'All',
      'Bills',
      'Subscriptions',
    ]);
    expect(screen.getByRole('tab', { name: 'Bills', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'All', selected: false })).toBeTruthy();

    expect(classOf(screen.getByTestId('kind-tabs-bill-line'))).toContain('bg-accent-ink');
    expect(classOf(screen.getByTestId('kind-tabs-all-line'))).toContain('bg-transparent');
    expect(classOf(screen.getByTestId('kind-tabs-subscription-line'))).toContain('bg-transparent');
  });

  it('hands back the tab tapped, and nothing for the one already chosen', async () => {
    const onChange = jest.fn();
    await render(<KindTabs value="all" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'All' }));
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('tab', { name: 'Subscriptions' }));
    expect(onChange).toHaveBeenCalledWith('subscription');
    expect(selection).toHaveBeenCalledTimes(1);
  });

  it('wraps onto another line rather than cutting a word', async () => {
    setLanguage('es');
    await render(<KindTabs value="all" onChange={noop} />);
    expect(classOf(screen.getByTestId('kind-tabs'))).toContain('flex-wrap');
    expect(screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel)).toEqual([
      'Todos',
      'Facturas',
      'Suscripciones',
    ]);
  });
});

describe('the section card', () => {
  it('draws a hairline between rows only, never above the first or for a row left out', async () => {
    await render(
      <SectionCard title="Coming up" caption="2" testID="coming">
        <Text>AEP</Text>
        {null}
        {false}
        <Text>Car loan</Text>
        <Text>Rent</Text>
      </SectionCard>,
    );
    expect(screen.getAllByTestId('section-card-rule')).toHaveLength(2);
    expect(classOf(screen.getByTestId('coming-card'))).toContain('rounded-[20px]');
  });

  it('names the section as a heading, with its count', async () => {
    await render(
      <SectionCard title="Coming up" caption="2">
        <Text>AEP</Text>
      </SectionCard>,
    );
    expect(screen.getByRole('header', { name: 'Coming up, 2' })).toBeTruthy();
  });

  it('reads a total in words when the page gives them', async () => {
    await render(
      <SectionCard
        title="October 2026"
        caption="$1,205.99"
        titleA11y="October 2026, $1,205.99 paid"
      >
        <Text>Nationwide</Text>
      </SectionCard>,
    );
    expect(screen.getByRole('header', { name: 'October 2026, $1,205.99 paid' })).toBeTruthy();
  });

  it('draws a group’s small muted name, and has no heading when it has no title', async () => {
    await render(
      <SectionCard title="Filters" titleTone="label">
        <Text>Date range</Text>
      </SectionCard>,
    );
    expect(classOf(screen.getByText('Filters'))).toContain('text-muted');

    await render(
      <SectionCard>
        <Text>See payment history</Text>
      </SectionCard>,
    );
    expect(screen.queryByRole('header')).toBeNull();
  });
});

describe('the choice list', () => {
  it('ticks the year shown and badges the years only Pro lists in full', async () => {
    await render(<ChoiceList items={YEARS} value={2026} onChoose={noop} />);
    expect(screen.getByTestId('choice-list-card').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('radio', { name: 'This year, 2026', checked: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '2025', checked: false })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'All years, 2020 – 2026' })).toBeTruthy();
    expect(screen.getAllByTestId('icon-Check')).toHaveLength(1);

    const badges = screen.getAllByTestId('pro-badge', hidden);
    expect(badges).toHaveLength(1);
    expect(
      within(screen.getByRole('radio', { name: '2024, older history with Pro' })).getByTestId(
        'pro-badge',
        hidden,
      ),
    ).toBeTruthy();
  });

  it('hands back the value chosen, a number as a number', async () => {
    const onChoose = jest.fn();
    await render(<ChoiceList items={YEARS} value={2026} onChoose={onChoose} />);
    await fireEvent.press(screen.getByRole('radio', { name: '2024, older history with Pro' }));
    expect(onChoose).toHaveBeenCalledWith(2024);
    await fireEvent.press(screen.getByRole('radio', { name: 'All years, 2020 – 2026' }));
    expect(onChoose).toHaveBeenLastCalledWith('all');
    expect(selection).toHaveBeenCalledTimes(2);
  });

  it('ticks nothing when nothing is chosen', async () => {
    await render(<ChoiceList items={YEARS} value={null} onChoose={noop} />);
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    expect(screen.queryByTestId('icon-Check')).toBeNull();
  });
});

describe('the Pro badge and footer', () => {
  it('says Pro without VoiceOver reading it twice', async () => {
    await render(<ProBadge />);
    const badge = screen.getByTestId('pro-badge', hidden);
    expect(badge.props.accessibilityElementsHidden).toBe(true);
    expect(within(badge).getByText('Pro', hidden)).toBeTruthy();
    expect(classOf(badge)).toContain('bg-tint');
  });

  it('opens the history explainer from Learn more', async () => {
    await render(<ProFooter label="See up to 7 years with Pro" />);
    const footer = screen.getByRole('button', { name: 'See up to 7 years with Pro' });
    expect(footer.props.accessibilityHint).toBe('Learn more');
    expect(classOf(screen.getByText('Learn more'))).toContain('text-tint-ink');
    await fireEvent.press(footer);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/pro-feature',
      params: { id: 'history' },
    });
  });

  it('goes where the page sends it instead, when it says', async () => {
    const onPress = jest.fn();
    await render(<ProFooter label="See older months with Pro" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'See older months with Pro' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('accent type on a white card', () => {
  it('reads at 4.5 to 1 or better in light and dark', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const tokens = buildTokens(scheme);
      expect({ scheme, ratio: contrast(tokens.tintInk, tokens.card) >= 4.5 }).toEqual({
        scheme,
        ratio: true,
      });
    }
  });
});

describe('the search button', () => {
  it('looks like the field and opens the search', async () => {
    const onPress = jest.fn();
    await render(<SearchButton onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Search payments' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('icon-Search').props.iconColor).toBe('token:muted');
  });
});

describe('every part, in every language, at large text', () => {
  it.each(LANGUAGES)(
    '%s: each line at its role’s ceiling, never cut, never a raw key',
    async (language) => {
      setLanguage(language);
      await render(<Gallery />);
      const tree = screen.toJSON() as Tree;

      for (const node of textsOf(tree)) {
        expect(CEILINGS.has(node.props.maxFontSizeMultiplier as number)).toBe(true);
        expect(node.props.numberOfLines).toBeUndefined();
        expect(node.props.adjustsFontSizeToFit).toBeUndefined();
        expect(node.props.allowFontScaling).toBeUndefined();
      }
      for (const line of linesOf(tree)) {
        expect(line).not.toMatch(/payments\.[a-z]/);
        expect(line).not.toMatch(/\{\w+\}/);
      }
    },
  );

  it('draws the Spanish and French words', async () => {
    setLanguage('es');
    await render(<Gallery />);
    for (const line of [
      'Buscar pagos',
      'Próximos',
      'Más información',
      'Este año',
      'Todos los años',
    ]) {
      expect(screen.getAllByText(line).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('Consulta hasta 7 años con Pro')).toBeTruthy();

    setLanguage('fr');
    await render(<Gallery />);
    for (const line of ['Rechercher des paiements', 'À venir', 'En savoir plus', 'Abonnements']) {
      expect(screen.getAllByText(line).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('Consulte jusqu’à 7 ans avec Pro')).toBeTruthy();
  });
});
