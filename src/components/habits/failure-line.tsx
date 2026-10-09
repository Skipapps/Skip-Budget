import { Text, View } from 'react-native';

import { TextLink } from '@/components/ui/text-link';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The one failure line, under what is already on screen: a tap that did not go through, or a
 * refresh that failed while the last read still shows. Try again only when there is something to
 * read again.
 */
export function FailureLine({ onRetry }: { onRetry?: () => void }) {
  return (
    <View className="mt-3 w-full items-center">
      <Text
        accessibilityLiveRegion="polite"
        className="w-full text-center font-app text-[13px] text-danger"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {failureText()}
      </Text>
      {onRetry ? (
        <TextLink label={t('common.tryAgain')} variant="subtle" onPress={onRetry} />
      ) : null}
    </View>
  );
}
