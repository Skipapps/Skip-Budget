import { View } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';

export type SummaryItem = {
  /** Names the fit slots; unique in its grid. */
  id: string;
  label: string;
  value: string;
};

/**
 * Labelled figures in columns, as the loan cards draw them. Labels and figures wrap only between
 * words; once any word cannot fit its column, every item goes on its own lines instead, so a figure
 * is never cut.
 */
export function SummaryGrid({
  items,
  columns,
  testID,
}: {
  items: readonly SummaryItem[];
  columns: number;
  testID?: string;
}) {
  const group = useFitGroup({ mode: 'switch' });

  const cell = (item: SummaryItem) => (
    <View key={item.id} className="w-full">
      <FitText
        id={`${item.id}-label`}
        role="row"
        size={12}
        className="font-app text-muted"
        slotClassName="w-full"
      >
        {item.label}
      </FitText>
      <FitText
        id={`${item.id}-value`}
        role="row"
        size={15}
        className="font-app-semibold text-ink"
        slotClassName="mt-1 w-full"
      >
        {item.value}
      </FitText>
    </View>
  );

  const rows: SummaryItem[][] = [];
  for (let at = 0; at < items.length; at += columns) rows.push(items.slice(at, at + columns));

  return (
    <FitGroup group={group} className="w-full" testID={testID}>
      {group.fits ? (
        <View className="w-full gap-[14px]">
          {rows.map((row) => (
            <View key={row[0].id} className="w-full flex-row gap-[12px]">
              {Array.from({ length: columns }, (_, index) => (
                // An empty cell keeps a short last row's columns the width of the others.
                <View key={row[index]?.id ?? `empty-${index}`} className="min-w-0 flex-1">
                  {row[index] ? cell(row[index]) : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View className="w-full gap-[12px]">{items.map(cell)}</View>
      )}
    </FitGroup>
  );
}
