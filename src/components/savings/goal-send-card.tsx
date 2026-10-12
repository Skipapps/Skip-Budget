import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { goalByText } from '@/components/savings/goal-cards';
import { GoalBar } from '@/components/savings/goal-bar';
import { GoalIcon, PigIcon } from '@/components/savings/goal-icon';
import { shortMoney } from '@/components/savings/savings-words';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { selection } from '@/lib/haptics';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

const CARD = 'w-full rounded-[20px] border border-line bg-card';

/** The stepper and chips change a value rather than go somewhere, so they tick, not tap. */
function stepping(handler: () => void): () => void {
  return () => {
    selection();
    handler();
  };
}

/** The top of the Send page: what savings hold, and the pots it is in, newest first. */
export function SendFromCard({
  available,
  pots,
}: {
  available: number;
  /** Pots with money left, newest first: "September", $640. */
  pots: readonly { name: string; amount: number }[];
}) {
  const from = pots
    .map((pot) => t('savings.sendPage.potLeft', { name: pot.name, amount: shortMoney(pot.amount) }))
    .join(' · ');
  const headline = t('savings.sendPage.available', { amount: formatCurrency(available) });

  return (
    <View
      testID="send-from"
      accessible
      accessibilityLabel={[t('savings.sendPage.from'), headline, from].filter(Boolean).join('. ')}
      className={cn(CARD, 'mt-3 flex-row items-center gap-[16px] px-[20px] py-[16px]')}
    >
      <View className="min-w-0 flex-1">
        <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.control}>
          {t('savings.sendPage.from')}
        </Text>
        <Text
          className="mt-[2px] font-app-bold text-[21px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.figure}
        >
          {headline}
        </Text>
        {from ? (
          <Text
            className="mt-[3px] font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {from}
          </Text>
        ) : null}
      </View>
      <PigIcon size={40} />
    </View>
  );
}

type GoalSendCardProps = {
  id: string;
  name: string;
  iconId: string | null;
  targetDate: string | null;
  /** In the goal before this send. */
  saved: number;
  target: number;
  /** Whole percent of the target saved before this send. */
  percent: number;
  /** What this send puts in the goal. */
  amount: number;
  /** The stepper's step, "$10". */
  step: number;
  /** The quick chip's amount, "+$50". */
  chip: number;
  onLess: () => void;
  onMore: () => void;
  /** Opens the page to type the amount, cents included. */
  onType: () => void;
  onChip: () => void;
  onFill: () => void;
  canLess: boolean;
  canMore: boolean;
  /** False once the goal is full or nothing is left to send. */
  canChip: boolean;
  canFill: boolean;
};

/**
 * One goal on the Send page: what it holds, then how much this send puts in it, by the stepper, the
 * quick chip, Fill goal, or typed. The figure beside the name goes under it once the name's widest
 * word cannot fit beside it; the chips go under the stepper when the row is too narrow for both.
 */
