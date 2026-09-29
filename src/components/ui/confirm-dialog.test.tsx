import { fireEvent, render } from '@testing-library/react-native';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/**
 * Two short choices sit side by side; anything longer stacks, so a label is
 * never cut to "Delete every…" on a small phone.
 */

jest.mock('@/theme/shadows', () => ({ shadows: { floating: {} } }));

const rowOf = (node: { parent?: unknown; props?: { className?: string } } | null) => {
  for (let at = node?.parent as typeof node; at; at = at.parent as typeof node) {
    const name = at.props?.className ?? '';
    if (name.includes('gap-2.5')) return name;
  }
  return '';
};

it('puts two short choices side by side', async () => {
  const screen = await render(
    <ConfirmDialog
      title="Delete this bill?"
      actions={[{ id: 'confirm', label: 'Delete', destructive: true }]}
      onResolve={() => {}}
    />,
  );
  expect(rowOf(screen.getByText('Delete'))).toContain('flex-row');
});

it('stacks them when a label would not fit half the card', async () => {
  const onResolve = jest.fn();
  const screen = await render(
    <ConfirmDialog
      title="Delete everything, for good?"
      actions={[{ id: 'confirm', label: 'Delete everything', destructive: true }]}
      cancelLabel="Keep my account"
      onResolve={onResolve}
    />,
  );
  expect(rowOf(screen.getByText('Delete everything'))).not.toContain('flex-row');

  await fireEvent.press(screen.getByText('Keep my account'));
  expect(onResolve).toHaveBeenCalledWith(null);
});
