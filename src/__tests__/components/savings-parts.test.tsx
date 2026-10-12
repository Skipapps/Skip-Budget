import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import {
  CompletedGoalCard,
  GoalCard,
  GoalInviteCard,
  GoalsSummaryCard,
  NewGoalButton,
} from '@/components/savings/goal-cards';
import { GoalSendCard, SendFromCard, SendTotals } from '@/components/savings/goal-send-card';
import { GoalTypeGrid } from '@/components/savings/goal-type-grid';
import { MonthSoFarCard } from '@/components/savings/month-so-far-card';
import {
  MonthFiguresCard,
  MonthUpdateCard,
  PotHeroCard,
  PotStateCard,
  WhereItWentCard,
} from '@/components/savings/pot-detail-parts';
import { ByMonthSection, type PotRowData } from '@/components/savings/pot-row';
import { ReadyCard } from '@/components/savings/ready-card';
import {
  dayMonthText,
  monthName,
  monthTitle,
  shortMoney,
  shortMonthYear,
  splitMoney,
  wentShares,
} from '@/components/savings/savings-words';
import { SentGoalsCard, SentHero, StillInSavingsCard } from '@/components/savings/sent-parts';
import { StatusPill } from '@/components/savings/status-pill';
import { WrapUpHero } from '@/components/savings/wrap-up-hero';
import { GOAL_TYPES } from '@/data/goal-types';
import { resetLocaleForTests } from '@/i18n/store';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The Savings and Goals pages' parts, with the designs' own figures: September earned $3,700 and
 * spent $3,060, so $640 moved; July's $410 has $210 left; $850 is ready, $400 and $300 go to Trip
 * and Emergency fund and $150 stays. Plain props in, words and figures out, to the cent.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: 'light' }),
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));
jest.mock('@/theme/goal-icons', () => ({
  useGoalTypeIcons: () => new Proxy({}, { get: () => () => null }),
  useSavingsIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));

type Host = ReturnType<typeof screen.getByTestId>;
const hidden = { includeHiddenElements: true };
const classOf = (node: Host | null | undefined) => String(node?.props.className ?? '');

async function layout(testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, hidden), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

beforeEach(() => resetLocaleForTests());

describe('the words and figures', () => {
  it('drops .00 from a whole amount and keeps real cents', () => {
    expect(shortMoney(640)).toBe('$640');
    expect(shortMoney(2961.29)).toBe('$2,961.29');
    expect(shortMoney(3700)).toBe('$3,700');
    expect(shortMoney(0.5)).toBe('$0.50');
  });

  it('splits a figure at the decimal mark, so the parts read back as the whole', () => {
    expect(splitMoney(850)).toEqual({ whole: '$850', cents: '.00' });
    expect(splitMoney(738.71)).toEqual({ whole: '$738', cents: '.71' });
    expect(splitMoney(1234567.05)).toEqual({ whole: '$1,234,567', cents: '.05' });
  });

  it('names months and days as the designs write them', () => {
    expect(monthName('2026-09-01')).toBe('September');
    expect(monthTitle('2026-09-01')).toBe('September 2026');
    expect(shortMonthYear('2027-03-01')).toBe('Mar 2027');
    expect(dayMonthText('2026-11-01')).toBe('1 Nov');
    // Never a day out, whatever the time zone: a date string is read as a local day.
    expect(dayMonthText('2026-10-31')).toBe('31 Oct');
  });

  it('shares September’s pay as the design does: 83% spent, 17% left', () => {
    expect(wentShares(3700, 3060)).toEqual({ spent: 83, left: 17 });
  });

  it('adds every share up to 100, never shows a real share as 0%, never 100% beside a share', () => {
    expect(wentShares(3700, 0)).toEqual({ spent: 0, left: 100 });
    expect(wentShares(3700, 3700)).toEqual({ spent: 100, left: 0 });
    expect(wentShares(100, 0.2)).toEqual({ spent: 1, left: 99 });
    expect(wentShares(100, 99.9)).toEqual({ spent: 99, left: 1 });
    // Worked in cents: 0.1 + 0.2 style noise cannot tip a share.
    expect(wentShares(0.3, 0.1 + 0.2)).toEqual({ spent: 100, left: 0 });
  });

  it('says how far past the pay an overspent month went, and leaves nothing', () => {
    expect(wentShares(3700, 4100)).toEqual({ spent: 111, left: 0 });
  });

  it('has nothing to share in a month with no pay', () => {
    expect(wentShares(0, 50)).toBeNull();
  });
});

describe('the Ready to use card', () => {
  it('draws $850 with smaller cents, reads it as one amount, and sends', async () => {
    const onSend = jest.fn();
    await render(<ReadyCard amount={850} onSend={onSend} />);
    expect(screen.getByText('Ready to use')).toBeTruthy();
    expect(screen.getByText('$850')).toBeTruthy();
    const cents = screen.getByTestId('ready-to-use-cents');
    expect(cents.props.children).toBe('.00');
    expect(StyleSheet.flatten(cents.props.style).fontSize).toBe(20);
    expect(cents.props.maxFontSizeMultiplier).toBe(TEXT_CAP.figure);
    expect(screen.getByLabelText('$850.00')).toBeTruthy();
    expect(screen.getByText('What’s left after each month moves here.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Send to my goals' }));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('has no Send button at $0, even when given one', async () => {
    await render(<ReadyCard amount={0} onSend={() => {}} />);
    expect(screen.getByText('$0')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('tells a new account when its first wrap-up arrives', async () => {
    await render(<ReadyCard amount={0} firstWrapUpOn="2026-11-01" />);
    expect(screen.getByText('Your first wrap-up arrives on 1 Nov')).toBeTruthy();
    expect(screen.queryByText('What’s left after each month moves here.')).toBeNull();
  });
});

describe('the month in progress', () => {
  it('reads as designed', async () => {
    await render(
      <MonthSoFarCard
        month="2026-10-01"
        earned={3700}
        spent={2961.29}
        leftOver={738.71}
        movesOn="2026-11-01"
      />,
    );
    for (const line of [
      'October so far',
      'In progress',
      '$738.71',
      'Earned $3,700 · Spent $2,961.29',
      'Moves to savings on 1 Nov',
    ]) {
      expect([line, screen.queryAllByText(line).length]).toEqual([line, 1]);
    }
  });

  it('shows a month that has spent more than it earned so far, signed, without alarm', async () => {
    await render(
      <MonthSoFarCard
        month="2026-10-01"
        earned={0}
        spent={1212.4}
        leftOver={-1212.4}
        movesOn="2026-11-01"
      />,
    );
    const figure = screen.getByTestId('so-far-amount');
    expect(figure.props.children).toBe('-$1,212.40');
    expect(String(figure.props.className)).toContain('text-ink');
    expect(screen.getByText('Moves to savings on 1 Nov')).toBeTruthy();
    expect(screen.queryByText(/^Over by/)).toBeNull();
  });

  it('keeps each label beside its figure, breaking a line only between pairs', async () => {
    await render(
      <MonthSoFarCard
        month="2026-10-01"
        earned={37600}
        spent={3036.86}
        leftOver={34563.14}
        movesOn="2026-11-01"
      />,
    );
    expect(screen.getByText(/^Earned/).props.children).toBe(
      'Earned\u00A0$37,600 · Spent\u00A0$3,036.86',
    );
  });

  it('puts the figure under the title once the title’s widest word cannot fit beside it', async () => {
    await render(
      <MonthSoFarCard
        month="2026-10-01"
        earned={3700}
        spent={2961.29}
        leftOver={738.71}
        movesOn="2026-11-01"
      />,
    );
    expect(classOf(screen.getByTestId('so-far-title'))).toContain('flex-row');
    await layout('fit-slot-so-far-title', 60);
    await layout('fit-copy-so-far-title', 90);
    await layout('so-far-title', 290);
    expect(classOf(screen.getByTestId('so-far-title'))).not.toContain('flex-row');
    expect(screen.getByText('$738.71')).toBeTruthy();
  });
});

describe('By month', () => {
  const ROWS: PotRowData[] = [
    {
      id: 'sep',
      name: 'September',
      detail: 'Earned $3,700 · Spent $3,060',
      amount: 640,
      status: { kind: 'ready' },
    },
    {
      id: 'gift',
      name: 'Birthday gift',
      detail: 'Added 3 Oct',
      amount: 75,
      status: { kind: 'ready' },
    },
    {
      id: 'aug',
      name: 'August',
      detail: 'Earned $3,700 · Spent $3,180',
      amount: 520,
      status: { kind: 'sent' },
    },
    {
      id: 'jul',
      name: 'July',
      detail: 'Earned $3,700 · Spent $3,290',
      amount: 410,
      status: { kind: 'partly', amount: 210 },
    },
  ];

  it('lists each month with its figures and pill, and opens the one pressed', async () => {
    const onOpen = jest.fn();
    await render(<ByMonthSection years={[{ year: 2026, rows: ROWS }]} onOpen={onOpen} />);
    expect(screen.getByText('By month')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
    for (const line of ['$640', 'Ready', '$520', 'Sent to goals', '$410', '$210 left']) {
      expect([line, screen.queryAllByText(line).length > 0]).toEqual([line, true]);
    }
    const july = screen.getByRole('button', {
      name: 'July, $410, $210 left. Earned $3,700 · Spent $3,290',
    });
    await fireEvent.press(july);
    expect(onOpen).toHaveBeenCalledWith('jul');
  });

  it('lists added savings in the same card, by their own name', async () => {
    await render(<ByMonthSection years={[{ year: 2026, rows: ROWS }]} onOpen={() => {}} />);
    expect(screen.getByText('Birthday gift')).toBeTruthy();
    expect(screen.getByText('Added 3 Oct')).toBeTruthy();
  });

  it('gives every year its own card, with the year beside its heading', async () => {
    await render(
      <ByMonthSection
        years={[
          { year: 2026, rows: ROWS.slice(0, 1) },
          { year: 2025, rows: [{ ...ROWS[3], id: 'dec', name: 'December' }] },
        ]}
        onOpen={() => {}}
      />,
    );
    expect(screen.getByTestId('savings-year-2026')).toBeTruthy();
    expect(screen.getByTestId('savings-year-2025')).toBeTruthy();
    expect(screen.getByText('2025')).toBeTruthy();
    expect(screen.getAllByText('By month')).toHaveLength(1);
  });

  it('puts every row’s figure under its words once one word cannot fit beside it', async () => {
    await render(<ByMonthSection years={[{ year: 2026, rows: ROWS }]} onOpen={() => {}} />);
    const stacked = () => classOf(screen.getByText('$640').parent).includes('mt-[6px]');
    expect(stacked()).toBe(false);
    for (const row of ROWS) {
      for (const part of ['name', 'detail']) {
        await layout(`fit-slot-${row.id}-${part}`, 120);
        await layout(`fit-copy-${row.id}-${part}`, row.id === 'gift' && part === 'name' ? 130 : 80);
      }
    }
    await layout('savings-year-2026', 327);
    expect(stacked()).toBe(true);
    expect(screen.getByText('$410').props.maxFontSizeMultiplier).toBe(TEXT_CAP.row);
  });
});

describe('the status pills', () => {
  it.each([
    [{ kind: 'ready' } as const, 'Ready', 'bg-tint'],
    [{ kind: 'partly', amount: 210 } as const, '$210 left', 'border-tint-ink/40'],
    [{ kind: 'sent' } as const, 'Sent to goals', 'bg-line/70'],
    [{ kind: 'overspent' } as const, 'Overspent', 'bg-line/70'],
    [{ kind: 'nothing' } as const, 'Nothing left over', 'bg-line/70'],
  ])('%o reads "%s"', async (status, words, look) => {
    await render(<StatusPill status={status} />);
    const text = screen.getByText(words);
    expect(text.props.maxFontSizeMultiplier).toBe(TEXT_CAP.control);
    expect(classOf(screen.getByTestId(`status-pill-${status.kind}`))).toContain(look);
  });
});

describe('a month’s page', () => {
  it('opens on what was left over, its pill and when it moved', async () => {
    await render(
      <PotHeroCard
        label="Left over"
        amount={640}
        status={{ kind: 'ready' }}
        caption="Moved to savings on 1 Oct"
      />,
    );
    expect(screen.getByText('Left over')).toBeTruthy();
    expect(screen.getByText('Ready')).toBeTruthy();
    expect(screen.getByText('$640')).toBeTruthy();
    expect(screen.getByTestId('pot-amount-cents').props.children).toBe('.00');
    expect(screen.getByText('Moved to savings on 1 Oct')).toBeTruthy();
  });

  it('writes spending as money out, to the cent', async () => {
    await render(<MonthFiguresCard variant="detail" earned={3700} spent={3060} last={640} />);
    expect(screen.getByLabelText('Earned, $3,700.00')).toBeTruthy();
    expect(screen.getByLabelText('Spent, -$3,060.00')).toBeTruthy();
    expect(screen.getByLabelText('Left over, $640.00')).toBeTruthy();
    expect(classOf(screen.getByText('Left over'))).toContain('font-app-semibold');
  });

  it('on the wrap-up, lights what moves to savings', async () => {
    await render(<MonthFiguresCard variant="wrapUp" earned={3700} spent={3060} last={640} />);
    expect(screen.getByLabelText('You earned, $3,700.00')).toBeTruthy();
    expect(screen.getByLabelText('You spent, $3,060.00')).toBeTruthy();
    expect(screen.getByLabelText('Moving to savings, $640.00')).toBeTruthy();
    expect(classOf(screen.getByTestId('figures-last').parent)).toContain('bg-tint');
  });

  it('keeps a one-word label beside its figure at the default size, as designed', async () => {
    await render(<MonthFiguresCard variant="detail" earned={3700} spent={3060} last={640} />);
    const beside = () => classOf(screen.getByTestId('figures-earned')).includes('flex-row');
    // "Earned" is 51pt wide at 15pt; the row leaves it 180pt beside "$3,700.00".
    for (const id of ['earned', 'spent', 'last']) {
      await layout(`fit-slot-${id}-label`, 180);
      await layout(`fit-copy-${id}-label`, 51);
    }
    await layout('month-figures-detail', 310);
    expect(beside()).toBe(true);

    // Only a label word wider than its room stacks the rows.
    await layout('fit-copy-spent-label', 200);
    expect(beside()).toBe(false);
  });

  it('shows where the pay went, 83% and 17%, as one bar', async () => {
    await render(<WhereItWentCard earned={3700} spent={3060} />);
    expect(screen.getByText('Where your $3,700 went')).toBeTruthy();
    expect(screen.getByText('Spent 83%')).toBeTruthy();
    expect(screen.getByText('Left over 17%')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('where-spent', hidden).props.style).flex).toBe(83);
    expect(StyleSheet.flatten(screen.getByTestId('where-left', hidden).props.style).flex).toBe(17);
    expect(screen.getByLabelText('Where your $3,700 went: spent 83%, left over 17%.')).toBeTruthy();
  });

  it('draws no bar for a month with no pay', async () => {
    await render(<WhereItWentCard earned={0} spent={40} />);
    expect(screen.queryByTestId('where-it-went')).toBeNull();
  });

  it.each([
    [
      { kind: 'waiting' } as const,
      'Waiting in savings',
      'Send it to a goal whenever you’re ready.',
    ],
    [
      { kind: 'partly', left: 210, sent: 200 } as const,
      '$210 left in savings',
      '$200 went to your goals.',
    ],
    [{ kind: 'allSent', sent: 520 } as const, 'All sent to goals', 'All $520 went to your goals.'],
  ])('says where the money is: %o', async (state, title, body) => {
    await render(<PotStateCard state={state} />);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(body)).toBeTruthy();
  });
});

describe('a closed month changed after its wrap-up', () => {
  it('says each change, offers the new figure, and asks before changing anything', async () => {
    const onUpdate = jest.fn();
    await render(
      <MonthUpdateCard
        month="September"
        earnedChange={-200}
        spentChange={-45}
        amount={485}
        capped={false}
        replaces={null}
        busy={false}
        onUpdate={onUpdate}
      />,
    );
    expect(
      screen.getByText('Since your wrap-up, September’s spending went down by $45'),
    ).toBeTruthy();
    expect(screen.getByText('Since your wrap-up, September’s pay went down by $200')).toBeTruthy();
    expect(onUpdate).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Update to $485' }));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('the Goals page', () => {
  it('sums the goals as designed', async () => {
    await render(<GoalsSummaryCard saved={720} target={2200} active={2} done={1} />);
    expect(screen.getByText('Saved toward goals')).toBeTruthy();
    expect(screen.getByText('$720.00')).toBeTruthy();
    expect(screen.getByText('of $2,200')).toBeTruthy();
    expect(screen.getByText('2 active · 1 done')).toBeTruthy();
    expect(
      screen.getByLabelText('Saved toward goals, $720.00 of $2,200. 2 active · 1 done'),
    ).toBeTruthy();
  });

  it('draws an active goal: date, percent, figures, bar and what it asks a week', async () => {
    const onPress = jest.fn();
    await render(
      <GoalCard
        id="trip"
        name="Trip"
        iconId="trip"
        targetDate="2027-03-01"
        saved={300}
        target={1200}
        percent={25}
        pace={{ kind: 'weekly', amount: 37 }}
        onPress={onPress}
      />,
    );
    for (const line of ['Trip', 'by Mar 2027', '25%', 'About $37 a week to get there']) {
      expect([line, screen.queryAllByText(line).length]).toEqual([line, 1]);
    }
    expect(screen.getByText(/^\$300/)).toBeTruthy();
    expect(screen.getByText('of $1,200', { exact: false })).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('goal-bar-trip', hidden).props.style).width).toBe(
      '25%',
    );
    const card = screen.getByRole('button', {
      name: 'Trip, 25%. $300 of $1,200. By Mar 2027. About $37 a week to get there.',
    });
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('says how far short a goal is once its date has passed, and says nothing with no date', async () => {
    await render(
      <GoalCard
        id="car"
        name="Car"
        iconId="car"
        targetDate={null}
        saved={1500}
        target={2000}
        percent={75}
        pace={{ kind: 'passed', toGo: 500 }}
        onPress={() => {}}
      />,
    );
    expect(screen.getByText('Target date passed · $500 to go')).toBeTruthy();
    expect(screen.queryByText(/^by /)).toBeNull();
  });

  it('puts the percent under the name once the name’s widest word cannot fit beside it', async () => {
    await render(
      <GoalCard
        id="g"
        name="Emergency fund"
        iconId="emergency"
        targetDate="2026-12-01"
        saved={420}
        target={1000}
        percent={42}
        pace={null}
        onPress={() => {}}
      />,
    );
    const beside = () => !classOf(screen.getByTestId('goal-percent-g').parent).includes('mt-[4px]');
    expect(beside()).toBe(true);
    await layout('fit-slot-g-name', 80);
    await layout('fit-copy-g-name', 120);
    await layout('goal-head-g', 291);
    expect(beside()).toBe(false);
  });

  it('draws a reached goal with what it holds and when', async () => {
    await render(
      <CompletedGoalCard
        id="phone"
        name="New phone"
        saved={600}
        reachedOn="2026-08-14"
        onPress={() => {}}
      />,
    );
    expect(screen.getByText('New phone')).toBeTruthy();
    expect(screen.getByText('$600 · reached Aug 2026')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'New phone, Completed. $600 · reached Aug 2026' }),
    ).toBeTruthy();
  });

  it('invites a first goal, on Goals and on the Send page', async () => {
    const { rerender } = await render(<GoalInviteCard on="goals" />);
    expect(screen.getByText('Save for something')).toBeTruthy();
    expect(screen.getByText('Create a goal and start collecting for it.')).toBeTruthy();
    await rerender(<GoalInviteCard on="send" />);
    expect(screen.getByText('Create a goal and start collecting for it')).toBeTruthy();
  });

  it('starts a new goal from the button under the list', async () => {
    const onPress = jest.fn();
    await render(<NewGoalButton onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'New goal' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('the Send page', () => {
  it('says what is available and where it comes from, oldest last as listed', async () => {
    await render(
      <SendFromCard
        available={850}
        pots={[
          { name: 'September', amount: 640 },
          { name: 'July', amount: 210 },
        ]}
      />,
    );
    expect(screen.getByText('From savings')).toBeTruthy();
    expect(screen.getByText('$850.00 available')).toBeTruthy();
    expect(screen.getByText('September $640 · July $210')).toBeTruthy();
  });

  function sendCard(overrides: Partial<Parameters<typeof GoalSendCard>[0]> = {}) {
    const handlers = {
      onLess: jest.fn(),
      onMore: jest.fn(),
      onType: jest.fn(),
      onChip: jest.fn(),
      onFill: jest.fn(),
    };
    const element = (
      <GoalSendCard
        id="trip"
        name="Trip"
        iconId="trip"
        targetDate="2027-03-01"
        saved={300}
        target={1200}
        percent={25}
        amount={400}
        step={10}
        chip={50}
        canLess
        canMore
        canChip
        canFill
        {...handlers}
        {...overrides}
      />
    );
    return { element, handlers };
  }

  it('draws a goal with what it holds and what this send puts in it', async () => {
    await render(sendCard().element);
    expect(screen.getByText('Trip')).toBeTruthy();
    expect(screen.getByText('by Mar 2027')).toBeTruthy();
    expect(screen.getByText(/^\$300/)).toBeTruthy();
    expect(screen.getByText('$400')).toBeTruthy();
    expect(screen.getByText('+$50')).toBeTruthy();
    expect(screen.getByText('Fill goal')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('send-bar-trip', hidden).props.style).width).toBe(
      '25%',
    );
  });

  it('steps, adds the chip, fills and types, each by its own control', async () => {
    const { element, handlers } = sendCard();
    await render(element);
    await fireEvent.press(screen.getByRole('button', { name: 'Send $10 less to Trip' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Send $10 more to Trip' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add $50 for Trip' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Fill Trip' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sending $400.00 to Trip' }));
    expect(handlers.onLess).toHaveBeenCalledTimes(1);
    expect(handlers.onMore).toHaveBeenCalledTimes(1);
    expect(handlers.onChip).toHaveBeenCalledTimes(1);
    expect(handlers.onFill).toHaveBeenCalledTimes(1);
    expect(handlers.onType).toHaveBeenCalledTimes(1);
  });

  it('refuses a control that has nowhere to go, and says so', async () => {
    const { element, handlers } = sendCard({
      amount: 0,
      canLess: false,
      canMore: false,
      canChip: false,
      canFill: false,
    });
    await render(element);
    for (const name of [
      'Send $10 less to Trip',
      'Send $10 more to Trip',
      'Add $50 for Trip',
      'Fill Trip',
    ]) {
      const control = screen.getByRole('button', { name });
      expect([name, control.props.accessibilityState]).toEqual([name, { disabled: true }]);
      await fireEvent.press(control);
    }
    expect(handlers.onLess).not.toHaveBeenCalled();
    expect(handlers.onMore).not.toHaveBeenCalled();
    expect(handlers.onChip).not.toHaveBeenCalled();
    expect(handlers.onFill).not.toHaveBeenCalled();
  });

  it('says what goes and what stays', async () => {
    await render(<SendTotals toGoals={700} stays={150} />);
    expect(screen.getByText('$700 to goals')).toBeTruthy();
    expect(screen.getByText('$150 stays in savings')).toBeTruthy();
  });
});

describe('the Sent page', () => {
  it('reads as designed', async () => {
    await render(
      <>
        <SentHero total={700} />
        <SentGoalsCard
          lines={[
            {
              id: 'trip',
              name: 'Trip',
              iconId: 'trip',
              added: 400,
              saved: 700,
              target: 1200,
              percent: 58,
            },
            {
              id: 'ef',
              name: 'Emergency fund',
              iconId: 'emergency',
              added: 300,
              saved: 720,
              target: 1000,
              percent: 72,
            },
          ]}
        />
        <StillInSavingsCard amount={150} />
      </>,
    );
    for (const line of [
      'Sent to your goals',
      '$700 moved from savings. Nicely done.',
      '+$400',
      'Now $700 of $1,200',
      '+$300',
      'Now $720 of $1,000',
      'Still in savings',
      'Ready whenever you need it',
      '$150.00',
    ]) {
      expect([line, screen.queryAllByText(line).length]).toEqual([line, 1]);
    }
    expect(screen.getByLabelText('Trip, plus $400. Now $700 of $1,200.')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('sent-bar-ef', hidden).props.style).width).toBe(
      '72%',
    );
  });
});

describe('the wrap-up hero', () => {
  it('draws the month, the headline and the line under it, with confetti for a saving month', async () => {
    await render(
      <WrapUpHero
        celebrate
        kicker="September wrap-up"
        title="Congrats, you saved $640!"
        subtitle="Here’s how your September went."
      />,
    );
    expect(classOf(screen.getByText('September wrap-up'))).toContain('uppercase');
    expect(screen.getByRole('header', { name: 'Congrats, you saved $640!' })).toBeTruthy();
    expect(screen.getByText('Here’s how your September went.')).toBeTruthy();
    expect(screen.getByTestId('wrap-up-confetti', hidden)).toBeTruthy();
    expect(screen.getByTestId('wrap-up-medal', hidden)).toBeTruthy();
  });
});

describe('the goal type grid', () => {
  // The default text size: a shrinking group may not go under its design size there.
  beforeAll(() => {
    const window = { width: 375, height: 812, scale: 3, fontScale: 1 };
    Dimensions.set({ window, screen: window });
  });

  const rowCount = () =>
    screen.container.queryAll((node) => classOf(node) === 'w-full flex-row gap-[8px]').length;

  async function measure(slot: number, emergency: number) {
    for (const type of GOAL_TYPES) {
      await layout(`fit-slot-goal-type-${type}`, slot);
      await layout(`fit-copy-goal-type-${type}`, type === 'emergency' ? emergency : 40);
    }
    await layout('goal-type-grid', 327);
  }

  it('offers the twelve types in the brief’s order', async () => {
    await render(<GoalTypeGrid value="trip" onChange={() => {}} />);
    expect(screen.getAllByRole('radio').map((radio) => radio.props.accessibilityLabel)).toEqual([
      'Trip',
      'Emergency fund',
      'Home',
      'Car',
      'Education',
      'Wedding',
      'Phone & gadgets',
      'Gifts',
      'Health',
      'Family & kids',
      'Pets',
      'Other',
    ]);
    expect(rowCount()).toBe(3);
  });

  it('says which type is chosen, and changes it', async () => {
    const onChange = jest.fn();
    await render(<GoalTypeGrid value="pets" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Pets' }).props.accessibilityState).toEqual({
      selected: true,
      checked: true,
    });
    await fireEvent.press(screen.getByRole('radio', { name: 'Emergency fund' }));
    expect(onChange).toHaveBeenCalledWith('emergency');
  });

  it('goes three to a row when a word cannot fit a quarter, then two when it cannot fit a third', async () => {
    await render(<GoalTypeGrid value="trip" onChange={() => {}} />);
    // "Emergency" at 12pt is 70.34pt; a quarter of a 375pt phone leaves 67.75pt.
    await measure(67.75, 70.34);
    expect(rowCount()).toBe(4);
    // A word too wide for a third of the row, even shrunk to its 12pt size.
    await measure(89.67, 120);
    expect(rowCount()).toBe(6);
    expect(screen.getAllByRole('radio')).toHaveLength(12);
  });
});
