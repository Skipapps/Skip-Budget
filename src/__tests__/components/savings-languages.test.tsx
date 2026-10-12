import { render, screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import { CompletedGoalCard, GoalCard, GoalsSummaryCard } from '@/components/savings/goal-cards';
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
import { ByMonthSection } from '@/components/savings/pot-row';
import { ReadyCard } from '@/components/savings/ready-card';
import { monthName, monthTitle, splitMoney } from '@/components/savings/savings-words';
import { SentGoalsCard, SentHero, StillInSavingsCard } from '@/components/savings/sent-parts';
import type { Language } from '@/i18n/config';
import { NBSP } from '@/i18n/number';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The Savings and Goals parts in English, Spanish and French: months start a line with a capital
 * and sit lower-case inside one, French figures split at their comma with the mark after, and no
 * part ever shows a message key or an unfilled {parameter}.
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

type Node = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

/** Every line a person can see or hear: text, labels and hints. Measuring copies are skipped. */
function shownText(node: Node): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(shownText);
  const props = node.props ?? {};
  if (props.importantForAccessibility === 'no-hide-descendants') return [];
  const spoken = ['accessibilityLabel', 'accessibilityHint'].flatMap((name) =>
    typeof props[name] === 'string' ? [props[name] as string] : [],
  );
  return [...spoken, ...(node.children ?? []).flatMap((child) => shownText(child as Node))];
}

const LANGUAGES: Language[] = ['en', 'es', 'fr'];

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

function everyPart() {
  return (
    <>
      <ReadyCard amount={850} onSend={() => {}} />
      <MonthSoFarCard
        month="2026-10-01"
        earned={3700}
        spent={2961.29}
        leftOver={738.71}
        movesOn="2026-11-01"
      />
      <ByMonthSection
        years={[
          {
            year: 2026,
            rows: [
              { id: 'sep', name: 'X', detail: 'Y', amount: 640, status: { kind: 'ready' } },
              {
                id: 'jul',
                name: 'X',
                detail: 'Y',
                amount: 410,
                status: { kind: 'partly', amount: 210 },
              },
              { id: 'aug', name: 'X', detail: 'Y', amount: 520, status: { kind: 'sent' } },
              { id: 'jun', name: 'X', detail: 'Y', amount: 0, status: { kind: 'overspent' } },
              { id: 'may', name: 'X', detail: 'Y', amount: 0, status: { kind: 'nothing' } },
            ],
          },
        ]}
        onOpen={() => {}}
      />
      <PotHeroCard label="X" amount={640} status={{ kind: 'ready' }} caption="Y" />
      <MonthFiguresCard variant="detail" earned={3700} spent={3060} last={640} />
      <MonthFiguresCard variant="wrapUp" earned={3700} spent={3060} last={640} />
      <WhereItWentCard earned={3700} spent={3060} />
      <MonthUpdateCard
        month="X"
        earnedChange={10}
        spentChange={45}
        amount={595}
        capped
        replaces={700}
        busy={false}
        onUpdate={() => {}}
      />
      <PotStateCard state={{ kind: 'waiting' }} />
      <PotStateCard state={{ kind: 'partly', left: 210, sent: 200 }} />
      <PotStateCard state={{ kind: 'allSent', sent: 520 }} />
      <GoalsSummaryCard saved={720} target={2200} active={2} done={1} />
      <GoalCard
        id="trip"
        name="Trip"
        iconId="trip"
        targetDate="2027-03-01"
        saved={300}
        target={1200}
        percent={25}
        pace={{ kind: 'weekly', amount: 37 }}
        onPress={() => {}}
      />
      <GoalCard
        id="car"
        name="Car"
        iconId="car"
        targetDate="2026-01-01"
        saved={300}
        target={1200}
        percent={25}
        pace={{ kind: 'passed', toGo: 900 }}
        onPress={() => {}}
      />
      <CompletedGoalCard
        id="p"
        name="Phone"
        saved={600}
        reachedOn="2026-08-01"
        onPress={() => {}}
      />
      <SendFromCard available={850} pots={[{ name: 'X', amount: 640 }]} />
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
        onLess={() => {}}
        onMore={() => {}}
        onType={() => {}}
        onChip={() => {}}
        onFill={() => {}}
        canLess
        canMore
        canChip
        canFill
      />
      <SendTotals toGoals={700} stays={150} />
      <SentHero total={700} />
      <SentGoalsCard
        lines={[
          {
            id: 't',
            name: 'Trip',
            iconId: 'trip',
            added: 400,
            saved: 700,
            target: 1200,
            percent: 58,
          },
        ]}
      />
      <StillInSavingsCard amount={150} />
      <GoalTypeGrid value="trip" onChange={() => {}} />
    </>
  );
}

