import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Dimensions, Text, View } from 'react-native';

import PrivacyScreen from '@/app/privacy';
import { AppLockGate } from '@/components/app-lock-gate';
import { BillFilterSheet, EMPTY_BILL_FILTERS } from '@/components/bills/bill-filter-sheet';
import { CategoryPicker } from '@/components/bills/category-picker';
import { ProportionBar } from '@/components/calculators/proportion-bar';
import { ScheduleCard } from '@/components/calculators/schedule-card';
import { SliderRow } from '@/components/calculators/slider-row';
import { NetworkPicker } from '@/components/cards/network-picker';
import { InlineCalendar } from '@/components/flow/inline-calendar';
import { StepFlow } from '@/components/flow/step-flow';
import {
  EMPTY_RECEIPT_FILTERS,
  ReceiptFilterSheet,
} from '@/components/receipts/receipt-filter-sheet';
import { SettingsRow } from '@/components/settings/settings-row';
import { SetupCollection } from '@/components/setup/setup-collection';
import {
  EMPTY_SUBSCRIPTION_FILTERS,
  SubscriptionFilterSheet,
} from '@/components/subscriptions/subscription-filter-sheet';
import { EMPTY_FILTERS, FilterSheet } from '@/components/transactions/filter-sheet';
import { ActionPill } from '@/components/ui/action-pill';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { FilterActions } from '@/components/ui/filter-actions';
import { MultiChoiceChips } from '@/components/ui/multi-choice-chips';
import { OtpInput } from '@/components/ui/otp-input';
import { PageState } from '@/components/ui/page-state';
import { RangeDropdown } from '@/components/ui/range-dropdown';
import { ReminderField } from '@/components/ui/reminder-field';
import { SearchField } from '@/components/ui/search-field';
import { SelectField } from '@/components/ui/select-field';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { TimePicker } from '@/components/ui/time-picker';
import { TogglePill } from '@/components/ui/toggle-pill';
import { VoiceHints } from '@/components/voice/voice-hints';
import { sentenceText, VOICE_EXAMPLES } from '@/data/voice-examples';
import { percent, t } from '@/i18n';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { voiceMessages } from '@/i18n/messages/voice';
import { failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import type { AmortisationRow } from '@/lib/loan';
import { TEXT_CAP, type TextRole } from '@/theme/text-scale';

/**
 * Every control the large-text pass moved onto the role ceilings, drawn in English, Spanish and
 * French at the largest text size:
 *
 * - nothing is cut: no line limit, no shrink-to-fit, no ellipsis, and no fixed height around text
 *   that grows, so a longer translation or a larger size makes the control taller, never clipped;
 * - every text takes its role's ceiling from TEXT_CAP; only the listed kinds (keypad digits,
 *   calendar days, slider ends, a card network's mark) stay at one size on purpose;
 * - every line a person sees or hears comes from the messages: no raw key, no unfilled {param},
 *   and nothing left in English on a Spanish or French screen beyond names, figures and the words
 *   both languages share.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
// The skeleton's pulse; reanimated's own mock needs the native worklets module.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    withRepeat: (value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  Stack: { Screen: () => null },
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/shadows', () => ({ shadows: { floating: {} } }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => false) }));
jest.mock('@/providers/preferences-provider', () => ({
  usePreferences: () => ({ appLock: true, ready: true }),
}));
jest.mock('@/lib/app-lock', () => ({ authenticate: async () => false }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
// The reminder choices live beside the reminder mutations; nothing here reaches the server.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

// 1 June 2026, so the calendars open on a fixed month.
jest.useFakeTimers().setSystemTime(new Date('2026-06-01T09:00:00'));

type Json = {
  type: string;
  props: Record<string, unknown>;
  children: (Json | string)[] | null;
};
type Tree = Json | Json[] | null;
type Screen = Awaited<ReturnType<typeof render>>;

const CEILINGS = new Set<number>(Object.values(TEXT_CAP));
const LANGUAGES: Language[] = ['en', 'es', 'fr'];
const OTHERS = ['es', 'fr'] as const;
const JUNE_14 = new Date(2026, 5, 14);
const noop = () => {};

const scheduleRows = Array.from(
  { length: 72 },
  (_, i) =>
    ({
      number: i + 1,
      date: '2026-01-14',
      days: 45,
      payment: 554.34,
      interest: 315.06,
      principal: 239.28,
      extra: 0,
      balance: 31_155.05,
    }) as AmortisationRow,
);

type Case = {
  name: string;
  /** Built while the language under test is set, as the screen would. */
  draw: () => ReactElement;
  /** Opens the part drawn on demand (a menu, the month grid). */
  open?: (screen: Screen) => Promise<void>;
  /** Text drawn at one size on purpose; nothing else may turn scaling off. */
  fixed?: RegExp;
  /** A fixed-size box whose text, at its ceiling, cannot outgrow it. */
  fixedBox?: RegExp;
  /**
   * Lines a Spanish or French screen may share with English, per language: names and figures in
   * both, and only the words that really are the same in that one language.
   */
  same?: Same;
  /** Lines and the role whose ceiling each must take, in the language under test. */
  roles?: () => [string, TextRole][];
};