export function GoalSendCard({
  id,
  name,
  iconId,
  targetDate,
  saved,
  target,
  percent,
  amount,
  step,
  chip,
  onLess,
  onMore,
  onType,
  onChip,
  onFill,
  canLess,
  canMore,
  canChip,
  canFill,
}: GoalSendCardProps) {
  const colors = useColors();
  const header = useFitGroup({ mode: 'switch' });
  const by = goalByText(targetDate);
  const sending = formatCurrency(amount);
  const stepText = shortMoney(step);
  const chipText = shortMoney(chip);

  const held = (
    <Text
      className="font-app-bold text-[14px] text-ink"
      maxFontSizeMultiplier={TEXT_CAP.row}
      testID={`send-held-${id}`}
    >
      {shortMoney(saved)}
      <Text className="font-app text-[13px] text-muted">
        {' '}
        {t('goals.of', { target: shortMoney(target) })}
      </Text>
    </Text>
  );

  return (
    <View testID={`goal-send-${id}`} className={cn(CARD, 'px-[16px] pb-[16px] pt-[18px]')}>
      <FitGroup
        group={header}
        className="w-full flex-row items-center gap-[12px]"
        testID={`send-head-${id}`}
      >
        <GoalIcon iconId={iconId} size={40} />
        <View className="min-w-0 flex-1">
          <FitText
            id={`${id}-send-name`}
            role="row"
            size={16}
            className="font-app-semibold text-ink"
            slotClassName="w-full"
          >
            {name}
          </FitText>
          {by ? (
            <Text
              className="mt-[2px] font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {by}
            </Text>
          ) : null}
          {header.fits ? null : <View className="mt-[4px]">{held}</View>}
        </View>
        {header.fits ? held : null}
      </FitGroup>

      <GoalBar percent={percent} className="mt-[14px]" testID={`send-bar-${id}`} />

      <View className="mt-[12px] w-full flex-row flex-wrap items-center justify-between gap-x-2 gap-y-3">
        <View className="flex-row items-center rounded-full bg-line/50 p-[4px]">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('savings.sendPage.less', { step: stepText, name })}
            accessibilityState={{ disabled: !canLess }}
            disabled={!canLess}
            hitSlop={4}
            onPress={stepping(onLess)}
            testID={`send-less-${id}`}
            className={cn(
              'h-[36px] w-[36px] items-center justify-center rounded-full border border-line bg-card active:bg-ink/5',
              !canLess && 'opacity-40',
            )}
          >
            <Minus size={18} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('savings.sendPage.amountA11y', { amount: sending, name })}
            accessibilityHint={t('savings.sendPage.typeHint')}
            onPress={withTap(onType)}
            testID={`send-amount-${id}`}
            className="min-h-[36px] min-w-[82px] items-center justify-center px-[10px] active:opacity-60"
          >
            <Text
              className="text-center font-app-bold text-[18px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.figure}
            >
              {shortMoney(amount)}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('savings.sendPage.more', { step: stepText, name })}
            accessibilityState={{ disabled: !canMore }}
            disabled={!canMore}
            hitSlop={4}
            onPress={stepping(onMore)}
            testID={`send-more-${id}`}
            className={cn(
              'h-[36px] w-[36px] items-center justify-center rounded-full bg-control active:bg-control-pressed',
              !canMore && 'opacity-40',
            )}
          >
            <Plus size={18} color={colors.onControl} strokeWidth={2} />
          </Pressable>
        </View>

        <View className="flex-row flex-wrap items-center gap-[8px]">
          <Chip
            label={t('savings.sendPage.addChip', { amount: chipText })}
            spoken={t('savings.sendPage.addChipA11y', { amount: chipText, name })}
            onPress={onChip}
            enabled={canChip}
            look="outline"
            testID={`send-chip-${id}`}
          />
          <Chip
            label={t('savings.sendPage.fill')}
            spoken={t('savings.sendPage.fillA11y', { name })}
            onPress={onFill}
            enabled={canFill}
            look="tint"
            testID={`send-fill-${id}`}
          />
        </View>
      </View>
    </View>
  );
}

function Chip({
  label,
  spoken,
  onPress,
  enabled,
  look,
  testID,
}: {
  label: string;
  spoken: string;
  onPress: () => void;
  enabled: boolean;
  look: 'outline' | 'tint';
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      // 26pt tall as drawn; the touch target is the 44pt floor.
      hitSlop={{ top: 9, bottom: 9, left: 2, right: 2 }}
      onPress={stepping(onPress)}
      testID={testID}
      className={cn(
        'min-h-[26px] justify-center rounded-full',
        look === 'outline'
          ? 'border border-line bg-card px-[11px] py-[3px] active:bg-ink/5'
          : 'bg-tint px-[12px] py-[4px] active:opacity-70',
        !enabled && 'opacity-40',
      )}
    >
      <Text
        className={cn(
          'text-center font-app-semibold text-[12px]',
          look === 'outline' ? 'text-ink' : 'text-tint-ink',
        )}
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Above the Send button: what goes to goals, and what stays in savings. */
export function SendTotals({ toGoals, stays }: { toGoals: number; stays: number }) {
  return (
    <View
      testID="send-totals"
      className="mb-[10px] w-full flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1"
    >
      <Text className="font-app-semibold text-[14px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
        {t('savings.sendPage.toGoals', { amount: shortMoney(toGoals) })}
      </Text>
      <Text className="font-app text-[14px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
        {t('savings.sendPage.stays', { amount: shortMoney(stays) })}
      </Text>
    </View>
  );
}
