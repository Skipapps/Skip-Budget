import { ChevronRight, Plus } from 'lucide-react-native';
import type { FC } from 'react';
import { Pressable, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { useLoanIcons } from '@/theme/loan-icons';

/**
 * Loan calculator and Add loan, side by side while each label's widest word fits beside its round
 * button; once one cannot, the two run full width, one above the other.
 */
export function LoanTiles({
  onCalculator,
  onAdd,
}: {
  onCalculator: () => void;
  onAdd: () => void;
}) {
  const group = useFitGroup({ mode: 'switch' });
  const { details: CalculatorIcon, add: AddIcon } = useLoanIcons();
  const stacked = !group.fits;

  return (
    <FitGroup
      group={group}
      className={cn('mt-3 w-full gap-[12px]', stacked ? undefined : 'flex-row')}
      testID="loan-tiles"
    >
      <Tile
        id="calculator"
        label={t('loan.list.calculator')}
        icon={CalculatorIcon}
        stacked={stacked}
        onPress={onCalculator}
      />
      <Tile
        id="add"
        label={t('loan.list.add')}
        icon={AddIcon}
        plum
        stacked={stacked}
        onPress={onAdd}
      />
    </FitGroup>
  );
}

function Tile({
  id,
  label,
  icon: Icon,
  plum = false,
  stacked,
  onPress,
}: {
  id: string;
  label: string;
  icon: FC<SvgProps>;
  /** The accent fill with white type, as Add loan is drawn. */
  plum?: boolean;
  stacked: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const Glyph = plum ? Plus : ChevronRight;

  const icon = (
    <View
      className="h-[32px] w-[32px]"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon width="100%" height="100%" />
    </View>
  );
  const name = (
    <FitText
      id={`${id}-label`}
      role="control"
      size={16}
      className={cn('font-app-semibold', plum ? 'text-on-control' : 'text-ink')}
      slotClassName="min-w-0 flex-1"
    >
      {label}
    </FitText>
  );
  const circle = (
    <View
      className={cn(
        'h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full',
        plum ? 'bg-on-control' : 'bg-control',
      )}
    >
      <Glyph size={20} color={plum ? colors.control : colors.onControl} strokeWidth={2.2} />
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={withTap(onPress)}
      testID={`loan-tile-${id}`}
      className={cn(
        'rounded-[20px] px-[15px] py-[16px]',
        plum
          ? 'bg-control active:bg-control-pressed'
          : 'border border-line bg-card active:bg-ink/5',
        stacked
          ? 'w-full flex-row items-center gap-[12px]'
          : 'min-h-[130px] flex-1 justify-between',
      )}
    >
      {stacked ? (
        <>
          {icon}
          {name}
          {circle}
        </>
      ) : (
        <>
          {icon}
          <View className="mt-[12px] w-full flex-row items-center gap-[6px]">
            {name}
            {circle}
          </View>
        </>
      )}
    </Pressable>
  );
}