type Same = Partial<Record<'es' | 'fr', RegExp>>;

/** Names and figures, written the same in every language. */
const both = (pattern: RegExp): Same => ({ es: pattern, fr: pattern });

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The spoken examples: the recogniser only hears English, so they stay English on every page. */
const EXAMPLES = new RegExp(
  `^(${VOICE_EXAMPLES.map((example) => escape(sentenceText(example.parts))).join('|')})$`,
);

const CASES: Case[] = [
  {
    name: 'AppLockGate',
    draw: () => (
      <AppLockGate>
        <Text>Budget</Text>
      </AppLockGate>
    ),
    roles: () => [
      [t('nav.locked.title'), 'heading'],
      [t('nav.locked.body'), 'reading'],
      [t('nav.locked.unlock'), 'row'],
    ],
  },
  {
    name: 'ActionPill',
    draw: () => (
      <ActionPill icon={(() => null) as never} label={t('bills.add.calculator')} onPress={noop} />
    ),
    roles: () => [[t('bills.add.calculator'), 'row']],
  },
  {
    name: 'AmountPad',
    draw: () => (
      <AmountPad
        title={t('loan.amount')}
        caption={t('loan.calculator.amountCaption')}
        value="25000"
        onCancel={noop}
        onConfirm={noop}
      />
    ),
    // The keys and the figure are sized by their glyph count, not the text size. \s takes in the
    // no-break spaces French money is written with.
    fixed: /^[\d.,\s$]+$/,
    same: both(/^[\d.,\s$]+$/),
    roles: () => [
      [t('loan.amount'), 'heading'],
      [t('loan.calculator.amountCaption'), 'reading'],
      [t('common.done'), 'row'],
    ],
  },
  {
    name: 'Button',
    draw: () => <Button label={t('common.save')} onPress={noop} />,
    roles: () => [[t('common.save'), 'row']],
  },
  {
    name: 'ChoiceChips',
    draw: () => (
      <ChoiceChips
        options={(['light', 'dark', 'system'] as const).map((value) => ({
          value,
          label: t(`preferences.appearance.${value}`),
        }))}
        value="system"
        onChange={noop}
      />
    ),
    roles: () => [[t('preferences.appearance.system'), 'control']],
  },
  {
    name: 'MultiChoiceChips',
    draw: () => (
      <MultiChoiceChips
        options={[{ value: 'acc1', label: 'Chase Checking ••7730' }]}
        values={[]}
        onChange={noop}
        emptyHint={t('salary.linkAccountHint')}
      />
    ),
    same: both(/^Chase Checking ••7730$/),
    roles: () => [
      ['Chase Checking ••7730', 'control'],
      [t('salary.linkAccountHint'), 'reading'],
    ],
  },
  {
    name: 'SourceTiles',
    draw: () => (
      <SourceTiles
        sources={
          [
            { id: 's1', label: 'VISA ••4242', color: '#000000' },
            { id: 's2', label: 'Everyday ••1111', color: '#FFFFFF' },
          ] as never
        }
        value="s1"
        onChange={noop}
      />
    ),
    same: both(/^(VISA ••4242|Everyday ••1111)$/),
    roles: () => [['VISA ••4242', 'control']],
  },
  {
    name: 'TogglePill',
    draw: () => (
      <TogglePill
        options={[
          { value: 'AM', label: t('ui.timePicker.am') },
          { value: 'PM', label: t('ui.timePicker.pm') },
        ]}
        value="PM"
        onChange={noop}
      />
    ),
    roles: () => [[t('ui.timePicker.pm'), 'control']],
  },
  {
    name: 'NetworkPicker',
    draw: () => (
      <NetworkPicker networks={['VISA', 'Mastercard', 'Amex']} value="VISA" onChange={noop} />
    ),
    // Brand names; the circle's short mark is drawn at one size inside its 64pt circle.
    fixed: /^(VISA|MC|AMEX|DISC)$/,
    same: both(/^(VISA|Mastercard|Amex|MC|AMEX)$/),
    roles: () => [['Mastercard', 'control']],
  },
  {
    name: 'RangeDropdown',
    draw: () => <RangeDropdown value="month" onChange={noop} />,
    open: async (screen) => {
      await fireEvent.press(screen.getByRole('button', { name: /month|mes|mois/i }));
    },
  },
  {
    name: 'ReminderField',
    draw: () => (
      <ReminderField kind="bill" value="1" onChange={noop} time="20:00" onTimeChange={noop} />
    ),
    same: both(/^\d{1,2}$/),
    roles: () => [[t('ui.reminder.label'), 'row']],
  },
  {
    name: 'SelectField',
    draw: () => (
      <SelectField
        label={t('salary.amount')}
        value=""
        placeholder={t('salary.enterAmount')}
        onPress={noop}
      />
    ),
    roles: () => [
      [t('salary.amount'), 'row'],
      [t('salary.enterAmount'), 'row'],
    ],
  },
  {
    name: 'TextField',
    draw: () => (
      <TextField
        label={t('savings.month.reallyLeft')}
        value=""
        onChangeText={noop}
        placeholder={t('savings.month.reallyLeftPlaceholder')}
        optional
        error={failureText()}
      />
    ),
    roles: () => [
      [t('savings.month.reallyLeft'), 'row'],
      [t('ui.field.optional'), 'row'],
      [failureText(), 'reading'],
    ],
  },
  {
    name: 'SearchField',
    draw: () => (
      <SearchField
        value="Netflix"
        onChangeText={noop}
        placeholder={t('subscriptions.plans.search')}
      />
    ),
    same: both(/^Netflix$/),
  },
  {
    name: 'OtpInput',
    draw: () => <OtpInput value="12" onChangeText={noop} autoFocus={false} />,
    same: both(/^\d$/),
  },
  {
    name: 'PageState',
    draw: () => (
      <PageState
        art={(() => null) as never}
        title={t('bills.noBillsYet')}
        message={t('bills.charged.emptyMessage')}
        actionLabel={t('bills.addABill')}
        onAction={noop}
      />
    ),
    roles: () => [
      [t('bills.noBillsYet'), 'heading'],
      [t('bills.charged.emptyMessage'), 'reading'],
      [t('bills.addABill'), 'row'],
    ],
  },
  {
    name: 'LegalDocument (privacy)',
    draw: () => <PrivacyScreen />,
    // Names and addresses the policy gives in every language.
    same: both(
      /^(•|Skip|Skip Budget|Supabase|Sentry|RevenueCat|Apple|Resend|.*@.*|https?:\/\/.*)$/,
    ),
    roles: () => [[`1. ${t('legal.privacy.who.heading')}`, 'heading']],
  },
  {
    name: 'DatePicker',
    draw: () => <DatePicker value={JUNE_14} onCancel={noop} onConfirm={noop} />,
    // The months sit in 56pt circles; the widest, French "mars" when chosen, is 51pt across and
    // 24pt tall at the control ceiling, so it cannot outgrow its circle.
    fixedBox: /(?:^|\s)h-14 w-14(?=\s)/,
    // "OK" is French; Spanish says "Aceptar".
    same: { es: /^(\d{4}|\d{1,2})$/, fr: /^(\d{4}|\d{1,2}|OK)$/ },
    roles: () => [
      [t('common.cancel'), 'row'],
      [t('common.next'), 'row'],
    ],
  },
  {
    name: 'DatePicker, days',
    draw: () => <DatePicker value={JUNE_14} onCancel={noop} onConfirm={noop} />,
    open: async (screen) => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.next') }));
    },
    // Day numbers and weekday initials are laid out in a fixed seven-column grid.
    fixed: /^(\d{1,2}|[A-ZÀ-Ý])$/,
    // Weekday initials: Spanish and French "M" and "S" are their own days' initials.
    same: { es: /^(\d{4}|\d{1,2}|[MS])$/, fr: /^(\d{4}|\d{1,2}|OK|[MS])$/ },
    roles: () => [[t('common.ok'), 'row']],
  },
  {
    name: 'TimePicker',
    draw: () => <TimePicker value="13:05" onCancel={noop} onConfirm={noop} />,
    // "OK" and "Minute" are French words too; Spanish says "Aceptar" and "Minuto".
    same: { es: /^(\d{1,2}|:)$/, fr: /^(\d{1,2}|:|OK|Minute, \d+)$/ },
    roles: () => [
      [t('ui.timePicker.title'), 'heading'],
      [t('common.cancel'), 'row'],
    ],
  },
  {
    name: 'InlineCalendar',
    draw: () => <InlineCalendar value={JUNE_14} onChange={noop} />,
    fixed: /^(\d{1,2}|[A-ZÀ-Ý])$/,
    same: both(/^(\d{1,2}|[MS])$/),
  },
  {
    name: 'InlineCalendar, months',
    draw: () => <InlineCalendar value={JUNE_14} onChange={noop} />,
    open: async (screen) => {
      await fireEvent.press(screen.getByLabelText(/2026\./));
    },
    same: both(/^\d{4}$/),
  },
  {
    name: 'StepFlow',
    draw: () => (
      <StepFlow
        title={t('receipts.add.titleEdit')}
        closePrompt={t('receipts.add.closeEdit')}
        steps={3}
        current={1}
        onBack={noop}
        question={t('receipts.add.askAmount')}
        error={failureText()}
        primaryLabel={t('common.continue')}
        onPrimary={noop}
      >
        <View />
      </StepFlow>
    ),
    roles: () => [
      [t('receipts.add.askAmount'), 'heading'],
      [failureText(), 'reading'],
      [t('common.continue'), 'row'],
    ],
  },
  {
    name: 'ProportionBar',
    draw: () => <ProportionBar principal={25_000} interest={3_750} />,
    roles: () => [
      [
        t('loan.proportion.borrowed', { amount: formatCurrency(25_000, { cents: false }) }),
        'control',
      ],
    ],
  },
  {
    name: 'ScheduleCard',
    draw: () => <ScheduleCard rows={scheduleRows} onPress={noop} />,
    roles: () => [[t('loan.scheduleCard.title'), 'row']],
  },
  {
    name: 'SliderRow',
    draw: () => (
      <SliderRow
        label={t('loan.interestRate')}
        display={percent(7.5, 2)}
        value={7.5}
        min={0}
        max={30}
        onChange={noop}
        onValuePress={noop}
        minLabel={percent(0, 0)}
        maxLabel={percent(30, 0)}
      />
    ),
    // The ends of the track sit under its ends, at one size.
    fixed: /^(0|30)\s?%$/,
    // Spanish writes a rate as English does; French as "7,50 %".
    same: { es: /^(7\.50%|0%|30%)$/ },
    roles: () => [
      [t('loan.interestRate'), 'row'],
      [percent(7.5, 2), 'figure'],
    ],
  },
  {
    name: 'SetupCollection',
    draw: () => (
      <SetupCollection
        title={t('onboarding.bills.title')}
        subtitle={t('onboarding.bills.subtitle')}
        emptyText={t('onboarding.bills.empty')}
        addLabel={t('onboarding.bills.add')}
        addAnotherLabel={t('onboarding.bills.addAnother')}
        addHref="/add-bill"
        count={0}
        isPending={false}
        isError={false}
        onRetry={noop}
      >
        {null}
      </SetupCollection>
    ),
    roles: () => [
      [t('onboarding.bills.empty'), 'reading'],
      [t('onboarding.bills.add'), 'row'],
    ],
  },
  {
    name: 'VoiceHints',
    draw: () => <VoiceHints hidden={false} />,
    same: both(EXAMPLES),
  },
  {
    name: 'CategoryPicker',
    draw: () => <CategoryPicker onSelect={noop} />,
    same: both(/^Internet$/),
  },
  {
    name: 'SettingsRow',
    draw: () => (
      <SettingsRow
        icon={(() => null) as never}
        title={t('settings.about.version')}
        subtitle={t('settings.about.privacyDetail')}
        value="0.1.0"
      />
    ),
    // "Version" is French too; Spanish says "Versión".
    same: { es: /^0\.1\.0$/, fr: /^(0\.1\.0|Version)$/ },
    roles: () => [
      [t('settings.about.version'), 'row'],
      ['0.1.0', 'row'],
    ],
  },
  {
    name: 'ConfirmDialog',
    draw: () => (
      <ConfirmDialog
        title={t('bills.add.deleteTitle')}
        message={t('bills.add.deleteMessage')}
        actions={[{ id: 'confirm', label: t('common.delete'), destructive: true }]}
        onResolve={noop}
      />
    ),
    roles: () => [
      [t('bills.add.deleteTitle'), 'heading'],
      [t('bills.add.deleteMessage'), 'reading'],
      [t('common.delete'), 'row'],
    ],
  },
  {
    name: 'FilterActions',
    draw: () => (
      <FilterActions
        resetLabel={t('transactions.filter.reset')}
        applyLabel={t('transactions.filter.apply')}
        onReset={noop}
        onApply={noop}
      />
    ),
    roles: () => [
      [t('transactions.filter.reset'), 'row'],
      [t('transactions.filter.apply'), 'row'],
    ],
  },
  {
    name: 'BillFilterSheet',
    draw: () => (
      <BillFilterSheet
        filters={EMPTY_BILL_FILTERS}
        sourceOptions={[]}
        onCancel={noop}
        onApply={noop}
      />
    ),
    same: both(/^Internet$/),
    roles: () => [[t('bills.filter.title'), 'heading']],
  },
  {
    name: 'SubscriptionFilterSheet',
    draw: () => (
      <SubscriptionFilterSheet
        filters={EMPTY_SUBSCRIPTION_FILTERS}
        sourceOptions={[]}
        onCancel={noop}
        onApply={noop}
      />
    ),
    roles: () => [[t('subscriptions.filter.title'), 'heading']],
  },
  {
    name: 'ReceiptFilterSheet',
    draw: () => (
      <ReceiptFilterSheet
        filters={{ ...EMPTY_RECEIPT_FILTERS, date: '2026-09-12' }}
        sourceOptions={[]}
        onCancel={noop}
        onApply={noop}
      />
    ),
    // "Date" is French too; Spanish says "Fecha".
    same: { fr: /^Date$/ },
    roles: () => [
      [t('receipts.filter.title'), 'heading'],
      [t('receipts.filter.clearDate'), 'row'],
    ],
  },
  {
    name: 'FilterSheet (Activity)',
    draw: () => (
      <FilterSheet filters={EMPTY_FILTERS} sourceOptions={[]} onCancel={noop} onApply={noop} />
    ),
    same: { fr: /^Date$/ },
    roles: () => [[t('transactions.filter.title'), 'heading']],
  },
];

