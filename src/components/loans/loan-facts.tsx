import type { ReactNode } from 'react';
import { View } from 'react-native';

import { FitRows, FitText, useGroupFits } from '@/components/ui/fit-group';
import { cn } from '@/lib/cn';

/** Colours for a card drawn off the theme (the summary's navy); omitted, rows take the tokens. */
export type FactTone = { ink: string; muted: string; line: string };

/** The accent and two paler steps of it, the same in both modes, as drawn. */
export const FACT_DOTS = { first: '#905479', second: '#C39BB4', third: '#E4D3DE' } as const;

const DOT = 7;
const DOT_GAP = 12;
/** Where a label's words start, past its dot. */
const LABEL_INDENT = DOT + DOT_GAP;

/**
 * A card's fact rows. While every label's widest word fits beside its value they share a line; once
 * one cannot, every row puts its value under its label.
 */
export function FactRows({
  testID,
  className,
  children,
}: {
  testID?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <FitRows className={cn('w-full', className)} testID={testID}>
      {children}
    </FitRows>
  );
}

/** A dot, a label and its value, under a hairline. */
export function FactRow({
  id,
  dot,
  label,
  value,
  tone,
}: {
  /** Names the fit slots; unique in its card. */
  id: string;
  dot: string;
  label: string;
  value: string;
  tone?: FactTone;
}) {
  const stacked = !useGroupFits();
  return (
    <View
      className={cn('w-full border-t py-[12px]', tone ? undefined : 'border-line')}
      style={tone ? { borderTopColor: tone.line } : undefined}
    >
      <View
        className={
          stacked ? 'w-full items-start' : 'w-full flex-row items-center justify-between gap-3'
        }
      >
        <FitText
          id={`${id}-label`}
          role="row"
          size={14}
          className={tone ? 'font-app' : 'font-app text-muted'}
          style={tone ? { color: tone.muted } : undefined}
          slotClassName={cn('flex-row items-center', stacked ? 'w-full' : 'min-w-0 flex-1')}
          before={
            <View
              testID={`fact-dot-${id}`}
              className="rounded-full"
              style={{ width: DOT, height: DOT, marginRight: DOT_GAP, backgroundColor: dot }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          }
          reserve={LABEL_INDENT}
        >
          {label}
        </FitText>
        <View
          testID={`fact-value-${id}`}
          className={stacked ? 'mt-0.5' : 'shrink-0'}
          // Stacked, the value lines up with the label's words rather than its dot.
          style={stacked ? { paddingLeft: LABEL_INDENT } : undefined}
        >
          <FitText
            id={`${id}-value`}
            hug
            role="row"
            size={14}
            className={tone ? 'font-app-semibold' : 'font-app-semibold text-ink'}
            style={tone ? { color: tone.ink } : undefined}
          >
            {value}
          </FitText>
        </View>
      </View>
    </View>
  );
}

/** How far along, as a thin bar. Drawn only: the percent is said in words under it. */
export function LoanBar({
  percent,
  fill,
  track,
  className,
  testID,
}: {
  /** Whole percent, 0 to 100; anything outside is held to the ends. */
  percent: number;
  /** Off-theme colours; omitted, the accent on a faint ink track. */
  fill?: string;
  track?: string;
  className?: string;
  testID?: string;
}) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <View
      className={cn(
        'h-[6px] w-full overflow-hidden rounded-full',
        track ? undefined : 'bg-ink/10',
        className,
      )}
      style={track ? { backgroundColor: track } : undefined}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        testID={testID}
        style={[{ width: `${width}%` }, fill ? { backgroundColor: fill } : null]}
        className={cn('h-full rounded-full', fill ? undefined : 'bg-accent')}
      />
    </View>
  );
}
