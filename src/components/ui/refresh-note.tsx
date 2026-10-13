import { Text } from 'react-native';

import { t } from '@/i18n';
import { TEXT_CAP } from '@/theme/text-scale';

type RefreshNoteProps = {
  /** Usually `anyRefreshFailed(...)` or a combined hook's `refreshFailed`, from src/lib/query-state. */
  show: boolean;
};

/**
 * The one quiet line under figures whose reload failed while their last answer is still showing.
 * Not the failure line: the figures are there, only possibly behind. Its own top margin goes with it,
 * so a hidden note leaves no gap.
 */
export function RefreshNote({ show }: RefreshNoteProps) {
  if (!show) return null;
  return (
    <Text
      accessibilityRole="text"
      className="mt-2 w-full text-center font-app text-[13px] text-muted"
      maxFontSizeMultiplier={TEXT_CAP.reading}
    >
      {t('common.refreshFailed')}
    </Text>
  );
}