const nodes = (tree: Tree): Json[] => (Array.isArray(tree) ? tree : tree ? [tree] : []);

/** What a Text draws: its strings, nested Texts included. */
function textOf(node: Json): string {
  return (node.children ?? [])
    .map((child) => (typeof child === 'string' ? child : textOf(child)))
    .join('');
}

/** A measuring copy or a faded-out hint: on screen for its width only, never seen or heard. */
const unseen = (props: Record<string, unknown>) =>
  props.accessibilityElementsHidden === true ||
  props.importantForAccessibility === 'no-hide-descendants';

const FIXED_HEIGHT = /(?:^|\s)h-(?:\d+(?:\.\d+)?|\[\d+px\])(?=\s|$)/;

type Finding = { text: string; problem: string };

/** Every Text and visible TextInput, checked against the large-text rules. */
function audit(tree: Tree, { fixed, fixedBox }: Pick<Case, 'fixed' | 'fixedBox'>): Finding[] {
  const found: Finding[] = [];
  const walk = (node: Json, boxes: string[], inText: boolean) => {
    const className = String(node.props.className ?? '');
    if (node.type === 'Text' && !inText) {
      const text = textOf(node);
      const props = node.props;
      if (props.allowFontScaling === false) {
        if (!fixed?.test(text)) found.push({ text, problem: 'turns text scaling off' });
      } else {
        if (!CEILINGS.has(props.maxFontSizeMultiplier as number)) {
          found.push({ text, problem: `ceiling ${String(props.maxFontSizeMultiplier)}` });
        }
        for (const cut of [
          'numberOfLines',
          'adjustsFontSizeToFit',
          'minimumFontScale',
          'ellipsizeMode',
        ]) {
          if (props[cut] !== undefined)
            found.push({ text, problem: `${cut}=${String(props[cut])}` });
        }
        const box = boxes.find((name) => FIXED_HEIGHT.test(name) && !fixedBox?.test(name));
        if (box) found.push({ text, problem: `inside a fixed height: "${box}"` });
      }
    }
    if (node.type === 'TextInput') {
      const style = [node.props.style].flat(Infinity) as { opacity?: number }[];
      const invisible = style.some((part) => part?.opacity === 0);
      if (!invisible && !CEILINGS.has(node.props.maxFontSizeMultiplier as number)) {
        found.push({
          text: String(node.props.placeholder ?? node.props.value ?? ''),
          problem: `input ceiling ${String(node.props.maxFontSizeMultiplier)}`,
        });
      }
    }
    for (const child of node.children ?? []) {
      if (typeof child !== 'string') {
        walk(child, [...boxes, className], inText || node.type === 'Text');
      }
    }
  };
  nodes(tree).forEach((node) => walk(node, [], false));
  return found;
}