describe.each(LANGUAGES)('in %s', (language) => {
  beforeEach(() => setLanguage(language));

  it('shows no message key and no unfilled {parameter} anywhere', async () => {
    await render(everyPart());
    const lines = shownText(screen.toJSON() as Node);
    expect(lines.length).toBeGreaterThan(40);
    expect(lines.filter((line) => /\b(savings|goals|ui|cards)\.[a-zA-Z]/.test(line))).toEqual([]);
    expect(lines.filter((line) => /[{}]/.test(line))).toEqual([]);
  });
});

describe('Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('starts a line with a capital month and keeps it lower-case inside one', async () => {
    expect(monthName('2026-09-01')).toBe('Septiembre');
    expect(monthTitle('2026-09-01')).toBe('Septiembre de 2026');
    await render(
      <>
        <MonthSoFarCard
          month="2026-10-01"
          earned={3700}
          spent={2961.29}
          leftOver={738.71}
          movesOn="2026-11-01"
        />
        <GoalCard
          id="trip"
          name="Viaje"
          iconId="trip"
          targetDate="2027-03-01"
          saved={300}
          target={1200}
          percent={25}
          pace={null}
          onPress={() => {}}
        />
      </>,
    );
    expect(screen.getByText('Octubre hasta ahora')).toBeTruthy();
    expect(screen.getByText('Pasa a ahorros el 1 nov')).toBeTruthy();
    expect(screen.getByText('para mar 2027')).toBeTruthy();
  });

  it('names the goal types in Spanish', async () => {
    await render(<GoalTypeGrid value="trip" onChange={() => {}} />);
    expect(screen.getAllByRole('radio').map((radio) => radio.props.accessibilityLabel)).toEqual([
      'Viaje',
      'Fondo de emergencia',
      'Hogar',
      'Auto',
      'Educación',
      'Boda',
      'Celular y gadgets',
      'Regalos',
      'Salud',
      'Familia y niños',
      'Mascotas',
      'Otra',
    ]);
  });
});

describe('French', () => {
  beforeEach(() => setLanguage('fr'));

  it('splits a figure at its comma, the mark staying with the cents', async () => {
    expect(splitMoney(850)).toEqual({ whole: '850', cents: `,00${NBSP}$` });
    expect(splitMoney(1234.5)).toEqual({ whole: `1${NBSP}234`, cents: `,50${NBSP}$` });
    await render(<ReadyCard amount={850} />);
    expect(screen.getByText('850')).toBeTruthy();
    expect(screen.getByTestId('ready-to-use-cents').props.children).toBe(`,00${NBSP}$`);
    expect(screen.getByLabelText(`850,00${NBSP}$`)).toBeTruthy();
  });

  it('writes months and the goal date the French way', async () => {
    expect(monthTitle('2026-08-01')).toBe('Août 2026');
    await render(
      <GoalCard
        id="trip"
        name="Voyage"
        iconId="trip"
        targetDate="2027-03-01"
        saved={300}
        target={1200}
        percent={25}
        pace={{ kind: 'weekly', amount: 37 }}
        onPress={() => {}}
      />,
    );
    expect(screen.getByText('d’ici mars 2027')).toBeTruthy();
    expect(screen.getByText(`25${NBSP}%`)).toBeTruthy();
    expect(screen.getByText(`Environ 37${NBSP}$ par semaine pour y arriver`)).toBeTruthy();
  });

  it('names the goal types in French', async () => {
    await render(<GoalTypeGrid value="trip" onChange={() => {}} />);
    expect(screen.getAllByRole('radio').map((radio) => radio.props.accessibilityLabel)).toEqual([
      'Voyage',
      'Fonds d’urgence',
      'Maison',
      'Auto',
      'Éducation',
      'Mariage',
      'Cellulaire et gadgets',
      'Cadeaux',
      'Santé',
      'Famille et enfants',
      'Animaux',
      'Autre',
    ]);
  });
});
