import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { t } from '@/i18n';

/**
 * The loan page's pinned actions: Edit loan, outlined, under the page's one primary action when it
 * has one (Pay off, while the loan is being paid).
 */
export function LoanViewFooter({
  primary,
  onEdit,
}: {
  primary?: { label: string; onPress: () => void };
  onEdit: () => void;
}) {
  return (
    <View className="w-full gap-3" testID="loan-view-footer">
      {primary ? <Button label={primary.label} onPress={primary.onPress} /> : null}
      <Button variant="outline" label={t('loanFlow.edit.title')} onPress={onEdit} />
    </View>
  );
}
