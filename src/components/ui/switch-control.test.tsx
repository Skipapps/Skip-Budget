import { fireEvent, render } from '@testing-library/react-native';

import { SwitchControl } from '@/components/ui/switch-control';

/**
 * The mechanism, rather than the behaviour: the platform switch must not be a
 * touch target, and must not be a second accessibility element.
 *
 * Both are what stops a press being split between two controls — which is the
 * shape of bug that let a switch be turned on and not off again.
 */

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ line: '#DDDDDD', control: '#0000FF' }),
}));

type Node = { type: string; props: Record<string, unknown>; children: Node[] | null };

/** Every ancestor's `pointerEvents`, for the first node of this type. */
function pointerEventsAbove(tree: Node, type: string): unknown[] {
  const walk = (node: Node, above: unknown[]): unknown[] | null => {
    if (node.type === type) return above;
    for (const child of node.children ?? []) {
      const hit = walk(child, [...above, node.props.pointerEvents]);
      if (hit) return hit;
    }
    return null;
  };
  return walk(tree, []) ?? [];
}

describe('SwitchControl', () => {
  it('keeps the platform switch out of the touch path', async () => {
    const view = await render(<SwitchControl value onValueChange={() => {}} />);

    expect(pointerEventsAbove(view.toJSON() as unknown as Node, 'RCTSwitch')).toContain('none');
  });

  it('offers one accessibility element, not two', async () => {
    const view = await render(
      <SwitchControl value onValueChange={() => {}} accessibilityLabel="Haptics" />,
    );

    expect(view.getAllByRole('switch')).toHaveLength(1);
    // The platform switch is still in the tree — it is what gets drawn — but
    // it is hidden from assistive technology.
    expect(view.getAllByRole('switch', { includeHiddenElements: true })).toHaveLength(2);
  });

  it('ignores presses when disabled', async () => {
    const onValueChange = jest.fn();
    const view = await render(
      <SwitchControl value onValueChange={onValueChange} disabled accessibilityLabel="Simplify" />,
    );

    await fireEvent.press(view.getByRole('switch'));

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
