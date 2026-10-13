import { router, type Href } from 'expo-router';
import { ChevronRight, RotateCw } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CARD } from '@/components/insights/rows';
import { ActionPill } from '@/components/ui/action-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { failureText } from '@/lib/failure';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * What a section can show. `hidden` leaves it off the page; `empty` is one muted line with the
 * action that fills it, for the sections the page keeps in view when there is nothing yet.
 */
export type SectionState =
  | { kind: 'ready' }
  | { kind: 'loading' }
  | { kind: 'failed'; onRetry: () => void }
  | { kind: 'empty'; line: string; actionLabel: string; onAction: () => void }
  | { kind: 'hidden' };

export const READY: SectionState = { kind: 'ready' };
export const LOADING: SectionState = { kind: 'loading' };
export const HIDDEN: SectionState = { kind: 'hidden' };

/** "See all ›": the section's own page. */
function SeeAll({ section, href, testID }: { section: string; href: Href; testID: string }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t('insights.seeAllA11y', { section })}
      onPress={withTap(() => router.push(href))}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      testID={testID}
      className="shrink-0 flex-row items-center gap-[2px] active:opacity-60"
    >
      <Text
        className="font-app-medium text-[13px] text-accent-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {t('insights.seeAll')}
      </Text>
      <ChevronRight size={14} color={colors.accentInk} strokeWidth={2.2} />
    </Pressable>
  );
}

/** A card-shaped placeholder: the section's room is held while its read is out. */
function LoadingCard() {
  return (
    <View className={cn(CARD, 'gap-[14px]')}>
      {[0, 1].map((row) => (
        <View key={row} className="w-full flex-row items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <View className="min-w-0 flex-1 gap-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </View>
          <Skeleton className="h-3.5 w-16" />
        </View>
      ))}
    </View>
  );
}

/** The one failure line, in this card only, with the way to ask again. */
export function FailedCard({ onRetry, testID }: { onRetry: () => void; testID: string }) {
  return (
    <View className={CARD} testID={testID}>
      <Text
        accessibilityRole="alert"
        className="font-app text-[14px] leading-5 text-body"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {failureText()}
      </Text>
      <ActionPill
        className="mt-3 self-start"
        icon={RotateCw}
        label={t('common.tryAgain')}
        onPress={onRetry}
      />
    </View>
  );
}

/** Nothing here yet: one muted line, and the action that changes that. */
function EmptyCard({
  line,
  actionLabel,
  onAction,
  testID,
}: {
  line: string;
  actionLabel: string;
  onAction: () => void;
  testID: string;
}) {
  return (
    <View className={cn(CARD, 'items-start')} testID={testID}>
      <Text
        className="font-app text-[14px] leading-5 text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {line}
      </Text>
      <ActionPill className="mt-3" icon={ChevronRight} label={actionLabel} onPress={onAction} />
    </View>
  );
}

/**
 * One part of Insights: its heading, a muted line saying what it holds, "See all ›" to the page it
 * comes from, then the card. The card is the section's own state: loading, failed with Try again,
 * empty with its action, or `children`. A hidden section draws nothing.
 */
export function Section({
  id,
  title,
  subtitle,
  seeAll,
  state = READY,
  first = false,
  lead,
  children,
}: {
  /** Names the section's test ids: `insights-section-<id>`. */
  id: string;
  title: string;
  subtitle?: string;
  /** The page "See all" opens; none draws no link. */
  seeAll?: Href;
  state?: SectionState;
  /** The page's first section sits closer to what is above it. */
  first?: boolean;
  /** Between the heading and the card in every state, such as the period switch. */
  lead?: ReactNode;
  children?: ReactNode;
}) {
  if (state.kind === 'hidden') return null;
  const testID = `insights-section-${id}`;

  return (
    <View className={cn('w-full', first ? 'mt-[24px]' : 'mt-[26px]')} testID={testID}>
      <View className="w-full flex-row items-start justify-between gap-3 px-[2px]">
        <View className="min-w-0 flex-1">
          <Text
            accessibilityRole="header"
            className="font-app-semibold text-[17px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="mt-[2px] font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.heading}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {seeAll ? (
          <View className="pt-[2px]">
            <SeeAll section={title} href={seeAll} testID={`${testID}-see-all`} />
          </View>
        ) : null}
      </View>

      {lead ? <View className="mt-[12px] w-full">{lead}</View> : null}

      <View className="mt-[12px] w-full">
        {state.kind === 'loading' ? (
          <LoadingCard />
        ) : state.kind === 'failed' ? (
          <FailedCard onRetry={state.onRetry} testID={`${testID}-failed`} />
        ) : state.kind === 'empty' ? (
          <EmptyCard
            line={state.line}
            actionLabel={state.actionLabel}
            onAction={state.onAction}
            testID={`${testID}-empty`}
          />
        ) : (
          children
        )}
      </View>
    </View>
  );
}
