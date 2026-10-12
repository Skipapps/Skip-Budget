import { Text, View } from 'react-native';

import { shortMoney } from '@/components/savings/savings-words';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Where a month's (or an added amount's) money is: all still in savings, part of it sent, all of it
 * sent, nothing moved because the month was overspent or had nothing left, or the month still running.
 */
export type PillStatus =
  | { kind: 'ready' }
  | { kind: 'partly'; amount: number }
  | { kind: 'sent' }
  | { kind: 'overspent' }
  | { kind: 'nothing' }
  | { kind: 'inProgress' };

export function potStatusText(status: PillStatus): string {
  switch (status.kind) {
    case 'ready':
      return t('savings.status.ready');
    case 'partly':
      return t('savings.status.left', { amount: shortMoney(status.amount) });
    case 'sent':
      return t('savings.status.sent');
    case 'overspent':
      return t('savings.status.overspent');
    case 'nothing':
      return t('savings.status.nothing');
    case 'inProgress':
      return t('savings.soFar.inProgress');
  }
}

const LOOK: Record<PillStatus['kind'], string> = {
  ready: 'bg-tint px-[10px] py-[4px]',
  // Outlined, so money still waiting reads apart from money all waiting; the border takes its
  // point from the padding, so every pill is the same height.
  partly: 'border border-tint-ink/40 bg-card px-[9px] py-[3px]',
  sent: 'bg-line/70 px-[10px] py-[4px]',
  overspent: 'bg-line/70 px-[10px] py-[4px]',
  nothing: 'bg-line/70 px-[10px] py-[4px]',
  inProgress: 'bg-line/70 px-[10px] py-[4px]',
};

export function StatusPill({ status }: { status: PillStatus }) {
  const tinted = status.kind === 'ready' || status.kind === 'partly';
  return (
    <View
      testID={`status-pill-${status.kind}`}
      className={cn('max-w-full self-start rounded-full', LOOK[status.kind])}
    >
      <Text
        className={cn(
          'text-center font-app-medium text-[12px]',
          tinted ? 'text-tint-ink' : 'text-muted',
        )}
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {potStatusText(status)}
      </Text>
    </View>
  );
}
