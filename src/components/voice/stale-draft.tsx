import { router } from 'expo-router';

import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
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
        title="Nothing to check yet"
        message="Say what you want to add and Skip will show it here."
        actionLabel="Start again"
        onAction={() => router.dismissTo('/voice')}
      />
    </Screen>
  );
}