/** Every line a person can see or hear: text, labels, hints and placeholders. */
function linesOf(tree: Tree): string[] {
  const lines: string[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') return void lines.push(node);
    if (unseen(node.props)) return;
    for (const prop of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      const value = node.props[prop];
      if (typeof value === 'string') lines.push(value);
    }
    if (node.type === 'Text') return void lines.push(textOf(node));
    node.children?.forEach(walk);
  };
  nodes(tree).forEach(walk);
  return lines.map((line) => line.trim()).filter(Boolean);
}

async function draw(entry: Case, language: Language): Promise<Screen> {
  setLanguage(language);
  const screen = await render(entry.draw());
  if (entry.open) await entry.open(screen);
  return screen;
}

beforeAll(() => {
  const window = { width: 375, height: 812, scale: 3, fontScale: 1.4 };
  Dimensions.set({ window, screen: window });
});
beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe.each(CASES)('$name', (entry) => {
  it.each(LANGUAGES)('cuts nothing and takes its roles’ ceilings in %s', async (language) => {
    const screen = await draw(entry, language);
    const tree = screen.toJSON() as Tree;

    expect(audit(tree, entry)).toEqual([]);
    for (const [line, role] of entry.roles?.() ?? []) {
      const node = screen.getAllByText(line, { exact: true })[0];
      expect([line, node.props.maxFontSizeMultiplier]).toEqual([line, TEXT_CAP[role]]);
    }
  });

  it.each(OTHERS)(
    'says everything in %s, with no key and nothing left in English',
    async (language) => {
      const inEnglish = await draw(entry, 'en');
      const english = new Set(linesOf(inEnglish.toJSON() as Tree));
      // Gone before the language changes, or the controls that follow the language would redraw.
      await inEnglish.unmount();
      resetLocaleForTests();

      const lines = linesOf((await draw(entry, language)).toJSON() as Tree);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.filter((line) => /^[a-z]{2,}\.[a-zA-Z]{2,}\.|\{\w+\}/.test(line))).toEqual([]);
      const leftInEnglish = lines.filter(
        (line) => english.has(line) && !(entry.same?.[language]?.test(line) ?? false),
      );
      expect(leftInEnglish).toEqual([]);
    },
  );
});

describe('VoiceHints’ note on a Spanish or French page', () => {
  const note = voiceMessages['voice.hints.englishOnly'];

  // The examples above stay English, so the line saying so is the one part that must not.
  it.each(OTHERS)('says the examples are English, in %s', async (language) => {
    setLanguage(language);
    const screen = await render(<VoiceHints hidden={false} />);

    expect(note[language]).not.toBe(note.en);
    expect(linesOf(screen.toJSON() as Tree)).toContain(note[language]);
    expect(screen.queryByText(note.en)).toBeNull();
  });
});
