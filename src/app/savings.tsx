import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { useArtwork } from '@/theme/artwork';

/**
 * Savings stands on its own while it is redesigned: nothing here is worked out from income or
 * spending, so the page has nothing to show yet.
 */
export default function SavingsScreen() {
  const artwork = useArtwork();

  return (
    <Screen title={t('savings.list.title')} showBack>
      <PageState
        art={artwork.tileSavings}
        title={t('savings.soon.title')}
        message={t('savings.soon.message')}
      />
    </Screen>
  );
}
