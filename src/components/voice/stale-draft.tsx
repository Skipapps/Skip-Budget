import { router } from 'expo-router';

import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { useArtwork } from '@/theme/artwork';

/**
 * A voice page opened with nothing behind it: a deep link, a draft already saved, or the navigator
 * remounting after a text-size change. The no-results drawing, because nothing failed; "Start
 * again" pops to the mic page when it is already underneath, so the stack never holds two.
 */
export function StaleDraft() {
  const artwork = useArtwork();
  return (
    <Screen showBack>
      <PageState
        art={artwork.noResults}
        title={t('voice.stale.title')}
        message={t('voice.stale.message')}
        actionLabel={t('voice.stale.action')}
        onAction={() => router.dismissTo('/voice')}
      />
    </Screen>
  );
}
