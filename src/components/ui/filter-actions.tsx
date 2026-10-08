import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { cn } from '@/lib/cn';

type FilterActionsProps = {
  resetLabel: string;
  applyLabel: string;
  onReset: () => void;
  onApply: () => void;
};

/**
 * Reset and Apply at the foot of a filter page: a third and two thirds side by side while both
 * labels fit on one line at the text size in use, otherwise stacked with Apply first, each the full
 * width, so neither label is squeezed onto two lines or cut.
 */
export function FilterActions({ resetLabel, applyLabel, onReset, onApply }: FilterActionsProps) {
  const pair = useFitGroup({ mode: 'switch' });
  const apply = <Button fitId="apply" label={applyLabel} onPress={onApply} />;
  const reset = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resetLabel}
      onPress={onReset}
      className={cn(
        'min-h-16 items-center justify-center rounded-full border border-control py-2 active:bg-ink/5',
        pair.fits ? 'min-w-0 flex-1' : 'w-full px-5',
      )}
    >
      <FitText
        id="reset"
        whole
        role="row"
        size={17}
        className="text-center font-app-medium text-ink"
        slotClassName="w-full"
      >
        {resetLabel}
      </FitText>
    </Pressable>
  );

  return (
    <FitGroup
      group={pair}
      className={cn('w-full gap-3', pair.fits && 'flex-row')}
      testID="filter-actions"
    >
      {pair.fits ? (
        <>
          {reset}
          <View className="min-w-0 flex-[2]">{apply}</View>
        </>
      ) : (
        <>
          {apply}
          {reset}
        </>
      )}
    </FitGroup>
  );
}
