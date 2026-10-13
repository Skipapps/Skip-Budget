import { View } from 'react-native';

import { QuietAction } from '@/components/savings/quiet-action';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';

/**
 * The loan page's pinned actions: Edit loan, outlined, under the page's one primary action when it
 * has one (Pay off, while the loan is being paid). A finished loan is final, so Delete loan takes
 * Edit's place.
 */
export function LoanViewFooter({
  primary,
  onEdit,
  onDelete,
}: {
  primary?: { label: string; hint?: string; onPress: () => void };
  onEdit?: () => void;
  onDelete?: { onPress: () => void; busy: boolean };
}) {
  return (
    <View className="w-full gap-3" testID="loan-view-footer">
      {primary ? (
        <Button label={primary.label} accessibilityHint={primary.hint} onPress={primary.onPress} />
      ) : null}
      {onEdit ? (
        <Button variant="outline" label={t('loanFlow.edit.title')} onPress={onEdit} />
      ) : null}
      {onDelete ? (
        <QuietAction
          tone="danger"
          label={onDelete.busy ? t('loanFlow.edit.deleting') : t('loanFlow.edit.delete')}
          onPress={onDelete.onPress}
          disabled={onDelete.busy}
          testID="loan-delete"
        />
      ) : null}
    </View>
  );
}
