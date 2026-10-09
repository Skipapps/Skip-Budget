import { Pressable, Text, View } from 'react-native';

import { LEAD_OPTIONS } from '@/api/reminders';
import { SwitchControl } from '@/components/ui/switch-control';
import { TextLink } from '@/components/ui/text-link';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import type { LeadDays } from '@/lib/reminder-words';
import { useGradientIcons } from '@/theme/gradient-icons';
import { TEXT_CAP } from '@/theme/text-scale';

type RemindMeCardProps = {
  on: boolean;
  onToggle: (on: boolean) => void;
  lead: LeadDays;
  /** Whether a lead is offered; every lead is when left out. */
  leadFits?: (lead: LeadDays) => boolean;
  onLead: (lead: LeadDays) => void;
  /** When the next reminder goes out, or what turning it on would do. */
  caption: string;
  /** Why there is nothing to remind about yet; the switch is off and cannot be turned on. */
  unavailable?: string | null;
  /** Offered under `unavailable` when the reason is a failed read. */
  onRetry?: () => void;
};

/**
 * The reminder for a card's bill or an account's pay: a switch, and how long before. The time of
 * day is not asked here; the reminder keeps the one it has, nine in the morning when new.
 */
export function RemindMeCard({
  on,
  onToggle,
  lead,
  leadFits,
  onLead,
  caption,
  unavailable,
  onRetry,
}: RemindMeCardProps) {
  const { bell: Bell } = useGradientIcons();
  const live = on && !unavailable;

  return (
    <View className="w-full rounded-[16px] border border-line bg-card p-[14px]">
      <View className="w-full flex-row items-center gap-[12px]">
        <View
          className="h-[32px] w-[32px]"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Bell width="100%" height="100%" />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="font-app-semibold text-[15px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('cards.add.remindMe')}
          </Text>
          <Text
            className="mt-0.5 font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {unavailable ?? caption}
          </Text>
        </View>
        <SwitchControl
          value={live}
          onValueChange={onToggle}
          disabled={Boolean(unavailable)}
          accessibilityLabel={t('cards.add.remindMe')}
        />
      </View>

      {unavailable && onRetry ? (
        <TextLink
          label={t('common.tryAgain')}
          variant="subtle"
          onPress={onRetry}
          className="ml-[44px] mt-1 self-start"
        />
      ) : null}

      {live ? (
        <View
          accessibilityRole="radiogroup"
          className="mt-[14px] w-full flex-row rounded-[12px] bg-ink/5 p-[3px]"
        >
          {LEAD_OPTIONS.filter((option) => !leadFits || leadFits(option.value)).map((option) => {
            const selected = option.value === lead;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => {
                  selection();
                  onLead(option.value);
                }}
                className={cn(
                  'min-h-[36px] min-w-0 flex-1 items-center justify-center rounded-[9px] px-1 py-1.5',
                  selected ? 'border-[1.5px] border-control bg-card' : 'active:bg-ink/5',
                )}
              >
                <Text
                  className={cn(
                    'text-center text-[12px]',
                    selected ? 'font-app-semibold text-accent-ink' : 'font-app-medium text-muted',
                  )}
                  maxFontSizeMultiplier={TEXT_CAP.control}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
