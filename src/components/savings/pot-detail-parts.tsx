import { Text, View } from 'react-native';

import { shortMoney, wentShares } from '@/components/savings/savings-words';
import { SplitFigure } from '@/components/savings/split-figure';
import { StatusPill, type PillStatus } from '@/components/savings/status-pill';
import { Button } from '@/components/ui/button';
import { FitRows, FitText, useGroupFits } from '@/components/ui/fit-group';
import { percent, t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { toCents } from '@/lib/money';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The parts of a month's page (and of the wrap-up): what it moved, its earned, spent and left over,
 * where the pay went, and how much of it is still in savings.
 */

const CARD = 'w-full rounded-[20px] border border-line bg-card';

/** The amount on top: "Left over" and its pill, the figure, and when it moved. */
export function PotHeroCard({
  label,
  amount,
  status,
  caption,
}: {
  label: string;
  amount: number;
  status?: PillStatus;
  /** "Moved to savings on 1 Oct", "Added on 3 Oct", or the overspent line. */
  caption: string;
}) {
  return (
    <View testID="pot-hero" className={cn(CARD, 'mt-3 p-[20px]')}>
      <View className="w-full flex-row flex-wrap items-center justify-between gap-2">
        <Text
          className="shrink font-app text-[14px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {label}
        </Text>
        {status ? <StatusPill status={status} /> : null}
      </View>
      <View className="mt-[4px] w-full">
        <SplitFigure id="pot-amount" amount={amount} size={36} centsSize={20} />
      </View>
      <Text
        className="mt-[6px] font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {caption}
      </Text>
    </View>
  );
}

type FigureRow = { id: string; label: string; value: string };

/**
 * Earned, spent and what is left, to the cent. On a month's page spending is written as money out
 * and the last line is in bold; on the wrap-up the last line is the money moving to savings, lit in
 * the accent. Side by side while every word fits; otherwise every row puts its figure under its
 * label.
 */
export function MonthFiguresCard({
  variant,
  earned,
  spent,
  last,
}: {
  variant: 'detail' | 'wrapUp';
  earned: number;
  spent: number;
  /** Left over on a month's page; what moves to savings on the wrap-up. */
  last: number;
}) {
  const wrapUp = variant === 'wrapUp';
  const rows: FigureRow[] = [
    {
      id: 'earned',
      label: t(wrapUp ? 'savings.wrapUp.earned' : 'savings.figures.earned'),
      value: formatCurrency(earned),
    },
    {
      id: 'spent',
      label: t(wrapUp ? 'savings.wrapUp.spent' : 'savings.figures.spent'),
      value: formatCurrency(wrapUp ? spent : -spent),
    },
  ];
  const lastRow: FigureRow = {
    id: 'last',
    label: t(wrapUp ? 'savings.wrapUp.moving' : 'savings.figures.leftOver'),
    value: formatCurrency(last),
  };

  return (
    <FitRows
      testID={`month-figures-${variant}`}
      className={cn(CARD, 'mt-4 px-[20px]', wrapUp ? 'pb-[8px]' : undefined)}
    >
      {rows.map((row, index) => (
        <FiguresLine key={row.id} row={row} divider={index > 0} look="plain" roomy={wrapUp} />
      ))}
      {wrapUp ? (
        <View className="-mx-[12px] mt-[6px] rounded-[14px] bg-tint px-[12px]">
          <FiguresLine row={lastRow} divider={false} look="lit" roomy />
        </View>
      ) : (
        <FiguresLine row={lastRow} divider look="strong" roomy={false} />
      )}
    </FitRows>
  );
}

function FiguresLine({
  row,
  divider,
  look,
  roomy,
}: {
  row: FigureRow;
  divider: boolean;
  look: 'plain' | 'strong' | 'lit';
  roomy: boolean;
}) {
  const stacked = !useGroupFits();
  return (
    <View
      accessible
      accessibilityLabel={`${row.label}, ${row.value}`}
      testID={`figures-${row.id}`}
      className={cn(
        'w-full',
        roomy ? 'py-[17px]' : 'py-[14px]',
        divider && 'border-t border-line',
        stacked ? 'items-start' : 'flex-row items-center justify-between gap-4',
      )}
    >
      <FitText
        id={`${row.id}-label`}
        role="row"
        size={15}
        className={cn(
          look === 'plain' && 'font-app text-muted',
          look === 'strong' && 'font-app-semibold text-ink',
          look === 'lit' && 'font-app-semibold text-tint-ink',
        )}
        // The label's room comes from the row, never from its own text: a slot as wide as one word
        // would always look a point too narrow for it.
        slotClassName={stacked ? 'w-full' : 'min-w-0 flex-1'}
      >
        {row.label}
      </FitText>
      <FitText
        id={`${row.id}-value`}
        hug
        role="row"
        size={look === 'lit' ? 18 : 15}
        className={look === 'lit' ? 'font-app-bold text-tint-ink' : 'font-app-semibold text-ink'}
        slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
      >
        {row.value}
      </FitText>
    </View>
  );
}

/**
 * Where the month's pay went, as one bar: spending in a soft tint, what was left in the accent.
 * Nothing is drawn for a month with no pay, since there is no whole to share.
 */
export function WhereItWentCard({ earned, spent }: { earned: number; spent: number }) {
  const shares = wentShares(earned, spent);
  if (!shares) return null;
  const spentText = percent(shares.spent, 0);
  const leftText = percent(shares.left, 0);
  const title = t('savings.whereWent.title', { amount: shortMoney(earned) });

  return (
    <View
      testID="where-it-went"
      accessible
      accessibilityLabel={t('savings.whereWent.a11y', {
        amount: shortMoney(earned),
        spent: spentText,
        left: leftText,
      })}
      className={cn(CARD, 'mt-4 px-[20px] py-[18px]')}
    >
      <Text className="font-app text-[14px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
        {title}
      </Text>
      <View className="mt-[12px] h-[8px] w-full flex-row gap-[4px]">
        {shares.spent > 0 ? (
          <View
            testID="where-spent"
            style={{ flex: Math.min(100, shares.spent) }}
            className="h-full rounded-full bg-accent/25"
          />
        ) : null}
        {shares.left > 0 ? (
          <View
            testID="where-left"
            style={{ flex: shares.left }}
            className="h-full rounded-full bg-accent"
          />
        ) : null}
      </View>
      <View className="mt-[10px] w-full flex-row flex-wrap justify-between gap-x-3 gap-y-1">
        <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
          {t('savings.whereWent.spent', { percent: spentText })}
        </Text>
        <Text
          className="font-app-semibold text-[13px] text-accent-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('savings.whereWent.leftOver', { percent: leftText })}
        </Text>
      </View>
    </View>
  );
}

/** How much of a month (or an added amount) is still waiting in savings. */
export type PotState =
  | { kind: 'waiting' }
  | { kind: 'partly'; left: number; sent: number }
  | { kind: 'allSent'; sent: number };

export function PotStateCard({ state }: { state: PotState }) {
  const [title, body] =
    state.kind === 'waiting'
      ? [t('savings.state.waiting'), t('savings.state.waitingBody')]
      : state.kind === 'partly'
        ? [
            t('savings.state.partial', { amount: shortMoney(state.left) }),
            t('savings.state.partialBody', { amount: shortMoney(state.sent) }),
          ]
        : [
            t('savings.state.allSent'),
            t('savings.state.allSentBody', { amount: shortMoney(state.sent) }),
          ];

  return (
    <View
      testID={`pot-state-${state.kind}`}
      accessible
      accessibilityLabel={`${title}. ${body}`}
      className={cn(CARD, 'mt-4 px-[20px] py-[16px]')}
    >
      <Text className="font-app-semibold text-[16px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
        {title}
      </Text>
      <Text
        className="mt-[4px] font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {body}
      </Text>
    </View>
  );
}

/**
 * Pay or spending recorded for a closed month after its wrap-up. Says what changed and offers the
 * new figure; nothing changes until the person presses. Capped when part of the month is already in
 * goals: it can only go as low as that.
 */
export function MonthUpdateCard({
  month,
  earnedChange,
  spentChange,
  amount,
  capped,
  replaces,
  busy,
  onUpdate,
}: {
  /** The month in a sentence: "September", "septiembre". */
  month: string;
  /** Signed: what pay and spending moved by since the wrap-up. */
  earnedChange: number;
  spentChange: number;
  /** What the month would move to savings now. */
  amount: number;
  capped: boolean;
  /** The amount typed for the month by hand, which taking the update replaces; null if none. */
  replaces: number | null;
  busy: boolean;
  onUpdate: () => void;
}) {
  const lines = [
    toCents(spentChange) !== 0
      ? t(toCents(spentChange) > 0 ? 'savings.update.spentUp' : 'savings.update.spentDown', {
          month,
          amount: shortMoney(Math.abs(spentChange)),
        })
      : null,
    toCents(earnedChange) !== 0
      ? t(toCents(earnedChange) > 0 ? 'savings.update.earnedUp' : 'savings.update.earnedDown', {
          month,
          amount: shortMoney(Math.abs(earnedChange)),
        })
      : null,
  ].filter((line): line is string => Boolean(line));
  const figure = shortMoney(amount);

  return (
    <View testID="month-update" className={cn(CARD, 'mb-2 mt-4 px-[20px] py-[18px]')}>
      {lines.map((line) => (
        <Text
          key={line}
          className="font-app-medium text-[15px] leading-[21px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {line}
        </Text>
      ))}
      {capped ? (
        <Text
          className="mt-[6px] font-app text-[13px] leading-[18px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('savings.update.capped', { amount: figure, month })}
        </Text>
      ) : null}
      <Button
        className="mt-[14px]"
        label={t('savings.update.button', { amount: figure })}
        onPress={onUpdate}
        disabled={busy}
      />
      {replaces !== null ? (
        <Text
          className="mt-[8px] text-center font-app text-[13px] leading-[18px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('savings.update.replaces', { amount: shortMoney(replaces) })}
        </Text>
      ) : null}
    </View>
  );
}
